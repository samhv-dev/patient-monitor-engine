// Stage 7x: the actions rail's command builders — the same Command bodies the instructor panel and the scenario
// runner send (brief §7.2 plus the 7a/7b/7c/7g shapes, taken from origin/stage-7b-lungs `types-lung.ts`,
// origin/stage-7g-pkpd `types-pk.ts` and the 7c plan). Kinds and ids the engine does not know yet (a 7g infusion
// before 7g merges) are still sent: the engine's rejection reason lands in the change log, so the rail needs no edit
// when a stage lands.
import type { PatientProfile } from '@pme/engine-core';

/** A Command without id/issuedBy/atTick (the page stamps those). */
export type Body = { type: string } & Record<string, unknown>;

const SENSORS: PatientProfile['sensors'] = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', nibp: 'on' };
const p = (x: PatientProfile): PatientProfile => ({ ...x, sensors: SENSORS });
/** Stage 7a's demo profiles, with every invasive line connected so the monitor shows ABP/CVP/PAP. */
export const PRESETS: ReadonlyArray<{ id: string; label: string; profile: PatientProfile }> = [
  { id: 'adult', label: 'Adult 40 y 70 kg', profile: p({ ageY: 40, sex: 'M', weightKg: 70 }) },
  { id: 'elderly', label: '75 y hypertensive', profile: p({ ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }] }) },
  { id: 'ascad', label: '75 y AS + CAD + HTN', profile: p({ ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] }) },
  { id: 'hfref', label: 'HFrEF 60 y', profile: p({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] }) },
  { id: 'child', label: 'Child 6 y 20 kg', profile: p({ ageY: 6, sex: 'M', weightKg: 20 }) },
  { id: 'bb', label: 'β-blocked adult', profile: p({ ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] }) },
];

/** Suggestions only (a datalist): any id can be typed. The first five are what 7a accepts; the rest arrive with 7g. */
export const DRUG_IDS = [
  'phenylephrine', 'ephedrine', 'nitroglycerin', 'esmolol', 'propofol', 'norepinephrine', 'epinephrine', 'vasopressin', 'atropine',
  'fentanyl', 'remifentanil', 'midazolam', 'ketamine', 'rocuronium', 'succinylcholine', 'sugammadex', 'neostigmine', 'labetalol',
];
export const DOSE_UNITS = ['mcg', 'mg', 'mcg/kg', 'mg/kg', 'units', 'mEq'] as const;
export const RATE_UNITS = ['mcg/kg/min', 'mcg/min', 'mg/h', 'mg/kg/h', 'units/min', 'mL/h'] as const;
/** 7g's vaporiser agents; N2O rides on the same event as `n2oFrac` (R51 §4, addendum 9). */
export const AGENTS = ['sevoflurane', 'isoflurane', 'desflurane'] as const;
/** 7g TCI models (a datalist: any name can be typed). */
export const TCI_MODELS = ['eleveld', 'schnider', 'marsh', 'minto'];
/** Fluid ids (a datalist): 7a's `crystalloid|colloid|blood` and 7c's `FLUIDS` ids. */
export const FLUID_IDS = ['crystalloid', 'colloid', 'blood', 'saline', 'rl', 'balanced', 'albumin5', 'gelatin', 'd5w', 'glycine'];
export const CONDITION_IDS = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct', 'anaphylaxis', 'mh', 'last', 'burns', 'dka', 'sepsis'];
/** 7b's lung-condition catalogue ids (`LUNG_CONDITION_IDS`, types-lung.ts). */
export const LUNG_CONDITION_IDS = [
  'ph', 'bronchospasm', 'asthma', 'anaphylaxis', 'copd', 'ards', 'ild', 'ssc', 'chestWall', 'obesity', 'pneumonia',
  'atelectasis', 'pulmOedema', 'effusion', 'ptxSimple', 'ptxTension', 'haemothorax', 'pe', 'fatEmbolism', 'vae',
  'aspiration', 'olv', 'endobronchial', 'bpf', 'airwayObstruction', 'cf', 'nmWeakness', 'diaphragmParalysis',
  'pregnancy', 'neonatalRds', 'covidPneumonitis', 'smokeInhalation',
];

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const bolus = (drugId: string, dose: number, unit: string): Body => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
/** 7g's infusion event (rate 0 stops it). */
export const infusion = (drugId: string, rate: number, unit: string): Body => ev({ kind: 'infusion', drugId, rate, unit });
/** 7g's TCI (target 0 stops it; `model` only for drugs with a choice, e.g. propofol eleveld/schnider/marsh). */
export const tci = (drugId: string, target: number, mode: 'plasma' | 'effect', model = ''): Body =>
  ev(model ? { kind: 'tci', drugId, model, mode, target } : { kind: 'tci', drugId, mode, target });
