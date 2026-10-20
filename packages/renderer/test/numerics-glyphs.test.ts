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

describe('tile glyphs, sources and extras', () => {
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
    expect(sa.q('SpO2', 'v')).toBe(''); // rc.3 O1: blank, not dashes (research/34 §8 O1)
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
    const src = (u: ReturnType<typeof mount>) => u.ui.tiles.querySelector('.pme-stile[data-param="HR"] [data-pme="src"]')?.textContent;
    expect([sa.q('HR', 'lbl'), src(sa), sa.q('HR', 'v')]).toEqual(['PR', '(IBP1)', '75']); // rc.3 PR tile source label (E99)
    expect(ph.ui.tiles.querySelector('.pme-stile[data-param="HR"] [data-pme="src"]')).toBeNull();
    const color = (u: ReturnType<typeof mount>) => (u.ui.tiles.querySelector('.pme-stile[data-param="HR"]') as HTMLElement).style.color; // inherited by the label, source and digits
    const sp = mount('saadat-like'); // no arterial line: the SpO2 pulse, in the SpO2 colour
    sp.ui.onEvent(meas(40, { hr: m(null, 40), pr: m(76, 40) }));
    sp.ui.onEvent(status(40, 'saadat-like', [{ id: 'ecgLeadsOff' }]));
    sp.ui.paint(40);
    expect([sp.q('HR', 'lbl'), src(sp), sp.q('HR', 'v')]).toEqual(['PR', '(SPO2)', '76']);
    expect(color(sp)).toBe(resolveSkin('saadat-like').skin.colors.PR); // the SpO2 / pulse colour (inline hex in happy-dom)
    const ec = mount('saadat-like'); // the ECG rate: green (ECG)
    ec.ui.onEvent(meas(40, { hr: m(72, 40), pr: m(76, 40) }));
    ec.ui.paint(40);
    expect([ec.q('HR', 'lbl'), src(ec), ec.q('HR', 'v')]).toEqual(['HR', '(ECG)', '72']);
    expect(color(ec)).toBe(resolveSkin('saadat-like').skin.colors.HR);
  });

  it('a failed NIBP shows the skin glyph ("-?-" philips-like, "?" saadat-like); saadat-like NIBP block has no PR (rc.3)', () => {
    for (const [id, glyph] of [['philips-like', '-?-'], ['saadat-like', '?']] as const) {
      const { ui, q } = mount(id);
      ui.onEvent({ type: 'nibp', t: 50, phase: 'done', cuffMmHg: 0, result: { sys: 118, dia: 76, map: 90, pr: 72 } } as EngineEvent);
      ui.onEvent(meas(50, { nibpSys: m(118, 50), nibpDia: m(76, 50), nibpMean: m(90, 50) }));
      ui.paint(50);
      if (id === 'saadat-like') expect(q('NIBP', 's')).not.toContain('PR'); // rc.3: no PR in the NIBP block (IMG_8113); the pulse has its own tile
      ui.onEvent({ type: 'nibp', t: 90, phase: 'failed', cuffMmHg: 0 } as EngineEvent);
      ui.paint(90);
      expect(q('NIBP', 'v')).toBe(glyph);
    }
  });

  it('extras under the research/11 glossary labels: CO2 awRR (philips-like); TEMP T2 and ΔT, HR ST-II, BFA BS% (saadat-like)', () => {
    const ph = mount('philips-like');
    // FU-8 (A10-E5, E-FU8-3): the philips-like CO2 tile also prints the inspired CO2 under Philips' word, imCO2
    ph.ui.onEvent(meas(20, { etco2: m(36, 20), awrr: m(12, 20), imco2: m(0, 20) }));
    ph.ui.paint(20);
    expect([ph.q('CO2', 'v'), ph.q('CO2', 's')]).toEqual(['36', 'awRR 12  imCO2 0']);
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(20, { tempCore: m(36.8, 20), tempSite: m(36.2, 20) }));
    sa.ui.paint(20);
    expect(sa.q('TEMP', 'v')).toBe('36.8');
    const parts = (p: string) => [...(sa.ui.tiles.querySelectorAll(`.pme-stile[data-param="${p}"] [data-part] .pv`) as NodeListOf<HTMLElement>)].map((e) => e.textContent);
    expect(parts('TEMP')).toEqual(['36.8', '36.2', '0.6']); // rc.3: the split T1 / T2 / DT tile
    sa.ui.onEvent(meas(21, { hr: m(72, 21), stII: m(-0.1, 21), di: m(45, 21), sr: m(12, 21) }));
    sa.ui.paint(21);
    expect(sa.q('HR', 's')).toBe(''); // rc.3: the HR tile's ST extra gave way to the status lines
    expect(parts('BFA')).toEqual(['45', '12', '', '']); // BFI%, BS%, SQI%, EMG% (no SQI/EMG numerics: blank, O1)
  });
});
