// Plan learner-action-remote.md L2: the preparation core, pure. prepare (concentration from strength, reconstitution
// and dilution volumes; the ready time), findings (wrong diluent per D5, incompatible, conditional, not tested) and
// remaining (the source's own points, interpolated, never extrapolated; LQ8 and LQ9 as one switch each). Every case
// runs on the TEST-ONLY fixture layer (fixtures/bench.fixture.ts: invented drugs and sources, numbers [ENG: test]).
import { describe, expect, it } from 'vitest';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { DrugEntry, Formulary } from '../../src/formulary/types.ts';
import { prepare, type PrepComponent } from '../../src/formulary/prepare.ts';
import { findings } from '../../src/formulary/findings.ts';
import { remaining, RULINGS, type StabilityRow } from '../../src/formulary/remaining.ts';
import { BENCH_IDS, benchFiles } from './fixtures/bench.fixture.ts';

const loaded = loadFormulary(benchFiles(), BENCH_IDS);
if (!loaded.ok) throw new Error(`the fixture layer breaks §5: ${JSON.stringify(loaded.problems)}`);
const F: Formulary = loaded.formulary;
const powder = (amount: number, unit = 'vial'): PrepComponent => ({ drugId: 'benchpowder', productId: 'fixture-powder-vial', amount, unit });
const solution = (amount: number, unit = 'mL'): PrepComponent => ({ drugId: 'benchsolution', productId: 'fixture-solution', amount, unit });
const H = 3600;

describe('the fixture is a layer §5 admits', () => {
  it('loads with no problem', () => expect(loaded.ok).toBe(true));
});

describe('prepare: the concentration from strength, reconstitution and dilution volumes', () => {
  it('one powder vial reconstituted per the label, then diluted: 20 mg in 10 + 30 mL = 0.5 mg/mL', () => {
    const p = prepare([powder(1)], { id: 'water', volumeMl: 30 }, F, 100);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.volumeMl).toBe(40);
    expect(p.actives).toEqual([{ drugId: 'benchpowder', amount: 20, unit: 'mg', perMl: 0.5 }]);
    expect(p.diluent).toEqual({ id: 'water', volumeMl: 30 });
    expect(p.container).toBeNull();
    expect(p.findings).toEqual([]);
  });
  it('mL drawn from the reconstituted vial (2 mg/mL), and an amount in the strength\'s own unit', () => {
    const byMl = prepare([powder(5, 'mL')], { id: 'water', volumeMl: 0 }, F, 0);
    expect(byMl.ok && byMl.actives[0]).toEqual({ drugId: 'benchpowder', amount: 10, unit: 'mg', perMl: 2 });
    const byMg = prepare([solution(15, 'mg')], { id: 'saline', volumeMl: 7 }, F, 0, 'syringe-pp');
    expect(byMg.ok && byMg.volumeMl).toBe(10);
    expect(byMg.ok && byMg.actives[0]).toEqual({ drugId: 'benchsolution', amount: 15, unit: 'mg', perMl: 1.5 });
    expect(byMg.ok && byMg.container).toBe('syringe-pp');
  });
  it('a solution undiluted (no diluent): its own concentration', () => {
    const p = prepare([solution(4)], undefined, F, 0);
    expect(p.ok && p.actives).toEqual([{ drugId: 'benchsolution', amount: 20, unit: 'mg', perMl: 5 }]);
    expect(p.ok && p.diluent).toBeNull();
  });
  it('two components of one drug add; two drugs each get their own concentration in the total volume', () => {
    const same = prepare([powder(1), powder(2, 'mL')], { id: 'water', volumeMl: 8 }, F, 0);
    expect(same.ok && same.volumeMl).toBe(20);
    expect(same.ok && same.actives).toEqual([{ drugId: 'benchpowder', amount: 24, unit: 'mg', perMl: 1.2 }]);
    const two = prepare([powder(1), solution(10)], { id: 'water', volumeMl: 0 }, F, 0);
    expect(two.ok && two.actives).toEqual([
      { drugId: 'benchpowder', amount: 20, unit: 'mg', perMl: 1 },
      { drugId: 'benchsolution', amount: 50, unit: 'mg', perMl: 2.5 },
    ]);
  });
});

