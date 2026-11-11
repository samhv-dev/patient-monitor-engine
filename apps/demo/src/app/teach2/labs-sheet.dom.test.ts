// @vitest-environment happy-dom
// Plan learner-action-remote.md L15 ("Tests first"; LQ13 ruled B: the laptop sees every result): the laptop's Labs sheet
// in Instructor v2 lists every `labResult` of the host's engine by draw time, with who drew it (the remote's name, the
// instructor, the instructor's phone or the scenario card), each shown by the renderer's `mountLabPanel` as the phone
// shows it; a sample still in the analyser is pending with its expected time, in the phone's own words. 1. Every result
// appears, the learner's and the card's alike. 2. The engine's 1 Hz `labs` truth (and the `truth` event) is never read:
// a test hands the sheet events that record every property read. And: no draw button; a restart clears the list, a
// return to a bookmark keeps what was drawn before it; the Labs tool is in the dock only on the host.
import { ControllerSession, createInProcessHub, type WireEvent } from '@pme/controller';
import { ANALYSERS, LABORATORY, TICK_S, turnaroundFor, type EngineEvent, type LabPanel, type LabPanelId, type LabValues } from '@pme/engine-core';
import { mountLabPanel } from '@pme/renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { Link } from '../link.ts';
import { LABS_WORDS, labsView } from '../remote/labs.ts';
import { DEFAULT_SITE } from '../site.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mountKeys } from './keys.ts';
import { LAB_SHEET_WORDS, LabBook, labsSheet, type LabsSource } from './labs-sheet.ts';
import { sheetFrame } from './sheet.ts';
import { mount as mountSheets } from './sheets.ts';

const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const ABG: LabValues = { ph: 7.21, pco2: 58, po2: 88, hco3: 22.4, be: -5.1, so2: 95.1, cohb: 0.8, methb: 0.6, lactate: 3.1, na: 139, k: 6.3, cl: 104, iCa: 1.12, hb: 11.4, glucose: 132, ag: 13, osm: 289 };
/** The engine's 1 Hz truth: values no sample holds, so a sheet that showed them would be seen. */
const TRUTH: LabPanel = { ph: 6.87, pco2: 91, po2: 44, hco3: 9.9, be: -19.9, so2: 61.3, cohb: 4.4, methb: 4.4, lactate: 14.4, na: 151, k: 7.7, cl: 88, iCa: 0.66, mg: 2.2, hb: 5.5, glucose: 444, ag: 33, osm: 333 };

let done: Array<() => void> = [];
afterEach(() => {
  for (const f of done) f();
  done = [];
  document.body.replaceChildren();
});

