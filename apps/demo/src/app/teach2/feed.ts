// Instructor v2's view feed (plan `docs/plans/instructor-peer-role.md` §6, piece P6): what the host's own Instructor v2
// reads from the host document and a remote does not have, computed on the host by the very functions that draw it, and
// sent to the granted instructor phone as the instructor-only event `instructorView` (session.ts: at most once a
// second, only on a change, while a phone is granted). Pure: no DOM.
//
// A remote's ACTION rows, cue line and strip are then the host's by construction ("same card data, no second source",
// design §6): the board (rows.ts `classify` / `classifyV2` on the host's record, holds, phase runner and log), the cue
// box's "by your button" (the record's `by`), the strip's stage entries and the transitions fired in the current stage
// (the host's history, which a phone that reloaded has lost), and each past stage's return (the label of the driver's
// stage mark). The phone keeps no record of its own. With no feed, or one read in another state than its scenario view
// is in (the state event outran the next feed), a remote reads what it has, as before (Link.viewNow).
import { asV1, isV2 } from '@pme/controller';
import type { Link } from '../link.ts';
import { byOf } from './cue.ts';
import { classify, classifyV2, liveGrades, type Board, type HoldLike } from './rows.ts';
import { firedInStage, stageEntries, stageMarks, type StageEntry } from './strip.ts';

/** The feed's body (opaque to the controller: `instructorView.body`). */
export interface ViewFeed {
  /** The host's card and scenario state the body was read in. */
  docId: string | null;
  stateId: string | null;
  /** ACTION's board: the current stage's open rows, Finished, off the card, a /2 phase's "Not due now"; null without a
   *  card. */
  board: Board | null;
  /** The strip's stage entries on the course kept, and the transitions fired since the current stage was entered. */
  entries: StageEntry[];
  fired: string[];
  /** How the current stage was entered: the record's `by` for its entry (the cue box's "by your button"), else null. */
  by: string | null;
  /** Each entered stage's return: the label of its latest stage mark (ScenarioDriver.stageMarks), by stage id. */
  marks: Record<string, string>;
}

/** The A rows' bar starts (rows.ts `Source.base`), one map per Link, kept across refreshes and cleared with a new card:
 *  the host's ACTION slot and its feed read the same starts, so the two boards agree. */
const BASES = new WeakMap<Link, { docV: number; base: Map<string, number> }>();
export function baseOf(link: Link): Map<string, number> {
  const v = link.ctl.scenario.docVersion;
  let b = BASES.get(link);
  if (!b || b.docV !== v) BASES.set(link, (b = { docV: v, base: new Map() }));
  return b.base;
}

/** The host's hold progress (`ScenarioDriver.vitalHolds()`, answer 8); null without a driver (a remote). */
const holdsOf = (link: Link): readonly HoldLike[] | null => link.host?.driver.vitalHolds() ?? null;

/** ACTION's board as this Link reads it: on a remote, the host's feed for the current state when it has one. */
export function boardOf(link: Link): Board | null {
  const fed = link.viewNow?.();
  if (fed) return fed.board;
  const sv = link.ctl.scenario;
  const stateId = sv.stateId;
  if (!sv.doc || !stateId) return null;
  if (isV2(sv.doc)) {
    const pr = link.host?.driver.phaseRunner ?? null;
    return classifyV2({
      doc: sv.doc, phaseId: stateId, log: link.log, takings: pr?.takings ?? null, holds: pr?.vitalHolds() ?? null, paused: link.ctl.hostPaused,
      grades: pr ? liveGrades(sv.doc, pr, link.simT) : null, admin: pr?.admin ?? null, enteredT: sv.enteredT, history: sv.history,
    });
  }
  const doc = asV1(sv.doc);
  if (!doc) return null;
  return classify({
    doc, stateId, history: sv.history, enteredT: sv.enteredT, simT: link.simT, inState: sv.timeInState(link.simT),
    paused: link.ctl.hostPaused, log: link.log, record: link.host?.record.data ?? null,
    values: link.ctl.state?.values as Partial<Record<string, number>> | undefined, holds: holdsOf(link), base: baseOf(link),
  });
}

/** The strip's stage entries as this Link reads them: on a remote, the host's (a reloaded phone's history is empty). */
export function entriesOf(link: Link): StageEntry[] {
  const fed = link.viewNow?.();
  if (fed) return fed.entries;
  const sv = link.ctl.scenario;
  return sv.doc ? stageEntries(sv.doc, sv.history, sv, link.simT) : [];
}

/** The transitions fired since the current stage was entered (strip.ts `firedInStage`), the host's on a remote. */
export function firedOf(link: Link, entries: readonly StageEntry[]): Set<string> {
  const fed = link.viewNow?.();
  return fed ? new Set(fed.fired) : firedInStage(link.ctl.scenario.history, entries.at(-1), link.simT);
}

/** The feed's body, read on the host from its own Link (session.ts sends it). */
export function feedOf(link: Link): ViewFeed {
  const sv = link.ctl.scenario;
  const entries = entriesOf(link);
  const cur = entries.at(-1);
  const marks: Record<string, string> = {};
  for (const e of entries) {
    const m = stageMarks.of(link, e);
    if (m !== null) marks[e.stage] = m;
  }
  return { docId: sv.doc?.id ?? null, stateId: sv.stateId, board: boardOf(link), entries, fired: [...firedOf(link, entries)], by: cur ? (byOf(link, cur) ?? null) : null, marks };
}
