// The model documentation: docs/model/<module>.md, one page per module of scripts/model-modules.ts, plus
// docs/model/README.md (the index). GENERATED from the code, except the blocks between
//   <!-- hand:<name> -->  …  <!-- /hand:<name> -->
// which are written by people and carried over verbatim on every regeneration (a block missing from the page is
// seeded once, from the code where a seed exists, and is never overwritten after that).
// Generated, per page: the source files (with the first sentence of each file's header comment), the state (every exported *State type
// in the module, field by field, with its comment), the relations written as equations in the code comments, the
// parameters (every exported numeric constant: value, unit, source/tag, comment), the module's data rows (drugs, lung
// conditions, rhythms, …), its known misses (scripts/known-misses.ts) and its tests (counts per file).
// Hand-written: purpose, equations in words, related documents.
//   node --experimental-strip-types scripts/model-docs.ts          → writes docs/model/*.md
//   node --experimental-strip-types scripts/model-docs.ts --check  → exit 1 if a committed page is stale
// packages/validation/test/model-docs.test.ts runs the same check.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type * as TS from 'typescript';
import { failsTitles, skippedTitles, testFiles } from './deviations.ts';
import { listMisses, missRows } from './known-misses.ts';
import { MODULES, type ModelModule, moduleOfSource, ownerOfTest } from './model-modules.ts';

const ts: typeof TS = createRequire(import.meta.url)('typescript');
const NONE = '—';
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim() || NONE;

function walk(root: string, dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, join(dir, e.name)) : [join(dir, e.name)]));
}

/** The module's own source files: under one of its prefixes and not claimed by a longer prefix of another module. */
export function sourceFiles(root: string, m: ModelModule): string[] {
  return [...new Set(m.src.flatMap((s) => (s.endsWith('/') ? walk(root, s.slice(0, -1)) : existsSync(join(root, s)) ? [s] : [])))]
    .filter((f) => /\.ts$/.test(f) && !/\.(test|d)\.ts$/.test(f) && moduleOfSource(f) === m)
    .sort();
}

// ---------- comments ----------
const clean = (c: string) =>
  c
    .replace(/^\/\*\*?|\*\/$/g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*(\*|\/\/)\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
function leading(text: string, node: TS.Node): string {
  return (ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []).map((r) => clean(text.slice(r.pos, r.end))).join(' ');
}
function trailing(text: string, node: TS.Node): string {
  const lineEnd = text.indexOf('\n', node.getEnd());
  const rest = text.slice(node.getEnd(), lineEnd < 0 ? undefined : lineEnd);
  const i = rest.indexOf('//');
  return i < 0 ? '' : rest.slice(i + 2).trim();
}
/** The first sentence of a file's header comment, skipping a licence/provenance paragraph (SPDX, NOTICE-ID). */
function headerSentence(text: string): string {
  const block = (text.match(/^(?:\s*\/\/.*\n)+/) ?? [''])[0];
  const paras = block.split(/^\s*\/\/\s*$/m).filter((p) => !/SPDX-|NOTICE-ID|Portions derived|Copyright/.test(p));
  const flat = clean(paras.join('\n'));
  const m = flat.match(/^(.{20,}?\.)(\s|$)/);
  return (m?.[1] ?? flat).slice(0, 220);
}

// ---------- units and sources ----------
const UNIT_SUFFIX: [RegExp, string][] = [
  [/_MMHG_S_ML$/, 'mmHg·s/mL'], [/_ML_MMHG$/, 'mL/mmHg'], [/_MMHG$/, 'mmHg'], [/_CMH2O$/, 'cmH2O'], [/_ML_KG_MIN$/, 'mL/kg/min'],
  [/_ML_KG$/, 'mL/kg'], [/_ML_S$/, 'mL/s'], [/_ML_MIN$/, 'mL/min'], [/_L_MIN$|_LPM$/, 'L/min'], [/_ML$/, 'mL'], [/_PER_S$/, '/s'],
  [/_PER_MIN$/, '/min'], [/_PER_H$/, '/h'], [/_BPM$/, '/min'], [/_MS$/, 'ms'], [/_S$/, 's'], [/_HZ$/, 'Hz'], [/_KG$/, 'kg'],
  [/_PCT$/, '%'], [/_MMOL$/, 'mmol'], [/_G_DL$/, 'g/dL'], [/_KPA$/, 'kPa'],
]; // not _MIN, _C, _H: they also mean "minimum", "compliance/coefficient", "high" in this code
const UNIT_WORD = /^(?:mmHg|cmH2O|mL|L|dL|s|ms|min|h|Hz|kg|g|mg|µg|ng|mmol|mEq|mOsm|°C|K|kPa|bpm|%|W|J|mV|µV|dyn|WU|cm²?|m²|U|IU|mU|µU|pmol|nmol|\/s|\/min|\/h|\/mL|\/mmHg|\/cmH2O)(?:[·\/^]?(?:mmHg|cmH2O|mL|L|dL|s|ms|min|h|kg|g|mg|µg|mmol|mEq|mOsm|cm|m²|cm⁵|\d|−\d|-\d))*\b/;
const TAG_RE = /\[(?:ENG|P|TXT|VERIFY)[^\]]*\]/g;
const SOURCE_RE =
  /\b[A-Z][A-Za-z'’-]+(?:\s(?:&|and)\s[A-Z][A-Za-z'’-]+|\set al\.?)?,?\s(?:19|20)\d\d[a-z]?\b|\b(?:tables?|annex|catalogue|brief|research|B)\s?\/?\s?§\s?[\w.]+|\bresearch\/?\s?\d+[\w §.]*|\bPulse(?: CFG)?\b[\w –-]*|\b(?:M10|Miller|Guyton|Nunn|West|Kaplan|Braunwald)\b[^;,)]*|\bDI-\d+[a-z]?\b/g;

