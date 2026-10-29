// Instructor v2, the ACTION slot (design §3.4, §3.5, board "Proposal v6"; plan IP6; answers 4–8, 20): one list of pills
// for the current stage, in the card's order (steps, judged objectives numbered on, automatic rows), each with a key
// box, a title and subtitle and a right-hand label, in the five looks of the row-state table (rows.ts classifies them).
// A step's press is IP3's `pressStep` (exactly what today's state button sends), a judged objective's is `judge` (what
// ticking today's checkbox writes); digits 1–9 press the numbered rows. No row is ever disabled: a look never stops a
// press. Under the list, two folds: "Off the card" (the off-card actions of this stage, from the log) and "Finished
// steps · n" (closed by default), then the foot line. Rows are kept by key across the ≤ 2 Hz repaint, so a press or the
// keyboard focus is never lost to a redraw.
import './action.css';
import { asV1 } from '@pme/controller';
import type { Link } from '../link.ts';
import { clock, h, setText } from '../ui.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';
import { judge, pressStep } from './press.ts';
import { classify, type HoldLike, type LiveRow } from './rows.ts';
import { historyOf } from './course.ts';

export const FOOT = 'No penalty comes from the panel. Consequences come from the physiology, and the debrief records overdue, out of order, failed and not done, each with the time and the order it was due.';

/** The row's identity across repaints: its stage, its kind and its place in the card. */
const keyOf = (r: LiveRow): string => `${r.stage}|${r.row.kind}|${r.row.kind === 'judged' ? r.row.objective : r.row.index}`;

interface Pill {
  el: HTMLElement;
  key: HTMLElement;
  title: HTMLElement;
  sub: HTMLElement;
  right: HTMLElement;
  fill: HTMLElement | null;
  live: LiveRow;
}

/** The host's hold progress (`ScenarioDriver.vitalHolds()`, answer 8): every `vital` rule of the current state with
 *  the runner's own hold fraction. A follower has no driver: null, and its bars show value against threshold only. */
