# Hosted relay: phones following from the GitHub Pages site (design note for a later release)

> **Status: design note only.** Nothing described here is built, deployed or configured. No hosting account exists for
> it. **It is not part of 1.0.0-rc.1.** In 1.0.0-rc.1, learners' phones follow the instructor only through the
> classroom kit: the kit's relay runs on the instructor's laptop, and the phones join the laptop's hotspot (or the
> venue Wi-Fi). **The showcase uses that path: the local kit over a hotspot.** The README says that a static copy on a
> web host such as GitHub Pages cannot pair phones, and that statement stays true until something in this note ships.
>
> Written 2026-10-18 against `origin/main` ab10903e, with the release text of PR #66 (stage-8b) read alongside it.
> References to `research/00` and to owner questions (E-numbers) point to the project's working notes, which are kept
> outside this repository.

---

## 0. One page

**The question (owner, 2026-10-18).** Could the audience's phones follow the instructor's monitor from the public
Pages site, <https://samhv-dev.github.io/patient-monitor-engine/>, instead of joining the instructor's laptop?

**The constraint.** Pages serves static files only, and the relay is a WebSocket server. Pages is also https, so a
page loaded from it may open `wss://` sockets only: a browser blocks `ws://` from an https page as mixed content, and
`apps/demo/src/app/classroom.ts` `qrTarget` already refuses that case. The relay therefore has to run somewhere that
can terminate TLS.

**What already works.** The phone side needs almost no change. A phone that opens
`https://…github.io/patient-monitor-engine/?join=CODE&relay=wss%3A%2F%2Frelay.example%2F` already follows that relay
(`relayOf`, `joinCode` in `classroom.ts`). An instructor page on Pages started with `?relay=wss://relay.example/`
already produces that QR (`qrTarget`, the `serves: false` branch). The relay's protocol, its 60-phone cap and its
viewer-only event filter carry over unchanged.

**What does not work yet.** The instructor's authority. Today the relay decides who may host or command by the
socket's address: "this machine" (loopback or one of the laptop's own interfaces) may host and command, and every
other device may only follow (`--remote-roles viewer`, `isLocalAddress` in `packages/controller/relay/http.ts`). That
rule does not survive leaving the laptop:

- On a hosted relay, the instructor's laptop is just another remote device, so it would be refused as host.
- Through a tunnel (cloudflared, ngrok), the tunnel agent connects to the relay from 127.0.0.1. **Every phone would
  then look local, and `--remote-roles viewer` would silently stop protecting the session:** any phone with the code
  could say `controller` and send commands.

A hosted relay therefore needs an **instructor key**, a second secret that is never on the projector. §3 sets out the
design. It is the one piece of real security work in this note.

**Three shapes** (§2, with costs at 30 and 120 phones):

| Shape | Code change to the relay | Monthly cost, 30 phones | Monthly cost, 120 phones | Main risk |
|---|---|---|---|---|
| **A. Small always-on Node host** (PaaS or free-tier VM) running the kit's own `relay.mjs` | The instructor key, an Origin check, a public-URL field (§5) | $0 (free tier) to about $2.40 | $0 to about $3 | A free tier sleeps: about 1 minute of cold start |
| **B. Cloudflare Worker + Durable Objects** (one object per session code) | A port of the routing to the Workers runtime: a second implementation | $0 (Free plan) or $5 (Paid plan minimum) | $0 or $5 | New code with no load measurement; one more runtime to keep in step |
| **C. The laptop's relay through a tunnel** (cloudflared or ngrok), with the Pages app pointed at it by the QR | The instructor key, plus proxied sockets treated as remote | $0 | $0 (cloudflared); ngrok's free 1 GB/month is not enough | All fan-out goes up the venue's uplink: about 11 Mbit/s at 120 phones at ×8 |

**Recommendation: GO for a later release, as shape A, on one condition: the owner names who holds the account and
pays (E39, §6).** If nobody does, the answer is NO-GO, and the kit over a hotspot stays the only path. That path
already works and is measured.

---

## 1. What the relay needs from a host

These are read from the relay's source (`packages/controller/relay/server.ts`, `http.ts`, `bin.ts`) and from the
Stage 12 load gate (`docs/gates/stage-12.md` §5).

### 1.1 One WebSocket endpoint over TLS

- **wss:// on port 443.** The page is https, so the socket must be `wss://`. Port 443 also gets through the most
  restrictive mobile and venue networks.
