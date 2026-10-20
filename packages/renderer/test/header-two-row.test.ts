// @vitest-environment happy-dom
// rc.3 PR-T T1 (research/34 §3 rows 5 and 7, IMG_8113): the saadat-like header has two rows — page box, bed, patient
// category, lamp and local date over time in the first; the message bar on its own row under them. Other skins keep
// the one-row header.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { formatDate, resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const status = (t: number, ageBand: 'adult' | 'paed' | 'neo'): EngineEvent => ({
  type: 'alarmStatus', t, skin: 'saadat-like', ageBand, silencedUntil: null, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 1, active: [],
}) as EngineEvent;

describe('two-row header (saadat-like)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 3, 40, 40));
  });
  afterEach(() => vi.useRealTimers());

  it('page, bed, category, local date and time in row 1; the message bar in row 2', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    const q = (k: string) => ui.header.querySelector(`[data-pme="${k}"]`)?.textContent;
    expect(ui.header.classList.contains('two')).toBe(true);
    expect(q('page')).toBe('P1');
    expect(q('bed')).toBe('BED 01');
    expect(q('cat')).toBe('ADULT');
    expect(q('date')).toBe('20/10/2026');
    expect(q('time')).toBe('03:40:40');
    expect(ui.header.querySelector('.r2 .pme-bar')).not.toBeNull();
    expect(ui.header.querySelector('.r1 .pme-lamp')?.getAttribute('data-lamp')).toBe('off');
    ui.onEvent(status(5, 'paed'));
    ui.paint(5);
    expect(q('cat')).toBe('PEDIATRIC');
    ui.destroy();
  });

  it('the bed text comes from the mount option', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, false, 'BED 04');
    expect(ui.header.querySelector('[data-pme="bed"]')?.textContent).toBe('BED 04');
    ui.destroy();
  });

  it('the clock runs in real time without engine events (E104)', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    vi.advanceTimersByTime(3000);
    expect(ui.header.querySelector('[data-pme="time"]')?.textContent).toBe('03:40:43');
    ui.destroy();
  });

  it('a runtime switch to philips-like goes back to the one-row header, and back again', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    const bar = ui.header.querySelector('.pme-bar');
    ui.setSkin(resolveSkin('philips-like'));
    expect(ui.header.classList.contains('two')).toBe(false);
    expect(ui.header.querySelector('.r1, .r2')).toBeNull();
    expect(ui.header.querySelector('[data-pme="bed"]')).toBeNull();
    expect(ui.header.querySelector('.pme-bar')).toBe(bar);
    ui.setSkin(resolveSkin('saadat-like'));
    expect(ui.header.classList.contains('two')).toBe(true);
    expect(ui.header.querySelector('[data-pme="bed"]')?.textContent).toBe('BED 01');
    expect(ui.header.querySelector('.r2 .pme-bar')).toBe(bar);
    ui.destroy();
  });

  it('a phone held upright (portrait) keeps the one-row header', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, true);
    expect(ui.header.classList.contains('two')).toBe(false);
    expect(ui.header.querySelector('[data-pme="bed"]')).toBeNull();
    ui.destroy();
  });
});

describe('one-row header (philips-like) unchanged', () => {
  it('no second row, no bed; the date as before', () => {
    const r = resolveSkin('philips-like');
    const ui = new DeviceUI(document, document.createElement('div'), r);
    expect(ui.header.classList.contains('two')).toBe(false);
    expect(ui.header.querySelector('.r2')).toBeNull();
    expect(ui.header.querySelector('[data-pme="bed"]')).toBeNull();
    expect(ui.header.querySelector('[data-pme="date"]')?.textContent).toBe(formatDate(new Date(), r.skin.calendar.default, r.skin.calendar.gregorianFormat));
    expect(ui.header.querySelector('.pme-lamp')?.getAttribute('data-lamp')).toBe('off');
    ui.destroy();
  });
});
