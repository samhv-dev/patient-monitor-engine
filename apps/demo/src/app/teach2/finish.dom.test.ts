// @vitest-environment happy-dom
// "Finish the case" (the owner's board "Finish 2", approved 30 October). The dock gains the button beside Debrief; a
// press pauses the clock (the pill reads PAUSED), the strip's status line says the clock is stopped and nothing is
// written yet, and ACTION becomes the Finish pane: the card and the time, the Resident field, the objective and mark
// counts of the run, three buttons and the archive. Esc, or a resume from the pill, closes it with nothing written.
// Each button writes the debrief to the browser's archive first: "Save and restart the case" then loads the same card
// again (the Resident field cleared for the next name), "Debrief now" opens the Debrief view on the saved debrief (the
// case stays paused, the pane says it is saved), "Save and close" ends the case (#210's three cards show).
import { createEngine, type Command, type EngineEvent, type PatientSnapshot } from '@pme/engine-core';
import { ScenarioView, type AckResult, type CommandInput, type ScenarioCommand, type ScenarioDoc, type WireEvent } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, type Action, type ScenarioDocV2 } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archive, type ArchiveMeta } from '../archive.ts';
import type { Link } from '../link.ts';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { RunRecord } from '../record.ts';
import { cardOf, scenarioById, type ScenarioCard } from '../scenarios.ts';
import type { RoomKeep } from '../session.ts';
import { restartSameCard } from './finish.ts';
import induction from '../showcase/showcase-induction.json';
import { DEFAULT_SITE } from '../site.ts';
import { teach2View, type Teach2View } from '../views/teach2.ts';

const SPEC = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const settle = () => new Promise((r) => setTimeout(r, 0));

const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const scen = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) }) as WireEvent;

/** The induction card with four objectives: one met by its rule, one ticked, one not met, one not assessable. */
const DOC = {
  ...induction,
  objectives: [
    { text: 'Induce', rule: { kind: 'occurred', event: 'state:induced' } },
    'Call for help',
    { text: 'Never desaturate', rule: { kind: 'never', event: 'state:induced' } },
    'Speak to the family',
  ],
} as unknown as ScenarioDoc;

/** A run of DOC, 01:40 long: two good marks (one with a note), one discuss, two notes of the instructor. */
function record(startedAt: number): RunRecord {
  const r = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  r.wire(applied(0, { type: 'scenario', action: 'load', doc: DOC }));
  r.wire(scen(0, 'awake'));
  r.wire(applied(500, { type: 'scenario', action: 'trigger', target: 'induce' }));
  r.wire(scen(10, 'induced', 'induce'));
  r.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:20', kind: 'good', note: 'calm' }));
  r.wire(applied(1500, { type: 'scenario', action: 'bookmark', target: 'Mark 2 at 00:30', kind: 'good' }));
  r.wire(applied(2000, { type: 'scenario', action: 'bookmark', target: 'Mark 3 at 00:40', kind: 'discuss' }));
  r.note(50, 'Objective met: Call for help');
  r.note(60, 'Asked for the difficult airway trolley');
  r.note(100, 'Handed over to recovery');
  return r;
}

