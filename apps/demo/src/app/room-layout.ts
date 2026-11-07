// The remembered layout of the room (plan room-and-instruments.md R7, §4 D8; Q10 ruled 5 November = A: device names
// are kept across days, until "Forget the room"). Pure: the store is handed in. Two keys, both per-viewer (store.ts),
// on the instructor's computer only:
//   `pme.roomLayout`   { [device key]: { name, show, lastSeen } }: every device that said its key on a hello (R3), with
//                      the name the instructor gave it and what it showed when last seen; at most MAX_DEVICES entries;
//   `pme.roomWindows`  { learner?, monitor?, defib? }: how many windows of each instrument this computer had open, kept when
//                      one opens, so that "Reopen that layout" opens them again the next time.
// Neither ever holds the room code, a PIN, a peer id or an address: "Forget the room" clears them and leaves the code
// (room-code.ts) and P7's PIN alone (§4 D3).
import { DEVICE_RE, INSTRUMENTS, type Instrument, type RelayDevice } from '@pme/controller';
import type { KnownDevice, PeerSeen } from './room-status.ts';

type Store = { get(k: string): string | null; set(k: string, v: string): void };

export const LAYOUT_KEY = 'roomLayout';
export const WINDOWS_KEY = 'roomWindows';
/** [ENG] a full room (the relay's `--max-peers` default is 60) and spares (§4 D8). */
export const MAX_DEVICES = 64;
/** A name the instructor types is kept to this many characters [ENG: a table cell's width]. */
export const MAX_NAME = 32;

export type Layout = Record<string, KnownDevice>;
/** The windows of this computer, by what they show. */
export type Windows = Partial<Record<'learner' | 'monitor' | 'defib', number>>;

const isShow = (v: unknown): v is Instrument => typeof v === 'string' && (INSTRUMENTS as readonly string[]).includes(v);

const parse = (raw: string | null): unknown => {
  try {
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
};

/** The layout kept in `s`; an entry that is not ours (a bad key, a bad field) is dropped. */
export function readLayout(s: Store): Layout {
  const v = parse(s.get(LAYOUT_KEY));
  const out: Layout = {};
  if (!v || typeof v !== 'object') return out;
  for (const [key, e] of Object.entries(v as Record<string, unknown>)) {
    if (!DEVICE_RE.test(key) || !e || typeof e !== 'object') continue;
    const { name, show, lastSeen } = e as Record<string, unknown>;
    if (typeof lastSeen !== 'number' || !Number.isFinite(lastSeen)) continue;
    out[key] = { name: typeof name === 'string' && name ? name.slice(0, MAX_NAME) : null, show: isShow(show) ? show : null, lastSeen };
  }
  return out;
}

/** The newest MAX_DEVICES entries (by lastSeen). */
const trim = (l: Layout): Layout => Object.fromEntries(Object.entries(l).sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, MAX_DEVICES));

/** The layout with every keyed viewer of the relay's table seen `now`, showing what it shows; names kept. */
export function noteDevices(l: Layout, devices: readonly RelayDevice[], now: number): Layout {
  const out = { ...l };
  for (const d of devices) if (d.role === 'viewer' && d.device && DEVICE_RE.test(d.device)) out[d.device] = { name: l[d.device]?.name ?? null, show: d.show, lastSeen: now };
  return trim(out);
}

/** The layout with the device `key` named `name` (trimmed; empty: the default name again). */
export function rename(l: Layout, key: string, name: string, now: number): Layout {
  if (!DEVICE_RE.test(key)) return l;
  const n = name.trim().slice(0, MAX_NAME);
  return trim({ ...l, [key]: { show: l[key]?.show ?? null, lastSeen: l[key]?.lastSeen ?? now, name: n || null } });
}

export const writeLayout = (s: Store, l: Layout): void => s.set(LAYOUT_KEY, JSON.stringify(l));

export function readWindows(s: Store): Windows {
  const v = parse(s.get(WINDOWS_KEY)) as Record<string, unknown> | null;
  const n = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x > 0 && x <= 8 ? x : 0);
  const out: Windows = {};
  if (v && typeof v === 'object') for (const k of ['learner', 'monitor', 'defib'] as const) if (n(v[k])) out[k] = n(v[k]);
  return out;
}

/** This computer's windows heard since this page opened, by what they show (a window of an older build: a learner monitor). */
export function windowsOf(peers: readonly PeerSeen[]): Windows {
  const out: Windows = {};
  for (const p of peers) {
    if (p.via !== 'local' || p.role !== 'viewer') continue;
    const k = p.show === 'monitor' || p.show === 'defib' ? p.show : 'learner';
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Kept only when a window is open: a session that opened none leaves the last one's layout to reopen. */
export function writeWindows(s: Store, w: Windows): void {
  if ((w.learner ?? 0) + (w.monitor ?? 0) + (w.defib ?? 0) > 0) s.set(WINDOWS_KEY, JSON.stringify(w));
}

/** "Forget the room": the names and the windows, never the code or the PIN. */
export function forgetRoom(s: Store): void {
  s.set(LAYOUT_KEY, '{}');
  s.set(WINDOWS_KEY, '{}');
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SHOW_WORD: Record<Instrument, string> = { learner: 'learner monitor', monitor: 'monitor', defib: 'defibrillator', depth: 'depth of anaesthesia' };

/**
 * m5's foot line, from what was kept: "Last time in this room: 1 monitor window and 2 learner monitor windows on this
 * computer; 3 devices (2 learner monitors, 1 monitor)." Null when nothing was kept.
 */
export function lastTime(l: Layout, w: Windows): string | null {
  const parts: string[] = [];
  const wins = (['monitor', 'defib', 'learner'] as const).filter((k) => w[k]).map((k) => count(w[k] ?? 0, `${SHOW_WORD[k]} window`));
  if (wins.length) parts.push(`${wins.length > 1 ? `${wins.slice(0, -1).join(', ')} and ${wins[wins.length - 1]}` : wins[0]} on this computer`);
  const devs = Object.values(l);
  if (devs.length) {
    const by = new Map<string, number>();
    for (const d of devs) by.set(SHOW_WORD[d.show ?? 'learner'], (by.get(SHOW_WORD[d.show ?? 'learner']) ?? 0) + 1);
    parts.push(`${count(devs.length, 'device')} (${[...by].map(([k, n]) => count(n, k)).join(', ')})`);
  }
  return parts.length ? `Last time in this room: ${parts.join('; ')}.` : null;
}
