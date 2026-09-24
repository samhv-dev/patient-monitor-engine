import { describe, expect, it } from 'vitest';
import { jPointS } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { ST_TERRITORIES } from '../../../../src/l2/ecg/morphology/st.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';
import type { LeadId } from '../../../../src/types.ts';


const base = morphBeat({});
const J = jPointS(base);
const beat = morphBeat;
const st60 = (k: number[], lead: LeadId) => kernelLead(k, lead, J + 0.06) - kernelLead(base, lead, J + 0.06);

describe('ST/T modifiers (acceptance 6)', () => {
  it('anterior STEMI 2 mm: V2–V3 +0.1–0.4 mV, reciprocal depression in III/aVF', () => {
    const k = beat({ st: { territory: 'anterior', mm: 2 } });
    for (const l of ['V2', 'V3'] as const) {
      expect(st60(k, l)).toBeGreaterThanOrEqual(0.1);
      expect(st60(k, l)).toBeLessThanOrEqual(0.4);
    }
    expect(st60(k, 'ecgIII')).toBeLessThan(-0.05);
    expect(st60(k, 'aVF')).toBeLessThan(-0.05);
  });

  it('inferior STEMI: II/III/aVF up, aVL and I down', () => {
    const k = beat({ st: { territory: 'inferior', mm: 2 } });
    for (const l of ['ecgII', 'ecgIII', 'aVF'] as const) expect(st60(k, l)).toBeGreaterThan(0.1);
    expect(st60(k, 'aVL')).toBeLessThan(-0.05);
    expect(st60(k, 'ecgI')).toBeLessThan(0);
  });

  it.each(Object.keys(ST_TERRITORIES))('%s: ST(J+60) in the measuring lead = ±mm·0.1 mV', (territory) => {
    const t = ST_TERRITORIES[territory as keyof typeof ST_TERRITORIES];
    for (const mm of [1, 2.5, 4]) expect(st60(beat({ st: { territory: territory as never, mm } }), t.lead)).toBeCloseTo(t.sign * mm * 0.1, 3);
  });

  it('ischaemic depression −0.2 mV in II, V5 depressed, aVR elevated', () => {
    const k = beat({ ischaemicDepressionMv: -0.2 });
    expect(st60(k, 'ecgII')).toBeCloseTo(-0.2, 3);
    expect(st60(k, 'V5')).toBeLessThan(-0.1);
    expect(st60(k, 'aVR')).toBeGreaterThan(0.05);
  });

  it('T inversion 1: T peak negative in II; Brugada: coved V1–V2 ≥ 0.2 mV into a negative T; digoxin: scooped ST, short QT, flat T', () => {
    const tPeak = tPeakOf(base);
    expect(kernelLead(beat({ tInversion: 1 }), 'ecgII', tPeak)).toBeLessThan(-0.2);
    const b = beat({ brugada1: true });
    for (const l of ['V1', 'V2'] as const) {
      expect(kernelLead(b, l, J + 0.01) - kernelLead(base, l, J + 0.01)).toBeGreaterThanOrEqual(0.2);
      expect(kernelLead(b, l, tPeak)).toBeLessThan(0);
    }
    expect(Math.abs(kernelLead(b, 'V5', J + 0.01) - kernelLead(base, 'V5', J + 0.01))).toBeLessThan(0.08);
    const d = beat({ digoxin: true });
    expect(kernelLead(d, 'ecgII', J + 0.09) - kernelLead(base, 'ecgII', J + 0.09)).toBeLessThan(-0.05);
    expect(kernelQtMs(d)).toBeLessThan(0.92 * kernelQtMs(base));
  });

  it('long QT: QTc ≥ 520 and a notched (two-kernel) T', () => {
    const { beats, st } = run5('sinus', 10, { hr: 60, mods: { hrvScale: 0, longQT: true } });
    expect(beats.at(-1)!.qtMs).toBeGreaterThanOrEqual(515);
    const tKernels = st.events.at(-1)!.k.filter((_, i) => i % K_STRIDE === 6).filter((w) => w === WAVE.T);
    expect(tKernels.length).toBe(2);
  });
});
