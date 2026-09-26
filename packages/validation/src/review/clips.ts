// Build a blind-review bundle (brief §9 step 1–2): per channel N real 10 s segments (VitalDB, MGH/MF manifest
// windows) and N synthetic ones from engine runs matched to the same windows, all resampled to the engine's rates
// and passed through the monitor's ECG band (0.5–40 Hz) so only the signal differs; the page draws them with the
// renderer's SweepLane. Clip ids are random; the key (real/synthetic, source) is written NEXT TO the bundle in the
// cache — never committed, never shown to the rater. Recorded samples stay in the cache (brief §8).
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeader } from '../templates/wfdb.ts';
import { bandpassZeroPhase, resample } from '../templates/dsp.ts';
import { matchedRun } from '../engine/match.ts';
import { readManifest } from '../datasets/manifest.ts';
import { MGHDB, mghMeta, mghSignals } from '../datasets/mghdb.ts';
import type { AnalysisWindow, Signals, Wave } from '../datasets/signals.ts';
import { loadCase, vitaldbSignals, vitaldbSums } from '../datasets/vitaldb.ts';
import type { ReviewBundle, ReviewChannel, ReviewClip, ReviewKey } from './types.ts';

export const CLIP_S = 10;
const RATE: Record<ReviewChannel, number> = { ecgII: 500, abp: 125, pleth: 125, co2: 62.5 };
const UNIT: Record<ReviewChannel, string> = { ecgII: 'mV', abp: 'mmHg', pleth: '', co2: 'mmHg' };
const RANGE: Record<ReviewChannel, [number, number] | null> = { ecgII: null, abp: [0, 150], pleth: null, co2: [0, 50] };

const pickWave = (s: Signals, ch: ReviewChannel): Wave | undefined => (ch === 'ecgII' ? s.ecg : ch === 'abp' ? s.abp : ch === 'pleth' ? s.pleth : s.co2);

/** A 10 s clip from the middle of a window, at the engine rate, ECG band-passed like the monitor filter. */
export function toClip(w: Wave, ch: ReviewChannel, id: string): ReviewClip {
  const mid = w.x.length / w.fs / 2;
  const a = Math.round((mid - CLIP_S / 2) * w.fs);
  let x: Float64Array = w.x.slice(Math.max(0, a), Math.max(0, a) + Math.round(CLIP_S * w.fs));
  if (ch === 'ecgII') x = bandpassZeroPhase(x, w.fs, 0.5, 40);
  if (w.fs !== RATE[ch]) x = resample(x, w.fs, RATE[ch]);
  return { id, channel: ch, fs: RATE[ch], unit: UNIT[ch], range: RANGE[ch], x: Array.from(x, (v) => Math.round(v * 1000) / 1000) };
}

export function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export async function buildBundle(cache: string, perChannel = 20, seed = 101): Promise<{ bundle: ReviewBundle; key: ReviewKey }> {
  const session = `r${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(2).toString('hex')}`;
  const windows: AnalysisWindow[] = [...(readManifest('vitaldb')?.windows ?? []), ...(readManifest('mghdb')?.windows ?? [])];
  const sums = await vitaldbSums(cache);
  const clips: ReviewClip[] = [];
  const key: ReviewKey = { schema: 'pme-review-key/1', session, entries: {} };
  const count: Record<ReviewChannel, number> = { ecgII: 0, abp: 0, pleth: 0, co2: 0 };
  for (const w of windows) {
    if (Object.values(count).every((n) => n >= perChannel)) break;
    let rec: Signals;
    if (w.source === 'vitaldb') rec = vitaldbSignals(await loadCase(cache, w.record, sums), w);
    else {
      const hea = readFileSync(join(cache, MGHDB, `${w.record}.hea`), 'latin1');
      rec = mghSignals(parseHeader(hea), mghMeta(hea), new Uint8Array(readFileSync(join(cache, MGHDB, `${w.record}.dat`))), w.fromS, w.toS);
    }
    const syn = (await matchedRun(w, seed)).signals;
    for (const ch of ['ecgII', 'abp', 'pleth', 'co2'] as const) {
      const r = pickWave(rec, ch);
      const s = pickWave(syn, ch);
      if (!r || !s || count[ch] >= perChannel || (ch === 'co2' && rec.co2Calibrated === false)) continue;
      const idR = randomBytes(4).toString('hex');
      const idS = randomBytes(4).toString('hex');
      clips.push(toClip(r, ch, idR), toClip(s, ch, idS));
      key.entries[idR] = { kind: 'real', source: w.source, record: w.record, fromS: w.fromS };
      key.entries[idS] = { kind: 'synthetic', source: w.source, record: w.record, fromS: w.fromS, seed };
      count[ch]++;
    }
  }
  return { bundle: { schema: 'pme-review-bundle/1', session, createdAt: new Date().toISOString(), clips: shuffle(clips) }, key };
}
