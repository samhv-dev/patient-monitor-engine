// FU-8 Task A7 (A10-E5; research/11 §4 item 8): the anaesthetic-agent module tile and the inspired-CO2 extra.
import { describe, expect, it } from 'vitest';
import { formatAgents, modulePresent } from '../src/numerics-neuro.ts';

const m = (value: number | null, at: number, flag: 'valid' | 'invalid' = 'valid') => ({ value, flag, at }) as never;

describe('FU-8 A7: the AGENTS tile', () => {
  it('EtAA % with one decimal and the MAC multiple; dashes without a value', () => {
    expect(formatAgents({ etAa: m(2.04, 5), mac: m(1.02, 5) }, '---')).toEqual({ main: '2.0', sub: 'MAC 1.0' });
    expect(formatAgents({}, '---')).toEqual({ main: '---', sub: 'MAC ---' });
  });
  it('is a module tile: drawn only while 7f publishes etAa/mac (5 s)', () => {
    expect(modulePresent('AGENTS', {}, 10)).toBe(false);
    expect(modulePresent('AGENTS', { etAa: m(1.9, 8) }, 10)).toBe(true);
    expect(modulePresent('AGENTS', { etAa: m(1.9, 2) }, 10)).toBe(false);
  });
});
