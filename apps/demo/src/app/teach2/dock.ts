// The Instructor v2 dock (design §3.6, board "Proposal v6"): Tools on the left (the sheets' buttons), a divider, the
// three marks (good, bad, discuss) and the note field in the centre, a divider, and Debrief at the far right, with
// "Finish the case" just before it (board "Finish 2", teach2/finish.ts) while a card runs on the host.
// A mark saves the moment with today's bookmark command (`commands.ts` `bookmark`: the 6b driver can restore it), under
// its own label and counter ("Mark 2 at 08:20", plan R10), so the Log tab's bookmarks and the marks never share a name.
// It carries its kind (IP2's `kind`) and, when the note field (filled by the sheets slot) holds text, that text as
// its note (IP2's `note`); the field is then cleared (answer 13).
import { isV2, type MarkKind as ControllerMarkKind } from '@pme/controller';
import { CASE_FINISHED } from '../debrief.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import { clock, h, toast } from '../ui.ts';

/** The kinds of the instructor's marks: the controller's `MarkKind` without the driver's own `stage`. */
type MarkKind = Exclude<ControllerMarkKind, 'stage'>;

/** The three marks: kind, words, icon (a 24-unit path; the Debrief's course strip draws the same icons). */
export const MARKS: ReadonlyArray<[MarkKind, string, string]> = [
  ['good', 'Mark: good', 'M7 11v10H3V11zM7 11l4-8c2 0 3 1 3 3v3h5a2 2 0 0 1 2 2l-1.5 8a2 2 0 0 1-2 2H7'],
  ['bad', 'Mark: bad', 'M17 13V3h4v10zM17 13l-4 8c-2 0-3-1-3-3v-3H5a2 2 0 0 1-2-2l1.5-8a2 2 0 0 1 2-2H17'],
  ['discuss', 'Mark: discuss', 'M4 5h16v11H9l-5 4z'],
];

let nMark = 0;
/** The kind of every mark this document saved, by label (the controller keeps the labels only): the Log sheet's list. */
export const MARK_KINDS = new Map<string, MarkKind>();

/** Save this moment as a mark of `kind`, with `note` when one is given; resolves once the host answered (a toast either
 *  way). Today's bookmark command plus IP2's `kind` and `note`. */
export async function mark(link: Link, kind: MarkKind, note = ''): Promise<void> {
  const label = `Mark ${++nMark} at ${clock(link.simT)}`;
  const r = await link.send({ type: 'scenario', action: 'bookmark', target: label, kind, ...(note ? { note } : {}) });
  if (r.accepted) MARK_KINDS.set(label, kind);
  toast(r.accepted ? `${label} saved` : 'Mark not saved', r.accepted ? 'info' : 'alert');
}

/** The note field's text, trimmed, and the field cleared ('' when there is no field or it is empty). */
function takeNote(area: HTMLElement): string {
  const f = area.querySelector<HTMLInputElement>('input.ip2-note-field');
  const text = f?.value.trim() ?? '';
  if (f) f.value = '';
  return text;
}

export interface Dock {
  el: HTMLElement;
  /** Where the sheets slot puts the tool buttons and the note field. */
  tools: HTMLElement;
  note: HTMLElement;
  refresh(): void;
}

/** The instructor's end of a /2 case: the note "Finish the case" (teach2/finish.ts) writes into the record (the
 *  Debrief's timeline and the Log) when one of its buttons saves the debrief of a /2 card; the Debrief grades final
 *  once it stands (debrief.ts runEnded). */
export const FINISHED = CASE_FINISHED;

/** Has the instructor finished the running case on this host: a "Case finished" note, not undone by a return, since
 *  the last load? (A follower keeps no record: false.) */
export function caseFinished(link: Link): boolean {
  const rows = link.host?.record.data.rows ?? [];
  let from = 0;
  rows.forEach((r, i) => {
    if (r.kind === 'scenario' && r.text.startsWith('Scenario loaded')) from = i + 1;
  });
  return rows.slice(from).some((r) => r.kind === 'note' && r.text === FINISHED && r.undone === undefined);
}

/** The Debrief "ready" flag of a /2 card (design §6, Q11: failed at the phase's end or the run's end): the case is in
 *  one of its end phases (a phase with no next: F2's ended()), or the instructor finished it. */
export const readyV2 = (link: Link): boolean => link.ctl.scenario.ended() || caseFinished(link);

/** The dock: the tool and note areas the sheets slot fills, the three marks, Finish (`o.finish`, while `o.canFinish()`),
 *  Debrief. */
export function mountDock(link: Link, o: { finish?(): void; canFinish?(): boolean; finishing?(): boolean } = {}): Dock {
  const tools = h('div', { class: 'ip2-dock-tools', role: 'group', 'aria-label': 'Tools' });
  const note = h('div', { class: 'ip2-dock-note' });
  const marks = MARKS.map(([kind, label, d]) => {
    const b = h('button', { type: 'button', class: 'ip2-dock-btn ip2-mark', 'data-kind': kind, 'aria-label': label, title: `${label.slice(6)}: saves the moment, returnable, on the debrief timeline`, onclick: () => void mark(link, kind, takeNote(note)) });
    b.innerHTML = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${d}"/></svg>`;
    return b;
  });
  const debrief = h('a', { class: 'ip2-dock-btn ip2-debrief', href: hrefOf('debrief') }, 'Debrief');
  const finish = h('button', { type: 'button', class: 'ip2-dock-btn ip2-finish-btn', 'aria-pressed': 'false', hidden: true, title: 'Stops the clock; the debrief is saved when you choose how the case ends', onclick: () => o.finish?.() }, 'Finish the case');
  const el = h('footer', { class: 'ip2-dock', 'aria-label': 'Dock' },
    h('span', { class: 'ip2-dock-label', 'aria-hidden': 'true' }, 'Tools'),
    tools,
    h('span', { class: 'ip2-dock-div', 'aria-hidden': 'true' }),
    h('span', { class: 'ip2-dock-mid' }, h('span', { class: 'ip2-dock-marks', role: 'group', 'aria-label': 'Marks' }, ...marks), note),
    h('span', { class: 'ip2-dock-div', 'aria-hidden': 'true' }),
    finish,
    debrief);
  return {
    el, tools, note,
    // Debrief is lit once the case has ended (as today's session-bar link); a /2 card: an end phase or Finish the case
    refresh: () => {
      const sv = link.ctl.scenario;
      const v2 = !!sv.doc && isV2(sv.doc);
      debrief.dataset.ready = String(v2 ? readyV2(link) : !!sv.doc && !sv.current()?.transitions?.length);
      finish.hidden = !o.canFinish?.();
      finish.setAttribute('aria-pressed', String(!!o.finishing?.()));
    },
  };
}
