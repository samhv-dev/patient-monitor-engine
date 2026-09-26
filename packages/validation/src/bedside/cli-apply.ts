// Entry-only: pnpm --filter @pme/validation bedside:apply --results <bedside-results.json>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bedsideMarkdown } from './apply.ts';
import type { BedsideResults } from './checklist.ts';

const i = process.argv.indexOf('--results');
if (i < 0 || !process.argv[i + 1]) throw new Error('usage: bedside:apply --results <file.json>');
const r = JSON.parse(readFileSync(process.argv[i + 1] as string, 'utf8')) as BedsideResults;
if (r.schema !== 'pme-bedside-results/1') throw new Error('not a bedside results file');
const dir = fileURLToPath(new URL('../../../../docs/validation/bedside', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${r.date}.json`), `${JSON.stringify(r, null, 1)}\n`);
writeFileSync(join(dir, `${r.date}.md`), bedsideMarkdown(r));
console.log(join(dir, `${r.date}.md`));
