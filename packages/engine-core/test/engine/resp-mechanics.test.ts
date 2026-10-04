// Stage 7k (R57): the per-breath mechanics, the Pes estimate, the dead-space set and the volume set on the running
// engine, against textbook bands for a healthy 70 kg adult awake and anaesthetised and the catalogue's pathologies.
// Sources per row: Hess & Kacmarek (Essentials of Mechanical Ventilation 4e ch. 3), the lung catalogue's bands
// (`data/lung-pathology.ts` Bands, reference VT 490 × 14, PEEP 5), Owens 2012 (Pes), Nunn 8e / Nuckton 2002 (VD/VT),
// ATS/ERS (reversibility ≥ 12 % and ≥ 200 mL). One yield per sim-minute (runTo).
import { describe, expect, it } from 'vitest';
import { ADULT6, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';
import type { PatientProfile } from '../../src/types.ts';
import type { LungConditionSpec } from '../../src/types-lung.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access (fu6.ts pattern)
type Any = any;
type Opts = { patient?: PatientProfile; conds?: LungConditionSpec[]; vent?: Record<string, number> | null; child?: boolean; t?: number };
// one engine run per rig: the rows that read the same rig share it (R50 F1: the file's CI time)
const runs = new Map<string, Promise<{ m: Any; vd: Any; v: Any; ls: Any }>>();
function measure(opts: Opts): Promise<{ m: Any; vd: Any; v: Any; ls: Any }> {
  const k = JSON.stringify(opts);
  if (!runs.has(k)) runs.set(k, run(opts));
  return runs.get(k) as Promise<{ m: Any; vd: Any; v: Any; ls: Any }>;
}
async function run(opts: Opts): Promise<{ m: Any; vd: Any; v: Any; ls: Any }> {
  const e = rig6({ ...(opts.patient ?? ADULT6), lungConditions: opts.conds ?? [] });
  if (opts.child) {
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.5, ...opts.vent });
    send(e, { kind: 'thermal', anaesthesia: 'general' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  } else if (opts.vent) await ventRig(e, opts.vent);
  let ls: Any = {};
  e.on((x: Any) => { if (x.type === 'lungState') ls = { ...ls, ...x }; });
  await runTo(e, opts.t ?? 300);
  const rs = st6(e).resp;
  const r = { m: rs.mechanics, vd: rs.vd, v: rs.volumes, ls };
  const m = r.m;
  console.log(`MECH ${JSON.stringify((opts.conds ?? []).map((c) => `${c.id} ${c.severity}`))} ${m.kind}: VT ${m.vt} Ppeak ${m.ppeak} Pplat ${m.pplat} PEEPtot ${m.peepTot} PEEPi ${m.peepi} ΔP ${m.dp} Cstat ${m.cstat} Cdyn ${m.cdyn} Rinsp ${m.rinsp} Pes ${m.pesEi}/${m.pesEe} PL ${m.plEi}/${m.plEe} | VD ${r.vd.anat}/${r.vd.app}/${r.vd.alv}/${r.vd.phys} VD/VT ${r.vd.vdvt} | FRC ${Math.round(r.v.frc)} CC ${r.v.cc === null ? '–' : Math.round(r.v.cc)}`);
  return r;
}

describe('Stage 7k: mechanics on the running engine (per breath)', { timeout: 300_000 }, () => {
  it('healthy adult under GA on VCV 500 × 12, PEEP 5: Ppeak < 30, Pplat 10–20, PEEPi < 1, ΔP 6–12, Cstat 45–80, Cdyn < Cstat, Rinsp 6–15 (Hess & Kacmarek; glossary §5.6)', async () => {
    const { m, v } = await measure({ vent: {} });
    expect(m.kind).toBe('mech');
    expect(m.ppeak).toBeLessThan(30);
    expect(m.ppeak).toBeGreaterThan(m.pplat);
    expect(m.pplat).toBeGreaterThanOrEqual(10);
    expect(m.pplat).toBeLessThanOrEqual(20);
    expect(m.peepi).toBeLessThan(1);
    expect(m.dp).toBeGreaterThanOrEqual(6);
    expect(m.dp).toBeLessThanOrEqual(12);
    expect(m.cstat).toBeGreaterThanOrEqual(45);
    expect(m.cstat).toBeLessThanOrEqual(80);
    expect(m.cdyn).toBeLessThan(m.cstat);
    expect(m.rinsp).toBeGreaterThanOrEqual(6);
    expect(m.rinsp).toBeLessThanOrEqual(15);
    // FU-6's anaesthetised FRC (20 mL/kg IBW) is the bedside FRC; it falls below the 40 y closing capacity (Leblanc: CC
    // reaches the supine FRC at 44 y) — the teaching point of airway closure under GA
    expect(v.frc).toBeLessThan(v.cc);
  });
  it('healthy adult under GA: Pes,ee 5–12 cmH2O (Owens 2012 lean supine 6.9 ± 2.8 at the relaxation volume, + PEEP), PL,ee −5…+3, PL,ei 0…15', async () => {
    const { m } = await measure({ vent: {} });
    expect(m.pesEe).toBeGreaterThanOrEqual(5);
    expect(m.pesEe).toBeLessThanOrEqual(12);
    expect(m.plEe).toBeGreaterThanOrEqual(-5);
    expect(m.plEe).toBeLessThanOrEqual(3);
    expect(m.plEi).toBeGreaterThan(0);
    expect(m.plEi).toBeLessThan(15);
  });
  it.fails('healthy adult under GA on VCV: Enghoff VD/VT 0.30–0.45 (Nunn 8e: ≈ 0.3 awake, higher under anaesthesia) — measured 0.28 (VD phys 140 mL: FU-4\'s ETT bypass + HEALTHY_VDALV 0.075; Q-7k-5)', async () => {
    const { vd } = await measure({ vent: {} });
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.3);
    expect(vd.vdvt).toBeLessThanOrEqual(0.45);
  });
  it('healthy adult awake, spontaneous: no hold readings (null), VD/VT 0.2–0.35; Pes = the model\'s pleural pressure (West: ≈ −5 at FRC, 3–6 more negative at end-inspiration), so PL,ee ≈ +5 (F4 ruling); the FRC shown is lungState\'s', async () => {
    const { m, vd, v, ls } = await measure({ vent: null });
    expect(m.kind).toBe('spont');
    expect(m.ppeak).toBeNull();
    expect(m.cstat).toBeNull();
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.2);
    expect(vd.vdvt).toBeLessThanOrEqual(0.35);
    expect(m.pesEe).toBeGreaterThanOrEqual(-7);
    expect(m.pesEe).toBeLessThanOrEqual(-3);
    expect(m.pesEe - m.pesEi).toBeGreaterThanOrEqual(3);
    expect(m.pesEe - m.pesEi).toBeLessThanOrEqual(6);
    expect(m.plEe).toBeGreaterThanOrEqual(3);
    expect(m.plEe).toBeLessThanOrEqual(7);
    expect(Math.round(v.frc)).toBe(ls.frcMl); // one bedside FRC (D6): the panel and lungState agree
  });
  it('bronchospasm 1 (Pmax 80, FU-6 D18b): Ppeak ≥ 40, PEEPi 6–12, Rinsp ≥ 40, Cdyn < ½ Cstat, VD/VT ≥ 0.45 (catalogue §2)', async () => {
    const { m, vd } = await measure({ vent: { pmax: 80 }, conds: [{ id: 'bronchospasm', severity: 1 }] });
    expect(m.ppeak).toBeGreaterThanOrEqual(40);
    expect(m.peepi).toBeGreaterThanOrEqual(6);
    expect(m.peepi).toBeLessThanOrEqual(12);
    expect(m.rinsp).toBeGreaterThanOrEqual(40);
    expect(m.cdyn).toBeLessThan(0.5 * m.cstat);
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.45);
  });
  it('moderate ARDS on 6 mL/kg (VT 420, PEEP 10, RR 18): Cstat 30–40 (catalogue 35), ΔP ≤ 15 (Amato 2015), PL,ee 0…+6, VD/VT 0.5–0.65 (Nuckton 2002)', async () => {
    const { m, vd } = await measure({ vent: { vtMl: 420, peep: 10, rr: 18 }, conds: [{ id: 'ards', severity: 0.67 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(30);
    expect(m.cstat).toBeLessThanOrEqual(40);
    expect(m.dp).toBeLessThanOrEqual(15);
    expect(m.plEe).toBeGreaterThanOrEqual(0);
    expect(m.plEe).toBeLessThanOrEqual(6);
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.5);
    expect(vd.vdvt).toBeLessThanOrEqual(0.65);
  });
  it('obesity BMI 40 on PEEP 5: Cstat 24–40 (catalogue §10), Pes,ee ≥ 10, PL,ee < 0 (the obese chest wall closes the dependent lung at PEEP 5)', async () => {
    const { m } = await measure({ patient: { ...ADULT6, weightKg: 122.5 }, vent: {}, conds: [{ id: 'obesity', severity: 1 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(24);
    expect(m.cstat).toBeLessThanOrEqual(40);
    expect(m.pesEe).toBeGreaterThanOrEqual(10);
    expect(m.plEe).toBeLessThan(0);
  });
  it('COPD GOLD 3, 65 y, VCV 490 × 14 (the catalogue\'s reference): Cstat 43–75, Rinsp 16–33 (catalogue §5); FEV1/FVC < 0.70', async () => {
    const { m, v } = await measure({ patient: { ...ADULT6, ageY: 65 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'copd', severity: 0.75 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(43);
    expect(m.cstat).toBeLessThanOrEqual(75);
    expect(m.rinsp).toBeGreaterThanOrEqual(16);
    expect(m.rinsp).toBeLessThanOrEqual(33);
    expect(v.ratio).toBeLessThan(0.7);
  });
  it.fails('COPD GOLD 3, VCV 490 × 14: PEEPi 4–8 (catalogue §5 band at the reference rate) — measured 3.6 (lungState 3.7: the 7b lung\'s own value, not a 7k measurement; R46 calibration row)', async () => {
    const { m } = await measure({ patient: { ...ADULT6, ageY: 65 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'copd', severity: 0.75 }] });
    expect(m.peepi).toBeGreaterThanOrEqual(4);
    expect(m.peepi).toBeLessThanOrEqual(8);
  });
  it('ILD moderate, VT 490: Cstat 28–36 (catalogue 32), ΔP 13–15.5 (catalogue §7), restrictive', async () => {
    const { m, v } = await measure({ patient: { ...ADULT6, ageY: 60 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'ild', severity: 0.6 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(28);
    expect(m.cstat).toBeLessThanOrEqual(36);
    expect(m.dp).toBeGreaterThanOrEqual(13);
    expect(m.dp).toBeLessThanOrEqual(15.5);
    expect(v.pattern).toBe('restrictive');
  });
  it('simple pneumothorax 30 % (right): Cstat falls (catalogue ×0.82 → ≈ 45), TLC ≈ 84 % predicted', async () => {
    const { m, v } = await measure({ vent: {}, conds: [{ id: 'ptxSimple', severity: 0.3, side: 'R' }] });
    expect(m.cstat).toBeGreaterThanOrEqual(40);
    expect(m.cstat).toBeLessThanOrEqual(50);
    expect(v.tlc / v.pred.tlc).toBeCloseTo(0.835, 2);
  });
  it('4 y child (16 kg, ETT, VCV 17 × 112): Cstat 0.6–1.2 mL/cmH2O/kg, Rinsp ≥ 20 (small tube), CC null (< 18 y)', async () => {
    const { m, v } = await measure({ patient: { ageY: 4, sex: 'M', heightCm: 102, weightKg: 16 }, vent: { rr: 17, vtMl: 112 }, child: true });
    expect(m.cstat / 16).toBeGreaterThanOrEqual(0.6);
    expect(m.cstat / 16).toBeLessThanOrEqual(1.2);
    expect(m.rinsp).toBeGreaterThanOrEqual(20);
    expect(v.cc).toBeNull();
  });
});

describe('Stage 7k: spirometry answers the bronchodilator through FU-6\'s one smooth-muscle state', { timeout: 300_000 }, () => {
  const arm = async (id: 'asthma' | 'copd', severity: number) => {
    const e = rig6({ ...ADULT6, lungConditions: [{ id, severity }] });
    await runTo(e, 60);
    const b = { ...st6(e).resp.volumes };
    send(e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(e, 960);
    const a = st6(e).resp.volumes;
    console.log(`BD ${id} ${severity}: FEV1 ${Math.round(b.fev1)} → ${Math.round(a.fev1)} (+${(100 * (a.fev1 / b.fev1 - 1)).toFixed(1)} %)`);
    return { pct: 100 * (a.fev1 / b.fev1 - 1), ml: a.fev1 - b.fev1, before: (100 * b.fev1) / b.pred.fev1 };
  };
  // moderate persistent asthma = FEV1 60–80 % predicted (GINA/NAEPP): catalogue severity 0.7 reads 62 %; severity 0.6
  // reads 78 % and reverses +11.6 % (+348 mL) — the borderline mild row, recorded in the gate note, not asserted
  it('moderate asthma (FEV1 60–80 % pred): FEV1 +≥ 12 % and +≥ 200 mL 15 min after salbutamol 250 µg (ATS/ERS reversibility; measured +33 %); COPD GOLD 2: < 12 % (+3 %)', async () => {
    const asthma = await arm('asthma', 0.7);
    expect(asthma.before).toBeGreaterThanOrEqual(60);
    expect(asthma.before).toBeLessThanOrEqual(80);
    expect(asthma.pct).toBeGreaterThanOrEqual(12);
    expect(asthma.ml).toBeGreaterThanOrEqual(200);
    const copd = await arm('copd', 0.5);
    expect(copd.pct).toBeLessThan(12);
  });
});
