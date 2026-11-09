// The mechanism tree as an SVG string (docs/plans/mechanism-tree.md §4 D7; the swimlane's pattern, no DOM state, no
// graph library). Columns by generation (layout.ts), the trigger at the left. A node's shape says its kind: the trigger
// a pill, a state a plain box, an effector a double box, a monitor observable a heavy box, a reflex a rounded loop box
// with ⟲, a mechanism the engine lacks a dashed box. An edge's stroke says its class, never by colour alone (the
// swimlane's rule E45): sourced solid; fitted dotted; an engineering choice dash-dot; untagged solid with "?"; a
// pass-through that names no constant thin; absent dashed with its audit id written on it. A feedback edge (it closes a
// loop) runs back under the columns. Hover shows an edge's rows, constants and their tags (<title>); the page shows the
// same words on focus. Strings go through `t` as they are built (Q13: the DOM's Persian pass never touches SVG text).
// Brief 104 (T1b): a node shows its clinical label (wrapped over two lines) and its unit, never its engine key (the key
// is in the tooltip); a device box (the monitor's values folded) is a heavy box with ▸; a fold ("n more") a dashed pill;
// a frontier node carries a "+n" button that draws one more generation from it. A box or button that opens something
// is a button: it has `data-open` / `data-expand`, a role and a key-press handler on the page (views/mechanisms.ts).
import type { DrawClass, TreeEdge, TreeRow, ViewNode } from './graph.ts';
import { layout, NODE_H, NODE_W, PAD, type Layout } from './layout.ts';

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (x: number): string => String(Math.round(x * 10) / 10);
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** The words of each drawn class, as the legend and the hover say them. */
export const CLASS_WORDS: Readonly<Record<DrawClass, string>> = {
  SOURCED: 'sourced',
  FIT: 'fitted',
  ENG: 'engineering choice',
  UNTAGGED: 'untagged',
  NONE: 'no constant',
  ABSENT: 'absent',
};
const KIND_WORDS: Readonly<Record<ViewNode['kind'], string>> = { trigger: 'trigger', state: 'state', effector: 'effector', observable: 'monitor value', loop: 'reflex loop', device: 'monitor values, folded', fold: 'folded children' };

export interface SvgOpts {
  /** A string as printed: the identity in English; the Persian table's words otherwise (unmatched: the English). */
  t?: (en: string) => string;
  /** A node's unit and one sentence of meaning (mechanisms/labels.ts), for its unit line and its tooltip. */
  about?: (id: string) => { unit: string; meaning: string } | undefined;
}

/** A label over at most two lines of `n` characters, broken at the space that makes the longer line shortest; a label
 *  that does not fit ends in "…" (the tooltip has it whole). */
export function wrap(s: string, n = 21): string[] {
  if (s.length <= n) return [s];
  let best: string[] | null = null;
  for (let i = s.indexOf(' '); i > 0; i = s.indexOf(' ', i + 1)) {
    const two = [s.slice(0, i), s.slice(i + 1)];
    if (two[0]!.length <= n && two[1]!.length <= n && (!best || Math.max(...two.map((x) => x.length)) < Math.max(...best.map((x) => x.length)))) best = two;
  }
  if (best) return best;
  const sp = s.lastIndexOf(' ', n);
  return sp > 0 ? [s.slice(0, sp), cut(s.slice(sp + 1), n)] : [cut(s, n)];
}

const constLine = (c: TreeRow['consts'][number]): string => `${c.name}${c.value !== undefined ? ` = ${c.value}${c.unit && c.unit !== '—' ? ` ${c.unit}` : ''}` : ''}: ${c.source}`;
/** An edge's words: what it joins, then each row with its class, constants and their sources and tags, timing, note. */
export function edgeWords(e: TreeEdge, label: (id: string) => string): string {
  const head = `${label(e.from)} → ${label(e.to)}${e.feedback ? ' (feedback: closes a loop)' : ''}`;
  const rows = e.rows.map((r) => {
    const cls = r.absent ? `absent, ${r.absent}` : CLASS_WORDS[r.cls === 'UNTAGGED' && !r.consts.length ? 'NONE' : r.cls];
    const timing = [r.delay && `delay ${r.delay}`, r.tau && `τ ${r.tau}`, r.saturation && `saturates at ${r.saturation}`, r.blockedBy && `blocked by ${r.blockedBy}`].filter(Boolean).join('; ');
    return [`${r.id} (${cls}; ${r.sign} ${r.form})`, ...r.consts.map(constLine), ...(timing ? [timing] : []), r.note].join('\n');
  });
  return [head, ...rows].join('\n\n');
}

