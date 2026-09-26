import { describe, expect, it } from 'vitest';
import { jPointS, leadOf } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';


const base = morphBeat({});
const J = jPointS(base);
const beat = morphBeat;

describe('electrolytes and temperature', () => {
  it('acceptance 7 — hyperK from 5 to 8.5: peaked T → PR↑ → QRS↑ → sine wave, in that order', () => {
    const tAmp = (k: number[]) => kernelLead(k, 'ecgII', tPeakOf(k));
    const pr = (K: number) => run5('sinus', 5, { hr: 70, mods: { hrvScale: 0, k: K } }).beats.at(-1)!.prMs!;
    // Sine wave: no ST segment left — the T peak sits within 60 ms of the (widened) QRS end.
    const sine = (k: number[]) => tPeakOf(k) - jPointS(k);
    const b0 = { t: tAmp(base), pr: pr(4.2), qrs: qrsSpanMs(base) };
    const first: Record<string, number> = {};
    for (let K = 5; K <= 8.5 + 1e-9; K += 0.1) {
      const k = beat({ k: K });
      const hit = {
        t: tAmp(k) >= 1.3 * b0.t,
        pr: pr(K) >= b0.pr + 10,
        qrs: qrsSpanMs(k) >= 1.15 * b0.qrs,
        sine: sine(k) <= 0.06,
      };
      for (const [n, v] of Object.entries(hit)) if (v && first[n] === undefined) first[n] = K;
    }
    expect(first.t!).toBeLessThan(first.pr!);
    expect(first.pr!).toBeLessThan(first.qrs!);
    expect(first.qrs!).toBeLessThan(first.sine!);
    expect(first.sine!).toBeLessThanOrEqual(8.5);
  });

  it('hypoK 2.5: U wave ≥ 0.1 mV and taller than T in II and V2', () => {
    const k = beat({ k: 2.5 });
    const uAt = kernelQtMs(k) / 1000 + 0.07;
    const tAt = tPeakOf(k);
    for (const l of ['ecgII', 'V2'] as const) {
      expect(kernelLead(k, l, uAt)).toBeGreaterThanOrEqual(0.1);
      expect(kernelLead(k, l, uAt)).toBeGreaterThan(kernelLead(k, l, tAt));
    }
  });

  it('hypothermia 28 °C: Osborn J 0.5 mV in V3 (Stage 5.1: 0.1 mV/°C below 33 °C), largest in V3–V4; none at 36 °C', () => {
    const jOf = (k: number[]) => {
      for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.J) return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
      return null;
    };
    expect(jOf(beat({ tempC: 36 }))).toBeNull();
    const v = jOf(beat({ tempC: 28 }))!;
    expect(leadOf(v, 'V3')).toBeCloseTo(0.5, 3);
    for (const l of ['ecgII', 'V1', 'V6', 'ecgI'] as const) expect(leadOf(v, l)).toBeLessThan(leadOf(v, 'V4') + 1e-9);
  });
});
