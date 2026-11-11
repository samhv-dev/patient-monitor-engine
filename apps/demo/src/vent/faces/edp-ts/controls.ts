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
import { dec, L, num, S, word, type ReasonId, type WordId } from './data.ts';

type Cfg = Readonly<VentConfig>;
/** What a control can do in a configuration: set, show without setting (I:E outside PCV, research/57 T-16), or nothing yet. */
export type CtlState = 'live' | 'shown' | { reason: ReasonId };

const r = (lo: unknown, hi: unknown, st: unknown): Range => [num(lo), num(hi), num(st)];
const ceilTo = (v: number, st: number) => onStep(Math.ceil(v / st - 1e-9) * st, st);
const floorTo = (v: number, st: number) => onStep(Math.floor(v / st + 1e-9) * st, st);
const L2mL = (v: number) => Math.round(v * 1e6) / 1e3; // 0.41 L → 410 mL without a binary tail

/** The face's mode name for the model's mode (the frame carries it, plan §4.3 coupling 1). */
export type FaceMode = 'VCV' | 'PCV' | 'PRVC' | 'PSV/CPAP' | 'simPSV' | 'simPAV';
/**
 * The device's backup is armed: a backup kind chosen (piece V2, the model's `backupMode`; research/57 T-37). PSV with it
 * is the device's PSV/CPAP (O-18: PSV/CPAP needs its backup); PSV without it is a scenario's PSV, the simulator's own.
 */
export const backupOn = (c: Cfg): boolean => c.backupMode === 'VC' || c.backupMode === 'PC';
export const faceMode = (c: Cfg): FaceMode =>
  c.mode === 'VC' ? 'VCV' : c.mode === 'PC' ? 'PCV' : c.mode === 'PRVC' ? 'PRVC' : c.mode === 'PSV' ? (backupOn(c) ? 'PSV/CPAP' : 'simPSV') : 'simPAV';
const isSim = (c: Cfg) => faceMode(c) === 'simPSV' || faceMode(c) === 'simPAV';

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
    // 0 = constant (rectangular), 1 = the descending ramp to zero at Ti, the model's `ramp0` (research/57 T-26; plan
    // GP12, GP13, piece V2). The Hamilton face's `decel` is not this device's waveform: it reads as constant here.
    id: 'flowWaveform', word: 'flowWaveform', gap: 'GP13', unit: () => null,
    range: () => [0, 1, 1],
    read: (c) => (c.flowPattern === 'ramp0' ? 1 : 0),
    write: (v) => ({ flowPattern: v >= 1 ? 'ramp0' : 'square' }),
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
  backupMode: {
    // Menu → Backup ventilation → Ventilation Modes: VCV or PCV (research/57 T-37, T-40; plan GP17, piece V2). Its
    // breaths run at the cfg's own VCV or PCV settings: the window sets only the kind and the apnoea time [ENG:
    // backup-settings: the manual names no separate backup settings (T-37 to T-41)]
    id: 'backupMode', word: 'backupModes', gap: 'GP17', unit: () => null,
    range: () => [0, 1, 1],
    read: (c) => (c.backupMode === 'PC' ? 1 : 0),
    write: (v) => ({ backupMode: v >= 1 ? 'PC' : 'VC' }),
    format: (v) => word(v >= 1 ? 'PCV' : 'VCV'),
  },
  apnea: {
    // Menu → Backup ventilation → Apnea time, 5 to 60 s in steps of 5 (research/57 T-38, L-12; plan GP17)
    id: 'apnea', word: 'apneaTime', gap: 'GP17', unit: () => 'uS',
    range: () => r(S.apnea.min, S.apnea.max, S.apnea.step),
    read: (c) => c.apneaTime,
    write: (v) => ({ apneaTime: v }),
    format: (v) => v.toFixed(0),
  },
};
/** Settings edited only in a window, never a key of the bottom row. */
const WINDOW_ONLY = new Set(['pause', 'backupMode', 'apnea']);

/** The bottom row of each mode, left to right (research/57 D-01 VCV, D-02 PCV, D-12 PRVC; D-03 for a scenario's PSV). */
export const ROWS: Record<FaceMode, string[]> = {
  VCV: ['vt', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'flowWaveform'],
  PCV: ['pcv', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'riseTime'],
  PRVC: ['vt', 'ti', 'ie', 'f', 'peep', 'sens', 'oxygen', 'riseTime'],
  'PSV/CPAP': ['psv', 'expSens', 'peep', 'sens', 'oxygen', 'riseTime'],
  simPSV: ['psv', 'expSens', 'peep', 'sens', 'oxygen', 'riseTime'],
  simPAV: ['psv', 'expSens', 'peep', 'sens', 'oxygen', 'riseTime'],
};

