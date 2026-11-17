// @vitest-environment happy-dom
// The sheets slot (plan IP7; design §3.6, §4; answers 14–16) on a real Link over the in-process hub: the dock's tools
// (no Gas); D, A, F and V open their sheets and the same letter closes; Esc closes (from a field in the sheet too); one
// sheet at a time, lit in the dock; a sheet reopens on its last item; Enter gives now; and the other sheets mount
// today's tab bodies unmodified (the same markup as the tab builder makes on the same Link).
// Brief 208 (the owner's rulings of 12 November): the dock reads Drug, Airway, CPR, Patient, Devices, Log; "CPR" is the
// tool's and its sheet's name; Patient is one sheet with two tabs, "Vitals & rhythm" first and "Patient & events", and
// the tool, a tap and V always open it on "Vitals & rhythm"; the frame's tab row answers the arrow keys, Home and End
// (the WAI-ARIA tabs pattern) on every sheet that has tabs; in MODELED a row the model computes shows its live value and
// how to change it, with no Set and no "Return to model", unless a script holds it ("Held", and that row's release).
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
import { mount, SHEETS } from './sheets.ts';

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
  const ctx: Teach2Ctx = { link, site: DEFAULT_SITE, weightKg: () => 70, keys, dock: { tools, note }, openSheet: () => undefined, loadScenario: () => true };
  const slot = mount(layer, ctx);
  done.push(() => (slot.destroy(), keys.destroy(), link.close(), ctl.close()));
  const open = () => [...layer.querySelectorAll<HTMLElement>('.ip2-sheet:not([hidden])')].map((s) => s.dataset.sheet);
  const sheet = () => layer.querySelector<HTMLElement>('.ip2-sheet:not([hidden])') as HTMLElement;
  const lit = () => [...tools.querySelectorAll<HTMLElement>('.ip2-tool[aria-pressed="true"]')].map((b) => b.textContent);
  /** The open sheet's selected tab's words. */
  const tab = () => sheet()?.querySelector('[role=tab][aria-selected="true"]')?.textContent ?? null;
  /** The open sheet's tab panel that shows (the body inside it). */
  const panel = () => sheet().querySelector<HTMLElement>('.ip2-sheet-left > [role=tabpanel]:not([hidden])') as HTMLElement;
  const tool = (id: string) => tools.querySelector(`[data-sheet="${id}"]`) as HTMLButtonElement;
  return { link, ctl, got, root, layer, tools, ctx, slot, open, sheet, lit, tab, panel, tool };
}

/** A tab body's markup with the generated ids taken out (ui.ts `input`/`select` make random ones), and the sheet's
 *  `ip2-<sheet>-` prefix on the ids and their references taken off (IP9 review M2). */
