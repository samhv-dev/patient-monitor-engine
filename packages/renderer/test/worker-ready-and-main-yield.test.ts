// Brief 126. N48: a worker slow to load is waited for, and the page is told (it used to be abandoned at 2 s for the main
// thread, in silence); a worker that fails before 'ready' leaves the monitor to the main thread, and the page is told
// that too. N47: on the main thread a fast-forward step yields to the page between slices, and a command asked for
// during a step lands when the step has ended, as the worker answers its messages in order.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from '../src/protocol.ts';
import { FakeCtx } from './fake-ctx.ts';

class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((ev: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly posted: ToWorker[] = [];
  terminated = false;
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(m: ToWorker): void {
    this.posted.push(m);
  }
  terminate(): void {
    this.terminated = true;
  }
  answer(m: FromWorker): void {
    this.onmessage?.({ data: m } as MessageEvent<FromWorker>);
  }
}
vi.mock('../src/engine.worker.ts?worker&inline', () => ({ default: FakeWorker }));

type Fired = { type: string; detail: unknown; on: FakeCanvas };
class FakeCanvas {
  static fired: Fired[] = [];
  width = 0;
  height = 0;
  replacedBy: FakeCanvas | null = null;
  transferControlToOffscreen() {
    return {};
  }
  getContext() {
    return new FakeCtx();
  }
  cloneNode() {
    return new FakeCanvas();
  }
  replaceWith(c: FakeCanvas) {
    this.replacedBy = c;
  }
  dispatchEvent(e: { type: string; detail?: unknown }) {
    FakeCanvas.fired.push({ type: e.type, detail: e.detail, on: this });
    return true;
  }
}
const fired = (type: string) => FakeCanvas.fired.filter((f) => f.type === type);
class FakeEvent {
  readonly type: string;
  readonly detail: unknown;
  constructor(type: string, o?: { detail?: unknown }) {
    this.type = type;
    this.detail = o?.detail;
  }
}

// A MessageChannel whose message is a timer task, as a browser's is a task: Node drains a port's messages in one go,
// before its timers, which a page does not
class TaskChannel {
  port1 = { onmessage: null as (() => void) | null, close() {} };
  port2 = { postMessage: () => void setTimeout(() => this.port1.onmessage?.(), 0) };
}

// Animation frames run when the test says (flushFrames), as a page draws when the browser says
let frameQueue: Array<(t: number) => void> = [];
const flushFrames = () => {
  const due = frameQueue;
  frameQueue = [];
  for (const cb of due) cb(performance.now());
};

beforeEach(() => {
  FakeCanvas.fired = [];
  frameQueue = [];
  vi.stubGlobal('MessageChannel', TaskChannel);
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frameQueue.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('HTMLCanvasElement', class { transferControlToOffscreen() {} });
  vi.stubGlobal('CustomEvent', FakeEvent);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const size = { cssW: 800, cssH: 300, dpr: 1 };

describe('N48: a late worker is waited for and said; a failed one is said', () => {
  it('a worker not ready after READY_LATE_MS: the page is told, the monitor keeps waiting, and runs on the worker when it is ready', async () => {
    vi.useFakeTimers();
    const { createHost, READY_LATE_MS } = await import('../src/worker-host.ts');
    const canvas = new FakeCanvas();
    let host: { path: Promise<string> } | null = null;
    void createHost(canvas as unknown as HTMLCanvasElement, size, {}, 'auto', () => {}).then((h) => (host = h));
    const w = FakeWorker.last as FakeWorker;
    await vi.advanceTimersByTimeAsync(READY_LATE_MS - 1);
    expect(fired('pme-monitor-worker-late')).toHaveLength(0); // a normal start says nothing
    await vi.advanceTimersByTimeAsync(1);
    expect(fired('pme-monitor-worker-late')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10_000); // still loading: no fallback, no main thread
    expect(host).toBeNull();
    expect(w.terminated).toBe(false);
    expect(canvas.replacedBy).toBeNull();
    w.answer({ type: 'ready', path: 'worker-raf' });
    await vi.advanceTimersByTimeAsync(0);
    expect(await (host as unknown as { path: Promise<string> }).path).toBe('worker-raf');
    const ready = fired('pme-monitor-worker-ready');
    expect(ready).toHaveLength(1);
    expect(ready[0]!.detail).toMatchObject({ path: 'worker-raf' });
    expect(fired('pme-monitor-main-thread')).toHaveLength(0);
  });

  it('a monitor destroyed while its worker still loads ends the load, and nothing takes over on the main thread', async () => {
    vi.useFakeTimers();
    const { createHost, READY_LATE_MS } = await import('../src/worker-host.ts');
    const canvas = new FakeCanvas();
    const unmounted = new AbortController();
    const p = createHost(canvas as unknown as HTMLCanvasElement, size, {}, 'auto', () => {}, unmounted.signal);
    const w = FakeWorker.last as FakeWorker;
    unmounted.abort();
    const host = await p;
    expect(w.terminated).toBe(true);
    expect(canvas.replacedBy).toBeNull();
    await expect(host.command({ id: 'c', issuedBy: 'test', type: 'setRhythm', rhythm: 'sinus', when: 'now' } as never)).resolves.toMatchObject({ accepted: false });
    await vi.advanceTimersByTimeAsync(READY_LATE_MS + 1000);
    expect(FakeCanvas.fired).toEqual([]); // not late: gone
  });

  it('a worker ready in time says nothing', async () => {
    vi.useFakeTimers();
    const { createHost } = await import('../src/worker-host.ts');
    const p = createHost(new FakeCanvas() as unknown as HTMLCanvasElement, size, {}, 'auto', () => {});
    (FakeWorker.last as FakeWorker).answer({ type: 'ready', path: 'worker-raf' });
    (await p).destroy();
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeCanvas.fired.map((f) => f.type)).toEqual([]);
  });

  it('a worker that fails before ready: the main thread takes a fresh canvas, and the fresh canvas tells the page why', async () => {
    const { createHost } = await import('../src/worker-host.ts');
    const canvas = new FakeCanvas();
    const p = createHost(canvas as unknown as HTMLCanvasElement, size, {}, 'auto', () => {});
    (FakeWorker.last as FakeWorker).answer({ type: 'error', message: 'module failed to load' } as FromWorker);
    const host = await p;
    expect(await host.path).toBe('main');
    await Promise.resolve();
    const m = fired('pme-monitor-main-thread');
    expect(m).toHaveLength(1);
    expect(m[0]!.on).toBe(canvas.replacedBy); // on the canvas the page shows, which bubbles to its listeners
    expect(m[0]!.detail).toEqual({ reason: 'module failed to load' });
    host.destroy();
  });
});

describe('N47: the main thread yields during a fast-forward step', () => {
  it('a timer runs during a long step, and a command sent during it lands when it has ended', async () => {
    const { createHost } = await import('../src/worker-host.ts');
    const host = await createHost(new FakeCanvas() as unknown as HTMLCanvasElement, size, { engine: { seed: 1 } }, 'off', () => {});
    expect(await host.path).toBe('main');
    const frames = setInterval(flushFrames, 16);
    await host.advance(0, false);
    await host.advance(25, false); // the first step measures the cost of a tick
    let timers = 0;
    const iv = setInterval(() => void timers++, 0);
    const t0 = host.core!.engine.now().tick;
    const step = host.advance(1500, false); // 30 s of sim: several slices of 50–250 ms of work
    const cmd = host.command({ id: 'c', issuedBy: 'test', type: 'setRhythm', rhythm: 'sinus', when: 'now' } as never);
    const [r, c] = await Promise.all([step, cmd]);
    clearInterval(iv);
    clearInterval(frames);
    expect(r.tick).toBe(t0 + 1500);
    expect(timers).toBeGreaterThan(0); // the page's own timers ran between slices (before brief 126: none could)
    expect(c.accepted).toBe(true);
    expect(c.tick).toBe(t0 + 1501); // after the step, never inside it: as the worker answers in order
    host.destroy();
  });

  it("a span's first slice waits for a drawn frame: the fast-forward panel shows before the engine runs", async () => {
    const { createHost } = await import('../src/worker-host.ts');
    const host = await createHost(new FakeCanvas() as unknown as HTMLCanvasElement, size, { engine: { seed: 1 } }, 'off', () => {});
    const { tick } = await host.advance(0, false); // the span starts: the page puts up its panel
    const step = host.advance(25, false);
    await new Promise((r) => setTimeout(r, 50)); // tasks run, no frame is drawn
    expect(host.core!.engine.now().tick).toBe(tick);
    flushFrames();
    expect((await step).tick).toBe(tick + 25);
    host.destroy();
  });

  it('a step in progress when the monitor is destroyed rejects, as on the worker path', async () => {
    const { createHost } = await import('../src/worker-host.ts');
    const host = await createHost(new FakeCanvas() as unknown as HTMLCanvasElement, size, { engine: { seed: 1 } }, 'off', () => {});
    const frames = setInterval(flushFrames, 16);
    await host.advance(25, false);
    const step = host.advance(5000, false);
    host.destroy();
    await expect(step).rejects.toThrow('the monitor was destroyed');
    clearInterval(frames);
  });
});
