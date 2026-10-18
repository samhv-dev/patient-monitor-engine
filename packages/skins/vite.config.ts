import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Two entries, like @pme/controller — the root (no ajv; what the renderer and the IIFE use) and './validate' (ajv,
    // bundled: N-010), which package.json already exports.
    lib: { entry: { index: 'src/index.ts', validate: 'src/validate.ts' }, formats: ['es'] },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { external: [/^@pme\//] },
  },
});
