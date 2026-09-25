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

export const alarmsOf = (ev: EngineEvent[], id?: string, state?: Alarm['state']): Alarm[] =>
  ev.filter((x): x is Alarm => x.type === 'alarm' && x.level !== undefined && (!id || x.id === id) && (!state || x.state === state));
export const beats = (ev: EngineEvent[]): Beat[] => ev.filter((x): x is Beat => x.type === 'beat');
export const markers = (ev: EngineEvent[], kind?: Marker['kind']): Marker[] => ev.filter((x): x is Marker => x.type === 'marker' && (!kind || x.kind === kind));
