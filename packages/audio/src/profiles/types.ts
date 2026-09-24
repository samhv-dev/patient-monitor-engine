// Alarm sound profiles as DATA (brief §3.6, §6.4, §6.4.1). A skin names its profile (`alarms.soundProfile`) and may
// override `repeatS` per level and the low-priority pulse count; everything else about the sound lives here.
// Levels are 1..3, 1 = highest (the IEC "high/medium/low" and Saadat "1/2/3" are display names only).

export type AlarmLevel = 1 | 2 | 3;
export type LevelKey = 'L1' | 'L2' | 'L3';
export const levelKey = (l: AlarmLevel): LevelKey => `L${l}` as LevelKey;

export interface ProvEntry {
  tag: 'documented' | 'measured' | 'assumed' | 'unverified' | 'conflict' | 'inferred' | 'eng';
  source: string;
  note?: string;
}

/** One level's burst: `gapsMs[i]` is the silence between pulse i's end and pulse i+1's start (pulses = gaps + 1). */
export interface LevelSound {
  pulseMs: number;
  freqHz: number;
  gapsMs: number[];
  /** Burst-start to burst-start (s); null = sounds once and does not repeat. */
  repeatS: number | null;
  /** Level relative to L1 (dB), so priorities are 3–6 dB apart (brief §6.4). */
  levelDb: number;
}

export interface VolumeCurve {
  min: number;
  max: number;
  default: number;
  /** Loudness change per volume step (dB); the gain at `max` is `maxGain`, step `min` of 0 means silent. */
  dbPerStep: number;
  maxGain: number;
}

export interface AlarmSoundProfile {
  id: 'iec-style' | 'traditional' | 'saadat';
  label: string;
  /** What we claim (and don't): shown in the demo next to the profile. */
  claim: string;
  levels: Record<LevelKey, LevelSound>;
  /** Harmonics 1..n of every pulse, dB relative to the fundamental (brief §6.4 PeriodicWave). */
  harmonicsDb: number[];
  /** Linear attack and release (ms); IEC Amd 1 requires ≥ 10 ms (brief §6.4). */
  rampMs: number;
  volume: VolumeCurve;
  silence: { durationS: number; cancelOnNewAlarm: boolean };
  provenance: Record<string, ProvEntry>;
}

/** Per-skin overrides (skin `alarms.repeatS`, `alarms.lowPulses`, `alarms.volume`, `alarms.silence`). */
export interface ProfileOverrides {
  repeatS?: Partial<Record<LevelKey, number | null>>;
  lowPulses?: 1 | 2 | null;
  volume?: { min: number; max: number; default: number };
  silence?: { durationS: number; cancelOnNewAlarm: boolean };
}
