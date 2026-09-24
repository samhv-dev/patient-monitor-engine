# Stage 6a: Controllers and Transports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both control modes of R7 — a hidden same-screen instructor panel and a remote controller — speaking one command API over five pluggable transports (in-process, postMessage, BroadcastChannel, WebSocket relay, WebRTC), plus a viewer role that draws a second monitor from the host's snapshot and event stream without ever receiving a sample.

**Architecture:** `@pme/controller` holds a v1 wire protocol (`WireMessage` exactly as brief §7.5, session codes, per-sender sequence filtering, a runtime sample guard that backs the type-level guarantee), five `Transport` adapters that pass one shared conformance suite, a Node relay (`ws`) with rooms, host authority, a snapshot cache and WebRTC signalling, and three session roles: `HostSession` (owns the engine: commands in → dispatch → ack; events out, batched per frame; 1 Hz `state`; snapshot for whoever says hello), `ControllerSession` (commands with ids, resend-until-acked, host de-duplication, so a Wi-Fi drop never applies a command twice), and `ViewerSync` (restores the host snapshot, then mirrors every applied command at the host's tick while its clock follows the host 100 ms behind — sample-identical on the same build because the engine is deterministic). The panel and the remote are plain TypeScript + DOM, generated from a `Vocabulary` so Stage 2/5 parameters appear by themselves. The demo pages run `MonitorCore` on the main thread so the page has the engine in hand; `packages/engine-core` and `packages/renderer` are not modified.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2 (Node + happy-dom 20.14.5 for DOM tests), Vite 6.4, `ws` 8.21.3 (relay only), Playwright 1.63 against system Chrome for browser checks. Node ≥ 22.12 (global `WebSocket`, `BroadcastChannel`, `MessageChannel`; `--experimental-strip-types` runs the relay with no build step).

**Spec:** `docs/DESIGN-BRIEF.md` §3.4 (worker/main split), §3.7 (transports and authority), §4.9 (control flags, pin/release, ramps, stageGroup), §7.1–§7.5 (API names and types), §7.4 (scenario commands — the runner is Stage 6b); `docs/BUILD-PLAN.md` "Stage 6" (this plan is **6a**: transports + panel + remote + relay + viewer; **6b** = scenario runner, command log/replay and the ACLS demo) and "Monorepo layout"; `../research/00-orchestrator-rulings.md` R7, R10, R20; `../research/05-rendering-ux-integration.md` §3.2 (latency budget 70–140 ms) and §4 (integration patterns); `../research/01-commercial-simulators.md` §4 items 1–8, 22, 25–27 (CAE flags, onset per change, stage-then-commit, bookmarks, event log, mirrored monitor).

## Global Constraints

- **Paths** are relative to the Stage 6a worktree root (Task 1 creates it at `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6a`, a checkout of this repo on branch `stage-6a-controllers`). Run every command from there. Never work in `projects/patient-monitor-engine/repo/` itself: Stages 2 and 5 run concurrently and that checkout has other stages' uncommitted work.
- **pnpm is not on PATH on this Mac.** Every `pnpm` command in this plan is written `npx -y pnpm@9.15.9 …` (docs/gates/stage-1.md). Browser checks use the installed Google Chrome: `PW_SYSTEM_CHROME=1 npx playwright test <file>` (the Playwright browser CDN is unreachable here).
- **Ownership (binding, three stages run in parallel):** this stage creates or edits ONLY `packages/controller/**`, `apps/demo/stage6a*.html`, `apps/demo/src/stage6a/**`, `apps/demo/e2e/stage6a*.e2e.ts`, `apps/demo/package.json`, `apps/demo/vite.config.ts`, `apps/demo/index.html`, `docs/gates/stage-6a*`, `docs/plans/stage-6a-controllers.md`, root `package.json` (one devDependency + one script), `pnpm-lock.yaml` and `NOTICES.md` (three rows). It does **not** modify anything in `packages/engine-core/**` or `packages/renderer/**`; it uses their public exports read-only. If a task seems to need an engine or renderer change, stop and report it — the requests this plan already knows about are listed below and are NOT implemented here.
- **Strict TS as in Stages 0–1:** `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (no enums, no parameter properties, no namespaces), `verbatimModuleSyntax` (type-only imports use `import type`), `.ts` extensions in relative imports. No framework in the browser code: plain TypeScript + DOM.
- **Runtime dependencies:** none new in browser code. `ws` 8.21.3 (MIT) is a dependency of `@pme/controller` used only by `relay/` (Node); `src/index.ts` must never import `relay/`. Dev-only: `@types/ws` 8.18.1, `happy-dom` 20.14.5 (both MIT). Each gets a NOTICES row (Task 1).
- **Wire names are the brief's, exactly** (§7.5): `WireMessage = { v: 1; session; from; seq; sentAt } & ({kind:'hello'; role} | {kind:'command'; body} | {kind:'ack'; commandId; accepted; tick; reason?} | {kind:'event'; body: EngineEvent[]} | {kind:'snapshot'; body: PatientSnapshot})`; `Transport { kind; send; onMessage; onStatus; close }` with kinds `'in-process'|'postMessage'|'broadcastChannel'|'websocket'|'webrtc'` and statuses `'connecting'|'open'|'closed'|'error'`. Roles `'host'|'controller'|'viewer'`.
- **Session codes** are 6 characters from the 31-symbol alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L). **Every literal session code in tests and pages must obey it** — `'RLY234'` or `'LAT…'` silently fail (the host replaces an invalid code and the relay refuses it). This bit the prototype twice.
- **Raw samples never cross the wire** (brief §3.7): the types admit no sample field, `assertWireSafe` refuses typed arrays / ArrayBuffers / numeric arrays longer than 64 (1024 inside a snapshot) / keys `samples|sampleData|waveform|buffer`, and every transport calls it in `send()`.
- **Commits:** conventional commits, one per task, ending with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use your own model's attribution line if it differs). Never push to `main`; the last task opens a PR and does not merge (R20).
- Every engineering constant carries a `[ENG]` comment or a brief/research citation.

## Decisions this plan makes where the spec was silent or ambiguous

1. **Viewer synthesis = snapshot + mirrored commands, checked by beats.** The Stage 1 engine has no API to inject `beat`/`rhythmSegment` events into L2 (and adding one would touch `l2/ecg/**`, owned by Stage 5). The engine *is* deterministic (brief §3.3), so a viewer restores the host's snapshot and re-dispatches every applied command with `atTick` = the host's tick. The prototype showed this is **sample-identical** (max |Δ| = 0 over 10 s of ecgII, 48/48 beats with identical `seq` and `t`). Host `beat` events are still sent and the viewer compares them with its own: any disagreement (or a command that arrives after its tick, or a reconnect) makes it say `hello` again and resync from a fresh snapshot. The viewer draws `delayS` = 0.1 s behind the host — the jitter budget for mirrored commands. "Visually equivalent" (brief §3.7) is met with margin.
2. **`commandApplied.resolved` = `{ command, replay? }`** (`AppliedResolution`): the command as applied, with `atTick`. The host emits it when it dispatches (the tick is already known). `replay: true` marks the sticky commands (ECG filter, lead per lane, time pause/scale, bookmarks) a host re-sends right **before** a snapshot so a late joiner can set its lane chrome and learn pause/scale. The viewer de-duplicates by `commandId`, so an engine that later emits its own `commandApplied` (Stage 5) cannot make it apply a command twice.
3. **`state` at 1 Hz is synthesised by the host** from the targets it has dispatched (`values` = target, `control.hr = 'ramping'` until the ramp ends, `mode: 'manual'`) because the Stage 1 engine emits no `state`. When the engine starts emitting `state` (engine request E1), `HostSession` stops synthesising. The panel labels its readout "target / truth / displayed"; truth equals target until E1.
4. **`Vocabulary` shape** (brief names it, never defines it): `{ schema: 'pme-vocabulary/1', engineVersion, variables: VarSpec[], rhythms, modifiers: ModifierSpec[], devices: DeviceSpec[], ramp: {maxDurationS, curves}, constraints }` in `packages/controller/src/vocabulary.ts`. `vocabularyOf(engine)` uses `engine.vocabulary()` when it returns this schema, else `stage1Vocabulary()` (exactly what the Stage 1 engine accepts; a test dispatches every entry). Engine request E2 asks Stage 5 to return this shape.
5. **Snapshots go only to peers that asked.** A host answers every `hello` with sticky replays + a snapshot; the relay delivers a host snapshot only to peers that said hello since their last one (and caches it); a `ViewerSync` ignores snapshots it did not ask for (BroadcastChannel delivers to everyone). Sequence **gaps** are normal under the relay (acks and snapshots are routed), so peers drop only duplicates (`seq ≤ last` from the same sender); a lost link shows up as a transport `open` → resync.
6. **Duplicates and drops:** commands carry unique ids; a controller re-sends every unacked command on each transport `open` and on each host `hello`; the host keeps the last 500 acks by command id and answers a repeat with the cached ack **without dispatching again** (BUILD-PLAN Stage 6 acceptance 3).
7. **Stage then commit:** staged commands are sent with one `stageGroup`; the host gives every command of a group `atTick = (tick when the first arrives) + STAGE_LEAD_TICKS` (3 ticks = 60 ms), so they land on one tick even if ticks pass between arrivals (brief §4.9).
8. **Panel reveal:** `i` (not while typing), Ctrl+Shift+I (BUILD-PLAN; some browsers keep it for DevTools), 5 taps in the top-left 64 px corner within 3 s, or a three-finger long-press of 800 ms (BUILD-PLAN). All four toggle.
9. **Command coverage today:** `setTarget hr`, `setRhythm`, `setModifiers` (pvc, rsa, artefact.noise), `device ecg filter|lead` go to the engine; `time pause|resume|scale` are handled by the host (brief §7.2); `scenario bookmark|restoreBookmark` are handled by the host with snapshots; `scenario load|goto|trigger|pause|resume` go to an optional `scenario` hook (**Stage 6b plugs the runner in here**) and are otherwise rejected with "arrives in Stage 6b"; `time step|jump` likewise; `pin|release|setFactor|setMode` are rejected "needs MODELED mode (Stage 7)". Pin/Release buttons are generated for pinnable variables and disabled outside MODELED mode.
10. **Sound is host-local.** Only the same-screen panel has a sound switch; a remote has no speaker to switch.
11. **Demo monitors run `MonitorCore` on the main thread** (`apps/demo/src/stage6a/sim-monitor.ts`) — the renderer's own fallback path — because `MonitorHandle` does not expose `snapshot/restore` or clock control and the renderer is outside this stage (renderer request R-1).
12. **The remote gets its vocabulary from a local engine of the same build** (`vocabularyOf(createEngine())`); viewers need the same build anyway (the snapshot carries `engineVersion`; a mismatch shows "incompatible").
13. **Relay runs from source** with Node type stripping: `npx -y pnpm@9.15.9 relay` or `npx pme-relay` at the repo root (root devDependency on `@pme/controller` links the bin). No STUN/TURN for WebRTC (LAN, R7); headless Chrome cannot resolve its own mDNS `.local` candidates, so the WebRTC browser tests pass `--disable-features=WebRtcHideLocalIpsWithMdns` (headed browsers on a LAN resolve mDNS normally).
14. **Latency definition** (research 05 §3.2): *ack* = sender `send()` → ack received at the sender; *visible* = sender `send()` → the first host animation frame whose drawn sim time reaches the command's tick (epoch ms, one machine). Compositor time (≤ 1 frame) is not included and is stated as such in the gate note.

## Requests for the orchestrator (not implemented here)

| ID | Owner | Request | Why / what 6a does meanwhile |
|---|---|---|---|
| E1 | engine (Stage 2, `engine.ts`) | Emit brief §7.3 `state` at 1 Hz with truth `values` and `control` flags | 6a synthesises a target-derived `state`; stops as soon as the engine emits one |
| E2 | engine (Stage 5, `vocabulary()`) | Return the `pme-vocabulary/1` shape from `packages/controller/src/vocabulary.ts` | Controls fall back to `stage1Vocabulary()`; any other shape is ignored |
| E3 | engine (Stage 5, `commandApplied`) | If the engine emits `commandApplied`, put the applied command (with `atTick`) in `resolved.command` | 6a's host emits its own; viewers de-duplicate by `commandId` |
| R-1 | renderer | `MountOptions.role/transport` and `MonitorHandle.snapshot()/restore()/follow clock` for the worker path | Demo pages build `MonitorCore` on the main thread |
| R-2 | renderer | Fill the IIFE global `PatientMonitor.transports` from `@pme/controller`'s `transports` object | `@pme/controller` exports `transports` with the final keys |

## File map

| Path | Responsibility |
|---|---|
| `packages/controller/src/protocol.ts` | WireMessage v1, roles, Transport, WireCommand/WireEvent (brief §7.2/§7.3 variants not yet in engine-core), session codes, stamper, SeqFilter |
| `…/src/guard.ts` | Sample guard (`findSampleLeak`, `assertWireSafe`), `parseWireMessage` for untrusted input, `WIRE_LIMITS` |
| `…/src/transport/{base,in-process,post-message,broadcast-channel,backoff,relay-frames,websocket,webrtc}.ts` | The five adapters and their shared plumbing |
| `…/relay/{server,bin}.ts`, `relay/README.md` | Node relay: rooms, authority, snapshot cache, heartbeat, expiry, `/signal` |
| `…/src/vocabulary.ts` | `Vocabulary` type, `stage1Vocabulary()`, `vocabularyOf()` |
| `…/src/session/{host-session,controller-session,viewer-sync}.ts` | The three roles |
| `…/src/panel/{controls,staging,reveal,styles,render-controls,panel}.ts` | Pure builders, stage-then-commit, reveal gestures, CSS, generated controls, drawer |
| `…/src/remote/remote-app.ts` | Remote controller page logic |
| `…/src/index.ts` | Public API + `transports` |
| `…/test/**` | Unit, conformance, relay, session, DOM tests; `fakes/` (fake WebSocket, fake RTCPeerConnection, manual-clock host/viewer) |
| `apps/demo/stage6a.html`, `src/stage6a/{sim-monitor,links,host}.ts` | Host monitor + hidden panel + session code + open remote/viewer |
| `apps/demo/stage6a-remote.html`, `src/stage6a/remote.ts` | Remote controller page |
| `apps/demo/stage6a-viewer.html`, `src/stage6a/viewer.ts` | Viewer (second monitor) page |
| `apps/demo/e2e/stage6a{,-latency,-screens}.e2e.ts` | Browser smoke over 3 links, latency measurement, gate screenshots |
| `docs/gates/stage-6a.md`, `docs/gates/stage-6a/` | Gate note, latency.json, screenshots |

## Prototype evidence (scratchpad, before this plan was written)

All code in this plan was run in a scratch copy of the repo: 97 controller tests pass (20 files), whole-repo `typecheck`, `test`, `build` and `check-notices` pass, and the three Playwright files pass in headless Chrome. Measured on localhost (30 commands per path): visible p95 = 29 ms in-process, 27 ms BroadcastChannel, 33 ms relay, 26 ms WebRTC; ack p95 ≤ 7 ms. Viewer over each link: synced, beat drift 0.0 ms, resyncs 0, lag ≈ 90–100 ms.

---
### Task 1: Worktree, branch, dependencies and NOTICES

**Files:**
- Modify: `packages/controller/package.json`, `packages/controller/tsconfig.json`, `NOTICES.md`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Stage 1 on `main` (commit `b2bcd46` or later).
- Produces: branch `stage-6a-controllers` checked out at `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6a`; `ws`, `@types/ws`, `happy-dom` installed for `@pme/controller`; `packages/controller/tsconfig.json` includes `relay/`.

- [x] **Step 1: Create the worktree and branch from `main`**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin 2>/dev/null; git worktree add ../scratch/wt-stage-6a -b stage-6a-controllers main
cd ../scratch/wt-stage-6a
git log --oneline -1
npx -y pnpm@9.15.9 install --frozen-lockfile
```
Expected: `Preparing worktree (new branch 'stage-6a-controllers')`, the last `main` commit, and pnpm `Done`. (If the orchestrator already gave you a worktree on this branch, use it instead.) From here on, every command runs in `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6a`.

- [x] **Step 2: Add the dependencies**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller add ws@8.21.3
npx -y pnpm@9.15.9 --filter @pme/controller add -D @types/ws@8.18.1 happy-dom@20.14.5
```
Expected: `packages/controller/package.json` now has `"dependencies": { "@pme/engine-core": "workspace:*", "ws": "8.21.3" }` and `"devDependencies": { "@types/ws": "8.18.1", "happy-dom": "20.14.5" }`; `pnpm-lock.yaml` changed.

- [x] **Step 3: Include `relay/` in the controller typecheck**

In `packages/controller/tsconfig.json` replace `"include": ["src", "test", "vite.config.ts"]` with:
```json
  "include": ["src", "test", "relay", "vite.config.ts"]
```

- [x] **Step 4: Add the NOTICES rows** — append to the table in `NOTICES.md` (after `N-005`):
```markdown
| N-006 | ws 8.21.3 (relay runtime, Node only) | https://github.com/websockets/ws | MIT | WebSocket server for `packages/controller/relay`; never bundled into browser builds | 2026-09-24 |
| N-007 | @types/ws 8.18.1 (build only) | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Type definitions for ws | 2026-09-24 |
| N-008 | happy-dom 20.14.5 (test only) | https://github.com/capricorn86/happy-dom | MIT | DOM for the panel/remote unit tests; not redistributed | 2026-09-24 |
```
(If `main` has gained rows since, use the next free IDs.)

- [x] **Step 5: Verify**

Run:
```bash
npx -y pnpm@9.15.9 --filter @pme/controller test
(cd packages/controller && node --input-type=module -e "import('ws').then((m) => console.log(typeof m.WebSocketServer))")
node --experimental-strip-types scripts/check-notices.ts
```
Expected: `1 passed` (the Stage 0 version test), `function`, `check-notices: OK`.

- [x] **Step 6: Commit**

```bash
git add packages/controller/package.json packages/controller/tsconfig.json NOTICES.md pnpm-lock.yaml
git commit -m "chore(controller): ws relay dependency, happy-dom for DOM tests, NOTICES N-006..N-008" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wire protocol v1 — types, session codes, stamper, sequence filter

**Files:**
- Create: `packages/controller/src/protocol.ts`, `packages/controller/test/protocol.test.ts`, `packages/controller/test/types.test-d.ts`

**Interfaces:**
- Consumes: `@pme/engine-core` types `Command, DispatchResult, EngineEvent, NumericId, Measured, PatientSnapshot, Ramp, RhythmId, SimSeconds, StateVar, Tick`.
- Produces (used by every later task):
  - `type Role = 'host'|'controller'|'viewer'`; `type TransportKind`; `type TransportStatus`; `type ModelInput`; `type ControlFlag = 'modeled'|'pinned'|'ramping'|'override'`.
  - `type ExtraCommand` (brief §7.2 `pin`, `release`, `setFactor`, `setMode`, `scenario`, `time`), `type WireCommand = Command | ExtraCommand`, `type TimeCommand`, `type ScenarioCommand`.
  - `type ExtraEvent` (brief §7.3 `rhythmSegment`, `breath`, `marker`, `nibp`, `alarm`, `state`, `scenario`, `commandApplied`), `type WireEvent = EngineEvent | ExtraEvent`, `type StateEvent`, `type CommandAppliedEvent`, `interface AppliedResolution { command: WireCommand; replay?: boolean }`.
  - `type WireMessage` (brief §7.5 exactly), `type WireKind`, `type WireBody` (a message without its header), `type CommandInput` (a command without `id`/`issuedBy`, optional `id`).
  - `interface Transport` (brief §7.5 exactly); `interface ManagedTransport extends Transport { readonly status: TransportStatus }`.
  - `type AckResult = DispatchResult & { commandId: string; rttMs: number }`; `type MeasuredMap = Partial<Record<NumericId, Measured>>`.
  - `SESSION_ALPHABET`, `SESSION_CODE_RE`, `newSessionCode(randomValues?)`, `normalizeSessionCode(input): string | null`, `newPeerId(prefix)`.
  - `epochNow(): number` (epoch ms); `type Stamper = (body: WireBody) => WireMessage`; `createStamper(session, from, now?)`.
  - `class SeqFilter { check(m): 'accept'|'gap'|'duplicate'; forget(from); duplicates; gaps }`.

- [x] **Step 1: Write the failing tests**

`packages/controller/test/protocol.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  createStamper,
  newSessionCode,
  normalizeSessionCode,
  SeqFilter,
  SESSION_ALPHABET,
  SESSION_CODE_RE,
  type WireMessage,
} from '../src/protocol.ts';

describe('session codes', () => {
  it('uses 31 unambiguous symbols (no 0/O/1/I/L)', () => {
    expect(SESSION_ALPHABET).toHaveLength(31);
    expect(SESSION_ALPHABET).not.toMatch(/[01ILO]/);
    expect(new Set(SESSION_ALPHABET).size).toBe(31);
    for (const ch of SESSION_ALPHABET) expect(SESSION_CODE_RE.test(ch.repeat(6))).toBe(true);
  });

  it('generates valid 6-character codes', () => {
    for (let i = 0; i < 200; i++) expect(newSessionCode()).toMatch(SESSION_CODE_RE);
    expect(newSessionCode((a) => a.fill(0))).toBe('AAAAAA');
    expect(newSessionCode((a) => a.fill(30))).toBe('999999');
  });

  it('normalises typed input and rejects ambiguous characters', () => {
    expect(normalizeSessionCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeSessionCode('ABC23')).toBeNull();
    expect(normalizeSessionCode('ABC10O')).toBeNull();
    expect(normalizeSessionCode('ILLEGA')).toBeNull();
  });
});

describe('stamper and sequence filter', () => {
  it('stamps v, session, from, an increasing seq and sentAt', () => {
    let t = 1000;
    const stamp = createStamper('ABC234', 'host-x', () => t++);
    const a = stamp({ kind: 'hello', role: 'host' });
    const b = stamp({ kind: 'ack', commandId: 'c1', accepted: true, tick: 3 });
    expect(a).toEqual({ v: 1, session: 'ABC234', from: 'host-x', seq: 1, sentAt: 1000, kind: 'hello', role: 'host' });
    expect(b.seq).toBe(2);
    expect(b.sentAt).toBe(1001);
  });

  it('drops duplicates and older messages per sender, counts gaps', () => {
    const f = new SeqFilter();
    const m = (from: string, seq: number) => ({ from, seq }) as Pick<WireMessage, 'from' | 'seq'>;
    expect(f.check(m('a', 1))).toBe('accept');
    expect(f.check(m('a', 2))).toBe('accept');
    expect(f.check(m('a', 2))).toBe('duplicate');
    expect(f.check(m('a', 1))).toBe('duplicate'); // out of order ⇒ older ⇒ dropped
    expect(f.check(m('b', 1))).toBe('accept'); // independent per sender
    expect(f.check(m('a', 5))).toBe('gap');
    expect(f.check(m('a', 4))).toBe('duplicate');
    expect([f.duplicates, f.gaps]).toEqual([3, 1]);
    f.forget('a');
    expect(f.check(m('a', 1))).toBe('accept');
  });
});
```

`packages/controller/test/types.test-d.ts` (the type-level half of "samples never cross the wire"; `tsc` checks it, Vitest does not run it because it does not match `*.test.ts`):
```ts
// Type-level half of "raw samples never cross the wire": checked by `tsc` (pnpm typecheck), not run.
import type { Transport, WireMessage } from '../src/protocol.ts';

declare const t: Transport;
const header = { v: 1 as const, session: 'ABC234', from: 'h', seq: 1, sentAt: 0 };

// A real event batch compiles.
t.send({ ...header, kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });

// @ts-expect-error — there is no 'samples' message kind.
t.send({ ...header, kind: 'samples', body: new Float32Array(500) });

// @ts-expect-error — an event body is EngineEvent[], never a typed array.
t.send({ ...header, kind: 'event', body: new Float32Array(500) });

// @ts-expect-error — no event variant has a sample field.
t.send({ ...header, kind: 'event', body: [{ type: 'measurement', t: 1, values: {}, samples: new Float32Array(10) }] });

// @ts-expect-error — `v` is the literal 1.
const bad: WireMessage = { ...header, v: 2, kind: 'hello', role: 'host' };
void bad;
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/protocol.test.ts`
Expected: FAIL — `Failed to load url ../src/protocol.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/protocol.ts`:
```ts
// Wire protocol v1 (brief §7.5, §3.7). One device (the host) owns the simulation: commands go in, events and
// low-rate state come out, snapshots serve late joiners. Raw samples never cross the wire — the types below
// have no field that can hold one, and guard.ts refuses any message that tries (typed arrays, long numeric runs).
import type {
  Command,
  DispatchResult,
  EngineEvent,
  NumericId,
  PatientSnapshot,
  Ramp,
  RhythmId,
  SimSeconds,
  StateVar,
  Tick,
} from '@pme/engine-core';

export type Role = 'host' | 'controller' | 'viewer';
export type TransportKind = 'in-process' | 'postMessage' | 'broadcastChannel' | 'websocket' | 'webrtc';
export type TransportStatus = 'connecting' | 'open' | 'closed' | 'error';
export type ModelInput = 'hrFactor' | 'svrFactor' | 'contractilityFactor' | 'vo2Factor' | 'vco2Factor';
export type ControlFlag = 'modeled' | 'pinned' | 'ramping' | 'override';

type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/**
 * Brief §7.2 Command variants that @pme/engine-core does not export yet (its Stage 1 union is a subset).
 * Shapes are copied verbatim from the brief; `doc` is `unknown` until Stage 6b defines ScenarioDoc.
 * When engine-core adds a variant, delete it here — the union below stays valid either way.
 */
export type ExtraCommand = CommandBase &
  (
    | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
    | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
    | { type: 'setFactor'; input: ModelInput; factor: number; ramp?: Ramp }
    | { type: 'setMode'; mode: 'manual' | 'modeled' }
    | {
        type: 'scenario';
        action: 'load' | 'goto' | 'trigger' | 'pause' | 'resume' | 'bookmark' | 'restoreBookmark';
        target?: string;
        doc?: unknown;
      }
    | { type: 'time'; action: 'pause' | 'resume' | 'scale' | 'step' | 'jump'; value?: number }
  );
/** Brief §7.2 `Command` as it travels on the wire. */
export type WireCommand = Command | ExtraCommand;
export type TimeCommand = Extract<ExtraCommand, { type: 'time' }>;
export type ScenarioCommand = Extract<ExtraCommand, { type: 'scenario' }>;

/** Brief §7.3 EngineEvent variants not yet in engine-core's Stage 1 union (verbatim shapes). */
export type ExtraEvent =
  | { type: 'rhythmSegment'; t: SimSeconds; rhythm: RhythmId; seed: number; templateId?: string }
  | {
      type: 'breath'; t: SimSeconds; seq: number; kind: 'spont' | 'mech' | 'bvm' | 'gasp';
      tiS: number; teS: number; vtMl: number; etco2True: number;
    }
  | {
      type: 'marker'; t: SimSeconds; kind: 'paceSpike' | 'syncR' | 'shock' | 'chargeStart' | 'chargeReady' | 'disarm';
      data?: Record<string, number | boolean>;
    }
  | {
      type: 'nibp'; t: SimSeconds; phase: 'idle' | 'inflating' | 'deflating' | 'done' | 'failed'; cuffMmHg?: number;
      nextInS?: number; result?: { sys: number; dia: number; map: number; pr: number };
    }
  | {
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
    }
  | {
      type: 'state'; t: SimSeconds; tick: Tick; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
    }
  | { type: 'scenario'; t: SimSeconds; stateId: string; transitionId?: string }
  | { type: 'commandApplied'; commandId: string; tick: Tick; resolved: unknown; ignored?: string[] };
/** Brief §7.3 `EngineEvent` as it travels on the wire. */
export type WireEvent = EngineEvent | ExtraEvent;
export type StateEvent = Extract<ExtraEvent, { type: 'state' }>;
export type CommandAppliedEvent = Extract<ExtraEvent, { type: 'commandApplied' }>;

/**
 * What a host puts in `commandApplied.resolved` (this plan's definition; the brief leaves `resolved` open).
 * `command` carries `atTick` = the tick the host applies it on, so viewers can mirror it exactly.
 * `replay: true` marks the sticky display/time/bookmark commands a host re-sends before a snapshot.
 */
export interface AppliedResolution {
  command: WireCommand;
  replay?: boolean;
}

/** Brief §7.5, exactly. */
export type WireMessage = { v: 1; session: string; from: string; seq: number; sentAt: number } & (
  | { kind: 'hello'; role: Role }
  | { kind: 'command'; body: WireCommand }
  | { kind: 'ack'; commandId: string; accepted: boolean; tick: Tick; reason?: string }
  | { kind: 'event'; body: WireEvent[] } // batched per frame, never samples
  | { kind: 'snapshot'; body: PatientSnapshot }
);
export type WireKind = WireMessage['kind'];
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A WireMessage without its envelope header (what callers build; a Stamper adds the header). */
export type WireBody = DistributiveOmit<WireMessage, 'v' | 'session' | 'from' | 'seq' | 'sentAt'>;
/** A command without id/issuedBy (ControllerSession fills them). */
export type CommandInput = DistributiveOmit<WireCommand, 'id' | 'issuedBy'> & { id?: string };

/** Brief §7.5, exactly. */
export interface Transport {
  readonly kind: TransportKind;
  send(m: WireMessage): void;
  onMessage(fn: (m: WireMessage) => void): () => void;
  onStatus(fn: (s: TransportStatus) => void): () => void;
  close(): void;
}
/** Every transport in this package also exposes its current status (onStatus replays it on subscribe). */
export interface ManagedTransport extends Transport {
  readonly status: TransportStatus;
}

export type AckResult = DispatchResult & { commandId: string; rttMs: number };
export type MeasuredMap = Partial<Record<NumericId, import('@pme/engine-core').Measured>>;

// --- session codes ------------------------------------------------------------------------------------------
/** 31 symbols: no 0/O, 1/I/L — unambiguous when read off a projector or typed on a phone [ENG]. */
export const SESSION_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SESSION_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

/** A random 6-character session code (31^6 ≈ 8.9e8 codes). */
export function newSessionCode(randomValues: (a: Uint32Array) => Uint32Array = (a) => crypto.getRandomValues(a)): string {
  const r = randomValues(new Uint32Array(6));
  let s = '';
  for (let i = 0; i < 6; i++) s += SESSION_ALPHABET[(r[i] as number) % SESSION_ALPHABET.length];
  return s;
}

/** Upper-cases and strips spaces/dashes; returns null unless the result is a valid code. */
export function normalizeSessionCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, '');
  return SESSION_CODE_RE.test(s) ? s : null;
}

/** A random peer id (per page load; seq numbers restart only with a new id). */
export function newPeerId(prefix: string): string {
  return `${prefix}-${newSessionCode().toLowerCase()}`;
}

// --- envelope stamping and sequence filtering ----------------------------------------------------------------
/** Wall clock used for sentAt: epoch milliseconds (comparable across windows of one machine). */
export const epochNow = (): number => performance.timeOrigin + performance.now();

export type Stamper = (body: WireBody) => WireMessage;
/** Adds {v, session, from, seq, sentAt}. seq starts at 1 and never restarts for this `from`. */
export function createStamper(session: string, from: string, now: () => number = epochNow): Stamper {
  let seq = 0;
  return (body) => ({ v: 1, session, from, seq: ++seq, sentAt: now(), ...body }) as WireMessage;
}

/**
 * Per-sender sequence filter. Transports are ordered, so a seq at or below the last one seen from the same
 * sender is a duplicate (a resend after reconnect, or the same message over two paths) and is dropped.
 * A jump (seq > last + 1) is accepted and counted as a gap; a viewer resyncs on a gap.
 */
export class SeqFilter {
  private readonly last = new Map<string, number>();
  duplicates = 0;
  gaps = 0;

  /** 'accept' | 'gap' (accepted, but messages were missed) | 'duplicate' (drop it). */
  check(m: Pick<WireMessage, 'from' | 'seq'>): 'accept' | 'gap' | 'duplicate' {
    const prev = this.last.get(m.from);
    if (prev !== undefined && m.seq <= prev) {
      this.duplicates++;
      return 'duplicate';
    }
    this.last.set(m.from, m.seq);
    if (prev !== undefined && m.seq > prev + 1) {
      this.gaps++;
      return 'gap';
    }
    return 'accept';
  }

