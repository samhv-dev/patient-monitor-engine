// A reload must not lose the running case (UI review 2026-10-24 #1: a reload mid-card came back as "No scenario", the
// default patient, 00:05). The engine lives in this page, so the case cannot survive a reload: it is RESTORED. Every
// SAVE_MS this tab keeps the run's position in sessionStorage — what a bookmark holds (the engine snapshot and the
// runner state, ScenarioDriver.position), the card, the speed and the pause, and the Debrief's record — and on load,
// under the same session code, the same build and within MAX_AGE_MS, the card loads again and returns to it through
// the bookmark machinery (`restoreBookmark` to a mark the driver holds but does not list). The phones re-follow as
// after any "Return here": a timeline event and a host hello. A new body (Restart patient, another card) forgets it.
import { engineKey } from '@pme/engine-core';
import type { RunPosition } from '@pme/controller/scenario';
import { RELOAD_MARK, type KeptRecord } from './record.ts';
import { cardOf, scenarioById, type ScenarioCard } from './scenarios.ts';
import type { AppSession } from './session.ts';

/** How often the position is taken (wall ms): a reload comes back at most this much of the clock behind, × the speed.
 *  Taking one costs ≈ 1 ms (the snapshot is ≈ 80 KB of JSON, plus the Debrief record) [ENG, measured 2026-10-25]. */
export const SAVE_MS = 1000;
/** An older position is another day's run, not this one's [ENG]. */
export const MAX_AGE_MS = 6 * 3600_000;
export { RELOAD_MARK };
const KEY = 'pme.position';
const TICK_S = 0.02;

declare const __PME_BUILD__: string;
/** The app's build (commit and date; Vite's `define`), beside the engine's own snapshot key. */
export const APP_BUILD = typeof __PME_BUILD__ === 'string' ? __PME_BUILD__ : 'development';

export interface Position {
  schema: 'pme-position/1';
  /** The session code (the instructor's URL `?session=`). */
  code: string;
  build: string;
  engine: string;
  /** Wall ms (Date.now) when it was taken. */
  savedAt: number;
  cardId: string;
  title: string;
  stateId: string;
  /** Sim seconds of the snapshot. */
  simT: number;
  speed: number;
  paused: boolean;
  /** Learner controls under the learner monitor (the instructor may have changed the card's default). */
  learner: boolean;
  run: RunPosition;
  record: KeptRecord;
}

const storage = (): Storage | null => {
  try {
    return sessionStorage;
  } catch {
    return null; // A preview or blocked storage: nothing is kept, nothing restored
  }
};

/** Keep `p` (false when the storage refuses it: full or blocked — the previous position is dropped, never left stale). */
export function savePosition(p: Position, s: Storage | null = storage()): boolean {
  try {
    s?.setItem(KEY, JSON.stringify(p));
    return !!s;
  } catch {
    clearPosition(s);
    return false;
  }
}

export function clearPosition(s: Storage | null = storage()): void {
  try {
    s?.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
}

/**
 * The position to restore on this page, or null — and a position that is not this page's is dropped: another session
 * code in the URL, another build of the app or the engine, older than MAX_AGE_MS, or not readable.
 */
export function readPosition(o: { code: string; build?: string; engine?: string; now?: number }, s: Storage | null = storage()): Position | null {
  let p: Position | null = null;
  try {
    p = JSON.parse(s?.getItem(KEY) ?? 'null') as Position | null;
  } catch {
    p = null;
  }
  if (!p) {
    clearPosition(s);
    return null;
  }
  const age = (o.now ?? Date.now()) - p.savedAt;
  const ok = p.schema === 'pme-position/1' && p.code === o.code && p.build === (o.build ?? APP_BUILD) && p.engine === (o.engine ?? engineKey)
    && p.run?.snapshot?.engineVersion === (o.engine ?? engineKey) && age >= 0 && age <= MAX_AGE_MS && typeof p.cardId === 'string';
  if (!ok) clearPosition(s);
  return ok ? p : null;
}

/**
 * Take the running case's position every `every` ms while a library card runs (not while a fast-forward runs, a restore
 * is under way or the tab is hidden — a hidden tab pauses itself, and that pause is not the instructor's). A moment
 * without a consistent position (ScenarioDriver.position) is skipped; the next one is taken. Returns a stopper.
 */
export function keepPositions(s: AppSession, every = SAVE_MS): () => void {
  let busy = false;
  const take = async () => {
    const r = s.driver.runner;
    if (busy || !r || s.restoring || s.fastForwarding || s.host.fastForwarding || document.hidden || !scenarioById(r.doc.id)) return;
    busy = true;
    try {
      const run = await s.driver.position();
      if (!run || s.driver.runner !== r || s.restoring) return; // a new body or a restore began meanwhile
      savePosition({
        schema: 'pme-position/1', code: s.code, build: APP_BUILD, engine: engineKey, savedAt: Date.now(), cardId: r.doc.id, title: cardOf(r.doc).title,
        stateId: run.runner.stateId, simT: run.snapshot.tick * TICK_S, speed: s.timeScale, paused: s.paused, learner: s.learner, run, record: s.record.keep(),
      });
    } catch {
      // the monitor was replaced while it answered: the next turn takes the new one
    } finally {
      busy = false;
    }
  };
  const iv = setInterval(() => void take(), every);
  return () => clearInterval(iv);
}

/**
 * After a reload: load the position's card again (`load`, the app's own Load: its log line and learner controls), then
 * return to the position as to a bookmark, with the Debrief's record, the speed and the pause. False when it could
 * not: the card is no longer in the library, the load or the return was refused (the card then runs from its start).
 */
export async function restorePosition(p: Position, s: AppSession, load: (c: ScenarioCard) => boolean): Promise<boolean> {
  const card = scenarioById(p.cardId);
  if (!card) return false;
  s.restoring = true;
  try {
    if (!load(card) || !(await s.lastLoad).accepted || !s.driver.hold(RELOAD_MARK, p.run)) return false;
    if (!(await s.panel.send({ type: 'scenario', action: 'restoreBookmark', target: RELOAD_MARK })).accepted) return false;
    s.record.resume(p.record, p.run.snapshot.tick * TICK_S);
    s.setLearner(p.learner);
    if (p.speed !== s.timeScale) await s.panel.send({ type: 'time', action: 'scale', value: p.speed });
    if (p.paused) await s.panel.send({ type: 'time', action: 'pause' });
    return true;
  } finally {
    s.restoring = false;
  }
}
