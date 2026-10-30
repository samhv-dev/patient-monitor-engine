// E118 P0: the pulsus paradoxus link-diagnosis harness (tests only, no physiology change). It reads each link of the
// chain that should produce pulsus paradoxus — effort (ΔPpl) → venous surge (tricuspid inflow) → LV filling (mitral
// inflow) → LV output (SV, SBP), the transpericardial pressure and the pulmonary-vein-to-left-atrium gradient — in
// healthy, mild (100 mL) and severe (250 mL) tamponade and severe bronchospasm, all spontaneous at the controller's own
// breath (seed 7, 70 kg, MODELED), plus a bench of ventricular interdependence in apnoea (an RA bolus, Shabetai 1965
// group D). Every cell and band is the plan's (scratch/plans/e118-pulsus-coupling-plan.md §3.6), with its source on the
// `it`; a cell the engine misses today is `it.fails` with the measured number in its title (R45: no band is widened).
//
// How the internals are read (as circ-pulsus.test.ts reads `st.hemo.circ.beats`): the pipeline's reused `circOut`
// object gets an accessor on its LAST written field (`aAtria`) so every 2 ms evaluate is sampled into the harness — the
// circuit's own pressures and flows, nothing recomputed. Per-beat values come from the model's beat record (`beats`).
// The bolus is added to the RA volume `s[VRA]` by the test.
//
// Phase rule (the dogs' and the Doppler studies compare inspiration with expiration by the intrathoracic pressure):
// per breath, a sample is INSPIRATORY when the pleural pressure has fallen by ≥ 50 % of that breath's swing and
// EXPIRATORY when it is within 10 % of the breath's highest value. A beat's event is classified at the time of the
// event: inflow (tricuspid, mitral) at its flow-weighted centroid, ejection (SV, SBP) at mid-ejection, EDV at the
// activation onset. Relative changes are mean(inspiratory beats)/mean(expiratory beats) − 1 over the 2-min window.
// The per-breath peak-to-trough (max − min)/mean is printed beside it for the reader; the cells use the phase means.
//
// PME_LINKS_PRINT=1 prints the table of every measured number (console.table).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';
import type { MonitorEngine } from '../../src/types.ts';
import { CMH2O_TO_MMHG } from '../../src/l2/circ/params.ts';
import { pleuralPressureMmHg } from '../../src/l2/circ/pleural.ts';
import { S, V_EMPTY_ML, type CircOut } from '../../src/l2/circ/circuit.ts';
import type { CircBeat, CircModelState } from '../../src/l2/circ/model.ts';
import type { Cycle, DriverState } from '../../src/l2/resp/driver.ts';

const PRINT = !!process.env.PME_LINKS_PRINT;
const T_END = 600; // 10 sim-min, as circ-pulsus.test.ts
const T_WIN = 480; // the measurement window is the last 2 min

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access to the committed pipeline state
const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;
const circOf = (e: MonitorEngine): CircModelState => st(e).hemo.circ as CircModelState;
const driverOf = (e: MonitorEngine): DriverState => st(e).resp.driver as DriverState;
let cmdN = 0;
const send = (e: MonitorEngine, event: Record<string, unknown>): void => {
  const r = e.dispatch({ id: `links-${++cmdN}`, issuedBy: 'test', type: 'applyEvent', event } as unknown as Command) as { accepted: boolean; reason?: string };
  if (!r.accepted) throw new Error(`rejected ${JSON.stringify(event)}: ${r.reason}`);
};
const engine = (): MonitorEngine => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });

