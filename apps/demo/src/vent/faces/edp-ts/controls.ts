// The EDP-TS face's control table (plan vent-skin-edp-ts.md §3, piece V1): EVERY control the face draws, what it does to
// the model, or why it does nothing yet. The plan's test (1) walks this table (controls.test.ts): a live setting or
// limit must write cfg keys and change the delivered breath or an alarm; a face action must change the knob's state; an
// unavailable control must name its reason and its gap-table row. A later piece turns a control on by changing its
// entry and adding the binding here, not by redrawing the face (face.ts draws from this table).
// Settings are in the DEVICE's units (research/57 §6) and pure (`read(cfg)`, `write(v, cfg) → patch`, `range(cfg)`), so
// the same setting edits the live cfg or the draft of a mode not started yet (research/57 O-15).
import type { VentConfig } from '@pme/ventilator';
import { onStep } from '../../core/pending.ts';
import type { Range, Setting } from '../../core/types.ts';
import { dec, L, num, S, type ReasonId, type WordId } from './data.ts';

type Cfg = Readonly<VentConfig>;
/** What a control can do in a configuration: set, show without setting (I:E outside PCV, research/57 T-16), or nothing yet. */
export type CtlState = 'live' | 'shown' | { reason: ReasonId };

const r = (lo: unknown, hi: unknown, st: unknown): Range => [num(lo), num(hi), num(st)];
const ceilTo = (v: number, st: number) => onStep(Math.ceil(v / st - 1e-9) * st, st);
const floorTo = (v: number, st: number) => onStep(Math.floor(v / st + 1e-9) * st, st);
const L2mL = (v: number) => Math.round(v * 1e6) / 1e3; // 0.41 L → 410 mL without a binary tail

/** The face's mode name for the model's mode (the frame carries it, plan §4.3 coupling 1). */
export type FaceMode = 'VCV' | 'PCV' | 'PRVC' | 'simPSV' | 'simPAV';
export const faceMode = (c: Cfg): FaceMode => (c.mode === 'VC' ? 'VCV' : c.mode === 'PC' ? 'PCV' : c.mode === 'PRVC' ? 'PRVC' : c.mode === 'PSV' ? 'simPSV' : 'simPAV');
const isSim = (c: Cfg) => c.mode === 'PSV' || c.mode === 'PAV';

/** The set I:E on the knob's axis u: 1:E is u = 1 − E, I:1 is u = I − 1 (1:1 is 0; one step is 0.1 of either side). */
export const ieOfU = (u: number): [number, number] => (u >= 0 ? [1 + u, 1] : [1, 1 - u]);
const uOfRatio = (ti: number, te: number) => (ti >= te ? ti / te - 1 : 1 - te / ti);
export const formatIe = (u: number): string => {
  const [i, e] = ieOfU(onStep(u, 0.1));
  return `${i.toFixed(dec('ie'))}:${e.toFixed(dec('ie'))}`.replace(/^1\.0:/, '1:').replace(/:1\.0$/, ':1');
};
/** The set Ti as the device counts it beside I:E: VC's pause is part of inspiration (research/57 R-08). */
const setTi = (c: Cfg) => c.itime + (c.mode === 'VC' ? c.pause : 0);

export interface SettingCtl extends Setting {
  id: string;
  word: WordId;
  unit(c: Cfg): WordId | null;
  /** The value as the key prints it; null for an icon key (Rise Time, Flow Waveform: research/57 T-23, R-35). */
  format(v: number, c: Cfg): string | null;
  /** Ctrl's steps per knob detent: a number from the note (Oxygen: 10, H-22), or a reason (a "*" row whose step size the manual does not give, O-05). */
  ctrl?: number | ReasonId;
  /** Why the knob stops at an end of the range, when the device would go on (f at 4, plan GP4; Descending, GP13). */
  ends?: { lo?: ReasonId; hi?: ReasonId };
  /** Touched again while selected (Sens: flow ↔ pressure triggering, research/57 O-06). */
  again?(c: Cfg): Partial<VentConfig>;
  gap: string;
}

