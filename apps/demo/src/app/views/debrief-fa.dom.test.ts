// @vitest-environment happy-dom
// Debrief 2, D13: the Debrief page and the learner handout in Persian from the one table (fa-debrief.json) through THE
// matcher the handout script uses (D11). The switch is per browser, English by default; with it on «فارسی» the two live
// containers and the handout carry lang="fa" dir="rtl"; a string the table lacks prints in English, marked and listed;
// values and times stay Western digits; the SVGs keep their English labels; the footer is the table's footer entry;
// DQ10's line stands while any entry printed is unread by the owner; the script and the page print the same Persian.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../memory-storage.ts';
import type { Link } from '../link.ts';
import type { RunData } from '../record.ts';
import type { AppSession } from '../session.ts';
import { DRAFT_LINE, faPass, unreviewed } from '../i18n/fa-dom.ts';
import { debriefView } from './debrief.ts';

const REPO = resolve(import.meta.dirname, '../../../../..');
const exportOf = (p: string): { record: RunData } & Record<string, unknown> => JSON.parse(readFileSync(join(REPO, p), 'utf8'));
const TAMPONADE = 'apps/demo/src/app/__fixtures__/debrief-2/tamponade-q12-v2.json';
const HAEMORRHAGE = 'apps/demo/src/app/__fixtures__/debrief-2/haemorrhage-phases-v3.json';

