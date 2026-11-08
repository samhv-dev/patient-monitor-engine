// EEG plan §5, the device boundary (E5 adds it, every reader piece keeps it green): no file under l3/eeg-devices/
// imports from l2/ or from the engine, or names the pipeline state; a device reads only the samples, the sample rate
// and the electrode impedance (D1, D8), so no index can be computed from an effect-site concentration (the anti-goals).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EEG_DEVICES } from '../../../src/l3/eeg-devices/registry.ts';

const DIR = join(import.meta.dirname, '../../../src/l3/eeg-devices');
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
/** Every module specifier a file imports or re-exports (static and dynamic). */
const specifiers = (text: string) => [...text.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => (m[1] ?? m[2]) as string);

describe('the EEG device boundary (plan §5)', () => {
  it('the directory holds the readers', () => {
    expect(files).toEqual(expect.arrayContaining(['generic.ts', 'spectral.ts', 'registry.ts']));
  });
  for (const f of files) {
    it(`${f}: imports only its own directory and the public types files`, () => {
      const text = readFileSync(join(DIR, f), 'utf8');
      for (const s of specifiers(text)) {
        expect(s, `${f} imports ${s}`).toMatch(/^\.\/[\w-]+\.ts$|^\.\.\/\.\.\/types(-eeg)?\.ts$/);
      }
      expect(text, `${f} names the pipeline state`).not.toMatch(/PipelineState|\bl2\//);
    });
  }
  it('a reader is (state, samples, impedance) → readings: no other input', () => {
    for (const d of Object.values(EEG_DEVICES)) {
      expect(d.create.length, d.spec.id).toBe(1); // (fsHz)
      expect(d.read.length, d.spec.id).toBe(3); // (state, samples, impedanceKOhm)
    }
  });
  it('no device constant names a drug or an age (§6 review focus 1)', () => {
    const drugs = /propofol|sevo|iso|des(flurane)?|ketamine|nitrous|n2o|opioid|fentanyl|remi|midazolam|dexmed|rocuronium|age/i;
    for (const d of Object.values(EEG_DEVICES)) for (const k of Object.keys(d.spec.constants)) expect(k, `${d.spec.id}.${k}`).not.toMatch(drugs);
  });
});