- **One port for both endpoints.** The relay serves the wire protocol at `/` (in fact, any path other than
  `/signal`), WebRTC signalling at `/signal`, and `GET /pme-relay.json`, all on one port. A hosted relay needs only the
  wire endpoint and `/pme-relay.json`. The classroom uses no WebRTC (§3.6).
- **No static files.** The relay's `--static` mode (serving the app to phones) is not used, because Pages serves the
  app.
- **Long-lived sockets.** Expect one socket per phone for the whole class (30–90 minutes). The relay sends a heartbeat
  every 10 s (a WebSocket ping plus a `{relay:'hb'}` frame), and the client reconnects after 25 s without one. A host
  or proxy with an idle timeout of 30 s or more is safe. A platform that cuts sockets at a fixed age reconnects the
  phones, and each reconnect costs a snapshot of about 94 KB.

### 1.2 A single instance, or sticky routing by session code

A room (one session code) lives in one process's memory: the host's socket, the peer set, the cached snapshot and the
ack routes. **Every socket of one session must reach the same process.**

- Load-balancing sockets across several Node processes would split a room in two. The session code arrives only in
  the first frame (the `hello`), after the load balancer has already chosen a process. Sticky-by-cookie or
  sticky-by-IP does not help either, because the instructor and the phones are different clients.
- **Shape A must therefore run exactly one instance.** That is enough. Stage 12 measured 120 phones at at most 2 %
  CPU of one core (§1.3), and the relay's `maxRooms` (500) bounds memory.
- **Shape B routes by code instead.** The Worker picks the Durable Object before the socket is accepted, so the code
  must be in the connection URL (§5.2).

### 1.3 Bandwidth

Measured on loopback in Stage 12 (`docs/gates/stage-12.md` §5, case: showcase anaphylaxis, plus bronchospasm with the
Ventilator view). The relay sends the same bytes on the internet. Only the latency changes.

| | ×1 | ×8 | 2-minute fast-forward |
|---|---|---|---|
| Per phone, out of the relay | about 1.3 KB/s (1.2–1.5) | 10.5–11.7 KB/s | 10.2–13.1 KB/s |
| **30-phone room**, out of the relay | 38–44 KB/s (≈ 0.35 Mbit/s) | **315–324 KB/s (≈ 2.6 Mbit/s)** | 305–394 KB/s (≈ 3.2 Mbit/s peak) |
| **120 phones**, out of the relay | 149 KB/s (≈ 1.2 Mbit/s) | **1,400 KB/s (≈ 11.2 Mbit/s)** | 1,388 KB/s |
| Into the relay, from the instructor's host page | about one phone's worth: the host sends each message once, and the relay fans it out | | plus one snapshot of about 94 KB per re-sync |

Volume per class, as an upper bound with the whole class at ×8:

| | 30-minute session | One hour | 8 one-hour sessions a month |
|---|---|---|---|
| 30 phones | ≈ 0.6 GB | ≈ 1.2 GB | ≈ 9 GB |
| 120 phones | ≈ 2.5 GB | ≈ 5 GB | ≈ 40 GB |

At ×1 the volume is about a tenth of these figures. A real class mixes ×1 and ×8, so these are ceilings.

CPU and memory are not a constraint. Stage 12 measured at most 2 % of one core and 31–96 MB RSS at 120 phones. The
smallest instance any provider sells is enough.

### 1.4 No persistence

- The relay keeps nothing on disk. A room is forgotten 10 minutes after its last socket closes (`--room-ttl-min`).
- The cached snapshot exists only so that a late joiner can start while the host reconnects.
- A restart loses only live rooms. The instructor's page reconnects with backoff and re-hellos, and the phones do the
  same. The e2e test's relay-restart case pins this (Stage 12, PR #64).
- The relay needs **no database, no volume and no backups**.

### 1.5 Latency (the one number that does NOT carry over)

- Stage 12's lag p95 of at most 2.8 ms is a loopback number. On the internet, every message crosses two network legs
  (laptop to relay, relay to phone), and mobile networks add jitter of tens to hundreds of milliseconds.
- The phone's follower draws a fixed **0.1 s of wall time** behind the host (`delayS` in
  `packages/controller/src/session/viewer-sync.ts`, FX-2). That is its jitter budget for mirrored commands. A command
  that arrives later than that makes the phone re-sync.
