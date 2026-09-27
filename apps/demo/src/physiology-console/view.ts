// Stage 7x: the console page controller — header (clock, speed, baseline, filters, export), the actions rail, the
// change log and the organ sections. Plain DOM; one small canvas per sparkline. The engine is reached only through
// ConsoleHost, so the happy-dom test drives it with a real engine on the main thread and the page with mountMonitor.
import type { EngineEvent, PatientSnapshot } from '@pme/engine-core';
import { RHYTHM_IDS } from '@pme/engine-core';
import * as A from './actions.ts';
import { fmtDelta, fmtValue } from './format.ts';
import { ConsoleModel, type Row } from './model.ts';
import { GROUPS, type GroupId } from './organs.ts';
import { drawSpark } from './sparkline.ts';

export interface ConsoleHost {
  dispatch(b: A.Body): Promise<{ accepted: boolean; reason?: string }>;
  on(fn: (e: EngineEvent) => void): () => void;
  snapshot(): Promise<PatientSnapshot>;
  restore(s: PatientSnapshot): Promise<void>;
  /** Remount the monitor with a new patient (profile and mode are engine options). */
  restart(presetId: string, mode: 'manual' | 'modeled'): void;
  timeScale(k: number): void;
  pause(paused: boolean): void;
}

export interface LogEntry {
  t: number;
  kind: 'cmd' | 'mark';
  text: string;
  ok: boolean | null;
  reason?: string;
}

export interface ConsoleHandle {
  readonly model: ConsoleModel;
  readonly log: readonly LogEntry[];
  /** Where the page mounts the monitor. */
  readonly monitorEl: HTMLElement;
  send(b: A.Body): Promise<{ accepted: boolean; reason?: string }>;
  setBaseline(auto?: boolean): Promise<void>;
  resetToBaseline(): Promise<void>;
  exportJSON(): string;
  exportCSV(): string;
  destroy(): void;
}

