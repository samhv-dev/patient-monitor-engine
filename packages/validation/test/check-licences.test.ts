// Stage 8b: the dependency licence audit (brief §8, R6). Runtime (shipped) packages: permissive licences only, a
// NOTICES.md row naming the exact version AND the licence text in LICENSES/ (BUILD-PLAN Stage 8 acceptance 6);
// every LICENSES/ path NOTICES names must exist; build/test tools: permissive licences.
import { describe, expect, it } from 'vitest';
import { auditLicences, type LicenceReport } from '../../../scripts/check-licences.ts';

const NOTICES = '| N-010 | ajv 8.20.0 (runtime) | x | MIT | y | z |\n| N-012 | fast-uri 3.1.8 | x | BSD-3-Clause (text in `LICENSES/fast-uri-3.1.8.txt`) | y | z |';
const TEXTS = ['Apache-2.0.txt', 'ajv-8.20.0.txt', 'fast-uri-3.1.8.txt', 'left-pad-1.3.0.txt', 'minimatch-10.2.6.txt'];
const pkg = (name: string, v: string, license: string) => ({ name, versions: [v], license });

describe('scripts/check-licences auditLicences', () => {
  it('passes permissive licences with every shipped package named in NOTICES and its text in LICENSES/', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT')], 'BSD-3-Clause': [pkg('fast-uri', '3.1.8', 'BSD-3-Clause')] };
    const all: LicenceReport = { ...prod, 'Apache-2.0': [pkg('typescript', '5.9.3', 'Apache-2.0')], 'Python-2.0': [pkg('argparse', '2.0.1', 'Python-2.0')] };
    expect(auditLicences(all, prod, NOTICES, TEXTS)).toEqual([]);
  });
  it('fails a copyleft or unknown licence, and a shipped package missing from NOTICES', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT'), pkg('left-pad', '1.3.0', 'MIT')] };
    const all: LicenceReport = { ...prod, 'GPL-3.0': [pkg('gpl-thing', '1.0.0', 'GPL-3.0')], Unknown: [pkg('mystery', '0.1.0', 'Unknown')] };
    const problems = auditLicences(all, prod, NOTICES, TEXTS);
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/gpl-thing@1\.0\.0: licence "GPL-3\.0"/);
    expect(problems.join('\n')).toMatch(/mystery@0\.1\.0: licence "Unknown"/);
    expect(problems.join('\n')).toMatch(/left-pad 1\.3\.0: shipped at runtime but not named in NOTICES\.md/);
  });
  it('holds shipped packages to the runtime list (BlueOak is dev-only)', () => {
    const prod: LicenceReport = { 'BlueOak-1.0.0': [pkg('minimatch', '10.2.6', 'BlueOak-1.0.0')] };
    expect(auditLicences(prod, prod, 'minimatch 10.2.6', TEXTS)).toEqual(['minimatch@10.2.6: licence "BlueOak-1.0.0" is not in the runtime allow-list']);
  });
  it('fails a shipped package without its LICENSES/ text, and a LICENSES/ path in NOTICES that does not exist', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT')], 'Apache-2.0': [pkg('apache-thing', '2.0.0', 'Apache-2.0')] };
    const notices = `${NOTICES}\n| N-098 | apache-thing 2.0.0 | x | Apache-2.0 (text in \`LICENSES/Apache-2.0.txt\`) | y | z |\n| N-099 | gone | x | MIT (text in \`LICENSES/gone-1.0.0.txt\`) | y | z |`;
    expect(auditLicences(prod, prod, notices, ['Apache-2.0.txt', 'fast-uri-3.1.8.txt'])).toEqual([
      'ajv 8.20.0: shipped at runtime but LICENSES/ajv-8.20.0.txt is missing',
      'NOTICES.md names LICENSES/gone-1.0.0.txt, which is missing',
    ]);
  });
});
