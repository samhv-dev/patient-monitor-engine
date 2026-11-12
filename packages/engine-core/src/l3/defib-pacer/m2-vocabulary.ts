// The ZOLL M2 as a defibrillator model (docs/plans/defibrillator-zoll-m2.md, piece E0): the limits its Operator's Guide
// states, and the frozen command vocabulary and status every later piece fills. Pages are the guide's printed pages,
// [G n-m] (ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C, December 2021). Nothing here acts yet: each command is
// validated and is a no-op until the piece named in M2_COMMANDS gives it its behaviour; the status carries its idle
// values. A value the guide does not give is a marked placeholder ([ENG: device; placeholder …]) with the owner's open
// question (DQ) that will set it.
import type { M2Config, M2Connections, M2Settings, M2Status } from '../../types-device.ts';
import type { DefibSpec } from './defib.ts';
import { M2_LEADS } from './m2.ts';
import type { PacerSpec } from './pacer.ts';

/** The model's name in its refusals. */
export const M2_NAME = 'ZOLL M2';
/** Every M2 command on a room whose model is not the M2. */
export const NOT_M2 = "the room's defibrillator is not a ZOLL M2";

/** Energy selections, J [G A-2] (checked on the page image). The list stops at 200 J. */
export const M2_ENERGIES_J: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200];
/** Default Shock 1/2/3 energies of the auto escalation, J [G 14-4]; after the third, every shock at the third [G 12-6]. */
export const M2_ESCALATION_J = { adult: [120, 150, 200], pediatric: [50, 70, 85] } as const;
/** The AED's preconfigured Shock 1/2/3 energies, J [G 12-6] (and [G 12-3]). */
export const M2_AED_SEQUENCE_J = { adult: [120, 150, 200], pediatric: [50, 70, 85] } as const;
/** Pacer rate in 2 ppm steps [G 16-4], [G 1-11]; output in 2 mA steps [G 16-5], 8 mA lowest [G A-10], 0 mA = paused [G 1-11]. */
export const M2_PACER_GRID = { ratePpm: 2, mA: 2, mAMin: 8 } as const;

/**
 * The defibrillator block. Energies 120 J adult and 50 J paediatric, Shock 1 [G 14-4]; the AED's adult sequence
 * [G 12-6]. Charge time: the guide gives only bounds ("less than 7 seconds" to 200 J [G A-2]), so the 7 s / 200 J rule
 * stays (chargeTimeS null) until E1/E9b [ENG: device; placeholder, the bound used as the time]. Ready time-out: "15 to 60
 * seconds (depending on configuration)" [G 14-13] [ENG: device; placeholder 60 s until DQ17].
 */
export const ZOLL_M2_DEFIB: DefibSpec = { energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: [120, 150, 200], chargeTimeS: null, readyTimeoutS: 60, toneSet: 'zoll-like' };
/**
 * The pacer block: 70 ppm default [G 16-4]; 30–180 ppm [G A-10]; output starts at 0 mA [G 16-5] and runs to 140 mA
 * [G A-10] in 2 mA steps [G 16-5]; Demand at activation [G 16-2]. 4:1 is E6's (plan row P6): no pause rate yet.
 */
export const ZOLL_M2_PACER: PacerSpec = { rateDefault: 70, rateRange: [30, 180], mADefault: 0, mARange: [0, 140], mAStep: { up: 2, down: 2 }, modeDefault: 'demand', pausePct: null };

