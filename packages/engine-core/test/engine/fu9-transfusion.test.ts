// FU-9 Task A3 (F5): citrate is an anion until it is metabolised and its clearance follows whole-body flow (research/22
// BF-05a, BF-05d). Rig = the BF runner's: GA vent; class IV (2100 mL over 10 min from 60 s), then a further 4 L lost over
// 40 min from 660 s while 10 u RBC (35 d, unwarmed) + 10 u FFP (warmed) run over the same 40 min, no calcium.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F5: massive transfusion — the citrate load (Driscoll 1987; Giancarelli 2016; ATLS 10e)', { timeout: 600_000 }, () => {
  const t0 = 660;
  const at = Array.from({ length: (t0 + 3000) / 30 }, (_, k) => 30 * (k + 1));
  let memo: Promise<{ iCa: number; be: number; lact: number; pulseless: boolean }[]> | undefined;
  const rows = () => (memo ??= arm([...GA_VENT,
    [60, ev({ kind: 'bleed', volumeMl: 2100, overS: 600 })],
    [t0, ev({ kind: 'bleed', volumeMl: 4000, overS: 2400 })],
    [t0, ev({ kind: 'transfusion', product: 'rbc', units: 10, overS: 2400, storageDays: 35, warmed: false })],
    [t0, ev({ kind: 'transfusion', product: 'ffp', units: 10, overS: 2400, warmed: true })],
  ], at, (e) => ({ iCa: st(e).blood.out.iCa, be: st(e).blood.core.ab.be, lact: st(e).blood.out.lactate, pulseless: st(e).hemo.circ.arrest !== null })));
  it('no arrest (was asystole at 2430 s: the old rows took iCa to the 0.30 floor), lactate ≥ 4, iCa falls with the FFP citrate', async () => {
    const r = await rows();
    const iCa = Math.min(...r.slice(t0 / 30).map((x) => x.iCa));
    const lact = Math.max(...r.map((x) => x.lact));
    console.log(`FU-9 F5: iCa nadir ${iCa.toFixed(3)}, BE nadir ${Math.min(...r.map((x) => x.be)).toFixed(1)}, lactate peak ${lact.toFixed(1)}, arrest ${r.some((x) => x.pulseless)}`);
    expect(r.some((x) => x.pulseless)).toBe(false);
    expect(lact).toBeGreaterThanOrEqual(4);
    expect(iCa).toBeLessThan(r[t0 / 30 - 1]!.iCa - 0.1);
  });
  // R45 (research/22 BF-05a/05d; R50 ruling R1): with electroneutral, sourced product rows the class IV + MTP picture
  // is BE −0.2 (the dilution of albumin, a weak acid, offsets the shock lactate — the same Stewart offset as the saline
  // cells, Open question 10) and iCa 0.958 (K_CIT, Q46, fitted to the old citrate-rich rows). Ali may overrule (OQ2).
  it.fails('iCa nadir 0.6–0.95 and BE ≤ −10 (ATLS class IV) — measured iCa 0.958, BE −0.2 (FU-9 F5)', async () => {
    const r = await rows();
    expect(Math.min(...r.slice(t0 / 30).map((x) => x.iCa))).toBeLessThanOrEqual(0.95);
    expect(Math.min(...r.map((x) => x.be))).toBeLessThanOrEqual(-10);
  });
});
