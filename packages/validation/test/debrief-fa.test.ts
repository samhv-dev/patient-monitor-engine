// The Persian Debrief handout (scripts/showcase/debrief-fa.mjs) prints the take-home section the English learner
// handout prints (views/debrief.ts takeHomeSection): the card's lines through the table's takeHome group, owner-approved
// 2026-10-22, else three ruled lines. The committed rc.2 exports predate the cards' takeHome (2026-10-21), so each is
// given its card's lines here, as a current export's record carries them (the record holds the whole card as `doc`).
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(import.meta.dirname, '../../..');
type Used = { en: string; fa: string; reviewed: boolean };
const { render } = (await import(pathToFileURL(join(REPO, 'scripts/showcase/debrief-fa.mjs')).href)) as {
  render: (j: unknown, fontsCss: string, version: string) => { html: string; D: { used: Set<Used>; missing: Map<string, number>; printed: string[] } };
};
const read = (p: string): any => JSON.parse(readFileSync(join(REPO, p), 'utf8'));
const TABLE = read('docs/showcase/i18n/fa-debrief.json');
const EXPORTS = {
  tamponade: 'debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.json',
  mh: 'debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.json',
  bronchospasm: 'debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.json',
} as const;
const withCard = (k: keyof typeof EXPORTS, takeHome?: string[]): any => {
  const j = read(`docs/showcase/kit-round-a/q2-pretag-chromium/${EXPORTS[k]}`);
  j.record.doc.takeHome = takeHome ?? read(`apps/demo/src/app/showcase/showcase-${k}.json`).takeHome;
  return j;
};
const section = (html: string): string => /<section id="takehome">.*?<\/section>/s.exec(html)?.[0] ?? '';

describe('scripts/showcase/debrief-fa: the take-home section', () => {
  it('all nine take-home lines are owner-approved', () => {
    expect(TABLE.groups.takeHome).toHaveLength(9);
    expect(TABLE.groups.takeHome.every((e: Used) => e.reviewed === true)).toBe(true);
  });

  it('the tamponade record prints its three lines in Persian, the approved first line exactly', () => {
    const { html, D } = render(withCard('tamponade'), '', '1.0.0-rc.3');
    const sec = section(html);
    expect(sec).toContain('<h2>نکته‌های کلیدی</h2>');
    expect(sec.match(/<li>/g)).toHaveLength(3);
    expect(D.printed).toContain('تاکی‌کاردی، فشار نبض باریک و CVP بالا پس از زخم نافذ قفسه‌ی سینه: به تامپوناد فکر کنید.');
    expect(sec).not.toContain('class="en"');
    expect(D.missing.size).toBe(0);
    // after the talking points, before the notes, as the English handout orders them
    expect(html.indexOf('id="pearls"')).toBeLessThan(html.indexOf('id="takehome"'));
    expect(html.indexOf('id="takehome"')).toBeLessThan(html.indexOf('id="notes"'));
  });

  it('the MH and bronchospasm records print their three lines in Persian', () => {
    for (const k of ['mh', 'bronchospasm'] as const) {
      const { html, D } = render(withCard(k), '', '1.0.0-rc.3');
      expect(section(html).match(/<li>/g), k).toHaveLength(3);
      expect(D.missing.size, k).toBe(0);
    }
  });

  it('a line the table does not hold prints in English and is listed', () => {
    const { html, D } = render(withCard('tamponade', ['A line nobody translated.']), '', '1.0.0-rc.3');
    expect(section(html)).toContain('<bdi dir="ltr" class="en">A line nobody translated.</bdi>');
    expect(D.missing.get('A line nobody translated.')).toBe(1);
  });

  it('a card without lines prints the subhead and three ruled lines', () => {
    const { html } = render(withCard('tamponade', []), '', '1.0.0-rc.3');
    const sec = section(html);
    expect(sec).toContain('<p>نکته‌های کلیدی شما</p>');
    expect(sec.match(/class="ruled"/g)).toHaveLength(3);
  });
});
