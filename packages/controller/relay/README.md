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
be; default `viewer`, with or without `--static`: `all` lets any device that knows the session code command);
`--state-dir DIR` (room plan R1b, and the kit store: the classroom kit passes its own `user-data` folder, the owner's
ruling of 10 November 2026: the code of the last room a host opened is kept in `DIR/.room.json`, a hidden file, the code
only, and `/pme-relay.json` answers it as `lastRoom`, so the classroom kit's room code survives a restart on another
port; and the kit store's `/pme-store/` paths keep scenario cards under `DIR/scenarios/`, below; without it nothing is
written), `--old-state-dir DIR` (where kits before that ruling kept the code, `DIR/room.json`: read once when the state
folder has none, never written).

### The kit store (`/pme-store/`, with `--state-dir`)

`relay/store.ts` (docs/plans/scenario-builder.md §8 layer 2). The kit's Node.js simulator server (`serve.mjs`) answers
the same paths from the bundled `server/store.mjs`.

| Request | Answer | Who |
|---|---|---|
| `GET /pme-store/` | `{store:'pme', folder, writable, refused?, why?}` (`refused`: `not-this-computer`, or `not-writable` with the system's reason, e.g. a read-only disk) | anyone |
| `GET /pme-store/scenarios/` | `{cards:[{id, title, versions:[{v, at, bytes}]}]}`, the newest version's title | anyone (the plan: reads are open to the room) |
| `GET /pme-store/scenarios/<id>/<v>` | version `v`'s card file, as written | anyone |
| `POST /pme-store/scenarios/<id>` (`application/json`, the card file) | 201 `{v, at, bytes, same:false}`: a new file `DIR/scenarios/<id>/v0001-<UTC time>.json`; 200 `same:true` when the bytes are the newest version's (nothing written); 400 an id that is not a safe file name (letters, digits, `_`, `.`, `-`, at most 64, no Windows device name) or a body that is not a card with that id; 413 over 512 KiB; 507 the folder cannot be written | this computer only: the loopback peer, a loopback `Host`, a loopback `Origin` or none (403 otherwise) |

| `GET /pme-store/debriefs/` | `{debriefs:[{id, bytes, at}]}` | this computer only (a debrief names a resident: 403 to a phone) |
| `GET /pme-store/debriefs/<id>` | the archive entry's file (`pme-archive-entry/1`) | this computer only |
| `PUT /pme-store/debriefs/<id>` (`application/json`) | 200 `{id, bytes, at}`: `DIR/debriefs/<id>.json`, written whole; a re-save of the same run replaces it; 400 / 413 (16 MiB) / 507 as above | this computer only |
| `DELETE /pme-store/debriefs/<id>` | 200: the file deleted for good (no recycle bin); 404 when there was none | this computer only |

A card version is never overwritten (each is created where no file was). A preflight (`OPTIONS`) is answered for a page of this
computer (a loopback origin) only.

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

| Frame from | `hello` | `command` | `ack` | `event` | `snapshot` | `grant` | `vent` |
|---|---|---|---|---|---|---|---|
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer but the ventilator (a controller or a granted instructor: the frame as sent; a viewer, a pending instructor or a learner remote, granted or not: the lean copy, below, plus for a granted learner remote the host's `prep` events that name it; a hello's replays: only to peers awaiting a snapshot; `mirror` frames: dropped) | cached; sent to peers that said hello since their last snapshot (never the ventilator) | consumed: applied to the instructor, ventilator or learner socket of that id and told to it alone (below) | to the GRANTED ventilator its `to` names, alone; otherwise dropped |
| controller | forwarded to the host; marks the peer as awaiting a snapshot | to the host | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| instructor, granted | same as controller | to the host | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| instructor, pending | same as controller (its PIN reaches the host alone) | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| ventilator, granted | forwarded to the host (its PIN reaches the host alone); awaits no snapshot | refused (`forbidden`: its commands ride `vent`) | dropped | dropped | dropped | dropped | to the host alone, as sent |
| ventilator, pending | same as granted | refused (`forbidden`) | dropped | dropped | dropped | dropped | refused (`forbidden`), never at the host |
| viewer | same as controller | refused (`{relay:'error', code:'forbidden'}`) | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| defib | same as controller | Charge or Shock, bare (`LEARNER_DEFIB_COMMANDS`): to the host; any other: refused (`forbidden`) | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| learner, granted | same as controller (its learner PIN reaches the host alone) | `LEARNER_COMMANDS` with their own fields only (`learnerMay`): to the host; any other: refused (`forbidden`) | dropped | dropped | dropped | dropped | refused (`forbidden`) |
| learner, pending | same as granted | refused (`forbidden`: "the learner remote is not signed in") | dropped | dropped | dropped | dropped | refused (`forbidden`) |

- **The lean copy** (a learner's phone, a pending instructor): `VIEWER_EVENTS` only, and no `commandApplied` of a
  `scenario` or `note` command (a mark's kind and note, a judged objective: plan instructor-peer-role.md §7). The
  host's `instructorView` feed is not in `VIEWER_EVENTS`.
- **A `note` command** (from a granted instructor or a controller) is `{type:'note', kind:'note'|'marker', text, ev?}`:
  `text` at most 500 characters, `ev` the run event the note is, one of `NOTE_EVENTS` (`recognised`, the Recognised
  press). The relay forwards it byte for byte; a frame the guard refuses (another `ev`, a longer text) is dropped
  before it reaches the host.
- **An instructor socket** (`hello {role:'instructor', pin}`, plan §1) is admitted PENDING, from any device. The host
  answers its hello with `grant {to, granted, reason?}` before its welcome. Granted: the socket commands and gets the
  host's frames byte for byte. Denied: `{relay:'error', code:'denied', message: reason}` and close 4013, which the
  phone does not retry (its page asks for the PIN again); a later `granted:false` revokes a granted socket the same way.
  A grant is never carried over: a new socket under the same id, or a new host socket, starts pending again. When a
  host socket is admitted (a reloaded laptop, or the same one after a Wi-Fi blip), each granted instructor is first
  sent the relay's own `grant {granted:false, reason:"the instructor's computer reconnected; signing in again"}`
  (`from: 'pme-relay'`), so the phone says its hello again on the host's hello; its socket stays open, and it is not a
  wrong PIN.
- **The ventilator socket** (`hello {role:'ventilator', pin}`, plan room-and-instruments.md R8a/R8b, §4 D9: the
  cockpit on another device drives the patient, so it proves the instructor's PIN; a hello without one is refused by
  the guard). It is admitted PENDING from any device, as an instructor is, and the host's `grant` applies to it in the
  same way (denied: close 4013; a new host socket: the relay's own `grant false`). It has ONE place of its own, beside
  the instructors' and outside `--max-peers`: while a cockpit's socket answers a ping a second one is refused `full`
  (close 4029); a half-open one is closed for the newcomer. Granted, it exchanges `vent {to?, body}` with the host
  alone — `body` is one of the ventilator link's messages (`cmds`, `lungState`, `clock`, `run`, `time`, `control`,
  `settings`), or R8c's `batch` (1 to 16 `cmds`: the relay port's 20 ms of wall time), checked by the guard: a `cmds`
  carries an integer `tick` and at most 6 commands, each an `externalDrive` from `source: 'ventilator'`, an
  `applyEvent` of kind `airway` or a `setTarget`; `settings` may carry `measured {RR, VTE}` and `hidden`; a body is at
  most 4 KB. It follows
  nothing: no event, no snapshot, no cached snapshot, and learners are neither counted it nor ever sent a `vent`.
  It is said by the ventilator's own page on a device (R8d: `vent-hamilton.html?join=CODE#/vent`, opened from the
  picker's Ventilator card), after its user types the PIN into P7's form; every new socket says it again from a new
  id, and the page drops its socket when the browser goes offline (the host hands over within 1 s of the silence). A
  ventilator window on the laptop itself (`vent-hamilton.html?link=CODE`) never comes here: it links over the
  browser's BroadcastChannel, trusted as every window of that browser is (§4 D9).
- **The defibrillator window** (`hello {role:'defib'}`, plan room-and-instruments.md R5c, Q5 ruled 5 November: learners
  press Charge and Shock themselves). It joins as a learner does: from any device, with no PIN (a PIN on its hello is
  refused by the guard), in a learner's place under `--max-peers`, and counted in `peers`. It may name `show` and
  `device` as a viewer does. It RECEIVES what a viewer receives: the lean copy, the snapshot after its hello, the cached
  snapshot while the host is away. Of what it SENDS, a `command` goes to the host only if `learnerDefibMay` passes it:
  `applyEvent` of `{kind:'defib', action:'charge'}` or `{kind:'defib', action:'shock'}` and no other field (no
  `energyJ`: the room's model sets the energy; no `outcome`; no `atTick`). Any other command is answered
  `{relay:'error', code:'forbidden'}` and never reaches the host; the socket stays open and follows. The host's ack of a
  passing command comes back to it, as to a controller. At most 4 commands a second through one `defib` socket,
  refused ones included [ENG: network; a charge and a shock per cycle, with a margin for double taps]; the 5th within a sliding
  second closes it (`too-many-tries`, close 4028). The host checks the allow-list again itself (R5d).
- **The learner action remote** (`hello {role:'learner', show:'learner', device, pin}`, plan learner-action-remote.md
  L3, §4 D2, D9; LQ1 ruled 9 November: a separate learner PIN, which never grants the instructor's role, and the
  instructor's PIN never this one). A hello without a PIN is refused by the guard. It joins from any device, in a
  learner's place under `--max-peers` (never in an instructor's place), counted in `peers`, and is PENDING until the
  host's `grant` for its id, as an instructor is, under the same per-address limits (below). It RECEIVES what a viewer
  receives, granted or not (a granted learner remote is not an instructor: never the frame as sent, never
  `instructorView`), plus the host's `prep` events (`{type:'prep', to, body}`, §4 D7) whose `to` is its own id: those
  ride in its copy alone, never to another learner, a viewer or a defibrillator window. Of what it SENDS, a pending
  socket's every `command` is `forbidden`; a granted one's goes to the host only if `learnerMay` passes it: `prep stage`
  (`prep: {id, components: [{productId, amount, unit}], diluent?: {id, volumeMl}, container?}`), `prep discard`
  (`prepId`), `prep deliver` (`prepId, volumeMl | 'all', route, overS?`, and `stageGroup`/`batch` for a tray),
  `prep infuse` (`prepId, rateMlH`), `infusion set` (`drugId, rateMlH`: any running infusion, LQ4) and `applyEvent` of
  `{kind:'lab', panel}` (`abg` or `vbg`, the engine's panels; no `turnaroundS`), with no other field anywhere (no
  `atTick`, no `by`, no concentration or finding: the host computes those, D3). The guard drops a `prep` or `infusion`
  command whose values are not their types (an id, a positive amount, a route the drug model has), from anyone. Any
  other command is `forbidden` and never reaches the host; the socket stays open and follows. At most 6 commands a
  second through one `learner` socket, pending or granted, refused ones included [ENG: network; a tray of up to 4
  delivered in one press plus a margin for double taps]; the 7th within a sliding second closes it (`too-many-tries`,
  close 4028). The host's `grant {granted:false}` to a granted learner socket revokes it (`denied`, close 4013): the
  host sends it to every granted learner remote when the learner PIN changes (L4). A new host socket makes each granted
  learner remote sign in again, as an instructor does. The host checks the learner PIN, and the allow-list again (L4).
- **One role per socket:** a non-host socket that says `hello` again as another role than its first is answered
  `forbidden`; that hello never reaches the host, and the socket keeps its first role.
- **`vent` flood:** at most 120 `vent` a second through one socket each way — from a socket, and from the host to the
  ventilator, counted on the ventilator's socket. The next closes that socket (`too-many-tries`, close 4028; the
  host's own socket is never closed for it). The cockpit makes one `cmds` a tick (50 a second at ×1, 400 at ×8); the
  relay port (`packages/ventilator` link/relay-port.ts, R8c) sends those of each 20 ms of wall time in one message,
  measured on a fake clock at 30 a second at ×1 and 38.5 (peak 40) at ×8 with a 60 Hz cockpit, and the monitor's `clock`
  measured 5 a second at ×1 and 38 at ×8 (the engine advanced every 20 ms of wall time).
- **Wrong PINs:** 5 denials of pending sockets from one address within 60 s, and that address may not say
  `instructor` for 60 s (`too-many-tries`, close 4028); it may still follow. A revoked grant is not a wrong PIN.
  The ventilator's and the learner remote's hellos and denials count with the instructor's, one count per address
  whichever PIN was tried (`instructor` above reads `instructor`, `ventilator` or `learner`).
  Whatever the host answers, one address may send 20 instructor hellos (first or re-said) in 60 s; the next gets
  `too-many-tries` and close 4028, and never reaches the host, so one socket cannot flood the host with PIN checks.
  Each phone has its own address, so learners cannot lock the real instructor out. The limits key on the socket's
  address: run the relay directly on the LAN, not behind a proxy, which would give every phone one address.

- The first frame on a socket must be a `hello`; it binds the socket to `(session, from, role)`. Later frames
  with another `session` or `from` are dropped.
- One host per session. A second host with a different id is refused (close code 4009); the same host id
  reconnecting replaces its old socket.
- Stage 12: a session takes `--max-peers` non-host peers; the next is refused `full` (close code 4029, no retry).
  Instructor sockets do not count against it: they have two places of their own (the phone, and one taking over), so
  a full room of learners never shuts the instructor out. With `--remote-roles viewer`, a socket from another device
  saying `host` or `controller` is refused `forbidden` (close code 4003); it may say `viewer`, `defib`, `learner`, `instructor` or `ventilator`; this
  machine (loopback or one of its own addresses) may still host and command. The host gets a `{relay:'peers'}` frame
  whenever a peer comes or goes or an instructor is granted (the QR sheet counts the phones; `instructors`: the granted
  instructor phones, in the host's frame only). `peers` counts the peers that are not instructors, so learners are not
  told an instructor phone or a ventilator exists. The host also gets `{relay:'peer-left', id}` when a non-host socket leaves (R29: the
  host forgets that peer; learners never get it).
- While the host is away, a joining peer gets the cached snapshot and `{relay:'peers', hostOnline:false}`.
- Heartbeat every 10 s: a WebSocket ping (dead sockets are terminated) and a `{relay:'hb'}` frame, so browser
  clients can notice a dead link (they cannot see pings).
- The device table (plan room-and-instruments.md R2): the host's `peers` frame (never a learner's: theirs stays
  `{relay, hostOnline, peers}`) carries `devices`, one entry per non-host socket in the order they joined. It is sent
  on every join and leave, on a grant, and at every heartbeat sweep, before that sweep's ping, so it holds the answers
  to the previous one. Each sweep's ping carries the sweep's number, which the pong echoes; the relay measures the
  round trip on its own clock. The ping is the relay↔device hop (in the kit the relay runs on the laptop: the Wi-Fi).

  | field | what it is |
  |---|---|
  | `id`, `role` | the socket's peer id and role, from its hello |
  | `show`, `device` | what its LAST hello said it shows (`learner`, `monitor`, `defib`, `depth`) and its device key; `null` when the hello had none (an older build, a controller) |
  | `granted` | it may command (a controller, or an instructor the host granted); for a `ventilator`: the host granted it, and it may exchange `vent`; a `defib` window is never granted (it sends its two commands without); a `learner` remote: the host granted its learner PIN, and it may send `LEARNER_COMMANDS` |
  | `rttMs` | the round trip of its answer to the last sweep's ping, ms; `null` while that ping is unanswered or before its first ping |
  | `sinceMs` | ms since its last pong (any ping), or since it joined before its first |

  A socket that misses a ping shows `rttMs: null` with a growing `sinceMs` in the frames that follow, and is
  terminated at the next sweep (the rule above), which drops it from the table. A PIN is never in it. With 60 devices
  the frame is ≈ 7.6 KB (`test/relay/relay-devices.test.ts`, worst case: 16-character keys, 3-digit pings).
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
lets the newcomer in if it does not, so a phone whose network dropped or a reloaded laptop gets back in. When a
non-host socket leaves the room (or is closed for a newcomer, before the newcomer's hello goes on), the relay tells the
host `{relay:'peer-left', id}` and the host forgets that peer's sequence number and role, so a hello forged under an id
while its owner reconnects dies with the forger's socket (R29; before it, such a hello blocked the owner's commands
until its page reloaded). Run the relay on a trusted LAN, or behind a TLS reverse proxy
(`wss://`) with access control if it must be reachable from the internet. Messages larger than 256 KB, or
carrying typed arrays or long numeric arrays, are refused.
