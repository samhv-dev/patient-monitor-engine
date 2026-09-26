// R27 two-way link, in process (lockstep): the ventilator's settings move SpO2, EtCO2, ABP and CVP through the
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, run, snap } from './helpers.ts';

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

  it('COPD GOLD 3–4 at RR 20 / VT 8 mL/kg: auto-PEEP > 8 cmH2O and MAP falls > 15 mmHg; RR 10 reverses it', async () => {
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
    expect(b.autoPeep).toBeGreaterThan(8);
    expect(a.map - b.map).toBeGreaterThan(15);
    expect(c.map).toBeGreaterThan(b.map + 10);
  });

  it('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5', async () => {
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

  it('cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls', async () => {
    const s = createLinkedSim({ profile: 'oedema-cardiogenic' });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 12 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    log('hf peep5', a); log('hf peep12', b);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    expect(b.co).toBeLessThan(0.97 * a.co);
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
