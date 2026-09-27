// Stage 7f's READER of Stage 7g's DrugBus (R51 §1–2). 7f has NO PK: every concentration it uses comes from
// `ps.pk.bus` and is converted here, once, into 7f's units (ng/mL; age-adjusted MAC fractions). Pure functions.
// Field provenance — 7g's `src/types-pk.ts` as merged (7f never edits it; a renamed field is STOP-and-report):
//   bus.agents[id]: BusAgent = { unit, plasma, brain, vent?, nmj?, dia?, cumulativeMgPerKg, sgxBoundFrac? } in the
//     row's `unit` (propofol µg/mL; opioids, NMB agents and succinylcholine ng/mL; gamma rows "× ref dose"); totals net
//     of sugammadex binding; `vent` = the SEPARATE opioid ventilatory site (remifentanil ke0 0.92/min, R51 §2);
//     `nmj`/`dia` = adductor pollicis / diaphragm–larynx;
//   bus.volatiles[agent]: BusVolatile = { fet, brain, macAge, macFrac } for sevoflurane/isoflurane/desflurane AND n2o
//     (addendum 9): `fet` end-tidal % atm, `brain` VRG tension %, `macAge` MAC(age) %, `macFrac` = BRAIN (VRG) MAC fraction;
//   bus.doses: DoseLogEntry[] = { agent, mgPerKg | null, amount, amountUnit, t } — the boluses 7g accepted, listed for
//     exactly one engine advance pass (R51 §3: 7f observes, never consumes);
//   bus.antagonist.opioid: naloxone's EC50 multiplier on the opioid class (1 = none). 7g applies it to its own
//     `cns.opioidCeRemiEq` but NOT to the per-agent `brain`/`vent` totals, so this reader divides them by it (F2);
//   bus.cns.propCe (µg/mL), bus.cns.opioidCeRemiEq (ng/mL remifentanil-eq at EEG potency, antagonist applied:
//     fentanyl ×1.6, sufentanil ×12, morphine ×1.5), bus.cns.benzoCeMidazEq / bus.cns.ketamineCe (gamma rows,
//     reference-dose units; flumazenil already applied), bus.nmb.achGain (neostigmine, 1 = none).
import type { PatientProfile } from '../../types.ts';
import type { DrugBus } from '../../types-pk.ts';

export type NmbAgent = 'rocuronium' | 'vecuronium' | 'cisatracurium' | 'succinylcholine';
export const NMB_AGENTS: readonly NmbAgent[] = ['rocuronium', 'vecuronium', 'cisatracurium', 'succinylcholine'];
export type VolatileId = 'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o';
export const VOLATILE_IDS: readonly VolatileId[] = ['sevoflurane', 'isoflurane', 'desflurane', 'n2o'];
/** The agents the instructor `anaesthesia` event lists (ng/mL; NMB agents at the adductor-pollicis site). */
export type NeuroAgentId = 'propofol' | 'remifentanil' | 'fentanyl' | 'midazolam' | 'ketamine' | NmbAgent;

/** Fentanyl EEG potency relative to remifentanil (tables §5d: EEG EC50 6.9 vs 11.2 ng/mL; the weight 7g's opioidCeRemiEq uses). */
export const FENT_EEG_POT = 1.6;
/**
 * Fentanyl VENTILATORY potency relative to remifentanil — deviation D-7f-3 (Q54). The tables derive 1.6× (C50 ≈ 0.6
 * ng/mL) from EEG potency; with it fentanyl 1.5 µg/kg alone (Ce ≈ 2.3 ng/mL) makes a healthy adult apnoeic, against
 * clinical experience (RR ~8–10). 0.55× (C50 ≈ 1.7 ng/mL) [ENG], flagged for Ali.
 */
export const FENT_VENT_POT = 0.55;
/**
 * Gamma-row reference units → ng/mL-equivalents [ENG]: 7g keeps midazolam and ketamine as gamma curves (tables §6.1)
 * whose "concentration" is in units of the reference dose; midazolam 0.05 mg/kg ≈ 100 ng/mL, ketamine 1.5 mg/kg ≈
 * 1500 ng/mL (M10 ch. 21 p. 536: 0.7–2.2 µg/mL for hypnosis).
 */
export const MIDAZ_NG_PER_REF = 100;
export const KET_NG_PER_REF = 1500;

