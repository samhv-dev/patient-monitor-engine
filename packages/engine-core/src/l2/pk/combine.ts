// Combination of every active drug's concentration into the engine inputs (Stage 7g decisions 6–7). R51 §2: the
// circulation PD is 7g's; NMB, depth-index, MAC-awake and ventilatory-drive PD are 7f's (it reads bus.agents).
import type { DrugEffect } from '../circ/drugs.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../types-pk.ts';
import { acidosisFactor, competitiveEc50, hill, responseSurface } from './pd.ts';
import type { DrugRow, PdTarget } from './row.ts';

export interface Active {
  row: DrugRow;
  c: number; // PD concentration (row units): brain/effect-site Ce, rate-equivalent, or the gamma curve
}

export interface PdContext {
  ph: number;
  betaBlockC: number; // chronic β-blockade from the 7a profile (0–1)
  vasoResp: number; // sepsis catecholamine responsiveness (7f/§5e), 1 = normal
  ageY: number;
  macBrain: number; // total age-adjusted MAC fraction (volatile model)
}

export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1 };
const FX_TARGETS = ['hr', 'ees', 'svr', 'pvr', 'gv', 'gvHr'] as const;
const OCCUPANCY: readonly PdTarget[] = ['betaBlock', 'avNode'];

/** Remifentanil-equivalent Ce that halves MAC ≈ 1.2 ng/mL (tables §5d [VERIFY]) → uOpioid unit. */
const OPIOID_U1 = 1.2;

export function combine(actives: readonly Active[], ctx: PdContext): { fx: DrugEffect; betaBlockAdd: number; bus: DrugBus } {
  const bus: DrugBus = structuredClone(DRUG_BUS_NEUTRAL);
  // 1. occupancy targets first (β-blockade feeds the β-agonist EC50 shift)
  const occ: Record<string, number> = { betaBlock: 0, avNode: 0 };
  for (const a of actives)
    for (const e of a.row.pd)
      if (OCCUPANCY.includes(e.target)) occ[e.target] = 1 - (1 - (occ[e.target] as number)) * (1 - Math.max(0, hill(a.c, e.ec50, e.emax, e.hill ?? 1)));
  const betaOcc = 1 - (1 - (occ.betaBlock as number)) * (1 - ctx.betaBlockC);
  // competitive class antagonists (naloxone, flumazenil): every member's concentration is divided by 1 + o/(1 − o)
  const antag = new Map<string, number>();
  for (const a of actives) {
    const an = a.row.antagonises;
    if (an) antag.set(an.cls, 1 - (1 - (antag.get(an.cls) ?? 0)) * (1 - hill(a.c, an.ec50, an.emax)));
  }
  const conc = (a: Active) => a.c / (competitiveEc50(1, antag.get(a.row.cls) ?? 0));
  bus.antagonist = { opioid: competitiveEc50(1, antag.get('opioid') ?? 0), benzodiazepine: competitiveEc50(1, antag.get('benzodiazepine') ?? 0) };
  // 2. per target, per class: Loewe sum of potency units
  const byKey = new Map<string, { u: number; emax: number; hill: number; cat: boolean; lin: boolean }>();
  for (const a of actives)
    for (const e of a.row.pd) {
      if (OCCUPANCY.includes(e.target)) continue;
      const ec50 = e.beta ? competitiveEc50(e.ec50, betaOcc) : e.ec50;
      // one group per target, class and SIGN: epinephrine's β2 dilation and α constriction are separate mechanisms
      const key = `${e.target}|${a.row.cls}|${Math.sign(e.emax)}`;
      const g = byKey.get(key) ?? { u: 0, emax: 0, hill: e.hill ?? 1, cat: false, lin: e.linear === true };
      g.u += Math.max(0, conc(a)) / ec50;
      if (Math.abs(e.emax) > Math.abs(g.emax)) g.emax = e.emax;
      g.cat ||= e.catecholamine === true;
      byKey.set(key, g);
    }
  const fx: DrugEffect = { ...NEUTRAL_FX };
  const other: Record<string, number> = {};
  for (const [key, g] of byKey) {
    const target = key.split('|')[0] as PdTarget;
    let E = g.lin ? Math.max(-3 * Math.abs(g.emax), Math.min(3 * Math.abs(g.emax), g.emax * g.u)) : hill(g.u, 1, g.emax, g.hill);
    if (g.cat) E *= acidosisFactor(ctx.ph) * ctx.vasoResp;
    if ((FX_TARGETS as readonly string[]).includes(target)) {
      const k = target as (typeof FX_TARGETS)[number];
      fx[k] *= Math.max(0.05, 1 + E);
    } else if (target === 'v0Frac') fx.v0Frac += E;
    else other[target] = (other[target] ?? 0) + E;
  }
  // 3. the CNS summaries (7d, demo); 7f computes its own PD from the per-agent Ce the pipeline adds (Task 15)
  let remiEq = 0;
  let midazEq = 0;
  for (const a of actives) {
    const r = a.row;
    const c = conc(a);
    // Eleveld Ce50 age term (tables §5d; R51 addendum 11): C50(age) = C50(35)·e^(−k(age − 35))
    const hypC50 = r.cns?.hypC50 !== undefined ? r.cns.hypC50 * Math.exp(-(r.cns.hypC50AgeK ?? 0) * (ctx.ageY - 35)) : undefined;
    if (r.cls === 'hypnotic' && r.id === 'propofol') bus.cns.propCe = a.c;
    if (hypC50 !== undefined) bus.cns.uHyp += a.c / hypC50;
    if (r.cns?.remiEq) remiEq += c * r.cns.remiEq;
    if (r.cns?.midazEq) midazEq += c * r.cns.midazEq;
    if (r.id === 'dantrolene') bus.metabolic.dantroleneE = hill(a.c, 1, 1);
    if (r.cls === 'ketamine') bus.cns.ketamineCe = a.c;
    if (r.cls === 'alpha2') bus.cns.dexmedCe = a.c;
    if (r.cns?.cmro2) bus.cns.cmro2Mult *= 1 - hill(a.c / (hypC50 ?? 1), 1, r.cns.cmro2);
  }
  bus.cns.opioidCeRemiEq = remiEq;
  bus.cns.benzoCeMidazEq = midazEq;
  bus.cns.macBrain = ctx.macBrain;
  bus.cns.uOpioid = remiEq / OPIOID_U1;
  bus.cns.uSurface = responseSurface(bus.cns.uHyp + ctx.macBrain, bus.cns.uOpioid);
  bus.nmb.achGain = 1 + Math.max(0, other.achGain ?? 0);
  bus.airway.bronchodilation = Math.min(1, Math.max(0, other.bronchodilation ?? 0));
  bus.airway.histamine = Math.min(1, Math.max(0, other.histamine ?? 0));
  bus.hpvInhibit = Math.min(1, Math.max(0, other.hpvInhibit ?? 0));
  bus.metabolic.kShift = other.kShift ?? 0;
  bus.metabolic.glucoseDelta = other.glucose ?? 0;
  bus.cns.cbfVaso *= 1 + (other.cbfVaso ?? 0);
  bus.avNodeBlock = occ.avNode as number;
  return { fx, betaBlockAdd: occ.betaBlock as number, bus };
}
