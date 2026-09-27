// Entry-only: pnpm --filter @pme/validation review:score --bundle B --key K --answers A [--out dir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreMarkdown, scoreReview } from './score.ts';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`missing ${k}`);
  return process.argv[i + 1] as string;
};
const read = (k: string) => JSON.parse(readFileSync(arg(k), 'utf8'));
const ans = read('--answers');
const s = scoreReview(read('--bundle'), read('--key'), ans);
const out = process.argv.includes('--out') ? arg('--out') : resolve(fileURLToPath(new URL('../../../../docs/validation/review', import.meta.url)));
mkdirSync(out, { recursive: true });
const base = join(out, `${ans.session}-${String(ans.rater).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
writeFileSync(`${base}.md`, scoreMarkdown(ans, s));
writeFileSync(`${base}.json`, `${JSON.stringify({ session: ans.session, rater: ans.rater, scores: s }, null, 1)}\n`);
console.log(`${base}.md`);
