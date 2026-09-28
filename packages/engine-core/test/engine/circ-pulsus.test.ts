// FU-4 G6 (Task 10): pulsus paradoxus. Severe tamponade (severity 1), MODELED, spontaneous breathing (no ventilator),
// 10 sim-min; the beat-to-beat SBP swing (max − min over 6 s windows, the audit runner's `dSbp`) in the last 2 min.
// Bands: tamponade ≥ 10 mmHg (pulsus paradoxus > 10 mmHg — Spodick DH, NEJM 2003;349:684–690 [P]); healthy < 5.
// Task 10 Step 1 (measured on the FU-4 tree, seed 7): the spontaneous pleural swing poked 4 / 8 / 12 cmH2O gave a
// tamponade SBP swing of 3.1 / 4.9 / 6.9 mmHg (healthy 2.4 / 3.8 / 5.4) — the swing is not the only short half: the
// ventricular interdependence is short (the named candidate: the inspiratory rise of systemic venous return into the RV
// inside a fixed pericardial volume). Step 2 is therefore NOT applied; the band stays it.fails with the number (R45; Q2).
// Two 10 sim-min runs, one yield per sim-minute (CI amendment 4): SLOW_B (Task 20).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';

type Beat = { t: number; sbp: number };
const beatsOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { hemo: { circ: { beats: Beat[] } } } }).st.hemo.circ.beats;

async function swing(severity: number): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
  if (severity > 0) e.dispatch({ id: 'pp1', issuedBy: 'test', type: 'applyEvent', event: { kind: 'condition', id: 'tamponade', severity } } as unknown as Command);
  const w: number[] = [];
  for (let t = 6; t <= 600; t += 6) {
    e.advanceTo(t);
    const bs = beatsOf(e).filter((b) => b.t > t - 6);
    if (t > 480 && bs.length > 2) w.push(Math.max(...bs.map((b) => b.sbp)) - Math.min(...bs.map((b) => b.sbp)));
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
}

describe('FU-4 G6: pulsus paradoxus (spontaneous breathing)', () => {
  it('healthy control: beat-to-beat SBP swing < 5 mmHg (measured 2.4)', async () => {
    const s = await swing(0);
    console.log(`healthy SBP swing ${s.toFixed(1)} mmHg`);
    expect(s).toBeLessThan(5);
  }, 300_000);
  it.fails('severe tamponade: pulsus paradoxus ≥ 10 mmHg (Spodick 2003) — measured 3.1 (swing 8 cmH2O: 4.9; 12: 6.9; Q2)', async () => {
    const s = await swing(1);
    console.log(`tamponade SBP swing ${s.toFixed(1)} mmHg`);
    expect(s).toBeGreaterThanOrEqual(10);
  }, 300_000);
});
