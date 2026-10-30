// Instructor v2, the stage strip (design §3.2, board "Proposal v6"; plan IP5; answers 2 and 3, the owner's ruling of
// 29 October on clicks). The card's stages in order, hop states folded in (card-read.ts `stagesOf`): a past stage with
// its entry time (from the scenario's history), the current one highlighted with its number of open steps, future
// stages dashed with "auto" where a rule enters them, and side branches as "<a> or <b>".
// Clicks: a stage pressed opens its inline box under the chip, and the box's button is the confirmation (the owner's
// report of 30 October: no dialog). A future stage's box reads "Jump to <stage>" and sends today's `goto` with today's
// toast (panel/scenario.ts `jump`, copied without its confirm); a past stage's box shows its entry time and "Return to
// the start of <stage>", which restores the hidden stage mark the driver places at every stage entry
// (ScenarioDriver.stageMarks()). Fit (14 stages on the MH card, 15 on the
// haemorrhage card), the owner's ruling for IP9: exactly five chips with full names, the two stages before the current
// one, the current one and the next two (at either end of the card the window slides to keep five); everything beyond
// folds behind an arrow at each end ("‹ 3 earlier", "4 later ›"); an arrow pages the window that way, and "back to now"
// recentres it on the current stage whenever it has been moved. The future stages are ordered from the current one
// (the stages it leads to first; two of one step read "<a> or <b>"). Names are never cut: when the chips do not fit,
// the padding tightens, then the hint goes, then the strip scrolls sideways.
import './state.css';
import type { ScenarioDoc } from '@pme/controller';
import { briefingEnd } from '../briefing.ts';
import { rowsOf, stagesOf, type Stage } from '../card-read.ts';
import type { Link } from '../link.ts';
import { clock, h, toast } from '../ui.ts';
import { KEYS_OF, NO_CASE } from './begin.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';
import { historyOf } from './course.ts';

/** The chips in view (the owner's ruling for IP9): the KEEP_PAST stages before the current one, the current one and
 *  the KEEP_NEXT after it; the rest fold behind the arrows "‹ n earlier" and "n later ›". */
export const WINDOW = 5;
export const KEEP_PAST = 2;
export const KEEP_NEXT = 2;

/** The stages' short names: each label up to its first ':', ';', ',' or ' (' ("Trigger off: sevoflurane stopped, …" →
 *  "Trigger off"), taken one part further while two stages would read the same ("Rhythm check: VF" and "Rhythm check:
 *  VF again"). The full label is the cue box's stage line (answer 21) and the chip's tooltip. */
