// FU-11 Task J4 (external review F23): validation cannot certify an invalid result as green.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchZenodo, md5 } from '../../src/datasets/fetch-zenodo.ts';

describe('FU-11 J4: cached dataset bytes are checked (F23)', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('a corrupt cache entry is fetched again; a good one needs no network', async () => {
    const cache = mkdtempSync(join(tmpdir(), 'pme-fu11-'));
    const good = new TextEncoder().encode('the real bytes');
    mkdirSync(join(cache, 'zenodo-1'), { recursive: true });
    writeFileSync(join(cache, 'zenodo-1', 'f.bin'), 'corrupt');
    const fetch = vi.fn(async () => new Response(good));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchZenodo(cache, '1', 'f.bin', md5(good))).toEqual(good);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await fetchZenodo(cache, '1', 'f.bin', md5(good))).toEqual(good);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