function unitOf(name: string, comment: string): string {
  const c = comment.replace(/^[\s(]+/, '');
  const w = c.match(UNIT_WORD);
  if (w && (c.length === w[0].length || /^[\s,;.)(]/.test(c.slice(w[0].length)))) return w[0];
  for (const [re, u] of UNIT_SUFFIX) if (re.test(name)) return u;
  return NONE;
}
function sourcesOf(text: string): string {
  const tags = [...new Set(text.match(TAG_RE) ?? [])];
  const srcs = [...new Set((text.match(SOURCE_RE) ?? []).map((s) => s.trim()))];
  return [...srcs, ...tags].join('; ') || NONE;
}

// ---------- AST extraction ----------
export interface Param { file: string; name: string; value: string; unit: string; source: string; note: string }
export interface Field { type: string; name: string; tsType: string; note: string; file: string }
export interface Relation { file: string; line: number; text: string }
export interface Fn { file: string; name: string; note: string }

const NUMERIC_INIT = /^[-+\d.\s*/()e_]+$|^-?\d[\d_]*(\.\d+)?(e-?\d+)?$/i;
const EQUATION_RE = /(?:^|\s)[A-Za-zΔτθαβγλσ_][\w·′()]*\s?=\s?[^=]*?(?:[·×÷^√∑∫∝]|\s[+−*/-]\s|\w\/\w|e\^)|\S\s?∝\s?\S/;

export function extract(root: string, files: string[]) {
  const params: Param[] = [];
  const fields: Field[] = [];
  const relations: Relation[] = [];
  const fns: Fn[] = [];
  for (const f of files) {
    const text = readFileSync(join(root, f), 'utf8');
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true);
    let section = '';
    // section headers `// --- name (sources) ---` apply to the constants below them
    const sections = [...text.matchAll(/^\/\/\s*-{2,}\s*(.+?)\s*-{2,}\s*$/gm)].map((m) => ({ at: m.index, text: m[1] as string }));
    for (const st of sf.statements) {
      section = sections.filter((s) => s.at < st.getStart()).pop()?.text ?? '';
      const exported = (ts.getCombinedModifierFlags(st as unknown as TS.Declaration) & ts.ModifierFlags.Export) !== 0;
      if (!exported) continue;
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          const init = d.initializer?.getText() ?? '';
          if (!NUMERIC_INIT.test(init.replace(/\s+as\s+const$/, ''))) continue;
          const lead = leading(text, st);
          const tail = trailing(text, st);
          const name = d.name.getText();
          params.push({ file: f, name, value: init.replace(/_/g, ''), unit: unitOf(name, tail || lead), source: sourcesOf(`${lead} ${tail}`) !== NONE ? sourcesOf(`${lead} ${tail}`) : sourcesOf(section), note: [lead, tail].filter(Boolean).join(' ') });
        }
      } else if ((ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) && /State$/.test(st.name.text)) {
        const members = ts.isInterfaceDeclaration(st) ? st.members : ts.isTypeLiteralNode(st.type) ? st.type.members : undefined;
        for (const mm of members ?? []) {
          if (!mm.name) continue;
          const tsType = ts.isPropertySignature(mm) && mm.type ? mm.type.getText().replace(/\s+/g, ' ') : NONE;
          fields.push({ type: st.name.text, name: mm.name.getText(), tsType: tsType.length > 60 ? tsType.slice(0, 57) + '…' : tsType, note: [leading(text, mm), trailing(text, mm)].filter(Boolean).join(' '), file: f });
        }
      } else if (ts.isFunctionDeclaration(st) && st.name) {
        fns.push({ file: f, name: st.name.text, note: (leading(text, st).match(/^(.{10,}?[.;:])(\s|$)/)?.[1] ?? leading(text, st)).slice(0, 200) });
      }
    }
    // relations: comment lines that write an equation (a = b · c, x ∝ y)
    text.split('\n').forEach((l, i) => {
      const c = l.match(/(?:\/\/|^\s*\*|\/\*\*?)\s?(.*)$/);
      if (c && EQUATION_RE.test(c[1] as string) && !/https?:|import |eslint/.test(l)) relations.push({ file: f, line: i + 1, text: (c[1] as string).replace(/\*\/\s*$/, '').trim() });
    });
  }
  return { params, fields, relations, fns };
}

