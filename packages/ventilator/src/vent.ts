// The ventilator engine: the original simulator's stepPhysics / controller / advancePhase / patientTriggers /
// startInspiration / startExpiration / updateMeasurements / pushSample (v1.9), as pure functions over a plain
// JSON `VentState`. One step = 5 ms (4 Euler sub-steps of 1.25 ms), so one 20 ms patient-engine tick = 4 steps.
// Stage V additions are marked `// Stage V` and never run on the reference scenarios (circuit, apnoea clock).
import { clamp, easeShape, expResistance, pmusDuration, pmusValue, recoilPressure, simRand } from './mechanics.ts';
import { DEFAULT_CONFIG, PRESET_KEYS, PRESETS, type PresetId } from './presets.ts';
import type { Measured, VentConfig, VentMode, VentPhysics, VentState } from './types.ts';

export const DT = 0.005;
export const SUBSTEPS = 4;
export const SEED0 = 12345;
const DISPLAY_LAG = 0.11; // first-order display lag per step (v1.8 "valve/sensor dynamics")

const zeroMeasured = (peep: number): Measured => ({ PIP: 0, PLAT: 0, RR: 0, VTE: 0, MV: 0, P01: 0, autoPEEP: 0, Pmean: peep });

export function createVent(cfg: Partial<VentConfig> = {}): VentState {
  const c: VentConfig = { ...DEFAULT_CONFIG, ...cfg };
  const p: VentPhysics = {
    V: 0, Q: 0, Paw: 5, Pmus: 0, Palv: 5, t: 0, phase: 'exp', phaseT: 0, breathT: 0, targetPaw: 5, peakInspFlow: 0, vtDelivered: 0,
    prvcPressure: 15, lastVTE: 0, neuralT: 0, neuralMult: 1, lastMandStart: 0, breathCount: 0, pipCur: 5, breathVstart: 0,
    curBreathSpont: false, lastPtT: null, measured: zeroMeasured(5), shown: null, breathTimes: [], markers: [],
    dPaw: null, dFlow: null, dispPaw: 5, dispFlowLpm: 0,
  };
  const vs: VentState = { cfg: c, p, seed: SEED0, flowTarget: 0, hold: null, pendingHold: null, n: 0, circuit: 'connected', lastBreathT: 0, silenceUntil: 0 };
  resetPhysics(vs);
  return vs;
}

/** v1.9 `resetPhysics` (the Reset button; also every scenario load). */
export function resetPhysics(vs: VentState): void {
  const c = vs.cfg;
  Object.assign(vs.p, {
    V: 0, Q: 0, Paw: c.peep, Palv: c.peep, phase: 'exp', phaseT: 0, breathT: 999, vtDelivered: 0, lastVTE: 0, prvcPressure: c.pc,
    neuralT: 0, neuralMult: 1, lastMandStart: 0, breathCount: 0, pipCur: c.peep, breathVstart: 0, curBreathSpont: false,
    measured: zeroMeasured(c.peep), breathTimes: [], markers: [], shown: null, dPaw: null, dFlow: null,
  } satisfies Partial<VentPhysics>);
  vs.hold = null;
  vs.pendingHold = null;
  vs.lastBreathT = vs.p.t; // Stage V
}

export function setMode(vs: VentState, m: VentMode): void {
  vs.cfg.mode = m;
  vs.cfg.modeLabel = null;
  if (m === 'PSV' || m === 'PAV') vs.cfg.spont = true;
}

export function loadPreset(vs: VentState, id: PresetId): void {
  const pr = PRESETS[id];
  if (!pr) return;
  Object.assign(vs.cfg, { airwayClosure: false, efl: false, uip: false });
  const target = vs.cfg as unknown as Record<string, unknown>;
  for (const k of PRESET_KEYS) if (pr[k] !== undefined) target[k] = pr[k];
  vs.cfg._preset = id;
}

