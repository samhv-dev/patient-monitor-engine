// Instructor v2, the stage strip (design §3.2, board "Proposal v6"; plan IP5; answers 2 and 3, the owner's ruling of
// 29 October on clicks). The card's stages in order, hop states folded in (card-read.ts `stagesOf`): a past stage with
// its entry time (from the scenario's history), the current one highlighted with its number of open steps, future
// stages dashed with "auto" where a rule enters them, and side branches as "<a> or <b>".
// Clicks: a future stage sends today's `goto` behind today's jump confirm (panel/scenario.ts `jump`, copied); a past stage
// shows its entry time and "Return to the start of <stage>", which restores the hidden stage mark the driver places at
// every stage entry, behind one confirm. Fit (14 stages on the MH card, 15 on the haemorrhage card): the passed stages
// beyond the KEEP_PAST before the current one fold into one chip "… n earlier", which expands on a press; the current
// stage and every future stage stay; when they still do not fit, the names are capped with an ellipsis (the full name
// in the tooltip), the hint going first.
import './state.css';
import type { ScenarioDoc } from '@pme/controller';
import { rowsOf, stagesOf, type Stage } from '../card-read.ts';
import type { Link } from '../link.ts';
import { clock, confirmDialog, h, toast } from '../ui.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';

/** The passed stages kept in view before the current one; earlier ones fold into "… n earlier". */
export const KEEP_PAST = 2;
/** The name caps `fit` tries, widest first (state.css `--ip2-cap`). */
const CAPS = ['none', '12em', '9em', '7em', '6em', '5em', '4.5em', '4em', '3.5em', '3em'];

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
  | { kind: 'fold'; n: number }
  | { kind: 'past'; stage: Stage; entry: StageEntry | null }
  | { kind: 'current'; stage: Stage; entry: StageEntry | null; open: number }
  /** One future stage, or side branches read "<a> or <b>". */
  | { kind: 'future'; stages: Stage[] };

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
 * The strip for the stage `stateId` is in. Past = before it in the card's order (with its latest entry, or null when
 * the run never entered it); the passed stages beyond KEEP_PAST before the current one fold into one item unless
 * `expanded`. Future stages in the card's order; a future stage joins the one before it as "or" when no stage of that
 * group leads into it and an earlier stage does (it is a side branch, not the next step).
 */
export function stripModel(doc: ScenarioDoc, stateId: string | null, entries: readonly StageEntry[], expanded = false): StripItem[] {
  const stages = stagesOf(doc);
  const at = stages.findIndex((g) => stateId !== null && g.states.includes(stateId));
  if (at < 0) return stages.map((g) => ({ kind: 'future', stages: [g] }));
  const last = (id: string) => entries.filter((e) => e.stage === id).at(-1) ?? null;
  const out: StripItem[] = [];
  const fold = expanded ? 0 : Math.max(0, at - KEEP_PAST);
  if (fold) out.push({ kind: 'fold', n: fold });
  for (let i = fold; i < at; i++) out.push({ kind: 'past', stage: stages[i] as Stage, entry: last((stages[i] as Stage).id) });
  const cur = stages[at] as Stage;
  // the open steps of the stage's own state (during a 2-s hop too: a hop has no steps of its own)
  out.push({ kind: 'current', stage: cur, entry: last(cur.id), open: rowsOf(doc, cur.id).filter((r) => r.kind === 'step').length });
  const edges = edgesOf(doc, stages);
  let group: Stage[] = [];
  for (let i = at + 1; i < stages.length; i++) {
    const g = stages[i] as Stage;
    const side = group.length > 0 && group.every((m) => !edges.get(m.id)?.has(g.id)) && stages.slice(0, i - group.length).some((p) => edges.get(p.id)?.has(g.id));
    if (side) group.push(g);
    else {
      if (group.length) out.push({ kind: 'future', stages: group });
      group = [g];
    }
  }
  if (group.length) out.push({ kind: 'future', stages: group });
  return out;
}

/**
 * Where a past stage's hidden stage mark is found: its label, to restore, or null.
 * TODO(IP2): the driver's stage marks (a hidden bookmark of kind `stage` at every stage entry, the owner's ruling of 29
 * October; IP2's PR pending). Until they land there is none, and "Return to the start of <stage>" stays disabled. When
 * they land, this reads the mark recorded at `entry` (stage and time) and the restore below needs no other change.
 */
export const stageMarks: { of(link: Link, entry: StageEntry): string | null } = { of: () => null };

/** Today's jump, copied from panel/scenario.ts `jump`: the same confirm, the same command, the same toast. */
async function jump(link: Link, id: string, label: string): Promise<void> {
  if (!(await confirmDialog('Jump to this state?', `The scenario moves to "${label}" now and runs its changes.`, 'Jump', false, 'Stay in this state'))) return;
  const r = await link.send({ type: 'scenario', action: 'goto', target: id });
  if (r.accepted) toast(`Scenario: ${label}`);
}

