// Plan learner-action-remote.md §5 and L1: the formulary's source check. It runs in the controller's unit job on every
// pull request, on the shipped layer (`packages/controller/formulary/`), and each of §5's six rules is shown to fail
// on a fixture built to break it. The fixtures below are TEST DATA ONLY: their drug, product and sources are invented
// names (`fixturedrug`, `fixture-*`), never shipped, never read by the bench, and say nothing about any real drug.
// What this check cannot prove is that an entry says what its source says: the second reading does that (§5).
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';
import { DRUGS, DRUG_IDS } from '@pme/engine-core';
import { checkFormulary, injectableDrugIds, loadFormulary, type FormularyFiles, type FormularyProblem } from '../../src/index.ts';

const pkg = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const FOLDER = join(pkg, 'formulary');
const PACKAGES = resolve(pkg, '..');
/** A formulary file larger than this is not an entry (a class C entry is a few kB): an extract would be (rule 6) [ENG: test]. */
const MAX_FILE_BYTES = 32 * 1024;

/** Every file under `dir` (relative path), skipping node_modules and build output. */
function walk(dir: string, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' || d.name === 'dist' ? [] : walk(p, root);
    return [relative(root, p).split('\\').join('/')];
  });
}
/** The layer's files, parsed: what the bench will be handed. */
const readLayer = (dir: string): FormularyFiles =>
  Object.fromEntries(walk(dir).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown]));
/** Rule 6, the part a browser cannot do: the folder holds JSON only (and the empty folder's `.gitkeep`), each file
 *  small, and no PDF, by name or by its first bytes; no extracted text file (.txt, .md, .html, …) either. */
function folderProblems(dir: string): string[] {
  return walk(dir).flatMap((f) => {
    const p = join(dir, f);
    const head = readFileSync(p).subarray(0, 5).toString('latin1');
    const out: string[] = [];
    if (!f.endsWith('.json') && !f.endsWith('/.gitkeep') && f !== '.gitkeep') out.push(`${f}: only JSON entries live in the formulary (no PDF, no extracted text)`);
    if (head === '%PDF-') out.push(`${f}: a PDF`);
    if (statSync(p).size > MAX_FILE_BYTES) out.push(`${f}: ${statSync(p).size} bytes, more than an entry (${MAX_FILE_BYTES})`);
    return out;
  });
}
/** No PDF anywhere under packages/ (Trissel is read in place in the workspace library, never copied: LQ5). */
const pdfsUnder = (dir: string) => walk(dir).filter((f) => /\.pdf$/i.test(f) || readFileSync(join(dir, f)).subarray(0, 5).toString('latin1') === '%PDF-');

// ---- the JSON Schema (the files' shape; the rules beyond shape are checkFormulary's) ----
const schema = JSON.parse(readFileSync(join(FOLDER, 'schema.json'), 'utf8')) as { $id: string };
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true }).addSchema(schema);
const shapeOf = (file: string) => (file === 'sources.json' ? 'sources' : file === 'pending.json' ? 'pending' : file.startsWith('diluents/') ? 'diluent' : 'drug');
function shapeErrors(files: FormularyFiles): string[] {
  return Object.entries(files).filter(([f]) => f !== 'schema.json').flatMap(([f, data]) => {
    const v = ajv.getSchema(`${schema.$id}#/definitions/${shapeOf(f)}`)!;
    return v(data) ? [] : (v.errors ?? []).map((e) => `${f}${e.instancePath}: ${e.message}`);
  });
}