/** A setting's state in a configuration: what the device's mode offers (research/57 D-01, D-02, D-12, T-16, T-28). */
export function settingState(id: string, c: Cfg): CtlState {
  if (id === 'backupMode' || id === 'apnea') return 'live'; // the backup's choice is kept across modes (manual p. 36; research/57 T-41)
  if (isSim(c)) return { reason: 'simMode' };
  if (id === 'pause') return c.mode === 'VC' ? 'live' : { reason: 'vcvOnly' };
  if (!ROWS[faceMode(c)].includes(id)) return { reason: 'psvKeys' }; // PSV and Exp. Sensitiv. belong to PSV/CPAP (GM3)
  if (id === 'ie') return c.mode === 'PC' ? 'live' : 'shown';
  return 'live';
}

export interface LimitCtl extends Setting {
  id: string;
  /** Which side of the tag: the high or the low limit (the owner's tag rule, research/57 L-17). */
  side: 'hi' | 'lo';
  format(v: number): string;
  gap: string;
}
const lim = (id: string, side: 'hi' | 'lo', gap: string, decimals: number, s: Pick<Setting, 'range' | 'read' | 'write'>): LimitCtl => ({ id, side, gap, format: (v) => v.toFixed(decimals), ...s });
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
};

/** The face's own actions (no cfg key: they move the knob's state; knob.ts), the knob's two motions included. */
export type FaceAction = 'mode' | 'menu' | 'alarmLimits' | 'ctrl' | 'esc' | 'knobTurn' | 'knobPress';

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
  un('tag:pLo', 'tag', undefined, 'pLo', 'GA3'),
  un('tag:peepHi', 'tag', undefined, 'peepHi', 'GA10'),
  un('tag:o2Hi', 'tag', undefined, 'o2Lim', 'GA11'),
  un('tag:o2Lo', 'tag', undefined, 'o2Lim', 'GA11'),
  // the right column (research/57 R-33)
  un('right:graphics', 'right', 'graphics', 'graphics', 'GD12'),
  un('right:freeze', 'right', 'freeze', 'freeze', 'GD13'),
  un('right:respMech', 'right', 'respMech', 'respMech', 'GX13'),
  un('right:saveLoop', 'right', 'saveLoop', 'saveLoop', 'GD14'),
  un('right:nebulizer', 'right', 'nebulizer', 'nebul', 'GX6'),
  un('right:help', 'right', 'help', 'help', 'GX8'),
  un('right:standby', 'right', 'standby', 'standby', 'GX5'),
  // the keys beside the screen (research/57 H-31) and the knob (H-26)
  { id: 'side:alarmLimits', region: 'side', kind: 'action', action: 'alarmLimits', word: 'alarmLimits', gap: 'GA17' },
  un('side:silence', 'side', 'silence', 'silence', 'GA16'),
  { id: 'side:menu', region: 'side', kind: 'action', action: 'menu', word: 'menu', gap: 'GX11' },
  { id: 'side:mode', region: 'side', kind: 'action', action: 'mode', word: 'mode', gap: 'GX9' },
  { id: 'side:knobTurn', region: 'side', kind: 'action', action: 'knobTurn', gap: 'GX10' },
  { id: 'side:knobPress', region: 'side', kind: 'action', action: 'knobPress', gap: 'GX10' },
  // the keys under the screen (research/57 H-30)
  un('under:lock', 'under', undefined, 'lock', 'GX7'),
  un('under:suction', 'under', 'suction', 'suction', 'GX4'),
  un('under:manualInsp', 'under', 'manualInsp', 'manualInsp', 'GX1'),
  un('under:inspExpPause', 'under', 'inspExpPause', 'inspExpPause', 'GX3'),
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
  | { kind: 'off'; word: WordId; reason: ReasonId; gap: string; value?: WordId; more?: true }
  /** Applies the window's draft (research/57 T-41); Esc instead returns to the previous values. */
  | { kind: 'accept'; word: WordId };

export type WindowId = 'modes' | 'otherModes' | 'menu' | 'adjuncts' | 'tools' | 'alarms' | 'backup';
/** `draft`: the window's settings are edited into a draft that its Accept row applies (the Backup window, T-41). */
export interface WindowDef { title: WordId; rows: Row[]; footer: boolean; draft?: true }

/**
 * The windows the knob moves through (research/57 O-09, O-10, O-13, E-01, E-02, E-04, E-06, A-21). The mode windows are
 * titled and ordered AS PHOTOGRAPHED (brief 159, R14: research/57 P-01, P-02, which replace the manual's O-09/O-10 for
 * what the photographs show; X-01 records the difference): "Operative Modes" twice, SIMV(VCV)+PSV in the first. The
 * second window's last row opens the first again [inferred from the photographed repeated row, P-02].
 */
