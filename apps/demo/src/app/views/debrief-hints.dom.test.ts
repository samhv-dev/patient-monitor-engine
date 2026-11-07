// @vitest-environment happy-dom
// Debrief 2, D9: "From the card's author" on page 2, after the key moments: the card's `show` lines and openers printed
// character for character (Decision 8: never interpolated; the anchor's time and moment number are a separate label), an
// opener whose anchor did not happen on the kept course left out and counted, nothing at all without debriefHints, and
// the learner handout unchanged (none of the strings in it). The strings are test strings, not card text: no card carries
// debriefHints until the owner has accepted its lines (D10).
import { afterEach, describe, expect, it } from 'vitest';
import mh from '../../../../../docs/showcase/kit-round-a/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json';
import type { Link } from '../link.ts';
import { emptyRun, type RunData } from '../record.ts';
import mhV2 from '../showcase/showcase-mh-v2.json';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

function open(data: RunData): { el: HTMLElement; leave?: () => void } {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
/** The MH kit-round record (a /1 run), its card given these hints. */
const mhWith = (debriefHints: unknown): RunData => {
  const d = structuredClone(mh.record) as unknown as RunData;
  (d.doc as unknown as Record<string, unknown>).debriefHints = debriefHints;
  return d;
};
const SHOW = ['Line one: <b>not bold</b> & "quoted" — EtCO₂ 42 → 45.', '  Two spaces before, two after.  ', 'Third ٣ line.'];
const OPENERS = [
  { at: 'state:earlySigns', text: 'What did you see first, and when?' },
  { at: 'state:arrest', text: 'This anchor never happens on the kept course.' },
  { at: 'value:etco2>45', text: 'A value crossing: <i>no</i> moment, maybe.' },
  { at: 'drug:dantrolene', text: 'Dantrolene: what decided the moment?' },
];
const texts = (el: Element | null | undefined, sel: string) => [...(el?.querySelectorAll(sel) ?? [])].map((x) => x.textContent);

describe("Debrief page 2: From the card's author (D9)", () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('/1: the show lines and openers print character for character, after the key moments; one opener left out and counted', () => {
    const v = open(mhWith({ show: SHOW, openers: OPENERS }));
    leave = v.leave;
    const sec = v.el.querySelector('#db-hints');
    expect(sec?.querySelector('h2')?.textContent).toBe("From the card's author");
    expect(texts(sec, 'h3')).toEqual(['What this case is built to show', 'Openers for the analysis']);
    expect(texts(sec, '.db-hint-show > li')).toEqual(SHOW);
    expect(sec?.querySelector('.db-hint-show b, .db-hint-openers i')).toBeNull(); // printed as text, not markup
    const shown = OPENERS.filter((o) => o.at !== 'state:arrest').map((o) => o.text);
    expect(texts(sec, '.db-hint-openers .db-hint-text')).toEqual(shown);
    expect(sec?.querySelector('.db-hint-left')?.textContent).toBe('1 opener not shown: its event did not happen in this run');
    // the label: the anchor's mm:ss, and the number of the key moment at that second
    const rows = new Map([...v.el.querySelectorAll('#db-moments tbody tr[data-n]')].map((tr) => [tr.querySelectorAll('td')[1]?.textContent, tr.getAttribute('data-n')]));
    const labels = texts(sec, '.db-hint-at');
    expect(labels).toHaveLength(3);
    const early = labels[0] as string;
    expect(early).toMatch(/^\d\d:\d\d · moment \d+$/);
    expect(early.split(' · moment ')[1]).toBe(rows.get(early.slice(0, 5)));
    expect(labels[1]).toMatch(/^\d\d:\d\d( · moment \d+)?$/);
    // after the key moments, before the measured facts; and the learner handout has none of the card's strings
    const moments = v.el.querySelector('#db-moments') as Node;
    expect(moments.compareDocumentPosition(sec as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((sec as Node).compareDocumentPosition(v.el.querySelector('#db-facts') as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const handout = v.el.querySelector('#db-handout')?.textContent ?? '';
    for (const s of [...SHOW, ...OPENERS.map((o) => o.text), "From the card's author", 'Openers for the analysis']) expect(handout).not.toContain(s.trim());
  });

  it('/1: the handout is the same with and without hints', () => {
    const a = open(mhWith(undefined));
    const before = a.el.querySelector('#db-handout')?.innerHTML;
    a.leave?.();
    document.body.replaceChildren();
    const b = open(mhWith({ show: SHOW, openers: OPENERS }));
    leave = b.leave;
    expect(b.el.querySelector('#db-handout')?.innerHTML).toBe(before);
  });

  it('absent entirely when the card has no debriefHints; show alone prints no openers block; two left out read in the plural', () => {
    const a = open(mhWith(undefined));
    expect(a.el.querySelector('#db-hints')).toBeNull();
    expect(a.el.textContent).not.toContain("From the card's author");
    a.leave?.();
    document.body.replaceChildren();
    const b = open(mhWith({ show: ['Only this.'] }));
    expect(texts(b.el.querySelector('#db-hints'), 'h3')).toEqual(['What this case is built to show']);
    expect(b.el.querySelector('.db-hint-openers, .db-hint-left')).toBeNull();
    b.leave?.();
    document.body.replaceChildren();
    const c = open(mhWith({ openers: [{ at: 'state:arrest', text: 'x' }, { at: 'rosc', text: 'y' }] }));
    leave = c.leave;
    const sec = c.el.querySelector('#db-hints');
    expect(texts(sec, 'h3')).toEqual(['Openers for the analysis']);
    expect(sec?.querySelector('.db-hint-openers')).toBeNull();
    expect(sec?.querySelector('.db-hint-left')?.textContent).toBe('2 openers not shown: their events did not happen in this run');
  });

  it("/2: an opener's anchor is read as the report reads it (a phase's first entry, an action's graded taking); rosc did not happen", () => {
    const doc = { ...structuredClone(mhV2), debriefHints: { openers: [
      { at: 'phase:earlySigns', text: 'The early signs: what did you see?' },
      { at: 'action:nameMh', text: 'You named it here: what made you sure?' },
      { at: 'rosc', text: 'Not on this run.' },
    ] } };
    const v = open({
      ...emptyRun('M 35 y 80 kg', 80, 0), doc, format: 2,
      admin: [{ seq: 1, t: 492, source: 'action', actionId: 'nameMh', kind: 'communication', result: { accepted: true } }],
      phases: [{ id: 'baseline', t: 0, exitT: 377, rule: 'initial' }, { id: 'latent', t: 377, exitT: 483.2, rule: 'enter:latent' }, { id: 'earlySigns', t: 483.2, rule: 'enter:earlySigns' }],
      edges: [{ rule: 'phase:earlySigns', t: 463.2, value: true }],
      rows: [{ t: 0, kind: 'scenario', text: 'Scenario loaded: MH' }],
    } as unknown as RunData);
    leave = v.leave;
    const sec = v.el.querySelector('#db-hints');
    expect(texts(sec, '.db-hint-text')).toEqual(['The early signs: what did you see?', 'You named it here: what made you sure?']);
    expect(texts(sec, '.db-hint-at').map((x) => x?.slice(0, 5))).toEqual(['08:03', '08:12']);
    expect(sec?.querySelector('.db-hint-left')?.textContent).toBe('1 opener not shown: its event did not happen in this run');
  });
});
