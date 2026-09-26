// Atelectasis, recruitment and absorption per lung (tables §4.1, catalogue §6/§22/§23, Q34, Q73). Three pools per side:
//  ind — induction/absorption atelectasis of healthy dependent lung: builds toward ATEL_IND·f(FiO2)·(1 − PEEP/10)₊
//        with the Rothen τ (5 min at FiO2 1.0 … 120 min at 0.4, ×(1 + PEEP/5)); opens only above P_OPEN_HEALTHY.
//  blk — collapse behind a blocked bronchus (OLV, endobronchial): τ = 5 + 40·(inert/0.79) min (absorption: pure O2
//        is absorbed fast, N2 slowly); after unblocking it needs a recruitment manoeuvre (catalogue §23 pitfall 2).
//  open — open fraction of the CONDITION's recruitable collapse (ARDS, pneumonia, effusion…): opens toward
//        openable(Pinsp) with τ_rec, falls toward max(openable, stayOpen(PEEP)) with TAU_DEREC_S.
import {
  ATEL_IND, P_CLOSE, P_OPEN_HEALTHY, TAU_BLOCK_MIN, TAU_BLOCK_N2_MIN, TAU_COLLAPSE_F04_MIN, TAU_COLLAPSE_F1_MIN,
  TAU_DEREC_S, TAU_REC_HEALTHY_S,
} from './params.ts';
import type { SideParams } from './side.ts';

export interface RecruitState { ind: number[]; blk: number[]; open: number[] }
export interface RecruitInputs {
  fio2: number; // inspired
  faO2: number[]; // each side's alveolar O2 fraction (blocked side: what is left in it)
  faCo2: number; // alveolar CO2 fraction
  peepTot: number; // end-expiratory alveolar pressure, cmH2O
  pInsp: number; // end-inspiratory (plateau-like) alveolar pressure, cmH2O
  ga: boolean; // anaesthetised (induction atelectasis applies)
  indFactor: number; // profile factor on ATEL_IND (obesity, pregnancy, supine) [tables §1.3–1.4]
  blocked: boolean[];
}
/** Plateau at which a condition's reference non-aeration was defined (PEEP 5 in ARDS): nothing extra opens below it [ENG]. */
export const P_REC_REF = 15;

export function createRecruit(): RecruitState {
  return { ind: [0, 0], blk: [0, 0], open: [0, 0] };
}

/** Edmark 2003 FiO2 dependence of induction atelectasis: 1.0 → 1, 0.8 → 0.1, 0.6 → 0.04 (0.21 → 0.02 [ENG]). */
export function fio2AtelFactor(f: number): number {
  const k: ReadonlyArray<readonly [number, number]> = [[0.21, 0.02], [0.6, 0.04], [0.8, 0.1], [1, 1]];
  if (f <= 0.21) return 0.02;
  for (let i = 1; i < k.length; i++) {
    const [x1, y1] = k[i] as readonly [number, number];
    const [x0, y0] = k[i - 1] as readonly [number, number];
    if (f <= x1) return y0 + ((f - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 1;
}

/** Rothen 1995 re-collapse τ (s): log-linear between FiO2 1.0 (5 min) and 0.4 (120 min), ×(1 + PEEP/5). */
export function tauCollapseS(fio2: number, peep: number): number {
  const x = Math.min(1, Math.max(0, (1 - fio2) / 0.6));
  const min = TAU_COLLAPSE_F1_MIN * (TAU_COLLAPSE_F04_MIN / TAU_COLLAPSE_F1_MIN) ** x;
  return 60 * min * (1 + Math.max(0, peep) / 5);
}

const relax = (x: number, target: number, tau: number, dt: number) => x + (target - x) * (1 - Math.exp(-dt / Math.max(1e-3, tau)));

export function stepRecruit(st: RecruitState, sp: SideParams[], x: RecruitInputs, dt: number): void {
  for (let s = 0; s < 2; s++) {
    const p = sp[s] as SideParams;
    if (x.blocked[s]) {
      const inert = Math.max(0, 1 - (x.faO2[s] as number) - x.faCo2);
      st.blk[s] = relax(st.blk[s] as number, 0.98, 60 * (TAU_BLOCK_MIN + TAU_BLOCK_N2_MIN * inert / 0.79), dt);
      continue;
    }
    const opens = x.pInsp >= P_OPEN_HEALTHY;
    if (opens) {
      st.ind[s] = relax(st.ind[s] as number, 0, TAU_REC_HEALTHY_S, dt);
      st.blk[s] = relax(st.blk[s] as number, 0, TAU_REC_HEALTHY_S, dt);
    } else {
      const eq = x.ga ? ATEL_IND * x.indFactor * fio2AtelFactor(x.fio2) * Math.max(0, 1 - x.peepTot / 10) : 0;
      if (eq > (st.ind[s] as number)) st.ind[s] = relax(st.ind[s] as number, eq, tauCollapseS(x.fio2, x.peepTot), dt);
    }
    if (p.atel > 0) {
      const openable = Math.min(1, Math.max(0, (x.pInsp - P_REC_REF) / Math.max(1, p.pOpen - P_REC_REF)));
      const stay = Math.min(1, Math.max(0, (x.peepTot - 5) / (P_CLOSE - 5)));
      const o = st.open[s] as number;
      if (openable > o) st.open[s] = relax(o, openable, p.tauRecS, dt);
      else if (o > Math.max(openable, stay)) st.open[s] = relax(o, Math.max(openable, stay), TAU_DEREC_S, dt);
    }
  }
}

/** Non-aerated fraction of each side now (capped 0.98): condition consolidation + closed recruitable + ind + blk. */
export function nonAerated(st: RecruitState, sp: SideParams[]): number[] {
  return [0, 1].map((s) => {
    const p = sp[s] as SideParams;
    const collapsed = p.consol + p.atel * (1 - (st.open[s] as number)) + (st.ind[s] as number);
    return Math.min(0.98, collapsed + (1 - collapsed) * (st.blk[s] as number));
  });
}
