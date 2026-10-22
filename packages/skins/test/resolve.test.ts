import { describe, expect, it } from 'vitest';
import { FILTER_BANDS } from '../../engine-core/src/l3/ecg-filter.ts';
import { ENGINE_FILTER_BANDS, engineFilterFor, PRESET_IDS, resolveSkin, SKIN_IDS, THEME_IDS } from '../src/index.ts';

describe('resolveSkin: saadat-like and the renderer/audio contract', () => {
  it('ENGINE_FILTER_BANDS equals engine-core FILTER_BANDS', () => {
    expect(ENGINE_FILTER_BANDS).toEqual(FILTER_BANDS);
  });

  it('maps filter bands to engine modes, exact only when equal', () => {
    expect(engineFilterFor([0.5, 40])).toEqual({ engineMode: 'monitor', exact: true });
    expect(engineFilterFor([0.05, 150])).toEqual({ engineMode: 'diagnostic', exact: true });
    expect(engineFilterFor([0.5, 24])).toEqual({ engineMode: 'monitor', exact: false });
    expect(engineFilterFor([0.05, 100])).toEqual({ engineMode: 'diagnostic', exact: false });
  });

  it('saadat-like: lanes, gap, filter, HR method, audio', () => {
    const r = resolveSkin('saadat-like');
    expect(r.render.background).toBe('#000000');
    expect(r.render.eraseGapPx).toBe(10); // pass 2 (W3, IMG_8113); 2 px traces (W4)
    expect(r.render.lineWidth).toBe(2);
    expect(r.render.lanes.map((l) => [l.lane, l.color, l.mmPerS])).toEqual([
      // research/34 Tuesday set (owner's photo IMG_8113): ECG, ECG, CO2/RESP, IBP1, IBP2 in mid blue (T4), pleth last (T3)
      ['ECG1', '#22F046', 25], ['ECG2', '#22F046', 25], ['RESP', '#F0F000', 6], ['IBP1', '#FF9A96', 25], ['IBP2', '#5C9CFF', 25], ['PLETH', '#D060FF', 25],
    ]);
    expect(r.render.lanes[0]).toMatchObject({ gainMmPerMv: 10, autoGain: true, label: 'II  X1  NORMAL' });
    expect(r.render.lanes[1]).toMatchObject({ autoGain: true, label: 'II  X1  NORMAL' }); // E116: the second ECG lane repeats lead II, as photographed
    expect(r.render.ecgFilter).toEqual({ name: 'NORMAL', band: [0.5, 40], engineMode: 'monitor', exact: true });
    expect(r.render.hrMethod).toEqual({ skin: 'moving-average-seconds', engine: null });
    expect(r.render.tileColors).toMatchObject({ HR: '#22F046', SpO2: '#DD44FF', NIBP: '#F0F0F0', TEMP: '#00F0F0', RR: '#F0F000' });
    // the owner-approved mock-up's white-balanced colours (NOTES.md; review L-9: shipped with the lanes)
    expect([r.render.foreground, r.skin.chrome.divider, r.skin.colors.PI, r.skin.colors.PR]).toEqual(['#E8F4F6', '#C6D7D8', '#DD44FF', '#DD44FF']);
    expect(r.audio.alarm).toMatchObject({ profile: 'saadat', volume: { min: 1, max: 7, default: 1 }, silence: { durationS: 120, cancelOnNewAlarm: true } });
    expect(r.audio.beep).toMatchObject({ enabled: true, pitchMap: 'none', source: 'HR_SOURCE' });
  });

  it('saadat-like: paed/neo inherit adult HR/SpO2/RR and mark them approximate', () => {
    const r = resolveSkin('saadat-like');
    expect(r.limits.neo?.HR).toEqual([50, 150]);
    expect(r.limits.neo?.NIBP_S).toEqual([40, 90]);
    expect(r.approximateLimits.neo).toContain('HR');
    expect(r.approximateLimits.neo).not.toContain('NIBP_S');
    expect(r.approximateLimits.adult).toEqual([]);
  });

  it('resolving twice gives equal results and never mutates the registry', () => {
    expect(resolveSkin('saadat-like')).toEqual(resolveSkin('saadat-like'));
    resolveSkin('saadat-like').skin.colors.ECG = '#123456';
    expect(resolveSkin('saadat-like').skin.colors.ECG).toBe('#22F046');
  });

  it('unknown ids throw', () => {
    expect(() => resolveSkin('nope-like')).toThrow(/unknown skin/);
    expect(() => resolveSkin('saadat-like', { theme: 'nope' })).toThrow(/unknown theme/);
  });

  it.each([...SKIN_IDS, ...PRESET_IDS].flatMap((id) => ['(none)', ...THEME_IDS].map((t) => [id, t] as const)))('snapshot %s (theme %s)', (id, theme) => {
    const r = resolveSkin(id, theme === '(none)' ? {} : { theme });
    expect({ render: r.render, audio: r.audio, limits: r.limits, approximateLimits: r.approximateLimits }).toMatchSnapshot();
  });
});