- So on mobile data, 0.1 s is probably too tight. A hosted classroom should give network followers a larger
  `delayS`, a candidate 0.5 s, and the value must be **measured**, not assumed (§5.1, the gate).

---

## 2. Three candidate shapes

Prices were read on 2026-10-18 from the providers' own pages and will drift. They are given as orders of magnitude,
for a decision between "free", "a few dollars" and "not viable". They are not quotes.

### Shape A: a small always-on Node host

**What it is.** The kit already builds the relay as one file, `server/relay.mjs` (`scripts/showcase/make-bundle.mjs`).
That file has `ws` inside it and takes `ws`'s pure-JS path (PR #64, KR-A1), so it runs on any Node ≥ 22 with no
`npm install`. Deploy that file, plus a TLS front end, on one small instance:

- **A PaaS** (for example Render or Fly.io) gives TLS and a `*.onrender.com` / `*.fly.dev` hostname, and accepts a
  Dockerfile or a start command.
- **A free-tier VM** needs its own TLS front end (for example Caddy with an automatic certificate) and a domain name.
  It also needs someone to patch the OS.

**Cost:**

| | 30 phones | 120 phones |
|---|---|---|
| Render, Free web service | $0, within 750 instance-hours a month and the workspace's included outbound bandwidth. It **sleeps after 15 minutes** without inbound traffic and takes about 1 minute to wake. The host's own event stream keeps it awake during a class. | $0 within the same allowances. 40 GB a month is the figure to check against the bandwidth allowance. |
| Fly.io, shared-cpu-1x 256 MB, always on | $2.19 compute plus about 9 GB × $0.02 ≈ **$2.40 a month** (North America and Europe). Egress elsewhere costs more: $0.04/GB in Asia-Pacific, $0.12/GB in Africa and India. | $2.19 plus about 40 GB × $0.02 ≈ **$3 a month** (about $3.80 at $0.04/GB). Fly has no free tier for new organisations. |
| Free-tier VM | $0, but check the egress allowance. Some free VMs include as little as about 1 GB a month, which one 30-phone ×8 session nearly uses up. | Usually exceeds a free VM's egress allowance. |

**Trade-offs:**

- **(+) It is the measured code.** The routing, the viewer filter, the 60-phone cap, the `full`/`forbidden` refusals
  and the heartbeat are exactly what Stage 12 load-tested and PR #64 smoke-tested. The existing
  `scripts/classroom/load.classroom.ts` and `scripts/showcase/check-relay.mjs` can be pointed at the hosted URL as they
  are.
- **(+) One implementation.** A fix to the relay reaches the hosted relay with the next deploy.
- **(−) Someone owns a server.** On a PaaS that work is small: no OS, and only a redeploy when the relay changes. On a
  VM it is real ongoing work.
- **(−) A sleeping free tier costs about a minute at the start of class.** The instructor opens the instructor page a
  few minutes early, and the run sheet says so.
- **(−) One instance is one point of failure.** If it fails, the operational fallback is the kit (§4.3).

### Shape B: a Cloudflare Worker with Durable Objects (one object per session code)

**What it is.** A Worker accepts `wss://pme-relay.<account>.workers.dev/s/<CODE>` and hands the socket to the Durable
Object named `<CODE>`. That object holds the room: host, peers, snapshot cache and ack routes. Each room is isolated,
with no shared process.

