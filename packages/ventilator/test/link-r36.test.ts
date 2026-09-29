// R36 demonstrations through the in-process link: PH crisis, tension pneumothorax, massive PE, fibrosis.
// Vascular events use the profile/demo stand-ins (engine volumeStatus/shunt) until Stage 7a's right heart.
import { describe, expect, it } from 'vitest';
import { createLinkedSim, PROFILES, LUNG_PATHOLOGIES, STAND_INS, CIRC_CONDITIONS, type LinkedSim } from '../src/index.ts';

const standIn = (s: LinkedSim, id: string) => {
  for (const x of STAND_INS[id] ?? []) s.send({ type: 'setTarget', variable: x.variable, value: x.value, ramp: { durationS: x.rampS } });
  const c = CIRC_CONDITIONS[id]; // Stage 7a: PE and tension pneumothorax are circulation conditions now
  if (c) s.send({ type: 'applyEvent', event: { kind: 'condition', id: c.id, severity: c.severity } });
};
import { fmt, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`R36 ${tag}: ${fmt(o)}`); };

describe('R36 demonstrations', { timeout: 300_000 }, () => {
  // 32 rows × 60 sim-s of a full engine (7a+7b+7c on main): ≈ 300 s on the shared CI runner (timed out at the 300 s
  // default in PR #20's run); 900 s budget, the loop yields per row through run().
  it('every catalogue row is a link profile and starts cleanly (60 s, no rejected command)', { timeout: 900_000 }, async () => {
    expect(Object.keys(PROFILES)).toHaveLength(LUNG_PATHOLOGIES.length);
    for (const row of LUNG_PATHOLOGIES) {
      const s = createLinkedSim({ profile: row.id });
      await run(s, 60); // createLinkedSim throws on a rejected command
      expect(s.events.some((e) => e.type === 'breath')).toBe(true);
    }
  });

  // Orchestrator ruling (V.1 review) 7: the profile now carries 7b's `ph` lungs on 7a's right heart; EtCO2 +5.0 sits on
  // the band edge (+6.8 in the plan's prototype, +6.0 on main before V.1) — calibration row. If a merge takes it below +5 → it.fails with the numbers (R45).
  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (V.1 on the 7b `ph` lungs: +5.0 / +2.1 / −11.1; EtCO2 on the band edge, calibration row)', async () => {
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

  // Stage V.1 (G7b rulings 4+5+13): the tension is the engine's own lung condition — ptxTension replaces ptxSimple;
  // its pleural pressure reaches 7a through respPleural and the ventilator through lungState.pleuralCmH2O. The
  // compliance patch, the MANUAL shunt 0.3 and 7a's tensionPtx stand-in are retired.
  it('tension pneumothorax: plateau rises ≥ 10 cmH2O into the catalogue band 25–50, SpO2 falls ≥ 4, MAP falls ≥ 20 with CVP rising ≥ 5', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-simple', vent: { pmax: 60 } });
    await run(s, 120);
    const a = snap(s, 90, 120);
    s.send({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxSimple', severity: 0 } });
    s.send({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 0.8 } });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('ptx simple', a); log('ptx tension', b);
    expect(b.plat - a.plat).toBeGreaterThanOrEqual(10);
    expect(b.plat).toBeGreaterThanOrEqual(25);
    expect(b.plat).toBeLessThanOrEqual(50);
    expect(a.spo2 - b.spo2).toBeGreaterThanOrEqual(4);
    expect(a.map - b.map).toBeGreaterThanOrEqual(20);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(5);
  });

  // On FU-4's tree the lungs' tension builds its pleural pressure through F3's one-way valve toward the catalogue ceiling
  // (0.8 × 25 mmHg = 27.2 cmH2O): 17.5 cmH2O at 90 s (the plan's step model had 27.2 at once) — the plateau is inside
  // the band from the pressure built so far (gate note §1, §8).
  it('tension-pneumothorax profile (G7b ruling 5, calibration row "tension-ptx ventilator plateau"): plateau 25–50, ΔP 20–45 on the engine\'s lungs (90 s: plateau 26.0, ΔP 21.0, pleural 17.5 building toward 27.2)', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-tension', vent: { pmax: 60 } });
    await run(s, 90);
    const m = s.vs.p.measured;
    const ls = [...s.events].reverse().find((e) => e.type === 'lungState') as { pleuralCmH2O?: number } | undefined;
    if (process.env.PRINT) console.log(`R36 tension profile: plat ${m.PLAT.toFixed(1)} ΔP ${(m.PLAT - s.vs.cfg.peep).toFixed(1)} pip ${m.PIP.toFixed(1)} C ${s.vs.cfg.compliance} pleural ${ls?.pleuralCmH2O}`);
    expect(ls?.pleuralCmH2O).toBeGreaterThan(5.44 + s.vs.cfg.peep); // above PEEP: the lung is re-opened each breath
    expect(ls?.pleuralCmH2O).toBeLessThanOrEqual(27.2 + 0.05); // the catalogue ceiling (0.8 × 25 mmHg)
    expect(m.PLAT).toBeGreaterThanOrEqual(25);
    expect(m.PLAT).toBeLessThanOrEqual(50);
    expect(m.PLAT - s.vs.cfg.peep).toBeGreaterThanOrEqual(20);
    expect(m.PLAT - s.vs.cfg.peep).toBeLessThanOrEqual(45);
  });

  // NEEDS A RULING NR-3: the PE stand-in is now Stage 7a's own condition (φ 0.6): CO −8 %, EtCO2 unchanged — the EtCO2 fall
  // of PE is alveolar dead space (Stage 7b); the old MANUAL-target stand-in raised CO on 7a's trackers. it.fails flags it.
  // Stage 7b: closed — the scenario sends 7a's PE condition (the stand-in) AND the lung's `pe` condition (plan decision 14),
  // whose alveolar dead space lowers EtCO2 at unchanged ventilation.
  it('massive PE (stand-in): EtCO2 falls ≥ 4 mmHg with ventilation unchanged; airway pressures unchanged', async () => {
    const s = createLinkedSim({ profile: 'normal' });
    await run(s, 120);
    const a = snap(s, 90, 120);
    standIn(s, 'pe-massive');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.12 });
    s.send({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'pe', severity: 1 } }); // Stage 7b
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
