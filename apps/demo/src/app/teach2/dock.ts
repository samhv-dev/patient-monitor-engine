// The Instructor v2 dock (design §3.6, board "Proposal v6"): Tools on the left (the sheets' buttons, IP7), a divider, the
// three marks (good, bad, discuss) and the note field (IP7) in the centre, a divider, and Debrief at the far right.
// A mark saves the moment with today's bookmark command (`commands.ts` `bookmark`: the 6b driver can restore it), under
// its own label and counter ("Mark 2 at 08:20", plan R10), so the Log tab's bookmarks and the marks never share a name.
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import { clock, h, toast } from '../ui.ts';

export type MarkKind = 'good' | 'bad' | 'discuss';

const MARKS: ReadonlyArray<[MarkKind, string, string]> = [
  ['good', 'Mark: good', 'M7 11v10H3V11zM7 11l4-8c2 0 3 1 3 3v3h5a2 2 0 0 1 2 2l-1.5 8a2 2 0 0 1-2 2H7'],
  ['bad', 'Mark: bad', 'M17 13V3h4v10zM17 13l-4 8c-2 0-3-1-3-3v-3H5a2 2 0 0 1-2-2l1.5-8a2 2 0 0 1 2-2H17'],
  ['discuss', 'Mark: discuss', 'M4 5h16v11H9l-5 4z'],
];

let nMark = 0;
/** Save this moment as a mark of `kind`; resolves once the host answered (a toast either way). */
export async function mark(link: Link, kind: MarkKind): Promise<void> {
  const label = `Mark ${++nMark} at ${clock(link.simT)}`;
  // TODO(IP2): send `kind` with the bookmark (`{ ..., kind }`) once IP2 adds it to the scenario command; until then the
  // command is today's bookmark exactly, and `kind` only names the button
  void kind;
  const r = await link.send({ type: 'scenario', action: 'bookmark', target: label });
  toast(r.accepted ? `${label} saved` : 'Mark not saved', r.accepted ? 'info' : 'alert');
}

export interface Dock {
  el: HTMLElement;
  /** Where the sheets slot (IP7) puts the tool buttons and the note field. */
  tools: HTMLElement;
  note: HTMLElement;
  refresh(): void;
}

/** The dock: tool and note areas for IP7, the three marks, Debrief. */
export function mountDock(link: Link): Dock {
  const tools = h('div', { class: 'ip2-dock-tools', role: 'group', 'aria-label': 'Tools' });
  const note = h('div', { class: 'ip2-dock-note' });
  const marks = MARKS.map(([kind, label, d]) => {
    const b = h('button', { type: 'button', class: 'ip2-dock-btn ip2-mark', 'data-kind': kind, 'aria-label': label, title: `${label.slice(6)}: saves the moment, returnable, on the debrief timeline`, onclick: () => void mark(link, kind) });
    b.innerHTML = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${d}"/></svg>`;
    return b;
  });
  const debrief = h('a', { class: 'ip2-dock-btn ip2-debrief', href: hrefOf('debrief') }, 'Debrief');
  const el = h('footer', { class: 'ip2-dock', 'aria-label': 'Dock' },
    h('span', { class: 'ip2-dock-label', 'aria-hidden': 'true' }, 'Tools'),
    tools,
    h('span', { class: 'ip2-dock-div', 'aria-hidden': 'true' }),
    h('span', { class: 'ip2-dock-mid' }, h('span', { class: 'ip2-dock-marks', role: 'group', 'aria-label': 'Marks' }, ...marks), note),
    h('span', { class: 'ip2-dock-div', 'aria-hidden': 'true' }),
    debrief);
  return {
    el, tools, note,
    // Debrief is lit once the case has ended (as today's session-bar link)
    refresh: () => {
      const sv = link.ctl.scenario;
      debrief.dataset.ready = String(!!sv.doc && !sv.current()?.transitions?.length);
    },
  };
}