function open(data: RunData): { el: HTMLElement; leave?: () => void } {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
const press = (el: HTMLElement, name: string): void => (el.querySelector(`.db-tools .seg button[data-v="${name}"]`) as HTMLButtonElement).click();
const ids = ['#db-live-1', '#db-live-2', '#db-handout'];
/** Text as read, the script's sub/sup digits (O₂ drawn as O<sub>2</sub>) and spaces folded. */
const norm = (s: string): string => s.replace(/₂/g, '2').replace(/⁺/g, '+').replace(/\s+/g, ' ').trim();

describe('the Debrief in Persian (D13)', () => {
  let leave: (() => void) | undefined;
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));
  afterEach(() => (leave?.(), document.body.replaceChildren(), vi.unstubAllGlobals()));

  it('English by default: no lang or dir, no draft line, the switch on English', () => {
    const v = open(exportOf(TAMPONADE).record);
    leave = v.leave;
    for (const s of ids) expect(v.el.querySelector(s)?.hasAttribute('lang')).toBe(false);
    expect(v.el.querySelector<HTMLElement>('.db-draft')?.hidden).toBe(true);
    expect(v.el.querySelector('.db-tools .seg button[aria-pressed="true"]')?.textContent).toBe('English');
    expect(v.el.querySelector('#db-objectives-h')?.textContent).toBe('Objectives');
  });

  it('«فارسی»: the containers right to left in Persian, kept per browser; back to English restores the page', () => {
    const v = open(exportOf(TAMPONADE).record);
    leave = v.leave;
    const english = v.el.querySelector('#db-live-2')?.textContent;
    const svgBefore = v.el.querySelector('#db-course svg')?.outerHTML;
    press(v.el, 'fa');
    for (const s of ids) {
      expect(v.el.querySelector(s)?.getAttribute('lang')).toBe('fa');
      expect(v.el.querySelector(s)?.getAttribute('dir')).toBe('rtl');
    }
    expect(localStorage.getItem('pme.lang')).toBe('fa');
    expect(v.el.querySelector('#db-objectives-h')?.textContent).toBe('اهداف آموزشی');
    // values and times stay Western digits: the timeline's time cells are unchanged
    const times = [...v.el.querySelectorAll('#db-timeline tbody tr td:first-child')].map((td) => td.textContent);
    expect(times.length).toBeGreaterThan(5);
    for (const t of times) expect(t).toMatch(/^\d\d:\d\d$/);
    // the SVGs keep their English labels; the typed fields and the notes are not part of it
    expect(v.el.querySelector('#db-course svg')?.outerHTML).toBe(svgBefore);
    expect(v.el.querySelector('#db-who')?.closest('[lang="fa"]')).toBeNull();
    expect(v.el.querySelector('.db-notes')?.closest('[lang="fa"]')).toBeNull();
    // the footer is the table's footer entry
    expect(v.el.querySelector('footer.db-foot')?.getAttribute('lang')).toBe('fa');
    const foot = v.el.querySelector('footer.db-foot');
    expect(foot?.querySelector('bdi.en')).toBeNull();
    expect(foot?.textContent).toMatch(/^فقط برای آموزش؛ برای مراقبت از بیمار استفاده نشود\. نسخه‌ی /);
    // a second view in the same browser opens in Persian; English again restores the English page
    const w = open(exportOf(TAMPONADE).record);
    expect(w.el.querySelector('#db-live-1')?.getAttribute('lang')).toBe('fa');
    w.leave?.();
    w.el.remove();
    press(v.el, 'en');
    expect(v.el.querySelector('#db-live-2')?.textContent).toBe(english);
    for (const s of ids) expect(v.el.querySelector(s)?.hasAttribute('lang')).toBe(false);
    expect(localStorage.getItem('pme.lang')).toBe('en');
  });

  it('a string the table lacks prints in English, marked, and is listed with its count', () => {
    const d = exportOf(TAMPONADE).record;
    (d.doc as unknown as Record<string, unknown>).takeHome = ['A line nobody translated.'];
    const v = open(d);
    leave = v.leave;
    press(v.el, 'fa');
    const li = v.el.querySelector('#db-handout .db-take li bdi.en');
    expect(li?.textContent).toBe('A line nobody translated.');
    expect(li?.getAttribute('lang')).toBe('en');
    const list = v.el.querySelector<HTMLDetailsElement>('.db-fa-missing');
    expect(list?.hidden).toBe(false);
    expect([...(list?.querySelectorAll('li') ?? [])].map((x) => x.textContent)).toContain('1× A line nobody translated.');
  });

  it('DQ10: the draft line stands while an entry printed is unread, on screen and with each footer line; off in English', () => {
    const v = open(exportOf(TAMPONADE).record);
    leave = v.leave;
    press(v.el, 'fa');
    const draft = v.el.querySelector<HTMLElement>('.db-draft');
    expect(draft?.hidden).toBe(false);
    expect(draft?.textContent).toBe(DRAFT_LINE);
    expect(DRAFT_LINE).toBe('Persian draft: not yet read by the clinical owner');
    const feet = [...v.el.querySelectorAll('.db-runfoot')];
    expect(feet.length).toBeGreaterThan(2);
    for (const f of feet) expect(f.querySelector('.db-draftline')?.textContent).toBe(DRAFT_LINE);
    expect(v.el.querySelector('.db-handout-live > .db-draftline')?.textContent).toBe(DRAFT_LINE);
    expect(document.getElementById('db-page-style')?.textContent).toContain(DRAFT_LINE);
    press(v.el, 'en');
    expect(draft?.hidden).toBe(true);
    expect(v.el.querySelector('.db-draftline')).toBeNull();
    expect(document.getElementById('db-page-style')?.textContent).not.toContain(DRAFT_LINE);
    // and it is off once every entry printed is reviewed
    const p = faPass();
    p.used.add({ en: 'x', fa: 'y', reviewed: true });
    expect(unreviewed(p)).toBe(false);
    p.used.add({ en: 'z', fa: 'w', reviewed: false });
    expect(unreviewed(p)).toBe(true);
  });

  it.each([TAMPONADE, HAEMORRHAGE])('the script and the page print the same Persian for the same export (%s)', async (file) => {
    const { render } = (await import(pathToFileURL(join(REPO, 'scripts/showcase/debrief-fa.mjs')).href)) as { render: (j: unknown, css: string, v: string) => { html: string } };
    const j = exportOf(file);
    const doc = new DOMParser().parseFromString(render(j, '', '1.0.0-test').html, 'text/html');
    const v = open(j.record);
    leave = v.leave;
    press(v.el, 'fa');
    // the section heads both print
    for (const id of ['objectives', 'facts', 'trends', 'drugs', 'timeline', 'bookmarks', 'minutes', 'actions', 'outcomes', 'violations']) {
      const s = doc.querySelector(`section#${id} > h2`)?.textContent;
      const a = v.el.querySelector(`#db-${id}-h`)?.textContent;
      if (s === undefined || a === undefined) continue;
      expect(norm(a), id).toBe(norm(s));
    }
    // the timeline's events, row by row (a staged delivery, which the page joins on one line, left out)
    const script = [...doc.querySelectorAll('table.timeline tbody tr td:nth-child(3)')].map((td) => norm(td.textContent ?? ''));
    const page = [...v.el.querySelectorAll('#db-timeline tbody tr td:nth-child(3)')].map((td) => norm(td.textContent ?? '')).filter((t) => !/^(Delivered together|با هم اعمال شد)/.test(t));
    expect(page.length).toBeGreaterThan(5);
    for (const t of page) expect(script).toContain(t);
    // the take-home lines
    expect([...v.el.querySelectorAll('#db-handout .db-take li')].map((li) => norm(li.textContent ?? ''))).toEqual([...doc.querySelectorAll('#takehome li')].map((li) => norm(li.textContent ?? '')));
  });
});
