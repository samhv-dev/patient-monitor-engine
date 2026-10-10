// FU-4 G4 (b), Task 17 (orchestrator update 2026-09-28): the arrest EtCO2 falls over 1–2 min, not within seconds.
// FU-7.1 B3 (OWNER RULING 2026-10-07, research/26 T3): SUPERSEDED for the NO-FLOW value. Falk JL et al., N Engl J Med
// 1988;318:607 measured the transition in 13 human arrests, ventilated and monitored throughout: EtCO2 fell to
// 0.4 ± 0.4 % — ≈ 3 ± 3 mmHg — within ONE minute. FU-4 G4's "10–20 mmHg at 60 s" is a CPR value (Garnett 1987's
// resuscitated patients read 15 ± 4 DURING compressions), not a no-flow value, and the owner ruled research 03 §4.4
// ("< 5 mmHg within 30 s") governs. The no-CPR case below is re-targeted on Falk; the CPR cases keep R39-2's bands.
// Rig: adult 40 y 70 kg MODELED, ETT + VCV 12 × 600 / PEEP 5 / FiO2 0.5 (the audit's rig), seed 7, commanded coarse VF at
// 60 s. Bands (R45 targets, [ENG] fit of LOW_FLOW_TAU_S — l2/gas/params.ts): no CPR — EtCO2 at +60 s in 10–20 mmHg and
// at +120 s in 3–10; CPR q 0.8 from +30 s at R39-2's 10 breaths/min × 500 mL — back to its steady 17–23 by +2 min. Asserted on the TRUE EtCO2
// (Stage 3's `resp.etco2`), never the displayed numeric (D27). 4–11.5 sim-min per run (≈ 5 s wall), one yield per
// sim-minute.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';

