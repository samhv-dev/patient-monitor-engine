// FU-3 item 7 (G8a calibration queue row 7) — evidence, decided: the ALARM DEFAULT is right and the 7a MANUAL CVP under
// positive-pressure ventilation is wrong, but its fix is NOT landed here (R45; see the plan's "Item 7: the fix is
// deferred"). The 8a soak patient — MANUAL, CVP 6 (L1 default, normal mean 2–8), ventilated at PEEP 5 from t = 0 —
// shows CVP 8.9–10.2 (mean 9.4) and re-raises CVP_M_HIGH 42 times an hour on philips-like, whose adult CVP mean limits
// 0–10 mmHg ARE the IntelliVue factory defaults (Configuration Guide rel. H.0, part 4535 642 29201, p. 59 "CVP, RAP,
// LAP, UVP Settings"; Mindray BeneVision N 0–14 cmH2O ≈ 0–10.3 mmHg, research/03 §8.10; Saadat B9 −5–15, research/06
// §4.3 — the skins match their vendors). The MANUAL CVP tracker (l2/hemo/pipeline.ts, "cvpNow") holds the RA pressure
// minus the WHOLE pleural rise at the instructor's CVP, so the displayed CVP rises by T_IT (0.65 since the R44 PPV
// calibration) of the alveolar pressure, where the tables' Q28 default 0.4 is the brief's "30–50 % of the mean-airway-
// pressure change" (brief §4.9; tables H10: PEEP 5 → 15 gives CVP +2–3 [ENG]). The mechanism (a MANUAL_CVP_PAW_FRACTION
// of 0.4) meets both bands below (step 2.99, soak max 8.76, 0 raises/h) but moves five calibrated bands (check 18's
// MAP-65 premise 64.4 → 72.4 and hypocapnia 0.374 → 0.437; the 7c OLV re-check nadir 88.5 → 87.5; R36 PH-crisis EtCO2
// +6.8 → +3.8; the 8a capture-match SBP 126.4 → 121.4) — a ruling, not an executor's call. Until then: it.fails.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const SKINS = ['philips-like', 'ge-like', 'mindray-like', 'saadat-like', 'lifepak-like', 'zoll-like'] as const;

/** The 8a soak patient (apps/demo/src/validation/perf.ts) on one skin, ventilated from t = 0. */
function soak(skin: string, peep: number): { e: MonitorEngine; ev: EngineEvent[] } {
  const e = createEngine({
    seed: 11,
    patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } },
    device: { skin },
  });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  // saadat-like parameter alarms are factory OFF (research/06 §4.2): switch CVP on so its −5–15 limit is watched
  if (skin === 'saadat-like') e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'CVP', value: true } }));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep } }));
  return { e, ev };
}

async function run(e: MonitorEngine, t1: number): Promise<void> {
  for (let t = 60; t <= t1; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r)); // CI amendment 2: yield once per sim-minute
  }
}

const cvpMeans = (ev: EngineEvent[], t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'measurement' && x.t >= t0 && x.t < t1 && x.values.cvpMean?.value != null ? [x.values.cvpMean.value] : []));
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const raises = (ev: EngineEvent[], id: string): number[] =>
  ev.flatMap((x) => (x.type === 'alarm' && x.id === id && x.state === 'raised' && x.level !== undefined ? [x.t] : []));

describe('MANUAL CVP under positive-pressure ventilation (FU-3 item 7)', () => {
  it.fails('brief §4.9: CVP 6 ventilated from t = 0, PEEP 15 reads 30–50 % of the 10 cmH2O step (2.2–3.7 mmHg) above PEEP 5 (measured 4.82: T_IT 0.65)', { timeout: 120_000 }, async () => {
    const a = soak('philips-like', 5);
    const b = soak('philips-like', 15);
    await run(a.e, 300);
    await run(b.e, 300);
    const d = mean(cvpMeans(b.ev, 120, 300)) - mean(cvpMeans(a.ev, 120, 300));
    console.log(`FU-3 MANUAL CVP PEEP 5 → 15 step ${d.toFixed(2)} mmHg`);
    const step = 10 * 0.7356; // mmHg (CMH2O_TO_MMHG)
    expect(d).toBeGreaterThanOrEqual(0.3 * step);
    expect(d).toBeLessThanOrEqual(0.5 * step);
  });

  it.fails('the 8a soak patient (CVP 6, PEEP 5) stays under the philips-like 10 mmHg limit with its ventilatory ripple: max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17; FU-5: no raise since the displayed 10 is not above the limit — was 27–57 s)', { timeout: 120_000 }, async () => {
    const s = soak('philips-like', 5);
    await run(s.e, 120);
    const v = cvpMeans(s.ev, 30, 120);
    console.log(`FU-3 soak CVP 30–120 s: ${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}, raises ${JSON.stringify(raises(s.ev, 'CVP_M_HIGH'))}`);
    expect(Math.max(...v)).toBeLessThan(9.5); // limit 10 minus the ≈ ±0.6 mmHg ventilatory ripple of the 2 s mean
    expect(raises(s.ev, 'CVP_M_HIGH')).toEqual([]);
  });

  for (const skin of SKINS) {
    it(`${skin}: a real CVP rise (target 18 at 120 s) raises CVP_M_HIGH only where the skin carries its vendor's CVP limit`, { timeout: 120_000 }, async () => {
      const s = soak(skin, 5);
      await run(s.e, 120);
      s.e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: 18 }));
      await run(s.e, 300);
      const hasLimit = skin === 'philips-like' || skin === 'saadat-like' || skin === 'mindray-like'; // 0–10 (Philips factory), −5–15 (Saadat M p. 302–306), 0–10 (FU-5: Mindray BeneVision N App. C.1)
      const r = raises(s.ev, 'CVP_M_HIGH');
      console.log(`FU-3 ${skin} CVP 18: raises at ${JSON.stringify(r.filter((t) => t >= 120))}`);
      expect(r.some((t) => t >= 120)).toBe(hasLimit);
    });
  }
});
