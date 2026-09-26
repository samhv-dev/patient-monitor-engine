// Respiratory driver (brief §4.7; research 03 §7): ONE ground-truth breath scheduler whose cycles feed the
// capnogram, gas exchange, the impedance channel, the haemodynamic breath signal u(t) (coupling rule M6, the
// seam that replaces Stage 2's fixed 15/min clock) and the `breath` events. Sources: spontaneous (rr/vt from
// the L1 targets), BVM, ventilator, external (VentFrame, R27) or none. Airway states change what each cycle
// does: exchange gas, reach the CO2 sampler, move the chest. Plain JSON-safe data.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { AirwayState, BreathKind, VentFrame, VentSource } from '../../types-resp.ts';

export const INSP_FLOW_LPS = 0.05; // externalDrive: inspiration starts at flow > +0.05 L/s (brief §7.6) [ENG]
export const DRIVE_TIMEOUT_S = 5; // no VentFrame for 5 s → the external drive is gone (apnoea) [ENG]
export const U_REF_CMH2O = 10; // alveolar swing of the Stage 2 reference breath (VT 500 at C 50) → u swing 1.0
export const SPONT_PPL_CMH2O = 4; // spontaneous pleural swing, 3–8 cmH2O negative [ENG]
export const SPONT_TI_FRACTION = 0.38; // spontaneous I:E ≈ 1:1.6 [ENG]
export const SPONT_JITTER = 0.05; // breath-to-breath SD of period and VT, spontaneous [ENG]
export const GASTRIC_BREATHS = 5; // oesophageal: breaths with gastric CO2 before the trace is flat [ENG, < 6]
export const EXP_TAU_S = 0.5; // passive expiration τ = R·C (10 cmH2O/L/s × 0.05 L/cmH2O)
/** JSON-safe 'never' (snapshots travel as JSON: Infinity would become null). */
export const NEVER = 1e12;

/** What the CO2 sampler sees during a cycle: alveolar gas, nothing, or gastric gas (oesophageal intubation). */
export type Sampled = 'alveolar' | 'none' | 'gastric';
/** Capnogram shape family (research 03 §4.3). */
export type Shape = 'mech' | 'spont' | 'shark' | 'bifid';

export interface Cycle {
  seq: number;
  t0: number;
  ti: number;
  te: number;
  vt: number; // mL reaching the lungs
  kind: BreathKind;
  mech: boolean; // positive pressure (true) or negative (spontaneous)
  exch: boolean; // gas exchange happens
  sampled: Sampled;
  gastric: number; // gastric CO2 peak (mmHg) when sampled === 'gastric'
  effort: number; // chest-wall movement for impedance, 0–1.5
  shape: Shape;
  severity: number;
  cleft: number; // curare cleft effort 0–1
  fio2: number;
  fico2: number;
  /** Airway loss mid-cycle: from this time the cycle neither exchanges nor reaches the sampler. */
  cutAt: number;
  emitted: boolean;
}

export interface ExtDrive {
  lastT: number;
  inInsp: boolean;
  frames: number[]; // flattened [t, paw, volumeMl] triples, last 6 s
  meanPaw: number;
  peep: number;
  fio2: number;
  prevTi: number;
  prevTe: number;
}

export interface DriverState {
  source: VentSource | 'external';
  airway: AirwayState;
  severity: number;
  vent: { rr: number; vt: number; peep: number; ie: number };
  fico2: number;
  cleft: number;
  preox: { fio2: number; until: number } | null;
  cycles: Cycle[];
  nextT: number;
  seq: number;
  gastricN: number;
  ext: ExtDrive | null;
  rng: Sfc32State;
}

export interface DriverCtx {
  rr: number; // L1 rr target (spontaneous)
  vt: number; // L1 vt target (spontaneous)
  fio2: number; // L1 fio2 (room air 0.21 by default)
  etco2: number; // current true EtCO2 (gastric washout height)
  complianceMl: number;
}

export function createDriver(rng: Sfc32State): DriverState {
  return {
    source: 'spontaneous', airway: 'patent', severity: 1,
    vent: { rr: 12, vt: 500, peep: 5, ie: 2 },
    fico2: 0, cleft: 0, preox: null, cycles: [], nextT: 0, seq: 0, gastricN: 0, ext: null, rng,
  };
}

const cycleEnd = (c: Cycle) => c.t0 + c.ti + c.te;

/** The cycle containing t (last one starting at or before t), or undefined. */
export function cycleAt(d: DriverState, t: number): Cycle | undefined {
  for (let i = d.cycles.length - 1; i >= 0; i--) {
    const c = d.cycles[i] as Cycle;
    if (c.t0 <= t) return t < cycleEnd(c) ? c : undefined;
  }
  return undefined;
}

