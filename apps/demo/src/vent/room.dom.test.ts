// @vitest-environment happy-dom
// A ventilator linked to a room has none of the simulator's tools in its page (the patient is the room's): no drawer,
// no control inside it, no way to open it, under either face. The stand-alone page keeps them, and its closed drawer
// is out of the Tab order and the accessibility tree.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createVentDriver, PRESETS } from '@pme/ventilator';
import { beforeEach, describe, expect, it } from 'vitest';
import { faceFromLocation, mountFace } from './faces/index.ts';

const html = readFileSync(resolve(import.meta.dirname, '../../vent-hamilton.html'), 'utf8');
const body = (html.split('<body>')[1] as string).split('<script')[0] as string;
const FACES = { 'hamilton-style': '', 'edp-ts': '?face=edp-ts' } as const;
const mount = (search: string, room: boolean) => mountFace(createVentDriver(null), faceFromLocation({ search }), { linked: room, room });
const words = () => document.body.textContent ?? '';
/** Every way the page offers to the drawer: the Hamilton rail's Patient, its Utilities tab, the EDP-TS Simulator handle. */
const openers = () => [
  ...[...document.querySelectorAll<HTMLElement>('#rail .railbtn')].filter((b) => b.textContent === 'Patient'),
  ...document.querySelectorAll<HTMLElement>('#tabUtil, .edp-simhandle'),
];

beforeEach(() => {
  document.body.innerHTML = body;
  document.head.innerHTML = '';
});

describe.each(Object.entries(FACES))('the %s face', (_name, search) => {
  it('linked to a room: no drawer, nothing of it and no way to it in the page', () => {
    const ui = mount(search, true);
    expect(document.getElementById('drawer')).toBeNull();
    expect(openers()).toEqual([]);
    for (const p of Object.values(PRESETS)) expect(words()).not.toContain(p.label);
    expect(words()).not.toContain('Asynchrony examples');
    expect(document.querySelectorAll('input[type=range], input[type=checkbox]').length).toBe(document.querySelectorAll('#sheet input[type=range], #sheet input[type=checkbox]').length);
    ui.stop();
  });

  it('stand-alone: the drawer is there and opens; closed, it is inert', () => {
    const ui = mount(search, false);
    const drawer = document.getElementById('drawer') as HTMLElement;
    expect(drawer.hasAttribute('inert')).toBe(true);
    const ways = openers();
    expect(ways.length).toBeGreaterThan(0);
    for (const way of ways) {
      way.click();
      expect(drawer.classList.contains('on')).toBe(true);
      expect(drawer.hasAttribute('inert')).toBe(false);
      for (const p of Object.values(PRESETS)) expect(drawer.textContent).toContain(p.label);
      (document.getElementById('closeDrawer') as HTMLElement).click();
      expect(drawer.classList.contains('on')).toBe(false);
      expect(drawer.hasAttribute('inert')).toBe(true);
    }
    ui.stop();
  });
});
