// V9 determinism (brief §9): SHA-256 of the sample buffers for rhythms × seeds × 60 s. Gating: two runs in one
// process are byte-identical (decision 10). The committed golden file is compared for information only (any engine
// change legitimately moves it). Default 3 seeds per rhythm (≈ 20–40 s); `--full` runs the brief's 40.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RHYTHM_IDS, type ChannelId, type RhythmId } from '@pme/engine-core';
import { capture } from '../engine/capture.ts';

export const CHANNELS: ChannelId[] = ['ecgII', 'abp', 'pleth'];
export const goldenPath = (): string => fileURLToPath(new URL('../../baselines/determinism.json', import.meta.url));

export async function hashRun(rhythm: RhythmId, seed: number, seconds = 60): Promise<string> {
  const cap = await capture({ engine: { seed, patient: { rhythm: { id: rhythm }, sensors: { abp: 'connected', spo2: 'on' } } }, channels: CHANNELS, fromS: 0, toS: seconds });
  const h = createHash('sha256');
  for (const ch of CHANNELS) h.update(new Uint8Array(Float32Array.from(cap.channels[ch]?.x ?? []).buffer));
  return h.digest('hex');
}

export interface DeterminismResult { runs: number; nonDeterministic: string[]; goldenChanged: string[]; hashes: Record<string, string> }

export async function runDeterminism(seeds: number[] = [1, 2, 3], rhythms: readonly RhythmId[] = RHYTHM_IDS): Promise<DeterminismResult> {
  const hashes: Record<string, string> = {};
  const bad: string[] = [];
  for (const r of rhythms) {
    for (const s of seeds) {
      const a = await hashRun(r, s);
      const b = await hashRun(r, s);
      hashes[`${r}/${s}`] = a;
      if (a !== b) bad.push(`${r}/${s}`);
    }
  }
  const golden: Record<string, string> = existsSync(goldenPath()) ? JSON.parse(readFileSync(goldenPath(), 'utf8')) : {};
  const changed = Object.keys(hashes).filter((k) => golden[k] !== undefined && golden[k] !== hashes[k]);
  return { runs: Object.keys(hashes).length * 2, nonDeterministic: bad, goldenChanged: changed, hashes };
}

export function writeGolden(h: Record<string, string>): void {
  writeFileSync(goldenPath(), `${JSON.stringify(h, null, 1)}\n`);
}
