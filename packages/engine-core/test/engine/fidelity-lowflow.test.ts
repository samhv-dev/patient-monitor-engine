// FU-5 monitor-fidelity suite item 1 (research/10 §13): the oximeter in low flow. Before FU-5 a 3 L bleed to MAP 2 /
// SV 0.6 mL showed SpO2 98 valid, PI 2.5, a pleth larger than at rest (the pulse was scaled to the last 16 beats), and
// Ali's tamponade case showed SpO2 98–99 / PI 1.9–2.3 at MAP 13–16 (audit §2, M1). Sources: brief §4.3 (amplitude
// PI × SV_i/SV_0, LOW PERF below PI 0.3, no pulse → invalid after 10–30 s); research/05 §6 [S2] p. 58–59 (LOW PERF
// keeps the value with "?", NON-PULSAT. replaces it).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, validShown, type Alarm, type MonRow } from '../helpers/monitor.ts';

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
/**
 * Raise→clear cycles shorter than `minS` of the alarms at `level` (review rulings 5 and 6, F7/F9: a technical INOP or a
 * red alarm must not flicker; after FU-4's arrests the agonal rhythm re-raised EXTREME BRADY 11 times in Ali's case).
 */
const shortCycles = (alarms: Alarm[], level: number, minS: number) => {
  const open: Record<string, number> = {};
  const bad: string[] = [];
  for (const a of alarms) {
    if (a.level !== level) continue;
    if (a.state === 'raised') open[a.id] = a.t;
    else if (a.state === 'cleared' && open[a.id] !== undefined) {
      if (a.t - (open[a.id] as number) < minS) bad.push(`${a.id}@${open[a.id]}+${(a.t - (open[a.id] as number)).toFixed(1)}`);
      delete open[a.id];
    }
  }
  return bad;
};
/** First row from which MAP stays < 30 for 20 s. */
const lowFlowOnset = (rows: MonRow[]) => rows.find((r, i) => rows.slice(i, i + 20).length === 20 && rows.slice(i, i + 20).every((x) => x.map < 30));

describe('FU-5 fidelity 1: SpO2, PI and pleth follow the perfusion', () => {
  it('MODELED 3 L bleed over 15 min: once MAP < 30 for 20 s the SpO2 is "?" or invalid, PI < 0.3, pleth ≤ 25 % of rest; never valid SpO2 with PR/PI invalid; no technical or red raise/clear cycle shorter than 5 s', async () => {
    const { rows, alarms } = await monitorRun({ mode: 'modeled', tEnd: 1100, steps: [...VENTED, [60, M.bleed(3000, 900)]] });
    const base = mean(rows.filter((r) => r.t >= 30 && r.t <= 60).map((r) => r.plethPtp));
    const on = lowFlowOnset(rows) as MonRow;
    expect(on).toBeDefined();
    const after = rows.filter((r) => r.t >= on.t + 20);
    for (const r of after) {
      expect(validShown(r.m.spo2)).toBe(false);
      if (r.m.pi?.value != null) expect(r.m.pi.value).toBeLessThan(0.3);
    }
    expect(mean(after.slice(0, 40).map((r) => r.plethPtp)) / base).toBeLessThanOrEqual(0.25);
    const contradictions = rows.filter((r) => r.t >= 10 && validShown(r.m.spo2) && (!validShown(r.m.pr) || !validShown(r.m.pi)));
    expect(contradictions.map((r) => r.t)).toEqual([]);
    expect(shortCycles(alarms, 3, 5)).toEqual([]); // no technical raise/clear cycle < 5 s (was LOW PERF ×7 at 1–2 s)
    expect(shortCycles(alarms, 1, 5)).toEqual([]); // no red one either
  }, 120_000);

  it("MODELED Ali's case (tamponade, propofol 2 + 1, PEEP 15, sevoflurane 2 %, bleed 2 L): at MAP < 30 the SpO2 is never shown valid; no technical or red raise/clear cycle shorter than 5 s", async () => {
    const { rows, alarms } = await monitorRun({ mode: 'modeled', tEnd: 2700, steps: [
      ...VENTED, [60, M.cond('tamponade', 1)], [660, M.drug('propofol', 2, 'mg/kg')], [900, M.drug('propofol', 1, 'mg/kg')],
      [1200, M.vent(15, 0.5)], [1500, M.vap('sevoflurane', 2)], [2100, M.bleed(2000, 300)],
    ] });
    const on = lowFlowOnset(rows);
    expect(on).toBeDefined();
    const after = rows.filter((r) => r.t >= (on as MonRow).t + 20);
    expect(after.filter((r) => validShown(r.m.spo2)).map((r) => r.t)).toEqual([]);
    expect(Math.max(...after.map((r) => r.m.pi?.value ?? 0))).toBeLessThan(0.3);
    expect(shortCycles(alarms, 3, 5)).toEqual([]);
    expect(shortCycles(alarms, 1, 5)).toEqual([]); // after FU-4's arrest this is the agonal EXTREME BRADY guard (Task 18)
  }, 120_000);
});

