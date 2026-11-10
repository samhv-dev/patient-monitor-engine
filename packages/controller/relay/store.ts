// The kit store (docs/plans/scenario-builder.md §8 layer 2, piece B8; the owner's ruling of 10 November 2026): what the
// clinicians make in the app is kept as plain files in the kit's own `user-data` folder, beside the browser's copy, so a
// cleared browser, another browser on the same laptop, or a disk short of space in the browser loses nothing. The relay
// (`--state-dir`) and the kit's Node.js simulator server (server/serve.mjs) answer these paths under `/pme-store/`:
//
//   GET  /pme-store/                     {store:'pme', folder, writable, refused?, why?}: may this page write here, and
//                                        if not why ('not-this-computer', or 'not-writable' with the system's reason)
//   GET  /pme-store/scenarios/           every card the folder holds: its id, its newest title, its versions
//   GET  /pme-store/scenarios/<id>/<v>   one version's card file, as written
//   POST /pme-store/scenarios/<id>       a new version of card <id> (the body: the card file); the same bytes as the
//                                        newest version write nothing
//   GET  /pme-store/debriefs/            every debrief the folder holds: its id, size and time   } THIS COMPUTER ONLY:
//   GET  /pme-store/debriefs/<id>        one debrief's file (`pme-archive-entry/1`)               } a debrief names a
//   PUT  /pme-store/debriefs/<id>        the archive's entry as a file (a re-save of the run      } resident; no phone
//                                        replaces it, as the browser's archive does)              } lists or reads one
//   DELETE /pme-store/debriefs/<id>      the archive's Clear: the file leaves the archive, MOVED into debriefs/removed/
//                                        (`setAsideDebrief`: never destroyed; nothing under removed/ is listed or read)
//
// The rules (§8): a version is never overwritten (each is a file of its own, created only if its name is free); writes
// come from THIS computer only (the loopback address, a loopback Host, and a loopback Origin or none: a page from the
// internet open in the laptop's browser cannot write, and neither can a phone on the room's network); card reads are open
// to the room, as the plan rules, so another window of the room lists the drafts. A name comes from the card's id and
// must be a safe file name on every system (no path leaves the folder). Nothing is written until the first save; the
// folder is then created. No DOM, no dependency.
import { accessSync, constants, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, dirname, join, resolve, sep } from 'node:path';

/** Where the paths start. */
export const STORE_PREFIX = '/pme-store/';
/**
 * The largest card file the store takes: the owner's limit for a card document (BQ13, 9 November 2026: "a card document
 * ≤ 512 KB, text only"), here 512 KiB of UTF-8. The largest library card today is under 40 kB. [ENG: scenario; BQ13]
 */
export const CARD_MAX_BYTES = 512 * 1024;
/**
 * The largest debrief file: a debrief carries the whole run record, about 10 kB of UTF-8 per simulated minute (archive.ts,
 * N39), so 16 MiB is about 26 simulated hours, far above any teaching run; it bounds what one request may put on the
 * laptop's disk. [ENG: network]
 */
export const DEBRIEF_MAX_BYTES = 16 * 1024 * 1024;
/** The longest name: the card id's own limit (`^[A-Za-z][A-Za-z0-9_.-]{0,63}$`, 64 characters). [ENG: scenario] */
export const NAME_MAX = 64;

/** Names Windows keeps for devices, with or without an extension (CON, NUL.json, COM1 …): never a file name here. */
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

/** `s` as a file name the store may use, or null: letters, digits, `_`, `.`, `-`; a letter or digit first; at most
 *  NAME_MAX; no trailing dot (Windows drops it); no device name. No separator, so no path can leave the folder. */
export function safeName(s: unknown): string | null {
  if (typeof s !== 'string' || s.length > NAME_MAX || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(s)) return null;
  if (s.endsWith('.') || RESERVED.test(s)) return null;
  return s;
}

