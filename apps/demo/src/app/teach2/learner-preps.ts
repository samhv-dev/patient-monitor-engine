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
import type { Finding, Formulary, InstructorPrepNews, InstructorPrepView, Source } from '@pme/controller';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { sourceText } from '../remote/bench.ts';
import { FINDING_WORDS } from '../remote/tray.ts';
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
  noStatement: 'no statement in the formulary',
  noSource: 'no source speaks',
  refused: (why: string) => `Notice not shown: ${why}`,
  /** The header's count: preparations with a finding whose notice has not been shown. */
  count: (n: number) => `${n} ${n === 1 ? 'preparation' : 'preparations'} to look at`,
  countAria: (n: number) => `${n} learner ${n === 1 ? 'preparation' : 'preparations'} with a finding, notice not shown`,
} as const;

/** Where a preparation is: on the tray, given (a bolus or an infusion from it), or discarded; with the time. */
export interface BoardEntry {
  prep: InstructorPrepView;
  /** Case time of the first delivery or infusion from it (null: not given). */
  givenAt: number | null;
  discardedAt: number | null;
}

/** The instructor's copy of every learner preparation of this timeline, from the host's `prep` news, in staging order. */
export class PrepBoard {
  private readonly m = new Map<string, BoardEntry>();
  /** Take one InstructorPrepNews at case time `t`. */
  apply(n: InstructorPrepNews, t: number): void {
    const key = `${n.prep.by}|${n.prep.id}`;
    const was = this.m.get(key);
    // the host's own given time (a phone that signed in late gets it too), else the delivery news' time
    const e: BoardEntry = { prep: n.prep, givenAt: n.prep.givenAt ?? was?.givenAt ?? null, discardedAt: was?.discardedAt ?? null };
    if ((n.news === 'delivered' || n.news === 'infusing') && e.givenAt === null) e.givenAt = t;
    if (n.news === 'discarded') e.discardedAt = t;
    this.m.set(key, e);
  }
  /** A restart or a bookmark restore: the host's table went with the old engine (host-session newTimeline). */
  clear(): void {
    this.m.clear();
  }
  get entries(): BoardEntry[] {
    return [...this.m.values()];
  }
  /** Preparations with a finding, on the tray, whose notice has not been shown: the header's count. */
  get waiting(): number {
    return this.entries.filter((e) => e.prep.findings.length > 0 && !e.prep.notice && e.discardedAt === null).length;
  }
}

const fmt = (x: number): string => String(+x.toPrecision(3));
/** "Sodium bicarbonate 8.4 mmol + Epinephrine 1 mg, one syringe, 11 mL" (the host's figures). */
export function whatText(p: InstructorPrepView, f: Formulary | null): string {
  const drugs = p.actives.map((a) => `${drugName(a.drugId)} ${fmt(a.amount)} ${a.unit === 'mcg' ? 'µg' : a.unit}`).join(' + ');
  const diluent = p.diluent ? ` in ${f?.diluents[p.diluent.id]?.name ?? p.diluent.id}` : '';
  const where = p.container === 'syringe-pp' ? 'one syringe' : p.container === 'vial' ? 'in the vial' : p.container ? 'one bag' : null;
  return [`${drugs}${diluent}`, where, `${fmt(p.volumeMl)} mL`].filter(Boolean).join(', ');
}

/** "p. 350" for a page number; a page the reader wrote out ("PDF p. 1859 (page stamp 1839)") as written. */
const pageText = (page: number | string): string => (typeof page === 'number' || /^\d+$/.test(page) ? `p. ${page}` : page);

/** Trissel 2013's reading of the statement behind a finding, as the card says it ("Trissel 2013 p. 1859 agrees"). */
function crossText(x: Finding, f: Formulary): string | null {
  const e = f.drugs[x.drugId];
  const st = x.against === 'diluent' ? e?.diluents.find((d) => d.id === x.other)?.compat : e?.admixtures.find((a) => a.with === x.other && a.src === x.src);
  const c = st?.crossCheck;
  if (!c) return null;
  if (c.trissel === 'not listed') return 'not in Trissel 2013';
  const s = c.src ? f.sources[c.src] : undefined;
  const page = s?.kind === 'trissel' ? ` ${pageText(s.page)}` : '';
  return `Trissel 2013${page} ${c.trissel}${c.trissel === 'differs' && c.ruling ? `; the entry follows ${c.ruling.follows}` : ''}`;
}

/** "(Stabilis 3642; Trissel 2013 p. 1859 agrees)" for a finding; its source key alone while the formulary is not loaded. */
export function sourcesText(x: Finding, f: Formulary | null): string {
  if (x.src === null) return `(${PREPS_WORDS.noSource})`;
  if (!f) return `(${x.src})`;
  const s: Source | undefined = f.sources[x.src];
  const main = s?.kind === 'trissel' ? `Trissel 2013 ${pageText(s.page)}` : sourceText(s, x.src);
  const cross = s?.kind === 'trissel' ? null : crossText(x, f);
  return `(${[main, cross].filter(Boolean).join('; ')})`;
}

/** One finding: "Incompatible: <statement> (<sources>)". */
function findingRow(x: Finding, f: Formulary | null): HTMLElement {
  return h('li', { class: 'lp-finding', 'data-kind': x.kind },
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
  const list = h('ul', { class: 'lp-list' });
  const cleanSum = h('summary', { class: 'lp-clean-sum' });
  const cleanList = h('ul', { class: 'lp-clean-list' });
  const clean = h('details', { class: 'lp-clean' }, cleanSum, cleanList);
  const el = h('section', { class: `lp${o.inline ? ' lp-inline' : ''}`, 'aria-label': PREPS_WORDS.title, hidden: true }, list, clean);
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
      ? h('p', { class: 'lp-shown', role: 'status' }, PREPS_WORDS.shownAt(p.notice.shownAt))
      : h('button', { type: 'button', class: 'lp-show', 'data-prep': p.id, disabled: pending.has(key), onclick: () => void press(e) }, pending.has(key) ? PREPS_WORDS.showing : PREPS_WORDS.show);
    return h('li', { class: 'lp-card', 'data-prep': p.id, 'data-by': p.by },
      h('p', { class: 'lp-what' }, h('strong', {}, PREPS_WORDS.staged(p.name ?? PREPS_WORDS.unnamed)), ` ${whatText(p, f)}`),
      h('ul', { class: 'lp-findings' }, ...p.findings.map((x) => findingRow(x, f))),
      fate ? h('p', { class: 'lp-fate' }, fate) : null,
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
    cleanList.replaceChildren(...plain.map((e) => h('li', { class: 'lp-clean-row', 'data-prep': e.prep.id },
      h('strong', {}, PREPS_WORDS.staged(e.prep.name ?? PREPS_WORDS.unnamed)), ` ${whatText(e.prep, f)}`,
      e.givenAt !== null ? ` · ${PREPS_WORDS.given(e.givenAt)}` : '')));
  };
  const off = link.onChange(draw);
  draw();
  return { el, refresh: draw, destroy: off };
}
