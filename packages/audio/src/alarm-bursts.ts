// Pure burst geometry (no Web Audio): where each pulse of one burst starts, for a profile level with the skin's
// overrides applied, and the volume-step → gain curve. Times are REAL seconds (brief §3.6: alarm bursts keep
// real-time patterns when timeScale ≠ 1).
import { levelKey, type AlarmLevel, type AlarmSoundProfile, type LevelSound, type ProfileOverrides } from './profiles/types.ts';

export interface BurstPulse {
  /** Onset relative to the burst start (s). */
  offsetS: number;
  durS: number;
  freqHz: number;
}

/** The level's sound with skin overrides applied (repeat time; the 2-pulse low burst). */
export function levelSound(profile: AlarmSoundProfile, level: AlarmLevel, ov: ProfileOverrides = {}): LevelSound {
  const key = levelKey(level);
  const base = profile.levels[key];
  const out: LevelSound = { ...base, gapsMs: [...base.gapsMs] };
  const rep = ov.repeatS?.[key];
  if (rep !== undefined) out.repeatS = rep;
  if (level === 3 && ov.lowPulses === 2 && out.gapsMs.length === 0) out.gapsMs = [profile.levels.L2.gapsMs[0] ?? 200];
  return out;
}

export function burstPulses(ls: LevelSound): BurstPulse[] {
  const pulses: BurstPulse[] = [];
  let t = 0;
  for (let i = 0; i <= ls.gapsMs.length; i++) {
    pulses.push({ offsetS: t / 1000, durS: ls.pulseMs / 1000, freqHz: ls.freqHz });
    t += ls.pulseMs + (ls.gapsMs[i] ?? 0);
  }
  return pulses;
}

/** First onset to last offset (s). */
export function burstDurationS(ls: LevelSound): number {
  const p = burstPulses(ls);
  const last = p[p.length - 1] as BurstPulse;
  return last.offsetS + last.durS;
}

/** Linear gain for a volume step: maxGain at `max`, dbPerStep less per step below; a step of 0 is silent. */
export function volumeGain(v: AlarmSoundProfile['volume'], step: number): number {
  const s = Math.round(Math.min(v.max, Math.max(v.min, step)));
  if (s <= 0) return 0;
  return v.maxGain * 10 ** ((-(v.max - s) * v.dbPerStep) / 20);
}

/** dB → linear amplitude. */
export const dbToGain = (db: number): number => 10 ** (db / 20);
