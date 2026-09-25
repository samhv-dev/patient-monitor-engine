// Impedance RR and its cardiogenic-ripple failure mode (brief §4.7; research 03 §7), pleth-derived RR.
import { describe, expect, it } from 'vitest';
import { createImpNum, impedanceSample, impRr, impStep, plethRr } from '../../../src/l3/resp/impedance.ts';

describe('impedance respiration', () => {
  it('counts 15 breaths/min from chest volume, and raises apnoea 20 s after breathing stops', () => {
    const st = createImpNum();
    let apnoea = -1;
    for (let m = 0; m < 62.5 * 90; m++) {
      const t = m / 62.5;
      const vol = t < 50 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, []), 1 / 62.5) === 'apnoea') apnoea = t;
      if (Math.abs(t - 45) < 1e-9) expect(impRr(st, t).value).toBe(15);
    }
    expect(apnoea).toBeGreaterThan(65);
    expect(apnoea).toBeLessThan(72);
  });
  it('a 20 % cardiogenic ripple at HR 80 is counted once breaths vanish (the apnoea alarm is postponed); 10 % is not', () => {
    const st = createImpNum();
    const beats: number[] = [];
    let apnoea = false;
    for (let m = 0; m < 62.5 * 120; m++) {
      const t = m / 62.5;
      if (beats.length === 0 || t - beats[beats.length - 1]! >= 0.75) beats.push(t);
      const vol = t < 30 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, beats.slice(-3), 0.2), 1 / 62.5) === 'apnoea') apnoea = true;
    }
    expect(apnoea).toBe(false);
    expect(impRr(st, 120).value).toBeGreaterThan(60);
    const q = createImpNum();
    let alarm = -1;
    for (let m = 0; m < 62.5 * 60; m++) {
      const t = m / 62.5;
      const vol = t < 10 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(q, t, impedanceSample(vol, t, beats.filter((b) => b <= t).slice(-3)), 1 / 62.5) === 'apnoea') alarm = t;
    }
    expect(alarm).toBeGreaterThan(25);
    expect(alarm).toBeLessThan(32);
  });
  it('pleth-derived RR from the pulse-amplitude modulation', () => {
    const beats = Array.from({ length: 80 }, (_, i) => ({ t: i * 0.75, amp: 1 + 0.1 * Math.sin((2 * Math.PI * i * 0.75) / 5) }));
    expect(plethRr(beats, 60)).toBeCloseTo(12, 0);
  });
});