function nodeSvg(n: ViewNode, x: number, y: number, t: (s: string) => string, inner: number, about: SvgOpts['about']): string {
  const W = NODE_W;
  const H = NODE_H;
  const shape = n.kind === 'trigger' || n.kind === 'fold'
    ? `<rect class="mt-box" x="${f(x)}" y="${f(y)}" width="${W}" height="${H}" rx="${H / 2}"/>`
    : n.kind === 'loop'
      ? `<rect class="mt-box" x="${f(x)}" y="${f(y)}" width="${W}" height="${H}" rx="12"/>`
      : n.kind === 'effector'
        ? `<rect class="mt-box" x="${f(x)}" y="${f(y)}" width="${W}" height="${H}" rx="3"/><rect class="mt-box2" x="${f(x + 3)}" y="${f(y + 3)}" width="${W - 6}" height="${H - 6}" rx="2"/>`
        : `<rect class="mt-box" x="${f(x)}" y="${f(y)}" width="${W}" height="${H}" rx="3"/>`;
  const label = n.kind === 'loop' ? `⟲ ${t(n.label)}` : n.kind === 'device' ? `▸ ${t(n.label)}` : n.kind === 'fold' ? `+ ${n.label.replace(/ more$/, ` ${t('more')}`)}` : t(n.label);
  const a = n.kind === 'loop' || n.kind === 'device' || n.kind === 'fold' ? undefined : about?.(n.id);
  const sub = n.kind === 'loop'
    ? `${n.keys.length} ${t(n.keys.length === 1 ? 'state' : 'states')}${inner ? ` · ${inner} ${t(inner === 1 ? 'edge' : 'edges')}` : ''}`
    : n.kind === 'device' ? `${n.keys.length} ${t(n.keys.length === 1 ? 'value' : 'values')} · ${t('open')}`
      : n.kind === 'fold' ? t('open')
        : n.absent ?? a?.unit ?? '';
  const lines = wrap(label);
  const cx = x + W / 2;
  const title = [
    `${label}${a?.unit ? ` (${a.unit})` : ''}: ${t(KIND_WORDS[n.kind])}${n.absent ? `; ${t('absent')}, ${n.absent}` : ''}`,
    ...(a?.meaning ? [t(a.meaning)] : []),
    ...(n.kind === 'fold' ? (n.names ?? []).map((w) => `· ${t(w)}`) : n.keys),
  ].join('\n');
  const button = n.kind === 'device' || n.kind === 'fold' ? ` data-open="${esc(n.id)}" role="button" aria-label="${esc(`${t('Open')}: ${label}`)}"` : '';
  const y0 = y + (lines.length === 2 ? 15 : 20) - (sub ? 0 : 5);
  const text = lines.map((l, i) => `<text class="mt-l" x="${f(cx)}" y="${f(y0 + i * 13)}" text-anchor="middle">${esc(l)}</text>`).join('');
  const more = n.more
    ? `<g class="mt-more" data-expand="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(`${t('Show more')}: ${n.more} ${t('from')} ${label}`)}"><title>${esc(`${t('Show more')}: ${n.more} ${t(n.more === 1 ? 'effect' : 'effects')} ${t('of')} ${label}, ${t('one generation further')}`)}</title>`
      + `<rect class="mt-more-b" x="${f(x + W - 26)}" y="${f(y - 8)}" width="30" height="16" rx="8"/><text class="mt-more-t" x="${f(x + W - 11)}" y="${f(y + 4)}" text-anchor="middle">+${n.more}</text></g>`
    : '';
  return `<g class="mt-n" data-key="${esc(n.id)}" data-kind="${n.kind}"${n.absent ? ` data-absent="${esc(n.absent)}"` : ''}${button} tabindex="0"><title>${esc(title)}</title>${shape}`
    + text
    + `${sub ? `<text class="mt-k" x="${f(cx)}" y="${f(y + H - 7)}" text-anchor="middle">${esc(cut(sub, 26))}</text>` : ''}${more}</g>`;
}

