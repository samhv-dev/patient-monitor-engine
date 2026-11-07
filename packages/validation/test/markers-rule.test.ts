// scripts/ci/markers.mjs: the two engineered-value markers (research/44 L2-61). `[ENG: kind]` is not physiology and
// names its kind; `[FIT: target; …]` is a value fitted to a physiological target and names a source or a brief id. The
// rule fails on a bare or variant `[ENG]`, an unknown kind, a FIT with neither, and ENG inside another tag.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script without type declarations
import { KINDS, scanText, scanTree } from '../../../scripts/ci/markers.mjs';

type Scan = { eng: Record<string, number>; fitSource: number; fitBrief: number; errors: { line: number; tag: string; why: string }[] };
const scan = (t: string) => scanText(t) as Scan;
// Tags are built at run time so that this file's own text holds no marker for the tree scan below.
const b = (s: string) => `[${s}]`;
const o = (s: string) => `[${s}`;

describe('engineered-value markers (scripts/ci/markers.mjs)', () => {
  it(`counts ${b('ENG: kind')} by kind and accepts a note after the kind`, () => {
    const r = scan(`a = 1; // ${b('ENG: numerics')}\nb = 2; // ${b('ENG: device; no vendor value found')}\nc = 3; // ${b('ENG: device')}`);
    expect(r.errors).toEqual([]);
    expect(r.eng).toEqual({ numerics: 1, device: 2 });
  });

  it(`fails a bare ${b('ENG')}, the old variants and an unknown kind`, () => {
    for (const t of [`x // ${b('ENG')}`, `x // ${b('ENG, fit to the class III band')}`, `x // ${b('ENG; Q5')}`, `x // ${b('ENG fit')}`, `x // ${b('ENG: tuned')}`]) {
      expect(scan(t).errors, t).toHaveLength(1);
    }
    expect(KINDS).toContain('numerics');
  });

  it(`a ${b('FIT')} must name a source or a brief id; it counts under each it names`, () => {
    expect(scan(`x // ${b('FIT: class III lactate band; brief research/44 L2-09')}`)).toMatchObject({ fitBrief: 1, fitSource: 0, errors: [] });
    expect(scan(`x // ${b('FIT: SBP fall with fentanyl; src Billard 1994')}`)).toMatchObject({ fitBrief: 0, fitSource: 1, errors: [] });
    expect(scan(`x // ${b('FIT: both; src Kitabchi 2009 (direction); brief research/44 L2-17')}`)).toMatchObject({ fitBrief: 1, fitSource: 1 });
    expect(scan(`x // ${b('FIT: a band the prototype hit')}`).errors).toHaveLength(1);
    expect(scan(`x // ${b('FIT')}`).errors).toHaveLength(1);
    expect(scan(`x // ${b('FIT: band; src the prototype')}`).errors).toHaveLength(1); // a source needs a year, §, chapter, page, PMID or note
  });

  it('reads a marker that runs over comment lines, and fails one never closed', () => {
    expect(scan(`// ${b('FIT: label SVR −17 % at 0.375 and\n// CO +30 % at 0.5; brief research/44 X-12')}\nx = 1;`)).toMatchObject({ fitBrief: 1, errors: [] });
    expect(scan(`// ${o('FIT: never closed; brief research/44 X-12')}\nx = 1;`).errors.map((e) => e.why)).toEqual(['unclosed']);
  });

  it('fails ENG folded into another tag, and skips a tag quoted in backticks (a mention)', () => {
    expect(scan(`// ${b('TXT; ENG size')}`).errors).toHaveLength(1);
    expect(scan(`// ${b('TXT shape')} ${b('FIT: rates; brief research/44 L2-17')}`).errors).toEqual([]);
    expect(scan('// carries `[ENG: kind]` or `[FIT]`; the old `[ENG]` is gone').errors).toEqual([]);
  });

  it('the tree (packages/, apps/) breaks no marker rule', () => {
    const r = scanTree(resolve(import.meta.dirname, '../../..')) as Scan;
    expect(r.errors).toEqual([]);
    expect(r.fitBrief + r.fitSource).toBeGreaterThan(0);
  });
});
