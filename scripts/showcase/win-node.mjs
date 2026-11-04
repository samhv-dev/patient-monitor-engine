// The showcase kit's Windows Node.js (make-bundle.mjs --win-node; kit-windows.test.ts checks it). It takes an official
// node-v22.x.y-win-x64.zip from nodejs.org that the builder downloaded beforehand, and nothing is downloaded here:
//  1. the zip's SHA-256 must equal its line in the SHASUMS256.txt given with it (else it is refused);
//  2. only <top>/node.exe and <top>/LICENSE are read from it (a small reader of the zip's central directory; stored or
//     deflated entries; each entry's CRC-32 is checked after inflating);
//  3. the caller writes them as runtime/node.exe and runtime/NODE-LICENSE.txt, with runtime/NODE-VERSION.txt.
// What the checksum proves: the zip is the file the SHASUMS256.txt lists. It does not prove that SHASUMS256.txt came
// from nodejs.org (that list is signed, SHASUMS256.txt.asc, and this does not check the signature): fetch both from
// https://nodejs.org/dist/v22.x.y/ yourself.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { crc32, inflateRawSync } from 'node:zlib';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The SHA-256 SHASUMS256.txt lists for `name` (lines are "<64 hex>  <file name>"), or null. */
export function listedSum(sumsText, name) {
  for (const line of sumsText.split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(\S+)$/i.exec(line.trim());
    if (m && m[2] === name) return m[1].toLowerCase();
  }
  return null;
}

/** The entries of a zip (no zip64, no encryption, no multi-disk: an official Node.js win-x64 zip is none of these). */
function zipEntries(zip) {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory record)');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new Error('zip64 archives are not supported');
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const flags = zip.readUInt16LE(p + 8);
    const e = {
      method: zip.readUInt16LE(p + 10), crc: zip.readUInt32LE(p + 16), csize: zip.readUInt32LE(p + 20),
      size: zip.readUInt32LE(p + 24), local: zip.readUInt32LE(p + 42), encrypted: (flags & 1) === 1,
    };
    const nameLen = zip.readUInt16LE(p + 28);
    entries.set(zip.toString('utf8', p + 46, p + 46 + nameLen), e);
    p += 46 + nameLen + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
  }
  return entries;
}

function readEntry(zip, name, e) {
  if (!e) throw new Error(`the zip has no ${name}`);
  if (e.encrypted) throw new Error(`${name} is encrypted`);
  if (e.csize === 0xffffffff || e.size === 0xffffffff || e.local === 0xffffffff) throw new Error(`${name}: zip64 entries are not supported`);
  if (zip.readUInt32LE(e.local) !== 0x04034b50) throw new Error(`${name}: corrupt local header`);
  const start = e.local + 30 + zip.readUInt16LE(e.local + 26) + zip.readUInt16LE(e.local + 28);
  const raw = zip.subarray(start, start + e.csize);
  const data = e.method === 0 ? Buffer.from(raw) : e.method === 8 ? inflateRawSync(raw) : null;
  if (!data) throw new Error(`${name}: compression method ${e.method} is not supported`);
  if (data.length !== e.size || crc32(data) >>> 0 !== e.crc) throw new Error(`${name}: CRC-32 or size does not match the zip's record`);
  return data;
}

/** Verify `zipPath` against `sumsPath` and take node.exe and LICENSE out of it. Throws (refuses) on any mismatch. */
export function readWindowsNode(zipPath, sumsPath) {
  const name = basename(zipPath);
  const m = /^node-v((\d+)\.\d+\.\d+)-win-x64\.zip$/.exec(name);
  if (!m) throw new Error(`--win-node: ${name} is not named like an official build (node-v22.x.y-win-x64.zip)`);
  if (Number(m[2]) < 22) throw new Error(`--win-node: ${name} is Node.js ${m[1]}; the kit needs 22 or later`);
  const zip = readFileSync(zipPath);
  const zipSha = sha256(zip);
  const listed = listedSum(readFileSync(sumsPath, 'utf8'), name);
  if (!listed) throw new Error(`--win-node: ${sumsPath} lists no ${name}`);
  if (listed !== zipSha) throw new Error(`--win-node: SHA-256 MISMATCH for ${name}: the file is ${zipSha}, ${basename(sumsPath)} lists ${listed}. Refused.`);
  const top = `node-v${m[1]}-win-x64/`;
  const entries = zipEntries(zip);
  const exe = readEntry(zip, `${top}node.exe`, entries.get(`${top}node.exe`));
  if (exe.toString('latin1', 0, 2) !== 'MZ') throw new Error(`${top}node.exe is not a Windows executable`);
  const license = readEntry(zip, `${top}LICENSE`, entries.get(`${top}LICENSE`));
  return { version: `v${m[1]}`, zipName: name, zipSha, exe, exeSha: sha256(exe), license };
}
