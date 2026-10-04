// FU-9 test helpers: the coverage-run-BF rigs (research/22 §1) through the real engine, read-only on the committed state.
import { createEngine } from '../../src/engine.ts';
import type { OrgansState } from '../../src/l2/organs/pipeline.ts';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { cmd, evB, MAN, st } from './blood.ts';

export type Step = [number, Record<string, unknown>];
/** BF "GA vent": ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 and the Stage 3 GA flag at t = 1 s (MODELED). */
export const GA_VENT: Step[] = [
  [1, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }],
  [1, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } }],
  [1, { type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } }],
];
export const ev = (event: Record<string, unknown>): Record<string, unknown> => ({ type: 'applyEvent', event });

/** Run a timeline to each sample time; `read` is called at every time in `at` (seconds), yielding once per sim-minute. */
export async function arm<T>(steps: Step[], at: number[], read: (e: MonitorEngine) => T, patient: PatientProfile = MAN): Promise<T[]> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient });
  const todo = [...steps].sort((a, b) => a[0] - b[0]);
  const out: T[] = [];
  for (const tS of [...at].sort((a, b) => a - b)) {
    for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t <= tS; t += 60) {
      while (todo.length && (todo[0] as Step)[0] <= t) {
        const [ts, body] = todo.shift() as Step;
        e.advanceTo(Math.max(e.now().simT, ts));
        const r = e.dispatch(cmd(body));
        if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
      }
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    while (todo.length && (todo[0] as Step)[0] <= tS) {
      const [ts, body] = todo.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch(cmd(body));
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    e.advanceTo(tS);
    out.push(read(e));
  }
  return out;
}
/** Memoise an arm (or a set of arms) at module scope, so an `it.fails` reuses the runs of the `it` beside it (R50 F10). */
export const once = <T>(f: () => Promise<T>): (() => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= f());
};
/** 7d's cumulative urine, mL (RH runner `cumMl`). */
export const urineMl = (e: MonitorEngine): number => (e as unknown as { st: { organs: OrgansState } }).st.organs.renal.cumMl;
/** 7c's blood volume (plasma + red cells), mL. */
export const bvMl = (e: MonitorEngine): number => st(e).blood.core.fl.vp + st(e).blood.core.fl.hbG * 3;
export { evB, MAN, st };
