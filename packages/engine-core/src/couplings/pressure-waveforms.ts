// The haemodynamics pipeline's couplings (l2/hemo/pipeline.ts): the beats, the chemoreflex inputs, the coronary ischaemia
// hand-off and the model HR request. (A bleed reaches the circulation through the blood model: blood.ts.)
import { st } from './nodes.ts';
import type { Coupling } from './types.ts';

const L1 = 'pressure-waveforms ctx advanceHemo.l1';
const h = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'pressure-waveforms', ...row });

export const PRESSURE_WAVEFORMS: readonly Coupling[] = [
  h({ id: 'pressure-waveforms.chemo.sao2', from: [st('l1.coupled.spo2', L1)], to: st('hemo.circ.chemo.sao2'), sign: '+', form: 'state', params: [], note: 'The chemoreflex input: SpO2 truth / 100, written at 1 Hz.' }),
  h({ id: 'pressure-waveforms.chemo.paco2', from: [st('l1.coupled.etco2', L1)], to: st('hemo.circ.chemo.paco2'), sign: '+', form: 'term', params: [], note: 'The chemoreflex input: EtCO2 truth + 5 mmHg (inline), written at 1 Hz.' }),
  h({ id: 'pressure-waveforms.coronary', from: [st('hemo.circ.cor.kIsch')], to: st('hemo.circ.ext.kIsch', 'pressure-waveforms ext kIsch'), sign: '+', form: 'state', params: [], note: 'The coronary model\'s contractility loss handed to the control step.' }),
  h({ id: 'pressure-waveforms.beats', from: [st('hr.to', 'pressure-waveforms ctx advanceHemo.hr'), st('rhythm.id', 'pressure-waveforms ctx advanceHemo.rhythm')], to: st('hemo.circ.qFwd'), sign: '+', form: 'state', params: [], note: 'Each beat the rhythm engine plans at its rate triggers a mechanical activation (circOnBeat; a pulseless rhythm triggers none): output is rate × stroke volume.' }),
  h({ id: 'pressure-waveforms.hrRequest', from: [st('hemo.circ.hrModel')], to: st('hr.to', 'pressure-waveforms ctx advanceHemo.requestHr'), sign: '+', form: 'state', params: [], note: 'MODELED: the model HR drives the rhythm engine\'s rate (requestHr → a constant ramp).' }),
];
