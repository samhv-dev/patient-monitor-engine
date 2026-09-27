// NMB time courses on 7g's PK (tables §6.1: rocuronium ke0 0.16/0.26, Vss 0.26 L/kg; succinylcholine hydrolysis CL
// 0.2 L/kg/min) with 7f's PD. Bands: tables §5d label rows [P] unless marked; the rocuronium TOFR 0.9 band is R51
// addendum 17's (Debaene 2003; label). EC50s other than rocuronium's are [ENG] fits (Step 5). R45: a missed band is
// fitted within the stated ranges or reported, never widened; succinylcholine is a declared 7g PK defect (FU-3 item 1).
import { describe, expect, it } from 'vitest';
import { give, rig } from '../../helpers/neuro.ts';
import { onsetMin, recoveryMin, t1Course, untilTof } from '../../helpers/neuro-nmb.ts';

describe('NMB time course on 7g\'s PK', { timeout: 120_000 }, () => {
  it('rocuronium 0.6 mg/kg: TOF 0 by ~1.8 min, T1 25 % at ~31 min (label); spontaneous TOFR 0.9 at 55–95 min (R51 addendum 17: Debaene 2003; label)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    const tof0 = untilTof(r, (p) => p.tof.count === 0, 5);
    expect(tof0).toBeGreaterThan(1);
    expect(tof0).toBeLessThan(2.2);
    const rec25 = tof0 + untilTof(r, (p) => p.tof.t1 >= 0.25, 90);
    expect(rec25).toBeGreaterThan(26);
    expect(rec25).toBeLessThan(38);
    const tofr9 = rec25 + untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 90);
    expect(tofr9).toBeGreaterThan(55);
    expect(tofr9).toBeLessThan(95);
  });
  it('rocuronium 1.2 mg/kg: faster onset (≤ 1.2 min) and a longer block (T1 25 % 40–90 min; label 67, range 38–150)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    const tof0 = untilTof(r, (p) => p.tof.count === 0, 5);
    expect(tof0).toBeLessThan(1.2);
    const rec25 = tof0 + untilTof(r, (p) => p.tof.t1 >= 0.25, 150);
    expect(rec25).toBeGreaterThan(40);
    expect(rec25).toBeLessThan(90);
  });
  it('the diaphragm recovers before the thumb (spontaneous effort returns at TOF 0–1)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    const diaph = untilTof(r, (p) => p.dia < 0.7, 90);
    const r2 = rig();
    give(r2, 'rocuronium', 0.6);
    untilTof(r2, (p) => p.tof.count === 0, 5);
    const thumb = untilTof(r2, (p) => p.tof.count >= 2, 90);
    expect(diaph).toBeLessThan(thumb);
  });
  it('vecuronium 0.1 mg/kg: max block 2.5–5 min, T1 25 % at 24–32 min (label 3–5 / 25–30)', () => {
    const r = rig();
    give(r, 'vecuronium', 0.1);
    const t1 = t1Course(r, 60);
    const on = onsetMin(t1);
    expect(on).toBeGreaterThan(2.5);
    expect(on).toBeLessThan(5);
    const rec = recoveryMin(t1, 0.25);
    expect(rec).toBeGreaterThan(24);
    expect(rec).toBeLessThan(32);
  });
  it('cisatracurium 0.15 mg/kg: max block 2–3.5 min, T1 25 % at 40–50 min (label 2–3 / ≈ 45)', () => {
    const r = rig();
    give(r, 'cisatracurium', 0.15);
    const t1 = t1Course(r, 80);
    const on = onsetMin(t1);
    expect(on).toBeGreaterThan(2);
    expect(on).toBeLessThan(3.5);
    const rec = recoveryMin(t1, 0.25);
    expect(rec).toBeGreaterThan(40);
    expect(rec).toBeLessThan(50);
  });
  // FU-3 item 1 (R51 addendum 17) is done: 7g re-fitted succinylcholine onto Roy 2002's CL 0.037 L/kg/min and
  // V1 = CL/k = 0.038 L/kg with ke0 0.1475/0.236 and the effect-site EC50 1160 ng/mL, γ 6. Before: T1 ≤ 5 % at
  // 0.17 min, T1 10 % 5.37, T1 90 % 12.68. After: 0.73 / 6.98 / 11.98 min — inside the label bands, so this is `it`.
  it('[FU-3 item 1] succinylcholine 1 mg/kg: block by ~1 min, T1 10 % at ~7.1 min, 90 % at ~10.9 min (label), no fade', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    const on = untilTof(r, (p) => p.tof.t1 <= 0.05, 3);
    expect(on).toBeGreaterThan(0.6);
    expect(on).toBeLessThan(1.4);
    const t10 = on + untilTof(r, (p) => p.tof.t1 >= 0.1, 20);
    expect(t10).toBeGreaterThan(6);
    expect(t10).toBeLessThan(8.5);
    let fade = 1;
    const t90 = t10 + untilTof(r, (p) => { fade = Math.min(fade, p.tof.count === 4 ? p.tof.ratio : 1); return p.tof.t1 >= 0.9; }, 20);
    expect(t90).toBeGreaterThan(9.5);
    expect(t90).toBeLessThan(12.5);
    expect(fade).toBe(1);
  });
  it('succinylcholine phase I has no fade on 7g\'s PK (holds whatever FU-3 does to its timing)', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    let fade = 1;
    untilTof(r, (p) => { fade = Math.min(fade, p.tof.count === 4 ? p.tof.ratio : 1); return false; }, 20);
    expect(fade).toBe(1);
  });
  it('plasma cholinesterase (7g\'s PK, R51 addendum 10): heterozygous ≈ ×1.5–2, homozygous 4–8 h (tables §5d, Lee 2009)', () => {
    const het = rig({ pche: 'het' });
    give(het, 'succinylcholine', 1);
    untilTof(het, (p) => p.tof.t1 <= 0.05, 3);
    const h90 = untilTof(het, (p) => p.tof.t1 >= 0.9, 40);
    expect(h90).toBeGreaterThan(14);
    expect(h90).toBeLessThan(25);
    const hom = rig({ pche: 'hom' });
    give(hom, 'succinylcholine', 1);
    untilTof(hom, (p) => p.tof.t1 <= 0.05, 3);
    const m90 = untilTof(hom, (p) => p.tof.t1 >= 0.9, 600);
    expect(m90 / 60).toBeGreaterThan(4);
    expect(m90 / 60).toBeLessThan(8);
  });
});