  forget(from: string): void {
    this.last.delete(from);
  }
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/protocol.test.ts && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: `5 passed`; typecheck exits 0 (every `@ts-expect-error` in `types.test-d.ts` is used — if one line compiled, tsc would report "Unused '@ts-expect-error' directive").

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/protocol.ts packages/controller/test/protocol.test.ts packages/controller/test/types.test-d.ts
git commit -m "feat(controller): WireMessage v1, session codes, stamper and per-sender sequence filter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Runtime sample guard and untrusted-input parser

**Files:**
- Create: `packages/controller/src/guard.ts`, `packages/controller/test/guard.test.ts`

**Interfaces:**
- Consumes: `WireMessage` (Task 2); `createEngine` (engine-core) in the test.
- Produces: `WIRE_LIMITS = { maxBytes: 262144, eventNumericArray: 64, snapshotNumericArray: 1024 }`; `FORBIDDEN_KEYS`; `class WireSafetyError extends Error`; `findSampleLeak(m): string | null`; `assertWireSafe(m): void` (throws `WireSafetyError`); `parseWireMessage(data: unknown): WireMessage | null` (JSON string or object; validates header, kind-specific fields, size and samples).

- [x] **Step 1: Write the failing test**

`packages/controller/test/guard.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { assertWireSafe, findSampleLeak, parseWireMessage, WIRE_LIMITS, WireSafetyError } from '../src/guard.ts';
import { createStamper, type WireMessage } from '../src/protocol.ts';
import { createEngine } from '@pme/engine-core';

const stamp = createStamper('ABC234', 'host-1');

describe('sample guard (runtime half of "raw samples never cross the wire")', () => {
  it('passes real traffic: events, commands and a real engine snapshot', () => {
    const e = createEngine({ seed: 3 });
    e.advanceTo(20);
    const events: WireMessage = stamp({ kind: 'event', body: [{ type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } }] });
    const snap: WireMessage = stamp({ kind: 'snapshot', body: e.snapshot() });
    expect(findSampleLeak(events)).toBeNull();
    expect(findSampleLeak(snap)).toBeNull();
    expect(JSON.stringify(snap).length).toBeLessThan(WIRE_LIMITS.maxBytes);
  });

  it('refuses typed arrays, ArrayBuffers, long numeric runs and sample-named keys anywhere', () => {
    const ev = (extra: object) => ({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'measurement', t: 0, values: {}, ...extra }] }) as unknown as WireMessage;
    expect(findSampleLeak(ev({ x: new Float32Array(4) }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: { y: new ArrayBuffer(8) } }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 65 }, (_, i) => i) }))).toMatch(/numeric array of 65/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 64 }, (_, i) => i) }))).toBeNull();
    expect(findSampleLeak(ev({ samples: [1, 2] }))).toMatch(/forbidden key/);
    expect(() => assertWireSafe(ev({ waveform: [] }))).toThrow(WireSafetyError);
  });

  it('allows up to 1024-long numeric arrays only inside a snapshot', () => {
    const big = Array.from({ length: 1000 }, () => 0);
    const s = stamp({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: '0', seed: 1, tick: 0, state: { big } } });
    expect(findSampleLeak(s)).toBeNull();
    const s2 = { ...s, body: { ...(s as Extract<WireMessage, { kind: 'snapshot' }>).body, state: { big: [...big, ...big] } } } as WireMessage;
    expect(findSampleLeak(s2)).toMatch(/2000/);
  });
});

describe('parseWireMessage (untrusted input)', () => {
  const good = stamp({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } });
  it('accepts a JSON string or an object', () => {
    expect(parseWireMessage(JSON.stringify(good))).toEqual(good);
    expect(parseWireMessage(good)).toEqual(good);
  });
  it('rejects malformed, wrong-version, unknown-kind, oversized and sample-carrying input', () => {
    expect(parseWireMessage('{nope')).toBeNull();
    expect(parseWireMessage({ ...good, v: 2 })).toBeNull();
    expect(parseWireMessage({ ...good, kind: 'samples' })).toBeNull();
    expect(parseWireMessage({ ...good, seq: 0 })).toBeNull();
    expect(parseWireMessage({ ...good, body: { type: 'setTarget' } })).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'hello', role: 'host' }), role: 'admin' })).toBeNull();
    expect(parseWireMessage('x'.repeat(WIRE_LIMITS.maxBytes + 1))).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'x', data: new Float32Array(2) }] })).toBeNull();
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/guard.test.ts`
Expected: FAIL — cannot load `../src/guard.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/guard.ts`:
```ts
// Runtime half of the "raw samples never cross the wire" guarantee (brief §3.7, §7.5), plus envelope
// validation for untrusted input (relay, postMessage from other frames, WebSocket, DataChannel).
import type { WireMessage } from './protocol.ts';

export const WIRE_LIMITS = {
  /** Largest serialised message accepted anywhere (a Stage 1 snapshot is ≈ 7 KB) [ENG]. */
  maxBytes: 256 * 1024,
  /** Longest all-numeric array allowed in commands and events (0.13 s of ECG at 500 Hz) [ENG]. */
  eventNumericArray: 64,
  /** Longest all-numeric array allowed in a snapshot (the QRS detector history is 128) [ENG]. */
  snapshotNumericArray: 1024,
} as const;

/** Keys that only a waveform leak would use. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['samples', 'sampleData', 'waveform', 'buffer']);

export class WireSafetyError extends Error {
  override readonly name = 'WireSafetyError';
}

/** Returns a description of the first sample-like payload in `m`, or null when the message is clean. */
export function findSampleLeak(m: WireMessage): string | null {
  const limit = m.kind === 'snapshot' ? WIRE_LIMITS.snapshotNumericArray : WIRE_LIMITS.eventNumericArray;
  const seen = new Set<object>();
  const walk = (v: unknown, path: string): string | null => {
    if (v === null || typeof v !== 'object') return null;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return `${path}: binary data (${v.constructor.name})`;
    if (seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > limit && v.every((x) => typeof x === 'number')) return `${path}: numeric array of ${v.length} > ${limit}`;
      for (let i = 0; i < v.length; i++) {
        const r = walk(v[i], `${path}[${i}]`);
        if (r) return r;
      }
      return null;
    }
    for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: forbidden key`;
      const r = walk(x, `${path}.${k}`);
      if (r) return r;
    }
    return null;
  };
  return walk(m, 'message');
}

/** Throws WireSafetyError when `m` carries samples. Every transport calls this in send(). */
export function assertWireSafe(m: WireMessage): void {
  const leak = findSampleLeak(m);
  if (leak) throw new WireSafetyError(`refusing to send sample data: ${leak}`);
}

const KINDS = new Set(['hello', 'command', 'ack', 'event', 'snapshot']);
const ROLES = new Set(['host', 'controller', 'viewer']);

/**
 * Parses and validates untrusted input (a JSON string or a structured-clone object). Returns null for anything
 * that is not a well-formed v1 WireMessage, is too large, or carries samples.
 */
export function parseWireMessage(data: unknown): WireMessage | null {
  let o: unknown = data;
  if (typeof data === 'string') {
    if (data.length > WIRE_LIMITS.maxBytes) return null;
    try {
      o = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (o === null || typeof o !== 'object') return null;
  const m = o as Record<string, unknown>;
  if (m.v !== 1 || typeof m.session !== 'string' || typeof m.from !== 'string') return null;
  if (!Number.isInteger(m.seq) || (m.seq as number) < 1 || typeof m.sentAt !== 'number') return null;
  if (typeof m.kind !== 'string' || !KINDS.has(m.kind)) return null;
  switch (m.kind) {
    case 'hello':
      if (!ROLES.has(m.role as string)) return null;
      break;
    case 'command': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.id !== 'string' || typeof b.type !== 'string' || typeof b.issuedBy !== 'string') return null;
      break;
    }
    case 'ack':
      if (typeof m.commandId !== 'string' || typeof m.accepted !== 'boolean' || typeof m.tick !== 'number') return null;
      break;
    case 'event':
      if (!Array.isArray(m.body) || !m.body.every((e) => e !== null && typeof e === 'object' && typeof (e as { type?: unknown }).type === 'string')) return null;
      break;
    case 'snapshot': {
      const b = m.body as Record<string, unknown> | null;
      if (!b || typeof b !== 'object' || typeof b.schema !== 'string' || typeof b.tick !== 'number') return null;
      break;
    }
  }
  const msg = o as WireMessage;
  return findSampleLeak(msg) ? null : msg;
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/guard.test.ts`
Expected: `5 passed`. (A real Stage 1 snapshot is ≈ 6–7 KB and its longest numeric array is the QRS detector's 128-entry history — hence the 1024 snapshot limit.)

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/guard.ts packages/controller/test/guard.test.ts
git commit -m "feat(controller): runtime sample guard and WireMessage validation for untrusted input" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Transport base, in-process transport and the shared conformance suite

**Files:**
- Create: `packages/controller/src/transport/base.ts`, `packages/controller/src/transport/in-process.ts`, `packages/controller/test/helpers.ts`, `packages/controller/test/transport/conformance.ts`, `packages/controller/test/transport/in-process.test.ts`

**Interfaces:**
- Consumes: `assertWireSafe`, `parseWireMessage` (Task 3); `ManagedTransport`, `WireMessage`, `createStamper` (Task 2).
- Produces:
  - Test helpers (`test/helpers.ts`, used by every later test): `waitFor(pred, timeoutMs = 2000, what?)`, `waitStatus(t, status, ms?)`, `collect(t): WireMessage[]`, `sleep(ms)`.
  - `abstract class TransportBase implements ManagedTransport` — `send(m)` runs `assertWireSafe` (throws) then drops silently unless `status === 'open'`; `onStatus(fn)` calls `fn(currentStatus)` at once; `close()` → `'closed'`; subclasses implement `protected write(m)` and `protected teardown()`, and call `protected setStatus(s)` and `protected deliver(data)` (validates with `parseWireMessage`, counts `rejected`).
  - `createInProcessHub(): { connect(): ManagedTransport }` — every endpoint hears every other endpoint (never itself), asynchronously, as a structured clone.
  - Test module `conformance.ts`: `SESSION = 'ABC234'`, `HOST_ID = 'host-1'`, `CTL_ID = 'ctl-1'`, `interface TransportPair { a; b; cleanup(): Promise<void> }`, `runTransportConformance(kind, makePair)`. `a` plays host (sends `event`s), `b` a controller (sends `command`s) — the relay routes only those directions.

- [x] **Step 1: Write the helpers, the conformance suite and the failing in-process test**

`packages/controller/test/helpers.ts`:
```ts
// Shared test helpers for @pme/controller.
import type { ManagedTransport, TransportStatus, WireMessage } from '../src/protocol.ts';

/** Poll until `pred()` is true (default 2 s). */
export async function waitFor(pred: () => boolean, timeoutMs = 2000, what = 'condition'): Promise<void> {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

export const waitStatus = (t: ManagedTransport, s: TransportStatus, ms = 2000) => waitFor(() => t.status === s, ms, `status ${s}`);

/** Collect every message a transport receives. */
export function collect(t: ManagedTransport): WireMessage[] {
  const got: WireMessage[] = [];
  t.onMessage((m) => got.push(m));
  return got;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

`packages/controller/test/transport/conformance.ts`:
```ts
// One behavioural contract, run against all five transports (brief §7.5). `a` plays the host (sends events),
// `b` a controller (sends commands) — the relay only routes those directions, the others route everything.
import { afterEach, describe, expect, it } from 'vitest';
import { WireSafetyError } from '../../src/guard.ts';
import { createStamper, type ManagedTransport, type TransportKind, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

export interface TransportPair {
  a: ManagedTransport; // host side
  b: ManagedTransport; // controller side
  cleanup(): Promise<void>;
}

export const SESSION = 'ABC234';
export const HOST_ID = 'host-1';
export const CTL_ID = 'ctl-1';
const hostMsg = createStamper(SESSION, HOST_ID);
const ctlMsg = createStamper(SESSION, CTL_ID);
const event = (n: number): WireMessage =>
  hostMsg({ kind: 'event', body: [{ type: 'measurement', t: n, values: { hr: { value: 60 + n, flag: 'valid', at: n } } }] });
const command = (n: number): WireMessage =>
  ctlMsg({ kind: 'command', body: { id: `c${n}`, issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 60 + n } });
const only = (list: WireMessage[], kind: WireMessage['kind']) => list.filter((m) => m.kind === kind);

export function runTransportConformance(kind: TransportKind, makePair: () => Promise<TransportPair>): void {
  describe(`transport conformance: ${kind}`, () => {
    let pair: TransportPair | null = null;
    const open = async () => {
      pair = await makePair();
      await waitStatus(pair.a, 'open');
      await waitStatus(pair.b, 'open');
      return pair;
    };
    afterEach(async () => {
      await pair?.cleanup();
      pair = null;
    });

    it('reports its kind and replays the current status to a new subscriber', async () => {
      const { a, b } = await open();
      expect(a.kind).toBe(kind);
      expect(b.kind).toBe(kind);
      const seen: string[] = [];
      a.onStatus((s) => seen.push(s));
      expect(seen).toEqual(['open']);
    });

    it('delivers host → controller and controller → host, deep-equal', async () => {
      const { a, b } = await open();
      const atA = collect(a);
      const atB = collect(b);
      const e = event(1);
      const c = command(1);
      a.send(e);
      b.send(c);
      await waitFor(() => only(atB, 'event').length === 1 && only(atA, 'command').length === 1);
      expect(only(atB, 'event')[0]).toEqual(e);
      expect(only(atA, 'command')[0]).toEqual(c);
    });

    it('keeps order over 50 messages and never echoes to the sender', async () => {
      const { a, b } = await open();
      const atA = collect(a);
      const atB = collect(b);
      for (let i = 0; i < 50; i++) a.send(event(100 + i));
      await waitFor(() => only(atB, 'event').length === 50);
      expect(only(atB, 'event').map((m) => m.seq)).toEqual([...only(atB, 'event').map((m) => m.seq)].sort((x, y) => x - y));
      await sleep(20);
      expect(only(atA, 'event')).toEqual([]);
    });

    it('stops delivering to an unsubscribed listener', async () => {
      const { a, b } = await open();
      const got: WireMessage[] = [];
      const off = b.onMessage((m) => got.push(m));
      off();
      a.send(event(7));
      await sleep(30);
      expect(only(got, 'event')).toEqual([]);
    });

    it('refuses sample data with WireSafetyError and sends nothing', async () => {
      const { a, b } = await open();
      const atB = collect(b);
      const leak = { ...event(9), body: [{ type: 'measurement', t: 9, values: {}, samples: new Float32Array(500) }] };
      expect(() => a.send(leak as unknown as WireMessage)).toThrow(WireSafetyError);
      await sleep(30);
      expect(only(atB, 'event')).toEqual([]);
    });

    it('goes to closed on close(), and later sends are silent no-ops', async () => {
      const { a, b } = await open();
      const atB = collect(b);
      a.close();
      expect(a.status).toBe('closed');
      expect(() => a.send(event(11))).not.toThrow();
      await sleep(30);
      expect(only(atB, 'event')).toEqual([]);
    });
  });
}
```

`packages/controller/test/transport/in-process.test.ts`:
```ts
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('in-process', async () => {
  const hub = createInProcessHub();
  const a = hub.connect();
  const b = hub.connect();
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/in-process.test.ts`
Expected: FAIL — cannot load `../../src/transport/in-process.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/transport/base.ts`:
```ts
// Shared plumbing for every transport: listener sets, status replay on subscribe, send-side sample guard,
// receive-side validation. Subclasses implement write() and teardown() and call deliver()/setStatus().
import { assertWireSafe, parseWireMessage } from '../guard.ts';
import type { ManagedTransport, TransportKind, TransportStatus, WireMessage } from '../protocol.ts';

export abstract class TransportBase implements ManagedTransport {
  abstract readonly kind: TransportKind;
  private readonly msgFns = new Set<(m: WireMessage) => void>();
  private readonly statusFns = new Set<(s: TransportStatus) => void>();
  private current: TransportStatus = 'connecting';
  protected closed = false;
  /** Messages refused by parseWireMessage (malformed, oversized or carrying samples). */
  rejected = 0;

  get status(): TransportStatus {
    return this.current;
  }

  /** Throws WireSafetyError for sample data; silently drops after close() or while not open. */
  send(m: WireMessage): void {
    assertWireSafe(m);
    if (this.closed || this.current !== 'open') return;
    this.write(m);
  }

  onMessage(fn: (m: WireMessage) => void): () => void {
    this.msgFns.add(fn);
    return () => {
      this.msgFns.delete(fn);
    };
  }

  /** Calls `fn` at once with the current status, then on every change. */
  onStatus(fn: (s: TransportStatus) => void): () => void {
    this.statusFns.add(fn);
    fn(this.current);
    return () => {
      this.statusFns.delete(fn);
    };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.teardown();
    this.setStatus('closed');
  }

  protected abstract write(m: WireMessage): void;
  protected abstract teardown(): void;

  protected setStatus(s: TransportStatus): void {
    if (s === this.current) return;
    if (this.closed && s !== 'closed') return;
    this.current = s;
    for (const fn of [...this.statusFns]) fn(s);
  }

  /** Validate untrusted input, then hand it to the listeners. */
  protected deliver(data: unknown): void {
    if (this.closed) return;
    const m = parseWireMessage(data);
    if (!m) {
      this.rejected++;
      return;
    }
    for (const fn of [...this.msgFns]) fn(m);
  }
}
```

`packages/controller/src/transport/in-process.ts`:
```ts
// Same-page transport (brief §3.7 `in-process`): a hub that fans each message out to every OTHER endpoint,
// asynchronously and as a structured clone, so code behaves exactly as it will over a real wire.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

class InProcessTransport extends TransportBase {
  readonly kind = 'in-process' as const;
  private readonly peers: Set<InProcessTransport>;

  constructor(peers: Set<InProcessTransport>) {
    super();
    this.peers = peers;
    peers.add(this);
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    for (const p of this.peers) {
      if (p === this) continue;
      const copy = structuredClone(m);
      queueMicrotask(() => p.receive(copy));
    }
  }

  receive(m: WireMessage): void {
    this.deliver(m);
  }

  protected teardown(): void {
    this.peers.delete(this);
  }
}

export interface InProcessHub {
  connect(): ManagedTransport;
}

export function createInProcessHub(): InProcessHub {
  const peers = new Set<InProcessTransport>();
  return { connect: () => new InProcessTransport(peers) };
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/in-process.test.ts`
Expected: `6 passed`.

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/transport/base.ts packages/controller/src/transport/in-process.ts packages/controller/test/helpers.ts packages/controller/test/transport/conformance.ts packages/controller/test/transport/in-process.test.ts
git commit -m "feat(controller): transport base, in-process transport and the shared conformance suite" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: postMessage transport (iframe, worker, MessagePort)

**Files:**
- Create: `packages/controller/src/transport/post-message.ts`, `packages/controller/test/transport/post-message.test.ts`

**Interfaces:**
- Consumes: `TransportBase` (Task 4).
- Produces: `interface PostEndpoint { postMessage(data); addEventListener('message', fn); removeEventListener('message', fn); start?() }`; `createPostMessageTransport(ep): ManagedTransport` (messages travel as `{ __pme: 1, m }`); `windowEndpoint(other: Window, targetOrigin: string, self?: Window): PostEndpoint` (accepts only `ev.source === other` and, unless `'*'`, `ev.origin === targetOrigin`).

- [x] **Step 1: Write the failing test**

`packages/controller/test/transport/post-message.test.ts`:
```ts
import { createPostMessageTransport } from '../../src/transport/post-message.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('postMessage', async () => {
  const { port1, port2 } = new MessageChannel();
  const a = createPostMessageTransport(port1);
  const b = createPostMessageTransport(port2);
  return { a, b, cleanup: async () => (a.close(), b.close(), port1.close(), port2.close()) };
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/post-message.test.ts`
Expected: FAIL — cannot load `../../src/transport/post-message.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/transport/post-message.ts`:
```ts
// postMessage transport (brief §3.7): an iframe, a worker or a MessagePort. Messages travel inside a
// { __pme: 1, m } envelope so unrelated window messages are ignored.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

/** The subset of Worker / MessagePort / Window-pair that the transport needs. */
export interface PostEndpoint {
  postMessage(data: unknown): void;
  addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
  removeEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
  /** MessagePort needs start() when listening through addEventListener. */
  start?(): void;
}

type Envelope = { __pme: 1; m: unknown };
const isEnvelope = (d: unknown): d is Envelope => d !== null && typeof d === 'object' && (d as Envelope).__pme === 1;

class PostMessageTransport extends TransportBase {
  readonly kind = 'postMessage' as const;
  private readonly ep: PostEndpoint;
  private readonly onMsg = (ev: MessageEvent) => {
    if (isEnvelope(ev.data)) this.deliver(ev.data.m);
  };

  constructor(ep: PostEndpoint) {
    super();
    this.ep = ep;
    ep.addEventListener('message', this.onMsg);
    ep.start?.();
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    this.ep.postMessage({ __pme: 1, m } satisfies Envelope);
  }

  protected teardown(): void {
    this.ep.removeEventListener('message', this.onMsg);
  }
}

export function createPostMessageTransport(ep: PostEndpoint): ManagedTransport {
  return new PostMessageTransport(ep);
}

/**
 * Endpoint for talking to another window (an iframe's contentWindow, or window.parent from inside the iframe).
 * Only messages whose source is `other` and whose origin is `targetOrigin` are accepted ('*' accepts any).
 */
export function windowEndpoint(other: Window, targetOrigin: string, self: Window = window): PostEndpoint {
  const wrapped = new Map<(ev: MessageEvent) => void, (ev: MessageEvent) => void>();
  return {
    postMessage: (data) => other.postMessage(data, targetOrigin),
    addEventListener: (_t, fn) => {
      const w = (ev: MessageEvent) => {
        if (ev.source !== other) return;
        if (targetOrigin !== '*' && ev.origin !== targetOrigin) return;
        fn(ev);
      };
      wrapped.set(fn, w);
      self.addEventListener('message', w);
    },
    removeEventListener: (_t, fn) => {
      const w = wrapped.get(fn);
      if (w) self.removeEventListener('message', w);
      wrapped.delete(fn);
    },
  };
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/post-message.test.ts`
Expected: `6 passed` (Node's `MessageChannel` ports; `start()` is needed with `addEventListener`).

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/transport/post-message.ts packages/controller/test/transport/post-message.test.ts
git commit -m "feat(controller): postMessage transport for iframes, workers and MessagePorts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: BroadcastChannel transport

**Files:**
- Create: `packages/controller/src/transport/broadcast-channel.ts`, `packages/controller/test/transport/broadcast-channel.test.ts`

**Interfaces:**
- Consumes: `TransportBase` (Task 4).
- Produces: `channelName(session) = 'pme/' + session`; `createBroadcastChannelTransport(session, { BroadcastChannelImpl? }): ManagedTransport` (open at once; a channel never hears its own posts).

- [x] **Step 1: Write the failing test**

`packages/controller/test/transport/broadcast-channel.test.ts`:
```ts
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { runTransportConformance } from './conformance.ts';

let n = 0;
runTransportConformance('broadcastChannel', async () => {
  const session = `TEST${String(++n).padStart(2, '2')}`; // a fresh channel per test
  const a = createBroadcastChannelTransport(session);
  const b = createBroadcastChannelTransport(session);
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/broadcast-channel.test.ts`
Expected: FAIL — cannot load `../../src/transport/broadcast-channel.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/transport/broadcast-channel.ts`:
```ts
// BroadcastChannel transport (brief §3.7): same origin, same browser — e.g. an instructor window plus a
// projector window. The channel is named after the session code; a channel never hears its own posts.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

export type BroadcastChannelCtor = new (name: string) => BroadcastChannel;
export const channelName = (session: string): string => `pme/${session}`;

class BroadcastChannelTransport extends TransportBase {
  readonly kind = 'broadcastChannel' as const;
  private readonly ch: BroadcastChannel;

  constructor(session: string, Impl: BroadcastChannelCtor) {
    super();
    this.ch = new Impl(channelName(session));
    this.ch.onmessage = (ev: MessageEvent) => this.deliver(ev.data);
    this.ch.onmessageerror = () => this.rejected++;
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    this.ch.postMessage(m);
  }

  protected teardown(): void {
    this.ch.onmessage = null;
    this.ch.close();
  }
}

export function createBroadcastChannelTransport(
  session: string,
  opts: { BroadcastChannelImpl?: BroadcastChannelCtor } = {},
): ManagedTransport {
  return new BroadcastChannelTransport(session, opts.BroadcastChannelImpl ?? BroadcastChannel);
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/broadcast-channel.test.ts`
Expected: `6 passed`. Node's global `BroadcastChannel` delivers between instances in the same thread, so no fake is needed (verified in the prototype).

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/transport/broadcast-channel.ts packages/controller/test/transport/broadcast-channel.test.ts
git commit -m "feat(controller): BroadcastChannel transport for same-browser windows" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: WebSocket client transport with backoff, fatal refusals and liveness

**Files:**
- Create: `packages/controller/src/transport/backoff.ts`, `packages/controller/src/transport/relay-frames.ts`, `packages/controller/src/transport/websocket.ts`, `packages/controller/test/fakes/fake-websocket.ts`, `packages/controller/test/transport/websocket.test.ts`

**Interfaces:**
- Consumes: `TransportBase` (Task 4).
- Produces:
  - `interface BackoffOptions { baseMs; maxMs; jitter }`, `DEFAULT_BACKOFF = { baseMs: 250, maxMs: 8000, jitter: 0.2 }`, `backoffDelay(attempt, o?, rand?)`.
  - `type RelayFrame = {relay:'hb'; t} | {relay:'peers'; hostOnline; peers} | {relay:'error'; code; message}`; `RELAY_CLOSE = { badHello: 4001, badSession: 4002, hostExists: 4009, full: 4029 }`; `FATAL_CLOSE_CODES`; `isRelayFrame(o)`.
  - `interface WebSocketLike`, `type WebSocketCtor`; `interface WebSocketTransportOptions { url; WebSocketImpl?; backoff?; livenessMs? (25 000); onRelayFrame? }`; `createWebSocketTransport(o): WebSocketTransport` where `type WebSocketTransport = ManagedTransport & { readonly reconnects: number; dropForTest(): void }`.
  - Behaviour: `connecting → open`; on an unexpected close → `connecting` and retry after `backoffDelay(attempt++)`; on a fatal close code or a `{relay:'error'}` frame → `error` (no retry); nothing received for `livenessMs` → close and reconnect. Sessions re-send `hello` on every `open`.

- [x] **Step 1: Write the fake and the failing test**

`packages/controller/test/fakes/fake-websocket.ts`:
```ts
// A scriptable WebSocket for unit tests of the WebSocket transport (no network).
import type { WebSocketLike } from '../../src/transport/websocket.ts';

export class FakeWebSocket implements WebSocketLike {
  static all: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  readonly url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.all.push(this);
  }
  static get last(): FakeWebSocket {
    return FakeWebSocket.all[FakeWebSocket.all.length - 1] as FakeWebSocket;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(code = 1000, reason = ''): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
  // test controls
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(o: unknown): void {
    this.onmessage?.({ data: typeof o === 'string' ? o : JSON.stringify(o) });
  }
}
```

`packages/controller/test/transport/websocket.test.ts`:
```ts
// WebSocket transport behaviour without a network: reconnect with backoff, fatal relay refusals, liveness.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStamper } from '../../src/protocol.ts';
import { backoffDelay } from '../../src/transport/backoff.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { FakeWebSocket } from '../fakes/fake-websocket.ts';

const opts = { url: 'ws://relay.test/', WebSocketImpl: FakeWebSocket, backoff: { baseMs: 100, maxMs: 1000, jitter: 0 }, livenessMs: 5000 };

describe('backoffDelay', () => {
  it('doubles from base to max, with ± jitter', () => {
    const o = { baseMs: 250, maxMs: 8000, jitter: 0 };
    expect([0, 1, 2, 3, 4, 5, 6].map((a) => backoffDelay(a, o))).toEqual([250, 500, 1000, 2000, 4000, 8000, 8000]);
    expect(backoffDelay(0, { baseMs: 1000, maxMs: 1000, jitter: 0.2 }, () => 0)).toBe(800);
    expect(backoffDelay(0, { baseMs: 1000, maxMs: 1000, jitter: 0.2 }, () => 1)).toBe(1200);
  });
});

describe('WebSocket transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.all = [];
  });
  afterEach(() => vi.useRealTimers());

  it('goes connecting → open, sends JSON, delivers WireMessages and hands relay frames aside', () => {
    const frames: unknown[] = [];
    const t = createWebSocketTransport({ ...opts, onRelayFrame: (f) => frames.push(f) });
    const seen: string[] = [];
    t.onStatus((s) => seen.push(s));
    const got: unknown[] = [];
    t.onMessage((m) => got.push(m));
    FakeWebSocket.last.open();
    const m = createStamper('ABC234', 'h')({ kind: 'hello', role: 'host' });
    t.send(m);
    expect(JSON.parse(FakeWebSocket.last.sent[0] as string)).toEqual(m);
    FakeWebSocket.last.receive(m);
    FakeWebSocket.last.receive({ relay: 'peers', hostOnline: true, peers: 1 });
    FakeWebSocket.last.receive('garbage');
    expect(seen).toEqual(['connecting', 'open']);
    expect(got).toEqual([m]);
    expect(frames).toEqual([{ relay: 'peers', hostOnline: true, peers: 1 }]);
    expect(t.status).toBe('open');
  });

  it('reconnects with backoff after a drop, and counts reconnects', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    FakeWebSocket.last.close(1006);
    expect(t.status).toBe('connecting');
    expect(FakeWebSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(99);
    expect(FakeWebSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.all).toHaveLength(2);
    FakeWebSocket.last.close(1006); // failed attempt → next delay doubles
    vi.advanceTimersByTime(199);
    expect(FakeWebSocket.all).toHaveLength(2);
    vi.advanceTimersByTime(1);
    FakeWebSocket.last.open();
    expect(t.status).toBe('open');
    expect(t.reconnects).toBe(1);
  });

  it('stops for good on a fatal relay close code (host exists)', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    FakeWebSocket.last.close(RELAY_CLOSE.hostExists, 'host exists');
    expect(t.status).toBe('error');
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.all).toHaveLength(1);
  });

  it('closes and reconnects when nothing arrives for livenessMs', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    vi.advanceTimersByTime(4000);
    FakeWebSocket.last.receive({ relay: 'hb', t: 1 }); // heartbeat keeps it alive
    vi.advanceTimersByTime(4000);
    expect(t.status).toBe('open');
    vi.advanceTimersByTime(1000);
    expect(t.status).toBe('connecting');
  });

  it('drops sends while not open, and close() stops reconnecting', () => {
    const t = createWebSocketTransport(opts);
    t.send(createStamper('ABC234', 'h')({ kind: 'hello', role: 'host' }));
    expect(FakeWebSocket.last.sent).toEqual([]);
    FakeWebSocket.last.open();
    t.close();
    expect(t.status).toBe('closed');
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.all).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/websocket.test.ts`
Expected: FAIL — cannot load `../../src/transport/backoff.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/transport/backoff.ts`:
```ts
// Reconnect delays: exponential with jitter, capped [ENG].
export interface BackoffOptions {
  baseMs: number;
  maxMs: number;
  /** ± fraction of the delay, 0–1. */
  jitter: number;
}
export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 250, maxMs: 8000, jitter: 0.2 };

/** Delay before reconnect attempt `attempt` (0-based): min(max, base·2^attempt) · (1 ± jitter). */
export function backoffDelay(attempt: number, o: BackoffOptions = DEFAULT_BACKOFF, rand: () => number = Math.random): number {
  const d = Math.min(o.maxMs, o.baseMs * 2 ** Math.max(0, attempt));
  return Math.round(d * (1 - o.jitter + 2 * o.jitter * rand()));
}
```

`packages/controller/src/transport/relay-frames.ts`:
```ts
// Control frames the relay sends besides WireMessages (they carry a `relay` key and never a `v` key).
export type RelayFrame =
  | { relay: 'hb'; t: number } // app-level heartbeat so browser clients can detect a dead relay
  | { relay: 'peers'; hostOnline: boolean; peers: number }
  | { relay: 'error'; code: 'bad-hello' | 'host-exists' | 'forbidden' | 'full' | 'bad-session'; message: string };

/** WebSocket close codes the relay uses for fatal refusals (no reconnect) [ENG]. */
export const RELAY_CLOSE = { badHello: 4001, badSession: 4002, hostExists: 4009, full: 4029 } as const;
export const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set(Object.values(RELAY_CLOSE));

export function isRelayFrame(o: unknown): o is RelayFrame {
  return o !== null && typeof o === 'object' && typeof (o as { relay?: unknown }).relay === 'string';
}
```

`packages/controller/src/transport/websocket.ts`:
```ts
// WebSocket client transport (brief §3.7) to the relay in relay/. Reconnects with backoff; a relay heartbeat
// frame ({relay:'hb'}) every 10 s lets a browser notice a dead connection (JS cannot see ping frames).
// Upper layers (sessions) re-send `hello` on every 'open' — the relay needs it to route the new socket.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';
import { DEFAULT_BACKOFF, backoffDelay, type BackoffOptions } from './backoff.ts';
import { FATAL_CLOSE_CODES, isRelayFrame, type RelayFrame } from './relay-frames.ts';

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
}
export type WebSocketCtor = new (url: string) => WebSocketLike;

export interface WebSocketTransportOptions {
  /** e.g. ws://192.168.1.20:8787/ */
  url: string;
  WebSocketImpl?: WebSocketCtor;
  backoff?: BackoffOptions;
  /** Close and reconnect when nothing arrives for this long (default 25 s = 2.5 relay heartbeats) [ENG]. */
  livenessMs?: number;
  /** Relay control frames (peers, errors) for the UI. */
  onRelayFrame?: (f: RelayFrame) => void;
}

const OPEN = 1;

class WsTransport extends TransportBase {
  readonly kind = 'websocket' as const;
  private readonly o: Required<Omit<WebSocketTransportOptions, 'onRelayFrame'>> & Pick<WebSocketTransportOptions, 'onRelayFrame'>;
  private ws: WebSocketLike | null = null;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private liveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Number of reconnects after the first open. */
  reconnects = 0;
  private everOpened = false;

  constructor(o: WebSocketTransportOptions) {
    super();
    this.o = {
      url: o.url,
      WebSocketImpl: o.WebSocketImpl ?? (WebSocket as unknown as WebSocketCtor),
      backoff: o.backoff ?? DEFAULT_BACKOFF,
      livenessMs: o.livenessMs ?? 25_000,
      onRelayFrame: o.onRelayFrame,
    };
    this.connect();
  }

  private connect(): void {
    this.setStatus('connecting');
    const ws = new this.o.WebSocketImpl(this.o.url);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempt = 0;
      if (this.everOpened) this.reconnects++;
      this.everOpened = true;
      this.touch();
      this.setStatus('open');
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this.touch();
      if (typeof ev.data !== 'string') return;
      let o: unknown;
      try {
        o = JSON.parse(ev.data);
      } catch {
        this.rejected++;
        return;
      }
      if (isRelayFrame(o)) {
        if (o.relay === 'error') this.setStatus('error');
        this.o.onRelayFrame?.(o);
        return;
      }
      this.deliver(o);
    };
    ws.onerror = () => {
      /* onclose follows and decides */
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearLive();
      if (this.closed) return;
      if (FATAL_CLOSE_CODES.has(ev.code)) {
        this.setStatus('error');
        return;
      }
      this.setStatus('connecting');
      const delay = backoffDelay(this.attempt++, this.o.backoff);
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (!this.closed) this.connect();
      }, delay);
    };
  }

  private touch(): void {
    this.clearLive();
    this.liveTimer = setTimeout(() => this.ws?.close(4000, 'liveness timeout'), this.o.livenessMs);
  }

  private clearLive(): void {
    if (this.liveTimer !== null) clearTimeout(this.liveTimer);
    this.liveTimer = null;
  }

  protected write(m: WireMessage): void {
    if (this.ws && this.ws.readyState === OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Test hook: drop the socket as if the network failed (the transport reconnects). */
  dropForTest(): void {
    this.ws?.close(4000, 'test drop');
  }

  protected teardown(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.clearLive();
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'closed');
  }
}

export type WebSocketTransport = ManagedTransport & { readonly reconnects: number; dropForTest(): void };

export function createWebSocketTransport(o: WebSocketTransportOptions): WebSocketTransport {
  return new WsTransport(o);
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/websocket.test.ts`
Expected: `6 passed`.

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/transport/backoff.ts packages/controller/src/transport/relay-frames.ts packages/controller/src/transport/websocket.ts packages/controller/test/fakes/fake-websocket.ts packages/controller/test/transport/websocket.test.ts
git commit -m "feat(controller): WebSocket transport with backoff reconnect, fatal refusals and liveness timeout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The relay — rooms, host authority, routing, snapshot cache, heartbeat, expiry, signalling

**Files:**
- Create: `packages/controller/relay/server.ts`, `packages/controller/test/relay/relay.test.ts`

**Interfaces:**
- Consumes: `parseWireMessage`, `WIRE_LIMITS` (Task 3); `SESSION_CODE_RE`, `Role`, `WireMessage` (Task 2); `RELAY_CLOSE`, `RelayFrame` (Task 7); `ws` `WebSocketServer`.
- Produces: `interface RelayOptions { port? (8787; 0 = random); host? ('0.0.0.0'); roomTtlMs? (600 000); heartbeatMs? (10 000); maxRooms? (500); log? }`; `interface RelayHandle { port; stats(): { rooms; sockets; dropped }; room(code): { hostOnline; peers; hasSnapshot } | undefined; sweep(now?): void; close(): Promise<void> }`; `startRelay(opts?): Promise<RelayHandle>`. Endpoints `/` (WireMessages; first frame must be `hello`) and `/signal?session=&peer=` (`{to, data}` → `{from, data}`). Routing table: see the header comment in `server.ts` and `relay/README.md` (Task 9).

- [x] **Step 1: Write the failing test**

`packages/controller/test/relay/relay.test.ts` (a real `ws` server on a random port; the clients are Node's global `WebSocket`):
```ts
// Relay integration tests: a real `ws` server on a random port, raw WebSocket clients (Node's global).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStamper, type Role, type WireMessage } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'RQY234';
let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, roomTtlMs: 1000 });
  url = `ws://127.0.0.1:${relay.port}/`;
});
afterEach(async () => relay.close());

interface Client {
  ws: WebSocket;
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  send(b: Parameters<ReturnType<typeof createStamper>>[0]): WireMessage;
  wire(kind: WireMessage['kind']): WireMessage[];
}

async function client(id: string, role: Role, session = SESSION): Promise<Client> {
  const ws = new WebSocket(url);
  const stamp = createStamper(session, id);
  const c: Client = {
    ws,
    got: [],
    closeCode: null,
    send(b) {
      const m = stamp(b);
      ws.send(JSON.stringify(m));
      return m;
    },
    wire: (kind) => c.got.filter((m) => m.kind === kind) as unknown as WireMessage[],
  };
  ws.onmessage = (e) => c.got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  ws.onclose = (e) => (c.closeCode = e.code);
  await new Promise((r) => (ws.onopen = r));
  c.send({ kind: 'hello', role });
  await sleep(20);
  return c;
}

const snap = { schema: 'pme-snapshot/1' as const, engineVersion: '0.0.0', seed: 1, tick: 500, state: { x: 1 } };

describe('relay', () => {
  it('fans host events to every peer and never back to the host', async () => {
    const host = await client('h', 'host');
    const c = await client('c', 'controller');
    const v = await client('v', 'viewer');
    host.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
    await waitFor(() => c.wire('event').length === 1 && v.wire('event').length === 1);
    await sleep(20);
    expect(host.wire('event')).toEqual([]);
  });

  it('routes controller commands only to the host, and the ack only to the issuer', async () => {
    const host = await client('h', 'host');
    const c1 = await client('c1', 'controller');
    const c2 = await client('c2', 'controller');
    const v = await client('v', 'viewer');
    c1.send({ kind: 'command', body: { id: 'k1', issuedBy: 'c1', type: 'setTarget', variable: 'hr', value: 90 } });
    await waitFor(() => host.wire('command').length === 1);
    host.send({ kind: 'ack', commandId: 'k1', accepted: true, tick: 5 });
    await waitFor(() => c1.wire('ack').length === 1);
    await sleep(20);
    expect(c2.wire('command').length + c2.wire('ack').length + v.wire('command').length + v.wire('ack').length).toBe(0);
  });

  it('host authority: a viewer command is refused, peer events are dropped, spoofed from is dropped', async () => {
    const host = await client('h', 'host');
    const v = await client('v', 'viewer');
    const c = await client('c', 'controller');
    v.send({ kind: 'command', body: { id: 'x', issuedBy: 'v', type: 'setTarget', variable: 'hr', value: 30 } });
    c.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
    c.ws.send(JSON.stringify(createStamper(SESSION, 'h')({ kind: 'event', body: [] }))); // pretends to be the host
    await waitFor(() => v.got.some((f) => f.relay === 'error'));
    await sleep(30);
    expect(host.wire('command')).toEqual([]);
    expect(v.wire('event')).toEqual([]);
    expect(relay.stats().dropped).toBeGreaterThanOrEqual(3);
  });

  it('refuses a second host and a bad first frame', async () => {
    await client('h', 'host');
    const h2 = await client('h2', 'host');
    await waitFor(() => h2.closeCode !== null);
    expect(h2.closeCode).toBe(RELAY_CLOSE.hostExists);
    const ws = new WebSocket(url);
    await new Promise((r) => (ws.onopen = r));
    const closed = new Promise<number>((r) => (ws.onclose = (e) => r(e.code)));
    ws.send(JSON.stringify(createStamper(SESSION, 'z')({ kind: 'event', body: [] })));
    expect(await closed).toBe(RELAY_CLOSE.badHello);
  });

  it('sends a host snapshot only to peers that said hello since their last one, and caches it', async () => {
    const host = await client('h', 'host');
    const v1 = await client('v1', 'viewer');
    await waitFor(() => host.wire('hello').length === 1); // v1's hello reached the host
    host.send({ kind: 'snapshot', body: snap });
    await waitFor(() => v1.wire('snapshot').length === 1);
    const v2 = await client('v2', 'viewer');
    host.send({ kind: 'snapshot', body: { ...snap, tick: 900 } });
    await waitFor(() => v2.wire('snapshot').length === 1);
    await sleep(20);
    expect(v1.wire('snapshot').length).toBe(1); // v1 did not ask again
    expect(relay.room(SESSION)?.hasSnapshot).toBe(true);
  });

  it('serves the cached snapshot to a late joiner while the host is offline, and re-announces a returning host', async () => {
    const host = await client('h', 'host');
    const v1 = await client('v1', 'viewer');
    host.send({ kind: 'snapshot', body: snap });
    await waitFor(() => v1.wire('snapshot').length === 1);
    host.ws.close();
    await waitFor(() => relay.room(SESSION)?.hostOnline === false);
    const v2 = await client('v2', 'viewer');
    await waitFor(() => v2.wire('snapshot').length === 1);
    expect(v2.got.some((f) => f.relay === 'peers' && f.hostOnline === false)).toBe(true);
    await client('h', 'host');
    await waitFor(() => v1.wire('hello').length === 1 && v2.wire('hello').length === 1);
  });

  it('expires an empty room after roomTtlMs, and terminates sockets that miss a heartbeat', async () => {
    const v = await client('v', 'viewer');
    v.ws.close();
    await waitFor(() => relay.stats().sockets === 0);
    relay.sweep(Date.now() + 2000);
    expect(relay.room(SESSION)).toBeUndefined();
    const c = await client('c', 'controller', 'RQY235');
    relay.sweep(); // marks, pings and sends {relay:'hb'}
    await waitFor(() => c.got.some((f) => f.relay === 'hb'));
    expect(c.closeCode).toBeNull(); // Node's WebSocket answers pings, so it survives the next sweep
    relay.sweep();
    await sleep(30);
    expect(c.closeCode).toBeNull();
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/relay`
Expected: FAIL — cannot load `../../relay/server.ts`.

- [x] **Step 3: Implement**

`packages/controller/relay/server.ts`:
```ts
// @pme/controller relay (brief §3.7): rooms keyed by 6-character session code, host authority, a snapshot
// cache for late joiners, heartbeat and room expiry. Two endpoints on one port:
//   /        WireMessages. The first frame must be a `hello`; it binds the socket to (session, from, role).
//   /signal  WebRTC signalling: {to, data} frames routed between peers of one session (?session=&peer=).
// Routing (host authority): only the host's event/snapshot/ack/hello go out; controllers' commands go only to
// the host; viewers may send only hello. A host `snapshot` goes to peers that said hello since their last one.
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { WIRE_LIMITS, parseWireMessage } from '../src/guard.ts';
import { SESSION_CODE_RE, type Role, type WireMessage } from '../src/protocol.ts';
import { RELAY_CLOSE, type RelayFrame } from '../src/transport/relay-frames.ts';

export interface RelayOptions {
  port?: number; // 0 = random (tests)
  host?: string; // default '0.0.0.0' (LAN)
  /** A room with no sockets is deleted after this long (default 10 min) [ENG]. */
  roomTtlMs?: number;
  /** ws ping + {relay:'hb'} interval (default 10 s) [ENG]. */
  heartbeatMs?: number;
  maxRooms?: number; // default 500
  log?: (line: string) => void;
}

interface Peer {
  ws: WebSocket;
  id: string;
  role: Role;
  alive: boolean;
}

interface Room {
  code: string;
  host: Peer | null;
  peers: Set<Peer>; // non-host
  snapshot: string | null; // raw JSON of the host's latest snapshot message
  awaiting: Set<Peer>;
  ackRoutes: Map<string, Peer>; // commandId → issuer
  emptySince: number | null;
}

export interface RelayStats {
  rooms: number;
  sockets: number;
  dropped: number;
}

export interface RelayHandle {
  readonly port: number;
  stats(): RelayStats;
  /** Test/diagnostic view of one room. */
  room(code: string): { hostOnline: boolean; peers: number; hasSnapshot: boolean } | undefined;
  /** Run the heartbeat/expiry sweep now (tests). */
  sweep(now?: number): void;
  close(): Promise<void>;
}

const ACK_ROUTES_MAX = 1000;

export async function startRelay(opts: RelayOptions = {}): Promise<RelayHandle> {
  const roomTtlMs = opts.roomTtlMs ?? 600_000;
  const heartbeatMs = opts.heartbeatMs ?? 10_000;
  const maxRooms = opts.maxRooms ?? 500;
  const log = opts.log ?? (() => {});
  const rooms = new Map<string, Room>();
  const signalRooms = new Map<string, Map<string, WebSocket>>();
  const alive = new WeakMap<WebSocket, boolean>();
  let dropped = 0;

  const wss = new WebSocketServer({ port: opts.port ?? 8787, host: opts.host ?? '0.0.0.0', maxPayload: WIRE_LIMITS.maxBytes });
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });

  const frame = (ws: WebSocket, f: RelayFrame) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(f));
  };
  const raw = (ws: WebSocket, data: string) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  };
  const refuse = (ws: WebSocket, code: number, err: Extract<RelayFrame, { relay: 'error' }>['code'], message: string) => {
    frame(ws, { relay: 'error', code: err, message });
    ws.close(code, message);
  };
  const peersFrame = (room: Room): RelayFrame => ({ relay: 'peers', hostOnline: room.host !== null, peers: room.peers.size });

  const getRoom = (code: string): Room | null => {
    let room = rooms.get(code);
    if (!room) {
      if (rooms.size >= maxRooms) return null;
      room = { code, host: null, peers: new Set(), snapshot: null, awaiting: new Set(), ackRoutes: new Map(), emptySince: null };
      rooms.set(code, room);
      log(`room ${code} created`);
    }
    room.emptySince = null;
    return room;
  };

  const route = (room: Room, peer: Peer, m: WireMessage, data: string) => {
    const isHost = room.host === peer;
    switch (m.kind) {
      case 'hello':
        if (isHost) for (const p of room.peers) raw(p.ws, data);
        else {
          room.awaiting.add(peer);
          if (room.host) raw(room.host.ws, data);
        }
        return;
      case 'command':
        if (peer.role !== 'controller') {
          dropped++;
          frame(peer.ws, { relay: 'error', code: 'forbidden', message: `${peer.role} may not send commands` });
          return;
        }
        if (room.ackRoutes.size >= ACK_ROUTES_MAX) room.ackRoutes.delete(room.ackRoutes.keys().next().value as string);
        room.ackRoutes.set(m.body.id, peer);
        if (room.host) raw(room.host.ws, data);
        else dropped++; // the controller re-sends unacked commands when the host's hello arrives
        return;
      case 'ack': {
        if (!isHost) return void dropped++;
        const to = room.ackRoutes.get(m.commandId);
        room.ackRoutes.delete(m.commandId);
        if (to) raw(to.ws, data);
        return;
      }
      case 'event':
        if (!isHost) return void dropped++;
        for (const p of room.peers) raw(p.ws, data);
        return;
      case 'snapshot':
        if (!isHost) return void dropped++;
        room.snapshot = data;
        for (const p of room.awaiting) raw(p.ws, data);
        room.awaiting.clear();
        return;
    }
  };

  const onWire = (ws: WebSocket) => {
    let peer: Peer | null = null;
    let room: Room | null = null;
    ws.on('message', (buf, isBinary) => {
      if (isBinary) return void dropped++;
      const data = buf.toString();
      const m = parseWireMessage(data);
      if (!m) return void dropped++;
      if (!peer) {
        if (m.kind !== 'hello') return refuse(ws, RELAY_CLOSE.badHello, 'bad-hello', 'first frame must be hello');
        if (!SESSION_CODE_RE.test(m.session)) return refuse(ws, RELAY_CLOSE.badSession, 'bad-session', 'invalid session code');
        room = getRoom(m.session);
        if (!room) return refuse(ws, RELAY_CLOSE.full, 'full', 'relay is full');
        peer = { ws, id: m.from, role: m.role, alive: true };
        if (m.role === 'host') {
          const old = room.host;
          if (old && old.id !== m.from && old.ws.readyState === old.ws.OPEN) {
            peer = null;
            return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `session ${m.session} already has a host`);
          }
          if (old && old.ws !== ws) old.ws.close(1000, 'replaced by reconnect');
          room.host = peer;
          for (const p of room.peers) frame(p.ws, peersFrame(room));
          route(room, peer, m, data); // fan the host hello out: peers re-hello and resend pending commands
          // Peers that said hello while the host was away still wait for a snapshot.
        } else {
          room.peers.add(peer);
          frame(ws, peersFrame(room));
          if (!room.host && room.snapshot) raw(ws, room.snapshot); // host offline: serve the cache
          route(room, peer, m, data);
        }
        log(`room ${room.code}: ${m.role} ${m.from} joined`);
        return;
      }
      if (!room || m.session !== room.code || m.from !== peer.id) return void dropped++; // no spoofing
      route(room, peer, m, data);
    });
    ws.on('close', () => {
      if (!peer || !room) return;
      if (room.host === peer) {
        room.host = null;
        for (const p of room.peers) frame(p.ws, peersFrame(room));
      } else {
        room.peers.delete(peer);
        room.awaiting.delete(peer);
      }
      if (!room.host && room.peers.size === 0) room.emptySince = Date.now();
      log(`room ${room.code}: ${peer.role} ${peer.id} left`);
    });
  };

  const onSignal = (ws: WebSocket, req: IncomingMessage) => {
    const q = new URL(req.url ?? '/', 'http://relay').searchParams;
    const code = q.get('session') ?? '';
    const id = q.get('peer') ?? '';
    if (!SESSION_CODE_RE.test(code) || !/^[\w-]{1,64}$/.test(id)) return refuse(ws, RELAY_CLOSE.badSession, 'bad-session', 'bad session or peer');
    let sroom = signalRooms.get(code);
    if (!sroom) signalRooms.set(code, (sroom = new Map()));
    const prev = sroom.get(id);
    if (prev && prev.readyState === prev.OPEN) return refuse(ws, RELAY_CLOSE.hostExists, 'host-exists', `peer id ${id} is taken`);
    sroom.set(id, ws);
    ws.on('message', (buf) => {
      let f: { to?: unknown; data?: unknown };
      try {
        f = JSON.parse(buf.toString()) as { to?: unknown; data?: unknown };
      } catch {
        return void dropped++;
      }
      const to = typeof f.to === 'string' ? sroom.get(f.to) : undefined;
      if (!to) return void dropped++;
      raw(to, JSON.stringify({ from: id, data: f.data }));
    });
    ws.on('close', () => {
      if (sroom.get(id) === ws) sroom.delete(id);
      if (sroom.size === 0) signalRooms.delete(code);
    });
  };

  wss.on('connection', (ws, req) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));
    const path = new URL(req.url ?? '/', 'http://relay').pathname;
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws);
  });

  const sweep = (now = Date.now()) => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
      frame(ws, { relay: 'hb', t: now });
    }
    for (const [code, room] of rooms) {
      if (room.emptySince !== null && now - room.emptySince >= roomTtlMs) {
        rooms.delete(code);
        log(`room ${code} expired`);
      }
    }
  };
  const timer = setInterval(() => sweep(), heartbeatMs);
  timer.unref?.();

  const port = (wss.address() as { port: number }).port;
  log(`pme relay listening on ${opts.host ?? '0.0.0.0'}:${port}`);
  return {
    port,
    stats: () => ({ rooms: rooms.size, sockets: wss.clients.size, dropped }),
    room: (code) => {
      const r = rooms.get(code);
      return r && { hostOnline: r.host !== null, peers: r.peers.size, hasSnapshot: r.snapshot !== null };
    },
    sweep,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(timer);
        for (const ws of wss.clients) ws.terminate();
        wss.close(() => resolve());
      }),
  };
}
```

- [x] **Step 4: Run to see it pass, and typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/relay && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: `7 passed`; typecheck exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/controller/relay/server.ts packages/controller/test/relay/relay.test.ts
git commit -m "feat(controller): relay with rooms, host authority, ack routing, snapshot cache, heartbeat, expiry and /signal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: WebSocket conformance through the real relay; the `pme-relay` bin and README

**Files:**
- Create: `packages/controller/test/transport/websocket-relay.test.ts`, `packages/controller/relay/bin.ts`, `packages/controller/relay/README.md`
- Modify: `packages/controller/package.json` (bin, script), root `package.json` (devDependency, script), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `startRelay` (Task 8); `createWebSocketTransport` (Task 7); conformance suite (Task 4).
- Produces: the executable `packages/controller/relay/bin.ts` (`pme-relay [--port 8787] [--host 0.0.0.0] [--room-ttl-min 10] [--quiet]`, runs with `node --experimental-strip-types`); root scripts `relay` so `npx -y pnpm@9.15.9 relay -- --port 9000` and `npx pme-relay` work at the repo root.

- [x] **Step 1: Write the conformance test against the real relay**

`packages/controller/test/transport/websocket-relay.test.ts`:
```ts
// The WebSocket transport against the REAL relay (ws) on a random port. The relay needs a hello first and
// checks that later frames come from the same `from`, so the pair says hello with the suite's ids.
import { createStamper } from '../../src/protocol.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { startRelay } from '../../relay/server.ts';
import { sleep, waitStatus } from '../helpers.ts';
import { CTL_ID, HOST_ID, SESSION, runTransportConformance } from './conformance.ts';

