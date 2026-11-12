// @vitest-environment happy-dom
// The EDP-TS face's DOM (plan vent-skin-edp-ts.md V1; §5's provenance rule, §6 English only, anti-goal A1): mounted
// through the registry on vent-hamilton.html's markup (`?face=edp-ts`), every word it draws is a face.json word or
// reason (or a number), in every state the knob reaches (the mode window, its confirmation, Menu one to three, Alarm
// Limits, a pending value, an alarm, a reason in the message bar); every control not honoured is drawn, marked and
// says why OUTSIDE the device (brief 159, R20: drawn as the device draws it, the reason in the simulator's strip and as
// the control's description); the mode windows are titled and ordered as photographed (VF, R14: research/57 P-01,
// P-02); stop() gives the page back unchanged.
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
    expect([...document.querySelectorAll('.edp-win .t')].map((e) => e.textContent)).toEqual(['Operative Modes']);
    expect([...document.querySelectorAll('.edp-win .edp-entry .lbl')].map((e) => e.textContent)).toEqual(['VCV', 'PCV', 'PSV/CPAP', 'SIMV(PCV)+PSV', 'SIMV(VCV)+PSV', 'Noninvasive (NIV)', 'Other Operative modes']);
    wheel(2); knobPress();
    // the second window takes the first one's place, as photographed (IMG_1545; V1 drew both side by side)
    expect([...document.querySelectorAll('.edp-win .t')].map((e) => e.textContent)).toEqual(['Operative Modes']);
    expect([...document.querySelectorAll('.edp-win .edp-entry .lbl')].map((e) => e.textContent)).toEqual(['MMV+PSV', 'PSV+VT Assured', 'APRV', 'PRVC', 'Other Operative modes']);
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
    // the reason is in the simulator's strip outside the device; the device's message bar keeps its own message
    expect(document.querySelector('.edp-strip .why')!.textContent).toBe('Nebulised gas is not modelled');
    expect(document.querySelector('.edp-strip')!.closest('main')).toBeNull();
    expect(document.querySelector('.edp-msg .txt')!.textContent).toBe('Volume compensation');
    d.vs.cfg.pmax = 10; // a pressure limit under the breath's peak: the model's alarm, in the device's words
    let ms = 0;
    for (let i = 0; i < 100; i++) d.frame((ms += 100));
    click('[data-ctl="under:ctrl"]'); // any change redraws
    check('alarm');
    expect(document.querySelector('.edp-alarm')!.textContent).toBe('High Pressure');
    expect(document.querySelector('.edp-alarm')!.className).toContain('high');
    // nothing about the simulator is written on the device (R20)
    for (const t of seen) expect(t, t).not.toMatch(/piece|simulated|modelled/);
    ui.stop();
  });

  it('every control not honoured yet is drawn as the device draws it, marked unavailable and described with its reason', () => {
    const ui = mount(createVentDriver(null));
    const why = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
    for (const b of document.querySelectorAll<HTMLElement>('[data-ctl^="right:"], [data-ctl^="under:"]:not([data-ctl="under:ctrl"]):not([data-ctl="under:esc"])')) {
      expect(b.getAttribute('aria-disabled'), b.dataset.ctl).toBe('true');
      expect(why(b), b.dataset.ctl).toMatch(/not simulated yet|not modelled|cannot be changed yet/);
      expect(b.dataset.unsim, b.dataset.ctl).toBeTruthy();
    }
    // V3 turned these on: the device's limits (research/57 L-02, L-13, L-08), live, and the silence key
    for (const [id, v] of [['tag:pLo', '5'], ['tag:peepHi', '20.0'], ['tag:o2Hi', '60'], ['tag:o2Lo', '40']]) expect(document.querySelector(`[data-ctl="${id}"] .tv`)!.textContent).toBe(v);
    for (const id of ['tag:pLo', 'tag:peepHi', 'tag:o2Hi', 'tag:o2Lo', 'side:silence']) expect(document.querySelector(`[data-ctl="${id}"]`)!.getAttribute('aria-disabled'), id).not.toBe('true');
    click('[data-ctl="side:mode"]');
    const off = [...document.querySelectorAll<HTMLElement>('.edp-entry[aria-disabled="true"]')].map((e) => [e.textContent, why(e)]);
    expect(off).toEqual([['PSV/CPAP', 'PSV/CPAP is not simulated yet'], ['SIMV(PCV)+PSV', 'SIMV modes are not simulated yet'], ['SIMV(VCV)+PSV', 'SIMV modes are not simulated yet'], ['Noninvasive (NIV)', 'NIV is not simulated yet']]);
    ui.stop();
  });

  it("the drawer's switch marks what is not simulated yet; off by default", () => {
    const ui = mount(createVentDriver(null));
    expect(document.querySelector('main.edp')!.classList.contains('edp-show-unsim')).toBe(false);
    (document.querySelector('.edp-simhandle') as HTMLElement).click();
    const cb = [...document.querySelectorAll<HTMLInputElement>('#drawer input[type=checkbox]')].find((i) => i.parentElement?.textContent === 'Show what is not simulated yet')!;
    expect(cb.checked).toBe(false);
    cb.click();
    expect(document.querySelector('main.edp')!.classList.contains('edp-show-unsim')).toBe(true);
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
