// @pme/controller relay (brief §3.7): rooms keyed by 6-character session code, host authority, a snapshot
// cache for late joiners, heartbeat and room expiry. Two endpoints on one port:
//   /        WireMessages. The first frame must be a `hello`; it binds the socket to (session, from, role).
//   /signal  WebRTC signalling: {to, data} frames routed between peers of one session (?session=&peer=).
// Routing (host authority): only the host's event/snapshot/ack/hello go out; controllers' commands go only to
// the host; viewers may send only hello. A host `snapshot` goes to peers that said hello since their last one.
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { httpHandler, isLocalAddress, lanAddresses } from './http.ts';
import { WIRE_LIMITS, parseWireMessage } from '../src/guard.ts';
import { SESSION_CODE_RE, VIEWER_EVENTS, type Role, type WireMessage } from '../src/protocol.ts';
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
  /** Stage 12 (tests): whether a socket's address is this machine (default: loopback or one of its own addresses). */
  isLocal?: (address: string | undefined) => boolean;
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
  const peersFrame = (room: Room): RelayFrame => ({ relay: 'peers', hostOnline: room.host !== null, peers: room.peers.size });
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
          room.awaiting.add(peer);
          if (room.host) raw(room.host.ws, data);
        }
        return;
      case 'command':
        if (peer.role !== 'controller') {
          dropped++;
          frame(peer.ws, { relay: 'error', code: 'forbidden', message: `${peer.role} may not send commands` });
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
          let lean: string | null | undefined; // the viewers' copy (VIEWER_EVENTS only), made once per message
          for (const p of welcome ? room.awaiting : room.peers) {
            if (p.role !== 'viewer') {
              raw(p.ws, data);
              continue;
            }
            if (lean === undefined) {
              const body = m.body.filter((e) => VIEWER_EVENTS.has(e.type));
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
    if (room.host) frame(room.host.ws, peersFrame(room));
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
  const onWire = (ws: WebSocket, local: boolean) => {
    let peer: Peer | null = null;
    let room: Room | null = null;
    let held: string[] | null = null; // This socket's frames while its hello waits on a liveness check
    const admit = (r: Room, m: Extract<WireMessage, { kind: 'hello' }>, data: string) => {
      const p: Peer = (peer = { ws, id: m.from, role: m.role, alive: true });
      if (m.role === 'host') {
        const old = r.host;
        if (old && old.ws !== ws) old.ws.close(1000, 'replaced by reconnect');
        r.host = p;
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
        // Stage 12: another device follows; only this machine hosts or commands (the room has seen the code)
        if (!local && opts.remoteRoles === 'viewer' && m.role !== 'viewer') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', `${m.role} only from the instructor's computer`);
        if (m.role !== 'host' && room.peers.size >= maxPeers) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} is full (${maxPeers})`);
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
    const local = (opts.isLocal ?? isLocalAddress)(req.socket.remoteAddress);
    // Stage 12: the classroom uses no WebRTC; with the code on the projector, another device gets no signalling either
    if (path === '/signal' && !local && opts.remoteRoles === 'viewer') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', "signalling only from the instructor's computer");
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws, local);
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
