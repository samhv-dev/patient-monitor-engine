// What the cockpit reports of its alarms to the monitor side, headless on the driver's clock, for both faces: the face's
// own words and priority, the face's delays, and its silence as `silenced` (never as an end).
import { createVentDriver, setCircuit, type VentAlarmReport, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { EDP_SPEC } from '../faces/edp-ts/modes.ts';
import { HAMILTON_SPEC } from '../faces/hamilton/face.ts';
import { createCockpit } from './cockpit.ts';
import type { FaceSpec } from './types.ts';

/** A cockpit whose every report to the link is kept, as the driver sends it (once per change). */
function setup(face: FaceSpec) {
  const d = createVentDriver(null);
  const sent: VentAlarmReport[][] = [];
  let said = '[]';
  d.reportAlarms = (a) => {
    const json = JSON.stringify(a);
    if (json !== said) sent.push(a);
    said = json;
  };
  return { d, c: createCockpit(d, face, { linked: false }), sent };
}
let ms = 0;
/** Run the unlinked driver for `s` seconds of sim time (100 ms frames). */
const run = (d: VentDriver, s: number) => {
  d.frame(ms);
  for (let i = 0; i < Math.round(s * 10); i++) d.frame((ms += 100));
};

describe('the EDP-TS face reports its signals', () => {
  it("a disconnection after its 5 s delay, in the face's words and priority; silenced while its sound is; ended when its cause ends", () => {
    const { d, c, sent } = setup(EDP_SPEC);
    run(d, 5);
    setCircuit(c.vs, 'disconnected');
    run(d, 4);
    expect(c.alarmReport().map((a) => a.id)).not.toContain('disconnection'); // still inside its delay
    run(d, 4);
    expect(c.alarmReport()).toContainEqual({ id: 'disconnection', text: 'Disconnection', priority: 'high', silenced: false });
    c.silence();
    expect(c.alarmReport().find((a) => a.id === 'disconnection')?.silenced).toBe(true);
    run(d, 1);
    setCircuit(c.vs, 'connected');
    run(d, 5);
    expect(c.alarmReport().map((a) => a.id), 'a latched lamp is not an active alarm').not.toContain('disconnection');
    const states = sent.map((a) => a.find((x) => x.id === 'disconnection')).map((x) => (x ? (x.silenced ? 'silenced' : 'on') : 'none'));
    expect(states.filter((s, i) => s !== states[i - 1])).toEqual(['none', 'on', 'silenced', 'none']);
  });
});

describe('the Hamilton-style face reports the model\'s alarms', () => {
  it("in the model's words; its 120 s silence marks every alarm silenced, one raised during it too, which its banner hides", () => {
    const { d, c, sent } = setup(HAMILTON_SPEC);
    run(d, 5);
    setCircuit(c.vs, 'disconnected');
    run(d, 10);
    expect(c.alarmReport()).toContainEqual({ id: 'disconnection', text: 'Disconnection on patient side', priority: 'high', silenced: false });
    c.silence();
    setCircuit(c.vs, 'connected');
    c.write({ pmax: 10 }); // a new alarm while silenced
    run(d, 5);
    const now = c.alarmReport();
    expect(now.find((a) => a.id === 'pmax')).toEqual({ id: 'pmax', text: 'High pressure (Pmax)', priority: 'high', silenced: true });
    expect(now.find((a) => a.id === 'disconnection'), 'reconnected: it ended').toBeUndefined();
    expect(c.alarms().banner.cls, 'the face shows only its silence').toBe('silenced');
    expect(sent.at(-1)).toEqual(now);
  });
});
