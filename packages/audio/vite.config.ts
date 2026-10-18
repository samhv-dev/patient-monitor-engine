import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Sibling @pme packages stay imports (npm consumers get one copy of each); third-party code stays bundled.
    rollupOptions: { external: [/^@pme\//] },
  },
});
