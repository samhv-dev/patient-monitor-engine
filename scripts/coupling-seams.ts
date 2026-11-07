// The census of the engine's coupling seams (docs/plans/mechanism-tree.md, piece R0): every place one module of
// scripts/model-modules.ts hands a value to another, listed mechanically from the TypeScript AST (the reading style of
// scripts/model-docs.ts), so the coupling registry's schema and rows (pieces R1–R2) are sized from a count, not a guess.
// Four kinds of seam, each a row  module · kind · field · file:line :
//   ctx        each property of each context object built in engine.ts's pass (the `advance` method): an object literal
//              argument of a call to another module's function, directly, through a local const, or as the object
//              returned by a builder (`this.pkCtx(ps)`, `rhythmCtx(ps)`); module = the CALLEE's (the reader); field =
//              <the local or builder, else the callee>.<property>, so one builder shared by two calls is one seam;
//   ext        each write of a circulation `ext` field (`….ext.F = …`) outside the circulation module; module = the writer;
//   endo-write each target an endocrine writer called in the pass (`writeCirc`, `writeBlood`, …) assigns, other than its
//              own EndoState and the `ext` fields above; module = endocrine-thermal (the writer);
//   bus-read   each DrugBus field (`bus.F`, `bus.F.sub`; types-pk.ts) read outside the pharmacology module; module = the reader.
// Rows are de-duplicated on (module, kind, field), keeping the first site; `sites` counts every site.
// Also measured, from the same reading: the EFFECTOR expressions — the right-hand side of an assignment, a const or a
// return (a function's or an arrow's value) whose top operator is a product (* /) or a sum (+ −), flattened over the same
// operator (parentheses dropped) — with their factor counts, and per
// module the exported numeric constants (model-docs.ts's `extract()`) that sit inside one of the module's own effector
// expressions: a lower bound on the intra-module rows the registry needs.
//   node --experimental-strip-types scripts/coupling-seams.ts          → writes docs/model/couplings-census.md (places as
//                                                                         file#function, so a moved line leaves it current)
//   node --experimental-strip-types scripts/coupling-seams.ts --check  → exit 1 if the committed page is stale
//   node --experimental-strip-types scripts/coupling-seams.ts --json   → the census as JSON, with each row's line
// packages/validation/test/coupling-seams.test.ts pins the counting on a fixture and the real list's shape;
// packages/validation/test/model-docs.test.ts fails when the committed page is stale.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, resolve } from 'node:path';
import type * as TS from 'typescript';
import { extract, sourceFiles } from './model-docs.ts';
import { MODULES, moduleOfSource } from './model-modules.ts';

const ts: typeof TS = createRequire(import.meta.url)('typescript');

export type SeamKind = 'ctx' | 'ext' | 'endo-write' | 'bus-read';
/** `fn`: the named function the seam sits in — the page keys on file#fn (stable); `line` is in the JSON output only. */
export interface Seam { module: string; kind: SeamKind; field: string; file: string; fn: string; line: number; sites: number }
export interface Effector { module: string; file: string; fn: string; line: number; lhs: string; op: 'product' | 'sum'; factors: number; consts: string[] }

export const ENGINE = 'packages/engine-core/src/engine.ts';
const BUS_TYPE = 'packages/engine-core/src/types-pk.ts';
const ENDO = 'endocrine-thermal';

const parse = (file: string, text: string) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const lineOf = (n: TS.Node) => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;
const modOf = (file: string) => moduleOfSource(file)?.id;
/** The innermost NAMED function a node sits in (a declaration, a method, or a function bound to a const or property). */
function where(n: TS.Node): string {
  for (let f: TS.Node | undefined = n; f; f = f.parent)
    if (ts.isFunctionDeclaration(f) || ts.isMethodDeclaration(f) || ts.isArrowFunction(f) || ts.isFunctionExpression(f)) {
      const named = 'name' in f && f.name ? f.name : ts.isVariableDeclaration(f.parent) || ts.isPropertyAssignment(f.parent) ? f.parent.name : undefined;
      if (named) return named.getText();
    }
  return '(top level)';
}
function visit(n: TS.Node, f: (n: TS.Node) => void): void {
  f(n);
  n.forEachChild((c) => visit(c, f));
}
/** Parentheses, `as`, `!` and `satisfies` stripped. */
function bare(e: TS.Expression): TS.Expression {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  return e;
}
/** Imported identifier → the repository path of the module it comes from (relative specifiers only). */
function imports(sf: TS.SourceFile, file: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.moduleSpecifier.text.startsWith('.')) continue;
    const path = posix.normalize(posix.join(posix.dirname(file), st.moduleSpecifier.text));
    const b = st.importClause?.namedBindings;
    if (b && ts.isNamedImports(b)) for (const el of b.elements) out.set(el.name.text, path);
    if (st.importClause?.name) out.set(st.importClause.name.text, path);
  }
  return out;
}
function dedupe(rows: Omit<Seam, 'sites'>[]): Seam[] {
  const by = new Map<string, Seam>();
  for (const r of rows) {
    const k = `${r.module}|${r.kind}|${r.field}`;
    const had = by.get(k);
    if (had) had.sites++;
    else by.set(k, { ...r, sites: 1 });
  }
  return [...by.values()];
}

