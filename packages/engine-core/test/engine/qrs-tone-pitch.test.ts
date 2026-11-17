// The QRS tone carries pitch(SpO2) only while the SpO2 is valid: with the probe off it carries no pitch (the style gives
// one), and the pitch comes back with the reading.
import { describe, expect, it } from 'vitest';
import { spo2PitchHz } from '../../src/l3/spo2/spo2.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { ADULT, cmd, rig3, run } from '../helpers/resp.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Measurement = Extract<EngineEvent, { type: 'measurement' }>;
/** Tick by tick: the tones are posted from the look-ahead of each tick. */
const tick = (e: MonitorEngine, to: number) => {
  for (let t = e.now().simT + 0.02; t <= to + 1e-9; t += 0.02) e.advanceTo(t);
};

describe('QRS tone pitch and SpO2 validity', { timeout: 120_000 }, () => {
  it('pitch at a low SpO2, none once the reading is lost, the pitch again when it returns', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 75 }));
    await run(e, 60);
    tick(e, 80);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    tick(e, 110);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'on' }));
    tick(e, 170);

    const tones = ev.filter((x): x is Tone => x.type === 'tone' && x.kind === 'qrs' && x.t > 60).sort((a, b) => a.t - b.t);
    const spo2 = ev.filter((x): x is Measurement => x.type === 'measurement' && x.values.spo2 !== undefined);
    const shownAt = (t: number) => spo2.filter((m) => m.t <= t).pop()?.values.spo2?.value ?? null;

    const phases = tones.map((x) => (x.freqHz === undefined ? 'none' : 'pitch')).join(' ').replace(/(\w+)( \1)*/g, '$1');
    expect(phases).toBe('pitch none pitch');
    const before = tones.filter((x) => x.t < 80);
    expect(before.length).toBeGreaterThan(10);
    for (const x of before) expect(x.freqHz).toBeCloseTo(spo2PitchHz(shownAt(x.t) as number), 0);
    expect(Math.max(...before.map((x) => x.freqHz as number))).toBeLessThan(spo2PitchHz(100));
    const after = tones.filter((x) => x.t > 80 && x.freqHz !== undefined);
    expect(after.length).toBeGreaterThan(10);
    for (const x of after) expect(x.freqHz).toBeCloseTo(spo2PitchHz(shownAt(x.t) as number), 0);
  });
});
