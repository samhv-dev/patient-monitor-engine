import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, concOf, createPkState, NEUTRAL_PK_CTX, validatePkCommand } from '../../../src/l2/pk/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('PK pipeline', () => {
  it('validates every library drug, 7c-owned ids included (R51 §3); non-drug commands are not its business', () => {
    const pk = createPkState();
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'unobtainium', dose: 1, unit: 'mg', route: 'iv' }), pk)).toMatch(/unknown drug/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'propofol', dose: 1, unit: 'units', route: 'iv' }), pk)).toMatch(/unit/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 1, unit: 'mmol/kg', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand(ev({ kind: 'infusion', drugId: 'calciumChloride', rate: 10, unit: 'mg/min' }), pk)).toMatch(/bolus/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }), pk)).toBeUndefined();
    expect(validatePkCommand({ type: 'setMode', mode: 'manual' } as Command, pk)).toBeNull();
  });
  it('a propofol bolus gives Eleveld Ce ≈ 3 µg/mL at ~2.9 min, moves SVR down and is on the bus per agent', () => {
    const pk = createPkState({ ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' });
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }), 0)).toBe(true);
    advancePk(pk, NEUTRAL_PK_CTX, 175);
    expect(concOf(pk, 'propofol')).toBeGreaterThan(2.8);
    expect(pk.fx.svr).toBeLessThan(0.85);
    expect(pk.bus.cns.propCe).toBeGreaterThan(2.8);
    const a = pk.bus.agents.propofol!;
    expect(a.unit).toBe('µg/mL');
    expect(a.brain).toBeCloseTo(concOf(pk, 'propofol'), 12);
    expect(a.plasma).toBeGreaterThan(a.brain * 0.5);
    expect(a.cumulativeMgPerKg).toBeCloseTo(2, 12);
    expect(a.vent).toBeUndefined(); // not an opioid
  });
  it('every drug event is consumed; each bolus is in bus.doses for exactly one pass (7c/7f observe, R51 §3)', () => {
    const pk = createPkState();
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }), 0)).toBe(true);
    expect(applyPkCommand(pk, ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }), 0)).toBe(true);
    advancePk(pk, NEUTRAL_PK_CTX, 60);
    expect(pk.bus.doses).toEqual([
      { agent: 'succinylcholine', mgPerKg: 1, amount: 70000, amountUnit: 'mcg', t: 0 },
      { agent: 'calciumChloride', mgPerKg: 1000 / 70, amount: 1000, amountUnit: 'mg', t: 0 },
    ]);
    const sux = pk.bus.agents.succinylcholine!;
    expect(sux.nmj).toBeGreaterThan(0); // thumb and diaphragm published per agent (not max-only)
    expect(sux.dia).toBeGreaterThan(0);
    expect(sux.cumulativeMgPerKg).toBeCloseTo(1, 12);
    advancePk(pk, NEUTRAL_PK_CTX, 61);
    expect(pk.bus.doses).toEqual([]);
  });
  it('opioids carry a SEPARATE ventilatory effect site (remifentanil ke0 0.92 vs brain 0.595, R51 §2)', () => {
    const pk = createPkState({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' });
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 30);
    const a = pk.bus.agents.remifentanil!;
    expect(a.unit).toBe('ng/mL');
    expect(a.vent!).toBeGreaterThan(a.brain * 1.2); // the faster site leads during the rise (fixer prototype 3.98 vs 2.80 ng/mL, ×1.42)
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }), 30);
    advancePk(pk, NEUTRAL_PK_CTX, 90);
    const f = pk.bus.agents.fentanyl!;
    expect(f.vent).toBeCloseTo(f.brain, 12); // tables give no fentanyl ventilatory ke0: vent ke0 = brain ke0 [ENG]
  });
  it('an infusion reaches steady state and dose 0 stops it; TCI holds a target; the vaporiser publishes Fet and MAC per agent', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 900);
    expect(concOf(pk, 'norepinephrine')).toBeCloseTo(0.1, 2); // rate-equivalent → the infusion rate at steady state
    expect(pk.bus.doses).toEqual([]); // rate changes are not bolus doses
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'norepinephrine', dose: 0, unit: 'mcg/kg/min', route: 'iv', infusion: true }), 900);
    advancePk(pk, NEUTRAL_PK_CTX, 1800);
    expect(concOf(pk, 'norepinephrine')).toBeLessThan(0.005);
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 }), 1800);
    advancePk(pk, NEUTRAL_PK_CTX, 2100);
    expect(concOf(pk, 'remifentanil')).toBeCloseTo(3, 1);
    applyPkCommand(pk, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6, n2oFrac: 0.5 }), 2100);
    advancePk(pk, NEUTRAL_PK_CTX, 2700);
    const sevo = pk.bus.volatiles.sevoflurane!;
    const n2o = pk.bus.volatiles.n2o!;
    expect(sevo.macFrac).toBeGreaterThan(0.6); // prototype 0.69 at 10 min (dial 2 %, FGF 6, 7 L circle)
    expect(sevo.fet).toBeGreaterThan(sevo.brain); // brain lags end-tidal during wash-in
    expect(sevo.macAge).toBeCloseTo(1.8, 6); // 40 y
    expect(n2o.macFrac).toBeGreaterThan(0.3); // addendum 9: N2O is a bus volatile too (fixer prototype 0.37)
    expect(pk.bus.cns.macBrain).toBeCloseTo(sevo.macFrac + n2o.macFrac, 12);
  });
  it('sugammadex binds rocuronium in plasma AND at the effect sites: thumb Ce < 0.4× within 3 min (plasma-only 0.62×)', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    const before = pk.bus.agents.rocuronium!.nmj!; // fixer prototype 1858 ng/mL
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg', route: 'iv' }), 1200);
    advancePk(pk, NEUTRAL_PK_CTX, 1380);
    expect(pk.bus.agents.rocuronium!.nmj!).toBeLessThan(before * 0.4); // fixer prototype 510 ng/mL = 0.27×
    expect(pk.bus.agents.rocuronium!.sgxBoundFrac!).toBeGreaterThan(0);
  });
  it('the state is JSON-safe (snapshot) and stepping is on the absolute 0.1 s grid', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 10.05);
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' }), 10.05);
    const copy = JSON.parse(JSON.stringify(pk)); // snapshots travel as JSON: no Infinity/NaN may live in the state
    advancePk(pk, NEUTRAL_PK_CTX, 100);
    advancePk(copy, NEUTRAL_PK_CTX, 100);
    expect(copy.drugs.fentanyl.x).toEqual(pk.drugs.fentanyl!.x);
    expect(copy.drugs.remifentanil.x).toEqual(pk.drugs.remifentanil!.x);
    expect(pk.t).toBeCloseTo(100, 9);
  });
});
