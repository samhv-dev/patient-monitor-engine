// Rhythm table (brief §5; research 03 §1.5). Each rhythm is a configuration of the two clocks (atria,
// ventricle), the AV node, an optional ventricular/junctional focus, a continuous generator (VF) and an
// optional implanted pacemaker. `hr` (the L1 target) drives the rate named in `rateDrives`.
import type { RhythmGroup, RhythmId } from '../../types.ts';
import type { BeatTemplateId as TemplateId } from './beat-templates.ts';

export type AtrialMode = 'sinus' | 'ectopic' | 'multifocal' | 'flutter' | 'fib' | 'none';
export type AvMode = 'conducted' | 'wenckebach' | 'mobitz2' | 'fixedRatio' | 'dissociated' | 'integrateFire';
export type FocusMode = 'none' | 'vt' | 'svt' | 'avrt' | 'junctional' | 'idioventricular' | 'vtPoly' | 'torsades' | 'agonal';
export type EscapeMode = 'junctional' | 'ventricular' | 'none';
export type PacingMode = 'none' | 'AAI' | 'VVI' | 'DDD';

export interface RhythmDef {
  group: RhythmGroup;
  atria: AtrialMode;
  av: AvMode;
  focus: FocusMode;
  escape: EscapeMode;
  /** 'vf': the continuous VF generator runs (arrest/vf.ts). */
  continuous: 'none' | 'vf';
  pacing: PacingMode;
  /** What the 'hr' target sets. 'pacer' = the pacemaker lower rate. */
  rateDrives: 'sinus' | 'afResponse' | 'focus' | 'escape' | 'pacer' | 'none';
  /** Clamp applied to hr for this rhythm (bpm). */
  rateRange: readonly [number, number];
  /** hr target set when the rhythm starts (RhythmOpts.rateBpm overrides). */
  defaultRateBpm: number;
  /** Template of conducted supraventricular beats. */
  conductedTemplate: TemplateId;
  /** Template of the escape beats (when escape ≠ none). */
  escapeTemplate: TemplateId;
  /** Backup escape rate for rhythms whose escape is not the primary pacemaker (bpm). */
  backupEscapeBpm: number;
  /** Default rate of atria that are not driven by 'hr' (dissociated, paced, pWaveAsystole) (bpm). */
  atrialDefaultBpm: number;
}

const BACKUP_JUNCTIONAL_BPM = 40; // [ENG] junctional escape 40–60 (brief §5); low end so Wenckebach pauses stay visible
const DISSOCIATED_ATRIAL_BPM = 80; // [ENG] (Stage 1 default)

type Row = Omit<RhythmDef, 'continuous' | 'pacing' | 'conductedTemplate' | 'atrialDefaultBpm' | 'escapeTemplate' | 'backupEscapeBpm'> &
  Partial<Pick<RhythmDef, 'continuous' | 'pacing' | 'conductedTemplate' | 'atrialDefaultBpm' | 'escapeTemplate' | 'backupEscapeBpm'>>;
function row(r: Row): RhythmDef {
  return {
    continuous: 'none',
    pacing: 'none',
    conductedTemplate: 'narrow',
    atrialDefaultBpm: DISSOCIATED_ATRIAL_BPM,
    escapeTemplate: 'narrow',
    backupEscapeBpm: 0,
    ...r,
  };
}
const J = BACKUP_JUNCTIONAL_BPM;

