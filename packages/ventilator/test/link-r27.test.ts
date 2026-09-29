// R27 two-way link, in process (lockstep): the ventilator's settings move SpO2, EtCO2, ABP and CVP through the
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { beforeAll, describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, lungShunt, pcwp, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`LINK ${tag}: ${fmt(o)}`); };

describe('R27 link — ventilator settings move the monitor', { timeout: 300_000 }, () => {
  it('PEEP 5 → 15 (normal): CO −5…−15 %, MAP falls > 8 mmHg, CVP rises 1.5–3.5 mmHg (Stage 3 coupling)', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 240);
    const a = snap(s, 200, 240);
    s.set({ peep: 15 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    log('peep5', a); log('peep15', b);
    expect(b.co / a.co).toBeLessThan(0.95);
    expect(b.co / a.co).toBeGreaterThan(0.85);
    expect(a.map - b.map).toBeGreaterThan(8);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(1.5);
    expect(b.cvp - a.cvp).toBeLessThanOrEqual(3.5);
  });

  it('FiO2 0.4 → 1.0 (ARDS moderate): SpO2 rises ≥ 4 points and settles within 3 min', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ fio2: 100 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    const mid = snap(s, 350, 360);
    log('fio2 40', a); log('fio2 100', b);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(4);
    expect(Math.abs(mid.spo2 - b.spo2)).toBeLessThanOrEqual(1);
  });

  it('RR 14 → 22 (VT 500): EtCO2 falls ≥ 2 mmHg in 2 min and keeps falling (Stage 3 kinetics: slow compartment)', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 300);
    const a = snap(s, 280, 300);
    s.set({ rate: 22 });
    await run(s, 420);
    const b = snap(s, 410, 420);
    await run(s, 900);
    const c = snap(s, 890, 900);
    log('rr14', a); log('rr22 +2min', b); log('rr22 +10min', c);
    expect(a.etco2 - b.etco2).toBeGreaterThanOrEqual(2);
    expect(c.etco2).toBeLessThan(b.etco2 - 1);
  });

  // NEEDS A RULING NR-3 (docs/gates/stage-7a.md): heart–lung interaction is emergent on the Stage 7a circulation
  // (pleural input, T_IT 0.65) instead of Stage 3's MANUAL Paw coupling; measured: COPD auto-PEEP 9.9 → MAP −9.4 (CO −12 %);
  // oedema (70 y, no HF condition in the profile) PEEP 5 → 12: SpO2 +3, CO 4.65 → 4.66. it.fails keeps CI green and flags it.
  // Stage 7b: NR-3 closed per the orchestrator — auto-PEEP in R46's 6–12 band; the MAP fall is asserted by direction (> 3)
  it('COPD GOLD 3–4 at RR 20 / VT 8 mL/kg: auto-PEEP 6–12 cmH2O (R46) and MAP falls; RR 10 reverses it', async () => {
    const s = createLinkedSim({ profile: 'copd-gold-3-4', vent: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ rate: 20 });
    await run(s, 300);
    const b = snap(s, 270, 300);
    s.set({ rate: 10 });
    await run(s, 420);
    const c = snap(s, 390, 420);
    log('copd rr10', a); log('copd rr20', b); log('copd back', c);
    // R46: the GOLD 3 auto-PEEP band at RR 20 is 6–12 cmH2O (was > 8/10–15, an ENG guess); Stage 7b generates this
    // row's mechanics from the engine data (measured 7.8)
    expect(b.autoPeep).toBeGreaterThanOrEqual(6);
    expect(b.autoPeep).toBeLessThanOrEqual(12);
    expect(a.map - b.map).toBeGreaterThan(3);
    expect(c.map).toBeGreaterThan(b.map + 2);
  });

  // NEEDS A RULING (Stage 7b gate note): on main (7a) the SpO2 fall 60 s after PEEP 15 → 5 was 98 → 94.6 (−3.4); with 7b's
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  // Stage V.1 (G7b ruling 4+5+13): the interim link recruitment (logistic PEEP → shunt, τ 40/10 s) is retired; the 7b lungs
  // recruit on their own (R46: PEEP alone −20 % shunt, de-recruitment τ 2 min), so the band — fitted to the interim curve —
  // is further away: SpO2 95.0 → 97.0 at PEEP 15 (+2.0 vs ≥ 5) and 97.0 60 s after PEEP 5 (0 vs > 3; plan prototype +1.5 / 0.0). Stays it.fails (R45);
  // calibration row "ARDS link band: re-derive from 7b's recruitment" (orchestrator ruling (V.1 review) 2).
  it.fails('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 (measured +2.0 / 0.0 on the 7b lungs)', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 15 });
    await run(s, 420);
    const b = snap(s, 400, 420);
    s.set({ peep: 5 });
    await run(s, 480);
    const c = snap(s, 470, 480);
    log('ards peep5', a); log('ards peep15', b); log('ards back', c);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(5);
    expect(b.co).toBeLessThan(a.co);
    expect(c.spo2).toBeLessThan(b.spo2 - 3);
  });

  // Stage V.1 (G7b ruling 4+5+13, NR-3): re-specified to SpO2 rise + PCWP fall — PEEP need not lower CO in HFrEF (the
  // CO-fall band was wrong). The profile now carries 7a's hfref (moderate) and the 7b lungs' pulmOedema; the rise in
  // oxygenation is the lung-water shunt's own PEEP response (tables §4.5, E-V1-2), PCWP is 7a's pawp truth. The runs
  // happen in beforeAll so that a crash fails the block instead of letting an it.fails pass silently (R50 review).
  // Orchestrator ruling (V.1 review) 3: the FiO2 0.21 variant is measured too; neither reaches +2 (R45: it.fails).
  describe('cardiogenic oedema PEEP 5 → 12 (Stage V.1)', () => {
    type HfSnap = ReturnType<typeof snap> & { pcwp: number; shunt: number };
    const hf = new Map<number, { a: HfSnap; b: HfSnap }>();
    const oedema = async (fio2: number) => {
      const s = createLinkedSim({ profile: 'oedema-cardiogenic', vent: { fio2 } });
      await run(s, 150);
      const pa = pcwp(s);
      await run(s, 180);
      const a = { ...snap(s, 150, 180), pcwp: (pa + pcwp(s)) / 2, shunt: lungShunt(s) };
      s.set({ peep: 12 });
      await run(s, 330);
      const pb = pcwp(s);
      await run(s, 360);
      const b = { ...snap(s, 330, 360), pcwp: (pb + pcwp(s)) / 2, shunt: lungShunt(s) };
      log(`hf${fio2} peep5`, a); log(`hf${fio2} peep12`, b);
      return { a, b };
    };
    beforeAll(async () => {
      hf.set(40, await oedema(40));
      hf.set(21, await oedema(21));
    }, 300_000);
    it('the lung-water shunt falls ≥ 25 % and PCWP falls (FiO2 0.4; the shunt fall is a mechanism check of E-V1-2, not a clinical band)', () => {
      const { a, b } = hf.get(40)!;
      expect(b.shunt).toBeLessThanOrEqual(0.75 * a.shunt);
      expect(b.pcwp).toBeLessThan(a.pcwp);
    });
    it.fails('FiO2 0.4: SpO2 rises ≥ 2 (measured SpO2 98 → 98, SaO2 98.7 → 99.1: the 7b oedema shunt does not desaturate)', () => {
      const { a, b } = hf.get(40)!;
      expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    });
    it.fails('room air (FiO2 0.21): SpO2 rises ≥ 2 (measured SpO2 94.0 → 95.0, SaO2 94.9 → 95.5: shunt 0.15 → 0.10 moves SpO2 by 1)', () => {
      const { a, b } = hf.get(21)!;
      expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    });
  });

  it('disconnection: capnogram < 1 mmHg within 4 s, EtCO2 numeric 0 within 14 s (10 s peak window after the last breath), ventilator Disconnection alarm within one breath', async () => {
    const { ventAlarms, setCircuit } = await import('../src/index.ts');
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 120);
    setCircuit(s.vs, 'disconnected');
    let alarmAt = Infinity;
    for (let k = 1; k <= 750; k++) {
      s.advanceTo(120 + k * 0.02);
      if (alarmAt === Infinity && ventAlarms(s.vs).some((a) => a.id === 'disconnection')) alarmAt = s.now() - 120;
    }
    const co2 = new Float32Array(Math.round(11 * 62.5));
    s.engine.readSamples('co2', Math.round(124 * 62.5), co2);
    const { num } = await import('./helpers.ts');
    if (process.env.PRINT) console.log(`LINK disconnect: alarm +${alarmAt.toFixed(2)} s, co2 max 124–135 ${Math.max(...co2).toFixed(2)}, etco2 ${num(s.events, 'etco2', 131, 135).join(',')}`);
    expect(alarmAt).toBeLessThanOrEqual(60 / 14 + 0.5);
    expect(Math.max(...co2)).toBeLessThan(1);
    expect(Math.max(...num(s.events, 'etco2', 134, 135))).toBe(0);
  });
});
