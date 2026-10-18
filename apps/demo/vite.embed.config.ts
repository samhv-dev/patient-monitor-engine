import { defineConfig } from 'vite';

// The ventilator-simulator embed (Stage 8b): src/vent/embed.ts as one classic script, global PmeVentilatorEmbed.
// It needs window.PatientMonitor (packages/renderer/dist/patient-monitor.iife.js) at run time; scripts/build-embed.mjs
// then writes dist/embed/ventilator-monitor.html next to both files. Runs after the page build (which empties dist/).
export default defineConfig({
  build: {
    lib: { entry: 'src/vent/embed.ts', name: 'PmeVentilatorEmbed', formats: ['iife'], fileName: () => 'pme-ventilator-embed.iife.js' },
    outDir: 'dist/embed',
    emptyOutDir: true,
    sourcemap: true,
  },
});
