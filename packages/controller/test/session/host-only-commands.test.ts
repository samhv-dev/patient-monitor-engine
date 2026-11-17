// A ventilator's record (`deviceState`) is written by the host's own ventilator link only: no peer of any role makes
// the engine store one, and what leaves the host for a follower carries the patient alone.
import { withoutDevices } from '@pme/engine-core';
import { afterEach, describe, expect, it } from 'vitest';
import { parseWireMessage } from '../../src/guard.ts';
import { createStamper, HOST_ONLY_REASON, type WireMessage } from '../../src/protocol.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HST234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

const record = { id: 'r1', issuedBy: 'ventilator', type: 'deviceState', source: 'ventilator', state: { v: 1, planted: true } };

function setup() {
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const peer = hub.connect();
  const got = collect(peer);
  const stamp = createStamper(S, 'peer-1');
  const of = <K extends WireMessage['kind']>(k: K) => got.filter((m) => m.kind === k) as Array<Extract<WireMessage, { kind: K }>>;
  return { host, peer, stamp, of };
}
const devicesOf = (s: { state: unknown }) => (s.state as { devices?: unknown }).devices;

describe('deviceState from a peer', () => {
  it.each([['a peer that said no hello'], ['a controller']])('%s: it never reaches the engine', async (who) => {
    const { host, peer, stamp, of } = setup();
    if (who === 'a controller') peer.send(stamp({ kind: 'hello', role: 'controller' }));
    peer.send(stamp({ kind: 'command', body: record as never }));
    peer.send(stamp({ kind: 'command', body: { id: 'k2', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 90 } as never }));
    await waitFor(() => of('ack').some((a) => a.commandId === 'k2'));
    expect(of('ack').map((a) => a.commandId)).toEqual(['k2']);
    expect(devicesOf(host.engine.snapshot())).toBeUndefined();
  });

  it('HostSession refuses it with its reason even when a transport hands it over unguarded', async () => {
    const host = manualHost();
    const sent: WireMessage[] = [];
    let deliver: (m: WireMessage) => void = () => {};
    hs = new HostSession({ session: S, target: host, stateIntervalMs: 0 });
    hs.addTransport({
      kind: 'broadcastChannel', send: (m: WireMessage) => void sent.push(m), close() {}, status: 'open',
      onMessage: (fn: (m: WireMessage) => void) => ((deliver = fn), () => {}), onStatus: () => () => {},
    } as never);
    deliver(createStamper(S, 'peer-1')({ kind: 'command', body: record as never }));
    await waitFor(() => sent.some((m) => m.kind === 'ack'));
    expect(sent.find((m) => m.kind === 'ack')).toMatchObject({ accepted: false, reason: HOST_ONLY_REASON });
    expect(devicesOf(host.engine.snapshot())).toBeUndefined();
  });

  it('the wire guard drops it, from any sender over the relay', () => {
    const m = createStamper(S, 'phone-1')({ kind: 'command', body: record as never });
    expect(parseWireMessage(JSON.stringify(m))).toBeNull();
  });
});

describe("the host's snapshot to a follower", () => {
  it('carries no ventilator record: byte-identical to the snapshot of an engine that holds none', async () => {
    const { host, peer, stamp, of } = setup();
    host.engine.dispatch(record as never);
    expect(devicesOf(host.engine.snapshot())).toBeDefined();
    peer.send(stamp({ kind: 'hello', role: 'viewer' }));
    await waitFor(() => of('snapshot').length === 1);
    const sent = of('snapshot')[0]!.body;
    expect(devicesOf(sent)).toBeUndefined();
    host.engine.dispatch({ ...record, state: null } as never);
    expect(JSON.stringify(sent)).toBe(JSON.stringify(withoutDevices(host.engine.snapshot())));
    expect(JSON.stringify(sent)).toBe(JSON.stringify(host.engine.snapshot()));
  });
});
