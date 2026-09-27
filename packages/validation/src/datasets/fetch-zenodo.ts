// Zenodo files (PWDB) into the cache, checked against the MD5 Zenodo publishes (it has no SHA-256).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const md5 = (buf: Uint8Array): string => createHash('md5').update(buf).digest('hex');

export async function fetchZenodo(cache: string, record: string, file: string, want: string): Promise<Uint8Array> {
  const path = join(cache, `zenodo-${record}`, file);
  let buf: Uint8Array;
  if (existsSync(path)) buf = new Uint8Array(readFileSync(path));
  else {
    const url = `https://zenodo.org/api/records/${record}/files/${file}/content`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    const got = md5(buf);
    if (got !== want) throw new Error(`zenodo ${record}/${file}: MD5 mismatch (${got} ≠ ${want})`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buf);
  }
  return buf;
}