runTransportConformance('websocket', async () => {
  const relay = await startRelay({ port: 0, host: '127.0.0.1' });
  const url = `ws://127.0.0.1:${relay.port}/`;
  const a = createWebSocketTransport({ url });
  const b = createWebSocketTransport({ url });
  await waitStatus(a, 'open');
  await waitStatus(b, 'open');
  a.send(createStamper(SESSION, HOST_ID)({ kind: 'hello', role: 'host' }));
  await sleep(20);
  b.send(createStamper(SESSION, CTL_ID)({ kind: 'hello', role: 'controller' }));
  await sleep(20);
  return { a, b, cleanup: async () => (a.close(), b.close(), await relay.close()) };
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/websocket-relay.test.ts`
Expected: `6 passed` (Tasks 7–8 already implement everything; this task proves the pair over a real socket). If "delivers host → controller" times out, check that the hello `from` ids equal `HOST_ID`/`CTL_ID` — the relay drops frames whose `from` differs from the socket's hello.

- [x] **Step 3: Write the bin**

`packages/controller/relay/bin.ts`:
```ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// pme-relay: the @pme/controller WebSocket relay (brief §3.7). Usage: pme-relay [--port 8787] [--host 0.0.0.0]
//   [--room-ttl-min 10] [--quiet]. Runs on Node ≥ 22.12 with type stripping (no build step).
import { parseArgs } from 'node:util';
import { startRelay } from './server.ts';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'), // `pnpm relay -- --port 9000` passes the '--' through
  options: {
    port: { type: 'string', default: '8787' },
    host: { type: 'string', default: '0.0.0.0' },
    'room-ttl-min': { type: 'string', default: '10' },
    quiet: { type: 'boolean', default: false },
  },
});
const relay = await startRelay({
  port: Number(values.port),
  host: values.host,
  roomTtlMs: Number(values['room-ttl-min']) * 60_000,
  ...(values.quiet ? {} : { log: (l: string) => console.log(`[pme-relay] ${l}`) }),
});
console.log(`pme-relay ready on ws://${values.host}:${relay.port}/ (Ctrl+C to stop)`);
const stop = () => void relay.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
```

Then: `chmod +x packages/controller/relay/bin.ts`

- [x] **Step 4: Wire the bin and scripts**

In `packages/controller/package.json` add the script and the bin (keep the rest):
```json
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build",
    "relay": "node --experimental-strip-types --no-warnings relay/bin.ts"
  },
  "bin": {
    "pme-relay": "./relay/bin.ts"
  }
```
In the root `package.json` add `"relay": "pme-relay"` to `scripts` and `"@pme/controller": "workspace:*"` to `devDependencies` (this links the bin into the root `node_modules/.bin`). Then run `npx -y pnpm@9.15.9 install`.

- [x] **Step 5: Write the README**

`packages/controller/relay/README.md`:
````markdown
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
````

- [x] **Step 6: Run the relay by hand**

```bash
npx -y pnpm@9.15.9 relay -- --port 0 --host 127.0.0.1 & RELAY_PID=$!; sleep 3; kill $RELAY_PID
npx pme-relay --port 0 --host 127.0.0.1 --quiet & RELAY_PID=$!; sleep 3; kill $RELAY_PID
```
Expected: each prints `pme-relay ready on ws://127.0.0.1:<port>/ (Ctrl+C to stop)` (the first also prints `[pme-relay] pme relay listening …`). `kill` the PID you started — killing a wrapper subshell leaves the relay running.

- [x] **Step 7: Commit**

```bash
git add packages/controller/test/transport/websocket-relay.test.ts packages/controller/relay/bin.ts packages/controller/relay/README.md packages/controller/package.json package.json pnpm-lock.yaml
git commit -m "feat(controller): pme-relay bin (Node type stripping), README, WebSocket conformance through the relay" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: WebRTC DataChannel transport, signalled through the relay

**Files:**
- Create: `packages/controller/src/transport/webrtc.ts`, `packages/controller/test/fakes/fake-rtc.ts`, `packages/controller/test/transport/webrtc.test.ts`

**Interfaces:**
- Consumes: `TransportBase` (4), `backoffDelay` (7), `WebSocketCtor/WebSocketLike` (7), `startRelay` (8, test).
- Produces: `HOST_SIGNAL_ID = 'host'`; `interface SignalData { type: 'offer'|'answer'|'candidate'; sdp?; candidate? }`; `interface Signaling { selfId; send(to, data); onSignal(fn); close() }`; `createRelaySignaling({ url, session, peerId, WebSocketImpl? }): Signaling` (connects to `<url>/signal?session=&peer=`, queues until open); `interface PeerConnectionLike`, `interface DataChannelLike`, `type PeerConnectionCtor`; `interface WebRtcOptions { signaling; remoteId; initiator; RTCPeerConnectionImpl?; iceServers? ([]); backoff? }`; `createWebRtcTransport(o, firstOffer?): WebRtcTransport` (`ManagedTransport & { dropForTest() }`; the initiator creates the ordered channel `'pme'` and re-offers with backoff when it dies; a responder closes for good); `acceptWebRtcPeers({ signaling, onTransport, RTCPeerConnectionImpl?, iceServers? }): () => void` (host side; a second offer from the same peer replaces its transport). Early trickled ICE candidates are held until the remote description is set (the browser run failed without this).

- [x] **Step 1: Write the fake peer connection and the failing test**

`packages/controller/test/fakes/fake-rtc.ts` (Node has no WebRTC; offers/answers carry the connection's registry id as their "sdp"):
```ts
// In-memory RTCPeerConnection/RTCDataChannel pair for Vitest (Node has no WebRTC). Offers/answers carry the
// connection's registry id as their "sdp"; when both descriptions are set the two channels open.
import type { DataChannelLike, PeerConnectionLike } from '../../src/transport/webrtc.ts';

const registry = new Map<string, FakePeerConnection>();
let nextId = 0;

class FakeDataChannel implements DataChannelLike {
  readyState = 'connecting';
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  other: FakeDataChannel | null = null;
  send(data: string): void {
    if (this.readyState !== 'open') throw new Error('channel not open');
    const o = this.other;
    setTimeout(() => o?.onmessage?.({ data }), 0);
  }
  open(): void {
    this.readyState = 'open';
    setTimeout(() => this.onopen?.(), 0);
  }
  close(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    setTimeout(() => this.onclose?.(), 0);
    this.other?.close();
  }
}

export class FakePeerConnection implements PeerConnectionLike {
  static created = 0;
  readonly id = `fake-${++nextId}`;
  connectionState = 'new';
  onicecandidate: PeerConnectionLike['onicecandidate'] = null;
  ondatachannel: PeerConnectionLike['ondatachannel'] = null;
  onconnectionstatechange: (() => void) | null = null;
  private channel: FakeDataChannel | null = null;
  private remote: FakePeerConnection | null = null;

  constructor(_config: { iceServers: RTCIceServer[] }) {
    FakePeerConnection.created++;
    registry.set(this.id, this);
  }
  createDataChannel(_label: string): DataChannelLike {
    this.channel = new FakeDataChannel();
    return this.channel;
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: this.id };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: this.id };
  }
  async setLocalDescription(): Promise<void> {
    setTimeout(() => this.onicecandidate?.({ candidate: null }), 0);
  }
  async setRemoteDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> {
    this.remote = registry.get(d.sdp ?? '') ?? null;
    if (d.type === 'answer' && this.remote && this.channel) {
      const theirs = new FakeDataChannel();
      theirs.other = this.channel;
      this.channel.other = theirs;
      this.remote.ondatachannel?.({ channel: theirs });
      this.connectionState = this.remote.connectionState = 'connected';
      theirs.open();
      this.channel.open();
    }
  }
  async addIceCandidate(): Promise<void> {}
  close(): void {
    this.connectionState = 'closed';
    this.channel?.close();
    registry.delete(this.id);
  }
}
```

`packages/controller/test/transport/webrtc.test.ts`:
```ts
// WebRTC transport with an in-memory RTCPeerConnection, signalled through the REAL relay /signal endpoint.
import { describe, expect, it } from 'vitest';
import { acceptWebRtcPeers, createRelaySignaling, createWebRtcTransport, HOST_SIGNAL_ID } from '../../src/transport/webrtc.ts';
import type { ManagedTransport } from '../../src/protocol.ts';
import { startRelay } from '../../relay/server.ts';
import { FakePeerConnection } from '../fakes/fake-rtc.ts';
import { waitFor, waitStatus } from '../helpers.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('webrtc', async () => {
  const relay = await startRelay({ port: 0, host: '127.0.0.1' });
  const url = `ws://127.0.0.1:${relay.port}`;
  const hostSig = createRelaySignaling({ url, session: 'ABC234', peerId: HOST_SIGNAL_ID });
  const peerSig = createRelaySignaling({ url, session: 'ABC234', peerId: 'ctl-1' });
  let a: ManagedTransport | null = null;
  const stop = acceptWebRtcPeers({ signaling: hostSig, onTransport: (t) => (a = t), RTCPeerConnectionImpl: FakePeerConnection });
  await new Promise((r) => setTimeout(r, 50)); // both signalling sockets connected
  const b = createWebRtcTransport({ signaling: peerSig, remoteId: HOST_SIGNAL_ID, initiator: true, RTCPeerConnectionImpl: FakePeerConnection });
  await waitFor(() => a !== null, 2000, 'host side transport');
  return {
    a: a as unknown as ManagedTransport,
    b,
    cleanup: async () => {
      stop();
      b.close();
      hostSig.close();
      peerSig.close();
      await relay.close();
    },
  };
});

