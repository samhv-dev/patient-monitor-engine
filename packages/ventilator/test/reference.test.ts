// Provenance of the fork (R35, NOTICES N-060): the reference copy is byte-identical to ventilator-simulator
// commit 65d80b6's ventilator-sim-hamilton.html (v1.9), and carries the author's MIT grant beside it.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ref = (f: string) => resolve(import.meta.dirname, '../reference', f);

describe('ventilator-simulator reference copy', () => {
  it('is v1.9 exactly (sha256) and has its licence', () => {
    const sha = createHash('sha256').update(readFileSync(ref('ventilator-sim-hamilton.v1.9.html'))).digest('hex');
    expect(sha).toBe('47b31a2304b94c1e93142c822c10dd405c0fd5f8588821c26d144997de347472');
    expect(readFileSync(ref('LICENSE'), 'utf8')).toMatch(/MIT License\s+Copyright \(c\) 2026 Ali Mahdavi/);
  });
});
