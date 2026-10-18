# Headless host: one engine process, many role clients (design note for a later release)

> **Status: design note only.** Nothing described here is built, deployed or configured. **It is not part of
> 1.0.0-rc.1 or 1.0.0-rc.2.** In both, the physiology runs in the instructor's browser page, and every other screen
> follows it. The note is the design input for three owner requests: an instrument per device (E40), a box that hosts
> the engine by itself (E73), and a per-lane ECG lead chooser (E70). The manikin bridge (E74) and the hosted relay
> (E39) are covered only where they depend on this work.
>
> Written 2026-10-19 against `origin/main` cfa2eee1 (after #81, FX-16). File:line references are to that commit.
> References to `research/00`, `research/35` and `research/36`, and to owner questions (E-numbers), point to the
> project's working notes, which are kept outside this repository. Every hour figure is an **ESTIMATE**; every number
> marked [ENG] is an engineering choice, not a measurement.

---

## 0. One page

**The owner's request** (research/36 §1; rulings E40, E73). "A router or box that hosts the engine all by itself, and you
connect different devices, which each can act as instructor panel or a specific instrument." Instruments are not
read-only: the ventilator tablet changes settings. A per-lane lead chooser comes later (E70).

**The finding.** Most of the hard part exists already, because the 1.0 code was built "host owns the engine" from the
start:

- `HostSession` does not know what drives its engine or which transports it serves. It takes a `HostTarget`
  (`packages/controller/src/session/host-session.ts:23-36`) and any number of transports (`:144-157`).
- A Node `HostTarget` over a bare engine already exists, in the tests: `manualHost`
  (`packages/controller/test/fakes/manual-host.ts:1,13-34`).
- The engine runs in Node in the validation harness (`packages/validation/src/engine/capture.ts:1-3,27,55-66`). It also
  has its own wall-clock loop, `start()` (`packages/engine-core/src/engine.ts:318-327`). The browser never calls it.
- A full instructor panel with no engine of its own exists: the Remote (`apps/demo/src/app/main.ts:67-71`,
  `views/remote.ts:65`).
- A display with no authority exists: the follower (`apps/demo/src/app/views/follower.ts:93-148`, `ViewerSync`).

**What is missing** is the glue the instructor's page holds today and nobody else can reach:

- **"Restart patient" and the body of a scenario load are local to the host page, not wire commands.**
  `AppSession.restart` and `loadScenario` remount the monitor in the page (`apps/demo/src/app/session.ts:309-334`). The
  wire's `scenario load` only loads the runner (`packages/controller/src/scenario/driver.ts:89-92`).
- **The debrief record, the 1 Hz truth and the scenario poll live in the page** (`session.ts:182, 186, 382`).
- **The ventilator's physics runs on the cockpit's side and sends the engine 50 frames a second**
  (`packages/ventilator/src/link/core.ts:3-7`). Those frames are samples, so they may not cross the network
  (`host-session.ts:188-196`, `relay/server.ts:157-159`).
- **Authority is granted by the socket's address** (`packages/controller/relay/http.ts:29-35`, `server.ts:206`). On a
  box, every client is another device, so that rule grants nothing.

**The decision that shapes everything else: every screen still runs its own engine replica.** Raw samples never
cross the wire (`packages/controller/src/protocol.ts:1-3`; `guard.ts:19`). The box runs the one authoritative engine.
Displays and instruments are `ViewerSync` followers, as phones are today. Audio comes from each display's own replica,
so the box itself makes no sound.

**Migration in four steps.** Each step ships alone, behind a flag until its parity tests pass. Hours are ESTIMATES,
including tests, excluding independent review (§6).

| Step | What ships | Hours (ESTIMATE) | Unblocks |
|---|---|---|---|
| 1 | **Headless host in Node behind the relay.** `pme-host` runs the engine, clock, scenario and record. The browser is a display client plus an instructor client. Flag: `--headless` on the kit. | **42–66** | E73 Phase 1; E74 phase (a) |
| 2 | **Instrument roles, starting with the ventilator.** Ventilator physics moves into the host. The cockpit tablet is a replica that sends settings commands. | **34–52** | E40; E74 device role |
| 3 | **Appliance packaging** (research/36 §3 Phase 2). Box image, autostart, kiosk display, instructor key, update path. | **34–55**, plus hardware QA on real boxes | E73 Phase 2 |
| 4 | **Per-lane lead chooser** (E70) as an instructor command. | **5–8** (session-wide) or **11–18** (per display) | E70 |

Steps 1 and 2 together come to 76–118 h. That is above research/36 §3's seed figure of 40–80 h for "Phase 1",
because the seed did not count moving the ventilator host-side (§5.2). Step 4 does not depend on steps 1–3 and could
ship first, in browser-host mode.

**Owner questions E76–E81** (§8): who is the instructor when two tablets claim it; where audio plays; whether
browser-host mode stays supported; the lead chooser's scope; where the ventilator's physics lives; how instruments
are paired.

---

## 1. Where the code stands today (facts, with pointers)

### 1.1 Who owns the engine, and what drives its clock

- **The instructor's page owns one `AppSession`** (`apps/demo/src/app/session.ts:47-187`). It mounts the monitor
  (`mountMonitor`, `:361-392`) and wraps it in a `HostTarget` (`:110-152`). It builds the `HostSession` and the
  `ScenarioDriver` around that target (`:153-161`), and serves three transports (`:162-180`):
  - in-process, for its own panel;
  - BroadcastChannel, for a paired Remote and a second screen;
  - the relay, when one is configured.
- **The engine lives inside the renderer.** `MonitorCore` creates it (`packages/renderer/src/monitor-core.ts:73`). Every
  animation frame advances the clock and runs the engine up to it (`:203-209`):
  - in a worker when OffscreenCanvas allows;
  - on the main thread otherwise (`packages/renderer/src/worker-host.ts:1-3, 242-269`).
- **The engine's clock is the frame clock.** `Clock.advance` clamps every wall delta at 250 ms
  (`packages/engine-core/src/clock/clock.ts:1-11, 50-51`).
- **While the tab is hidden**, a 1 s interval catches up in bulk with no clamp (`worker-host.ts:60-69, 205-215`;
  `monitor-core.ts:161-175`).
- **The host's own idea of "now" is an estimate.** It is the last engine event's time, run forward on the wall clock,
  and capped (`session.ts:42-43, 248-253`). The engine's tick lives behind a worker boundary.

### 1.2 `HostSession`: already the contract a headless host needs

- **Commands in, events out.**
  - Commands are de-duplicated by id and answered with an ack (`host-session.ts:337-362`).
  - Engine events are batched per frame, split under a 128 KB message budget (`:74-80, 221-240`).
  - A `state` anchor goes out at 1 Hz (`:139-140, 264-276`).
- **Late joiners.** A hello gets the sticky replays (`time`, ECG lead and filter, scenario, bookmarks), then a fresh
  snapshot (`:321-335`).
- **Timelines.** A new engine or a restored bookmark sends a `timeline` event, and every peer restarts its clock on it
  (`:242-262`).
- **Fast-forward.** It runs in 25-tick steps, polls the scenario between them, and is paced to a minimum wall time
  (`:58-62, 89-95, 420-481`).
- **Defence in depth.** A peer that said hello as a viewer cannot command, whatever its transport (`:306-319`).
- **Audio stays local.** `tone` and `toneCancel` never leave the host: "audio is scheduled locally by every monitor
  from its own engine" (`:81-82`).

### 1.3 Followers run their own engine

- **What a follower does.** `ViewerSync` restores the host's snapshot. It then mirrors every applied command at the
  host's tick, and steers its clock onto the 1 Hz anchors, `delayS` behind (`viewer-sync.ts:1-10, 118-141`):
  - `delayS` is 0.1 s of **wall** time at every speed (FX-2; `:52-53, 99, 130`);
  - "On the same build this is sample-identical" (`:4`).
- **Divergence is caught by beats, not by samples.** A beat more than 1 ms off the host's beat forces a resync
  (`:58, 292-301`). So does a command that arrives after its tick (`:274`).
- **Build check.** A snapshot from another engine build is refused as `incompatible` (`:189-192`).
- **The follower's monitor.** It is a viewer monitor on the main thread, with its own Sound and Silence
  (`apps/demo/src/app/views/follower.ts:97`; contract `:25-26`). After 2 s hidden it starts again from a fresh snapshot
  (`:149-157`).
- **Beat tones follow the host's speed, not the steered one.** FX-16 (#81, merged as cfa2eee1): the beat-tone gate
  reads the session's nominal speed, not the clock's steered rate (`viewer-sync.ts:127`;
  `packages/renderer/src/mount.ts:136-139, 271-277`).

### 1.4 The relay

- **Roles and routing.** The roles are `host | controller | viewer` (`protocol.ts:18`). Host authority means
  (`relay/server.ts:1-6, 127-186`):
  - only a controller's commands reach the host (`:137-147`);
  - acks go back only to the issuer (`:148-154`);
  - a viewer gets only `VIEWER_EVENTS` (`:160-177`; `protocol.ts:159-166`).
- **One host per room.** A second host is refused while the first one's socket is open (`server.ts:209-215`). With the
  host away, a new peer is served the cached snapshot (`:225`).
- **Who may host or command is decided by the socket's address.** In a classroom, another device may only follow
  (`server.ts:205-206, 289-291`; `http.ts:29-35`; `bin.ts:24`).
- **The hosted-relay note's finding** (E39, `docs/roadmap/v2.0/evidence/hosted-relay-design.md` §0, §3.2): this rule
  fails off the laptop, so a keyed instructor role must replace it.
- **The relay is an ordinary Node ≥ 22.12 process** (`package.json:6-7`; `relay/bin.ts:1-4`). research/35 measured it
  at 0.4–3.3 % of one M3 core for 30–120 phones (research/35 §2.4).

### 1.5 The ventilator link

- **The cockpit owns the ventilator's physics** (`VentState`, 5 ms steps; `packages/ventilator/src/vent.ts:3, 9,
  347-348`). Every 20 ms tick it sends the engine one `externalDrive` frame, 50 a second, and the engine answers with
  `lungState` (`packages/ventilator/src/link/core.ts:1-7, 50-68`).
- **The engine is the master clock.** The cockpit may run at most 75 ticks ahead of the engine, and a fast-forward
  makes it produce the span's frames on demand (`link/port.ts:9-14, 135-141`; `link/vent-driver.ts:1-4, 75-94`).
- **The link deliberately bypasses `HostSession`:** "the ventilator is a device on the host, not a controller"
  (`port.ts:1-5`).
- **Network followers cannot follow the cockpit's patient.**
  - The host mirrors the cockpit's frames only to same-browser BroadcastChannel viewers (`host-session.ts:187-203`).
  - The relay drops them (`server.ts:157-159`).
  - Phones get a once-a-second `cockpit` notice and **hold** (`host-session.ts:205-214`; `views/follower-status.ts:65`).
- **The owner has said the phone hold is wrong for his use** (research/00, 2026-10-18 ~17:00, point 3).
- **A lockstep variant exists.** `createLinkedSim` runs the ventilator and the engine in one loop on one sim clock,
  deterministically (`link/in-process.ts:1-4, 26-67`). That is the shape a host-side ventilator takes (§5.2).
- **`VentState` is plain JSON**, and its stepping reads no wall clock and no random source (`vent.ts:3`; grep of
  `packages/ventilator/src` for `Math.random`, `performance.now` and `Date.now`: no hit). It can therefore travel
  inside a snapshot.

### 1.6 The engine in Node, and what a tick costs

- **Three ways it already runs headless:**
  - the harness's `capture()` (`capture.ts:19-68`);
  - the tests' `manualHost` (`manual-host.ts:13-34`);
  - `engine.start()`, a 20 ms `setInterval` through the same clamped `Clock` (`engine.ts:318-327`).
- **Measured tick cost** (`docs/validation/perf/ticks.json`, Node v26.8.2 on darwin-arm64, 30 000 ticks; bench
  `packages/validation/src/perf/tick-bench.ts:1-4, 17-30`, 8 channels):
  - p50 0.42 ms;
  - p99 0.53 ms;
  - max 1.63 ms.
- **The release check's budget is p99 ≤ 6 ms** (`RELEASE.md:25-27`).

### 1.7 What only the host page does (the list step 1 must move)

| Duty | Where today | Reachable over the wire? |
|---|---|---|
| Restart patient (new body = new engine) | `session.ts:309-316, 351-359` | **No** |
| Scenario load **with its body** | `session.ts:320-334` (remount, then `scenario load`) | Runner only (`driver.ts:89-92`) |
| Scenario poll at 10 Hz | `session.ts:185-186` | Not needed (host-internal) |
| Debrief record (`RunRecord`) | `session.ts:109, 182, 381`; `apps/demo/src/app/record.ts:1-8` ("Plain JSON data; no DOM") | **No** |
| Truth events (≈ 25 KB at 1 Hz; Explore, record) | `session.ts:382`; `record.ts:156` | **No** (deliberately kept on the page) |
| Monitor style for phones | `session.ts:157-158, 179` | Yes (`style` event) |
| Site drug names (glossary) | `main.ts:34` `setDrugNames` | No (page state) |
| Sound on/off | `session.ts:79, 298-306` | No, per window by design |

---

## 2. Target architecture

### 2.1 The picture

```
                         ┌──────────────── the box (or the laptop, step 1) ────────────────┐
                         │  pme-host (Node)                         pme-relay (Node)        │
                         │  engine + clock (the only clock)  ◄──►   rooms, roles, keys,     │
                         │  ScenarioDriver, RunRecord               static app, /pme-*.json │
                         │  ventilator model (step 2)               (in-process link to     │
                         │  HostSession                              pme-host, §5.1)        │
                         └──────────────────────────────┬──────────────────────────────────┘
                                         WebSocket over Wi-Fi (TCP, one socket per client)
        ┌────────────────┬───────────────────┬──────────┴─────────┬────────────────────┬──────────────────┐
   display            instructor          instrument:          instrument:           viewer            device
   (projector,        (tablet/laptop:     ventilator           defib/pacer, NIBP,    (learners'        (manikin bridge,
   HDMI kiosk)        full panel,         (replica + cockpit   BIS (replica +        phones)           ESP32; no replica,
   replica engine,    Debrief, Explore)   UI; sends `vent`     device UI)                              event stream only)
   sound if on                            commands)
