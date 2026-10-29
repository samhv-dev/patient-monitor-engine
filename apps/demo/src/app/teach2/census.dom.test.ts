// @vitest-environment happy-dom
// The command census (plan `docs/plans/instructor-peer-role.md`, piece P0; §2): the exact set of command shapes the
// laptop's two Instructor views send, measured, not listed by hand. Today's Instructor view (its session bar,
// `sessionbar.ts`, over the panel, `panel/*` through `mountPanel`, mounted as the laptop mounts it: with
// `loadScenario`) and Instructor v2 (`views/teach2.ts`, every slot and sheet) are each mounted on a real `Link` over a
// recording ControllerSession (its `send` records and accepts). A crawler then presses every button, chooses every
// option of every select, answers every confirm and presses every key the views listen to, in several states of the
// session (both demo cards at every state, MODELED with held values and MANUAL, running and paused, no card loaded),
// and the set of shapes (`type`, plus `action` when it is a word, plus `event.kind` for `applyEvent`) is compared with
// §2's table, written below as a literal. Once P2 lands, P6 switches the literal to `INSTRUCTOR_COMMANDS`.
// With PME_CENSUS_OUT set, the measured census (each shape with the controls that sent it) is written there as JSON.
import { writeFileSync } from 'node:fs';
import { ScenarioView, type AckResult, type CommandInput, type ControllerSession, type ManagedTransport, type ScenarioDoc } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRUG_LIST } from '../drugs.ts';
import { ACUTE_EVENTS } from '../events.ts';
import { Link } from '../link.ts';
import { mountPanel, TABS } from '../panel/panel.ts';
import { mountSessionBar } from '../sessionbar.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { DEFAULT_SITE } from '../site.ts';
import { teach2View } from '../views/teach2.ts';
import { stageMarks } from './strip.ts';
import { SHEETS } from './sheets.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const HAEM = showcaseDoc('showcase-haemorrhage') as ScenarioDoc;

/**
 * §2's table (amended 2026-10-30 after this census, the orchestrator's rulings): the UNION of what the two laptop views
 * send. `scenario pause` / `resume` are today's Scenario tab's "Hold the timer" (Instructor v2 has no such button).
 * `applyEvent`: every ClinicalEvent kind the Drug, Airway, Defib · CPR, Vitals, Devices and Patient bodies send
 * (panel/drugs.ts and teach2/drug-sheet.ts: drug, infusion, fluid, bleed, vaporiser; panel/airway.ts: airway,
 * ventilation (oxygen is a ventilation event), lungCondition; panel/defib.ts: defib, pacer, cpr; panel/patient.ts:
 * condition, the acute events; the Vitals and Devices bodies send no applyEvent). The `note` row is new (§6): no view
 * sends it today.
 */
const PLAN_S2: readonly string[] = [
  'time pause', 'time resume', 'time scale', 'time jump',
  'scenario trigger', 'scenario goto', 'scenario bookmark', 'scenario restoreBookmark', 'scenario pause', 'scenario resume',
  'applyEvent drug', 'applyEvent infusion', 'applyEvent fluid', 'applyEvent bleed', 'applyEvent vaporiser',
  'applyEvent airway', 'applyEvent ventilation', 'applyEvent lungCondition',
  'applyEvent defib', 'applyEvent pacer', 'applyEvent cpr', 'applyEvent condition',
  'device', 'setTarget', 'pin', 'release', 'setRhythm', 'setMode', 'attachSensor',
].sort();

/** §2's refusals that are command shapes: no Instructor view may send them. */
const PLAN_S2_REFUSED: readonly string[] = ['scenario load', 'setFactor', 'setModifiers', 'externalDrive', 'time step'];

const shapeOf = (c: CommandInput): string => {
  const x = c as { type: string; action?: unknown; event?: { kind?: unknown } };
  if (x.type === 'applyEvent') return `applyEvent ${String(x.event?.kind)}`;
  return typeof x.action === 'string' ? `${x.type} ${x.action}` : x.type;
};
/** A finer key for the review copy: a device command's device and action, a bookmark's kind. */
const detailOf = (c: CommandInput): string | null => {
  const x = c as { type: string; action?: unknown; kind?: unknown };
  if (x.type === 'device' && x.action && typeof x.action === 'object') {
    const a = x.action as { device?: unknown; action?: unknown };
    return `device ${String(a.device)}.${String(a.action)}`;
  }
  if (x.type === 'scenario' && x.action === 'bookmark') return `scenario bookmark kind=${x.kind === undefined ? '(none)' : String(x.kind)}`;
  return null;
};

