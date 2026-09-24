import { describe, expect, it } from 'vitest';
import { formatNumeric } from '../src/numerics-dom.ts';

describe('numerics-dom', () => {
  it('shows the rounded value, or dashes when invalid/absent', () => {
    expect(formatNumeric({ value: 72.4, flag: 'valid', at: 1 })).toBe('72');
    expect(formatNumeric({ value: 0, flag: 'valid', at: 1 })).toBe('0');
    expect(formatNumeric({ value: null, flag: 'invalid', at: 1 })).toBe('---');
    expect(formatNumeric(undefined)).toBe('---');
  });
});
