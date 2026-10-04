// FU-8 Task B2 (R-S9-6, I-21): the 1 Hz `state` event carries the sensor-state map, so a Remote can show which sensors
// are attached (Stage 9 F14: its toggles started unpressed with a one-line caveat). Before FU-8 B2 (origin/main
// 4a1cc3f7): the `state` event had no `sensors` field. Seed 7, MODELED adult 40 y.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';

const ALL = ['ecg', 'spo2', 'nibp', 'abp', 'cvp', 'pap', 'co2', 'temp', 'pv', 'icp', 'pbto2', 'urometer'];
type Sensors = Record<string, string>;
const opts = { seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', cvp: 'connected', spo2: 'on' } } } as never;

function rig() {
  const e = createEngine(opts);
  const seen: { t: number; sensors?: Sensors }[] = [];
  e.on((ev: EngineEvent) => {
    if (ev.type === 'state') seen.push({ t: ev.t, sensors: (ev as { sensors?: Sensors }).sensors });
  }, ['state']);
  let n = 0;
  const attach = (sensor: string, state: string) => e.dispatch({ id: `s${++n}`, issuedBy: 'test', type: 'attachSensor', sensor, state } as never);
  return { e, seen, attach };
}

describe('FU-8 B2: the state event carries the sensor-state map', () => {
  it('every sensor has a state; spo2 motion, cvp detached and co2 on show in the next state event (≤ 2 s); the rest keep their defaults', () => {
    const r = rig();
    r.e.advanceTo(3);
    const first = r.seen.at(-1)?.sensors;
    expect(first).toBeDefined();
    expect(Object.keys(first as Sensors).sort()).toEqual([...ALL].sort());
    expect(first).toMatchObject({ abp: 'connected', cvp: 'connected', spo2: 'on', ecg: 'on' });
    expect(r.attach('spo2', 'motion').accepted).toBe(true);
    expect(r.attach('cvp', 'none').accepted).toBe(true);
    expect(r.attach('co2', 'on').accepted).toBe(true);
    const tCmd = 3;
    r.e.advanceTo(tCmd + 2);
    const next = r.seen.find((s) => s.t > tCmd)?.sensors as Sensors;
    expect(next).toEqual({ ...(first as Sensors), spo2: 'motion', cvp: 'none', co2: 'on' });
  });

  it('a snapshot/restore round trip keeps the map', () => {
    const a = rig();
    a.e.advanceTo(2);
    a.attach('spo2', 'motion');
    a.attach('cvp', 'none');
    a.attach('co2', 'on');
    a.attach('ecg', 'off');
    a.e.advanceTo(4);
    const want = a.seen.at(-1)?.sensors;
    expect(want).toMatchObject({ spo2: 'motion', cvp: 'none', co2: 'on', ecg: 'off' });
    const snap = a.e.snapshot();
    const b = rig();
    b.e.restore(snap);
    b.e.advanceTo(6);
    expect(b.seen.at(-1)?.sensors).toEqual(want);
  });
});
