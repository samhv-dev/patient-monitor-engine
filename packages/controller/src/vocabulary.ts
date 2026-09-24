// The control vocabulary (brief §7.1 `vocabulary()`: bounds, normals, enums, constraints — Squiggler-style,
// research 04 §5). The brief names the type but not its shape; this file defines it. Until engine-core
// implements vocabulary() (BUILD-PLAN Stage 5), vocabularyOf() falls back to stage1Vocabulary(), which
// describes exactly what the Stage 1 engine accepts. The panel and the remote generate their controls from it,
// so Stage 2/5 parameters appear by themselves once the engine reports them.
import { LEAD_IDS, RHYTHMS, RHYTHM_IDS, type RhythmId, type StateVar } from '@pme/engine-core';

export interface VarSpec {
  id: StateVar;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  normal: number;
  /** setTarget accepts a ramp. */
  rampable: boolean;
  /** pin/release apply (MODELED mode only, brief §4.9). */
  pinnable: boolean;
}

export interface EnumOption {
  value: string;
  label: string;
}

/** One field of a modifier. `path` is dotted inside `Modifiers` (e.g. 'artefact.noise'). */
export type ModifierField =
  | { key: string; label: string; type: 'number'; min: number; max: number; step: number; normal: number }
  | { key: string; label: string; type: 'enum'; options: EnumOption[]; normal: string };

/**
 * A modifier control. kind 'number' → setModifiers({[path]: value}); kind 'object' → an on/off toggle whose
 * "on" value is an object built from `fields` and whose "off" value is null (e.g. pvc).
 */
export type ModifierSpec =
  | { kind: 'number'; path: string; label: string; min: number; max: number; step: number; normal: number }
  | { kind: 'object'; path: string; label: string; fields: ModifierField[] };

/** A device action with a fixed option list (brief §7.2 DeviceAction). `lanes` > 0 → one control per lane. */
export interface DeviceSpec {
  id: string;
  label: string;
  device: 'ecg';
  action: 'filter' | 'lead';
  options: EnumOption[];
  normal: string | string[];
  lanes?: number;
}

export interface Vocabulary {
  schema: 'pme-vocabulary/1';
  engineVersion: string;
  variables: VarSpec[];
  rhythms: Array<{ id: RhythmId; label: string; defaultRateBpm: number }>;
  modifiers: ModifierSpec[];
  devices: DeviceSpec[];
  ramp: { maxDurationS: number; curves: Array<'linear' | 'exp' | 'sigmoid'> };
  constraints: Array<{ id: string; text: string }>;
}

// Rhythm ids come from engine-core's RHYTHM_IDS (36 after Stage 5); an id without a label here is shown as
// its id. Labels are display-only, so a new rhythm never breaks the controller build.
const RHYTHM_LABEL: Partial<Record<RhythmId, string>> = {
  sinus: 'Sinus', sinusBrady: 'Sinus bradycardia', sinusTachy: 'Sinus tachycardia', afib: 'Atrial fibrillation',
  aflutter: 'Atrial flutter', svtAvnrt: 'SVT (AVNRT)', avb1: '1st-degree AV block', avb2Mobitz1: '2nd-degree Mobitz I',
  avb3Narrow: '3rd-degree, narrow escape', avb3Wide: '3rd-degree, wide escape', vtMono: 'Monomorphic VT', asystole: 'Asystole',
};

/** What the Stage 1 engine accepts (engine.ts validate()). */
export function stage1Vocabulary(engineVersion = '0.0.0'): Vocabulary {
  return {
    schema: 'pme-vocabulary/1',
    engineVersion,
    variables: [{ id: 'hr', label: 'HR', unit: 'bpm', min: 0, max: 300, step: 1, normal: 75, rampable: true, pinnable: false }],
    rhythms: RHYTHM_IDS.map((id) => ({ id, label: RHYTHM_LABEL[id] ?? id, defaultRateBpm: RHYTHMS[id].defaultRateBpm })),
    modifiers: [
      {
        kind: 'object', path: 'pvc', label: 'PVCs',
        fields: [
          { key: 'pattern', label: 'Pattern', type: 'enum', options: [{ value: 'single', label: 'Single' }, { value: 'bigeminy', label: 'Bigeminy' }], normal: 'bigeminy' },
          { key: 'probability', label: 'Probability', type: 'number', min: 0, max: 0.9, step: 0.05, normal: 0.2 },
        ],
      },
      { kind: 'number', path: 'rsa', label: 'RSA depth', min: 0, max: 1, step: 0.05, normal: 0.67 },
      { kind: 'number', path: 'artefact.noise', label: 'Noise', min: 0, max: 3, step: 0.1, normal: 1 },
    ],
    devices: [
      { id: 'ecg.filter', label: 'ECG filter', device: 'ecg', action: 'filter', options: [{ value: 'monitor', label: 'Monitor' }, { value: 'diagnostic', label: 'Diagnostic' }], normal: 'monitor' },
      { id: 'ecg.lead', label: 'Lead', device: 'ecg', action: 'lead', options: LEAD_IDS.map((l) => ({ value: l, label: l.replace('ecg', '') })), normal: ['ecgII', 'V5'], lanes: 2 },
    ],
    ramp: { maxDurationS: 900, curves: ['linear', 'exp', 'sigmoid'] },
    constraints: [{ id: 'stage1-hr-only', text: 'Stage 1 engine: only HR takes targets; other variables arrive with Stage 2.' }],
  };
}

/** The engine's own vocabulary when it has one (Stage 5+), else the Stage 1 description. */
export function vocabularyOf(engine: { readonly version: string; vocabulary?: () => unknown }): Vocabulary {
  const v = engine.vocabulary?.();
  if (v && typeof v === 'object' && (v as Vocabulary).schema === 'pme-vocabulary/1') return v as Vocabulary;
  return stage1Vocabulary(engine.version);
}
