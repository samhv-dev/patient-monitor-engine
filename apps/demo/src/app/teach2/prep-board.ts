// Plan learner-action-remote.md L9 (§4 D7): the instructor's copy of the learner remotes' preparations, as the Link keeps
// it from the host's `prep` news addressed to the host's own id (the laptop's Link and the instructor phone's alike).
// No DOM here: the Link (link.ts) holds one, and node-environment tests load the Link; the card is learner-preps.ts.
import type { InstructorPrepNews, InstructorPrepView } from '@pme/controller';

/** Where a preparation is: on the tray, given (a bolus or an infusion from it), or discarded; with the time. */
export interface BoardEntry {
  prep: InstructorPrepView;
  /** Case time of the first delivery or infusion from it (null: not given). */
  givenAt: number | null;
  discardedAt: number | null;
}

/** The instructor's copy of every learner preparation of this timeline, from the host's `prep` news, in staging order. */
export class PrepBoard {
  private readonly m = new Map<string, BoardEntry>();
  /** Take one InstructorPrepNews at case time `t`. */
  apply(n: InstructorPrepNews, t: number): void {
    const key = `${n.prep.by}|${n.prep.id}`;
    const was = this.m.get(key);
    // the host's own given time (a phone that signed in late gets it too), else the delivery news' time
    const e: BoardEntry = { prep: n.prep, givenAt: n.prep.givenAt ?? was?.givenAt ?? null, discardedAt: was?.discardedAt ?? null };
    if ((n.news === 'delivered' || n.news === 'infusing') && e.givenAt === null) e.givenAt = t;
    if (n.news === 'discarded') e.discardedAt = t;
    this.m.set(key, e);
  }
  /** A restart or a bookmark restore: the host's table went with the old engine (host-session newTimeline). */
  clear(): void {
    this.m.clear();
  }
  get entries(): BoardEntry[] {
    return [...this.m.values()];
  }
  /** Preparations with a finding, on the tray, whose notice has not been shown: the header's count. */
  get waiting(): number {
    return this.entries.filter((e) => e.prep.findings.length > 0 && !e.prep.notice && e.discardedAt === null).length;
  }
}

