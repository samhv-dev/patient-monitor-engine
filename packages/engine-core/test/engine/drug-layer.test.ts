// FU-7 drug-layer engine cases (Task 16's histamine cases; Task 19 adds the flipped matrix cells). The audit's
// ventilated rig (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5) unless a case says otherwise; one yield per sim-MINUTE. SLOW_A.
import { describe, expect, it, vi } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';
import * as F7 from '../helpers/fu7.ts';
import { createHookState, rhythmRequest } from '../../src/l2/pk/hooks.ts';
import type { PkState } from '../../src/l2/pk/pipeline.ts';
import { seedStream } from '../../src/rng/sfc32.ts';
import { outcomeProbabilities, type ShockContext } from '../../src/l3/defib-pacer/outcome.ts';

// FU-7 Task 19 case 5: every shock's context is captured on its way into the real draw (the outcome module passes through).
const SHOCKS = vi.hoisted(() => [] as ShockContext[]);
vi.mock('../../src/l3/defib-pacer/outcome.ts', async (orig) => {
  const m = await orig<typeof import('../../src/l3/defib-pacer/outcome.ts')>();
  return { ...m, drawOutcome: (c: ShockContext, rng: Parameters<typeof m.drawOutcome>[1]) => { SHOCKS.push(c); return m.drawOutcome(c, rng); } };
});

type Ev = Record<string, unknown>;
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });
interface Row { t: number; map: number; hr: number; svr: number }
function sample(e: MonitorEngine, t: number): Row {
  const c = st6(e).hemo.circ;
  const bs = c.beats.filter((b: { t: number }) => b.t > t - 6);
  return { t, map: bs.length ? bs.reduce((a: number, b: { map: number }) => a + b.map, 0) / bs.length : (c.s[0] as number), hr: c.hrModel as number, svr: c.p.rSys as number };
}
async function vented(steps: [number, Ev][], tEnd: number): Promise<Row[]> {
  const e = rig6(undefined, 'modeled', 7);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  const q = [...steps];
  const rows: Row[] = [];
  await runTo(e, tEnd, (u) => { while (q.length && q[0]![0] <= u) send(e, q.shift()![1]); rows.push(sample(e, u)); }, 5);
  return rows;
}
const at = (r: Row[], t: number) => r.find((x) => x.t >= t)!;
const pctMin = (i: Row[], c: Row[], k: 'map' | 'svr', t0: number, t1: number) =>
  Math.min(...i.filter((r) => r.t >= t0 && r.t <= t1).map((r) => (100 * (r[k] - at(c, r.t)[k])) / at(c, r.t)[k]));
const dMax = (i: Row[], c: Row[], k: 'hr', t0: number, t1: number) => Math.max(...i.filter((r) => r.t >= t0 && r.t <= t1).map((r) => r[k] - at(c, r.t)[k]));

