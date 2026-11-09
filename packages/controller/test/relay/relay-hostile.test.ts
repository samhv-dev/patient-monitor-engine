// FU-11 Task A2 (external review F01, browser audit BA10): one malformed peer never takes the relay down — `null` on the
// signalling socket, a frame over the payload cap, a deeply nested envelope; a healthy room keeps working after each.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connect } from 'node:net';
import { createStamper } from '../../src/protocol.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { waitFor } from '../helpers.ts';

let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
  url = `ws://127.0.0.1:${relay.port}`;
});
afterEach(async () => relay.close());

const open = async (path = '/') => {
  const ws = new WebSocket(url + path);
  const got: string[] = [];
  ws.onmessage = (e) => got.push(String(e.data));
  await waitFor(() => ws.readyState === WebSocket.OPEN, 3000, 'socket open');
  return { ws, got };
};
/** A healthy host + controller pair in its own room still exchanges a command and its ack. */
async function healthy(code: string): Promise<void> {
  const h = await open();
  const c = await open();
  const hs = createStamper(code, 'h');
  const cs = createStamper(code, 'c');
  h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
  c.ws.send(JSON.stringify(cs({ kind: 'hello', role: 'controller' })));
  await waitFor(() => c.got.some((m) => m.includes('"peers"')), 3000, 'peers frame');
  c.ws.send(JSON.stringify(cs({ kind: 'command', body: { id: 'k1', issuedBy: 'c', type: 'setTarget', variable: 'hr', value: 80 } as never })));
  await waitFor(() => h.got.some((m) => m.includes('"k1"')), 3000, 'command reached the host');
  h.ws.close();
  c.ws.close();
}

