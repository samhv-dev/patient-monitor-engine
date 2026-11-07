// Brief 58: the engine worker posted an event batch at every frame whether or not the page had read the last one. A
// page slower than its worker (WebKit in CI at 1990 px wide: batches 3.4 s late at the CO2 press, 9.2 s at worst, PR
// #301's run 42184042259) queued them, and a command's answer, posted on the same port, waited behind the queue. Now one
// batch is in flight: the worker merges what it generates until the page acknowledges the last batch, and sends what is
// merged before any answer, so the answer waits behind at most the batch in flight and that remainder. Merging never
// drops or reorders an event.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from '../src/protocol.ts';
import { FakeCtx } from './fake-ctx.ts';

type Scope = { postMessage: (m: FromWorker) => void; onmessage: ((ev: MessageEvent<ToWorker>) => void) | null };
const T0 = 1_000_000;

/** A fresh worker module (its state is module-wide) on a fake scope without rAF: the page pumps the frames. */
async function worker() {
  vi.resetModules();
  const { startWorker } = await import('../src/engine.worker.ts');
  const out: FromWorker[] = [];
  const scope: Scope = { postMessage: (m) => out.push(m), onmessage: null };
  startWorker(scope);
  const send = (m: ToWorker) => scope.onmessage?.({ data: m } as MessageEvent<ToWorker>);
  const canvas = { getContext: () => new FakeCtx(), width: 0, height: 0 };
  send({ type: 'init', canvas, size: { cssW: 400, cssH: 200, dpr: 1 }, opts: { engine: { seed: 3 } }, mainPump: true } as unknown as ToWorker);
  return { out, send, batches: () => out.filter((m) => m.type === 'events') as Array<Extract<FromWorker, { type: 'events' }>> };
}

/** `n` frames 20 ms apart from `from` (sim time follows the posted wall times). */
const frames = (send: (m: ToWorker) => void, from: number, n: number) => {
  for (let i = 1; i <= n; i++) send({ type: 'frame', epochMs: T0 + (from + i) * 20 });
};

beforeEach(() => vi.stubGlobal('document', undefined));
afterEach(() => vi.unstubAllGlobals());

describe('engine worker: one event batch in flight', () => {
  it('a page that has not read the last batch gets no new one, however many frames pass', async () => {
    const w = await worker();
    frames(w.send, 0, 150); // 3 s of frames, the page reading none of them
    expect(w.batches().length).toBe(1);
  });

  it('the acknowledgement releases the merged rest in one batch, carrying the newest clock anchor', async () => {
    const w = await worker();
    frames(w.send, 0, 150);
    w.send({ type: 'eventsAck' } as ToWorker);
    const b = w.batches();
    expect(b.length).toBe(2);
    // the newest anchor the core gave (it posts at least every 250 ms), not the first one held
    expect(b[1]?.anchor.epochMs).toBeGreaterThan(T0 + 150 * 20 - 250);
  });

  it("a command's answer waits behind at most the batch in flight and the merged rest, in that order", async () => {
    const w = await worker();
    frames(w.send, 0, 150);
    const before = w.out.length;
    w.send({ type: 'command', reqId: 9, cmd: { id: 'c', issuedBy: 'test', type: 'attachSensor', sensor: 'co2', state: 'on' } } as unknown as ToWorker);
    const ahead = w.out.slice(0, w.out.findIndex((m) => m.type === 'result'));
    expect(ahead.filter((m) => m.type === 'events').length).toBeLessThanOrEqual(2);
    expect(w.out.slice(before).map((m) => m.type)).toEqual(['events', 'result']); // the rest first, then the answer
  });

  it('merging never drops or reorders an event: a slow page gets exactly the stream a fast one gets', async () => {
    const stream = async (ackEvery: number) => {
      const w = await worker();
      let read = 0;
      let acks = 0;
      for (let f = 0; f < 300; f++) {
        frames(w.send, f, 1);
        // the page reads (and acknowledges) a batch only every `ackEvery` frames
        if (f % ackEvery === 0) while (read < w.batches().length) (read++, acks++, w.send({ type: 'eventsAck' } as ToWorker));
      }
      w.send({ type: 'snapshot', reqId: 1 } as ToWorker); // an answer sends what is merged first
      return { events: w.batches().flatMap((b) => b.events), batches: w.batches().length, acks };
    };
    const fast = await stream(1);
    const slow = await stream(37);
    expect(slow.batches).toBeLessThanOrEqual(slow.acks + 1); // one batch per acknowledgement, and the last flushed by the answer
    expect(slow.batches).toBeLessThan(fast.batches / 2);
    expect(slow.events.length).toBeGreaterThan(50);
    expect(JSON.stringify(slow.events)).toBe(JSON.stringify(fast.events));
  });
});

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

describe('the page acknowledges each batch once it has read it', () => {
  it('reads the events, then acknowledges, once per batch', async () => {
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('HTMLCanvasElement', class { transferControlToOffscreen() {} });
    const { createHost } = await import('../src/worker-host.ts');
    const seen: string[] = [];
    const canvas = { transferControlToOffscreen: () => ({}) } as unknown as HTMLCanvasElement;
    const hostP = createHost(canvas, { cssW: 800, cssH: 300, dpr: 1 }, {}, 'auto', (_a, evs) => {
      seen.push(`read ${evs.length}, acks so far ${(FakeWorker.last as FakeWorker).posted.filter((m) => m.type === 'eventsAck').length}`);
    });
    const w = FakeWorker.last as FakeWorker;
    w.answer({ type: 'ready', path: 'worker-raf' });
    const host = await hostP;
    const anchor = { simT: 1, epochMs: 0, timeScale: 1 };
    w.answer({ type: 'events', anchor, events: [{ type: 'marker', t: 1 } as never] });
    w.answer({ type: 'events', anchor, events: [] });
    expect(seen).toEqual(['read 1, acks so far 0', 'read 0, acks so far 1']);
    expect(w.posted.filter((m) => m.type === 'eventsAck').length).toBe(2);
    host.destroy();
  });
});
