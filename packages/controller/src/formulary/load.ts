// Plan learner-action-remote.md §5, L1: the formulary loader and the source check. `checkFormulary` applies §5's rules
// to the layer's files (already parsed: this module reads no file, so it runs in the browser as in Node, and pulls in
// no ajv); `loadFormulary` returns the typed layer only when no rule is broken. The CI check
// (test/formulary/sources.test.ts) runs both on `packages/controller/formulary/`, plus the parts a browser cannot do:
// the JSON Schema (`formulary/schema.json`) and the folder's file types and sizes (rule 6). What no check can prove is
// that an entry says what its source says: that is the second reading, before a batch merges.
import { DRUGS, DRUG_IDS } from '@pme/engine-core';
import type { DiluentEntry, DrugEntry, Formulary, FormularyFiles, FormularyProblem, Has, Source, SourceKind } from './types.ts';

/** The drug ids the formulary covers: every row of the library that is not a volatile (61 on 8344539d). */
export const injectableDrugIds = (): string[] => DRUG_IDS.filter((id) => DRUGS[id]?.cls !== 'volatile');

/** An owner question id of the plan's §10: LQ1–LQ14. */
export const GAP_ID = /^LQ(1[0-4]|[1-9])$/;
/** The one Trissel edition the owner ruled (LQ5): the 17th, 2013. */
export const TRISSEL_EDITION = '17 (2013)';
/** A statement is a paraphrase in our words, never a copied monograph (rule 6) [ENG: test; keeps an entry a paraphrase, never a copied monograph]. */
export const MAX_STATEMENT = 200;
/** Fields the bench needs to deliver: a gap there is refused (rule 4); a preparation time may be a gap (LQ7). */
const NO_GAP = new Set(['strength', 'reconstitute', 'content']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED: Record<SourceKind, readonly string[]> = {
  stabilis: ['id', 'retrieved', 'cites'],
  trissel: ['edition', 'monograph', 'page', 'reader', 'date'],
  monograph: ['product', 'holder', 'version', 'issuer'],
  study: ['citation'],
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const filled = (v: unknown) => (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v));

/** Every object in `v` with its JSON path and its key in the parent. */
function* objects(v: unknown, path = '', key = ''): Generator<{ o: Obj; path: string; key: string }> {
  if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* objects(v[i], `${path}/${i}`, key);
  else if (isObj(v)) {
    yield { o: v, path: path || '/', key };
    for (const [k, x] of Object.entries(v)) yield* objects(x, `${path}/${k}`, k);
  }
}
/** Every number in `v` with its path and the nearest object holding it. */
function* numbers(v: unknown, path = '', owner: Obj | null = null): Generator<{ path: string; owner: Obj | null }> {
  if (typeof v === 'number') yield { path, owner };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* numbers(v[i], `${path}/${i}`, owner);
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) yield* numbers(x, `${path}/${k}`, v);
}
/** Every string in `v` with its path. */
function* strings(v: unknown, path = ''): Generator<{ path: string; s: string }> {
  if (typeof v === 'string') yield { path, s: v };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* strings(v[i], `${path}/${i}`);
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) yield* strings(x, `${path}/${k}`);
}

