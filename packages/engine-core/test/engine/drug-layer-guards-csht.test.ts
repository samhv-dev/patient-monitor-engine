// The regression guards' context-sensitive offsets case — five arms of 1.25–7 sim-h — in its own file so the two halves
// of drug-layer-guards.test.ts fit one CI slow group each (≈ 720 + 790 s on the slowest runner). Same describe titles
// as there, so the test's full name is unchanged. The ventilated rig (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5); one yield
// per sim-MINUTE.
import { describe, expect, it } from 'vitest';
import * as F7 from '../helpers/drug-arm-runner.ts';

const conscious = (r: F7.Row) => r.conscious === true;

describe('the flipped matrix cells', { timeout: 3_600_000 }, () => {
  const { V, inf } = F7;
  describe('regression guards: cells already PL stay PL', () => {
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
  });
});
