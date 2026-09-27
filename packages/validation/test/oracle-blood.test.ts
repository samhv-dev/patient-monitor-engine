import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
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
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(sc.id, async () => {
      const { rows } = await runBloodOracle(sc, await loadPulse(DIR as string));
      for (const r of rows) console.log(`${sc.id} ${r.channel} ${r.metric}: ours ${r.ours.toFixed(2)} pulse ${r.pulse.toFixed(2)} → ${r.verdict} (${r.note})`);
      expect(rows.map((r) => r.verdict)).not.toContain('fail'); // every row is printed first (a fail is a gate-note finding)
    }, 3_600_000); // local-only (skipped in CI)
  }
});
