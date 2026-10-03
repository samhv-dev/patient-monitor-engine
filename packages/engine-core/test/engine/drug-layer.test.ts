// FU-7 drug-layer engine cases (Task 16's histamine cases; Task 19 adds the flipped matrix cells). The audit's
// ventilated rig (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5) unless a case says otherwise; one yield per sim-MINUTE. SLOW_A.
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

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
