// Stage 7e engine wiring: neutral at rest, the 1 Hz endo event, the MANUAL rhythm-clock factor only on sinus-family
// rhythms (FU-2 rate rule, NR-7g-5), MODELED → circ.ext.endo*, and restore of a pre-7e snapshot.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine, PatientSnapshot } from '../../src/types.ts';
import { ADULT, beatsIn, cmd, ev3, rig3, run } from '../helpers/resp.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine) => (e.snapshot().state as { st: any }).st;
const hrAt = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = beatsIn(ev, t0, t1);
  return (60 * (b.length - 1)) / (b[b.length - 1]!.t - b[0]!.t);
};

describe('Stage 7e engine wiring', { timeout: 300_000 }, () => {
  it('rest: endo event at 1 Hz, every factor neutral (endoHrF 1, circ.ext.endo* absent in MANUAL)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 10);
    expect(ev.filter((x) => x.type === 'endo').map((x) => (x as { t: number }).t)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const s = st(e);
    expect(s.endoHrF).toBe(1);
    expect(s.hemo.circ.ext.endoHrF).toBeUndefined();
    expect(s.resp.temp.extraX).toBe(1);
  });

  it('MANUAL: a stimulus scales the sinus rate; an SVT keeps its own rate (the factor is gated to the sinus family)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
    await run(e, 240);
    expect(st(e).endoHrF).toBeGreaterThan(1.15);
    expect(hrAt(ev, 200, 240)).toBeGreaterThan(1.15 * 75);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    await run(e, 300);
    expect(hrAt(ev, 270, 300)).toBeGreaterThan(175);
    expect(hrAt(ev, 270, 300)).toBeLessThan(185);
  });

  it('MODELED: the endocrine multipliers go to circ.ext (neutral at rest) and the rhythm-clock factor stays 1', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: ADULT });
    await run(e, 5);
    expect(st(e).hemo.circ.ext).toMatchObject({ endoHrF: 1, endoSvrF: 1, endoEesF: 1 });
    e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
    await run(e, 180);
    const s = st(e);
    expect(s.hemo.circ.ext.endoHrF).toBeGreaterThan(1.1);
    expect(s.hemo.circ.ext.endoSvrF).toBeGreaterThan(1.1);
    expect(s.endoHrF).toBe(1);
  });

  it('restore of a pre-7e snapshot (no endo, Stage 3 TempState) upgrades and runs on', async () => {
    const { e } = rig3({ patient: ADULT });
    await run(e, 30);
    const snap = e.snapshot() as PatientSnapshot;
    const old = structuredClone(snap);
    const o = (old.state as { st: Record<string, unknown> }).st;
    delete o.endo;
    delete o.endoHrF;
    delete o.cond;
    const temp = (o.resp as { temp: Record<string, unknown> }).temp;
    for (const k of ['env', 'depth', 'depthIn', 'setShift', 'feverShift', 'nmb', 'shiverShift', 'airMs', 'exposure', 'vent', 'iv', 'fluidWarmer', 'extraX', 'dantE', 'out', 'warmLag', 'effKg']) delete temp[k];
    e.restore(old);
    await run(e, 90);
    const s = st(e);
    expect(Number.isFinite(s.resp.temp.tc)).toBe(true);
    expect(Math.abs(s.resp.temp.tc - 36.8)).toBeLessThan(0.05);
    expect(s.endo.k).toBeGreaterThan(80);
  });
});
