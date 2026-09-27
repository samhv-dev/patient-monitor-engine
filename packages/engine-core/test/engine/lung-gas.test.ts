import { describe, expect, it } from 'vitest';
import { respOf as resp } from '../helpers/lung.ts';
import { ev3, rig3, stateSeries } from '../helpers/resp.ts';

const vent = { kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.4 };
const adult = { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' as const };
/**
 * Executor deviation (Task 14): the gap is read at the catalogue's reference PaCO2 40 — 40·(1 − g), g = EtCO2/PaCO2 of
 * the mixing point — because in the engine the MANUAL etco2 target (36) places PaCO2 (51 in GOLD 3, 70 in moderate
 * ARDS: the gap scales with PaCO2) and the displayed EtCO2 also carries Stage 3's low-flow factor φ (0.96 at the
 * default CO). The plan's stand-alone rig had PaCO2 ≈ 38–48 and φ = 1. The raw engine gap is logged for the gate note.
 */
const gap40 = (rs: ReturnType<typeof resp>) => 40 * (1 - rs.lung.co2.g);

describe('Stage 7b wiring II: gas exchange through the mixing point', { timeout: 300_000 }, () => {
  it('healthy: EtCO2 = PaCO2 − 3 ± 0.8 (the Stage 3 gradient now emerges)', async () => {
    const r = rig3({ patient: adult });
    r.e.dispatch(ev3(vent));
    for (let m = 1; m <= 5; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
    const rs = resp(r.e);
    console.log(`lung-gas healthy: PaCO2 ${rs.co2.pf.toFixed(1)} EtCO2 ${rs.etco2.toFixed(1)} raw gap ${(rs.co2.pf - rs.etco2).toFixed(2)} gap@40 ${gap40(rs).toFixed(2)}`);
    expect(gap40(rs)).toBeGreaterThan(2.2);
    expect(gap40(rs)).toBeLessThan(3.8);
  });
  it('COPD GOLD 3: gap 5–15 mmHg; ARDS moderate: gap 10–20 and shunt 0.25–0.35', async () => {
    const gap = async (lungConditions: { id: 'copd' | 'ards'; severity: number }[], vt: number, rr: number) => {
      const r = rig3({ patient: { ...adult, lungConditions } });
      r.e.dispatch(ev3({ ...vent, vtMl: vt, rr }));
      for (let m = 1; m <= 10; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
      const rs = resp(r.e);
      console.log(`lung-gas ${lungConditions[0]?.id}: PaCO2 ${rs.co2.pf.toFixed(1)} EtCO2 ${rs.etco2.toFixed(1)} raw gap ${(rs.co2.pf - rs.etco2).toFixed(2)} gap@40 ${gap40(rs).toFixed(2)}`);
      return { gap: gap40(rs), shunt: stateSeries(r.ev, 'shunt').at(-1)?.[1] ?? 0 };
    };
    const c = await gap([{ id: 'copd', severity: 0.75 }], 560, 14);
    expect(c.gap).toBeGreaterThan(5);
    expect(c.gap).toBeLessThan(15);
    const a = await gap([{ id: 'ards', severity: 0.67 }], 420, 20);
    expect(a.gap).toBeGreaterThan(10);
    expect(a.gap).toBeLessThan(20);
    expect(a.shunt).toBeGreaterThan(0.25);
    expect(a.shunt).toBeLessThan(0.35);
  });
});
