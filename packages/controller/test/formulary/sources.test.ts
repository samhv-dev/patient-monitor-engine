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
import { checkFormulary, checkPumpDevices, injectableDrugIds, loadFormulary, loadPumpDevices, PUMP_DEVICE_IDS, type FormularyFiles, type FormularyProblem, type PumpDeviceFiles } from '../../src/index.ts';

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
const shapeOf = (file: string) => (file === 'sources.json' ? 'sources' : file === 'pending.json' ? 'pending' : file === 'stock-syringes.json' ? 'stock' : file.startsWith('diluents/') ? 'diluent' : 'drug');
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
        reconstitute: { diluents: ['water'], volumeMl: 10, src: 'fixture-label' },
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
    const filed = Object.keys(layer).filter((f) => !f.includes('/') && !['sources.json', 'pending.json', 'schema.json', 'stock-syringes.json'].includes(f)).map((f) => f.replace(/\.json$/, ''));
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

// ---- Plan pump-rack-tci.md S1: the stock syringes and bags (rule 7) and the reference pumps' device profiles ----
// The stock list (formulary/stock-syringes.json, PQ7 = B) holds only a product used at its labelled strength, from its
// own monograph; the device profiles (pump-devices/*.json, D12) hold every number with a row of research/50 (the
// catalogue and its page) or a gap. Fixtures below are TEST DATA ONLY, as above.
const REPO = resolve(pkg, '../..');
const DEVICES = join(pkg, 'pump-devices');
const RESEARCH_50 = join(REPO, 'research', '50-pump-reference-devices.md');
const readDevices = (dir: string): PumpDeviceFiles =>
  Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json').map((f) => [f, JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown]));
const deviceSchema = JSON.parse(readFileSync(join(DEVICES, 'schema.json'), 'utf8')) as { $id: string };
const deviceAjv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true }).addSchema(deviceSchema);
function deviceShapeErrors(files: PumpDeviceFiles): string[] {
  return Object.entries(files).flatMap(([f, data]) => {
    const v = deviceAjv.getSchema(`${deviceSchema.$id}#/definitions/${f.replace(/\.json$/, '')}`);
    if (!v) return [`${f}: no schema definition`];
    return v(data) ? [] : (v.errors ?? []).map((e) => `${f}${e.instancePath}: ${e.message}`);
  });
}
/** research/50's table rows: id → { source, tag } (the note's columns: Id, Fact, As printed, Source, Tag). */
function research50Rows(): Map<string, { source: string; tag: string }> {
  const rows = new Map<string, { source: string; tag: string }>();
  for (const line of readFileSync(RESEARCH_50, 'utf8').split('\n')) {
    const m = /^\| ((?:SP|OT|TC)-\d{2}) \|/.exec(line);
    if (!m) continue;
    const cells = line.split(' | ').map((c) => c.replace(/^\| ?| ?\|$/g, '').trim());
    rows.set(m[1]!, { source: cells[3] ?? '', tag: cells[4] ?? '' });
  }
  return rows;
}
/** Every { src } and { gap } in a profile, with its path. */
function* cited(v: unknown, path = ''): Generator<{ path: string; src?: string; gap?: string }> {
  if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* cited(v[i], `${path}/${i}`);
  else if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.src === 'string') yield { path, src: o.src };
    if (typeof o.gap === 'string') yield { path, gap: o.gap };
    for (const [k, x] of Object.entries(o)) yield* cited(x, `${path}/${k}`);
  }
}

/** A formulary fixture with a stock list that keeps every rule: a solution product at its strength, from its label. */
function withStock() {
  const f = fixture();
  f['fixturedrug.json'].products.push({ id: 'fixture-solution', form: 'solution', strength: { amount: 1, unit: 'mg', perVial: false, src: 'fixture-label' } });
  f['stock-syringes.json'] = {
    syringes: [{ id: 'fixture-1mg-ml-20ml', drugId: 'fixturedrug', product: 'fixture-solution', volumeMl: { ml: 20, src: 'fixture-label' }, use: { statement: 'Fixture: given undiluted by syringe pump.', src: 'fixture-label' } }],
    bags: [],
  };
  return f;
}

