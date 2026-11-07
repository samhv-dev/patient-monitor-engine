// The census of the coupling seams (scripts/coupling-seams.ts; docs/plans/mechanism-tree.md piece R0). The counting is
// pinned on a small fixture engine (one of each seam kind, and each thing the reader must NOT count); the real census is
// checked for its shape: every row names a module of scripts/model-modules.ts, a file that exists and a line that holds
// the field's name.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { busFields, busSeams, census, effectors, extSeams, passSeams } from '../../../scripts/coupling-seams.ts';
import { MODULES } from '../../../scripts/model-modules.ts';

const root = resolve(import.meta.dirname, '../../..');
const S = 'packages/engine-core/src/';

const FIXTURE_ENGINE = `
import { advanceResp } from './l2/resp/pipeline.ts';
import { advancePk } from './l2/pk/pipeline.ts';
import { writeBlood } from './l2/endo/adapters.ts';
import { helper } from './engine-helper.ts';
function rhythmCtx(ps) { return { hrAt: (t) => ps.hr, mods: ps.mods }; }
class Engine {
  private pkCtx(ps) { return { ...NEUTRAL, coLpm: 5, ...(ps.circ ? { coRefLpm: 4 } : {}) }; }
  private advance(ps, end) {
    advancePk(ps.pk, this.pkCtx(ps), end);
    ps.hemo.circ.ext.drug = ps.pk.fx;
    const ctx = { l1: ps.l1, hemo: ps.hemo };
    advanceResp(ps.resp, ctx, end);
    advanceResp(ps.resp, { l1: ps.l1, neuro: ps.neuro }, end);
    helper({ notASeam: 1 });
    writeBlood(ps, ps.endo);
  }
  private other(ps) { advanceResp(ps.resp, { outsideThePass: 1 }, 0); }
}`;
const FIXTURE_WRITER = `
export function writeBlood(ps: object, es: EndoState): boolean {
  const c = bloodOf(ps)?.core;
  c.endoKShift = es.core.out.kShift;
  es.kfMult = 1;
  ext.endoHrF = 1;
  return true;
}`;
const FIXTURE_BUS = `
export interface DrugBus { agents: Record<string, BusAgent>; cns: { propCe: number; hypPropEq: number }; hpvInhibit: number }`;
const FIXTURE_READER = `
export function read(ps, bus) {
  const a = ps.pk.bus.cns.propCe + bus.hpvInhibit + bus.agents.x + other.cns.propCe;
  bus.hpvInhibit = 0;
  m.ext.pvrLung = a;
  return a;
}`;

describe('coupling seams: the counting, on a fixture', () => {
  it('lists each property of each context object built in the pass, named by its builder or local', () => {
    const rows = passSeams(S + 'engine.ts', FIXTURE_ENGINE, ['ctx'], () => '');
    expect(rows.map((r) => `${r.module} ${r.field}`)).toEqual([
      'pharmacology pkCtx.coLpm',
      'pharmacology pkCtx.coRefLpm',
      'breathing ctx.l1',
      'breathing ctx.hemo',
      'breathing advanceResp.l1',
      'breathing advanceResp.neuro',
    ]);
    expect(rows.every((r) => r.kind === 'ctx' && r.file === S + 'engine.ts')).toBe(true);
    expect(rows.map((r) => r.fn)).toEqual(['pkCtx', 'pkCtx', 'advance', 'advance', 'advance', 'advance']); // the page's file#function
  });
  it("lists an endocrine writer's targets, not its own state and not the ext fields", () => {
    const rows = passSeams(S + 'engine.ts', FIXTURE_ENGINE, ['endo-write'], () => FIXTURE_WRITER);
    expect(rows.map((r) => [r.module, r.kind, r.field, r.line])).toEqual([['endocrine-thermal', 'endo-write', 'writeBlood: bloodOf(ps)?.core.endoKShift', 4]]);
  });
  it('lists ext writes outside the circulation, and bus reads outside the drug model', () => {
    const fields = busFields(FIXTURE_BUS);
    expect([...fields.keys()]).toEqual(['agents', 'cns', 'hpvInhibit']);
    const reader = S + 'l2/organs/inputs.ts';
    expect(busSeams(reader, FIXTURE_READER, fields).map((r) => r.field)).toEqual(['bus.cns.propCe', 'bus.hpvInhibit', 'bus.agents']);
    expect(busSeams(S + 'l2/pk/pipeline.ts', FIXTURE_READER, fields)).toEqual([]);
    expect(extSeams(reader, FIXTURE_READER).map((r) => [r.module, r.field, r.line])).toEqual([['organs', 'pvrLung', 5]]);
    expect(extSeams(S + 'l2/circ/model.ts', FIXTURE_READER)).toEqual([]);
  });
  it('counts the factors of an effector product and the exported constants inside it', () => {
    const text = 'import { G } from "./b.ts";\nexport const K = 2;\nfunction f(x, y) { p.r = (x ?? 1) * K * G / y * (1 + K * x); const s = x + y - K; }';
    const file = S + 'l2/circ/a.ts';
    const consts = new Map([[file, new Set(['K'])], [S + 'l2/circ/b.ts', new Set(['G'])]]);
    const e = effectors(file, text, consts);
    expect(e.map((x) => [x.lhs, x.op, x.factors, x.consts, x.line])).toEqual([
      ['p.r', 'product', 5, [`${file}#K`, `${S}l2/circ/b.ts#G`], 3],
      ['s', 'sum', 3, [`${file}#K`], 3],
    ]);
  });
});

describe('coupling seams: the real census', { timeout: 120_000 }, () => {
  const c = census(root);
  const ids = new Set(MODULES.map((m) => m.id));
  it('has every kind of seam, each row in a known module, in a file that exists, on a line that holds its name', () => {
    expect(new Set(c.seams.map((s) => s.kind))).toEqual(new Set(['ctx', 'ext', 'endo-write', 'bus-read']));
    const bad = c.seams.filter((s) => {
      const name = s.field.split(/[.: ]/).pop()!;
      const line = existsSync(join(root, s.file)) ? readFileSync(join(root, s.file), 'utf8').split('\n')[s.line - 1] : undefined;
      return !ids.has(s.module) || line === undefined || !line.includes(name) || s.sites < 1;
    });
    expect(bad).toEqual([]);
  });
  it("finds the seams the plan names (engine.ts's pass, the endocrine writers, the drug bus) and the SVR product", () => {
    const f = new Set(c.seams.map((s) => `${s.module} ${s.kind} ${s.field}`));
    for (const want of ['breathing ctx advanceResp.cbfRel', 'pharmacology ctx pkCtx.coLpm', 'engine-runtime ext drug', 'endocrine-thermal ext endoSvrF', 'endocrine-thermal endo-write writeCond: ps.cond.vasoResp', 'neuro bus-read bus.nmb.achGain', 'organs ext rSysF'])
      expect(f.has(want), want).toBe(true);
    const svr = c.effectors.find((e) => e.file === S + 'l2/circ/model.ts' && e.lhs === 'p.rSys' && e.op === 'product');
    expect(svr?.factors).toBe(7);
  });
});
