import { describe, expect, it } from 'vitest';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';
import { K_STRIDE, WAVE, diffs, mean, run5, sd } from '../../../helpers/s5.ts';

/** Signed lead-II amplitude of the largest R kernel of every QRS event, in beat order. */
function rAmpII(st: ReturnType<typeof run5>['st']): number[] {
  const ev = st.events.filter((e) => { for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === WAVE.R) return true; return false; }).sort((a, b) => a.t - b.t);
  return ev.map((e) => {
    let best = 0;
    for (let i = 0; i < e.k.length; i += K_STRIDE) {
      if (e.k[i + 6] !== WAVE.R) continue;
      const v = projectLead('ecgII', e.k[i + 3]!, e.k[i + 4]!, e.k[i + 5]!);
      if (Math.abs(v) > Math.abs(best)) best = v;
    }
    return best;
  });
}

describe('Stage 5 rhythms: ventricular and arrest', () => {
  it('idioventricular 20–40 and aivr 40–120: wide, regular, AV dissociation in AIVR', () => {
    const ivr = run5('idioventricular', 120);
    const r1 = 60 / mean(diffs(ivr.beats.map((b) => b.t)));
    expect(r1).toBeGreaterThanOrEqual(20);
    expect(r1).toBeLessThanOrEqual(40);
    expect(ivr.atrial.length).toBe(0);
    expect(ivr.beats.every((b) => b.qrsMs >= 120 && b.mech.kSV === 0.7)).toBe(true);
    const a = run5('aivr', 60);
    const r2 = 60 / mean(diffs(a.beats.map((b) => b.t)));
    expect(r2).toBeGreaterThanOrEqual(40);
    expect(r2).toBeLessThanOrEqual(120);
    expect(a.atrial.length).toBeGreaterThan(40);
    expect(a.atrial.every((p) => !p.conducted)).toBe(true);
    expect(a.beats.every((b) => b.origin === 'ventricular')).toBe(true);
  });

  it('vtPoly: 150–300/min, irregular, beat-to-beat changing QRS amplitude/axis', () => {
    const { beats, st } = run5('vtPoly', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(60 / mean(rr)).toBeLessThanOrEqual(300);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.04);
    const a = rAmpII(st);
    expect(sd(a) / mean(a.map(Math.abs))).toBeGreaterThan(0.3);
  });

  it('acceptance 3 — torsades: 200–250/min, twist period 5–20 beats (default 12)', () => {
    for (const twistBeats of [6, 12, 18]) {
      const { beats, st } = run5('torsades', 60, { rhythmOpts: { twistBeats } });
      const rate = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(rate).toBeGreaterThanOrEqual(195);
      expect(rate).toBeLessThanOrEqual(255);
      const a = rAmpII(st);
      const flips: number[] = [];
      for (let i = 1; i < a.length; i++) if (Math.sign(a[i]!) !== Math.sign(a[i - 1]!)) flips.push(i);
      const period = 2 * mean(diffs(flips));
      expect(period).toBeGreaterThanOrEqual(5);
      expect(period).toBeLessThanOrEqual(20);
      expect(Math.abs(period - twistBeats)).toBeLessThan(1.5);
    }
  });

  it('agonal: < 20/min, irregular, very wide (≥ 200 ms), decaying amplitude, no pulse', () => {
    const { beats, st } = run5('agonal', 300);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeLessThan(20);
    expect(sd(rr)).toBeGreaterThan(0.5);
    expect(beats.every((b) => b.qrsMs >= 200 && !b.mech.perfused)).toBe(true);
    const a = rAmpII(st).map(Math.abs);
    expect(a.at(-1)!).toBeLessThan(0.5 * a[0]!);
  });

  it('pWaveAsystole: P waves at ~50/min, no QRS', () => {
    const { beats, atrial } = run5('pWaveAsystole', 60);
    expect(beats.length).toBe(0);
    expect(atrial.length).toBeGreaterThanOrEqual(45);
    expect(atrial.length).toBeLessThanOrEqual(55);
  });

  it('PEA contract: pulseless on any organised rhythm → every beat perfused=false, kSV=0, svMl=0', () => {
    for (const id of ['sinus', 'sinusBrady', 'vtMono', 'junctionalEscape', 'avb3Wide'] as const) {
      const { beats } = run5(id, 30, { rhythmOpts: { pulseless: true } });
      expect(beats.length).toBeGreaterThan(5);
      expect(beats.every((b) => b.mech.perfused === false && b.mech.kSV === 0 && b.mech.svMl === 0)).toBe(true);
      const withPulse = run5(id, 30);
      expect(withPulse.beats.every((b) => b.mech.perfused)).toBe(true);
    }
  });
});
