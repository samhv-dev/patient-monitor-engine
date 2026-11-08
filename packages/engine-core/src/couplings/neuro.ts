// The neuro model's couplings on the propofol path: the bus's ventilatory propofol equivalent → the ventilatory
// depression the breath driver reads (l2/neuro). The drive's PD constants are being reworked on main; this R1 row
// names none of them. The EEG cortical state (stage EEG, l2/eeg/state.ts) reads the bus's hypnotic classes and its
// alpha-2 equivalent; it runs only while an EEG device is on, and nothing in physiology reads it.
import { ef, st } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const ST = 'l2/eeg/state.ts#';
const CORTEX = ef('eeg.cortex');
const BS: readonly ConstRef[] = [`${ST}BS_ONSET_ISO_MAC`, `${ST}BS_ONSET_SEVO_MAC`, `${ST}BS_ONSET_DES_MAC`, `${ST}BS_ESTABLISHED_MAC`, `${ST}BS_NEAR_ISO_MAC`, `${ST}SUPP_ESTABLISHED`, `${ST}SUPP_NEAR_ISO`, `${ST}BS_ISOELECTRIC_MAC`, `${ST}BS_ONSET_PROP_NG_ML`];

const n = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'neuro', ...row });

export const NEURO: readonly Coupling[] = [
  n({ id: 'neuro.drive.hypnotic', from: [ef('pk.bus.cns.hypVentPropEq', 'neuro bus-read bus.cns.hypVentPropEq')], to: st('neuro.resp.hypnoticDep'), sign: '+', form: 'factor', params: [], note: 'Hypnotic ventilatory depression from the propofol equivalent at the ventilatory site.' }),
  n({ id: 'neuro.drive.total', from: [st('neuro.resp.hypnoticDep'), st('neuro.resp.opioidDep')], to: st('neuro.resp.totalDep'), sign: '+', form: 'term', params: [], note: 'Hypnotic and opioid depression combined into the total the drive reads.' }),
  n({ id: 'neuro.eeg.cortex.hypnotic', from: [st('pk.bus.cns.hypByClass', 'neuro bus-read bus.cns.hypByClass')], to: CORTEX, sign: '+', form: 'state', params: [`${ST}DEEP_ONSET`, ...BS], note: 'Hyperpolarisation and loss of responsiveness from the GABA-ergic, barbiturate, etomidate and benzodiazepine classes (÷ the propofol Ce50 and LOC C50 at this age); burst suppression past the onset from the suppressing classes (not the benzodiazepines), added to the ether load in onset units.' }),
  n({ id: 'neuro.eeg.cortex.alpha2', from: [st('pk.bus.cns.alpha2Eq', 'neuro bus-read bus.cns.alpha2Eq')], to: CORTEX, sign: '+', form: 'state', params: ['l2/pk/combine.ts#DEXMED_EEG_C50_NG_ML', `${ST}DEXMED_LOR_NG_ML`], note: 'Dexmedetomidine\'s alpha-2 equivalent adds to hyperpolarisation, and to loss of responsiveness in units of its 2.09 ng/mL LOR anchor; it never drives burst suppression.' }),
];
