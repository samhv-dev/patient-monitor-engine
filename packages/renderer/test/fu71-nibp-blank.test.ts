// @vitest-environment happy-dom
// FU-7.1 B8 (Ali 2026-10-10), the display half: after a failed cuff cycle the engine sends the three NIBP numerics as
// `invalid` with a null value. The tile showed the failure glyph only until the device's next `idle` event (≈ 0.6 s
// later) and then went back to the pre-arrest result — the "normal pressure in an arrested patient" the owner saw.
// A blanked numeric now clears the last result, so the tile reads the skin's no-value glyph until a new measurement.
import { describe, expect, it } from 'vitest';
import type { EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const m = (value: number | null, t: number): Measured => ({ value, flag: value === null ? 'invalid' : 'valid', at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;
const nibp = (t: number, phase: string, result?: object): EngineEvent => ({ type: 'nibp', t, phase, cuffMmHg: 0, ...(result ? { result } : {}) }) as EngineEvent;

describe('FU-7.1 B8: a failed cuff cycle does not leave the last pressure on the tile', () => {
  for (const [id, noValue] of [['saadat-like', '---'], ['philips-like', '---'], ['mindray-like', '---']] as const) {
    it(`${id}: done 121/76 → failed + blanked numerics → idle: the tile reads no value, not 121/76`, () => {
      const ui = new DeviceUI(document, document.createElement('div'), resolveSkin(id));
      const v = () => ui.tiles.querySelector('.pme-stile[data-param="NIBP"] [data-pme="v"]')?.textContent;
      ui.onEvent(nibp(51, 'done', { sys: 121, dia: 76, map: 95, pr: 70 }));
      ui.onEvent(meas(51, { nibpSys: m(121, 51), nibpDia: m(76, 51), nibpMean: m(95, 51) }));
      ui.onEvent(nibp(52, 'idle'));
      ui.paint(52);
      expect(v()).toBe('121/76');
      ui.onEvent(nibp(173, 'failed'));
      ui.onEvent(meas(173, { nibpSys: m(null, 173), nibpDia: m(null, 173), nibpMean: m(null, 173) }));
      ui.onEvent(nibp(173.7, 'idle'));
      ui.paint(174);
      const shown = v() ?? '';
      expect(shown).not.toContain('121');
      expect(ui.tiles.querySelector('.pme-stile[data-param="NIBP"] [data-pme="s"]')?.textContent ?? '').not.toContain('PR 70');
      expect(shown).toBe(`${resolveSkin(id).skin.glyphs.noValue}/${resolveSkin(id).skin.glyphs.noValue}`);
      expect(resolveSkin(id).skin.glyphs.noValue).toBe(noValue);
      // a new valid measurement shows again
      ui.onEvent(meas(300, { nibpSys: m(110, 300), nibpDia: m(70, 300), nibpMean: m(83, 300) }));
      ui.onEvent(nibp(300.5, 'idle'));
      ui.paint(301);
      expect(v()).toBe('110/70');
    });
  }
});
