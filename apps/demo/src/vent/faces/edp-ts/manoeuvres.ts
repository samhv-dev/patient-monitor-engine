// The EDP-TS respiratory-mechanics tests (research/57 E-14, K-15 to K-17; plan GX13): each a timed occlusion of the
// cockpit's holds (core/holds.ts), in the modes the manual names, its result kept for Patient's Data (N-04: a test's
// values show only once it has run). The manual pause key's holds feed the same values (plan GD17).
//   auto-PEEP: the expiratory valve closed 0.75 s at end-expiration; the result is that pressure minus the set PEEP.
//   Compliance and resistance: the same occlusion, for PEEP total, then the next breath held at end-inspiration.
//   Trapped volume: an end-expiratory occlusion; the volume the lung holds above its relaxed volume at the set PEEP,
//   which a prolonged expiration would let out.
import type { Cockpit } from '../../core/cockpit.ts';
import { autoPeep, expiratoryResistance, inspiratoryResistance, peepTotal, staticCompliance } from '../../core/mechanics.ts';
import type { HoldResult } from '../../core/types.ts';
import { DATA, num, type Leaf } from './data.ts';

export type TestId = 'autoPeep' | 'complRes' | 'trapped';
const M = DATA.mechanics;
const TEST_MODES = (M.testModes as Leaf<string[]>).v;

export interface Manoeuvres {
  /** Start a test; false (nothing started) in a mode the manual excludes or while a hold runs. */
  start(id: TestId): boolean;
  running(): TestId | null;
  /** The mode allows the tests. */
  allowed(): boolean;
  /** The trapped volume of the last test, mL, or NaN before one. */
  trappedMl(): number;
  /** The values Patient's Data shows, NaN until their hold has been made. */
  values(): { cst: number; ri: number; re: number; autoPeep: number };
}

/** `onDone`: told when a test has its result. */
export function createManoeuvres(c: Cockpit, onDone: () => void = () => {}): Manoeuvres {
  let run: TestId | null = null;
  let trapped: HoldResult | null = null;
  const H = c.holds!;
  const done = () => { run = null; onDone(); };
  const allowed = () => TEST_MODES.includes(c.cfg.mode);
  return {
    allowed,
    running: () => run,
    start(id) {
      if (run || H.state() || !allowed()) return false;
      const occl = num(id === 'trapped' ? M.trappedOcclusionS : M.occlusionS);
      const ok = H.occlude('exp', occl, (r) => {
        if (id === 'trapped') trapped = r;
        if (id !== 'complRes' || !H.occlude('insp', num(M.complianceHoldS), done)) done();
      });
      if (ok) run = id;
      return ok;
    },
    trappedMl: () => trapped?.vMl ?? Number.NaN,
    values() {
      const insp = H.last('insp'), exp = H.last('exp');
      const cst = insp ? staticCompliance(insp, peepTotal(exp, insp.peep, insp.mode, c.record())) : Number.NaN;
      const tc = c.record()?.tcexp ?? Number.NaN;
      return { cst, ri: insp ? inspiratoryResistance(insp) : Number.NaN, re: expiratoryResistance(tc, cst), autoPeep: exp ? autoPeep(exp) : Number.NaN };
    },
  };
}
