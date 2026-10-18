// Worker entry: engine + renderer on an OffscreenCanvas (brief §3.4). Uses the worker's own requestAnimationFrame when
// it exists, otherwise waits for 'frame' messages from the main thread. The file starts itself only inside the worker
// we create, named 'pme-engine' (the ESM build's `?worker&inline` bundle via worker-host.ts, or the IIFE re-running its
// own source as the worker, src/iife-worker.ts). Imported anywhere else — the page, or a host's OWN worker that
// importScripts the IIFE for a headless createEngine — it is inert and never touches that scope's onmessage.
import { MonitorCore } from './monitor-core.ts';
import type { Ctx2D } from './ctx.ts';
import type { FromWorker, ToWorker } from './protocol.ts';

interface WorkerScope {
  postMessage(msg: FromWorker): void;
  onmessage: ((ev: MessageEvent<ToWorker>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
}

let scope: WorkerScope; // Set by startWorker()
let core: MonitorCore | null = null;
let useRaf = false;

function loop(t: number): void {
  core?.frame(performance.timeOrigin + t);
  scope.requestAnimationFrame?.(loop);
}

function onMessage(ev: MessageEvent<ToWorker>): void {
  const m = ev.data;
  try {
    switch (m.type) {
      case 'init': {
        const ctx = m.canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
        core = new MonitorCore(m.canvas, ctx, m.size, m.opts, (anchor, events) => scope.postMessage({ type: 'events', anchor, events }));
        useRaf = !m.mainPump && typeof scope.requestAnimationFrame === 'function';
        scope.postMessage({ type: 'ready', path: useRaf ? 'worker-raf' : 'worker-pump' });
        if (useRaf) scope.requestAnimationFrame?.(loop);
        return;
      }
      case 'frame':
        if (!useRaf) core?.frame(m.epochMs);
        return;
      case 'catchUp':
        core?.catchUp(m.epochMs);
        return;
      case 'command': {
        const result = core ? core.command(m.cmd) : { accepted: false, tick: 0, reason: 'not initialised' };
        scope.postMessage({ type: 'result', reqId: m.reqId, result });
        return;
      }
      case 'resize':
        core?.resize(m.size);
        return;
      case 'timeScale':
        if (core) core.clock.timeScale = m.k;
        return;
      case 'pause':
        core?.clock.pause();
        return;
      case 'resume':
        core?.clock.resume();
        return;
      case 'fps':
        core?.setFps(m.fps);
        return;
      case 'calibrate':
        core?.calibrate(m.pxPerMm);
        return;
      case 'visible':
        core?.setVisible(m.visible);
        return;
      case 'snapshot':
        if (core) scope.postMessage({ type: 'snapshot', reqId: m.reqId, snapshot: core.engine.snapshot() });
        else scope.postMessage({ type: 'error', message: 'not initialised', reqId: m.reqId });
        return;
      case 'plan':
        core?.setPlan(m.plan);
        return;
      case 'capture12': // The 12 lead arrays are transferred, not copied
        try {
          if (!core) throw new Error('not initialised');
          const capture = core.capture12();
          (scope.postMessage as (msg: FromWorker, transfer: Transferable[]) => void)(
            { type: 'capture12', reqId: m.reqId, capture },
            Object.values(capture.leads).map((a) => a.buffer),
          );
        } catch (err) {
          scope.postMessage({ type: 'capture12', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
      case 'advance': // a fast-forward step; its events were posted before this answer
        if (!core) throw new Error('not initialised');
        scope.postMessage({ type: 'advanced', reqId: m.reqId, ...core.advance(m.ticks, m.last) });
        return;
      case 'restore':
        try {
          if (!core) throw new Error('not initialised');
          core.restore(m.snapshot); // The lanes restart with the engine
          scope.postMessage({ type: 'restored', reqId: m.reqId });
        } catch (err) {
          scope.postMessage({ type: 'restored', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
    }
  } catch (err) {
    // A request that threw answers its own reqId, so the caller's promise rejects instead of waiting forever
    const reqId = 'reqId' in m ? m.reqId : undefined;
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err), ...(reqId !== undefined ? { reqId } : {}) });
  }
}

/** Serve one monitor from this worker scope. */
export function startWorker(s: WorkerScope): void {
  scope = s;
  scope.onmessage = onMessage;
}

if (typeof document === 'undefined' && (globalThis as { name?: unknown }).name === 'pme-engine') {
  startWorker(globalThis as unknown as WorkerScope);
}