export interface NeuroInputs {
  /** Brain effect-site Ce, ng/mL(-eq), naloxone applied. `remifentanil` also carries the other opioids (sufentanil, morphine) as remifentanil-equivalents. */
  brain: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number };
  /** Ventilatory drive inputs, ng/mL(-eq): `opioid` = remifentanil-equivalent at the opioid ventilatory site(s), naloxone applied. */
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number };
  nmj: Record<NmbAgent, number>; // adductor pollicis Ce, ng/mL
  dia: Record<NmbAgent, number>; // diaphragm/larynx Ce, ng/mL
  suxCumMgPerKg: number;
  macPotent: number; // BRAIN age-adjusted MAC fraction of the potent agents (Σ bus.volatiles[potent].macFrac)
  macN2o: number; // BRAIN MAC fraction of N2O
  macEt: number; // END-TIDAL MAC fraction, all agents: Σ fet/macAge (the gas monitor's `mac` numeric)
  et: Partial<Record<VolatileId, { fet: number; macAge: number }>>; // end-tidal % and MAC(age) % (gas-monitor display)
  achGain: number; // neostigmine (7g), 1 = none
  opioidAntag: number; // naloxone EC50 multiplier (7g), 1 = none
}

function nmbSite(bus: DrugBus, site: 'nmj' | 'dia'): Record<NmbAgent, number> {
  const o = {} as Record<NmbAgent, number>;
  for (const a of NMB_AGENTS) o[a] = Math.max(0, bus.agents[a]?.[site] ?? 0);
  return o;
}

export function readBus(bus: DrugBus): NeuroInputs {
  const ag = bus.agents;
  // naloxone (F2): 7g divides every opioid's concentration by the class multiplier for its own summary
  // (`cns.opioidCeRemiEq`) but publishes the per-agent totals raw — apply the same division here, once
  const antag = Math.max(1, bus.antagonist.opioid);
  const remiB = (ag.remifentanil?.brain ?? 0) / antag;
  const fentB = (ag.fentanyl?.brain ?? 0) / antag;
  // opioids 7f does not name one by one: 7g's (already antagonised) remifentanil-equivalent total minus the two 7f names [ENG]
  const otherRemiEq = Math.max(0, bus.cns.opioidCeRemiEq - remiB - FENT_EEG_POT * fentB);
  const propofol = bus.cns.propCe * 1000;
  const midazolam = bus.cns.benzoCeMidazEq * MIDAZ_NG_PER_REF;
  const ketamine = bus.cns.ketamineCe * KET_NG_PER_REF;
  let macPotent = 0;
  let macN2o = 0;
  let macEt = 0;
  const et: NeuroInputs['et'] = {};
  for (const id of VOLATILE_IDS) {
    const v = bus.volatiles[id];
    if (!v) continue;
    et[id] = { fet: v.fet, macAge: v.macAge };
    macEt += v.macAge > 0 ? v.fet / v.macAge : 0;
    if (id === 'n2o') macN2o += v.macFrac;
    else macPotent += v.macFrac;
  }
  return {
    brain: { propofol, remifentanil: remiB + otherRemiEq, fentanyl: fentB, midazolam, ketamine },
    vent: {
      // a missing `vent` entry falls back to the brain site (never to zero: an opioid always depresses breathing)
      opioid: (ag.remifentanil?.vent ?? ag.remifentanil?.brain ?? 0) / antag + (FENT_VENT_POT * (ag.fentanyl?.vent ?? ag.fentanyl?.brain ?? 0)) / antag + otherRemiEq,
      propofol, midazolam, ketamine,
    },
    nmj: nmbSite(bus, 'nmj'),
    dia: nmbSite(bus, 'dia'),
    suxCumMgPerKg: ag.succinylcholine?.cumulativeMgPerKg ?? 0,
    macPotent, macN2o, macEt, et,
    achGain: bus.nmb.achGain,
    opioidAntag: antag,
  };
}

/** Doses 7g accepted after `seenT` (R51 §3: 7f observes, never consumes). The caller keeps the returned `seenT`. */
export function newDoses(bus: DrugBus, seenT: number): { doses: DrugBus['doses']; seenT: number } {
  const doses = bus.doses.filter((d) => d.t > seenT);
  return { doses, seenT: doses.reduce((m, d) => Math.max(m, d.t), seenT) };
}

/**
 * Cholinesterase phenotype for 7g's PK patient (`PkPatient.pche`; 7g's `pkPatientOf` does not map it). The clearance
 * multiplier is 7g's single `PCHE_CL_MULT` (R51 addendum 10: het 0.5 → 12 min, hom 0.003 → 5.2 h, [ENG, fitted to
 * tables §5d / Lee 2009 durations]); 7f uses the same value by construction.
 */
export function pcheOf(p: PatientProfile | undefined): 'normal' | 'het' | 'hom' {
  const c = p?.neuro?.cholinesterase;
  return c === 'homozygous' ? 'hom' : c === 'heterozygous' ? 'het' : 'normal';
}
