// Licence audit (Stage 8b): every third-party package in the install must carry an allow-listed licence, and
// every package that ships to users (the production dependency closure) must also be named, with its exact
// version, in NOTICES.md and have its licence text in LICENSES/ (`<name>-<version>.txt`, or `Apache-2.0.txt`);
// every LICENSES/ path NOTICES.md names must exist (BUILD-PLAN Stage 8 acceptance 6). Reads
// `pnpm licenses list --json` (pnpm's own report; no extra dependency).
// Usage: pnpm check-licences            (exit 1 on any problem)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Shipped with the packages or the IIFE: permissive licences only (brief §8, ruling R6). */
export const RUNTIME_ALLOW = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD'];
/** Build and test tools, never redistributed: also these permissive licences. */
export const DEV_ALLOW = [...RUNTIME_ALLOW, 'BlueOak-1.0.0', 'Python-2.0', 'CC0-1.0'];

export interface LicenceEntry {
  name: string;
  versions: string[];
  license: string;
}
export type LicenceReport = Record<string, LicenceEntry[]>;

/** Problems in the two reports; an empty list means the audit passes. `licenceFiles`: the file names in LICENSES/. */
export function auditLicences(all: LicenceReport, prod: LicenceReport, noticesMd: string, licenceFiles: string[]): string[] {
  const problems: string[] = [];
  const prodNames = new Set(Object.values(prod).flat().map((p) => p.name));
  for (const [licence, pkgs] of Object.entries(all)) {
    for (const p of pkgs) {
      const allow = prodNames.has(p.name) ? RUNTIME_ALLOW : DEV_ALLOW;
      if (!allow.includes(licence)) problems.push(`${p.name}@${p.versions.join('/')}: licence "${licence}" is not in the ${prodNames.has(p.name) ? 'runtime' : 'dev'} allow-list`);
    }
  }
  for (const pkgs of Object.values(prod)) {
    for (const p of pkgs) {
      for (const v of p.versions) {
        if (!noticesMd.includes(`${p.name} ${v}`)) problems.push(`${p.name} ${v}: shipped at runtime but not named in NOTICES.md`);
      }
    }
  }
  const have = new Set(licenceFiles);
  for (const [licence, pkgs] of Object.entries(prod)) {
    for (const p of pkgs) {
      for (const v of p.versions) {
        const text = licence === 'Apache-2.0' ? 'Apache-2.0.txt' : `${p.name.replace(/^@/, '').replace('/', '__')}-${v}.txt`;
        if (!have.has(text)) problems.push(`${p.name} ${v}: shipped at runtime but LICENSES/${text} is missing`);
      }
    }
  }
  const named = new Set([...noticesMd.matchAll(/LICENSES\/([\w@.+-]+\.txt)/g)].map((m) => m[1] as string));
  for (const f of named) if (!have.has(f)) problems.push(`NOTICES.md names LICENSES/${f}, which is missing`);
  return problems;
}

function pnpmJson(args: string[]): LicenceReport {
  const pnpm = process.env.npm_execpath; // set when run as `pnpm check-licences`
  const out = pnpm
    ? execFileSync(process.execPath, [pnpm, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 })
    : execFileSync('pnpm', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(out) as LicenceReport;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const all = pnpmJson(['licenses', 'list', '--json']);
  const prod = pnpmJson(['licenses', 'list', '--json', '--prod']);
  const problems = auditLicences(all, prod, readFileSync(resolve(root, 'NOTICES.md'), 'utf8'), readdirSync(resolve(root, 'LICENSES')));
  if (problems.length > 0) {
    for (const p of problems) console.error(`check-licences: ${p}`);
    process.exit(1);
  }
  const count = (r: LicenceReport) => Object.values(r).flat().length;
  console.log(`check-licences: OK (${count(all)} packages, ${count(prod)} shipped, every shipped text in LICENSES/; licences ${Object.keys(all).sort().join(', ')})`);
}
