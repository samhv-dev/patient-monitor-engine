// FU-6 R5 (audit C1, H; suite RS3 row "flat or low capnogram (EtCO2 display < 15) while VT < dead space"): bag breaths of
// 100 mL (below the dead space) show no alveolar plateau; 500 mL breaths keep theirs. MANUAL, deterministic.
import { describe, expect, it } from 'vitest';
import { ADULT, ev3, numSeries, rig3, run } from '../helpers/resp.ts';

async function bag(vtMl: number) {
  const { e, ev } = rig3({ patient: ADULT });
  e.dispatch(ev3({ kind: 'airwayDevice', device: 'ett' }));
  e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl, fio2: 1 }));
  await run(e, 180);
  const et = numSeries(ev, 'etco2', 120, 180).map(([, v]) => v).filter(Number.isFinite);
  const max = et.length ? Math.max(...et) : 0;
  console.log(`FU-6 R5 BVM 12 × ${vtMl}: displayed EtCO2 max ${max.toFixed(1)} over 120–180 s`);
  return max;
}

describe('FU-6 R5: no plateau below the dead space (was 42 → 55 at VT 68 → 11 mL)', { timeout: 120_000 }, () => {
  // R45: after FU-4's ONE physical dead space (≈ 127 mL for this ventilated adult, was 204) a 100 mL breath is 0.79 × VDs
  // and draws a LOW partial plateau (alvFrac ≈ 0.24) — the plan predicted this row as the one at risk; it misses by the
  // display's resolution. Not re-fitted (the plan: "a band the mechanism now misses becomes it.fails").
  it.fails('12 × 100 mL: displayed EtCO2 < 15 — measured 15.0 (FU-6 R5, band < 15; 0.0 on the pre-FU-4 tree)', async () => {
    expect(await bag(100)).toBeLessThan(15);
  });
  it('12 × 500 mL: displayed EtCO2 ≥ 30 (normal breaths keep their plateau)', async () => {
    expect(await bag(500)).toBeGreaterThanOrEqual(30);
  });
});
