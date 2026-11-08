// The breath driver's couplings on the PEEP, tension-pneumothorax and propofol paths: the pleural pressure handed to
// the circulation (l2/resp/pipeline.ts respPleural, l2/circ/pleural.ts) and the spontaneous ventilation.
import { ef, st, tr } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const PA = (n: string): ConstRef => `l2/circ/params.ts#${n}`;
const PLEURAL = ef('resp.pleural');
const VE = st('resp.spont.ve');
const r = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'breathing', ...row });

export const BREATHING: readonly Coupling[] = [
  r({ id: 'breathing.peep.set', from: [tr('trigger.ventilation.peep')], to: st('resp.driver.vent.peep'), sign: '+', form: 'state', params: [], note: 'The ventilation event sets the ventilator\'s PEEP.' }),
  r({ id: 'breathing.pleural.peep', from: [st('resp.driver.vent.peep'), st('resp.lung.peepTot')], to: PLEURAL, sign: '+', form: 'term', params: [PA('T_IT'), PA('CMH2O_TO_MMHG'), PA('P_PL0')], note: 'pIt = P_PL0 + T_IT·(PEEP + ΔV/C)·CMH2O_TO_MMHG on a mechanical breath, plus the trapped-gas pressure (total − set PEEP).' }),
  r({ id: 'breathing.pleural.transmission', from: [st('resp.lung.lp.tIt')], to: PLEURAL, sign: '+', form: 'gain', params: [], note: 'The condition\'s own airway-to-pleura transmission, relative to the healthy one.' }),
  r({ id: 'breathing.pleural.pneumothorax', from: [st('resp.lung.lp.pPtx')], to: PLEURAL, sign: '+', form: 'term', params: [], note: '+ max(0, lp.pPtx − circ ext.pPtx): the lungs\' pleural pressure, max-combined so two commands do not count it twice.' }),
  r({ id: 'breathing.drive.depression', from: [st('neuro.resp.totalDep', 'breathing ctx advanceResp.neuro')], to: VE, sign: '−', form: 'factor', params: [], note: 'The neuro model\'s ventilatory depression scales the spontaneous drive (apnoea below its threshold).' }),
  r({ id: 'breathing.drive.rate', from: [st('neuro.resp.totalDep', 'breathing ctx advanceResp.neuro')], to: st('resp.spont.rr'), sign: '−', form: 'factor', params: [], note: 'The same depression on the rate.' }),
  r({ id: 'breathing.drive.co2', from: [st('resp.co2.pf')], to: VE, sign: '+', form: 'gain', params: ['l2/lung/drive.ts#CO2_SLOPE', 'l2/lung/drive.ts#APNOEA_OFFSET'], note: 'The hypercapnic ventilatory response, CO2_SLOPE L/min/mmHg above the apnoeic threshold.' }),
  r({ id: 'breathing.drive.brainstem', from: [st('organs.brain.cbfRel', 'breathing ctx advanceResp.cbfRel')], to: VE, sign: '+', form: 'threshold', params: [], note: 'The respiratory gate closes as brainstem flow falls (the organs\' CBF, one step late).' }),
];
