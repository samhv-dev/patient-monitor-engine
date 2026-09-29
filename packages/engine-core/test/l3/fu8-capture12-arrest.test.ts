// FU-8 Task A9 (review pack: "the 12-lead printout's HR and axis are unreliable in arrest; asystole reads HR 120"): the
// printout counts QRS complexes with the monitor's own detector (l3/qrs.ts). Before FU-8, on origin/main 0fd5397:
// asystole HR 93 / axis 90°, P-wave asystole HR 25, sinus 75 HR 76 / axis 24°.
import { describe, expect, it } from 'vitest';
import { capture12, createEngine } from '../../src/index.ts';

const cap = (rhythm: string, opts: Record<string, unknown> = {}) => {
  const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  e.advanceTo(10);
  e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm, opts } as never);
  e.advanceTo(50);
  return capture12(e).measurements;
};

describe('FU-8 A9: the 12-lead printout in arrest', () => {
  it.each(['asystole', 'pWaveAsystole'])('%s: HR and axis are not printed (null)', (id) => {
    expect(cap(id)).toEqual({ hr: null, axisDeg: null });
  });
  it('organised rhythms keep their numbers: sinus 75 → 74–78, axis 0–60°; VT 170 → 167–173; AF 100 → 95–105', () => {
    const s = cap('sinus', { rateBpm: 75 });
    expect(s.hr).toBeGreaterThanOrEqual(74);
    expect(s.hr).toBeLessThanOrEqual(78);
    expect(s.axisDeg).toBeGreaterThanOrEqual(0);
    expect(s.axisDeg).toBeLessThanOrEqual(60);
    const vt = cap('vtMono', { rateBpm: 170 }).hr as number;
    expect(Math.abs(vt - 170)).toBeLessThanOrEqual(3);
    const af = cap('afib', { rateBpm: 100 }).hr as number;
    expect(Math.abs(af - 100)).toBeLessThanOrEqual(5);
  });
});
