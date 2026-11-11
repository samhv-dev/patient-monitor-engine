// DC1 (docs/plans/scenario-builder.md §13, BQ11 = B; docs/plans/pump-rack-tci.md E2): a phase rule reads the PATIENT's
// plasma and effect-site concentration of a drug the engine carries in a compartment model, as `cp:<drugId>` and
// `ce:<drugId>`, in the drug panel's own unit (DrugPanelRow `cp`/`ce`, the 1 Hz `drugs` event). The validator refuses an
// unknown drug and every row with no compartment (the effect-curve rows, the inhaled agents, the blood-model rows), each
// with the reason. The guard: the value a rule reads is the patient's, never a TCI controller's target.
import { describe, expect, it } from 'vitest';
import type { Command, DrugsEvent, EngineEvent } from '@pme/engine-core';
import { concentrationVar, ruleConcentrations } from '../../src/scenario/concentration.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import type { RunnerInputV2, ScenarioDocV2 } from '../../src/scenario/types-v2.ts';
import { validateScenario } from '../../src/scenario/validate.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { minimalV2 } from './fixtures-v2.ts';

const errs = (d: unknown) => {
  const r = validateScenario(d);
  return r.ok ? [] : r.errors;
};
/** minimalV2 with Early signs entered on `leaf` instead. */
const withLeaf = (leaf: object) => {
  const d = minimalV2();
  d.phases[1].enter = leaf;
  return d;
};

describe('DC1: the concentration variables and their units', () => {
  it.each([
    ['cp:propofol', 'plasma', 'propofol', 'µg/mL'],
    ['ce:propofol', 'effect-site', 'propofol', 'µg/mL'],
    ['ce:remifentanil', 'effect-site', 'remifentanil', 'ng/mL'],
    ['cp:fentanyl', 'plasma', 'fentanyl', 'ng/mL'],
    ['cp:sufentanil', 'plasma', 'sufentanil', 'ng/mL'],
    ['cp:rocuronium', 'plasma', 'rocuronium', 'ng/mL'],
    ['cp:succinylcholine', 'plasma', 'succinylcholine', 'ng/mL'],
    ['cp:sugammadex', 'plasma', 'sugammadex', 'µg/mL'],
    ['cp:bupivacaine', 'plasma', 'bupivacaine', 'µg/mL'],
    ['ce:lidocaine', 'effect-site', 'lidocaine', 'µg/mL'],
    ['cp:magnesium', 'plasma', 'magnesium sulfate', 'µg/mL'],
    ['ce:norepinephrine', 'effect-site', 'norepinephrine', 'µg/kg/min eq'],
  ])('%s is the %s %s in %s (the drug panel\'s unit)', (v, site, name, unit) => {
    const c = concentrationVar(v);
    expect(c).toMatchObject({ ok: true, unit, words: `${site} ${name}` });
  });

  it('a name that is not cp:/ce: is not a concentration variable (null), so every truthVar is untouched', () => {
    for (const v of ['hr', 'etco2', 'map', 'dantroleneE', 'cpx:propofol', 'cp', 'cp:']) expect(concentrationVar(v)).toBeNull();
  });

  it.each([
    ['cp:midazolam', 'only as an effect curve'],
    ['ce:ketamine', 'only as an effect curve'],
    ['cp:dexmedetomidine', 'only as an effect curve'],
    ['ce:morphine', 'only as an effect curve'],
    ['cp:sevoflurane', 'inhaled agent'],
    ['cp:potassiumChloride', 'blood model'],
    ['cp:nosuchdrug', 'no drug "nosuchdrug" in the engine'],
  ])('%s is refused (%s)', (v, why) => {
    const c = concentrationVar(v);
    expect(c?.ok).toBe(false);
    expect(c && !c.ok && c.reason).toContain(why);
  });

  it('midazolam, ketamine and dexmedetomidine: the reason names the pump plan\'s E3a–E3c, which give them a plasma compartment', () => {
    for (const id of ['midazolam', 'ketamine', 'dexmedetomidine']) {
      const c = concentrationVar(`cp:${id}`);
      expect(c && !c.ok && c.reason).toContain('E3a–E3c');
    }
  });
});

