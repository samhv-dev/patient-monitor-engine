// @vitest-environment happy-dom
// Plan vent-skin-edp-ts.md §4.4 / V0: the Hamilton-style face mounted through the face registry builds the same DOM as
// `mountHamiltonUi` did on the base commit (218c7d5b). The fixture (dom.fixture.json) was captured from the unchanged
// function by this same walk; it is compared as explicit JSON, never as a vitest snapshot that `-u` could rewrite.
// The walk records every element's tag, id, classes, data-key, the inputs' type/min/max/step/value/checked, inline
// styles and own text, plus the settings, after real events: mode choices through the Modes sheet, each Controls tab
// for each mode, the Alarms sheet, the drawer and its toggles and sliders, a wheel on a dial, the rail's mini buttons,
// a scenario, a preset, the banner, the scrim and a remote control patch. No animation frame runs (the driver has no
// port and the face is stopped synchronously), so every value is deterministic.
// Capture (base commit only): PME_CAPTURE_DOM=1 npx vitest run src/vent/faces/hamilton/face.dom.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVentDriver, type VentDriver } from '@pme/ventilator';
import { expect, it } from 'vitest';
import { faceFromLocation, mountFace } from '../index.ts';

const mount = (d: VentDriver): { stop(): void } => mountFace(d, faceFromLocation({ search: '' }), { linked: false });

const here = import.meta.dirname;
const FIXTURE = resolve(here, 'dom.fixture.json');
const html = readFileSync(resolve(here, '../../../../vent-hamilton.html'), 'utf8');
const body = (html.split('<body>')[1] as string).split('<script')[0] as string;

function walk(): string[] {
  const out: string[] = [];
  const visit = (e: Element, depth: number) => {
    const a: string[] = [e.tagName.toLowerCase()];
    if (e.id) a.push('#' + e.id);
    if (e.className && typeof e.className === 'string') a.push('.' + e.className.trim().split(/\s+/).join('.'));
    for (const n of ['data-key', 'data-view', 'style', 'type', 'min', 'max', 'step', 'title', 'disabled']) {
      const v = e.getAttribute(n);
      if (v !== null) a.push(`[${n}=${v}]`);
    }
    if (e instanceof HTMLInputElement) a.push(`value=${e.value}`, `checked=${e.checked}`);
    const text = [...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent?.trim()).filter(Boolean).join('|');
    if (text) a.push(`"${text}"`);
    out.push('  '.repeat(depth) + a.join(' '));
    [...e.children].forEach((c) => visit(c, depth + 1));
  };
  [...document.body.children].forEach((c) => visit(c, 0));
  return out;
}

