// @vitest-environment happy-dom
// The EDP-TS screen's keys and readouts for the holds, the tests and the curves (research/57 H-12 to H-19, K-07 to
// K-17, E-14, E-15, N-02 to N-06), mounted on vent-hamilton.html's markup: the Insp/Exp Pause key held and released by
// the pointer, Plateau in the left column, Manual Insp., Freeze, Save loop and Ctrl + Graphics, the Graphics screens, a
// scale turned, Patient's Data's two pages, the Respiratory Mechanics window and its test, Help, and the screen lock;
// every word drawn is a face.json word, reason or help text, or a number.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVentDriver, DT, type VentDriver } from '@pme/ventilator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faceFromLocation, mountFace } from '../index.ts';
import { DATA, num } from './data.ts';
import FACE from './face.json';

const html = readFileSync(resolve(import.meta.dirname, '../../../../vent-hamilton.html'), 'utf8');
const body = (html.split('<body>')[1] as string).split('<script')[0] as string;
const ALLOWED = new Set<string>([...Object.values(FACE.words), ...Object.values(FACE.reasons), ...Object.values(FACE.help), ...Object.values(FACE.alarms).map((a) => a.text)].map((l) => (l as { v: string }).v));
const NUMERIC = /^[-+\d.:/ ]+$/;
const withUnit = (t: string) => { const m = /^([-+\d.:/]+|---) (.+)$/.exec(t); return m !== null && ALLOWED.has(m[2]!); };
const texts = (): string[] => {
  const out: string[] = [];
  const w = document.createTreeWalker(document.querySelector('main.edp') as Node, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.textContent?.trim(); if (t) out.push(t); }
  return out;
};
const sourced = (state: string) => { for (const t of texts()) expect(ALLOWED.has(t) || NUMERIC.test(t) || withUnit(t), `${state}: "${t}"`).toBe(true); };
const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const click = (sel: string) => $(sel).click();
const wheel = (n: number) => { for (let i = 0; i < Math.abs(n); i++) $('.edp-knob').dispatchEvent(new WheelEvent('wheel', { deltaY: n > 0 ? -100 : 100, cancelable: true })); };
const knobPress = () => { const k = $('.edp-knob'); k.dispatchEvent(new PointerEvent('pointerdown')); k.dispatchEvent(new PointerEvent('pointerup')); };
const down = (sel: string) => $(sel).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
const up = (sel: string) => $(sel).dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
const winTitle = () => [...document.querySelectorAll('.edp-win .t')].map((e) => e.textContent);
const entries = () => [...document.querySelectorAll('.edp-win .edp-entry .lbl')].map((e) => e.textContent);

let wall = 0;
/** The face's repaint runs on the animation frame; the test drives the model and repaints by a knob detent's no-op. */
const mount = (d: VentDriver) => mountFace(d, faceFromLocation({ search: '?face=edp-ts' }), { linked: false });
const repaint = () => { click('[data-ctl="under:ctrl"]'); click('[data-ctl="under:ctrl"]'); };
/** Step the model 5 ms at a time until `cond`; fails after `guardS` of sim time. */
const until = (d: VentDriver, cond: () => boolean, guardS: number) => {
  const t0 = d.vs.p.t;
  d.frame(wall);
  while (!cond()) {
    if (d.vs.p.t - t0 > guardS) throw new Error(`not within ${guardS} s`);
    d.frame((wall += DT * 1000));
  }
  repaint();
};