/** A version's file name: `v0003-2026-11-10T18-22-05Z.json` (its number, then when it was kept, UTC). */
export const versionFile = (n: number, at: number): string => `v${String(n).padStart(4, '0')}-${new Date(at).toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-')}.json`;
const VERSION_RE = /^v(\d{4,})-(\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ)\.json$/;
/** A version file's number and time, or null when the name is not one. */
export function parseVersionFile(name: string): { v: number; at: number } | null {
  const m = VERSION_RE.exec(name);
  if (!m) return null;
  const at = Date.parse(m[2]!.replace(/T(\d\d)-(\d\d)-(\d\d)Z$/, 'T$1:$2:$3Z'));
  return Number.isFinite(at) ? { v: Number(m[1]), at } : null;
}

export interface VersionMeta {
  v: number;
  /** Wall ms when it was kept. */
  at: number;
  bytes: number;
}
export interface CardEntry {
  id: string;
  /** The newest version's title ('' when it has none). */
  title: string;
  /** Oldest first. */
  versions: VersionMeta[];
}

/** Why the folder cannot be written, in words for the page, or null when it can. The folder may not exist yet: the
 *  nearest folder that does is asked (a read-only disk answers EROFS). */
export function writeRefusal(dir: string): string | null {
  let d = resolve(dir);
  while (!existsSync(d)) {
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  try {
    accessSync(d, constants.W_OK);
    return null;
  } catch (err) {
    return refusalWords(err);
  }
}

const refusalWords = (err: unknown): string => {
  const code = (err as { code?: string } | null)?.code;
  if (code === 'EROFS') return 'the disk it is on is read-only';
  if (code === 'EACCES' || code === 'EPERM') return 'this computer does not allow writing there';
  if (code === 'ENOSPC') return 'the disk is full';
  return err instanceof Error ? err.message : String(err);
};

/** The request's peer is this computer: loopback (127.0.0.0/8, ::1), never another device's address. */
export const isLoopbackAddress = (a: string | undefined): boolean => !!a && (a === '::1' || /^(::ffff:)?127\./.test(a));
const LOOPBACK_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?$/i;
const loopbackOrigin = (o: string | undefined): boolean => {
  if (o === undefined) return true;
  try {
    const u = new URL(o);
    return u.protocol === 'http:' && LOOPBACK_HOST.test(u.host);
  } catch {
    return false;
  }
};
/**
 * A request from this computer's own browser to this computer: its peer is loopback, its Host is a loopback name (a page
 * on another site that rebinds a name to 127.0.0.1 has its own Host), and its Origin, when it says one, is a loopback
 * page (a site on the internet open in the laptop's browser has another).
 */
export function fromThisComputer(req: IncomingMessage): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  return isLoopbackAddress(req.socket.remoteAddress) && LOOPBACK_HOST.test(req.headers.host ?? '') && loopbackOrigin(origin);
}

/** Every card the folder holds (a folder with a safe name and at least one version file), by id. */
export function listCards(dir: string): CardEntry[] {
  const root = join(dir, 'scenarios');
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  const out: CardEntry[] = [];
  for (const id of names.sort()) {
    if (safeName(id) !== id) continue;
    const versions = cardVersions(join(root, id));
    if (!versions.length) continue;
    let title = '';
    try {
      const t = (JSON.parse(readFileSync(join(root, id, versionFile(versions.at(-1)!.v, versions.at(-1)!.at)), 'utf8')) as { title?: unknown }).title;
      title = typeof t === 'string' ? t : '';
    } catch {
      /* a version that is not a card file: listed, untitled */
    }
    out.push({ id, title, versions });
  }
  return out;
}

function cardVersions(folder: string): VersionMeta[] {
  let files: string[];
  try {
    files = readdirSync(folder);
  } catch {
    return [];
  }
  const out: VersionMeta[] = [];
  for (const f of files) {
    const p = parseVersionFile(f);
    if (!p) continue;
    try {
      const st = statSync(join(folder, f));
      if (st.isFile()) out.push({ ...p, bytes: st.size });
    } catch {
      /* gone meanwhile */
    }
  }
  return out.sort((a, b) => a.v - b.v);
}

export type Kept = { ok: true; version: VersionMeta; same: boolean } | { ok: false; status: number; why: string };

/**
 * A new version of card `id`, `text` its card file. Refused: an unsafe id, a body that is not a JSON object naming that
 * id, one over CARD_MAX_BYTES. The same bytes as the newest version: that version, nothing written. Otherwise the next
 * number, in a file that did not exist (a hard link from a hidden temporary file, which fails rather than replace; on a
 * file system without links, a rename to a name checked free in the same turn).
 */
