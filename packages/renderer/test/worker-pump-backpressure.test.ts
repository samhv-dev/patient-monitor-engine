// The worker-pump path (a browser with an OffscreenCanvas worker but no requestAnimationFrame inside it): the page posts
// the frames. It posted one at EVERY page frame whether or not the worker had drawn the last, so on a machine where one
// frame costs more than a display refresh the worker's queue grew without bound and every command waited behind it: an
// attach answered seconds late, later and later (the Saadat Instructor test on WebKit in CI, no CO2 tile 5 s after the
// press: brief 47). One frame in flight, as the worker's own rAF gives: the page posts the next when the worker says it
// drew the last, so a command waits at most one frame.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
beforeEach(() => {
  frames = [];
  t = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('HTMLCanvasElement', class { transferControlToOffscreen() {} });
});
afterEach(() => vi.unstubAllGlobals());

async function pumpHost() {
  const { createHost } = await import('../src/worker-host.ts');
  const canvas = { transferControlToOffscreen: () => ({}) } as unknown as HTMLCanvasElement;
  const hostP = createHost(canvas, { cssW: 800, cssH: 300, dpr: 1 }, {}, 'auto', () => {});
  const w = FakeWorker.last as FakeWorker;
  w.answer({ type: 'ready', path: 'worker-pump' });
  const host = await hostP;
  expect(await host.path).toBe('worker-pump');
  return { host, w, frames: () => w.posted.filter((m) => m.type === 'frame').length };
}

describe('worker-pump: one frame in flight', () => {
  it('posts no new frame while the worker has not drawn the last one', async () => {
    const { host, frames: sent } = await pumpHost();
    raf(30); // half a second of page frames; the worker is still drawing the first
    expect(sent()).toBe(1);
    host.destroy();
  });

  it('posts the next frame once the worker says it drew the last, with the newest time', async () => {
    const { host, w, frames: sent } = await pumpHost();
    raf(5);
    w.answer({ type: 'framed' });
    raf(1);
    expect(sent()).toBe(2);
    const last = w.posted.filter((m) => m.type === 'frame').at(-1) as Extract<ToWorker, { type: 'frame' }>;
    expect(last.epochMs).toBe(performance.timeOrigin + t); // the wall time of the page frame it was posted at
    raf(10);
    expect(sent()).toBe(2);
    host.destroy();
  });

  it('a command goes to the worker at once, never behind a queue of frames', async () => {
    const { host, w } = await pumpHost();
    raf(120); // two seconds of a worker slower than the display
    void host.command({ id: 'c', issuedBy: 'test', type: 'attachSensor', sensor: 'co2', state: 'on' } as never);
    const i = w.posted.findIndex((m) => m.type === 'command');
    expect(w.posted.slice(0, i).filter((m) => m.type === 'frame').length).toBe(1); // at most the one frame in flight before it
    host.destroy();
  });
});

describe('the worker answers each pumped frame', () => {
  it("posts 'framed' after drawing a pumped frame", async () => {
    const { startWorker } = await import('../src/engine.worker.ts');
    const out: FromWorker[] = [];
    const scope = { postMessage: (m: FromWorker) => out.push(m), onmessage: null as ((ev: MessageEvent<ToWorker>) => void) | null };
    startWorker(scope);
    const canvas = { getContext: () => new FakeCtx(), width: 0, height: 0 };
    scope.onmessage?.({ data: { type: 'init', canvas, size: { cssW: 400, cssH: 200, dpr: 1 }, opts: {}, mainPump: true } } as unknown as MessageEvent<ToWorker>);
    expect(out[0]).toEqual({ type: 'ready', path: 'worker-pump' });
    scope.onmessage?.({ data: { type: 'frame', epochMs: performance.timeOrigin + 20 } } as MessageEvent<ToWorker>);
    expect(out.filter((m) => m.type === 'framed')).toHaveLength(1);
  });
});