/** 2 ms samples of the circuit's own outputs. */
interface Samples { t: number[]; pIt: number[]; peri: number[]; pPv: number[]; pLa: number[]; qTv: number[]; qMv: number[] }
function hook(e: MonitorEngine): Samples {
  const hs = st(e).hemo;
  const m = hs.circ as CircModelState;
  const o = hs.circOut as CircOut;
  const smp: Samples = { t: [], pIt: [], peri: [], pPv: [], pLa: [], qTv: [], qMv: [] };
  let v = o.aAtria;
  let last = -1;
  Object.defineProperty(o, 'aAtria', {
    configurable: true,
    enumerable: true,
    get: () => v,
    set: (x: number) => {
      v = x;
      if (m.t <= last + 1e-9) return; // the beat-onset evaluate repeats the step-end one at the same t
      last = m.t;
      smp.t.push(m.t); smp.pIt.push(o.pIt); smp.peri.push(o.pPeri); smp.pPv.push(o.pPv); smp.pLa.push(o.pLa);
      smp.qTv.push(o.qTv); smp.qMv.push(o.qMv);
    },
  });
  return smp;
}

const mean = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const idxAt = (s: Samples, t: number): number => {
  let lo = 0, hi = s.t.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if ((s.t[mid] as number) < t) lo = mid + 1; else hi = mid; }
  return lo;
};

interface Breath { t0: number; t1: number; hi: number; lo: number; vt: number }
type Phase = 'insp' | 'exp' | null;

interface Links {
  rr: number; vt: number; dPplCmH2O: number;
  rvedvI: number; rvedvE: number; lvedvI: number; lvedvE: number;
  tvInI: number; tvInE: number; mvInI: number; mvInE: number;
  svRvI: number; svRvE: number; svLvI: number; svLvE: number;
  dTv: number; dMv: number; dSvRv: number; dSvLv: number; dTvP2T: number; dMvP2T: number; dSvLvP2T: number;
  tpI: number; tpE: number; gradI: number; gradE: number;
  sbpSwing: number; ratioSbpToHealthy?: number;
  /** A copy of the driver at the end of the run (for the C2 unit read). */
  driver: DriverState;
}