describe('FU-7 drug layer through the engine', { timeout: 1_800_000 }, () => {
  describe('Task 16: histamine release acts (R51 addendum 24 / audit D15)', () => {
    /** DI-42's rig: fast morphine 10 mg at 300 s vs the same arm without it, over 15 min. */
    const morphine = async () => {
      const i = await vented([[300, drug('morphine', 10, 'mg')]], 1200);
      const c = await vented([], 1200);
      return { svr: pctMin(i, c, 'svr', 300, 1200), map: pctMin(i, c, 'map', 300, 1200), hr: dMax(i, c, 'hr', 300, 1200) };
    };
    let mo: Promise<{ svr: number; map: number; hr: number }> | undefined;
    it('fast morphine 10 mg drops SVR 10–20 % with a reflex HR rise of +3 to +25 (DI-42; M10 ch. 22)', async () => {
      const r = await (mo ??= morphine());
      console.log(`FU-7 T16 DI-42: morphine 10 mg SVR ${r.svr.toFixed(1)} %, MAP ${r.map.toFixed(1)} %, HR +${r.hr.toFixed(1)}`);
      expect(r.svr).toBeLessThanOrEqual(-10);
      expect(r.svr).toBeGreaterThanOrEqual(-20);
      expect(r.hr).toBeGreaterThanOrEqual(3);
      expect(r.hr).toBeLessThanOrEqual(25);
    });
    // R45 (Task 16 UNPROTOTYPED): HIST_SVR 0.22 is the plan's size; the reflex tachycardia (+20.6) buffers the pressure.
    it.fails('… and MAP by 8–25 % (T6.3; DI-42) — measured −5.6 % (SVR −10.2 %, HR +20.6: the reflex holds the pressure)', async () => {
      const r = await (mo ??= morphine());
      expect(r.map).toBeLessThanOrEqual(-8);
      expect(r.map).toBeGreaterThanOrEqual(-25);
    });
    /** FU-6's ventilated bronchospasm rig (unlimited, pmax 80) at a MODERATE spasm (severity 0.5: 1.0 is the resolver's
     * cap, so an added drug severity could not show), the NMB at 900 s, salbutamol 250 µg at 1200 s. */
    async function spasm(nmb: Ev, salbutamol: boolean) {
      const e = rig6();
      await ventRig(e, { pmax: 80 });
      await runTo(e, 600);
      send(e, { kind: 'lungCondition', id: 'bronchospasm', severity: 0.5 });
      await runTo(e, 840);
      const before = (await fineWindow(e, 900)).peak;
      send(e, nmb);
      await runTo(e, 1020);
      const after = (await fineWindow(e, 1080)).peak;
      if (salbutamol) send(e, drug('salbutamol', 250, 'mcg'));
      await runTo(e, 1740);
      const late = (await fineWindow(e, 1800)).peak;
      return { before, after, late };
    }
    it('atracurium 0.5 mg/kg in a patient with bronchospasm worsens Ppeak by ≥ 3 cmH2O, and salbutamol reverses it', async () => {
      const r = await spasm(drug('atracurium', 0.5, 'mg/kg'), true);
      console.log(`FU-7 T16: atracurium Ppeak ${r.before.toFixed(1)} → ${r.after.toFixed(1)} → salbutamol ${r.late.toFixed(1)}`);
      expect(r.after - r.before).toBeGreaterThanOrEqual(3);
      expect(r.late).toBeLessThan(r.before);
    });
    it('cisatracurium does not (the teaching contrast): Ppeak within 1 cmH2O', async () => {
      const r = await spasm(drug('cisatracurium', 0.2, 'mg/kg'), false);
      console.log(`FU-7 T16: cisatracurium Ppeak ${r.before.toFixed(1)} → ${r.after.toFixed(1)}`);
      expect(Math.abs(r.after - r.before)).toBeLessThanOrEqual(1);
    });
  });

  describe('Task 17 Step 4a: nitroprusside in the failing ventricle (research/19 CM-06e rig)', () => {
    /** hfref 60 y / 80 kg, ventilated; nitroprusside 1 µg/kg/min from 300 s for 20 min vs the same patient without it. */
    async function hf(withSnp: boolean) {
      const e = rig6({ ageY: 60, weightKg: 80, heightCm: 175, sex: 'M', conditions: [{ id: 'hfref' }] } as never, 'modeled', 7);
      await runTo(e, 1);
      send(e, { kind: 'airwayDevice', device: 'ett' });
      send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
      const rows: { t: number; map: number; sv: number }[] = [];
      let started = false;
      await runTo(e, 1500, (u) => {
        if (withSnp && u >= 300 && !started) { started = true; send(e, { kind: 'infusion', drugId: 'nitroprusside', rate: 1, unit: 'mcg/kg/min' }); }
        const c = st6(e).hemo.circ;
        const bs = c.beats.filter((b: { t: number }) => b.t > u - 6);
        const avg = (k: string) => bs.reduce((a: number, b: Record<string, number>) => a + b[k]!, 0) / Math.max(1, bs.length);
        rows.push({ t: u, map: avg('map'), sv: avg('sv') });
      }, 5);
      return rows;
    }
    // R45 (CM amendment, finding 2): the row's sizes are not raised to force it — the missing SV is the failing
    // ventricle's afterload sensitivity, 7a's gap (research/19 C9).
    it.fails('SV rises ≥ 8 % while MAP falls ≤ 15 % (Cohn & Franciosa 1977) — measured SV +1.2 %, MAP −12.8 % (hydralazine on the same rig: SV +0.1 %); 7a afterload sensitivity (research/19 C9)', async () => {
      const i = await hf(true);
      const c = await hf(false);
      const w = i.filter((r) => r.t >= 300);
      const sv = Math.max(...w.map((r) => (100 * (r.sv - c.find((x) => x.t === r.t)!.sv)) / c.find((x) => x.t === r.t)!.sv));
      const map = Math.min(...w.map((r) => (100 * (r.map - c.find((x) => x.t === r.t)!.map)) / c.find((x) => x.t === r.t)!.map));
      console.log(`FU-7 T17 CM-06e twin: nitroprusside in HFrEF SV +${sv.toFixed(1)} %, MAP ${map.toFixed(1)} %`);
      expect(sv).toBeGreaterThanOrEqual(8);
      expect(map).toBeGreaterThanOrEqual(-15);
    });
  });
});

