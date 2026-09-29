// Alarm conditions (brief §6.4 "Conditions", §6.4.1, §6.2 sensors; research 03 §1.12, §8.10): what the monitor
// sees — displayed numerics, QRS detections, beat classes, sensor states — turned into this tick's true conditions.
// Inputs are plain JSON-safe data the engine keeps up to date (observe* functions); buildConditions is pure.
import type { EngineEvent, Measured, NumericId } from '../../types.ts';
import type { LineSensorState } from '../../types-hemo.ts';
import { LOW_PERF_PI } from '../spo2/spo2.ts';
import { isEnabled, limitOf, type AlarmMgrState, type Condition } from './manager.ts';
import { displayDigits, fixedText, limitText, type FixedAlarmId } from './text.ts';

/** VF is recognised this long after it starts (a monitor needs a few seconds of analysis) [ENG]. */
export const VF_CONFIRM_S = 3;
/** Desaturation alarm delay (brief §6.4: "desaturation (<80%, 20 s)"). */
export const DESAT_DELAY_S = 20;
/** A displayed numeric older than this is stale and raises nothing (NIBP excepted: it is episodic) [ENG]. */
export const STALE_S = 5;
/** A ventricular run ends when no ventricular beat came for this long [ENG]. */
export const VT_GAP_S = 2;
/** Extreme brady/tachy: the HR limit ∓ 20 bpm, clamped at 40/200 (adult) or 50/240 (neonatal) (brief §6.4). */
export const EXTREME_OFFSET = 20;
export const EXTREME_CLAMP = { adult: [40, 200], paed: [40, 200], neo: [50, 240] } as const;
/** Stage 3's raw apnoea alarm ids (its plan: CO2 and impedance detectors) → APNEA. */
export const APNOEA_FLAGS: ReadonlySet<string> = new Set(['apnoea-co2', 'apnoea-resp']);
/** Raw CO2 sampling-line INOP ids accepted from Stage 3 (request R-4b-1 names `co2Line`). */
export const CO2_LINE_FLAGS: ReadonlySet<string> = new Set(['co2Line', 'co2-line']);
/**
 * FU-5 (audit M7; research/00 "FU-5 opened": "chained alarms suppressed by priority"): an active condition suppresses
 * the ones it explains. Arrhythmias follow the Philips chaining ([S2] IFU p. 99: one announced alarm per chain, a
 * higher priority supersedes — asystole, VF/VT, VT, extreme rate, HR limit); one apnoea raises one alarm, not RR,
 * awRR or EtCO2 LOW beside it (the ruling's "one condition raises exactly one alarm"). A suppressed alarm is CLEARED,
 * never latched (a superseded alarm, [S2] p. 99), and is not raised while its suppressor holds.
 */
export const CHAIN: Readonly<Record<string, readonly string[]>> = {
  ASYSTOLE: ['HR_LOW', 'EXTREME_BRADY', 'BRADY', 'PAUSE', 'PVCS'],
  VFIB: ['VTAC', 'HR_HIGH', 'HR_LOW', 'EXTREME_TACHY', 'EXTREME_BRADY', 'TACHY', 'BRADY', 'PAUSE', 'PVCS'],
  VTAC: ['HR_HIGH', 'EXTREME_TACHY', 'TACHY', 'PVCS'],
  EXTREME_TACHY: ['HR_HIGH', 'TACHY'],
  EXTREME_BRADY: ['HR_LOW', 'BRADY'],
  'apnoea-co2': ['RR_LOW', 'AWRR_LOW', 'EtCO2_LOW', 'EtCO2_pctV_LOW'],
  'apnoea-resp': ['RR_LOW', 'AWRR_LOW'],
  abpDisconnect: ['ART_S_LOW', 'ART_M_LOW', 'ART_D_LOW'],
};
/** FU-5 (audit M13): an event arrhythmia alarm (PAUSE) stays at least this long once raised [ENG]. */
export const EVENT_HOLD_S = 5;
/** FU-5: the oximeter is still acquiring (averaging window + update) this long after its probe went on [ENG]. */
export const SPO2_SEARCH_S = 15;
/**
 * FU-5: LOW PERF is raised once PI < 0.3 (LOW_PERF_PI: "below 0.3 is marginal", research/05 §6 [S2] IFU p. 120) has held
 * this long, and cleared at PI ≥ LOW_PERF_CLEAR_PI or after this long at PI ≥ 0.3 (PI hovering at 0.3 flickered the
 * INOP 7 times in the 3 L bleed) [ENG].
 */