export const RHYTHMS: Readonly<Record<RhythmId, RhythmDef>> = {
  // --- sinus ------------------------------------------------------------------------------------
  sinus: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 250], defaultRateBpm: 75, backupEscapeBpm: J }),
  // sinusBrady backup escape 30/min [ENG]: below the junctional 40–60 (brief §5) so it cannot pre-empt a slow sinus down to 31/min
  sinusBrady: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 59], defaultRateBpm: 45, backupEscapeBpm: 30 }),
  sinusTachy: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [101, 220], defaultRateBpm: 120, backupEscapeBpm: J }),
  sinusArrhythmia: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 100], defaultRateBpm: 70, backupEscapeBpm: 30 }),
  // backup escape 15/min so a 3 s arrest stays visible [ENG]
  sinusPause: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 100], defaultRateBpm: 70, backupEscapeBpm: 15 }),
  // --- atrial -----------------------------------------------------------------------------------
  atrialTach: row({ group: 'atrial', atria: 'ectopic', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [150, 250], defaultRateBpm: 170, backupEscapeBpm: J }),
  mat: row({ group: 'atrial', atria: 'multifocal', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [100, 150], defaultRateBpm: 120, backupEscapeBpm: J }),
  afib: row({ group: 'atrial', atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [40, 180], defaultRateBpm: 100 }),
  aflutter: row({ group: 'atrial', atria: 'flutter', av: 'fixedRatio', focus: 'none', escape: 'junctional', rateDrives: 'none', rateRange: [0, 400], defaultRateBpm: 150, backupEscapeBpm: J }),
  // --- SVT family -------------------------------------------------------------------------------
  svtAvnrt: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'svt', escape: 'none', rateDrives: 'focus', rateRange: [140, 280], defaultRateBpm: 180 }),
  svtAvrt: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'avrt', escape: 'none', rateDrives: 'focus', rateRange: [150, 250], defaultRateBpm: 190 }),
  wpwSinus: row({ group: 'svt', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 150], defaultRateBpm: 75, conductedTemplate: 'wpw', backupEscapeBpm: J }),
  preexcitedAf: row({ group: 'svt', atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [120, 280], defaultRateBpm: 200, conductedTemplate: 'wpw' }),
  junctionalEscape: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [40, 60], defaultRateBpm: 50 }),
  junctionalAccel: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [61, 100], defaultRateBpm: 80 }),
  junctionalTachy: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [101, 180], defaultRateBpm: 120 }),
  // --- AV blocks --------------------------------------------------------------------------------
  avb1: row({ group: 'avBlock', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [30, 150], defaultRateBpm: 70, backupEscapeBpm: J }),
  avb2Mobitz1: row({ group: 'avBlock', atria: 'sinus', av: 'wenckebach', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, backupEscapeBpm: J }),
  avb2Mobitz2: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, backupEscapeBpm: 30 }),
  avb2to1: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 150], defaultRateBpm: 80, backupEscapeBpm: 25 }),
  // 3:1 at 100 → ventricle 33/min, 4:1 → 25/min; escape backup 20/min (3 s) stays behind both [ENG]
  avbHighGrade: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [60, 150], defaultRateBpm: 100, backupEscapeBpm: 20 }),
  avb3Narrow: row({ group: 'avBlock', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'junctional', rateDrives: 'escape', rateRange: [40, 60], defaultRateBpm: 45 }),
  avb3Wide: row({ group: 'avBlock', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', rateDrives: 'escape', rateRange: [20, 40], defaultRateBpm: 32, escapeTemplate: 'wide' }),
  // --- ventricular ------------------------------------------------------------------------------
  idioventricular: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'idioventricular', escape: 'none', rateDrives: 'focus', rateRange: [20, 40], defaultRateBpm: 35 }),
  aivr: row({ group: 'ventricular', atria: 'sinus', av: 'dissociated', focus: 'idioventricular', escape: 'none', rateDrives: 'focus', rateRange: [41, 120], defaultRateBpm: 75, atrialDefaultBpm: 60 }),
  vtMono: row({ group: 'ventricular', atria: 'sinus', av: 'conducted', focus: 'vt', escape: 'none', rateDrives: 'focus', rateRange: [120, 250], defaultRateBpm: 170 }),
  vtPoly: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'vtPoly', escape: 'none', rateDrives: 'focus', rateRange: [150, 300], defaultRateBpm: 220 }),
  torsades: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'torsades', escape: 'none', rateDrives: 'focus', rateRange: [200, 250], defaultRateBpm: 230 }),
  vfCoarse: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', continuous: 'vf', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  vfFine: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', continuous: 'vf', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  // --- arrest -----------------------------------------------------------------------------------
  asystole: row({ group: 'arrest', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  pWaveAsystole: row({ group: 'arrest', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0, atrialDefaultBpm: 50 }),
  agonal: row({ group: 'arrest', atria: 'none', av: 'dissociated', focus: 'agonal', escape: 'none', rateDrives: 'focus', rateRange: [4, 20], defaultRateBpm: 12 }),
  // --- paced (underlying: sinus atria; pacing.ts decides conduction) ------------------------------
  pacedAAI: row({ group: 'paced', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', pacing: 'AAI', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 45, backupEscapeBpm: 30 }),
  pacedVVI: row({ group: 'paced', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', pacing: 'VVI', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 80, escapeTemplate: 'wide', backupEscapeBpm: 25 }),
  pacedDDD: row({ group: 'paced', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', pacing: 'DDD', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 50, escapeTemplate: 'wide', backupEscapeBpm: 25 }),
};

export const RHYTHM_IDS = Object.keys(RHYTHMS) as RhythmId[];

/** Dissociated atria (CHB, VT) run at their own rate (RhythmOpts.atrialRateBpm, default 80) [ENG]. */
export const DEFAULT_DISSOCIATED_ATRIAL_BPM = DISSOCIATED_ATRIAL_BPM;
/** Flutter atrial rate default (brief §5: 250–350). */
export const DEFAULT_FLUTTER_ATRIAL_BPM = 300;
