// The Stage 4b device layer (brief §3.2 L3 "alarm engine, pacer and defibrillator"): one JSON-safe state object the
// engine keeps beside its pipeline state. The engine calls validate/apply for device commands and step() once per
// committed tick with the events that became due; the layer returns the events it adds (alarm, alarmStatus,
// marker, tone, deviceStatus). It changes the patient's signals only through the host (modifiers, rhythm, L1
// targets), never by editing L2.
import { uniform, type Sfc32State } from '../rng/sfc32.ts';
import type { AgeBand, DeviceClinicalEvent } from '../types-device.ts';
import type { Command, EngineEvent, ModifiersPatch, Ramp, RhythmId, RhythmOpts, StateVar } from '../types.ts';
import { buildConditions, createInputs, observeEvent, observeQrs, type AlarmInputs } from './alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, validateAlarmAction, type AlarmMgrState } from './alarms/manager.ts';
import { deviceProfile, skinBand } from './alarms/profile.ts';
import { afterShock, applyDefib, createDefib, FALLBACK_DEFIB, stepDefib, validateDefib, type DefibSpec, type DefibState } from './defib-pacer/defib.ts';
import { drawOutcome, shockClass, T_PEAK_WINDOW_S, type ShockOutcome } from './defib-pacer/outcome.ts';
import { applyPacer, createPacer, FALLBACK_PACER, tcpSpec, validatePacer, type PacerSpec, type PacerState } from './defib-pacer/pacer.ts';
import { createSyncState, SYNC_RATE, syncStep, type SyncState } from './defib-pacer/sync.ts';

/** Rhythms a monitor classifies as VF (research 03 §1.8). */
export const VF_RHYTHMS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine']);
/** Skin used when EngineOptions.device.skin is absent (the renderer's historical default, brief §3.8). */
export const DEFAULT_SKIN = 'philips-like';
/** Sync shock: delivered this long after the detected R (brief §6.5: on the next R within ≤ 60 ms) [ENG]. */
export const SYNC_DELAY_S = 0.02;
/** T peak ≈ R + 0.65 × QT (the kernel T peak sits ~⅔ into QT at normal rates) [ENG]. */
export const T_PEAK_QT_FRACTION = 0.65;
/** After a terminating shock: 1–5 s isoelectric, then 30–60 bpm accelerating over 10–60 s to ROSC_HR; pressure
 * targets ramp from 50 % to 100 % over 30–120 s (brief §6.5 "After successful termination"; the k_SV 0.2 → 1 ramp is
 * expressed through the MANUAL-mode sbp/dbp targets, which the Stage 2 M2 tracker follows) [ENG where not cited]. */
export const ISO_S = [1, 5] as const;
export const ROSC_START_BPM = [30, 60] as const;
export const ROSC_RAMP_S = [10, 60] as const;
export const ROSC_HR = 80;
export const ROSC_BP_RAMP_S = [30, 120] as const;
export const ROSC_BP_START = 0.5;
/** Cardioversion to sinus: a 1–2 s pause, then sinus at 75 bpm [ENG]. */
export const CARDIOVERSION_PAUSE_S = [1, 2] as const;
export const CARDIOVERSION_HR = 75;
const STATUS_EVERY_S = 1;

interface PendingRhythm {
  atS: number;
  id: RhythmId;
  opts: RhythmOpts;
  hrRamp?: { to: number; durationS: number };
  bpRampS?: number;
}

export interface DeviceState {
  alarms: AlarmMgrState;
  inputs: AlarmInputs;
  defib: DefibState;
  pacer: PacerState;
  sync: SyncState;
  pending: PendingRhythm | null;
  lastBeat: { t: number; qtMs: number } | null;
  tcpKey: string;
  /** defib/pacer fields of the last deviceStatus (JSON-safe), compared field by field. */
  statusLast: Array<number | string | boolean | null>;
  lastStatusT: number;
}

/** What the engine exposes to the device layer each tick (committed state only). */
export interface DeviceHost {
  simT: number;
  rhythmId: RhythmId;
  pulseless: boolean;
  spo2Probe: 'on' | 'off' | 'motion';
  leadsOff: boolean;
  /** First ECG sample index not yet committed. */
  committedN: number;
  /** One committed VCG sample (null when not held). */
  vcgAt(n: number): [number, number, number] | null;
  outcomeRng: Sfc32State;
  l1(v: StateVar): number;
  /** Mutate the committed modifiers (ECG artefacts, TCP) and invalidate the look-ahead. */
  setModifiers(patch: ModifiersPatch): void;
  setRhythm(id: RhythmId, opts: RhythmOpts): void;
  setHr(value: number, ramp?: Ramp): void;
  setL1(v: StateVar, value: number, ramp?: Ramp): void;
}

const defibSpec = (d: DeviceState): DefibSpec => d.alarms.profile.defib ?? FALLBACK_DEFIB;
const pacerSpec = (d: DeviceState): PacerSpec => d.alarms.profile.pacer ?? FALLBACK_PACER;