/** 7g's single vaporiser event (R51 §4), N2O as a fraction of the fresh gas (addendum 9). */
export const vaporiser = (agent: string, dialPct: number, fgfLpm: number, n2oFrac = 0): Body => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac });
/** Any fluid id (7a: crystalloid/colloid/blood; 7c: saline, rl, balanced, albumin5, gelatin, d5w, glycine). */
export const fluid = (kind: string, volumeMl: number, overS: number): Body => ev({ kind: 'fluid', fluid: kind, volumeMl, overS });
export const bleed = (volumeMl: number, overS: number): Body => ev({ kind: 'bleed', volumeMl, overS });
export const condition = (id: string, severity: number): Body => ev({ kind: 'condition', id, severity });
/** 7b: a catalogue lung condition (severity 0 removes it), with a side for sided conditions ('' = none). */
export const lungCondition = (id: string, severity: number, side: '' | 'L' | 'R' = ''): Body =>
  ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity });
/** 7b: which lung(s) the tube ventilates. */
export const mainstem = (ventilated: 'both' | 'left' | 'right'): Body => ev({ kind: 'mainstem', ventilated });
/** 7b: a recruitment manoeuvre. */
export const recruit = (pressureCmH2O: number, durationS: number): Body => ev({ kind: 'recruit', pressureCmH2O, durationS });
/** 7c: "send ABG" (or VBG): the panel is frozen now and a `labResult` event follows after the turnaround. */
export const lab = (panel: 'abg' | 'vbg'): Body => ev({ kind: 'lab', panel });
export const ventilation = (source: string, rr: number, vtMl: number, peep: number, fio2: number): Body =>
  ev(source === 'ventilator' || source === 'bvm' ? { kind: 'ventilation', source, rr, vtMl, peep, fio2 } : { kind: 'ventilation', source });
export const rhythm = (id: string): Body => ({ type: 'setRhythm', rhythm: id });
export const setMode = (mode: 'manual' | 'modeled'): Body => ({ type: 'setMode', mode });

/** One line for the change log. */
export function describe(b: Body): string {
  const e = b.event as Record<string, unknown> | undefined;
  if (b.type === 'applyEvent' && e) {
    switch (e.kind) {
      case 'drug':
        return `${e.drugId} ${e.dose} ${e.unit} ${e.route}`;
      case 'infusion':
        return `${e.drugId} infusion ${e.rate} ${e.unit}`;
      case 'tci':
        return `${e.drugId} TCI ${e.mode} target ${e.target}${e.model ? ` (${e.model})` : ''}`;
      case 'vaporiser':
        return `${e.agent} ${e.dialPct} % @ ${e.fgfLpm} L/min${e.n2oFrac ? ` + N₂O ${e.n2oFrac}` : ''}`;
      case 'lungCondition':
        return `lung ${e.id} severity ${e.severity}${e.side ? ` ${e.side}` : ''}`;
      case 'mainstem':
        return `mainstem: ventilate ${e.ventilated}`;
      case 'recruit':
        return `recruit ${e.pressureCmH2O} cmH₂O × ${e.durationS} s`;
      case 'lab':
        return `send ${String(e.panel).toUpperCase()}`;
      case 'fluid':
        return `${e.fluid} ${e.volumeMl} mL over ${e.overS} s`;
      case 'bleed':
        return `bleed ${e.volumeMl} mL over ${e.overS} s`;
      case 'condition':
        return `condition ${e.id} severity ${e.severity}`;
      case 'ventilation':
        return e.source === 'ventilator' || e.source === 'bvm' ? `${e.source} RR ${e.rr} VT ${e.vtMl} PEEP ${e.peep} FiO₂ ${e.fio2}` : `ventilation ${e.source}`;
      default:
        return `${String(e.kind)} ${JSON.stringify(e)}`;
    }
  }
  if (b.type === 'setRhythm') return `rhythm ${b.rhythm}`;
  if (b.type === 'setMode') return `mode ${String(b.mode).toUpperCase()}`;
  return JSON.stringify(b);
}
