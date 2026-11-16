// HostTarget whose engine answers over a MessageChannel, one message at a time in arrival order, as the monitor's
// worker does (engine.worker.ts): every dispatch, snapshot and advance is a request with its own reply, and engine
// events cross the same channel. For Node tests of what a page sees while a reply is still on its way.
import { createEngine, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type MonitorEngine, type PatientSnapshot } from '@pme/engine-core';
import type { HostTarget } from '../../src/session/host-session.ts';

type Ask = { type: 'dispatch'; cmd: Command } | { type: 'snapshot' } | { type: 'advance'; simT: number };
type Req = Ask & { id: number };

export interface ChannelHost extends HostTarget {
  /** The engine on the far side (read it only to compare). */
  engine: MonitorEngine;
  dispatch(c: Command): Promise<DispatchResult>;
  snapshot(): Promise<PatientSnapshot>;
  /** Run the engine on by wall ms × scale; resolves when it has. */
  advance(wallMs: number): Promise<void>;
  /** Called right after a snapshot request is posted (while its reply is on its way). */
  onSnapshotAsked: (() => void) | null;
  close(): void;
}

export function channelHost(opts: EngineOptions = { seed: 7 }): ChannelHost {
  const engine = createEngine(opts);
  const { port1: page, port2: worker } = new MessageChannel();
  worker.onmessage = ({ data: r }: MessageEvent<Req>) => {
    if (r.type === 'dispatch') worker.postMessage({ id: r.id, value: engine.dispatch(r.cmd) });
    if (r.type === 'snapshot') worker.postMessage({ id: r.id, value: engine.snapshot() });
    if (r.type === 'advance') {
      engine.advanceTo(r.simT);
      worker.postMessage({ id: r.id, value: engine.now() });
    }
  };
  engine.on((e) => worker.postMessage({ event: e }));
  const pending = new Map<number, (v: unknown) => void>();
  const listeners = new Set<(e: EngineEvent) => void>();
  let now = engine.now();
  let id = 0;
  page.onmessage = ({ data }: MessageEvent<{ id: number; value: unknown } | { event: EngineEvent }>) => {
    if ('event' in data) return listeners.forEach((fn) => fn(data.event));
    pending.get(data.id)?.(data.value);
    pending.delete(data.id);
  };
  const request = <T>(r: Ask): Promise<T> => new Promise<T>((res) => {
    pending.set(++id, res as (v: unknown) => void);
    page.postMessage({ ...r, id });
  });
  const h: ChannelHost = {
    engine,
    onSnapshotAsked: null,
    dispatch: (cmd) => request<DispatchResult>({ type: 'dispatch', cmd }),
    snapshot: () => {
      const p = request<PatientSnapshot>({ type: 'snapshot' });
      h.onSnapshotAsked?.();
      return p;
    },
    restore: () => Promise.reject(new Error('not used here')),
    on: (fn) => (listeners.add(fn), () => void listeners.delete(fn)),
    now: () => now,
    time: () => undefined,
    async advance(wallMs) {
      now = await request<{ tick: number; simT: number }>({ type: 'advance', simT: now.simT + wallMs / 1000 + 1e-9 });
    },
    close: () => (page.close(), worker.close()),
  };
  return h;
}
