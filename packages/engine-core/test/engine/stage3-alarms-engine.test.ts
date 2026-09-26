// Stage 4b alarms on the REAL Stage 3 events (merge of Stage 3, request R-4b-1): capnograph and impedance apnoea
// re-issued with the skin's level and text, SpO2 / EtCO2 limit and desaturation alarms on Stage 3's numerics, and
// the EtCO2 rise after a shock that restores circulation (brief §6.5 "EtCO2 jumps", Stage 3's CO2 washout).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, NumericId } from '../../src/types.ts';
import { alarmsOf, cmd } from '../helpers/device.ts';
import { ADULT, ev3, numSeries, run, vent } from '../helpers/resp.ts';

type St = Extract<EngineEvent, { type: 'alarmStatus' }>;
type Ds = Extract<EngineEvent, { type: 'deviceStatus' }>;
function rig(skin: string, seed = 7) {
  const e = createEngine({ seed, patient: { ...ADULT, sensors: { co2: 'on' } }, device: { skin } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.dispatch(cmd({ type: 'attachSensor', sensor: 'co2', state: 'on', sampling: 'mainstream' }));
  return { e, ev };
}
const last = (ev: EngineEvent[], id: NumericId, t0: number, t1: number) => {
  const s = numSeries(ev, id, t0, t1);
  return s.length ? (s[s.length - 1] as [number, number])[1] : NaN;
};

describe('Stage 4b alarms on Stage 3 events', { timeout: 300_000 }, () => {
  it('ventilator disconnection: the capnograph apnoea (`apnoea-co2`) is raised with level 1 and the skin text, and is in alarmStatus', async () => {
    for (const [skin, text] of [['philips-like', '***APNEA'], ['saadat-like', 'CO2 APNEA']] as const) {
      const { e, ev } = rig(skin);
      e.dispatch(vent(12));
      await run(e, 60);
      e.dispatch(ev3({ kind: 'airway', state: 'disconnected' }));
      await run(e, 100);
      const a = alarmsOf(ev, 'apnoea-co2', 'raised')[0]!;
      expect(a).toMatchObject({ level: 1, priority: 'high', category: 'physiological', text });
      expect(a.t - 60).toBeGreaterThan(15);
      expect(a.t - 60).toBeLessThan(25);
      expect(ev.some((x) => x.type === 'alarm' && x.id === 'apnoea-co2' && x.level === undefined)).toBe(false); // the raw flag never leaves
      const st = ev.filter((x): x is St => x.type === 'alarmStatus').pop()!;
      expect(st.active.map((x) => x.id)).toContain('apnoea-co2');
    }
  });

  it('SpO2 and EtCO2 limit alarms and the desaturation alarm on Stage 3 numerics (philips-like 90–100 %, 30–50 mmHg)', async () => {
    const { e, ev } = rig('philips-like');
    e.dispatch(vent(12));
    await run(e, 30);
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 86 }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'etco2', value: 62 }));
    await run(e, 150);
    const lo = alarmsOf(ev, 'SpO2_LOW', 'raised')[0]!;
    expect(lo).toMatchObject({ level: 2 });
    expect(lo.text).toMatch(/^\*\*SpO2 8\d<90$/);
    const hi = alarmsOf(ev, 'EtCO2_HIGH', 'raised')[0]!;
    expect(hi.text).toMatch(/^\*\*etCO2 \d+>50$/);
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 70 }));
    await run(e, 260);
    const desat = alarmsOf(ev, 'DESAT', 'raised')[0]!;
    expect(desat).toMatchObject({ level: 1, text: '***DESAT' });
    const below80 = numSeries(ev, 'spo2', 150, 260).find(([, v]) => v < 80)!;
    expect(desat.t - below80[0]).toBeGreaterThanOrEqual(19.9); // brief §6.4 "desaturation (<80%, 20 s)"
  });

  it('a shock that restores circulation raises EtCO2 (Stage 3 CO2 washout after VF; instructor-converted to sinus)', async () => {
    const { e, ev } = rig('zoll-like');
    e.dispatch(vent(10));
    await run(e, 90);
    const before = last(ev, 'etco2', 80, 90);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    await run(e, 200);
    const inVf = last(ev, 'etco2', 190, 200);
    e.dispatch(ev3({ kind: 'defib', action: 'preselect', outcome: 'sinus' })); // the instructor's "convert" (brief §6.5)
    e.dispatch(ev3({ kind: 'defib', action: 'charge' }));
    await run(e, 210);
    e.dispatch(ev3({ kind: 'defib', action: 'shock' }));
    await run(e, 330);
    expect(ev.filter((x): x is Ds => x.type === 'deviceStatus').pop()!.defib!.lastShock!.outcome).toBe('sinus');
    const peak = Math.max(...numSeries(ev, 'etco2', 212, 330).map(([, v]) => v));
    console.log(`EtCO2 before VF ${before}, end of VF ${inVf}, peak after ROSC ${peak} (preselected sinus)`);
    expect(inVf).toBeLessThan(before - 10);
    expect(peak).toBeGreaterThan(inVf + 10);
  });
});
