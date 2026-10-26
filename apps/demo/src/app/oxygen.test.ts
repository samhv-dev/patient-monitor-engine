// E121b: oxygen is never assumed; it is given like a drug. The Airway & ventilation tab's oxygen control sends one
// event for the spontaneously breathing patient: the FiO₂ its device and flow give (about 4 % per L/min), the device and
// flow as words. The engine accepts it, the patient's FiO₂ follows it and a hypoxaemic patient's SpO₂ rises with it;
// the log and the Debrief print it.
import { createEngine, type Command } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';
import { O2_FLOWS, o2Fio2, oxygen, oxygenBlock, type Breathing } from './oxygen.ts';

const run = (cmds: Array<Record<string, unknown>>, untilS: number) => {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sensors: { spo2: 'on', co2: 'on', ecg: 'on' } } } as never);
  let fio2 = Number.NaN;
  let spo2 = Number.NaN;
  e.on((ev) => {
    if (ev.type === 'state' && typeof ev.values.fio2 === 'number') fio2 = ev.values.fio2;
    if (ev.type === 'measurement' && ev.values.spo2?.flag !== 'invalid' && typeof ev.values.spo2?.value === 'number') spo2 = ev.values.spo2.value;
  });
  const refused: string[] = [];
  for (const [i, c] of cmds.entries()) {
    const r = e.dispatch({ id: `o2-${i}`, issuedBy: 'test', ...c } as Command);
    if (!r.accepted) refused.push(String(r.reason));
  }
  e.advanceTo(untilS);
  return { fio2, spo2, refused };
};
const hypoxic = { type: 'applyEvent', event: { kind: 'lungCondition', id: 'pneumonia', severity: 1 } };

describe('oxygen for the spontaneously breathing patient (E121b)', () => {
  it('maps device and flow to FiO₂ at about 4 % per L/min; off is room air', () => {
    expect(o2Fio2('none', 0)).toBe(0.21);
    expect(O2_FLOWS.nasal.map((f) => o2Fio2('nasal', f))).toEqual([0.24, 0.28, 0.32, 0.36, 0.4, 0.44]);
    expect(O2_FLOWS.mask.map((f) => o2Fio2('mask', f))).toEqual([0.4, 0.44, 0.52, 0.6]);
  });

  it('is one ventilation event: spontaneous breathing at that FiO₂, the device and the flow as words', () => {
    expect(oxygen('mask', 10)).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.6, o2Device: 'mask', o2FlowLpm: 10 } });
    expect(oxygen('none', 0)).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.21, o2Device: 'none' } });
  });

  it('prints one clinical line for the log and the Debrief', () => {
    expect(describeCommand(oxygen('mask', 10))).toBe('Oxygen by face mask 10 L/min (FiO₂ 60 %)');
    expect(describeCommand(oxygen('nasal', 2))).toBe('Oxygen by nasal cannula 2 L/min (FiO₂ 28 %)');
    expect(describeCommand(oxygen('none', 0))).toBe('Oxygen off: room air (FiO₂ 21 %)');
    // a card's spontaneous breathing with a FiO₂ names it too (the tamponade's arrival); without one, as before
    expect(describeCommand({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 } })).toBe('Breathing spontaneously, FiO₂ 50 %');
    expect(describeCommand({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous' } })).toBe('Breathing spontaneously');
  });

  it('the engine accepts it, the FiO₂ follows it, and a hypoxaemic patient’s SpO₂ rises on the mask', { timeout: 60_000 }, () => {
    const air = run([hypoxic], 300);
    const mask = run([hypoxic, oxygen('mask', 10)], 300);
    expect(air.refused).toEqual([]);
    expect(mask.refused).toEqual([]);
    expect(air.fio2).toBeCloseTo(0.21, 2);
    expect(mask.fio2).toBeCloseTo(0.6, 2);
    expect(mask.spo2 - air.spo2).toBeGreaterThanOrEqual(3);
    const off = run([hypoxic, oxygen('mask', 10), oxygen('none', 0)], 300);
    expect(off.fio2).toBeCloseTo(0.21, 2);
  });

  it('the engine’s 1 Hz state says who breathes and through what; the control acts only on spontaneous with no device', () => {
    const e = createEngine({ seed: 7, mode: 'modeled' } as never);
    let b: Breathing | undefined;
    e.on((ev) => void (ev.type === 'state' && (b = ev.breathing)));
    const at = (t: number, cmd?: Record<string, unknown>) => {
      if (cmd) expect(e.dispatch({ id: `b${t}`, issuedBy: 'test', ...cmd } as Command).accepted).toBe(true);
      e.advanceTo(t);
      return b;
    };
    expect(at(2)).toEqual({ source: 'spontaneous', device: 'none' });
    expect(oxygenBlock(b)).toBeNull();
    expect(at(4, { type: 'applyEvent', event: { kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 } })).toEqual({ source: 'bvm', device: 'none' });
    expect(oxygenBlock(b, false, 1)).toBe('Bag-mask in use: FiO₂ 100 % from the bag.');
    expect(at(6, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } })).toEqual({ source: 'bvm', device: 'ett' });
    expect(at(8, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } })).toEqual({ source: 'ventilator', device: 'ett' });
    expect(oxygenBlock(b, false, 0.5)).toBe('Airway device in use (tracheal tube): FiO₂ 50 % from the ventilator.');
    expect(oxygenBlock(b)).toBe('Airway device in use (tracheal tube): FiO₂ from the ventilator.');
    expect(oxygenBlock({ source: 'spontaneous', device: 'ett' }, false, 0.4)).toBe('Airway device in use (tracheal tube): FiO₂ 40 %.');
    expect(oxygenBlock({ source: 'external', device: 'sga' }, false, 0.6)).toBe('Airway device in use (supraglottic airway): FiO₂ 60 % from the ventilator.');
    expect(oxygenBlock(undefined)).toBe('Waiting for the monitor’s state.');
  });

  it('the engine refuses an unknown device or a flow outside 0–15 L/min', () => {
    const bad = (event: Record<string, unknown>) => run([{ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.6, ...event } }], 1).refused;
    expect(bad({ o2Device: 'venturi' })).toEqual(['o2Device must be none, nasal or mask']);
    expect(bad({ o2Device: 'mask', o2FlowLpm: 20 })).toEqual([expect.stringMatching(/o2FlowLpm/)]);
  });
});