**Cost** (Cloudflare's Durable Objects pricing page, 2026-10-18):

- **Free plan.** Durable Objects are available with the SQLite storage backend, up to 100,000 requests a day and
  13,000 GB-s of duration a day.
- **Paid plan ($5 a month minimum).** It includes 1 million requests and 400,000 GB-s a month.
- **What a class uses.**
  - Duration: one object is billed at 128 MB while it is awake. A room with a streaming host never hibernates, so
    it uses 0.125 GB × 3,600 s ≈ **450 GB-s per room-hour**, about 28 room-hours a day on the Free plan.
  - Requests: incoming WebSocket messages bill at 20:1, so the host's roughly 20 messages a second at ×8 come to
    about 4,000 request-units an hour. Each socket opening is one request.
  - Outgoing messages and egress: not billed.
- **The phone count barely changes the bill.** The fan-out is outgoing, and outgoing traffic is free.

| | 30 phones | 120 phones |
|---|---|---|
| Free plan | **$0** | **$0** |
| Paid plan | **$5** (the minimum) | **$5** (the minimum) |

**Trade-offs:**

- **(+) Nothing to patch, no idle cost, nothing to wake.** Rooms are isolated by construction, and the code is in the
  URL, so "sticky" comes for free.
- **(−) It is a second implementation of the relay.** `server.ts` uses Node's `http` and the `ws` API. A Durable
  Object uses the Workers WebSocket API (`state.acceptWebSocket`, `webSocketMessage`, per-socket attachments of at most
  2 KB). About 150 lines of routing would have to be ported and then kept in step with the Node relay forever. The
  routing could move into a runtime-free module shared by both, but that refactor is not small. The PR #64 bundle and
  smoke test would not cover the port.
- **(−) It has no load measurement.** The Stage 12 numbers measure a Node process. They say nothing about one
  single-threaded object sending about 2,700 messages a second (120 phones at ×8). That needs its own load gate before
  any classroom relies on it.
- **(−) The heartbeat and hibernation pull against each other.** The client expects a `{relay:'hb'}` frame every
  10 s, and a timer that sends one keeps the object awake. During a class the object is awake anyway, so this costs
  nothing then, but it has to be designed.
- **(−) The connection URL changes.** The client has to put the code in the URL (§5.2). The Node relay accepts that
  form already, so the change is backward compatible, but it is still a client change.

### Shape C: the instructor's laptop exposes its relay through a tunnel

**What it is.** The kit's Start Classroom runs as today. A tunnel agent on the laptop publishes the relay at a public
`https://…` name. Two variants:

- **cloudflared Quick Tunnel** (`*.trycloudflare.com`): needs no account and gives a random name on every start.
- **A named tunnel** (Cloudflare Tunnel on the owner's domain, or ngrok): needs an account and gives a stable name.

The instructor's page shows a QR of the Pages URL with `&relay=wss://<tunnel name>/`. The tunnel could also serve the
kit's own app over https (`--static` is already there), so phones would open the tunnel's URL directly and Pages
would not be needed at all.

**Cost:**

- **cloudflared Quick Tunnel:** $0, but Cloudflare describes it as "for testing and development". It caps each tunnel
  at 200 in-flight requests (requests beyond that get a 429), and it does not support SSE. It does not state whether a
  WebSocket counts as one long in-flight request. The 60-phone cap per session stays well under 200 either way, but
  **this must be tested before it is relied on.**
- **A named Cloudflare Tunnel:** $0 with a Cloudflare account and a domain on Cloudflare.
- **ngrok's free plan:** 1 GB of outbound data a month. One 30-phone ×8 session of 30 minutes uses about 0.6 GB, so
  the free plan does not carry a single 120-phone class. ngrok also puts an interstitial warning page on HTML browser
  traffic on the free plan; that matters if the app is served through it. A paid ngrok plan would be needed.

| | 30 phones | 120 phones |
|---|---|---|
| cloudflared (Quick or named) | **$0** | **$0**, if the venue uplink holds |
| ngrok | Free plan marginal (1 GB a month); paid plan needed | Paid plan needed |

**Trade-offs:**

- **(+) Almost no new infrastructure.** The relay stays on the laptop, with the same code and the same kit, and
  nothing runs between classes.
- **(+) Phones need no hotspot.** They use their own mobile data. This is the real gain over today's path, and it is
  also what shape A gives.
- **(−) The fan-out goes up the venue's uplink.** Every copy for every phone leaves the laptop: about 2.6 Mbit/s
  sustained at 30 phones at ×8, and about 11.2 Mbit/s at 120 phones. Venue Wi-Fi uplinks and phone-hotspot uplinks
  often cannot sustain that. **In shapes A and B the laptop uploads one copy (about 0.1 Mbit/s at ×8).**
- **(−) The laptop now needs internet** as well as power and a network. Today's hotspot path needs no internet at all.
- **(−) It is the most dangerous shape if done naively.** The tunnel agent connects from 127.0.0.1, so every phone
  passes `isLocalAddress` (§0, §3.2). This shape must not be documented until the instructor key, or at least the
  rule that a proxied socket is remote, has shipped.
- **(−) It is not production-grade.** Quick Tunnels are a development service with no availability promise, and their
  name changes on every start. That is harmless here, because the QR is generated live, but a printed handout cannot
  carry the address.

### 2.4 Comparison

| | A. Node host | B. Durable Objects | C. Tunnel |
|---|---|---|---|
| Relay code | the kit's `relay.mjs` plus §3 | a port | the kit's `relay.mjs` plus §3 |
| Measured | yes (Stage 12 numbers carry over) | no (new load gate) | yes, but the venue uplink is the bottleneck |
| Laptop uplink at 120 phones at ×8 | ≈ 0.1 Mbit/s | ≈ 0.1 Mbit/s | ≈ 11.2 Mbit/s |
| Laptop needs internet | yes | yes | yes |
| Cost a month, 30 / 120 phones | $0–2.40 / $0–3 | $0 or $5 / $0 or $5 | $0 / $0 (cloudflared) |
| Ongoing operation | redeploy on relay changes; a VM also needs patching | keep the port in step | none between classes |
| Who holds an account | the payer (§6) | the payer (§6) | nobody (Quick Tunnel), or the payer (named tunnel) |

---

## 3. Security

### 3.1 What is being protected

- **No patient data.** The engine is simulated, the relay carries no PHI, and nothing personal crosses it. Phones
  send only a `hello` with a random per-page-load peer id. No names, no accounts, no cookies.
- **What there is to protect is the class.** Nobody but the instructor should be able to change the patient, and
  outsiders should not be able to disrupt the session or the relay.

### 3.2 The session code, the instructor key and roles

- **The session code is the only secret for following, and it is public in the room** (projected as a QR).
  - Anyone who has the code can watch the monitor. That is accepted and intended: a learner's friend outside the room
    who sees a simulated monitor is not a harm.
  - Codes are 6 characters from a 31-symbol alphabet (`SESSION_CODE_RE`), about 8.9 × 10⁸ codes. That is enough
    against guessing once the relay limits hello rates (§3.3).
- **Nobody may command or host without the instructor role.** Today that role is granted by the socket's address
  (§0), which does not work off the laptop. The design replaces it, for hosted mode, with an **instructor key**:
  - The relay operator sets the key (an environment variable on the hosted relay, or one the kit generates per start
    in shape C). It is at least 128 bits, printed as base32.
  - The instructor's page sends the key **as a WebSocket subprotocol** (`new WebSocket(url, ['pme.k.<key>'])`, which
    the relay echoes back). It does not go in the URL. URLs land in PaaS request logs, proxy logs and browser history,
    and the instructor's address bar is on the projector.
  - The key is entered once in the pairing UI (§5.1) and kept in the page's session storage. It is never put in a
    query string, and never in the QR (`learnerUrl` already copies only `relay` and `join`).
  - A socket with a valid key may be `host` or `controller`. A socket without one may be `viewer` only: the existing
    `forbidden` refusal, close code 4003, with no retry loop.
  - The host still refuses a viewer's command as well (defence in depth, unchanged).
- **A proxied socket is remote, whatever its address.**
  - In shape C, and behind any reverse proxy on the same machine, the relay must treat a request that carries
    `Forwarded`, `X-Forwarded-For` or `CF-Connecting-IP` as coming from another device.
  - That closes the tunnel hole even before the key ships. A phone cannot remove a header that the proxy adds.
  - The relay must never trust those headers as a way to be local.
- **Rooms are created only by a keyed host.** Today any `hello`, a viewer's included, creates a room, up to
  `maxRooms` (500). On the public internet, a script could fill 500 rooms and lock every class out (`relay is full`).
  In hosted mode, a viewer's `hello` for a code with no room is refused `bad-session`. Phones scan the QR after the
  host is up, and a room outlives a host reconnect by its 10-minute TTL, so no real flow breaks.

### 3.3 Rate limits and caps

- **Kept as they are:**
  - 60 non-host peers per session (`--max-peers`); the next one is refused `full`, close 4029, with no retry.
  - 256 KB per message; the numeric-array, nesting and node budgets of `parseWireMessage`.
  - The first frame must be a `hello`; spoofed `session`/`from` on later frames are dropped.
  - Binary frames are dropped; one bad frame never kills the process (FU-11).
- **Added for hosted mode:**
  - At most a few WebSocket upgrades a second per IP, and at most about 10 `hello`s a minute per IP for codes that do
    not exist. Over that, the relay refuses or closes the socket.
  - At most one live room per instructor key, or a small number.
  - A global socket ceiling, for example 1,000, so that a flood degrades into refusals rather than memory exhaustion.
- **One trap:** a school or a mobile operator may put a whole class behind one IP address (carrier-grade NAT). Limits
  per IP must therefore count **failed** hellos, not successful joins. Thirty phones joining the same code from one IP
  is the normal case.

### 3.4 Origin checks and CORS

- **The WebSocket upgrade checks `Origin`.** Hosted mode accepts the Pages origin, the kit's own origin and an
  operator-configured list, and refuses anything else with 403. This stops other websites from embedding the relay in
  their pages.
  - It is **not** authentication: a script outside a browser can send any `Origin`. The key and the viewer-only
    default are the real controls.
  - A fork that runs its own Pages site sets its own origin.
- **`/pme-relay.json` keeps `Access-Control-Allow-Origin: *`.** Its answer holds no secret, and the instructor's page
  may come from another origin. In hosted mode it must not report the server's own network addresses (§5.1).

### 3.5 TLS

- **wss only in hosted mode.** The PaaS, Cloudflare or the tunnel terminates TLS; on a VM, a front end such as Caddy
  does it.
- **The relay itself keeps speaking plain WebSocket behind the terminator.** A plain `ws://` relay must never be
  exposed directly to the internet. The relay README already says this, and hosted mode makes it a deployment
  requirement.

### 3.6 WebRTC signalling

- The classroom uses no WebRTC. With `--remote-roles viewer`, `/signal` is already refused to other devices.
- **Hosted mode does not expose `/signal`.** Signalling between strangers on the internet would also need TURN, cost
  and abuse handling, and nothing here needs it.

### 3.7 What the relay logs

- **What it logs today** (`log` in `server.ts`, printed only without `--quiet`):
  - room created, expired;
  - `<role> <peer id> joined` / `left`;
  - frame-dropped and socket-error messages.
- **What it never logs:** IP addresses, message contents or the session's clinical state.
- **For hosted mode:**
  - Keep these lines. Peer ids are random per page load and identify no one.
  - Log the instructor key **never**, not even truncated; log refusals by kind.
  - The platform will keep its own request logs, which include the client IP and the URL. That is why the key stays
    out of the URL, and why the session code should stay in the first frame, not the URL, wherever routing allows. Shape
    B is the exception: there the code must be in the URL. A code in a log is low-value, because a code is public in
    the room and dead 10 minutes after the class.
  - State the log retention in the deployment README.

---

## 4. How the Pages app learns the relay URL, and the fallback

### 4.1 Options

| Option | How | Verdict |
|---|---|---|
| **`?relay=` in the QR** | The phone's URL is `<Pages>/?join=CODE&relay=wss%3A%2F%2F<relay>%2F`; `relayOf` reads it today | **Chosen.** No new code on the phone side; any relay works (a fork's, a department's, a tunnel's); nothing on Pages names an operator |
| A config file on Pages (for example `relay.json` beside `index.html`) | The phone's URL is `<Pages>/?join=CODE`, and the app reads the relay from the file | Not chosen. It makes the public site name one operator's relay: every fork and every visitor would talk to it, and changing relays would mean a Pages redeploy. The QR is shorter (about 60 characters instead of about 105), but a QR of about 105 characters should still scan at lecture-room distance; the gate measures it |
| Discovery (mDNS, a directory service) | — | Not chosen. Browsers do no mDNS, and a directory is one more hosted service |

