// Stage 3 hooks (request R-4b-1): the raw apnoea flags of Stage 3's detectors are re-issued with the SAME ids and the
// skin's level and text; APNEA LIMIT OFF disables them; the CO2 line INOP; SpO2 / EtCO2 limit and desat alarms.
// Unit level on synthetic events here; test/engine/stage3-alarms-engine.test.ts runs the same against Stage 3.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { APNEA_DEFAULT_S, deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const ids = (c: { id: string }[]) => c.map((x) => x.id).sort();
const raw = (t: number, id: string, raised: boolean) =>
  ({ type: 'alarm', t, id, priority: 'high', category: id.startsWith('apnoea') ? 'physiological' : 'technical', state: raised ? 'raised' : 'cleared', text: id }) as EngineEvent;
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});

describe('Stage 3 alarm hooks (synthetic events)', () => {
  it('skin apnoea times: saadat-like 10 s, philips-like 20 s, no table → 20 s, iran-icu-as-found APNEA LIMIT OFF', () => {
    expect(deviceProfile('saadat-like').apneaS).toBe(10);
    expect(deviceProfile('philips-like').apneaS).toBe(20);
    expect(deviceProfile('zoll-like').apneaS).toBe(APNEA_DEFAULT_S); // brief §6.4 "apnoea (20 s)"
    expect(deviceProfile('iran-icu-as-found').apneaS).toBeNull();
  });

  it("Stage 3's apnoea flags are re-issued with the same ids, level 1 and the skin's text", () => {
    const m = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    expect(ids(buildConditions(m, inp, 1))).not.toContain('apnoea-co2');
    observeEvent(inp, raw(30, 'apnoea-co2', true));
    observeEvent(inp, raw(30, 'apnoea-resp', true));
    const out: EngineEvent[] = [];
    stepAlarms(m, 30, buildConditions(m, inp, 30), out);
    const a = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.state === 'raised' && e.id.startsWith('apnoea'));
    expect(a.map((x) => [x.id, x.level, x.priority, x.text]).sort()).toEqual([['apnoea-co2', 1, 'high', '***APNEA'], ['apnoea-resp', 1, 'high', '***APNEA (RESP)']]);
    observeEvent(inp, raw(31, 'apnoea-co2', false));
    expect(ids(buildConditions(m, inp, 31))).not.toContain('apnoea-co2');
    expect(ids(buildConditions(m, inp, 31))).toContain('apnoea-resp');
  });

  it('saadat-like: APNEA cannot be switched off (RESP APNEA, CO2 APNEA); APNEA LIMIT OFF (iran-icu-as-found) silences it', () => {
    const m = createAlarmMgr(deviceProfile('saadat-like'));
    applyAlarmAction(m, { device: 'alarm', action: 'enable', param: 'RR', value: false }, 0, []);
    const inp = createInputs();
    observeEvent(inp, raw(12, 'apnoea-resp', true));
    observeEvent(inp, raw(12, 'apnoea-co2', true));
    const c = buildConditions(m, inp, 12);
    expect(c.find((x) => x.id === 'apnoea-resp')).toMatchObject({ level: 1, text: 'RESP APNEA' });
    expect(c.find((x) => x.id === 'apnoea-co2')).toMatchObject({ level: 1, text: 'CO2 APNEA' });
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('iran-icu-as-found')), inp, 12))).not.toContain('apnoea-resp');
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