export const LOW_PERF_DELAY_S = 5;
export const LOW_PERF_CLEAR_PI = 0.4;
/** FU-5: SpO2 NON-PULSAT. clears only after a valid SpO2 for this long [ENG]. */
export const NONPULS_CLEAR_S = 2;
/** FU-5: an arterial pressure non-pulsatile with a mean below this is a disconnection ([S2] IFU p. 44: 10 mmHg). */
export const DISCONNECT_MMHG = 10;
/** FU-5: "continuously less than 10 mmHg" ([S2] p. 44) — for this long [ENG]. */
export const DISCONNECT_DELAY_S = 5;
/**
 * FU-5 (review ruling 6): an R–R at least this long keeps a standing ASYSTOLE — agonal is < 20/min (R–R ≥ 3 s,
 * research/03 §1.5), less half a second for the detector's timing of a wide complex (2.9 s measured between agonal
 * beats generated 3 s apart) [ENG].
 */
export const AGONAL_RR_S = 2.5;
/** FU-8 (F3): two detections closer than this are one wide complex for the agonal hold (agonal QRS ≈ 300 ms) [ENG]. */
export const SAME_COMPLEX_S = 0.35;
/** FU-5 (review F9): a live extreme-rate alarm ends only after this long back inside its threshold [ENG]. */
export const EXTREME_CLEAR_S = 5;
/** FU-5: the alarm is raised and live (not latched) or pending its delay — a hysteresis band applies. */
const holdingId = (s: AlarmMgrState, id: string): boolean => (s.active[id] !== undefined && !s.active[id].latched) || s.pending[id] !== undefined;
/**
 * FU-5 Task 9a (the vendor alarm on-delay, ruling on the plan's Open question 20): a limit alarm's hysteresis band holds
 * a RAISED, live alarm only. While the alarm is pending its on-delay the condition is the plain limit compare — "if the
 * alarm condition is resolved within the delay time, the monitor does not present the alarm" ([S4] §10.6.5) — so a
 * value back AT the limit ends the pending instead of raising "**HR 50<50" after the delay.
 */
const raisedLiveId = (s: AlarmMgrState, id: string): boolean => s.active[id] !== undefined && !s.active[id].latched;
const RR_EMA = 0.2; // mean R-R for the Saadat-like pause ratio (brief §6.4.1 "R-R > 2.1× mean R-R") [ENG weight]

export interface AlarmInputs {
  measured: Partial<Record<NumericId, Measured>>;
  lastQrsT: number | null;
  /** FU-5: the QRS before `lastQrsT` (the last R–R, for the agonal arrest hold); absent in older snapshots. */
  prevQrsT?: number | null;
  /** FU-8 (F3): the last detection counted as a new complex (a second detection within SAME_COMPLEX_S is not). */
  countedQrsT?: number | null;
  meanRR: number | null;
  /** ECG leads on since (s); monitoring for asystole starts here. */
  ecgOnSince: number;
  leadsOff: boolean;
  vfSince: number | null;
  vt: { count: number; firstT: number; lastT: number };
  pvcTimes: number[];
  spo2Probe: 'on' | 'off' | 'motion';
  nibpFailed: boolean;
  pacing: boolean;
  /** Stage 3's raw apnoea flags (its CO2 and impedance detectors) and a CO2 line INOP flag (request R-4b-1). */
  apnoeaFlags: string[];
  co2Line: boolean;
  /** FU-5: when the HR was last beyond each extreme threshold (EXTREME_CLEAR_S); absent in older snapshots. */
  extremeSeen?: Record<string, number>;
  /** FU-5: the capnograph's state — while 'on' it is the respiratory (apnoea) source, else the impedance. */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
  /** FU-5: the arterial line's transducer state ('zeroing' also while a zero is running). */
  abp: LineSensorState;
  /** FU-5: temperature probe state, and whether it was ever on (a probe never attached raises nothing). */
  temp: 'off' | 'on';
  tempSeen: boolean;
  /** FU-5: when the SpO2 probe last went on (s): the oximeter acquires for SPO2_SEARCH_S before an INOP. */
  spo2OnSince: number;
  /** FU-5: since when PI has been ≥ LOW_PERF_PI / the SpO2 not invalid (the INOPs' clear hysteresis); null = not now. */
  piOkSince?: number | null;
  spo2OkSince?: number | null;
}

