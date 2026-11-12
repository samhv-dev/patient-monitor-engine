// Plan scenario-builder.md §6 (B6): "To the next phase" is a fast-forward that stops at the first phase change or at
// 30 min — a stop condition in the host's own fast-forward loop, beside "a new patient or scenario started" and "the
// monitor stopped". The host reads the scenario's last phase entry (`phaseMark`) after each step's scenario commands
// have landed; a change ends the span there, the clock is given back, and the end says why. Host-local (the
// orchestrator's ruling of 11 November 2026): the laptop's run panel calls `fastForwardToNextPhase`; no wire command
// asks for it, so a remote's plain jump keeps its 600-s cap.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { FF_PHASE_MAX_S, FF_PHASE_STOP, HostSession, type HostSessionOptions } from '../../src/session/host-session.ts';
import type { WireEvent } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'FFNEXT1';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

/** A host whose monitor fast-forwards one step per macrotask, a phase mark that changes before step `changeAt` (never:
 *  Infinity), and a controller. */
async function rig(changeAt: number, o: Partial<HostSessionOptions> = {}) {
  const host = manualHost({ seed: 7, truthHz: 1 });
  const steps: Array<{ n: number; last: boolean }> = [];
  let mark = 'latent@0';
  const target = Object.assign(host, {
    fastForwardStep: async (n: number, last: boolean) => {
      await new Promise((r) => setTimeout(r, 0));
      steps.push({ n, last });
      host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
      if (steps.length - 1 === changeAt) mark = `early@${host.engine.now().simT}`; // the runner entered a phase in this step
      return host.engine.now();
    },
  });
  const hub = createInProcessHub();
  const hs = new HostSession({ session: S, target, stateIntervalMs: 0, phaseMark: () => mark, ...o });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => hs.close());
  await waitFor(() => ctl.hostOnline);
  return { host, hs, hub, ctl, steps };
}

describe('fast-forward to the next phase (B6)', () => {
  it('stops at the step the phase changed in, gives the clock back, and says why; every peer sees it', async () => {
    const r = await rig(4);
    const watcher = collect(r.hub.connect());
    const ack = await r.hs.fastForwardToNextPhase();
    expect(ack.accepted).toBe(true);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000, 'end seen');
    expect(r.ctl.lastFastForward?.stopped).toBe(FF_PHASE_STOP);
    // the empty step, four steps of 25 ticks (the change in the fourth), then the clock given back with an empty last step
    expect(r.steps).toEqual([{ n: 0, last: false }, ...Array.from({ length: 4 }, () => ({ n: 25, last: false })), { n: 0, last: true }]);
    expect(r.ctl.lastFastForward?.endT).toBeCloseTo(2, 6);
    expect(r.hs.fastForwarding).toBe(false);
    const seen: WireEvent[] = [];
    for (const m of watcher) if (m.kind === 'event') seen.push(...m.body);
    expect(seen.filter((e) => e.type === 'fastForward').map((e) => (e as { phase: string }).phase)).toEqual(['start', 'end']);
    expect((await r.ctl.send({ type: 'setTarget', variable: 'hr', value: 120 })).accepted).toBe(true); // the commands are taken again
  }, 120_000);

  it('runs its whole span when no phase changes, and then has no early stop', async () => {
    const r = await rig(Infinity);
    expect((await r.hs.fastForwardToNextPhase(4)).accepted).toBe(true);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    expect(r.ctl.lastFastForward?.stopped).toBeUndefined();
    expect(r.ctl.lastFastForward?.endT).toBeCloseTo(4, 6);
    expect(r.steps.filter((s) => s.last)).toHaveLength(1);
  }, 120_000);

  it('a jump without `until` ignores the phase, as before', async () => {
    const r = await rig(2);
    await r.ctl.send({ type: 'time', action: 'jump', value: 4 });
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    expect(r.ctl.lastFastForward?.stopped).toBeUndefined();
    expect(r.ctl.lastFastForward?.endT).toBeCloseTo(4, 6);
  }, 120_000);

  it('refuses a span past 30 min, and a stop it cannot read (no phase running, or no reader)', async () => {
    const r = await rig(Infinity);
    for (const v of [0, FF_PHASE_MAX_S + 1]) expect((await r.hs.fastForwardToNextPhase(v)).reason).toBe('fast-forward to the next phase must be 0–1800 s');
    // a remote's jump keeps its cap, and a field asking for the phase stop is not read from the wire
    expect((await r.ctl.send({ type: 'time', action: 'jump', value: 900 })).reason).toBe('fast-forward must be 0–600 s');
    expect((await r.ctl.send({ type: 'time', action: 'jump', value: 900, until: 'phase' } as never)).reason).toBe('fast-forward must be 0–600 s');
    const none = await rig(Infinity, { phaseMark: () => null });
    expect((await none.hs.fastForwardToNextPhase(60)).reason).toBe('no phase to wait for: no pme-scenario/2 card is running');
    const old = await rig(Infinity, { phaseMark: undefined });
    expect((await old.hs.fastForwardToNextPhase(60)).accepted).toBe(false);
    expect(FF_PHASE_MAX_S).toBe(1800);
  }, 120_000);
});
