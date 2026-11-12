// @pme/controller relay (brief §3.7): rooms keyed by 6-character session code, host authority, a snapshot
// cache for late joiners, heartbeat and room expiry. Two endpoints on one port:
//   /        WireMessages. The first frame must be a `hello`; it binds the socket to (session, from, role).
//   /signal  WebRTC signalling: {to, data} frames routed between peers of one session (?session=&peer=).
// Routing (host authority): only the host's event/snapshot/ack/hello/grant go out; controllers' commands go only to
// the host; viewers may send only hello. A host `snapshot` goes to peers that said hello since their last one.
// Plan instructor-peer-role.md P4: an `instructor` socket (a phone with the PIN) is PENDING — routed as a viewer — until
// the host's `grant` for its id; granted, it is routed as a controller and gets the host's frames byte for byte.
// Plan room-and-instruments.md R8b: a `ventilator` socket (a cockpit on another device, with the same PIN) is pending
// in the same way, in its own single place; granted, it exchanges `vent` messages with the host and nothing else: no
// command, no event, no snapshot (it follows nothing), and no learner is ever sent a `vent` or counts it.
// Plan room-and-instruments.md R5c: a `defib` socket (the learner defibrillator window) joins as a learner does, from
// another device and with no PIN, in a learner's place, and receives what a viewer receives; of its commands only
// LEARNER_DEFIB_COMMANDS (Charge and Shock, bare) go to the host, any other is `forbidden`, more than 4 a second close it.
// Defibrillator plan R1 (docs/plans/defibrillator-zoll-m2.md §5.1, DQ6 = A): a `defib` hello that carries the LEARNER PIN is
// admitted as a learner remote is (the wrong-PIN limits, a learner's place), PENDING until the host's grant: every command
// `forbidden` until then; granted, only the ZOLL M2's own controls (learnerDefibM2May) go to the host, any other is
// `forbidden`, more than DEFIB_M2_PER_S a second close it; it still receives a viewer's frames. A socket keeps how its
// first hello was admitted. Until R2 the host grants no `defib` hello, so the M2 table is reached only behind a grant.
// Plan learner-action-remote.md L3 (§4 D2, D9; LQ1 ruled 9 November): a `learner` socket (the learner action remote) joins
// from another device with the LEARNER PIN, in a learner's place (counted under maxPeersPerRoom), PENDING until the host's
// `grant` as an instructor is and under the same per-address wrong-PIN limits; it receives what a viewer receives, granted
// or not, plus the host's `prep` events that name it; its commands are `forbidden` until it is granted, then only
// LEARNER_COMMANDS (learnerMay) go to the host, any other is `forbidden`, more than 6 a second close it.
// Plan pump-rack-tci.md C1 (§4 D2, §7): a `pump` socket (the infusion-pump rack on a tablet) is admitted exactly as a
// `learner` one, on the same learner PIN; granted, only PUMP_COMMANDS (pumpMay) go to the host, any other is `forbidden`,
// more than 6 a second close it; it receives a viewer's frames plus the host's `prep` events that name it.
// A non-host socket keeps the role of its first hello: a hello as another role on it is `forbidden`.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { httpHandler, isLocalAddress, lanAddresses } from './http.ts';
import { storeRoutes } from './store.ts';
import { WIRE_LIMITS, parseWireMessage } from '../src/guard.ts';
import { SESSION_CODE_RE, VIEWER_EVENTS, defibShape, learnerDefibM2May, learnerDefibMay, learnerMay, pumpMay, type Instrument, type Role, type WireEvent, type WireMessage } from '../src/protocol.ts';
import { RELAY_CLOSE, RELAY_RETRY_CLOSE, type RelayDevice, type RelayFrame } from '../src/transport/relay-frames.ts';

export interface RelayOptions {
  port?: number; // 0 = random (tests)
  host?: string; // default '0.0.0.0' (LAN)
  /** A room with no sockets is deleted after this long (default 10 min) [ENG: network]. */
  roomTtlMs?: number;
  /** ws ping + {relay:'hb'} interval (default 10 s) [ENG: network]. */
  heartbeatMs?: number;
  maxRooms?: number; // default 500
  log?: (line: string) => void;
  /** Stage 12: serve this folder (the built app) over http on the same port, for learners' phones. */
  staticDir?: string;
  /**
   * Stage 12: the most non-host peers one session takes (default 60) [ENG: network; twice the measured classroom of 30, see
   * docs/plans/stage-12-mobile-learner.md "Capacity"]. One more is refused (`full`, close 4029: it does not retry).
   */
  maxPeersPerRoom?: number;
  /**
   * Stage 12: the roles a socket from ANOTHER device may take. 'viewer' (classroom: the QR code shows the session code
   * to the room, so a phone may only follow; the host and a Remote run on the instructor's laptop) or 'all' (default).
   */
  remoteRoles?: 'viewer' | 'all';
  /**
   * Stage 12 (tests): whether a socket's address is this machine (default: loopback or one of its own addresses). `req`
   * (plan instructor-peer-role.md §8): the upgrade request, so a test can mark a socket as another device by its URL.
   */
  isLocal?: (address: string | undefined, req: IncomingMessage) => boolean;
  /** The clock of the wrong-PIN limit, ms (tests; default Date.now). */
  now?: () => number;
  /**
   * How long the socket holding a peer id (or the room's host) has to answer a ping when another socket says hello
   * with that id (or as a second host), ms (default 3 s) [ENG: network]. It answers: the newcomer is refused. It does not (a
   * half-open socket): it is closed and the newcomer joins.
   */
  takenCheckMs?: number;
  /**
   * Room plan R1b, and the kit store (docs/plans/scenario-builder.md §8 layer 2; the owner's ruling of 10 November 2026):
   * the kit's own `user-data` folder. The relay keeps there the code of the last room a host opened, in `.room.json` (a
   * hidden file, as the owner ruled: a dot-file, and on Windows the hidden attribute too; the code only: never a PIN, a
   * peer id, an address or a name), read again at start and answered as `lastRoom` in /pme-relay.json; and it answers the
   * kit store's paths (store.ts: the clinicians' scenario cards). The classroom kit moves to the next port when its first
   * is busy, a new origin whose store is empty: the instructor's page then starts under this code. Created at the first
   * write. Absent (the default, `pnpm relay`): nothing is written, and the store's paths are not answered.
   */
  stateDir?: string;
  /**
   * The folder where kits before the ruling of 10 November kept the room code (`room.json` in this computer's
   * application-data folder): read, never written, when `stateDir` holds no code yet, so the room keeps its code. The
   * file there is left as it is.
   */
  oldStateDir?: string;
  /** The system whose hidden-file rule applies (tests; default process.platform). */
  platform?: NodeJS.Platform;
  /** Runs `attrib` on Windows (tests; default spawnSync). */
  attrib?: (args: string[]) => void;
}