describe('WebRTC reconnect', () => {
  it('the initiator re-offers after the channel dies and the host accepts a fresh transport', async () => {
    const relay = await startRelay({ port: 0, host: '127.0.0.1' });
    const url = `ws://127.0.0.1:${relay.port}`;
    const hostSig = createRelaySignaling({ url, session: 'RTC234', peerId: HOST_SIGNAL_ID });
    const peerSig = createRelaySignaling({ url, session: 'RTC234', peerId: 'view-9' });
    const accepted: ManagedTransport[] = [];
    const stop = acceptWebRtcPeers({ signaling: hostSig, onTransport: (t) => accepted.push(t), RTCPeerConnectionImpl: FakePeerConnection });
    await new Promise((r) => setTimeout(r, 50));
    const b = createWebRtcTransport({ signaling: peerSig, remoteId: HOST_SIGNAL_ID, initiator: true, RTCPeerConnectionImpl: FakePeerConnection, backoff: { baseMs: 10, maxMs: 50, jitter: 0 } });
    await waitStatus(b, 'open');
    b.dropForTest();
    await waitFor(() => accepted.length === 2 && accepted[1]!.status === 'open', 3000, 'second accept');
    await waitStatus(b, 'open');
    expect(accepted[0]!.status).toBe('closed');
    stop();
    b.close();
    hostSig.close();
    peerSig.close();
    await relay.close();
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport/webrtc.test.ts`
Expected: FAIL — cannot load `../../src/transport/webrtc.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/transport/webrtc.ts`:
```ts
// WebRTC DataChannel transport (brief §3.7): reliable and ordered (the RTCDataChannel defaults), signalled
// through the relay's /signal endpoint. Point to point: a controller or viewer (initiator) ↔ the host
// (responder, id 'host'). The host accepts any number of peers with acceptWebRtcPeers(). No STUN/TURN by
// default (LAN use, R7); pass iceServers for anything else.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';
import { DEFAULT_BACKOFF, backoffDelay, type BackoffOptions } from './backoff.ts';
import type { WebSocketCtor, WebSocketLike } from './websocket.ts';

export const HOST_SIGNAL_ID = 'host';

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit | null;
}

export interface Signaling {
  readonly selfId: string;
  send(to: string, data: SignalData): void;
  onSignal(fn: (from: string, data: SignalData) => void): () => void;
  close(): void;
}

/** Signalling over the relay's /signal endpoint (url is the relay base, e.g. ws://host:8787). */
export function createRelaySignaling(o: { url: string; session: string; peerId: string; WebSocketImpl?: WebSocketCtor }): Signaling {
  const Impl = o.WebSocketImpl ?? (WebSocket as unknown as WebSocketCtor);
  const u = new URL(o.url);
  u.pathname = '/signal';
  u.search = `?session=${encodeURIComponent(o.session)}&peer=${encodeURIComponent(o.peerId)}`;
  const fns = new Set<(from: string, d: SignalData) => void>();
  const queue: string[] = [];
  const ws: WebSocketLike = new Impl(u.toString());
  ws.onopen = () => {
    for (const q of queue.splice(0)) ws.send(q);
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string') return;
    try {
      const f = JSON.parse(ev.data) as { from?: unknown; data?: unknown };
      if (typeof f.from === 'string' && f.data && typeof f.data === 'object') for (const fn of [...fns]) fn(f.from, f.data as SignalData);
    } catch {
      /* ignore malformed signalling */
    }
  };
  return {
    selfId: o.peerId,
    send(to, data) {
      const s = JSON.stringify({ to, data });
      if (ws.readyState === 1) ws.send(s);
      else queue.push(s);
    },
    onSignal(fn) {
      fns.add(fn);
      return () => {
        fns.delete(fn);
      };
    },
    close: () => ws.close(1000, 'closed'),
  };
}

/** The subset of RTCPeerConnection used here (the browser's, or a fake in tests). */
export interface PeerConnectionLike {
  connectionState: string;
  onicecandidate: ((ev: { candidate: { toJSON(): RTCIceCandidateInit } | null }) => void) | null;
  ondatachannel: ((ev: { channel: DataChannelLike }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  createDataChannel(label: string, init?: { ordered?: boolean }): DataChannelLike;
  createOffer(): Promise<{ type: 'offer'; sdp?: string }>;
  createAnswer(): Promise<{ type: 'answer'; sdp?: string }>;
  setLocalDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void>;
  setRemoteDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void>;
  addIceCandidate(c: RTCIceCandidateInit): Promise<void>;
  close(): void;
}
export interface DataChannelLike {
  readonly readyState: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}
export type PeerConnectionCtor = new (config: { iceServers: RTCIceServer[] }) => PeerConnectionLike;

export interface WebRtcOptions {
  signaling: Signaling;
  /** The other side's signalling id (HOST_SIGNAL_ID for controllers/viewers). */
  remoteId: string;
  /** true: create the channel and the offer, and reconnect with backoff. false: answer one offer. */
  initiator: boolean;
  RTCPeerConnectionImpl?: PeerConnectionCtor;
  iceServers?: RTCIceServer[];
  backoff?: BackoffOptions;
}

class RtcTransport extends TransportBase {
  readonly kind = 'webrtc' as const;
  private readonly o: WebRtcOptions;
  private readonly Impl: PeerConnectionCtor;
  private pc: PeerConnectionLike | null = null;
  private dc: DataChannelLike | null = null;
  private attempt = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private readonly offSignal: () => void;
  /** Trickled candidates that arrive before the remote description is set are held here. */
  private early: RTCIceCandidateInit[] = [];
  private remoteSet = false;

  constructor(o: WebRtcOptions, firstOffer?: SignalData) {
    super();
    this.o = o;
    this.Impl = o.RTCPeerConnectionImpl ?? (RTCPeerConnection as unknown as PeerConnectionCtor);
    this.offSignal = o.signaling.onSignal((from, d) => {
      if (from === o.remoteId) void this.onSignal(d);
    });
    this.start();
    if (firstOffer) void this.onSignal(firstOffer);
  }

  private start(): void {
    this.setStatus('connecting');
    const pc = new this.Impl({ iceServers: this.o.iceServers ?? [] });
    this.pc = pc;
    this.early = [];
    this.remoteSet = false;
    pc.onicecandidate = (ev) => {
      if (this.pc === pc) this.o.signaling.send(this.o.remoteId, { type: 'candidate', candidate: ev.candidate ? ev.candidate.toJSON() : null });
    };
    pc.onconnectionstatechange = () => {
      if (this.pc === pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) this.lost();
    };
    if (this.o.initiator) {
      this.bind(pc.createDataChannel('pme', { ordered: true }));
      void (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (this.pc === pc) this.o.signaling.send(this.o.remoteId, { type: 'offer', ...(offer.sdp !== undefined ? { sdp: offer.sdp } : {}) });
      })();
    } else {
      pc.ondatachannel = (ev) => this.bind(ev.channel);
    }
  }

  private bind(dc: DataChannelLike): void {
    this.dc = dc;
    dc.onopen = () => {
      if (this.dc !== dc) return;
      this.attempt = 0;
      this.setStatus('open');
    };
    dc.onclose = () => {
      if (this.dc === dc) this.lost();
    };
    dc.onmessage = (ev) => {
      if (this.dc !== dc || typeof ev.data !== 'string') return;
      try {
        this.deliver(JSON.parse(ev.data));
      } catch {
        this.rejected++;
      }
    };
  }

  private async onSignal(d: SignalData): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    if (d.type === 'offer' && !this.o.initiator) {
      await pc.setRemoteDescription({ type: 'offer', ...(d.sdp !== undefined ? { sdp: d.sdp } : {}) });
      await this.remoteReady(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.o.signaling.send(this.o.remoteId, { type: 'answer', ...(answer.sdp !== undefined ? { sdp: answer.sdp } : {}) });
    } else if (d.type === 'answer' && this.o.initiator) {
      await pc.setRemoteDescription({ type: 'answer', ...(d.sdp !== undefined ? { sdp: d.sdp } : {}) });
      await this.remoteReady(pc);
    } else if (d.type === 'candidate' && d.candidate) {
      if (!this.remoteSet) this.early.push(d.candidate);
      else await pc.addIceCandidate(d.candidate).catch(() => undefined);
    }
  }

  private async remoteReady(pc: PeerConnectionLike): Promise<void> {
    this.remoteSet = true;
    for (const c of this.early.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
  }

  /** The channel or connection died: the initiator retries with backoff; a responder closes for good. */
  private lost(): void {
    if (this.closed) return;
    this.dropPc();
    if (!this.o.initiator) {
      this.close();
      return;
    }
    this.setStatus('connecting');
    this.retry = setTimeout(() => {
      this.retry = null;
      if (!this.closed) this.start();
    }, backoffDelay(this.attempt++, this.o.backoff ?? DEFAULT_BACKOFF));
  }

  private dropPc(): void {
    const pc = this.pc;
    const dc = this.dc;
    this.pc = null;
    this.dc = null;
    dc?.close();
    pc?.close();
  }

  protected write(m: WireMessage): void {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(m));
  }

  /** Test hook: kill the channel as if the network failed. */
  dropForTest(): void {
    this.dc?.close();
  }

  protected teardown(): void {
    if (this.retry !== null) clearTimeout(this.retry);
    this.offSignal();
    this.dropPc();
  }
}

export type WebRtcTransport = ManagedTransport & { dropForTest(): void };

/** Initiator (controller/viewer) side, or a responder for one already-received offer (used by acceptWebRtcPeers). */
export function createWebRtcTransport(o: WebRtcOptions, firstOffer?: SignalData): WebRtcTransport {
  return new RtcTransport(o, firstOffer);
}

/**
 * Host side: answer every incoming offer with a new responder transport. A second offer from the same peer
 * (it reconnected) replaces its old transport. Returns a stop function.
 */
export function acceptWebRtcPeers(o: {
  signaling: Signaling;
  onTransport: (t: ManagedTransport, peerId: string) => void;
  RTCPeerConnectionImpl?: PeerConnectionCtor;
  iceServers?: RTCIceServer[];
}): () => void {
  const byPeer = new Map<string, WebRtcTransport>();
  const off = o.signaling.onSignal((from, d) => {
    if (d.type !== 'offer') return;
    byPeer.get(from)?.close();
    const t = createWebRtcTransport(
      {
        signaling: o.signaling,
        remoteId: from,
        initiator: false,
        ...(o.RTCPeerConnectionImpl ? { RTCPeerConnectionImpl: o.RTCPeerConnectionImpl } : {}),
        ...(o.iceServers ? { iceServers: o.iceServers } : {}),
      },
      d,
    );
    byPeer.set(from, t);
    o.onTransport(t, from);
  });
  return () => {
    off();
    for (const t of byPeer.values()) t.close();
    byPeer.clear();
  };
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/transport && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: all transport files pass — in-process 6, postMessage 6, broadcastChannel 6, websocket 6 (unit) + 6 (relay), webrtc 7; typecheck exits 0. The real browser WebRTC path is exercised in Task 23.

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/transport/webrtc.ts packages/controller/test/fakes/fake-rtc.ts packages/controller/test/transport/webrtc.test.ts
git commit -m "feat(controller): WebRTC DataChannel transport with relay signalling, host acceptor and initiator reconnect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: The control vocabulary

**Files:**
- Create: `packages/controller/src/vocabulary.ts`, `packages/controller/test/vocabulary.test.ts`

**Interfaces:**
- Consumes: engine-core `LEAD_IDS`, `RHYTHMS`, `RHYTHM_IDS`, `RhythmId`, `StateVar`, `createEngine` (test).
- Produces: `interface VarSpec { id: StateVar; label; unit; min; max; step; normal; rampable; pinnable }`; `interface EnumOption { value; label }`; `type ModifierField`; `type ModifierSpec = {kind:'number'; path; label; min; max; step; normal} | {kind:'object'; path; label; fields: ModifierField[]}`; `interface DeviceSpec { id; label; device: 'ecg'; action: 'filter'|'lead'; options; normal: string | string[]; lanes? }`; `interface Vocabulary { schema: 'pme-vocabulary/1'; engineVersion; variables; rhythms: Array<{id; label; defaultRateBpm}>; modifiers; devices; ramp: { maxDurationS; curves }; constraints }`; `stage1Vocabulary(engineVersion?)`; `vocabularyOf(engine: { version; vocabulary?() }): Vocabulary`. This shape is engine request E2.

- [x] **Step 1: Write the failing test**

`packages/controller/test/vocabulary.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createEngine, RHYTHM_IDS } from '@pme/engine-core';
import { stage1Vocabulary, vocabularyOf, type Vocabulary } from '../src/vocabulary.ts';

describe('vocabulary', () => {
  it('describes exactly what the Stage 1 engine accepts', () => {
    const e = createEngine({ seed: 1 });
    const v = vocabularyOf(e);
    expect(v.schema).toBe('pme-vocabulary/1');
    expect(v.rhythms.map((r) => r.id)).toEqual(RHYTHM_IDS);
    let n = 0;
    for (const spec of v.variables) {
      const r = e.dispatch({ id: `v${n++}`, issuedBy: 't', type: 'setTarget', variable: spec.id, value: spec.normal, ramp: { durationS: 5 } });
      expect(r.accepted, spec.id).toBe(true);
    }
    for (const r of v.rhythms) expect(e.dispatch({ id: `r${n++}`, issuedBy: 't', type: 'setRhythm', rhythm: r.id }).accepted).toBe(true);
    for (const d of v.devices) for (const o of d.options) {
      const action = { device: d.device, action: d.action, value: o.value, ...(d.lanes ? { lane: 0 } : {}) };
      expect(e.dispatch({ id: `d${n++}`, issuedBy: 't', type: 'device', action }).accepted, `${d.id}=${o.value}`).toBe(true);
    }
  });

  it("prefers the engine's own vocabulary() when it reports one (Stage 5+)", () => {
    const own: Vocabulary = { ...stage1Vocabulary('9.9.9'), variables: [] };
    expect(vocabularyOf({ version: '9.9.9', vocabulary: () => own })).toBe(own);
    expect(vocabularyOf({ version: '1.0.0', vocabulary: () => ({ something: 'else' }) }).engineVersion).toBe('1.0.0');
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/vocabulary.test.ts`
Expected: FAIL — cannot load `../src/vocabulary.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/vocabulary.ts`:
```ts
// The control vocabulary (brief §7.1 `vocabulary()`: bounds, normals, enums, constraints — Squiggler-style,
// research 04 §5). The brief names the type but not its shape; this file defines it. Until engine-core
// implements vocabulary() (BUILD-PLAN Stage 5), vocabularyOf() falls back to stage1Vocabulary(), which
// describes exactly what the Stage 1 engine accepts. The panel and the remote generate their controls from it,
// so Stage 2/5 parameters appear by themselves once the engine reports them.
import { LEAD_IDS, RHYTHMS, RHYTHM_IDS, type RhythmId, type StateVar } from '@pme/engine-core';

export interface VarSpec {
  id: StateVar;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  normal: number;
  /** setTarget accepts a ramp. */
  rampable: boolean;
  /** pin/release apply (MODELED mode only, brief §4.9). */
  pinnable: boolean;
}

export interface EnumOption {
  value: string;
  label: string;
}

/** One field of a modifier. `path` is dotted inside `Modifiers` (e.g. 'artefact.noise'). */
export type ModifierField =
  | { key: string; label: string; type: 'number'; min: number; max: number; step: number; normal: number }
  | { key: string; label: string; type: 'enum'; options: EnumOption[]; normal: string };

/**
 * A modifier control. kind 'number' → setModifiers({[path]: value}); kind 'object' → an on/off toggle whose
 * "on" value is an object built from `fields` and whose "off" value is null (e.g. pvc).
 */
export type ModifierSpec =
  | { kind: 'number'; path: string; label: string; min: number; max: number; step: number; normal: number }
  | { kind: 'object'; path: string; label: string; fields: ModifierField[] };

/** A device action with a fixed option list (brief §7.2 DeviceAction). `lanes` > 0 → one control per lane. */
export interface DeviceSpec {
  id: string;
  label: string;
  device: 'ecg';
  action: 'filter' | 'lead';
  options: EnumOption[];
  normal: string | string[];
  lanes?: number;
}

export interface Vocabulary {
  schema: 'pme-vocabulary/1';
  engineVersion: string;
  variables: VarSpec[];
  rhythms: Array<{ id: RhythmId; label: string; defaultRateBpm: number }>;
  modifiers: ModifierSpec[];
  devices: DeviceSpec[];
  ramp: { maxDurationS: number; curves: Array<'linear' | 'exp' | 'sigmoid'> };
  constraints: Array<{ id: string; text: string }>;
}

const RHYTHM_LABEL: Record<RhythmId, string> = {
  sinus: 'Sinus', sinusBrady: 'Sinus bradycardia', sinusTachy: 'Sinus tachycardia', afib: 'Atrial fibrillation',
  aflutter: 'Atrial flutter', svtAvnrt: 'SVT (AVNRT)', avb1: '1st-degree AV block', avb2Mobitz1: '2nd-degree Mobitz I',
  avb3Narrow: '3rd-degree, narrow escape', avb3Wide: '3rd-degree, wide escape', vtMono: 'Monomorphic VT', asystole: 'Asystole',
};

/** What the Stage 1 engine accepts (engine.ts validate()). */
export function stage1Vocabulary(engineVersion = '0.0.0'): Vocabulary {
  return {
    schema: 'pme-vocabulary/1',
    engineVersion,
    variables: [{ id: 'hr', label: 'HR', unit: 'bpm', min: 0, max: 300, step: 1, normal: 75, rampable: true, pinnable: false }],
    rhythms: RHYTHM_IDS.map((id) => ({ id, label: RHYTHM_LABEL[id] ?? id, defaultRateBpm: RHYTHMS[id].defaultRateBpm })),
    modifiers: [
      {
        kind: 'object', path: 'pvc', label: 'PVCs',
        fields: [
          { key: 'pattern', label: 'Pattern', type: 'enum', options: [{ value: 'single', label: 'Single' }, { value: 'bigeminy', label: 'Bigeminy' }], normal: 'bigeminy' },
          { key: 'probability', label: 'Probability', type: 'number', min: 0, max: 0.9, step: 0.05, normal: 0.2 },
        ],
      },
      { kind: 'number', path: 'rsa', label: 'RSA depth', min: 0, max: 1, step: 0.05, normal: 0.67 },
      { kind: 'number', path: 'artefact.noise', label: 'Noise', min: 0, max: 3, step: 0.1, normal: 1 },
    ],
    devices: [
      { id: 'ecg.filter', label: 'ECG filter', device: 'ecg', action: 'filter', options: [{ value: 'monitor', label: 'Monitor' }, { value: 'diagnostic', label: 'Diagnostic' }], normal: 'monitor' },
      { id: 'ecg.lead', label: 'Lead', device: 'ecg', action: 'lead', options: LEAD_IDS.map((l) => ({ value: l, label: l.replace('ecg', '') })), normal: ['ecgII', 'V5'], lanes: 2 },
    ],
    ramp: { maxDurationS: 900, curves: ['linear', 'exp', 'sigmoid'] },
    constraints: [{ id: 'stage1-hr-only', text: 'Stage 1 engine: only HR takes targets; other variables arrive with Stage 2.' }],
  };
}

/** The engine's own vocabulary when it has one (Stage 5+), else the Stage 1 description. */
export function vocabularyOf(engine: { readonly version: string; vocabulary?: () => unknown }): Vocabulary {
  const v = engine.vocabulary?.();
  if (v && typeof v === 'object' && (v as Vocabulary).schema === 'pme-vocabulary/1') return v as Vocabulary;
  return stage1Vocabulary(engine.version);
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/vocabulary.test.ts`
Expected: `2 passed` — every Stage 1 vocabulary entry is accepted by a real engine.

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/vocabulary.ts packages/controller/test/vocabulary.test.ts
git commit -m "feat(controller): pme-vocabulary/1 with a Stage 1 fallback that the engine accepts entry by entry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: HostSession — the host end of every transport

**Files:**
- Create: `packages/controller/src/session/host-session.ts`, `packages/controller/test/fakes/manual-host.ts`, `packages/controller/test/session/host-session.test.ts`

**Interfaces:**
- Consumes: protocol types and `createStamper`, `newPeerId`, `SeqFilter` (Task 2); `createInProcessHub` (4); helpers (4); engine-core `Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds, StateVar, Tick`.
- Produces:
  - `interface HostTarget { dispatch(cmd): DispatchResult | Promise<…>; snapshot(): PatientSnapshot | Promise<…>; restore(s): void | Promise<void>; on(fn): () => void; now(): { tick; simT }; time(action: 'pause'|'resume'|'scale', value?): void }`.
  - `type ScenarioHook = (cmd: ScenarioCommand) => DispatchResult | Promise<DispatchResult>` (**Stage 6b's runner plugs in here**).
  - `interface HostSessionOptions { session; target; peerId?; wallNow?; stateIntervalMs? (1000; 0 = off); scenario?; onCommand?(info: { commandId; from; receivedAt; tick; accepted }) }`.
  - `STAGE_LEAD_TICKS = 3`.
  - `class HostSession { peerId; stats: { applied; rejected; duplicates; snapshotsSent }; addTransport(t): () => void; bookmarks(): string[]; flush(); emitState(); close() }`.
  - Behaviour: `hello(host)` on every transport `open`; a peer `hello` → sticky `commandApplied{replay:true}` batch, then a fresh `snapshot`, on that transport; `command` → de-dup by id (cached ack, no re-dispatch) → dispatch (stageGroup → shared `atTick`; `time` and `scenario bookmark|restoreBookmark` handled here; `scenario` other → hook or reject; `pin|release|setFactor|setMode` rejected) → `ack` on that transport → `commandApplied{ resolved: { command: {...cmd, atTick} } }` to all; engine events except `tone`/`toneCancel` are batched into one `event` message per microtask (= per frame); a target-derived `state` every `stateIntervalMs` and after each `time` command, unless the engine emits its own `state` (E1).
  - Test fake `manualHost(opts?): ManualHost` (`HostTarget` over `createEngine` with `advance(wallMs)`, `paused`, `scale`, `engine`).

- [x] **Step 1: Write the fake and the failing test**

`packages/controller/test/fakes/manual-host.ts`:
```ts
// HostTarget over a bare engine with a manual clock (no renderer), for Node tests.
import { createEngine, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import type { HostTarget } from '../../src/session/host-session.ts';

export interface ManualHost extends HostTarget {
  engine: MonitorEngine;
  /** Advance by wall ms (× time scale, unless paused). */
  advance(wallMs: number): void;
  paused: boolean;
  scale: number;
}

export function manualHost(opts: EngineOptions = { seed: 7 }): ManualHost {
  const engine = createEngine(opts);
  const h: ManualHost = {
    engine,
    paused: false,
    scale: 1,
    dispatch: (c) => engine.dispatch(c),
    snapshot: () => engine.snapshot(),
    restore: (s) => engine.restore(s),
    on: (fn) => engine.on(fn),
    now: () => engine.now(),
    time(action, value) {
      if (action === 'pause') h.paused = true;
      if (action === 'resume') h.paused = false;
      if (action === 'scale' && value !== undefined) h.scale = value;
    },
    advance(wallMs) {
      if (!h.paused) engine.advanceTo(engine.now().simT + (wallMs / 1000) * h.scale + 1e-9);
    },
  };
  return h;
}
```

`packages/controller/test/session/host-session.test.ts`:
```ts
// HostSession against a raw peer on the in-process hub (the peer plays controller/viewer by hand).
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession, STAGE_LEAD_TICKS } from '../../src/session/host-session.ts';
import { createStamper, type AppliedResolution, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'HST234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function setup(opts: Partial<ConstructorParameters<typeof HostSession>[0]> = {}) {
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs: 0, ...opts });
  hs.addTransport(hub.connect());
  const peer = hub.connect();
  const got = collect(peer);
  const stamp = createStamper(S, 'peer-1');
  let n = 0;
  const command = (body: Record<string, unknown>) => peer.send(stamp({ kind: 'command', body: { id: `k${++n}`, issuedBy: 'test', ...body } as never }));
  const of = <K extends WireMessage['kind']>(k: K) => got.filter((m) => m.kind === k) as Array<Extract<WireMessage, { kind: K }>>;
  const events = () => of('event').flatMap((m) => m.body);
  return { host, peer, got, stamp, command, of, events, hs: hs as HostSession };
}
const hello = (peer: ManagedTransport, stamp: ReturnType<typeof createStamper>, role: 'viewer' | 'controller' = 'viewer') => peer.send(stamp({ kind: 'hello', role }));

describe('HostSession', () => {
  it('says hello as host on every transport it is given', async () => {
    setup();
    const hub = createInProcessHub();
    const watcher = hub.connect();
    const got = collect(watcher);
    hs!.addTransport(hub.connect());
    await waitFor(() => got.some((m) => m.kind === 'hello' && m.role === 'host'));
  });

  it('answers a hello with sticky replays, then a fresh snapshot', async () => {
    const { host, peer, stamp, command, of } = setup();
    command({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V2', lane: 1 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    hello(peer, stamp);
    await waitFor(() => of('snapshot').length === 1);
    const snap = of('snapshot')[0]!;
    expect(snap.body.tick).toBe(host.engine.now().tick);
    const isReplay = (e: unknown) => (e as { type: string }).type === 'commandApplied' && !!((e as { resolved: AppliedResolution }).resolved.replay);
    const replayMsg = of('event').find((m) => m.body.some(isReplay))!;
    expect(replayMsg.body.filter(isReplay)).toHaveLength(1);
    expect(replayMsg.seq).toBeLessThan(snap.seq); // replays first: the viewer applies them before restoring
  });

  it('dispatches commands, acks the issuer, and announces commandApplied with the applied tick', async () => {
    const { command, of, events, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 100, ramp: { durationS: 4 } });
    await waitFor(() => of('ack').length === 1 && events().some((e) => e.type === 'commandApplied'));
    const ack = of('ack')[0]!;
    expect(ack).toMatchObject({ commandId: 'k1', accepted: true, tick: host.engine.now().tick + 1 });
    const applied = events().find((e) => e.type === 'commandApplied')!;
    expect((applied as { resolved: AppliedResolution }).resolved.command).toMatchObject({ id: 'k1', atTick: ack.tick });
  });

  it('acks rejections with the engine reason, and rejects MODELED-only and 6b-only commands', async () => {
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'sbp', value: 120 });
    command({ type: 'pin', variable: 'hr', value: 60 });
    command({ type: 'scenario', action: 'goto', target: 'vf' });
    command({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => of('ack').length === 4);
    expect(of('ack').map((a) => a.accepted)).toEqual([false, false, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 2/);
    expect(of('ack')[1]!.reason).toMatch(/MODELED/);
    expect(of('ack')[2]!.reason).toMatch(/Stage 6b/);
  });

  it('hands scenario load/goto/trigger to the Stage 6b hook when one is given', async () => {
    const seen: string[] = [];
    const { command, of } = setup({ scenario: (c) => (seen.push(c.action), { accepted: true, tick: 0 }) });
    command({ type: 'scenario', action: 'trigger', target: 'shock' });
    await waitFor(() => of('ack').length === 1);
    expect(seen).toEqual(['trigger']);
    expect(of('ack')[0]!.accepted).toBe(true);
  });

  it('never forwards local-only audio events (tone, toneCancel)', async () => {
    const { host, events } = setup();
    host.advance(5000);
    await sleep(10);
    const types = new Set(events().map((e) => e.type));
    expect(types.has('beat')).toBe(true);
    expect(types.has('measurement')).toBe(true);
    expect(types.has('tone')).toBe(false);
    expect(types.has('toneCancel')).toBe(false);
  });

  it('batches the events of one frame into one message', async () => {
    const { host, of } = setup();
    host.advance(3000); // one synchronous burst = one "frame"
    await sleep(5);
    expect(of('event')).toHaveLength(1);
    expect(of('event')[0]!.body.length).toBeGreaterThan(3);
  });

  it('time commands pause/scale the target, emit state at once, and replay to late joiners', async () => {
    const { host, command, of, events, peer, stamp } = setup();
    command({ type: 'time', action: 'pause' });
    command({ type: 'time', action: 'scale', value: 2 });
    command({ type: 'time', action: 'scale', value: 9 });
    await waitFor(() => of('ack').length === 3);
    expect(host.paused).toBe(true);
    expect(host.scale).toBe(2);
    expect(of('ack')[2]!.accepted).toBe(false);
    expect(events().filter((e) => e.type === 'state').length).toBeGreaterThanOrEqual(2);
    hello(peer, stamp);
    await waitFor(() => of('snapshot').length === 1);
    const replayed = events().filter((e) => e.type === 'commandApplied' && (e.resolved as AppliedResolution).replay).map((e) => ((e as { resolved: AppliedResolution }).resolved.command as { action: string }).action);
    expect(replayed.sort()).toEqual(['pause', 'scale']);
  });

  it('synthesises a target-derived state event with a ramping flag (engine request E1)', async () => {
    const { command, of, events, hs: h, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    h.emitState();
    await sleep(5);
    const st = events().filter((e) => e.type === 'state').at(-1) as Extract<ReturnType<typeof events>[number], { type: 'state' }>;
    expect(st.values.hr).toBe(120);
    expect(st.control.hr).toBe('ramping');
    host.advance(10_000);
    h.emitState();
    await sleep(5);
    const st2 = events().filter((e) => e.type === 'state').at(-1) as typeof st;
    expect(st2.control.hr).toBeUndefined();
  });

  it('aligns a stageGroup on one tick STAGE_LEAD_TICKS ahead', async () => {
    const { command, of, host } = setup();
    const t0 = host.engine.now().tick;
    command({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g' });
    await waitFor(() => of('ack').length === 1);
    host.advance(40);
    command({ type: 'setRhythm', rhythm: 'sinus', stageGroup: 'g' });
    await waitFor(() => of('ack').length === 2);
    expect(of('ack').map((a) => a.tick)).toEqual([t0 + STAGE_LEAD_TICKS, t0 + STAGE_LEAD_TICKS]);
  });

  it('bookmarks and restores, then re-announces itself so viewers resync', async () => {
    const { host, command, of, hs: h } = setup();
    host.advance(2000);
    command({ type: 'scenario', action: 'bookmark' });
    await waitFor(() => of('ack').length === 1);
    expect(h.bookmarks()).toEqual(['Bookmark 1']);
    host.advance(5000);
    const hellos = of('hello').length;
    command({ type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1' });
    await waitFor(() => of('ack').length === 2 && of('hello').length === hellos + 1);
    expect(host.engine.now().tick).toBe(100);
    command({ type: 'scenario', action: 'restoreBookmark', target: 'nope' });
    await waitFor(() => of('ack').length === 3);
    expect(of('ack')[2]!.accepted).toBe(false);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/host-session.test.ts`
Expected: FAIL — cannot load `../../src/session/host-session.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/session/host-session.ts`:
```ts
// The host end of every transport (brief §3.7, R7): it owns the engine. Commands in → dispatch → ack; engine
// events out, batched per frame; a `state` event at 1 Hz; a snapshot for anyone who says hello.
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds, StateVar, Tick } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
  type ControlFlag,
  type ManagedTransport,
  type ScenarioCommand,
  type StateEvent,
  type TimeCommand,
  type WireBody,
  type WireCommand,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';

/** What a host needs from the monitor it owns. Sync or async (a worker-backed monitor returns promises). */
export interface HostTarget {
  dispatch(cmd: Command): DispatchResult | Promise<DispatchResult>;
  snapshot(): PatientSnapshot | Promise<PatientSnapshot>;
  restore(s: PatientSnapshot): void | Promise<void>;
  on(fn: (e: EngineEvent) => void): () => void;
  now(): { tick: Tick; simT: SimSeconds };
  /** Remote equivalents of the lifecycle calls (brief §7.2 `time`): pause, resume, scale (0.25–4). */
  time(action: 'pause' | 'resume' | 'scale', value?: number): void;
}

/** Stage 6b plugs the scenario runner in here; until then load/goto/trigger/pause/resume are rejected. */
export type ScenarioHook = (cmd: ScenarioCommand) => DispatchResult | Promise<DispatchResult>;

export interface HostSessionOptions {
  session: string;
  target: HostTarget;
  peerId?: string;
  wallNow?: () => number;
  /** Synthesised `state` period (brief §7.3: 1 Hz). 0 disables the timer (tests call emitState()). */
  stateIntervalMs?: number;
  scenario?: ScenarioHook;
  /** Latency instrumentation: called when a remote command has been dispatched. */
  onCommand?: (info: { commandId: string; from: string; receivedAt: number; tick: Tick; accepted: boolean }) => void;
}

/** Commands that share a stageGroup land on one tick this many ticks after the first arrives (60 ms) [ENG]. */
export const STAGE_LEAD_TICKS = 3;
const STAGE_GROUP_TTL_MS = 5000;
const SEEN_MAX = 500;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
const LOCAL_ONLY = new Set<WireEvent['type']>(['tone', 'toneCancel']);
const TICK_S = 0.02;

type AckBody = Extract<WireBody, { kind: 'ack' }>;

export class HostSession {
  readonly peerId: string;
  private readonly o: HostSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly transports = new Map<ManagedTransport, () => void>();
  private readonly seqs = new SeqFilter();
  private readonly seen = new Map<string, AckBody>();
  private readonly groups = new Map<string, { tick: Tick; at: number }>();
  private readonly sticky = new Map<string, WireCommand>();
  private readonly marks = new Map<string, PatientSnapshot>();
  private readonly targets = new Map<StateVar, { value: number; untilT: number }>();
  private batch: WireEvent[] = [];
  private flushQueued = false;
  private chain: Promise<void> = Promise.resolve();
  private engineState = false;
  private readonly offEngine: () => void;
  private readonly timer: ReturnType<typeof setInterval> | null;
  private bookmarkN = 0;
  readonly stats = { applied: 0, rejected: 0, duplicates: 0, snapshotsSent: 0 };

  constructor(o: HostSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('host');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offEngine = o.target.on((e) => {
      if (e.type === ('state' as EngineEvent['type'])) this.engineState = true; // the engine emits its own (E1)
      if (!LOCAL_ONLY.has(e.type)) this.queue(e);
    });
    const period = o.stateIntervalMs ?? 1000;
    this.timer = period > 0 ? setInterval(() => this.emitState(), period) : null;
  }

  /** Serve peers on this transport. Returns a detach function. */
  addTransport(t: ManagedTransport): () => void {
    const offMsg = t.onMessage((m) => {
      this.chain = this.chain.then(() => this.receive(t, m)).catch((err) => console.error('[pme host]', err));
    });
    const offStatus = t.onStatus((s) => {
      if (s === 'open') t.send(this.stamp({ kind: 'hello', role: 'host' }));
      if (s === 'closed') this.detach(t);
    });
    this.transports.set(t, () => {
      offMsg();
      offStatus();
    });
    return () => this.detach(t);
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
  }

  /** Send the queued events now (normally a microtask after the frame that produced them). */
  flush(): void {
    this.flushQueued = false;
    if (this.batch.length === 0) return;
    const body = this.batch;
    this.batch = [];
    this.broadcast({ kind: 'event', body });
  }

  /** Emit a `state` event (brief §7.3). Target-derived until the engine emits its own (engine request E1). */
  emitState(): void {
    if (this.engineState) return;
    const { tick, simT } = this.o.target.now();
    const values: Partial<Record<StateVar, number>> = {};
    const control: Partial<Record<StateVar, ControlFlag>> = {};
    for (const [v, r] of this.targets) {
      values[v] = r.value;
      if (simT < r.untilT) control[v] = 'ramping';
    }
    const ev: StateEvent = { type: 'state', t: simT, tick, mode: 'manual', values, control };
    this.queue(ev);
  }

  close(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.offEngine();
    for (const t of [...this.transports.keys()]) this.detach(t);
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private detach(t: ManagedTransport): void {
    this.transports.get(t)?.();
    this.transports.delete(t);
  }

  private queue(e: WireEvent): void {
    this.batch.push(e);
    if (!this.flushQueued) {
      this.flushQueued = true;
      queueMicrotask(() => this.flush());
    }
  }

  private broadcast(b: WireBody): void {
    const m = this.stamp(b);
    for (const t of this.transports.keys()) t.send(m);
  }

  private async receive(t: ManagedTransport, m: WireMessage): Promise<void> {
    if (m.from === this.peerId || this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
    if (m.kind === 'command') return this.command(t, m.body, m.from);
  }

  /** A peer said hello: replay sticky commands, then a fresh snapshot (brief §3.7 late join). */
  private async welcome(t: ManagedTransport): Promise<void> {
    const { tick } = this.o.target.now();
    const replay: WireEvent[] = [...this.sticky.values()].map((command) => ({
      type: 'commandApplied',
      commandId: command.id,
      tick,
      resolved: { command, replay: true } satisfies AppliedResolution,
    }));
    this.flush();
    if (replay.length) t.send(this.stamp({ kind: 'event', body: replay }));
    t.send(this.stamp({ kind: 'snapshot', body: await this.o.target.snapshot() }));
    this.stats.snapshotsSent++;
  }

  private async command(t: ManagedTransport, cmd: WireCommand, from: string): Promise<void> {
    const receivedAt = this.now();
    const prior = this.seen.get(cmd.id);
    if (prior) {
      this.stats.duplicates++;
      t.send(this.stamp(prior)); // idempotent: same ack, no second application
      return;
    }
    const { result, applied } = await this.apply(cmd);
    const ack: AckBody = {
      kind: 'ack', commandId: cmd.id, accepted: result.accepted, tick: result.tick,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
    };
    if (this.seen.size >= SEEN_MAX) this.seen.delete(this.seen.keys().next().value as string);
    this.seen.set(cmd.id, ack);
    t.send(this.stamp(ack));
    this.o.onCommand?.({ commandId: cmd.id, from, receivedAt, tick: result.tick, accepted: result.accepted });
    if (!result.accepted) {
      this.stats.rejected++;
      return;
    }
    this.stats.applied++;
    this.queue({ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
    if (cmd.type === 'time') this.emitState();
  }

  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async apply(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick, simT } = this.o.target.now();
    const reject = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    if (cmd.type === 'time') return this.time(cmd);
    if (cmd.type === 'scenario') return this.scenario(cmd);
    if (cmd.type === 'pin' || cmd.type === 'release' || cmd.type === 'setFactor' || cmd.type === 'setMode') {
      return reject(`${cmd.type} needs MODELED mode (Stage 7)`);
    }
    let c: Command = cmd;
    if (cmd.stageGroup) {
      const g = this.groups.get(cmd.stageGroup);
      const at = g && this.now() - g.at < STAGE_GROUP_TTL_MS ? g.tick : tick + STAGE_LEAD_TICKS;
      if (!g) this.groups.set(cmd.stageGroup, { tick: at, at: this.now() });
      c = { ...cmd, atTick: at };
    }
    const result = await this.o.target.dispatch(c);
    const applied: Command = { ...c, atTick: result.tick };
    if (result.accepted) {
      if (c.type === 'setTarget') {
        const r = c.ramp;
        const untilT = result.tick * TICK_S + (r ? (r.delayS ?? 0) + r.durationS : 0);
        this.targets.set(c.variable, { value: c.value, untilT });
      }
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'filter') this.sticky.set('ecg.filter', applied);
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'lead') this.sticky.set(`ecg.lead.${c.action.lane}`, applied);
    }
    this.pruneGroups();
    return { result, applied };
  }

  private time(cmd: TimeCommand): { result: DispatchResult; applied: WireCommand } {
    const { tick } = this.o.target.now();
    if (cmd.action === 'step' || cmd.action === 'jump') return { result: { accepted: false, tick, reason: `time ${cmd.action} arrives in Stage 6b` }, applied: cmd };
    if (cmd.action === 'scale' && !(typeof cmd.value === 'number' && cmd.value >= 0.25 && cmd.value <= 4)) {
      return { result: { accepted: false, tick, reason: 'scale must be 0.25–4' }, applied: cmd };
    }
    this.o.target.time(cmd.action, cmd.value);
    this.sticky.set(cmd.action === 'scale' ? 'time.scale' : 'time.run', cmd);
    return { result: { accepted: true, tick }, applied: cmd };
  }

  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick } = this.o.target.now();
    if (cmd.action === 'bookmark') {
      const label = cmd.target ?? `Bookmark ${++this.bookmarkN}`;
      this.marks.set(label, await this.o.target.snapshot());
      const applied: ScenarioCommand = { ...cmd, target: label };
      this.sticky.set(`bookmark.${label}`, applied);
      return { result: { accepted: true, tick }, applied };
    }
    if (cmd.action === 'restoreBookmark') {
      const snap = cmd.target !== undefined ? this.marks.get(cmd.target) : undefined;
      if (!snap) return { result: { accepted: false, tick, reason: `no bookmark ${String(cmd.target)}` }, applied: cmd };
      await this.o.target.restore(snap);
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' })); // viewers re-hello and resync
      return { result: { accepted: true, tick: snap.tick }, applied: cmd };
    }
    if (this.o.scenario) return { result: await this.o.scenario(cmd), applied: cmd };
    return { result: { accepted: false, tick, reason: `scenario ${cmd.action}: the scenario runner arrives in Stage 6b` }, applied: cmd };
  }

  private pruneGroups(): void {
    const now = this.now();
    for (const [k, g] of this.groups) if (now - g.at > STAGE_GROUP_TTL_MS) this.groups.delete(k);
  }
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/host-session.test.ts && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: `11 passed`; typecheck exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/session/host-session.ts packages/controller/test/fakes/manual-host.ts packages/controller/test/session/host-session.test.ts
git commit -m "feat(controller): HostSession — dispatch/ack with de-dup, per-frame event batches, 1 Hz state, sticky replays, snapshots, stage groups, bookmarks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: ControllerSession — commands with ids, resend until acked, live readout, log

**Files:**
- Create: `packages/controller/src/session/controller-session.ts`, `packages/controller/test/session/controller-session.test.ts`

**Interfaces:**
- Consumes: protocol (2), `TransportBase` (4, test), `createInProcessHub` (4, test).
- Produces: `interface LogEntry { at; simT: number | null; kind: 'command'|'ack'|'applied'|'note'|'status'|'alarm'|'marker'; text; commandId? }`; `interface ControllerSessionOptions { session; transport; peerId?; issuedBy? ('controller:<peerId>'); wallNow?; logMax? (500) }`; `class ControllerSession { peerId; log; measurements: MeasuredMap; state: StateEvent | null; simT; hostOnline; hostEngineVersion; bookmarks: string[]; status; pendingCount; send(input: CommandInput): Promise<AckResult>; note(text); onChange(fn): () => void; close() }` (ids are `<peerId>-<n>`; `close()` rejects pending sends with `Error('session closed')`); `describe(cmd): string` (one-line log text).

- [x] **Step 1: Write the failing test**

`packages/controller/test/session/controller-session.test.ts`:
```ts
// ControllerSession against a hand-driven fake host on the in-process hub.
import { describe, expect, it } from 'vitest';
import { ControllerSession, describe as describeCmd } from '../../src/session/controller-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

/** A transport whose status the test controls, looping writes back through `sent`. */
class ManualTransport extends TransportBase {
  readonly kind = 'websocket' as const;
  sent: WireMessage[] = [];
  protected write(m: WireMessage): void {
    this.sent.push(m);
  }
  protected teardown(): void {}
  set(s: 'open' | 'connecting'): void {
    this.setStatus(s);
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
}

const S = 'CTL234';
const host = createStamper(S, 'host-1');

describe('ControllerSession', () => {
  it('says hello on open, fills id and issuedBy, and resolves on ack with an RTT', async () => {
    const hub = createInProcessHub();
    const fakeHost = hub.connect();
    const atHost = collect(fakeHost);
    let wall = 1000;
    const s = new ControllerSession({ session: S, transport: hub.connect(), peerId: 'ctl-a', wallNow: () => wall });
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 90 });
    await waitFor(() => atHost.some((m) => m.kind === 'command'));
    expect(atHost[0]).toMatchObject({ kind: 'hello', role: 'controller' });
    const cmd = atHost.find((m) => m.kind === 'command') as Extract<WireMessage, { kind: 'command' }>;
    expect(cmd.body).toMatchObject({ id: 'ctl-a-1', issuedBy: 'controller:ctl-a', type: 'setTarget' });
    wall = 1042;
    fakeHost.send(host({ kind: 'ack', commandId: 'ctl-a-1', accepted: true, tick: 7 }));
    const r = await p;
    expect(r).toEqual({ commandId: 'ctl-a-1', accepted: true, tick: 7, rttMs: 42 });
    expect(s.pendingCount).toBe(0);
    s.close();
  });

  it('holds commands while disconnected and re-sends every unacked one on reconnect and on host hello', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-b' });
    s.send({ type: 'setRhythm', rhythm: 'afib' }).catch(() => undefined); // rejected by close() below
    expect(t.sent).toEqual([]); // not open yet
    t.set('open');
    expect(t.sent.map((m) => m.kind)).toEqual(['hello', 'command']);
    t.set('connecting');
    expect(s.hostOnline).toBe(false);
    t.set('open');
    expect(t.sent.map((m) => m.kind)).toEqual(['hello', 'command', 'hello', 'command']);
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    const cmds = t.sent.filter((m) => m.kind === 'command') as Array<Extract<WireMessage, { kind: 'command' }>>;
    expect(new Set(cmds.map((c) => c.body.id)).size).toBe(1); // always the same id → host de-duplicates
    expect(cmds.length).toBe(3);
    s.close();
  });

  it('tracks state, measurements, bookmarks and host version, and logs what happened', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    t.set('open');
    let changes = 0;
    s.onChange(() => changes++);
    t.inject(host({ kind: 'event', body: [
      { type: 'state', t: 12, tick: 600, mode: 'manual', values: { hr: 80 }, control: {} },
      { type: 'measurement', t: 12, values: { hr: { value: 79, flag: 'valid', at: 12 } } },
      { type: 'commandApplied', commandId: 'other-1', tick: 601, resolved: { command: { id: 'other-1', issuedBy: 'panel', type: 'scenario', action: 'bookmark', target: 'B1' } } },
      { type: 'alarm', t: 12, id: 'a', priority: 'high', category: 'physiological', state: 'raised', text: 'HR high' },
    ] }));
    t.inject(host({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: '0.0.0', seed: 1, tick: 600, state: {} } }));
    expect(s.state?.values.hr).toBe(80);
    expect(s.measurements.hr?.value).toBe(79);
    expect(s.simT).toBe(12);
    expect(s.bookmarks).toEqual(['B1']);
    expect(s.hostEngineVersion).toBe('0.0.0');
    expect(s.log.map((l) => l.kind)).toEqual(expect.arrayContaining(['status', 'applied', 'alarm']));
    s.note('IV access');
    expect(s.log.at(-1)).toMatchObject({ kind: 'note', text: 'IV access', simT: 12 });
    expect(changes).toBeGreaterThan(0);
    s.close();
  });

  it('drops duplicate messages (same sender, same or older seq)', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    t.set('open');
    const m = host({ kind: 'event', body: [{ type: 'measurement', t: 1, values: { hr: { value: 60, flag: 'valid', at: 1 } } }] });
    t.inject(m);
    t.inject({ ...m, body: [{ type: 'measurement', t: 2, values: { hr: { value: 99, flag: 'valid', at: 2 } } }] } as WireMessage);
    expect(s.measurements.hr?.value).toBe(60);
    s.close();
  });

  it('rejects pending sends on close and refuses new ones', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 50 });
    s.close();
    await expect(p).rejects.toThrow('session closed');
    await expect(s.send({ type: 'setTarget', variable: 'hr', value: 50 })).rejects.toThrow('session closed');
    await sleep(0);
  });

  it('describes commands in one line for the log', () => {
    expect(describeCmd({ id: 'x', issuedBy: 'y', type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 30, curve: 'sigmoid' } })).toBe('hr → 120 over 30 s (sigmoid)');
    expect(describeCmd({ id: 'x', issuedBy: 'y', type: 'time', action: 'scale', value: 2 })).toBe('time scale 2');
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/controller-session.test.ts`
Expected: FAIL — cannot load `../../src/session/controller-session.ts`.

- [x] **Step 3: Implement**

`packages/controller/src/session/controller-session.ts`:
```ts
// The controller end (same-screen panel over in-process, or a remote over BroadcastChannel/WebSocket/WebRTC).
// Commands carry a unique id; unacked ones are re-sent on every reconnect and host hello, and the host
// de-duplicates by id, so a Wi-Fi drop never applies a command twice (BUILD-PLAN Stage 6 acceptance 3).
import type { SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AckResult,
  type AppliedResolution,
  type CommandInput,
  type ManagedTransport,
  type MeasuredMap,
  type StateEvent,
  type TransportStatus,
  type WireBody,
  type WireCommand,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';

export interface LogEntry {
  /** Wall time (epoch ms) the entry was made. */
  at: number;
  /** Host sim time, when known. */
  simT: SimSeconds | null;
  kind: 'command' | 'ack' | 'applied' | 'note' | 'status' | 'alarm' | 'marker';
  text: string;
  commandId?: string;
}

export interface ControllerSessionOptions {
  session: string;
  transport: ManagedTransport;
  peerId?: string;
  /** issuedBy on every command (default 'controller:<peerId>'). */
  issuedBy?: string;
  wallNow?: () => number;
  logMax?: number;
}

interface Pending {
  cmd: WireCommand;
  sentAt: number;
  resolve: (r: AckResult) => void;
  reject: (e: Error) => void;
}

export class ControllerSession {
  readonly peerId: string;
  readonly log: LogEntry[] = [];
  readonly measurements: MeasuredMap = {};
  state: StateEvent | null = null;
  simT: SimSeconds | null = null;
  hostOnline = false;
  hostEngineVersion: string | null = null;
  bookmarks: string[] = [];
  private readonly o: ControllerSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly pending = new Map<string, Pending>();
  private readonly seqs = new SeqFilter();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private n = 0;
  private closed = false;

  constructor(o: ControllerSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('ctl');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offs = [
      o.transport.onStatus((s) => this.onStatus(s)),
      o.transport.onMessage((m) => this.onMessage(m)),
    ];
  }

  get status(): TransportStatus {
    return this.o.transport.status;
  }
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Send a command; resolves on the host's ack (accepted or not). Survives reconnects. */
  send(input: CommandInput): Promise<AckResult> {
    if (this.closed) return Promise.reject(new Error('session closed'));
    const cmd = { ...input, id: input.id ?? `${this.peerId}-${++this.n}`, issuedBy: this.o.issuedBy ?? `controller:${this.peerId}` } as WireCommand;
    return new Promise<AckResult>((resolve, reject) => {
      this.pending.set(cmd.id, { cmd, sentAt: this.now(), resolve, reject });
      this.addLog('command', describe(cmd), cmd.id);
      this.transmit(cmd);
    });
  }

  /** An instructor note in the event log (a debrief marker; not sent to the host). */
  note(text: string): void {
    this.addLog('note', text);
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => {
      this.fns.delete(fn);
    };
  }

  close(): void {
    this.closed = true;
    for (const off of this.offs) off();
    for (const p of this.pending.values()) p.reject(new Error('session closed'));
    this.pending.clear();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private transmit(cmd: WireCommand): void {
    if (this.o.transport.status === 'open') this.o.transport.send(this.stamp({ kind: 'command', body: cmd }));
  }

  private resendPending(): void {
    for (const p of this.pending.values()) this.transmit(p.cmd);
  }

  private onStatus(s: TransportStatus): void {
    if (s === 'open') {
      this.o.transport.send(this.stamp({ kind: 'hello', role: 'controller' }));
      this.resendPending();
    } else this.hostOnline = false;
    this.addLog('status', `link ${s}`);
  }

  private onMessage(m: WireMessage): void {
    if (this.seqs.check(m) === 'duplicate') return;
    switch (m.kind) {
      case 'hello':
        if (m.role === 'host') {
          this.hostOnline = true;
          this.resendPending();
          this.changed();
        }
        return;
      case 'ack': {
        const p = this.pending.get(m.commandId);
        if (!p) return;
        this.pending.delete(m.commandId);
        const r: AckResult = { commandId: m.commandId, accepted: m.accepted, tick: m.tick, rttMs: this.now() - p.sentAt, ...(m.reason !== undefined ? { reason: m.reason } : {}) };
        this.addLog('ack', m.accepted ? `ok (${Math.round(r.rttMs)} ms)` : `rejected: ${m.reason ?? ''}`, m.commandId);
        p.resolve(r);
        return;
      }
      case 'event':
        for (const e of m.body) this.onEvent(e);
        this.changed();
        return;
      case 'snapshot':
        this.hostEngineVersion = m.body.engineVersion;
        this.hostOnline = true;
        this.changed();
        return;
      case 'command':
        return;
    }
  }

  private onEvent(e: WireEvent): void {
    if ('t' in e && typeof e.t === 'number') this.simT = Math.max(this.simT ?? 0, e.t);
    if (e.type === 'state') this.state = e;
    else if (e.type === 'measurement') Object.assign(this.measurements, e.values);
    else if (e.type === 'alarm') this.addLog('alarm', `${e.priority} ${e.state}: ${e.text}`);
    else if (e.type === 'marker') this.addLog('marker', e.kind);
    else if (e.type === 'commandApplied') {
      const res = e.resolved as AppliedResolution | undefined;
      const c = res?.command;
      if (c?.type === 'scenario' && c.action === 'bookmark' && c.target && !this.bookmarks.includes(c.target)) this.bookmarks = [...this.bookmarks, c.target];
      const mine = e.commandId.startsWith(`${this.peerId}-`); // our own commands are already logged with their ack
      if (c && !res?.replay && !mine) this.addLog('applied', describe(c), e.commandId);
    }
  }

  private addLog(kind: LogEntry['kind'], text: string, commandId?: string): void {
    this.log.push({ at: this.now(), simT: this.simT, kind, text, ...(commandId ? { commandId } : {}) });
    const max = this.o.logMax ?? 500;
    if (this.log.length > max) this.log.splice(0, this.log.length - max);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** One-line human description of a command, for logs. */
export function describe(c: WireCommand): string {
  switch (c.type) {
    case 'setTarget':
      return `${c.variable} → ${c.value}${c.ramp ? ` over ${c.ramp.durationS} s (${c.ramp.curve ?? 'linear'})` : ''}`;
    case 'setRhythm':
      return `rhythm ${c.rhythm}${c.when === 'nextBeat' ? ' (next beat)' : ''}`;
    case 'setModifiers':
      return `modifiers ${JSON.stringify(c.modifiers)}`;
    case 'device':
      return `${c.action.device} ${c.action.action} ${String(c.action.value ?? '')}${c.action.lane !== undefined ? ` lane ${c.action.lane}` : ''}`;
    case 'time':
      return `time ${c.action}${c.value !== undefined ? ` ${c.value}` : ''}`;
    case 'scenario':
      return `scenario ${c.action}${c.target ? ` ${c.target}` : ''}`;
    case 'pin':
      return `pin ${c.variable}${c.value !== undefined ? ` at ${c.value}` : ''}`;
    case 'release':
      return `release ${c.variable}`;
    case 'setFactor':
      return `${c.input} × ${c.factor}`;
    case 'setMode':
      return `mode ${c.mode}`;
  }
}
```

- [x] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/controller-session.test.ts`
Expected: `6 passed`, and no "Unhandled Errors" block (a send that `close()` rejects must be caught by its caller — the test does).

- [x] **Step 5: Commit**

```bash
git add packages/controller/src/session/controller-session.ts packages/controller/test/session/controller-session.test.ts
git commit -m "feat(controller): ControllerSession — id'd commands resent until acked, live state/measurements, bookmarks and event log" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: ViewerSync — a second monitor from snapshot + mirrored commands

**Files:**
- Create: `packages/controller/src/session/viewer-sync.ts`, `packages/controller/test/fakes/manual-viewer.ts`, `packages/controller/test/session/viewer-sync.test.ts`

**Interfaces:**
- Consumes: protocol (2), `HostSession` (12), `ControllerSession` (13), `manualHost` (12), transports (4, 6).
- Produces:
  - `interface ViewerTarget { restore(s); dispatch(cmd: Command): DispatchResult; on(fn, types?): () => void; renderT(): SimSeconds; tick(): number; setRate(k); setPaused(p); jumpTo(simT) }`.
  - `type ViewerStatus = 'waiting'|'synced'|'incompatible'`; `interface ViewerSyncOptions { session; transport; target; engineVersion; delayS? (0.1); peerId?; wallNow? }`.
  - `class ViewerSync { peerId; status; resyncs; beatDriftMs; lagS; follow(): void /* call every frame before drawing */; close() }`.
  - Behaviour: says `hello(viewer)` on every transport `open`, on every host `hello`, after a late command (its `atTick` ≤ local tick) and after a beat mismatch (|host t − local t| > 1 ms for the same `seq`); on the snapshot it asked for: apply buffered replays (lane chrome), `restore`, apply commands buffered while waiting whose tick is after the snapshot; mirrors `commandApplied` engine commands with `atTick` (de-duplicated by `commandId`); `time` commands set host pause/rate; `state` events anchor the host clock (blended ±50 ms, reset beyond); `follow()` steers the local clock to `hostNow − delayS` (rate ±10 %, jump when > 1 s behind, pause when > 50 ms ahead, stop 3 s after the last anchor).
  - Test fake `manualViewer(opts?): ManualViewer` (`ViewerTarget` over `createEngine` with `advance(wallMs)`, `paused`, `rate`, `t`).

- [ ] **Step 1: Write the fake and the failing test**

`packages/controller/test/fakes/manual-viewer.ts`:
```ts
// ViewerTarget over a bare engine with a manual render clock (no renderer), for Node tests.
import { createEngine, type EngineOptions, type MonitorEngine } from '@pme/engine-core';
import type { ViewerTarget } from '../../src/session/viewer-sync.ts';

export interface ManualViewer extends ViewerTarget {
  engine: MonitorEngine;
  /** Advance the render clock by wall ms × rate (unless paused) and run the engine to it. */
  advance(wallMs: number): void;
  paused: boolean;
  rate: number;
  t: number;
}

export function manualViewer(opts: EngineOptions = { seed: 99 }): ManualViewer {
  const engine = createEngine(opts);
  const v: ManualViewer = {
    engine,
    paused: true,
    rate: 1,
    t: 0,
    restore(s) {
      engine.restore(s);
      v.t = s.tick * 0.02;
    },
    dispatch: (c) => engine.dispatch(c),
    on: (fn, types) => engine.on(fn, types),
    renderT: () => v.t,
    tick: () => engine.now().tick,
    setRate: (k) => (v.rate = k),
    setPaused: (p) => (v.paused = p),
    jumpTo(simT) {
      v.t = simT;
      engine.advanceTo(simT);
    },
    advance(wallMs) {
      if (v.paused) return;
      v.t += (wallMs / 1000) * v.rate;
      engine.advanceTo(v.t);
    },
  };
  return v;
}
```

`packages/controller/test/session/viewer-sync.test.ts`:
```ts
// ViewerSync with engines on a manual clock: exact mirroring, late-command resync, version mismatch, pause.
import { describe, expect, it } from 'vitest';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createStamper } from '../../src/protocol.ts';
import { manualHost, type ManualHost } from '../fakes/manual-host.ts';
import { manualViewer, type ManualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

/** Host + in-process hub + controller + viewer, stepping wall time in 20 ms frames. */
async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'VWS234', target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'VWS234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const vt = hub.connect();
  const sync = new ViewerSync({ session: 'VWS234', transport: vt, target: v, engineVersion: host.engine.version, wallNow });
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      host.advance(20);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
    }
  };
  return { clock, host, hs, ctl, v, vt, sync, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

function maxDiff(a: ManualHost['engine'], b: ManualViewer['engine'], seconds: number): number {
  const end = Math.min(a.latestSampleIndex('ecgII'), b.latestSampleIndex('ecgII')) - 60;
  const n = seconds * 500;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  a.readSamples('ecgII', end - n, x);
  b.readSamples('ecgII', end - n, y);
  let m = 0;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs((x[i] as number) - (y[i] as number)));
  return m;
}

describe('ViewerSync', () => {
  it('restores the snapshot, follows the host clock ~delayS behind, and mirrors commands exactly', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(3);
    await r.ctl.send({ type: 'setRhythm', rhythm: 'avb2Mobitz1' });
    await r.ctl.send({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgIII', lane: 0 } });
    await r.run(8);
    expect(r.sync.status).toBe('synced');
    expect(r.sync.resyncs).toBe(0);
    expect(r.sync.lagS).toBeGreaterThan(0.05);
    expect(r.sync.lagS).toBeLessThan(0.2);
    const a = new Float32Array(2500);
    const b = new Float32Array(2500);
    const end = r.v.engine.latestSampleIndex('ecgIII') - 60;
    r.host.engine.readSamples('ecgIII', end - 2500, a);
    r.v.engine.readSamples('ecgIII', end - 2500, b);
    expect([...a]).toEqual([...b]);
    r.close();
  });

  it('resyncs (hello → new snapshot) when a mirrored command arrives after its tick', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(2);
    // Deliver a commandApplied for a tick the viewer has already passed (from a second sender id, so the
    // host's own sequence numbers are not disturbed).
    const stamp = createStamper('VWS234', 'late-sender');
    const past = r.v.engine.now().tick - 5;
    const late = stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'late-1', tick: past, resolved: { command: { id: 'late-1', issuedBy: 'x', type: 'setRhythm', rhythm: 'vtMono', atTick: past } } }] });
    (r.vt as unknown as { receive(m: unknown): void }).receive(late);
    expect(r.sync.status).toBe('waiting');
    await r.run(1);
    expect(r.sync.status).toBe('synced');
    expect(r.sync.resyncs).toBe(1);
    await r.run(3);
    expect(maxDiff(r.host.engine, r.v.engine, 2)).toBe(0);
    r.close();
  });

  it('pauses with the host and resumes with it', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.run(2);
    await r.ctl.send({ type: 'time', action: 'pause' });
    await r.run(1);
    const t = r.v.t;
    await r.run(1);
    expect(r.v.t).toBe(t);
    await r.ctl.send({ type: 'time', action: 'resume' });
    await r.run(2);
    expect(r.v.t).toBeGreaterThan(t + 1);
    r.close();
  });

  it('refuses to mirror a snapshot from a different engine build', async () => {
    const host = manualHost();
    const hs = new HostSession({ session: 'VWX234', target: host, stateIntervalMs: 0 });
    hs.addTransport(createBroadcastChannelTransport('VWX234'));
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VWX234', transport: createBroadcastChannelTransport('VWX234'), target: v, engineVersion: '9.9.9' });
    await waitFor(() => sync.status === 'incompatible');
    expect(v.paused).toBe(true);
    hs.close();
    sync.close();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/viewer-sync.test.ts`
Expected: FAIL — cannot load `../../src/session/viewer-sync.ts`.

- [ ] **Step 3: Implement**

`packages/controller/src/session/viewer-sync.ts`:
```ts
// Viewer role (brief §3.7): a second monitor that runs its OWN engine and never receives samples. It restores
// the host's snapshot, then mirrors every applied engine command at the host's tick (commandApplied with
// resolved.command.atTick), while its clock follows the host's 1 Hz `state` anchors a fixed delay behind.
// On the same build this is sample-identical (the engine is deterministic, brief §3.3). If a mirrored command
// arrives too late, a beat's time disagrees with the host's, the link reconnects or the host says hello again,
// it resyncs by saying hello (→ fresh snapshot).
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
  type ManagedTransport,
  type WireBody,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';

/** What the viewer needs from its local monitor. */
export interface ViewerTarget {
  /** engine.restore(s) and move the render clock to s.tick. */
  restore(s: PatientSnapshot): void;
  /** Mirror a host command (also updates lane chrome for lead/filter commands). */
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  /** The sim time currently drawn. */
  renderT(): SimSeconds;
  /** Engine tick (commands must arrive before the viewer reaches their tick). */
  tick(): number;
  setRate(k: number): void;
  setPaused(p: boolean): void;
  /** Move the clock forward to simT (engine catches up without drawing the gap). */
  jumpTo(simT: SimSeconds): void;
}

export type ViewerStatus = 'waiting' | 'synced' | 'incompatible';

export interface ViewerSyncOptions {
  session: string;
  transport: ManagedTransport;
  target: ViewerTarget;
  /** Engine build of this viewer; a snapshot from a different build cannot be mirrored. */
  engineVersion: string;
  /** How far behind the host the viewer draws (default 0.1 s) — the jitter budget for mirrored commands [ENG]. */
  delayS?: number;
  peerId?: string;
  wallNow?: () => number;
}

const BEAT_TOLERANCE_S = 0.001; // same build ⇒ identical times; anything above this is divergence [ENG]
const MAX_EXTRAPOLATE_S = 3; // stop running ahead of a silent host after this long [ENG]
const TICK_S = 0.02;

export class ViewerSync {
  readonly peerId: string;
  status: ViewerStatus = 'waiting';
  resyncs = 0;
  /** Last measured |viewer beat − host beat| for the same seq, ms (0 when mirrored exactly). */
  beatDriftMs = 0;
  /** Wall-clock lag behind the host's anchored now, s (≈ delayS when locked). */
  lagS = 0;
  private readonly o: ViewerSyncOptions;
  private readonly delayS: number;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly seqs = new SeqFilter();
  private readonly offs: Array<() => void>;
  private awaiting = false;
  private replays: Command[] = [];
  private early: Command[] = [];
  private anchor: { simT: number; wallMs: number } | null = null;
  private hostPaused = false;
  private hostRate = 1;
  private readonly mirrored = new Set<string>(); // commandIds already applied (an engine that emits its own
  // commandApplied from Stage 5 on must not make the viewer apply a command twice)
  private readonly hostBeats = new Map<number, number>();
  private readonly localBeats = new Map<number, number>();

  constructor(o: ViewerSyncOptions) {
    this.o = o;
    this.delayS = o.delayS ?? 0.1;
    this.peerId = o.peerId ?? newPeerId('view');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    o.target.setPaused(true);
    this.offs = [
      o.transport.onStatus((s) => {
        if (s === 'open') this.requestSync();
      }),
      o.transport.onMessage((m) => this.onMessage(m)),
      o.target.on((e) => {
        if (e.type === 'beat') {
          this.localBeats.set(e.seq, e.t);
          this.compareBeat(e.seq);
        }
      }, ['beat']),
    ];
  }

  /** Call once per animation frame, before the monitor draws: steers the local clock onto the host's. */
  follow(): void {
    const t = this.o.target;
    if (this.status !== 'synced' || !this.anchor) return t.setPaused(true);
    if (this.hostPaused) return t.setPaused(true);
    const since = (this.now() - this.anchor.wallMs) / 1000;
    const hostNow = this.anchor.simT + Math.min(since, MAX_EXTRAPOLATE_S) * this.hostRate;
    const want = hostNow - this.delayS;
    const err = want - t.renderT();
    this.lagS = hostNow - t.renderT();
    if (err > 1) {
      t.jumpTo(want);
      t.setPaused(false);
      return;
    }
    if (err < -0.05) return t.setPaused(true); // ahead of the host: wait for it
    t.setPaused(false);
    t.setRate(Math.min(4, Math.max(0.25, this.hostRate * (1 + Math.max(-0.1, Math.min(0.1, 0.5 * err))))));
  }

  close(): void {
    for (const off of this.offs) off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private requestSync(): void {
    if (this.status === 'synced') this.resyncs++;
    this.awaiting = true;
    this.replays = [];
    this.early = [];
    if (this.status !== 'incompatible') this.status = 'waiting';
    this.o.target.setPaused(true);
    this.o.transport.send(this.stamp({ kind: 'hello', role: 'viewer' }));
  }

  private onMessage(m: WireMessage): void {
    // Gaps are normal here (the relay routes acks and snapshots only to the peers that need them), so only
    // duplicates are dropped; a lost connection shows up as a transport 'open' → requestSync().
    if (this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role === 'host') return this.requestSync(); // host (re)started or restored a bookmark
    if (m.kind === 'snapshot') return this.onSnapshot(m.body);
    if (m.kind === 'event') for (const e of m.body) this.onEvent(e);
  }

  private onSnapshot(s: PatientSnapshot): void {
    if (!this.awaiting) return; // someone else's late-join snapshot
    this.awaiting = false;
    if (s.engineVersion !== this.o.engineVersion) {
      this.status = 'incompatible';
      return;
    }
    for (const c of this.replays) this.o.target.dispatch(c); // lane chrome only: restore() replaces engine state
    this.o.target.restore(s);
    for (const c of this.early) if ((c.atTick ?? 0) > s.tick) this.o.target.dispatch(c);
    this.replays = [];
    this.early = [];
    this.hostBeats.clear();
    this.localBeats.clear();
    this.anchor ??= { simT: s.tick * TICK_S, wallMs: this.now() };
    this.status = 'synced';
  }

  private onEvent(e: WireEvent): void {
    if (e.type === 'state') {
      this.setAnchor(e.t);
      return;
    }
    if (e.type === 'beat') {
      this.hostBeats.set(e.seq, e.t);
      this.compareBeat(e.seq);
      return;
    }
    if (e.type !== 'commandApplied') return;
    const res = e.resolved as AppliedResolution | undefined;
    const c = res?.command;
    if (!c) return;
    if (c.type === 'time') {
      if (c.action === 'pause') this.hostPaused = true;
      if (c.action === 'resume') this.hostPaused = false;
      if (c.action === 'scale' && typeof c.value === 'number') this.hostRate = c.value;
      return;
    }
    if (c.type === 'scenario' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor' || c.type === 'setMode') return;
    if (res?.replay) {
      if (this.awaiting) this.replays.push(c);
      return;
    }
    if (this.awaiting) {
      this.early.push(c);
      return;
    }
    if (this.status !== 'synced' || this.mirrored.has(e.commandId)) return;
    if ((c.atTick ?? 0) <= this.o.target.tick()) return this.requestSync(); // too late to mirror exactly
    this.mirrored.add(e.commandId);
    if (this.mirrored.size > 256) this.mirrored.delete(this.mirrored.values().next().value as string);
    this.o.target.dispatch(c);
  }

  /** Blend a new host anchor: small disagreements are smoothed, big ones reset [ENG]. */
  private setAnchor(simT: SimSeconds): void {
    const wallMs = this.now();
    if (!this.anchor || this.hostPaused) {
      this.anchor = { simT, wallMs };
      return;
    }
    const predicted = this.anchor.simT + ((wallMs - this.anchor.wallMs) / 1000) * this.hostRate;
    const d = simT - predicted;
    this.anchor = { simT: Math.abs(d) < 0.05 ? predicted + 0.25 * d : simT, wallMs };
  }

  private compareBeat(seq: number): void {
    const h = this.hostBeats.get(seq);
    const l = this.localBeats.get(seq);
    if (h === undefined || l === undefined) return;
    this.beatDriftMs = Math.abs(h - l) * 1000;
    this.hostBeats.delete(seq);
    this.localBeats.delete(seq);
    if (this.status === 'synced' && this.beatDriftMs > BEAT_TOLERANCE_S * 1000) this.requestSync();
    for (const map of [this.hostBeats, this.localBeats]) if (map.size > 64) map.delete(map.keys().next().value as number);
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/viewer-sync.test.ts && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: `4 passed` (≈ 1.6 s); typecheck exits 0. The first test asserts the viewer's ecgIII equals the host's **exactly** over 5 s after a rhythm change and a lead change — if it fails by a small amount, a command was applied on a different tick than the host's (check `atTick` handling), not a tolerance problem.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/session/viewer-sync.ts packages/controller/test/fakes/manual-viewer.ts packages/controller/test/session/viewer-sync.test.ts
git commit -m "feat(controller): ViewerSync — snapshot restore, exact command mirroring at host ticks, clock follow, beat-checked resync" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Cross-transport session tests (late join, stage then commit, relay drop)

**Files:**
- Create: `packages/controller/test/session/sessions.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 4–14.
- Produces: the executable evidence for BUILD-PLAN Stage 6 acceptance 2 (late join: a viewer joining mid-ramp mirrors the host sample-for-sample; beat timing identical) and 3 (a controller drop through the relay never applies a command twice; the controller logs `link connecting`), plus stage-then-commit landing on one tick.

- [ ] **Step 1: Write the tests**

`packages/controller/test/session/sessions.test.ts`:
```ts
// Host + controller + viewer over real transports, with engines on a manual clock (BUILD-PLAN Stage 6
// acceptance 2 late join, 3 no duplicate after a drop; brief §3.7 viewer synthesis).
import { describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { startRelay } from '../../relay/server.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { collect, sleep, waitFor } from '../helpers.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

/** Run host (and optional viewer) for `seconds` of wall time in 20 ms steps, letting messages flow. */
async function run(seconds: number, clock: { wall: number }, host: ReturnType<typeof manualHost>, viewer?: { v: ReturnType<typeof manualViewer>; sync: ViewerSync }) {
  for (let i = 0; i < seconds * 50; i++) {
    clock.wall += 20;
    host.advance(20);
    await flushIo();
    if (viewer) {
      viewer.sync.follow();
      viewer.v.advance(20);
    }
  }
}

function samplesEqual(a: ReturnType<typeof manualHost>['engine'], b: ReturnType<typeof manualViewer>['engine'], seconds: number): number {
  const end = Math.min(a.latestSampleIndex('ecgII'), b.latestSampleIndex('ecgII')) - 60; // leave the look-ahead out
  const n = seconds * 500;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  a.readSamples('ecgII', end - n, x);
  b.readSamples('ecgII', end - n, y);
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs((x[i] as number) - (y[i] as number)));
  return max;
}

describe('sessions over BroadcastChannel', () => {
  it('controller commands are acked; a late-joining viewer mirrors the host sample-for-sample', async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = manualHost();
    const hs = new HostSession({ session: 'VWR234', target: host, wallNow, stateIntervalMs: 0 });
    hs.addTransport(createBroadcastChannelTransport('VWR234'));
    const ctl = new ControllerSession({ session: 'VWR234', transport: createBroadcastChannelTransport('VWR234'), wallNow });
    await waitFor(() => ctl.hostOnline);
    const stateTimer = setInterval(() => hs.emitState(), 20); // 1 Hz of sim time at 50 steps/s ≈ every step here

    await run(5, clock, host);
    const ack = await ctl.send({ type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 5, curve: 'sigmoid' } });
    expect(ack.accepted).toBe(true);
    await run(5, clock, host);

    // viewer joins late, mid-ramp
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VWR234', transport: createBroadcastChannelTransport('VWR234'), target: v, engineVersion: host.engine.version, wallNow });
    await waitFor(() => sync.status === 'synced');
    await run(3, clock, host, { v, sync });
    await ctl.send({ type: 'setRhythm', rhythm: 'afib', when: 'now' });
    await run(6, clock, host, { v, sync });
    await ctl.send({ type: 'setModifiers', modifiers: { pvc: { pattern: 'single', probability: 0.3 } } });
    await ctl.send({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } });
    await run(8, clock, host, { v, sync });
    clearInterval(stateTimer);

    expect(sync.status).toBe('synced');
    expect(sync.resyncs).toBe(0);
    expect(sync.beatDriftMs).toBe(0);
    expect(samplesEqual(host.engine, v.engine, 10)).toBe(0);
    expect(sync.lagS).toBeGreaterThan(0.05);
    expect(sync.lagS).toBeLessThan(0.2);
    expect(ctl.log.some((l) => l.kind === 'ack')).toBe(true);
    hs.close();
    ctl.close();
    sync.close();
  });
});

describe('stage then commit', () => {
  it('commands sharing a stageGroup land on one tick', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'STG234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'STG234', transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const a = ctl.send({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g1' });
    host.advance(40); // two ticks pass between the two arrivals
    const b = ctl.send({ type: 'setModifiers', modifiers: { rsa: 0 }, stageGroup: 'g1' });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect(ra.tick).toBe(rb.tick);
    hs.close();
    ctl.close();
  });
});

