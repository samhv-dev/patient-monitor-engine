// Task 20: succinylcholine in a burned patient → hyperkalaemic ECG → calcium narrows it → insulin–dextrose lowers K.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { evB, labsAt, MAN, rigB, runTo, st } from '../helpers/blood.ts';

const qrs = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t >= t0 && x.t < t1);
  return b.reduce((a, x) => a + x.qrsMs, 0) / Math.max(1, b.length);
};

describe('7c sanity III — hyperkalaemia after succinylcholine in burns', { timeout: 300_000 }, () => {
  it('K ≈ 7.5–8 at 4 min with a wider QRS; CaCl2 narrows it within 3 min; insulin–dextrose lowers K ≥ 1 by 30 min', async () => {
    const { e, ev } = rigB({ patient: { ...MAN, blood: { burns: 0.5 } } });
    await runTo(e, 60);
    const q0 = qrs(ev, 30, 60);
    e.dispatch(evB({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' }));
    await runTo(e, 300);
    const k4 = labsAt(ev, 300).k;
    const q4 = qrs(ev, 280, 300);
    e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }));
    await runTo(e, 480);
    const q7 = qrs(ev, 460, 480);
    e.dispatch(evB({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' }));
    const kIns = labsAt(ev, 480).k;
    await runTo(e, 2280);
    console.log(`hyperK: K ${k4} at 4 min, QRS ${q0.toFixed(0)} → ${q4.toFixed(0)} → (Ca) ${q7.toFixed(0)} ms; K ${kIns} → ${labsAt(ev, 2280).k} (insulin, 30 min); mods.k ${st(e).mods.k.toFixed(2)}`);
    expect(k4).toBeGreaterThanOrEqual(7.3);
    expect(k4).toBeLessThanOrEqual(8.3);
    expect(q4).toBeGreaterThan(q0 + 10);
    expect(q7).toBeLessThan(q4);
    expect(kIns - labsAt(ev, 2280).k).toBeGreaterThanOrEqual(1);
  });
  it('nebulised salbutamol 10 mg (7g’s bus.metabolic.kShift, one source): K −0.5 to −1.0 at 30 min against a no-dose control (tables §5b.2)', async () => {
    const k30 = async (dose: boolean) => {
      const { e } = rigB({ seed: 5 });
      await runTo(e, 60);
      if (dose) e.dispatch(evB({ kind: 'drug', drugId: 'salbutamol', dose: 10, unit: 'mg', route: 'neb' }));
      await runTo(e, 60 + 1800);
      return { k: st(e).blood.out.k, kShift: st(e).pk.bus.metabolic.kShift }; // truth (the lab panel rounds to 0.1)
    };
    const d = await k30(true);
    const c = await k30(false);
    console.log(`salbutamol neb 10 mg: K ${c.k.toFixed(2)} → ${d.k.toFixed(2)} at 30 min (7g kShift ${d.kShift.toFixed(2)})`);
    expect(c.k - d.k).toBeGreaterThanOrEqual(0.5);
    expect(c.k - d.k).toBeLessThanOrEqual(1.0);
  });
});
