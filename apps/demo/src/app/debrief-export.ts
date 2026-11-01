// The Debrief's export (`pme-debrief/2`; `pme-debrief/3` for a pme-scenario/2 run, plan F7). Its own module so that
// `debrief.ts` does not import `debrief-moments.ts`, which imports `debrief.ts` (R-B N5: no circular import).
import { version } from '@pme/renderer';
import { facts, judged, marks, objectives, perMinute, report3, steps, type DebriefExport, type DebriefExport3 } from './debrief.ts';
import { keyMoments, keyTimes } from './debrief-moments.ts';
import type { RunData } from './record.ts';

/** The report as JSON (`pme-debrief/2`, `DebriefExport`) — the record, the verdicts, the facts, the key times and
 *  moments, the minute table, the steps, the judged objectives and the marks, with the version and build that made it. Not the "Run by" line or the notes box:
 *  they are printed only, never stored. A /2 run: `pme-debrief/3` (`DebriefExport3`), its graded sections in place of
 *  the objectives, the steps and the judged objectives. */
export const debriefJson = (d: RunData, build: string): string => {
  const moments = keyMoments(d);
  const r3 = report3(d);
  const out: DebriefExport | DebriefExport3 = r3
    ? { schema: 'pme-debrief/3', version, build, record: d, phases: d.phases ?? [], ...r3, facts: facts(d), keyTimes: keyTimes(d, moments), keyMoments: moments, minutes: perMinute(d), marks: marks(d) }
    : { schema: 'pme-debrief/2', version, build, record: d, objectives: objectives(d), facts: facts(d), keyTimes: keyTimes(d, moments), keyMoments: moments, minutes: perMinute(d), steps: steps(d), judged: judged(d), marks: marks(d) };
  return JSON.stringify(out, null, 1);
};
