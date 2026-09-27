// Stage 7c test helpers: an engine with the adult man, ventilated under GA, and readers for the blood state.
import { createEngine } from '../../src/engine.ts';
import type { BloodState } from '../../src/l2/blood/pipeline.ts';
import { totalVolume } from '../../src/l2/circ/circuit.ts';
import { circCardiacOutput } from '../../src/l2/circ/model.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import type { PkState } from '../../src/l2/pk/pipeline.ts';
import type { RespState } from '../../src/l2/resp/pipeline.ts';
import type { Command, EngineEvent, MonitorEngine, Modifiers, PatientProfile } from '../../src/types.ts';

export const MAN: PatientProfile = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 };
let n = 0;
export const cmd = (body: Record<string, unknown>): Command => ({ id: `b${n++}`, issuedBy: 'test', ...body }) as Command;
export const evB = (event: Record<string, unknown>): Command => cmd({ type: 'applyEvent', event });

type Committed = { blood: BloodState; resp: RespState; mods: Modifiers; l1: { coupled?: Record<string, number> }; hemo: HemoState; pk: PkState };
/** White-box view of the committed state (tests only). */
export function st(e: MonitorEngine): Committed {
  return (e as unknown as { st: Committed }).st;
}

/** Stage 7a's whole circulating volume (mL) and its CO (L/min). */
export const circVolumeMl = (e: MonitorEngine): number => totalVolume(st(e).hemo.circ.s, st(e).hemo.circ.p);
export const circCoLpm = (e: MonitorEngine): number => circCardiacOutput(st(e).hemo.circ);

export function rigB(opts: { patient?: PatientProfile; seed?: number; ventilated?: boolean } = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const e = createEngine({ seed: opts.seed ?? 7, patient: opts.patient ?? MAN });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  if (opts.ventilated !== false) {
    e.dispatch(evB({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(evB({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
  }
  return { e, ev };
}

/** Advance to `tEnd`, one simulated minute per call, yielding between minutes (CI rule). */
export async function runTo(e: MonitorEngine, tEnd: number): Promise<void> {
  for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t < tEnd; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r));
  }
  e.advanceTo(tEnd);
}

export function labsAt(ev: EngineEvent[], t: number): Extract<EngineEvent, { type: 'labs' }>['values'] {
  const l = ev.filter((x): x is Extract<EngineEvent, { type: 'labs' }> => x.type === 'labs' && x.t <= t + 1e-9);
  const last = l[l.length - 1];
  if (!last) throw new Error(`no labs event before ${t}`);
  return last.values;
}
