// @vitest-environment happy-dom
// One Instructor view (retire-instructor-v1, PR 3; the owner's rulings of 5 and 6 November 2026): Instructor v2
// (#/teach2) is the only instructor UI. The rail lists "Instructor" once and it leads there; every route that leads to
// the instructor (a Load from the library, the Patient page, the monitor's strip, the `i` key and the reveal gestures)
// opens it; the old address #/teach still reaches it (Q6), and Settings has no choice of view any more.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATIENT_PRESETS } from './patients.ts';
import { Rail } from './rail.ts';
import { parseRoute, revealTarget, ROUTES } from './router.ts';
import type { ScenarioCard } from './scenarios.ts';
import { DEFAULT_SITE, loadSite } from './site.ts';
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

describe('one Instructor view', () => {
  it('Settings has no "Instructor view" and no "Instructor panel on wide screens"; a profile stored with them loads without them', () => {
    localStorage.setItem('pme.site', JSON.stringify({ ...DEFAULT_SITE, instructor: 'teach', panel: 'drawer' }));
    const site = loadSite();
    expect(site).not.toHaveProperty('instructor');
    expect(site).not.toHaveProperty('panel');
    const v = settingsView(site, null);
    document.body.append(v.el);
    expect(v.el.querySelector('[role="group"][aria-label="Instructor view"]')).toBeNull();
    expect(v.el.querySelector('[role="group"][aria-label="Instructor panel on wide screens"]')).toBeNull();
    expect(v.el.textContent).not.toMatch(/Instructor view|Instructor panel|Today's view|Instructor v2/);
  });

  it('the rail lists "Instructor" once, leading to #/teach2, and marks it there', () => {
    const r = new Rail({ version: 'x', theme: { light: () => false, set: () => undefined } });
    const entries = () => [...r.el.querySelectorAll('a')].filter((a) => /^Instructor/.test(a.textContent ?? ''));
    expect(entries().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Instructor', '#/teach2']]);
    expect(r.el.querySelector('a[href="#/teach"]')).toBeNull();
    r.mark(parseRoute('#/teach').id); // the old address marks it too
    expect(entries()[0]?.getAttribute('aria-current')).toBe('page');
    r.mark('monitor');
    expect(entries()[0]?.hasAttribute('aria-current')).toBe(false);
    r.mark('teach2');
    expect(entries()[0]?.getAttribute('aria-current')).toBe('page');
    r.destroy();
  });

  it('#/teach is no route of its own: it resolves to #/teach2; the `i` key and the reveal gestures go monitor ↔ #/teach2', () => {
    expect(ROUTES).not.toContain('teach');
    expect(ROUTES).toContain('teach2');
    expect(parseRoute('#/teach')).toEqual({ id: 'teach2', sub: '' });
    expect(parseRoute('#/teach2').id).toBe('teach2');
    expect(revealTarget('monitor')).toBe('teach2');
    expect(revealTarget('teach2')).toBe('monitor');
    expect(revealTarget(parseRoute('#/teach').id)).toBe('monitor');
    expect(revealTarget('settings')).toBeNull();
  });

  it('every route to the instructor opens #/teach2: a Load from the library, the Patient page, the monitor\'s strip', async () => {
    const lib = scenariosView({ session: { live: false }, loadScenario: (_c: ScenarioCard) => true });
    document.body.append(lib.el);
    lib.enter?.('library');
    (lib.el.querySelector('.scen-demos button[aria-label^="Load Malignant"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(location.hash).toBe('#/teach2'));

    location.hash = '';
    const spec = PATIENT_PRESETS[0]!.spec;
    const pt = patientView({ session: { spec, mode: 'modeled', live: true, restart: () => undefined } as never, site: { ...DEFAULT_SITE } });
    document.body.append(pt.el);
    pt.enter?.('');
    expect(pt.el.querySelector('.land-live a')?.getAttribute('href')).toBe('#/teach2');
    ([...pt.el.querySelectorAll('button')].find((b) => b.textContent === 'Open the instructor view') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(location.hash).toBe('#/teach2'));

    const mon = monitorView({ session: { onLearner: () => () => undefined } as never, link: {} as never, learnerUrl: 'about:blank' });
    document.body.append(mon.el);
    // the strip lives in the Monitor view's own row under the stage (#203), not inside the stage
    const strip = mon.el.querySelector('[role="toolbar"][aria-label="Monitor view"]') as HTMLElement;
    expect([...strip.querySelectorAll('a')].find((a) => a.textContent === 'Instructor view')?.getAttribute('href')).toBe('#/teach2');
  });
});
