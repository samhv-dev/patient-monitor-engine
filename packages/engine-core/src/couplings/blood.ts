// The blood model's couplings into the circulation on the haemorrhage path: viscosity from the haemoglobin and the
// chemistry contractility factor (l2/blood/circ-adapter.ts), with the lactate and pH that feed it.
import { ef, st, tr } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const CA = (n: string): ConstRef => `l2/blood/circ-adapter.ts#${n}`;
const b = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'blood', ...row });

export const BLOOD: readonly Coupling[] = [
  b({ id: 'blood.bleed', from: [tr('trigger.bleed')], to: st('blood.core.fl.vp'), sign: '−', form: 'state', params: [], note: 'The blood model takes the bleed command first (engine.ts: before the haemodynamics): whole blood leaves its plasma and red-cell pools at the ordered rate.' }),
  b({ id: 'blood.circulation', from: [st('blood.core.fl.vp'), st('blood.core.fl.visf')], to: st('hemo.circ.vol', 'blood ctx advanceBlood.hemo'), sign: '+', form: 'state', params: [], note: 'Each step\'s blood-volume change (the bleed, and the transcapillary refill from the interstitium) enters the circulation\'s volume queue (pushCircVolume).' }),
  b({ id: 'blood.dilution', from: [st('blood.core.fl.hbG'), st('blood.core.fl.vp')], to: st('blood.core.odc.hb'), sign: '±', form: 'state', params: [], note: 'Haemoglobin concentration = the red-cell mass over the blood volume: refill dilutes it after a bleed.' }),
  b({ id: 'blood.viscosity', from: [st('blood.core.odc.hb'), st('hemo.circ.qFwd')], to: st('hemo.circ.ext.viscF', 'blood ext viscF'), sign: '+', form: 'factor', params: [CA('VISC_EXP'), CA('VISC_FLOW_FULL'), CA('VISC_FLOW_NONE')], note: 'SVR × (Hb/Hb_ref)^VISC_EXP, faded out as flow falls from VISC_FLOW_FULL to VISC_FLOW_NONE of normal (MODELED only).' }),
  b({ id: 'blood.lactate', from: [st('hemo.circ.qFwd')], to: st('blood.out.lactate'), sign: '−', form: 'state', params: [], note: 'Supply-dependent oxygen consumption below the critical delivery makes lactate.' }),
  b({ id: 'blood.acidosis', from: [st('blood.out.lactate')], to: st('blood.core.ab.ph'), sign: '−', form: 'state', params: [], note: 'The strong-ion acid–base solution: lactate lowers the SID and the pH.' }),
  b({ id: 'blood.chemistry', from: [st('blood.core.ab.ph'), st('blood.out.iCa'), st('blood.out.kEcg')], to: ef('blood.kChem'), sign: '±', form: 'factor', params: [CA('K_CONTRACT'), CA('K_CONTRACT_SLOPE')], note: 'acid (below pH 7.2: × max(0.3, 1 − 1.5·Δ), inline) × (iCa/1.1)^1.5 capped at 1 (inline) × the hyperkalaemic loss above K_CONTRACT.' }),
  b({ id: 'blood.chemistryToCirc', from: [ef('blood.kChem')], to: st('hemo.circ.ext.kChem', 'blood ext kChem'), sign: '+', form: 'state', params: [], note: 'Handed to the circulation\'s four chambers.' }),
];