describe('DC1: the /2 schema and validator', () => {
  it.each([
    ['a value leaf', { value: { var: 'ce:propofol', op: '<', value: 1.5, forS: 10 } }],
    ['a slope leaf', { slope: { var: 'cp:remifentanil', op: '<', perMin: 0, overS: 60 } }],
    ['an unchanged leaf', { unchanged: { var: 'cp:rocuronium', withinPct: 10, overS: 60 } }],
    ['a leaf nested in all', { all: [{ visited: 'baseline' }, { value: { var: 'cp:propofol', op: '>', value: 4 } }] }],
  ])('accepts %s on a concentration', (_n, leaf) => {
    expect(errs(withLeaf(leaf))).toEqual([]);
  });

  it('a truthVar card is still valid, and a displayed-only id is still refused', () => {
    expect(errs(minimalV2())).toEqual([]);
    expect(errs(withLeaf({ value: { var: 'nibpSys', op: '>', value: 1 } })).some((e) => e.startsWith('/phases/1/enter/value/var: must be one of'))).toBe(true);
  });

  it('refuses a malformed concentration name in the schema', () => {
    expect(errs(withLeaf({ value: { var: 'cx:propofol', op: '>', value: 1 } })).length).toBeGreaterThan(0);
  });

  it.each([
    ['cp:midazolam', '/phases/1/enter/value/var: cp:midazolam: the engine models midazolam only as an effect curve'],
    ['ce:ketamine', '/phases/1/enter/value/var: ce:ketamine: the engine models ketamine only as an effect curve'],
    ['cp:dexmedetomidine', '/phases/1/enter/value/var: cp:dexmedetomidine: the engine models dexmedetomidine only as an effect curve'],
    ['cp:nosuchdrug', '/phases/1/enter/value/var: no drug "nosuchdrug" in the engine'],
  ])('refuses %s with the reason, at the leaf\'s path', (v, message) => {
    const e = errs(withLeaf({ value: { var: v, op: '>', value: 1 } }));
    expect(e.some((x) => x.startsWith(message)), e.join('\n')).toBe(true);
  });

  it('refuses one in a nested leaf, an outcome and a precondition too', () => {
    const d = withLeaf({ any: [{ visited: 'baseline' }, { not: { slope: { var: 'cp:midazolam', op: '<', perMin: 0, overS: 60 } } }] });
    d.outcomes = [{ id: 'o', text: 'x', rule: { value: { var: 'ce:ketamine', op: '>', value: 1 } }, anchor: 'start', withinS: 60 }];
    d.actions[0].precondition = { unchanged: { var: 'cp:sevoflurane', withinPct: 5, since: 'phaseStart' } };
    const e = errs(d);
    expect(e.some((x) => x.startsWith('/phases/1/enter/any/1/not/slope/var: cp:midazolam:')), e.join('\n')).toBe(true);
    expect(e.some((x) => x.startsWith('/outcomes/0/rule/value/var: ce:ketamine:')), e.join('\n')).toBe(true);
    expect(e.some((x) => x.startsWith('/actions/0/precondition/unchanged/var: cp:sevoflurane:')), e.join('\n')).toBe(true);
  });
});

describe('DC1: the phase runner reads a concentration as rank-3 truth', () => {
  it('ruleConcentrations lists the cp:/ce: variables a card\'s rules read, once each; none for a card without one', () => {
    expect(ruleConcentrations(minimalV2() as ScenarioDocV2)).toEqual([]);
    const d = withLeaf({ all: [{ value: { var: 'ce:propofol', op: '<', value: 1.5 } }, { slope: { var: 'ce:propofol', op: '<', perMin: 0, overS: 30 } }] });
    d.outcomes = [{ id: 'o', text: 'x', rule: { value: { var: 'cp:rocuronium', op: '>', value: 1 } }, anchor: 'start', withinS: 60 }];
    expect(ruleConcentrations(d as ScenarioDocV2)).toEqual([
      { name: 'ce:propofol', site: 'ce', drugId: 'propofol' },
      { name: 'cp:rocuronium', site: 'cp', drugId: 'rocuronium' },
    ]);
  });

  it('a rule on ce:propofol enters on the value it is fed', () => {
    const d = withLeaf({ value: { var: 'ce:propofol', op: '>', value: 3, forS: 2 } }) as ScenarioDocV2;
    const r = new PhaseRunner(d);
    r.start(0);
    const ce = (v: number): RunnerInputV2 => ({ kind: 'values', rank: 3, values: { 'ce:propofol': v } });
    for (let t = 1; t <= 10; t++) r.advance(t, [ce(t < 5 ? 2 : 3.5)]);
    expect(r.phases.map((p) => [p.id, p.t])).toEqual([['baseline', 0], ['early', 7]]);
  });
});

/** A driver over a fresh engine, its runner's inputs recorded, the engine's drugs events kept. */
function rig(d: object, seed = 7) {
  const host = manualHost({ seed });
  const driver = new ScenarioDriver({ target: host });
  const ok = driver.load(d);
  expect(ok.ok, JSON.stringify(ok)).toBe(true);
  const pr = driver.phaseRunner as PhaseRunner;
  const fed: RunnerInputV2[] = [];
  const advance = pr.advance.bind(pr);
  pr.advance = (t: number, inputs: RunnerInputV2[] = []) => (fed.push(...inputs), advance(t, inputs));
  const drugs: DrugsEvent[] = [];
  host.on((e: EngineEvent) => void (e.type === 'drugs' && drugs.push(e)));
  let n = 0;
  const send = (event: object) => {
    const res = driver.host.dispatch({ id: `t${++n}`, issuedBy: 'learner', type: 'applyEvent', event } as unknown as Command) as { accepted: boolean; reason?: string };
    expect(res.accepted, res.reason).toBe(true);
  };
  const run = async (untilS: number, each?: (t: number) => void) => {
    for (let tick = host.engine.now().tick + 1; tick <= untilS * 50; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
      if (tick % 50 === 0) each?.(tick / 50);
      if (tick % 3000 === 0) await new Promise<void>((res) => setImmediate(res));
    }
  };
  return { host, driver, pr, fed, drugs, send, run };
}
const concKeys = (fed: RunnerInputV2[]) => fed.flatMap((i) => (i.kind === 'values' ? Object.keys(i.values).filter((k) => /^c[pe]:/.test(k)) : []));

