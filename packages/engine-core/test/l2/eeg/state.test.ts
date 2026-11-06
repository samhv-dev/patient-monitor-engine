// EEG E1 (plan §7 E1): the cortical state — each variable's direction for each drug class, and the sourced anchors
// as values (research/43 P-1, P-2, P-7, P-12; Miller Ch35/Ch36; Stecker 2001).
import { describe, expect, it } from 'vitest';
import {
  brainDo2Rel, cortexInputsOf, cortexStep, DEXMED_LOR_NG_ML, N2O_TRIGGER_MAC, N2O_TRANSIENT_TAU_S, SUPP_ESTABLISHED, SUPP_NEAR_ISO,
} from '../../../src/l2/eeg/state.ts';
import { ce50Propofol, locPropofol } from '../../../src/l2/neuro/depth.ts';
import { DEXMED_EEG_C50_NG_ML } from '../../../src/l2/pk/combine.ts';
import { MAC_AWAKE } from '../../../src/l2/pk/volatile.ts';
import { busFixture } from '../../helpers/neuro-bus.ts';
import type { CortexInputs } from '../../../src/types-eeg.ts';

const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
type Patch = Partial<Omit<CortexInputs, 'hyp' | 'mac'>> & { hyp?: Partial<CortexInputs['hyp']>; mac?: Partial<CortexInputs['mac']> };
const inp = (p: Patch = {}): CortexInputs => ({
  ageY: 40, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37,
  ...p, hyp: { ...H0, ...(p.hyp ?? {}) }, mac: { ...M0, ...(p.mac ?? {}) },
});
const cx = (p: Patch = {}) => cortexStep(undefined, inp(p), 0.1);

