// The same-screen hidden instructor panel (R7; BUILD-PLAN Stage 6): a drawer over the monitor, revealed by
// `i`, Ctrl+Shift+I, a 5-tap top-left corner or a three-finger long-press. Tabs: Controls (generated from the
// vocabulary, with stage-then-commit), Log (commands, acks, alarms, notes/markers), Bookmarks (snapshot/restore),
// Scenario (Stage 6b). FU-1: every tab — built-in or a host page's own (e.g. a Device tab) — is a PanelTab added
// through registerTab().
import type { ControllerSession } from '../session/controller-session.ts';
import type { CommandInput } from '../protocol.ts';
import type { Vocabulary } from '../vocabulary.ts';
import { renderControls } from './render-controls.ts';
import { mountScenarioTab } from './scenario-tab.ts';
import { attachReveal, RevealGesture, type RevealOptions } from './reveal.ts';
import { StageBuffer } from './staging.ts';
import { injectStyles } from './styles.ts';

export interface PanelOptions {
  session: ControllerSession;
  vocabulary: Vocabulary;
  /** Host-local sound switch (same screen only; a remote has no speaker to switch). */
  sound?: { enable(): Promise<void> };
  startOpen?: boolean;
  reveal?: Partial<RevealOptions>;
  /** Window to listen on for the reveal gestures (default: the element's window). */
  win?: Window;
  /** Built-in scenarios the host can load by id (Stage 6b Scenario tab). */
  scenarios?: Array<{ id: string; title: string }>;
  /** Extra tabs registered at mount, after the built-ins (same as calling registerTab). */
  tabs?: PanelTab[];
}

/** What a tab's render() gets besides its pane. */
export interface PanelTabContext {
  session: ControllerSession;
  /** Send now (fire and forget: the ack lands in the Log). */
  send(c: CommandInput): void;
  /** Send, or stage it when "Stage changes" is ticked (`key`: a later staged command with the same key replaces it). */
  submit(c: CommandInput, key: string): void;
}

/** A panel tab (FU-1). render() fills the tab's pane once; update() runs on every session change. */
export interface PanelTab {
  id: string;
  title: string;
  render(el: HTMLElement, ctx: PanelTabContext): void | { update?(): void; destroy?(): void };
  /** Insert before this tab id (default: last). */
  before?: string;
}

export interface PanelHandle {
  readonly el: HTMLElement;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
  /** Add a tab; returns a function that removes it. Throws on a duplicate id. */
  registerTab(tab: PanelTab): () => void;
  /** Show a tab by id. */
  selectTab(id: string): void;
  /** Tab ids in display order. */
  readonly tabs: string[];
}

const LOG_SHOWN = 200;

