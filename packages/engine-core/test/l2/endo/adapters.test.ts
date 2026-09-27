// Stage 7e adapters: fallbacks and the duck-typed seams (7a circ.ext, 7c blood.core, 7f neuro, 7d organs, 7g bus).
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { defaultModifiers } from '../../../src/modifiers.ts';
import { betaBlunt } from '../../../src/l2/pk/pd.ts';
import { ecgDeltas, observeDoses, pkActive, preBlunt, readEndoInputs, readInfusions, writeBlood, writeCirc, writeCond } from '../../../src/l2/endo/adapters.ts';
import { createEndoState, type EndoCtx } from '../../../src/l2/endo/pipeline.ts';
import { createThermal } from '../../../src/l2/thermal/heat.ts';

function ctx(ps: Record<string, unknown> = {}, hemo: Record<string, unknown> = {}, mode: 'manual' | 'modeled' = 'manual'): EndoCtx {
  const temp = createThermal(36.8, 70);
  const resp = { temp, o2: { sa: 0.97 }, co2: { pf: 40 }, lungSpecs: [] } as unknown as EndoCtx['resp'];
  const l1 = createL1State();
  l1.mode = mode;
  return { l1, hemo: hemo as unknown as EndoCtx['hemo'], resp, ps };
}
const circ = () => ({ ext: {} as Record<string, number>, prof: { betaBlock: 0, betaBlockC: 0, bloodVolumeMl: 5000 }, base: { v0Sv: 2500 }, beats: [{ map: 90 }] });

