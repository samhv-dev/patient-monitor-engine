// Download PhysioNet files into a git-ignored cache and verify them against the project's SHA256SUMS.txt.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const PHYSIONET = 'https://physionet.org/files';

export async function fetchCached(cacheDir: string, project: string, file: string): Promise<Uint8Array> {
  const path = join(cacheDir, project, file);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const url = `${PHYSIONET}/${project}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return buf;
}

/** Parse SHA256SUMS.txt ("<hex>  <path>" per line). */
export function parseSums(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const [h, p] = line.trim().split(/\s+/);
    if (h && p) m.set(p, h.toLowerCase());
  }
  return m;
}

export function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function fetchVerified(cacheDir: string, project: string, file: string, sums: Map<string, string>): Promise<Uint8Array> {
  const buf = await fetchCached(cacheDir, project, file);
  const want = sums.get(file);
  if (!want) throw new Error(`${project}/${file}: not listed in SHA256SUMS.txt`);
  const got = sha256(buf);
  if (got !== want) throw new Error(`${project}/${file}: SHA-256 mismatch (${got} ≠ ${want})`);
  return buf;
}
