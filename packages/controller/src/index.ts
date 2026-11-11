// @pme/controller public API (brief §7.5; R7). The relay (relay/) is Node-only and is not exported here.
export const version = '1.0.0-rc.5';
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
export type { RelayDevice, RelayFrame } from './transport/relay-frames.ts';
export { HostSession, INSTRUCTOR_REASONS, LEARNER_REASONS, STAGE_LEAD_TICKS, VENTILATOR_REASONS, type HostSessionOptions, type HostTarget, type ScenarioHook, type ScenarioHookResult } from './session/host-session.ts';
// Plan learner-action-remote.md L4: the host's preparations — what a remote may name as a container, the room temperature
// the stability rows are read at, and the bodies of the host's `prep` events (L7's tray, L9's instructor card)
export { PREP_CONTAINERS, PREP_TEMP_C, PREPS_PER_DEVICE, type InstructorPrepNews, type InstructorPrepView, type LearnerPrepNews, type LearnerPrepView, type PrepNewsKind } from './session/preparations.ts';
export { bolusDrugOf, givenByOf, lockReason, RecentGives, SAME_DRUG_LOCK_S, type DrugLock, type GivenBy } from './session/drug-lock.ts';
export { ControllerSession, describe, HOST_RESTARTED_REASON, NOT_CONFIRMED_REASON, type ControllerSessionOptions, type InstructorAccess, type LogEntry } from './session/controller-session.ts';
export { ViewerSync, type ViewerSyncOptions, type ViewerStatus, type ViewerTarget } from './session/viewer-sync.ts';
export * from './panel/controls.ts';
export { StageBuffer } from './panel/staging.ts';
export { RevealGesture, attachReveal, DEFAULT_REVEAL, type RevealOptions } from './panel/reveal.ts';
export { isTyping } from './panel/keys.ts';
export { renderControls, type ControlsHost, type ControlsView } from './panel/render-controls.ts';
export { mountInstructorPanel, type PanelHandle, type PanelOptions, type PanelTab, type PanelTabContext } from './panel/panel.ts';
export { mountRemote, type RemoteHandle, type RemoteOptions, type Via } from './remote/remote-app.ts';
// Scenario view + text only (no ajv): the runner, driver and validation are in '@pme/controller/scenario'.
export { ScenarioView, type NextTransition } from './scenario/view.ts';
export { describeWhen, describeTransition, manualLabel, type Labeller } from './scenario/describe.ts'; // Labeller
export type { ScenarioDoc, ScenarioState, Transition, When, DocCommand } from './scenario/types.ts';
// pme-scenario/2 (plan F1): a document of either format, and the test that tells them apart
export { asV1, isV2 } from './scenario/types.ts';
export type { AnyScenarioDoc } from './scenario/types.ts';
export type { ScenarioDocV2 } from './scenario/types-v2.ts';

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
// Plan learner-action-remote.md L1: the formulary layer's types, the source check and the loader (no file reading,
// no ajv: the bench is handed the parsed files; the schema and the folder checks run in CI)
export { checkFormulary, loadFormulary, injectableDrugIds, GAP_ID, TRISSEL_EDITION, MAX_STATEMENT, STOCK_FILE } from './formulary/load.ts';
export type * from './formulary/types.ts';
// Plan pump-rack-tci.md D12, S1: the reference pumps' device profiles (pump-devices/), their source check and loader
export { checkPumpDevices, loadPumpDevices, PUMP_DEVICE_IDS, MAX_DEVICE_TEXT } from './pump-devices.ts';
export type * from './pump-devices.ts';
// Plan learner-action-remote.md L5: the bench's Finding, which the /2 administration record's `prep` carries
export type { Finding, FindingKind } from './formulary/findings.ts';
// Plan learner-action-remote.md L7: the bench's preview on the learner's phone runs the host's own pure step (the host's
// answer, not this preview, is what the phone then shows as the concentration)
export { prepare, type Active, type Preparation, type PrepareResult } from './formulary/prepare.ts';
