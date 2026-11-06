// EEG stage E3/E4 in the engine: the `eeg` channel (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E3, E4; D2–D5).
// The state exists only while an EEG device is on (`device eeg on`, D4): an engine that never switches it on carries
// no EEG state and computes exactly what it computed before. Each committed step (engine.ts, after the neuro and
// organ steps, reading their last published state) writes the 125 Hz samples up to the step's end:
//   every hop: the cortex (state.ts) from the drug bus and the physiology → the spectrum (spectra.ts) → a new block
//   (synth.ts); every sample: the brain signal + the artefacts (artefacts.ts), µV.
// Determinism (D3): the generator draws from seedStream(seed, 'eeg') and the artefacts from seedStream(seed,
// 'eeg-artefact') — two streams, so an artefact never shifts the brain's noise — and nothing else, so a follower
// computes the host's samples from the same commands; no EEG sample crosses the wire. Read only: nothing here is
// read back by the physiology (D7).
import { seedStream } from '../../rng/sfc32.ts';
import type { Command } from '../../types.ts';
import type { EegDeviceAction, CortexState } from '../../types-eeg.ts';
import type { DrugBus } from '../../types-pk.ts';
import type { ArtefactSpec } from '../ecg/api-types.ts';
import { artefactSample, createArtefacts, type ArtState } from './artefacts.ts';
import { spectrumOf } from './spectra.ts';
import { agentMixOf, brainDo2Rel, cortexInputsOf, cortexStep } from './state.ts';
import { createSynth, synthNext, type SynthState } from './synth.ts';

/** The channel's rate: one frontal channel at 125 Hz, an existing engine rate covering Miller's 0–50 Hz spectrograms
 * (plan D2; Ch36 p. 1139, Fig. 36.3). */
export const EEG_RATE = 125; // Hz
/** Electrodes on the frontal sensor: signal, reference, ground [ENG: the generic single-channel montage]. */
export const EEG_ELECTRODES = 3;
/** Each electrode's impedance until the instructor changes it, kΩ [ENG: "default good" (plan E4), below the 5 kΩ limit]. */
export const EEG_IMPEDANCE_DEFAULT_KOHM = 2;
/** The range an impedance command accepts, kΩ [ENG: up to an electrode off the skin]. */
export const EEG_IMPEDANCE_MAX_KOHM = 500;

/** What one EEG step reads, as last published by the other models (engine.ts builds it). */
export interface EegCtx {
  bus: DrugBus;
  ageY: number;
  /** The neuro model: the stimulus level 0–1, its blunting, the twitch T1 and whether a tube is in. */
  stimulus: number;
  antinoc: number;
  t1: number;
  tube: boolean;
  /** The organs (brain CBF relative to normal) and the blood gases they read; core temperature; the hypothermic MAC
   * factor (the endocrine model's cascade). */
  cbfRel: number;
  hb: number;
  sao2: number;
  pao2: number;
  tempC: number;
  macF: number;
  /** The ECG model's artefact state (read only) and the device mains frequency. */
  art: ArtefactSpec;
  mainsHz: 50 | 60;
  /** The heart's aVF projection at sim time tS (the ECG sample there), mV; 0 when not held. */
  ecgMvAt: (tS: number) => number;
}

export interface EegState {
  /** Next 125 Hz sample index to write. */
  m: number;
  cortex: CortexState;
  synth: SynthState;
  art: ArtState;
  impedanceKOhm: number[];
  ecgPickup: boolean;
}

const HOP_DT = (s: SynthState) => s.H / s.fs;

function spectrumNow(prev: CortexState | undefined, ctx: EegCtx, dtS: number) {
  const x = cortexInputsOf(ctx.bus, {
    ageY: ctx.ageY, stimulus: ctx.stimulus, antinoc: ctx.antinoc, tempC: ctx.tempC, macF: ctx.macF,
    do2Rel: brainDo2Rel(ctx.cbfRel, ctx.hb, ctx.sao2, ctx.pao2),
  });
  const cortex = cortexStep(prev, x, dtS);
  return { cortex, spec: spectrumOf(cortex, agentMixOf(x)) };
}

