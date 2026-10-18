// The model documentation and the known-miss index are generated from the code and must be regenerated in the same
// change as the code (scripts/model-docs.ts, scripts/known-misses.ts). This test fails when a committed page differs
// from what the generators produce now, when a test file or an engine source file belongs to no module, or when a
// hand-written block's markers are broken (the generator would otherwise drop its text).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { testFiles } from '../../../scripts/deviations.ts';
import { renderKnownMisses } from '../../../scripts/known-misses.ts';
import { renderAll } from '../../../scripts/model-docs.ts';
import { MODULES, moduleOfSource, ownerOfTest } from '../../../scripts/model-modules.ts';

const root = resolve(import.meta.dirname, '../../..');
const read = (p: string) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const regen = 'run: node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts';

describe('model documentation is generated from the code', () => {
  it('docs/validation/known-misses.md is current', () => {
    expect(read('docs/validation/known-misses.md') === renderKnownMisses(root), regen).toBe(true);
  });
  it('every docs/model page is current (hand blocks kept as written)', async () => {
    const pages = await renderAll(root);
    const stale = [...pages].filter(([p, text]) => read(p) !== text).map(([p]) => p);
    expect(stale, regen).toEqual([]);
    const orphans = readdirSync(join(root, 'docs/model')).map((f) => `docs/model/${f}`).filter((p) => !pages.has(p));
    expect(orphans).toEqual([]);
  });
  it('every hand block opens and closes once, with the names the generator expects', () => {
    for (const m of MODULES) {
      const page = read(`docs/model/${m.id}.md`);
      const opens = [...page.matchAll(/<!-- hand:([\w-]+) -->/g)].map((x) => x[1]);
      const closes = [...page.matchAll(/<!-- \/hand:([\w-]+) -->/g)].map((x) => x[1]);
      expect({ page: m.id, opens, closes }).toEqual({ page: m.id, opens: ['purpose', 'equations', 'related'], closes: ['purpose', 'equations', 'related'] });
    }
  });
  it('every test file belongs to a module', () => {
    const none = testFiles(root).map((f) => relative(root, f)).filter((f) => ownerOfTest(f).rule === 'none');
    expect(none).toEqual([]);
  });
  it('every engine and ventilator source file belongs to a module, and every listed test exists', () => {
    const walk = (d: string): string[] => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
    const src = ['packages/engine-core/src', 'packages/engine-core/data', 'packages/ventilator/src'].flatMap(walk).filter((f) => f.endsWith('.ts'));
    expect(src.filter((f) => !moduleOfSource(f))).toEqual([]);
    expect(MODULES.flatMap((m) => m.tests ?? []).filter((f) => !existsSync(join(root, f)))).toEqual([]);
  });
});
