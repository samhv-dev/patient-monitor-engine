// Stage 1 rhythm table (brief §5; research 03 §1.5). Each rhythm is a configuration of the two clocks
// (atria, ventricle) and the AV node. `hr` (the L1 target) drives the rate named in `rateDrives`.
import type { RhythmId } from '../../types.ts';
import type { TemplateId } from './templates.ts';

export type AtrialMode = 'sinus' | 'flutter' | 'fib' | 'none';
export type AvMode = 'conducted' | 'wenckebach' | 'fixedRatio' | 'dissociated' | 'integrateFire';
export type FocusMode = 'none' | 'vt' | 'svt';
export type EscapeMode = 'junctional' | 'ventricular' | 'none';

export interface RhythmDef {
  atria: AtrialMode;
  av: AvMode;
  focus: FocusMode;
  escape: EscapeMode;
  /** What the 'hr' target sets: the SA rate, the ventricular response, the focus rate or the escape rate. */
  rateDrives: 'sinus' | 'afResponse' | 'focus' | 'escape' | 'none';
  /** Clamp applied to hr for this rhythm (bpm). */
  rateRange: readonly [number, number];
  /** hr target set when the rhythm starts (RhythmOpts.rateBpm overrides). */
  defaultRateBpm: number;
  /** Template of the escape beats (when escape ≠ none). */
  escapeTemplate: TemplateId;
  /** Backup escape rate for rhythms whose escape is not the primary pacemaker (bpm). */
  backupEscapeBpm: number;
}

const BACKUP_JUNCTIONAL_BPM = 40; // [ENG] junctional escape 40–60 (brief §5); low end so Wenckebach pauses stay visible

export const RHYTHMS: Readonly<Record<RhythmId, RhythmDef>> = {
  sinus: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 250], defaultRateBpm: 75, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  // sinusBrady backup escape 30/min [ENG]: below the junctional 40–60 (brief §5) so it cannot pre-empt a slow sinus down to 31/min
  sinusBrady: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 59], defaultRateBpm: 45, escapeTemplate: 'narrow', backupEscapeBpm: 30 },
  sinusTachy: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [101, 220], defaultRateBpm: 120, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  afib: { atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [40, 180], defaultRateBpm: 100, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  aflutter: { atria: 'flutter', av: 'fixedRatio', focus: 'none', escape: 'junctional', rateDrives: 'none', rateRange: [0, 400], defaultRateBpm: 150, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  svtAvnrt: { atria: 'none', av: 'dissociated', focus: 'svt', escape: 'none', rateDrives: 'focus', rateRange: [140, 280], defaultRateBpm: 180, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  avb1: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [30, 150], defaultRateBpm: 70, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  avb2Mobitz1: { atria: 'sinus', av: 'wenckebach', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  avb3Narrow: { atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'junctional', rateDrives: 'escape', rateRange: [40, 60], defaultRateBpm: 45, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  avb3Wide: { atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', rateDrives: 'escape', rateRange: [20, 40], defaultRateBpm: 32, escapeTemplate: 'wide', backupEscapeBpm: 0 },
  vtMono: { atria: 'sinus', av: 'conducted', focus: 'vt', escape: 'none', rateDrives: 'focus', rateRange: [120, 250], defaultRateBpm: 170, escapeTemplate: 'wide', backupEscapeBpm: 0 },
  asystole: { atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
};

export const RHYTHM_IDS = Object.keys(RHYTHMS) as RhythmId[];

/** Dissociated atria (CHB, VT) run at their own rate (RhythmOpts.atrialRateBpm, default 80) [ENG]. */
export const DEFAULT_DISSOCIATED_ATRIAL_BPM = 80;
/** Flutter atrial rate default (brief §5: 250–350). */
export const DEFAULT_FLUTTER_ATRIAL_BPM = 300;
