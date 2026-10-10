# Gate note — FU-11 branch a: relay and wire boundary, audio ownership, alarm silence by priority, worker lifecycle, remote presence

Branch `fu-11-a`, from `origin/main` 48864439 (merged with `origin/main` at the gate: already up to date, 48864439).
Plan: `docs/plans/fu-11-hardening.md` (STATUS FIXED, base 48864439), Parts A (A0–A3), B (B1–B4), C (C1–C2) and F (F1–F3).
Executor: one local session (Opus 5.5) on a Mac shared with two other executors (load average up to ≈ 380 during the
first full e2e run: wall times are contended).

## 1. Summary

- **Blocks:** `check-blocks.py --branch a` before Task 1: `branch a: 51 find/replace blocks (0 chained), 19 creates;
  problems: 0`. Every block was applied by a script that requires each find to match exactly once; **51/51 byte-exact,
  0 re-anchored**, 19/19 creates verbatim.
- **Commits:** the plan (first commit, as the executor brief says — see §6), A0 fixture, one commit per task A1–A3,
  B1–B4, C1, C2, F1–F3, each pushed; one gate follow-up (§4: a command waiting at destroy is refused, not rejected).
- **Physiology:** no model equation, constant, band or acceptance number changed. Engine edits: device-tone lifecycle
  (B2, `defib.ts`) and alarm silence by priority (B4, `manager.ts`, owner ruling Q1).

## 2. Task ticks

- [x] A0 worktree, install, block check (0 problems), before-numbers, audit fixture
- [x] A1 one bounded iterative pass over wire messages (F01, BA10, BA11)
- [x] A2 a malformed peer never ends the relay (F01, BA10)
- [x] A3 the host takes only its own session; viewers cannot command; batches split by size and count (BA11, R50 F2, M13)
- [x] B1 a cancel stops a sounding voice (F19, BA08, R50 M12)
- [x] B2 defibrillator charge/ready tones end with their state (F19, BA08)
- [x] B3 a late audio unlock cannot outlive the monitor (BA09)
- [x] B4 a new higher-priority alarm breaks a lower-priority silence on every profile (AL01, Q1)
- [x] C1 every worker request settles once; a dead monitor says so (F06, BA06, R50 M15)
- [x] C2 a failed monitor is a refusal the controller hears (F06)
- [x] F1 the Remote owns the transports it creates (F18, BA07)
- [x] F2 the relay's "host left" reaches the session (BA12)
- [x] F3 every controller shows the host's speed and pause (K5, R50 M4)
- [x] Gate A Steps 1, 2, 4, 5 — [ ] **Step 3 (hidden tab) NOT achieved** (§5)

## 3. Before → after (prototype = the plan's "Prototype results"; measured = this branch)

| Task | Check | Prototype (before → after) | Measured here (red → green) |
|---|---|---|---|
| A1 | 12 000-deep hello; 262 145-char object | stack overflow; accepted → refused | `RangeError: Maximum call stack size exceeded`; object accepted → 3/3 green |
| A2 | relay: `null` signal, 262 145-byte frame, 12 000-deep hello | process exits 1 → survives | unit 1 red + 2 unhandled (`null.to`, `Max payload size exceeded`); e2e 4/6 red (deep-envelope already green after A1) → 3/3 unit, 6/6 e2e |
| A3 | BC wrong-session + over-budget command; viewer command; 1 Hz truth batch | applied 3; applied → applied 1; refused; 60/60 | applied **2** (A1 already refused the over-budget one); 4 unit red → applied 1; 4/4 unit, 2/2 e2e |
| B1 | cancel at 0.25 / 2.5 s (RMS) | 0.175 → < 1e-4 | 0.17501 / 0.17502 (both engines) → 4/4 e2e; unit 4 red → 6/6 |
| B2 | disarm ends the ready oscillator | never ends → ended | 2 unit red, 4 e2e red (`ended` false) → green |
| B3 | late unlock after destroy | `running` → `closed` | 2 e2e red → green |
| B4 | silence then a new higher-priority alarm | silenced 90 s → ends at once | manager 3 red (`silencedUntil` 91), sounder 1 red → green |
| C1 | worker request after native terminate / destroy | pending → rejected; toast | 10/10 audit-worker red (`pending`), toast absent → 12/12 (with C2; §4) |
| C2 | a target that rejects | host chain stalls → refusal acked | `Test timed out in 10000ms` → green |
| F1 | Remote two joins + destroy | open, open → closed, closed | 2 e2e red → green |
| F2 | relay host-offline notice | hostOnline true → false | unit 1 red, 2 e2e red → green |
| F3 | host speed/pause; Pause label with a slow host | ×1; flicker → follows; Resume throughout | unit red (`timeScale` undefined) → green; `fu11-pause-label` e2e was already green on the base (it was written after the K5 change: a regression guard, as the plan says) |

