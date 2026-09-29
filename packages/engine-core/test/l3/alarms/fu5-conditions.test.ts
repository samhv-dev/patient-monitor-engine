// FU-5 alarm conditions (research/10 audit M3, M7, M13; research/00 "FU-5 opened"): the HR source, the chain table,
// extreme rates without arrhythmia analysis, the event hold. Synthetic inputs; the manager stepped at the 20 ms tick.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});
const live = (c: Condition[]) => c.filter((x) => !x.suppressed).map((x) => x.id).sort();
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}

describe('FU-5 conditions: HR source (audit M3)', () => {
  it('philips-like (Alarm Source Auto, [S2] p. 108): leads off → the pulse is the alarm source, "**Pulse 130>120"; zoll-like (ECG): no HR alarm', () => {
    const inp = createInputs();
    inp.leadsOff = true;
    observeEvent(inp, meas(10, { pr: 130 }));
    const ph = buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 10);
    expect(live(ph)).toEqual(['HR_HIGH', 'ecgLeadsOff']);
    expect(ph.find((c) => c.id === 'HR_HIGH')?.text).toBe('**Pulse 130>120');
    expect(live(buildConditions(createAlarmMgr(deviceProfile('zoll-like')), inp, 10))).toEqual(['ecgLeadsOff']);
    observeEvent(inp, meas(11, { prAbp: 30 })); // the arterial line's rate comes first when valid (skin autoPriority)
    expect(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 11).filter((c) => !c.suppressed).map((c) => c.id).sort()).toEqual(['EXTREME_BRADY', 'ecgLeadsOff']);
  });
});

