// The Debrief archive (the owner's board "Finish 2", approved 30 October): every debrief "Finish the case" saves, kept
// in THIS browser (localStorage) until the instructor clears it on the Debrief page. One key holds the index (what a
// list shows: the resident, the card, when it was saved, the run's simulated duration and its objective counts), and
// one key per entry holds the debrief's JSON as the Debrief view builds it (`debriefJson`, `pme-debrief/2`), so a list
// never parses a debrief. A second save of one run (its record's `startedAt`) replaces that run's entry. A storage that
// refuses (full, blocked, a private window) saves nothing and the caller says so. "Export all" is one JSON file (no
// zip library is in the dependency tree). Also the counts the Finish pane shows. No DOM.
import { endOf, marks, objectives } from './debrief.ts';
import { debriefJson } from './debrief-export.ts';
import type { RunData } from './record.ts';
import { cardOf } from './scenarios.ts';

export interface ObjectiveCounts {
  /** Met by its rule, or (a rule-less objective) ticked by the instructor. */
  met: number;
  total: number;
  notMet: number;
  notAssessable: number;
}
export interface MarkCounts {
  good: number;
  bad: number;
  discuss: number;
  /** The instructor's notes (not an objective's tick) and the marks that carry a note. */
  notes: number;
}

/** One saved debrief, as a list shows it. */
export interface ArchiveMeta {
  id: string;
  /** The run's record start (RunData.startedAt): the run this entry is of. */
  runStartedAt: number;
  resident: string;
  /** The card's id, or null for a free run. */
  cardId: string | null;
  title: string;
  /** Wall ms (Date.now) of the save. */
  savedAt: number;
  /** The run's simulated length (s), on the kept course. */
  durationS: number;
  objectives: ObjectiveCounts;
}

const INDEX = 'pme.archive';
const bodyKey = (id: string): string => `${INDEX}.${id}`;

/** The objectives of the run by verdict, as the report marks them (a ticked rule-less objective reads Observed). */
export function objectiveCounts(d: RunData): ObjectiveCounts {
  const os = objectives(d);
  const met = os.filter((o) => o.verdict.status === 'met' || o.verdict.tickedT !== undefined).length;
  const notMet = os.filter((o) => o.verdict.status === 'not met').length;
  return { met, total: os.length, notMet, notAssessable: os.length - met - notMet };
}

/** "4 of 6 met · 1 not met · 1 not assessable" (the parts that are zero left out, but the first). */
export function objectivesLine(c: ObjectiveCounts): string {
  if (!c.total) return 'no objectives on this card';
  return [`${c.met} of ${c.total} met`, c.notMet ? `${c.notMet} not met` : '', c.notAssessable ? `${c.notAssessable} not assessable` : ''].filter(Boolean).join(' · ');
}

/** The marks of the run by kind (an undone one left out), and its notes. */
export function markCounts(d: RunData): MarkCounts {
  const ms = marks(d).filter((m) => m.undone === undefined);
  const n = (k: string) => ms.filter((m) => m.kind === k).length;
  const notes = d.rows.filter((r) => r.kind === 'note' && r.undone === undefined && !r.text.startsWith('Objective met: ')).length + ms.filter((m) => m.note).length;
  return { good: n('good'), bad: n('bad'), discuss: n('discuss'), notes };
}

export const marksLine = (c: MarkCounts): string => `${c.good} good · ${c.bad} bad · ${c.discuss} discuss · ${c.notes} ${c.notes === 1 ? 'note' : 'notes'}`;

/** "12:31": the wall-clock time of a save, in the browser's own zone. */
export const hhmm = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** The file name of one entry's JSON: the card, the run's date and the resident. */
export const entryFileName = (e: ArchiveMeta): string =>
  `debrief-${e.cardId ?? 'free-run'}-${new Date(e.runStartedAt).toISOString().slice(0, 10)}${e.resident ? `-${e.resident.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}` : ''}.json`;

const localStore = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