// ---------- ctx: the context objects of the pass ----------
function returnedLiteral(body: TS.Node | undefined): TS.ObjectLiteralExpression | undefined {
  let lit: TS.ObjectLiteralExpression | undefined;
  if (body) visit(body, (n) => {
    if (!lit && ts.isReturnStatement(n) && n.expression && ts.isObjectLiteralExpression(bare(n.expression))) lit = bare(n.expression) as TS.ObjectLiteralExpression;
  });
  return lit;
}
function props(lit: TS.ObjectLiteralExpression): TS.Node[] {
  return lit.properties.flatMap((p): TS.Node[] => {
    if (ts.isSpreadAssignment(p)) {
      const e = bare(p.expression); // `...(circ ? { coRefLpm } : {})` is a context property; `...NEUTRAL_PK_CTX` is a default
      if (ts.isConditionalExpression(e)) return [e.whenTrue, e.whenFalse].map(bare).filter(ts.isObjectLiteralExpression).flatMap(props);
      return ts.isObjectLiteralExpression(e) ? props(e) : [];
    }
    return [p];
  });
}

/** The ctx and endo-write seams of an engine file's pass (the class method `advance`). */
export function passSeams(file: string, text: string, kinds: SeamKind[] = ['ctx', 'endo-write'], readText = (f: string) => readFileSync(f, 'utf8')): Omit<Seam, 'sites'>[] {
  const sf = parse(file, text);
  const imp = imports(sf, file);
  const methods = new Map<string, TS.Node>();
  let pass: TS.MethodDeclaration | undefined;
  visit(sf, (n) => {
    if ((ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name && ts.isIdentifier(n.name)) {
      methods.set(n.name.text, n);
      if (ts.isMethodDeclaration(n) && n.name.text === 'advance') pass = n;
    }
  });
  if (!pass?.body) return [];
  const locals = new Map<string, TS.Expression>();
  visit(pass.body, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) locals.set(n.name.text, bare(n.initializer));
  });
  /** The object literal an argument is, and the name of the local or builder it came through (undefined: inline). */
  const literalOf = (arg: TS.Expression, via?: string): { lit: TS.ObjectLiteralExpression; via?: string } | undefined => {
    const e = bare(arg);
    if (ts.isObjectLiteralExpression(e)) return { lit: e, via };
    if (ts.isIdentifier(e) && locals.has(e.text)) return literalOf(locals.get(e.text)!, e.text);
    if (ts.isCallExpression(e)) {
      const c = e.expression;
      const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) && c.expression.kind === ts.SyntaxKind.ThisKeyword ? c.name.text : undefined;
      const decl = name !== undefined && !imp.has(name) ? methods.get(name) : undefined;
      const lit = decl ? returnedLiteral((decl as TS.FunctionLikeDeclaration).body) : undefined;
      return lit ? { lit, via: name } : undefined;
    }
    return undefined;
  };
  const rows: Omit<Seam, 'sites'>[] = [];
  visit(pass.body, (n) => {
    if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return;
    const callee = n.expression.text;
    const from = imp.get(callee);
    const module = from && modOf(from);
    if (!from || !module || module === modOf(file)) return;
    if (kinds.includes('ctx'))
      for (const a of n.arguments) {
        const o = literalOf(a);
        if (o) for (const p of props(o.lit)) {
          const name = (p as TS.ObjectLiteralElementLike).name; // a shared builder (rhythmCtx, endoCtx) is one seam per property
          if (name) rows.push({ module, kind: 'ctx', field: `${o.via ?? callee}.${name.getText()}`, file, line: lineOf(p) , fn: where(p) });
        }
      }
    if (kinds.includes('endo-write') && module === ENDO && /^write[A-Z]/.test(callee)) rows.push(...writerTargets(from, readText(from), callee));
  });
  return rows;
}