/** The last cycle that started at or before t (running or finished). */
export function lastCycleBefore(d: DriverState, t: number): Cycle | undefined {
  for (let i = d.cycles.length - 1; i >= 0; i--) if ((d.cycles[i] as Cycle).t0 <= t) return d.cycles[i];
  return undefined;
}

export function preoxActive(d: DriverState, t: number): boolean {
  return d.preox !== null && t < d.preox.until;
}

/** FiO2 of the gas the next breath brings (brief §7.2 ventilation.fio2, preoxygenate; room air otherwise). */
function fio2For(d: DriverState, ctx: DriverCtx, t: number, mech: boolean): number {
  if (preoxActive(d, t)) return (d.preox as { fio2: number }).fio2;
  if (d.airway === 'disconnected') return 0.21;
  return mech || d.source === 'spontaneous' ? ctx.fio2 : 0.21;
}

/** Build the next cycle from the source and airway state, or null (no breath: apnoea / source none). */
function makeCycle(d: DriverState, ctx: DriverCtx, t: number): { c: Cycle | null; period: number } {
  const src = d.source;
  if (src === 'none' || src === 'external') return { c: null, period: 0.5 };
  const mech = src !== 'spontaneous';
  if (!mech && d.airway === 'apnoea') return { c: null, period: 0.5 };
  let rr: number;
  let vt: number;
  let ti: number;
  if (mech) {
    rr = src === 'bvm' ? Math.max(4, d.vent.rr) : d.vent.rr;
    vt = d.vent.vt;
    ti = 60 / rr / (1 + d.vent.ie);
  } else {
    if (ctx.rr < 1) return { c: null, period: 0.5 };
    rr = ctx.rr;
    vt = ctx.vt * Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));
    ti = 0;
  }
  let period = 60 / rr;
  if (!mech) {
    period *= Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));
    ti = SPONT_TI_FRACTION * period;
  }
  const sev = d.severity;
  const c: Cycle = {
    seq: d.seq, t0: t, ti, te: period - ti, vt, kind: src === 'bvm' ? 'bvm' : mech ? 'mech' : 'spont', mech,
    exch: true, sampled: 'alveolar', gastric: 0, effort: mech ? vt / 500 : vt / 500, shape: mech ? 'mech' : 'spont',
    severity: sev, cleft: mech ? d.cleft : 0, fio2: fio2For(d, ctx, t, mech), fico2: d.fico2, cutAt: NEVER, emitted: false,
  };
  switch (d.airway) {
    case 'obstructed': // efforts without flow (spontaneous) or a kinked tube (mechanical)
      c.exch = false;
      c.sampled = 'none';
      c.vt = 0;
      c.effort = mech ? 0 : 1;
      break;
    case 'disconnected': // spontaneous: room air through the open tube; mechanical: nothing reaches the patient
      c.sampled = 'none';
      if (mech) {
        c.exch = false;
        c.vt = 0;
        c.effort = 0;
      }
      break;
    case 'oesophageal': // gastric insufflation: < 6 breaths of decreasing CO2 (research 03 §4.3): 5 here
      c.exch = false;
      c.vt = 0;
      c.effort = 0.3;
      c.sampled = d.gastricN < GASTRIC_BREATHS ? 'gastric' : 'none';
      c.gastric = ctx.etco2 * 0.45 * 0.6 ** d.gastricN; // [ENG] washout heights
      d.gastricN++;
      break;
    case 'bronchospasm':
      c.shape = 'shark';
      c.vt = vt * (1 - 0.2 * sev); // [ENG] less volume behind the obstruction
      break;
    case 'endobronchial':
      c.shape = 'bifid';
      break;
    default:
      break;
  }
  d.seq++;
  return { c, period };
}

/** Plan cycles up to `until` (sim s). */
export function planCycles(d: DriverState, ctx: DriverCtx, until: number): void {
  while (d.nextT <= until) {
    const { c, period } = makeCycle(d, ctx, d.nextT);
    if (c) d.cycles.push(c);
    d.nextT += period;
  }
}

/** Drop cycles that end before `t` (keep enough history for the sidestream delay and u(t − 2·RR)). */
export function pruneCycles(d: DriverState, t: number): void {
  while (d.cycles.length > 1 && cycleEnd(d.cycles[0] as Cycle) < t) d.cycles.shift();
}

