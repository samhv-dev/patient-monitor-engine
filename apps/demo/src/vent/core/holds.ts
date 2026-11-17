// The cockpit's holds (plan vent-skin-edp-ts.md §3.3 GX3, GX13, GD17): a key held to close the valves, and the
// occlusions of the respiratory-mechanics tests, both on the model's own hold (vent.ts: no flow, the airway at PEEP
// plus the lung's recoil, less the patient's effort with `holdEffort`). A key held during inspiration holds at the end
// of that inspiration; held during expiration, at the end of that expiration (the model's `expHoldAt: 'end'`). The
// hold lasts while the key is held, at most the face's longest hold, then ends by itself and the key must be released
// before it holds again. A hold that ends as it should (released, at its length, at its test's end) leaves its result:
// the pressure and lung volume at its end, and for an inspiratory hold the breath it held. A hold that cannot measure
// leaves none and gives no held-back breath: the circuit opened, the model reset, the results forgotten, a test
// cancelled or its valves not closed in time. Holds run on sim time, so a test drives them with the driver's clock.
import { cancelHold, DT, releaseHold, toggleHold, type VentConfig, type VentMode, type VentState } from '@pme/ventilator';
import type { Recorder } from './record.ts';
import type { HoldResult, MechanicsSpec } from './types.ts';

type Kind = 'insp' | 'exp';
export interface HoldState {
  /** An inspiratory or an expiratory hold. */
  kind: Kind;
  /** 'key' while the key is held; 'timed' for a test's occlusion. */
  by: 'key' | 'timed';
  /** Sim time the valves closed, or null while the hold waits for its point of the breath. */
  since: number | null;
}
/** Why the key did not hold: a mode it does not hold in, or a test's occlusion running. */
export type KeyRefusal = 'mode' | 'busy';
export interface Occlusion {
  /** How long the valves stay closed, s, unless `until` ends it sooner. */
  maxS: number;
  /** How long it may wait for its point of the breath before it is given up, s. */
  waitMaxS: number;
  /** Asked after each step the valves are closed: true ends the hold now, with its result. */
  until?: () => boolean;
}

export interface Holds {
  /** The Insp/Exp Pause key pressed (true) or released (false); a refusal when it cannot hold. */
  key(down: boolean): true | KeyRefusal;
  /** A test's occlusion; `done` gets its result, or null when it was given up. False if a hold is running. */
  occlude(kind: Kind, o: Occlusion, done: (r: HoldResult | null) => void): boolean;
  /** End the hold running, with no result and no held-back breath given (a test cancelled, standby). */
  cancel(): void;
  /** The hold now, or null. */
  state(): HoldState | null;
  /** The last result of each kind, since the results were last forgotten. */
  last(kind: Kind): HoldResult | null;
  /** Forget every result and end the hold running, as `cancel` (a reset, a new patient, a setting they depend on). */
  forget(): void;
  /** Counts the forgettings: a value a face derives from the results is valid while this is unchanged. */
  epoch(): number;
  /** Settings were written: those the results depend on forget them. */
  settings(keys: ReadonlyArray<keyof VentConfig>): void;
  step(): void;
  /** Can the key hold in this mode? */
  keyMode(mode: VentMode): boolean;
}

export function createHolds(vs: VentState, rec: Recorder, spec: MechanicsSpec, changed: () => void): Holds {
  let cur: (HoldState & Occlusion & { from: number; done?: (r: HoldResult | null) => void }) | null = null;
  /** The key reached the longest hold: it holds again only after a release. */
  let spent = false;
  let results: Record<Kind, HoldResult | null> = { insp: null, exp: null };
  let epoch = 0;
  const P = vs.p;

  const arm = (kind: Kind) => {
    // in a VCV pause the valves are already closed at end-inspiration: the hold takes over from it
    if (kind === 'insp' && P.phase === 'pause') vs.hold = 'insp';
    else toggleHold(vs, kind);
  };
  const start = (h: NonNullable<typeof cur>) => { cur = h; arm(h.kind); changed(); };
  /** The hold ends as it should: its result is kept, the held-back breath given. */
  const end = () => {
    const h = cur!;
    cur = null;
    const so = rec.current();
    const r: HoldResult | null = h.since === null ? null : {
      kind: h.kind, t: P.t, durS: P.t - h.since, paw: P.Paw, vMl: P.V, peep: vs.cfg.peep, mode: vs.cfg.mode,
      ...(h.kind === 'insp' && so ? { breath: { t0: so.t0, vtMl: so.vtMl, pmax: so.pmax, tiFlow: so.tiFlow, peepBefore: rec.last()?.peepEnd ?? vs.cfg.peep, tcexp: Number.NaN } } : {}),
    };
    releaseHold(vs);
    if (r) results[h.kind] = r;
    h.done?.(r);
    changed();
  };
  /** The hold cannot measure: no result, no breath given. */
  const abandon = () => {
    const h = cur;
    if (!h) return;
    cur = null;
    cancelHold(vs);
    h.done?.(null);
    changed();
  };
  /** An inspiratory hold's breath completes after the hold: its expiration's time constant is read then. */
  const fillTimeConstant = () => {
    const b = results.insp?.breath;
    const last = rec.last();
    if (b && Number.isNaN(b.tcexp) && last && Math.abs(last.t0 - b.t0) < DT / 2) b.tcexp = last.tcexp;
  };
  const keyMode = (m: VentMode) => spec.holdModes.includes(m);
  const forget = () => {
    abandon();
    results = { insp: null, exp: null };
    epoch++;
    changed();
  };

  return {
    key(down) {
      if (!down) {
        spent = false;
        if (cur?.by === 'key') end();
        return true;
      }
      if (cur) return cur.by === 'key' ? true : 'busy';
      if (!keyMode(vs.cfg.mode)) return 'mode';
      if (spent) return true;
      const kind: Kind = P.phase === 'exp' ? 'exp' : 'insp';
      start({ kind, by: 'key', since: null, maxS: spec.holdMaxS[kind], waitMaxS: Infinity, from: P.t });
      return true;
    },
    occlude(kind, o, done) {
      if (cur) return false;
      start({ kind, by: 'timed', since: null, ...o, from: P.t, done });
      return true;
    },
    cancel: abandon,
    state: () => (cur ? { kind: cur.kind, by: cur.by, since: cur.since } : null),
    last: (k) => results[k],
    forget,
    epoch: () => epoch,
    settings(keys) {
      if (keys.some((k) => spec.resultsDependOn.includes(k))) forget();
    },
    keyMode,
    step() {
      fillTimeConstant();
      const h = cur;
      if (!h) return;
      if (vs.circuit === 'disconnected') return abandon();
      if (vs.hold === h.kind) {
        if (h.since === null) { h.since = P.t; changed(); }
        const full = P.t - h.since >= h.maxS - 1e-9;
        if (full || h.until?.()) {
          if (full && h.by === 'key') spent = true;
          end();
        }
      } else if (h.since !== null) abandon(); // the model ended it (a reset)
      else if (P.t - h.from >= h.waitMaxS - 1e-9) abandon(); // its point of the breath never came
    },
  };
}
