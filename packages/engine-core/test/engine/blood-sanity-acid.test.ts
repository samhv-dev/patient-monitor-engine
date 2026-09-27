// The 7c sanity list: saline vs balanced crystalloid, DKA, hyperventilation, bicarbonate EtCO2 transient, untreated VF.
import { describe, expect, it } from 'vitest';
import { cmd, evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c sanity II — acid–base', { timeout: 300_000 }, () => {
  const twoLitres = async (fluid: string) => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(evB({ kind: 'fluid', fluid, volumeMl: 2000, overS: 1800 }));
    await runTo(e, 3660);
    return labsAt(ev, 3660);
  };
  it('2 L in 30 min under GA: saline acidifies against Plasma-Lyte (Cl up, BE lower by ≥ 2), Plasma-Lyte keeps BE ≥ 0 (annex D3 contrast)', async () => {
    const s = await twoLitres('saline');
    const b = await twoLitres('balanced');
    console.log(`saline Cl ${s.cl} BE ${s.be} | balanced Cl ${b.cl} BE ${b.be}`);
    expect(s.cl - 104).toBeGreaterThan(4);
    expect(s.be).toBeLessThanOrEqual(b.be - 2);
    expect(b.be).toBeGreaterThanOrEqual(0);
  });
  // R45: annex D3 (Cl +6–8, BE −3 to −5 at 60 min) is not reached — albumin dilution offsets the chloride acidosis
  // (plan deviation list; prototype Cl +5, BE −2.0). Visible until Ali's calibration pass.
  it.fails('2 L 0.9 % saline in 30 min under GA: Cl +6–8 and BE −3 to −5 at 60 min (annex D3)', async () => {
    const s = await twoLitres('saline');
    expect(s.cl - 104).toBeGreaterThanOrEqual(6);
    expect(s.cl - 104).toBeLessThanOrEqual(8);
    expect(s.be).toBeLessThanOrEqual(-3);
    expect(s.be).toBeGreaterThanOrEqual(-5);
  });
  it('DKA (condition severity 0.8 → ketoacids 20): AG ≥ 25, HCO3 falls; hyperventilation RR 12 → 24 raises pH ≥ 0.1', async () => {
    const { e, ev } = rigB();
    await runTo(e, 600);
    const base = labsAt(ev, 600);
    e.dispatch(evB({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 500, fio2: 0.5, peep: 5 }));
    await runTo(e, 1200);
    expect(labsAt(ev, 1200).ph - base.ph).toBeGreaterThanOrEqual(0.1);
    e.dispatch(evB({ kind: 'condition', id: 'dka', severity: 0.8 }));
    await runTo(e, 1260);
    const d = labsAt(ev, 1260);
    console.log(`hyperv pH ${labsAt(ev, 1200).ph}; DKA AG ${d.ag} HCO3 ${d.hco3} pH ${d.ph}`);
    expect(d.ag).toBeGreaterThanOrEqual(25);
    expect(d.hco3).toBeLessThan(base.hco3 - 12);
  });
  it('NaHCO3 50 mmol at fixed ventilation: EtCO2 +3–8 mmHg over a no-dose control within 3 min, < half of that by 15 min', async () => {
    const run = async (dose: boolean) => {
      const { e } = rigB({ seed: 11 });
      await runTo(e, 1200);
      if (dose) e.dispatch(evB({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' }));
      const out: number[] = [];
      for (let t = 1230; t <= 2100; t += 30) {
        await runTo(e, t);
        out.push(st(e).resp.etco2);
      }
      return out;
    };
    const a = await run(true);
    const b = await run(false);
    const d = a.map((x, i) => x - (b[i] as number));
    const peak = Math.max(...d.slice(0, 6));
    console.log(`bicarb ΔEtCO2 by 30 s: ${d.map((x) => x.toFixed(1)).join(' ')}`);
    expect(peak).toBeGreaterThanOrEqual(3);
    expect(peak).toBeLessThanOrEqual(8);
    expect(d[d.length - 1] as number).toBeLessThan(0.5 * peak);
  });
  it('untreated VF 30 min (ventilator on): lactate 8–12, pH ≤ 7.10 and ≥ 6.8 (annex D1)', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    await runTo(e, 60 + 1800);
    const v = labsAt(ev, 1860);
    console.log(`VF 30 min: lactate ${v.lactate} pH ${v.ph} BE ${v.be} PaCO2 ${v.pco2}`);
    expect(v.lactate).toBeGreaterThanOrEqual(8);
    expect(v.lactate).toBeLessThanOrEqual(12);
    expect(v.ph).toBeLessThanOrEqual(7.1);
    expect(v.ph).toBeGreaterThanOrEqual(6.8);
  });
});
