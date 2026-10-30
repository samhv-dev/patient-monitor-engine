// @vitest-environment happy-dom
// One Instructor entry (owner, 30 October): the rail lists "Instructor" once; Settings chooses which view it is, today's
// (#/teach, the default) or Instructor v2 (#/teach2), saved in the site profile like the monitor; every route that
// leads to the instructor (a Load from the library, the Patient page, the monitor's strip, the `i` key and the reveal
// gestures) opens the chosen view; both addresses still work as deep links.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATIENT_PRESETS } from './patients.ts';
import { Rail } from './rail.ts';
import { parseRoute, revealTarget, ROUTES } from './router.ts';
import type { ScenarioCard } from './scenarios.ts';
import { DEFAULT_SITE, loadSite, type SiteProfile } from './site.ts';
import { monitorView } from './views/monitor.ts';
import { patientView } from './views/patient.ts';
import { scenariosView } from './views/scenarios.ts';
import { settingsView } from './views/settings.ts';

beforeEach(() => {
  document.body.replaceChildren();
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
  location.hash = '';
});
afterEach(() => vi.unstubAllGlobals());

const rail = (site: SiteProfile) => new Rail({ version: 'x', theme: { light: () => false, set: () => undefined }, instructor: () => site.instructor });
const choice = (el: HTMLElement) => el.querySelector('[role="group"][aria-label="Instructor view"]') as HTMLElement;

describe('Settings: "Instructor view"', () => {
  it('two choices, today\'s view and Instructor v2; the choice is saved for this browser and survives a reload', () => {
    expect(loadSite().instructor).toBe('teach'); // nothing stored: today's view, the demo's
    expect(DEFAULT_SITE.instructor).toBe('teach');
    const site = loadSite();
    let changed = 0;
    const v = settingsView(site, null, { onInstructor: () => void changed++ });
    document.body.append(v.el);
    const seg = choice(v.el);
    expect([...seg.querySelectorAll('button')].map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([["Today's view", 'true'], ['Instructor v2', 'false']]);
    (seg.querySelector('button[data-v="teach2"]') as HTMLButtonElement).click();
    expect(site.instructor).toBe('teach2');
    expect(changed).toBe(1); // the rail redraws its entry at once
    // a reload reads the stored profile
    const again = loadSite();
    expect(again.instructor).toBe('teach2');
    const v2 = settingsView(again, null);
    expect(choice(v2.el).querySelector('button[aria-pressed="true"]')?.textContent).toBe('Instructor v2');
  });
});

describe('the rail: one Instructor entry', () => {
  it('lists "Instructor" once, leading to the chosen view, and marks it on either instructor address', () => {
    const site = { ...DEFAULT_SITE };
    const r = rail(site);
    const entries = () => [...r.el.querySelectorAll('a')].filter((a) => /^Instructor/.test(a.textContent ?? ''));
    expect(entries().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Instructor', '#/teach']]);
    expect(r.el.querySelector('a[href="#/teach2"]')).toBeNull();
    site.instructor = 'teach2';
    r.refresh();
    expect(entries().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Instructor', '#/teach2']]);
    expect(r.el.querySelector('a[href="#/teach"]')).toBeNull(); // the rail does not list the other
    for (const id of ['teach', 'teach2'] as const) {
      r.mark(id);
      expect(entries()[0]?.getAttribute('aria-current'), id).toBe('page');
    }
    r.mark('monitor');
    expect(entries()[0]?.hasAttribute('aria-current')).toBe(false);
    r.destroy();
  });

  it('a deep link to either view still works: both routes exist', () => {
    expect(ROUTES).toContain('teach');
    expect(ROUTES).toContain('teach2');
    expect(parseRoute('#/teach2').id).toBe('teach2');
    expect(parseRoute('#/teach').id).toBe('teach');
  });
});

describe('every route to the instructor opens the chosen view', () => {
  it('a Load from the library', async () => {
    const site = { ...DEFAULT_SITE, instructor: 'teach2' as const };
    const v = scenariosView({ session: { live: false }, loadScenario: (_c: ScenarioCard) => true, instructor: () => site.instructor });
    document.body.append(v.el);
    v.enter?.('library');
    (v.el.querySelector('.scen-demos button[aria-label^="Load Malignant"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(location.hash).toBe('#/teach2');
  });

  it('the Patient page: "Open the instructor view" and the banner\'s "Back to the Instructor"', async () => {
    const site = { ...DEFAULT_SITE, instructor: 'teach2' as const };
    const spec = PATIENT_PRESETS[0]!.spec;
    const session = { spec, mode: 'modeled', live: true, restart: () => undefined };
    const v = patientView({ session: session as never, site });
    document.body.append(v.el);
    v.enter?.('');
    expect(v.el.querySelector('.land-live a')?.getAttribute('href')).toBe('#/teach2');
    const open = [...v.el.querySelectorAll('button')].find((b) => b.textContent === 'Open the instructor view') as HTMLButtonElement;
    open.click();
    await vi.waitFor(() => expect(location.hash).toBe('#/teach2'));
  });

  it('the monitor\'s strip: "Instructor view" follows the choice each time the monitor opens', () => {
    const site = { ...DEFAULT_SITE };
    const v = monitorView({ session: { onLearner: () => () => undefined } as never, link: {} as never, learnerUrl: 'about:blank', instructor: () => site.instructor });
    document.body.append(v.el);
    const link = () => [...v.el.querySelectorAll('a')].find((a) => a.textContent === 'Instructor view')?.getAttribute('href');
    v.enter?.('');
    expect(link()).toBe('#/teach');
    site.instructor = 'teach2';
    v.enter?.('');
    expect(link()).toBe('#/teach2');
  });

  it('the `i` key and the reveal gestures: the monitor opens the chosen view, either instructor view goes back to the monitor', () => {
    expect(revealTarget('monitor', 'teach')).toBe('teach');
    expect(revealTarget('monitor', 'teach2')).toBe('teach2');
    for (const from of ['teach', 'teach2'] as const) for (const chosen of ['teach', 'teach2'] as const) expect(revealTarget(from, chosen)).toBe('monitor');
    expect(revealTarget('settings', 'teach2')).toBeNull();
  });
});
