// A card as a file (piece B2): the export is exactly the bytes docOf writes, in the library's own file format (an
// untouched /2 library card exports byte for byte as its file on disk); an import passes the validator or says why.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import mh from '../showcase/showcase-mh-v2.json';
import v1 from '../showcase/showcase-mh.json';
import { cardFileName, cardFileText, IMPORT_ERRORS_SHOWN, readCardFile } from './card-file.ts';
import { docOf, formOf } from './form.ts';

const onDisk = (f: string) => readFileSync(resolve(import.meta.dirname, '../showcase', f), 'utf8');

describe('export and import of a card file', () => {
  it('an untouched /2 library card exports as the very bytes of its file; an edited one as JSON.stringify of docOf, 2 spaces and a newline', () => {
    for (const f of ['showcase-mh-v2.json', 'showcase-haemorrhage-v2.json']) {
      const doc = JSON.parse(onDisk(f)) as object;
      expect(cardFileText(docOf(formOf(doc)))).toBe(onDisk(f));
    }
    const form = formOf(mh);
    form.fields.title = 'Edited';
    const doc = docOf(form);
    expect(cardFileText(doc)).toBe(`${JSON.stringify(doc, null, 2)}\n`);
    expect(cardFileName(doc)).toBe('showcase-mh-v2.json');
    expect(cardFileName({})).toBe('card.json');
  });

  it('an exported card imports back as the same document', () => {
    const doc = docOf(formOf({ ...mh, id: 'mh-copy' }));
    const r = readCardFile('mh-copy.json', cardFileText(doc));
    expect(r.ok && JSON.stringify(r.doc)).toBe(JSON.stringify(doc));
  });

  it('a file the validator refuses is not opened, and the refusal names the validator\'s lines', () => {
    expect(readCardFile('x.json', '{ not json')).toEqual({ ok: false, why: 'x.json was not opened: it is not a JSON file.', errors: [] });
    const bad = readCardFile('bad.json', JSON.stringify({ ...mh, title: '', takeHome: ['a', 'b', 'c', 'd', 'e'] }));
    expect(bad).toEqual({ ok: false, why: 'bad.json was not opened: the validator refuses it.', errors: ['/title: must NOT have fewer than 1 characters', '/takeHome: must NOT have more than 4 items'] });
    const many = readCardFile('many.json', JSON.stringify({ ...mh, phases: mh.phases.map((p) => ({ ...p, next: ['nowhere'] })) }));
    expect(!many.ok && many.errors.length).toBe(IMPORT_ERRORS_SHOWN + 1);
    expect(!many.ok && many.errors.at(-1)).toMatch(/^and \d+ more$/);
  });

  it('a /1 card is refused: the builder writes /2 only', () => {
    expect(readCardFile('mh.json', JSON.stringify(v1))).toEqual({ ok: false, why: 'mh.json was not opened: it is a pme-scenario/1 card, and the builder edits pme-scenario/2 cards only. Instructor v2 still runs it (Open a card file…).', errors: [] });
  });
});
