// Worker entry: engine + renderer on an OffscreenCanvas (brief §3.4). Uses the worker's own requestAnimationFrame when
// it exists, otherwise waits for 'frame' messages from the main thread. The file starts itself only inside the worker
// we create, named 'pme-engine' (the ESM build's `?worker&inline` bundle via worker-host.ts, or the IIFE re-running its
// own source as the worker, src/iife-worker.ts). Imported anywhere else — the page, or a host's OWN worker that
// importScripts the IIFE for a headless createEngine — it is inert and never touches that scope's onmessage.
import { MonitorCore } from './monitor-core.ts';
import type { Ctx2D } from './ctx.ts';
import type { EngineEvent } from '@pme/engine-core';
import type { ClockAnchor, FromWorker, ToWorker } from './protocol.ts';

interface WorkerScope {
  postMessage(msg: FromWorker): void;
  onmessage: ((ev: MessageEvent<ToWorker>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
}

let scope: WorkerScope; // Set by startWorker()
let core: MonitorCore | null = null;
let useRaf = false;
// Brief 58: one event batch in flight. A batch is posted only when the page has acknowledged the last one; what the
// engine generates meanwhile is merged into `held` (in order, the newest clock anchor), never dropped. A page slower
// than this worker queued a batch per frame without bound, and a command's answer, on the same port, waited behind
// them: 3.4 s at the CO2 press on WebKit in CI, 9.2 s at worst (PR #301's run 42184042259).
let unread = 0; // batches posted and not yet acknowledged: 1 at most, 2 just after an answer sent the held ones
let held: { anchor: ClockAnchor; events: EngineEvent[] } | null = null;
function postEvents(anchor: ClockAnchor, events: EngineEvent[]): void {
  if (unread > 0) {
    held = { anchor, events: held ? held.events.concat(events) : [...events] }; // a copy: the core reuses its batch
    return;
  }
  unread++;
  scope.postMessage({ type: 'events', anchor, events });
}
/** What is held goes now, even with a batch in flight: an answer never overtakes events generated before it. */
function release(): void {
  if (!held) return;
  const h = held;
  held = null;
  unread++;
  scope.postMessage({ type: 'events', anchor: h.anchor, events: h.events });
}
/** Every answer to the page goes through here: the held events first, then the answer. */
function answer(msg: FromWorker, transfer?: Transferable[]): void {
  release();
  if (transfer) (scope.postMessage as (msg: FromWorker, transfer: Transferable[]) => void)(msg, transfer);
  else scope.postMessage(msg);
}

/**
 * Brief 195: why the simulation stopped (null: it runs). A throw while the engine steps (a frame, a catch-up, a
 * fast-forward step) can leave it half a tick on: one module stepped and the next not, the sweep half drawn. Run on, it
 * would show a patient no model computed, so it does not: the core is dropped here, for good, the page is told the
 * error's message (`stopped`), and every later request is answered with the reason, never left waiting. The way on is
 * the page's (a new monitor: Restart the patient, or a reload).
 */
let stoppedBy: string | null = null;
const why = (): string => (stoppedBy === null ? 'not initialised' : `the simulation stopped: ${stoppedBy}`);
function stop(err: unknown): void {
  stoppedBy = err instanceof Error ? err.message : String(err);
  core = null;
  release(); // what the engine generated before the throw happened; it goes first
  scope.postMessage({ type: 'stopped', message: stoppedBy });
}
/** One engine step; a throw stops the simulation (above). */
function step(f: (c: MonitorCore) => void): void {
  if (!core) return;
  try {
    f(core);
  } catch (err) {
    stop(err);
  }
}

function loop(t: number): void {
  step((c) => c.frame(performance.timeOrigin + t));
  if (core) scope.requestAnimationFrame?.(loop); // stopped: the chain ends here, said (not an uncaught error)
}

function onMessage(ev: MessageEvent<ToWorker>): void {
  const m = ev.data;
  try {
    switch (m.type) {
      case 'init': {
        const ctx = m.canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
        unread = 0;
        held = null;
        stoppedBy = null;
        core = new MonitorCore(m.canvas, ctx, m.size, m.opts, postEvents);
        // FX-11a: the watchdog sees a long run working. Not an event batch: it is never held for an eventsAck (#310)
        core.onProgress = () => scope.postMessage({ type: 'progress' });
        useRaf = !m.mainPump && typeof scope.requestAnimationFrame === 'function';
        scope.postMessage({ type: 'ready', path: useRaf ? 'worker-raf' : 'worker-pump' });
        if (useRaf) scope.requestAnimationFrame?.(loop);
        return;
      }
      case 'eventsAck': // the page has read a batch: once it has read them all, the held ones go
        unread = Math.max(0, unread - 1);
        if (unread === 0) release();
        return;
      case 'frame':
        if (useRaf) return;
        step((c) => c.frame(m.epochMs));
        scope.postMessage({ type: 'framed' }); // ALWAYS, a frame that threw too: the page posts the next only now (worker-host.ts, `inFlight`)
        return;
      case 'catchUp':
        step((c) => c.catchUp(m.epochMs));
        return;
      case 'command': {
        const result = core ? core.command(m.cmd) : { accepted: false, tick: 0, reason: why() };
        answer({ type: 'result', reqId: m.reqId, result });
        return;
      }
      case 'commands': {
        // R15: one message, one task — the engine runs no tick between these dispatches
        const results = m.cmds.map((c) => (core ? core.command(c) : { accepted: false, tick: 0, reason: why() }));
        scope.postMessage({ type: 'results', reqId: m.reqId, results });
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
        if (core) answer({ type: 'snapshot', reqId: m.reqId, snapshot: core.engine.snapshot() });
        else answer({ type: 'error', message: why(), reqId: m.reqId });
        return;
      case 'plan':
        core?.setPlan(m.plan);
        return;
      case 'ibpScales':
        core?.setIbpScales(m.scales);
        return;
      case 'capture12': // The 12 lead arrays are transferred, not copied
        try {
          if (!core) throw new Error(why());
          const capture = core.capture12();
          answer({ type: 'capture12', reqId: m.reqId, capture }, Object.values(capture.leads).map((a) => a.buffer));
        } catch (err) {
          answer({ type: 'capture12', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
      case 'advance': // a fast-forward step; its events were posted before this answer
        if (!core) throw new Error(why());
        try {
          answer({ type: 'advanced', reqId: m.reqId, ...core.advance(m.ticks, m.last) });
        } catch (err) {
          stop(err); // a fast-forward step is the engine stepping too
          throw err; // …and its request is answered with the error (below)
        }
        return;
      case 'restore':
        try {
          if (!core) throw new Error(why());
          core.restore(m.snapshot); // The lanes restart with the engine
          answer({ type: 'restored', reqId: m.reqId });
        } catch (err) {
          answer({ type: 'restored', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
    }
  } catch (err) {
    // A request that threw answers its own reqId, so the caller's promise rejects instead of waiting forever
    const reqId = 'reqId' in m ? m.reqId : undefined;
    answer({ type: 'error', message: err instanceof Error ? err.message : String(err), ...(reqId !== undefined ? { reqId } : {}) });
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
