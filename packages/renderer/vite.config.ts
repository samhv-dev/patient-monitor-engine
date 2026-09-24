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
});
