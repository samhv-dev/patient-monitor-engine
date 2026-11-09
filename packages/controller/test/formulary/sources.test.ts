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
/** A formulary file larger than this is not an entry (a class C entry is a few kB): an extract would be (rule 6). */
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
  it('rule 3: a statement on Trissel while Stabilis is the record; `has` that does not match the sources cited; no `has`', () => {
    const t = fixture();
    t['fixturedrug.json'].admixtures[0].src = 'fixture-trissel';
    expect(why(check(t))).toEqual(['fixturedrug.json/admixtures/0/src: a statement cites Stabilis, the source of record (Trissel only when has.stabilis is false)']);
    const h = fixture();
    h['fixturedrug.json'].has.trissel = false;
    expect(why(check(h))).toEqual(['fixturedrug.json/has/trissel: has.trissel is false but the file cites a trissel source']);
    const n = fixture();
    delete n['diluents/water.json'].has;
    expect(why(check(n))).toEqual(['diluents/water.json/has: every file has `has` with stabilis, trissel and monograph, each true or false']);
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
