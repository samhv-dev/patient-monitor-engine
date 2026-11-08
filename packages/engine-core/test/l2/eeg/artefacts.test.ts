// EEG E4 (plan §7 E4): what a real frontal electrode also sees — muscle (EMG), electrocautery, blinks, ECG pickup,
// electrode impedance and mains. Acceptance cells C18–C22 at the signal level (the device halves — an index falling,
// a flag on the epoch — belong to the readers, E5 on), by spectral analysis of generated samples.
import { describe, expect, it } from 'vitest';
import {
  artefactSample, BLINK_PER_MIN, BLINK_UV_MAX, BLINK_UV_MIN, createArtefacts, emgLevel, IMPEDANCE_LIMIT_KOHM, impedanceUnreliable,
  type ArtefactInputs,
} from '../../../src/l2/eeg/artefacts.ts';
import { agentMixOf, cortexStep } from '../../../src/l2/eeg/state.ts';
import { spectrumOf } from '../../../src/l2/eeg/spectra.ts';
import { createSynth, synthNext } from '../../../src/l2/eeg/synth.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import { argmaxIn, band, db, rms, welch } from '../../helpers/eeg-welch.ts';

const FS = 125;
/** Nothing active: a paralysed, unresponsive patient, good electrodes, no cautery, no mains, no pickup. */
const QUIET: ArtefactInputs = { tS: 0, t1: 0, lor: 1.5, arousal: 0, tube: false, electrosurgery: null, mains: 0, mainsHz: 50, impedanceKOhm: [2, 2, 2], ecgPickup: false, ecgMv: 0 };
const AWAKE: ArtefactInputs = { ...QUIET, t1: 1, lor: 0 };

function art(seconds: number, at: (n: number, tS: number) => Partial<ArtefactInputs>, base = QUIET, seed = 12): number[] {
  const a = createArtefacts(seedStream(seed, 'eeg-artefact'), FS);
  const out: number[] = [];
  for (let n = 0; n < seconds * FS; n++) out.push(artefactSample(a, { ...base, ...at(n, n / FS), tS: n / FS }));
  return out;
}
const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
function brain(seconds: number, propUgMl: number, seed = 13): number[] {
  const x = { ageY: 40, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37, hyp: { ...H0, gabaIv: 1000 * propUgMl }, mac: M0 };
  const s = spectrumOf(cortexStep(undefined, x, 1), agentMixOf(x));
  const g = createSynth(seedStream(seed, 'eeg'), FS, s);
  return Array.from({ length: seconds * FS }, () => synthNext(g, () => s));
}
/** A synthetic lead with a 1 mV Gaussian QRS (σ 10 ms) at each beat. */
const qrs = (hr: number) => (tS: number) => {
  const rr = 60 / hr;
  const d = tS - Math.round(tS / rr) * rr;
  return Math.exp(-(d * d) / (2 * 0.01 ** 2));
};

