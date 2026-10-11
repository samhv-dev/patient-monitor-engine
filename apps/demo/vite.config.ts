/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
// Stage 11: the showcase cards run on the engine for 10–60 sim-min each (≈ 3.5 min in all, alone). CI runs them in the test-slow
// job's `showcase` group (PME_TEST_SET=showcase, one file at a time); the main job's fast set (PME_TEST_SET=fast) leaves
// them out, as engine-core does with its SLOW set. Unset = everything (a local `pnpm test`).
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
        stage2: page('stage2'), // Stage 2
        stage3: page('stage3'), // Stage 3
        stage7b: page('stage7b'), // Stage 7b
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
        'stage4a-skins': page('stage4a-skins'),
        'stage4b-device': page('stage4b-device'), // Stage 4b
        'stage6b-acls': page('stage6b-acls'),
        'validation-review': page('validation-review'), // Stage 8a
        'validation-bedside': page('validation-bedside'), // Stage 8a
        'validation-perf': page('validation-perf'), // Stage 8a
        'vent-hamilton': page('vent-hamilton'), // Stage V
        'vent-link': page('vent-link'), // Stage V
        stage7c: page('stage7c'), // Stage 7c
        stage7a: page('stage7a'), // Stage 7a
        stage7g: page('stage7g'), // Stage 7g
        stage7f: page('stage7f'), // Stage 7f
        stage7e: page('stage7e'), // Stage 7e
        stage7d: page('stage7d'), // Stage 7d
        'physiology-console': page('physiology-console'), // Stage 7x
        fu6: page('fu6'), // FU-6
        fu4: page('fu4'), // FU-4 evidence page (Task 23)
        fu7: page('fu7'), // FU-7 evidence page (Task 20)
      },
    },
  },
});
