// The drug-library row (Stage 7g). One row per drug; every number carries `src` and a tag (R37).
import type { PerKgPk } from './nmb.ts';
import type { AmountUnit } from './units.ts';
import type { VolatileAgent } from './volatile.ts';

export type DrugClass =
  | 'hypnotic' | 'opioid' | 'benzodiazepine' | 'ketamine' | 'alpha2' | 'volatile' | 'nmb' | 'depolariser' | 'nmbReversal'
  | 'anticholinesterase' | 'anticholinergic' | 'alpha1' | 'mixedAdrenergic' | 'betaAgonist' | 'vasopressin' | 'pde3'
  | 'betaBlocker' | 'antiarrhythmic' | 'adenosine' | 'vasodilator' | 'electrolyte' | 'metabolic' | 'opioidAntagonist'
  | 'benzoAntagonist' | 'localAnaesthetic' | 'lipid' | 'dantrolene' | 'diuretic' | 'osmotic' | 'placeholder';

/** Named engine inputs a drug can move (multipliers are "fraction change": the effect E adds to 1). */
export type PdTarget =
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' // → 7a DrugEffect
  | 'betaBlock' | 'avNode' | 'bronchodilation' | 'histamine' | 'hpvInhibit' | 'kShift' | 'glucose' | 'cmro2' | 'cbfVaso' | 'achGain';

export interface PdEffect {
  target: PdTarget;
  emax: number; // fraction change at full effect (negative = depression); for betaBlock/avNode: occupancy 0–1
  ec50: number; // in the row's concentration unit (see PkSpec)
  hill?: number;
  beta?: boolean; // β-mediated: EC50 shifted by β-blocker occupancy (decision 7)
  catecholamine?: boolean; // efficacy × acidosisFactor(pH) × sepsis vasoResp
  linear?: boolean; // E = emax·c/ec50 (per-MAC effects of the volatiles, tables §6.3), clamped to ±|emax|·3
}

/** How the drug's concentration is produced (decision 5). */
export type PkSpec =
  // µg/mL or ng/mL; ventKe0 (opioids): a SEPARATE ventilatory effect site appended after the model's own (R51 §2)
  | { kind: 'model'; model: 'eleveld' | 'schnider' | 'marsh' | 'minto' | 'shafer' | 'gepts'; ventKe0?: number }
  | { kind: 'perKg'; pk: PerKgPk; conc: 'rateEq' | 'plain' } // rateEq: Ce·CL/W in µg/kg/min (decision 4)
  | { kind: 'nmb'; agent: 'rocuronium' | 'vecuronium' | 'cisatracurium' | 'succinylcholine' | 'sugammadex' }
  | { kind: 'gamma'; refDose: number; perKg: boolean; tpS: number; t10S: number; refRate?: number; tauOnS?: number; tauOffS?: number } // c in reference-dose units
  | { kind: 'volatile'; agent: VolatileAgent }
  | { kind: 'blood' }; // chemistry only: 7g validates, consumes and logs the dose; 7c's mass balance acts (decision 10)

/** CNS roles for the DrugBus (7f/7b consumers). */
export interface CnsSpec {
  hypC50?: number; // concentration for uHyp = 1 (hypnotic potency) at 35 y
  hypC50AgeK?: number; // hypC50 × e^(−k·(age − 35)) (propofol: Eleveld, ELEVELD_CE50_AGE_K)
  remiEq?: number; // × Ce → remifentanil-equivalent ng/mL (opioids)
  midazEq?: number; // × c → midazolam-equivalent (benzodiazepines)
  cmro2?: number; // fractional CMRO2 fall at uHyp = 1 (tables §5.1)
}

export interface DrugRow {
  id: string;
  name: string;
  cls: DrugClass;
  amountUnit: AmountUnit;
  pk: PkSpec;
  /** elimination route fractions of CL (the rest organ-independent); hepatic high-extraction drugs follow liver FLOW */
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };
  pd: PdEffect[];
  cns?: CnsSpec;
  /** default syringe concentration (amountUnit per mL) and pump limit — for mL/h and TCI */
  syringePerMl?: number;
  tachyphylaxis?: number;
  /** competitive antagonist of a whole class (naloxone → opioid, flumazenil → benzodiazepine): occupancy = hill(c, ec50, emax) */
  antagonises?: { cls: DrugClass; ec50: number; emax: number };
  shared?: 'blood'; // 7c also acts on this id, reading it from bus.doses (decision 10; 7g still consumes the event)
  doses: string; // typical adult doses, text
  onset: string; // onset / peak / duration, text (research 03 §8.6)
  ir: '?'; // Iranian availability — a question for Ali on every row
  src: string;
  tag: 'P' | 'TXT' | 'ENG' | 'VERIFY';
}