describe('DC1 through the driver and the engine', () => {
  it('a card with no concentration leaf is fed no concentration, a propofol bolus given or not (its inputs are today\'s)', async () => {
    const o = rig(minimalV2());
    o.send({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    await o.run(20);
    expect(o.drugs.length).toBeGreaterThanOrEqual(19);
    expect(o.drugs.at(-1)!.drugs.some((r) => r.id === 'propofol' && r.cp > 0)).toBe(true);
    expect(concKeys(o.fed)).toEqual([]);
  }, 60_000);

  it('a card reading ce:propofol and cp:rocuronium is fed the panel row\'s own cp and ce at each drugs event, 0 for a drug not given', async () => {
    const d = withLeaf({ all: [{ value: { var: 'ce:propofol', op: '>', value: 100 } }, { value: { var: 'cp:rocuronium', op: '>', value: 1 } }] });
    const o = rig(d);
    o.send({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    await o.run(20);
    const conc = o.fed.filter((i): i is Extract<RunnerInputV2, { kind: 'values' }> => i.kind === 'values' && Object.keys(i.values).some((k) => /^c[pe]:/.test(k)));
    expect(conc).toHaveLength(o.drugs.length);
    conc.forEach((i, k) => {
      const row = o.drugs[k]!.drugs.find((r) => r.id === 'propofol');
      expect(i).toEqual({ kind: 'values', rank: 3, values: { 'ce:propofol': row?.ce ?? 0, 'cp:rocuronium': 0 } });
    });
    expect(o.pr.value('ce:propofol')).toBe(o.drugs.at(-1)!.drugs.find((r) => r.id === 'propofol')!.ce);
    expect(o.pr.value('ce:propofol')).toBeGreaterThan(0.5);
  }, 60_000);

  // The guard the pump plan's E2 keeps (pump-rack-tci.md, its cross-reference to DC1): a TCI whose patient does not
  // follow its target. A plasma target of 4 µg/mL with the pump held to 200 mL/h (10 mg/mL: 33 mg/min). Before E2 the
  // controller read the patient, which reached 3.9 after 73 s. Since E2 (decision D3) the pump predicts with its own
  // model: ITS Cp reaches 4.000 by 75 s and holds, while this patient (its own clearance and distribution) plateaus at
  // 3.4–3.6 (measured, seed 7: 3.371 at 60 s, 3.479 at 75 s, 3.426 at 150 s). The rule follows the patient: it enters on
  // the first drugs event whose patient Cp is past 3.3, never on the target, and never on the pump's 4.
  it('guard: under a rate-limited propofol TCI (target 4 µg/mL) the rule reads the patient\'s Cp, not the target', async () => {
    const d = withLeaf({ value: { var: 'cp:propofol', op: '>=', value: 3.3 } });
    d.phases[2].enter = { value: { var: 'cp:propofol', op: '>=', value: 4.5 } }; // never: past the target
    d.phases[1].next = ['treated'];
    const o = rig(d);
    o.send({ kind: 'tci', drugId: 'propofol', mode: 'plasma', target: 4, maxRateMlH: 200 });
    const gaps: number[] = [];
    await o.run(150, () => {
      const row = o.drugs.at(-1)?.drugs.find((r) => r.id === 'propofol');
      if (row?.tci) gaps.push(row.tci.target - row.cp);
    });
    const rows = o.drugs.map((e) => ({ t: e.t, row: e.drugs.find((r) => r.id === 'propofol') })).filter((x) => x.row);
    expect(rows.every((x) => x.row!.tci?.target === 4)).toBe(true); // the controller's target, all along
    const cross = rows.find((x) => x.row!.cp >= 3.3);
    expect(cross, 'the patient reaches 3.3 within 150 s').toBeDefined();
    expect(cross!.t).toBeGreaterThan(45); // most of a minute with the target at 4 and the patient below 3.3
    // The pump's own prediction (the `drugs` event's tciPumps) is on its target; the patient never reaches it
    expect(o.drugs.at(-1)!.tciPumps!.find((x) => x.drugId === 'propofol')!.cp).toBeCloseTo(4, 2);
    expect(Math.max(...rows.map((x) => x.row!.cp))).toBeLessThan(3.9);
    expect(Math.max(...gaps)).toBeGreaterThan(3); // the patient's Cp is ≥ 3 µg/mL below the target early on
    const entered = o.pr.phases.find((p) => p.id === 'early');
    expect(entered?.t).toBeCloseTo(cross!.t, 1); // entered at the patient's crossing (the drugs event's own second)
    expect(o.pr.phases.some((p) => p.id === 'treated')).toBe(false); // the TCI's Cp never runs 0.5 past its target
    expect(o.pr.value('cp:propofol')).toBe(rows.at(-1)!.row!.cp);
  }, 120_000);
});
