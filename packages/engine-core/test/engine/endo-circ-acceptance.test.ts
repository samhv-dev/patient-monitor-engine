// Stage 7e × 7a acceptance, MODELED circulation (tables §7 check 16; §5e anaphylaxis). The endocrine multipliers reach
// 7a through circ.ext.endo*; epinephrine is Stage 7g's drug event (its haemodynamics are 7g's, its mast-cell β2 is 7e's).
// The septic patient is anaesthetised and ventilated (the check-16 setting; no febrile rigors against a fixed
// spontaneous ventilation — Stage 3 has no chemoreflex ventilation until 7f). One run per scenario, one `it` per band.
import { beforeAll, describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, ev3, run, vent } from '../helpers/resp.ts';

type State = Extract<EngineEvent, { type: 'state' }>;
type Circ = Extract<EngineEvent, { type: 'circ' }>;
const avg = <T extends EngineEvent>(ev: EngineEvent[], type: T['type'], t0: number, t1: number, f: (x: T) => number) => {
  const s = ev.filter((x) => x.type === type && (x as { t: number }).t >= t0 && (x as { t: number }).t < t1) as T[];
  return s.reduce((a, x) => a + f(x), 0) / s.length;
};
/** MAP, HR, CO and the clinical SVR 80·(MAP − CVP)/CO (dyn·s/cm⁵) over [t0, t1). */
function haemo(ev: EngineEvent[], t0: number, t1: number) {
  const map = avg<State>(ev, 'state', t0, t1, (x) => (x.values.sbp! + 2 * x.values.dbp!) / 3);
  const cvp = avg<State>(ev, 'state', t0, t1, (x) => x.values.cvp ?? 0);
  const co = avg<Circ>(ev, 'circ', t0, t1, (x) => x.co);
  return { map, hr: avg<State>(ev, 'state', t0, t1, (x) => x.values.hr!), co, svr: (80 * (map - cvp)) / co };
}
function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: ADULT });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

describe('Stage 7e × 7a (MODELED): septic shock warm → cold (tables §7 check 16)', { timeout: 900_000 }, () => {
  let warm = { map: 0, hr: 0, co: 0, svr: 0 };
  let cold = { map: 0, hr: 0, co: 0, svr: 0 };
  beforeAll(async () => {
    const { e, ev } = rig();
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 120);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 }));
    await run(e, 120 + 3600);
    warm = haemo(ev, 120 + 3480, 120 + 3600);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }));
    await run(e, 120 + 7200);
    cold = haemo(ev, 120 + 7080, 120 + 7200);
    console.log(`sepsis warm: MAP ${warm.map.toFixed(0)} HR ${warm.hr.toFixed(0)} CO ${warm.co.toFixed(1)} SVR ${warm.svr.toFixed(0)}; cold: MAP ${cold.map.toFixed(0)} HR ${cold.hr.toFixed(0)} CO ${cold.co.toFixed(1)} SVR ${cold.svr.toFixed(0)}`);
  }, 900_000);
  // R45 misses (prototype, Q-7e-7): warm HR 131, MAP 61, CO 5.0, SVR 866; cold SVR 1510. 7a's baroreflex restores the
  // SVR the vasoplegia removed and nothing raises venous return (see Requests: 7a baroreflex × vasoResp, septic RVR).
  it.fails('warm HR 115–130 (measured 131; Q-7e-7)', () => {
    expect(warm.hr).toBeGreaterThanOrEqual(115);
    expect(warm.hr).toBeLessThanOrEqual(130);
  });
  it.fails('warm MAP 55–60 (measured 61; Q-7e-7)', () => {
    expect(warm.map).toBeGreaterThanOrEqual(55);
    expect(warm.map).toBeLessThanOrEqual(60);
  });
  it.fails('warm CO 7–9 L/min (measured 5.0; Q-7e-7)', () => {
    expect(warm.co).toBeGreaterThanOrEqual(7);
    expect(warm.co).toBeLessThanOrEqual(9);
  });
  it.fails('warm SVR 500–700 dyn·s/cm⁵ (measured 861; Q-7e-7)', () => {
    expect(warm.svr).toBeGreaterThanOrEqual(500);
    expect(warm.svr).toBeLessThanOrEqual(700);
  });
  it('cold CO 3–4 L/min', () => {
    expect(cold.co).toBeGreaterThanOrEqual(3);
    expect(cold.co).toBeLessThanOrEqual(4);
  });
  it.fails('cold SVR 1200–1500 dyn·s/cm⁵ (measured 1507; Q-7e-7)', () => {
    expect(cold.svr).toBeGreaterThanOrEqual(1200);
    expect(cold.svr).toBeLessThanOrEqual(1500);
  });
});

describe('Stage 7e × 7a (MODELED): anaphylaxis grade III (tables §5e)', { timeout: 600_000 }, () => {
  it('MAP falls ≥ 30 % within 10 min of the trigger (tables: onset 1–10 min); epinephrine 100 µg ×2 (7g) restores ≥ 80 % of baseline within 3 min of the second dose', async () => {
    const { e, ev } = rig();
    await run(e, 120);
    const base = haemo(ev, 60, 120).map;
    e.dispatch(ev3({ kind: 'condition', id: 'anaphylaxis', severity: 0.75 }));
    await run(e, 720);
    const low = haemo(ev, 700, 720).map;
    e.dispatch(ev3({ kind: 'drug', drugId: 'epinephrine', dose: 100, unit: 'mcg', route: 'iv' }));
    await run(e, 840);
    e.dispatch(ev3({ kind: 'drug', drugId: 'epinephrine', dose: 100, unit: 'mcg', route: 'iv' }));
    await run(e, 1020);
    const rescued = haemo(ev, 1000, 1020).map;
    console.log(`anaphylaxis: MAP ${base.toFixed(0)} → ${low.toFixed(0)} at 10 min → ${rescued.toFixed(0)} after 2 × 100 µg`);
    expect(low).toBeLessThanOrEqual(0.7 * base);
    expect(rescued).toBeGreaterThanOrEqual(0.8 * base);
  });
});
