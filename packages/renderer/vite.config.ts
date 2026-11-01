/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Two builds (package.json "build"): the default mode emits the ESM entry dist/index.js (Vite inlines the worker);
// `--mode iife` emits the single-file dist/patient-monitor.iife.js (global PatientMonitor, brief §7.6). The IIFE's
// worker is the file's OWN source (src/iife-worker.ts), so the engine ships once (544 → 285 KB gzip on 48864439).
const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string };
const BANNER =
  `/*! patient-monitor-engine ${version} (@pme/renderer IIFE) | MIT, (c) Ali Mahdavi and contributors | ` +
  'https://github.com/samhv-dev/patient-monitor-engine | bundles ODC-By 1.0 ECG templates (PhysioNet CUDB, MIT-BIH) ' +
  'and code derived from Apache-2.0 sources: see NOTICES.md */';

// After minification, wrap the IIFE in a named function whose source text is the whole file (iife-worker.ts starts
// the worker from `(${__pmeSelf})()`). Banner and wrapper take one line each, so the source map gains two empty
// leading lines, and the sourceMappingURL comment stays last.
const selfWrap: Plugin = {
  name: 'pme-iife-self-wrap',
  generateBundle(_o, bundle) {
    for (const c of Object.values(bundle)) {
      if (c.type !== 'chunk' || !c.fileName.endsWith('.iife.js')) continue;
      const url = /\n\/\/# sourceMappingURL=[^\n]*\n?$/.exec(c.code)?.[0] ?? '';
      c.code = `${BANNER}\n(function __pmeSelf(){\n${c.code.slice(0, c.code.length - url.length)}\nself.PatientMonitor=PatientMonitor;})();${url}`;
      const map = bundle[`${c.fileName}.map`];
      if (map?.type === 'asset' && typeof map.source === 'string') {
        const m = JSON.parse(map.source) as { mappings: string };
        map.source = JSON.stringify({ ...m, mappings: `;;${m.mappings}` });
      }
    }
  },
};

export default defineConfig(({ mode }) => {
  const iife = mode === 'iife';
  return {
    resolve: iife
      ? { alias: [{ find: /^\.\/engine\.worker\.ts\?worker&inline$/, replacement: resolve(import.meta.dirname, 'src/iife-worker.ts') }] }
      : {},
    plugins: iife ? [selfWrap] : [],
    // The engine's build id (packages/engine-core/src/version.ts) in both builds; 'dev' unless PME_BUILD is set.
    define: { __PME_ENGINE_BUILD__: JSON.stringify(process.env.PME_BUILD ?? 'dev') },
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'PatientMonitor', // IIFE global: window.PatientMonitor (brief §7.6)
        formats: iife ? ['iife'] : ['es'],
        fileName: () => (iife ? 'patient-monitor.iife.js' : 'index.js'),
      },
      outDir: 'dist',
      emptyOutDir: !iife, // the IIFE pass runs second and keeps the ESM output
      sourcemap: true,
      // ESM: sibling @pme packages stay imports (one copy each in a consumer's bundle); the IIFE bundles everything.
      rollupOptions: iife ? {} : { external: [/^@pme\//] },
    },
    // The renderer tests drive a real engine through the sweep (5–8 s budgets); on the loaded CI runner the 5 s default
    // timed out once per run once the full physiology raised the per-tick cost. Same budget as engine-core.
    // test/yield-between-tests.ts: the worker's event loop turns between tests (the build job's onTaskUpdate timeout).
    test: { testTimeout: 30_000, setupFiles: ['test/yield-between-tests.ts', 'test/_diag/loop-gap.ts'] },
  };
});
