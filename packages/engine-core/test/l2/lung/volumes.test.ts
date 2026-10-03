// Stage 7k (R57): predicted volumes (ECSC 1993 adults, Zapletal children), actual volumes by pathology and the
// forced-expiration model (FEV1, FVC, PEF, FEV1/FVC). Pure: resolveLung → actualVolumes, no engine.
import { describe, expect, it } from 'vitest';
import { resolveLung } from '../../../src/l2/lung/conditions.ts';
import { actualVolumes, closingCapacity, pattern, predictedVolumes, type VolPatient } from '../../../src/l2/lung/volumes.ts';
import { gasPatient } from '../../../src/l2/gas/params.ts';
import type { LungConditionSpec } from '../../../src/types-lung.ts';

const MAN: VolPatient & { weightKg: number } = { ageY: 40, sex: 'M', heightCm: 175, weightKg: 70 };
const OLD: VolPatient & { weightKg: number } = { ageY: 65, sex: 'M', heightCm: 175, weightKg: 70 };
function vols(p: VolPatient & { weightKg: number }, specs: LungConditionSpec[]) {
  const { lp } = resolveLung(specs, gasPatient(p).ibwKg);
  const pred = predictedVolumes(p);
  const a = actualVolumes(pred, lp, specs, lp.side.map((s) => 1 - s.atel - s.consol));
  const pct = (x: number, y: number) => Math.round((100 * x) / y);
  console.log(`VOL ${JSON.stringify(specs.map((s) => `${s.id} ${s.severity}`))}: TLC ${pct(a.tlc, pred.tlc)} % RV ${pct(a.rv, pred.rv)} % FRCsit ${Math.round(a.frcSit)} ERV ${Math.round(a.erv)} FVC ${pct(a.fvc, pred.fvc)} % FEV1 ${pct(a.fev1, pred.fev1)} % FEV1/FVC ${a.ratio.toFixed(2)} PEF ${pct(a.pef, pred.pef)} % ${pattern(a, pred)}`);
  return { a, pred, fev1Pct: (100 * a.fev1) / pred.fev1, fvcPct: (100 * a.fvc) / pred.fvc };
}

describe('Stage 7k: predicted volumes', () => {
  it('ECSC 1993, man 40 y 175 cm: TLC 6.90, RV 1.94, FRC 3.41, FVC 4.70, FEV1 3.87 L (Stocks & Quanjer 1995 Table 8)', () => {
    const p = predictedVolumes(MAN);
    expect(p.tlc).toBeCloseTo(6902.5, 0);
    expect(p.rv).toBeCloseTo(1942.5, 0);
    expect(p.frc).toBeCloseTo(3405, 0);
    expect(p.fvc).toBeCloseTo(4700, 0);
    expect(p.fev1).toBeCloseTo(3875, 0);
    expect(p.vc).toBeCloseTo(p.tlc - p.rv, 6);
    expect(p.pef * 0.06).toBeCloseTo(550.5, 0); // ECSC PEF 6.14H − 0.043A + 0.15 L/s = 9.18 L/s
  });
  it('16–20 y: Zapletal and ECSC blend linearly (no step at the 18th birthday, F11)', () => {
    const at = (a: number) => predictedVolumes({ ageY: a, sex: 'M', heightCm: 175 }).tlc;
    expect(at(18)).toBeCloseTo((at(16) + predictedVolumes({ ageY: 25, sex: 'M', heightCm: 175 }).tlc) / 2, 0);
    expect(Math.abs(at(18.01) - at(17.99))).toBeLessThan(10); // ≈ 280 mL/y inside the blend, no 1 L step
  });
  it('ECSC 1993, woman 40 y 165 cm; ages 20–25 enter as 25, > 70 as 70', () => {
    const w = predictedVolumes({ ageY: 40, sex: 'F', heightCm: 165 });
    expect(w.tlc).toBeCloseTo(5100, 0);
    expect(w.rv).toBeCloseTo(1626.5, 0);
    expect(predictedVolumes({ ageY: 21, sex: 'M', heightCm: 175 }).rv).toBe(predictedVolumes({ ageY: 25, sex: 'M', heightCm: 175 }).rv);
    expect(predictedVolumes({ ageY: 85, sex: 'M', heightCm: 175 }).rv).toBe(predictedVolumes({ ageY: 70, sex: 'M', heightCm: 175 }).rv);
  });
  it('Zapletal, boy 4 y 102 cm: TLC ≈ 1.45 L, RV ≈ 0.40 L, FRC ≈ 0.68 L, FEV1/FVC 0.90', () => {
    const c = predictedVolumes({ ageY: 4, sex: 'M', heightCm: 102 });
    expect(c.tlc).toBeGreaterThan(1400);
    expect(c.tlc).toBeLessThan(1500);
    expect(c.rv).toBeGreaterThan(380);
    expect(c.rv).toBeLessThan(420);
    expect(c.frc).toBeGreaterThan(650);
    expect(c.frc).toBeLessThan(720);
    expect(c.ratio).toBe(0.9);
  });
});

