// FU-1 item 7: ge-like / mindray-like layout. research/05 §2 documents the ALARM BAR style of both (Mindray: white on
// red / black on yellow / black on cyan, boxed alarmed numerics, already encoded in 4b; GE: red = high, yellow = medium,
// cyan = low) but NOT their lane order or tile grid, so the "LAYOUT UNVERIFIED" badge stays and the lane/tile layout
// remains the inherited IEC default, tagged as such. The gate note (docs/gates/fu-1.md) lists the missing data.
import { describe, expect, it } from 'vitest';
import { coveringKey, resolveSkin } from '../src/index.ts';

const tagOf = (id: string, path: string) => {
  const p = resolveSkin(id).skin.provenance;
  return p[coveringKey(p, path) as string]?.tag;
};

describe('FU-1 item 7: ge-like / mindray-like layout data', () => {
  it('ge-like encodes the documented GE alarm-priority colours (red high, yellow medium, cyan low) as its own data', () => {
    const bar = resolveSkin('ge-like').skin.alarms.messageBar;
    expect([bar.L1.bg, bar.L2.bg, bar.L3.bg]).toEqual(['#FF0000', '#FFFF00', '#00FFFF']);
    expect(tagOf('ge-like', 'alarms.messageBar.L3.bg')).toBe('documented');
    expect(tagOf('mindray-like', 'alarms.messageBar.L1.bg')).toBe('documented');
    expect(tagOf('mindray-like', 'alarms.numericStyle')).toBe('documented');
  });

  it('lane order and tile grid are NOT documented for either, so both keep the badge and the IEC default layout', () => {
    for (const id of ['ge-like', 'mindray-like']) {
      const s = resolveSkin(id).skin;
      expect(s.layout.badge).toBe('LAYOUT UNVERIFIED');
      expect(s.provenance['layout.badge']?.note).toMatch(/lane order and the numeric tile grid/);
      expect(s.provenance['layout.lanes']).toBeUndefined(); // no vendor source: the IEC default is inherited
    }
    expect(resolveSkin('ge-like').skin.layout).toEqual(resolveSkin('mindray-like').skin.layout); // both inherit it
  });
});