describe('robustness over the relay', () => {
  it('a controller drop never applies a command twice, and pending commands go through after reconnect', async () => {
    const relay = await startRelay({ port: 0, host: '127.0.0.1' });
    const url = `ws://127.0.0.1:${relay.port}/`;
    const host = manualHost();
    const hs = new HostSession({ session: 'DRP234', target: host, stateIntervalMs: 0 });
    hs.addTransport(createWebSocketTransport({ url }));
    const ct = createWebSocketTransport({ url, backoff: { baseMs: 20, maxMs: 100, jitter: 0 } });
    const ctl = new ControllerSession({ session: 'DRP234', transport: ct });
    await waitFor(() => ctl.hostOnline, 3000);
    const p = ctl.send({ type: 'setTarget', variable: 'hr', value: 100 });
    ct.dropForTest(); // the ack (or the command itself) is lost with the socket
    await waitFor(() => ct.reconnects >= 1, 3000, 'reconnect');
    const r = await p;
    expect(r.accepted).toBe(true);
    await sleep(50);
    expect(hs.stats.applied).toBe(1);
    expect(ctl.pendingCount).toBe(0);
    const statuses = ctl.log.filter((l) => l.kind === 'status').map((l) => l.text);
    expect(statuses).toContain('link connecting');
    hs.close();
    ctl.close();
    await relay.close();
  });

  it('a re-sent command (same id) is answered from the host cache, not re-applied', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'ACK234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const t = hub.connect();
    const acks = collect(t);
    const stamp = createStamper('ACK234', 'ctl-raw');
    const body = { id: 'fixed-1', issuedBy: 'test', type: 'setTarget' as const, variable: 'hr' as const, value: 95 };
    t.send(stamp({ kind: 'command', body }));
    t.send(stamp({ kind: 'command', body })); // what a resend after a reconnect looks like
    await waitFor(() => acks.filter((m) => m.kind === 'ack').length === 2);
    const [a1, a2] = acks.filter((m) => m.kind === 'ack') as Array<Extract<WireMessage, { kind: 'ack' }>>;
    expect(a1!.accepted && a2!.accepted).toBe(true);
    expect(a2!.tick).toBe(a1!.tick);
    expect(hs.stats.applied).toBe(1);
    expect(hs.stats.duplicates).toBe(1);
    hs.close();
  });
});
```

- [ ] **Step 2: Run them**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/sessions.test.ts`
Expected: `4 passed` (≈ 2 s). These are integration tests over code that already exists; they are expected to pass on the first run. If one fails, fix the session code, not the test, and say so in the commit message.

