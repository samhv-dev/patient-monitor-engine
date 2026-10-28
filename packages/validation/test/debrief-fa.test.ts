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
  it('the nine approved take-home lines are owner-approved; of the five E132 lines, four are drafts for his review and one is held', () => {
    const lines = TABLE.groups.takeHome as Array<{ en: string; fa: string | null; reviewed: boolean; note?: string }>;
    expect(lines).toHaveLength(14);
    expect(lines.filter((e) => e.reviewed)).toHaveLength(9);
    expect(lines.filter((e) => e.reviewed).every((e) => e.fa !== null)).toBe(true);
    // E132 (2026-10-26): the Persian is the owner's. 2026-10-28: four carry a draft for his review, marked as such and
    // never reviewed until he approves them; one stays English until his wording ruling.
    const drafts = lines.filter((e) => e.fa !== null && !e.reviewed);
    expect(drafts).toHaveLength(4);
    for (const e of drafts) expect(e.note).toContain("Draft by Claude 2026-10-28 for the owner's review.");
    const held = lines.filter((e) => e.fa === null);
    expect(held).toHaveLength(1);
    expect(held.every((e) => !e.reviewed && (e.note ?? '').includes('Held 2026-10-28'))).toBe(true);
    const cards = ['mh', 'haemorrhage'].flatMap((k) => read(`apps/demo/src/app/showcase/showcase-${k}.json`).takeHome as string[]);
    for (const e of lines.filter((x) => !x.reviewed)) expect(cards).toContain(e.en);
  });

  it('the tamponade record prints its three lines in Persian, the approved first line exactly', () => {
    const { html, D } = render(withCard('tamponade'), '', '1.0.0-rc.4');
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

  it('the bronchospasm record prints its three lines in Persian; MH prints its four, the held E132 line in English', () => {
    const b = render(withCard('bronchospasm'), '', '1.0.0-rc.4');
    expect(section(b.html).match(/<li>/g)).toHaveLength(3);
    expect(b.D.missing.size).toBe(0);
    const mh = read('apps/demo/src/app/showcase/showcase-mh.json').takeHome as string[];
    const m = render(withCard('mh'), '', '1.0.0-rc.4');
    expect(section(m.html).match(/<li>/g)).toHaveLength(4);
    expect([...m.D.missing.keys()].filter((k) => mh.includes(k))).toEqual(mh.slice(2, 3));
  });

  it('a line the table does not hold prints in English and is listed', () => {
    const { html, D } = render(withCard('tamponade', ['A line nobody translated.']), '', '1.0.0-rc.4');
    expect(section(html)).toContain('<bdi dir="ltr" class="en">A line nobody translated.</bdi>');
    expect(D.missing.get('A line nobody translated.')).toBe(1);
  });

  it('a card without lines prints the subhead and three ruled lines', () => {
    const { html } = render(withCard('tamponade', []), '', '1.0.0-rc.4');
    const sec = section(html);
    expect(sec).toContain('<p>نکته‌های کلیدی شما</p>');
    expect(sec.match(/class="ruled"/g)).toHaveLength(3);
  });
});
