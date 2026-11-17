// The brain's energy state across a snapshot: a restored engine continues the cortex entry and the EEG's cortex exactly
// as the unbroken run, and a snapshot without the state (taken before it existed) gets it derived from the brain's own
// flow and blood gases, not reset to normal. The brainstem entry (the breathing gate's state) continues through an
// arrest and its return of circulation in both modes, and a snapshot that kept it on the spontaneous drive's record is
// read by moving it.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type MonitorEngine, type PatientSnapshot } from '../../src/index.ts';

const OPTS = { seed: 11, mode: 'modeled' as const, patient: { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const } };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `be-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine) => (e as unknown as { st: any }).st;
const brainNow = (e: MonitorEngine) => ({ energy: structuredClone(st(e).organs.brain.energy), cortex: structuredClone(st(e).eeg.cortex) });

function arrested(untilS = 18): MonitorEngine {
  const e = createEngine(OPTS);
  e.dispatch(cmd({ type: 'device', action: { device: 'eeg', action: 'on' } }));
  e.advanceTo(10);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
  e.advanceTo(untilS);
  return e;
}
function continued(snap: PatientSnapshot, untilS: number) {
  const e = createEngine(OPTS);
  e.restore(snap);
  const at: ReturnType<typeof brainNow>[] = [];
  for (let t = 18.1; t <= untilS + 1e-9; t += 0.1) {
    e.advanceTo(t);
    at.push(brainNow(e));
  }
  return { e, at };
}

describe('the brain energy state across a snapshot', () => {
  it('a restored engine continues the cortex entry and the EEG cortex bit for bit', () => {
    const a = arrested();
    const snap = a.snapshot();
    const ref: ReturnType<typeof brainNow>[] = [];
    for (let t = 18.1; t <= 30 + 1e-9; t += 0.1) {
      a.advanceTo(t);
      ref.push(brainNow(a));
    }
    expect(ref.some((r) => r.energy.cortex.metabolic > 0 && r.energy.cortex.metabolic < 1)).toBe(true);
    expect(continued(snap, 30).at).toEqual(ref);
  });

  it('a snapshot without the energy state: derived on restore from the brain\'s flow and its last view, not normal', () => {
    const a = arrested(26); // the cortex's delivery is below its abnormal level
    const snap = a.snapshot();
    const live = st(a).organs.brain.energy;
    expect(live.cortex.metabolic).toBeGreaterThan(0);
    const old = structuredClone(snap);
    const os = (old.state as { st: { organs: { brain: { energy?: { brainstem: object } } }; resp: { spont: object } } }).st;
    Object.assign(os.resp.spont, os.organs.brain.energy?.brainstem); // where a snapshot of that time kept the gate's state
    delete os.organs.brain.energy;
    const e = createEngine(OPTS);
    e.restore(old);
    expect(st(e).organs.brain.energy).toEqual(live);
  });
});

describe('the brainstem entry across a snapshot', () => {
  const breathing = (e: MonitorEngine) => structuredClone({ brainstem: st(e).organs.brain.energy.brainstem, spont: st(e).resp.spont });
  /** VF at 10 s; the snapshot at 60 s, gasping; sinus at 70 s, then the gate's reopening. */
  function rig(mode: 'manual' | 'modeled') {
    const opts = { ...OPTS, mode };
    const a = createEngine(opts);
    a.advanceTo(10);
    a.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    a.advanceTo(60);
    return { a, opts, snap: a.snapshot() };
  }
  function onward(e: MonitorEngine) {
    const at: ReturnType<typeof breathing>[] = [];
    for (let t = 60.5; t <= 250 + 1e-9; t += 0.5) {
      e.advanceTo(t);
      if (Math.abs(t - 70) < 1e-9) e.dispatch(cmd({ type: 'setRhythm', rhythm: 'sinus', when: 'now' }));
      at.push(breathing(e));
    }
    return at;
  }
  for (const mode of ['manual', 'modeled'] as const) {
    it(`${mode}: a restored engine continues the gate's state and the drive bit for bit through the reopening`, () => {
      const { a, opts, snap } = rig(mode);
      expect(st(a).organs.brain.energy.brainstem.anoxS).toBeGreaterThan(30);
      const ref = onward(a);
      expect(ref.some((r) => r.brainstem.gate !== undefined && r.brainstem.gate > 0)).toBe(true);
      const e = createEngine(opts);
      e.restore(snap);
      expect(onward(e)).toEqual(ref);
    });
    it(`${mode}: a snapshot with the gate's state on the drive's record is read by moving it, and continues the same`, () => {
      const { a, opts, snap } = rig(mode);
      const live = breathing(a);
      const ref = onward(a);
      const old = structuredClone(snap);
      const os = (old.state as { st: { organs: { brain: { energy: { brainstem?: object } } }; resp: { spont: object } } }).st;
      Object.assign(os.resp.spont, os.organs.brain.energy.brainstem);
      delete os.organs.brain.energy.brainstem;
      const e = createEngine(opts);
      e.restore(old);
      expect(breathing(e)).toEqual(live);
      expect(onward(e)).toEqual(ref);
    });
  }
});
