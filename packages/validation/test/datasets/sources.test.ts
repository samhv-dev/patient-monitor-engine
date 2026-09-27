import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SOURCES } from '../../src/datasets/sources.ts';
import { fetchZenodo, md5 } from '../../src/datasets/fetch-zenodo.ts';
import { cacheDir } from '../../src/datasets/cache.ts';

afterEach(() => vi.unstubAllGlobals());

describe('dataset registry (brief §8, R6)', () => {
  it('every source names its licence, attribution and NOTICES row', () => {
    for (const s of Object.values(SOURCES)) {
      expect(s.licence).toMatch(/CC BY 4.0|ODC-By 1.0|PDDL 1.0/);
      expect(s.attribution.length).toBeGreaterThan(40);
      expect(s.notice).toMatch(/^N-0\d\d$/);
      expect(readFileSync(join(import.meta.dirname, '../../../../NOTICES.md'), 'utf8')).toContain(`| ${s.notice} |`);
    }
  });
  it('the cache honours PME_DATASET_CACHE', () => {
    vi.stubEnv('PME_DATASET_CACHE', '/tmp/x-cache');
    expect(cacheDir()).toBe('/tmp/x-cache');
    vi.unstubAllEnvs();
    expect(cacheDir()).toMatch(/packages\/validation\/datasets\/cache$/);
  });
});

describe('Zenodo fetcher', () => {
  it('downloads once, verifies MD5, then serves the cache', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pme-z-'));
    const body = new TextEncoder().encode('a,b\n1,2\n');
    const f = vi.fn(async (_url: string) => new Response(body));
    vi.stubGlobal('fetch', f);
    const a = await fetchZenodo(dir, '2633175', 'x.csv', md5(body));
    const b = await fetchZenodo(dir, '2633175', 'x.csv', md5(body));
    expect(new TextDecoder().decode(a)).toBe('a,b\n1,2\n');
    expect(b.length).toBe(a.length);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0]?.[0]).toBe('https://zenodo.org/api/records/2633175/files/x.csv/content');
  });
  it('rejects a checksum mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pme-z-'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('tampered')));
    await expect(fetchZenodo(dir, '1', 'y.csv', '0'.repeat(32))).rejects.toThrow(/MD5 mismatch/);
  });
});
