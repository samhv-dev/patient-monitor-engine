import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VF_SCALE, VF_TEMPLATES } from '../../../engine-core/templates/vf-cudb.ts';
import { AF_SCALE, AF_TEMPLATES } from '../../../engine-core/templates/af-mitdb.ts';
import { decodeTemplates } from '../../../engine-core/src/l2/ecg/texture.ts';
import { dominantHz, rms } from '../../../engine-core/src/util/dsp.ts';
import { noticeIds } from '../../../../scripts/check-notices.ts';

const root = resolve(import.meta.dirname, '../../../..');

describe('bundled templates (acceptance 9: provenance)', () => {
  it.each([
    ['vf-cudb.ts', 'N-050', 6, VF_SCALE, VF_TEMPLATES, [3.5, 7]],
    ['af-mitdb.ts', 'N-051', 4, AF_SCALE, AF_TEMPLATES, [4, 9]],
  ] as const)('%s: NOTICE-ID row exists, attribution present, unit RMS at 500 Hz, dominant frequency in band', (file, id, n, scale, items, band) => {
    const text = readFileSync(resolve(root, 'packages/engine-core/templates', file), 'utf8');
    expect(text.split('\n')[0]).toBe(`// NOTICE-ID: ${id}`);
    expect(text).toContain('Open Data Commons Attribution License v1.0');
    expect(noticeIds(readFileSync(resolve(root, 'NOTICES.md'), 'utf8')).has(id)).toBe(true);
    expect(items).toHaveLength(n);
    for (const t of decodeTemplates({ scale, items })) {
      expect(t.x.length).toBe(4000); // 8 s at 500 Hz
      expect(rms(t.x)).toBeCloseTo(1, 2);
      const f = dominantHz(t.x, 500, 1, 12);
      expect(f).toBeGreaterThanOrEqual(band[0]);
      expect(f).toBeLessThanOrEqual(band[1]);
      expect(Math.abs(f - t.fdomHz)).toBeLessThan(0.3);
    }
  });
});
