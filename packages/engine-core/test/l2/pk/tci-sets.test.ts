// The TCI-set check (docs/plans/pump-rack-tci.md §6.1 rules 1–7; how to add a set: docs/guides/tci-sets.md). Each rule
// is a function that returns the errors it finds; the first block applies every rule to the registry, the second shows
// that each rule refuses a fixture made to break it (and accepts the valid fixture), so a rule cannot pass by checking
// nothing. The fixture's numbers are synthetic, not a published set's.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromClearances, type PkParams } from '../../../src/l2/pk/compartment.ts';
import type { PkPatient } from '../../../src/l2/pk/covariates.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { ttpeMin } from '../../../src/l2/pk/models.ts';
import { createPkState, validatePkCommand } from '../../../src/l2/pk/pipeline.ts';
import { NO_KE0_REFUSAL, PENDING_TCI_MODEL_IDS, PENDING_TCI_REASONS, TCI_SETS, tciModeRefusal, type TciCovariate, type TciPaper, type TciQuantity, type TciSet, type TciSetMeta, type TciSetOpts } from '../../../src/l2/pk/tci-sets/index.ts';
import type { Command } from '../../../src/types.ts';

const SETS_DIR = resolve(import.meta.dirname, '../../../src/l2/pk/tci-sets');
const COVARIATES: readonly TciCovariate[] = ['ageY', 'weightKg', 'heightCm', 'sex', 'pmaWeeks', 'opioids'];
/** Probe steps [ENG: test]: large enough to move any covariate term, small enough to stay near the population. */
const STEP = { ageY: 5, weightKg: 5, heightCm: 5, pmaWeeks: 4 } as const;
/** Time-to-peak-effect agreement for a `ttpe` ke0 [ENG: test]: a ke0 printed to three digits moves the TTPE by
 * under 0.01 min (fentanyl 0.117 with Shafer: 3.603 against 3.6; sufentanil 0.176 with Gepts: 5.593 against 5.6). */
const TTPE_TOL_MIN = 0.02;
/** Known published set names not registered (plan §6.2), probed by rule 7: the TCI command must refuse them. */
const UNREGISTERED_PROBES = ['kataria', 'paedfusor', 'eleveld-remifentanil', 'maitre', 'hannivoort', 'dyck', 'not-a-set'];

const KEYS = ['v1', 'k10', 'k12', 'k21', 'k13', 'k31'] as const;
const same = (a: PkParams, b: PkParams) => KEYS.every((k) => Object.is(a[k], b[k])) && a.ke0.length === b.ke0.length && a.ke0.every((x, i) => Object.is(x, b.ke0[i]));
const hasRef = (p: TciPaper | undefined) => !!p && (/^10\.\d{4,9}\/\S+$/.test(p.doi ?? '') || /^\d{1,9}$/.test(p.pmid ?? ''));
const ranges = (m: TciSetMeta) => (['ageY', 'weightKg', 'heightCm', 'pmaWeeks'] as const).flatMap((k) => (m.population[k] ? [[k, m.population[k]] as const] : []));

// --- the rules -----------------------------------------------------------------------------------------------------

