import { describe, expect, it } from 'vitest';
import { dominantHz, rms, welch } from '../../../../src/util/dsp.ts';
import { RAIL_MV, shockResponse } from '../../../../src/l2/ecg/artefacts/front-end.ts';
import { samples5 } from '../../../helpers/s5.ts';
import type { LeadId } from '../../../../src/types.ts';

const off = { noise: 0 };
const peakNear = (x: Float64Array, f0: number, tol: number, nfft = 4096) => {
  const { f, p } = welch(x, 500, nfft);
  let best = 0;
  let bf = 0;
  for (let k = 0; k < p.length; k++) if (Math.abs(f[k]! - f0) <= tol && p[k]! > best) { best = p[k]!; bf = f[k]!; }
  const band = Array.from(p).filter((_, k) => f[k]! >= 0.5 && f[k]! <= 20).sort((a, b) => a - b);
  return { f: bf, ratio: best / band[Math.floor(band.length / 2)]! };
};

describe('body artefacts (VCG)', () => {
  it('acceptance 4 — CPR artefact: fundamental at the compression rate and lines at h·f_c for h = 1…8', () => {
    for (const rateCpm of [100, 120]) {
      const r = samples5('asystole', 40, ['ecgII'], { mods: { artefact: { ...off, cpr: { rateCpm, depth: 0.5 } } } });
      const x = r.lead.ecgII!.subarray(5000);
      const fc = rateCpm / 60;
      expect(Math.abs(dominantHz(x, 500, 0.5, 3, 4096) - fc)).toBeLessThanOrEqual(0.05 * fc);
      for (let h = 1; h <= 8; h++) expect(peakNear(x, h * fc, 0.06 * h * fc).ratio).toBeGreaterThan(5);
      const a = rms(x) * 2 * Math.SQRT2;
      expect(a / 1.1).toBeGreaterThan(0.85); // depth 0.5 → 0.2 + 1.8·0.5 = 1.1 mV
      expect(a / 1.1).toBeLessThan(1.2);
    }
  });

  it('EMG 0.02–0.2 mV RMS (level 0.1 → 1), band 20–150 Hz; shiver has a 4–8 Hz envelope; wander 0.1–0.5 Hz', () => {
    const emg = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 1 } } }).lead.ecgII!;
    const hp = emg.map((v, i) => (i > 0 ? v - emg[i - 1]! : 0)); // first difference: removes the slow respiratory wander
    expect(rms(hp)).toBeGreaterThan(0.1);
    const lo = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 0.1 } } }).lead.ecgII!;
    expect(rms(lo.map((v, i) => (i > 0 ? v - lo[i - 1]! : 0))) / rms(hp)).toBeCloseTo(0.1, 1);
    const shiver = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, shiver: 1 } } }).lead.ecgII!;
    const e = shiver.map((v, i) => (i > 0 ? Math.abs(v - shiver[i - 1]!) : 0));
    expect(dominantHz(e, 500, 2, 10, 4096)).toBeCloseTo(6, 0);
    const w = samples5('asystole', 60, ['ecgII'], { mods: { rsa: 0, artefact: { ...off, wander: 1 } } }).lead.ecgII!;
    const fw = dominantHz(w, 500, 0.05, 1, 8192);
    expect(fw).toBeGreaterThanOrEqual(0.1);
    expect(fw).toBeLessThanOrEqual(0.5);
  });
});

describe('front-end artefacts (per lead)', () => {
  it('mains: spectral peak at 50 Hz (or 60 Hz) with a 3rd harmonic, amplitude ≤ 0.5 mV, differing by lead', () => {
    for (const mainsHz of [50, 60] as const) {
      const r = samples5('sinus', 10, ['ecgII', 'V1'], { mainsHz, mods: { artefact: { ...off, mains: 1 } } });
      expect(dominantHz(r.lead.ecgII!, 500, 30, 240, 2048)).toBeCloseTo(mainsHz, 0);
      expect(peakNear(r.lead.ecgII!, 3 * mainsHz > 250 ? 500 - 3 * mainsHz : 3 * mainsHz, 1, 2048).ratio).toBeGreaterThan(5);
    }
    const r = samples5('asystole', 4, ['ecgII', 'V1'], { mods: { rsa: 0, artefact: { ...off, mains: 1 } } });
    expect(Math.max(...r.lead.ecgII!.map(Math.abs))).toBeLessThanOrEqual(0.5 * 1.4 * 1.3 + 0.1);
    expect(rms(r.lead.ecgII!)).not.toBeCloseTo(rms(r.lead.V1!), 2);
  });

  it('lead-off: every lead flat, technical alarm raised then cleared', () => {
    const r = samples5('sinus', 6, ['ecgII', 'V5'], { mods: { artefact: { leadOff: true } } });
    expect(Math.max(...r.lead.ecgII!.map(Math.abs))).toBe(0);
    const al = r.records.filter((e) => e.type === 'alarm');
    expect(al[0]).toMatchObject({ id: 'ecgLeadsOff', category: 'technical', state: 'raised' });
  });

  it('shock: rail saturation 50–500 ms, per-lead different recovery, baseline back (< 0.05 mV offset) within 5 s', () => {
    const leads: LeadId[] = ['ecgI', 'ecgII', 'ecgIII', 'V1', 'V5'];
    const r = samples5('asystole', 10, leads, { mods: { rsa: 0, artefact: { ...off, shock: { atS: 2, energyJ: 200 } } } });
    const resp = leads.map((l) => shockResponse(l, 2, 200));
    for (const [i, l] of leads.entries()) {
      const x = r.lead[l]!;
      const sat = resp[i]!.satS;
      expect(sat).toBeGreaterThanOrEqual(0.05);
      expect(sat).toBeLessThanOrEqual(0.5);
      expect(Math.abs(x[Math.round((2 + sat / 2) * 500)]!)).toBe(RAIL_MV);
      const base = samples5('asystole', 10, [l], { mods: { rsa: 0, artefact: off } }).lead[l]!;
      expect(Math.abs(x[Math.round(7 * 500)]! - base[Math.round(7 * 500)]!)).toBeLessThan(0.05);
    }
    expect(new Set(resp.map((q) => q.tauS.toFixed(3))).size).toBeGreaterThan(2);
  });

  it('electrosurgery: saturating broadband burst for its duration only', () => {
    const r = samples5('sinus', 6, ['ecgII'], { mods: { artefact: { ...off, electrosurgery: { atS: 2, durationS: 2 } } } });
    const x = r.lead.ecgII!;
    expect(rms(x.subarray(2.1 * 500, 3.9 * 500))).toBeGreaterThan(2);
    expect(rms(x.subarray(4.2 * 500, 5.8 * 500))).toBeLessThan(0.6);
  });
});
