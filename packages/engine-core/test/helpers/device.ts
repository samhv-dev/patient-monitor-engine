// Stage 4b test helpers: an engine on a given skin with every event recorded.
import { createEngine } from '../../src/engine.ts';
import type { EngineOptions, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd } from './hemo.ts';

export { cmd };
export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
export type Marker = Extract<EngineEvent, { type: 'marker' }>;
export type Beat = Extract<EngineEvent, { type: 'beat' }>;

export function devRig(skin: string, opts: Omit<EngineOptions, 'device'> & { ageBand?: 'adult' | 'paediatric' | 'neonatal' } = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const { ageBand, ...rest } = opts;
  const e = createEngine({ seed: 11, ...rest, device: { skin, ...(ageBand ? { ageBand } : {}) } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

/** The room's defibrillator model, set now. A ZOLL M2 starts switched off: unless `on` is false it is then switched on
 * as the resident's first step, once the model has applied (a command is validated at dispatch). */
export function setDefibModel(e: MonitorEngine, model: string, on = true): void {
  const send = (action: Record<string, unknown>) => {
    const r = e.dispatch(cmd({ type: 'device', action: { device: 'defib', ...action } }));
    if (!r.accepted) throw new Error(r.reason);
  };
  send({ action: 'model', value: model });
  if (model !== 'zoll-m2' || !on) return;
  e.advanceTo(e.now().simT + 0.5);
  send({ action: 'selector', value: 'defib' });
}

export const alarmsOf = (ev: EngineEvent[], id?: string, state?: Alarm['state']): Alarm[] =>
  ev.filter((x): x is Alarm => x.type === 'alarm' && x.level !== undefined && (!id || x.id === id) && (!state || x.state === state));
export const beats = (ev: EngineEvent[]): Beat[] => ev.filter((x): x is Beat => x.type === 'beat');
export const markers = (ev: EngineEvent[], kind?: Marker['kind']): Marker[] => ev.filter((x): x is Marker => x.type === 'marker' && (!kind || x.kind === kind));

/** Advance to `t` in ≤ 1 sim-minute chunks, yielding to the event loop between chunks (CI rule: the Vitest worker's
 * RPC starves on a 2-vCPU runner otherwise; see test/engine/engine-pipeline.test.ts). */
export async function advanceYielding(e: MonitorEngine, t: number): Promise<void> {
  let at = e.now().simT;
  while (at < t) {
    at = Math.min(t, at + 60);
    e.advanceTo(at);
    await new Promise<void>((r) => setImmediate(r));
  }
}
