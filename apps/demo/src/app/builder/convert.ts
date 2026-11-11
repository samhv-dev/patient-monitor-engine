// The /1 → /2 converter (docs/plans/scenario-builder.md §7.2, piece B7): a pure function from a valid `pme-scenario/1`
// card to a `pme-scenario/2` draft and a list of flags. It carries what has an exact /2 form and FLAGS what has none, with
// nothing in its place: no truth rule of its own invention, no placeholder threshold, no "equivalent" delay (the owner's
// ruling BQ9 = C). A porting executor later proposes, for each flag, the truth rule the beat stood for with its sources
// (the owner signs it), or an instructor-pressed event; the twin run (showcase/ports.slow.test.ts) measures what changed.
//
// How the states become phases. A /2 phase is entered only by its own rule on engine truth, never by a press (Q5). So a
// /1 state is a PHASE when it is the initial state or a transition enters it by a rule (a `vital`, `afterS`,
// `atScenarioS` or `sensor` alternative, carried or flagged); every other state is entered only by presses (`manual`,
// `event`) and is a PRESS STEP: it lives inside the phase its press was offered in (its hosts). Then, row by row:
// - manual → an action (kind `procedure`, never graded: a /1 button grades nothing) whose `give` is exactly what /1
//   sends on that press: the source state's onExit, then the target's onEnter (none for a press to the state it is in),
//   open in the phases the press is offered in. The same label sending the same commands is one action.
// - event → flagged, nothing in its place. The table's /2 form (an action matched by the event, the target's onEnter as
//   a script entry on its taking) does not mean the same: the driver counts a taking only for a command stamped with the
//   action's id (driver.ts `taking`), so the learner's own act never fires the entry, and `action:<id>#1` fires once
//   where the /1 transition fires each time.
// - vital → a phase rule on the TRUTH variable of the same name (same op, value, forS), carried, and flagged for its
//   change of rank (the display's number in /1, the truth in /2; /1 also restarts every hold at each state entry).
// - afterS, atScenarioS, sensor, probability/else → flagged, nothing in place.
// - objectives → flagged, nothing in place: the /1 Debrief's objectives() and /2's grade() judge differently, so a port
//   writes each as an action window or an outcome.
// - what /1 does by the shape of its graph and /2 cannot (a rule tried only after a press, a press that enters a
//   phase, two entry rules for one phase, a once-only script entry on a phase entered again, a bookmark) → flagged.
// The header and every command are carried verbatim. Pure, no DOM.
import { SCENARIO_SCHEMA_V2, type DocCommand, type ScenarioDoc, type ScenarioDocV2, type ScenarioState, type When } from '@pme/controller/scenario';
import type { Action, Phase, PhaseRule, ScriptEntry } from '@pme/controller/scenario';

/** What a flag is about. A leaf kind (`vital`, `afterS`, `atScenarioS`, `sensor`, `event`, `manual`) is a leaf of a
 *  transition's `when`; the others are the transition's die or the graph's shape. */
export const FLAG_KINDS = [
  'vital', 'afterS', 'atScenarioS', 'sensor', 'event', 'manual', 'probability', 'objective',
  'pressIntoPhase', 'pressScope', 'entryDiffers', 'reentry', 'onExit', 'unreachable', 'bookmark', 'hint',
] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];

export interface PortFlag {
  kind: FlagKind;
  /** Where the beat is in the /1 card (a JSON path). */
  from: string;
  /** The place in the /2 draft it concerns (a JSON path; the block's path when nothing was put in its place). */
  at: string;
  /** What the beat was, in words. */
  was: string;
  /** What a port must decide. */
  decide: string;
  /** Further places it concerns (a die's `else` phase). */
  alsoAt?: string[];
}

export interface Conversion {
  /** The /2 draft: valid apart from its flagged places (flagCovers). */
  draft: ScenarioDocV2;
  flags: PortFlag[];
}

const TRUTH_VARS = new Set((SCENARIO_SCHEMA_V2 as { definitions: { truthVar: { enum: string[] } } }).definitions.truthVar.enum);
const HEADER = ['$comment', 'id', 'title', 'notes', 'category', 'story', 'durationMin', 'takeHome', 'seed', 'mode', 'patient', 'device', 'briefing'] as const;