export class Archive {
  /** Bumped by every save and clear (a list redraws only then). */
  version = 0;
  private readonly storage: () => Storage | null;

  constructor(storage: () => Storage | null = localStore) {
    this.storage = storage;
  }

  /** Every saved debrief, oldest first. */
  list(): ArchiveMeta[] {
    try {
      const xs = JSON.parse(this.storage()?.getItem(INDEX) ?? '[]') as unknown;
      return Array.isArray(xs) ? (xs as ArchiveMeta[]) : [];
    } catch {
      return [];
    }
  }

  /** The entry saved for the run whose record started at `runStartedAt`, or null. */
  forRun(runStartedAt: number): ArchiveMeta | null {
    return this.list().find((e) => e.runStartedAt === runStartedAt) ?? null;
  }

  /** How many debriefs were saved on the day of `now` (the browser's own zone). */
  savedToday(now = Date.now()): number {
    const day = new Date(now).toDateString();
    return this.list().filter((e) => new Date(e.savedAt).toDateString() === day).length;
  }

  /**
   * Save the debrief of the run `d` under `resident` (the run's earlier entry replaced, in its place); null when the
   * storage refused, and the archive is then as it was.
   */
  save(d: RunData, resident: string, build: string, now = Date.now()): ArchiveMeta | null {
    const s = this.storage();
    if (!s) return null;
    const list = this.list();
    const was = list.find((e) => e.runStartedAt === d.startedAt);
    const card = d.doc ? cardOf(d.doc) : null;
    const meta: ArchiveMeta = {
      id: was?.id ?? `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      runStartedAt: d.startedAt, resident: resident.trim(), cardId: d.doc?.id ?? null, title: card ? card.title : 'Free run',
      savedAt: now, durationS: endOf(d), objectives: objectiveCounts(d),
    };
    const body = JSON.stringify(JSON.parse(debriefJson(d, build))); // stored compact
    const prevBody = was ? s.getItem(bodyKey(meta.id)) : null;
    try {
      s.setItem(bodyKey(meta.id), body);
      s.setItem(INDEX, JSON.stringify(was ? list.map((e) => (e.id === meta.id ? meta : e)) : [...list, meta]));
    } catch {
      // leave the archive as it was: the new body out (or the old one back)
      try {
        if (prevBody !== null) s.setItem(bodyKey(meta.id), prevBody);
        else s.removeItem(bodyKey(meta.id));
      } catch {
        /* nothing more to undo */
      }
      return null;
    }
    this.version++;
    return meta;
  }

  /** The saved debrief's JSON (`pme-debrief/2`), or null. */
  debrief(id: string): string | null {
    try {
      return this.storage()?.getItem(bodyKey(id)) ?? null;
    } catch {
      return null;
    }
  }

  /** One entry as a file: its list fields and the debrief (`pme-archive-entry/1`), or null. */
  entryJson(id: string): string | null {
    const e = this.list().find((x) => x.id === id);
    const body = e ? this.debrief(id) : null;
    return e && body ? JSON.stringify(this.entryOf(e, body), null, 1) : null;
  }

  /** Every entry in one file (`pme-archive/1`): "Export all". */
  bundleJson(now = Date.now()): string {
    const entries = this.list().flatMap((e) => {
      const body = this.debrief(e.id);
      return body ? [this.entryOf(e, body)] : [];
    });
    return JSON.stringify({ schema: 'pme-archive/1', exportedAt: now, entries }, null, 1);
  }

  /** Every saved debrief deleted from this browser. */
  clear(): void {
    const s = this.storage();
    try {
      for (const e of this.list()) s?.removeItem(bodyKey(e.id));
      s?.removeItem(INDEX);
    } catch {
      /* blocked storage: nothing was kept */
    }
    this.version++;
  }

  private entryOf(e: ArchiveMeta, body: string) {
    return { schema: 'pme-archive-entry/1' as const, ...e, debrief: JSON.parse(body) as unknown };
  }
}

/** The app's one archive (this browser's localStorage). */
export const archive = new Archive();
