// Stage 8b: every package's exported `version` constant equals its package.json version (1.0.0-rc.3 now), and all
// library packages share one version — one number, checked in one place. The constants are read as source text so
// this package does not type-check the renderer's worker import (vite/client types).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkgs = resolve(import.meta.dirname, '..', '..');
const pkgVersion = (dir: string) => (JSON.parse(readFileSync(resolve(pkgs, dir, 'package.json'), 'utf8')) as { version: string }).version;
const constant = (file: string) => /export const version = '([^']+)';/.exec(readFileSync(resolve(pkgs, file), 'utf8'))?.[1];
const CONSTANTS: Record<string, string> = {
  audio: 'audio/src/index.ts', controller: 'controller/src/index.ts', 'engine-core': 'engine-core/src/version.ts',
  renderer: 'renderer/src/index.ts', skins: 'skins/src/index.ts', validation: 'validation/src/index.ts',
};

describe('release versions', () => {
  it('each version constant matches its package.json', () => {
    for (const [dir, file] of Object.entries(CONSTANTS)) expect(constant(file), file).toBe(pkgVersion(dir));
  });
  it('every library package is at the same version', () => {
    const vs = ['audio', 'controller', 'engine-core', 'renderer', 'skins', 'ventilator', 'validation'].map(pkgVersion);
    expect(new Set(vs).size).toBe(1);
  });
  it('CITATION.cff carries the package version and the CHANGELOG release date', () => {
    const root = resolve(pkgs, '..');
    const cff = readFileSync(resolve(root, 'CITATION.cff'), 'utf8');
    const v = pkgVersion('renderer');
    expect(/^version: (.+)$/m.exec(cff)?.[1]).toBe(v);
    const heading = new RegExp(`^## \\[${v.replace(/\./g, '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})$`, 'm').exec(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'));
    expect(heading?.[1], 'CHANGELOG.md has a dated section for this version').toBeDefined();
    expect(/^date-released: "?(\d{4}-\d{2}-\d{2})"?$/m.exec(cff)?.[1]).toBe(heading?.[1]);
  });
  it('README.md names the package version and no older release candidate', () => {
    // The rc.2 tag shipped a README whose status line and embed-asset name still said rc.1 (found 2026-10-20).
    const readme = readFileSync(resolve(pkgs, '..', 'README.md'), 'utf8');
    const v = pkgVersion('renderer');
    expect(readme, 'status line').toContain(`**Status: release candidate \`${v}\``);
    expect(readme, 'embed asset name').toContain(`ventilator-monitor-embed-v${v}.zip`);
    const stale = readme.match(/1\.0\.0-rc\.\d+/g)?.filter((s) => s !== v) ?? [];
    expect(stale, 'older release-candidate versions in README.md').toEqual([]);
  });
});
