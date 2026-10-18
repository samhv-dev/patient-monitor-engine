// Finishes a package's dist/ for publishing (run by each library package's "build" after vite and tsc):
// (1) declaration files keep the source's `.ts` import specifiers (tsc 5.9 does not rewrite them in .d.ts), so
//     rewrite relative `./x.ts` specifiers to `./x.js`, which every TypeScript resolution mode maps to x.d.ts;
// (2) copy the MIT LICENSE, NOTICES.md and the whole LICENSES/ directory into dist/, so every published copy
//     carries the licence, the attributions its bundled data needs (ODC-By templates, Apache-2.0-derived files)
//     and the full third-party texts (Apache-2.0; ajv's MIT family; fast-uri's BSD-3-Clause).
// Usage (from a package directory): node --experimental-strip-types ../../scripts/finish-dist.ts
import { copyFileSync, cpSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SPEC_RE = /(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+?)\.ts\2/g;

/** Rewrites relative `.ts` specifiers in one declaration file's text. */
export function rewriteDts(text: string): string {
  return text.replace(SPEC_RE, (_m, pre: string, q: string, path: string) => `${pre}${q}${path}.js${q}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const pkg = resolve(process.argv[2] ?? '.');
  const root = resolve(import.meta.dirname, '..');
  let n = 0;
  for (const f of walk(join(pkg, 'dist', 'types')).filter((f) => f.endsWith('.d.ts'))) {
    const before = readFileSync(f, 'utf8');
    const after = rewriteDts(before);
    if (after !== before) {
      writeFileSync(f, after);
      n++;
    }
  }
  for (const f of ['LICENSE', 'NOTICES.md']) copyFileSync(join(root, f), join(pkg, 'dist', f));
  cpSync(join(root, 'LICENSES'), join(pkg, 'dist', 'LICENSES'), { recursive: true });
  console.log(`finish-dist: ${n} declaration files rewritten; LICENSE, NOTICES.md and LICENSES/ copied into dist/`);
}
