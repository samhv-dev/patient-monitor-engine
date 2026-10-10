// FU-7.1 B7 (FU-7 gate §6): a chronic CO2 retainer starts the case at his own acid–base state, not alkalaemic. The
// first ABG of a GOLD 3/4 patient must already read the settled pH and PaCO2 (± 0.03 / ± 4 mmHg), not pH 7.49 / 37.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

async function course(copd: number): Promise<{ at10: { ph: number; paco2: number }; settled: { ph: number; paco2: number } }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 65, weightKg: 75, heightCm: 172, sex: 'M', sensors: { spo2: 'on', co2: 'on' }, lungConditions: [{ id: 'copd', severity: copd }] } as never });
  let labs: { ph?: number; pco2?: number } = {};
  e.on((x) => { if (x.type === 'labs') labs = (x as unknown as { values: { ph: number; pco2: number } }).values; });
  const read = async (t: number) => { for (let u = e.now().simT + 1; u <= t; u++) { e.advanceTo(u); if (u % 60 === 0) await new Promise((r) => setImmediate(r)); } return { ph: labs.ph ?? 0, paco2: labs.pco2 ?? 0 }; };
  const at10 = await read(10);
  const settled = await read(1200);
  return { at10, settled };
}

describe('FU-7.1 B7: the COPD start-up transient', { timeout: 300_000 }, () => {
  for (const [label, copd] of [['GOLD 3', 0.75], ['GOLD 4', 1]] as const) {
    it(`${label} starts at its settled acid–base state (main: GOLD 4 pH 7.49 / PaCO2 37 at 10 s against 7.39 / 49)`, async () => {
      const c = await course(copd);
      // eslint-disable-next-line no-console -- the gate note's numbers
      console.log(`FU-7.1 B7 ${label}: at 10 s pH ${c.at10.ph.toFixed(2)} / PaCO2 ${c.at10.paco2.toFixed(0)}; settled pH ${c.settled.ph.toFixed(2)} / PaCO2 ${c.settled.paco2.toFixed(0)}`);
      expect(Math.abs(c.at10.ph - c.settled.ph)).toBeLessThanOrEqual(0.03);
      expect(Math.abs(c.at10.paco2 - c.settled.paco2)).toBeLessThanOrEqual(4);
      expect(c.at10.ph).toBeLessThanOrEqual(7.44); // never alkalaemic at the start
    });
  }
});
