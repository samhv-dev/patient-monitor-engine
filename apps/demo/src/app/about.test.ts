// The in-app release label and education-only line (Start and Settings → About) match the packages' version and the
// Debrief's print footer; no "version 1.1" promise is left on screen.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { version } from '@pme/renderer';
import { ABOUT_LINE, EDUCATION_LINE, RELEASE_LABEL } from './about.ts';
import { pairingOf } from './pairing.ts';

describe('about line (Stage 8b)', () => {
  it('names the package version, flags a pre-release, and says education only like the Debrief footer', () => {
    expect(RELEASE_LABEL).toBe(`Version ${version} (pre-release)`);
    expect(ABOUT_LINE).toContain(EDUCATION_LINE);
    expect(readFileSync(resolve(import.meta.dirname, 'views/debrief.ts'), 'utf8')).toContain(EDUCATION_LINE);
  });
  it('the pairing notes promise no "version 1.1"', () => {
    for (const p of [pairingOf('ABC234', { search: '', hostname: 'localhost', origin: 'http://localhost:5173', pathname: '/' }),
      pairingOf('ABC234', { search: '?relay=ws://192.168.1.20:8787', hostname: '192.168.1.20', origin: 'http://192.168.1.20:5173', pathname: '/' })]) {
      expect(p.note).not.toMatch(/1\.1/);
    }
  });
});
