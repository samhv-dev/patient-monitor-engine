# Room and instruments (E124): room set-up on the start page, roles and PIN, one instrument per screen — Implementation Plan

**STATUS: READY TO BUILD (2026-11-05).** Every question in §10 is ruled, Q6's second half included (5 November,
evening): the defibrillator window is generic now, and the department's actual model is added later as a skin.
Originally a draft for review. Written by a planning executor from brief 18 of the post-demo set. Nothing in
it is ruled until the owner answers "Questions for the owner" (§10) and the orchestrator reviews the pieces. No product
code, test, card or kit file was changed while writing it.

**Amended 2026-11-05 (owner's first rulings on this plan):** Q1 and Q2 are **ruled 5 November** (§10): the QR opens
the picker, Learner monitor first and preselected, one tap; Room setup is the Room page grown. The picker's design
source is the owner's mock-up m5 "instrument cards" of 26 October (`research/00-orchestrator-rulings.md:2086–2087`:
"the DEVICE that scans the QR opens the instrument picker (mockup 5)"), copied into this branch so it survives the
disposable folder it came from: `docs/plans/room-and-instruments/mockup/` (`m5-instruments-owner.html`, `.png`,
`instruments.css`, `instruments.js`, and `base.css`, which the page links). R4 follows its layout and wording, with
the exceptions listed in R4.

**Amended again 2026-11-05:** Q3 and Q4 are **ruled 5 November** (§10). Q3 = A: the room code lives until "New room
code" is pressed, across reloads, restarts and days, and the kit's busy-port fallback (a new origin) must not lose it:
new piece R1b. Q4 = A: **build the ventilator in its own window**, on a second screen of the laptop or on a tablet,
with a new wire for its frames, keeping E128: while it drives, every network follower holds for the whole case. The
optional R8 becomes four pieces of the plan proper, R8a to R8d (§7), and the totals, the critical path and the merge
order are updated (§9). The ventilator's wire is an owner-ruled exception to the "no new wire" anti-goal (§2).

