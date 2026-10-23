// @vitest-environment happy-dom
// Saadat fidelity pass 2 (the rc.3 photo review, IMG_8113; owner rulings E114–E116), the device chrome: the grid's
// label sizes and weight from the skin, the two-row header's rule, bar, lamp and bed colour, the ST bell, the blank
// IBP mean, and the limits the tiles print being the ones the alarm system acts on (E115).
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
const make = (id: string, portrait = false) => new DeviceUI(document, document.createElement('div'), resolveSkin(id), undefined, portrait);
const css = () => [...document.head.querySelectorAll('style')].at(-1)?.textContent ?? '';
const status = (over: Partial<Status> = {}): EngineEvent =>
  ({ type: 'alarmStatus', t: 5, skin: 'saadat-like', ageBand: 'adult', silencedUntil: null, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 1, active: [], ...over }) as EngineEvent;

describe('pass 2: grid labels from the skin (T3, T4, T5, T10)', () => {
  it('layout.grid.labelPx sizes a tile\'s own label; labelWeight makes the labels bold; both scale with the monitor height', () => {
    const ui = make('saadat-like');
    const c = css();
    // pass 3: the same rule also sizes a tile standing in for this one ([data-as], rule O4)
    expect(c).toContain('.pme-grid .pme-stile[data-param="HR"] [data-pme="lbl"],.pme-grid .pme-stile[data-param="HR"] .ph .pl,');
    expect(c).toContain('.pme-grid .pme-stile[data-as="HR"] .ph .pl{font-size:calc(41 * var(--pme-h, 800px) / 800)}');
    expect(c).toContain('[data-as="CO2"] .ph .pl{font-size:calc(21 * var(--pme-h, 800px) / 800)}');
    expect(c).toContain('.pme-sfield .pl{font-weight:700}');
    ui.destroy();
  });

  it('a skin without layout.grid gets none of the pass-2 tile rules (philips-like, portrait)', () => {
    for (const ui of [make('philips-like'), make('saadat-like', true)]) {
      expect(css()).not.toContain('.pme-sfield .pl{font-weight');
      expect(css()).not.toContain('[data-param="HR"] [data-pme="lbl"]');
      expect(css()).not.toContain('.pme-strip::after');
      ui.destroy();
    }
  });
});

describe('pass 2: the two-row header (G3, C2, C3, C4)', () => {
  it('BED 01 white, the category yellow; the rule under row 1, the foot rule transparent (no pixel moves)', () => {
    const ui = make('saadat-like');
    const r = resolveSkin('saadat-like');
    const q = (k: string) => ui.header.querySelector(`[data-pme="${k}"]`) as HTMLElement;
    expect(q('bed').style.color.toUpperCase()).toBe(r.render.foreground);
    expect(q('cat').style.color.toUpperCase()).toBe(r.skin.chrome.patientCategoryColor);
    expect(ui.header.style.borderBottom).toContain('transparent');
    expect(ui.header.style.getPropertyValue('--pme-hdr-rule').toUpperCase()).toBe(r.skin.chrome.divider);
    ui.destroy();
  });

  it('idle: no grey bar and no lamp; a message paints the bar, a live alarm shows the lamp', () => {
    const ui = make('saadat-like');
    const bar = ui.header.querySelector('.pme-bar') as HTMLElement;
    const lamp = ui.header.querySelector('.pme-lamp') as HTMLElement;
    ui.onEvent(status());
    ui.paint(5);
    expect(bar.style.background).toBe('transparent');
    expect(lamp.style.visibility).toBe('hidden');
    ui.onEvent(status({ active: [{ id: 'HR_HIGH', text: 'HR TOO HIGH', level: 1, priority: 'high', category: 'physiological', since: 4, acked: false, latched: false, numeric: 'hr' }] as unknown as Status['active'] }));
    ui.paint(5);
    expect(bar.textContent).toBe('HR TOO HIGH');
    expect(bar.style.background.toUpperCase()).toContain('#F00000');
    expect(lamp.style.visibility).toBe('');
    ui.destroy();
  });

  it('the one-row header (philips-like) is unchanged: its foot rule, the idle bar, the lamp always there', () => {
    const ui = make('philips-like');
    const r = resolveSkin('philips-like');
    ui.onEvent(status({ skin: 'philips-like' }));
    ui.paint(5);
    expect(ui.header.style.borderBottom.toUpperCase()).toContain(r.skin.chrome.divider);
    expect((ui.header.querySelector('.pme-bar') as HTMLElement).style.background.toUpperCase()).toContain(r.skin.alarms.messageBar.idle.bg);
    expect((ui.header.querySelector('.pme-lamp') as HTMLElement).style.visibility).toBe('');
    ui.destroy();
  });
});

