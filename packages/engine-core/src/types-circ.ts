// Stage 7a public types (R31/R42 circulation, R22 profile conditions, R28 devices), kept in their own file so
// parallel stages do not collide in types.ts. types.ts adds each to its union with one line.
import type { SimSeconds } from './types.ts';

/** Brief §7.2 ClinicalEvent members Stage 7a implements (drug ids beyond the five 7a drugs are rejected until 7g). */
export type CircClinicalEvent =
  | {
      kind: 'drug'; drugId: string; dose: number; unit: 'mcg' | 'mg' | 'mcg/kg' | 'mg/kg' | 'mEq' | 'units' | 'mcg/kg/min';
      route: 'iv' | 'io' | 'im' | 'inh'; infusion?: boolean;
    }
  | { kind: 'fluid'; fluid: 'crystalloid' | 'colloid' | 'blood'; volumeMl: number; overS: number }
  | { kind: 'bleed'; rateMlPerMin?: number; volumeMl?: number; overS?: number }
  | { kind: 'condition'; id: 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct'; severity: number };

/** R28 device modules on the circuit (tables §8.1–§8.2). */
export type CircDeviceAction =
  | {
      device: 'iabp'; action: 'start' | 'stop' | 'set'; ratio?: 1 | 2 | 3;
      /** inflation relative to the dicrotic notch, ms (− = early); deflation relative to the next R, ms (− = early) */
      inflateOffsetMs?: number; deflateOffsetMs?: number; volumeMl?: number;
    }
  | { device: 'lvad'; action: 'start' | 'stop' | 'set'; rpm?: number };

/** PV-loop teaching channels (125 Hz): LV pressure/volume, LA, RA, RV pressure, PA pressure truth. */
export type TeachingChannel = 'lvp' | 'lvv' | 'lap' | 'rap' | 'rvp' | 'pat';

/** 1 Hz circulation summary (tables §2.1 step 5, §3). */
export type CircEvent = {
  type: 'circ'; t: SimSeconds;
  co: number; sv: number; svRv: number; ef: number; lvedv: number; lvesv: number; lvedp: number; lvsp: number;
  pmsf: number; pvr: number; svr: number; cpp: number; supplyDemand: number; kIsch: number;
  iabp?: { ratio: number; augmentation: number }; lvad?: { rpm: number; flowLpm: number; pi: number; powerW: number; suction: boolean };
};

export interface ProfileCondition {
  id: string;
  grade?: string;
  severity?: number;
}
