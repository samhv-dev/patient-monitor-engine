import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(import.meta.dirname, '../../../src/l2/blood');
const NOTICES = readFileSync(join(import.meta.dirname, '../../../../../NOTICES.md'), 'utf8');

describe('R34: ported files carry the Apache header and a NOTICES row', () => {
  for (const f of ['odc.ts', 'acid-base.ts', 'fluids.ts']) {
    it(f, () => {
      const head = readFileSync(join(DIR, f), 'utf8').slice(0, 1500);
      expect(head.startsWith('// SPDX-License-Identifier: Apache-2.0')).toBe(true);
      expect(head).toContain('Pulse Physiology Engine 4.3.2 (commit e8a3649)');
      expect(head).toContain('Kitware, Inc.');
      expect(head).toContain('BioGears 6.1.1');
      const id = /NOTICES (N-P\d{2})/.exec(head)?.[1]; // R51 addendum 14: Pulse-derived rows use N-P##
      expect(id).toBeDefined();
      expect(NOTICES).toMatch(new RegExp(`^\\|\\s*${id}\\s*\\|`, 'm'));
    });
  }
  it('no Pulse molar-mass defect: K is 39.098', () => {
    expect(readFileSync(join(DIR, 'params.ts'), 'utf8')).toContain('k: 39.098');
    for (const f of ['params.ts', 'solutes.ts', 'labs.ts']) expect(readFileSync(join(DIR, f), 'utf8')).not.toMatch(/k:\s*31\.1/);
  });
});