export function stageNames(stages: readonly Stage[]): Map<string, string> {
  const cuts = stages.map((g) => [...g.label.matchAll(/[:;,]| \(/g)].map((m) => m.index as number).filter((i) => i > 0));
  const parts = stages.map(() => 1);
  const name = (i: number) => {
    const g = stages[i] as Stage;
    const at = (cuts[i] as number[])[(parts[i] as number) - 1];
    return (at === undefined ? g.label : g.label.slice(0, at)).trim();
  };
  for (let round = 0; round < 8; round++) {
    const names = stages.map((_, i) => name(i));
    const dup = names.map((n, i) => names.indexOf(n) !== names.lastIndexOf(n) && (parts[i] as number) <= (cuts[i] as number[]).length);
    if (!dup.some(Boolean)) break;
    dup.forEach((d, i) => d && (parts[i] = (parts[i] as number) + 1));
  }
  return new Map(stages.map((g, i) => [g.id, name(i)]));
}

/** A stage entered in the run: the stage, the state it was entered by (a hop, or the stage's own state), and when. */
export interface StageEntry {
  stage: string;
  stateId: string;
  t: number;
  transitionId?: string;
}

/**
 * The stage entries of the course kept, oldest first: the scenario's history (ScenarioView.history) read through the
 * stages (a hop and the return from it stay inside one stage), the entries of a course a restore discarded dropped
 * (an entry earlier than the one before it rewound the clock), and nothing later than `simT`. Without a history (a
 * late joiner) the current state's entry stands alone.
 */
export function stageEntries(doc: ScenarioDoc, history: ReadonlyArray<{ t: number; stateId: string; transitionId?: string }>, current: { stateId: string | null; enteredT: number }, simT: number): StageEntry[] {
  const home = new Map(stagesOf(doc).flatMap((g) => g.states.map((s) => [s, g.id] as const)));
  const kept: Array<{ t: number; stateId: string; transitionId?: string }> = [];
  for (const e of history) {
    while (kept.length && (kept.at(-1) as { t: number }).t > e.t) kept.pop();
    kept.push(e);
  }
  const out: StageEntry[] = [];
  for (const e of kept) {
    if (e.t > simT + 0.05) break;
    const stage = home.get(e.stateId);
    if (!stage || out.at(-1)?.stage === stage) continue;
    out.push({ stage, stateId: e.stateId, t: e.t, ...(e.transitionId ? { transitionId: e.transitionId } : {}) });
  }
  const cur = current.stateId ? home.get(current.stateId) : undefined;
  if (cur && out.at(-1)?.stage !== cur) out.push({ stage: cur, stateId: current.stateId as string, t: current.enteredT });
  return out;
}

export type StripItem =
  /** The stages before the window, behind the "‹ n earlier" arrow. */
  | { kind: 'fold'; n: number }
  | { kind: 'past'; stage: Stage; entry: StageEntry | null }
  | { kind: 'current'; stage: Stage; entry: StageEntry | null; open: number }
  /** One future stage, or side branches read "<a> or <b>". */
  | { kind: 'future'; stages: Stage[] }
  /** The stages after the window, behind the "n later ›" arrow. */
  | { kind: 'later'; n: number };

/** The stage-to-stage edges of the card: a transition (`to` or `else`) of any state of a stage into another stage. */
function edgesOf(doc: ScenarioDoc, stages: readonly Stage[]): Map<string, Set<string>> {
  const home = new Map(stages.flatMap((g) => g.states.map((s) => [s, g.id] as const)));
  const out = new Map(stages.map((g) => [g.id, new Set<string>()]));
  for (const s of doc.states)
    for (const t of s.transitions ?? [])
      for (const to of [t.to, t.else]) {
        const a = home.get(s.id);
        const b = to === undefined ? undefined : home.get(to);
        if (a && b && a !== b) out.get(a)?.add(b);
      }
  return out;
}

/**
 * The strip for the stage `stateId` is in, as a window of WINDOW stages over the line of the card's stages: the stages
 * before it in the card's order (past: with its latest entry, or null when the run never entered it), the current one,
 * then the future ordered from the current stage (IP9): first the stages it leads to, then the stages those lead to,
 * and so on, the stages of one such step in the card's order (consecutive ones in the window read "<a> or <b>"); a
 * future stage no path from the current one reaches comes last. The window starts KEEP_PAST before the current stage
 * (slid to keep WINDOW stages at either end of the line), moved by `offset` stages (the arrows; 0 = now).
 */
export function stripModel(doc: ScenarioDoc, stateId: string | null, entries: readonly StageEntry[], offset = 0): StripItem[] {
  const stages = stagesOf(doc);
  const at = stages.findIndex((g) => stateId !== null && g.states.includes(stateId));
  const last = (id: string) => entries.filter((e) => e.stage === id).at(-1) ?? null;
  type Slot = { stage: Stage; kind: 'past' | 'current' | 'future'; layer: number };
  const line: Slot[] = [];
  if (at < 0) stages.forEach((g, i) => line.push({ stage: g, kind: 'future', layer: i }));
  else {
    for (let i = 0; i < at; i++) line.push({ stage: stages[i] as Stage, kind: 'past', layer: -1 });
    const cur = stages[at] as Stage;
    line.push({ stage: cur, kind: 'current', layer: -1 });
    const edges = edgesOf(doc, stages);
    const future = stages.slice(at + 1);
    const seen = new Set([cur.id]);
    let layer = 0;
    for (let front = [cur.id]; front.length; layer++) {
      const next = future.filter((g) => !seen.has(g.id) && front.some((f) => edges.get(f)?.has(g.id)));
      for (const g of next) (seen.add(g.id), line.push({ stage: g, kind: 'future', layer }));
      front = next.map((g) => g.id);
    }
    for (const g of future) if (!seen.has(g.id)) line.push({ stage: g, kind: 'future', layer: layer++ });
  }
  const maxStart = Math.max(0, line.length - WINDOW);
  const clamp = (x: number) => Math.min(maxStart, Math.max(0, x));
  const start = clamp(clamp(Math.max(at, 0) - KEEP_PAST) + offset);
  const end = Math.min(line.length, start + WINDOW);
  const out: StripItem[] = [];
  if (start) out.push({ kind: 'fold', n: start });
  for (let i = start; i < end; i++) {
    const x = line[i] as Slot;
    if (x.kind === 'past') out.push({ kind: 'past', stage: x.stage, entry: last(x.stage.id) });
    // the open steps of the stage's own state (during a 2-s hop too: a hop has no steps of its own)
    else if (x.kind === 'current') out.push({ kind: 'current', stage: x.stage, entry: last(x.stage.id), open: rowsOf(doc, x.stage.id).filter((r) => r.kind === 'step').length });
    else {
      const prev = out.at(-1);
      if (prev?.kind === 'future' && i > start && (line[i - 1] as Slot).layer === x.layer) prev.stages.push(x.stage);
      else out.push({ kind: 'future', stages: [x.stage] });
    }
  }
  if (end < line.length) out.push({ kind: 'later', n: line.length - end });
  return out;
}

/**
 * Where a past stage's hidden stage mark is found: its label, to restore, or null. The host-side driver places one at
 * each stage entry once the stage's onEnter is applied (ScenarioDriver.stageMarks(): kind `stage`, note = the stage's
 * state id), keeps only the marks of the current course (a restore drops the discarded course's) and one per entry, so
 * the stage's mark is the latest one with its note, however late it was placed (a fast-forward, a busy monitor). A
 * follower has no driver: null.
 */
export const stageMarks: { of(link: Link, entry: StageEntry): string | null } = {
  of: (link, entry) => (link.host?.driver.stageMarks() ?? []).filter((c) => c.note === entry.stage).at(-1)?.target ?? null,
};

/** Today's jump, copied from panel/scenario.ts `jump` without its confirm (the strip's box is the confirmation): the
 *  same command, the same toast. */
async function jump(link: Link, id: string, label: string): Promise<void> {
  const r = await link.send({ type: 'scenario', action: 'goto', target: id });
  if (r.accepted) toast(`Scenario: ${label}`);
}

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link } = ctx;
  const sv = link.ctl.scenario;
  const chips = h('div', { class: 'ip2-chips' });
  const hint = h('span', { class: 'ip2-strip-hint' }, 'past: return to its start · future: jump to it');
  // with no case loaded (board "Empty 5"): the note at the strip's right and the status line under it
  const note = h('span', { class: 'ip2-strip-note', hidden: true }, 'the default patient is on the monitor and running');
  const statusKeys = h('span', { class: 'ip2-status-keys' });
  const status = h('div', { class: 'ip2-status', role: 'status', hidden: true },
    h('b', {}, 'Ready.'), h('span', { class: 'ip2-status-text' }, 'The phones can join now (Room code in the header); whatever you load or give next, they follow.'),
    h('span', { class: 'ip2-spacer' }), statusKeys);
  // While a card's Case briefing runs on the learners' screens: "End briefing" at the strip's end, in the hint's place
  const brief = link.host ? briefingEnd(link.host) : null;
  el.replaceChildren(chips, hint, ...(brief ? [brief] : []), note, status);
  /** How far the arrows have moved the window from now (stages; 0 = the current stage's window). */
  let offset = 0;
  let docV = -1;
  let pop: HTMLElement | null = null;
  let drawn = '';
  let names = new Map<string, string>();

  const closePop = (): boolean => {
    if (!pop) return false;
    pop.remove();
    pop = null;
    return true;
  };
  const offEsc = ctx.keys.escape(closePop);
  const outside = (e: Event) => pop && !pop.contains(e.target as Node) && !(e.target as Element | null)?.closest?.('.ip2-past, .ip2-future') && closePop();
  document.addEventListener('pointerdown', outside);

  /** Open stage `g`'s box under its chip (a second press on the same chip closes it): the box's button is the
   *  confirmation. */
  const openPop = (chip: HTMLElement, g: Stage, ...kids: Array<Node | null>): void => {
    const again = pop?.dataset.stage === g.id;
    closePop();
    if (again) return;
    const name = names.get(g.id) ?? g.label;
    pop = h('div', { class: 'ip2-pop', role: 'group', 'aria-label': `Stage ${name}`, 'data-stage': g.id }, h('div', { class: 'ip2-pop-head' }, name), ...kids);
    const r = chip.getBoundingClientRect();
    pop.style.left = `${Math.max(8, r.left)}px`;
    pop.style.top = `${r.bottom + 6}px`;
    el.append(pop);
  };
  /** A past stage pressed: its entry time and the return to its start (disabled while it has no stage mark). */
  const showPast = (chip: HTMLElement, g: Stage, entry: StageEntry | null) => {
    const name = names.get(g.id) ?? g.label;
    const mark = entry ? stageMarks.of(link, entry) : null;
    const back = h('button', { type: 'button', class: 'ip2-pop-btn', disabled: !mark, onclick: () => mark && (closePop(), void link.send({ type: 'scenario', action: 'restoreBookmark', target: mark })) }, `Return to the start of ${name}`);
    openPop(chip, g,
      h('div', { class: 'ip2-pop-time' }, entry ? `Entered at ${clock(entry.t)}` : 'Not entered in this run'),
      entry ? back : null,
      // a follower has no driver; on the host a missing mark is being placed (a frame or so): nothing to say then
      entry && !mark && !link.host ? h('div', { class: 'ip2-pop-note' }, "Return is available on the instructor's screen once this stage has a mark") : null);
  };
  /** A future stage pressed: the jump to it (today's `goto`; the case moves there now and runs its changes). */
  const showFuture = (chip: HTMLElement, g: Stage, label: string) => {
    const name = names.get(g.id) ?? g.label;
    openPop(chip, g, h('button', { type: 'button', class: 'ip2-pop-btn', onclick: () => (closePop(), void jump(link, g.id, label)) }, `Jump to ${name}`));
  };

  const chip = (g: Stage, cls: string, extra: Array<Node | string | null>, attrs: Record<string, string>, onclick?: (b: HTMLElement) => void) => {
    const name = names.get(g.id) ?? g.label;
    const kids = [h('span', { class: 'ip2-chip-name' }, name), ...extra];
    if (!onclick) return h('span', { class: `ip2-chip ${cls}`, title: g.label, ...attrs }, ...kids);
    const b: HTMLButtonElement = h('button', { type: 'button', class: `ip2-chip ${cls}`, title: g.label, ...attrs, onclick: () => onclick(b) }, ...kids);
    return b;
  };
  /** Fit without cutting a name (IP9, ruling 2): the chips' own width, then tighter padding; then the hint goes; past
   *  that the strip scrolls sideways. */
  const fit = () => {
    el.classList.add('ip2-strip-measure');
    el.removeAttribute('data-tight');
    if (el.scrollWidth > el.clientWidth) el.setAttribute('data-tight', '');
    el.classList.remove('ip2-strip-measure');
    // the hint shows whole or not at all
    hint.hidden = !sv.doc || (brief !== null && !brief.hidden);
    if (!hint.hidden && hint.scrollWidth > hint.clientWidth) hint.hidden = true;
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  ro?.observe(el);
  const offBrief = link.host?.onBriefing(() => queueMicrotask(fit)); // the hint gives way to "End briefing", and back
  const line = (kind: 'solid' | 'next' | 'dashed') => h('span', { class: `ip2-link ip2-link-${kind}`, 'aria-hidden': 'true' });

  const draw = () => {
    const doc = sv.doc;
    note.hidden = status.hidden = !!doc;
    el.toggleAttribute('data-empty', !doc);
    if (!doc) {
      const way = ctx.begin?.way ?? 'menu';
      if (drawn !== `none:${way}`) {
        chips.replaceChildren(h('span', { class: 'ip2-strip-empty ip2-chip-none' }, way === 'free' ? 'Free roam' : `${NO_CASE} · the stages appear here when one is`));
        statusKeys.textContent = KEYS_OF[way];
        drawn = `none:${way}`;
      }
      hint.hidden = true;
      closePop();
      return;
    }
    if (docV !== sv.docVersion) (docV = sv.docVersion), (offset = 0), (names = stageNames(stagesOf(doc))), closePop();
    const entries = stageEntries(doc, historyOf(link), sv, link.simT);
    const items = stripModel(doc, sv.stateId, entries, offset);
    const key = JSON.stringify([docV, offset, items.map((x) => (x.kind === 'fold' || x.kind === 'later' ? [x.kind, x.n] : x.kind === 'future' ? x.stages.map((g) => g.id) : [x.stage.id, x.entry?.t, x.kind === 'current' ? x.open : 0]))]);
    if (key === drawn) return; // the strip changes with the state, not with the clock: no redraw at 1 Hz
    drawn = key;
    closePop(); // a past stage's card is redrawn from the new course on the next press
    const kids: Node[] = [];
    items.forEach((x, i) => {
      if (i > 0) kids.push(line(x.kind === 'future' || x.kind === 'later' ? 'dashed' : x.kind === 'current' ? 'next' : 'solid'));
      if (x.kind === 'fold')
        kids.push(h('button', { type: 'button', class: 'ip2-chip ip2-fold ip2-earlier', 'aria-label': `Show the ${x.n} earlier ${x.n === 1 ? 'stage' : 'stages'}`, onclick: () => ((offset -= Math.min(WINDOW, x.n)), draw()) }, `‹ ${x.n} earlier`));
      else if (x.kind === 'later')
        kids.push(h('button', { type: 'button', class: 'ip2-chip ip2-fold ip2-later', 'aria-label': `Show the ${x.n} later ${x.n === 1 ? 'stage' : 'stages'}`, onclick: () => ((offset += Math.min(WINDOW, x.n)), draw()) }, `${x.n} later ›`));
      else if (x.kind === 'past')
        kids.push(chip(x.stage, x.entry ? 'ip2-past' : 'ip2-past ip2-skipped', [x.entry ? h('span', { class: 'ip2-chip-t' }, clock(x.entry.t)) : null],
          { 'aria-label': `Stage ${(names.get(x.stage.id) ?? '')}, ${x.entry ? `entered at ${clock(x.entry.t)}` : 'not entered'}: show its return`, 'aria-haspopup': 'true' },
          (b) => showPast(b, x.stage, x.entry)));
      else if (x.kind === 'current')
        kids.push(chip(x.stage, 'ip2-current', [h('span', { class: 'ip2-chip-t' }, `${x.entry ? `${clock(x.entry.t)} · ` : ''}${x.open} open`)],
          { 'aria-current': 'step', 'aria-label': `Current stage ${(names.get(x.stage.id) ?? '')}, ${x.open} open ${x.open === 1 ? 'step' : 'steps'}` }));
      else
        x.stages.forEach((g, j) => {
          if (j > 0) kids.push(h('span', { class: 'ip2-or' }, 'or'));
          const label = doc.states.find((s) => s.id === g.id)?.label ?? 'State';
          kids.push(chip(g, 'ip2-future', [g.byRule ? h('span', { class: 'ip2-auto' }, 'auto') : null],
            { 'aria-label': `Stage ${(names.get(g.id) ?? '')}${g.byRule ? ', entered by a rule' : ''}: show its jump`, 'aria-haspopup': 'true' },
            (b) => showFuture(b, g, label)));
        });
    });
    // the window has been moved: "back to now" recentres it on the current stage
    if (offset !== 0) kids.push(h('button', { type: 'button', class: 'ip2-chip ip2-now', 'aria-label': 'Back to now: the current stage', onclick: () => ((offset = 0), draw()) }, 'back to now'));
    chips.replaceChildren(...kids);
    fit();
  };

  draw();
  return {
    refresh: draw,
    destroy: () => {
      offEsc();
      offBrief?.();
      ro?.disconnect();
      document.removeEventListener('pointerdown', outside);
      closePop();
    },
  };
}