describe('prepare refuses what it cannot compute', () => {
  const refused = (r: ReturnType<typeof prepare>) => (r.ok ? 'ok' : r.refused);
  it('no component', () => expect(refused(prepare([], undefined, F, 0))).toBe('no-components'));
  it('a drug with no file; a product not in the drug\'s file', () => {
    expect(refused(prepare([{ drugId: 'nofile', productId: 'fixture-solution', amount: 1, unit: 'mL' }], undefined, F, 0))).toBe('unknown-drug');
    expect(refused(prepare([{ drugId: 'benchsolution', productId: 'fixture-powder-vial', amount: 1, unit: 'vial' }], undefined, F, 0))).toBe('unknown-product');
  });
  it('an amount that is not a positive finite number', () => {
    for (const a of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(refused(prepare([solution(a)], undefined, F, 0))).toBe('bad-amount');
  });
  it('a unit that is neither vial, mL nor the strength\'s unit', () => expect(refused(prepare([solution(1, 'g')], undefined, F, 0))).toBe('bad-unit'));
  it('a vial of a per-mL solution, an ampoule whose volume the label does not give (by mL, by ampoule, by mg)', () => {
    expect(refused(prepare([solution(1, 'vial')], undefined, F, 0))).toBe('no-concentration');
    for (const unit of ['mL', 'vial', 'mg']) expect(refused(prepare([{ drugId: 'benchampoule', productId: 'fixture-ampoule', amount: 1, unit }], undefined, F, 0))).toBe('no-concentration');
  });
  it('one drug in two units (mg and mcg products in one preparation)', () => {
    expect(refused(prepare([solution(1), { drugId: 'benchsolution', productId: 'fixture-solution-mcg', amount: 1, unit: 'mL' }], undefined, F, 0))).toBe('unit-mismatch');
  });
  it('a diluent the formulary does not have; a negative or non-finite diluent volume', () => {
    expect(refused(prepare([solution(1)], { id: 'nothing', volumeMl: 1 }, F, 0))).toBe('unknown-diluent');
    for (const v of [-1, Number.NaN]) expect(refused(prepare([solution(1)], { id: 'saline', volumeMl: v }, F, 0))).toBe('bad-volume');
  });
  it('a powder with no diluent to reconstitute it', () => expect(refused(prepare([powder(1)], undefined, F, 0))).toBe('no-diluent'));
  it('every refusal says why', () => {
    const r = prepare([], undefined, F, 0);
    expect(!r.ok && r.why.length).toBeGreaterThan(0);
  });
});

describe('prepare: the ready time (LQ7)', () => {
  it('simT + the sourced preparation time, its source named', () => {
    const p = prepare([powder(1)], { id: 'water', volumeMl: 0 }, F, 100);
    expect(p.ok && p.ready).toEqual({ atS: 220, src: ['fixture-study'], gap: null });
  });
  it('simT with the gap when the entry has none (a gap or no field): ready at once', () => {
    const p = prepare([solution(1)], undefined, F, 50);
    expect(p.ok && p.ready).toEqual({ atS: 50, src: [], gap: 'LQ7' });
    const q = prepare([{ drugId: 'benchsolution', productId: 'fixture-solution-mcg', amount: 1, unit: 'mL' }], undefined, F, 50);
    expect(q.ok && q.ready).toEqual({ atS: 50, src: [], gap: 'LQ7' });
  });
  it('several components: the longest sourced time, and the gap still named', () => {
    const p = prepare([powder(1), solution(1)], { id: 'water', volumeMl: 0 }, F, 10);
    expect(p.ok && p.ready).toEqual({ atS: 130, src: ['fixture-study'], gap: 'LQ7' });
  });
  it('a negative or non-finite simT is refused', () => {
    for (const t of [-1, Number.NaN]) {
      const r = prepare([solution(1)], undefined, F, t);
      expect(r.ok ? 'ok' : r.refused).toBe('bad-time');
    }
  });
});

describe('findings: the wrong diluent (D5, LQ11), incompatible, conditional, not tested', () => {
  const kinds = (fs: ReturnType<typeof findings>) => fs.map((f) => `${f.kind}:${f.drugId}:${f.against}:${f.other}`);
  it('a listed diluent with no statement: no finding', () => expect(findings([{ drugId: 'benchsolution', productIds: ['fixture-solution'] }], 'saline', F)).toEqual([]));
  it('a diluent the monograph does not list, called incompatible by its source: wrong and incompatible, with the source', () => {
    const fs = findings([{ drugId: 'benchpowder', productIds: ['fixture-powder-vial'] }], 'saline', F);
    expect(fs).toEqual([
      { kind: 'wrongDiluent', drugId: 'benchpowder', against: 'diluent', other: 'saline', statement: null, src: 'fixture-label' },
      { kind: 'incompatible', drugId: 'benchpowder', against: 'diluent', other: 'saline', statement: 'Fixture: a haze forms.', src: 'fixture-stabilis' },
    ]);
  });
  it('listed for the drug but not for reconstituting its powder: wrong, and not tested (no statement)', () => {
    expect(kinds(findings([{ drugId: 'benchpowder', productIds: ['fixture-powder-vial'] }], 'dextrose', F))).toEqual(['wrongDiluent:benchpowder:diluent:dextrose', 'notTested:benchpowder:diluent:dextrose']);
  });
  it('a conditional statement and a "not tested" statement are findings with their words', () => {
    const c = findings([{ drugId: 'benchsolution', productIds: ['fixture-solution'] }], 'dextrose', F);
    expect(kinds(c)).toEqual(['wrongDiluent:benchsolution:diluent:dextrose', 'conditional:benchsolution:diluent:dextrose']);
    expect(c[1]?.statement).toBe('Fixture: clear for 1 h only.');
    const n = findings([{ drugId: 'benchsolution', productIds: ['fixture-solution'] }], 'water', F);
    expect(n[1]).toEqual({ kind: 'notTested', drugId: 'benchsolution', against: 'diluent', other: 'water', statement: 'Fixture: no study found.', src: 'fixture-stabilis' });
  });
  it('a diluent the drug\'s file does not name at all: wrong (no listing to cite) and not tested', () => {
    expect(findings([{ drugId: 'benchsolution', productIds: ['fixture-solution'] }], 'ringer', F)).toEqual([
      { kind: 'wrongDiluent', drugId: 'benchsolution', against: 'diluent', other: 'ringer', statement: null, src: null },
      { kind: 'notTested', drugId: 'benchsolution', against: 'diluent', other: 'ringer', statement: null, src: null },
    ]);
  });
  it('not listed and no statement: wrong and not tested', () => {
    expect(kinds(findings([{ drugId: 'benchampoule', productIds: ['fixture-ampoule'] }], 'saline', F))).toEqual(['wrongDiluent:benchampoule:diluent:saline', 'notTested:benchampoule:diluent:saline']);
  });
  it('no diluent: no diluent finding', () => expect(findings([{ drugId: 'benchsolution', productIds: ['fixture-solution'] }], null, F)).toEqual([]));
  it('an admixture: every statement either file makes, each from its own file; compatible gives none', () => {
    const fs = findings([{ drugId: 'benchpowder', productIds: [] }, { drugId: 'benchsolution', productIds: [] }], null, F);
    expect(kinds(fs)).toEqual(['incompatible:benchpowder:admixture:benchsolution', 'conditional:benchsolution:admixture:benchpowder']);
    expect(findings([{ drugId: 'benchpowder', productIds: [] }, { drugId: 'benchampoule', productIds: [] }], null, F)).toEqual([]);
  });
  it('an admixture neither file has a statement for: not tested', () => {
    expect(findings([{ drugId: 'benchsolution', productIds: [] }, { drugId: 'benchampoule', productIds: [] }], null, F)).toEqual([
      { kind: 'notTested', drugId: 'benchsolution', against: 'admixture', other: 'benchampoule', statement: null, src: null },
    ]);
  });
  it('an admixture statement whose verdict is "not tested"', () => {
    const f = structuredClone(F);
    f.drugs.benchampoule!.admixtures[0]!.verdict = 'not tested';
    expect(kinds(findings([{ drugId: 'benchampoule', productIds: [] }, { drugId: 'benchpowder', productIds: [] }], null, f))).toEqual(['notTested:benchampoule:admixture:benchpowder']);
  });
  it('prepare carries the findings of its drugs, diluent and admixture', () => {
    const p = prepare([powder(1), solution(1)], { id: 'saline', volumeMl: 0 }, F, 0);
    expect(p.ok && kinds(p.findings)).toEqual([
      'wrongDiluent:benchpowder:diluent:saline', 'incompatible:benchpowder:diluent:saline',
      'incompatible:benchpowder:admixture:benchsolution', 'conditional:benchsolution:admixture:benchpowder',
    ]);
  });
});

describe('remaining: the source\'s own points, interpolated, never extrapolated', () => {
  const E = F.drugs.benchpowder as DrugEntry;
  it('1 at age 0; the measured points at their ages; linear between them (the reference point at 0 h is the anchor)', () => {
    expect(remaining(E, 'water', 'vial', 25, 0)).toEqual({ r: 1, basis: 'measured', beyondData: false, note: null, deliverable: true, src: 'fixture-stabilis' });
    expect(remaining(E, 'water', 'vial', 25, 2 * H).r).toBeCloseTo(0.96, 12);
    expect(remaining(E, 'water', 'vial', 25, 1 * H).r).toBeCloseTo(0.98, 12);
    expect(remaining(E, 'water', 'vial', 25, 4 * H).r).toBeCloseTo(0.93, 12);
    expect(remaining(E, 'water', 'vial', 25, 6 * H)).toMatchObject({ beyondData: false });
    expect(remaining(E, 'water', 'vial', 25, 6 * H).r).toBeCloseTo(0.9, 12);
  });
  it('from 1 at age 0 to a first point later than 0 h', () => expect(remaining(E, 'water', 'syringe-pp', 25, 2 * H).r).toBeCloseTo(0.75, 12));
  it('past the last point: the last point\'s value, flagged beyond the source\'s data', () => {
    expect(remaining(E, 'water', 'vial', 25, 30 * H)).toEqual({ r: 0.9, basis: 'measured', beyondData: true, note: null, deliverable: true, src: 'fixture-stabilis' });
  });
  it('another container or temperature is not interpolated across: no data, "loss not known", the nominal amount', () => {
    for (const r of [remaining(E, 'water', 'bag-pvc', 25, H), remaining(E, 'water', 'vial', 4, H)]) {
      expect(r).toEqual({ r: 1, basis: 'none', beyondData: false, note: 'loss not known', deliverable: true, src: null });
    }
  });
  it('a negative or non-finite age is an error, not a fraction', () => {
    expect(() => remaining(E, 'water', 'vial', 25, -1)).toThrow(RangeError);
    expect(() => remaining(E, 'water', 'vial', 25, Number.NaN)).toThrow(RangeError);
  });
});

describe('LQ9: a "stable, at least x for T h" statement, one switch', () => {
  const E = F.drugs.benchpowder as DrugEntry;
  it('is ruled A: 100 % within T; beyond T the value held, flagged', () => {
    expect(RULINGS.LQ9).toBe('A');
    expect(remaining(E, 'dextrose', 'syringe-pp', 25, 12 * H)).toEqual({ r: 1, basis: 'stable', beyondData: false, note: null, deliverable: true, src: 'fixture-stabilis' });
    expect(remaining(E, 'dextrose', 'syringe-pp', 25, 48 * H)).toMatchObject({ r: 1, beyondData: true });
  });
  it('option B: the source\'s lower bound within T (1 at age 0); beyond T the bound held, flagged', () => {
    const B = { ...RULINGS, LQ9: 'B' as const };
    expect(remaining(E, 'dextrose', 'syringe-pp', 25, 0, { rulings: B }).r).toBe(1);
    expect(remaining(E, 'dextrose', 'syringe-pp', 25, 12 * H, { rulings: B })).toMatchObject({ r: 0.9, beyondData: false });
    expect(remaining(E, 'dextrose', 'syringe-pp', 25, 48 * H, { rulings: B })).toMatchObject({ r: 0.9, beyondData: true });
  });
  it('a stable statement with several points is read at its longest time', () => {
    const e: DrugEntry = { ...E, stability: [{ ...(E.stability[2] as StabilityRow), points: [[48, 0.95], [24, 0.9]] } as StabilityRow] };
    expect(remaining(e, 'dextrose', 'syringe-pp', 25, 30 * H, { rulings: { ...RULINGS, LQ9: 'B' } })).toMatchObject({ r: 0.95, beyondData: false });
  });
});

describe('LQ8: incompatible with no quantity, one switch', () => {
  const E = F.drugs.benchpowder as DrugEntry;
  it('is ruled A: the full amount, "loss not modelled"', () => {
    expect(RULINGS.LQ8).toBe('A');
    expect(remaining(E, 'saline', 'syringe-pp', 25, H)).toEqual({ r: 1, basis: 'none', beyondData: false, note: 'loss not modelled', deliverable: true, src: null });
  });
  it('option B: none reaches the patient; option C: it cannot be given', () => {
    expect(remaining(E, 'saline', 'syringe-pp', 25, H, { rulings: { ...RULINGS, LQ8: 'B' } })).toMatchObject({ r: 0, note: 'all lost', deliverable: true });
    expect(remaining(E, 'saline', 'syringe-pp', 25, H, { rulings: { ...RULINGS, LQ8: 'C' } })).toMatchObject({ r: 1, note: 'cannot be given', deliverable: false });
  });
  it('the source\'s figures win over LQ8 where it gives them (the effect follows the figures, D5)', () => {
    expect(remaining(E, 'saline', 'bag-pvc', 25, H)).toMatchObject({ r: 0.7, basis: 'measured', note: null });
  });
  it('an admixture found incompatible is passed in by the caller; a diluent the file does not name is not incompatible', () => {
    const S = F.drugs.benchsolution as DrugEntry;
    expect(remaining(S, 'saline', 'syringe-pp', 25, H, { incompatible: true })).toMatchObject({ note: 'loss not modelled' });
    expect(remaining(S, 'ringer', 'syringe-pp', 25, H)).toMatchObject({ note: 'loss not known' });
    expect(remaining(E, 'saline', 'syringe-pp', 25, H, { incompatible: false })).toMatchObject({ note: 'loss not known' });
  });
});