type Body = Record<string, unknown>;
let n = 0;
const cmd = (c: Body) => ({ id: `ae${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
const ev = (event: Body) => cmd({ type: 'applyEvent', event });
const etco2 = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { resp: { etco2: number } } }).st.resp.etco2;

async function course(cprAt?: number, endS = 240): Promise<Map<number, number>> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { co2: 'on' } } });
  e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }));
  e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }));
  const out = new Map<number, number>();
  for (let t = 1; t <= endS; t++) {
    if (t === 60) e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    if (cprAt !== undefined && t === cprAt) {
      // R39-2's conditions (cpr-etco2.test.ts): compressions 110/min at the learner default and 10 breaths/min × 500 mL
      e.dispatch(ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 }));
      e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 500, peep: 5, fio2: 1 }));
    }
    e.advanceTo(t);
    out.set(t, etco2(e));
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return out;
}

describe('FU-4 G4 (b): arrest EtCO2 kinetics', { timeout: 300_000 }, () => {
  // FU-7.1 B3: re-targeted on Falk 1988 (owner ruling 2026-10-07) — ≈ 3 mmHg (band 0–6) at 60 s with ventilation
  // continuing, and lower still at 120 s. Measured with the alveolar-washout mechanism: 9.3 at +30 s, 2.6 at +60 s,
  // 0.2 at +120 s (FU-4's τ-70 s lag read 14.2 and 5.0).
  it('VF without CPR: EtCO2 ≤ 6 mmHg at +60 s (Falk 1988 ≈ 3 ± 3 in 13 human arrests) and ≤ 5 at +120 s — FU-4 G4\'s "10–20 at 60 s" is a CPR value and is superseded (owner ruling 2026-10-07)', async () => {
    const c = await course();
    console.log(`arrest-etco2 no CPR: pre ${c.get(59)!.toFixed(1)}, +20 s ${c.get(80)!.toFixed(1)}, +30 s ${c.get(90)!.toFixed(1)}, +60 s ${c.get(120)!.toFixed(1)}, +120 s ${c.get(180)!.toFixed(1)}`);
    expect(c.get(120)!).toBeGreaterThanOrEqual(0);
    expect(c.get(120)!).toBeLessThanOrEqual(6);
    expect(c.get(180)!).toBeLessThanOrEqual(5);
  });
  // R45 (FU-7.1 B3): the other half of the ruled target — research 03 §4.4 / BUILD-PLAN Stage 3 acceptance 4 ("< 5 mmHg
  // within 30 s") is still missed on this rig, because the washout τ is the lung's own V_alv/VA (≈ 24–36 s at 12 × 600)
  // and 30 s is barely one time constant. Recorded with the number; the two unit-level records in
  // `test/l2/gas/co2.test.ts` say the same thing at the unit rig's ventilation.
  it.fails('VF without CPR: EtCO2 < 5 mmHg already at +30 s (research 03 §4.4 / Stage 3 acceptance 4) — measured 9.3 with the alveolar washout (24.2 before it)', async () => {
    const c = await course(undefined, 120);
    expect(c.get(90)!).toBeLessThan(5);
  });
  // R39-2 measures its band as the MEAN over minutes 1–10 of CPR (cpr-etco2.test.ts); this rig does the same. The
  // plan's "by +2 min" reading is recorded separately below: the EtCO2 dips to ≈ 16 at +2 min on this rig (it arrests
  // hypocapnic, PaCO2 36 at 12 × 600) and climbs back as tissue CO2 accumulates (17.5 mean over minutes 1–10).
  // R45 (FU-6 executor, gate): since FU-6 R9 the MODELED drive runs on the ventilator (assist-control), and this
  // undrugged, unparalysed rig's brainstem counts as perfused under CPR q 0.8 (FU-3's gate: not pulseless-flagged, CO > 0,
  // CBF above its threshold) — its drive triggers the ventilator at 14–19/min during CPR instead of the set 10, and the
  // mean EtCO2 over minutes 1–10 falls 17.5 (origin/main) → 15.9. it.fails with the number; whether an arrested
  // patient's drive may trigger during CPR is an open question in the FU-6 gate note (a guard is a mechanism change).
  it('VF with CPR q 0.8 from +30 s: EtCO2 in R39-2\'s steady 17–23 (mean over minutes 1–10 of CPR) — measured 18.3 after G-FU6-2 (was 15.9 with FU-6 R9 triggering; 17.5 on origin/main)', async () => {
    const c = await course(90, 690);
    const v = [...c].filter(([t]) => t >= 150 && t <= 690).map(([, x]) => x);
    const m = v.reduce((a, x) => a + x, 0) / v.length;
    console.log(`arrest-etco2 CPR: +30 s ${c.get(90)!.toFixed(1)}, +2 min of CPR ${c.get(210)!.toFixed(1)}, mean minutes 1–10 ${m.toFixed(1)}`);
    expect(m).toBeGreaterThanOrEqual(17);
    expect(m).toBeLessThanOrEqual(23);
  });
  // R45: the plan's "17–23 BY +2 min of CPR" was missed on this rig — measured 16.5 at τ 70 s (a dip, not the τ: 16.1 at
  // +2.5 min with τ 60, 16.9 mean at τ 80). FU-8 (E-FU8-10): flipped — the gas exchange reads the circulation's CPR
  // pulmonary flow (A22), 18.0 at +2 min
  // R45 (FU-7.1 B3): flipped by the washout — the fall into the arrest now starts the CPR phase from a lower EtCO2, so
  // the +2 min point reads 15.9 (18.0 before). It is INSIDE research/26 T3's sourced band for adequate CPR (10–20 mmHg:
  // Garnett 1987 n = 35, 15 ± 4 in the resuscitated; Falk 1988 ≈ 7.6; AHA 2020 "above 10"), so the bound itself is a
  // candidate for a re-rule — recorded here with the number, not widened (FU-7.1 Q9 to the owner).
  it.fails('VF with CPR q 0.8 from +30 s: EtCO2 ≥ 17 already at +2 min of CPR (measured 16.5 before FU-8, 18.0 after) — measured 15.9 with the FU-7.1 B3 washout', async () => {
    const c = await course(90, 210);
    expect(c.get(210)!).toBeGreaterThanOrEqual(17);
  });
});