const SPARK_W = 64;
const SPARK_H = 14;
const opt = (v: string, label = v, sel = false) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const TEMPLATE = `
<header class="pc-bar">
  <strong>Physiology console</strong>
  <span class="pc-t" data-id="t">0:00</span>
  <select data-id="speed" title="Sim speed">${[0.25, 0.5, 1, 2, 4].map((k) => opt(String(k), `×${k}`, k === 1)).join('')}</select>
  <button type="button" data-act="pause">Pause</button>
  <span class="pc-sep"></span>
  <span data-id="base">baseline: pending</span>
  <button type="button" data-act="setBase">Set baseline</button>
  <button type="button" data-act="reset" disabled>Reset to baseline</button>
  <span class="pc-sep"></span>
  <input data-id="filter" type="search" placeholder="filter (path or label)" />
  <label><input type="checkbox" data-id="changed" /> changed only</label>
  <label><input type="checkbox" data-id="internals" /> internals</label>
  <span class="pc-sep"></span>
  <button type="button" data-act="json">JSON</button><button type="button" data-act="csv">CSV</button><button type="button" data-act="copy">Copy</button>
  <span class="pc-stats" data-id="stats"></span>
</header>
<div class="pc-body">
  <div class="pc-left">
    <div class="pc-monitor" data-id="monitor"></div>
    <div class="pc-rail" data-id="rail">
      <fieldset><legend>Drug</legend>
        <input data-f="drug" list="pc-drugs" value="phenylephrine" size="13" />
        <datalist id="pc-drugs">${A.DRUG_IDS.map((d) => opt(d)).join('')}</datalist>
        <input data-f="dose" type="number" value="100" step="any" /> <select data-f="doseUnit">${A.DOSE_UNITS.map((u) => opt(u)).join('')}</select>
        <button type="button" data-act="bolus">Bolus</button>
        <input data-f="rate" type="number" value="0.5" step="any" /> <select data-f="rateUnit">${A.RATE_UNITS.map((u) => opt(u)).join('')}</select>
        <button type="button" data-act="infusion">Infuse</button>
        TCI <input data-f="tciTarget" type="number" value="3" step="any" /> <select data-f="tciMode">${opt('effect')}${opt('plasma')}</select>
        <input data-f="tciModel" list="pc-tci" placeholder="model" size="8" /><datalist id="pc-tci">${A.TCI_MODELS.map((m) => opt(m)).join('')}</datalist>
        <button type="button" data-act="tci">TCI</button>
      </fieldset>
      <fieldset><legend>Vaporiser</legend>
        <select data-f="agent">${A.AGENTS.map((a) => opt(a)).join('')}</select> dial <input data-f="dial" type="number" value="2" step="0.1" /> %
        FGF <input data-f="fgf" type="number" value="2" step="0.5" /> L/min N₂O <input data-f="n2o" type="number" value="0" min="0" max="0.7" step="0.1" />
        <button type="button" data-act="vap">Set</button>
      </fieldset>
      <fieldset><legend>Fluids / bleed / labs</legend>
        <input data-f="fluid" list="pc-fluids" value="crystalloid" size="11" /><datalist id="pc-fluids">${A.FLUID_IDS.map((x) => opt(x)).join('')}</datalist>
        <input data-f="vol" type="number" value="500" /> mL over <input data-f="over" type="number" value="300" /> s
        <button type="button" data-act="fluid">Give</button> <button type="button" data-act="bleed">Bleed</button>
        <select data-f="panel">${opt('abg', 'ABG')}${opt('vbg', 'VBG')}</select> <button type="button" data-act="lab">Send</button>
      </fieldset>
      <fieldset><legend>Condition</legend>
        <input data-f="cond" list="pc-conds" value="tamponade" size="11" /><datalist id="pc-conds">${A.CONDITION_IDS.map((c) => opt(c)).join('')}</datalist>
        severity <input data-f="sev" type="number" value="0.8" min="0" max="1" step="0.1" /> <button type="button" data-act="cond">Apply</button>
      </fieldset>
      <fieldset><legend>Lungs</legend>
        <input data-f="lcond" list="pc-lconds" value="ards" size="11" /><datalist id="pc-lconds">${A.LUNG_CONDITION_IDS.map((c) => opt(c)).join('')}</datalist>
        severity <input data-f="lsev" type="number" value="0.5" min="0" max="1" step="0.1" /> <select data-f="side">${opt('', 'both/none')}${opt('L')}${opt('R')}</select>
        <button type="button" data-act="lcond">Apply</button>
        tube <select data-f="mainstem">${opt('both')}${opt('left')}${opt('right')}</select> <button type="button" data-act="mainstem">Set</button>
        RM <input data-f="rmP" type="number" value="40" /> cmH₂O × <input data-f="rmS" type="number" value="30" /> s <button type="button" data-act="recruit">Recruit</button>
      </fieldset>
      <fieldset><legend>Ventilation</legend>
        <select data-f="src">${['spontaneous', 'ventilator', 'bvm', 'none'].map((s) => opt(s)).join('')}</select>
        RR <input data-f="rr" type="number" value="12" /> VT <input data-f="vt" type="number" value="500" /> PEEP <input data-f="peep" type="number" value="5" />
        FiO₂ <input data-f="fio2" type="number" value="0.5" step="0.05" /> <button type="button" data-act="vent">Set</button>
      </fieldset>
      <fieldset><legend>Rhythm / mode / patient</legend>
        <select data-f="rhythm">${RHYTHM_IDS.map((r) => opt(r)).join('')}</select> <button type="button" data-act="rhythm">Set rhythm</button>
        <select data-f="mode">${opt('modeled', 'MODELED', true)}${opt('manual', 'MANUAL')}</select> <button type="button" data-act="mode">Set mode</button>
        <select data-f="preset">${A.PRESETS.map((p) => opt(p.id, p.label)).join('')}</select> <button type="button" data-act="restart">Restart patient</button>
      </fieldset>
      <fieldset><legend>Raw command (JSON body)</legend>
        <textarea data-f="raw" rows="2">{"type":"applyEvent","event":{"kind":"drug","drugId":"ephedrine","dose":10,"unit":"mg","route":"iv"}}</textarea>
        <button type="button" data-act="raw">Send</button>
      </fieldset>
    </div>
    <ol class="pc-log" data-id="log" aria-label="Change log"></ol>
  </div>
  <main class="pc-organs" data-id="organs"></main>
</div>`;

interface RowEls {
  tr: HTMLTableRowElement;
  v: HTMLElement;
  b: HTMLElement;
  d: HTMLElement;
  cv: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
}

