// `pnpm --filter @pme/validation datasets:fetch [--select vitaldb|mghdb] [--limit N]`
// Without --select: download every file the committed manifests list (and the PWDB CSVs), verifying hashes.
// With --select: rebuild that manifest from metadata (decision 2) — downloads candidates, keeps those that pass.
// Entry-only module (vite-node puts its own path in argv[1], so there is no "am I main" guard anywhere).
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cacheDir } from './cache.ts';
import { manifestPath, writeManifest } from './manifest.ts';
import { fetchAll, selectMghdb, selectVitaldb } from './select.ts';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const cache = cacheDir();
const sel = arg('--select');
const limit = Number(arg('--limit') ?? 999);
if (sel === 'vitaldb' || sel === 'mghdb') {
  const m = sel === 'vitaldb' ? await selectVitaldb(cache, limit) : await selectMghdb(cache, limit);
  mkdirSync(dirname(manifestPath(m.source)), { recursive: true });
  writeManifest(m);
  console.log(`${sel}: ${new Set(m.windows.map((w) => w.record)).size} records, ${m.windows.length} windows, ${m.rejected.length} rejected → ${manifestPath(m.source)}`);
} else {
  console.log(`verified ${await fetchAll(cache)} files in ${cache}`);
}
