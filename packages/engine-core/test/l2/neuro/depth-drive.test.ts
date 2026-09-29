import { describe, expect, it } from 'vitest';
import { depth } from '../../../src/l2/neuro/depth.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';

const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
const di = (ce: Partial<typeof C0>, mac: { potent?: number; n2o?: number } = {}, ageY = 40, t1 = 0, stimulus = 0) =>
  depth({ ageY, ce: { ...C0, ...ce }, macPotent: mac.potent ?? 0, macN2o: mac.n2o ?? 0, t1, stimulus });
const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const vent = (v: Partial<typeof V0>, macVolatile = 0) =>
  neuroResp({ vent: { ...V0, ...v }, macVolatile, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('depth index (tables §5d)', () => {
  it('awake 93; propofol Ce 3–4 µg/mL (35 y) → 35–50; 1.0 MAC potent volatile → 40–45', () => {
    expect(di({}).diRaw).toBeCloseTo(93, 5);
    expect(di({ propofol: 3000 }, {}, 35).diRaw).toBeGreaterThan(44);
    expect(di({ propofol: 3000 }, {}, 35).diRaw).toBeLessThan(50);
    expect(di({ propofol: 4000 }, {}, 35).diRaw).toBeGreaterThan(35);
    expect(di({ propofol: 4000 }, {}, 35).diRaw).toBeLessThan(40);
    expect(di({}, { potent: 1 }).diRaw).toBeGreaterThan(40);
    expect(di({}, { potent: 1 }).diRaw).toBeLessThan(45);
  });
  it('burst suppression below ~30: 2 MAC gives SR > 20 %, 1 MAC none', () => {
    expect(di({}, { potent: 2 }).sr).toBeGreaterThan(20);
    expect(di({}, { potent: 1 }).sr).toBe(0);
  });
  it('opioids alone barely move the index; ketamine raises it; N2O ~0', () => {
    expect(di({ remifentanil: 4 }).diRaw).toBeGreaterThan(90);
    expect(di({ ketamine: 1500 }).diRaw).toBeGreaterThan(93);
    expect(di({ ketamine: 1500 }).conscious).toBe(false);
    expect(di({}, { n2o: 70 / 104 }).diRaw).toBeGreaterThan(90);
  });
  it('MAC-awake: conscious at 0.25 MAC, not at 0.4 MAC', () => {
    expect(di({}, { potent: 0.25 }).conscious).toBe(true);
    expect(di({}, { potent: 0.4 }).conscious).toBe(false);
  });
  it('light anaesthesia: 0.5 MAC, no opioid, laryngoscopy → stress > 0.7 and movement when unparalysed; fentanyl 2 ng/mL + 1 MAC blunts it < 0.2', () => {
    const light = di({}, { potent: 0.5 }, 40, 1, 1);
    expect(light.stress).toBeGreaterThan(0.7);
    expect(light.movement).toBe(true);
    expect(di({}, { potent: 0.5 }, 40, 0, 1).movement).toBe(false);
    expect(di({ fentanyl: 2 }, { potent: 1 }, 40, 1, 1).stress).toBeLessThan(0.2);
  });
  it('antinociception (7e reads it): 0 awake, > 0.8 with fentanyl 2 ng/mL + 1 MAC; hypnotic MAC-equivalents rise with the agents', () => {
    expect(di({}).antinoc).toBe(0);
    expect(di({ fentanyl: 2 }, { potent: 1 }).antinoc).toBeGreaterThan(0.8);
    expect(di({}, { potent: 1 }).hypEq).toBeCloseTo(1, 9);
    expect(di({ propofol: 3000 }, {}, 35).hypEq).toBeCloseTo(3000 / 3080, 9);
  });
  it('neuroglycopenia (7e seam, decision 19): 1 → unconscious with the index < 60; absent → neutral', () => {
    const g = depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, glyco: 1 });
    expect(g.conscious).toBe(false);
    expect(g.diRaw).toBeLessThan(60);
    expect(depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0 }).diRaw).toBeCloseTo(93, 5);
  });
  it('EMG artefact: stimulated and unparalysed adds 10–20 points', () => {
    const a = di({ propofol: 3000 }, {}, 35, 1, 1).diRaw - di({ propofol: 3000 }, {}, 35, 0, 1).diRaw;
    expect(a).toBeGreaterThan(10);
    expect(a).toBeLessThan(20);
  });
});