export function createInputs(t0 = 0): AlarmInputs {
  return {
    measured: {}, lastQrsT: null, meanRR: null, ecgOnSince: t0, leadsOff: false, vfSince: null,
    vt: { count: 0, firstT: 0, lastT: -1e9 }, pvcTimes: [], spo2Probe: 'on', nibpFailed: false, pacing: false,
    apnoeaFlags: [], co2Line: false, co2: 'on', abp: 'none', temp: 'on', tempSeen: false, spo2OnSince: t0,
  };
}

/** A QRS detection at R time tR (s). */
export function observeQrs(inp: AlarmInputs, tR: number): void {
  if (inp.lastQrsT !== null) {
    const rr = tR - inp.lastQrsT;
    if (rr > 0.2) inp.meanRR = inp.meanRR === null ? rr : inp.meanRR + RR_EMA * (rr - inp.meanRR);
  }
  // the agonal hold's R–R skips a second detection inside the same wide complex (the detector fires twice, 0.12 s apart,
  // on an agonal beat — measured), as the mean R–R above does. FU-8 (F3): measured 0.14–0.24 s apart on origin/main
  // 0fd5397, so a detection within SAME_COMPLEX_S of the last COUNTED one is the same complex; pairwise, so a real
  // rhythm faster than 1/SAME_COMPLEX_S (VT ≥ 170/min) still counts every other beat and ends the hold
  if (inp.lastQrsT === null || tR - (inp.countedQrsT ?? -Infinity) > SAME_COMPLEX_S) {
    if (inp.countedQrsT !== undefined && inp.countedQrsT !== null) inp.prevQrsT = inp.countedQrsT;
    inp.countedQrsT = tR;
  }
  inp.lastQrsT = tR;
}

/** An engine event the device layer sees (measurements, beats, NIBP results and the raw technical flags). */
export function observeEvent(inp: AlarmInputs, e: EngineEvent): void {
  if (e.type === 'measurement') {
    for (const [k, m] of Object.entries(e.values)) if (m) inp.measured[k as NumericId] = m;
    const pi = e.values.pi;
    if (pi) inp.piOkSince = pi.value !== null && pi.flag !== 'invalid' && pi.value >= LOW_PERF_PI ? (inp.piOkSince ?? e.t) : null;
    const sp = e.values.spo2;
    if (sp) inp.spo2OkSince = sp.flag !== 'invalid' ? (inp.spo2OkSince ?? e.t) : null;
  } else if (e.type === 'beat') {
    const vent = e.origin === 'ventricular' && e.template !== 'pvc';
    if (e.template === 'pvc') {
      inp.pvcTimes.push(e.t);
      while (inp.pvcTimes.length > 0 && (inp.pvcTimes[0] as number) < e.t - 60) inp.pvcTimes.shift();
    }
    if (vent || e.template === 'pvc') {
      if (inp.vt.count > 0 && e.t - inp.vt.lastT < VT_GAP_S) inp.vt.count++;
      else inp.vt = { count: 1, firstT: e.t, lastT: e.t };
      inp.vt.lastT = e.t;
    } else inp.vt = { count: 0, firstT: e.t, lastT: -1e9 };
  } else if (e.type === 'alarm' && e.level === undefined) {
    // raw technical flags from L2 (lead-off.ts, hemo pipeline): the manager re-issues them with the skin's level
    if (e.id === 'ecgLeadsOff') inp.leadsOff = e.state === 'raised';
    if (e.id === 'nibp-failed') inp.nibpFailed = e.state === 'raised';
    if (APNOEA_FLAGS.has(e.id)) {
      inp.apnoeaFlags = inp.apnoeaFlags.filter((x) => x !== e.id);
      if (e.state === 'raised') inp.apnoeaFlags.push(e.id);
    }
    if (CO2_LINE_FLAGS.has(e.id)) inp.co2Line = e.state === 'raised';
  } else if (e.type === 'nibp' && (e.phase === 'inflating' || e.result !== undefined)) {
    inp.nibpFailed = false;
  }
}

