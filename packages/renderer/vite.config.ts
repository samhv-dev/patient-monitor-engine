/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PatientMonitor', // IIFE global: window.PatientMonitor (brief §7.6)
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'iife' ? 'patient-monitor.iife.js' : 'index.js'),
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // The renderer tests drive a real engine through the sweep (5–8 s budgets); on the loaded CI runner the 5 s default
  // timed out once per run since Stage 7 raised the per-tick cost (G8a CI). Same budget as engine-core.
  test: { testTimeout: 30_000 },
});