describe('FU-5 conditions: chaining (audit M7)', () => {
  it('ASYSTOLE suppresses HR LOW; VFIB suppresses HR HIGH, VTAC and EXTREME TACHY; extreme rates alarm with arrhythmia analysis OFF ([S2] p. 89)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like')); // OR configuration: arrhythmia analysis off
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 141 }));
    const tachy = buildConditions(s, inp, 10);
    expect(live(tachy)).toEqual(['EXTREME_TACHY']);
    expect(tachy.find((c) => c.id === 'HR_HIGH')?.suppressed).toBe(true);
    observeEvent(inp, meas(15, { hr: 0 }));
    expect(live(buildConditions(s, inp, 15))).toEqual(['ASYSTOLE']);
    inp.vfSince = 20;
    observeEvent(inp, meas(24, { hr: 160 }));
    expect(live(buildConditions(s, inp, 24))).toEqual(['VFIB']);
  });

  it('mindray-like: absolute extreme limits 160/35 ([S4] App. C.1.1), not HR limit ± 20', () => {
    const s = createAlarmMgr(deviceProfile('mindray-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 150 }));
    expect(live(buildConditions(s, inp, 10))).toEqual(['HR_HIGH']);
    observeEvent(inp, meas(11, { hr: 161 }));
    expect(live(buildConditions(s, inp, 11))).toEqual(['EXTREME_TACHY']);
  });

  it('one apnoea: APNEA suppresses RR LOW and EtCO2 LOW', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 39.9);
    observeEvent(inp, meas(40, { rr: 0, etco2: 0, awrr: 0 }));
    observeEvent(inp, { type: 'alarm', t: 40, id: 'apnoea-co2', priority: 'high', category: 'physiological', state: 'raised', text: 'APNEA' });
    expect(live(buildConditions(s, inp, 40))).toEqual(['apnoea-co2']);
  });

  it('a superseded alarm is CLEARED, not latched (philips-like latches red visually)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const XT: Condition = { id: 'EXTREME_TACHY', level: 1, category: 'physiological', text: '***EXTREME TACHY', delayS: 0 };
    const VF: Condition = { id: 'VFIB', level: 1, category: 'physiological', text: '***VFIB/VTACH', delayS: 0 };
    const ev = run(s, 0, 4, (t) => (t < 2 ? [XT] : [VF, { ...XT, suppressed: true }]));
    expect(ev.some((e) => e.type === 'alarm' && e.id === 'EXTREME_TACHY' && e.state === 'cleared')).toBe(true);
    expect(s.active.EXTREME_TACHY).toBeUndefined();
    expect(s.active.VFIB?.latched).toBe(false);
    run(s, 4.02, 5, () => []); // VF converts: VFIB latches (red, visual)
    expect(s.active.VFIB).toMatchObject({ latched: true, sounding: false });
  });

  it('HR hovering across the extreme-tachy threshold (140 on philips-like): no HR HIGH while EXTREME TACHY is live, and no zero-length HR HIGH raise/clear pair in the tick in which EXTREME TACHY ends (its entry was live the tick before)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    for (let k = 0; k <= Math.round(30 / TICK); k++) {
      const t = k * TICK;
      if (k % 20 === 0) observeQrs(inp, t);
      if (k % 50 === 0) observeEvent(inp, meas(t, { hr: Math.floor(t) % 2 ? 135 : 141 }));
      stepAlarms(s, t, buildConditions(s, inp, t), out);
      if (s.active.EXTREME_TACHY && !s.active.EXTREME_TACHY.latched) expect(s.active.HR_HIGH, `t ${t.toFixed(2)}`).toBeUndefined();
    }
    const hh = out.filter((e) => e.type === 'alarm' && e.id === 'HR_HIGH') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(out.some((e) => e.type === 'alarm' && e.id === 'EXTREME_TACHY' && e.state === 'raised')).toBe(true);
    for (let i = 0; i + 1 < hh.length; i++) if (hh[i]?.state === 'raised' && hh[i + 1]?.state === 'cleared') expect((hh[i + 1] as { t: number }).t).toBeGreaterThan((hh[i] as { t: number }).t); // 22 zero-length pairs in Ali's case before
  });

  it('a LATCHED alarm suppresses nothing (review ruling 2, [S2] IFU p. 97, 99): after a latched ASYSTOLE (philips-like), a post-ROSC HR 45 raises HR LOW', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    for (let k = 0; k <= Math.round(30 / TICK); k++) {
      const t = k * TICK;
      if (t >= 10 && k % 67 === 0) { // ROSC at 10 s: 45/min
        observeQrs(inp, t);
        observeEvent(inp, meas(t, { hr: 45 }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    expect(s.active.ASYSTOLE).toMatchObject({ latched: true, acked: false });
    expect(s.active.HR_LOW).toMatchObject({ latched: false });
    expect(out.some((e) => e.type === 'alarm' && e.id === 'HR_LOW' && e.state === 'raised')).toBe(true);
  });

  it('agonal beats (R–R ≥ 2.5 s) keep a standing ASYSTOLE, so EXTREME BRADY is not raised on each beat (review ruling 6); two beats closer than that end it', () => {
    for (const skin of ['philips-like', 'mindray-like']) {
      const s = createAlarmMgr(deviceProfile(skin));
      const inp = createInputs();
      const out: EngineEvent[] = [];
      const beatsAt = [12, 16.5, 20, 25.5, 29, 33.5, 37, ...Array.from({ length: 10 }, (_, i) => 42 + 0.8 * i)]; // agonal from 6 s, 75/min from 42 s
      for (let k = 0; k <= Math.round(50 / TICK); k++) {
        const t = k * TICK;
        if (t < 6 && k % 40 === 0) observeQrs(inp, t);
        for (const b of beatsAt) if (Math.abs(t - b) < TICK / 2) {
          observeQrs(inp, t);
          observeQrs(inp, t + 0.12); // the detector fires twice on a wide agonal complex (measured)
          observeEvent(inp, meas(t, { hr: t < 42 ? 13 : 75 }));
        }
        stepAlarms(s, t, buildConditions(s, inp, t), out);
      }
      const raised = (id: string) => out.filter((e) => e.type === 'alarm' && e.id === id && e.state === 'raised').length;
      expect(raised('ASYSTOLE'), skin).toBe(1);
      expect(raised('EXTREME_BRADY') + raised('HR_LOW'), skin).toBe(0);
      expect(s.active.ASYSTOLE?.latched ?? true, skin).toBe(true); // ended by the returning rhythm: latched (philips) or cleared
    }
  });
});

describe('FU-5 conditions: event hold (audit M13)', () => {
  it('a PAUSE alarm stays ≥ 5 s even when its condition lasts one tick', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'arrhythmiaAnalysis', value: true }, 0, []);
    const PAUSE: Condition = { id: 'PAUSE', level: 2, category: 'physiological', text: '**PAUSE', delayS: 0, holdS: 5 };
    run(s, 0, 0.02, () => [PAUSE]);
    run(s, 0.04, 4.9, () => []);
    expect(s.active.PAUSE).toBeDefined();
    run(s, 4.92, 5.1, () => []);
    expect(s.active.PAUSE).toBeUndefined();
  });
});
