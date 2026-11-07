// The same drug is not given twice within SAME_DRUG_LOCK_S of simulated time, from any device (the owner's ruling of
// 5 November 2026). The laptop and the instructor's phone can both record "drug given" for the one event the learners
// asked for once, and the simulated patient then receives two doses. This is a guard against two hands entering one
// event, not a clinical rule. The host applies it (HostSession: every command from every device passes there); every
// device reads the same table from the `commandApplied` events it already receives (ControllerSession.gives), so the
// laptop's rows and the phone's show the lock the host enforces.

import type { WireCommand } from '../protocol.ts';

/** How long a drug given as a bolus stays locked, s of simulated time: the owner's clinical choice (ruled 2026-11-05). */
export const SAME_DRUG_LOCK_S = 10;

/** Who gave it: the laptop's own views, the phone (a remote or the instructor phone), or the card's own script. */
export type GivenBy = 'laptop' | 'phone' | 'card';

/** One drug's lock: how long ago it was given, how long the lock has left (s), and by whom. */
export interface DrugLock {
  drugId: string;
  agoS: number;
  leftS: number;
  by: GivenBy;
}

/**
 * The drug a command gives as a bolus, else null. Only a `drug` event without `infusion` is a bolus: an infusion, a TCI
 * change, the vaporiser, fluids, CPR, defibrillation and the airway are never locked.
 */
export function bolusDrugOf(c: WireCommand | { type?: unknown; event?: unknown }): string | null {
  if (c.type !== 'applyEvent') return null;
  const e = (c as { event?: { kind?: unknown; drugId?: unknown; infusion?: unknown } }).event;
  return e?.kind === 'drug' && typeof e.drugId === 'string' && e.infusion !== true ? e.drugId : null;
}

/** `issuedBy` as a device, read as the scenario driver reads it (driver.ts `administrationOf`). */
export function givenByOf(issuedBy: string): GivenBy {
  if (issuedBy === 'scenario') return 'card';
  return issuedBy === 'remote' || issuedBy.startsWith('controller:') ? 'phone' : 'laptop';
}

const FROM: Readonly<Record<GivenBy, string>> = { laptop: 'from the laptop', phone: 'from the phone', card: 'by the card' };

/** The refused ack's words: "given 4 s ago from the laptop". */
export function lockReason(l: DrugLock): string {
  return `given ${Math.round(l.agoS)} s ago ${FROM[l.by]}`; // to the nearest second (the applied tick may lead the press)
}

/** The last bolus of each drug, at its sim time. Cleared with the timeline (a new engine's clock starts again). */
export class RecentGives {
  private readonly last = new Map<string, { t: number; by: GivenBy }>();

  /** An applied command, at the sim time it was applied; anything but a bolus is ignored. */
  note(c: WireCommand, t: number): void {
    const id = bolusDrugOf(c);
    if (id !== null) this.last.set(id, { t, by: givenByOf(c.issuedBy) });
  }

  /** The drug's lock at sim time `now`, or null once SAME_DRUG_LOCK_S have passed (or it was never given). */
  lock(drugId: string, now: number): DrugLock | null {
    const g = this.last.get(drugId);
    if (!g) return null;
    const agoS = Math.max(0, now - g.t);
    return agoS < SAME_DRUG_LOCK_S ? { drugId, agoS, leftS: SAME_DRUG_LOCK_S - agoS, by: g.by } : null;
  }

  clear(): void {
    this.last.clear();
  }
}