- [ ] **Step 3: Run the whole controller suite**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller test && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: every file passes, no unhandled errors.

- [ ] **Step 4: Commit**

```bash
git add packages/controller/test/session/sessions.test.ts
git commit -m "test(controller): late-join viewer is sample-identical over BroadcastChannel; relay drop applies once; stage groups share a tick" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Control command builders, CAE flags and stage-then-commit

**Files:**
- Create: `packages/controller/src/panel/controls.ts`, `packages/controller/src/panel/staging.ts`, `packages/controller/test/panel/controls.test.ts`

**Interfaces:**
- Consumes: vocabulary types (11), protocol `CommandInput`, `ControlFlag`, `StateEvent`, `AckResult` (2).
- Produces: `clamp(v, min, max)`; `rampFrom(durationS, curve, maxDurationS = 900): Ramp | undefined` (0 → no ramp); `targetCommand(spec, value, ramp?)`; `pinCommand(spec, value?, ramp?)`; `releaseCommand(spec, ramp?)`; `rhythmCommand(rhythm, when = 'now')`; `modifierPatch(path, value)` (dotted path → nested object); `modifierCommand(spec, value | object | null)`; `deviceCommand(spec, value, lane?)`; `interface FlagView { flag; text; className; title }`; `flagView(flag)` (`ramping` → blue ▲, `override` → yellow !, `pinned` → P, `modeled` → M); `readout(spec, state, displayed): string` ("target / truth / displayed unit"); `class StageBuffer { constructor(prefix); size; staged; stage(c, key) /* same key replaces */; discard(); commit(send): Promise<AckResult[]> /* one stageGroup '<prefix>-sg<n>' */ }`.

- [ ] **Step 1: Write the failing test**

`packages/controller/test/panel/controls.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import { deviceCommand, flagView, modifierCommand, modifierPatch, pinCommand, rampFrom, readout, rhythmCommand, targetCommand } from '../../src/panel/controls.ts';
import { StageBuffer } from '../../src/panel/staging.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import type { AckResult, CommandInput } from '../../src/protocol.ts';

const vocab = stage1Vocabulary();
const hr = vocab.variables[0]!;

describe('control command builders', () => {
  it('builds targets with clamped values and optional ramps', () => {
    expect(targetCommand(hr, 400, rampFrom(30, 'sigmoid'))).toEqual({ type: 'setTarget', variable: 'hr', value: 300, ramp: { durationS: 30, curve: 'sigmoid' } });
    expect(targetCommand(hr, 80, rampFrom(0, 'linear'))).toEqual({ type: 'setTarget', variable: 'hr', value: 80 });
    expect(rampFrom(5000, 'exp')).toEqual({ durationS: 900, curve: 'exp' });
    expect(rampFrom(Number.NaN, 'exp')).toBeUndefined();
  });

  it('builds modifier patches from dotted paths, and object modifiers as on/off', () => {
    expect(modifierPatch('artefact.noise', 0.5)).toEqual({ artefact: { noise: 0.5 } });
    const pvc = vocab.modifiers.find((m) => m.path === 'pvc')!;
    expect(modifierCommand(pvc, { pattern: 'bigeminy', probability: 0.2 })).toEqual({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0.2 } } });
    expect(modifierCommand(pvc, null)).toEqual({ type: 'setModifiers', modifiers: { pvc: null } });
  });

  it('every generated Stage 1 command is accepted by a real engine', () => {
    const e = createEngine();
    let n = 0;
    const ok = (c: CommandInput) => e.dispatch({ ...c, id: `x${n++}`, issuedBy: 't' } as Command).accepted;
    expect(ok(targetCommand(hr, 90, rampFrom(10, 'exp')))).toBe(true);
    expect(ok(rhythmCommand('afib', 'nextBeat'))).toBe(true);
    for (const m of vocab.modifiers) expect(ok(m.kind === 'number' ? modifierCommand(m, m.normal) : modifierCommand(m, { pattern: 'single', probability: 0.1 }))).toBe(true);
    const lead = vocab.devices.find((d) => d.action === 'lead')!;
    expect(ok(deviceCommand(lead, 'V2', 1))).toBe(true);
    expect(pinCommand(hr, 60)).toEqual({ type: 'pin', variable: 'hr', value: 60 });
  });

  it('maps control flags to CAE-style badges and formats target/truth/displayed', () => {
    expect(flagView('ramping').className).toContain('pme-flag-blue');
    expect(flagView('override').className).toContain('pme-flag-yellow');
    expect(flagView(undefined).text).toBe('');
    const state = { type: 'state' as const, t: 1, tick: 50, mode: 'manual' as const, values: { hr: 110 }, control: { hr: 'ramping' as const } };
    expect(readout(hr, state, 97.4)).toBe('110 / 110 / 97.4 bpm');
    expect(readout(hr, null, undefined)).toBe('— / — / — bpm');
  });
});

