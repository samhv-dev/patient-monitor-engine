import { describe, expect, it } from 'vitest';
import { formatIcp, formatPbto2, formatUop } from '../src/numerics-organs.ts';
import { WAVE_STYLE } from '../src/wave-lanes.ts';

const m = (value: number | null, flag: 'valid' | 'questionable' | 'invalid' = 'valid') => ({ value, flag, at: 0 });

describe('organ tiles', () => {
  it('ICP mean large, CPP below; dashes when invalid; HIGH status above 22', () => {
    expect(formatIcp(m(12.4), m(75.6))).toEqual({ main: '12', sub: 'CPP 76', status: '' });
    expect(formatIcp(m(25), m(55)).status).toBe('ICP HIGH');
    expect(formatIcp(m(null, 'invalid'), undefined)).toEqual({ main: '--', sub: 'CPP --', status: '' });
  });
  it('PbtO2 with the ischaemic flag at ≤ 20 mmHg; UOP in mL/h with oliguria text', () => {
    expect(formatPbto2(m(18.2))).toEqual({ main: '18', status: 'LOW PbtO2' });
    expect(formatUop(m(21), 540).main).toBe('21');
    expect(formatUop(m(21), 540).sub).toBe('Σ 540 mL');
    expect(formatUop(m(21), 540, 70).status).toBe('OLIGURIA');
  });
  it('the icp lane is 0–40 mmHg at 125 Hz', () => {
    expect(WAVE_STYLE.icp.range).toEqual([0, 40]);
    expect(WAVE_STYLE.icp.rate ?? 125).toBe(125);
  });
});
