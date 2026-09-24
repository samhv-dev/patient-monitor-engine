// Host + controller + viewer over real transports, with engines on a manual clock (BUILD-PLAN Stage 6
// acceptance 2 late join, 3 no duplicate after a drop; brief §3.7 viewer synthesis).
import { describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { startRelay } from '../../relay/server.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { collect, sleep, waitFor } from '../helpers.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

/** Run host (and optional viewer) for `seconds` of wall time in 20 ms steps, letting messages flow. */
async function run(seconds: number, clock: { wall: number }, host: ReturnType<typeof manualHost>, viewer?: { v: ReturnType<typeof manualViewer>; sync: ViewerSync }) {
  for (let i = 0; i < seconds * 50; i++) {
    clock.wall += 20;
    host.advance(20);
    await flushIo();
    if (viewer) {
      viewer.sync.follow();
      viewer.v.advance(20);
    }
  }
}

function samplesEqual(a: ReturnType<typeof manualHost>['engine'], b: ReturnType<typeof manualViewer>['engine'], seconds: number): number {
  const end = Math.min(a.latestSampleIndex('ecgII'), b.latestSampleIndex('ecgII')) - 60; // leave the look-ahead out
  const n = seconds * 500;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  a.readSamples('ecgII', end - n, x);
  b.readSamples('ecgII', end - n, y);
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs((x[i] as number) - (y[i] as number)));
  return max;
}

describe('sessions over BroadcastChannel', () => {
  it('controller commands are acked; a late-joining viewer mirrors the host sample-for-sample', async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = manualHost();
    const hs = new HostSession({ session: 'VWR234', target: host, wallNow, stateIntervalMs: 0 });
    hs.addTransport(createBroadcastChannelTransport('VWR234'));
    const ctl = new ControllerSession({ session: 'VWR234', transport: createBroadcastChannelTransport('VWR234'), wallNow });
    await waitFor(() => ctl.hostOnline);
    const stateTimer = setInterval(() => hs.emitState(), 20); // 1 Hz of sim time at 50 steps/s ≈ every step here

    await run(5, clock, host);
    const ack = await ctl.send({ type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 5, curve: 'sigmoid' } });
    expect(ack.accepted).toBe(true);
    await run(5, clock, host);

    // viewer joins late, mid-ramp
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VWR234', transport: createBroadcastChannelTransport('VWR234'), target: v, engineVersion: host.engine.version, wallNow });
    await waitFor(() => sync.status === 'synced');
    await run(3, clock, host, { v, sync });
    await ctl.send({ type: 'setRhythm', rhythm: 'afib', when: 'now' });
    await run(6, clock, host, { v, sync });
    await ctl.send({ type: 'setModifiers', modifiers: { pvc: { pattern: 'single', probability: 0.3 } } });
    await ctl.send({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } });
    await run(8, clock, host, { v, sync });
    clearInterval(stateTimer);

    expect(sync.status).toBe('synced');
    expect(sync.resyncs).toBe(0);
    expect(sync.beatDriftMs).toBe(0);
    expect(samplesEqual(host.engine, v.engine, 10)).toBe(0);
    expect(sync.lagS).toBeGreaterThan(0.05);
    expect(sync.lagS).toBeLessThan(0.2);
    expect(ctl.log.some((l) => l.kind === 'ack')).toBe(true);
    hs.close();
    ctl.close();
    sync.close();
  });
});

describe('stage then commit', () => {
  it('commands sharing a stageGroup land on one tick', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'STG234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'STG234', transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const a = ctl.send({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g1' });
    host.advance(40); // two ticks pass between the two arrivals
    const b = ctl.send({ type: 'setModifiers', modifiers: { rsa: 0 }, stageGroup: 'g1' });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect(ra.tick).toBe(rb.tick);
    hs.close();
    ctl.close();
  });
});

describe('robustness over the relay', () => {
  it('a controller drop never applies a command twice, and pending commands go through after reconnect', async () => {
    const relay = await startRelay({ port: 0, host: '127.0.0.1' });
    const url = `ws://127.0.0.1:${relay.port}/`;
    const host = manualHost();
    const hs = new HostSession({ session: 'DRP234', target: host, stateIntervalMs: 0 });
    hs.addTransport(createWebSocketTransport({ url }));
    const ct = createWebSocketTransport({ url, backoff: { baseMs: 20, maxMs: 100, jitter: 0 } });
    const ctl = new ControllerSession({ session: 'DRP234', transport: ct });
    await waitFor(() => ctl.hostOnline, 3000);
    const p = ctl.send({ type: 'setTarget', variable: 'hr', value: 100 });
    ct.dropForTest(); // the ack (or the command itself) is lost with the socket
    await waitFor(() => ct.reconnects >= 1, 3000, 'reconnect');
    const r = await p;
    expect(r.accepted).toBe(true);
    await sleep(50);
    expect(hs.stats.applied).toBe(1);
    expect(ctl.pendingCount).toBe(0);
    const statuses = ctl.log.filter((l) => l.kind === 'status').map((l) => l.text);
    expect(statuses).toContain('link connecting');
    hs.close();
    ctl.close();
    await relay.close();
  });

  it('a re-sent command (same id) is answered from the host cache, not re-applied', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'ACK234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const t = hub.connect();
    const acks = collect(t);
    const stamp = createStamper('ACK234', 'ctl-raw');
    const body = { id: 'fixed-1', issuedBy: 'test', type: 'setTarget' as const, variable: 'hr' as const, value: 95 };
    t.send(stamp({ kind: 'command', body }));
    t.send(stamp({ kind: 'command', body })); // what a resend after a reconnect looks like
    await waitFor(() => acks.filter((m) => m.kind === 'ack').length === 2);
    const [a1, a2] = acks.filter((m) => m.kind === 'ack') as Array<Extract<WireMessage, { kind: 'ack' }>>;
    expect(a1!.accepted && a2!.accepted).toBe(true);
    expect(a2!.tick).toBe(a1!.tick);
    expect(hs.stats.applied).toBe(1);
    expect(hs.stats.duplicates).toBe(1);
    hs.close();
  });
});
