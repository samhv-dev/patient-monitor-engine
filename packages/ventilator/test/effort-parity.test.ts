// Brief 93: the ventilator link has ONE effort waveform. The engine's own ventilator shapes the patient's Pmus with
// constants that are this package's DEFAULT_CONFIG (the v1.9 port, bit-exact on its ten reference scenarios), so a patient
// handed between the cockpit and the engine makes the same effort on both — this pins them equal, so they cannot drift.
import { describe, expect, it } from 'vitest';
import { LINK_PMUS_DECAY_S, LINK_PMUS_GAIN, LINK_PMUS_HOLD_S, LINK_PMUS_RISE_S, linkEffortShape } from '../../engine-core/src/l2/resp/driver.ts';
import { DEFAULT_CONFIG, pmusValue } from '../src/index.ts';

describe('the ventilator link has one effort waveform (brief 93)', () => {
  it('the engine uses the cockpit\'s timings, shapes and gain', () => {
    expect([LINK_PMUS_RISE_S, LINK_PMUS_HOLD_S, LINK_PMUS_DECAY_S]).toEqual([DEFAULT_CONFIG.pmusRise, DEFAULT_CONFIG.pmusHold, DEFAULT_CONFIG.pmusDecay]);
    expect(DEFAULT_CONFIG.riseShape).toBe('smoothstep');
    expect(DEFAULT_CONFIG.decayShape).toBe('halfcos');
    expect(LINK_PMUS_GAIN).toBeCloseTo(0.4 + 0.6 * (DEFAULT_CONFIG.responsiveness / 100), 12);
  });
  it('sample by sample, the engine\'s waveform is the cockpit\'s pmusValue for the same effort', () => {
    const c = { ...DEFAULT_CONFIG, pmus: 8 };
    const peak = LINK_PMUS_GAIN * 8;
    for (let t = -0.1; t <= 0.9; t += 0.01) expect(peak * linkEffortShape(t)).toBeCloseTo(pmusValue(c, t), 9);
  });
});
