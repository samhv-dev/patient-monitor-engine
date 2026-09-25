// Alarm conditions (brief §6.4 "Conditions", §6.4.1, §6.2 sensors; research 03 §1.12, §8.10): what the monitor
// sees — displayed numerics, QRS detections, beat classes, sensor states — turned into this tick's true conditions.
// Inputs are plain JSON-safe data the engine keeps up to date (observe* functions); buildConditions is pure.
import type { EngineEvent, Measured, NumericId } from '../../types.ts';
import { isEnabled, limitOf, type AlarmMgrState, type Condition } from './manager.ts';
import { fixedText, limitText, type FixedAlarmId } from './text.ts';

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
const RR_EMA = 0.2; // mean R-R for the Saadat-like pause ratio (brief §6.4.1 "R-R > 2.1× mean R-R") [ENG weight]

export interface AlarmInputs {
  measured: Partial<Record<NumericId, Measured>>;
  lastQrsT: number | null;
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
}

export function createInputs(t0 = 0): AlarmInputs {
  return {
    measured: {}, lastQrsT: null, meanRR: null, ecgOnSince: t0, leadsOff: false, vfSince: null,
    vt: { count: 0, firstT: 0, lastT: -1e9 }, pvcTimes: [], spo2Probe: 'on', nibpFailed: false, pacing: false,
  };
}

/** A QRS detection at R time tR (s). */
export function observeQrs(inp: AlarmInputs, tR: number): void {
  if (inp.lastQrsT !== null) {
    const rr = tR - inp.lastQrsT;
    if (rr > 0.2) inp.meanRR = inp.meanRR === null ? rr : inp.meanRR + RR_EMA * (rr - inp.meanRR);
  }
  inp.lastQrsT = tR;
}

/** An engine event the device layer sees (measurements, beats, NIBP results and the raw technical flags). */
export function observeEvent(inp: AlarmInputs, e: EngineEvent): void {
  if (e.type === 'measurement') {
    for (const [k, m] of Object.entries(e.values)) if (m) inp.measured[k as NumericId] = m;
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
  } else if (e.type === 'nibp' && (e.phase === 'inflating' || e.result !== undefined)) {
    inp.nibpFailed = false;
  }
}

function valid(inp: AlarmInputs, id: NumericId, t: number): number | null {
  const m = inp.measured[id];
  if (!m || m.value === null || m.flag === 'invalid') return null;
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
  const hrSuppressed = inp.pacing && p.hrDashesWhilePacing; // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6)

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
  for (const [key, d] of Object.entries(p.limits)) {
    if (!isEnabled(s, key) || (hrSuppressed && d.numeric === 'hr')) continue;
    const v = valid(inp, d.numeric, t);
    const l = limitOf(s, key);
    if (v === null || !l) continue;
    const delayS = d.numeric === 'spo2' ? p.spo2DelayS : p.delayS;
    const c = { level: d.level, category: 'physiological' as const, delayS, numeric: d.numeric };
    if (l.high !== null && v > l.high) out.push({ id: `${key}_HIGH`, text: limitText(p, d, 'HIGH', v), ...c });
    if (l.low !== null && v < l.low) out.push({ id: `${key}_LOW`, text: limitText(p, d, 'LOW', v), ...c });
  }
  const spo2 = valid(inp, 'spo2', t);
  if (p.desat !== null && spo2 !== null && spo2 < p.desat && isEnabled(s, 'SpO2')) out.push({ ...fixed('DESAT', 1, 'physiological', DESAT_DELAY_S), numeric: 'spo2' });

  // ECG: technical first; lethal arrhythmias whenever leads are on (they cannot be switched off, brief §6.4.1).
  if (inp.leadsOff) out.push(fixed('ecgLeadsOff', 3, 'technical'));
  else {
    const vf = inp.vfSince !== null && t - inp.vfSince >= VF_CONFIRM_S;
    if (vf) out.push(fixed('VFIB', 1, 'physiological'));
    const since = Math.max(inp.lastQrsT ?? -Infinity, inp.ecgOnSince);
    if (!vf && t - since >= p.arrhythmia.asystoleS) out.push(fixed('ASYSTOLE', 1, 'physiological'));
    const v = inp.vt;
    if (v.count >= p.arrhythmia.vtacCount && t - v.lastT < VT_GAP_S) {
      const rate = (60 * (v.count - 1)) / Math.max(1e-3, v.lastT - v.firstT);
      if (rate >= p.arrhythmia.vtacRate) out.push(fixed('VTAC', 1, 'physiological'));
    }
    if (s.cfg.arrhythmia && !hrSuppressed) {
      const hr = valid(inp, 'hr', t);
      const ar = p.arrhythmia;
      if (hr !== null && hr > 0) {
        if (ar.brady !== null || ar.tachy !== null) {
          if (ar.brady !== null && hr <= ar.brady) out.push(fixed('BRADY', 2, 'physiological'));
          if (ar.tachy !== null && hr >= ar.tachy) out.push(fixed('TACHY', 2, 'physiological'));
        } else {
          const hrl = limitOf(s, 'HR');
          const [lo, hi] = EXTREME_CLAMP[p.ageBand];
          const bradyAt = Math.max(lo, (hrl?.low ?? lo) - EXTREME_OFFSET);
          const tachyAt = Math.min(hi, (hrl?.high ?? hi) + EXTREME_OFFSET);
          if (hr < bradyAt) out.push(fixed('EXTREME_BRADY', 1, 'physiological'));
          if (hr > tachyAt) out.push(fixed('EXTREME_TACHY', 1, 'physiological'));
        }
      }
      const gap = inp.lastQrsT === null ? 0 : t - inp.lastQrsT;
      const pauseAt = 'ratio' in ar.pause ? (inp.meanRR ?? Infinity) * ar.pause.ratio : ar.pause.s;
      if (!vf && gap > pauseAt && gap < ar.asystoleS) out.push(fixed('PAUSE', 2, 'physiological'));
      if (inp.pvcTimes.filter((x) => x > t - 60).length >= p.arrhythmiaPvcPerMin) out.push(fixed('PVCS', 2, 'physiological'));
    }
  }
  if (inp.spo2Probe === 'off') out.push(fixed('spo2SensorOff', 3, 'technical'));
  if (inp.nibpFailed) out.push(fixed('nibp-failed', 3, 'technical'));
  return out;
}
