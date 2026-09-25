import { describe, expect, it } from 'vitest';
import { formatEtco2, formatRr, formatSpo2, formatTemp } from '../src/numerics-resp.ts';
import { autoRange, WAVE_STYLE } from '../src/wave-lanes.ts';

const v = (value: number | null, flag: 'valid' | 'questionable' | 'invalid' = 'valid') => ({ value, flag, at: 1 });

describe('numerics-resp formatters (brief §6.1) and Stage 3 lanes', () => {
  it('SpO2 with PI, questionable mark, LOW PERF and NO PULSE', () => {
    expect(formatSpo2(v(97), v(2.14))).toEqual({ main: '97', sub: 'PI 2.1', status: '' });
    expect(formatSpo2(v(95, 'questionable'), v(0.21))).toEqual({ main: '95?', sub: 'PI 0.21', status: 'LOW PERF' });
    expect(formatSpo2(v(null, 'invalid'), undefined)).toEqual({ main: '-?-', sub: 'PI ---', status: 'NO PULSE' });
  });
  it('EtCO2 / FiCO2 / awRR with APNEA; RR; temperature T1/T2', () => {
    expect(formatEtco2(v(36.4), v(0), v(12))).toEqual({ main: '36', sub: 'FiCO2 0', status: 'awRR 12' });
    expect(formatEtco2(v(0), v(0), v(0)).status).toBe('awRR 0  APNEA');
    expect(formatEtco2(v(null, 'invalid'), v(null, 'invalid'), v(null, 'invalid'))).toEqual({ main: '---', sub: 'FiCO2 --', status: 'awRR --' });
    expect(formatRr(v(0))).toEqual({ main: '0', status: 'APNEA' });
    expect(formatTemp(v(36.84), v(36.3))).toEqual({ main: '36.8', sub: 'T2 36.3' });
  });
  it('CO2 and RESP lanes run at 62.5 Hz and 6.25 mm/s; CO2 is 0–50 mmHg yellow', () => {
    expect(WAVE_STYLE.co2).toMatchObject({ range: [0, 50], rate: 62.5, mmPerS: 6.25 });
    expect(WAVE_STYLE.resp).toMatchObject({ range: null, rate: 62.5, mmPerS: 6.25 });
  });
  it('the RESP auto-scale keeps a minimum span so the apnoeic cardiogenic ripple stays small', () => {
    const ripple = Float32Array.from({ length: 625 }, (_, i) => 0.1 * Math.max(0, Math.sin(i / 8)));
    const [lo, hi] = autoRange(ripple, ripple.length, 0.5);
    expect(hi - lo).toBeCloseTo(0.5 / 0.8, 9);
  });
});