export function createDevice(skin: string | undefined, ageBand: 'adult' | 'paediatric' | 'neonatal' | undefined): DeviceState {
  const p = deviceProfile(skin ?? DEFAULT_SKIN, skinBand(ageBand));
  return {
    alarms: createAlarmMgr(p),
    inputs: createInputs(0),
    defib: createDefib(p.defib ?? FALLBACK_DEFIB),
    pacer: createPacer(p.pacer ?? FALLBACK_PACER),
    sync: createSyncState(0),
    pending: null,
    lastBeat: null,
    tcpKey: 'null',
    statusLast: [],
    lastStatusT: -1,
  };
}

/** A rejection reason, undefined (accepted) or null (not a device-layer command). */
export function validateDeviceCommand(d: DeviceState, cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    return ['on', 'off', 'motion'].includes(cmd.state) ? undefined : 'ecg state must be on, off or motion';
  }
  if (cmd.type === 'setTarget' && cmd.variable === 'paceThresholdMa') {
    // brief §6.5 capture threshold; PatientState.paceThresholdMa 10–200 mA (l1/state.ts schema)
    if (!(Number.isFinite(cmd.value) && cmd.value >= 10 && cmd.value <= 200)) return 'paceThresholdMa must be 10–200';
    return cmd.ramp && !(cmd.ramp.durationS >= 0 && cmd.ramp.durationS <= 900) ? 'ramp.durationS must be 0–900 s' : undefined;
  }
  if (cmd.type === 'applyEvent') {
    const ev = cmd.event as DeviceClinicalEvent | { kind: string };
    if (ev.kind === 'defib') return validateDefib(d.defib, ev as Extract<DeviceClinicalEvent, { kind: 'defib' }>);
    if (ev.kind === 'pacer') return validatePacer(ev as Extract<DeviceClinicalEvent, { kind: 'pacer' }>, pacerSpec(d));
    return null;
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
  if (cmd.type === 'setTarget' && cmd.variable === 'paceThresholdMa') {
    host.setL1('paceThresholdMa', cmd.value, cmd.ramp);
    return true;
  }
  if (cmd.type === 'applyEvent') {
    const ev = cmd.event as DeviceClinicalEvent | { kind: string };
    if (ev.kind === 'defib') {
      if (applyDefib(d.defib, ev as Extract<DeviceClinicalEvent, { kind: 'defib' }>, t, defibSpec(d), out) === 'shock') {
        deliverShock(d, host, host.committedN / SYNC_RATE, false, out);
      }
      return true;
    }
    if (ev.kind === 'pacer') {
      applyPacer(d.pacer, ev as Extract<DeviceClinicalEvent, { kind: 'pacer' }>);
      return true;
    }
    return false;
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

const between = (r: Sfc32State, range: readonly [number, number]): number => range[0] + (range[1] - range[0]) * uniform(r);

/** Deliver a shock at atS: ECG artefact on every lead, outcome (pre-selection or the table), markers and tone. */
function deliverShock(d: DeviceState, host: DeviceHost, atS: number, synced: boolean, out: EngineEvent[]): void {
  const t = host.simT;
  host.setModifiers({ artefact: { shock: { atS, energyJ: d.defib.energyJ } } });
  const lb = d.lastBeat;
  const onTPeak = lb !== null && Math.abs(atS - (lb.t + (T_PEAK_QT_FRACTION * lb.qtMs) / 1000)) <= T_PEAK_WINDOW_S;
  const cls = shockClass(host.rhythmId, host.pulseless);
  const rng = host.outcomeRng;
  let outcome: ShockOutcome | RhythmId;
  if (d.defib.preselect !== null) outcome = d.defib.preselect;
  else {
    const vfDurationS = d.inputs.vfSince === null ? 0 : t - d.inputs.vfSince;
    outcome = drawOutcome({ cls, synced, energyJ: d.defib.energyJ, defaultJ: defibSpec(d).energyAdultJ, vfDurationS, onTPeak }, rng);
  }
  d.pending = null;
  switch (outcome) {
    case 'unchanged':
      break;
    case 'vf':
      host.setRhythm('vfCoarse', {});
      break;
    case 'asystole':
      host.setRhythm('asystole', {});
      break;
    case 'pea':
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, ISO_S), id: 'sinus', opts: { rateBpm: Math.round(between(rng, ROSC_START_BPM)), pulseless: true } };
      break;
    case 'rosc':
      host.setRhythm('asystole', {});
      d.pending = {
        atS: atS + between(rng, ISO_S), id: 'sinus', opts: { rateBpm: Math.round(between(rng, ROSC_START_BPM)) },
        hrRamp: { to: ROSC_HR, durationS: between(rng, ROSC_RAMP_S) }, bpRampS: between(rng, ROSC_BP_RAMP_S),
      };
      break;
    case 'sinus':
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, CARDIOVERSION_PAUSE_S), id: 'sinus', opts: { rateBpm: CARDIOVERSION_HR } };
      break;
    default: // an instructor pre-selection (brief §6.5 "convert"): the chosen rhythm after the isoelectric pause
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, ISO_S), id: outcome, opts: {} };
  }
  afterShock(d.defib, t, atS, synced, outcome, out);
}

