// Each style states the level of every technical alarm and the low-priority repeat, each with its source.
import { describe, expect, it } from 'vitest';
import { coveringKey, mergeSkinSource, resolveSkin, SKIN_IDS, TECHNICAL_ALARMS } from '../src/index.ts';

describe('technical alarms in the style data', () => {
  it('every skin gives every technical alarm a level', () => {
    for (const id of SKIN_IDS) expect(Object.keys(resolveSkin(id).skin.alarms.technical).sort(), id).toEqual([...TECHNICAL_ALARMS].sort());
  });

  it('saadat-like: each level carries its own entry; the manuals settle leads-off, sensor-off, the clogged line and the static pressure at 2', () => {
    const s = mergeSkinSource('saadat-like');
    for (const a of TECHNICAL_ALARMS) expect(coveringKey(s.provenance, `alarms.technical.${a}.level`), a).toBe(`alarms.technical.${a}.level`);
    const documented = TECHNICAL_ALARMS.filter((a) => s.provenance[`alarms.technical.${a}.level`]?.tag === 'documented');
    expect(documented.sort()).toEqual(['abpNonPulsatile', 'co2Line', 'ecgLeadsOff', 'spo2LowSignal', 'spo2SensorOff']);
    expect(Object.fromEntries(TECHNICAL_ALARMS.map((a) => [a, s.alarms.technical[a].level]))).toEqual({
      ecgLeadsOff: 2, spo2SensorOff: 2, co2Line: 2, spo2LowSignal: 3, abpNonPulsatile: 2, abpNoSensor: 3, spo2LowPerf: 3,
      spo2NonPulsatile: 3, 'nibp-failed': 3, tempProbeOff: 3, abpZero: 3,
    });
  });

  it('the low-priority repeat: philips-like 20 s (engineering value), mindray-like 20 s (documented), others unchanged', () => {
    expect(resolveSkin('philips-like').audio.alarm).toMatchObject({ repeatS: { L1: 10, L2: 20, L3: 20 }, lowPulses: 2 });
    expect(mergeSkinSource('philips-like').provenance['alarms.repeatS.L3']?.tag).toBe('eng');
    expect(resolveSkin('mindray-like').audio.alarm.repeatS).toEqual({ L3: 20 });
    expect(mergeSkinSource('mindray-like').provenance['alarms.repeatS.L3']?.tag).toBe('documented');
    expect(resolveSkin('zoll-like').audio.alarm.repeatS).toEqual({ L1: 15, L2: 30, L3: null });
    for (const id of ['ge-like', 'lifepak-like', 'saadat-like']) expect(resolveSkin(id).audio.alarm.repeatS, id).toEqual({});
  });
});
