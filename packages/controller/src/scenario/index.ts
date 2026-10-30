// `@pme/controller/scenario`: the scenario runner and everything that needs ajv. A separate entry so the root
// entry (and the renderer's IIFE, which imports it) never bundles ajv or the built-in JSON.
export * from './types.ts';
export type * from './types-v2.ts';
export { validateScenario, formatAjvError, SCENARIO_SCHEMA, SCENARIO_SCHEMA_V2, type ValidationResult, type ValidateOptions } from './validate.ts';
export { ScenarioRunner, compare, matches, hasManual, type RunnerInput, type RunnerEffect, type RunnerState, type RunLogEntry, type VitalHold } from './runner.ts';
export { PhaseRunner, type PhaseRunnerEffect, type PhaseRunLogEntry, type PhaseHold } from './phase-runner.ts';
export { namedRules, holds, walkLeaves, windowOf, slopePerMin, spreadPct, type NamedRule, type RuleCtx } from './rules.ts';
export { replayRunLog, runLog, type ScenarioRunLog, type ScenarioRunLogV2 } from './replay.ts';
export { ScenarioDriver, isHop, HOP_MAX_S, type ScenarioDriverOptions, type RunPosition } from './driver.ts';
export { RHYTHM_STAND_INS, resolveRhythm, type StandIn } from './standins.ts';
export { BUILTIN_SCENARIOS, BUILTIN_CATALOGUE } from './builtins.ts';
export { engineOptionsOf } from './patient.ts';
