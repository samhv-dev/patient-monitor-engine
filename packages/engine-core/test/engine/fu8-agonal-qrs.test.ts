// FU-8 Task A2 (F3, E-FU4-20; R50 review F5): the monitor's QRS detector counts one QRS per agonal complex.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin). A double detection (two humps 0.14–0.24 s
// apart on one ≈ 300 ms complex) reads as a 0.2 s R–R: the HR average breaks and the numeric flips between a reading
// and "-?-" (invalid) — on origin/main 7ffaba4 125 of 269 samples invalid and 56 valid↔invalid flips in this rig.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A2 (F3): one QRS per agonal complex', () => {
  it('MANUAL pulseless agonal 30–300 s: the HR numeric flips valid↔invalid ≤ 25 times (origin/main: 56 flips, 125 invalid samples, from the double detections)', async () => {
    const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    const beats: number[] = [];
    let n = 0;
    let invalid = 0;
    let flips = 0;
    let high = 0;
    let prev: boolean | null = null;
    e.on((x) => {
      if (x.type === 'beat' && x.template === 'agonal' && x.t > 30 && x.t < 300) beats.push(x.t);
      if (x.type !== 'measurement' || x.t <= 30 || x.t >= 300 || !x.values.hr) return;
      const ok = x.values.hr.value !== null && x.values.hr.flag !== 'invalid';
      n++;
      if (!ok) invalid++;
      if (ok && (x.values.hr.value as number) > 25) high++;
      if (prev !== null && ok !== prev) flips++;
      prev = ok;
    }, ['beat', 'measurement']);
    e.advanceTo(10);
    e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm: 'agonal', opts: { pulseless: true } } as never);
    for (let t = 60; t <= 310; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    console.log(`fu8 A2: ${beats.length} agonal complexes; HR samples ${n}, invalid ${invalid}, flips ${flips}, readings > 25/min ${high}`);
    expect(beats.length).toBeGreaterThan(30);
    expect(flips).toBeLessThanOrEqual(25);
    expect(high).toBe(0);
  }, 60_000);
});
