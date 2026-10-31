import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceBlood, applyBloodCommand, bloodEcgTargets, createBloodState, pkBus, qtcDeltaCa, validateBloodCommand } from '../../../src/l2/blood/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { Command } from '../../../src/types.ts';
import { infusionW } from '../../../src/l2/thermal/environment.ts'; // Stage 7e (E-7e-1)

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
/** A unit rig WITHOUT a circuit or 7g (hemo {}, no pk): the Stage 2 fallback and 7c's own drug path. */
function rig(pk?: unknown) {
  const l1 = createL1State(MAN);
  const rs = createRespState(MAN, l1, 1);
  const bs = createBloodState(MAN);
  return { l1, rs, bs, ctx: { resp: rs, hemo: {}, l1, ...(pk ? { pk } : {}) } };
}
const bv = (bs: ReturnType<typeof createBloodState>) => bs.core.fl.vp + bs.core.fl.hbG * 3;

describe('blood pipeline: commands, view, labs, ECG targets', () => {
  it('validates only its own kinds (null = pass on); the circulation’s crystalloid/colloid/blood ids are accepted', () => {
    expect(validateBloodCommand(ev({ kind: 'fluid', fluid: 'rl', volumeMl: 500 }))).toBeUndefined();
    for (const fluid of ['crystalloid', 'colloid', 'blood']) expect(validateBloodCommand(ev({ kind: 'fluid', fluid, volumeMl: 500, overS: 600 }))).toBeUndefined();
    expect(validateBloodCommand(ev({ kind: 'fluid', volumeMl: 0 }))).toMatch(/volumeMl/);
    expect(validateBloodCommand(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))).toBeNull();
    expect(validateBloodCommand(ev({ kind: 'drug', drugId: 'magnesium', dose: 2, unit: 'g' }))).toBeUndefined();
    expect(validateBloodCommand(ev({ kind: 'condition', id: 'mh', severity: 1 }))).toBeNull();
    expect(validateBloodCommand(ev({ kind: 'condition', id: 'dka', severity: 2 }))).toMatch(/severity/);
    expect(validateBloodCommand(ev({ kind: 'airway', state: 'patent' }))).toBeNull();
    expect(validateBloodCommand({ id: 'x', issuedBy: 't', type: 'setTarget', variable: 'hr', value: 70 } as Command)).toBeNull();
  });
  it('a 500 mL bleed over 60 s removes exactly 500 mL (minus refill); the circulation’s colloid is gelatin', () => {
    const { bs, ctx } = rig();
    advanceBlood(bs, ctx, 5);
    const bv0 = bv(bs);
    expect(applyBloodCommand(bs, ev({ kind: 'bleed', volumeMl: 500, overS: 60 }), 5, ctx.resp)).toBe(true);
    advanceBlood(bs, ctx, 65.05);
    const lost = bv0 - bv(bs);
    expect(bs.core.fl.flows).toHaveLength(0); // the whole 500 mL has run
    expect(lost).toBeGreaterThan(490);
    expect(lost).toBeLessThan(500);
    expect(bs.view.coFactor).toBeGreaterThan(0.98); // ≈ 10 % loss is compensated
    applyBloodCommand(bs, ev({ kind: 'fluid', fluid: 'colloid', volumeMl: 500, overS: 600 }), 66, ctx.resp);
    expect(bs.core.fl.flows[0]?.comp?.colloidGL).toBe(35);
  });
  it('labs every second; a VBG sent with a 60 s turnaround resolves at +60 s with venous values', () => {
    const { bs, ctx } = rig();
    advanceBlood(bs, ctx, 10);
    expect(bs.events.filter((e) => e.type === 'labs')).toHaveLength(10);
    applyBloodCommand(bs, ev({ kind: 'lab', panel: 'vbg', turnaroundS: 60 }), 10, ctx.resp);
    advanceBlood(bs, ctx, 75);
    const r = bs.events.find((e) => e.type === 'labResult');
    expect(r?.type === 'labResult' && r.t).toBe(70);
    if (r?.type === 'labResult') expect(r.values.pco2).toBeGreaterThan(ctx.resp.co2.pf + 2); // venous > arterial
    expect(bs.out.hbfRel).toBeCloseTo(1, 1); // the block 7g/7d read
    expect(bs.out.albuminGL).toBe(bs.out.albGL);
    expect(bs.out.bvRel).toBeCloseTo(1, 3);
  });
  it('ECG targets: sux in burns raises the K delta; low iCa lengthens QTc', () => {
    const { bs, ctx } = rig();
    applyBloodCommand(bs, ev({ kind: 'condition', id: 'burns', severity: 0.5 }), 0, ctx.resp);
    applyBloodCommand(bs, ev({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg' }), 0, ctx.resp);
    advanceBlood(bs, ctx, 240);
    expect(bloodEcgTargets(bs).k).toBeGreaterThan(3);
    expect(qtcDeltaCa(0.9)).toBeCloseTo(20, 6);
    expect(qtcDeltaCa(1.2)).toBe(0);
  });
  it('blood.out.dkaSeverity (0–1) publishes the ketoacid drive the blood model applies, for the endocrine model', () => {
    const { bs, ctx } = rig();
    advanceBlood(bs, ctx, 1);
    expect(bs.out.dkaSeverity).toBe(0);
    expect(applyBloodCommand(bs, ev({ kind: 'condition', id: 'dka', severity: 0.6 }), 1, ctx.resp)).toBe(true);
    advanceBlood(bs, ctx, 2);
    expect(bs.out.dkaSeverity).toBeCloseTo(0.6, 2);
    expect(bs.out.ag).toBeGreaterThan(20); // the same drive that raises the anion gap
  });
  it('an unwarmed unit runs into the heat model at 4 °C: ≈ 0.25 °C of a 70 kg core (a physical IV heat term)', () => {
    const { bs, ctx, rs } = rig();
    applyBloodCommand(bs, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 300 }), 0, ctx.resp);
    advanceBlood(bs, ctx, 100);
    expect(rs.temp.iv).toEqual({ mlPerMin: 56, tempC: 4 }); // 280 mL over 300 s
    expect((-infusionW(rs.temp.iv.mlPerMin, rs.temp.iv.tempC, 36.8) * 300) / rs.temp.capCore).toBeCloseTo(0.25, 1); // the heat step integrates it
    advanceBlood(bs, ctx, 301);
    expect(rs.temp.iv.mlPerMin).toBe(0);
  });
});

