// @vitest-environment happy-dom
// The EDP-TS face's DOM (plan vent-skin-edp-ts.md V1; §5's provenance rule, §6 English only, anti-goal A1): mounted
// through the registry on vent-hamilton.html's markup (`?face=edp-ts`), every word it draws is a face.json word or
// reason (or a number), in every state the knob reaches (the mode window, its confirmation, Menu one to three, Alarm
// Limits, a pending value, an alarm, a reason in the message bar); every control not honoured is drawn, marked and
// says why; the mode window is the manual's (research/57 O-09, O-10, VQ7); stop() gives the page back unchanged.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVentDriver, type VentDriver } from '@pme/ventilator';
import { beforeEach, describe, expect, it } from 'vitest';
import { faceFromLocation, mountFace } from '../index.ts';
import FACE from './face.json';

const html = readFileSync(resolve(import.meta.dirname, '../../../../vent-hamilton.html'), 'utf8');
const body = (html.split('<body>')[1] as string).split('<script')[0] as string;
const ALLOWED = new Set<string>([...Object.values(FACE.words), ...Object.values(FACE.reasons), ...Object.values(FACE.alarms).map((a) => a.text)].map((l) => (l as { v: string }).v));
const NUMERIC = /^[-+\d.:/ ]+$/;

const mount = (d: VentDriver) => mountFace(d, faceFromLocation({ search: '?face=edp-ts' }), { linked: false });
const texts = (): string[] => {
  const out: string[] = [];
  const w = document.createTreeWalker(document.querySelector('main.edp') as Node, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.textContent?.trim(); if (t) out.push(t); }
  return out;
};
const click = (sel: string) => (document.querySelector(sel) as HTMLElement).click();
const wheel = (n: number) => { for (let i = 0; i < Math.abs(n); i++) document.querySelector('.edp-knob')!.dispatchEvent(new WheelEvent('wheel', { deltaY: n > 0 ? -100 : 100, cancelable: true })); };
const knobPress = () => { const k = document.querySelector('.edp-knob')!; k.dispatchEvent(new PointerEvent('pointerdown')); k.dispatchEvent(new PointerEvent('pointerup')); };

describe('the EDP-TS face', () => {
  beforeEach(() => { document.body.innerHTML = body; document.head.innerHTML = ''; });

  it('chosen by ?face=edp-ts; draws only sourced words, in every state the knob reaches', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    const seen = new Set<string>();
    const check = (state: string) => { for (const t of texts()) { seen.add(t); expect(ALLOWED.has(t) || NUMERIC.test(t), `${state}: "${t}"`).toBe(true); } };
    check('running');
    expect(document.querySelector('main.edp h1')?.textContent).toBe('EDP-TS');
    click('[data-ctl="side:mode"]'); check('mode window');
    expect([...document.querySelectorAll('.edp-win .t')].map((e) => e.textContent)).toEqual(['Ventilation Modes']);
    wheel(2); knobPress();
    expect([...document.querySelectorAll('.edp-win .t')].map((e) => e.textContent)).toEqual(['Ventilation Modes', 'Other ventilation Modes']);
    check('other modes');
    knobPress(); check('confirmation');
    expect(document.querySelector('.edp-win.conf')?.textContent).toContain('Mode PRVC');
    knobPress();
    expect(d.vs.cfg.mode).toBe('PRVC');
    for (let i = 0; i < 3; i++) { click('[data-ctl="side:menu"]'); check(`menu ×${i + 1}`); }
    click('[data-ctl="under:esc"]'); click('[data-ctl="under:esc"]');
    click('[data-ctl="side:alarmLimits"]'); check('alarm settings');
    click('[data-ctl="under:esc"]');
    click('[data-ctl="key:peep"]'); wheel(3); check('pending');
    expect(document.querySelector('[data-ctl="key:peep"]')!.className).toContain('sel');
    expect(document.querySelector('[data-ctl="key:peep"] .v')!.textContent).toBe('8');
    expect(d.vs.cfg.peep).toBe(5);
    knobPress();
    expect(d.vs.cfg.peep).toBe(8);
    click('[data-ctl="right:nebulizer"]'); check('a reason');
    expect(document.querySelector('.edp-msg .txt')!.textContent).toBe('nebulised gas not modelled');
    d.vs.cfg.pmax = 10; // a pressure limit under the breath's peak: the model's alarm, in the device's words
    let ms = 0;
    for (let i = 0; i < 100; i++) d.frame((ms += 100));
    click('[data-ctl="under:ctrl"]'); // any change redraws
    check('alarm');
    expect(document.querySelector('.edp-alarm')!.textContent).toBe('High Pressure');
    expect(document.querySelector('.edp-alarm')!.className).toContain('high');
    expect(seen.has('needs piece V4')).toBe(true);
    ui.stop();
  });

  it('every control not honoured yet is drawn, marked unavailable and says why', () => {
    const ui = mount(createVentDriver(null));
    for (const b of document.querySelectorAll<HTMLElement>('[data-ctl^="right:"], [data-ctl="side:silence"], [data-ctl^="under:"]:not([data-ctl="under:ctrl"]):not([data-ctl="under:esc"])')) {
      expect(b.getAttribute('aria-disabled'), b.dataset.ctl).toBe('true');
      expect(b.querySelector('.r')?.textContent, b.dataset.ctl).toMatch(/needs piece V\d|not modelled/);
    }
    for (const id of ['tag:pLo', 'tag:peepHi', 'tag:o2Hi', 'tag:o2Lo']) expect(document.querySelector(`[data-ctl="${id}"] .tv`)!.textContent).toBe('---');
    click('[data-ctl="side:mode"]');
    const off = [...document.querySelectorAll('.edp-row.off')].map((e) => e.textContent);
    expect(off).toEqual(['PSV/CPAPneeds piece V2', 'SIMV(PCV)+PSVneeds piece V6', 'Noninvasive (NIV)needs piece V8']);
    ui.stop();
  });

  it('the Simulator handle sits outside the device and opens the instructor\'s tools', () => {
    const ui = mount(createVentDriver(null));
    const h = document.querySelector('.edp-simhandle') as HTMLElement;
    expect(h.closest('main')).toBeNull();
    expect(h.textContent).toBe('Simulator');
    h.click();
    expect(document.getElementById('drawer')!.classList.contains('on')).toBe(true);
    ui.stop();
  });

  it('stop() gives the page its markup back (the Hamilton face can mount again)', () => {
    const before = document.getElementById('screen')!.innerHTML;
    const ui = mount(createVentDriver(null));
    expect(document.body.classList.contains('edp-ts')).toBe(true);
    ui.stop();
    expect(document.getElementById('screen')!.innerHTML).toBe(before);
    expect(document.body.classList.contains('edp-ts')).toBe(false);
    expect(document.querySelector('style[data-face]')).toBeNull();
  });
});