// ---------- data rows (module-specific tables read at runtime) ----------
type Rows = { title: string; head: string[]; rows: string[][] };
const imp = (root: string, p: string) => import(pathToFileURL(join(root, p)).href);
const DATA: Record<string, (root: string) => Promise<Rows[]>> = {
  'patient-state': async (root) => {
    const file = 'packages/engine-core/src/l1/state.ts';
    const { STATE_SCHEMA } = await imp(root, file);
    const notes = new Map([...readFileSync(join(root, file), 'utf8').matchAll(/^\s*(\w+): \{[^}]*\},?\s*\/\/\s*(.*)$/gm)].map((m) => [m[1], m[2]]));
    type Spec = { def: number; min: number; max: number; manual: string };
    return [{ title: `State variables (\`STATE_SCHEMA\`, ${Object.keys(STATE_SCHEMA).length}; \`${file}\`)`, head: ['Variable', 'Default', 'Min', 'Max', 'In MANUAL', 'Comment'], rows: Object.entries(STATE_SCHEMA as Record<string, Spec>).map(([id, v]) => [`\`${id}\``, String(v.def), String(v.min), String(v.max), v.manual, notes.get(id) ?? NONE]) }];
  },
  pharmacology: async (root) => {
    const { DRUGS, DRUG_IDS } = await imp(root, 'packages/engine-core/src/l2/pk/data/drugs.ts');
    const pk = (r: { pk: { kind: string; model?: string } }) => (r.pk.kind === 'model' ? r.pk.model : r.pk.kind) ?? NONE;
    return [{ title: `Drug rows (${DRUG_IDS.length}; \`packages/engine-core/src/l2/pk/data/\`)`, head: ['Id', 'Name', 'Class', 'PK', 'Source', 'Tag'], rows: DRUG_IDS.map((id: string) => { const r = DRUGS[id]; return [`\`${id}\``, r.name, r.cls, pk(r), r.src, r.tag]; }) }];
  },
  lungs: async (root) => {
    const { LUNG_CONDITIONS } = await imp(root, 'packages/engine-core/data/lung-pathology.ts');
    type Eff = { key: string; src?: string; tag?: string };
    return [{ title: `Lung conditions (${LUNG_CONDITIONS.length}; \`packages/engine-core/data/lung-pathology.ts\`)`, head: ['Id', 'Condition', 'Effects', 'Tags'], rows: LUNG_CONDITIONS.map((c: { id: string; label: string; effects: Eff[] }) => [`\`${c.id}\``, c.label, c.effects.map((e) => e.key).join(', '), [...new Set(c.effects.map((e) => e.tag ?? '?'))].join(', ')]) }];
  },
  'rhythms-ecg': async (root) => {
    const { RHYTHMS, RHYTHM_IDS } = await imp(root, 'packages/engine-core/src/l2/ecg/rhythms.ts');
    return [{ title: `Rhythms (${RHYTHM_IDS.length}; \`packages/engine-core/src/l2/ecg/rhythms.ts\`)`, head: ['Id', 'Group', 'Atria', 'AV', 'Rate range (/min)', 'Default (/min)'], rows: RHYTHM_IDS.map((id: string) => { const r = RHYTHMS[id]; return [`\`${id}\``, r.group, r.atria, r.av, r.rateRange ? r.rateRange.join('–') : NONE, String(r.defaultRateBpm ?? NONE)]; }) }];
  },
  circulation: async (root) => {
    const { CIRC_CONDITIONS } = await imp(root, 'packages/engine-core/src/l2/circ/conditions.ts');
    return [{ title: 'Circulation conditions (`packages/engine-core/src/l2/circ/conditions.ts`)', head: ['Id'], rows: [...CIRC_CONDITIONS].map((id: string) => [`\`${id}\``]) }];
  },
  blood: async (root) => {
    const { FLUIDS } = await imp(root, 'packages/engine-core/src/l2/blood/params.ts');
    const keys = Object.keys(Object.values(FLUIDS)[0] as object);
    return [{ title: 'Fluids (`FLUIDS`, mmol/L unless the key says otherwise)', head: ['Fluid', ...keys], rows: Object.entries(FLUIDS).map(([id, f]) => [`\`${id}\``, ...keys.map((k) => String((f as Record<string, number>)[k]))]) }];
  },
};

