// Prints the Stage 2 acceptance numbers on the circulation for docs/gates/stage-7a.md (asserts only the bands of
// Task 23's table that no other test covers).
import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('Stage 2 acceptance on the Stage 7a circulation', () => {
  it('radial 120/80 ± 5 with the notch; radial SBP exceeds aortic by 5–20', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(40);
    const w = read(e, 'abp', 30, 40);
    const s = Math.max(...w);
    const d = Math.min(...w);
    const st = (e.snapshot().state as { st: { hemo: { circ: { beats: { sbp: number; aoSys: number }[] } } } }).st.hemo.circ.beats;
    const amp = st.slice(-5).reduce((a, b) => a + b.sbp - b.aoSys, 0) / 5;
    console.log(`radial ${s.toFixed(1)}/${d.toFixed(1)}, radial−aortic SBP ${amp.toFixed(1)}`);
    expect(Math.abs(s - 120)).toBeLessThanOrEqual(5);
    expect(Math.abs(d - 80)).toBeLessThanOrEqual(5);
    expect(amp).toBeGreaterThanOrEqual(5);
    expect(amp).toBeLessThanOrEqual(20);
  });
  it('A2 guard: PEEP 5 → 15 lowers CO by ≥ 3 %', () => {
    const { e, ev } = rig({ hr: 75 });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.advanceTo(90);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 15 } }));
    e.advanceTo(180);
    const co = (a: number, b: number) => {
      const c = ev.filter((x) => x.type === 'circ' && x.t >= a && x.t < b) as unknown as { co: number }[];
      return c.reduce((p, q) => p + q.co, 0) / c.length;
    };
    const drop = 1 - co(170, 180) / co(80, 90);
    console.log(`PEEP 5→15 CO drop ${(drop * 100).toFixed(1)} %`);
    expect(drop).toBeGreaterThanOrEqual(0.03);
  }, 300_000);
});
