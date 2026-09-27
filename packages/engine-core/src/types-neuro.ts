// Stage 7f public types (R32: neuromuscular block, anaesthetic depth, respiratory-drive depression), in their own file
// so parallel stages do not collide in types.ts; types.ts adds each to its union with one line marked `// Stage 7f`.
// The `drug` and `vaporiser` events are Stage 7g's (types-pk.ts; R51 §3–4): 7f declares none and consumes none.
import type { SimSeconds } from './types.ts';
import type { NeuroAgentId, VolatileId } from './l2/neuro/bus.ts';
import type { NeuroOutputs } from './l2/neuro/outputs.ts';
import type { NmProfile } from './l2/neuro/interactions.ts';

export type { NeuroOutputs, NmProfile };

/** Patient-profile additions (brief §7.4 `patient`), all optional. */
export interface NeuroProfile {
  nm?: NmProfile;
  /** Plasma cholinesterase phenotype; the engine hands it to 7g's PK patient as `pche` (R51 addendum 10). */
  cholinesterase?: 'normal' | 'heterozygous' | 'homozygous';
  mhSusceptible?: boolean;
  /** Plasma magnesium, mmol/L (default 0.9); 7c supplies it when it lands. */
  mgMmolL?: number;
}

/**
 * The ONE `stimulus` shape (R51 addenda 12 and 17): Stage 7e's — nociception 0 none … 1 incision … 1.5
 * laryngoscopy/sternotomy … 2 maximal; it holds until the next `stimulus` event (intensity 0 ends it). 7e consumes it
 * (stress hormones); 7f OBSERVES it (apply returns false) for its antinociception/movement/EMG terms. If 7e's
 * types-endo.ts lands after this file, 7e imports this type instead of declaring its own (the 7e plan's Task 1 note).
 */
export type StimulusEvent = { kind: 'stimulus'; intensity: number };

/** Brief §7.2 ClinicalEvent members Stage 7f validates (`stimulus` only until 7e lands: decision 17). */
export type NeuroClinicalEvent =
  | StimulusEvent
  | { kind: 'airwayDevice'; device: 'none' | 'ett' | 'sga' }
  | ({ kind: 'neuroProfile' } & NeuroProfile);

/** TOF stimulator and depth-monitor device actions (plan decision 13). */
export type NeuroDeviceAction =
  | { device: 'tof'; action: 'start' | 'stop' | 'train' | 'ptc'; intervalS?: number }
  | { device: 'depth'; action: 'on' | 'off' };

export type NeuroNumericId = 'tofCount' | 'tofRatio' | 'ptc' | 'di' | 'sr' | 'mac' | 'etAa';

export type NeuroMarkKind =
  | 'fasciculation' | 'movement' | 'awareness' | 'emergence' | 'lossOfConsciousness'
  | 'apnoea' | 'breathing' | 'recurarisation' | 'mhTrigger';

export type NeuroEvent =
  /**
   * 1 Hz instructor "anaesthetic state" (truth, not measured). Concentrations in ng/mL (propofol too), read from 7g's
   * bus. `mac` = END-TIDAL MAC fraction (Σ fet/macAge, what the gas monitor shows); `macBrain` = the BRAIN fraction
   * (Σ 7g's macFrac, what the depth index uses); `macEff` = brain MAC after opioid reduction.
   */
  | {
      type: 'anaesthesia'; t: SimSeconds;
      di: number; sr: number; mac: number; macBrain: number; macEff: number; etPct: Partial<Record<VolatileId, number>>;
      ce: Partial<Record<NeuroAgentId, number>>;
      tof: { count: number; ratio: number; ptc: number; t1: number };
      block: { thumb: number; dia: number };
      drive: { opioidDep: number; hypnoticDep: number; veRest: number; apnoea: boolean; obstruction: number };
      conscious: boolean; awarenessRisk: boolean; stress: number; movement: boolean;
      outputs: NeuroOutputs;
    }
  /** One stimulator train (measured): the "marker" of the train, time-stamped at the stimulus. */
  | { type: 'tof'; t: SimSeconds; mode: 'tof' | 'ptc'; count: number; ratio: number | null; ptc: number | null; twitches: number[] }
  | { type: 'neuroMark'; t: SimSeconds; kind: NeuroMarkKind };

export type NeuroCommandBody =
  | { type: 'applyEvent'; event: NeuroClinicalEvent }
  | { type: 'device'; action: NeuroDeviceAction };
