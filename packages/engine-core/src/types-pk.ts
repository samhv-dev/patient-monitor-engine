// The drug model's public types (PK/PD), kept in their own file so parallel modules do not collide in types.ts.
import type { SimSeconds } from './types.ts';

export type DoseUnit = 'mcg' | 'mg' | 'g' | 'mcg/kg' | 'mg/kg' | 'g/kg' | 'mEq' | 'mmol' | 'mmol/kg' | 'units' | 'units/kg' | 'mL' | 'mL/kg';
export type RateUnit = 'mcg/min' | 'mg/min' | 'mcg/kg/min' | 'mcg/kg/h' | 'mg/kg/h' | 'mg/h' | 'units/min' | 'units/h' | 'mmol/h' | 'mL/h' | 'mL/kg/min'; // mmol/h (potassium chloride)
export type PkRoute = 'iv' | 'io' | 'im' | 'inh' | 'neb' | 'sc' | 'perineural' | 'central'; // 'neb': the blood model's salbutamol

/**
 * Brief §7.2 `drug` (bolus; `infusion: true` with a rate unit starts/changes an infusion, dose 0 stops it) plus the
 * drug kinds: `infusion` (a syringe pump: rate in a rate unit, or mL/h with the syringe concentration), `tci` (target 0
 * stops), `vaporiser` (dial 0 closes it; N2O as a fraction of the fresh gas).
 */
export type PkClinicalEvent =
  | { kind: 'drug'; drugId: string; dose: number; unit: DoseUnit | RateUnit; route: PkRoute; infusion?: boolean; overS?: number; concentrationPct?: number } // concentrationPct: hypertonic saline 3 | 7.5 | 23.4 (default 3)
  | { kind: 'infusion'; drugId: string; rate: number; unit: RateUnit; concentration?: { amount: number; unit: 'mg' | 'mcg' | 'units' | 'g'; perMl: number } }
  | { kind: 'tci'; drugId: string; model?: string; mode: 'plasma' | 'effect'; target: number; maxRateMlH?: number }
  | { kind: 'vaporiser'; agent: 'sevoflurane' | 'isoflurane' | 'desflurane'; dialPct: number; fgfLpm?: number; n2oFrac?: number }
  | PumpEvent;

/** A syringe's or a bag's concentration: `amount` `unit` per `perMl` mL. */
export interface PumpConcentration { amount: number; unit: 'mg' | 'mcg' | 'g' | 'units' | 'mmol'; perMl: number }

/**
 * A pump channel's command (docs/plans/pump-rack-tci.md D2 and D4, piece E1): the host translates the pump device's
 * press into one of these, with the syringe's or bag's TRUE `contents` on `load` and the PROGRAMMED drug on `program`;
 * the device numbers the engine needs (the syringe size, the IV set, the bolus and purge rates) are resolved by the
 * host from the device profile and carried here, so the engine holds none. `ch` is the channel, 1–8 (PQ1). Rate mode
 * only; TCI on a channel is piece E2.
 * - `load`: put a syringe (`channel: 'syringe'`, its size `syringeMl`) or a bag (`channel: 'drip'`) on the channel; a
 *   channel keeps the kind of its first load.
 * - `program`: the drug and concentration the learner chose from the pump's list (independent of the contents, §8);
 *   on a drip channel also its IV set, drops/mL.
 * - `rate`: mL/h; a dose rate, converted with the PROGRAMMED concentration (and `weightKg`, the weight typed into the
 *   pump, for a per-kg rate); on a drip channel drops/min (mL/h = drops/min × 60 ÷ set) and a volume limit `limitMl`
 *   (null: none).
 * - `start` / `stop`: run and pause, the programme kept. `unload`: take the syringe or bag off.
 * - `purge`: `volumeMl` at `rateMlH`, to waste before the channel has delivered anything, into the patient after (D7).
 * - `bolus` (syringe channels): `volumeMl`, or `dose` converted with the programme, at `rateMlH`.
 */
export type PumpEvent =
  | { kind: 'pump'; action: 'load'; ch: number; channel: 'syringe' | 'drip'; contents: { drugId: string; concentration: PumpConcentration; volumeMl: number }; syringeMl?: number }
  | { kind: 'pump'; action: 'program'; ch: number; drugId: string; concentration: PumpConcentration; set?: number }
  | { kind: 'pump'; action: 'rate'; ch: number; rate: number; unit: RateUnit | 'drops/min'; limitMl?: number | null; weightKg?: number }
  | { kind: 'pump'; action: 'start' | 'stop' | 'unload'; ch: number }
  | { kind: 'pump'; action: 'purge'; ch: number; volumeMl: number; rateMlH: number }
  | { kind: 'pump'; action: 'bolus'; ch: number; volumeMl?: number; dose?: { amount: number; unit: DoseUnit }; weightKg?: number; rateMlH: number };

