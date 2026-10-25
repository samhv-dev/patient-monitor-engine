// @vitest-environment happy-dom
// The starting page (owner ruling 2026-10-25): the simulator opens on a full page with no monitor beside it. The shell
// hides the stage and the session bar on `start` and shows them on every other route (a hostless Remote keeps its own
// frame); the page lists the two demonstration cards first, "Load" loads the card and opens the Instructor view, and a
// return to the page while a case runs shows the banner and restarts nothing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shell, type View } from './shell.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { DEFAULT_SITE } from './site.ts';
import type { AppSession } from './session.ts';
import type { ScenarioCard } from './scenarios.ts';
import { DEMO_CARDS, startView } from './views/start.ts';

const view = (id: View['id']): View => ({ id, el: document.createElement('section') });

describe('shell: the starting page has no monitor', () => {
  beforeEach(() => document.body.replaceChildren());

  it('hides the stage and the session bar on start, shows them on monitor and teach', () => {
    const shell = new Shell(document.body, { hostless: false });
    for (const id of ['start', 'monitor', 'teach', 'explore'] as const) shell.add(view(id));
    shell.show({ id: 'start', sub: '' });
    expect(shell.stage.hidden).toBe(true);
    expect(shell.bar.hidden).toBe(true);
    expect(shell.root.dataset.route).toBe('start');
    shell.show({ id: 'monitor', sub: '' });
    expect(shell.stage.hidden).toBe(false);
    expect(shell.bar.hidden).toBe(false);
    shell.show({ id: 'teach', sub: '' });
    expect(shell.stage.hidden).toBe(false);
    shell.show({ id: 'start', sub: '' });
    expect(shell.stage.hidden).toBe(true);
  });

  it('a hostless Remote keeps its stage and session bar hidden on every route', () => {
    const shell = new Shell(document.body, { hostless: true });
    shell.add(view('remote'));
    shell.add(view('settings'));
    shell.show({ id: 'remote', sub: '' });
    expect(shell.stage.hidden).toBe(true);
    expect(shell.bar.hidden).toBe(true);
    shell.show({ id: 'settings', sub: '' });
    expect(shell.stage.hidden).toBe(true);
  });
});

describe('the starting page', () => {
  const base = PATIENT_PRESETS[0]!.spec;
  function rig(live = false) {
    const restarts: unknown[] = [];
    const session = {
      spec: { ...base, comorbid: [...base.comorbid], attached: true }, mode: 'modeled', live, code: 'ABC123', followers: 0,
      onFollowers: () => () => undefined, restart: (o: unknown) => void restarts.push(o), setSkin: async () => undefined,
    } as unknown as AppSession;
    const loaded: string[] = [];
    const v = startView({ session, site: { ...DEFAULT_SITE }, learnerUrl: 'about:blank', loadScenario: (c: ScenarioCard) => (loaded.push(c.id), true) });
    document.body.append(v.el);
    return { v, session, loaded, restarts };
  }
  beforeEach(() => {
    document.body.replaceChildren();
    location.hash = '';
  });
  afterEach(() => vi.useRealTimers());

  it('shows the title, the release label and the two demonstration cards first', () => {
    const { v } = rig();
    expect(v.el.querySelector('h1')?.textContent).toBe('Patient monitor simulator');
    const about = v.el.querySelector('[data-about]')?.textContent ?? '';
    expect(about).toMatch(/^Version \S+ .*For education only\. Not a medical device and not clinically validated/);
    const demos = [...v.el.querySelectorAll('.land-demo h3')].map((e) => e.textContent);
    expect(demos).toHaveLength(DEMO_CARDS.length);
    expect(demos[0]).toMatch(/Malignant hyperthermia/);
    expect(demos[1]).toMatch(/haemorrhage/i);
    expect(v.el.querySelectorAll('.land-more').length).toBeGreaterThan(5);
    // the Instructor's library keeps its own label: the page's cards are never matched as "Scenario library"
    expect(v.el.querySelector('section[aria-label="Scenario library"]')).toBeNull();
    expect(v.el.querySelectorAll('.scard')).toHaveLength(0);
  });

  it('Load on the MH card loads it and opens the Instructor view', async () => {
    const { v, loaded, session } = rig();
    (v.el.querySelector('.land-demo button[aria-label^="Load Malignant"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(loaded).toEqual(['showcase-mh']);
    expect(session.live).toBe(true);
    expect(location.hash).toBe('#/teach');
  });

  it('back on the page while a case runs: the banner shows and the engine is not restarted', () => {
    vi.useFakeTimers();
    const { v, restarts } = rig(true);
    v.enter?.('');
    const banner = v.el.querySelector('.land-live') as HTMLElement;
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('A case is running');
    expect(banner.querySelector('a')?.getAttribute('href')).toBe('#/teach');
    // a patient change while live does not preview-restart (today's `if (!s.live)` guard)
    (v.el.querySelectorAll('.chips .chip-btn')[1] as HTMLButtonElement).click();
    vi.advanceTimersByTime(2000);
    expect(restarts).toEqual([]);
  });

  it('before any case: no banner, and a patient change restarts the preview engine', () => {
    vi.useFakeTimers();
    const { v, restarts } = rig(false);
    v.enter?.('');
    expect((v.el.querySelector('.land-live') as HTMLElement).hidden).toBe(true);
    (v.el.querySelectorAll('.chips .chip-btn')[1] as HTMLButtonElement).click();
    vi.advanceTimersByTime(400);
    expect(restarts).toHaveLength(1);
  });
});
