import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('mindray-like, ge-like, lifepak-like', () => {
  it('mindray-like: Surgical 1–20 Hz is offered (approximate on the engine), pause 2 min, lamp L3 cyan', () => {
    const r = resolveSkin('mindray-like');
    expect(r.skin.ecg.filters.Surgical).toEqual([1, 20]);
    expect(r.skin.alarms.pause).toEqual({ durationS: 120 });
    expect(r.skin.alarms.lamp.L3).toBe('cyan-steady');
  });

  it('ge-like: Monitoring 0.05–32 Hz (50 Hz mains) maps approximately to the engine; limits null and unverified', () => {
    const r = resolveSkin('ge-like');
    expect(r.render.ecgFilter).toMatchObject({ name: 'Monitoring', band: [0.05, 32], exact: false });
    expect(r.skin.limits).toEqual({ adult: null, paed: null, neo: null });
    for (const b of ['adult', 'paed', 'neo']) expect(r.provenance[`limits.${b}`]?.tag).toBe('unverified');
    expect(r.skin.sweep.co2.options).toContain(0.625);
  });

  it('lifepak-like: 200 J, 200-300-360 AED, charge ≤7 s at 200 J, auto-disarm 60 s, triangle sync marker, beep off', () => {
    const r = resolveSkin('lifepak-like');
    expect(r.skin.defib).toMatchObject({ energyAdultJ: 200, aedSequenceJ: [200, 300, 360], chargeTimeS: { '200': 7, '360': 10 }, readyTimeoutS: 60 });
    expect(r.skin.syncMarker).toBe('triangle-mid-qrs');
    expect(r.skin.pacer).toMatchObject({ rateDefault: 60, mADefault: 0, pausePct: 25 });
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.render.lanes.find((l) => l.lane === 'CO2')?.mmPerS).toBe(12.5);
  });
});
