// For DOM tests: which of the controls a repaint disturbed under a held press. A control is disturbed when the repaint
// takes out the control itself or a node that holds it (even to put it back at once), or takes out a node inside it
// (a replaced text node ends a press resting on it in WebKit, a replaced icon in every engine).

const who = (c: Element): string => `${c.tagName.toLowerCase()}${c.className && typeof c.className === 'string' ? `.${c.className.trim().split(/\s+/).join('.')}` : ''} "${(c.textContent ?? '').trim().slice(0, 40)}"`;

export async function disturbed(controls: readonly Element[], repaint: () => unknown): Promise<string[]> {
  if (!controls.length) throw new Error('no controls to hold');
  const root = controls[0]!.ownerDocument;
  const recs: MutationRecord[] = [];
  const mo = new MutationObserver((rs) => void recs.push(...rs));
  mo.observe(root, { childList: true, subtree: true });
  const focused = root.activeElement;
  await repaint();
  recs.push(...mo.takeRecords());
  mo.disconnect();
  const out = controls.filter((c) => recs.some((r) => r.removedNodes.length > 0 && (c === r.target || c.contains(r.target) || [...r.removedNodes].some((n) => n === c || n.contains(c))))).map(who);
  if (focused && focused !== root.body && root.activeElement !== focused) out.push(`focus left ${who(focused)}`);
  return out;
}

/** How many changes a repaint made to each live region: to its text or children (a rewrite with the same text counts),
 *  or by taking the region out (a new node with the same words is announced again). */
export async function liveWrites(regions: readonly Element[], repaint: () => unknown): Promise<number[]> {
  if (!regions.length) throw new Error('no live regions');
  const n = regions.map(() => 0);
  const hits = (e: Element, r: MutationRecord) => e === r.target || e.contains(r.target) || [...r.removedNodes].some((x) => x === e || x.contains(e));
  const count = (rs: MutationRecord[]) => rs.forEach((r) => regions.forEach((e, i) => void (hits(e, r) && (n[i] = (n[i] ?? 0) + 1))));
  const mo = new MutationObserver(count);
  mo.observe(regions[0]!.ownerDocument, { childList: true, characterData: true, subtree: true });
  await repaint();
  count(mo.takeRecords());
  mo.disconnect();
  return n;
}
