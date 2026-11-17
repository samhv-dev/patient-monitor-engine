// The expiratory hold at the END of expiration (the model's `expHoldAt: 'end'`), the EDP-TS end-expiratory occlusion
// (manual pp. 98–99, research/57 K-15; its Insp/Exp Pause key, H-18, H-19). Absent, the hold closes 0.3 s into
// expiration as v1.9 did; set, on the step the next breath would start, so the pressure it holds is the lung's at
// end-expiration: set PEEP plus the recoil of the volume still in the lung (intrinsic PEEP); released, it gives the
// breath it held back at once, so the lung does not empty between the occlusion and that breath.
import { describe, expect, it } from 'vitest';
import { createVent, recoilPressure, releaseHold, stepVent, toggleHold, DT, type VentConfig, type VentState } from '../src/index.ts';

const steps = (vs: VentState, s: number) => {
  for (let i = Math.round(s / DT); i > 0; i--) stepVent(vs);
};
/** Step until the next expiration has started. */
const toExpiration = (vs: VentState) => {
  const phase = () => vs.p.phase;
  while (phase() === 'exp') stepVent(vs);
  while (phase() !== 'exp') stepVent(vs);
};
const VC: Partial<VentConfig> = { mode: 'VC', vt: 500, vcFlow: 30, flowPattern: 'square', pause: 0, rate: 12, peep: 5, compliance: 50, resistance: 10 };

describe("expHoldAt: 'end' (research/57 K-15)", () => {
  it('armed early in expiration, the hold closes on the step the next mandatory breath would start, at PEEP plus the end-expiratory recoil', () => {
    const vs = createVent({ ...VC, expHoldAt: 'end' });
    steps(vs, 20);
    toExpiration(vs);
    const breathStart = vs.p.t - vs.p.breathT;
    toggleHold(vs, 'exp');
    while (vs.hold === null) {
      stepVent(vs);
      expect(vs.p.phase).toBe('exp');
    }
    // the mandatory period from the breath's start, to within the model's own one-step mandatory timing
    const at = vs.p.t - breathStart;
    expect(at).toBeGreaterThanOrEqual(60 / 12 - DT);
    expect(at).toBeLessThanOrEqual(60 / 12 + DT);
    steps(vs, 1);
    expect(vs.p.Q).toBe(0);
    expect(vs.p.Paw).toBeCloseTo(5 + recoilPressure(vs.cfg, vs.p.V), 9);
    expect(vs.p.phase).toBe('exp');
    const held = vs.p.V, n = vs.p.breathCount;
    releaseHold(vs);
    expect(vs.p.breathCount).toBe(n + 1);
    expect(vs.p.markers.at(-1)!.type).toBe('mand');
    expect(vs.p.phase).toBe('insp');
    expect(vs.p.breathVstart).toBe(held);
  });

  it('a patient-triggered end of expiration is held as well: the breath the effort would start waits for the release', () => {
    const vs = createVent({ ...VC, rate: 6, spont: true, pmus: 6, spontRate: 20, expHoldAt: 'end' });
    steps(vs, 30);
    toExpiration(vs);
    const n = vs.p.breathCount;
    toggleHold(vs, 'exp');
    while (vs.hold === null) stepVent(vs);
    expect(vs.p.breathCount).toBe(n);
    // well before the 10 s mandatory period: an effort ended this expiration
    expect(vs.p.breathT).toBeLessThan(60 / 6 - 1);
    steps(vs, 2);
    expect(vs.p.breathCount).toBe(n);
    releaseHold(vs);
    // released, the breath the effort was starting is given at once, a patient's breath
    expect(vs.p.breathCount).toBe(n + 1);
    expect(vs.p.markers.at(-1)!.type).toBe('pt');
  });

  it('left out, the hold closes 0.3 s into expiration, as before', () => {
    const vs = createVent(VC);
    steps(vs, 20);
    toExpiration(vs);
    toggleHold(vs, 'exp');
    while (vs.hold === null) stepVent(vs);
    expect(vs.p.phaseT).toBeGreaterThan(0.3);
    expect(vs.p.phaseT).toBeLessThan(0.3 + 2 * DT);
  });

  it('with no hold armed the option changes nothing, bit for bit', () => {
    const a = createVent(VC);
    const b = createVent({ ...VC, expHoldAt: 'end' });
    for (let i = 0; i < 30 / DT; i++) {
      stepVent(a);
      stepVent(b);
      expect([b.p.Paw, b.p.Q, b.p.V, b.p.phase]).toEqual([a.p.Paw, a.p.Q, a.p.V, a.p.phase]);
    }
  });

  it('releaseHold ends a hold and drops an armed one', () => {
    const vs = createVent({ ...VC, expHoldAt: 'end' });
    steps(vs, 10);
    toExpiration(vs);
    toggleHold(vs, 'exp');
    releaseHold(vs);
    expect(vs.pendingHold).toBeNull();
    steps(vs, 6);
    expect(vs.hold).toBeNull();
  });
});
