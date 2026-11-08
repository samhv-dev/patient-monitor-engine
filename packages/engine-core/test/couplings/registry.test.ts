// The coupling registry's nodes against the engine (docs/plans/mechanism-tree.md piece R1, test 2): every state node is
// a path of the truth tree of a reference run; every effector, trigger and observable is declared in
// src/couplings/nodes.ts and real — an effector's function is in its file, a trigger's command is accepted, an
// observable is measured in the reference run. MODELED, seed 7, every sensor on.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { COUPLINGS, EFFECTORS, OBSERVABLES, TRIGGERS, type NodeRef } from '../../src/couplings/index.ts';

const PATIENT = { ageY: 35, sex: 'M', weightKg: 75, heightCm: 178, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' } };
const make = () => createEngine({ seed: 7, mode: 'modeled', truthHz: 1, patient: PATIENT } as never);
type Tree = Record<string, unknown>;
const has = (tree: Tree, path: string): boolean => {
  let v: unknown = tree;
  for (const k of path.split('.')) {
    if (v === null || typeof v !== 'object' || !(k in (v as object))) return false;
    v = (v as Record<string, unknown>)[k];
  }
  return true;
};
const nodes: NodeRef[] = COUPLINGS.flatMap((r) => [...r.from, r.to, ...(r.blockedBy ? [r.blockedBy] : [])]);

describe('coupling registry: (2) every node exists', { timeout: 60_000 }, () => {
  let tree: Tree = {};
  const measured = new Set<string>();
  {
    const e = make();
    e.on((x) => {
      const ev = x as unknown as { type: string; tree?: Tree; values?: Record<string, unknown> };
      if (ev.type === 'truth' && ev.tree) tree = ev.tree;
      if (ev.type === 'measurement' && ev.values) for (const k of Object.keys(ev.values)) measured.add(k);
    }, ['truth', 'measurement'] as never);
    e.advanceTo(20);
  }
  it('every state node is a path of the reference truth tree', () => {
    const missing = [...new Set(nodes.filter((n) => n.kind === 'state').map((n) => n.path))].filter((p) => !has(tree, p));
    expect(missing).toEqual([]);
  });
  it('every effector is declared, assembled by a function that exists, or carries the audit id of the missing mechanism', () => {
    const decl = new Map(EFFECTORS.map((d) => [d.path, d]));
    expect([...new Set(nodes.filter((n) => n.kind === 'effector').map((n) => n.path))].filter((p) => !decl.has(p))).toEqual([]);
    const bad = EFFECTORS.filter((d) => {
      if (d.absent) return d.at !== undefined || !d.path.startsWith('absent.');
      if (!d.at || d.path.startsWith('absent.')) return true;
      const [file, fn] = d.at.split('#') as [string, string];
      const text = readFileSync(resolve(import.meta.dirname, '../../src', file), 'utf8');
      return !new RegExp(`(function\\s+${fn}\\b|\\b${fn}\\s*=\\s*\\(|\\b${fn}\\s*\\()`).test(text);
    }).map((d) => d.path);
    expect(bad).toEqual([]);
  });
  it('every trigger is declared and its command is accepted by the engine', () => {
    const decl = new Set(TRIGGERS.map((d) => d.path));
    expect(nodes.filter((n) => n.kind === 'trigger' && !decl.has(n.path as never)).map((n) => n.path)).toEqual([]);
    for (const t of TRIGGERS) {
      const r = make().dispatch({ id: 'c1', issuedBy: 'test', ...t.command } as never) as { accepted: boolean; reason?: string };
      expect(r, t.path).toMatchObject({ accepted: true });
    }
  });
  it('every observable is declared and measured in the reference run', () => {
    const decl = new Set(OBSERVABLES.map((d) => d.path));
    expect(nodes.filter((n) => n.kind === 'observable' && !decl.has(n.path as never)).map((n) => n.path)).toEqual([]);
    expect(OBSERVABLES.map((d) => d.path.slice(4)).filter((id) => !measured.has(id))).toEqual([]);
  });
  it('every declared node is used by a row', () => {
    const used = new Set(nodes.map((n) => n.path));
    expect([...TRIGGERS, ...EFFECTORS, ...OBSERVABLES].map((d) => d.path).filter((p) => !used.has(p))).toEqual([]);
  });
});
