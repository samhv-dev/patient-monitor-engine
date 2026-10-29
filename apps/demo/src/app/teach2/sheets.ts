// Instructor v2, the sheets slot (design §3.6, §4; board "Proposal v11"; plan IP7; answers 11, 13–16). It fills the
// dock's Tools (one button per sheet, the open one lit, and "Staged · n") and its note field, and slides the sheets up
// over ACTION, one at a time. The Drug sheet is drug-sheet.ts; Airway, Vitals, Defib · CPR, Devices, Patient and Log
// mount today's tab bodies unmodified (panel/*.ts), each with its own PanelCtx whose staging is the view's one cache
// (answer 14), so their Stage buttons fill the same cache the Drug sheet does. Gas is not built; there is no CPR
// takeover (answer 15). A sheet is built the first time it opens (so today's view's locators never meet a second copy
// of its tab bodies in the DOM until the instructor opens one here) and keeps its state: it reopens on its last item.
//
// Keys (answer 16; keys.ts): D opens and closes the Drug sheet, A Airway, F Defib · CPR, V Vitals; Esc closes the open
// sheet (also from a field inside it); while a sheet is open, Enter gives now and S adds to the cache. Deliver has no
// key. The note field: Enter writes a note; a mark takes the field's text as its note and clears it (dock.ts).
import './sheets.css';
import { isTyping } from '@pme/controller';
import { airwayTab } from '../panel/airway.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { defibTab } from '../panel/defib.ts';
import { devicesTab } from '../panel/devices.ts';
import { logTab } from '../panel/log.ts';
import { patientTab } from '../panel/patient.ts';
import { vitalsTab } from '../panel/vitals.ts';
import { confirmDialog, h, setText, toast } from '../ui.ts';
import { Cache } from './cache.ts';
import type { Slot, Teach2Ctx } from './ctx.ts';
import { MARK_KINDS } from './dock.ts';
import { drugSheet } from './drug-sheet.ts';
import { sheetFrame, type SheetFrame } from './sheet.ts';

/** The sheets in the dock's order: id, the dock's name, its letter ('' = none), the group tab (today's tab name). */
export const SHEETS: ReadonlyArray<{ id: string; name: string; letter: string; group: string; body?: (c: PanelCtx) => HTMLElement }> = [
  { id: 'drug', name: 'Drug', letter: 'd', group: '' },
  { id: 'airway', name: 'Airway', letter: 'a', group: 'Airway & ventilation', body: airwayTab },
  { id: 'defib', name: 'Defib · CPR', letter: 'f', group: 'Defib, pacing & CPR', body: defibTab },
  { id: 'vitals', name: 'Vitals', letter: 'v', group: 'Vitals & rhythm', body: vitalsTab },
  { id: 'devices', name: 'Devices', letter: '', group: 'Devices & alarms', body: devicesTab },
  { id: 'patient', name: 'Patient', letter: '', group: 'Patient', body: patientTab },
  { id: 'log', name: 'Log', letter: '', group: 'Log', body: logTab },
];
/** Today's tab ids (a tab body's `goTab`) to the sheet that holds them; the Scenario tab is ACTION (the sheet closes). */
const OF_TAB: Readonly<Record<string, string>> = { drugs: 'drug', airway: 'airway', defib: 'defib', vitals: 'vitals', devices: 'devices', patient: 'patient', log: 'log' };

interface Built {
  frame: SheetFrame;
  refresh(): void;
  give?(): void;
  stage?(): void;
}

/** Mount this slot into `el` (the fixed slot signature, teach2/ctx.ts). */
export function mount(el: HTMLElement, ctx: Teach2Ctx): Slot {
  const { link, keys } = ctx;
  const cache = new Cache(link);
  const built = new Map<string, Built>();
  let openId: string | null = null;
  let lastId = 'drug';

  // ---- the shared tray and Deliver (moved into the open sheet) ----
  const trayCount = h('span', { class: 'ip2-tray-count' });
  const trayItems = h('span', { class: 'ip2-tray-items', role: 'list', 'aria-label': 'Staged items' });
  const trayNote = h('span', { class: 'ip2-sheet-note' }, 'delivered at one instant, one line in the log');
  const deliver = h('button', { type: 'button', class: 'ip2-deliver', onclick: () => void cache.commit() });

  // ---- the dock: tools, Staged · n, the note field ----
  const tools = SHEETS.map((s) => h('button', {
    type: 'button', class: 'ip2-dock-btn ip2-tool', 'data-sheet': s.id, 'aria-pressed': 'false', 'aria-keyshortcuts': s.letter ? s.letter.toUpperCase() : undefined,
    title: s.letter ? `${s.name} (${s.letter.toUpperCase()})` : s.name, onclick: () => toggle(s.id),
  }, s.name));
  const staged = h('button', { type: 'button', class: 'ip2-dock-btn ip2-staged', 'aria-label': 'Staged items: open the sheet', onclick: () => open(lastId) });
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
  };
  cache.onChange(drawCache);
  drawCache();

  // ---- building a sheet ----
  const build = (id: string): Built => {
    const def = SHEETS.find((s) => s.id === id) as (typeof SHEETS)[number];
    const hint = def.letter ? `${def.letter.toUpperCase()} opens and closes · Esc closes` : 'Esc closes';
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
    const refreshers: Array<() => void> = [];
    const pctx: PanelCtx = {
      link, staging: cache, site: ctx.site, weightKg: ctx.weightKg,
      onRefresh: (fn) => void refreshers.push(fn),
      goTab: (tab) => (OF_TAB[tab] ? open(OF_TAB[tab] as string) : close()),
    };
    frame.groups([[id, def.group]], id, () => undefined);
    frame.left.append((def.body as (c: PanelCtx) => HTMLElement)(pctx));
    setText(frame.primary, 'Stage buttons add to the cache; Deliver gives it at one instant');
    frame.primary.classList.add('ip2-sheet-hint');
    const extra = id === 'log' ? marksList(frame.right) : null;
    return { frame, refresh: () => (extra?.(), refreshers.forEach((fn) => fn())) };
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
  const open = (id: string) => {
    if (!SHEETS.some((s) => s.id === id)) return;
    if (openId === id) return;
    if (openId) built.get(openId)?.frame.close();
    let b = built.get(id);
    if (!b) built.set(id, (b = build(id)));
    b.frame.tray.replaceChildren(trayCount, trayItems, h('span', { class: 'ip2-spacer' }), trayNote);
    b.frame.deliverSlot.replaceChildren(deliver);
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
  const toggle = (id: string) => (openId === id ? close() : open(id));

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
  ctx.openSheet = (id) => open(OF_TAB[id] ?? id);

  return {
    refresh: () => {
      if (openId) built.get(openId)?.refresh();
    },
    destroy: () => {
      document.removeEventListener('keydown', onKey);
      offEsc();
      for (const s of SHEETS) if (s.letter) keys.letter(s.letter, null);
      keys.letter('s', null);
    },
  };
}