describe('rule 7: the stock syringes and bags (S1, PQ7 = B)', () => {
  it('the shipped stock list passes, has the schema\'s shape, and loads typed: only labelled-strength products, no bag', () => {
    const layer = readLayer(FOLDER);
    expect(layer['stock-syringes.json']).toBeDefined();
    expect(why(checkFormulary(layer))).toEqual([]);
    expect(shapeErrors(layer)).toEqual([]);
    const r = loadFormulary(layer);
    expect(r.ok && r.formulary.stock.syringes.map((s) => s.id)).toEqual(['propofol-10mg-ml-50ml', 'propofol-10mg-ml-20ml', 'phenylephrine-100mcg-ml-20ml']);
    expect(r.ok && r.formulary.stock.bags).toEqual([]);
    // the stock is not a drug file: the coverage rule (5) is untouched by it
    expect(r.ok && Object.keys(r.formulary.drugs)).not.toContain('stock-syringes');
  });
  it('each shipped stock syringe fits a syringe size of the SP-500 profile', () => {
    const sp500 = JSON.parse(readFileSync(join(DEVICES, 'sp-500.json'), 'utf8')) as { syringes: Array<{ ml: number }> };
    const largest = Math.max(...sp500.syringes.map((s) => s.ml));
    const r = loadFormulary(readLayer(FOLDER));
    expect(r.ok).toBe(true);
    for (const s of r.ok ? r.formulary.stock.syringes : []) expect(s.volumeMl.ml, s.id).toBeLessThanOrEqual(largest);
  });
  it('a fixture stock list that keeps every rule passes; without the file the stock is empty', () => {
    expect(why(check(withStock()))).toEqual([]);
    expect(shapeErrors(withStock())).toEqual([]);
    const r = loadFormulary(withStock(), FIXTURE_IDS);
    expect(r.ok && r.formulary.stock.syringes[0]?.volumeMl.ml).toBe(20);
    const none = loadFormulary(fixture(), FIXTURE_IDS);
    expect(none.ok && none.formulary.stock).toEqual({ syringes: [], bags: [] });
  });
  it('a stock volume without its src (rule 1), or a bare number, is refused', () => {
    const f = withStock();
    delete f['stock-syringes.json'].syringes[0].volumeMl.src;
    expect(why(check(f))).toEqual(['stock-syringes.json/syringes/0/volumeMl/ml: a number with no src beside it (nor a gap)']);
    const b = withStock();
    b['stock-syringes.json'].syringes[0].count = 2;
    expect(rules(check(b))).toEqual([1]);
  });
  it('a stock item that is not a product at its labelled strength from its own monograph is refused (rule 7)', () => {
    const edit = (e: (f: any) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const f = withStock();
      e(f);
      return check(f);
    };
    const one = (e: (f: any) => void) => why(edit(e)); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rules(edit((f) => (f['stock-syringes.json'].syringes[0].drugId = 'fixtureother')))).toEqual([7]);
    expect(one((f) => (f['stock-syringes.json'].syringes[0].drugId = 'fixtureother'))).toEqual(['stock-syringes.json/syringes/0/drugId: "fixtureother" has no drug file']);
    expect(one((f) => (f['stock-syringes.json'].syringes[0].product = 'nowhere'))).toEqual(['stock-syringes.json/syringes/0/product: "nowhere" is not a product of fixturedrug.json']);
    // a powder (reconstituted on the bench) is not stock
    expect(one((f) => (f['stock-syringes.json'].syringes[0].product = 'fixture-vial'))).toEqual([
      'stock-syringes.json/syringes/0/product: "fixture-vial" is not used at its labelled strength (a solution or emulsion per mL, not reconstituted): it is made on the bench',
    ]);
    // a strength per vial is not a concentration the syringe holds as it is
    expect(one((f) => (f['fixturedrug.json'].products[1].strength.perVial = true))).toEqual([
      'stock-syringes.json/syringes/0/product: "fixture-solution" is not used at its labelled strength (a solution or emulsion per mL, not reconstituted): it is made on the bench',
    ]);
    // the volume and the use come from the product's own monograph, not another source
    const other = withStock();
    other['sources.json']['fixture-label-2'] = { ...other['sources.json']['fixture-label'], product: 'Another fixture product' };
    other['stock-syringes.json'].syringes[0].use.src = 'fixture-label-2';
    expect(why(check(other))).toEqual(['stock-syringes.json/syringes/0/use/src: the stock item cites its product\'s own monograph, "fixture-label" (the product\'s strength source)']);
    other['stock-syringes.json'].syringes[0].use.src = 'fixture-stabilis';
    expect(why(check(other))).toEqual(['stock-syringes.json/syringes/0/use/src: the stock item cites its product\'s own monograph, "fixture-label" (the product\'s strength source)']);
    // ids are unique across syringes and bags
    expect(one((f) => f['stock-syringes.json'].bags.push({ ...f['stock-syringes.json'].syringes[0] }))).toEqual(['stock-syringes.json/bags/0/id: "fixture-1mg-ml-20ml" is listed twice']);
    // the file's shape: two lists
    expect(one((f) => delete f['stock-syringes.json'].bags)).toEqual(['stock-syringes.json/: the stock file holds two lists, syringes and bags']);
  });
  it('a stock statement over 200 characters is refused (rule 6)', () => {
    const f = withStock();
    f['stock-syringes.json'].syringes[0].use.statement = 'x'.repeat(201);
    expect(why(check(f))).toEqual(['stock-syringes.json/syringes/0/use/statement: 201 characters: a statement is at most 200, in our words']);
  });
});

