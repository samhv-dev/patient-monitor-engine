// R27 two-way link, in process (lockstep): the ventilator's settings move SpO2, EtCO2, ABP and CVP through the
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { beforeAll, describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, lungShunt, pcwp, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`LINK ${tag}: ${fmt(o)}`); };

describe('ventilator settings move the monitor through the link', { timeout: 300_000 }, () => {
  it('PEEP 5 → 15 (normal): CO −5…−15 %, MAP falls > 8 mmHg, CVP rises 1.5–3.5 mmHg (respiratory coupling)', async () => {
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

  it('RR 14 → 22 (VT 500): EtCO2 falls ≥ 2 mmHg in 2 min and keeps falling (respiratory kinetics: slow compartment)', async () => {
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

  // COPD dynamic hyperinflation. History: NR-3 (docs/gates/stage-7a.md) kept "MAP falls > 15" as an it.fails; commit
  // 1a1787eb (the Stage 7b closure of NR-3) made it a passing "> 3, by direction" and the RR-10 reversal "> b + 2".
  // Neither 15 nor 3 had a source. Brief 87 searched for one: Pepe & Marini 1982 (Am Rev Respir Dis 126:166, the
  // auto-PEEP effect), Tuxen & Lane 1987 (Am Rev Respir Dis 136:872; hypotension at the highest hyperinflation volumes),
  // Dellinger 5e ch. 10 (Fig. 10.3: a 40-s disconnection raises BP and CO) and ch. 38, Hines & Jones (Coexisting
  // Disease 8e) ch. 8 and the Miller chapters state the direction (auto-PEEP lowers venous return, CO and BP), none the
  // size of the MAP fall at a given auto-PEEP. So the original 15 / +10 are kept, tagged [FIT: no source found], and
  // never the softened 3 / +2: the fall is an expected failure until a source states its size. One run in beforeAll,
  // so a crash fails the passing test instead of letting the it.fails pass silently.
  describe('COPD GOLD 3–4 dynamic hyperinflation (RR 10 → 20 → 10, VT 8 mL/kg)', () => {
    let a: ReturnType<typeof snap>;
    let b: ReturnType<typeof snap>;
    let c: ReturnType<typeof snap>;
    beforeAll(async () => {
      const s = createLinkedSim({ profile: 'copd-gold-3-4', vent: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' } });
      await run(s, 180);
      a = snap(s, 150, 180);
      s.set({ rate: 20 });
      await run(s, 300);
      b = snap(s, 270, 300);
      s.set({ rate: 10 });
      await run(s, 420);
      c = snap(s, 390, 420);
      log('copd rr10', a); log('copd rr20', b); log('copd back', c);
    }, 300_000); // the describe's own timeout, as the oedema block's beforeAll
    // R46: the GOLD 3 auto-PEEP band at RR 20 is 6–12 cmH2O (was > 8/10–15, an ENG guess); measured 7.7
    it('RR 20: auto-PEEP 6–12 cmH2O (R46); RR 10 brings MAP back > 10 mmHg above the RR-20 level [FIT: no source found]', () => {
      expect(b.autoPeep).toBeGreaterThanOrEqual(6);
      expect(b.autoPeep).toBeLessThanOrEqual(12);
      expect(c.map).toBeGreaterThan(b.map + 10);
    });
    it.fails('RR 10 → 20: MAP falls > 15 mmHg with the auto-PEEP [FIT: no source found: the auto-PEEP papers give the direction, not the size] — measured −12.5 (102.9 → 90.4) at auto-PEEP 7.7', () => {
      expect(a.map - b.map).toBeGreaterThan(15);
    });
  });

  // NEEDS A RULING (Stage 7b gate note): on main (7a) the SpO2 fall 60 s after PEEP 15 → 5 was 98 → 94.6 (−3.4); with 7b's
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  // Stage V.1 (G7b ruling 4+5+13): the interim link recruitment (logistic PEEP → shunt, τ 40/10 s) is retired; the 7b lungs
  // recruit on their own (R46: PEEP alone −20 % shunt, de-recruitment τ 2 min), so the band — fitted to the interim curve —
  // is further away: SpO2 95.0 → 97.0 at PEEP 15 (+2.0 vs ≥ 5) and 97.0 60 s after PEEP 5 (0 vs > 3; plan prototype +1.5 / 0.0). Stays it.fails (R45);
  // calibration row "ARDS link band: re-derive from 7b's recruitment" (orchestrator ruling (V.1 review) 2).
  it.fails('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 (measured +2.0 / 0.0 on the lungs)', async () => {
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
    it.fails('FiO2 0.4: SpO2 rises ≥ 2 (measured SpO2 98 → 98, SaO2 98.7 → 99.1: the lung oedema shunt does not desaturate)', () => {
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