describe('a crystalloid at its own temperature; a cooling infusion the team stops by protocol', () => {
  it('validates tempC (0–42 °C) and stopAtCoreC (30–42 °C) on a fluid order', () => {
    expect(validateBloodCommand(ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900, tempC: 4, stopAtCoreC: 38 }))).toBeUndefined();
    expect(validateBloodCommand(ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, tempC: 60 }))).toMatch(/tempC/);
    expect(validateBloodCommand(ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, stopAtCoreC: 20 }))).toMatch(/stopAtCoreC/);
  });
  it('refrigerated saline (4 °C, MHAUS/EMHG "chilled 4–8 °C") runs into the heat model at 4 °C; without tempC at room temperature', () => {
    const { bs, ctx, rs } = rig();
    applyBloodCommand(bs, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900, tempC: 4 }), 0, ctx.resp);
    advanceBlood(bs, ctx, 10);
    expect(rs.temp.iv.mlPerMin).toBeCloseTo(1600 / 15, 6);
    expect(rs.temp.iv.tempC).toBe(4);
    const b = rig();
    applyBloodCommand(b.bs, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900 }), 0, b.ctx.resp);
    advanceBlood(b.bs, b.ctx, 10);
    expect(b.rs.temp.iv.tempC).toBe(b.rs.temp.ta); // the theatre's 21 °C, as before
  });
  it('stopAtCoreC: the cooling infusion stops once the core has fallen to it (MHAUS: stop cooling at 38 °C), not before', () => {
    const { bs, ctx, rs } = rig();
    rs.temp.tc = 38.6;
    applyBloodCommand(bs, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900, tempC: 4, stopAtCoreC: 38 }), 0, ctx.resp);
    advanceBlood(bs, ctx, 60);
    expect(bs.core.fl.flows).toHaveLength(1);
    expect(rs.temp.iv.mlPerMin).toBeGreaterThan(100);
    rs.temp.tc = 37.99;
    advanceBlood(bs, ctx, 61);
    expect(bs.core.fl.flows).toHaveLength(0);
    expect(rs.temp.iv.mlPerMin).toBe(0);
    rs.temp.tc = 38.6; // a stopped order does not restart
    advanceBlood(bs, ctx, 70);
    expect(rs.temp.iv.mlPerMin).toBe(0);
  });
});

