// EEG E2 (plan §7 E2): the spectral description per cortical state — acceptance cells C1–C17 (plan §7.2) at the
// spectrum level (spectrumOf, no signal yet), plus C28's amplitude/slope half and C34/C35's spectral half. "Direction"
// cells test sign and order; the cells with a sourced number test the number.
import { describe, expect, it } from 'vitest';
import { agentMixOf, cortexStep } from '../../../src/l2/eeg/state.ts';
import { bandPower, medianFreq, peakOf, psdDb, rmsUv, spectrumOf } from '../../../src/l2/eeg/spectra.ts';
import { depth } from '../../../src/l2/neuro/depth.ts';
import type { CortexInputs, CortexState, EegSpectrum } from '../../../src/types-eeg.ts';

const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
type Patch = Partial<Omit<CortexInputs, 'hyp' | 'mac'>> & { hyp?: Partial<CortexInputs['hyp']>; mac?: Partial<CortexInputs['mac']> };
const inp = (p: Patch = {}): CortexInputs => ({
  ageY: 40, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37,
  ...p, hyp: { ...H0, ...(p.hyp ?? {}) }, mac: { ...M0, ...(p.mac ?? {}) },
});
const sp = (p: Patch = {}, prev?: CortexState): EegSpectrum => { const x = inp(p); return spectrumOf(cortexStep(prev, x, 0.1), agentMixOf(x)); };
const db = (a: number, b: number) => 10 * Math.log10(a / b);
const prop = (ugMl: number, extra: Patch = {}) => sp({ ...extra, hyp: { gabaIv: 1000 * ugMl, ...(extra.hyp ?? {}) } });
const AWAKE = sp();
/** The height of a named peak above the aperiodic background at its own frequency, dB. */
const above = (s: EegSpectrum, name: Parameters<typeof peakOf>[1]) => { const p = peakOf(s, name); return p.powerDb - (s.aperiodic.offsetDb - 10 * s.aperiodic.slope * Math.log10(p.fHz)); };

