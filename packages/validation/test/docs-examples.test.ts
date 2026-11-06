// Stage 8b: every complete JSON example in the guides is validated against the real schemas, so the guides cannot
// drift from the code. An example is a ```json block directly preceded by an `<!-- example: <schema> -->` line.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../controller/src/scenario/index.ts';
import { validate } from '../../skins/src/validate.ts';

const root = resolve(import.meta.dirname, '../../..');
const EXAMPLE_RE = /<!-- example: (pme-scenario\/[12]|pme-preset\/1|pme-theme\/1) -->\s*\n```json\n([\s\S]*?)\n```/g;
const examples = (file: string) => [...readFileSync(resolve(root, file), 'utf8').matchAll(EXAMPLE_RE)].map((m) => ({ schema: m[1] as string, doc: JSON.parse(m[2] as string) as unknown }));

describe('guide examples validate', () => {
  it('scenario-authoring.md: every pme-scenario/1 and /2 example passes validateScenario, with no warning', () => {
    const ex = examples('docs/guides/scenario-authoring.md');
    expect(ex.filter((e) => e.schema === 'pme-scenario/1').length).toBeGreaterThanOrEqual(1);
    // the /2 section's one example card (plan F10): its tag is what it claims to be, so a /1 reader never validates it
    const v2 = ex.filter((e) => e.schema === 'pme-scenario/2');
    expect(v2.length).toBe(1);
    for (const e of v2) expect((e.doc as { schema?: unknown }).schema).toBe('pme-scenario/2');
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
