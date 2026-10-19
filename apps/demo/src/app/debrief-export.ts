// The Debrief's export (`pme-debrief/2`). Its own module so that `debrief.ts` does not import `debrief-moments.ts`,
// which imports `debrief.ts` (R-B N5: no circular import).
import { version } from '@pme/renderer';
import { facts, objectives, perMinute, type DebriefExport } from './debrief.ts';
import { keyMoments, keyTimes } from './debrief-moments.ts';
import type { RunData } from './record.ts';

/** The report as JSON (`pme-debrief/2`, `DebriefExport`) — the record, the verdicts, the facts, the key times and
 *  moments, and the minute table, with the version and build that made it. Not the "Run by" line or the notes box:
 *  they are printed only, never stored. */
export const debriefJson = (d: RunData, build: string): string => {
  const moments = keyMoments(d);
  const out: DebriefExport = { schema: 'pme-debrief/2', version, build, record: d, objectives: objectives(d), facts: facts(d), keyTimes: keyTimes(d, moments), keyMoments: moments, minutes: perMinute(d) };
  return JSON.stringify(out, null, 1);
};
