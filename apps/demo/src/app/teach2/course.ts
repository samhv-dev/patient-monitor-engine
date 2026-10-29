// Instructor v2: the scenario history the strip, the cue box, ACTION and the Drug sheet read (card-read.ts `withStart`):
// ScenarioView's history with the initial state's entry put back, at the time the host's run record entered it (0 on
// a follower, which has no record).
import { withStart, type History } from '../card-read.ts';
import type { Link } from '../link.ts';

export function historyOf(link: Link): History {
  const sv = link.ctl.scenario;
  const doc = sv.doc;
  if (!doc) return sv.history;
  const start = link.host?.record.data.rows.find((r) => r.kind === 'scenario' && r.undone === undefined && r.ev === `state:${doc.initialState}`)?.t ?? 0;
  return withStart(doc, sv.history, start);
}
