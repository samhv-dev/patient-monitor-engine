// MUI-7 (classroom; the Saadat photos research/34 IMG_8105, IMG_8113, IMG_8116): with no transducer on the IBP1 channel
// the saadat-like monitor says "IBP1 NO SENSOR" in its message bar (rotating with the other technical messages). The
// device layer carries it from the line's sensor state ('none': no transducer connected) — never from a zero pressure —
// as a technical PROMPT: shown, with no tone and no lamp. Skins without the message (philips-like, the IEC default) say
// nothing.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import type { AlarmEntry } from '../../../src/types-device.ts';
import type { EngineEvent } from '../../../src/types.ts';
import { cmd } from '../../helpers/hemo.ts';

type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
function run(skin: string, abp: 'none' | 'connected', after?: (e: ReturnType<typeof createEngine>) => void) {
  const e = createEngine({ seed: 3, device: { skin }, patient: { sensors: { abp } } });
  let last: Status | null = null;
  e.on((x) => void (x.type === 'alarmStatus' && (last = x as Status)));
  e.advanceTo(6);
  after?.(e);
  if (after) e.advanceTo(12);
  return (last as Status | null)?.active ?? [];
}
const noSensor = (a: AlarmEntry[]) => a.find((x) => x.text === 'IBP1 NO SENSOR');

describe('MUI-7: IBP1 NO SENSOR from the line sensor state', () => {
  it('saadat-like, no transducer: the message, technical, with no tone', () => {
    const a = noSensor(run('saadat-like', 'none'));
    expect(a).toBeDefined();
    expect(a?.category).toBe('technical');
    expect(a?.sounding).toBe(false);
    expect(a?.prompt).toBe(true);
  });

  it('saadat-like, a line connected: no message; connecting one ends it, removing it brings it back', () => {
    expect(noSensor(run('saadat-like', 'connected'))).toBeUndefined();
    expect(noSensor(run('saadat-like', 'none', (e) => e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected' }))))).toBeUndefined();
    expect(noSensor(run('saadat-like', 'connected', (e) => e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'none' }))))).toBeDefined();
  });

  it('philips-like: no such message', () => {
    expect(run('philips-like', 'none').some((x) => /NO (SENSOR|TRANSDUCER)/.test(x.text) && x.text.includes('ABP'))).toBe(false);
  });
});
