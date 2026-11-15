// `pnpm --filter @pme/validation ecg-rig fetch|report` — the ECG analysis rig's recorded sets (defibrillator plan E4a).
// fetch: fill the dataset cache (PME_DATASET_CACHE; CUDB into PME_CUDB_CACHE when set). report: the sets' sizes, the
// held-out records and each class's measurements, on stdout (E4a reports; nothing here decides).
// Entry-only module (vite-node puts its own path in argv[1]).
import { CUDB_HELD_OUT, runRig } from '@pme/engine-core';
import { cacheDir } from '../datasets/cache.ts';
import { fetchRigSets, loadCudb, loadPtbxl, ptbxlSelection, rigSummary } from './rig-sets.ts';

const ptbxl = cacheDir();
const cudb = process.env.PME_CUDB_CACHE ?? ptbxl;
if (process.argv.includes('fetch')) console.log(JSON.stringify(await fetchRigSets({ cudb, ptbxl })));
else {
  const cu = loadCudb(cudb);
  const { recordings, missing } = loadPtbxl(ptbxl, ptbxlSelection(ptbxl));
  console.log(`CUDB: ${cu.length} records in, held out ${[...CUDB_HELD_OUT].sort().join(' ')}`);
  console.log(`CUDB records in: ${cu.map((r) => r.id).join(' ')}`);
  console.log(`PTB-XL: ${recordings.length} records in${missing.length ? `, ${missing.length} selected but not in the cache` : ''}`);
  const r = runRig([...cu, ...recordings]);
  for (const [cls, c] of Object.entries(r.classes)) if (c) console.log(`${cls}: ${c.records.length} records, ${c.segments} segments: ${c.records.join(' ')}`);
  console.log(rigSummary(r));
}
