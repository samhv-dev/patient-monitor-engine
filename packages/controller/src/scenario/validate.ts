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
export function formatAjvError(e: ErrorObject): string {
  const at = e.instancePath || '/';
  const p = e.params as Record<string, unknown>;
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
const DISPLAY_KEYS = 'value, phaseRule, all, any, not';
let compiledV2: ReturnType<Ajv['compile']> | null = null;
const DEFS = (schemaV2 as { definitions: Record<string, object> }).definitions;

function validatorV2(): ReturnType<Ajv['compile']> {
  // its own instance, so the /1 validator above is compiled exactly as before; verbose: an error carries the schema
  // object it failed, so a rule's one-leaf message can be told from another object's property count
  compiledV2 ??= new Ajv({ allErrors: true, discriminator: true, strict: true, allowUnionTypes: true, verbose: true }).addSchema(schema).compile(schemaV2);
  return compiledV2;
}

function formatV2(e: ErrorObject): string {
  const at = e.instancePath || '/';
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
  unique(doc.judged, 'judged', 'judged');
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

  let initial: string | null = null;
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
    if (a.drug) {
      drug(a.drug.id, `${at}/drug/id`);
      cls(a.drug.cls, `${at}/drug/cls`);
      a.drug.alternatives?.forEach((x, k) => drug(x.id, `${at}/drug/alternatives/${k}/id`));
      // a judged route the engine does not model: the run records "route not modelled" (F5.1b); a warning, the card stays valid
      const ids = [a.drug.id, ...(a.drug.alternatives ?? []).map((x) => x.id)].filter((id): id is string => id !== undefined && id in DRUGS);
      a.drug.route?.set.forEach((r, k) => ids.forEach((id) => routeHonoured(id, r) || warnings.push(`${at}/drug/route/set/${k}: ${id}: route ${r} is judged; the engine does not model it`)));
    }
    if (a.window) anchor(a.window.anchor, `${at}/window/anchor`);
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
  // a display rule's phaseRule leaf names a phase of the card that has an entry rule (the initial phase has none)
  const display = (r: DisplayRule | undefined, path: string): void => {
    if (!r) return;
    if ('phaseRule' in r) {
      if (!phases.has(r.phaseRule)) errors.push(`${path}/phaseRule: no phase "${r.phaseRule}"`);
      else if (!doc.phases.find((p) => p.id === r.phaseRule)?.enter) errors.push(`${path}/phaseRule: the phase "${r.phaseRule}" has no entry rule`);
    } else if ('all' in r) r.all.forEach((c, k) => display(c, `${path}/all/${k}`));
    else if ('any' in r) r.any.forEach((c, k) => display(c, `${path}/any/${k}`));
    else if ('not' in r) display(r.not, `${path}/not`);
  };
  doc.judged?.forEach((j, i) => display(j.display, `/judged/${i}/display`));
  doc.outcomes?.forEach((o, i) => {
    rule(o.rule, `/outcomes/${i}/rule`);
    anchor(o.anchor, `/outcomes/${i}/anchor`);
  });
  doc.script?.forEach((s, i) => {
    const m = typeof s.on === 'string' ? new RegExp(`^(phase|action):(${ID})`).exec(s.on) : null;
    if (m?.[1] === 'phase') phase(m[2] as string, `/script/${i}/on`);
    else if (m?.[1] === 'action') action(m[2] as string, `/script/${i}/on`);
    commands(s.commands, `/script/${i}/commands`);
  });
  if (doc.patient?.rhythm && rhythms && !rhythms.has(doc.patient.rhythm.id)) warnings.push(`/patient/rhythm/id: "${doc.patient.rhythm.id}" is not in this engine`);
  return errors.length ? { ok: false, errors: errors.slice(0, MAX_ERRORS), warnings } : { ok: true, doc, warnings };
}
