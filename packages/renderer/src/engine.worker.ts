// Worker entry: engine + renderer on an OffscreenCanvas (brief §3.4). Uses the worker's own
// requestAnimationFrame when it exists, otherwise waits for 'frame' messages from the main thread.
import { MonitorCore } from './monitor-core.ts';
import type { Ctx2D } from './ctx.ts';
import type { FromWorker, ToWorker } from './protocol.ts';

interface WorkerScope {
  postMessage(msg: FromWorker): void;
  onmessage: ((ev: MessageEvent<ToWorker>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
}

const scope = self as unknown as WorkerScope;
let core: MonitorCore | null = null;
let useRaf = false;

function loop(t: number): void {
  core?.frame(performance.timeOrigin + t);
  scope.requestAnimationFrame?.(loop);
}

scope.onmessage = (ev) => {
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
        else scope.postMessage({ type: 'error', message: 'not initialised' });
        return;
      case 'restore':
        try {
          if (!core) throw new Error('not initialised');
          core.engine.restore(m.snapshot);
          core.clock.setTick(m.snapshot.tick);
          scope.postMessage({ type: 'restored', reqId: m.reqId });
        } catch (err) {
          scope.postMessage({ type: 'restored', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
    }
  } catch (err) {
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
