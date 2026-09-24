// Stage 5 ECG generation seam. The engine calls generateEcg (instead of Stage 1's generateVcg directly) and passes
// every lane sample through ecgFrontEnd before the L3 filter. Continuous VCG sources (VF texture, AF f-wave
// texture, CPR, EMG, wander, TCP artefact) register in VCG_SOURCES; per-lead electrode/amplifier effects (mains,
// motion, lead-off, diathermy, defibrillator saturation) register in FRONT_END_STAGES. Artefacts are summed
// BEFORE the L3 monitor filter (brief §3.2, §5).
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { LeadId, Modifiers } from '../../types.ts';
import { ECG_RATE, generateVcg, type GenInputs } from './generator.ts';
import type { HrvPhase } from './hrv.ts';
import type { RhythmState } from './rhythm-state.ts';
import { vfSource } from './arrest/vf.ts';
import { afSource } from './af-texture.ts';
import { bodyArtefactSource } from './artefacts/body.ts';
import { diathermyStage, leadOffStage, mainsStage, motionStage, railStage, shockStage } from './artefacts/front-end.ts';

export interface EcgGenInputs extends GenInputs {
  mods: Modifiers;
  st: RhythmState;
  mainsHz: 50 | 60;
  artefactRng: Sfc32State;
}

/** Adds a continuous contribution for sample n (time s) into acc[0..2] (VCG mV). May mutate state inside g.st. */
export type VcgSource = (g: EcgGenInputs, n: number, s: number, acc: Float64Array) => void;
export const VCG_SOURCES: VcgSource[] = [vfSource, afSource, bodyArtefactSource];

/** Maps one projected lead sample v (mV) to what the amplifier delivers. Must be a pure function of its inputs. */
export type FrontEndStage = (mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number) => number;
/** Order: pickup (mains, motion, diathermy) → defibrillator → lead-off → rail clip. */
export const FRONT_END_STAGES: FrontEndStage[] = [mainsStage, motionStage, diathermyStage, shockStage, leadOffStage, railStage];

export function ecgGenInputs(
  ps: { rhythm: RhythmState; mods: Modifiers; hrv: HrvPhase; rng: Record<StreamName, Sfc32State> },
  mainsHz: 50 | 60,
): EcgGenInputs {
  return {
    events: ps.rhythm.events,
    fwaves: ps.rhythm.fwaves,
    hrv: ps.hrv,
    noiseLevel: ps.mods.artefact.noise,
    noise: ps.rng.noise,
    mods: ps.mods,
    st: ps.rhythm,
    mainsHz,
    artefactRng: ps.rng.artefact,
  };
}

/** Stage 1's generateVcg plus the registered continuous sources. */
export function generateEcg(g: EcgGenInputs, from: number, to: number, sink: (index: number, x: number, y: number, z: number) => void): void {
  const acc = new Float64Array(3);
  generateVcg(g, from, to, (n, x, y, z) => {
    acc[0] = x;
    acc[1] = y;
    acc[2] = z;
    const s = n / ECG_RATE;
    for (const src of VCG_SOURCES) src(g, n, s, acc);
    sink(n, acc[0] as number, acc[1] as number, acc[2] as number);
  });
}

/** Electrode/amplifier front end for one lead sample. */
export function ecgFrontEnd(mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  let out = v;
  for (const f of FRONT_END_STAGES) out = f(mods, mainsHz, lead, n, out);
  return out;
}
