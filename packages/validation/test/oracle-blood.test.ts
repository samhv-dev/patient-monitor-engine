import { describe, expect, it } from 'vitest';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';

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
