// Brief 93: the ventilator link has ONE effort waveform. The engine's own ventilator shapes the patient's Pmus with
// constants that are this package's DEFAULT_CONFIG (the v1.9 port, bit-exact on its ten reference scenarios), so a patient
// handed between the cockpit and the engine makes the same effort on both — this pins them equal, so they cannot drift.
import { describe, expect, it } from 'vitest';
import { LINK_PMUS_DECAY_S, LINK_PMUS_GAIN, LINK_PMUS_HOLD_S, LINK_PMUS_RISE_S, linkEffortShape } from '../../engine-core/src/l2/resp/driver.ts';
import { effortTriggers, TRIGGER_CMH2O, TRIGGER_FLOW_LPM } from '../../engine-core/src/l2/resp/pipeline.ts';
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
  it('the trigger is the cockpit\'s: the trapped-gas pressure first, then its own flow threshold', () => {
    expect([TRIGGER_FLOW_LPM, TRIGGER_CMH2O]).toEqual([DEFAULT_CONFIG.flowTrig, -DEFAULT_CONFIG.presTrig]);
    expect(DEFAULT_CONFIG.trigType).toBe('flow');
    // the cockpit's own expression, net = max(0, Pmus − autoPEEP), read by the flow threshold
    const cockpit = (pmus: number, autoPeep: number, r: number) => ((Math.max(0, pmus - autoPeep) / Math.max(2, r)) * 60) >= DEFAULT_CONFIG.flowTrig;
    for (const [pmus, ap, r] of [[0.4, 0, 10], [0.3, 0, 10], [4, 3.9, 10], [4, 2, 10], [1, 0, 30], [2, 0, 30], [0.5, 0.5, 10]] as const) {
      expect(effortTriggers(pmus, ap, r), `Pmus ${pmus}, autoPEEP ${ap}, R ${r}`).toBe(cockpit(pmus, ap, r));
    }
    expect(effortTriggers(0.4, 0, 10)).toBe(true); // a small effort against a normal airway does trigger
    expect(effortTriggers(4, 3.9, 10)).toBe(false); // the same effort wasted on trapped gas does not
  });
});
