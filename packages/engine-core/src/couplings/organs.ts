// The brain's couplings on the haemorrhage path: perfusion pressure → cerebral flow → the vasomotor centre and the
// Cushing response (l2/brain, l2/organs/effects.ts).
import { ef, st } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const BP = (n: string): ConstRef => `l2/brain/params.ts#${n}`;
const o = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'organs', ...row });

export const ORGANS: readonly Coupling[] = [
  o({ id: 'organs.brain.cpp', from: [st('hemo.circ.mapNow', 'organs ctx organsCtx.hemo'), st('organs.brain.icp')], to: st('organs.brain.cpp'), sign: '±', form: 'state', params: [], note: 'CPP = MAP at head height − max(ICP, cerebral venous pressure).' }),
  o({ id: 'organs.brain.flow', from: [st('organs.brain.cpp')], to: st('organs.brain.cbfRel'), sign: '+', form: 'state', params: [], note: 'Cerebral flow = autoregulated conductance × CPP (flat inside the autoregulation limits, pressure-passive outside).' }),
  o({ id: 'organs.brain.anaemia', from: [st('blood.out.hb', 'organs ctx organsCtx.blood')], to: st('organs.brain.cbfRel'), sign: '−', form: 'factor', tau: BP('TAU_VASC_S'), params: [BP('ANAEMIA_FLOW_SOURCE'), BP('ANAEMIA_FLOW_HB_MIN'), BP('ANAEMIA_FLOW_HB_MAX')], note: 'Target flow × (Hb ÷ the patient\'s own normal Hb, the blood model\'s band default)^−k: flow rises as the blood\'s O2 capacity falls, held outside ANAEMIA_FLOW_HB_MIN–ANAEMIA_FLOW_HB_MAX.' }),
  o({ id: 'organs.brain.energy.cortex', from: [st('organs.brain.cbfRel'), st('blood.out.hb', 'organs ctx organsCtx.blood'), st('resp.o2.sa', 'organs ctx organsCtx.resp'), st('resp.o2.pao2', 'organs ctx organsCtx.resp')], to: st('organs.brain.energy.cortex.metabolic'), sign: '−', form: 'threshold', params: [BP('DO2_EEG_ABNORMAL'), BP('DO2_EEG_LOST')], note: 'Cortical O2 delivery (CBF/CBF0 × CaO2 ÷ the reference CaO2) below 20/50 of normal costs the cortex its function, all of it below 12/50.' }),
  o({ id: 'organs.brain.vasomotor', from: [st('organs.brain.cbfRel')], to: st('hemo.circ.ext.cbfRel', 'organs ext cbfRel'), sign: '+', form: 'state', params: [], note: 'Brainstem perfusion handed to the circulation (the vasomotor centre\'s own supply).' }),
  o({ id: 'organs.cushing.drive', from: [st('organs.brain.cpp')], to: st('organs.brain.cush.drive'), sign: '−', form: 'threshold', delay: BP('CUSH_DELAY_S'), tau: BP('CUSH_TAU_ON_S'), params: [BP('CUSH_CPP'), BP('CUSH_DELAY_S'), BP('CUSH_TAU_ON_S'), BP('CUSH_TAU_OFF_S')], note: 'CPP below CUSH_CPP for CUSH_DELAY_S starts the surge drive.' }),
  o({ id: 'organs.cushing.svr', from: [st('organs.brain.cush.drive')], to: st('hemo.circ.ext.rSysF', 'organs ext rSysF'), sign: '+', form: 'factor', params: ['l2/organs/effects.ts#CUSH_SVR_GAIN'], note: 'SVR × (1 + CUSH_SVR_GAIN·drive); the bradycardia is the baroreflex\'s answer (no hrF).' }),
  o({ id: 'organs.absent.brainstemToHub', from: [st('organs.brain.cbfRel')], to: ef('absent.autonomic.sympatheticOutflow'), sign: '−', form: 'factor', params: [], absent: 'research/44 L2-12', note: 'Medullary ischaemia driving the one sympathetic state, in place of a scripted surge.' }),
];
