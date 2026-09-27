import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle, type BloodOracleScenario } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, PULSE_REQUESTS, pulseDir, type PulseOracle } from '../src/oracle/pulse-node.ts';

describe('blood oracle rules (always run)', () => {
  it('K is compared in true mmol/L (39.098 g/mol), and expect-differ rows fail when the engines agree', () => {
    expect(PULSE_BLOOD.k.toOurs(15.6)).toBeCloseTo(3.99, 2);
    const row = { channel: 'lactate' as const, metric: 'delta' as const, tol: 0.5, expect: 'expect-differ' as const, note: '' };
    expect(compareRow(3, 0.1, row)).toBe('expect-differ-ok');
    expect(compareRow(0.1, 0.1, row)).toBe('fail');
  });
  it('scenario shapes: every action at or after the baseline, compare time after it, tolerances > 0', () => {
    for (const sc of BLOOD_ORACLE) {
      expect(sc.compareAtS).toBeGreaterThan(sc.baselineS);
      for (const a of [...sc.pulse, ...sc.ours]) expect(a.tS).toBeGreaterThanOrEqual(sc.baselineS);
      for (const r of sc.rows) expect(r.tol).toBeGreaterThan(0);
    }
  });
  it('O13b: our baseline is the panel BEFORE the bicarbonate dose (7c read it after: ΔNa −2.00 was the post-bolus decay)', { timeout: 60_000 }, async () => {
    const flat: Pick<PulseOracle, 'step' | 'pull' | 'act'> = { step: () => {}, pull: () => Object.fromEntries(PULSE_REQUESTS.map((k) => [k, 1])) as never, act: () => true };
    const o13b = BLOOD_ORACLE.find((s) => s.id === 'O13b')!;
    const r = await runBloodOracle({ ...o13b, compareAtS: 120 }, flat);
    const ref = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
    const labs: Extract<EngineEvent, { type: 'labs' }>[] = [];
    ref.on((x) => { if (x.type === 'labs') labs.push(x); }, ['labs']);
    ref.advanceTo(60); // the same engine, undosed
    expect(r.oursBaseline.na).toBeCloseTo(labs.at(-1)!.values.na, 2);
    expect(r.rows.find((x) => x.channel === 'na')!.ours).toBeGreaterThan(0); // 50 mmol of Na given: ΔNa > 0
  });
});

const DIR = pulseDir();
// Per-row verdicts of the FU-3 item 10 local Pulse run (2026-09-27, MODELED, base d525eed = main + 7d + 7f), pinned
// row by row (R50 review finding 4). Two expected-disagreement rows our engine has moved INTO Pulse's tolerance since
// 7c's gate run read `fail` — R45: rows and tolerances unchanged; each is a finding for Ali (annex §C):
//   O2b lactate Δ +0.50 vs Pulse +0.06, inside tol 0.5 (expect-differ D2; MANUAL gives +1.10; 7c's gate run +1.00);
//   O3b Hb Δ −1.50 vs Pulse −2.48, inside tol 0.5 × 2.48 (expect-differ D10; 7c alone −0.50: 7d's kidney keeps more
//   of the litre).
// Any OTHER row whose verdict changes fails loudly; a drifted row that moves back out of tolerance fails too (then
// update this map with the new numbers — it is a finding either way).
const VERDICTS: Record<BloodOracleScenario['id'], readonly string[]> = {
  O2b: ['bv:agree', 'hb:agree', 'lactate:fail', 'ph:excluded'],
  O3b: ['hb:fail', 'be:expect-differ-ok', 'na:agree'],
  O10b: ['k:expect-differ-ok'],
  O13b: ['ph:excluded', 'na:excluded'],
};
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(`${sc.id}: per-row verdicts as recorded (${VERDICTS[sc.id].join(', ')})`, async () => {
      const { rows } = await runBloodOracle(sc, await loadPulse(DIR as string));
      for (const r of rows) console.log(`${sc.id} ${r.channel} ${r.metric}: ours ${r.ours.toFixed(2)} pulse ${r.pulse.toFixed(2)} → ${r.verdict} (${r.note})`);
      expect(rows.map((r) => `${r.channel}:${r.verdict}`)).toEqual(VERDICTS[sc.id]); // every row is printed first (a fail is a gate-note finding)
    }, 3_600_000); // local-only (skipped in CI)
  }
});
