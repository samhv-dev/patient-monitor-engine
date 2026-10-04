// FU-7 Task 11 (R51 addendum 23; D9, D18; ruling 5): antiarrhythmic conversion as a HAZARD per second on the `outcome`
// stream, scaled by each drug's own occupancy, only in a PERFUSING rhythm; the pre-excited-AF accessory-pathway hazard.
// The concentrations are set directly on the PK state (`concOf` reads `pk.lastC`), so every case is deterministic
// for its seed. A trial's window is simulated as one evaluation per second.
import { describe, expect, it } from 'vitest';
import { createPkState, type PkState } from '../../../src/l2/pk/pipeline.ts';
import { createHookState, L_AMIO_AF, L_AMIO_VT, L_LIDO_VT, L_PROC_VT, PREEXCITED_VF_P, rhythmRequest, type RhythmHookState } from '../../../src/l2/pk/hooks.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import type { RhythmId } from '../../../src/types.ts';

const pkWith = (c: Record<string, number>, avNodeBlock = 0): PkState => {
  const pk = createPkState();
  Object.assign(pk.lastC, c);
  pk.bus.avNodeBlock = avNodeBlock;
  return pk;
};
/** One seeded run of `windowS` one-second evaluations; returns the first request (or null). */
function runWindow(pk: PkState, id: RhythmId, windowS: number, seed: number, o: { pulseless?: boolean; hs?: RhythmHookState } = {}) {
  const hs = o.hs ?? createHookState();
  const rng = seedStream(seed, 'outcome');
  for (let t = 0; t <= windowS; t++) {
    const r = rhythmRequest(pk, hs, { id, pinned: false, ...(o.pulseless !== undefined ? { pulseless: o.pulseless } : {}) }, t, rng);
    if (r) return r;
  }
  return null;
}
const share = (pk: PkState, id: RhythmId, windowS: number, n = 200, o: { pulseless?: boolean } = {}) => {
  let k = 0;
  for (let s = 1; s <= n; s++) if (runWindow(pk, id, windowS, s, o)?.id === 'sinus') k++;
  return k / n;
};
const FULL = 1000; // × each drug's ec50: occupancy u = c/(c + ec50) ≈ 0.999

describe('antiarrhythmic conversion hazards (R51 addendum 23)', () => {
  it('the hazard constants reproduce their trial numbers: 1 − e^{−λT} = 0.38 / 0.67 / 0.20 / 0.25', () => {
    expect(1 - Math.exp(-L_AMIO_VT * 2400)).toBeCloseTo(0.38, 9); // PROCAMIO: amiodarone 11/29 (38 %) at 40 min
    expect(1 - Math.exp(-L_PROC_VT * 2400)).toBeCloseTo(0.67, 9); // PROCAMIO: procainamide 22/33 (67 %) at 40 min
    expect(1 - Math.exp(-L_LIDO_VT * 1200)).toBeCloseTo(0.2, 9); // Gorgels 1996: lidocaine ≈ 20 % at 20 min
    expect(1 - Math.exp(-L_AMIO_AF * 3600)).toBeCloseTo(0.25, 9); // Letelier 2003: amiodarone ≈ 25 % of recent AF in 1 h
  });
  it('amiodarone at full occupancy converts stable VT in PROCAMIO\'s share over its 40 min window: 200 seeded runs within ±0.07 of the analytic share', () => {
    const pk = pkWith({ amiodarone: FULL });
    const u = FULL / (FULL + 1);
    const analytic = 1 - Math.exp(-L_AMIO_VT * u * 2400);
    const got = share(pk, 'vtMono', 2400);
    console.log(`FU-7 T11: amiodarone VT conversion ${got.toFixed(3)} vs analytic ${analytic.toFixed(3)} (200 runs × 2400 s)`);
    expect(Math.abs(got - analytic)).toBeLessThanOrEqual(0.07);
  });
  // R45: the hazard is occupancy-SCALED (u = c/(c + 3 µg/mL) = 0.09 at 0.3), not thresholded, so a small share converts.
  it.fails('a sub-therapeutic lidocaine level (0.3 µg/mL) never converts VT in 200 seeded runs of its 20 min window — measured 3/200 (1.5 %; u 0.09 × λ_lido)', () => {
    const got = share(pkWith({ lidocaine: 0.3 }), 'vtMono', 1200);
    console.log(`FU-7 T11: lidocaine 0.3 µg/mL VT conversion ${got.toFixed(3)} (200 runs × 1200 s)`);
    expect(got).toBe(0);
  });
  it('amiodarone during VF never converts (λ_vf = 0: ARREST 1999, ALPS 2016 — the drug acts through the shock, Task 12)', () => {
    expect(share(pkWith({ amiodarone: FULL }), 'vfCoarse', 2400, 50)).toBe(0);
  });
  it('a PULSELESS VT at full amiodarone and procainamide occupancy never converts (ruling 5: the shock path)', () => {
    expect(share(pkWith({ amiodarone: FULL, procainamide: FULL }), 'vtMono', 2400, 200, { pulseless: true })).toBe(0);
  });
  it('a hook state WITHOUT conv/preexcited (a pre-FU-7 snapshot) runs without throwing (3d)', () => {
    const hs = createHookState() as unknown as Record<string, unknown>;
    delete hs.conv;
    delete hs.preexcited;
    expect(() => runWindow(pkWith({ amiodarone: FULL }), 'vtMono', 60, 1, { hs: hs as unknown as RhythmHookState })).not.toThrow();
  });
  it('pre-excited AF + an AV-nodal block raises the rate to ≥ 200 or produces VF; the seeded VF share ≈ PREEXCITED_VF_P', () => {
    let vf = 0;
    const n = 400;
    for (let s = 1; s <= n; s++) {
      const r = runWindow(pkWith({}, 0.8), 'preexcitedAf', 5, s);
      expect(r).not.toBeNull();
      if (r!.id === 'vfCoarse') vf++;
      else expect(r!.id === 'preexcitedAf' && (r!.opts.rateBpm ?? 0) >= 200).toBe(true);
    }
    console.log(`FU-7 T11: pre-excited AF + AV block → VF ${vf}/${n}`);
    expect(Math.abs(vf / n - PREEXCITED_VF_P)).toBeLessThanOrEqual(0.05);
  });
});
