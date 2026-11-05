# Room and instruments (E124): room set-up on the start page, roles and PIN, one instrument per screen — Implementation Plan

**STATUS: DRAFT FOR REVIEW 2026-11-05.** Written by a planning executor from brief 18 of the post-demo set. Nothing in
it is ruled until the owner answers "Questions for the owner" (§10) and the orchestrator reviews the pieces. No product
code, test, card or kit file was changed while writing it.

**Amended 2026-11-05 (owner's first rulings on this plan):** Q1 and Q2 are **ruled 5 November** (§10): the QR opens
the picker, Learner monitor first and preselected, one tap; Room setup is the Room page grown. The picker's design
source is the owner's mock-up m5 "instrument cards" of 26 October (`research/00-orchestrator-rulings.md:2086–2087`:
"the DEVICE that scans the QR opens the instrument picker (mockup 5)"), copied into this branch so it survives the
disposable folder it came from: `docs/plans/room-and-instruments/mockup/` (`m5-instruments-owner.html`, `.png`,
`instruments.css`, `instruments.js`, and `base.css`, which the page links). R4 follows its layout and wording, with
the exceptions listed in R4. Q3 to Q10 stay open.

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
defibrillator window, a depth-index screen, the instructor's remote), and shows the instructor a device table with a
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
  upright), the monitor (landscape), the defibrillator window (`#/defib`), the depth-index screen. The ventilator stays
  on the instructor's computer (§3.4). The IABP is a dependency (§9).
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
  computes nothing the host did not command. No instrument sends a command.
- **A screen shows something the engine does not compute.** No EEG trace, no SQI, no EMG bar, no balloon-pressure
  wave, no defibrillator value other than the one the engine's device layer holds.
- **A role is granted without the PIN.** The picker's "Instructor remote" leads to P7's PIN form; the room code alone
  admits followers only (`packages/controller/relay/server.ts:393`, the classroom rule).
- **A new wire format where today's frames carry it.** The instrument rides the existing `hello` as an optional field
  (§4 D1); the ping rides the existing host-only `peers` frame (§4 D2). No new `kind`, no new relay frame.
- **A fitted number or an estimate shown as a measurement.** The ping is measured by the relay; every threshold is
  marked [ENG] with its reason.

## 3. Every item mapped to what exists

### 3.1 The role picker vs today's `?join=` hello

