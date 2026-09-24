// `traditional` profile, Philips-like (research 05 §2.5 [S2]): high = a high-pitched sound once a second, medium =
// a lower-pitched sound every 2 s, INOP tone every 2 s. Pulse lengths and pitches are not published [assumed].
import type { AlarmSoundProfile } from './types.ts';

export const TRADITIONAL: AlarmSoundProfile = {
  id: 'traditional',
  label: 'Traditional (Philips-like)',
  claim: 'Traditional Philips-like cadence from the IntelliVue manual; pulse length and pitch assumed.',
  levels: {
    L1: { pulseMs: 200, freqHz: 988, gapsMs: [], repeatS: 1, levelDb: 0 },
    L2: { pulseMs: 200, freqHz: 660, gapsMs: [], repeatS: 2, levelDb: -4 },
    L3: { pulseMs: 150, freqHz: 523, gapsMs: [], repeatS: 2, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 0, max: 10, default: 5, dbPerStep: 3, maxGain: 0.5 },
  silence: { durationS: 90, cancelOnNewAlarm: false },
  provenance: {
    'levels.L1.repeatS': { tag: 'documented', source: 'research/05 §2.5 (once a second); brief §6.4' },
    'levels.L2.repeatS': { tag: 'documented', source: 'research/05 §2.5 (every 2 s); brief §6.4' },
    'levels.L3.repeatS': { tag: 'documented', source: 'research/05 §2.5 (INOP tone every 2 s)' },
    'levels.L1.gapsMs': { tag: 'documented', source: 'research/05 §2.5 (one sound per repeat)' },
    'levels.L2.gapsMs': { tag: 'documented', source: 'research/05 §2.5' },
    'levels.L3.gapsMs': { tag: 'documented', source: 'research/05 §2.5' },
    'levels.L1.pulseMs': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L2.pulseMs': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L3.pulseMs': { tag: 'assumed', source: 'research/05 §2.5', note: 'one-star alarms are shorter' },
    'levels.L1.freqHz': { tag: 'assumed', source: 'research/05 §2.5 (high-pitched)' },
    'levels.L2.freqHz': { tag: 'assumed', source: 'research/05 §2.5 (lower-pitched)' },
    'levels.L3.freqHz': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L1.levelDb': { tag: 'eng', source: 'brief §6.4' },
    'levels.L2.levelDb': { tag: 'eng', source: 'brief §6.4' },
    'levels.L3.levelDb': { tag: 'eng', source: 'brief §6.4' },
    harmonicsDb: { tag: 'eng', source: 'brief §6.4' },
    rampMs: { tag: 'eng', source: 'brief §6.4' },
    volume: { tag: 'documented', source: 'brief §6.4 (0–10)', note: 'curve [ENG]' },
    silence: { tag: 'documented', source: 'brief §6.4' },
  },
};
