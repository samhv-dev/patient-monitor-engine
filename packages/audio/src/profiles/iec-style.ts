// `iec-style` profile (brief §6.4 burst table; research 05 §2.5 quoting the IEC 60601-1-8 Table 3/4 ranges via
// US 9,814,817 B2). Values are chosen INSIDE the quoted ranges; the profile is labelled IEC-style and no
// compliance is claimed (R12, brief §11 C7).
import type { AlarmSoundProfile } from './types.ts';

const TD_HIGH = 150; // t_d high, 75–200 ms
const X = 100; // x, 50–125 ms
const GROUP_GAP = 600; // silence between the two 5-pulse groups, 0.35–1.30 s [ENG: measured end-to-start]
const GROUP = [X, X, 2 * X + TD_HIGH, X]; // 3+2 rhythm inside one 5-pulse group

export const IEC_STYLE: AlarmSoundProfile = {
  id: 'iec-style',
  label: 'IEC-style (ISO) bursts',
  claim: 'IEC-style: timings chosen inside the published IEC 60601-1-8 ranges; not a compliance claim.',
  levels: {
    L1: { pulseMs: TD_HIGH, freqHz: 880, gapsMs: [...GROUP, GROUP_GAP, ...GROUP], repeatS: 10, levelDb: 0 },
    L2: { pulseMs: 200, freqHz: 660, gapsMs: [200, 200], repeatS: 20, levelDb: -4 },
    L3: { pulseMs: 200, freqHz: 523, gapsMs: [], repeatS: null, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 0, max: 10, default: 5, dbPerStep: 3, maxGain: 0.5 },
  silence: { durationS: 90, cancelOnNewAlarm: false },
  provenance: {
    'levels.L1': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: 't_d 150 (75–200), x 100 (50–125), groups 0.6 s (0.35–1.30), 10 s (2.5–15); 880 Hz [ENG]' },
    'levels.L2': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: 't_d 200, y 200 (125–250), 20 s (2.5–30); 660 Hz [ENG]' },
    'levels.L3': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: '1 pulse, 200 ms, not repeated (ZOLL); 523 Hz [ENG]' },
    'levels.L2.levelDb': { tag: 'eng', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L3.levelDb': { tag: 'eng', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    harmonicsDb: { tag: 'documented', source: 'brief §6.4 (harmonics 1–5 at 0/−3/−6/−9/−12 dB)' },
    rampMs: { tag: 'documented', source: 'brief §6.4 (15 ms; Amd 1 ≥ 10 ms)' },
    volume: { tag: 'documented', source: 'brief §6.4 (volume 0–10)', note: '3 dB/step, default 5 and max gain [ENG]' },
    silence: { tag: 'documented', source: 'brief §6.4 (silence 90 s)' },
  },
};