describe('drug-bus observer', () => {
  const bus = (doses: unknown[], kShift = 0) => ({ bus: { doses, metabolic: { kShift } } });
  it('pkBus reads the drug bus by duck typing; absent → null (fallback)', () => {
    expect(pkBus(undefined)).toBeNull();
    expect(pkBus({})).toBeNull();
    expect(pkBus(bus([], -0.4))?.kShift).toBe(-0.4);
  });
  it('the logged drug doses (library units) reach the mass balance once; salbutamol is NOT read from the log', () => {
    const pk = bus([
      { agent: 'succinylcholine', mgPerKg: 1.43, amount: 100_000, amountUnit: 'mcg', t: 0 },
      { agent: 'calciumChloride', mgPerKg: 14.3, amount: 1000, amountUnit: 'mg', t: 0 },
      { agent: 'sodiumBicarbonate', mgPerKg: null, amount: 50, amountUnit: 'mmol', t: 0 },
      { agent: 'magnesium', mgPerKg: 28.6, amount: 2000, amountUnit: 'mg', t: 0 },
      { agent: 'insulinDextrose', mgPerKg: null, amount: 10, amountUnit: 'units', t: 0 },
      { agent: 'salbutamol', mgPerKg: 0.14, amount: 10_000, amountUnit: 'mcg', t: 0 },
      { agent: 'hypertonicSaline', mgPerKg: null, amount: 250, amountUnit: 'mL', t: 0, concentrationPct: 3 },
    ]);
    const { bs, ctx } = rig(pk);
    const na0 = bs.core.so.na;
    const mg0 = bs.core.so.mg;
    advanceBlood(bs, ctx, 0.05);
    expect(bs.core.doses.map((d) => d.id).sort()).toEqual(['calciumChloride', 'insulinDextrose', 'sodiumBicarbonate', 'succinylcholine']);
    expect(bs.core.so.na - na0).toBeCloseTo(50, 1); // + one 0.1 s step of the HTS flow (its sodium runs in over 15 min)
    expect(bs.core.so.mg - mg0).toBeCloseTo(2 * 4.06, 2); // less one 0.1 s step of Mg redistribution
    expect(bs.core.fl.flows[0]?.leftMl).toBeGreaterThan(249); // 250 mL of 3 % NaCl running
    pk.bus.doses = []; // 7g lists each dose for one pass only
    advanceBlood(bs, ctx, 1);
    expect(bs.core.doses).toHaveLength(4);
  });
  it('with the drug model, the β2/insulin K shift is bus.metabolic.kShift only; without it, the blood model’s own salbutamol curve', () => {
    const own = rig();
    applyBloodCommand(own.bs, ev({ kind: 'drug', drugId: 'salbutamol', dose: 10, unit: 'mg' }), 0, own.ctx.resp);
    advanceBlood(own.bs, own.ctx, 1800);
    const g = rig(bus([], -0.8));
    g.bs.core.doses.push({ id: 'salbutamol', t0: 0, amount: 10 }); // even if present, ignored with 7g
    advanceBlood(g.bs, g.ctx, 1800);
    const none = rig(bus([], 0));
    none.bs.core.doses.push({ id: 'salbutamol', t0: 0, amount: 10 });
    advanceBlood(none.bs, none.ctx, 1800);
    console.log(`salbutamol K at 30 min: own ${own.bs.out.k.toFixed(2)}, 7g kShift −0.8 ${g.bs.out.k.toFixed(2)}, 7g 0 ${none.bs.out.k.toFixed(2)}`);
    const k0 = none.bs.out.k; // never both: with 7g present the 7c salbutamol curve is off (kShift 0 → no fall)
    expect(Math.abs(k0 - 4.2)).toBeLessThan(0.05);
    for (const k of [own.bs.out.k, g.bs.out.k]) {
      expect(k0 - k).toBeGreaterThanOrEqual(0.5); // tables: salbutamol −0.5 to −1.0 over 30 min
      expect(k0 - k).toBeLessThanOrEqual(1.0);
    }
  });
});
