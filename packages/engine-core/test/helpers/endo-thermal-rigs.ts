// FU-10 test helpers: the coverage-run-ET rigs (research/14 §1) through the real engine, read-only on the committed
// state. Seed 7, MODELED, the 40 y 70 kg 175 cm man unless a test says otherwise. Yields once per simulated minute.
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine, PatientProfile } from '../../src/types.ts';
import { cmd, MAN } from './blood.ts';

export type Step = [number, Record<string, unknown>];
export const ev = (event: Record<string, unknown>): Record<string, unknown> => ({ type: 'applyEvent', event });
export const drug = (drugId: string, dose: number, unit: string): Record<string, unknown> => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
/** ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 at t = 1 s (the ET runner's `VENTED`). */
export const VENTED: Step[] = [
  [1, ev({ kind: 'airwayDevice', device: 'ett' })],
  [1, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 })],
];
/** The ET "drug GA": propofol 2 mg/kg + rocuronium 0.6 (or succinylcholine 1.5) mg/kg + sevoflurane 2 % FGF 2 at t. */
export const GA = (t: number, nmb: 'roc' | 'sux' | 'none' = 'roc'): Step[] => [
  [t, drug('propofol', 2, 'mg/kg')],
  ...(nmb === 'none' ? [] : [[t, nmb === 'sux' ? drug('succinylcholine', 1.5, 'mg/kg') : drug('rocuronium', 0.6, 'mg/kg')] as Step]),
  [t, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 })],
];
/** Stage 3's GA flag (the rigs where depth is irrelevant). */
export const FLAG: Step = [1, ev({ kind: 'thermal', anaesthesia: 'general' })];
export type Endo = Extract<EngineEvent, { type: 'endo' }>;
/** White-box committed state (tests only). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

/** Run the timeline to `tEnd`, calling `read` every `dt` s with the engine and the latest `endo` event. */
export async function rows<T>(steps: Step[], tEnd: number, dt: number, read: (e: MonitorEngine, endo: Endo | null) => T,
  patient: PatientProfile = MAN, mode: 'modeled' | 'manual' = 'modeled'): Promise<(T & { t: number })[]> {
  const e = createEngine({ seed: 7, mode, patient: { ...MAN, ...patient } });
  let endo: Endo | null = null;
  e.on((m) => { if (m.type === 'endo') endo = m; }, ['endo']);
  const todo = [...steps].sort((a, b) => a[0] - b[0]);
  const out: (T & { t: number })[] = [];
  let lastYield = 0;
  for (let t = dt; t <= tEnd + 1e-9; t += dt) {
    while (todo.length && (todo[0] as Step)[0] < t) {
      const [ts, body] = todo.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch(cmd(body));
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    let now = e.now().simT;
    while (now < t) {
      now = Math.min(t, now + 60);
      e.advanceTo(now);
      if (now - lastYield >= 60) { lastYield = now; await new Promise((r) => setImmediate(r)); }
    }
    out.push({ ...read(e, endo), t });
  }
  return out;
}
/** The first sample time at or after t0 where `pred` holds (NaN if none). */
export const firstT = <R extends { t: number }>(rs: R[], t0: number, pred: (r: R) => boolean): number => rs.find((r) => r.t >= t0 && pred(r))?.t ?? NaN;
/** The sample nearest t. */
export const at = <R extends { t: number }>(rs: R[], t: number): R => rs.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b));
