import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNotices, noticeIds } from '../../../scripts/check-notices.ts';

const NOTICES = `# NOTICES
| ID | Item | Source URL | Licence | How used | Added on |
|---|---|---|---|---|---|
| N-001 | vite | https://github.com/vitejs/vite | MIT | build only | 2026-09-24 |
| N-007 | vf template | https://physionet.org/content/cudb/1.0.0/ | ODC-By 1.0 | template | 2026-09-24 |
`;

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'pme-notices-'));
  writeFileSync(join(root, 'NOTICES.md'), NOTICES);
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

describe('scripts/check-notices', () => {
  it('parses the IDs of NOTICES.md rows', () => {
    expect([...noticeIds(NOTICES)]).toEqual(['N-001', 'N-007']);
  });

  it('passes with no governed files, or when every header matches a row', () => {
    expect(checkNotices(fixture({}))).toEqual([]);
    const root = fixture({
      'packages/engine-core/templates/vf-01.json': 'NOTICE-ID: N-007\n{"fs":500}',
      'packages/renderer/src/vendor/thing.ts': '// NOTICE-ID: N-001\nexport {};',
    });
    expect(checkNotices(root)).toEqual([]);
  });

  it('fails when a header is missing or names an unknown ID', () => {
    const root = fixture({
      'packages/engine-core/templates/vf-02.json': '{"fs":500}',
      'packages/audio/src/vendor/x.ts': '// NOTICE-ID: N-999\n',
    });
    const problems = checkNotices(root);
    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toContain('vf-02.json: first line has no');
    expect(problems.join('\n')).toContain('N-999 is not a row');
  });

  it('ignores files outside the governed folders', () => {
    expect(checkNotices(fixture({ 'packages/audio/src/tones.ts': 'export {};' }))).toEqual([]);
  });
});
