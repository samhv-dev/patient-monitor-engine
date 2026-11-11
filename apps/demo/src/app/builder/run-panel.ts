// Run in place (docs/plans/scenario-builder.md §6, mock-up 04-run-in-place; piece B6). "Run in place" in the builder
// loads the draft into THIS computer's session as a draft card: through the session's own load (`loadScenario(doc)`,
// the document itself), never through the library, the imported cards, Recent or a position kept for a reload, so no
// device can name it: a phone's Remote cannot load any card (protocol `instructorMay`), and the driver resolves a
// string id against the built-in cards only. Instructor v2 then runs it with this panel as a column beside it.
//
// The run does not change under the author's hands: an edit in the builder is saved as the draft, and reaches the run
// only through the two Apply buttons. "Apply my edits and restart" loads the saved draft again from 0:00. "Apply from
// this phase's mark" makes every stage mark of the run hold the edited card (ScenarioDriver.reviseMarks) and restores
// the current phase's mark, allowed only when the edit keeps what the mark's state names (run.ts `markCompatible`);
// otherwise the button is off and the line under it says why. Both wait while the validator refuses the draft.
//
// "To the next phase" is the host's own fast-forward with a stop at the first phase change, at most 30 min
// (HostSession.fastForwardToNextPhase, host-local). "What fired, and why" formats the runner's own records (run.ts).
import { isV2, type AnyScenarioDoc } from '@pme/controller';
import { validateScenario, type PhaseRunnerState, type ScenarioDocV2 } from '@pme/controller/scenario';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import { LIBRARY } from '../scenarios.ts';
import type { RoomKeep } from '../session.ts';
import { liveGrades } from '../teach2/rows.ts';
import { button, clock, h, toast } from '../ui.ts';
import type { Body, DraftMeta } from './drafts.ts';
import { markCompatible, refit, whatFired, type RunLine } from './run.ts';
import './run-panel.css';

/** The fast-forwards of the panel, s: today's +2 and +5 min (FF_SKIPS). */
const SKIPS: readonly number[] = [120, 300];
/** At or above this window width the panel opens beside Instructor v2; below it, it starts as a strip (finding 5:
 *  Instructor v2 is crowded below about 1000 px of its own). Decided on the screenshots at 1280, 1440 and 1920. [ENG: ui] */
export const RUN_PANEL_OPEN_MIN_PX = 1600;
/** How long a draft's load may take to reach the driver (through the host's command chain) before the panel gives
 *  it up as not loaded, wall ms. [ENG: ui] */
const LOAD_WAIT_MS = 10_000;

export interface DraftStore {
  get(id: string): DraftMeta | null;
  body(id: string): Promise<Body | null>;
}

/** What a run-in-place load answers. */
export type RunResult = { ok: true } | { ok: false; reason: string };

/** The validator's refusals of a draft as a run would see them (and the builder's own: a library card's id). */
export function runRefusals(doc: unknown): string[] {
  const v = validateScenario(doc);
  const id = (doc as { id?: unknown } | null)?.id;
  const own = typeof id === 'string' && LIBRARY.some((c) => c.id === id) ? [`/id: a library card has the id "${id}"`] : [];
  if (!v.ok) return [...own, ...v.errors];
  return isV2(v.doc) ? own : [...own, '/schema: the builder runs pme-scenario/2 cards only'];
}

export interface DraftRun {
  /** Load `doc` (the draft `draftId` as saved) and open Instructor v2 with the panel. */
  run(draftId: string, doc: unknown, room?: RoomKeep): RunResult;
  /** The draft running in place, or null (a library card, or none). */
  current(): { draftId: string; doc: ScenarioDocV2 } | null;
  /** Instructor v2's "Save and restart the case" on a draft: the draft again, as it runs (not the library's card). */
  restart(room: RoomKeep): boolean;
  /** A library or imported card was loaded: the run is no longer a draft's. */
  end(): void;
}

