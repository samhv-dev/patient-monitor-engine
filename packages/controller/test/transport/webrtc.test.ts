// WebRTC transport with an in-memory RTCPeerConnection, signalled through the REAL relay /signal endpoint.
import { describe, expect, it } from 'vitest';
import { acceptWebRtcPeers, createRelaySignaling, createWebRtcTransport, HOST_SIGNAL_ID } from '../../src/transport/webrtc.ts';
import type { ManagedTransport } from '../../src/protocol.ts';
import { startRelay } from '../../relay/server.ts';
import { FakePeerConnection } from '../fakes/fake-rtc.ts';
import { waitFor, waitStatus } from '../helpers.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('webrtc', async () => {
  const relay = await startRelay({ port: 0, host: '127.0.0.1' });
  const url = `ws://127.0.0.1:${relay.port}`;
  const hostSig = createRelaySignaling({ url, session: 'ABC234', peerId: HOST_SIGNAL_ID });
  const peerSig = createRelaySignaling({ url, session: 'ABC234', peerId: 'ctl-1' });
  let a: ManagedTransport | null = null;
  const stop = acceptWebRtcPeers({ signaling: hostSig, onTransport: (t) => (a = t), RTCPeerConnectionImpl: FakePeerConnection });
  await new Promise((r) => setTimeout(r, 50)); // both signalling sockets connected
  const b = createWebRtcTransport({ signaling: peerSig, remoteId: HOST_SIGNAL_ID, initiator: true, RTCPeerConnectionImpl: FakePeerConnection });
  await waitFor(() => a !== null, 2000, 'host side transport');
  return {
    a: a as unknown as ManagedTransport,
    b,
    cleanup: async () => {
      stop();
      b.close();
      hostSig.close();
      peerSig.close();
      await relay.close();
    },
  };
});

describe('WebRTC reconnect', () => {
  it('the initiator re-offers after the channel dies and the host accepts a fresh transport', async () => {
    const relay = await startRelay({ port: 0, host: '127.0.0.1' });
    const url = `ws://127.0.0.1:${relay.port}`;
    const hostSig = createRelaySignaling({ url, session: 'RTC234', peerId: HOST_SIGNAL_ID });
    const peerSig = createRelaySignaling({ url, session: 'RTC234', peerId: 'view-9' });
    const accepted: ManagedTransport[] = [];
    const stop = acceptWebRtcPeers({ signaling: hostSig, onTransport: (t) => accepted.push(t), RTCPeerConnectionImpl: FakePeerConnection });
    await new Promise((r) => setTimeout(r, 50));
    const b = createWebRtcTransport({ signaling: peerSig, remoteId: HOST_SIGNAL_ID, initiator: true, RTCPeerConnectionImpl: FakePeerConnection, backoff: { baseMs: 10, maxMs: 50, jitter: 0 } });
    await waitStatus(b, 'open');
    b.dropForTest();
    await waitFor(() => accepted.length === 2 && accepted[1]!.status === 'open', 3000, 'second accept');
    await waitStatus(b, 'open');
    expect(accepted[0]!.status).toBe('closed');
    stop();
    b.close();
    hostSig.close();
    peerSig.close();
    await relay.close();
  });
});