/** Rule 1: every set has its metadata; the paper resolves (a DOI or a PMID), the table is named, the row is complete. */
function rule1(sets: readonly TciSet[]): string[] {
  const e: string[] = [];
  const seen = new Set<string>();
  for (const s of sets) {
    const m = s?.meta as TciSetMeta | undefined;
    if (!m) { e.push('a registered set has no metadata'); continue; }
    const id = m.id;
    if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) e.push(`${id}: the id must be lower-case letters, digits and hyphens`);
    if (seen.has(id)) e.push(`${id}: registered twice`);
    seen.add(id);
    const row = DRUGS[m.drugId];
    if (!row || row.pk.kind !== 'model') e.push(`${id}: drugId ${m.drugId} is not a library drug with a compartment model`);
    if (!m.name?.trim()) e.push(`${id}: no name`);
    const p = m.paper;
    if (!p || !p.authors?.trim() || !p.journal?.trim() || !p.vol?.trim() || !p.pages?.trim() || !Number.isInteger(p.year)) e.push(`${id}: the paper needs authors, year, journal, volume and pages`);
    if (!hasRef(p)) e.push(`${id}: the paper has neither a DOI nor a PMID`);
    if (!m.table?.trim()) e.push(`${id}: no table (the table or equation, and its page)`);
    if (!m.population?.src?.trim()) e.push(`${id}: the population names no source`);
    for (const [k, [lo, hi]] of ranges(m)) {
      if (!(lo <= hi)) e.push(`${id}: population ${k} [${lo}, ${hi}] is not a range`);
      const v = m.reference?.[k];
      if (v !== undefined && (v < lo || v > hi)) e.push(`${id}: the reference patient's ${k} ${v} is outside the population`);
    }
    if (new Set(m.covariates).size !== m.covariates.length || m.covariates.some((c) => !COVARIATES.includes(c))) e.push(`${id}: covariates must be distinct, from ${COVARIATES.join(', ')}`);
    if (!['arterial', 'venous', 'unstated'].includes(m.site)) e.push(`${id}: site must be arterial, venous or unstated`);
    if (!m.units?.trim()) e.push(`${id}: no units`);
    const r = m.readBy;
    if (!r?.first?.trim() || !r.second?.trim() || r.first === r.second || !/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '')) e.push(`${id}: readBy needs two different readers and a date YYYY-MM-DD`);
  }
  return e;
}

/** The probe points of rule 2: the reference patient and the population's lower and upper corners. */
function probes(m: TciSetMeta): PkPatient[] {
  const corner = (i: 0 | 1): PkPatient => ({ ...m.reference, ...Object.fromEntries(ranges(m).map(([k, r]) => [k, r[i]])) });
  return [m.reference, corner(0), corner(1)];
}
function perturb(m: TciSetMeta, p: PkPatient, c: TciCovariate | 'pche'): [PkPatient, TciSetOpts, PkPatient, TciSetOpts] {
  if (c === 'opioids') return [p, { opioids: false }, p, { opioids: true }];
  if (c === 'sex') return [p, {}, { ...p, sex: p.sex === 'm' ? 'f' : 'm' }, {}];
  if (c === 'pche') return [p, {}, { ...p, pche: p.pche === 'hom' ? 'normal' : 'hom' }, {}];
  // pmaWeeks is perturbed from an explicit value: when absent, about the term-birth default [ENG: test] (a probe point)
  const base = c === 'pmaWeeks' ? { ...p, pmaWeeks: p.pmaWeeks ?? p.ageY * 52 + 40 } : p;
  const x = base[c] as number;
  const hi = m.population[c]?.[1];
  const d = hi !== undefined && x + STEP[c] > hi ? -STEP[c] : STEP[c];
  return [base, {}, { ...base, [c]: x + d }, {}];
}

/** Rule 2: the covariates listed are exactly what the function reads. */
function rule2(s: TciSet): string[] {
  const m = s.meta;
  const e: string[] = [];
  for (const c of [...COVARIATES, 'pche'] as const) {
    const listed = (m.covariates as readonly string[]).includes(c);
    const moved = probes(m).some((p) => {
      const [a, oa, b, ob] = perturb(m, p, c);
      return !same(s.params(a, oa), s.params(b, ob));
    });
    if (listed && !moved) e.push(`${m.id}: ${c} is listed, but perturbing it changes no parameter`);
    if (!listed && moved) e.push(`${m.id}: ${c} is not listed, but perturbing it changes the parameters`);
  }
  return e;
}

/** Rule 3: a set without a ke0 is refused in effect-site mode and has no effect site; a set with one has it. */
function rule3(s: TciSet): string[] {
  const m = s.meta;
  const n = s.params(m.reference).ke0.length;
  if (m.ke0.none === true) {
    const e: string[] = [];
    if (tciModeRefusal(s, 'effect') !== NO_KE0_REFUSAL) e.push(`${m.id}: no ke0, yet effect-site mode is not refused`);
    if (tciModeRefusal(s, 'plasma') !== undefined) e.push(`${m.id}: plasma mode must stay allowed`);
    if (n !== 0) e.push(`${m.id}: ke0 is none, but the function returns ${n} effect site(s)`);
    return e;
  }
  return n >= 1 && tciModeRefusal(s, 'effect') === undefined ? [] : [`${m.id}: a ke0 is stated, but the function returns no effect site`];
}

