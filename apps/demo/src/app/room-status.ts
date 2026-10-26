// What the Room page knows about who follows the session (E125), without a DOM. For rc.4 the relay reports phone
// LIVENESS only: how many peers it holds (its `peers` frames) and whether this page's socket to it is open. A device
// speaks to the host when it joins or catches up (a viewer's `hello`; a Remote's hellos and commands), so the page logs
// those per peer id and derives the room's status from them:
//   Stable       the relay socket is open and no phone said hello in the last 2 s (every phone is following);
//   Weak         the relay socket is open and a phone said hello in the last 2 s (it is joining or resyncing);
//   Disconnected the relay socket is not open, or there is no relay (phones cannot join).
// No round-trip time is measured (the relay's heartbeat carries none), so no ping is shown.
export type RoomLevel = 'stable' | 'weak' | 'down';
export type RelayState = 'none' | 'open' | 'down';

/** A hello this recent means the device is joining or catching up [ENG: the owner's 2 s]. */
export const RESYNC_MS = 2000;

export interface PeerSeen {
  id: string;
  /** 'relay': another device (a phone); 'local': a window of this browser (BroadcastChannel). */
  via: 'relay' | 'local';
  role: 'viewer' | 'controller';
  firstAt: number;
  /** Wall ms of its last hello (or command). */
  lastAt: number;
}

/** The devices that said hello, by peer id. */
export class PeerLog {
  private readonly peers = new Map<string, PeerSeen>();

  heard(id: string, via: PeerSeen['via'], role: PeerSeen['role'] | null, now: number): void {
    const p = this.peers.get(id);
    if (p) {
      p.lastAt = now;
      if (role) p.role = role;
    } else this.peers.set(id, { id, via, role: role ?? 'viewer', firstAt: now, lastAt: now });
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
  /** "5 devices", "1 device · no relay: phones cannot join". */
  sub: string;
  devices: number;
}

/** The status box. `phones`: the relay's own count of following devices. */
export function roomStatus(o: { relay: RelayState; phones: number; peers: readonly PeerSeen[]; now: number }): RoomStatus {
  const local = o.peers.filter((p) => p.via === 'local').length;
  const devices = 1 + local + (o.relay === 'open' ? o.phones : 0);
  const n = `${devices} ${devices === 1 ? 'device' : 'devices'}`;
  if (o.relay !== 'open') return { level: 'down', title: 'Disconnected', sub: `${n} · ${o.relay === 'none' ? 'no relay: phones cannot join' : 'the relay does not answer'}`, devices };
  const catching = o.peers.some((p) => p.via === 'relay' && o.now - p.lastAt < RESYNC_MS);
  return catching ? { level: 'weak', title: 'Weak connection', sub: `${n} · a phone is catching up`, devices } : { level: 'stable', title: 'Stable connection', sub: n, devices };
}

/** "now", "12 s ago", "3 min ago", "1 h ago". */
export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 2) return 'now';
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}
