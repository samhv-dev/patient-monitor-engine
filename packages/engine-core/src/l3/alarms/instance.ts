// A device's own alarm instance (docs/plans/defibrillator-zoll-m2.md §3.1 C3, piece E7a; owner's ruling DQ3 = A): the
// room's defibrillator is its own monitor, so silencing it does not silence the bedside monitor, and the reverse. The
// instance is the bedside monitor's pair of plain states — an AlarmMgrState (profile, configuration, pending, active,
// silence, pause) and its own AlarmInputs — run by the SAME rules (manager.ts, conditions.ts): there is one
// implementation of the alarm life cycle, and the device layer holds two states for it.
//
// What differs is only where its output goes. The bedside monitor's life cycle is published as `alarm` and
// `alarmStatus` events, and every consumer (the renderer's alarm bar, the audio's alarm voice, the event log, the
// record, the validation series) reads those as the bedside monitor's. An owned instance publishes NEITHER: its whole
// visible state is its owner's status block (deviceStatus.m2.alarm), so no consumer can take one instance's alarm for
// the other's.
//
// Until the owner's piece gives it a profile (E7b, the M2's), the instance is idle: no profile, no conditions, the idle
// block. Who feeds its inputs (its own sensors, the same patient) is the owner's piece too (E7b, E8a, E8b).
import type { M2Status } from '../../types-device.ts';
import type { AlarmDeviceAction } from '../../types-device.ts';
import type { EngineEvent } from '../../types.ts';
import { buildConditions, createInputs, type AlarmInputs } from './conditions.ts';
import { alarmStatus, applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, validateAlarmAction, type AlarmMgrState } from './manager.ts';
import type { DeviceProfile } from './profile.ts';

/** The devices that can own an alarm instance besides the bedside monitor. */
export type AlarmOwner = 'defib';

export interface AlarmInstance {
  /** The life-cycle state under the owner's profile; null = idle (no profile yet). */
  alarms: AlarmMgrState | null;
  /** The instance's own view of the patient (its own sensors). */
  inputs: AlarmInputs;
}

/** The events an owned instance's life cycle makes are dropped here (see the header); reused, emptied after each call. */
const SINK: EngineEvent[] = [];

/** A new instance, idle until its owner gives it a profile. */
export function createAlarmInstance(t: number): AlarmInstance {
  return { alarms: null, inputs: createInputs(t) };
}

/** Give the instance a profile, or a new one at a patient-type change, as a skin switch does for the bedside monitor. */
export function setInstanceProfile(inst: AlarmInstance, p: DeviceProfile, t: number): void {
  if (inst.alarms) setProfile(inst.alarms, p, t, SINK);
  else inst.alarms = createAlarmMgr(p);
  SINK.length = 0;
}

/** A refusal for an alarm action on this instance, or undefined (the bedside monitor's validation). */
export function validateInstanceAction(inst: AlarmInstance, a: AlarmDeviceAction): string | undefined {
  return inst.alarms ? validateAlarmAction(inst.alarms, a) : 'this device has no alarm profile yet';
}

/** Apply a validated alarm action to this instance alone. */
export function applyInstanceAction(inst: AlarmInstance, a: AlarmDeviceAction, t: number): void {
  if (!inst.alarms) return;
  applyAlarmAction(inst.alarms, a, t, SINK);
  SINK.length = 0;
}

/** One committed tick of the instance, true when its visible state changed (its owner's status is then due). */
export function stepInstance(inst: AlarmInstance, t: number): boolean {
  if (!inst.alarms) return false;
  const changed = stepAlarms(inst.alarms, t, buildConditions(inst.alarms, inst.inputs, t), SINK);
  SINK.length = 0;
  return changed;
}

/** The idle block (E0's): nothing active, no limits, audio on. */
const idleBlock = (): M2Status['alarm'] => ({ audio: 'on', alarmsOff: false, untilS: null, active: [], limits: {} });

/**
 * The owner's published block from the instance. The mapping of the manager's silence and pause onto the M2's audio
 * paused and alarms off is a choice until E7b builds the M2's Alarm Control on it [ENG: device; choice until E7b]:
 * audio 'paused' while a silence runs; alarms off while a pause runs (the manager's pause stops every alarm); untilS
 * the end of whichever runs.
 */
export function instanceBlock(inst: AlarmInstance, t: number): M2Status['alarm'] {
  if (!inst.alarms) return idleBlock();
  const s = alarmStatus(inst.alarms, t);
  return { audio: s.silencedUntil !== null ? 'paused' : 'on', alarmsOff: s.pausedUntil !== null, untilS: s.silencedUntil ?? s.pausedUntil, active: s.active, limits: s.limits };
}
