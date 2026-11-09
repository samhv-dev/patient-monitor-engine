// The neuro model's couplings on the propofol path: the bus's ventilatory propofol equivalent → the ventilatory
// depression the breath driver reads (l2/neuro). The drive's PD constants are being reworked on main; this R1 row
// names none of them. The EEG cortical state (stage EEG, l2/eeg/state.ts) reads the bus's hypnotic classes and its
// alpha-2 equivalent and the physiology the engine hands it (engine.ts eegCtx); the eeg channel adds the muscle, device
// and heart signals to it. Both run only while an EEG device is on, and nothing in physiology reads them.
import { ef, st } from './nodes.ts';
import type { ConstRef, Coupling } from './types.ts';

const ST = 'l2/eeg/state.ts#';
const AR = 'l2/eeg/artefacts.ts#';
const CORTEX = ef('eeg.cortex');
const SIGNAL = ef('eeg.signal');
const BS: readonly ConstRef[] = [`${ST}BS_ONSET_ISO_MAC`, `${ST}BS_ONSET_SEVO_MAC`, `${ST}BS_ONSET_DES_MAC`, `${ST}BS_ESTABLISHED_MAC`, `${ST}BS_NEAR_ISO_MAC`, `${ST}SUPP_ESTABLISHED`, `${ST}SUPP_NEAR_ISO`, `${ST}BS_ISOELECTRIC_MAC`, `${ST}BS_ONSET_PROP_NG_ML`];

const n = (row: Omit<Coupling, 'module'>): Coupling => ({ module: 'neuro', ...row });

