// FU-5 monitor-fidelity suite item 10 (research/10 §13, audit M4): the cuff measures a narrow pulse pressure with an
// adequate MAP and fails honestly in real shock. Sources: brief §4.5 ("SBP below about 50–60 fails", 2 attempts);
// research/05 §6 [S2] IFU p. 303 (Philips initial inflation 165 mmHg). The AF bias is Stage 2's acceptance 9
// (test/engine/hemo-nibp.test.ts, AF 75: |bias| ≤ 6).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, type MonRun } from '../helpers/monitor.ts';

const results = (run: MonRun) => run.nibp.filter((x) => x.result !== undefined);
const artAt = (run: MonRun, t: number, k: 'abpSys' | 'abpDia') => avg(run.rows.filter((r) => r.t > t - 30 && r.t <= t && r.m[k]?.value != null).map((r) => r.m[k]?.value as number));
const truthAt = (run: MonRun, t: number, k: 'sbp' | 'dbp') => avg(run.rows.filter((r) => r.t > t - 30 && r.t <= t).map((r) => r[k]));
const artMeanAt = (run: MonRun, t: number) => run.rows.filter((r) => r.t > t - 30 && r.t <= t && r.m.abpMean?.value != null).map((r) => r.m.abpMean?.value as number);
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-5 fidelity 10: NIBP envelope', () => {
  it('MANUAL pulse pressure 10 at MAP 70 (77/67): measures, MAP within ± 8 of the arterial line (was FAILED: PP ≤ 20 never measured)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0];
    expect(r).toBeDefined();
    expect(Math.abs((r?.result?.map ?? 0) - avg(artMeanAt(run, r?.t ?? 0)))).toBeLessThanOrEqual(8);
  }, 120_000);

  it.fails('MANUAL pulse pressure 10 (77/67): the cuff shows the narrow pulse pressure — S/D within ± 8 of the instructor\'s 77/67 — measured 80/56 (PP 24); the truth reaches only 81/62 (PP 19: the MANUAL tracker, FU-4\'s side) and the cuff widens it by 5 (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0];
    expect(Math.abs((r?.result?.sys ?? 0) - 77)).toBeLessThanOrEqual(8);
    expect(Math.abs((r?.result?.dia ?? 0) - 67)).toBeLessThanOrEqual(8);
  }, 120_000);

  it('MANUAL pulse pressure 10 (77/67): S/D within ± 8 of the arterial line (80/56 against 81/62)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0] as MonRun['nibp'][number];
    expect(Math.abs((r.result?.sys ?? 0) - artAt(run, r.t, 'abpSys'))).toBeLessThanOrEqual(8);
    expect(Math.abs((r.result?.dia ?? 0) - artAt(run, r.t, 'abpDia'))).toBeLessThanOrEqual(8);
  }, 120_000);

  it('MANUAL AF 150, NIBP auto 1 min, 11 cycles: |bias| ≤ 6 mmHg against the displayed arterial line (Stage 2 acceptance 9\'s definition, there at AF 75) — measured SBP +0.1, DBP +3.6', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 780, steps: [...VENTED, [30, M.rhythm('afib', { rateBpm: 150 })], [60, M.nibp('auto', 1)]] });
    const rs = results(run);
    expect(rs.length).toBeGreaterThanOrEqual(10);
    expect(Math.abs(avg(rs.map((x) => (x.result?.sys ?? 0) - artAt(run, x.t, 'abpSys'))))).toBeLessThanOrEqual(6);
    expect(Math.abs(avg(rs.map((x) => (x.result?.dia ?? 0) - artAt(run, x.t, 'abpDia'))))).toBeLessThanOrEqual(6);
  }, 120_000);

  it.fails('MANUAL AF 150, 11 cycles: |SBP bias| ≤ 6 mmHg against the TRUE radial pressure (the audit\'s AF criterion) — measured +10.8 (the first two readings 125/78 and 117/67: +24 and +13; DBP +2.7): the truth beat-mean counts AF\'s non-ejecting beats (FU-4\'s T2, ruling 5 there), which the cuff and the line do not see; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 780, steps: [...VENTED, [30, M.rhythm('afib', { rateBpm: 150 })], [60, M.nibp('auto', 1)]] });
    const rs = results(run);
    expect(Math.abs(avg(rs.map((x) => (x.result?.sys ?? 0) - truthAt(run, x.t, 'sbp'))))).toBeLessThanOrEqual(6);
  }, 120_000);

  it('MANUAL shock ladder: MAP 60 and MAP 45 measure (within ± 10 of the arterial mean)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 400, steps: [...VENTED, [60, M.target('sbp', 80)], [60, M.target('dbp', 50)], [100, M.nibp('start')], [200, M.target('sbp', 60)], [200, M.target('dbp', 36)], [260, M.nibp('start')]] });
    const rs = results(run);
    expect(rs).toHaveLength(2);
    for (const r of rs) expect(Math.abs((r.result?.map ?? 0) - avg(artMeanAt(run, r.t)))).toBeLessThanOrEqual(10);
  }, 120_000);

  it('MODELED 3 L bleed, NIBP auto 1 min: every cycle while the arterial mean is ≥ 40 measures (± 10); every cycle below 20 fails', async () => {
    const run = await monitorRun({ mode: 'modeled', tEnd: 1500, steps: [...VENTED, [60, M.bleed(3000, 900)], [300, M.nibp('auto', 1)]] });
    for (const x of run.nibp) {
      const m = avg(artMeanAt(run, x.t));
      if (m >= 40) expect(x.result, `cycle at ${x.t} s, ART mean ${m.toFixed(0)}`).toBeDefined();
      if (m >= 40 && x.result) expect(Math.abs(x.result.map - m)).toBeLessThanOrEqual(10);
      if (m < 20) expect(x.phase, `cycle at ${x.t} s, ART mean ${m.toFixed(0)}`).toBe('failed');
    }
  }, 120_000);
});