function resetPatientDefaults(c: VentConfig): void {
  Object.assign(c, {
    spont: false, reverseTrig: false, cardiac: false, variability: false, efl: false, airwayClosure: false, uip: false, stressIdx: false,
    trigType: 'flow', flowTrig: 2.0, presTrig: -2.0, responsiveness: 80, pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, pmusOffset: 0.0,
  } satisfies Partial<VentConfig>);
}

/** v1.9 asynchrony scenarios (`SCENARIOS`). */
export const SCENARIOS: Record<string, { name: string; apply(vs: VentState): void }> = {
  revTrigPC: { name: 'Reverse Triggering (Early) PC', apply(vs) { setMode(vs, 'PC'); Object.assign(vs.cfg, { pc: 14, rate: 16, itime: 1.0, peep: 6, spont: true, pmus: 7, spontRate: 16, reverseTrig: true, entrainRatio: '1:1', pmusOffset: 0.25, compliance: 35, resistance: 12 }); } },
  revTrigVC: { name: 'Reverse Triggering (Early) VC', apply(vs) { setMode(vs, 'VC'); Object.assign(vs.cfg, { vt: 420, rate: 16, peep: 6, spont: true, pmus: 8, spontRate: 16, reverseTrig: true, entrainRatio: '1:1', pmusOffset: 0.3, compliance: 35, resistance: 12, vcFlow: 45 }); } },
  ineffective: { name: 'Ineffective Efforts', apply(vs) { setMode(vs, 'PC'); loadPreset(vs, 'copd'); Object.assign(vs.cfg, { pc: 14, rate: 12, itime: 1.0, peep: 5, spont: true, pmus: 4, spontRate: 22, responsiveness: 60, efl: true, eflSeverity: 'severe' }); } },
  earlyCycle: { name: 'Early Cycling', apply(vs) { setMode(vs, 'PSV'); Object.assign(vs.cfg, { ps: 10, peep: 5, cycleOff: 60, spont: true, pmus: 7, spontRate: 16, pmusRise: 0.3, pmusHold: 0.25, pmusDecay: 0.6, responsiveness: 100, flowTrig: 1.0, compliance: 30, resistance: 6 }); } },
  lateCycle: { name: 'Late Cycling', apply(vs) { setMode(vs, 'PSV'); loadPreset(vs, 'copd'); Object.assign(vs.cfg, { ps: 14, peep: 5, cycleOff: 10, spont: true, pmus: 8, spontRate: 16 }); } },
  breathStack: { name: 'Breath-Stacking', apply(vs) { setMode(vs, 'VC'); Object.assign(vs.cfg, { vt: 350, rate: 18, peep: 5, spont: true, pmus: 11, spontRate: 20, pmusDecay: 0.8, responsiveness: 95, compliance: 40, resistance: 12, vcFlow: 50 }); } },
  autoTrig: { name: 'Auto-trigger (False Trigger)', apply(vs) { setMode(vs, 'PSV'); Object.assign(vs.cfg, { ps: 10, peep: 5, flowTrig: 0.6, trigType: 'flow', spont: false, pmus: 0, cardiac: true, hr: 95, compliance: 55, resistance: 10 }); } },
};

export function runScenario(vs: VentState, id: string): void {
  const s = SCENARIOS[id];
  if (!s) return;
  resetPatientDefaults(vs.cfg);
  s.apply(vs);
  vs.cfg._preset = null;
  resetPhysics(vs);
}

const spontActive = (c: VentConfig) => c.spont || c.mode === 'PSV' || c.mode === 'PAV' || c.reverseTrig;
const vcTi = (c: VentConfig) => c.vt / 1000 / Math.max(0.05, c.vcFlow / 60);

function updateSpontaneous(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  if (!spontActive(c)) {
    p.neuralT = 0;
    return;
  }
  if (c.reverseTrig) return;
  p.neuralT += DT;
  const per = (60 / Math.max(4, c.spontRate)) * (p.neuralMult || 1);
  if (p.neuralT >= per) {
    p.neuralT -= per;
    p.neuralMult = c.variability ? 1 + (simRand(vs) - 0.5) * 2 * (c.varPct / 100) : 1;
  }
}

