// The truth → monitor edges on the six paths: the numerics the device layer measures from the physiology (l3).
import { mon, st } from './nodes.ts';
import type { Coupling } from './types.ts';

const m = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'monitor', ...row });

export const MONITOR: readonly Coupling[] = [
  m({ id: 'monitor.abpMean', from: [st('hemo.circOut.pRad')], to: mon('mon.abpMean'), sign: '+', form: 'state', params: [], note: 'The radial transducer\'s beat-averaged mean.' }),
  m({ id: 'monitor.abpSys', from: [st('hemo.circOut.pRad')], to: mon('mon.abpSys'), sign: '+', form: 'state', params: [], note: 'The radial transducer\'s systolic.' }),
  m({ id: 'monitor.hr', from: [st('hr.to', 'rhythms-ecg ctx rhythmCtx.hrAt')], to: mon('mon.hr'), sign: '+', form: 'state', params: [], note: 'The rhythm engine beats at the requested rate; the monitor counts the detected QRS complexes.' }),
  m({ id: 'monitor.spo2', from: [st('l1.coupled.spo2')], to: mon('mon.spo2'), sign: '+', form: 'state', params: [], note: 'The oximeter\'s averaged saturation.' }),
  m({ id: 'monitor.etco2', from: [st('l1.coupled.etco2')], to: mon('mon.etco2'), sign: '+', form: 'state', params: [], note: 'The capnograph\'s end-tidal value.' }),
  m({ id: 'monitor.rr', from: [st('resp.spont.rr')], to: mon('mon.rr'), sign: '+', form: 'state', params: [], note: 'The respiratory rate the monitor counts.' }),
];
