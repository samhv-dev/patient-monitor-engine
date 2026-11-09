// @vitest-environment happy-dom
// The mechanism tree page (docs/plans/mechanism-tree.md piece T1): for propofol the SVG holds Propofol Ce, SVR, the
// venous unstressed volume, the baroreflex as one loop box and MAP; the G_HS edge is drawn fitted with its tag on hover
// and focus; the ABSENT autonomic edge is dashed with research/44 L2-01; the legend says what each stroke means; the
// page says it has no live data yet; Persian goes through the table with the draft line (Q13); the Explore nav's last
// entry opens it. Brief 104 (T1b): the page opens on the default view (the trigger and 4 generations, the folds), every
// node in clinical words with no engine key visible, the review line; "+n", the folds and "path to…" open what is
// hidden; the T1 assertions above hold for the whole tree, one button away.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_LINE } from '../i18n/fa-dom.ts';
import { setHostLang } from '../i18n/lang.ts';
import { MemoryStorage } from '../memory-storage.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { exploreView } from './explore.ts';
import { REVIEW_LINE } from '../mechanisms/labels.ts';
import { REGISTRY } from '../mechanisms/registry-data.ts';
import { mechanismsPanel, NO_LIVE, PICKER } from './mechanisms.ts';

const node = (el: Element, key: string) => el.querySelector(`.mt-n[data-key="${key}"]`);
const words = (g: Element | null) => [...(g?.querySelectorAll(':scope > text') ?? [])].map((t) => t.textContent).join(' | ');
const click = (el: Element | null) => el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
/** Every engine key the registry names (a trigger, a node, a row's from and to). */
const KEYS = [...new Set([...REGISTRY.triggers.map((t) => t.path), ...REGISTRY.nodes.map((n) => n.path), ...REGISTRY.rows.flatMap((r) => [...r.from, r.to])])];
/** What a reader sees without hovering: the page's text without the tooltips (<title>), and every SVG text. */
const visible = (root: Element): string => {
  const c = root.cloneNode(true) as Element;
  for (const t of c.querySelectorAll('title')) t.remove();
  return c.textContent ?? '';
};

// happy-dom's localStorage is not the one the app's store wraps here: a fresh memory storage per test, as debrief-fa does
beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('the mechanism tree page, propofol: the default view (brief 104)', () => {
  const p = mechanismsPanel();
  document.body.append(p.el);
  const fig = p.el.querySelector('.mt-fig') as HTMLElement;
  const svg = () => fig.querySelector('svg.mt-svg') as SVGSVGElement;

  it('draws propofol by default, the trigger at the left, the trigger and 4 generations past it: 13 nodes', () => {
    expect(p.trigger).toBe('trigger.drug.propofol');
    expect(words(node(svg(), 'trigger.drug.propofol'))).toContain('Propofol bolus');
    expect(svg().querySelectorAll('.mt-n')).toHaveLength(13); // graph.test.ts DEFAULT_PINS
    expect(p.el.querySelector('.mt-drawn')?.textContent).toBe('Drawn: 12 of the 74 nodes, the trigger and 4 generations past it.');
  });

  it('every node in clinical words with its unit; no engine key is visible (the key is in the tooltip)', () => {
    expect(words(node(svg(), 'pk.bus.cns.propCe'))).toBe('Propofol effect-site | concentration | µg/mL');
    expect(words(node(svg(), 'hemo.circ.p.rSys'))).toBe('SVR (model) | mmHg·s/mL'); // the glossary's label, unchanged
    expect(node(svg(), 'pk.bus.cns.propCe')?.querySelector('title')?.textContent).toContain('pk.bus.cns.propCe');
    expect(node(svg(), 'pk.bus.cns.propCe')?.querySelector('title')?.textContent).toContain('Propofol concentration at the effect site (Eleveld model).');
    const seen = visible(p.el);
    expect(KEYS.filter((k) => seen.includes(k))).toEqual([]);
  });

  it('says the labels are under the owner\'s review', () => {
    const line = p.el.querySelector('.mt-review') as HTMLElement;
    expect(line.textContent).toBe(REVIEW_LINE);
    expect(line.textContent).toBe("labels under the owner's review");
    expect(line.hidden).toBe(false);
  });

  it('a node with more than six children folds the rest into "n more"; opening it draws them', () => {
    const fold = node(svg(), 'more.pk.bus.cns.propCe') as SVGGElement;
    expect(words(fold)).toBe('+ 3 more | open');
    expect(fold.getAttribute('role')).toBe('button');
    expect(fold.querySelector('title')?.textContent).toContain('· Drug effect on venous capacity');
    click(fold);
    expect(node(svg(), 'more.pk.bus.cns.propCe')).toBeNull();
    expect(node(svg(), 'pk.fx.v0Frac')).not.toBeNull();
  });

  it('"+n" on a frontier node draws one generation more from it, by click and by Enter', () => {
    const before = svg().querySelectorAll('.mt-n').length;
    const more = node(svg(), 'hemo.circ.p.rSys') ? svg().querySelector('.mt-more[data-expand="hemo.circOut.pRad"]') : null;
    expect(more?.textContent).toBe(`Show more: 4 effects of Radial pressure, one generation further+4`);
    click(more);
    expect(svg().querySelectorAll('.mt-n').length).toBe(before + 4);
    expect(node(svg(), 'device.monitor')?.getAttribute('data-kind')).toBe('device'); // the monitor's values, folded
    const key = svg().querySelector('.mt-more[data-expand="hemo.circ.mapNow"]') as SVGGElement;
    key.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(svg().querySelector('.mt-more[data-expand="hemo.circ.mapNow"]')).toBeNull();
    // the monitor box opens into its values
    click(node(svg(), 'device.monitor'));
    expect(words(node(svg(), 'mon.abpMean'))).toBe('ART M | mmHg');
  });

  it('"path to" ART M keeps the routes from the trigger to the monitor\'s mean arterial pressure', () => {
    const sel = p.el.querySelector('#mt-path') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.textContent)).toEqual(['— (the default view)', 'ART M', 'ART S', 'EtCO₂', 'RR', 'HR']);
    sel.value = 'mon.abpMean';
    sel.dispatchEvent(new Event('change'));
    expect(node(svg(), 'mon.abpMean')).not.toBeNull();
    expect(node(svg(), 'hemo.circ.p.rSys')).not.toBeNull();
    expect(svg().querySelectorAll('.mt-n')).toHaveLength(15);
    expect(p.el.querySelector('.mt-drawn')?.textContent).toBe('Drawn: the 15 nodes on the paths from the trigger to ART M.');
    click(p.el.querySelector('#mt-default'));
    expect(svg().querySelectorAll('.mt-n')).toHaveLength(13);
  });
});

