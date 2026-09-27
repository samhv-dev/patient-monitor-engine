// Committed manifests: which records and windows the harness uses, with the SHA-256 of each downloaded file.
// Nothing recorded is in them (brief §8): ids, times, hashes and the matching targets only.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AnalysisWindow } from './signals.ts';

export interface Manifest {
  schema: 'pme-dataset-manifest/1';
  source: 'vitaldb' | 'mghdb';
  createdAt: string;
  selection: string;
  files: Record<string, string>; // path inside the project → sha256
  windows: AnalysisWindow[];
  rejected: Array<{ record: string; reason: string }>;
}

export const manifestPath = (source: Manifest['source']): string => fileURLToPath(new URL(`../../datasets/manifests/${source}.json`, import.meta.url));

export function readManifest(source: Manifest['source']): Manifest | null {
  const p = manifestPath(source);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Manifest) : null;
}

export function writeManifest(m: Manifest): void {
  writeFileSync(manifestPath(m.source), `${JSON.stringify(m, null, 1)}\n`);
}
