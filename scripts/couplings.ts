// The coupling registry's reader (docs/plans/mechanism-tree.md §4 D2, piece R1): resolves every row's constants in the
// code, computes each edge's honesty class from their tags, renders the "Couplings" section of the model pages, and
// keeps the list of census seams no row carries yet (packages/engine-core/src/couplings/unregistered.ts).
//   A constant `'<file>#<IDENT>'` resolves through scripts/model-docs.ts's extract() (value, unit, source/tag); an
//   exported non-numeric constant through its own comment; `'<file>#<TABLE>.<id>'` through that data row's `src`/`tag`.
//   The class (D2): ABSENT if the row is absent; else FIT if any constant's tags hold [FIT…]; else ENG if any holds
//   [ENG…]; else SOURCED if every constant (at least one) has a source the regular expression finds; else UNTAGGED.
//   The seam check: every census seam (scripts/coupling-seams.ts) is carried by a row's node, or is in the committed
//   unregistered list. The list may shrink and never grow — writing it refuses a seam that is not already listed.
//   node --experimental-strip-types scripts/couplings.ts          → rewrites unregistered.ts (dropping seams rows now carry)
//   node --experimental-strip-types scripts/couplings.ts --check  → exit 1 on a new seam without a row or a stale list
//   Both write modes also regenerate apps/demo/src/app/mechanisms/registry-data.ts, the mechanism-tree page's copy of
//   the rows with their computed classes and resolved constants (the browser cannot run extract()); --check fails when
//   it is stale, so the page never draws a class the code's tags no longer give.
//   node --experimental-strip-types scripts/couplings.ts --seed   → writes every uncovered seam (used once, by R1, to start
//                                                                    the list; a later use shows in review as the list growing)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, posix, resolve } from 'node:path';
import type * as TS from 'typescript';
import { census } from './coupling-seams.ts';
import { extract, leading, sourcesOf, trailing } from './model-docs.ts';
import { GLOSSARY, GLOSSARY_S9, KEY_LABELS, SHORT } from '../apps/demo/src/app/glossary-data.ts';
import { COUPLINGS, EFFECTORS, OBSERVABLES, TRIGGERS, UNREGISTERED, type ConstRef, type Coupling, type EdgeClass, type NodeRef } from '../packages/engine-core/src/couplings/index.ts';

const ts: typeof TS = createRequire(import.meta.url)('typescript');
const CORE = 'packages/engine-core/src/';
export const UNREGISTERED_FILE = `${CORE}couplings/unregistered.ts`;
const NONE = '—';

// ---------- constants ----------
export interface Resolved {
  ref: ConstRef;
  file: string; // repository path
  name: string; // IDENT or TABLE.id
  kind: 'numeric' | 'object' | 'row';
  value?: string;
  unit?: string;
  /** Sources and tags as model-docs.ts prints them ('—' for none). */
  source: string;
}

export function parseRef(ref: ConstRef): { file: string; ident: string; key?: string } {
  const [path, name] = ref.split('#') as [string, string];
  const [ident, key] = name.split('.') as [string, string | undefined];
  return { file: posix.normalize(posix.join(CORE, path)), ident, ...(key !== undefined ? { key } : {}) };
}

const textCache = new Map<string, string>();
const paramCache = new Map<string, ReturnType<typeof extract>['params']>();
function exportedDecl(sf: TS.SourceFile, ident: string): { st: TS.VariableStatement; d: TS.VariableDeclaration } | undefined {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !(ts.getCombinedModifierFlags(st as unknown as TS.Declaration) & ts.ModifierFlags.Export)) continue;
    const d = st.declarationList.declarations.find((x) => x.name.getText() === ident);
    if (d) return { st, d };
  }
  return undefined;
}
/** The object literal inside `init` whose `id` property is the string `key`. */
function rowLiteral(init: TS.Node, key: string): TS.ObjectLiteralExpression | undefined {
  let hit: TS.ObjectLiteralExpression | undefined;
  const visit = (n: TS.Node): void => {
    if (hit) return;
    if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'id' && ts.isStringLiteral(p.initializer) && p.initializer.text === key)) hit = n;
    else n.forEachChild(visit);
  };
  visit(init);
  return hit;
}
/** Every `src` and `tag` string of a data row (its effects included), as text the source regular expression reads. */
function rowSourceText(lit: TS.ObjectLiteralExpression): string {
  const srcs: string[] = [];
  const tags: string[] = [];
  const visit = (n: TS.Node): void => {
    if (ts.isPropertyAssignment(n) && ts.isStringLiteralLike(n.initializer)) {
      if (n.name.getText() === 'src') srcs.push(n.initializer.text);
      if (n.name.getText() === 'tag') tags.push(`[${n.initializer.text}]`);
    }
    n.forEachChild(visit);
  };
  visit(lit);
  return [...srcs, ...tags].join(' ');
}