/** The targets an endocrine writer assigns, other than its own EndoState parameter and the circulation's `ext` fields. */
export function writerTargets(file: string, text: string, fn: string): Omit<Seam, 'sites'>[] {
  const sf = parse(file, text);
  const decl = sf.statements.find((s): s is TS.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === fn);
  if (!decl?.body) return [];
  const own = new Set(decl.parameters.filter((p) => p.type?.getText() === 'EndoState').map((p) => p.name.getText()));
  const locals = new Map<string, string>();
  visit(decl.body, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) locals.set(n.name.text, bare(n.initializer).getText());
  });
  const rows: Omit<Seam, 'sites'>[] = [];
  visit(decl.body, (n) => {
    if (!ts.isBinaryExpression(n) || n.operatorToken.kind !== ts.SyntaxKind.EqualsToken || !ts.isPropertyAccessExpression(n.left) || isExtField(n.left)) return;
    let root: TS.Expression = n.left;
    while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = root.expression;
    if (!ts.isIdentifier(root) || own.has(root.text)) return;
    const lhs = n.left.getText();
    const sub = locals.get(root.text);
    rows.push({ module: ENDO, kind: 'endo-write', field: `${fn}: ${sub ? sub + lhs.slice(root.text.length) : lhs}`, file, line: lineOf(n) , fn: where(n) });
  });
  return rows;
}

// ---------- ext writes ----------
const isExtField = (e: TS.PropertyAccessExpression) => {
  const o = e.expression;
  return (ts.isIdentifier(o) && o.text === 'ext') || (ts.isPropertyAccessExpression(o) && o.name.text === 'ext');
};
const ASSIGN = new Set([ts.SyntaxKind.EqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken]);
const isAssigned = (n: TS.Node) => ts.isBinaryExpression(n.parent) && n.parent.left === n && ASSIGN.has(n.parent.operatorToken.kind);

/** Writes of a circulation `ext` field in a file outside the circulation module. */
export function extSeams(file: string, text: string): Omit<Seam, 'sites'>[] {
  const module = modOf(file);
  if (!module || module === 'circulation') return [];
  const rows: Omit<Seam, 'sites'>[] = [];
  visit(parse(file, text), (n) => {
    if (ts.isPropertyAccessExpression(n) && isExtField(n) && isAssigned(n)) rows.push({ module, kind: 'ext', field: n.name.text, file, line: lineOf(n) , fn: where(n) });
  });
  return rows;
}

// ---------- bus reads ----------
/** DrugBus's fields, and the fields of each field whose type is an object literal. */
export function busFields(text: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const sf = parse(BUS_TYPE, text);
  const bus = sf.statements.find((s): s is TS.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'DrugBus');
  for (const m of bus?.members ?? []) {
    if (!ts.isPropertySignature(m) || !m.name) continue;
    out.set(m.name.getText(), new Set(m.type && ts.isTypeLiteralNode(m.type) ? m.type.members.flatMap((x) => (x.name ? [x.name.getText()] : [])) : []));
  }
  return out;
}

/** Reads of a DrugBus field (`bus.F`, `x.bus.F`, `bus?.F`) in a file outside the pharmacology module. */
export function busSeams(file: string, text: string, fields: Map<string, Set<string>>): Omit<Seam, 'sites'>[] {
  const module = modOf(file);
  if (!module || module === 'pharmacology') return [];
  const rows: Omit<Seam, 'sites'>[] = [];
  visit(parse(file, text), (n) => {
    if (!ts.isPropertyAccessExpression(n) || isAssigned(n)) return;
    const o = n.expression;
    const onBus = (ts.isIdentifier(o) && o.text === 'bus') || (ts.isPropertyAccessExpression(o) && o.name.text === 'bus');
    const subs = fields.get(n.name.text);
    if (!onBus || !subs) return;
    const up = n.parent;
    const sub = ts.isPropertyAccessExpression(up) && up.expression === n && subs.has(up.name.text) ? `.${up.name.text}` : '';
    rows.push({ module, kind: 'bus-read', field: `bus.${n.name.text}${sub}`, file, line: lineOf(n) , fn: where(n) });
  });
  return rows;
}

