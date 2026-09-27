import { describe, expect, it } from 'vitest';
import { coveringKey, resolveSkin } from '../src/index.ts';
import { COLOR_KEYS, TILE_PARAMS } from '../src/types.ts';

describe('Stage 7f tile fields (decision 14)', () => {
  it('NMT and BFA are tile params; NMT is a colour key (BFA already was)', () => {
    expect(TILE_PARAMS).toContain('NMT');
    expect(TILE_PARAMS).toContain('BFA');
    expect(COLOR_KEYS).toContain('NMT');
    expect(COLOR_KEYS).toContain('BFA');
  });
});

describe('FU-3 item 11 (R-7f-6): NMT and BFA tiles on the anaesthesia skins', () => {
  it('philips-like and saadat-like declare an NMT and a BFA tile, coloured, with provenance', () => {
    for (const id of ['philips-like', 'saadat-like']) {
      const r = resolveSkin(id);
      const params = r.skin.layout.tiles.flat().map((t) => t.param);
      expect(params).toContain('NMT');
      expect(params).toContain('BFA');
      expect(r.render.tileColors.NMT).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.render.tileColors.BFA).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.provenance[coveringKey(r.provenance, 'colors.NMT') as string]).toBeDefined();
      expect(r.provenance[coveringKey(r.provenance, 'layout.tiles') as string]?.note).toMatch(/NMT/);
    }
  });
  it('the BFA tile names its second readout as the vendor does (Philips SR, Saadat BS%)', () => {
    const bfa = (id: string) => resolveSkin(id).skin.layout.tiles.flat().find((t) => t.param === 'BFA');
    expect(bfa('philips-like')?.extras?.[0]).toBe('SR');
    expect(bfa('saadat-like')?.extras?.[0]).toBe('BS%');
  });
});