export function keepCard(dir: string, id: string, text: string, now = Date.now()): Kept {
  const name = safeName(id);
  if (!name) return { ok: false, status: 400, why: `"${id.slice(0, 80)}" cannot be a file name: give the card an id of letters, digits, "_", "." or "-" (at most ${NAME_MAX})` };
  const bytes = Buffer.byteLength(text);
  if (bytes > CARD_MAX_BYTES) return { ok: false, status: 413, why: `the card is ${Math.round(bytes / 1024)} KiB; a card file may be at most ${CARD_MAX_BYTES / 1024} KiB` };
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, why: 'the body is not JSON' };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || (doc as { id?: unknown }).id !== id) return { ok: false, status: 400, why: `the body is not a card with the id "${name}"` };
  const folder = join(dir, 'scenarios', name);
  const versions = cardVersions(folder);
  const last = versions.at(-1);
  if (last) {
    try {
      if (readFileSync(join(folder, versionFile(last.v, last.at)), 'utf8') === text) return { ok: true, version: last, same: true };
    } catch {
      /* unreadable: a new version */
    }
  }
  try {
    mkdirSync(folder, { recursive: true });
    const tmp = join(folder, `.incoming-${process.pid}-${now}.tmp`);
    writeFileSync(tmp, text, { flag: 'wx' });
    try {
      for (let n = (last?.v ?? 0) + 1; ; n++) {
        const file = join(folder, versionFile(n, now));
        if (cardVersions(folder).some((x) => x.v === n)) continue; // the number is taken (another writer), whatever its time
        try {
          linkSync(tmp, file);
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code === 'EEXIST') continue;
          if (code !== 'EPERM' && code !== 'ENOTSUP' && code !== 'EXDEV' && code !== 'ENOSYS') throw err;
          if (existsSync(file)) continue;
          renameSync(tmp, file); // FAT and exFAT sticks have no hard links
        }
        return { ok: true, version: { v: n, at: Math.floor(now / 1000) * 1000, bytes }, same: false };
      }
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        /* renamed */
      }
    }
  } catch (err) {
    return { ok: false, status: 507, why: refusalWords(err) };
  }
}

export interface DebriefEntry {
  id: string;
  bytes: number;
  /** Wall ms of the file's last write. */
  at: number;
}

/** Every debrief file the folder holds (`debriefs/<id>.json`, a safe id), by id. */
export function listDebriefs(dir: string): DebriefEntry[] {
  const root = join(dir, 'debriefs');
  let files: string[];
  try {
    files = readdirSync(root);
  } catch {
    return [];
  }
  const out: DebriefEntry[] = [];
  for (const f of files.sort()) {
    const id = f.endsWith('.json') ? f.slice(0, -5) : '';
    if (safeName(id) !== id) continue;
    try {
      const st = statSync(join(root, f));
      if (st.isFile()) out.push({ id, bytes: st.size, at: Math.round(st.mtimeMs) });
    } catch {
      /* gone meanwhile */
    }
  }
  return out;
}

/** One debrief's file, or null. */
export function readDebrief(dir: string, id: string): string | null {
  const name = safeName(id);
  if (!name) return null;
  try {
    return readFileSync(join(dir, 'debriefs', `${name}.json`), 'utf8');
  } catch {
    return null;
  }
}

export type Wrote = { ok: true; entry: DebriefEntry } | { ok: false; status: number; why: string };

/** The archive's entry `text` written as `debriefs/<id>.json` (whole: a hidden temporary file, then a rename; a re-save
 *  of the same run replaces it). Refused: an unsafe id, a body that is not an archive entry with that id, one over
 *  DEBRIEF_MAX_BYTES. */
