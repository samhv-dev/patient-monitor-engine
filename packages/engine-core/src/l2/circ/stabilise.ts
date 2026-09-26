// Profile stabilisation (audit borrow #3 / amendment A19; Pulse CardiovascularModel TuneCircuit, procedure only —
// NOTICES N-P06): start from an analytic guess (volumes at typical pressures, stressed volume from the profile),
// run a fixed sinus rhythm at the profile's resting HR with a constant resting pleural pressure, and every 2 s
// window (a whole number of beats, ≥ 2 s) rescale systemic resistance (MAP), arterial compliance (pulse pressure, as Pulse tunes aortic C) and the
// venous unstressed volume (CVP) with small gains, clamped around their start values. LV Emax is NOT tuned: it is
// the evidence default that conditions (HFrEF ×0.45) and drugs act on, and tuning would undo them (plan decision 4). Converged when radial SBP/DBP are within 1 % and CVP
// within 0.3 mmHg of target for 3 consecutive windows (≈ 6 s; ≤ 60 windows = 120 s simulated). The result
// (state + tuned params + ledger) is cached by profile hash: the solve is deterministic, so the cache is too.
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { arterialVolume, createOut, evaluate, N_STATE, S, stepCirc, type CircDrive, type CircParams } from './circuit.ts';
import { ATRIAL_DELAY_S, ATRIAL_T_S, H_S, P_PL0, PERI_EXTRA_ML, PERI_RESERVE, V0_ART } from './params.ts';
import type { ResolvedProfile } from './profile.ts';

export const STAB_WINDOW_S = 2;
export const STAB_MAX_WINDOWS = 60;
export const STAB_PR_S = 0.16;
/** R45(c): LVEDP tolerance for profiles whose conditions set an LVEDP (AS, HFrEF, HFpEF): ±2 mmHg = the tables' 15–20 / 16–20 bands [ENG]. */
export const STAB_LVEDP_TOL = 2;

export interface LedgerRow {
  w: number; // window index
  sbp: number; dbp: number; cvp: number; rSys: number; cArt: number; v0Sv: number;
  lvedp: number; aLv: number; // R45(c)
}
export interface Stabilised {
  s: number[];
  params: CircParams;
  ledger: LedgerRow[];
  converged: boolean;
  /** Resting per-beat reference values (for the coronary demand normalisation and the tests). */
  ref: { hr: number; sbp: number; dbp: number; map: number; cvp: number; lvedv: number; lvedp: number; lvsp: number; sv: number; co: number; pcwp: number };
}

const zero = () => 0;

/** Analytic starting state: chambers at typical volumes, the rest of the blood in the systemic veins. */
export function initialState(p: CircParams, bloodVolumeMl: number, stressedFrac: number): number[] {
  const s = new Array<number>(N_STATE).fill(0);
  const w = p.cSv / 110;
  s[S.PC] = 95;
  s[S.QL] = 90 * w;
  s[S.VLV] = 120 * w;
  s[S.VRV] = 130 * w;
  s[S.VLA] = 60 * w;
  s[S.VRA] = 60 * w;
  s[S.VPA] = p.cPa * 18;
  s[S.VPV] = p.cPv * 12;
  const others = V0_ART + arterialVolume(95, p.cArt) + (s[S.VLV] as number) + (s[S.VRV] as number) + (s[S.VLA] as number) + (s[S.VRA] as number) + (s[S.VPA] as number) + (s[S.VPV] as number);
  s[S.VSV] = bloodVolumeMl - others;
  // venous unstressed volume: the profile's stressed fraction of the whole blood volume is stressed [tables §1.1]
  const stressedElsewhere = arterialVolume(95, p.cArt) + (s[S.VPA] as number) + (s[S.VPV] as number) + 200 * w;
  p.v0Sv = (s[S.VSV] as number) - Math.max(0.3 * p.cSv, stressedFrac * bloodVolumeMl - stressedElsewhere);
  return s;
}

function hashProfile(r: ResolvedProfile): string {
  return JSON.stringify([r.params, r.bloodVolumeMl, r.stressedFrac, r.targets, r.lvedpTarget, r.tuneLvedp]);
}
const cache = new Map<string, Stabilised>();

/** Stabilise a resolved profile (cached). The returned state/params are copies the caller may mutate. */
export function stabilise(r: ResolvedProfile): Stabilised {
  const key = hashProfile(r);
  let hit = cache.get(key);
  if (!hit) {
    hit = solve(r);
    cache.set(key, hit);
  }
  return structuredClone(hit);
}

