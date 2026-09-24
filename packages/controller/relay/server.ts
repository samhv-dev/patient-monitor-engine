// @pme/controller relay (brief §3.7): rooms keyed by 6-character session code, host authority, a snapshot
// cache for late joiners, heartbeat and room expiry. Two endpoints on one port:
//   /        WireMessages. The first frame must be a `hello`; it binds the socket to (session, from, role).
//   /signal  WebRTC signalling: {to, data} frames routed between peers of one session (?session=&peer=).
// Routing (host authority): only the host's event/snapshot/ack/hello go out; controllers' commands go only to
// the host; viewers may send only hello. A host `snapshot` goes to peers that said hello since their last one.
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { WIRE_LIMITS, parseWireMessage } from '../src/guard.ts';
import { SESSION_CODE_RE, type Role, type WireMessage } from '../src/protocol.ts';
import { RELAY_CLOSE, type RelayFrame } from '../src/transport/relay-frames.ts';

export interface RelayOptions {
  port?: number; // 0 = random (tests)
  host?: string; // default '0.0.0.0' (LAN)
  /** A room with no sockets is deleted after this long (default 10 min) [ENG]. */
  roomTtlMs?: number;
  /** ws ping + {relay:'hb'} interval (default 10 s) [ENG]. */
  heartbeatMs?: number;
  maxRooms?: number; // default 500
  log?: (line: string) => void;
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

export async function startRelay(opts: RelayOptions = {}): Promise<RelayHandle> {
  const roomTtlMs = opts.roomTtlMs ?? 600_000;
  const heartbeatMs = opts.heartbeatMs ?? 10_000;
  const maxRooms = opts.maxRooms ?? 500;
  const log = opts.log ?? (() => {});
  const rooms = new Map<string, Room>();
  const signalRooms = new Map<string, Map<string, WebSocket>>();
  const alive = new WeakMap<WebSocket, boolean>();
  let dropped = 0;

  const wss = new WebSocketServer({ port: opts.port ?? 8787, host: opts.host ?? '0.0.0.0', maxPayload: WIRE_LIMITS.maxBytes });
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });

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
        for (const p of room.peers) raw(p.ws, data);
        return;
      case 'snapshot':
        if (!isHost) return void dropped++;
        room.snapshot = data;
        for (const p of room.awaiting) raw(p.ws, data);
        room.awaiting.clear();
        return;
    }
  };

  const onWire = (ws: WebSocket) => {
    let peer: Peer | null = null;
    let room: Room | null = null;
    ws.on('message', (buf, isBinary) => {
      if (isBinary) return void dropped++;
      const data = buf.toString();
      const m = parseWireMessage(data);
      if (!m) return void dropped++;
      if (!peer) {
        if (m.kind !== 'hello') return refuse(ws, RELAY_CLOSE.badHello, 'bad-hello', 'first frame must be hello');
        if (!SESSION_CODE_RE.test(m.session)) return refuse(ws, RELAY_CLOSE.badSession, 'bad-session', 'invalid session code');
        room = getRoom(m.session);
        if (!room) return refuse(ws, RELAY_CLOSE.full, 'full', 'relay is full');
        peer = { ws, id: m.from, role: m.role, alive: true };
        if (m.role === 'host') {
          const old = room.host;
          if (old && old.id !== m.from && old.ws.readyState === old.ws.OPEN) {
            peer = null;
            return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `session ${m.session} already has a host`);
          }
          if (old && old.ws !== ws) old.ws.close(1000, 'replaced by reconnect');
          room.host = peer;
          for (const p of room.peers) frame(p.ws, peersFrame(room));
          route(room, peer, m, data); // fan the host hello out: peers re-hello and resend pending commands
          // Peers that said hello while the host was away still wait for a snapshot.
        } else {
          room.peers.add(peer);
          frame(ws, peersFrame(room));
          if (!room.host && room.snapshot) raw(ws, room.snapshot); // host offline: serve the cache
          route(room, peer, m, data);
        }
        log(`room ${room.code}: ${m.role} ${m.from} joined`);
        return;
      }
      if (!room || m.session !== room.code || m.from !== peer.id) return void dropped++; // no spoofing
      route(room, peer, m, data);
    });
    ws.on('close', () => {
      if (!peer || !room) return;
      if (room.host === peer) {
        room.host = null;
        for (const p of room.peers) frame(p.ws, peersFrame(room));
      } else {
        room.peers.delete(peer);
        room.awaiting.delete(peer);
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
    ws.on('message', (buf) => {
      let f: { to?: unknown; data?: unknown };
      try {
        f = JSON.parse(buf.toString()) as { to?: unknown; data?: unknown };
      } catch {
        return void dropped++;
      }
      const to = typeof f.to === 'string' ? sroom.get(f.to) : undefined;
      if (!to) return void dropped++;
      raw(to, JSON.stringify({ from: id, data: f.data }));
    });
    ws.on('close', () => {
      if (sroom.get(id) === ws) sroom.delete(id);
      if (sroom.size === 0) signalRooms.delete(code);
    });
  };

  wss.on('connection', (ws, req) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));
    const path = new URL(req.url ?? '/', 'http://relay').pathname;
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws);
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

  const port = (wss.address() as { port: number }).port;
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
        wss.close(() => resolve());
      }),
  };
}