function currentPmus(vs: VentState): number {
  const c = vs.cfg;
  const p = vs.p;
  if (!spontActive(c)) return 0;
  let ph: number;
  if (c.reverseTrig) {
    const r = { '1:1': 1, '1:2': 2, '1:3': 3 }[c.entrainRatio] || 1;
    if ((p.breathCount || 0) % r !== 0) return 0;
    ph = p.t - ((p.lastMandStart || 0) + c.pmusOffset);
  } else ph = p.neuralT;
  if (ph < 0 || ph > pmusDuration(c)) return 0;
  return pmusValue(c, ph);
}

const rampTo = (vs: VentState, target: number) => target * Math.min(1, easeShape(vs.p.phaseT / Math.max(0.02, vs.cfg.riseTime), 'halfcos'));

function controller(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const peep = c.peep;
  if (p.phase === 'insp') {
    if (c.mode === 'VC') {
      const Ti = vcTi(c);
      const mean = c.vcFlow / 60;
      if (c.flowPattern === 'square') vs.flowTarget = mean;
      else vs.flowTarget = mean * (4 / 3 - (2 / 3) * clamp(p.phaseT / Ti, 0, 1));
    } else if (c.mode === 'PC') p.targetPaw = peep + Math.min(rampTo(vs, c.pc), c.pmax - peep);
    else if (c.mode === 'PRVC') p.targetPaw = peep + Math.min(rampTo(vs, p.prvcPressure), c.pmax - peep);
    else if (c.mode === 'PSV') p.targetPaw = peep + Math.min(rampTo(vs, c.ps), c.pmax - peep);
    else if (c.mode === 'PAV') {
      const g = c.pavAssist / 100;
      const as = g * (recoilPressure(c, p.V) + c.resistance * Math.max(0, p.Q));
      p.targetPaw = peep + clamp(as, 0, c.pmax - peep);
    }
  } else {
    p.targetPaw = peep;
    vs.flowTarget = 0;
  }
}

function patientTriggers(vs: VentState): boolean {
  const c = vs.cfg;
  const p = vs.p;
  const ap = p.measured.autoPEEP || 0;
  const net = Math.max(0, p.Pmus - ap);
  let sL = (net / Math.max(2, c.resistance)) * 60;
  let sP = net;
  if (c.cardiac && Math.abs(p.Q * 60) < 12) {
    const b = Math.max(0, Math.sin(2 * Math.PI * (c.hr / 60) * p.t));
    sL += b * 1.05;
    sP += b * 0.45;
  }
  if (sL <= 0.01 && sP <= 0.01) return false;
  if (c.trigType === 'flow') return sL >= c.flowTrig;
  return sP >= -c.presTrig;
}

export function startInspiration(vs: VentState, mandatory: boolean): void {
  const p = vs.p;
  p.measured.autoPEEP = Math.max(0, recoilPressure(vs.cfg, p.V));
  p.phase = 'insp';
  p.phaseT = 0;
  p.breathT = 0;
  p.vtDelivered = 0;
  p.peakInspFlow = 0;
  p.pipCur = p.Paw;
  if (mandatory) p.lastMandStart = p.t;
  p.breathVstart = p.V;
  p.breathCount++;
  p.curBreathSpont = !mandatory;
  if (!mandatory) p.lastPtT = p.t;
  p.markers.push({ t: p.t, type: mandatory ? 'mand' : 'pt' });
  if (p.markers.length > 60) p.markers.shift();
  vs.lastBreathT = p.t; // Stage V: apnoea clock
}

function startExpiration(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  p.phase = 'exp';
  p.phaseT = 0;
  p.measured.PIP = p.pipCur || p.Paw;
  const tidal = Math.max(0, p.V - (p.breathVstart || 0));
  p.lastVTE = tidal;
  p.measured.VTE = tidal;
  if (c.mode === 'PRVC') {
    const err = c.prvcTarget - tidal;
    p.prvcPressure = clamp(p.prvcPressure + clamp(err * 0.01, -3, 3), 5, c.pmax - c.peep);
  }
  p.breathTimes.push(p.t);
  while (p.breathTimes.length > 8) p.breathTimes.shift();
  p.shown = { ...p.measured };
}

