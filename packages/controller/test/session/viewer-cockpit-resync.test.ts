// A viewer that takes a fresh snapshot while the Ventilator view's frames are mirrored to it: the frames the host had
// queued ahead of its tick are in the snapshot, so the viewer applies each of them once and stays exact.
import { afterEach, describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import type { WireMessage } from '../../src/protocol.ts';
import { channelHost } from '../fakes/channel-host.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'VCR234';
const LEAD = 5; // the link stamps a frame this many ticks ahead of the engine (LEAD_TICKS)
const flushIo = () => new Promise((r) => setTimeout(r, 0));
const closers: Array<() => void> = [];
afterEach(() => closers.splice(0).forEach((c) => c()));

/** One volume-control breath every 3 s (1 s in), as the cockpit's frames give it. */
function frame(tick: number, n: number): Command {
  const t = (tick * 0.02) % 3;
  const insp = t < 1;
  return { id: `vent-${n}`, issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', atTick: tick, frame: { pawCmH2O: insp ? 5 + 15 * t : 5, flowLps: insp ? 0.5 : -0.3, volumeMl: insp ? 500 * t : Math.max(0, 500 - 600 * (t - 1)), fio2: 0.5, peepCmH2O: 5 } } as Command;
}

async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hs = new HostSession({ session: S, target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(createBroadcastChannelTransport(S));
  const v = manualViewer();
  const sync = new ViewerSync({ session: S, transport: createBroadcastChannelTransport(S), target: v, engineVersion: host.engine.version, wallNow });
  closers.push(() => (hs.close(), sync.close()));
  let n = 0;
  let next = 0;
  /** Wall time in 20 ms frames; with `cockpit`, a frame for every tick up to LEAD ahead, mirrored as the app does. */
  const run = async (seconds: number, cockpit: boolean) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      host.advance(20);
      if (cockpit) {
        const ahead = host.engine.now().tick + LEAD;
        next = Math.max(next, host.engine.now().tick + 1);
        for (; next <= ahead; next++) {
          const c = frame(next, ++n);
          hs.mirror(c, host.dispatch(c) as ReturnType<typeof host.engine.dispatch>);
        }
      }
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
    }
  };
  return { host, v, sync, run };
}

describe('ViewerSync while the cockpit drives', () => {
  it('a resync during the frames restores the host exactly: no frame of the snapshot applied twice', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(2, false);
    await r.run(6, true);
    expect(r.sync).toMatchObject({ status: 'synced', resyncs: 0, beatDriftMs: 0 });
    // the next frame is queued on the host and mirrored before the host hears the hello, so it reaches the viewer
    // ahead of the snapshot that holds it
    r.sync.resync();
    await r.run(1, true);
    expect(r.sync).toMatchObject({ status: 'synced', resyncs: 1, lastResync: 'asked' });
    // the same tick on both engines: the same body, to the last bit
    r.v.engine.advanceTo(r.host.engine.now().simT);
    expect(r.v.engine.snapshot().state).toEqual(r.host.engine.snapshot().state);
  });

  it('a command the host accepts while its snapshot request is on its way is mirrored after the snapshot, once', async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = channelHost();
    const hs = new HostSession({ session: 'VCW234', target: host, wallNow, stateIntervalMs: 0 });
    hs.addTransport(createBroadcastChannelTransport('VCW234'));
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VCW234', transport: createBroadcastChannelTransport('VCW234'), target: v, engineVersion: host.engine.version, wallNow });
    const heard = createBroadcastChannelTransport('VCW234');
    const seen = collect(heard);
    closers.push(() => (hs.close(), sync.close(), heard.close(), host.close()));
    let n = 0;
    let next = 0;
    // as the app's Ventilator view: dispatched to the engine, mirrored on the engine's answer (AppSession.linked)
    const drive = (c: Command) => void host.dispatch(c).then((r) => hs.mirror(c, r));
    const run = async (seconds: number) => {
      for (let i = 0; i < seconds * 50; i++) {
        clock.wall += 20;
        await host.advance(20);
        for (next = Math.max(next, host.now().tick + 1); next <= host.now().tick + LEAD; next++) drive(frame(next, ++n));
        if (i % 50 === 0) hs.emitState();
        for (let k = 0; k < 3; k++) await flushIo();
        sync.follow();
        v.advance(20);
      }
    };
    await waitFor(() => sync.status === 'synced');
    await run(3);
    const during: string[] = [];
    host.onSnapshotAsked = () => {
      host.onSnapshotAsked = null;
      const c = frame(host.now().tick + LEAD, ++n);
      during.push(c.id);
      drive(c);
      for (const cmd of [
        { id: 'rhythm-during', issuedBy: 'test', type: 'setRhythm', rhythm: 'afib' },
        { id: 'drug-during', issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' } },
      ] as Command[]) {
        during.push(cmd.id);
        void hs.submit(cmd);
      }
    };
    sync.resync();
    await run(2);
    expect(during).toHaveLength(3);
    const snaps = seen.filter((m): m is Extract<WireMessage, { kind: 'snapshot' }> => m.kind === 'snapshot');
    const snap = snaps[snaps.length - 1] as Extract<WireMessage, { kind: 'snapshot' }>;
    const at = seen.indexOf(snap);
    const appliedAt = (id: string) => seen.findIndex((m) => m.kind === 'event' && m.body.some((e) => e.type === 'commandApplied' && e.commandId === id));
    for (const id of during) {
      expect(JSON.stringify(snap.body.state)).not.toContain(`"${id}"`); // not in the snapshot…
      expect(appliedAt(id)).toBeGreaterThan(at); // …and heard after it
    }
    expect(sync).toMatchObject({ status: 'synced', resyncs: 1, lastResync: 'asked' });
    v.engine.advanceTo(host.engine.now().simT);
    expect(v.engine.snapshot().state).toEqual(host.engine.snapshot().state);
  });
});
