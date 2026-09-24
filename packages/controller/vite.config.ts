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
});
