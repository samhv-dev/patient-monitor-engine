// FU-6 test helpers: a MODELED engine with the monitor sensors on, read-only internal-state access (the pattern of
// blood-stage3-recheck.test.ts), the ventilated GA rig, and a fine (0.1 s) sampler for peak airway and pleural
// pressure. Every loop yields once per sim-MINUTE (CI amendment 4).
import { createEngine } from '../../src/engine.ts';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { respPleural } from '../../src/l2/resp/pipeline.ts';
import { ev3 } from './resp.ts';

export const ADULT6: PatientProfile = { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' };

/** `seed` 7 by default: its FU-6 F7 wake draw (u 0.737) is the label's MODAL induction patient (30–60 s). */
export function rig6(patient: PatientProfile = ADULT6, mode: 'modeled' | 'manual' = 'modeled', seed = 7): MonitorEngine {
  return createEngine({ seed, mode, patient: { ...patient, sensors: { spo2: 'on', co2: 'on', abp: 'connected', ...patient.sensors } } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access to the committed pipeline state
export const st6 = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

export function send(e: MonitorEngine, event: Record<string, unknown>): void {
  const r = e.dispatch(ev3(event)) as { accepted: boolean; reason?: string };
  if (!r.accepted) throw new Error(`rejected ${JSON.stringify(event)}: ${r.reason}`);
}

/** Advance to `t`, calling `each` every `dt` s; one yield per sim-minute. */
export async function runTo(e: MonitorEngine, t: number, each?: (tNow: number) => void, dt = 5): Promise<void> {
  let lastYield = e.now().simT;
  for (let u = Math.min(t, e.now().simT + dt); ; u = Math.min(t, u + dt)) {
    e.advanceTo(u);
    each?.(u);
    if (u - lastYield >= 60) { lastYield = u; await new Promise((r) => setImmediate(r)); }
    if (u >= t) return;
  }
}

/** Peak airway pressure (cmH2O) and the lowest pleural pressure (mmHg) over [now, t1], sampled every 0.1 s. */
export async function fineWindow(e: MonitorEngine, t1: number): Promise<{ peak: number; pplMin: number }> {
  let peak = -Infinity;
  let pplMin = Infinity;
  await runTo(e, t1, (u) => {
    const rs = st6(e).resp;
    peak = Math.max(peak, rs.lung.mech.paw as number);
    pplMin = Math.min(pplMin, respPleural(rs, u));
  }, 0.1);
  return { peak, pplMin };
}

/**
 * The audit's ventilated rig at t = 1 s: ETT, VCV 12 × 500, PEEP 5, FiO2 0.5, GA switch, propofol 100 µg/kg/min,
 * rocuronium 1.2 mg/kg and a rocuronium infusion of 0.6 mg/kg/h (the audit used a single 0.6 mg/kg: since FU-6 R9 a
 * patient whose diaphragm recovers above 5 % strength triggers the ventilator, and the 30-min rigs must stay
 * paralysed — measured: with 0.6 the untreated bronchospasm peak drifted 45 → 52 by 30 min; with 1.2 alone the
 * diaphragm reached 5 % at ≈ 24 min and the 25-min window read the triggered breaths).
 */
export async function ventRig(e: MonitorEngine, v: Record<string, number> = {}): Promise<void> {
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...v });
  send(e, { kind: 'thermal', anaesthesia: 'general' });
  send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
  send(e, { kind: 'infusion', drugId: 'rocuronium', rate: 0.6, unit: 'mg/kg/h' });
}