const ti = (c: Cfg) => c.itime;
export const SETTINGS: Record<string, SettingCtl> = {
  vt: {
    id: 'vt', word: 'vt', gap: 'GP1', unit: () => 'uL', ctrl: 'ctrlGap',
    range: () => r(S.vt.min, S.vt.max, S.vt.step),
    read: (c) => (c.mode === 'PRVC' ? c.prvcTarget : c.vt) / 1000,
    // VC's VT and PRVC's target are one setting on this device: both are written, so a mode change keeps it
    write: (v) => ({ vt: L2mL(v), prvcTarget: L2mL(v) }),
    format: (v) => v.toFixed(dec('vt')),
  },
  ti: {
    id: 'ti', word: 'ti', gap: 'GP2', unit: () => 'uS', ctrl: 'ctrlGap',
    range: () => r(S.ti.min, S.ti.max, S.ti.step),
    read: ti,
    // In VC the model's Ti is VT / flow: the face's settle() turns this set Ti into vcFlow = 60 · VT / Ti (plan GM1)
    write: (v) => ({ itime: v }),
    format: (v) => v.toFixed(dec('ti')),
  },
  ie: {
    id: 'ie', word: 'ie', gap: 'GP3', unit: () => null,
    range: (c) => {
      const T = 60 / c.rate;
      const lo = num(S.ie.min), hi = num(S.ie.max), st = num(S.ie.step);
      const tiMin = num(S.ti.min), tiMax = num(S.ti.max);
      const uLo = T > tiMin ? Math.max(lo, uOfRatio(tiMin, T - tiMin)) : hi;
      const uHi = T > tiMax ? Math.min(hi, uOfRatio(tiMax, T - tiMax)) : hi;
      return [ceilTo(uLo, st), floorTo(uHi, st), st];
    },
    read: (c) => uOfRatio(setTi(c), Math.max(1e-6, 60 / c.rate - setTi(c))),
    // research/57 T-16: setting I:E adjusts Ti to the rate; Ti on its own step (0.01 s, T-09)
    write: (u, c) => {
      const [i, e] = ieOfU(u);
      return { itime: onStep((60 / c.rate) * (i / (i + e)), num(S.ti.step)) };
    },
    format: (u) => formatIe(u),
  },
  f: {
    id: 'f', word: 'f', gap: 'GP4', unit: () => 'uBpm', ctrl: 'ctrlGap', ends: { lo: 'rate4' },
    // The device allows 1 bpm (T-17); the model's phase logic floors the rate at 4 (plan GP4) until V6
    range: () => [4, num(S.f.max), num(S.f.step)],
    read: (c) => c.rate,
    write: (v) => ({ rate: v }),
    format: (v) => v.toFixed(dec('f')),
  },
  pcv: {
    id: 'pcv', word: 'pcv', gap: 'GP5', unit: () => 'uCmH2O',
    // research/57 T-05: PCV + PEEP from 2 to 100
    range: (c) => [Math.max(num(S.pcv.min), num(S.pcv.sumMin) - c.peep), num(S.pcv.sumMax) - c.peep, num(S.pcv.step)],
    read: (c) => c.pc,
    write: (v) => ({ pc: v }),
    format: (v) => v.toFixed(dec('pcv')),
  },
  psv: {
    id: 'psv', word: 'psv', gap: 'GP6', unit: () => 'uCmH2O',
    range: (c) => [Math.max(0, num(S.psv.sumMin) - c.peep), num(S.psv.sumMax) - c.peep, num(S.psv.step)],
    read: (c) => c.ps,
    write: (v) => ({ ps: v }),
    format: (v) => v.toFixed(dec('psv')),
  },
  expSens: {
    id: 'expSens', word: 'expSens', gap: 'GP7', unit: () => 'uPct',
    range: () => r(S.expSens.min, S.expSens.max, S.expSens.step),
    read: (c) => c.cycleOff,
    write: (v) => ({ cycleOff: v }),
    format: (v) => v.toFixed(dec('expSens')),
  },
  peep: {
    id: 'peep', word: 'peep', gap: 'GP8', unit: () => 'uCmH2O',
    range: () => r(S.peep.min, S.peep.max, S.peep.step),
    read: (c) => c.peep,
    write: (v) => ({ peep: v }),
    format: (v) => v.toFixed(dec('peep')),
  },
  sens: {
    id: 'sens', word: 'sens', gap: 'GP9', unit: (c) => (c.trigType === 'flow' ? 'uLmin' : 'uCmH2O'),
    range: (c) => (c.trigType === 'flow' ? r(S.sensFlow.min, S.sensFlow.max, S.sensFlow.step) : r(S.sensPres.min, S.sensPres.max, S.sensPres.step)),
    read: (c) => (c.trigType === 'flow' ? c.flowTrig : c.presTrig),
    write: (v, c) => (c.trigType === 'flow' ? { flowTrig: v } : { presTrig: v }),
    format: (v, c) => v.toFixed(c.trigType === 'flow' ? dec('sensFlow') : dec('sensPres')),
    again: (c) => ({ trigType: c.trigType === 'flow' ? 'pressure' : 'flow' }),
  },
  oxygen: {
    id: 'oxygen', word: 'oxygen', gap: 'GP10', unit: () => 'uPct', ctrl: num(S.oxygen.ctrlStep),
    range: () => r(S.oxygen.min, S.oxygen.max, S.oxygen.step),
    read: (c) => c.fio2,
    write: (v) => ({ fio2: v }),
    format: (v) => v.toFixed(dec('oxygen')),
  },
  riseTime: {
    id: 'riseTime', word: 'riseTime', gap: 'GP11', unit: () => null,
    range: () => r(S.riseTime.min, S.riseTime.max, S.riseTime.step),
    read: (c) => c.riseTime,
    write: (v) => ({ riseTime: v }),
    format: () => null,
  },
  flowWaveform: {
    // Constant only until V2 builds the device's ramp to zero (plan GP12, GP13); 0 = constant
    id: 'flowWaveform', word: 'flowWaveform', gap: 'GP12', unit: () => null, ends: { hi: 'descending' },
    range: () => [0, 0, 1],
    read: () => 0,
    write: () => ({ flowPattern: 'square' }),
    format: () => null,
  },
  pause: {
    // Menu → Ventilatory adjuncts → Inspiratory pause, VCV only (research/57 T-28; plan GP14)
    id: 'pause', word: 'inspPause', gap: 'GP14', unit: (c) => (c.pause > 0 ? 'uS' : null),
    range: () => r(S.pause.min, S.pause.max, S.pause.step),
    read: (c) => c.pause,
    write: (v) => ({ pause: v }),
    format: (v) => (v > 0 ? v.toFixed(dec('pause')) : null),
  },
  sound: {
    // Menu → Tools → Settings → Sound: the alarm volume, 25 to 100 % in steps of 25, never off (research/57 E-10; plan
    // GP25). A face setting: the model makes no sound; the tones' gain follows it (tones.ts)
    id: 'sound', word: 'sound', gap: 'GP25', unit: () => 'uPct',
    range: () => r(S.sound.min, S.sound.max, S.sound.step),
    read: (c) => c.alarmVolume ?? num(S.sound.init),
    write: (v) => ({ alarmVolume: v }),
    format: (v) => v.toFixed(dec('sound')),
  },
};
/** Settings reached through a window only, never a bottom-row key. */
const WINDOW_ONLY = new Set(['pause', 'sound']);

