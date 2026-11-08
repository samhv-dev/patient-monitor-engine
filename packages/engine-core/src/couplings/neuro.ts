// The neuro model's couplings on the propofol path: the bus's ventilatory propofol equivalent → the ventilatory
// depression the breath driver reads (l2/neuro). The drive's PD constants are being reworked on main; this R1 row
// names none of them.
import { ef, st } from './nodes.ts';
import type { Coupling } from './types.ts';

const n = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'neuro', ...row });

export const NEURO: readonly Coupling[] = [
  n({ id: 'neuro.drive.hypnotic', from: [ef('pk.bus.cns.hypVentPropEq', 'neuro bus-read bus.cns.hypVentPropEq')], to: st('neuro.resp.hypnoticDep'), sign: '+', form: 'factor', params: [], note: 'Hypnotic ventilatory depression from the propofol equivalent at the ventilatory site.' }),
  n({ id: 'neuro.drive.total', from: [st('neuro.resp.hypnoticDep'), st('neuro.resp.opioidDep')], to: st('neuro.resp.totalDep'), sign: '+', form: 'term', params: [], note: 'Hypnotic and opioid depression combined into the total the drive reads.' }),
];
