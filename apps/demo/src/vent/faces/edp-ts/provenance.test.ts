// Plan vent-skin-edp-ts.md V1, test (6): the provenance coverage of face.json (§5, the skins' rule copied). Every leaf
// carries {v, p, src}; `src` names rows that EXIST in research/57-edp-ts-ventilator.md (its tables, parsed here) or in
// the plan's gap table (docs/plans/vent-skin-edp-ts.md §3.3); and the leaf's tag agrees with the row's in both
// directions: a `documented` leaf cites only rows read in the manual, a figure, a photograph or the video (M, F, P, V),
// a `measured` one only colour samples (meas), an `eng` one says why, and a `sim` one (the simulator's own words) cites
// the plan. The face's stylesheet holds no colour of its own (face.ts sets them from face.json), and every gap and reason
// the control table names exists.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTROLS, WINDOWS } from './controls.ts';
import FACE from './face.json';

const root = resolve(import.meta.dirname, '../../../../../..');
const note = readFileSync(resolve(root, 'research/57-edp-ts-ventilator.md'), 'utf8');
const plan = readFileSync(resolve(root, 'docs/plans/vent-skin-edp-ts.md'), 'utf8');

/** research/57's rows: id → its tag (the last cell). */
const ROWS = new Map<string, string>();
for (const line of note.split('\n')) {
  const m = /^\| ([A-Z]-\d\d) \|.*\| ([A-Za-z]+) \|\s*$/.exec(line);
  if (m) ROWS.set(m[1] as string, m[2] as string);
}
const GAPS = new Set([...plan.matchAll(/^\| (G[MPDAX]\d+) \|/gm)].map((m) => m[1] as string));
const SECTIONS = new Set([...plan.matchAll(/^#{2,3} (\d+(?:\.\d+)?)\b/gm)].map((m) => `§${m[1]}`));

interface Leaf { v: unknown; p: string; src: string; why?: string }
const leaves: Array<[string, Leaf]> = [];
const walk = (o: unknown, path: string) => {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    if ('v' in o && 'p' in o) return void leaves.push([path, o as Leaf]);
    for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) walk(v, `${path}.${k}`);
    return;
  }
  leaves.push([path, { v: o, p: 'MISSING', src: '' }]);
};
walk(FACE, 'face');

describe('face.json: every leaf is sourced', () => {
  it('parses the note and the plan (the test sees what it checks)', () => {
    expect(ROWS.size).toBeGreaterThan(250);
    expect(ROWS.get('T-01')).toBe('M');
    expect(ROWS.get('C-10')).toBe('meas');
    expect(ROWS.get('T-24')).toBe('GAP');
    expect(GAPS.has('GM1') && GAPS.has('GX19')).toBe(true);
    expect(leaves.length).toBeGreaterThan(200);
  });

  it.each(leaves)('%s', (_path, l) => {
    expect(['documented', 'measured', 'inferred', 'eng', 'sim']).toContain(l.p);
    if (l.p === 'sim') {
      const m = /^plan (.+)$/.exec(l.src);
      expect(m, l.src).not.toBeNull();
      for (const id of (m![1] as string).split(', ')) expect(GAPS.has(id) || SECTIONS.has(id), id).toBe(true);
      return;
    }
    const m = /^research\/57 (.+)$/.exec(l.src);
    expect(m, l.src).not.toBeNull();
    const tags = (m![1] as string).split(', ').map((id) => {
      expect(ROWS.has(id), `${id} is a row of research/57`).toBe(true);
      return ROWS.get(id) as string;
    });
    if (l.p === 'documented') for (const t of tags) expect(['M', 'F', 'P', 'V'], `${l.src} (${t})`).toContain(t);
    if (l.p === 'measured') for (const t of tags) expect(t).toBe('meas');
    if (l.p === 'eng' || l.p === 'inferred') expect(l.why ?? '', 'an eng or inferred leaf says why').not.toBe('');
  });
});

describe('the control table and the windows name real reasons and gap rows', () => {
  const reasons = FACE.reasons as Record<string, unknown>;
  const words = FACE.words as Record<string, unknown>;
  it('every unavailable control', () => {
    for (const c of CONTROLS) {
      if (c.kind === 'unavailable') { expect(reasons[c.reason], c.id).toBeDefined(); expect(GAPS.has(c.gap), c.gap).toBe(true); }
      if (c.kind === 'action') expect(GAPS.has(c.gap), c.gap).toBe(true);
      if ('word' in c && c.word) expect(words[c.word], c.id).toBeDefined();
    }
  });
  it('every window row', () => {
    for (const [id, w] of Object.entries(WINDOWS)) {
      expect(words[w.title], id).toBeDefined();
      for (const r of w.rows) {
        expect(words[r.word], `${id}/${r.word}`).toBeDefined();
        if ('reason' in r) { expect(reasons[r.reason]).toBeDefined(); expect(GAPS.has(r.gap), r.gap).toBe(true); }
        if (r.kind === 'limits' && r.off) { expect(reasons[r.off.reason]).toBeDefined(); expect(GAPS.has(r.off.gap)).toBe(true); }
      }
    }
  });
});

describe('the face draws no colour, word or number of its own', () => {
  const src = (f: string) => readFileSync(resolve(import.meta.dirname, f), 'utf8');
  it('face.css: colours only through the custom properties face.ts sets from face.json', () => {
    const css = src('face.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) ?? []).toEqual([]);
    for (const [, name] of css.matchAll(/var\(--edp-([a-zA-Z]+)\)/g)) expect((FACE.colours as Record<string, unknown>)[name as string], name).toBeDefined();
  });
  it('face.ts: no string literal shown on the face (words come from face.json through word() and reason())', () => {
    const ts = src('face.ts');
    // canvas text and DOM text: every fillText and every text node argument is a word(), a number, or a format
    expect(ts.match(/fillText\('/g) ?? []).toEqual([]);
    expect(ts.match(/#[0-9a-fA-F]{6}\b/g) ?? []).toEqual([]);
  });
});
