// FU-5 monitor-fidelity suite items 11, 14, 15 (research/10 §13): limit hygiene, Silence per vendor, a quiet start.
// Sources: research/05 §6 [S2] IFU p. 11, 32 (Silence acknowledges; new alarms sound), [S4] §10.8 (Mindray Alarm Reset),
// research/06 §4.2 (Saadat: Silence mutes 120 s with the visuals; any new alarm ends it); audit M6, M14.
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const raises = (run: MonRun, id: string) => run.alarms.filter((a) => a.id === id && a.state === 'raised');

describe('FU-5 fidelity 11: limit hygiene', () => {
  it('MANUAL CVP 10 and HR 50 on the philips-like limits for 3 min: no CVP alarm at the limit, no raise/clear cycle shorter than 5 s, texts beyond the limit', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    // FU-5 Task 9a (R45 re-measure): the start-up raise comes 3 s later with philips-like's alarm on-delay (17 s; was 14 s
    // with the [ENG] 0 s), so the start window it is excluded by is 15 + 3 s
    expect(raises(run, 'CVP_M_HIGH').filter((a) => a.t > 15 + 3)).toHaveLength(0);
    for (const id of ['HR_LOW', 'CVP_M_HIGH']) {
      const ev = run.alarms.filter((a) => a.id === id);
      for (let i = 0; i + 1 < ev.length; i++) if (ev[i]?.state === 'raised' && ev[i + 1]?.state === 'cleared') expect((ev[i + 1] as { t: number }).t - (ev[i] as { t: number }).t).toBeGreaterThanOrEqual(5);
    }
    for (const a of raises(run, 'HR_LOW')) expect(a.text).toMatch(/^\*\*HR (\d+)<50$/);
    for (const a of raises(run, 'HR_LOW')) expect(Number(/HR (\d+)</.exec(a.text)?.[1])).toBeLessThan(50);
  }, 120_000);

  // FU-5 Task 9a, R45 re-statement (the orchestrator's ruling on Open question 20, the vendor alarm on-delay): was
  // "philips-like re-alarms ≤ 4 times … Philips publishes no alarm delay … a delay-0 monitor" (4 raises measured); with
  // philips-like's 3 s on-delay (IFU [S2] p. 28, 294) no dip below 50 lasts 3 s, and it raises nothing.
  it('HR wandering 49–51 on the limit 50 for 3 min (Open question 8, decided — Orchestrator ruling (FU-5 review), 2026-09-28, ruling 8): philips-like raises nothing — a characterisation row: its 3 s alarm on-delay (the IntelliVue system alarm delay, [S2] p. 28, 294; FU-5 Task 9a) outlasts every dip below 50 (4 raises with the former 0 s); mindray-like raises nothing either: its documented 6 s delay ([S4] §10.6.5, §39.4.6 — "if the alarm condition is resolved within the delay time, the monitor does not present the alarm") now ends when the displayed HR is back at 50 (FU-5 Task 9a: the hysteresis band holds a raised alarm only, not a pending one; was 4 raises at 40, 100, 130, 180 s); the 6 s mechanism is asserted in fu5-ondelay', async () => {
    const ph = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    expect(raises(ph, 'HR_LOW')).toHaveLength(0);
    const mr = await monitorRun({ mode: 'manual', skin: 'mindray-like', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    expect(raises(mr, 'HR_LOW')).toHaveLength(0);
  }, 120_000);

  it.fails('CVP limit chatter on a stable ventilated patient: CVP_M_HIGH raised ≤ 2 times in the 11-min MANUAL rhythm tour (the audit\'s chatter criterion) — measured 4 on philips-like and 4 on mindray-like with the vendor alarm on-delays (FU-5 Task 9a; 11 and 9 before it; 5 in the A1 MAP ladder and 1 in the G1 hover before it, was 100): the displayed CVP swings 9–11 across the limit 10 with the ventilation and the rhythm changes, wider than D9\'s one-unit hysteresis (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const tour: Step[] = [
      [60, M.rhythm('sinus', { rateBpm: 30 })], [120, M.rhythm('sinusBrady', { rateBpm: 35 })], [180, M.rhythm('junctionalEscape', { rateBpm: 40 })],
      [240, M.rhythm('afib', { rateBpm: 140 })], [300, M.rhythm('vtMono', { rateBpm: 180 })], [360, M.rhythm('sinus', { rateBpm: 75 })],
      [420, M.rhythm('avb3Wide', { rateBpm: 32 })], [480, M.rhythm('pacedVVI', { pacer: { ratePpm: 70 } })], [540, M.rhythm('sinusTachy', { rateBpm: 187 })], [600, M.rhythm('sinus', { rateBpm: 75 })],
    ];
    const run = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...tour] });
    expect(raises(run, 'CVP_M_HIGH').length).toBeLessThanOrEqual(2);
  }, 120_000);

  it('MODELED core 37 → 34 °C: the TEMP LOW text carries one decimal ("**Temp 35.9<36.0", was "**Temp 36<36")', async () => {
    const pin = (c: number) => (e: unknown) => {
      (e as { st: { resp: { temp: { pinCoreTemp: number } } } }).st.resp.temp.pinCoreTemp = c;
    };
    const run = await monitorRun({ mode: 'modeled', tEnd: 400, steps: [...VENTED, ...[0, 1, 2, 3, 4, 5].map((i) => [60 + 60 * i, pin(37 - (3 * i) / 5)] as Step)] });
    const t = raises(run, 'TEMP_LOW')[0];
    expect(t?.text).toMatch(/^\*\*Temp 3\d\.\d<36\.0$/);
  }, 120_000);
});

describe('FU-5 fidelity 14: Silence per vendor (asystole at 30 s, Silence at 45 s, VF at 60 s)', () => {
  it.each([['philips-like', 'acknowledge'], ['mindray-like', 'acknowledge'], ['saadat-like', 'mute']] as const)('%s (%s): the new VFIB during the silence sounds and is shown', async (skin, mode) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 90, steps: [...VENTED, [30, M.rhythm('asystole')], [45, M.alarm('silence')], [60, M.rhythm('vfCoarse')]] });
    const r50 = run.rows.find((r) => r.t === 50) as MonRun['rows'][number];
    if (mode === 'acknowledge') {
      expect(r50.silencedUntil).toBeNull(); // no mute timer: the ASYSTOLE is acknowledged
      expect(r50.active.find((a) => a.id === 'ASYSTOLE')).toMatchObject({ acked: true, sounding: false });
    } else expect(r50.silencedUntil).toBeGreaterThan(160);
    const vf = raises(run, 'VFIB')[0] as { t: number };
    const after = run.rows.find((r) => r.t >= vf.t + 1) as MonRun['rows'][number];
    expect(after.silencedUntil).toBeNull(); // saadat-like: any new alarm ends the silence
    expect(after.active.find((a) => a.id === 'VFIB')).toMatchObject({ acked: false, sounding: true });
  }, 120_000);
});

describe('FU-5 fidelity 15: a stable patient starts quietly', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: no alarm raised in the first 15 s (was **etCO2 0<30 and **ABPd 0<50 at 1 s)', async (skin) => {
    const run = await monitorRun({ mode: 'modeled', skin, tEnd: 20, steps: [...VENTED] });
    expect(run.alarms.filter((a) => a.state === 'raised' && a.t < 15).map((a) => a.id)).toEqual([]);
  }, 120_000);
});