/** The bottom row of each mode, left to right (research/57 D-01 VCV, D-02 PCV, D-12 PRVC; D-03 for a scenario's PSV). */
export const ROWS: Record<FaceMode, string[]> = {
  VCV: ['vt', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'flowWaveform'],
  PCV: ['pcv', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'riseTime'],
  PRVC: ['vt', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'riseTime'],
  simPSV: ['psv', 'expSens', 'peep', 'sens', 'oxygen', 'riseTime'],
  simPAV: ['psv', 'expSens', 'peep', 'sens', 'oxygen', 'riseTime'],
};

/** A setting's state in a configuration: what the device's mode offers (research/57 D-01, D-02, D-12, T-16, T-28). */
export function settingState(id: string, c: Cfg): CtlState {
  if (id === 'sound') return 'live'; // a device setting, in every mode
  if (isSim(c)) return { reason: 'simMode' };
  if (id === 'pause') return c.mode === 'VC' ? 'live' : { reason: 'vcvOnly' };
  if (!ROWS[faceMode(c)].includes(id)) return { reason: 'v2' }; // PSV and Exp. Sensitiv. belong to PSV/CPAP (GM3)
  if (id === 'ie') return c.mode === 'PC' ? 'live' : 'shown';
  return 'live';
}

export interface LimitCtl extends Setting {
  id: string;
  /** Which side of the tag: the high or the low limit (the owner's tag rule, research/57 L-17). */
  side: 'hi' | 'lo';
  format(v: number): string;
  gap: string;
  /** What the simulator says when the limit is selected: how the model raises its alarm (O2 and High PEEP, plan GA10, GA11). */
  note?: ReasonId;
}
const lim = (id: string, side: 'hi' | 'lo', gap: string, decimals: number, s: Pick<Setting, 'range' | 'read' | 'write'>, note?: ReasonId): LimitCtl => ({ id, side, gap, format: (v) => v.toFixed(decimals), ...s, ...(note ? { note } : {}) });
export const LIMITS: Record<string, LimitCtl> = {
  pmax: lim('pmax', 'hi', 'GA1', dec('lPmax'), { range: () => r(L.pmax.min, L.pmax.max, L.pmax.step), read: (c) => c.pmax, write: (v) => ({ pmax: v }) }),
  vtHi: lim('vtHi', 'hi', 'GA7', dec('lVt'), {
    range: (c) => [onStep(c.almVTlo / 1000 + num(L.vtHi.step), num(L.vtHi.step)), num(L.vtHi.max), num(L.vtHi.step)], // above the minimum (L-03)
    read: (c) => c.almVThi / 1000, write: (v) => ({ almVThi: L2mL(v) }),
  }),
  vtLo: lim('vtLo', 'lo', 'GA7', dec('lVt'), {
    range: (c) => [num(L.vtLo.min), c.almVThi / 1000, num(L.vtLo.step)], // 0 to the maximum (L-05)
    read: (c) => c.almVTlo / 1000, write: (v) => ({ almVTlo: L2mL(v) }),
  }),
  mvHi: lim('mvHi', 'hi', 'GA6', dec('lVe'), {
    range: (c) => [onStep(c.almMVlo + num(L.mvHi.step), num(L.mvHi.step)), num(L.mvHi.max), num(L.mvHi.step)],
    read: (c) => c.almMVhi, write: (v) => ({ almMVhi: v }),
  }),
  mvLo: lim('mvLo', 'lo', 'GA6', dec('lVe'), {
    range: (c) => [num(L.mvLo.min), c.almMVhi, num(L.mvLo.step)],
    read: (c) => c.almMVlo, write: (v) => ({ almMVlo: v }),
  }),
  fHi: lim('fHi', 'hi', 'GA8', dec('lF'), { range: () => r(L.fHi.min, L.fHi.max, L.fHi.step), read: (c) => c.almFhi, write: (v) => ({ almFhi: v }) }),
  // V3's limits (research/57 L-02, L-08, L-13); a cfg without them (a scenario's, the Hamilton face's) reads the device's default
  pLo: lim('pLo', 'lo', 'GA3', dec('lPlo'), {
    range: (c) => [num(L.pLo.min), Math.min(num(L.pLo.max), c.pmax - num(L.pLo.step)), num(L.pLo.step)], // below the maximum (L-02)
    read: (c) => c.almPlo ?? num(L.pLo.init), write: (v) => ({ almPlo: v }),
  }),
  peepHi: lim('peepHi', 'hi', 'GA10', dec('lPeepHi'), {
    range: () => r(L.peepHi.min, L.peepHi.max, L.peepHi.step), read: (c) => c.almPeepHi ?? num(L.peepHi.init), write: (v) => ({ almPeepHi: v }),
  }, 'peepModel'),
  o2Hi: lim('o2Hi', 'hi', 'GA11', dec('lO2'), {
    range: () => r(L.o2Hi.min, L.o2Hi.max, L.o2Hi.step), read: (c) => c.almO2hi ?? num(L.o2Hi.init), write: (v) => ({ almO2hi: v }),
  }, 'o2Set'),
  o2Lo: lim('o2Lo', 'lo', 'GA11', dec('lO2'), {
    range: () => r(L.o2Lo.min, L.o2Lo.max, L.o2Lo.step), read: (c) => c.almO2lo ?? num(L.o2Lo.init), write: (v) => ({ almO2lo: v }),
  }, 'o2Set'),
};