describe('EEG E4 artefacts', () => {
  it('nothing active: the artefact sum is exactly 0', () => {
    expect(art(10, () => ({})).every((v) => v === 0)).toBe(true);
  });

  it('C18 an awake patient given a relaxant: EMG goes to 0 with T1 (Ch36 p. 1148); blinks stop too', () => {
    expect(emgLevel(AWAKE)).toBeGreaterThan(0);
    expect(emgLevel({ ...AWAKE, t1: 0 })).toBe(0);
    const awake = welch(art(60, () => ({}), AWAKE), FS);
    const paralysed = art(60, () => ({}), { ...AWAKE, t1: 0 });
    expect(band(awake, 30, 60)).toBeGreaterThan(0);
    expect(paralysed.every((v) => v === 0)).toBe(true);
  });

  it('C19 emergence with the tube in: broadband EMG rises as responsiveness returns, more with the tube (Ch36 pp. 1133, 1142)', () => {
    let last = -1;
    for (const lor of [1.5, 1.0, 0.8, 0.5, 0.2]) {
      const e = emgLevel({ ...AWAKE, lor, tube: true });
      expect(e, `lor ${lor}`).toBeGreaterThanOrEqual(last);
      if (lor < 1) expect(e).toBeGreaterThan(emgLevel({ ...AWAKE, lor, tube: false }));
      last = e;
    }
    expect(last).toBeGreaterThan(emgLevel({ ...AWAKE, lor: 1.5, tube: true }));
    // noxious arousal under a light hypnotic: grimacing (Ch36 p. 1142)
    expect(emgLevel({ ...AWAKE, lor: 1.3, arousal: 0.8 })).toBeGreaterThan(emgLevel({ ...AWAKE, lor: 1.3 }));
    // broadband, its frontal peak 20–30 Hz (Goncharova 2003)
    const w = welch(art(60, () => ({}), { ...AWAKE, lor: 0.3, tube: true }), FS);
    expect(argmaxIn(w.f, w.psd, 5, 60)).toBeGreaterThanOrEqual(15);
    expect(argmaxIn(w.f, w.psd, 5, 60)).toBeLessThanOrEqual(35);
    expect(db(band(w, 50, 60), band(w, 20, 30))).toBeGreaterThan(-15);
  });

  it('C20 a diathermy burst: power up at all frequencies (Ch36 p. 1146, Fig. 36.10)', () => {
    const b = brain(30, 3.5);
    const a = art(30, () => ({ electrosurgery: { atS: 15, durationS: 10 } }));
    const x = b.map((v, i) => v + (a[i] as number));
    const before = welch(x.slice(2 * FS, 12 * FS), FS);
    const during = welch(x.slice(15 * FS, 25 * FS), FS);
    during.psd.forEach((p, i) => {
      if ((during.f[i] as number) >= 1) expect(db(p, before.psd[i] as number), `${during.f[i]} Hz`).toBeGreaterThan(6);
    });
  });

  it('C21 ECG pickup: spikes at the R waves, harmonic lines at k·HR that move with the heart rate (Ch36 p. 1146)', () => {
    expect(art(10, (_, t) => ({ ecgMv: qrs(72)(t) })).every((v) => v === 0)).toBe(true); // the flag is off by default (P-11)
    for (const hr of [72, 96]) {
      const lead = Array.from({ length: 120 * FS }, (_, n) => qrs(hr)(n / FS));
      const a = art(120, (n) => ({ ecgPickup: true, ecgMv: lead[n] as number }));
      // aligned to the R waves: every R sample is a local maximum of the pickup
      const rIdx = lead.map((v, n) => (v > 0.9 ? n : -1)).filter((n) => n > 0 && n < lead.length - 1);
      expect(rIdx.length).toBeGreaterThan(100);
      for (const n of rIdx) expect(a[n] as number).toBeGreaterThan(Math.max(a[n - 3] as number, a[n + 3] as number));
      const w = welch(a, FS, 1024);
      const f0 = hr / 60;
      for (let k = 1; k <= 5; k++) expect(Math.abs(argmaxIn(w.f, w.psd, k * f0 - 0.4, k * f0 + 0.4) - k * f0), `${hr} bpm, k ${k}`).toBeLessThan(0.15);
    }
  });

  it(`C22 electrode impedance above ${IMPEDANCE_LIMIT_KOHM} kΩ or unequal: unreliable, and a noisier trace (Ch36 p. 1145)`, () => {
    expect(IMPEDANCE_LIMIT_KOHM).toBe(5);
    expect(impedanceUnreliable([2, 2, 2])).toBe(false);
    expect(impedanceUnreliable([4.9, 4.9, 4.9])).toBe(false);
    expect(impedanceUnreliable([9, 2, 2])).toBe(true);
    expect(impedanceUnreliable([4.5, 1, 1])).toBe(true); // unequal
    const good = art(30, () => ({}));
    const bad = art(30, () => ({ impedanceKOhm: [12, 2, 2] }));
    expect(rms(good)).toBe(0);
    expect(rms(bad)).toBeGreaterThan(1);
    expect(rms(art(30, () => ({ impedanceKOhm: [20, 2, 2] })))).toBeGreaterThan(rms(bad));
  });

  it(`blinks while conscious: ≈ ${BLINK_PER_MIN}/min (Bentivoglio 1997), ${BLINK_UV_MIN}–${BLINK_UV_MAX} µV; none when unresponsive (Ch36 p. 1146)`, () => {
    const count = (x: number[]) => { // rises through 30 µV after having been below 10 µV (hysteresis against the EMG)
      let n = 0;
      let armed = true;
      for (const v of x) {
        if (armed && v > 30) { n++; armed = false; } else if (v < 10) armed = true;
      }
      return n;
    };
    const x = art(600, () => ({}), AWAKE);
    const perMin = count(x) / 10;
    expect(perMin).toBeGreaterThan(BLINK_PER_MIN * 0.8);
    expect(perMin).toBeLessThan(BLINK_PER_MIN * 1.2);
    expect(Math.max(...x)).toBeLessThan(BLINK_UV_MAX + 25); // a blink plus the awake EMG (6.7 µV RMS)
    expect(count(art(600, () => ({}), { ...AWAKE, lor: 1.2 }))).toBe(0);
  });

  it('mains: a line at the device mains frequency, 50 or 60 Hz (Ch36 p. 1145)', () => {
    for (const hz of [50, 60] as const) {
      const w = welch(art(30, () => ({ mains: 0.5, mainsHz: hz })), FS);
      expect(Math.abs(argmaxIn(w.f, w.psd, 1, 62) - hz)).toBeLessThan(0.5);
    }
  });
});
