// CHANGELOG fragments (research/42 §1.4 c): a pull request writes one small file under changes/unreleased/ instead of a
// line in CHANGELOG.md's Unreleased section, so two PRs never conflict there; scripts/changelog-assemble.ts turns the
// fragments into the dated section at release. This file checks the parser and the assembler on fixtures, and the
// repository itself: every fragment parses, and CHANGELOG.md's Unreleased section stays empty.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HEADINGS, assemble, assembleRepo, parseFragment, readFragments, sectionHeadings, unreleasedEntries,
} from '../../../scripts/changelog-assemble.ts';

const root = resolve(import.meta.dirname, '../../..');

const LOG = `# Changelog

Intro.

## [Unreleased]

## [1.0.0-rc.5] - 2026-11-05

### Added

- old entry

[Unreleased]: https://example.org/r/compare/v1.0.0-rc.5...HEAD
[1.0.0-rc.5]: https://example.org/r/compare/v1.0.0-rc.4...v1.0.0-rc.5
`;

describe('parseFragment', () => {
  it('reads lines under known headings, verbatim, several headings allowed', () => {
    const f = parseFragment('### Fixed\n- a fix\n  continued\n\n### Added\n\n- **new** thing\n', 'x.md');
    expect(f.errors).toEqual([]);
    expect(f.entries).toEqual([
      { heading: 'Fixed', lines: ['- a fix', '  continued'] },
      { heading: 'Added', lines: ['- **new** thing'] },
    ]);
  });
  it('refuses an unknown heading, an empty heading, a version heading, text before a heading, an empty file', () => {
    expect(parseFragment('### Improved\n- x\n', 'a.md').errors[0]).toMatch(/a\.md:1: unknown heading "### Improved"/);
    expect(parseFragment('### Added\n\n### Fixed\n- x\n', 'b.md').errors).toEqual(['b.md:1: "### Added" has no lines']);
    expect(parseFragment('### Added\n- x\n## [1.0.0] - 2026-01-01\n', 'c.md').errors[0]).toMatch(/c\.md:3: a version heading/);
    expect(parseFragment('- x\n### Added\n- y\n', 'd.md').errors[0]).toMatch(/d\.md:1: a line before the first heading/);
    expect(parseFragment('\n\n', 'e.md').errors).toEqual(['e.md: empty fragment']);
  });
});

describe('assemble', () => {
  const frags = [
    { name: 'b-topic.md', text: '### Fixed\n- fix b\n\n### Added\n- add b\n' },
    { name: 'a-topic.md', text: '### Removed\n- gone a\n### Added\n- add a\n  more a\n' },
  ];
  it('writes the dated section under Unreleased, headings in the repo order, fragments by file name', () => {
    const { changelog, section } = assemble(LOG, frags, '1.0.0-rc.6', '2026-11-20');
    expect(section).toBe(
      '## [1.0.0-rc.6] - 2026-11-20\n\n### Added\n\n- add a\n  more a\n- add b\n\n### Removed\n\n- gone a\n\n### Fixed\n\n- fix b\n',
    );
    expect(changelog).toContain(`## [Unreleased]\n\n${section}\n## [1.0.0-rc.5] - 2026-11-05`);
    expect(changelog).toContain('[Unreleased]: https://example.org/r/compare/v1.0.0-rc.6...HEAD\n'
      + '[1.0.0-rc.6]: https://example.org/r/compare/v1.0.0-rc.5...v1.0.0-rc.6\n[1.0.0-rc.5]:');
    expect(unreleasedEntries(changelog)).toEqual([]);
  });
  it('refuses while Unreleased has lines, a version already present, a bad date, a fragment that does not parse', () => {
    const dirty = LOG.replace('## [Unreleased]\n', '## [Unreleased]\n\n### Added\n- stray\n');
    expect(() => assemble(dirty, frags, '1.0.0-rc.6', '2026-11-20')).toThrow(/Unreleased section still has 2 lines/);
    expect(() => assemble(LOG, frags, '1.0.0-rc.5', '2026-11-20')).toThrow(/already has a \[1\.0\.0-rc\.5\] section/);
    expect(() => assemble(LOG, frags, '1.0.0-rc.6', '20 Nov')).toThrow(/date must be YYYY-MM-DD/);
    expect(() => assemble(LOG, [{ name: 'z.md', text: '### Nope\n- x\n' }], '1.0.0-rc.6', '2026-11-20')).toThrow(/z\.md:1/);
  });
  it('on files: deletes the fragments it wrote, leaves CHANGELOG.md alone on a dry run or an empty folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pme-changelog-'));
    mkdirSync(join(dir, 'changes', 'unreleased'), { recursive: true });
    writeFileSync(join(dir, 'CHANGELOG.md'), LOG);
    writeFileSync(join(dir, 'changes', 'unreleased', '.gitkeep'), '');
    expect(assembleRepo(dir, '1.0.0-rc.6', '2026-11-20', false).section).toBeNull();
    for (const f of frags) writeFileSync(join(dir, 'changes', 'unreleased', f.name), f.text);
    const dry = assembleRepo(dir, '1.0.0-rc.6', '2026-11-20', true);
    expect(dry.section).toMatch(/^## \[1\.0\.0-rc\.6\] - 2026-11-20/);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(LOG);
    expect(readdirSync(join(dir, 'changes', 'unreleased')).sort()).toEqual(['.gitkeep', 'a-topic.md', 'b-topic.md']);
    assembleRepo(dir, '1.0.0-rc.6', '2026-11-20', false);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toContain(dry.section!);
    expect(readdirSync(join(dir, 'changes', 'unreleased'))).toEqual(['.gitkeep']);
    // idempotent: a second run finds no fragments and changes nothing
    const after = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
    expect(assembleRepo(dir, '1.0.0-rc.7', '2026-11-21', false).section).toBeNull();
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(after);
  });
});

describe('the repository', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  it('every fragment under changes/unreleased/ parses', () => {
    expect(existsSync(join(root, 'changes', 'unreleased'))).toBe(true);
    expect(readFragments(root).flatMap((f) => parseFragment(f.text, f.name).errors)).toEqual([]);
  });
  it("CHANGELOG.md's Unreleased section has no entries", () => {
    const stray = unreleasedEntries(changelog).map((l) => `${l}  <- write a fragment under changes/unreleased/ instead`);
    expect(stray, 'write a fragment under changes/unreleased/ instead').toEqual([]);
  });
  it("every dated section's headings are known, and the newest section's are in the assembler's order", () => {
    // Only the newest is held to the order: rc.2 (2026-10-20) printed Fixed before Changed, and a released section is
    // not rewritten. rc.1, rc.3, rc.4 and rc.5 all follow Added, Changed, Fixed, Known limitations; the
    // headings no section has yet (Deprecated, Removed, Security) take Keep a Changelog 1.1.0's places.
    const sections = sectionHeadings(changelog);
    for (const { version, headings } of sections) {
      expect(headings.filter((h) => !HEADINGS.includes(h)), `${version}: unknown headings`).toEqual([]);
    }
    const idx = sections[0]!.headings.map((h) => HEADINGS.indexOf(h));
    expect(idx, `${sections[0]!.version}: headings out of order`).toEqual([...idx].sort((a, b) => a - b));
  });
});
