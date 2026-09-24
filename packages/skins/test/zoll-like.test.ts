import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('zoll-like', () => {
  it('beep off, R marker above the trace, 1 cm/mV, CO2 at 6.25 mm/s', () => {
    const r = resolveSkin('zoll-like');
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.skin.syncMarker).toBe('r-above');
    expect(r.render.lanes.find((l) => l.lane === 'CO2')?.mmPerS).toBe(6.25);
    expect(r.render.lanes[0]).toMatchObject({ gainMmPerMv: 10, label: 'II  M' });
  });

  it('defibrillator 120 J adult / 50 J paediatric; pacer 0–140 mA, +10/−5 steps, demand', () => {
    const r = resolveSkin('zoll-like');
    expect(r.skin.defib).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50, readyTimeoutS: 60, toneSet: 'zoll-like' });
    expect(r.skin.pacer).toMatchObject({ mARange: [0, 140], mAStep: { up: 10, down: 5 }, modeDefault: 'demand' });
  });

  it('alarm cadence: high every 15 s, medium every 30 s, low not repeated; limits not invented', () => {
    const r = resolveSkin('zoll-like');
    expect(r.audio.alarm.repeatS).toEqual({ L1: 15, L2: 30, L3: null });
    expect(r.limits).toEqual({ adult: null, paed: null, neo: null });
  });
});
