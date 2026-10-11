// Stage 10 Task 1 (the owner's ×8 request, 22 Oct demonstration): the host accepts the engine clock's range, 0.25–8, and
// a second-screen viewer follows a ×8 host at ×8 (it was clamped to ×4 and fell behind by 4 s of sim every wall second).
import { describe, expect, it } from 'vitest';
import { MAX_TIME_SCALE } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'SPD234', target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'SPD234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const sync = new ViewerSync({ session: 'SPD234', transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
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
  return { host, ctl, v, sync, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

describe('Stage 10: ×8', () => {
  it('the host accepts ×8 and refuses more, naming the range', async () => {
    const r = await rig();
    expect(MAX_TIME_SCALE).toBe(8);
    expect((await r.ctl.send({ type: 'time', action: 'scale', value: 8 })).accepted).toBe(true);
    expect(r.host.scale).toBe(8);
    const no = await r.ctl.send({ type: 'time', action: 'scale', value: 8.5 });
    expect(no.accepted).toBe(false);
    expect(no.reason).toBe('scale must be 0.25–8');
    expect(r.host.scale).toBe(8);
    r.close();
  });

  it('a viewer follows a ×8 host at ×8, a fixed delay behind', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'scale', value: 8 });
    await r.run(4);
    expect(r.v.rate).toBeGreaterThan(7.2);
    expect(r.v.rate).toBeLessThanOrEqual(8);
    expect(r.sync.resyncs).toBe(0);
    expect(r.host.engine.now().simT - r.v.renderT()).toBeLessThan(1); // 32 s of sim in 4 s; the viewer kept up
    r.close();
  });
});
