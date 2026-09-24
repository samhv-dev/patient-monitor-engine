// Pure command builders for the generated controls (no DOM). Every control in the panel and the remote goes
// through these, so the DOM layer only reads values out of inputs.
import type { Modifiers, Ramp, RhythmId } from '@pme/engine-core';
import type { CommandInput, ControlFlag, StateEvent } from '../protocol.ts';
import type { DeviceSpec, ModifierSpec, VarSpec } from '../vocabulary.ts';

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** A ramp from panel inputs; duration 0 → no ramp (step change). Duration is clamped to the vocabulary max. */
export function rampFrom(durationS: number, curve: Ramp['curve'], maxDurationS = 900): Ramp | undefined {
  const d = clamp(Number.isFinite(durationS) ? durationS : 0, 0, maxDurationS);
  return d > 0 ? { durationS: d, curve: curve ?? 'linear' } : undefined;
}

export function targetCommand(spec: VarSpec, value: number, ramp?: Ramp): CommandInput {
  const v = clamp(value, spec.min, spec.max);
  return { type: 'setTarget', variable: spec.id, value: v, ...(ramp && spec.rampable ? { ramp } : {}) };
}

export function pinCommand(spec: VarSpec, value: number | undefined, ramp?: Ramp): CommandInput {
  return { type: 'pin', variable: spec.id, ...(value !== undefined ? { value: clamp(value, spec.min, spec.max) } : {}), ...(ramp ? { ramp } : {}) };
}

export function releaseCommand(spec: VarSpec, ramp?: Ramp): CommandInput {
  return { type: 'release', variable: spec.id, ...(ramp ? { ramp } : {}) };
}

export function rhythmCommand(rhythm: RhythmId, when: 'now' | 'nextBeat' = 'now'): CommandInput {
  return { type: 'setRhythm', rhythm, when };
}

/** Builds the nested Partial<Modifiers> for a dotted path, e.g. 'artefact.noise' → { artefact: { noise: v } }. */
export function modifierPatch(path: string, value: unknown): Partial<Modifiers> {
  const keys = path.split('.');
  let o: unknown = value;
  for (let i = keys.length - 1; i >= 0; i--) o = { [keys[i] as string]: o };
  return o as Partial<Modifiers>;
}

/** kind 'number' → the number; kind 'object' → an object of field values when on, null when off. */
export function modifierCommand(spec: ModifierSpec, value: number | Record<string, string | number> | null): CommandInput {
  if (spec.kind === 'number') return { type: 'setModifiers', modifiers: modifierPatch(spec.path, clamp(value as number, spec.min, spec.max)) };
  return { type: 'setModifiers', modifiers: modifierPatch(spec.path, value) };
}

export function deviceCommand(spec: DeviceSpec, value: string, lane?: number): CommandInput {
  return { type: 'device', action: { device: spec.device, action: spec.action, value, ...(lane !== undefined ? { lane } : {}) } };
}

/** CAE-style flag shown next to a variable (brief §4.9, research 01 §4 items 1 and 3). */
export interface FlagView {
  flag: ControlFlag | null;
  text: string;
  className: string;
  title: string;
}

export function flagView(flag: ControlFlag | undefined): FlagView {
  switch (flag) {
    case 'ramping':
      return { flag, text: '▲', className: 'pme-flag pme-flag-blue', title: 'Trending toward its target' };
    case 'override':
      return { flag, text: '!', className: 'pme-flag pme-flag-yellow', title: 'Physiology overrides the target' };
    case 'pinned':
      return { flag, text: 'P', className: 'pme-flag pme-flag-pin', title: 'Pinned by the instructor' };
    case 'modeled':
      return { flag, text: 'M', className: 'pme-flag pme-flag-model', title: 'Driven by the model' };
    default:
      return { flag: null, text: '', className: 'pme-flag', title: '' };
  }
}

/** "target / truth / displayed" for one variable (truth is target-derived until the engine reports it, E1). */
export function readout(spec: VarSpec, state: StateEvent | null, displayed: number | null | undefined): string {
  const t = state?.values[spec.id];
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(Math.round(v * 10) / 10));
  return `${fmt(t)} / ${fmt(t)} / ${fmt(displayed)} ${spec.unit}`;
}
