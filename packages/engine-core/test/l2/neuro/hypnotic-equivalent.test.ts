import { describe, expect, it } from 'vitest';
import { depth, KET_EEG_W } from '../../../src/l2/neuro/depth.ts';
import { readBus } from '../../../src/l2/neuro/bus.ts';
import { busFixture } from '../../helpers/neuro-bus.ts';

const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
const d = (hypPropEq: number, dissoc = 0) => depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq, dissoc });

/** FU-7 (addendum 20): the depth index and consciousness come from 7g's ONE hypnotic equivalent. */
describe('hypnotic equivalent (R51 addendum 20)', () => {
  it('an induction-strength equivalent from ANY agent gives unconsciousness (DI-69: thiopental and etomidate never did)', () => {
    expect(d(2500).conscious).toBe(false); // 2.5 µg/mL propofol-equivalent > locPropofol(40) = 2020
    expect(d(1200).conscious).toBe(true);
  });
  it('a dissociative equivalent is unconscious with a HIGH index (D3: BIS 60–90 under ketamine)', () => {
    const k = d(3800, 1);
    expect(k.conscious).toBe(false);
    expect(k.diRaw).toBeGreaterThan(80);
    expect(d(3800, 0).diRaw).toBeLessThan(40); // the same equivalent from a non-dissociative agent
    expect(KET_EEG_W).toBeLessThan(0.2);
  });
  it('the reader is duck-typed: a bus without the outputs falls back to the per-agent sum (no NaN)', () => {
    const b = busFixture({ cns: { propCe: 3 } });
    const x = readBus(b);
    expect(Number.isFinite(x.hypPropEq as number)).toBe(true);
    const bare = { ...b, cns: { ...b.cns } } as unknown as Record<string, unknown>;
    delete (bare.cns as Record<string, unknown>).hypPropEq;
    const y = readBus(bare as never);
    expect(y.hypPropEq).toBeUndefined();
    expect(depth({ ageY: 40, ce: { ...C0, propofol: 3000 }, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq: y.hypPropEq }).conscious).toBe(false);
  });
});
