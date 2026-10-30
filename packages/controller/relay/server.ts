// @pme/controller relay (brief §3.7): rooms keyed by 6-character session code, host authority, a snapshot
// cache for late joiners, heartbeat and room expiry. Two endpoints on one port:
//   /        WireMessages. The first frame must be a `hello`; it binds the socket to (session, from, role).
//   /signal  WebRTC signalling: {to, data} frames routed between peers of one session (?session=&peer=).
// Routing (host authority): only the host's event/snapshot/ack/hello/grant go out; controllers' commands go only to
// the host; viewers may send only hello. A host `snapshot` goes to peers that said hello since their last one.
// Plan instructor-peer-role.md P4: an `instructor` socket (a phone with the PIN) is PENDING — routed as a viewer — until
// the host's `grant` for its id; granted, it is routed as a controller and gets the host's frames byte for byte.
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { httpHandler, isLocalAddress, lanAddresses } from './http.ts';
import { WIRE_LIMITS, parseWireMessage } from '../src/guard.ts';
import { SESSION_CODE_RE, VIEWER_EVENTS, type Role, type WireEvent, type WireMessage } from '../src/protocol.ts';
import { RELAY_CLOSE, RELAY_RETRY_CLOSE, type RelayFrame } from '../src/transport/relay-frames.ts';

export interface RelayOptions {
  port?: number; // 0 = random (tests)
  host?: string; // default '0.0.0.0' (LAN)
  /** A room with no sockets is deleted after this long (default 10 min) [ENG]. */
  roomTtlMs?: number;
  /** ws ping + {relay:'hb'} interval (default 10 s) [ENG]. */
  heartbeatMs?: number;
  maxRooms?: number; // default 500
  log?: (line: string) => void;
  /** Stage 12: serve this folder (the built app) over http on the same port, for learners' phones. */
  staticDir?: string;
  /**
   * Stage 12: the most non-host peers one session takes (default 60) [ENG: twice the measured classroom of 30, see
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
   * with that id (or as a second host), ms (default 3 s) [ENG]. It answers: the newcomer is refused. It does not (a
   * half-open socket): it is closed and the newcomer joins.
   */
  takenCheckMs?: number;
}

interface Peer {
  ws: WebSocket;
  id: string;
  role: Role;
  alive: boolean;
  /** May command and gets the host's frames whole: a controller always, an instructor once the host granted it. */
  granted: boolean;
  /** The socket's address (the wrong-PIN limit counts per address). */
  address: string;
}

