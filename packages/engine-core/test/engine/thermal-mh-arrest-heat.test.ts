// E131 (after E129): ONE skeletal-muscle hypermetabolic rate M_mh = a(t)·(MH_VO2_PEAK_X − 1)·VO2rest drives the MH
// oxygen demand, CO2 (achieved VO2 × MH_RQ + the buffered lactate's CO2), heat (achieved VO2 × Weir) and lactate (the
// unmet demand); and the heat model follows the flow — with no circulation the oxidative heat, the blood-borne core–skin
// transfer and (with no brain perfusion) sweating stop, and the body cools by conduction. Rig: probe P2's
// (thermal-mh-haemodynamics.test.ts) — ETT + VCV 12 × 500 PEEP 5 FiO2 0.5, the GA thermal flag, sevoflurane 2 % and
// suxamethonium 1.5 mg/kg at 1 s, `condition mh 1` at 300 s, untreated, ×1. The oxygen-derived MH heat no longer
// reaches the hyperthermic VF (E129's arrest at 42.3 °C), so the arrest is made: VF at +110 min (the sweating plateau),
// then one hour. SLOW (≈ 2 min wall); one yield per sim-minute. PME_E131_PRINT=1 prints the 5-min curve (the PR table).
import { describe, expect, it } from 'vitest';
import { mhO2Demand, oxyKjPerL } from '../../src/l2/thermal/metabolic.ts';
import { MH_RQ, TISSUE_K_W_M2_C } from '../../src/l2/thermal/params.ts';
import { cmd } from '../helpers/resp.ts';
import { rig6, runTo, send, st6 } from '../helpers/resp-modeled-rig.ts';

interface Row {
  t: number; tc: number; mhW: number; basalW: number; sweatW: number; kcp: number; o2Frac: number; etco2: number; paco2: number;
  lactate: number; k: number; co2Load: number; vo2: number; demand: number; hr: number; rhythm: string; arrested: boolean;
}

const MH_AT = 300;
const VF_AT = MH_AT + 110 * 60;
const END = VF_AT + 3600;
const row = (e: ReturnType<typeof rig6>, t: number): Row => {
  const s = st6(e);
  const o = s.resp.temp.out;
  return {
    t, tc: s.resp.temp.tc, mhW: o.mhW, basalW: o.metabolicW, sweatW: o.sweatW, kcp: o.kcp, o2Frac: s.resp.temp.o2Frac ?? 1,
    etco2: s.resp.etco2, paco2: s.resp.co2.pf, lactate: s.blood.out.lactate, k: s.blood.out.k, co2Load: s.blood.view.co2LoadMlMin,
    vo2: s.blood.core.o2.vo2, demand: s.blood.core.o2.demand, hr: s.hemo.circ.hrModel, rhythm: s.rhythm.id, arrested: s.hemo.circ.arrest !== null,
  };
};

describe('untreated MH from one muscle rate; a body without flow cools (E131)', { timeout: 900_000 }, () => {
  it('heat = the achieved MH oxygen × Weir; EtCO2 past the MH grading threshold; after a VF arrest no oxidative heat, no sweating, conduction only, and the core falls every 5 min', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    send(e, { kind: 'thermal', anaesthesia: 'general' });
    send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 });
    send(e, { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' });
    await runTo(e, MH_AT);
    send(e, { kind: 'condition', id: 'mh', severity: 1 });
    const rows: Row[] = [];
    let worstClosure = 0;
    let maxCo2Load = 0;
    for (let m = MH_AT; m < END; m += 60) {
      if (m === VF_AT) e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }) as never);
      await runTo(e, m + 60, (u) => {
        const s = st6(e);
        const r = row(e, u);
        // Energy closes: the MH heat is exactly the achieved MH oxygen × the caloric equivalent at the muscle's RQ
        const oxygenW = (mhO2Demand(s.resp.temp, u, s.resp.pat.vo2) * r.o2Frac * oxyKjPerL(MH_RQ)) / 60;
        worstClosure = Math.max(worstClosure, r.mhW - oxygenW);
        maxCo2Load = Math.max(maxCo2Load, r.co2Load);
        if ((u - MH_AT) % 300 === 0 || u === VF_AT + 60) rows.push(r);
      }, 1);
    }
    if (process.env.PME_E131_PRINT) {
      console.log(`E131 max (MH heat − achieved MH O2 × Weir) ${worstClosure.toFixed(3)} W; max buffered-lactate CO2 ${maxCo2Load.toFixed(0)} mL/min`);
      for (const r of rows) console.log(`E131 +${((r.t - MH_AT) / 60).toFixed(0)} min | core ${r.tc.toFixed(2)} | EtCO2 ${r.etco2.toFixed(0)} PaCO2 ${r.paco2.toFixed(0)} | lac ${r.lactate.toFixed(1)} K ${r.k.toFixed(1)} | MH ${r.mhW.toFixed(0)} W basal ${r.basalW.toFixed(0)} W sweat ${r.sweatW.toFixed(0)} W kcp ${r.kcp.toFixed(1)} | VO2 ${r.vo2.toFixed(0)}/${r.demand.toFixed(0)} o2Frac ${r.o2Frac.toFixed(2)} | buffer CO2 ${r.co2Load.toFixed(0)} | HR ${r.hr.toFixed(0)} ${r.rhythm}${r.arrested ? ' (arrest)' : ''}`);
    }
    expect(worstClosure).toBeLessThan(0.5); // W: heat never exceeds the oxygen energy (the same step's activity)
    const before = rows.filter((r) => r.t < VF_AT);
    expect(before.every((r) => r.rhythm === 'sinus')).toBe(true); // no arrest of its own: no hyperthermic VF without the old 640 W
    expect(Math.max(...before.map((r) => r.etco2))).toBeGreaterThan(55); // Larach 1994 grading: EtCO2 > 55 at controlled ventilation
    expect(maxCo2Load).toBeGreaterThan(0); // the MH lactate's buffered CO2 reaches the gas model
    // One minute after the VF: no flow → no oxidative heat; no brain perfusion → no sweating; k_cp at tissue conduction
    const after = rows.filter((r) => r.t >= VF_AT + 60);
    const s = st6(e);
    const kt = TISSUE_K_W_M2_C * s.resp.temp.env.bsa;
    for (const r of after) {
      expect(r.rhythm).toMatch(/^(vf|asystole)/);
      expect(r.mhW).toBe(0);
      expect(r.basalW).toBe(0);
      expect(r.sweatW).toBe(0);
      expect(r.kcp).toBeLessThanOrEqual(kt + 1e-9);
    }
    for (let i = 1; i < after.length; i++) expect((after[i] as Row).tc).toBeLessThan((after[i - 1] as Row).tc);
    // Cooling over the hour after the VF: the brief's 0.5–1.5 °C/h (Newtonian, the forensic rule of thumb). Henssge's
    // nomogram formula (Forensic Sci Int 1988;38:209) for 70 kg at 21 °C has a plateau first — 0.15 °C in hour 1 from
    // 38.5 °C, ≈ 0.8 °C/h later; the 2-node model has no plateau, so it sits above Henssge in the first hour.
    const vf = rows.find((r) => r.t === VF_AT) as Row;
    const hour = rows.at(-1) as Row;
    expect(hour.t).toBe(END);
    expect(vf.tc - hour.tc).toBeGreaterThan(0.5);
    expect(vf.tc - hour.tc).toBeLessThan(1.5);
  });
});