| Today (8d79f188) | Where | What changes |
|---|---|---|
| The QR carries `http://<laptop>:<port>/?join=<CODE>` | `apps/demo/src/app/classroom.ts:42–46` (`learnerUrl`), `:56–68` (`qrTarget`) | The QR's address gains `#/pick` (R4). `?join=CODE` without a hash keeps today's behaviour, so the 11 e2e files and the two kit scripts that open it (`grep -rl "join=" apps/demo/e2e scripts/showcase`) are unchanged |
| A `?join=` page is a phone learner monitor at once: `data-learner=phone`, portrait follower | `main.ts:50–55`, `:71–84`; `views/follower.ts:101` (`portrait: !!net`) | The picker is a page before the follower; `#/monitor` stays the learner monitor; new hashes pick the other instruments |
| A follower forces `#/monitor` | `main.ts:72` | Kept for unknown hashes; the instrument hashes (`#/monitor/wide`, `#/defib`, `#/depth`) are allowed |
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
| The kit opens `http://127.0.0.1:<port>/?relay#/` and tries ports 8650–8659 | `scripts/showcase/kit/start-classroom.command:19`, `:75–76`, `:91` | localStorage is per origin: if 8650 is busy, the next port is a new origin and a new stored code. R1's Room says so; R9's launcher text says so |

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
| Depth index screen `#/depth` | `di` and `sr`, a BIS-LIKE index, "NOT a BIS algorithm" (`packages/engine-core/src/l2/neuro/depth.ts:1–7`; ids at `types-neuro.ts:47`), published at 1 Hz while the depth device is on (`{device:'depth', action:'on'|'off'}`, `types-neuro.ts:45`) | the BFA tile, a module tile drawn only while the device publishes (`packages/renderer/src/numerics-neuro.ts:1–4`, `:16–20`); on `philips-like` only (`packages/skins/src/data/skins/philips-like.json:19`) | New route showing `di`, `sr` and the window's own trend of `di`. **Gap:** no app control turns the depth device on; only the developer page does (`apps/demo/src/dev/depth-neuromuscular.ts:83`, `:86`). R6 adds the control. No EEG trace: the engine computes none |
| Ventilator | the cockpit computes its own mechanics and sends 50 frames a second into the engine (`docs/plans/stage-v-ventilator-link.md`, decision 3) | `views/vent.ts`, an iframe linked by a direct frame port (`views/vent.ts:156–159`); the cockpit can also link over BroadcastChannel `pme-vent/<session>` in the same browser (`apps/demo/src/vent/hamilton-page.ts:1–3`, `:12`) | **On this computer only.** Its frames are samples: the relay drops them (`views/follower.ts:18–21`) and an instructor may not send `externalDrive` (`instructor-peer-role.md:132`). While it drives, every network follower HOLDS (`views/follower.ts:32–35`). The Room's opener opens the Ventilator view (R7); a ventilator in its own window is R8, after Q4 |
| IABP | the balloon exists in the circulation (`packages/engine-core/src/l2/circ/devices.ts:1–32`; command `device iabp start/stop/set`, `types-circ.ts:18`; output ratio and augmentation, `types-circ.ts:32`, `l2/hemo/pipeline.ts:547`) | none; no app control sends `device iabp` (`grep -rn iabp apps/demo/src/app` finds only glossary rows, `glossary-data.ts:111`, `:303`) | **Out** (owner: "IABP later"). A console needs a balloon-pressure wave and trigger marks the engine does not compute: a new model, §9 |
| Instructor remote | P2/P5 on main; P3 draft | `views/remote.ts` (today's panel) | The picker's entry opens P7's form (§8) |

### 3.5 "Room setup" vs today's pages

| Today | Where | What changes |
|---|---|---|
| Instructor v2's "Room setup" opens Settings | `teach2/begin.ts:97–99` | It opens the Room page (R7) |
| The rail's "Room" page | `apps/demo/src/app/rail.ts:44`; `router.ts:5`, `:14`, `:18` | It is the "Room setup" window (Q2): join, devices, this computer's windows, room code, remembered layout |
| Settings holds the monitor style (site profile) | `views/settings.ts:24` | Unchanged; Room setup shows the style and links to it (Q2) |
| "Save and restart" keeps probes and cuff (`RoomKeep`) | `session.ts:28–33`, `:431–438` | Unchanged; Room setup shows the probes attached now, read-only (Q2) |
| "Open on this computer": learner monitor window, a remote | `views/room.ts:145–156` | Adds Monitor, Defibrillator, Depth index windows and the Ventilator view (R5, R6, R7) |
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
- **D5. A defibrillator window may only wear a style whose device profile equals the host's.** R0 measures whether a
  follower wearing another skin stays sample-identical through charge, shock and pacing at the defaults. Until the
  owner answers Q6: Zoll-style when the host's skin has no defibrillator or is Zoll-like (the fallback is Zoll's
  values, `defib.ts:11`); LIFEPAK-style only when the host is LIFEPAK-like. Any other pairing is not offered.
- **D6. Instruments are display only.** A defibrillator window has no Charge or Shock button; the depth screen has
  no On button. The instructor commands from the laptop (or, after P7, the PIN-granted phone). Learner presses on an
  instrument would be a commanding role for viewers (Q5).
- **D7. Hashes for the instruments.** On a follower page: `#/monitor` (today's; upright on `?join=`, landscape on
  `?follow=`), `#/monitor/wide` (landscape over the relay), `#/defib`, `#/depth`, `#/pick`. The same hashes work on
  `?follow=` (this computer) and `?join=` (the relay). `router.ts` `ROUTES` is the host's list (`router.ts:5`) and
  does not change: the follower branch of `main.ts` parses its own hashes.
