// @pme/controller public API (brief §7.5; R7). The relay (relay/) is Node-only and is not exported here.
export const version = '0.0.0';
export * from './protocol.ts';
export * from './guard.ts';
export * from './vocabulary.ts';
export { createInProcessHub, type InProcessHub } from './transport/in-process.ts';
export { createPostMessageTransport, windowEndpoint, type PostEndpoint } from './transport/post-message.ts';
export { createBroadcastChannelTransport, channelName } from './transport/broadcast-channel.ts';
export { createWebSocketTransport, type WebSocketTransportOptions } from './transport/websocket.ts';
export {
  acceptWebRtcPeers,
  createRelaySignaling,
  createWebRtcTransport,
  HOST_SIGNAL_ID,
  type Signaling,
  type WebRtcOptions,
} from './transport/webrtc.ts';
export { backoffDelay, DEFAULT_BACKOFF, type BackoffOptions } from './transport/backoff.ts';
export type { RelayFrame } from './transport/relay-frames.ts';
export { HostSession, STAGE_LEAD_TICKS, type HostSessionOptions, type HostTarget, type ScenarioHook } from './session/host-session.ts';
export { ControllerSession, describe, type ControllerSessionOptions, type LogEntry } from './session/controller-session.ts';
export { ViewerSync, type ViewerSyncOptions, type ViewerStatus, type ViewerTarget } from './session/viewer-sync.ts';
export * from './panel/controls.ts';
export { StageBuffer } from './panel/staging.ts';
export { RevealGesture, attachReveal, DEFAULT_REVEAL, type RevealOptions } from './panel/reveal.ts';
export { renderControls, type ControlsHost, type ControlsView } from './panel/render-controls.ts';
export { mountInstructorPanel, type PanelHandle, type PanelOptions } from './panel/panel.ts';
export { mountRemote, type RemoteHandle, type RemoteOptions, type Via } from './remote/remote-app.ts';

import { createBroadcastChannelTransport } from './transport/broadcast-channel.ts';
import { createInProcessHub } from './transport/in-process.ts';
import { createPostMessageTransport } from './transport/post-message.ts';
import { createWebRtcTransport } from './transport/webrtc.ts';
import { createWebSocketTransport } from './transport/websocket.ts';
/** The five adapters under one object, the shape the IIFE's `PatientMonitor.transports` will take. */
export const transports = {
  inProcess: createInProcessHub,
  postMessage: createPostMessageTransport,
  broadcastChannel: createBroadcastChannelTransport,
  websocket: createWebSocketTransport,
  webrtc: createWebRtcTransport,
};