/** The room code's file in the kit's user-data folder: a dot-file (hidden on macOS and Linux). */
export const ROOM_FILE = '.room.json';
/** Its name in the old application-data folder. */
export const OLD_ROOM_FILE = 'room.json';

const runAttrib = (args: string[]) => void spawnSync('attrib', args, { stdio: 'ignore', windowsHide: true });

/**
 * `text` written whole to `file` (a hidden temporary file, then a rename) and the file hidden. On Windows a dot-file is
 * not hidden by its name, so `attrib +h` hides it; and a hidden file cannot be replaced by a rename or opened for a
 * fresh write there, so its hidden attribute is taken off first and put back after. UNTESTED ON WINDOWS at this release
 * (the order of the calls is tested with `platform: 'win32'`).
 */
export function writeHidden(file: string, text: string, platform: NodeJS.Platform = process.platform, attrib: (args: string[]) => void = runAttrib): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text);
  if (platform === 'win32') {
    attrib(['+h', tmp]);
    if (existsSync(file)) attrib(['-h', file]);
  }
  renameSync(tmp, file);
  if (platform === 'win32') attrib(['+h', file]);
}

/** The last room's code kept in `dir` (in `file`: ROOM_FILE, or OLD_ROOM_FILE in the old folder), or null when there is
 *  none or the file is not ours. */