describe('EEG E2 spectra: acceptance cells at the spectrum level', () => {
  it('C1 awake: RMS ≈ 5–10 µV (Ch36 p. 1138), a beta base, no frontal alpha', () => {
    expect(rmsUv(AWAKE)).toBeGreaterThanOrEqual(5);
    expect(rmsUv(AWAKE)).toBeLessThanOrEqual(10);
    expect(above(AWAKE, 'beta')).toBeGreaterThan(0);
    expect(above(AWAKE, 'alpha')).toBeLessThan(-10);
    expect(AWAKE.suppression.p).toBe(0);
  });

  it('C2 propofol to sedation (before loss of response): 15–25 Hz "beta buzz" power rises (Ch36 p. 1138)', () => {
    const sed = prop(1.0); // lor ≈ 0.5 at 40 y
    expect(db(bandPower(sed, 15, 25), bandPower(AWAKE, 15, 25))).toBeGreaterThan(3);
  });

  it('C3 through loss of responsiveness: frontal alpha 8–12 Hz appears (Ch36 p. 1138; Ch35 p. 1106)', () => {
    const before = prop(1.2);
    const after = prop(2.6);
    expect(db(bandPower(after, 8, 12), bandPower(before, 8, 12))).toBeGreaterThan(3);
    expect(above(after, 'alpha')).toBeGreaterThan(3);
  });

  it('C4 propofol at surgical depth: alpha–delta, beta and gamma fall, peaks ≈ 40 µV (Ch36 pp. 1139, 1145)', () => {
    const ga = prop(3.5);
    expect(db(bandPower(ga, 0.1, 4), bandPower(AWAKE, 0.1, 4))).toBeGreaterThan(10);
    expect(db(bandPower(ga, 8, 12), bandPower(AWAKE, 8, 12))).toBeGreaterThan(3);
    expect(bandPower(ga, 20, 30)).toBeLessThan(bandPower(AWAKE, 20, 30));
    expect(bandPower(ga, 30, 45)).toBeLessThan(bandPower(AWAKE, 30, 45));
    // "peak amplitudes ≈ 40 µV" read as the ≈ 3σ excursion of the trace [INF]
    expect(3 * rmsUv(ga)).toBeGreaterThan(30);
    expect(3 * rmsUv(ga)).toBeLessThan(55);
  });

  it('C5 rising GABA-ergic dose: the aperiodic slope steepens (Ch36 p. 1139); κ ≈ 0.9 at ≈ 1 MAC sevoflurane maintenance (Obert 2022)', () => {
    let last = -Infinity;
    for (const p of [0, 1, 2, 3, 4]) { const k = prop(p).aperiodic.slope; expect(k).toBeGreaterThan(last); last = k; }
    last = -Infinity;
    for (const m of [0, 0.4, 0.8, 1.2]) { const k = sp({ mac: { sevoflurane: m } }).aperiodic.slope; expect(k).toBeGreaterThan(last); last = k; }
    expect(sp({ mac: { sevoflurane: 1 } }).aperiodic.slope).toBeCloseTo(0.9, 6);
  });

  it('C6 sevoflurane past ≈ 1.7 %: > 20 Hz power lost, alpha ≈ 10 → 7–8 Hz and fading; the same on the way down (Ch36 pp. 1142–1143)', () => {
    const light = sp({ mac: { sevoflurane: 0.85 } });
    const deep = sp({ mac: { sevoflurane: 1.35 } });
    expect(peakOf(light, 'alpha').fHz).toBeGreaterThanOrEqual(9.5);
    expect(peakOf(light, 'alpha').fHz).toBeLessThanOrEqual(10.5);
    expect(peakOf(deep, 'alpha').fHz).toBeGreaterThanOrEqual(7);
    expect(peakOf(deep, 'alpha').fHz).toBeLessThanOrEqual(8.5);
    expect(peakOf(deep, 'alpha').powerDb).toBeLessThan(peakOf(light, 'alpha').powerDb);
    expect(bandPower(deep, 20, 45)).toBeLessThan(bandPower(light, 20, 45));
    // reverses: back at 0.85 MAC after 1.35 MAC (no hysteresis beyond the drug layer, P-4 = 0)
    const back = sp({ mac: { sevoflurane: 0.85 } }, cortexStep(undefined, inp({ mac: { sevoflurane: 1.35 } }), 0.1));
    expect(peakOf(back, 'alpha').fHz).toBeCloseTo(peakOf(light, 'alpha').fHz, 9);
  });

  it('C7 propofol at any depth short of suppression: the alpha peak stays ≥ 10 Hz (Ch36 p. 1143)', () => {
    for (let p = 2.2; p <= 4.85; p += 0.25) expect(peakOf(prop(p), 'alpha').fHz, `${p}`).toBeGreaterThanOrEqual(10);
  });

  it('C8 propofol rising: suppression appears at ≈ 4.9 µg/mL (Pilge 2014; Ch36 p. 1141 "about 5")', () => {
    expect(prop(4.8).suppression.p).toBe(0);
    expect(prop(5.2).suppression.p).toBeGreaterThan(0);
  });

  it('C10 deepening suppression: suppressed < 5 µV; suppression lengthens with dose to isoelectric; the forme fruste comes first (Ch36 pp. 1139–1141)', () => {
    let last = -1;
    for (const m of [1.45, 1.6, 1.8, 2.0, 2.3, 2.6]) {
      const s = sp({ mac: { sevoflurane: m } });
      expect(s.suppression.suppressedUv).toBeLessThan(5);
      expect(s.suppression.p).toBeGreaterThan(last);
      last = s.suppression.p;
    }
    expect(last).toBe(1);
    const pre = sp({ mac: { sevoflurane: 1.35 } });
    expect(pre.suppression.p).toBe(0);
    expect(pre.formeFruste).toBeGreaterThan(0);
    expect(sp({ mac: { sevoflurane: 0.8 } }).formeFruste).toBe(0);
  });

  it('burst amplitude by agent and age: isoflurane > sevoflurane > propofol (Fleischmann 2018); smaller with age (Kratzer 2020)', () => {
    const iso = sp({ mac: { isoflurane: 1.6 } }).suppression.burstUv;
    const sevo = sp({ mac: { sevoflurane: 1.6 } }).suppression.burstUv;
    const pr = prop(6).suppression.burstUv;
    expect(iso).toBeGreaterThan(sevo);
    expect(sevo).toBeGreaterThan(pr);
    expect(pr).toBeCloseTo(31.97 - 0.26 * 40, 6);
    expect(sp({ ageY: 80, hyp: { gabaIv: 6000 } }).suppression.burstUv).toBeLessThan(pr);
  });

  it('C11 opioid alone, fentanyl-eq > 8 ng/mL: delta up, median frequency down; never suppression (Ch36 p. 1144; Ch35 Table 35.1)', () => {
    const op = sp({ opioidFentEq: 14 });
    expect(bandPower(op, 0.5, 4)).toBeGreaterThan(bandPower(AWAKE, 0.5, 4));
    expect(medianFreq(op, 0.5, 30)).toBeLessThan(medianFreq(AWAKE, 0.5, 30));
    expect(sp({ opioidFentEq: 200 }).suppression.p).toBe(0);
  });

  it('C12 a fentanyl bolus on a hypnotic: little EEG change, median frequency down or unchanged (Ch36 p. 1145)', () => {
    const h = prop(3.5);
    const hf = prop(3.5, { opioidFentEq: 3 });
    const d = medianFreq(hf, 0.5, 30) - medianFreq(h, 0.5, 30);
    expect(d).toBeLessThanOrEqual(1e-9);
    expect(d).toBeGreaterThan(-0.5);
  });

  it('C13 incision on a light hypnotic: beta arousal and alpha dropout without opioid, prevented above 4 ng/mL (Ch36 pp. 1141, 1145)', () => {
    const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
    const at = (fe: number, stim: number) => {
      const dp = depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 0, stimulus: stim, hypPropEq: 2600, opioidFentEqIn: fe });
      return prop(2.6, { stimulus: stim, antinoc: dp.antinoc, opioidFentEq: fe });
    };
    const quiet = at(0, 0);
    const cut = at(0, 1);
    const cutOp = at(5, 1);
    expect(db(bandPower(cut, 15, 25), bandPower(quiet, 15, 25))).toBeGreaterThan(3);
    expect(bandPower(cut, 8, 12)).toBeLessThan(bandPower(quiet, 8, 12));
    expect(bandPower(cutOp, 15, 25)).toBeLessThan(bandPower(cut, 15, 25));
    expect(bandPower(cutOp, 8, 12)).toBeGreaterThan(bandPower(cut, 8, 12));
  });

  it('C14 ketamine as an adjunct on 0.7 MAC sevoflurane: alpha power falls (Ch36 p. 1144, Fig. 36.8)', () => {
    const sevo = sp({ mac: { sevoflurane: 0.7 } });
    const ket = sp({ mac: { sevoflurane: 0.7 }, hyp: { dissociative: 600 } });
    expect(bandPower(ket, 8, 12)).toBeLessThan(bandPower(sevo, 8, 12));
    expect(ket.suppression.p).toBe(0);
  });

  it('C15 ketamine alone at a hypnotic dose: large slow waves with gamma bursts; no suppression (Ch36 p. 1144; Ch35 Table 35.1)', () => {
    const k = sp({ hyp: { dissociative: 3000 } });
    expect(db(bandPower(k, 0.1, 2), bandPower(AWAKE, 0.1, 2))).toBeGreaterThan(10);
    expect(bandPower(k, 30, 45)).toBeGreaterThan(bandPower(AWAKE, 30, 45));
    expect(peakOf(k, 'gamma').burstiness).toBeGreaterThanOrEqual(0.5);
    expect(k.suppression.p).toBe(0);
    // sub-hypnotic: alpha loss with theta and gamma up
    const sub = sp({ hyp: { dissociative: 500 } });
    expect(bandPower(sub, 4, 8)).toBeGreaterThan(bandPower(AWAKE, 4, 8));
    expect(bandPower(sub, 30, 45)).toBeGreaterThan(bandPower(AWAKE, 30, 45));
  });

  it('C16 N2O alone at steady state: minimal change (fast activity > 30 Hz up); a step: a large short slow-delta transient with alpha loss; no suppression', () => {
    const n = sp({ mac: { n2o: 0.6 } });
    for (const [lo, hi] of [[0.5, 4], [4, 8], [8, 12], [12, 25]] as const) expect(Math.abs(db(bandPower(n, lo, hi), bandPower(AWAKE, lo, hi))), `${lo}–${hi}`).toBeLessThan(3);
    expect(bandPower(n, 30, 45)).toBeGreaterThan(bandPower(AWAKE, 30, 45));
    expect(sp({ mac: { n2o: 1.2 } }).suppression.p).toBe(0);
    // the step, on a sevoflurane background (Pavone 2016: switch from sevoflurane to > 50 % N2O)
    const base = cortexStep(undefined, inp({ mac: { sevoflurane: 0.8 } }), 0.1);
    const before = sp({ mac: { sevoflurane: 0.8 } }, base);
    const step = sp({ mac: { sevoflurane: 0.8, n2o: 0.6 } }, base);
    expect(db(bandPower(step, 0.1, 4), bandPower(before, 0.1, 4))).toBeGreaterThan(3);
    expect(bandPower(step, 8, 12)).toBeLessThan(bandPower(before, 8, 12));
  });

  it('C17 dexmedetomidine to unresponsiveness: alpha–delta with ≈ 12–13 Hz spindle bursts, not continuous alpha; no suppression (Ch36 p. 1144; Akeju 2014)', () => {
    const dex = sp({ alpha2Eq: 1 });
    const sp1 = peakOf(dex, 'spindle');
    expect(sp1.fHz).toBeGreaterThanOrEqual(11.5);
    expect(sp1.fHz).toBeLessThanOrEqual(14);
    expect(sp1.burstiness).toBeGreaterThanOrEqual(0.6);
    expect(above(dex, 'spindle')).toBeGreaterThan(0);
    expect(bandPower(dex, 0.1, 2)).toBeGreaterThan(bandPower(AWAKE, 0.1, 2));
    expect(peakOf(prop(3.5), 'alpha').burstiness).toBeLessThanOrEqual(0.2); // propofol alpha "often almost continuous"
    expect(sp({ alpha2Eq: 10 }).suppression.p).toBe(0);
    // the dexmedetomidine spindles sit ≈ 12 dB below propofol's GA alpha (Akeju 2014: −10.8 vs 1.1 dB)
    expect(peakOf(prop(3.08), 'alpha').powerDb - sp1.powerDb).toBeGreaterThan(8);
  });

  it('emergence: as the dose falls, slow power falls, the alpha peak frequency rises, the slope flattens (Ch36 pp. 1139, 1142)', () => {
    const deepS = prop(3.5);
    const lighter = prop(2.4);
    expect(bandPower(lighter, 0.1, 4)).toBeLessThan(bandPower(deepS, 0.1, 4));
    expect(peakOf(lighter, 'alpha').fHz).toBeGreaterThan(peakOf(deepS, 'alpha').fHz);
    expect(lighter.aperiodic.slope).toBeLessThan(deepS.aperiodic.slope);
  });

  it('C28 (spectral half): 80 y vs 40 y at the same age-adjusted dose — lower amplitude, slope ≈ 20 % flatter (Ch36 p. 1145)', () => {
    const young = sp({ ageY: 40, mac: { sevoflurane: 1 } });
    const old = sp({ ageY: 80, mac: { sevoflurane: 1 } });
    expect(rmsUv(old)).toBeLessThan(rmsUv(young));
    expect(old.aperiodic.slope / young.aperiodic.slope).toBeGreaterThan(0.78);
    expect(old.aperiodic.slope / young.aperiodic.slope).toBeLessThan(0.9);
  });

  it('C34 / C35 (spectral half): ischaemia and cooling slow the EEG (median frequency down) before the voltage goes', () => {
    expect(medianFreq(sp({ do2Rel: 0.33 }), 0.5, 30)).toBeLessThan(medianFreq(AWAKE, 0.5, 30));
    expect(sp({ do2Rel: 0.33 }).suppression.p).toBe(0);
    expect(medianFreq(sp({ tempC: 28 }), 0.5, 30)).toBeLessThan(medianFreq(AWAKE, 0.5, 30));
    expect(sp({ tempC: 17.8 }).suppression.p).toBe(1);
  });

  it('psdDb is the aperiodic background plus the peaks (the generator\'s contract)', () => {
    const s = prop(3);
    const f = 10;
    const ap = 10 ** ((s.aperiodic.offsetDb - 10 * s.aperiodic.slope * Math.log10(f)) / 10);
    const pk = s.peaks.reduce((a, p) => a + 10 ** (p.powerDb / 10) * Math.exp(-((f - p.fHz) ** 2) / (2 * p.widthHz ** 2)), 0);
    expect(psdDb(s, f)).toBeCloseTo(10 * Math.log10(ap + pk), 9);
  });
});
