// Stage V.1: prints docs/physiology/stage-v-lung-pathology-data.md — loads catalogue-md.ts through Vite's SSR loader
// (workspace packages, TypeScript and JSON imports resolved as the tests resolve them).
// Run from the repo root: node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const vite = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await vite.ssrLoadModule('/scripts/catalogue-md.ts');
  process.stdout.write(`${m.renderCatalogueMd()}\n`);
} finally {
  await vite.close();
}