/** The constant a reference names, or the reason it does not resolve. */
export function resolveConst(root: string, ref: ConstRef): Resolved | { ref: ConstRef; error: string } {
  const { file, ident, key } = parseRef(ref);
  let text = textCache.get(file);
  if (text === undefined) {
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      return { ref, error: `no file ${file}` };
    }
    textCache.set(file, text);
  }
  if (key === undefined) {
    let params = paramCache.get(file);
    if (!params) paramCache.set(file, (params = extract(root, [file]).params));
    const p = params.find((x) => x.name === ident);
    if (p) return { ref, file, name: ident, kind: 'numeric', value: p.value, unit: p.unit, source: p.source };
  }
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const decl = exportedDecl(sf, ident);
  if (!decl) return { ref, error: `${ident} is not an exported constant of ${file}` };
  if (key === undefined) {
    if (!decl.d.initializer || !ts.isObjectLiteralExpression(decl.d.initializer)) return { ref, error: `${ident} in ${file} is neither numeric nor an object` };
    return { ref, file, name: ident, kind: 'object', source: sourcesOf(`${leading(text, decl.st)} ${trailing(text, decl.st)}`) };
  }
  const lit = decl.d.initializer && rowLiteral(decl.d.initializer, key);
  if (!lit) return { ref, error: `no row with id '${key}' in ${ident} (${file})` };
  return { ref, file, name: `${ident}.${key}`, kind: 'row', source: sourcesOf(rowSourceText(lit)) };
}

