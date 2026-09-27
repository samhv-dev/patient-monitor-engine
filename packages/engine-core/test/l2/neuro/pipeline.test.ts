import { describe, expect, it } from 'vitest';
import type { Command, EngineEvent } from '../../../src/types.ts';
import { applyNeuroCommand, createNeuroState, stepNeuroTo, validateNeuroCommand, type NeuroState } from '../../../src/l2/neuro/pipeline.ts';
import { busFixture, dose, nmbAgent, opioid, vol } from '../../helpers/neuro-bus.ts';
import { give as giveDrug, rig, runTo } from '../../helpers/neuro.ts';

const ENV = { tempC: 37, mechanical: false };
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
const dev = (action: Record<string, unknown>) => ({ id: 'd', issuedBy: 't', type: 'device', action }) as Command;
const give = (ns: NeuroState, c: Command, t: number) => {
  expect(validateNeuroCommand(c)).toBeUndefined();
  return applyNeuroCommand(ns, c, t);
};
const kinds = (ns: NeuroState) => ns.out.filter((e): e is Extract<EngineEvent, { type: 'neuroMark' }> => e.type === 'neuroMark').map((e) => e.kind);
const lastAn = (ns: NeuroState) => ns.out.filter((e): e is Extract<EngineEvent, { type: 'anaesthesia' }> => e.type === 'anaesthesia').pop();
const ROC_FULL = { rocuronium: nmbAgent(3000, 3000, 0.6) };
const SEVO = (mac: number) => ({ sevoflurane: vol(mac, 1.8) }); // steady state: end-tidal = brain

