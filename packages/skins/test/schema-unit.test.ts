import { describe, expect, it } from 'vitest';
import { obj, partialOf, skinSchema } from '../src/schema.ts';
import { validate } from '../src/validate.ts';

describe('schema helpers', () => {
  it('obj() closes the object and requires every non-optional key', () => {
    expect(obj({ a: { type: 'number' } }, { b: { type: 'string' } })).toEqual({
      type: 'object', properties: { a: { type: 'number' }, b: { type: 'string' } }, required: ['a'], additionalProperties: false,
    });
  });
  it('partialOf() strips every required list, recursively', () => {
    expect(JSON.stringify(partialOf(skinSchema))).not.toContain('"required"');
    expect(JSON.stringify(skinSchema)).toContain('"required"');
  });
});

describe('validate', () => {
  it('reports missing identity fields on an empty skin source', () => {
    const r = validate('skinSource', {});
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain("must have required property 'schema'");
  });
  it('refuses unknown top-level keys in a skin source', () => {
    const r = validate('skinSource', { schema: 'pme-skin/1', kind: 'skin', id: 'x-like', label: 'x', provenance: {}, logo: 'saadat.png' });
    expect(r.errors.join('\n')).toContain('(logo)');
  });
  it('refuses a provenance entry with an unknown tag', () => {
    const r = validate('skinSource', { schema: 'pme-skin/1', kind: 'skin', id: 'x-like', label: 'x', provenance: { background: { tag: 'guess', source: 'ENG' } } });
    expect(r.ok).toBe(false);
  });
});
