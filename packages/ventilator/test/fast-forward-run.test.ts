// Stage 10 (owner's decision 6: the Ventilator view must support the fast-forward): the cockpit steps through a span with
// the engine — before each fast-forward step the link has it produce the frames of every engine tick the step will run
// (`runTo`), so the patient stays on the cockpit; without it the engine runs ahead with no frame and drops the drive.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES } from '../src/index.ts';

/** A cockpit linked to an engine for 5 s on the (fake) wall clock; `framed` = the engine ticks a frame was stamped for. */
async function linked() {
  const [ventPort, monPort] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
  const framed = new Set<number>();
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      const r = e.dispatch(c);
      if (c.type === 'externalDrive' && r.accepted) framed.add(r.tick);
      return r;
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  const link = attachMonitorToLink(mon, monPort);
  const d = createVentDriver(ventPort, 'normal');
  let ms = 0;
  d.frame(0);
  for (let i = 0; i < 250; i++) {
    ms += 20;
    d.frame(ms);
    e.advanceTo(e.now().simT + 0.02);
    await Promise.resolve();
  }
  return { e, link, framed };
}

/** Fast-forward `s` seconds in 25-tick steps (the host's FF_STEP_TICKS), the cockpit's wall clock standing still. */
async function fastForward(r: Awaited<ReturnType<typeof linked>>, s: number, lockstep: boolean) {
  const from = r.e.now().tick;
  for (let t = from; t < from + s * 50; t += 25) {
    if (lockstep) await r.link.runTo(t + 25);
    r.e.advanceTo((t + 25) * 0.02 + 1e-9);
    await Promise.resolve();
  }
  return from;
}

const gaps = (framed: Set<number>, from: number, to: number) => {
  let n = 0;
  for (let t = from + 1; t <= to; t++) if (!framed.has(t)) n++;
  return n;
};

describe('the cockpit steps through a fast-forward', () => {
  it('runTo: every engine tick of a 60 s span gets its frame, on time', { timeout: 60_000 }, async () => {
    const r = await linked();
    const from = await fastForward(r, 60, true);
    expect(gaps(r.framed, from, r.e.now().tick)).toBe(0);
    expect(r.e.now().tick - from).toBe(3000);
  });

  it('without it the engine runs past the cockpit (the reason): most of the span has no frame', { timeout: 60_000 }, async () => {
    const r = await linked();
    const from = await fastForward(r, 60, false);
    expect(gaps(r.framed, from, r.e.now().tick)).toBeGreaterThan(2900);
  });

  it('runTo resolves at once while the link has not learnt its clock (no cockpit ventilates yet)', async () => {
    const [, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7 });
    const link = attachMonitorToLink({ dispatch: (c: Command) => e.dispatch(c), on: (fn: (x: EngineEvent) => void) => e.on(fn) }, monPort);
    await expect(link.runTo(1000)).resolves.toBeUndefined();
  });
});