const holdsOf = (link: Link): readonly HoldLike[] | null => link.host?.driver.vitalHolds() ?? null;

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link, keys } = ctx;
  const press = (p: Pill) => {
    const r = p.live.row;
    if (r.kind === 'step') void pressStep(link, r.label);
    else if (r.kind === 'judged') judge(link, r.text);
  };

  const pill = (live: LiveRow, inFinished: boolean): Pill => {
    const pressable = !inFinished && live.row.kind !== 'auto';
    const key = h('span', { class: 'ip2-key', 'aria-hidden': 'true' });
    const title = h('b', { class: 'ip2-row-title' });
    const sub = h('span', { class: 'ip2-row-sub' });
    const fill = live.row.kind === 'auto' && !inFinished ? h('span', { class: 'ip2-bar-fill' }) : null;
    const right = h('span', { class: 'ip2-row-right' });
    const text = h('span', { class: 'ip2-row-text' }, title, sub, fill ? h('span', { class: 'ip2-bar', 'aria-hidden': 'true' }, fill) : null);
    const p: Pill = { el: h(pressable ? 'button' : 'div', { class: 'ip2-row', ...(pressable ? { type: 'button' } : {}) }, key, text, right), key, title, sub, right, fill, live };
    if (pressable) p.el.addEventListener('click', () => press(p));
    return p;
  };
  const paint = (p: Pill, live: LiveRow) => {
    p.live = live;
    const r = live.row;
    const n = r.kind === 'auto' ? 'A' : String(r.n);
    p.el.dataset.look = live.look;
    p.el.dataset.kind = r.kind;
    if (live.overdue !== null) p.el.dataset.overdue = 'true';
    else delete p.el.dataset.overdue;
    setText(p.key, n);
    setText(p.title, r.title);
    setText(p.sub, live.subtitle);
    // one line each on screen (the page fits 1440 × 900 at the fan-out): the whole text on hover and in the aria-label
    p.el.title = `${r.title}\n${live.subtitle}`;
    setText(p.right, live.right);
    if (p.fill) p.fill.style.width = `${Math.round((live.progress ?? 0) * 100)}%`;
    if (p.el instanceof HTMLButtonElement) {
      if (r.kind !== 'auto' && r.n <= 9) p.el.setAttribute('aria-keyshortcuts', n);
      p.el.setAttribute('aria-label', `${n}. ${r.title}. ${live.subtitle}. ${live.right}`);
    }
  };

  const list = h('ol', { class: 'ip2-rows', 'aria-label': 'Steps and rules of this stage' });
  const offSummary = h('summary', {});
  const offList = h('ul', { class: 'ip2-offcard-list' });
  const offCard = h('details', { class: 'ip2-fold ip2-offcard' }, offSummary, offList);
  const finSummary = h('summary', {});
  const finList = h('ol', { class: 'ip2-rows ip2-finished-list', 'aria-label': 'Finished steps' });
  const finished = h('details', { class: 'ip2-fold ip2-finished' }, finSummary, finList);
  const empty = h('p', { class: 'ip2-empty' }, 'No scenario is running. Load a case from the Scenarios view; its steps appear here.');
  const foot = h('p', { class: 'ip2-foot' }, FOOT);
  el.replaceChildren(h('div', { class: 'ip2-list' }, empty, list, offCard, finished, foot));

  const pills = new Map<string, Pill>();
  const finPills = new Map<string, Pill>();
  const base = new Map<string, number>();
  let docV = -1;

  /** Keep each row's element across repaints; put them in order without moving a node that is already in place. */
  const sync = (into: HTMLElement, cache: Map<string, Pill>, rows: readonly LiveRow[], inFinished: boolean, keyFn: (r: LiveRow) => string) => {
    const want: HTMLElement[] = [];
    const seen = new Set<string>();
    for (const live of rows) {
      const k = keyFn(live);
      seen.add(k);
      let p = cache.get(k);
      if (!p) cache.set(k, (p = pill(live, inFinished)));
      paint(p, live);
      want.push(p.el);
    }
    for (const k of [...cache.keys()]) if (!seen.has(k)) cache.delete(k);
    const items = [...into.children].map((li) => li.firstElementChild);
    if (items.length !== want.length || items.some((x, i) => x !== want[i])) into.replaceChildren(...want.map((p) => h('li', {}, p)));
  };

  const setDigits = (rows: readonly LiveRow[]) => {
    for (let n = 1; n <= 9; n++) {
      const live = rows.find((r) => r.row.kind !== 'auto' && r.row.n === n);
      const p = live ? pills.get(keyOf(live)) : undefined;
      keys.digit(n, p ? () => press(p) : null);
    }
  };

  const refresh = () => {
    const sv = link.ctl.scenario;
    const doc = asV1(sv.doc); // a pme-scenario/2 card: no rows until F6
    const stateId = sv.stateId;
    if (docV !== sv.docVersion) {
      docV = sv.docVersion;
      base.clear();
    }
    empty.hidden = !!doc;
    list.hidden = offCard.hidden = finished.hidden = !doc;
    if (!doc || !stateId) {
      sync(list, pills, [], false, keyOf);
      sync(finList, finPills, [], true, keyOf);
      setDigits([]);
      return;
    }
    const board = classify({
      doc, stateId, history: historyOf(link), enteredT: sv.enteredT, simT: link.simT, inState: sv.timeInState(link.simT),
      paused: link.ctl.hostPaused, log: link.log, record: link.host?.record.data ?? null,
      values: link.ctl.state?.values as Partial<Record<string, number>> | undefined, holds: holdsOf(link), base,
    });
    sync(list, pills, board.list, false, keyOf);
    sync(finList, finPills, board.finished, true, (r) => `${keyOf(r)}|${r.look}|${r.at}`);
    setDigits(board.list);
    setText(finSummary, `Finished steps · ${board.finished.length}`);
    setText(offSummary, `Off the card · ${board.offCard.length}`);
    const offs = board.offCard.map((x) => `${x.simT === null ? '' : clock(x.simT)} ${x.text}${x.kind === 'learner' ? ' (learner)' : ''}`.trim());
    if (offList.children.length !== offs.length || offs.some((t, i) => offList.children[i]?.textContent !== t)) {
      offList.replaceChildren(...(offs.length ? offs.map((t) => h('li', {}, t)) : [h('li', { class: 'ip2-muted' }, 'Nothing off the card in this stage. Anything a sheet gives that is not a card step is logged here; the card does not move.')]));
    }
  };

  return {
    refresh,
    destroy: () => {
      for (let n = 1; n <= 9; n++) keys.digit(n, null);
    },
  };
}