function advancePhase(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  p.phaseT += DT;
  p.breathT += DT;
  const mp = 60 / Math.max(4, c.rate);
  const isSpont = c.mode === 'PSV' || c.mode === 'PAV';
  if (p.phase === 'insp') {
    let cyc = false;
    const Ti = c.mode === 'VC' ? vcTi(c) : c.itime;
    if (c.mode === 'VC') {
      // Correction C1 (Stage V): v1.9 compared the ABSOLUTE lung volume (vtDelivered = V) with VT, so trapped gas
      // shortened every breath and capped auto-PEEP; a volume-controlled breath delivers VT on top of trapped gas.
      if (p.V - p.breathVstart >= c.vt || p.phaseT >= Ti) cyc = true;
    } else if (c.mode === 'PC' || c.mode === 'PRVC') {
      if (p.phaseT >= c.itime) cyc = true;
    } else if (c.mode === 'PSV') {
      p.peakInspFlow = Math.max(p.peakInspFlow, p.Q);
      if (p.Q <= p.peakInspFlow * (c.cycleOff / 100) && p.phaseT > 0.15) cyc = true;
      if (p.phaseT > 3) cyc = true;
    } else if (c.mode === 'PAV') {
      if (p.Pmus <= 0.2 && p.phaseT > 0.2) cyc = true;
      if (p.phaseT > 3) cyc = true;
    }
    if (cyc) {
      p.measured.PLAT = c.peep + recoilPressure(c, p.V);
      if (c.pause > 0 && c.mode === 'VC') {
        p.phase = 'pause';
        p.phaseT = 0;
      } else startExpiration(vs);
      if (vs.pendingHold === 'insp') {
        vs.hold = 'insp';
        vs.pendingHold = null;
        p.measured.PLAT = c.peep + recoilPressure(c, p.V);
      }
    }
  } else if (p.phase === 'pause') {
    p.measured.PLAT = p.Palv;
    if (p.phaseT >= c.pause) startExpiration(vs);
  } else {
    const minEx = 0.25;
    let tg = false;
    let md = false;
    if (!isSpont && p.breathT >= mp) {
      tg = true;
      md = true;
    }
    if (p.phaseT >= minEx && patientTriggers(vs)) tg = true;
    if (isSpont && p.breathT >= Math.max(mp, 6)) {
      tg = true;
      md = true;
    }
    if (vs.pendingHold === 'exp' && p.phaseT > 0.3) {
      vs.hold = 'exp';
      vs.pendingHold = null;
      p.measured.autoPEEP = Math.max(0, recoilPressure(c, p.V));
      return;
    }
    if (tg) startInspiration(vs, md);
  }
}

function updateMeasurements(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const m = p.measured;
  if (p.phase === 'insp') p.pipCur = Math.max(p.pipCur || 0, p.Paw);
  m.Pmean = m.Pmean * 0.997 + p.Paw * 0.003;
  if (p.breathTimes.length >= 2) {
    let s = 0;
    for (let i = 1; i < p.breathTimes.length; i++) s += (p.breathTimes[i] as number) - (p.breathTimes[i - 1] as number);
    const a = s / (p.breathTimes.length - 1);
    m.RR = a > 0 ? 60 / a : 0;
  }
  m.VTE = p.lastVTE;
  m.MV = (m.RR * m.VTE) / 1000;
  m.P01 = c.spont || c.mode === 'PSV' || c.mode === 'PAV' ? Math.min(p.Pmus, pmusValue(c, 0.1)) : 0;
}

