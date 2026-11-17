import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WireMessage } from '../../src/protocol.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { collect, waitFor } from '../helpers.ts';
import { runTransportConformance } from './conformance.ts';

let n = 0;
runTransportConformance('broadcastChannel', async () => {
  const session = `TEST${String(++n).padStart(2, '2')}`; // a fresh channel per test
  const a = createBroadcastChannelTransport(session);
  const b = createBroadcastChannelTransport(session);
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});

describe('a link that closes, or a page that is hidden for good, says each id it sent as left', () => {
  const hello = (from: string) => ({ v: 1, session: 'LEFT22', from, seq: 1, sentAt: 0, kind: 'hello', role: 'viewer' }) as WireMessage;
  afterEach(() => void vi.unstubAllGlobals());

  it('close(): the other links hear `peer-left` for the ids it sent; one that sent nothing says nothing', async () => {
    const a = createBroadcastChannelTransport('LEFT22');
    const b = createBroadcastChannelTransport('LEFT22');
    const quiet = createBroadcastChannelTransport('LEFT22');
    const left: string[] = [];
    b.onPeerLeft?.((id) => void left.push(id));
    const heard = collect(b);
    a.send(hello('view-a'));
    await waitFor(() => heard.length === 1, 2000, 'the hello');
    quiet.close();
    a.close();
    await waitFor(() => left.length === 1, 2000, 'the leave');
    expect(left).toEqual(['view-a']);
    b.close();
  });

  it('pagehide: the same', async () => {
    let hide: (() => void) | null = null;
    vi.stubGlobal('addEventListener', (type: string, fn: () => void) => void (type === 'pagehide' && (hide = fn)));
    vi.stubGlobal('removeEventListener', () => undefined);
    const a = createBroadcastChannelTransport('LEFT22');
    const b = createBroadcastChannelTransport('LEFT22');
    const left: string[] = [];
    b.onPeerLeft?.((id) => void left.push(id));
    a.send(hello('view-p'));
    (hide as unknown as () => void)();
    a.close();
    await waitFor(() => left.length > 0, 2000, 'the leave');
    expect(left).toEqual(['view-p']);
    b.close();
  });
});