const isDataFile = (f: string) => f.endsWith('.json') && f !== 'sources.json' && f !== 'pending.json' && f !== 'schema.json';
const isDiluentFile = (f: string) => f.startsWith('diluents/');
const stem = (f: string) => f.replace(/^.*\//, '').replace(/\.json$/, '');

/**
 * §5's six rules over the layer's files (path relative to the formulary folder → parsed JSON): `sources.json`,
 * `pending.json`, `<drugId>.json`, `diluents/<id>.json`. `injectable` is the coverage target (rule 5).
 * Returns every broken rule; an empty list is a layer that may ship.
 */
export function checkFormulary(files: FormularyFiles, injectable: readonly string[] = injectableDrugIds()): FormularyProblem[] {
  const out: FormularyProblem[] = [];
  const no = (rule: FormularyProblem['rule'], file: string, path: string, why: string) => void out.push({ rule, file, path, why });
  const sources = (isObj(files['sources.json']) ? files['sources.json'] : {}) as Record<string, Obj>;
  if (!isObj(files['sources.json'])) no(2, 'sources.json', '/', 'sources.json is missing or not an object');

  // Rule 2: each source has its kind's required fields
  for (const [key, s] of Object.entries(sources)) {
    const kind = (isObj(s) ? s.kind : undefined) as SourceKind | undefined;
    if (!kind || !(kind in REQUIRED)) {
      no(2, 'sources.json', `/${key}`, `source "${key}" has no known kind (stabilis, trissel, monograph, study)`);
      continue;
    }
    const missing = REQUIRED[kind].filter((f) => !filled(s[f]));
    if (missing.length) no(2, 'sources.json', `/${key}`, `${kind} source "${key}" has no ${missing.join(', ')}`);
    if (kind === 'trissel' && filled(s.edition) && s.edition !== TRISSEL_EDITION) no(2, 'sources.json', `/${key}/edition`, `Trissel is cited as edition ${TRISSEL_EDITION} only (LQ5), not "${String(s.edition)}"`);
    if (kind === 'stabilis' && filled(s.retrieved) && !DATE.test(String(s.retrieved))) no(2, 'sources.json', `/${key}/retrieved`, 'the retrieval date is YYYY-MM-DD');
    if (kind === 'trissel' && filled(s.date) && !DATE.test(String(s.date))) no(2, 'sources.json', `/${key}/date`, "the reader's date is YYYY-MM-DD");
    if (kind === 'monograph' && filled(s.issuer) && !['DailyMed', 'EMC', 'department'].includes(String(s.issuer))) no(2, 'sources.json', `/${key}/issuer`, 'the issuer is DailyMed, EMC or department (LQ6)');
    if (kind === 'study' && !filled(s.doi) && !filled(s.pmid)) no(2, 'sources.json', `/${key}`, `study source "${key}" has neither a DOI nor a PMID`);
  }
  const kindOf = (src: unknown): SourceKind | undefined => (typeof src === 'string' && isObj(sources[src]) ? (sources[src].kind as SourceKind) : undefined);

  const filed = new Set<string>();
  for (const [file, data] of Object.entries(files)) {
    if (!isDataFile(file)) continue;
    if (!isObj(data)) {
      no(1, file, '/', 'not a JSON object');
      continue;
    }
    // Rule 5 (identity): the file is named after its id
    const id = isDiluentFile(file) ? data.diluentId : data.drugId;
    if (id !== stem(file)) no(5, file, '/', `the file's id "${String(id)}" is not its name "${stem(file)}"`);
    if (!isDiluentFile(file) && typeof id === 'string') filed.add(id);

    // Rule 1: every number sits in an object with a `src` (or one marked `gap`); every `src` resolves
    for (const n of numbers(data)) if (!n.owner || (!('src' in n.owner) && !('gap' in n.owner))) no(1, file, n.path, 'a number with no src beside it (nor a gap)');
    const cited = new Set<SourceKind>();
    for (const { o, path, key } of objects(data)) {
      if ('src' in o) {
        const k = kindOf(o.src);
        if (!k) no(1, file, `${path}/src`, `src "${String(o.src)}" is not in sources.json`);
        else cited.add(k);
      }
      // Rule 4: a gap names an owner question; it holds no number; it is refused where the bench needs the field
      if ('gap' in o) {
        if (typeof o.gap !== 'string' || !GAP_ID.test(o.gap)) no(4, file, `${path}/gap`, `gap "${String(o.gap)}" names no owner question (LQ1–LQ14)`);
        if ([...numbers(o)].length) no(4, file, path, 'a gap holds no number: a number needs its src');
        if (NO_GAP.has(key)) no(4, file, path, `"${key}" is required to deliver: it cannot be a gap`);
      }
    }

    // Rule 3: statements are sourced and cross-checked; `has` says which sources the file cites
    const has = data.has as Has | undefined;
    const flags = ['stabilis', 'trissel', 'monograph'] as const;
    if (!isObj(has) || flags.some((f) => typeof has[f] !== 'boolean')) no(3, file, '/has', 'every file has `has` with stabilis, trissel and monograph, each true or false');
    else for (const f of flags) if (has[f] !== cited.has(f)) no(3, file, `/has/${f}`, `has.${f} is ${has[f]} but the file ${cited.has(f) ? 'cites' : 'does not cite'} a ${f} source`);
    const statements: Array<{ o: unknown; path: string }> = [
      ...(Array.isArray(data.diluents) ? data.diluents : []).flatMap((d, i) => (isObj(d) && 'compat' in d ? [{ o: d.compat, path: `/diluents/${i}/compat` }] : [])),
      ...(Array.isArray(data.admixtures) ? data.admixtures : []).map((o, i) => ({ o, path: `/admixtures/${i}` })),
      ...(Array.isArray(data.stability) ? data.stability : []).map((o, i) => ({ o, path: `/stability/${i}` })),
    ];
    for (const { o, path } of statements) {
      if (!isObj(o)) {
        no(3, file, path, 'a statement is an object');
        continue;
      }
      // Per statement (§5: "where Stabilis has no statement and Trissel has one, Trissel's is used"): each statement
      // cites Stabilis, or Trissel for a fact Stabilis does not state, whatever the file's other statements cite.
      // Which source has the fact is read per statement, not from the file's `has.stabilis`.
      const k = kindOf(o.src);
      if (k !== 'stabilis' && k !== 'trissel') no(3, file, `${path}/src`, 'a statement cites Stabilis, the source of record, or Trissel where Stabilis has no statement for it');
      const cc = o.crossCheck;
      if (!isObj(cc) || !['agrees', 'differs', 'not listed'].includes(String(cc.trissel))) {
        no(3, file, `${path}/crossCheck`, 'a statement has crossCheck.trissel: agrees, differs or not listed');
        continue;
      }
      if (k === 'trissel') {
        // A Trissel-only statement carries its own Trissel source and page: the page it paraphrases, cross-checked
        // as itself. Its words stay a paraphrase (rule 6), never Trissel's text.
        if (!filled(sources[o.src as string]!.page)) no(3, file, `${path}/src`, `a statement taken from Trissel cites a Trissel page; "${String(o.src)}" has none`);
        if (cc.trissel !== 'agrees' || cc.src !== o.src) no(3, file, `${path}/crossCheck`, 'a statement taken from Trissel (Stabilis has none for it) carries its own Trissel source and page: crossCheck { trissel: "agrees", src: the statement\'s own Trissel key }');
        continue;
      }
      if (cc.trissel !== 'not listed' && kindOf(cc.src) !== 'trissel') no(3, file, `${path}/crossCheck/src`, "Trissel's reading cites a trissel source (edition and page)");
      if (cc.trissel === 'differs') {
        const r = cc.ruling;
        if (!isObj(r) || !filled(r.by) || !DATE.test(String(r.date)) || !['stabilis', 'trissel', 'monograph'].includes(String(r.follows))) no(3, file, `${path}/crossCheck/ruling`, '`differs` needs a ruling: by, date (YYYY-MM-DD), and which source the entry follows');
      }
    }

    // Rule 6: every string is short: a paraphrase, never a copied monograph
    for (const { path, s } of strings(data)) if (s.length > MAX_STATEMENT) no(6, file, path, `${s.length} characters: a statement is at most ${MAX_STATEMENT}, in our words`);
  }
  for (const { path, s } of strings(sources)) if (s.length > MAX_STATEMENT) no(6, 'sources.json', path, `${s.length} characters: at most ${MAX_STATEMENT}`);

  // Rule 5: files ∪ pending = the injectable ids, files ∩ pending = ∅
  const pendingRaw = files['pending.json'];
  const pending = Array.isArray(pendingRaw) ? pendingRaw : [];
  if (!Array.isArray(pendingRaw) || pending.some((p) => typeof p !== 'string')) no(5, 'pending.json', '/', 'pending.json is a list of drug ids');
  const want = new Set(injectable);
  const seen = new Set<string>();
  for (const p of pending as string[]) {
    if (seen.has(p)) no(5, 'pending.json', '/', `"${p}" is listed twice`);
    seen.add(p);
    if (!want.has(p)) no(5, 'pending.json', '/', `"${p}" is not an injectable drug of the library`);
    if (filed.has(p)) no(5, 'pending.json', '/', `"${p}" has a file and is still pending`);
  }
  for (const f of filed) if (!want.has(f)) no(5, `${f}.json`, '/', `"${f}" is not an injectable drug of the library`);
  for (const id of injectable) if (!filed.has(id) && !seen.has(id)) no(5, 'pending.json', '/', `"${id}" has no file and is not pending`);
  return out;
}

/** The typed layer, when every rule holds; else the broken rules. */
export function loadFormulary(files: FormularyFiles, injectable?: readonly string[]): { ok: true; formulary: Formulary } | { ok: false; problems: FormularyProblem[] } {
  const problems = checkFormulary(files, injectable);
  if (problems.length) return { ok: false, problems };
  const drugs: Record<string, DrugEntry> = {};
  const diluents: Record<string, DiluentEntry> = {};
  for (const [file, data] of Object.entries(files)) {
    if (!isDataFile(file)) continue;
    if (isDiluentFile(file)) diluents[stem(file)] = data as DiluentEntry;
    else drugs[stem(file)] = data as DrugEntry;
  }
  return { ok: true, formulary: { drugs, diluents, sources: files['sources.json'] as Record<string, Source>, pending: files['pending.json'] as string[] } };
}
