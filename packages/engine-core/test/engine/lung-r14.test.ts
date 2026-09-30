// FU-6 R14 (audit F1, F6, A3b; suite RS11). Bands: permissive hypercapnia (VCV 300 × 12 vs 500 × 12, PaCO2 +20–30):
// mean PAP +2 mmHg or more at 20 min (Balanos 2003; k 0.01–0.02/mmHg); ARDS high recruiter: driving pressure lower at
// PEEP 15 after recruitment than before (Gattinoni 2006, RS11); induction at FiO2 1.0: shunt ≥ 0.07 by 20 min
// (Hedenstierna & Edmark 2010: 8–10 %).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

/** Mean pulmonary-artery pressure over [t0, t1] (7a's instantaneous `circOut.pPa`, sampled every 0.1 s). */
async function papMean(e: Parameters<typeof st6>[0], t0: number, t1: number): Promise<number> {
  await runTo(e, t0);
  let sum = 0;
  let n = 0;
  await runTo(e, t1, () => { sum += st6(e).hemo.circOut.pPa as number; n++; }, 0.1);
  return sum / Math.max(1, n);
}

describe('FU-6 R14', { timeout: 900_000 }, () => {
  // R45 (FU-6 executor, merged main): after FU-4's R1 root the hypercapnic arm reaches PaCO2 55 (not 92), and 7a's chemo
  // input is EtCO2 + 5, so K_PVR_CO2 0.015 (sourced range 0.01–0.02; its comment names no fit target) adds ≈ +15 % PVR:
  // mean PAP +1.1 mmHg. Not tuned; it.fails with the number (calibration row).
  it.fails('permissive hypercapnia raises mean PAP ≥ 2 mmHg — measured 18.1 → 19.2 (+1.1) at PaCO2 32.3 → 55.0 (FU-6 R14, band ≥ +2; plan 17.9 → 21.6 at PaCO2 92; was 18.8 → 19.7 at PaCO2 70)', async () => {
    const run = async (vt: number) => {
      const e = rig6();
      await ventRig(e, { fio2: 0.8 });
      await runTo(e, 300);
      send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: vt, peep: 5, fio2: 0.8 });
      const pap = await papMean(e, 1440, 1500);
      return { pap, pa: st6(e).resp.co2.pf as number, sa: st6(e).resp.o2.sa as number };
    };
    const c = await run(500);
    const h = await run(300);
    console.log(`FU-6 R14 hypercapnia: PaCO2 ${c.pa.toFixed(1)} → ${h.pa.toFixed(1)}, PAPm ${c.pap.toFixed(1)} → ${h.pap.toFixed(1)}, SaO2 ${(h.sa * 100).toFixed(0)}`);
    expect(h.sa).toBeGreaterThan(0.95); // FiO2 0.8 keeps hypoxic vasoconstriction out of the comparison
    expect(h.pap - c.pap).toBeGreaterThanOrEqual(2);
  });
  it('RS11: ARDS high recruiter — driving pressure lower at PEEP 15 after recruitment, with the delivered VT intact (measured 13.1 → 11.8 at 420 mL; plan 13.1 → 11.7; was 13.8 at every PEEP, audit F1)', async () => {
    const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'ards', severity: 1, recruitFrac: 0.5 }] });
    // FU-6 F2/F5c (Orchestrator ruling (FU-6 review), 2026-09-28): unlimited arm + a delivered-VT guard. At Pplat 27.2
    // with the default Pmax 40 a pressure-limited breath could lower ΔP by delivering less volume, which is not the
    // compliance gain R14 asks for — and this row is a FLIP of a pre-declared `it.fails`, so its evidence must be clean.
    await ventRig(e, { rr: 20, vtMl: 420, fio2: 0.8, pmax: 80 });
    await runTo(e, 900);
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 420, peep: 15, fio2: 0.8, pmax: 80 });
    await runTo(e, 1500);
    const dp0 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    send(e, { kind: 'recruit', pressureCmH2O: 40, durationS: 30 });
    await runTo(e, 2100);
    const dp1 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    const vt1 = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    console.log(`FU-6 R14 ARDS driving pressure at PEEP 15: ${dp0.toFixed(1)} → ${dp1.toFixed(1)} after recruitment; delivered VT ${vt1.toFixed(0)} of 420`);
    expect(vt1).toBeGreaterThanOrEqual(0.95 * 420); // F5c: a truncated breath must not be read as a compliance gain
    expect(dp1).toBeLessThan(dp0 - 1);
  });
  it.fails('induction at FiO2 1.0 (no thermal switch): Qs/Qt ≥ 0.07 by 20 min — measured 0.015 (audit A3b: 0.02 → 0.04; calibration row)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 1 });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 1200);
    const sh = st6(e).resp.lung.perf.shunt.reduce((a: number, b: number) => a + b, 0) / 2;
    console.log(`FU-6 R14 induction shunt at FiO2 1: ${sh.toFixed(3)}`);
    expect(sh).toBeGreaterThanOrEqual(0.07);
  });
});
