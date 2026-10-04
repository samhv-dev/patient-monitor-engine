// Re-applies the current cell specs' grading (bands, hand confirmations) to the stored values without re-running the
// engine. Usage: node --import ./hooks.mjs --experimental-strip-types regrade.ts [store.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { CELLS } from './spec.ts';
import './cells-a.ts'; import './cells-b.ts'; import './hands.ts';
import { grade } from './grade.ts';
const file = process.argv[2] ?? new URL('./out/cells.json', import.meta.url).pathname;
const s = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
for (const c of CELLS) {
  const r = s[c.id];
  if (!r) continue;
  const g = grade(c, r.values, r.rejected ?? []);
  s[c.id] = { ...r, ...g, tier: c.tier, ctx: c.ctx, state: c.state, intv: c.intv, sys: c.sys, owner: c.owner, fu4: c.fu4 || undefined, known: c.known, dirOnly: c.dirOnly || undefined };
}
writeFileSync(file, JSON.stringify(s, null, 1));
console.log('regraded', Object.keys(s).length);
