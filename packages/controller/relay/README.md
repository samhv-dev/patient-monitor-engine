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
be; default `viewer`, with or without `--static`: `all` lets any device that knows the session code command).

Then open the host monitor with the relay URL, e.g. `http://<laptop-ip>:5173/dev/controller-host.html?relay=ws://<laptop-ip>:8787/`,
and use **Open remote** / **Open viewer**, or type the session code on a phone at `/dev/controller-remote.html`
(a phone that commands as a `controller` needs `pnpm relay -- --remote-roles all`: by default another device may only
follow, or sign in as the instructor's phone with the PIN).

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

| Frame from | `hello` | `command` | `ack` | `event` | `snapshot` | `grant` |
|---|---|---|---|---|---|---|
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer (a controller or a granted instructor: the frame as sent; a viewer or a pending instructor: the lean copy, below; a hello's replays: only to peers awaiting a snapshot; `mirror` frames: dropped) | cached; sent to peers that said hello since their last snapshot | consumed: applied to the instructor socket of that id and told to it alone (below) |
| controller | forwarded to the host; marks the peer as awaiting a snapshot | to the host | dropped | dropped | dropped | dropped |
| instructor, granted | same as controller | to the host | dropped | dropped | dropped | dropped |
| instructor, pending | same as controller (its PIN reaches the host alone) | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped | dropped |
| viewer | same as controller | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped | dropped |

- **The lean copy** (a learner's phone, a pending instructor): `VIEWER_EVENTS` only, and no `commandApplied` of a
  `scenario` or `note` command (a mark's kind and note, a judged objective: plan instructor-peer-role.md §7). The
  host's `instructorView` feed is not in `VIEWER_EVENTS`.
- **An instructor socket** (`hello {role:'instructor', pin}`, plan §1) is admitted PENDING, from any device. The host
  answers its hello with `grant {to, granted, reason?}` before its welcome. Granted: the socket commands and gets the
  host's frames byte for byte. Denied: `{relay:'error', code:'denied', message: reason}` and close 4013, which the
  phone does not retry (its page asks for the PIN again); a later `granted:false` revokes a granted socket the same way.
  A grant is never carried over: a new socket under the same id, or a new host socket, starts pending again.
- **Wrong PINs:** 5 denials of pending sockets from one address within 60 s, and that address may not say
  `instructor` for 60 s (`too-many-tries`, close 4028); it may still follow. A revoked grant is not a wrong PIN.
  Each phone has its own address, so learners cannot lock the real instructor out.

- The first frame on a socket must be a `hello`; it binds the socket to `(session, from, role)`. Later frames
  with another `session` or `from` are dropped.
- One host per session. A second host with a different id is refused (close code 4009); the same host id
  reconnecting replaces its old socket.
- Stage 12: a session takes `--max-peers` non-host peers; the next is refused `full` (close code 4029, no retry).
  Instructor sockets do not count against it: they have two places of their own (the phone, and one taking over), so
  a full room of learners never shuts the instructor out. With `--remote-roles viewer`, a socket from another device
  saying `host` or `controller` is refused `forbidden` (close code 4003); it may say `viewer` or `instructor`; this
  machine (loopback or one of its own addresses) may still host and command. The host gets a `{relay:'peers'}` frame
  whenever a peer comes or goes or an instructor is granted (the QR sheet counts the phones; `instructors`: the granted
  instructor phones, in the host's frame only). `peers` counts the peers that are not instructors, so learners are not
  told an instructor phone exists.
- While the host is away, a joining peer gets the cached snapshot and `{relay:'peers', hostOnline:false}`.
- Heartbeat every 10 s: a WebSocket ping (dead sockets are terminated) and a `{relay:'hb'}` frame, so browser
  clients can notice a dead link (they cannot see pings).
- `/signal?session=CODE&peer=ID` is the WebRTC signalling endpoint: frames `{to, data}` are routed to peer `to`
  in the same session as `{from, data}`. The host uses the id `host`.

## Security

The session code is the only secret — and in a classroom it is on the projector, so there `--remote-roles viewer`
(the default) lets other devices only follow: commands come from the instructor's laptop alone, or from a phone the
laptop granted with the PIN, and the host refuses a viewer's command as well. The PIN travels in the instructor's
hello to the host only; a pending or denied instructor gets what a viewer gets, and guessing is limited per address
(above). The relay logs no PIN. A peer id belongs to one live socket per session: when a second socket
says hello with an id in use (or as a second host), the relay pings the socket that holds it and refuses the newcomer
if it answers within 3 s (an id: close 4010, which the client retries; another host: close 4009), or closes it and
lets the newcomer in if it does not, so a phone whose network dropped or a reloaded laptop gets back in. One gap is
known: while a peer's socket is down the host still holds that peer's last sequence number, so a hand-written hello
with its id and a higher number sent in that window blocks the peer's commands until its page reloads. Run the relay on a trusted LAN, or behind a TLS reverse proxy
(`wss://`) with access control if it must be reachable from the internet. Messages larger than 256 KB, or
carrying typed arrays or long numeric arrays, are refused.