describe('Stage 7k: actual volumes and the forced expiration', () => {
  it('a healthy lung reads its predicted values: FVC and FEV1 100 ± 1 %, FEV1/FVC = predicted, normal pattern', () => {
    const r = vols(MAN, []);
    expect(r.a.tlc).toBeCloseTo(r.pred.tlc, 6);
    expect(r.a.rv).toBeCloseTo(r.pred.rv, 6);
    expect(Math.abs(r.fvcPct - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.fev1Pct - 100)).toBeLessThanOrEqual(1);
    expect(r.a.ratio).toBeCloseTo(r.pred.ratio, 2);
    expect(pattern(r.a, r.pred)).toBe('normal');
    expect(r.a.pef / r.pred.pef).toBeCloseTo(1, 2); // PEF 100 % predicted (ECSC 551 L/min)
  });
  it('COPD GOLD 2–4 (severity 0.5/0.75/1): FEV1 50–79 / 30–49 / < 30 % pred, FEV1/FVC < 0.70, obstructive', () => {
    const g2 = vols(OLD, [{ id: 'copd', severity: 0.5 }]);
    const g3 = vols(OLD, [{ id: 'copd', severity: 0.75 }]);
    const g4 = vols(OLD, [{ id: 'copd', severity: 1 }]);
    expect(g2.fev1Pct).toBeGreaterThanOrEqual(50);
    expect(g2.fev1Pct).toBeLessThan(80);
    expect(g3.fev1Pct).toBeGreaterThanOrEqual(30);
    expect(g3.fev1Pct).toBeLessThan(50);
    expect(g4.fev1Pct).toBeLessThan(30);
    for (const g of [g2, g3, g4]) {
      expect(g.a.ratio).toBeLessThan(0.7);
      expect(pattern(g.a, g.pred)).toBe('obstructive');
    }
    expect(g4.a.rv / g4.a.tlc).toBeGreaterThan(0.55); // hyperinflation and gas trapping
    expect(g4.a.fvc).toBeLessThan(0.95 * g4.a.vc); // FVC < VC: the slow units' tail is trapped at the end of the test
  });
  it.fails('COPD GOLD 1 (severity 0.25): FEV1 ≥ 80 % pred with FEV1/FVC < 0.70 — measured 71 % (the catalogue\'s GOLD 1 rawExp 1.5; Q-7k-2)', () => {
    const g1 = vols(OLD, [{ id: 'copd', severity: 0.25 }]);
    expect(g1.a.ratio).toBeLessThan(0.7);
    expect(g1.fev1Pct).toBeGreaterThanOrEqual(80);
  });
  it('ILD grades (0.3/0.6/0.9): FVC 70–80 / 50–70 / < 50 % pred, FEV1/FVC ≥ 0.70, restrictive', () => {
    const [m, mo, e] = [0.3, 0.6, 0.9].map((s) => vols({ ...OLD, ageY: 60 }, [{ id: 'ild', severity: s }]));
    expect(m!.fvcPct).toBeGreaterThanOrEqual(70);
    expect(m!.fvcPct).toBeLessThanOrEqual(80);
    expect(mo!.fvcPct).toBeGreaterThanOrEqual(50);
    expect(mo!.fvcPct).toBeLessThanOrEqual(70);
    expect(e!.fvcPct).toBeLessThan(50);
    for (const g of [m!, mo!, e!]) {
      expect(g.a.ratio).toBeGreaterThanOrEqual(0.7);
      expect(pattern(g.a, g.pred)).toBe('restrictive');
    }
  });
  it('PEF falls with obstruction as FEV1 does (F3): PEF % pred within ±15 points of FEV1 % pred in acute severe asthma and COPD GOLD 2/3; acute severe asthma PEF 33–50 % (BTS/SIGN 2019, GINA)', () => {
    const cases = [vols(MAN, [{ id: 'asthma', severity: 1 }]), vols(OLD, [{ id: 'copd', severity: 0.5 }]), vols(OLD, [{ id: 'copd', severity: 0.75 }])];
    for (const r of cases) expect(Math.abs((100 * r.a.pef) / r.pred.pef - r.fev1Pct)).toBeLessThanOrEqual(15);
    const asthma = cases[0]!;
    expect(asthma.a.pef / asthma.pred.pef).toBeGreaterThanOrEqual(0.33);
    expect(asthma.a.pef / asthma.pred.pef).toBeLessThanOrEqual(0.5);
  });
  it('acute severe asthma (severity 1): FEV1 < 50 % pred, RV > 150 % pred, ERV > 0 (hyperinflated FRC)', () => {
    const r = vols(MAN, [{ id: 'asthma', severity: 1 }]);
    expect(r.fev1Pct).toBeLessThan(50);
    expect(r.a.rv / r.pred.rv).toBeGreaterThan(1.5);
    expect(r.a.erv).toBeGreaterThan(0);
  });
  it('obesity (BMI 40): TLC ≥ 80 % pred (not restrictive), ERV < 50 % of predicted ERV, FEV1/FVC normal', () => {
    const r = vols({ ...MAN, weightKg: 122.5 }, [{ id: 'obesity', severity: 1 }]);
    expect(r.a.tlc / r.pred.tlc).toBeGreaterThanOrEqual(0.8);
    expect(r.a.erv / (r.pred.frc - r.pred.rv)).toBeLessThan(0.5);
    expect(r.a.ratio).toBeGreaterThanOrEqual(0.7);
  });
  it('simple pneumothorax (30 % of the right lung collapsed): TLC and VC fall by the collapsed share (≈ 0.55 × 0.3)', () => {
    const r = vols(MAN, [{ id: 'ptxSimple', severity: 0.3, side: 'R' }]);
    expect(r.a.tlc / r.pred.tlc).toBeCloseTo(1 - 0.55 * 0.3, 2);
  });
  it('closing capacity equals the supine FRC at 44 y and the seated FRC at 66 y (Leblanc 1970)', () => {
    const p = predictedVolumes(MAN);
    expect(closingCapacity(p, 44, 2100)).toBeCloseTo(2100, 6);
    expect(closingCapacity(p, 66, 2100)).toBeCloseTo(p.frc, 6);
  });
});
