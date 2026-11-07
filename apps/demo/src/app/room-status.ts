// What the Room page knows about who follows the session (E125), without a DOM.
// Room plan R7 (docs/plans/room-and-instruments.md §7; Q9 ruled 5 November): the relay measures every device's ping
// and tells the host alone (R2: its `peers` frame's `devices`), so the status box reads the room from those:
//   Stable       the relay socket is open, and every device answered the relay's last ping within WEAK_PING_MS;
//   Weak         the relay socket is open, and the worst ping is over WEAK_PING_MS or a device missed a heartbeat
//                (its last answer is older than one heartbeat, HEARTBEAT_MS, and the last ping is unanswered);
//   Disconnected the relay socket is not open, or there is no relay (phones cannot join).
// The thresholds are an engineering choice (the owner's Q9 = A), said so on the page's legend.
// A relay of an older build sends no `devices`: the page then reads the room as before R7, from the hellos it heard
// (Weak while a phone said hello in the last RESYNC_MS: joining or catching up) and the relay's count.
import type { Instrument, RelayDevice, Role } from '@pme/controller';

export type RoomLevel = 'stable' | 'weak' | 'down';
export type RelayState = 'none' | 'open' | 'down';

/** Q9 ruled 5 November = A: a ping over this is Weak [ENG: an engineering choice, stated on the legend]. */
export const WEAK_PING_MS = 300;
/** The relay's heartbeat (the kit's and the relay's default, 10 s): a device silent longer than one has missed it. */
export const HEARTBEAT_MS = 10_000;

/** A hello this recent means the device is joining or catching up [ENG: the owner's 2 s]. */
export const RESYNC_MS = 2000;

export interface PeerSeen {
  id: string;
  /** 'relay': another device (a phone); 'local': a window of this browser (BroadcastChannel). */
  via: 'relay' | 'local';
  role: 'viewer' | 'controller' | 'instructor'; // an instructor phone reads 'Instructor remote'; whether it is signed in is the P7 card's row and the relay's `granted`
  /** What its hello said it shows (R4; null: a window of an older build, a Remote). */
  show: Instrument | null;
  firstAt: number;
  /** Wall ms of its last hello (or command). */
  lastAt: number;
}

/** The devices that said hello, by peer id. */
export class PeerLog {
  private readonly peers = new Map<string, PeerSeen>();

  heard(id: string, via: PeerSeen['via'], role: PeerSeen['role'] | null, now: number, show?: Instrument | null): void {
    const p = this.peers.get(id);
    if (p) {
      p.lastAt = now;
      if (role) p.role = role;
      if (show !== undefined) p.show = show;
    } else this.peers.set(id, { id, via, role: role ?? 'viewer', show: show ?? null, firstAt: now, lastAt: now });
  }

  /** The relay says `n` devices follow: a phone that left cannot be told from one that is quiet, so the least recently
   *  heard ones go first (a phone that reloads comes back under a new id and the count stays the same). */
  keepPhones(n: number): void {
    const phones = this.list().filter((p) => p.via === 'relay').sort((a, b) => b.lastAt - a.lastAt);
    for (const p of phones.slice(Math.max(0, n))) this.peers.delete(p.id);
  }

  list(): PeerSeen[] {
    return [...this.peers.values()].sort((a, b) => a.firstAt - b.firstAt);
  }
}

export interface RoomStatus {
  level: RoomLevel;
  title: string;
  /** "7 devices · worst ping 42 ms", "1 device · no relay: phones cannot join". */
  sub: string;
  devices: number;
}

/** A device the relay lists has missed a heartbeat: its last ping is unanswered and it answered none for longer than one. */
export const missed = (d: Pick<RelayDevice, 'rttMs' | 'sinceMs'>): boolean => d.rttMs === null && d.sinceMs > HEARTBEAT_MS;
/** A device's own level: Weak on a slow ping or a missed heartbeat. */
export const deviceLevel = (d: Pick<RelayDevice, 'rttMs' | 'sinceMs'>): 'stable' | 'weak' => (missed(d) || (d.rttMs ?? 0) > WEAK_PING_MS ? 'weak' : 'stable');

/**
 * The status box. `phones`: the relay's own count of following devices; `devices`: the relay's device table (R2), or
 * null from a relay of an older build (the count and the hellos then, as before R7).
 */
export function roomStatus(o: { relay: RelayState; phones: number; peers: readonly PeerSeen[]; now: number; devices?: readonly RelayDevice[] | null }): RoomStatus {
  const local = o.peers.filter((p) => p.via === 'local').length;
  const table = o.relay === 'open' ? (o.devices ?? null) : null;
  const devices = 1 + local + (o.relay !== 'open' ? 0 : table ? table.length : o.phones);
  const n = `${devices} ${devices === 1 ? 'device' : 'devices'}`;
  if (o.relay !== 'open') return { level: 'down', title: 'Disconnected', sub: `${n} · ${o.relay === 'none' ? 'no relay: phones cannot join' : 'the relay does not answer'}`, devices };
  if (table) {
    const pings = table.flatMap((d) => (d.rttMs === null ? [] : [d.rttMs]));
    const worst = pings.length ? `${n} · worst ping ${Math.max(...pings)} ms` : n;
    const late = table.filter(missed).length;
    if (late) return { level: 'weak', title: 'Weak connection', sub: `${worst} · ${late === 1 ? 'a device' : `${late} devices`} missed a heartbeat`, devices };
    return pings.some((p) => p > WEAK_PING_MS) ? { level: 'weak', title: 'Weak connection', sub: worst, devices } : { level: 'stable', title: 'Stable connection', sub: worst, devices };
  }
  const catching = o.peers.some((p) => p.via === 'relay' && o.now - p.lastAt < RESYNC_MS);
  return catching ? { level: 'weak', title: 'Weak connection', sub: `${n} · a phone is catching up`, devices } : { level: 'stable', title: 'Stable connection', sub: n, devices };
}

