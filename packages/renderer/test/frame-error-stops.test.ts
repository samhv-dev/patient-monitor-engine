// Brief 195: a throw in the engine's frame step stops the simulation, and says so. Before it, on the worker-pump path the
// worker's catch posted an error with no reqId and never `framed`: the page's one frame in flight stayed in flight for
// ever, no frame was pumped again, the patient froze, and all the page got was a console line (brief 187's finding). On
// the main thread the animation-frame chain ended with nothing said at all. The failure is injected at the boundary
// these tests own: a MonitorCore whose frame step throws on a given call (nothing in the product is switched).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonitorCore } from '../src/monitor-core.ts';
import type { FromWorker, ToWorker } from '../src/protocol.ts';
import { FakeCtx } from './fake-ctx.ts';

class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((ev: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly posted: ToWorker[] = [];
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(m: ToWorker): void {
    this.posted.push(m);
  }
  terminate(): void {}
  answer(m: FromWorker): void {
    this.onmessage?.({ data: m } as MessageEvent<FromWorker>);
  }
}
vi.mock('../src/engine.worker.ts?worker&inline', () => ({ default: FakeWorker }));

type Fired = { type: string; detail: unknown };
let fired: Fired[] = [];
class FakeEvent {
  readonly type: string;
  readonly detail: unknown;
  constructor(type: string, o?: { detail?: unknown }) {
    this.type = type;
    this.detail = o?.detail;
  }
}
const canvasStub = () =>
  ({
    width: 0,
    height: 0,
    getContext: () => new FakeCtx(),
    transferControlToOffscreen: () => ({}),
    dispatchEvent: (e: Fired) => (fired.push({ type: e.type, detail: e.detail }), true),
  }) as unknown as HTMLCanvasElement;

let frames: Array<(t: number) => void> = [];
let t = 0;
const raf = (n: number) => {
  for (let i = 0; i < n; i++) {
    const due = frames;
    frames = [];
    t += 1000 / 60;
    for (const cb of due) cb(t);
  }
};
const BOOM = 'the frame step threw';
/** The core's frame step throws on its `n`-th call (1-based), and runs as it does otherwise. */
function throwOnFrame(n: number) {
  const real = MonitorCore.prototype.frame;
  let calls = 0;
  return vi.spyOn(MonitorCore.prototype, 'frame').mockImplementation(function (this: MonitorCore, epochMs: number) {
    if (++calls === n) throw new Error(BOOM);
    real.call(this, epochMs);
  });
}

beforeEach(() => {
  fired = [];
  frames = [];
  t = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('HTMLCanvasElement', class { transferControlToOffscreen() {} });
  vi.stubGlobal('CustomEvent', FakeEvent);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The worker, served from a scope this test holds (engine.worker.ts startWorker), its own rAF optional. */
async function worker(o: { raf?: boolean } = {}) {
  const { startWorker } = await import('../src/engine.worker.ts');
  const out: FromWorker[] = [];
  const workerFrames: Array<(t: number) => void> = [];
  const scope = {
    postMessage: (m: FromWorker) => void out.push(m),
    onmessage: null as ((ev: MessageEvent<ToWorker>) => void) | null,
    ...(o.raf ? { requestAnimationFrame: (cb: (t: number) => void) => workerFrames.push(cb) } : {}),
  };
  startWorker(scope);
  const send = (m: unknown) => scope.onmessage?.({ data: m } as MessageEvent<ToWorker>);
  send({ type: 'init', canvas: { getContext: () => new FakeCtx(), width: 0, height: 0 }, size: { cssW: 400, cssH: 200, dpr: 1 }, opts: {}, mainPump: !o.raf });
  let wt = 0;
  const runFrames = (n: number) => {
    for (let i = 0; i < n; i++) {
      const due = workerFrames.splice(0);
      wt += 20;
      for (const cb of due) cb(wt);
    }
  };
  return { out, send, runFrames, pending: () => workerFrames.length, of: <K extends FromWorker['type']>(k: K) => out.filter((m) => m.type === k) as Array<Extract<FromWorker, { type: K }>> };
}

describe('the worker: a throw in the frame step stops the simulation, said, and nothing hangs', () => {
  it('worker-pump: the frame that threw is answered, the page is told why, and a later frame is answered too', async () => {
    const spy = throwOnFrame(3);
    const w = await worker();
    expect(w.out[0]).toEqual({ type: 'ready', path: 'worker-pump' });
    for (let i = 1; i <= 4; i++) w.send({ type: 'frame', epochMs: performance.timeOrigin + 20 * i });
    expect(w.of('framed')).toHaveLength(4); // every pumped frame is answered: the page's one frame in flight is released
    expect(w.of('stopped')).toEqual([{ type: 'stopped', message: BOOM }]); // said once, with the error's message
    expect(spy).toHaveBeenCalledTimes(3); // stopped: the engine is not stepped again on a state that may be half a tick
  });

  it('worker-pump: once stopped, a command is refused and a snapshot fails, each with the reason; neither is left unanswered', async () => {
    throwOnFrame(1);
    const w = await worker();
    w.send({ type: 'frame', epochMs: performance.timeOrigin + 20 });
    w.send({ type: 'command', reqId: 1, cmd: { id: 'c', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 90 } });
    w.send({ type: 'snapshot', reqId: 2 });
    expect(w.of('result')).toEqual([{ type: 'result', reqId: 1, result: { accepted: false, tick: 0, reason: `the simulation stopped: ${BOOM}` } }]);
    expect(w.of('error')).toEqual([{ type: 'error', reqId: 2, message: `the simulation stopped: ${BOOM}` }]);
  });

  it("worker-raf: the worker's own frame loop stops on the throw and says so (no uncaught error)", async () => {
    throwOnFrame(2);
    const w = await worker({ raf: true });
    expect(w.out[0]).toEqual({ type: 'ready', path: 'worker-raf' });
    expect(() => w.runFrames(5)).not.toThrow();
    expect(w.of('stopped')).toEqual([{ type: 'stopped', message: BOOM }]);
    expect(w.pending()).toBe(0); // the chain ended: no frame asked for after the stop
  });
});

describe('the page: a stopped engine is a failure the page hears, with its reason', () => {
  it("worker-pump: the worker's 'stopped' fails the monitor once, rejects what waits, and no frame is pumped after it", async () => {
    const { createHost } = await import('../src/worker-host.ts');
    const hostP = createHost(canvasStub(), { cssW: 800, cssH: 300, dpr: 1 }, {}, 'auto', () => {});
    const w = FakeWorker.last as FakeWorker;
    w.answer({ type: 'ready', path: 'worker-pump' });
    const host = await hostP;
    raf(1);
    let settled: Error | 'resolved' | null = null;
    host.snapshot().then(() => void (settled = 'resolved'), (e: Error) => void (settled = e));
    w.answer({ type: 'stopped', message: BOOM });
    w.answer({ type: 'framed' });
    await Promise.resolve(); // the rejection's handler runs (no timer: a hang is read as unsettled, not waited out)
    expect(String(settled)).toBe(`Error: an error in the simulation: ${BOOM}`);
    expect(fired).toEqual([{ type: 'pme-monitor-failed', detail: { reason: `an error in the simulation: ${BOOM}` } }]);
    const sent = w.posted.filter((m) => m.type === 'frame').length;
    raf(10);
    expect(w.posted.filter((m) => m.type === 'frame').length).toBe(sent);
    await expect(host.command({ id: 'c', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 90 } as never)).rejects.toThrow(BOOM);
    host.destroy();
  });

  it('main thread: a throw in the frame step stops the frame loop and fails the monitor, said once with its reason', async () => {
    const spy = throwOnFrame(3);
    const { createHost } = await import('../src/worker-host.ts');
    const host = await createHost(canvasStub(), { cssW: 800, cssH: 300, dpr: 1 }, {}, 'off', () => {});
    expect(() => raf(6)).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(3); // no frame after the one that threw
    expect(frames).toHaveLength(0);
    expect(fired).toEqual([{ type: 'pme-monitor-failed', detail: { reason: `an error in the simulation: ${BOOM}` } }]);
    await expect(host.snapshot()).rejects.toThrow(BOOM);
    host.destroy();
  });
});