export function mountInstructorPanel(parent: HTMLElement, o: PanelOptions): PanelHandle {
  const doc = parent.ownerDocument;
  const win = o.win ?? (doc.defaultView as Window);
  injectStyles(doc);
  const drawer = doc.createElement('aside');
  drawer.className = 'pme-drawer';
  drawer.setAttribute('aria-label', 'Instructor panel');
  drawer.dataset.open = String(!!o.startOpen);
  drawer.innerHTML = `
    <header><h2>Instructor</h2><span class="pme-status" data-ok="true"></span>
      <button type="button" data-action="close" aria-label="Close panel">✕</button></header>
    <div class="pme-tabs" role="tablist"></div>
    <div class="pme-panes"></div>
    <div class="pme-stagebar" data-count="0">
      <label><input type="checkbox" name="stage" /> Stage changes</label>
      <span class="pme-staged">0 staged</span>
      <button type="button" class="pme-commit" data-action="commit">Commit</button>
      <button type="button" data-action="discard">Discard</button>
      ${o.sound ? '<button type="button" data-action="sound">Sound on</button>' : ''}
    </div>`;
  parent.append(drawer);
  const q = <T extends Element>(sel: string) => drawer.querySelector(sel) as T;

  const s = o.session;
  /** Fire and forget: the ack lands in the log; a send cut short by close() is not an error. */
  const fire = (c: CommandInput) => void s.send(c).catch(() => undefined);
  const stage = new StageBuffer(s.peerId);
  const stageBox = q<HTMLInputElement>('input[name=stage]');
  const stagebar = q<HTMLElement>('.pme-stagebar');
  const refreshStage = () => {
    stagebar.dataset.count = String(stage.size);
    q<HTMLElement>('.pme-staged').textContent = `${stage.size} staged`;
  };
  const submit = (c: CommandInput, key: string) => {
    if (stageBox.checked) {
      stage.stage(c, key);
      refreshStage();
    } else fire(c);
  };
  const fmtT = (t: number | null) => (t === null ? '--:--' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
  const ctx: PanelTabContext = { session: s, send: fire, submit };

  // --- tabs (FU-1 registration API) ---
  const tablist = q<HTMLElement>('.pme-tabs');
  const panes = q<HTMLElement>('.pme-panes');
  type Live = { tab: PanelTab; button: HTMLButtonElement; pane: HTMLElement; update?: () => void; destroy?: () => void };
  const live: Live[] = [];
  const selectTab = (id: string) => {
    if (!live.some((l) => l.tab.id === id)) throw new Error(`no panel tab "${id}"`);
    for (const l of live) {
      l.button.setAttribute('aria-selected', String(l.tab.id === id));
      l.pane.hidden = l.tab.id !== id;
    }
  };
  const registerTab = (tab: PanelTab): (() => void) => {
    if (live.some((l) => l.tab.id === tab.id)) throw new Error(`panel tab "${tab.id}" is already registered`);
    const button = doc.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.dataset.tab = tab.id;
    button.textContent = tab.title;
    const pane = doc.createElement('div');
    pane.className = 'pme-body';
    pane.dataset.pane = tab.id;
    const at = tab.before === undefined ? -1 : live.findIndex((l) => l.tab.id === tab.before);
    const next = at >= 0 ? (live[at] as Live) : null;
    tablist.insertBefore(button, next?.button ?? null);
    panes.insertBefore(pane, next?.pane ?? null);
    const r = tab.render(pane, ctx) ?? {};
    const entry: Live = { tab, button, pane, ...(r.update ? { update: r.update } : {}), ...(r.destroy ? { destroy: r.destroy } : {}) };
    live.splice(at >= 0 ? at : live.length, 0, entry);
    const selected = live.find((l) => l.button.getAttribute('aria-selected') === 'true');
    selectTab((selected ?? (live[0] as Live)).tab.id);
    entry.update?.();
    return () => {
      const i = live.indexOf(entry);
      if (i < 0) return;
      live.splice(i, 1);
      entry.destroy?.();
      button.remove();
      pane.remove();
      if (button.getAttribute('aria-selected') === 'true' && live.length > 0) selectTab((live[0] as Live).tab.id);
    };
  };

  registerTab({
    id: 'controls',
    title: 'Controls',
    render: (el) => {
      const controls = renderControls(el, o.vocabulary, { submit }, { mode: s.state?.mode ?? 'manual' });
      return { update: () => controls.update(s.state, s.measurements, { rhythm: s.rhythm }) };
    },
  });
  registerTab({
    id: 'log',
    title: 'Log',
    render: (el) => {
      el.innerHTML = `<div class="pme-row"><input name="note" placeholder="Note / marker" /><button type="button" data-action="note">Mark</button></div>
      <ul class="pme-log"></ul>`;
      const list = el.querySelector('.pme-log') as HTMLUListElement;
      return {
        update: () =>
          list.replaceChildren(
            ...s.log.slice(-LOG_SHOWN).reverse().map((e) => {
              const li = doc.createElement('li');
              li.dataset.kind = e.kind;
              li.textContent = `${fmtT(e.simT)} ${e.kind} ${e.text}`;
              return li;
            }),
          ),
      };
    },
  });
  registerTab({
    id: 'bookmarks',
    title: 'Bookmarks',
    render: (el) => {
      el.innerHTML = `<div class="pme-row"><input name="bookmark" placeholder="Label (optional)" /><button type="button" data-action="bookmark">Bookmark now</button></div>
      <ul class="pme-log pme-bookmarks"></ul>`;
      const marks = el.querySelector('.pme-bookmarks') as HTMLUListElement;
      return {
        update: () =>
          marks.replaceChildren(
            ...s.bookmarks.map((label) => {
              const li = doc.createElement('li');
              const b = doc.createElement('button');
              b.type = 'button';
              b.dataset.action = 'restore';
              b.textContent = 'Restore';
              b.addEventListener('click', () => fire({ type: 'scenario', action: 'restoreBookmark', target: label }));
              li.append(b, doc.createTextNode(` ${label}`));
              return li;
            }),
          ),
      };
    },
  });
  registerTab({
    id: 'scenario',
    title: 'Scenario',
    render: (el) => {
      const tab = mountScenarioTab(el, { session: s, ...(o.scenarios ? { catalogue: o.scenarios } : {}) });
      return { update: () => tab.update() };
    },
  });
  for (const t of o.tabs ?? []) registerTab(t);

  const status = q<HTMLElement>('.pme-status');
  const render = () => {
    for (const l of live) l.update?.();
    status.textContent = `${s.status}${s.hostOnline ? '' : ' · no host'}${s.pendingCount ? ` · ${s.pendingCount} pending` : ''}`;
    status.dataset.ok = String(s.status === 'open' && s.hostOnline);
  };
  const offChange = s.onChange(render);
  render();

  drawer.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    const tab = b.getAttribute('data-tab');
    if (tab && b.parentElement === tablist) return selectTab(tab);
    switch (b.dataset.action) {
      case 'close':
        return handle.close();
      case 'commit':
        void stage.commit((c) => s.send(c)).catch(() => undefined);
        return refreshStage();
      case 'discard':
        stage.discard();
        return refreshStage();
      case 'note': {
        const i = q<HTMLInputElement>('input[name=note]');
        s.note(i.value.trim() || 'marker');
        i.value = '';
        return;
      }
      case 'bookmark': {
        const i = q<HTMLInputElement>('input[name=bookmark]');
        const label = i.value.trim();
        fire({ type: 'scenario', action: 'bookmark', ...(label ? { target: label } : {}) });
        i.value = '';
        return;
      }
      case 'sound':
        void o.sound?.enable().then(() => (b.textContent = 'Sound enabled'));
        return;
    }
  });

  const gesture = new RevealGesture(() => handle.toggle(), o.reveal);
  const detach = attachReveal(win, gesture);
  const handle: PanelHandle = {
    el: drawer,
    get isOpen() {
      return drawer.dataset.open === 'true';
    },
    open: () => void (drawer.dataset.open = 'true'),
    close: () => void (drawer.dataset.open = 'false'),
    toggle: () => void (drawer.dataset.open = String(drawer.dataset.open !== 'true')),
    destroy() {
      detach();
      offChange();
      for (const l of live.splice(0)) l.destroy?.();
      drawer.remove();
    },
    registerTab: (tab) => {
      const off = registerTab(tab);
      render();
      return off;
    },
    selectTab,
    get tabs() {
      return live.map((l) => l.tab.id);
    },
  };
  return handle;
}