describe('pass 2: tiles', () => {
  it('ST analysis off: the ST line carries the crossed bell even with the ST limit switched on (E114, IMG_8113)', () => {
    const ui = make('saadat-like');
    ui.onEvent(status({ limits: { ST_mV: { enabled: true, low: -0.2, high: 0.2, numeric: 'stII', approximate: false } } as unknown as Status['limits'] }));
    ui.paint(5);
    const st = [...ui.tiles.querySelectorAll('[data-pme="st"] .stl')].map((l) => [l.querySelector('.stt')?.textContent, l.querySelector('svg') !== null]);
    expect(st).toEqual([['PACE: OFF', false], ['ST: OFF', true], ['PVCs: OFF', true]]);
    ui.destroy();
  });

  it('T12: a blank IBP mean reads "( )", as photographed (the skin\'s no-value glyph is blank)', () => {
    const s = make('saadat-like');
    s.paint(1);
    expect(s.tiles.querySelector('[data-param="IBP1"] [data-pme="s"]')?.textContent).toBe('( )');
    s.destroy();
  });

  it('E115: the limits the tiles print are the alarm system\'s; HR driven past 150 raises HR TOO HIGH and flashes the PR tile', () => {
    const e = createEngine({ seed: 3, device: { skin: 'saadat-like' }, patient: { sensors: { abp: 'connected', co2: 'on' } } } as never);
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like', { sensors: { co2: true } }));
    let last: Status | null = null;
    e.on((x) => {
      ui.onEvent(x);
      if (x.type === 'alarmStatus') last = x;
    });
    e.advanceTo(5);
    ui.paint(5);
    const pairs = (p: string) => [...ui.tiles.querySelectorAll(`[data-param="${p}"] [data-lim]`)].map((l) => `${l.getAttribute('data-lim')} ${[...l.children].map((c) => c.textContent).join('/')}`);
    expect(pairs('HR')).toEqual(['HR 150/50']);
    expect(pairs('NIBP')).toEqual(['NIBP_S 160/90', 'NIBP_D 100/50', 'NIBP_M 110/60']);
    expect(pairs('IBP1')).toEqual(['ART_S 70/165', 'ART_D 35/100', 'ART_M 60/115']); // the row reads low, high (IMG_8113)
    expect(pairs('CO2')).toEqual(['EtCO2 50/30', 'AWRR 30/5']);
    expect(pairs('TEMP')).toEqual(['T1 39.0/35.0', 'T2 39.0/35.0']);
    expect(ui.tiles.querySelector('[data-param="HR"] [data-pme="bell"]')?.innerHTML).toBe(''); // E114: no crossed bell
    // the same limits drive the alarm
    const st = last as unknown as Status;
    expect(st.limits.HR).toMatchObject({ enabled: true, low: 50, high: 150 });
    e.dispatch({ id: 'hr160', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 160 } as never);
    e.advanceTo(40);
    ui.paint(40);
    expect((last as unknown as Status).active.map((a) => a.id)).toContain('HR_HIGH');
    expect(ui.tiles.querySelector('[data-param="HR"] [data-pme="v"]')?.className).toContain('pme-f1');
    ui.destroy();
  });
});
