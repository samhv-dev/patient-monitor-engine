/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// CI splits the engine tests in two jobs (see .github/workflows/ci.yml): the SLOW set (multi-sim-hour drift runs,
// long clinical scenarios) runs serially in its own job so its long synchronous stretches never starve the Vitest
// worker RPC of the main job ("Timeout calling onTaskUpdate" after Stage 7a/7b raised the per-tick cost).
// PME_TEST_SET=fast excludes the slow set, PME_TEST_SET=slow runs only it (one file at a time); unset = everything.
const SLOW = [
  'test/engine/**/*longrun*.test.ts',
  'test/engine/engine-pipeline.test.ts', // holds the ECG 6 h/24 h drift run
  'test/engine/lung-recruitment.test.ts',
  'test/engine/lung-unilateral.test.ts',
  'test/engine/lung-copd.test.ts',
  'test/engine/resp-coupling.test.ts',
  'test/engine/hemo-nibp.test.ts',
  'test/engine/circ-sanity-*.test.ts',
  'test/engine/pk-acceptance-*.test.ts',
];
const set = process.env.PME_TEST_SET;

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // Stage 7a: every engine now integrates the four-chamber circulation (≈ +60 % CPU per tick); the 5 s default left
  // no margin for the short engine tests on a loaded 2-vCPU runner. Long tests keep their explicit budgets.
  test: {
    testTimeout: 30_000,
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', ...SLOW] } : {}),
    ...(set === 'slow' ? { include: SLOW, fileParallelism: false } : {}),
  },
});
