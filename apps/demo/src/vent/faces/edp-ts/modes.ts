// The EDP-TS face's modes and its spec for the cockpit core (plan vent-skin-edp-ts.md §3.3 GM1, GM2, GM10; piece V1):
// the three modes the model runs under the device's names, the bottom row each shows (research/57 D-01, D-02, D-12),
// the device's starting settings (§6, §10b), the invariants the core restores after any change (settle), and the alarm
// profile (the device's names and priorities, §10c; delays and latching are V3's).
import type { VentConfig } from '@pme/ventilator';
import type { AlarmProfile, FaceSpec, ModeEntry } from '../../core/types.ts';
import { backupOn, faceMode, SETTINGS, type FaceMode } from './controls.ts';
export { ROWS } from './controls.ts';
import { DATA, L, num, S, word, type Leaf } from './data.ts';

type Cfg = Readonly<VentConfig>;

/** The device label each model mode carries on the frame (plan §4.3 coupling 1). */
export const LABELS: Record<FaceMode, string> = {
  VCV: word('VCV'), PCV: word('PCV'), PRVC: word('PRVC'), 'PSV/CPAP': word('PSV/CPAP'), simPSV: word('simPSV'), simPAV: word('simPAV'),
};

/**
 * A mode started while ventilating keeps the settings the modes share [inferred: research/57 O-15 gives "the mode
 * starts with its defaults" for the start after calibration; a change while ventilating (O-16) is not described]. VT is
 * one setting written to both `vt` and `prvcTarget` (controls.ts), and Ti is `itime` in every mode, so nothing needs
 * carrying but VT out of a mode that wrote only one of them (a scenario, the Hamilton face, a link patch).
 */
const carryVt = (c: Cfg): Partial<VentConfig> => {
  const vt = SETTINGS.vt!.read(c) * 1000;
  return { vt, prvcTarget: vt };
};
export const MODES: Record<string, ModeEntry> = {
  VCV: { mode: 'VC', label: LABELS.VCV, carry: carryVt },
  PCV: { mode: 'PC', label: LABELS.PCV },
  PRVC: { mode: 'PRVC', label: LABELS.PRVC, carry: carryVt },
  // PSV/CPAP (research/57 D-03, M-05, M-06, M-09): the model's PSV with the device's apnoea backup armed (piece V2). The
  // backup kind is the one chosen in Menu → Backup ventilation, VCV when none was [O-17, "set the backup first", is not
  // built: T-40's drawn VCV stands in]. The PSV breath's pressure criterion (M-06) is not built (M-07: its arithmetic is
  // unclear); the model's own PSV cycling stays, and the face's strip says so when the mode starts.
  'PSV/CPAP': { mode: 'PSV', label: LABELS['PSV/CPAP'], carry: (c) => ({ ...carryVt(c), backupMode: backupOn(c) ? c.backupMode : 'VC' }) },
};

const v = (l: unknown) => num(l);
/**
 * The device's starting settings: the VCV defaults (research/57 D-01, T-03, T-18, T-21, T-28) and the manual's limits
 * (§10b); and the device's breath behaviours, the model's V2 options: the descending ramp as the initial waveform
 * (T-26), the breath ended at the maximum pressure (A-32), and VCV as the backup kind (T-40).
 */
export const INIT: Partial<VentConfig> = {
  mode: 'VC', modeLabel: LABELS.VCV, backupMode: 'VC', pmaxAction: 'cycle',
  vt: v(S.vt.init) * 1000, prvcTarget: v(S.vt.init) * 1000, itime: v(S.ti.init), rate: v(S.f.init), peep: v(S.peep.init),
  trigType: 'flow', flowTrig: v(S.sensFlow.init), presTrig: v(S.sensPres.init), fio2: v(S.oxygen.init),
  flowPattern: 'ramp0', pause: v(S.pause.init), pc: v(S.pcv.init), ps: v(S.psv.init), cycleOff: v(S.expSens.init),
  riseTime: v(S.riseTime.init),
  pmax: v(L.pmax.init), almVThi: v(L.vtHi.init) * 1000, almVTlo: v(L.vtLo.init) * 1000, almMVhi: v(L.mvHi.init), almMVlo: v(L.mvLo.init),
  almFhi: v(L.fHi.init), apneaTime: v(S.apnea.init), sweepSec: v(DATA.layout.sweepS),
};

/**
 * In VC the face's set Ti (`itime`) owns the flow: vcFlow = 60 · VT / Ti, so the model's Ti = VT / mean flow is exactly
 * the set one for both flow patterns (plan GM1). Unless something ELSE changed the flow (a link `control` patch, the
 * Hamilton face's settings handed over): then the set Ti follows the flow. Kept per cfg object, so cockpits never share it.
 */
const flowSet = new WeakMap<object, number>();
export function settle(c: Cfg): Partial<VentConfig> {
  const fix: Partial<VentConfig> = {};
  const label = LABELS[faceMode(c)];
  if (c.modeLabel !== label) fix.modeLabel = label;
  // the flow is the set Ti's wherever VC breaths run: VCV, and PSV/CPAP's VCV backup breaths (piece V2)
  if (c.mode === 'VC' || (c.mode === 'PSV' && c.backupMode === 'VC')) {
    const ours = flowSet.get(c);
    let itime = c.itime;
    if (ours !== undefined && Math.abs(c.vcFlow - ours) > 1e-9) {
      itime = Math.round(((c.vt / 1000) / (c.vcFlow / 60)) * 1e6) / 1e6; // a flow set elsewhere: the Ti it means
      fix.itime = itime;
    }
    const flow = (60 * c.vt) / 1000 / Math.max(1e-3, itime);
    if (Math.abs(c.vcFlow - flow) > 1e-9) fix.vcFlow = flow;
    flowSet.set(c, flow);
  }
  return fix;
}

const alarms = DATA.alarms as Record<string, { text: Leaf<string>; priority: Leaf<'high' | 'medium' | 'low'> }>;
/** The device's alarms: the model's ids it has, at its priorities (research/57 §10c). The model's `fLow` and `intrinsicPeep` are not the device's (plan GA8). */
export const ALARM_PROFILE: AlarmProfile = {
  show: Object.keys(alarms) as AlarmProfile['show'],
  priority: Object.fromEntries(Object.entries(alarms).map(([k, a]) => [k, a.priority.v])),
};
export const alarmText = (id: string): string | null => alarms[id]?.text.v ?? null;

export const EDP_SPEC: FaceSpec = {
  id: 'edp-ts',
  label: word('faceName'),
  ranges: {}, // every EDP-TS setting is a Setting in the device's units (controls.ts), none a bare cfg key
  modes: MODES,
  matchMonitorFlow: false, // the face sets Ti; the monitor's matched flow would overwrite it every frame (plan GM1)
  alarmProfile: ALARM_PROFILE,
  init: INIT,
  settle,
};
