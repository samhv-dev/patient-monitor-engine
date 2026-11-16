// The brain's energy state across a snapshot: a restored engine continues the cortex entry and the EEG's cortex exactly
// as the unbroken run, and a snapshot without the state (taken before it existed) gets it derived from the brain's own
// flow and blood gases, not reset to normal.
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
    delete (old.state as { st: { organs: { brain: { energy?: unknown } } } }).st.organs.brain.energy;
    const e = createEngine(OPTS);
    e.restore(old);
    expect(st(e).organs.brain.energy).toEqual(live);
  });
});