export function readLastRoom(dir: string, file = ROOM_FILE): string | null {
  try {
    const v = (JSON.parse(readFileSync(join(dir, file), 'utf8')) as { lastRoom?: unknown } | null)?.lastRoom;
    return typeof v === 'string' && SESSION_CODE_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

interface Peer {
  ws: WebSocket;
  id: string;
  role: Role;
  alive: boolean;
  /**
   * The host granted it: a controller always; an instructor (or the ventilator) once the host granted its PIN, and then it
   * gets the host's frames whole; a learner remote or a pump once the host granted its learner PIN, and then it may
   * command (learnerMay, pumpMay), but it still gets a viewer's frames.
   */
  granted: boolean;
  /** The socket's address (the wrong-PIN limit counts per address). */
  address: string;
  /** R2: what its last hello said it shows, and its device key (null: the hello had none). */
  show: Instrument | null;
  device: string | null;
  /** R2: the round trip of its last answered heartbeat ping, ms, and the number of the sweep that ping was. */
  rttMs: number | null;
  answered: number;
  /** R2: when it last answered a ping (any ping), or joined (relay clock). */
  seenAt: number;
  /** R8b: the relay-clock times of the `vent` messages from it and to it within the last second (VENT_PER_S). */
  vent: { from: number[]; to: number[] };
  /** R5c, L3, C1: the relay-clock times of a `defib`, `learner` or `pump` socket's commands within the last second (DEFIB_PER_S, LEARNER_PER_S, PUMP_PER_S). */
  cmds: number[];
  /** Defibrillator R1: a `defib` socket whose first hello carried the learner PIN (pending until the host's grant). */
  pin: boolean;
}

interface Room {
  code: string;
  host: Peer | null;
  peers: Set<Peer>; // non-host
  snapshot: string | null; // raw JSON of the host's latest snapshot message
  awaiting: Set<Peer>;
  /** The peers the host's last welcome went to, until its snapshot: that snapshot is theirs (null: no welcome since). */
  welcomed: Set<Peer> | null;
  ackRoutes: Map<string, Peer>; // commandId → issuer
  emptySince: number | null;
}

export interface RelayStats {
  rooms: number;
  sockets: number;
  dropped: number;
}

export interface RelayHandle {
  readonly port: number;
  stats(): RelayStats;
  /** Test/diagnostic view of one room. */
  room(code: string): { hostOnline: boolean; peers: number; hasSnapshot: boolean } | undefined;
  /** Run the heartbeat/expiry sweep now (tests). */
  sweep(now?: number): void;
  close(): Promise<void>;
}

const ACK_ROUTES_MAX = 1000;
/** Frames a socket may send while its hello waits on a liveness check; more are dropped [ENG: network]. */
const HELD_MAX = 64;
/** Wrong PINs one address may give within PIN_WINDOW_MS; then it may not say `instructor` for PIN_WINDOW_MS [ENG: network]. */
const PIN_TRIES = 5;
const PIN_WINDOW_MS = 60_000;
/**
 * Instructor hellos one address may send within PIN_WINDOW_MS, whatever the host answers (review G1): the wrong-PIN
 * limit counts the host's answers, so without this a pending socket could make the host check thousands of PINs before
 * its first denials came back. A real phone says one hello per socket, plus one per host reconnect; 20 is four times
 * the wrong-PIN limit and leaves a phone on bad Wi-Fi room for a reconnect every few seconds [ENG: network].
 */
const HELLO_TRIES = 20;
/** The `from` of the relay's own WireMessages (the grant false of a host readmit); its seq is the wall clock. */
const RELAY_FROM = 'pme-relay';
const REJOINED = "the instructor's computer reconnected; signing in again";
/**
 * Instructor sockets a room takes besides its learners (plan §1, "one reserved place"): they never count against
 * maxPeersPerRoom, so a full room of learners never shuts the instructor out; two, so a phone taking over (§3, option B)
 * gets in while the holder is still connected [ENG: network].
 */
const INSTRUCTOR_PLACES = 2;
/**
 * R8b: `vent` messages a socket may send, and be sent, in any one second; one more closes the ventilator's socket
 * (`too-many-tries`) [ENG: network; plan R8b: the cockpit sends one `cmds` per engine tick, 50 a second at ×1 and 400 at ×8;
 * R8c batches them to one message per 20 ms of wall time, 50 a second at any speed; 120 leaves room for `clock` (measured
 * on the monitor side: 5 a second at ×1, 38 at ×8, the engine advanced every 20 ms of wall time) and `settings`].
 */
const VENT_PER_S = 120;
/**
 * R5c: commands a `defib` socket may send in any one second, refused ones included; one more closes it
 * (`too-many-tries`) [ENG: network; plan R5c: a charge and a shock per cycle, with a margin for double taps].
 */
const DEFIB_PER_S = 4;
/**
 * Defibrillator R1: commands an ADMITTED `defib` socket (its hello with the learner PIN) may send in any one second,
 * refused ones included; one more closes it (`too-many-tries`). Derived from the face's fastest legitimate use (plan §4.3):
 * the Trim Knob's value at most every 250 ms while it turns (1000 / 250 = 4), plus the final value on its press (1), plus
 * Shock held down and let go in the same second (`shockButton` down and up, 2): 4 + 1 + 2 = 7 [ENG: network; this
 * derivation, the 250 ms being the face's own throttle]. The no-PIN window keeps DEFIB_PER_S.
 */
const DEFIB_M2_PER_S = 1000 / 250 + 1 + 2;
/**
 * L3 (§4 D2): commands a `learner` socket may send in any one second, refused ones included; one more closes it
 * (`too-many-tries`) [ENG: network; a tray of up to 4 preparations delivered in one press plus a margin for double taps;
 * R5c's 4 a second covers two presses].
 */
const LEARNER_PER_S = 6;
/**
 * C1 (pump-rack-tci.md §4 D2): commands a `pump` socket may send in any one second, refused ones included; one more closes
 * it (`too-many-tries`) [ENG: network; L3's figure: four channels changed in one press sequence plus a margin for double taps].
 */
const PUMP_PER_S = 6;
/** The roles the LEARNER PIN signs in (learner-action-remote.md D9; pump-rack-tci.md §7): never the instructor's. */
const onLearnerPin = (r: Role) => r === 'learner' || r === 'pump';
/** The roles that sign in with the instructor's PIN: never counted among the learners, never told to them. */
const signsIn = (r: Role) => r === 'instructor' || r === 'ventilator';
/**
 * The roles that prove a PIN in their hello (the instructor's, or the learner PIN for `learner`, D9): pending until the
 * host's grant, under the per-address wrong-PIN and hello limits (one count per address, whichever PIN it tried).
 */
const pinned = (r: Role) => signsIn(r) || onLearnerPin(r);
/** A socket that proved a PIN in its hello: a pinned role, or a `defib` whose hello carried the learner PIN (R1). */
const pinnedPeer = (p: { role: Role; pin: boolean }) => pinned(p.role) || (p.role === 'defib' && p.pin);
/** The sockets that follow the patient: learners count only these (an instructor and the cockpit are not told of). */
const follows = (p: { role: Role }) => !signsIn(p.role);
/** Gets the host's frames byte for byte: a granted controller or instructor (a learner remote or a pump, granted, still follows as a viewer). */
const whole = (p: { role: Role; granted: boolean }) => p.granted && !onLearnerPin(p.role) && p.role !== 'defib'; // R1: a granted screen follows as a viewer
/** What a learner's phone must never receive inside `commandApplied` (plan §7): a mark's kind and note, a judged objective. */
const LEARNERS_NEVER: ReadonlySet<string> = new Set(['scenario', 'note']);
const forLearners = (e: WireEvent) =>
  VIEWER_EVENTS.has(e.type) && !(e.type === 'commandApplied' && LEARNERS_NEVER.has(String((e.resolved as { command?: { type?: unknown } } | undefined)?.command?.type)));

export async function startRelay(opts: RelayOptions = {}): Promise<RelayHandle> {
  const roomTtlMs = opts.roomTtlMs ?? 600_000;
  const heartbeatMs = opts.heartbeatMs ?? 10_000;
  const maxRooms = opts.maxRooms ?? 500;
  const log = opts.log ?? (() => {});
  const rooms = new Map<string, Room>();
  const signalRooms = new Map<string, Map<string, WebSocket>>();
  const alive = new WeakMap<WebSocket, boolean>();
  let dropped = 0;

  const maxPeers = opts.maxPeersPerRoom ?? 60;
  const takenCheckMs = opts.takenCheckMs ?? 3000;
  const clock = opts.now ?? Date.now;
  /** Per address: the times of its recent wrong PINs and instructor hellos, and until when it may not say `instructor`. */
  const denials = new Map<string, { at: number[]; hellos: number[]; until: number }>();
  const kept = opts.stateDir ? readLastRoom(opts.stateDir) : null;
  /** The code in the folder: its own, else (read once, at start) the one an older kit kept in the application-data folder. */
  let lastRoom = kept ?? (opts.stateDir && opts.oldStateDir ? readLastRoom(opts.oldStateDir, OLD_ROOM_FILE) : null);
  /** Whether `.room.json` holds `lastRoom` (false after a code taken from the old folder: the next host's hello writes it). */
  let written = kept !== null;
  /** R1b: a host's hello names the room it runs; kept (whole-file replace) when it changes. A write that fails is logged. */
  const keepLastRoom = (code: string) => {
    if (!opts.stateDir || (code === lastRoom && written)) return;
    lastRoom = code;
    try {
      mkdirSync(opts.stateDir, { recursive: true });
      writeHidden(join(opts.stateDir, ROOM_FILE), `${JSON.stringify({ lastRoom: code })}\n`, opts.platform, opts.attrib);
      written = true;
    } catch (err) {
      log(`the last room was not kept in ${opts.stateDir}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  const blocked = (address: string) => (denials.get(address)?.until ?? 0) > clock();
  /** Counts one instructor hello from `address`; false (not counted) past HELLO_TRIES in the window. */
  const mayHello = (address: string) => {
    const t = clock();
    const d = denials.get(address) ?? { at: [], hellos: [], until: 0 };
    d.hellos = d.hellos.filter((x) => t - x < PIN_WINDOW_MS);
    denials.set(address, d);
    if (d.hellos.length >= HELLO_TRIES) return false;
    d.hellos.push(t);
    return true;
  };
  const tooMany = (ws: WebSocket, role: Role) => refuse(ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', `too many ${role === 'learner' ? 'learner remote' : role === 'pump' ? 'pump' : role === 'defib' ? 'defibrillator' : 'instructor'} sign-ins from this device: wait a minute`);
  let relaySeq = 0;
  const wrongPin = (address: string) => {
    const t = clock();
    const d = denials.get(address) ?? { at: [], hellos: [], until: 0 };
    d.at = [...d.at.filter((x) => t - x < PIN_WINDOW_MS), t];
    if (d.at.length >= PIN_TRIES) {
      d.at = [];
      d.until = t + PIN_WINDOW_MS;
      log(`${address}: ${PIN_TRIES} wrong PINs; no PIN hello (instructor, ventilator, learner, pump) from it for ${PIN_WINDOW_MS / 1000} s`);
    }
    denials.set(address, d);
  };
  // Stage 12: one http server carries the WebSockets, `/pme-relay.json` and (with staticDir) the app itself
  const http = createServer(httpHandler({ ...(opts.staticDir ? { staticDir: opts.staticDir } : {}), ...(opts.stateDir ? { store: storeRoutes({ dir: opts.stateDir }) } : {}), info: () => ({ relay: 'pme', port, addresses: lanAddresses(), serves: !!opts.staticDir, ...(lastRoom ? { lastRoom } : {}) }) }));
  await new Promise<void>((resolve, reject) => {
    http.once('listening', resolve);
    http.once('error', reject); // a busy port rejects (the WebSocketServer is attached after: it re-threw this error)
    http.listen(opts.port ?? 8787, opts.host ?? '0.0.0.0');
  });
  const wss = new WebSocketServer({ server: http, maxPayload: WIRE_LIMITS.maxBytes });

  const frame = (ws: WebSocket, f: RelayFrame) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(f));
  };
  const raw = (ws: WebSocket, data: string) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  };
  const refuse = (ws: WebSocket, code: number, err: Extract<RelayFrame, { relay: 'error' }>['code'], message: string) => {
    frame(ws, { relay: 'error', code: err, message });
    ws.close(code, message);
  };
  const count = (room: Room, f: (p: Peer) => boolean) => [...room.peers].filter(f).length;
  /** Learners count the phones that follow; only the host hears of instructors (plan §1: learners are not told). */
  const peersFrame = (room: Room): Extract<RelayFrame, { relay: 'peers' }> => ({ relay: 'peers', hostOnline: room.host !== null, peers: count(room, follows) });
  /** R2: the heartbeat sweep's number and time; each sweep's ping carries its number, so its pong is told apart. */
  let sweepNo = 0;
  let sweepAt = 0;
  /**
   * R2 (§4 D2): the host alone hears every device, with its last hello's instrument and its measured ping; a socket the
   * relay is closing is not listed. Its round trip counts only if it answered the LAST sweep's ping.
   */
  const devices = (room: Room): RelayDevice[] => {
    const t = clock();
    return [...room.peers]
      .filter((p) => p.ws.readyState === p.ws.OPEN)
      .map((p) => ({ id: p.id, role: p.role, show: p.show, device: p.device, granted: p.granted, rttMs: p.answered === sweepNo ? p.rttMs : null, sinceMs: t - p.seenAt }));
  };
  const hostPeersFrame = (room: Room): RelayFrame => ({ ...peersFrame(room), instructors: count(room, (p) => p.role === 'instructor' && p.granted), devices: devices(room) });
  /** FU-11 (F01, BA10): one peer's frame that throws is that frame's problem, never the process's (logged and dropped). */
  const contain = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      dropped++;
      log(`frame dropped: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getRoom = (code: string): Room | null => {
    let room = rooms.get(code);
    if (!room) {
      if (rooms.size >= maxRooms) return null;
      room = { code, host: null, peers: new Set(), snapshot: null, awaiting: new Set(), welcomed: null, ackRoutes: new Map(), emptySince: null };
      rooms.set(code, room);
      log(`room ${code} created`);
    }
    room.emptySince = null;
    return room;
  };

  const route = (room: Room, peer: Peer, m: WireMessage, data: string) => {
    const isHost = room.host === peer;
    switch (m.kind) {
      case 'hello':
        if (isHost) for (const p of room.peers) raw(p.ws, data);
        else {
          // R5c: a socket keeps the role of its first hello (the relay routes it by that role, the host hears this one)
          if (m.role !== peer.role) {
            dropped++;
            frame(peer.ws, { relay: 'error', code: 'forbidden', message: `this socket said hello as ${peer.role}` });
            return;
          }
          // R1: and how it was admitted (a no-PIN window does not become a pending one on its socket, nor the reverse)
          if (peer.role === 'defib' && (m.pin !== undefined) !== peer.pin) {
            dropped++;
            frame(peer.ws, { relay: 'error', code: 'forbidden', message: `this socket said hello ${peer.pin ? 'with' : 'without'} the learner PIN` });
            return;
          }
          // A re-said instructor (or learner, or pump) hello counts too: one open socket must not flood the host with PIN checks (G1)
          if (pinnedPeer(peer) && (blocked(peer.address) || !mayHello(peer.address))) return tooMany(peer.ws, peer.role);
          peer.show = m.show ?? null; // R2: what it shows is its LAST hello's
          peer.device = m.device ?? null;
          if (peer.role !== 'ventilator') room.awaiting.add(peer); // R8b: the cockpit waits on no snapshot
          if (room.host) raw(room.host.ws, data);
        }
        return;
      case 'command': {
        if (peer.role === 'defib') {
          // R5c: counted before anything else (a flood is closed, not answered `forbidden` each time); then the allow-list.
          // R1: a screen admitted on the learner PIN is pending until the host's grant, then sends the M2 table, at its cap
          if (overRate(peer, peer.cmds, peer.pin ? DEFIB_M2_PER_S : DEFIB_PER_S, 'commands')) return;
          const why = !peer.pin ? learnerDefibMay(m.body) : peer.granted ? learnerDefibM2May(m.body) : 'the defibrillator is not signed in';
          if (why) {
            dropped++;
            log(`defib ${peer.id}: refused ${defibShape(m.body)}: ${why}`);
            frame(peer.ws, { relay: 'error', code: 'forbidden', message: why });
            return;
          }
        } else if (peer.role === 'learner') {
          // L3: counted first, as the window's; pending, every command is refused; granted, only LEARNER_COMMANDS pass
          if (overRate(peer, peer.cmds, LEARNER_PER_S, 'commands')) return;
          const why = peer.granted ? learnerMay(m.body) : 'the learner remote is not signed in';
          if (why) {
            dropped++;
            frame(peer.ws, { relay: 'error', code: 'forbidden', message: why });
            return;
          }
        } else if (peer.role === 'pump') {
          // C1: exactly the learner remote's line, with the pump's allow-list (D2)
          if (overRate(peer, peer.cmds, PUMP_PER_S, 'commands')) return;
          const why = peer.granted ? pumpMay(m.body) : 'the pump is not signed in';
          if (why) {
            dropped++;
            frame(peer.ws, { relay: 'error', code: 'forbidden', message: why });
            return;
          }
        } else if (!peer.granted || peer.role === 'ventilator') { // R8b: the cockpit's commands ride `vent`, built by its link
          dropped++;
          frame(peer.ws, { relay: 'error', code: 'forbidden', message: peer.role === 'instructor' ? 'the instructor phone is not signed in' : `${peer.role} may not send commands` });
          return;
        }
        if (room.ackRoutes.size >= ACK_ROUTES_MAX) room.ackRoutes.delete(room.ackRoutes.keys().next().value as string);
        room.ackRoutes.set(m.body.id, peer);
        if (room.host) raw(room.host.ws, data);
        else dropped++; // the controller re-sends unacked commands when the host's hello arrives
        return;
      }
      case 'ack': {
        if (!isHost) return void dropped++;
        const to = room.ackRoutes.get(m.commandId);
        room.ackRoutes.delete(m.commandId);
        if (to) raw(to.ws, data);
        return;
      }
      case 'grant': {
        // The host's answer to an instructor hello (plan §1), sent before its welcome: consumed here, and told to that
        // socket only. Denied: a pending socket gave a wrong PIN (counted per address); a granted one is revoked.
        const to = isHost ? [...room.peers].find((p) => pinnedPeer(p) && p.id === m.to) : undefined;
        if (!to) return void dropped++;
        raw(to.ws, data);
        if (m.granted) to.granted = true;
        else {
          if (!to.granted) wrongPin(to.address);
          to.granted = false;
          frame(to.ws, { relay: 'error', code: 'denied', message: m.reason ?? "the instructor's computer refused the PIN" });
          to.ws.close(RELAY_CLOSE.denied, 'denied');
        }
        log(`room ${room.code}: ${to.role} ${to.id} ${m.granted ? 'granted' : 'denied'}`);
        tellHost(room);
        return;
      }
      case 'event':
        if (!isHost) return void dropped++;
        // FU-11 (R50 F3): a host's `mirror` frames (the Ventilator view's samples) are for same-browser viewers only —
        // brief §3.7: raw samples never cross the wire
        if (m.body.some((e) => e.type === 'commandApplied' && (e.resolved as { mirror?: unknown } | undefined)?.mirror === true)) return void dropped++;
        {
          // Stage 12: the host's answer to a hello (its sticky replays) is for the peers waiting on a snapshot — sent to
          // the whole room, 30 phones joining (or re-syncing after a fast-forward) made 30 × 30 copies of it
          // (a welcome event of the host's own — its style — carries `replay: true` itself)
          const welcome = m.body.some((e) => (e as { replay?: unknown }).replay === true || (e.type === 'commandApplied' && (e.resolved as { replay?: unknown } | undefined)?.replay === true));
          // the copy for viewers, pending instructors and learners (VIEWER_EVENTS, minus the instructor's words), made once per
          // message; L3: a learner remote's own `prep` events ride in its copy only (§4 D7); C1: a pump's, its preparation
          // labels, in its copy only (pump-rack-tci.md §7)
          let lean: string | null | undefined;
          const preps = m.body.filter((e): e is Extract<WireEvent, { type: 'prep' }> => e.type === 'prep');
          if (welcome) room.welcomed = new Set(room.awaiting);
          for (const p of welcome ? (room.welcomed as Set<Peer>) : room.peers) {
            if (p.role === 'ventilator') continue; // R8b: it follows nothing; the monitor's half of its link rides `vent`
            if (whole(p)) {
              raw(p.ws, data);
              continue;
            }
            if (lean === undefined) {
              const body = m.body.filter(forLearners);
              lean = body.length === 0 ? null : body.length === m.body.length ? data : JSON.stringify({ ...m, body });
            }
            const mine = onLearnerPin(p.role) && p.granted ? preps.filter((e) => e.to === p.id) : [];
            if (mine.length > 0) raw(p.ws, JSON.stringify({ ...m, body: m.body.filter((e) => forLearners(e) || mine.includes(e as never)) }));
            else if (lean !== null) raw(p.ws, lean);
          }
        }
        return;
      case 'snapshot':
        if (!isHost) return void dropped++;
        room.snapshot = data;
        {
          // the snapshot after a welcome is for the peers that welcome went to: a peer that said hello in between keeps
          // waiting for the host's answer to its own hello (a snapshot without the welcome lost the Case briefing)
          const to = room.welcomed ?? room.awaiting;
          for (const p of [...to]) {
            raw(p.ws, data);
            room.awaiting.delete(p);
          }
          room.welcomed = null;
        }
        return;
      case 'vent': {
        // R8b: the host's goes to the granted cockpit its `to` names, only; the cockpit's, once granted, to the host only.
        // Never fanned out, never cached, never in a lean copy. Counted per socket each way (the host's on the cockpit
        // it goes to: a flood closes the cockpit, never the room's host) before anything else, so a pending flood is
        // closed, not answered 120 times a second with `forbidden`.
        const sock = isHost ? [...room.peers].find((p) => p.role === 'ventilator' && p.granted && p.id === m.to) : peer;
        if (!sock) return void dropped++;
        if (overRate(sock, isHost ? sock.vent.to : sock.vent.from, VENT_PER_S, 'ventilator messages')) return;
        if (isHost) return raw(sock.ws, data);
        if (peer.role !== 'ventilator' || !peer.granted) {
          dropped++;
          frame(peer.ws, { relay: 'error', code: 'forbidden', message: peer.role === 'ventilator' ? 'the ventilator is not signed in' : `${peer.role} may not send ventilator messages` });
          return;
        }
        if (room.host) raw(room.host.ws, data);
        else dropped++; // the cockpit holds at its clock limit until the host is back
        return;
      }
    }
  };
  /**
   * Counts one frame on `times` (one socket, one way: R8b's `vent`, R5c's `defib` commands); past `perS` in a sliding
   * second, closes that socket (`too-many-tries`).
   */
  const overRate = (p: Peer, times: number[], perS: number, what: string) => {
    const t = clock();
    while (times.length > 0 && t - (times[0] as number) >= 1000) times.shift();
    if (times.length < perS) {
      times.push(t);
      return false;
    }
    dropped++;
    log(`${p.role} ${p.id}: more than ${perS} ${what} a second: closed`);
    refuse(p.ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', `more than ${perS} ${what} a second`);
    return true;
  };

  /**
   * R29: the host hears that a peer's socket left, so it forgets that peer's sequence and role (the known gap of #183:
   * a hello forged under a Remote's id while the Remote reconnected outlived the forger's socket). Host only.
   */
  const peerLeft = (room: Room, p: Peer) => {
    if (room.host) frame(room.host.ws, { relay: 'peer-left', id: p.id });
  };
  /** Stage 12: the host hears how many peers follow (the instructor's QR panel counts the phones). */
  const tellHost = (room: Room) => {
    if (room.host) frame(room.host.ws, hostPeersFrame(room));
  };
  /**
   * Whether a socket is still there: it answers a ping within `ms`. A half-open one (a phone whose Wi-Fi dropped, a
   * laptop reloaded while its old socket hangs) does not, and resolves false as soon as it closes.
   */
  const answers = (ws: WebSocket, ms: number) =>
    new Promise<boolean>((ok) => {
      if (ws.readyState !== ws.OPEN) return ok(false);
      const done = (v: boolean) => {
        clearTimeout(t);
        ws.off('pong', yes);
        ws.off('close', no);
        ok(v);
      };
      const yes = () => done(true);
      const no = () => done(false);
      const t = setTimeout(no, ms);
      ws.once('pong', yes);
      ws.once('close', no);
      try {
        ws.ping();
      } catch {
        no();
      }
    });
  const onWire = (ws: WebSocket, local: boolean, address: string) => {
    let peer: Peer | null = null;
    let room: Room | null = null;
    let held: string[] | null = null; // This socket's frames while its hello waits on a liveness check
    const admit = (r: Room, m: Extract<WireMessage, { kind: 'hello' }>, data: string) => {
      const p: Peer = (peer = { ws, id: m.from, role: m.role, alive: true, granted: m.role === 'controller', address, show: m.show ?? null, device: m.device ?? null, rttMs: null, answered: 0, seenAt: clock(), vent: { from: [], to: [] }, cmds: [], pin: m.role === 'defib' && m.pin !== undefined });
      if (m.role === 'host') {
        const old = r.host;
        if (old && old.ws !== ws) old.ws.close(1000, 'replaced by reconnect');
        r.host = p;
        keepLastRoom(r.code);
        // A grant is the granting host's: a new host socket (a reloaded laptop, or the same one after a Wi-Fi blip)
        // verifies every instructor again. A granted phone is told so first, in the relay's own grant false, so that it
        // says its hello again on the host's hello below (review F1); it is not a denial: its socket stays open.
        for (const q of r.peers) {
          if (!pinnedPeer(q) || !q.granted) continue;
          q.granted = false;
          relaySeq = Math.max(relaySeq + 1, Date.now()); // rises across a relay restart too (the phone's sequence filter)
          raw(q.ws, JSON.stringify({ v: 1, session: r.code, from: RELAY_FROM, seq: relaySeq, sentAt: Date.now(), kind: 'grant', to: q.id, granted: false, reason: REJOINED } satisfies WireMessage));
          log(`room ${r.code}: ${q.role} ${q.id} signs in again (a new host socket)`);
        }
        for (const q of r.peers) frame(q.ws, peersFrame(r));
        tellHost(r);
        route(r, p, m, data); // fan the host hello out: peers re-hello and resend pending commands
        // Peers that said hello while the host was away still wait for a snapshot.
      } else {
        r.peers.add(p);
        frame(ws, peersFrame(r));
        tellHost(r);
        if (!r.host && r.snapshot && m.role !== 'ventilator') raw(ws, r.snapshot); // host offline: serve the cache
        route(r, p, m, data);
      }
      log(`room ${r.code}: ${m.role} ${m.from} joined`);
    };
    /**
     * One open socket per peer id, whatever the role, and one host per room: a second socket claiming an id in use (a
     * hand-written hello with the panel's id, read off the wire) would share that peer's state on the host. The socket
     * holding the id is pinged first: if it answers within `takenCheckMs` the newcomer is refused — a taken id with a
     * RETRYABLE close (the follower's backoff keeps trying), a second host with another id as before (fatal); if it
     * does not, it is closed and the newcomer joins (verification 2026-10-29; coordinator's ruling the same day).
     */
    const join = (r: Room, m: Extract<WireMessage, { kind: 'hello' }>, data: string) => {
      // R8b: the cockpit has ONE place of its own (plan §4 D9: one ventilator drives), beside the instructors' and never
      // counted against maxPeersPerRoom; it is held as the host's is: a live holder refuses the newcomer, a half-open goes
      const holder = [r.host, ...r.peers].find((p) => p !== null && p.ws.readyState === p.ws.OPEN && (p.id === m.from || (m.role === 'host' && p === r.host) || (m.role === 'ventilator' && p.role === 'ventilator')));
      if (!holder) return admit(r, m, data);
      held = [];
      void answers(holder.ws, takenCheckMs).then((live) => contain(() => {
        const queued = held ?? [];
        held = null;
        if (ws.readyState !== ws.OPEN) return;
        if (live && holder.ws.readyState === holder.ws.OPEN) {
          if (holder.id !== m.from && m.role === 'ventilator') return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} has a ventilator already`);
          if (holder.id !== m.from) return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `session ${m.session} already has a host`);
          log(`room ${r.code}: ${m.role} ${m.from} refused: peer id ${m.from} is taken by a live socket`);
          return ws.close(RELAY_RETRY_CLOSE.idTaken, `peer id ${m.from} is taken`);
        }
        log(`room ${r.code}: ${holder.role} ${holder.id} did not answer within ${takenCheckMs} ms: closed for the newcomer ${m.role} ${m.from}`);
        holder.ws.terminate();
        if (r.host === holder) r.host = null;
        // R29: told now, before the newcomer's hello reaches the host (the terminated socket's close event comes later)
        if (r.peers.delete(holder)) peerLeft(r, holder);
        r.awaiting.delete(holder);
        r.welcomed?.delete(holder);
        join(r, m, data);
        for (const d of queued) take(d); // in order; held again if this hello waits on another check
      }));
    };
    const onFrame = (data: string) => {
      const m = parseWireMessage(data);
      if (!m) return void dropped++;
      if (!peer) {
        if (m.kind !== 'hello') return refuse(ws, RELAY_CLOSE.badHello, 'bad-hello', 'first frame must be hello');
        if (!SESSION_CODE_RE.test(m.session)) return refuse(ws, RELAY_CLOSE.badSession, 'bad-session', 'invalid session code');
        room = getRoom(m.session);
        if (!room) return refuse(ws, RELAY_CLOSE.full, 'full', 'relay is full');
        // Stage 12: another device follows; only this machine hosts or commands (the room has seen the code). P4: or it
        // says `instructor`, and commands once the host has granted its PIN.
        // R8b: or `ventilator`, the cockpit on another device, with the same PIN. R5c: or `defib`, as a learner does. L3: or
        // `learner`, the learner action remote, with the learner PIN. C1: or `pump`, with the same PIN
        if (!local && opts.remoteRoles === 'viewer' && m.role !== 'viewer' && m.role !== 'defib' && !pinned(m.role)) return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', `${m.role} only from the instructor's computer`);
        if (signsIn(m.role)) {
          if (blocked(address)) return refuse(ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', 'too many wrong PINs from this device: wait a minute');
          if (m.role === 'instructor' && count(room, (p) => p.role === 'instructor') >= INSTRUCTOR_PLACES) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} has no instructor place free`);
          if (!mayHello(address)) return tooMany(ws, m.role);
        } else if (onLearnerPin(m.role) || (m.role === 'defib' && m.pin !== undefined)) {
          // L3 (D9), C1 (§7), defibrillator R1 (DQ6): the wrong-PIN limits first, as an instructor's; then a learner's place, as a phone's
          if (blocked(address)) return refuse(ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', 'too many wrong PINs from this device: wait a minute');
          if (count(room, follows) >= maxPeers) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} is full (${maxPeers})`);
          if (!mayHello(address)) return tooMany(ws, m.role);
        } else if (m.role !== 'host' && count(room, follows) >= maxPeers) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} is full (${maxPeers})`);
        return join(room, m, data);
      }
      if (!room || m.session !== room.code || m.from !== peer.id) return void dropped++; // no spoofing
      route(room, peer, m, data);
    };
    // R2: the round trip of this socket's answer to the sweep's ping (the pong echoes the ping's payload, RFC 6455 §5.5.3;
    // the liveness check's ping, `answers`, carries none). Any pong says the socket is there.
    ws.on('pong', (data) => {
      if (!peer) return;
      const t = clock();
      peer.seenAt = t;
      if (sweepNo > 0 && peer.answered !== sweepNo && data.toString() === String(sweepNo)) {
        peer.rttMs = t - sweepAt;
        peer.answered = sweepNo;
      }
    });
    const take = (data: string) => {
      if (!held) return onFrame(data);
      if (held.length < HELD_MAX) held.push(data);
      else dropped++;
    };
    ws.on('message', (buf, isBinary) => contain(() => {
      if (isBinary) return void dropped++;
      take(buf.toString());
    }));
    ws.on('close', () => {
      if (!peer || !room) return;
      if (room.host === peer) {
        room.host = null;
        for (const p of room.peers) frame(p.ws, peersFrame(room));
      } else {
        // Not in the room any more: a half-open socket the relay already replaced (join), which told the host then
        if (room.peers.delete(peer)) peerLeft(room, peer);
        room.awaiting.delete(peer);
        room.welcomed?.delete(peer);
        tellHost(room);
      }
      if (!room.host && room.peers.size === 0) room.emptySince = Date.now();
      log(`room ${room.code}: ${peer.role} ${peer.id} left`);
    });
  };

  const onSignal = (ws: WebSocket, req: IncomingMessage) => {
    const q = new URL(req.url ?? '/', 'http://relay').searchParams;
    const code = q.get('session') ?? '';
    const id = q.get('peer') ?? '';
    if (!SESSION_CODE_RE.test(code) || !/^[\w-]{1,64}$/.test(id)) return refuse(ws, RELAY_CLOSE.badSession, 'bad-session', 'bad session or peer');
    let sroom = signalRooms.get(code);
    if (!sroom) signalRooms.set(code, (sroom = new Map()));
    const prev = sroom.get(id);
    if (prev && prev.readyState === prev.OPEN) return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `peer id ${id} is taken`);
    sroom.set(id, ws);
    ws.on('message', (buf) => contain(() => {
      let f: unknown;
      try {
        f = JSON.parse(buf.toString());
      } catch {
        return void dropped++;
      }
      // FU-11 (F01, BA10): `null`, an array or a primitive is valid JSON but not a signalling frame (null.to killed the relay)
      if (f === null || typeof f !== 'object' || Array.isArray(f)) return void dropped++;
      const { to: id2, data } = f as { to?: unknown; data?: unknown };
      const to = typeof id2 === 'string' ? sroom.get(id2) : undefined;
      if (!to) return void dropped++;
      raw(to, JSON.stringify({ from: id, data }));
    }));
    ws.on('close', () => {
      if (sroom.get(id) === ws) sroom.delete(id);
      if (sroom.size === 0) signalRooms.delete(code);
    });
  };

  wss.on('connection', (ws, req) => {
    // FU-11 (F01, BA10): a socket error (a frame over maxPayload, a broken frame) closes THAT socket; without a listener
    // the ws library re-threw it as an unhandled 'error' event and the whole relay exited with every room on it
    ws.on('error', (err) => {
      dropped++;
      log(`socket error: ${err.message}`);
    });
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));
    const path = new URL(req.url ?? '/', 'http://relay').pathname;
    const local = opts.isLocal ? opts.isLocal(req.socket.remoteAddress, req) : isLocalAddress(req.socket.remoteAddress);
    const address = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
    // Stage 12: the classroom uses no WebRTC; with the code on the projector, another device gets no signalling either
    if (path === '/signal' && !local && opts.remoteRoles === 'viewer') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', "signalling only from the instructor's computer");
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws, local, address);
  });

  const sweep = (now = Date.now()) => {
    const gone = new Set<WebSocket>();
    for (const ws of wss.clients) {
      if (alive.get(ws) !== false) continue;
      ws.terminate();
      gone.add(ws);
    }
    // R2: the host hears the answers to the last sweep's ping before this one's goes out (a closing socket is not listed)
    for (const room of rooms.values()) tellHost(room);
    sweepNo++;
    sweepAt = now;
    for (const ws of wss.clients) {
      if (gone.has(ws)) continue;
      alive.set(ws, false);
      ws.ping(String(sweepNo));
      frame(ws, { relay: 'hb', t: now });
    }
    const old = (x: number) => now - x >= PIN_WINDOW_MS;
    for (const [a, d] of denials) if (d.until <= now && d.at.every(old) && d.hellos.every(old)) denials.delete(a); // forgotten after 60 s
    for (const [code, room] of rooms) {
      if (room.emptySince !== null && now - room.emptySince >= roomTtlMs) {
        rooms.delete(code);
        log(`room ${code} expired`);
      }
    }
  };
  const timer = setInterval(() => sweep(), heartbeatMs);
  timer.unref?.();

  const port: number = (http.address() as { port: number }).port;
  log(`pme relay listening on ${opts.host ?? '0.0.0.0'}:${port}`);
  return {
    port,
    stats: () => ({ rooms: rooms.size, sockets: wss.clients.size, dropped }),
    room: (code) => {
      const r = rooms.get(code);
      return r && { hostOnline: r.host !== null, peers: r.peers.size, hasSnapshot: r.snapshot !== null };
    },
    sweep,
    // Stop accepting first (a WebSocket handshake that came in after wss.close removed its upgrade listener was served
    // as a plain GET), then end every socket: the WebSockets, and every HTTP connection, idle or not. Waiting for the
    // clients to drop theirs was unbounded: Node stops the server's own request timeouts once it closes, so a request a
    // client never finished (or a connection it kept busy) held close() for as long as the client stayed (PR #306,
    // CI run 42350190627: a test's afterEach waited 90 s on a page that was still open).
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(timer);
        http.close(() => resolve());
        for (const ws of wss.clients) ws.terminate();
        wss.close();
        http.closeAllConnections();
      }),
  };
}
