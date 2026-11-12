// Found by pump-rack-tci.md A2's e2e: a follower mirrors each command the host applied at the host's tick, which is
// AHEAD of the follower (it runs ~delayS behind), so the follower's engine validates the command at dispatch, against
// its state BEFORE the commands still queued for earlier ticks have applied. A command that depends on one of those —
// the pump tablet's Start a moment after its TCI target (the engine's `start` needs a rate or TCI) — was refused there
// and silently dropped: the host ran the channel, the tablet's face said "Loaded" until a beat mismatch resynced it,
// 6–12 s later. A mirrored command the host applied and this engine refuses means the two engines would differ: the
// follower now resyncs at once (a fresh snapshot), as it does for a command that arrives after its tick.
import { describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));
type Pk = { pumps?: Array<{ ch: number; paused: boolean; mode: string }> };
const pumpOf = (s: unknown, ch: number) => ((s as { state: { st: { pk: Pk } } }).state.st.pk.pumps ?? []).find((c) => c.ch === ch);

async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'VWC234', target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'VWC234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const sync = new ViewerSync({ session: 'VWC234', transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
  const frame = async () => {
    clock.wall += 20;
    host.advance(20);
    hs.emitState();
    await flushIo();
    sync.follow();
    v.advance(20);
  };
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) await frame();
  };
  return { host, hs, ctl, v, sync, frame, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

describe('ViewerSync: a mirrored command that depends on one still queued', () => {
  it('a pump Start one frame after its TCI target: the follower runs the channel as the host does', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(1);
    const send = (event: Record<string, unknown>) => r.ctl.send({ type: 'applyEvent', event: { kind: 'pump', ch: 2, ...event } } as never);
    expect((await send({ action: 'load', channel: 'syringe', contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 }, volumeMl: 20 }, syringeMl: 20 })).accepted).toBe(true);
    await r.run(0.5);
    expect((await send({ action: 'program', drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } })).accepted).toBe(true);
    await r.run(0.5);
    expect((await send({ action: 'tci', setId: 'eleveld', mode: 'effect', target: 3, patient: { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' } })).accepted).toBe(true);
    await r.frame(); // the host has applied the target; the follower, ~0.1 s behind, still holds it queued
    await r.frame();
    expect((await send({ action: 'start' })).accepted).toBe(true);
    await r.run(2);
    expect(pumpOf(await r.host.snapshot(), 2)).toMatchObject({ paused: false, mode: 'tci' });
    expect(pumpOf(r.v.engine.snapshot(), 2)).toMatchObject({ paused: false, mode: 'tci' });
    r.close();
  });
});