describe('hostile relay input', () => {
  it('null, an array and a number on /signal are dropped; the next frame is routed', async () => {
    const r = await open('/signal?session=ABC234&peer=receiver');
    const s = await open('/signal?session=ABC234&peer=sender');
    for (const bad of ['null', '[1,2]', '42', '"x"']) s.ws.send(bad);
    s.ws.send(JSON.stringify({ to: 'receiver', data: 'sentinel' }));
    await waitFor(() => r.got.some((m) => m.includes('sentinel')), 3000, 'sentinel routed');
    await healthy('HQY234');
    expect(relay.stats().dropped).toBeGreaterThanOrEqual(4);
  });
  it('a frame over the payload cap closes that socket only', async () => {
    const bad = await open();
    bad.ws.send('x'.repeat(262_145));
    await waitFor(() => bad.ws.readyState === WebSocket.CLOSED, 3000, 'offender closed');
    await healthy('HRZ234');
  });
  it('a 12 000-deep hello is dropped and the same socket can still say a valid hello', async () => {
    const bad = await open();
    bad.ws.send(`{"v":1,"session":"ABC234","from":"p","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":${'{"x":'.repeat(12000)}0${'}'.repeat(12000)}}`);
    bad.ws.send(JSON.stringify(createStamper('ABC234', 'p')({ kind: 'hello', role: 'controller' })));
    await waitFor(() => bad.got.some((m) => m.includes('"peers"')), 3000, 'valid hello answered');
    await healthy('HMA234');
  });
  it("a pending instructor's own `grant` naming itself grants nothing: only the host's grant counts (plan P4)", async () => {
    const h = await open();
    const p = await open();
    const hs = createStamper('HGT234', 'h');
    const ps = createStamper('HGT234', 'ins-p.1');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    p.ws.send(JSON.stringify(ps({ kind: 'hello', role: 'instructor', pin: '4729' } as never)));
    await waitFor(() => h.got.some((m) => m.includes('"ins-p.1"')), 3000, 'instructor hello at the host');
    p.ws.send(JSON.stringify(ps({ kind: 'grant', to: 'ins-p.1', granted: true } as never)));
    p.ws.send(JSON.stringify(ps({ kind: 'command', body: { id: 'kp', issuedBy: 'x', type: 'time', action: 'pause' } as never })));
    await waitFor(() => p.got.some((m) => m.includes('"forbidden"')), 3000, 'forbidden');
    expect(h.got.some((m) => m.includes('"grant"') || m.includes('"kp"'))).toBe(false);
    await healthy('HGU234');
  });
  // R8b (plan room-and-instruments.md): what a hostile peer can do with the ventilator's message
  it('a `vent` as a first frame is a bad hello; an oversized or foreign `vent` body is dropped; the room keeps working', async () => {
    const first = await open();
    first.ws.send(JSON.stringify(createStamper('HVA234', 'v')({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: 1 } } as never)));
    await waitFor(() => first.ws.readyState === WebSocket.CLOSED, 3000, 'closed: bad hello');
    expect(first.got.some((m) => m.includes('"bad-hello"'))).toBe(true);
    const h = await open();
    const v = await open();
    const hs = createStamper('HVB234', 'h');
    const vs = createStamper('HVB234', 'vent-p.1');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    v.ws.send(JSON.stringify(vs({ kind: 'hello', role: 'ventilator', pin: '4729' } as never)));
    await waitFor(() => h.got.some((m) => m.includes('"vent-p.1"')), 3000, 'ventilator hello at the host');
    h.ws.send(JSON.stringify(hs({ kind: 'grant', to: 'vent-p.1', granted: true })));
    await waitFor(() => v.got.some((m) => m.includes('"grant"')), 3000, 'granted');
    const before = relay.stats().dropped;
    const frame = { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 };
    for (const body of [
      { v: 1, kind: 'settings', cfg: { note: 'x'.repeat(5000) } }, // over 4 KB
      { v: 1, kind: 'cmds', tick: 1, cmds: [{ id: 'k', issuedBy: 'x', type: 'setRhythm', rhythm: 'vf' }] }, // not a ventilator command
      { v: 1, kind: 'cmds', tick: 1, cmds: [{ id: 'k', issuedBy: 'x', type: 'externalDrive', source: 'ventilator', frame: { ...frame, samples: [1] } }] },
      { v: 1, kind: 'snapshot' },
    ])
      v.ws.send(JSON.stringify(vs({ kind: 'vent', body } as never)));
    v.ws.send(JSON.stringify(vs({ kind: 'vent', body: { v: 1, kind: 'cmds', tick: 2, cmds: [{ id: 'ok', issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame }] } } as never)));
    await waitFor(() => h.got.some((m) => m.includes('"ok"')), 3000, 'the valid vent at the host');
    expect(h.got.filter((m) => m.includes('"kind":"vent"'))).toHaveLength(1);
    expect(relay.stats().dropped - before).toBe(4);
    await healthy('HVC234');
  });
  // R5c (plan room-and-instruments.md): what a hostile defibrillator window can do with its two commands
  it("a `defib` socket's forged ack, grant, event and snapshot are dropped; a malformed charge is forbidden; the room keeps working", async () => {
    const h = await open();
    const d = await open();
    const hs = createStamper('HDA234', 'h');
    const ds = createStamper('HDA234', 'defib-p.1');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    d.ws.send(JSON.stringify(ds({ kind: 'hello', role: 'defib' } as never)));
    await waitFor(() => h.got.some((m) => m.includes('"defib-p.1"')), 3000, 'defib hello at the host');
    const before = relay.stats().dropped;
    d.ws.send(JSON.stringify(ds({ kind: 'ack', commandId: 'x', accepted: true, tick: 1 })));
    d.ws.send(JSON.stringify(ds({ kind: 'grant', to: 'defib-p.1', granted: true })));
    d.ws.send(JSON.stringify(ds({ kind: 'event', body: [{ type: 'state', t: 1, tick: 1, mode: 'manual', values: {}, control: {} }] } as never)));
    d.ws.send(JSON.stringify(ds({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } } as never)));
    await waitFor(() => relay.stats().dropped - before === 4, 3000, 'four frames dropped');
    for (const event of [null, 'charge', ['defib', 'charge'], { kind: 'defib', action: 'charge', energyJ: '360' }])
      d.ws.send(JSON.stringify(ds({ kind: 'command', body: { id: 'bad', issuedBy: 'x', type: 'applyEvent', event } } as never)));
    await waitFor(() => d.got.filter((m) => m.includes('"forbidden"')).length === 4, 3000, 'four forbidden');
    expect(h.got.some((m) => m.includes('"bad"') || m.includes('"kind":"ack"') || m.includes('"kind":"grant"'))).toBe(false);
    await healthy('HDB234');
  });
  // L3 (plan learner-action-remote.md §8 review focus 2): the device is never trusted. A learner remote's forged frames
  // are dropped; a mistyped preparation is dropped by the guard; a forged value on a well-typed one is `forbidden`
  it("a `learner` socket's forged grant, ack, event (its own `prep` news) and snapshot are dropped; forged preparations never reach the host", async () => {
    const h = await open();
    const l = await open();
    const hs = createStamper('HPA234', 'h');
    const ls = createStamper('HPA234', 'lrn-p.1');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    l.ws.send(JSON.stringify(ls({ kind: 'hello', role: 'learner', pin: '582913' } as never)));
    await waitFor(() => h.got.some((m) => m.includes('"lrn-p.1"')), 3000, 'learner hello at the host');
    h.ws.send(JSON.stringify(hs({ kind: 'grant', to: 'lrn-p.1', granted: true })));
    await waitFor(() => l.got.some((m) => m.includes('"grant"')), 3000, 'granted');
    const before = relay.stats().dropped;
    l.ws.send(JSON.stringify(ls({ kind: 'grant', to: 'lrn-p.1', granted: true })));
    l.ws.send(JSON.stringify(ls({ kind: 'ack', commandId: 'x', accepted: true, tick: 1 })));
    l.ws.send(JSON.stringify(ls({ kind: 'event', body: [{ type: 'prep', t: 1, to: 'lrn-p.1', body: { made: true } }] } as never)));
    l.ws.send(JSON.stringify(ls({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } } as never)));
    const prep = { id: 'p0000001', components: [{ productId: 'propofol', amount: 20, unit: 'mL' }] };
    for (const p of [{ ...prep, id: 'NOT-OURS' }, { ...prep, components: [{ productId: 'propofol', amount: -20, unit: 'mL' }] }, { ...prep, components: 'propofol' }])
      l.ws.send(JSON.stringify(ls({ kind: 'command', body: { id: 'bad', issuedBy: 'x', type: 'prep', action: 'stage', prep: p } } as never)));
    await waitFor(() => relay.stats().dropped - before === 7, 3000, 'seven frames dropped');
    for (const body of [
      { type: 'prep', action: 'stage', prep: { ...prep, concentration: { amount: 10, unit: 'mg', perMl: 1 } } },
      { type: 'prep', action: 'stage', prep, by: 'phone0001' },
      { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' }, by: 'phone0001' },
    ])
      l.ws.send(JSON.stringify(ls({ kind: 'command', body: { id: 'forged', issuedBy: 'x', ...body } } as never)));
    await waitFor(() => l.got.filter((m) => m.includes('"forbidden"')).length === 3, 3000, 'three forbidden');
    expect(h.got.some((m) => m.includes('"bad"') || m.includes('"forged"') || m.includes('"kind":"ack"') || m.includes('"type":"prep"'))).toBe(false);
    await healthy('HPB234');
  });
});

