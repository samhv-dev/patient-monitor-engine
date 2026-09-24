// The same-screen hidden instructor panel (R7; BUILD-PLAN Stage 6): a drawer over the monitor, revealed by
// `i`, Ctrl+Shift+I, a 5-tap top-left corner or a three-finger long-press. Tabs: Controls (generated from the
// vocabulary, with stage-then-commit), Log (commands, acks, alarms, notes/markers), Bookmarks (snapshot/restore).
import type { ControllerSession } from '../session/controller-session.ts';
import type { CommandInput } from '../protocol.ts';
import type { Vocabulary } from '../vocabulary.ts';
import { renderControls } from './render-controls.ts';
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
}

export interface PanelHandle {
  readonly el: HTMLElement;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
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
    <div class="pme-tabs" role="tablist">
      <button type="button" role="tab" data-tab="controls" aria-selected="true">Controls</button>
      <button type="button" role="tab" data-tab="log" aria-selected="false">Log</button>
      <button type="button" role="tab" data-tab="bookmarks" aria-selected="false">Bookmarks</button>
    </div>
    <div class="pme-body" data-pane="controls"></div>
    <div class="pme-body" data-pane="log" hidden>
      <div class="pme-row"><input name="note" placeholder="Note / marker" /><button type="button" data-action="note">Mark</button></div>
      <ul class="pme-log"></ul>
    </div>
    <div class="pme-body" data-pane="bookmarks" hidden>
      <div class="pme-row"><input name="bookmark" placeholder="Label (optional)" /><button type="button" data-action="bookmark">Bookmark now</button></div>
      <ul class="pme-log pme-bookmarks"></ul>
    </div>
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
  const controls = renderControls(q('[data-pane=controls]'), o.vocabulary, { submit }, { mode: s.state?.mode ?? 'manual' });

  const logList = q<HTMLUListElement>('[data-pane=log] .pme-log');
  const marks = q<HTMLUListElement>('.pme-bookmarks');
  const status = q<HTMLElement>('.pme-status');
  const fmtT = (t: number | null) => (t === null ? '--:--' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
  const render = () => {
    controls.update(s.state, s.measurements);
    status.textContent = `${s.status}${s.hostOnline ? '' : ' · no host'}${s.pendingCount ? ` · ${s.pendingCount} pending` : ''}`;
    status.dataset.ok = String(s.status === 'open' && s.hostOnline);
    logList.replaceChildren(
      ...s.log.slice(-LOG_SHOWN).reverse().map((e) => {
        const li = doc.createElement('li');
        li.dataset.kind = e.kind;
        li.textContent = `${fmtT(e.simT)} ${e.kind} ${e.text}`;
        return li;
      }),
    );
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
    );
  };
  const offChange = s.onChange(render);
  render();

  drawer.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    const tab = b.getAttribute('data-tab');
    if (tab) {
      for (const t of drawer.querySelectorAll('[data-tab]')) t.setAttribute('aria-selected', String(t === b));
      for (const p of drawer.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== tab;
      return;
    }
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
      drawer.remove();
    },
  };
  return handle;
}