/** What a device shows, in the table's words (a viewer that never said `show` is a learner monitor, as before R4). */
export function showingOf(role: Role, show: Instrument | null): string {
  if (role === 'instructor') return 'Instructor remote';
  if (role === 'ventilator') return 'Ventilator'; // R8b: the remote cockpit, granted with the PIN as the instructor is
  if (role === 'controller') return 'Remote';
  return show === 'monitor' ? 'Monitor' : show === 'defib' ? 'Defibrillator' : show === 'depth' ? 'Depth of anaesthesia' : 'Learner monitor';
}

/** One row of the device table, without a DOM. */
export interface DeviceRow {
  level: RoomLevel | 'absent';
  /** The relay's peer id, or null for this window and a remembered device that is absent. */
  id: string | null;
  /** The device's own key (R3), or null: an older build, a Remote, a window of this computer. */
  device: string | null;
  show: Instrument | null;
  name: string;
  /** The name can be edited: it is kept under the device's key. */
  named: boolean;
  where: string;
  showing: string;
  state: string;
  ping: string;
  heard: string;
}

/** A remembered device (room-layout.ts) as the table needs it. */
export interface KnownDevice {
  name: string | null;
  show: Instrument | null;
  lastSeen: number;
}

/**
 * The device table (R7): this window; this computer's windows from their hellos; one row per entry of the relay's
 * table, in the order they joined; then each remembered device that is not here now, grey ("expected, not
 * connected"). `devices` null (an older relay): the phones heard since this page opened, and the rest of the relay's
 * count as "before this page opened", as before R7. `ageMs`: how long ago the relay sent `devices`; "last heard" is the
 * device's last answer to a ping as of that frame, plus this (the relay reports at each heartbeat, before its ping, so
 * an answer is heard of one heartbeat later).
 */
export function deviceRows(o: { relay: RelayState; phones: number; peers: readonly PeerSeen[]; now: number; devices: readonly RelayDevice[] | null; known?: Readonly<Record<string, KnownDevice>>; ageMs?: number }): DeviceRow[] {
  const known = o.known ?? {};
  const base = { id: null, device: null, show: null, named: false } as const;
  const rows: DeviceRow[] = [{ ...base, level: 'stable', name: 'This window', where: '', showing: 'Instructor pages and the monitor', state: '—', ping: '—', heard: 'now' }];
  let w = 1;
  for (const x of o.peers.filter((p) => p.via === 'local'))
    rows.push({ ...base, id: x.id, show: x.show, level: 'stable', name: `Window ${++w}`, where: 'this computer', showing: showingOf(x.role, x.show), state: 'connected', ping: 'this computer', heard: ago(o.now - x.lastAt) });
  let p = 0;
  const phone = (key: string | null) => (key && known[key]?.name) || `Phone ${++p}`;
  const down = o.relay !== 'open';
  if (o.devices && !down) {
    const here = new Set<string>();
    for (const d of o.devices) {
      if (d.device) here.add(d.device);
      const lvl = deviceLevel(d);
      const depth = d.role === 'viewer' && d.show === 'depth';
      const state = d.role === 'instructor' || d.role === 'ventilator' ? (d.granted ? 'granted' : 'signing in') : depth ? 'Not available yet' : missed(d) ? 'missed a heartbeat' : lvl === 'weak' ? 'slow' : 'connected';
      rows.push({ level: lvl, id: d.id, device: d.device, show: d.role === 'viewer' ? d.show : null, name: phone(d.device), named: !!d.device, where: '', showing: showingOf(d.role, d.role === 'viewer' ? d.show : null), state, ping: d.rttMs === null ? '—' : `${d.rttMs} ms`, heard: ago(d.sinceMs + (o.ageMs ?? 0)) });
    }
    for (const [key, k] of Object.entries(known)) {
      if (here.has(key)) continue;
      rows.push({ level: 'absent', id: null, device: key, show: k.show, name: k.name || 'Unnamed device', named: true, where: '', showing: showingOf('viewer', k.show), state: 'expected, not connected', ping: '—', heard: ago(o.now - k.lastSeen) });
    }
    return rows;
  }
  for (const x of o.peers.filter((q) => q.via === 'relay')) {
    const lvl: RoomLevel = down ? 'down' : o.now - x.lastAt < RESYNC_MS ? 'weak' : 'stable';
    rows.push({ ...base, id: x.id, show: x.show, level: lvl, name: `Phone ${++p}`, where: '', showing: showingOf(x.role, x.show), state: lvl === 'down' ? 'relay down' : lvl === 'weak' ? 'catching up' : 'synced', ping: '—', heard: ago(o.now - x.lastAt) });
  }
  // Devices the relay counts that said nothing since this page opened (they joined before a reload of it)
  const quiet = down ? 0 : o.phones - o.peers.filter((x) => x.via === 'relay').length;
  for (let i = 0; i < quiet; i++) rows.push({ ...base, level: 'stable', name: `Phone ${++p}`, where: '', showing: 'Learner monitor', state: 'following', ping: '—', heard: 'before this page opened' });
  return rows;
}

/** "now", "12 s ago", "3 min ago", "1 h ago". */
export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 2) return 'now';
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}