describe('the reference pumps\' device profiles (S1, D12): every number with its catalogue row, or a gap', () => {
  const shipped = readDevices(DEVICES);
  const rows = research50Rows();
  it('the three shipped profiles pass the source check and the schema, and load typed', () => {
    expect(Object.keys(shipped).sort()).toEqual([...PUMP_DEVICE_IDS].map((d) => `${d}.json`).sort());
    expect(checkPumpDevices(shipped).map((p) => `${p.file}${p.path}: ${p.why}`)).toEqual([]);
    expect(deviceShapeErrors(shipped)).toEqual([]);
    const r = loadPumpDevices(shipped);
    expect(r.ok && r.devices['sp-500'].kind).toBe('syringe');
    expect(r.ok && r.devices['ot-701'].kind).toBe('drip');
  });
  it('every src is a row of research/50 that names its document and page; no number cites an inference or a gap row', () => {
    expect(rows.size).toBeGreaterThan(50);
    for (const [file, data] of Object.entries(shipped)) {
      for (const c of cited(data)) {
        if (!c.src) continue;
        const row = rows.get(c.src);
        expect(row, `${file}${c.path}: ${c.src} is not a row of research/50`).toBeDefined();
        expect(row!.source, `${file}${c.path}: ${c.src}`).toMatch(/\b(J1|J2) pp?\. \d|\bW1\b/);
        expect(['C', 'W', 'I'], `${file}${c.path}: ${c.src}`).toContain(row!.tag);
      }
    }
    // a number never leans on an inference row: only a fact (a C or W row) sources a number
    const numberSrcs = Object.values(shipped).flatMap((d) => [...cited(d)]).filter((c) => c.src);
    const inferred = numberSrcs.filter((c) => rows.get(c.src!)?.tag === 'I').map((c) => c.src);
    expect([...new Set(inferred)].sort()).toEqual(['OT-21', 'SP-20']); // "rapid" as bolus and purge rate, and "no bolus, no TCI": words, not numbers
  });
  it('every gap names a GAP row of research/50, and every GAP row of research/50 is a gap in a profile', () => {
    const gapRows = [...rows].filter(([, r]) => r.tag === 'GAP').map(([id]) => id);
    const named = new Set<string>();
    for (const [file, data] of Object.entries(shipped)) {
      for (const c of cited(data)) {
        if (!c.gap) continue;
        const ids = [...c.gap.matchAll(/research\/50 ((?:SP|OT|TC)-\d{2})/g)].map((m) => m[1]!);
        expect(ids.length, `${file}${c.path}: a gap names its research/50 row`).toBeGreaterThan(0);
        for (const id of ids) {
          expect(rows.get(id)?.tag, `${file}${c.path}: ${id}`).toBe('GAP');
          named.add(id);
        }
      }
    }
    expect(gapRows.filter((id) => !named.has(id))).toEqual([]);
  });
  it('the SP-500\'s flow range depends on the syringe size, as the catalogue prints it (not flattened)', () => {
    const r = loadPumpDevices(shipped);
    if (!r.ok) throw new Error('profiles do not load');
    const sp = r.devices['sp-500'];
    expect(sp.syringes.map((s) => [s.ml, s.rate.min, s.rate.max, s.rapid.rate])).toEqual([[10, 0.1, 200, 200], [20, 0.1, 300, 350], [30, 0.1, 300, 450], [50, 0.1, 300, 800]]);
    expect(sp.rateStep.step).toBe(0.1);
    const ot = r.devices['ot-701'];
    expect(ot.sets.map((s) => [s.dropsPerMl, s.standard.mlH.max, s.narrow.mlH.max, s.standard.dropsMin.max])).toEqual([[15, 450, 100, 100], [20, 450, 100, 100], [60, 100, 100, 100]]);
    expect([ot.rateStep.step, ot.purge.rateMoreThan, ot.kvo.rate, ot.volumeLimit.max]).toEqual([1, 450, 1, 9999]);
    // the SP5 TCI: the maker's page gives no mechanical number; each is a gap
    const tc = r.devices['sp5-tci'];
    for (const k of ['syringes', 'rate', 'bolus', 'purge', 'kvo', 'occlusion', 'alarms'] as const) expect(tc[k], k).toHaveProperty('gap');
  });
  const fixtureDevices = (): Record<string, any> => JSON.parse(JSON.stringify(shipped)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const pwhy = (f: PumpDeviceFiles) => checkPumpDevices(f).map((p) => `${p.file}${p.path}: ${p.why}`);
  it('a bare number, a number in a gap, a src of another device or no row id, an empty gap: each refused', () => {
    const bare = fixtureDevices();
    bare['sp-500.json'].weightKg = 2.6;
    expect(pwhy(bare)).toEqual(['sp-500.json/weightKg: a number with no src beside it (a gap holds none)']);
    const nosrc = fixtureDevices();
    delete nosrc['ot-701.json'].kvo.src;
    expect(pwhy(nosrc)).toEqual(['ot-701.json/kvo/rate: a number with no src beside it (a gap holds none)']);
    const ingap = fixtureDevices();
    ingap['sp5-tci.json'].kvo = { gap: 'the KVO rate: SP5 TCI operator manual', rate: 1 };
    expect(pwhy(ingap)).toEqual(['sp5-tci.json/kvo: a gap holds no number and no src: a number needs its row']);
    const other = fixtureDevices();
    other['sp-500.json'].rateStep.src = 'OT-09';
    expect(pwhy(other)).toEqual(['sp-500.json/rateStep/src: "OT-09" is not a row of this device in research/50 (SP-nn)']);
    const free = fixtureDevices();
    free['ot-701.json'].kvo.src = 'JMS OT-701 catalogue, p. 2';
    expect(pwhy(free)).toEqual(['ot-701.json/kvo/src: "JMS OT-701 catalogue, p. 2" is not a row of this device in research/50 (OT-nn)']);
    const empty = fixtureDevices();
    empty['sp-500.json'].nearEnd = { gap: '' };
    expect(pwhy(empty)).toEqual(['sp-500.json/nearEnd/gap: a gap names what the manual must give (1–200 characters)']);
  });
  it('a profile not named after its id, a missing profile, an unknown one, a long string: each refused', () => {
    const named = fixtureDevices();
    named['ot-701.json'].deviceId = 'ot-702';
    expect(pwhy(named)).toContain('ot-701.json/deviceId: the file\'s id "ot-702" is not its name "ot-701"');
    const missing = fixtureDevices();
    delete missing['sp5-tci.json'];
    expect(pwhy(missing)).toEqual(['sp5-tci.json/: the profile of a reference device is missing']);
    const unknown = fixtureDevices();
    unknown['sp-600.json'] = { ...unknown['sp-500.json'], deviceId: 'sp-600' };
    expect(pwhy(unknown)).toEqual(['sp-600.json/: not a reference device (sp-500, ot-701, sp5-tci)']);
    const long = fixtureDevices();
    long['sp-500.json'].alarms.names.push('x'.repeat(201));
    expect(pwhy(long)).toEqual(['sp-500.json/alarms/names/6: 201 characters: at most 200, our words or a few printed ones']);
    expect(loadPumpDevices(long).ok).toBe(false);
  });
  it('the folder holds JSON only, none oversized, no PDF or extracted text of a catalogue', () => {
    expect(folderProblems(DEVICES)).toEqual([]);
  });
});
