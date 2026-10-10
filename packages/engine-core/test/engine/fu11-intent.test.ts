// FU-11 Task I2 (external review F13, F15): a modifier ramp is refused, not ignored; a ventilation edit keeps the
// pressure limit.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `i${n++}`, issuedBy: 'test', ...x }) as never;

describe('FU-11 I2: instructor intent (F13, F15)', () => {
  it('a modifier change with a delay or a duration is refused (no ramp consumer); without one it applies', () => {
    const e = createEngine({ seed: 7 });
    const r = e.dispatch(cmd({ type: 'setModifiers', modifiers: { qtc: 500 }, ramp: { delayS: 10, durationS: 60 } }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/ramp/);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { qtc: 500 } })).accepted).toBe(true);
  });
  it('a ventilator edit of the rate keeps the pressure limit set before it', () => {
    const e = createEngine({ seed: 7, mode: 'modeled' });
    const v = (x: Record<string, unknown>) => e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', ...x } }));
    v({ rr: 12, vtMl: 500, fio2: 0.5, peep: 5, pmax: 25 });
    e.advanceTo(2);
    v({ rr: 16 });
    e.advanceTo(4);
    const vent = (e.snapshot().state as { st: { resp: { driver: { vent: { rr: number; pmax?: number } } } } }).st.resp.driver.vent;
    expect(vent).toMatchObject({ rr: 16, pmax: 25 });
    v({ pmax: 30 });
    e.advanceTo(6);
    expect((e.snapshot().state as { st: { resp: { driver: { vent: { pmax?: number } } } } }).st.resp.driver.vent.pmax).toBe(30);
  });
});
