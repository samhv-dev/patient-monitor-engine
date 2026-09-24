import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../src/l1/ramp.ts';
import { createL1State, l1Flags, l1Value, pinVar, releaseVar, setL1Target, STATE_SCHEMA, validateTarget } from '../../src/l1/state.ts';

describe('l1/state (brief §4.9 PatientState, MANUAL)', () => {
  it('starts from the schema defaults, overridden by the profile baseline', () => {
    const st = createL1State({ baseline: { sbp: 140 } });
    expect(l1Value(st, 'sbp', 0)).toBe(140);
    expect(l1Value(st, 'dbp', 0)).toBe(STATE_SCHEMA.dbp.def);
    expect(l1Value(st, 'volumeStatus', 0)).toBe(1);
  });

  it('setTarget ramps from the CURRENT value, also mid-ramp', () => {
    const st = createL1State();
    setL1Target(st, 'sbp', 10, 90, { durationS: 30 });
    expect(l1Value(st, 'sbp', 25)).toBeCloseTo(105, 9);
    setL1Target(st, 'sbp', 25, 120, { durationS: 10 });
    expect(l1Value(st, 'sbp', 25)).toBeCloseTo(105, 9);
    expect(l1Value(st, 'sbp', 35)).toBe(120);
  });

  it('validates range, stage and MANUAL role', () => {
    expect(validateTarget('sbp', 90, { durationS: 30 })).toBeUndefined();
    expect(validateTarget('sbp', 400, undefined)).toMatch(/0–300/);
    expect(validateTarget('spo2', 90, undefined)).toMatch(/Stage 3/);
    expect(validateTarget('svr', 1.2, undefined)).toMatch(/derived/);
    expect(validateTarget('dbp', 50, { durationS: 1000 })).toMatch(/0–900/);
  });

  it('flags: override > pinned > ramping', () => {
    const st = createL1State();
    setL1Target(st, 'sbp', 0, 90, { durationS: 30 });
    setL1Target(st, 'cvp', 0, 10, { durationS: 30 });
    pinVar(st, 'cvp');
    const f = l1Flags(st, 5, constantRamp(75), ['dbp']);
    expect(f).toEqual({ sbp: 'ramping', cvp: 'pinned', dbp: 'override' });
    releaseVar(st, 'all');
    expect(l1Flags(st, 40, constantRamp(75), [])).toEqual({});
  });
});
