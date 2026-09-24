// `saadat` profile (brief §6.4.1; research 06 §4.2, M p.47, 49): L1 "DO-DO-DO--DO-DO" (one 3+2 group of 5 pulses)
// every 10 s, L2 "DO-DO-DO" every 20 s, L3 "DO" every 30 s (it repeats, unlike IEC low). Pattern and repeat times
// are documented; pulse length, gaps and pitch are NOT published and are [assumed] until Ali's recordings.
import type { AlarmSoundProfile } from './types.ts';

const PULSE = 150; // [assumed]
const GAP = 100; // [assumed]
const LONG_GAP = 300; // the "--" in DO-DO-DO--DO-DO [assumed]
const PITCH = 880; // [assumed]

export const SAADAT: AlarmSoundProfile = {
  id: 'saadat',
  label: 'Saadat-like (B9 family)',
  claim: 'Saadat-like: patterns from the B9 manual; pulse timing and pitch assumed; Saadat claims no IEC 60601-1-8 conformance.',
  levels: {
    L1: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [GAP, GAP, LONG_GAP, GAP], repeatS: 10, levelDb: 0 },
    L2: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [GAP, GAP], repeatS: 20, levelDb: -4 },
    L3: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [], repeatS: 30, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 1, max: 7, default: 1, dbPerStep: 22 / 6, maxGain: 0.5 },
  silence: { durationS: 120, cancelOnNewAlarm: true },
  provenance: {
    'levels.L1.gapsMs': { tag: 'assumed', source: 'brief §6.4.1; research/06 §4.2 (M p.47)', note: 'pattern documented; 100/300 ms gaps assumed' },
    'levels.L1.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L2.gapsMs': { tag: 'assumed', source: 'brief §6.4.1', note: '3 pulses documented; gaps assumed' },
    'levels.L2.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L3.gapsMs': { tag: 'documented', source: 'brief §6.4.1 (one pulse)' },
    'levels.L3.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L1.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L2.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L3.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L1.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7', note: 'pitch not published; 880 Hz assumed' },
    'levels.L2.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7' },
    'levels.L3.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7' },
    'levels.L1.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L2.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L3.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    harmonicsDb: { tag: 'eng', source: 'brief §6.4.1 (reuse the §6.4 PeriodicWave until recordings)' },
    rampMs: { tag: 'eng', source: 'brief §6.4' },
    'volume.min': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.49, 308)' },
    'volume.max': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2' },
    'volume.default': { tag: 'documented', source: 'brief §6.4.1 (factory 1)' },
    'volume.dbPerStep': { tag: 'documented', source: 'brief §6.4.1 (47–69 dB(A) at 1 m over 7 steps = 22/6 dB per step)' },
    'volume.maxGain': { tag: 'eng', source: 'ENG' },
    silence: { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.38–39, 50)' },
  },
};
