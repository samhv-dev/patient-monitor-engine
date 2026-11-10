// Scenario validation: the JSON Schema (ajv, MIT — NOTICES N-011) for shape, then the cross-references a schema
// cannot express (unique ids, `to`/`else`/bookmark targets exist). Errors carry the JSON path of the offending
// value, e.g. `/states/1/transitions/0/when: a trigger must have exactly one of afterS, …` (BUILD-PLAN Stage 6
// acceptance 6). This module is the only importer of ajv; it lives behind the `@pme/controller/scenario` entry
// so the IIFE and the root entry never bundle it. `pme-scenario/2` (plan F1) has its own schema, which reuses /1's
// patient, device and command definitions by reference, and its own cross-checks (validateV2 below).
import Ajv, { type ErrorObject } from 'ajv';
import { DRUGS, routeHonoured } from '@pme/engine-core';
import schema from '../../scenarios/pme-scenario-1.schema.json';
import schemaV2 from '../../scenarios/pme-scenario-2.schema.json';
import { LEARNER_LAB_PANELS } from '../protocol.ts';
import type { AnyScenarioDoc, DocCommand, ScenarioDoc, When } from './types.ts';
import type { Anchor, DisplayRule, PhaseRule, ScenarioDocV2 } from './types-v2.ts';