/** FU-5 (audit M14): only a VALID value alarms — a questionable one ("97?", motion, CPR, low perfusion) raises nothing. */
function valid(inp: AlarmInputs, id: NumericId, t: number): number | null {
  const m = inp.measured[id];
  if (!m || m.value === null || m.flag !== 'valid') return null;
  if (!id.startsWith('nibp') && t - m.at > STALE_S) return null;
  return m.value;
}

/** Every condition that is true at sim time t (the manager applies delays, switches and silence). */
export function buildConditions(s: AlarmMgrState, inp: AlarmInputs, t: number): Condition[] {
  const p = s.profile;
  const out: Condition[] = [];
  const fixed = (id: FixedAlarmId, level: 1 | 2 | 3, category: 'physiological' | 'technical', delayS = 0): Condition => ({
    id, level, category, text: fixedText(p, id, level, category === 'technical'), delayS,
  });
  // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6); with the leads off HR is not measured (brief §6.2).
  const hrSuppressed = (inp.pacing && p.hrDashesWhilePacing) || inp.leadsOff;
  // FU-5 (audit M3): an AUTO skin takes the first valid pulse as the HR/alarm source while the ECG has no heart rate
  // (Philips "Alarm Source Auto", [S2] IFU p. 108: HR/Pulse limits and the extreme rate alarms act on the pulse, the
  // arrhythmia and ECG HR alarms are off; Saadat HR AUTO, research/06 §4.1)
  const pulse = inp.leadsOff && p.hr.source === 'AUTO' ? p.hr.pulse.find((k) => valid(inp, k, t) !== null) : undefined;

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
  for (const [key, d] of Object.entries(p.limits)) {
    const src = pulse !== undefined && d.numeric === 'hr' ? pulse : d.numeric;
    const v = valid(inp, src, t); // cheapest test first: this loop runs every tick
    if (v === null || (hrSuppressed && src === 'hr') || !isEnabled(s, key)) continue;
    const l = limitOf(s, key);
    if (v === null || !l) continue;
    const delayS = d.numeric === 'spo2' ? p.spo2DelayS : p.delayS;
    const c = { level: d.level, category: 'physiological' as const, delayS, numeric: d.numeric };
    // FU-8 (Task A1): the text prints the limit in force (a `setLimit` edits `l`; the profile's `d` keeps the default)
    const dd = { ...(src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }), low: l.low, high: l.high }; // "**Pulse 130>120" / "PR TOO HIGH"
    // FU-5 (audit M6): the DISPLAYED value against the limit, with one display unit of hysteresis — raised once it is
    // beyond the limit, kept until it is back inside by a full unit (CVP hovering 9.6–10.4 at a limit of 10 raised
    // `**CVP 10>10` 100 times in 11 min) [ENG, the vendors' hysteresis is not published]
    const unit = 10 ** -displayDigits(d.numeric);
    const dv = Math.round(v / unit) * unit;
    const hi = `${key}_HIGH`;
    const lo = `${key}_LOW`;
    // FU-8 (R50 F6): a condition kept only by the clear hysteresis (the value back AT the limit) is `held` — the manager
    // keeps its last violating text (`**ABPs 90<90`, `**CVP 10>10` were printed through the band)
    const over = l.high !== null && dv > l.high + 1e-9;
    const under = l.low !== null && dv < l.low - 1e-9;
    if (l.high !== null && (over || (raisedLiveId(s, hi) && dv > l.high - unit + 1e-9))) out.push({ id: hi, text: limitText(p, dd, 'HIGH', dv), ...c, ...(over ? {} : { held: true }) });
    if (l.low !== null && (under || (raisedLiveId(s, lo) && dv < l.low + unit - 1e-9))) out.push({ id: lo, text: limitText(p, dd, 'LOW', dv), ...c, ...(under ? {} : { held: true }) });
  }
  const spo2 = valid(inp, 'spo2', t);
  if (p.desat !== null && spo2 !== null && spo2 < p.desat && isEnabled(s, 'SpO2')) out.push({ ...fixed('DESAT', 1, 'physiological', DESAT_DELAY_S), numeric: 'spo2' });

  // Extreme rate alarms (red) from the active HR source, WITH OR WITHOUT arrhythmia analysis (FU-5: Philips "HR alarms
  // when arrhythmia analysis is switched off" include extreme tachy/brady, [S2] IFU p. 89, audit Q13): the HR limit
  // ∓ 20 bpm clamped (Philips ΔExtrTachy/ΔExtrBrady 20, clamps 200/40 [S1] p. 50), or the skin's absolute limits
  // (mindray-like 160/35, [S4] App. C.1.1). Saadat-like has none (its BRADY/TACHY are arrhythmia alarms below).
  const ar = p.arrhythmia;
  const hrA = pulse !== undefined ? valid(inp, pulse, t) : hrSuppressed ? null : valid(inp, 'hr', t);
  if (hrA !== null && hrA > 0 && ar.brady === null && ar.tachy === null) {
    const hrl = limitOf(s, 'HR');
    const [lo, hi] = EXTREME_CLAMP[p.ageBand];
    const bradyAt = ar.extreme.brady ?? Math.max(lo, (hrl?.low ?? lo) - EXTREME_OFFSET);
    const tachyAt = ar.extreme.tachy ?? Math.min(hi, (hrl?.high ?? hi) + EXTREME_OFFSET);
    // one bpm of hysteresis (the limit alarms get the same rule in FU-5 Task 9), the event hold (≥ 5 s once raised) and
    // a clear delay: a live extreme alarm ends only after EXTREME_CLEAR_S back inside its threshold (review F9 [ENG]) —
    // in AF 150 the HR dipped below 140 for 1–2 s a dozen times, and each dip ended EXTREME TACHY and let HR HIGH blip
    const seen = (inp.extremeSeen ??= {});
    const beyond = (id: string, now: boolean, band: boolean) => {
      if (now) seen[id] = t;
      return now || (holdingId(s, id) && (band || t - (seen[id] ?? -Infinity) < EXTREME_CLEAR_S));
    };
    if (beyond('EXTREME_BRADY', hrA < bradyAt, hrA <= bradyAt)) out.push({ ...fixed('EXTREME_BRADY', 1, 'physiological'), holdS: EVENT_HOLD_S });
    if (beyond('EXTREME_TACHY', hrA > tachyAt, hrA >= tachyAt)) out.push({ ...fixed('EXTREME_TACHY', 1, 'physiological'), holdS: EVENT_HOLD_S });
  }

  // ECG: technical first; lethal arrhythmias whenever leads are on (they cannot be switched off, brief §6.4.1).
  if (inp.leadsOff) out.push(fixed('ecgLeadsOff', 3, 'technical'));
  else {
    const vf = inp.vfSince !== null && t - inp.vfSince >= VF_CONFIRM_S;
    if (vf) out.push(fixed('VFIB', 1, 'physiological'));
    const since = Math.max(inp.lastQrsT ?? -Infinity, inp.ecgOnSince);
    // FU-5 (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6): once ASYSTOLE stands, an agonal beat (R–R ≥
    // AGONAL_RR_S, < 20/min, research/03 §1.5) does not end it — the arrest alarm governs; two beats closer than that
    // (a rhythm returning) do. Without it each agonal beat cleared ASYSTOLE and let EXTREME BRADY re-raise (11 red
    // raises in Ali's case after FU-4's arrest; mindray-like, which does not latch, re-raised ASYSTOLE 15 times in 4 min)
    const lastRR = inp.lastQrsT !== null && inp.prevQrsT != null ? inp.lastQrsT - inp.prevQrsT : Infinity;
    const agonal = holdingId(s, 'ASYSTOLE') && lastRR >= AGONAL_RR_S;
    if (!vf && (t - since >= p.arrhythmia.asystoleS || agonal)) out.push(fixed('ASYSTOLE', 1, 'physiological'));
    const v = inp.vt;
    if (v.count >= p.arrhythmia.vtacCount && t - v.lastT < VT_GAP_S) {
      const rate = (60 * (v.count - 1)) / Math.max(1e-3, v.lastT - v.firstT);
      if (rate >= p.arrhythmia.vtacRate) out.push(fixed('VTAC', 1, 'physiological'));
    }
    if (s.cfg.arrhythmia && !hrSuppressed) {
      const hr = valid(inp, 'hr', t);
      if (hr !== null && hr > 0) {
        if (ar.brady !== null && hr <= ar.brady) out.push(fixed('BRADY', 2, 'physiological'));
        if (ar.tachy !== null && hr >= ar.tachy) out.push(fixed('TACHY', 2, 'physiological'));
      }
      const gap = inp.lastQrsT === null ? 0 : t - inp.lastQrsT;
      const pauseAt = 'ratio' in ar.pause ? (inp.meanRR ?? Infinity) * ar.pause.ratio : ar.pause.s;
      if (ar.pauseAlarm && !vf && gap > pauseAt && gap < ar.asystoleS) out.push({ ...fixed('PAUSE', 2, 'physiological'), holdS: EVENT_HOLD_S });
      if (inp.pvcTimes.filter((x) => x > t - 60).length >= p.arrhythmiaPvcPerMin) out.push(fixed('PVCS', 2, 'physiological'));
    }
  }
  // APNEA (brief §6.4 "apnoea (20 s)"; §6.4.1 always on, level 1): what the monitor's own detectors see — Stage 3's
  // capnograph (awRR, `apnoea-co2`) and impedance (`apnoea-resp`) flags, re-issued with the SAME ids, the skin's level
  // and text (as ecgLeadsOff / nibp-failed). APNEA LIMIT OFF (a preset, research/06 §3.1 F7) disables both.
  // FU-5 (audit M2): ONE apnoea, ONE alarm — from the active respiratory source only: the capnograph while it measures,
  // else the impedance (Philips "***APNEA" from CO2, Resp or AGM, [S2] IFU p. 41; Saadat's CAPNO/RESP key selects
  // one RR source, research/06 §4.1).
  const apnoeaSrc = inp.co2 === 'on' ? 'apnoea-co2' : 'apnoea-resp';
  if (p.apneaS !== null && inp.apnoeaFlags.includes(apnoeaSrc)) out.push(fixed(apnoeaSrc, 1, 'physiological'));
  if (inp.co2Line || inp.co2 === 'occluded') out.push({ ...fixed('co2Line', 3, 'technical'), numeric: 'etco2' });
  if (inp.spo2Probe === 'off') out.push(fixed('spo2SensorOff', 3, 'technical'));
  // FU-5 (audit M8): the technical alarms real monitors raise from the signals themselves ([S2] IFU p. 44, 53–61;
  // research/06 §4.2); `numeric` marks the value the INOP replaces ("-?-") in the tile
  if (inp.spo2Probe === 'on' && t - inp.spo2OnSince >= SPO2_SEARCH_S) {
    const m = inp.measured.spo2;
    const pi = inp.measured.pi;
    // clear hysteresis (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5; review F7): NON-PULSAT. holds until
    // the SpO2 has been valid NONPULS_CLEAR_S; LOW PERF until PI ≥ LOW_PERF_CLEAR_PI, or ≥ LOW_PERF_PI for
    // LOW_PERF_DELAY_S — and through a PI that is momentarily invalid (no fresh pulse for a few seconds) while the SpO2
    // is still shown [ENG]: LOW PERF was raised/cleared 7 times in 1–2 s cycles at the end of the 3 L bleed
    const okFor = (since: number | null | undefined, s0: number) => since !== null && since !== undefined && t - since >= s0;
    const nonPuls = (m !== undefined && m.flag === 'invalid') || (holdingId(s, 'spo2NonPulsatile') && !okFor(inp.spo2OkSince, NONPULS_CLEAR_S));
    const piV = pi && pi.value !== null && pi.flag !== 'invalid' ? pi.value : null;
    // FU-8 (F3, E-FU4-20): the clear hysteresis holds a RAISED LOW PERF only — while the INOP is pending its
    // LOW_PERF_DELAY_S the condition is the plain PI < LOW_PERF_PI, as for the limit alarms (FU-5 Task 9a, the vendor
    // on-delay: a condition that resolves within the delay raises nothing). With the pending entry held by the band, a
    // single PI dip to 0.30 at 596 s in the 3 L bleed raised LOW PERF at 601 s and cleared it 1.0 s later
    const lowPerf = piV !== null ? piV < LOW_PERF_PI || (raisedLiveId(s, 'spo2LowPerf') && piV < LOW_PERF_CLEAR_PI && !okFor(inp.piOkSince, LOW_PERF_DELAY_S)) : raisedLiveId(s, 'spo2LowPerf');
    if (nonPuls) out.push({ ...fixed('spo2NonPulsatile', 3, 'technical'), numeric: 'spo2' });
    else if (lowPerf) out.push({ ...fixed('spo2LowPerf', 3, 'technical', LOW_PERF_DELAY_S), numeric: 'spo2' });
  }
  if (inp.abp === 'zeroing') out.push({ ...fixed('abpZero', 3, 'technical'), numeric: 'abpMean' });
  else if (inp.abp !== 'none') {
    const mean = valid(inp, 'abpMean', t);
    const keep = p.ibpStaticDisplay === 'keep';
    if (mean !== null && (inp.measured.abpSys?.flag === 'invalid' || inp.measured.prAbp?.flag === 'invalid')) {
      // a static pressure (the non-pulsatile rule, pressure-numerics): the INOP marks the pulse ('keep': S/D/M stay,
      // [S2] p. 57 "Pulse numeric is displayed with -?-") or the hidden S/D ('mean-only', Saadat); the red disconnect
      // below 10 mmHg where the skin has it on (saadat-like: OFF by default, research/06 §4.1). The engine raises the
      // INOP whatever the pulse source [ENG]; an IntelliVue raises it only for the pressure selected as the pulse source
      out.push({ ...fixed('abpNonPulsatile', 3, 'technical'), numeric: keep ? 'prAbp' : 'abpSys' });
      if (p.abpDisconnect && mean < DISCONNECT_MMHG) out.push({ ...fixed('abpDisconnect', 1, 'physiological', DISCONNECT_DELAY_S), numeric: 'abpMean' });
    }
  }
  if (inp.temp === 'off' && inp.tempSeen) out.push({ ...fixed('tempProbeOff', 3, 'technical'), numeric: 'tempCore' });
  if (inp.nibpFailed) out.push(fixed('nibp-failed', 3, 'technical'));
  return chain(out, s);
}

