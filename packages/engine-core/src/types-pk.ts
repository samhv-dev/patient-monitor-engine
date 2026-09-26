// Stage 7g public types (drug PK/PD), kept in their own file so parallel stages do not collide in types.ts.
import type { SimSeconds } from './types.ts';

export type DoseUnit = 'mcg' | 'mg' | 'g' | 'mcg/kg' | 'mg/kg' | 'g/kg' | 'mEq' | 'mmol' | 'mmol/kg' | 'units' | 'units/kg' | 'mL' | 'mL/kg';
export type RateUnit = 'mcg/min' | 'mg/min' | 'mcg/kg/min' | 'mcg/kg/h' | 'mg/kg/h' | 'mg/h' | 'units/min' | 'units/h' | 'mL/h' | 'mL/kg/min';
export type PkRoute = 'iv' | 'io' | 'im' | 'inh' | 'neb' | 'sc' | 'perineural' | 'central'; // 'neb': 7c's salbutamol

/**
 * Brief §7.2 `drug` (bolus; `infusion: true` with a rate unit starts/changes an infusion, dose 0 stops it) plus the
 * 7g kinds: `infusion` (a syringe pump: rate in a rate unit, or mL/h with the syringe concentration), `tci`
 * (target 0 stops), `vaporiser` (dial 0 closes it; N2O as a fraction of the fresh gas).
 */
export type PkClinicalEvent =
  | { kind: 'drug'; drugId: string; dose: number; unit: DoseUnit | RateUnit; route: PkRoute; infusion?: boolean; overS?: number }
  | { kind: 'infusion'; drugId: string; rate: number; unit: RateUnit; concentration?: { amount: number; unit: 'mg' | 'mcg' | 'units' | 'g'; perMl: number } }
  | { kind: 'tci'; drugId: string; model?: string; mode: 'plasma' | 'effect'; target: number; maxRateMlH?: number }
  | { kind: 'vaporiser'; agent: 'sevoflurane' | 'isoflurane' | 'desflurane'; dialPct: number; fgfLpm?: number; n2oFrac?: number };

/**
 * One drug's concentrations (R51 §2). All in `unit`, the library row's concentration unit: propofol µg/mL; opioids,
 * NMB agents and succinylcholine ng/mL; rate-equivalent vasoactives µg/kg/min; gamma rows "× ref dose". Totals, net
 * of sugammadex binding. 7f computes every NMB/depth/drive effect from these; 7g computes none of them.
 */
export interface BusAgent {
  unit: string;
  plasma: number; // Cp (gamma rows: the normalised curve, no plasma model)
  brain: number; // CNS effect site (the model's own ke0)
  vent?: number; // opioids only: ventilatory effect site (remifentanil ke0 0.92, Bouillon 2003)
  nmj?: number; // NMB agents and succinylcholine: adductor pollicis
  dia?: number; // NMB agents and succinylcholine: diaphragm/larynx
  cumulativeMgPerKg: number; // total given so far (0 for units/mmol/mL rows)
  sgxBoundFrac?: number; // rocuronium/vecuronium: fraction of the given amount bound by sugammadex in plasma
}

/** One inhaled agent incl. N2O (R51 §2, addendum 9). Fractions of 1 atm in %. */
export interface BusVolatile { fet: number; brain: number; macAge: number; macFrac: number }

/** One accepted bolus (decision 10): listed in `bus.doses` for exactly one engine advance pass. */
export interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds }

/** What 7g publishes every 100 ms for the other modules (plan "Interfaces"). Plain data. */
export interface DrugBus {
  agents: Record<string, BusAgent>;
  volatiles: Partial<Record<'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o', BusVolatile>>;
  doses: DoseLogEntry[];
  antagonist: { opioid: number; benzodiazepine: number }; // EC50 multipliers of the class (1 = no antagonist)
  cns: {
    propCe: number; opioidCeRemiEq: number; macBrain: number; ketamineCe: number; benzoCeMidazEq: number; dexmedCe: number;
    uHyp: number; uOpioid: number; uSurface: number; seizure: boolean; cmro2Mult: number; cbfVaso: number;
  };
  nmb: { achGain: number }; // neostigmine's acetylcholine gain (1 = none); 7f applies the ceiling
  airway: { bronchodilation: number; histamine: number };
  hpvInhibit: number;
  metabolic: { kShift: number; glucoseDelta: number; dantroleneE: number };
  last: { cnsE: number; cvE: number };
  avNodeBlock: number; // adenosine/β/Ca-channel AV-nodal effect 0–1
}

export const DRUG_BUS_NEUTRAL: DrugBus = {
  agents: {},
  volatiles: {},
  doses: [],
  antagonist: { opioid: 1, benzodiazepine: 1 },
  cns: { propCe: 0, opioidCeRemiEq: 0, macBrain: 0, ketamineCe: 0, benzoCeMidazEq: 0, dexmedCe: 0, uHyp: 0, uOpioid: 0, uSurface: 0, seizure: false, cmro2Mult: 1, cbfVaso: 1 },
  nmb: { achGain: 1 },
  airway: { bronchodilation: 0, histamine: 0 },
  hpvInhibit: 0,
  metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0 },
  last: { cnsE: 0, cvE: 0 },
  avNodeBlock: 0,
};

export interface DrugPanelRow {
  id: string; name: string; unit: string; // concentration unit (µg/mL, ng/mL, rate-eq µg/kg/min, ×ref dose)
  cp: number; ce: number;
  rate: number | null; rateUnit: string | null; // current pump rate (null: none)
  tci: { mode: 'plasma' | 'effect'; target: number; model: string } | null;
  totalAmount: number; amountUnit: string;
  decrement50Min: number | null; // time for Cp to fall 50 % if the pump stopped now (decision 13)
}

export type DrugsEvent = {
  type: 'drugs'; t: SimSeconds;
  drugs: DrugPanelRow[];
  volatile: { agent: string; dialPct: number; fgfLpm: number; fi: number; fa: number; brain: number; macAge: number; macFrac: number; n2oFrac: number } | null;
  macTotal: number;
};
