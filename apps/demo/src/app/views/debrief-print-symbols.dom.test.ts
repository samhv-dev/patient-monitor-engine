// @vitest-environment happy-dom
// Brief 113 (P-S6): the printed symbols come from the bundled "Print Symbols" faces (debrief.css), and the view loads
// exactly the code points those faces declare (PRINT_SYMBOLS, debrief.ts): a face with a unicode-range loads only for
// text it covers, so a symbol added to one list and not the other would print from a system font again.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRINT_SYMBOLS } from './debrief.ts';

const css = readFileSync(join(import.meta.dirname, 'debrief.css'), 'utf8');
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1] as string).filter((b) => /font-family:\s*'Print Symbols'/.test(b));
const range = (block: string): number[] =>
  (/unicode-range:\s*([^;]+);/.exec(block)?.[1] ?? '').split(',').flatMap((r) => {
    const [a, b] = r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16)) as [number, number?];
    return Array.from({ length: (b ?? a) - a + 1 }, (_, i) => a + i);
  });

describe('the bundled print symbols', () => {
  it('two faces, each file present, their ranges disjoint and together exactly the code points the view loads', () => {
    expect(faces).toHaveLength(2);
    for (const f of faces) expect(existsSync(join(import.meta.dirname, /url\('([^']+)'\)/.exec(f)?.[1] as string))).toBe(true);
    const [a, b] = faces.map(range) as [number[], number[]];
    expect(a.filter((c) => b.includes(c))).toEqual([]);
    expect([...a, ...b].sort((x, y) => x - y)).toEqual([...PRINT_SYMBOLS].map((c) => c.codePointAt(0)).sort((x, y) => (x as number) - (y as number)));
  });
  it('every print stack names them after Inter Print (and Vazirmatn)', () => {
    const stacks = [...css.matchAll(/font-family:\s*((?:'Vazirmatn', )?'Inter Print',[^;}]*)/g)].map((m) => m[1] as string);
    expect(stacks.length).toBeGreaterThanOrEqual(4);
    for (const s of stacks) expect(s, s).toMatch(/'Inter Print', 'Print Symbols'/);
  });
});