export function mountConsole(root: HTMLElement, host: ConsoleHost, o: { autoBaselineS?: number } = {}): ConsoleHandle {
  const doc = root.ownerDocument;
  root.innerHTML = TEMPLATE;
  const $ = <T extends Element>(id: string) => root.querySelector(`[data-id="${id}"]`) as T;
  const f = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id: string) => root.querySelector(`[data-f="${id}"]`) as T;
  const num = (id: string) => Number(f(id).value);
  const model = new ConsoleModel();
  const log: LogEntry[] = [];
  const autoS = o.autoBaselineS ?? 60;
  let simT = 0;
  /**
   * The page clock after "reset to baseline": 'restoring' while the restore is in flight (every event still arriving
   * is from the discarded timeline, so none moves the clock), 'resync' once it resolved without the restore's
   * toneCancel having arrived (the clock shows the baseline time meanwhile). The restore's toneCancel (no `ids`) or,
   * failing that, the first truth event after the restore resolved sets the clock to the restored timeline;
   * `max(simT, t)` alone would keep the old, later time.
   */
  let clockHold: 'restoring' | 'resync' | null = null;
  let baseSnap: PatientSnapshot | null = null;
  let paused = false;
  let renderMs = 0;

  // --- organ sections ---
  const organs = $<HTMLElement>('organs');
  const sections = new Map<GroupId, { det: HTMLDetailsElement; body: HTMLTableSectionElement; sum: HTMLElement; n: number }>();
  for (const g of GROUPS) {
    const det = doc.createElement('details');
    det.className = 'pc-sec';
    det.dataset.group = g.id;
    det.open = g.id !== 'other' && g.id !== 'controls';
    det.hidden = true;
    det.innerHTML = `<summary>${g.title} <span class="pc-count"></span></summary><table><tbody></tbody></table>`;
    det.addEventListener('toggle', () => det.open && refresh());
    organs.append(det);
    sections.set(g.id, { det, body: det.querySelector('tbody') as HTMLTableSectionElement, sum: det.querySelector('.pc-count') as HTMLElement, n: 0 });
  }
  const els = new Map<string, RowEls>();
  const makeRow = (r: Row): RowEls => {
    const tr = doc.createElement('tr');
    tr.dataset.path = r.path;
    const dot = r.path.lastIndexOf('.');
    tr.innerHTML = `<td class="k" title="${r.path}"><span class="lbl"></span><span class="par"></span></td><td class="v"></td><td class="u"></td><td class="b"></td><td class="d"></td><td class="s"><canvas width="${SPARK_W}" height="${SPARK_H}"></canvas></td>`;
    (tr.querySelector('.lbl') as HTMLElement).textContent = r.meta.label;
    (tr.querySelector('.par') as HTMLElement).textContent = r.meta.rank === Number.POSITIVE_INFINITY && dot > 0 ? r.path.slice(0, dot) : '';
    (tr.querySelector('.u') as HTMLElement).textContent = r.meta.unit;
    const cv = tr.querySelector('canvas') as HTMLCanvasElement;
    return { tr, v: tr.querySelector('.v') as HTMLElement, b: tr.querySelector('.b') as HTMLElement, d: tr.querySelector('.d') as HTMLElement, cv, g: cv.getContext('2d') };
  };
  const setText = (el: HTMLElement, s: string) => {
    if (el.textContent !== s) el.textContent = s;
  };

  function refresh(): void {
    const t0 = performance.now();
    const rows = model.rows();
    const filter = $<HTMLInputElement>('filter').value.trim().toLowerCase();
    const changedOnly = $<HTMLInputElement>('changed').checked;
    const internals = $<HTMLInputElement>('internals').checked;
    const counts = new Map<GroupId, { shown: number; changed: number; total: number; added: boolean }>();
    const live = new Set(rows.map((r) => r.path));
    for (const [path, e] of els) {
      if (live.has(path)) continue; // a path that left the truth tree (a short history, a device switched off)
      e.tr.remove();
      els.delete(path);
    }
    for (const r of rows) {
      const c = counts.get(r.group) ?? { shown: 0, changed: 0, total: 0, added: false };
      counts.set(r.group, c);
      let e = els.get(r.path);
      if (!e) {
        e = makeRow(r);
        els.set(r.path, e);
        c.added = true;
      }
      const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
      setText(e.v, fmtValue(r.value, r.meta));
      setText(e.b, fmtValue(r.base, r.meta));
      setText(e.d, fmtDelta(r.delta, r.meta, ref));
      const cls = r.dir ?? '';
      if (e.tr.className !== cls) e.tr.className = cls;
      const hide = (r.internal && !internals) || (changedOnly && !r.dir) || (filter !== '' && !r.path.toLowerCase().includes(filter) && !r.meta.label.toLowerCase().includes(filter));
      if (e.tr.hidden !== hide) e.tr.hidden = hide;
      c.total++;
      if (!hide) c.shown++;
      if (r.dir && (internals || !r.internal)) c.changed++;
      if (!hide && (sections.get(r.group) as { det: HTMLDetailsElement }).det.open && r.hist.length > 1) {
        drawSpark(e.g, r.hist, SPARK_W, SPARK_H, r.dir === 'down' ? '#5fc8ff' : r.dir === 'up' ? '#ffb347' : '#8a8f98', typeof r.base === 'number' ? r.base : undefined);
      }
    }
    for (const [id, s] of sections) {
      const c = counts.get(id);
      s.det.hidden = !c || c.shown === 0;
      if (!c) continue;
      if (c.added || c.total !== s.n) {
        // new paths: re-append this section's rows in sorted order (appendChild moves existing nodes)
        for (const r of rows) if (r.group === id) s.body.append((els.get(r.path) as RowEls).tr);
        s.n = c.total;
      }
      setText(s.sum, `${c.shown}${c.changed ? ` · ${c.changed} changed` : ''}`);
    }
    renderMs = performance.now() - t0;
    header();
  }

  function header(): void {
    setText($('t'), clock(simT));
    setText($('base'), model.baseT === null ? `baseline: pending (auto at ${clock(autoS)})` : `baseline @ ${clock(model.baseT)}`);
    (root.querySelector('[data-act="reset"]') as HTMLButtonElement).disabled = baseSnap === null;
    const tr = model.truth;
    setText($('stats'), `${model.cur.size} values · truth ${tr.leaves} leaves ${(tr.bytes / 1024).toFixed(1)} KB${tr.truncated ? ' TRUNCATED' : ''} · render ${renderMs.toFixed(1)} ms`);
  }

  function renderLog(): void {
    const ol = $<HTMLOListElement>('log');
    ol.replaceChildren(
      ...log.map((e) => {
        const li = doc.createElement('li');
        li.dataset.kind = e.kind;
        li.className = e.ok === null ? 'pending' : e.ok ? 'ok' : 'rej';
        li.innerHTML = '<time></time> <span></span> <em></em>';
        (li.children[0] as HTMLElement).textContent = clock(e.t);
        (li.children[1] as HTMLElement).textContent = e.text;
        (li.children[2] as HTMLElement).textContent = e.ok === false ? `rejected: ${e.reason ?? ''}` : '';
        return li;
      }),
    );
  }
  const mark = (text: string, t = simT) => {
    log.unshift({ t, kind: 'mark', text, ok: true });
    renderLog();
  };

  async function send(b: A.Body) {
    const entry: LogEntry = { t: simT, kind: 'cmd', text: A.describe(b), ok: null };
    log.unshift(entry);
    renderLog();
    const r = await host.dispatch(b).catch((err: unknown) => ({ accepted: false, reason: String(err) }));
    entry.ok = r.accepted;
    if (r.reason !== undefined) entry.reason = r.reason;
    renderLog();
    return r;
  }

  async function setBaseline(auto = false): Promise<void> {
    model.setBaseline();
    if (!auto) mark(`baseline set @ ${clock(model.baseT ?? 0)}`);
    baseSnap = await host.snapshot(); // taken within a frame of the baseline values (the worker answers asynchronously)
    refresh();
  }
  async function resetToBaseline(): Promise<void> {
    if (!baseSnap || model.baseT === null) return;
    const baseT = model.baseT;
    clockHold = 'restoring';
    await host.restore(baseSnap);
    if (clockHold === 'restoring') {
      clockHold = 'resync'; // show the restored time now; stale events still arriving do not move it
      simT = baseT;
    }
    model.clearHistory();
    mark(`reset to baseline @ ${clock(baseT)}`, baseT);
    refresh();
  }

  const off = host.on((e) => {
    const t = (e as { t?: unknown }).t;
    if (clockHold !== null && e.type === 'toneCancel' && !e.ids) {
      simT = e.after; // the restore's timeline boundary
      clockHold = null;
    } else if (clockHold === 'resync' && e.type === 'truth') {
      simT = e.t;
      clockHold = null;
    } else if (clockHold === null && typeof t === 'number' && e.type !== 'tone') simT = Math.max(simT, t);
    if (!model.ingest(e)) return;
    if (model.base === null && model.t >= autoS) void setBaseline(true);
    else refresh();
  });

  const download = (name: string, text: string, type: string) => {
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportJSON = () => JSON.stringify(model.toJSON(), null, 1);
  const stamp = () => `pme-console-t${Math.round(model.t)}`;
  const acts: Record<string, () => void> = {
    pause: () => {
      paused = !paused;
      host.pause(paused);
      (root.querySelector('[data-act="pause"]') as HTMLElement).textContent = paused ? 'Resume' : 'Pause';
    },
    setBase: () => void setBaseline(),
    reset: () => void resetToBaseline(),
    json: () => download(`${stamp()}.json`, exportJSON(), 'application/json'),
    csv: () => download(`${stamp()}.csv`, model.toCSV(), 'text/csv'),
    copy: () => void navigator.clipboard?.writeText(exportJSON()).catch(() => undefined),
    bolus: () => void send(A.bolus(f('drug').value.trim(), num('dose'), f('doseUnit').value)),
    infusion: () => void send(A.infusion(f('drug').value.trim(), num('rate'), f('rateUnit').value)),
    tci: () => void send(A.tci(f('drug').value.trim(), num('tciTarget'), f('tciMode').value as 'effect' | 'plasma', f('tciModel').value.trim())),
    vap: () => void send(A.vaporiser(f('agent').value, num('dial'), num('fgf'), num('n2o'))),
    fluid: () => void send(A.fluid(f('fluid').value.trim(), num('vol'), num('over'))),
    bleed: () => void send(A.bleed(num('vol'), num('over'))),
    lab: () => void send(A.lab(f('panel').value as 'abg' | 'vbg')),
    cond: () => void send(A.condition(f('cond').value.trim(), num('sev'))),
    lcond: () => void send(A.lungCondition(f('lcond').value.trim(), num('lsev'), f('side').value as '' | 'L' | 'R')),
    mainstem: () => void send(A.mainstem(f('mainstem').value as 'both' | 'left' | 'right')),
    recruit: () => void send(A.recruit(num('rmP'), num('rmS'))),
    vent: () => void send(A.ventilation(f('src').value, num('rr'), num('vt'), num('peep'), num('fio2'))),
    rhythm: () => void send(A.rhythm(f('rhythm').value)),
    mode: () => void send(A.setMode(f('mode').value as 'manual' | 'modeled')),
    restart: () => {
      host.restart(f('preset').value, f('mode').value as 'manual' | 'modeled');
      model.clear();
      baseSnap = null;
      simT = 0;
      clockHold = null;
      for (const e of els.values()) e.tr.remove();
      els.clear();
      for (const s of sections.values()) s.n = 0;
      mark(`restart: ${f('preset').value}, ${f('mode').value.toUpperCase()}`);
      refresh();
    },
    raw: () => {
      try {
        void send(JSON.parse(f('raw').value) as A.Body);
      } catch (err) {
        log.unshift({ t: simT, kind: 'cmd', text: 'raw command', ok: false, reason: `bad JSON: ${String(err)}` });
        renderLog();
      }
    },
  };
  const onClick = (ev: Event) => {
    const act = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act) acts[act]?.();
  };
  root.addEventListener('click', onClick);
  $<HTMLSelectElement>('speed').addEventListener('change', (ev) => host.timeScale(Number((ev.target as HTMLSelectElement).value)));
  for (const id of ['filter', 'changed', 'internals']) $(id).addEventListener('input', refresh);
  header();

  return {
    model,
    log,
    monitorEl: $<HTMLElement>('monitor'),
    send,
    setBaseline,
    resetToBaseline,
    exportJSON,
    exportCSV: () => model.toCSV(),
    destroy() {
      off();
      root.removeEventListener('click', onClick);
      root.replaceChildren();
    },
  };
}
