// @vitest-environment happy-dom
// The panel's Scenario tab against a real host + driver over the in-process hub.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel, type PanelHandle } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { BUILTIN_CATALOGUE, BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

async function setup() {
  const host = manualHost({ seed: 42 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'TAB234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const s = new ControllerSession({ session: 'TAB234', transport: hub.connect() });
  await waitFor(() => s.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: s, vocabulary: stage1Vocabulary(), scenarios: BUILTIN_CATALOGUE, startOpen: true });
  const run = (toS: number) => {
    for (let tick = host.engine.now().tick + 1; tick <= Math.round(toS * 50); tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
  };
  cleanup.push(() => panel.destroy(), () => s.close(), () => (hs as HostSession).close(), () => driver.close());
  return { host, driver, s, panel, run };
}
const q = <T extends Element>(p: PanelHandle, sel: string) => p.el.querySelector(sel) as T;
const click = (el: Element | null) => (el as HTMLElement).click();
const texts = (p: PanelHandle, sel: string) => [...p.el.querySelectorAll(sel)].map((e) => e.textContent?.trim());

describe('panel Scenario tab (DOM)', () => {
  it('has a Scenario tab listing the built-ins; loading one shows its state, transitions and timeline', async () => {
    const { panel, s } = await setup();
    click(q(panel, '[data-tab=scenario]'));
    expect(q<HTMLElement>(panel, '[data-pane=scenario]').hidden).toBe(false);
    expect([...q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').options].map((o) => o.value)).toEqual(BUILTIN_CATALOGUE.map((c) => c.id));
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    expect(q<HTMLElement>(panel, '.pme-scn-live').hidden).toBe(false);
    expect(q<HTMLElement>(panel, '.pme-scn-title').textContent).toBe('[draft] Witnessed VF in PACU');
    expect(q<HTMLElement>(panel, '.pme-scn-state').textContent).toBe('Stable in PACU');
    expect(texts(panel, '.pme-scn-next li')).toEqual(['Start VF now Start VF now: any of (after 60 s in state; button "Start VF now") → vf']);
    expect(texts(panel, '.pme-scn-states li').length).toBe(5);
    expect(q(panel, '.pme-scn-states li[aria-current=step]')?.getAttribute('data-state')).toBe('stable');
  });

  it('Press fires a manual transition; the list follows the new state; Force works for non-manual ones', async () => {
    const { panel, s, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    click(q(panel, '[data-action=scenario-trigger][data-target=arrest]'));
    await waitFor(() => q<HTMLElement>(panel, '.pme-scn-state').textContent === 'Coarse VF');
    expect(texts(panel, '.pme-scn-next [data-action=scenario-trigger]')).toEqual(['Force', 'Force', 'Force', 'ROSC now']);
    click(q(panel, '[data-action=scenario-trigger][data-target=decay]'));
    await waitFor(() => driver.runner?.stateId === 'vfFine');
  });

  it('goto, pause/resume and the time-in-state clock', async () => {
    const { panel, s, run, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'svt-adenosine';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc?.id === 'svt-adenosine');
    run(12);
    await waitFor(() => s.simT === 12); // the 1 Hz measurement at 12 s
    expect(q<HTMLElement>(panel, '.pme-scn-clock').textContent).toBe(' · 00:12 in state');
    q<HTMLSelectElement>(panel, 'select[name=scenario-goto]').value = 'sinus';
    click(q(panel, '[data-action=scenario-goto]'));
    await waitFor(() => driver.runner?.stateId === 'sinus');
    click(q(panel, '[data-action=scenario-pause]'));
    await waitFor(() => s.scenario.paused);
    expect(driver.runner?.paused).toBe(true);
    await waitFor(() => /scenario paused/.test(q<HTMLElement>(panel, '.pme-scn-clock').textContent ?? ''));
    click(q(panel, '[data-action=scenario-resume]'));
    await waitFor(() => driver.runner?.paused === false);
  });

  it('a jump point in the timeline is a goto', async () => {
    const { panel, s, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    click(q(panel, '[data-action=scenario-jump][data-target=vf]'));
    await waitFor(() => driver.runner?.stateId === 'vf');
  });

  it('a bad file shows the host’s path-level error', async () => {
    const { panel } = await setup();
    const bad = structuredClone(BUILTIN_SCENARIOS['svt-adenosine']) as { states: Array<{ transitions?: Array<{ to: string }> }> };
    bad.states[0]!.transitions![0]!.to = 'nowhere';
    const input = q<HTMLInputElement>(panel, 'input[name=scenario-file]');
    const file = new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await waitFor(() => (q<HTMLElement>(panel, '.pme-scn-error').textContent ?? '') !== '');
    expect(q<HTMLElement>(panel, '.pme-scn-error').textContent).toBe('invalid scenario: /states/0/transitions/0/to: no state "nowhere"');
  });

  it('Load URL fetches the document and loads it', async () => {
    const doc = BUILTIN_SCENARIOS['or-induction-hypotension'];
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => doc }));
    const { panel, s } = await setup();
    q<HTMLInputElement>(panel, 'input[name=scenario-url]').value = 'https://example.org/or.json';
    click(q(panel, '[data-action=scenario-load-url]'));
    await waitFor(() => s.scenario.doc?.id === 'or-induction-hypotension');
  });
});
