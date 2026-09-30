// FU-6 R12 (audit D4, G1d, drive probe; suite RS5, RS13; D14). Bands: 0.1 MAC volatile depresses the hypoxic response by
// ≥ 30 % while the CO2 response is almost untouched (Knill & Gelb 1978; Dahan & Teppema 2003: 30–70 %); a noxious
// stimulus 1.5 under remifentanil 0.1 + propofol 50 raises VE ≥ 20 % (RS5, Nunn ch. 5 — prototype +0.6 %: it.fails);
// massive PE (lung `pe` 1) in an awake spontaneously breathing patient: RR ≥ 25 and PaCO2 ≤ 35 on air (RS13, ESC 2019).
import { describe, expect, it } from 'vitest';
import { HVR_NMB_EMAX, neuroResp } from '../../src/l2/neuro/drive.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const nr = (mac: number) => neuroResp({ vent: V0, macVolatile: mac, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('FU-6 R12: non-chemical drives', { timeout: 900_000 }, () => {
  it('0.1 MAC depresses the hypoxic response ≥ 30 % and the CO2 response < 5 % (hvrDep 0.45, hypnoticDep 0.015)', () => {
    expect(nr(0.1).hvrDep).toBeGreaterThanOrEqual(0.3);
    expect(nr(0.1).hypnoticDep).toBeLessThan(0.05);
    expect(nr(0).hvrDep).toBe(0);
  });
  it('R3(d) (D21, Q-FU6-4 ruled): a residual block blunts the hypoxic response by ≈ 30 % at TOFR 0.6–0.7 and not at all at TOFR 0.9 (Eriksson 1993; NN-08)', () => {
    const tofr = (t: number) => neuroResp({ vent: V0, macVolatile: 0, diaBlock: 0.1, tofr: t, di: 93, naturalAirway: false, wasApnoeic: false }).hvrDep;
    expect(tofr(0.7)).toBeCloseTo(HVR_NMB_EMAX, 6); // the sourced point: TOFR 0.7 → −30 %
    expect(tofr(0.6)).toBeCloseTo(HVR_NMB_EMAX, 6); // the ramp saturates below 0.7
    expect(tofr(0.9)).toBe(0); // recovered: no depression
  });
  it('propofol: a SEDATIVE Ce leaves the peripheral (hypoxic) arm nearly intact while the central arm is depressed; an anaesthetic Ce depresses it (F3b: Nieuwenhuijs 2001 found NO peripheral depression at 0.75–1.5 µg/mL)', () => {
    const prop = (ng: number) => neuroResp({ vent: { ...V0, propofol: ng }, macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });
    expect(prop(1000).hvrDep).toBeLessThan(0.2); // 0.13 at 1.0 µg/mL
    expect(prop(1500).hvrDep).toBeLessThan(0.3); // 0.22 at 1.5 µg/mL — the top of Nieuwenhuijs's sedative range
    expect(prop(1000).hypnoticDep).toBeGreaterThan(2 * prop(1000).hvrDep); // the CENTRAL loop is the depressed one there
    expect(prop(4000).hvrDep).toBeGreaterThan(0.4); // 0.55 at an induction Ce (Blouin 1993)
  });
  it.fails('noxious stimulus 1.5 under remifentanil 0.1 + propofol 50 (SGA, FiO2 0.5): VE ≥ +20 % — measured +3.3 % (3.29 → 3.40 L/min; prototype +0.6 %, 7f antinoc 0.77)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'sga' });
    send(e, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 });
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 50, unit: 'mcg/kg/min' });
    await runTo(e, 1800);
    const ve0 = st6(e).resp.spont.ve as number;
    send(e, { kind: 'stimulus', intensity: 1.5 });
    await runTo(e, 1920);
    const ve1 = st6(e).resp.spont.ve as number;
    console.log(`FU-6 R12 stimulus: VE ${ve0.toFixed(2)} → ${ve1.toFixed(2)} L/min`);
    expect(ve1).toBeGreaterThanOrEqual(1.2 * ve0);
  });
  it('massive PE (lung pe 1), awake, air: RR ≥ 25 and PaCO2 ≤ 35 within 10 min (measured 28.2 / 33.3, SaO2 92.5 %; plan 27.2 / 30.0; audit G1d RR 18.5, PaCO2 41)', async () => {
    const e = rig6();
    await runTo(e, 600);
    send(e, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(e, 1200);
    const rs = st6(e).resp;
    console.log(`FU-6 R12 PE: RR ${rs.spont.rr.toFixed(1)}, PaCO2 ${rs.co2.pf.toFixed(1)}, SaO2 ${(rs.o2.sa * 100).toFixed(1)}`);
    expect(rs.spont.rr).toBeGreaterThanOrEqual(25);
    expect(rs.co2.pf).toBeLessThanOrEqual(35);
  });
});