### The audit's regression tests (branch a's share)

| Audit file | Task | Red on 48864439 | Green here |
|---|---|---|---|
| audit-relay (signal-null, oversized, deep-envelope) | A2 (with A1) | relay exits 1 | 6/6 |
| audit-session-boundary | A3 (with A1) | applied 2 (3 before A1) | 2/2 |
| audit-audio-cancel (0.25 / 2.5 s) | B1 | RMS 0.175 | 4/4 |
| audit-audio-disarm (off / auto) | B2 (with B1) | not ended | 4/4 |
| audit-audio-unlock | B3 | `running` | 2/2 |
| audit-worker (command, snapshot, restore, capture12, destroy) | C1 | `pending` | 10/10 |
| audit-remote | F1 | open, open | 2/2 |
| audit-presence | F2 | true | 2/2 |

### B4: what a NEW higher-priority alarm does during a silence, per profile

| Skin | Silence config (skin data) | Before | After |
|---|---|---|---|
| zoll-like | mute 90 s, `cancelOnNewAlarm: false` (iec-defaults) | stays silenced 90 s | silence ends at once; same/lower priority still muted |
| ge-like | inherits iec-defaults (mute 90 s, false) | stays silenced 90 s | silence ends at once; same/lower priority still muted |
| lifepak-like | inherits iec-defaults (mute 90 s, false) | stays silenced 90 s | silence ends at once; same/lower priority still muted |
| saadat-like | mute 120 s, `cancelOnNewAlarm: true` | any new alarm ends the silence | unchanged (any new alarm) |
| philips-like | acknowledge (no mute timer), `cancelOnNewAlarm: true` | new alarms sound | unchanged |
| mindray-like | acknowledge (no mute timer), `cancelOnNewAlarm: true` | new alarms sound | unchanged |

Alarm PAUSE is unchanged on every skin (owner question Q7, open).

### Side effects and known limits (stated as the plan asks)

- **B1:** a silenced alarm's already-sounding pulse now stops at once instead of finishing its tail.
- **B1 / R50 M12 (known limit):** a bookmark restore to BEFORE a sounding ready tone stops it; a FORWARD restore between
  two bookmarks does not end a tone of the earlier timeline that started before the later bookmark (unit test pins both;
  no v1.0 consumer).

## 4. Deviation found at the gate: a command waiting at destroy is refused, not rejected (commit 68ffb0bb)

