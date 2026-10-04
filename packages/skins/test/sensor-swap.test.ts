// Showcase hotfix item 4 (rulings S1, Ali 2026-10-04): on the Saadat-style monitor the CO2 waveform takes the RESP lane's
// place and the RR tile becomes the CO2 tile while the CO2 line is attached; detached, RESP and RR return. The rule is
// skin data (layout.whenAttached) resolved in resolveSkin's `sensors` option; every other skin resolves byte-identically.
import { describe, expect, it } from 'vitest';
import { PRESET_IDS, resolveSkin, SKIN_IDS, THEME_IDS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const SWAPPING = ['saadat-like', 'iran-icu-as-found'];
const tileParams = (id: string, co2: boolean) => resolveSkin(id, { sensors: { co2 } }).skin.layout.tiles.flat().map((t) => t.param);

describe('layout.whenAttached: the Saadat-style capnogram', () => {
  it.each(SWAPPING)('%s, CO2 attached: CO2 in the RESP lane (same position, the skin\'s CO2 colour and sweep) and a CO2 tile in the RR tile\'s place', (id) => {
    const off = resolveSkin(id);
    const on = resolveSkin(id, { sensors: { co2: true } });
    const offLanes = off.render.lanes.map((l) => l.lane);
    const i = offLanes.indexOf('RESP');
    expect(i).toBeGreaterThan(0);
    expect(on.render.lanes.map((l) => l.lane)).toEqual(offLanes.map((l) => (l === 'RESP' ? 'CO2' : l)));
    expect(on.render.lanes[i]).toEqual({ lane: 'CO2', color: on.skin.colors.CO2, mmPerS: on.skin.sweep.co2.default, gainMmPerMv: 10, autoGain: false, label: 'CO2' });
    expect(on.render.lanes[i]?.mmPerS).toBe(12.5);
    expect(on.render.lanes[i]?.color).toBe('#F0F030');
    const offTiles = tileParams(id, false);
    expect(tileParams(id, true)).toEqual(offTiles.map((p) => (p === 'RR' ? 'CO2' : p)));
    expect(on.skin.layout.tiles.flat().find((t) => t.param === 'CO2')).toEqual({ param: 'CO2', extras: ['IMCO2', 'AWRR'] });
    expect(on.render.tileColors.CO2).toBe(on.skin.colors.CO2);
    expect(on.render.tileColors.RR).toBeUndefined();
  });

  it.each(SWAPPING)('%s, CO2 detached (or not stated): RESP lane and RR tile, exactly as before', (id) => {
    const plain = resolveSkin(id);
    expect(resolveSkin(id, { sensors: { co2: false } })).toEqual(plain);
    expect(resolveSkin(id, { sensors: {} })).toEqual(plain);
    expect(plain.render.lanes.map((l) => l.lane)).toContain('RESP');
    expect(plain.render.lanes.map((l) => l.lane)).not.toContain('CO2');
    expect(tileParams(id, false)).toContain('RR');
    expect(tileParams(id, false)).not.toContain('CO2');
  });

  it('the swap also applies under a theme (colours darkened by the theme, lanes swapped the same)', () => {
    for (const theme of THEME_IDS) {
      const on = resolveSkin('saadat-like', { theme, sensors: { co2: true } });
      expect(on.render.lanes.map((l) => l.lane)).toContain('CO2');
      expect(on.render.lanes.find((l) => l.lane === 'CO2')?.color).toBe(on.skin.colors.CO2);
    }
  });

  it('every other skin and preset resolves byte-identically whatever the sensors (no rule, no change)', () => {
    const others = [...SKIN_IDS, ...PRESET_IDS].filter((id) => !SWAPPING.includes(id));
    expect(others.length).toBeGreaterThanOrEqual(5);
    for (const id of others) {
      for (const theme of [undefined, ...THEME_IDS]) {
        const t = theme ? { theme } : {};
        const plain = JSON.stringify(resolveSkin(id, t));
        expect(JSON.stringify(resolveSkin(id, { ...t, sensors: { co2: true } })), `${id} ${theme ?? ''}`).toBe(plain);
        expect(JSON.stringify(resolveSkin(id, { ...t, sensors: { co2: false } })), `${id} ${theme ?? ''}`).toBe(plain);
      }
    }
  });

  it('the schema declares the rule: known lanes and tile params only, a closed sensor list', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin) as unknown as { layout: { whenAttached: Record<string, unknown> } };
    expect(validate('skin', s).errors).toEqual([]);
    s.layout.whenAttached = { co2: { lanes: { RESP: 'CAPNO' } } };
    expect(validate('skin', s).ok).toBe(false);
    s.layout.whenAttached = { co2: { tiles: { RR: { param: 'EtCO2' } } } };
    expect(validate('skin', s).ok).toBe(false);
    s.layout.whenAttached = { spo2: { lanes: { PLETH: 'CO2' } } };
    expect(validate('skin', s).ok).toBe(false);
  });
});