/** Run one spontaneous case to 10 min and read every link over the last 2 min. */
async function runCase(setup: (e: MonitorEngine) => void): Promise<Links> {
  const e = engine();
  setup(e);
  const beats = new Map<number, CircBeat>();
  const cycles = new Map<number, Cycle>();
  let smp: Samples | null = null;
  const sbpW: number[] = [];
  for (let t = 2; t <= T_END; t += 2) {
    e.advanceTo(t);
    if (t === T_WIN) smp = hook(e);
    if (t > T_WIN) {
      for (const b of circOf(e).beats) beats.set(b.t, b);
      for (const c of driverOf(e).cycles) cycles.set(c.seq, { ...c });
    }
    // the clinical SBP swing exactly as circ-pulsus.test.ts: max − min of the beat SBPs in each 6 s window
    if (t > T_WIN && t % 6 === 0) {
      const bs = circOf(e).beats.filter((b) => b.t > t - 6);
      if (bs.length > 2) sbpW.push(Math.max(...bs.map((b) => b.sbp)) - Math.min(...bs.map((b) => b.sbp)));
    }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  const s = smp as Samples;
  const tA = (s.t[0] as number) + 1;
  const tB = s.t[s.t.length - 1] as number;
  // breaths: every spontaneous cycle wholly inside the sampled window
  const br: Breath[] = [];
  for (const c of [...cycles.values()].sort((a, b) => a.t0 - b.t0)) {
    const t1 = c.t0 + c.ti + c.te;
    if (c.mech || !(c.vt > 0) || c.t0 < tA || t1 > tB) continue;
    let hi = -Infinity, lo = Infinity;
    for (let i = idxAt(s, c.t0); i < s.t.length && (s.t[i] as number) < t1; i++) {
      const p = s.pIt[i] as number;
      if (p > hi) hi = p;
      if (p < lo) lo = p;
    }
    br.push({ t0: c.t0, t1, hi, lo, vt: c.vt });
  }
  const phaseAt = (t: number): Phase => {
    const b = br.find((x) => t >= x.t0 && t < x.t1);
    if (!b || !(b.hi - b.lo > 1e-6)) return null;
    const f = (b.hi - (s.pIt[idxAt(s, t)] as number)) / (b.hi - b.lo);
    return f >= 0.5 ? 'insp' : f <= 0.1 ? 'exp' : null;
  };
  const breathOf = (t: number): number => br.findIndex((x) => t >= x.t0 && t < x.t1);
  // per-beat values with their event time
  const bl = [...beats.values()].sort((a, b) => a.t - b.t).filter((b) => b.t >= tA && b.t + b.dur <= tB && b.sv > 1 && b.avOpen >= 0);
  interface Ev { t: number; v: number }
  const tv: Ev[] = [], mv: Ev[] = [], svL: Ev[] = [], svR: Ev[] = [], edL: Ev[] = [], edR: Ev[] = [];
  for (const b of bl) {
    const i0 = idxAt(s, b.t), i1 = idxAt(s, b.t + b.dur);
    let vT = 0, cT = 0, vM = 0, cM = 0;
    for (let i = i0; i < i1; i++) {
      const dt = (s.t[i + 1] as number) - (s.t[i] as number);
      const qt = Math.max(0, s.qTv[i] as number) * dt, qm = Math.max(0, s.qMv[i] as number) * dt;
      vT += qt; cT += qt * (s.t[i] as number); vM += qm; cM += qm * (s.t[i] as number);
    }
    if (vT > 0) tv.push({ t: cT / vT, v: vT });
    if (vM > 0) mv.push({ t: cM / vM, v: vM });
    const tEj = b.t + (b.avOpen + (b.avClose > b.avOpen ? b.avClose : b.avOpen)) / 2;
    svL.push({ t: tEj, v: b.sv });
    svR.push({ t: tEj, v: b.svRv });
    edL.push({ t: b.t, v: b.lvedv });
    if (Number.isFinite(b.rvedv)) edR.push({ t: b.t, v: b.rvedv as number });
  }
  const byPhase = (a: Ev[], ph: Phase): number => mean(a.filter((x) => phaseAt(x.t) === ph).map((x) => x.v));
  const rel = (a: Ev[]): number => byPhase(a, 'insp') / byPhase(a, 'exp') - 1;
  // per-breath peak-to-trough, signed by the expected direction (sign of insp − exp)
  const p2t = (a: Ev[]): number => {
    const r: number[] = [];
    for (let k = 0; k < br.length; k++) {
      const v = a.filter((x) => breathOf(x.t) === k).map((x) => x.v);
      if (v.length >= 2) r.push((Math.max(...v) - Math.min(...v)) / mean(v));
    }
    return Math.sign(rel(a)) * mean(r);
  };
  // sample-level phase means of the transpericardial pressure (the model's `peri`: P_peri,abs − P_pl) and PV − LA
  const tp = { insp: [] as number[], exp: [] as number[] }, gr = { insp: [] as number[], exp: [] as number[] };
  for (const b of br) {
    for (let i = idxAt(s, b.t0); i < s.t.length && (s.t[i] as number) < b.t1; i++) {
      const f = (b.hi - (s.pIt[i] as number)) / Math.max(1e-9, b.hi - b.lo);
      const ph = f >= 0.5 ? 'insp' : f <= 0.1 ? 'exp' : null;
      if (!ph) continue;
      tp[ph].push(s.peri[i] as number);
      gr[ph].push((s.pPv[i] as number) - (s.pLa[i] as number));
    }
  }
  const dur = mean(br.map((b) => b.t1 - b.t0));
  return {
    rr: 60 / dur, vt: mean(br.map((b) => b.vt)), dPplCmH2O: mean(br.map((b) => b.hi - b.lo)) / CMH2O_TO_MMHG,
    rvedvI: byPhase(edR, 'insp'), rvedvE: byPhase(edR, 'exp'), lvedvI: byPhase(edL, 'insp'), lvedvE: byPhase(edL, 'exp'),
    tvInI: byPhase(tv, 'insp'), tvInE: byPhase(tv, 'exp'), mvInI: byPhase(mv, 'insp'), mvInE: byPhase(mv, 'exp'),
    svRvI: byPhase(svR, 'insp'), svRvE: byPhase(svR, 'exp'), svLvI: byPhase(svL, 'insp'), svLvE: byPhase(svL, 'exp'),
    dTv: rel(tv), dMv: rel(mv), dSvRv: rel(svR), dSvLv: rel(svL), dTvP2T: p2t(tv), dMvP2T: p2t(mv), dSvLvP2T: p2t(svL),
    tpI: mean(tp.insp), tpE: mean(tp.exp), gradI: mean(gr.insp), gradE: mean(gr.exp),
    sbpSwing: mean(sbpW),
    driver: structuredClone(driverOf(e)),
  };
}

/** C2 unit read of today's pleural function: the swing of one spontaneous cycle at its VT and at 2 × VT (fixed C). */
function swingAtVt(d: DriverState, k: number): number {
  const dd = structuredClone(d);
  const c = [...dd.cycles].reverse().find((x) => !x.mech && x.vt > 0) as Cycle;
  c.vt *= k;
  dd.cycles = [c];
  let hi = -Infinity, lo = Infinity;
  for (let t = c.t0; t < Math.min(c.cutAt, c.t0 + c.ti + c.te); t += 0.002) {
    const p = pleuralPressureMmHg(dd, t, 50);
    hi = Math.max(hi, p);
    lo = Math.min(lo, p);
  }
  return (hi - lo) / CMH2O_TO_MMHG;
}

interface Bench { sbpFall: number; svFall: number; periRise: number; bolusMl: number; beats: number; pItRange: number }

/**
 * C6 bench (Shabetai 1965 group D): apnoea (breathing source none) from 600 s, then at 615 s two restored copies of
 * the same state; one gets an RA bolus of 20 mL × W/70 at each of 4 consecutive beat onsets (5 mL/beat in a 17.5 kg dog
 * scaled by the engine's own volume rule, plan §3.6 [ENG scaling]). The fall is the largest beat-matched difference
 * (no-bolus − bolus) over the 10 beats from the first bolus: the twin removes every non-bolus change.
 */
async function bench(vFluidSeverity: number): Promise<Bench> {
  const e0 = engine();
  if (vFluidSeverity > 0) send(e0, { kind: 'condition', id: 'tamponade', severity: vFluidSeverity });
  for (let t = 60; t <= T_END; t += 60) { e0.advanceTo(t); await new Promise((r) => setImmediate(r)); }
  send(e0, { kind: 'ventilation', source: 'none' });
  e0.advanceTo(T_END + 15);
  const snap = e0.snapshot();
  const twin = (): MonitorEngine => { const x = engine(); x.restore(snap); return x; };
  const a = twin(); // bolus
  const b = twin(); // control twin
  const mA = circOf(a);
  const w = (mA.base.vEmpty ?? V_EMPTY_ML) / V_EMPTY_ML; // the engine's size rule (× W/70)
  const bolus = 20 * w;
  const t0 = mA.t;
  const run = (x: MonitorEngine, give: boolean): { beats: Map<number, CircBeat>; periMax: number; pItRange: number } => {
    const out = new Map<number, CircBeat>();
    const m = circOf(x);
    let n = 0, lastOn = m.acc ? m.acc.t : -1, periMax = 0, pLo = Infinity, pHi = -Infinity;
    for (let t = t0 + 0.01; t <= t0 + 15; t += 0.01) {
      x.advanceTo(t);
      const on = m.acc ? m.acc.t : -1;
      if (give && on !== lastOn && n < 4) { m.s[S.VRA] = (m.s[S.VRA] as number) + bolus; n++; }
      lastOn = on;
      periMax = Math.max(periMax, st(x).hemo.circOut.pPeri as number);
      pLo = Math.min(pLo, st(x).hemo.circOut.pIt as number);
      pHi = Math.max(pHi, st(x).hemo.circOut.pIt as number);
      for (const bt of m.beats) out.set(bt.t, bt);
    }
    return { beats: out, periMax, pItRange: pHi - pLo };
  };
  const ra = run(a, true);
  const rb = run(b, false);
  const la = [...ra.beats.values()].filter((x) => x.t > t0).sort((p, q) => p.t - q.t).slice(0, 10);
  const lb = [...rb.beats.values()].filter((x) => x.t > t0).sort((p, q) => p.t - q.t).slice(0, 10);
  let sbpFall = -Infinity, svFall = -Infinity;
  for (let i = 0; i < Math.min(la.length, lb.length); i++) {
    sbpFall = Math.max(sbpFall, (lb[i] as CircBeat).sbp - (la[i] as CircBeat).sbp);
    svFall = Math.max(svFall, (lb[i] as CircBeat).sv - (la[i] as CircBeat).sv);
  }
  return { sbpFall, svFall, periRise: ra.periMax - rb.periMax, bolusMl: bolus, beats: Math.min(la.length, lb.length), pItRange: Math.max(ra.pItRange, rb.pItRange) };
}

// ---------- run once, assert per cell ----------
const R: { healthy?: Links; mild?: Links; severe?: Links; bronch?: Links; bC?: Bench; bT?: Bench; c2?: number } = {};
const healthy = async (): Promise<Links> => (R.healthy ??= await runCase(() => {}));
const mild = async (): Promise<Links> => (R.mild ??= await runCase((e) => send(e, { kind: 'condition', id: 'tamponade', severity: 0.4 }))); // 100 mL
const severe = async (): Promise<Links> => (R.severe ??= await runCase((e) => send(e, { kind: 'condition', id: 'tamponade', severity: 1 }))); // 250 mL
const bronch = async (): Promise<Links> => (R.bronch ??= await runCase((e) => send(e, { kind: 'lungCondition', id: 'bronchospasm', severity: 1 })));
const benchC = async (): Promise<Bench> => (R.bC ??= await bench(0));
const benchT = async (): Promise<Bench> => (R.bT ??= await bench(1));
const pct = (x: number): number => Math.round(x * 1000) / 10;
const f2 = (x: number): number => Math.round(x * 100) / 100;
const h4 = (x: number): string => x.toFixed(4);

/** The C6 ratio rule: the tamponade fall is positive and at least 5 × the control's (a control that does not fall passes). */
const ratioOk = (tamp: number, ctrl: number): boolean => tamp > 0 && (ctrl <= 0 || tamp / ctrl >= 5);

describe('E118 P0: pulsus paradoxus link diagnosis (spontaneous, seed 7, 70 kg)', () => {
  it('measures every case (PME_LINKS_PRINT=1 prints the table)', async () => {
    const cases = { healthy: await healthy(), mild: await mild(), severe: await severe(), bronch: await bronch() };
    const bc = await benchC(), bt = await benchT();
    R.c2 = swingAtVt(cases.healthy.driver, 2) / swingAtVt(cases.healthy.driver, 1);
    if (PRINT) {
      const rows: Record<string, Record<string, number>> = {};
      for (const [k, L] of Object.entries(cases)) {
        rows[k] = {
          RR: f2(L.rr), VT: f2(L.vt), 'dPpl cmH2O': f2(L.dPplCmH2O),
          'RVEDV i': f2(L.rvedvI), 'RVEDV e': f2(L.rvedvE), 'LVEDV i': f2(L.lvedvI), 'LVEDV e': f2(L.lvedvE),
          'TV in i': f2(L.tvInI), 'TV in e': f2(L.tvInE), 'dTV %': pct(L.dTv), 'dTV p2t %': pct(L.dTvP2T),
          'MV in i': f2(L.mvInI), 'MV in e': f2(L.mvInE), 'dMV %': pct(L.dMv), 'dMV p2t %': pct(L.dMvP2T),
          'RVSV i': f2(L.svRvI), 'RVSV e': f2(L.svRvE), 'dRVSV %': pct(L.dSvRv),
          'LVSV i': f2(L.svLvI), 'LVSV e': f2(L.svLvE), 'dLVSV %': pct(L.dSvLv), 'dLVSV p2t %': pct(L.dSvLvP2T),
          'Ptp i': f2(L.tpI), 'Ptp e': f2(L.tpE), dPtp: f2(L.tpI - L.tpE),
          'PV-LA i': f2(L.gradI), 'PV-LA e': f2(L.gradE), 'SBP swing': f2(L.sbpSwing),
        };
      }
      console.table(rows);
      const brow = (b: Bench): Record<string, number> => ({ 'bolus mL/beat': f2(b.bolusMl), 'SBP fall': f2(b.sbpFall), 'LVSV fall': f2(b.svFall), 'peri rise': f2(b.periRise), 'pIt range': f2(b.pItRange), beats: b.beats });
      console.table({ 'bench control': brow(bc), 'bench tamponade': brow(bt) });
      console.log(`C1 healthy dPpl ${h4(cases.healthy.dPplCmH2O)}, bronch ${h4(cases.bronch.dPplCmH2O)} cmH2O; SBP swing healthy ${h4(cases.healthy.sbpSwing)}, bronch ${h4(cases.bronch.sbpSwing)}; C7b ${h4(cases.healthy.tpI - cases.healthy.tpE)}`);
      console.log(`C2 swing ratio at 2 x VT (fixed C) ${f2(R.c2)}; severe/healthy SBP swing ${f2(cases.severe.sbpSwing / cases.healthy.sbpSwing)}; C6 SBP ratio ${f2(bt.sbpFall / bc.sbpFall)}`);
    }
    // the bench really is apnoeic (no pleural swing) and every case produced phase-classified beats
    expect(bc.pItRange).toBeLessThan(1e-6);
    expect(bt.pItRange).toBeLessThan(1e-6);
    for (const L of Object.values(cases)) expect([L.dTv, L.dMv, L.dSvLv, L.tpI, L.tpE, L.gradI, L.gradE].every(Number.isFinite)).toBe(true);
  }, 900_000);

  // ---- C1, C2: the effort, pinned to today's fixed spontaneous swing (SPONT_SWING_CMH2O 4) ----
  it('C1 effort: healthy quiet ΔPpl peak-to-trough 2–4 cmH2O at the controller\'s own breath (Mase 2018 2.3; West ≈ 3) — measured 4.0 at RR 13.6 × VT 465 (the fixed swing, at its band edge)', async () => {
    const h = await healthy();
    expect(h.dPplCmH2O).toBeGreaterThanOrEqual(2);
    expect(h.dPplCmH2O).toBeLessThanOrEqual(4);
  }, 300_000);
  it.fails('C2 effort scales: ΔPpl at 2 × VT over ΔPpl at VT within 1.8–2.2 at fixed C (equation of motion) — measured 1.00 (the swing is fixed at 4 cmH2O)', async () => {
    R.c2 ??= swingAtVt((await healthy()).driver, 2) / swingAtVt((await healthy()).driver, 1);
    expect(R.c2).toBeGreaterThanOrEqual(1.8);
    expect(R.c2).toBeLessThanOrEqual(2.2);
  }, 300_000);
  it.fails('C2 effort scales: ΔPpl rises with airway resistance, severe bronchospasm above healthy (equation of motion) — measured 4.0 vs 4.0 cmH2O', async () => {
    expect((await bronch()).dPplCmH2O).toBeGreaterThan((await healthy()).dPplCmH2O + 1e-6);
  }, 300_000);

  // ---- C3–C5: the venous surge, LV filling and LV output (severe tamponade, 250 mL) ----
  it.fails('C3 venous surge: severe tamponade inspiratory rise of tricuspid inflow per beat +47 to +115 % (Leeman 1988, +81 ± 34) — measured +21.1 % (peak-to-trough +24.9 %)', async () => {
    const d = (await severe()).dTv;
    expect(d).toBeGreaterThanOrEqual(0.47);
    expect(d).toBeLessThanOrEqual(1.15);
  }, 300_000);
  it('C3b venous surge: the healthy inspiratory rise of tricuspid inflow is smaller than in severe tamponade (Leeman 1988; Shabetai 1965 group E) — measured +15.0 vs +21.1 %', async () => {
    expect((await healthy()).dTv).toBeLessThan((await severe()).dTv);
  }, 300_000);
  it.fails('C4 LV filling: severe tamponade inspiratory fall of mitral inflow per beat −27 to −43 % (Leeman 1988, −35 ± 8) — measured −10.3 % (peak-to-trough −13.5 %)', async () => {
    const d = (await severe()).dMv;
    expect(d).toBeLessThanOrEqual(-0.27);
    expect(d).toBeGreaterThanOrEqual(-0.43);
  }, 300_000);
  it.fails('C5 LV output: severe tamponade inspiratory fall of LV stroke volume −20 to −46 % (Leeman 1988, aortic VTI −33 ± 13) — measured −6.5 % (peak-to-trough −10.8 %)', async () => {
    const d = (await severe()).dSvLv;
    expect(d).toBeLessThanOrEqual(-0.2);
    expect(d).toBeGreaterThanOrEqual(-0.46);
  }, 300_000);
  it('C5b LV output: healthy inspiratory change of LV stroke volume < 10 % (Hamzaoui 2013) — measured +0.2 %', async () => {
    expect(Math.abs((await healthy()).dSvLv)).toBeLessThan(0.1);
  }, 300_000);

  // ---- C6: interdependence alone, no breathing (Shabetai 1965 group D) ----
  it('C6 interdependence bench: RA bolus 20 mL/beat × 4 in apnoea, SBP and LV SV fall tamponade/control ≥ 5 with the control SBP fall ≤ 2 mmHg (Shabetai 1965 group D, 6.66/0.55) — measured SBP 2.07 vs 0.01 mmHg, LV SV 1.04 vs −0.02 mL', async () => {
    const bc = await benchC(), bt = await benchT();
    expect(bc.sbpFall).toBeLessThanOrEqual(2);
    expect(ratioOk(bt.sbpFall, bc.sbpFall)).toBe(true);
    expect(ratioOk(bt.svFall, bc.svFall)).toBe(true);
  }, 300_000);

  // ---- C7: the transpericardial pressure (the circuit's `peri` = P_peri,abs − P_pl) ----
  it('C7 transpericardial: severe tamponade (P_peri − P_pl) inspiration minus expiration > 0 (Shabetai 1965 group C, +4.5 mmHg) — measured +0.56 mmHg', async () => {
    const s = await severe();
    expect(s.tpI - s.tpE).toBeGreaterThan(0);
  }, 300_000);
  // "≈ 0" read at the source's own reporting precision, 0.1 mmHg (13.2 vs 8.7) [ENG: the tolerance]
  it('C7b transpericardial: healthy inspiration minus expiration ≈ 0, |Δ| < 0.05 mmHg (Shabetai 1965 group C) — measured +0.04 mmHg', async () => {
    const h = await healthy();
    expect(Math.abs(h.tpI - h.tpE)).toBeLessThan(0.05);
  }, 300_000);

  // ---- C8: the pulmonary-vein-to-LA gradient (P_pv − P_la, both absolute) ----
  it('C8 PV–LA gradient: severe tamponade inspiratory gradient ≤ +0.5 mmHg and below expiration (Golinko 1963, −0.2 vs +2.9) — measured +0.09 vs +0.29 mmHg', async () => {
    const s = await severe();
    expect(s.gradI).toBeLessThanOrEqual(0.5);
    expect(s.gradI).toBeLessThan(s.gradE);
  }, 300_000);
  it('C8b PV–LA gradient: healthy gradient positive in inspiration and in expiration (Golinko 1963, +1.1 / +2.3) — measured +0.92 / +0.95 mmHg', async () => {
    const h = await healthy();
    expect(h.gradI).toBeGreaterThan(0);
    expect(h.gradE).toBeGreaterThan(0);
  }, 300_000);

  // ---- C11: spontaneous severe bronchospasm (direction only) ----
  it.fails('C11 bronchospasm: spontaneous severe bronchospasm raises ΔPpl and the SBP swing above healthy (Jardin 1982; Hamzaoui 2013) — measured ΔPpl 4.0 vs 4.0 cmH2O, SBP swing 2.38 vs 2.38 mmHg', async () => {
    const b = await bronch(), h = await healthy();
    expect(b.dPplCmH2O).toBeGreaterThan(h.dPplCmH2O + 1e-6);
    expect(b.sbpSwing).toBeGreaterThan(h.sbpSwing);
  }, 300_000);
});
