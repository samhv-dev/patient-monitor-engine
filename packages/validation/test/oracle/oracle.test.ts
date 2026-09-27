import { describe, expect, it } from 'vitest';
import type { DocCommand } from '@pme/controller/scenario';
import { judge, ORACLE, runOracle, type Compare, type OracleScenario } from '../../src/oracle/oracle.ts';
import { loadPulse, pulseDir, type PulseOracle } from '../../src/oracle/pulse-node.ts';

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
    // O4 needed 7g when this was written; 7g is on main now, so the rejected command is a stand-in no stage implements.
    const o4 = ORACLE.find((s) => s.id === 'O4')!;
    const later: OracleScenario = { ...o4, durationS: 120, ours: { actions: [{ t: 10, command: { type: 'applyEvent', event: { kind: 'notAModelYet' } } as unknown as DocCommand }] } };
    const r = await runOracle(later, null);
    expect(r.oursMeasurable).toBe(false);
    expect(r.rows.every((x) => x.expected === 'n/m' && x.grade === 'green')).toBe(true);
  });
  it('Pulse aborting mid-run (wasm abort) is recorded: later rows yellow with the abort time, never a crash', { timeout: 60_000 }, async () => {
    let steps = 0;
    const fake: PulseOracle = {
      buildHash: 'fake',
      step: (n) => {
        steps += n;
        if (steps > 750) throw new Error('RuntimeError: Aborted(undefined)');
      },
      pull: () => ({ t: steps * 0.02, 'HeartRate(1/min)': 72 }) as never,
      act: () => true,
    };
    const s: OracleScenario = { id: 'Ox', title: 'abort', durationS: 20, pulseActions: [], ours: { actions: [] }, compare: [C({ kind: 'agree' }), { ...C({ kind: 'agree' }), id: 'late', atS: 20 }] };
    const r = await runOracle(s, fake);
    expect(r.pulseAbortedS).toBe(10);
    expect(r.rows.map((x) => [x.id, x.grade])).toEqual([['x', 'green'], ['late', 'yellow']]);
    expect(r.rows[1]?.note).toContain('Pulse aborted');
  });
  it.skipIf(!pulseDir())('Pulse loads in Node and StandardMale sits at HR 72, MAP ≈ 95 (needs PME_PULSE_DIR)', { timeout: 60_000 }, async () => {
    const p = await loadPulse(pulseDir() as string);
    p.step(500);
    const d = p.pull();
    expect(d['HeartRate(1/min)']).toBeCloseTo(72, 0);
    expect(d['MeanArterialPressure(mmHg)']).toBeGreaterThan(90);
  });
});
