// Reversal on 7g's PK. Sugammadex binding (1:1 molar in plasma AND at both effect sites through its own effect-site
// ke0 0.095/0.152 /min, `bindSugammadexSites`) is 7g's (R51 §5; deviation D-7f-2): these are 7f's acceptance bands on
// it, and a miss is a REQUEST TO 7G (its sugammadex effect-site ke0 / binding), never a change to 7f's EC50s.
// Neostigmine's time course is 7g's gamma row; its ceiling (NEO_SMAX) and NEO_G50 (fitted here: 0.3) are 7f's.
import { describe, expect, it } from 'vitest';
import { give, rig, runTo, tMin } from '../../helpers/neuro.ts';
import { readNmb, untilTof } from '../../helpers/neuro-nmb.ts';

describe('reversal (tables §5d Sgx/Neo rows)', { timeout: 180_000 }, () => {
  it('sugammadex 2 mg/kg at TOF 2 → TOFR 0.9 in 1.5–3 min (label median 2.2)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    untilTof(r, (p) => p.tof.count >= 2, 60);
    give(r, 'sugammadex', 2);
    const t = untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 20);
    expect(t).toBeGreaterThan(1.5);
    expect(t).toBeLessThan(3);
  });
  it('sugammadex 4 mg/kg at PTC 1–2 → TOFR 0.9 in 2.1–4.3 min (label IQR, median 2.7)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 60);
    give(r, 'sugammadex', 4);
    const t = untilTof(r, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 20);
    expect(t).toBeGreaterThan(2.1);
    expect(t).toBeLessThan(4.3);
  });
  it('sugammadex 16 mg/kg 3 min after rocuronium 1.2 mg/kg → T1 10 % within 0.8–2 min (label 1.2)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    runTo(r, 3);
    give(r, 'sugammadex', 16);
    const t = untilTof(r, (p) => p.tof.t1 >= 0.1, 10);
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(2);
  });
  // R-7f-7 (→ 7g, FU-3 list): on 7g's binding 0.5 mg/kg at PTC after rocuronium 1.2 reaches only TOFR 0.83 at +90 min
  // and never falls (no recurarisation); 0.75 mg/kg peaks 0.997 at +13 min then falls to 0.42, 1 mg/kg to 0.70. The
  // underdose/redistribution balance is 7g's binding (plasma vs effect-site capture), not 7f's PD: pre-declared failing.
  it.fails('[R-7f-7] underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04)', () => {
    const r = rig();
    give(r, 'rocuronium', 1.2);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 90);
    give(r, 'sugammadex', 0.5);
    let peak = 0;
    let after = 1;
    runTo(r, tMin(r) + 90, (bus) => {
      const p = readNmb(bus);
      const ratio = p.tof.count === 4 ? p.tof.ratio : 0;
      if (ratio > peak) {
        peak = ratio;
        after = 1;
      } else after = Math.min(after, ratio);
    });
    expect(peak).toBeGreaterThan(0.95);
    expect(peak - after).toBeGreaterThan(0.04);
  });
  it('neostigmine 0.05 mg/kg at TOF 2 → TOFR 0.9 in 8–20 min, ≥ 5 min faster than spontaneous', () => {
    const a = rig();
    give(a, 'rocuronium', 0.6);
    untilTof(a, (p) => p.tof.count === 0, 5);
    untilTof(a, (p) => p.tof.count >= 2, 60);
    const b = structuredClone(a);
    give(a, 'neostigmine', 0.05);
    const tn = untilTof(a, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 60);
    const ts = untilTof(b, (p) => p.tof.count === 4 && p.tof.ratio >= 0.9, 60);
    expect(tn).toBeGreaterThan(8);
    expect(tn).toBeLessThan(20);
    expect(ts - tn).toBeGreaterThan(5);
  });
  it('neostigmine ceiling: 0.07 mg/kg at PTC 1–2 leaves TOFR < 0.9 at 10 min (sugammadex 4 mg/kg: < 4.3)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    untilTof(r, (p) => p.tof.count === 0, 5);
    runTo(r, 5);
    untilTof(r, (p) => p.tof.count === 0 && p.tof.ptc >= 1, 60);
    give(r, 'neostigmine', 0.07);
    runTo(r, tMin(r) + 10);
    const p = readNmb(r.pk.bus);
    expect(p.tof.count === 4 ? p.tof.ratio : 0).toBeLessThan(0.9);
  });
});
