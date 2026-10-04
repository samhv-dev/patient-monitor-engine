// The instructor panel (research/13 §4.3, brief §7): eight tabs in the order they are used, the staged-changes footer
// (the Stage 6a stage bar grown up: Gaumard UNI's Apply list, SimPad's "Set transition time"), keyboard shortcuts
// (brief §9) and one ≤ 2 Hz repaint. Built only on a Link, so the same panel runs same-screen and as the Remote.
import type { Link } from '../link.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import { Staging } from '../staging.ts';
import { bookmark, shortcutsDialog } from '../commands.ts';
import { button, h, select, tabs, throttle, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';
import { airwayTab } from './airway.ts';
import { defibTab } from './defib.ts';
import { devicesTab } from './devices.ts';
import { drugsTab } from './drugs.ts';
import { logTab } from './log.ts';
import { patientTab } from './patient.ts';
import { scenarioTab } from './scenario.ts';
import { vitalsTab } from './vitals.ts';

export const TABS: ReadonlyArray<[string, string]> = [
  ['scenario', 'Scenario'], ['vitals', 'Vitals & rhythm'], ['drugs', 'Drugs & fluids'], ['airway', 'Airway & ventilation'],
  ['defib', 'Defib, pacing & CPR'], ['devices', 'Devices & alarms'], ['patient', 'Patient'], ['log', 'Log'],
];

export interface PanelHandle {
  el: HTMLElement;
  ctx: PanelCtx;
  staging: Staging;
  select(tab: string): void;
  destroy(): void;
}

const ONSETS: Array<[string, string]> = [['0', 'Now'], ['30', 'Over 30 s'], ['60', 'Over 1 min'], ['120', 'Over 2 min'], ['300', 'Over 5 min']];

export function mountPanel(link: Link, o: { site: SiteProfile; weightKg(): number; loadScenario?(c: ScenarioCard): boolean; tab?: string; onTab?(id: string): void }): PanelHandle {
  const staging = new Staging('panel', (c) => link.send(c));
  const refreshers = new Map<string, Array<() => void>>();
  let building = '';
  const ctx: PanelCtx = {
    link, staging, site: o.site, weightKg: o.weightKg, goTab: (id) => t.select(id),
    onRefresh: (fn) => {
      const list = refreshers.get(building) ?? [];
      list.push(fn);
      refreshers.set(building, list);
    },
    ...(o.loadScenario ? { loadScenario: o.loadScenario } : {}),
  };
  const make = (id: string, fn: (c: PanelCtx) => HTMLElement) => () => {
    building = id;
    const el = fn(ctx);
    building = '';
    return el;
  };
  // ---- repaint: only the visible tab, ≤ 2 Hz ----
  const repaint = throttle(() => {
    for (const fn of refreshers.get(t.current()) ?? []) fn();
  }, 500);
  const t = tabs('Instructor controls', [
    { id: 'scenario', label: 'Scenario', render: make('scenario', scenarioTab) },
    { id: 'vitals', label: 'Vitals & rhythm', render: make('vitals', vitalsTab) },
    { id: 'drugs', label: 'Drugs & fluids', render: make('drugs', drugsTab) },
    { id: 'airway', label: 'Airway & ventilation', render: make('airway', airwayTab) },
    { id: 'defib', label: 'Defib, pacing & CPR', render: make('defib', defibTab) },
    { id: 'devices', label: 'Devices & alarms', render: make('devices', devicesTab) },
    { id: 'patient', label: 'Patient', render: make('patient', patientTab) },
    { id: 'log', label: 'Log', render: make('log', logTab) },
  ], o.tab ?? 'vitals', (id) => {
    o.onTab?.(id);
    repaint();
  });

  // ---- staged-changes footer ----
  const count = h('span', { class: 'count', role: 'status' });
  const list = h('ul', { class: 'staged-list' });
  const onset = select('Onset', ONSETS, '0', (v) => (staging.transitionS = Number(v)));
  onset.el.classList.add('inline');
  const auto = toggle('Apply at once', false, (on) => {
    staging.autoApply = on;
    drawFooter();
  }, 'small');
  const discard = button('Discard', () => staging.discard(), 'ghost');
  const commit = button('Commit', () => void doCommit(), 'primary');
  commit.setAttribute('aria-keyshortcuts', 'Meta+Enter Control+Enter');
  const footer = h('footer', { class: 'stagebar', 'aria-label': 'Staged changes' },
    h('div', { class: 'stagebar-row' }, count, onset.el), list, h('div', { class: 'stagebar-row' }, auto, h('span', { class: 'spacer' }), discard, commit));
  const doCommit = async () => {
    const n = staging.size;
    if (!n) return;
    const r = await staging.commit();
    const refused = r.filter((x) => !x.accepted).length;
    toast(refused ? `${n - refused} of ${n} changes applied; ${refused} refused (see the log)` : n === 1 ? '1 change applied' : `${n} changes applied`);
  };
  const drawFooter = () => {
    const n = staging.size;
    footer.dataset.count = String(n);
    count.textContent = staging.autoApply ? 'Changes apply at once' : n === 0 ? 'No changes staged' : n === 1 ? '1 change staged' : `${n} changes staged`;
    list.replaceChildren(...staging.lines.map((l) => h('li', {}, l)));
    commit.disabled = n === 0;
    discard.disabled = n === 0;
    commit.textContent = n > 1 ? `Commit ${n} changes` : 'Commit';
  };
  staging.onChange(() => {
    drawFooter();
    repaint();
  });
  drawFooter();

  const offLink = link.onChange(repaint);
  const tick = setInterval(repaint, 1000); // onset progress bars and clocks move with sim time even without events

  // ---- keyboard shortcuts (brief §9); never while typing ----
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void doCommit();
      return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey || el.closest('[hidden]')) return;
    const k = e.key;
    const dev = (action: Record<string, unknown>) => void link.send({ type: 'device', action } as never).then((r) => r.accepted && toast(action.action === 'silence' ? 'Alarm sound silenced' : action.action === 'pause' ? 'Alarms paused' : 'NIBP measurement started'));
    if (k === 'S') dev({ device: 'alarm', action: 'silence' });
    else if (k === 'P') dev({ device: 'alarm', action: 'pause' });
    else if (k === 'N') dev({ device: 'nibp', action: 'start' });
    else if (k === 'B') void bookmark(link);
    else if (k === '?') void shortcutsDialog();
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  const el = h('div', { class: 'panel', role: 'region', 'aria-label': 'Instructor panel' }, t.el, footer);
  return {
    el, ctx, staging, select: t.select,
    destroy: () => {
      offLink();
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
    },
  };
}
