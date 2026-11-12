/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
// Every developer page (apps/demo/dev/*.html) is a build input; the app's Developer view (src/app/views/dev.ts) lists them.
const devPages = Object.fromEntries(readdirSync(resolve(import.meta.dirname, 'dev')).filter((f) => f.endsWith('.html')).map((f) => [f.slice(0, -5), page(`dev/${f.slice(0, -5)}`)]));
// The showcase cards run on the engine for 10–60 sim-min each (≈ 3.5 min in all, alone). CI runs them in the
// test-slow job's `showcase-a` and `showcase-b` groups (PME_TEST_SET=showcase-a|showcase-b, one file at a time); the main job's fast set
// (PME_TEST_SET=fast) leaves them out, as engine-core does with its SLOW set. Unset = everything (a local `pnpm test`).
const SHOWCASE_SLOW = 'src/app/showcase/*.slow.test.ts';
// CI splits the showcase set in two jobs, balanced on the per-file durations of main run 42046932502 (s): a = 568
// (malignant-hyperthermia 313, healthy-induction 139, haemorrhage-anaphylaxis 116), b = 580 (haemorrhage-v2 228,
// mh-v1-v2-table 122, malignant-hyperthermia-v2 107, stab-wound-tamponade 84, induction-after-premedication 39; ports, the
// twin runs of piece B7, added here while its manifest holds no port). The build
// job checks that the halves are disjoint and together are the showcase set, so a new card file fails CI until it is
// put in one of them.
const SHOWCASE_A = ['malignant-hyperthermia', 'healthy-induction', 'haemorrhage-anaphylaxis'].map((f) => `src/app/showcase/${f}.slow.test.ts`);
const SHOWCASE_B = ['haemorrhage-v2', 'mh-v1-v2-table', 'malignant-hyperthermia-v2', 'stab-wound-tamponade', 'induction-after-premedication', 'ports'].map((f) => `src/app/showcase/${f}.slow.test.ts`);
const set = process.env.PME_TEST_SET;
const showcase = { showcase: [SHOWCASE_SLOW], 'showcase-a': SHOWCASE_A, 'showcase-b': SHOWCASE_B }[set ?? ''];

export default defineConfig({
  test: {
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', SHOWCASE_SLOW] } : {}),
    ...(showcase ? { include: showcase, fileParallelism: false } : {}),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        ...devPages,
        index: page('index'),
        'validation-review': page('validation-review'),
        'validation-bedside': page('validation-bedside'),
        'validation-perf': page('validation-perf'),
        'vent-hamilton': page('vent-hamilton'), // Stage V
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
