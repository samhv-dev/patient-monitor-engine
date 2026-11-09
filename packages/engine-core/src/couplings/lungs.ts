// The lungs' couplings on the tension-pneumothorax and PEEP paths: the pleural pressure source, collapse and
// recruitment, shunt, and the per-lung PVR handed to the circulation (l2/lung, data/lung-pathology.ts).
import { st, tr } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const LP = (n: string): ConstRef => `l2/lung/params.ts#${n}`;
const PTX: ConstRef = '../data/lung-pathology.ts#LUNG_CONDITIONS.ptxTension';
const CONSOL = st('resp.lung.lp.side.1.consol');
const SHUNT = st('resp.lung.perf.shunt');
const PVRM = st('resp.lung.perf.pvrMult');
const l = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'lungs', ...row });

export const LUNGS: readonly Coupling[] = [
  l({ id: 'lungs.ptx.pleural', from: [tr('trigger.lungCondition.ptxTension')], to: st('resp.lung.lp.pPtx'), sign: '+', form: 'state', params: [PTX, LP('PTX_VALVE_PER_CMH2O_S')], note: 'The affected side\'s pleural pressure builds under positive pressure (PTX_VALVE_PER_CMH2O_S per cmH2O·s of driving pressure) to the condition\'s ceiling.' }),
  l({ id: 'lungs.ptx.collapse', from: [tr('trigger.lungCondition.ptxTension')], to: CONSOL, sign: '+', form: 'state', params: [PTX], note: 'The ipsilateral lung collapses (non-recruitable until decompressed); Crs × 0.5.' }),
  l({ id: 'lungs.peep.recruitment', from: [st('resp.driver.vent.peep')], to: st('resp.lung.aer'), sign: '+', form: 'state', params: [LP('P_CLOSE'), LP('P_OPEN_LO'), LP('TAU_DEREC_S')], note: 'End-expiratory pressure above the closing pressure keeps units aerated; derecruitment with τ TAU_DEREC_S below it.' }),
  l({ id: 'lungs.shunt.collapse', from: [CONSOL, st('resp.lung.aer')], to: SHUNT, sign: '±', form: 'state', params: [LP('ATEL_PERF')], note: 'Flow through the non-aerated part is true shunt (ATEL_PERF of its share), reduced by HPV: collapse raises it, aeration lowers it.' }),
  l({ id: 'lungs.pvr.perSide', from: [CONSOL, st('resp.lung.aer')], to: PVRM, sign: '±', form: 'factor', params: [LP('ATEL_PERF'), LP('HPV_PAO2_HI'), LP('HPV_PAO2_LO'), LP('TAU_HPV1_S')], note: 'Each side\'s PVR multiplier = 1 / the HPV-weighted conductance of its collapsed, hypoxic and normal parts.' }),
  l({ id: 'lungs.pvr.left', from: [PVRM], to: st('hemo.circ.ext.pvrLungL', 'lungs ext pvrLungL'), sign: '+', form: 'state', params: [], note: 'writeCircPvr: left multiplier into the circulation.' }),
  l({ id: 'lungs.pvr.right', from: [PVRM], to: st('hemo.circ.ext.pvrLungR', 'lungs ext pvrLungR'), sign: '+', form: 'state', params: [], note: 'writeCircPvr: right multiplier into the circulation.' }),
  l({ id: 'lungs.pvr.global', from: [st('resp.lung.lp.pvr')], to: st('hemo.circ.ext.pvrLung', 'lungs ext pvrLung'), sign: '+', form: 'state', params: [], note: 'writeCircPvr: the lungs\' global PVR multiplier (COPD, PH group 3, OLV).' }),
];
