// @vitest-environment happy-dom
// Brief 202 (piece V3 on the redrawn face), tests first: what the EDP-TS shows when it alarms, drawn on VF's device from
// the cockpit's alarm view (V3's core, alarms-view.ts), each state reached from a scripted MODEL state on the driver's
// clock: the lamps off, lit by priority (High fast, Med/Low slow for a medium alarm, steady for a low one: research/57
// H-06), latched steady after the cause has gone until Esc (A-15, A-16, H-25); the message box (R-16, R-17; its place
// and look from the manual's screen picture, M p. 17 Figure 3-5: research/57 S-01 to S-04) with the device's own words
// (face.json `alarms`, A-31 to A-50), the higher priority only (A-03); the silenced state (A-20) shown OUTSIDE the device
// with the seconds left, since no photograph and no page shows one on the device (a marked choice, S-06); the alarm test
// (H-21); the Vent Inop lamp never lit and marked "not simulated" (GA14). The lamps' look lit and unlit is VF's, matched
// to the photographs (P-15, P-58, C-12, C-13); IMG_1542 to IMG_1546 show both lamps lit and no message, IMG_1547 both
// unlit (A-27).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVentDriver, setCircuit, type VentDriver } from '@pme/ventilator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AlarmSignals } from '../../core/alarms-view.ts';
import { faceFromLocation, mountFace } from '../index.ts';
import FACE from './face.json';

const html = readFileSync(resolve(import.meta.dirname, '../../../../vent-hamilton.html'), 'utf8');
const body = (html.split('<body>')[1] as string).split('<script')[0] as string;
const mount = (d: VentDriver) => mountFace(d, faceFromLocation({ search: '?face=edp-ts' }), { linked: false });
const clocks = new WeakMap<VentDriver, number>();
/** Run the unlinked driver for `s` seconds of sim time (100 ms frames). */
const run = (d: VentDriver, s: number) => {
  let ms = clocks.get(d) ?? 0;
  d.frame(ms);
  for (let i = 0; i < Math.round(s * 10); i++) d.frame((ms += 100));
  clocks.set(d, ms);
};
const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const click = (sel: string) => q(sel).click();
const lamp = (which: 'inop' | 'high' | 'med') => q(`.edp-lamp[data-lamp="${which}"]`);
const lamps = () => ({ inop: lamp('inop').dataset.state, high: lamp('high').dataset.state, med: lamp('med').dataset.state });
const box = () => q('.edp-alarm');
/** Start-up: the model raises Low pressure on its empty breath record at t = 0.005 s (a defect reported with an expected
 *  failure in packages/ventilator/test/alarms-edp.test.ts) and Low minute volume for 10 ms at 11 s while the minute
 *  volume builds up; both latch, as every EDP-TS alarm does. Run past them and press Esc, as the device's user would. */
const settle = (d: VentDriver) => { run(d, 15); click('[data-ctl="under:esc"]'); };
const ALARM = FACE.alarms as Record<string, { text: { v: string }; priority: { v: 'high' | 'medium' | 'low' } }>;

