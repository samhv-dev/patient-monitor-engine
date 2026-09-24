// URL conventions shared by the three Stage 6a pages:
//   ?session=ABC234   the session code (the host makes one when absent)
//   ?via=bc|relay|rtc how a remote/viewer connects (default bc = BroadcastChannel, same browser)
//   ?relay=ws://…     relay URL (default ws://<this host>:8787/); the host joins the relay only when present
import {
  createBroadcastChannelTransport,
  createRelaySignaling,
  createWebRtcTransport,
  createWebSocketTransport,
  HOST_SIGNAL_ID,
  newPeerId,
  type ManagedTransport,
  type Via,
} from '@pme/controller';

export const params = new URLSearchParams(location.search);
export const relayUrl = (): string => params.get('relay') ?? `ws://${location.hostname || 'localhost'}:8787/`;
export const viaParam = (): Via => ({ relay: 'websocket', rtc: 'webrtc' })[params.get('via') ?? ''] as Via ?? 'broadcastChannel';
export const viaToParam: Record<Via, string> = { broadcastChannel: 'bc', websocket: 'relay', webrtc: 'rtc' };

export function connect(session: string, via: Via): ManagedTransport {
  if (via === 'websocket') return createWebSocketTransport({ url: relayUrl() });
  if (via === 'webrtc') {
    const signaling = createRelaySignaling({ url: relayUrl(), session, peerId: newPeerId('rtc') });
    return createWebRtcTransport({ signaling, remoteId: HOST_SIGNAL_ID, initiator: true });
  }
  return createBroadcastChannelTransport(session);
}

export const epochNow = (): number => performance.timeOrigin + performance.now();
