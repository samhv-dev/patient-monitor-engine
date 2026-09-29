// FU-5 Task 9a (Orchestrator ruling on the plan's Open question 20): the vendor's ALARM ON-DELAY for the (yellow) limit
// alarms — a delay before a limit alarm is RAISED, never a hold that suppresses (ruling 2's "a latched alarm suppresses
// nothing" stands). The blips it removes: an HR hovering on philips-like's extreme-tachy threshold (120 + 20) ended
// EXTREME TACHY after its 5 s clear delay, and `**HR` HIGH was raised for 1–3 s until the extreme alarm came back
// (harness A2 ×5 at 2 937–2 999 s, A8/A8e ×3 at 576–597 s, measured on the plan's prototype).
// Per-skin values and sources (skin JSON provenance, packages/skins/CONTRACT.md "FU-5"):
//   philips-like 3 s — IntelliVue IFU [S2] §3 "Alarms are indicated after the alarm delay time … the system delay time
//     plus the trigger delay time for the individual measurement" (p. 28) and §32 "Alarm signal: System delay less than
//     3 seconds" (p. 294); the trigger delay (averaging) is the engine's own numeric; SpO2 10 s ([S1] p. 66);
//   mindray-like 6 s — BeneVision N [S4] §10.6.5 and §39.4.6 factory default "Alarm Delay 6 sec";
//   saadat-like 1 s — research/06 §4.2 [M p.50] "less than 1 s";
//   IEC default (zoll-, lifepak-, ge-like) 0 s [ENG] — no vendor on-delay found in research/05 (these skins carry no
//     limit table, so no limit alarm is raised on them at all).
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile, type DeviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
const TICK = 0.02;
const meas = (t: number, hr: number): EngineEvent => ({ type: 'measurement', t, values: { hr: { value: hr, flag: 'valid', at: t } } });

/** HR 145 with dips to 137 (inside the extreme threshold 140, above the HR HIGH limit 120) of the given lengths. */
function hover(p: DeviceProfile, dips: readonly number[]): Alarm[] {
  const s = createAlarmMgr(p);
  const inp = createInputs();
  const out: EngineEvent[] = [];
  const seg: [number, number][] = [];
  let t0 = 5;
  for (const d of dips) { seg.push([t0 + 12, t0 + 12 + d]); t0 += 12 + d; }
  const tEnd = t0 + 12;
  const hr = (t: number) => (seg.some(([a, b]) => t >= a && t < b) ? 137 : 145);
  for (let k = 0; k <= tEnd / TICK; k++) {
    const t = k * TICK;
    if (k % 50 === 0) {
      observeQrs(inp, t);
      observeEvent(inp, meas(t, hr(t)));
    }
    stepAlarms(s, t, buildConditions(s, inp, t), out);
  }
  return out.filter((e): e is Alarm => e.type === 'alarm');
}
/** HR HIGH raise→clear pairs no longer than maxS (the blips). */
function blips(ev: Alarm[], maxS = 3): number[] {
  const res: number[] = [];
  let up: number | null = null;
  for (const e of ev.filter((x) => x.id === 'HR_HIGH')) {
    if (e.state === 'raised') up = e.t;
    else if (e.state === 'cleared' && up !== null) { if (e.t - up <= maxS + 1e-9) res.push(+(e.t - up).toFixed(2)); up = null; }
  }
  return res;
}
const DIPS = [6, 7, 7.5, 6.5, 7, 8] as const; // each dip outlasts the 5 s extreme clear delay by 1–3 s

describe('FU-5 Task 9a: the vendor alarm on-delay for limit alarms (ruling on Open question 20)', () => {
  it('per-skin on-delay: philips-like 3 s ([S2] system delay < 3 s), mindray-like 6 s ([S4] factory), saadat-like 1 s (research/06 "< 1 s"), IEC default 0 s [ENG]; philips-like SpO2 10 s ([S1] p. 66)', () => {
    expect(deviceProfile('philips-like').delayS).toBe(3);
    expect(deviceProfile('philips-like').spo2DelayS).toBe(10);
    expect(deviceProfile('mindray-like').delayS).toBe(6);
    expect(deviceProfile('saadat-like').delayS).toBe(1);
    for (const k of ['zoll-like', 'lifepak-like', 'ge-like']) expect(deviceProfile(k).delayS).toBe(0);
  });

  it('philips-like: HR hovering 137–145 on the extreme-tachy threshold 140 raises EXTREME TACHY and NO 1–3 s `**HR` HIGH blip', () => {
    const ev = hover(deviceProfile('philips-like'), DIPS);
    expect(ev.filter((e) => e.id === 'EXTREME_TACHY' && e.state === 'raised').length).toBeGreaterThanOrEqual(1);
    expect(blips(ev)).toEqual([]);
    expect(ev.filter((e) => e.id === 'HR_HIGH' && e.state === 'raised')).toEqual([]);
  });

  it('the on-delay delays, it never suppresses: a 15 s dip (17–32 s) raises `**HR 137>120` 3 s after the extreme alarm stopped being live (5 s clear delay, so ≈ 25 s) and holds it until the HR is back above 140', () => {
    const hi = hover(deviceProfile('philips-like'), [15]).filter((e) => e.id === 'HR_HIGH');
    expect(hi.map((e) => e.state)).toEqual(['raised', 'cleared']);
    expect(hi[0]!.text).toBe('**HR 137>120');
    expect(hi[0]!.t).toBeGreaterThan(17 + 5 + 3 - 0.1);
    expect(hi[0]!.t).toBeLessThan(17 + 5 + 3 + 1.1);
    expect(hi[1]!.t).toBeGreaterThanOrEqual(32);
    expect(hi[1]!.t).toBeLessThan(33.1);
  });

  it('characterisation: the same philips-like profile with no on-delay (the pre-ruling 0 s [ENG]) shows the 1–3 s blips the delay removes', () => {
    expect(blips(hover({ ...deviceProfile('philips-like'), delayS: 0 }, DIPS))).toEqual([1, 2, 3, 1, 2, 3]);
  });
  it('mindray-like: the 6 s on-delay ([S4] §10.6.5) — HR 48 for 5.9 s raises nothing; HR 48 held raises `**HR 48<50` 6 s after the first displayed value below the limit; back at 50 within the delay resolves the pending (no hysteresis while pending)', () => {
    const run = (hrAt: (t: number) => number, tEnd: number) => {
      const s = createAlarmMgr(deviceProfile('mindray-like'));
      const inp = createInputs();
      const out: EngineEvent[] = [];
      for (let k = 0; k <= tEnd / TICK; k++) {
        const t = k * TICK;
        if (k % 50 === 0) { observeQrs(inp, t); observeEvent(inp, meas(t, hrAt(t))); }
        stepAlarms(s, t, buildConditions(s, inp, t), out);
      }
      return out.filter((e): e is Alarm => e.type === 'alarm' && e.id === 'HR_LOW');
    };
    expect(run((t) => (t >= 10 && t < 15.9 ? 48 : 60), 40)).toEqual([]);
    expect(run((t) => (t >= 10 && t < 14 ? 48 : t >= 14 && t < 15 ? 50 : t >= 15 && t < 19 ? 48 : 60), 40)).toEqual([]);
    const held = run((t) => (t >= 10 ? 48 : 60), 40);
    expect(held.map((e) => [e.state, e.text])).toEqual([['raised', '**HR 48<50']]);
    expect(held[0]!.t).toBeCloseTo(16, 1);
  });
});