export const NEURO: readonly Coupling[] = [
  n({ id: 'neuro.drive.hypnotic', from: [ef('pk.bus.cns.hypVentPropEq', 'neuro bus-read bus.cns.hypVentPropEq')], to: st('neuro.resp.hypnoticDep'), sign: '+', form: 'factor', params: [], note: 'Hypnotic ventilatory depression from the propofol equivalent at the ventilatory site.' }),
  n({ id: 'neuro.drive.total', from: [st('neuro.resp.hypnoticDep'), st('neuro.resp.opioidDep')], to: st('neuro.resp.totalDep'), sign: '+', form: 'term', params: [], note: 'Hypnotic and opioid depression combined into the total the drive reads.' }),
  n({ id: 'neuro.eeg.cortex.hypnotic', from: [st('pk.bus.cns.hypByClass', 'neuro ctx eegCtx.bus', 'neuro bus-read bus.cns.hypByClass')], to: CORTEX, sign: '+', form: 'state', params: [`${ST}DEEP_ONSET`, ...BS], note: 'Hyperpolarisation and loss of responsiveness from the GABA-ergic, barbiturate, etomidate and benzodiazepine classes (÷ the propofol Ce50 and LOC C50 at this age); burst suppression past the onset from the suppressing classes (not the benzodiazepines), added to the ether load in onset units.' }),
  n({ id: 'neuro.eeg.cortex.alpha2', from: [st('pk.bus.cns.alpha2Eq', 'neuro bus-read bus.cns.alpha2Eq')], to: CORTEX, sign: '+', form: 'state', params: ['l2/pk/combine.ts#DEXMED_EEG_C50_NG_ML', `${ST}DEXMED_LOR_NG_ML`], note: 'Dexmedetomidine\'s alpha-2 equivalent adds to hyperpolarisation, and to loss of responsiveness in units of its 2.09 ng/mL LOR anchor; it never drives burst suppression.' }),
  n({ id: 'neuro.eeg.cortex.mac', from: [st('endo.cascade.macF', 'neuro ctx eegCtx.macF')], to: CORTEX, sign: '−', form: 'gain', params: [], note: 'Each ether MAC fraction ÷ the endocrine model\'s MAC factor (floored at 0.3, inline in cortexInputsOf).' }),
  n({ id: 'neuro.eeg.cortex.age', from: [st('neuro.ageY', 'neuro ctx eegCtx.ageY')], to: CORTEX, sign: '−', form: 'gain', params: [`${ST}AGE_YOUNG_Y`, `${ST}AGE_OLD_Y`, `${ST}AGE_SLOPE_FLATTEN`, `${ST}AGE_AMP_OLD`], note: 'Age flattens the aperiodic slope and lowers the amplitude, linear from 18 to 90 y.' }),
  n({ id: 'neuro.eeg.cortex.arousal', from: [st('neuro.stim.level', 'neuro ctx eegCtx.stimulus'), st('neuro.antinoc', 'neuro ctx eegCtx.antinoc')], to: CORTEX, sign: '+', form: 'factor', params: [], note: 'Arousal = stimulus × (1 − antinociception), the engine\'s own terms (no constant).' }),
  n({ id: 'neuro.eeg.cortex.metabolic', from: [st('hemo.circ.ext.cbfRel', 'neuro ctx eegCtx.cbfRel'), st('blood.out.hb', 'neuro ctx eegCtx.hb'), st('resp.o2.sa', 'neuro ctx eegCtx.sao2'), st('resp.o2.pao2', 'neuro ctx eegCtx.pao2')], to: CORTEX, sign: '−', form: 'threshold', params: [`${ST}DO2_EEG_ABNORMAL`, `${ST}DO2_EEG_LOST`, `${ST}METABOLIC_SLOW_SHARE`], note: 'Cerebral O2 delivery (CBF/CBF0 × CaO2 ÷ the reference CaO2; the organ model\'s view of these four) below 20/50 slows the EEG, below 12/50 the voltage goes.' }),
  n({ id: 'neuro.eeg.cortex.cold', from: [st('resp.temp.tc', 'neuro ctx eegCtx.tempC')], to: CORTEX, sign: '−', form: 'threshold', params: [`${ST}COLD_SLOW_FROM_C`, `${ST}BS_TEMP_ONSET_C`, `${ST}BS_TEMP_SILENT_C`], note: 'Hypothermic slowing from 37 °C, burst suppression from 24.4 °C, silence at 17.8 °C.' }),
  n({ id: 'neuro.eeg.signal.cortex', from: [CORTEX], to: SIGNAL, sign: '±', form: 'state', params: ['l2/eeg/spectra.ts#AWAKE_RMS_UV', 'l2/eeg/spectra.ts#SLOPE_MAINT', 'l2/eeg/synth.ts#BS_BURST_S'], note: 'The spectrum each cortical state produces (spectra.ts), turned into microvolt samples (synth.ts).' }),
  n({ id: 'neuro.eeg.signal.emg', from: [st('neuro.last.tof.t1', 'neuro ctx eegCtx.t1'), st('neuro.airway', 'neuro ctx eegCtx.tube')], to: SIGNAL, sign: '+', form: 'term', params: [`${AR}EMG_FULL_RMS_UV`, `${AR}EMG_AWAKE`, `${AR}EMG_AROUSAL`, `${AR}EMG_TUBE`, `${AR}EMG_PEAK_HZ`, `${AR}EMG_Q`], note: 'Frontalis EMG = T1 × (awake tone, arousal, the tube as responsiveness returns) × the full-drive amplitude.' }),
  n({ id: 'neuro.eeg.signal.artefacts', from: [st('mods.artefact', 'neuro ctx eegCtx.art'), ef('eeg.ctx.device', 'neuro ctx eegCtx.mainsHz', 'neuro ctx eegCtx.ecgMvAt')], to: SIGNAL, sign: '+', form: 'term', params: [`${AR}DIATHERMY_RMS_UV`, `${AR}EEG_MAINS_UV`, `${AR}ECG_PICKUP_UV_PER_MV`], note: 'The ECG model\'s artefact state (diathermy, mains at the device mains frequency) and the heart\'s aVF projection (ECG pickup, off unless flagged) added to the trace.' }),
];