// FU-5 review, ruling 1 (Orchestrator ruling (FU-5 review), 2026-09-28): PI follows SV/SV₀ with a vasoconstriction-only
// factor (MODELED, ≤ 1; none in MANUAL). Guards: the normal patient's PI, the MANUAL ladder's direction, and the
// clinical rise after induction that waits for FU-4's cutaneous tone (R-FU5-9). Before FU-5 (origin/main, seed 7):
// rest PI 1.79 spontaneous / 1.80 ventilated MODELED / 1.70 MANUAL ventilated.
const piMean = (rows: MonRow[], a: number, b: number) => mean(rows.filter((r) => r.t >= a && r.t <= b && r.m.pi?.value != null).map((r) => r.m.pi?.value as number));
const bp = (t: number, s: number, d: number): Array<[number, Record<string, unknown>]> => [[t, M.target('sbp', s)], [t, M.target('dbp', d)]];

describe('FU-5 fidelity 1b: PI of the normal patient and its direction (review ruling 1)', () => {
  it('rest PI (30–58 s): MODELED spontaneous 1.82 and MANUAL ventilated 1.84, each ± 5 % (characterisation) and within ± 10 % of the L1 target 2', async () => {
    const spont = await monitorRun({ mode: 'modeled', tEnd: 60, steps: [] });
    const man = await monitorRun({ mode: 'manual', tEnd: 60, steps: [...VENTED] });
    for (const [rows, v] of [[spont.rows, 1.82], [man.rows, 1.84]] as const) {
      const pi = piMean(rows, 30, 58);
      expect(Math.abs(pi / v - 1)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(pi / 2 - 1)).toBeLessThanOrEqual(0.1);
    }
  }, 120_000);

  it.fails('ventilated normal patient (MODELED, PPV from 1 s): rest PI within ± 5 % of origin/main 1.80 — measured 1.49 (−17 %): SV₀ is the spontaneous settle (80 mL) against 68 mL under PPV; PI follows SV only until FU-4 publishes a cutaneous tone (R-FU5-9)', async () => {
    const { rows } = await monitorRun({ mode: 'modeled', tEnd: 60, steps: [...VENTED] });
    expect(Math.abs(piMean(rows, 30, 58) / 1.8 - 1)).toBeLessThanOrEqual(0.05);
  }, 120_000);

  it('MANUAL MAP ladder 106 → 99 → 61 → 45 → 44 → 38 (A1): PI never rises as MAP falls (was 1.92 → 2.18 at MAP 62 with the uncapped tone); 1.84 → 1.53 → 1.18 → 0.03', async () => {
    const { rows } = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...bp(60, 135, 82), ...bp(180, 80, 50), ...bp(300, 55, 32), ...bp(420, 35, 20), ...bp(540, 18, 10)] });
    const steps = [[30, 58], [120, 175], [240, 295], [360, 415], [480, 535], [600, 655]] as const;
    const pi = steps.map(([a, b]) => piMean(rows, a, b));
    const map = steps.map(([a, b]) => mean(rows.filter((r) => r.t >= a && r.t <= b).map((r) => r.map)));
    for (let i = 1; i < pi.length; i++) if ((map[i] as number) < (map[i - 1] as number)) expect(pi[i] as number, `MAP ${map[i - 1]?.toFixed(0)} → ${map[i]?.toFixed(0)}`).toBeLessThanOrEqual((pi[i - 1] as number) * 1.02);
    expect(pi[2] as number).toBeLessThanOrEqual(0.9 * (pi[0] as number)); // MAP 61: clearly lower than at rest
  }, 120_000);

  it.fails('propofol 2 mg/kg in a ventilated patient: PI RISES after induction (the sympatholysis sign) — measured 1.49 → 1.17 (−21 %) at 180–240 s (MAP 96 → 86, SV 68 → 55): PI follows SV only; the vasodilated finger needs FU-4\'s cutaneous tone (R-FU5-9)', async () => {
    const { rows } = await monitorRun({ mode: 'modeled', tEnd: 300, steps: [...VENTED, [60, M.drug('propofol', 2, 'mg/kg')]] });
    expect(piMean(rows, 180, 240)).toBeGreaterThan(piMean(rows, 30, 58));
  }, 120_000);
});
