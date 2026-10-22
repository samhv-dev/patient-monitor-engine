import { describe, expect, it } from 'vitest';
import { version } from '../src/index.ts';

describe('@pme/renderer', () => {
  it('exports its version', () => {
    expect(version).toBe('1.0.0-rc.3');
  });
});
