// EEG plan D8: the registry of EEG devices, one spec row each (like the room's defibrillator models): the device's
// label, update interval and every constant with its tag (docs/model/monitor.md lists them), and its reader —
// create(fsHz) and read(state, samples, impedanceKOhm) → readings, nothing else (the device boundary, plan §5).
// `device eeg model <id>` accepts these ids only. The BIS-type reader is E7; Entropy, Narcotrend and PSI readers join as their
// sources are approved (the owner's Q1 A, Q2 A).
import type { EegDeviceSpec, EegReading } from '../../types-eeg.ts';
import { BIS_TYPE_SPEC, bisTypeRead, createBisType, type BisTypeState } from './bis-type.ts';
import { createGeneric, genericRead, GENERIC_SPEC, type GenericState } from './generic.ts';

export interface EegDevice<S> {
  spec: EegDeviceSpec;
  create(fsHz: number): S;
  read(state: S, samples: ArrayLike<number>, impedanceKOhm: readonly number[]): EegReading[];
}

export const EEG_DEVICES: { generic: EegDevice<GenericState>; bisType: EegDevice<BisTypeState> } = {
  generic: { spec: GENERIC_SPEC, create: createGeneric, read: genericRead },
  bisType: { spec: BIS_TYPE_SPEC, create: createBisType, read: bisTypeRead }, // E7: Connor 2022 + Rampil 1998 (the owner's sources)
};

export type EegModelId = keyof typeof EEG_DEVICES;
export const EEG_MODEL_IDS = Object.keys(EEG_DEVICES) as EegModelId[];
/** The device an EEG switched on reads with until another is chosen [ENG: device; the only one built]. */
export const EEG_DEFAULT_MODEL: EegModelId = 'generic';
