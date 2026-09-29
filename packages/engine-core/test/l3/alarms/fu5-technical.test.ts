// FU-5 technical alarms raised by real conditions (research/10 audit M8; [S2] Philips IntelliVue IFU p. 44, 53–61;
// research/06 §4.2). Synthetic inputs as the engine publishes them.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs, SPO2_SEARCH_S } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent, Measured } from '../../../src/types.ts';

const meas = (t: number, values: Record<string, Partial<Measured>>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: null, flag: 'valid', at: t, ...v }])),
});
const tech = (skin: string, inp: ReturnType<typeof createInputs>, t: number) =>
  buildConditions(createAlarmMgr(deviceProfile(skin)), inp, t).filter((c) => !c.suppressed).map((c) => [c.id, c.text, c.numeric ?? null]);

describe('FU-5 technical alarms (audit M8)', () => {
  it('SpO2: no pulse → NON-PULSAT. (after the acquisition time); PI < 0.3 → LOW PERF; both replace/mark the SpO2 numeric', () => {
    const inp = createInputs();
    observeQrs(inp, 29.9);
    observeEvent(inp, meas(10, { spo2: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 10)).toEqual([]); // still acquiring
    observeEvent(inp, meas(SPO2_SEARCH_S + 15, { spo2: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 30)).toEqual([['spo2NonPulsatile', 'SpO2 NON-PULSAT.', 'spo2']]);
    expect(tech('saadat-like', inp, 30)).toEqual([['spo2NonPulsatile', 'SPO2 NO PULSE', 'spo2']]);
    observeEvent(inp, meas(30, { spo2: { value: 97, flag: 'questionable' }, pi: { value: 0.12 } }));
    expect(tech('philips-like', inp, 30)).toEqual([['spo2LowPerf', 'SpO2 LOW PERF', 'spo2']]);
    expect(tech('saadat-like', inp, 30)).toEqual([['spo2LowPerf', 'SPO2 LOW PERFUSION', 'spo2']]);
  });

  it('ABP: a static pressure → NON-PULSATILE (philips-like keeps S/D/M and marks the pulse, saadat-like shows the mean only — review ruling 3); mean < 10 → ***ABP DISCONNECT (red) and no ABP LOW where the skin has the disconnect alarm on (saadat-like OFF by default, research/06 §4.1 — review ruling 5); zeroing → ABP ZEROING', () => {
    const inp = createInputs();
    observeQrs(inp, 29.9);
    inp.abp = 'connected';
    // philips-like ('keep', [S2] IFU p. 57): the flat line's S/D/M stay valid, only the pulse (prAbp) is invalid
    observeEvent(inp, meas(30, { abpSys: { value: 21 }, abpDia: { value: 19 }, abpMean: { value: 20 }, prAbp: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 30)).toEqual([
      ['ART_S_LOW', '**ABPs 21<90', 'abpSys'], ['ART_M_LOW', '**ABPm 20<70', 'abpMean'], ['ART_D_LOW', '**ABPd 19<50', 'abpDia'],
      ['abpNonPulsatile', 'ABP NON-PULSATILE', 'prAbp'],
    ]);
    observeEvent(inp, meas(31, { abpSys: { value: 3 }, abpDia: { value: 1 }, abpMean: { value: 2 }, prAbp: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 31)).toEqual([['abpNonPulsatile', 'ABP NON-PULSATILE', 'prAbp'], ['abpDisconnect', '***ABP DISCONNECT', 'abpMean']]);
    // saadat-like ('mean-only', research/06 §4.1): S/D invalid, the mean shown; the catheter-disconnect alarm is OFF
    observeEvent(inp, meas(32, { abpSys: { flag: 'invalid' }, abpDia: { flag: 'invalid' }, abpMean: { value: 2 }, prAbp: { flag: 'invalid' } }));
    expect(tech('saadat-like', inp, 32)).toEqual([['abpNonPulsatile', 'IBP1 STATIC PRESSURE', 'abpSys']]);
    inp.abp = 'zeroing';
    observeEvent(inp, meas(33, { abpSys: { flag: 'invalid' }, abpDia: { flag: 'invalid' }, abpMean: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 33)).toEqual([['abpZero', 'ABP ZEROING', 'abpMean']]);
  });

  it('LOW PERF / NON-PULSAT. clear hysteresis (review ruling 5, F7): PI hovering 0.28 ↔ 0.35 or momentarily invalid keeps ONE LOW PERF until PI ≥ 0.4; NON-PULSAT. clears only after 2 s of a valid SpO2', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    const pis = (t: number) => (t < 40 ? (Math.floor(t) % 2 ? 0.28 : 0.35) : t < 44 ? null : t < 50 ? 0.29 : 0.45); // 0.28/0.35, then 4 s of no PI, then 0.29, then 0.45
    for (let k = 0; k <= 60 / 0.02; k++) {
      const t = k * 0.02;
      if (k % 25 === 0) observeQrs(inp, t);
      if (k % 50 === 0) {
        const pi = pis(t);
        observeEvent(inp, meas(t, { spo2: { value: 97, flag: pi !== null && pi < 0.3 ? 'questionable' : 'valid' }, pi: pi === null ? { flag: 'invalid' } : { value: pi } }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    const ev = out.filter((e) => e.type === 'alarm' && e.id === 'spo2LowPerf') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(ev.map((e) => e.state)).toEqual(['raised', 'cleared']);
    expect(ev[1]!.t).toBeGreaterThanOrEqual(50); // cleared only once PI ≥ 0.4
    const s2 = createAlarmMgr(deviceProfile('philips-like'));
    const inp2 = createInputs();
    const out2: EngineEvent[] = [];
    for (let k = 0; k <= 40 / 0.02; k++) {
      const t = k * 0.02;
      if (k % 25 === 0) observeQrs(inp2, t);
      if (k % 50 === 0) observeEvent(inp2, meas(t, { spo2: t < 20 || (t >= 25 && t < 26) ? { flag: 'invalid' } : { value: 97 }, pi: { value: 1.5 } }));
      stepAlarms(s2, t, buildConditions(s2, inp2, t), out2);
    }
    const np = out2.filter((e) => e.type === 'alarm' && e.id === 'spo2NonPulsatile') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(np.map((e) => [e.state, Math.round(e.t)])).toEqual([['raised', 15], ['cleared', 22], ['raised', 25], ['cleared', 28]]);
  });

  it('temperature probe off after it was on → TEMP NO TRANSDUCER; a probe never attached raises nothing; CO2 occluded → CO2 OCCLUSION', () => {
    const inp = createInputs();
    observeQrs(inp, 9.9);
    inp.temp = 'off';
    expect(tech('philips-like', inp, 10)).toEqual([]);
    inp.tempSeen = true;
    expect(tech('philips-like', inp, 10)).toEqual([['tempProbeOff', 'TEMP NO TRANSDUCER', 'tempCore']]);
    inp.temp = 'on';
    inp.co2 = 'occluded';
    expect(tech('philips-like', inp, 10)).toEqual([['co2Line', 'CO2 OCCLUSION', 'etco2']]);
  });
});