interface Room {
  code: string;
  host: Peer | null;
  peers: Set<Peer>; // non-host
  snapshot: string | null; // raw JSON of the host's latest snapshot message
  awaiting: Set<Peer>;
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
/** Frames a socket may send while its hello waits on a liveness check; more are dropped [ENG]. */
const HELD_MAX = 64;
/** Wrong PINs one address may give within PIN_WINDOW_MS; then it may not say `instructor` for PIN_WINDOW_MS [ENG]. */
const PIN_TRIES = 5;
const PIN_WINDOW_MS = 60_000;
/**
 * Instructor hellos one address may send within PIN_WINDOW_MS, whatever the host answers (review G1): the wrong-PIN
 * limit counts the host's answers, so without this a pending socket could make the host check thousands of PINs before
 * its first denials came back. A real phone says one hello per socket, plus one per host reconnect; 20 is four times
 * the wrong-PIN limit and leaves a phone on bad Wi-Fi room for a reconnect every few seconds [ENG].
 */
const HELLO_TRIES = 20;
/** The `from` of the relay's own WireMessages (the grant false of a host readmit); its seq is the wall clock. */
const RELAY_FROM = 'pme-relay';
const REJOINED = "the instructor's computer reconnected; signing in again";
/**
 * Instructor sockets a room takes besides its learners (plan §1, "one reserved place"): they never count against
 * maxPeersPerRoom, so a full room of learners never shuts the instructor out; two, so a phone taking over (§3, option B)
 * gets in while the holder is still connected [ENG].
 */
const INSTRUCTOR_PLACES = 2;
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
  const tooMany = (ws: WebSocket) => refuse(ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', 'too many instructor sign-ins from this device: wait a minute');
  let relaySeq = 0;
  const wrongPin = (address: string) => {
    const t = clock();
    const d = denials.get(address) ?? { at: [], hellos: [], until: 0 };
    d.at = [...d.at.filter((x) => t - x < PIN_WINDOW_MS), t];
    if (d.at.length >= PIN_TRIES) {
      d.at = [];
      d.until = t + PIN_WINDOW_MS;
      log(`${address}: ${PIN_TRIES} wrong PINs; no instructor hello from it for ${PIN_WINDOW_MS / 1000} s`);
    }
    denials.set(address, d);
  };
  // Stage 12: one http server carries the WebSockets, `/pme-relay.json` and (with staticDir) the app itself
  const http = createServer(httpHandler({ ...(opts.staticDir ? { staticDir: opts.staticDir } : {}), info: () => ({ relay: 'pme', port, addresses: lanAddresses(), serves: !!opts.staticDir }) }));
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
  const peersFrame = (room: Room): Extract<RelayFrame, { relay: 'peers' }> => ({ relay: 'peers', hostOnline: room.host !== null, peers: count(room, (p) => p.role !== 'instructor') });
  const hostPeersFrame = (room: Room): RelayFrame => ({ ...peersFrame(room), instructors: count(room, (p) => p.role === 'instructor' && p.granted) });
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
      room = { code, host: null, peers: new Set(), snapshot: null, awaiting: new Set(), ackRoutes: new Map(), emptySince: null };
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
          // A re-said instructor hello counts too: one open socket must not flood the host with PIN checks (G1)
          if (peer.role === 'instructor' && (blocked(peer.address) || !mayHello(peer.address))) return tooMany(peer.ws);
          room.awaiting.add(peer);
          if (room.host) raw(room.host.ws, data);
        }
        return;
      case 'command':
        if (!peer.granted) {
          dropped++;
          frame(peer.ws, { relay: 'error', code: 'forbidden', message: peer.role === 'instructor' ? 'the instructor phone is not signed in' : `${peer.role} may not send commands` });
          return;
        }
        if (room.ackRoutes.size >= ACK_ROUTES_MAX) room.ackRoutes.delete(room.ackRoutes.keys().next().value as string);
        room.ackRoutes.set(m.body.id, peer);
        if (room.host) raw(room.host.ws, data);
        else dropped++; // the controller re-sends unacked commands when the host's hello arrives
        return;
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
        const to = isHost ? [...room.peers].find((p) => p.role === 'instructor' && p.id === m.to) : undefined;
        if (!to) return void dropped++;
        raw(to.ws, data);
        if (m.granted) to.granted = true;
        else {
          if (!to.granted) wrongPin(to.address);
          to.granted = false;
          frame(to.ws, { relay: 'error', code: 'denied', message: m.reason ?? "the instructor's computer refused the PIN" });
          to.ws.close(RELAY_CLOSE.denied, 'denied');
        }
        log(`room ${room.code}: instructor ${to.id} ${m.granted ? 'granted' : 'denied'}`);
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
          // the copy for viewers and pending instructors (VIEWER_EVENTS, minus the instructor's words), made once per message
          let lean: string | null | undefined;
          for (const p of welcome ? room.awaiting : room.peers) {
            if (p.granted) {
              raw(p.ws, data);
              continue;
            }
            if (lean === undefined) {
              const body = m.body.filter(forLearners);
              lean = body.length === 0 ? null : body.length === m.body.length ? data : JSON.stringify({ ...m, body });
            }
            if (lean !== null) raw(p.ws, lean);
          }
        }
        return;
      case 'snapshot':
        if (!isHost) return void dropped++;
        room.snapshot = data;
        for (const p of room.awaiting) raw(p.ws, data);
        room.awaiting.clear();
        return;
    }
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
      const p: Peer = (peer = { ws, id: m.from, role: m.role, alive: true, granted: m.role === 'controller', address });
      if (m.role === 'host') {
        const old = r.host;
        if (old && old.ws !== ws) old.ws.close(1000, 'replaced by reconnect');
        r.host = p;
        // A grant is the granting host's: a new host socket (a reloaded laptop, or the same one after a Wi-Fi blip)
        // verifies every instructor again. A granted phone is told so first, in the relay's own grant false, so that it
        // says its hello again on the host's hello below (review F1); it is not a denial: its socket stays open.
        for (const q of r.peers) {
          if (q.role !== 'instructor' || !q.granted) continue;
          q.granted = false;
          relaySeq = Math.max(relaySeq + 1, Date.now()); // rises across a relay restart too (the phone's sequence filter)
          raw(q.ws, JSON.stringify({ v: 1, session: r.code, from: RELAY_FROM, seq: relaySeq, sentAt: Date.now(), kind: 'grant', to: q.id, granted: false, reason: REJOINED } satisfies WireMessage));
          log(`room ${r.code}: instructor ${q.id} signs in again (a new host socket)`);
        }
        for (const q of r.peers) frame(q.ws, peersFrame(r));
        tellHost(r);
        route(r, p, m, data); // fan the host hello out: peers re-hello and resend pending commands
        // Peers that said hello while the host was away still wait for a snapshot.
      } else {
        r.peers.add(p);
        frame(ws, peersFrame(r));
        tellHost(r);
        if (!r.host && r.snapshot) raw(ws, r.snapshot); // host offline: serve the cache
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
      const holder = [r.host, ...r.peers].find((p) => p !== null && p.ws.readyState === p.ws.OPEN && (p.id === m.from || (m.role === 'host' && p === r.host)));
      if (!holder) return admit(r, m, data);
      held = [];
      void answers(holder.ws, takenCheckMs).then((live) => contain(() => {
        const queued = held ?? [];
        held = null;
        if (ws.readyState !== ws.OPEN) return;
        if (live && holder.ws.readyState === holder.ws.OPEN) {
          if (holder.id !== m.from) return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `session ${m.session} already has a host`);
          log(`room ${r.code}: ${m.role} ${m.from} refused: peer id ${m.from} is taken by a live socket`);
          return ws.close(RELAY_RETRY_CLOSE.idTaken, `peer id ${m.from} is taken`);
        }
        log(`room ${r.code}: ${holder.role} ${holder.id} did not answer within ${takenCheckMs} ms: closed for the newcomer ${m.role} ${m.from}`);
        holder.ws.terminate();
        if (r.host === holder) r.host = null;
        r.peers.delete(holder);
        r.awaiting.delete(holder);
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
        if (!local && opts.remoteRoles === 'viewer' && m.role !== 'viewer' && m.role !== 'instructor') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', `${m.role} only from the instructor's computer`);
        if (m.role === 'instructor') {
          if (blocked(address)) return refuse(ws, RELAY_CLOSE.tooManyTries, 'too-many-tries', 'too many wrong PINs from this device: wait a minute');
          if (count(room, (p) => p.role === 'instructor') >= INSTRUCTOR_PLACES) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} has no instructor place free`);
          if (!mayHello(address)) return tooMany(ws);
        } else if (m.role !== 'host' && count(room, (p) => p.role !== 'instructor') >= maxPeers) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} is full (${maxPeers})`);
        return join(room, m, data);
      }
      if (!room || m.session !== room.code || m.from !== peer.id) return void dropped++; // no spoofing
      route(room, peer, m, data);
    };
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
        room.peers.delete(peer);
        room.awaiting.delete(peer);
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
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
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
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(timer);
        for (const ws of wss.clients) ws.terminate();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}
