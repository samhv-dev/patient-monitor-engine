import { describe, expect, it } from 'vitest';
import { ClockMap, perfToAudioTime } from '../src/clock-map.ts';

describe('clock-map', () => {
  it('maps sim time to wall time through the anchor and the time scale', () => {
    const m = new ClockMap();
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 1 });
    expect(m.simToPerfMs(10.5)).toBe(5500);
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 2 });
    expect(m.simToPerfMs(11)).toBe(5500);
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 0.25 });
    expect(m.simToPerfMs(10.25)).toBe(6000);
  });

  it('maps wall time to the audio clock with an output timestamp', () => {
    expect(perfToAudioTime(1500, { contextTime: 2, performanceTime: 1000 })).toBeCloseTo(2.5, 12);
  });
});