/** The quantities a paper may print, from the function's parameters (engine units). */
function quantity(p: PkParams, q: TciQuantity): number {
  switch (q) {
    case 'cl1': return p.k10 * p.v1;
    case 'cl2': return p.k12 * p.v1;
    case 'cl3': return p.k13 * p.v1;
    case 'v2': return p.k21 > 0 ? (p.k12 * p.v1) / p.k21 : Number.NaN;
    case 'v3': return p.k31 > 0 ? (p.k13 * p.v1) / p.k31 : Number.NaN;
    case 'ke0': return p.ke0[0] ?? Number.NaN;
    default: return p[q];
  }
}

/** Rule 4: the set reproduces the values its paper prints for its reference patient, to the printed precision. */
function rule4(s: TciSet): string[] {
  const m = s.meta;
  const w = m.worked;
  if ('none' in w) return w.none.trim() ? [] : [`${m.id}: worked.none must say why the paper prints no worked values`];
  const e: string[] = [];
  if (!w.src?.trim()) e.push(`${m.id}: the worked values name no table or page`);
  const entries = Object.entries(w.values) as [TciQuantity, string][];
  if (!entries.length) e.push(`${m.id}: no worked values`);
  const p = s.params(w.patient, w.opts);
  for (const [q, printed] of entries) {
    if (!/^-?\d+(\.\d+)?$/.test(printed)) { e.push(`${m.id}: worked ${q} "${printed}" is not a printed number`); continue; }
    const dp = printed.split('.')[1]?.length ?? 0;
    const got = quantity(p, q);
    // half a unit of the last printed digit, plus the float noise of the conversion [ENG: test]
    if (!(Math.abs(got - Number(printed)) <= 0.5 * 10 ** -dp + 1e-12)) e.push(`${m.id}: ${q} is ${got}, the paper prints ${printed}`);
  }
  return e;
}

