// The mechanism tree's layout (docs/plans/mechanism-tree.md §4 D6): pure, no DOM. The trigger at the left, each node
// in the column of its longest-path distance from the trigger once the feedback edges are set aside (the graph is then
// acyclic), the observables at the leaves. Inside a column the nodes are ordered by the mean row of their parents (two
// sweeps, ties in discovery order), so the picture is the same for the same registry and trigger.
import type { Tree } from './graph.ts';

export interface Placed { id: string; gen: number; row: number; x: number; y: number }
export interface Layout {
  /** Node ids per generation (column), top to bottom. */
  gens: string[][];
  at: Map<string, Placed>;
  width: number;
  height: number;
}

/** A node box's width, SVG px [ENG: display]: 27 characters of an 11 px label. */
export const NODE_W = 164;
/** A node box's height, SVG px [ENG: display]: a label line and an engine-key line. */
export const NODE_H = 38;
/** The gap between two columns, SVG px [ENG: display]: room for the feedback edges' lanes. */
export const COL_GAP = 64;
/** The gap between two nodes of a column, SVG px [ENG: display]. */
export const ROW_GAP = 14;
/** The margin round the drawing, SVG px [ENG: display]. */
export const PAD = 16;

/** Longest-path generation of every node over the non-feedback edges (Kahn's order, discovery order among ties). */
export function generations(tree: Tree): Map<string, number> {
  const ids = tree.nodes.map((n) => n.id);
  const fwd = tree.edges.filter((e) => !e.feedback);
  const indeg = new Map(ids.map((id) => [id, 0]));
  for (const e of fwd) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const gen = new Map(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  for (let i = 0; i < queue.length; i++) {
    const v = queue[i] as string;
    for (const e of fwd) {
      if (e.from !== v) continue;
      gen.set(e.to, Math.max(gen.get(e.to) ?? 0, (gen.get(v) ?? 0) + 1));
      indeg.set(e.to, (indeg.get(e.to) ?? 0) - 1);
      if (indeg.get(e.to) === 0) queue.push(e.to);
    }
  }
  if (queue.length !== ids.length) throw new Error('mechanism tree: a cycle survived the feedback edges');
  return gen;
}

export function layout(tree: Tree): Layout {
  const gen = generations(tree);
  const order = new Map(tree.nodes.map((n, i) => [n.id, i]));
  const n = Math.max(0, ...gen.values()) + 1;
  const gens: string[][] = Array.from({ length: n }, () => []);
  for (const node of tree.nodes) (gens[gen.get(node.id) as number] as string[]).push(node.id);
  const parents = new Map<string, string[]>();
  for (const e of tree.edges) if (!e.feedback) (parents.get(e.to) ?? parents.set(e.to, []).get(e.to)!).push(e.from);
  const rowOf = new Map<string, number>();
  const index = () => gens.forEach((g) => g.forEach((id, i) => rowOf.set(id, i)));
  index();
  for (let sweep = 0; sweep < 2; sweep++) {
    for (const g of gens.slice(1)) {
      const key = (id: string): number => {
        const ps = parents.get(id) ?? [];
        return ps.length ? ps.reduce((s, p) => s + (rowOf.get(p) ?? 0), 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      const keyed = g.map((id) => ({ id, k: key(id), o: order.get(id) ?? 0 }));
      keyed.sort((a, b) => a.k - b.k || a.o - b.o);
      g.splice(0, g.length, ...keyed.map((x) => x.id));
      g.forEach((id, i) => rowOf.set(id, i));
    }
  }
  const tallest = Math.max(1, ...gens.map((g) => g.length));
  const colH = (k: number) => k * NODE_H + (k - 1) * ROW_GAP;
  const at = new Map<string, Placed>();
  gens.forEach((g, gi) => {
    const top = PAD + (colH(tallest) - colH(g.length)) / 2;
    g.forEach((id, row) => at.set(id, { id, gen: gi, row, x: PAD + gi * (NODE_W + COL_GAP), y: top + row * (NODE_H + ROW_GAP) }));
  });
  return { gens, at, width: PAD * 2 + n * NODE_W + (n - 1) * COL_GAP, height: PAD * 2 + colH(tallest) };
}
