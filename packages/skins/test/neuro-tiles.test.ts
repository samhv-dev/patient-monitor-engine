import { describe, expect, it } from 'vitest';
import { COLOR_KEYS, TILE_PARAMS } from '../src/types.ts';

describe('Stage 7f tile fields (decision 14)', () => {
  it('NMT and BFA are tile params; NMT is a colour key (BFA already was)', () => {
    expect(TILE_PARAMS).toContain('NMT');
    expect(TILE_PARAMS).toContain('BFA');
    expect(COLOR_KEYS).toContain('NMT');
    expect(COLOR_KEYS).toContain('BFA');
  });
});
