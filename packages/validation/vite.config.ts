/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The tick benchmark measures wall-clock time, so CI runs it alone on the runner: the build job's fast set
// (PME_TEST_SET=fast) leaves it out and a later step runs only it (PME_TEST_SET=perf), as apps/demo does with its
// showcase set. Unset = everything (a local `pnpm test`).
const PERF = 'test/perf/tick-bench.test.ts';
const set = process.env.PME_TEST_SET;

export default defineConfig({
  test: {
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', PERF] } : {}),
    ...(set === 'perf' ? { include: [PERF] } : {}),
  },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
