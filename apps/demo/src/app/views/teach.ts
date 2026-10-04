// Instructor (research/13 §4.3, brief §8): the same monitor (not a copy) beside the panel on wide screens; on an iPad in
// landscape the panel is a drawer over the monitor (the 6a pattern), in portrait a sheet under it. The session bar
// sits above both.
import type { Link } from '../link.ts';
import { mountPanel, type PanelHandle } from '../panel/panel.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, store } from '../ui.ts';
import type { View } from '../shell.ts';

export function teachView(link: Link, o: { site: SiteProfile; main: HTMLElement; stage: HTMLElement; weightKg(): number; loadScenario(c: ScenarioCard): boolean }): View & { panel: PanelHandle } {
  const panel = mountPanel(link, { site: o.site, weightKg: o.weightKg, loadScenario: o.loadScenario, tab: store.get('tab') ?? 'vitals', onTab: (id) => store.set('tab', id) });
  const drawer = () => (o.main.dataset.drawer === 'open' ? 'closed' : 'open');
  const toggleBtn = button('Instructor panel', () => {
    o.main.dataset.drawer = drawer();
    toggleBtn.setAttribute('aria-expanded', String(o.main.dataset.drawer === 'open'));
  }, 'drawer-toggle');
  toggleBtn.setAttribute('aria-controls', 'teach-panel');
  toggleBtn.setAttribute('aria-expanded', 'true');
  o.main.dataset.drawer = 'open';
  o.stage.append(toggleBtn);
  const el = h('section', { id: 'teach-panel', 'aria-labelledby': 'teach-h' }, h('h1', { id: 'teach-h', class: 'sr-only' }, 'Instructor'), panel.el);
  return { id: 'teach', el, panel, enter: () => (o.main.dataset.panel = o.site.panel) };
}
