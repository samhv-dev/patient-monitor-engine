// Body-surface artefacts summed into the VCG before projection and before the L3 filter (brief §5 "Artefacts";
// research 03 §1.10–1.11): extra baseline wander, EMG/shivering, CPR compression artefact (parametric, brief §11 C2).
import { normal, uniform } from '../../../rng/sfc32.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';
import type { Vec3 } from '../vcg.ts';
import { WANDER_DIR } from '../templates.ts';

/** EMG direction (II gain ≈ 1) and CPR direction (II gain ≈ 1.05) [ENG]. */
const EMG_DIR: Vec3 = [0.5, 0.8, 0.4];
export const CPR_DIR: Vec3 = [0.1, 0.9, -0.5];
export const WANDER_MAX_MV = 0.3; // 0.05–0.3 mV at 0.1–0.5 Hz
export const EMG_MAX_RMS_MV = 0.2; // 0.02–0.2 mV RMS
const EMG_HP_HZ = 20; // 20–150 Hz band
const EMG_LP_HZ = 150;
/** Gain that makes the first-order 20–150 Hz band-pass of unit white noise unit-RMS at 500 Hz (measured) [ENG]. */
const EMG_NORM = 1.63;
const SHIVER_HZ = 6; // tremor envelope 4–8 Hz
export const CPR_HARMONICS = 8; // Σ_{h=1..8} A_h·e^(−0.3(h−1))·sin(2πh·f_c·t + φ_h)
const CPR_DECAY = 0.3;
const CPR_JITTER = 0.05; // ±5%
const CPR_STEP = 0.004; // per-compression random-walk step (fraction of f_c) [ENG]
/** Σ_h e^(−0.6(h−1)): harmonic power, so that depth maps to the peak-to-peak-equivalent 2√2·RMS [ENG]. */
const CPR_POWER = Array.from({ length: CPR_HARMONICS }, (_, h) => Math.exp(-2 * CPR_DECAY * h)).reduce((a, b) => a + b, 0);

export interface ArtState {
  hp: number[];
  lp: number[];
  px: number[];
  cprPh: number;
  cprF: number;
}

export function createArtState(): ArtState {
  return { hp: [0, 0, 0], lp: [0, 0, 0], px: [0, 0, 0], cprPh: 0, cprF: 0 };
}

const aHp = Math.exp((-2 * Math.PI * EMG_HP_HZ) / 500);
const aLp = Math.exp((-2 * Math.PI * EMG_LP_HZ) / 500);

export function bodyArtefactSource(g: EcgGenInputs, _n: number, s: number, acc: Float64Array): void {
  const a = g.mods.artefact;
  const st = g.st;
  if (a.wander > 0) {
    const w = a.wander * WANDER_MAX_MV * (0.6 * Math.sin(2 * Math.PI * 0.18 * s + 0.7) + 0.4 * Math.sin(2 * Math.PI * 0.37 * s + 2.1));
    for (let j = 0; j < 3; j++) acc[j] = (acc[j] as number) + w * (WANDER_DIR[j] as number);
  }
  const emg = Math.max(a.emg, a.shiver);
  if (emg > 0) {
    const art = (st.art ??= createArtState());
    const env = a.shiver > a.emg ? 0.5 + 0.5 * Math.sin(2 * Math.PI * SHIVER_HZ * s) : 1;
    for (let j = 0; j < 3; j++) {
      const x = normal(g.artefactRng);
      const h = aHp * ((art.hp[j] as number) + x - (art.px[j] as number));
      art.px[j] = x;
      art.hp[j] = h;
      const l = aLp * (art.lp[j] as number) + (1 - aLp) * h;
      art.lp[j] = l;
      acc[j] = (acc[j] as number) + emg * EMG_MAX_RMS_MV * EMG_NORM * env * l * (EMG_DIR[j] as number);
    }
  }
  const cpr = a.cpr;
  if (cpr) {
    const art = (st.art ??= createArtState());
    const fc = cpr.rateCpm / 60;
    if (art.cprF === 0) art.cprF = fc;
    const prev = art.cprPh;
    art.cprPh += (2 * Math.PI * art.cprF) / 500;
    if (Math.floor(art.cprPh / (2 * Math.PI)) > Math.floor(prev / (2 * Math.PI))) {
      // new compression: bounded random walk of the rate, ±5% of f_c
      const next = art.cprF + CPR_STEP * fc * (2 * uniform(g.artefactRng) - 1);
      art.cprF = Math.min(fc * (1 + CPR_JITTER), Math.max(fc * (1 - CPR_JITTER), next));
    }
    const a1 = (0.2 + 1.8 * cpr.depth) / (2 * Math.sqrt(CPR_POWER)); // 2√2·RMS = 0.2–2 mV (brief §4.1)
    let v = 0;
    for (let h = 1; h <= CPR_HARMONICS; h++) v += a1 * Math.exp(-CPR_DECAY * (h - 1)) * Math.sin(h * art.cprPh + 0.9 * h);
    for (let j = 0; j < 3; j++) acc[j] = (acc[j] as number) + v * (CPR_DIR[j] as number) / 1.05;
  } else if (st.art) st.art.cprF = 0;
}