export function keepDebrief(dir: string, id: string, text: string): Wrote {
  const name = safeName(id);
  if (!name) return { ok: false, status: 400, why: `"${id.slice(0, 80)}" cannot be a file name` };
  const bytes = Buffer.byteLength(text);
  if (bytes > DEBRIEF_MAX_BYTES) return { ok: false, status: 413, why: `the debrief is ${(bytes / 1048576).toFixed(1)} MiB; a debrief file may be at most ${DEBRIEF_MAX_BYTES / 1048576} MiB` };
  let doc: { schema?: unknown; id?: unknown } | null;
  try {
    doc = JSON.parse(text) as { schema?: unknown; id?: unknown } | null;
  } catch {
    return { ok: false, status: 400, why: 'the body is not JSON' };
  }
  if (!doc || typeof doc !== 'object' || doc.schema !== 'pme-archive-entry/1' || doc.id !== id) return { ok: false, status: 400, why: `the body is not a debrief archive entry with the id "${name}"` };
  try {
    const folder = join(dir, 'debriefs');
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `${name}.json`);
    const tmp = join(folder, `.${name}.json.tmp`);
    writeFileSync(tmp, text);
    renameSync(tmp, file);
    const st = statSync(file);
    return { ok: true, entry: { id: name, bytes: st.size, at: Math.round(st.mtimeMs) } };
  } catch (err) {
    return { ok: false, status: 507, why: refusalWords(err) };
  }
}

/** The folder a cleared debrief's file is moved to, inside debriefs/: the app never lists or reads anything there. */
export const REMOVED_DIR = 'removed';

/**
 * What "Clear the archive" does to a debrief's file. The owner's ruling of 10 November 2026, "B for now" (work is never
 * lost): the file is MOVED to `debriefs/removed/`, under its own name, or with a suffix (`<id>-2.json`, `-3` …) when
 * that name is taken there: nothing is overwritten and nothing is destroyed; a person empties that folder by hand.
 * The one place that decides it: a later ruling changes this function alone. Returns the file's name under removed/,
 * or null when there was no file (or the id is not a safe name). The move is a hard link then an unlink (a link fails
 * on a taken name instead of replacing it); on a file system without links, a rename to a name checked free in the
 * same turn.
 */
export function setAsideDebrief(dir: string, id: string): string | null {
  const name = safeName(id);
  if (!name) return null;
  const from = join(dir, 'debriefs', `${name}.json`);
  if (!existsSync(from)) return null;
  const to = join(dir, 'debriefs', REMOVED_DIR);
  mkdirSync(to, { recursive: true });
  for (let n = 1; ; n++) {
    const file = n === 1 ? `${name}.json` : `${name}-${n}.json`;
    const target = join(to, file);
    try {
      linkSync(from, target);
      unlinkSync(from);
      return file;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'EEXIST') continue;
      if (code !== 'EPERM' && code !== 'ENOTSUP' && code !== 'EXDEV' && code !== 'ENOSYS') throw err;
      if (existsSync(target)) continue;
      renameSync(from, target); // FAT and exFAT sticks have no hard links
      return file;
    }
  }
}

