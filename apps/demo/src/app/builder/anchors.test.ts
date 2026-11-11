// The anchors of B5's sections (docs/plans/scenario-builder.md §5.2): each place offers the forms its schema accepts, every
// target is this card's own phase or action, and an anchor read and written again is the card's own value.
import { SCENARIO_SCHEMA_V2 } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../scenarios.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import { ANCHOR_USES, anchorPicks, anchorTargets, anchorWords, entryIdFrom, entryIdProblem, firstAnchor, readAnchor, writeAnchor, type AnchorUse } from './anchors.ts';

type Rec = Record<string, unknown>;
const MH = mhCard as unknown as Rec;
const DEFS = (SCENARIO_SCHEMA_V2 as { definitions: Record<string, Rec> }).definitions;
const pattern = (x: unknown) => new RegExp((x as { pattern: string }).pattern);

describe('the anchor forms each place accepts', () => {
  it('are the schema’s: a script entry’s `on`, an outcome’s anchor, a debrief line’s `at`', () => {
    const on = ((DEFS.scriptEntry as { properties: Rec }).properties.on as { anyOf: unknown[] }).anyOf;
    const at = ((DEFS.debriefHints as { properties: Rec }).properties.openers as { items: { properties: Rec } }).items.properties.at;
    const anchor = (DEFS.anchor as { anyOf: unknown[] }).anyOf[0];
    const card = { phases: [{ id: 'p1' }], actions: [{ id: 'a1', label: 'A' }] };
    const written = (use: AnchorUse) => ANCHOR_USES[use].filter((p) => p !== 'rule').map((p) => writeAnchor(firstAnchor(card, p)));
    for (const v of written('script')) expect(typeof v === 'string' ? pattern(on[0]).test(v) : 'atScenarioS' in (v as Rec)).toBe(true);
    for (const v of written('debrief')) expect(pattern(at).test(String(v))).toBe(true);
    for (const v of written('outcome')) expect(pattern(anchor).test(String(v))).toBe(true);
    expect(ANCHOR_USES.script).toEqual(['phase', 'taking', 'atScenarioS']);
    expect(ANCHOR_USES.debrief).toEqual(['start', 'phase', 'action', 'pulseLoss', 'rosc']);
    expect(ANCHOR_USES.outcome).toEqual(['start', 'phase', 'action', 'pulseLoss', 'rosc', 'rule']);
  });

  it('read and written again are the card’s own value, for every anchor of the library’s scripts', () => {
    const ons = LIBRARY.flatMap((c) => ((c.doc as unknown as Rec).script as Rec[] | undefined) ?? []).map((s) => s.on);
    expect([...ons].sort()).toEqual(['action:induce#1', 'phase:bleeding', 'phase:decompensating']);
    for (const on of [...ons, { atScenarioS: 90 }, 'action:x#12']) expect(writeAnchor(readAnchor(on, 'script')!)).toEqual(on);
    for (const at of ['start', 'pulseLoss', 'rosc', 'phase:a', 'action:b']) expect(writeAnchor(readAnchor(at, 'debrief')!)).toBe(at);
  });

  it('a form the place does not take is not read (the card keeps it, the picker names it)', () => {
    expect(readAnchor('start', 'script')).toBeNull();
    expect(readAnchor('action:induce#1', 'debrief')).toBeNull();
    expect(readAnchor({ atScenarioS: 3 }, 'outcome')).toBeNull();
    expect(readAnchor({ rule: { visited: 'x' } }, 'outcome')).toEqual({ pick: 'rule' });
    expect(readAnchor({ rule: { visited: 'x' } }, 'debrief')).toBeNull();
  });

  it('offer only this card’s own phases and actions, and a phase or action form only when the card has one', () => {
    expect(anchorTargets(MH, 'phase').map(([id]) => id)).toEqual((MH.phases as Rec[]).map((p) => p.id));
    expect(anchorTargets(MH, 'action').map(([id]) => id)).toEqual((MH.actions as Rec[]).map((a) => a.id));
    expect(anchorTargets(MH, 'phase')[2]).toEqual(['earlySigns', 'Early signs']);
    expect(anchorPicks({ phases: [] }, 'debrief')).toEqual(['start', 'pulseLoss', 'rosc']);
    expect(anchorPicks({ phases: [] }, 'script')).toEqual(['atScenarioS']);
  });

  it('in words', () => {
    expect(anchorWords(MH, 'action:induce#1', 'script')).toBe(`the 1st taking of ${String((MH.actions as Rec[])[2]!.label)}`);
    expect(anchorWords(MH, 'phase:earlySigns', 'debrief')).toBe('Early signs entered');
    expect(anchorWords(MH, { atScenarioS: 125 }, 'script')).toBe('2:05 after the start');
    expect(anchorWords(MH, 'rosc', 'outcome')).toBe('the return of circulation');
  });
});

describe('entry ids', () => {
  it('from words, unique; refused when taken or not an id', () => {
    const xs = [{ id: 'etco2Down' }];
    expect(entryIdFrom(xs, 'EtCO2 down', 'outcome')).toBe('etco2Down2');
    expect(entryIdFrom(xs, '92 %', 'outcome')).toBe('outcome');
    expect(entryIdProblem(xs, -1, 'etco2Down')).toBe('another entry has this id');
    expect(entryIdProblem(xs, 0, 'etco2Down')).toBeNull();
    expect(entryIdProblem(xs, -1, '1x')).toMatch(/^an id starts with a letter/);
  });
});