function solve(r: ResolvedProfile): Stabilised {
  const p: CircParams = structuredClone(r.params);
  const s = initialState(p, r.bloodVolumeMl, r.stressedFrac);
  p.v0Peri = 1e4; // pericardium slack while tuning; set from the tuned EDVs at the end
  const hr = r.targets.hr;
  const rr = 60 / hr;
  const T = activationPeriodS(hr);
  const win = rr * Math.ceil(STAB_WINDOW_S / rr); // a whole number of beats, so window extremes do not alternate
  let vent: Activation[] = [];
  let atria: Activation[] = [];
  const d: CircDrive = {
    vent, atria, kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero,
  };
  const o = createOut();
  const start = { rSys: p.rSys, cArt: p.cArt, v0Sv: p.v0Sv, aLv: p.aLv };
  const clamp = (x: number, x0: number, lo = 0.5, hi = 1.5) => Math.min(hi * x0, Math.max(lo * x0, x));
  const ledger: LedgerRow[] = [];
  let t = 0;
  let nextBeat = 0.2;
  let ok = 0;
  let converged = false;
  let edvMax = 0;
  let edvRv = 0;
  let prevA = 1;
  const ref = { hr, sbp: 0, dbp: 0, map: 0, cvp: 0, lvedv: 0, lvedp: 0, lvsp: 0, sv: 0, co: 0, pcwp: 0 };
  for (let w = 0; w < STAB_MAX_WINDOWS; w++) {
    const tEnd = t + win;
    let sbp = -1e9, dbp = 1e9, map = 0, cvp = 0, pcwp = 0, n = 0, lvsp = -1e9, qav = 0, lvedp = 0, nEd = 0;
    edvMax = 0;
    edvRv = 0;
    // warm-up windows are not measured: the first 4 s settle the analytic guess
    while (t < tEnd - 1e-9) {
      while (nextBeat <= t + 0.3) {
        vent.push({ t0: nextBeat, T, amp: 1 });
        atria.push({ t0: nextBeat - STAB_PR_S + ATRIAL_DELAY_S, T: ATRIAL_T_S, amp: 1 });
        nextBeat += rr;
      }
      stepCirc(s, t, H_S, p, d);
      t += H_S;
      evaluate(s, t, p, d, o);
      if (o.pRad > sbp) sbp = o.pRad;
      if (o.pRad < dbp) dbp = o.pRad;
      map += o.pRad;
      cvp += o.pRa;
      pcwp += o.pPv;
      n++;
      if (o.pLv > lvsp) lvsp = o.pLv;
      qav += o.qAv * H_S;
      edvMax = Math.max(edvMax, s[S.VLV] as number);
      edvRv = Math.max(edvRv, s[S.VRV] as number);
      if (prevA < 0.001 && o.aVent >= 0.001) {
        lvedp += o.pLv - o.pIt;
        nEd++;
      }
      prevA = o.aVent;
    }
    vent = pruneActivations(vent, t);
    atria = pruneActivations(atria, t);
    d.vent = vent;
    d.atria = atria;
    map /= n;
    cvp /= n;
    pcwp /= n;
    const edp = lvedp / Math.max(1, nEd);
    ledger.push({ w, sbp, dbp, cvp, rSys: p.rSys, cArt: p.cArt, v0Sv: p.v0Sv, lvedp: edp, aLv: p.aLv });
    if (w < 2) continue;
    const { sbp: sT, dbp: dT, cvp: cT } = r.targets;
    const edpOk = !r.tuneLvedp || Math.abs(edp - r.lvedpTarget) <= STAB_LVEDP_TOL;
    const inTol = Math.abs(sbp - sT) <= 0.01 * sT && Math.abs(dbp - dT) <= 0.01 * dT && Math.abs(cvp - cT) <= 0.3 && edpOk;
    ok = inTol ? ok + 1 : 0;
    ref.sbp = sbp; ref.dbp = dbp; ref.map = map; ref.cvp = cvp; ref.lvedv = edvMax; ref.lvsp = lvsp; ref.pcwp = pcwp;
    ref.lvedp = edp;
    ref.sv = qav / (win / rr);
    ref.co = (qav / win) * 0.06;
    if (ok >= 3) {
      converged = true;
      break;
    }
    if (inTol) continue;
    const pp = Math.max(5, sbp - dbp);
    const ff = Math.min(0.6, Math.max(0.1, (map - dbp) / pp));
    const mapT = dT + ff * (sT - dT);
    p.rSys = clamp(p.rSys * ((mapT - cvp) / Math.max(5, map - cvp)) ** 0.7, start.rSys);
    p.cArt = clamp(p.cArt * (pp / (sT - dT)) ** 0.7, start.cArt, 0.4, 2.5);
    // R45(c): anchor the LV EDPVR scale at the EDV actually reached (β, the stiffness, is the condition's; A moves),
    // once the venous volume has settled (CVP within 1 mmHg): during the transient LVEDP swings without any A change
    if (!edpOk && Math.abs(cvp - cT) <= 1) p.aLv = clamp(p.aLv * (r.lvedpTarget / Math.max(1, edp)) ** 0.4, start.aLv, 0.1, 10);
    p.v0Sv = Math.min(start.v0Sv + 0.5 * r.bloodVolumeMl, Math.max(start.v0Sv - 0.5 * r.bloodVolumeMl, p.v0Sv - 0.6 * (cT - cvp) * p.cSv * 0.5));
  }
  p.v0Peri = PERI_RESERVE * (edvMax + edvRv) + PERI_EXTRA_ML;
  // the pericardial reserve was not active during tuning; it is set so the resting pericardial pressure is 0
  return { s, params: p, ledger, converged, ref };
}