**On the instructor's side**, the relay URL and the key belong in the browser's site profile (Settings, the same store
`loadSite`/`saveSite` use), so the instructor does not retype them every class. `?relay=` on the instructor's own URL
keeps working as an override.

### 4.2 One build on both ends

- **The phone and the host must run the same build.** A snapshot restores only into an engine with the same
  `version+build` (`engineKey`, FU-11 A1, Stage 8b). A phone that loads the app from Pages can therefore follow only a
  host running the Pages build.
- **The simple rule:** in hosted mode, the instructor's page is opened from Pages as well
  (`<Pages>/?relay=wss://…#/teach`). A kit built from the same tag also matches, but "same tag" is easy to get wrong
  on the day.
- **The QR panel should check this.** It should say "this page's build differs from the phones' build" before showing
  the code. That needs a `build` field in the Pages site's published files, read by the instructor's page (§5.1).

### 4.3 Fallback to the local kit

- **The fallback is manual, and that is deliberate.**
  - If the hosted relay does not answer, the QR panel already says so, from `relayInfo` returning null.
  - The instructor then switches to the kit's Start Classroom and the hotspot, as in 1.0.0-rc.1, and shows the new
    QR. The phones rescan.
- **It cannot be automatic.** An https Pages page cannot open the kit's `ws://` relay (mixed content), and the phones
  would have to join another network first. So the phones on the kit path open the kit's http address, not Pages.
