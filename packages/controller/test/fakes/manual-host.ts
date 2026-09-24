// HostTarget over a bare engine with a manual clock (no renderer), for Node tests.
import { createEngine, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import type { HostTarget } from '../../src/session/host-session.ts';

export interface ManualHost extends HostTarget {
  engine: MonitorEngine;
  /** Advance by wall ms (× time scale, unless paused). */
  advance(wallMs: number): void;
  paused: boolean;
  scale: number;
}

export function manualHost(opts: EngineOptions = { seed: 7 }): ManualHost {
  const engine = createEngine(opts);
  const h: ManualHost = {
    engine,
    paused: false,
    scale: 1,
    dispatch: (c) => engine.dispatch(c),
    snapshot: () => engine.snapshot(),
    restore: (s) => engine.restore(s),
    on: (fn) => engine.on(fn),
    now: () => engine.now(),
    time(action, value) {
      if (action === 'pause') h.paused = true;
      if (action === 'resume') h.paused = false;
      if (action === 'scale' && value !== undefined) h.scale = value;
    },
    advance(wallMs) {
      if (!h.paused) engine.advanceTo(engine.now().simT + (wallMs / 1000) * h.scale + 1e-9);
    },
  };
  return h;
}
