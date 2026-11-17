// The EDP-TS respiratory-mechanics tests (research/57 E-14, K-15 to K-17, K-19; plan GX13, GX14): each an occlusion of
// the cockpit's holds (core/holds.ts), in the modes face.json gives each test, its result kept for Patient's Data and
// the Respiratory Mechanics window (N-04: a test's values show only once it has run). The manual pause key's holds feed
// the same values (plan GD17). Esc cancels a test running (H-25); a test whose valves do not close in time is stopped.
//   auto-PEEP: the expiratory valve closed 0.75 s at end-expiration; the result is that pressure minus the set PEEP.
//   Compliance and resistance: the same occlusion, for PEEP total, then the next breath held at end-inspiration.
//   Trapped volume: an end-expiratory occlusion; the volume the lung holds above its relaxed volume at the set PEEP,
//   which a prolonged expiration would let out.
//   P0.1: an end-expiratory occlusion kept until the patient's next effort; the drop of the held pressure over its
//   first 100 ms (K-19), held until the next measurement.
import type { Cockpit } from '../../core/cockpit.ts';
import { autoPeep, expiratoryResistance, inspiratoryResistance, peepTotal, staticCompliance } from '../../core/mechanics.ts';
import type { HoldResult } from '../../core/types.ts';
import { DATA, num, type Leaf, type ReasonId } from './data.ts';

export type TestId = 'autoPeep' | 'complRes' | 'trapped' | 'p01';
const M = DATA.mechanics;
const modesOf = (id: TestId) => (M.testModes[id] as Leaf<string[]>).v;

export interface Manoeuvres {
  /** Start a test; false (nothing started) in a mode the manual excludes or while a hold runs. */
  start(id: TestId): boolean;
  running(): TestId | null;
  /** Esc: the test running ends, with no result. */
  cancel(): boolean;
  /** The mode allows this test. */
  allowed(id: TestId): boolean;
  /** The trapped volume of the last end-expiratory occlusion, mL, or NaN. */
  trappedMl(): number;
  /** The last P0.1, cmH2O, or NaN. */
  p01(): number;
  /**
   * The values Patient's Data shows, NaN until their hold has been made; `riFlow` true when Ri is NaN because the held
   * breath's flow was not constant.
   */
  values(): { cst: number; ri: number; riFlow: boolean; re: number; autoPeep: number };
}

/** `onEnd`: told when a test ends, with what the simulator's strip says. */
export function createManoeuvres(c: Cockpit, onEnd: (r: ReasonId) => void = () => {}): Manoeuvres {
  let run: TestId | null = null;
  let p01: { v: number; epoch: number } | null = null;
  const H = c.holds!;
  const finish = (r: ReasonId) => { run = null; onEnd(r); };
  const wait = num(M.testWaitMaxS);
  /** The P0.1 occlusion: its held pressure when the valves closed, and the step the effort began. */
  const p01Occlusion = () => {
    let base = Number.NaN, from = Number.NaN, at = Number.NaN, closedSteps = 0;
    const until = () => {
      const t = c.p.t, paw = c.p.Paw;
      // the step the valves close on still carries the expiration's pressure: the held pressure starts on the next
      if (++closedSteps === 1) return false;
      if (Number.isNaN(base)) base = paw;
      else if (Number.isNaN(at) && paw < base) { at = t; from = base; }
      return !Number.isNaN(at) && t - at >= num(M.p01WindowS) - 1e-9;
    };
    const done = (r: HoldResult | null) => {
      if (run !== 'p01') return;
      if (!r) return finish('testStopped');
      if (Number.isNaN(at)) return finish('p01NoEffort');
      p01 = { v: from - r.paw, epoch: H.epoch() };
      finish('testDone');
    };
    return H.occlude('exp', { maxS: num(M.p01MaxS), waitMaxS: wait, until }, done);
  };
  const allowed = (id: TestId) => modesOf(id).includes(c.cfg.mode);
  return {
    allowed,
    running: () => run,
    cancel() {
      if (!run) return false;
      run = null; // before the hold's own end, so its done reports nothing
      H.cancel();
      onEnd('testCancelled');
      return true;
    },
    start(id) {
      if (run || H.state() || !allowed(id)) return false;
      const occl = num(id === 'trapped' ? M.trappedOcclusionS : M.occlusionS);
      const after = (next?: () => boolean) => (r: HoldResult | null) => {
        if (run !== id) return;
        if (!r) return finish('testStopped');
        if (!next) return finish('testDone');
        if (!next()) finish('testStopped');
      };
      const insp = () => H.occlude('insp', { maxS: num(M.complianceHoldS), waitMaxS: wait }, after());
      run = id;
      const ok = id === 'p01' ? p01Occlusion() : H.occlude('exp', { maxS: occl, waitMaxS: wait }, after(id === 'complRes' ? insp : undefined));
      if (!ok) run = null;
      return ok;
    },
    trappedMl: () => H.last('exp')?.vMl ?? Number.NaN,
    p01: () => (p01 && p01.epoch === H.epoch() ? p01.v : Number.NaN),
    values() {
      const insp = H.last('insp'), exp = H.last('exp');
      const cst = insp ? staticCompliance(insp, peepTotal(insp, exp)) : Number.NaN;
      const ri = insp ? inspiratoryResistance(insp) : Number.NaN;
      return { cst, ri, riFlow: insp?.breath?.constFlow === false, re: expiratoryResistance(insp?.breath?.tcexp ?? Number.NaN, cst), autoPeep: exp ? autoPeep(exp) : Number.NaN };
    },
  };
}