interface Sent { view: string; by: string; shape: string; detail: string | null }
const sent: Sent[] = [];
let actor = '';
let view = '';

interface Config {
  name: string;
  doc: ScenarioDoc | null;
  /** The current state (an index into the card's states). */
  at?: number;
  mode: 'modeled' | 'manual';
  paused: boolean;
  /** The Scenario tab's "Hold the timer" was pressed (ScenarioView.paused, set by the host's applied `scenario pause`). */
  timerHeld?: boolean;
}

/** A recording ControllerSession: what the panel and the slots read, and a `send` that records and accepts. */
function rig(cfg: Config) {
  const sv = new ScenarioView();
  const fns = new Set<() => void>();
  let n = 0;
  const ctl = {
    peerId: 'census', scenario: sv, bookmarks: ['Bookmark 1 at 00:10'], log: [], simT: 600, timeScale: 1, hostPaused: cfg.paused,
    fastForward: null, rhythm: 'sinus', state: null as unknown,
    send: async (c: CommandInput): Promise<AckResult> => {
      sent.push({ view, by: actor, shape: shapeOf(c), detail: detailOf(c) });
      return { accepted: true, tick: 30_000, commandId: `census-${++n}`, rttMs: 0 };
    },
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
    close: () => undefined,
  };
  const transport = { onMessage: () => () => undefined } as unknown as ManagedTransport;
  const link = new Link(ctl as unknown as ControllerSession, transport, null);
  const modeled = cfg.mode === 'modeled';
  ctl.state = {
    mode: cfg.mode,
    values: { hr: 80, map: 80, spo2: 0.97, fio2: 0.21, etco2: 38 },
    control: modeled ? { hr: 'pinned', map: 'ramping' } : {},
    breathing: { source: 'spontaneous', device: 'none' },
    sensors: { ecg: 'on', spo2: 'on', nibp: 'on', co2: 'on', temp: 'on', abp: 'none', cvp: 'none', pap: 'none' },
  };
  if (modeled) link.conditions.set((ACUTE_EVENTS[0] as { id: string }).id, 1); // a running acute event: its Stop is live
  if (cfg.doc) {
    const states = cfg.doc.states;
    const at = Math.min(cfg.at ?? 0, states.length - 1);
    sv.doc = cfg.doc;
    sv.docVersion = 1;
    // a course through the card's states in order, 30 s apart, up to the current one: past and future stages both show
    sv.history = states.slice(0, at + 1).map((s, i) => ({ t: i * 30, stateId: s.id, ...(i ? { transitionId: `census-${i}` } : {}) }));
    sv.stateId = (states[at] as { id: string }).id;
    sv.enteredT = at * 30;
    sv.paused = cfg.timerHeld === true;
    ctl.simT = Math.max(600, at * 30 + 10);
  }
  return { ctl, link, changed: () => fns.forEach((f) => f()) };
}

const settle = () => vi.advanceTimersByTimeAsync(600);

/** A key for a control that survives a repaint: its place (the ancestors' tags and first classes), its words, and the
 *  name of the item it acts on (today's Drugs tab draws one dose card, "Give now", for whichever drug is chosen). */
function keyOf(el: Element, root: Element): string {
  const path: string[] = [el.closest('.card')?.querySelector('h4')?.textContent ?? ''];
  for (let e: Element | null = el.parentElement; e && e !== root; e = e.parentElement) {
    const d = (e as HTMLElement).dataset ?? {};
    path.push(`${e.tagName.toLowerCase()}.${e.classList[0] ?? ''}${d.sheet ? `[${d.sheet}]` : ''}${d.var ? `[${d.var}]` : ''}${d.event ? `[${d.event}]` : ''}`);
  }
  const words = `${el.textContent?.trim() ?? ''}|${el.getAttribute('aria-label') ?? ''}|${(el as HTMLElement).dataset?.v ?? ''}`;
  return `${path.reverse().join('>')}>${el.tagName.toLowerCase()}|${words}`; // the item's name ends the reversed path
}
const live = (el: Element) => el.isConnected && !el.closest('[hidden]') && !(el as HTMLButtonElement).disabled;
const nameOf = (el: Element) => `${el.tagName === 'SELECT' ? 'select ' : ''}"${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70)}"`;