**Amended a third time 2026-11-05:** Q5 and Q6 are **ruled 5 November** (§10), both the larger option. Q5 = B:
learners press Charge and Shock on the defibrillator window and the host applies them, the product's FIRST
learner-operated command path, planned as R5c (a `defib` role, admitted by the room code, and a relay allow-list of
exactly those two commands) and R5d (the host applies them through the same guard and device logic as the
instructor's panel, records each press under the device, and the e2e proves the window can send nothing else).
Q6 = B: the instructor picks the defibrillator model in Room setup, apart from the monitor skin, and the host adopts
its energies: R5a decouples the defibrillator's device profile from the skin in the engine's device layer, and R5b
puts the choice in Room setup; R0's drift measurement becomes R5a's acceptance. The pieces, hours, critical path and
merge order are updated (§7, §9).

**Amended a fifth time 2026-11-05 (evening):** Q6's second half is **ruled**: the defibrillator window is **generic**
now (energy select, charge, shock, sync, pads/paddles in the owner's words; Zoll-like values, the plan's fallback),
and the department's actual model is added later as a skin. R5a's model list ships with the generic model only, whose
values are the fallback's (`FALLBACK_DEFIB`, `packages/engine-core/src/l3/defib-pacer/defib.ts:11`, equal to
`zoll-like.json:27`); R5b's "Your department's machine: not named yet" line stays, as the hook for that later skin
(roadmap: `docs/roadmap/v1.0-remaining.md`). Of the owner's list, the engine's defibrillator models energy select,
charge, ready, shock and sync today (`defib.ts:1–2`, `:50–63`); it has no pads/paddles state, so the window does not draw
one as a control (the plan's rule: nothing on screen that the product does not do). The learner window's own presses
stay Charge and Shock only (Q5). No piece, hour or order changes.

**Amended a fourth time 2026-11-05:** Q7 to Q10 are **ruled 5 November** (§10). Q7: the owner rejects a single
"BIS-like" screen. Several depth-of-anaesthesia monitors exist, each with its own method, and each must work from its
true mechanism, which needs a simulated EEG the engine does not have. **R6 (the depth screen) leaves this stage**:
the picker and the device table keep the slot "Depth of anaesthesia" as "Not available yet", never a screen without
an honest signal behind it, and §9a states what the depth devices need (an EEG model and per-device algorithms, an
engine stage of its own, sourced from Miller's Anesthesia 10th ed., Chapter 36). Q8 = A: the IABP is not in this
stage (engine roadmap). Q9 = A: "Weak" is a ping over 300 ms or one missed 10 s heartbeat, an engineering choice.
Q10 = A: device names are kept across days; "Forget the room" clears them. Totals re-made (§9): 86 h, 18 PRs.

**Base and preconditions.**
- Base: `origin/main` **8d79f188** (Merge PR #197, `feat-peer-p4`), read in the worktree `scratch/wt-room-plan`
  (branch `plan-room-and-instruments`). Every `file:line` below is on 8d79f188 and is a starting point only: an
  executor finds the code by the function name given, because lines move.
- The rulings: E124 and the start-page round of 26 October (`scratch/briefs/post-demo/e124-rulings-excerpt.md`, the
  11:35, 11:55 and 12:40 entries), the owner's "Room setup" sidebar window
  (`research/00-orchestrator-rulings.md:2818`, 2026-10-30 14:31) and his phone-remote points
  (`research/00-orchestrator-rulings.md:2694`, 20:40). The roadmap rows are `docs/roadmap/v1.0-remaining.md:43` and
  `:51`; the inventory rows R16, R24 and C4 are `research/40-post-demo-inventory.md:44`, `:52` and `:265`.
- The plan this one sits beside: `docs/plans/instructor-peer-role.md` (pieces P0–P8). On main at 8d79f188: P0 (the
  census, `apps/demo/src/app/teach2/census.dom.test.ts`), P1 (peers keyed by transport,
  `packages/controller/src/session/host-session.ts:110`), P2 (the `instructor` role, `packages/controller/src/protocol.ts:27`,
  `:251`, `:254`), P4 (the relay, `packages/controller/relay/server.ts:7–8`) and P5 (the instructor's session,
  `packages/controller/src/session/controller-session.ts:56–58`). Not on main: P3 (`feat-peer-p3` at 1b191180, checked
  with `git merge-base --is-ancestor` on 2026-11-05; its `HostSessionOptions.instructorPin`, `onNote`, `onInstructors`
  are at `host-session.ts:74–78` on that branch). Unbuilt: P6, P7, P8. The GitHub API timed out from this machine for
  the whole session (GraphQL and REST), so no PR state was read from GitHub; branch state comes from `git ls-remote`.
- House style: `instructor-peer-role.md` and `debrief-2-option-c.md`. The latter is not on main at 8d79f188 (it is on
  its own plan branch, read in `scratch/wt-debrief2-plan`); its section layout is followed here.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR.

---

## 1. Intent

Before a case, the instructor sets up the room: which screens and phones are in it, what each one shows, and whether
they are all still there. Today the Room page shows one QR code and a table of who said hello
(`apps/demo/src/app/views/room.ts:1–10`); every phone that scans becomes a learner monitor
(`apps/demo/src/app/main.ts:50–55`, `:71–84`); the code is new on every fresh tab (`apps/demo/src/app/session.ts:145`);
no ping is measured (`apps/demo/src/app/room-status.ts:8`); and Instructor v2's "Room setup" button opens Settings
(`apps/demo/src/app/teach2/begin.ts:97–99`).

This stage gives the room a code that stays, lets each device choose what it is (learner monitor, a full monitor, a
defibrillator window, the ventilator, the instructor's remote; "Depth of anaesthesia" as a slot not available yet), and shows the instructor a device table with a
measured ping and a status light. It does so with the engine's own numbers only, and with no new message kind.

## 2. Goals, non-goals, anti-goals

Goals
- **Persistent room code.** The laptop keeps its room code across tabs and days until the instructor asks for a new
  one; phones that stayed on the page reconnect by themselves.
- **Role picker on join.** The QR code opens a picker; the learner monitor is the first and preselected choice
  (E124: "phones default to the learner monitor"). The choice is remembered on that device.
- **Device table with pings.** Every device on the relay is listed, quiet ones included, with what it shows, its
  measured round-trip time and a status light; the status box gives the count and the worst ping (owner, 12:40).
- **One instrument per screen**, for the instruments the engine computes today: the learner monitor (phone,
  upright), the monitor (landscape), the defibrillator window (`#/defib`), and the ventilator
  in its own window (Q4 ruled 5 November): on a second screen of the laptop, or on a tablet over the relay (R8a–R8d).
  The IABP is a dependency (§9).
- **"Room setup"** is the Room page grown into the owner's sidebar window: Instructor v2's "Room setup" opens it, it
  holds the remembered layout and device names, the openers for this computer's windows (the ventilator among them),
  and the room code's controls.
- The kit's launcher text and `docs/showcase/CLASSROOM.md` say what the product now does.

Non-goals
- The instructor peer role itself (PIN check, grant, view feed): `instructor-peer-role.md` P3, P6, P7, P8 (§8 says
  exactly which of them this plan absorbs).
- The phone remote's layout (R24: three vitals, ECG strip, labs line; `research/40-post-demo-inventory.md:52`).
- Accounts, profiles, a scenario builder (owner, 11:40: none until they exist).
- `simulator.local` and router DNS (answered in the 11:40 round; not built here).

Anti-goals (a piece that does one of these is rejected)
- **The phones stop following the host.** Every instrument on another device is a follower (`views/follower.ts`): it
  computes nothing the host did not command. No instrument sends a command, with ONE exception the owner ruled on 5
  November (Q5): the defibrillator window sends Charge and Shock, and nothing else (R5c, R5d). The host applies
  them; the window still computes only what the host's engine commanded.
- **A screen shows something the engine does not compute.** No EEG trace, no SQI, no EMG bar, no balloon-pressure
  wave, no defibrillator value other than the one the engine's device layer holds.
- **A role is granted without the PIN.** The picker's "Instructor remote" leads to P7's PIN form; the room code alone
  admits followers only (`packages/controller/relay/server.ts:393`, the classroom rule).
- **A new wire format where today's frames carry it.** The instrument rides the existing `hello` as an optional field
  (§4 D1); the ping rides the existing host-only `peers` frame (§4 D2). No new `kind`, no new relay frame, with ONE
  exception the owner ruled on 5 November (Q4): the ventilator's link frames get a wire of their own, `vent`, between
  the host and one PIN-granted ventilator device only (§4 D9, R8a–R8d).
- **A fitted number or an estimate shown as a measurement.** The ping is measured by the relay; every threshold is
  marked [ENG] with its reason.

## 3. Every item mapped to what exists

### 3.1 The role picker vs today's `?join=` hello

| Today (8d79f188) | Where | What changes |
|---|---|---|
| The QR carries `http://<laptop>:<port>/?join=<CODE>` | `apps/demo/src/app/classroom.ts:42–46` (`learnerUrl`), `:56–68` (`qrTarget`) | The QR's address gains `#/pick` (R4). `?join=CODE` without a hash keeps today's behaviour, so the 11 e2e files and the two kit scripts that open it (`grep -rl "join=" apps/demo/e2e scripts/showcase`) are unchanged |
| A `?join=` page is a phone learner monitor at once: `data-learner=phone`, portrait follower | `main.ts:50–55`, `:71–84`; `views/follower.ts:101` (`portrait: !!net`) | The picker is a page before the follower; `#/monitor` stays the learner monitor; new hashes pick the other instruments |
| A follower forces `#/monitor` | `main.ts:72` | Kept for unknown hashes; the instrument hashes (`#/monitor/wide`, `#/defib`) are allowed |
| The follower says `hello {role:'viewer'}` and nothing else | `packages/controller/src/session/viewer-sync.ts:168` | The hello gains `show` and `device` (§4 D1), added in the follower page, not in `viewer-sync.ts` |
| The guard checks only `role` and `pin` on a hello; other fields pass | `packages/controller/src/guard.ts:122–125` | `show` and `device` are validated when present (R3) |
| Another device may say only `viewer` or `instructor` in classroom mode | `relay/server.ts:393` | Unchanged |
| The instructor's remote: `#/remote`, same-browser `controller`, or over the relay with `?relay` | `views/remote.ts:1–5`, `:56–58` | P7 adds the PIN form there; the picker's "Instructor remote" opens it (§8) |

### 3.2 The persistent room code vs today's per-tab code and the host guard's lock

| Today | Where | What changes |
|---|---|---|
| The code is `?session=` if valid, else a new random code | `session.ts:145`; `main.ts:95`, `:100` | Order becomes `?session=` → the stored room code → a new one (R1) |
| The page writes its code into `?session=` so a reload keeps it | `main.ts:104–108` | Unchanged |
| A tab opened without `?session=` asks this browser's other tabs which codes they host, and offers "Open that tab's session here" | `host-guard.ts:94–100` (`chooseHostSession`), `:103–120` (`askJoin`) | It is called with the stored code as `param`, so a second tab with the room's code is asked as a duplicated tab is today (`host-guard.ts:96`). "Start a new session" there gives a code that is NOT stored (§4 D3) |
| The relay refuses a second host while the first answers | `relay/server.ts:360–382` (`join`, the holder's ping) | Unchanged: a persistent code makes this the normal path after a laptop restart |
| Per-viewer storage, `pme.`-prefixed, try/catch | `apps/demo/src/app/store.ts:2–17` | Key `pme.roomCode` (R1); P7's `pme.instructorPin` beside it (`instructor-peer-role.md:62`) |
| The kit opens `http://127.0.0.1:<port>/?relay#/` and tries ports 8650–8659 | `scripts/showcase/kit/start-classroom.command:19`, `:75–76`, `:91` | localStorage is per origin: if 8650 is busy, the next port is a new origin and an empty store. Q3 (ruled 5 November) asks that the code survive this: R1b has the kit's relay keep the last room code in the computer's own application-data folder and hand it to the app |

### 3.3 The device table vs the relay's room state and heartbeats

| Today | Where | What changes |
|---|---|---|
| The relay pings every socket and sends `{relay:'hb'}` every `heartbeatMs` (10 s); a socket that missed one pong is terminated at the next sweep | `relay/server.ts:120`, `:477–486`, `:467` | The sweep notes the ping's send time; the pong handler computes the round trip (R2) |
| The host hears the count of followers and of granted instructors only | `relay/server.ts:178–179`; `packages/controller/src/transport/relay-frames.ts:5` | The host's frame gains `devices` (id, role, `show`, `device`, granted, last RTT, ms since last pong); the learners' frame is unchanged (R2) |
| The Room page lists peers from their hellos and commands; phones that said nothing since the page opened are rows "before this page opened" | `views/room.ts:53–59`, `:168–181` | Rows come from `devices` (relay) and from local hellos (this computer's windows) (R7) |
| Status: stable / weak (a hello in the last 2 s) / disconnected; "no ping" | `room-status.ts:1–13`, `:57–65` | Weak also when the worst measured ping passes a threshold or a device missed a heartbeat (R7, Q9) |
| A phone drops its socket after 12 s of silence | `views/follower.ts:47–50` | Unchanged |

### 3.4 One instrument per screen vs today's views and routes

| Instrument | Engine signal today | Renderer today | This stage |
|---|---|---|---|
| Learner monitor (phone, upright) | the follower's own engine (`viewer-sync.ts`), sample-identical | `mountMonitor(..., { role:'viewer', portrait: !!net })`, `views/follower.ts:101` | Exists. Default choice in the picker |
| Monitor (landscape) | as above | the same follower, not portrait (`?follow=` on this computer: `views/follower.ts:77–79`) | Over the relay it is new only in layout: `#/monitor/wide` (R4) |
| Defibrillator window `#/defib` | the device layer's defibrillator and pacer; their spec comes from the engine's ONE device profile, chosen by the skin (`packages/engine-core/src/l3/device-layer.ts:91–100`, `:175–181`); a skin without a defibrillator falls back to Zoll-like values (`packages/engine-core/src/l3/defib-pacer/defib.ts:11`, equal to `packages/skins/src/data/skins/zoll-like.json:27`; `saadat-like.json:241` is `defib: null`) | the defibrillator skins `zoll-like` and `lifepak-like` (`apps/demo/src/app/site.ts:38–39`); the readout `deviceText` (`packages/renderer/src/device-ui.ts:348–356`) | New route on the follower, wearing a defibrillator skin. **Hazard:** `setSkin` sends `device monitor skin` to that window's own engine (`packages/renderer/src/mount.ts:522`), so the window's device profile becomes its skin's. LIFEPAK-like starts at 200 J (`lifepak-like.json:27`), Zoll-like and the fallback at 120 J: a LIFEPAK window beside a Saadat host would show and deliver a default the host never had. R0 measures it; R5 offers only a style whose profile equals the host's (§4 D5, Q6) |
| Depth of anaesthesia | `di` and `sr`, a BIS-LIKE index, "NOT a BIS algorithm" (`packages/engine-core/src/l2/neuro/depth.ts:1–7`; ids at `types-neuro.ts:47`), from effect-site concentrations, with no EEG; published at 1 Hz while the depth device is on (`types-neuro.ts:45`) | the BFA tile on `philips-like` only (`packages/renderer/src/numerics-neuro.ts:1–4`, `:16–20`; `philips-like.json:19`) | **Not in this stage (Q7 ruled 5 November).** Real depth monitors (BIS, Entropy, Narcotrend, SedLine/PSI, qCON and others) each derive their number from the EEG by their own method; the engine has no EEG, so no screen is offered. The slot stays in the picker and the device table as "Not available yet". What an honest one needs: §9a |
| Ventilator | the cockpit computes its own mechanics and sends 50 frames a second into the engine (`docs/plans/stage-v-ventilator-link.md`, decision 3) | `views/vent.ts`, an iframe linked by a direct frame port (`views/vent.ts:156–159`); the cockpit can also link over BroadcastChannel `pme-vent/<session>` in the same browser (`apps/demo/src/vent/hamilton-page.ts:1–3`, `:12`) **Built (Q4 ruled 5 November), R8a–R8d.** Today its link messages go over a frame port or BroadcastChannel only (`packages/ventilator/src/link/port.ts:1–14`, `:22–27`), "deliberately not" through the controller (`port.ts:3–4`); the host mirrors its commands to same-browser viewers (`packages/controller/src/session/host-session.ts:195–209`) and the relay drops those mirrors (`relay/server.ts:251–253`); an instructor may not send `externalDrive` (`instructor-peer-role.md:132`); while it drives, every network follower HOLDS (`views/follower.ts:32–35`; the host's `cockpit` notice, `host-session.ts:87`, `:124`). R8a–R8d carry the link messages over the relay as their own `vent` kind; the holds stay |
| IABP | the balloon exists in the circulation (`packages/engine-core/src/l2/circ/devices.ts:1–32`; command `device iabp start/stop/set`, `types-circ.ts:18`; output ratio and augmentation, `types-circ.ts:32`, `l2/hemo/pipeline.ts:547`) | none; no app control sends `device iabp` (`grep -rn iabp apps/demo/src/app` finds only glossary rows, `glossary-data.ts:111`, `:303`) | **Out** (owner: "IABP later"). A console needs a balloon-pressure wave and trigger marks the engine does not compute: a new model, §9 |
| Instructor remote | P2/P5 on main; P3 draft | `views/remote.ts` (today's panel) | The picker's entry opens P7's form (§8) |

### 3.5 "Room setup" vs today's pages

| Today | Where | What changes |
|---|---|---|
| Instructor v2's "Room setup" opens Settings | `teach2/begin.ts:97–99` | It opens the Room page (R7) |
| The rail's "Room" page | `apps/demo/src/app/rail.ts:44`; `router.ts:5`, `:14`, `:18` | It is the "Room setup" window (Q2): join, devices, this computer's windows, room code, remembered layout |
| Settings holds the monitor style (site profile) | `views/settings.ts:24` | Unchanged; Room setup shows the style and links to it (Q2) |
| "Save and restart" keeps probes and cuff (`RoomKeep`) | `session.ts:28–33`, `:431–438` | Unchanged; Room setup shows the probes attached now, read-only (Q2) |
| "Open on this computer": learner monitor window, a remote | `views/room.ts:145–156` | Adds Monitor and Defibrillator windows, and the Ventilator (R5, R7, R8d) |
| The top bar's code pill says "Remote" and opens the pairing page | `main.ts:216`; `views/remote.ts:20–36` | It opens the Room (R7): pairing goes through the one QR |
| The Monitor view's "Phones" button opens the Room | `views/monitor.ts:22–23` | Unchanged |

## 4. Decisions this plan makes where the brief and the rulings were silent

- **D1. The instrument rides the hello.** `hello` gains two optional fields, legal with `role: 'viewer'` only:
  `show: 'learner' | 'monitor' | 'defib' | 'depth'` and `device: string` (8 to 16 characters of `[a-z0-9]`, a random key
  the device keeps in its own `store`, for the remembered layout). The guard refuses either on another role and any
  other value (R3). Older relays and hosts ignore them: the guard passes unknown fields (`guard.ts:122–125`) and the
  relay forwards a peer's hello to the host as the raw frame (`relay/server.ts:205–212`). The peer id is not used to
  carry the instrument: it is an identity the host and relay key on (`host-session.ts:110`; `server.ts:360–382`).
  The fields are added by the follower PAGE wrapping its transport's `send` for `hello`, so
  `viewer-sync.ts` (a must-not-touch of the peer plan, `instructor-peer-role.md:25–26`) is not edited.
- **D2. The relay measures the ping, and only the host hears it.** The relay already pings every socket at every
  sweep (`server.ts:484`) and listens for pongs (`:467`); it records the send time and the round trip. The host's
  `peers` frame gains `devices` — the precedent is `instructors`, sent to the host only (`server.ts:179`). The frame
  to learners is unchanged, so a phone never learns what the others show. The ping is the relay↔device hop; in the
  kit the relay runs on the laptop (`start-classroom.command:76`), so it is the Wi-Fi hop. A window of this browser
  (BroadcastChannel) has no ping and reads "this computer".
- **D3. The stored code is the room's; a "new session" in a second tab is not.** Only the first tab of a browser that
  starts without `?session=` stores its code; "Start a new session" in a second tab (`host-guard.ts:98`) runs a code
  for that tab alone. "New room code" on Room setup replaces the stored one, after a confirm that says the phones
  following the old code will stay on it. Forgetting the room (R7) never clears the code or P7's PIN.
- **D4. One QR code.** The owner's 11:35 picture (the host shows the QR, the device picks what it is) and 12:40
  ("QR shown ONLY here") give one QR on the Room. P7's planned second QR of `?relay#/remote?code=CODE`
  (`instructor-peer-role.md:478–479`) is superseded by the picker's "Instructor remote" entry, which opens the same
  address. The PIN is still never in any address.
- **D5. The room's defibrillator is a model of its own (Q6 ruled 5 November).** Today the defibrillator's spec is the
  monitor skin's: `setSkin` sends `device monitor skin` (`packages/renderer/src/mount.ts:522`), and the device layer
  rebuilds the whole profile, defibrillator included, from that skin (`device-layer.ts:91`, `:175–181`; a skin without
  one falls back to Zoll's values, `defib.ts:11`). R5a gives the device layer a defibrillator model set by its own
  command, `device {device:'defib', action:'model', value}`, which a skin change no longer overrides; the host sends
  it from Room setup (R5b), so every follower replays it. A defibrillator window then wears the model's look and its
  engine holds the model's spec, whatever the monitor skin. The models the engine knows today are the two skins with
  a defibrillator block: **Zoll-style** (`zoll-like.json:27`: 120 J adult, 50 J paediatric, no AED ladder, charge time
  by the 7 s / 200 J rule, `defib.ts:12–13`) and **LIFEPAK-style** (`lifepak-like.json:27`: 200 J adult, 50 J
  paediatric, AED ladder 200, 300, 360 J, charge 7 s at 200 J and 10 s at 360 J). **R5a ships the generic
  model only** (Q6's second half, ruled 5 November evening): its values are the fallback's (`defib.ts:11`, the
  Zoll-style numbers above). The department's actual machine is added later as a skin with its own sourced
  defibrillator block, and one line in `DEFIB_MODELS` then (§9).
- **D6. The defibrillator window is the one instrument that commands, and only Charge and Shock (Q5 ruled 5
  November).** The monitor screens have no controls. The window's two presses
  carry no energy: the energy is the room's (the device's selected energy, `defib.ts:76`: a charge without `energyJ`
  keeps `d.energyJ`, which starts at the model's adult energy, `defib.ts:32–33`, or the instructor's selection).
  Shock is never disabled by the window: a shock without a charge is refused by the device
  (`defib.ts:57`, "defibrillator is not charged"), not by a panel lock. The role is admitted by the room code alone,
  with no PIN, because the power it carries is exactly the two presses a learner at a real defibrillator has.
  **Amended 12 November 2026 (defibrillator plan `docs/plans/defibrillator-zoll-m2.md` §5.1, DQ6 = A; written in its
  E0).** In a room whose defibrillator is the ZOLL M2 the role carries what a resident does at the device: the mode
  selector, patient type, energy select from the model's list, Charge, Shock pressed and released, Disarm, Sync,
  Analyze, the Manual/AED switch, the pacer's mode, rate and output and 4:1 pressed and released, the M2's own Alarm
  Control and limits and settings, NIBP, CO2 on and zero, code marker, print, and the connections drawer (pads with
  type, placement and contact; paddles; internal handles; the ECG cable; the sensors; the test plug; DQ5 = A). The
  commands are the engine's `applyEvent defib`, `applyEvent pacer set` and `device defib <action>` of E0's vocabulary
  (`packages/engine-core/src/l3/defib-pacer/m2-vocabulary.ts`). Never: `preselect`, the pacer's `fault`, the M2's
  `config`, `setTarget`, time, scenario, drugs, the bedside monitor's alarms, `device defib model`. Because the power
  is no longer two presses, **the role is admitted with the learner PIN**, as the learner action remote is. Until the
  allow-list piece (R1) lands the role's list stays Charge and Shock, admitted as above.
- **D7. Hashes for the instruments.** On a follower page: `#/monitor` (today's; upright on `?join=`, landscape on
  `?follow=`), `#/monitor/wide` (landscape over the relay), `#/defib`, `#/pick` (the ventilator's own page is R8d's). The same hashes work on
  `?follow=` (this computer) and `?join=` (the relay). `router.ts` `ROUTES` is the host's list (`router.ts:5`) and
  does not change: the follower branch of `main.ts` parses its own hashes.
- **D8. Remembered layout = names and expected instruments per device key.** `store` key `pme.roomLayout` on the
  laptop: `{ [device]: { name, show, lastSeen } }`, at most 64 entries [ENG: twice `--max-peers`' default of 60 is not
  needed; 64 covers a full room plus spares]. A device with a remembered key gets its name; a remembered device that
  is absent is a grey row "expected, not connected". Phones without a key (older builds) are "Phone n" as today.

- **D9. The ventilator's wire (Q4 ruled 5 November).** The link messages the cockpit and the monitor already exchange
  (`port.ts:22–27`: `cmds`, `lungState`, `clock`, `run`, `time`, `control`) travel over the relay inside one new
  envelope kind, `{kind:'vent', to?, body: LinkMsg}`, plus one new link message, `settings` (the cockpit's settings,
  for the hand-over, which today reads them through the iframe, `views/vent.ts:60–66`). Nothing else changes kind:
  the cockpit's commands are still built by the link core (`packages/ventilator/src/link/core.ts:50–62`:
  `setTarget` stand-ins once, `applyEvent airway` on a change, `externalDrive` every tick) and applied on the host by
  the same `attachMonitorToLink` the view uses (`views/vent.ts:76`). The ventilator device is a ROLE of its own,
  `ventilator`, granted with the instructor's PIN by the same host check as P3's, because a device that drives the
  patient is a commanding device (anti-goal: no role without the PIN), and because P3's option B (one instructor
  phone, the newest takes over) must not let a ventilator tablet unseat the instructor's phone. A second screen of the
  laptop (same browser) links over the existing BroadcastChannel port (`apps/demo/src/vent/hamilton-page.ts:12`), with
  no PIN, as today's same-browser windows are trusted.

## 5. Global constraints (every piece)

- `00-common-rules.md` applies: own worktree under `scratch/` on a branch from `origin/main`; never merge, tag,
  force-push or push gh-pages; one PR per piece, draft until its checks pass; `npx -y pnpm@9.15.9`; the executor's
  port range only; no owner identifier anywhere; no closing keyword before a `#number`; identity through
  `GIT_AUTHOR_*` / `GIT_COMMITTER_*` on every commit.
- **Tests first** in every piece: the failing test is committed before the code, and the PR body pastes both runs.
- **Must not touch (every piece):** `packages/engine-core` (except R5a, owner-ruled Q6), `packages/skins`, the scenario format, the showcase
  cards (`apps/demo/src/app/showcase`), `packages/controller/src/session/viewer-sync.ts`, `host-session.ts` (P3's
  file; R8c and R5d alone extend it, after P3 merges, and its gate drops that path from the diff check below), and what any
  Instructor press sends, except R5b's defibrillator-model command, named there. `packages/ventilator` is touched by R8a (one
  additive `LinkMsg` kind) and R8c (a new `relay-port.ts`) only, never its mechanics.
  `packages/renderer` is untouched unless R0 shows that a look-only skin is needed (then R5 stops and reports; §4 D5).
- **Common gate (before every push):**

```bash
npx -y pnpm@9.15.9 install --frozen-lockfile < /dev/null
npx -y pnpm@9.15.9 -r typecheck < /dev/null
npx -y pnpm@9.15.9 --filter <pkg> test < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs < /dev/null   # 0 stale, 0 orphans
git diff origin/main --stat -- packages/engine-core packages/skins apps/demo/src/app/showcase \
  packages/controller/src/session/viewer-sync.ts packages/controller/src/session/host-session.ts   # empty
grep -rn "it.fails" --include=*.test.ts packages apps | wc -l   # unchanged from origin/main
```

- **Stable selectors stay**: `.room-table tbody tr[data-level]`, `.room-status[data-level]`, `.phones-code`,
  `.phones-url`, `.room-large`, `.room-big` (`views/room.ts`), which `room-qr-tab-guard.e2e.ts` and
  `mobile-learner.e2e.ts` read. New ones are added: `[data-show]`, `[data-device]`, `.room-ping`, `.join-pick`.
- **New e2e tests** pass 3 of 3 local runs on chromium and webkit, are never tagged `@known-flaky`, and use the
  in-process relay as `mobile-learner.e2e.ts` does.
- **Shared machine:** one local e2e or kit run at a time; never an unfiltered `pkill`.

## 6. Review focus (for each piece's reviewer)

1. **A value the engine did not compute.** Every number on an instrument traces to a `measurement`, a `state` or the
   device layer of the window's own follower engine; every ping to the relay's pong.
2. **A learner gains something.** The learners' `peers` frame, their event copy and their commands are byte-identical
   before and after (`relay-classroom.test.ts` style); a viewer saying `show` still gets `forbidden` on a command.
3. **A PIN or a role in an address.** No URL, QR or stored layout contains the PIN; `#/pick` never grants anything.
4. **Old devices.** A phone of the previous build (no `show`) and a relay of the previous build (no `devices`) still
   work; the Room degrades to today's rows.
5. **The follower's sync.** A defibrillator or depth window drifts no more than the learner monitor (beat checks,
   `viewer-sync.ts`); R0's measurement is the reference.

---

## 7. Pieces

Sizes are executor hours (est.). Each piece is one PR against `main`.

### R0: Baseline and the defibrillator-profile measurement (2 h)

**Depends on:** nothing. **Files:** new `apps/demo/src/app/instrument-sync.dom.test.ts` (test only); a copy of the
measurement for review in `scratch/room-plan-gate/r0.json`.
**Tests first (they pin today; some are expected to show the hazard):**
- `?join=CODE` without a hash mounts the learner monitor at once (pins `main.ts:71–84` for R4);
- a host on `saadat-like` and a follower that `setSkin('zoll-like')`: through `device defib charge`, a shock at the
  default energy and pacing at the default mA, the follower's beats equal the host's (sample identity, as the
  follower tests check) and its defibrillator energy equals the host's;
- the same with `lifepak-like`: the measured difference (expected: 200 J vs 120 J default, `lifepak-like.json:27`
  vs `defib.ts:11`) written into the test as the pinned behaviour, with the reason in its name.
**Acceptance:** the tests pass on 8d79f188 and the JSON states which pairings stay identical. If Zoll-like beside
Saadat also diverges, the executor stops and reports: R5 then needs a look-only skin (renderer) or an engine
profile option, which this plan does not presume. **Must not touch:** any source file. **Gate:** common, with
`@pme/demo`. **CI load:** 1 run.

### R1: The persistent room code (4 h)

**Depends on:** nothing (beside R0). **Files:** new `apps/demo/src/app/room-code.ts` (pure: the start order and the
store key), `room-code.test.ts`; `main.ts` (`:95`, `:100–108`); `host-guard.dom.test.ts` (one case); new e2e
`apps/demo/e2e/room-code.e2e.ts`.
**Tests first:**
- `startCode({ param, stored, hosts })`: `?session=` wins; else the stored code; else null (a new one is drawn and
  stored); an invalid stored value is ignored;
- a second tab with the stored code live in the first is asked (`chooseHostSession` with the stored code as
  `param`); "Start a new session" there does not overwrite the stored code (§4 D3);
- e2e: open the app, note the code; close the page; open the app's bare address: the same code; a follower page
  left open on the old page reconnects and follows the new host (the relay's holder ping, `server.ts:360–382`);
- `store` failing (private window): a new code each time, as today, and no error.
**Change:** `room-code.ts`; `main.ts` passes the start code to `chooseHostSession` and stores the code the first tab
starts. No Room UI here (R7 adds "New room code"). Q3 ruled 5 November: the code lives until "New room code" is
pressed (reloads, restarts and the next day keep it); R1b covers the kit's port change.
**Acceptance:** the tests pass; `reload-keeps-case.e2e.ts`, `room-qr-tab-guard.e2e.ts`, `host-guard.dom.test.ts`
pass unchanged. **Must not touch:** `host-guard.ts` logic, `session.ts`. **Gate:** common, with `@pme/demo`, plus the
three e2e files above on both projects. **CI load:** 1 run.

### R1b: The room code survives the kit's port change (4 h)

**Depends on:** R1. **Why:** the kit opens `http://127.0.0.1:<port>` and moves to the next port when 8650 is busy
(`start-classroom.command:19`, `:75–76`, `:91`); a new port is a new origin, whose store is empty, so R1 alone would
draw a new code (Q3 ruled 5 November says the code must live until "New room code"). **Files:**
`packages/controller/relay/bin.ts` (a `--state-dir DIR` option), `relay/http.ts` (`/pme-relay.json` gains
`lastRoom`), `relay/server.ts` (the code of the last room a host opened, written to `DIR/room.json` when a host says
hello); `apps/demo/src/app/classroom.ts` (`RelayInfo` gains `lastRoom?`, `:16–22`), `room-code.ts` (the start order
becomes `?session=` → stored → the relay's `lastRoom` → new); `scripts/showcase/kit/start-classroom.command` and
`.cmd` (pass `--state-dir` to the computer's own application-data folder: `$HOME/Library/Application Support/PME
Classroom` on macOS, `%LOCALAPPDATA%\PME Classroom` on Windows; the launcher still writes nothing into the kit's own
folder, `start-classroom.command:8`); tests in `test/relay/relay-state.test.ts`, `room-code.test.ts`,
`kit-windows.test.ts`; one step in `check-relay.mjs`.
**Tests first:**
- a relay started with `--state-dir` answers `lastRoom` after a host's hello, and a NEW relay process on another port
  with the same directory answers the same `lastRoom`;
- without `--state-dir` (`pnpm relay`, the developer's use) nothing is written and `lastRoom` is absent;
- `room.json` holds the room code only: never a PIN, a peer id, an address or a name;
- the app on an empty store takes `lastRoom` and stores it; a `?session=` or a stored code still wins; "New room code"
  (R7) also replaces `lastRoom` at the next host hello;
- e2e (`room-code.e2e.ts`): two relays in turn on two ports with one state directory; the page on the second origin
  starts under the first's code, and a phone that stayed on the first address's page is told by its failing socket,
  as today, to scan again (a phone page's relay is its page's own host, `classroom.ts:34–40`: it cannot follow a port
  change by itself, which the Room states).
**Acceptance:** the tests pass; every relay test and the kit's `check-relay.mjs` pass. P7's PIN is NOT carried (a
secret is not written to disk): on a new origin the PIN is drawn again and the Room says so (§8). **Must not touch:**
`host-session.ts`. **Gate:** common, with `@pme/controller` and `@pme/demo`, plus `check-relay.mjs` on a kit built
from the branch. **CI load:** 1 run.

### R2: The relay measures each device's ping and tells the host (5 h)

**Depends on:** R3 (the `show` and `device` fields it reports). **Files:** `packages/controller/relay/server.ts`
(the sweep, the pong handler, `hostPeersFrame`), `src/transport/relay-frames.ts`, `relay/README.md`; tests in
`test/relay/relay-classroom.test.ts` and a new `test/relay/relay-devices.test.ts`; one step in
`scripts/showcase/check-relay.mjs`.
**Tests first:**
- after a sweep and its pongs, the host's `peers` frame carries `devices` with one entry per non-host socket: `id`,
  `role`, `show` and `device` from its last hello, `granted`, `rttMs` (a fake clock gives an exact value) and
  `sinceMs`;
- a socket that did not answer the last ping has `rttMs: null` and its `sinceMs` grows; at the second missed sweep
  it is gone (today's terminate, `server.ts:479–482`);
- the learners' `peers` frame is byte-identical to today's (`hostOnline`, `peers` only);
- a hello without `show` reports `show: null`; an instructor's entry never carries a PIN;
- the frame is sent to the host on every sweep and on every join and leave (today `tellHost`, `server.ts:293–295`),
  and its size with 60 devices stays ≤ 8 KB [ENG: one frame per 10 s; a classroom of 60 at ≈ 110 bytes each];
- `check-relay.mjs`: the built kit's relay reports a device's RTT after one sweep.
**Change:** the per-socket ping time and RTT; `devices` in `hostPeersFrame`; the README's table.
**Acceptance:** the tests pass; every relay test and `mobile-learner.e2e.ts` pass unchanged. **Must not touch:**
`host-session.ts`, the app. **Gate:** common, with `@pme/controller`, plus `node scripts/showcase/check-relay.mjs`
against a kit built from the branch (`scripts/showcase/make-bundle.mjs`). **CI load:** 1 run (the build job's kit
relay smoke test, `.github/workflows/ci.yml:48`, covers the new step).

### R3: `show` and `device` on the hello (2 h)

**Depends on:** nothing. **Files:** `packages/controller/src/protocol.ts` (the hello's type, `:251`; an
`INSTRUMENTS` list), `src/guard.ts` (`:122–125`), `src/index.ts`; tests in `test/guard.test.ts`,
`test/types.test-d.ts`.
**Tests first:** the guard accepts `hello {role:'viewer', show:'defib', device:'k3x9q2m7'}`; refuses `show` or
`device` on any other role, an unknown `show`, a `device` outside `[a-z0-9]{8,16}`; a hello without them is unchanged.
**Change:** the type and the guard. Nobody sends the fields yet. **Acceptance:** typecheck green across the
workspace; no behaviour change. **Must not touch:** `relay/`, sessions, the app. **Gate:** common, with
`@pme/controller`. **CI load:** 1 run.

### R4: The picker on the device, and the follower's instrument hashes (7 h; 6 h before m5 became its design source, +1 h for the cards and their drawings)

**Depends on:** R3. **Files:** new `apps/demo/src/app/views/join.ts` (the picker), `join.dom.test.ts`;
`classroom.ts` (`learnerUrl` adds `#/pick` for the QR only; an `instrumentOf(hash)` parser), `classroom.test.ts`;
`main.ts` (the follower branch, `:71–84`, and `:55`'s phone layout only for the learner); `views/follower.ts` (the
transport wrapper that adds `show` and `device` to its hellos; `portrait` from the instrument, `:101`);
`app.css`; `mobile-learner.e2e.ts` (its QR-address assertions, `:107–108`, gain `#/pick`).
**Design source (Q1 ruled 5 November): mock-up m5**, `docs/plans/room-and-instruments/mockup/m5-instruments-owner.html`
and its 1280 px capture. The picker takes m5's layout: one card per instrument in a grid (three across at 1280 px, one
column on a phone at 375 px), each card a picture (`instruments.js`'s drawings, as inline SVG, no external font or
image), the title, a status chip (`.st`, `.st.on` for the one this device shows), one line of description, and the
card's action; the room code under the title, as m5's header shows it. m5 was drawn as a host page ("New window", "To
a device", "This screen"); on the device the card's one action is **"Show here"**, and the host-side actions belong to
R7's Room setup. m5's titles are kept: "Patient monitor", "Ventilator", "Depth of anaesthesia", "Intra-aortic balloon
pump", "Defibrillator", plus "Learner monitor" (m5's "Learner phones" card, said from the phone) and "Instructor
remote" (the 11:55 ruling, not drawn in m5). Its descriptions are kept where the product does what they say, and
changed where it does not (anti-goal: nothing on a screen the engine does not compute). Each change is listed in the
PR for the owner, who rules the final words:

| m5 card | m5's words | Picker's words, and why |
|---|---|---|
| Patient monitor | "ECG, pressures, SpO₂, capnography and temperature in the Saadat-style skin." | Kept, with the room's own style named instead of "Saadat-style" (the host's style, `views/follower.ts:181`) |
| Ventilator | "Modes, settings, pressure and flow loops, with the lung mechanics of the loaded patient." | Card shown with the chip "On the instructor's computer" and no "Show here": its frames do not cross the relay (§3.4) |
| Depth of anaesthesia | "BIS-style index with SQI and EMG, following the hypnotic effect-site concentration." | Card kept, chip **"Not available yet"**, no action, and one line: "Needs a simulated EEG: planned as an engine stage of its own." (Q7 ruled 5 November; §9a). The picture drops m5's index, SQI, EMG and EEG line: nothing on it the engine computes |
| Intra-aortic balloon pump | "Timing, augmentation and the arterial trace with the balloon's effect." chip "Coming later", button disabled | As m5: chip "Coming later", no action (Q8; §9) |
| Defibrillator | "Rhythm strip, energy selection, charge and shock, pacing." | "Rhythm strip, energy selection, charge and shock, pacing", kept with "energy selection" read as the room's model and the instructor's choice: the window has Charge and Shock (Q5 ruled 5 November, R5d), not energy selection. Shown only once R5 has merged |
| Learner phones | "Each learner's phone follows the monitor; they tick what they noticed for the debrief." | "Learner monitor: this phone follows the patient monitor." No "tick what they noticed" control exists in the app (no such feature at 8d79f188) |
| (Instructor remote) | not in m5 | "Run the case from this phone. Needs the instructor's PIN." Shown only once P7 has merged; its action opens P7's PIN form |

m5's foot line "Last time in this room: … Reopen that layout" is a host-side feature: R7 (the remembered layout).
**Tests first:**
- dom: `#/pick` shows the m5 cards in m5's order, Learner monitor first, focused and preselected (Q1 ruled 5 November);
  Defibrillator only once R5 has merged; Depth of anaesthesia always present with "Not available yet" and no action; "Instructor remote" only once P7 has merged,
  opening P7's address; the Ventilator and the IABP cards have no "Show here" and say why;
- the card words equal the "Picker's words" column above (one literal in the test, so a wording change is a reviewed
  diff);
- the grid is one column at 375 px and three at 1280 px; every card's action is a 44 px target
  (`app-accessibility.e2e.ts`);
- the last choice is kept in the device's `store` (`pme.instrument`) and is preselected next time, never applied
  without a tap (Q1);
- a "Change" control in the follower bar returns to `#/pick`;
- every hello the follower sends carries its `show` and its `device` key (captured on a fake transport);
- `classroom.test.ts`: the QR's address ends `?join=CODE#/pick`; no address the app builds carries a PIN;
- e2e (new cases in `mobile-learner.e2e.ts`): scanning the QR's address shows the picker; one tap gives today's
  learner monitor, following; `#/monitor/wide` is landscape and follows.
**Acceptance:** the tests pass; every e2e that opens `?join=CODE` without a hash passes unchanged
(`f28-phone-portrait-saadat`, `fx14`, `fx16`, `fx24`, `case-briefing`, `reload-keeps-case`, `saadat-bfi-etaa-row`,
`sim-line`, `vent-handover-phones`, `room-qr-tab-guard`). **Must not touch:** `viewer-sync.ts`; the host's views.
**Gate:** common, with `@pme/demo`, plus `mobile-learner.e2e.ts` and `f28-phone-portrait-saadat.e2e.ts` on both
projects. **CI load:** 1 run.

### R5: The defibrillator window `#/defib` (5 h)

**Depends on:** R5b (the room's model), R4 (the follower's hash handling). **Files:** new
`apps/demo/src/app/instrument.ts` (pure: which skin an instrument wears: the room's defibrillator model's look, §4
D5), `instrument.test.ts`;
`views/follower.ts` (the defibrillator page: the instrument's skin, the host's `style` events change the theme only,
`:137–145`, `:181`); `views/room.ts` (the opener "Defibrillator in a new window", `?follow=CODE#/defib`, as
`:145–150`); `join.ts` (the entry).
**Tests first:**
- `defibSkin(model)` is the model's own look for each model R5a knows, whatever the monitor skin;
- dom: the defibrillator window shows the energy and CHARGING / READY from its own engine at the same tick the host's
  readout does (`deviceText`); its Charge and Shock come in R5d;
- a host monitor-style change keeps the window on the model's look; a model change in Room setup switches it;
- e2e (`learner-monitor-follows.e2e.ts`, a new case): a `#/defib` window on this computer and one over the relay show
  "120 J CHARGING" within one second of the host's charge.
**Acceptance:** the tests pass; R5a's acceptance holds in the window (host and window agree on energy, charge time
and the shock's outcome; no beat drift beyond the learner monitor's). **Must not touch:** `panel/defib.ts` and what
it sends; `packages/renderer`. **Gate:** common, with `@pme/demo`, plus
`learner-monitor-follows.e2e.ts` and `mobile-learner.e2e.ts` on both projects. **CI load:** 1 run.

### R5a: The defibrillator model apart from the monitor skin, in the engine's device layer (6 h)

**Depends on:** R0. **Owner-ruled exception (Q6, 5 November) to the global "must not touch `packages/engine-core`".**
**Files:** `packages/engine-core/src/l3/device-layer.ts` (`DeviceState` gains `defibModel: string | null`;
`defibSpec(d)` reads the model's spec, else today's skin profile, `:91`; the `monitor skin` branch, `:175–181`, keeps
the model; the command's validation beside `:125–135`), `src/types-device.ts` (the `device: 'defib'` action
`model`), `src/l3/alarms/profile.ts` (`DEFIB_MODELS`: the generic model only, Q6's second half; its numbers are
`FALLBACK_DEFIB`'s, `defib.ts:11`, equal to `zoll-like.json:27`, with that skin's provenance), `src/l3/defib-pacer/defib.ts` (nothing in its arithmetic); tests in
`packages/engine-core/test/` beside the device-layer tests; the snapshot round trip; `docs/model/*` regenerated.
**Tests first:**
- with no model set, every device-layer and validation test is unchanged (today's skin-driven behaviour exactly);
- `device defib model generic` on a `saadat-like` monitor (no defibrillator block): a charge with no energy charges
  120 J, charge time by the 7 s / 200 J rule (`defib.ts:12–13`); on a `lifepak-like` monitor the same model still
  gives 120 J (the skin no longer sets it); a later `monitor skin` change keeps those;
- an unknown model is refused with its reason; the pacer is untouched (it stays the skin's: not ruled);
- snapshot then restore keeps the model; a follower that replays the command holds the same spec;
- **R0's measurement as the acceptance:** a `saadat-like` host with model `generic` and a follower wearing the
  `zoll-like` skin (the generic model's look: its defibrillator block equals the fallback) agree on the default energy, the charge time, the READY tick and the shock's outcome through
  charge, shock and pacing at the defaults, with no beat drift beyond the learner monitor's (R0's pinned difference
  turns into an equality).
**Acceptance:** the tests pass; the validation suites (`packages/validation`) and the slow showcase goldens are
unchanged; `known-misses.md` unchanged. **Must not touch:** the shock outcome table, the alarm profiles, anything
else in the engine. **Gate:** common, with `@pme/engine-core` and `@pme/validation`, plus the validation workflow;
model-docs regenerated and committed as `docs(model): regenerate after R5a`. **CI load:** 1 run, plus the validation
workflow.

### R5b: Room setup's defibrillator choice, and the panel's energies from it (4 h)

**Depends on:** R5a, R7's Room page (or its base, if R7 is not yet in: the choice sits in its own card). **Files:**
`apps/demo/src/app/site.ts` (the site profile gains `defibModel`, kept per room as the monitor style is, `:32–40`,
`:54–62`), `views/room.ts` (a "Defibrillator in this room" choice with one entry, the generic model (120 J adult, 50 J
paediatric, the fallback's values; Q6's second half), and the line "Your department's machine: not named yet", kept as
the hook for the department's model, added later as a skin),
`session.ts` (the host sends `device defib model` at each patient mount and on a change, through the host's command
path so followers replay it), `panel/defib.ts` (the energy stepper starts at the model's adult energy instead of the
fixed 200, `:18`, and offers the model's AED ladder as presets when it has one); tests beside each; the census
(`teach2/census.dom.test.ts`) unchanged in shape (`device`), its review copy gains `device defib model`.
**Tests first:** the choice is saved and re-sent after a patient restart and a scenario load; a follower's spec
equals the host's after the change; the panel's default energy follows the model; nothing else in what a press
sends changes. **Acceptance:** the tests pass; MH and haemorrhage showcase goldens unchanged with no model chosen.
**Must not touch:** the engine. **Gate:** common, with `@pme/demo`. **CI load:** 1 run.

### R5c: The learner defibrillator role: hello, guard, relay allow-list (4 h)

**Depends on:** R3. **The first learner-operated command path (Q5 ruled 5 November).** **Files:**
`packages/controller/src/protocol.ts` (`Role` gains `'defib'`, `:27`; `LEARNER_DEFIB_COMMANDS`, exactly two shapes:
`applyEvent defib charge` and `applyEvent defib shock`, each with no `energyJ`, no `outcome`, no `atTick`;
`learnerDefibMay(cmd)` → null or the refusal), `src/guard.ts` (`ROLES`, `:100`; `show`/`device` legal with `defib`
too), `relay/server.ts` (the classroom rule admits `defib` from another device, `:393`, counted with the learners
under `--max-peers`; a `defib` socket is routed as a viewer for everything it RECEIVES, lean copies; of what it SENDS,
only a command that passes `learnerDefibMay` goes to the host, and any other command gets `{relay:'error',
code:'forbidden'}`; at most 4 commands a second per socket [ENG: a charge and a shock per cycle with a margin for
double taps], over that `too-many-tries`; acks route back as for a controller, `server.ts:221–231`), `relay/README.md`;
tests in `test/guard.test.ts`, new `test/relay/relay-defib.test.ts`, `relay-hostile.test.ts`.
**Tests first:** the relay forwards exactly the two shapes and refuses each of: `defib charge` with `energyJ: 360`,
`defib shock` with `atTick`, `defib selectEnergy`, `defib preselect`, `defib disarm`, `syncOn`, `pacer`, `drug`,
`cpr`, any `time`, `scenario`, `device`, `setTarget`, `pin`, `note`, a `vent` message, a hello as another role on the
same socket; a viewer's command is still `forbidden` (unchanged); the learners' frames are unchanged.
**Acceptance:** every relay and guard test passes unchanged besides the new ones. **Must not touch:** `host-session.ts`,
the app. **Gate:** common, with `@pme/controller`, plus `check-relay.mjs` with one new step (a defib socket's charge
reaches the host; its `selectEnergy` does not). **CI load:** 1 run.

### R5d: The host applies a learner's Charge and Shock; the record says who; the window's two buttons (6 h)

**Depends on:** R5c, R5, P3 merged (same file as R8c; merge after it). **Files:** `host-session.ts` (a `defib` peer's
command is applied only if `learnerDefibMay` passes, checked again on the host whatever the relay did; `issuedBy`
overwritten with `learner`, and the device key of its hello carried as `by`, as P3 overwrites an instructor's with
`remote`, `instructor-peer-role.md` §2), `apps/demo/src/app/record.ts` (`RowKind` gains `learner`, `:21`; the row
keeps `by`, `:22–33`, `:206`), the Debrief's who line (its name from R7's remembered layout, else "Defibrillator
window n"), `views/follower.ts` and the defibrillator page (Charge and Shock, 44 px, always enabled; the ack's refusal
shown as the device's words, "Not charged"), new `apps/demo/e2e/learner-defib.e2e.ts`; tests beside each.
**Tests first:**
- a learner's charge then shock land as the instructor's would: the same `applyEvent` path into the engine, the same
  validation (`defib.ts:50–66`), the room's energy (no `energyJ`), the same outcome table;
- a learner's shock without a charge comes back refused with the device's reason; nothing in the window blocks it;
- every learner press is a record row of kind `learner` with the device's key and name; the Debrief shows "Shock
  200 J at 04:12, by Defibrillator (bed 2)"; the instructor's own presses keep their rows;
- a `defib` peer's every other shape is refused at the HOST too, with the relay bypassed (an in-process transport);
- e2e: the window charges and shocks the free-roam patient after the instructor sets VF; a forged `applyEvent drug` and a `time pause`
  sent on the window's own socket are refused and change nothing on the host; a learner phone (viewer) still cannot
  command; the learner phones see the shock as followers do.
**Acceptance:** the tests pass; P3's and the census tests pass unchanged; the Debrief e2e passes with only additions.
**Must not touch:** `panel/defib.ts`'s sends; the engine. **Gate:** common, with `@pme/controller` and `@pme/demo`,
plus the new e2e and `debrief.e2e.ts` on both projects. **CI load:** 1 run.

### R7: Room setup: the device table with pings, the status box, the windows, the code, the remembered layout (7 h)

**Depends on:** R1, R2. **Files:** `views/room.ts`, `room-status.ts`, new `apps/demo/src/app/room-layout.ts` (pure:
the remembered layout, D8), `room-layout.test.ts`; `console-pages.dom.test.ts` (`:177–179` and new cases);
`teach2/begin.ts` (`:97–99`: "Room setup" opens `#/room`); `main.ts` (`:216`: the code pill opens the Room;
`session.ts`'s `onFollowers` gains the `devices` list beside the count); `room-qr-tab-guard.e2e.ts` (new cases);
`app-accessibility.e2e.ts` (the new controls).
**Q2 ruled 5 November:** Room setup is this page grown. The host-side parts of mock-up m5 land here, not in R4: the
openers ("New window" per instrument), the remembered layout ("Last time in this room: … Reopen that layout") and the
which-screen chips ("This screen", "Screen 2"), using R4's card component so the two pages look alike. m5's "To a
device" is read as "show the join QR preset to that instrument" (`?join=CODE#/defib`, never a PIN); the owner's 11:35
clarification keeps the host's page to the QR, the connection method and the device table, so this is offered to him
in the PR rather than built by default.
**Tests first:**
- `roomStatus` with `devices`: Stable when every device answered its last ping under the weak threshold; Weak when the
  worst ping is over it or a device missed a heartbeat (Q9 ruled 5 November: 300 ms and one missed 10 s heartbeat,
  an engineering choice, stated as such on the page's legend); Disconnected
  when the relay socket is down, as today; the box reads "7 devices · worst ping 42 ms";
- the table: one row per `devices` entry (role, `show` as "Learner monitor" / "Monitor" / "Defibrillator" / "Depth
  index" / "Instructor remote", ping, last heard), plus this computer's windows from their hellos (today's `local`
  rows, `room.ts:172`); a device that never said `show` reads "Learner monitor" as today; no "before this page
  opened" rows any more (the relay lists every socket);
- the instructor remote's row reads granted / signing in from `devices[].granted` (the relay's flag,
  `server.ts:58`); P7 adds its PIN panel into the `#room-instructor` slot this piece leaves empty (§8);
- names: a row's name can be edited; it is kept under the device's key; a remembered device absent now is a grey
  "expected, not connected" row; "Forget the room" clears the layout, not the code or the PIN;
- the code: "New room code" asks first ("phones following ABC234 will stay on it"), then reloads the page under the
  new code (`?session=` replaced) and stores it;
- the table lists a "Depth of anaesthesia" device as "Not available yet" if one ever says `show:'depth'` (it cannot
  today: the picker offers no action);
- the openers: Learner monitor, Monitor, and (from R5) Defibrillator windows; "Ventilator" opens
  the Ventilator view in this window (`hrefOf('vent')`, as `panel/airway.ts:106` does);
- Instructor v2's "Room setup" opens `#/room`; its title no longer says "until the room setup has its own window".
**Acceptance:** the tests pass; `room-qr-tab-guard.e2e.ts` and `mobile-learner.e2e.ts` pass with only additions.
**Must not touch:** the join card's QR (`room.ts:68–135`) beyond its words; `host-guard.ts`. **Gate:** common, with
`@pme/demo`, plus `room-qr-tab-guard.e2e.ts`, `mobile-learner.e2e.ts`, `app-accessibility.e2e.ts` on both projects.
**CI load:** 1 run.

### R8a: The `ventilator` role and the `vent` message (3 h)

**Depends on:** R3; P3 merged (its grant, which R8c extends). **Files:** `packages/controller/src/protocol.ts` (`Role`
gains `'ventilator'`, `:27`; the hello's `pin` legal with `instructor` or `ventilator`, `:251`; `WireMessage` gains
`{kind:'vent'; to?: string; body: VentLinkBody}`), `src/guard.ts` (`KINDS`, `:99`; the hello rule, `:122–125`; the
`vent` body), `src/transport/relay-frames.ts` (`RELAY_CLOSE` unchanged; error codes unchanged);
`packages/ventilator/src/link/port.ts` (`LinkMsg` gains `{kind:'settings'; cfg: VentConfig}`, additive, `:22–27`);
tests in `test/guard.test.ts`, `test/types.test-d.ts`, `packages/ventilator/test/port.test.ts`.
**What the guard must check (the frames it drops today):** a `vent` body is one of the link kinds; a `cmds` body has
an integer `tick` and at most 4 commands [ENG: the link core emits at most 3 per tick, `core.ts:50–62`, plus one
spare], each of type `externalDrive` with `source: 'ventilator'`, `applyEvent` of kind `airway`, or `setTarget`; no
other command type rides `vent`; a `vent` body is at most 4 KB [ENG: one `cmds` with a VentFrame is ≈ 0.6 KB; a batch
of 5 ticks fits]; the sample rule (`FORBIDDEN_KEYS`, `guard.ts:24`) applies unchanged (a VentFrame carries one value
per signal per tick, not a sample array; the test proves it on a real frame).
**Tests first:** the guard accepts a real cockpit's `cmds`, `settings`, `lungState`, `clock`, `run` and `time` bodies
captured from `vent-hamilton.html`; refuses a `vent` with any other command type, an oversized body, a `pin` on a
viewer, a `ventilator` hello without a PIN. **Acceptance:** typecheck green; no behaviour change (nobody sends `vent`).
**Must not touch:** relay, sessions, the app. **Gate:** common, with `@pme/controller` and `@pme/ventilator`.
**CI load:** 1 run.

### R8b: The relay carries `vent` between the host and one granted ventilator (5 h)

**Depends on:** R8a. **Files:** `packages/controller/relay/server.ts`, `relay/README.md`; new
`test/relay/relay-vent.test.ts`; additions to `relay-hostile.test.ts`; one step in `check-relay.mjs`.
**What the relay must do (today it routes only the host's frames out and controllers' commands in,
`server.ts:5–8`, `:202–231`, and drops mirrored samples, `:251–253`):**
- admit a `ventilator` hello from another device in classroom mode (`server.ts:393`), PENDING as an instructor is,
  with its own single place beside `INSTRUCTOR_PLACES` (`server.ts:112`), under the same per-address PIN limits;
- the host's `grant` for it applies as for an instructor (`server.ts:232–246`);
- `vent` from a GRANTED ventilator goes to the host only; `vent` from the host goes to the socket named in `to` only;
  never to a viewer or an instructor, never cached, never in a lean copy; a pending or denied socket's `vent` is
  dropped with `forbidden`;
- at most 120 `vent` messages a second per socket each way [ENG: the cockpit sends one `cmds` per engine tick, 50 a
  second at ×1 and 400 at ×8 (`host-session.ts:195`); R8c batches to one message per 20 ms of wall time, so 50 a
  second at any speed, and 120 leaves room for `clock` and `settings`]; over that, the socket is closed with
  `too-many-tries`;
- the ventilator appears in R2's `devices` with `role: 'ventilator'`;
- the learners' traffic is unchanged byte for byte.
**Tests first:** the cases above on a fake clock; a learner's socket receives none of 1 000 `vent` frames; an
ungranted ventilator's `cmds` never reach the host. **Acceptance:** every relay test and `mobile-learner.e2e.ts` pass
unchanged; `check-relay.mjs` passes on a kit built from the branch with the new step (grant, `cmds` to the host,
`clock` back). **Must not touch:** `host-session.ts`, the app. **Gate:** common, with `@pme/controller`, plus
`check-relay.mjs`. **CI load:** 1 run.

### R8c: The host drives from a remote cockpit, and hands over on its loss (8 h)

**Depends on:** R8a, P3 merged; beside R8b. **Files:** `packages/controller/src/session/host-session.ts` (P3's grant
extended to `ventilator`, its own single place, option B within its own role only; `onVent(from, body)` for a
granted ventilator; the PIN change revokes it too); new `packages/ventilator/src/link/relay-port.ts` (a `LinkPort`
over a `ManagedTransport`, batching `cmds` per 20 ms wall); `apps/demo/src/app/views/vent.ts` (one cockpit at a
time — view, laptop window or device — sharing `link`, `unlink` and `handOver`, `:69–131`); `session.ts` (wire
`onVent`, `instructorPin` already from P6/P7's wiring); tests in `test/session/host-ventilator.test.ts`,
`packages/ventilator/test/relay-port.test.ts`, `views/vent-handover.dom.test.ts`.
**The mechanism:** the host attaches `attachMonitorToLink(session.linked(m), relayPort)` exactly as the view does, so
the engine stays the master clock (`clock` limits, the 75-tick lead, `stage-v-ventilator-link.md` decision 3) and the
frames are stamped `atTick` on the host; the host's mirror and `cockpit` notices run as for the view
(`host-session.ts:87`, `:195–209`), so every network follower holds while it drives (E128, Q4 ruled 5 November).
**E128 on a device:** the cockpit drives only while its page is visible; it sends `settings` on every change and
once a second; the host hands over to the engine's own ventilator with the last `settings` (the same `engineVentilation`
as `views/vent.ts:25–34`) when the page is hidden, closed, revoked, or silent for 1 s [ENG: 50 link messages a
second, so 1 s is 50 missed; the relay's heartbeat would take up to 20 s, too long for an unventilated patient].
**Tests first:**
- an ungranted ventilator's `vent` never reaches `attachMonitorToLink`; a granted one drives;
- the second granted ventilator takes over (the first is told), and an instructor phone's grant is untouched;
- silence of 1 s → hand-over with the last `settings`, exactly once, the patient ventilated throughout (the FU-11 H6
  rule, `views/vent.ts:124`, `:132`);
- the view and a remote cockpit never drive together: opening one hands the other over first;
- the same-browser viewer stays sample-identical while a remote cockpit drives (the mirror path);
- network followers hold while it drives and follow at once after the hand-over (`views/follower.ts:32–35`).
**Acceptance:** the tests pass; `vent-handover.dom.test.ts` and `vent-handover-phones.e2e.ts` pass unchanged; P3's
tests pass unchanged. **Must not touch:** the cockpit's mechanics (`packages/ventilator/src/mechanics.ts`,
`vent.ts`), what any Instructor press sends. **Gate:** common, with `@pme/controller`, `@pme/ventilator`,
`@pme/demo`. **CI load:** 1 run.

### R8d: The ventilator on its own screen: the device page, the laptop window, the picker card (6 h)

**Depends on:** R8b, R8c, R4, P7 (its PIN form, reused, not rebuilt). **Files:** `apps/demo/src/vent/hamilton-page.ts`
(a third link: `?join=CODE#/vent` over the relay after the PIN, beside `?link=` and `&via=parent`, `:10–12`);
`views/join.ts` (m5's Ventilator card gets "Show here", opening P7's PIN form, then the cockpit full screen);
`views/room.ts` (the opener "Ventilator in a new window", `vent-hamilton.html?link=<code>` over BroadcastChannel,
and the device row "Ventilator · driving / handed over"); `classroom.ts` (the address); a new
`apps/demo/e2e/vent-window.e2e.ts`.
**Tests first:**
- e2e, laptop window: the Room's opener opens the cockpit in its own window; while it is visible it drives; closing it
  hands over; the phones hold, then follow;
- e2e, a tablet over the in-process relay (phone viewport, `?e2e-remote` as `mobile-learner.e2e.ts` marks another
  device): picker → Ventilator → PIN → cockpit; a wrong PIN is refused; `context.setOffline(true)` for 5 s → the host
  hands over within 1 s of the silence and the patient stays ventilated; back online, the cockpit signs in again and
  takes over from the engine's settings;
- the PIN never appears in an address, the QR, `room.json` or a learner's frames.
**Measure (in the PR):** the frames' lateness on the host (frames stamped late by the offset rule) over the kit relay
on Wi-Fi with a real tablet, median and p95, at ×1 and ×4, on the owner's smoke; in CI only loopback.
**Acceptance:** the e2e passes 3 of 3 on both engines; the validation performance gate (`validation-perf.html`) holds
with the laptop window open. **Must not touch:** the cockpit's mechanics and UI beyond the link choice. **Gate:** common,
plus the vent e2e files and `mobile-learner.e2e.ts` on both projects. **CI load:** 1 run, plus the validation
workflow.

### R9: The kit's launchers, CLASSROOM.md, CHANGELOG, roadmap (3 h)

**Depends on:** R1, R1b, R4, R5, R5b, R5d, R7, R8d. **Files:** `scripts/showcase/kit/start-classroom.command`
(`:6` "Phones may only FOLLOW" → "Phones follow; the instructor's phone commands only with the PIN" once P7 has
merged, else unchanged; `:100` "Monitor view, \"Phones\" (or the \"Phones\" button at the top right)" → "the Room
(Home → Start here)"; a line that the room code is kept on this computer for this address), the same in
`start-classroom.cmd` (printable ASCII only, `scripts/showcase/kit-launchers.mjs:15–17`), `kit/read-me-first.txt`
(`:18`); `docs/showcase/CLASSROOM.md` (new sections "Room setup", "What each screen can show", "The room code";
`:108–116` the QR moment gains the picker); `CHANGELOG.md` (Unreleased); `docs/roadmap/v1.0-remaining.md:43` (the row
states what shipped and what waits: IABP, the defibrillator choice); CLASSROOM.md also gains "The ventilator on its
own screen" (the PIN, and that every phone holds while it drives).
**Tests first:** `kit-windows.test.ts` still passes (ASCII, CRLF); the docs-honesty tests (`@pme/validation`) pass;
every sentence added names a control that exists on main. **Acceptance:** a kit built from the branch shows the new
launcher lines. **Must not touch:** product code. **Gate:** `@pme/validation` docs tests, `check-relay.mjs` on the
built kit. **CI load:** 1 run.

### R10: End to end, measurements (5 h, last)

**Depends on:** R1–R7, R1b, R8a–R8d. **Files:** new `apps/demo/e2e/room-and-instruments.e2e.ts`; a "Results" section
appended to this plan.
**Tests first (red against R3's head, green at the end):**
1. a phone scans the QR, the picker opens, one tap: the learner monitor follows; the Room lists it with a ping;
2. a second device picks Defibrillator: the Room says "Defibrillator", and its readout follows a charge;
3. a third device opens the picker: "Depth of anaesthesia" reads "Not available yet" and cannot be chosen;
4. the laptop's page is closed and the app opened again at its bare address: same code; all three devices follow
   again within 15 s [ENG: the follower's back-off plus one heartbeat] without a new scan, and the Room keeps their
   names;
5. a device's Wi-Fi drops (`context.setOffline(true)` for 15 s): its row goes Weak then disappears, the status box
   says so, and it comes back;
6. a learner phone's captured frames (`page.on('websocket')`) never contain `devices`, another device's `show`, a
   `vent` message, or a PIN;
7. a fourth device signs in as the Ventilator: the three followers hold, the Room says "Ventilator · driving"; the
   ventilator device closes: the hand-over lands and the three follow again.
**Measure:** a learner phone's bytes per minute at ×8 with and without R2's `devices` frame (learners' copy: equal);
the host's `peers` frame size with 30 devices; the ping on the kit relay over real Wi-Fi (median, p95) on the owner's
smoke, not in CI.
**Acceptance:** every case passes on both engines, three runs in a row. **Must not touch:** source outside test
files, except fixes found here, each named in the PR. **Gate:** common, plus the new e2e and `mobile-learner.e2e.ts`
on both projects. **CI load:** 1 run.

## 8. What this stage absorbs from, builds on, and leaves to the peer-role plan

| Peer piece | State at 8d79f188 | This stage |
|---|---|---|
| P0–P2, P4, P5 | on main | Builds on them: the `instructor` role and its relay routing exist; R2 reports `granted` per device from the relay's flag (`server.ts:58`) |
| P3 (host verifies the PIN) | draft, `feat-peer-p3` 1b191180 | Builds on it, and only after it merges: R8c extends P3's grant to the `ventilator` role (its own place, option B within that role only) in `host-session.ts`, the one piece here that touches that file. R7's instructor row reads only what the relay knows; the denial count and "taken over" are P3's, shown by P7 |
| P6 (view feed, note command) | unbuilt | Leaves it entirely. No instrument needs the feed |
| P7 (the phone's way in, the Room page) | unbuilt | **Split.** P7 keeps: the PIN form and its states in `views/remote.ts`; the PIN behind press-and-hold, "change PIN", in the Room's `#room-instructor` slot (R7 leaves it empty); the instructor's address builder in `classroom.ts`; its CLASSROOM.md section. This stage absorbs: the instructor phone's ROW in the device table (R7, from R2's `devices`), and the way in (R4's picker entry, which opens P7's address). P7's second QR (`instructor-peer-role.md:478–479`) is dropped (§4 D4). Whichever of R7 and P7 merges second rebases on the other; recommended order R7 then P7 |
| P7's PIN form | unbuilt | R8d reuses it for the ventilator device; it is not rebuilt. On a new origin (R1b) the PIN is drawn again: a secret is never written to `room.json` |
| P8 (instructor e2e, kit check) | unbuilt | Leaves it. Its cases enter by P7's address directly; after R4 the picker is one more way in, covered by one case in R4's dom test, not by P8 |
| R24 (the phone remote's layout) | unbuilt, owner points open (`research/00-orchestrator-rulings.md:2694`) | Leaves it |

No duplicate work: the peer plan's P7 file list (`instructor-peer-role.md:473–484`) and this plan's R4/R7 overlap in
`views/room.ts` and `classroom.ts` only, and the split above gives each change one owner.

## 9. Partition, critical path, merge order, CI load, dependencies out of scope

```
R0 ─► R5a ─► R5b ─► R5 ─► R5d ──────────────────┐
R3 ─┬─► R4 ───────────► R5                      │
    ├─► R5c ─────────────────► R5d              │
    ├─► R2 ─────────────────► R7 ───────────────┤
    └─► R8a ─┬─► R8b ──────┐                    ├─► R9 ─► R10
   [P3 merged]─┴─► R8c ────┴─► R8d ─────────────┤
   [P3 merged] ──────────────► R5d              │
   [P7 merged] ──────────────► R8d              │
R1 ─► R1b ─────────────────► R7 ────────────────┘
```

- **Critical path:** R0 (2) → R5a (6) → R5b (4) → R5 (5) → R5d (6) → R9 (3) → R10 (5) = **31 h**. R5d also waits on
  P3's merge (a ready draft) and on R8c (same file, `host-session.ts`). The ventilator path, R3 → R8a → R8c → R8d → R9
  → R10 (27 h), runs beside it and waits on P3 and P7 (5 h, unbuilt, after P3; it can run beside R8c). R5b does not
  wait for R7: it puts its choice in a card of today's Room page, and R7 rebases over it.
- **Parallelism:** at most three executors: {R0, R1, R3} first; then {R5a, R4, R8a}; then {R2, R5c, R1b}; then
  {R5b, R8b} and R8c once P3 is in; then {R5, R7, R8d}; then R5d.
- **Merge order:** R0, R3, R1, R5a, R4, R8a, R1b, R2, R5c, R8b, R5b, (P3), R8c, R5, R5d, R7, (P7), R8d, R9, R10.
  R5b, R5, R5d, R7 and R8d touch `views/room.ts` or the follower pages; R4, R5 and R8d touch `join.ts`; R1b,
  R2, R5c and R8b touch `relay/server.ts`; R8c and R5d touch `host-session.ts`; R5d touches `record.ts`, which the
  Debrief 2 plan's D1–D5 also change (coordinate: the later one rebases); each rebases on the one before.
- **CI load:** 18 PRs, one full CI run each (build with the kit relay smoke test, renderer, e2e on
  chromium and webkit, the slow-test matrix: `.github/workflows/ci.yml:9`, `:48`, `:105`, `:195`), plus reruns of a
  rebased head; R5a, R8c and R8d also run the validation workflow. Four new e2e files (`room-code.e2e.ts`,
  `vent-window.e2e.ts`, `learner-defib.e2e.ts`, `room-and-instruments.e2e.ts`) and new cases in three existing ones; no new CI job.

**Effort**

| Piece | h (est.) |
|---|---|
| R0 baseline, defibrillator-profile measurement | 2 |
| R1 persistent room code | 4 |
| R1b the code survives the kit's port change | 4 |
| R2 relay ping and `devices` | 5 |
| R3 `show` and `device` on the hello | 2 |
| R4 picker (mock-up m5), instrument hashes | 7 |
| R5 defibrillator window | 5 |
| R5a defibrillator model in the engine's device layer | 6 |
| R5b Room setup's defibrillator choice; panel energies | 4 |
| R5c learner `defib` role, guard, relay allow-list | 4 |
| R5d host applies learner presses; record; window buttons; e2e | 6 |
| R7 Room setup | 7 |
| R8a `ventilator` role, `vent` message, guard | 3 |
| R8b relay carries `vent` | 5 |
| R8c host drives from a remote cockpit; hand-over | 8 |
| R8d ventilator device page, laptop window, picker card | 6 |
| R9 kit and docs | 3 |
| R10 end to end, measurements | 5 |
| **Total** | **86 h** in 18 PRs, plus ≈ 10 h of review (46 h before Q3–Q6; 72 h after Q3/Q4; 92 h after Q5/Q6; R6's 6 h removed by Q7) |

**Dependencies out of this plan (new models or new wire)**
- **IABP console:** a balloon-pressure waveform and trigger/timing marks are not computed
  (`l2/circ/devices.ts` models the balloon's flow into the aorta, not its own pressure); an app control for
  `device iabp`; a renderer. A physiology piece first, then a renderer, then an instrument entry here.
- **Learners' phones that follow the ventilator's patient instead of holding:** the relay still drops the mirrored
  frames (`server.ts:251–253`), so a network follower holds while the cockpit drives (E128, kept by Q4's ruling).
  Sending the frames to every phone is another change, not ruled.
- **The department's own defibrillator model, as a skin** (Q6's second half, ruled 5 November evening): a skin with
  its own sourced defibrillator block (energies, charge times, ladder), then one line in R5a's `DEFIB_MODELS`; on the
  roadmap (`docs/roadmap/v1.0-remaining.md`).
- **The pacer apart from the skin:** R5a decoupled the defibrillator only; the owner ruled on 6 November (research/41
  row 58) that the pacer follows the model too: its default rate and output, ranges, PAUSE behaviour and HR dashes
  while pacing are the model's (`DEFIB_MODELS`), and R0's last divergence is an equality (scratch/room-plan-gate/r58.json).
- **The IABP (Q8 ruled 5 November: not in this stage)** is on the engine roadmap as above.
- **Depth of anaesthesia (Q7 ruled 5 November):** an EEG model and the device algorithms, §9a.

## 9a. Depth-of-anaesthesia devices: what they need

**Ruling (Q7, 5 November).** No single "BIS-like" screen. Each depth monitor the room may gain must be selectable and
must work from its true mechanism; all of them read the EEG. The engine's depth index is computed from effect-site
concentrations through an interaction model, with no EEG (`packages/engine-core/src/l2/neuro/depth.ts:1–7`), so it
cannot stand in for any of them. The EEG model and the per-device algorithms are **an engine stage of their own, to be
planned separately under the coupling backlog**; this stage keeps only the empty slot (R4, R7).

**Source.** Miller's Anesthesia, 10th ed. (2025), Chapter 36, "Monitoring the Brain's Response to Anesthesia and
Surgery" (Sleigh, Gaskell, Hight), printed pp. 1133–1152 (the book's table of contents,
`library/sources/tocs/miller-10th-toc.pdf`: Ch. 36 at 1133, Ch. 37 at 1153). The library's chapter file named for
Chapter 35 (`library/sources/miller-10th-2025/Ch35 - Neurophysiologic onitoring.pdf`) holds Chapter 36 as its PDF
pages 40–63, so the pages below were read there with PyMuPDF; the printed page numbers are the book's. Chapter 23
("Intravenous Drug Delivery Systems") and Chapter 68 ("Ambulatory Anesthesia") name the devices; Chapter 35 has the EEG
patterns by depth. Chapter 36 is the right source for the EEG; it states that the indices' algorithms "usually remain
a proprietary secret" (p. 1147), so a device's own method is "to be sourced" from its maker's documentation or the
validation literature wherever Miller does not give it.

| Device (owner's list, and those Miller names) | What it derives from the EEG | Scale | Source |
|---|---|---|---|
| BIS (Bispectral Index, Medtronic) | A weighted combination of EEG features (Miller: band powers, burst suppression and other components, details proprietary); a burst-suppression ratio, with a "QUAZI" sub-algorithm for the forme-fruste suppression that feeds the index; artefact detection and rejection | 100 awake to 0, target 40–60 in the trials | Miller 10e pp. 1140 (suppression ratio, QUAZI), 1146 (history, artefact rejection, burst-suppression detection), 1147 (features proprietary; a BIS of 50 differs between patients, awareness at 40–90), 1149 (Table 36.4, BIS 40–60 trials); scale range p. 2148 (Ch. 68). Feature definitions beyond this: to be sourced |
| Entropy (GE: State Entropy SE, Response Entropy RE) | Spectral entropy of the EEG (SE) and of a band reaching into the EMG range (RE) | to be sourced | Named, with SE and RE, Miller 10e p. 637 (Ch. 23); spectral entropy correlating with propofol effect-site concentration as BIS does, p. 516 (Ch. 21); bands and scale: to be sourced |
| Narcotrend (MonitorTechnik) | to be sourced (Miller names it only) | to be sourced | Named, Miller 10e p. 637 (Ch. 23), p. 2148 (Ch. 68) |
| SedLine / Patient State Index (Masimo) | to be sourced (Miller reports PSI pharmacodynamics, not its method) | PSI values of 29–68 at the clinical end points studied | Named p. 637; PSI-1/PSI-2 C50 and PSI50 values for propofol and sevoflurane, pp. 633–635 (Ch. 23, Kuizenga 2019; Fig. 23.10) |
| qCON (Quantium Medical / CONOX), with qNOX | to be sourced (Miller names it; qNOX as a nociception index) | to be sourced | Named p. 637 (Ch. 23); a qCON/qNOX study in Ch. 68's reference list |
| NeuroSENSE (NeuroWave) | to be sourced | to be sourced | Named p. 637 |
| SNAP II (Stryker) | to be sourced | to be sourced | Named p. 637 |
| BARM Function Brain Monitor (Cortical Dynamics) | to be sourced | to be sourced | Named p. 637 |
| Spectral edge frequency (any EEG monitor) | The frequency below which a set share of EEG power lies | Hz | Miller 10e p. 1146 (tracks anaesthesia "quite well", sensitive to eye-movement artefact awake) |

**What a simulated EEG must produce for these algorithms to be honest** (Miller 10e, Ch. 36 unless noted). A
broadband ("1/f") spectrum whose slope steepens with dose (p. 1139), carrying oscillations in the classic bands —
slow wave 0.1–2 Hz, delta 0.5–4, theta 4–8, alpha 8–12, beta 12–30 Hz (Table 36.1, p. 1140). By state: awake,
posterior alpha with eyes closed; at induction a "beta buzz" of about 15–25 Hz, then loss of posterior alpha and
frontal alpha appearing ("anteriorization", p. 1138); at surgical depth the alpha–delta pattern, with beta and gamma
power falling (p. 1139); deeper, burst suppression — suppressed stretches under 5 µV alternating with high-amplitude
bursts, the suppressions lengthening with dose to an isoelectric EEG, read by every monitor as a suppression ratio
over a 30–60 s window, preceded by a forme-fruste state of brief drops in power above ~2 Hz (pp. 1139–1140; the
patterns by agent, Ch. 35 p. 1107); at emergence, slow and delta power falling and the alpha peak moving to higher
frequency before it fades, beta rising, with hysteresis between induction and emergence (p. 1142). By drug, not one
pattern: sevoflurane loses power above ~20 Hz (pp. 1142–1143); propofol gives more pronounced alpha and delta and
rarely a theta peak (p. 1143); nitrous oxide changes the EEG little, but abrupt changes in its concentration give
short-lived large delta waves (p. 1144); ketamine decreases alpha and adds theta and gamma, at hypnotic doses huge slow
waves with gamma bursts, and "spurious elevation" of the indices (p. 1144); dexmedetomidine gives sleep-like spindles
(p. 1144); opioids alone, at high concentration, increase delta power (pp. 1144–1145). Age: low-amplitude EEG in
older patients gives high index values (Table 36.3, p. 1148). And the artefacts the devices must reject or be fooled
by: scalp EMG at induction and emergence (p. 1142), whose loss under neuromuscular block drops the BIS in an awake
subject (p. 1148, the "awake paralysis" false negative); eye blinks and eye movements, electrocautery, and ECG
spikes (p. 1146, Fig. 36.10). A simulated EEG that cannot produce each of these from the engine's drug and
physiology state would make every device on top of it a fitted display, which the project's rule forbids.

**What the engine stage will need to decide (not decided here):** the EEG's source signal (a generative spectral
model per state and agent, at the frontal montage the devices use); how it couples to the existing effect-site
concentrations, the neuromuscular block and stimulation; and, per device, an algorithm that is either the maker's
published method or, where it is secret, stated as an approximation and labelled so on the screen.

## 10. Questions for the owner (each with the default the plan uses if no answer comes)

1. **The picker on scan. RULED 5 November: A.** The QR opens the picker, Learner monitor first and preselected, one
   tap; the phone remembers its last choice as the preselected one. The picker follows mock-up m5 (R4). (Option B, the
   learner monitor at once with a "Change" button, was not chosen.)
2. **Room setup. RULED 5 November: A.** The Room page becomes the "Room setup" window (join, devices, windows, room
   code, remembered layout), and Instructor v2's "Room setup" opens it. (Option B, a page of its own beside the Room,
   was not chosen.) Still the plan's default, not ruled: the monitor style stays in Settings with a link, the probes
   are shown read-only, and "reset the room" forgets the layout and names only.
3. **The room code's lifetime. RULED 5 November: A.** Kept until "New room code" is pressed; reloads, restarts and
   the next day keep it (R1), and so does the kit's move to another port when 8650 is busy (R1b). A learner from an
   earlier class who kept the address can follow again, never command.
4. **The ventilator in its own window. RULED 5 November: A, build it.** On a second screen of the laptop or on a
   tablet, with a new wire for its frames (R8a–R8d), signed in with the instructor's PIN. Your E128 rule stays: while
   it drives, every phone holds ("The ventilator is on the main screen") for the whole case. This includes any
   defibrillator or depth screen on another device, since they follow the same way; screens of the laptop itself keep
   following. (Not built by default before: the Ventilator view only.)
5. **The defibrillator window. RULED 5 November: B.** Learners press Charge and Shock on the window and the host
   applies them (R5c, R5d): a `defib` role admitted by the room code, exactly those two commands, the room's energy,
   the device refusing a shock without a charge, every press recorded under the device for the Debrief. (Option A,
   display only, was not chosen.)
6. **Which defibrillator does the room have? RULED 5 November: B.** The instructor picks the model in Room setup,
   apart from the monitor skin, and the host adopts its energies (R5a, R5b). **Second half RULED 5 November
   (evening):** the window is generic now (energy select, charge, shock, sync; Zoll-like values, the plan's
   fallback), and R5a's model list ships with the generic model only; your department's actual machine is added later
   as a skin (§9, roadmap), and Room setup's line "Your department's machine: not named yet" stays as its hook. Pads
   and paddles are not modelled by the engine today, so the window shows no such control.
7. **Depth of anaesthesia. RULED 5 November.** No single "BIS-like" screen: each depth monitor (BIS, Entropy,
   Narcotrend, SedLine/PSI and others) must be selectable and work from its true mechanism, which needs a simulated
   EEG. R6 leaves this stage; the slot stays "Not available yet" (R4, R7); the EEG model and the device algorithms
   are an engine stage of their own (§9a).
8. **IABP. RULED 5 November: A.** Not in this stage; engine roadmap (§9).
9. **When the room reads "Weak". RULED 5 November: A.** A device whose last ping is over 300 ms, or that missed one
   10 s heartbeat (the relay closes it at the second). 300 ms is an engineering choice, stated as such: a follower at
   that delay still mirrors commands, but a ping that high on a room's Wi-Fi is worth a look. Not a clinical threshold.
10. **Device names kept across days. RULED 5 November: A.** Under a random key each device keeps in its own browser
    (never leaves the room's network); "Forget the room" clears them.

**No open line:** every question is ruled; the department's own defibrillator is a later skin (Q6, §9).

## 11. Self-review against the codebase (8d79f188)

Every claim about today's code, with the line it was read at:

| Claim | File and line |
|---|---|
| Room page: QR, code, two ways, connected table; "no ping for rc.4"; nothing remembered | `apps/demo/src/app/views/room.ts:1–10` |
| Room logs peers from hellos and commands | `views/room.ts:53–59` |
| "before this page opened" rows from the relay count | `views/room.ts:178–180` |
| Learner window opened with `noopener` for its own process | `views/room.ts:146–147` |
| Status levels and the 2 s rule; no RTT measured | `apps/demo/src/app/room-status.ts:1–13`, `:57–65` |
| `?join=` → phone learner, `data-learner=phone` | `apps/demo/src/app/main.ts:50–55` |
| Follower forced to `#/monitor` | `main.ts:72` |
| Host code from `?session=` via `chooseHostSession`; code written back into the URL | `main.ts:95`, `:104–108` |
| Code pill "Remote" opens `#/remote` | `main.ts:216` |
| Code = `?session=` or new | `apps/demo/src/app/session.ts:145` |
| Host on the relay, `followers` from `peers` frames | `session.ts:211–221` |
| `RoomKeep` (probes, cuff) and `roomKeep()` | `session.ts:28–33`, `:431–438` |
| Host guard: ask other tabs, hand-over | `apps/demo/src/app/host-guard.ts:94–100`, `:103–120` |
| "Room setup" opens Settings | `apps/demo/src/app/teach2/begin.ts:97–99` |
| Settings' monitor style | `apps/demo/src/app/views/settings.ts:24` |
| Monitor list incl. Zoll-style and LIFEPAK-style defibrillators | `apps/demo/src/app/site.ts:32–40` |
| `store` wrapper, `pme.` prefix | `apps/demo/src/app/store.ts:2–17` |
| Routes and host routes | `apps/demo/src/app/router.ts:5`, `:14`, `:18` |
| Rail entries | `apps/demo/src/app/rail.ts:42–48` |
| QR address and target | `apps/demo/src/app/classroom.ts:42–46`, `:56–68` |
| Remote: same-browser; relay with `?relay` | `apps/demo/src/app/views/remote.ts:1–5`, `:56–58` |
| Pairing page on the host | `views/remote.ts:20–36` |
| Monitor view's "Phones" opens the Room | `apps/demo/src/app/views/monitor.ts:22–23` |
| "Open the ventilator" link | `apps/demo/src/app/panel/airway.ts:106` |
| Follower: contract, ventilator hold, frames dropped on the relay | `apps/demo/src/app/views/follower.ts:1–35`, `:18–21`, `:32–35` |
| Phone liveness 12 s | `views/follower.ts:47–50` |
| Portrait only over the relay | `views/follower.ts:101` |
| Same-browser style channel; phone wears the host's style | `views/follower.ts:137–145`, `:181` |
| Viewer hello | `packages/controller/src/session/viewer-sync.ts:168` |
| Roles incl. `instructor`; hello `pin`; `grant` | `packages/controller/src/protocol.ts:27`, `:251`, `:254` |
| `INSTRUCTOR_COMMANDS` | `protocol.ts:299–302` |
| Session code alphabet; `newPeerId` | `protocol.ts:327–346` |
| Guard: hello checks role and pin only | `packages/controller/src/guard.ts:122–125` |
| Relay: instructor pending/granted; `granted` flag | `packages/controller/relay/server.ts:7–8`, `:58` |
| Relay: peers frames, `instructors` host-only | `server.ts:178–179` |
| Relay: hello forwarded raw to host | `server.ts:205–212` |
| Relay: `tellHost` | `server.ts:293–295` |
| Relay: id holder ping before admitting a second socket | `server.ts:360–382` |
| Relay: classroom role rule | `server.ts:393` |
| Relay: pong listener; sweep ping + `hb`; terminate after a missed pong | `server.ts:467`, `:477–486`, `:120` |
| Relay frames incl. `instructors?` | `packages/controller/src/transport/relay-frames.ts:2–6` |
| Host peers keyed by transport (P1) | `packages/controller/src/session/host-session.ts:110` |
| Instructor session options (P5) | `packages/controller/src/session/controller-session.ts:56–58` |
| P3 options on its branch | `feat-peer-p3:packages/controller/src/session/host-session.ts:74–78` |
| `setSkin` sends `device monitor skin` to the window's engine | `packages/renderer/src/mount.ts:522` |
| Device profile from the skin; defib fallback | `packages/engine-core/src/l3/device-layer.ts:91–100`, `:175–181` |
| Fallback defibrillator = Zoll values | `packages/engine-core/src/l3/defib-pacer/defib.ts:11`; `packages/skins/src/data/skins/zoll-like.json:27` |
| LIFEPAK 200 J; Saadat has no defibrillator | `packages/skins/src/data/skins/lifepak-like.json:27`; `saadat-like.json:241` |
| Defibrillator readout | `packages/renderer/src/device-ui.ts:348–356` |
| Depth index is BIS-like, not BIS | `packages/engine-core/src/l2/neuro/depth.ts:1–7` |
| Depth device on/off; `di`, `sr` ids | `packages/engine-core/src/types-neuro.ts:45`, `:47` |
| BFA module tile, 5 s staleness | `packages/renderer/src/numerics-neuro.ts:1–4`, `:16–20` |
| BFA on Philips-like only | `packages/skins/src/data/skins/philips-like.json:19` |
| Depth turned on only by the developer page | `apps/demo/src/dev/depth-neuromuscular.ts:83`, `:86` |
| IABP model, command, output | `packages/engine-core/src/l2/circ/devices.ts:1–32`; `types-circ.ts:18`, `:32`; `l2/hemo/pipeline.ts:547` |
| No IABP control in the app | `apps/demo/src/app/glossary-data.ts:111`, `:303` (the only matches) |
| Ventilator view: E128, frame port, hand-over reads the iframe | `apps/demo/src/app/views/vent.ts:4–9`, `:60–66`, `:156–159` |
| Cockpit link over BroadcastChannel in the same browser | `apps/demo/src/vent/hamilton-page.ts:1–3`, `:12` |
| Census shapes; finer key | `apps/demo/src/app/teach2/census.dom.test.ts:44`, `:55–58` |
| Launcher: port range, URL, stale words | `scripts/showcase/kit/start-classroom.command:6`, `:19`, `:75–76`, `:91`, `:100` |
| `.cmd` must be printable ASCII | `scripts/showcase/kit-launchers.mjs:15–17` |
| QR moment in the run sheet | `docs/showcase/CLASSROOM.md:108–116` |
| Roadmap rows | `docs/roadmap/v1.0-remaining.md:43`, `:51` |
| Inventory rows | `research/40-post-demo-inventory.md:44`, `:52`, `:265` |

Disagreements found while reading:
1. The brief says BIS "needs an engine signal and a renderer". The engine already computes a BIS-like index and SR
   (`depth.ts`), and the renderer has its tile (`numerics-neuro.ts`); but that index has no EEG behind it, and the
   owner ruled (Q7) that a depth screen must come from a real device's mechanism on a simulated EEG (§9a). The IABP
   needs a new model too (§9).
2. The kit launcher tells the presenter to find the QR under "Monitor view, Phones (or the Phones button at the top
   right)" (`start-classroom.command:100`); the top right carries "Remote" and the code (`main.ts:216`), and the QR
   is on the Room. R9 rewrites the line.
3. `room-status.ts:19` says "an instructor phone reads 'Remote' (P7 gives it its own row)": R7 gives it the row, not
   P7 (§8).
4. The peer plan puts a second QR on the Room (`instructor-peer-role.md:478–479`); the owner's rulings give one QR and
   a device-side choice (§4 D4).
5. A defibrillator style on a follower changes that follower's device profile (`mount.ts:522`): the "defib window"
   of the brief is not just a skin, and R0 measures it first.
6. The ventilator link's own header says it "deliberately does NOT go through the controller's HostSession (roles,
   auth, samples guard)" (`packages/ventilator/src/link/port.ts:3–4`). Q4's ruling reverses that for a device off the
   laptop: R8a–R8c put it through the guard, the relay's grant and the host's PIN check.