/** The alarms a channel raises when it stops (D8): End (syringe), Empty Container and Infusion Complete (drip). */
export type PumpAlarmId = 'end' | 'emptyContainer' | 'infusionComplete';

/** One pump channel's state, in `PkState.pumps` (D4), so snapshot and restore carry it and every follower has it. */
export interface PumpChannel {
  ch: number;
  kind: 'syringe' | 'drip';
  /** What the syringe or bag TRULY holds; what the patient receives. null: nothing loaded. */
  contents: { drugId: string; concentration: PumpConcentration; loadedMl: number } | null;
  syringeMl: number | null; // the loaded syringe's size (syringe channels)
  /** What the learner programmed: the face's drug, the dose-rate conversion. */
  programmed: { drugId: string; concentration: PumpConcentration } | null;
  set: number | null; // drip channels: the IV set, drops/mL
  mode: 'rate'; // E2 adds 'tci'
  rate: { rate: number; unit: RateUnit | 'drops/min'; weightKg?: number } | null; // as entered
  rateMlH: number; // the entered rate in mL/h, under the current programme and set
  limitMl: number | null; // drip channels: the volume limit (null: none)
  volumeMl: number; // left in the syringe or bag
  infusedMl: number; // into the patient since the load
  wasteMl: number; // purged to waste (the line primed) since the load
  paused: boolean;
  /** A bolus or purge in progress: it runs at its own rate in place of the channel's. */
  rapid: { what: 'bolus' | 'purge'; leftMl: number; rateMlH: number; toPatient: boolean } | null;
  alarms: PumpAlarmId[];
}

/** One channel in the `drugs` event. The pump face renders `programmed`; `contents` is the instructor's truth (§8). */
export interface PumpPanelRow {
  ch: number; kind: 'syringe' | 'drip';
  state: 'notLoaded' | 'loaded' | 'running' | 'paused' | 'alarm';
  programmed: { drugId: string; concentration: PumpConcentration } | null;
  contents: { drugId: string; concentration: PumpConcentration } | null;
  syringeMl: number | null; set: number | null; mode: 'rate';
  rate: { rate: number; unit: RateUnit | 'drops/min'; weightKg?: number } | null; rateMlH: number; limitMl: number | null;
  volumeMl: number; infusedMl: number; wasteMl: number;
  timeToEmptyMin: number | null; // at the running rate (null: not running)
  alarms: PumpAlarmId[];
}

/** A validated `pump` command whose channel changed before it applied (the engine applies a command on a later tick
 * than it validates it: the syringe emptied, another command unloaded it): not applied, and said. */
export type PumpRefusedEvent = { type: 'pumpRefused'; t: SimSeconds; ch: number; action: string; reason: string };

/** A channel stopped by its contents or its limit (D8), raised once when it happens. */
export type PumpAlarmEvent = { type: 'pumpAlarm'; t: SimSeconds; ch: number; channel: 'syringe' | 'drip'; alarm: PumpAlarmId; programmed: string | null };

/**
 * One drug's concentrations. All in `unit`, the library row's concentration unit: propofol µg/mL; opioids, NMB agents
 * and succinylcholine ng/mL; rate-equivalent vasoactives µg/kg/min; gamma rows "× ref dose". Totals, net of sugammadex
 * binding. The neuro model computes every NMB/depth/drive effect from these; the drug model computes none of them.
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

/** One inhaled agent incl. N2O. Fractions of 1 atm in %. */
export interface BusVolatile { fet: number; brain: number; macAge: number; macFrac: number }

/** One accepted bolus (decision 10): listed in `bus.doses` for exactly one engine advance pass. */
export interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds; concentrationPct?: number } // Hypertonic saline only (Na load: blood model; osmotic ICP effect: organ model)