// ---- a fixture that keeps every rule (TEST DATA ONLY: invented names, no real drug or source) ----
const FIXTURE_IDS = ['fixturedrug', 'fixtureother'];
function fixture() {
  return {
    'sources.json': {
      'fixture-stabilis': { kind: 'stabilis', id: 'FIXTURE-0', retrieved: '2026-11-09', cites: 'Fixture A, et al. Invented 2000' },
      'fixture-trissel': { kind: 'trissel', edition: '17 (2013)', monograph: 'Fixturedrug', page: 1, reader: 'fixture reader', date: '2026-11-09' },
      'fixture-label': { kind: 'monograph', product: 'Fixturedrug 10 mg vial', holder: 'Fixture Holder', version: '2026-01', issuer: 'DailyMed' },
    },
    'pending.json': ['fixtureother'],
    'fixturedrug.json': {
      drugId: 'fixturedrug',
      products: [{
        id: 'fixture-vial', form: 'powder',
        strength: { amount: 10, unit: 'mg', perVial: true, src: 'fixture-label' },
        reconstitute: { diluents: ['water'], volumeMl: 10, final: { volumeMl: 10.5, src: 'fixture-label' }, src: 'fixture-label' },
        prepTime: { gap: 'LQ7' },
      }],
      diluents: [
        { id: 'water', listed: true, src: 'fixture-label' },
        { id: 'saline', listed: false, src: 'fixture-label',
          compat: { verdict: 'incompatible', statement: 'Fixture statement in our words.', src: 'fixture-stabilis', crossCheck: { trissel: 'agrees', src: 'fixture-trissel' } } },
      ],
      admixtures: [{ with: 'fixtureother', verdict: 'not tested', statement: 'Fixture: no statement found.', src: 'fixture-stabilis', crossCheck: { trissel: 'not listed' } }],
      stability: [{ diluent: 'water', container: 'vial', tempC: 25, points: [[0, 1], [6, 0.95]], statement: 'Fixture: 95 % at 6 h.', src: 'fixture-stabilis',
        crossCheck: { trissel: 'differs', src: 'fixture-trissel', ruling: { by: 'fixture orchestrator', date: '2026-11-09', follows: 'stabilis' } } }],
      has: { stabilis: true, trissel: true, monograph: true },
    },
    'diluents/water.json': { diluentId: 'water', name: 'Fixture water', has: { stabilis: false, trissel: false, monograph: false } },
  } as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
const check = (files: FormularyFiles) => checkFormulary(files, FIXTURE_IDS);
const rules = (ps: FormularyProblem[]) => [...new Set(ps.map((p) => p.rule))];
const why = (ps: FormularyProblem[]) => ps.map((p) => `${p.file}${p.path}: ${p.why}`);

describe('the shipped formulary layer', () => {
  const layer = readLayer(FOLDER);
  it('passes the source check and the schema (L1 ships it empty: no drug file, every injectable id pending)', () => {
    expect(why(checkFormulary(layer))).toEqual([]);
    expect(shapeErrors(layer)).toEqual([]);
    expect(loadFormulary(layer).ok).toBe(true);
  });
  it('covers the 61 injectable ids of the library, the four volatiles excluded', () => {
    expect(injectableDrugIds()).toHaveLength(61);
    expect(DRUG_IDS.filter((id) => !injectableDrugIds().includes(id)).every((id) => DRUGS[id]?.cls === 'volatile')).toBe(true);
    const filed = Object.keys(layer).filter((f) => !f.includes('/') && !['sources.json', 'pending.json', 'schema.json'].includes(f)).map((f) => f.replace(/\.json$/, ''));
    expect([...filed, ...(layer['pending.json'] as string[])].sort()).toEqual([...injectableDrugIds()].sort());
  });
  it('holds JSON entries only, none oversized, no PDF; and no PDF anywhere under packages/ (rule 6)', () => {
    expect(folderProblems(FOLDER)).toEqual([]);
    expect(pdfsUnder(PACKAGES)).toEqual([]);
  });
});

describe('a fixture that keeps every rule passes', () => {
  it('no problem, the schema agrees, and the loader returns it typed', () => {
    expect(why(check(fixture()))).toEqual([]);
    expect(shapeErrors(fixture())).toEqual([]);
    const r = loadFormulary(fixture(), FIXTURE_IDS);
    expect(r.ok && r.formulary.drugs.fixturedrug?.products[0]?.strength.amount).toBe(10);
    expect(r.ok && Object.keys(r.formulary.diluents)).toEqual(['water']);
  });
});

describe('the three fields the FS batch needed (brief 127): a row\'s concentration, a "stable" marker, a label\'s in-use time', () => {
  const withFields = () => {
    const f = fixture();
    f['fixturedrug.json'].products[0].inUse = [{ h: 24, tempC: 25, condition: 'Fixture: diluted, below 25 °C.', src: 'fixture-label' }, { h: 72, condition: 'Fixture: refrigerated.', src: 'fixture-label' }];
    f['fixturedrug.json'].stability[0].concentration = { amount: 1, unit: 'mg/mL', src: 'fixture-stabilis' };
    f['fixturedrug.json'].stability.push({ kind: 'stable', concentration: { amount: 0.5, max: 2, unit: 'mg/mL', src: 'fixture-stabilis' }, diluent: 'water', container: 'syringe-pp', tempC: 25, points: [[24, 0.9]], statement: 'Fixture: stable 24 h.', src: 'fixture-stabilis', crossCheck: { trissel: 'not listed' } });
    return f;
  };
  it('are admitted by the schema and the source check, and the loader returns them typed', () => {
    expect(shapeErrors(withFields())).toEqual([]);
    expect(why(check(withFields()))).toEqual([]);
    const r = loadFormulary(withFields(), FIXTURE_IDS);
    expect(r.ok && r.formulary.drugs.fixturedrug?.stability[1]?.concentration).toEqual({ amount: 0.5, max: 2, unit: 'mg/mL', src: 'fixture-stabilis' });
    expect(r.ok && r.formulary.drugs.fixturedrug?.stability[1]?.kind).toBe('stable');
    expect(r.ok && r.formulary.drugs.fixturedrug?.products[0]?.inUse?.[0]?.h).toBe(24);
  });
  it('each is a sourced number (rule 1): a concentration or an in-use time without its src is refused', () => {
    const c = withFields();
    delete c['fixturedrug.json'].stability[0].concentration.src;
    expect(why(check(c))).toEqual(['fixturedrug.json/stability/0/concentration/amount: a number with no src beside it (nor a gap)']);
    const u = withFields();
    delete u['fixturedrug.json'].products[0].inUse[0].src;
    expect(why(check(u))).toEqual([
      'fixturedrug.json/products/0/inUse/0/h: a number with no src beside it (nor a gap)',
      'fixturedrug.json/products/0/inUse/0/tempC: a number with no src beside it (nor a gap)',
    ]);
  });
  it('the schema refuses their wrong shapes', () => {
    const bad = (edit: (d: any) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const f = withFields();
      edit(f['fixturedrug.json']);
      return shapeErrors(f);
    };
    expect(bad((d) => (d.stability[1].kind = 'curve'))).toEqual(['fixturedrug.json/stability/1/kind: must be equal to one of the allowed values']);
    expect(bad((d) => (d.stability[0].concentration.unit = 'mg'))).toEqual(['fixturedrug.json/stability/0/concentration/unit: must match pattern "^(g|mg|mcg|µg|ng|IU|units|mmol|mEq)/(mL|L)$"']);
    expect(bad((d) => delete d.stability[0].concentration.amount)).toEqual(["fixturedrug.json/stability/0/concentration: must have required property 'amount'"]);
    expect(bad((d) => (d.stability[0].concentration.amount = 0))).toEqual(['fixturedrug.json/stability/0/concentration/amount: must be > 0']);
    expect(bad((d) => delete d.products[0].inUse[0].condition)).toEqual(["fixturedrug.json/products/0/inUse/0: must have required property 'condition'"]);
    expect(bad((d) => (d.products[0].inUse = []))).toEqual(['fixturedrug.json/products/0/inUse: must NOT have fewer than 1 items']);
  });
});

describe('the three fields of brief 152: a statement\'s containers (N60), a molar mass (N61), a powder\'s final volume (N73)', () => {
  const bad = (edit: (d: any) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const f = fixture();
    edit(f['fixturedrug.json']);
    return [...shapeErrors(f), ...why(check(f))];
  };
  it('are admitted with their sources', () => {
    expect(bad((d) => {
      d.diluents[1].compat.containers = ['bag-pvc'];
      d.admixtures[0].containers = ['syringe-pp', 'bag-polyolefin'];
      d.molarMass = { mgPerMmol: 84, src: 'fixture-label' };
    })).toEqual([]);
    expect(bad((d) => (d.products[0].reconstitute.final = { perMl: 0.95, src: 'fixture-label' }))).toEqual([]);
    expect(bad((d) => (d.products[0].reconstitute.final = { stated: false, src: 'fixture-label' }))).toEqual([]);
  });
  it('a container the formulary does not name, or an empty list, is refused', () => {
    expect(bad((d) => (d.diluents[1].compat.containers = ['glass']))).toEqual(['fixturedrug.json/diluents/1/compat/containers/0: must be equal to one of the allowed values']);
    expect(bad((d) => (d.admixtures[0].containers = []))).toEqual(['fixturedrug.json/admixtures/0/containers: must NOT have fewer than 1 items']);
  });
  it('a molar mass without its source is refused (rule 1 and the schema)', () => {
    expect(bad((d) => (d.molarMass = { mgPerMmol: 84 }))).toEqual([
      "fixturedrug.json/molarMass: must have required property 'src'",
      'fixturedrug.json/molarMass/mgPerMmol: a number with no src beside it (nor a gap)',
    ]);
  });
  it('a reconstituted product says what its label states after reconstitution: a final volume, a concentration, or that it states neither', () => {
    expect(bad((d) => delete d.products[0].reconstitute.final)).toEqual(["fixturedrug.json/products/0/reconstitute: must have required property 'final'"]);
    // (ajv also names each branch of the oneOf it tried; the oneOf line is the verdict)
    expect(bad((d) => (d.products[0].reconstitute.final = { stated: true, src: 'fixture-label' }))).toContain('fixturedrug.json/products/0/reconstitute/final: must match exactly one schema in oneOf');
    const unsourced = bad((d) => (d.products[0].reconstitute.final = { volumeMl: 10.5 }));
    expect(unsourced).toContain('fixturedrug.json/products/0/reconstitute/final: must match exactly one schema in oneOf');
    expect(unsourced).toContain('fixturedrug.json/products/0/reconstitute/final/volumeMl: a number with no src beside it (nor a gap)');
  });
});

describe("each of §5's rules fails on a fixture built to break it", () => {
  it('rule 1: a bare number (no src beside it, no gap)', () => {
    const f = fixture();
    f['fixturedrug.json'].products[0].vials = 2;
    expect(rules(check(f))).toEqual([1]);
    expect(why(check(f))).toEqual(['fixturedrug.json/products/0/vials: a number with no src beside it (nor a gap)']);
    delete f['fixturedrug.json'].products[0].vials;
    delete f['fixturedrug.json'].products[0].strength.src;
    expect(why(check(f))).toContain('fixturedrug.json/products/0/strength/amount: a number with no src beside it (nor a gap)');
  });
  it('rule 1: an unresolved src', () => {
    const f = fixture();
    f['fixturedrug.json'].products[0].strength.src = 'nowhere';
    expect(why(check(f))).toContain('fixturedrug.json/products/0/strength/src: src "nowhere" is not in sources.json');
  });
  it('rule 2: a Trissel entry without edition, without page; Trissel not the 17th (2013); a Stabilis entry without date; a label without holder', () => {
    for (const [field, want] of [['edition', 'has no edition'], ['page', 'has no page']] as const) {
      const f = fixture();
      delete f['sources.json']['fixture-trissel'][field];
      expect(rules(check(f))).toEqual([2]);
      expect(why(check(f))).toEqual([`sources.json/fixture-trissel: trissel source "fixture-trissel" ${want}`]);
    }
    const ed = fixture();
    ed['sources.json']['fixture-trissel'].edition = '18 (2014)';
    expect(why(check(ed))).toEqual(['sources.json/fixture-trissel/edition: Trissel is cited as edition 17 (2013) only (LQ5), not "18 (2014)"']);
    const st = fixture();
    delete st['sources.json']['fixture-stabilis'].retrieved;
    expect(why(check(st))).toEqual(['sources.json/fixture-stabilis: stabilis source "fixture-stabilis" has no retrieved']);
    const mo = fixture();
    delete mo['sources.json']['fixture-label'].holder;
    expect(why(check(mo))).toEqual(['sources.json/fixture-label: monograph source "fixture-label" has no holder']);
  });
  it('rule 3: a statement without crossCheck', () => {
    const f = fixture();
    delete f['fixturedrug.json'].diluents[1].compat.crossCheck;
    expect(rules(check(f))).toEqual([3]);
    expect(why(check(f))).toEqual(['fixturedrug.json/diluents/1/compat/crossCheck: a statement has crossCheck.trissel: agrees, differs or not listed']);
  });
  it('rule 3: a `differs` without a ruling', () => {
    const f = fixture();
    delete f['fixturedrug.json'].stability[0].crossCheck.ruling;
    expect(why(check(f))).toEqual(['fixturedrug.json/stability/0/crossCheck/ruling: `differs` needs a ruling: by, date (YYYY-MM-DD), and which source the entry follows']);
  });
  it('rule 3: a statement on a label or an unknown kind; `has` that does not match the sources cited; no `has`', () => {
    const t = fixture();
    t['fixturedrug.json'].admixtures[0].src = 'fixture-label';
    expect(rules(check(t))).toEqual([3]);
    expect(why(check(t))).toEqual(['fixturedrug.json/admixtures/0/src: a statement cites Stabilis, the source of record, or Trissel where Stabilis has no statement for it']);
    const h = fixture();
    h['fixturedrug.json'].has.trissel = false;
    expect(why(check(h))).toEqual(['fixturedrug.json/has/trissel: has.trissel is false but the file cites a trissel source']);
    const n = fixture();
    delete n['diluents/water.json'].has;
    expect(why(check(n))).toEqual(['diluents/water.json/has: every file has `has` with stabilis, trissel and monograph, each true or false']);
  });
  it('rule 3, per statement: a Trissel-only statement carrying its own Trissel source and page is accepted in a file Stabilis covers', () => {
    // The fixture file has has.stabilis true (its other statements cite Stabilis); this one statement is Trissel's alone.
    const f = fixture();
    f['fixturedrug.json'].admixtures[0] = { ...f['fixturedrug.json'].admixtures[0], verdict: 'incompatible', statement: 'Fixture, Trissel only: a haze forms.', src: 'fixture-trissel', crossCheck: { trissel: 'agrees', src: 'fixture-trissel' } };
    expect(f['fixturedrug.json'].has.stabilis).toBe(true);
    expect(why(check(f))).toEqual([]);
    expect(shapeErrors(f)).toEqual([]);
    // and the same in a stability row and a diluent statement; with every statement Trissel's, the file cites no
    // Stabilis source and its flag says so (the rocuronium case: has.stabilis false, statements from Trissel)
    f['fixturedrug.json'].stability[0] = { ...f['fixturedrug.json'].stability[0], src: 'fixture-trissel', crossCheck: { trissel: 'agrees', src: 'fixture-trissel' } };
    f['fixturedrug.json'].diluents[1].compat = { ...f['fixturedrug.json'].diluents[1].compat, src: 'fixture-trissel', crossCheck: { trissel: 'agrees', src: 'fixture-trissel' } };
    expect(why(check(f))).toEqual(['fixturedrug.json/has/stabilis: has.stabilis is true but the file does not cite a stabilis source']);
    f['fixturedrug.json'].has.stabilis = false;
    expect(why(check(f))).toEqual([]);
  });
  it('rule 3, per statement: a Trissel-only statement is refused when it does not carry its own Trissel source and page', () => {
    const trisselOnly = (crossCheck: unknown) => {
      const f = fixture();
      f['fixturedrug.json'].admixtures[0] = { ...f['fixturedrug.json'].admixtures[0], src: 'fixture-trissel', crossCheck };
      return f;
    };
    const own = 'fixturedrug.json/admixtures/0/crossCheck: a statement taken from Trissel (Stabilis has none for it) carries its own Trissel source and page: crossCheck { trissel: "agrees", src: the statement\'s own Trissel key }';
    // its cross-check says Trissel does not list it, or differs from it: not Trissel's statement
    expect(why(check(trisselOnly({ trissel: 'not listed' })))).toEqual([own]);
    expect(rules(check(trisselOnly({ trissel: 'not listed' })))).toEqual([3]);
    expect(why(check(trisselOnly({ trissel: 'differs', src: 'fixture-trissel', ruling: { by: 'fixture orchestrator', date: '2026-11-10', follows: 'trissel' } })))).toEqual([own]);
    // its cross-check names another Trissel page than the one the statement cites
    const other = trisselOnly({ trissel: 'agrees', src: 'fixture-trissel-2' });
    other['sources.json']['fixture-trissel-2'] = { ...other['sources.json']['fixture-trissel'], page: 2 };
    expect(why(check(other))).toEqual([own]);
    // its Trissel source has no page: rule 2 for the source, rule 3 for the statement that leans on it
    const nopage = trisselOnly({ trissel: 'agrees', src: 'fixture-trissel' });
    delete nopage['sources.json']['fixture-trissel'].page;
    expect(rules(check(nopage)).sort()).toEqual([2, 3]);
    expect(why(check(nopage))).toContain('fixturedrug.json/admixtures/0/src: a statement taken from Trissel cites a Trissel page; "fixture-trissel" has none');
  });
  it('rule 3, per statement: a statement whose src resolves nowhere is refused once, by rule 1 and rule 3', () => {
    const f = fixture();
    f['fixturedrug.json'].admixtures[0].src = 'nowhere';
    expect(rules(check(f)).sort()).toEqual([1, 3]);
  });
  it('rule 4: a gap without an LQ id; an id not in §10; a gap where the bench needs the number; a gap holding a number', () => {
    const f = fixture();
    f['fixturedrug.json'].products[0].prepTime = { gap: 'later' };
    expect(rules(check(f))).toEqual([4]);
    expect(why(check(f))).toEqual(['fixturedrug.json/products/0/prepTime/gap: gap "later" names no owner question (LQ1–LQ14)']);
    f['fixturedrug.json'].products[0].prepTime = { gap: 'LQ15' };
    expect(why(check(f))).toEqual(['fixturedrug.json/products/0/prepTime/gap: gap "LQ15" names no owner question (LQ1–LQ14)']);
    const s = fixture();
    s['fixturedrug.json'].products[0].strength = { gap: 'LQ6' };
    expect(why(check(s))).toEqual(['fixturedrug.json/products/0/strength: "strength" is required to deliver: it cannot be a gap']);
    const n = fixture();
    n['fixturedrug.json'].products[0].prepTime = { s: 120, gap: 'LQ7' };
    expect(why(check(n))).toEqual(['fixturedrug.json/products/0/prepTime: a gap holds no number: a number needs its src']);
  });
  it('rule 5: a drug neither filed nor pending; a drug filed and still pending; a file not named after its id', () => {
    const f = fixture();
    f['pending.json'] = [];
    expect(rules(check(f))).toEqual([5]);
    expect(why(check(f))).toEqual(['pending.json/: "fixtureother" has no file and is not pending']);
    const both = fixture();
    both['pending.json'] = ['fixtureother', 'fixturedrug'];
    expect(why(check(both))).toEqual(['pending.json/: "fixturedrug" has a file and is still pending']);
    const named = fixture();
    named['fixturedrug.json'].drugId = 'fixtureother';
    expect(why(check(named))).toContain('fixturedrug.json/: the file\'s id "fixtureother" is not its name "fixturedrug"');
    // the shipped layer is held to the library: an injectable id added to the library with no file and not pending fails
    const layer = readLayer(FOLDER);
    expect(why(checkFormulary(layer, [...injectableDrugIds(), 'newdrug']))).toEqual(['pending.json/: "newdrug" has no file and is not pending']);
  });
  it('rule 6: a statement over 200 characters (a copied passage, not our words)', () => {
    const f = fixture();
    f['fixturedrug.json'].stability[0].statement = 'x'.repeat(201);
    expect(rules(check(f))).toEqual([6]);
    expect(why(check(f))).toEqual(['fixturedrug.json/stability/0/statement: 201 characters: a statement is at most 200, in our words']);
  });
});

describe('rule 6: the Trissel PDF, or text extracted from it, is refused in the formulary folder', () => {
  let dir = '';
  afterEach(() => void (dir && existsSync(dir) && rmSync(dir, { recursive: true })));
  it('a PDF by name, a PDF renamed .json, an extracted .txt, an oversized .json: each refused; the fixture alone passes', () => {
    dir = mkdtempSync(join(tmpdir(), 'pme-formulary-'));
    for (const [f, data] of Object.entries(fixture())) {
      const p = join(dir, f);
      if (f.startsWith('diluents/') && !existsSync(join(dir, 'diluents'))) mkdirSync(join(dir, 'diluents'));
      writeFileSync(p, JSON.stringify(data, null, 2));
    }
    expect(folderProblems(dir)).toEqual([]);
    expect(why(checkFormulary(readLayer(dir), FIXTURE_IDS))).toEqual([]);
    writeFileSync(join(dir, 'Handbook of Injectable Drugs (Trissel) 2013.pdf'), '%PDF-1.7\n');
    writeFileSync(join(dir, 'fixtureother.json'), '%PDF-1.7\n');
    writeFileSync(join(dir, 'trissel-p1.txt'), 'extracted text');
    writeFileSync(join(dir, 'diluents', 'big.json'), JSON.stringify({ text: 'x'.repeat(MAX_FILE_BYTES) }));
    expect(folderProblems(dir).sort()).toEqual([
      'Handbook of Injectable Drugs (Trissel) 2013.pdf: a PDF',
      'Handbook of Injectable Drugs (Trissel) 2013.pdf: only JSON entries live in the formulary (no PDF, no extracted text)',
      `diluents/big.json: ${MAX_FILE_BYTES + 11} bytes, more than an entry (${MAX_FILE_BYTES})`,
      'fixtureother.json: a PDF',
      'trissel-p1.txt: only JSON entries live in the formulary (no PDF, no extracted text)',
    ]);
    expect(pdfsUnder(dir).sort()).toEqual(['Handbook of Injectable Drugs (Trissel) 2013.pdf', 'fixtureother.json']);
  });
});
