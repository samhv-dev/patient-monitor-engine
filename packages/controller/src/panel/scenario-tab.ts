// The instructor panel's Scenario tab (Stage 6b): load (built-in list, file, URL), the current state and time in
// it, the current state's transitions with their conditions and a Press/Force button each, goto, pause/resume,
// and a timeline of states with authored jump points. Reads ControllerSession.scenario (a ScenarioView); every
// action is a `scenario` command to the host, which validates and runs it.
import type { ControllerSession } from '../session/controller-session.ts';
import type { CommandInput } from '../protocol.ts';

export interface ScenarioTabOptions {
  session: ControllerSession;
  /** Built-in scenarios the host offers (ids it can load by `target`). */
  catalogue?: Array<{ id: string; title: string }>;
}

export interface ScenarioTab {
  /** Refresh from the session (the panel calls this on every session change). */
  update(): void;
}

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function mountScenarioTab(el: HTMLElement, o: ScenarioTabOptions): ScenarioTab {
  const doc = el.ownerDocument;
  const s = o.session;
  const view = s.scenario;
  el.innerHTML = `
    <section class="pme-section">
      <h3>Load scenario</h3>
      <div class="pme-row"><select name="scenario-builtin"></select><button type="button" data-action="scenario-load-builtin">Load</button></div>
      <div class="pme-row"><input type="file" name="scenario-file" accept=".json,application/json" /></div>
      <div class="pme-row"><input name="scenario-url" placeholder="https://…/scenario.json" /><button type="button" data-action="scenario-load-url">Load URL</button></div>
      <div class="pme-scn-error" role="alert"></div>
    </section>
    <section class="pme-section pme-scn-live" hidden>
      <h3 class="pme-scn-title"></h3>
      <div class="pme-row"><strong class="pme-scn-state"></strong><span class="pme-scn-clock"></span></div>
      <div class="pme-row">
        <button type="button" data-action="scenario-pause">Pause scenario</button>
        <button type="button" data-action="scenario-resume">Resume scenario</button>
      </div>
      <p class="pme-scn-notes"></p>
      <h3>Next</h3>
      <ul class="pme-scn-next"></ul>
      <h3>Go to state</h3>
      <div class="pme-row"><select name="scenario-goto"></select><button type="button" data-action="scenario-goto">Go</button></div>
      <h3>Timeline</h3>
      <ol class="pme-scn-states"></ol>
    </section>`;
  const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;
  const option = (label: string, value: string) => {
    const opt = doc.createElement('option');
    opt.value = value;
    opt.textContent = label;
    return opt;
  };
  const builtin = q<HTMLSelectElement>('select[name=scenario-builtin]');
  for (const c of o.catalogue ?? []) builtin.append(option(c.title, c.id));
  builtin.disabled = !o.catalogue?.length;
  const err = q<HTMLElement>('.pme-scn-error');
  const send = (c: CommandInput) => {
    err.textContent = '';
    void s.send(c).then(
      (r) => {
        if (!r.accepted) err.textContent = r.reason ?? 'refused';
      },
      () => undefined,
    );
  };
  const loadDoc = (value: unknown) => send({ type: 'scenario', action: 'load', doc: value });

  q<HTMLInputElement>('input[name=scenario-file]').addEventListener('change', (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    void f.text().then((text) => {
      try {
        loadDoc(JSON.parse(text));
      } catch (e) {
        err.textContent = `${f.name}: not JSON (${(e as Error).message})`;
      }
    });
  });

  el.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    switch (b.dataset.action) {
      case 'scenario-load-builtin':
        if (builtin.value) send({ type: 'scenario', action: 'load', target: builtin.value });
        return;
      case 'scenario-load-url': {
        const url = q<HTMLInputElement>('input[name=scenario-url]').value.trim();
        if (!url) return;
        void globalThis
          .fetch(url)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then(loadDoc, (e: Error) => (err.textContent = `${url}: ${e.message}`));
        return;
      }
      case 'scenario-pause':
      case 'scenario-resume':
        send({ type: 'scenario', action: b.dataset.action === 'scenario-pause' ? 'pause' : 'resume' });
        return;
      case 'scenario-goto':
        send({ type: 'scenario', action: 'goto', target: q<HTMLSelectElement>('select[name=scenario-goto]').value });
        return;
      case 'scenario-trigger':
      case 'scenario-jump':
        send({ type: 'scenario', action: b.dataset.action === 'scenario-trigger' ? 'trigger' : 'goto', target: b.dataset.target as string });
        return;
    }
  });

  let shownDoc = -1;
  let shownState: string | null = null;
  let shownHistory = -1;
  const rebuildDoc = () => {
    const d = view.doc;
    if (!d) return;
    q<HTMLElement>('.pme-scn-title').textContent = d.title;
    const gotoSel = q<HTMLSelectElement>('select[name=scenario-goto]');
    gotoSel.replaceChildren(...d.states.map((st) => option(st.label ?? st.id, st.id)));
  };
  const rebuildState = () => {
    const cur = view.current();
    q<HTMLElement>('.pme-scn-state').textContent = view.stateLabel();
    q<HTMLElement>('.pme-scn-notes').textContent = cur?.notes ?? '';
    q<HTMLUListElement>('.pme-scn-next').replaceChildren(
      ...view.next().map((n) => {
        const li = doc.createElement('li');
        li.dataset.transition = n.id;
        const b = doc.createElement('button');
        b.type = 'button';
        b.dataset.action = 'scenario-trigger';
        b.dataset.target = n.id;
        b.textContent = n.manual ? n.manual : 'Force';
        const text = doc.createElement('span');
        text.textContent = ` ${n.label}: ${n.text}`;
        li.append(b, text);
        return li;
      }),
    );
  };
  const rebuildTimeline = () => {
    const d = view.doc;
    if (!d) return;
    const visits = new Map<string, number>();
    for (const h of view.history) if (!h.transitionId?.endsWith(':else')) visits.set(h.stateId, h.t);
    q<HTMLOListElement>('.pme-scn-states').replaceChildren(
      ...d.states.map((st) => {
        const li = doc.createElement('li');
        li.dataset.state = st.id;
        if (st.id === view.stateId) li.setAttribute('aria-current', 'step');
        const at = visits.get(st.id);
        li.textContent = `${st.label ?? st.id}${at !== undefined ? ` · ${fmt(at)}` : ''}`;
        for (const bm of (d.bookmarks ?? []).filter((x) => x.state === st.id)) {
          const b = doc.createElement('button');
          b.type = 'button';
          b.dataset.action = 'scenario-jump';
          b.dataset.target = bm.state;
          b.textContent = `↦ ${bm.label ?? bm.id}`;
          li.append(' ', b);
        }
        return li;
      }),
    );
  };

  const update = () => {
    const live = q<HTMLElement>('.pme-scn-live');
    live.hidden = !view.doc;
    if (!view.doc) return;
    if (shownDoc !== view.docVersion) {
      shownDoc = view.docVersion;
      shownState = null;
      rebuildDoc();
    }
    if (shownState !== view.stateId) {
      shownState = view.stateId;
      rebuildState();
    }
    if (shownHistory !== view.history.length || shownState === null) {
      shownHistory = view.history.length;
      rebuildTimeline();
    }
    const tin = s.simT === null ? 0 : view.timeInState(s.simT);
    q<HTMLElement>('.pme-scn-clock').textContent = ` · ${fmt(tin)} in state${view.paused ? ' · scenario paused' : ''}`;
  };
  update();
  return { update };
}
