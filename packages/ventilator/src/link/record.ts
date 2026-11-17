// What the engine keeps of the ventilator that drives it, so that a bookmark holds the ventilator with the patient, and
// the checks every reader makes before it trusts a record or a ventilator state that came from a peer.
import type { LungStateEvent } from '../lung-input.ts';

/**
 * The ventilator's whole state after ventilator tick `tick` (VentDriver.snapshot). `face` is the front end's id (a state
 * is loaded only by the face that saved it); `body` is JSON-safe (engine-core's snapshot codec).
 */
export interface VentSnapshot {
  v: 1;
  face: string | null;
  tick: number;
  body: unknown;
}

/** A lungState and the ventilator tick it is applied on (null: at once, sent before the link knew its offset). */
export interface StampedLung {
  ev: LungStateEvent;
  at: number | null;
}

/**
 * What the engine holds of the ventilator driving it (a `deviceState` command from the link itself; restored as a
 * `deviceState` event): the ventilator's state, the link's own (the tick offset, the last ventilator tick the engine
 * has, the clock it published, the newest engine tick it heard) and the lungStates sent for ticks after that state's.
 * The engine's queue holds the frames up to `link.lastTick`; the state may be older (a report comes after its frames),
 * and the ventilator then makes those ticks again, which the link does not send twice.
 */
export interface LinkRecord {
  v: 1;
  vent: VentSnapshot;
  link: { offset: number | null; lastTick: number; allowed: number; engTick: number };
  lungs: StampedLung[];
}

/** A ventilator state's largest JSON, bytes [ENG: network; 4.3 KB measured with the Hamilton face and its alarm view]. */
export const VENT_STATE_BYTES = 6 * 1024;
/**
 * The most lungStates a record holds for ticks after its state's [ENG: network; with a state at most RELAY_STATE_MS
 * old, a lung that changes every second of sim time at ×4 gives 1]. A ventilator whose state lags further keeps no record
 * until its next state: a bookmark then holds no ventilator, rather than one it cannot give back exactly.
 */
export const RECORD_LUNGS_MAX = 4;
/**
 * The most ventilator ticks a restored ventilator makes again before it sends [ENG: network; a state RELAY_STATE_MS old
 * at ×8 is 100 ticks, plus the MAX_AHEAD_TICKS it may run ahead of the engine].
 */
export const REMAKE_TICKS_MAX = 200;
/** How far past a state the clock limit a restore names may lie [ENG: network; MAX_AHEAD_TICKS, twice]. */
export const RESTORE_AHEAD_MAX = 150;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isTick = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

/** The envelope of a ventilator state (its body is checked by the ventilator that loads it). */
export const isVentSnapshot = (s: unknown): s is VentSnapshot =>
  isObj(s) && s.v === 1 && (s.face === null || typeof s.face === 'string') && isTick(s.tick) && isObj(s.body);

const isLung = (l: unknown): l is StampedLung => isObj(l) && isObj(l.ev) && l.ev.type === 'lungState' && (l.at === null || isTick(l.at));

/**
 * Whether `r` is a record a restore to engine tick `engineTick` can give back: its fields are what the link writes, its
 * frames reach no further past the engine than a ventilator may run, its state is no older than a ventilator remakes,
 * and its clock limit lies within RESTORE_AHEAD_MAX of its last frame.
 */
export function isLinkRecord(r: unknown, engineTick: number): r is LinkRecord {
  if (!isObj(r) || r.v !== 1 || !isVentSnapshot(r.vent) || !isObj(r.link) || !Array.isArray(r.lungs)) return false;
  const { offset, lastTick, allowed, engTick } = r.link;
  if (!(offset === null || Number.isInteger(offset)) || !Number.isInteger(lastTick) || typeof allowed !== 'number' || !isTick(engTick)) return false;
  if (r.lungs.length > RECORD_LUNGS_MAX || !r.lungs.every(isLung)) return false;
  const last = lastTick as number;
  if (last < r.vent.tick || last - r.vent.tick > REMAKE_TICKS_MAX) return false;
  if (Number.isFinite(allowed) && (allowed < last || allowed - last > RESTORE_AHEAD_MAX)) return false;
  return offset === null || Math.abs(last + (offset as number) - engineTick) <= RESTORE_AHEAD_MAX;
}
