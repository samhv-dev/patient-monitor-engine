// FU-4 Task 18d Step 2b (FU-6's Request 3, 2026-09-28): a 7 kg infant on an ETT with volume control crashed the engine
// at 240 s ("rhythm sinus: next event time is NaN") — the MANUAL EtCO2 calibration gave it an adult's ≈ 400 mL fit and
// the CO2 low-flow factor read an adult's cardiac output (coRatio 0.10), so PaCO2 climbed until a derived value went
// non-finite. After the dead-space root: ventilated at the patient's OWN defaults (7 mL/kg IBW = 49 mL, RR 20 — gas
// params `ventDefaults`), PaCO2 35–45 held for 30 sim-min, EtCO2 within 5 of PaCO2, and NO non-finite number in any
// published numeric or state value over the whole run. MODELED, seed 7; one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `vi${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;
type Rs = { co2: { pf: number }; etco2: number; driver: { vent: { rr: number; vt: number } } };

describe('FU-4 F4: the 7 kg infant ventilates normally at its own defaults', { timeout: 300_000 }, () => {
  it('ETT + VCV at the defaults: PaCO2 35–45 from 5 to 30 min, EtCO2 within 5, no non-finite numeric in 30 min', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 0.5, sex: 'M', weightKg: 7, heightCm: 65, sensors: { co2: 'on', spo2: 'on' } } });
    const bad: string[] = [];
    e.on((x: EngineEvent) => {
      if (x.type === 'measurement') for (const [k, m] of Object.entries(x.values)) { if (m && m.value !== null && !Number.isFinite(m.value)) bad.push(`${x.t} ${k}`); }
      if (x.type === 'state') for (const [k, v] of Object.entries(x.values)) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${x.t} ${k}`); }
    }, ['measurement', 'state']);
    e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }));
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.4 }));
    const rs = () => (e as unknown as { st: { resp: Rs } }).st.resp;
    const pa: number[] = [];
    for (let m = 1; m <= 30; m++) {
      e.advanceTo(60 * m);
      if (m >= 5) pa.push(rs().co2.pf);
      await new Promise((r) => setImmediate(r));
    }
    const r = rs();
    console.log(`vent-infant: ${r.driver.vent.rr} × ${r.driver.vent.vt} mL, PaCO2 ${Math.min(...pa).toFixed(1)}–${Math.max(...pa).toFixed(1)}, end EtCO2 ${r.etco2.toFixed(1)} vs PaCO2 ${r.co2.pf.toFixed(1)}, non-finite ${bad.length}`);
    expect(bad).toEqual([]);
    expect(Math.min(...pa)).toBeGreaterThanOrEqual(35);
    expect(Math.max(...pa)).toBeLessThanOrEqual(45);
    expect(Math.abs(r.co2.pf - r.etco2)).toBeLessThanOrEqual(5);
  });
});