const shape = (el: Element) => el.outerHTML.replace(/ (id|for|aria-describedby|aria-labelledby|aria-controls)="ip2-[a-z]+-/g, ' $1="').replace(/ (id|for)="f[a-z0-9]+"/g, '');

describe('the sheets', () => {
  it('the dock\'s tools in order, no Gas; a press opens its sheet over ACTION, lit, and the same press closes it', () => {
    const r = rig();
    expect([...r.tools.querySelectorAll('.ip2-tool')].map((b) => b.textContent)).toEqual(['Drug', 'Airway', 'CPR', 'Patient', 'Devices', 'Log', 'Pumps']);
    expect([...r.tools.querySelectorAll<HTMLElement>('.ip2-tool')].map((b) => b.dataset.sheet)).toEqual(['drug', 'airway', 'defib', 'patient', 'devices', 'log', 'pumps']);
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
    for (const [k, id] of [['d', 'drug'], ['a', 'airway'], ['f', 'defib'], ['v', 'patient']] as const) {
      key(k);
      expect(r.open()).toEqual([id]);
    }
    expect(r.tab()).toBe('Vitals & rhythm');
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
    const pctx = { link: r.link, staging: new Staging('t', (c) => r.link.send(c)), site: DEFAULT_SITE, weightKg: () => 70, onRefresh: (fn) => void refreshers.push(fn), goTab: () => undefined, holds: false } as PanelCtx;
    /** The tab as today's panel shows it: built, then painted once (the sheet paints a tab as it opens, as today's tabs). */
    const today = (build: (c: PanelCtx) => HTMLElement) => {
      refreshers = [];
      const el = build(pctx);
      for (const fn of refreshers) fn();
      return el;
    };
    const want: Record<string, (c: PanelCtx) => HTMLElement> = { airway: airwayTab, defib: defibTab, vitals: vitalsTab, devices: devicesTab, patient: patientTab, log: logTab };
    // today's tab ids: Vitals and Patient open the Patient sheet on their own tab
    const sheetOf: Record<string, string> = { vitals: 'patient' };
    for (const [id, build] of Object.entries(want)) {
      r.ctx.openSheet(id);
      expect(r.open()).toEqual([sheetOf[id] ?? id]);
      const body = r.panel().firstElementChild as Element;
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

  it('"CPR" is the tool\'s name and its sheet\'s title; the sheet holds what it held (brief 208, ruling 1)', () => {
    const r = rig();
    r.tool('defib').click();
    expect(r.sheet().querySelector('.ip2-sheet-name')?.textContent).toBe('CPR');
    expect(r.sheet().getAttribute('aria-labelledby')).toBe('ip2-sheet-defib-h');
    expect(r.tool('defib').title).toBe('CPR (F)');
    expect(r.sheet().querySelector('.ip2-sheet-close')?.getAttribute('aria-label')).toBe('Close the CPR sheet');
    expect(r.tab()).toBe('Defib, pacing & CPR'); // the group tab keeps today's tab name
    const h = [...r.sheet().querySelectorAll('.ip2-sheet-left h3')].map((x) => x.textContent);
    expect(h.some((x) => /Defibrillator/.test(x ?? '')) && h.some((x) => /Pacing/.test(x ?? '')) && h.some((x) => /CPR/.test(x ?? ''))).toBe(true);
  });

  it('Patient is one sheet with two tabs; the tool, a tap and V always open it on "Vitals & rhythm" (brief 208, ruling 2)', () => {
    const r = rig();
    r.tool('patient').click();
    expect(r.open()).toEqual(['patient']);
    expect(r.lit()).toEqual(['Patient']);
    expect(r.sheet().querySelector('.ip2-sheet-name')?.textContent).toBe('Patient');
    expect([...r.sheet().querySelectorAll('[role=tab]')].map((t) => t.textContent)).toEqual(['Vitals & rhythm', 'Patient & events']);
    expect(r.tab()).toBe('Vitals & rhythm');
    expect(r.panel().querySelector('[data-var="hr"]')).not.toBeNull();
    expect(r.panel().querySelector('[data-event]')).toBeNull();
    // each tab controls its panel, and the panel names its tab
    for (const t of r.sheet().querySelectorAll<HTMLElement>('[role=tab]')) {
      const p = r.sheet().querySelector(`#${t.getAttribute('aria-controls')}`) as HTMLElement;
      expect(p?.getAttribute('role')).toBe('tabpanel');
      expect(p.getAttribute('aria-labelledby')).toBe(t.id);
      expect(p.hidden).toBe(t.getAttribute('aria-selected') !== 'true');
    }
    // the second tab: today's Patient body
    (r.sheet().querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    expect(r.tab()).toBe('Patient & events');
    expect(r.panel().querySelector('[data-event]')).not.toBeNull();
    expect(r.panel().querySelector('[data-var="hr"]')).toBeNull();
    // closed on "Patient & events": the tool opens it on "Vitals & rhythm" again
    r.tool('patient').click();
    expect(r.tab(), 'a tap on the tool while open on the second tab goes to the first').toBe('Vitals & rhythm');
    expect(r.open()).toEqual(['patient']);
    r.tool('patient').click();
    expect(r.open()).toEqual([]);
    r.tool('patient').click();
    expect(r.tab()).toBe('Vitals & rhythm');
    (r.sheet().querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    key('Escape');
    key('v');
    expect(r.tab(), 'V opens it on the first tab').toBe('Vitals & rhythm');
    (r.sheet().querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    key('v');
    expect(r.open(), 'V while open on the second tab goes to the first').toEqual(['patient']);
    expect(r.tab()).toBe('Vitals & rhythm');
    key('v');
    expect(r.open()).toEqual([]);
    // today's tab ids (a body's goTab, the alarm count's openSheet) open their tab
    r.ctx.openSheet('patient');
    expect(r.tab()).toBe('Patient & events');
    r.ctx.openSheet('vitals');
    expect(r.open()).toEqual(['patient']);
    expect(r.tab()).toBe('Vitals & rhythm');
    // the "Staged · n" button reopens the last sheet where it was
    (r.sheet().querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    key('Escape');
    (r.tools.querySelector('.ip2-staged') as HTMLButtonElement).click();
    expect(r.open()).toEqual(['patient']);
  });

  it('the frame\'s tab row answers ArrowRight, ArrowLeft, Home and End on every sheet that has tabs (WAI-ARIA tabs)', () => {
    const r = rig();
    const press = (k: string) => {
      const t = document.activeElement as HTMLElement;
      const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      t.dispatchEvent(e);
      return e;
    };
    let multi = 0;
    for (const s of SHEETS) {
      r.ctx.openSheet(s.id);
      const tabs = () => [...r.sheet().querySelectorAll<HTMLButtonElement>('[role=tab]')].filter((t) => !t.closest('[hidden]'));
      const n = tabs().length;
      if (!n) continue;
      expect(r.sheet().querySelector('[role=tablist]')?.getAttribute('aria-orientation') ?? 'horizontal').toBe('horizontal');
      const sel = () => tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const start = sel();
      tabs()[start]?.focus();
      expect(tabs().map((t) => t.tabIndex), `${s.id}: one tab in the Tab order`).toEqual(tabs().map((_, i) => (i === start ? 0 : -1)));
      const e = press('ArrowRight');
      expect(e.defaultPrevented, `${s.id}: ArrowRight is taken`).toBe(true);
      expect(sel(), `${s.id}: ArrowRight`).toBe((start + 1) % n);
      expect(document.activeElement, `${s.id}: the focus moves with the selection`).toBe(tabs()[sel()]);
      press('ArrowLeft');
      expect(sel(), `${s.id}: ArrowLeft`).toBe(start);
      press('End');
      expect(sel(), `${s.id}: End`).toBe(n - 1);
      press('ArrowRight');
      expect(sel(), `${s.id}: ArrowRight wraps`).toBe(0);
      press('ArrowLeft');
      expect(sel(), `${s.id}: ArrowLeft wraps`).toBe(n - 1);
      press('Home');
      expect(sel(), `${s.id}: Home`).toBe(0);
      expect(r.open(), `${s.id}: the sheet stays open`).toEqual([s.id]);
      if (n > 1) multi++;
    }
    expect(multi, 'the Drug and Patient sheets have more than one tab').toBeGreaterThanOrEqual(2);
  });
});

describe('the Vitals rows on the Patient sheet (brief 208, ruling 5: no hold in a modelled run)', () => {
  const visible = (el: Element | null | undefined) => !!el && !el.closest('[hidden]');
  const btn = (row: Element, words: string) => [...row.querySelectorAll('button')].find((b) => b.textContent === words);
  const setState = (r: ReturnType<typeof rig>, s: { mode: 'modeled' | 'manual'; control?: Record<string, string> }) => {
    r.ctl.state = { mode: s.mode, values: { hr: 80, spo2: 97, sbp: 120, paceThresholdMa: 60, contractility: 1 }, control: s.control ?? {} } as never;
    r.slot.refresh();
  };

  it('MODELED: a row the model computes shows its live value and how to change it, with no Set and no "Return to model"; a direct row stays settable; the rhythm stays', () => {
    const r = rig();
    key('v');
    setState(r, { mode: 'modeled' });
    const rows = [...r.panel().querySelectorAll<HTMLElement>('.param[data-var]')].filter((x) => visible(x));
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      const v = row.dataset.var as string;
      if (v === 'paceThresholdMa') continue;
      expect(visible(btn(row, 'Set')), `${v}: no Set`).toBe(false);
      expect(visible(btn(row, 'Return to model')), `${v}: no Return to model`).toBe(false);
      expect(visible(row.querySelector('.stepper, input')), `${v}: no stepper`).toBe(false);
      const note = [...row.querySelectorAll('p.hint')].find((p) => visible(p));
      expect(note?.textContent, `${v}: the line that says how`).toBe('Follows the model: change it through its cause (drugs, fluids, an event) or switch to MANUAL.');
    }
    expect(r.panel().querySelector('[data-var="hr"] .now')?.textContent).toBe('80');
    const pace = r.panel().querySelector('[data-var="paceThresholdMa"]') as HTMLElement;
    expect(visible(btn(pace, 'Set')), 'a value the model does not compute (direct) stays settable').toBe(true);
    expect(visible(btn(r.panel(), 'Return all to the model'))).toBe(false);
    expect(r.panel().textContent).toContain('MODELED: the body computes these values. Change one through its cause, or switch to MANUAL.');
    expect(visible(btn(r.panel().querySelector('.param:not([data-var])') as Element, 'Stage')), 'the rhythm picker').toBe(true);
    // the patient tab says the same
    (r.sheet().querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    expect(r.panel().textContent).toContain('MODELED: the body responds by itself; a value changes through its cause. MANUAL: you set every value.');
    expect(r.panel().textContent).not.toContain('hold');
  });

  it('MODELED with a value a script held: that row shows "Held" and its own release, which stages a release of that row only', () => {
    const r = rig();
    key('v');
    setState(r, { mode: 'modeled', control: { hr: 'pinned', spo2: 'modeled' } });
    const hr = r.panel().querySelector('[data-var="hr"]') as HTMLElement;
    expect(visible(hr.querySelector('.chip'))).toBe(true);
    expect(hr.querySelector('.chip')?.textContent).toBe('Held');
    const rel = btn(hr, 'Return to model') as HTMLButtonElement;
    expect(visible(rel)).toBe(true);
    expect(visible(btn(hr, 'Set'))).toBe(false);
    for (const row of r.panel().querySelectorAll<HTMLElement>('.param[data-var]:not([data-var="hr"])')) expect(visible(btn(row, 'Return to model')), row.dataset.var).toBe(false);
    rel.click();
    expect(r.ctx.dock.tools.querySelector('.ip2-staged')?.textContent).toBe('Staged · 1');
    expect(r.sheet().querySelector('.ip2-tray-items')?.textContent).toMatch(/HR/);
  });

  it('MANUAL: every row is settable, unchanged (Set stages a target); the rhythm picker is unchanged', () => {
    const r = rig();
    key('v');
    setState(r, { mode: 'manual' });
    const rows = [...r.panel().querySelectorAll<HTMLElement>('.param[data-var]')].filter((x) => visible(x));
    expect(rows.map((x) => x.dataset.var)).toContain('contractility');
    for (const row of rows) {
      expect(visible(btn(row, 'Set')), `${row.dataset.var}: Set`).toBe(true);
      expect([...row.querySelectorAll('p.hint')].some((p) => visible(p)), `${row.dataset.var}: no model line`).toBe(false);
    }
    expect(r.panel().textContent).toContain('MANUAL: every value is what you set, with the onset chosen below.');
    expect(visible(btn(r.panel().querySelector('.param:not([data-var])') as Element, 'Stage'))).toBe(true);
  });

  it('the Remote\'s Vitals tab (views/remote.ts mounts today\'s panel, whose PanelCtx has no `holds: false`) is not changed by this ruling: MODELED still offers Set', () => {
    const r = rig();
    r.ctl.state = { mode: 'modeled', values: { hr: 80 }, control: {} } as never;
    const refreshers: Array<() => void> = [];
    const body = vitalsTab({ link: r.link, staging: new Staging('t', (c) => r.link.send(c)), site: DEFAULT_SITE, weightKg: () => 70, onRefresh: (fn) => void refreshers.push(fn), goTab: () => undefined });
    document.body.append(body);
    for (const fn of refreshers) fn();
    const hr = body.querySelector('[data-var="hr"]') as HTMLElement;
    expect(visible(btn(hr, 'Set'))).toBe(true);
    expect(visible(btn(body, 'Return all to the model'))).toBe(true);
  });
});
