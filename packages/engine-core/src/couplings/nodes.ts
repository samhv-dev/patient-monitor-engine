// The nodes a coupling row may name besides truth-tree state (docs/plans/mechanism-tree.md §4 D3): the triggers (each
// with the engine command it stands for), the effectors (each with the function that assembles it, or the audit row
// of the mechanism that does not exist), and the monitor observables. The registry test dispatches every trigger's
// command, finds every effector's function in its file, and reads every observable from a reference run.
import type { NumericId } from '../types.ts';
import type { AuditRef, NodeRef, SeamKey } from './types.ts';

export interface TriggerDecl {
  path: `trigger.${string}`;
  label: string;
  /** The command this trigger is (dispatched by the registry test; it must be accepted). */
  command: Readonly<Record<string, unknown>>;
}
export interface EffectorDecl {
  path: string;
  label: string;
  /** `<path from packages/engine-core/src/>#<function>`: where the effector is assembled. */
  at?: `${string}.ts#${string}`;
  /** An effector the engine does not have (an ABSENT row's node). */
  absent?: AuditRef;
}
export interface ObservableDecl {
  path: `mon.${NumericId}`;
  label: string;
}

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
export const TRIGGERS: readonly TriggerDecl[] = [
  { path: 'trigger.bleed', label: 'Haemorrhage', command: ev({ kind: 'bleed', volumeMl: 1500, overS: 600 }) },
  { path: 'trigger.drug.propofol', label: 'Propofol bolus', command: ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }) },
  { path: 'trigger.drug.phenylephrine', label: 'Phenylephrine bolus', command: ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }) },
  { path: 'trigger.drug.esmolol', label: 'Esmolol bolus', command: ev({ kind: 'drug', drugId: 'esmolol', dose: 0.5, unit: 'mg/kg', route: 'iv' }) },
  { path: 'trigger.lungCondition.ptxTension', label: 'Tension pneumothorax (lung condition)', command: ev({ kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' }) },
  { path: 'trigger.condition.tensionPtx', label: 'Tension pneumothorax (circulation condition, an alias)', command: ev({ kind: 'condition', id: 'tensionPtx', severity: 1 }) },
  { path: 'trigger.ventilation.peep', label: 'PEEP change on the ventilator', command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 10, fio2: 0.5 }) },
];

const M = 'l2/circ/model.ts#control';
const B = 'l2/circ/baroreflex.ts#stepBaro';
export const EFFECTORS: readonly EffectorDecl[] = [
  { path: 'circ.baro.hrF', label: 'Baroreflex sympathetic HR factor', at: B },
  { path: 'circ.baro.rrMs', label: 'Baroreflex vagal RR increment', at: B },
  { path: 'circ.baro.svrF', label: 'Baroreflex SVR factor', at: B },
  { path: 'circ.baro.eesF', label: 'Baroreflex contractility factor', at: B },
  { path: 'circ.baro.dV0', label: 'Baroreflex venous unstressed-volume change', at: B },
  { path: 'circ.baro.cSvF', label: 'Baroreflex venous compliance factor', at: B },
  { path: 'circ.baro.gains', label: 'Baroreflex gains handed to the step (vagal, sympathetic, β-block, HR gain, outF, setF, brainF)', at: M },
  { path: 'circ.chemo.hrF', label: 'Chemoreflex HR factor', at: 'l2/circ/model.ts#chemoFactors' },
  { path: 'circ.chemo.svrF', label: 'Chemoreflex SVR factor', at: 'l2/circ/model.ts#chemoFactors' },
  { path: 'circ.rr', label: 'Model RR interval (the HR set the rhythm clock is asked for)', at: M },
  { path: 'circ.endoSvr', label: 'Endocrine SVR factor with the humoral share withdrawn in arrest', at: M },
  { path: 'circ.recruit', label: 'Splanchnic recruitment (baroreflex, β-agonist and humoral arms, one reservoir)', at: M },
  { path: 'circ.kHyp', label: 'Hypoxic myocardial depression', at: M },
  { path: 'circ.pIt', label: 'Intrathoracic pressure the heart sees (the lungs\' pleural source + ext.pPtx)', at: 'l2/circ/model.ts#stepCircModel' },
  { path: 'circ.venousReturn', label: 'Venous return (stressed volume against right-atrial pressure)', at: 'l2/circ/circuit.ts#evaluate' },
  { path: 'pk.bus.cns.hypVentPropEq', label: 'Propofol-equivalent at the ventilatory site (kept out of the truth tree)', at: 'l2/pk/combine.ts#combine' },
  { path: 'resp.pleural', label: 'Pleural pressure handed to the circulation', at: 'l2/resp/pipeline.ts#respPleural' },
  { path: 'blood.kChem', label: 'Blood-chemistry contractility factor (pH, ionised Ca, K)', at: 'l2/blood/circ-adapter.ts#chemistryContractility' },
  { path: 'endo.adrenalDrive', label: 'Adrenal medullary drive', at: 'l2/endo/hormones.ts#adrenalDrive' },
  { path: 'eeg.cortex', label: 'EEG cortical state (hyperpolarisation, loss of responsiveness, suppression)', at: 'l2/eeg/state.ts#cortexStep' },
  // The autonomic hub research/44 L2-01–L2-04 asks for: one sympathetic efferent state, the hormones as concentrations
  { path: 'absent.autonomic.sympatheticOutflow', label: 'Central sympathetic efferent state (cardiac and vasomotor)', absent: 'research/44 L2-02' },
  { path: 'absent.autonomic.chemoAfferent', label: 'Carotid and central chemoreceptor afferent', absent: 'research/44 L2-04' },
  { path: 'absent.autonomic.baroAfferent', label: 'Sigmoid arterial baroreceptor afferent', absent: 'research/44 L2-03' },
  { path: 'absent.endo.avp', label: 'Vasopressin concentration', absent: 'research/44 L2-01' },
  { path: 'absent.endo.angiotensin', label: 'Angiotensin II concentration (one RAAS)', absent: 'research/44 L2-01' },
  { path: 'absent.ecg.epSubstrate', label: 'Myocardial electrophysiological substrate (membrane potential, conduction, refractoriness)', absent: 'research/44 L2-05' },
];

export const OBSERVABLES: readonly ObservableDecl[] = [
  { path: 'mon.abpMean', label: 'ART mean' },
  { path: 'mon.abpSys', label: 'ART systolic' },
  { path: 'mon.hr', label: 'HR' },
  { path: 'mon.spo2', label: 'SpO₂' },
  { path: 'mon.etco2', label: 'EtCO₂' },
  { path: 'mon.rr', label: 'Respiratory rate' },
];

/** Node builders: a truth-tree state, a declared effector, a trigger, an observable; each may carry census seams. */
export const st = (path: string, ...seams: SeamKey[]): NodeRef => (seams.length ? { kind: 'state', path, seams } : { kind: 'state', path });
export const ef = (path: string, ...seams: SeamKey[]): NodeRef => (seams.length ? { kind: 'effector', path, seams } : { kind: 'effector', path });
export const tr = (path: TriggerDecl['path']): NodeRef => ({ kind: 'trigger', path });
export const mon = (path: ObservableDecl['path']): NodeRef => ({ kind: 'observable', path });
