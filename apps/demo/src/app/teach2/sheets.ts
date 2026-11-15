// Instructor v2, the sheets slot (design §3.6, §4; board "Proposal v11"; plan IP7; answers 11, 13–16). It fills the
// dock's Tools (one button per sheet, the open one lit, and "Staged · n") and its note field, and slides the sheets up
// over ACTION, one at a time. The Drug sheet is drug-sheet.ts; Airway, CPR, Patient, Devices and Log mount today's tab
// bodies unmodified (panel/*.ts), each sheet with its own PanelCtx whose staging is the view's one cache
// (answer 14), so their Stage buttons fill the same cache the Drug sheet does. Gas is not built; there is no CPR
// takeover (answer 15). A sheet is built the first time it opens (so today's view's locators never meet a second copy
// of its tab bodies in the DOM until the instructor opens one here) and keeps its state: it reopens on its last item.
// Labs (plan learner-action-remote.md L15) is the last tool, on the host only: every sample of the case (labs-sheet.ts).
//
// Keys (answer 16; keys.ts): D opens and closes the Drug sheet, A Airway, F CPR, V Patient; Esc closes the open
// sheet (also from a field inside it); while a sheet is open, Enter gives now and S adds to the cache. Deliver has no
// key. The note field: Enter writes a note; a mark takes the field's text as its note and clears it (dock.ts).
// The owner's rulings of 12 November (brief 208): "Defib · CPR" is "CPR" (the tool and its sheet's title; the sheet's
// contents and its group tab are unchanged). Vitals and Patient are one tool, "Patient": one sheet whose tab row (the
// frame's, sheet.ts) holds "Vitals & rhythm" first (today's Vitals body) and "Patient & events" (today's Patient body),
// each body in its own tab panel; the tool, a tap on it and V always open it on "Vitals & rhythm" (a tap or V while it
// is open on "Patient & events" goes to "Vitals & rhythm"; while it is on "Vitals & rhythm" they close it, as every
// tool does). Today's tab ids still open their tab (`openSheet('vitals')`, a body's `goTab`). The sheets' PanelCtx
// carries `holds: false`: in MODELED the Vitals rows hold nothing (panel/vitals.ts). Free roam opens the Patient sheet
// when it begins (begin.ts).
import './sheets.css';
import { isTyping } from '@pme/controller';
import { airwayTab } from '../panel/airway.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { defibTab } from '../panel/defib.ts';
import { devicesTab } from '../panel/devices.ts';
import { logTab } from '../panel/log.ts';
import { patientTab } from '../panel/patient.ts';
import { vitalsTab } from '../panel/vitals.ts';
import { confirmDialog, h, select, setText, toast } from '../ui.ts';
import { Cache } from './cache.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';
import { MARK_KINDS } from './dock.ts';
import { drugSheet } from './drug-sheet.ts';
import { LabBook, labsSheet } from './labs-sheet.ts';
import { sheetFrame, type SheetFrame } from './sheet.ts';

/** One tab of a sheet: its id (today's tab id), its words, the body it mounts (today's tab body). */
export type SheetTab = readonly [id: string, label: string, body: (c: PanelCtx) => HTMLElement];
/** The sheets in the dock's order (brief 208, ruling 3: Drug, Airway, CPR, Patient, Devices, Log, then Labs, which is
 *  LABS_SHEET below, on the host only): id, the dock's name (also the sheet's title), its letter ('' = none), its tabs (the
 *  first is where the sheet opens; none for the Drug sheet, which draws its own groups). */
export const SHEETS: ReadonlyArray<{ id: string; name: string; letter: string; tabs: readonly SheetTab[] }> = [
  { id: 'drug', name: 'Drug', letter: 'd', tabs: [] },
  { id: 'airway', name: 'Airway', letter: 'a', tabs: [['airway', 'Airway & ventilation', airwayTab]] },
  { id: 'defib', name: 'CPR', letter: 'f', tabs: [['defib', 'Defib, pacing & CPR', defibTab]] },
  { id: 'patient', name: 'Patient', letter: 'v', tabs: [['vitals', 'Vitals & rhythm', vitalsTab], ['patient', 'Patient & events', patientTab]] },
  { id: 'devices', name: 'Devices', letter: '', tabs: [['devices', 'Devices & alarms', devicesTab]] },
  { id: 'log', name: 'Log', letter: '', tabs: [['log', 'Log', logTab]] },
];
/** L15 (LQ13 ruled B): the laptop's Labs sheet, after the others, offered on the host only (labs-sheet.ts). */
export const LABS_SHEET = { id: 'labs', name: 'Labs', letter: '', tabs: [] } as const;
/** The onsets of a staged delivery, as today's staged-changes footer offers them (panel/panel.ts). */
const ONSETS: Array<[string, string]> = [['0', 'Now'], ['30', 'Over 30 s'], ['60', 'Over 1 min'], ['120', 'Over 2 min'], ['300', 'Over 5 min']];
/** Today's tab ids (a tab body's `goTab`, `openSheet`) to the sheet and its tab that hold them; the Scenario tab is
 *  ACTION (the sheet closes). */