/** The face's own actions (no cfg key: they move the knob's state; knob.ts), the knob's two motions included. */
export type FaceAction = 'mode' | 'menu' | 'alarmLimits' | 'silence' | 'ctrl' | 'esc' | 'knobTurn' | 'knobPress';

/** One control the face draws. */
export type Ctl =
  | { id: string; region: Region; kind: 'setting'; setting: string }
  | { id: string; region: Region; kind: 'limit'; limit: string }
  | { id: string; region: Region; kind: 'action'; action: FaceAction; word?: WordId; gap: string }
  | { id: string; region: Region; kind: 'unavailable'; word?: WordId; reason: ReasonId; gap: string; value?: WordId };
export type Region = 'bottom' | 'tag' | 'right' | 'side' | 'under' | 'window';

const un = (id: string, region: Region, word: WordId | undefined, reason: ReasonId, gap: string, value?: WordId): Ctl => ({ id, region, kind: 'unavailable', word, reason, gap, ...(value ? { value } : {}) });

/** Every control outside the windows. The bottom row's keys come from the mode (modes.ts); their settings are here. */
export const CONTROLS: Ctl[] = [
  ...Object.keys(SETTINGS).filter((k) => !WINDOW_ONLY.has(k)).map((k): Ctl => ({ id: `key:${k}`, region: 'bottom', kind: 'setting', setting: k })),
  // alarm-limit tags under the top row and in the left column (research/57 R-11, R-12, R-18, R-24)
  ...Object.keys(LIMITS).map((k): Ctl => ({ id: `tag:${k}`, region: 'tag', kind: 'limit', limit: k })),
  // the right column (research/57 R-33)
  un('right:graphics', 'right', 'graphics', 'v4', 'GD12'),
  un('right:freeze', 'right', 'freeze', 'v4', 'GD13'),
  un('right:respMech', 'right', 'respMech', 'v4', 'GX13'),
  un('right:saveLoop', 'right', 'saveLoop', 'v4', 'GD14'),
  un('right:nebulizer', 'right', 'nebulizer', 'nebul', 'GX6'),
  un('right:help', 'right', 'help', 'v4', 'GX8'),
  un('right:standby', 'right', 'standby', 'v5', 'GX5'),
  // the keys beside the screen (research/57 H-31) and the knob (H-26)
  { id: 'side:alarmLimits', region: 'side', kind: 'action', action: 'alarmLimits', word: 'alarmLimits', gap: 'GA17' },
  { id: 'side:silence', region: 'side', kind: 'action', action: 'silence', word: 'silence', gap: 'GA16' },
  { id: 'side:menu', region: 'side', kind: 'action', action: 'menu', word: 'menu', gap: 'GX11' },
  { id: 'side:mode', region: 'side', kind: 'action', action: 'mode', word: 'mode', gap: 'GX9' },
  { id: 'side:knobTurn', region: 'side', kind: 'action', action: 'knobTurn', gap: 'GX10' },
  { id: 'side:knobPress', region: 'side', kind: 'action', action: 'knobPress', gap: 'GX10' },
  // the keys under the screen (research/57 H-30)
  un('under:lock', 'under', undefined, 'v4', 'GX7'),
  un('under:suction', 'under', 'suction', 'v5', 'GX4'),
  un('under:manualInsp', 'under', 'manualInsp', 'v4', 'GX1'),
  un('under:inspExpPause', 'under', 'inspExpPause', 'v4', 'GX3'),
  { id: 'under:ctrl', region: 'under', kind: 'action', action: 'ctrl', word: 'ctrl', gap: 'GX10' },
  { id: 'under:esc', region: 'under', kind: 'action', action: 'esc', word: 'esc', gap: 'GX10' },
];

