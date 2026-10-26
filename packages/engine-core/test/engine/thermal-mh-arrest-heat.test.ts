// E129: in untreated malignant hyperthermia the muscle heat is oxidative, so it is limited by the oxygen the circulation
// delivers (the blood model's achieved ÷ demanded VO2, `resp.temp.o2Frac`; heat.ts). Main kept adding MH_HEAT_X × m0
// after the hyperthermic arrest and the core climbed without bound (the owner saw 94 °C on the MH card). Rig: probe P2's
// (thermal-mh-haemodynamics.test.ts) — ETT + VCV 12 × 500 PEEP 5 FiO2 0.5, the GA thermal flag, sevoflurane 2 % and
// suxamethonium 1.5 mg/kg at 1 s, `condition mh 1` at 300 s, untreated, ×1; then one hour after the arrest.
// SLOW (≈ 60 s wall); one yield per sim-minute. PME_E129_PRINT=1 prints the 5-min curve (the PR body's table).
import { describe, expect, it } from 'vitest';
import { T_HOT } from '../../src/l2/circ/arrest.ts';
import { rig6, runTo, send, st6 } from '../helpers/resp-modeled-rig.ts';

interface Arrest { t: number; cause: string; tc: number; rhythm: string }
interface Row { t: number; tc: number; mhW: number; o2Frac: number | undefined; etco2: number; hr: number; rhythm: string; arrested: boolean }

const MH_AT = 300;
const row = (e: ReturnType<typeof rig6>, t: number): Row => {
  const s = st6(e);
  return {
    t, tc: s.resp.temp.tc, mhW: s.resp.temp.out.mhW, o2Frac: s.resp.temp.o2Frac, etco2: s.resp.etco2, hr: s.hemo.circ.hrModel,
    rhythm: s.rhythm.id, arrested: s.hemo.circ.arrest !== null,
  };
};

describe('untreated MH: no muscle heat without oxygen delivery (E129)', { timeout: 900_000 }, () => {
  it('arrests in VF from hyperthermia at 42–45 °C, the MH heat falls to ≈ 0, the core peaks ≤ 45 °C and then cools', async () => {
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
    let arrest = null as Arrest | null; // assigned in the callback (`as`: no narrowing to null)
    let peak = row(e, MH_AT);
    let end = MH_AT + 120 * 60; // a cap: the hazard fires long before it; then one hour after the arrest
    for (let m = MH_AT; m < end; m += 60) {
      await runTo(e, m + 60, (u) => {
        const r = row(e, u);
        if (r.tc > peak.tc) peak = r;
        if (!arrest && r.arrested) {
          arrest = { t: u, cause: st6(e).hemo.circ.arrest.cause, tc: r.tc, rhythm: r.rhythm };
          end = u + 3600;
        }
        if (u <= end && ((u - MH_AT) % 300 === 0 || (arrest && (u === arrest.t || u === arrest.t + 60)))) rows.push(r);
      }, 1);
    }
    if (process.env.PME_E129_PRINT) {
      console.log(`E129 arrest at +${arrest ? ((arrest.t - MH_AT) / 60).toFixed(1) : '-'} min (${arrest?.cause}, ${arrest?.rhythm}, core ${arrest?.tc.toFixed(2)}); peak ${peak.tc.toFixed(2)} at +${((peak.t - MH_AT) / 60).toFixed(1)} min`);
      for (const r of rows) console.log(`E129 +${((r.t - MH_AT) / 60).toFixed(1)} min | core ${r.tc.toFixed(2)} | MH heat ${r.mhW.toFixed(0)} W | O2 share ${(r.o2Frac ?? 1).toFixed(2)} | EtCO2 ${r.etco2.toFixed(0)} | HR ${r.hr.toFixed(0)} | ${r.rhythm}${r.arrested ? ' (arrest)' : ''}`);
    }
    expect(arrest, 'the hyperthermic hazard fired').not.toBeNull();
    const a = arrest as Arrest;
    expect(a.cause).toBe('hyperthermia');
    expect(a.rhythm).toMatch(/^vf/);
    expect(a.tc).toBeGreaterThan(T_HOT);
    expect(a.tc).toBeLessThanOrEqual(45);
    // Before the arrest delivery meets demand: the share is absent (= 1), so the course to the arrest is main's
    const before = rows.filter((r) => r.t < a.t);
    expect(before.every((r) => r.o2Frac === undefined)).toBe(true);
    const heatBefore = (before.at(-1) as Row).mhW;
    expect(heatBefore).toBeGreaterThan(400); // ≈ 8 × m0 at full activity
    // One minute after the arrest the muscle heat is gone (no flow, no oxygen) and stays gone
    const after = rows.filter((r) => r.t >= a.t + 60);
    expect(after.every((r) => r.mhW < 0.01 * heatBefore)).toBe(true);
    // The core peaks at the arrest (≤ 45 °C) and then falls over the following hour, every 5 min
    expect(peak.tc).toBeLessThanOrEqual(45);
    expect(peak.t - a.t).toBeLessThanOrEqual(120);
    const hour = rows.filter((r) => r.t > a.t + 60 && (r.t - MH_AT) % 300 === 0);
    for (let i = 1; i < hour.length; i++) expect((hour[i] as Row).tc).toBeLessThan((hour[i - 1] as Row).tc);
    expect((hour.at(-1) as Row).tc).toBeLessThan(peak.tc - 2);
  });
});
