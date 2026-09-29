// Stage V.1 (G7b ruling 13, R50 review): docs/physiology/stage-v-lung-pathology-data.md is a GENERATED copy of the
// catalogue — this fails when the committed table and the generator's output differ.
// Regenerate: node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderCatalogueMd } from '../scripts/catalogue-md.ts';

describe('stage-v-lung-pathology-data.md is the generator\'s output', () => {
  it('the committed table equals renderCatalogueMd()', () => {
    const md = readFileSync(resolve(import.meta.dirname, '../../../docs/physiology/stage-v-lung-pathology-data.md'), 'utf8');
    expect(md).toBe(`${renderCatalogueMd()}\n`);
  });
});