/** The words of each flag kind: what a port must decide (§7.2, BQ9 = C). */
const DECIDE: Record<FlagKind, string> = {
  vital: 'check the rule on the truth variable against the displayed one it replaces (the twin run measures the shift), or name the displayed reading the beat needs',
  afterS: 'propose the truth rule this time stood for, with its sources, for the owner to sign; or, if no source carries it, make it an instructor-pressed event (an action whose give is the beat)',
  atScenarioS: 'propose the truth rule this scenario time stood for, with its sources, for the owner to sign; or make it an instructor-pressed event',
  sensor: 'a /2 phase rule does not read a sensor: name the truth the sensor change stood for, with its sources, or make it an instructor-pressed event',
  event: 'a /2 phase is not entered by a learner’s act and a script entry fires only on an A press: make the beat a sourced truth rule on what the act does to the patient, or an instructor-pressed event (an action whose give is the beat)',
  manual: 'this press is part of a combined condition no /2 form holds: decide the action and the rule apart',
  probability: 'a /2 card rolls no dice: propose the truth rule the branch stood for, with its sources, for the owner to sign; or let the instructor press the branch the case takes',
  objective: 'write it as an action with a window or an outcome (§7.2), or leave it out; grade() and the /1 Debrief judge differently',
  pressIntoPhase: 'a /2 phase is entered only by its rule: the press is carried as an action, and the phase it entered needs its own rule or stays where it is',
  pressScope: 'in /1 the press changes which rules are tried; in /2 the phase’s rules are tried from its entry: check the course on the twin run, or give the rule its own guard',
  entryDiffers: 'the phase is entered by different rules from different states: one /2 entry rule must be written',
  reentry: 'a script entry fires once, on the phase’s first entry: decide what a second entry sends',
  onExit: 'a /2 phase has no exit commands: decide where these commands belong',
  unreachable: 'its state is reached only through a flagged beat: carry the press once that beat is ported',
  bookmark: 'a /2 card has a stage mark at each phase entry and no authored bookmark: keep the phase entry or drop the bookmark',
  hint: 'name the opener’s moment as a /2 anchor (start, pulseLoss, rosc, a phase or an action)',
};

/** The leaves of a `when`, with their paths. */
function leaves(w: When, path: string, out: Array<{ w: When; path: string }> = []): Array<{ w: When; path: string }> {
  if ('all' in w) w.all.forEach((c, i) => leaves(c, `${path}/all/${i}`, out));
  else if ('any' in w) w.any.forEach((c, i) => leaves(c, `${path}/any/${i}`, out));
  else out.push({ w, path });
  return out;
}
const leafKind = (w: When): FlagKind => ('vital' in w ? 'vital' : 'afterS' in w ? 'afterS' : 'atScenarioS' in w ? 'atScenarioS' : 'sensor' in w ? 'sensor' : 'event' in w ? 'event' : 'manual');
const isPress = (w: When) => 'manual' in w || 'event' in w;
const said = (w: When): string => {
  if ('vital' in w) return `the displayed ${w.vital.var} ${w.vital.op} ${w.vital.value}${w.vital.forS ? ` for ${w.vital.forS} s` : ''}`;
  if ('afterS' in w) return `${w.afterS} s in the state`;
  if ('atScenarioS' in w) return `${w.atScenarioS} s on the scenario clock`;
  if ('sensor' in w) return `the ${w.sensor.sensor} sensor ${w.sensor.state}`;
  if ('event' in w) return `the learner’s ${Object.entries(w.event).map(([k, v]) => (k === 'kind' ? v : `${k} ${v}`)).join(', ')}`;
  if ('manual' in w) return `the press “${w.manual.label}”`;
  return 'a combined condition';
};

/** A /1 `when` as a /2 phase rule, when every leaf is a vital on a truth variable (null otherwise). */
function ruleOf(w: When): PhaseRule | null {
  if ('vital' in w) {
    if (!TRUTH_VARS.has(w.vital.var)) return null;
    const { var: v, op, value, forS } = w.vital;
    return { value: { var: v as never, op, value, ...(forS !== undefined ? { forS } : {}) } };
  }
  if ('all' in w || 'any' in w) {
    const xs = ('all' in w ? w.all : w.any).map(ruleOf);
    if (xs.some((x) => x === null)) return null;
    return 'all' in w ? { all: xs as PhaseRule[] } : { any: xs as PhaseRule[] };
  }
  return null;
}
const pure = (w: When): boolean => leaves(w, '').every((l) => 'vital' in l.w);
const ruleish = (w: When): boolean => leaves(w, '').every((l) => !isPress(l.w));

