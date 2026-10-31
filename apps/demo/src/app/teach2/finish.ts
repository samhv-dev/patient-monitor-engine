// "Finish the case" in Instructor v2 (the owner's board "Finish 2", approved 30 October). The dock's button pauses the
// clock (today's `time pause`, as the pill sends it) and ACTION becomes this pane: the card and the time the clock stopped
// at, the Resident field (the name goes into the debrief's print header, the PDF and the learner handout), the run's
// objective and mark counts, three buttons, and the archive under them. Nothing is written until a button is pressed:
// Esc (or the field's Esc) gives the clock back as the pane found it, and a resume from anywhere else (the pill, Space,
// a Remote) closes the pane too. Every button first writes the debrief to the browser's archive (archive.ts; a second
// save of one run replaces its entry), then: "Save and restart the case" loads the same card again from 0:00 through the
// app's hook (main.ts: a fresh engine, the room kept) and clears the field for the next name; "Debrief now" opens the
// Debrief view on the saved debrief, the case still paused; "Save and close" ends the case through the app's hook (the
// default patient, the no-case window's three cards). A restart or a close leaves the new patient running. If the archive cannot be
// written (storage full or blocked) nothing ends and the pane stays.
import './finish.css';
import { isV2 } from '@pme/controller';
import { archive, hhmm, markCounts, marksLine, objectiveCounts, objectivesLine } from '../archive.ts';
import type { Link } from '../link.ts';
import { APP_BUILD } from '../position.ts';
import { cardOf } from '../scenarios.ts';
import { clock, h, setText, toast } from '../ui.ts';
import { archiveHref, archiveList, entryTitle, exportAll } from '../views/archive-list.ts';
import type { Teach2Ctx } from './ctx.ts';
import { caseFinished, FINISHED } from './dock.ts';

/** What the app does at the end of a case (main.ts): load the same card again with the room kept (false: refused), or
 *  end it (the page's default patient, no card). */
export interface FinishHooks {
  restart(): boolean;
  close(): void;
}

export interface Finish {
  /** The pane is open (the clock stopped, nothing written yet). */
  readonly open: boolean;
  /** The dock's button is offered: a card runs on this page's host and the app gave the end-of-case hooks. */
  can(): boolean;
  /** The dock's press. */
  start(): void;
  /** Before every repaint: a resume from elsewhere, or a case ended elsewhere, closes the pane (nothing written). */
  watch(): void;
  refresh(): void;
  destroy(): void;
}

export const LEAD_TAIL = 'the clock stops here. The debrief is written now, with every step, mark and verdict, and kept in this browser’s archive until you clear it. A reload after “Save and close” returns to the empty window; after “Save and restart” it restores the new run.';
export const NOTE = '“Save and restart the case” saves the debrief and starts the same card again from its first stage with fresh physiology; the room setup stays as it is (skin, devices, probes, phones). Changing or resetting the room is its own window in the sidebar, Room setup.';
export const NOT_SAVED = 'The debrief could not be saved: this browser’s storage is full or blocked. Export the archive and clear it on the Debrief page, then try again.';

const time = (link: Link, action: 'pause' | 'resume') => link.send({ type: 'time', action });

