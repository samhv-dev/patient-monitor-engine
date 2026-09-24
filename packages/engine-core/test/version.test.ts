import { describe, expect, it } from 'vitest';
import { version } from '../src/index.ts';

describe('@pme/engine-core', () => {
  it('exports its version', () => {
    expect(version).toBe('0.0.0');
  });
});
