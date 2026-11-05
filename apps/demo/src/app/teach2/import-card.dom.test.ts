// @vitest-environment happy-dom
// Brief 22: "Open a card file…" on Instructor v2's start menu reads one JSON file, validates it with the controller's
// validator (pme-scenario/2, or /1), says the validator's errors when it fails and keeps nothing; a card whose id is a
// built-in card's is refused with the reason; a valid card is kept in this browser's library under "Imported" (in the
// case list, removable) and offered to start through the app's one load.
import { ScenarioView, type AckResult, type AnyScenarioDoc, type CommandInput } from '@pme/controller';
import { validateScenario } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Link } from '../link.ts';
import { importedCards, LIBRARY, type ScenarioCard } from '../scenarios.ts';
import { DEFAULT_SITE } from '../site.ts';
import { teach2View, type Teach2View } from '../views/teach2.ts';

const SPEC = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const MH2 = LIBRARY.find((c) => c.id === 'showcase-mh-v2')?.doc as unknown as AnyScenarioDoc;

function rig() {
  const loads: string[] = [];
  const reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
  const sv = new ScenarioView();
  const ctl = { scenario: sv, state: { mode: 'modeled', values: {}, control: {} }, timeScale: 1, hostPaused: false, fastForward: null, simT: 0, bookmarks: [] };
  const link = {
    ctl, simT: 0, conditions: new Map(), alarms: null, alarmSummary: { level: null, n: 0, top: null }, log: [], ramps: new Map(),
    host: { spec: SPEC, mode: 'modeled', record: { data: { rows: [] } }, driver: { markStages: () => undefined, stageMarks: () => [], vitalHolds: () => [] } },
    send: async (_c: CommandInput) => reply,
    note: () => undefined,
    onChange: () => () => undefined,
  } as unknown as Link;
  const loadScenario = (c: ScenarioCard): boolean => (loads.push(c.id), true);
  const v = teach2View(link, { site: DEFAULT_SITE, weightKg: () => 70, loadScenario });
  document.body.append(v.el);
  v.enter?.('');
  const q = <T extends Element = HTMLElement>(s: string) => v.el.querySelector(s) as T | null;
  const all = (s: string) => [...v.el.querySelectorAll<HTMLElement>(s)];
  const text = (s: string) => q(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  const shown = (s: string) => { const e = q(s); return !!e && !e.closest('[hidden]'); };
  const key = (k: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  /** Pick a file in the menu's file input, as the browser's file dialog does, and wait for the import to finish. */
  const pick = async (name: string, body: string) => {
    const input = q<HTMLInputElement>('.ip2-begin input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([body], name, { type: 'application/json' })] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(q('.ip2-begin-note')?.hidden).toBe(false));
  };
  return { v, loads, q, all, text, shown, key, pick };
}

let open: Teach2View | null = null;
const use = <T extends { v: Teach2View }>(r: T): T => ((open = r.v), r);
let m: Map<string, string>;
beforeEach(() => {
  m = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
});
afterEach(() => {
  open?.destroy();
  open = null;
  document.body.replaceChildren();
  location.hash = '';
  vi.unstubAllGlobals();
});

const json = (o: unknown) => JSON.stringify(o, null, 2);
const copy = (id: string): AnyScenarioDoc => ({ ...structuredClone(MH2), id, title: 'Malignant hyperthermia, my copy' });

describe('Open a card file… (brief 22)', () => {
  it('the menu: "Open a card file…" under the three cards, beside Room setup and the builder; it opens the file dialog for one JSON file', () => {
    const r = use(rig());
    const btns = r.all('.ip2-begin-two > button');
    expect(btns.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Room setup', 'Scenario builder after the demo', 'Open a card file…']);
    expect(r.text('.ip2-begin-hint')).toBe('no case: three ways to begin · 1–3 on the keyboard · three shortcuts');
    const input = r.q<HTMLInputElement>('.ip2-begin input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('application/json,.json');
    expect(input.multiple).toBe(false);
    const click = vi.spyOn(input, 'click');
    (btns[2] as HTMLButtonElement).click();
    expect(click).toHaveBeenCalledOnce();
    expect(r.shown('.ip2-begin-note')).toBe(false); // nothing to say before a file is read
  });

  it('a file that is not JSON: said in plain words; nothing kept', async () => {
    const r = use(rig());
    await r.pick('notes.json', 'phases: [baseline');
    expect(r.q('.ip2-begin-note')?.getAttribute('role')).toBe('alert');
    expect(r.text('.ip2-begin-note-head')).toBe('notes.json was not opened: it is not a JSON file.');
    expect(importedCards()).toEqual([]);
    expect(r.loads).toEqual([]);
  });

  it("a card the validator refuses: the validator's own errors, one per line; nothing kept, nothing started", async () => {
    const r = use(rig());
    const bad = copy('my-mh-v2') as unknown as Record<string, unknown>;
    delete bad.phases;
    (bad.actions as Array<Record<string, unknown>>)[0]!.bogus = 1;
    const v = validateScenario(bad);
    expect(v.ok).toBe(false);
    await r.pick('my-mh.json', json(bad));
    expect(r.q('.ip2-begin-note')?.getAttribute('role')).toBe('alert');
    expect(r.text('.ip2-begin-note-head')).toBe('my-mh.json was not opened: it is not a card the monitor can run. The checker says:');
    expect(r.all('.ip2-begin-note-list > li').map((li) => li.textContent)).toEqual(v.ok ? [] : v.errors);
    expect(r.q('.ip2-begin-note button')).toBeNull(); // no Start
    expect(importedCards()).toEqual([]);
    expect(r.loads).toEqual([]);
  });

  it("a card whose id is a built-in card's: refused with the reason", async () => {
    const r = use(rig());
    await r.pick('showcase-mh-v2.json', json(MH2));
    expect(r.q('.ip2-begin-note')?.getAttribute('role')).toBe('alert');
    expect(r.text('.ip2-begin-note-head')).toBe("showcase-mh-v2.json was not opened: its id “showcase-mh-v2” is a built-in card's; give the card an id of its own.");
    expect(importedCards()).toEqual([]);
  });

  it('a valid /2 card: kept under "Imported", offered to start; Start loads it through the app\'s one load', async () => {
    const r = use(rig());
    await r.pick('my-mh.json', json(copy('my-mh-v2')));
    expect(r.q('.ip2-begin-note')?.getAttribute('role')).toBe('status');
    expect(r.text('.ip2-begin-note-head')).toBe('“Malignant hyperthermia, my copy” is in this browser\'s library, under Imported in the Scenario library.');
    expect(importedCards().map((c) => c.id)).toEqual(['my-mh-v2']);
    // the Scenario library card counts it
    expect(r.text('.ip2-begin-card[data-way="library"] .ip2-begin-line')).toBe(`${LIBRARY.length} cards and 1 imported. Pick one and this pane becomes its stages and steps.`);
    const start = r.q<HTMLButtonElement>('.ip2-begin-note button') as HTMLButtonElement;
    expect(start.textContent).toBe('Start it');
    start.click();
    expect(r.loads).toEqual(['my-mh-v2']);
  });

  it('the case list: "Imported" after the library, a row that loads the card and its Remove; none when nothing is imported', async () => {
    const r = use(rig());
    r.key('2');
    expect(r.shown('.ip2-case-list')).toBe(true);
    expect(r.shown('.ip2-imported')).toBe(false);
    r.key('Escape');
    await r.pick('my-mh.json', json(copy('my-mh-v2')));
    r.key('2');
    expect(r.shown('.ip2-imported')).toBe(true);
    expect(r.text('.ip2-imported-h')).toBe('Imported');
    const rows = r.all('.ip2-imported-list > li');
    expect(rows).toHaveLength(1);
    const load = rows[0]?.querySelector('button.ip2-case-row') as HTMLButtonElement;
    expect(load.dataset.card).toBe('my-mh-v2');
    expect(load.querySelector('.ip2-row-title')?.textContent).toBe('Load Malignant hyperthermia, my copy');
    expect(load.querySelector('.ip2-row-right')?.textContent).toBe((MH2.mode ?? 'modeled').toUpperCase());
    load.click();
    expect(r.loads).toEqual(['my-mh-v2']);
    const remove = rows[0]?.querySelector('button.ip2-imported-remove') as HTMLButtonElement;
    expect(remove.getAttribute('aria-label')).toBe('Remove Malignant hyperthermia, my copy from this browser');
    remove.click();
    expect(importedCards()).toEqual([]);
    expect(r.shown('.ip2-imported')).toBe(false);
  });

  it('a /1 card stays readable: it is kept and offered like a /2 card', async () => {
    const r = use(rig());
    const v1 = structuredClone(LIBRARY.find((c) => c.id === 'showcase-mh')?.doc) as unknown as Record<string, unknown>;
    v1.id = 'my-mh-v1';
    await r.pick('my-mh-v1.json', json(v1));
    expect(r.q('.ip2-begin-note')?.getAttribute('role')).toBe('status');
    expect(importedCards().map((c) => c.id)).toEqual(['my-mh-v1']);
  });
});
