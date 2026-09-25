// Stage 3 hooks (request R-4b-1, orchestrator brief for 4b): APNEA, the CO2 line INOP and the SpO2 / EtCO2 limit
// alarms, driven here by SYNTHETIC events in the shapes brief §7.3 defines (`breath`, `measurement`) and the raw
// L2 alarm ids Stage 3's plan emits (`apnoea-co2`, `apnoea-resp`), so they light up when Stage 3 merges.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { APNEA_DEFAULT_S, deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const ids = (c: { id: string }[]) => c.map((x) => x.id).sort();
const breath = (t: number) => ({ type: 'breath', t, seq: Math.round(t), kind: 'mech', tiS: 1.6, teS: 3.4, vtMl: 500, etco2True: 36 }) as unknown as EngineEvent;
const raw = (t: number, id: string, raised: boolean) =>
  ({ type: 'alarm', t, id, priority: 'high', category: id.startsWith('apnoea') ? 'physiological' : 'technical', state: raised ? 'raised' : 'cleared', text: id }) as EngineEvent;
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});

describe('Stage 3 alarm hooks (synthetic events)', () => {
  it('APNEA after the skin apnoea time without a breath: saadat-like 10 s, philips-like 20 s; none before any breath', () => {
    expect(deviceProfile('saadat-like').apneaS).toBe(10);
    expect(deviceProfile('philips-like').apneaS).toBe(20);
    expect(deviceProfile('zoll-like').apneaS).toBe(APNEA_DEFAULT_S); // no table: brief §6.4 "apnoea (20 s)"
    for (const [skin, s] of [['saadat-like', 10], ['philips-like', 20]] as const) {
      const m = createAlarmMgr(deviceProfile(skin));
      const inp = createInputs();
      expect(ids(buildConditions(m, inp, 60))).not.toContain('APNEA'); // no respiratory source yet (pre-Stage 3)
      observeEvent(inp, breath(5));
      expect(ids(buildConditions(m, inp, 5 + s - 0.1))).not.toContain('APNEA');
      expect(ids(buildConditions(m, inp, 5 + s))).toContain('APNEA');
      observeEvent(inp, breath(5 + s + 1));
      expect(ids(buildConditions(m, inp, 5 + s + 1.5))).not.toContain('APNEA');
    }
  });

  it("Stage 3's raw apnoea flags raise APNEA too, and are re-issued with a level (the raw event never leaves)", () => {
    const m = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeEvent(inp, raw(30, 'apnoea-co2', true));
    expect(ids(buildConditions(m, inp, 30))).toContain('APNEA');
    observeEvent(inp, raw(31, 'apnoea-co2', false));
    observeEvent(inp, raw(31, 'apnoea-resp', true));
    expect(ids(buildConditions(m, inp, 31))).toContain('APNEA');
    observeEvent(inp, raw(32, 'apnoea-resp', false));
    expect(ids(buildConditions(m, inp, 32))).not.toContain('APNEA');
    const out: EngineEvent[] = [];
    observeEvent(inp, raw(33, 'apnoea-co2', true));
    stepAlarms(m, 33, buildConditions(m, inp, 33), out);
    const a = out.find((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.id === 'APNEA')!;
    expect(a).toMatchObject({ state: 'raised', level: 1, priority: 'high', category: 'physiological', text: '***APNEA' });
  });

  it('APNEA cannot be switched off on saadat-like (always on) but APNEA LIMIT OFF (iran-icu-as-found) silences it', () => {
    const m = createAlarmMgr(deviceProfile('saadat-like'));
    applyAlarmAction(m, { device: 'alarm', action: 'enable', param: 'RR', value: false }, 0, []);
    const inp = createInputs();
    observeEvent(inp, breath(1));
    const c = buildConditions(m, inp, 12).find((x) => x.id === 'APNEA')!;
    expect(c).toMatchObject({ level: 1, text: 'RESP APNEA' });
    expect(deviceProfile('iran-icu-as-found').apneaS).toBeNull();
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('iran-icu-as-found')), inp, 60))).not.toContain('APNEA');
  });

  it('CO2 line INOP from the raw flag, level 3 technical', () => {
    for (const [skin, text] of [['philips-like', 'CO2 LINE'], ['saadat-like', 'CO2 CHECK LINE']] as const) {
      const m = createAlarmMgr(deviceProfile(skin));
      const inp = createInputs();
      observeEvent(inp, raw(10, 'co2Line', true));
      expect(buildConditions(m, inp, 10).find((x) => x.id === 'co2Line')).toMatchObject({ level: 3, category: 'technical', text });
      observeEvent(inp, raw(11, 'co2Line', false));
      expect(ids(buildConditions(m, inp, 11))).not.toContain('co2Line');
    }
  });

  it('SpO2 and EtCO2 limit alarms from measurement events (philips-like adult 90–100 %, 30–50 mmHg)', () => {
    const m = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeEvent(inp, meas(10, { spo2: 85, etco2: 58 }));
    const c = buildConditions(m, inp, 10);
    expect(ids(c)).toEqual(expect.arrayContaining(['SpO2_LOW', 'EtCO2_HIGH']));
    expect(c.find((x) => x.id === 'SpO2_LOW')!.text).toBe('**SpO2 85<90');
    observeEvent(inp, meas(11, { spo2: 75 }));
    expect(ids(buildConditions(m, inp, 11))).toContain('DESAT');
  });
});