/**
 * A command changed the source or airway at time t: planned cycles after t are dropped, and when `cut` the running
 * cycle stops exchanging now (airway loss is immediate: brief §4.9 M4). Returns the seqs whose breath events
 * must be withdrawn.
 */
export function replan(d: DriverState, t: number, cut: boolean, restartNow: boolean): number[] {
  const dropped = d.cycles.filter((c) => c.t0 > t).map((c) => c.seq);
  d.cycles = d.cycles.filter((c) => c.t0 <= t);
  const cur = cycleAt(d, t);
  if (cur && cut) cur.cutAt = Math.min(cur.cutAt, t);
  if (restartNow || !cur) {
    if (cur) cur.te = Math.max(0, t - cur.t0 - cur.ti);
    if (cur && t < cur.t0 + cur.ti) {
      cur.ti = t - cur.t0;
      cur.te = 0;
    }
    d.nextT = t;
  } else d.nextT = cycleEnd(cur);
  return dropped;
}

// --- external drive (R27: VentFrame in) ------------------------------------------------------------------
export function onVentFrame(d: DriverState, f: VentFrame, t: number): void {
  let e = d.ext;
  if (d.source !== 'external' || !e) {
    replan(d, t, false, true);
    d.source = 'external';
    e = { lastT: t, inInsp: false, frames: [], meanPaw: f.pawCmH2O, peep: f.peepCmH2O, fio2: f.fio2, prevTi: 1, prevTe: 3 };
    d.ext = e;
  }
  e.lastT = t;
  e.peep = f.peepCmH2O;
  e.fio2 = f.fio2;
  e.frames.push(t, f.pawCmH2O, f.volumeMl);
  while (e.frames.length > 3 && (e.frames[0] as number) < t - 6) e.frames.splice(0, 3);
  // mean airway pressure over the last breath cycle (≤ 6 s of frames), so it does not ripple within a breath
  const win = Math.min(6, e.prevTi + e.prevTe);
  let sum = 0;
  let n = 0;
  for (let i = e.frames.length - 3; i >= 0 && (e.frames[i] as number) > t - win; i -= 3) {
    sum += e.frames[i + 1] as number;
    n++;
  }
  e.meanPaw = n > 0 ? sum / n : f.pawCmH2O;
  const cur = lastCycleBefore(d, t);
  const insp = f.phase ? f.phase === 'insp' : f.flowLps > INSP_FLOW_LPS;
  if (!e.inInsp && insp) {
    if (cur) {
      cur.te = Math.max(0.05, t - cur.t0 - cur.ti);
      e.prevTe = cur.te;
    }
    const exchange = d.airway !== 'disconnected' && d.airway !== 'obstructed' && d.airway !== 'oesophageal';
    d.cycles.push({
      seq: d.seq++, t0: t, ti: e.prevTi, te: e.prevTe, vt: 0, kind: 'mech', mech: true, exch: exchange,
      sampled: exchange ? 'alveolar' : 'none', gastric: 0, effort: 0, shape: d.airway === 'bronchospasm' ? 'shark' : d.airway === 'endobronchial' ? 'bifid' : 'mech',
      severity: d.severity, cleft: d.cleft, fio2: preoxActive(d, t) ? (d.preox as { fio2: number }).fio2 : f.fio2,
      fico2: d.fico2, cutAt: NEVER, emitted: false,
    });
    e.inInsp = true;
  } else if (e.inInsp && !insp && cur) {
    cur.ti = Math.max(0.05, t - cur.t0);
    e.prevTi = cur.ti;
    e.inInsp = false;
  }
  if (cur && t - cur.t0 < cur.ti + cur.te + 0.1) {
    cur.vt = Math.max(cur.vt, f.volumeMl);
    cur.effort = cur.vt / 500;
  }
  const now = lastCycleBefore(d, t);
  if (now && now.t0 === t) now.vt = Math.max(now.vt, f.volumeMl);
}

/** External drive watchdog: frames stopped → no more breaths (the vent sim was closed or disconnected). */
export function checkDrive(d: DriverState, t: number): void {
  if (d.source === 'external' && d.ext && t - d.ext.lastT > DRIVE_TIMEOUT_S) {
    d.source = 'none';
    d.ext = null;
    d.nextT = t;
  }
}

export function frameAt(e: ExtDrive, t: number, k: 1 | 2): number { // Stage 7a: exported for the pleural input
  const f = e.frames;
  if (f.length < 3) return 0;
  if (t >= (f[f.length - 3] as number)) return f[f.length - 3 + k] as number;
  for (let i = f.length - 6; i >= 0; i -= 3) {
    const ta = f[i] as number;
    if (ta <= t) {
      const tb = f[i + 3] as number;
      const w = (t - ta) / Math.max(1e-6, tb - ta);
      return (f[i + k] as number) * (1 - w) + (f[i + 3 + k] as number) * w;
    }
  }
  return f[k] as number;
}

