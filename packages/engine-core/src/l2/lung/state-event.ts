// The R27 lungState payload from the lung module (plan decision 15): the seven Stage 3 fields as ABSOLUTE values,
// plus the per-lung (R43) and catalogue-lead (Q95) fields. Rounded so the pipeline can throttle on changes.
import type { LungConditionSpec, LungStateExt, LungStateLung } from '../../types-lung.ts';
import { staticCompliance, shuntFraction, type LungState } from './lung.ts';
import { complianceAt } from './venegas.ts';
import { SIDE_SHARE } from './params.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;

export interface LungStateCore {
  complianceMlPerCmH2O: number; resistanceCmH2OPerLps: number; effort: number; autoPeepTendency: number;
  shunt: number; deadSpaceMl: number; frcMl: number;
}

export function lungStatePayload(
  ls: LungState,
  x: { deadSpaceMl: number; frcMl: number; effort: number; peep: number; baseShunt: number; specs: LungConditionSpec[] },
): LungStateCore & LungStateExt {
  const lp = ls.lp;
  const gs = lp.side.map((s) => 1 / s.rLung);
  const rIn = lp.rTube + 1 / Math.max(1e-6, (gs[0] as number) + (gs[1] as number));
  const autoPeep = Math.max(0, ls.peepTot - x.peep);
  const lungs: LungStateLung[] = [0, 1].map((s) => {
    const blocked = ls.mp.blocked[2 * s] === true;
    let c = 0;
    for (const u of [2 * s, 2 * s + 1]) if (ls.mp.units[u]!.rIn < 1e3) c += complianceAt(ls.mp.units[u]!.sig, ls.mech.v[u] as number);
    const cw = lp.ccw * (SIDE_SHARE[s] as number);
    return {
      side: s === 0 ? 'L' : 'R', complianceMlPerCmH2O: Math.round(c > 0 ? 1 / (1 / c + 1 / cw) : 0),
      resistanceCmH2OPerLps: Math.round(lp.side[s]!.rLung), tauS: r2(ls.tauBar), shunt: r2(ls.perf.shunt[s] as number),
      perfusionFrac: r2(ls.perf.f[s] as number), ventilated: !blocked, aerated: r2(ls.aer[s] as number),
    };
  });
  const cSlow = [1, 3].reduce((a, u) => a + (ls.mp.units[u]!.rIn < 1e3 ? complianceAt(ls.mp.units[u]!.sig, ls.mech.v[u] as number) : 0), 0);
  const recruitable = lp.side.reduce((a, s, k) => a + (SIDE_SHARE[k] as number) * s.atel * (1 - (ls.rec.open[k] as number)), 0);
  return {
    complianceMlPerCmH2O: Math.round(staticCompliance(ls)),
    resistanceCmH2OPerLps: Math.round(rIn),
    effort: r2(x.effort),
    autoPeepTendency: r2(Math.min(1, autoPeep / 10)), // tables §4.3: PEEPi/10 clamped 0–1
    shunt: r2(shuntFraction(ls, x.baseShunt)),
    deadSpaceMl: Math.round(x.deadSpaceMl),
    frcMl: Math.round(x.frcMl * lp.frcMult * (0.45 * (ls.aer[0] as number) + 0.55 * (ls.aer[1] as number))),
    lungs,
    complianceSlowMlPerCmH2O: Math.round(cSlow),
    tauSlowS: r2(Math.max(lp.side[0]!.tauSlowS, lp.side[1]!.tauSlowS)),
    fSlow: r2(Math.max(lp.side[0]!.fSlow, lp.side[1]!.fSlow)),
    atelectasisFrac: r2(1 - (0.45 * (ls.aer[0] as number) + 0.55 * (ls.aer[1] as number))),
    resistanceExpCmH2OPerLps: Math.round(rIn * Math.max(lp.side[0]!.rawExp, lp.side[1]!.rawExp)),
    chestWallComplianceMlPerCmH2O: Math.round(lp.ccw),
    recruitableFrac: r2(recruitable),
    vqAdmixture: r2(0.45 * lp.side[0]!.vqLow + 0.55 * lp.side[1]!.vqLow),
    leakFraction: r2(lp.leakFrac),
    autoPeepCmH2O: Math.round(autoPeep * 10) / 10,
    conditions: x.specs.map((s) => ({ ...s })),
  };
}
