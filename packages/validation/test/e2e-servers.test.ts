// Every e2e server on its own port. Vite 6 reads a port of 0 as "5173, or the next free one", so
// when each e2e file started Vite itself every file's server took 5173 in turn, and a page a test left open reloaded
// onto the next file's server. apps/demo/e2e/app-support.ts's startVite / startVitePreview are now the only way an e2e
// file starts a Vite server: a port the operating system hands out (or PME_E2E_PORT + the worker's index), strictly
// held. This keeps it so.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const e2e = join(root, 'apps/demo/e2e');
const helper = 'app-support.ts';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(f) ? [p] : [];
});

/** The values a file imports from 'vite' (type-only names left out), and whether it imports the module whole. */
function viteValues(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/^import\s+(?!type\b)([^;]*?)\s+from\s+'vite'/gm)) {
    const clause = m[1]!;
    if (/^\*|^[A-Za-z_$][\w$]*\s*(,|$)/.test(clause)) out.push('(the whole module)');
    for (const n of /\{([^}]*)\}/.exec(clause)?.[1]?.split(',') ?? []) {
      const name = n.trim();
      if (name && !name.startsWith('type ')) out.push(name.split(/\s+as\s+/)[0]!);
    }
  }
  return out;
}

describe('e2e servers on their own ports', () => {
  it('no e2e file but app-support.ts starts a Vite server itself (createServer, preview or the whole module)', () => {
    const all = files(e2e);
    expect(all.length).toBeGreaterThan(100);
    const bad = all
      .filter((p) => relative(e2e, p) !== helper)
      .map((p) => ({ file: relative(e2e, p), started: viteValues(readFileSync(p, 'utf8')).filter((n) => n === 'createServer' || n === 'preview' || n === '(the whole module)') }))
      .filter((r) => r.started.length > 0);
    expect(bad, "start it with startVite() / startVitePreview() from './app-support.ts'").toEqual([]);
    const users = all.filter((p) => /\bstartVite(Preview)?\(/.test(readFileSync(p, 'utf8')));
    expect(users.length).toBeGreaterThan(60);
  });

  it('the helper holds each port strictly and never asks Vite for port 0', () => {
    const src = readFileSync(join(e2e, helper), 'utf8');
    expect(src.match(/strictPort: true/g)?.length).toBe(2); // the dev server and the preview server
    expect(src).not.toMatch(/port:\s*0\b/);
    expect(src).toMatch(/listen\(0, '127\.0\.0\.1'/); // the operating system's free port
  });

  it('the check itself reads imports as they are written', () => {
    expect(viteValues("import { createServer, type ViteDevServer } from 'vite';")).toEqual(['createServer']);
    expect(viteValues("import type { ViteDevServer } from 'vite';")).toEqual([]);
    expect(viteValues("import { build, type PreviewServer } from 'vite';")).toEqual(['build']);
    expect(viteValues("import * as vite from 'vite';")).toEqual(['(the whole module)']);
    expect(viteValues("import {createServer as cs} from 'vite';")).toEqual(['createServer']);
  });
});
