// The drug-library row. One row per drug; every number carries `src` and a tag.
import type { PerKgPk } from './nmb.ts';
import type { AmountUnit } from './units.ts';
import type { VolatileAgent } from './volatile.ts';
import type { PkRoute } from '../../types-pk.ts';

export type DrugClass =
  | 'hypnotic' | 'opioid' | 'benzodiazepine' | 'ketamine' | 'alpha2' | 'volatile' | 'nmb' | 'depolariser' | 'nmbReversal'
  | 'anticholinesterase' | 'anticholinergic' | 'alpha1' | 'mixedAdrenergic' | 'betaAgonist' | 'vasopressin' | 'pde3'
  | 'betaBlocker' | 'antiarrhythmic' | 'adenosine' | 'vasodilator' | 'electrolyte' | 'metabolic' | 'opioidAntagonist'
  | 'benzoAntagonist' | 'localAnaesthetic' | 'lipid' | 'dantrolene' | 'diuretic' | 'osmotic' | 'placeholder';

/** Named engine inputs a drug can move (multipliers are "fraction change": the effect E adds to 1). */
export type PdTarget =
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' | 'symp' | 'setF' // → circulation DrugEffect (symp, setF)
  | 'vagalMs' | 'muscarinic' // Vagal RR increment (ms, additive) and muscarinic block (occupancy 0–1)
  | 'betaBlock' | 'avNode' | 'bronchodilation' | 'histamine' | 'hpvInhibit' | 'kShift' | 'glucose' | 'cmro2' | 'cbfVaso' | 'achGain'
  /** An INDIRECT sympathomimetic's central drive (ephedrine, ketamine) — added to the endocrine model's `extraSymp`,
   * so β-blockade blunts its β1 share and catecholamine depletion weakens it, instead of multiplying the circulation. */
  | 'sympDrive'
  /** An ADDED antinociception (IV lidocaine's airway-reflex blunting) → the neuro model's `antinoc`, 0–0.6. */
  | 'antinocAdd'
  /** Class-weighted antiarrhythmic occupancy 0–1 → `bus.rhythm.antiarrhythmicU`, read by the conversion hooks and by
   * the shock outcome. */
  | 'antiarrhythmic'
  /** An exogenous GLUCOCORTICOID as cortisol-equivalent nmol/L above basal → the endocrine model's cortisol
   * metabolic term (insulin resistance, gluconeogenesis). */
  | 'glucocorticoid'
  /** An added QTc, ms → the blood model's ECG QTc delta (`bloodEcgTargets`). */
  | 'qtc';

export interface PdEffect {
  target: PdTarget;
  emax: number; // fraction change at full effect (negative = depression); for betaBlock/avNode: occupancy 0–1
  ec50: number; // in the row's concentration unit (see PkSpec)
  hill?: number;
  beta?: boolean; // β-mediated: EC50 shifted by β-blocker occupancy (decision 7)
  /** A β2 effect — occupied only by NON-SELECTIVE blockade (propranolol), not by a β1-selective drug. */
  beta2?: boolean;
  catecholamine?: boolean; // efficacy × acidosisFactor(pH) × sepsis vasoResp
  linear?: boolean; // E = emax·c/ec50 (per-MAC effects of the volatiles, tables §6.3), clamped to ±|emax|·3
}

/** How the drug's concentration is produced (decision 5). */
export type PkSpec =
  // µg/mL or ng/mL; ventKe0 (opioids): a SEPARATE ventilatory effect site appended after the model's own
  | { kind: 'model'; model: 'eleveld' | 'schnider' | 'marsh' | 'minto' | 'shafer' | 'gepts'; ventKe0?: number }
  | { kind: 'perKg'; pk: PerKgPk; conc: 'rateEq' | 'plain' } // rateEq: Ce·CL/W in µg/kg/min (decision 4)
  | { kind: 'nmb'; agent: 'rocuronium' | 'vecuronium' | 'cisatracurium' | 'succinylcholine' | 'sugammadex' }
  | { kind: 'gamma'; refDose: number; perKg: boolean; tpS: number; t10S: number; refRate?: number; tauOnS?: number; tauOffS?: number; refRatePerKg?: boolean } // c in reference-dose units; refRatePerKg — the infusion reference is per kg even when the bolus reference is not (insulin)
  | { kind: 'volatile'; agent: VolatileAgent }
  | { kind: 'blood' }; // Chemistry only: the drug model validates, consumes and logs the dose; blood mass balance acts