/** The EEG switched on at 125 Hz sample `m0`. */
export function createEegState(seed: number, m0: number, ctx: EegCtx): EegState {
  const { cortex, spec } = spectrumNow(undefined, ctx, 0);
  return {
    m: m0, cortex,
    synth: createSynth(seedStream(seed, 'eeg'), EEG_RATE, spec),
    art: createArtefacts(seedStream(seed, 'eeg-artefact'), EEG_RATE),
    impedanceKOhm: new Array<number>(EEG_ELECTRODES).fill(EEG_IMPEDANCE_DEFAULT_KOHM),
    ecgPickup: false,
  };
}

const okKohm = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= EEG_IMPEDANCE_MAX_KOHM;

/** A reason, undefined (accepted) or null (not an EEG command). `on`: the EEG is on now; `models`: the device
 * registry's ids (l3/eeg-devices/registry.ts — the engine passes them, so this layer does not import the devices). */
export function validateEegCommand(cmd: Command, on: boolean, models: readonly string[] = []): string | undefined | null {
  if (cmd.type !== 'device' || (cmd.action as { device: string }).device !== 'eeg') return null;
  const a = cmd.action as EegDeviceAction & { value?: unknown };
  switch (a.action) {
    case 'on':
    case 'off':
      return a.value === undefined ? undefined : `eeg ${a.action} takes no value`;
    case 'impedance':
      if (!on) return 'eeg is off: switch it on first';
      if (okKohm(a.value)) return undefined;
      return Array.isArray(a.value) && a.value.length === EEG_ELECTRODES && a.value.every(okKohm)
        ? undefined
        : `impedance must be a kΩ value 0–${EEG_IMPEDANCE_MAX_KOHM}, or ${EEG_ELECTRODES} of them (one per electrode)`;
    case 'ecgPickup':
      if (!on) return 'eeg is off: switch it on first';
      return typeof a.value === 'boolean' ? undefined : 'ecgPickup must be true or false';
    case 'model':
      if (!on) return 'eeg is off: switch it on first';
      return typeof a.value === 'string' && models.includes(a.value) ? undefined : `eeg model must be one of: ${models.join(', ')} (got ${String(a.value)})`;
    default:
      return `eeg action must be on, off, impedance, ecgPickup or model (got ${String((a as { action: unknown }).action)})`;
  }
}

/** Apply an accepted impedance or ecgPickup command to a running EEG (on/off and the model are the engine's: they
 * create or drop the state and the device). */
export function applyEegSetting(es: EegState, a: EegDeviceAction): void {
  if (a.action === 'impedance') es.impedanceKOhm = typeof a.value === 'number' ? new Array<number>(EEG_ELECTRODES).fill(a.value) : [...a.value];
  else if (a.action === 'ecgPickup') es.ecgPickup = a.value;
}

/** Write the samples up to and including 125 Hz index `endM`. */
export function advanceEeg(es: EegState, ctx: EegCtx, endM: number, write: (m: number, v: number) => void): void {
  for (; es.m <= endM; es.m++) {
    const brain = synthNext(es.synth, () => {
      const r = spectrumNow(es.cortex, ctx, HOP_DT(es.synth));
      es.cortex = r.cortex;
      return r.spec;
    });
    const tS = es.m / EEG_RATE;
    const art = artefactSample(es.art, {
      tS, t1: ctx.t1, lor: es.cortex.lor, arousal: es.cortex.arousal, tube: ctx.tube,
      electrosurgery: ctx.art.electrosurgery, mains: ctx.art.mains, mainsHz: ctx.mainsHz,
      impedanceKOhm: es.impedanceKOhm, ecgPickup: es.ecgPickup, ecgMv: es.ecgPickup ? ctx.ecgMvAt(tS) : 0,
    });
    write(es.m, brain + art);
  }
}
