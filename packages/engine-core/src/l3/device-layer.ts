// The Stage 4b device layer (brief §3.2 L3 "alarm engine, pacer and defibrillator"): one JSON-safe state object the
// engine keeps beside its pipeline state. The engine calls validate/apply for device commands and step() once per
// committed tick with the events that became due; the layer returns the events it adds (alarm, alarmStatus, …).
// It changes the patient's signals only through the host (modifiers, rhythm, L1 targets), never by editing L2.
import type { AgeBand } from '../types-device.ts';
import type { Command, EngineEvent, RhythmId } from '../types.ts';
import { buildConditions, createInputs, observeEvent, observeQrs, type AlarmInputs } from './alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, validateAlarmAction, type AlarmMgrState } from './alarms/manager.ts';
import { deviceProfile, skinBand } from './alarms/profile.ts';

/** Rhythms a monitor classifies as VF (research 03 §1.8). */
export const VF_RHYTHMS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine']);
/** Skin used when EngineOptions.device.skin is absent (the renderer's historical default, brief §3.8). */
export const DEFAULT_SKIN = 'philips-like';

export interface DeviceState {
  alarms: AlarmMgrState;
  inputs: AlarmInputs;
}

/** What the engine exposes to the device layer each tick (committed state only). */
export interface DeviceHost {
  simT: number;
  rhythmId: RhythmId;
  spo2Probe: 'on' | 'off' | 'motion';
  /** Mutate the committed modifiers (ECG artefacts, TCP) and invalidate the look-ahead. */
  setModifiers(patch: import('../types.ts').ModifiersPatch): void;
}

export function createDevice(skin: string | undefined, ageBand: 'adult' | 'paediatric' | 'neonatal' | undefined): DeviceState {
  return { alarms: createAlarmMgr(deviceProfile(skin ?? DEFAULT_SKIN, skinBand(ageBand))), inputs: createInputs(0) };
}

/** A rejection reason, undefined (accepted) or null (not a device-layer command). */
export function validateDeviceCommand(d: DeviceState, cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    return ['on', 'off', 'motion'].includes(cmd.state) ? undefined : 'ecg state must be on, off or motion';
  }
  if (cmd.type !== 'device') return null;
  const a = cmd.action;
  if (a.device === 'alarm') return validateAlarmAction(d.alarms, a);
  if (a.device === 'monitor') {
    if (a.action === 'skin') {
      try {
        deviceProfile(a.value, d.alarms.profile.ageBand);
        return undefined;
      } catch {
        return `unknown skin ${a.value}`;
      }
    }
    if (a.action === 'ageBand') return ['adult', 'paed', 'neo', 'paediatric', 'neonatal'].includes(a.value) ? undefined : 'ageBand must be adult, paed or neo';
    return `unknown monitor action ${String((a as { action: string }).action)}`;
  }
  return null;
}

/** Apply a validated device command at sim time t. Returns true when it was one. */
export function applyDeviceCommand(d: DeviceState, cmd: Command, host: DeviceHost, out: EngineEvent[]): boolean {
  const t = host.simT;
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    // brief §6.2: ecg off → flat dashed trace + LEADS OFF INOP (no asystole); motion → electrode motion artefact [ENG 0.5]
    host.setModifiers({ artefact: { leadOff: cmd.state === 'off', motion: cmd.state === 'motion' ? 0.5 : 0 } });
    if (cmd.state !== 'off') d.inputs.ecgOnSince = t;
    return true;
  }
  if (cmd.type !== 'device') return false;
  const a = cmd.action;
  if (a.device === 'alarm') {
    applyAlarmAction(d.alarms, a, t, out);
    return true;
  }
  if (a.device === 'monitor') {
    const band: AgeBand = a.action === 'ageBand' ? skinBand(a.value as 'adult') : d.alarms.profile.ageBand;
    const skin = a.action === 'skin' ? a.value : d.alarms.profile.skin;
    setProfile(d.alarms, deviceProfile(skin, band), t, out);
    return true;
  }
  return false;
}

/** A committed QRS detection (R time, s). */
export function deviceOnQrs(d: DeviceState, tR: number): void {
  observeQrs(d.inputs, tR);
}

/**
 * One committed tick: observe the events that became due, then run the alarm manager. Returns the due events the
 * engine should still emit (raw L2 technical flags are replaced by the manager's own alarm events).
 */
export function stepDevice(d: DeviceState, host: DeviceHost, due: readonly EngineEvent[], out: EngineEvent[]): EngineEvent[] {
  const t = host.simT;
  const keep: EngineEvent[] = [];
  for (const e of due) {
    observeEvent(d.inputs, e);
    if (e.type === 'alarm' && e.level === undefined) continue;
    keep.push(e);
  }
  const inp = d.inputs;
  const vf = VF_RHYTHMS.has(host.rhythmId);
  if (vf && inp.vfSince === null) inp.vfSince = t;
  if (!vf) inp.vfSince = null;
  inp.spo2Probe = host.spo2Probe;
  stepAlarms(d.alarms, t, buildConditions(d.alarms, inp, t), out);
  return keep;
}
