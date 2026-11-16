// A viewer that takes a fresh snapshot while the Ventilator view's frames are mirrored to it: the frames the host had
// queued ahead of its tick are in the snapshot, so the viewer applies each of them once and stays exact.
import { afterEach, describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

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
});
