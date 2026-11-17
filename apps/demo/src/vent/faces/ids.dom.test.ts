// @vitest-environment happy-dom
// The faces' ids and names (ids.ts) are the registry's: Room setup's names are the faces' own, and an address names one.
import { describe, expect, it } from 'vitest';
import { DEFAULT_FACE, FACE_CHOICES, faceFromLocation, faceOf } from './ids.ts';
import { FACES } from './index.ts';

describe("the ventilator's faces by id and name", () => {
  it("every choice is a face of the registry, under the face's own name, and every face is a choice", () => {
    expect(FACE_CHOICES.map((c) => [c.id, c.label])).toEqual(Object.entries(FACES).map(([id, f]) => [id, f.spec.label]));
    expect(FACE_CHOICES.map((c) => c.id)).toContain(DEFAULT_FACE);
  });
  it('an address or a stored value names a face; anything else is the default', () => {
    expect(faceFromLocation({ search: '?link=AB2CD3&face=edp-ts' })).toBe('edp-ts');
    expect(faceFromLocation({ search: '?link=AB2CD3' })).toBe(DEFAULT_FACE);
    for (const v of ['servo', '', null, 7, undefined]) expect(faceOf(v), String(v)).toBe(DEFAULT_FACE);
  });
});
