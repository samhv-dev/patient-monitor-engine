// FU-9 Task A13 (H8; research/13): mannitol is an effective ECF osmole in 7c's pool, which 7d's kidney clears.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { MANNITOL_MOSM_PER_G } from '../../../src/l2/brain/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 H8: mannitol as a plasma osmole', () => {
  it('1 g/kg: osmolality up, Na DOWN (water leaves the cells: translocational), a transient plasma expansion; without 7d t½ 2 h', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    const step = (t: number) => stepBloodCore(bc, { t, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    step(0);
    const o0 = bc.out.osm;
    const na0 = bc.out.na;
    const vp0 = bc.fl.vp;
    bc.so.mannitol = 70 * MANNITOL_MOSM_PER_G;
    for (let k = 1; k <= 9000; k++) step(k / 10);
    console.log(`FU-9 H8: 15 min osm +${(bc.out.osm - o0).toFixed(1)}, Na ${(bc.out.na - na0).toFixed(1)}, plasma +${(bc.fl.vp - vp0).toFixed(0)} mL`);
    expect(bc.out.osm - o0).toBeGreaterThan(5);
    expect(bc.out.na).toBeLessThan(na0 - 3);
    expect(bc.fl.vp).toBeGreaterThan(vp0);
    for (let k = 9001; k <= 72000; k++) step(k / 10); // to 2 h after the dose
    const left = (bc.so.mannitol ?? 0) / (70 * MANNITOL_MOSM_PER_G);
    expect(left).toBeGreaterThan(0.4); // t½ 2 h (7d's MANNITOL_KE_PER_MIN), plus what the expanded plasma's elimination carries
    expect(left).toBeLessThan(0.5);
  });
});
