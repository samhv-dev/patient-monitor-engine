// Prints the compact cell-status ledger for research/12 §4.4 (id, tier, verdict, FU-4 flag, owner) from out/cells.json.
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(new URL('./out/cells.json', import.meta.url), 'utf8')) as Record<string, any>;
const key = (id: string) => id.replace(/^DI-M/, 'DI-9').replace(/^DI-(\d+)/, (_: string, n: string) => `DI-${n.padStart(3, '0')}`);
const recs = Object.values(s).sort((a, b) => key(a.id).localeCompare(key(b.id)));
console.log('| cell | tier | intervention (short) | verdict | owner |');
console.log('|---|---|---|---|---|');
for (const r of recs) console.log(`| ${r.id} | ${r.tier} | ${String(r.intv).replace(/\|/g, '/').slice(0, 90)} | **${r.verdict}**${r.fu4 ? ' (FU-4 pending)' : ''}${r.known ? ` (${r.known} pending)` : ''} | ${String(r.owner).replace(/\|/g, '/').slice(0, 60)} |`);