describe('the mechanism tree page, propofol: the whole tree (the T1 pins)', () => {
  const p = mechanismsPanel();
  document.body.append(p.el);
  click(p.el.querySelector('#mt-whole'));
  const svg = p.el.querySelector('svg.mt-svg') as SVGSVGElement;

  it('holds Propofol Ce, SVR, the venous unstressed volume, the baroreflex loop box and MAP; no engine key visible', () => {
    expect(words(node(svg, 'pk.bus.cns.propCe'))).toBe('Propofol effect-site | concentration | µg/mL');
    expect(words(node(svg, 'hemo.circ.p.rSys'))).toBe('SVR (model) | mmHg·s/mL');
    expect(words(node(svg, 'hemo.circ.p.v0Sv'))).toBe('Vu | mL'); // the glossary's "Vu" (unstressed venous volume)
    expect(node(svg, 'hemo.circ.p.v0Sv')?.querySelector('title')?.textContent).toContain('hemo.circ.p.v0Sv');
    expect(KEYS.filter((k) => visible(p.el).includes(k))).toEqual([]);
    const baro = node(svg, 'loop.baroreflex');
    expect(baro?.getAttribute('data-kind')).toBe('loop');
    expect(words(baro)).toBe('⟲ Baroreflex | 5 states · 3 edges');
    expect(baro?.querySelector('title')?.textContent).toContain('hemo.circ.baro.es');
    expect(words(node(svg, 'mon.abpMean'))).toBe('ART M | mmHg');
    expect(svg.querySelectorAll('.mt-n')).toHaveLength(74); // 182 rows: + eeg.cortex, eeg.signal (graph.test.ts PINS)
    expect(svg.querySelectorAll('.mt-e')).toHaveLength(123); // + cbfRel → eeg.cortex, eeg.cortex → eeg.signal
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
    expect(p.el.querySelector('.mt-counts')?.textContent).toBe('74 nodes, 123 edges: 14 feedback, 17 absent. 53 of the nodes lie on one feedback system (each reaches every other).');
  });

  it('the picker lists the six triggers and draws the one chosen, in its default view; the whole tree one click away', () => {
    const sel = p.el.querySelector('select') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual([...PICKER]);
    sel.value = 'trigger.bleed';
    sel.dispatchEvent(new Event('change'));
    expect(node(p.el, 'trigger.bleed')).not.toBeNull();
    expect(p.el.querySelectorAll('.mt-fig .mt-n')).toHaveLength(6); // bleed's default view (graph.test.ts DEFAULT_PINS)
    click(p.el.querySelector('#mt-whole'));
    expect(p.el.querySelectorAll('.mt-fig .mt-n')).toHaveLength(79); // bleed, 182 rows (graph.test.ts PINS)
    sel.value = 'trigger.drug.propofol';
    sel.dispatchEvent(new Event('change'));
  });
});

describe('the mechanism tree in Persian (Q13)', () => {
  it('matches the SVG strings as they are built, the rest through the DOM pass; the draft line while unread', () => {
    setHostLang('fa');
    const p = mechanismsPanel();
    click(p.el.querySelector('#mt-whole')); // the baroreflex is past the default view's 4 generations
    const svg = p.el.querySelector('svg.mt-svg') as SVGSVGElement;
    expect(words(node(svg, 'loop.baroreflex'))).toContain('رفلکس بارورسپتور');
    expect(words(node(svg, 'trigger.drug.propofol'))).toContain('بولوس پروپوفول');
    expect(words(node(svg, 'hemo.circ.p.rSys'))).not.toContain('hemo.circ.p.rSys'); // the clinical label, never the key
    expect((p.el.querySelector('.mt-review') as HTMLElement).hidden).toBe(false); // the labels' review line stands in Persian too
    expect(p.el.querySelector('.mt-legend')?.textContent).toContain('غایب: موتور این سازوکار را ندارد');
    expect(p.el.querySelector('.mt-text')?.getAttribute('dir')).toBe('rtl');
    expect(p.el.querySelector('.mt-counts')?.textContent).toMatch(/^۷۴ گره و ۱۲۳ یال/); // the counts template, Persian digits
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
    expect(box.querySelectorAll('.mt-fig .mt-n')).toHaveLength(13); // propofol's default view (graph.test.ts DEFAULT_PINS)
    expect(links.at(-1)?.getAttribute('aria-current')).toBe('true');
    view.enter?.('overview');
    expect(box.hidden).toBe(true);
  });
});