describe('the EDP-TS screen: holds, tests and curves', () => {
  beforeEach(() => { document.body.innerHTML = body; document.head.innerHTML = ''; wall = 0; });
  afterEach(() => vi.restoreAllMocks());

  it('Insp/Exp Pause: held by the pointer it closes the valves at the end of the inspiration and lights; Plateau shows; released, it ends', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    until(d, () => d.vs.p.breathCount >= 3 && d.vs.p.phase === 'insp', 60);
    expect($('.edp-left').parentElement!.textContent).not.toContain('Plateau ');
    down('[data-ctl="under:inspExpPause"]');
    until(d, () => d.vs.hold === 'insp', 5);
    expect($('[data-ctl="under:inspExpPause"]').classList.contains('lit')).toBe(true);
    const lv = [...document.querySelectorAll('.edp-screen .lv')].map((e) => e.textContent);
    expect(lv[2], 'Plateau, under Peak and Trach.').toBe(d.vs.p.Paw.toFixed(0));
    up('[data-ctl="under:inspExpPause"]');
    expect(d.vs.hold).toBeNull();
    repaint();
    expect($('[data-ctl="under:inspExpPause"]').classList.contains('lit')).toBe(false);
    sourced('after a hold');
    ui.stop();
  });

  it('Manual Insp. gives a breath from expiration; Freeze stops the curves and lights, Esc leaves it', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    until(d, () => d.vs.p.breathCount >= 2 && d.vs.p.phase === 'exp', 60);
    const n = d.vs.p.breathCount;
    click('[data-ctl="under:manualInsp"]');
    expect(d.vs.p.breathCount).toBe(n + 1);
    click('[data-ctl="right:freeze"]');
    expect($('[data-ctl="right:freeze"]').classList.contains('lit')).toBe(true);
    click('[data-ctl="under:esc"]');
    expect($('[data-ctl="right:freeze"]').classList.contains('lit')).toBe(false);
    ui.stop();
  });

  it('Graphics: the six screens, the CO2 one not simulated; "Paw and flow" draws two curves and no loop; Save loop draws the reference, Ctrl + Graphics takes it off', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    until(d, () => d.vs.p.breathCount >= 3, 60);
    click('[data-ctl="right:saveLoop"]');
    expect([...document.querySelectorAll('.edp-panel.loop .ref')].every((e) => /^\d\d\/\d\d\/\d\d \d\d:\d\d$/.test(e.textContent!))).toBe(true);
    click('[data-ctl="under:ctrl"]'); click('[data-ctl="right:graphics"]');
    expect([...document.querySelectorAll('.edp-panel.loop .ref')].map((e) => e.textContent)).toEqual(['', '']);
    expect(winTitle(), 'Ctrl + Graphics opens no window').toEqual([]);
    click('[data-ctl="right:graphics"]');
    expect(winTitle()).toEqual(['Graphics']);
    expect(entries()).toEqual(['5 curves', 'Paw and flow', 'Paw, VT and flow', 'Loops', "Curves and Patient's Data", 'Curves and CO2']);
    expect($('.edp-win .edp-entry[aria-disabled="true"]').textContent).toBe('Curves and CO2');
    sourced('graphics window');
    wheel(1); knobPress();
    expect(winTitle()).toEqual([]);
    expect([...document.querySelectorAll('.edp-panel .lt')].map((e) => e.textContent)).toEqual(['Paw(cmH2O)', 'V\u0307(L/min)']);
    expect(document.querySelectorAll('.edp-panel.loop').length).toBe(0);
    // the screen with Patient's Data beside the curves
    click('[data-ctl="right:graphics"]'); wheel(4); knobPress();
    expect($('.edp-data').textContent).toContain('VE Mandat');
    sourced('curves and data');
    ui.stop();
  });

  it('a scale: the axis numbers touched light, the knob turns them to the next scale, the press keeps it; Autoscale in Tools goes back to No', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    const paw = () => [...$('button.edp-scale[data-ctl="scale:p"]').querySelectorAll('span')].map((e) => e.textContent);
    expect(paw()).toEqual(['35', '28', '21', '14', '7', '0', '7']);
    expect(paw()).toEqual((DATA.layout.pawLabels.v as number[]).map((v) => String(Math.abs(v))));
    click('button.edp-scale[data-ctl="scale:p"]');
    expect($('button.edp-scale[data-ctl="scale:p"]').classList.contains('sel')).toBe(true);
    wheel(1);
    expect(paw()).toEqual(['50', '40', '30', '20', '10', '0', '10']);
    knobPress();
    expect($('button.edp-scale[data-ctl="scale:p"]').classList.contains('sel')).toBe(false);
    expect(paw()[0]).toBe('50');
    // Ctrl and the knob move the axis by one label (K-13); Esc cancels
    click('button.edp-scale[data-ctl="scale:p"]'); click('[data-ctl="under:ctrl"]'); wheel(1);
    expect(paw()).toEqual(['60', '50', '40', '30', '20', '10', '0']);
    click('[data-ctl="under:esc"]');
    expect(paw()[0]).toBe('50');
    click('[data-ctl="side:menu"]'); click('[data-ctl="side:menu"]'); click('[data-ctl="side:menu"]');
    expect(winTitle().at(-1)).toBe('Tools');
    expect($('.edp-win .edp-entry').textContent).toContain('No');
    knobPress();
    expect($('.edp-win .edp-entry').textContent).toContain('Yes');
    sourced('autoscale');
    ui.stop();
  });

  it("Patient's Data: Menu, its first row; thirteen rows a page, the page number at the top right, the knob turns the page", () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    until(d, () => d.vs.p.breathCount >= 5, 60);
    click('[data-ctl="side:menu"]'); knobPress();
    expect(winTitle()).toEqual(["Patient's Data"]);
    expect($('.edp-win .pg').textContent).toBe('1/2');
    expect(entries()).toEqual(['VE Mandat', 'VE Spont', 'F Spont', 'TCexp', 'F/VT', 'Cdyn', 'WOBi', 'ETCO2', 'VCO2 (STPD)', 'Cst', 'Ri', 'Re', 'auto-PEEP']);
    expect($('.edp-win').textContent).toContain('L/min');
    sourced('patient data page 1');
    wheel(1);
    expect($('.edp-win .pg').textContent).toBe('2/2');
    expect(entries().slice(9)).toEqual(['Leak', '% leak', 'Ti/Ttot', 'Ptracheal']);
    sourced('patient data page 2');
    ui.stop();
  });

  it('Respiratory Mechanics: its rows in the figure\'s order; auto-PEEP run with the knob shows its result; faint and inert with another window open', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    until(d, () => d.vs.p.breathCount >= 3, 60);
    click('[data-ctl="side:menu"]');
    click('[data-ctl="right:respMech"]');
    expect(winTitle()).toEqual(['Menu']);
    click('[data-ctl="under:esc"]');
    click('[data-ctl="right:respMech"]');
    expect(winTitle()).toEqual(['Respiratory Mechanics']);
    expect(entries()).toEqual(['auto-PEEP', 'Compliance and resistance', 'Trapped volume', 'Slow vital capacity', 'P0.1', 'PV flex', 'Pimax', 'VD/VT Physiologic']);
    expect([...document.querySelectorAll('.edp-win .edp-entry[aria-disabled="true"] .lbl')].map((e) => e.textContent)).toEqual(['Slow vital capacity', 'PV flex', 'Pimax', 'VD/VT Physiologic']);
    expect($('.edp-win .edp-entry .val').textContent).toBe('---');
    knobPress();
    until(d, () => d.vs.hold === 'exp', 30);
    until(d, () => d.vs.hold === null, num(DATA.mechanics.occlusionS) + 1);
    expect($('.edp-win .edp-entry .val').textContent).toMatch(/^\d+\.\d cmH2O$/);
    expect($('.edp-strip .why').textContent).toBe(FACE.reasons.testDone.v);
    sourced('respiratory mechanics');
    ui.stop();
  });

  it('Help: "?" then a key shows that key\'s help in a window; Esc closes it', () => {
    const ui = mount(createVentDriver(null));
    click('[data-ctl="right:help"]');
    expect($('[data-ctl="right:help"]').classList.contains('lit')).toBe(true);
    click('[data-ctl="key:peep"]');
    expect(winTitle()).toEqual(['Help']);
    expect($('.edp-win p.help').textContent).toBe(FACE.help['key:peep'].v);
    sourced('help');
    click('[data-ctl="under:esc"]');
    expect(winTitle()).toEqual([]);
    ui.stop();
  });

  it('the screen lock: the padlock held 2 s locks the touch keys and the keys beside the screen; the knob and the keys under it stay live; a press unlocks', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const d = createVentDriver(null);
    const ui = mount(d);
    down('[data-ctl="under:lock"]');
    now += num(DATA.mechanics.lockHoldS) * 1000;
    up('[data-ctl="under:lock"]');
    expect($('[data-ctl="under:lock"]').classList.contains('lit')).toBe(true);
    click('[data-ctl="side:mode"]');
    expect(winTitle(), 'Mode is locked').toEqual([]);
    expect($('.edp-strip .why').textContent).toBe(FACE.reasons.locked.v);
    click('[data-ctl="key:peep"]'); wheel(2); knobPress();
    expect(d.vs.cfg.peep, 'the touch screen is locked').toBe(5);
    const n = d.vs.p.breathCount;
    until(d, () => d.vs.p.phase === 'exp' && d.vs.p.breathCount >= 2, 30);
    click('[data-ctl="under:manualInsp"]');
    expect(d.vs.p.breathCount, 'the keys under the screen stay live').toBeGreaterThan(n);
    down('[data-ctl="under:lock"]'); up('[data-ctl="under:lock"]');
    click('[data-ctl="side:mode"]');
    expect(winTitle()).toEqual(['Operative Modes']);
    ui.stop();
  });

  it('a padlock press shorter than 2 s does not lock', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const ui = mount(createVentDriver(null));
    down('[data-ctl="under:lock"]');
    now += num(DATA.mechanics.lockHoldS) * 1000 - 1;
    up('[data-ctl="under:lock"]');
    click('[data-ctl="side:mode"]');
    expect(winTitle()).toEqual(['Operative Modes']);
    ui.stop();
  });
});
