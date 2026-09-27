// Tables §7 17a and the 7c sanity list: class III haemorrhage, transfusion, massive transfusion (engine; 7a's circuit carries the CO fall).
import { describe, expect, it } from 'vitest';
import { evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c sanity I — haemorrhage and transfusion', { timeout: 300_000 }, () => {
  it('17a class III (1750 mL over 10 min): lactate 3–5 at 30 min, BE ≤ −1, Hb falls with refill; 4 RBC + 1 L RL clear lactate', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1750, overS: 600 }));
    await runTo(e, 60 + 1800);
    const at30 = labsAt(ev, 60 + 1800);
    console.log(`17a @30 min: lactate ${at30.lactate} BE ${at30.be} Hb ${at30.hb} pH ${at30.ph}`);
    expect(at30.lactate).toBeGreaterThanOrEqual(3);
    expect(at30.lactate).toBeLessThanOrEqual(5);
    expect(at30.be).toBeLessThanOrEqual(-1);
    await runTo(e, 60 + 2400);
    const lac40 = labsAt(ev, 60 + 2400).lactate;
    e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 4, overS: 1200, warmed: true }));
    e.dispatch(evB({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1200 }));
    await runTo(e, 60 + 7200);
    const end = labsAt(ev, 60 + 7200);
    console.log(`17a +4 RBC @120 min: lactate ${end.lactate} Hb ${end.hb} K ${end.k} iCa ${end.iCa}`);
    expect(end.lactate).toBeLessThan(0.6 * lac40); // t½ ≈ 35–45 min once flow is restored (Q41)
    expect(end.hb).toBeGreaterThan(13);
  });
  it('massive transfusion: 10 units of 35-day RBC in 30 min against a matched bleed → K ≥ 5.5 and iCa ≤ 1.12; unwarmed units cool the core', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    const t0 = st(e).resp.temp.tc;
    e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 10, overS: 1800, storageDays: 35 }));
    e.dispatch(evB({ kind: 'bleed', volumeMl: 2800, overS: 1800 }));
    await runTo(e, 1860);
    const v = labsAt(ev, 1860);
    console.log(`massive: K ${v.k} iCa ${v.iCa} Hb ${v.hb} core ${st(e).resp.temp.tc.toFixed(2)}`);
    expect(v.k).toBeGreaterThanOrEqual(5.5);
    expect(v.iCa).toBeLessThanOrEqual(1.12);
    expect(t0 - st(e).resp.temp.tc).toBeGreaterThan(1.5); // 10 × 0.25 °C less what the heat model restores
  });
});
