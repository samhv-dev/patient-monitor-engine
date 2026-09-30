// FU-6 R15 (audit B5, B6; suite RS2 child row). After V.1 E-V1-1 and FU-4's R1 root: the awake 4 y 16 kg child breathes
// its own pattern at PaCO2 35–45 with VT 6–8 mL/kg (±30 %) and no lactate rise over 15 min; displayed SpO2 lags SaO2
// ≤ 20 s during a preoxygenated apnoea (RS2).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const CHILD = { ageY: 4, sex: 'M' as const, weightKg: 16, heightCm: 102 };

describe('FU-6 R15: the child baseline (was PaCO2 49–52, VT 590–706, lactate 1.0 → 3.5)', { timeout: 600_000 }, () => {
  // R45 (FU-6 executor, merged main): PaCO2 36.1 and lactate 0.99 → 1.00 are met; the VT is not — 246 mL = 15.4 mL/kg
  // at RR 7.4. The child's L1 resting pattern is still the adult default (15 × 500 — FU-4's R1 root did not derive it
  // from the patient), and the drive scales rate and depth from it; on main the same child oscillates between
  // 19 × 638 and 4.9 × 160 (FU-6's central lag damps it). Request to FU-4's R1 owner: the per-patient resting pattern.
  it.fails('awake: PaCO2 35–45, VT 4.2–10.4 mL/kg, lactate rise < 0.5 over 15 min — measured VT 15.4 mL/kg (246 mL, RR 7.4; PaCO2 36.1, lactate +0.01) (FU-6 R15, band 4.2–10.4)', async () => {
    const e = rig6(CHILD);
    await runTo(e, 60);
    const lac0 = st6(e).blood.out.lactate as number;
    await runTo(e, 900);
    const rs = st6(e).resp;
    const lac1 = st6(e).blood.out.lactate as number;
    console.log(`FU-6 R15 child: PaCO2 ${rs.co2.pf.toFixed(1)}, VT ${rs.spont.vt.toFixed(0)} mL, RR ${rs.spont.rr.toFixed(1)}, lactate ${lac0.toFixed(2)} → ${lac1.toFixed(2)}`);
    expect(rs.co2.pf).toBeGreaterThanOrEqual(35);
    expect(rs.co2.pf).toBeLessThanOrEqual(45);
    expect(rs.spont.vt / 16).toBeGreaterThanOrEqual(4.2);
    expect(rs.spont.vt / 16).toBeLessThanOrEqual(10.4);
    expect(lac1 - lac0).toBeLessThan(0.5);
  });
  // R45: SaO2 < 90 at +200 s, displayed SpO2 < 90 at +222 s — a 22 s lag against the 20 s band (was 66 s on 94040f7;
  // V.1's CO-ratio fix is in). Request to V.1's owner / FU-5 (the display lag); not FU-6 code.
  it.fails('preoxygenated apnoea: displayed SpO2 < 90 no more than 20 s after SaO2 < 90 — measured 22 s (+200 / +222 s) (FU-6 R15, band ≤ 20 s)', async () => {
    const e = rig6(CHILD);
    const spo2: Array<[number, number]> = [];
    e.on((x) => { if (x.type === 'measurement' && x.values.spo2?.value != null) spo2.push([x.t, x.values.spo2.value as number]); }, ['measurement']);
    await runTo(e, 60);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 240);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'ventilation', source: 'none' });
    let tSa = Infinity;
    await runTo(e, 840, (t) => { if (tSa === Infinity && st6(e).resp.o2.sa < 0.9) tSa = t; }, 1);
    const tSp = spo2.find(([t, v]) => t > 240 && v < 90)?.[0] ?? Infinity;
    console.log(`FU-6 R15 child apnoea: SaO2 < 90 at +${(tSa - 240).toFixed(0)} s, displayed SpO2 < 90 at +${(tSp - 240).toFixed(0)} s`);
    expect(tSp - tSa).toBeLessThanOrEqual(20);
  });
});
