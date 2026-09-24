// Main-thread side of the engine+renderer (brief §3.4): an OffscreenCanvas worker when possible, the same
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts every rAF timestamp. While the tab is hidden a 1 s interval advances sim time in bulk.
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
import { MonitorCore } from './monitor-core.ts';
import type { ClockAnchor, CoreOptions, FromWorker, Size, ToWorker } from './protocol.ts';

export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' }>;

export const READY_TIMEOUT_MS = 2000;
const HIDDEN_PUMP_MS = 1000;

export interface Host {
  readonly canvas: HTMLCanvasElement;
  readonly path: Promise<RenderPath>;
  command(cmd: Command): Promise<DispatchResult>;
  control(msg: ControlMsg): void;
  destroy(): void;
}

export function canUseWorker(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype
  );
}

const epochNow = (t: number = performance.now()): number => performance.timeOrigin + t;

function mainHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
  const core = new MonitorCore(canvas, ctx, size, opts, onEvents);
  let raf = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const loop = (t: number) => {
    core.frame(epochNow(t));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = document.visibilityState === 'hidden';
    core.setVisible(!hidden);
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => core.catchUp(epochNow()), HIDDEN_PUMP_MS);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      core.catchUp(epochNow());
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    canvas,
    path: Promise.resolve('main'),
    command: (cmd) => Promise.resolve(core.command(cmd)),
    control: (m) => {
      if (m.type === 'resize') core.resize(m.size);
      else if (m.type === 'timeScale') core.clock.timeScale = m.k;
      else if (m.type === 'pause') core.clock.pause();
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else core.calibrate(m.pxPerMm);
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}

function workerHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const worker = new EngineWorker();
  const offscreen = canvas.transferControlToOffscreen();
  const pending = new Map<number, (r: DispatchResult) => void>();
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const post = (m: ToWorker, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  const path = new Promise<RenderPath>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), READY_TIMEOUT_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        pumping = m.path === 'worker-pump';
        resolve(m.path);
      } else if (m.type === 'events') onEvents(m.anchor, m.events);
      else if (m.type === 'result') {
        pending.get(m.reqId)?.(m.result);
        pending.delete(m.reqId);
      } else {
        clearTimeout(timer);
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
    };
  });
  const loop = (t: number) => {
    if (pumping) post({ type: 'frame', epochMs: epochNow(t) });
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = document.visibilityState === 'hidden';
    post({ type: 'visible', visible: !hidden });
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => post({ type: 'catchUp', epochMs: epochNow() }), HIDDEN_PUMP_MS);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      post({ type: 'catchUp', epochMs: epochNow() });
    }
  };
  document.addEventListener('visibilitychange', onVis);
  post({ type: 'init', canvas: offscreen, size, opts, mainPump: false }, [offscreen]);
  return {
    canvas,
    path,
    command: (cmd) =>
      new Promise<DispatchResult>((resolve) => {
        const id = ++reqId;
        pending.set(id, resolve);
        post({ type: 'command', reqId: id, cmd });
      }),
    control: (m) => post(m),
    destroy: () => {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
      worker.terminate();
    },
  };
}

/**
 * Create the host. With worker 'auto' it tries the OffscreenCanvas worker; if that fails before
 * 'ready', the transferred canvas is replaced by a fresh one and the main-thread path takes over.
 */
export function createHost(
  canvas: HTMLCanvasElement,
  size: Size,
  opts: CoreOptions,
  worker: 'auto' | 'off',
  onEvents: EventsHandler,
): Promise<Host> {
  if (worker === 'off' || !canUseWorker()) return Promise.resolve(mainHost(canvas, size, opts, onEvents));
  let h: Host;
  try {
    h = workerHost(canvas, size, opts, onEvents);
  } catch {
    return Promise.resolve(mainHost(canvas, size, opts, onEvents));
  }
  return h.path.then(
    () => h,
    () => {
      h.destroy();
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
      canvas.replaceWith(fresh);
      return mainHost(fresh, size, opts, onEvents);
    },
  );
}
