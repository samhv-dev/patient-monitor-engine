// Combination of every active drug's concentration into the engine inputs (Stage 7g decisions 6–7). R51 §2: the
// circulation PD is 7g's; NMB, depth-index, MAC-awake and ventilatory-drive PD are 7f's (it reads bus.agents).
import type { DrugEffect } from '../circ/drugs.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../types-pk.ts';
import { acidosisFactor, competitiveEc50, ELEVELD_CE50_AGE_K, FENT_VENT_REMI_EQ, hill, responseSurface } from './pd.ts';
import type { DrugRow, PdTarget } from './row.ts';

export interface Active {
  row: DrugRow;
  c: number; // PD concentration (row units): brain/effect-site Ce, rate-equivalent, or the gamma curve
  vent?: number; // FU-7 (addendum 20): the row's SEPARATE ventilatory effect site (opioids), row units
}

export interface PdContext {
  ph: number;
  betaBlockC: number; // chronic β-blockade from the 7a profile (0–1)
  /** FU-7 (addendum 21): the profile's β-receptor OCCUPANCY (`prof.betaOcc`) — the competitive dose-ratio input.
   * Absent (an older caller) falls back to `betaBlockC`, i.e. the pre-FU-7 behaviour. */
  betaOccProfile?: number;
  /** FU-7 (addendum 21): the chronic blockade is non-selective (β2 rows are occupied too). */
  betaNonSel?: boolean;
  vasoResp: number; // sepsis catecholamine responsiveness (7f/§5e), 1 = normal
  ageY: number;
  macBrain: number; // total age-adjusted MAC fraction (volatile model)
}

export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1, symp: 1, setF: 1, vagalMs: 0, muscBlock: 0 };
const FX_TARGETS = ['hr', 'ees', 'svr', 'pvr', 'gv', 'gvHr', 'symp', 'setF'] as const; // FU-4 G2: symp, setF
const OCCUPANCY: readonly PdTarget[] = ['betaBlock', 'avNode', 'muscarinic']; // FU-4 G7: muscarinic block (atropine, glycopyrrolate)

/** Remifentanil-equivalent Ce that halves MAC ≈ 1.2 ng/mL (tables §5d [VERIFY]) → uOpioid unit. */
const OPIOID_U1 = 1.2;
/** FU-7 (addendum 20): propofol's hypnotic C50 at 35 y, µg/mL (Eleveld BIS 2024; the propofol-equivalent unit). */
export const PROP_HYP_C50_REF = 3.08;
/** FU-7 (addendum 20): remifentanil → fentanyl equivalence for the potency output (tables §5d: remi 1.2 ≈ fentanyl 1.5 ng/mL). */
export const FENT_PER_REMI = 1.25;

/** Direct CBF factor of a volatile at `mac` — the vasodilation beyond flow–metabolism coupling (Matta 1999 MCA velocity
 * under an isoelectric EEG, tables §5.1) — piecewise linear through (0, 1), (0.5, 1 + at05), (1.5, 1 + at15), extended
 * with the upper slope (FU-2 item 8). */
export function volatileCbfDirect(mac: number, direct: readonly [number, number]): number {
  const [at05, at15] = direct;
  if (!(mac > 0)) return 1;
  return mac <= 0.5 ? 1 + (at05 * mac) / 0.5 : 1 + at05 + (at15 - at05) * (mac - 0.5);
}

