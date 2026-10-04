// Re-applies the current cell specs' grading (bands, hand confirmations) to the stored values without re-running the
// engine — used after a hand confirmation is added. Usage: node --import ./hooks.mjs regrade.ts [store.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { CELLS } from './spec.ts';
import './cells-a.ts';
import './cells-b.ts';
import './cells-c.ts';
import './cells-d.ts';
import './cells-m.ts';
import { grade } from './grade.ts';
const file = process.argv[2] ?? new URL('./out/cells.json', import.meta.url).pathname;
const s = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
for (const c of CELLS) {
  const r = s[c.id];
  if (!r) continue;
  const g = grade(c, r.values, r.rejected ?? []);
  s[c.id] = { ...r, ...g, owner: c.owner, ...(c.fu4 ? { fu4: true } : {}), ...(c.known ? { known: c.known } : {}) };
}
writeFileSync(file, JSON.stringify(s, null, 1));
console.log('regraded', Object.keys(s).length);