/** Lung volume above FRC (mL) at time t within cycle c (constant-flow inspiration, passive expiration). */
export function cycleVolume(c: Cycle, t: number): number {
  const u = t - c.t0;
  if (u < 0) return 0;
  const vt = c.vt > 0 ? c.vt : 500 * c.effort; // obstructed efforts still move the chest
  if (u < c.ti) return c.mech ? (vt * u) / Math.max(1e-3, c.ti) : (vt * (1 - Math.cos((Math.PI * u) / c.ti))) / 2;
  const w = u - c.ti;
  if (c.mech) return vt * Math.exp(-w / EXP_TAU_S);
  const act = 0.6 * c.te;
  return w < act ? (vt * (1 + Math.cos((Math.PI * w) / act))) / 2 : 0;
}

/** Mean over one cycle of cycleVolume (analytic), to centre u(t) on 0.5. */
function meanVolume(c: Cycle): number {
  const vt = c.vt > 0 ? c.vt : 500 * c.effort;
  const T = Math.max(1e-3, c.ti + c.te);
  if (c.mech) return (vt * (c.ti / 2 + EXP_TAU_S * (1 - Math.exp(-c.te / EXP_TAU_S)))) / T;
  return (vt * (c.ti / 2 + 0.3 * c.te)) / T;
}

/** Chest volume (mL above FRC) for the impedance channel: every cycle that moves the chest. */
export function chestVolume(d: DriverState, t: number): number {
  if (d.source === 'external' && d.ext) return Math.max(0, frameAt(d.ext, t, 2));
  const c = cycleAt(d, t);
  return c && c.effort > 0 ? cycleVolume(c, t) : 0;
}

/**
 * The haemodynamic breath signal for Stage 2's respFactor/cvpAt (seam): u(t) = 0.5 + swing, zero-mean over a
 * cycle, swing 1.0 peak-to-peak for the reference positive-pressure breath (VT 500 mL at C 50 → 10 cmH2O), the
 * same scale as Stage 2's breathU. Spontaneous breaths swing NEGATIVE (pleural pressure falls on inspiration).
 * Apnoea → 0.5 (no respiratory variation).
 */
export function breathSignal(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return 0.5 + (frameAt(d.ext, t, 1) - d.ext.meanPaw) / U_REF_CMH2O;
  const c = cycleAt(d, t);
  if (!c || !(c.vt > 0) || t >= c.cutAt) return 0.5;
  const dv = cycleVolume(c, t) - meanVolume(c);
  if (c.mech) return 0.5 + dv / complianceMl / U_REF_CMH2O;
  return 0.5 - (dv / Math.max(1, c.vt)) * (SPONT_PPL_CMH2O / U_REF_CMH2O);
}

/** Mean airway pressure (cmH2O) now: PEEP + mean alveolar swing (internal), or the drive's running mean. */
export function meanAirwayPressure(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return d.ext.meanPaw;
  if (d.source !== 'ventilator' && d.source !== 'bvm') return 0;
  const c = lastCycleBefore(d, t);
  const peep = d.source === 'ventilator' ? d.vent.peep : 0;
  return c && c.exch ? peep + meanVolume(c) / complianceMl : peep;
}

/** Alveolar ventilation (L/min) delivered at time t: the exchanging cycle's (VT − VD)/period, else 0. */
export function alveolarVentilation(d: DriverState, t: number, deadSpaceMl: number): number {
  const c = cycleAt(d, t);
  if (!c || !c.exch || t >= c.cutAt) return 0;
  const T = c.ti + c.te;
  return T > 0 ? (Math.max(0, c.vt - deadSpaceMl) * 60) / T / 1000 : 0;
}

/** Nominal breaths/min and VT of the current settings (MANUAL calibration and the `state` event). */
export function nominalRate(d: DriverState, ctx: DriverCtx): { rr: number; vt: number } {
  if (d.source === 'ventilator' || d.source === 'bvm') return { rr: d.vent.rr, vt: d.vent.vt };
  if (d.source === 'external') {
    const c = lastCycleBefore(d, Infinity);
    return c ? { rr: 60 / Math.max(0.5, c.ti + c.te), vt: c.vt } : { rr: 0, vt: 0 };
  }
  return { rr: ctx.rr, vt: ctx.vt };
}
