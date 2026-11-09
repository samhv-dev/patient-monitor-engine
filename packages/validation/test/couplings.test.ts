// The coupling registry against the code (docs/plans/mechanism-tree.md piece R1, tests 1, 3 and 4; test 2, the nodes
// against a reference run, is packages/engine-core/test/couplings/registry.test.ts):
//   (1) every constant a row names resolves to an exported constant (no stale names);
//   (3) the seam check: every census seam is carried by a row or is in the unregistered list, which may shrink and
//       never grow;
//   (4) every edge's class is what D2 derives from its constants' tags, re-derived here from model-docs.ts's extract().
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classify, parseRef, registry, renderTreeData, renderUnregistered, resolveConst, seamCheck, TREE_FILE, UNREGISTERED_FILE } from '../../../scripts/couplings.ts';
import { extract } from '../../../scripts/model-docs.ts';
import { MODULES } from '../../../scripts/model-modules.ts';
import { REGISTRY } from '../../../apps/demo/src/app/mechanisms/registry-data.ts';
import { COUPLINGS, UNREGISTERED, type ConstRef, type EdgeClass } from '../../engine-core/src/couplings/index.ts';

const root = resolve(import.meta.dirname, '../../..');
/** R1's count of unregistered seams. Lower it as rows land (R2); never raise it. */
const UNREGISTERED_CEILING = 97;

describe('coupling registry: the rows', () => {
  it('has unique ids, known modules, and ABSENT rows with an audit id and no constants', () => {
    const ids = COUPLINGS.map((r) => r.id);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
    const mods = new Set(MODULES.map((m) => m.id));
    expect(COUPLINGS.filter((r) => !mods.has(r.module) || !r.id.startsWith(`${r.module}.`)).map((r) => r.id)).toEqual([]);
    expect(COUPLINGS.filter((r) => r.absent && r.params.length).map((r) => r.id)).toEqual([]);
    expect(COUPLINGS.filter((r) => !r.absent && [...r.from, r.to].some((n) => n.path.startsWith('absent.'))).map((r) => r.id)).toEqual([]);
    expect(COUPLINGS.filter((r) => r.note.trim() === '').map((r) => r.id)).toEqual([]);
  });
  it('covers the six first triggers (haemorrhage, propofol, phenylephrine, esmolol, tension pneumothorax, PEEP)', () => {
    const triggers = new Set(COUPLINGS.flatMap((r) => r.from.filter((n) => n.kind === 'trigger').map((n) => n.path)));
    for (const t of ['trigger.bleed', 'trigger.drug.propofol', 'trigger.drug.phenylephrine', 'trigger.drug.esmolol', 'trigger.lungCondition.ptxTension', 'trigger.condition.tensionPtx', 'trigger.ventilation.peep'])
      expect(triggers.has(t), t).toBe(true);
    for (const id of ['circulation.rSys.baro', 'circulation.v0Sv.recruit', 'circulation.pvrL.lung', 'circulation.kLv.baro', 'circulation.kRv.baro', 'circulation.baro.hr', 'circulation.chemo.hr', 'endocrine-thermal.humoral.svr', 'breathing.pleural.peep'])
      expect(COUPLINGS.some((r) => r.id === id), id).toBe(true);
  });
});

describe('coupling registry: (1) every constant resolves', { timeout: 60_000 }, () => {
  it('resolves the three forms: a numeric constant, an exported object, a data row', () => {
    const num = resolveConst(root, 'l2/circ/baroreflex.ts#G_HS');
    expect(num).toMatchObject({ kind: 'numeric', value: '0.04', file: 'packages/engine-core/src/l2/circ/baroreflex.ts' });
    expect(resolveConst(root, 'l2/pk/data/rows-anaesthetic.ts#PROPOFOL_SYMP')).toMatchObject({ kind: 'object' });
    const row = resolveConst(root, '../data/lung-pathology.ts#LUNG_CONDITIONS.ptxTension');
    expect(row).toMatchObject({ kind: 'row', file: 'packages/engine-core/data/lung-pathology.ts', name: 'LUNG_CONDITIONS.ptxTension' });
    expect(resolveConst(root, 'l2/circ/baroreflex.ts#G_HS_RENAMED')).toHaveProperty('error');
    expect(resolveConst(root, 'l2/pk/data/rows-cardiovascular.ts#CARDIOVASCULAR_ROWS.noSuchDrug')).toHaveProperty('error');
  });
  it('every ConstRef of every row (params, delay, tau, saturation) resolves', () => {
    const refs = COUPLINGS.flatMap((r) => [...r.params, ...[r.delay, r.tau, r.saturation].filter((x): x is ConstRef => x !== undefined)].map((ref) => ({ id: r.id, ref })));
    expect(refs.length).toBeGreaterThan(100);
    const bad = refs.map(({ id, ref }) => ({ id, ref, x: resolveConst(root, ref) })).filter((y) => 'error' in y.x).map((y) => `${y.id}: ${(y.x as { error: string }).error}`);
    expect(bad).toEqual([]);
  });
});

