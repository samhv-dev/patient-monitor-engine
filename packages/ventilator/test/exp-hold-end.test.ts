// The expiratory hold at the END of expiration (the model's `expHoldAt: 'end'`), the EDP-TS end-expiratory occlusion
// (manual pp. 98–99, research/57 K-15; its Insp/Exp Pause key, H-18, H-19). Absent, the hold closes 0.3 s into
// expiration as v1.9 did; set, on the step the next breath would start, so the pressure it holds is the lung's at
// end-expiration: set PEEP plus the recoil of the volume still in the lung (intrinsic PEEP); released, it gives the
// breath it held back at once, so the lung does not empty between the occlusion and that breath.
import { describe, expect, it } from 'vitest';
import { breathKind, cancelHold, createVent, pmusValue, recoilPressure, releaseHold, stepVent, toggleHold, DT, type VentConfig, type VentState } from '../src/index.ts';

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

describe('cancelHold: a hold ended with no breath given', () => {
  it('an end-expiratory hold cancelled drops the breath it held back; ventilation goes on at its own time', () => {
    const vs = createVent({ ...VC, expHoldAt: 'end' });
    steps(vs, 20);
    toExpiration(vs);
    toggleHold(vs, 'exp');
    while (vs.hold === null) stepVent(vs);
    const n = vs.p.breathCount;
    cancelHold(vs);
    expect([vs.hold, vs.pendingHold, vs.heldBreath]).toEqual([null, null, undefined]);
    expect(vs.p.breathCount, 'no breath given').toBe(n);
    // the mandatory period ran out while held: the next breath starts on the next step of its own timing
    while (vs.p.breathCount === n && vs.p.t < 60) stepVent(vs);
    expect(vs.p.breathCount).toBe(n + 1);
  });
});

describe("holdEffort: the patient's effort on a held airway (the equation of motion with no flow)", () => {
  const SPONT: Partial<VentConfig> = { ...VC, rate: 6, spont: true, pmus: 8, spontRate: 20, expHoldAt: 'end' };
  const held = (o: Partial<VentConfig>) => {
    const vs = createVent({ ...SPONT, ...o });
    steps(vs, 30);
    toExpiration(vs);
    toggleHold(vs, 'exp');
    while (vs.hold === null) stepVent(vs);
    return vs;
  };
  it('set: the held airway pressure is PEEP plus the recoil minus the effort, step by step through an effort', () => {
    const vs = held({ holdEffort: true });
    let seen = 0;
    for (let i = 0; i < 4 / DT; i++) {
      stepVent(vs);
      expect(vs.p.Q).toBe(0);
      expect(vs.p.Paw).toBeCloseTo(5 + recoilPressure(vs.cfg, vs.p.V) - vs.p.Pmus, 9);
      seen = Math.max(seen, vs.p.Pmus);
    }
    expect(seen, 'an effort came during the hold').toBeGreaterThan(pmusValue(vs.cfg, 0.1));
  });
  it('left out: the hold does not see the effort, as before', () => {
    const vs = held({});
    for (let i = 0; i < 4 / DT; i++) {
      stepVent(vs);
      expect(vs.p.Paw).toBeCloseTo(5 + recoilPressure(vs.cfg, vs.p.V), 9);
    }
  });
});

describe('breathKind: the kind of the breath in progress', () => {
  it('the set mode, or a backup breath\'s stamped kind', () => {
    const vs = createVent({ mode: 'PSV', spont: true, pmus: 0, ps: 10, apneaTime: 15, rate: 12, backupMode: 'PC' });
    expect(breathKind(vs)).toBe('PSV');
    while (vs.backupBreath === undefined && vs.p.t < 30) stepVent(vs);
    expect(breathKind(vs)).toBe('PC');
  });
});