- **D8. Remembered layout = names and expected instruments per device key.** `store` key `pme.roomLayout` on the
  laptop: `{ [device]: { name, show, lastSeen } }`, at most 64 entries [ENG: twice `--max-peers`' default of 60 is not
  needed; 64 covers a full room plus spares]. A device with a remembered key gets its name; a remembered device that
  is absent is a grey row "expected, not connected". Phones without a key (older builds) are "Phone n" as today.

## 5. Global constraints (every piece)

- `00-common-rules.md` applies: own worktree under `scratch/` on a branch from `origin/main`; never merge, tag,
  force-push or push gh-pages; one PR per piece, draft until its checks pass; `npx -y pnpm@9.15.9`; the executor's
  port range only; no owner identifier anywhere; no closing keyword before a `#number`; identity through
  `GIT_AUTHOR_*` / `GIT_COMMITTER_*` on every commit.
- **Tests first** in every piece: the failing test is committed before the code, and the PR body pastes both runs.
- **Must not touch (every piece):** `packages/engine-core`, `packages/skins`, the scenario format, the showcase
  cards (`apps/demo/src/app/showcase`), `packages/controller/src/session/viewer-sync.ts`, `host-session.ts` (P3's
  file), and what any Instructor press sends, except R6's one new control, named there.
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
starts. No Room UI here (R7 adds "New room code").
**Acceptance:** the tests pass; `reload-keeps-case.e2e.ts`, `room-qr-tab-guard.e2e.ts`, `host-guard.dom.test.ts`
pass unchanged. **Must not touch:** `host-guard.ts` logic, `session.ts`. **Gate:** common, with `@pme/demo`, plus the
three e2e files above on both projects. **CI load:** 1 run.

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
| Depth of anaesthesia | "BIS-style index with SQI and EMG, following the hypnotic effect-site concentration." | "BIS-like depth index and suppression ratio, from the hypnotic effect-site concentrations." The engine computes no SQI and no EMG value (`depth.ts:1–7`); the picture drops m5's "SQI 92 / EMG 28" and its EEG line. Shown only once R6 has merged |
| Intra-aortic balloon pump | "Timing, augmentation and the arterial trace with the balloon's effect." chip "Coming later", button disabled | As m5: chip "Coming later", no action (Q8; §9) |
| Defibrillator | "Rhythm strip, energy selection, charge and shock, pacing." | "Rhythm strip, energy, charging and pacing as the instructor sets them." Display only until Q5 is answered (§4 D6). Shown only once R5 has merged |
| Learner phones | "Each learner's phone follows the monitor; they tick what they noticed for the debrief." | "Learner monitor: this phone follows the patient monitor." No "tick what they noticed" control exists in the app (no such feature at 8d79f188) |
| (Instructor remote) | not in m5 | "Run the case from this phone. Needs the instructor's PIN." Shown only once P7 has merged; its action opens P7's PIN form |

m5's foot line "Last time in this room: … Reopen that layout" is a host-side feature: R7 (the remembered layout).
**Tests first:**
- dom: `#/pick` shows the m5 cards in m5's order, Learner monitor first, focused and preselected (Q1 ruled 5 November);
  Defibrillator and Depth of anaesthesia only once R5 and R6 have merged; "Instructor remote" only once P7 has merged,
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

