import { describe, expect, it } from 'vitest';
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';
import { give, rig } from '../../helpers/neuro.ts';
import { untilTof } from '../../helpers/neuro-nmb.ts';

const N = { profile: 'normal' as const, volatileMac: 0, mgMmolL: 0.9, tempC: 37 };

/** Minutes from rocuronium 0.6 mg/kg to T1 25 % with EC50 multiplier `ec50` at `tempC` (7g's clearance follows the temperature too). */
function rec25(ec50: number, tempC = 37): number {
  const r = rig();
  r.tempC = tempC;
  const m = { rocuronium: ec50, vecuronium: ec50, cisatracurium: ec50, succinylcholine: 1 };
  give(r, 'rocuronium', 0.6);
  const on = untilTof(r, (p) => p.tof.count === 0, 5, m);
  return on + untilTof(r, (p) => p.tof.t1 >= 0.25, 200, m);
}

describe('NMB interactions (scope 7f-1)', { timeout: 120_000 }, () => {
  it('1 MAC volatile: EC50 × 0.67; rocuronium duration +20–45 %', () => {
    const m = ec50Multipliers({ ...N, volatileMac: 1 }).rocuronium;
    expect(m).toBeCloseTo(1 / 1.5, 6);
    const ratio = rec25(m) / rec25(1);
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.45);
  });
  it('magnesium 2 mmol/L potentiates; hypothermia 34 °C: EC50 × 0.64 plus 7g\'s slower clearance prolong ≥ 30 %', () => {
    expect(ec50Multipliers({ ...N, mgMmolL: 2 }).rocuronium).toBeCloseTo(1 / 1.3, 6);
    const cold = ec50Multipliers({ ...N, tempC: 34 }).rocuronium;
    expect(cold).toBeCloseTo(0.64, 6);
    expect(ec50Multipliers({ ...N, tempC: 30 }).rocuronium).toBeCloseTo(0.6, 6);
    expect(rec25(cold, 34) / rec25(1)).toBeGreaterThan(1.3);
  });
  it('myasthenia: very sensitive to rocuronium, resistant to succinylcholine; burn: resistant to rocuronium', () => {
    const mg = ec50Multipliers({ ...N, profile: 'myasthenia' });
    expect(mg.rocuronium).toBeCloseTo(0.3, 6);
    expect(mg.succinylcholine).toBeCloseTo(2.6, 6);
    expect(rec25(0.3) / rec25(1)).toBeGreaterThan(1.8);
    const burn = rig();
    give(burn, 'rocuronium', 0.6);
    expect(untilTof(burn, (p) => p.tof.count === 0, 5, { rocuronium: 2.5, vecuronium: 2.5, cisatracurium: 2.5, succinylcholine: 1 })).toBeNaN(); // 0.6 mg/kg no longer gives a complete block
    expect(ec50Multipliers({ ...N, profile: 'lambertEaton' }).succinylcholine).toBeCloseTo(0.5, 6);
  });
});