- **The run sheet for a hosted class therefore carries the kit and its hotspot as plan B**, rehearsed, every time.

---

## 5. What changes in the repository, and what does not

### 5.1 Changes (a later release)

- **The relay** (`packages/controller/relay/`):
  - **A hosted mode** (for example `--hosted` or `PME_RELAY_HOSTED=1`) that switches on:
    - the instructor key, read from `PME_INSTRUCTOR_KEY` and checked as a subprotocol;
    - the rule that proxied sockets are remote;
    - an Origin allow-list (`--origins`);
    - room creation by a keyed host only;
    - the per-IP limits of §3.3;
    - `/signal` turned off;
    - `/pme-relay.json` answering `{relay:'pme', port, addresses: [], serves: false, public: 'wss://…'}`, where
      `public` is an additive field set by `--public-url`.
  - Without hosted mode, the relay behaves exactly as in 1.0.0-rc.1.
  - Unit tests extend `relay.test.ts` and `fu11-relay-hostile.test.ts`, with the tunnel case pinned: a loopback socket
    that carries `X-Forwarded-For` is a viewer.
- **The client transport** (`packages/controller/src/transport/websocket.ts`): the `WebSocketCtor` shape gains the
  optional `protocols` argument, for the key.
- **The demo app** (`apps/demo/src/app/`):
  - **The pairing UI's relay field.** The QR panel and Settings gain "Relay address" and "Instructor key" (a password
    field, session-stored).
  - `qrTarget` prefers the relay's `public` URL and the Pages origin when the relay reports one.
  - The build check of §4.2.
  - A follower `delayS` for network phones, set from the gate's measurement (§1.5).
  - The `learnerUrl` tests pin that no key ever appears in the QR.
