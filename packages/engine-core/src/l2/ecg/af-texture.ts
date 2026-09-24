// AF f-wave texture (brief §4.1 "AF f-waves: templates, with a fallback of 2–4 random-phase sinusoids"; §11 C1).
// Recorded MIT-BIH f-wave segments (QRST-cancelled, unit RMS) are played back at their own rate as a stateless
// function of time: 8 s blocks, each block's segment chosen by a hash of (episode seed, block index), with a 0.5 s
// equal-power crossfade between blocks. Amplitude: RMS F_RMS_MV in lead II along FWAVE_DIR.
import { AF_SCALE, AF_TEMPLATES } from '../../../templates/af-mitdb.ts';
import { hash53 } from '../../rng/sfc32.ts';
import { decodeTemplates } from './texture.ts';
import { FWAVE_DIR } from './templates.ts';
import { FWAVE_FADE_S } from './generator.ts';
import type { EcgGenInputs } from './ecg-gen.ts';

export const F_RMS_MV = 0.03; // f-waves 0.02–0.15 mV (brief §4.1): RMS 0.03 ≈ 0.08 mV peak-to-peak [ENG]
const BLOCK_S = 7.5; // shorter than an 8 s template so every block fits [ENG]
const XFADE_S = 0.5;
const TEX = AF_TEMPLATES.length > 0 ? decodeTemplates({ scale: AF_SCALE, items: AF_TEMPLATES }) : [];
const DIR_II = 0.235 * FWAVE_DIR[0] + 1.066 * FWAVE_DIR[1] - 0.132 * FWAVE_DIR[2];

export function afTemplatesAvailable(): boolean {
  return TEX.length > 0;
}

function blockValue(seed: number, block: number, tIn: number): number {
  const [h] = hash53(`af${block}`, seed);
  const tex = TEX[h % TEX.length]!;
  const i = Math.min(tex.x.length - 2, tIn * 500);
  const i0 = Math.floor(i);
  return (tex.x[i0] as number) + ((tex.x[i0 + 1] as number) - (tex.x[i0] as number)) * (i - i0);
}

/** Unit-RMS f-wave texture at time u (s since the AF episode started). */
export function afTexture(seed: number, u: number): number {
  const b = Math.floor(u / BLOCK_S);
  const tIn = u - b * BLOCK_S;
  const v = blockValue(seed, b, tIn);
  if (tIn >= XFADE_S || b === 0) return v;
  const w = tIn / XFADE_S;
  return v * Math.sin((w * Math.PI) / 2) + blockValue(seed, b - 1, tIn + BLOCK_S) * Math.cos((w * Math.PI) / 2);
}

/** VCG source: AF waves in texture mode (kind 'fib', empty sinusoid list), with the generator's fade in/out. */
export function afSource(g: EcgGenInputs, _n: number, s: number, acc: Float64Array): void {
  if (TEX.length === 0) return;
  for (const fw of g.st.fwaves) {
    if (fw.kind !== 'fib' || fw.f.length > 0 || s < fw.start || s > fw.end) continue;
    const fade = Math.min(1, (s - fw.start) / FWAVE_FADE_S, (fw.end - s) / FWAVE_FADE_S);
    addF(acc, fade * (F_RMS_MV / DIR_II) * afTexture(fw.seed ?? 0, s - fw.start));
  }
}

function addF(acc: Float64Array, k: number): void {
  acc[0] = (acc[0] as number) + k * FWAVE_DIR[0];
  acc[1] = (acc[1] as number) + k * FWAVE_DIR[1];
  acc[2] = (acc[2] as number) + k * FWAVE_DIR[2];
}
