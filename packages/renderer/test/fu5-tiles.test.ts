// @vitest-environment happy-dom
// FU-5 tiles (research/10 audit M1, M3, M8, M11): the skin's glyphs ("97?", "-?-"), the HR source on leads off, the NIBP
// failure glyph and the tile extras, drawn by the DeviceUI from fixture engine events.
import { describe, expect, it } from 'vitest';
import type { AlarmEntry, EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const m = (value: number | null, t: number, flag: Measured['flag'] = value === null ? 'invalid' : 'valid'): Measured => ({ value, flag, at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;
const status = (t: number, skin: string, active: Partial<AlarmEntry>[]): EngineEvent => ({
  type: 'alarmStatus', t, skin, ageBand: 'adult', silencedUntil: null, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 5,
  active: active.map((a) => ({ level: 3, category: 'technical', text: a.id, since: t, latched: false, acked: false, ...a })),
}) as EngineEvent;
function mount(id: string) {
  const ui = new DeviceUI(document, document.createElement('div'), resolveSkin(id));
  const q = (p: string, k: 'v' | 's' | 'lbl') => ui.tiles.querySelector(`.pme-stile[data-param="${p}"] [data-pme="${k}"]`)?.textContent;
  return { ui, q };
}

describe('FU-5 tiles', () => {
  it('a questionable SpO2 carries "?"; with the NON-PULSAT. INOP the numeric is "-?-" (philips-like) / "---" (saadat-like)', () => {
    const { ui, q } = mount('philips-like');
    ui.onEvent(meas(30, { spo2: m(97, 30, 'questionable'), pr: m(76, 30), pi: m(0.2, 30) }));
    ui.paint(30);
    expect(q('SpO2', 'v')).toBe('97?');
    expect(q('SpO2', 's')).toBe('PR 76  PI 0.2');
    ui.onEvent(meas(31, { spo2: m(null, 31), pr: m(null, 31), pi: m(null, 31) }));
    ui.onEvent(status(31, 'philips-like', [{ id: 'spo2NonPulsatile', numeric: 'spo2' }]));
    ui.paint(31);
    expect(q('SpO2', 'v')).toBe('-?-');
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(31, { spo2: m(null, 31) }));
    sa.ui.onEvent(status(31, 'saadat-like', [{ id: 'spo2NonPulsatile', numeric: 'spo2' }]));
    sa.ui.paint(31);
    expect(sa.q('SpO2', 'v')).toBe('---');
  });

  it('leads off: philips-like HR "-?-" (the pulse stays in the SpO2 tile); saadat-like relabels the tile PR with the arterial pulse', () => {
    const ph = mount('philips-like');
    ph.ui.onEvent(meas(40, { hr: m(null, 40), pr: m(76, 40), prAbp: m(75, 40) }));
    ph.ui.onEvent(status(40, 'philips-like', [{ id: 'ecgLeadsOff' }]));
    ph.ui.paint(40);
    expect([ph.q('HR', 'lbl'), ph.q('HR', 'v')]).toEqual(['HR', '-?-']);
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(40, { hr: m(null, 40), pr: m(76, 40), prAbp: m(75, 40) }));
    sa.ui.onEvent(status(40, 'saadat-like', [{ id: 'ecgLeadsOff' }]));
    sa.ui.paint(40);
    expect([sa.q('HR', 'lbl'), sa.q('HR', 'v')]).toEqual(['PR', '75']);
  });

  it('a failed NIBP shows the skin glyph ("-?-" philips-like, "?" saadat-like); saadat-like NIBP PR extra is the cuff rate', () => {
    for (const [id, glyph] of [['philips-like', '-?-'], ['saadat-like', '?']] as const) {
      const { ui, q } = mount(id);
      ui.onEvent({ type: 'nibp', t: 50, phase: 'done', cuffMmHg: 0, result: { sys: 118, dia: 76, map: 90, pr: 72 } } as EngineEvent);
      ui.onEvent(meas(50, { nibpSys: m(118, 50), nibpDia: m(76, 50), nibpMean: m(90, 50) }));
      ui.paint(50);
      if (id === 'saadat-like') expect(q('NIBP', 's')).toContain('PR 72');
      ui.onEvent({ type: 'nibp', t: 90, phase: 'failed', cuffMmHg: 0 } as EngineEvent);
      ui.paint(90);
      expect(q('NIBP', 'v')).toBe(glyph);
    }
  });

  it('extras under the research/11 glossary labels: CO2 awRR (philips-like); TEMP T2 and ΔT, HR ST-II, BFA BS% (saadat-like)', () => {
    const ph = mount('philips-like');
    ph.ui.onEvent(meas(20, { etco2: m(36, 20), awrr: m(12, 20) }));
    ph.ui.paint(20);
    expect([ph.q('CO2', 'v'), ph.q('CO2', 's')]).toEqual(['36', 'awRR 12']);
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(20, { tempCore: m(36.8, 20), tempSite: m(36.2, 20) }));
    sa.ui.paint(20);
    expect([sa.q('TEMP', 'v'), sa.q('TEMP', 's')]).toEqual(['36.8', 'T2 36.2  ΔT 0.6']);
    sa.ui.onEvent(meas(21, { hr: m(72, 21), stII: m(-0.1, 21), di: m(45, 21), sr: m(12, 21) }));
    sa.ui.paint(21);
    expect([sa.q('HR', 's'), sa.q('BFA', 's')]).toEqual(['ST-II -0.1', 'BS% 12']);
  });
});
