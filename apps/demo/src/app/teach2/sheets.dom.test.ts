// @vitest-environment happy-dom
// The sheets slot (plan IP7; design §3.6, §4; answers 14–16) on a real Link over the in-process hub: the dock's tools
// (no Gas); D, A, F and V open their sheets and the same letter closes; Esc closes (from a field in the sheet too); one
// sheet at a time, lit in the dock; a sheet reopens on its last item; Enter gives now; and the other sheets mount
// today's tab bodies unmodified (the same markup as the tab builder makes on the same Link).
import { ControllerSession, createInProcessHub, createStamper, type WireCommand, type WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { Link } from '../link.ts';
import { airwayTab } from '../panel/airway.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { defibTab } from '../panel/defib.ts';
import { devicesTab } from '../panel/devices.ts';
import { logTab } from '../panel/log.ts';
import { patientTab } from '../panel/patient.ts';
import { vitalsTab } from '../panel/vitals.ts';
import { DEFAULT_SITE } from '../site.ts';
import { Staging } from '../staging.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mountKeys } from './keys.ts';
import { mount } from './sheets.ts';

const S = 'SHT234';
const settle = () => new Promise((r) => setTimeout(r, 0));
const key = (k: string, target: EventTarget = document.body) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

let done: Array<() => void> = [];
afterEach(() => {
  for (const f of done) f();
  done = [];
  document.body.replaceChildren();
});

function rig() {
  const hub = createInProcessHub();
  const host = hub.connect();
  const t = hub.connect();
  const ctl = new ControllerSession({ session: S, transport: t, peerId: 'ctl-s' });
  const link = new Link(ctl, t, null);
  const got: WireCommand[] = [];
  const stamp = createStamper(S, 'host-1');
  host.onMessage((m: WireMessage) => {
    if (m.kind !== 'command') return;
    got.push(m.body);
    host.send(stamp({ kind: 'ack', commandId: m.body.id, accepted: true, tick: 9 }));
  });
  const root = document.createElement('div');
  const layer = document.createElement('div');
  const tools = document.createElement('div');
  const note = document.createElement('div');
  root.append(layer, tools, note);
  document.body.append(root);
  const keys = mountKeys(root, { link, togglePause: () => undefined });
  const ctx: Teach2Ctx = { link, site: DEFAULT_SITE, weightKg: () => 70, keys, dock: { tools, note }, openSheet: () => undefined };
  const slot = mount(layer, ctx);
  done.push(() => (slot.destroy(), keys.destroy(), link.close(), ctl.close()));
  const open = () => [...layer.querySelectorAll<HTMLElement>('.ip2-sheet:not([hidden])')].map((s) => s.dataset.sheet);
  const sheet = () => layer.querySelector<HTMLElement>('.ip2-sheet:not([hidden])') as HTMLElement;
  const lit = () => [...tools.querySelectorAll<HTMLElement>('.ip2-tool[aria-pressed="true"]')].map((b) => b.textContent);
  return { link, got, root, layer, tools, ctx, slot, open, sheet, lit };
}

/** A tab body's markup with the generated ids taken out (ui.ts `input`/`select` make random ones), and the sheet's
 *  `ip2-<sheet>-` prefix on the ids and their references taken off (IP9 review M2). */
const shape = (el: Element) => el.outerHTML.replace(/ (id|for|aria-describedby|aria-labelledby|aria-controls)="ip2-[a-z]+-/g, ' $1="').replace(/ (id|for)="f[a-z0-9]+"/g, '');

describe('the sheets', () => {
  it('the dock\'s tools in order, no Gas; a press opens its sheet over ACTION, lit, and the same press closes it', () => {
    const r = rig();
    expect([...r.tools.querySelectorAll('.ip2-tool')].map((b) => b.textContent)).toEqual(['Drug', 'Airway', 'Defib · CPR', 'Vitals', 'Devices', 'Patient', 'Log']);
    expect(r.tools.querySelector('.ip2-staged')?.textContent).toBe('Staged · 0');
    expect((r.tools.querySelector('.ip2-staged') as HTMLElement).hidden, 'hidden while nothing is staged').toBe(true);
    expect(r.layer.children).toHaveLength(0); // nothing built until a sheet opens
    (r.tools.querySelector('[data-sheet="devices"]') as HTMLButtonElement).click();
    expect(r.open()).toEqual(['devices']);
    expect(r.lit()).toEqual(['Devices']);
    expect(r.sheet().getAttribute('role')).toBe('dialog');
    expect(r.sheet().querySelector('.ip2-sheet-name')?.textContent).toBe('Devices');
    (r.tools.querySelector('[data-sheet="devices"]') as HTMLButtonElement).click();
    expect(r.open()).toEqual([]);
    expect(r.lit()).toEqual([]);
  });

  it('D, A, F and V open their sheets, one at a time; the same letter closes; Esc closes', () => {
    const r = rig();
    for (const [k, id] of [['d', 'drug'], ['a', 'airway'], ['f', 'defib'], ['v', 'vitals']] as const) {
      key(k);
      expect(r.open()).toEqual([id]);
    }
    key('v');
    expect(r.open()).toEqual([]);
    key('d');
    expect(r.open()).toEqual(['drug']);
    key('d');
    expect(r.open()).toEqual([]);
    key('a');
    key('Escape');
    expect(r.open()).toEqual([]);
    // Esc with nothing open is not taken (the view's other Esc handlers keep it)
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('Esc closes from a field inside the sheet (where the view\'s keys do not answer); letters type there', () => {
    const r = rig();
    key('d');
    const search = r.sheet().querySelector<HTMLInputElement>('.ip2-drug-search') as HTMLInputElement;
    search.focus();
    key('a', search);
    expect(r.open()).toEqual(['drug']); // typing, not opening Airway
    key('Escape', search);
    expect(r.open()).toEqual([]);
  });

  it('a sheet reopens on its last item and group', () => {
    const r = rig();
    key('d');
    (r.sheet().querySelector('[data-group="induction"]') as HTMLButtonElement).click();
    (r.sheet().querySelector('.ip2-pick[data-key="drug:propofol"]') as HTMLButtonElement).click();
    key('Escape');
    key('a');
    key('d');
    expect(r.sheet().querySelector('[role=tab][aria-selected="true"]')?.textContent).toBe('Induction');
    expect(r.sheet().querySelector('.ip2-pick[aria-pressed="true"]')?.getAttribute('data-key')).toBe('drug:propofol');
    expect(r.sheet().querySelector('.ip2-drug-name')?.textContent).toBe('Propofol');
    // the dock's "Staged · n", shown once an item is staged, reopens the last sheet
    (r.sheet().querySelector('.ip2-add') as HTMLButtonElement).click();
    key('Escape');
    expect((r.tools.querySelector('.ip2-staged') as HTMLElement).hidden).toBe(false);
    (r.tools.querySelector('.ip2-staged') as HTMLButtonElement).click();
    expect(r.open()).toEqual(['drug']);
  });

  it('Enter gives now while the Drug sheet is open (not on a button, which has its own Enter)', async () => {
    const r = rig();
    key('d');
    (r.sheet().querySelector('[data-group="induction"]') as HTMLButtonElement).click();
    (r.sheet().querySelector('.ip2-pick[data-key="drug:propofol"]') as HTMLButtonElement).click();
    const pick = r.sheet().querySelector<HTMLButtonElement>('.ip2-pick[aria-pressed="true"]') as HTMLButtonElement;
    key('Enter', pick);
    await settle();
    expect(r.got).toEqual([]);
    r.sheet().focus();
    key('Enter', r.sheet());
    for (let i = 0; i < 20 && !r.got.length; i++) await settle();
    expect(r.got.map((c) => (c as { event?: unknown }).event)).toEqual([{ kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' }]);
  });

  it('the other sheets mount today\'s tab bodies unmodified, each with its own PanelCtx on the view\'s cache', () => {
    const r = rig();
    let refreshers: Array<() => void> = [];
    const pctx = { link: r.link, staging: new Staging('t', (c) => r.link.send(c)), site: DEFAULT_SITE, weightKg: () => 70, onRefresh: (fn) => void refreshers.push(fn), goTab: () => undefined } as PanelCtx;
    /** The tab as today's panel shows it: built, then painted once (the sheet paints a tab as it opens, as today's tabs). */
    const today = (build: (c: PanelCtx) => HTMLElement) => {
      refreshers = [];
      const el = build(pctx);
      for (const fn of refreshers) fn();
      return el;
    };
    const want: Record<string, (c: PanelCtx) => HTMLElement> = { airway: airwayTab, defib: defibTab, vitals: vitalsTab, devices: devicesTab, patient: patientTab, log: logTab };
    for (const [id, build] of Object.entries(want)) {
      r.ctx.openSheet(id);
      expect(r.open()).toEqual([id]);
      const body = r.sheet().querySelector('.ip2-sheet-left')?.firstElementChild as Element;
      expect(shape(body)).toBe(shape(today(build)));
    }
    // IP9 review M2: with today's bodies in the document too, no id is used twice, and every reference points inside
    for (const build of Object.values(want)) r.root.append(today(build));
    for (const id of Object.keys(want)) {
      r.ctx.openSheet(id);
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
      expect(ids.filter((x, i) => ids.indexOf(x) !== i), `${id}: duplicate ids`).toEqual([]);
      for (const e of r.sheet().querySelectorAll('[for], [aria-describedby]'))
        for (const ref of `${e.getAttribute('for') ?? ''} ${e.getAttribute('aria-describedby') ?? ''}`.trim().split(/\s+/)) expect(r.sheet().querySelector(`#${ref}`), `${id}: ${ref}`).not.toBeNull();
    }
    // the Log sheet adds the marks list beside today's Log body; Gas is not built
    r.ctx.openSheet('log');
    expect(r.sheet().querySelector('.ip2-sheet-right [aria-label="Marks"]')).not.toBeNull();
    r.ctx.openSheet('gas');
    expect(r.open()).toEqual(['log']);
    // the alarm count's id and today's tab ids open their sheets
    r.ctx.openSheet('drugs');
    expect(r.open()).toEqual(['drug']);
  });
});
