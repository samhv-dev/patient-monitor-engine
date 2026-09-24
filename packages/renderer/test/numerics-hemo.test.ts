import { describe, expect, it } from 'vitest';
import { formatClock, formatNibp, formatPressure } from '../src/numerics-hemo.ts';

describe('numerics-hemo formatters (brief §6.1, §6.3)', () => {
  it('pressure S/D (M), with dashes when invalid', () => {
    const v = (value: number | null, flag: 'valid' | 'invalid' = 'valid') => ({ value, flag, at: 1 });
    expect(formatPressure(v(120.4), v(79.6), v(95.2))).toEqual({ main: '120/80', sub: '(95)' });
    expect(formatPressure(v(null, 'invalid'), v(80), v(95))).toEqual({ main: '---/---', sub: '(95)' });
  });

  it('NIBP: live cuff while measuring, result with hh:mm, countdown in auto, failure text', () => {
    const last = { sys: 118, dia: 76, map: 90, at: 3725 };
    expect(formatClock(3725)).toBe('01:02');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'deflating', cuffMmHg: 141 }, last)).toEqual({ main: '141', sub: 'mmHg', status: 'NBP measuring' });
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'done', cuffMmHg: 100, result: { sys: 118, dia: 76, map: 90, pr: 74 } }, last).main).toBe('118/76');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'idle', nextInS: 125 }, last).status).toBe('01:02  next 2:05');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'failed', cuffMmHg: 30 }, null)).toEqual({ main: '---/---', sub: '(---)', status: 'NBP measurement failed' });
    expect(formatNibp(undefined, null).status).toBe('MANUAL');
  });
});
