import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, PatientProfile } from '../../src/types.ts';
import { cmd } from './hemo.ts';

export const yieldNow = () => new Promise((r) => setImmediate(r));

/** MODELED, ventilated engine; events at times (s); advances minute by minute with a yield (CI rule). */
export async function runPk(patient: PatientProfile, events: [number, Record<string, unknown>][], tEnd: number, seed = 11) {
  const e = createEngine({ seed, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
  const rejected: string[] = [];
  for (const [t, event] of events) {
    const r = e.dispatch(cmd({ type: 'applyEvent', event, atTick: Math.round(t * 50) }));
    if (!r.accepted) rejected.push(r.reason ?? '?');
  }
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(Math.min(t, tEnd));
    await yieldNow();
  }
  const st = (a: number, b: number, k: 'sbp' | 'dbp' | 'hr') => {
    const s = ev.filter((x) => x.type === 'state' && x.t >= a && x.t < b) as Extract<EngineEvent, { type: 'state' }>[];
    return s.reduce((p, q) => p + (q.values[k] ?? 0), 0) / Math.max(1, s.length);
  };
  const map = (a: number, b: number) => st(a, b, 'dbp') + (st(a, b, 'sbp') - st(a, b, 'dbp')) / 3;
  const drugs = ev.filter((x) => x.type === 'drugs') as Extract<EngineEvent, { type: 'drugs' }>[];
  return { e, ev, st, map, drugs, rejected };
}
