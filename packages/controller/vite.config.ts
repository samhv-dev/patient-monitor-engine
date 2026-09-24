/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Two entries: the root (no ajv) and the scenario runner (ajv + built-in JSON), so embedders pay for ajv only
    // when they import '@pme/controller/scenario'.
    lib: { entry: { index: 'src/index.ts', scenario: 'src/scenario/index.ts' }, formats: ['es'] },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // Scenario tests run whole ACLS cases through a real engine; ~3 s locally, >5 s on the 2-vCPU CI runner.
  test: { testTimeout: 60_000 },
});