describe('EEG E1 cortical state', () => {
  it('awake, no drug: every drug variable 0, no suppression, no metabolic failure', () => {
    const c = cx({ ageY: 18 });
    for (const k of ['hyper', 'lor', 'deep', 'suppress', 'ketDepol', 'n2oTransient', 'opioid', 'arousal', 'metabolic', 'cold'] as const) expect(c[k], k).toBe(0);
    expect(c.ageAmp).toBe(1);
    expect(c.ageSlope).toBe(1);
  });

  it('hyper: GABA-ergic IV, benzodiazepine, the ethers and dexmedetomidine hyperpolarise; ketamine, N2O and opioids do not (Ch36 p. 1142)', () => {
    expect(cx({ hyp: { gabaIv: ce50Propofol(40) } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ hyp: { barbiturate: ce50Propofol(40) } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ hyp: { etomidate: ce50Propofol(40) } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ hyp: { benzo: ce50Propofol(40) } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ mac: { sevoflurane: 1 } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ mac: { isoflurane: 0.5, desflurane: 0.5 } }).hyper).toBeCloseTo(1, 9);
    expect(cx({ alpha2Eq: 1 }).hyper).toBeCloseTo(1, 9);
    expect(cx({ hyp: { dissociative: 5000 } }).hyper).toBe(0);
    expect(cx({ mac: { n2o: 0.7 } }).hyper).toBe(0);
    expect(cx({ opioidFentEq: 20 }).hyper).toBe(0);
  });

  it('lor = 1 at each class\'s own loss-of-responsiveness level: propofol LOC C50(age), MAC-awake, dexmedetomidine 2.09 ng/mL', () => {
    for (const age of [25, 50, 75]) expect(cx({ ageY: age, hyp: { gabaIv: locPropofol(age) } }).lor).toBeCloseTo(1, 9);
    expect(cx({ mac: { sevoflurane: MAC_AWAKE } }).lor).toBeCloseTo(1, 9);
    expect(DEXMED_LOR_NG_ML).toBe(2.09);
    expect(cx({ alpha2Eq: 2.09 / DEXMED_EEG_C50_NG_ML }).lor).toBeCloseTo(1, 9);
  });

  it('deep: 0 until sevoflurane ≈ 1.7 % (Ch36 p. 1143) = 1.7/1.80 MAC at 40 y, then grows', () => {
    expect(cx({ mac: { sevoflurane: 0.9 } }).deep).toBe(0);
    expect(cx({ mac: { sevoflurane: 1.7 / 1.8 } }).deep).toBeCloseTo(0, 9);
    expect(cx({ mac: { sevoflurane: 1.2 } }).deep).toBeGreaterThan(0.2);
    expect(cx({ mac: { sevoflurane: 1.2 } }).volShare).toBeCloseTo(1, 9);
  });

  it('C9 / P-1: volatile burst-suppression ONSET in age-adjusted MAC — iso 1.3, sevo 1.4 (Pilge 2014), des 1.25 (Rampil 1991, inferred)', () => {
    const cases: [keyof typeof M0, number][] = [['isoflurane', 1.3], ['sevoflurane', 1.4], ['desflurane', 1.25]];
    for (const [a, on] of cases) {
      expect(cx({ mac: { [a]: on - 0.01 } }).suppress, a).toBe(0);
      expect(cx({ mac: { [a]: on + 0.01 } }).suppress, a).toBeGreaterThan(0);
      expect(cx({ mac: { [a]: on } }).suppressDrive, a).toBeCloseTo(1, 9);
    }
  });

  it('P-1: established at 1.5 MAC, near-isoelectric at 2.0 MAC, for every ether (Ch35 Table 35.1; Ch10 pp. 188, 205)', () => {
    for (const a of ['isoflurane', 'sevoflurane', 'desflurane'] as const) {
      expect(cx({ mac: { [a]: 1.5 } }).suppress, a).toBeCloseTo(SUPP_ESTABLISHED, 9);
      expect(cx({ mac: { [a]: 2.0 } }).suppress, a).toBeCloseTo(SUPP_NEAR_ISO, 9);
      expect(cx({ mac: { [a]: 2.6 } }).suppress, a).toBe(1);
    }
    expect(SUPP_NEAR_ISO).toBeGreaterThan(SUPP_ESTABLISHED);
  });

  it('C8: propofol burst-suppression onset at 4.9 µg/mL (Pilge 2014 CP50_BS; Ch36 p. 1141 "about 5")', () => {
    expect(cx({ hyp: { gabaIv: 4850 } }).suppress).toBe(0);
    expect(cx({ hyp: { gabaIv: 4950 } }).suppress).toBeGreaterThan(0);
    // thiopental and etomidate suppress at the same propofol-equivalent; the IV and ether loads add
    expect(cx({ hyp: { barbiturate: 4950 } }).suppress).toBeGreaterThan(0);
    expect(cx({ hyp: { gabaIv: 2000 }, mac: { sevoflurane: 0.9 } }).suppress).toBeGreaterThan(0);
  });

  it('never burst suppression from opioids, benzodiazepines, ketamine, N2O or dexmedetomidine alone (Ch35 Table 35.1, p. 1106)', () => {
    for (const p of [{ opioidFentEq: 200 }, { hyp: { benzo: 50000 } }, { hyp: { dissociative: 50000 } }, { mac: { n2o: 1.5 } }, { alpha2Eq: 20 }] as Patch[]) expect(cx(p).suppress, JSON.stringify(p)).toBe(0);
  });

  it('opioid + volatile at low MAC: no coupling (a named gap, Fig. 36.6 B) — an opioid does not move the suppression drive', () => {
    expect(cx({ mac: { desflurane: 0.6 }, opioidFentEq: 10 }).suppressDrive).toBeCloseTo(cx({ mac: { desflurane: 0.6 } }).suppressDrive, 12);
  });

  it('C34: O2 delivery — EEG abnormal below CBF 20 of 50 mL/100 g/min (0.4), voltage lost toward 12 (0.24) (Ch35 pp. 1105, 1122)', () => {
    expect(cx({ do2Rel: 0.45 }).metabolic).toBe(0);
    expect(cx({ do2Rel: 0.4 }).metabolic).toBe(0);
    expect(cx({ do2Rel: 0.32 }).metabolic).toBeCloseTo(0.5, 9);
    expect(cx({ do2Rel: 0.32 }).suppress).toBe(0); // slowing with preserved voltage first
    expect(cx({ do2Rel: 0.24 }).metabolic).toBe(1);
    expect(cx({ do2Rel: 0.24 }).suppress).toBe(1);
    // hypoxaemia acts through the same delivery: compensated by flow it changes nothing (Ch35 p. 1126)
    expect(brainDo2Rel(1, 14, 0.97, 95)).toBeCloseTo(1, 9);
    expect(brainDo2Rel(1.5, 14, 0.65, 35)).toBeGreaterThan(0.95);
    expect(brainDo2Rel(1, 14, 0.3, 20)).toBeLessThan(0.4);
  });

  it('C35: hypothermia — slowing as the core cools, burst suppression from 24.4 °C, silence at 17.8 °C (Stecker 2001; Ch35 p. 1127 "15–18 °C")', () => {
    expect(cx({ tempC: 37 }).cold).toBe(0);
    expect(cx({ tempC: 30 }).cold).toBeGreaterThan(0);
    expect(cx({ tempC: 25 }).suppress).toBe(0);
    expect(cx({ tempC: 21 }).suppress).toBeGreaterThan(0);
    expect(cx({ tempC: 17.8 }).suppress).toBe(1);
  });

  it('ketDepol = the dissociative equivalent ÷ the LOC level (1 = ketamine alone at loss of responsiveness)', () => {
    expect(cx({ hyp: { dissociative: locPropofol(40) } }).ketDepol).toBeCloseTo(1, 9);
    expect(cx({ hyp: { gabaIv: 5000 } }).ketDepol).toBe(0);
  });

  it('C16 / P-2: the N2O transient — none at steady state; a ≥ 0.5 MAC step saturates it; it decays with τ 3 min (Pavone 2016); both directions', () => {
    let s = cortexStep(undefined, inp({ mac: { n2o: 0.6 } }), 0.1);
    for (let i = 0; i < 100; i++) s = cortexStep(s, inp({ mac: { n2o: 0.6 } }), 0.1);
    expect(s.n2oTransient).toBe(0);
    expect(N2O_TRIGGER_MAC).toBe(0.5);
    expect(N2O_TRANSIENT_TAU_S).toBe(180);
    let u = cortexStep(undefined, inp(), 0.1);
    u = cortexStep(u, inp({ mac: { n2o: 0.5 } }), 0.1);
    expect(u.n2oTransient).toBeCloseTo(1, 2);
    for (let t = 0; t < 180; t += 1) u = cortexStep(u, inp({ mac: { n2o: 0.5 } }), 1);
    expect(u.n2oTransient).toBeGreaterThan(0.3);
    expect(u.n2oTransient).toBeLessThan(0.45); // ≈ e^−1 after one τ
    const down = cortexStep(s, inp({ mac: { n2o: 0 } }), 0.1);
    expect(down.n2oTransient).toBe(1); // an abrupt DECREASE too (Ch36 p. 1144)
    const small = cortexStep(s, inp({ mac: { n2o: 0.5 } }), 0.1);
    expect(small.n2oTransient).toBeLessThan(0.3);
  });

  it('opioid = fentanyl-eq ÷ 8 ng/mL (Ch36 p. 1144); arousal = stimulus × (1 − antinociception)', () => {
    expect(cx({ opioidFentEq: 8 }).opioid).toBeCloseTo(1, 12);
    expect(cx({ stimulus: 1, antinoc: 0.25 }).arousal).toBeCloseTo(0.75, 12);
    expect(cx({ stimulus: 1, antinoc: 1 }).arousal).toBe(0);
  });

  it('age: slope ≈ 20 % flatter (Ch36 p. 1145; Kreuzer 2020) and amplitude × 0.4 at 90 y (Purdon 2015: 2–3-fold smaller); children × 1 (P-3)', () => {
    expect(cx({ ageY: 90 }).ageSlope).toBeCloseTo(0.8, 9);
    expect(cx({ ageY: 90 }).ageAmp).toBeCloseTo(0.4, 9);
    expect(cx({ ageY: 60 }).ageAmp).toBeLessThan(cx({ ageY: 40 }).ageAmp);
    expect(cx({ ageY: 5 }).ageAmp).toBe(1);
    expect(cx({ ageY: 5 }).ageSlope).toBe(1);
  });

  it('cortexStep is pure: the same previous state and inputs give the same output; the previous state is not mutated', () => {
    const p = cx({ mac: { n2o: 0.2 } });
    const frozen = structuredClone(p);
    const a = cortexStep(p, inp({ mac: { n2o: 0.7 }, hyp: { gabaIv: 3000 } }), 0.1);
    const b = cortexStep(p, inp({ mac: { n2o: 0.7 }, hyp: { gabaIv: 3000 } }), 0.1);
    expect(a).toEqual(b);
    expect(p).toEqual(frozen);
  });

  it('cortexInputsOf reads the bus: µg/mL → ng/mL, macFrac ÷ the hypothermic macF, opioid fentanyl-eq', () => {
    const bus = busFixture({ cns: { opioidCeFentEq: 3 }, volatiles: { sevoflurane: { fet: 1.8, brain: 1.8, macAge: 1.8, macFrac: 0.9 } } });
    bus.cns.hypByClass = { gabaIv: 2, barbiturate: 0, etomidate: 0, benzo: 0.5, dissociative: 0 };
    bus.cns.alpha2Eq = 0.3;
    const x = cortexInputsOf(bus, { ageY: 40, stimulus: 0.5, antinoc: 0.2, do2Rel: 1, tempC: 36, macF: 0.9 });
    expect(x.hyp.gabaIv).toBeCloseTo(2000, 9);
    expect(x.hyp.benzo).toBeCloseTo(500, 9);
    expect(x.mac.sevoflurane).toBeCloseTo(1, 9);
    expect(x.opioidFentEq).toBe(3);
    expect(x.alpha2Eq).toBe(0.3);
  });
});