// ---------- effectors ----------
const PRODUCT = new Set([ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken]);
const SUM = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken]);
function operands(e: TS.Expression, ops: Set<TS.SyntaxKind>): TS.Expression[] {
  const b = bare(e);
  return ts.isBinaryExpression(b) && ops.has(b.operatorToken.kind) ? [...operands(b.left, ops), ...operands(b.right, ops)] : [b];
}

/** The name of the function a node returns from (its declaration, or the const or property an arrow is bound to). */
function fnName(n: TS.Node): string {
  for (let f: TS.Node | undefined = ts.isArrowFunction(n) ? n : n.parent; f; f = f.parent)
    if (ts.isFunctionDeclaration(f) || ts.isMethodDeclaration(f) || ts.isArrowFunction(f) || ts.isFunctionExpression(f)) {
      const named = 'name' in f && f.name ? f.name : (ts.isVariableDeclaration(f.parent) || ts.isPropertyAssignment(f.parent)) ? f.parent.name : undefined;
      return named ? named.getText() : 'anonymous';
    }
  return 'anonymous';
}

/**
 * The effector expressions of one file and the exported numeric constants inside each, as `file#NAME`: an identifier
 * resolves to a constant exported by the same file or imported (relative) from the file that exports it.
 */
export function effectors(file: string, text: string, constsByFile: Map<string, Set<string>>): Effector[] {
  const module = modOf(file);
  if (!module) return [];
  const sf = parse(file, text);
  const imp = imports(sf, file);
  const out: Effector[] = [];
  const consider = (lhs: string, rhs: TS.Expression, at: TS.Node) => {
    const b = bare(rhs);
    if (!ts.isBinaryExpression(b)) return;
    const op = PRODUCT.has(b.operatorToken.kind) ? 'product' : SUM.has(b.operatorToken.kind) ? 'sum' : undefined;
    if (!op) return;
    const consts = new Set<string>();
    visit(b, (n) => {
      if (!ts.isIdentifier(n) || (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) return;
      const src = constsByFile.get(file)?.has(n.text) ? file : imp.get(n.text);
      if (src && constsByFile.get(src)?.has(n.text)) consts.add(`${src}#${n.text}`);
    });
    out.push({ module, file, fn: where(at), line: lineOf(at), lhs, op, factors: operands(b, op === 'product' ? PRODUCT : SUM).length, consts: [...consts] });
  };
  visit(sf, (n) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) consider(n.left.getText(), n.right, n);
    else if (ts.isVariableDeclaration(n) && n.initializer) consider(n.name.getText(), n.initializer, n);
    else if (ts.isReturnStatement(n) && n.expression) consider(`return (${fnName(n)})`, n.expression, n);
    else if (ts.isArrowFunction(n) && !ts.isBlock(n.body)) consider(`return (${fnName(n)})`, n.body, n.body);
  });
  return out;
}

// ---------- the census ----------
export interface Census { seams: Seam[]; effectors: Effector[]; constants: { module: string; exported: number; inEffector: number }[] }

export function census(root: string): Census {
  const read = (f: string) => readFileSync(join(root, f), 'utf8');
  const engineMods = MODULES.filter((m) => m.src.some((s) => s.startsWith('packages/engine-core/')));
  const files = engineMods.flatMap((m) => sourceFiles(root, m)).filter((f) => f.startsWith('packages/engine-core/src/')).sort();
  const fields = busFields(read(BUS_TYPE));
  const seams = dedupe([
    ...passSeams(ENGINE, read(ENGINE), ['ctx', 'endo-write'], read),
    ...files.flatMap((f) => extSeams(f, read(f))),
    ...files.flatMap((f) => busSeams(f, read(f), fields)),
  ]);
  const params = extract(root, files).params;
  const constsByFile = new Map<string, Set<string>>();
  for (const p of params) (constsByFile.get(p.file) ?? constsByFile.set(p.file, new Set()).get(p.file)!).add(p.name);
  const effs = files.flatMap((f) => effectors(f, read(f), constsByFile));
  const constants = engineMods
    .map((m) => {
      const mine = new Set(params.filter((p) => modOf(p.file) === m.id).map((p) => `${p.file}#${p.name}`));
      const used = new Set(effs.filter((e) => e.module === m.id).flatMap((e) => e.consts).filter((c) => mine.has(c)));
      return { module: m.id, exported: mine.size, inEffector: used.size };
    })
    .filter((c) => c.exported > 0);
  return { seams, effectors: effs, constants };
}

