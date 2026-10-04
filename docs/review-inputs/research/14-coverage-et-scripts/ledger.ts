// Prints the compact cell-status ledger for research/12 §4.8 (id, tier, verdict, pending flags, owner) from out/cells.json.
// Usage: node --experimental-strip-types ledger.ts > out/ledger.md
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, any>;
const key = (id: string) => id.replace(/^ET-M/, 'ET-9').replace(/^ET-(\d+)/, (_: string, n: string) => `ET-${n.padStart(3, '0')}`);
const recs = Object.values(s).sort((a, b) => key(a.id).localeCompare(key(b.id)));
console.log('| cell | tier | intervention (short) | verdict | owner |');
console.log('|---|---|---|---|---|');
for (const r of recs) console.log(`| ${r.id} | ${r.tier} | ${String(r.intv).replace(/\|/g, '/').slice(0, 90)} | **${r.verdict}**${r.known ? ` (${r.known} pending)` : ''} | ${String(r.owner).replace(/\|/g, '/').slice(0, 70)} |`);
