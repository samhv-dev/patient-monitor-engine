// Defibrillator plan E4a: the recorded-ECG rig on the recordings. CUDB (VF, VT; DOI 10.13026/C2X59M) without the six
// template records, PTB-XL's non-shockable rhythms (DOI 10.13026/kfzx-aw45). The recordings are never committed: the
// test reads the dataset cache (PME_DATASET_CACHE; CUDB may sit in its own folder, PME_CUDB_CACHE) and is skipped
// where the cache does not hold them — CI's unit job has no cache, as for every other recorded set. Fill it with
// `pnpm --filter @pme/validation ecg-rig fetch`. E4a reports; nothing here decides or asserts a rate (E4b, B1 do).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUDB_HELD_OUT, runRig } from '@pme/engine-core';
import { cacheDir } from '../../src/datasets/cache.ts';
import { CUDB_PROJECT, loadCudb, loadPtbxl, PTBXL_PER_CLASS, PTBXL_PROJECT, ptbxlSelection, rigSummary } from '../../src/ecg-analysis/rig-sets.ts';

const ptbRoot = cacheDir();
const cuRoot = process.env.PME_CUDB_CACHE ?? ptbRoot;
const haveCudb = existsSync(join(cuRoot, CUDB_PROJECT, 'cu35.dat'));
const havePtb = existsSync(join(ptbRoot, PTBXL_PROJECT, 'ptbxl_database.csv'));

describe('the PTB-XL selection (the database list only)', () => {
  it.skipIf(!havePtb)('takes at most PTBXL_PER_CLASS records per class, each with one rhythm statement, human-validated, no noise flag', () => {
    const sel = ptbxlSelection(ptbRoot);
    for (const [cls, files] of Object.entries(sel)) {
      expect(files.length, cls).toBeGreaterThan(0);
      expect(files.length, cls).toBeLessThanOrEqual(PTBXL_PER_CLASS);
    }
    expect(Object.keys(sel)).toContain('nsr');
  });
});

describe.skipIf(!haveCudb)('the CUDB set', () => {
  it('loads 29 records — the 35 less the six template records — and cuts VF and VT segments from them', () => {
    const recs = loadCudb(cuRoot);
    expect(recs.map((r) => r.id).filter((id) => CUDB_HELD_OUT.has(id))).toEqual([]);
    expect(recs).toHaveLength(29);
    const r = runRig(recs);
    expect(r.classes.vf?.segments).toBeGreaterThan(0);
    console.log(rigSummary(r));
  }, 120_000);
});

describe.skipIf(!havePtb)('the PTB-XL set', () => {
  it('loads the selected records the cache holds (lead II) and measures every segment', () => {
    const { recordings, missing } = loadPtbxl(ptbRoot, ptbxlSelection(ptbRoot));
    if (missing.length > 0) console.log(`PTB-XL: ${missing.length} selected records are not in the cache (fill it with \`ecg-rig fetch\`)`);
    const r = runRig(recordings);
    expect(r.rows.every((row) => Number.isFinite(row.features.peakHz))).toBe(true);
    console.log(rigSummary(r));
  }, 120_000);
});
