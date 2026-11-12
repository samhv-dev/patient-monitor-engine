// @vitest-environment happy-dom
// FU-3 item 11 (R-7f-6): the renderer draws Stage 7f's NMT (TOF) and BFA (depth index) tiles from the engine's
// `measurement` events (tofCount/tofRatio/ptc from the stimulator, di/sr from the depth monitor at 1 Hz). Like a
// plug-in module, a tile is hidden until its device publishes and hides again when the readings go stale.
import { describe, expect, it } from 'vitest';
import type { EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';
import { bfaReading, formatBfa, formatNmt, modulePresent } from '../src/numerics-neuro.ts';

const m = (value: number | null, t: number, flag: Measured['flag'] = value === null ? 'invalid' : 'valid'): Measured => ({ value, flag, at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;

describe('NMT / BFA formatters', () => {
  it('NMT: ratio in % at count 4, the count otherwise, PTC only at count 0', () => {
    expect(formatNmt({ tofCount: m(4, 10), tofRatio: m(92, 10) }, '---')).toEqual({ main: '92%', sub: 'TOF 4/4' });
    expect(formatNmt({ tofCount: m(2, 10), tofRatio: m(null, 10) }, '---')).toEqual({ main: '2/4', sub: '' });
    expect(formatNmt({ tofCount: m(0, 10), tofRatio: m(null, 10), ptc: m(8, 30) }, '---')).toEqual({ main: '0/4', sub: 'PTC 8' });
    expect(formatNmt({ tofCount: m(3, 40), tofRatio: m(null, 40), ptc: m(8, 30) }, '---')).toEqual({ main: '3/4', sub: '' });
    expect(formatNmt({}, '---')).toEqual({ main: '---', sub: '' });
  });
  it('BFA: the index, dashes during the EMG artefact, SR under the vendor label', () => {
    expect(formatBfa({ di: m(45, 5), sr: m(0, 5) }, 'SR', '---')).toEqual({ main: '45', sub: 'SR 0' });
    expect(formatBfa({ di: m(null, 5, 'questionable'), sr: m(3, 5) }, 'BS%', '---')).toEqual({ main: '---', sub: 'BS% 3' });
  });
  it('a module tile is present only while its device publishes (NMT 120 s, BFA 5 s)', () => {
    expect(modulePresent('NMT', {}, 100)).toBe(false);
    expect(modulePresent('NMT', { tofCount: m(4, 100) }, 219)).toBe(true);
    expect(modulePresent('NMT', { tofCount: m(4, 100) }, 221)).toBe(false);
    expect(modulePresent('BFA', { di: m(40, 100), sr: m(0, 100) }, 104)).toBe(true);
    expect(modulePresent('BFA', { di: m(40, 100), sr: m(0, 100) }, 106)).toBe(false);
    expect(modulePresent('HR', {}, 0)).toBe(true); // not a module tile: always drawn
  });
});

describe('DeviceUI draws the NMT and BFA tiles (philips-like, saadat-like)', () => {
  const mount = (id: string) => {
    const wave = document.createElement('div');
    const ui = new DeviceUI(document, wave, resolveSkin(id));
    const tile = (p: string) => ui.tiles.querySelector(`.pme-stile[data-param="${p}"]`) as HTMLDivElement | null;
    const text = (p: string, k: 'v' | 's') => tile(p)?.querySelector(`[data-pme="${k}"]`)?.textContent;
    return { ui, tile, text };
  };

  it('no NMT/BFA tile shows before the stimulator or the depth monitor publishes', () => {
    for (const id of ['philips-like', 'saadat-like']) {
      const { ui, tile } = mount(id);
      ui.onEvent(meas(10, { hr: m(72, 10) }));
      ui.paint(10);
      expect(tile('NMT')).not.toBeNull();
      expect(tile('NMT')?.style.display).toBe('none');
      expect(tile('BFA')?.style.display).toBe(id === 'saadat-like' ? '' : 'none'); // rc.3: saadat-like shows BFA always (layout.showAlways, O1)
      expect(tile('HR')?.style.display).not.toBe('none');
      ui.destroy();
    }
  });

  it('draws the TOF ratio and the depth index from fixture measurement events', () => {
    const { ui, tile, text } = mount('philips-like');
    ui.onEvent(meas(60, { tofCount: m(4, 60), tofRatio: m(92, 60) }));
    ui.onEvent(meas(61, { di: m(45, 61), sr: m(0, 61) }));
    ui.paint(61);
    expect(tile('NMT')?.style.display).toBe('');
    expect(text('NMT', 'v')).toBe('92%');
    expect(text('NMT', 's')).toBe('TOF 4/4');
    expect(text('BFA', 'v')).toBe('45');
    expect(text('BFA', 's')).toBe('SR 0');
    ui.onEvent(meas(300, { tofCount: m(0, 300), tofRatio: m(null, 300) }));
    ui.onEvent(meas(323, { ptc: m(6, 323) }));
    ui.paint(323);
    expect(text('NMT', 'v')).toBe('0/4');
    expect(text('NMT', 's')).toBe('PTC 6');
    expect(tile('BFA')?.style.display).toBe('none'); // depth monitor silent since 61 s: the module tile goes
    ui.destroy();
  });

  it('saadat-like labels the burst suppression BS% (research/06 §2 BFA module)', () => {
    const { ui, text } = mount('saadat-like');
    ui.onEvent(meas(61, { di: m(38, 61), sr: m(2, 61) }));
    ui.paint(61);
    expect(text('BFA', 'v')).toBe('38');
    expect([...(ui.tiles.querySelectorAll('.pme-stile[data-param="BFA"] [data-part] .pl') as NodeListOf<HTMLElement>)].map((e) => e.textContent)).toEqual(['BFI%', 'BS%', 'SQI%', 'EMG%']);
    expect([...(ui.tiles.querySelectorAll('.pme-stile[data-param="BFA"] [data-part] .pv') as NodeListOf<HTMLElement>)].map((e) => e.textContent)).toEqual(['38', '2', '', '']);
    ui.destroy();
  });
});

// EEG E6 (plan §7 E6; Q3): while an EEG device publishes, the BFA tile shows the chosen device's index and suppression
// ratio — the generic reader's SEF and SR — and today's di/sr otherwise. The mapping is here, in the formatter, never in
// a skin's JSON; the Saadat module's SQI% and EMG% stay blank (the generic reader computes neither).
describe('BFA from the EEG device (E6)', () => {
  it('the generic device: SEF (one decimal) under the label SEF, its SR on the sub-line; the depth index otherwise', () => {
    expect(formatBfa({ sef: m(18.46, 10), eegSr: m(0, 10) }, 'SR', '---')).toEqual({ main: '18.5', sub: 'SR 0', label: 'SEF' });
    expect(formatBfa({ di: m(45, 5), sr: m(0, 5) }, 'SR', '---')).toEqual({ main: '45', sub: 'SR 0' });
    expect(formatBfa({ sef: m(null, 10), eegSr: m(null, 10) }, 'BS%', '---')).toEqual({ main: '---', sub: 'BS% ---', label: 'SEF' }); // invalid (diathermy)
    expect(formatBfa({ sef: m(12.04, 10, 'questionable'), eegSr: m(40, 10, 'questionable') }, 'SR', '---')).toEqual({ main: '12.0', sub: 'SR 40', label: 'SEF' });
  });
  it('the EEG device wins while it publishes, even beside the depth monitor; once it is stale (5 s behind) the depth index returns', () => {
    const both = { di: m(45, 100), sr: m(1, 100), sef: m(14, 100), eegSr: m(3, 100) };
    expect(bfaReading(both).label).toBe('SEF');
    expect(formatBfa(both, 'SR', '---').sub).toBe('SR 3');
    const stale = { di: m(45, 100), sr: m(1, 100), sef: m(14, 94), eegSr: m(3, 94) };
    expect(bfaReading(stale).label).toBeUndefined();
    expect(formatBfa(stale, 'SR', '---')).toEqual({ main: '45', sub: 'SR 1' });
  });
  it('the BIS-type reader (E7): its index (no decimal) under the label BIS-type, its BSR on the sub-line; the newest reader wins after a change of reader', () => {
    expect(formatBfa({ bis: m(47.4, 10), bisSr: m(0, 10) }, 'SR', '---')).toEqual({ main: '47', sub: 'SR 0', label: 'BIS-type' });
    // the room switched generic → BIS-type at 50 s: the generic's last values stay in the map, older
    const switched = { sef: m(14, 50), eegSr: m(0, 50), bis: m(55, 60.5), bisSr: m(2, 60.5) };
    expect(formatBfa(switched, 'BS%', '---')).toEqual({ main: '55', sub: 'BS% 2', label: 'BIS-type' });
    // and back: the generic is newer
    expect(bfaReading({ ...switched, sef: m(12, 70), eegSr: m(0, 70) }).label).toBe('SEF');
    expect(modulePresent('BFA', { bis: m(40, 100), bisSr: m(0, 100) }, 104)).toBe(true);
  });
  it('the module is present while the EEG device publishes (5 s)', () => {
    expect(modulePresent('BFA', { sef: m(14, 100), eegSr: m(0, 100) }, 104)).toBe(true);
    expect(modulePresent('BFA', { sef: m(14, 100), eegSr: m(0, 100) }, 106)).toBe(false);
  });
  it('philips-like draws SEF and SR; saadat-like relabels its first part SEF, BS% is the device SR, SQI% and EMG% stay blank', () => {
    const wave = document.createElement('div');
    const p = new DeviceUI(document, wave, resolveSkin('philips-like'));
    p.onEvent(meas(61, { sef: m(18.46, 61), mf: m(9, 61), eegSr: m(0, 61), eegImp: m(2, 61) }));
    p.paint(61);
    const pt = p.tiles.querySelector('.pme-stile[data-param="BFA"]') as HTMLElement;
    expect(pt.style.display).toBe('');
    expect(pt.querySelector('[data-pme="v"]')?.textContent).toBe('18.5');
    expect(pt.querySelector('[data-pme="s"]')?.textContent).toBe('SR 0');
    expect(pt.textContent).toContain('SEF');
    p.destroy();
    const s = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    s.onEvent(meas(61, { sef: m(7.5, 61), mf: m(2, 61), eegSr: m(64, 61), eegImp: m(2, 61) }));
    s.paint(61);
    expect([...(s.tiles.querySelectorAll('.pme-stile[data-param="BFA"] [data-part] .pl') as NodeListOf<HTMLElement>)].map((e) => e.textContent)).toEqual(['SEF', 'BS%', 'SQI%', 'EMG%']);
    expect([...(s.tiles.querySelectorAll('.pme-stile[data-param="BFA"] [data-part] .pv') as NodeListOf<HTMLElement>)].map((e) => e.textContent)).toEqual(['7.5', '64', '', '']);
    s.destroy();
  });
});
