// FU-4 G6 (Task 10) → E118 (rc.4): pulsus paradoxus. Tamponade (MODELED, seed 7, 70 kg), 10 sim-min; the beat-to-beat
// SBP swing (max − min over 6 s windows, the audit runner's `dSbp`) in the last 2 min.
// Bands: severe tamponade (250 mL) spontaneous ≥ 10 mmHg (pulsus paradoxus > 10 mmHg — Spodick DH, NEJM
// 2003;349:684–690 [P]); mild tamponade (100 mL) and the healthy control ≤ 5; positive-pressure ventilation keeps the
// size and sign it had before E118 (main a4163165, measured: severe tamponade 2.58 mmHg, healthy 1.50, the systolic
// pressure RISING with the inflation — the reversed pulsus of positive-pressure ventilation, Massumi et al. NEJM
// 1973;289:1272 [P, not re-read]).
// The mechanism (E118): the tamponade's own inspiratory effort (circ/conditions.ts TAMPONADE_SWING_CMH2O) and the
// septal interaction (circ/params.ts SEPT_*). Before it (main a4163165): severe 3.41, mild 3.67, healthy 2.38.
// Five 10 sim-min runs, one yield per sim-minute (CI amendment 4): SLOW_B (Task 20).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';

type Beat = { t: number; sbp: number; sv: number; pItEd?: number };
const beatsOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { hemo: { circ: { beats: Beat[] } } } }).st.hemo.circ.beats;
const cmd = (c: Record<string, unknown>) => ({ id: `pp${Math.random()}`, issuedBy: 'test', ...c }) as unknown as Command;

/** Mean 6 s SBP swing over the last 2 min, and the correlation of each beat's SBP with its end-diastolic pleural
 * pressure (the sign of the respiratory change: > 0 when the systolic pressure follows the intrathoracic pressure). */
async function run(severity: number, ventilated = false): Promise<{ swing: number; corr: number; svFall: number }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
  if (ventilated) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } }));
  if (severity > 0) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'tamponade', severity } }));
  const w: number[] = [];
  const sf: number[] = [];
  const pairs: [number, number][] = [];
  for (let t = 6; t <= 600; t += 6) {
    e.advanceTo(t);
    const bs = beatsOf(e).filter((b) => b.t > t - 6);
    if (t > 480 && bs.length > 2) {
      w.push(Math.max(...bs.map((b) => b.sbp)) - Math.min(...bs.map((b) => b.sbp)));
      const svMax = Math.max(...bs.map((b) => b.sv));
      sf.push((svMax - Math.min(...bs.map((b) => b.sv))) / svMax);
      for (const b of bs) if (b.pItEd !== undefined) pairs.push([b.pItEd, b.sbp]);
    }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  const mx = pairs.reduce((a, p) => a + p[0], 0) / pairs.length;
  const my = pairs.reduce((a, p) => a + p[1], 0) / pairs.length;
  let cov = 0, vx = 0, vy = 0;
  for (const [x, y] of pairs) { cov += (x - mx) * (y - my); vx += (x - mx) ** 2; vy += (y - my) ** 2; }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  return { swing: mean(w), corr: cov / Math.sqrt(vx * vy), svFall: mean(sf) };
}

describe('pulsus paradoxus (E118)', () => {
  it('healthy control, spontaneous: beat-to-beat SBP swing ≤ 5 mmHg (measured 2.4)', async () => {
    const { swing, svFall } = await run(0);
    console.log(`healthy SV fall ${(100 * svFall).toFixed(1)} %`);
    console.log(`healthy SBP swing ${swing.toFixed(2)} mmHg`);
    expect(swing).toBeLessThanOrEqual(5);
    expect(svFall).toBeLessThan(0.1); // measured 4.7 %
  }, 300_000);
  it('mild tamponade (100 mL), spontaneous: swing ≤ 5 mmHg (measured 4.1)', async () => {
    const { swing } = await run(0.4);
    console.log(`mild tamponade SBP swing ${swing.toFixed(2)} mmHg`);
    expect(swing).toBeLessThanOrEqual(5);
  }, 300_000);
  it('severe tamponade (250 mL), spontaneous: pulsus paradoxus ≥ 10 mmHg (Spodick 2003; measured 10.8)', async () => {
    const { swing, corr, svFall } = await run(1);
    console.log(`severe tamponade SV fall ${(100 * svFall).toFixed(1)} %`);
    console.log(`severe tamponade SBP swing ${swing.toFixed(2)} mmHg (corr ${corr.toFixed(2)})`);
    expect(swing).toBeGreaterThanOrEqual(10);
    expect(corr).toBeGreaterThan(0); // The systolic pressure falls as the pleural pressure falls (inspiration)
    // An observable the effort was not sized on: the inspiratory fall of LV stroke volume, aortic VTI −33 ± 13 % in
    // tamponade (Leeman, Levine & Come, J Am Coll Cardiol 1988;11:572 [P, abstract]); measured 38.2 % (before E118: 15 %)
    expect(svFall).toBeGreaterThanOrEqual(0.2);
    expect(svFall).toBeLessThanOrEqual(0.46);
  }, 300_000);
  it('positive-pressure ventilation, severe tamponade: size and sign as before E118 (2.58 ± 0.5 mmHg, rises with the inflation; measured 2.73)', async () => {
    const { swing, corr } = await run(1, true);
    console.log(`ventilated tamponade SBP swing ${swing.toFixed(2)} mmHg (corr ${corr.toFixed(2)}; before E118 2.58, 0.52)`);
    expect(Math.abs(swing - 2.58)).toBeLessThanOrEqual(0.5);
    expect(corr).toBeGreaterThan(0.3);
  }, 300_000);
  it('positive-pressure ventilation, healthy: size and sign as before E118 (1.50 ± 0.3 mmHg)', async () => {
    const { swing, corr } = await run(0, true);
    console.log(`ventilated healthy SBP swing ${swing.toFixed(2)} mmHg (corr ${corr.toFixed(2)}; before E118 1.50, 0.82)`);
    expect(Math.abs(swing - 1.5)).toBeLessThanOrEqual(0.3);
    expect(corr).toBeGreaterThan(0.6);
  }, 300_000);
});
