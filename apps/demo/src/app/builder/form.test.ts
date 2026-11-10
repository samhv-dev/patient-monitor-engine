// formOf/docOf (scenario builder B1, docs/plans/scenario-builder.md §5.1): the round trip is lossless on every card of the
// library, key order included, so a card the author opens and saves untouched keeps its bytes; unknown fields are carried.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../scenarios.ts';
import { docOf, formOf, sectionOf } from './form.ts';

const FILES = {
  ...import.meta.glob<string>('../showcase/*.json', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob<string>('../../../../../packages/controller/scenarios/*.json', { eager: true, query: '?raw', import: 'default' }),
};
const fileOf = (id: string): string => {
  const hit = Object.entries(FILES).find(([p, text]) => !p.endsWith('.schema.json') && (JSON.parse(text) as { id: string }).id === id);
  if (!hit) throw new Error(`no file for ${id}`);
  return hit[1];
};

describe('the library the proof runs on', () => {
  it('holds the 20 cards the plan counts (2 in pme-scenario/2, 18 in /1)', () => {
    expect(LIBRARY).toHaveLength(20);
    expect(LIBRARY.filter((c) => (c.doc as { schema: string }).schema === 'pme-scenario/2').map((c) => c.id).sort()).toEqual(['showcase-haemorrhage-v2', 'showcase-mh-v2']);
  });
});

describe('docOf(formOf(doc)) is the card, for every card of the library', () => {
  for (const card of LIBRARY) {
    it(`${card.id}: deep-equal, the same JSON text (key order at every level), and the file's own value`, () => {
      const back = docOf(formOf(card.doc));
      expect(back).toStrictEqual(card.doc);
      expect(JSON.stringify(back)).toBe(JSON.stringify(card.doc));
      // the bytes on disk parse to the same text: the library's module is the file
      expect(JSON.stringify(back)).toBe(JSON.stringify(JSON.parse(fileOf(card.id))));
    });
  }

  it("a file written as JSON.stringify(doc, null, 2) comes back byte for byte (8 of the 20 are written that way; the other 12 are hand-wrapped, which no serialiser reproduces)", () => {
    const canonical = LIBRARY.filter((c) => fileOf(c.id) === `${JSON.stringify(JSON.parse(fileOf(c.id)), null, 2)}\n`);
    expect(canonical.map((c) => c.id).sort()).toEqual([
      'depth-awareness', 'depth-light-anaesthesia', 'depth-opioid-apnoea', 'nmb-mh-trigger', 'nmb-residual-block', 'nmb-sux-burn',
      'showcase-haemorrhage-v2', 'showcase-mh-v2',
    ]);
    for (const c of canonical) expect(`${JSON.stringify(docOf(formOf(c.doc)), null, 2)}\n`).toBe(fileOf(c.id));
  });

  it("every src line of the /2 cards survives (V1: on actions, phases, outcomes and script entries)", () => {
    for (const card of LIBRARY.filter((c) => (c.doc as { schema: string }).schema === 'pme-scenario/2')) {
      const srcs = (t: unknown) => JSON.stringify(t).match(/"src":"(?:[^"\\]|\\.)*"/g) ?? [];
      expect(srcs(docOf(formOf(card.doc)))).toEqual(srcs(card.doc));
      expect(srcs(card.doc).length).toBeGreaterThan(10);
    }
  });

  it('every $comment of the /2 cards survives (each phase, action, script entry that carries one)', () => {
    for (const card of LIBRARY.filter((c) => (c.doc as { schema: string }).schema === 'pme-scenario/2')) {
      const count = (t: string) => (t.match(/"\$comment"/g) ?? []).length;
      expect(count(JSON.stringify(docOf(formOf(card.doc))))).toBe(count(JSON.stringify(card.doc)));
      expect(count(JSON.stringify(card.doc))).toBeGreaterThan(10);
    }
  });
});

describe('the form', () => {
  const mh = LIBRARY.find((c) => c.id === 'showcase-mh-v2')!.doc;

  it('puts each top-level block in its section, and carries what the /2 form does not edit', () => {
    const f = formOf(mh);
    expect(f.order).toEqual(Object.keys(mh));
    expect(f.fields.phases).toHaveLength(9);
    expect(f.fields.actions).toHaveLength(17);
    expect(f.carried).toEqual({});
    expect(sectionOf('title')).toBe('header');
    expect(sectionOf('device')).toBe('patient');
    expect(sectionOf('debriefHints')).toBe('debrief');
    expect(sectionOf('states')).toBe('carried');
    // a /1 card: its states, transitions and objectives are carried whole, never dropped (B7 ports them)
    const v1 = LIBRARY.find((c) => c.id === 'showcase-mh')!.doc;
    const g = formOf(v1);
    expect(Object.keys(g.carried)).toEqual(expect.arrayContaining(['states', 'initialState']));
    expect(docOf(g)).toStrictEqual(v1);
  });

  it('an unknown field is carried at every level: top level, an entry, deep inside a block', () => {
    const doc = JSON.parse(JSON.stringify(mh)) as Record<string, unknown> & { phases: Array<Record<string, unknown>>; actions: Array<Record<string, unknown>> };
    doc.judged = [{ id: 'old' }];
    doc.phases[1]!.futureField = { x: 1 };
    (doc.actions[8]!.drug as Record<string, unknown>).later = true;
    const back = docOf(formOf(doc));
    expect(back).toStrictEqual(doc);
    expect(JSON.stringify(back)).toBe(JSON.stringify(doc));
    expect(formOf(doc).carried).toEqual({ judged: [{ id: 'old' }] });
  });

  it('is a copy: editing the form never changes the card it came from, and the written document is not the form', () => {
    const before = JSON.stringify(mh);
    const f = formOf(mh);
    f.fields.title = 'Edited';
    f.fields.phases![1]!.label = 'Edited';
    expect(JSON.stringify(mh)).toBe(before);
    const out = docOf(f);
    (out.phases as Array<{ label: string }>)[1]!.label = 'Again';
    expect(f.fields.phases![1]!.label).toBe('Edited');
  });

  it('key order after an edit: a changed field keeps its place; a new field comes last in its object; a new block follows the existing ones in the schema order', () => {
    const f = formOf(mh);
    f.fields.title = 'Edited';
    f.fields.phases![2]!.holdS = 30;
    f.fields.phases![2]!.$comment = undefined;
    f.fields.phases![0]!.holdS = 5;
    f.fields.outcomes = [];
    f.fields.debriefHints = { show: ['etco2'] };
    const out = docOf(f) as unknown as Record<string, unknown> & { phases: Array<Record<string, unknown>> };
    expect(Object.keys(out)).toEqual([...Object.keys(mh), 'debriefHints', 'outcomes']);
    expect(out.title).toBe('Edited');
    const p2 = (mh as unknown as { phases: Array<Record<string, unknown>> }).phases[2]!;
    expect(Object.keys(out.phases[2]!)).toEqual(Object.keys(p2).filter((k) => k !== '$comment'));
    expect(Object.keys(out.phases[0]!).at(-1)).toBe('holdS');
  });

  it('a field set to undefined is not written; array order is the form\'s own (next and action order are never re-sorted)', () => {
    const f = formOf(mh);
    f.fields.notes = undefined;
    const next = f.fields.phases![2]!.next!;
    next.reverse();
    const out = docOf(f);
    expect('notes' in out).toBe(false);
    expect(out.phases[2]!.next).toEqual(next);
    expect(out.actions.map((a) => a.id)).toEqual((mh as unknown as { actions: Array<{ id: string }> }).actions.map((a) => a.id));
  });
});
