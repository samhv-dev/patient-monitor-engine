// Task 21: anaemia and dyshaemoglobins — SpO2 unchanged by anaemia, over-reads with COHb, drifts to 85 % with MetHb.
import { describe, expect, it } from 'vitest';
import { labsAt, MAN, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c oxygen delivery and the oximeter', { timeout: 300_000 }, () => {
  it('Hb 7: SpO2 truth unchanged, DO2 ≈ half, SvO2 lower', async () => {
    const a = rigB();
    const b = rigB({ patient: { ...MAN, blood: { hb: 7 } } });
    await runTo(a.e, 300);
    await runTo(b.e, 300);
    expect(Math.abs(st(a.e).resp.o2.sa - st(b.e).resp.o2.sa)).toBeLessThan(0.01);
    expect(st(b.e).blood.core.o2.do2).toBeLessThan(0.55 * st(a.e).blood.core.o2.do2);
    expect(st(b.e).blood.core.o2.svo2).toBeLessThan(st(a.e).blood.core.o2.svo2 - 0.1);
  });
  it('COHb 25 %: displayed SpO2 ≥ 94 while the co-oximeter SO2 ≤ 75; MetHb 35 %: SpO2 ≈ 85', async () => {
    const c = rigB({ patient: { ...MAN, blood: { cohb: 0.25 } } });
    await runTo(c.e, 120);
    const sp = c.ev.filter((x) => x.type === 'measurement' && x.values.spo2?.value != null).pop();
    const spo2 = sp?.type === 'measurement' ? (sp.values.spo2?.value as number) : 0;
    const lab = labsAt(c.ev, 120);
    console.log(`COHb 25 %: SpO2 ${spo2}, SO2 ${lab.so2}, COHb ${lab.cohb}`);
    expect(spo2).toBeGreaterThanOrEqual(94);
    expect(lab.so2).toBeLessThanOrEqual(75);
    const m = rigB({ patient: { ...MAN, blood: { methb: 0.35 } } });
    await runTo(m.e, 120);
    const sm = m.ev.filter((x) => x.type === 'measurement' && x.values.spo2?.value != null).pop();
    const spm = sm?.type === 'measurement' ? (sm.values.spo2?.value as number) : 0;
    expect(Math.abs(spm - 85)).toBeLessThanOrEqual(3);
  });
});
