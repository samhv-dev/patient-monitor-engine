// ViewerTarget over a bare engine with a manual render clock (no renderer), for Node tests.
import { createEngine, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import type { ViewerTarget } from '../../src/session/viewer-sync.ts';

export interface ManualViewer extends ViewerTarget {
  engine: MonitorEngine;
  /** Advance the render clock by wall ms × rate (unless paused) and run the engine to it. */
  advance(wallMs: number): void;
  paused: boolean;
  rate: number;
  t: number;
}

export function manualViewer(opts: EngineOptions = { seed: 99 }): ManualViewer {
  const engine = createEngine(opts);
  const v: ManualViewer = {
    engine,
    paused: true,
    rate: 1,
    t: 0,
    restore(s) {
      engine.restore(s);
      v.t = s.tick * 0.02;
    },
    dispatch: (c) => engine.dispatch(c),
    on: (fn, types) => engine.on(fn, types),
    renderT: () => v.t,
    tick: () => engine.now().tick,
    setRate: (k) => (v.rate = k),
    setPaused: (p) => (v.paused = p),
    jumpTo(simT) {
      v.t = simT;
      engine.advanceTo(simT);
    },
    advance(wallMs) {
      if (v.paused) return;
      v.t += (wallMs / 1000) * v.rate;
      engine.advanceTo(v.t);
    },
  };
  return v;
}