export const WINDOWS: Record<WindowId, WindowDef> = {
  modes: { title: 'ventModes', footer: true, rows: [
    { kind: 'mode', word: 'VCV', mode: 'VCV' },
    { kind: 'mode', word: 'PCV', mode: 'PCV' },
    { kind: 'mode', word: 'PSV/CPAP', mode: 'PSV/CPAP' },
    { kind: 'mode-off', word: 'SIMV(PCV)+PSV', reason: 'simvMode', gap: 'GM5' },
    { kind: 'mode-off', word: 'SIMV(VCV)+PSV', reason: 'simvMode', gap: 'GM4' },
    { kind: 'mode-off', word: 'Noninvasive (NIV)', reason: 'nivMode', gap: 'GM6' },
    { kind: 'open', word: 'otherModes', window: 'otherModes' },
  ] },
  otherModes: { title: 'ventModes', footer: true, rows: [
    { kind: 'mode-off', word: 'MMV+PSV', reason: 'mmvMode', gap: 'GM7' },
    { kind: 'mode-off', word: 'PSV+VT Assured', reason: 'mmvMode', gap: 'GM8' },
    { kind: 'mode-off', word: 'APRV', reason: 'aprvMode', gap: 'GM9' },
    { kind: 'mode', word: 'PRVC', mode: 'PRVC' },
    { kind: 'open', word: 'otherModes', window: 'modes', inferred: true },
  ] },
  menu: { title: 'menuTitle', footer: true, rows: [
    { kind: 'off', word: 'patientsData', reason: 'patientsData', gap: 'GD16' },
    { kind: 'open', word: 'backupVent', window: 'backup' },
    { kind: 'open', word: 'ventAdjuncts', window: 'adjuncts' },
    { kind: 'off', word: 'records', reason: 'records', gap: 'GD20', more: true },
    { kind: 'open', word: 'tools', window: 'tools' },
    { kind: 'off', word: 'transport', reason: 'gas', gap: 'GX18', value: 'no' },
  ] },
  // research/57 T-40 as drawn: Ventilation Modes, Apnea time, Backup in SIMV/APRV, Accept (T-41: Accept applies, Esc
  // returns to the previous values). Backup in SIMV/APRV waits for SIMV and APRV (V6, V10): T-39, off by default.
  backup: { title: 'backupVent', footer: true, draft: true, rows: [
    { kind: 'setting', word: 'backupModes', setting: 'backupMode' },
    { kind: 'setting', word: 'apneaTime', setting: 'apnea' },
    { kind: 'off', word: 'backupSimv', reason: 'simvMode', gap: 'GM4', value: 'no' },
    { kind: 'accept', word: 'accept' },
  ] },
  adjuncts: { title: 'ventAdjuncts', footer: true, rows: [
    { kind: 'setting', word: 'inspPause', setting: 'pause' },
    { kind: 'off', word: 'sighs', reason: 'sighs', gap: 'GP18', value: 'no', more: true },
    { kind: 'off', word: 'tubeComp', reason: 'tube', gap: 'GP19', value: 'no', more: true },
    { kind: 'off', word: 'volumeComp', reason: 'volFixed', gap: 'GP20', value: 'yes' },
    { kind: 'off', word: 'humidifier', reason: 'humid', gap: 'GP21' },
    { kind: 'off', word: 'leakComp', reason: 'leak', gap: 'GP22', value: 'no' },
  ] },
  tools: { title: 'toolsTitle', footer: true, rows: [
    { kind: 'off', word: 'autoscale', reason: 'autoscale', gap: 'GD15', value: 'no' },
    { kind: 'off', word: 'suctionConfig', reason: 'suctionConfig', gap: 'GX4', more: true },
    { kind: 'off', word: 'calibration', reason: 'calibration', gap: 'GX19', more: true },
    { kind: 'off', word: 'settings', reason: 'settings', gap: 'GP25', more: true },
    { kind: 'off', word: 'timeOfUse', reason: 'notModelled', gap: 'GP25' },
  ] },
  alarms: { title: 'alarmSettings', footer: true, rows: [
    { kind: 'limits', word: 'inspPressure', cells: ['pmax'] },
    { kind: 'limits', word: 'tidalVolume', cells: ['vtHi', 'vtLo'] },
    { kind: 'limits', word: 'minuteVolume', cells: ['mvHi', 'mvLo'] },
    { kind: 'limits', word: 'o2Conc', cells: [], off: { reason: 'o2Lim', gap: 'GA11' } },
    { kind: 'limits', word: 'respRate', cells: ['fHi'] },
    { kind: 'limits', word: 'lowPeep', cells: [], off: { reason: 'peepHi', gap: 'GA10' } },
    { kind: 'off', word: 'etco2', reason: 'etco2', gap: 'GA13' },
  ] },
};