/** Return to the start of a past stage: its stage mark restored (today's bookmark restore), behind one confirm. */
async function returnTo(link: Link, name: string, mark: string): Promise<void> {
  if (!(await confirmDialog(`Return to the start of ${name}?`, `The patient goes back to the moment "${name}" began. The clock goes back with it.`, 'Return', false, 'Stay here'))) return;
  void link.send({ type: 'scenario', action: 'restoreBookmark', target: mark });
}

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link } = ctx;
  const sv = link.ctl.scenario;
  const chips = h('div', { class: 'ip2-chips' });
  const hint = h('span', { class: 'ip2-strip-hint' }, 'past: return to its start · future: jumps to it (asks once)');
  el.replaceChildren(chips, hint);
  let expanded = false;
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
  const outside = (e: Event) => pop && !pop.contains(e.target as Node) && !(e.target as Element | null)?.closest?.('.ip2-past') && closePop();
  document.addEventListener('pointerdown', outside);

  /** A past stage pressed: its entry time and the return to its start (disabled while it has no stage mark). */
  const showPast = (chip: HTMLElement, g: Stage, entry: StageEntry | null) => {
    const again = pop?.dataset.stage === g.id;
    closePop();
    if (again) return;
    const name = names.get(g.id) ?? g.label;
    const mark = entry ? stageMarks.of(link, entry) : null;
    const back = h('button', { type: 'button', class: 'ip2-pop-btn', disabled: !mark, onclick: () => mark && (closePop(), void returnTo(link, name, mark)) }, `Return to the start of ${name}`);
    pop = h('div', { class: 'ip2-pop', role: 'group', 'aria-label': `Stage ${name}`, 'data-stage': g.id },
      h('div', { class: 'ip2-pop-head' }, name),
      h('div', { class: 'ip2-pop-time' }, entry ? `Entered at ${clock(entry.t)}` : 'Not entered in this run'),
      entry ? back : null,
      entry && !mark ? h('div', { class: 'ip2-pop-note' }, 'Available once the run records a mark at each stage entry.') : null);
    const r = chip.getBoundingClientRect();
    pop.style.left = `${Math.max(8, r.left)}px`;
    pop.style.top = `${r.bottom + 6}px`;
    el.append(pop);
  };

  const chip = (g: Stage, cls: string, extra: Array<Node | string | null>, attrs: Record<string, string>, onclick?: (b: HTMLElement) => void) => {
    const name = names.get(g.id) ?? g.label;
    const kids = [h('span', { class: 'ip2-chip-name' }, name), ...extra];
    if (!onclick) return h('span', { class: `ip2-chip ${cls}`, title: g.label, ...attrs }, ...kids);
    const b: HTMLButtonElement = h('button', { type: 'button', class: `ip2-chip ${cls}`, title: g.label, ...attrs, onclick: () => onclick(b) }, ...kids);
    return b;
  };
  /** The widest name cap at which the chips fit (state.css `--ip2-cap`); past the last one the strip scrolls sideways. */
  const fit = () => {
    if (expanded) return void (el.style.setProperty('--ip2-cap', 'none'), el.removeAttribute('data-tight'), (hint.hidden = true));
    el.classList.add('ip2-strip-measure');
    for (const [i, cap] of CAPS.entries()) {
      el.style.setProperty('--ip2-cap', cap);
      el.toggleAttribute('data-tight', i > 0);
      if (el.scrollWidth <= el.clientWidth) break;
    }
    el.classList.remove('ip2-strip-measure');
    // the hint shows whole or not at all
    hint.hidden = !sv.doc;
    if (!hint.hidden && hint.scrollWidth > hint.clientWidth) hint.hidden = true;
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  ro?.observe(el);
  const line = (kind: 'solid' | 'next' | 'dashed') => h('span', { class: `ip2-link ip2-link-${kind}`, 'aria-hidden': 'true' });

  const draw = () => {
    const doc = sv.doc;
    if (!doc) {
      if (drawn !== 'none') chips.replaceChildren(h('span', { class: 'ip2-strip-empty' }, 'No scenario running')), (drawn = 'none');
      hint.hidden = true;
      closePop();
      return;
    }
    if (docV !== sv.docVersion) (docV = sv.docVersion), (expanded = false), (names = stageNames(stagesOf(doc))), closePop();
    const entries = stageEntries(doc, sv.history, sv, link.simT);
    const items = stripModel(doc, sv.stateId, entries, expanded);
    const key = JSON.stringify([docV, expanded, items.map((x) => (x.kind === 'fold' ? x.n : x.kind === 'future' ? x.stages.map((g) => g.id) : [x.stage.id, x.entry?.t, x.kind === 'current' ? x.open : 0]))]);
    if (key === drawn) return; // the strip changes with the state, not with the clock: no redraw at 1 Hz
    drawn = key;
    closePop(); // a past stage's card is redrawn from the new course on the next press
    const kids: Node[] = [];
    items.forEach((x, i) => {
      if (i > 0) kids.push(line(x.kind === 'future' ? 'dashed' : x.kind === 'current' ? 'next' : 'solid'));
      if (x.kind === 'fold')
        kids.push(h('button', { type: 'button', class: 'ip2-chip ip2-fold', 'aria-expanded': 'false', 'aria-label': `Show the ${x.n} earlier stages`, onclick: () => ((expanded = true), draw()) }, `… ${x.n} earlier`));
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
            { 'aria-label': `Stage ${(names.get(g.id) ?? '')}${g.byRule ? ', entered by a rule' : ''}: jumps to it (asks once)` },
            () => void jump(link, g.id, label)));
        });
    });
    if (expanded && stripModel(doc, sv.stateId, entries, false)[0]?.kind === 'fold')
      kids.unshift(h('button', { type: 'button', class: 'ip2-chip ip2-fold', 'aria-expanded': 'true', 'aria-label': 'Fold the earlier stages', onclick: () => ((expanded = false), draw()) }, '‹ fold'), line('solid'));
    chips.replaceChildren(...kids);
    fit();
  };

  draw();
  return {
    refresh: draw,
    destroy: () => {
      offEsc();
      ro?.disconnect();
      document.removeEventListener('pointerdown', outside);
      closePop();
    },
  };
}
