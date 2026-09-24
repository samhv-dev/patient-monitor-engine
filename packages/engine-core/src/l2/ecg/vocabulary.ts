// ECG vocabulary (brief §7.1 `vocabulary()`: bounds, normals, enums, constraints). The engine-level vocabulary()
// (Stage 6) merges this with the other layers; controllers build their rhythm/modifier menus from it.
import type { RhythmGroup, RhythmId } from '../../types.ts';
import { RHYTHMS } from './rhythms.ts';
import { defaultModifiers } from '../../modifiers.ts';

export interface EcgVocabulary {
  rhythms: Array<{ id: RhythmId; group: RhythmGroup; rateRange: readonly [number, number]; defaultRateBpm: number; rateDrives: string }>;
  groups: RhythmGroup[];
  modifiers: Record<string, { min?: number; max?: number; enum?: readonly (string | number)[]; default: unknown }>;
  artefacts: Record<string, { min?: number; max?: number; default: unknown }>;
}

export function ecgVocabulary(): EcgVocabulary {
  const d = defaultModifiers();
  const ids = Object.keys(RHYTHMS) as RhythmId[];
  return {
    rhythms: ids.map((id) => ({ id, group: RHYTHMS[id].group, rateRange: RHYTHMS[id].rateRange, defaultRateBpm: RHYTHMS[id].defaultRateBpm, rateDrives: RHYTHMS[id].rateDrives })),
    groups: ['sinus', 'atrial', 'svt', 'avBlock', 'ventricular', 'arrest', 'paced'],
    modifiers: {
      pvc: { enum: ['single', 'bigeminy', 'trigeminy', 'couplet', 'triplet', 'run'], default: d.pvc },
      pac: { min: 0, max: 0.9, default: d.pac },
      pjc: { min: 0, max: 0.9, default: d.pjc },
      rsa: { min: 0, max: 1, default: d.rsa },
      hrvScale: { min: 0, max: 3, default: d.hrvScale },
      qtc: { min: 300, max: 650, default: d.qtc },
      bbb: { enum: ['none', 'rbbb', 'lbbb'], default: d.bbb },
      axisDeg: { min: -150, max: 180, default: d.axisDeg },
      transitionLead: { min: 1.5, max: 5.5, default: d.transitionLead },
      lowVoltage: { min: 0.3, max: 1, default: d.lowVoltage },
      lvh: { enum: [0, 1], default: d.lvh },
      st: { enum: ['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'], min: 0.5, max: 4, default: d.st },
      ischaemicDepressionMv: { min: -0.3, max: 0, default: d.ischaemicDepressionMv },
      tInversion: { min: 0, max: 1, default: d.tInversion },
      longQT: { enum: [0, 1], default: d.longQT },
      brugada1: { enum: [0, 1], default: d.brugada1 },
      digoxin: { enum: [0, 1], default: d.digoxin },
      alternans: { min: 0, max: 0.5, default: d.alternans },
      k: { min: 1.5, max: 10, default: d.k },
      tempC: { min: 20, max: 43, default: d.tempC },
      patientSeed: { min: 0, default: d.patientSeed },
      morphologyVariation: { min: 0, max: 1, default: d.morphologyVariation },
      epinephrineAtS: { min: 0, default: d.epinephrineAtS },
      tcp: { min: 0, max: 200, default: d.tcp },
    },
    artefacts: {
      noise: { min: 0, max: 1, default: d.artefact.noise },
      wander: { min: 0, max: 1, default: d.artefact.wander },
      mains: { min: 0, max: 1, default: d.artefact.mains },
      emg: { min: 0, max: 1, default: d.artefact.emg },
      shiver: { min: 0, max: 1, default: d.artefact.shiver },
      motion: { min: 0, max: 1, default: d.artefact.motion },
      leadOff: { default: d.artefact.leadOff },
      electrosurgery: { default: d.artefact.electrosurgery },
      cpr: { min: 60, max: 160, default: d.artefact.cpr },
      shock: { min: 1, max: 400, default: d.artefact.shock },
    },
  };
}
