// Scenario replay (brief §3.3: seed + command log reproduce the run). The runner's log holds every input and
// control call; feeding them to a fresh runner with the same seed must reproduce every decision (state entries
// and probability rolls) exactly. 'dispatch' entries are the driver's bookkeeping and are not replayed.
import { ScenarioRunner, type RunLogEntry } from './runner.ts';
import type { ScenarioDoc } from './types.ts';

export interface ScenarioRunLog {
  schema: 'pme-scenario-log/1';
  docId: string;
  seed: number;
  entries: RunLogEntry[];
}

const DECISIONS = new Set<RunLogEntry['op']>(['enter', 'roll']);

export function runLog(r: ScenarioRunner): ScenarioRunLog {
  return { schema: 'pme-scenario-log/1', docId: r.doc.id, seed: r.seed, entries: structuredClone(r.log) };
}

/** Re-run a log; `ok` when the replayed decisions equal the recorded ones, entry for entry. */
export function replayRunLog(doc: ScenarioDoc, log: ScenarioRunLog): { ok: boolean; firstDiff: number; decisions: RunLogEntry[] } {
  if (log.docId !== doc.id) throw new Error(`log is for ${log.docId}, not ${doc.id}`);
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
  let firstDiff = -1;
  for (let i = 0; i < Math.max(want.length, got.length); i++) {
    if (JSON.stringify(want[i]) !== JSON.stringify(got[i])) {
      firstDiff = i;
      break;
    }
  }
  return { ok: firstDiff === -1, firstDiff, decisions: got };
}
