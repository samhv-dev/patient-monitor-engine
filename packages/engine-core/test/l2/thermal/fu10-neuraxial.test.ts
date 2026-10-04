// FU-10 Task A2 (E3; research/14 ET-04): a neuraxial block has its own thermoregulation — the effectors below the block
// are abolished (vessels dilated, no shivering), the central thresholds are an unsedated patient's with BOTH cold-defence
// thresholds ≈ 0.5 °C lower (Kurz, Sessler, Schroeder, Kurz, Anesth Analg 1993;77:721; ruling R-7), so redistribution is
// smaller than GA's (Matsukawa 1995). The ratio to GA (measured 0.71 in the ET rig) is accepted under ruling R-7.
import { describe, expect, it } from 'vitest';
import { createThermal, currentThresholds, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { THR_SHIVER_AWAKE, THR_VASO_AWAKE } from '../../../src/l2/thermal/params.ts';

const course = (an: 'general' | 'neuraxial', hours: number) => {
  const st = createThermal(36.8, 70);
  st.anaesthesia = an;
  const tc: number[] = [];
  let shivC = NaN;
  for (let s = 1; s <= hours * 3600; s++) {
    stepThermal(st, s, 1);
    if (s % 60 === 0) tc.push(st.tc);
    if (Number.isNaN(shivC) && st.out.shiverW > 1) shivC = st.tc;
  }
  return { st, tc, shivC };
};

describe('FU-10 E3: neuraxial thermoregulation (Sessler 2000/2008; Kurz 1993; Matsukawa 1995)', () => {
  it('no central depth: both cold-defence thresholds 0.5 °C below the awake ones', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'neuraxial';
    stepThermal(st, 1, 1);
    expect(st.depth).toBe(0);
    const thr = currentThresholds(st);
    expect(thr.vaso).toBeCloseTo(THR_VASO_AWAKE - 0.5, 6);
    expect(thr.shiver).toBeCloseTo(THR_SHIVER_AWAKE - 0.5, 6);
  });
  it('hour-1 redistribution −0.5 to −1.1 °C (Matsukawa 1995: −0.8 ± 0.3), less than GA; shivering starts at ≈ 35.5 °C', () => {
    const n = course('neuraxial', 3);
    const g = course('general', 1);
    console.log(`FU-10 E3: hour 1 neuraxial −${(36.8 - n.tc[59]!).toFixed(2)} vs GA −${(36.8 - g.tc[59]!).toFixed(2)} °C; shivering from ${n.shivC.toFixed(2)} °C`);
    expect(36.8 - n.tc[59]!).toBeGreaterThanOrEqual(0.5);
    expect(36.8 - n.tc[59]!).toBeLessThanOrEqual(1.1);
    expect(36.8 - n.tc[59]!).toBeLessThan(36.8 - g.tc[59]!);
    expect(n.shivC).toBeGreaterThan(35.3);
    expect(n.shivC).toBeLessThan(35.6);
  });
});
