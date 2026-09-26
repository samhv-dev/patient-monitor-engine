// R36 demonstrations through the in-process link: PH crisis, tension pneumothorax, massive PE, fibrosis.
// Vascular events use the profile/demo stand-ins (engine volumeStatus/shunt) until Stage 7a's right heart.
import { describe, expect, it } from 'vitest';
import { createLinkedSim, PROFILES, LUNG_PATHOLOGIES, STAND_INS, type LinkedSim } from '../src/index.ts';

const standIn = (s: LinkedSim, id: string) => { for (const x of STAND_INS[id] ?? []) s.send({ type: 'setTarget', variable: x.variable, value: x.value, ramp: { durationS: x.rampS } }); };
import { fmt, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`R36 ${tag}: ${fmt(o)}`); };

describe('R36 demonstrations', { timeout: 300_000 }, () => {
  it('every catalogue row is a link profile and starts cleanly (60 s, no rejected command)', async () => {
    expect(Object.keys(PROFILES)).toHaveLength(LUNG_PATHOLOGIES.length);
    for (const row of LUNG_PATHOLOGIES) {
      const s = createLinkedSim({ profile: row.id });
      await run(s, 60); // createLinkedSim throws on a rejected command
      expect(s.events.some((e) => e.type === 'breath')).toBe(true);
    }
  });

  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (RV signature waits for 7a)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 15, rate: 8 });
    await run(s, 420);
    const b = snap(s, 390, 420);
    log('ph before', a); log('ph crisis', b);
    expect(b.etco2 - a.etco2).toBeGreaterThanOrEqual(5);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(1.5);
    expect(a.map - b.map).toBeGreaterThanOrEqual(8);
  });

  it('tension pneumothorax: plateau rises ≥ 10 cmH2O, SpO2 falls ≥ 4, MAP falls ≥ 20 with CVP rising ≥ 5', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-simple', vent: { pmax: 60 } });
    await run(s, 120);
    const a = snap(s, 90, 120);
    s.set({ compliance: 18, resistance: 14 });
    standIn(s, 'pneumothorax-tension');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.3 });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('ptx simple', a); log('ptx tension', b);
    expect(b.plat - a.plat).toBeGreaterThanOrEqual(10);
    expect(a.spo2 - b.spo2).toBeGreaterThanOrEqual(4);
    expect(a.map - b.map).toBeGreaterThanOrEqual(20);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(5);
  });

  it('massive PE (stand-in): EtCO2 falls ≥ 4 mmHg with ventilation unchanged; airway pressures unchanged', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 120);
    const a = snap(s, 90, 120);
    standIn(s, 'pe-massive');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.12 });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('pe before', a); log('pe after', b);
    expect(a.etco2 - b.etco2).toBeGreaterThanOrEqual(4);
    expect(Math.abs(b.plat - a.plat)).toBeLessThan(0.5);
  });

  it('fibrosis: driving pressure ≥ 15 at VT 490; VT 350 × RR 20 lowers it below 13 at the same minute volume', async () => {
    const s = createLinkedSim({ profile: 'fibrosis-ild' });
    await run(s, 60);
    const dp1 = s.vs.p.measured.PLAT - s.vs.cfg.peep;
    s.set({ vt: 350, rate: 20 });
    await run(s, 120);
    const dp2 = s.vs.p.measured.PLAT - s.vs.cfg.peep;
    if (process.env.PRINT) console.log(`R36 fibrosis ΔP ${dp1.toFixed(1)} → ${dp2.toFixed(1)}`);
    expect(dp1).toBeGreaterThanOrEqual(15);
    expect(dp2).toBeLessThan(13);
  });
});