/** Answer an open dialog: its body's buttons first (the MODELED badge lists "Return to model"), then its action. */
async function answerDialogs(where: string) {
  for (let i = 0; i < 5; i++) {
    const d = document.querySelector('dialog[open]');
    if (!d) return;
    for (const b of [...d.querySelectorAll('button')].filter((x) => !x.closest('.actions'))) {
      actor = `${where} → dialog "${d.querySelector('h2')?.textContent ?? ''}" → ${nameOf(b)}`;
      b.click();
      await settle();
    }
    const acts = [...d.querySelectorAll('.actions button')];
    const last = acts.at(-1) as HTMLButtonElement | undefined;
    actor = `${where} → dialog "${d.querySelector('h2')?.textContent ?? ''}" → ${last ? nameOf(last) : '?'}`;
    if (last) last.click();
    else (d as HTMLDialogElement).close();
    await settle();
  }
}

/**
 * Press every live control under `root` once (a control whose words change, "Commit 2 changes", is a new control):
 * each pass presses the newest control not yet pressed (so what a press opens, a tab, a sheet's list, is explored
 * before its siblings), the last in the document first, until none is left. A select is set to each of its options in turn.
 */
async function sweep(root: Element, where: string, skip: (el: Element) => boolean = () => false) {
  const done = new Set<string>();
  const firstSeen = new Map<string, number>();
  for (let pass = 0; pass < 4000; pass++) {
    const seen = new Map<string, number>();
    const cands: Array<[string, Element]> = [];
    for (const el of root.querySelectorAll('button, select')) {
      if (!live(el) || skip(el)) continue;
      let k = keyOf(el, root);
      const m = (seen.get(k) ?? 0) + 1;
      seen.set(k, m);
      k = `${k}#${m}`;
      if (!firstSeen.has(k)) firstSeen.set(k, pass);
      if (!done.has(k)) cands.push([k, el]);
    }
    if (!cands.length) return;
    const newest = Math.max(...cands.map(([k]) => firstSeen.get(k) as number));
    // among the newest, the last in the document: a form's action (Give, Stage) before the choices above it that
    // redraw it (the route "Infusion" turns "Give now" into "Start infusion")
    const [k, el] = [...cands].reverse().find(([x]) => firstSeen.get(x) === newest) as [string, Element];
    done.add(k);
    actor = `${where} → ${nameOf(el)}`;
    if (el.tagName === 'SELECT') {
      const sel = el as HTMLSelectElement;
      for (const o of [...sel.options]) {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
      }
    } else (el as HTMLElement).click();
    await settle();
    await answerDialogs(actor);
  }
  throw new Error(`${where}: the sweep did not end`);
}

/** Every key the two views listen to (panel.ts, teach2/keys.ts, teach2/sheets.ts). */
const KEYS: ReadonlyArray<[string, KeyboardEventInit]> = [
  ['Space', { key: ' ' }], ['Shift+S', { key: 'S', shiftKey: true }], ['Shift+P', { key: 'P', shiftKey: true }], ['Shift+N', { key: 'N', shiftKey: true }],
  ['Shift+B', { key: 'B', shiftKey: true }], ['?', { key: '?', shiftKey: true }],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n): [string, KeyboardEventInit] => [String(n), { key: String(n) }]),
  ['Cmd+Enter', { key: 'Enter', metaKey: true }], ['Ctrl+Enter', { key: 'Enter', ctrlKey: true }],
];
async function pressKeys(where: string, extra: ReadonlyArray<[string, KeyboardEventInit]> = []) {
  for (const [name, init] of [...KEYS, ...extra]) {
    actor = `${where} → key ${name}`;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }));
    document.body.dispatchEvent(new KeyboardEvent('keyup', { ...init, bubbles: true, cancelable: true }));
    await settle();
    await answerDialogs(actor);
  }
}

