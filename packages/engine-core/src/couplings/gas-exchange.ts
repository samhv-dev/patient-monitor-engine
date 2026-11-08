// Gas exchange on the paths to SpO2 and EtCO2: shunt and ventilation → arterial gases, cardiac output → EtCO2, and
// the L1 coupled truths the circulation's chemoreflex and the monitor read (l2/gas, l2/co2).
import { st } from './nodes.ts';
import type { Coupling } from './types.ts';

const g = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'gas-exchange', ...row });

export const GAS_EXCHANGE: readonly Coupling[] = [
  g({ id: 'gas-exchange.oxygenation', from: [st('resp.lung.perf.shunt'), st('resp.o2.pao2')], to: st('resp.o2.sa'), sign: '±', form: 'state', params: [], note: 'Mixing of shunted and end-capillary blood: shunt lowers, alveolar PO2 raises the arterial saturation.' }),
  g({ id: 'gas-exchange.ventilation', from: [st('resp.spont.ve')], to: st('resp.co2.pf'), sign: '−', form: 'state', params: [], note: 'Alveolar ventilation clears CO2.' }),
  g({ id: 'gas-exchange.etco2.flow', from: [st('hemo.circ.qFwd', 'breathing ctx advanceResp.hemo'), st('resp.co2.pf')], to: st('l1.coupled.etco2'), sign: '+', form: 'state', params: [], note: 'End-tidal CO2 from the arterial PCO2 and the CO2 delivered to the lungs (a falling CO lowers it).' }),
  g({ id: 'gas-exchange.spo2', from: [st('resp.o2.sa')], to: st('l1.coupled.spo2'), sign: '+', form: 'state', params: [], note: 'The arterial saturation as the coupled L1 truth.' }),
];