export function draftRun(o: { link: Link; root: HTMLElement; drafts: DraftStore; width?: () => number }): DraftRun {
  const { link } = o;
  const session = () => link.host;
  /** The draft running; `seen`: the driver has started it (the load reaches the driver through the host's chain, a
   *  moment after `run`), `at`: when it was asked for. */
  let cur: { draftId: string; doc: ScenarioDocV2; seen?: boolean; at?: number } | null = null;
  /** The saved draft as last read (by its save time), its refusals, for the Apply buttons. */
  let edited: { savedAt: number; doc: ScenarioDocV2 | null; refusals: string[] } | null = null;
  let reading = false;

  // ------------------------------------------------------------------------------------------------- the panel
  const title = h('p', { class: 'sb-run-sub' });
  const back = h('a', { class: 'console-back' }, '← Back to the builder');
  const skips = SKIPS.map((s) => button(`+${s / 60} min`, () => void jump(s), '', { 'aria-label': `Fast forward by ${s / 60} min` }));
  const next = button('To the next phase', () => void toNext(), 'primary');
  const markSel = h('select', { 'aria-label': 'A phase to go back to' });
  const markBtn = button('Back to this phase’s start', () => void backTo(markSel.value), '');
  const restartBtn = button('Apply my edits and restart', () => void applyRestart());
  const fromMarkBtn = button('Apply from this phase’s mark', () => void applyFromMark());
  const applyWhy = h('p', { class: 'sb-hint sb-run-why', 'aria-live': 'polite' });
  const log = h('ol', { class: 'sb-run-log', 'aria-label': 'What fired, and why' });
  const fold = button('Hide the run panel', () => ((chosen = true), setOpen(!open)), 'ghost small sb-run-fold', { 'aria-expanded': 'true', 'aria-controls': 'sb-run-body' });
  const body = h('div', { class: 'sb-run-body', id: 'sb-run-body' },
    back,
    h('h2', { id: 'sb-run-h' }, 'Run in place'),
    title,
    h('section', { class: 'sb-run-box', 'aria-labelledby': 'sb-run-clock-h' },
      h('h3', { id: 'sb-run-clock-h' }, 'Jump the clock'),
      h('div', { class: 'sb-run-row' }, ...skips, next),
      h('div', { class: 'sb-run-row' }, markSel, markBtn),
      h('p', { class: 'sb-hint' }, 'To the next phase fast-forwards and stops at the first phase change (or at 30 min). Back restores the mark the runner placed at that phase’s start.'),
      h('h3', {}, 'Your edits'),
      h('p', { class: 'sb-hint' }, 'The run does not change while you edit: the builder saves the draft, and these apply it.'),
      h('div', { class: 'sb-run-row' }, restartBtn),
      h('div', { class: 'sb-run-row' }, fromMarkBtn),
      applyWhy),
    h('section', { class: 'sb-run-box', 'aria-labelledby': 'sb-run-log-h' }, h('h3', { id: 'sb-run-log-h' }, 'What fired, and why'), log));
  const panel = h('aside', { class: 'sb-run', 'aria-labelledby': 'sb-run-h', hidden: true }, fold, body);
  o.root.append(panel);
  const wide = () => (o.width?.() ?? innerWidth) >= RUN_PANEL_OPEN_MIN_PX;
  let open = wide();
  /** The author opened or folded the panel: the window's width no longer decides. */
  let chosen = false;
  addEventListener('resize', () => !chosen && wide() !== open && setOpen(wide()));
  const setOpen = (on: boolean) => {
    open = on;
    body.hidden = !on;
    fold.textContent = on ? 'Hide the run panel' : 'Run panel';
    fold.setAttribute('aria-expanded', String(on));
    paint();
  };

  // ------------------------------------------------------------------------------------------------- the actions
  const busy = () => link.ctl.fastForward !== null || link.ctl.hostPaused;
  const jump = async (s: number) => {
    const r = await link.send({ type: 'time', action: 'jump', value: s });
    if (!r.accepted) toast(`Fast-forward refused: ${r.reason ?? 'refused'}`, 'alert');
  };
  const toNext = async () => {
    const s = session();
    if (!s) return;
    const r = await s.host.fastForwardToNextPhase();
    if (!r.accepted) toast(`To the next phase refused: ${r.reason ?? 'refused'}`, 'alert');
  };
  const backTo = async (target: string) => {
    if (!target) return;
    const r = await link.send({ type: 'scenario', action: 'restoreBookmark', target });
    if (!r.accepted) toast(`Not restored: ${r.reason ?? 'refused'}`, 'alert');
  };
  /** The saved draft, read again when the builder saved it since. */
  const readEdited = async () => {
    if (!cur || reading) return;
    const m = o.drafts.get(cur.draftId);
    if (!m || m.savedAt === edited?.savedAt) return;
    reading = true;
    try {
      const doc = await o.drafts.body(cur.draftId);
      const refusals = runRefusals(doc);
      edited = { savedAt: m.savedAt, doc: refusals.length ? null : (validateScenario(doc) as { doc: ScenarioDocV2 }).doc, refusals };
    } finally {
      reading = false;
    }
    paint();
  };
  const applyRestart = async () => {
    if (!cur) return;
    const doc = await o.drafts.body(cur.draftId);
    const r = run(cur.draftId, doc);
    if (!r.ok) toast(`Not applied: ${r.reason}`, 'alert');
  };
  /** The current phase's stage mark (the last one placed for it), or null. */
  const currentMark = (): string | null => {
    const s = session();
    const id = s?.driver.phaseRunner?.stateId;
    return id ? (s.driver.stageMarks().filter((c) => c.note === id).at(-1)?.target as string | undefined) ?? null : null;
  };
  /** Whether "Apply from this phase's mark" may run now, and why not. */
  const fromMark = (): { ok: true; fit: ReturnType<typeof markCompatible> & { ok: true }; doc: ScenarioDocV2; mark: string } | { ok: false; why: string } => {
    const running = session()?.driver.phaseRunner?.doc;
    if (!cur || !running) return { ok: false, why: '' };
    if (!edited) return { ok: false, why: 'Reading the saved draft…' };
    if (!edited.doc) return { ok: false, why: `The draft has ${edited.refusals.length} ${edited.refusals.length === 1 ? 'refusal' : 'refusals'}: fix ${edited.refusals.length === 1 ? 'it' : 'them'} in the builder first.` };
    if (JSON.stringify(edited.doc) === JSON.stringify(running)) return { ok: false, why: 'No edits since this run started.' };
    const mark = currentMark();
    if (!mark) return { ok: false, why: 'This phase has no mark yet (the runner marks each phase at its entry): Apply my edits and restart runs the edited card from 0:00.' };
    const fit = markCompatible(running, edited.doc);
    if (!fit.ok) return { ok: false, why: `Not from this phase’s mark: ${fit.why}. Apply my edits and restart runs the edited card from 0:00.` };
    return { ok: true, fit, doc: edited.doc, mark };
  };
  const applyFromMark = async () => {
    const s = session();
    const f = fromMark();
    if (!s || !cur || !f.ok) return;
    const n = s.driver.reviseMarks(f.doc, (st: PhaseRunnerState) => refit(st, f.fit.reset));
    if (!n) return void toast('Not applied: the run’s marks did not take the edited card', 'alert');
    const r = await link.send({ type: 'scenario', action: 'restoreBookmark', target: f.mark });
    if (!r.accepted) return void toast(`Not applied: ${r.reason ?? 'refused'}`, 'alert');
    cur = { ...cur, doc: f.doc };
    link.note('Draft edits applied from this phase’s mark', 'scenario');
    paint();
  };

  // ------------------------------------------------------------------------------------------------- drawing
  let logKey = '';
  const lineEl = (l: RunLine) => h('li', { class: `sb-run-line ${l.tone}` },
    h('span', { class: 'sb-run-t' }, clock(l.t)),
    h('div', {}, h('b', {}, l.head), l.detail.length ? h('ul', {}, ...l.detail.map((d) => h('li', {}, d))) : ''));
  const paint = () => {
    const s = session();
    const r = s?.driver.phaseRunner ?? null;
    // the panel lives while the draft runs: a library load, Finish's close or a restart on another body ends it
    if (cur) {
      if (r && r.doc.id === cur.doc.id) cur.seen = true;
      else if (cur.seen || performance.now() - (cur.at ?? 0) > LOAD_WAIT_MS) cur = null;
    }
    const on = !!cur && location.hash.startsWith(hrefOf('teach2'));
    panel.hidden = !on;
    if (on) o.root.setAttribute('data-run', open ? 'open' : 'strip');
    else o.root.removeAttribute('data-run');
    if (!on || !cur || !r || r.doc.id !== cur.doc.id || !open) return;
    void readEdited();
    title.textContent = `The draft ${cur.doc.title} (${cur.doc.id}) runs on this computer’s engine. It is not in the library, and no phone follows unless you open the room.`;
    back.setAttribute('href', hrefOf('scenarios', `builder/${cur.draftId}`));
    for (const b of [...skips, next]) b.disabled = busy();
    const marks = s!.driver.stageMarks();
    const label = (id: string) => r.doc.phases.find((p) => p.id === id)?.label ?? id;
    const want = marks.map((m) => `${m.target}|${m.note}`).join(',');
    if (markSel.dataset.k !== want) {
      markSel.dataset.k = want;
      markSel.replaceChildren(...marks.map((m) => h('option', { value: String(m.target) }, `${label(String(m.note))} (${clock((m.atTick ?? 0) * 0.02)})`)));
    }
    markBtn.disabled = !marks.length || busy();
    restartBtn.disabled = !edited?.doc;
    restartBtn.title = edited && !edited.doc ? 'The draft has refusals: fix them in the builder first' : '';
    const f = fromMark();
    fromMarkBtn.disabled = !f.ok || busy();
    applyWhy.textContent = f.ok ? `Keeps the run up to ${label(r.stateId)}’s start and goes on from there with the edited card.` : f.why;
    const st = r.getState();
    const key = `${st.phases.length}|${st.admin.length}|${st.edges.length}|${st.fired.length}|${Math.floor(st.lastT)}|${r.doc === cur.doc}`;
    if (key === logKey) return;
    logKey = key;
    const lines = whatFired(r.doc, st, liveGrades(r.doc, r, st.lastT), st.lastT);
    log.replaceChildren(...lines.map(lineEl));
  };
  const off = link.onChange(() => paint());
  addEventListener('hashchange', () => paint());
  setInterval(paint, 1000); // the app's lifetime, as Instructor v2's own second tick
  void off;

  // ------------------------------------------------------------------------------------------------- loading
  const run = (draftId: string, doc: unknown, room?: RoomKeep): RunResult => {
    const s = session();
    if (!s) return { ok: false, reason: 'this page does not host the engine' };
    const no = runRefusals(doc);
    if (no.length) return { ok: false, reason: `the validator refuses the draft (${no.length}): ${no[0]}` };
    // the first phase gets its mark: marks on before the load (Instructor v2 turns them on only when it is shown)
    s.driver.markStages(true);
    const r = s.loadScenario(doc, room);
    if (!r.ok) return r;
    cur = { draftId, doc: r.doc as ScenarioDocV2, at: performance.now() };
    edited = null;
    logKey = '';
    s.setLearner(false); // a draft has no catalogue entry asking for learner controls: off, as for any card that does not
    s.live = true;
    link.note(`Draft run in place: ${cur.doc.title} (not in the library)`, 'scenario');
    location.hash = hrefOf('teach2');
    paint();
    return { ok: true };
  };
  return {
    run,
    current: () => cur,
    restart: (room) => {
      if (!cur) return false;
      const r = run(cur.draftId, cur.doc as AnyScenarioDoc, room);
      return r.ok;
    },
    end: () => {
      cur = null;
      paint();
    },
  };
}
