export { build, engineKey, version } from './version.ts';
export * from './types.ts';
export * from './clock/clock.ts';
export * from './rng/sfc32.ts';
export { RingBuffer } from './buffers/ring.ts';
export { createEngine, BEEP_DELAY_S } from './engine.ts';
export { RHYTHMS, RHYTHM_IDS } from './l2/ecg/rhythms.ts';
export { defaultModifiers, mergeModifiers, validateModifiers } from './modifiers.ts';
export { ecgVocabulary, type EcgVocabulary } from './l2/ecg/vocabulary.ts';
export { dominantHz, rms, welch } from './util/dsp.ts';
export * from './types-hemo.ts';
export * from './types-device.ts';
export { capture12, LAYOUT_3X4, CAPTURE_S, type Capture12 } from './l3/capture12/capture.ts';
export { TrendStore, TREND_NUMERICS, TREND_SLOTS } from './l3/trends/trend-store.ts';
export { EventLog, type LogEntry, type LogKind } from './l3/trends/event-log.ts';
export * from './types-resp.ts';
export type * from './types-endo.ts';
export type * from './types-organs.ts';
export * from './types-lung.ts';
export { LUNG_CONDITIONS, VENT_ROW_MAP, HEALTHY } from '../data/lung-pathology.ts';
export { resolveLung } from './l2/lung/conditions.ts';
export { ventReference, type VentReference } from './l2/lung/vent-reference.ts';
export * from './types-vent-link.ts'; // Stage V
export * from './types-blood.ts';
export { ANALYSER_IDS, ANALYSERS, DEFAULT_ANALYSER, LAB_PANELS, LABORATORY, panelValues, sectionFor, turnaroundFor, type AnalyserId } from './l2/blood/analysers.ts'; // the analyser rows (L10a): the lab views' expected time
export { spo2PitchHz } from './l3/spo2/spo2.ts';
export type * from './types-circ.ts';
export type * from './types-pk.ts';
export { DRUG_BUS_NEUTRAL } from './types-pk.ts';
export type { PkState, DrugInst } from './l2/pk/pipeline.ts';
export { IV_ROUTES, routeHonoured } from './l2/pk/pipeline.ts'; // the validator, the record and the Drug sheet ask the engine
export { concUnit } from './l2/pk/pipeline.ts'; // DC1: the unit of a drug row's panel cp/ce, which a /2 phase rule reads
export { DRUGS, DRUG_IDS } from './l2/pk/data/drugs.ts'; // demo/controller drug pickers
export { gammaConc, gammaN, gammaShape } from './l2/pk/gamma.ts'; // Evidence page: the onset shapes (gamma vs chain)
export { shockStateFactor } from './l3/defib-pacer/outcome.ts'; // Evidence page: the shock-state factor
export type * from './types-truth.ts';
export type * from './types-neuro.ts';
export type * from './types-eeg.ts';
export { EEG_DEVICES, EEG_MODEL_IDS, type EegModelId } from './l3/eeg-devices/registry.ts'; // the EEG devices' spec rows (the developer page, the renderer's strip)
export { EEG_ELECTRODES, EEG_IMPEDANCE_DEFAULT_KOHM } from './l2/eeg/pipeline.ts'; // E12 (Q9): the instructor's electrode switch sends them back
export { pruneTruth, TRUTH_LIMITS } from './truth.ts';
