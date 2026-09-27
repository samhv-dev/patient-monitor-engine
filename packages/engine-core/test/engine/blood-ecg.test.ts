import { describe, expect, it } from 'vitest';
import { cmd, evB, MAN, rigB, runTo, st } from '../helpers/blood.ts';

describe('Stage 7c ECG hooks (plan decision 9)', { timeout: 300_000 }, () => {
  it('succinylcholine in a burned patient raises Modifiers.k; calcium lowers the ECG K; insulin lowers plasma K', async () => {
    const { e } = rigB({ patient: { ...MAN, blood: { burns: 0.5 } } });
    await runTo(e, 30);
    expect(st(e).mods.k).toBeCloseTo(4.2, 1);
    e.dispatch(evB({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' }));
    await runTo(e, 270);
    const kPeak = st(e).mods.k;
    expect(kPeak).toBeGreaterThan(7.3);
    e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }));
    await runTo(e, 450);
    expect(st(e).mods.k).toBeLessThan(st(e).blood.core.out.k - 0.7);
    e.dispatch(evB({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' }));
    const k0 = st(e).blood.core.out.k;
    await runTo(e, 2250);
    expect(k0 - st(e).blood.core.out.k).toBeGreaterThanOrEqual(1);
  });
  it('an instructor setModifiers k survives: the blood adds only its own change', async () => {
    const { e } = rigB();
    await runTo(e, 10);
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { k: 7 } }));
    await runTo(e, 60);
    expect(st(e).mods.k).toBeCloseTo(7, 1);
  });
});