describe('Stage 7e adapters', () => {
  it('fallbacks: MAP from the L1 truth (120/80 → 93.3) without a circuit, gas truths from Stage 3, antinociception 0 awake, 0.6 under the GA flag', () => {
    const c = ctx();
    const es = createEndoState(undefined, 70);
    const x = readEndoInputs(c, es, 1);
    expect(x.mapMmHg).toBeCloseTo(93.33, 2);
    expect([x.sao2, x.paco2, x.antinoc, x.betaBlock, x.epiExoPgMl, x.dkaSeverity, x.liverF]).toEqual([0.97, 40, 0, 0, 0, 0, 1]);
    c.resp.temp.anaesthesia = 'general';
    c.resp.temp.depth = 1;
    expect(readEndoInputs(c, es, 1).antinoc).toBeCloseTo(0.6, 9);
  });

  it('7f/7d/7a/7c/7g reads: thermoDepth/nmb always; 7f antinoc only while 7g has an active agent; β-block from 7a; DKA from 7c', () => {
    const es = createEndoState(undefined, 70);
    const neuro = { antinoc: 0.9, nmb: 1, thermoDepth: 0.7 };
    const idle = ctx({ neuro, organs: { liver: { glucoseF: 0.5 } }, pk: { bus: { agents: {}, volatiles: {} } } }, { circ: { ...circ(), prof: { betaBlock: 0.5, betaBlockC: 0.25, bloodVolumeMl: 5000 } } });
    const x = readEndoInputs(idle, es, 1);
    expect(x.antinoc).toBe(0); // 7f present but no drug acting: the GA-flag fallback (awake → 0)
    expect([x.liverF, x.betaBlock, x.betaBlockC, x.mapMmHg]).toEqual([0.5, 0.5, 0.25, 90]);
    expect(idle.resp.temp.nmb).toBe(1);
    expect(idle.resp.temp.depthIn).toBe(0.7);
    const busy = ctx({ neuro, pk: { bus: { agents: { epinephrine: { brain: 0.05 } }, airway: { bronchodilation: 0.4 } } }, blood: { out: { dkaSeverity: 0.8 } } });
    const y = readEndoInputs(busy, es, 1);
    expect(y.antinoc).toBe(0.9);
    expect(y.epiExoPgMl).toBeCloseTo(728.2, 1); // 0.05 µg/kg/min rate-equivalent ÷ 68.66 mL/min/kg
    expect(y.bronchoDilExt).toBe(0.4);
    expect(y.dkaSeverity).toBe(0.8);
    expect(pkActive({ bus: { volatiles: { sevoflurane: { macFrac: 1 } } } })).toBe(true);
    const keto = ctx({ blood: { core: { so: { keto: 150 }, fl: { vp: 3000, visf: 12000 } } } });
    expect(readEndoInputs(keto, es, 1).dkaSeverity).toBeCloseTo(0.4, 9); // 10 mmol/L ÷ 25 (fallback when 7c publishes no severity)
  });

  it('7g doses and infusions: dextrose 25 000 mg → +210 mg/dL; insulin units; infusion rates from pk.drugs.<id>.rate', () => {
    const es = createEndoState(undefined, 70);
    observeDoses(es, { bus: { doses: [{ agent: 'dextrose', amount: 25_000, amountUnit: 'mg' }, { agent: 'propofol', amount: 140, amountUnit: 'mg' }] } });
    expect(es.core.glucose.g).toBeCloseTo(100 + 25_000 / (1.7 * 70), 6);
    observeDoses(es, { bus: { doses: [{ agent: 'insulin', amount: 10, amountUnit: 'units' }] } });
    expect(es.core.glucose.iExo).toBeCloseTo(1e7 / (120 * 70), 6);
    readInfusions(es, { drugs: { insulin: { rate: 4 / 60 }, dextrose: { rate: 10_000 / 60 } } });
    expect(es.core.glucose.insUuMin).toBeCloseTo((4 * 1e6) / 60, 6);
    expect(es.core.glucose.dexMgMin).toBeCloseTo(10_000 / 60, 6);
  });

  it('MODELED: circ.ext.endo* written even though 7a’s initialiser omits them; V0 sign/unit per 7a; at rest exactly neutral', () => {
    const es = createEndoState(undefined, 70);
    const cm = circ();
    const c = ctx({}, { circ: cm }, 'modeled');
    expect(writeCirc(c, es)).toBe(1);
    expect(cm.ext).toEqual({ endoHrF: 1, endoSvrF: 1, endoEesF: 1, endoDV0Frac: -0 });
    es.core.out = { ...es.core.out, hrF: 1.6, svrF: 0.5, eesF: 0.9, dV0Frac: 0.12 };
    writeCirc(c, es);
    expect(cm.ext.endoSvrF).toBe(0.5);
    expect(cm.ext.endoDV0Frac).toBeCloseTo((-0.12 * 5000) / 2500, 12); // venodilation = NEGATIVE 7a fraction (V0 × 1.24)
    expect(cm.ext.endoHrF).toBeCloseTo(1.6, 12);
  });

  it('F4: a β-blocked (7g) patient with fever keeps the fever tachycardia: 7a’s betaBlunt(endoHrF) = betaBlunt(stress) × fever', () => {
    const es = createEndoState(undefined, 70);
    es.core.out = { ...es.core.out, hrF: 1.3, feverHrF: 1.18 }; // 39 °C: +12 %/°C above 37.5 (≈ 9 bpm/°C at 75)
    const cm = circ();
    const c = ctx({ pk: { betaBlockAdd: 0.8 } }, { circ: cm }, 'modeled');
    writeCirc(c, es);
    const seen = betaBlunt(cm.ext.endoHrF as number, 0.8); // what 7a's control() applies
    expect(seen).toBeCloseTo(betaBlunt(1.3, 0.8) * 1.18, 12);
    expect(seen / betaBlunt(1.3, 0.8) - 1).toBeGreaterThanOrEqual(0.08 * 1.5); // ≥ +8 %/°C over the 1.5 °C above 37.5
    expect(preBlunt(0.9, 0.8)).toBe(0.9); // ≤ 1 passes through (betaBlunt does not touch it)
  });

  it('MANUAL: 7a keys neutral, the rhythm-clock factor = betaBlunt(stress × condition rows, 7g) × fever above the set point; 1 when hr is pinned', () => {
    const es = createEndoState(undefined, 70);
    es.core.out = { ...es.core.out, hrF: 1.3, condHrF: 1, feverHrF: 1.3, feverHrFExcess: 1.1 }; // MANUAL uses the excess above the set point
    const cm = circ();
    cm.ext.endoHrF = 1.5;
    const c = ctx({ pk: { betaBlockAdd: 0.5 } }, { circ: cm });
    expect(writeCirc(c, es)).toBeCloseTo(1.15 * 1.1, 12);
    expect(cm.ext.endoHrF).toBe(1);
    c.l1.pinned.push('hr');
    expect(writeCirc(c, es)).toBe(1);
  });

  it('7c/7g writes: endoKShift, lab glucose, kfMult only on change; ps.cond.vasoResp', () => {
    const es = createEndoState(undefined, 70);
    expect(writeBlood({}, es)).toBe(false);
    const ps = { blood: { core: { fl: { kfMult: 2 } } as Record<string, unknown> } };
    expect(writeBlood(ps, es)).toBe(true);
    expect(ps.blood.core.endoGlucoseMgDl).toBeCloseTo(100, 6);
    expect(ps.blood.core.endoKShift).toBeCloseTo(0, 12);
    expect((ps.blood.core.fl as { kfMult: number }).kfMult).toBe(2); // another writer's value survives a resting 7e
    es.core.out = { ...es.core.out, kfMult: 3 };
    writeBlood(ps, es);
    expect((ps.blood.core.fl as { kfMult: number }).kfMult).toBe(3);
    const q: { cond?: { vasoResp: number } } = {};
    writeCond(q, es);
    expect(q.cond).toEqual({ vasoResp: 1 });
  });

  it('ECG deltas: nothing at rest; a 3 °C core fall lowers mods.tempC by 3 and keeps an instructor offset', () => {
    const es = createEndoState(undefined, 70);
    const th = createThermal(36.8, 70);
    const m0 = { ...defaultModifiers(), tempC: 36 }; // instructor-set
    expect(ecgDeltas(es, th, m0)).toBe(m0);
    th.tc = 33.8;
    const m1 = ecgDeltas(es, th, m0);
    expect(m1.tempC).toBeCloseTo(33, 9);
    expect(ecgDeltas(es, th, m1)).toBe(m1); // no change → same object
  });
});
