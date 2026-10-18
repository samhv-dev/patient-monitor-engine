// IIFE build only (`vite build --mode iife` aliases './engine.worker.ts?worker&inline' to this file). The ESM
// build inlines a second, separate copy of the engine for the worker; the single-file IIFE instead starts its
// worker from ITS OWN source text (the `__pmeSelf` wrapper that vite.config.ts adds after minification), so the
// engine ships once. Inside that worker, engine.worker.ts sees a worker scope and calls startWorker().
import './engine.worker.ts';

declare const __pmeSelf: () => void;

export default class EngineWorker {
  constructor() {
    const url = URL.createObjectURL(new Blob([`(${String(__pmeSelf)})();`], { type: 'text/javascript' }));
    try {
      return new Worker(url, { name: 'pme-engine' });
    } finally {
      URL.revokeObjectURL(url); // what Vite's own inline worker does: the worker has already been created
    }
  }
}
