// The committed manifests hold ids, times and hashes only (brief §8), and enough to match an engine run.
import { describe, expect, it } from 'vitest';
import { readManifest } from '../../src/datasets/manifest.ts';

describe.each(['vitaldb', 'mghdb'] as const)('%s manifest', (source) => {
  const m = readManifest(source);
  it('exists and lists hashed files', () => {
    expect(m).not.toBeNull();
    for (const h of Object.values(m?.files ?? {})) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('every window carries matching targets and a known record', () => {
    for (const w of m?.windows ?? []) {
      expect(w.toS - w.fromS).toBe(300);
      expect(w.sbp).toBeGreaterThan(w.dbp);
      expect(Object.keys(m?.files ?? {}).some((f) => f.includes(w.record))).toBe(true);
    }
  });
  it('contains no sample data (small file)', () => {
    expect(JSON.stringify(m).length).toBeLessThan(200_000);
  });
});
