// Main-thread side of the engine+renderer (brief §3.4): an OffscreenCanvas worker when possible, the same
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts its rAF timestamp, one frame in flight (the next once the worker has drawn the last). While the tab
// is hidden a 1 s interval advances sim time in bulk.
import type { Capture12, Command, DispatchResult, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
import { MonitorCore } from './monitor-core.ts';
import type { ClockAnchor, CoreOptions, FromWorker, Size, ToWorker } from './protocol.ts';

export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' | 'plan' | 'ibpScales' }>;

/**
 * N48 (brief 126): a worker not ready this long after its start is LATE, and the page says so (`pme-monitor-worker-late`;
 * `pme-monitor-worker-ready` when it is). The monitor keeps waiting for it: a late worker is still loading, not lost. Until
 * brief 126 the page fell back to the main thread here for good, in silence, so a busy start decided the render path by
 * a clock (on the dev server under background QoS, 2 workers: 4 of 5 page loads; the one that made it was ready at
 * 1745 ms), and that path froze the page through a fast-forward (N47). Waited for, the same five loads were ready at
 * 2.2–6.0 s. A built page's worker is one inline bundle and
 * is ready well inside it; the Vite dev server loads it one module per request (278–1875 ms on an idle Mac). A worker
 * that fails (an error before 'ready') still hands the monitor to the main thread, and the page says that too
 * (`pme-monitor-main-thread`). 2 s: above every idle start measured, so a normal start says nothing [ENG: control].
 */
export const READY_LATE_MS = 2000;
const HIDDEN_PUMP_MS = 1000;
/**
 * A worker silent this long with requests waiting is SLOW (warned: `pme-monitor-slow`). It posts every ≤ 250 ms — its
 * frames, and from inside a long run its progress (MonitorCore.onProgress) — measured on a Mac (gaps between its
 * messages, FX-11a): p99.9 270 ms idle, 267 ms with 16 CPU-bound processes, 436 ms with those and the browser at
 * background QoS (Chromium; WebKit ≤ 269 ms): 3 s is 7× the longest gap measured. It is DEAD when, past this, a probe
 * worker started at the warning has answered — the machine runs workers and this one makes no progress; a starved
 * machine starves the probe too, and the monitor waits (FX-11a) [ENG: display].
 */
export const WORKER_SILENT_MS = 3000;
/** …unless the page caught up a hidden stretch this recently (one catch-up can run several seconds) [ENG: display]. */
const CATCHUP_GRACE_MS = 30_000;
const WATCH_MS = 500;

/** Brief 195: the reason a monitor whose engine threw while it stepped gives (`pme-monitor-failed`'s detail). */
export const stoppedReason = (message: string): string => `an error in the simulation: ${message}`;

export interface Host {
  readonly canvas: HTMLCanvasElement;
  readonly path: Promise<RenderPath>;
  /** The main-thread core, for a viewer monitor's synchronous clock (absent on the worker path). */
  readonly core?: MonitorCore;
  command(cmd: Command): Promise<DispatchResult>;
  /** R15: several commands in one engine task, in order (a stage group's commands land on its one tick). */
  commands(cmds: Command[]): Promise<DispatchResult[]>;
  control(msg: ControlMsg): void;
  /** Engine snapshot. */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore the engine and put the sim clock at the snapshot's tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** The last 10 s as a 12-lead capture (brief §6.6). */
  capture12(): Promise<Capture12>;
  /** One fast-forward step (MonitorCore.advance); resolves after the step's events were delivered. */
  advance(ticks: number, last: boolean): Promise<{ tick: number; simT: number }>;
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

/**
 * The page's turn (N47): a macrotask (a MessageChannel message: no 4 ms clamp on nested timers, no hidden-tab timer
 * throttling). `frame`: first a drawn frame — the next animation frame, then the macrotask after it, by which the frame
 * has been painted — unless the page is hidden (no frame comes; nothing is shown) or becomes hidden meanwhile. After
 * `close` every waiting and later turn rejects: the monitor was destroyed.
 */
function taskYield(): { next: (frame?: boolean) => Promise<void>; close: () => void } {
  const ch = new MessageChannel();
  const waiting: Array<() => void> = [];
  const frames = new Set<() => void>();
  let closed = false;
  const gone = () => new Error('the monitor was destroyed');
  ch.port1.onmessage = () => waiting.shift()?.();
  const task = () =>
    new Promise<void>((resolve, reject) => {
      if (closed) return reject(gone());
      waiting.push(() => (closed ? reject(gone()) : resolve()));
      ch.port2.postMessage(0);
    });
  const drawn = () =>
    new Promise<void>((resolve) => {
      if (document.visibilityState !== 'visible') return resolve();
      const done = () => {
        frames.delete(done);
        document.removeEventListener('visibilitychange', done);
        resolve();
      };
      frames.add(done); // a close ends the wait too
      document.addEventListener('visibilitychange', done);
      requestAnimationFrame(done);
    });
  return {
    next: async (frame = false) => {
      if (frame && !closed) await drawn();
      return task();
    },
    close: () => {
      closed = true;
      for (const w of waiting.splice(0)) w();
      for (const f of [...frames]) f();
      ch.port1.close();
    },
  };
}

function mainHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
  const core = new MonitorCore(canvas, ctx, size, opts, onEvents);
  // N47 (brief 126): a fast-forward step yields to the page between slices (MonitorCore.advanceInSlices), as the worker
  // path does by waiting on the worker. A command, snapshot, restore or capture asked for meanwhile runs when the step
  // has ended, as the worker answers its messages in order: never inside a step.
  const yields = taskYield();
  let busy: Promise<unknown> | null = null;
  // Brief 195: a throw while the engine steps stops it for good, as on the worker (engine.worker.ts `stop`): the frame
  // loop ends, the page is told (`pme-monitor-failed`), and every later request rejects with the reason
  let failure: Error | null = null;
  let closed = false;
  const after = <T>(f: () => T): Promise<T> => (failure ? Promise.reject(failure) : busy ? busy.then(f, f) : Promise.resolve(f()));
  let raf = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const stop = (err: unknown) => {
    failure = new Error(stoppedReason(err instanceof Error ? err.message : String(err)));
    cancelAnimationFrame(raf);
    if (hiddenTimer !== null) clearInterval(hiddenTimer);
    hiddenTimer = null;
    canvas.dispatchEvent(new CustomEvent('pme-monitor-failed', { bubbles: true, detail: { reason: failure.message } }));
  };
  const step = (f: () => void): boolean => {
    if (failure) return false;
    try {
      f();
      return true;
    } catch (err) {
      stop(err);
      return false;
    }
  };
  const loop = (t: number) => {
    if (step(() => core.frame(epochNow(t)))) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    if (failure) return;
    const hidden = document.visibilityState === 'hidden';
    core.setVisible(!hidden);
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => step(() => core.catchUp(epochNow())), HIDDEN_PUMP_MS);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      step(() => core.catchUp(epochNow()));
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    canvas,
    core,
    path: Promise.resolve('main'),
    command: (cmd) => after(() => core.command(cmd)),
    commands: (cmds) => after(() => cmds.map((c) => core.command(c))),
    snapshot: () => after(() => core.engine.snapshot()),
    restore: (s) => (failure ? Promise.reject(failure) : busy ? busy.then(() => core.restore(s), () => core.restore(s)) : (async () => core.restore(s))()), // The lanes restart with the engine
    control: (m) => {
      if (m.type === 'resize') core.resize(m.size);
      else if (m.type === 'timeScale') core.clock.timeScale = m.k;
      else if (m.type === 'pause') core.clock.pause();
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else if (m.type === 'plan') core.setPlan(m.plan);
      else if (m.type === 'ibpScales') core.setIbpScales(m.scales);
      else core.calibrate(m.pxPerMm);
    },
    capture12: () => (busy || failure ? after(() => core.capture12()) : Promise.resolve().then(() => core.capture12())),
    advance: (ticks, last) => {
      if (failure) return Promise.reject(failure);
      const run = () => core.advanceInSlices(ticks, last, yields.next);
      const p = busy ? busy.then(run, run) : run();
      busy = p;
      const done = () => void (busy === p && (busy = null));
      p.then(done, (err: unknown) => (done(), !closed && !failure && stop(err))); // a fast-forward step is the engine stepping too
      return p;
    },
    destroy: () => {
      closed = true; // the step's rejection now is the destroy's, not an error of the engine
      yields.close();
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}

function workerHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const worker = new EngineWorker({ name: 'pme-engine' }); // engine.worker.ts starts only under this name
  const offscreen = canvas.transferControlToOffscreen();
  // ONE table of outstanding requests, each with its resolve AND reject. A terminal failure (the worker crashed after
  // ready, went silent, or the monitor was destroyed) rejects every one of them once and every later call at once — a
  // bookmark, a command or a capture cannot wait forever, nor block the host's command chain.
  const requests = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void; refused?: () => unknown }>();
  let failure: Error | null = null;
  // A COMMAND waiting at destroy (or sent after it) is refused like any refusal, not rejected — a fire-and-
  // forget dispatch (a remounting page, the ventilator link, mount's ECG-filter command) must not become an unhandled
  // rejection; snapshots, restores and captures still reject
  let destroyed = false;
  const refusedDestroyed = (): DispatchResult => ({ accepted: false, tick: 0, reason: 'the monitor was destroyed' });
  let ready = false;
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  // worker-pump: a frame posted and not yet drawn. The page posts the next only when the worker says it drew this one,
  // as the worker's own rAF does not fire while it draws: posting at every page frame queued them faster than a slow
  // worker drew them, and every command waited behind the queue, seconds and growing (found under brief 47)
  let inFlight = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  let lastHeard = performance.now();
  let lastCatchUp = -Infinity;
  let watch: ReturnType<typeof setInterval> | null = null;
  let lastWatch = 0;
  // FX-11a: the warning and its probe — a fresh worker's answer says the machine runs workers; this one's silence after
  // that is its own (no progress), not the machine's load
  let warnedAt: number | null = null;
  let probe: { w: Worker | null; answeredAt: number | null } | null = null;
  const stopProbe = () => {
    probe?.w?.terminate();
    probe = null;
  };
  const startProbe = () => {
    probe = { w: null, answeredAt: null };
    const p = probe;
    try {
      const url = URL.createObjectURL(new Blob(['onmessage=()=>postMessage(0)'], { type: 'text/javascript' }));
      p.w = new Worker(url);
      URL.revokeObjectURL(url);
      p.w.onmessage = () => {
        p.answeredAt = performance.now();
        if (warnedAt !== null) dead(); // Still silent when the machine has run a fresh worker: no need to wait a watch tick
      };
      p.w.postMessage(0);
    } catch {
      p.answeredAt = performance.now(); // No probe possible (a CSP): judged on this worker's silence alone, as before
    }
    if (p.answeredAt !== null) dead();
  };
  /** The verdict: this worker is dead (FX-11a: silent past the threshold while a fresh worker answers). */
  function dead(): void {
    fail(new Error("the monitor's worker stopped responding"));
    worker.terminate();
  }
  /** The worker spoke: a warning raised is over. */
  const heard = () => {
    lastHeard = performance.now();
    if (warnedAt === null) return;
    warnedAt = null;
    stopProbe();
    canvas.dispatchEvent(new CustomEvent('pme-monitor-recovered', { bubbles: true }));
  };
  const post = (m: ToWorker, transfer: Transferable[] = []) => {
    if (m.type === 'catchUp') lastCatchUp = performance.now();
    if (!failure) worker.postMessage(m, transfer);
  };
  const stopWatch = () => {
    if (watch !== null) clearInterval(watch);
    watch = null;
    stopProbe();
  };
  const fail = (err: Error, report = true) => {
    if (failure) return;
    failure = err;
    stopWatch();
    for (const r of requests.values()) r.reject(err);
    requests.clear();
    // The failure is final (no fallback); the page hears it — bubbling from the canvas — and can say so
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
    if (now - lastHeard <= WORKER_SILENT_MS) return;
    if (warnedAt === null) {
      // Warn first (FX-11a): slow is not dead
      warnedAt = now;
      canvas.dispatchEvent(new CustomEvent('pme-monitor-slow', { bubbles: true, detail: { silentMs: Math.round(now - lastHeard) } }));
      startProbe();
      return;
    }
    // Dead: silent past the threshold — no frame, no answer, no progress from a long run — while the machine runs a
    // fresh worker (the probe answered). A starved machine starves the probe too, and the monitor waits.
    if ((probe?.answeredAt ?? null) !== null) dead();
  };
  /** `refused`: a command request's answer when the monitor is destroyed before it (a refusal, not a rejection). */
  const request = <T>(make: (id: number) => ToWorker, refused?: () => T): Promise<T> => {
    if (failure) return Promise.reject(failure);
    return new Promise<T>((resolve, reject) => {
      const id = ++reqId;
      requests.set(id, { resolve: resolve as (v: never) => void, reject, ...(refused ? { refused } : {}) });
      if (watch === null) {
        lastWatch = performance.now();
        watch = setInterval(check, WATCH_MS);
      }
      post(make(id));
    });
  };
  let timer: ReturnType<typeof setTimeout> | undefined; // READY_LATE_MS: cleared at 'ready', a failure or destroy
  const path = new Promise<RenderPath>((resolve, reject) => {
    const t0 = performance.now();
    let late = false;
    timer = setTimeout(() => {
      late = true; // N48: said, and waited for
      canvas.dispatchEvent(new CustomEvent('pme-monitor-worker-late', { bubbles: true, detail: { waitedMs: Math.round(performance.now() - t0) } }));
    }, READY_LATE_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      heard();
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        ready = true;
        pumping = m.path === 'worker-pump';
        if (late) canvas.dispatchEvent(new CustomEvent('pme-monitor-worker-ready', { bubbles: true, detail: { readyMs: Math.round(performance.now() - t0), path: m.path } }));
        resolve(m.path);
      } else if (m.type === 'framed') inFlight = false;
      else if (m.type === 'stopped') {
        // Brief 195: the engine threw while it stepped and stopped for good (engine.worker.ts `stop`): a failure, said
        inFlight = false;
        fail(new Error(stoppedReason(m.message)));
      }
      else if (m.type === 'events') {
        // read, then acknowledged: the worker sends the next batch only now, so a slow page holds one batch, not a queue
        try {
          onEvents(m.anchor, m.events);
        } finally {
          post({ type: 'eventsAck' });
        }
      } else if (m.type === 'progress') return; // FX-11a: heard (above) — the worker is working
      else if (m.type === 'result') settle(m.reqId, (r) => r.resolve(m.result as never));
      else if (m.type === 'results') settle(m.reqId, (r) => r.resolve(m.results as never));
      else if (m.type === 'snapshot') settle(m.reqId, (r) => r.resolve(m.snapshot as never));
      else if (m.type === 'restored') settle(m.reqId, (r) => (m.error === undefined ? r.resolve(undefined as never) : r.reject(new Error(m.error))));
      else if (m.type === 'advanced') settle(m.reqId, (r) => r.resolve({ tick: m.tick, simT: m.simT } as never));
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
    if (pumping && !inFlight) {
      inFlight = true;
      post({ type: 'frame', epochMs: epochNow(t) });
    }
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
    command: (cmd) => (destroyed ? Promise.resolve(refusedDestroyed()) : request<DispatchResult>((reqId) => ({ type: 'command', reqId, cmd }), refusedDestroyed)),
    commands: (cmds) => {
      const refused = () => cmds.map(() => refusedDestroyed());
      return destroyed ? Promise.resolve(refused()) : request<DispatchResult[]>((reqId) => ({ type: 'commands', reqId, cmds }), refused);
    },
    snapshot: () => request<PatientSnapshot>((reqId) => ({ type: 'snapshot', reqId })),
    restore: (snapshot) => request<void>((reqId) => ({ type: 'restore', reqId, snapshot })),
    control: (m) => post(m),
    capture12: () => request<Capture12>((reqId) => ({ type: 'capture12', reqId })),
    advance: (ticks, last) => request<{ tick: number; simT: number }>((reqId) => ({ type: 'advance', reqId, ticks, last })),
    destroy: () => {
      destroyed = true;
      for (const [id, r] of requests) {
        if (!r.refused) continue;
        requests.delete(id);
        r.resolve(r.refused() as never);
      }
      fail(new Error('the monitor was destroyed'), false);
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
      worker.terminate();
    },
  };
}

/**
 * Create the host. With worker 'auto' it tries the OffscreenCanvas worker and waits for its 'ready' (a late one is said,
 * READY_LATE_MS); if the worker fails before 'ready', the transferred canvas is replaced by a fresh one, the main-thread
 * path takes over and the fresh canvas fires `pme-monitor-main-thread` (detail { reason }): the page says so.
 */
export function createHost(
  canvas: HTMLCanvasElement,
  size: Size,
  opts: CoreOptions,
  worker: 'auto' | 'off',
  onEvents: EventsHandler,
  signal?: AbortSignal,
): Promise<Host> {
  if (worker === 'off' || !canUseWorker()) return Promise.resolve(mainHost(canvas, size, opts, onEvents));
  const onMain = (c: HTMLCanvasElement, err: unknown) => {
    const m = mainHost(c, size, opts, onEvents);
    const reason = err instanceof Error ? err.message : String(err);
    queueMicrotask(() => c.dispatchEvent(new CustomEvent('pme-monitor-main-thread', { bubbles: true, detail: { reason } })));
    return m;
  };
  let h: Host;
  try {
    h = workerHost(canvas, size, opts, onEvents);
  } catch (err) {
    return Promise.resolve(onMain(canvas, err));
  }
  // destroyed before 'ready' (the page replaced this monitor while its worker loaded): the load ends now, and nothing
  // takes over on the main thread
  const w = h;
  return new Promise<Host>((resolve) => {
    const abort = () => (w.destroy(), resolve(w));
    signal?.addEventListener('abort', abort, { once: true });
    w.path.then(
      () => (signal?.removeEventListener('abort', abort), resolve(w)),
      (err: unknown) => {
        signal?.removeEventListener('abort', abort);
        if (signal?.aborted) return;
        w.destroy();
        const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
        canvas.replaceWith(fresh);
        resolve(onMain(fresh, err));
      },
    );
  });
}
