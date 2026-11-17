import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManagedTransport, WireMessage } from '../../src/protocol.ts';
import type { TransportBase } from '../../src/transport/base.ts';
import { channelName, createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { collect, waitFor } from '../helpers.ts';
import { runTransportConformance } from './conformance.ts';

let n = 0;
runTransportConformance('broadcastChannel', async () => {
  const session = `TEST${String(++n).padStart(2, '2')}`; // a fresh channel per test
  const a = createBroadcastChannelTransport(session);
  const b = createBroadcastChannelTransport(session);
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});

describe('a link that closes, or a page hidden for good, says farewell for each id it sent as', () => {
  const hello = (from: string) => ({ v: 1, session: 'LEFT22', from, seq: 1, sentAt: 0, kind: 'hello', role: 'viewer' }) as WireMessage;
  afterEach(() => void vi.unstubAllGlobals());
  /** A link and every peer-left and farewell it raises. */
  const listen = (t: ManagedTransport) => {
    const said = { farewell: [] as string[], peerLeft: [] as string[] };
    t.onFarewell?.((id) => void said.farewell.push(id));
    t.onPeerLeft?.((id) => void said.peerLeft.push(id));
    return said;
  };

  it('close(): the other links hear a farewell for the ids it sent, never a peer-left; one that sent nothing says nothing', async () => {
    const a = createBroadcastChannelTransport('LEFT22');
    const b = createBroadcastChannelTransport('LEFT22');
    const quiet = createBroadcastChannelTransport('LEFT22');
    const said = listen(b);
    const heard = collect(b);
    a.send(hello('view-a'));
    await waitFor(() => heard.length === 1, 2000, 'the hello');
    quiet.close();
    a.close();
    await waitFor(() => said.farewell.length === 1, 2000, 'the farewell');
    expect(said).toEqual({ farewell: ['view-a'], peerLeft: [] });
    b.close();
  });

  it('pagehide: the same', async () => {
    let hide: (() => void) | null = null;
    vi.stubGlobal('addEventListener', (type: string, fn: () => void) => void (type === 'pagehide' && (hide = fn)));
    vi.stubGlobal('removeEventListener', () => undefined);
    const a = createBroadcastChannelTransport('LEFT23');
    const b = createBroadcastChannelTransport('LEFT23');
    const said = listen(b);
    a.send(hello('view-p'));
    (hide as unknown as () => void)();
    a.close();
    await waitFor(() => said.farewell.length > 0, 2000, 'the farewell');
    expect(said).toEqual({ farewell: ['view-p'], peerLeft: [] });
    b.close();
  });

  it('every other relay-shaped frame, and a peer-left without a string id, is rejected and counted as before', async () => {
    const b = createBroadcastChannelTransport('LEFT24');
    const said = listen(b);
    const heard = collect(b);
    const raw = new BroadcastChannel(channelName('LEFT24'));
    for (const f of [{ relay: 'peers', hostOnline: true, peers: 1 }, { relay: 'error', code: 'denied', message: 'x' }, { relay: 'peer-left', id: 7 }, { relay: 'peer-left' }]) raw.postMessage(f);
    raw.postMessage({ relay: 'peer-left', id: 'view-z' }); // the last one: the four before it have been handled once it is heard
    await waitFor(() => said.farewell.length === 1, 2000, 'the farewell');
    expect((b as TransportBase).rejected).toBe(4);
    expect(said).toEqual({ farewell: ['view-z'], peerLeft: [] });
    expect(heard).toEqual([]);
    raw.close();
    b.close();
  });
});