describe('respiratory-drive depression (tables §5d)', () => {
  it('remifentanil: C50 0.92 ng/mL; 1 ng/mL → VE at fixed CO2 −50–60 %, resting −25–31 % (Nieuwenhuijs −58/−28)', () => {
    expect(vent({ opioid: 0.92 }).opioidDep).toBeCloseTo(0.5, 5);
    const r = vent({ opioid: 1 });
    expect(r.totalDep).toBeGreaterThan(0.5);
    expect(r.totalDep).toBeLessThan(0.6);
    expect(1 - r.veRest).toBeGreaterThan(0.25);
    expect(1 - r.veRest).toBeLessThan(0.31);
  });
  it('remifentanil curve is monotone; slope ×0.27 needs ≈ 2 ng/mL (Babenco bolus); apnoea by 5 ng/mL', () => {
    let prev = 0;
    for (const c of [0.25, 0.5, 1, 2, 3, 4]) {
      const d = vent({ opioid: c }).totalDep;
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
    expect(1 - vent({ opioid: 1.94 }).totalDep).toBeGreaterThan(0.22);
    expect(1 - vent({ opioid: 1.94 }).totalDep).toBeLessThan(0.32);
    expect(vent({ opioid: 5 }).apnoea).toBe(true);
  });
  it('opioid pattern: RR falls, VT kept; propofol pattern: VT falls, RR rises', () => {
    const o = vent({ opioid: 2 });
    expect(o.rrMult).toBeLessThan(0.6);
    expect(o.vtMult).toBeCloseTo(1, 5);
    const p = vent({ propofol: 2000 });
    expect(p.rrMult).toBeGreaterThan(1.2);
    expect(p.vtMult).toBeLessThan(0.6);
  });
  it('propofol 1 µg/mL → resting −10–16 %, fixed-CO2 −40–48 %; 1 MAC volatile fixed-CO2 −55–70 %', () => {
    const p = vent({ propofol: 1000 });
    expect(1 - p.veRest).toBeGreaterThan(0.1);
    expect(1 - p.veRest).toBeLessThan(0.16);
    expect(p.hypnoticDep).toBeGreaterThan(0.4);
    expect(p.hypnoticDep).toBeLessThan(0.48);
    expect(vent({}, 1).hypnoticDep).toBeGreaterThan(0.55);
    expect(vent({}, 1).hypnoticDep).toBeLessThan(0.7);
  });
  it('synergy: propofol 1 + remifentanil 1 depresses more than the product of each', () => {
    const both = vent({ propofol: 1000, opioid: 1 }).totalDep;
    const indep = 1 - (1 - vent({ propofol: 1000 }).totalDep) * (1 - vent({ opioid: 1 }).totalDep);
    expect(both).toBeGreaterThan(indep);
  });
  // FU-6 R3(d), E-FU6-10 (Orchestrator ruling (FU-6 review), 2026-09-28; Q-FU6-4 / D21): the tables §4.6 `uaCollapse`
  // row is the SEDATED patient and KEEPS its bands on the unconscious arm; the awake arm follows Eikermann 2003 AJRCCM
  // 167:1024 (near-normal VT at TOFR 0.5–0.7 with impaired dilator function). Re-specified, not widened: both
  // quantities are still asserted, on both arms, and the awake values are the formula's (0.8·0.75·UA_AROUSAL scaling).
  it('NMB: diaphragm 97 % blocked → apnoea; 50 % → full VT; residual TOFR 0.6 with a natural airway → the tables\' obstruction when unconscious, a small load with a near-normal VT when awake (Eikermann 2003; E-FU6-10, the awake row was > 0.4 — measured 0.150)', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0.97 }).apnoea).toBe(true);
    expect(neuroResp({ ...base, diaBlock: 0.5 }).vtMult).toBeCloseTo(1, 5);
    const ob = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true, hypnotic: 1 }); // unconscious: the tables' patient
    expect(ob.obstruction).toBeGreaterThan(0.4);
    expect(ob.vtMult).toBeLessThan(0.6);
    const aw = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true }); // awake: dilator tone compensates
    expect(aw.obstruction).toBeGreaterThan(0.1); // a LOAD the drive sees (Step 3's `load`), not zero
    expect(aw.obstruction).toBeLessThan(0.2);
    expect(aw.vtMult).toBeGreaterThan(0.8); // near-normal VT (Eikermann 2003)
  });
  it('curare cleft only while a partial block wears off: none unparalysed, none at full block, visible at 60 % diaphragm block', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 42, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0 }).cleft).toBe(0);
    expect(neuroResp({ ...base, diaBlock: 0.99 }).cleft).toBeLessThan(0.15);
    expect(neuroResp({ ...base, diaBlock: 0.6 }).cleft).toBeGreaterThan(0.3);
  });
});

describe('interactions', () => {
  it('1 MAC volatile lowers non-depolariser EC50 by ~33 %; Mg 2 mmol/L by ~23 %; myasthenia ×0.3, sux resistant', () => {
    const N = { profile: 'normal' as const, volatileMac: 0, mgMmolL: 0.9, tempC: 37 };
    const v = ec50Multipliers({ ...N, volatileMac: 1 });
    expect(v.rocuronium).toBeGreaterThan(0.62);
    expect(v.rocuronium).toBeLessThan(0.72);
    expect(v.succinylcholine).toBe(1);
    expect(ec50Multipliers({ ...N, mgMmolL: 2 }).rocuronium).toBeCloseTo(1 / 1.3, 5);
    const mg = ec50Multipliers({ ...N, profile: 'myasthenia' });
    expect(mg.rocuronium).toBeCloseTo(0.3, 5);
    expect(mg.succinylcholine).toBeCloseTo(2.6, 5);
  });
});
