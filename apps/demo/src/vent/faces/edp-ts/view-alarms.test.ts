// Brief 202, tests first: the View's alarm part (what device.ts paints), from the cockpit's alarm view and the knob, on
// the driver's clock and the knob's own clock. The alarm test (Ctrl + Alarm Limits with no alarm active, research/57
// H-21) lights each priority's lamp in turn as that priority lights it (H-06: high fast, medium slow, low steady), one
// step each (face.json alarmTestStepS, eng), then nothing; the silenced seconds count down on sim time (A-20).
import { createVentDriver, setCircuit, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit } from '../../core/cockpit.ts';
import { DATA, num } from './data.ts';
import { createKnob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';
import { viewOf } from './view.ts';

const setup = () => {
  const d = createVentDriver(null);
  const c = createCockpit(d, EDP_SPEC, { linked: false });
  let wall = 0;
  return { d, c, k: createKnob(c, () => wall), tick: (ms: number) => void (wall += ms) };
};
const clocks = new WeakMap<VentDriver, number>();
const run = (d: VentDriver, s: number) => {
  let ms = clocks.get(d) ?? 0;
  d.frame(ms);
  for (let i = 0; i < Math.round(s * 10); i++) d.frame((ms += 100));
  clocks.set(d, ms);
};

describe('the View of the alarm signals', () => {
  it('quiet: lamps off, no message, no silence, with no Esc after start-up', () => {
    const { d, c, k } = setup();
    run(d, 15);
    const v = viewOf(c, k);
    expect(v.lamps).toEqual({ inop: 'off', high: 'off', med: 'off' });
    expect(v.alarm).toBeNull();
    expect(v.silencedS).toBe(0);
  });

  it('the alarm test: High fast, Med/Low slow, Med/Low steady, then off; no message', () => {
    const { d, c, k, tick } = setup();
    run(d, 15);
    k.press('under:ctrl');
    k.press('side:alarmLimits');
    const step = num(DATA.layout.alarmTestStepS) * 1000;
    const seen = [];
    for (let i = 0; i < 4; i++) { const v = viewOf(c, k); seen.push(v.lamps); expect(v.alarm).toBeNull(); tick(step); }
    expect(seen).toEqual([
      { inop: 'off', high: 'fast', med: 'off' },
      { inop: 'off', high: 'off', med: 'slow' },
      { inop: 'off', high: 'off', med: 'steady' },
      { inop: 'off', high: 'off', med: 'off' },
    ]);
  });

  it('the message is the core\'s one message in the device\'s words; the silenced seconds count down on sim time', () => {
    const { d, c, k } = setup();
    run(d, 5);
    setCircuit(c.vs, 'disconnected');
    run(d, 15);
    expect(viewOf(c, k).alarm).toEqual({ text: 'Disconnection', priority: 'high' });
    k.press('side:silence');
    expect(viewOf(c, k).silencedS).toBeCloseTo(30, 6);
    run(d, 12);
    expect(viewOf(c, k).silencedS).toBeCloseTo(18, 1);
    expect(viewOf(c, k).lamps.high, 'silence pauses the audio only').toBe('fast');
    run(d, 20);
    expect(viewOf(c, k).silencedS).toBe(0);
  });
});
