// Builds a release's CHANGELOG.md section from the fragments under changes/unreleased/ (one small file per pull request,
// so two PRs never conflict in CHANGELOG.md; research/42 §1.4 c). A fragment holds lines under `### <heading>`s, each
// line exactly as it appears in CHANGELOG.md. This script groups them by heading, writes `## [version] - date` at the
// top of CHANGELOG.md under `## [Unreleased]`, moves the compare links, deletes the fragments and prints the section.
// Usage: node --experimental-strip-types scripts/changelog-assemble.ts <version> <YYYY-MM-DD> [--dry-run]
// Refuses while CHANGELOG.md still has lines under Unreleased; with no fragments it changes nothing.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Heading order: Keep a Changelog 1.1.0's six, then the repo's own "Known limitations"; every dated section of
 * CHANGELOG.md follows it (test/changelog-fragments.test.ts checks). */
export const HEADINGS = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security', 'Known limitations'];
export const FRAGMENT_DIR = join('changes', 'unreleased');

export interface Entry { heading: string; lines: string[] }
export interface Fragment { name: string; text: string }

const trimBlank = (lines: string[]) => {
  let a = 0, b = lines.length;
  while (a < b && lines[a]!.trim() === '') a++;
  while (b > a && lines[b - 1]!.trim() === '') b--;
  return lines.slice(a, b);
};

export function parseFragment(text: string, name: string): { entries: Entry[]; errors: string[] } {
  const entries: Entry[] = [];
  const errors: string[] = [];
  const starts: number[] = [];
  text.split('\n').forEach((line, i) => {
    const n = i + 1;
    if (/^##\s/.test(line)) errors.push(`${name}:${n}: a version heading ("${line}") in a fragment; the assembler writes it`);
    else if (/^###\s/.test(line)) {
      const h = line.replace(/^###\s+/, '').trim();
      if (!HEADINGS.includes(h)) errors.push(`${name}:${n}: unknown heading "${line}" (known: ${HEADINGS.join(', ')})`);
      entries.push({ heading: h, lines: [] });
      starts.push(n);
    } else if (entries.length === 0) {
      if (line.trim() !== '') errors.push(`${name}:${n}: a line before the first heading`);
    } else entries[entries.length - 1]!.lines.push(line);
  });
  entries.forEach((e, i) => {
    e.lines = trimBlank(e.lines);
    if (e.lines.length === 0) errors.push(`${name}:${starts[i]}: "### ${e.heading}" has no lines`);
  });
  if (entries.length === 0 && errors.length === 0) errors.push(`${name}: empty fragment`);
  return { entries, errors };
}

/** The `## [Unreleased]` section's non-blank lines (the section ends at the next `## ` or link reference). */
export function unreleasedEntries(changelog: string): string[] {
  const lines = changelog.split('\n');
  const at = lines.findIndex((l) => /^## \[Unreleased\]/.test(l));
  if (at < 0) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading');
  const out: string[] = [];
  for (const l of lines.slice(at + 1)) {
    if (/^## /.test(l) || /^\[[^\]]+\]: /.test(l)) break;
    if (l.trim() !== '') out.push(l);
  }
  return out;
}

/** Each dated section's `### ` headings, in file order. */
export function sectionHeadings(changelog: string): { version: string; headings: string[] }[] {
  const out: { version: string; headings: string[] }[] = [];
  for (const l of changelog.split('\n')) {
    const v = /^## \[([^\]]+)\] - \d{4}-\d{2}-\d{2}/.exec(l);
    if (v) out.push({ version: v[1]!, headings: [] });
    else if (/^## /.test(l)) out.push({ version: l, headings: [] });
    else if (/^### /.test(l) && out.length) out[out.length - 1]!.headings.push(l.replace(/^###\s+/, '').trim());
  }
  return out.filter((s) => s.version !== '## [Unreleased]');
}

export function assemble(changelog: string, fragments: Fragment[], version: string, date: string): { changelog: string; section: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`date must be YYYY-MM-DD, got "${date}"`);
  const stray = unreleasedEntries(changelog);
  if (stray.length) {
    throw new Error(`CHANGELOG.md's Unreleased section still has ${stray.length} lines; move them into a fragment under ${FRAGMENT_DIR}/ first`);
  }
  const esc = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`^## \\[${esc}\\]`, 'm').test(changelog)) throw new Error(`CHANGELOG.md already has a [${version}] section`);
  const byHeading = new Map<string, string[]>();
  const errors: string[] = [];
  for (const f of [...fragments].sort((a, b) => a.name.localeCompare(b.name))) {
    const p = parseFragment(f.text, f.name);
    errors.push(...p.errors);
    for (const e of p.entries) byHeading.set(e.heading, [...(byHeading.get(e.heading) ?? []), ...e.lines]);
  }
  if (errors.length) throw new Error(`fragments that do not parse:\n${errors.join('\n')}`);
  const blocks = HEADINGS.filter((h) => byHeading.has(h)).map((h) => `### ${h}\n\n${byHeading.get(h)!.join('\n')}\n`);
  const section = `## [${version}] - ${date}\n\n${blocks.join('\n')}`;

  const lines = changelog.split('\n');
  const at = lines.findIndex((l) => /^## \[Unreleased\]/.test(l));
  let next = lines.findIndex((l, i) => i > at && /^## /.test(l));
  if (next < 0) next = lines.length;
  let out = [...lines.slice(0, at + 1), '', ...section.split('\n'), ...lines.slice(next)].join('\n');
  // Compare links: [Unreleased] now starts at the new tag; the new version compares against the previous one.
  out = out.replace(/^\[Unreleased\]: (\S+)\/compare\/(\S+)\.\.\.HEAD$/m, (_m, base: string, prev: string) =>
    `[Unreleased]: ${base}/compare/v${version}...HEAD\n[${version}]: ${base}/compare/${prev}...v${version}`);
  return { changelog: out, section };
}

export function readFragments(root: string): (Fragment & { path: string })[] {
  const dir = join(root, FRAGMENT_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.md')).sort()
    .map((name) => ({ name, path: join(dir, name), text: readFileSync(join(dir, name), 'utf8') }));
}

/** Assembles in `root`; `section` is null when there are no fragments (nothing is written). */
export function assembleRepo(root: string, version: string, date: string, dryRun: boolean): { section: string | null } {
  const fragments = readFragments(root);
  if (fragments.length === 0) return { section: null };
  const file = join(root, 'CHANGELOG.md');
  const { changelog, section } = assemble(readFileSync(file, 'utf8'), fragments, version, date);
  if (!dryRun) {
    writeFileSync(file, changelog);
    for (const f of fragments) rmSync(f.path);
  }
  return { section };
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const [version, date] = args.filter((a) => a !== '--dry-run');
  if (!version || !date) {
    console.error('usage: node --experimental-strip-types scripts/changelog-assemble.ts <version> <YYYY-MM-DD> [--dry-run]');
    process.exit(2);
  }
  try {
    const n = readFragments(resolve(import.meta.dirname, '..')).length;
    const { section } = assembleRepo(resolve(import.meta.dirname, '..'), version, date, dryRun);
    if (section === null) console.log(`no fragments under ${FRAGMENT_DIR}/; CHANGELOG.md unchanged`);
    else {
      console.log(section);
      console.log(dryRun ? `(dry run: ${n} fragments, nothing written)`
        : `wrote this section to CHANGELOG.md and deleted ${n} fragments; add the release summary paragraph by hand if wanted`);
    }
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
