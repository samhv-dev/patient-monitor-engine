// Plan learner-action-remote.md L9 (§4 D7; LQ3 ruled 9 November): what the learner remotes have prepared, as the
// INSTRUCTOR sees it, on the laptop's dock (Instructor v2) and on the instructor's phone (views/remote.ts mounts the same
// card). The host sends its own screens and the granted instructors the whole preparation, its findings and the device
// that staged it (the `prep` event addressed to the host's own id: InstructorPrepNews); the Link keeps them here
// (PrepBoard). A preparation with a finding gets a card at once: "Bed 2 remote staged <what> · Incompatible: <the
// entry's statement> (<its source>; <Trissel's cross-check>)" and ONE control, "Show the incompatibility notice to the
// learner" (`prep notice {by, prepId}`, instructor-only): the learner's phone then sounds its tone and shows the finding
// (remote/tray.ts, L7), and the card reads "Notice shown at mm:ss". There is no remove and no let-stand: the preparation
// stays the learner's; a Give before the press is given, and the card says "given at mm:ss, notice not shown". Clean
// preparations are listed collapsed ("3 preparations, no finding"). Nothing here warns the learner (LQ3).
import type { Finding, Formulary, InstructorPrepView } from '@pme/controller';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { FINDING_WORDS, NO_SOURCE, NO_STATEMENT, sourcesText } from '../prep-words.ts';
import type { BoardEntry } from './prep-board.ts';
import { clock, h, setText, toast } from '../ui.ts';
import './learner-preps.css';

/** The card's words (English chrome: the owner rules the words; keys, so a translation table can hold them). */
export const PREPS_WORDS = {
  title: 'Learner preparations',
  staged: (who: string) => `${who} remote staged`,
  unnamed: 'A learner',
  show: 'Show the incompatibility notice to the learner',
  showing: 'Showing the notice…',
  shownAt: (t: number) => `Notice shown at ${clock(t)}`,
  notShown: 'notice not shown',
  given: (t: number) => `given at ${clock(t)}`,
  givenAt: (t: number, notice: string) => `given at ${clock(t)}, ${notice}`,
  discardedAt: (t: number) => `discarded at ${clock(t)}`,
  clean: (n: number) => `${n} ${n === 1 ? 'preparation' : 'preparations'}, no finding`,
  noStatement: NO_STATEMENT,
  noSource: NO_SOURCE,
  refused: (why: string) => `Notice not shown: ${why}`,
  /** The header's count: preparations with a finding whose notice has not been shown. */
  count: (n: number) => `${n} ${n === 1 ? 'preparation' : 'preparations'} to look at`,
  countAria: (n: number) => `${n} learner ${n === 1 ? 'preparation' : 'preparations'} with a finding, notice not shown`,
} as const;

export { PrepBoard, type BoardEntry } from './prep-board.ts';

const fmt = (x: number): string => String(+x.toPrecision(3));
/** What was staged, in the host's figures: "Sodium bicarbonate 8.4 % 10 mmol + Epinephrine 1 mg, one syringe, 11 mL". */
export function whatText(p: InstructorPrepView, f: Formulary | null): string {
  const drugs = p.actives.map((a) => `${drugName(a.drugId)} ${fmt(a.amount)} ${a.unit === 'mcg' ? 'µg' : a.unit}`).join(' + ');
  const diluent = p.diluent ? ` in ${f?.diluents[p.diluent.id]?.name ?? p.diluent.id}` : '';
  const where = p.container === 'syringe-pp' ? 'one syringe' : p.container === 'vial' ? 'in the vial' : p.container ? 'one bag' : null;
  return [`${drugs}${diluent}`, where, `${fmt(p.volumeMl)} mL`].filter(Boolean).join(', ');
}

export { sourcesText } from '../prep-words.ts'; // L13: one DOM-free place for the naming of sources

/** One finding: "Incompatible: <statement> (<sources>)". */
function findingRow(x: Finding, f: Formulary | null): HTMLElement {
  return h('li', { class: 'ip2-lp-finding', 'data-kind': x.kind },
    h('strong', {}, FINDING_WORDS[x.kind]), `: ${x.statement ?? PREPS_WORDS.noStatement} ${sourcesText(x, f)}`);
}

export interface LearnerPreps {
  el: HTMLElement;
  refresh(): void;
  destroy(): void;
}

