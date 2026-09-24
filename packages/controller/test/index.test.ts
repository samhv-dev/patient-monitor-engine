import { describe, expect, it } from 'vitest';
import * as api from '../src/index.ts';

describe('@pme/controller public API', () => {
  it('exports the five transports under brief §7.5 names, sessions, panel and remote', () => {
    expect(Object.keys(api.transports).sort()).toEqual(['broadcastChannel', 'inProcess', 'postMessage', 'webrtc', 'websocket']);
    for (const name of [
      'createInProcessHub', 'createPostMessageTransport', 'createBroadcastChannelTransport', 'createWebSocketTransport',
      'createWebRtcTransport', 'acceptWebRtcPeers', 'createRelaySignaling', 'HostSession', 'ControllerSession', 'ViewerSync',
      'mountInstructorPanel', 'mountRemote', 'vocabularyOf', 'newSessionCode', 'parseWireMessage', 'assertWireSafe',
    ] as const) expect(typeof api[name], name).toBe('function');
    expect(api.version).toBe('0.0.0');
  });
});
