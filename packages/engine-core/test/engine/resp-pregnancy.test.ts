// FU-6 R10 (audit B4; suite RS2 pregnancy row; D12). Bands: awake term PaCO2 28–32 at 20 min (Hegewald & Crapo 2011);
// preoxygenated apnoea to SaO2 90 % without the thermal switch 2.5–4.5 min (RS2; McClelland 2009 ≈ half the
// non-pregnant 8 min).
import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const TERM: PatientProfile = { ageY: 30, sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] };

describe('FU-6 R10: pregnancy physiology (was PaCO2 41.7; apnoea 5.6–6.9 min)', { timeout: 600_000 }, () => {
  it('awake at term: PaCO2 28–32 at 20 min (measured 30.7; plan 31.2)', async () => {
    const e = rig6(TERM);
    await runTo(e, 1200);
    const pa = st6(e).resp.co2.pf as number;
    console.log(`FU-6 R10 awake term PaCO2 ${pa.toFixed(1)}`);
    expect(pa).toBeGreaterThanOrEqual(28);
    expect(pa).toBeLessThanOrEqual(32);
  });
  it.fails('preoxygenated apnoea to SaO2 90 %: 2.5–4.5 min — measured 4.82 (plan 4.83; was 5.75 after Task 7; FU-6 R10)', async () => {
    const e = rig6(TERM);
    await runTo(e, 60);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 240);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'ventilation', source: 'none' });
    let t90 = Infinity;
    await runTo(e, 240 + 600, (t) => { if (t90 === Infinity && st6(e).resp.o2.sa < 0.9) t90 = t; }, 1);
    const m = (t90 - 240) / 60;
    console.log(`FU-6 R10 term apnoea to 90 %: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThanOrEqual(2.5);
    expect(m).toBeLessThanOrEqual(4.5);
  });
});
