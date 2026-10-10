// FU-11 Task E3b (R50 F1): the Ventilator-view link follows a bookmark restore of the engine it drives — frames are
// stamped on the restored timeline (not 50 s in its future) and the ventilator gets its clock again.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, LEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

describe('FU-11 E3b: the link after a restore', () => {
  it('after a 50 s rewind the next frames land within the lead of the engine and a clock is published', { timeout: 30_000 }, async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const scheduled: Array<{ at: number; engine: number }> = [];
    const mon = {
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive') scheduled.push({ at: r.tick, engine: e.now().tick });
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    };
    attachMonitorToLink(mon, monPort);
    const clocks: number[] = [];
    ventPort.onMessage((m: LinkMsg) => m.kind === 'clock' && clocks.push(m.ventTick));
    const d = createVentDriver(ventPort, 'normal');
    let ms = 0;
    const run = async (frames: number) => {
      for (let i = 0; i < frames; i++) {
        ms += 20;
        d.frame(ms);
        e.advanceTo(e.now().simT + 0.02);
        await Promise.resolve();
      }
    };
    d.frame(0);
    await run(100);
    const snap = e.snapshot();
    await run(2500);
    const clocksBefore = clocks.length;
    scheduled.length = 0;
    e.restore(snap);
    await run(50);
    expect(clocks.length).toBeGreaterThan(clocksBefore);
    const late = scheduled.slice(5);
    expect(late.length).toBeGreaterThan(20);
    for (const s of late) expect(s.at - s.engine).toBeLessThanOrEqual(LEAD_TICKS + 2);
  });
});
