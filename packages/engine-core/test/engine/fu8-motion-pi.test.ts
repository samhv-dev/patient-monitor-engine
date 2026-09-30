// FU-8 Task A3 (F5, G-FU5 ruling 2): the pleth PI/PR restart when a motion episode ends.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED } from '../helpers/monitor.ts';

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-8 A3 (F5): the PI and PR restart when motion ends', () => {
  it('MANUAL motion 120–180 s: at 182–190 s PI ≤ 1.3 × rest and PR within ± 5 of rest (before FU-8: PI 8.21, PR 81 against 1.84 / 75)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [120, M.sensor('spo2', 'motion')], [180, M.sensor('spo2', 'on')]] });
    const at = (a: number, b: number) => run.rows.filter((r) => r.t >= a && r.t <= b);
    const piRest = mean(at(30, 110).map((r) => r.m.pi?.value ?? Number.NaN));
    const prRest = mean(at(30, 110).map((r) => r.m.pr?.value ?? Number.NaN));
    const after = at(182, 190).filter((r) => r.m.pi?.flag === 'valid');
    console.log(`fu8 A3: rest PI ${piRest.toFixed(2)} PR ${prRest.toFixed(0)}; after motion PI ${after.map((r) => r.m.pi?.value?.toFixed(2)).join(' ')}`);
    expect(after.length).toBeGreaterThan(4);
    for (const r of after) {
      expect(r.m.pi?.value as number).toBeLessThanOrEqual(1.3 * piRest);
      expect(Math.abs((r.m.pr?.value as number) - prRest)).toBeLessThanOrEqual(5);
    }
  }, 60_000);
});
