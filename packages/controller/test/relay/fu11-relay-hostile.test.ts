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

describe('FU-11 A2: hostile relay input', () => {
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
});