export const SCENARIO_SCHEMA: object = schema;
export const SCENARIO_SCHEMA_V2: object = schemaV2;
export type ValidationResult =
  | { ok: true; doc: AnyScenarioDoc; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export interface ValidateOptions {
  /** Rhythm ids the host engine knows; setRhythm to any other id is reported as a warning (stand-ins apply). */
  rhythms?: readonly string[];
}

const TRIGGER_KEYS = 'afterS, atScenarioS, vital, event, sensor, manual, all, any';
const MAX_ERRORS = 20;
/** A trigger object: …/when, or a child of all/any inside it. */
const WHEN_PATH = /\/when(\/(all|any)\/\d+)*$/;
let compiled: ReturnType<Ajv['compile']> | null = null;

function validator(): ReturnType<Ajv['compile']> {
  compiled ??= new Ajv({ allErrors: true, discriminator: true, strict: true, allowUnionTypes: true }).compile(schema);
  return compiled;
}

/** One readable line per ajv error: `<json path>: <what is wrong>`. */
/** The longest card question the learner handout prints on one line (D16): measured, not chosen. In print media at the
 *  182 mm content width, in the bundled print font (Inter Print 13.33 px), after its "mm:ss" label (10.3 mm), the
 *  handout's question line (177.0 mm) held 92 to 100 characters of the drafted questions' own text, Chromium and
 *  WebKit alike (6 November 2026, the D16 e2e probe on the MH card); the limit is the shortest of those, 92. A question
 *  that wraps adds 4.7 mm, and the MH handout without questions is 266.9 mm of its 267 mm page (with two wrapped
 *  questions: 276.4 mm). The e2e page fit stays the truth; this tells an author at validation time. The two scenario
 *  schemas carry the same number (`maxLength`), a test keeps them equal. */
export const HANDOUT_QUESTION_MAX = 92;
const HANDOUT_Q_TEXT = /^\/debriefHints\/handoutQuestions\/\d+\/text$/;

export function formatAjvError(e: ErrorObject): string {
  const at = e.instancePath || '/';
  const p = e.params as Record<string, unknown>;
  if (HANDOUT_Q_TEXT.test(at) && e.keyword === 'maxLength') {
    return `${at}: at most ${HANDOUT_QUESTION_MAX} characters, about 90 characters — one line of the A4 handout; a wrapped question pushes the MH handout over one page (measured 276.4 mm of 267)`;
  }
  if (WHEN_PATH.test(at) && (e.keyword === 'maxProperties' || e.keyword === 'minProperties')) {
    return `${at}: a trigger must have exactly one of ${TRIGGER_KEYS}`;
  }
  switch (e.keyword) {
    case 'additionalProperties':
      return `${at}: unexpected property "${String(p.additionalProperty)}"`;
    case 'required':
      return `${at}: missing required property "${String(p.missingProperty)}"`;
    case 'enum':
      return `${at}: must be one of ${(p.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', ')}`;
    case 'const':
      return `${at}: must be ${JSON.stringify(p.allowedValue)}`;
    case 'discriminator':
      return p.error === 'mapping' ? `${at}/type: unknown command type ${JSON.stringify(p.tagValue)}` : `${at}: command needs a string "type"`;
    case 'dependencies':
      return `${at}: "${String(p.property)}" needs "${String(p.missingProperty)}"`;
    default:
      return `${at}: ${e.message ?? e.keyword}`;
  }
}

/**
 * Validate an unknown value as a scenario document: `pme-scenario/2` when it says so, else `pme-scenario/1`. A document
 * tagged /2 that still carries /1's `states` is a mis-tagged /1 document: it gets /1's errors, as before /2 existed.
 */
export function validateScenario(input: unknown, opts: ValidateOptions = {}): ValidationResult {
  const o = input as Record<string, unknown> | null;
  if (o && typeof o === 'object' && o.schema === 'pme-scenario/2' && !('states' in o)) return validateV2(input, opts);
  const v = validator();
  if (!v(input)) {
    const errors = [...new Set((v.errors ?? []).map(formatAjvError))].slice(0, MAX_ERRORS);
    return { ok: false, errors, warnings: [] };
  }
  const doc = input as ScenarioDoc;
  const errors: string[] = [];
  const warnings: string[] = [];
  const stateIds = new Map<string, number>();
  doc.states.forEach((s, i) => {
    if (stateIds.has(s.id)) errors.push(`/states/${i}/id: duplicate state id "${s.id}"`);
    else stateIds.set(s.id, i);
    // The panel, the remote and the transition text print the state's label — a document without one shows the learner
    // an engine id. A warning, not an error: minimal and test documents stay valid.
    if (s.label === undefined) warnings.push(`/states/${i}/label: state "${s.id}" has no label (its id is shown)`);
  });
  if (!stateIds.has(doc.initialState)) errors.push(`/initialState: no state "${doc.initialState}"`);
  const transitionIds = new Set<string>();
  const rhythms = opts.rhythms ? new Set(opts.rhythms) : null;
  const checkCommands = (list: DocCommand[] | undefined, path: string) =>
    list?.forEach((c, k) => {
      if (c.type === 'setRhythm' && rhythms && !rhythms.has(c.rhythm)) warnings.push(`${path}/${k}/rhythm: "${c.rhythm}" is not in this engine`);
    });
  if (doc.patient?.rhythm && rhythms && !rhythms.has(doc.patient.rhythm.id)) warnings.push(`/patient/rhythm/id: "${doc.patient.rhythm.id}" is not in this engine`);
  doc.states.forEach((s, i) => {
    checkCommands(s.onEnter, `/states/${i}/onEnter`);
    checkCommands(s.onExit, `/states/${i}/onExit`);
    s.transitions?.forEach((t, j) => {
      const at = `/states/${i}/transitions/${j}`;
      if (transitionIds.has(t.id)) errors.push(`${at}/id: duplicate transition id "${t.id}" (ids are unique per document)`);
      transitionIds.add(t.id);
      if (!stateIds.has(t.to)) errors.push(`${at}/to: no state "${t.to}"`);
      if (t.else !== undefined && !stateIds.has(t.else)) errors.push(`${at}/else: no state "${t.else}"`);
      if (countManual(t.when) > 1) errors.push(`${at}/when: at most one manual trigger per transition`);
    });
  });
  doc.bookmarks?.forEach((b, i) => {
    if (!stateIds.has(b.state)) errors.push(`/bookmarks/${i}/state: no state "${b.state}"`);
  });
  (['openers', 'handoutQuestions'] as const).forEach((k) => doc.debriefHints?.[k]?.forEach((o, i) => {
    if (o.at.startsWith('state:') && !stateIds.has(o.at.slice(6))) errors.push(`/debriefHints/${k}/${i}/at: no state "${o.at.slice(6)}"`);
  }));
  return errors.length ? { ok: false, errors: errors.slice(0, MAX_ERRORS), warnings } : { ok: true, doc, warnings };
}

function countManual(w: When): number {
  if ('manual' in w) return 1;
  if ('all' in w) return w.all.reduce((n, c) => n + countManual(c), 0);
  if ('any' in w) return w.any.reduce((n, c) => n + countManual(c), 0);
  return 0;
}

// --- pme-scenario/2 ------------------------------------------------------------------------------------------------
const RULE_KEYS = 'value, slope, unchanged, visited, signal, all, any, not';
const DISPLAY_KEYS = 'value, phaseEntered, all, any, not';
let compiledV2: ReturnType<Ajv['compile']> | null = null;
const DEFS = (schemaV2 as { definitions: Record<string, object> }).definitions;

function validatorV2(): ReturnType<Ajv['compile']> {
  // its own instance, so the /1 validator above is compiled exactly as before; verbose: an error carries the schema
  // object it failed, so a rule's one-leaf message can be told from another object's property count
  compiledV2 ??= new Ajv({ allErrors: true, discriminator: true, strict: true, allowUnionTypes: true, verbose: true }).addSchema(schema).compile(schemaV2);
  return compiledV2;
}

/** Judged rows are retired (the owner's ruling of 5 November): every row is an automatic row or an action, and a team
 *  act the instructor observes is a record action (the scenario `record` command, Q19), timed by its window when the card
 *  times it, recorded-not-timed without one. A card that still declares `judged` gets this one line. */
const JUDGED_RETIRED = '/judged: judged rows are retired (owner, 5 November): write each as a record action in "actions" (kind "communication" with no give; a window when the card times it, none when it is recorded, not timed)';

function formatV2(e: ErrorObject): string {
  const at = e.instancePath || '/';
  if (e.keyword === 'additionalProperties' && at === '/' && (e.params as { additionalProperty?: string }).additionalProperty === 'judged') return JUDGED_RETIRED;
  if (e.keyword === 'maxProperties' || e.keyword === 'minProperties') {
    if (e.parentSchema === DEFS.phaseRule) return `${at}: a phase rule must have exactly one of ${RULE_KEYS}`;
    if (e.parentSchema === DEFS.displayRule) return `${at}: a display rule must have exactly one of ${DISPLAY_KEYS}`;
  }
  return formatAjvError(e);
}

/** Every kind whose criteria live in a block of their own, and that block. */
const KIND_BLOCK = { drug: 'drug', device: 'device', fluid: 'fluid', physical: 'physical', decision: 'effect' } as const;
const BLOCKS = Object.values(KIND_BLOCK);
const ID = '[A-Za-z][A-Za-z0-9_.-]{0,63}';

function validateV2(input: unknown, opts: ValidateOptions): ValidationResult {
  const v = validatorV2();
  if (!v(input)) {
    // `if` only says which branch failed; the branch's own error carries the path and the reason
    const errors = [...new Set((v.errors ?? []).filter((e) => e.keyword !== 'if').map(formatV2))].slice(0, MAX_ERRORS);
    return { ok: false, errors, warnings: [] };
  }
  const doc = input as ScenarioDocV2;
  const errors: string[] = [];
  const warnings: string[] = [];
  const rhythms = opts.rhythms ? new Set(opts.rhythms) : null;
  const unique = (list: Array<{ id: string }> | undefined, block: string, what: string): Set<string> => {
    const ids = new Set<string>();
    list?.forEach((x, i) => {
      if (ids.has(x.id)) errors.push(`/${block}/${i}/id: duplicate ${what} id "${x.id}"`);
      ids.add(x.id);
    });
    return ids;
  };
  const phases = unique(doc.phases, 'phases', 'phase');
  const actions = unique(doc.actions, 'actions', 'action');
  unique(doc.outcomes, 'outcomes', 'outcome');
  unique(doc.script, 'script', 'script');
  const phase = (id: string, path: string) => phases.has(id) || errors.push(`${path}: no phase "${id}"`);
  const action = (id: string, path: string) => actions.has(id) || errors.push(`${path}: no action "${id}"`);
  const drug = (id: string | undefined, path: string) => id === undefined || id in DRUGS || errors.push(`${path}: no drug "${id}" in the engine`);
  const classes = new Set(Object.values(DRUGS).map((r) => r.cls as string));
  const cls = (c: string | undefined, path: string) => c === undefined || classes.has(c) || errors.push(`${path}: no drug class "${c}" in the engine`);
  const rule = (r: PhaseRule | undefined, path: string): void => {
    if (!r) return;
    if ('visited' in r) phase(r.visited, `${path}/visited`);
    else if ('signal' in r) {
      const id = r.signal.startsWith('rhythm:') ? r.signal.slice(7) : null;
      if (id !== null && rhythms && !rhythms.has(id)) warnings.push(`${path}/signal: "${id}" is not in this engine`);
    } else if ('all' in r) r.all.forEach((c, k) => rule(c, `${path}/all/${k}`));
    else if ('any' in r) r.any.forEach((c, k) => rule(c, `${path}/any/${k}`));
    else if ('not' in r) rule(r.not, `${path}/not`);
  };
  const anchor = (a: Anchor, path: string) => {
    if (typeof a !== 'string') return rule(a.rule, `${path}/rule`);
    if (a.startsWith('phase:')) phase(a.slice(6), path);
    else if (a.startsWith('action:')) action(a.slice(7), path);
  };
  const commands = (list: DocCommand[] | undefined, path: string) =>
    list?.forEach((c, k) => {
      if (c.type === 'setRhythm' && rhythms && !rhythms.has(c.rhythm)) warnings.push(`${path}/${k}/rhythm: "${c.rhythm}" is not in this engine`);
      if (c.type === 'applyEvent' && c.event.kind === 'drug') drug(c.event.drugId, `${path}/${k}/event/drugId`);
    });

  /** Display-rule anchors of action windows (F9), checked below. */
  const displayAnchors: Array<[DisplayRule, string]> = [];
  let initial: string | null = null;
  let recognition: string | null = null;
  doc.phases.forEach((p, i) => {
    if (p.initial) {
      if (initial === null) initial = p.id;
      else errors.push(`/phases/${i}/initial: a second initial phase (the first is "${initial}")`);
    }
    rule(p.enter, `/phases/${i}/enter`);
    p.next?.forEach((n, k) => phase(n, `/phases/${i}/next/${k}`));
  });
  if (initial === null) errors.push('/phases: no initial phase (exactly one has "initial": true)');
  doc.actions.forEach((a, i) => {
    const at = `/actions/${i}`;
    a.phases.forEach((p, k) => phase(p, `${at}/phases/${k}`));
    const own = (KIND_BLOCK as Record<string, string>)[a.kind];
    if (own && !(own in a)) errors.push(`${at}: a ${a.kind} action needs "${own}"`);
    for (const b of BLOCKS) if (b !== own && b in a) errors.push(`${at}/${b}: only a ${b === 'effect' ? 'decision' : b} action has "${b}"`);
    commands(a.give, `${at}/give`);
    // plan learner-action-remote.md §6: `sample` is a sample action's; a panel the engine never draws can never satisfy it
    if (a.sample && a.kind !== 'sample') errors.push(`${at}/sample: only a sample action has "sample"`);
    a.sample?.panel.forEach((x, k) => LEARNER_LAB_PANELS.has(x) || warnings.push(`${at}/sample/panel/${k}: "${x}" is not a panel the engine draws (${[...LEARNER_LAB_PANELS].join(', ')})`));
    if (a.drug) {
      drug(a.drug.id, `${at}/drug/id`);
      cls(a.drug.cls, `${at}/drug/cls`);
      a.drug.alternatives?.forEach((x, k) => drug(x.id, `${at}/drug/alternatives/${k}/id`));
      // a judged route the engine does not model: the run records "route not modelled" (F5.1b); a warning, the card stays valid
      const ids = [a.drug.id, ...(a.drug.alternatives ?? []).map((x) => x.id)].filter((id): id is string => id !== undefined && id in DRUGS);
      a.drug.route?.set.forEach((r, k) => ids.forEach((id) => routeHonoured(id, r) || warnings.push(`${at}/drug/route/set/${k}: ${id}: route ${r} is judged; the engine does not model it`)));
    }
    const wa = a.window?.anchor;
    if (wa !== undefined && typeof wa !== 'string' && 'first' in wa) wa.first.forEach((x, k) => (typeof x !== 'string' && 'display' in x ? displayAnchors.push([x.display, `${at}/window/anchor/first/${k}/display`]) : anchor(x as Anchor, `${at}/window/anchor/first/${k}`)));
    else if (wa !== undefined && typeof wa !== 'string' && 'display' in wa) displayAnchors.push([wa.display, `${at}/window/anchor/display`]);
    else if (typeof wa === 'string' && wa.startsWith('each:action:')) {
      action(wa.slice(12), `${at}/window/anchor`);
      if (a.window?.failAfterS !== undefined) errors.push(`${at}/window/failAfterS: not with an each:action anchor`);
    } else if (wa !== undefined) anchor(wa as Anchor, `${at}/window/anchor`);
    if (a.window?.failAfterS !== undefined && a.window.failAfterS <= a.window.withinS) errors.push(`${at}/window/failAfterS: ${a.window.failAfterS} s must be greater than withinS ${a.window.withinS} s`);
    if (a.recognition) {
      if (recognition === null) recognition = a.id;
      else errors.push(`${at}/recognition: a second recognition action (the first is "${recognition}"); a card has at most one`);
    }
    if (a.preparation && a.window) errors.push(`${at}/window: a preparation step is recorded, never graded: it has no window`);
    if (a.repeat && a.repeatWhile) errors.push(`${at}/repeat: an action has repeat or repeatWhile, not both`);
    const iv = a.repeat?.intervalS;
    if (iv && (iv.min ?? iv.value) === undefined) errors.push(`${at}/repeat/intervalS: a repeat needs its shortest interval (min or value)`);
    a.order?.after?.forEach((x, k) => action(x, `${at}/order/after/${k}`));
    a.order?.before?.forEach((x, k) => action(x, `${at}/order/before/${k}`));
    rule(a.repeatWhile?.rule, `${at}/repeatWhile/rule`);
    rule(a.precondition, `${at}/precondition`);
    a.contraindications?.forEach((c, k) => {
      const ct = `${at}/contraindications/${k}`;
      drug(c.match.drugId, `${ct}/match/drugId`);
      cls(c.match.cls, `${ct}/match/cls`);
      c.inPhases?.forEach((p, j) => phase(p, `${ct}/inPhases/${j}`));
      if (c.afterAction !== undefined) action(c.afterAction, `${ct}/afterAction`);
      rule(c.when, `${ct}/when`);
    });
  });
  // a display rule's phaseEntered leaf names a phase of the card that has an entry rule (the initial phase is entered at
  // the start: no clock)
  const display = (r: DisplayRule | undefined, path: string): void => {
    if (!r) return;
    if ('phaseEntered' in r) {
      if (!phases.has(r.phaseEntered)) errors.push(`${path}/phaseEntered: no phase "${r.phaseEntered}"`);
      else if (!doc.phases.find((p) => p.id === r.phaseEntered)?.enter) errors.push(`${path}/phaseEntered: the phase "${r.phaseEntered}" has no entry rule`);
    } else if ('all' in r) r.all.forEach((c, k) => display(c, `${path}/all/${k}`));
    else if ('any' in r) r.any.forEach((c, k) => display(c, `${path}/any/${k}`));
    else if ('not' in r) display(r.not, `${path}/not`);
  };
  for (const [r, path] of displayAnchors) display(r, path);
  doc.outcomes?.forEach((o, i) => {
    rule(o.rule, `/outcomes/${i}/rule`);
    anchor(o.anchor, `/outcomes/${i}/anchor`);
  });
  (['openers', 'handoutQuestions'] as const).forEach((k) => doc.debriefHints?.[k]?.forEach((o, i) => anchor(o.at, `/debriefHints/${k}/${i}/at`)));
  doc.script?.forEach((s, i) => {
    const m = typeof s.on === 'string' ? new RegExp(`^(phase|action):(${ID})`).exec(s.on) : null;
    if (m?.[1] === 'phase') phase(m[2] as string, `/script/${i}/on`);
    else if (m?.[1] === 'action') action(m[2] as string, `/script/${i}/on`);
    commands(s.commands, `/script/${i}/commands`);
  });
  if (doc.patient?.rhythm && rhythms && !rhythms.has(doc.patient.rhythm.id)) warnings.push(`/patient/rhythm/id: "${doc.patient.rhythm.id}" is not in this engine`);
  return errors.length ? { ok: false, errors: errors.slice(0, MAX_ERRORS), warnings } : { ok: true, doc, warnings };
}
