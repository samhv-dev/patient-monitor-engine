// rc.3 PR-G (plan G1): the optional layout.grid places saadat-like's tiles as on the real unit (research/34 §3 rows 1,
// 4, 8, 16; the owner-approved mock-up, research/34 §8): a tile grid with spans right of the waves and a full-width
// bottom strip. Opt-in by data: no other skin has the key.
import { describe, expect, it } from 'vitest';
import { PRESET_IDS, resolveSkin, SKIN_IDS, SKINS, type LayoutGrid } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const GRID = ['saadat-like', 'iran-icu-as-found'];
const gridOf = (id: string, co2 = false) => resolveSkin(id, { sensors: { co2 } }).skin.layout.grid as LayoutGrid;

describe('layout.grid (rc.3)', () => {
  it.each(GRID.flatMap((id) => [[id, false], [id, true]] as const))('%s (CO2 attached: %s): every layout.tiles param is placed exactly once (a cell or the strip)', (id, co2) => {
    const r = resolveSkin(id, { sensors: { co2 } });
    const g = r.skin.layout.grid as LayoutGrid;
    const placed = [...g.cells.flatMap((c) => c.params), g.strip.tile.param].sort();
    expect(placed).toEqual(r.skin.layout.tiles.flat().map((t) => t.param).sort());
  });

  it('the RR cell names the CO2 tile while the line is attached', () => {
    expect(gridOf('saadat-like').cells[3]?.params).toEqual(['RR']);
    expect(gridOf('saadat-like', true).cells[3]?.params).toEqual(['CO2']);
  });

  it.each(GRID)('%s: cells fit the tracks and no two cells overlap', (id) => {
    const g = gridOf(id);
    const taken = new Set<string>();
    for (const c of g.cells) {
      const rs = c.rowSpan ?? 1;
      const cs = c.colSpan ?? 1;
      expect(c.row + rs - 1).toBeLessThanOrEqual(g.rows.length);
      expect(c.col + cs - 1).toBeLessThanOrEqual(g.columns.length);
      for (let r = c.row; r < c.row + rs; r++) {
        for (let k = c.col; k < c.col + cs; k++) {
          expect(taken.has(`${r},${k}`)).toBe(false);
          taken.add(`${r},${k}`);
        }
      }
    }
  });

  it('only saadat-like (and its preset) has a grid', () => {
    for (const id of [...SKIN_IDS, ...PRESET_IDS]) expect(resolveSkin(id).skin.layout.grid !== undefined, id).toBe(GRID.includes(id));
  });

  it('strip fields that name a numeric name one the engine publishes', () => {
    const fields = gridOf('saadat-like').strip.fields;
    expect(fields.map((f) => f.label)).toEqual(['PI', 'PVI', 'SpOC', '%SpCo', '%SpMet', 'SpHb']);
    for (const f of fields) if (f.numeric !== undefined) expect(['pi']).toContain(f.numeric);
  });

  it('saadat-like takes the mock-up proportions (NOTES.md, 1280×800)', () => {
    const r = resolveSkin('saadat-like');
    const g = r.skin.layout.grid as LayoutGrid;
    expect(r.skin.layout.waveAreaFraction).toBe(0.641);
    expect(g.laneWeights).toEqual([115, 117, 96, 102, 98, 86]);
    expect(g.laneWeights.length).toBe(r.skin.layout.lanes.length);
    expect(g.rows).toEqual([175, 138, 101, 97, 96, 77]);
    expect(g.columns).toEqual([362, 97]);
    expect(g.strip.heightPct).toBe(14.5);
    expect(g.strip.tile).toEqual({ param: 'SpO2', widthPct: 21.7, extras: [] });
  });

  it('the schema rejects a strip outside 5–30 % and a numeric that is not a plain id', () => {
    const src = SKINS['saadat-like'];
    expect(validate('skin', src).ok).toBe(true);
    const bad = structuredClone(src) as unknown as { layout: { grid: { strip: { heightPct: number; fields: Array<{ numeric?: string }> } } } };
    bad.layout.grid.strip.heightPct = 40;
    expect(validate('skin', bad).ok).toBe(false);
    const bad2 = structuredClone(src) as unknown as typeof bad;
    (bad2.layout.grid.strip.fields[0] as { numeric?: string }).numeric = 'pi;x';
    expect(validate('skin', bad2).ok).toBe(false);
  });
});
