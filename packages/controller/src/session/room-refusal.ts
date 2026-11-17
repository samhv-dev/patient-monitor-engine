// Room setup's settings that would remove or replace a device in use: the host's words for each refusal. The pump rack's
// are pump-host.ts rackRefusal; these are the defibrillator's model and the depth-of-anaesthesia device's.
import type { DeviceEvent } from '@pme/engine-core';
import { list } from './pump-host.ts';

export type DefibStatus = Extract<DeviceEvent, { type: 'deviceStatus' }>;

export const ROOM_REFUSALS = {
  charging: 'The defibrillator is charging: disarm it first.',
  charged: 'The defibrillator is charged: disarm it first.',
  pacing: 'The pacer is pacing: stop it first.',
  switchedOn: 'The defibrillator is switched on: turn it off first.',
  depthWord: 'Depth of anaesthesia window',
  here: 'on this computer',
  remote: 'on a phone or tablet',
  depth: (names: readonly string[]): string =>
    names.length === 1
      ? `The ${ROOM_REFUSALS.depthWord} ${names[0]} is reading the EEG: close it first.`
      : `${names.length} ${ROOM_REFUSALS.depthWord}s are reading the EEG (${list(names)}): close them first.`,
};

/**
 * Why the defibrillator's model cannot change now, from its last status, or null: off or idle. A new model disarms a
 * charged device and starts the model's own state afresh (a switched-on device goes off, its AED cycle ends), so each
 * of these is the clinician's to end first; a charge is named before the pacer, the pacer before the power.
 */
export function defibRefusal(s: DefibStatus | null): string | null {
  if (s?.defib?.state === 'charging') return ROOM_REFUSALS.charging;
  if (s?.defib?.state === 'ready') return ROOM_REFUSALS.charged;
  if (s?.pacer && s.pacer.mode !== 'off') return ROOM_REFUSALS.pacing;
  if (s?.m2 && s.m2.power.selector !== 'off') return ROOM_REFUSALS.switchedOn;
  return null;
}

/** One depth window attached now: the name Room setup gave its device, or null, and whether it is on this computer. */
export interface DepthWindow {
  name: string | null;
  local: boolean;
}

/** Why the depth device cannot be switched off or replaced now, naming each window reading it, or null: none attached. */
export function depthRefusal(windows: readonly DepthWindow[]): string | null {
  if (windows.length === 0) return null;
  return ROOM_REFUSALS.depth(windows.map((w) => (w.name !== null ? `"${w.name}"` : w.local ? ROOM_REFUSALS.here : ROOM_REFUSALS.remote)));
}
