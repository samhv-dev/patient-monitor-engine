// FU-11 Task A2 (external review F01, browser audit BA10): one malformed peer never takes the relay down — `null` on the
// signalling socket, a frame over the payload cap, a deeply nested envelope; a healthy room keeps working after each.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
