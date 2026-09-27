// Entry-only: pnpm --filter @pme/validation review:build [--per-channel 20]
// Writes <cache>/review/<session>/bundle.json (open it in validation-review.html) and key.json (keep it away from raters).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir } from '../datasets/cache.ts';
import { buildBundle } from './clips.ts';

const i = process.argv.indexOf('--per-channel');
const n = i >= 0 ? Number(process.argv[i + 1]) : 20;
const { bundle, key } = await buildBundle(cacheDir(), n);
const dir = join(cacheDir(), 'review', bundle.session);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'bundle.json'), JSON.stringify(bundle));
writeFileSync(join(dir, 'key.json'), JSON.stringify(key, null, 1));
console.log(`${bundle.clips.length} clips → ${join(dir, 'bundle.json')} (key: key.json, do not share)`);