**Depends on:** R0 (which styles), R4 (the follower's hash handling). **Files:** new `apps/demo/src/app/instrument.ts`
(pure: which skin an instrument wears given the host's style, per §4 D5), `instrument.test.ts`;
`views/follower.ts` (the defibrillator page: the instrument's skin, the host's `style` events change the theme only,
`:137–145`, `:181`); `views/room.ts` (the opener "Defibrillator in a new window", `?follow=CODE#/defib`, as
`:145–150`); `join.ts` (the entry).
**Tests first:**
- `defibSkin('saadat-like')` = `zoll-like`; `defibSkin('lifepak-like')` = `lifepak-like`; `defibSkin('philips-like')`
  follows R0's result (Philips has no defibrillator block in the profile: fallback, so Zoll-like);
- dom: the defibrillator window shows the energy and CHARGING / READY from its own engine at the same tick the host's
  readout does (`deviceText`), with no Charge or Shock control (§4 D6);
- a host style change to another monitor keeps the window on its defibrillator skin, or, if the new host style
  changes the allowed defibrillator (to LIFEPAK-like or back), switches with it;
- e2e (`learner-monitor-follows.e2e.ts`, a new case): a `#/defib` window on this computer and one over the relay show
  "120 J CHARGING" within one second of the host's charge.
**Acceptance:** the tests pass; R0's measurement holds (no beat drift beyond the learner monitor's). **Must not
touch:** `panel/defib.ts` and what it sends; `packages/renderer`. **Gate:** common, with `@pme/demo`, plus
`learner-monitor-follows.e2e.ts` and `mobile-learner.e2e.ts` on both projects. **CI load:** 1 run.

### R6: The depth-index screen `#/depth`, and its switch on the Devices sheet (6 h)

**Depends on:** R4. **Files:** new `apps/demo/src/app/views/depth.ts` (the page: `di`, `sr`, a trend of the window's
own `di` values; the staleness rule of `MODULE_TILES`, `numerics-neuro.ts:16–20`), `depth.dom.test.ts`;
`views/follower.ts` (the route); `panel/devices.ts` (one control: "Depth monitor on / off", sending
`device {device:'depth', action}`), `panel/devices.dom.test.ts`; `views/room.ts` (the opener); `join.ts` (the entry).
**Tests first:**
- dom: with the depth device on, the screen shows the index and SR as the engine publishes them; after 5 s without a
  value it reads "Depth monitor off" (the BFA tile's rule, `numerics-neuro.ts:16–20`), never a frozen number;
- the label is "Depth index (BIS-like)" (Q7), never "BIS" alone (`depth.ts:3`: not a BIS algorithm);
- the Devices control sends exactly `{type:'device', action:{device:'depth', action:'on'}}` and `off`; the census
  (`teach2/census.dom.test.ts:44`) is unchanged, its shape being `device`, and the review copy's finer key gains
  `device depth on/off` (`census.dom.test.ts:55–58`), named in the PR;
- e2e: on the MH card, the instructor turns the depth monitor on; a `#/depth` window over the relay shows the same
  index as the host's `measurement` within one second.
**Acceptance:** the tests pass; `INSTRUCTOR_COMMANDS` (`protocol.ts:299–302`) unchanged. **Must not touch:**
`packages/engine-core` (the index and its device are used as they are), any other Devices control. **Gate:** common,
with `@pme/demo`. **CI load:** 1 run.

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
  worst ping is over it or a device missed a heartbeat (Q9: [ENG] 300 ms and one missed 10 s heartbeat); Disconnected
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
- the openers: Learner monitor, Monitor, and (from R5, R6) Defibrillator and Depth index windows; "Ventilator" opens
  the Ventilator view in this window (`hrefOf('vent')`, as `panel/airway.ts:106` does);
- Instructor v2's "Room setup" opens `#/room`; its title no longer says "until the room setup has its own window".
**Acceptance:** the tests pass; `room-qr-tab-guard.e2e.ts` and `mobile-learner.e2e.ts` pass with only additions.
**Must not touch:** the join card's QR (`room.ts:68–135`) beyond its words; `host-guard.ts`. **Gate:** common, with
`@pme/demo`, plus `room-qr-tab-guard.e2e.ts`, `mobile-learner.e2e.ts`, `app-accessibility.e2e.ts` on both projects.
**CI load:** 1 run.

### R8: The ventilator in its own window on this computer (6 h; only after Q4 is answered yes)

**Depends on:** R7, Q4. **Files:** `views/vent.ts` (the link and the hand-over, shared by the view and the window),
`views/room.ts` (the opener), a new dom test beside `vent-handover.dom.test.ts`; a new e2e beside
`vent-handover-phones.e2e.ts`.
**Tests first:**
- one cockpit drives at a time: opening the window while the view is open hands the view's cockpit over first; the
  view then says "The ventilator is in its own window";
- the window drives only while it is visible, as the view does on screen (E128, `views/vent.ts:4–9`); hidden or
  closed, the engine's own ventilator takes over with the cockpit's settings, read through the window handle
  (`window.open` without `noopener`, same origin, as `views/vent.ts:60–66` reads the iframe);
- network followers hold while it drives and follow at once when it stops (`views/follower.ts:32–35`);
- the host's frame budget with the window open: the validation performance gate (`validation-perf.html`) holds.
**Acceptance:** the tests pass; `vent-handover-phones.e2e.ts` unchanged. If the frame budget fails without
`noopener`, the executor stops and reports (the learner monitor window uses `noopener` for this reason,
`views/room.ts:146–147`). **Must not touch:** `packages/ventilator`. **Gate:** common, with `@pme/demo`, plus the
vent e2e files on both projects. **CI load:** 1 run, plus the validation workflow.

### R9: The kit's launchers, CLASSROOM.md, CHANGELOG, roadmap (3 h)

**Depends on:** R1, R4, R5, R6, R7 (R8 if built). **Files:** `scripts/showcase/kit/start-classroom.command`
(`:6` "Phones may only FOLLOW" → "Phones follow; the instructor's phone commands only with the PIN" once P7 has
merged, else unchanged; `:100` "Monitor view, \"Phones\" (or the \"Phones\" button at the top right)" → "the Room
(Home → Start here)"; a line that the room code is kept on this computer for this address), the same in
`start-classroom.cmd` (printable ASCII only, `scripts/showcase/kit-launchers.mjs:15–17`), `kit/read-me-first.txt`
(`:18`); `docs/showcase/CLASSROOM.md` (new sections "Room setup", "What each screen can show", "The room code";
`:108–116` the QR moment gains the picker); `CHANGELOG.md` (Unreleased); `docs/roadmap/v1.0-remaining.md:43` (the row
states what shipped and what waits: IABP, a networked ventilator, the defibrillator choice).
**Tests first:** `kit-windows.test.ts` still passes (ASCII, CRLF); the docs-honesty tests (`@pme/validation`) pass;
every sentence added names a control that exists on main. **Acceptance:** a kit built from the branch shows the new
launcher lines. **Must not touch:** product code. **Gate:** `@pme/validation` docs tests, `check-relay.mjs` on the
built kit. **CI load:** 1 run.

### R10: End to end, measurements (5 h, last)

**Depends on:** R1–R7 (R8 if built). **Files:** new `apps/demo/e2e/room-and-instruments.e2e.ts`; a "Results" section
appended to this plan.
**Tests first (red against R3's head, green at the end):**
1. a phone scans the QR, the picker opens, one tap: the learner monitor follows; the Room lists it with a ping;
2. a second device picks Defibrillator: the Room says "Defibrillator", and its readout follows a charge;
3. a third picks Depth index; the instructor turns the depth monitor on; the index matches the host's;
4. the laptop's page is closed and the app opened again at its bare address: same code; all three devices follow
   again within 15 s [ENG: the follower's back-off plus one heartbeat] without a new scan, and the Room keeps their
   names;
5. a device's Wi-Fi drops (`context.setOffline(true)` for 15 s): its row goes Weak then disappears, the status box
   says so, and it comes back;
6. a learner phone's captured frames (`page.on('websocket')`) never contain `devices`, another device's `show`, or a
   PIN.
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
| P3 (host verifies the PIN) | draft, `feat-peer-p3` 1b191180 | Leaves it: no piece here touches `host-session.ts`. R7's instructor row reads only what the relay knows; the denial count and "taken over" are P3's `onInstructors` / denials, shown by P7 |
| P6 (view feed, note command) | unbuilt | Leaves it entirely. No instrument needs the feed |
| P7 (the phone's way in, the Room page) | unbuilt | **Split.** P7 keeps: the PIN form and its states in `views/remote.ts`; the PIN behind press-and-hold, "change PIN", in the Room's `#room-instructor` slot (R7 leaves it empty); the instructor's address builder in `classroom.ts`; its CLASSROOM.md section. This stage absorbs: the instructor phone's ROW in the device table (R7, from R2's `devices`), and the way in (R4's picker entry, which opens P7's address). P7's second QR (`instructor-peer-role.md:478–479`) is dropped (§4 D4). Whichever of R7 and P7 merges second rebases on the other; recommended order R7 then P7 |
| P8 (instructor e2e, kit check) | unbuilt | Leaves it. Its cases enter by P7's address directly; after R4 the picker is one more way in, covered by one case in R4's dom test, not by P8 |
| R24 (the phone remote's layout) | unbuilt, owner points open (`research/00-orchestrator-rulings.md:2694`) | Leaves it |

No duplicate work: the peer plan's P7 file list (`instructor-peer-role.md:473–484`) and this plan's R4/R7 overlap in
`views/room.ts` and `classroom.ts` only, and the split above gives each change one owner.

## 9. Partition, critical path, merge order, CI load, dependencies out of scope

```
R0 ───────────────────────────────► R5 ─┐
R3 ─┬─► R2 ─────────► R7 ─┬─► (R8)      ├─► R9 ─► R10
    └─► R4 ─┬─► R5        │             │
            └─► R6 ───────┴─────────────┘
R1 ─────────────────► R7
```

- **Critical path:** R3 (2) → R2 (5) → R7 (7) → R9 (3) → R10 (5) = **22 h**. R4 → R5/R6 (7 + 6) runs beside R2 → R7.
- **Parallelism:** at most three executors: {R0, R1, R3} first; then {R2, R4} and R5 when R0 and R4 are in; then
  {R6, R7}. R8 waits for Q4.
- **Merge order:** R0, R3, R1, R2, R4, R5, R6, R7, (R8), R9, R10. R5, R6 and R7 all touch `views/room.ts` (the
  openers) and R4, R5, R6 touch `views/follower.ts` and `join.ts`: each rebases on the one before.
- **CI load:** 10 PRs (11 with R8), one full CI run each (build with the kit relay smoke test, renderer, e2e on
  chromium and webkit, the slow-test matrix: `.github/workflows/ci.yml:9`, `:48`, `:105`, `:195`), plus reruns of a
  rebased head. Two new e2e files (`room-code.e2e.ts`, `room-and-instruments.e2e.ts`) and new cases in three
  existing ones; no new CI job.

**Effort**

| Piece | h (est.) |
|---|---|
| R0 baseline, defibrillator-profile measurement | 2 |
| R1 persistent room code | 4 |
| R2 relay ping and `devices` | 5 |
| R3 `show` and `device` on the hello | 2 |
| R4 picker (mock-up m5), instrument hashes | 7 |
| R5 defibrillator window | 5 |
| R6 depth-index screen and switch | 6 |
| R7 Room setup | 7 |
| R8 ventilator window (only if Q4 yes) | 6 |
| R9 kit and docs | 3 |
| R10 end to end, measurements | 5 |
| **Total** | **46 h without R8, 52 h with it**, plus ≈ 5 h of review |

**Dependencies out of this plan (new models or new wire)**
- **IABP console:** a balloon-pressure waveform and trigger/timing marks are not computed
  (`l2/circ/devices.ts` models the balloon's flow into the aorta, not its own pressure); an app control for
  `device iabp`; a renderer. A physiology piece first, then a renderer, then an instrument entry here.
- **A ventilator on another device:** its 50 frames a second are samples the relay drops; carrying them is a new wire
  and a new role (`instructor-peer-role.md:132`). Not in this stage.
- **A room defibrillator chosen apart from the monitor skin:** if Q6 asks for LIFEPAK-style beside a Saadat monitor,
  the engine needs a device-profile option separate from the skin (`device-layer.ts:175–181`): an engine piece.
- **EEG trace, SQI, EMG on the depth screen:** not computed (`depth.ts` gives an index and SR only).

## 10. Questions for the owner (each with the default the plan uses if no answer comes)

1. **The picker on scan. RULED 5 November: A.** The QR opens the picker, Learner monitor first and preselected, one
   tap; the phone remembers its last choice as the preselected one. The picker follows mock-up m5 (R4). (Option B, the
   learner monitor at once with a "Change" button, was not chosen.)
2. **Room setup. RULED 5 November: A.** The Room page becomes the "Room setup" window (join, devices, windows, room
   code, remembered layout), and Instructor v2's "Room setup" opens it. (Option B, a page of its own beside the Room,
   was not chosen.) Still the plan's default, not ruled: the monitor style stays in Settings with a link, the probes
   are shown read-only, and "reset the room" forgets the layout and names only.
3. **The room code's lifetime.** Kept on this computer until "New room code" is pressed, or a new code each day.
   **Default: kept until pressed.** A learner from an earlier class who kept the address can follow again, never
   command.
4. **The ventilator in its own window.** While a cockpit drives the patient, every phone holds ("The ventilator is on
   the main screen", your E128 rule); a ventilator window on a second screen would drive for the whole case, so the
   phones would hold for the whole case. **Default: not built (R8 waits); the Room's "Ventilator" opens the
   Ventilator view in this window.**
5. **The defibrillator window: display only, or learners press Charge and Shock on it?** Pressing would make a
   learner's device a commanding role. **Default: display only; the instructor charges and shocks from the laptop.**
6. **Which defibrillator does the room have?** The engine's defibrillator follows the monitor skin; a Saadat room
   uses Zoll values (120 J). **Default: the defibrillator window is Zoll-style in such a room, LIFEPAK-style only in
   a LIFEPAK room.** A LIFEPAK beside a Saadat monitor needs an engine change (§9).
7. **The depth screen's name.** The engine's index is BIS-like, not BIS. **Default: "Depth index (BIS-like)"**, and a
   "Depth monitor on / off" control on the Devices sheet.
8. **IABP.** **Default: not offered in this stage** (your "IABP later"); it needs a model first (§9).
9. **When the room reads "Weak".** **Default [ENG]: a device whose last ping is over 300 ms, or that missed one 10 s
   heartbeat** (the relay closes it at the second). 300 ms is an engineering choice: a follower at that delay still
   mirrors commands, but a ping that high on a room's Wi-Fi is worth a look. Not a clinical threshold.
10. **Device names kept across days**, under a random key each device keeps in its own browser (never leaves the
    room's network). **Default: yes, with "Forget the room" to clear them.**

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
   (`depth.ts`), and the renderer has its tile (`numerics-neuro.ts`). What is missing is an app control to switch the
   device on and a screen of its own (R6). The IABP does need a new model (§9).
2. The kit launcher tells the presenter to find the QR under "Monitor view, Phones (or the Phones button at the top
   right)" (`start-classroom.command:100`); the top right carries "Remote" and the code (`main.ts:216`), and the QR
   is on the Room. R9 rewrites the line.
3. `room-status.ts:19` says "an instructor phone reads 'Remote' (P7 gives it its own row)": R7 gives it the row, not
   P7 (§8).
4. The peer plan puts a second QR on the Room (`instructor-peer-role.md:478–479`); the owner's rulings give one QR and
   a device-side choice (§4 D4).
5. A defibrillator style on a follower changes that follower's device profile (`mount.ts:522`): the "defib window"
   of the brief is not just a skin, and R0 measures it first.
