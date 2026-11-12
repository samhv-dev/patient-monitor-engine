// Defibrillator plan R1, the evidence through a REAL relay and a REAL host (HostSession on its own engine): what holds in
// a room today, before R2. A `defib` screen with no PIN keeps exactly its two presses, and its bare Charge reaches the
// engine and changes the defibrillator's state. `preselect` and a drug are refused at the relay (its own log line, never
// at the host), and again at the HOST when they come with no relay in between (a same-browser window: the in-process
// transport stands for the BroadcastChannel), in the host's own ack. A screen whose hello carries the learner PIN is held
// pending: the host grants no `defib` hello until R2, so nothing it commands reaches the host. The M2 table is therefore
// inert in a real room: the host still checks a `defib` peer with learnerDefibMay, which an M2 shape does not pass.
import { writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type DeviceEvent } from '@pme/engine-core';
import { createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

const SESSION = 'DFH234';
type Engine = ReturnType<typeof createEngine>;
type Status = NonNullable<Extract<DeviceEvent, { type: 'deviceStatus' }>['defib']>;
let relay: RelayHandle | null = null;
let hs: HostSession | null = null;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  hs?.close();
  hs = null;
  await relay?.close();
  relay = null;
});
const target = (e: Engine): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});

/** A raw socket from another device ([::1]): the screen as a phone or tablet joins. */
async function screen(from: string, hello: Record<string, unknown>) {
  const ws = new WebSocket(`ws://[::1]:${relay!.port}/`);
  const got: Array<Record<string, unknown>> = [];
  const st = createStamper(SESSION, from);
  ws.onmessage = (e) => {
    const d = String(e.data);
    if (!d.startsWith('{"relay":"hb"')) got.push(JSON.parse(d) as Record<string, unknown>);
  };
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  ws.send(JSON.stringify(st({ kind: 'hello', role: 'defib', ...hello } as never)));
  await waitFor(() => got.some((f) => f.relay === 'peers'), 2000, `${from} admitted`);
  let n = 0;
  return {
    got,
    command: (body: Record<string, unknown>) => {
      const id = `${from}-${++n}`;
      ws.send(JSON.stringify(st({ kind: 'command', body: { id, issuedBy: from, ...body } } as never)));
      return id;
    },
  };
}
const charge = { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } };
const preselect = { type: 'applyEvent', event: { kind: 'defib', action: 'preselect', outcome: 'sinus' } };
const drug = { type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } };
const selector = { type: 'device', action: { device: 'defib', action: 'selector', value: 'pacer' } };
type Ack = Extract<WireMessage, { kind: 'ack' }>;
const acks = (got: Array<Record<string, unknown>> | WireMessage[]) => (got as Array<Record<string, unknown>>).filter((m) => m.kind === 'ack') as unknown as Ack[];

async function setup() {
  const relayLog: string[] = [];
  const hostLog: string[] = [];
  relay = await startRelay({ port: 0, host: '::', heartbeatMs: 60_000, remoteRoles: 'viewer', isLocal: (a) => a !== '::1', log: (l) => relayLog.push(`relay: ${l}`) });
  const engine = createEngine({ seed: 7 });
  let defib: Status | null = null;
  engine.on((e) => void (e.type === 'deviceStatus' && e.defib && (defib = e.defib)));
  hs = new HostSession({
    session: SESSION, target: target(engine), stateIntervalMs: 0, learnerPin: () => '4729', instructorPin: () => '8150',
    onCommand: (i) => hostLog.push(`host: ${i.from} ${i.commandId} ${i.accepted ? 'accepted' : 'refused'} at tick ${i.tick}`),
  });
  const hostWs = createWebSocketTransport({ url: `ws://127.0.0.1:${relay.port}/` });
  closers.push(() => hostWs.close());
  hs.addTransport(hostWs);
  await waitStatus(hostWs, 'open');
  await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'host on relay');
  // the same-browser path: no relay between the window and the host
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const local = hub.connect();
  const localGot = collect(local);
  return { engine, relayLog, hostLog, defib: () => defib, local, localGot };
}
const run = (e: Engine, s: number) => e.step(Math.round(s * 50));

