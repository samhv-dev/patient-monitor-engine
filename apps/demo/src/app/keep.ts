// Repainting in place. A browser sends `click` only when a press and its release land on the same node, so a repaint
// never replaces, removes or re-inserts a node a press or the focus can rest on unless what it stands for changed:
// WebKit takes the text node under the pointer as the pressed node, and every engine loses the press on an element
// that is replaced or taken out and put back, even at the same place.

const TEXT = 3; // Node.TEXT_NODE, also where no DOM is loaded

/** Writes `s` as the text of `at`, into its existing text node; nothing is written when the text is already `s`. */
export function setText(at: Element | Text, s: string): void {
  const t = at.nodeType === TEXT ? (at as Text) : at.firstChild;
  if (t?.nodeType === TEXT && (t === at || !t.nextSibling)) {
    if ((t as Text).data !== s) (t as Text).data = s;
  } else if (at.textContent !== s) at.textContent = s;
}

/** One item per key from `cache`, made once by `make` and kept while its key is wanted; the others are dropped. */
export function keyed<T>(cache: Map<string, T>, keys: readonly string[], make: (key: string, i: number) => T): T[] {
  const want = new Set(keys);
  for (const k of [...cache.keys()]) if (!want.has(k)) cache.delete(k);
  return keys.map((k, i) => {
    let x = cache.get(k);
    if (x === undefined) cache.set(k, (x = make(k, i)));
    return x;
  });
}

/**
 * Puts `into`'s children in the order of `want`. Children not in `want` go; the nodes on the longest run already in
 * order stay where they are, and only the others are moved (one insertBefore each).
 */
export function keepOrder(into: Element, want: readonly Element[]): void {
  const keep = new Set<Element>(want);
  for (const c of [...into.children]) if (!keep.has(c)) c.remove();
  const at = new Map<Element, number>(want.map((e, i) => [e, i]));
  const cur = [...into.children].map((c) => at.get(c) as number); // positions in `want` of the children there now
  // the longest increasing run of `cur` (patience sorting with back links): those children are already in order
  const tails: number[] = [];
  const prev = new Array<number>(cur.length).fill(-1);
  cur.forEach((v, i) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((cur[tails[mid] as number] as number) < v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1] as number;
    tails[lo] = i;
  });
  const stay = new Set<number>();
  for (let i = tails.length ? (tails[tails.length - 1] as number) : -1; i >= 0; i = prev[i] as number) stay.add(cur[i] as number);
  // from the end: each node not staying goes just before the next one in `want`
  for (let i = want.length - 1; i >= 0; i--) {
    const e = want[i] as Element;
    if (stay.has(i)) continue;
    const next = want[i + 1] ?? null;
    if (e.nextElementSibling !== next || e.parentElement !== into) into.insertBefore(e, next);
  }
}