function rig(o: { loaded?: boolean; paused?: boolean; hooks?: boolean } = {}) {
  const sent: CommandInput[] = [];
  const fns = new Set<() => void>();
  const reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
  const sv = new ScenarioView();
  const ctl = { scenario: sv, state: { mode: 'modeled', values: {}, control: {} }, timeScale: 1, hostPaused: !!o.paused, fastForward: null, simT: 100, bookmarks: [] };
  let runs = 0;
  const host = { spec: SPEC, mode: 'modeled', record: record(Date.UTC(2026, 9, 30, 9, 0)), driver: { markStages: () => undefined, stageMarks: () => [], vitalHolds: () => [] } };
  const link = {
    ctl, simT: 100, conditions: new Map(), alarms: null, alarmSummary: { level: null, n: 0, top: null }, log: [], ramps: new Map(), host,
    // the host's pause as the controller sees it, once it answered
    send: async (c: CommandInput) => {
      sent.push(structuredClone(c));
      const x = c as { type: string; action?: string };
      if (x.type === 'time' && x.action === 'pause') ctl.hostPaused = true;
      if (x.type === 'time' && x.action === 'resume') ctl.hostPaused = false;
      return reply;
    },
    note: () => undefined,
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  const arrive = () => {
    sv.doc = DOC;
    sv.docVersion++;
    sv.stateId = DOC.initialState;
    sv.enteredT = 0;
    sv.history = [{ t: 0, stateId: DOC.initialState }];
  };
  if (o.loaded !== false) arrive();
  /** What the app's end-of-case hooks do, as the controller sees them; each also notes how many debriefs were saved by then. */
  const calls: Array<[string, number]> = [];
  const hooks = {
    restart: () => {
      calls.push(['restart', archive.list().length]);
      host.record = record(Date.UTC(2026, 9, 30, 10, ++runs)); // a new body: a new record
      arrive();
      return true;
    },
    close: () => {
      calls.push(['close', archive.list().length]);
      host.record = record(Date.UTC(2026, 9, 30, 11, ++runs));
      sv.doc = null; // a new timeline: no scenario runs
      sv.docVersion++;
      sv.stateId = null;
    },
  };
  const v = teach2View(link, { site: DEFAULT_SITE, weightKg: () => 70, loadScenario: () => true, ...(o.hooks === false ? {} : { finish: hooks }) });
  document.body.append(v.el);
  v.enter?.('');
  const q = <T extends Element = HTMLElement>(s: string) => v.el.querySelector(s) as T | null;
  const all = (s: string) => [...v.el.querySelectorAll<HTMLElement>(s)];
  const text = (s: string) => q(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  const shown = (s: string) => { const e = q(s); return !!e && !e.hidden && !e.closest('[hidden]'); };
  // a key goes where the focus is (the Resident field has it once the pane opens)
  const key = (k: string) => (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  /** The view repaints as it does on the host's change (the throttle is 500 ms; the tests call the paint directly). */
  const paint = () => v.enter?.('');
  const press = async (sel: string) => {
    (q(sel) as HTMLElement).click();
    await settle();
    await settle();
    paint();
  };
  return { v, link, ctl, sv, sent, host, calls, q, all, text, shown, key, paint, press };
}

let open: Teach2View | null = null;
const use = <T extends { v: Teach2View }>(r: T): T => ((open = r.v), r);
const times = (r: ReturnType<typeof rig>) => r.sent.filter((c) => c.type === 'time').map((c) => (c as { action: string }).action);
beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('indexedDB', asFactory(new MemoryIDB())); // a fresh browser: the archive opens it again
});
afterEach(() => {
  open?.destroy();
  open = null;
  document.body.replaceChildren();
  location.hash = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Finish the case: the dock button, the pause, the status line (board "Finish 2")', () => {
  it('the dock gains "Finish the case" beside Debrief, with a card loaded; none with no case', () => {
    const r = use(rig());
    const kids = [...(r.q('.ip2-dock') as HTMLElement).children];
    const fin = r.q('.ip2-finish-btn') as HTMLButtonElement;
    expect(fin.textContent).toBe('Finish the case');
    expect(kids.indexOf(fin)).toBe(kids.length - 2);
    expect((kids.at(-1) as HTMLElement).textContent).toBe('Debrief');
    expect(r.shown('.ip2-finish-btn')).toBe(true);
    r.v.destroy();
    document.body.replaceChildren();
    const none = use(rig({ loaded: false }));
    expect(none.shown('.ip2-finish-btn')).toBe(false);
  });

  it('a press pauses the clock; the status line says so; STATE stays; ACTION becomes the Finish pane', async () => {
    const r = use(rig());
    expect(r.shown('.ip2-finish')).toBe(false);
    await r.press('.ip2-finish-btn');
    expect(times(r)).toEqual(['pause']);
    expect(r.text('.ip2-pill-word')).toBe('PAUSED');
    expect(r.text('.ip2-pill-time')).toBe('01:40');
    expect(r.q('.ip2-strip')?.hasAttribute('data-finishing')).toBe(true);
    expect(r.shown('.ip2-finishing')).toBe(true);
    expect(r.q('.ip2-finishing')?.getAttribute('role')).toBe('status');
    expect(r.text('.ip2-finishing > b')).toBe('Finishing.');
    expect(r.text('.ip2-finishing .ip2-status-text')).toBe('The clock is stopped at 01:40 while you decide. Nothing is written until you press a button on the right.');
    expect(r.text('.ip2-finishing .ip2-status-keys')).toBe('Esc keeps the case running');
    // STATE as it is: the stage, frozen
    expect(r.text('.ip2-cue-clock')).toMatch(/frozen$/);
    // ACTION: the pane in place of the rows
    expect(r.shown('.ip2-finish')).toBe(true);
    expect(r.shown('.ip2-rows')).toBe(false);
    expect(r.q('.ip2-action')?.hasAttribute('data-finishing')).toBe(true);
    expect(r.text('.ip2-finish-title')).toBe('Finish the case');
    expect(r.text('.ip2-finish-hint')).toBe('Esc keeps it running');
    expect(r.text('.ip2-finish-lead')).toBe('Healthy induction · 01:40 · the clock stops here. The debrief is written now, with every step, mark and verdict, and kept in this browser’s archive until you clear it. A reload after “Save and close” returns to the empty window; after “Save and restart” it restores the new run.');
    expect(r.text('.ip2-finish-who')).toBe('Resident');
    expect(document.activeElement).toBe(r.q('.ip2-finish-resident'));
    expect(r.text('.ip2-finish-obj')).toBe('Objectives 2 of 4 met · 1 not met · 1 not assessable');
    expect(r.text('.ip2-finish-marks')).toBe('Marks 2 good · 0 bad · 1 discuss · 3 notes');
    expect(r.all('.ip2-finish-acts button').map((b) => b.textContent)).toEqual(['Save and restart the case', 'Debrief now', 'Save and close']);
    expect(r.q('.ip2-finish-restart')?.classList.contains('ip2-finish-primary')).toBe(true);
    expect(r.text('.ip2-finish-note')).toBe('“Save and restart the case” saves the debrief and starts the same card again from its first stage with fresh physiology; the room setup stays as it is (skin, devices, probes, phones). Changing or resetting the room is its own window in the sidebar, Room setup.');
    expect(r.q('.ip2-finish-note a')).toBeNull(); // Room setup has no window yet: no link
    expect(r.shown('.ip2-finish-saved')).toBe(false);
    // the digits press no case row while the pane is open
    r.key('1');
    await settle();
    expect(r.sent.filter((c) => c.type === 'scenario')).toEqual([]);
  });

  it('Esc resumes the clock and closes the pane with nothing written', async () => {
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    r.key('Escape');
    await settle();
    r.paint();
    expect(times(r)).toEqual(['pause', 'resume']);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(r.shown('.ip2-finishing')).toBe(false);
    expect(r.q('.ip2-strip')?.hasAttribute('data-finishing')).toBe(false);
    expect(r.shown('.ip2-rows')).toBe(true);
    expect(archive.list()).toEqual([]);
    expect(r.calls).toEqual([]);
  });

  it('a case already paused stays paused after Esc (the Finish gives back the clock as it found it)', async () => {
    const r = use(rig({ paused: true }));
    await r.press('.ip2-finish-btn');
    expect(times(r)).toEqual([]);
    expect(r.shown('.ip2-finish')).toBe(true);
    r.key('Escape');
    await settle();
    r.paint();
    expect(times(r)).toEqual([]);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(archive.list()).toEqual([]);
  });

  it('the pill (or Space) resumes and closes the pane with nothing written', async () => {
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    await r.press('.ip2-pill');
    expect(times(r)).toEqual(['pause', 'resume']);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(archive.list()).toEqual([]);
  });

  it('with no end-of-case hooks (a follower) there is no Finish button', () => {
    const r = use(rig({ hooks: false }));
    expect(r.shown('.ip2-finish-btn')).toBe(false);
  });
});

describe('Finish the case: the three buttons', () => {
  const type = (r: ReturnType<typeof rig>, name: string) => {
    const f = r.q('.ip2-finish-resident') as HTMLInputElement;
    f.value = name;
    f.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('"Save and restart the case" saves the debrief, then loads the same card again; the clock runs; the field is cleared', async () => {
    const r = use(rig());
    const run = r.host.record.data.startedAt;
    await r.press('.ip2-finish-btn');
    type(r, 'Dr Rahimi');
    await r.press('.ip2-finish-restart');
    expect(r.calls).toEqual([['restart', 1]]); // saved first
    const [e] = archive.list();
    expect(e).toMatchObject({ resident: 'Dr Rahimi', title: 'Healthy induction', runStartedAt: run, durationS: 100, objectives: { met: 2, total: 4 } });
    expect(JSON.parse((await archive.debrief(e?.id as string)) as string).schema).toBe('pme-debrief/2');
    expect(times(r)).toEqual(['pause', 'resume']);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(r.shown('.ip2-rows')).toBe(true);
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toContain('Debrief saved: Dr Rahimi · Healthy induction. The case starts again.');
    // the next resident: the field is empty
    await r.press('.ip2-finish-btn');
    expect((r.q('.ip2-finish-resident') as HTMLInputElement).value).toBe('');
  });

  it('"Debrief now" saves and opens the Debrief view on it; the case stays paused; back in Instructor the pane says saved', async () => {
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    type(r, 'Dr Saberi');
    await r.press('.ip2-finish-now');
    const [e] = archive.list();
    expect(e?.resident).toBe('Dr Saberi');
    expect(location.hash).toBe(`#/debrief/archive/${e?.id}`);
    expect(times(r)).toEqual(['pause']);
    expect(r.calls).toEqual([]);
    r.paint();
    expect(r.shown('.ip2-finish')).toBe(true);
    expect(r.shown('.ip2-finish-saved')).toBe(true);
    expect(r.text('.ip2-finish-saved')).toMatch(/^Saved to the archive at \d\d:\d\d as debrief 1\. A button below saves it again in its place\.$/);
    expect(r.q(`.ip2-arc-row[data-id="${e?.id}"]`)?.hasAttribute('data-current')).toBe(true);
    expect(r.text(`.ip2-arc-row[data-id="${e?.id}"] .ip2-arc-saved`)).toBe('saved');
    // a second button replaces the same entry
    type(r, 'Dr Saberi M.');
    await r.press('.ip2-finish-close');
    expect(archive.list().map((x) => [x.id, x.resident])).toEqual([[e?.id, 'Dr Saberi M.']]);
  });

  it('"Save and close" saves the debrief and ends the case: the three cards of #210 show, the clock runs', async () => {
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    type(r, 'Dr Moradi');
    await r.press('.ip2-finish-close');
    expect(r.calls).toEqual([['close', 1]]);
    expect(archive.list().map((x) => x.resident)).toEqual(['Dr Moradi']);
    expect(times(r)).toEqual(['pause', 'resume']);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(r.all('.ip2-begin-card').filter((c) => !c.closest('[hidden]')).map((c) => c.dataset.way)).toEqual(['free', 'library', 'archive']);
    expect(r.text('.ip2-title')).toBe('No case loaded');
    expect(r.shown('.ip2-finish-btn')).toBe(false);
  });

  it('a storage that refuses: nothing ends, the pane stays, the instructor is told which (full, or blocked)', async () => {
    const r = use(rig());
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    await r.press('.ip2-finish-btn');
    await r.press('.ip2-finish-close');
    expect(r.calls).toEqual([]);
    expect(times(r)).toEqual(['pause']);
    expect(r.shown('.ip2-finish')).toBe(true);
    expect(archive.list()).toEqual([]);
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toContain('The debrief could not be saved: this browser’s storage for this site is full. Export the archive and clear it on the Debrief page, then try again.');
    // a browser that keeps no data for the site (the localStorage getter throws, as with site data turned off)
    vi.stubGlobal('localStorage', undefined);
    await r.press('.ip2-finish-restart');
    expect(r.calls).toEqual([]);
    expect(r.shown('.ip2-finish')).toBe(true);
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toContain('The debrief could not be saved: this browser keeps no data for this site (a private window, or site data turned off in its settings). Download the record from the Debrief page to keep it.');
  });

  it('nothing restarts, opens or closes until the save is written; the buttons and Esc do not answer meanwhile', async () => {
    const r = use(rig());
    const real = archive.save.bind(archive);
    let release = () => undefined as void;
    const spy = vi.spyOn(archive, 'save').mockImplementation((...a) => new Promise((ok) => (release = () => void real(...a).then(ok))));
    await r.press('.ip2-finish-btn');
    type(r, 'Dr Slow');
    await r.press('.ip2-finish-restart');
    expect(r.q('.ip2-finish')?.getAttribute('aria-busy')).toBe('true');
    await r.press('.ip2-finish-close'); // a second press while the first save is pending
    r.key('Escape');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r.calls).toEqual([]);
    expect(times(r)).toEqual(['pause']);
    expect(r.shown('.ip2-finish')).toBe(true);
    release();
    await settle();
    await settle();
    r.paint();
    expect(r.calls).toEqual([['restart', 1]]);
    expect(archive.list().map((x) => x.resident)).toEqual(['Dr Slow']);
    expect(r.shown('.ip2-finish')).toBe(false);
    expect(r.q('.ip2-finish')?.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('Finish the case: the archive under the buttons, and #210\'s Debrief archive card', () => {
  /** The anchors the app's download clicks: their file names and texts. */
  const downloads = () => {
    const got: Array<{ name: string; blob: Blob }> = [];
    const blobs = new Map<string, Blob>();
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      const u = `blob:test/${blobs.size}`;
      blobs.set(u, b as Blob);
      return u;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      got.push({ name: this.download, blob: blobs.get(this.getAttribute('href') ?? '') as Blob });
    });
    return got;
  };

  it('one row per saved debrief: number, resident and card, save time, met, duration; open, PDF and JSON; export all', async () => {
    const got = downloads();
    const saved = (await archive.save(record(Date.UTC(2026, 9, 30, 8, 0)).data, 'Dr Karimi', 'b')) as ArchiveMeta;
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    // how much the archive holds, so an instructor sees it grow (N39)
    expect(r.text('.ip2-finish-archive > summary .ip2-arc-count')).toBe(`Archive · 1 saved today · 1 saved · ${Math.round((saved.bytes as number) / 1e3)} kB`);
    expect(r.text('.ip2-finish-archive > summary')).toMatch(/^Archive · 1 saved today · 1 saved · \d+ kB · also on the Debrief page · export all as one JSON file$/);
    expect((r.q('.ip2-finish-archive') as HTMLDetailsElement).open).toBe(true);
    const rows = r.all('.ip2-finish-archive .ip2-arc-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.querySelector('.ip2-arc-n')?.textContent).toBe('1');
    expect(rows[0]?.querySelector('.ip2-arc-title')?.textContent).toBe('Dr Karimi · Healthy induction');
    expect(rows[0]?.querySelector('.ip2-arc-sub')?.textContent).toMatch(/^\d\d:\d\d · 2 of 4 met · 01:40$/);
    expect([...(rows[0] as HTMLElement).querySelectorAll('.ip2-arc-acts button')].map((b) => b.textContent)).toEqual(['open', 'PDF', 'JSON']);
    (rows[0]?.querySelector('.ip2-arc-open') as HTMLElement).click();
    expect(location.hash).toBe(`#/debrief/archive/${saved?.id}`);
    (rows[0]?.querySelector('.ip2-arc-pdf') as HTMLElement).click();
    expect(location.hash).toBe(`#/debrief/archive/${saved?.id}/print`);
    (rows[0]?.querySelector('.ip2-arc-json') as HTMLElement).click();
    await settle(); // the body is read from IndexedDB first
    expect(got.map((x) => x.name)).toEqual([`debrief-showcase-induction-2026-10-30-Dr-Karimi.json`]);
    expect(JSON.parse(await (got[0]?.blob as Blob).text())).toMatchObject({ schema: 'pme-archive-entry/1', resident: 'Dr Karimi' });
    (r.q('.ip2-finish-archive .ip2-arc-export') as HTMLElement).click();
    await settle();
    expect(got[1]?.name).toMatch(/^debrief-archive-\d{4}-\d\d-\d\d\.json$/);
    expect(JSON.parse(await (got[1]?.blob as Blob).text())).toMatchObject({ schema: 'pme-archive/1', entries: [{ resident: 'Dr Karimi' }] });
  });

  it('a resident left blank reads "Resident not named"; an empty archive says so', async () => {
    const r = use(rig());
    await r.press('.ip2-finish-btn');
    expect(r.text('.ip2-finish-archive .ip2-arc-empty')).toBe('Nothing saved yet. Each button above saves this run here.');
    await r.press('.ip2-finish-now');
    r.paint();
    expect(r.text('.ip2-finish-archive .ip2-arc-title')).toBe('Resident not named · Healthy induction');
  });

  it("#210's Debrief archive card reads its real count and opens the Debrief view's archive", async () => {
    const r = use(rig({ loaded: false }));
    const card = () => r.q('.ip2-begin-card[data-way="archive"] .ip2-begin-btn');
    expect(card()?.textContent).toBe('Open · 0');
    await archive.save(record(Date.UTC(2026, 9, 30, 8, 0)).data, 'Dr Karimi', 'b');
    r.paint();
    expect(card()?.textContent).toBe('Open · 1');
    r.key('3');
    expect(location.hash).toBe('#/debrief/archive');
  });
});

// fix-v2-save-and-restart: "Save and restart the case" found the card to load again through ScenarioDriver.runner, the
// /1 runner only, so on a /2 card it saved the debrief and then did nothing (the pane stayed, the run went on). It now
// reads the run of either format, as the reload's position does (PR #300, fix/v2-card-position-reload). The app's hook
// (main.ts finish.restart = restartSameCard) on the real driver, a real engine and the real record; the load is the
// session's (session.ts loadScenario: the runner ended, a new engine, a new record, the card's load).
describe('"Save and restart the case" on a /2 card', () => {
  function v2rig(id = 'showcase-mh-v2') {
    const card = scenarioById(id) as ScenarioCard;
    const fns = new Set<(e: EngineEvent) => void>();
    const body = () => {
      const e = createEngine({ ...engineOptionsOf(card.doc, 7), mode: card.doc.mode ?? 'modeled', truthHz: 1 } as never);
      e.on((x) => fns.forEach((fn) => fn(x)));
      return e;
    };
    let engine = body();
    const sv = new ScenarioView();
    const record = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), Date.now, () => driver.phaseRunner);
    fns.add((e) => record.engine(e as never));
    const driver: ScenarioDriver = new ScenarioDriver({
      target: { dispatch: (c: Command) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (x: PatientSnapshot) => engine.restore(x), on: (fn) => (fns.add(fn), () => void fns.delete(fn)), now: () => engine.now(), time: () => undefined },
      publish: (e) => (sv.onEvent(e), record.wire(e as WireEvent)),
    });
    const sent: CommandInput[] = [];
    let n = 0;
    const ctl = { scenario: sv, state: { mode: 'modeled', values: {}, control: {} }, timeScale: 1, hostPaused: false, fastForward: null, simT: 0, bookmarks: [] };
    const send = async (c: CommandInput): Promise<AckResult> => {
      sent.push(structuredClone(c));
      const x = c as { type: string; action?: string };
      if (x.type === 'time') ctl.hostPaused = x.action === 'pause' ? true : x.action === 'resume' ? false : ctl.hostPaused;
      if (x.type !== 'scenario') return { accepted: true, tick: engine.now().tick, commandId: `c${++n}`, rttMs: 0 };
      const cmd = { ...c, id: `c${++n}`, issuedBy: 'instructor' } as ScenarioCommand;
      const r = await driver.hook(cmd);
      const ev = { type: 'commandApplied', commandId: cmd.id, tick: r.tick, resolved: { command: r.applied ?? cmd } } as WireEvent;
      if (r.accepted) (sv.onEvent(ev), record.wire(ev));
      return { ...r, commandId: cmd.id, rttMs: 0 };
    };
    const host = { spec: SPEC, mode: 'modeled', record, driver };
    const link = {
      ctl, get simT() { return engine.now().simT; }, conditions: new Map(), alarms: null, alarmSummary: { level: null, n: 0, top: null }, log: [], ramps: new Map(), host,
      send, sendBatch: async (cs: CommandInput[]) => Promise.all(cs.map(send)), note: () => undefined, onChange: () => () => undefined,
    } as unknown as Link;
    /** The session's load (session.ts loadScenario): the run ended, a new body, a new record (its 'restart' timeline), the card's load. */
    const loads: Array<[string, RoomKeep | undefined]> = [];
    const load = (c: ScenarioCard, room?: RoomKeep) => {
      loads.push([c.id, room]);
      driver.runner = null;
      engine = body();
      record.wire({ type: 'timeline', cause: 'restart', t: 0 } as WireEvent);
      void send({ type: 'scenario', action: 'load', doc: c.doc } as CommandInput);
      return true;
    };
    const ROOM: RoomKeep = { sensors: { cvp: 'connected' } };
    const hooks = { restart: () => restartSameCard(driver, load, () => ROOM), close: () => undefined };
    const run = async (secs: number) => {
      const end = engine.now().tick + Math.round(secs * 50);
      for (let tick = engine.now().tick + 1; tick <= end; tick++) {
        engine.advanceTo(tick * 0.02);
        driver.poll();
        if (tick % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      ctl.simT = engine.now().simT;
    };
    /** An A press (teach2/press.ts pressAction): the action's `give`, every command stamped with its id. */
    const press = async (actionId: string) => {
      const act = (card.doc as unknown as ScenarioDocV2).actions.find((a) => a.id === actionId) as Action;
      for (const c of act.give ?? []) {
        const { $comment: _drop, ...cmd } = c as typeof c & { $comment?: string };
        expect((await driver.host.dispatch({ ...cmd, id: `p${++n}`, issuedBy: 'instructor', stageGroup: `press-${actionId}`, actionId } as unknown as Command)).accepted, actionId).toBe(true);
      }
      await run(1);
    };
    return { card, sv, driver, record, link, hooks, loads, ROOM, send, run, press, sent, ctl };
  }

  it('saves the run to the archive, then loads the same card again: Baseline, a new phase runner, a fresh record', async () => {
    const r = v2rig();
    expect(await r.send({ type: 'scenario', action: 'load', doc: r.card.doc } as CommandInput)).toMatchObject({ accepted: true });
    await r.run(2);
    await r.press('preoxygenate');
    await r.press('premedicate');
    await r.run(5);
    const first = r.driver.phaseRunner;
    expect(first?.takings).toEqual({ preoxygenate: 1, premedicate: 1 });
    const run = r.record.data.startedAt;

    const v = teach2View(r.link, { site: DEFAULT_SITE, weightKg: () => 80, loadScenario: () => true, finish: r.hooks });
    use({ v });
    document.body.append(v.el);
    v.enter?.('');
    const click = async (sel: string) => {
      (v.el.querySelector(sel) as HTMLElement).click();
      for (let i = 0; i < 4; i++) await settle();
      v.enter?.('');
    };
    await click('.ip2-finish-btn');
    const f = v.el.querySelector('.ip2-finish-resident') as HTMLInputElement;
    f.value = 'Dr Karimi';
    f.dispatchEvent(new Event('input', { bubbles: true }));
    await click('.ip2-finish-restart');

    // saved first: the archive has the run, its /2 debrief with the two takings
    const [e] = archive.list();
    expect(archive.list()).toHaveLength(1);
    expect(e).toMatchObject({ resident: 'Dr Karimi', title: 'Malignant hyperthermia (phases)', runStartedAt: run });
    const saved = JSON.parse((await archive.debrief(e?.id as string)) as string) as { schema: string };
    expect(saved.schema).toBe('pme-debrief/3');
    // then the same card again, with the room as it stood, through the app's one load
    expect(r.loads).toEqual([['showcase-mh-v2', r.ROOM]]);
    for (let i = 0; i < 4; i++) await settle();
    await r.run(1);
    const again = r.driver.phaseRunner;
    expect(again, 'a new phase runner').not.toBe(first);
    expect(again?.doc.id).toBe('showcase-mh-v2');
    expect(again?.stateId).toBe('baseline');
    expect(again?.takings).toEqual({});
    expect(again?.phases.map((p) => p.id)).toEqual(['baseline']);
    // a fresh record: the new run's, its load the first row, nothing of the saved run's
    expect(r.record.data.startedAt).not.toBe(run);
    expect(r.record.data.doc?.id).toBe('showcase-mh-v2');
    expect(r.record.data.rows[0]?.text).toBe('Scenario loaded: Malignant hyperthermia (phases)');
    expect(r.record.data.admin ?? []).toEqual([]);
    const pane = v.el.querySelector<HTMLElement>('.ip2-finish');
    expect(!pane || pane.hidden || !!pane.closest('[hidden]'), 'the pane closed').toBe(true);
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toContain('Debrief saved: Dr Karimi · Malignant hyperthermia (phases). The case starts again.');
  }, 60_000);
});
