// Brief 90 (time-control.e2e.ts:31, CI Chromium: the 2-minute fast-forward from the Ventilator view saw NO cockpit frame,
// Math.max() of nothing = −Infinity, in 5 runs of 6 Nov and 2 of 7 Nov): leaving the Ventilator view hands the patient
// over (CockpitDesk.unlink: the cockpit is paused, the link detached); coming back links it again through a NEW
// attachMonitorToLink, which learns its tick offset from the cockpit's next frame. A cockpit paused AT its clock limit
// (on a slow runner the engine's events arrive late and the cockpit waits at its limit) sends no frame, so the new link
// learnt no offset, published no clock and stepped no fast-forward: the patient was not ventilated while the cockpit's own
// screen looked normal. The resume that links it again now lets it run 2·LEAD_TICKS, as before its first clock.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, LEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

describe('a cockpit linked again after a hand-over', () => {
  it('paused at its clock limit and resumed under a new link, it sends frames, gets a clock and keeps ventilating', { timeout: 30_000 }, async () => {
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
    const first = attachMonitorToLink(mon, monPort);
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
    await run(500);
    d.scale = 4; // one long animation frame at ×4: the cockpit runs to its clock limit and stops there
    ms += 500;
    d.frame(ms);
    d.scale = 1;
    const atLimit = d.simT();
    expect(Math.round(atLimit / 0.02)).toBe(Math.max(...clocks));
    // the hand-over (CockpitDesk.unlink): the cockpit is paused, the link detached; the engine runs on
    monPort.post({ v: 1, kind: 'time', action: 'pause' });
    first();
    await run(100);
    expect(d.simT()).toBe(atLimit);
    // linked again (CockpitDesk link): a new link, then the resume
    const clocksBefore = clocks.length;
    scheduled.length = 0;
    attachMonitorToLink(mon, monPort);
    monPort.post({ v: 1, kind: 'time', action: 'resume' });
    await run(100);
    expect(clocks.length, 'a clock from the new link').toBeGreaterThan(clocksBefore);
    expect(d.simT()).toBeGreaterThan(atLimit + 1); // the cockpit ventilates again
    const late = scheduled.slice(5);
    expect(late.length).toBeGreaterThan(20);
    for (const s of late) expect(s.at - s.engine).toBeLessThanOrEqual(LEAD_TICKS + 2);
  });
});
