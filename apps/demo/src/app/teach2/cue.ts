// Instructor v2, the cue box at the top of STATE (design §3.3 and §5, boards "Proposal v6" and "v9 paused"; plan IP5;
// answers 4, 14, 18, 21). The stage's name; the time in the stage ("frozen" while paused); how it was entered ("by your
// button", "by its rule", "by a jump" from the debrief record's `by` (IP8) when the host has it, else "entered" and the
// time); the stage line, the state's label as the card writes it (answer 21); the Say line, the state's `notes` in
// italics, which today's panel never shows; the values the instructor holds ("Held: SpO₂ 88 (2 min)", read as today's
// held-values dialog reads them, answer 14); and Swap, which opens the full-size Monitor view (answer 18). While the
// host is paused the in-stage clock reads "frozen" (the owner's option G dropped v9's banner: the pill turns amber, the
// monitor carries PAUSED, and the pill's tooltip says when a step pressed now is given).
import './state.css';
import type { StateVar } from '@pme/engine-core';
import { byItself, stageOf, stagesOf } from '../card-read.ts';
import { drugWords } from '../glossary.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import { whenText } from '../triggers.ts';
import { clock, h, setText } from '../ui.ts';
import { showVital, vitalLabel, vitalOf } from '../vitals.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';
import { stageEntries, stageNames, type StageEntry } from './strip.ts';
import { historyOf } from './course.ts';

/** The host's tick (s): a state row of the record and the scenario event it came from lie within one. */
const TICK_S = 0.02;

/** How the stage was entered, in words (answer 4). `by` is the record's (IP8); without it, "entered" and the time. */
export function enteredWords(by: string | undefined, t: number, rule: string | null): string {
  const at = `at ${clock(t)}`;
  if (by === 'press') return `entered by your button ${at}`;
  if (by === 'rule') return `entered by its rule ${at}${rule ? ` (${rule})` : ''}`;
  if (by === 'goto') return `entered by a jump ${at}`;
  return `entered ${at}`;
}

/** The record's `by` for the state row of `entry` (host only; absent on a follower and on a record made before the field existed). */
function byOf(link: Link, entry: StageEntry): string | undefined {
  const rows = link.host?.record.data.rows ?? [];
  const row = rows.filter((r) => r.kind === 'scenario' && r.undone === undefined && r.ev === `state:${entry.stateId}` && Math.abs(r.t - entry.t) <= TICK_S + 1e-6).at(-1);
  const by = (row as { by?: unknown } | undefined)?.by;
  return typeof by === 'string' ? by : undefined;
}

/** "2 min", "40 s": how long a value has been held. */
const heldFor = (s: number): string => (s < 60 ? `${Math.max(0, Math.floor(s))} s` : `${Math.floor(s / 60)} min`);

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link } = ctx;
  const sv = link.ctl.scenario;
  const name = h('span', { class: 'ip2-cue-name' });
  const inStage = h('span', { class: 'ip2-cue-clock' });
  const how = h('span', { class: 'ip2-cue-how' });
  const swap = h('a', { class: 'ip2-swap', href: hrefOf('monitor'), 'aria-label': 'Swap the monitor to full size' }, 'Swap ⤢');
  const line = h('div', { class: 'ip2-cue-line' });
  const say = h('p', { class: 'ip2-say', title: 'Show all of it' });
  say.addEventListener('click', () => say.classList.toggle('ip2-say-open'));
  const held = h('div', { class: 'ip2-held' });
  const box = h('div', { class: 'ip2-cue-box', role: 'group', 'aria-label': 'Cue' }, h('div', { class: 'ip2-cue-head' }, name, inStage, how, h('span', { class: 'ip2-spacer' }), swap), line, say, held);
  el.replaceChildren(box);

  /** When each held value was first seen held (sim s), for "(2 min)"; a value let go leaves it. */
  const since = new Map<StateVar, number>();

  const draw = () => {
    const paused = link.ctl.hostPaused;

    // HELD (answer 14): the values held in MODELED mode, as the session bar's held-values dialog lists them
    const st = link.ctl.state;
    const vars = st?.mode === 'modeled' ? Object.entries(st.control ?? {}).filter(([, f]) => f === 'pinned' || f === 'ramping').map(([v]) => v as StateVar) : [];
    for (const v of [...since.keys()]) if (!vars.includes(v)) since.delete(v);
    for (const v of vars) if (!since.has(v) || (since.get(v) as number) > link.simT) since.set(v, link.ramps.get(v)?.t0 ?? link.simT);
    held.hidden = !vars.length;
    setText(held, vars.length ? `Held: ${vars.map((v) => {
      const spec = vitalOf(v);
      return `${vitalLabel(v)}${spec ? ` ${showVital(spec, st?.values[v])}` : ''} (${heldFor(link.simT - (since.get(v) as number))})`;
    }).join(' · ')}` : '');

    const doc = sv.doc;
    const state = sv.current();
    const stage = doc && sv.stateId ? stageOf(doc, sv.stateId) : null;
    box.classList.toggle('ip2-cue-none', !doc || !stage);
    if (!doc || !stage || !state) {
      setText(name, 'No scenario running');
      for (const x of [inStage, how, line, say]) setText(x, '');
      say.hidden = true;
      return;
    }
    const entry = stageEntries(doc, historyOf(link), sv, link.simT).filter((e) => e.stage === stage.id).at(-1) ?? null;
    setText(name, stageNames(stagesOf(doc)).get(stage.id) ?? stage.label);
    // time in the stage: the state's own clock (pauses excluded), plus the hops and returns before it since the stage began
    const t = sv.timeInState(link.simT) + (entry ? Math.max(0, sv.enteredT - entry.t) : 0);
    const frozen = paused || sv.paused;
    setText(inStage, `${clock(t)} in stage${frozen ? ' · frozen' : ''}`);
    inStage.classList.toggle('ip2-frozen', frozen);
    const trId = entry?.transitionId?.replace(/:else$/, '');
    const tr = trId ? doc.states.flatMap((s) => s.transitions ?? []).find((x) => x.id === trId) : undefined;
    // a transition with no rule of its own entered the stage by your button, whatever the record's `by` reads (the
    // owner's report of 30 October: a dose pressed in Recovering, the treatment stage "entered by its rule")
    const rec = entry ? byOf(link, entry) : undefined;
    const by = tr && rec === 'rule' && !byItself(tr.when) ? 'press' : rec;
    setText(how, entry ? enteredWords(by, entry.t, tr ? whenText(tr.when) : null) : '');
    setText(line, drugWords(state.label ?? stage.label));
    const notes = state.notes ?? doc.states.find((s) => s.id === stage.id)?.notes;
    say.hidden = !notes;
    setText(say, notes ? `${/^say\b/i.test(notes) ? '' : 'Say: '}${drugWords(notes)}` : '');
  };

  draw();
  return { refresh: draw, destroy: () => undefined };
}