/** One version's card file, or null. */
export function readCard(dir: string, id: string, v: number): string | null {
  const name = safeName(id);
  if (!name || !Number.isInteger(v) || v < 1) return null;
  const folder = join(dir, 'scenarios', name);
  const meta = cardVersions(folder).find((x) => x.v === v);
  if (!meta) return null;
  const file = join(folder, versionFile(meta.v, meta.at));
  if (!resolve(file).startsWith(resolve(dir) + sep)) return null;
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export interface StoreOptions {
  /** The kit's user-data folder (created at the first write). */
  dir: string;
  /** Whether a request comes from this computer (default `fromThisComputer`). */
  local?: (req: IncomingMessage) => boolean;
  now?: () => number;
}

/**
 * The store's HTTP side: a handler that answers the `/pme-store/` paths and returns true, or returns false for any other
 * path (the server's own handler then answers it).
 */
export function storeRoutes(o: StoreOptions): (req: IncomingMessage, res: ServerResponse) => boolean {
  const local = o.local ?? fromThisComputer;
  const now = o.now ?? Date.now;
  const folder = basename(resolve(o.dir));
  return (req, res) => {
    const url = (req.url ?? '/').replace(/[?#].*$/s, '');
    if (!url.startsWith(STORE_PREFIX) && url !== STORE_PREFIX.slice(0, -1)) return false;
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const send = (code: number, body: unknown, type = 'application/json; charset=utf-8') => {
      const text = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(code, {
        'Content-Type': type, 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        // another page of this computer (the app on a dev server, the relay on another port) may read the answer
        ...(origin && loopbackOrigin(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
      });
      res.end(req.method === 'HEAD' ? undefined : text);
    };
    const refuse = (code: number, why: string) => send(code, { refused: code === 403 ? 'not-this-computer' : code === 507 ? 'not-written' : 'bad-request', why });
    const parts = url.slice(STORE_PREFIX.length).split('/');
    let segs: string[];
    try {
      segs = parts.map((p) => decodeURIComponent(p));
    } catch {
      refuse(400, 'bad address');
      return true;
    }
    if (req.method === 'OPTIONS') {
      // a preflight: only for this computer's own pages
      if (!local(req)) refuse(403, 'only this computer writes to the kit’s user-data folder');
      else {
        res.writeHead(204, { 'Access-Control-Allow-Origin': origin ?? '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
        res.end();
      }
      return true;
    }
    const get = req.method === 'GET' || req.method === 'HEAD';
    if (segs.length === 1 && segs[0] === '' && get) {
      const mine = local(req);
      const why = mine ? writeRefusal(o.dir) : 'this page is not on the kit’s own computer';
      send(200, { store: 'pme', folder, writable: why === null, ...(why ? { refused: mine ? 'not-writable' : 'not-this-computer', why } : {}) });
      return true;
    }
    /** The request's body, at most `max` bytes, then `done(text)`; over it: 413. */
    const body = (max: number, what: string, done: (text: string) => void) => {
      if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
        refuse(415, `${what} is sent as application/json`);
        req.resume();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      let over = false;
      req.on('data', (c: Buffer) => {
        size += c.length;
        if (size > max) over = true;
        else chunks.push(c);
      });
      req.on('end', () => (over ? refuse(413, `${what} may be at most ${max >= 1048576 ? `${max / 1048576} MiB` : `${max / 1024} KiB`}`) : done(Buffer.concat(chunks).toString('utf8'))));
    };
    if (segs[0] === 'debriefs') {
      // a debrief names a resident: listed, read, written and deleted by this computer only, never by the room
      if (!local(req)) {
        refuse(403, 'only this computer reads or writes the debriefs in the kit’s user-data folder');
        req.resume();
        return true;
      }
      const id = segs[1] ?? '';
      if (get && segs.length === 2 && id === '') send(200, { debriefs: listDebriefs(o.dir) });
      else if (get && segs.length === 2) {
        const text = readDebrief(o.dir, id);
        if (text === null) refuse(404, 'no such debrief');
        else send(200, text);
      } else if (req.method === 'PUT' && segs.length === 2) {
        body(DEBRIEF_MAX_BYTES, 'a debrief', (text) => {
          const r = keepDebrief(o.dir, id, text);
          if (r.ok) send(200, r.entry);
          else refuse(r.status, r.why);
        });
      } else if (req.method === 'DELETE' && segs.length === 2) {
        try {
          const file = setAsideDebrief(o.dir, id);
          if (file) send(200, { removed: id, file: `${REMOVED_DIR}/${file}` });
          else refuse(404, 'no such debrief');
        } catch (err) {
          refuse(507, refusalWords(err));
        }
      } else if (get) {
        refuse(404, 'no such debrief'); // removed/ and anything deeper: never read
      } else {
        refuse(405, 'not a method this path takes');
        req.resume();
      }
      return true;
    }
    if (segs[0] !== 'scenarios') {
      refuse(404, 'no such path');
      return true;
    }
    if (get && segs.length === 2 && segs[1] === '') {
      send(200, { cards: listCards(o.dir) });
      return true;
    }
    if (get && segs.length === 3) {
      const text = readCard(o.dir, segs[1]!, Number(segs[2]));
      if (text === null) refuse(404, 'no such version');
      else send(200, text);
      return true;
    }
    if (req.method === 'POST' && segs.length === 2) {
      if (!local(req)) {
        refuse(403, 'only this computer writes to the kit’s user-data folder');
        req.resume();
        return true;
      }
      body(CARD_MAX_BYTES, 'a card file', (text) => {
        const r = keepCard(o.dir, segs[1]!, text, now());
        if (r.ok) send(r.same ? 200 : 201, { ...r.version, same: r.same });
        else refuse(r.status, r.why);
      });
      return true;
    }
    refuse(405, 'not a method this path takes');
    req.resume();
    return true;
  };
}
