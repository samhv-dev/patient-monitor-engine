import { describe, expect, it } from 'vitest';
import { judge, ORACLE, runOracle, type Compare } from '../../src/oracle/oracle.ts';
import { loadPulse, pulseDir } from '../../src/oracle/pulse-node.ts';

const C = (expect: Compare['expect'], tolPct = 10): Compare => ({ id: 'x', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 10, metric: 'abs', tolPct, expect });

describe('oracle comparator (annex §C)', () => {
  it('agree within tolerance → green, within 30 % → yellow, beyond → red', () => {
    expect(judge(C({ kind: 'agree' }), 75, 72).grade).toBe('green');
    expect(judge(C({ kind: 'agree' }), 90, 72).grade).toBe('yellow');
    expect(judge(C({ kind: 'agree' }), 120, 72).grade).toBe('red');
  });
  it('expect-differ stays green while Pulse is still wrong and turns yellow when Pulse changes', () => {
    const d1: Compare['expect'] = { kind: 'expect-differ', id: 'D1', op: '>', value: 7.45 };
    expect(judge(C(d1), Number.NaN, 10.59)).toMatchObject({ grade: 'green', note: 'known Pulse disagreement D1' });
    expect(judge(C(d1), 7.0, 7.1).grade).toBe('yellow');
  });
  it('our side not measurable → rows are n/m and never gate', { timeout: 60_000 }, async () => {
    const r = await runOracle(ORACLE.find((s) => s.id === 'O4')!, null);
    expect(r.oursMeasurable).toBe(false);
    expect(r.rows.every((x) => x.expected === 'n/m' && x.grade === 'green')).toBe(true);
  });
  it.skipIf(!pulseDir())('Pulse loads in Node and StandardMale sits at HR 72, MAP ≈ 95 (needs PME_PULSE_DIR)', { timeout: 60_000 }, async () => {
    const p = await loadPulse(pulseDir() as string);
    p.step(500);
    const d = p.pull();
    expect(d['HeartRate(1/min)']).toBeCloseTo(72, 0);
    expect(d['MeanArterialPressure(mmHg)']).toBeGreaterThan(90);
  });
});