describe('neuro pipeline', () => {
  it('validates its own commands; drug and vaporiser events are 7g\'s (null / false: never consumed, R51 §3)', () => {
    const roc = ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    expect(validateNeuroCommand(roc)).toBeNull();
    expect(validateNeuroCommand(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 }))).toBeNull();
    expect(applyNeuroCommand(createNeuroState({}, 1), roc, 0)).toBe(false);
    expect(validateNeuroCommand(ev({ kind: 'airwayDevice', device: 'lma' }))).toMatch(/none, ett or sga/);
    expect(validateNeuroCommand(ev({ kind: 'neuroProfile', cholinesterase: 'homozygous' }))).toMatch(/patient-profile/);
    expect(validateNeuroCommand(dev({ device: 'tof', action: 'start', intervalS: 5 }))).toMatch(/12–60/);
    expect(validateNeuroCommand(dev({ device: 'nibp', action: 'start' }))).toBeNull();
  });
  it('stimulus is OBSERVED (apply false, 7e consumes it): intensity/1.5 → 7f\'s level, held until the next event', () => {
    const ns = createNeuroState({}, 1);
    expect(applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 1 }), 0)).toBe(false);
    expect(ns.stim.level).toBeCloseTo(1 / 1.5, 9);
    stepNeuroTo(ns, 600, ENV, busFixture());
    expect(ns.stim.level).toBeCloseTo(1 / 1.5, 9); // no duration: it persists
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 2 }), 600);
    expect(ns.stim.level).toBe(1);
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 0 }), 610);
    expect(ns.stim.level).toBe(0);
  });
  it('steps on the 10 Hz grid, one anaesthesia event per second, JSON-safe; propofol 3 µg/mL → loss of consciousness', () => {
    const ns = createNeuroState({ weightKg: 70 }, 1);
    stepNeuroTo(ns, 60, ENV, busFixture({ cns: { propCe: 3 } }));
    expect(ns.k).toBe(601);
    expect(ns.out.filter((e) => e.type === 'anaesthesia').length).toBe(60);
    expect(kinds(ns)).toContain('lossOfConsciousness');
    expect(lastAn(ns)?.ce.propofol).toBe(3000);
    expect(JSON.parse(JSON.stringify(ns)).k).toBe(601);
  });
  it('the resp hook: remifentanil 5 ng/mL at 7g\'s ventilatory site → apnoea mark and rrMult 0', () => {
    const ns = createNeuroState({}, 1);
    stepNeuroTo(ns, 5, ENV, busFixture({ cns: { opioidCeRemiEq: 3 }, agents: { remifentanil: opioid(3, 5) } }));
    expect(ns.resp.apnoea).toBe(true);
    expect(ns.resp.rrMult).toBe(0);
    expect(kinds(ns)).toContain('apnoea');
  });
  it('naloxone (F2) on 7g\'s real PK: remifentanil 0.3 µg/kg/min → apnoea; naloxone 0.4 mg → breathing again within 3 min', () => {
    const r = rig();
    const ns = createNeuroState({}, 1);
    giveDrug(r, 'remifentanil', 0.3, 'mcg/kg/min', true);
    runTo(r, 10, (bus, tMin) => stepNeuroTo(ns, tMin * 60, ENV, bus));
    expect(ns.resp.apnoea).toBe(true);
    giveDrug(r, 'naloxone', 0.4, 'mg');
    let back = Number.NaN;
    runTo(r, 13, (bus, tMin) => {
      stepNeuroTo(ns, tMin * 60, ENV, bus);
      if (Number.isNaN(back) && !ns.resp.apnoea) back = tMin - 10;
    });
    expect(back).toBeLessThan(3);
    expect(ns.resp.veRest).toBeGreaterThan(0.5);
    expect(kinds(ns)).toContain('breathing');
  });
  it('awareness under NMB: full rocuronium block, no hypnotic → awareness mark; the depth device reports DI', () => {
    const ns = createNeuroState({}, 1);
    applyNeuroCommand(ns, dev({ device: 'depth', action: 'on' }), 0);
    stepNeuroTo(ns, 10, ENV, busFixture({ agents: ROC_FULL }));
    expect(kinds(ns)).toContain('awareness');
    expect(lastAn(ns)?.awarenessRisk).toBe(true);
    expect(ns.out.some((e) => e.type === 'measurement' && e.values.di !== undefined)).toBe(true);
  });
  it('light anaesthesia: 0.5 MAC potent volatile, unparalysed, laryngoscopy (7e intensity 1.5) → movement mark and stress > 0.6', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    const bus = busFixture({ volatiles: SEVO(0.5) });
    stepNeuroTo(ns, 60, ENV, bus);
    applyNeuroCommand(ns, ev({ kind: 'stimulus', intensity: 1.5 }), 60);
    stepNeuroTo(ns, 70, ENV, bus);
    expect(kinds(ns)).toContain('movement');
    expect(lastAn(ns)?.stress).toBeGreaterThan(0.6);
  });
  it('the gas monitor\'s mac numeric is END-TIDAL (Σ fet/macAge); the event carries the brain MAC separately', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    stepNeuroTo(ns, 5, ENV, busFixture({ volatiles: { sevoflurane: { fet: 1.8, brain: 0.9, macAge: 1.8, macFrac: 0.5 } } })); // wash-in: Et ahead of brain
    const m = ns.out.filter((e): e is Extract<EngineEvent, { type: 'measurement' }> => e.type === 'measurement' && e.values.mac !== undefined).pop();
    expect(m?.values.mac?.value).toBe(1);
    expect(m?.values.etAa?.value).toBe(1.8);
    expect([lastAn(ns)?.mac, lastAn(ns)?.macBrain]).toEqual([1, 0.5]);
  });
  it('7e seams (duck-typed, neutral without 7e): neuroglycopenia 1 → unconscious; hypothermic macF 0.8 deepens the same tension', () => {
    const a = createNeuroState({}, 1);
    stepNeuroTo(a, 5, { ...ENV, neuroglycopenia: 1 }, busFixture());
    expect(lastAn(a)?.conscious).toBe(false);
    const warm = createNeuroState({}, 1);
    const cold = createNeuroState({}, 1);
    stepNeuroTo(warm, 5, ENV, busFixture({ volatiles: SEVO(0.8) }));
    stepNeuroTo(cold, 5, { ...ENV, macF: 0.8 }, busFixture({ volatiles: SEVO(0.8) }));
    expect(lastAn(cold)?.macBrain).toBeCloseTo(1, 2);
    expect(lastAn(cold)?.di ?? 0).toBeLessThan((lastAn(warm)?.di ?? 0) - 5);
  });
  it('succinylcholine on bus.doses is observed once: fasciculation 25 s later; MH-susceptible → one mhTrigger mark; no potassium output', () => {
    const ns = createNeuroState({ neuro: { mhSusceptible: true } }, 1);
    const bus = busFixture({ doses: [dose('succinylcholine', 1, 0)] });
    stepNeuroTo(ns, 30, ENV, bus);
    stepNeuroTo(ns, 60, ENV, bus); // the same log read again: nothing new
    expect(kinds(ns).filter((k) => k === 'fasciculation')).toHaveLength(1);
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
    expect('kRiseMmolL' in ns.outputs).toBe(false);
  });
  it('publishes the 7e fields ps.neuro.{antinoc, nmb, thermoDepth}: neutral awake; 1 MAC + fentanyl 2 ng/mL + full block', () => {
    const ns = createNeuroState({ ageY: 40 }, 1);
    expect([ns.antinoc, ns.nmb, ns.thermoDepth]).toEqual([0, 0, 0]);
    stepNeuroTo(ns, 5, { tempC: 37, mechanical: true }, busFixture({
      cns: { opioidCeRemiEq: 3.2 },
      volatiles: SEVO(1),
      agents: { fentanyl: opioid(2, 2), ...ROC_FULL },
    }));
    expect(ns.antinoc).toBeGreaterThan(0.8);
    expect(ns.nmb).toBeGreaterThan(0.99);
    expect(ns.thermoDepth).toBeGreaterThan(1);
    expect(ns.thermoDepth).toBeLessThanOrEqual(1.5);
  });
  it('residual block with a natural airway → obstruction; with a tube → none', () => {
    const a = createNeuroState({}, 1);
    give(a, ev({ kind: 'airwayDevice', device: 'none' }), 0);
    const bus = busFixture({ agents: { rocuronium: nmbAgent(605, 605, 0.6) } }); // thumb T1 ≈ 0.81 → TOFR ≈ 0.6
    stepNeuroTo(a, 5, ENV, bus);
    expect(a.resp.obstruction).toBeGreaterThan(0.3);
    give(a, ev({ kind: 'airwayDevice', device: 'ett' }), 5);
    stepNeuroTo(a, 6, ENV, bus);
    expect(a.resp.obstruction).toBe(0);
  });
});