const noExport = (el: Element) => /^Export /.test(el.textContent ?? ''); // a file download (ui.ts `download`), never a command

/** Today's Instructor view: the session bar over the panel, as main.ts and views/teach.ts mount them on the laptop. */
async function today(cfg: Config, scope: 'all' | 'scenario') {
  view = 'today';
  const r = rig(cfg);
  const bar = document.createElement('div');
  bar.className = 'sessionbar';
  const offBar = mountSessionBar(bar, r.link);
  const loads: string[] = [];
  const panel = mountPanel(r.link, { site: DEFAULT_SITE, weightKg: () => 70, tab: 'scenario', loadScenario: (c) => (loads.push(c.title), true) });
  document.body.append(bar, panel.el);
  r.changed();
  await settle();
  const where = `today [${cfg.name}]`;
  if (scope === 'all') await sweep(bar, `${where} session bar`);
  for (const [id, label] of scope === 'all' ? TABS : TABS.filter(([id]) => id === 'scenario')) {
    panel.select(id);
    await settle();
    const tp = panel.el.querySelector(`#tp-${id}`) as Element;
    await sweep(tp, `${where} ${label} tab`, noExport);
    if (id === 'drugs' && scope === 'all') {
      // the Drugs tab lists ten drugs until a name is typed: every drug of the list, found by its name, then its card
      const search = tp.querySelector('input[type="search"]') as HTMLInputElement;
      for (const d of DRUG_LIST) {
        search.value = d.name;
        search.dispatchEvent(new Event('input'));
        await settle();
        await sweep(tp, `${where} ${label} tab, "${d.name}" typed`, (el) => !el.closest('.results, .card.dose'));
      }
    }
    // Commit what the tab staged before the footer's other controls are pressed (Discard would drop it)
    const footer = panel.el.querySelector('footer.stagebar') as Element;
    const commit = [...footer.querySelectorAll('button')].find((b) => b.classList.contains('primary')) as HTMLButtonElement;
    if (live(commit)) {
      actor = `${where} ${label} tab → staged-changes footer → ${nameOf(commit)}`;
      commit.click();
      await settle();
    }
    await sweep(footer, `${where} ${label} tab → staged-changes footer`);
  }
  if (scope === 'all') await pressKeys(where);
  panel.destroy();
  offBar();
  r.link.close();
  document.body.replaceChildren();
  return loads;
}

/** Instructor v2: header, strip, STATE (cue, Fast forward, alarm line), ACTION, the dock and every sheet. */
async function v2(cfg: Config, scope: 'all' | 'scenario') {
  view = 'v2';
  const r = rig(cfg);
  const top = { soundOn: () => false, toggleSound: () => undefined, code: 'CNS234', phones: () => 0 };
  const v = teach2View(r.link, { site: DEFAULT_SITE, weightKg: () => 70, top });
  document.body.append(v.el);
  v.enter?.('');
  r.changed();
  await settle();
  const where = `v2 [${cfg.name}]`;
  const q = (s: string) => v.el.querySelector(s) as Element;
  if (scope === 'all') {
    await sweep(q('.ip2-head'), `${where} header`);
    await sweep(q('.ip2-ff'), `${where} Fast forward`);
    await sweep(q('.ip2-alarmline').parentElement as Element, `${where} alarm line`, (el) => !el.classList.contains('ip2-alarmline'));
    v.openSheet('none'); // the alarm line opened Devices: closed again by the sheet sweep below
  }
  await sweep(q('.ip2-strip'), `${where} strip`);
  await sweep(q('.ip2-cue'), `${where} cue box`);
  await sweep(q('.ip2-action-body'), `${where} ACTION`);
  if (scope === 'all') {
    await sweep(q('.ip2-dock'), `${where} dock`, (el) => el.classList.contains('ip2-tool') || el.classList.contains('ip2-staged'));
    for (const s of SHEETS) {
      v.openSheet(s.id);
      await settle();
      const sheet = q(`.ip2-sheet[data-sheet="${s.id}"]`);
      // a staged item's ✕ (Cache.drop) sends nothing and would empty the cache before Deliver: not pressed
      await sweep(sheet, `${where} ${s.name} sheet`, (el) => noExport(el) || el.classList.contains('ip2-sheet-close') || el.classList.contains('ip2-chip-x'));
      // Deliver what the sheet staged (Deliver moves with the open sheet; it was pressed above whenever it was live)
      const deliver = sheet.querySelector('.ip2-deliver') as HTMLButtonElement | null;
      if (deliver && live(deliver)) {
        actor = `${where} ${s.name} sheet → ${nameOf(deliver)}`;
        deliver.click();
        await settle();
      }
    }
    // the sheets' keys: open a sheet by its letter, then Enter (give now) and S (add to the cache), then Esc
    await pressKeys(where, SHEETS.filter((s) => s.letter).flatMap((s): Array<[string, KeyboardEventInit]> => [
      [s.letter, { key: s.letter }], ['Enter', { key: 'Enter' }], ['s', { key: 's' }], ['Escape', { key: 'Escape' }],
    ]));
    await sweep(q('.ip2-dock'), `${where} dock (after the sheets)`, (el) => el.classList.contains('ip2-tool'));
  }
  v.destroy();
  r.link.close();
  document.body.replaceChildren();
}

