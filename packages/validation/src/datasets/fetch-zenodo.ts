// Zenodo files (PWDB) into the cache, checked against the MD5 Zenodo publishes (it has no SHA-256).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const md5 = (buf: Uint8Array): string => createHash('md5').update(buf).digest('hex');

export async function fetchZenodo(cache: string, record: string, file: string, want: string): Promise<Uint8Array> {
  const path = join(cache, `zenodo-${record}`, file);
  let buf: Uint8Array;
  // FU-11 (F23): cached bytes are checked like downloaded ones — a corrupt or truncated cache entry is fetched again
  const cached = existsSync(path) ? new Uint8Array(readFileSync(path)) : null;
  if (cached && md5(cached) === want) buf = cached;
  else {
    const url = `https://zenodo.org/api/records/${record}/files/${file}/content`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    const got = md5(buf);
    if (got !== want) throw new Error(`zenodo ${record}/${file}: MD5 mismatch (${got} ≠ ${want})`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.part`, buf); // atomic: an interrupted write never becomes a cache entry
    renameSync(`${path}.part`, path);
  }
  return buf;
}