/** Display chain (v1.8 pushSample): first-order lag, then a 72/min cardiogenic ripple and sensor noise. */
function displaySample(vs: VentState): void {
  const p = vs.p;
  p.dPaw = p.dPaw == null ? p.Paw : p.dPaw + (p.Paw - p.dPaw) * DISPLAY_LAG;
  p.dFlow = p.dFlow == null ? p.Q * 60 : p.dFlow + (p.Q * 60 - p.dFlow) * DISPLAY_LAG;
  const card = Math.sin(2 * Math.PI * (72 / 60) * p.t);
  const pN = card * 0.12 + (simRand(vs) - 0.5) * 0.09;
  const fN = card * 0.9 + (simRand(vs) - 0.5) * 0.8;
  p.dispPaw = p.dPaw + pN;
  p.dispFlowLpm = p.dFlow + fN;
}

/** One 5 ms step (v1.9 `stepPhysics`). */
export function stepVent(vs: VentState): void {
  const c = vs.cfg;
  const p = vs.p;
  const R_in = c.resistance;
  const Rexp = expResistance(c);
  const peep = c.peep;
  const open = vs.circuit === 'disconnected'; // Stage V: the lung empties to the room, the vent reads 0
  updateSpontaneous(vs);
  p.Pmus = currentPmus(vs);
  controller(vs);
  for (let s = 0; s < SUBSTEPS; s++) {
    const dt = DT / SUBSTEPS;
    const recoil = recoilPressure(c, p.V);
    const Palv = peep + recoil - p.Pmus;
    let Q: number;
    if (open) {
      Q = (p.Pmus - peep - recoil) / Rexp;
      p.Paw = 0;
    } else if (vs.hold) {
      Q = 0;
      p.Paw = peep + recoil;
    } else if (p.phase === 'insp' && c.mode === 'VC') {
      Q = vs.flowTarget;
      p.Paw = peep + recoil + Q * R_in - p.Pmus;
      if (p.Paw > c.pmax) {
        p.Paw = c.pmax;
        Q = (p.Paw - peep - recoil + p.Pmus) / R_in;
      }
    } else if (p.phase === 'pause') {
      Q = 0;
      p.Paw = peep + recoil;
    } else {
      const paw = p.targetPaw;
      const Rn = p.phase === 'exp' ? Rexp : R_in;
      Q = (paw + p.Pmus - peep - recoil) / Rn;
      p.Paw = paw;
    }
    p.V += Q * 1000 * dt;
    if (p.V < 0) {
      p.V = 0;
      if (Q < 0) Q = 0;
    }
    p.Q = Q;
    p.Palv = Palv;
    p.t += dt;
  }
  if (c.cardiac) {
    const osc = Math.sin(2 * Math.PI * (c.hr / 60) * p.t);
    p.Q += osc * 0.006;
    p.Paw += osc * 0.15;
  }
  if (p.phase === 'insp') p.vtDelivered = p.V;
  if (!vs.hold) advancePhase(vs);
  updateMeasurements(vs);
  displaySample(vs);
  vs.n++;
}

/** Step until the vent clock reaches sim time `t` (s). Sim time = n·DT, so 4 steps per 20 ms engine tick. */
export function advanceVent(vs: VentState, t: number, onStep?: (vs: VentState) => void): void {
  while ((vs.n + 1) * DT <= t + 1e-9) {
    stepVent(vs);
    onStep?.(vs);
  }
}

// --- front-panel actions (v1.9 rail buttons) -------------------------------------------------------------
/** Insp/Exp hold: arm on the next cycle point; pressing again releases. */
export function toggleHold(vs: VentState, kind: 'insp' | 'exp'): void {
  if (vs.hold) vs.hold = null;
  else vs.pendingHold = kind;
}
/** Manual breath: a patient-type (non-mandatory) breath, only from expiration. */
export function manualBreath(vs: VentState): void {
  if (vs.p.phase === 'exp') startInspiration(vs, false);
}
export function setCircuit(vs: VentState, state: 'connected' | 'disconnected'): void {
  vs.circuit = state;
}
export const silenceAlarms = (vs: VentState): void => {
  vs.silenceUntil = vs.p.t + 120;
};