describe('R1 through a real relay and a real host (before R2)', () => {
  it('an allowed bare Charge reaches the engine and changes its state; preselect and a drug are refused at the relay and at the host; a PIN screen stays pending', async () => {
    const x = await setup();
    run(x.engine, 1);
    expect(x.defib()?.state).toBe('idle');

    // 1. today's window (no PIN): its Charge reaches the engine
    const win = await screen('defib-win', { show: 'defib', device: 'bed2defib01' });
    const c1 = win.command(charge);
    await waitFor(() => acks(win.got).some((a) => a.commandId === c1), 2000, 'the charge acked');
    expect(acks(win.got).find((a) => a.commandId === c1)).toMatchObject({ accepted: true });
    run(x.engine, 1);
    expect(x.defib()?.state).toBe('charging');

    // 2. preselect and a drug from it: refused at the relay, never at the host
    const before = x.hostLog.length;
    const p1 = win.command(preselect);
    await sleep(300); // under the window's 4 a second
    const d1 = win.command(drug);
    await waitFor(() => win.got.filter((f) => f.relay === 'error').length === 2, 2000, 'both refused at the relay');
    expect(win.got.filter((f) => f.relay === 'error').map((f) => f.code)).toEqual(['forbidden', 'forbidden']);
    await sleep(200);
    expect(x.hostLog.length).toBe(before);
    expect(acks(win.got).some((a) => a.commandId === p1 || a.commandId === d1)).toBe(false);

    // 3. the same two with no relay in between (a same-browser window): refused by the HOST, in its own ack
    const st = createStamper(SESSION, 'defib-local');
    const send = (t: ManagedTransport, m: Parameters<typeof st>[0]) => t.send(st(m));
    send(x.local, { kind: 'hello', role: 'defib', show: 'defib', device: 'bed3defib01' });
    for (const [id, body] of [['local-preselect', preselect], ['local-drug', drug], ['local-selector', selector]] as const)
      send(x.local, { kind: 'command', body: { id, issuedBy: 'defib-local', ...body } as never });
    await waitFor(() => acks(x.localGot).length === 3, 2000, 'three acks from the host');
    const local = acks(x.localGot);
    for (const a of local) expect(a.accepted, a.commandId).toBe(false);
    // the M2 selector is inert at the host until R2 (learnerDefibMay is unchanged)
    expect(local.map((a) => a.reason)).toEqual(Array(3).fill('The defibrillator window sends Charge and Shock only.'));

    // 4. a screen with the learner PIN: its hello reaches the host, which grants nothing until R2; its Charge stays at the relay
    const pinned = await screen('defib-pin', { pin: '4729', show: 'defib', device: 'bed4defib01' });
    const c2 = pinned.command(charge);
    await waitFor(() => pinned.got.some((f) => f.relay === 'error'), 2000, 'refused while pending');
    expect(pinned.got.find((f) => f.relay === 'error')).toMatchObject({ code: 'forbidden', message: 'the defibrillator is not signed in' });
    await sleep(200);
    expect(pinned.got.some((m) => m.kind === 'grant')).toBe(false);
    expect(x.hostLog.some((l) => l.includes(c2))).toBe(false);

    const evidence = [...x.relayLog, ...x.hostLog, `engine: defibrillator ${x.defib()?.state}`, ...local.map((a) => `host ack: ${a.commandId} accepted=${a.accepted} reason="${a.reason}"`)];
    expect(evidence.filter((l) => l.startsWith('relay: defib defib-win: refused'))).toHaveLength(2);
    expect(evidence.filter((l) => l.startsWith('relay: defib defib-pin: refused'))).toHaveLength(1);
    if (process.env.PME_R1_EVIDENCE) writeFileSync(process.env.PME_R1_EVIDENCE, `${evidence.join('\n')}\n`);
  });
});