export function combine(actives: readonly Active[], ctx: PdContext): { fx: DrugEffect; betaBlockAdd: number; bus: DrugBus } {
  const bus: DrugBus = structuredClone(DRUG_BUS_NEUTRAL);
  // 1. occupancy targets first (β-blockade feeds the β-agonist EC50 shift)
  const occ: Record<string, number> = { betaBlock: 0, avNode: 0, muscarinic: 0 };
  for (const a of actives)
    for (const e of a.row.pd)
      if (OCCUPANCY.includes(e.target)) occ[e.target] = 1 - (1 - (occ[e.target] as number)) * (1 - Math.max(0, hill(a.c, e.ec50, e.emax, e.hill ?? 1)));
  // FU-7 (addendum 21): the DRUG occupancy and the PROFILE's own receptor occupancy combine competitively; β2 rows are
  // occupied by a non-selective chronic blocker (and by every β-blocker DRUG row, which v1 does not tag by selectivity).
  const occProfile = ctx.betaOccProfile ?? ctx.betaBlockC;
  const betaOcc = 1 - (1 - (occ.betaBlock as number)) * (1 - occProfile);
  const betaOcc2 = 1 - (1 - (occ.betaBlock as number)) * (1 - (ctx.betaNonSel ? occProfile : 0));
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
      const ec50 = e.beta ? competitiveEc50(e.ec50, e.beta2 ? betaOcc2 : betaOcc) : e.ec50; // FU-7 (addendum 21)
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
    else if (target === 'vagalMs') fx.vagalMs = (fx.vagalMs ?? 0) + E; // FU-4 G7: additive RR increment (ms)
    else other[target] = (other[target] ?? 0) + E;
  }
  // 3. the CNS summaries (7d, demo); 7f computes its own PD from the per-agent Ce the pipeline adds (Task 15)
  let remiEq = 0;
  let midazEq = 0;
  let hypEq = 0; // FU-7 (addendum 20): propofol-equivalent Ce, µg/mL
  let hypEqDis = 0; // its dissociative share
  let hypVentEq = 0; // FU-7: propofol-equivalent for the ventilatory drive (ventShare-weighted)
  let hypVentBenzo = 0; // FU-7 (review F2): its benzodiazepine share — the drive's per-class α
  let macRemiEq = 0; // FU-7 (D16): remifentanil-equivalent at MAC-reduction potency (the brain fentanyl-equivalent)
  let ventRemiEq = 0; // FU-7 (D16): remifentanil-equivalent at the VENTILATORY site and potency (R51 §2; ruling 4)
  // FU-7 (review F21): the Eleveld age factor is loop-invariant — ONE exponential per combine, not one per agent
  const ageF = Math.exp(-ELEVELD_CE50_AGE_K * (ctx.ageY - 35));
  for (const a of actives) {
    const r = a.row;
    const c = conc(a);
    // Eleveld Ce50 age term (tables §5d; R51 addendum 11): C50(age) = C50(35)·e^(−k(age − 35))
    const hypC50 = r.cns?.hypC50 !== undefined ? r.cns.hypC50 * Math.exp(-(r.cns.hypC50AgeK ?? 0) * (ctx.ageY - 35)) : undefined;
    if (r.cls === 'hypnotic' && r.id === 'propofol') bus.cns.propCe = a.c;
    if (hypC50 !== undefined) {
      // FU-7 (review F8): ONE antagonised hypnotic load — `uHyp` and the equivalent are the same sum in different units,
      // so flumazenil moves the response surface 7d reads exactly as it moves the depth index (it used the raw a.c).
      bus.cns.uHyp += c / hypC50;
      // FU-7 (addendum 20): ONE hypnotic-potency output — the propofol Ce with the same hypnotic effect at this age.
      // `hypC50` already carries the row's OWN age term (`hypC50AgeK`, D19a); ageF is propofol's (Eleveld), so
      // propofol's own equivalent IS its Ce at every age. `c` is antagonist-divided (flumazenil), as for every target.
      const eq = (c / hypC50) * PROP_HYP_C50_REF * ageF;
      hypEq += eq;
      hypVentEq += eq * (r.cns?.ventShare ?? 1);
      if (r.cns?.dissociative) hypEqDis += eq;
      if (r.cls === 'benzodiazepine') hypVentBenzo += eq * (r.cns?.ventShare ?? 1);
    }
    if (r.cns?.remiEq) {
      remiEq += c * r.cns.remiEq;
      macRemiEq += c * (r.cns.macRemiEq ?? r.cns.remiEq); // FU-7 (D16): MAC-reduction potency (fentanyl 0.8)
      // FU-7 (D16; the first fixer's finding): the ventilatory site is antagonist-divided ONCE, here, like `c` — naloxone
      // reverses the ventilatory site too; a row without a separate site falls back to the brain Ce.
      const cv = a.vent !== undefined ? a.vent / competitiveEc50(1, antag.get(r.cls) ?? 0) : c;
      ventRemiEq += cv * (r.cns.ventRemiEq ?? r.cns.remiEq);
    }
    if (r.cns?.midazEq) midazEq += c * r.cns.midazEq;
    if (r.id === 'dantrolene') bus.metabolic.dantroleneE = hill(a.c, 1, 1);
    if (r.cls === 'ketamine') bus.cns.ketamineCe = a.c;
    if (r.cls === 'alpha2') bus.cns.dexmedCe = a.c;
    if (r.cns?.cmro2PerMac !== undefined) {
      // FU-2 item 8 (tables §5.1): CMRO2 per MAC, and the DIRECT vasodilation beyond coupling (7d's NET CBF = direct × coupling)
      bus.cns.cmro2Mult *= Math.max(0.5, 1 - r.cns.cmro2PerMac * a.c);
      if (r.cns.cbfDirect) bus.cns.cbfVaso *= volatileCbfDirect(a.c, r.cns.cbfDirect);
    } else if (r.cns?.cmro2) bus.cns.cmro2Mult *= 1 - hill(a.c / (hypC50 ?? 1), 1, r.cns.cmro2);
  }
  bus.cns.opioidCeRemiEq = remiEq;
  // FU-7 (addendum 20): the two potency outputs 7f's depth and drive read
  bus.cns.hypPropEq = hypEq;
  bus.cns.hypVentPropEq = hypVentEq;
  bus.cns.dissoc = hypEq > 0 ? hypEqDis / hypEq : 0;
  bus.cns.benzoShare = hypVentEq > 0 ? hypVentBenzo / hypVentEq : 0; // FU-7 (review F2)
  // FU-7 (D16): TRUE fentanyl-equivalents, antagonist applied once (7f must not divide again): fentanyl Ce X alone
  // publishes X at the brain (MAC potency: 1.25 × 0.8) and at the ventilatory site (÷ its ventilatory weight 0.55).
  bus.cns.opioidCeFentEq = FENT_PER_REMI * macRemiEq;
  bus.cns.opioidVentFentEq = ventRemiEq / FENT_VENT_REMI_EQ;
  bus.cns.benzoCeMidazEq = midazEq;
  bus.cns.macBrain = ctx.macBrain;
  bus.cns.uOpioid = remiEq / OPIOID_U1;
  bus.cns.uSurface = responseSurface(bus.cns.uHyp + ctx.macBrain, bus.cns.uOpioid);
  bus.nmb.achGain = 1 + Math.max(0, other.achGain ?? 0);
  bus.airway.bronchodilation = Math.min(1, Math.max(0, other.bronchodilation ?? 0));
  bus.airway.histamine = Math.min(1, Math.max(0, other.histamine ?? 0));
  bus.hpvInhibit = Math.min(1, Math.max(0, other.hpvInhibit ?? 0));
  bus.cns.sympDrive = Math.max(0, other.sympDrive ?? 0); // FU-7 (addenda 20–21): the indirect sympathomimetic drive
  bus.metabolic.kShift = other.kShift ?? 0;
  bus.metabolic.glucoseDelta = other.glucose ?? 0;
  bus.cns.cbfVaso *= 1 + (other.cbfVaso ?? 0);
  bus.avNodeBlock = occ.avNode as number;
  fx.muscBlock = occ.muscarinic as number; // FU-4 G7
  fx.vagalMs = (fx.vagalMs ?? 0) * (1 - fx.muscBlock); // an anticholinergic blocks every vagal RR increment at the SA node
  return { fx, betaBlockAdd: occ.betaBlock as number, bus };
}