/** Rule 5: no [VERIFY] mark in a registered set, its module or its metadata. */
function rule5(s: TciSet, moduleText: string | undefined): string[] {
  const e: string[] = [];
  if (moduleText === undefined) e.push(`${s.meta.id}: no module tci-sets/${s.meta.id}.ts`);
  else if (/\[VERIFY/i.test(moduleText)) e.push(`${s.meta.id}: a [VERIFY] mark remains in its module`);
  if (/\[VERIFY/i.test(JSON.stringify(s.meta))) e.push(`${s.meta.id}: a [VERIFY] mark remains in its metadata`);
  return e;
}

/** Rule 6: a ke0 says how it was obtained; one not from the PK paper names its source and the PK it was fitted with;
 * a time-to-peak-effect ke0 is labelled so and gives that time with this PK. */
function rule6(s: TciSet): string[] {
  const m = s.meta;
  const k = m.ke0;
  if (k.none === true) return [];
  const e: string[] = [];
  if ((k.value === undefined) === (k.expr === undefined)) e.push(`${m.id}: ke0 needs exactly one of value or expr`);
  const fn = s.params(m.reference).ke0[0];
  if (k.value !== undefined && !(fn !== undefined && Math.abs(fn - k.value) <= 1e-12)) e.push(`${m.id}: ke0 states ${k.value}, the function returns ${fn}`);
  if (!['pkpd', 'ttpe'].includes(k.method)) e.push(`${m.id}: ke0 method must be pkpd or ttpe`);
  if (k.src !== 'pk-paper') {
    if (!hasRef(k.src) || !k.src.authors?.trim()) e.push(`${m.id}: the ke0's own source needs authors and a DOI or PMID`);
    if (!k.fittedWith?.trim()) e.push(`${m.id}: a ke0 not from the PK paper must name the PK it was fitted with`);
  }
  if (k.method === 'ttpe') {
    if (k.src === 'pk-paper') e.push(`${m.id}: a time-to-peak-effect ke0 names the paper that gives the time`);
    if (!(k.ttpeMin !== undefined && k.ttpeMin > 0)) e.push(`${m.id}: a time-to-peak-effect ke0 states ttpeMin`);
    else {
      const t = ttpeMin(s.params(m.reference));
      if (Math.abs(t - k.ttpeMin) > TTPE_TOL_MIN) e.push(`${m.id}: with this PK the ke0 peaks at ${t.toFixed(3)} min, not the stated ${k.ttpeMin}`);
    }
  } else if (k.ttpeMin !== undefined) e.push(`${m.id}: ttpeMin is stated, but the ke0 is not labelled ttpe`);
  return e;
}

/** Rule 7: the TCI command accepts exactly the registered ids and the still-pending ones, and refuses the rest. */
function rule7(sets: readonly TciSet[], pending: Readonly<Record<string, string>>, accepts: (drugId: string, model: string) => boolean): string[] {
  const e: string[] = [];
  const ids = new Set(sets.map((s) => s.meta.id));
  for (const id of Object.keys(pending)) if (ids.has(id)) e.push(`${id}: registered, so it must leave PENDING_TCI_MODEL_IDS`);
  for (const s of sets) if (!accepts(s.meta.drugId, s.meta.id)) e.push(`${s.meta.id}: registered, but the TCI command refuses it`);
  for (const [id, drugId] of Object.entries(pending)) if (!accepts(drugId, id)) e.push(`${id}: pending, but the TCI command refuses it`);
  for (const id of UNREGISTERED_PROBES) if (!ids.has(id) && !(id in pending) && accepts('propofol', id)) e.push(`${id}: not registered, but the TCI command accepts it`);
  return e;
}

const engineAccepts = (drugId: string, model: string) =>
  validatePkCommand({ type: 'applyEvent', event: { kind: 'tci', drugId, model, mode: 'plasma', target: 1 } } as unknown as Command, createPkState()) === undefined;

function moduleText(id: string): string | undefined {
  try {
    return readFileSync(resolve(SETS_DIR, `${id}.ts`), 'utf8');
  } catch {
    return undefined;
  }
}

describe('TCI-set registry: every registered set meets rules 1–7', () => {
  it('rule 1: metadata, a paper with a DOI or PMID, a table, a complete row', () => expect(rule1(TCI_SETS)).toEqual([]));
  it('rule 2: the covariates listed are what the function reads', () => expect(TCI_SETS.flatMap(rule2)).toEqual([]));
  it('rule 3: a set without a ke0 is plasma-only', () => expect(TCI_SETS.flatMap(rule3)).toEqual([]));
  it('rule 4: the paper\'s own worked values are reproduced', () => expect(TCI_SETS.flatMap(rule4)).toEqual([]));
  it('rule 5: no [VERIFY] mark remains', () => expect(TCI_SETS.flatMap((s) => rule5(s, moduleText(s.meta.id)))).toEqual([]));
  it('rule 6: every ke0 names its source, and the PK it was fitted with when not the PK paper\'s', () => expect(TCI_SETS.flatMap(rule6)).toEqual([]));
  it('rule 7: the TCI command accepts the registered and pending ids and nothing else', () => expect(rule7(TCI_SETS, PENDING_TCI_MODEL_IDS, engineAccepts)).toEqual([]));
  it('every pending id says why it is not registered and names the table its registration needs (T2)', () => {
    expect(Object.keys(PENDING_TCI_REASONS).sort()).toEqual(Object.keys(PENDING_TCI_MODEL_IDS).sort());
    for (const [id, why] of Object.entries(PENDING_TCI_REASONS)) {
      expect(why, id).toMatch(/needs (the |Table )/);
      expect(why, id).toMatch(/PMID \d+/);
    }
  });
});

// --- fixtures: one valid set, then one change per rule that the rule must refuse ----------------------------------

const FIX_PAPER: TciPaper = { authors: 'Fixture A, Fixture B', year: 2000, journal: 'Fixture Journal', vol: '1', pages: '1–9', doi: '10.0000/fixture' };
const FIX_REF: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };
/** Synthetic coefficients [ENG: test]: V1 by weight and V2 by age, so a set reads exactly ageY and weightKg. */
const fixParams = (p: PkPatient): PkParams => fromClearances(0.2 * p.weightKg, 20 - 0.1 * (p.ageY - 40), 200, 1.5, 1, 0.8, [0.3]);
const FIX_META: TciSetMeta = {
  id: 'fixture-a', drugId: 'propofol', name: 'Fixture A', paper: FIX_PAPER, table: 'Table 1, p. 2',
  population: { ageY: [20, 80], weightKg: [40, 120], src: 'Table 1, p. 2' }, covariates: ['ageY', 'weightKg'], reference: FIX_REF,
  ke0: { value: 0.3, method: 'pkpd', src: 'pk-paper' }, site: 'arterial', units: 'L, L/min, /min; mg → µg/mL',
  worked: { patient: FIX_REF, values: { v1: '14.0', v2: '20.0', v3: '200', cl1: '1.50', cl2: '1.0', cl3: '0.80', ke0: '0.30' }, src: 'Table 2, p. 3' },
  readBy: { first: 'executor-a', second: 'executor-b', date: '2026-11-10' },
};
const FIX: TciSet = { meta: FIX_META, params: fixParams };
const fx = (meta: Partial<TciSetMeta>, params: TciSet['params'] = fixParams): TciSet => ({ meta: { ...FIX_META, ...meta }, params });
const CLEAN_MODULE = 'export const fixture = 1;\n';

describe('TCI-set check: the valid fixture passes every rule', () => {
  it('rules 1–7', () => {
    expect([...rule1([FIX]), ...rule2(FIX), ...rule3(FIX), ...rule4(FIX), ...rule5(FIX, CLEAN_MODULE), ...rule6(FIX)]).toEqual([]);
  });
});

describe('TCI-set check: each rule refuses a fixture made to break it', () => {
  it('rule 1: no metadata, no DOI or PMID, no table, a curve drug, a duplicate id, one reader', () => {
    expect(rule1([{ params: fixParams } as unknown as TciSet])).toEqual(['a registered set has no metadata']);
    expect(rule1([fx({ paper: { ...FIX_PAPER, doi: undefined } })])).toEqual(['fixture-a: the paper has neither a DOI nor a PMID']);
    expect(rule1([fx({ paper: { ...FIX_PAPER, doi: undefined, pmid: '1234567' } })])).toEqual([]); // a PMID alone is enough
    expect(rule1([fx({ table: ' ' })])).toEqual(['fixture-a: no table (the table or equation, and its page)']);
    expect(rule1([fx({ drugId: 'midazolam' })])).toEqual(['fixture-a: drugId midazolam is not a library drug with a compartment model']);
    expect(rule1([FIX, FIX])).toEqual(['fixture-a: registered twice']);
    expect(rule1([fx({ readBy: { first: 'executor-a', second: 'executor-a', date: '2026-11-10' } })])).toEqual(['fixture-a: readBy needs two different readers and a date YYYY-MM-DD']);
    expect(rule1([fx({ reference: { ...FIX_REF, ageY: 90 } })])).toEqual(["fixture-a: the reference patient's ageY 90 is outside the population"]);
  });
  it('rule 2: a covariate read but not listed, and one listed but not read', () => {
    expect(rule2(fx({ covariates: ['weightKg'] }))).toEqual(['fixture-a: ageY is not listed, but perturbing it changes the parameters']);
    expect(rule2(fx({ covariates: ['ageY', 'weightKg', 'sex'] }))).toEqual(['fixture-a: sex is listed, but perturbing it changes no parameter']);
    const readsPche = (p: PkPatient) => ({ ...fixParams(p), k10: fixParams(p).k10 * (p.pche === 'hom' ? 2 : 1) });
    expect(rule2(fx({}, readsPche))).toEqual(['fixture-a: pche is not listed, but perturbing it changes the parameters']);
  });
  it('rule 3: ke0 none with an effect site in the function, and a stated ke0 without one', () => {
    expect(rule3(fx({ ke0: { none: true } }))).toEqual(['fixture-a: ke0 is none, but the function returns 1 effect site(s)']);
    const noSite = (p: PkPatient) => ({ ...fixParams(p), ke0: [] });
    expect(rule3(fx({ ke0: { none: true } }, noSite))).toEqual([]);
    expect(tciModeRefusal(fx({ ke0: { none: true } }, noSite), 'effect')).toBe(NO_KE0_REFUSAL);
    expect(rule3(fx({}, noSite))).toEqual(['fixture-a: a ke0 is stated, but the function returns no effect site']);
  });
  it('rule 4: a value off by more than the printed precision, no values, a reason missing', () => {
    expect(rule4(fx({ worked: { patient: FIX_REF, values: { v1: '14.1' }, src: 'Table 2, p. 3' } }))).toEqual(['fixture-a: v1 is 14, the paper prints 14.1']);
    expect(rule4(fx({ worked: { patient: FIX_REF, values: { v1: '14' }, src: 'Table 2, p. 3' } }))).toEqual([]); // printed to units, agrees
    expect(rule4(fx({ worked: { patient: FIX_REF, values: {}, src: 'Table 2, p. 3' } }))).toEqual(['fixture-a: no worked values']);
    expect(rule4(fx({ worked: { none: '' } }))).toEqual(['fixture-a: worked.none must say why the paper prints no worked values']);
  });
  it('rule 5: a [VERIFY] mark in the module or the metadata, a missing module', () => {
    expect(rule5(FIX, '// microconstants [VERIFY against the paper]\n')).toEqual(['fixture-a: a [VERIFY] mark remains in its module']);
    expect(rule5(fx({ table: 'Table 3 [VERIFY]' }), CLEAN_MODULE)).toEqual(['fixture-a: a [VERIFY] mark remains in its metadata']);
    expect(rule5(FIX, undefined)).toEqual(['fixture-a: no module tci-sets/fixture-a.ts']);
  });
  it('rule 6: a ke0 from another paper without its PK, a value the function does not return, a wrong TTPE', () => {
    const other: TciPaper = { ...FIX_PAPER, authors: 'Other C', doi: '10.0000/other' };
    expect(rule6(fx({ ke0: { value: 0.3, method: 'pkpd', src: other } }))).toEqual(['fixture-a: a ke0 not from the PK paper must name the PK it was fitted with']);
    expect(rule6(fx({ ke0: { value: 0.3, method: 'pkpd', src: other, fittedWith: 'Other C 1999 PK' } }))).toEqual([]);
    expect(rule6(fx({ ke0: { value: 0.3, method: 'pkpd', src: { ...other, doi: undefined }, fittedWith: 'Other C 1999 PK' } }))).toEqual(["fixture-a: the ke0's own source needs authors and a DOI or PMID"]);
    expect(rule6(fx({ ke0: { value: 0.31, method: 'pkpd', src: 'pk-paper' } }))).toEqual(['fixture-a: ke0 states 0.31, the function returns 0.3']);
    expect(rule6(fx({ ke0: { value: 0.3, expr: '0.3', method: 'pkpd', src: 'pk-paper' } }))).toEqual(['fixture-a: ke0 needs exactly one of value or expr']);
    const t = ttpeMin(fixParams(FIX_REF));
    expect(rule6(fx({ ke0: { value: 0.3, method: 'ttpe', src: other, fittedWith: 'this set', ttpeMin: t } }))).toEqual([]);
    expect(rule6(fx({ ke0: { value: 0.3, method: 'ttpe', src: other, fittedWith: 'this set', ttpeMin: t + 0.5 } }))).toEqual([`fixture-a: with this PK the ke0 peaks at ${t.toFixed(3)} min, not the stated ${t + 0.5}`]);
    expect(rule6(fx({ ke0: { value: 0.3, method: 'pkpd', src: 'pk-paper', ttpeMin: t } }))).toEqual(['fixture-a: ttpeMin is stated, but the ke0 is not labelled ttpe']);
  });
  it('rule 7: a registered id the command refuses, a registered id still pending, an unregistered id accepted', () => {
    expect(rule7([FIX], {}, engineAccepts)).toEqual(['fixture-a: registered, but the TCI command refuses it']);
    expect(rule7([FIX], { 'fixture-a': 'propofol' }, (_d, m) => m === 'fixture-a')).toEqual(['fixture-a: registered, so it must leave PENDING_TCI_MODEL_IDS']);
    expect(rule7([], {}, (_d, m) => m === 'kataria')).toEqual(['kataria: not registered, but the TCI command accepts it']);
    expect(rule7([], { eleveld: 'propofol', bogus: 'propofol' }, engineAccepts)).toEqual(['bogus: pending, but the TCI command refuses it']);
  });
});
