import { describe, expect, it } from 'vitest';
import { beatKernels } from '../../../../src/l2/ecg/beat-templates.ts';
import { frontalAxisDeg, netArea, QRS_WAVES } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';


const base = morphBeat({});
const beat = morphBeat;

describe('conduction, axis and voltage modifiers', () => {
  it('RBBB kernel span 135–170 ms, R′ in V1 at 100 ms, S in I; LBBB span 145–175 ms, no septal q; wide beats untouched (morphology measured in s51/bbb.test.ts)', () => {
    const r = beat({ bbb: 'rbbb' });
    expect(qrsSpanMs(r)).toBeGreaterThanOrEqual(135);
    expect(qrsSpanMs(r)).toBeLessThanOrEqual(170);
    expect(kernelLead(r, 'V1', 0.1)).toBeGreaterThan(0.4);
    expect(kernelLead(r, 'ecgI', 0.1)).toBeLessThan(-0.1);
    const l = beat({ bbb: 'lbbb' });
    expect(qrsSpanMs(l)).toBeGreaterThanOrEqual(145);
    expect(qrsSpanMs(l)).toBeLessThanOrEqual(175);
    expect(l.filter((_, i) => i % K_STRIDE === 6).includes(WAVE.Q)).toBe(false);
    expect(qrsSpanMs(beat({ bbb: 'lbbb' }, 0, 'wide'))).toBe(qrsSpanMs(beatKernels('wide', 400))); // ventricular beats untouched
  });

  it.each([-60, -30, 0, 45, 90, 120, 170])('axisDeg %i → measured frontal axis within ±5°', (a) => {
    expect(Math.abs(frontalAxisDeg(beat({ axisDeg: a })) - a)).toBeLessThanOrEqual(5);
  });

  it('transitionLead 2 → earlier R/S transition than 5', () => {
    const tr = (k: number[]) => (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).findIndex((l) => netArea(k, l, QRS_WAVES) > 0);
    expect(tr(beat({ transitionLead: 2 }))).toBeLessThan(tr(beat({ transitionLead: 5 })));
  });

  it('low voltage 0.5 halves R in II; LVH Sokolow–Lyon S(V1)+R(V5) ≥ 3.5 mV; alternans 0.3 on odd beats', () => {
    const rII = (k: number[]) => Math.max(...[0.03, 0.04, 0.05].map((s) => kernelLead(k, 'ecgII', s)));
    expect(rII(beat({ lowVoltage: 0.5 })) / rII(base)).toBeCloseTo(0.5, 2);
    const lvh = beat({ lvh: true });
    const sv1 = -Math.min(...Array.from({ length: 50 }, (_, i) => kernelLead(lvh, 'V1', i / 500)));
    const rv5 = Math.max(...Array.from({ length: 50 }, (_, i) => kernelLead(lvh, 'V5', i / 500)));
    expect(sv1 + rv5).toBeGreaterThanOrEqual(3.5);
    expect(rII(beat({ alternans: 0.3 }, 1)) / rII(base)).toBeCloseTo(0.7, 2);
    expect(rII(beat({ alternans: 0.3 }, 2)) / rII(base)).toBeCloseTo(1, 6);
  });

  it('overrides: qrsMs, qtMs and prMs are drawn as requested', () => {
    expect(qrsSpanMs(beat({ overrides: { qrsMs: 140 } }))).toBeCloseTo(140, 0);
    const { beats } = run5('sinus', 10, { hr: 70, mods: { hrvScale: 0, overrides: { qtMs: 480, prMs: 240 } } });
    expect(beats.every((b) => b.qtMs === 480 && b.prMs === 240)).toBe(true);
  });
});
