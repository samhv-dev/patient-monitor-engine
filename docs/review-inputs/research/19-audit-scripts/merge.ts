// Folds a partial store written with DI_OUT=<file> into out/cells.json (the cell records replace their namesakes).
// Usage: node merge.ts <partial.json>
import { readFileSync, writeFileSync } from 'node:fs';
const main = new URL('./out/cells.json', import.meta.url);
const a = JSON.parse(readFileSync(main, 'utf8')) as Record<string, unknown>;
const b = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as Record<string, unknown>;
writeFileSync(main, JSON.stringify({ ...a, ...b }, null, 1));
console.log(`merged ${Object.keys(b).length} records → ${Object.keys({ ...a, ...b }).length}`);