```

### 2.2 The host process (`pme-host`)

**It owns:**

- **the engine;**
- **the clock**, a server tick loop (§4.1);
- **the scenario** (`ScenarioDriver`, unchanged; `driver.ts:1-9`);
- **the record** (`RunRecord`, moved out of `apps/demo`);
- **the alarm state.** It is already engine state: silence, pause, ack and limits are engine device actions
  (`packages/engine-core/src/types-device.ts:35-37, 86-87`), so it moves with the engine;
- **bookmarks** (already the driver's; `driver.ts:93-111`);
- **from step 2, the ventilator model.**

**It does not:** render, play audio, print or store anything between runs. The relay keeps its "no persistence" rule
(hosted-relay-design §1.4). A crash-resume autosave is a separate question (§6.3).

**It is a `HostSession` over a `NodeHostTarget`:** `manualHost` (`manual-host.ts:13-34`) with a real tick loop (§4.1)
and `fastForwardStep` (= `engine.advanceTo` in 25-tick steps, as `MonitorCore.advance` does: `monitor-core.ts:177-200`).

### 2.3 Why every screen keeps a replica engine

**The alternative is to stream samples from the box. It is rejected:**

- It breaks the wire's founding rule: no field can hold samples, and `guard.ts` refuses typed arrays and long numeric
  runs (`protocol.ts:1-3`; `guard.ts:19, 76-79`).
- **The bandwidth is about ten times today's (ESTIMATE).**
  - A display needs about 2 000 samples per sim second: 3 ECG lanes at 500 Hz (`l2/ecg/generator.ts:11`), plus pressure
    and pleth lanes, plus CO2/resp at 62.5 Hz (`l2/co2/capno.ts:9`).
  - At ×8, as JSON, that is about 90 KB/s per screen, and about 2.7 MB/s for 30 phones.
  - research/35 measured about 0.27 MB/s for 30 phones at ×8 (research/35 §2.4, run A).
- It would replace a mechanism that is tested and measured (`ViewerSync`, Stage 12) with a new one.

**The cost of keeping replicas:** every client must run the same build. On the box this is automatic, because the box
serves the app (`relay/server.ts:86`; the relay's `--static`). A replica costs a phone about 0.4 ms of CPU per tick
(§1.6), which phones already pay today.

**The exception is the manikin bridge.** An ESP32 cannot run the engine, so it gets an event stream (§3.3).

### 2.4 Roles

| Role | Typical client | Runs a replica | May send | Receives | Granted by |
|---|---|---|---|---|---|
| `host` | `pme-host` | It is the engine | events, acks, snapshots | commands | the relay process itself (in-process, §5.1) |
| `display` | projector, HDMI kiosk, second screen | yes | hello only | `VIEWER_EVENTS` + `style` | nothing (like a viewer) |
| `instructor` | tablet or laptop with the panel | yes, for its own monitor preview (optional) | **every command**, `session` and `seat` (§3.1) | all events, incl. truth and record | instructor key (E39 §3.2), plus the seat (§3.4) |
| `instrument` (`ventilator`, `defib`, `nibp`, `bis` …) | a tablet per device | yes | its device's command set only (§3.4) | `VIEWER_EVENTS` + its device's events | instrument pairing (E81) |
| `viewer` | learners' phones | yes | hello only | `VIEWER_EVENTS` | the session code (public in the room) |
| `device` | manikin bridge (E74) | **no** | `deviceInput` events (§3.3) | a cue stream (§3.3) | instrument pairing (E81) |

- **`display` and `viewer` differ only in policy:**
  - a display may hold sound by default;
  - a display does not count toward the 60-phone cap (`server.ts:26-29`);
  - a display may sit on the box's own HDMI.
- **Today's `controller` becomes `instructor`.** The wire keeps accepting `controller` as an alias through one release,
  for the 1.0 Remote.

### 2.5 What moves out of the browser, and what stays

| Moves into `pme-host` | Stays in the browser clients |
|---|---|
| Tick loop and clock (`MonitorCore.frame` advancing the engine) | Waveform rendering (`MonitorCore` on a replica, drawing only) |
| `HostSession`, `ScenarioDriver` and its poll | Audio: beat tones, alarm sounder, per-window Sound and Silence |
| `RunRecord` (`record.ts`, with `describe.ts`, `alarms.ts`, glossary data) | Debrief view and print (it reads the record from the host, §3.1) |
| Restart patient / scenario body (`session.ts:309-392`) as `session` commands | Explore view (reads truth from the host's instructor stream) |
| Truth at 1 Hz (instructor stream only) | Settings, skins, site profile (sent to the host as `site` once, §3.1) |
| Ventilator physics (step 2) | Cockpit UI (`apps/demo/src/vent/hamilton-ui.ts`), driven by a replica |

**The record's move needs one check, not a rewrite.**

- The file says "no DOM" (`record.ts:7-8`), and `describe.ts` already avoids `ui.ts` because "the log cannot import
  [it] in Node" (`describe.ts:131`).
- The glossary's site drug names are page state (`main.ts:34`), so the instructor client must send them to the host
  with the site profile.

---

## 3. Protocol

### 3.1 Message families

**The envelope stays `v: 1`:** `{v, session, from, seq, sentAt}` plus `hello | command | ack | event | snapshot`
(`protocol.ts:182-189`). Every change below is additive.

| Family | Direction | New or existing | Content |
|---|---|---|---|
| `hello {role}` | client → host | **extended** | `role` adds `display`, `instructor`, `instrument`, `device`; an `instrument` or `device` hello carries `kind` (`ventilator`, `defib`, `nibp`, `bis`, `manikin`). |
| `command` engine types | instructor/instrument → host | existing | `setTarget`, `applyEvent`, `device`, `pin` … (`protocol.ts:57-85`), validated by the engine. |
| `command {type:'time'}` | instructor → host | existing | pause, resume, scale, jump (`protocol.ts:74-75`). |
| `command {type:'scenario'}` | instructor → host | existing | load, goto, trigger, bookmark, restoreBookmark (`protocol.ts:68-73`). |
| `command {type:'session'}` | instructor → host | **new** | `restart {spec, mode, seed}` and `load {doc}` that also replaces the body (today `session.ts:309-334`); `site {drugNames, skin, theme}`. The host answers with a `timeline` as today. |
| `command {type:'vent'}` | ventilator instrument or instructor → host | **new, step 2** | `patch` (a `VentConfig` subset), `circuit`, `profile`: today's `control` message (`port.ts:27`), as an ordinary mirrored command. |
| `command {type:'seat'}` | instructor → host | **new** | `claim`, `release`, `handOver {to}` (§3.4). |
| `event` existing | host → all | existing | `state` 1 Hz, `beat`, `commandApplied` (atTick), `timeline`, `fastForward`, `scenario`, `style` (`protocol.ts:90-134, 159-166`). |
| `event {type:'seat'}` | host → instructors | **new** | who holds the seat, since when. |
| `event {type:'record'}` | host → instructors | **new** | `RunRecord` rows as they are made (a Debrief opened late asks for the whole record with one `record` command). |
| `event {type:'truth'}` | host → instructors only | existing event, **new route** | 1 Hz, ≈ 25 KB (`session.ts:382`). The relay must never send it to a viewer (it is not in `VIEWER_EVENTS`, so it is not sent today either). |
| `event {type:'deviceInput'}` | device → host | **new** | compressions, ventilations, electrode IDs, drug tags (§3.3). |
| `snapshot` | host → joiner | **extended, step 2** | `{engine: PatientSnapshot, devices: {vent?: VentState}}`, so a replica restores the ventilator with the patient. |

**Retired in headless mode:**

- the `mirror` commandApplied (`host-session.ts:187-203`);
- the `cockpit` notice (`:205-214`).

Both exist only because the ventilator runs outside the host. Browser-host mode keeps them.

### 3.2 Anchors and mirrored commands: unchanged

- **A replica stays exact by the three things it uses today:**
  - the snapshot;
  - the 1 Hz `state` anchor;
  - every command's `atTick` (`viewer-sync.ts:171-278`).
- **No new anchor is needed.** The box's clock is simply a better source for the same anchor (§4.1).
- **Sticky replays carry over as they are** (`host-session.ts:401-402, 416, 451, 509-521`). Step 2 adds `vent.config`,
  the ventilator's current settings, to them.

### 3.3 Instrument and device streams, and their rates

| Client | Sends | Rate (ESTIMATE / [ENG]) | Receives beyond `VIEWER_EVENTS` |
|---|---|---|---|
| Ventilator | `vent` commands on knob confirm (as a real ventilator applies a setting on confirm) | ≤ 2/s typical, coalesced to ≤ 10/s [ENG] | nothing: its replica computes `lungState`, pressures and loops itself |
| Defib/pacer | `applyEvent {kind:'defib' \| 'pacer'}` (`protocol.ts:44-48`) | per button press | `marker` events (charge, shock, pace spike; `protocol.ts:97-100`) |
| NIBP | `device {device:'nibp'}` (`session.ts:39`) | per press | `nibp` events (`protocol.ts:101-104`) |
| BIS | none at first (display-only), later electrode states | — | nothing beyond its replica |
| Manikin bridge (E74) | `deviceInput`: compression `{depthMm, t}` each, ventilation `{volumeMl, t}` each, electrode map on change, drug tag on push | ≈ 2/s during CPR (100–120/min), ≤ 1/s otherwise (ESTIMATE) | a **cue stream**: `beat` (exists), `breath` (exists, `protocol.ts:93-96`), and a new 1 Hz `cue {pulseStrength, chestRise, uopMlPerH}`. A device has no replica, so cues are sent 150 ms ahead of their sim time [ENG] and the bridge schedules them on its own clock from the 1 Hz anchor. |

- **The host validates every `deviceInput`** and turns it into engine commands (for example `applyEvent cpr` with the
  measured rate and quality; `protocol.ts:43`).
- **A wrong or forged device message can only do what that device's command set allows** (§3.4).

### 3.4 Authority

Rules [ENG; the owner decides E76, E81]:

1. **The host validates; the relay only routes.** The relay checks the role (as `server.ts:138` does today). The host
   checks the command against the role's command set, and the engine validates the values. This is the same two
   layers as today (`server.ts:137-147` and `host-session.ts:306-319`).
2. **Command sets.** The host's table is the authority:

   | Role | Allowed commands |
   |---|---|
   | ventilator | `vent` |
   | defib | `applyEvent` with `kind: 'defib' \| 'pacer'` |
   | nibp | `device {device:'nibp'}` |
   | bis | none |
   | device | `deviceInput` |

   Anything else is refused: `ack accepted:false 'a ventilator may not send setTarget'`.
3. **One instructor seat** (default for E76).
   - The first keyed instructor holds the seat.
   - Other keyed instructors may watch, and may take the seat only with an explicit **Take over**. The holder is then
     told on its own screen ("Instructor control moved to …"), and its panel becomes read-only.
   - Session-level commands are seat-only: `session`, `scenario load | goto | restoreBookmark`, `time jump`, and `seat`
     itself.
   - **The case never stops for the seat.** When the holder drops, the seat is empty, the clock runs on (E73-b's
     default: "the box; the case continues"), and the next keyed instructor takes it.
   - Today, by contrast, any number of controllers command at once, with the last write winning
     (`server.ts:137-147`).
4. **Instruments act without the seat**, within their command set. A learner at the ventilator tablet changes PEEP
   while the instructor holds the seat. That is the point of E40.
5. **Every applied command keeps `issuedBy`** (`protocol.ts:24`). The record and the log show `ventilator`,
   `instructor`, `scenario` or `manikin` as the source, as `record.ts:15` already does for `remote`.

### 3.5 Keys: E39's instructor key becomes mandatory on the box

- **On the box, every client is another device**, so `isLocalAddress` (`http.ts:29-35`) grants nothing to any client. The host
  itself needs no address trust: it is attached in-process (§5.1).
- **The instructor key from the hosted-relay note** (E39 §3.2) is therefore required from step 3. It applies unchanged:
  - sent as a WebSocket subprotocol;
  - never in a URL or the QR;
  - kept in session storage;
  - proxied sockets treated as remote;
  - rooms created only by a keyed host.
- **On the box, the key is generated per boot** and shown on the box's own HDMI display, which is not the room
  projector unless the owner chooses so (E81). It is never shown inside the QR.
- **Step 1 on the laptop needs no key.** `pme-host` runs beside the relay on the instructor's laptop, its socket is
  loopback, and today's address rule still holds.

### 3.6 Ordering: TCP only

- **`SeqFilter` assumes an ordered transport per sender.** A seq at or below the last one seen is dropped as a
  duplicate (`protocol.ts:253-276`).
- **What already provides that order:**
  - WebSocket over TCP does;
  - the relay forwards each socket's frames in order (`server.ts:127-186`);
  - the host processes them on one promise chain (`host-session.ts:146`).
- **Rule:** every client, the manikin bridge included, speaks WebSocket over TCP. There is no UDP, no BLE without a
  framing layer that restores order, and no second path for one sender (`protocol.ts:254-255` names "the same message
  over two paths" as a duplicate source).
- research/35's router path keeps the relay on TCP WebSocket and needs no change here (research/35 §2.3, §5).
- **A host restart** is a new peer id, and seq restarts only with a new id (`protocol.ts:237-251`). Followers already
  re-hello on a host hello (`viewer-sync.ts:175-181`).

---

## 4. Clocks and audio

### 4.1 The box is the clock

- **What the host's loop must not do.**
  - It must not reuse `engine.start()` as it stands. That loop runs through `Clock.advance`, whose 250 ms clamp
    (`clock.ts:3, 50-51`) silently drops sim time whenever the host stalls (a GC pause, a busy box).
  - The clamp is right for a renderer (no catch-up jank) and wrong for the only clock in the room.
- **What it does instead [ENG]:**
  - it ticks on a monotonic schedule;
  - every 20 ms of wall time it runs `round(elapsed × scale / 20 ms) − done` ticks through `advanceUnclamped`
    (`clock.ts:58`), capped at 2 s of sim per wake-up;
  - it reports any overrun as a `hostLag` figure in the 1 Hz `state`, so a slow box is visible, not silent.
- **`HostTarget.now()` becomes exact** (`engine.now()`, as in `manual-host.ts:23`). The page's estimate and its cap
  (`session.ts:42-43, 248-253`) are not needed.
- **Fast-forward** keeps `HostSession`'s pacing (`host-session.ts:58-62, 442-481`). On a slow box it simply takes
  longer than `FF_WALL_MS` (10 s; `apps/demo/src/app/fast-forward.ts:20`), because the pace is a minimum, not a
  promise (§6.3).

### 4.2 Followers keep `ViewerSync`

- **Displays, instruments and phones all steer onto the box's anchors** exactly as phones steer onto the laptop's
  today (`viewer-sync.ts:118-141`).
- **Client clocks do not matter.** Each follower anchors on its own wall clock at the moment it receives `state`
  (`:281-290`). No client needs NTP, and a drifting tablet clock only shifts its own lag.

### 4.3 Audio: on display clients that have sound on

- **The box plays nothing.** Every display and instrument that has Sound on plays its replica's tones, as followers
  do today (`host-session.ts:81-82`; `follower.ts:25-26, 107-119`).
- **FX-16's gate generalises without change.** In headless mode every screen is a follower, so every screen gates beat
  tones on the host's nominal speed (`viewer-sync.ts:127`; `mount.ts:136-139`).
- **The FX-16 hand-check finding stays true on phones.** The owner heard phone alarm sounds hit-and-miss at ×4, with
  iOS Safari audio throttling suspected, and the day rule is "phones silent" (research/00, 2026-10-18 ~17:00). The
  default for E77 is therefore Sound **off** on viewers and **on** on the display that the instructor marks as the
  room's sound source.

### 4.4 Hidden-tab behaviour leaves the host

- **FX-15 cannot happen to a Node process.** FX-15 was the simulation pausing while the host's Safari tab was hidden
  (research/00, 2026-10-18 ~14:00): the clock did not advance.
- **FX-14 loses its cause.** FX-14 was phones dropping while the host tab was hidden (research/00, H19), and the host
  never hides.
- **What remains of both is client-only:**
  - a hidden display or phone resyncs after 2 s (`follower.ts:149-157`);
  - a hidden instructor tablet changes nothing in the case;
  - the seat stays held until its socket closes.
- **Browser-host mode keeps FX-14/15.** The queued read-only diagnosis (research/00, 2026-10-19 00:49) is still needed
  for it (E78).

---

## 5. Migration path: four steps, each one ships

### 5.1 Step 1: the host session runs in Node behind the relay; the browser is a display + instructor client

**Ships as** an opt-in kit mode, `--headless`. The browser-host path stays the default. Its parts:

- **`pme-host`** (a new `packages/host`, or `packages/controller/host/` beside `relay/`):
  - `NodeHostTarget` (§2.2, §4.1);
  - `HostSession`;
  - `ScenarioDriver` (unchanged);
  - `RunRecord`, moved from `apps/demo/src/app/record.ts` into a DOM-free module the demo also imports;
  - the `session` command family (§3.1).
- **Relay.** `startRelay` gains an in-process host attachment, so `pme-host` and the relay are one Node process with
  one port. The host's transport is an in-memory `ManagedTransport` (the in-process hub already exists:
  `session.ts:162-163`), so no socket and no address trust is involved.
- **Browser instructor client.** The Remote (`main.ts:67-71`) plus a follower monitor in the stage, plus:
  - "Restart patient" and "Load scenario", which send `session` commands instead of remounting
    (`session.ts:309-334`);
  - Debrief and Explore, which read `record` and `truth` from the wire.
- **Browser display client.** The follower (`views/follower.ts`), unchanged, with `role: 'display'`.

**Done when:**

- the parity test (§6.1) passes;
- a 30-phone kit run at ×1 and ×8 holds the Stage 12 gate's numbers (`docs/gates/stage-12.md`), with the instructor's
  tab hidden for 7 minutes (H19 repeated: the case must advance, and phones must not drop).

| Part | Hours (ESTIMATE) |
|---|---|
| `NodeHostTarget` + tick loop + fast-forward step | 6–10 |
| Record, describe, glossary to a DOM-free module; `record` event + command | 8–12 |
| `session` command family in `HostSession`, the driver and the panel | 6–10 |
| Relay in-process host + `--headless` flag in `bin.ts` and the kit | 4–6 |
| Browser instructor client (Remote + follower stage, Debrief/Explore over the wire) | 10–16 |
| Parity test + kit e2e (H19 repeated) | 8–12 |
| **Step 1 total** | **42–66** |

**Blocks:** nothing. **Unblocks:**

- E73 Phase 1 (research/36 §3);
- E74 phase (a), the device role, because it needs a host that is always there;
- a FX-14/15-free classroom on the laptop, even before any box exists.

### 5.2 Step 2: instrument roles, starting with the ventilator

**The ventilator's physics moves into the host**, lockstep with the engine (the `createLinkedSim` loop:
`link/in-process.ts:54-63`):

- every tick: `lungState` → `advanceVent` → `externalDrive` frame dispatched → `engine.advanceTo`;
- every replica runs the same loop from the same snapshot (`VentState` in the snapshot, §3.1);
- a setting change is a `vent` command with an `atTick`, mirrored like any other.
- **Effect:** the cockpit's patient becomes followable everywhere. The `mirror` deviation (`host-session.ts:191-195`),
  the relay's drop (`server.ts:157-159`) and the phones' hold (`follower-status.ts:65`) all disappear in headless mode.

**Why the host and not the tablet (E80 default).**

- With the physics on the tablet, its 50 frames a second must reach the host. Those are samples on the network
  (§2.3), and every follower then sees a patient driven by frames it cannot reproduce.
- `host-session.ts:191-195` already records why mirroring the cockpit's settings could not be exact while the cockpit
  owned the physics: "a frame one tick off moves the beats 3.5 ms".
- With the physics in the host and in every replica, there is no frame on the wire and no offset to learn.
- `LEAD_TICKS`, `MAX_AHEAD_TICKS`, `clock`/`run` messages and the FX-1 port work (`port.ts:62-100, 135-141`) stay for
  browser-host mode only.

**The ventilator tablet:**

- `hamilton-ui.ts`, driven by its replica's `VentState` instead of its own driver;
- knob confirm sends `vent patch` (optimistic knob value at once; the waveform follows within one round trip, §6.2);
- the tablet's own Pause and Speed keep sending session `time` commands, as the cockpit does today
  (`session.ts:228-232`). Under the seat rule they need the seat (E76).

| Part | Hours (ESTIMATE) |
|---|---|
| `instrument` and `display` roles in protocol, relay and host; per-role command-set table | 6–8 |
| Host-side ventilator: lockstep loop, `VentState` in the snapshot, `vent` commands and sticky `vent.config`; the replica side in `ViewerSync`'s target | 12–18 |
| Ventilator tablet client (cockpit UI on a replica, optimistic knobs) | 8–12 |
| Headless mode drops `mirror`, `cockpit` and the phone hold; browser mode unchanged | 2–4 |
| Tests: lockstep `createLinkedSim` vs host+replica parity; e2e tablet + phone at ×1/×4 | 6–10 |
| **Step 2 total (ventilator)** | **34–52** |
| Each further instrument (defib/pacer, NIBP, BIS): device UI on a replica + command set | 6–12 each |

**Blocks:** step 1. **Unblocks:**

- E40 ("one as each device");
- E74, whose device role is this role mechanism with a different command set (research/36 §4: "the same role
  mechanism as instruments").

### 5.3 Step 3: appliance packaging (research/36 §3 Phase 2)

**First, research/36's Phase 0 measurements on the chosen box:**

- waveform frame rate in a Chromium kiosk on a Pi 5;
- boot-to-QR time;
- 30 phones.

**Then:**

- **The instructor key** (§3.5; E39 §3.2 and §5.1). Built once, it serves both E39 and E73.
- **Kit changes from research/35 §5.** `--advertise` (or ranking `br-*` and `wlan*` first in `http.ts:20`), so the QR
  shows the LAN address. `--trust` is not needed: on the box nothing is trusted by address.
- **Box image:**
  - systemd units for `pme-host`+relay and for the HDMI kiosk (a display client with sound);
  - AP or travel-router configuration notes;
  - updates from a USB stick, with no internet in the room;
  - a "service" page on the box (version, build, uptime, clients, tick lag from §4.1).
- **Hardware list, printed quick start, labels.**
  - The education-only label on every screen and on the case: a box that looks like a patient monitor must never be
    mistaken for one (research/36 §3).
  - The box answers `/pme-relay.json` with its build, so a client with another build says so (`viewer-sync.ts:189`).

| Part | Hours (ESTIMATE) |
|---|---|
| Phase 0 measurements on the box (owner present for the hardware) | 4–6 |
| Instructor key in relay + pairing UI (shared with E39; counted here once) | 8–12 |
| Kit `--advertise` / interface ranking | 2–3 |
| Image/installer, systemd, kiosk, USB update, service page | 16–28 |
| Hardware list, quick start, labels | 4–6 |
| **Step 3 total** | **34–55**, plus hardware QA across boxes (owner time; not estimable before E73-a) |

**Blocks:** step 1 and the instructor key (§3.5). Step 2 only if instrument tablets are in the first box. **Unblocks:**

- E73 Phase 2;
- the manikin bridge's deployment target (E74 phases b–d run against a box or a laptop alike).

### 5.4 Step 4: per-lane lead chooser (E70) as an instructor command

**Most of it exists.**

- The engine accepts `device {device:'ecg', action:'lead', value, lane: 0|1|2}` (`types.ts:72-83`; validated at
  `engine.ts:857-860`, applied at `:951-956`).
- The host keeps one sticky replay per lane (`host-session.ts:402`), and the renderer relabels the lane
  (`mount.ts:391`).
- **QRS detection always runs on lead II, whatever lane 0 shows** (`engine.ts:97-102`). So a lead change never moves
  beat times, and never breaks a follower's beat check.

**Missing:** the panel control per lane (with the skin's lane labels), and the record row.

**Scope (E79):**

- **Session-wide (default).** Every screen shows the chosen leads. This is the existing mechanism: 5–8 h.
- **Per display.** The projector shows II + V5, and a learner's tablet shows aVR. That needs a display-local command
  that the follower re-applies after every snapshot restore (`viewer-sync.ts:193-195` already replays lane chrome
  before a restore): +6–10 h.

**Blocks:** nothing. It can ship in browser-host mode before step 1. **Unblocks:** E70.

---

## 6. Risks and tests

### 6.1 The validation harness as the headless engine's test bed

- **The harness already drives the engine headless with scripted commands** (`capture.ts:19-68`).
- **Step 1's `NodeHostTarget` is tested the same way:**
  - with a fake clock (as `manualHost` is);
  - in the existing `HostSession` suites (`packages/controller/test/session/*.test.ts`: fast-forward, timeline,
    restore, boundary, failed target), re-run against it.
- **The tick-cost gate** (`perf:ticks --budget-ms 6`, `RELEASE.md:25-27`) gains a second row: the host loop with the
  ventilator lockstep (step 2) at ×8.

### 6.2 Parity: host-in-browser vs host-in-Node

**The claim to test:** the same commands give the same record and the same patient.

**The method:**

- One command script, every command carrying an explicit `atTick`. The engine applies a command at
  `max(atTick, tick + 1)` (`engine.ts:369`), and `HostSession` passes `atTick` through (`host-session.ts:386-393`).
  Without it, the browser host stamps "now", which depends on frame timing (`session.ts:122-125`), and the two runs
  could never be compared.
- The script runs in a Playwright page in browser-host mode, and in `pme-host` with a manual clock.
- **The comparison:**
  - at fixed sim times (every 30 s, and after each scenario transition), `engine.snapshot()` must be equal (JSON deep
    equality, `engineVersion` included);
  - the `RunRecord` rows must be equal, except the wall-time `at` fields;
  - beat times must agree within the follower's 1 ms tolerance (`viewer-sync.ts:58`).
- **Scripts:** at least one scenario with a fast-forward, a bookmark return and a restart (the paths that change
  timelines), and one ventilated case (step 2: the lockstep loop vs today's cockpit with its learnt offset; the old path
  is expected to differ by its offset, so that comparison is on numerics within tolerance, not on snapshots).

### 6.3 Latency budgets (targets [ENG]; Wi-Fi figures unmeasured)

| Path | Budget | Basis |
|---|---|---|
| Instructor tap → host ack | p95 ≤ 50 ms on the room Wi-Fi | One hop. research/35 measured relay lag p95 2–5 ms at low machine load, on one Mac without Wi-Fi (research/35 §2.4, runs C–E). |
| Host apply → display shows it | must arrive within `delayS` = 100 ms wall (`viewer-sync.ts:52`), else the display resyncs (`:274`) | One hop. The hosted-relay note already found 0.1 s too small for mobile data (E39 §1.5). On a room's Wi-Fi it holds, unmeasured. |
| Ventilator knob → tablet waveform | ≤ 250 ms (ESTIMATE: 2 hops + 100 ms + one frame) | The knob shows its new value at once; the breath shape follows. A real ventilator applies on confirm, at the next breath. |
| Manikin compression → engine | ≤ 100 ms | Compression rate and fraction are averaged over seconds; the depth event needs no tighter path. |
| Host cue → manikin pulse motor | scheduled 150 ms ahead [ENG], with jitter ≤ 20 ms | The bridge schedules on its own clock from the anchor (§3.3). |
| Host tick loop | p99 overrun ≤ 20 ms; `hostLag` shown when over | §4.1 |

**Risks**, each with its mitigation:

- **The box's CPU at ×8 and in fast-forward (ESTIMATE).**
  - At ×8 the host runs 400 ticks a second: about 0.17–0.21 s of CPU per wall second on an M-class core (§1.6).
    Ventilator lockstep adds to that, unmeasured.
  - A Pi 5 core is slower by a factor I have not measured; research/35 §2.5's A53 band does not apply to an A76. So
    the ×8 load on a Pi 5 must be measured in Phase 0.
  - A 5-minute fast-forward is 15 000 ticks paced over 10 s, about 0.6 of an M-class core. On a slower box it simply
    takes longer (§4.1).
  - research/36 §3's default box, an N100, carries less of this risk.
- **One box, one point of failure.**
  - Today the laptop's browser is that point, and it is worse: it sleeps, hides and reloads.
  - Mitigation: `pme-host` writes the latest snapshot and record to disk every 30 s [ENG]. After a crash it restarts
    from them as a new timeline (`cause: 'restore'`), and every follower resyncs.
  - This is the one place the box persists anything. It needs the owner's yes (it is not in E73's list): see E78's
    note.
- **The ventilator's move touches a path with a fixer history** (FX-1: `vent-driver.ts:12-18`, `port.ts:62-70`).
  - Browser-host mode keeps the old link untouched.
  - Headless mode uses the lockstep loop, which has had its own tests since Stage V (`in-process.ts:1-4`).
- **Build skew.** It cannot happen on the box, which serves the app. On a laptop with `--headless`, the kit serves the
  app too (`bin.ts:5-7`).
- **Glossary and site state on the host.** The drug names and skin come from the instructor's site profile
  (`main.ts:33-34`). The host must take them by the `session site` command (§3.1), or the record words drugs
  differently from the panel.
- **Security.**
  - Covered by E39 §3. Headless mode on the box adds one new hole only if the key ships late: no client could be
    trusted at all.
  - So step 3 does not ship without the key.

---

## 7. Effort and dependencies (summary)

| | Step 1 | Step 2 | Step 3 | Step 4 |
|---|---|---|---|---|
| Hours (ESTIMATE) | 42–66 | 34–52 (+6–12 per further instrument) | 34–55 + hardware QA | 5–8 (or 11–18 per display) |
| Independent review (ESTIMATE, ≈ 20 %) | 8–12 | 6–10 | 6–10 | 1–3 |
| Needs | — | Step 1 | Step 1; the instructor key (shared with E39) | — |
| Unblocks | E73 Phase 1, E74 (a), FX-14/15-free classroom | E40, E74 device role | E73 Phase 2 | E70 |

**Relation to E39 (hosted relay).**

- The two share one piece of work, the instructor key. Build it once, in step 3 or earlier for E39.
- A headless host could also run in the cloud beside a hosted relay. This note does not recommend it:
  - every command would cross the internet twice;
  - the 100 ms follower budget does not hold on mobile data (E39 §1.5);
  - a cloud host is a server that holds the patient, which needs an owner who pays (E39's own question).

---

## 8. Owner questions (defaults in brackets; asked after the release)

- **E76: two tablets claim the instructor role.**
  - (a) One seat: the first keyed tablet holds it, a second may **Take over** with a notice on the first, and an empty
    seat never stops the case.
  - (b) Several instructors at once, the last command winning (today's behaviour).
  - (c) One seat, handed over only by its holder.
  - **[a]**
- **E77: where audio plays.**
  - (a) Every display or instrument with Sound on, chosen per window as today.
  - (b) One display marked "room sound" by the instructor, Sound on by default there and off elsewhere.
  - (c) A speaker on the box itself.
  - **[b, with (a) still possible per window; phones off by default, as on the day rule]**
- **E78: browser-host mode.**
  - (a) Stays supported as the no-install path (Pages, a laptop alone).
  - (b) Deprecated once headless mode has run a release without findings.
  - **[a]** Its FX-14/15 diagnosis stays queued.
  - Related, but a separate yes or no: may the box keep a crash-resume snapshot on disk (§6.3)? **[yes, overwritten
    every 30 s, deleted at "End case"]**
- **E79: the lead chooser's scope** (step 4).
  - (a) Session-wide: every screen shows the chosen leads.
  - (b) Per display.
  - **[a first; b only if a teaching case needs two screens to differ]**
- **E80: where the ventilator's physics runs** in headless mode.
  - (a) In the host, beside the engine, with the tablet as a replica plus controls.
  - (b) On the tablet, streaming frames to the host.
  - **[a]** (b) puts samples on the network, and network followers cannot follow (§5.2).
- **E81: how instruments and the manikin pair.**
  - (a) The instructor's screen shows a short per-instrument code (never in the room QR), valid for one session.
  - (b) The instructor key for everything.
  - (c) No pairing: any device on the box's Wi-Fi may be an instrument.
  - **[a]** (c) lets any phone in the room drive the ventilator.

---

## 9. Scope statement

- **No headless host is in 1.0.0-rc.1 or 1.0.0-rc.2.** Nothing in this note is implemented.
- **The rc.2 classroom** still runs the simulation in the instructor's browser, with phones following over the
  laptop's relay, and with the day rule that the instructor's tab stays visible (FX-14/15).
- **This note is a design input for a later release.** The roadmap carries it as "headless host" beside "hosted relay",
  with no version number attached.

### Sources read

- **Controller:**
  - `packages/controller/src/session/{host-session.ts,controller-session.ts,viewer-sync.ts}`;
  - `src/protocol.ts` (roles, `SeqFilter`, `VIEWER_EVENTS`), `src/guard.ts`, `src/transport/websocket.ts`;
  - `src/scenario/driver.ts`;
  - `relay/{server.ts,http.ts,bin.ts}`;
  - `test/fakes/manual-host.ts`; the list of `test/session/*.test.ts`.
- **Demo app:**
  - `apps/demo/src/app/{session.ts,main.ts,classroom.ts,record.ts,pairing.ts,fast-forward.ts}`;
  - `views/{follower.ts,follower-status.ts,remote.ts}`;
  - `apps/demo/src/vent/link-page.ts`.
- **Ventilator:** `packages/ventilator/src/link/{core.ts,port.ts,in-process.ts,vent-driver.ts}`, `src/vent.ts`.
- **Renderer and engine:**
  - `packages/renderer/src/{worker-host.ts,monitor-core.ts,mount.ts}`;
  - `packages/engine-core/src/{engine.ts,types.ts,types-device.ts,clock/clock.ts}`.
- **Validation:** `packages/validation/src/engine/{capture.ts,match.ts}`, `src/perf/tick-bench.ts`,
  `docs/validation/perf/ticks.json`, `RELEASE.md`.
- **Design notes and working notes:**
  - `docs/roadmap/v2.0/evidence/hosted-relay-design.md` (E39);
  - research/35 (relay on a router; kit changes `--trust`, `--advertise`);
  - research/36 §1–§5 (appliance and manikin bridge);
  - research/00 entries of 2026-10-18 and 2026-10-19 (FX-2, FX-14, FX-15, FX-16, E40, E70, E72, E73, E74).