/** A window's row: a mode, a submenu, a setting or limits edited in it, or a row the model does not honour yet. */
export type Row =
  | { kind: 'mode'; word: WordId; mode: string }
  | { kind: 'mode-off'; word: WordId; reason: ReasonId; gap: string }
  | { kind: 'open'; word: WordId; window: WindowId; inferred?: true }
  | { kind: 'setting'; word: WordId; setting: string }
  | { kind: 'limits'; word: WordId; cells: string[]; off?: { reason: ReasonId; gap: string } }
  | { kind: 'off'; word: WordId; reason: ReasonId; gap: string; value?: WordId; more?: true };

export type WindowId = 'modes' | 'otherModes' | 'menu' | 'adjuncts' | 'tools' | 'settings' | 'alarms';
export interface WindowDef { title: WordId; rows: Row[]; footer: boolean }

/**
 * The windows the knob moves through (research/57 O-09, O-10, O-13, E-01, E-02, E-04, E-06, A-21). The mode windows are
 * the MANUAL's (VQ7; X-01): the department's device titles both "Operative Modes" with SIMV(VCV)+PSV in the first (O-11,
 * O-12), which the owner's video may restore. The second window's last row opens the first again [inferred from O-10's
 * repeated row].
 */
export const WINDOWS: Record<WindowId, WindowDef> = {
  modes: { title: 'ventModes', footer: true, rows: [
    { kind: 'mode', word: 'VCV', mode: 'VCV' },
    { kind: 'mode', word: 'PCV', mode: 'PCV' },
    { kind: 'mode-off', word: 'PSV/CPAP', reason: 'v2', gap: 'GM3' },
    { kind: 'mode-off', word: 'SIMV(PCV)+PSV', reason: 'v6', gap: 'GM5' },
    { kind: 'mode-off', word: 'Noninvasive (NIV)', reason: 'v8', gap: 'GM6' },
    { kind: 'open', word: 'otherModes', window: 'otherModes' },
  ] },
  otherModes: { title: 'otherModes', footer: true, rows: [
    { kind: 'mode-off', word: 'SIMV(VCV)+PSV', reason: 'v6', gap: 'GM4' },
    { kind: 'mode-off', word: 'MMV+PSV', reason: 'v9', gap: 'GM7' },
    { kind: 'mode-off', word: 'PSV+VT Assured', reason: 'v9', gap: 'GM8' },
    { kind: 'mode-off', word: 'APRV', reason: 'v10', gap: 'GM9' },
    { kind: 'mode', word: 'PRVC', mode: 'PRVC' },
    { kind: 'open', word: 'otherModes', window: 'modes', inferred: true },
  ] },
  menu: { title: 'menuTitle', footer: true, rows: [
    { kind: 'off', word: 'patientsData', reason: 'v4', gap: 'GD16' },
    { kind: 'off', word: 'backupVent', reason: 'v2', gap: 'GX12', more: true },
    { kind: 'open', word: 'ventAdjuncts', window: 'adjuncts' },
    { kind: 'off', word: 'records', reason: 'v13', gap: 'GD20', more: true },
    { kind: 'open', word: 'tools', window: 'tools' },
    { kind: 'off', word: 'transport', reason: 'gas', gap: 'GX18', value: 'no' },
  ] },
  adjuncts: { title: 'ventAdjuncts', footer: true, rows: [
    { kind: 'setting', word: 'inspPause', setting: 'pause' },
    { kind: 'off', word: 'sighs', reason: 'v7', gap: 'GP18', value: 'no', more: true },
    { kind: 'off', word: 'tubeComp', reason: 'tube', gap: 'GP19', value: 'no', more: true },
    { kind: 'off', word: 'volumeComp', reason: 'volFixed', gap: 'GP20', value: 'yes' },
    { kind: 'off', word: 'humidifier', reason: 'humid', gap: 'GP21' },
    { kind: 'off', word: 'leakComp', reason: 'leak', gap: 'GP22', value: 'no' },
  ] },
  tools: { title: 'toolsTitle', footer: true, rows: [
    { kind: 'off', word: 'autoscale', reason: 'v4', gap: 'GD15', value: 'no' },
    { kind: 'off', word: 'suctionConfig', reason: 'v5', gap: 'GX4', more: true },
    { kind: 'off', word: 'calibration', reason: 'v12', gap: 'GX19', more: true },
    { kind: 'open', word: 'settings', window: 'settings' },
    { kind: 'off', word: 'timeOfUse', reason: 'notModelled', gap: 'GP25' },
  ] },
  // Tools → Settings (research/57 E-09 to E-12, U-13; plan GP25: Sound and the clock only). No figure shows this window:
  // its rows are the manual's text's, in its order, and its title is the Tools row that opens it
  settings: { title: 'settings', footer: true, rows: [
    { kind: 'off', word: 'pressureUnits', reason: 'notModelled', gap: 'GP25', value: 'uCmH2O' },
    { kind: 'off', word: 'ambientPressure', reason: 'notModelled', gap: 'GP25' },
    { kind: 'setting', word: 'sound', setting: 'sound' },
    { kind: 'off', word: 'dateTime', reason: 'clock', gap: 'GP25' },
    { kind: 'off', word: 'language', reason: 'notModelled', gap: 'GP25', value: 'english' },
  ] },
  alarms: { title: 'alarmSettings', footer: true, rows: [
    { kind: 'limits', word: 'inspPressure', cells: ['pmax', 'pLo'] },
    { kind: 'limits', word: 'tidalVolume', cells: ['vtHi', 'vtLo'] },
    { kind: 'limits', word: 'minuteVolume', cells: ['mvHi', 'mvLo'] },
    { kind: 'limits', word: 'o2Conc', cells: ['o2Hi', 'o2Lo'] },
    { kind: 'limits', word: 'respRate', cells: ['fHi'] },
    // the PEEP row holds the High PEEP limit (the owner's tag rule, research/57 L-17, Y-01)
    { kind: 'limits', word: 'lowPeep', cells: ['peepHi'] },
    { kind: 'off', word: 'etco2', reason: 'v14', gap: 'GA13' },
  ] },
};