// ---------- the class (D2) ----------
const TAG = /\[(?:ENG|FIT|P|TXT|VERIFY)[^\]]*\]/g;
const hasSource = (source: string) => source !== NONE && source.replace(TAG, '').replace(/[;\s]/g, '') !== '';
export function classify(row: Pick<Coupling, 'absent' | 'params'>, sources: readonly string[]): EdgeClass {
  if (row.absent) return 'ABSENT';
  if (sources.some((s) => /\[FIT\b/.test(s))) return 'FIT';
  if (sources.some((s) => /\[ENG\b/.test(s))) return 'ENG';
  if (sources.length > 0 && sources.every(hasSource)) return 'SOURCED';
  return 'UNTAGGED';
}

/** Every row with its resolved constants and computed class; throws on a constant that does not resolve. */
export function registry(root: string): { row: Coupling; consts: Resolved[]; cls: EdgeClass }[] {
  return COUPLINGS.map((row) => {
    const consts = row.params.map((r) => {
      const x = resolveConst(root, r);
      if ('error' in x) throw new Error(`coupling ${row.id}: ${x.error}`);
      return x;
    });
    return { row, consts, cls: classify(row, consts.map((c) => c.source)) };
  });
}

// ---------- the seam check ----------
const nodesOf = (row: Coupling): NodeRef[] => [...row.from, row.to, ...(row.blockedBy ? [row.blockedBy] : [])];
/** The census seams the rows carry. */
export function carriedSeams(rows: readonly Coupling[] = COUPLINGS): Set<string> {
  return new Set(rows.flatMap((r) => nodesOf(r).flatMap((n) => n.seams ?? [])));
}
export function seamKeys(root: string): string[] {
  return census(root).seams.map((s) => `${s.module} ${s.kind} ${s.field}`);
}
/**
 * The census seams no row carries (`uncovered`), against the committed list: `grown` are uncovered seams the list
 * does not hold (a new seam without a row: fails), `shrunk` are listed seams a row now carries or the census no longer
 * has (regenerate to drop them), `unknown` are row seams the census does not list (a typo in a row: fails).
 */
export function seamCheck(root: string, listed: readonly string[] = UNREGISTERED) {
  const keys = seamKeys(root);
  const carried = carriedSeams();
  const uncovered = keys.filter((k) => !carried.has(k));
  const all = new Set(keys);
  return {
    uncovered,
    grown: uncovered.filter((k) => !listed.includes(k)),
    shrunk: listed.filter((k) => !uncovered.includes(k)),
    unknown: [...carried].filter((k) => !all.has(k)),
  };
}
export function renderUnregistered(list: readonly string[]): string {
  return [
    '// GENERATED by scripts/couplings.ts; do not edit by hand except to REMOVE a seam a new row now carries.',
    '// The census seams (docs/model/couplings-census.md) that no coupling row names yet. The list may shrink and never',
    '// grow: a new seam needs a row (scripts/couplings.ts --check fails otherwise).',
    'export const UNREGISTERED: readonly string[] = [',
    ...list.map((k) => `  '${k.replace(/'/g, "\\'")}',`),
    '];',
    '',
  ].join('\n');
}

// ---------- the model pages' section ----------
const byKey = new Map<string, { label: string; n: number }>();
for (const e of [...GLOSSARY_S9, ...GLOSSARY]) for (const k of e.keys) if (!/[#*<]/.test(k) && !byKey.has(k)) byKey.set(k, { label: e.label, n: e.n });
const declared = new Map<string, string>([...TRIGGERS, ...EFFECTORS, ...OBSERVABLES].map((d) => [d.path, d.label]));
/** A node's label: the glossary's for an exact key (the app's own label), the declaration's, else none. */
export function labelOf(path: string): string | undefined {
  const g = byKey.get(path);
  if (g) return KEY_LABELS[path] ?? SHORT[g.n] ?? g.label;
  return declared.get(path);
}
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const node = (n: NodeRef) => {
  const l = labelOf(n.path);
  return `\`${n.path}\`${l ? ` (${l})` : ''}`;
};
const constCell = (c: Resolved) => `\`${c.name}\`${c.value !== undefined ? ` = ${c.value}` : ''}`;
const CLASSES: EdgeClass[] = ['SOURCED', 'FIT', 'ENG', 'UNTAGGED', 'ABSENT'];

/** The "Couplings" section of a module page (empty when the module has no row). */
export function couplingsSection(root: string, module: string): string[] {
  const mine = registry(root).filter((x) => x.row.module === module);
  if (!mine.length) return [];
  const count = (k: EdgeClass) => mine.filter((x) => x.cls === k).length;
  const timing = (r: Coupling) => [r.delay && `delay \`${r.delay.split('#')[1]}\``, r.tau && `τ \`${r.tau.split('#')[1]}\``, r.saturation && `saturates at \`${r.saturation.split('#')[1]}\``, r.blockedBy && `blocked by \`${r.blockedBy.path}\``].filter(Boolean).join('; ');
  return [
    '## Couplings',
    '',
    `Generated from the coupling registry (\`packages/engine-core/src/couplings/\`, docs/plans/mechanism-tree.md piece R1): ${mine.length} rows; ${CLASSES.map((k) => `${k} ${count(k)}`).join(', ')}.`,
    'The class is computed from the tags of the constants each row names (FIT before ENG before SOURCED; UNTAGGED when a row names no',
    'constant or one without a source; ABSENT when the engine does not have the mechanism, with the research/44 finding).',
    '',
    '| Id | From → to | Sign · form | Class | Constants | Timing, limits | Note |',
    '|---|---|---|---|---|---|---|',
    ...mine.map(({ row: r, consts, cls }) =>
      `| \`${r.id}\` | ${r.from.map(node).join(', ')} → ${node(r.to)} | ${r.sign} · ${r.form} | ${cls}${r.absent ? ` (${r.absent})` : ''} | ${consts.map(constCell).join(', ') || NONE} | ${timing(r) || NONE} | ${cell(r.note)} |`),
    '',
  ];
}

// ---------- the mechanism-tree page's data (docs/plans/mechanism-tree.md piece T1) ----------
export const TREE_FILE = 'apps/demo/src/app/mechanisms/registry-data.ts';
/** The `[` that opens a confidence tag in a copied source string, written as `\u005b` in the generated file: the copy is
 *  not a second marker (scripts/ci/markers.mjs scans apps/ and would count each tag twice, and fail on a data row's
 *  `tag: 'ENG'` read out as `[ENG]`). The string's value at run time is unchanged. */
const MARKER_OPEN = /\[(?=(?:ENG|FIT|P|TXT|VERIFY)\b)/g;
/** The rows as the page reads them: ids, nodes, sign, form, timing names, the computed class and each constant's
 *  value, unit and source as resolved here; the declared nodes' kinds and labels. One row per line, so a diff reads. */
export function renderTreeData(root: string): string {
  const name = (r?: ConstRef) => r?.split('#')[1];
  const kinds = new Map<string, string>();
  for (const r of COUPLINGS) for (const n of nodesOf(r)) kinds.set(n.path, n.kind);
  const decl = new Map<string, { label: string; absent?: string }>([...TRIGGERS, ...EFFECTORS, ...OBSERVABLES].map((d) => [d.path, { label: d.label, ...('absent' in d && d.absent ? { absent: d.absent } : {}) }]));
  const nodes = [...kinds].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([path, kind]) => JSON.stringify({ path, kind, ...decl.get(path) }));
  const rows = registry(root).map(({ row: r, consts, cls }) => JSON.stringify({
    id: r.id, module: r.module, from: r.from.map((n) => n.path), to: r.to.path, sign: r.sign, form: r.form, cls,
    ...(r.absent ? { absent: r.absent } : {}),
    ...(r.delay ? { delay: name(r.delay) } : {}), ...(r.tau ? { tau: name(r.tau) } : {}), ...(r.saturation ? { saturation: name(r.saturation) } : {}),
    ...(r.blockedBy ? { blockedBy: r.blockedBy.path } : {}),
    consts: consts.map((c) => ({ name: c.name, ...(c.value !== undefined ? { value: c.value } : {}), ...(c.unit ? { unit: c.unit } : {}), source: c.source })),
    note: r.note,
  }).replace(MARKER_OPEN, '\\u005b'));
  return [
    '// GENERATED by scripts/couplings.ts from the coupling registry (packages/engine-core/src/couplings/); do not edit.',
    "// Each row's class is computed from its constants' tags in the code (D2); a constant's value, unit and source are read",
    '// from the code. The mechanism-tree page (views/mechanisms.ts) draws from this file.',
    "import type { TreeData } from './graph.ts';",
    '',
    'export const REGISTRY: TreeData = {',
    `  triggers: [\n${TRIGGERS.map((t) => `    ${JSON.stringify({ path: t.path, label: t.label })},`).join('\n')}\n  ],`,
    `  nodes: [\n${nodes.map((n) => `    ${n},`).join('\n')}\n  ],`,
    `  rows: [\n${rows.map((r) => `    ${r},`).join('\n')}\n  ],`,
    '};',
    '',
  ].join('\n');
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const r = seamCheck(root);
  registry(root); // every constant resolves, or this throws
  const seed = process.argv.includes('--seed');
  if ((r.grown.length && !seed) || r.unknown.length) {
    for (const k of r.grown) console.error(`couplings: new seam without a row: ${k} (add a coupling row that carries it)`);
    for (const k of r.unknown) console.error(`couplings: a row names a seam the census does not list: ${k}`);
    process.exit(1);
  }
  const page = renderUnregistered(seed ? r.uncovered : UNREGISTERED.filter((k) => r.uncovered.includes(k)));
  const stale = readFileSync(join(root, UNREGISTERED_FILE), 'utf8') !== page;
  const tree = renderTreeData(root);
  let treeStale = true;
  try {
    treeStale = readFileSync(join(root, TREE_FILE), 'utf8') !== tree;
  } catch { /* not written yet */ }
  if (process.argv.includes('--check')) {
    if (stale) console.error(`couplings: stale ${UNREGISTERED_FILE} (${r.shrunk.length} seams now carried); run node --experimental-strip-types scripts/couplings.ts`);
    if (treeStale) console.error(`couplings: stale ${TREE_FILE}; run node --experimental-strip-types scripts/couplings.ts`);
    if (stale || treeStale) process.exit(1);
  } else {
    if (stale) writeFileSync(join(root, UNREGISTERED_FILE), page);
    if (treeStale) writeFileSync(join(root, TREE_FILE), tree);
  }
  console.error(`couplings: ${COUPLINGS.length} rows; ${r.uncovered.length} of ${r.uncovered.length + carriedSeams().size} seams unregistered`);
}
