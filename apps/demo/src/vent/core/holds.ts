// The cockpit's holds (plan vent-skin-edp-ts.md §3.3 GX3, GX13, GD17): a key held to close the valves, and the
// timed occlusions of the respiratory-mechanics tests, both on the model's own hold (vent.ts: no flow, the airway at
// PEEP plus the lung's recoil). A key held during inspiration holds at the end of that inspiration; held during
// expiration, at the end of that expiration (the model's `expHoldAt: 'end'`). The hold lasts while the key is held, at
// most the face's longest hold, then ends by itself and the key must be released before it holds again. Each hold that
// closed the valves leaves its result: the pressure and lung volume at its end, and for an inspiratory hold the breath
// it held. Holds run on sim time, so a test drives them with the driver's clock.
import { releaseHold, toggleHold, type VentMode, type VentState } from '@pme/ventilator';
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

export interface Holds {
  /** The Insp/Exp Pause key pressed (true) or released (false); false when the mode does not hold. */
  key(down: boolean): boolean;
  /** A test's occlusion of `kind` for `s` once the valves close; `done` gets its result. False if one is running. */
  occlude(kind: Kind, s: number, done: (r: HoldResult) => void): boolean;
  /** The hold now, or null. */
  state(): HoldState | null;
  /** The last result of each kind. */
  last(kind: Kind): HoldResult | null;
  step(): void;
  /** Can the key hold in this mode? */
  keyMode(mode: VentMode): boolean;
}

export function createHolds(vs: VentState, rec: Recorder, spec: MechanicsSpec, changed: () => void): Holds {
  let cur: (HoldState & { maxS: number; done?: (r: HoldResult) => void }) | null = null;
  /** The key reached the longest hold: it holds again only after a release. */
  let spent = false;
  const results: Record<Kind, HoldResult | null> = { insp: null, exp: null };
  const P = vs.p;

  const arm = (kind: Kind) => {
    // in a VCV pause the valves are already closed at end-inspiration: the hold takes over from it
    if (kind === 'insp' && P.phase === 'pause') vs.hold = 'insp';
    else toggleHold(vs, kind);
  };
  const end = () => {
    const h = cur!;
    cur = null;
    releaseHold(vs);
    if (h.since === null) return void changed();
    const so = rec.current();
    const r: HoldResult = {
      kind: h.kind, t: P.t, durS: P.t - h.since, paw: P.Paw, vMl: P.V, peep: vs.cfg.peep, mode: vs.cfg.mode,
      ...(h.kind === 'insp' && so ? { breath: { vtMl: so.vtMl, pmax: so.pmax, tiFlow: so.tiFlow } } : {}),
    };
    results[h.kind] = r;
    h.done?.(r);
    changed();
  };
  const keyMode = (m: VentMode) => spec.holdModes.includes(m);

  return {
    key(down) {
      if (!down) {
        spent = false;
        if (cur?.by === 'key') end();
        return true;
      }
      if (cur || spent || !keyMode(vs.cfg.mode)) return false;
      const kind: Kind = P.phase === 'exp' ? 'exp' : 'insp';
      cur = { kind, by: 'key', since: null, maxS: spec.holdMaxS[kind] };
      arm(kind);
      changed();
      return true;
    },
    occlude(kind, s, done) {
      if (cur) return false;
      cur = { kind, by: 'timed', since: null, maxS: s, done };
      arm(kind);
      changed();
      return true;
    },
    state: () => (cur ? { kind: cur.kind, by: cur.by, since: cur.since } : null),
    last: (k) => results[k],
    keyMode,
    step() {
      if (!cur) return;
      if (vs.hold === cur.kind) {
        if (cur.since === null) { cur.since = P.t; changed(); }
        if (P.t - cur.since >= cur.maxS - 1e-9) {
          if (cur.by === 'key') spent = true;
          end();
        }
      } else if (cur.since !== null || vs.circuit === 'disconnected') end(); // the hold was ended elsewhere (a reset, the circuit opened)
    },
  };
}
