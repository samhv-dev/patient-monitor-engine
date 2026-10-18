// Stage 8b: every complete JSON example in the guides is validated against the real schemas, so the guides cannot
// drift from the code. An example is a ```json block directly preceded by an `<!-- example: <schema> -->` line.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../controller/src/scenario/index.ts';
import { validate } from '../../skins/src/validate.ts';

const root = resolve(import.meta.dirname, '../../..');
const EXAMPLE_RE = /<!-- example: (pme-scenario\/1|pme-preset\/1|pme-theme\/1) -->\s*\n```json\n([\s\S]*?)\n```/g;
const examples = (file: string) => [...readFileSync(resolve(root, file), 'utf8').matchAll(EXAMPLE_RE)].map((m) => ({ schema: m[1] as string, doc: JSON.parse(m[2] as string) as unknown }));

describe('guide examples validate', () => {
  it('scenario-authoring.md: every pme-scenario/1 example passes validateScenario', () => {
    const ex = examples('docs/guides/scenario-authoring.md');
    expect(ex.length).toBeGreaterThanOrEqual(1);
    for (const e of ex) {
      const r = validateScenario(e.doc);
      expect(r.ok ? [] : r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    }
  });
  it('skin-authoring.md: every preset/theme example passes @pme/skins/validate', () => {
    const ex = examples('docs/guides/skin-authoring.md');
    expect(ex.length).toBeGreaterThanOrEqual(1);
    for (const e of ex) {
      const r = validate(e.schema === 'pme-preset/1' ? 'preset' : 'theme', e.doc);
      expect(r.errors).toEqual([]);
    }
  });
});