/** What the drug model publishes every 100 ms for the other modules. Plain data. */
export interface DrugBus {
  agents: Record<string, BusAgent>;
  volatiles: Partial<Record<'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o', BusVolatile>>;
  doses: DoseLogEntry[];
  antagonist: { opioid: number; benzodiazepine: number }; // EC50 multipliers of the class (1 = no antagonist)
  cns: {
    propCe: number; opioidCeRemiEq: number; macBrain: number; ketamineCe: number; benzoCeMidazEq: number; dexmedCe: number;
    /** The ONE hypnotic-potency output — propofol-equivalent brain Ce, µg/mL (every row with hypC50). */
    hypPropEq: number;
    /** The same, weighted by CnsSpec.ventShare — the ventilatory drive's hypnotic input. */
    hypVentPropEq: number;
    /** The ONE opioid-potency output — fentanyl-equivalent Ce, ng/mL, at the brain (MAC-reduction potency,
     * `macRemiEq`) and the ventilatory site (`ventRemiEq`); fentanyl Ce X alone publishes X at both. */
    opioidCeFentEq: number; opioidVentFentEq: number;
    /** Share of hypPropEq contributed by DISSOCIATIVE agents (ketamine), 0–1. */
    dissoc: number;
    /** An indirect sympathomimetic's central drive (ephedrine, ketamine) → the endocrine model's `extraSymp`, 0–3. */
    sympDrive: number;
    /** Added antinociception from the drug PD (IV lidocaine), 0–0.6 → the neuro model's `antinoc`. */
    antinocAdd: number;
    /** Share of hypVentPropEq contributed by BENZODIAZEPINES, 0–1 — the drive's per-class α. */
    benzoShare: number;
    /** EEG stage E1: `hypPropEq` split by EEG class (µg/mL propofol-equivalent); the five parts sum to it. */
    hypByClass: { gabaIv: number; barbiturate: number; etomidate: number; benzo: number; dissociative: number };
    /** EEG stage E1: dexmedetomidine effect-site Ce ÷ its EEG potency point (dimensionless; 1 = 2.5 ng/mL). */
    alpha2Eq: number;
    uHyp: number; uOpioid: number; uSurface: number; seizure: boolean; cmro2Mult: number; cbfVaso: number;
  };
  nmb: { achGain: number }; // Neostigmine's acetylcholine gain (1 = none); the neuro model applies the ceiling
  airway: { bronchodilation: number; histamine: number };
  hpvInhibit: number;
  /** `glucocorticoidNmolL` = an exogenous glucocorticoid (dexamethasone) as cortisol-equivalent nmol/L above basal,
   * read by the endocrine model's cortisol metabolic term. */
  metabolic: { kShift: number; glucoseDelta: number; dantroleneE: number; glucocorticoidNmolL: number };
  last: { cnsE: number; cvE: number };
  avNodeBlock: number; // adenosine/β/Ca-channel AV-nodal effect 0–1
  /** Potency-weighted antiarrhythmic occupancy (amiodarone, lidocaine, procainamide), 0–1. */
  rhythm: { antiarrhythmicU: number };
  /** Drug-added QTc, ms (ondansetron) — the blood model adds it to its ECG QTc delta. */
  qtcMsAdd: number;
}

export const DRUG_BUS_NEUTRAL: DrugBus = {
  agents: {},
  volatiles: {},
  doses: [],
  antagonist: { opioid: 1, benzodiazepine: 1 },
  cns: { propCe: 0, opioidCeRemiEq: 0, macBrain: 0, ketamineCe: 0, benzoCeMidazEq: 0, dexmedCe: 0, hypPropEq: 0, hypVentPropEq: 0, opioidCeFentEq: 0, opioidVentFentEq: 0, benzoShare: 0, hypByClass: { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 }, alpha2Eq: 0, dissoc: 0, sympDrive: 0, antinocAdd: 0, uHyp: 0, uOpioid: 0, uSurface: 0, seizure: false, cmro2Mult: 1, cbfVaso: 1 },
  nmb: { achGain: 1 },
  airway: { bronchodilation: 0, histamine: 0 },
  hpvInhibit: 0,
  metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0, glucocorticoidNmolL: 0 },
  last: { cnsE: 0, cvE: 0 },
  avNodeBlock: 0,
  rhythm: { antiarrhythmicU: 0 },
  qtcMsAdd: 0,
};

export interface DrugPanelRow {
  id: string; name: string; unit: string; // concentration unit (µg/mL, ng/mL, rate-eq µg/kg/min, ×ref dose)
  cp: number; ce: number;
  rate: number | null; rateUnit: string | null; // current pump rate (null: none)
  tci: { mode: 'plasma' | 'effect'; target: number; model: string } | null;
  totalAmount: number; amountUnit: string;
  decrement50Min: number | null; // time for Cp to fall 50 % if the pump stopped now (decision 13)
}

/** A dose above the row's documented maximum (`DrugRow.maxDose`) — the dose is still given, as ordered. */
export type DrugWarningEvent = { type: 'drugWarning'; t: SimSeconds; drugId: string; text: string };
/** A dose by a modelled non-IV route that has a local effect (`DrugRow.routeModels`): what it does at the site, with its
 * source. Raised once per dose; nothing on the monitor follows from it. */
export type DrugLocalEffectEvent = { type: 'drugLocalEffect'; t: SimSeconds; drugId: string; route: PkRoute; amount: number; amountUnit: string; text: string; src: string };

export type DrugsEvent = {
  type: 'drugs'; t: SimSeconds;
  drugs: DrugPanelRow[];
  volatile: { agent: string; dialPct: number; fgfLpm: number; fi: number; fa: number; brain: number; macAge: number; macFrac: number; n2oFrac: number } | null;
  macTotal: number;
  /** The pump channels (piece E1); absent until the first `pump` event, so a run without pumps is unchanged. */
  pumps?: PumpPanelRow[];
};