The first full e2e run failed `fu4`, `fu6` (both engines), `stage7d` (both) and `vent-link` with page errors
`"the monitor was destroyed"` (×2–×11 per test). Cause: C1's `destroy()` rejects every waiting request, and these pages
fire-and-forget `dispatch` (`void send(...)`) and then remount (`pm?.destroy()`) before the worker answers — the
rejection became an unhandled rejection. The same pattern is in the ventilator link port
(`void Promise.resolve(mon.dispatch(...)).then(...)`) and in `mount.ts`'s own ECG-filter command. With the base's
sources swapped in (same load), `fu6` and `stage7d` passed — so this was this branch's regression. (`showcase-clock`
also failed in that run — a Load button "not visible" for 90 s at load average ≈ 380 — but passed when re-run alone on
this branch and in the second full run: load, not this branch.)
Fix (worker-host.ts only): a COMMAND waiting at destroy, or sent after it, settles as a refusal
`{ accepted: false, tick: 0, reason: 'the monitor was destroyed' }` (a `DispatchResult`, like the worker's
'not initialised'); `snapshot`, `restore` and `capture12` still reject (audit-worker's destroy case, which uses a
snapshot, unchanged); a FAILURE (crash, silence) still rejects commands (audit-worker's command case). New regression
test `apps/demo/e2e/fu11-destroy-refuses.e2e.ts` (red: `rejected` on both engines → green). The orchestrator may prefer
to fix the callers instead; this kept the change inside branch a's files. Merge note: `worker-host.ts` is also edited by
b (restore) and d (`Host.core`); my extra hunks are in the request table, `command:` and `destroy:` — check them when b
merges.

Also found while running C1: `fu11-monitor-failed` shows the toast on C1 alone, but its un-awaited `link.send` stays
pending behind the host's stalled command chain until C2, so Playwright reports "Test ended" on the C1 commit; green from
C2 on (stated in C1's commit message).

## 5. Review Focus 1 — the hidden tab (Gate A Step 3): NOT ACHIEVED, not claimed

The plan's `zz-fu11-hidden.e2e.ts` was run HEADED (`--project=chromium --headed`, the three throttling switches dropped).
The monitor's page never became `hidden`: `expect.poll(visibilityState).toBe('hidden')` failed (received `visible`) with
(1) the plan's method (a second page — Playwright opens it as its own window), (2) minimising the page's window over CDP
(`Browser.setWindowBounds` minimized), (3) a second TAB in the same browser context over the browser CDP session
(`Target.createTarget` + `activateTarget`), with and without `Emulation.setFocusEmulationEnabled(false)`. So no gap was
measured and the watchdog's hidden-tab behaviour is **not verified on this machine**. The design guards remain as
coded (watchdog armed only while requests wait; ignores silence while hidden and within 30 s of a catch-up; resets when
this page itself was blocked). Recommended: a human runs it in a real Chrome (open `#/teach`, Pause or ×4, switch to
another tab ≥ 6.5 min, come back, Bookmark / a command; no "The monitor stopped" toast), or the orchestrator's session
re-tries with a visible desktop. The temporary file was deleted, never committed.

## 6. Suites (this branch, `CI=1`, local)

| check | result |
|---|---|
| `pnpm -r typecheck` | clean |
| fast set (`PME_TEST_SET=fast pnpm -r test`) | audio 11 files / **65** (before 58: +6 B1, +1 B4); skins 191; engine-core 316 files / 1406 passed, 1 skipped; controller 46 files / **240** (before 227: +3 A1, +3 A2, +4 A3, +1 C2, +1 F2, +1 F3); ventilator 97; renderer 27 files / 90 (before 90); validation 107 (+11 skipped); demo 24 files / 200 (before 200) — all passed |
| `pnpm build`; `check-notices` | ok; `check-notices: OK (3 governed files)` |
| `npx playwright test --retries=0` (both projects, after §4) | **131 passed, 31 skipped, 2 failed**: `stage6a` "host + remote + viewer over rtc" and `stage6a-latency` (rtc path), Chromium — the known macOS loopback-WebRTC failures (Part K2, branch c); both fail identically with the base's sources swapped in |
| `git status --short docs` after the e2e | the evidence screenshots were rewritten (branch c's K1 not merged): `git checkout -- docs/gates` |

Before-numbers (A0 Step 3, base 48864439): controller 227, audio 58, renderer 90, demo 200.

## 7. Deviations

- **The plan file IS committed on this branch** (first commit `cc9d7bf5`): the executor brief says so, overriding the
  plan's A0 Step 2 / R50 M6 ("not committed on this branch"). Its content is byte-identical to branch b's commit
  f8039fd1, so an add/add merge is clean as long as b does not change its copy; if b ticks its copy, the orchestrator
  resolves the add/add conflict by taking b's.
- §4 (commands refused at destroy, one extra commit and e2e file) and §5 (the hidden tab not achieved).
- Expected red counts differed from the plan where an earlier task of this branch had already fixed part of the case
  (A2 deep-envelope, A3 over-budget command: both by A1) and for F3's e2e (green on base by design). B3's "8 passed" line
  was 10 (the `audit-audio` filter also matches cancel 4 + disarm 4 + unlock 2).

## 8. Worktrees

`git worktree list` (read-only): this branch's worktree is `scratch/wt-fu-11-a`; it is removed after the merge.
