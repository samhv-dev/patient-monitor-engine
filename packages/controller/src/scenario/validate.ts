// Scenario validation: the JSON Schema (ajv, MIT — NOTICES N-011) for shape, then the cross-references a schema
// cannot express (unique ids, `to`/`else`/bookmark targets exist). Errors carry the JSON path of the offending
// value, e.g. `/states/1/transitions/0/when: a trigger must have exactly one of afterS, …` (BUILD-PLAN Stage 6
// acceptance 6). This module is the only importer of ajv; it lives behind the `@pme/controller/scenario` entry
// so the IIFE and the root entry never bundle it.
import Ajv, { type ErrorObject } from 'ajv';
import schema from '../../scenarios/pme-scenario-1.schema.json';
import type { DocCommand, ScenarioDoc, When } from './types.ts';

export const SCENARIO_SCHEMA: object = schema;
export type ValidationResult =
  | { ok: true; doc: ScenarioDoc; warnings: string[] }
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

/** Validate an unknown value as a `pme-scenario/1` document. */
export function validateScenario(input: unknown, opts: ValidateOptions = {}): ValidationResult {
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