function capture(): Record<string, unknown> {
  document.body.innerHTML = body;
  const d = createVentDriver(null, 'normal');
  const ui = mount(d);
  const S = d.vs.cfg;
  const states: Record<string, unknown> = {};
  const snap = (name: string) => {
    states[name] = { dom: walk(), cfg: { ...S }, hold: d.vs.hold, pendingHold: d.vs.pendingHold, silenceUntil: d.vs.silenceUntil };
  };
  const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
  const byText = (sel: string, t: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent === t) as HTMLElement;
  const click = (e: HTMLElement) => e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const input = (e: HTMLInputElement, v: string) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  const toggle = (e: HTMLInputElement) => { e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true })); };

  snap('mount');
  click($('#modesBtn'));
  snap('modes-sheet');
  click($('#scrim'));
  snap('scrim-closed');
  // one Hamilton name per VentMode, then back to (S)CMV+
  for (const nm of ['PCV+', 'APVcmv', 'PSIMV+', 'ASV', '(S)CMV+']) {
    click($('#modesBtn'));
    click(byText('.modebtn', nm));
    click(byText('.modefoot button', 'Confirm'));
    snap(`mode:${nm}`);
    click($('#tabSystem'));
    snap(`controls-basic:${nm}`);
    click(byText('.stab', 'More'));
    snap(`controls-more:${nm}`);
    click(byText('.stab', 'Apnea'));
    snap(`controls-apnea:${nm}`);
    click($('#closeSheet'));
    click(byText('#rail .railbtn', 'Alarms'));
    snap(`alarms:${nm}`);
    click($('#closeSheet'));
  }
  // a cancelled mode choice
  click($('#modesBtn'));
  click(byText('.modebtn', 'DuoPAP'));
  click(byText('.modefoot button', 'Cancel'));
  snap('mode-cancelled');
  // sheet controls: a slider, the number field, a segment, the TRC toggle
  click($('#tabSystem'));
  input($('#sheetBody input[data-key="peep"]') as HTMLInputElement, '9');
  input($('#sheetBody input[data-key="vcFlow"]') as HTMLInputElement, '45');
  input($('#sheetBody input[type="number"]') as HTMLInputElement, '1234');
  snap('basic-edited');
  click(byText('.stab', 'More'));
  click(byText('.seg2 button', 'Decel'));
  toggle($('#sheetBody input[type="checkbox"]') as HTMLInputElement); // sigh
  toggle([...document.querySelectorAll<HTMLInputElement>('#sheetBody input[type="checkbox"]')][1] as HTMLInputElement); // TRC
  snap('more-edited');
  click($('#closeSheet'));
  click(byText('#rail .railbtn', 'Alarms'));
  input($('#sheetBody input[data-key="pmax"]') as HTMLInputElement, '66');
  snap('alarms-edited');
  click($('#closeSheet'));
  // the dial: a wheel up on PEEP, a drag on Rate, a double-click opens Controls
  $('.dial[data-key="peep"]').dispatchEvent(new WheelEvent('wheel', { deltaY: -1, cancelable: true }));
  const rate = $('.dial[data-key="rate"]');
  rate.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, pointerId: 1 }));
  rate.dispatchEvent(new PointerEvent('pointermove', { clientY: 60, pointerId: 1 }));
  rate.dispatchEvent(new PointerEvent('pointerup', { clientY: 60, pointerId: 1 }));
  snap('dials-turned');
  $('.dial[data-key="peep"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  snap('dial-dblclick');
  click($('#closeSheet'));
  // rail mini buttons
  click(byText('#rail .railbtn', 'Freeze'));
  snap('frozen');
  click(byText('#rail .railbtn', 'Resume'));
  click(byText('#rail .railbtn', 'Insp hold'));
  snap('insp-hold-armed');
  click(byText('#rail .railbtn', 'Man. breath'));
  click(byText('#rail .railbtn', 'Reset'));
  snap('reset');
  // view tabs
  click($('.vtab[data-view="cockpit"]'));
  snap('view-cockpit');
  click($('.vtab[data-view="graphics"]'));
  // the drawer (the simulator's tools)
  click(byText('#rail .railbtn', 'Patient'));
  snap('drawer');
  const dIn = (i: number) => [...document.querySelectorAll<HTMLInputElement>('#dcols input')][i] as HTMLInputElement;
  input(dIn(0), '30'); // compliance
  snap('drawer-compliance');
  const tog = (label: string) => [...document.querySelectorAll<HTMLElement>('#dcols .dfld')].find((f) => f.querySelector('.lab > span')?.textContent === label)?.querySelector('input') as HTMLInputElement;
  toggle(tog('Airway Closure'));
  snap('drawer-airway-closure');
  toggle(tog('Spontaneous Breathing'));
  input([...document.querySelectorAll<HTMLInputElement>('#dcols input[type="range"]')].at(-1) as HTMLInputElement, '50');
  snap('drawer-spont');
  click($('#scrim'));
  snap('drawer-scrim-closed');
  click($('#tabUtil'));
  click(byText('#dcols .presets button', (document.querySelectorAll<HTMLElement>('#dcols .presets button')[1] as HTMLElement).textContent as string));
  snap('preset');
  click(document.querySelectorAll<HTMLElement>('#asyncBtns button')[0] as HTMLElement);
  snap('scenario');
  click($('#tabUtil'));
  click($('#closeDrawer'));
  snap('drawer-closed');
  // the banner silences; a remote control patch redraws everything
  click($('#alarmBanner'));
  snap('silenced');
  S.peep = 14;
  S.rate = 22;
  d.onControl?.();
  snap('remote');
  ui.stop();
  snap('stopped');
  return states;
}

it('the Hamilton-style face builds the base commit DOM (fixture captured from mountHamiltonUi on 218c7d5b)', () => {
  const now = capture();
  if (process.env.PME_CAPTURE_DOM === '1') writeFileSync(FIXTURE, JSON.stringify(now, null, 1) + '\n');
  const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, unknown>;
  expect(Object.keys(now)).toEqual(Object.keys(want));
  for (const k of Object.keys(want)) expect(now[k], k).toEqual(want[k]);
});
