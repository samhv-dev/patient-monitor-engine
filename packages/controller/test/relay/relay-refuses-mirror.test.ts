// FU-11 Task G1 (R50 F3): the relay refuses a host's `mirror` frames (the Ventilator view's samples); other events pass.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStamper } from '../../src/protocol.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
  url = `ws://127.0.0.1:${relay.port}`;
});
afterEach(async () => relay.close());

describe('no mirror frame crosses the relay', () => {
  it('a mirror commandApplied is dropped; a plain event is delivered', async () => {
    const open = async () => {
      const ws = new WebSocket(url);
      const got: string[] = [];
      ws.onmessage = (e) => got.push(String(e.data));
      await waitFor(() => ws.readyState === WebSocket.OPEN, 3000, 'open');
      return { ws, got };
    };
    const h = await open();
    const v = await open();
    const hs = createStamper('MRR234', 'h');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    v.ws.send(JSON.stringify(createStamper('MRR234', 'v')({ kind: 'hello', role: 'viewer' })));
    await waitFor(() => v.got.some((m) => m.includes('"peers"')), 3000, 'joined');
    const cmd = { id: 'f1', issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } };
    h.ws.send(JSON.stringify(hs({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'f1', tick: 9, resolved: { command: cmd, mirror: true } }] as never })));
    h.ws.send(JSON.stringify(hs({ kind: 'event', body: [{ type: 'scenario', t: 1, stateId: 'sentinel' }] as never })));
    await waitFor(() => v.got.some((m) => m.includes('sentinel')), 3000, 'sentinel');
    await sleep(50);
    expect(v.got.some((m) => m.includes('"mirror":true'))).toBe(false);
    h.ws.close();
    v.ws.close();
  });
});
