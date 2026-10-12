// Stage 10 Task 6 (orchestrator ruling 2026-10-11, found at FU-11 d's gate): a second-screen viewer leapt ahead of the
// host after the host RESUMED from a pause. The host sends no `state` while paused, so `follow()` projected the last
// pre-pause anchor forward by the whole pause (capped at 3 s × rate): measured at ×2 after a 6 s pause, viewer 8.5 →
// 14.0 s while the host was at 9.2 s, then frozen 2.6 s until the host caught up. The viewer now re-anchors its time on
// the host's resume (and at the end of a fast-forward span), so it never runs ahead of the host.
import { describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

async function rig(ff = false) {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const target = ff
    ? Object.assign(host, {
        fastForwardStep: async (n: number) => {
          await flushIo();
          clock.wall += 20; // the span takes wall time (the app paces it to ≈ 10 s)
          host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
          return host.engine.now();
        },
      })
    : host;
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'ANC234', target, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'ANC234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const sync = new ViewerSync({ session: 'ANC234', transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
  /** Frames of 20 ms wall; `lead` is the most the viewer was ahead of the host on any frame. */
  const run = async (seconds: number) => {
    let lead = -Infinity;
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      host.advance(20);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
      lead = Math.max(lead, v.renderT() - host.engine.now().simT);
    }
    return lead;
  };
  return { host, ctl, v, sync, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

describe('Stage 10: the viewer re-anchors on the host resume (no leap ahead)', () => {
  it('after a 6 s pause at ×2 the viewer resumes with the host, not 6 s ahead of it, and does not freeze', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'scale', value: 2 });
    await r.run(4);
    await r.ctl.send({ type: 'time', action: 'pause' });
    await r.run(6); // the host is paused and sends no state
    const atResume = r.host.engine.now().simT;
    await r.ctl.send({ type: 'time', action: 'resume' });
    const lead = await r.run(3);
    expect(lead).toBeLessThan(0.05); // never ahead of the host (it led by ≈ 5 s before the fix)
    expect(r.v.renderT()).toBeGreaterThan(atResume + 5); // and it ran with the host meanwhile (3 s × 2), not frozen
    expect(r.host.engine.now().simT - r.v.renderT()).toBeLessThan(0.5);
    expect(r.sync.resyncs).toBe(0);
    r.close();
  });

  it('a pause, a fast-forward while paused, a wait and a resume: the viewer follows from the host time', async () => {
    const r = await rig(true);
    await waitFor(() => r.sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'scale', value: 2 });
    await r.run(4);
    await r.ctl.send({ type: 'time', action: 'pause' });
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => r.sync.lastFastForward !== null, 60_000, 'end seen');
    await waitFor(() => r.sync.status === 'synced', 5000, 'resynced');
    await r.run(6); // still paused after the span (the session was paused before it)
    const atResume = r.host.engine.now().simT;
    await r.ctl.send({ type: 'time', action: 'resume' });
    const lead = await r.run(3);
    expect(lead).toBeLessThan(0.05);
    expect(r.v.renderT()).toBeGreaterThan(atResume + 5);
    expect(r.host.engine.now().simT - r.v.renderT()).toBeLessThan(0.5);
    r.close();
  }, 120_000);
});