/** "1–10, 15, 20, …": a list with its consecutive runs folded. */
function listText(xs: readonly number[]): string {
  const out: string[] = [];
  for (let i = 0; i < xs.length; ) {
    let j = i;
    while (j + 1 < xs.length && (xs[j + 1] as number) === (xs[j] as number) + 1) j++;
    out.push(j - i >= 2 ? `${xs[i]}–${xs[j]}` : xs.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

/** The refusal for an energy not in a model's list, or undefined. */
export function energyReason(energyJ: number | undefined, list: readonly number[], name: string): string | undefined {
  if (energyJ !== undefined && list.includes(energyJ)) return undefined;
  return `${String(energyJ)} J is not a ${name} energy (${listText(list)} J)`;
}

/** The refusal for a pacer rate or output off the model's grid, or undefined. */
export function pacerGridReason(ev: { ratePpm?: number; mA?: number }, grid: { ratePpm: number; mA: number; mAMin: number }, spec: PacerSpec, name: string): string | undefined {
  const [r0, r1] = spec.rateRange;
  if (ev.ratePpm !== undefined && (ev.ratePpm - r0) % grid.ratePpm !== 0) return `ratePpm must be ${r0}–${r1} in steps of ${grid.ratePpm} on the ${name}`;
  const m1 = spec.mARange[1];
  if (ev.mA !== undefined && ev.mA !== 0 && (ev.mA < grid.mAMin || (ev.mA - grid.mAMin) % grid.mA !== 0)) return `mA must be 0 or ${grid.mAMin}–${m1} in steps of ${grid.mA} on the ${name}`;
  return undefined;
}

// --- validators ----------------------------------------------------------------------------------------------------
type Check = (v: unknown) => string | undefined;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = (what: string, xs: readonly unknown[]): Check => (v) => (xs.includes(v) ? undefined : `${what} must be ${xs.map(String).join(', ')}`);
const bool = (what: string): Check => (v) => (typeof v === 'boolean' ? undefined : `${what} must be true or false`);
const whole = (what: string, lo: number, hi: number): Check => (v) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? undefined : `${what} must be a whole number ${lo}–${hi}`);
const within = (what: string, lo: number, hi: number): Check => (v) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? undefined : `${what} must be ${lo}–${hi}`);
const text = (what: string, lo: number, hi: number): Check => (v) => (typeof v === 'string' && v.length >= lo && v.length <= hi ? undefined : `${what} must be text of ${lo}–${hi} characters`);
const PHASE = oneOf('phase', ['down', 'up']);
const CONTACT = oneOf('contact', ['good', 'poor', 'off']);
const triple: Check = (v) => (Array.isArray(v) && v.length === 3 && v.every((j) => M2_ENERGIES_J.includes(j as number)) ? undefined : `each level must be three ${M2_NAME} energies (${listText(M2_ENERGIES_J)} J)`);
const BY_TYPE: Check = (v) => record('energies', { adult: triple, pediatric: triple }, true)(v);

/** An object with exactly the listed fields (all of them when `all`), each checked; unknown or inherited names refused. */
function record(what: string, fields: Readonly<Record<string, Check>>, all: boolean, need = 1): Check {
  return (v) => {
    if (!isObj(v)) return `${what} must be an object`;
    const keys = Object.keys(v);
    for (const k of keys) if (!Object.hasOwn(fields, k)) return `${what}: unknown field ${k}`;
    if (all) for (const k of Object.keys(fields)) if (!Object.hasOwn(v, k)) return `${what}: ${k} is missing`;
    if (keys.length < need) return `${what} must name at least one field`;
    for (const k of keys) {
      const r = (fields[k] as Check)(v[k]);
      if (r) return `${what}.${k}: ${r}`;
    }
    return undefined;
  };
}

/** The M2's patient alarm parameters (appendix C: ΔT [G C-1], BR [G C-2], EtCO2, FiCO2, HR [G C-5], NIBP [G C-6],
 * [G C-7], PR, RR, SpO2 [G C-8], T1, T2 [G C-9]), in LIMIT_KEYS' names where one exists. */
export const M2_LIMIT_KEYS: readonly string[] = ['HR', 'PR', 'SpO2', 'NIBP_S', 'NIBP_D', 'NIBP_M', 'EtCO2', 'FiCO2', 'BR', 'RR', 'T1', 'T2', 'dT'];
const limitSide = (what: string): Check => (v) => (v === null || (typeof v === 'number' && Number.isFinite(v)) ? undefined : `${what} must be a number or null`);
const LIMIT = record('alarmLimit', { param: oneOf('param', M2_LIMIT_KEYS), low: limitSide('low'), high: limitSide('high'), enabled: bool('enabled') }, false, 2);
const alarmLimit: Check = (v) => {
  const r = LIMIT(v);
  if (r) return r;
  const o = v as { low?: number | null; high?: number | null };
  if (typeof o.low === 'number' && typeof o.high === 'number' && !(o.low < o.high)) return 'alarmLimit: low must be below high';
  return isObj(v) && Object.hasOwn(v, 'param') ? undefined : 'alarmLimit: param is missing';
};

const PADS = record('pads', { type: oneOf('type', ['adult', 'adultCpr', 'pediatric']), placement: oneOf('placement', ['apexSternum', 'anteriorPosterior']), contact: CONTACT }, true);
const CONNECTIONS = record('connect', {
  mfc: bool('mfc'),
  therapy: oneOf('therapy', ['none', 'pads', 'externalPaddles', 'internalHandles', 'testPlug']),
  pads: PADS,
  paddles: record('paddles', { pediPlates: bool('pediPlates'), shockButtons: bool('shockButtons'), contact: CONTACT }, true),
  internal: record('internal', { dischargeButton: bool('dischargeButton'), contact: CONTACT }, true),
  ecgCable: oneOf('ecgCable', ['none', '3', '5', '12']),
  ecgLeadsOff: bool('ecgLeadsOff'),
  spo2: bool('spo2'), nibp: bool('nibp'), co2: bool('co2'), temp1: bool('temp1'), temp2: bool('temp2'),
} satisfies Record<keyof M2Connections, Check>, false);

/** NIBP Auto intervals, min [G 8-9]. */
export const M2_NIBP_INTERVALS_MIN: readonly number[] = [2.5, 5, 10, 15, 20, 30, 45, 60, 90, 120];
const SETTINGS = record('setting', {
  nibpMode: oneOf('nibpMode', ['manual', 'auto', 'stat']),
  nibpIntervalMin: oneOf('nibpIntervalMin', M2_NIBP_INTERVALS_MIN),
  spo2Averaging: oneOf('spo2Averaging', ['low', 'medium', 'high']),
  ecgFilterHz: oneOf('ecgFilterHz', [20, 40]),
  paceMarker: bool('paceMarker'),
  respImpedance: bool('respImpedance'),
} satisfies Record<keyof M2Settings, Check>, false);

/** The top trace's sources (E1, m2.ts M2_LEADS) [G 6-7], [G 2-13]. */
const LEAD = oneOf('lead', M2_LEADS);
const CONFIG = record('config', {
  startMode: oneOf('startMode', ['manual', 'aed']),
  readyTimeoutS: whole('readyTimeoutS', 15, 60), // [G 14-13]; whole seconds [ENG: device; placeholder, the step is not given]
  escalation: record('escalation', { on: bool('on'), adult: triple, pediatric: triple }, true),
  aedEnergies: BY_TYPE,
  cprAtStart: bool('cprAtStart'),
  cprPeriodS: whole('cprPeriodS', 30, 600), // [ENG: device; placeholder bounds, the guide gives the 120 s default only (G-CFG)]
  cprTargetDepthCm: within('cprTargetDepthCm', 1.9, 7.6), // the sensor's depth range [G A-10]
  metronome: record('metronome', { mode: oneOf('mode', ['always', 'compressions']), ratePerMin: whole('ratePerMin', 50, 150) }, true), // rate: the sensor's rate range [G A-10] [ENG: device; placeholder bounds]
  aedPassword: (v) => (v === null ? undefined : text('aedPassword', 1, 16)(v)), // [ENG: device; placeholder length]
  checkPatientPause: bool('checkPatientPause'),
  nibpIntervalMin: oneOf('nibpIntervalMin', M2_NIBP_INTERVALS_MIN), // [G 8-9]
  trendIntervalS: whole('trendIntervalS', 30, 1800), // 30 s to 30 min [G 4-1]
  accessories: record('accessories', { pads: bool('pads'), externalPaddles: bool('externalPaddles'), internalHandles: bool('internalHandles') }, true),
  syncAfterShock: bool('syncAfterShock'), // [G 14-16], [G 1-16] (E1)
  topLead: record('topLead', { monitor: LEAD, manual: LEAD }, true), // [G 6-7] (E1)
} satisfies Record<keyof M2Config, Check>, false);

/**
 * The frozen vocabulary: every `device defib <action>` of plan §5.1 and §5.4 besides `model`, its validation, and the
 * piece that gives it behaviour. Energy select, Charge, Disarm and Sync are `applyEvent defib` (validated against
 * M2_ENERGIES_J on this model); pacer mode, rate and output are `applyEvent pacer set` (on M2_PACER_GRID).
 */
export const M2_COMMANDS: Readonly<Record<string, { piece: string; shape: string; validate: Check }>> = {
  selector: { piece: 'E1', shape: "'off' | 'monitor' | 'defib' | 'pacer'", validate: oneOf('selector', ['off', 'monitor', 'defib', 'pacer']) },
  patientType: { piece: 'E1', shape: "'adult' | 'pediatric'", validate: oneOf('patientType', ['adult', 'pediatric']) },
  lead: { piece: 'E1 (E8a: the sources each cable offers)', shape: "'pads' | 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' | 'V1'–'V6'", validate: LEAD },
  defibMode: { piece: 'E5', shape: "{ mode: 'manual' | 'aed', password?: string }", validate: (v) => record('defibMode', { mode: oneOf('mode', ['manual', 'aed']), password: text('password', 1, 16) }, false)(v) ?? (Object.hasOwn(v as object, 'mode') ? undefined : 'defibMode: mode is missing') },
  shockButton: { piece: 'E1 (panel), E2a (paddles, internal)', shape: "{ phase: 'down' | 'up', button: 'panel' | 'apex' | 'sternum' | 'internal' }", validate: record('shockButton', { phase: PHASE, button: oneOf('button', ['panel', 'apex', 'sternum', 'internal']) }, true) },
  analyze: { piece: 'E4, E5', shape: '(no value)', validate: (v) => (v === undefined ? undefined : 'analyze takes no value') },
  fourToOne: { piece: 'E6', shape: "{ phase: 'down' | 'up' }", validate: record('fourToOne', { phase: PHASE }, true) },
  // heldMs: on release, the wall-clock hold (the sim clock can pause or be scaled while the key is held)
  alarmControl: { piece: 'E7b', shape: "{ phase: 'down' | 'up', heldMs?: number }", validate: (v) => record('alarmControl', { phase: PHASE, heldMs: within('heldMs', 0, 3_600_000) }, false)(v) ?? (Object.hasOwn(v as object, 'phase') ? undefined : 'alarmControl: phase is missing') },
  alarmLimit: { piece: 'E7b', shape: '{ param: M2_LIMIT_KEYS, low?: number | null, high?: number | null, enabled?: boolean }', validate: alarmLimit },
  nibp: { piece: 'E8b', shape: "'press'", validate: oneOf('nibp', ['press']) },
  co2: { piece: 'E8b', shape: "'on' | 'off' | 'zero'", validate: oneOf('co2', ['on', 'off', 'zero']) },
  codeMarker: { piece: 'E9a', shape: '{ label: string (1–64) }', validate: record('codeMarker', { label: text('label', 1, 64) }, true) }, // [ENG: device; placeholder length]
  print: { piece: 'E9a', shape: "'press'", validate: oneOf('print', ['press']) },
  connect: { piece: 'E2a (E7b: channels)', shape: 'Partial<M2Connections>', validate: CONNECTIONS },
  setting: { piece: 'E8a, E8b', shape: 'Partial<M2Settings>', validate: SETTINGS },
  config: { piece: 'E1, E5, R4', shape: 'Partial<M2Config>', validate: CONFIG },
};

/** Validate one `device defib <action>` other than `model`: unknown name, not an M2 room, or its own check. */
export function validateM2Command(action: string, value: unknown, isM2: boolean): string | undefined {
  if (!Object.hasOwn(M2_COMMANDS, action)) return `unknown defib action ${action}`;
  if (!isM2) return NOT_M2;
  return (M2_COMMANDS[action] as { validate: Check }).validate(value);
}

// --- state and status ----------------------------------------------------------------------------------------------
/** The M2's device state: its status, with the configuration's password kept (never published). */
export type M2State = Omit<M2Status, 'config'> & { config: M2Config };

const IDLE_CONFIG: M2Config = {
  startMode: 'manual', // DQ4 = C, default Manual (owner, 12 November); a Room setup choice
  readyTimeoutS: 60, // DQ17 (owner, 12 November): 60 s, the value chapter 1 names [G 1-13]; configurable 15–60 s [G 14-13]
  escalation: { on: true, adult: [120, 150, 200], pediatric: [50, 70, 85] }, // levels [G 14-4]; on: DQ18 (owner, 12 November)
  aedEnergies: { adult: [120, 150, 200], pediatric: [50, 70, 85] }, // [G 12-6]
  cprAtStart: false, // the default starts with analysis [G 12-6] (DQ19)
  cprPeriodS: 120, // [G 12-9]
  cprTargetDepthCm: 5, // [G 12-9]
  metronome: { mode: 'always', ratePerMin: 105 }, // [G 12-9], [G A-10] (DQ26)
  aedPassword: null, // [ENG: device; placeholder until DQ20]
  checkPatientPause: false, // [ENG: device; placeholder until DQ24]
  nibpIntervalMin: 30, // [G 8-9]
  trendIntervalS: 30, // [G 4-1]
  accessories: { pads: true, externalPaddles: true, internalHandles: false }, // DQ11 = A (owner, 12 November)
  syncAfterShock: false, // "Unless otherwise configured, the unit automatically exits Sync mode after each shock" [G 14-16]
  topLead: { monitor: 'II', manual: 'pads' }, // [G 6-7]
};

const IDLE: M2State = {
  // the selector at DEFIB: the window has always been on and Manual Defib is what it does today [ENG: device; choice until E1]
  power: { selector: 'defib', offSinceS: null, ac: true, battery: { level: 5, state: 'ok' }, selfTest: 'none' }, // ac and battery [ENG: device; placeholder until E9b, DQ14]
  defibMode: 'manual',
  patientType: 'adult', // [ENG: device; choice until E1, which reads the patient]
  topLead: 'pads', // Manual Defib's default top trace is Pads/Paddles [G 6-7]
  escalation: { next: 1, on: true },
  held: { panel: false, apex: false, sternum: false, internal: false, fourToOne: false, alarmControl: false },
  aed: { phase: 'idle', verdict: null, untilS: null, shockIndex: 1 },
  cpr: { depthCm: null, ratePerMin: null, periodEndsS: null, metronome: false },
  pacerResume: { mA: null, untilS: null },
  messages: [],
  alarm: { audio: 'on', alarmsOff: false, untilS: null, active: [], limits: {} },
  channels: { ecg: false, pads: false, spo2: false, nibp: false, co2: false, resp: false, temp1: false, temp2: false },
  nibp: { running: false },
  co2: 'off',
  printing: false,
  lastCodeMarker: null,
  lastDelivery: null,
  // pads on, good contact, so E2a's gates refuse nothing a room does today [ENG: device; choice, for E2a to revisit]
  connections: {
    mfc: true, therapy: 'pads',
    pads: { type: 'adult', placement: 'apexSternum', contact: 'good' },
    paddles: { pediPlates: false, shockButtons: true, contact: 'off' },
    internal: { dischargeButton: true, contact: 'off' },
    ecgCable: 'none', ecgLeadsOff: false, spo2: false, nibp: false, co2: false, temp1: false, temp2: false, // [ENG: device; placeholder until E2a, E7b]
  },
  settings: {
    nibpMode: 'manual', // [ENG: device; placeholder until E8b]
    nibpIntervalMin: 30, // [G 8-9]
    spo2Averaging: 'medium', // configurable [G A-5], factory value not given [ENG: device; placeholder until E8b]
    ecgFilterHz: 20, // [G A-2]
    paceMarker: true, // [ENG: device; placeholder until E8a]
    respImpedance: false, // [G 7-2]
  },
  config: IDLE_CONFIG,
};

export function createM2State(): M2State {
  return structuredClone(IDLE);
}

/** The published status: the state, the password replaced by whether one is set. */
export function m2Status(s: M2State): M2Status {
  return structuredClone({ ...s, config: { ...s.config, aedPassword: s.config.aedPassword !== null } });
}

/** The status of a freshly created M2. */
export const M2_IDLE_STATUS: M2Status = m2Status(IDLE);