// PR #306, CI run 42350190627: room-qr-tab-guard's afterEach waited 90 s in relay.close(). close() waited for every
// HTTP connection to end, and Node stops its own request timeouts once a server closes, so a connection a client held
// (here: a request whose headers it never finished) kept close() waiting for as long as the client kept it open.
describe('close() ends every connection', () => {
  it('resolves at once while a client holds a request it never finished, and while a WebSocket is open', async () => {
    const r = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
    const half = connect(r.port, '127.0.0.1');
    await new Promise((ok) => half.once('connect', ok));
    half.write('GET /pme-relay.json HTTP/1.1\r\nHost: 127.0.0.1\r\n'); // no blank line: the request is never complete
    const ws = new WebSocket(`ws://127.0.0.1:${r.port}/`);
    await waitFor(() => ws.readyState === WebSocket.OPEN, 3000, 'socket open');
    await new Promise((ok) => setTimeout(ok, 100));
    const ended = new Promise((ok) => half.once('close', ok));
    const t0 = Date.now();
    const closed = await Promise.race([r.close().then(() => true), new Promise((ok) => setTimeout(() => ok(false), 3000))]);
    expect(closed, 'relay.close() resolved').toBe(true);
    expect(Date.now() - t0).toBeLessThan(1000);
    await ended; // the server ended the half-sent request's connection
    half.destroy();
  });
});
