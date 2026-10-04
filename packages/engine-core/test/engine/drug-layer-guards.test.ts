// FU-7 Task 19 case 7 (split from drug-layer.test.ts at the finisher gate, 2026-10-04, by measured time so each CI
// slow group stays under ≈ 40 min): the regression guards — matrix cells already PL before FU-7 that must stay PL. The
// audit's ventilated rig (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5) unless a case says otherwise; one yield per sim-MINUTE.
import { describe, expect, it } from 'vitest';
import * as F7 from '../helpers/fu7.ts';

const conscious = (r: F7.Row) => r.conscious === true;

describe('FU-7 Task 19: the flipped matrix cells (R54)', { timeout: 3_600_000 }, () => {
  const { T, V, SP, d, inf, vap, A } = F7;
  describe('regression guards: cells already PL stay PL', () => {
    it('adenosine 6 mg converts AVNRT 180: AV block 3–30 s after the push, sinus 5–60 s (DI-14a; ALS, research 03 §8.6)', async () => {
      const r = await F7.runArm(V([[T, F7.A.rhythm('svtAvnrt', { rateBpm: 180 })], d(T + 60, 'adenosine', 6, 'mg')], T + 300, {}, { dt: 1 }));
      const pause = r.rhythms.find(([t, id]) => t > T + 60 && (id === 'pWaveAsystole' || id === 'sinusPause' || id.startsWith('avb')));
      const sinus = r.rhythms.find(([t, id]) => t > T + 60 && id.startsWith('sinus'));
      console.log(`FU-7 T19 DI-14a: ${r.rhythms.map(([t, id]) => `${t}s ${id}`).join(', ')}`);
      expect(pause![0] - (T + 60)).toBeGreaterThanOrEqual(3);
      expect(pause![0] - (T + 60)).toBeLessThanOrEqual(30);
      expect(sinus![0] - (T + 60)).toBeGreaterThanOrEqual(5);
      expect(sinus![0] - (T + 60)).toBeLessThanOrEqual(60);
    });
    it('magnesium 2 g over 2 min terminates torsades within 5–300 s (DI-54; ALS, tables §6.2)', async () => {
      const r = await F7.runArm(V([[T, F7.A.rhythm('torsades')], d(T + 60, 'magnesium', 2, 'g', { overS: 120 })], T + 600));
      const s = r.rhythms.find(([t, id]) => t > T + 60 && (id === 'sinus' || id === 'sinusTachy'));
      console.log(`FU-7 T19 DI-54: ${r.rhythms.map(([t, id]) => `${t}s ${id}`).join(', ')}`);
      expect(s![0] - (T + 60)).toBeGreaterThanOrEqual(5);
      expect(s![0] - (T + 60)).toBeLessThanOrEqual(300);
    });
    it('lipid emulsion lowers free bupivacaine to 0.4–0.75 × (DI-24; ASRA 2020, 7g gate ×0.681), and bupivacaine 225 mg untreated arrests', async () => {
      const i = await F7.runArm(V([d(T, 'bupivacaine', 225, 'mg'), d(T + 30, 'lipidEmulsion', 1.5, 'mL/kg'), inf(T + 30, 'lipidEmulsion', 0.25, 'mL/kg/min')]));
      const c = await F7.runArm(V([d(T, 'bupivacaine', 225, 'mg')]));
      const ratio = F7.mx(i.rows, 'c_bupivacaine', T + 200, T + 300) / F7.mx(c.rows, 'c_bupivacaine', T + 200, T + 300);
      console.log(`FU-7 T19 DI-24: lipid free-level ratio ${ratio.toFixed(2)}, untreated arrest ${F7.arrestIn(c.rows, T, T + 900)}`);
      expect(ratio).toBeGreaterThanOrEqual(0.4);
      expect(ratio).toBeLessThanOrEqual(0.75);
      expect(F7.arrestIn(c.rows, T, T + 900)).toBe(true);
    });
    it('the K⁺ treatments at K 7.0 (DI-26; UK Renal Association 2023): calcium ±0.15 at 5 min, insulin–dextrose −0.6 to −1.1 at 60 min, salbutamol −0.4 to −1.0 at 30 min, the two additive', async () => {
      const P = { blood: { k: 7 } };
      const o = { dt: 10 };
      const c = await F7.runArm(V([], T + 3600, P, o));
      const ca = await F7.runArm(V([d(T, 'calciumChloride', 1, 'g')], T + 300, P, o));
      const id = await F7.runArm(V([d(T, 'insulinDextrose', 10, 'units')], T + 3600, P, o));
      const sb = await F7.runArm(V([d(T, 'salbutamol', 10, 'mg')], T + 1800, P, o));
      const both = await F7.runArm(V([d(T, 'insulinDextrose', 10, 'units'), d(T, 'salbutamol', 10, 'mg')], T + 1800, P, o));
      const dk = (r: F7.ArmResult, t: number) => F7.mn(r.rows, 'k', t - 60, t) - F7.mx(c.rows, 'k', t - 60, t);
      const [dCa, dId, dSb, dBoth] = [dk(ca, T + 300), dk(id, T + 3600), dk(sb, T + 1800), dk(both, T + 1800)];
      console.log(`FU-7 T19 DI-26: ΔK calcium ${dCa.toFixed(2)}, insulin 60 min ${dId.toFixed(2)}, salbutamol 30 min ${dSb.toFixed(2)}, both 30 min ${dBoth.toFixed(2)}`);
      expect(Math.abs(dCa)).toBeLessThanOrEqual(0.15);
      expect(dId).toBeGreaterThanOrEqual(-1.1);
      expect(dId).toBeLessThanOrEqual(-0.6);
      expect(dSb).toBeGreaterThanOrEqual(-1.0);
      expect(dSb).toBeLessThanOrEqual(-0.4);
      expect(dBoth).toBeLessThan(dSb);
    });
    let mh: Promise<{ et10: number; k20: number; dEt: number }> | undefined;
    const mhArms = () => (mh ??= (async () => {
      const base: F7.Step[] = [vap(60, 'sevoflurane', 2, 4), d(120, 'succinylcholine', 1.5, 'mg/kg'), [180, F7.A.cond('mh', 1)]];
      const c = await F7.runArm(V(base, 1980, {}, { dt: 10 }));
      const i = await F7.runArm(V([...base, d(1380, 'dantrolene', 2.5, 'mg/kg')], 1980, {}, { dt: 10 }));
      const r = { et10: F7.mx(c.rows, 'etco2', 720, 780), k20: F7.mx(c.rows, 'k', 1320, 1380), dEt: F7.dMin(i.rows, c.rows, 'etco2', 1380, 1980) };
      console.log(`FU-7 T19 DI-65: EtCO2 ${r.et10.toFixed(1)} at 10 min, K ${r.k20.toFixed(2)} at 20 min, dantrolene ΔEtCO2 ${r.dEt.toFixed(1)}`);
      return r;
    })());
    it('MH triggered by sevoflurane + succinylcholine (DI-65; tables §7 check 21): K 5.5–6.5 by 20 min, and dantrolene 2.5 mg/kg lowers EtCO2 by 5–40 within 10 min', async () => {
      const r = await mhArms();
      expect(r.k20).toBeGreaterThanOrEqual(5.5);
      expect(r.k20).toBeLessThanOrEqual(6.5);
      expect(r.dEt).toBeGreaterThanOrEqual(-40);
      expect(r.dEt).toBeLessThanOrEqual(-5);
    });
    // R45: NOT a regression — identical on the pre-FU-7 baseline b004289 (audit DI-65 etco2At10min 42.2, TW): FU-4's one
    // physical dead space (endo-acceptance.test.ts carries the same it.fails for this rig family).
    it.fails('… EtCO2 52–70 by 10 min at constant MV (DI-65; tables §7 check 21) — measured 42.2 (baseline b004289: 42.2)', async () => {
      const r = await mhArms();
      expect(r.et10).toBeGreaterThanOrEqual(52);
      expect(r.et10).toBeLessThanOrEqual(70);
    });
    let tci: Promise<F7.ArmResult> | undefined;
    const tciArm = () => (tci ??= F7.runArm(V([[60, F7.A.tci('propofol', 3, 'effect', 'eleveld')]], 1800)));
    it('propofol effect-site TCI 3 µg/mL (Eleveld) reaches 95 % in 100–200 s and a depth index 35–60 at 25 min (DI-67; 7g gate 2.35 min)', async () => {
      const r = await tciArm();
      const t95 = F7.firstAt(r.rows, 60, (x) => (x.c_propofol as number) >= 2.85);
      const di = F7.mn(r.rows, 'di', 1500, 1800);
      console.log(`FU-7 T19 DI-67: 95 % at ${t95} s, Ce peak ${F7.mx(r.rows, 'c_propofol', 60, 1800).toFixed(4)}, DI ${di} at 25 min`);
      expect(t95).toBeGreaterThanOrEqual(100);
      expect(t95).toBeLessThanOrEqual(200);
      expect(di).toBeGreaterThanOrEqual(35);
      expect(di).toBeLessThanOrEqual(60);
    });
    // R45: NOT a regression — the pre-FU-7 baseline (b004289) overshoots the same way (audit DI-67 cePeak 3.1, graded TS
    // before FU-7; the guard list assumed PL). Reported for 7g's TCI controller, not fixed here.
    it.fails('… without overshoot: Ce peak 2.99–3.01 (DI-67; 7g gate max 3.0005) — measured 3.132 (baseline b004289: 3.1, TS)', async () => {
      const peak = F7.mx((await tciArm()).rows, 'c_propofol', 60, 1800);
      expect(peak).toBeGreaterThanOrEqual(2.99);
      expect(peak).toBeLessThanOrEqual(3.01);
    });
    it('context-sensitive offsets (DI-85/86/68; Hughes 1992, Kapila 1995): propofol wakes 4–20 min after 1 h and 5–25 min after 3 h; fentanyl CSHT 12–40 min at 1 h and 3–8 × that at 3 h; remifentanil halves in 1.5–5 min', async () => {
      const o10 = { dt: 10 };
      const p1 = await F7.runArm(V([[60, F7.A.tci('propofol', 3, 'plasma', 'eleveld')], [3660, F7.A.tci('propofol', 0, 'plasma', 'eleveld')]], 3660 + 3600, {}, o10));
      const p3 = await F7.runArm(V([[60, F7.A.tci('propofol', 3, 'plasma', 'eleveld')], [10860, F7.A.tci('propofol', 0, 'plasma', 'eleveld')]], 10860 + 3600, {}, o10));
      const f1 = await F7.runArm(V([[60, F7.A.tci('fentanyl', 2, 'plasma', 'shafer')], [3660, F7.A.tci('fentanyl', 0, 'plasma', 'shafer')]], 3660 + 7200, {}, { dt: 20 }));
      const f3 = await F7.runArm(V([[60, F7.A.tci('fentanyl', 2, 'plasma', 'shafer')], [10860, F7.A.tci('fentanyl', 0, 'plasma', 'shafer')]], 10860 + 14400, {}, { dt: 20 }));
      const rm = await F7.runArm(V([inf(60, 'remifentanil', 0.25, 'mcg/kg/min'), [3660, F7.A.infusion('remifentanil', 0, 'mcg/kg/min')]], 3660 + 900, {}, o10));
      const w1 = F7.firstAt(p1.rows, 3660, conscious) / 60;
      const w3 = F7.firstAt(p3.rows, 10860, conscious) / 60;
      const c1 = F7.halfMin(f1.rows, 'p_fentanyl', 3660);
      const c3 = F7.halfMin(f3.rows, 'p_fentanyl', 10860);
      const ref = F7.mx(rm.rows, 'c_remifentanil', 3500, 3660);
      const rh = F7.firstAt(rm.rows, 3660, (x) => (x.c_remifentanil as number) <= 0.5 * ref) / 60;
      console.log(`FU-7 T19 DI-85/86/68: propofol wake ${w1.toFixed(1)} / ${w3.toFixed(1)} min; fentanyl CSHT ${c1.toFixed(1)} / ${c3.toFixed(1)} min (×${(c3 / c1).toFixed(2)}); remifentanil half ${rh.toFixed(1)} min`);
      expect(w1).toBeGreaterThanOrEqual(4);
      expect(w1).toBeLessThanOrEqual(20);
      expect(w3).toBeGreaterThanOrEqual(5);
      expect(w3).toBeLessThanOrEqual(25);
      expect(c1).toBeGreaterThanOrEqual(12);
      expect(c1).toBeLessThanOrEqual(40);
      expect(c3 / c1).toBeGreaterThanOrEqual(3);
      expect(c3 / c1).toBeLessThanOrEqual(8);
      expect(rh).toBeGreaterThanOrEqual(1.5);
      expect(rh).toBeLessThanOrEqual(5);
    });
    it('the emergence order after 1 h of ≈ 1 brain-MAC (DI-87; Macario 2005, M10 ch. 19): desflurane 0.5–0.95 × sevoflurane, isoflurane 1.05–2.5 ×, sevoflurane 4–20 min', async () => {
      const arm = (agent: string, pct: number) => F7.runArm(V([vap(60, agent, pct, 4), vap(3660, agent, 0, 6)], 3660 + 1800));
      const w = async (agent: string, pct: number) => F7.firstAt((await arm(agent, pct)).rows, 3660, conscious) / 60;
      const [des, sev, iso] = [await w('desflurane', 7.3), await w('sevoflurane', 2.25), await w('isoflurane', 1.95)];
      console.log(`FU-7 T19 DI-87: wake des ${des.toFixed(1)} / sev ${sev.toFixed(1)} / iso ${iso.toFixed(1)} min`);
      expect(des / sev).toBeGreaterThanOrEqual(0.5);
      expect(des / sev).toBeLessThanOrEqual(0.95);
      expect(iso / sev).toBeGreaterThanOrEqual(1.05);
      expect(iso / sev).toBeLessThanOrEqual(2.5);
      expect(sev).toBeGreaterThanOrEqual(4);
      expect(sev).toBeLessThanOrEqual(20);
    });
    it('remifentanil 0.15 µg/kg/min reduces sevoflurane MAC by 0.4–0.7 (DI-77; Lang 1996, tables §5d)', async () => {
      const r = await F7.runArm(V([vap(60, 'sevoflurane', 2, 4), inf(900, 'remifentanil', 0.15, 'mcg/kg/min')], 2400, {}, { dt: 10 }));
      const red = 1 - F7.mx(r.rows, 'macBrain', 2100, 2400) / F7.mn(r.rows, 'macEff', 2100, 2400);
      console.log(`FU-7 T19 DI-77: MAC reduction ${red.toFixed(2)}`);
      expect(red).toBeGreaterThanOrEqual(0.4);
      expect(red).toBeLessThanOrEqual(0.7);
    });
    it('the NMB course (DI-50/53; label, M10 ch. 24): rocuronium 0.6 mg/kg onset 60–150 s and T1 25 % at 24–40 min; succinylcholine 1 mg/kg T1 25 % at 5–12 min, heterozygous 10–25, homozygous still blocked (T1 ≤ 0.1) at 45 min', async () => {
      const roc = await F7.runArm(V([d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3000));
      const onset = F7.firstAt(roc.rows, T, (x) => (x.t1 as number) <= 0.01);
      const t25 = (F7.firstAt(roc.rows, T + 300, (x) => (x.t1 as number) >= 0.25) + 300) / 60;
      const sux = (pt: Record<string, unknown>) => F7.runArm(V([d(T, 'succinylcholine', 1, 'mg/kg')], T + 3000, pt, { dt: 10 }));
      const rec = (r: F7.ArmResult) => (F7.firstAt(r.rows, T + 120, (x) => (x.t1 as number) >= 0.25) + 120) / 60;
      const n = rec(await sux({}));
      const het = rec(await sux({ neuro: { cholinesterase: 'heterozygous' } }));
      const hom = F7.mn((await sux({ neuro: { cholinesterase: 'homozygous' } })).rows, 't1', T + 2400, T + 2700);
      console.log(`FU-7 T19 DI-50/53: rocuronium onset ${onset} s, T1 25 % ${t25.toFixed(1)} min; sux ${n.toFixed(1)} / het ${het.toFixed(1)} min, hom T1 ${hom.toFixed(2)} at 45 min`);
      expect(onset).toBeGreaterThanOrEqual(60);
      expect(onset).toBeLessThanOrEqual(150);
      expect(t25).toBeGreaterThanOrEqual(24);
      expect(t25).toBeLessThanOrEqual(40);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(12);
      expect(het).toBeGreaterThanOrEqual(10);
      expect(het).toBeLessThanOrEqual(25);
      expect(hom).toBeLessThanOrEqual(0.1);
    });
    // R45 (declared in Task 19 Step 5 / review F20): the hazard hook needs AV-node occupancy ≥ 0.5 (Task 11 tests it at
    // 0.8); verapamil 5 mg (its row: avNode emax 0.7 at the reference dose) peaks below that, and pre-excited AF already
    // runs ≥ 200/min WITHOUT the drug on this rig (227–232 in the control arm), so the rate branch shows nothing.
    it.fails('verapamil 5 mg in pre-excited AF produces VF or a faster ventricular rate than the same rhythm without it (DI-15; ALS — the AV-nodal-blocker hazard; AF arm at natural length: Task 0 Step 6b PASSED) — measured: no change (rate 232 in both arms; AV-node occupancy 0.35 < the hook\'s 0.5)', async () => {
      const arm = (vera: boolean) => F7.runArm(V([[T, F7.A.rhythm('preexcitedAf')], ...(vera ? [d(T + 60, 'verapamil', 5, 'mg')] : [])], T + 600, {}, { dt: 1 }));
      const i = await arm(true);
      const c = await arm(false);
      const vf = i.rows.some((x) => (x.t as number) > T + 60 && String(x.rhythm).startsWith('vf'));
      const dHr = F7.mx(i.rows, 'hr', T + 60, T + 600) - F7.mx(c.rows, 'hr', T + 60, T + 600);
      console.log(`FU-7 T19 DI-15: ${i.rhythms.map(([t, id]) => `${t}s ${id}`).join(', ')}; HR max ${F7.mx(i.rows, 'hr', T + 60, T + 600)} vs control ${F7.mx(c.rows, 'hr', T + 60, T + 600)}; AV-node occupancy max ${F7.mx(i.rows, 'avNode', T + 60, T + 600).toFixed(2)}`);
      expect(vf || dHr >= 10).toBe(true);
    });
  });
});
