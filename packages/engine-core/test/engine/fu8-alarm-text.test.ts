// FU-8 Task A1 (F1, G-FU4 2026-09-29): a limit alarm prints the value the tile shows (research/05 §2.4, [S2]).
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED } from '../helpers/monitor.ts';

describe('FU-8 A1 (F1): a limit alarm prints the value the tile shows', () => {
  it('MANUAL MAP ladder 100 → 60 → 40 → 25 → 13: while ART_M_LOW stands its text carries the displayed mean (± 1) — before FU-8 it stayed "**ABPm 60<70" to MAP 13', async () => {
    const bp = (t: number, s: number, d: number): Array<[number, Record<string, unknown>]> => [[t, M.target('sbp', s)], [t, M.target('dbp', d)]];
    const run = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...bp(60, 135, 82), ...bp(180, 80, 50), ...bp(300, 55, 32), ...bp(420, 35, 20), ...bp(540, 18, 10)] });
    const rows = run.rows.filter((r) => r.active.some((a) => a.id === 'ART_M_LOW' && !a.latched) && r.m.abpMean?.flag === 'valid');
    expect(rows.length).toBeGreaterThan(100);
    const off = rows.map((r) => {
      const txt = (r.active.find((a) => a.id === 'ART_M_LOW') as { text: string }).text;
      return Math.abs(Number(/ABPm (\d+)</.exec(txt)?.[1]) - Math.round(r.m.abpMean?.value as number));
    });
    console.log(`fu8 A1: ${rows.length} rows with ART_M_LOW; worst text/tile gap ${Math.max(...off)} mmHg; last text "${(rows.at(-1)?.active.find((a) => a.id === 'ART_M_LOW') as { text: string }).text}"`);
    expect(Math.max(...off)).toBeLessThanOrEqual(1);
    expect(run.alarms.filter((a) => a.id === 'ART_M_LOW' && a.state === 'raised').length).toBe(1);
  }, 120_000);
});