/** CNS roles for the DrugBus (neuro and lung consumers). */
export interface CnsSpec {
  hypC50?: number; // concentration for uHyp = 1 (hypnotic potency) at 35 y
  hypC50AgeK?: number; // hypC50 × e^(−k·(age − 35)) (propofol: Eleveld, ELEVELD_CE50_AGE_K)
  remiEq?: number; // × Ce → remifentanil-equivalent ng/mL (opioids)
  midazEq?: number; // × c → midazolam-equivalent (benzodiazepines)
  cmro2?: number; // fractional CMRO2 fall at uHyp = 1 (tables §5.1)
  /** Volatiles: CMRO2 × max(0.5, 1 − cmro2PerMac·MAC) (tables §5.1 rows; replaces `cmro2`). */
  cmro2PerMac?: number;
  /** A dissociative hypnotic (ketamine) — counted in `dissoc` for the neuro model's EEG/BIS rise and airway reflexes. */
  dissociative?: boolean;
  /** Ventilatory potency relative to this row's hypnotic potency (1 = same; ketamine ≈ 0.3, T6.3). */
  ventShare?: number;
  /** An opioid's MAC-reduction potency as remifentanil-equivalents per unit Ce, where it differs from the EEG weight
   * `remiEq` (fentanyl 0.8 = remifentanil 1.2 ≈ fentanyl 1.5 ng/mL, tables §5d). Absent = `remiEq`. */
  macRemiEq?: number;
  /** An opioid's VENTILATORY potency as remifentanil-equivalents per unit Ce at its ventilatory site (remifentanil
   * 1.0 pinned; fentanyl 0.55). Absent = `remiEq`. */
  ventRemiEq?: number;
  /** Volatiles: DIRECT CBF change at 0.5 and 1.5 MAC — the vasodilation beyond flow–metabolism coupling
   * (Matta 1999 under an isoelectric EEG, tables §5.1); published as `cbfVaso`, and the organ model's NET CBF =
   * direct × coupling. */
  cbfDirect?: readonly [number, number];
}

export interface DrugRow {
  id: string;
  name: string;
  cls: DrugClass;
  amountUnit: AmountUnit;
  pk: PkSpec;
  /** elimination route fractions of CL (the rest organ-independent); hepatic high-extraction drugs follow liver FLOW */
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number;
    /** Gamma rows only (research/13): the TERMINAL elimination half-life, s. The share of the effect curve's
     * decline that clearance governs is min(1, (ln 2 / t12S) / chain ke); the rest is redistribution, which organ
     * function does not change. Absent = the decline is organ-independent (the row keeps its curve). */
    t12S?: number };
  /** The central volume and the fast distribution follow cardiac output (propofol; Kazama 2002). */
  flowDist?: boolean;
  pd: PdEffect[];
  cns?: CnsSpec;
  /** default syringe concentration (amountUnit per mL) and pump limit — for mL/h and TCI */
  syringePerMl?: number;
  tachyphylaxis?: number;
  /** competitive antagonist of a whole class (naloxone → opioid, flumazenil → benzodiazepine): occupancy = hill(c, ec50, emax) */
  antagonises?: { cls: DrugClass; ec50: number; emax: number };
  shared?: 'blood'; // The blood model also acts on this id, via bus.doses (the drug model still consumes the event)
  /** The routes this row honours — the engine's kinetics are intravenous; absent = IV_ROUTES. A dose by any other
   * route is refused with a reason (no absorption model is built). */
  routes?: readonly PkRoute[];
  /** A documented maximum — exceeding it raises a `drugWarning` event, never a clamp. `perKg`: × actual weight;
   * `scope` 'cumulative' sums every bolus of the row. Only maxima the row's own `doses` text sources are set; the rest
   * wait on Ali's dosing-preset table. */
  /** The documented maximum INFUSION rate (amount per hour); a faster rate or a bolus order is warned about. */
  maxRatePerH?: { amount: number; perKg?: boolean; src: string };
  maxDose?: { amount: number; perKg: boolean; scope: 'dose' | 'cumulative'; src: string };
  /** Another module reads this row's ordered RATE and acts on it (the endocrine model reads dextrose), so an infusion
   * is meaningful although the row's own curve has no infusion reference. */
  rateActsVia?: string;
  doses: string; // typical adult doses, text
  onset: string; // onset / peak / duration, text (research 03 §8.6)
  ir: '?'; // Iranian availability — a question for Ali on every row
  src: string;
  tag: 'P' | 'TXT' | 'ENG' | 'VERIFY';
}
