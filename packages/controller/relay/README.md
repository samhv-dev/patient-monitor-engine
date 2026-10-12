# pme-relay

The WebSocket relay for `@pme/controller` (brief §3.7): it pairs a host monitor with remote controllers and
viewers by a 6-character session code. It carries commands, acks, events and snapshots — never waveform
samples — and it signals WebRTC connections.

## Run it

From the repository root (Node ≥ 22.12, after `pnpm install`):

```bash
pnpm relay                    # ws://0.0.0.0:8787/
pnpm relay -- --port 9000     # another port
npx pme-relay --port 9000     # the same bin through npx
```

Options: `--port` (default 8787), `--host` (default `0.0.0.0`, i.e. reachable on the LAN), `--room-ttl-min`
(default 10; an empty room is forgotten after this long), `--quiet`; Stage 12: `--static DIR` (also serve the built
app on the same port), `--max-peers N` (default 60 per session), `--remote-roles viewer|all` (what another device may
be; default `viewer` with `--static`, else `all`).

Then open the host monitor with the relay URL, e.g. `http://<laptop-ip>:5173/stage6a.html?relay=ws://<laptop-ip>:8787/`,
and use **Open remote** / **Open viewer**, or type the session code on a phone at `/stage6a-remote.html`.

## The classroom (Stage 12: learners' phones)

```bash
(cd apps/demo && ../../node_modules/.bin/vite build --base ./ --outDir /tmp/pme-app)
npx -y pnpm@9.15.9 relay -- --port 8650 --static /tmp/pme-app
```

The instructor opens `http://127.0.0.1:8650/?relay#/` on the laptop; the top bar's **Phones** (or **Phones** in the
Monitor view's top strip) shows a QR code of `http://<laptop address>:8650/?join=<CODE>`: a phone opens the app from
the relay and follows the session over it, as a viewer. The showcase kit's **Start Classroom** does the same with its
bundled `server/relay.mjs`. `GET /pme-relay.json` answers `{relay:'pme', port, addresses, serves}` (the laptop's IPv4
addresses, its own hotspot first) for the QR code. A phone gets only the events a viewer uses (`VIEWER_EVENTS`); the
host's answer to a hello (its sticky replays) goes only to the peers awaiting a snapshot. Measured capacity and the
run sheet: `docs/plans/stage-12-mobile-learner.md`, `docs/showcase/CLASSROOM.md`.

## What it does

| Frame from | `hello` | `command` | `ack` | `event` | `snapshot` |
|---|---|---|---|---|---|
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer (a viewer: only `VIEWER_EVENTS`; a hello's replays: only to peers awaiting a snapshot; `mirror` frames: dropped) | cached; sent to peers that said hello since their last snapshot |
| controller | forwarded to the host; marks the peer as awaiting a snapshot | to the host | dropped | dropped | dropped |
| viewer | same as controller | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped |

- The first frame on a socket must be a `hello`; it binds the socket to `(session, from, role)`. Later frames
  with another `session` or `from` are dropped.
- One host per session. A second host with a different id is refused (close code 4009); the same host id
  reconnecting replaces its old socket.
- Stage 12: a session takes `--max-peers` non-host peers; the next is refused `full` (close code 4029, no retry). With
  `--remote-roles viewer`, a socket from another device saying `host` or `controller` is refused `forbidden` (close
  code 4003); this machine (loopback or one of its own addresses) may still host and command. The host gets a
  `{relay:'peers'}` frame whenever a peer comes or goes (the QR sheet counts the phones).
- While the host is away, a joining peer gets the cached snapshot and `{relay:'peers', hostOnline:false}`.
- Heartbeat every 10 s: a WebSocket ping (dead sockets are terminated) and a `{relay:'hb'}` frame, so browser
  clients can notice a dead link (they cannot see pings).
- `/signal?session=CODE&peer=ID` is the WebRTC signalling endpoint: frames `{to, data}` are routed to peer `to`
  in the same session as `{from, data}`. The host uses the id `host`.

## Security

The session code is the only secret — and in a classroom it is on the projector, so there `--remote-roles viewer`
(the default with `--static`) lets other devices only follow: commands come from the instructor's laptop alone, and
the host refuses a viewer's command as well. Run the relay on a trusted LAN, or behind a TLS reverse proxy
(`wss://`) with access control if it must be reachable from the internet. Messages larger than 256 KB, or
carrying typed arrays or long numeric arrays, are refused.
