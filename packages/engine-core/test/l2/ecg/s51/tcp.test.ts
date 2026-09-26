import { describe, expect, it } from 'vitest';
import { run5, samples5 } from '../../../helpers/s5.ts';

const tcp = (mode: 'demand' | 'fixed', mA: number) => ({ tcp: { mode, ratePpm: 70, mA, thresholdMa: 70 } });

describe('Stage 5.1 transcutaneous pacing (measured)', () => {
  it('R30: demand pacing at 70 ppm with capture delivers 70 ± 1 pulses/min when there are no intrinsic beats; a sinus 80 inhibits it', () => {
    for (const mode of ['demand', 'fixed'] as const) {
      const r = run5('asystole', 62, { mods: tcp(mode, 90) });
      const spikes = r.markers.filter((m) => m.t >= 2 && m.t < 62);
      expect(Math.abs(spikes.length - 70)).toBeLessThanOrEqual(1);
      expect(spikes.every((m) => m.data?.captured === true && m.data?.tcp === true)).toBe(true);
      expect(r.beats.filter((b) => b.origin === 'paced' && b.t >= 2 && b.t < 62).length).toBe(spikes.length);
    }
    expect(run5('sinus', 60, { hr: 80, mods: tcp('demand', 90) }).markers.filter((m) => m.t > 5)).toEqual([]);
  });

  it('pulse artefact: a tall short spike (≥ 2 mV in II and V1 at 50 mA, FWHM ≤ 12 ms) with an opposite-polarity tail', () => {
    const r = samples5('asystole', 12, ['ecgII', 'V1'], { mods: { artefact: { noise: 0 }, ...tcp('fixed', 50) } });
    const s = r.markers.find((m) => m.t > 5)!;
    for (const l of ['ecgII', 'V1'] as const) {
      const x = r.lead[l]!;
      const i0 = Math.round(s.t * 500);
      let pi = i0;
      for (let i = i0 - 5; i < i0 + 25; i++) if (Math.abs(x[i]!) > Math.abs(x[pi]!)) pi = i;
      const pk = x[pi]!;
      let a = pi;
      let b = pi;
      while (Math.abs(x[a - 1]!) >= Math.abs(pk) / 2) a--;
      while (Math.abs(x[b + 1]!) >= Math.abs(pk) / 2) b++;
      expect(Math.abs(pk)).toBeGreaterThanOrEqual(2);
      expect((b - a + 1) * 2).toBeLessThanOrEqual(12);
      let tail = 0;
      for (let i = i0 + 15; i < i0 + 150; i++) tail = Math.min(tail, x[i]! * Math.sign(pk));
      expect(tail).toBeLessThan(-0.1);
    }
  });

  it('no capture: spike only — the underlying rhythm and every sample outside [spike − 25 ms, spike + 400 ms] are unchanged', () => {
    const on = samples5('sinusBrady', 30, ['ecgII'], { seed: 3, mods: tcp('fixed', 50) });
    const off = samples5('sinusBrady', 30, ['ecgII'], { seed: 3 });
    expect(on.markers.length).toBeGreaterThan(30);
    expect(on.markers.every((m) => m.data?.captured === false)).toBe(true);
    expect(on.beats.map((b) => [b.t, b.origin])).toEqual(off.beats.map((b) => [b.t, b.origin]));
    const sp = on.markers.map((m) => m.t);
    for (let i = 0; i < 15000; i++) {
      const t = i / 500;
      if (sp.some((s) => t > s - 0.025 && t < s + 0.4)) continue;
      expect(on.lead.ecgII![i]).toBe(off.lead.ecgII![i]);
    }
  });
});