// ---------- tests ----------
const TEST_CALL = /^\s*(?:it|test)(?:\.(?:fails|skip|todo|only|concurrent|each\([^)]*\)|skipIf\([^)]*\)|runIf\([^)]*\)))*\s*\(/gm;
export function testsOf(root: string, m: ModelModule) {
  return testFiles(root)
    .map((abs) => relative(root, abs))
    .filter((f) => ownerOfTest(f).module === m)
    .map((f) => {
      const t = readFileSync(join(root, f), 'utf8');
      return { file: f, tests: (t.match(TEST_CALL) ?? []).length, fails: failsTitles(t).length, skipped: skippedTitles(t).length };
    });
}

// ---------- hand blocks ----------
const HAND_RE = /<!-- hand:([\w-]+) -->\n([\s\S]*?)<!-- \/hand:\1 -->/g;
export function handBlocks(page: string): Map<string, string> {
  return new Map([...page.matchAll(HAND_RE)].map((m) => [m[1] as string, m[2] as string]));
}
const hand = (blocks: Map<string, string>, name: string, seed: string) => `<!-- hand:${name} -->\n${blocks.get(name) ?? seed.trimEnd() + '\n'}<!-- /hand:${name} -->`;

const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)];
const link = (f: string) => `[\`${f.replace(/^packages\/[^/]+\/(src|test)\//, '')}\`](../../${f})`;

