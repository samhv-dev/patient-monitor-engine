// Stage 7x page entry: the real monitor (mountMonitor, any skin via ?skin=, worker when available) with the engine's
// opt-in truth event at 1 Hz, wired to the console. Commands go to the same engine the monitor draws; the truth tree
// crosses the worker boundary inside the monitor's ordinary event batches (a pruned structured clone, < 50 KB).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { PRESETS } from './actions.ts';
import { mountConsole, type ConsoleHost } from './view.ts';

const params = new URLSearchParams(location.search);
const skin = params.get('skin') ?? 'philips-like';
const seed = Number(params.get('seed') ?? 7);
const listeners = new Set<(e: EngineEvent) => void>();
let pm: MonitorHandle | null = null;
let speed = 1;
let n = 0;

const need = (): MonitorHandle => {
  if (!pm) throw new Error('monitor not mounted');
  return pm;
};
const host: ConsoleHost = {
  dispatch: (b) => need().dispatch({ ...b, id: `pc${++n}`, issuedBy: 'console' } as unknown as Command),
  on: (fn) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  snapshot: () => need().snapshot(),
  restore: (s) => need().restore(s),
  restart: (presetId, mode) => start(presetId, mode),
  timeScale: (k) => {
    speed = k;
    pm?.setTimeScale(k);
  },
  pause: (p) => (p ? pm?.pause() : pm?.resume()),
};

const ui = mountConsole(document.getElementById('app') as HTMLElement, host);

function start(presetId: string, mode: 'manual' | 'modeled'): void {
  pm?.destroy();
  ui.monitorEl.replaceChildren();
  const patient = (PRESETS.find((p) => p.id === presetId) ?? (PRESETS[0] as (typeof PRESETS)[number])).profile;
  pm = mountMonitor(ui.monitorEl, { skin, engine: { seed, mode, patient, truthHz: 1 } });
  pm.on((e) => {
    for (const fn of listeners) fn(e);
  });
  pm.setTimeScale(speed);
}
start(params.get('preset') ?? 'adult', params.get('mode') === 'manual' ? 'manual' : 'modeled');

// e2e and devtools hook
Object.assign(window, { __pmeConsole: { ui, host, renderPath: () => pm?.renderPath, ready: true } });