describe('coupling registry: (3) the seam check', { timeout: 120_000 }, () => {
  const r = seamCheck(root);
  it('every census seam is carried by a row or listed as unregistered; no row names a seam the census lacks', () => {
    expect(r.grown, 'a new seam without a row: add a coupling row whose node carries it').toEqual([]);
    expect(r.unknown, 'a row names a seam the census does not list').toEqual([]);
  });
  it('the committed unregistered list is current (it shrinks when a row lands) and never above its ceiling', () => {
    expect(r.shrunk, 'run: node --experimental-strip-types scripts/couplings.ts').toEqual([]);
    expect(readFileSync(join(root, UNREGISTERED_FILE), 'utf8')).toBe(renderUnregistered(UNREGISTERED));
    expect(UNREGISTERED.length).toBe(r.uncovered.length);
    expect(UNREGISTERED.length).toBeLessThanOrEqual(UNREGISTERED_CEILING);
  });
  it('a seam missing from both the rows and the list fails', () => {
    const dropped = seamCheck(root, UNREGISTERED.slice(1));
    expect(dropped.grown).toEqual(UNREGISTERED.slice(0, 1));
  });
});

describe('coupling registry: (4) the class of an edge', { timeout: 60_000 }, () => {
  it('follows D2 on each branch', () => {
    const row = (absent?: boolean) => ({ params: [], ...(absent ? { absent: 'research/44 L2-01' as const } : {}) });
    const tag = (kind: string, body: string) => `[${kind}: ${body}]`; // built, so the fixtures are not counted as the code's markers
    const fit = tag('FIT', 'x; brief research/44 L2-03');
    const eng = tag('ENG', 'numerics');
    expect(classify(row(true), [fit])).toBe('ABSENT');
    expect(classify(row(), ['Smith 2004', fit, eng])).toBe('FIT');
    expect(classify(row(), ['Smith 2004', eng])).toBe('ENG');
    expect(classify(row(), ['Smith 2004', 'tables §3'])).toBe('SOURCED');
    expect(classify(row(), ['Smith 2004', '—'])).toBe('UNTAGGED');
    expect(classify(row(), ['[P]'])).toBe('UNTAGGED'); // a tag with no source is no source
    expect(classify(row(), [])).toBe('UNTAGGED'); // a row that names no constant
  });
  it('every edge\'s class equals D2 re-derived from extract() and the rows\' own src/tag text', () => {
    const viaExtract = (ref: ConstRef): string => {
      const { file, ident, key } = parseRef(ref);
      const p = key === undefined ? extract(root, [file]).params.find((x) => x.name === ident) : undefined;
      return p ? p.source : (resolveConst(root, ref) as { source: string }).source;
    };
    const d2 = (absent: boolean, sources: string[]): EdgeClass => {
      if (absent) return 'ABSENT';
      if (sources.some((s) => /\[(?:FIT)\b/.test(s))) return 'FIT';
      if (sources.some((s) => /\[(?:ENG)\b/.test(s))) return 'ENG';
      const sourced = (s: string) => s !== '—' && s.replace(/\[(?:ENG|FIT|P|TXT|VERIFY)[^\]]*\]/g, '').replace(/[;\s]/g, '') !== '';
      return sources.length && sources.every(sourced) ? 'SOURCED' : 'UNTAGGED';
    };
    const diff = registry(root).filter((x) => x.cls !== d2(Boolean(x.row.absent), x.row.params.map(viaExtract))).map((x) => x.row.id);
    expect(diff).toEqual([]);
  });
  it('draws the audit\'s fitted arms as fitted, the unnamed chemoreflex numbers as untagged, the missing hub as absent', () => {
    const cls = new Map(registry(root).map((x) => [x.row.id, x.cls]));
    for (const id of ['circulation.baro.hr', 'circulation.baro.svr', 'endocrine-thermal.humoral.svr', 'endocrine-thermal.humoral.venous', 'pharmacology.phenylephrine.svr']) expect(cls.get(id), id).toBe('FIT'); // research/44 L2-03, L2-01, X-12
    for (const id of ['circulation.chemo.hr', 'circulation.chemo.svr']) expect(cls.get(id), id).toBe('UNTAGGED'); // L2-04: inline literals
    for (const id of ['circulation.absent.baroToHub', 'circulation.absent.chemoToHub', 'endocrine-thermal.absent.avp']) expect(cls.get(id), id).toBe('ABSENT');
  });
});

describe('coupling registry: the mechanism-tree page\'s copy (plan piece T1)', { timeout: 60_000 }, () => {
  it('apps/demo/src/app/mechanisms/registry-data.ts is current: every row, its computed class and its constants\' tags', () => {
    expect(readFileSync(join(root, TREE_FILE), 'utf8'), 'run: node --experimental-strip-types scripts/couplings.ts').toBe(renderTreeData(root));
  });
  it('carries the class D2 computes for each row, never one of its own', () => {
    expect(REGISTRY.rows.map((r) => `${r.id} ${r.cls}`)).toEqual(registry(root).map((x) => `${x.row.id} ${x.cls}`));
  });
});