export async function renderPage(root: string, m: ModelModule, old: string): Promise<string> {
  const blocks = handBlocks(old);
  const files = sourceFiles(root, m);
  const { params, fields, relations, fns } = extract(root, files);
  const misses = listMisses(root).filter((x) => x.module === m);
  const tests = testsOf(root, m);
  const entry = files.find((f) => /\/(pipeline|model|index|engine)\.ts$/.test(f)) ?? files[0];
  const seedPurpose = entry ? `${clean((readFileSync(join(root, entry), 'utf8').match(/^(?:\s*\/\/.*\n)+/) ?? [''])[0])}\n\n_(Seeded from the header of \`${entry}\`; rewrite as the module's purpose.)_` : '_Not written yet._';
  const lines = files.reduce((n, f) => n + readFileSync(join(root, f), 'utf8').split('\n').length, 0);
  const out: string[] = [
    `# ${m.title}`,
    '',
    '<!-- GENERATED by scripts/model-docs.ts from the code. Edit only inside the hand:… blocks; regenerate with',
    '     node --experimental-strip-types scripts/model-docs.ts -->',
    '',
    `[All modules](README.md) · [Known misses](../validation/known-misses.md#${m.id}) · ${files.length} source files, ${lines} lines · ${tests.length} test files`,
    '',
    '## Purpose',
    '',
    hand(blocks, 'purpose', seedPurpose),
    '',
    '## Equations in words',
    '',
    hand(blocks, 'equations', '_Not written yet: describe the module\'s relations in words, citing the source of each._'),
    '',
  ];
  if (relations.length) out.push('### Relations written in the code comments', '', ...table(['Where', 'Relation'], relations.map((r) => [`[\`${r.file.split('/').pop()}:${r.line}\`](../../${r.file}#L${r.line})`, r.text])), '');
  out.push('## State', '');
  if (fields.length) {
    for (const type of [...new Set(fields.map((x) => x.type))]) {
      const mine = fields.filter((x) => x.type === type);
      out.push(`### \`${type}\` (${link(mine[0]!.file)})`, '', ...table(['Field', 'Type', 'Meaning'], mine.map((x) => [`\`${x.name}\``, `\`${x.tsType}\``, x.note])), '');
    }
  } else out.push('No exported `…State` type in this module.', '');
  out.push('## Parameters', '');
  if (params.length) {
    for (const f of [...new Set(params.map((p) => p.file))]) {
      out.push(`### ${link(f)}`, '', ...table(['Name', 'Value', 'Unit', 'Source / tag', 'Comment'], params.filter((p) => p.file === f).map((p) => [`\`${p.name}\``, `\`${p.value}\``, p.unit, p.source, p.note])), '');
    }
  } else out.push('No exported numeric constants.', '');
  for (const rows of (await DATA[m.id]?.(root)) ?? []) out.push(`### ${rows.title}`, '', ...table(rows.head, rows.rows), '');
  const documented = fns.filter((x) => x.note);
  if (fns.length) {
    out.push('## Functions', '');
    if (documented.length) out.push(...table(['Function', 'File', 'Doc'], documented.map((x) => [`\`${x.name}\``, link(x.file), x.note])), '');
    const bare = fns.filter((x) => !x.note);
    if (bare.length) out.push(`Exported without a doc comment: ${bare.map((x) => `\`${x.name}\``).join(', ')}.`, '');
  }
  out.push('## Source files', '', ...table(['File', 'Lines', 'Header'], files.map((f) => { const t = readFileSync(join(root, f), 'utf8'); return [link(f), String(t.split('\n').length), headerSentence(t)]; })), '');
  out.push('## Known misses', '');
  out.push(...(misses.length ? missRows(misses, '../../') : ['None recorded.']), '');
  out.push('## Tests', '');
  out.push(
    tests.length
      ? `${tests.reduce((n, t) => n + t.tests, 0)} tests in ${tests.length} files; ${tests.reduce((n, t) => n + t.fails, 0)} expected failures, ${tests.reduce((n, t) => n + t.skipped, 0)} skipped.`
      : 'No test file is owned by this module.',
    '',
  );
  if (tests.length) out.push(...table(['File', 'Tests', 'Expected failures', 'Skipped'], tests.map((t) => [link(t.file), String(t.tests), String(t.fails), String(t.skipped)])), '');
  out.push('## Related documents', '', hand(blocks, 'related', '_Not written yet: the design-brief sections and parameter tables this module implements._'), '');
  return out.join('\n');
}

export function renderIndex(root: string): string {
  const misses = listMisses(root);
  return [
    '# The model, module by module',
    '',
    '<!-- GENERATED by scripts/model-docs.ts; do not edit. -->',
    '',
    'One page per module of the engine. Each page is generated from the code (state, parameters, data rows, tests,',
    'known misses); its purpose, equations in words and related documents are written by hand and kept across',
    'regenerations. The list of known misses across modules is [known-misses.md](../validation/known-misses.md).',
    '',
    ...table(['Module', 'Source files', 'Test files', 'Known misses'], MODULES.map((m) => [`[${m.title}](${m.id}.md)`, String(sourceFiles(root, m).length), String(testsOf(root, m).length), String(misses.filter((x) => x.module === m).length)])),
    '',
  ].join('\n');
}

export async function renderAll(root: string): Promise<Map<string, string>> {
  const pages = new Map<string, string>([['docs/model/README.md', renderIndex(root)]]);
  for (const m of MODULES) {
    const path = `docs/model/${m.id}.md`;
    const old = existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';
    pages.set(path, await renderPage(root, m, old));
  }
  return pages;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const pages = await renderAll(root);
  const stale = [...pages].filter(([p, text]) => !existsSync(join(root, p)) || readFileSync(join(root, p), 'utf8') !== text).map(([p]) => p);
  if (process.argv.includes('--check')) {
    if (stale.length) {
      console.error(`model-docs: stale ${stale.join(', ')}; run node --experimental-strip-types scripts/model-docs.ts`);
      process.exit(1);
    }
  } else {
    mkdirSync(join(root, 'docs/model'), { recursive: true });
    for (const [p, text] of pages) writeFileSync(join(root, p), text);
  }
  console.error(`model-docs: ${pages.size} pages, ${stale.length} changed`);
}
