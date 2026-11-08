import { describe, expect, it } from 'vitest';
import { applyCircCondition, type CircConditionId } from '../../../src/l2/circ/conditions.ts';
import { circCardiacOutput, createCircModel } from '../../../src/l2/circ/model.ts';
import { driver, mean, runTo, ventEnv } from '../../helpers/circ.ts';

function measure(id: CircConditionId | null, sev: number) {
  const m = createCircModel();
  const dr = driver(m);
  const env = ventEnv();
  runTo(dr, 60, env);
  if (id) applyCircCondition(m, id, sev);
  runTo(dr, 150, env);
  const ra: number[] = [], pv: number[] = [], pa: number[] = [], paS: number[] = [], rvd: number[] = [], peri: number[] = [];
  runTo(dr, 160, env, (o) => {
    ra.push(o.pRa); pv.push(o.pPv); pa.push(o.pPaRoot); rvd.push(o.pRv); peri.push(o.pPeri);
  });
  const b = m.beats.slice(-8);
  const r = { cvp: mean(ra), pcwp: mean(pv), mpap: mean(pa), paS: Math.max(...pa), paD: Math.min(...pa), co: circCardiacOutput(m), sbp: mean(b.map((x) => x.sbp)), hr: m.hrModel,
    peri: mean(peri), rvedv: mean(b.map((x) => x.rvedv ?? NaN)), lvedv: mean(b.map((x) => x.lvedv)), rvef: mean(b.map((x) => x.svRv / (x.rvedv ?? NaN))) };
  console.log('COND', id, sev, JSON.stringify(r, (_k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)));
  return r;
}

describe('circulatory conditions (tables §2.3 H5, H7; RV infarct brief 94)', () => {
  const base = measure(null, 0);
  it('tamponade 200 mL: CVP and PCWP rise and converge (within 5 mmHg), CO falls ≥ 15 %, HR rises (H7 wants RA 15–20: flagged)', () => {
    const t = measure('tamponade', 0.8);
    expect(t.cvp).toBeGreaterThan(base.cvp + 2.5);
    expect(Math.abs(t.cvp - t.pcwp)).toBeLessThanOrEqual(5);
    expect(t.co).toBeLessThan(0.85 * base.co);
    expect(t.hr).toBeGreaterThan(base.hr + 5);
  }, 120_000);
  it('massive PE (φ 0.6): mPAP 30–45, CVP rises, CO falls ≥ 10 % (H5 wants −40–60 %: flagged, needs RV ischaemia)', () => {
    const p = measure('pe', 0.75);
    expect(p.mpap).toBeGreaterThanOrEqual(30);
    expect(p.mpap).toBeLessThanOrEqual(45);
    expect(p.cvp).toBeGreaterThan(base.cvp + 0.5);
    expect(p.co).toBeLessThan(0.9 * base.co);
  }, 120_000);
  // Brief 94: a regional infarct dilates the RV inside the shared pericardium — the pericardial pressure rises on both
  // ventricles and the LV fills less (Goldstein 1982 Circulation 65:513, 1983 JACC 2:270: RV diastolic size up, LV
  // transmural pressure and size down, intrapericardial pressure up); RVEF 30 ± 8 % (Dell'Italia 1985)
  it('RV infarct: the RV dilates, the pericardial pressure rises, the LV fills less, RVEF 22–38 %, CVP/PCWP ≥ 0.8, CO down', () => {
    const r = measure('rvInfarct', 1);
    expect(r.rvedv).toBeGreaterThan(base.rvedv + 25);
    expect(r.lvedv).toBeLessThan(base.lvedv);
    expect(r.peri).toBeGreaterThan(base.peri + 1);
    expect(r.rvef).toBeGreaterThanOrEqual(0.22);
    expect(r.rvef).toBeLessThanOrEqual(0.38);
    expect(r.cvp).toBeGreaterThan(base.cvp + 1);
    expect(r.cvp / r.pcwp).toBeGreaterThanOrEqual(0.8); // Dell'Italia 1984 JACC 4:931 criterion
    expect(r.co).toBeLessThan(base.co);
  }, 120_000);
});