const OF_TAB: Readonly<Record<string, readonly [string, string?]>> = {
  drugs: ['drug'], ...Object.fromEntries(SHEETS.flatMap((s) => s.tabs.map(([t]) => [t, [s.id, t]] as const))),
};

interface Built {
  frame: SheetFrame;
  /** Show the tab `id` (a sheet with tabs). */
  tab?(id: string): void;
  /** The tab shown. */
  current?(): string;
  refresh(): void;
  give?(): void;
  stage?(): void;
}

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link, keys } = ctx;
  const cache = new Cache(link);
  const built = new Map<string, Built>();
  // the book listens from the mount, so a sample drawn before the sheet is first opened is listed
  const book = ctx.labs ? new LabBook(ctx.labs) : null;
  const offered: ReadonlyArray<(typeof SHEETS)[number]> = book ? [...SHEETS, LABS_SHEET] : SHEETS;
  const offs: Array<() => void> = [];
  let openId: string | null = null;
  let lastId = 'drug';

  // ---- the shared tray and Deliver (moved into the open sheet) ----
  const trayCount = h('span', { class: 'ip2-tray-count' });
  const trayItems = h('span', { class: 'ip2-tray-items', role: 'list', 'aria-label': 'Staged items' });
  const trayNote = h('span', { class: 'ip2-sheet-note' }, 'delivered at one instant, one line in the log');
  const deliver = h('button', { type: 'button', class: 'ip2-deliver', onclick: () => void cache.commit() });
  // the onset of the delivery (retire-instructor-v1 G3): today's footer's five values; a held value or a target arrives
  // over it (Staging.withRamp: only setTarget and pin ramp), everything else at once. One choice for every sheet.
  const onset = select('Onset', ONSETS, '0', (v) => (cache.transitionS = Number(v)));
  onset.el.classList.add('ip2-onset');

  // ---- the dock: tools, Staged · n, the note field ----
  const tools = offered.map((s) => h('button', {
    type: 'button', class: 'ip2-dock-btn ip2-tool', 'data-sheet': s.id, 'aria-pressed': 'false', 'aria-keyshortcuts': s.letter ? s.letter.toUpperCase() : undefined,
    title: s.letter ? `${s.name} (${s.letter.toUpperCase()})` : s.name, onclick: () => toggle(s.id),
  }, s.name));
  const staged = h('button', { type: 'button', class: 'ip2-dock-btn ip2-staged', 'aria-label': 'Staged items: open the sheet', onclick: () => open(lastId) }); // where it was left
  ctx.dock.tools.replaceChildren(...tools, staged);
  const noteField = h('input', { type: 'text', class: 'ip2-input ip2-note-field', 'aria-label': 'Note', placeholder: 'Note…', autocomplete: 'off' });
  noteField.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !noteField.value.trim()) return;
    e.preventDefault();
    link.note(noteField.value.trim()); // the Log tab's note: into the log and the debrief
    noteField.value = '';
    toast('Note saved');
  });
  ctx.dock.note.replaceChildren(h('label', { class: 'ip2-note' }, noteField));

  const drawCache = () => {
    const n = cache.size;
    setText(trayCount, `Staged · ${n}`);
    trayItems.replaceChildren(...cache.items.map((x) => h('span', { class: 'ip2-chip', role: 'listitem' }, x.text,
      h('button', { type: 'button', class: 'ip2-chip-x', 'aria-label': `Remove ${x.text}`, onclick: () => cache.drop(x.key) }, '✕'))));
    trayNote.hidden = n === 0;
    setText(deliver, `Deliver the staged cache (${n} ${n === 1 ? 'item' : 'items'})`);
    deliver.disabled = n === 0;
    deliver.setAttribute('aria-disabled', String(n === 0));
    setText(staged, `Staged · ${n}`);
    staged.dataset.count = String(n);
    staged.hidden = n === 0; // the owner, 1 November: shown only while something is staged
  };
  cache.onChange(drawCache);
  drawCache();

  // ---- building a sheet ----
  /** Today's tab bodies carry fixed ids ("vt-rhythm", "alarm-pause-why"), and today's view keeps its own copy in the
   *  document: inside a sheet every id is prefixed `ip2-<sheet>-`, and the references to it inside the sheet (`for`,
   *  `aria-describedby`, `aria-labelledby`, `aria-controls`, `list`, `headers`) follow (IP9 review M2). Run after the
   *  build and after every refresh, which may draw new rows. */
  const reid = (root: HTMLElement, sheet: string) => {
    const pre = `ip2-${sheet}-`;
    const renamed = new Map<string, string>();
    for (const e of root.querySelectorAll<HTMLElement>('[id]')) {
      if (e.id.startsWith(pre) || e.id.startsWith('ip2-sheet-')) continue;
      renamed.set(e.id, pre + e.id);
      e.id = pre + e.id;
    }
    if (!renamed.size) return;
    for (const attr of ['for', 'aria-describedby', 'aria-labelledby', 'aria-controls', 'list', 'headers'])
      for (const e of root.querySelectorAll<HTMLElement>(`[${attr}]`)) {
        const v = (e.getAttribute(attr) as string).split(/\s+/).map((x) => renamed.get(x) ?? x).join(' ');
        e.setAttribute(attr, v);
      }
  };
  const build = (id: string): Built => {
    const def = offered.find((s) => s.id === id) as (typeof SHEETS)[number];
    const many = def.tabs.length > 1;
    const hint = (def.letter ? `${def.letter.toUpperCase()} opens and closes · ` : '') + (many ? '← → change the tab · ' : '') + 'Esc closes';
    const frame = sheetFrame({ id, name: def.name, hint, onClose: () => close() });
    // Esc from a field inside the sheet (keys.ts ignores keys while the user types)
    frame.el.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !isTyping(e)) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    frame.el.tabIndex = -1;
    el.append(frame.el);
    if (id === 'drug') {
      const ds = drugSheet(frame, { link, weightKg: ctx.weightKg, cache });
      return { frame, refresh: ds.refresh, give: ds.give, stage: ds.stage };
    }
    if (id === 'labs' && book) {
      const ls = labsSheet(frame, book);
      offs.push(ls.destroy);
      return { frame, refresh: ls.refresh };
    }
    const refreshers: Array<() => void> = [];
    const pctx: PanelCtx = {
      link, staging: cache, site: ctx.site, weightKg: ctx.weightKg, holds: false,
      onRefresh: (fn) => void refreshers.push(fn),
      goTab: (tab) => (OF_TAB[tab] ? open(...(OF_TAB[tab] as [string, string?])) : close()),
    };
    // each tab's body in its own tab panel, which names its tab (and the tab its panel)
    const panels = new Map(def.tabs.map(([t, , body]) => [t, h('div', { class: 'ip2-sheet-panel', role: 'tabpanel', id: `ip2-sheet-${id}-panel-${t}`, 'aria-labelledby': `ip2-sheet-${id}-tab-${t}` }, body(pctx))]));
    frame.left.append(...panels.values());
    reid(frame.left, id);
    let current = def.tabs[0]?.[0] as string;
    const tab = (t: string) => {
      if (!panels.has(t)) return;
      current = t;
      frame.groups(def.tabs.map(([g, label]) => [g, label]), t, tab);
      for (const b of frame.el.querySelectorAll<HTMLElement>('[role=tab]')) b.setAttribute('aria-controls', `ip2-sheet-${id}-panel-${b.dataset.group}`);
      for (const [g, p] of panels) p.hidden = g !== t;
      frame.left.scrollTop = 0;
    };
    tab(current);
    setText(frame.primary, 'Stage buttons add to the cache; Deliver gives it at one instant');
    frame.primary.classList.add('ip2-sheet-hint');
    const extra = id === 'log' ? marksList(frame.right) : null;
    return { frame, tab, current: () => current, refresh: () => (extra?.(), refreshers.forEach((fn) => fn()), reid(frame.left, id)) };
  };

  /** The Log sheet's marks (answer 13): every saved mark and bookmark (the driver's stage marks are never in the
   *  controller's list), with today's "Return here" (panel/scenario.ts: the same confirm, the same restore command). */
  const marksList = (into: HTMLElement) => {
    const ul = h('ul', { class: 'ip2-marks', 'aria-label': 'Marks' });
    into.append(h('h3', { class: 'ip2-sheet-sub' }, 'Marks'), ul);
    let sig = '';
    return () => {
      const list = link.ctl.bookmarks;
      const s = list.map((b) => `${b}:${MARK_KINDS.get(b) ?? ''}`).join('|');
      if (s === sig) return;
      sig = s;
      ul.replaceChildren(...list.map((b) => h('li', { class: 'ip2-mark-row', 'data-kind': MARK_KINDS.get(b) ?? 'bookmark' },
        h('span', { class: 'ip2-mark-kind' }, MARK_KINDS.get(b) ?? 'bookmark'), h('span', { class: 'ip2-mark-label' }, b),
        h('button', { type: 'button', class: 'ip2-btn', onclick: async () => {
          if (await confirmDialog('Return to this bookmark?', `The patient goes back to "${b}". The clock goes back with it.`, 'Return', false, 'Stay here')) void link.send({ type: 'scenario', action: 'restoreBookmark', target: b });
        } }, 'Return here'))));
      if (!list.length) ul.replaceChildren(h('li', { class: 'ip2-sheet-note' }, 'No marks yet: the three mark buttons in the dock save the moment.'));
    };
  };

  // ---- open and close ----
  const lit = () => {
    for (const b of tools) b.setAttribute('aria-pressed', String(b.dataset.sheet === openId));
  };
  /** Open the sheet `id`, on its tab `tab` when given (an open sheet only changes its tab). */
  const open = (id: string, tab?: string) => {
    if (!offered.some((s) => s.id === id)) return;
    if (openId === id) {
      if (tab) built.get(id)?.tab?.(tab);
      return;
    }
    if (openId) built.get(openId)?.frame.close();
    let b = built.get(id);
    if (!b) built.set(id, (b = build(id)));
    if (tab) b.tab?.(tab);
    b.frame.tray.replaceChildren(trayCount, trayItems, h('span', { class: 'ip2-spacer' }), trayNote);
    b.frame.deliverSlot.replaceChildren(onset.el, deliver);
    openId = lastId = id;
    b.frame.open();
    keys.letter('s', () => b?.stage?.());
    lit();
    b.refresh();
    b.frame.el.focus({ preventScroll: true });
  };
  const close = () => {
    if (!openId) return;
    const b = built.get(openId);
    const had = b?.frame.el.contains(document.activeElement);
    b?.frame.close();
    const tool = tools.find((t) => t.dataset.sheet === openId);
    openId = null;
    keys.letter('s', null);
    lit();
    if (had) tool?.focus({ preventScroll: true });
  };
  /** The tool and its letter: open the sheet on its first tab; on an open sheet, go to its first tab, and close it
   *  when it is already there (brief 208: the Patient tool and V always land on "Vitals & rhythm"). */
  const toggle = (id: string) => {
    const first = offered.find((s) => s.id === id)?.tabs[0]?.[0];
    const b = built.get(id);
    if (openId !== id) return open(id, first);
    if (first && b?.current && b.current() !== first) return b.tab?.(first);
    close();
  };

  for (const s of SHEETS) if (s.letter) keys.letter(s.letter, () => toggle(s.id));
  const offEsc = keys.escape(() => {
    if (!openId) return false;
    close();
    return true;
  });
  // Enter gives now while a sheet is open: not on a control that has its own Enter (a button, a link, a select, a tab,
  // the search box, the note field), not while typing outside the sheet, never twice for one press
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !openId || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || el.closest('[hidden]') || !el.isConnected) return;
    const t = e.target as Element | null;
    if (t?.closest?.('button, a, select, textarea, [role=tab], dialog[open], .ip2-drug-search, .ip2-note-field')) return;
    if (isTyping(e) && !t?.closest?.('.ip2-sheet')) return;
    const give = built.get(openId)?.give;
    if (!give) return;
    e.preventDefault();
    give();
  };
  document.addEventListener('keydown', onKey);
  ctx.openSheet = (id) => open(...(OF_TAB[id] ?? [id]));

  return {
    refresh: () => {
      if (openId) built.get(openId)?.refresh();
    },
    destroy: () => {
      document.removeEventListener('keydown', onKey);
      offEsc();
      for (const s of SHEETS) if (s.letter) keys.letter(s.letter, null);
      keys.letter('s', null);
      for (const off of offs) off();
      book?.destroy();
    },
  };
}