const FULL: Config[] = [
  { name: 'MH, MODELED with held values, running', doc: MH, at: 6, mode: 'modeled', paused: false },
  { name: 'haemorrhage, MANUAL, paused', doc: HAEM, at: 6, mode: 'manual', paused: true },
  { name: 'no card loaded', doc: null, mode: 'modeled', paused: false },
];
/** Every state of both cards, running, and paused with the scenario timer held: the scenario controls only (the Scenario tab; strip, cue, ACTION). */
const EVERY_STATE: Config[] = [MH, HAEM].flatMap((doc) => doc.states.flatMap((s, at) => [false, true].map((paused): Config => ({ name: `${doc === MH ? 'MH' : 'haemorrhage'} at ${s.id}${paused ? ', paused, timer held' : ''}`, doc, at, mode: 'modeled', paused, timerHeld: paused }))));

let restoreMarks = stageMarks.of;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  restoreMarks = stageMarks.of;
  // the host-side driver places a stage mark at every stage entry (strip.ts): every past stage has its return
  stageMarks.of = (_link, entry) => `stage:${entry.stage}:1`;
  document.body.replaceChildren();
});
afterEach(() => {
  stageMarks.of = restoreMarks;
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the command census of the laptop\'s Instructor views (P0)', () => {
  it('the shapes the two views send are §2\'s table, and none of §2\'s refusals', async () => {
    sent.splice(0);
    const loads: string[] = [];
    for (const cfg of FULL) {
      loads.push(...(await today(cfg, 'all')));
      await v2(cfg, 'all');
    }
    for (const cfg of EVERY_STATE) {
      await today(cfg, 'scenario');
      await v2(cfg, 'scenario');
    }

    const shapes = [...new Set(sent.map((s) => s.shape))].sort();
    const census = shapes.map((shape) => {
      const of = sent.filter((s) => s.shape === shape);
      return {
        shape,
        views: [...new Set(of.map((s) => s.view))].sort(),
        details: [...new Set(of.flatMap((s) => (s.detail ? [s.detail] : [])))].sort(),
        // each view's first sender, then up to 6 more distinct controls
        by: [...new Set(of.map((s) => s.by.replace(/ \[[^\]]*\]/, '')))].slice(0, 8),
      };
    });
    const out = process.env.PME_CENSUS_OUT;
    if (out) {
      writeFileSync(out, `${JSON.stringify({
        schema: 'pme-command-census/1', measured: shapes, plan: PLAN_S2,
        extra: shapes.filter((s) => !PLAN_S2.includes(s)), missing: PLAN_S2.filter((s) => !shapes.includes(s)),
        loadScenarioCalls: loads.length, census,
      }, null, 1)}\n`);
    }
    // the laptop's Load remounts the engine and calls loadScenario: never a `scenario load` send (§2)
    expect(loads.length).toBeGreaterThan(0);
    expect(shapes.filter((s) => PLAN_S2_REFUSED.includes(s)), 'a refused shape is sent').toEqual([]);
    expect(shapes).toEqual(PLAN_S2);
  }, 600_000);
});
