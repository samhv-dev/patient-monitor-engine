// Stage 8b: the release documentation stays honest and complete, mechanically (orchestrator ruling, 8b review):
//  - every expected failure (`it.fails`/`test.fails` in the package tests, Playwright `test.fail` in the e2e) and every
//    literal-titled skip appears in docs/guides/known-deviations.md, each row names where it is tracked, and every
//    expected-failure call has a title the lister can read;
//  - the physiology overview has a table row WITH A MODE LABEL for every rhythm, drug and condition id — the
//    condition ids are read from the code and the scenario schema, not from a hand-kept list;
//  - no release page mentions clinical validation, IEC 60601, FDA, CE marking or diagnosis on a line without a
//    negation, and no `FILL:` marker from the Stage 8b plan is left (NOTICES.md included).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDeviations, listSkipped, unreadableFails } from '../../../scripts/deviations.ts';
import { DRUG_IDS, LUNG_CONDITION_IDS, RHYTHM_IDS } from '../../engine-core/src/index.ts';
import { CIRC_CONDITIONS } from '../../engine-core/src/l2/circ/conditions.ts';

const root = resolve(import.meta.dirname, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const walk = (d: string): string[] =>
  readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const GUIDES = readdirSync(join(root, 'docs/guides')).filter((f) => f.endsWith('.md')).map((f) => `docs/guides/${f}`);
// CHANGELOG.md and RELEASE.md join the check once Task 13 creates them.
const RELEASE_DOCS = [...GUIDES, 'README.md', 'CHANGELOG.md', 'RELEASE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CITATION.cff'].filter((f) => existsSync(join(root, f)));
const FILL_DOCS = [...RELEASE_DOCS, 'NOTICES.md']; // N-015's date is a FILL: marker until the executor commits
// A line mentioning one of these must also carry a negation: "Not clinically validated." passes, "clinically validated" fails.
const CLAIM_RE = /clinically[- ]validated|validated for clinical|IEC\s*60601|FDA|CE[- ]mark|diagnos/i;
const NEGATION_RE = /\b(not|no|never|without|nor)\b/i;
// A table cell that starts with a mode label (physiology-overview.md: "Labels on this page").
const MODE_CELL_RE = /\|\s*(both|MODELED only|MANUAL only|INTERIM)\b[^|]*\|/;

const quoted = (union: string) => [...union.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
/** Every condition id the engine accepts, read from the code and the pme-scenario/1 schema (no hand-kept list). */
function conditionIds(): string[] {
  const ids = new Set<string>([...CIRC_CONDITIONS, ...LUNG_CONDITION_IDS]);
  for (const f of walk('packages/engine-core/src').filter((f) => f.endsWith('.ts'))) {
    const text = read(f);
    // `{ kind: 'condition'; id: 'a' | 'b' … }` event members (types-*.ts) and profile unions (`type ConditionId = 'a' | …`)
    for (const m of text.matchAll(/kind:\s*'condition';\s*id:\s*((?:'[^']+'\s*\|?\s*)+)/g)) for (const id of quoted(m[1] as string)) ids.add(id);
    for (const m of text.matchAll(/export type ConditionId\s*=\s*((?:'[^']+'\s*\|?\s*)+)/g)) for (const id of quoted(m[1] as string)) ids.add(id);
  }
  // pme-scenario/1: the `id` enums under a `conditions` / `lungConditions` property (patient.profile, FU-3)
  const visit = (node: unknown, inConditions: boolean): void => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, inConditions));
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const e = (v as { enum?: unknown } | null)?.enum;
      if (inConditions && k === 'id' && Array.isArray(e)) for (const id of e) if (typeof id === 'string') ids.add(id);
      visit(v, inConditions || k === 'conditions' || k === 'lungConditions');
    }
  };
  visit(JSON.parse(read('packages/controller/scenarios/pme-scenario-1.schema.json')), false);
  return [...ids].sort();
}

describe('docs honesty (Stage 8b)', () => {
  const deviationsPage = () => read('docs/guides/known-deviations.md');
  it('every expected failure and every literal-titled skip appears, verbatim, in known-deviations.md', () => {
    const page = deviationsPage().replace(/\\\|/g, '|');
    const missing = [...listDeviations(root), ...listSkipped(root)].filter((d) => !page.includes(d.title)).map((d) => `${d.file}: ${d.title}`);
    expect(missing).toEqual([]);
  });
  it('every expected-failure call has a literal title (no variable, no ${…} template)', () => {
    expect(unreadableFails(root)).toEqual([]);
  });
  it('every row of the two test tables names where it is tracked', () => {
    const rows = deviationsPage().split('\n').filter((l) => /^\|\s*`[^`]+\.(?:test|e2e)\.ts`\s*\|/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    const untracked = rows.filter((l) => {
      const cells = l.split(/(?<!\\)\|/).slice(1, -1);
      return cells.length < 3 || (cells[cells.length - 1] ?? '').trim() === '';
    });
    expect(untracked).toEqual([]);
  });
  it('reads the condition ids from the code (sanity: the known ones are found)', () => {
    expect(conditionIds()).toEqual(expect.arrayContaining(['burns', 'dka', 'mh', 'sepsis', 'thyroidStorm', 'tbi', 'aki', 'hfref', 'as', 'tamponade', 'pe', 'ards']));
  });
  it('the physiology overview has a table row with a mode label for every rhythm, drug and condition id', () => {
    const rows = read('docs/guides/physiology-overview.md').split('\n').filter((l) => l.startsWith('|'));
    const ids = [...new Set<string>([...RHYTHM_IDS, ...DRUG_IDS, ...conditionIds()])];
    expect(ids.filter((id) => !rows.some((r) => r.includes(`\`${id}\``) && MODE_CELL_RE.test(r)))).toEqual([]);
  });
  it('no release page claims clinical validation, IEC 60601 compliance, FDA/CE status or diagnostic use', () => {
    const claims = RELEASE_DOCS.flatMap((f) => read(f).split('\n').filter((l) => CLAIM_RE.test(l) && !NEGATION_RE.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(claims).toEqual([]);
  });
  it('no FILL: marker is left', () => {
    expect(FILL_DOCS.filter((f) => read(f).includes('FILL:'))).toEqual([]);
  });
});
