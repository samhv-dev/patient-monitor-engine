// Main-thread side of the engine+renderer (brief §3.4): an OffscreenCanvas worker when possible, the same
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts every rAF timestamp. While the tab is hidden a 1 s interval advances sim time in bulk.
import type { Capture12, Command, DispatchResult, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
import { MonitorCore } from './monitor-core.ts';
import type { ClockAnchor, CoreOptions, FromWorker, Size, ToWorker } from './protocol.ts';

export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' | 'plan' }>; // Stage 4b: plan

export const READY_TIMEOUT_MS = 2000;
const HIDDEN_PUMP_MS = 1000;
/** FU-11 (F06, BA06): a worker silent this long with requests waiting is dead (its frames post every ≤ 250 ms) [ENG]. */
export const WORKER_SILENT_MS = 3000;
/** …unless the page caught up a hidden stretch this recently (one catch-up can run several seconds) [ENG]. */
const CATCHUP_GRACE_MS = 30_000;
const WATCH_MS = 500;

export interface Host {
  readonly canvas: HTMLCanvasElement;
  readonly path: Promise<RenderPath>;
  command(cmd: Command): Promise<DispatchResult>;
  control(msg: ControlMsg): void;
  /** Engine snapshot (renderer request R-1, ruling R25). */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore the engine and put the sim clock at the snapshot's tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** Stage 4b: the last 10 s as a 12-lead capture (brief §6.6). */
  capture12(): Promise<Capture12>;
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
    snapshot: () => Promise.resolve(core.engine.snapshot()),
    restore: async (s) => core.restore(s), // FU-11 (F05, BA01): the lanes restart with the engine
    control: (m) => {
      if (m.type === 'resize') core.resize(m.size);
      else if (m.type === 'timeScale') core.clock.timeScale = m.k;
      else if (m.type === 'pause') core.clock.pause();
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else if (m.type === 'plan') core.setPlan(m.plan); // Stage 4b
      else core.calibrate(m.pxPerMm);
    },
    capture12: () => Promise.resolve().then(() => core.capture12()), // Stage 4b
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
  // FU-11 (F06, BA06): ONE table of outstanding requests, each with its resolve AND reject. A terminal failure (the worker
  // crashed after ready, went silent, or the monitor was destroyed) rejects every one of them once and every later call
  // at once — a bookmark, a command or a capture can no longer wait forever, nor block the host's command chain.
  const requests = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void; command?: boolean }>();
  let failure: Error | null = null;
  // FU-11 Gate A: a COMMAND waiting at destroy (or sent after it) is refused like any refusal, not rejected — a fire-and-
  // forget dispatch (a remounting page, the ventilator link, mount's ECG-filter command) must not become an unhandled
  // rejection; snapshots, restores and captures still reject
  let destroyed = false;
  const refusedDestroyed = (): DispatchResult => ({ accepted: false, tick: 0, reason: 'the monitor was destroyed' });
  let ready = false;
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  let lastHeard = performance.now();
  let lastCatchUp = -Infinity;
  let watch: ReturnType<typeof setInterval> | null = null;
  let lastWatch = 0;
  const post = (m: ToWorker, transfer: Transferable[] = []) => {
    if (m.type === 'catchUp') lastCatchUp = performance.now();
    if (!failure) worker.postMessage(m, transfer);
  };
  const stopWatch = () => {
    if (watch !== null) clearInterval(watch);
    watch = null;
  };
  const fail = (err: Error, report = true) => {
    if (failure) return;
    failure = err;
    stopWatch();
    for (const r of requests.values()) r.reject(err);
    requests.clear();
    // R50 M15: the failure is final (no fallback); the page hears it — bubbling from the canvas — and can say so
    if (report) canvas.dispatchEvent(new CustomEvent('pme-monitor-failed', { bubbles: true, detail: { reason: err.message } }));
  };
  const settle = (id: number, f: (r: { resolve: (v: never) => void; reject: (e: Error) => void }) => void) => {
    const r = requests.get(id);
    if (!r) return; // already failed (a late answer from a worker that came back) or unknown
    requests.delete(id);
    f(r);
  };
  /** Silent death (native terminate fires no event): the worker posts at least every 250 ms while visible. */
  const check = () => {
    const now = performance.now();
    const late = now - lastWatch > 4 * WATCH_MS; // this page was blocked itself: the worker's answers may be queued unread
    lastWatch = now;
    if (requests.size === 0) return stopWatch();
    if (late) return void (lastHeard = Math.max(lastHeard, now - WATCH_MS));
    if (document.visibilityState !== 'visible' || now - lastCatchUp < CATCHUP_GRACE_MS) return; // a long catch-up runs silently
    if (now - lastHeard > WORKER_SILENT_MS) {
      fail(new Error("the monitor's worker stopped responding"));
      worker.terminate();
    }
  };
  const request = <T>(make: (id: number) => ToWorker, command = false): Promise<T> => {
    if (failure) return Promise.reject(failure);
    return new Promise<T>((resolve, reject) => {
      const id = ++reqId;
      requests.set(id, { resolve: resolve as (v: never) => void, reject, command });
      if (watch === null) {
        lastWatch = performance.now();
        watch = setInterval(check, WATCH_MS);
      }
      post(make(id));
    });
  };
  const path = new Promise<RenderPath>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), READY_TIMEOUT_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      lastHeard = performance.now();
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        ready = true;
        pumping = m.path === 'worker-pump';
        resolve(m.path);
      } else if (m.type === 'events') onEvents(m.anchor, m.events);
      else if (m.type === 'result') settle(m.reqId, (r) => r.resolve(m.result as never));
      else if (m.type === 'snapshot') settle(m.reqId, (r) => r.resolve(m.snapshot as never));
      else if (m.type === 'restored') settle(m.reqId, (r) => (m.error === undefined ? r.resolve(undefined as never) : r.reject(new Error(m.error))));
      else if (m.type === 'capture12') settle(m.reqId, (r) => (m.capture ? r.resolve(m.capture as never) : r.reject(new Error(m.error ?? 'capture12 failed'))));
      else if (m.reqId !== undefined) settle(m.reqId, (r) => r.reject(new Error(m.message)));
      else if (!ready) {
        clearTimeout(timer);
        reject(new Error(m.message));
      } else console.error('[pme worker]', m.message);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
      if (ready) fail(new Error(`the monitor's worker failed: ${e.message}`)); // its frame loop does not survive an uncaught error
    };
    worker.onmessageerror = () => {
      // an answer that cannot be read: the requests waiting for it would never settle
      for (const r of requests.values()) r.reject(new Error("a reply from the monitor's worker could not be read"));
      requests.clear();
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
    command: (cmd) => (destroyed ? Promise.resolve(refusedDestroyed()) : request<DispatchResult>((reqId) => ({ type: 'command', reqId, cmd }), true)),
    snapshot: () => request<PatientSnapshot>((reqId) => ({ type: 'snapshot', reqId })),
    restore: (snapshot) => request<void>((reqId) => ({ type: 'restore', reqId, snapshot })),
    control: (m) => post(m),
    capture12: () => request<Capture12>((reqId) => ({ type: 'capture12', reqId })), // Stage 4b
    destroy: () => {
      destroyed = true;
      for (const [id, r] of requests) {
        if (!r.command) continue;
        requests.delete(id);
        r.resolve(refusedDestroyed() as never);
      }
      fail(new Error('the monitor was destroyed'), false);
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