function edgePath(e: TreeEdge, L: Layout, k: number): { d: string; mx: number; my: number } {
  const a = L.at.get(e.from) as { x: number; y: number };
  const b = L.at.get(e.to) as { x: number; y: number };
  if (e.feedback) {
    // back under the columns, in the gaps between them: out of the source's right side, down its gap, left along the
    // bottom, up the gap before the target, into its left side (never through a node)
    const yb = L.height - PAD / 2 + 8 + k * 7;
    const lane = 5 + (k % 4) * 4;
    const sx = a.x + NODE_W + lane;
    const tx = b.x - lane;
    const sy = a.y + NODE_H / 2 + 6;
    const ty = b.y + NODE_H / 2 + 6;
    return { d: `M${f(a.x + NODE_W)} ${f(sy)}H${f(sx)}V${f(yb)}H${f(tx)}V${f(ty)}H${f(b.x - 2)}`, mx: (sx + tx) / 2, my: yb };
  }
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x - 2;
  const y2 = b.y + NODE_H / 2;
  const dx = Math.max(24, (x2 - x1) / 2);
  return { d: `M${f(x1)} ${f(y1)}C${f(x1 + dx)} ${f(y1)} ${f(x2 - dx)} ${f(y2)} ${f(x2)} ${f(y2)}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

/** The tree as one SVG string (and the layout it used). */
export function treeSvg(tree: { root: string; nodes: readonly ViewNode[]; edges: readonly TreeEdge[]; inner: ReadonlyMap<string, readonly TreeRow[]> }, opts: SvgOpts = {}): { svg: string; layout: Layout } {
  const t = opts.t ?? ((s: string) => s);
  const L = layout(tree);
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const label = (id: string): string => t(byId.get(id)?.label ?? id);
  const fb = tree.edges.filter((e) => e.feedback);
  const height = L.height + (fb.length ? 14 + fb.length * 7 : 0);
  let k = 0;
  const edges = tree.edges.map((e) => {
    const { d, mx, my } = edgePath(e, L, e.feedback ? k++ : 0);
    const words = edgeWords(e, label);
    const mark = e.absent
      ? `<text class="mt-audit" x="${f(mx)}" y="${f(my - 3)}" text-anchor="middle">${esc(e.absent)}</text>`
      : e.cls === 'UNTAGGED' ? `<text class="mt-q" x="${f(mx)}" y="${f(my + 4)}" text-anchor="middle">?</text>` : '';
    return `<g class="mt-e${e.feedback ? ' mt-fb' : ''}" data-class="${e.cls}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-rows="${esc(e.rows.map((r) => r.id).join(' '))}"${e.absent ? ` data-absent="${esc(e.absent)}"` : ''} tabindex="0">`
      + `<title>${esc(words)}</title><path class="mt-hit" d="${d}"/><path class="mt-line" d="${d}" marker-end="url(#mt-arrow)"/>${mark}</g>`;
  });
  const nodes = tree.nodes.map((n) => {
    const p = L.at.get(n.id) as { x: number; y: number };
    return nodeSvg(n, p.x, p.y, t, tree.inner.get(n.id)?.length ?? 0, opts.about);
  });
  const root = byId.get(tree.root);
  const aria = `${t('Mechanism tree of')} ${root ? t(root.label) : tree.root}: ${tree.nodes.length} ${t('nodes')}, ${tree.edges.length} ${t('edges')}, ${fb.length} ${t('feedback')}, ${tree.edges.filter((e) => e.absent).length} ${t('absent')}`;
  const svg = `<svg class="mt-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(L.width)} ${f(height)}" width="${f(L.width)}" height="${f(height)}" role="img" aria-label="${esc(aria)}">`
    + '<defs><marker id="mt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path class="mt-head" d="M0 0L8 4L0 8z"/></marker></defs>'
    + `<g class="mt-edges">${edges.join('')}</g><g class="mt-nodes">${nodes.join('')}</g></svg>`;
  return { svg, layout: L };
}
