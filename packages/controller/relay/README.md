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
(default 10; an empty room is forgotten after this long), `--quiet`.

Then open the host monitor with the relay URL, e.g. `http://<laptop-ip>:5173/stage6a.html?relay=ws://<laptop-ip>:8787/`,
and use **Open remote** / **Open viewer**, or type the session code on a phone at `/stage6a-remote.html`.

## What it does

| Frame from | `hello` | `command` | `ack` | `event` | `snapshot` |
|---|---|---|---|---|---|
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer | cached; sent to peers that said hello since their last snapshot |
| controller | forwarded to the host; marks the peer as awaiting a snapshot | to the host | dropped | dropped | dropped |
| viewer | same as controller | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped |

- The first frame on a socket must be a `hello`; it binds the socket to `(session, from, role)`. Later frames
  with another `session` or `from` are dropped.
- One host per session. A second host with a different id is refused (close code 4009); the same host id
  reconnecting replaces its old socket.
- While the host is away, a joining peer gets the cached snapshot and `{relay:'peers', hostOnline:false}`.
- Heartbeat every 10 s: a WebSocket ping (dead sockets are terminated) and a `{relay:'hb'}` frame, so browser
  clients can notice a dead link (they cannot see pings).
- `/signal?session=CODE&peer=ID` is the WebRTC signalling endpoint: frames `{to, data}` are routed to peer `to`
  in the same session as `{from, data}`. The host uses the id `host`.

## Security

The session code is the only secret. Run the relay on a trusted LAN, or behind a TLS reverse proxy
(`wss://`) with access control if it must be reachable from the internet. Messages larger than 256 KB, or
carrying typed arrays or long numeric arrays, are refused.