/** Mount the pane into `el` (inside ACTION); `repaint` paints the view now. */
export function mountFinish(el: HTMLElement, ctx: Teach2Ctx, repaint: () => void, hooks?: FinishHooks): Finish {
  const { link } = ctx;
  let open = false;
  let busy = false;
  /** The pane paused the clock (it resumes it on Esc); a case already paused stays paused. */
  let pausedByUs = false;
  /** The host has been seen paused since the pane opened (a resume after that closes it). */
  let sawPaused = false;

  const field = h('input', { type: 'text', class: 'ip2-finish-resident', autocomplete: 'off', spellcheck: 'false', placeholder: 'Name, as it should print' });
  const lead = h('p', { class: 'ip2-finish-lead' });
  const objV = h('span', { class: 'ip2-finish-v' });
  const marksV = h('span', { class: 'ip2-finish-v' });
  const saved = h('p', { class: 'ip2-finish-saved', role: 'status', hidden: true });
  const btn = (cls: string, label: string, act: () => void) => h('button', { type: 'button', class: cls, onclick: () => void (busy || act()) }, label);
  const count = h('span', { class: 'ip2-arc-count' });
  const exportBtn = h('button', { type: 'button', class: 'ip2-arc-export', onclick: (e: Event) => (e.preventDefault(), exportAll()) }, 'export all as one JSON file');
  const runId = () => {
    const d = link.host?.record.data;
    return d ? (archive.forRun(d.startedAt)?.id ?? null) : null;
  };
  const list = archiveList({ p: 'ip2-arc', empty: 'Nothing saved yet. Each button above saves this run here.', current: runId });
  const pane = h('section', { class: 'ip2-finish', 'aria-labelledby': 'ip2-finish-h', hidden: true },
    h('div', { class: 'ip2-finish-head' }, h('h2', { id: 'ip2-finish-h', class: 'ip2-finish-title' }, 'Finish the case'), h('span', { class: 'ip2-finish-hint' }, 'Esc keeps it running')),
    lead,
    h('label', { class: 'ip2-finish-who' }, 'Resident', field),
    h('div', { class: 'ip2-finish-sum' },
      h('div', { class: 'ip2-finish-obj' }, h('b', {}, 'Objectives'), ' ', objV),
      h('div', { class: 'ip2-finish-marks' }, h('b', {}, 'Marks'), ' ', marksV)),
    saved,
    h('div', { class: 'ip2-finish-acts', role: 'group', 'aria-label': 'Finish' },
      btn('ip2-finish-restart ip2-finish-primary', 'Save and restart the case', () => void end('restart')),
      btn('ip2-finish-now', 'Debrief now', () => void end('now')),
      btn('ip2-finish-close', 'Save and close', () => void end('close'))),
    h('p', { class: 'ip2-finish-note' }, NOTE),
    h('details', { class: 'ip2-finish-archive', open: true },
      h('summary', {}, count, h('span', { class: 'ip2-arc-more' }, ' · also on the Debrief page · '), exportBtn),
      list.el));
  el.replaceChildren(pane);

  const can = () => !!hooks && !!link.host && !!link.ctl.scenario.doc;

  /** Back to the case with nothing written; the clock as the pane found it. */
  const cancel = (): boolean => {
    if (!open || busy) return false;
    open = false;
    if (pausedByUs) void time(link, 'resume');
    pausedByUs = false;
    repaint();
    return true;
  };

  const start = () => {
    if (open || busy || !can()) return;
    open = true;
    pausedByUs = !link.ctl.hostPaused;
    sawPaused = !pausedByUs;
    const d = link.host?.record.data;
    const was = d ? archive.forRun(d.startedAt) : null;
    if (was) field.value = was.resident;
    if (pausedByUs) {
      void time(link, 'pause').then((r) => {
        if (r.accepted || !open) return;
        open = pausedByUs = false; // the host refused (a fast-forward runs): the case goes on
        toast(`The clock could not be stopped: ${r.reason ?? 'refused'}`, 'alert');
        repaint();
      });
    }
    repaint();
    field.focus();
  };

  /** A button: the debrief into the archive first, then what the button does. */
  const end = (how: 'restart' | 'now' | 'close') => {
    const d = link.host?.record.data;
    if (!open || !d) return;
    busy = true;
    try {
      // a /2 card: the run's end in its record (the Debrief grades it final: failed what is still open; design §6, Q11)
      const doc = link.ctl.scenario.doc;
      if (doc && isV2(doc) && !caseFinished(link)) link.note(FINISHED, 'marker');
      const e = archive.save(d, field.value, APP_BUILD);
      if (!e) return toast(NOT_SAVED, 'alert');
      if (how === 'now') {
        location.hash = archiveHref(e.id);
        return;
      }
      if (how === 'restart' && !hooks?.restart()) return; // refused (the app said why): the pane stays
      if (how === 'close') hooks?.close();
      open = pausedByUs = false;
      field.value = ''; // the next resident's name
      // a new patient runs: the clock goes on, however it was before
      if (link.ctl.hostPaused) void time(link, 'resume');
      toast(`Debrief saved: ${entryTitle(e)}. ${how === 'restart' ? 'The case starts again.' : 'The case is closed.'}`);
    } finally {
      busy = false;
      repaint();
    }
  };

  // Esc: the pane closes after an open sheet (the sheets answer first); the field's own Esc too (keys.ts skips a field)
  const sheetOpen = () => !!el.closest('.ip2')?.querySelector('.ip2-sheet:not([hidden])');
  const offEsc = ctx.keys.escape(() => open && !sheetOpen() && cancel());
  field.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open) return;
    e.preventDefault();
    e.stopPropagation();
    cancel();
  });

  const watch = () => {
    if (!open || busy) return;
    if (!link.ctl.scenario.doc) open = pausedByUs = false; // ended elsewhere
    else if (link.ctl.hostPaused) sawPaused = true;
    else if (sawPaused) open = pausedByUs = false; // resumed elsewhere: nothing written
  };

  const refresh = () => {
    pane.hidden = !open;
    if (!open) return;
    const d = link.host?.record.data;
    const doc = link.ctl.scenario.doc;
    setText(lead, `${doc ? cardOf(doc).title : 'Free run'} · ${clock(link.simT)} · ${LEAD_TAIL}`);
    setText(objV, d ? objectivesLine(objectiveCounts(d)) : '');
    setText(marksV, d ? marksLine(markCounts(d)) : '');
    const id = runId();
    const n = archive.list().findIndex((x) => x.id === id) + 1;
    const at = id ? archive.list().find((x) => x.id === id)?.savedAt : undefined;
    saved.hidden = !id;
    setText(saved, id && at !== undefined ? `Saved to the archive at ${hhmm(at)} as debrief ${n}. A button below saves it again in its place.` : '');
    setText(count, `Archive · ${archive.savedToday()} saved today`);
    list.draw();
  };

  return {
    get open() {
      return open;
    },
    can, start, watch, refresh,
    destroy: () => offEsc(),
  };
}
