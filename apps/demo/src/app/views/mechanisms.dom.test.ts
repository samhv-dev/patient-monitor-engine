// @vitest-environment happy-dom
// The mechanism tree page (docs/plans/mechanism-tree.md piece T1): for propofol the SVG holds Propofol Ce, SVR, the
// venous unstressed volume, the baroreflex as one loop box and MAP; the G_HS edge is drawn fitted with its tag on hover
// and focus; the ABSENT autonomic edge is dashed with research/44 L2-01; the legend says what each stroke means; the
// page says it has no live data yet; Persian goes through the table with the draft line (Q13); the Explore nav's last
// entry opens it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_LINE } from '../i18n/fa-dom.ts';
import { setHostLang } from '../i18n/lang.ts';
import { MemoryStorage } from '../memory-storage.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { exploreView } from './explore.ts';
import { mechanismsPanel, NO_LIVE, PICKER } from './mechanisms.ts';

const node = (el: Element, key: string) => el.querySelector(`.mt-n[data-key="${key}"]`);
const words = (g: Element | null) => [...(g?.querySelectorAll('text') ?? [])].map((t) => t.textContent).join(' | ');

// happy-dom's localStorage is not the one the app's store wraps here: a fresh memory storage per test, as debrief-fa does
beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('the mechanism tree page, propofol', () => {
  const p = mechanismsPanel();
  document.body.append(p.el);
  const svg = p.el.querySelector('svg.mt-svg') as SVGSVGElement;

  it('draws propofol by default, the trigger at the left', () => {
    expect(p.trigger).toBe('trigger.drug.propofol');
    expect(words(node(svg, 'trigger.drug.propofol'))).toContain('Propofol bolus');
  });

  it('holds Propofol Ce, SVR, the venous unstressed volume, the baroreflex loop box and MAP', () => {
    // labels from the glossary where it has the key, else the engine key (D3): the effect-site concentration has no
    // glossary entry, so it shows its key; v0Sv is the glossary's "Vu" (unstressed venous volume)
    expect(words(node(svg, 'pk.bus.cns.propCe'))).toBe('pk.bus.cns.propCe');
    expect(words(node(svg, 'hemo.circ.p.rSys'))).toBe('SVR (model) | hemo.circ.p.rSys');
    expect(words(node(svg, 'hemo.circ.p.v0Sv'))).toBe('Vu | hemo.circ.p.v0Sv');
    expect(node(svg, 'hemo.circ.p.v0Sv')?.querySelector('title')?.textContent).toContain('hemo.circ.p.v0Sv');
    const baro = node(svg, 'loop.baroreflex');
    expect(baro?.getAttribute('data-kind')).toBe('loop');
    expect(words(baro)).toBe('⟲ Baroreflex | 5 states · 3 edges');
    expect(baro?.querySelector('title')?.textContent).toContain('hemo.circ.baro.es');
    expect(words(node(svg, 'mon.abpMean'))).toContain('ART M');
    expect(svg.querySelectorAll('.mt-n')).toHaveLength(72);
    expect(svg.querySelectorAll('.mt-e')).toHaveLength(121);
  });

  it('the G_HS edge is drawn fitted, its tag on hover (<title>) and on focus (the detail line)', () => {
    const g = [...svg.querySelectorAll('.mt-e')].find((e) => e.getAttribute('data-rows')?.split(' ').includes('circulation.baro.hr')) as SVGGElement;
    expect(['FIT', 'ENG']).toContain(g.getAttribute('data-class'));
    expect(g.getAttribute('data-class')).toBe('FIT');
    const title = g.querySelector('title')?.textContent ?? '';
    expect(title).toContain('G_HS = 0.04 /mmHg: ');
    expect(title).toContain(`[FIT: baroreflex gain or shape fitted`); // backticks: a mention, not a marker (scripts/ci/markers.mjs)
    expect(g.getAttribute('tabindex')).toBe('0');
    g.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(p.el.querySelector('.mt-detail')?.textContent).toContain('G_HS = 0.04');
  });

  it('the ABSENT autonomic edge is dashed with research/44 L2-01 written on it', () => {
    const absent = [...svg.querySelectorAll('.mt-e[data-class="ABSENT"]')];
    const avp = absent.find((e) => e.getAttribute('data-to') === 'absent.endo.avp');
    expect(avp?.getAttribute('data-absent')).toBe('research/44 L2-01');
    expect(avp?.querySelector('text.mt-audit')?.textContent).toBe('research/44 L2-01');
    expect(absent).toHaveLength(17);
    expect(absent.every((e) => e.querySelector('.mt-audit'))).toBe(true);
    // the dash is the class's stroke in app.css, never a colour alone (E45)
    expect(svg.querySelector('.mt-e[data-class="ABSENT"] .mt-line')).not.toBeNull();
  });

  it('the legend says each stroke and shape in words, and the page says it has no live data', () => {
    const legend = p.el.querySelector('.mt-legend')?.textContent ?? '';
    for (const w of ['absent: the engine does not have this mechanism', 'fitted: the size is fitted, not sourced', 'solid: sourced', 'dotted', 'dash-dot', 'dashed', 'thin: no constant', 'feedback: the edge closes a loop'])
      expect(legend, w).toContain(w);
    expect(p.el.textContent).toContain(NO_LIVE);
    expect(p.el.querySelector('.mt-counts')?.textContent).toBe('72 nodes, 121 edges: 14 feedback, 17 absent. 53 of the nodes lie on one feedback system (each reaches every other).');
  });

  it('the picker lists the six triggers and draws the one chosen', () => {
    const sel = p.el.querySelector('select') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual([...PICKER]);
    sel.value = 'trigger.bleed';
    sel.dispatchEvent(new Event('change'));
    expect(node(p.el, 'trigger.bleed')).not.toBeNull();
    expect(p.el.querySelectorAll('.mt-fig .mt-n')).toHaveLength(77);
    sel.value = 'trigger.drug.propofol';
    sel.dispatchEvent(new Event('change'));
  });
});