// ---- FU-7 Task 19 (R54): the flipped matrix cells as engine tests -------------------------------------------------------
// The drug audit's rigs (research/14 §1) through `helpers/fu7.ts`: adult 40 y / 70 kg / 175 cm, male, ABP/CVP/PAP/SpO2/
// CO2/temp on, seed 7; "vent" = ETT + VCV 12 × 600, PEEP 5, FiO2 0.5 from t = 1 s; interventions at T = 300 s. Every band
// carries its source in the title. Task 0 Step 6b PASSED (CM-15c kIschMin40 0.90), so the AF arms run at their natural
// length (case 8). Cells another FU-7 engine file already holds are not run twice: DI-42 (Task 16 above), DI-70
// (fu7-volatile.test.ts), DI-71's VE / DI-03 / DI-89 (drug-apnoea.test.ts), Task 10's surge (stimulus-surge.test.ts).
const conscious = (r: F7.Row) => r.conscious === true;
const unconscious = (r: F7.Row) => r.conscious === false;

describe('FU-7 Task 19: the flipped matrix cells (R54)', { timeout: 3_600_000 }, () => {
  const { T, V, SP, d, inf, vap, A } = F7;

  describe('addendum 19: onset', () => {
    it('atropine 0.5 mg peaks at 10–180 s (DI-63; tables §6.2: onset < 1 min) and glycopyrrolate 0.4 mg at 60–600 s (onset 2–3 min)', async () => {
      const a = await F7.runArm(V([d(T, 'atropine', 0.5, 'mg')], T + 1200, {}, { dt: 10 }));
      const g = await F7.runArm(V([d(T, 'glycopyrrolate', 0.4, 'mg')], T + 1200, {}, { dt: 10 }));
      const ta = F7.peakT(a.rows, 'hr', T, T + 600);
      const tg = F7.peakT(g.rows, 'hr', T, T + 1200);
      console.log(`FU-7 T19 DI-63: HR peak atropine +${ta} s, glycopyrrolate +${tg} s`);
      expect(ta).toBeGreaterThanOrEqual(10);
      expect(ta).toBeLessThanOrEqual(180);
      expect(tg).toBeGreaterThanOrEqual(60);
      expect(tg).toBeLessThanOrEqual(600);
    });
    it('naloxone 0.4 mg reverses an opioid within 30–180 s (DI-71; label, M10 ch. 22): the opioid drive depression halves', async () => {
      const i = await F7.runArm(SP([d(T, 'fentanyl', 5, 'mcg/kg'), d(T + 300, 'naloxone', 0.4, 'mg')], T + 900));
      const c = await F7.runArm(SP([d(T, 'fentanyl', 5, 'mcg/kg')], T + 900));
      const ref = F7.mx(c.rows, 'drvOp', T + 300, T + 600);
      const s = F7.firstAt(i.rows, T + 300, (r) => (r.drvOp as number) < 0.5 * ref);
      console.log(`FU-7 T19 DI-71: naloxone halves the opioid drive depression (${ref.toFixed(2)}) at +${s} s`);
      expect(s).toBeGreaterThanOrEqual(30);
      expect(s).toBeLessThanOrEqual(180);
    });
  });

  describe('addendum 20: hypnotic potency', () => {
    const arms: Record<string, Promise<F7.ArmResult>> = {};
    const arm = (k: string, id: string, dose: number, sp = false) =>
      (arms[k] ??= F7.runArm((sp ? SP : V)([d(T, id, dose, 'mg/kg')], T + 1500, {}, { dt: 1 })));
    const loc = (r: F7.ArmResult) => F7.firstAt(r.rows, T, unconscious);
    const wake = (r: F7.ArmResult) => F7.firstAt(r.rows, T + loc(r), conscious) + loc(r);
    const apnoeicWhileOut = (r: F7.ArmResult) => r.rows.some((x) => (x.t as number) > T && x.conscious === false && x.apnoea === true);
    it('thiopental 4 mg/kg: awake at 240–900 s (DI-69; M10 Table 21.1: redistribution), apnoeic while unconscious', async () => {
      const r = await arm('t', 'thiopental', 4);
      console.log(`FU-7 T19 DI-69 thiopental: LOC +${loc(r)} s, awake +${wake(r)} s, apnoea while out ${apnoeicWhileOut(r)}`);
      expect(wake(r)).toBeGreaterThanOrEqual(240);
      expect(wake(r)).toBeLessThanOrEqual(900);
      expect(apnoeicWhileOut(r)).toBe(true);
    });
    // R45: the plan's own prototype table gives thiopental LOC +10 s with no LOC band (Task 5: "+10 s / 360 s"); the
    // 20–60 s band appears only in Task 19's list. The chain is not slowed to meet it.
    it.fails('thiopental 4 mg/kg: unconscious within 20–60 s (DI-69; one arm–brain circulation) — measured +10 s (Task 5 prototype +10 s)', async () => {
      const r = await arm('t', 'thiopental', 4);
      expect(loc(r)).toBeGreaterThanOrEqual(20);
      expect(loc(r)).toBeLessThanOrEqual(60);
    });
    it('etomidate 0.3 mg/kg: 150–600 s of unconsciousness (DI-69; M10 ch. 21 p. 541), apnoeic while unconscious', async () => {
      const r = await arm('e', 'etomidate', 0.3);
      const dur = wake(r) - loc(r);
      console.log(`FU-7 T19 DI-69 etomidate: LOC +${loc(r)} s, duration ${dur} s, apnoea while out ${apnoeicWhileOut(r)}`);
      expect(dur).toBeGreaterThanOrEqual(150);
      expect(dur).toBeLessThanOrEqual(600);
      expect(apnoeicWhileOut(r)).toBe(true);
    });
    it('ketamine 1.5 mg/kg: unconscious with a depth index > 60 (the dissociative paradox, D3) and emerging at 10–20 min (M10 Table 21.1; D20 measured 11.9)', async () => {
      const r = await arm('k', 'ketamine', 1.5);
      const out = r.rows.filter((x) => (x.t as number) > T && x.conscious === false);
      const diMin = Math.min(...out.map((x) => x.di as number));
      console.log(`FU-7 T19 DI-69 ketamine: LOC +${loc(r)} s, emerges ${(wake(r) / 60).toFixed(1)} min, DI min while out ${diMin}`);
      expect(out.length).toBeGreaterThan(0);
      expect(diMin).toBeGreaterThan(60);
      expect(wake(r) / 60).toBeGreaterThanOrEqual(10);
      expect(wake(r) / 60).toBeLessThanOrEqual(20);
    });
    // R45 (D20, named in advance): ketamine's arm–brain onset is faster than the label's 30–60 s on this chain.
    it.fails('ketamine 1.5 mg/kg loses consciousness no faster than 30 s (M10 Table 21.1) — measured 16 s at 1 s sampling (D20: 20 s at the audit\'s 5 s)', async () => {
      const r = await arm('k', 'ketamine', 1.5);
      expect(loc(r)).toBeGreaterThanOrEqual(30);
    });
    it('midazolam 0.05 mg/kg reaches its depth nadir at 120–420 s (DI-88; M10 ch. 21 p. 532: peak 3–5 min; measured 190 s)', async () => {
      const r = await arm('z', 'midazolam', 0.05, true);
      const tn = F7.minT(r.rows, 'di', T, T + 900);
      console.log(`FU-7 T19 DI-88 midazolam: DI nadir at +${tn} s`);
      expect(tn).toBeGreaterThanOrEqual(120);
      expect(tn).toBeLessThanOrEqual(420);
    });
    /** The smallest bolus (geometric bisection, 9 steps over [lo, hi] mg/kg) that sets `conscious` false within 10 min. */
    async function locDose(id: string, ageY: number, lo: number, hi: number): Promise<number> {
      for (let i = 0; i < 9; i++) {
        const mid = Math.sqrt(lo * hi);
        let out = false;
        await F7.runArm(V([d(T, id, mid, 'mg/kg')], T + 600, { ageY }, { each: (_s: unknown, _t: number, row: F7.Row) => (out = row.conscious === false) }));
        if (out) hi = mid; else lo = mid;
      }
      return hi;
    }
    it('the elderly arm (review F5, D19a): at 80 y midazolam needs 0.4–0.6 × the 35-y LOC dose (M10 ch. 21: 20–50 % less) and thiopental 0.6–0.8 × (Homer & Stanski 1985)', async () => {
      const mz = [await locDose('midazolam', 35, 0.01, 0.3), await locDose('midazolam', 80, 0.01, 0.3)];
      const th = [await locDose('thiopental', 35, 0.5, 5), await locDose('thiopental', 80, 0.5, 5)];
      console.log(`FU-7 T19 F5: LOC dose midazolam ${mz[0]!.toFixed(3)} → ${mz[1]!.toFixed(3)} mg/kg (${(mz[1]! / mz[0]!).toFixed(2)}), thiopental ${th[0]!.toFixed(2)} → ${th[1]!.toFixed(2)} (${(th[1]! / th[0]!).toFixed(2)})`);
      expect(mz[1]! / mz[0]!).toBeGreaterThanOrEqual(0.4);
      expect(mz[1]! / mz[0]!).toBeLessThanOrEqual(0.6);
      expect(th[1]! / th[0]!).toBeGreaterThanOrEqual(0.6);
      expect(th[1]! / th[0]!).toBeLessThanOrEqual(0.8);
    });
  });

  describe('addendum 21: β-blockade', () => {
    const BB = F7.BB;
    let eph: Promise<{ xa: number; xaPct: number; bb: number }> | undefined;
    const ephedrine = () => (eph ??= (async () => {
      const ri = await F7.runArm(V([d(T, 'ephedrine', 10, 'mg')]));
      const rc = await F7.runArm(V([]));
      const i = await F7.runArm(V([d(T, 'ephedrine', 10, 'mg')], T + 900, BB));
      const c = await F7.runArm(V([], T + 900, BB));
      return { xa: F7.dMax(ri.rows, rc.rows, 'map', T, T + 600), xaPct: F7.pctMax(ri.rows, rc.rows, 'map', T, T + 600), bb: F7.pctMax(i.rows, c.rows, 'map', T, T + 600) };
    })());
    it('ephedrine 10 mg raises MAP 8–25 mmHg (T6.2; DI-04a)', async () => {
      const r = await ephedrine();
      console.log(`FU-7 T19 DI-04a: ephedrine ΔMAP +${r.xa.toFixed(1)} mmHg (+${r.xaPct.toFixed(1)} %), β-blocked +${r.bb.toFixed(1)} % → ratio ${(r.bb / r.xaPct).toFixed(2)}`);
      expect(r.xa).toBeGreaterThanOrEqual(8);
      expect(r.xa).toBeLessThanOrEqual(25);
    });
    // R45 (Q1, named in advance): occupancy shifts the β limb, but ephedrine's MAP rise is its α/indirect limb.
    it.fails('ephedrine\'s pressor rise under chronic β-blockade is 0.3–0.7 × the healthy rise (tables §1.5 / §7 17b; DI-04a) — measured 0.99', async () => {
      const r = await ephedrine();
      expect(r.bb / r.xaPct).toBeGreaterThanOrEqual(0.3);
      expect(r.bb / r.xaPct).toBeLessThanOrEqual(0.7);
    });
    it('dobutamine 5 µg/kg/min in the β-blocked profile reaches ≤ 0.8 × the healthy CO rise (DI-83; M10 ch. 14: competitive shift)', async () => {
      const x = await F7.runArm(V([inf(T, 'dobutamine', 5, 'mcg/kg/min')]));
      const xc = await F7.runArm(V([]));
      const b = await F7.runArm(V([inf(T, 'dobutamine', 5, 'mcg/kg/min')], T + 900, BB));
      const bc = await F7.runArm(V([], T + 900, BB));
      const xa = F7.pctWin(x.rows, xc.rows, 'co', T + 480, T + 900);
      const bb = F7.pctWin(b.rows, bc.rows, 'co', T + 480, T + 900);
      console.log(`FU-7 T19 DI-83: dobutamine CO +${xa.toFixed(1)} % healthy, +${bb.toFixed(1)} % β-blocked → ratio ${(bb / xa).toFixed(2)}`);
      expect(bb / xa).toBeLessThanOrEqual(0.8);
    });
    let adr: Promise<{ excess: number; hrMinBB: number }> | undefined;
    const adrenaline = () => (adr ??= (async () => {
      const nonSel = (st: { hemo: { circ: { prof: { betaNonSel: boolean } } } }) => { st.hemo.circ.prof.betaNonSel = true; }; // no command sets it (profile.ts: Q1)
      const i = await F7.runArm(V([d(T, 'epinephrine', 100, 'mcg')], T + 600, BB, { prep: nonSel }));
      const c = await F7.runArm(V([], T + 600, BB, { prep: nonSel }));
      const ri = await F7.runArm(V([d(T, 'epinephrine', 100, 'mcg')], T + 600));
      const rc = await F7.runArm(V([], T + 600));
      return { excess: F7.pctMax(i.rows, c.rows, 'map', T, T + 300) - F7.pctMax(ri.rows, rc.rows, 'map', T, T + 300), hrMinBB: F7.dMin(i.rows, c.rows, 'hr', T, T + 300) };
    })());
    it('adrenaline 100 µg under NON-SELECTIVE blockade gives a LARGER pressor response than under none (DI-05; M10 ch. 14: unopposed α)', async () => {
      const r = await adrenaline();
      console.log(`FU-7 T19 DI-05: adrenaline pressor excess under non-selective blockade +${r.excess.toFixed(1)} %, HR min Δ ${r.hrMinBB.toFixed(1)}`);
      expect(r.excess).toBeGreaterThan(0);
    });
    // R45 (Task 8 Step 6, named in advance): the β1 residual chronotropy outweighs the vagal limb (t8-vagal: ΔHR +5.7).
    it.fails('… with a reflex bradycardia (M10 ch. 14) — measured HR never below the control arm (min Δ +1)', async () => {
      const r = await adrenaline();
      expect(r.hrMinBB).toBeLessThan(0);
    });
  });

  describe('addendum 23: antiarrhythmics', () => {
    // R45: the shock-state factor reaches × 1.2 at full occupancy (test/l3/shock-state.test.ts), but under CPR the 300 mg
    // bolus occupies only 0.38 at the ALS shock 2 min later (0.57 at 4 min), and on seed 7 that first shock leaves no VF
    // for the second. The rig keeps ALS's timing; the factor is not raised (gate note §5).
    it.fails('amiodarone 300 mg during CPR raises the modelled shock success: the ROSC share of outcomeProbabilities through two shocks ≥ 1.2 × the no-drug share (ARREST 1999) — measured × 1.11 (0.072 vs 0.065; occupancy 0.38 at the shock)', async () => {
      /** VF at T, CPR (rate 110, quality 1) from T + 30, adrenaline 1 mg at T + 150, ± amiodarone 300 mg at T + 210; 200 J
       * shocks after one and two further 2-min CPR cycles (ALS 2021: T + 330, T + 450; CPR paused 2 s around each). The
       * context of every VF-class shock is captured. */
      const run = async (amio: boolean) => {
        const shock = (ts: number): F7.Step[] => [[ts - 9, F7.A.defib('charge', { energyJ: 200 })], [ts - 2, F7.A.cpr(false)], [ts, F7.A.defib('shock')], [ts + 2, F7.A.cpr(true)]];
        const from = SHOCKS.length;
        await F7.runArm(V([[T, F7.A.rhythm('vfCoarse')], [T + 30, F7.A.cpr(true)], d(T + 150, 'epinephrine', 1, 'mg'), ...(amio ? [d(T + 210, 'amiodarone', 300, 'mg')] : []),
          ...shock(T + 330), ...shock(T + 450)], T + 480));
        const vf = SHOCKS.slice(from).filter((c) => c.cls === 'vf');
        const p = vf.map((c) => outcomeProbabilities(c).rosc ?? 0);
        return { p, u: vf.map((c) => c.antiarrhythmicU ?? 0), share: 1 - p.reduce((a, x) => a * (1 - x), 1) };
      };
      const a = await run(true);
      const n = await run(false);
      console.log(`FU-7 T19 DI-13a: ROSC p per VF shock amiodarone ${a.p.map((x) => x.toFixed(3)).join('/')} (u ${a.u.map((x) => x.toFixed(2)).join('/')}) vs none ${n.p.map((x) => x.toFixed(3)).join('/')}; through two shocks ${a.share.toFixed(3)} vs ${n.share.toFixed(3)} (×${(a.share / n.share).toFixed(2)})`);
      expect(a.p.length).toBeGreaterThan(0);
      expect(a.share).toBeGreaterThanOrEqual(1.2 * n.share);
    });
    /** The engine's own PK through VT 150 (DI-61's rig) for PROCAMIO's 40 min window, with 200 seeded hazard runs evaluated
     * on its live PK state every second (`rhythmRequest`, one hook state and one `outcome` stream per seed). */
    async function vtShare(steps: F7.Step[]): Promise<number> {
      const N = 200;
      const hs = Array.from({ length: N }, () => createHookState());
      const rng = Array.from({ length: N }, (_, i) => seedStream(i + 1, 'outcome'));
      const done = new Array<boolean>(N).fill(false);
      await F7.runArm(V([[T, F7.A.rhythm('vtMono', { rateBpm: 150 })], ...steps], T + 60 + 2400, {}, {
        dt: 1,
        each: (st: { pk: PkState }, t: number) => {
          if (t <= T + 60) return;
          for (let i = 0; i < N; i++) if (!done[i] && rhythmRequest(st.pk, hs[i]!, { id: 'vtMono', pinned: false, pulseless: false }, t, rng[i])?.id === 'sinus') done[i] = true;
        },
      }));
      return done.filter(Boolean).length / N;
    }
    it('lidocaine 1.5 mg/kg or amiodarone 150 mg over 10 min converts stable VT in 20–35 % of 200 seeded runs over 40 min (PROCAMIO; Gorgels 1996) — measured amiodarone 20.5 %, lidocaine 11.5 % (its bolus level decays inside the window)', async () => {
      const l = await vtShare([d(T + 60, 'lidocaine', 1.5, 'mg/kg')]);
      const a = await vtShare([d(T + 60, 'amiodarone', 150, 'mg', { overS: 600 })]);
      console.log(`FU-7 T19 DI-61: VT conversion in 40 min, 200 seeds: lidocaine ${(100 * l).toFixed(1)} %, amiodarone ${(100 * a).toFixed(1)} %`);
      expect(Math.max(l, a)).toBeGreaterThanOrEqual(0.2);
      expect(Math.max(l, a)).toBeLessThanOrEqual(0.35);
    });
  });

  describe('addendum 24: interactions', () => {
    // R45: additivity itself holds exactly (interactions-misc.test.ts: the Hill of the summed fractions); on this rig the
    // bupivacaine arm alone already sits high on the steep (n = 3) Hill, so the lidocaine increment is small. The
    // audit's automatic PL (+0.1) is its one-decimal rounding of the two maxima before the subtraction.
    it.fails('LAST is additive (DI-23; ASRA 2020): lidocaine 1.5 mg/kg on top of bupivacaine 100 mg raises the CNS effect by > 0.02 — measured +0.014', async () => {
      const i = await F7.runArm(V([d(T, 'bupivacaine', 100, 'mg'), d(T + 120, 'lidocaine', 1.5, 'mg/kg')]));
      const b = await F7.runArm(V([d(T, 'bupivacaine', 100, 'mg')]));
      const ex = F7.mx(i.rows, 'lastCns', T + 120, T + 900) - F7.mx(b.rows, 'lastCns', T + 120, T + 900);
      console.log(`FU-7 T19 DI-23: CNS effect max both ${F7.mx(i.rows, 'lastCns', T + 120, T + 900).toFixed(3)} vs bupivacaine ${F7.mx(b.rows, 'lastCns', T + 120, T + 900).toFixed(3)}, excess +${ex.toFixed(3)}`);
      expect(ex).toBeGreaterThan(0.02);
    });
    // R45 (Task 15, named in advance): the one-way second-gas term is smaller than Epstein's.
    it.fails('second gas (DI-19; Epstein 1964, M10 ch. 19): 66 % N2O raises sevoflurane 2 %\'s FA/FI at 5 min by ≥ +0.03 — measured +0.014 in the engine (+0.021 in the 7g rig, Task 15)', async () => {
      const i = await F7.runArm(V([vap(60, 'sevoflurane', 2, 4, 0.66)], 400, {}, { dt: 10 }));
      const c = await F7.runArm(V([vap(60, 'sevoflurane', 2, 4, 0)], 400, {}, { dt: 10 }));
      const dlt = F7.mx(i.rows, 'faFi', 350, 370) - F7.mx(c.rows, 'faFi', 350, 370);
      console.log(`FU-7 T19 DI-19: second-gas FA/FI +${dlt.toFixed(3)} at 5 min`);
      expect(dlt).toBeGreaterThanOrEqual(0.03);
    });
    /** DI-90/DI-25's arms: rocuronium 0.6 mg/kg alone, after a magnesium sulfate load, with the Mg 2.5 profile, and that
     * profile + calcium chloride 1 g at T + 600; T1 25 % recovery in s from the dose. */
    let mg: Promise<{ c: number; drug: number; prof: number; ca: number }> | undefined;
    const mgArms = () => (mg ??= (async () => {
      const rec = (r: F7.ArmResult) => F7.firstAt(r.rows, T + 300, (x) => (x.t1 as number) >= 0.25) + 300;
      const o = { dt: 10 };
      const c = rec(await F7.runArm(V([d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, {}, o)));
      const drug = rec(await F7.runArm(V([d(T - 240, 'magnesium', 60, 'mg/kg', { overS: 180 }), d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, {}, o)));
      const prof = rec(await F7.runArm(V([[1, F7.A.neuroProfile({ mgMmolL: 2.5 })], d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, {}, o)));
      const ca = rec(await F7.runArm(V([[1, F7.A.neuroProfile({ mgMmolL: 2.5 })], d(T, 'rocuronium', 0.6, 'mg/kg'), d(T + 600, 'calciumChloride', 1, 'g')], T + 3600, {}, o)));
      console.log(`FU-7 T19 DI-90/25: T1 25 % at ${(c / 60).toFixed(1)} min; Mg drug +${((100 * (drug - c)) / c).toFixed(1)} %, Mg profile +${((100 * (prof - c)) / c).toFixed(1)} %, + calcium ${((ca - prof) / 60).toFixed(1)} min`);
      return { c, drug, prof, ca };
    })());
    it('magnesium potentiates rocuronium (DI-25; M10 ch. 24 p. 698): the Mg 2.5 profile prolongs T1 25 % by 20–90 %, and calcium shortens it', async () => {
      const r = await mgArms();
      expect((100 * (r.prof - r.c)) / r.c).toBeGreaterThanOrEqual(20);
      expect((100 * (r.prof - r.c)) / r.c).toBeLessThanOrEqual(90);
      expect(r.ca).toBeLessThan(r.prof);
    });
    // R45 (Task 14 Step 5, reported there): the two Mg paths agree at EQUAL blood Mg (fu7-nmb unit test, 1e-9), but the
    // 60 mg/kg load peaks at 2.1 mmol/L in 7c's blood and falls through the block, so the drug arm prolongs less.
    it.fails('a magnesium sulfate load 60 mg/kg prolongs rocuronium T1 25 % by 20–90 % (DI-90; M10 ch. 24 p. 698) — measured +12.0 % (blood Mg peak 2.1, falling; the profile Mg 2.5 gives +39.7 %)', async () => {
      const r = await mgArms();
      expect((100 * (r.drug - r.c)) / r.c).toBeGreaterThanOrEqual(20);
      expect((100 * (r.drug - r.c)) / r.c).toBeLessThanOrEqual(90);
    });
    it('denervation + succinylcholine 1.5 mg/kg raises K⁺ by 3–7 mmol/L (DI-37c; M10 ch. 24: the burns-size surge)', async () => {
      const i = await F7.runArm(V([[1, F7.A.neuroProfile({ nm: 'denervation' })], d(T, 'succinylcholine', 1.5, 'mg/kg')]));
      const c = await F7.runArm(V([[1, F7.A.neuroProfile({ nm: 'denervation' })]]));
      const dk = F7.mx(i.rows, 'k', T, T + 600) - F7.mn(c.rows, 'k', T - 60, T);
      console.log(`FU-7 T19 DI-37c: ΔK +${dk.toFixed(2)} mmol/L`);
      expect(dk).toBeGreaterThanOrEqual(3);
      expect(dk).toBeLessThanOrEqual(7);
    });
    it('dexamethasone 8 mg (+ ondansetron 4 mg) raises glucose 10–60 mg/dL over 30 min and HR stays within ±3 (DI-76; Hans 2006)', async () => {
      const i = await F7.runArm(V([d(T, 'dexamethasone', 8, 'mg'), d(T, 'ondansetron', 4, 'mg')], T + 1800, {}, { dt: 10 }));
      const c = await F7.runArm(V([], T + 1800, {}, { dt: 10 }));
      const dg = F7.mx(i.rows, 'glu', T, T + 1800) - F7.mx(c.rows, 'glu', T, T + 1800);
      const dh = Math.max(Math.abs(F7.dMax(i.rows, c.rows, 'hr', T, T + 1800)), Math.abs(F7.dMin(i.rows, c.rows, 'hr', T, T + 1800)));
      console.log(`FU-7 T19 DI-76: glucose +${dg.toFixed(1)} mg/dL, |ΔHR| ≤ ${dh.toFixed(1)}`);
      expect(dg).toBeGreaterThanOrEqual(10);
      expect(dg).toBeLessThanOrEqual(60);
      expect(dh).toBeLessThanOrEqual(3);
    });
    it('sugammadex 16 mg/kg 3 min after rocuronium 1.2 mg/kg lowers HR by 5–30 bpm (DI-45; MHRA/EMA, M10 ch. 24)', async () => {
      const i = await F7.runArm(V([d(T, 'rocuronium', 1.2, 'mg/kg'), d(T + 180, 'sugammadex', 16, 'mg/kg')]));
      const c = await F7.runArm(V([d(T, 'rocuronium', 1.2, 'mg/kg')]));
      const dh = F7.dMin(i.rows, c.rows, 'hr', T + 180, T + 480);
      console.log(`FU-7 T19 DI-45: sugammadex ΔHR ${dh}`);
      expect(dh).toBeLessThanOrEqual(-5);
      expect(dh).toBeGreaterThanOrEqual(-30);
    });
    it('atracurium 0.5 mg/kg leaves the TOF unchanged (declared v1 limitation: histamine release only, NO neuromuscular block) — TOF count 4 and ratio within 0.02 of baseline for 10 min, while MAP falls (review F12, D19f)', async () => {
      const i = await F7.runArm(V([d(T, 'atracurium', 0.5, 'mg/kg')], T + 600));
      const c = await F7.runArm(V([], T + 600));
      const w = i.rows.filter((r) => (r.t as number) > T);
      const r0 = F7.mean(i.rows, 'tofR', T - 30, T);
      const map = F7.pctMin(i.rows, c.rows, 'map', T, T + 600);
      console.log(`FU-7 T19 F12: atracurium TOF count min ${Math.min(...w.map((r) => r.tofC as number))}, ratio ${Math.min(...w.map((r) => r.tofR as number)).toFixed(3)}–${Math.max(...w.map((r) => r.tofR as number)).toFixed(3)} (baseline ${r0.toFixed(3)}), MAP ${map.toFixed(1)} %`);
      for (const r of w) {
        expect(r.tofC).toBe(4);
        expect(Math.abs((r.tofR as number) - r0)).toBeLessThanOrEqual(0.02);
      }
      expect(map).toBeLessThan(0);
    });
  });

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
