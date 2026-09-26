// Gate 5 evidence: one PNG per catalogue strip (every rhythm + modifier/artefact showcases), taken in headless
// system Google Chrome (docs/gates/stage-1.md: the Playwright browser CDN is not reachable here), each ≤ 50 KB.
// Usage (repo root): node --experimental-strip-types apps/demo/scripts/stage5-shots.ts [outDir]
// Stage 5.1: ONLY=key1,key2 limits the run to those catalogue keys; SUFFIX=-after names files <key>-after.png.
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { CATALOGUE } from '../src/stage5-catalogue.ts';

const MAX_BYTES = 50 * 1024;
const out = resolve(process.argv[2] ?? 'docs/gates/stage-5');
mkdirSync(out, { recursive: true });
const server = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 5205, strictPort: true }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1040, height: 340 }, deviceScaleFactor: 1 });
const failures: string[] = [];
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const items = CATALOGUE.filter((c) => only === null || only.has(c.key));
try {
  for (const item of items) {
    await page.goto(`http://localhost:5205/stage5.html?strip=${item.key}`);
    await page.waitForFunction(() => document.body.dataset.ready !== undefined, undefined, { timeout: 60_000 });
    const file = resolve(out, `${item.key}${process.env.SUFFIX ?? ''}.png`);
    await page.locator('#strip').screenshot({ path: file });
    const bytes = statSync(file).size;
    console.log(`${item.key.padEnd(18)} ${String(bytes).padStart(6)} B  ${item.label}`);
    if (bytes > MAX_BYTES) failures.push(`${item.key}: ${bytes} B > ${MAX_BYTES}`);
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`${items.length} strips written to ${out}`);
