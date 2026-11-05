// Scenario replay (brief §3.3: seed + command log reproduce the run). The runner's log holds every input and
// control call; feeding them to a fresh runner with the same seed must reproduce every decision (state entries
// and probability rolls) exactly. 'dispatch' entries are the driver's bookkeeping and are not replayed.
// A pme-scenario/2 run (plan F2) has its own log, `pme-scenario-log/2`: its decisions are the phase entries and the
// script firings, and its inputs include the actions' takings.
import { PhaseRunner, type PhaseRunLogEntry } from './phase-runner.ts';
import { ScenarioRunner, type RunLogEntry } from './runner.ts';
import { isV2, type AnyScenarioDoc, type ScenarioDoc } from './types.ts';
import type { ScenarioDocV2 } from './types-v2.ts';

export interface ScenarioRunLog {
  schema: 'pme-scenario-log/1';
  docId: string;
  seed: number;
  entries: RunLogEntry[];
}

export interface ScenarioRunLogV2 {
  schema: 'pme-scenario-log/2';
  docId: string;
  seed: number;
  entries: PhaseRunLogEntry[];
}

const DECISIONS = new Set<RunLogEntry['op']>(['enter', 'roll']);
const DECISIONS_V2 = new Set<PhaseRunLogEntry['op']>(['enter', 'script']);

/** A /1 runner's log, to replay. */
export function runLog(r: ScenarioRunner): ScenarioRunLog;
/** A /2 phase runner's log, to replay. */
export function runLog(r: PhaseRunner): ScenarioRunLogV2;
/** The runner's log (its seed, inputs and decisions), to replay. */
export function runLog(r: ScenarioRunner | PhaseRunner): ScenarioRunLog | ScenarioRunLogV2 {
  if (r instanceof PhaseRunner) return { schema: 'pme-scenario-log/2', docId: r.doc.id, seed: r.seed, entries: structuredClone(r.log) };
  return { schema: 'pme-scenario-log/1', docId: r.doc.id, seed: r.seed, entries: structuredClone(r.log) };
}

/** Re-run a log; `ok` when the replayed decisions equal the recorded ones, entry for entry. */
export function replayRunLog(doc: ScenarioDoc, log: ScenarioRunLog): { ok: boolean; firstDiff: number; decisions: RunLogEntry[] };
/** Re-run a /2 log: its decisions are the phase entries and the script firings. */
export function replayRunLog(doc: ScenarioDocV2, log: ScenarioRunLogV2): { ok: boolean; firstDiff: number; decisions: PhaseRunLogEntry[] };
/** Re-run a log of either format. */
export function replayRunLog(doc: AnyScenarioDoc, log: ScenarioRunLog | ScenarioRunLogV2): { ok: boolean; firstDiff: number; decisions: Array<RunLogEntry | PhaseRunLogEntry> } {
  if (log.docId !== doc.id) throw new Error(`log is for ${log.docId}, not ${doc.id}`);
  if (isV2(doc)) return replayV2(doc, log as ScenarioRunLogV2);
  return replayV1(doc, log as ScenarioRunLog);
}

function replayV1(doc: ScenarioDoc, log: ScenarioRunLog): { ok: boolean; firstDiff: number; decisions: RunLogEntry[] } {
  const r = new ScenarioRunner(doc, { seed: log.seed });
  for (const e of log.entries) {
    switch (e.op) {
      case 'start':
        r.start(e.t);
        break;
      case 'advance':
        r.advance(e.t, structuredClone(e.inputs));
        break;
      case 'goto':
        r.goto(e.t, e.stateId);
        break;
      case 'trigger':
        r.trigger(e.t, e.transitionId);
        break;
      case 'pause':
        r.pause(e.t);
        break;
      case 'resume':
        r.resume(e.t);
        break;
      case 'restore':
        r.setState(e.state);
        break;
      default:
        break;
    }
  }
  const want = log.entries.filter((e) => DECISIONS.has(e.op));
  const got = r.log.filter((e) => DECISIONS.has(e.op));
  const firstDiff = diff(want, got);
  return { ok: firstDiff === -1, firstDiff, decisions: got };
}

function replayV2(doc: ScenarioDocV2, log: ScenarioRunLogV2): { ok: boolean; firstDiff: number; decisions: PhaseRunLogEntry[] } {
  const r = new PhaseRunner(doc, { seed: log.seed });
  for (const e of log.entries) {
    if (e.op === 'start') r.start(e.t);
    else if (e.op === 'advance') r.advance(e.t, structuredClone(e.inputs));
    else if (e.op === 'take') r.take(e.t, e.actionId, e.group);
    else if (e.op === 'pause') r.pause(e.t);
    else if (e.op === 'resume') r.resume(e.t);
    else if (e.op === 'restore') r.setState(e.state);
  }
  const want = log.entries.filter((e) => DECISIONS_V2.has(e.op));
  const got = r.log.filter((e) => DECISIONS_V2.has(e.op));
  const firstDiff = diff(want, got);
  return { ok: firstDiff === -1, firstDiff, decisions: got };
}

/** The first index where the two decision lists differ, or -1. */
function diff(want: readonly unknown[], got: readonly unknown[]): number {
  for (let i = 0; i < Math.max(want.length, got.length); i++) if (JSON.stringify(want[i]) !== JSON.stringify(got[i])) return i;
  return -1;
}