- **A `relay-host/` deploy folder** at the repository root, holding:
  - a Dockerfile, or a start command, that runs the kit's `relay.mjs` with `--hosted`;
  - a `render.yaml` and/or `fly.toml` for shape A;
  - a README with the environment variables, the log policy and the redeploy step.
  - It describes how to deploy; it deploys nothing on its own. No credentials are committed, and no account is named.
  - It is built by `make-bundle.mjs`'s existing relay step, so it carries the same KR-A1 guard.
- **The docs:**
  - **README.** Today's sentence "A static copy of the app on a web host, such as GitHub Pages, cannot pair phones"
    becomes "… can pair phones only through a hosted relay; see …".
  - **`docs/showcase/CLASSROOM.md`.** A "hosted class" section, with plan B (§4.3).
  - **The relay README's security section,** for hosted mode.
  - **This note,** marked as superseded by the implementation's plan.
- **A gate** (in the house format), with these steps:
  - `load.classroom.ts` against the hosted URL at 30 and 120 phones, from a machine off the relay's network;
  - one real phone on **mobile data** opening the Pages QR;
  - the hostile cases: no key, a forged `Origin`, a hello flood, the tunnel's loopback;
  - the fallback drill (§4.3).
  - The lag threshold needs a new number, because the 100 ms LAN threshold is not an internet number.

### 5.2 What does not change

- **The wire protocol.** No message kind, no field and no meaning changes. `hello`, `command`, `ack`, `event` and
  `snapshot` are the same, and so are the relay control frames and close codes (4001, 4002, 4003, 4009, 4029).
- **The authority model.** Viewers follow, the host decides, and controllers command only through the host. Hosted
  mode changes only **how a socket proves** that it may be host or controller.
- **The limits.** 60 phones per session, 256 KB per message, 500 rooms, the 10-minute room TTL, the 10 s heartbeat,
  and the viewer event filter (`VIEWER_EVENTS`).
- **The local kit and the hotspot path.** They stay as they are and stay the default.
- **The connection URL shape, except in shape B.** Only shape B needs the code in the URL (`…/s/<CODE>`). The Node
  relay already accepts any path other than `/signal` for the wire protocol, so the client could append the code
  unconditionally without breaking shapes A or C. That is not a protocol change, but it would be a change to every
  client, so it is made only if shape B is chosen.

