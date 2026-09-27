// @vitest-environment happy-dom
// FU-1 item 5 (requests from Stage 4b and 6b): the instructor panel's tab-registration API. Controls, Log, Bookmarks
// and Scenario are themselves registered through it; a host page plugs in its own tabs (e.g. a Device tab).
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel, type PanelTab } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

async function setup(tabs?: PanelTab[]) {
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'TAB234', target: host, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const s = new ControllerSession({ session: 'TAB234', transport: hub.connect() });
  await waitFor(() => s.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: s, vocabulary: stage1Vocabulary(), ...(tabs ? { tabs } : {}) });
  cleanup.push(() => panel.destroy(), () => s.close(), () => hs.close());
  return { host, hs, s, panel };
}
const tabIds = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[role=tab]')].map((t) => t.dataset.tab);
const shown = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-pane]')].filter((p) => !p.hidden).map((p) => p.dataset.pane);

describe('panel.registerTab', () => {
  it('the built-in tabs are registered through the API, in order, Controls selected', async () => {
    const { panel } = await setup();
    expect(tabIds(panel.el)).toEqual(['controls', 'log', 'bookmarks', 'scenario']);
    expect(panel.tabs).toEqual(['controls', 'log', 'bookmarks', 'scenario']);
    expect(shown(panel.el)).toEqual(['controls']);
    expect(panel.el.querySelector('[data-tab=controls]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('registerTab adds a tab button and pane; render gets the pane and a context that sends commands', async () => {
    const { panel, hs } = await setup();
    let updates = 0;
    const off = panel.registerTab({
      id: 'device',
      title: 'Device',
      render(el, ctx) {
        el.innerHTML = '<button type="button" data-action="charge">Charge</button>';
        el.querySelector('button')!.addEventListener('click', () => ctx.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } }));
        return { update: () => void updates++ };
      },
    });
    expect(tabIds(panel.el)).toEqual(['controls', 'log', 'bookmarks', 'scenario', 'device']);
    const tab = panel.el.querySelector<HTMLElement>('[data-tab=device]')!;
    expect(tab.textContent).toBe('Device');
    tab.click();
    expect(shown(panel.el)).toEqual(['device']);
    expect(tab.getAttribute('aria-selected')).toBe('true');
    (panel.el.querySelector('[data-pane=device] [data-action=charge]') as HTMLElement).click();
    await waitFor(() => hs.stats.applied === 1);
    expect(updates).toBeGreaterThan(0); // session changes refresh registered tabs too
    off();
    expect(tabIds(panel.el)).toEqual(['controls', 'log', 'bookmarks', 'scenario']);
    expect(panel.el.querySelector('[data-pane=device]')).toBeNull();
    expect(shown(panel.el)).toEqual(['controls']); // removing the selected tab falls back to the first
  });

  it('tabs passed at mount are appended after the built-ins; before: puts one ahead of another', async () => {
    const mk = (id: string, before?: string): PanelTab => ({ id, title: id.toUpperCase(), render: (el) => void (el.textContent = id), ...(before ? { before } : {}) });
    const { panel } = await setup([mk('device'), mk('trends', 'log')]);
    expect(tabIds(panel.el)).toEqual(['controls', 'trends', 'log', 'bookmarks', 'scenario', 'device']);
    expect(panel.el.querySelector('[data-pane=trends]')?.textContent).toBe('trends');
  });

  it('a duplicate id is refused; destroy() runs the tabs\' own cleanup', async () => {
    const { panel } = await setup();
    let destroyed = 0;
    panel.registerTab({ id: 'device', title: 'Device', render: () => ({ destroy: () => void destroyed++ }) });
    expect(() => panel.registerTab({ id: 'device', title: 'Again', render: () => undefined })).toThrow(/device/);
    expect(() => panel.registerTab({ id: 'log', title: 'Log 2', render: () => undefined })).toThrow(/log/);
    panel.destroy();
    expect(destroyed).toBe(1);
  });

  it('selectTab switches programmatically', async () => {
    const { panel } = await setup();
    panel.selectTab('scenario');
    expect(shown(panel.el)).toEqual(['scenario']);
    expect(() => panel.selectTab('nope')).toThrow(/nope/);
  });
});