describe('StageBuffer', () => {
  it('replaces a restaged control and commits everything with one stageGroup', async () => {
    const b = new StageBuffer('p1');
    b.stage(targetCommand(hr, 90), 'target.hr');
    b.stage(rhythmCommand('sinus'), 'rhythm');
    b.stage(targetCommand(hr, 100), 'target.hr');
    expect(b.size).toBe(2);
    const sent: CommandInput[] = [];
    const acks = await b.commit(async (c) => (sent.push(c), { accepted: true, tick: 1, commandId: 'x', rttMs: 1 } as AckResult));
    expect(acks).toHaveLength(2);
    expect(sent.map((c) => c.stageGroup)).toEqual(['p1-sg1', 'p1-sg1']);
    expect((sent[0] as { value: number }).value).toBe(100);
    expect(b.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/controls.test.ts`
Expected: FAIL — cannot load `../../src/panel/controls.ts`.

- [ ] **Step 3: Implement**

`packages/controller/src/panel/controls.ts`:
```ts
// Pure command builders for the generated controls (no DOM). Every control in the panel and the remote goes
// through these, so the DOM layer only reads values out of inputs.
import type { Modifiers, Ramp, RhythmId } from '@pme/engine-core';
import type { CommandInput, ControlFlag, StateEvent } from '../protocol.ts';
import type { DeviceSpec, ModifierSpec, VarSpec } from '../vocabulary.ts';

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** A ramp from panel inputs; duration 0 → no ramp (step change). Duration is clamped to the vocabulary max. */
export function rampFrom(durationS: number, curve: Ramp['curve'], maxDurationS = 900): Ramp | undefined {
  const d = clamp(Number.isFinite(durationS) ? durationS : 0, 0, maxDurationS);
  return d > 0 ? { durationS: d, curve: curve ?? 'linear' } : undefined;
}

export function targetCommand(spec: VarSpec, value: number, ramp?: Ramp): CommandInput {
  const v = clamp(value, spec.min, spec.max);
  return { type: 'setTarget', variable: spec.id, value: v, ...(ramp && spec.rampable ? { ramp } : {}) };
}

export function pinCommand(spec: VarSpec, value: number | undefined, ramp?: Ramp): CommandInput {
  return { type: 'pin', variable: spec.id, ...(value !== undefined ? { value: clamp(value, spec.min, spec.max) } : {}), ...(ramp ? { ramp } : {}) };
}

export function releaseCommand(spec: VarSpec, ramp?: Ramp): CommandInput {
  return { type: 'release', variable: spec.id, ...(ramp ? { ramp } : {}) };
}

export function rhythmCommand(rhythm: RhythmId, when: 'now' | 'nextBeat' = 'now'): CommandInput {
  return { type: 'setRhythm', rhythm, when };
}

/** Builds the nested Partial<Modifiers> for a dotted path, e.g. 'artefact.noise' → { artefact: { noise: v } }. */
export function modifierPatch(path: string, value: unknown): Partial<Modifiers> {
  const keys = path.split('.');
  let o: unknown = value;
  for (let i = keys.length - 1; i >= 0; i--) o = { [keys[i] as string]: o };
  return o as Partial<Modifiers>;
}

/** kind 'number' → the number; kind 'object' → an object of field values when on, null when off. */
export function modifierCommand(spec: ModifierSpec, value: number | Record<string, string | number> | null): CommandInput {
  if (spec.kind === 'number') return { type: 'setModifiers', modifiers: modifierPatch(spec.path, clamp(value as number, spec.min, spec.max)) };
  return { type: 'setModifiers', modifiers: modifierPatch(spec.path, value) };
}

export function deviceCommand(spec: DeviceSpec, value: string, lane?: number): CommandInput {
  return { type: 'device', action: { device: spec.device, action: spec.action, value, ...(lane !== undefined ? { lane } : {}) } };
}

/** CAE-style flag shown next to a variable (brief §4.9, research 01 §4 items 1 and 3). */
export interface FlagView {
  flag: ControlFlag | null;
  text: string;
  className: string;
  title: string;
}

export function flagView(flag: ControlFlag | undefined): FlagView {
  switch (flag) {
    case 'ramping':
      return { flag, text: '▲', className: 'pme-flag pme-flag-blue', title: 'Trending toward its target' };
    case 'override':
      return { flag, text: '!', className: 'pme-flag pme-flag-yellow', title: 'Physiology overrides the target' };
    case 'pinned':
      return { flag, text: 'P', className: 'pme-flag pme-flag-pin', title: 'Pinned by the instructor' };
    case 'modeled':
      return { flag, text: 'M', className: 'pme-flag pme-flag-model', title: 'Driven by the model' };
    default:
      return { flag: null, text: '', className: 'pme-flag', title: '' };
  }
}

/** "target / truth / displayed" for one variable (truth is target-derived until the engine reports it, E1). */
export function readout(spec: VarSpec, state: StateEvent | null, displayed: number | null | undefined): string {
  const t = state?.values[spec.id];
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(Math.round(v * 10) / 10));
  return `${fmt(t)} / ${fmt(t)} / ${fmt(displayed)} ${spec.unit}`;
}
```

`packages/controller/src/panel/staging.ts`:
```ts
// Stage-then-commit (REALITi, research 01 §4 item 6; brief §4.9): staged commands are sent together with one
// stageGroup, and the host applies them on one tick.
import type { AckResult, CommandInput } from '../protocol.ts';

export class StageBuffer {
  private items: CommandInput[] = [];
  private keys: string[] = [];
  private n = 0;
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  get size(): number {
    return this.items.length;
  }
  get staged(): readonly CommandInput[] {
    return this.items;
  }

  /** Stage a command; a later command for the same control replaces the earlier one. */
  stage(c: CommandInput, key: string): void {
    const i = this.keys.indexOf(key);
    if (i >= 0) {
      this.items[i] = c;
      return;
    }
    this.items.push(c);
    this.keys.push(key);
  }

  discard(): void {
    this.items = [];
    this.keys = [];
  }

  /** Send every staged command with one new stageGroup, in staging order. */
  commit(send: (c: CommandInput) => Promise<AckResult>): Promise<AckResult[]> {
    const group = `${this.prefix}-sg${++this.n}`;
    const batch = this.items.map((c) => ({ ...c, stageGroup: group }) as CommandInput);
    this.discard();
    return Promise.all(batch.map(send));
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/controls.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/panel/controls.ts packages/controller/src/panel/staging.ts packages/controller/test/panel/controls.test.ts
git commit -m "feat(controller): vocabulary-driven command builders, CAE-style flags and stage-then-commit buffer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Reveal gestures for the hidden panel

**Files:**
- Create: `packages/controller/src/panel/reveal.ts`, `packages/controller/test/panel/reveal.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface RevealOptions { cornerPx: 64; taps: 5; windowMs: 3000; longPressMs: 800 }` (defaults in `DEFAULT_REVEAL`); `interface KeyLike { key; ctrlKey; shiftKey; altKey; metaKey; targetTag }`; `class RevealGesture { constructor(onToggle, o?); key(e): boolean; down(x, y, touches, t); up() }`; `attachReveal(win, g): () => void` (keydown, touchstart, mousedown, touchend, touchcancel).

- [ ] **Step 1: Write the failing test**

`packages/controller/test/panel/reveal.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RevealGesture } from '../../src/panel/reveal.ts';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }> = {}, targetTag = 'BODY') => ({
  key: k, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, targetTag, ...mods,
});

describe('RevealGesture', () => {
  afterEach(() => vi.useRealTimers());

  it('toggles on `i` and Ctrl+Shift+I, not while typing, not on Cmd+I', () => {
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    expect(g.key(key('i'))).toBe(true);
    expect(g.key(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(g.key(key('i', {}, 'INPUT'))).toBe(false);
    expect(g.key(key('i', { metaKey: true }))).toBe(false);
    expect(g.key(key('j'))).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('toggles after 5 taps in the top-left corner within 3 s, and not for slow or outside taps', () => {
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    for (const t of [0, 1000, 2000, 3000, 3500]) g.down(10, 10, 1, t); // the tap at 0 is > 3 s old at 3500
    expect(fn).not.toHaveBeenCalled();
    g.down(10, 10, 1, 3600); // 1000, 2000, 3000, 3500, 3600: five within 3 s
    expect(fn).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) g.down(200, 10, 1, 9000 + i * 100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('toggles after a three-finger hold of 800 ms, cancelled by lifting early', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    g.down(300, 300, 3, 0);
    vi.advanceTimersByTime(500);
    g.up();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    g.down(300, 300, 3, 0);
    vi.advanceTimersByTime(800);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/reveal.test.ts`
Expected: FAIL — cannot load `../../src/panel/reveal.ts`.

- [ ] **Step 3: Implement**

`packages/controller/src/panel/reveal.ts`:
```ts
// How the hidden same-screen panel is revealed (BUILD-PLAN Stage 6: three-finger long-press or Ctrl+Shift+I;
// this plan adds the plain `i` key and a 5-tap top-left corner for iPads without keyboards). Pure logic; the
// DOM wiring is attachReveal().
export interface RevealOptions {
  cornerPx: number; // tap zone size at the top-left corner
  taps: number; // taps needed
  windowMs: number; // …within this long
  longPressMs: number; // three-finger hold
}
export const DEFAULT_REVEAL: RevealOptions = { cornerPx: 64, taps: 5, windowMs: 3000, longPressMs: 800 };

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  /** Tag name of the focused element: typing in a field never toggles the panel. */
  targetTag: string;
}

export class RevealGesture {
  private readonly o: RevealOptions;
  private readonly onToggle: () => void;
  private tapTimes: number[] = [];
  private pressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onToggle: () => void, o: Partial<RevealOptions> = {}) {
    this.onToggle = onToggle;
    this.o = { ...DEFAULT_REVEAL, ...o };
  }

  /** Returns true when the key toggled the panel (the caller then calls preventDefault). */
  key(e: KeyLike): boolean {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.targetTag.toUpperCase())) return false;
    const plainI = e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.altKey && !e.metaKey;
    const ctrlShiftI = e.key.toLowerCase() === 'i' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
    if (!plainI && !ctrlShiftI) return false;
    this.onToggle();
    return true;
  }

  /** A touch/pointer went down at (x, y) with `touches` fingers, at time t (ms). */
  down(x: number, y: number, touches: number, t: number): void {
    if (touches >= 3) {
      this.cancelPress();
      this.pressTimer = setTimeout(() => {
        this.pressTimer = null;
        this.onToggle();
      }, this.o.longPressMs);
      return;
    }
    if (touches !== 1 || x > this.o.cornerPx || y > this.o.cornerPx) {
      this.tapTimes = [];
      return;
    }
    this.tapTimes = [...this.tapTimes.filter((s) => t - s <= this.o.windowMs), t];
    if (this.tapTimes.length >= this.o.taps) {
      this.tapTimes = [];
      this.onToggle();
    }
  }

  /** Fingers lifted or moved away: a pending three-finger hold is cancelled. */
  up(): void {
    this.cancelPress();
  }

  private cancelPress(): void {
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
    this.pressTimer = null;
  }
}

/** Wire a RevealGesture to a window. Returns a detach function. */
export function attachReveal(win: Window, g: RevealGesture): () => void {
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as Element | null)?.tagName ?? '';
    if (g.key({ key: e.key, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, targetTag: tag })) e.preventDefault();
  };
  const onTouchStart = (e: TouchEvent) => {
    const t0 = e.touches[0];
    if (t0) g.down(t0.clientX, t0.clientY, e.touches.length, e.timeStamp);
  };
  const onMouseDown = (e: MouseEvent) => g.down(e.clientX, e.clientY, 1, e.timeStamp);
  const onUp = () => g.up();
  win.addEventListener('keydown', onKey);
  win.addEventListener('touchstart', onTouchStart, { passive: true });
  win.addEventListener('mousedown', onMouseDown);
  win.addEventListener('touchend', onUp);
  win.addEventListener('touchcancel', onUp);
  return () => {
    win.removeEventListener('keydown', onKey);
    win.removeEventListener('touchstart', onTouchStart);
    win.removeEventListener('mousedown', onMouseDown);
    win.removeEventListener('touchend', onUp);
    win.removeEventListener('touchcancel', onUp);
  };
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/reveal.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/panel/reveal.ts packages/controller/test/panel/reveal.test.ts
git commit -m "feat(controller): panel reveal — i, Ctrl+Shift+I, 5-tap corner, three-finger long-press" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The same-screen instructor panel (drawer, generated controls, log, bookmarks)

**Files:**
- Create: `packages/controller/src/panel/styles.ts`, `packages/controller/src/panel/render-controls.ts`, `packages/controller/src/panel/panel.ts`, `packages/controller/test/panel/panel.dom.test.ts`

**Interfaces:**
- Consumes: controls/staging (16), reveal (17), `ControllerSession` (13), vocabulary (11); tests use `HostSession` (12), `manualHost` (12), in-process hub (4).
- Produces: `PANEL_CSS`, `injectStyles(doc)`; `interface ControlsHost { submit(c: CommandInput, key: string): void }`; `interface ControlsView { update(state, measured); el }`; `renderControls(parent, vocab, host, { mode? }): ControlsView` (sections Rhythm / Targets / Modifiers / Device, one row per vocabulary entry: `[data-var]`, `[data-modifier]`, `[data-device]`; buttons carry `data-action`); `interface PanelOptions { session; vocabulary; sound?: { enable(): Promise<void> }; startOpen?; reveal?; win? }`; `interface PanelHandle { el; isOpen; open(); close(); toggle(); destroy() }`; `mountInstructorPanel(parent, o): PanelHandle` (drawer `aside.pme-drawer[data-open]`, tabs Controls/Log/Bookmarks, stage bar with Commit/Discard, optional Sound button). Plain DOM, ≥ 36–44 px touch targets for iPad.

- [ ] **Step 1: Write the failing DOM test** (runs under happy-dom via the first-line pragma)

`packages/controller/test/panel/panel.dom.test.ts`:
```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel, type PanelHandle } from '../../src/panel/panel.ts';
import { stage1Vocabulary, type Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

async function setup(vocab: Vocabulary = stage1Vocabulary()) {
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'PNL234', target: host, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const s = new ControllerSession({ session: 'PNL234', transport: hub.connect() });
  await waitFor(() => s.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: s, vocabulary: vocab });
  cleanup.push(() => panel.destroy(), () => s.close(), () => hs.close());
  return { host, hs, s, panel };
}

const click = (el: Element | null) => (el as HTMLElement).click();
const q = <T extends Element>(p: PanelHandle, sel: string) => p.el.querySelector(sel) as T;

describe('instructor panel (DOM)', () => {
  it('starts hidden and toggles with the `i` key', async () => {
    const { panel } = await setup();
    expect(panel.isOpen).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(panel.isOpen).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(panel.isOpen).toBe(false);
  });

  it('generates one target row per vocabulary variable — new variables appear without UI changes', async () => {
    const v = stage1Vocabulary();
    v.variables.push({ id: 'spo2', label: 'SpO2', unit: '%', min: 0, max: 100, step: 1, normal: 97, rampable: true, pinnable: true });
    const { panel } = await setup(v);
    expect([...panel.el.querySelectorAll('[data-var]')].map((r) => (r as HTMLElement).dataset.var)).toEqual(['hr', 'spo2']);
    const pin = panel.el.querySelector('[data-var=spo2] [data-action=pin]') as HTMLButtonElement;
    expect(pin.disabled).toBe(true); // manual mode
  });

  it('Set sends a ramped setTarget that the host engine accepts', async () => {
    const { panel, hs } = await setup();
    q<HTMLInputElement>(panel, 'input[name=hr-value]').value = '120';
    q<HTMLInputElement>(panel, 'input[name=hr-ramp]').value = '10';
    q<HTMLSelectElement>(panel, 'select[name=hr-curve]').value = 'sigmoid';
    click(q(panel, '[data-var=hr] [data-action=set]'));
    await waitFor(() => hs.stats.applied === 1);
  });

  it('stage then commit sends staged changes together (one tick)', async () => {
    const { panel, s, hs } = await setup();
    q<HTMLInputElement>(panel, 'input[name=stage]').checked = true;
    click(q(panel, '[data-var=hr] [data-action=set]'));
    click(q(panel, '[data-action=rhythm]'));
    expect(q<HTMLElement>(panel, '.pme-staged').textContent).toBe('2 staged');
    expect(hs.stats.applied).toBe(0);
    click(q(panel, '[data-action=commit]'));
    await waitFor(() => hs.stats.applied === 2);
    const acks = s.log.filter((l) => l.kind === 'ack');
    expect(acks).toHaveLength(2);
  });

  it('logs notes, and lists and restores bookmarks', async () => {
    const { panel, s, hs, host } = await setup();
    q<HTMLInputElement>(panel, 'input[name=note]').value = 'airway checked';
    click(q(panel, '[data-action=note]'));
    expect(s.log.at(-1)?.text).toBe('airway checked');
    host.advance(1000);
    q<HTMLInputElement>(panel, 'input[name=bookmark]').value = 'before VF';
    click(q(panel, '[data-action=bookmark]'));
    await waitFor(() => s.bookmarks.includes('before VF'));
    expect(hs.bookmarks()).toEqual(['before VF']);
    host.advance(3000);
    click(q(panel, '.pme-bookmarks [data-action=restore]'));
    await waitFor(() => host.engine.now().tick === 50);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/panel.dom.test.ts`
Expected: FAIL — cannot load `../../src/panel/panel.ts`.

- [ ] **Step 3: Implement**

`packages/controller/src/panel/styles.ts`:
```ts
// Panel and remote CSS, injected once per document. Touch-sized (≥ 44 px targets) for iPad use.
export const PANEL_CSS = `
.pme-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#111c;color:#ddd;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-left:1px solid #333;z-index:2147483000;
  transform:translateX(100%);transition:transform .18s ease-out;display:flex;flex-direction:column;
  font:14px system-ui,sans-serif}
.pme-drawer[data-open="true"]{transform:none}
.pme-drawer header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #333}
.pme-drawer header h2{font-size:15px;margin:0;flex:1}
.pme-tabs{display:flex;border-bottom:1px solid #333}
.pme-tabs button{flex:1;background:none;border:0;color:#aaa;padding:10px;min-height:44px;font:inherit}
.pme-tabs button[aria-selected="true"]{color:#fff;box-shadow:inset 0 -2px #4af}
.pme-body{overflow:auto;flex:1;padding:8px 10px}
.pme-section{margin:0 0 14px}
.pme-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8ab;margin:6px 0}
.pme-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0}
.pme-row label{display:inline-flex;align-items:center;gap:4px}
.pme-drawer button,.pme-remote button,.pme-drawer select,.pme-remote select,.pme-drawer input,.pme-remote input{
  font:inherit;min-height:36px;background:#222;color:#eee;border:1px solid #444;border-radius:6px;padding:4px 8px}
.pme-drawer input[type=number],.pme-remote input[type=number]{width:5.5em}
.pme-readout{font-variant-numeric:tabular-nums;color:#9c9;min-width:9em}
.pme-flag{display:inline-block;min-width:1.4em;text-align:center;border-radius:4px;font-weight:700}
.pme-flag-blue{background:#1e5bd8;color:#fff}.pme-flag-yellow{background:#e6c200;color:#000}
.pme-flag-pin{background:#555;color:#fff}.pme-flag-model{background:#264;color:#fff}
.pme-stagebar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-top:1px solid #333}
.pme-stagebar[data-count="0"] .pme-commit{opacity:.5}
.pme-log{font:12px ui-monospace,monospace;list-style:none;margin:0;padding:0}
.pme-log li{padding:2px 0;border-bottom:1px solid #222}
.pme-log li[data-kind="note"]{color:#fc6}.pme-log li[data-kind="alarm"]{color:#f66}
.pme-log li[data-kind="ack"]{color:#8a8}
.pme-status{font-size:12px;color:#aaa}.pme-status[data-ok="false"]{color:#f66}
.pme-remote{background:#000;color:#ddd;font:15px system-ui,sans-serif;padding:10px;max-width:640px;margin:auto}
.pme-remote .pme-vitals{display:flex;gap:18px;font-size:28px;font-variant-numeric:tabular-nums;margin:8px 0}
`;

export function injectStyles(doc: Document): void {
  if (doc.getElementById('pme-panel-css')) return;
  const s = doc.createElement('style');
  s.id = 'pme-panel-css';
  s.textContent = PANEL_CSS;
  doc.head.append(s);
}
```

`packages/controller/src/panel/render-controls.ts` (note: `<option>` elements are created with `createElement`, not `new Option(…)`, which happy-dom does not provide):
```ts
// Generated controls (shared by the same-screen panel and the remote). One row per vocabulary entry, so
// Stage 2/5 variables, rhythms, modifiers and devices appear without UI changes.
import type { RhythmId } from '@pme/engine-core';
import type { CommandInput, MeasuredMap, StateEvent } from '../protocol.ts';
import type { Vocabulary } from '../vocabulary.ts';
import {
  deviceCommand,
  flagView,
  modifierCommand,
  pinCommand,
  rampFrom,
  readout,
  releaseCommand,
  rhythmCommand,
  targetCommand,
} from './controls.ts';

export interface ControlsHost {
  /** Send now, or stage when stage-then-commit is on. `key` identifies the control (a restage replaces). */
  submit(c: CommandInput, key: string): void;
}

export interface ControlsView {
  /** Refresh the readouts and flags from the latest state and measurements. */
  update(state: StateEvent | null, measured: MeasuredMap): void;
  readonly el: HTMLElement;
}

/** Maps a StateVar to the NumericId that displays it (displayed column). */
const DISPLAYED: Partial<Record<string, string>> = { hr: 'hr', spo2: 'spo2', etco2: 'etco2', rr: 'rr', tempCore: 'tempCore', sbp: 'abpSys', dbp: 'abpDia', cvp: 'cvpMean' };

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function select(doc: Document, options: Array<{ value: string; label: string }>, value: string, name: string): HTMLSelectElement {
  const s = el(doc, 'select', { name });
  for (const o of options) s.append(el(doc, 'option', { value: o.value }, o.label));
  s.value = value;
  return s;
}

function numberInput(doc: Document, name: string, min: number, max: number, step: number, value: number): HTMLInputElement {
  return el(doc, 'input', { type: 'number', name, min: String(min), max: String(max), step: String(step), value: String(value) });
}

export function renderControls(parent: HTMLElement, vocab: Vocabulary, host: ControlsHost, opts: { mode?: 'manual' | 'modeled' } = {}): ControlsView {
  const doc = parent.ownerDocument;
  const root = el(doc, 'div', { class: 'pme-controls' });
  const section = (title: string) => {
    const s = el(doc, 'section', { class: 'pme-section' });
    s.append(el(doc, 'h3', {}, title));
    root.append(s);
    return s;
  };
  const row = (s: HTMLElement) => {
    const r = el(doc, 'div', { class: 'pme-row' });
    s.append(r);
    return r;
  };

  // Rhythm
  const rs = section('Rhythm');
  const r1 = row(rs);
  const rhythmSel = select(doc, vocab.rhythms.map((r) => ({ value: r.id, label: r.label })), vocab.rhythms[0]?.id ?? 'sinus', 'rhythm');
  const whenSel = select(doc, [{ value: 'now', label: 'now' }, { value: 'nextBeat', label: 'next beat' }], 'now', 'rhythm-when');
  const rhythmBtn = el(doc, 'button', { type: 'button', 'data-action': 'rhythm' }, 'Apply');
  rhythmBtn.addEventListener('click', () => host.submit(rhythmCommand(rhythmSel.value as RhythmId, whenSel.value as 'now' | 'nextBeat'), 'rhythm'));
  r1.append(rhythmSel, whenSel, rhythmBtn);

  // Targets (one row per variable)
  const ts = section('Targets');
  const readouts: Array<{ id: string; out: HTMLElement; flag: HTMLElement; spec: Vocabulary['variables'][number] }> = [];
  for (const spec of vocab.variables) {
    const r = row(ts);
    r.dataset.var = spec.id;
    const flag = el(doc, 'span', { class: 'pme-flag' });
    const val = numberInput(doc, `${spec.id}-value`, spec.min, spec.max, spec.step, spec.normal);
    const dur = numberInput(doc, `${spec.id}-ramp`, 0, vocab.ramp.maxDurationS, 1, 0);
    const curve = select(doc, vocab.ramp.curves.map((c) => ({ value: c, label: c })), 'linear', `${spec.id}-curve`);
    const set = el(doc, 'button', { type: 'button', 'data-action': 'set' }, 'Set');
    const ramp = () => rampFrom(Number(dur.value), curve.value as 'linear', vocab.ramp.maxDurationS);
    set.addEventListener('click', () => host.submit(targetCommand(spec, Number(val.value), ramp()), `target.${spec.id}`));
    const out = el(doc, 'span', { class: 'pme-readout', title: 'target / truth / displayed' }, '—');
    r.append(flag, el(doc, 'strong', {}, spec.label), val, el(doc, 'span', {}, 'ramp s'), dur, curve, set, out);
    if (spec.pinnable) {
      const pin = el(doc, 'button', { type: 'button', 'data-action': 'pin' }, 'Pin');
      const rel = el(doc, 'button', { type: 'button', 'data-action': 'release' }, 'Release');
      const modeled = opts.mode === 'modeled';
      pin.disabled = rel.disabled = !modeled;
      if (!modeled) pin.title = rel.title = 'Pin and release need MODELED mode (Stage 7)';
      pin.addEventListener('click', () => host.submit(pinCommand(spec, Number(val.value), ramp()), `pin.${spec.id}`));
      rel.addEventListener('click', () => host.submit(releaseCommand(spec, ramp()), `pin.${spec.id}`));
      r.append(pin, rel);
    }
    readouts.push({ id: spec.id, out, flag, spec });
  }

  // Modifiers
  const ms = section('Modifiers');
  for (const spec of vocab.modifiers) {
    const r = row(ms);
    r.dataset.modifier = spec.path;
    if (spec.kind === 'number') {
      const v = numberInput(doc, spec.path, spec.min, spec.max, spec.step, spec.normal);
      const b = el(doc, 'button', { type: 'button', 'data-action': 'modifier' }, 'Set');
      b.addEventListener('click', () => host.submit(modifierCommand(spec, Number(v.value)), `mod.${spec.path}`));
      r.append(el(doc, 'span', {}, spec.label), v, b);
      continue;
    }
    const on = el(doc, 'input', { type: 'checkbox', name: `${spec.path}-on` });
    const inputs = spec.fields.map((f) =>
      f.type === 'enum' ? select(doc, f.options, f.normal, `${spec.path}.${f.key}`) : numberInput(doc, `${spec.path}.${f.key}`, f.min, f.max, f.step, f.normal),
    );
    const apply = () => {
      const value: Record<string, string | number> = {};
      spec.fields.forEach((f, i) => {
        const inp = inputs[i] as HTMLInputElement | HTMLSelectElement;
        value[f.key] = f.type === 'number' ? Number(inp.value) : inp.value;
      });
      host.submit(modifierCommand(spec, on.checked ? value : null), `mod.${spec.path}`);
    };
    on.addEventListener('change', apply);
    for (const i of inputs) i.addEventListener('change', () => on.checked && apply());
    const label = el(doc, 'label');
    label.append(on, doc.createTextNode(spec.label));
    r.append(label, ...inputs);
  }

  // Devices
  const ds = section('Device');
  for (const spec of vocab.devices) {
    const lanes = spec.lanes ?? 0;
    const r = row(ds);
    r.dataset.device = spec.id;
    r.append(el(doc, 'span', {}, spec.label));
    for (let lane = 0; lane < Math.max(1, lanes); lane++) {
      const normal = Array.isArray(spec.normal) ? (spec.normal[lane] ?? spec.options[0]?.value ?? '') : spec.normal;
      const s = select(doc, spec.options, normal, lanes ? `${spec.id}.${lane}` : spec.id);
      s.addEventListener('change', () => host.submit(deviceCommand(spec, s.value, lanes ? lane : undefined), lanes ? `${spec.id}.${lane}` : spec.id));
      r.append(s);
    }
  }

  parent.append(root);
  return {
    el: root,
    update(state, measured) {
      for (const r of readouts) {
        const id = DISPLAYED[r.id];
        const m = id ? measured[id as keyof MeasuredMap] : undefined;
        r.out.textContent = readout(r.spec, state, m?.value);
        const f = flagView(state?.control[r.spec.id]);
        r.flag.className = f.className;
        r.flag.textContent = f.text;
        r.flag.title = f.title;
      }
    },
  };
}
```

`packages/controller/src/panel/panel.ts`:
```ts
// The same-screen hidden instructor panel (R7; BUILD-PLAN Stage 6): a drawer over the monitor, revealed by
// `i`, Ctrl+Shift+I, a 5-tap top-left corner or a three-finger long-press. Tabs: Controls (generated from the
// vocabulary, with stage-then-commit), Log (commands, acks, alarms, notes/markers), Bookmarks (snapshot/restore).
import type { ControllerSession } from '../session/controller-session.ts';
import type { CommandInput } from '../protocol.ts';
import type { Vocabulary } from '../vocabulary.ts';
import { renderControls } from './render-controls.ts';
import { attachReveal, RevealGesture, type RevealOptions } from './reveal.ts';
import { StageBuffer } from './staging.ts';
import { injectStyles } from './styles.ts';

export interface PanelOptions {
  session: ControllerSession;
  vocabulary: Vocabulary;
  /** Host-local sound switch (same screen only; a remote has no speaker to switch). */
  sound?: { enable(): Promise<void> };
  startOpen?: boolean;
  reveal?: Partial<RevealOptions>;
  /** Window to listen on for the reveal gestures (default: the element's window). */
  win?: Window;
}

export interface PanelHandle {
  readonly el: HTMLElement;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
}

const LOG_SHOWN = 200;

export function mountInstructorPanel(parent: HTMLElement, o: PanelOptions): PanelHandle {
  const doc = parent.ownerDocument;
  const win = o.win ?? (doc.defaultView as Window);
  injectStyles(doc);
  const drawer = doc.createElement('aside');
  drawer.className = 'pme-drawer';
  drawer.setAttribute('aria-label', 'Instructor panel');
  drawer.dataset.open = String(!!o.startOpen);
  drawer.innerHTML = `
    <header><h2>Instructor</h2><span class="pme-status" data-ok="true"></span>
      <button type="button" data-action="close" aria-label="Close panel">✕</button></header>
    <div class="pme-tabs" role="tablist">
      <button type="button" role="tab" data-tab="controls" aria-selected="true">Controls</button>
      <button type="button" role="tab" data-tab="log" aria-selected="false">Log</button>
      <button type="button" role="tab" data-tab="bookmarks" aria-selected="false">Bookmarks</button>
    </div>
    <div class="pme-body" data-pane="controls"></div>
    <div class="pme-body" data-pane="log" hidden>
      <div class="pme-row"><input name="note" placeholder="Note / marker" /><button type="button" data-action="note">Mark</button></div>
      <ul class="pme-log"></ul>
    </div>
    <div class="pme-body" data-pane="bookmarks" hidden>
      <div class="pme-row"><input name="bookmark" placeholder="Label (optional)" /><button type="button" data-action="bookmark">Bookmark now</button></div>
      <ul class="pme-log pme-bookmarks"></ul>
    </div>
    <div class="pme-stagebar" data-count="0">
      <label><input type="checkbox" name="stage" /> Stage changes</label>
      <span class="pme-staged">0 staged</span>
      <button type="button" class="pme-commit" data-action="commit">Commit</button>
      <button type="button" data-action="discard">Discard</button>
      ${o.sound ? '<button type="button" data-action="sound">Sound on</button>' : ''}
    </div>`;
  parent.append(drawer);
  const q = <T extends Element>(sel: string) => drawer.querySelector(sel) as T;

  const s = o.session;
  /** Fire and forget: the ack lands in the log; a send cut short by close() is not an error. */
  const fire = (c: CommandInput) => void s.send(c).catch(() => undefined);
  const stage = new StageBuffer(s.peerId);
  const stageBox = q<HTMLInputElement>('input[name=stage]');
  const stagebar = q<HTMLElement>('.pme-stagebar');
  const refreshStage = () => {
    stagebar.dataset.count = String(stage.size);
    q<HTMLElement>('.pme-staged').textContent = `${stage.size} staged`;
  };
  const submit = (c: CommandInput, key: string) => {
    if (stageBox.checked) {
      stage.stage(c, key);
      refreshStage();
    } else fire(c);
  };
  const controls = renderControls(q('[data-pane=controls]'), o.vocabulary, { submit }, { mode: s.state?.mode ?? 'manual' });

  const logList = q<HTMLUListElement>('[data-pane=log] .pme-log');
  const marks = q<HTMLUListElement>('.pme-bookmarks');
  const status = q<HTMLElement>('.pme-status');
  const fmtT = (t: number | null) => (t === null ? '--:--' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
  const render = () => {
    controls.update(s.state, s.measurements);
    status.textContent = `${s.status}${s.hostOnline ? '' : ' · no host'}${s.pendingCount ? ` · ${s.pendingCount} pending` : ''}`;
    status.dataset.ok = String(s.status === 'open' && s.hostOnline);
    logList.replaceChildren(
      ...s.log.slice(-LOG_SHOWN).reverse().map((e) => {
        const li = doc.createElement('li');
        li.dataset.kind = e.kind;
        li.textContent = `${fmtT(e.simT)} ${e.kind} ${e.text}`;
        return li;
      }),
    );
    marks.replaceChildren(
      ...s.bookmarks.map((label) => {
        const li = doc.createElement('li');
        const b = doc.createElement('button');
        b.type = 'button';
        b.dataset.action = 'restore';
        b.textContent = 'Restore';
        b.addEventListener('click', () => fire({ type: 'scenario', action: 'restoreBookmark', target: label }));
        li.append(b, doc.createTextNode(` ${label}`));
        return li;
      }),
    );
  };
  const offChange = s.onChange(render);
  render();

  drawer.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    const tab = b.getAttribute('data-tab');
    if (tab) {
      for (const t of drawer.querySelectorAll('[data-tab]')) t.setAttribute('aria-selected', String(t === b));
      for (const p of drawer.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== tab;
      return;
    }
    switch (b.dataset.action) {
      case 'close':
        return handle.close();
      case 'commit':
        void stage.commit((c) => s.send(c)).catch(() => undefined);
        return refreshStage();
      case 'discard':
        stage.discard();
        return refreshStage();
      case 'note': {
        const i = q<HTMLInputElement>('input[name=note]');
        s.note(i.value.trim() || 'marker');
        i.value = '';
        return;
      }
      case 'bookmark': {
        const i = q<HTMLInputElement>('input[name=bookmark]');
        const label = i.value.trim();
        fire({ type: 'scenario', action: 'bookmark', ...(label ? { target: label } : {}) });
        i.value = '';
        return;
      }
      case 'sound':
        void o.sound?.enable().then(() => (b.textContent = 'Sound enabled'));
        return;
    }
  });

  const gesture = new RevealGesture(() => handle.toggle(), o.reveal);
  const detach = attachReveal(win, gesture);
  const handle: PanelHandle = {
    el: drawer,
    get isOpen() {
      return drawer.dataset.open === 'true';
    },
    open: () => void (drawer.dataset.open = 'true'),
    close: () => void (drawer.dataset.open = 'false'),
    toggle: () => void (drawer.dataset.open = String(drawer.dataset.open !== 'true')),
    destroy() {
      detach();
      offChange();
      drawer.remove();
    },
  };
  return handle;
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: panel.dom 5, controls 5, reveal 3 passed; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/panel/styles.ts packages/controller/src/panel/render-controls.ts packages/controller/src/panel/panel.ts packages/controller/test/panel/panel.dom.test.ts
git commit -m "feat(controller): hidden instructor panel — generated controls with flags and ramps, stage/commit, event log with markers, bookmarks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: The remote controller app

**Files:**
- Create: `packages/controller/src/remote/remote-app.ts`, `packages/controller/test/remote/remote.dom.test.ts`

**Interfaces:**
- Consumes: `ControllerSession` (13), `renderControls`, `StageBuffer`, `injectStyles` (16, 18), `normalizeSessionCode` (2).
- Produces: `type Via = 'broadcastChannel'|'websocket'|'webrtc'`; `interface RemoteOptions { vocabulary; connect(session, via): ManagedTransport; vias: Via[]; session?; autoJoin? }`; `interface RemoteHandle { session: ControllerSession | null; join(code, via): ControllerSession; destroy() }`; `mountRemote(parent, o): RemoteHandle` — join form (code + link type), status line (`connected · CODE` / `waiting for host` / `disconnected — retrying`), live `HR` and sim time, the same generated controls, a stage bar with Commit/Discard/Pause/Resume, and the last 8 log lines. It never creates a canvas.

- [ ] **Step 1: Write the failing DOM test**

`packages/controller/test/remote/remote.dom.test.ts`:
```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountRemote } from '../../src/remote/remote-app.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

afterEach(() => document.body.replaceChildren());

describe('remote controller (DOM)', () => {
  it('joins by code, shows the live readout, sends commands, and renders no canvas', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'RMT234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const r = mountRemote(document.body, { vocabulary: stage1Vocabulary(), vias: ['broadcastChannel'], connect: () => hub.connect() });
    (document.querySelector('input[name=code]') as HTMLInputElement).value = 'rmt-234';
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await waitFor(() => r.session?.hostOnline === true);
    expect(document.querySelector('.pme-status')?.textContent).toBe('connected · RMT234');
    host.advance(12_000); // HR measurements start after a few beats
    await waitFor(() => /HR \d+/.test(document.querySelector('[data-v=hr]')?.textContent ?? ''));
    (document.querySelector('[data-action=rhythm]') as HTMLButtonElement).click();
    await waitFor(() => hs.stats.applied === 1);
    (document.querySelector('[data-action=pause]') as HTMLButtonElement).click();
    await waitFor(() => host.paused);
    expect(document.querySelector('canvas')).toBeNull();
    r.destroy();
    hs.close();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/remote`
Expected: FAIL — cannot load `../../src/remote/remote-app.ts`.

- [ ] **Step 3: Implement**

`packages/controller/src/remote/remote-app.ts`:
```ts
// Remote controller (R7): a phone/tablet page that joins a session code, shows the generated controls and a
// live 1 Hz readout, and never renders waveforms (samples never reach it anyway).
import { normalizeSessionCode, type ManagedTransport } from '../protocol.ts';
import { ControllerSession } from '../session/controller-session.ts';
import { renderControls } from '../panel/render-controls.ts';
import { StageBuffer } from '../panel/staging.ts';
import { injectStyles } from '../panel/styles.ts';
import type { Vocabulary } from '../vocabulary.ts';
import type { CommandInput } from '../protocol.ts';

export type Via = 'broadcastChannel' | 'websocket' | 'webrtc';

export interface RemoteOptions {
  vocabulary: Vocabulary;
  /** Build the transport for a session (the page decides URLs). */
  connect(session: string, via: Via): ManagedTransport;
  /** Offered link types, first = default. */
  vias: Via[];
  /** Pre-filled code (e.g. from ?session=). */
  session?: string;
  /** Join at once when a valid session is given. */
  autoJoin?: boolean;
}

export interface RemoteHandle {
  readonly session: ControllerSession | null;
  join(code: string, via: Via): ControllerSession;
  destroy(): void;
}

const VIA_LABEL: Record<Via, string> = { broadcastChannel: 'This browser', websocket: 'Relay (WebSocket)', webrtc: 'Direct (WebRTC)' };

export function mountRemote(parent: HTMLElement, o: RemoteOptions): RemoteHandle {
  const doc = parent.ownerDocument;
  injectStyles(doc);
  const root = doc.createElement('div');
  root.className = 'pme-remote';
  root.innerHTML = `
    <form class="pme-join pme-row">
      <input name="code" placeholder="Session code" maxlength="8" autocapitalize="characters" autocomplete="off" />
      <select name="via">${o.vias.map((v) => `<option value="${v}">${VIA_LABEL[v]}</option>`).join('')}</select>
      <button type="submit">Join</button>
      <span class="pme-status" data-ok="false">not joined</span>
    </form>
    <div class="pme-live" hidden>
      <div class="pme-vitals"><span data-v="hr">HR ---</span><span data-v="simT">t --:--</span></div>
      <div class="pme-controls-slot"></div>
      <div class="pme-stagebar" data-count="0">
        <label><input type="checkbox" name="stage" /> Stage changes</label>
        <span class="pme-staged">0 staged</span>
        <button type="button" data-action="commit">Commit</button>
        <button type="button" data-action="discard">Discard</button>
        <button type="button" data-action="pause">Pause</button>
        <button type="button" data-action="resume">Resume</button>
      </div>
      <ul class="pme-log"></ul>
    </div>`;
  parent.append(root);
  const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const form = q<HTMLFormElement>('form');
  const codeIn = q<HTMLInputElement>('input[name=code]');
  const viaSel = q<HTMLSelectElement>('select[name=via]');
  const status = q<HTMLElement>('.pme-status');
  if (o.session) codeIn.value = o.session;
  let session: ControllerSession | null = null;
  let off: (() => void) | null = null;

  const join = (code: string, via: Via): ControllerSession => {
    const s0 = normalizeSessionCode(code);
    if (!s0) throw new Error(`invalid session code ${code}`);
    off?.();
    session?.close();
    const s = new ControllerSession({ session: s0, transport: o.connect(s0, via), issuedBy: 'remote' });
    session = s;
    const fire = (c: CommandInput) => void s.send(c).catch(() => undefined);
    const stage = new StageBuffer(s.peerId);
    const stageBox = q<HTMLInputElement>('input[name=stage]');
    const refreshStage = () => {
      q<HTMLElement>('.pme-stagebar').dataset.count = String(stage.size);
      q<HTMLElement>('.pme-staged').textContent = `${stage.size} staged`;
    };
    const submit = (c: CommandInput, key: string) => {
      if (stageBox.checked) {
        stage.stage(c, key);
        refreshStage();
      } else fire(c);
    };
    const slot = q<HTMLElement>('.pme-controls-slot');
    slot.replaceChildren();
    const controls = renderControls(slot, o.vocabulary, { submit });
    q<HTMLElement>('.pme-live').hidden = false;
    q<HTMLElement>('.pme-stagebar').onclick = (ev) => {
      const a = (ev.target as HTMLElement).closest('button')?.dataset.action;
      if (a === 'commit') void stage.commit((c) => s.send(c)).then(refreshStage, () => undefined);
      if (a === 'discard') stage.discard();
      if (a === 'pause' || a === 'resume') fire({ type: 'time', action: a });
      refreshStage();
    };
    const render = () => {
      controls.update(s.state, s.measurements);
      const hr = s.measurements.hr;
      q<HTMLElement>('[data-v=hr]').textContent = `HR ${hr && hr.value !== null ? Math.round(hr.value) : '---'}`;
      const t = s.simT;
      q<HTMLElement>('[data-v=simT]').textContent = t === null ? 't --:--' : `t ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      const ok = s.status === 'open' && s.hostOnline;
      status.dataset.ok = String(ok);
      status.textContent = ok ? `connected · ${s0}` : s.status === 'open' ? 'waiting for host' : s.status === 'connecting' ? 'disconnected — retrying' : s.status;
      q<HTMLUListElement>('.pme-log').replaceChildren(
        ...s.log.slice(-8).reverse().map((e) => {
          const li = doc.createElement('li');
          li.dataset.kind = e.kind;
          li.textContent = `${e.kind} ${e.text}`;
          return li;
        }),
      );
    };
    off = s.onChange(render);
    render();
    return s;
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      join(codeIn.value, viaSel.value as Via);
    } catch (err) {
      status.textContent = (err as Error).message;
    }
  });
  if (o.autoJoin && o.session && normalizeSessionCode(o.session)) join(o.session, o.vias[0] as Via);

  return {
    get session() {
      return session;
    },
    join,
    destroy() {
      off?.();
      session?.close();
      root.remove();
    },
  };
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/remote`
Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/remote/remote-app.ts packages/controller/test/remote/remote.dom.test.ts
git commit -m "feat(controller): remote controller — join by code, live readout, generated controls, pause/resume, no waveforms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Public API, `transports` object and a browser-safe build

**Files:**
- Create: `packages/controller/test/index.test.ts`
- Modify: `packages/controller/src/index.ts` (replace the Stage 0 one-liner)

**Interfaces:**
- Consumes: everything in `src/`.
- Produces: `@pme/controller` exports (see the file) and `transports = { inProcess, postMessage, broadcastChannel, websocket, webrtc }` — the object renderer request R-2 will put on `PatientMonitor.transports`. `src/index.ts` must not import `relay/`.

- [ ] **Step 1: Write the failing test**

`packages/controller/test/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.ts';

describe('@pme/controller public API', () => {
  it('exports the five transports under brief §7.5 names, sessions, panel and remote', () => {
    expect(Object.keys(api.transports).sort()).toEqual(['broadcastChannel', 'inProcess', 'postMessage', 'webrtc', 'websocket']);
    for (const name of [
      'createInProcessHub', 'createPostMessageTransport', 'createBroadcastChannelTransport', 'createWebSocketTransport',
      'createWebRtcTransport', 'acceptWebRtcPeers', 'createRelaySignaling', 'HostSession', 'ControllerSession', 'ViewerSync',
      'mountInstructorPanel', 'mountRemote', 'vocabularyOf', 'newSessionCode', 'parseWireMessage', 'assertWireSafe',
    ] as const) expect(typeof api[name], name).toBe('function');
    expect(api.version).toBe('0.0.0');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/index.test.ts`
Expected: FAIL — `transports` is undefined (`Cannot convert undefined or null to object`).

- [ ] **Step 3: Implement**

`packages/controller/src/index.ts`:
```ts
// @pme/controller public API (brief §7.5; R7). The relay (relay/) is Node-only and is not exported here.
export const version = '0.0.0';
export * from './protocol.ts';
export * from './guard.ts';
export * from './vocabulary.ts';
export { createInProcessHub, type InProcessHub } from './transport/in-process.ts';
export { createPostMessageTransport, windowEndpoint, type PostEndpoint } from './transport/post-message.ts';
export { createBroadcastChannelTransport, channelName } from './transport/broadcast-channel.ts';
export { createWebSocketTransport, type WebSocketTransportOptions } from './transport/websocket.ts';
export {
  acceptWebRtcPeers,
  createRelaySignaling,
  createWebRtcTransport,
  HOST_SIGNAL_ID,
  type Signaling,
  type WebRtcOptions,
} from './transport/webrtc.ts';
export { backoffDelay, DEFAULT_BACKOFF, type BackoffOptions } from './transport/backoff.ts';
export type { RelayFrame } from './transport/relay-frames.ts';
export { HostSession, STAGE_LEAD_TICKS, type HostSessionOptions, type HostTarget, type ScenarioHook } from './session/host-session.ts';
export { ControllerSession, describe, type ControllerSessionOptions, type LogEntry } from './session/controller-session.ts';
export { ViewerSync, type ViewerSyncOptions, type ViewerStatus, type ViewerTarget } from './session/viewer-sync.ts';
export * from './panel/controls.ts';
export { StageBuffer } from './panel/staging.ts';
export { RevealGesture, attachReveal, DEFAULT_REVEAL, type RevealOptions } from './panel/reveal.ts';
export { renderControls, type ControlsHost, type ControlsView } from './panel/render-controls.ts';
export { mountInstructorPanel, type PanelHandle, type PanelOptions } from './panel/panel.ts';
export { mountRemote, type RemoteHandle, type RemoteOptions, type Via } from './remote/remote-app.ts';

import { createBroadcastChannelTransport } from './transport/broadcast-channel.ts';
import { createInProcessHub } from './transport/in-process.ts';
import { createPostMessageTransport } from './transport/post-message.ts';
import { createWebRtcTransport } from './transport/webrtc.ts';
import { createWebSocketTransport } from './transport/websocket.ts';
/** The five adapters under one object, the shape the IIFE's `PatientMonitor.transports` will take. */
export const transports = {
  inProcess: createInProcessHub,
  postMessage: createPostMessageTransport,
  broadcastChannel: createBroadcastChannelTransport,
  websocket: createWebSocketTransport,
  webrtc: createWebRtcTransport,
};
```

- [ ] **Step 4: Run everything for the package, build, and check the bundle has no `ws`**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller test
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
npx -y pnpm@9.15.9 --filter @pme/controller build
grep -c "WebSocketServer" packages/controller/dist/index.js
```
Expected: 20 test files, 97 tests passed; typecheck 0; build prints `dist/index.js` (≈ 62 kB, engine-core included as in the other packages); the grep prints `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/index.ts packages/controller/test/index.test.ts
git commit -m "feat(controller): public API and the transports object; browser build carries no relay code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 21: Demo host page — `stage6a.html` (monitor + hidden panel + session code + open remote/viewer)

**Files:**
- Create: `apps/demo/src/stage6a/sim-monitor.ts`, `apps/demo/src/stage6a/links.ts`, `apps/demo/src/stage6a/host.ts`, `apps/demo/stage6a.html`
- Modify: `apps/demo/package.json`, `apps/demo/vite.config.ts`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `@pme/renderer` `MonitorCore`, `NumericTile` (read-only use); `@pme/audio` `ToneScheduler`, `unlockAudio`, `playBeep`; `@pme/controller` (Task 20).
- Produces:
  - `mountSimMonitor(el, { engine?, lanes? }): SimMonitor` with `core: MonitorCore`, `host: HostTarget`, `viewer: ViewerTarget`, `onFrame(fn(epochMs, renderT)): () => void`, `enableSound()`, `destroy()` — `MonitorCore` on the main thread (decision 11).
  - `links.ts`: `params`, `relayUrl()` (default `ws://<page host>:8787/`), `viaParam(): Via` (`?via=bc|relay|rtc`), `viaToParam`, `connect(session, via): ManagedTransport`, `epochNow()`.
  - `stage6a.html`: session code from `?session=` (else a new one, written back into the URL); HostSession over in-process (panel) + BroadcastChannel, and over the relay + WebRTC when `?relay=` is present; buttons **Open remote**, **Open viewer**, **Enable sound**; a diagnostics line. `window.__pme6a = { role: 'host', session, hs, mon, panel, timings, firePanel, now }` for the browser tests: `timings[]` = `{ commandId, from, receivedAt, tick, visibleAt }` where `visibleAt` is the first frame whose drawn sim time reaches `tick × 0.02 s`.

- [ ] **Step 1: Add the demo dependencies and pages to the build**

In `apps/demo/package.json` add to `dependencies`: `"@pme/audio": "workspace:*"` and `"@pme/controller": "workspace:*"`, then run `npx -y pnpm@9.15.9 install`.

In `apps/demo/vite.config.ts` replace the `input` line with:
```ts
      input: { index: page('index'), stage0: page('stage0'), stage1: page('stage1'), stage6a: page('stage6a') },
```

- [ ] **Step 2: Write the monitor glue**

`apps/demo/src/stage6a/sim-monitor.ts`:
```ts
// Stage 6a demo glue: a monitor that runs MonitorCore on the MAIN thread (the renderer's fallback path), so the
// page has the engine in hand for snapshot/restore/clock control. MountOptions/MonitorHandle do not expose
// those yet (renderer request R-1 in the plan); the drawing code is the renderer's own.
import { playBeep, ToneScheduler, unlockAudio } from '@pme/audio';
import type { EngineEvent, EngineOptions, LeadId } from '@pme/engine-core';
import { MonitorCore, NumericTile } from '@pme/renderer';
import type { HostTarget, ViewerTarget } from '@pme/controller';

export interface SimMonitor {
  readonly core: MonitorCore;
  readonly host: HostTarget;
  readonly viewer: ViewerTarget;
  /** Called every animation frame after drawing, with the frame's epoch ms and the drawn sim time. */
  onFrame(fn: (epochMs: number, renderT: number) => void): () => void;
  enableSound(): Promise<void>;
  destroy(): void;
}

const epochNow = (t = performance.now()) => performance.timeOrigin + t;

export function mountSimMonitor(el: HTMLElement, opts: { engine?: EngineOptions; lanes?: LeadId[] } = {}): SimMonitor {
  const doc = el.ownerDocument;
  const root = doc.createElement('div');
  root.style.cssText = 'display:flex;width:100%;height:100%;background:#000;overflow:hidden;';
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = 'width:190px;flex:none;border-left:1px solid #222;';
  root.append(wrap, tiles);
  el.append(root);
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });

  let scheduler: ToneScheduler | null = null;
  const size = () => ({ cssW: Math.max(200, wrap.clientWidth), cssH: Math.max(100, wrap.clientHeight), dpr: globalThis.devicePixelRatio || 1 });
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as ConstructorParameters<typeof MonitorCore>[1];
  const core = new MonitorCore(canvas, ctx, size(), { ...(opts.engine ? { engine: opts.engine } : {}), ...(opts.lanes ? { lanes: opts.lanes } : {}) }, (anchor, events: EngineEvent[]) => {
    scheduler?.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.epochMs - performance.timeOrigin, timeScale: anchor.timeScale });
    for (const e of events) {
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (e.type === 'tone') scheduler?.enqueue({ t: e.t, id: e.id, kind: e.kind, ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}) });
      if (e.type === 'toneCancel') scheduler?.cancelAfter(e.after);
    }
  });
  const frameFns = new Set<(epochMs: number, renderT: number) => void>();
  let raf = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const loop = (t: number) => {
    const epoch = epochNow(t);
    core.frame(epoch);
    for (const fn of frameFns) fn(epoch, core.clock.renderT);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = doc.visibilityState === 'hidden';
    core.setVisible(!hidden);
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => core.catchUp(epochNow()), 1000);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      core.catchUp(epochNow());
    }
  };
  doc.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => core.resize(size()));
  ro.observe(wrap);

  const host: HostTarget = {
    dispatch: (c) => core.command(c),
    snapshot: () => core.engine.snapshot(),
    restore: (s) => {
      core.engine.restore(s);
      core.clock.setTick(s.tick);
    },
    on: (fn) => core.engine.on(fn),
    now: () => core.engine.now(),
    time: (action, value) => {
      if (action === 'pause') core.clock.pause();
      if (action === 'resume') core.clock.resume();
      if (action === 'scale' && value !== undefined) core.clock.timeScale = value;
    },
  };
  const viewer: ViewerTarget = {
    restore: host.restore as ViewerTarget['restore'],
    dispatch: (c) => core.command(c),
    on: (fn, types) => core.engine.on(fn, types),
    renderT: () => core.clock.renderT,
    tick: () => core.engine.now().tick,
    setRate: (k) => (core.clock.timeScale = Math.min(4, Math.max(0.25, k))),
    setPaused: (p) => (p ? core.clock.pause() : core.clock.resume()),
    jumpTo: (simT) => {
      core.clock.setTick(Math.floor(simT * 50 + 1e-6));
      core.engine.advanceTo(core.clock.simT);
    },
  };
  return {
    core,
    host,
    viewer,
    onFrame(fn) {
      frameFns.add(fn);
      return () => {
        frameFns.delete(fn);
      };
    },
    async enableSound() {
      if (scheduler) return;
      const out = await unlockAudio();
      scheduler = new ToneScheduler({ audioNow: () => out.ctx.currentTime, perfToAudio: out.perfToAudio, play: (tone, when) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880) });
      scheduler.start();
    },
    destroy() {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      doc.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      scheduler?.stop();
      root.remove();
    },
  };
}
```

`apps/demo/src/stage6a/links.ts`:
```ts
// URL conventions shared by the three Stage 6a pages:
//   ?session=ABC234   the session code (the host makes one when absent)
//   ?via=bc|relay|rtc how a remote/viewer connects (default bc = BroadcastChannel, same browser)
//   ?relay=ws://…     relay URL (default ws://<this host>:8787/); the host joins the relay only when present
import {
  createBroadcastChannelTransport,
  createRelaySignaling,
  createWebRtcTransport,
  createWebSocketTransport,
  HOST_SIGNAL_ID,
  newPeerId,
  type ManagedTransport,
  type Via,
} from '@pme/controller';

export const params = new URLSearchParams(location.search);
export const relayUrl = (): string => params.get('relay') ?? `ws://${location.hostname || 'localhost'}:8787/`;
export const viaParam = (): Via => ({ relay: 'websocket', rtc: 'webrtc' })[params.get('via') ?? ''] as Via ?? 'broadcastChannel';
export const viaToParam: Record<Via, string> = { broadcastChannel: 'bc', websocket: 'relay', webrtc: 'rtc' };

export function connect(session: string, via: Via): ManagedTransport {
  if (via === 'websocket') return createWebSocketTransport({ url: relayUrl() });
  if (via === 'webrtc') {
    const signaling = createRelaySignaling({ url: relayUrl(), session, peerId: newPeerId('rtc') });
    return createWebRtcTransport({ signaling, remoteId: HOST_SIGNAL_ID, initiator: true });
  }
  return createBroadcastChannelTransport(session);
}

export const epochNow = (): number => performance.timeOrigin + performance.now();
```

- [ ] **Step 3: Write the host page**

`apps/demo/stage6a.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 6a: host monitor + hidden instructor panel</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 0; }
      #monitor { height: min(70vh, 480px); }
      .bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; padding: 10px 12px; border-top: 1px solid #222; }
      .code { font: 700 28px ui-monospace, monospace; letter-spacing: .12em; color: #fff; }
      button { font: inherit; min-height: 36px; }
      #diag { font: 12px ui-monospace, monospace; color: #8f8; white-space: pre; padding: 0 12px; }
      .hint { color: #777; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="bar">
      <span>Session <span class="code" id="code">------</span></span>
      <button id="openRemote">Open remote</button>
      <button id="openViewer">Open viewer</button>
      <button id="sound">Enable sound</button>
      <span id="links"></span>
      <span class="hint">Press <kbd>i</kbd> (or tap the top-left corner 5×, or hold three fingers) for the instructor panel.</span>
    </div>
    <div id="diag"></div>
    <script type="module" src="./src/stage6a/host.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage6a/host.ts`:
```ts
// Stage 6a host page: the monitor that owns the simulation, the hidden panel (in-process), and the same
// session offered over BroadcastChannel (always) and over the relay + WebRTC (when ?relay= is given).
import {
  acceptWebRtcPeers,
  ControllerSession,
  createBroadcastChannelTransport,
  createInProcessHub,
  createRelaySignaling,
  createWebSocketTransport,
  HOST_SIGNAL_ID,
  HostSession,
  mountInstructorPanel,
  newSessionCode,
  normalizeSessionCode,
  vocabularyOf,
} from '@pme/controller';
import { mountSimMonitor } from './sim-monitor.ts';
import { epochNow, params, relayUrl } from './links.ts';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const session = normalizeSessionCode(params.get('session') ?? '') ?? newSessionCode();
if (params.get('session') !== session) history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), session })}`);
$('code').textContent = session;

const mon = mountSimMonitor($('monitor'), { engine: { seed: 7 }, lanes: ['ecgII', 'V5'] });

// Latency instrumentation (docs/gates/stage-6a.md): receive → dispatch tick → first frame drawing past it.
type Timing = { commandId: string; from: string; receivedAt: number; tick: number; visibleAt: number | null };
const timings: Timing[] = [];
const waiting: Timing[] = [];
mon.onFrame((epoch, renderT) => {
  for (let i = waiting.length - 1; i >= 0; i--) {
    const w = waiting[i] as Timing;
    if (renderT >= w.tick * 0.02) {
      w.visibleAt = epoch;
      waiting.splice(i, 1);
    }
  }
});

const hs = new HostSession({
  session,
  target: mon.host,
  onCommand: (i) => {
    if (!i.accepted) return;
    const t: Timing = { ...i, visibleAt: null };
    timings.push(t);
    waiting.push(t);
  },
});
const hub = createInProcessHub();
hs.addTransport(hub.connect());
hs.addTransport(createBroadcastChannelTransport(session));
const linkNotes: string[] = ['BroadcastChannel'];
if (params.has('relay')) {
  hs.addTransport(createWebSocketTransport({ url: relayUrl() }));
  acceptWebRtcPeers({
    signaling: createRelaySignaling({ url: relayUrl(), session, peerId: HOST_SIGNAL_ID }),
    onTransport: (t) => hs.addTransport(t),
  });
  linkNotes.push(`relay ${relayUrl()}`, 'WebRTC');
}
$('links').textContent = `Links: ${linkNotes.join(' · ')}`;

const panelSession = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'panel' });
const panel = mountInstructorPanel(document.body, {
  session: panelSession,
  vocabulary: vocabularyOf(mon.core.engine),
  sound: { enable: () => mon.enableSound() },
});

const relayQ = params.has('relay') ? `&relay=${encodeURIComponent(relayUrl())}` : '';
const via = params.has('relay') ? 'relay' : 'bc';
$('openRemote').addEventListener('click', () => window.open(`./stage6a-remote.html?session=${session}&via=${via}${relayQ}`, 'pme-remote', 'width=480,height=900'));
$('openViewer').addEventListener('click', () => window.open(`./stage6a-viewer.html?session=${session}&via=${via}${relayQ}`, 'pme-viewer', 'width=1100,height=520'));
$('sound').addEventListener('click', () => void mon.enableSound().then(() => ($('sound').textContent = 'Sound on')));

setInterval(() => {
  const s = hs.stats;
  $('diag').textContent = `t ${mon.core.clock.renderT.toFixed(1)} s · applied ${s.applied} · rejected ${s.rejected} · duplicates ${s.duplicates} · snapshots ${s.snapshotsSent} · panel ${panel.isOpen ? 'open' : 'hidden'}`;
}, 500);

// Latency driver for the in-process path (panel → host), same shape as the remote page's fire().
let nPanel = 0;
async function firePanel() {
  const sentAt = epochNow();
  const r = await panelSession.send({ type: 'setTarget', variable: 'hr', value: 70 + (nPanel++ % 2) * 10 });
  return { commandId: r.commandId, sentAt, ackAt: epochNow(), rttMs: r.rttMs, accepted: r.accepted };
}
Object.assign(window, { __pme6a: { role: 'host', session, hs, mon, panel, timings, firePanel, now: epochNow } });
```

- [ ] **Step 4: Typecheck, build, and look at it**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck
npx -y pnpm@9.15.9 --filter @pme/demo build
npx -y pnpm@9.15.9 --filter @pme/demo dev --port 5173 --strictPort & DEV_PID=$!; sleep 3
```
Open `http://localhost:5173/stage6a.html` in Chrome (a visible window — a hidden pane throttles rAF to ~1 fps and the sweep crawls, docs/gates/stage-0.md). Expected: two ECG lanes sweeping, HR tile ≈ 75 within ~5 s, a 6-character session code, and pressing `i` slides the Instructor drawer in from the right; **Set** HR 120 with ramp 20 s → the HR flag turns blue and the tile climbs. (**Open remote** / **Open viewer** 404 until Task 22.) Then `kill $DEV_PID`.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/package.json apps/demo/vite.config.ts apps/demo/stage6a.html apps/demo/src/stage6a pnpm-lock.yaml
git commit -m "feat(demo): stage6a host page — main-thread monitor, hidden panel, session code, BroadcastChannel/relay/WebRTC links" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Demo remote and viewer pages

**Files:**
- Create: `apps/demo/stage6a-remote.html`, `apps/demo/src/stage6a/remote.ts`, `apps/demo/stage6a-viewer.html`, `apps/demo/src/stage6a/viewer.ts`
- Modify: `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:**
- Consumes: `mountRemote`, `vocabularyOf`, `ViewerSync`, `normalizeSessionCode` (Task 20); `mountSimMonitor`, `links.ts` (Task 21).
- Produces: `stage6a-remote.html?session=CODE&via=bc|relay|rtc[&relay=ws://…]` (auto-joins; `window.__pme6a = { role: 'remote', remote, fire }` where `fire()` sends one HR target and returns `{ commandId, sentAt, ackAt, rttMs, accepted }` in epoch ms); `stage6a-viewer.html?session=CODE&via=…` (a second monitor; `window.__pme6a = { role: 'viewer', sync, mon }`; diagnostics line `viewer CODE · link … · synced · lag … ms · beat drift … ms · resyncs …`).

- [ ] **Step 1: Remote page**

`apps/demo/stage6a-remote.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 6a: remote controller</title>
    <style>body { background: #000; margin: 0; }</style>
  </head>
  <body>
    <div id="remote"></div>
    <script type="module" src="./src/stage6a/remote.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Remote module**

`apps/demo/src/stage6a/remote.ts`:
```ts
// Stage 6a remote controller page (phone/tablet). Never renders waveforms.
import { createEngine } from '@pme/engine-core';
import { mountRemote, vocabularyOf, type CommandInput } from '@pme/controller';
import { connect, epochNow, params, viaParam } from './links.ts';

const first = viaParam();
const remote = mountRemote(document.getElementById('remote') as HTMLElement, {
  vocabulary: vocabularyOf(createEngine()), // same build as the host; Stage 5's engine vocabulary() flows through
  vias: [first, ...(['broadcastChannel', 'websocket', 'webrtc'] as const).filter((v) => v !== first)],
  connect,
  ...(params.get('session') ? { session: params.get('session') as string } : {}),
  autoJoin: true,
});

// Latency driver for docs/gates/stage-6a.md: send one command, report send/ack wall times (epoch ms).
let n = 0;
async function fire(): Promise<{ commandId: string; sentAt: number; ackAt: number; rttMs: number; accepted: boolean }> {
  const s = remote.session;
  if (!s) throw new Error('not joined');
  const cmd: CommandInput = { type: 'setTarget', variable: 'hr', value: 70 + (n++ % 2) * 10 };
  const sentAt = epochNow();
  const r = await s.send(cmd);
  return { commandId: r.commandId, sentAt, ackAt: epochNow(), rttMs: r.rttMs, accepted: r.accepted };
}
Object.assign(window, { __pme6a: { role: 'remote', remote, fire } });
```

- [ ] **Step 3: Viewer page**

`apps/demo/stage6a-viewer.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 6a: viewer (second monitor)</title>
    <style>
      body { background: #000; color: #ccc; font: 13px system-ui, sans-serif; margin: 0; }
      #monitor { height: min(80vh, 480px); }
      #diag { font: 12px ui-monospace, monospace; color: #8f8; padding: 6px 12px; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div id="diag">joining…</div>
    <script type="module" src="./src/stage6a/viewer.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Viewer module**

`apps/demo/src/stage6a/viewer.ts`:
```ts
// Stage 6a viewer page: a second monitor (projector) that synthesises its trace locally from the host's
// snapshot + mirrored commands (ViewerSync). No samples ever arrive.
import { normalizeSessionCode, ViewerSync } from '@pme/controller';
import { mountSimMonitor } from './sim-monitor.ts';
import { connect, params, viaParam } from './links.ts';

const diag = document.getElementById('diag') as HTMLElement;
const session = normalizeSessionCode(params.get('session') ?? '');
if (!session) {
  diag.textContent = 'Add ?session=ABC234 to the URL (the code shown on the host monitor).';
  throw new Error('no session');
}
const mon = mountSimMonitor(document.getElementById('monitor') as HTMLElement, { engine: { seed: 1 }, lanes: ['ecgII', 'V5'] });
const transport = connect(session, viaParam());
const sync = new ViewerSync({ session, transport, target: mon.viewer, engineVersion: mon.core.engine.version });
mon.onFrame(() => sync.follow());
setInterval(() => {
  diag.textContent = `viewer ${session} · link ${transport.kind} ${transport.status} · ${sync.status} · lag ${(sync.lagS * 1000).toFixed(0)} ms · beat drift ${sync.beatDriftMs.toFixed(1)} ms · resyncs ${sync.resyncs}`;
}, 500);
Object.assign(window, { __pme6a: { role: 'viewer', sync, mon } });
```

- [ ] **Step 5: Add both pages to the build and the index**

In `apps/demo/vite.config.ts` replace the `input` line with:
```ts
      input: {
        index: page('index'), stage0: page('stage0'), stage1: page('stage1'),
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
      },
```
In `apps/demo/index.html` add after the Stage 1 list item:
```html
      <li><a href="./stage6a.html">Stage 6a: host monitor + hidden instructor panel</a> ·
        <a href="./stage6a-remote.html">remote controller</a> · <a href="./stage6a-viewer.html">viewer</a></li>
```

- [ ] **Step 6: Typecheck, build, and try all three windows**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo build
npx -y pnpm@9.15.9 --filter @pme/demo dev --port 5173 --strictPort & DEV_PID=$!; sleep 3
```
In Chrome open `http://localhost:5173/stage6a.html`, click **Open remote** and **Open viewer**. Expected: the remote shows `connected · CODE` and an HR number within ~5 s; the viewer's diagnostics read `synced · lag ≈100 ms · beat drift 0.0 ms · resyncs 0`; choosing a rhythm on the remote and pressing **Apply** changes both monitors, the viewer ≈ 0.1 s later. `kill $DEV_PID`.

- [ ] **Step 7: Commit**

```bash
git add apps/demo/stage6a-remote.html apps/demo/stage6a-viewer.html apps/demo/src/stage6a/remote.ts apps/demo/src/stage6a/viewer.ts apps/demo/vite.config.ts apps/demo/index.html
git commit -m "feat(demo): stage6a remote controller and viewer (second monitor) pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Browser smoke over BroadcastChannel, relay and WebRTC

**Files:**
- Create: `apps/demo/e2e/stage6a.e2e.ts`

**Interfaces:**
- Consumes: the three pages (21–22), `startRelay` (8), Vite's `createServer`.
- Produces: a Playwright test that starts its own relay and Vite dev server on free ports and, for each link (`bc`, `relay`, `rtc`), opens host + remote + viewer in one browser context, sends 20 commands from the remote (all accepted), and checks the viewer is `synced` with beat drift 0 and every command reached a visible frame on the host.

- [ ] **Step 1: Write the test**

`apps/demo/e2e/stage6a.e2e.ts`:
```ts
// Stage 6a browser checks: host + remote + viewer over BroadcastChannel, the relay (WebSocket) and WebRTC,
// in one browser context. Starts its own Vite dev server and relay on free ports.
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';

// Headless Chrome cannot resolve the mDNS (.local) host candidates it hands out, so WebRTC on localhost needs
// real IPs. Headed browsers on a LAN resolve mDNS normally.
test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

let vite: ViteDevServer;
let relay: RelayHandle;
let base = '';
let relayUrl = '';

test.beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  relayUrl = `ws://127.0.0.1:${relay.port}/`;
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => {
  await vite?.close();
  await relay?.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
/** Evaluate `fn(window)` in the page once the page has published window.__pme6a. */
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}

async function trio(page: Page, via: 'bc' | 'relay' | 'rtc') {
  const ctx = page.context();
  const relayQ = via === 'bc' ? '' : `&relay=${encodeURIComponent(relayUrl)}`;
  await page.goto(`${base}/stage6a.html?session=E2E${via === 'bc' ? 'BCC' : via === 'relay' ? 'WSS' : 'RTC'}${relayQ}`);
  const session = await g(page, (w) => w.__pme6a.session as string);
  const remote = await ctx.newPage();
  await remote.goto(`${base}/stage6a-remote.html?session=${session}&via=${via}${relayQ}`);
  const viewer = await ctx.newPage();
  await viewer.goto(`${base}/stage6a-viewer.html?session=${session}&via=${via}${relayQ}`);
  await expect.poll(() => g(remote, (w) => w.__pme6a.remote.session?.hostOnline === true), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => g(viewer, (w) => w.__pme6a.sync.status as string), { timeout: 10_000 }).toBe('synced');
  return { remote, viewer, session };
}

for (const via of ['bc', 'relay', 'rtc'] as const) {
  test(`host + remote + viewer over ${via}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const { remote, viewer } = await trio(page, via);
    for (let i = 0; i < 20; i++) {
      const r = await g(remote, (w) => w.__pme6a.fire());
      expect((r as { accepted: boolean }).accepted).toBe(true);
    }
    await page.waitForTimeout(3000);
    const v = await g(viewer, (w) => ({ status: w.__pme6a.sync.status, resyncs: w.__pme6a.sync.resyncs, lag: w.__pme6a.sync.lagS, drift: w.__pme6a.sync.beatDriftMs }));
    expect(v.status).toBe('synced');
    expect(v.drift).toBe(0);
    const timings = await g(page, (w) => w.__pme6a.timings as Array<{ visibleAt: number | null }>);
    expect(timings.filter((t) => t.visibleAt !== null).length).toBe(20);
    console.log(via, JSON.stringify(v));
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 2: Run it**

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage6a.e2e.ts`
Expected: `3 passed` (≈ 12 s), each printing e.g. `relay {"status":"synced","resyncs":0,"lag":0.09,"drift":0}`. If `rtc` alone times out at "hostOnline", the `--disable-features=WebRtcHideLocalIpsWithMdns` launch flag is missing (headless Chrome cannot resolve its own `.local` candidates).

- [ ] **Step 3: Confirm the demo package's Vitest run ignores e2e files** — `npx -y pnpm@9.15.9 --filter @pme/demo test` → `No test files found, exiting with code 0` (`*.e2e.ts` does not match Vitest's pattern).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/e2e/stage6a.e2e.ts
git commit -m "test(demo): host + remote + viewer browser smoke over BroadcastChannel, relay and WebRTC" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: Latency measurement against the 70–140 ms budget

**Files:**
- Create: `apps/demo/e2e/stage6a-latency.e2e.ts`, `docs/gates/stage-6a/latency.json` (generated)

**Interfaces:**
- Consumes: `__pme6a.firePanel()` (host), `__pme6a.fire()` (remote), `__pme6a.timings` (host) — Tasks 21–22.
- Produces: `docs/gates/stage-6a/latency.json` = `{ n, measuredAt, results: { 'in-process' | 'bc' | 'relay' | 'rtc': { ack: {n,min,p50,p95,max}, visible: {…} } } }` and a printed table; the test fails if in-process visible p95 > 60 ms or relay visible p95 > 150 ms (BUILD-PLAN Stage 6 acceptance 1; localhost stands in for the LAN here — Task 25 records the LAN run separately).

- [ ] **Step 1: Write the measurement**

`apps/demo/e2e/stage6a-latency.e2e.ts`:
```ts
// Stage 6a latency measurement (docs/gates/stage-6a.md; BUILD-PLAN Stage 6 acceptance 1; research 05 §3.2
// budget 70–140 ms). For each path: N commands, 100 ms apart, from the panel (in-process), a remote over
// BroadcastChannel, over the relay (WebSocket) and over WebRTC — all on this machine (localhost).
//   ack      = remote send → ack back at the remote
//   visible  = remote send → first host animation frame whose drawn sim time reaches the command's tick
// Run: PW_SYSTEM_CHROME=1 LAT_N=200 pnpm exec playwright test apps/demo/e2e/stage6a-latency.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });
test.setTimeout(600_000);

const N = Number(process.env.LAT_N ?? 200);
let vite: ViteDevServer;
let relay: RelayHandle;
let base = '';
let relayUrl = '';

test.beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  relayUrl = `ws://127.0.0.1:${relay.port}/`;
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => {
  await vite?.close();
  await relay?.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}
type Fired = { commandId: string; sentAt: number; ackAt: number; accepted: boolean };
const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))] as number;
const stats = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return { n: a.length, min: a[0] as number, p50: pct(a, 0.5), p95: pct(a, 0.95), max: a[a.length - 1] as number };
};

test('command → ack → visible latency on four paths', async ({ page }) => {
  const results: Record<string, { ack: ReturnType<typeof stats>; visible: ReturnType<typeof stats> }> = {};
  for (const path of ['in-process', 'bc', 'relay', 'rtc'] as const) {
    const relayQ = path === 'relay' || path === 'rtc' ? `&relay=${encodeURIComponent(relayUrl)}` : '';
    const session = { 'in-process': 'QATAAA', bc: 'QATBBB', relay: 'QATCCC', rtc: 'QATDDD' }[path];
    await page.goto(`${base}/stage6a.html?session=${session}${relayQ}`);
    let sender = page;
    let fire = (w: W) => w.__pme6a.firePanel();
    if (path !== 'in-process') {
      sender = await page.context().newPage();
      await sender.goto(`${base}/stage6a-remote.html?session=${session}&via=${path}${relayQ}`);
      await expect.poll(() => g(sender, (w) => w.__pme6a.remote.session?.hostOnline === true), { timeout: 15_000 }).toBe(true);
      fire = (w: W) => w.__pme6a.fire();
    }
    await page.waitForTimeout(1000);
    const fired: Fired[] = [];
    for (let i = 0; i < N; i++) {
      fired.push(await g(sender, fire));
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(500);
    const timings = await g(page, (w) => w.__pme6a.timings as Array<{ commandId: string; visibleAt: number | null }>);
    const byId = new Map(timings.map((t) => [t.commandId, t.visibleAt]));
    expect(fired.every((f) => f.accepted)).toBe(true);
    results[path] = {
      ack: stats(fired.map((f) => f.ackAt - f.sentAt)),
      visible: stats(fired.map((f) => (byId.get(f.commandId) ?? Number.NaN) - f.sentAt)),
    };
    if (sender !== page) await sender.close();
  }
  const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'latency.json'), `${JSON.stringify({ n: N, measuredAt: new Date().toISOString(), results }, null, 2)}\n`);
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k.padEnd(10)} ack p50 ${v.ack.p50.toFixed(1)} p95 ${v.ack.p95.toFixed(1)} | visible p50 ${v.visible.p50.toFixed(1)} p95 ${v.visible.p95.toFixed(1)} max ${v.visible.max.toFixed(1)} ms`);
  }
  expect(results['in-process']!.visible.p95).toBeLessThanOrEqual(60); // BUILD-PLAN Stage 6 acceptance 1
  expect(results.relay!.visible.p95).toBeLessThanOrEqual(150);
});
```

- [ ] **Step 2: Trial run with 30 samples**

Run: `PW_SYSTEM_CHROME=1 LAT_N=30 npx playwright test apps/demo/e2e/stage6a-latency.e2e.ts`
Expected: `1 passed` and four lines like (prototype, localhost, headless Chrome):
```
in-process ack p50 0.6 p95 1.2 | visible p50 8.9 p95 29.2 max 32.2 ms
bc         ack p50 2.6 p95 6.6 | visible p50 13.4 p95 27.2 max 32.9 ms
relay      ack p50 1.2 p95 4.8 | visible p50 11.7 p95 33.0 max 34.0 ms
rtc        ack p50 0.8 p95 2.2 | visible p50 11.1 p95 26.2 max 30.5 ms
```
Visible ≈ wait for the next 20 ms tick + the next frame; the look-ahead does not add delay because a command invalidates and regenerates it (brief §3.3).

- [ ] **Step 3: The recorded run (200 samples per path, BUILD-PLAN acceptance 1)**

Run: `PW_SYSTEM_CHROME=1 LAT_N=200 npx playwright test apps/demo/e2e/stage6a-latency.e2e.ts` (≈ 2 min). Keep the printed table for the gate note; `docs/gates/stage-6a/latency.json` is rewritten.

- [ ] **Step 4: Commit**

```bash
git add apps/demo/e2e/stage6a-latency.e2e.ts docs/gates/stage-6a/latency.json
git commit -m "test(demo): command→ack→visible latency on in-process, BroadcastChannel, relay and WebRTC (200 samples each)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: Gate 6a — screenshots, clean-clone rehearsal, LAN/iPad checks, gate note

**Files:**
- Create: `apps/demo/e2e/stage6a-screens.e2e.ts`, `docs/gates/stage-6a/{host-panel,remote,viewer}.png` (generated), `docs/gates/stage-6a.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the gate evidence the orchestrator inspects (R11).

- [ ] **Step 1: Screenshot script**

`apps/demo/e2e/stage6a-screens.e2e.ts`:
```ts
// Gate 6a screenshots: host with the panel open, the remote (phone size) and the viewer, over BroadcastChannel.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/stage6a-screens.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}

test('panel, remote and viewer screenshots', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/stage6a.html?session=GATE6A`);
  const remote = await page.context().newPage();
  await remote.setViewportSize({ width: 390, height: 844 });
  await remote.goto(`${base}/stage6a-remote.html?session=GATE6A&via=bc`);
  const viewer = await page.context().newPage();
  await viewer.setViewportSize({ width: 1100, height: 520 });
  await viewer.goto(`${base}/stage6a-viewer.html?session=GATE6A&via=bc`);
  await expect.poll(() => g(viewer, (w) => w.__pme6a.sync.status as string), { timeout: 10_000 }).toBe('synced');
  await remote.locator('select[name=rhythm]').selectOption('avb2Mobitz1');
  await remote.locator('[data-action=rhythm]').click();
  await remote.locator('input[name=hr-value]').fill('95');
  await remote.locator('input[name=hr-ramp]').fill('30');
  await remote.locator('[data-var=hr] [data-action=set]').click();
  await page.waitForTimeout(12_000); // two sweeps + HR tile
  await page.keyboard.press('i');
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(out, 'host-panel.png') });
  await remote.screenshot({ path: resolve(out, 'remote.png'), fullPage: true });
  await viewer.screenshot({ path: resolve(out, 'viewer.png') });
  expect(await g(viewer, (w) => w.__pme6a.sync.beatDriftMs as number)).toBe(0);
});
```

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage6a-screens.e2e.ts`
Expected: `1 passed`; three PNGs in `docs/gates/stage-6a/`. Open them: `host-panel.png` shows the drawer (Controls tab, HR row with a blue ▲ flag and "95 / 95 / … bpm"), `remote.png` a phone-width page with `connected · GATE6A`, the controls and the log, `viewer.png` a monitor showing Mobitz I with the diagnostics line `synced · lag 100 ms · beat drift 0.0 ms · resyncs 0`.

- [ ] **Step 2: Clean-clone CI rehearsal**

```bash
S=/private/tmp/pme-6a-ci; rm -rf $S && git clone "$(pwd)" $S && cd $S && git checkout stage-6a-controllers \
  && npx -y pnpm@9.15.9 install --frozen-lockfile && npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test \
  && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices; echo "exit $?"; cd -
```
Expected: `exit 0`. Record per-package test totals (controller 97 in 20 files; the other packages unchanged from Stage 1).

- [ ] **Step 3: LAN run with the relay (laptop + a second device)**

```bash
npx -y pnpm@9.15.9 relay & RELAY_PID=$!
npx -y pnpm@9.15.9 --filter @pme/demo dev --host --port 5173 --strictPort & DEV_PID=$!
ipconfig getifaddr en0   # the laptop's LAN address, e.g. 192.168.1.20
```
On the laptop open `http://<ip>:5173/stage6a.html?relay=ws://<ip>:8787/`. On a phone or the iPad open `http://<ip>:5173/stage6a-remote.html`, type the session code, choose **Relay (WebSocket)**, **Join**. Check and record: commands apply; turning Wi-Fi off on the phone shows `disconnected — retrying` while the laptop monitor keeps running; turning it back on reconnects and a command queued meanwhile is applied exactly once (host diagnostics `applied` rises by 1, `duplicates` may rise). Repeat with **Direct (WebRTC)**. Then open the viewer on the iPad (`/stage6a-viewer.html?session=CODE&via=relay&relay=ws://<ip>:8787/`) and record `lag` and `beat drift`. `kill $RELAY_PID $DEV_PID`. If no second device is at hand, write "pending Ali" in the note.

- [ ] **Step 4: iPad as the host (panel by touch)** — open `stage6a.html` on the iPad; the drawer must open with a 5-tap in the top-left corner and with a three-finger long-press, the controls must be usable by touch, and sound must play after **Sound on** in the drawer. Record, or "pending Ali".

- [ ] **Step 5: Write `docs/gates/stage-6a.md`**

```markdown
# Gate 6a — Controllers and transports (date: YYYY-MM-DD)

Gate question (BUILD-PLAN Stage 6, first half): "Can Ali drive the monitor from a phone or laptop without touching it, see a second monitor follow it, and recover cleanly from a Wi-Fi drop?" (The 10-minute ACLS scenario is Stage 6b.)

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | |
| Transport conformance (5 transports × 6 checks, + WebRTC reconnect) | |
| Sample guard: type-level (`types.test-d.ts`) and runtime (every transport refuses a Float32Array) | |
| Relay: authority, ack routing, snapshot cache, host-exists, expiry/heartbeat (7 tests) | |
| Acceptance 2 — late join: viewer sample-identical, beat drift, lag | |
| Acceptance 3 — relay drop: applied exactly once; controller shows disconnected | |
| Stage then commit: one tick | |
| Latency (200 samples, localhost): ack / visible p50–p95 per path vs 70–140 ms budget; acceptance 1 (in-process ≤ 60, relay ≤ 150 p95) | |
| LAN relay + WebRTC from a phone/iPad; Wi-Fi drop | |
| iPad host: panel reveal by touch, sound | |
| Screenshots | `stage-6a/host-panel.png`, `stage-6a/remote.png`, `stage-6a/viewer.png` |

Latency definition: *visible* = sender send() → first host animation frame whose drawn sim time reaches the command's tick; compositor/display time (≤ 1 frame) is not included.

Requests for the orchestrator: E1 (engine `state` at 1 Hz), E2 (`vocabulary()` shape), E3 (`commandApplied.resolved.command`), R-1 (MonitorHandle snapshot/restore/role for the worker path), R-2 (IIFE `PatientMonitor.transports`). See the plan header.

Deviations from the plan:

Not checked here:
```
Fill every row with measured values (copy the latency table from Task 24 Step 3).

- [ ] **Step 6: Commit**

```bash
git add apps/demo/e2e/stage6a-screens.e2e.ts docs/gates/stage-6a.md docs/gates/stage-6a
git commit -m "docs(gates): stage 6a gate evidence — latency, screenshots, clean clone, LAN checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Push the branch and open the pull request (do not merge)

**Files:** none.

**Interfaces:**
- Consumes: the finished branch.
- Produces: a PR against `main` (R20); Ali speaks the merge.

- [ ] **Step 1: Rebase check** — `git fetch origin && git log --oneline origin/main -5`. If `main` moved, `git rebase origin/main`, resolve conflicts only in files this stage owns (likely `pnpm-lock.yaml`: re-run `npx -y pnpm@9.15.9 install` and take its result; `NOTICES.md`: renumber this stage's rows after the last ID on `main`), then re-run `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test`.

- [ ] **Step 2: Push**

```bash
git push -u origin stage-6a-controllers
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --head stage-6a-controllers --title "Stage 6a: controllers and transports (panel, remote, relay, viewer)" --body "$(cat <<'BODY'
## Summary
- `@pme/controller`: WireMessage v1 (brief §7.5) with session codes, per-sender duplicate filtering and a runtime + type-level guarantee that samples never cross the wire.
- Five transports behind one `Transport` interface, one shared conformance suite: in-process, postMessage, BroadcastChannel, WebSocket (relay), WebRTC DataChannel (relay signalling).
- `pme-relay` (Node, `ws`): rooms by session code, host authority, ack routing, snapshot cache for late joiners, heartbeat, room expiry, WebRTC signalling. `pnpm relay` / `npx pme-relay`.
- Roles: HostSession (dispatch/ack with de-dup, per-frame event batches, 1 Hz state, snapshots, stage groups, bookmarks, Stage 6b scenario hook), ControllerSession (resend until acked), ViewerSync (snapshot + exact command mirroring; sample-identical second monitor).
- Hidden same-screen panel (i / Ctrl+Shift+I / 5-tap corner / three-finger hold) and a remote controller, both generated from a `pme-vocabulary/1` vocabulary.
- Demo: `stage6a.html` (host), `stage6a-remote.html`, `stage6a-viewer.html`; browser smoke, latency and screenshot scripts.

## Gate evidence
See `docs/gates/stage-6a.md` (latency table, screenshots, clean-clone totals, LAN checks).

## Not in this PR
Stage 6b: scenario runner, command log/replay, ACLS demo. No changes to `packages/engine-core` or `packages/renderer`; requests E1–E3 and R-1–R-2 are listed in the plan header for the orchestrator.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```
Expected: a PR URL. Do not merge. Stop here; Stage 6b starts after the orchestrator's gate review.

---

## Acceptance and scope index

| Requirement (source) | Where |
|---|---|
| WireMessage v1 exactly, roles, hello/ack/event/snapshot flows (brief §7.5) | Task 2; flows in Tasks 12–14 |
| Session codes, unambiguous alphabet | Task 2 |
| seq numbering; duplicate/out-of-order handling | Task 2 (`SeqFilter`), Tasks 12–14 (use), decision 5 |
| Clock anchors | Task 14 (`state` anchors, blended), Task 21 (renderer anchors for audio) |
| Events batched per frame | Task 12 ("batches the events of one frame into one message") |
| Samples can't be sent — type level + runtime guard test | Task 2 (`types.test-d.ts`), Task 3, Task 4 conformance (all five transports) |
| Five transports, status events, reconnect/backoff, shared conformance suite | Tasks 4–10 |
| Relay: rooms, host authority, commands→host, acks back, snapshot cache, heartbeat, expiry, README with npx, Vitest on a random port | Tasks 8–9 |
| Hidden panel: reveal, drawer, every Stage 1 command, vocabulary-generated controls, ramps with duration/curve, pin/release as CAE flags, stage-then-commit with stageGroup, event log with markers, bookmarks, iPad touch | Tasks 16–18, 21; iPad check Task 25 |
| Remote: join by code over BroadcastChannel or relay (and WebRTC), generated controls, 1 Hz readout, no waveforms | Tasks 19, 22 |
| Viewer: second monitor from snapshot + events via a local engine | Tasks 14, 22; decision 1 |
| Scenario hooks for Stage 6b (`scenario` command load/goto/trigger) | Task 12 `ScenarioHook`, decision 9 |
| Latency: command → ack → visible, BroadcastChannel and relay, vs 70–140 ms | Task 24, gate Task 25 |
| BUILD-PLAN Stage 6 acceptance 1 (latency), 2 (late join), 3 (robustness) | Tasks 24; 14–15; 12, 13, 15 |
| Demo `stage6a.html` with open remote / open viewer / session code; gate note with screenshots | Tasks 21, 25 |
| Branch + PR workflow (R20) | Tasks 1, 26 |

## Self-review notes (done while writing)

- **Spec coverage:** every scope item in the request and the BUILD-PLAN Stage 6 lines that belong to 6a maps to a task above. Stage 6 acceptance 4 (replay), 5 (scenario semantics) and 6 (schema) are Stage 6b.
- **Placeholders:** none.
- **Type consistency:** names used across tasks — `ManagedTransport`, `WireBody`, `CommandInput`, `AppliedResolution`, `HostTarget`, `ViewerTarget`, `STAGE_LEAD_TICKS`, `HOST_SIGNAL_ID`, `RELAY_CLOSE`, `WIRE_LIMITS`, `Via`, `SimMonitor.host/viewer/onFrame` — are defined once in the Interfaces block of the task that creates them and were compiled together (`tsc` clean) in the prototype.