---

## 6. Recommendation and the owner's question (E39)

**Recommendation: GO, for a later release, as shape A.**

The deliverable is the kit's own `relay.mjs` in hosted mode (§3, §5.1), on one small always-on Node instance behind
TLS, with `relay-host/` as the reference deployment. The reasons:

1. **It is the measured code.** The Stage 12 load numbers and the PR #64 smoke test carry over, and the only new
   number to measure is internet latency.
2. **It keeps the venue's uplink out of the fan-out.** Shape C needs about 11 Mbit/s up at 120 phones at ×8, against
   about 0.1 Mbit/s for shapes A and B.
3. **It costs nothing to a few dollars a month at either class size.**

The security work in §3, above all the instructor key, is required by **every** shape and comes first.

- **Shape B is the better fit if** the relay ever has to serve many classrooms at once, or if nobody wants a server
  to own. Revisit it then, with its own load gate.
- **Shape C** may be documented later as a do-it-yourself option for instructors with a strong uplink, and **only
  after** the proxied-means-remote rule ships.

**NO-GO conditions:**

- nobody holds the account (E39);
- the real-phone gate on mobile data fails;
- the provider is not reachable, or not permitted, where the classes are taught (below).

In each case, the kit over a hotspot remains the path, and it already works.

**E39 — Who hosts and pays for the hosted relay?**

> A hosted relay needs one account with a hosting provider, held by a person or an institution, and possibly a card on
> file. The cost is $0 on a free tier (with about a minute of wake-up before class) or roughly $2–5 a month for an
> always-on instance.
>
> **Ali, please choose one:**
>
> - **(a) You, personally, on a free tier.**
> - **(b) You, personally, always on, at about $2–5 a month.**
> - **(c) The department or the institution.** Then they also hold the instructor key and the log retention, and
>   their IT may have to approve the provider.
> - **(d) Nobody for now.** Then it is NO-GO, and phones keep using the kit over a hotspot.
>
> **Before choosing (a)–(c),** check two things for the account holder's country and the venues:
>
> - that the provider's terms allow the account;
> - that its hostnames (and github.io) are reachable on the audience's mobile networks.
>
> **Default if unanswered: (d).** Nothing changes, and 1.0.0-rc.1 and the showcase are unaffected.

---

## 7. Scope statement

- **Hosted relay is not in 1.0.0-rc.1.** Nothing in this note is implemented, and no hosting account or deployment
  exists.
- **The showcase uses the local classroom kit over a hotspot:**
  - the instructor's laptop runs `server/relay.mjs` through Start Classroom;
  - the phones join the laptop's hotspot and open the kit's http address from the QR.
- **This note is a design input for a later release.** The roadmap carries it as "hosted relay", with no version
  number attached.

---

### Sources read

- **Relay:** `packages/controller/relay/server.ts`, `relay/http.ts`, `relay/bin.ts`, `relay/README.md`.
- **Controller:** `packages/controller/src/transport/websocket.ts`, `src/transport/relay-frames.ts`,
  `src/protocol.ts` (`SESSION_CODE_RE`, `VIEWER_EVENTS`), `src/guard.ts` (`WIRE_LIMITS`),
  `src/session/viewer-sync.ts` (`delayS`).
- **Demo app:** `apps/demo/src/app/classroom.ts`, `pairing.ts`, `main.ts`, `site.ts`.
- **Kit and gates:** `scripts/showcase/make-bundle.mjs` (relay step); PR #64 body (KR-A1, `ws` pure-JS path,
  `check-relay.mjs`); `docs/gates/stage-12.md` §5; `docs/plans/stage-12-mobile-learner.md` "Capacity".
- **Release text:** the README and `engine-core/src/version.ts` on `stage-8b` (PR #66).
- **Working notes:** `research/00` 2026-10-18 ("hosted relay"; public text says "a later release").
- **Provider pages, read 2026-10-18:**
  - Cloudflare Durable Objects pricing: <https://developers.cloudflare.com/durable-objects/platform/pricing/>
  - Cloudflare Quick Tunnels: <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/>
  - ngrok free plan limits: <https://ngrok.com/docs/pricing-limits/free-plan-limits>
  - Render free instances: <https://render.com/docs/free>
  - Fly.io pricing: <https://docs.fly.io/about/pricing>
