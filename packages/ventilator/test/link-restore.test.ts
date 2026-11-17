// FU-11 Task E3b (R50 F1): the Ventilator-view link follows a bookmark restore of the engine it drives — frames are
// stamped on the restored timeline (not 50 s in its future) and the ventilator gets its clock again.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, LEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

describe('the link after a restore', () => {
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

// FX-1 (PR #58 run 38212560444, CI WebKit): after "Return here" the cockpit's clock stayed at 4086 for good and the patient
// went apnoeic. On a slow runner the cockpit sits at its clock limit; the restore cleared the offset, so no clock could be
// published until a frame probed it — and a cockpit at its limit sends no frame. The restore now lets it run 2·LEAD_TICKS.
describe('FX-1: a restore while the cockpit is at its clock limit', () => {
  it('the cockpit gets a clock again and its next frames land on the restored timeline', { timeout: 30_000 }, async () => {
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
    const snapT = e.now().simT;
    await run(500);
    d.scale = 4; // one long animation frame at ×4: the cockpit runs to its clock limit and stops there
    ms += 500;
    d.frame(ms);
    d.scale = 1;
    const atLimit = d.simT();
    expect(Math.round(atLimit / 0.02)).toBe(Math.max(...clocks));
    const clocksBefore = clocks.length;
    scheduled.length = 0;
    e.restore(snap);
    await run(100);
    expect(clocks.length, 'a clock after the restore').toBeGreaterThan(clocksBefore);
    expect(d.simT()).toBeGreaterThan(snapT + 1); // the cockpit went back with the patient and kept ventilating
    const late = scheduled.slice(5);
    expect(late.length).toBeGreaterThan(20);
    for (const s of late) expect(s.at - s.engine).toBeLessThanOrEqual(LEAD_TICKS + 2);
  });
});

describe('a restore of a cockpit-ventilated patient', () => {
  it('replays the same breaths: every frame the engine takes after the restore is the one it took the first time', { timeout: 60_000 }, async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const taken: Array<Map<number, string>> = [new Map(), new Map()];
    let pass = 0;
    const mon = {
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive' && r.accepted) taken[pass]!.set(r.tick, JSON.stringify(c.frame));
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    };
    attachMonitorToLink(mon, monPort);
    const d = createVentDriver(ventPort, 'normal');
    let ms = 0;
    const runTo = async (t: number) => {
      while (e.now().simT < t - 1e-9) {
        ms += 20;
        d.frame(ms);
        e.advanceTo(e.now().simT + 0.02);
        await Promise.resolve();
      }
    };
    d.frame(0);
    await runTo(40);
    const snap = e.snapshot();
    await runTo(110);
    e.restore(snap);
    pass = 1;
    await runTo(110);
    const ticks = [...taken[1]!.keys()].filter((tk) => taken[0]!.has(tk));
    expect(ticks.length).toBeGreaterThan(3000);
    expect(ticks.filter((tk) => taken[1]!.get(tk) !== taken[0]!.get(tk))).toEqual([]);
  });
});
