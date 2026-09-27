import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';
import { LANE_IDS, TILE_PARAMS } from '../src/types.ts';

describe('Stage 7d skin fields', () => {
  it('ICP lane and ICP/PbtO2/UO tiles exist', () => {
    expect(LANE_IDS).toContain('ICP');
    for (const p of ['ICP', 'PbtO2', 'UO']) expect(TILE_PARAMS).toContain(p);
  });
  it('saadat-like and philips-like colour the new parameters, with provenance', () => {
    for (const id of ['saadat-like', 'philips-like']) {
      const r = resolveSkin(id);
      expect(r.skin.colors.ICP).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.skin.colors.PbtO2).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.skin.colors.UO).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.provenance['colors.PbtO2'] ?? r.provenance.colors).toBeDefined();
    }
  });
});
