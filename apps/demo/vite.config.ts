/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
// The showcase cards run on the engine for 10–60 sim-min each (≈ 3.5 min in all, alone). CI runs them in the
// test-slow job's `showcase` group (PME_TEST_SET=showcase, one file at a time); the main job's fast set
// (PME_TEST_SET=fast) leaves them out, as engine-core does with its SLOW set. Unset = everything (a local `pnpm test`).
const SHOWCASE_SLOW = 'src/app/showcase/*.slow.test.ts';
const set = process.env.PME_TEST_SET;

export default defineConfig({
  test: {
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', SHOWCASE_SLOW] } : {}),
    ...(set === 'showcase' ? { include: [SHOWCASE_SLOW], fileParallelism: false } : {}),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: page('index'), stage0: page('stage0'), stage1: page('stage1'), stage5: page('stage5'),
        stage2: page('stage2'),
        stage3: page('stage3'),
        stage7b: page('stage7b'),
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
        'stage4a-skins': page('stage4a-skins'),
        'stage4b-device': page('stage4b-device'),
        'stage6b-acls': page('stage6b-acls'),
        'validation-review': page('validation-review'),
        'validation-bedside': page('validation-bedside'),
        'validation-perf': page('validation-perf'),
        'vent-hamilton': page('vent-hamilton'), // Stage V
        'vent-link': page('vent-link'), // Stage V
        stage7c: page('stage7c'),
        stage7a: page('stage7a'),
        stage7g: page('stage7g'),
        stage7f: page('stage7f'),
        stage7e: page('stage7e'),
        stage7d: page('stage7d'),
        'physiology-console': page('physiology-console'),
        fu6: page('fu6'),
        fu4: page('fu4'), // arrest evidence page
        fu7: page('fu7'), // drug evidence page
      },
    },
  },
  define: { __PME_BUILD__: JSON.stringify(buildId()) }, // Printed on every page of the debrief
});

/** The build a page was served from: the git commit (+ when the tree has uncommitted changes) and the date; "unknown"
 *  outside a git checkout. */
function buildId(): string {
  const git = (...a: string[]) => spawnSync('git', a, { cwd: import.meta.dirname, encoding: 'utf8' });
  const head = git('rev-parse', '--short=8', 'HEAD');
  if (head.status !== 0) return `unknown ${new Date().toISOString().slice(0, 10)}`;
  const dirty = git('status', '--porcelain', '--untracked-files=no').stdout.trim() ? '+' : '';
  return `${head.stdout.trim()}${dirty} ${new Date().toISOString().slice(0, 10)}`;
}