describe('the alarm signals on the redrawn EDP-TS face', () => {
  beforeEach(() => { document.body.innerHTML = body; document.head.innerHTML = ''; });

  it('no alarm: every lamp off (unlit as photographed, IMG_1547), no message box', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    run(d, 15);
    expect(lamps().high, 'the start-up latch (see settle)').toBe('steady');
    click('[data-ctl="under:esc"]');
    expect(lamps()).toEqual({ inop: 'off', high: 'off', med: 'off' });
    for (const w of ['inop', 'high', 'med'] as const) expect(lamp(w).className, w).not.toMatch(/on-|flash/);
    expect(box().hidden).toBe(true);
    ui.stop();
  });

  it('a disconnection: Low pressure at once, then Disconnection (A-34, 5 s); the High lamp flashing fast; the box red with white words', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    setCircuit(ui.cockpit.vs, 'disconnected');
    run(d, 6);
    expect(box().hidden).toBe(false);
    expect(box().textContent).toBe(ALARM.lowPressure!.text.v);
    run(d, 8);
    expect(box().textContent).toBe('Disconnection');
    expect(box().className).toContain('high');
    expect(lamps()).toEqual({ inop: 'off', high: 'fast', med: 'off' });
    expect(lamp('high').className).toContain('on-high');
    expect(lamp('high').className).toContain('flash-fast');
    // the flash period is face.json's (eng: H-06 says only "fast")
    expect(lamp('high').style.animationDuration).toBe(`${FACE.layout.lampFastS.v}s`);
    ui.stop();
  });

  it('reconnected: the message goes at once (A-19), the High lamp stays lit, steady, until Esc (A-15, A-16, H-25)', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    setCircuit(ui.cockpit.vs, 'disconnected');
    run(d, 15);
    setCircuit(ui.cockpit.vs, 'connected');
    run(d, 30);
    expect(box().hidden).toBe(true);
    expect(lamps().high).toBe('steady');
    expect(lamp('high').className).toContain('on-high');
    expect(lamp('high').className).not.toContain('flash');
    run(d, 120);
    expect(lamps().high, 'two minutes later, still lit').toBe('steady');
    click('[data-ctl="under:esc"]');
    expect(lamps()).toEqual({ inop: 'off', high: 'off', med: 'off' });
    ui.stop();
  });

  it('a medium alarm (High O2 concentration, the SET oxygen over its limit: N111): the Med/Low lamp flashing slow, the box yellow', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    ui.cockpit.vs.cfg.almO2hi = ui.cockpit.cfg.fio2 - 5;
    run(d, 31);
    expect(box().textContent).toBe(ALARM.o2High!.text.v);
    expect(box().className).toContain('medium');
    expect(lamps()).toEqual({ inop: 'off', high: 'off', med: 'slow' });
    expect(lamp('med').className).toContain('flash-slow');
    expect(lamp('med').style.animationDuration).toBe(`${FACE.layout.lampSlowS.v}s`);
    ui.stop();
  });

  it('a low alarm (High rate, A-50, after 30 s): the Med/Low lamp lit steady (H-06: low does not flash), the box yellow', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    ui.cockpit.vs.cfg.almFhi = 5;
    run(d, 40);
    expect(box().textContent).toBe(ALARM.fHigh!.text.v);
    expect(box().className).toContain('low');
    expect(lamps()).toEqual({ inop: 'off', high: 'off', med: 'steady' });
    expect(lamp('med').className).not.toContain('flash');
    ui.stop();
  });

  it('two at once: only the higher priority is the message (A-03); both lamps by their own priority', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    ui.cockpit.vs.cfg.almO2hi = ui.cockpit.cfg.fio2 - 5;
    run(d, 31);
    setCircuit(ui.cockpit.vs, 'disconnected');
    run(d, 15);
    expect(box().textContent).toBe('Disconnection');
    expect(lamps()).toEqual({ inop: 'off', high: 'fast', med: 'slow' });
    ui.stop();
  });

  it('every message is the device\'s own words, on its priority\'s colour (face.json alarms, research/57 A-31 to A-50)', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    const c = ui.cockpit;
    const real = c.alarms.bind(c);
    for (const [id, a] of Object.entries(ALARM)) {
      const signals: AlarmSignals = {
        message: { id: id as never, priority: a.priority.v }, sounding: a.priority.v,
        lamps: { high: a.priority.v === 'high' ? 'fast' : 'off', medLow: a.priority.v === 'medium' ? 'slow' : a.priority.v === 'low' ? 'steady' : 'off' },
        signals: [], silencedS: 0,
      };
      c.alarms = () => ({ ...real(), signals });
      click('[data-ctl="under:esc"]'); // any knob action repaints (Esc: nothing latched here to reset)
      expect(box().textContent, id).toBe(a.text.v);
      expect(box().className, id).toContain(a.priority.v);
    }
    c.alarms = real;
    ui.stop();
  });

  it('the silence key: the device unchanged (lamp and message stay, A-20); the seconds left shown outside it (a choice, S-06)', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    setCircuit(ui.cockpit.vs, 'disconnected');
    run(d, 15);
    click('[data-ctl="side:silence"]');
    const sil = q('.edp-strip .sil');
    expect(sil.closest('main'), 'not on the device').toBeNull();
    expect(sil.textContent).toBe(`${FACE.reasons.silenced.v}: 30 s`);
    expect(box().textContent).toBe('Disconnection');
    expect(lamps().high).toBe('fast');
    run(d, 10);
    click('[data-ctl="side:silence"]');
    expect(sil.textContent, 'a second press: 60 s from the first').toBe(`${FACE.reasons.silenced.v}: 50 s`);
    expect(q('[data-ctl="side:silence"]').getAttribute('aria-disabled')).not.toBe('true');
    ui.stop();
  });

  it('Ctrl + Alarm Limits with no alarm: the alarm test starts with the High lamp (H-21); Esc is not needed after it', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    click('[data-ctl="under:ctrl"]');
    click('[data-ctl="side:alarmLimits"]');
    expect(lamps()).toEqual({ inop: 'off', high: 'fast', med: 'off' });
    expect(box().hidden, 'a lamp and tone test: no message').toBe(true);
    ui.stop();
  });

  it('the Vent Inop lamp: never lit (the model has no technical fault), and described as not simulated (GA14)', () => {
    const d = createVentDriver(null);
    const ui = mount(d);
    settle(d);
    setCircuit(ui.cockpit.vs, 'disconnected');
    run(d, 10);
    expect(lamps().inop).toBe('off');
    const inop = lamp('inop');
    expect(inop.dataset.unsim).toBe('ventInop');
    expect(document.getElementById(inop.getAttribute('aria-describedby') ?? '')?.textContent).toBe(FACE.reasons.ventInop.v);
    ui.stop();
  });
});
