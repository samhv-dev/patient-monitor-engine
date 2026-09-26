// Charge time and the TCP modifier as pure functions (brief §6.5; research/05 §2.6).
import { describe, expect, it } from 'vitest';
import { chargeTimeS, CHARGE_S_PER_J, FALLBACK_DEFIB } from '../../../src/l3/defib-pacer/defib.ts';
import { createPacer, FALLBACK_PACER, NO_CAPTURE_MA, tcpSpec, validatePacer } from '../../../src/l3/defib-pacer/pacer.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';

describe('defibrillator charge time', () => {
  const lp = deviceProfile('lifepak-like').defib!;
  it('LIFEPAK-like table: 200 J 7 s, 360 J 10 s, interpolated between, proportional below', () => {
    expect(chargeTimeS(lp, 200)).toBe(7);
    expect(chargeTimeS(lp, 360)).toBe(10);
    expect(chargeTimeS(lp, 280)).toBeCloseTo(8.5, 10);
    expect(chargeTimeS(lp, 100)).toBeCloseTo(3.5, 10);
  });
  it('no published table (ZOLL-like, fallback): 7 s per 200 J', () => {
    expect(chargeTimeS(FALLBACK_DEFIB, 120)).toBeCloseTo(120 * CHARGE_S_PER_J, 10);
  });
});

describe('pacer → Modifiers.tcp', () => {
  const p = createPacer(FALLBACK_PACER);
  it('off → null; demand stays demand; failureToSense and leads-off force fixed; failureToCapture sets an unreachable threshold', () => {
    expect(tcpSpec(p, FALLBACK_PACER, 70, false)).toBeNull();
    const on = { ...p, mode: 'demand' as const, mA: 80 };
    expect(tcpSpec(on, FALLBACK_PACER, 70, false)).toEqual({ mode: 'demand', ratePpm: 70, mA: 80, thresholdMa: 70 });
    expect(tcpSpec({ ...on, fault: 'failureToSense' }, FALLBACK_PACER, 70, false)?.mode).toBe('fixed');
    expect(tcpSpec(on, FALLBACK_PACER, 70, true)?.mode).toBe('fixed');
    expect(tcpSpec({ ...on, fault: 'failureToCapture' }, FALLBACK_PACER, 70, false)?.thresholdMa).toBe(NO_CAPTURE_MA);
  });
  it('PAUSE: LIFEPAK-like 25 % of the rate; ZOLL-like output 0 mA', () => {
    const lp = deviceProfile('lifepak-like').pacer!;
    const on = { ...createPacer(lp), mode: 'fixed' as const, ratePpm: 80, mA: 100, paused: true };
    expect(tcpSpec(on, lp, 70, false)).toMatchObject({ ratePpm: 20, mA: 100 });
    expect(tcpSpec(on, FALLBACK_PACER, 70, false)).toMatchObject({ ratePpm: 80, mA: 0 });
  });
  it('validates rate and output against the skin ranges', () => {
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 200 }, FALLBACK_PACER)).toMatch(/ratePpm/);
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'fixed', mA: 150 }, FALLBACK_PACER)).toMatch(/mA/);
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'demand', ratePpm: 60, mA: 70 }, FALLBACK_PACER)).toBeUndefined();
  });
});
