// ViewerSync with engines on a manual clock: exact mirroring, late-command resync, version mismatch, pause.
import { describe, expect, it } from 'vitest';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createStamper } from '../../src/protocol.ts';
import { manualHost, type ManualHost } from '../fakes/manual-host.ts';
import { manualViewer, type ManualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

/** Host + in-process hub + controller + viewer, stepping wall time in 20 ms frames. */
async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'VWS234', target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'VWS234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const vt = hub.connect();
  const sync = new ViewerSync({ session: 'VWS234', transport: vt, target: v, engineVersion: host.engine.version, wallNow });
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      host.advance(20);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
    }
  };
  return { clock, host, hs, ctl, v, vt, sync, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

function maxDiff(a: ManualHost['engine'], b: ManualViewer['engine'], seconds: number): number {
  const end = Math.min(a.latestSampleIndex('ecgII'), b.latestSampleIndex('ecgII')) - 60;
  const n = seconds * 500;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  a.readSamples('ecgII', end - n, x);
  b.readSamples('ecgII', end - n, y);
  let m = 0;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs((x[i] as number) - (y[i] as number)));
  return m;
}

describe('ViewerSync', () => {
  it('restores the snapshot, follows the host clock ~delayS behind, and mirrors commands exactly', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(3);
    await r.ctl.send({ type: 'setRhythm', rhythm: 'avb2Mobitz1' });
    await r.ctl.send({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgIII', lane: 0 } });
    await r.run(8);
    expect(r.sync.status).toBe('synced');
    expect(r.sync.resyncs).toBe(0);
    expect(r.sync.lagS).toBeGreaterThan(0.05);
    expect(r.sync.lagS).toBeLessThan(0.2);
    const a = new Float32Array(2500);
    const b = new Float32Array(2500);
    const end = r.v.engine.latestSampleIndex('ecgIII') - 60;
    r.host.engine.readSamples('ecgIII', end - 2500, a);
    r.v.engine.readSamples('ecgIII', end - 2500, b);
    expect([...a]).toEqual([...b]);
    r.close();
  });

  it('resyncs (hello → new snapshot) when a mirrored command arrives after its tick', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(2);
    // Deliver a commandApplied for a tick the viewer has already passed (from a second sender id, so the
    // host's own sequence numbers are not disturbed).
    const stamp = createStamper('VWS234', 'late-sender');
    const past = r.v.engine.now().tick - 5;
    const late = stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'late-1', tick: past, resolved: { command: { id: 'late-1', issuedBy: 'x', type: 'setRhythm', rhythm: 'vtMono', atTick: past } } }] });
    (r.vt as unknown as { receive(m: unknown): void }).receive(late);
    expect(r.sync.status).toBe('waiting');
    await r.run(1);
    expect(r.sync.status).toBe('synced');
    expect(r.sync.resyncs).toBe(1);
    await r.run(3);
    expect(maxDiff(r.host.engine, r.v.engine, 2)).toBe(0);
    r.close();
  });

  it('pauses with the host and resumes with it', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(2);
    await r.ctl.send({ type: 'time', action: 'pause' });
    await r.run(1);
    const t = r.v.t;
    await r.run(1);
    expect(r.v.t).toBe(t);
    await r.ctl.send({ type: 'time', action: 'resume' });
    await r.run(2);
    expect(r.v.t).toBeGreaterThan(t + 1);
    r.close();
  });

  it('refuses to mirror a snapshot from a different engine build', async () => {
    const host = manualHost();
    const hs = new HostSession({ session: 'VWX234', target: host, stateIntervalMs: 0 });
    hs.addTransport(createBroadcastChannelTransport('VWX234'));
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VWX234', transport: createBroadcastChannelTransport('VWX234'), target: v, engineVersion: '9.9.9' });
    await waitFor(() => sync.status === 'incompatible');
    expect(v.paused).toBe(true);
    hs.close();
    sync.close();
  });
});
