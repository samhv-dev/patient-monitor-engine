import { describe, expect, it } from 'vitest';
import { capnoAngles, ev3, mean, read62, rig3 } from '../helpers/resp.ts';

const vent = { kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.4 };
async function alpha(severity: number): Promise<{ alpha: number; riseIII: number }> {
  const r = rig3({ patient: { ageY: 60, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: severity > 0 ? [{ id: 'copd', severity }] : [] } });
  r.e.dispatch(ev3(vent));
  for (let m = 1; m <= 3; m++) { r.e.advanceTo(60 * m); await new Promise((res) => setImmediate(res)); }
  const a = capnoAngles(read62(r.e, 'co2', 120, 180));
  console.log(`lung-capno severity ${severity}: alpha ${mean(a.map((x) => x.alpha)).toFixed(1)} riseIII ${mean(a.map((x) => x.riseIII)).toFixed(2)}`);
  return { alpha: mean(a.map((x) => x.alpha)), riseIII: mean(a.map((x) => x.riseIII)) };
}

describe('capnogram α emerges from the lungs (R39-6, Q72)', { timeout: 300_000 }, () => {
  it('healthy 100–110°; COPD α rises with GOLD grade; GOLD 3 120–130°, GOLD 4 ≤ 135°', async () => {
    const h = await alpha(0);
    const g = [await alpha(0.25), await alpha(0.5), await alpha(0.75), await alpha(1)];
    expect(h.alpha).toBeGreaterThan(100);
    expect(h.alpha).toBeLessThan(110);
    for (let i = 1; i < g.length; i++) expect(g[i]!.alpha).toBeGreaterThan(g[i - 1]!.alpha);
    expect(g[2]!.alpha).toBeGreaterThan(120);
    expect(g[2]!.alpha).toBeLessThan(130);
    expect(g[3]!.alpha).toBeLessThan(135);
    expect(g[2]!.riseIII).toBeGreaterThan(h.riseIII); // steeper phase III as measured on the trace
  });
});
