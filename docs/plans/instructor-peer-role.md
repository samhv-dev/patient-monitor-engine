# An instructor peer role, so a phone can command the session (E124): implementation plan

**Status:** draft for the orchestrator's review. Written 2026-10-30 by the planner from `origin/main` 5808d0b6
(Instructor v2 on main through #177; #179 still open). No code was changed. Code is named by file and function, not by
line.

**Goal.** A phone in the instructor's hand commands the running case as the laptop's Instructor views do: steps,
judged objectives, pause, speed, fast forward, marks, drugs and the other sheets. Learners' phones keep following and
gain nothing. The phone's layout (boards Phone 6 to Phone 9) is out of scope. This plan builds the role and names what
that layout will need from it.

**Where the code stands (read before the pieces).**
- The wire already has a commanding peer role. `Role = 'host' | 'controller' | 'viewer'` (`protocol.ts`). A
  `controller` commands. The host refuses only a peer whose last hello said `viewer` (`host-session.ts` `receive`, ack
  `'a viewer cannot command'`). The relay forwards commands from `controller` sockets only (`relay/server.ts` `route`).
- The refusal of a phone is a classroom setting. With `--static` (the kit's Start Classroom) the relay defaults to
  `--remote-roles viewer`, so another device may only say `viewer` (`relay/server.ts`, close 4003). Without `--static`
  (`pnpm relay`) the default is `all`, and any device that knows the session code may command.
- An instructor remote already exists: the app's `#/remote` view (`views/remote.ts`). It mounts today's panel on a
  `ControllerSession` with no engine. Its header says it is same-browser only in 1.0, with relay pairing "version
  1.1". This plan is that step, for the phone, bound to a PIN.
- The session code is the only secret, and the projector shows it.

**Hard constraints.**
- No change to `packages/engine-core`, `packages/renderer`, `packages/skins`, the scenario format `pme-scenario/1`,
  the showcase cards, or the follower's engine path (`viewer-sync.ts`, `views/follower.ts`).
- The laptop's Instructor views (`views/teach.ts`, `panel/*`, `views/teach2.ts`, `teach2/*`) send exactly what they
  send today. Their own code changes only where a piece says so, and never in what a press sends.
- The phone may send only what the laptop's Instructor views send (piece P0 measures that set). Never more.
- The MH and haemorrhage courses give the same states and the same debrief verdicts whether a step is pressed on the
  laptop or on the phone (P8).
- The PIN never appears in a URL, a QR code, a log line, the record, an export, a console message, or any message a
  learner's phone receives.

**Common gate (every piece, before every push).**
```bash
npx -y pnpm@9.15.9 install --frozen-lockfile < /dev/null
npx -y pnpm@9.15.9 -r typecheck < /dev/null
npx -y pnpm@9.15.9 --filter <pkg> test < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs < /dev/null   # 0 stale, 0 orphans
git diff origin/main --stat -- packages/engine-core packages/renderer packages/skins apps/demo/src/app/showcase \
  packages/controller/src/session/viewer-sync.ts apps/demo/src/app/views/follower.ts   # empty
grep -rn "it.fails" --include=*.test.ts packages apps | wc -l   # unchanged from origin/main
```
Every piece writes its tests first, shows them red on its base, then green.

---

## 1. The hello and the PIN

**The role.** A fourth role, `instructor`, beside `controller` (Q1). A `controller` stays what it is: a peer the
transport already trusts (the laptop's own panel over the in-process hub, a Remote window over BroadcastChannel, a
socket from the laptop itself on the relay). An `instructor` is a peer from anywhere that proves the PIN. The relay
policy then reads in one line: another device may be a `viewer`, or an `instructor` the host has granted. `controller`
from another device stays governed by `--remote-roles` as today.

**The hello.** `{kind:'hello', role:'instructor', pin:'4729'}`. `pin` is legal only with `instructor`: digits, 4 to 8
characters (`guard.ts` refuses anything else). The instructor says it on every open socket, as every session already
re-says its hello.

**Where the PIN lives.** On the laptop only, in the app's `store` (localStorage, key `pme.instructorPin`), beside the
persistent room code that E124 also asks for. At first use the app draws four random digits. The Room page shows the
PIN behind a press-and-hold reveal and lets the instructor change it (Q2). It is never in the QR code, never on the
projector's window, never in `?session=` or any other URL. The host page reads it through a getter, so a change
applies at once.

**How the host verifies it.** `HostSessionOptions.instructorPin?: () => string | null`. On an instructor hello the host
compares in constant time (equal length, XOR of the char codes). `null` (no PIN set, or an older app) denies every
instructor with `'this computer does not take an instructor phone'`. The host answers with a new message,
`{kind:'grant', to:<from>, granted:boolean, reason?:string}`, on the transport the hello came from, BEFORE its welcome.
That order matters: the relay must know the grant before it copies the welcome to the socket (see below).
- A granted peer is remembered per (transport, from), not per `from` alone (P1).
- A command from an instructor peer that is not granted is refused, ack `'the instructor phone is not signed in'`.
- No lockout on the host. All phones share the host's one relay transport, so a host-wide lock after N wrong PINs
  would let a few learners lock the real instructor out. The limit is per address, and only the relay sees addresses
  (below). The host counts denials for the Room page ("3 wrong PINs in the last minute").
- A PIN change revokes every grant: `grant {granted:false, reason:'the PIN was changed'}`.

**What the relay checks.**
- An `instructor` hello is admitted from another device under `--remote-roles viewer` (classroom mode). The socket is
  then PENDING.
- A pending socket is routed as a viewer: lean event copies (`VIEWER_EVENTS` only), and a command gets
  `{relay:'error', code:'forbidden'}`. So a learner who says `instructor` with a wrong PIN gets nothing a viewer does
  not get.
- The relay forwards the instructor's hello (with its PIN) to the host only. It does this already for every non-host
  hello, and it keeps doing it.
- The host's `grant` is consumed by the relay. It applies the grant to the pending socket of that `from`, and forwards
  the grant to that socket only. Granted: full event copies, and commands go to the host. Denied:
  `{relay:'error', code:'denied', message:<reason>}` and close 4013, a new fatal code, so the phone does not
  reconnect with the same wrong PIN. The page asks again instead.
- Per address: 5 denials within 60 s and that address may not say `instructor` for 60 s (`too-many-tries`, close
  4028) [ENG]. Learners cannot lock the real instructor out from their own phones, because each phone has its own
  address.
- One open socket per `from` in a room, for every non-host role. A newer socket with the same id replaces the older
  one, which is closed with 1000 "replaced by reconnect" (the host's rule today), so a learner's phone that reconnects
  past its own dead socket still follows. The replacing socket starts PENDING when the id was an instructor's: a grant
  never passes from one socket to another. Today two sockets may hold one id (P1 explains why that matters).
- An instructor is admitted past `--max-peers`: one reserved place, so a full room of learners never shuts the
  instructor out.
- The `peers` frame to the HOST gains `instructors: n`, an additive field the Room page reads. The frame to the other
  peers is unchanged, so learners are not told an instructor phone exists.

**Older pieces in the chain.** A kit relay from rc.4 drops the unknown role (`guard.ts` `ROLES`). A host from rc.4 never
answers. The phone page gives up after 10 s with "This classroom kit does not take an instructor phone. Use the kit
from the same release as the app." (P7).

## 2. What the instructor may send

The same set the laptop's Instructor views send, measured, not listed by hand. P0 writes a census test. It mounts
today's panel (`panel/*` through `mountPanel`) and Instructor v2 (`views/teach2.ts`) on a recording Link, presses
every control a test can reach, and writes the set of command shapes, `type` plus `action` or `event.kind`. The host's
allow-list `INSTRUCTOR_COMMANDS` (`protocol.ts`) must equal that set. A test fails when either side gains a shape the
other lacks. From reading the code, the set is expected to be:

| Family | Allowed | Reason |
|---|---|---|
| `time` | `pause`, `resume`, `scale` (0.25 to 8), `jump` (0 to 600 s) | the session bar, the v2 header, the Fast forward box, Space |
| `scenario` | `trigger`, `goto`, `bookmark` (kind `good`, `bad`, `discuss`, or none), `restoreBookmark`, `pause`, `resume` | steps, the strip's jump and return, marks, the bookmark list; `pause` / `resume`: today's Scenario tab's Hold the timer (Instructor v2 has no such button) |
| `applyEvent` | every `ClinicalEvent` kind the Drug, Airway, Defib · CPR, Vitals, Devices and Patient bodies send | the sheets and today's tabs |
| engine | `device`, `setTarget`, `pin`, `release`, `setRhythm`, `setMode`, `attachSensor` | the Vitals, Devices and Patient bodies, the alarm keys |
| `note` (new, §6) | `kind: 'note' \| 'marker'`, text of at most 500 characters | what the laptop writes locally today: a judged objective, a note |

*§2 amended 2026-10-30 after P0's census: `scenario pause` / `resume` and the Patient body's `applyEvent` (`condition`) were measured and are allowed; the set is the union of what the two laptop views send.*

Refused for the instructor, each with its reason in the ack:
- `scenario load`: "Load the case on the instructor's computer." The laptop's Load is more than the wire command:
  `AppSession.loadScenario` remounts the engine with the card's patient and only then sends `load` (so the census
  sees a `loadScenario` call, not a send). A `load` from a remote starts the runner on the old body. That is a defect of today's Remote too (`panel/scenario.ts` `load`
  without `c.loadScenario`).
- `bookmark` with kind `stage`: that mark is the driver's own.
- `setFactor`, `setModifiers`, `externalDrive`, `time step`: no Instructor view sends them. `externalDrive` is the Ventilator view's frames.
- Patient restart, the skin, sound, the Ventilator view, the Debrief page and its export are host-document actions,
  not commands. They stay on the laptop.

The host also overwrites `issuedBy` on every instructor command with `'remote'`, so the record files it as today's
Remote's rows (`record.ts` `wire`, kind `'remote'`). Today a peer may write any `issuedBy`, including `'scenario'`,
which the record would take for the runner's own command.

## 3. Two instructors connected (the owner has not ruled)

The laptop's own panels are always instructors. They are trusted, need no PIN, and are never revoked. The question is
a second commander beside them, and a second phone.

| Option | What happens | For | Against |
|---|---|---|---|
| A. Any number of phones, all command | Every granted phone commands; the host serialises; everyone sees every press within a second | Simplest; two faculty can co-run | Two hands give the same drug twice; nobody owns the case |
| **B. One phone at a time, the newest takes over** | A right PIN while another phone holds the role grants the new phone and revokes the old one, which reads "Taken over by another phone at mm:ss" and may sign in again | A dead or lost phone never blocks the case; handing over is entering the PIN; one extra rule in the host | A colleague's phone can take the role silently (but only with the PIN) |
| C. One phone, a second is refused until the first leaves | The second phone reads "Another phone is the instructor's remote" | Nothing is taken without the holder knowing | A phone that died holds the role until the relay's heartbeat ends its socket (up to 20 s, two sweeps); a hand-over needs the first phone |
| D. B with an ask | The second phone is asked "Take over?" first | Explicit | One more protocol step (a `takeover` flag on the hello) |

**Recommendation: B.** The PIN is already the proof of authority. A role that a lost phone can hold would fail the
case at its worst moment. The laptop's Room page row and the v2 header's room chip say which phone holds the role and
since when.

**No duplicate-press guard.** The host does not refuse "the same drug again from the other device". That would be a
lock applied by the panel, which the design's anti-goals forbid (`instructor-panel-redesign.md` §2). The format v2
catalogue (repeat interval, max count) grades a repeat in the debrief instead. Each device sees the other's press
within one second: the ACTION rows through the view feed (§6), and the log through `commandApplied`.

## 4. The acknowledgement back to the phone

The path exists and stays as it is. The phone's `ControllerSession.send` gives each command an id, re-sends it every
2 s while unanswered, and resolves on the host's ack (`AckResult`: `accepted`, `tick`, `reason`, `rttMs`). The host
answers a re-sent id with the same ack (`seen`, 500 ids). On the relay the ack goes to the socket that last sent that
id (`ackRoutes`), so a re-send after a reconnect gets its answer on the new socket.

What the phone's status chip reads from it:
- **Sending:** the command is pending. The row's key box pulses: "sent · waiting for the instructor's computer".
- **Given:** `accepted: true`. "Dantrolene 200 mg given at mm:ss", where mm:ss is `ack.tick × 0.02 s` printed as
  the v2 header prints the case clock. For a step pressed while paused, that is the paused time, at which it acts on
  resume (design §5). P8 tests that this time equals the record row's time on the laptop.
- **Not applied:** `accepted: false` with the host's reason ("the simulation is fast-forwarding; try again when it
  ends"). A step the case has left comes back as the runner's raw `no transition <id> in state <id>`. The phone words
  it as `teach2/press.ts` `pressStep` already does: "Not available now: the case has moved to Treating".
- **Not confirmed:** no answer within 15 s on an open link (`COMMAND_ANSWER_TIMEOUT_MS`). The chip says "Not
  confirmed: no answer from the instructor's computer. Check the Finished list before pressing again." It must not
  say "not given": the host may have applied the command and lost the ack. The mock-ups have only sending, given and
  not applied. This fourth state is new.

No ack field is added.

## 5. Reconnection, and the phone lost mid-case

- **Wi-Fi drop or a locked phone (the page lives).** The socket reconnects with its back-off. The session says its
  instructor hello again with the PIN it holds in memory, so the host re-grants it and the relay copies the welcome
  in full. Pending commands go again, and the host's id check applies each one once. The phone page drops a socket
  that heard nothing for 12 s and opens a new one (`PHONE_LIVENESS_MS`, as the learner's phone does). A phone keeps
  dead sockets open, and the relay's heartbeat is 10 s.
- **A fresh `from` per socket.** The instructor's session stamps `from` = `<peerId>.<n>`, with n counting the
  connections. Command ids keep the page's `peerId` prefix, so the host's dedupe and the session's "mine" check are
  unchanged. A reconnect then never replaces its own dead socket under an id the host knows, and the host's
  per-sender sequence filter starts fresh. An impostor who claims the current instructor id replaces that socket but
  starts pending with no grant: the real phone reconnects under a new id and signs in again. It gains nothing.
- **The phone's page dies (reloaded, killed by the browser).** The PIN was in memory, so the page asks for it again
  (Q3). Commands it had not seen answered are gone. They are never sent later. The view feed (§6) shows at once what
  the host did.
- **The laptop reloads mid-case.** A reloaded host has a new peer id. Today `ControllerSession` re-sends every pending
  command on any host hello, so a "give dantrolene" pending across a host reload would be given to the reloaded
  case. A host hello from a new host id now answers the pending commands locally: "Not given: the instructor's
  computer restarted. Press again if it is still needed." The PIN survives the reload, because it is in the
  laptop's store, so the phone signs in again by itself.
- **The phone is lost for good.** The case runs on. Nothing pauses by itself: the panel never moves the case where the
  card did not say so (anti-goal), and the laptop still commands (Q5). The Room page row turns "lost at mm:ss". The
  relay ends the socket within two heartbeats. Under option B any phone with the PIN takes the role at once.
- **The relay restarts (a kit crash).** Every socket reconnects. The host's hello rebuilds the room, and the
  instructor is verified again. `mobile-learner.e2e.ts` already proves this path for viewers. P8 adds the instructor.

## 6. What the phone needs from the controller that the laptop does not

The plan cannot keep this at nothing without failing the mock-ups and creating a hazard. Instructor v2 reads three
things from the host document that a remote does not have: `link.host?.record.data` (taken, overdue, failed,
"1:00 before it was due", the cue box's "by your button at 08:16", a condition's last value), `driver.vitalHolds()`
(an A row's hold fraction) and `driver.stageMarks()` (a past stage's return). On a remote these are null. `rows.ts`
then degrades on purpose: no overdue, no condition values, a mixed step reads taken. After the phone's page reloads,
its scenario history starts empty, so a step the treatment fan-out loops back to reads as not taken. That invites a
second dose. Also, `Link.note` writes to the debrief only on the host (`link.ts` `add`: `this.host?.record.note`), so
a judged objective pressed on a remote never reaches the debrief at all.

Two additions, both small. The laptop needs neither, because it has the originals:

1. **The view feed, an instructor-only event** `{type:'instructorView', t, body}` (Q6). The host app computes the
   body with the same functions Instructor v2 uses: `rows.ts` `board` (list, finished, off the card), the cue line and
   its `by`, the strip's entries with each past stage's return label, and the A-row progress from the holds. It sends
   the body at most once a second, and only on a change, while an instructor is granted. Measured size at the MH
   fan-out moment must stay ≤ 16 KB [ENG]. The controller treats the body as opaque, and it is never in
   `VIEWER_EVENTS`. On a remote `Link`, `teach2` reads the feed when it has one, so its rows equal the laptop's by
   construction. That also mends today's degraded Remote on the same browser. With this, the phone needs no record of
   its own, no sample stream and no hold counters. The host is the one source, as design §6 asks ("same card data, no
   second source").
2. **The `note` command** (§2). A remote's `link.note(text, kind)` sends it. The host applies it by calling the same
   `record.note(t, text)` the laptop calls, at the host's sim time. The laptop's own path is unchanged. The record
   row then reaches every instructor through the feed.

Turning on the stage marks: the host turns `driver.markStages(true)` on while an instructor is granted, not only while
Instructor v2 is on screen. Otherwise a phone used with the laptop on the Monitor view would find no stage to return
to. Returns from the phone use the labels in the feed. This revisits the 29 Oct ruling "no remote stageMarks" (#170)
in effect, so it is Q7. The ruling as recorded is that Instructor v2 reads `driver.stageMarks()` and there is no
remote stage-mark API. The feed adds no `ControllerSession` API, but it does bring returns to a remote.

What the phone's layout needs from the role, and nothing more:
- the case clock, speed, pause and fast forward: on the wire already (`commandApplied` time commands, `fastForward`);
- the rows, the strip, the cue box: the feed;
- three vitals: `measurement` events, which a granted instructor receives in full. Which three is a layout question:
  `pme-scenario/1` has no field naming a stage's vitals. They can be read off the stage's `vital` rules, or wait for
  the format v2 work;
- the status chip: the acks (§4) and the feed;
- the room code: the page's own;
- marks: `scenario bookmark` with kind and note, as the laptop sends it.

Not in the role, so the layout plan must decide:
- The ECG strip (Phone 9). Samples never cross the wire (`guard.ts`), so a strip needs a follower engine on the
  phone: a second socket on the same page as a `viewer`, running the learner phone's `ViewerSync`.
- The lab row. Its Gas sheet is not built on the laptop either (`teach2/sheets.ts`: "Gas is not built").
- The Debrief chip. The Debrief is a page on the laptop. No command opens it. Q9.
- "Add a note" after a mark (Phone 6, the paused board). The laptop's note travels with the bookmark at the press.
  After the fact, it can only be a `note` row that names the mark ("Note on discuss at 08:20: …").

## 7. What the learners' phones must never see or gain

- **The PIN.** The relay forwards the instructor's hello only to the host. The PIN is never sent on BroadcastChannel,
  where every window of the browser hears every message. A same-browser Remote stays a `controller`. The instructor
  page offers only the relay.
- **Command power.** A viewer is refused at the relay (`forbidden`) and at the host (`a viewer cannot command`), as
  today. A pending or denied instructor is refused at both. Taking over someone's identity is closed by P1 (below).
- **The instructor's stream.** A pending instructor gets the lean copy. The feed, the grants and the `peers` count of
  instructors never reach a viewer.
- **The instructor's words.** The relay's lean copy for viewers drops `commandApplied` of `scenario` commands and of
  `note`. Today a mark's kind and note reach every learner's phone inside `commandApplied` (`VIEWER_EVENTS` includes
  it), although no learner page shows them. `ViewerSync` ignores scenario commands (`viewer-sync.ts`, the
  `c.type === 'scenario'` return), and the follower page reads only time pause and resume. Dropping them changes
  nothing a learner sees. P4's test proves the follower still follows through a restore.
- **Speed.** The extra events go to one socket. A learner's traffic is unchanged; P8 measures it.

**A defect found while planning, closed by P1.** The host keeps one sequence filter and one set of viewer peers for
all its transports, keyed by `from` alone (`host-session.ts` `seqs`, `viewerPeers`). The laptop panel's peer id is
public: every `commandApplied` carries `commandId = <peerId>-<n>` (`controller-session.ts` `send`), and every
learner's phone receives it. A learner's phone can therefore say hello on the relay with `from` set to the panel's id:
- as `viewer`, so that the host marks the laptop's own panel a viewer and refuses its commands;
- or with a large `seq`, so that the host drops the panel's next commands as duplicates.

The relay does not stop it: it binds a socket to whatever `from` its first hello names, and it allows two sockets one
id. This was read from the code, not run. P1's first test shows it. A role that commands from the network must not
stand on that, so P1 comes first.

## 8. How the kit's relay check and the e2e suite exercise it

- **`scripts/showcase/check-relay.mjs`** (the built kit's relay, frames only). After today's steps it plays the host
  and adds:
  1. an instructor hello: the socket gets `peers` and lean copies only, and its command gets `forbidden`;
  2. the host's `grant {granted:true}`: the grant reaches that socket, a 1 KB host event arrives byte for byte, the
     instructor's command reaches the host, and the host's ack comes back;
  3. a second instructor hello whose host answer is `granted:false`: `denied`, then close 4013;
  4. a viewer's command: still `forbidden`;
  5. a second socket with the granted instructor's id: it replaces the first, is pending, and its command gets
     `forbidden`.

  It runs on loopback like today's steps. The grant rule does not depend on which device a socket comes from.
- **`apps/demo/e2e/instructor-phone.e2e.ts`** (new; Chromium and WebKit; phone viewport). It uses the in-process
  relay with `remoteRoles: 'viewer'`, and with `PME_KIT_RELAY` the built kit's relay, as `mobile-learner.e2e.ts`
  does. The phone's socket must count as another device. Use the existing `isLocal` seam with a request-aware form:
  P4 widens it to `isLocal(address, req)`, and the e2e marks the phone's socket with `?e2e-remote`. That option is
  honoured only when a test passes it, never on the command line. In `PME_KIT_RELAY` mode the phone counts as local.
  Every case still holds there, because the grant rule does not depend on the device. The cases:
  1. a wrong PIN is refused and the page asks again;
  2. the right PIN signs in; on the MH card the phone presses the first dantrolene step, and the laptop's
     `record.data.rows` and the learner phone's monitor show it;
  3. the chip's "given at" equals the laptop's record time;
  4. a judged objective pressed on the phone is in the Debrief;
  5. pause and fast forward from the phone hold the learners' phones as the laptop's do;
  6. `context.setOffline(true)` for 5 s with a press pending: it is applied once;
  7. the laptop reloads with a press pending: it is not applied, and the chip says so;
  8. a second phone takes over (option B);
  9. a learner phone's frames, captured with `page.on('websocket')`, never contain the PIN, `instructorView`,
     `grant`, a `note`, or a mark's note;
  10. a learner phone's forged instructor hello gets lean copies and is closed.
- **The kit round.** The A4 MH round through the phone stays a manual smoke for the owner, not a gate (Q10).

---

## Pieces

Sizes are executor hours (est.). Each piece is one PR against `main`, with tests written first.

### P0: Baseline and the command census (2 h)
- **Files:** new `apps/demo/src/app/teach2/census.dom.test.ts` (test only).
- **Tests first:**
  - mount today's panel and Instructor v2 on a recording `Link` (a fake `ControllerSession` whose `send` records and
    accepts);
  - press every button, sheet primary, key and strip click a dom test can reach;
  - assert the sorted set of shapes against the table in §2, written into the test as a literal (a copy goes to
    `scratch/peer-role-gate/census.json` for the review). Once P2 lands, P6 switches the literal to
    `INSTRUCTOR_COMMANDS`, so the app test is the one parity check between the laptop and the allow-list.
  - Record the goldens P8 compares against: the `PME_SHOWCASE_PRINT=1` output of the MH and haemorrhage slow tests,
    and the A4 MH kit-round Debrief JSON (states, verdicts, pressed).
- **Acceptance:** the census matches §2, or the executor stops and reports the difference.
- **Must not touch:** any source file.
- **Gate:** common, with `@pme/demo`.

### P1: The host keys its peers by transport (3 h)
- **Files:** `packages/controller/src/session/host-session.ts`; tests in `test/session/host-boundary.test.ts`.
- **Tests first:**
  - a peer on transport B that says hello as `viewer` with the panel's `from` (transport A) does not stop A's commands;
  - a hello on B with `seq: 1e9` and A's `from` does not make the host drop A's next command;
  - today's cases are unchanged (a viewer on its own transport is refused; the same peer saying `controller` then
    commands).
- **Change:** `SeqFilter` and `viewerPeers` become per transport (a `WeakMap<ManagedTransport, …>`).
- **Acceptance:** the new tests pass; every `@pme/controller` test passes unchanged.
- **Must not touch:** the relay, the protocol types, the app.
- **Gate:** common, with `@pme/controller`.

### P2: Protocol and guard (2 h, after P1)
- **Files:** `packages/controller/src/protocol.ts`, `src/guard.ts`, `src/index.ts`; tests in `test/guard.test.ts`,
  `test/protocol.test.ts`, `test/types.test-d.ts`.
- **Tests first:**
  - the guard accepts `hello {role:'instructor', pin:'4729'}`;
  - it refuses a `pin` on any other role, a non-digit PIN, and a PIN of 3 or of 9 characters;
  - it accepts `grant {to, granted, reason?}` and refuses a grant without `to` or `granted`;
  - it accepts the `note` command (`kind` note or marker, text at most 500 characters) and refuses a longer text;
  - `INSTRUCTOR_COMMANDS` equals the §2 table (the controller cannot import the app; the app's census test checks
    the other side, see P0 and P6);
  - `instructorMay(cmd)` answers null or the refusal reason of §2;
  - `instructorView` is not in `VIEWER_EVENTS`.
- **Change:**
  - `Role` gains `'instructor'`; the hello gains `pin?`;
  - `WireMessage` gains `grant`;
  - `ExtraCommand` gains `{type:'note'; kind:'note' | 'marker'; text:string}`;
  - `ExtraEvent` gains `{type:'instructorView'; t; body: unknown}`;
  - `RELAY_CLOSE` gains `denied: 4013` and `tooManyTries: 4028` (4009 and 4029 are taken), and both join
    `FATAL_CLOSE_CODES`;
  - `RelayFrame` error codes gain `'denied' | 'too-many-tries'`;
  - the `peers` frame gains `instructors?: number`.
- **Acceptance:** typecheck green across the workspace. No behaviour changes: nobody sends the new shapes yet.
- **Must not touch:** `host-session.ts`, `relay/`, the app.
- **Gate:** common, with `@pme/controller`.

### P3: The host verifies, grants and filters (6 h, after P2)
- **Files:** `host-session.ts`; new `test/session/host-instructor.test.ts`.
- **Tests first:**
  - right PIN → `grant true` is sent before the welcome's events and snapshot; wrong PIN → `grant false`;
    `instructorPin` null → `grant false`;
  - the comparison takes the same path for every PIN of the same length (constant time by construction: no early exit);
  - an ungranted instructor's command → refused ack;
  - a granted instructor's `scenario load` → refused with its reason; a `bookmark` of kind `stage` → refused; a census
    shape → applied;
  - `issuedBy` overwritten to `'remote'`;
  - a `note` → `onNote(t, text, kind)` called once, ack accepted, `commandApplied` sent;
  - option B: a second granted instructor → `grant false, reason 'taken over'` to the first;
  - a PIN change → every grant revoked;
  - 20 wrong PINs on one transport do not stop the next right PIN (no host lockout); the denial count is reported;
  - `onInstructors(n)` reports grants and revocations.
- **Change:** options `instructorPin`, `onNote`, `onInstructors`. Grants per (transport, from). The allow-list check
  in `receive`/`command`.
- **Acceptance:** the tests pass; every existing controller test passes unchanged (a host without `instructorPin`
  behaves as today).
- **Must not touch:** the relay, `controller-session.ts`, the app.
- **Gate:** common, with `@pme/controller`.

### P4: The relay (6 h, after P2; in parallel with P3 and P5)
- **Files:** `packages/controller/relay/server.ts`, `relay/README.md`; new `test/relay/relay-instructor.test.ts`;
  additions to `relay-classroom.test.ts` and `relay-hostile.test.ts`.
- **Tests first:**
  - `remoteRoles: 'viewer'` with `isLocal: () => false`: an instructor is admitted pending; it gets lean copies and
    `forbidden` on a command;
  - a host `grant true` → full copies, commands routed, acks back; `grant false` → `denied`, close 4013;
  - the grant goes only to its socket;
  - 5 denials from one address → `too-many-tries` for 60 s; another address is unaffected;
  - a second socket with an open `from` replaces the first (closed 1000); for an instructor's id the new socket is
    pending; a viewer that reconnects past its dead socket keeps following;
  - an instructor admitted with the room at `maxPeersPerRoom` viewers;
  - `instructors` in the host's `peers` frame only;
  - the viewers' lean copy has no `scenario` or `note` `commandApplied`, and no `instructorView`, while a granted
    instructor's copy is byte-identical to the host's frame;
  - a controller from another device is still refused (4003);
  - the follower still resyncs across a bookmark restore through a relay (an existing `viewer-sync` case, re-run over
    the relay fake).
- **Change:**
  - a `granted` flag per peer;
  - the pending-to-granted routing;
  - the per-address denial counter, with a sweep that forgets after 60 s;
  - the one-socket-per-id rule (newest replaces, a grant never carries over);
  - one reserved place;
  - the lean filter's two additions;
  - `isLocal(address, req)`;
  - the README table and its Security paragraph ("commands come from the instructor's laptop alone" becomes "… or
    from a phone the laptop granted with the PIN").
- **Acceptance:** the tests pass; every relay test and `mobile-learner.e2e.ts` pass unchanged.
- **Must not touch:** `host-session.ts`, the app.
- **Gate:** common, with `@pme/controller`, plus `node scripts/showcase/check-relay.mjs` against a kit built from
  the branch (`scripts/showcase/make-bundle.mjs`).

### P5: The instructor's session (4 h, after P2; in parallel with P3 and P4)
- **Files:** `packages/controller/src/session/controller-session.ts`; tests in `test/session/controller-session.test.ts`.
- **Tests first:**
  - with `role: 'instructor', pin: () => '4729'`, every open says the instructor hello with the PIN;
  - `access` goes pending → granted → (revoked | denied), with its reason, and `onChange` fires;
  - commands are held, not sent, until granted, then go in order;
  - `from` is `<peerId>.<n>` and changes on every open, while command ids keep `<peerId>-<n>`;
  - a host hello from a NEW host id answers every pending command locally: accepted false, reason "the instructor's
    computer restarted…". The same host id re-saying hello (a restore) still re-sends, as today;
  - the timeout's reason reads "not confirmed" (§4) for the instructor role only, while a controller's reason is
    unchanged.
- **Change:** options `role` and `pin`; `access`; per-connection stamping; host-id tracking.
- **Acceptance:** the tests pass; every existing controller-session test passes unchanged (a `controller` behaves as
  today).
- **Must not touch:** `host-session.ts`, the relay, the app.
- **Gate:** common, with `@pme/controller`.

### P6: The host's view feed and the note path (6 h, after P3)
- **Files:**
  - `apps/demo/src/app/session.ts` (wire `instructorPin`, `onNote` → `record.note`, `onInstructors` →
    `driver.markStages(true)` while n > 0, and the feed);
  - new `apps/demo/src/app/teach2/feed.ts` (pure: the board, the cue, the strip entries, from the host's link);
  - `link.ts` (a remote's `note` sends the `note` command; `link.view` holds the last feed body);
  - `teach2/census.dom.test.ts` (P0's literal becomes `INSTRUCTOR_COMMANDS`);
  - `teach2/action.ts`, `cue.ts`, `strip.ts`, `course.ts` (read `link.view` when `link.host` is null and a feed has
    arrived);
  - tests beside them.
- **Tests first:**
  - with an in-process host and a remote `Link` on the same hub, at the MH card's fan-out moment, the remote's `board()`
    deep-equals the host's `board()` (list, finished, looks, rights, `at`);
  - the feed is sent only while an instructor is granted, at most 1 Hz, only on change; its size at that moment is
    ≤ 16 KB;
  - a remote's judged objective lands in the host's `record.data.rows` as the laptop's does (same `text`, same kind);
  - stage marks are placed while an instructor is granted with the laptop on `#/monitor`;
  - the host's own Instructor v2 renders byte-identically with and without the feed (its `outerHTML` at a fixed paused
    state, as IP0 did).
- **Acceptance:** the tests pass; P0's goldens are unchanged (MH and haemorrhage states and verdicts).
- **Must not touch:** what any press sends (`teach2/press.ts`, `panel/*`); `record.ts` beyond what `note` needs (it
  should need nothing).
- **Gate:** common, with `@pme/demo` and `@pme/controller`.

### P7: The phone's way in, and the laptop's Room page (5 h, after P3 and P5)
- **Files:**
  - `apps/demo/src/app/views/remote.ts` (with a relay: a PIN form with a numeric keypad, join as `instructor`; the
    states waiting, wrong PIN, too many tries, taken over, computer restarted, kit too old after 10 s; it still mounts
    today's panel as the placeholder the phone layout replaces);
  - `views/room.ts` (the PIN behind press-and-hold, change PIN, the instructor phone's row with state and since when,
    a second QR of `?relay#/remote?code=CODE`, which carries no PIN);
  - `classroom.ts` (the instructor's address);
  - `main.ts` (wiring);
  - the header comment of `remote.ts`;
  - `docs/showcase/CLASSROOM.md` (a short section: the instructor's phone);
  - `CHANGELOG.md` (Unreleased).
- **Tests first:**
  - dom: the form never puts the PIN in `location` or `history` and clears it on leave; the states and their words;
  - Room: the PIN is hidden until held; changing it revokes the phone (P3's revoke observed through a fake host);
  - `classroom.test.ts`: no URL the app builds contains the PIN (a property test over the builders).
- **Acceptance:** the tests pass; `app-accessibility.e2e.ts` covers the new form and Room rows (labels, focus, 44 px
  targets).
- **Must not touch:** the follower views, Instructor v2's host rendering.
- **Gate:** common, with `@pme/demo`.

### P8: End to end, the kit check, measurements (6 h, last)
- **Files:** new `apps/demo/e2e/instructor-phone.e2e.ts`; `scripts/showcase/check-relay.mjs` (the steps of §8); the
  measurement notes in this plan's "Results" section.
- **Tests first:** the e2e cases and kit steps of §8, red on the base before P3 to P7 merge (run against P2's head to
  show red).
- **Measure:**
  - a learner phone's bytes per minute at ×8, with and without an instructor phone (within 5 % [ENG]);
  - the feed's size and rate across the whole MH course;
  - the phone's press-to-ack time on the kit relay (median and p95).
- **Acceptance:**
  - every e2e case passes on both engines, three runs in a row;
  - `check-relay.mjs` passes against a kit built from the branch;
  - P0's goldens hold with the steps pressed from the phone (states, verdicts, pressed);
  - `mobile-learner.e2e.ts` and `teach2-*.e2e.ts` pass unchanged.
- **Must not touch:** source outside the test and script files, except fixes found here, each named in the PR.
- **Gate:** common, plus `npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/instructor-phone.e2e.ts
  apps/demo/e2e/mobile-learner.e2e.ts < /dev/null` on both projects.

## Dependency order

```
P0 ─► P1 ─► P2 ─┬─► P3 ─┬─► P6 ─┐
                ├─► P4  │       ├─► P8
                └─► P5 ─┴─► P7 ─┘   (P7 after P3 and P5; P8 after all)
```
At most three executors at a time (P3, P4, P5). P0 and P1 are short and run first, alone.

## Effort

| Piece | h (est.) |
|---|---|
| P0 census and goldens | 2 |
| P1 host peers per transport | 3 |
| P2 protocol and guard | 2 |
| P3 host: PIN, grant, allow-list | 6 |
| P4 relay | 6 |
| P5 instructor's session | 4 |
| P6 view feed and note path | 6 |
| P7 phone's way in, Room page | 5 |
| P8 e2e, kit check, measurements | 6 |
| **Total** | **≈ 40 executor-h**, plus ≈ 4 h of review |

## Risks in the code

- **R1. The host trusts `from`.** See §7 and P1. Until P1 merges, no piece that admits a phone may merge.
- **R2. The relay's grant must arrive before the welcome.** Otherwise the first welcome copy is lean, and the phone
  starts without the sticky replays it needs (speed, pause, the loaded card). P3 orders the messages; P4's test
  checks the order on the wire.
- **R3. Re-sent commands after a host reload.** §5. Without P5's rule, the phone, like today's Remote, can give a
  command to a reloaded case.
- **R4. A remote `scenario load` starts the runner on the old body.** §2. The instructor is refused it. Today's
  same-browser Remote still has the defect; it is out of scope here and goes to the roadmap.
- **R5. The feed and the laptop must not drift.** One function computes both. P6's deep-equality test is the guard.
  A second classification on the phone is not allowed.
- **R6. Locators.** The Room page and the Remote gain controls; the e2e and kit-round tests use CSS locators. New
  controls use `ip-peer-*` classes and their own aria labels.
- **R7. The model-docs guard covers `apps/demo/src` and `packages/controller/src`.** Every piece regenerates the docs.

## Disagreements found (roadmap text, mock-ups, code)

1. The brief says a phone commanding is "impossible by design". The code already has a commanding remote role
   (`controller`) and an Instructor remote (`#/remote`). The refusal of a phone holds only in classroom mode
   (`--remote-roles viewer`, the default with `--static`). `pnpm relay` without `--static` lets any device command
   with the session code alone.
2. `views/remote.ts` says relay pairing is "version 1.1"; E124 is "v1.0 later rc".
3. The mock-ups (Phone 6 to 9) show overdue timers, "1:00 before it was due", "its rule is met" and a condition's last
   gas value on the phone. Instructor v2 on a remote has no record and no holds, and shows none of these on purpose
   (`rows.ts` header, `driver.ts` `vitalHolds`: "a follower … shows value against threshold only").
4. The Stages chip (Phone 6 onward) returns to a stage's start. The 29 Oct ruling on #170 says "no remote
   stageMarks". The driver places stage marks only while Instructor v2 is on the host's screen, and announces them
   only to a peer saying hello. Instructor v2 on a remote says "Return is available on the instructor's screen".
5. Judged objectives and notes: the mock-ups press them on the phone. The code writes them to the debrief only on the
   host (`link.ts` `add`), so a remote's judged objective is lost today.
6. "Add a note" after a mark (Phone 6, the paused board): the code carries a mark's note only with the bookmark at
   the press. There is no command to annotate an existing mark.
7. The lab row and "Send a gas · back 08:31" (Phone 7 to 9): the Gas sheet is not built on the laptop either
   (`teach2/sheets.ts`; #179's E127 row).
8. The ECG strip (Phone 9; #179's new E124 row: "one ECG strip"): samples never cross the wire, and a controller
   never renders waveforms (`remote-app.ts` header). A strip needs a follower engine on the phone.
9. "The three the card names for the phase" (#179's E124 row; the Phone 9 note): `pme-scenario/1` has no field
   naming a stage's vitals, and neither has the format v2 design (`scenario-format-v2.md`).
10. The status chip's states (Phone 6): sending, given, not applied. The code has a fourth outcome, no answer within
    15 s, which cannot honestly be called "not applied" (§4).
11. The Debrief chip (Phone 6 onward): the Debrief is a page on the laptop that reads the host's record. No command
    opens it, and a remote has no record.
12. E124's "persistent room code": the code keeps the session code across a reload only through `?session=` in the
    instructor's URL. E124's "device table with pings": the Room page says "no ping for rc.4". E124's "role picker":
    the role is chosen by the address today (`?join=` viewer, `#/remote` controller).
13. The relay README's Security paragraph ("commands come from the instructor's laptop alone") becomes untrue once
    P4 lands; P4 rewrites it.
14. The code against itself: a learner's phone can block the laptop's panel (§7, P1). And a remote's `scenario load`
    runs the card on the wrong body (§2, R4).

## Questions for the orchestrator

1. **The role on the wire.** A new `instructor` role, or `controller` with a PIN? **Recommend `instructor`.** The relay
   policy then reads in one line, the Room page and the record can name the phone, and no existing `controller` test
   changes meaning.
2. **The PIN.** Drawn by the app or chosen by the instructor; 4 or 6 digits; kept across sessions? **Recommend four
   random digits drawn at first use, changeable on the Room page, kept in the laptop's store, shown only behind a
   press-and-hold.** With the relay's per-address limit, 10 000 PINs at 5 tries a minute per phone outlast any class.
   Six digits are slower to type at the bedside. Behind the hold, a laptop mirrored to the projector does not show
   the PIN.
3. **The phone remembers the PIN?** In memory only (a reload asks again), or a grant token in the phone's
   `sessionStorage`? **Recommend memory only.** A reload is rare, four digits take two seconds, and a token is one
   more secret to expire and revoke.
4. **Two instructors** (§3). **Recommend B: one phone at a time, the newest takes over, the old one is told; the laptop
   always commands; no duplicate-press guard.** A lost phone never blocks the case, and a guard would be a lock the
   design's anti-goals forbid.
5. **The phone lost mid-case.** The case runs on, or pauses by itself? **Recommend: it runs on.** The panel never
   moves the case where the card did not say so, and the laptop still commands. The Room page says "lost at mm:ss".
6. **What the phone's rows read** (§6). (a) Today's remote reading: nothing new on the wire, but no overdue, no
   timings, and after a reload a step taken in a looping stage reads untaken. (b) A record of its own on the phone,
   seeded at hello: a large welcome, samples streamed, a second classification. (c) **The host's view feed
   (recommended).** One instructor-only event of ≤ 16 KB at ≤ 1 Hz, computed by the laptop's own functions: one
   source by construction.
7. **Returns to a stage's start from the phone.** Turn on the stage marks while an instructor is granted, and carry
   their labels in the feed? **Recommend yes.** It honours #170's point (no `ControllerSession` stage-mark API), but it
   revisits the ruling's effect, so the owner should say.
8. **Judged objectives and notes from the phone** through a new `note` command. **Recommend yes.** Without it, a
   judged objective pressed on the phone never reaches the debrief. It is the laptop's own action on a new wire
   shape, not a new power.
9. **The Debrief chip on the phone.** **Recommend: not in the role.** The chip says "Open the Debrief on the
   instructor's computer" until the layout plan decides. Opening a page on the laptop from the phone would be a
   command the laptop never sends.
10. **The A4 MH kit round through the phone.** **Recommend: the owner's manual smoke, not a gate.** The e2e covers the
    wire, and the round adds a human's thumb, which no test can stand in for.
11. **The learners' copy loses `scenario` and `note` `commandApplied`** (§7). **Recommend yes.** A mark's note can
    name a learner ("discuss: missed the K⁺"), and the learners' pages never read these events.
12. **Outside this plan, for the roadmap:** (a) today's same-browser Remote's `scenario load` on the wrong body (R4);
    (b) `pnpm relay` without `--static` lets any device command with the code. Should its default become `viewer`
    as well? **Recommend (b) yes, in P4, one line.** A LAN relay started by hand should not be weaker than the
    classroom's.