describe('the mechanism tree in Persian (Q13)', () => {
  it('matches the SVG strings as they are built, the rest through the DOM pass; the draft line while unread', () => {
    setHostLang('fa');
    const p = mechanismsPanel();
    const svg = p.el.querySelector('svg.mt-svg') as SVGSVGElement;
    expect(words(node(svg, 'loop.baroreflex'))).toContain('رفلکس بارورسپتور');
    expect(words(node(svg, 'trigger.drug.propofol'))).toContain('بولوس پروپوفول');
    expect(words(node(svg, 'hemo.circ.p.rSys'))).toContain('hemo.circ.p.rSys'); // an engine key is never translated
    expect(p.el.querySelector('.mt-legend')?.textContent).toContain('غایب: موتور این سازوکار را ندارد');
    expect(p.el.querySelector('.mt-text')?.getAttribute('dir')).toBe('rtl');
    expect(p.el.querySelector('.mt-counts')?.textContent).toMatch(/^۷۲ گره و ۱۲۱ یال/); // the counts template, Persian digits
    const draft = p.el.querySelector('.mt-draft') as HTMLElement;
    expect(draft.hidden).toBe(false);
    expect(draft.textContent).toBe(DRAFT_LINE);
    setHostLang('en');
    p.draw();
    expect(draft.hidden).toBe(true);
    expect(p.el.querySelector('.mt-legend')?.textContent).toContain('absent: the engine does not have this mechanism');
  });
});

describe('Explore: the last entry of the left nav (Q12)', () => {
  it('#/explore/mechanisms shows the tree in place of the values; another section hides it again', () => {
    const view = exploreView({ onEvent: () => {}, onMount: () => {} } as unknown as AppSession, { gasUnit: 'mmHg' } as SiteProfile);
    const links = [...view.el.querySelectorAll('nav.xnav a')];
    expect(links.at(-1)?.getAttribute('href')).toBe('#/explore/mechanisms');
    expect(links.at(-1)?.textContent).toBe('Mechanism tree');
    view.enter?.('mechanisms');
    const box = view.el.querySelector('.mt-main') as HTMLElement;
    expect(box.hidden).toBe(false);
    expect(box.querySelectorAll('.mt-fig .mt-n')).toHaveLength(72);
    expect(links.at(-1)?.getAttribute('aria-current')).toBe('true');
    view.enter?.('overview');
    expect(box.hidden).toBe(true);
  });
});