/** Whether the defibrillator/pacer fields of deviceStatus changed since the last one (field compare, no string or
 * object built: this runs every tick). Updates the remembered values. */
function statusChanged(d: DeviceState): boolean {
  const df = d.defib;
  const pc = d.pacer;
  const now = [df.energyJ, df.state, df.sync, df.readyAt, df.shocks, df.lastShock?.t ?? null, pc.mode, pc.ratePpm, pc.mA, pc.paused];
  let changed = d.statusLast.length !== now.length;
  for (let i = 0; i < now.length && !changed; i++) if (d.statusLast[i] !== now[i]) changed = true;
  if (changed) d.statusLast = now;
  return changed;
}

/** A committed QRS detection (R time, s). */
export function deviceOnQrs(d: DeviceState, tR: number): void {
  observeQrs(d.inputs, tR);
}

/**
 * One committed tick: observe the events that became due, run the defibrillator, pacer and sync detector on the
 * committed samples, then the alarm manager. Returns the due events the engine should still emit (raw L2
 * technical flags are replaced by the manager's own alarm events).
 */
export function stepDevice(d: DeviceState, host: DeviceHost, due: readonly EngineEvent[], out: EngineEvent[]): EngineEvent[] {
  const t = host.simT;
  const p = d.alarms.profile;
  const keep: EngineEvent[] = [];
  for (const e of due) {
    observeEvent(d.inputs, e);
    if (e.type === 'beat') d.lastBeat = { t: e.t, qtMs: e.qtMs };
    if (e.type === 'nibp' && e.result !== undefined && p.nibpDoneTone) out.push({ type: 'tone', t: e.t, id: `nibp-done-${Math.round(e.t * 1000)}`, kind: 'nibpDone' });
    if (e.type === 'alarm' && e.level === undefined) continue;
    keep.push(e);
  }
  // defibrillator: charge → ready → auto-disarm; post-shock rhythm onset
  stepDefib(d.defib, t, defibSpec(d), out);
  const pend = d.pending;
  if (pend && t >= pend.atS) {
    d.pending = null;
    host.setRhythm(pend.id, pend.opts);
    if (pend.hrRamp) host.setHr(pend.hrRamp.to, { durationS: pend.hrRamp.durationS, curve: 'linear' });
    if (pend.bpRampS !== undefined) {
      for (const v of ['sbp', 'dbp'] as const) {
        const target = host.l1(v);
        host.setL1(v, target * ROSC_BP_START);
        host.setL1(v, target, { durationS: pend.bpRampS, curve: 'linear' });
      }
    }
  }
  // sync detector on the committed samples: markers while SYNC is on, the armed shock on the next R
  for (const r of syncStep(d.sync, host.committedN - 1, host.vcgAt)) {
    if (!d.defib.sync) continue;
    const tR = r.r / SYNC_RATE;
    out.push({ type: 'marker', t: tR, kind: 'syncR' });
    if (d.defib.syncArmed && d.defib.state === 'ready') deliverShock(d, host, Math.max(tR + SYNC_DELAY_S, host.committedN / SYNC_RATE), true, out);
  }
  // pacer → Modifiers.tcp (threshold from PatientState.paceThresholdMa, brief §6.5)
  const tcp = d.pacer.mode === 'off' ? null : tcpSpec(d.pacer, pacerSpec(d), host.l1('paceThresholdMa'), host.leadsOff);
  // a plain string key, not JSON: this runs every tick (the 24 h CI runs are near their time budget)
  const key = tcp === null ? 'null' : `${tcp.mode}|${tcp.ratePpm}|${tcp.mA}|${tcp.thresholdMa}`;
  if (key !== d.tcpKey) {
    d.tcpKey = key;
    host.setModifiers({ tcp });
  }
  // alarms
  const inp = d.inputs;
  const vf = VF_RHYTHMS.has(host.rhythmId);
  if (vf && inp.vfSince === null) inp.vfSince = t;
  if (!vf) inp.vfSince = null;
  inp.spo2Probe = host.spo2Probe;
  inp.pacing = d.pacer.mode !== 'off';
  stepAlarms(d.alarms, t, buildConditions(d.alarms, inp, t), out);
  // device status on change and at 1 Hz
  const df = d.defib;
  const pc = d.pacer;
  if (statusChanged(d) || t - d.lastStatusT >= STATUS_EVERY_S - 1e-9) {
    d.lastStatusT = t;
    out.push({
      type: 'deviceStatus', t,
      defib: { energyJ: df.energyJ, state: df.state, sync: df.sync, readyAt: df.readyAt, shocks: df.shocks, lastShock: df.lastShock },
      pacer: { mode: pc.mode, ratePpm: pc.ratePpm, mA: pc.mA, paused: pc.paused },
      hrDashes: p.hrDashesWhilePacing && pc.mode !== 'off',
    });
  }
  return keep;
}
