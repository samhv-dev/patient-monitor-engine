// FU-5 limit hygiene (research/10 audit M6, M14; suite item 11): displayed value, one display unit of hysteresis, no
// alarm on a questionable value. The manager stepped at the engine's 20 ms tick with conditions from buildConditions.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
const m = (t: number, values: Record<string, number>, flag: 'valid' | 'questionable' = 'valid'): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag, at: t }])),
});

describe('FU-5 limit hygiene (suite 11)', () => {
  it('CVP at a limit of 10: hovering 9.6–10.4 raises nothing (the float compare raised `**CVP 10>10` 100× in 11 min); one excursion to 10.6 raises once ("**CVP 11>10") and the alarm holds through the hover until 9.4', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    const cvp = (t: number) => (t >= 60 && t < 65 ? 10.6 : t >= 110 ? 9.4 : 10 + 0.4 * Math.sin(t / 3));
    for (let k = 0; k <= 120 / TICK; k++) {
      const t = k * TICK;
      if (k % 50 === 0) {
        observeQrs(inp, t);
        observeEvent(inp, m(t, { cvpMean: cvp(t) }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    const ev = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.id === 'CVP_M_HIGH');
    expect(ev.map((e) => [e.state, Math.round(e.t)])).toEqual([['raised', 60], ['cleared', 110]]);
    expect(ev[0]?.text).toBe('**CVP 11>10');
  });

  it('a questionable SpO2 ("85?") raises neither the limit alarm nor DESAT', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, m(10, { spo2: 70 }, 'questionable'));
    expect(buildConditions(s, inp, 10).map((c) => c.id)).toEqual([]);
  });
});