/**
 * The card on `link` (the laptop's Link or the phone's). `formulary` names the sources (null until loaded: the source
 * keys are shown). It redraws on the Link's own change, at once, not on the view's 2 Hz repaint: a staging shows within
 * the host tick that sent it. `inline`: the phone's panel (in the page's flow) rather than over the dock.
 */
export function mountLearnerPreps(link: Link, o: { formulary(): Formulary | null; inline?: boolean }): LearnerPreps {
  const list = h('ul', { class: 'ip2-lp-list' });
  const cleanSum = h('summary', { class: 'ip2-lp-clean-sum' });
  const cleanList = h('ul', { class: 'ip2-lp-clean-list' });
  const clean = h('details', { class: 'ip2-lp-clean' }, cleanSum, cleanList);
  const el = h('section', { class: `ip2-lp${o.inline ? ' ip2-lp-inline' : ''}`, 'aria-label': PREPS_WORDS.title, hidden: true }, list, clean);
  const pending = new Set<string>(); // presses sent and not answered
  let drawn = '';

  const press = async (e: BoardEntry): Promise<void> => {
    const key = `${e.prep.by}|${e.prep.id}`;
    if (pending.has(key)) return;
    pending.add(key);
    draw();
    try {
      const r = await link.send({ type: 'prep', action: 'notice', by: e.prep.by, prepId: e.prep.id });
      if (!r.accepted) toast(PREPS_WORDS.refused(r.reason ?? 'refused'), 'alert');
    } finally {
      pending.delete(key);
      draw();
    }
  };

  const card = (e: BoardEntry, f: Formulary | null): HTMLElement => {
    const p = e.prep;
    const key = `${p.by}|${p.id}`;
    const fate = e.discardedAt !== null ? PREPS_WORDS.discardedAt(e.discardedAt)
      : e.givenAt !== null ? PREPS_WORDS.givenAt(e.givenAt, p.notice && p.notice.shownAt <= e.givenAt ? PREPS_WORDS.shownAt(p.notice.shownAt).toLowerCase() : PREPS_WORDS.notShown) : null;
    const control = p.notice
      ? h('p', { class: 'ip2-lp-shown', role: 'status' }, PREPS_WORDS.shownAt(p.notice.shownAt))
      : h('button', { type: 'button', class: 'ip2-lp-show', 'data-prep': p.id, disabled: pending.has(key), onclick: () => void press(e) }, pending.has(key) ? PREPS_WORDS.showing : PREPS_WORDS.show);
    return h('li', { class: 'ip2-lp-card', 'data-prep': p.id, 'data-by': p.by },
      h('p', { class: 'ip2-lp-what' }, h('strong', {}, PREPS_WORDS.staged(p.name ?? PREPS_WORDS.unnamed)), ` ${whatText(p, f)}`),
      h('ul', { class: 'ip2-lp-findings' }, ...p.findings.map((x) => findingRow(x, f))),
      fate ? h('p', { class: 'ip2-lp-fate' }, fate) : null,
      control);
  };

  const draw = (): void => {
    const f = o.formulary();
    const all = link.preps?.entries ?? []; // a test's partial Link has no board
    const flagged = all.filter((e) => e.prep.findings.length > 0);
    const plain = all.filter((e) => e.prep.findings.length === 0 && e.discardedAt === null);
    // redrawn only when what it shows changed: a button under the pointer or the focus stays the same element
    const sig = JSON.stringify([all, [...pending], f !== null]);
    if (sig === drawn) return;
    drawn = sig;
    el.hidden = flagged.length === 0 && plain.length === 0;
    list.replaceChildren(...flagged.map((e) => card(e, f)));
    clean.hidden = plain.length === 0;
    setText(cleanSum, PREPS_WORDS.clean(plain.length));
    cleanList.replaceChildren(...plain.map((e) => h('li', { class: 'ip2-lp-clean-row', 'data-prep': e.prep.id },
      h('strong', {}, PREPS_WORDS.staged(e.prep.name ?? PREPS_WORDS.unnamed)), ` ${whatText(e.prep, f)}`,
      e.givenAt !== null ? ` · ${PREPS_WORDS.given(e.givenAt)}` : '')));
  };
  const off = link.onChange(draw);
  draw();
  return { el, refresh: draw, destroy: off };
}