const KINDS: SeamKind[] = ['ctx', 'ext', 'endo-write', 'bus-read'];
export function renderCensus(c: Census): string {
  const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ');
  const mods = [...new Set(c.seams.map((s) => s.module))].sort();
  const n = (m: string | undefined, k: SeamKind | undefined) => c.seams.filter((s) => (!m || s.module === m) && (!k || s.kind === k)).length;
  const rank = (es: Effector[]) => [...es].sort((a, b) => b.factors - a.factors || a.file.localeCompare(b.file) || a.line - b.line).slice(0, 10);
  const at = (x: { file: string; fn: string }) => `${short(x.file)}#${x.fn}`;
  const row = (e: Effector) => `| \`${at(e)}\` | \`${cell(e.lhs)}\` | ${e.op} | ${e.factors} |`;
  const short = (f: string) => f.replace('packages/engine-core/src/', '');
  return [
    '# Coupling seams: census',
    '',
    '<!-- GENERATED by scripts/coupling-seams.ts; do not edit. Regenerate with',
    '     node --experimental-strip-types scripts/coupling-seams.ts -->',
    '',
    'The engine\'s cross-module coupling seams and its effector products and sums, read from the code',
    '(docs/plans/mechanism-tree.md, piece R0). Places are file#function; the line of each row is in the `--json` output.',
    '',
    `Seams (de-duplicated on module, kind and field): ${c.seams.length}; sites: ${c.seams.reduce((a, s) => a + s.sites, 0)}.`,
    '',
    `| Module | ${KINDS.join(' | ')} | All |`, `|---|${KINDS.map(() => '---:').join('|')}|---:|`,
    ...mods.map((m) => `| ${m} | ${KINDS.map((k) => n(m, k)).join(' | ')} | ${n(m, undefined)} |`),
    `| **All** | ${KINDS.map((k) => n(undefined, k)).join(' | ')} | ${c.seams.length} |`,
    '',
    '## Exported numeric constants inside the module\'s own effector expressions',
    '',
    '| Module | Exported numeric constants | Inside an effector product or sum |', '|---|---:|---:|',
    ...c.constants.map((x) => `| ${x.module} | ${x.exported} | ${x.inEffector} |`),
    `| **All** | ${c.constants.reduce((a, x) => a + x.exported, 0)} | ${c.constants.reduce((a, x) => a + x.inEffector, 0)} |`,
    '',
    `## The ten effector expressions with the most factors (of ${c.effectors.length})`,
    '',
    '| Where | Assigned | Operator | Factors |', '|---|---|---|---:|',
    ...rank(c.effectors).map(row),
    '',
    `## The ten products with the most factors (of ${c.effectors.filter((e) => e.op === 'product').length} products)`,
    '',
    '| Where | Assigned | Operator | Factors |', '|---|---|---|---:|',
    ...rank(c.effectors.filter((e) => e.op === 'product')).map(row),
    '',
    '## Seams',
    '',
    '| Module | Kind | Field | Where | Sites |', '|---|---|---|---|---:|',
    ...c.seams.map((s) => `| ${s.module} | ${s.kind} | \`${cell(s.field)}\` | \`${at(s)}\` | ${s.sites} |`),
    '',
  ].join('\n');
}

export const CENSUS_PAGE = 'docs/model/couplings-census.md';
const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(dirname(import.meta.filename), '..');
  const c = census(root);
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(c, null, 1) + '\n');
  else {
    const page = renderCensus(c);
    const path = join(root, CENSUS_PAGE);
    const stale = !existsSync(path) || readFileSync(path, 'utf8') !== page;
    if (process.argv.includes('--check')) {
      if (stale) {
        console.error(`coupling-seams: stale ${CENSUS_PAGE}; run node --experimental-strip-types scripts/coupling-seams.ts`);
        process.exit(1);
      }
    } else writeFileSync(path, page);
    console.error(`coupling-seams: ${c.seams.length} seams, ${stale ? 1 : 0} page changed`);
  }
}