/** A stand-in for the host: its panel transport's wire events, its engine's events, Room setup's names. */
function source(names: Record<string, string> = {}) {
  const wire = new Set<(e: WireEvent) => void>();
  const eng = new Set<(e: EngineEvent) => void>();
  const src: LabsSource = {
    onWire: (fn) => (wire.add(fn), () => void wire.delete(fn)),
    onEngine: (fn) => (eng.add(fn), () => void eng.delete(fn)),
    deviceName: (key) => names[key] ?? null,
  };
  let n = 0;
  const applied = (tick: number, command: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    [...wire].forEach((fn) => fn({ type: 'commandApplied', commandId: `c${++n}`, tick, resolved: { command: { id: `c${n}`, type: 'applyEvent', ...command }, ...extra } } as WireEvent));
  /** The host applied a sample of `panel` at `tick`, issued by `issuedBy`; `event` adds what the host wrote on it. */
  const draw = (tick: number, panel: LabPanelId, issuedBy: string, { event, ...more }: Record<string, unknown> = {}) =>
    applied(tick, { ...more, issuedBy, event: { kind: 'lab', panel, ...(event as object | undefined) } });
  const engine = (e: EngineEvent) => [...eng].forEach((fn) => fn(e));
  const result = (panel: LabPanelId, drawnAt: number, values: LabValues, analyser = panel === 'abg' || panel === 'vbg' ? 'abl825' : 'laboratory') =>
    engine({ type: 'labResult', t: drawnAt + turnaroundFor(panel), drawnAt, panel, analyser, values });
  const timeline = (t: number, cause?: string) => [...wire].forEach((fn) => fn({ type: 'timeline', t, tick: Math.round(t / TICK_S), ...(cause ? { cause } : {}) } as WireEvent));
  return { src, applied, draw, engine, result, timeline, listeners: () => wire.size + eng.size };
}

function sheet(names: Record<string, string> = {}) {
  const s = source(names);
  const book = new LabBook(s.src);
  const frame = sheetFrame({ id: 'labs', name: 'Labs', hint: 'Esc closes', onClose: () => undefined });
  document.body.append(frame.el);
  frame.open();
  const v = labsSheet(frame, book);
  done.push(() => (v.destroy(), book.destroy()));
  const rows = () => [...frame.el.querySelectorAll<HTMLElement>('.ip2-lab')];
  return { ...s, book, frame, v, rows };
}

/** The phone's own Labs tab (remote/labs.ts) given the same draw and result, for the "as the phone shows it" checks. */
function phoneShows(panel: LabPanelId, tick: number, values: LabValues | null) {
  const eng = new Set<(e: EngineEvent) => void>();
  const msg = new Set<(m: never) => void>();
  const v = labsView();
  let id = '';
  v.attach({ command: () => (id = 'p1'), onMessage: (fn) => (msg.add(fn as never), () => undefined), onEngine: (fn) => (eng.add(fn), () => undefined), peerId: 'p', device: 'd' });
  (v.el.querySelector(`.lr-lab-send[data-panel="${panel}"]`) as HTMLButtonElement).click();
  for (const fn of msg) (fn as (m: unknown) => void)({ kind: 'ack', commandId: id, accepted: true, tick });
  if (values) for (const fn of eng) fn({ type: 'labResult', t: tick * TICK_S + turnaroundFor(panel), drawnAt: tick * TICK_S, panel, analyser: 'abl825', values });
  const row = v.el.querySelector('.lr-lab') as HTMLElement;
  return { title: row.querySelector('.lr-lab-title')?.textContent, state: row.querySelector('.lr-lab-state')?.textContent, table: row.querySelector('.lr-lab-result')?.innerHTML };
}

describe("the laptop's Labs sheet (L15)", () => {
  it('1. every result appears, the learner\'s and the card\'s alike, by draw time, with who drew it', () => {
    const m = sheet({ bed3remote01: 'bed 3 remote' });
    m.draw(100, 'abg', 'learner', { by: 'bed3remote01' });
    m.draw(200, 'chem', 'scenario');
    m.draw(300, 'vbg', 'instructor');
    m.draw(400, 'coag', 'remote');
    m.draw(500, 'abg', 'learner', { by: 'unnamedkey02' });
    m.result('abg', 100 * TICK_S, ABG);
    m.result('chem', 200 * TICK_S, { na: 141, k: 4.1, cl: 103 });
    m.result('vbg', 300 * TICK_S, { ...ABG, ph: 7.3 });
    m.result('coag', 400 * TICK_S, { inr: 1.1 });
    m.result('abg', 500 * TICK_S, { ...ABG, ph: 7.44 });
    const rows = m.rows();
    expect(rows).toHaveLength(5);
    // the latest draw first, as the phone lists its own
    expect(rows.map((r) => r.dataset.panel)).toEqual(['abg', 'coag', 'vbg', 'chem', 'abg']);
    expect(rows.map((r) => r.querySelector('.ip2-lab-who')?.textContent)).toEqual([
      LAB_SHEET_WORDS.by(LAB_SHEET_WORDS.unnamed), LAB_SHEET_WORDS.by(LAB_SHEET_WORDS.phone), LAB_SHEET_WORDS.by(LAB_SHEET_WORDS.instructor),
      LAB_SHEET_WORDS.by(LAB_SHEET_WORDS.card), LAB_SHEET_WORDS.by('bed 3 remote'),
    ]);
    expect(LAB_SHEET_WORDS.instructor).toBe('Instructor');
    for (const r of rows) expect(r.querySelector('.lr-lab-state')?.getAttribute('data-state')).toBe('resulted');
    expect(rows.map((r) => r.querySelector('tr[data-key="ph"] .v')?.textContent?.trim() ?? null)).toEqual(['7.44', null, '7.3', null, '7.21 ↓']);
    expect(rows[3]?.querySelector('tr[data-key="na"] .v')?.textContent).toBe('141');
    expect(rows[1]?.querySelector('tr[data-key="inr"] .v')?.textContent).toBe('1.1');
    // each with the same panel the phone uses: mountLabPanel's table, the phone's caption
    const want = document.createElement('div');
    mountLabPanel(want)(ABG, `Arterial blood gas, ${clock(100 * TICK_S)}`, 'abg');
    expect(rows[4]?.querySelector('.pme-lab-panel')?.innerHTML).toBe(want.innerHTML);
    expect(m.frame.el.querySelectorAll('button:not(.ip2-sheet-close)')).toHaveLength(0); // no draw button
  });

  it('a sample still in the analyser is pending with its expected time, word for word as the phone shows it; then its result, equal to the phone\'s', () => {
    const m = sheet();
    m.draw(1200, 'abg', 'learner', { by: 'k1' });
    const phone = phoneShows('abg', 1200, null);
    const row = m.rows()[0] as HTMLElement;
    expect(row.querySelector('.lr-lab-title')?.textContent).toBe(phone.title);
    expect(row.querySelector('.lr-lab-state')?.textContent).toBe(phone.state);
    expect(phone.state).toBe(LABS_WORDS.expected(1200 * TICK_S + turnaroundFor('abg'), ANALYSERS.abl825.name, 'poc'));
    expect(row.querySelector('.lr-lab-state')?.getAttribute('data-state')).toBe('pending');
    expect(row.querySelector('tbody tr')).toBeNull();
    m.result('abg', 1200 * TICK_S, ABG);
    const done = phoneShows('abg', 1200, ABG);
    expect(row.querySelector('.lr-lab-state')?.textContent).toBe(done.state);
    expect(row.querySelector('.lr-lab-result')?.innerHTML).toBe(done.table);
  });

  it("the laboratory's panels and the host's own analyser and a card's turnaround name the row and its time", () => {
    const m = sheet();
    m.draw(100, 'chem', 'instructor');
    m.draw(200, 'abg', 'learner', { by: 'k', event: { analyser: 'abl837' } });
    m.draw(300, 'vbg', 'scenario', { event: { turnaroundS: 600 } });
    const [vbg, abg, chem] = m.rows();
    expect(chem?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(100 * TICK_S + turnaroundFor('chem'), LABORATORY.name, 'laboratory'));
    expect(abg?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(200 * TICK_S + turnaroundFor('abg', 'abl837'), ANALYSERS.abl837.name, 'poc'));
    expect(vbg?.querySelector('.lr-lab-state')?.textContent).toBe(LABS_WORDS.expected(300 * TICK_S + 600, ANALYSERS.abl825.name, 'poc'));
    m.result('coag', 100 * TICK_S, {}); // no sample of that panel at that tick: shown, with no one named, never dropped
    expect(m.rows()).toHaveLength(4);
    expect(m.rows().find((r) => r.dataset.panel === 'coag')?.querySelector('.ip2-lab-who')?.textContent).toBe(LAB_SHEET_WORDS.by(LAB_SHEET_WORDS.unknown));
    expect(m.rows().find((r) => r.dataset.panel === 'coag')?.querySelector('.lr-lab-none')?.hasAttribute('hidden')).toBe(false);
  });

  it('2. the 1 Hz `labs` truth and the `truth` event are never read (every property read of them is recorded)', () => {
    const m = sheet();
    const reads: string[] = [];
    const spy = <T extends object>(name: string, x: T): T =>
      new Proxy(x, { get: (o, k) => (k !== 'type' && typeof k === 'string' && reads.push(`${name}.${k}`), Reflect.get(o, k)) });
    m.draw(100, 'abg', 'learner', { by: 'k' });
    for (let i = 0; i < 5; i++) {
      m.engine(spy('labs', { type: 'labs', t: 100 + i, drawnAt: 100 + i, values: spy('values', { ...TRUTH }) } as unknown as EngineEvent));
      m.engine(spy('truth', { type: 'truth', t: 100 + i } as unknown as EngineEvent));
    }
    expect(reads).toEqual([]);
    expect(m.rows()[0]?.querySelector('.lr-lab-state')?.getAttribute('data-state')).toBe('pending');
    m.result('abg', 100 * TICK_S, ABG);
    m.engine(spy('labs', { type: 'labs', t: 200, drawnAt: 200, values: spy('values', { ...TRUTH }) } as unknown as EngineEvent));
    expect(reads).toEqual([]);
    const text = m.frame.el.textContent ?? '';
    for (const v of ['6.87', '444', '7.7', '14.4', '151']) expect(text).not.toContain(v);
  });

  it('a restart clears the list; a return to a bookmark keeps what was drawn before it, its later results pending again', () => {
    const m = sheet();
    m.draw(100, 'abg', 'instructor');
    m.draw(900, 'vbg', 'instructor');
    m.result('abg', 100 * TICK_S, ABG);
    m.result('vbg', 900 * TICK_S, ABG);
    expect(m.rows()).toHaveLength(2);
    // back to a bookmark between the first draw and its result: the second draw never happened; the first is in the analyser
    const back = 100 * TICK_S + 10;
    m.timeline(back, 'restore');
    expect(m.rows().map((r) => r.dataset.panel)).toEqual(['abg']);
    expect(m.rows()[0]?.querySelector('.lr-lab-state')?.getAttribute('data-state')).toBe('pending');
    m.result('abg', 100 * TICK_S, { ...ABG, ph: 7.25 }); // the restored engine returns it again
    expect(m.rows()[0]?.querySelector('tr[data-key="ph"] .v')?.textContent).toBe('7.25 ↓');
    m.timeline(0);
    expect(m.rows()).toHaveLength(0);
    expect(m.frame.el.querySelector('.ip2-lab-empty')?.hasAttribute('hidden')).toBe(false);
  });

  it("a late-join replay and a cockpit frame are not draws; a command that is not a sample is not listed", () => {
    const m = sheet();
    m.applied(100, { event: { kind: 'lab', panel: 'abg' }, issuedBy: 'instructor' }, { replay: true });
    m.applied(110, { event: { kind: 'lab', panel: 'abg' }, issuedBy: 'instructor' }, { mirror: true });
    m.applied(120, { event: { kind: 'drug', drugId: 'propofol', dose: 100, unit: 'mg' }, issuedBy: 'instructor' });
    expect(m.rows()).toHaveLength(0);
    expect(m.frame.el.querySelector('.ip2-lab-empty')?.textContent).toBe(LAB_SHEET_WORDS.empty);
  });

  it('the book stops listening when destroyed', () => {
    const s = source();
    const book = new LabBook(s.src);
    expect(s.listeners()).toBe(2);
    book.destroy();
    expect(s.listeners()).toBe(0);
  });
});

describe('the Labs tool in the dock', () => {
  function rig(labs?: LabsSource) {
    const hub = createInProcessHub();
    const t = hub.connect();
    const ctl = new ControllerSession({ session: 'LAB234', transport: t, peerId: 'ctl-l' });
    const link = new Link(ctl, t, null);
    const root = document.createElement('div');
    const layer = document.createElement('div');
    const tools = document.createElement('div');
    const note = document.createElement('div');
    root.append(layer, tools, note);
    document.body.append(root);
    const keys = mountKeys(root, { link, togglePause: () => undefined });
    const ctx: Teach2Ctx = { link, site: DEFAULT_SITE, weightKg: () => 70, keys, dock: { tools, note }, openSheet: () => undefined, loadScenario: () => true, ...(labs ? { labs } : {}) };
    const slot = mountSheets(layer, ctx);
    done.push(() => (slot.destroy(), keys.destroy(), link.close(), ctl.close()));
    return { ctx, layer, tools };
  }

  it('is the last tool on the host, opens the Labs sheet over ACTION, and lists what was drawn before it was first opened', () => {
    const s = source({ k1: 'bed 1 remote' });
    const r = rig(s.src);
    expect([...r.tools.querySelectorAll('.ip2-tool')].map((b) => b.textContent)).toEqual(['Drug', 'Airway', 'Defib · CPR', 'Vitals', 'Devices', 'Patient', 'Log', 'Labs']);
    s.draw(100, 'abg', 'learner', { by: 'k1' }); // before the sheet is built
    s.result('abg', 100 * TICK_S, ABG);
    (r.tools.querySelector('[data-sheet="labs"]') as HTMLButtonElement).click();
    const open = r.layer.querySelector<HTMLElement>('.ip2-sheet:not([hidden])') as HTMLElement;
    expect(open.dataset.sheet).toBe('labs');
    expect(open.querySelector('.ip2-sheet-name')?.textContent).toBe('Labs');
    expect(open.querySelectorAll('.ip2-lab')).toHaveLength(1);
    expect(open.querySelector('.ip2-lab-who')?.textContent).toBe(LAB_SHEET_WORDS.by('bed 1 remote'));
    r.ctx.openSheet('drug');
    expect(open.hidden).toBe(true);
  });

  it('is not in the dock without the host (an instructor phone: LQ13 gave the laptop the view)', () => {
    const r = rig();
    expect([...r.tools.querySelectorAll('.ip2-tool')].map((b) => b.textContent)).not.toContain('Labs');
    r.ctx.openSheet('labs');
    expect(r.layer.querySelector('.ip2-sheet')).toBeNull();
  });
});