/**
 * FU-5: mark the conditions a CHAIN parent explains as `suppressed`; the manager clears them (never latches them). A
 * suppressor is a parent whose CONDITION is present this tick, or whose entry was LIVE (raised, not latched) at the
 * previous tick — "lower priority alarms in the same chain will not be announced while an alarm is active" ([S2] IFU
 * p. 99; p. 97: indications are inhibited "if a more serious alarm condition is active"). The previous-tick case closes
 * the one tick in which a parent's condition has ended but its entry is not yet latched or cleared (22 zero-length
 * `**HR 140>120` raise/clear pairs in Ali's case). A LATCHED entry never suppresses: its condition has ended, so a
 * post-ROSC bradycardia under a latched ASYSTOLE alarms, and a VT after a latched VF raises VTAC (Orchestrator ruling
 * (FU-5 review), 2026-09-28, ruling 2). Rank is the chain position, not the level: a parent suppresses every member it
 * lists (ASYSTOLE and EXTREME BRADY are both red).
 */
export function chain(out: Condition[], s?: AlarmMgrState): Condition[] {
  const sup = (id: string) => {
    const x = CHAIN[id];
    if (x) for (const c of out) if (c.id !== id && x.includes(c.id)) c.suppressed = true;
  };
  for (const c of out) sup(c.id);
  if (s) for (const e of Object.values(s.active)) if (!e.latched) sup(e.id);
  return out;
}