/** The draft and its flags. */
export function convertV1(doc: ScenarioDoc): Conversion {
  const flags: PortFlag[] = [];
  const flag = (kind: FlagKind, from: string, at: string, was: string, alsoAt?: string[]) => flags.push({ kind, from, at, was, decide: DECIDE[kind], ...(alsoAt?.length ? { alsoAt } : {}) });
  const states = doc.states;
  const byId = new Map(states.map((s) => [s.id, s]));
  const sIndex = new Map(states.map((s, i) => [s.id, i]));
  const label = (s: ScenarioState) => s.label ?? s.id;

  // 1. Each transition's alternatives (an `any` is one per member), sorted into what is carried and what is not.
  type Alt = { from: ScenarioState; tr: NonNullable<ScenarioState['transitions']>[number]; trPath: string; w: When; path: string; to: string; parts: Array<{ w: When; path: string }> };
  const rules: Alt[] = []; // carried rule alternatives (all vital on truth)
  const presses: Alt[] = []; // manual alternatives, carried if the state they are offered in is reachable
  const uncarried: Array<{ alt: Alt; why: string }> = [];
  const ruleTargets = new Set<string>(); // states a rule alternative (carried or flagged) enters
  states.forEach((s, i) => s.transitions?.forEach((tr, j) => {
    const trPath = `/states/${i}/transitions/${j}`;
    const wPath = `${trPath}/when`;
    if (tr.probability !== undefined) {
      if (ruleish(tr.when)) {
        ruleTargets.add(tr.to);
        if (tr.else) ruleTargets.add(tr.else);
      }
      uncarried.push({ alt: { from: s, tr, trPath, w: tr.when, path: wPath, to: tr.to, parts: [{ w: tr.when, path: wPath }] }, why: `rolled with probability ${tr.probability} (else ${tr.else ?? 'stay'})` });
      return;
    }
    const alts = 'any' in tr.when ? tr.when.any.map((w, k) => ({ w, path: `${wPath}/any/${k}` })) : [{ w: tr.when, path: wPath }];
    const carried: Array<{ w: When; path: string }> = [];
    for (const { w, path } of alts) {
      const alt: Alt = { from: s, tr, trPath, w, path, to: tr.to, parts: [{ w, path }] };
      if ('manual' in w) presses.push(alt);
      else if (ruleish(w)) {
        ruleTargets.add(tr.to);
        if (pure(w) && ruleOf(w)) carried.push({ w, path });
        else uncarried.push({ alt, why: '' });
      } else uncarried.push({ alt, why: '' });
    }
    // the carried rule alternatives of one transition are one rule: the `any` of them (the whole `when` when all are)
    if (carried.length === alts.length && carried.length > 1) rules.push({ from: s, tr, trPath, w: tr.when, path: wPath, to: tr.to, parts: carried });
    else if (carried.length) rules.push({ from: s, tr, trPath, w: carried.length === 1 ? carried[0]!.w : { any: carried.map((c) => c.w) }, path: carried.length === 1 ? carried[0]!.path : wPath, to: tr.to, parts: carried });
  }));
  const isPhase = (id: string) => id === doc.initialState || ruleTargets.has(id);
  const phaseIds = states.map((s) => s.id).filter(isPhase);
  const pIndex = new Map(phaseIds.map((id, i) => [id, i]));

  // 2. The press steps' hosts: the phases a press step is reached from through carried presses.
  const hosts = new Map<string, Set<string>>(); // press step → phases
  for (const p of phaseIds) {
    const seen = new Set([p]);
    const queue = [p];
    while (queue.length) {
      const y = queue.shift()!;
      for (const a of presses) if (a.from.id === y && !isPhase(a.to) && !seen.has(a.to)) {
        seen.add(a.to);
        queue.push(a.to);
        (hosts.get(a.to) ?? hosts.set(a.to, new Set()).get(a.to)!).add(p);
      }
    }
  }
  const openIn = (id: string): string[] => (isPhase(id) ? [id] : phaseIds.filter((p) => hosts.get(id)?.has(p)));

  // 3. Actions, from the carried presses.
  const actions: Action[] = [];
  const actionKey = new Map<string, number>();
  for (const a of presses) {
    const phases = openIn(a.from.id);
    const lbl = (a.w as { manual: { label: string } }).manual.label;
    if (!phases.length) {
      flag('unreachable', a.path, '/actions', `${said(a.w)} in “${label(a.from)}”, a state reached only through a flagged beat`);
      continue;
    }
    const to = byId.get(a.to)!;
    const give: DocCommand[] = a.to === a.from.id ? [] : [...(a.from.onExit ?? []), ...(to.onEnter ?? [])];
    const key = `${lbl}\u0000${JSON.stringify(give)}`;
    let i = actionKey.get(key);
    if (i === undefined) {
      i = actions.length;
      actionKey.set(key, i);
      actions.push({ id: a.tr.id, label: lbl, kind: 'procedure', graded: false, phases: [], ...(give.length ? { give } : {}), ...(a.tr.$comment ? { $comment: a.tr.$comment } : {}) } as Action);
    }
    const act = actions[i]!;
    act.phases = phaseIds.filter((p) => act.phases.includes(p) || phases.includes(p));
    if (isPhase(a.to) && a.to !== a.from.id) flag('pressIntoPhase', a.path, `/actions/${i}`, `${said(a.w)} entered the state “${label(to)}”, which is a phase here`);
  }
  // key order as a card is written: id, label, kind, phases, graded, give
  const ordered = actions.map(({ id, label: l, kind, phases, graded, give, $comment }) => ({ ...($comment ? { $comment } : {}), id, label: l, kind, graded, phases, ...(give ? { give } : {}) }) as Action);

  // 4. Phases: their entry rules and what may follow each.
  const phases: Phase[] = phaseIds.map((id) => {
    const s = byId.get(id)!;
    return { id, label: label(s), ...(s.notes !== undefined ? { notes: s.notes } : {}), ...(s.$comment ? { $comment: s.$comment } : {}), ...(id === doc.initialState ? { initial: true as const } : {}) };
  });
  for (const p of phases) {
    const into = rules.filter((r) => r.to === p.id);
    const forms = [...new Set(into.map((r) => JSON.stringify(ruleOf(r.w))))];
    if (forms.length === 1) p.enter = JSON.parse(forms[0]!) as PhaseRule;
    else if (forms.length > 1) for (const r of into) flag('entryDiffers', r.path, `/phases/${pIndex.get(p.id)}/enter`, `${said(r.w)} from “${label(r.from)}”, one of ${forms.length} different rules into “${p.label}”`);
    for (const r of into) for (const l of r.parts.flatMap((x) => leaves(x.w, x.path))) flag('vital', l.path, `/phases/${pIndex.get(p.id)}/enter`, `${said(l.w)} (read on the display, rank 2; the /1 hold restarts at each state entry)`);
  }
  for (const p of phases) {
    const own = [p.id, ...states.map((s) => s.id).filter((s) => !isPhase(s) && hosts.get(s)?.has(p.id))];
    const next: string[] = [];
    const leavesByPress = presses.some((a) => a.from.id === p.id && !isPhase(a.to));
    for (const y of own) for (const r of rules.filter((x) => x.from.id === y)) {
      const at = `/phases/${pIndex.get(p.id)}/next`;
      if (r.to === p.id) {
        if (y !== p.id) flag('pressScope', r.path, at, `${said(r.w)} returns from “${label(r.from)}” to “${p.label}”, where /2 already is`);
        continue;
      }
      if (!next.includes(r.to)) next.push(r.to);
      const k = next.indexOf(r.to);
      if (y !== p.id) flag('pressScope', r.path, `${at}/${k}`, `${said(r.w)} is tried in /1 only after a press into “${label(r.from)}”`);
      else if (leavesByPress) flag('pressScope', r.path, `${at}/${k}`, `${said(r.w)} stops being tried in /1 once a press leaves “${p.label}”`);
      if (r.from.onExit?.length) flag('onExit', r.trPath, `${at}/${k}`, `“${label(r.from)}” sends ${r.from.onExit.length} command(s) on leaving it`);
    }
    if (next.length) p.next = next;
  }

  // 5. What is not carried: one flag per leaf, and one for the die. Where it lands: the target phase's rule when the
  //    target has none, else the source's list of what follows; a press's beat lands on the actions.
  const firstHost = (id: string) => (isPhase(id) ? id : openIn(id)[0]);
  for (const { alt, why } of uncarried) {
    const target = phases.find((p) => p.id === alt.to);
    const host = firstHost(alt.from.id);
    const at = !ruleish(alt.w) ? '/actions'
      : target && !target.enter && !target.initial ? `/phases/${pIndex.get(target.id)}/enter`
      : host !== undefined ? `/phases/${pIndex.get(host)}/next` : '/phases';
    const into = `“${label(alt.from)}” → “${label(byId.get(alt.to)!)}”`;
    for (const l of leaves(alt.w, alt.path)) flag(leafKind(l.w), l.path, at, `${said(l.w)} (${into})${'vital' in l.w && !TRUTH_VARS.has(l.w.vital.var) ? `: ${l.w.vital.var} is not a truth variable` : ''}`);
    const other = alt.tr.else !== undefined ? phases.find((p) => p.id === alt.tr.else && !p.enter && !p.initial) : undefined;
    if (why) flag('probability', alt.trPath, at, `${into}, ${why}`, other && ruleish(alt.w) ? [`/phases/${pIndex.get(other.id)}/enter`] : undefined);
  }

  // 6. The script: the initial state's onEnter and each phase's onEnter, on the phase's entry.
  const script: ScriptEntry[] = [];
  const reach = (from: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [...(phases.find((p) => p.id === from)?.next ?? [])];
    while (queue.length) {
      const x = queue.shift()!;
      if (seen.has(x)) continue;
      seen.add(x);
      queue.push(...(phases.find((p) => p.id === x)?.next ?? []));
    }
    return seen;
  };
  for (const p of phases) {
    const s = byId.get(p.id)!;
    if (!s.onEnter?.length) continue;
    script.push({ id: `enter-${p.id}`, on: `phase:${p.id}`, commands: s.onEnter });
    if (reach(p.id).has(p.id)) flag('reentry', `/states/${sIndex.get(p.id)}/onEnter`, `/script/${script.length - 1}`, `“${p.label}” can be entered again, and /1 sends its onEnter at each entry`);
  }

  // 7. Objectives, bookmarks, the Debrief's hints.
  doc.objectives?.forEach((o, i) => flag('objective', `/objectives/${i}`, '/actions', typeof o === 'string' ? `“${o}” (not assessable in /1)` : `“${o.text}”${o.rule ? ` (${JSON.stringify(o.rule)})` : ''}${o.debrief ? `, ${o.debrief}` : ''}`));
  doc.bookmarks?.forEach((b, i) => flag('bookmark', `/bookmarks/${i}`, pIndex.has(b.state) ? `/phases/${pIndex.get(b.state)}` : '/phases', `the bookmark “${b.label ?? b.id}” at “${b.state}”`));
  let hints: ScenarioDocV2['debriefHints'];
  if (doc.debriefHints) {
    const anchor = (at: string): string | null => (['start', 'pulseLoss', 'rosc'].includes(at) ? at : at.startsWith('state:') && pIndex.has(at.slice(6)) ? `phase:${at.slice(6)}` : null);
    const list = (k: 'openers' | 'handoutQuestions') => doc.debriefHints?.[k]?.flatMap((o, i) => {
      const a = anchor(o.at);
      if (a === null) {
        flag('hint', `/debriefHints/${k}/${i}`, `/debriefHints/${k}`, `“${o.text}” at ${o.at}`);
        return [];
      }
      return [{ at: a as never, text: o.text }];
    });
    const openers = list('openers');
    const handoutQuestions = list('handoutQuestions');
    hints = { ...(doc.debriefHints.show ? { show: doc.debriefHints.show } : {}), ...(openers?.length ? { openers } : {}), ...(handoutQuestions?.length ? { handoutQuestions } : {}) };
  }

  const header = Object.fromEntries(HEADER.filter((k) => doc[k] !== undefined).map((k) => [k, doc[k]]));
  const draft = {
    ...('$comment' in header ? { $comment: header.$comment } : {}),
    schema: 'pme-scenario/2',
    ...Object.fromEntries(Object.entries(header).filter(([k]) => k !== '$comment')),
    phases,
    actions: ordered,
    ...(script.length ? { script } : {}),
    ...(hints && Object.keys(hints).length ? { debriefHints: hints } : {}),
  } as unknown as ScenarioDocV2;
  return { draft, flags };
}

/** Whether a validator line (`<path>: <words>`) is at one of the flagged places: the path is the flag's own or inside
 *  it, or the flag is inside an entry the validator names as a whole (a required key missing from it). */
export function flagCovers(flags: readonly PortFlag[], line: string): boolean {
  const path = /^(\/\S*): /.exec(line)?.[1] ?? '/';
  return flags.some((f) => [f.at, ...(f.alsoAt ?? [])].some((at) => path === at || path.startsWith(`${at}/`) || (/required property/.test(line) && at.startsWith(`${path}/`))));
}
