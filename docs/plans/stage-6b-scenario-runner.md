# Stage 6b: Scenario Timeline Runner + ACLS Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run `pme-scenario/1` timelines (brief §7.4) on the host: a JSON Schema validated with ajv, a pure tick-driven state machine with every trigger type (afterS, atScenarioS, vital…forS, event with filters, sensor, manual, all/any, probability with else on the seeded `scenario` stream), onEnter/onExit command batches applied as one stage group, bookmarks that hold the engine snapshot AND the runner state, a replay log, a Scenario tab in the instructor panel, manual-trigger buttons on the remote, five built-in [draft] scenarios, and a `stage6b-acls.html` demo with a learner action bar.

**Architecture:** Everything lives in `@pme/controller`. `src/scenario/runner.ts` is a pure state machine (no engine, clock or DOM): `advance(simT, inputs) → effects` (command batches + `scenario` events), with all timers kept as sim-time accumulators so the result does not depend on how often it is called. `src/scenario/driver.ts` is the host-side glue: it wraps the `HostTarget` so every accepted command also becomes a runner input (and `applyEvent`/`attachSensor`, which the engine does not model yet, are accepted as scenario-only), feeds engine `measurement` events (and Stage 2's `state` when it exists) to the vital triggers, handles every `scenario` command through `HostSession`'s existing `scenario` hook, and dispatches runner batches through a new `HostSession.submit()` so viewers mirror them like any other command. Controllers rebuild the scenario from the wire alone (`ScenarioView`: the doc from the sticky `scenario load` commandApplied, the state from `scenario` events). ajv and the built-in JSON are reachable only through a second entry, `@pme/controller/scenario`, so the root entry and the renderer's IIFE never bundle them. `packages/engine-core`, `renderer`, `audio` and `skins` are not modified.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2 (Node + happy-dom 20.14.5), Vite 6.4, ajv 8.20.0 (MIT; new runtime dependency), Playwright 1.63 against system Chrome. Node ≥ 22.12.

**Spec:** `docs/DESIGN-BRIEF.md` §7.2 (`scenario`, `applyEvent`, `attachSensor` commands; `ClinicalEvent`), §7.3 (`scenario` event), §7.4 (the timeline JSON and trigger list), §4.9 (ramps; stageGroup "stage then commit"), §3.3 (sfc32 streams incl. `scenario`; replay log), §6.5 (defib/pacer numbers the scenarios use); `docs/BUILD-PLAN.md` "Stage 6" (this plan is **6b**: scenario runner, command log/replay, ACLS demo; acceptance 4–6 and the gate question) and "Monorepo layout" (runtime deps: uPlot and ajv); `../research/00-orchestrator-rulings.md` R7, R10, R20/R21, R25; `../research/01-commercial-simulators.md` §2.3 and §5 (CAE states + transitions, Laerdal phases/handlers, REALITi steps); `../research/05-rendering-ux-integration.md` §4.2 (scenario DSL sketch); `docs/plans/stage-6a-controllers.md` and `docs/gates/stage-6a.md` (house style, HostSession, environment lessons).

## Global Constraints

- **Worktree.** Task 1 creates `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6b` on branch `stage-6b-scenario-runner` from `origin/main` (R25: every executor works in its own worktree outside `repo/`). All paths below are relative to that worktree; run every command there. Never work in `projects/patient-monitor-engine/repo/` itself.
- **Base.** This plan was prototyped against `origin/main` at `8e46032` (Stage 6a merged on top of Stage 1.1). If `main` has moved when you start, check `git diff 8e46032 origin/main --stat -- packages/controller apps/demo NOTICES.md`: a "replace …" anchor below may then differ; apply the plan's intent to the new text and record it under "Deviations" in the gate note.
- **pnpm is not on PATH on this Mac.** Every `pnpm` command is written `npx -y pnpm@9.15.9 …`. Browser checks use the installed Google Chrome: `PW_SYSTEM_CHROME=1 npx playwright test <file>`.
- **Partition (binding; Stages 2 and 5 run concurrently on other branches).** This stage OWNS `packages/controller/src/scenario/**`, `packages/controller/src/panel/scenario-*.ts`, `packages/controller/scenarios/**`, `packages/controller/test/scenario/**`, `apps/demo/stage6b-acls.html`, `apps/demo/src/stage6b/**`, `apps/demo/e2e/stage6b.e2e.ts`, `docs/gates/stage-6b*`, `docs/plans/stage-6b-scenario-runner.md`, `LICENSES/fast-uri-3.1.8.txt`. It makes small, additive edits to Stage 6a files that no concurrent stage touches: `packages/controller/src/{protocol,index}.ts`, `src/session/{host-session,controller-session,viewer-sync}.ts`, `src/panel/{panel,styles}.ts`, `src/remote/remote-app.ts`, `packages/controller/{package.json,vite.config.ts}`, and one line each in `apps/demo/vite.config.ts` and `apps/demo/index.html` (Stage 5 also adds one line to each: expect a trivial merge conflict, keep both lines). It appends rows to `NOTICES.md` and changes `pnpm-lock.yaml`. **It does not touch** `packages/engine-core/**`, `packages/renderer/**`, `packages/audio/**`, `packages/skins/**` or any l2/l3 file. If a task seems to need an engine change, stop and report it.
- **Engine surface on `main` today** (what the scenarios may use): `setTarget` for `hr` only; `setRhythm` with the 12 Stage 1 rhythms (`sinus sinusBrady sinusTachy afib aflutter svtAvnrt avb1 avb2Mobitz1 avb3Narrow avb3Wide vtMono asystole`); `setModifiers` (`pvc`, `rsa`, `hrvScale`, `qtc`, `artefact.noise`); `device ecg filter|lead`. Everything else (`applyEvent`, `attachSensor`, `device nibp`, other `setTarget` variables) is rejected with "… not implemented …". The scenarios therefore (a) name Stage 5 rhythm ids that the driver replaces with stand-ins at run time until the engine has them (see Decision 9), and (b) keep every blood-pressure step as the exact command text inside `$comment`, to be moved into `onEnter` when Stage 2 lands.
- **Strict TS as in Stages 0–6a:** `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (no enums, parameter properties or namespaces), `verbatimModuleSyntax` (`import type` for types), `.ts` extensions in relative imports. No framework: plain TypeScript + DOM.
- **Runtime dependency:** `ajv` 8.20.0 (MIT) in `@pme/controller`, imported ONLY by `src/scenario/validate.ts`, reachable ONLY through the `@pme/controller/scenario` entry. Its bundled dependencies get NOTICES rows too (fast-uri is BSD-3-Clause: its licence text goes to `LICENSES/`). NOTICE IDs: **N-010, N-011, N-012** (next free after N-009; Stage 5 uses N-050–N-059). If `main` already has N-010+ when you open the PR, renumber to the next free IDs.
- **Clinical content** in `packages/controller/scenarios/*.json` is [draft]: every title starts with `[draft]`, every file has a `$comment` saying it awaits Ali's review, and every probability or timing without a source is marked `[ENG]` in that comment. Do not "improve" the clinical content; Ali reviews it at the gate.
- **Commits:** conventional commits, one per task, ending with the attribution trailer your session's instructions give (Stage 6a used `Co-Authored-By: …`). Never push to `main`; the last task opens a PR and does not merge (R20/R21: the orchestrator merges after inspecting the gate).
- Every engineering constant carries `[ENG]` or a brief/research citation.
- **Test timing.** The driver tests step a real engine tick by tick for 1–10 sim-minutes; each takes 0.2–3 s and they carry a 30 s timeout (`SLOW`). The whole controller suite takes ≈ 15 s.

## Decisions this plan makes where the spec was silent or ambiguous

1. **Where the runner runs.** On the host, next to the engine (brief §3.7: one device owns the simulation). `scenario` commands from any controller reach it through `HostSession`'s `scenario` hook (Stage 6a left the seam). With a hook present, **all** scenario actions — including `bookmark`/`restoreBookmark` — go to the hook, because a bookmark must hold the runner state too; without one, 6a's engine-only bookmarks keep working unchanged.
2. **Tick-driven and poll-rate independent.** `advance(simT, inputs)` credits the time since the last call to `stateT` (afterS), `scenarioT` (atScenarioS) and one "continuously true for" counter per vital leaf (forS), using the values held *before* this call's inputs; then applies the inputs; then tries the current state's transitions. Values only change at inputs, so calling it every tick, every frame or only when something happens gives the same fire times (tested). Pause stops all three clocks and the evaluation; inputs still latch.
3. **Transition semantics** (CAE/Laerdal-style): transitions are tried in document order (= priority); the first whose condition holds fires; **at most one per call** (a zero-time chain advances one state per tick, so it can never loop). `event` triggers **latch** from state entry until the transition that uses them fires (so `all[drug epinephrine, vital etco2 ≥ 20 for 30 s]` works across ticks); events that arrived before the state was entered do not count. `vital` and `sensor` are levels. `manual` is a latched button press, cleared on state change.
4. **probability/else:** one uniform draw on the runner's `scenario` stream (`seedStream(seed, 'scenario')`, the same derivation as the engine's own streams, brief §3.3) when the condition holds; success → `to`, failure → `else`, or **stay** when `else` is absent. The seed is `doc.seed` (default 1). The engine keeps the host's own seed; for a fully reproducible run the host creates the engine with the same seed (the demo does, `?seed=`).
5. **A transition to the current state stays** (no onExit/onEnter, timers keep running, the matched events are consumed) — this is what the brief's `"else": "vf"` must mean, or every failed shock would restart the 4-minute decay timer. `goto` always re-enters. The `scenario` event of a failed roll carries `transitionId: "<id>:else"`.
6. **`trigger target=<transitionId>`** presses that transition's manual button; the rest of an `all(...)` must still hold, and probability still rolls. A transition **without** a manual leaf is forced instead (the panel labels that button "Force"). Transition ids are unique per document (validated), so a trigger names exactly one.
7. **One stage group per batch.** A state change dispatches `[...patient setup (start only), ...onExit, ...onEnter]` as one batch; the driver stamps every command with `id = scenario-<n>-<i>`, `issuedBy: 'scenario'` and `stageGroup = scenario-<n>` (brief §4.9 "stage then commit"). Through `HostSession` the group lands on one tick 3 ticks ahead (6a's STAGE_LEAD_TICKS); on a bare engine the batch is dispatched synchronously and lands on the next tick. `<n>` is a driver counter that is never restored, so ids and group names stay unique across bookmark restores. Documents may not carry `id`, `issuedBy`, `atTick` or `stageGroup` (schema).
8. **Vital sources until Stage 2 (ruling R25 E1).** Rank 3 = engine `state` event values (truth; Stage 2), rank 2 = `measurement` values (displayed; on `main` today: `hr` at 1 Hz), rank 1 = the value of a `setTarget` the host accepted. A lower rank replaces a variable only when the higher one has been silent for 5 s [ENG]. Measured ids also count as the StateVar they display (`abpSys`/`nibpSys` → `sbp`, `abpDia`/`nibpDia` → `dbp`, `abpMean`/`nibpMean` → `map`, `cvpMean` → `cvp`, `awrr` → `rr`). So on `main` a `vital hr` trigger works (measured HR), and `etco2`/`sbp` triggers become live by themselves when Stage 2 emits `state` — **no engine request**.
9. **Rhythm stand-ins.** Scenarios name the brief §5 ids (`vfCoarse`, `vfFine`, `pacedVVI`, `pWaveAsystole`, `junctionalEscape`). The driver checks the engine's own `RHYTHM_IDS` at run time and, only for an id the engine lacks, sends a declared stand-in (`vfCoarse` → `vtMono` 240/min; `vfFine` → `asystole`; `pacedVVI` → `avb3Wide` 70/min; `pWaveAsystole` → `avb3Narrow` 20/min; `junctionalEscape` → `avb3Narrow` 45/min), merging the document's opts. The substitution happens BEFORE `HostSession`, so viewers mirror the stand-in, never an id their engine would reject. Each substitution is listed in `driver.notes` (shown on the demo page). When Stage 5 merges, the real rhythms appear with no file change.
10. **Clinical events the engine does not model yet.** The learner bar and scenarios send `applyEvent` (and `attachSensor`); when the engine rejects one with "not implemented", the driver's wrapped target accepts it as `scenario only: …` (the reason travels in the ack) so transitions can fire. A genuine validation rejection (a bad value) stays a rejection. When Stages 3/4/7 implement them, the engine's own acceptance takes over.
11. **Doc bookmarks** (`"bookmarks": [...]` in §7.4) are authored jump points `{ id, label?, state }`; choosing one is a `goto`. Instructor bookmarks made at run time (the panel's Bookmarks tab) are engine snapshot + runner state + doc, held by the driver on the host.
12. **Late joiners.** `HostSession` keeps the last `scenario load` (with its full doc) and the last `scenario pause|resume` as sticky commands, and a new `welcomeEvents` option lets the driver add the current `scenario` event after the replays. `ControllerSession` owns a `ScenarioView` fed from every event, so no event is missed however late the panel or remote mounts.
13. **ajv entry split.** `@pme/controller` gets a second export, `./scenario` (`src/scenario/index.ts`: runner, driver, validation, built-ins). The root entry exports only what needs no ajv (`ScenarioView`, `describe*`, the document types, `ScenarioHookResult`). The vite library build gets two entries. Checked: `patient-monitor.iife.js` stays 94.05 kB with 0 matches for `ajv`; `dist/index.js` has 0 matches; `dist/scenario.js` ≈ 224 kB (58 kB gzip).
14. **Scenario commands on the wire.** `protocol.ts` gains brief §7.2's `ClinicalEvent` (verbatim; `drugId` stays a string until Stage 7 defines `DrugId`), `SensorId`, and the `applyEvent` / `attachSensor` command variants in `ExtraCommand`. `HostSession.apply` and `ViewerSync` pass them to the engine with a cast (the engine validates at run time) — the "delete it here when engine-core adds the variant" rule of 6a still applies.
15. **Replay log.** The runner logs every input and control call (`start`, `advance` with its inputs, `goto`, `trigger`, `pause`, `resume`, `restore` with the state) and every decision (`enter`, `roll`); the driver appends `dispatch` results. `replayRunLog(doc, log)` feeds the inputs to a fresh runner and compares the decisions entry for entry. Together with the engine's determinism (brief §3.3) this gives acceptance 4: same seed + same learner commands → identical samples, dispatches and decisions (tested headless).
16. **`time step|jump`** stay rejected ("arrives in Stage 6b" in 6a's text): they are clock controls of the host page, not scenario semantics, and nothing in 6b needs them. The gate note lists this.

## Requests for the orchestrator

None are required. Notes for other stages (recorded in the gate note):
- Stage 2: when the engine emits `state` at 1 Hz, `vital` triggers on truth values (etco2, sbp, spo2 …) start working with no 6b change; the ACLS `epiCpr` transition and the BP `$comment`s are waiting for it.
- Stage 5: the stand-ins vanish automatically when `RHYTHM_IDS` contains `vfCoarse`, `vfFine`, `pacedVVI`, `pWaveAsystole`, `junctionalEscape`. PEA uses `opts.pulseless: true` (Stage 5 contract), which the Stage 1 engine accepts and ignores.
- Stage 4: `applyEvent {kind:'defib'|'pacer'}` and `device nibp` should keep the brief's shapes; the learner bar already sends them.

## File map

| Path | Responsibility |
|---|---|
| `packages/controller/scenarios/pme-scenario-1.schema.json` | The shipped JSON Schema (draft-07) for `pme-scenario/1` |
| `packages/controller/scenarios/{acls-vf-witnessed,acls-pea-hypovolaemia,acls-bradycardia-unstable,svt-adenosine,or-induction-hypotension}.json` | Built-in [draft] scenarios |
| `packages/controller/src/scenario/types.ts` | Document types (mirror the schema) |
| `…/src/scenario/validate.ts` | ajv validation + cross-reference checks, path-level messages |
| `…/src/scenario/runner.ts` | The pure state machine, run log |
| `…/src/scenario/replay.ts` | `runLog`, `replayRunLog` |
| `…/src/scenario/describe.ts` | Human-readable trigger text (no ajv) |
| `…/src/scenario/view.ts` | `ScenarioView`: the controller-side picture from the wire (no ajv) |
| `…/src/scenario/standins.ts` | Rhythm stand-ins until Stage 5 |
| `…/src/scenario/builtins.ts` | Built-in catalogue |
| `…/src/scenario/driver.ts` | Host-side glue: wrapped target, hook, poll, bookmarks |
| `…/src/scenario/index.ts` | The `@pme/controller/scenario` entry |
| `…/src/panel/scenario-tab.ts` | The panel's Scenario tab |
| `…/src/{protocol,index}.ts`, `src/session/{host-session,controller-session,viewer-sync}.ts`, `src/panel/{panel,styles}.ts`, `src/remote/remote-app.ts` | Additive edits (Tasks 2, 8, 9, 13–15) |
| `…/test/scenario/*.test.ts`, `test/session/{clinical-commands,host-scenario-hook}.test.ts`, `test/panel/scenario-tab.dom.test.ts`, `test/remote/remote-scenario.dom.test.ts` | Tests |
| `apps/demo/stage6b-acls.html`, `apps/demo/src/stage6b/{acls,actions}.ts` | The demo |
| `apps/demo/e2e/stage6b.e2e.ts` | Browser run + gate screenshots + run log |
| `docs/gates/stage-6b.md`, `docs/gates/stage-6b/` | Gate note and evidence |

## Prototype evidence (scratchpad, before this plan was written)

Every file this plan gives in full was written and run in a scratch copy of `origin/main` (`8e46032`); the plan's code blocks are those files. Results:
- `@pme/controller`: **185 tests in 32 files** pass (Stage 6a had 97 in 20); whole repo **349 tests**, `typecheck`, `build`, `check-notices` (`OK (1 governed files)`) pass. Existing Playwright files still pass (`stage6a.e2e.ts` bc/relay/rtc synced with drift 0; `stage6a-worker`, `iife-smoke`).
- Probability: p = 0.3 over 10,000 seeded trials → **0.298**; over 1,000 → 0.306.
- ACLS headless (seed 42, shocks every 2 min from 70 s): `0:stable → 60:vf/arrest → 70:rosc/shockVf` (first draw 0.062 < 0.3). Without shocks: `60:vf → 300:vfFine → 600:asystole`. Ten sim-minutes tick by tick ≈ 1.5 s.
- Bookmark at 65 s → run to 200 s with a shock → restore → same shock: identical scenario events and bit-identical ecgII over 66–199 s. Two independent runs with the same seed and learner commands: identical samples and dispatch logs; `replayRunLog` ok; another seed diverges.
- Browser (`stage6b.e2e.ts`, headless Chrome, 17 s): panel loads the ACLS scenario, the remote's "Start VF now" button starts VF, the learner's Shock 200 J reaches ROSC; no page errors; screenshots 146/146/54 kB.
- IIFE 94.05 kB (unchanged), 0 × `ajv`; controller `dist/index.js` 72.46 kB (0 × `ajv`), `dist/scenario.js` 224.03 kB.

---
### Task 1: Worktree, branch, ajv, NOTICES

**Files:**
- Modify: `packages/controller/package.json`, `pnpm-lock.yaml`, `NOTICES.md`
- Create: `LICENSES/fast-uri-3.1.8.txt`, `docs/plans/stage-6b-scenario-runner.md` (a copy of this plan)

**Interfaces:**
- Consumes: `origin/main` with Stage 6a merged (`8e46032` or later).
- Produces: branch `stage-6b-scenario-runner` at `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6b`; `ajv` 8.20.0 importable from `@pme/controller`; NOTICES rows N-010–N-012.

- [x] **Step 1: Create the worktree and branch**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-6b -b stage-6b-scenario-runner origin/main
cd ../scratch/wt-stage-6b
git log --oneline -1
npx -y pnpm@9.15.9 install --frozen-lockfile
```
Expected: `Preparing worktree (new branch 'stage-6b-scenario-runner')`, the `main` head (`8e46032 Merge pull request #1 …` or later), pnpm `Done`. From here on every command runs in `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-6b`.

- [x] **Step 2: Copy this plan into the branch**

```bash
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-6b-scenario-runner.md docs/plans/
```
(Tick its checkboxes task by task as you go; it is committed with this task.)

- [x] **Step 3: Add ajv**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller add ajv@8.20.0
```
Expected: `packages/controller/package.json` `"dependencies"` is now `{ "@pme/engine-core": "workspace:*", "ajv": "8.20.0", "ws": "8.21.3" }`; the lock file resolved `fast-deep-equal 3.1.3`, `fast-uri 3.1.8`, `json-schema-traverse 1.0.0`, `require-from-string 2.0.2`. Check the licences:
```bash
for p in node_modules/.pnpm/{ajv@8.20.0,fast-uri@*,fast-deep-equal@*,json-schema-traverse@*,require-from-string@*}/node_modules/*; do [ -f $p/package.json ] && node -e "const p=require('$PWD/$p/package.json');console.log(p.name,p.version,p.license)"; done | sort -u
```
Expected:
```
ajv 8.20.0 MIT
fast-deep-equal 3.1.3 MIT
fast-uri 3.1.8 BSD-3-Clause
json-schema-traverse 1.0.0 MIT
require-from-string 2.0.2 MIT
```
If a version differs, use the resolved version in the rows below.

- [x] **Step 4: Licence text and NOTICES rows**

```bash
mkdir -p LICENSES
cp node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/LICENSE LICENSES/fast-uri-3.1.8.txt
```
Append to the table in `NOTICES.md` (after `N-009`):
```markdown
| N-010 | ajv 8.20.0 (browser runtime, `@pme/controller/scenario` entry only) | https://github.com/ajv-validator/ajv | MIT | Validates `pme-scenario/1` documents against `packages/controller/scenarios/pme-scenario-1.schema.json`; bundled into the scenario entry, never into the root entry or the IIFE | 2026-09-25 |
| N-011 | fast-uri 3.1.8 (ajv runtime dependency) | https://github.com/fastify/fast-uri | BSD-3-Clause (text in `LICENSES/fast-uri-3.1.8.txt`) | URI resolution inside ajv; bundled with it, unmodified | 2026-09-25 |
| N-012 | fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2 (ajv runtime dependencies) | https://github.com/epoberezkin/fast-deep-equal · https://github.com/epoberezkin/json-schema-traverse · https://github.com/floatdrop/require-from-string | MIT | Used inside ajv; bundled with it where reachable, unmodified | 2026-09-25 |
```
(If `main` has gained rows N-010+ since `8e46032`, use the next free IDs and say so in the gate note.)

- [x] **Step 5: Verify**

```bash
(cd packages/controller && node --input-type=module -e "import('ajv').then((m) => console.log(typeof m.default))")
node --experimental-strip-types scripts/check-notices.ts
npx -y pnpm@9.15.9 --filter @pme/controller test
```
Expected: `function`, `check-notices: OK (1 governed files)`, `Tests  97 passed (97)`.

- [x] **Step 6: Commit**

```bash
git add packages/controller/package.json pnpm-lock.yaml NOTICES.md LICENSES/fast-uri-3.1.8.txt docs/plans/stage-6b-scenario-runner.md
git commit -m "chore(controller): ajv for scenario validation; NOTICES N-010..N-012; stage 6b plan"
```
(Add your attribution trailer to every commit message, e.g. `-m "Co-Authored-By: …"`.)

---

### Task 2: Clinical commands on the wire (`applyEvent`, `attachSensor`)

**Files:**
- Modify: `packages/controller/src/protocol.ts`, `packages/controller/src/session/controller-session.ts`, `packages/controller/src/session/host-session.ts`, `packages/controller/src/session/viewer-sync.ts`
- Create: `packages/controller/test/session/clinical-commands.test.ts`

**Interfaces:**
- Produces (protocol.ts): `type ClinicalEvent` (brief §7.2 verbatim; `drugId: string`), `type SensorId`, `ExtraCommand` gains `{ type: 'applyEvent'; event: ClinicalEvent }` and `{ type: 'attachSensor'; sensor: SensorId; state: string; site?; leadSet?: 3|5|12; sampling? }`, `type ClinicalCommand`, `type ScenarioEvent = Extract<ExtraEvent, {type:'scenario'}>`. `describe()` names the two new commands.
- Behaviour: a plain `HostSession` passes them to the engine (which rejects them as not implemented); `ViewerSync` mirrors them like other engine commands.

- [ ] **Step 1: Write the failing test**

```ts
// applyEvent / attachSensor (brief §7.2) travel as WireCommands; without a scenario driver the host passes them
// to the engine, which rejects them until Stages 3/4/7 model them.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession, describe as describeCommand } from '../../src/session/controller-session.ts';
import type { WireCommand } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

describe('clinical commands', () => {
  it('describe() names them for the log', () => {
    const shock: WireCommand = { id: 'a', issuedBy: 't', type: 'applyEvent', event: { kind: 'defib', action: 'shock', energyJ: 200 } };
    const probe: WireCommand = { id: 'b', issuedBy: 't', type: 'attachSensor', sensor: 'spo2', state: 'off' };
    expect(describeCommand(shock)).toBe('event defib shock 200');
    expect(describeCommand(probe)).toBe('sensor spo2 off');
  });

  it('a plain host forwards applyEvent to the engine, which rejects it as not implemented', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'CLN234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const s = new ControllerSession({ session: 'CLN234', transport: hub.connect() });
    cleanup.push(() => s.close(), () => hs.close());
    await waitFor(() => s.hostOnline);
    const r = await s.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('command type applyEvent is not implemented until later stages');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/clinical-commands.test.ts`
Expected: FAIL — typecheck-level errors are not reported by Vitest, but `describeCommand(shock)` returns `undefined` (no `applyEvent` case) so the first test fails with `expected undefined to be 'event defib shock 200'`.

- [ ] **Step 3: Extend `protocol.ts`**

In `packages/controller/src/protocol.ts`, replace:
```ts
type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };
```
with:
```ts
type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/** Brief §7.2 `ClinicalEvent`, verbatim (drug ids stay strings until Stage 7 defines DrugId). */
export type ClinicalEvent =
  | {
      kind: 'drug'; drugId: string; dose: number; unit: 'mcg' | 'mg' | 'mcg/kg' | 'mg/kg' | 'mEq' | 'units' | 'mcg/kg/min';
      route: 'iv' | 'io' | 'im' | 'inh'; infusion?: boolean;
    }
  | { kind: 'fluid'; fluid: 'crystalloid' | 'colloid' | 'blood'; volumeMl: number; overS: number }
  | { kind: 'bleed'; rateMlPerMin?: number; volumeMl?: number; overS?: number }
  | {
      kind: 'airway'; state: 'patent' | 'obstructed' | 'apnoea' | 'disconnected' | 'oesophageal' | 'endobronchial' | 'bronchospasm';
      severity?: number;
    }
  | {
      kind: 'ventilation'; source: 'spontaneous' | 'bvm' | 'ventilator' | 'none'; rr?: number; vtMl?: number;
      fio2?: number; peep?: number; ie?: number;
    }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'cpr'; active: boolean; rate?: number; quality?: number; ventilation?: '30:2' | 'continuous' }
  | { kind: 'defib'; action: 'selectEnergy' | 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff'; energyJ?: number }
  | { kind: 'pacer'; mode: 'off' | 'demand' | 'fixed'; ratePpm?: number; mA?: number; pause?: boolean }
  | {
      kind: 'line'; line: 'abp' | 'cvp' | 'pap';
      action: 'flush' | 'zero' | 'sample' | 'disconnect' | 'reconnect' | 'damp' | 'level' | 'wedge'; value?: number;
    }
  | { kind: 'surgical'; action: 'diathermy' | 'shiver' | 'motion'; on: boolean; durationS?: number }
  | { kind: 'condition'; id: 'anaphylaxis' | 'mh' | 'last' | 'tamponade' | 'tensionPtx' | 'pe'; severity: number };
export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp';
```
Replace:
```ts
    | { type: 'time'; action: 'pause' | 'resume' | 'scale' | 'step' | 'jump'; value?: number }
  );
```
with:
```ts
    | { type: 'time'; action: 'pause' | 'resume' | 'scale' | 'step' | 'jump'; value?: number }
    | { type: 'applyEvent'; event: ClinicalEvent }
    | {
        type: 'attachSensor'; sensor: SensorId; state: string; site?: string; leadSet?: 3 | 5 | 12;
        sampling?: 'sidestream' | 'mainstream';
      }
  );
```
Replace:
```ts
export type ScenarioCommand = Extract<ExtraCommand, { type: 'scenario' }>;
```
with:
```ts
export type ScenarioCommand = Extract<ExtraCommand, { type: 'scenario' }>;
/** applyEvent / attachSensor: the host passes them to the engine, which validates them (Stages 3, 4 and 7 model them). */
export type ClinicalCommand = Extract<ExtraCommand, { type: 'applyEvent' | 'attachSensor' }>;
export type ScenarioEvent = Extract<ExtraEvent, { type: 'scenario' }>;
```

- [ ] **Step 4: `describe()` cases**

In `packages/controller/src/session/controller-session.ts`, replace:
```ts
    case 'setMode':
      return `mode ${c.mode}`;
```
with:
```ts
    case 'setMode':
      return `mode ${c.mode}`;
    case 'applyEvent':
      return `event ${Object.values(c.event).join(' ')}`;
    case 'attachSensor':
      return `sensor ${c.sensor} ${c.state}`;
```

- [ ] **Step 5: Let the host and the viewer pass them to the engine**

In `packages/controller/src/session/host-session.ts` (`apply()`), replace:
```ts
    let c: Command = cmd;
```
with:
```ts
    // applyEvent/attachSensor are not in engine-core's Command union yet; the engine validates them at run time.
    let c = cmd as Command;
```
and, a few lines below, replace:
```ts
      c = { ...cmd, atTick: at };
```
with:
```ts
      c = { ...c, atTick: at };
```
In `packages/controller/src/session/viewer-sync.ts` (`onEvent()`), replace:
```ts
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
```
with:
```ts
    if (c.type === 'scenario' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor' || c.type === 'setMode') return;
    const m = c as Command; // applyEvent/attachSensor are mirrored too; the engine validates them (Stage 6b)
    if (res?.replay) {
      if (this.awaiting) this.replays.push(m);
      return;
    }
    if (this.awaiting) {
      this.early.push(m);
      return;
    }
    if (this.status !== 'synced' || this.mirrored.has(e.commandId)) return;
    if ((m.atTick ?? 0) <= this.o.target.tick()) return this.requestSync(); // too late to mirror exactly
    this.mirrored.add(e.commandId);
    if (this.mirrored.size > 256) this.mirrored.delete(this.mirrored.values().next().value as string);
    this.o.target.dispatch(m);
```

- [ ] **Step 6: Run the test and the controller typecheck**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/clinical-commands.test.ts
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
npx -y pnpm@9.15.9 --filter @pme/controller test
```
Expected: `2 passed`; typecheck exit 0 (without the two casts, `tsc` reports `Type '… type: "applyEvent" …' is not assignable to type 'Command'` in host-session.ts and viewer-sync.ts); `Tests  99 passed (99)`.

- [ ] **Step 7: Commit**

```bash
git add packages/controller/src/protocol.ts packages/controller/src/session packages/controller/test/session/clinical-commands.test.ts
git commit -m "feat(controller): applyEvent and attachSensor commands (brief §7.2 ClinicalEvent) on the wire"
```

---

### Task 3: The `pme-scenario/1` JSON Schema and document types

**Files:**
- Create: `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/controller/src/scenario/types.ts`

**Interfaces:**
- Produces: the schema (draft-07; `$comment` allowed on the document, states, transitions and commands; `when` = an object with exactly one of `afterS | atScenarioS | vital | event | sensor | manual | all | any`; commands are a `discriminator` on `type` over `setTarget pin release setFactor setMode setRhythm setModifiers applyEvent attachSensor device`, each with `additionalProperties: false`, so `id`/`issuedBy`/`atTick`/`stageGroup` are refused). Types `Op`, `VitalVar`, `EventFilter`, `When`, `DocCommand`, `Transition`, `ScenarioState`, `ScenarioPatient`, `DocBookmark`, `ScenarioDoc`.

- [ ] **Step 1: Write the schema**

`packages/controller/scenarios/pme-scenario-1.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/samhv-dev/patient-monitor-engine/packages/controller/scenarios/pme-scenario-1.schema.json",
  "title": "pme-scenario/1",
  "description": "Scenario timeline (DESIGN-BRIEF §7.4): states with onEnter/onExit command lists and prioritised transitions. `$comment` is allowed on the document, states, transitions and commands and is never interpreted.",
  "type": "object",
  "required": ["schema", "id", "title", "initialState", "states"],
  "additionalProperties": false,
  "properties": {
    "$schema": { "type": "string" },
    "$comment": { "type": "string" },
    "schema": { "const": "pme-scenario/1" },
    "id": { "$ref": "#/definitions/id" },
    "title": { "type": "string", "minLength": 1 },
    "notes": { "type": "string" },
    "seed": { "type": "integer", "minimum": 0, "maximum": 4294967295 },
    "mode": { "enum": ["manual", "modeled"] },
    "patient": { "$ref": "#/definitions/patient" },
    "device": {
      "type": "object",
      "additionalProperties": false,
      "properties": { "skin": { "type": "string" }, "layout": { "type": "string" } }
    },
    "initialState": { "$ref": "#/definitions/id" },
    "states": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/state" } },
    "bookmarks": { "type": "array", "items": { "$ref": "#/definitions/bookmark" } }
  },
  "definitions": {
    "id": { "type": "string", "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,63}$" },
    "comment": { "type": "string" },
    "stateVar": {
      "enum": ["hr", "sbp", "dbp", "cvp", "papSys", "papDia", "pawp", "spo2", "pi", "rr", "vt", "etco2", "fio2",
               "shunt", "tempCore", "contractility", "svr", "k", "qtc", "volumeStatus", "paceThresholdMa"]
    },
    "vitalVar": {
      "enum": ["hr", "sbp", "dbp", "map", "cvp", "papSys", "papDia", "pawp", "spo2", "pi", "rr", "vt", "etco2", "fio2",
               "shunt", "tempCore", "contractility", "svr", "k", "qtc", "volumeStatus", "paceThresholdMa",
               "pr", "abpSys", "abpDia", "abpMean", "cvpMean", "papMean", "nibpSys", "nibpDia", "nibpMean",
               "imco2", "awrr", "tempSite", "stII"]
    },
    "sensorId": { "enum": ["ecg", "spo2", "nibp", "abp", "cvp", "pap", "co2", "temp"] },
    "eventKind": {
      "enum": ["drug", "fluid", "bleed", "airway", "ventilation", "preoxygenate", "cpr", "defib", "pacer", "line",
               "surgical", "condition"]
    },
    "ramp": {
      "type": "object",
      "required": ["durationS"],
      "additionalProperties": false,
      "properties": {
        "durationS": { "type": "number", "minimum": 0, "maximum": 900 },
        "curve": { "enum": ["linear", "exp", "sigmoid"] },
        "delayS": { "type": "number", "minimum": 0 }
      }
    },
    "patient": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ageY": { "type": "number", "minimum": 0, "maximum": 120 },
        "sex": { "enum": ["M", "F"] },
        "weightKg": { "type": "number", "exclusiveMinimum": 0, "maximum": 300 },
        "heightCm": { "type": "number", "exclusiveMinimum": 0, "maximum": 250 },
        "ageBand": { "enum": ["adult", "paediatric", "neonatal"] },
        "baseline": {
          "type": "object",
          "propertyNames": { "$ref": "#/definitions/stateVar" },
          "additionalProperties": { "type": "number" }
        },
        "rhythm": {
          "type": "object",
          "required": ["id"],
          "additionalProperties": false,
          "properties": { "id": { "$ref": "#/definitions/id" }, "opts": { "type": "object" } }
        },
        "sensors": {
          "type": "object",
          "propertyNames": { "$ref": "#/definitions/sensorId" },
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "state": {
      "type": "object",
      "required": ["id"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/definitions/id" },
        "label": { "type": "string" },
        "notes": { "type": "string" },
        "$comment": { "$ref": "#/definitions/comment" },
        "onEnter": { "$ref": "#/definitions/commands" },
        "onExit": { "$ref": "#/definitions/commands" },
        "transitions": { "type": "array", "items": { "$ref": "#/definitions/transition" } }
      }
    },
    "transition": {
      "type": "object",
      "required": ["id", "to", "when"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/definitions/id" },
        "label": { "type": "string" },
        "$comment": { "$ref": "#/definitions/comment" },
        "to": { "$ref": "#/definitions/id" },
        "when": { "$ref": "#/definitions/when" },
        "probability": { "type": "number", "minimum": 0, "maximum": 1 },
        "else": { "$ref": "#/definitions/id" }
      },
      "dependencies": { "else": ["probability"] }
    },
    "when": {
      "type": "object",
      "minProperties": 1,
      "maxProperties": 1,
      "additionalProperties": false,
      "properties": {
        "afterS": { "type": "number", "minimum": 0 },
        "atScenarioS": { "type": "number", "minimum": 0 },
        "vital": {
          "type": "object",
          "required": ["var", "op", "value"],
          "additionalProperties": false,
          "properties": {
            "var": { "$ref": "#/definitions/vitalVar" },
            "op": { "enum": ["<", "<=", ">", ">=", "==", "!="] },
            "value": { "type": "number" },
            "forS": { "type": "number", "minimum": 0 }
          }
        },
        "event": {
          "type": "object",
          "required": ["kind"],
          "properties": {
            "kind": { "$ref": "#/definitions/eventKind" },
            "minJ": { "type": "number", "minimum": 0 },
            "minDose": { "type": "number", "minimum": 0 },
            "minVolumeMl": { "type": "number", "minimum": 0 },
            "minMa": { "type": "number", "minimum": 0 }
          },
          "additionalProperties": { "type": ["string", "number", "boolean"] }
        },
        "sensor": {
          "type": "object",
          "required": ["sensor", "state"],
          "additionalProperties": false,
          "properties": { "sensor": { "$ref": "#/definitions/sensorId" }, "state": { "type": "string" } }
        },
        "manual": {
          "type": "object",
          "required": ["label"],
          "additionalProperties": false,
          "properties": { "label": { "type": "string", "minLength": 1 } }
        },
        "all": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/when" } },
        "any": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/when" } }
      }
    },
    "bookmark": {
      "type": "object",
      "required": ["id", "state"],
      "additionalProperties": false,
      "properties": { "id": { "$ref": "#/definitions/id" }, "label": { "type": "string" }, "state": { "$ref": "#/definitions/id" } }
    },
    "commands": { "type": "array", "items": { "$ref": "#/definitions/command" } },
    "command": {
      "type": "object",
      "required": ["type"],
      "properties": { "type": { "type": "string" } },
      "discriminator": { "propertyName": "type" },
      "oneOf": [
        {
          "properties": {
            "type": { "const": "setTarget" }, "$comment": { "type": "string" },
            "variable": { "$ref": "#/definitions/stateVar" }, "value": { "type": "number" }, "ramp": { "$ref": "#/definitions/ramp" }
          },
          "required": ["variable", "value"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "pin" }, "$comment": { "type": "string" },
            "variable": { "$ref": "#/definitions/stateVar" }, "value": { "type": "number" }, "ramp": { "$ref": "#/definitions/ramp" }
          },
          "required": ["variable"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "release" }, "$comment": { "type": "string" },
            "variable": { "anyOf": [{ "$ref": "#/definitions/stateVar" }, { "const": "all" }] }, "ramp": { "$ref": "#/definitions/ramp" }
          },
          "required": ["variable"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "setFactor" }, "$comment": { "type": "string" },
            "input": { "enum": ["hrFactor", "svrFactor", "contractilityFactor", "vo2Factor", "vco2Factor"] },
            "factor": { "type": "number", "minimum": 0 }, "ramp": { "$ref": "#/definitions/ramp" }
          },
          "required": ["input", "factor"], "additionalProperties": false
        },
        {
          "properties": { "type": { "const": "setMode" }, "$comment": { "type": "string" }, "mode": { "enum": ["manual", "modeled"] } },
          "required": ["mode"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "setRhythm" }, "$comment": { "type": "string" },
            "rhythm": { "$ref": "#/definitions/id" }, "opts": { "type": "object" },
            "when": { "enum": ["now", "nextBeat"] }, "respectRefractory": { "type": "boolean" }
          },
          "required": ["rhythm"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "setModifiers" }, "$comment": { "type": "string" },
            "modifiers": { "type": "object" }, "ramp": { "$ref": "#/definitions/ramp" }
          },
          "required": ["modifiers"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "applyEvent" }, "$comment": { "type": "string" },
            "event": { "type": "object", "required": ["kind"], "properties": { "kind": { "$ref": "#/definitions/eventKind" } } }
          },
          "required": ["event"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "attachSensor" }, "$comment": { "type": "string" },
            "sensor": { "$ref": "#/definitions/sensorId" }, "state": { "type": "string" }, "site": { "type": "string" },
            "leadSet": { "enum": [3, 5, 12] }, "sampling": { "enum": ["sidestream", "mainstream"] }
          },
          "required": ["sensor", "state"], "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "device" }, "$comment": { "type": "string" },
            "action": {
              "type": "object", "required": ["device", "action"],
              "properties": { "device": { "enum": ["nibp", "alarm", "ecg", "display"] }, "action": { "type": "string" } }
            }
          },
          "required": ["action"], "additionalProperties": false
        }
      ]
    }
  }
}
```

Notes: `"properties": { "type": { "type": "string" } }` on `command` is needed by ajv's strict mode (`strictRequired`); `"additionalProperties": { "type": ["string","number","boolean"] }` on `event` needs `allowUnionTypes` (Task 4). The `rhythm` id is a pattern, not an enum: the engine decides which ids exist (Decision 9).

- [ ] **Step 2: Write the types**

`packages/controller/src/scenario/types.ts`:
```ts
// `pme-scenario/1` document types (DESIGN-BRIEF §7.4). The JSON Schema in scenarios/pme-scenario-1.schema.json is
// the contract; these types mirror it. Commands in a document carry no id/issuedBy/atTick/stageGroup: the driver
// stamps them, and every onExit+onEnter list runs as ONE stage group (one tick, "stage then commit", brief §4.9).
import type { Ramp, StateVar } from '@pme/engine-core';
import type { ClinicalEvent, ModelInput, SensorId } from '../protocol.ts';

export type Op = '<' | '<=' | '>' | '>=' | '==' | '!=';
/** A StateVar, a NumericId, or `map` (brief §7.1 names; measured ids such as nibpSys are allowed too). */
export type VitalVar = string;

/** `event` trigger: `kind` plus filters. minJ/minDose/minVolumeMl/minMa are lower bounds; any other key must match exactly. */
export type EventFilter = { kind: ClinicalEvent['kind'] } & { [key: string]: string | number | boolean };

export type When =
  | { afterS: number }
  | { atScenarioS: number }
  | { vital: { var: VitalVar; op: Op; value: number; forS?: number } }
  | { event: EventFilter }
  | { sensor: { sensor: SensorId; state: string } }
  | { manual: { label: string } }
  | { all: When[] }
  | { any: When[] };

type C = { $comment?: string };
export type DocCommand = C &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
    | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
    | { type: 'setFactor'; input: ModelInput; factor: number; ramp?: Ramp }
    | { type: 'setMode'; mode: 'manual' | 'modeled' }
    | { type: 'setRhythm'; rhythm: string; opts?: Record<string, unknown>; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: Record<string, unknown>; ramp?: Ramp }
    | { type: 'applyEvent'; event: ClinicalEvent }
    | { type: 'attachSensor'; sensor: SensorId; state: string; site?: string; leadSet?: 3 | 5 | 12; sampling?: 'sidestream' | 'mainstream' }
    | { type: 'device'; action: { device: 'nibp' | 'alarm' | 'ecg' | 'display'; action: string; [k: string]: unknown } }
  );

export interface Transition extends C {
  id: string;
  label?: string;
  to: string;
  when: When;
  /** Rolled once on the `scenario` PRNG stream when `when` holds: success → `to`, failure → `else` (absent: stay). */
  probability?: number;
  else?: string;
}

export interface ScenarioState extends C {
  id: string;
  label?: string;
  notes?: string;
  onEnter?: DocCommand[];
  onExit?: DocCommand[];
  /** Priority order: the first transition whose condition holds fires; at most one per tick. */
  transitions?: Transition[];
}

export interface ScenarioPatient {
  ageY?: number;
  sex?: 'M' | 'F';
  weightKg?: number;
  heightCm?: number;
  ageBand?: 'adult' | 'paediatric' | 'neonatal';
  baseline?: Partial<Record<StateVar, number>>;
  rhythm?: { id: string; opts?: Record<string, unknown> };
  sensors?: Partial<Record<SensorId, string>>;
}

/** An authored jump point shown in the timeline; choosing it is a `goto` to `state`. */
export interface DocBookmark {
  id: string;
  label?: string;
  state: string;
}

export interface ScenarioDoc extends C {
  $schema?: string;
  schema: 'pme-scenario/1';
  id: string;
  title: string;
  notes?: string;
  /** Seeds the runner's `scenario` PRNG stream (the engine keeps the host's own seed). */
  seed?: number;
  mode?: 'manual' | 'modeled';
  patient?: ScenarioPatient;
  device?: { skin?: string; layout?: string };
  initialState: string;
  states: ScenarioState[];
  bookmarks?: DocBookmark[];
}
```

- [ ] **Step 3: Typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/controller/scenarios/pme-scenario-1.schema.json packages/controller/src/scenario/types.ts
git commit -m "feat(scenario): pme-scenario/1 JSON Schema and document types (brief §7.4)"
```

---

### Task 4: Validation with path-level errors (ajv)

**Files:**
- Create: `packages/controller/src/scenario/validate.ts`, `packages/controller/test/scenario/schema.test.ts`

**Interfaces:**
- Produces: `validateScenario(input: unknown, opts?: { rhythms?: readonly string[] }): { ok: true; doc; warnings } | { ok: false; errors; warnings }`; `formatAjvError(e)`; `SCENARIO_SCHEMA`. Errors are `<JSON path>: <what>` (at most 20, de-duplicated). Cross-reference errors: duplicate state ids, duplicate transition ids (unique per document), missing `initialState`/`to`/`else`/bookmark state, more than one `manual` leaf per transition. Warnings: a `setRhythm`/`patient.rhythm` id outside `opts.rhythms`.

- [ ] **Step 1: Write the failing test**

`packages/controller/test/scenario/schema.test.ts`:
```ts
// pme-scenario/1 validation (brief §7.4; BUILD-PLAN Stage 6 acceptance 6: path-level error messages).
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';

const base = () => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a',
  states: [{ id: 'a', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b' }],
}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};

describe('validateScenario', () => {
  it('accepts a minimal document', () => {
    expect(validateScenario(base()).ok).toBe(true);
  });

  it('warns (does not fail) on rhythm ids this engine lacks', () => {
    const d = base();
    d.states[1].onEnter = [{ type: 'setRhythm', rhythm: 'vfCoarse' }];
    const r = validateScenario(d, { rhythms: ['sinus'] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(['/states/1/onEnter/0/rhythm: "vfCoarse" is not in this engine']);
  });

  it.each([
    ['wrong schema tag', (d: any) => (d.schema = 'pme-scenario/2'), '/schema: must be "pme-scenario/1"'],
    ['missing states', (d: any) => delete d.states, '/: missing required property "states"'],
    ['unknown top-level key', (d: any) => (d.colour = 'red'), '/: unexpected property "colour"'],
    ['two triggers in one when', (d: any) => (d.states[0].transitions[0].when = { afterS: 1, manual: { label: 'x' } }),
      '/states/0/transitions/0/when: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any'],
    ['unknown trigger', (d: any) => (d.states[0].transitions[0].when = { soon: 1 }), '/states/0/transitions/0/when: unexpected property "soon"'],
    ['nested bad trigger', (d: any) => (d.states[0].transitions[0].when = { all: [{ afterS: 1 }, {}] }),
      '/states/0/transitions/0/when/all/1: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any'],
    ['bad vital op', (d: any) => (d.states[0].transitions[0].when = { vital: { var: 'hr', op: '=>', value: 1 } }),
      '/states/0/transitions/0/when/vital/op: must be one of "<", "<=", ">", ">=", "==", "!="'],
    ['probability > 1', (d: any) => (d.states[0].transitions[0].probability = 1.5), '/states/0/transitions/0/probability: must be <= 1'],
    ['else without probability', (d: any) => (d.states[0].transitions[0].else = 'a'), '/states/0/transitions/0: "else" needs "probability"'],
    ['unknown command type', (d: any) => (d.states[0].onEnter = [{ type: 'explode' }]), '/states/0/onEnter/0/type: unknown command type "explode"'],
    ['command with an id', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'hr', value: 90, id: 'x' }]), '/states/0/onEnter/0: unexpected property "id"'],
    ['bad state var', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'bp', value: 90 }]), '/states/0/onEnter/0/variable: must be one of'],
    ['ramp too long', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'hr', value: 90, ramp: { durationS: 901 } }]), '/states/0/onEnter/0/ramp/durationS: must be <= 900'],
    ['dangling to', (d: any) => (d.states[0].transitions[0].to = 'nowhere'), '/states/0/transitions/0/to: no state "nowhere"'],
    ['dangling initialState', (d: any) => (d.initialState = 'z'), '/initialState: no state "z"'],
    ['duplicate state', (d: any) => d.states.push({ id: 'a' }), '/states/2/id: duplicate state id "a"'],
    ['duplicate transition id', (d: any) => (d.states[1].transitions = [{ id: 't1', to: 'a', when: { afterS: 1 } }]),
      '/states/1/transitions/0/id: duplicate transition id "t1" (ids are unique per document)'],
    ['bookmark to nowhere', (d: any) => (d.bookmarks = [{ id: 'bm', state: 'q' }]), '/bookmarks/0/state: no state "q"'],
  ])('rejects %s with a path-level message', (_name, mutate, message) => {
    const d = base();
    mutate(d);
    expect(errs(d).some((e) => e.startsWith(message)), errs(d).join('\n')).toBe(true);
  });

  it('reports several errors at once, each with its path', () => {
    const d = base();
    d.states[0].transitions[0].probability = 2;
    d.states[0].onEnter = [{ type: 'nope' }];
    expect(errs(d)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/schema.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/validate.ts"`.

- [ ] **Step 3: Implement**

`packages/controller/src/scenario/validate.ts`:
```ts
// Scenario validation: the JSON Schema (ajv, MIT — NOTICES N-010) for shape, then the cross-references a schema
// cannot express (unique ids, `to`/`else`/bookmark targets exist). Errors carry the JSON path of the offending
// value, e.g. `/states/1/transitions/0/when: a trigger must have exactly one of afterS, …` (BUILD-PLAN Stage 6
// acceptance 6). This module is the only importer of ajv; it lives behind the `@pme/controller/scenario` entry
// so the IIFE and the root entry never bundle it.
import Ajv, { type ErrorObject } from 'ajv';
import schema from '../../scenarios/pme-scenario-1.schema.json';
import type { DocCommand, ScenarioDoc, When } from './types.ts';

export const SCENARIO_SCHEMA: object = schema;
export type ValidationResult =
  | { ok: true; doc: ScenarioDoc; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export interface ValidateOptions {
  /** Rhythm ids the host engine knows; setRhythm to any other id is reported as a warning (stand-ins apply). */
  rhythms?: readonly string[];
}

const TRIGGER_KEYS = 'afterS, atScenarioS, vital, event, sensor, manual, all, any';
const MAX_ERRORS = 20;
/** A trigger object: …/when, or a child of all/any inside it. */
const WHEN_PATH = /\/when(\/(all|any)\/\d+)*$/;
let compiled: ReturnType<Ajv['compile']> | null = null;

function validator(): ReturnType<Ajv['compile']> {
  compiled ??= new Ajv({ allErrors: true, discriminator: true, strict: true, allowUnionTypes: true }).compile(schema);
  return compiled;
}

/** One readable line per ajv error: `<json path>: <what is wrong>`. */
export function formatAjvError(e: ErrorObject): string {
  const at = e.instancePath || '/';
  const p = e.params as Record<string, unknown>;
  if (WHEN_PATH.test(at) && (e.keyword === 'maxProperties' || e.keyword === 'minProperties')) {
    return `${at}: a trigger must have exactly one of ${TRIGGER_KEYS}`;
  }
  switch (e.keyword) {
    case 'additionalProperties':
      return `${at}: unexpected property "${String(p.additionalProperty)}"`;
    case 'required':
      return `${at}: missing required property "${String(p.missingProperty)}"`;
    case 'enum':
      return `${at}: must be one of ${(p.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', ')}`;
    case 'const':
      return `${at}: must be ${JSON.stringify(p.allowedValue)}`;
    case 'discriminator':
      return p.error === 'mapping' ? `${at}/type: unknown command type ${JSON.stringify(p.tagValue)}` : `${at}: command needs a string "type"`;
    case 'dependencies':
      return `${at}: "${String(p.property)}" needs "${String(p.missingProperty)}"`;
    default:
      return `${at}: ${e.message ?? e.keyword}`;
  }
}

/** Validate an unknown value as a `pme-scenario/1` document. */
export function validateScenario(input: unknown, opts: ValidateOptions = {}): ValidationResult {
  const v = validator();
  if (!v(input)) {
    const errors = [...new Set((v.errors ?? []).map(formatAjvError))].slice(0, MAX_ERRORS);
    return { ok: false, errors, warnings: [] };
  }
  const doc = input as ScenarioDoc;
  const errors: string[] = [];
  const warnings: string[] = [];
  const stateIds = new Map<string, number>();
  doc.states.forEach((s, i) => {
    if (stateIds.has(s.id)) errors.push(`/states/${i}/id: duplicate state id "${s.id}"`);
    else stateIds.set(s.id, i);
  });
  if (!stateIds.has(doc.initialState)) errors.push(`/initialState: no state "${doc.initialState}"`);
  const transitionIds = new Set<string>();
  const rhythms = opts.rhythms ? new Set(opts.rhythms) : null;
  const checkCommands = (list: DocCommand[] | undefined, path: string) =>
    list?.forEach((c, k) => {
      if (c.type === 'setRhythm' && rhythms && !rhythms.has(c.rhythm)) warnings.push(`${path}/${k}/rhythm: "${c.rhythm}" is not in this engine`);
    });
  if (doc.patient?.rhythm && rhythms && !rhythms.has(doc.patient.rhythm.id)) warnings.push(`/patient/rhythm/id: "${doc.patient.rhythm.id}" is not in this engine`);
  doc.states.forEach((s, i) => {
    checkCommands(s.onEnter, `/states/${i}/onEnter`);
    checkCommands(s.onExit, `/states/${i}/onExit`);
    s.transitions?.forEach((t, j) => {
      const at = `/states/${i}/transitions/${j}`;
      if (transitionIds.has(t.id)) errors.push(`${at}/id: duplicate transition id "${t.id}" (ids are unique per document)`);
      transitionIds.add(t.id);
      if (!stateIds.has(t.to)) errors.push(`${at}/to: no state "${t.to}"`);
      if (t.else !== undefined && !stateIds.has(t.else)) errors.push(`${at}/else: no state "${t.else}"`);
      if (countManual(t.when) > 1) errors.push(`${at}/when: at most one manual trigger per transition`);
    });
  });
  doc.bookmarks?.forEach((b, i) => {
    if (!stateIds.has(b.state)) errors.push(`/bookmarks/${i}/state: no state "${b.state}"`);
  });
  return errors.length ? { ok: false, errors: errors.slice(0, MAX_ERRORS), warnings } : { ok: true, doc, warnings };
}

function countManual(w: When): number {
  if ('manual' in w) return 1;
  if ('all' in w) return w.all.reduce((n, c) => n + countManual(c), 0);
  if ('any' in w) return w.any.reduce((n, c) => n + countManual(c), 0);
  return 0;
}
```

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/schema.test.ts`
Expected: `Tests  21 passed (21)`. (If ajv throws `strict mode: …` at compile time, the schema differs from Task 3's text: fix the schema, not the ajv options.)

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/scenario/validate.ts packages/controller/test/scenario/schema.test.ts
git commit -m "feat(scenario): ajv validation with path-level messages and cross-reference checks"
```

---

### Task 5: The runner — triggers, priority, combinators, stay, pause, goto

**Files:**
- Create: `packages/controller/src/scenario/runner.ts`, `packages/controller/test/scenario/fixtures.ts`, `packages/controller/test/scenario/runner.test.ts`

**Interfaces:**
- Consumes: `seedStream`, `uniform`, `Sfc32State` from `@pme/engine-core` (public exports of `rng/sfc32.ts`).
- Produces: `class ScenarioRunner(doc, { seed? })` with `start(t)`, `advance(t, inputs?)`, `goto(t, stateId)`, `trigger(t, transitionId) → { ok, reason? }`, `pause(t)`, `resume(t)`, `getState()`, `setState(s)`, `value(name)`, getters `stateId stateT scenarioT paused started enteredT history`, `state()`, `readonly log: RunLogEntry[]`, `readonly seed`, `readonly doc`. Types `RunnerInput` (`clinical | values(rank 1–3) | sensor`), `RunnerEffect` (`commands {batch, reason, commands} | event {ScenarioEvent}`), `RunLogEntry`, `RunnerState` (plain JSON). Helpers `compare`, `matches`, `hasManual`.

- [ ] **Step 1: Write the fixtures and the failing tests**

`packages/controller/test/scenario/fixtures.ts`:
```ts
// Small documents for the runner tests.
import type { ScenarioDoc, ScenarioState, Transition, When } from '../../src/scenario/types.ts';

/** A document whose state `a` has the given transitions; every other named state is empty. */
export function doc(transitions: Array<Partial<Transition> & { when: When }>, extra: ScenarioState[] = []): ScenarioDoc {
  const ts = transitions.map((t, i) => ({ id: t.id ?? `t${i}`, to: t.to ?? 'b', ...t })) as Transition[];
  const names = new Set(['b', 'c', ...ts.flatMap((t) => [t.to, t.else ?? 'b'])]);
  names.delete('a');
  for (const s of extra) names.delete(s.id);
  return {
    schema: 'pme-scenario/1', id: 'test', title: 'test', seed: 1, initialState: 'a',
    states: [{ id: 'a', onEnter: [{ type: 'setTarget', variable: 'hr', value: 80 }], onExit: [{ type: 'setTarget', variable: 'hr', value: 81 }], transitions: ts },
      ...[...names].map((id) => ({ id, onEnter: [{ type: 'setRhythm' as const, rhythm: id === 'b' ? 'sinusTachy' : 'asystole' }] })), ...extra],
  };
}

export const shock = (energyJ = 200) => ({ kind: 'clinical' as const, event: { kind: 'defib' as const, action: 'shock' as const, energyJ } });
export const drug = (drugId: string, dose = 1) => ({ kind: 'clinical' as const, event: { kind: 'drug' as const, drugId, dose, unit: 'mg' as const, route: 'iv' as const } });
export const vals = (values: Record<string, number>, rank: 1 | 2 | 3 = 2) => ({ kind: 'values' as const, rank, values });
```

`packages/controller/test/scenario/runner.test.ts`:
```ts
// Trigger semantics (brief §7.4; BUILD-PLAN Stage 6 acceptance 5): every trigger type, priority, combinators,
// stay-on-else, pause, goto, manual press vs force, and independence from the polling rate.
import { describe, expect, it } from 'vitest';
import { ScenarioRunner, type RunnerEffect } from '../../src/scenario/runner.ts';
import { doc, drug, shock, vals } from './fixtures.ts';

const states = (fx: RunnerEffect[]) => fx.flatMap((f) => (f.kind === 'event' ? [f.event.stateId] : []));
const cmds = (fx: RunnerEffect[]) => fx.flatMap((f) => (f.kind === 'commands' ? f.commands : []));
/** Advance every 20 ms from t0 to t1 with no inputs; returns the first time the state changed, or null. */
function runUntilChange(r: ScenarioRunner, t0: number, t1: number, step = 0.02): number | null {
  const from = r.stateId;
  for (let t = t0; t <= t1 + 1e-9; t += step) {
    r.advance(Math.round(t * 1e6) / 1e6);
    if (r.stateId !== from) return Math.round(t * 1e6) / 1e6;
  }
  return null;
}

describe('ScenarioRunner', () => {
  it('start: one batch with patient setup and the initial onEnter, then a scenario event', () => {
    const d = doc([{ when: { afterS: 5 } }]);
    d.patient = { baseline: { hr: 88 }, rhythm: { id: 'sinus' }, sensors: { spo2: 'on' } };
    const fx = new ScenarioRunner(d).start(0);
    expect(fx.map((f) => f.kind)).toEqual(['commands', 'event']);
    expect(cmds(fx).map((c) => c.type)).toEqual(['setRhythm', 'setTarget', 'attachSensor', 'setTarget']);
    expect(fx[1]).toEqual({ kind: 'event', event: { type: 'scenario', t: 0, stateId: 'a' } });
  });

  it('afterS counts time in state; the transition batch is onExit + onEnter in one stage group', () => {
    const r = new ScenarioRunner(doc([{ id: 'go', when: { afterS: 5 } }]));
    r.start(10);
    expect(runUntilChange(r, 10.02, 20)).toBe(15);
    const last = r.log.filter((e) => e.op === 'enter').at(-1);
    expect(last).toMatchObject({ stateId: 'b', transitionId: 'go', t: 15 });
  });

  it('atScenarioS counts from start, across states', () => {
    const d = doc([{ when: { afterS: 2 } }], [{ id: 'b', transitions: [{ id: 'late', to: 'c', when: { atScenarioS: 7 } }] }]);
    const r = new ScenarioRunner(d);
    r.start(0);
    expect(runUntilChange(r, 0.02, 3)).toBe(2);
    expect(runUntilChange(r, 2.02, 10)).toBe(7);
  });

  it('vital with forS fires only after the value holds continuously; a dip resets it', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>=', value: 100, forS: 10 } } }]));
    r.start(0);
    r.advance(1, [vals({ hr: 105 })]);
    r.advance(6, [vals({ hr: 95 })]); // dip after 5 s
    r.advance(7, [vals({ hr: 110 })]);
    expect(r.advance(16.9)).toEqual([]);
    expect(states(r.advance(17))).toEqual(['b']);
  });

  it('vital reads measured aliases: nibpSys counts as sbp; a higher-rank source wins until stale', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'sbp', op: '<', value: 80 } } }]));
    r.start(0);
    r.advance(1, [vals({ sbp: 120 }, 3)]); // truth (Stage 2 state)
    r.advance(2, [vals({ nibpSys: 70 })]); // measured, lower rank: ignored while truth is fresh
    expect(r.stateId).toBe('a');
    r.advance(8, [vals({ nibpSys: 70 })]); // truth silent > 5 s → measured takes over
    expect(r.stateId).toBe('b');
  });

  it('event filters: kind, exact keys, and minJ/minDose lower bounds', () => {
    const r = new ScenarioRunner(doc([{ when: { event: { kind: 'defib', action: 'shock', minJ: 150 } } }]));
    r.start(0);
    r.advance(1, [shock(100)]);
    expect(r.stateId).toBe('a');
    r.advance(2, [{ kind: 'clinical', event: { kind: 'defib', action: 'charge', energyJ: 200 } }]);
    expect(r.stateId).toBe('a');
    r.advance(3, [shock(200)]);
    expect(r.stateId).toBe('b');
    const r2 = new ScenarioRunner(doc([{ when: { event: { kind: 'drug', drugId: 'adenosine', minDose: 6 } } }]));
    r2.start(0);
    r2.advance(1, [drug('adenosine', 3)]);
    expect(r2.stateId).toBe('a');
    r2.advance(2, [drug('adenosine', 6)]);
    expect(r2.stateId).toBe('b');
  });

  it('sensor triggers are levels; the initial sensor states come from patient.sensors', () => {
    const d = doc([{ when: { sensor: { sensor: 'spo2', state: 'off' } } }]);
    d.patient = { sensors: { spo2: 'on' } };
    const r = new ScenarioRunner(d);
    r.start(0);
    r.advance(1);
    expect(r.stateId).toBe('a');
    r.advance(2, [{ kind: 'sensor', sensor: 'spo2', state: 'off' }]);
    expect(r.stateId).toBe('b');
  });

  it('all needs every child (events latch across ticks); any needs one', () => {
    const r = new ScenarioRunner(doc([{ when: { all: [{ event: { kind: 'drug', drugId: 'epinephrine' } }, { vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } }] } }]));
    r.start(0);
    r.advance(5, [drug('epinephrine')]);
    r.advance(10, [vals({ etco2: 25 })]);
    expect(r.advance(39.98)).toEqual([]);
    expect(states(r.advance(40))).toEqual(['b']);
    const r2 = new ScenarioRunner(doc([{ when: { any: [{ afterS: 60 }, { event: { kind: 'cpr', active: true } }] } }]));
    r2.start(0);
    r2.advance(3, [{ kind: 'clinical', event: { kind: 'cpr', active: true } }]);
    expect(r2.stateId).toBe('b');
  });

  it('priority: document order wins when two transitions hold on the same tick; at most one fires per call', () => {
    const r = new ScenarioRunner(doc([{ id: 'first', to: 'b', when: { afterS: 1 } }, { id: 'second', to: 'c', when: { afterS: 1 } }]));
    r.start(0);
    expect(states(r.advance(1))).toEqual(['b']);
    const d = doc([{ id: 'x', to: 'b', when: { afterS: 1 } }], [{ id: 'b', transitions: [{ id: 'y', to: 'c', when: { afterS: 0 } }] }]);
    const r2 = new ScenarioRunner(d);
    r2.start(0);
    r2.advance(1);
    expect(r2.stateId).toBe('b'); // b's afterS 0 waits for the next call
    r2.advance(1.02);
    expect(r2.stateId).toBe('c');
  });

  it('events before entering a state do not count', () => {
    const d = doc([{ when: { afterS: 1 } }], [{ id: 'b', transitions: [{ id: 'y', to: 'c', when: { event: { kind: 'defib', action: 'shock' } } }] }]);
    const r = new ScenarioRunner(d);
    r.start(0);
    r.advance(0.5, [shock()]);
    r.advance(1);
    expect(r.stateId).toBe('b');
    r.advance(2);
    expect(r.stateId).toBe('b');
  });

  it('a transition to the current state stays: no commands, timers keep running, the event is consumed', () => {
    const r = new ScenarioRunner(doc([
      { id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0, else: 'a' },
      { id: 'decay', to: 'c', when: { afterS: 20 } },
    ]));
    r.start(0);
    const fx = r.advance(10, [shock()]);
    expect(fx).toEqual([{ kind: 'event', event: { type: 'scenario', t: 10, stateId: 'a', transitionId: 'shock:else' } }]);
    expect(r.advance(11)).toEqual([]); // the shock was consumed
    expect(runUntilChange(r, 11.02, 30)).toBe(20); // afterS still counts from 0
  });

  it('probability without else stays on failure', () => {
    const r = new ScenarioRunner(doc([{ id: 'p0', when: { afterS: 1 }, probability: 0 }]));
    r.start(0);
    expect(r.advance(1)).toMatchObject([{ kind: 'event', event: { stateId: 'a', transitionId: 'p0:else' } }]);
  });

  it('manual: trigger presses the button; the rest of an all() must still hold', () => {
    const r = new ScenarioRunner(doc([{ id: 'm', when: { all: [{ manual: { label: 'ROSC' } }, { event: { kind: 'drug', drugId: 'epinephrine' } }] } }]));
    r.start(0);
    expect(r.trigger(1, 'm')).toEqual({ ok: true });
    r.advance(1);
    expect(r.stateId).toBe('a');
    r.advance(2, [drug('epinephrine')]);
    expect(r.stateId).toBe('b');
  });

  it('trigger on a transition without a manual leaf forces it; an unknown id is refused', () => {
    const r = new ScenarioRunner(doc([{ id: 'slow', when: { afterS: 600 } }]));
    r.start(0);
    expect(r.trigger(1, 'nope')).toEqual({ ok: false, reason: 'no transition nope in state a' });
    r.trigger(1, 'slow');
    expect(states(r.advance(1))).toEqual(['b']);
  });

  it('pause stops the scenario clock and the evaluation; inputs still latch', () => {
    const r = new ScenarioRunner(doc([{ id: 'late', when: { afterS: 10 } }, { id: 'ev', to: 'c', when: { event: { kind: 'cpr', active: true } } }]));
    r.start(0);
    r.advance(4);
    r.pause(4);
    r.advance(100, [{ kind: 'clinical', event: { kind: 'cpr', active: true } }]);
    expect(r.stateId).toBe('a');
    expect(r.stateT).toBeCloseTo(4, 9);
    r.resume(100);
    expect(states(r.advance(100.02))).toEqual(['c']);
  });

  it('goto re-enters (even the current state) and runs onExit + onEnter', () => {
    const r = new ScenarioRunner(doc([{ when: { afterS: 100 } }]));
    r.start(0);
    r.advance(30);
    const fx = r.goto(30, 'a');
    expect(cmds(fx).map((c) => (c as { value: number }).value)).toEqual([81, 80]);
    expect(r.stateT).toBe(0);
    expect(() => r.goto(31, 'zzz')).toThrow('no state zzz');
  });

  it('timers do not depend on the polling rate (per tick vs once a second vs only at inputs)', () => {
    const run = (step: number) => {
      const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>', value: 100, forS: 7.5 } } }, { id: 't2', to: 'c', when: { afterS: 30 } }]));
      r.start(0);
      const inputs = new Map([[2, [vals({ hr: 120 })]], [4, [vals({ hr: 90 })]], [5, [vals({ hr: 130 })]]]);
      for (let k = 1; k <= 1500; k++) {
        const t = Math.round(k * 0.02 * 100) / 100;
        const inp = inputs.get(t) ?? [];
        if (inp.length || Math.abs((t / step) - Math.round(t / step)) < 1e-9) r.advance(t, inp);
        if (r.stateId !== 'a') return { state: r.stateId, t };
      }
      return null;
    };
    expect(run(0.02)).toEqual({ state: 'b', t: 12.5 });
    expect(run(0.5)).toEqual({ state: 'b', t: 12.5 });
  });

  it('getState/setState round-trips exactly (JSON-safe)', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>', value: 100, forS: 5 } } }]));
    r.start(0);
    r.advance(1, [vals({ hr: 120 }), drug('x')]);
    const s = r.getState();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    r.advance(6);
    expect(r.stateId).toBe('b');
    r.setState(s);
    expect(r.stateId).toBe('a');
    expect(states(r.advance(6))).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run them**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/runner.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/runner.ts"`.

- [ ] **Step 3: Implement**

`packages/controller/src/scenario/runner.ts`:
```ts
// The scenario runner (DESIGN-BRIEF §7.4; research 01 §2.3: CAE states + transitions, Laerdal handlers, REALITi
// steps). A PURE state machine: no engine, no clock, no DOM. The host calls advance(simT, inputs) once per tick
// (or frame); the runner answers with effects — command batches to dispatch and `scenario` events to publish.
// Semantics (docs/plans/stage-6b-scenario-runner.md "Decisions"):
// - Timers are accumulators of sim time while the scenario is not paused: stateT (afterS), scenarioT (atScenarioS),
//   and one "continuously true for" counter per vital leaf (forS). The interval since the last call is credited
//   with the values held BEFORE this call's inputs, so the result does not depend on how often advance() is called.
// - Events (applyEvent) latch from state entry until consumed by the transition they fire; vitals and sensors are
//   levels. Transitions are tried in document order; the first that holds fires; at most one per call.
// - probability: one draw on the `scenario` sfc32 stream (seeded from hash(seed, 'scenario'), brief §3.3) when the
//   condition holds; failure goes to `else`, or stays when `else` is absent.
// - A transition to the CURRENT state stays: no onExit/onEnter, timers keep running, matched events are consumed.
//   goto always re-enters.
// - trigger(id) presses the transition's manual button; a transition without a manual leaf is forced instead.
import { seedStream, uniform, type Sfc32State } from '@pme/engine-core';
import type { ClinicalEvent, ScenarioEvent, SensorId } from '../protocol.ts';
import type { DocCommand, EventFilter, Op, ScenarioDoc, ScenarioState, Transition, When } from './types.ts';

export type RunnerInput =
  | { kind: 'clinical'; event: ClinicalEvent }
  /** Values by variable. rank: 3 engine `state` (truth), 2 `measurement` (displayed), 1 a target the host accepted. */
  | { kind: 'values'; rank: 1 | 2 | 3; values: Record<string, number> }
  | { kind: 'sensor'; sensor: SensorId; state: string };

export type RunnerEffect =
  | { kind: 'commands'; batch: number; reason: 'start' | 'transition' | 'goto'; commands: DocCommand[] }
  | { kind: 'event'; event: ScenarioEvent };

export type RunLogEntry =
  | { op: 'start'; t: number; seed: number }
  | { op: 'advance'; t: number; inputs: RunnerInput[] }
  | { op: 'goto'; t: number; stateId: string }
  | { op: 'trigger'; t: number; transitionId: string }
  | { op: 'pause' | 'resume'; t: number }
  | { op: 'restore'; t: number; state: RunnerState }
  | { op: 'enter'; t: number; stateId: string; transitionId?: string }
  | { op: 'roll'; t: number; transitionId: string; u: number; p: number; success: boolean }
  | { op: 'dispatch'; t: number; commandId: string; type: string; accepted: boolean; tick: number; reason?: string };

/** Plain JSON: a bookmark stores it next to the engine snapshot. */
export interface RunnerState {
  schema: 'pme-scenario-runner/1';
  docId: string;
  started: boolean;
  stateId: string;
  lastT: number;
  stateT: number;
  scenarioT: number;
  paused: boolean;
  rng: Sfc32State;
  seq: number;
  batch: number;
  latched: Array<{ seq: number; event: ClinicalEvent }>;
  pressed: string[];
  trueFor: Record<string, number>;
  values: Record<string, { v: number; rank: number; t: number }>;
  sensors: Record<string, string>;
  enteredT: number;
  history: Array<{ t: number; stateId: string; transitionId?: string }>;
}

const EPS = 1e-6;
/** A lower-rank source takes over a variable once the higher one has been silent this long [ENG]. */
const STALE_S = 5;
/** Lower-bound filters on `event` triggers → the ClinicalEvent field they bound. */
const MIN_FILTERS: Record<string, string> = { minJ: 'energyJ', minDose: 'dose', minVolumeMl: 'volumeMl', minMa: 'mA' };
/** Measured numerics also count as the StateVar they display (sbp ← abpSys or nibpSys, …). */
const ALIAS: Record<string, string> = {
  abpSys: 'sbp', abpDia: 'dbp', abpMean: 'map', nibpSys: 'sbp', nibpDia: 'dbp', nibpMean: 'map', cvpMean: 'cvp',
  awrr: 'rr',
};
const HISTORY_MAX = 200;

export class ScenarioRunner {
  readonly doc: ScenarioDoc;
  readonly seed: number;
  readonly log: RunLogEntry[] = [];
  private s: RunnerState;
  private readonly states = new Map<string, ScenarioState>();

  constructor(doc: ScenarioDoc, opts: { seed?: number } = {}) {
    this.doc = doc;
    this.seed = (opts.seed ?? doc.seed ?? 1) >>> 0;
    for (const st of doc.states) this.states.set(st.id, st);
    const sensors: Record<string, string> = {};
    for (const [k, v] of Object.entries(doc.patient?.sensors ?? {})) if (v !== undefined) sensors[k] = v;
    this.s = {
      schema: 'pme-scenario-runner/1', docId: doc.id, started: false, stateId: doc.initialState, lastT: 0, stateT: 0,
      scenarioT: 0, paused: false, rng: seedStream(this.seed, 'scenario'), seq: 0, batch: 0, latched: [], pressed: [],
      trueFor: {}, values: {}, sensors, enteredT: 0, history: [],
    };
  }

  get stateId(): string {
    return this.s.stateId;
  }
  get stateT(): number {
    return this.s.stateT;
  }
  get scenarioT(): number {
    return this.s.scenarioT;
  }
  get paused(): boolean {
    return this.s.paused;
  }
  get started(): boolean {
    return this.s.started;
  }
  get enteredT(): number {
    return this.s.enteredT;
  }
  get history(): ReadonlyArray<{ t: number; stateId: string; transitionId?: string }> {
    return this.s.history;
  }
  state(): ScenarioState {
    return this.states.get(this.s.stateId) as ScenarioState;
  }

  /** Setup batch from `patient` (rhythm, baseline targets, sensors, mode) + the initial state's onEnter. */
  start(t: number): RunnerEffect[] {
    if (this.s.started) throw new Error('scenario already started');
    this.log.push({ op: 'start', t, seed: this.seed });
    this.s.started = true;
    this.s.lastT = t;
    const p = this.doc.patient;
    const setup: DocCommand[] = [];
    if (this.doc.mode === 'modeled') setup.push({ type: 'setMode', mode: 'modeled' });
    if (p?.rhythm) setup.push({ type: 'setRhythm', rhythm: p.rhythm.id, when: 'now', ...(p.rhythm.opts ? { opts: p.rhythm.opts } : {}) });
    for (const [variable, value] of Object.entries(p?.baseline ?? {})) {
      if (value !== undefined) setup.push({ type: 'setTarget', variable: variable as never, value });
    }
    for (const [sensor, state] of Object.entries(p?.sensors ?? {})) {
      if (state !== undefined) setup.push({ type: 'attachSensor', sensor: sensor as SensorId, state });
    }
    return this.enter(t, this.doc.initialState, undefined, setup, 'start');
  }

  /** One step: credit timers, take inputs, then try the current state's transitions (at most one fires). */
  advance(t: number, inputs: RunnerInput[] = []): RunnerEffect[] {
    if (!this.s.started) return [];
    const at = this.log.length;
    this.sync(t);
    for (const i of inputs) this.take(t, i);
    this.trackVitals(0);
    const out = this.s.paused ? [] : this.evaluate(t);
    if (inputs.length || out.length) this.log.splice(at, 0, { op: 'advance', t, inputs: structuredClone(inputs) });
    return out;
  }

  goto(t: number, stateId: string): RunnerEffect[] {
    if (!this.states.has(stateId)) throw new Error(`no state ${stateId}`);
    this.sync(t);
    this.log.push({ op: 'goto', t, stateId });
    return this.enter(t, stateId, undefined, [], 'goto');
  }

  /** Press a transition's manual button (or force a transition that has none). It is evaluated on the next advance. */
  trigger(t: number, transitionId: string): { ok: boolean; reason?: string } {
    const tr = this.state().transitions?.find((x) => x.id === transitionId);
    if (!tr) return { ok: false, reason: `no transition ${transitionId} in state ${this.s.stateId}` };
    this.sync(t);
    this.log.push({ op: 'trigger', t, transitionId });
    if (!this.s.pressed.includes(transitionId)) this.s.pressed.push(transitionId);
    return { ok: true };
  }

  pause(t: number): void {
    this.sync(t);
    this.log.push({ op: 'pause', t });
    this.s.paused = true;
  }
  resume(t: number): void {
    this.sync(t);
    this.log.push({ op: 'resume', t });
    this.s.paused = false;
  }

  getState(): RunnerState {
    return structuredClone(this.s);
  }
  setState(st: RunnerState): void {
    if (st.schema !== 'pme-scenario-runner/1' || st.docId !== this.doc.id) throw new Error(`runner state is for ${st.docId}, not ${this.doc.id}`);
    this.s = structuredClone(st);
    this.log.push({ op: 'restore', t: st.lastT, state: structuredClone(st) });
  }

  /** The value a vital trigger would read now (for the panel and tests). */
  value(name: string): number | undefined {
    return this.s.values[name]?.v;
  }

  // --- internals ---------------------------------------------------------------------------------------------
  /** Credit the time since the last call to the timers (not while paused), using the values held so far. */
  private sync(t: number): void {
    const dt = Math.max(0, t - this.s.lastT);
    this.s.lastT = t;
    if (this.s.paused || dt === 0) return;
    this.s.stateT += dt;
    this.s.scenarioT += dt;
    this.trackVitals(dt);
  }

  private take(t: number, i: RunnerInput): void {
    if (i.kind === 'clinical') this.s.latched.push({ seq: ++this.s.seq, event: i.event });
    else if (i.kind === 'sensor') this.s.sensors[i.sensor] = i.state;
    else {
      for (const [k, v] of Object.entries(i.values)) {
        if (!Number.isFinite(v)) continue;
        for (const name of ALIAS[k] && ALIAS[k] !== k ? [k, ALIAS[k]] : [k]) {
          const cur = this.s.values[name];
          if (!cur || i.rank >= cur.rank || t - cur.t > STALE_S) this.s.values[name] = { v, rank: i.rank, t };
        }
      }
    }
  }

  /** Walk every vital leaf of the current state: add dt while true, reset to 0 when false. */
  private trackVitals(dt: number): void {
    for (const tr of this.state().transitions ?? []) {
      walk(tr.when, tr.id, (w, key) => {
        if (!('vital' in w)) return;
        const cur = this.s.values[w.vital.var]?.v;
        const ok = cur !== undefined && compare(cur, w.vital.op, w.vital.value);
        this.s.trueFor[key] = ok ? (this.s.trueFor[key] ?? 0) + dt : 0;
      });
    }
  }

  private evaluate(t: number): RunnerEffect[] {
    for (const tr of this.state().transitions ?? []) {
      const pressed = this.s.pressed.includes(tr.id);
      const forced = pressed && !hasManual(tr.when);
      const r = forced ? { ok: true, events: [] as number[] } : this.holds(tr.when, tr.id, pressed, new Set());
      if (!r.ok) continue;
      this.s.latched = this.s.latched.filter((e) => !r.events.includes(e.seq));
      this.s.pressed = this.s.pressed.filter((id) => id !== tr.id);
      let to = tr.to;
      let tid = tr.id;
      if (tr.probability !== undefined) {
        const u = uniform(this.s.rng);
        const success = u < tr.probability;
        this.log.push({ op: 'roll', t, transitionId: tr.id, u, p: tr.probability, success });
        if (!success) {
          to = tr.else ?? this.s.stateId;
          tid = `${tr.id}:else`;
        }
      }
      if (to === this.s.stateId) return [this.stay(t, tid)];
      return this.enter(t, to, tid, [], 'transition');
    }
    return [];
  }

  private holds(w: When, key: string, pressed: boolean, used: Set<number>): { ok: boolean; events: number[] } {
    const no = { ok: false, events: [] };
    if ('afterS' in w) return { ok: this.s.stateT >= w.afterS - EPS, events: [] };
    if ('atScenarioS' in w) return { ok: this.s.scenarioT >= w.atScenarioS - EPS, events: [] };
    if ('vital' in w) {
      const cur = this.s.values[w.vital.var]?.v;
      const ok = cur !== undefined && compare(cur, w.vital.op, w.vital.value) && (this.s.trueFor[key] ?? 0) >= (w.vital.forS ?? 0) - EPS;
      return { ok, events: [] };
    }
    if ('event' in w) {
      const hit = this.s.latched.find((e) => !used.has(e.seq) && matches(e.event, w.event));
      if (!hit) return no;
      used.add(hit.seq);
      return { ok: true, events: [hit.seq] };
    }
    if ('sensor' in w) return { ok: this.s.sensors[w.sensor.sensor] === w.sensor.state, events: [] };
    if ('manual' in w) return { ok: pressed, events: [] };
    if ('all' in w) {
      const events: number[] = [];
      for (let i = 0; i < w.all.length; i++) {
        const r = this.holds(w.all[i] as When, `${key}.${i}`, pressed, used);
        if (!r.ok) return no;
        events.push(...r.events);
      }
      return { ok: true, events };
    }
    for (let i = 0; i < w.any.length; i++) {
      const r = this.holds(w.any[i] as When, `${key}.${i}`, pressed, used);
      if (r.ok) return r;
    }
    return no;
  }

  private stay(t: number, transitionId: string): RunnerEffect {
    this.log.push({ op: 'enter', t, stateId: this.s.stateId, transitionId });
    this.pushHistory({ t, stateId: this.s.stateId, transitionId });
    return { kind: 'event', event: { type: 'scenario', t, stateId: this.s.stateId, transitionId } };
  }

  private enter(t: number, to: string, transitionId: string | undefined, pre: DocCommand[], reason: 'start' | 'transition' | 'goto'): RunnerEffect[] {
    const from = this.states.get(this.s.stateId) as ScenarioState;
    const next = this.states.get(to) as ScenarioState;
    const commands = [...pre, ...(reason === 'start' ? [] : (from.onExit ?? [])), ...(next.onEnter ?? [])].map(strip);
    this.s.stateId = to;
    this.s.stateT = 0;
    this.s.enteredT = t;
    this.s.latched = [];
    this.s.pressed = [];
    this.s.trueFor = {};
    this.trackVitals(0);
    this.log.push({ op: 'enter', t, stateId: to, ...(transitionId ? { transitionId } : {}) });
    this.pushHistory({ t, stateId: to, ...(transitionId ? { transitionId } : {}) });
    const out: RunnerEffect[] = [];
    if (commands.length) out.push({ kind: 'commands', batch: ++this.s.batch, reason, commands });
    out.push({ kind: 'event', event: { type: 'scenario', t, stateId: to, ...(transitionId ? { transitionId } : {}) } });
    return out;
  }

  private pushHistory(h: { t: number; stateId: string; transitionId?: string }): void {
    this.s.history.push(h);
    if (this.s.history.length > HISTORY_MAX) this.s.history.splice(0, this.s.history.length - HISTORY_MAX);
  }
}

export function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return Math.abs(a - b) < EPS;
    case '!=':
      return Math.abs(a - b) >= EPS;
  }
}

/** Does a clinical event satisfy an `event` trigger? kind equal, min* filters as lower bounds, the rest exact. */
export function matches(e: ClinicalEvent, f: EventFilter): boolean {
  const rec = e as unknown as Record<string, unknown>;
  for (const [k, want] of Object.entries(f)) {
    const field = MIN_FILTERS[k];
    if (field !== undefined) {
      const got = rec[field];
      if (typeof got !== 'number' || got < (want as number)) return false;
    } else if (rec[k] !== want) return false;
  }
  return true;
}

export function hasManual(w: When): boolean {
  if ('manual' in w) return true;
  if ('all' in w) return w.all.some(hasManual);
  if ('any' in w) return w.any.some(hasManual);
  return false;
}

/** Visit every leaf with its key (`<transitionId>` then `.i` per all/any level — the same keys holds() uses). */
function walk(w: When, key: string, fn: (w: When, key: string) => void): void {
  if ('all' in w) w.all.forEach((c, i) => walk(c, `${key}.${i}`, fn));
  else if ('any' in w) w.any.forEach((c, i) => walk(c, `${key}.${i}`, fn));
  else fn(w, key);
}

/** Drop `$comment` so it never reaches the wire. */
function strip(c: DocCommand): DocCommand {
  const { $comment: _drop, ...rest } = c;
  return rest as DocCommand;
}

export type { Transition };
```

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/runner.test.ts`
Expected: `Tests  18 passed (18)`. The poll-rate test ("timers do not depend on the polling rate") is the one that catches an implementation that evaluates vitals only at polls: both runs must fire at exactly 12.5 s.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/scenario/runner.ts packages/controller/test/scenario/fixtures.ts packages/controller/test/scenario/runner.test.ts
git commit -m "feat(scenario): pure tick-driven runner — all trigger types, priority, combinators, stay, pause, goto"
```

---

### Task 6: Probability on the seeded `scenario` stream

**Files:**
- Create: `packages/controller/test/scenario/probability.test.ts`

**Interfaces:**
- Consumes: Task 5's runner (the draw is already implemented in `evaluate()`; this task pins its statistics — BUILD-PLAN Stage 6 acceptance 5).

- [ ] **Step 1: Write the test**

```ts
// probability/else on the `scenario` PRNG stream (brief §3.3, §7.4; BUILD-PLAN Stage 6 acceptance 5).
import { describe, expect, it } from 'vitest';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { doc, shock } from './fixtures.ts';

const d = doc([{ id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3, else: 'c' }]);
/** Shock at 10 s; returns where it went. */
function trial(seed: number): string {
  const r = new ScenarioRunner(d, { seed });
  r.start(0);
  r.advance(10, [shock()]);
  return r.stateId;
}
/** The roll outcomes (1 = success) of up to 20 shocks, 2 min apart, with else → stay. */
function path(seed: number): string {
  const r = new ScenarioRunner(doc([{ id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3 }]), { seed });
  r.start(0);
  for (let k = 1; k <= 20 && r.stateId === 'a'; k++) r.advance(k * 120, [shock()]);
  return r.log.flatMap((e) => (e.op === 'roll' ? [e.success ? 1 : 0] : [])).join('');
}

describe('probability', () => {
  it('same seed → same path', () => {
    for (const seed of [1, 42, 99]) expect(path(seed)).toBe(path(seed));
  });

  it('different seeds → different paths', () => {
    const paths = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(path));
    expect(paths.size).toBeGreaterThan(3);
  });

  it('the document seed is the default; an explicit seed overrides it', () => {
    expect(new ScenarioRunner(d).seed).toBe(1);
    expect(new ScenarioRunner(d, { seed: 9 }).seed).toBe(9);
  });

  it('p = 0.3 over 10,000 seeded trials gives 0.30 ± 0.01; failures take else', () => {
    let hit = 0;
    let other = 0;
    for (let seed = 1; seed <= 10_000; seed++) {
      const s = trial(seed);
      if (s === 'b') hit++;
      else if (s === 'c') other++;
    }
    expect(hit + other).toBe(10_000);
    console.log(`p 0.3 × 10,000: ${hit / 10_000}`);
    expect(Math.abs(hit / 10_000 - 0.3)).toBeLessThanOrEqual(0.01);
  });

  it('p = 0.3 over 1,000 seeded trials is within 3σ (±0.045)', () => {
    let hit = 0;
    for (let seed = 20_001; seed <= 21_000; seed++) if (trial(seed) === 'b') hit++;
    console.log(`p 0.3 × 1,000: ${hit / 1000}`);
    expect(Math.abs(hit / 1000 - 0.3)).toBeLessThanOrEqual(0.045);
  });

  it('p = 1 always fires', () => {
    const r = new ScenarioRunner(doc([{ id: 'x', when: { afterS: 1 }, probability: 1 }]));
    r.start(0);
    r.advance(1);
    expect(r.stateId).toBe('b');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/probability.test.ts`
Expected: `Tests  6 passed (6)` and the printed lines `p 0.3 × 10,000: 0.298` and `p 0.3 × 1,000: 0.306` (exact, because the seeds are fixed). A different number means the stream derivation changed: the runner must use `seedStream(seed, 'scenario')` and one `uniform()` per roll.

- [ ] **Step 3: Commit**

```bash
git add packages/controller/test/scenario/probability.test.ts
git commit -m "test(scenario): probability determinism and frequency (10,000 seeded trials: 0.298)"
```

---

### Task 7: Replay log

**Files:**
- Create: `packages/controller/src/scenario/replay.ts`, `packages/controller/test/scenario/replay.test.ts`

**Interfaces:**
- Produces: `type ScenarioRunLog = { schema: 'pme-scenario-log/1'; docId; seed; entries: RunLogEntry[] }`; `runLog(runner)`; `replayRunLog(doc, log) → { ok, firstDiff, decisions }` (decisions = `enter` and `roll` entries).

- [ ] **Step 1: Write the failing test**

```ts
// The runner's replay log (brief §3.3): feeding the logged inputs and control calls to a fresh runner with the
// same seed reproduces every decision; another seed changes the probabilistic ones.
import { describe, expect, it } from 'vitest';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { doc, drug, shock, vals } from './fixtures.ts';

const d = doc([
  { id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3 },
  { id: 'hot', to: 'c', when: { all: [{ event: { kind: 'drug', drugId: 'epinephrine' } }, { vital: { var: 'hr', op: '>', value: 150, forS: 5 } }] } },
]);

function session(seed: number): ScenarioRunner {
  const r = new ScenarioRunner(d, { seed });
  r.start(0);
  for (let k = 1; k <= 8 && r.stateId === 'a'; k++) r.advance(k * 30, [shock()]);
  r.pause(250);
  r.advance(260, [vals({ hr: 160 })]);
  r.resume(270);
  r.advance(271, [drug('epinephrine')]);
  r.advance(290);
  return r;
}

describe('replay log', () => {
  it('replays to identical decisions (rolls and state entries)', () => {
    const r = session(5);
    const log = runLog(r);
    expect(log.entries.some((e) => e.op === 'roll')).toBe(true);
    const res = replayRunLog(d, log);
    expect(res).toMatchObject({ ok: true, firstDiff: -1 });
    expect(JSON.parse(JSON.stringify(log))).toEqual(log); // plain JSON, storable next to the command log
  });

  it('a goto, a trigger and a restore in the log replay too', () => {
    const r = new ScenarioRunner(d, { seed: 2 });
    r.start(0);
    r.advance(1);
    const saved = r.getState();
    r.goto(5, 'b');
    r.setState(saved);
    r.trigger(6, 'shock');
    r.advance(6);
    expect(replayRunLog(d, runLog(r)).ok).toBe(true);
  });

  it('the same log with another seed diverges at a roll', () => {
    const log = runLog(session(5));
    const results = [6, 7, 8, 9, 10].map((seed) => replayRunLog(d, { ...log, seed }));
    const bad = results.find((x) => !x.ok);
    expect(bad).toBeDefined();
    expect(bad!.firstDiff).toBeGreaterThanOrEqual(0);
  });

  it('refuses a log for another document', () => {
    expect(() => replayRunLog(d, { schema: 'pme-scenario-log/1', docId: 'other', seed: 1, entries: [] })).toThrow('log is for other, not test');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/replay.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/replay.ts"`.

- [ ] **Step 3: Implement**

`packages/controller/src/scenario/replay.ts`:
```ts
// Scenario replay (brief §3.3: seed + command log reproduce the run). The runner's log holds every input and
// control call; feeding them to a fresh runner with the same seed must reproduce every decision (state entries
// and probability rolls) exactly. 'dispatch' entries are the driver's bookkeeping and are not replayed.
import { ScenarioRunner, type RunLogEntry } from './runner.ts';
import type { ScenarioDoc } from './types.ts';

export interface ScenarioRunLog {
  schema: 'pme-scenario-log/1';
  docId: string;
  seed: number;
  entries: RunLogEntry[];
}

const DECISIONS = new Set<RunLogEntry['op']>(['enter', 'roll']);

export function runLog(r: ScenarioRunner): ScenarioRunLog {
  return { schema: 'pme-scenario-log/1', docId: r.doc.id, seed: r.seed, entries: structuredClone(r.log) };
}

/** Re-run a log; `ok` when the replayed decisions equal the recorded ones, entry for entry. */
export function replayRunLog(doc: ScenarioDoc, log: ScenarioRunLog): { ok: boolean; firstDiff: number; decisions: RunLogEntry[] } {
  if (log.docId !== doc.id) throw new Error(`log is for ${log.docId}, not ${doc.id}`);
  const r = new ScenarioRunner(doc, { seed: log.seed });
  for (const e of log.entries) {
    switch (e.op) {
      case 'start':
        r.start(e.t);
        break;
      case 'advance':
        r.advance(e.t, structuredClone(e.inputs));
        break;
      case 'goto':
        r.goto(e.t, e.stateId);
        break;
      case 'trigger':
        r.trigger(e.t, e.transitionId);
        break;
      case 'pause':
        r.pause(e.t);
        break;
      case 'resume':
        r.resume(e.t);
        break;
      case 'restore':
        r.setState(e.state);
        break;
      default:
        break;
    }
  }
  const want = log.entries.filter((e) => DECISIONS.has(e.op));
  const got = r.log.filter((e) => DECISIONS.has(e.op));
  let firstDiff = -1;
  for (let i = 0; i < Math.max(want.length, got.length); i++) {
    if (JSON.stringify(want[i]) !== JSON.stringify(got[i])) {
      firstDiff = i;
      break;
    }
  }
  return { ok: firstDiff === -1, firstDiff, decisions: got };
}
```

- [ ] **Step 4: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/replay.test.ts`
Expected: `Tests  4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/scenario/replay.ts packages/controller/test/scenario/replay.test.ts
git commit -m "feat(scenario): replay log — inputs and control calls reproduce every decision"
```

---

### Task 8: `ScenarioView` and trigger text (controller side, no ajv)

**Files:**
- Create: `packages/controller/src/scenario/describe.ts`, `packages/controller/src/scenario/view.ts`, `packages/controller/test/scenario/view.test.ts`
- Modify: `packages/controller/src/session/controller-session.ts`

**Interfaces:**
- Produces: `describeWhen(w)`, `describeTransition(t)`, `manualLabel(w)`; `class ScenarioView { doc, docVersion, stateId, enteredT, paused, history, onEvent(e): boolean, current(), timeInState(simT), next(): NextTransition[], stateLabel(id?) }`; `ControllerSession.scenario: ScenarioView` (fed from every host event); log entries of kind `'scenario'` (`→ vf (arrest)`).

- [ ] **Step 1: Write the failing test**

```ts
// ScenarioView: what a controller rebuilds from the wire alone.
import { describe, expect, it } from 'vitest';
import { ScenarioView } from '../../src/scenario/view.ts';
import { describeTransition, describeWhen, manualLabel } from '../../src/scenario/describe.ts';
import type { WireEvent } from '../../src/protocol.ts';
import { doc } from './fixtures.ts';

const d = doc([
  { id: 'shock', label: 'Shock', to: 'b', when: { event: { kind: 'defib', action: 'shock', minJ: 150 } }, probability: 0.3, else: 'a' },
  { id: 'rosc', to: 'b', when: { manual: { label: 'ROSC now' } } },
]);
const applied = (action: string, tick: number, extra: object = {}): WireEvent => ({
  type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'p', type: 'scenario', action, ...extra } },
}) as WireEvent;
const scn = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) });

describe('ScenarioView', () => {
  it('load sets the doc; scenario events move the state; a stay keeps the entry time', () => {
    const v = new ScenarioView();
    expect(v.onEvent(applied('load', 50, { doc: d }))).toBe(true);
    expect(v.doc?.id).toBe('test');
    expect(v.stateId).toBe('a');
    v.onEvent(scn(1, 'a'));
    v.onEvent(scn(30, 'a', 'shock:else'));
    expect(v.enteredT).toBe(1);
    expect(v.timeInState(41)).toBe(40);
    v.onEvent(scn(45, 'b', 'rosc'));
    expect(v.enteredT).toBe(45);
    expect(v.history.map((h) => h.stateId)).toEqual(['a', 'a', 'b']);
  });

  it('pause freezes time in state; resume subtracts the paused span', () => {
    const v = new ScenarioView();
    v.onEvent(applied('load', 0, { doc: d }));
    v.onEvent(scn(0, 'a'));
    v.onEvent(applied('pause', 500)); // 10 s
    expect(v.timeInState(99)).toBe(10);
    v.onEvent(applied('resume', 1500)); // 30 s
    expect(v.timeInState(40)).toBe(20);
  });

  it('next() lists the current transitions with text and manual labels', () => {
    const v = new ScenarioView();
    v.onEvent(applied('load', 0, { doc: d }));
    expect(v.next()).toEqual([
      { id: 'shock', to: 'b', label: 'Shock', text: 'defib shock ≥ 150 J → b · p 0.3 else → a', manual: null },
      { id: 'rosc', to: 'b', label: 'rosc', text: 'button "ROSC now" → b', manual: 'ROSC now' },
    ]);
  });

  it('describe covers every trigger kind', () => {
    expect(describeWhen({ afterS: 60 })).toBe('after 60 s in state');
    expect(describeWhen({ atScenarioS: 300 })).toBe('at scenario 300 s');
    expect(describeWhen({ vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } })).toBe('etco2 ≥ 20 for 30 s');
    expect(describeWhen({ event: { kind: 'drug', drugId: 'adenosine', minDose: 6 } })).toBe('drug adenosine dose ≥ 6');
    expect(describeWhen({ sensor: { sensor: 'spo2', state: 'off' } })).toBe('spo2 off');
    expect(describeWhen({ any: [{ afterS: 1 }, { manual: { label: 'Go' } }] })).toBe('any of (after 1 s in state; button "Go")');
    expect(describeTransition({ id: 'x', to: 'y', when: { afterS: 1 }, probability: 0.5 })).toBe('after 1 s in state → y · p 0.5 else stay');
    expect(manualLabel({ all: [{ afterS: 1 }, { manual: { label: 'Go' } }] })).toBe('Go');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/view.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/view.ts"`.

- [ ] **Step 3: Implement**

`packages/controller/src/scenario/describe.ts`:
```ts
// Human-readable trigger text for the panel and the remote ("EtCO2 ≥ 20 for 30 s", …). Pure; no ajv.
import type { Transition, When } from './types.ts';

const OP: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' };
const MIN_TEXT: Record<string, string> = { minJ: '≥ %s J', minDose: 'dose ≥ %s', minVolumeMl: '≥ %s mL', minMa: '≥ %s mA' };

export function describeWhen(w: When): string {
  if ('afterS' in w) return `after ${w.afterS} s in state`;
  if ('atScenarioS' in w) return `at scenario ${w.atScenarioS} s`;
  if ('vital' in w) return `${w.vital.var} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${w.vital.forS ? ` for ${w.vital.forS} s` : ''}`;
  if ('event' in w) {
    const parts = Object.entries(w.event)
      .filter(([k]) => k !== 'kind')
      .map(([k, v]) => (MIN_TEXT[k] ? (MIN_TEXT[k] as string).replace('%s', String(v)) : String(v)));
    return `${w.event.kind}${parts.length ? ` ${parts.join(' ')}` : ''}`;
  }
  if ('sensor' in w) return `${w.sensor.sensor} ${w.sensor.state}`;
  if ('manual' in w) return `button "${w.manual.label}"`;
  if ('all' in w) return `all of (${w.all.map(describeWhen).join('; ')})`;
  return `any of (${w.any.map(describeWhen).join('; ')})`;
}

export function describeTransition(t: Transition): string {
  const p = t.probability !== undefined ? ` · p ${t.probability}${t.else ? ` else → ${t.else}` : ' else stay'}` : '';
  return `${describeWhen(t.when)} → ${t.to}${p}`;
}

/** The manual label of a transition, or null when it has no manual trigger. */
export function manualLabel(w: When): string | null {
  if ('manual' in w) return w.manual.label;
  if ('all' in w || 'any' in w) {
    for (const c of 'all' in w ? w.all : w.any) {
      const l = manualLabel(c);
      if (l !== null) return l;
    }
  }
  return null;
}
```

`packages/controller/src/scenario/view.ts`:
```ts
// What a controller knows about the host's scenario, rebuilt from the wire alone (no ajv, no runner): the doc from
// the `scenario load` commandApplied (sticky, so late joiners get it), the current state from `scenario` events,
// pause state from `scenario pause/resume`. ControllerSession owns one, so the panel and the remote share it.
import type { AppliedResolution, WireEvent } from '../protocol.ts';
import { describeTransition, manualLabel } from './describe.ts';
import type { ScenarioDoc, ScenarioState } from './types.ts';

export interface NextTransition {
  id: string;
  to: string;
  label: string;
  text: string;
  /** The manual button's label, or null (the panel then offers "Force"). */
  manual: string | null;
}

const TICK_S = 0.02;

export class ScenarioView {
  doc: ScenarioDoc | null = null;
  /** Bumped when the doc changes (the panel rebuilds its lists only then). */
  docVersion = 0;
  stateId: string | null = null;
  enteredT = 0;
  paused = false;
  history: Array<{ t: number; stateId: string; transitionId?: string }> = [];
  private pausedAt: number | null = null;
  private pausedTotal = 0;

  /** Returns true when something the UI shows changed. */
  onEvent(e: WireEvent): boolean {
    if (e.type === 'scenario') {
      if (e.stateId !== this.stateId || e.transitionId === undefined) {
        this.stateId = e.stateId;
        this.enteredT = e.t;
        this.pausedTotal = 0;
        this.pausedAt = this.paused ? e.t : null;
      }
      this.history = [...this.history.slice(-199), { t: e.t, stateId: e.stateId, ...(e.transitionId ? { transitionId: e.transitionId } : {}) }];
      return true;
    }
    if (e.type !== 'commandApplied') return false;
    const c = (e.resolved as AppliedResolution | undefined)?.command;
    if (c?.type !== 'scenario') return false;
    const t = e.tick * TICK_S;
    if (c.action === 'load' && c.doc && typeof c.doc === 'object') {
      this.doc = c.doc as ScenarioDoc;
      this.docVersion++;
      this.stateId = this.doc.initialState;
      this.enteredT = t;
      this.paused = false;
      this.pausedAt = null;
      this.pausedTotal = 0;
      this.history = [];
      return true;
    }
    if (c.action === 'pause' && !this.paused) {
      this.paused = true;
      this.pausedAt = t;
      return true;
    }
    if (c.action === 'resume' && this.paused) {
      this.paused = false;
      if (this.pausedAt !== null) this.pausedTotal += Math.max(0, t - this.pausedAt);
      this.pausedAt = null;
      return true;
    }
    return false;
  }

  current(): ScenarioState | null {
    return this.doc?.states.find((s) => s.id === this.stateId) ?? null;
  }

  /** Scenario time spent in the current state (sim seconds, pauses excluded). */
  timeInState(simT: number): number {
    const end = this.paused && this.pausedAt !== null ? this.pausedAt : simT;
    return Math.max(0, end - this.enteredT - this.pausedTotal);
  }

  next(): NextTransition[] {
    return (this.current()?.transitions ?? []).map((t) => ({
      id: t.id, to: t.to, label: t.label ?? t.id, text: describeTransition(t), manual: manualLabel(t.when),
    }));
  }

  stateLabel(id: string | null = this.stateId): string {
    const s = this.doc?.states.find((x) => x.id === id);
    return s?.label ?? id ?? '—';
  }
}
```

- [ ] **Step 4: Give `ControllerSession` a view and a `scenario` log line**

In `packages/controller/src/session/controller-session.ts`:
1. Replace `} from '../protocol.ts';` (the end of the first import) with:
```ts
} from '../protocol.ts';
import { ScenarioView } from '../scenario/view.ts';
```
2. Replace `  kind: 'command' | 'ack' | 'applied' | 'note' | 'status' | 'alarm' | 'marker';` with:
```ts
  kind: 'command' | 'ack' | 'applied' | 'note' | 'status' | 'alarm' | 'marker' | 'scenario';
```
3. Replace `  bookmarks: string[] = [];` with:
```ts
  bookmarks: string[] = [];
  /** The host's scenario as seen from here (Stage 6b). */
  readonly scenario = new ScenarioView();
```
4. In `onEvent`, replace `    if (e.type === 'state') this.state = e;` with:
```ts
    this.scenario.onEvent(e);
    if (e.type === 'state') this.state = e;
```
5. Replace `    else if (e.type === 'marker') this.addLog('marker', e.kind);` with:
```ts
    else if (e.type === 'marker') this.addLog('marker', e.kind);
    else if (e.type === 'scenario') this.addLog('scenario', `→ ${e.stateId}${e.transitionId ? ` (${e.transitionId})` : ''}`);
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/view.test.ts
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
```
Expected: `Tests  4 passed (4)`; typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/controller/src/scenario/describe.ts packages/controller/src/scenario/view.ts packages/controller/test/scenario/view.test.ts packages/controller/src/session/controller-session.ts
git commit -m "feat(controller): ScenarioView rebuilt from the wire; scenario lines in the controller log"
```

---

### Task 9: `HostSession` — scenario hook for every action, `submit()`, `publish()`, `welcomeEvents`

**Files:**
- Modify: `packages/controller/src/session/host-session.ts`
- Create: `packages/controller/test/session/host-scenario-hook.test.ts`

**Interfaces:**
- Produces: `type ScenarioHookResult = DispatchResult & { applied?: ScenarioCommand }`; `ScenarioHook` now returns it; `HostSessionOptions.welcomeEvents?: () => WireEvent[]`; `HostSession.submit(cmd: WireCommand): Promise<DispatchResult>` (same path as a remote command — stage groups, sticky, stats, `commandApplied` — minus the ack; serialised on the same chain as incoming messages); `HostSession.publish(e: WireEvent)`. With a hook, every scenario action goes to it; accepted `load` and `pause|resume` become sticky (`scenario.load`, `scenario.run`), `bookmark` stays sticky as in 6a, and an accepted `restoreBookmark` makes the host say hello again (viewers resync) as in 6a.

- [ ] **Step 1: Write the failing test**

```ts
// HostSession ↔ scenario hook (Stage 6b): every scenario action goes to the hook when there is one; `applied`
// replaces the command in commandApplied; load and pause/resume become sticky; submit()/publish() for the runner.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession, type ScenarioHook } from '../../src/session/host-session.ts';
import { createStamper, type AppliedResolution, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HOK234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function setup(hook: ScenarioHook, welcome: WireEvent[] = []) {
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs: 0, scenario: hook, welcomeEvents: () => welcome });
  hs.addTransport(hub.connect());
  const peer = hub.connect();
  const got = collect(peer);
  const stamp = createStamper(S, 'peer-1');
  let n = 0;
  const command = (body: Record<string, unknown>) => peer.send(stamp({ kind: 'command', body: { id: `k${++n}`, issuedBy: 'test', ...body } as never }));
  const events = () => got.flatMap((m) => (m.kind === 'event' ? m.body : []));
  const of = <K extends WireMessage['kind']>(k: K) => got.filter((m) => m.kind === k) as Array<Extract<WireMessage, { kind: K }>>;
  return { host, hub, peer, stamp, command, events, of, hs: hs as HostSession };
}

describe('HostSession scenario hook', () => {
  it('routes bookmarks to the hook too, and announces the hook’s applied command', async () => {
    const seen: string[] = [];
    const { command, events, hs } = setup((c) => {
      seen.push(c.action);
      return { accepted: true, tick: 7, applied: { ...c, target: 'labelled' } };
    });
    command({ type: 'scenario', action: 'bookmark' });
    await waitFor(() => events().some((e) => e.type === 'commandApplied'));
    expect(seen).toEqual(['bookmark']);
    expect(hs.bookmarks()).toEqual([]); // the hook owns bookmarks now
    const a = events().find((e) => e.type === 'commandApplied') as Extract<WireEvent, { type: 'commandApplied' }>;
    expect((a.resolved as AppliedResolution).command).toMatchObject({ action: 'bookmark', target: 'labelled' });
  });

  it('a refused action is acked with the hook’s reason', async () => {
    const { command, of } = setup(() => ({ accepted: false, tick: 0, reason: 'no scenario loaded' }));
    command({ type: 'scenario', action: 'goto', target: 'x' });
    await waitFor(() => of('ack').length === 1);
    expect(of('ack')[0]).toMatchObject({ accepted: false, reason: 'no scenario loaded' });
  });

  it('late joiners get the sticky load (with its doc), the scenario run state, then the welcome events', async () => {
    const welcome: WireEvent[] = [{ type: 'scenario', t: 12, stateId: 'vf' }];
    const { command, peer, stamp, of } = setup((c) => ({ accepted: true, tick: 1, applied: c.action === 'load' ? { ...c, doc: { id: 'd' } } : c }), welcome);
    command({ type: 'scenario', action: 'load', target: 'd' });
    command({ type: 'scenario', action: 'pause' });
    await waitFor(() => of('ack').length === 2);
    peer.send(stamp({ kind: 'hello', role: 'controller' }));
    await waitFor(() => of('snapshot').length === 1);
    const msg = of('event').at(-1)!;
    const body = msg.body.map((e) => (e.type === 'commandApplied' ? `${((e.resolved as AppliedResolution).command as { action: string }).action}${(e.resolved as AppliedResolution).replay ? '*' : ''}` : e.type));
    expect(body).toEqual(['load*', 'pause*', 'scenario']);
  });

  it('submit() applies a host-side command like a remote one (stats + commandApplied); publish() broadcasts', async () => {
    const { events, hs } = setup(() => ({ accepted: true, tick: 0 }));
    const r = await hs.submit({ id: 's1', issuedBy: 'scenario', type: 'setTarget', variable: 'hr', value: 99 });
    expect(r.accepted).toBe(true);
    hs.publish({ type: 'scenario', t: 1, stateId: 'x' });
    await waitFor(() => events().some((e) => e.type === 'scenario'));
    expect(hs.stats.applied).toBe(1);
    expect(events().some((e) => e.type === 'commandApplied' && e.commandId === 's1')).toBe(true);
    const bad = await hs.submit({ id: 's2', issuedBy: 'scenario', type: 'setTarget', variable: 'hr', value: 999 });
    expect(bad.accepted).toBe(false);
    expect(hs.stats.rejected).toBe(1);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/host-scenario-hook.test.ts`
Expected: FAIL — the first test sees `seen = []` (6a handles bookmarks before the hook) and `hs.submit is not a function`.

- [ ] **Step 3: Edit `host-session.ts`**

In `packages/controller/src/session/host-session.ts`:

1. Replace:
```ts
/** Stage 6b plugs the scenario runner in here; until then load/goto/trigger/pause/resume are rejected. */
export type ScenarioHook = (cmd: ScenarioCommand) => DispatchResult | Promise<DispatchResult>;
```
with:
```ts
/** What the scenario hook answers; `applied` replaces the command in commandApplied (e.g. a load with its doc). */
export type ScenarioHookResult = DispatchResult & { applied?: ScenarioCommand };
/**
 * Stage 6b's ScenarioDriver plugs in here. With a hook, EVERY scenario action (bookmarks included: they then hold
 * the runner state too) goes to it; without one, bookmarks are engine snapshots and the rest is rejected.
 */
export type ScenarioHook = (cmd: ScenarioCommand) => ScenarioHookResult | Promise<ScenarioHookResult>;
```
2. Replace:
```ts
  scenario?: ScenarioHook;
```
with:
```ts
  scenario?: ScenarioHook;
  /** Extra events sent to a peer that says hello, after the sticky replays (the scenario's current state). */
  welcomeEvents?: () => WireEvent[];
```
3. Replace:
```ts
  /** Send the queued events now (normally a microtask after the frame that produced them). */
```
with:
```ts
  /**
   * Apply a command issued on the host itself (the scenario runner): the same path as a remote command — stage
   * groups, sticky state, stats and a commandApplied that viewers mirror — minus the ack.
   */
  submit(cmd: WireCommand): Promise<DispatchResult> {
    const run = this.chain.then(async () => {
      const { result, applied } = await this.apply(cmd);
      if (!result.accepted) {
        this.stats.rejected++;
        return result;
      }
      this.stats.applied++;
      this.queue({ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
      return result;
    });
    this.chain = run.then(() => undefined, (err) => console.error('[pme host]', err));
    return run;
  }

  /** Broadcast an event that did not come from the engine (e.g. `scenario`), batched with this frame's events. */
  publish(e: WireEvent): void {
    this.queue(e);
  }

  /** Send the queued events now (normally a microtask after the frame that produced them). */
```
4. In `welcome()`, replace:
```ts
    this.flush();
    if (replay.length) t.send(this.stamp({ kind: 'event', body: replay }));
```
with:
```ts
    const body = [...replay, ...(this.o.welcomeEvents?.() ?? [])];
    this.flush();
    if (body.length) t.send(this.stamp({ kind: 'event', body }));
```
5. In `scenario()`, replace:
```ts
  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick } = this.o.target.now();
```
with:
```ts
  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick } = this.o.target.now();
    if (this.o.scenario) {
      const { applied: a, ...result } = await this.o.scenario(cmd);
      const applied = a ?? cmd;
      if (result.accepted) this.scenarioApplied(applied);
      return { result, applied };
    }
```
and, at the end of the same method, replace:
```ts
    if (this.o.scenario) return { result: await this.o.scenario(cmd), applied: cmd };
    return
```
with:
```ts
    return
```
(the rest of that last `return { result: { accepted: false, … 'the scenario runner arrives in Stage 6b' … } }` line stays: it now applies only to a host without a hook).
6. Replace:
```ts
  private pruneGroups(): void {
```
with:
```ts
  /** Sticky scenario state for late joiners, and a viewer resync after a restore. */
  private scenarioApplied(c: ScenarioCommand): void {
    if (c.action === 'bookmark') this.sticky.set(`bookmark.${c.target}`, c);
    if (c.action === 'load') {
      this.sticky.delete('scenario.run');
      this.sticky.set('scenario.load', c);
    }
    if (c.action === 'pause' || c.action === 'resume') this.sticky.set('scenario.run', c);
    if (c.action === 'restoreBookmark') queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
  }

  private pruneGroups(): void {
```

- [ ] **Step 4: Run the new test and the whole controller suite**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/host-scenario-hook.test.ts
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
npx -y pnpm@9.15.9 --filter @pme/controller test
```
Expected: `4 passed`; typecheck exit 0; `Tests  156 passed (156)` (every 6a test still passes — a host without a hook behaves exactly as before).

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/session/host-session.ts packages/controller/test/session/host-scenario-hook.test.ts
git commit -m "feat(controller): HostSession routes all scenario actions to the hook; submit(), publish(), welcomeEvents"
```

---
### Task 10: Built-in scenarios [draft] and rhythm stand-ins

**Files:**
- Create: `packages/controller/scenarios/acls-vf-witnessed.json`, `acls-pea-hypovolaemia.json`, `acls-bradycardia-unstable.json`, `svt-adenosine.json`, `or-induction-hypotension.json`; `packages/controller/src/scenario/standins.ts`, `packages/controller/src/scenario/builtins.ts`, `packages/controller/test/scenario/builtins.test.ts`

**Interfaces:**
- Produces: `BUILTIN_SCENARIOS: Record<string, unknown>` (id → raw doc), `BUILTIN_CATALOGUE: Array<{ id; title }>` (order: VF, PEA, bradycardia, SVT, OR); `RHYTHM_STAND_INS`, `resolveRhythm(id, opts, known) → { rhythm, opts?, note? }`, `type StandIn`.
- Clinical content summary (all [draft], for Ali's review at the gate):
  - **acls-vf-witnessed** (brief §7.4 example, expanded; seed 42): stable (60 s or "Start VF now") → coarse VF: shock ≥ 150 J → ROSC p 0.3 else stay; epinephrine + EtCO2 ≥ 20 for 30 s → ROSC (live when Stage 2 reports EtCO2); 240 s → fine VF (shock p 0.15; 300 s → asystole); manual "ROSC now". ROSC: sinus tachycardia 105 → HR 118 over 45 s (sigmoid); SBP 95 and the EtCO2 jump are in `$comment` for Stage 2. Jump points "Before the arrest", "VF onset".
  - **acls-pea-hypovolaemia** (seed 7): compensating haemorrhage (HR 118 → 142 over 120 s; early 1 L fluid → stabilised) → PEA at 150 s (sinus tachycardia 128, `pulseless: true`) → fluid ≥ 500 mL AND epinephrine → ROSC p 0.6 else stay; 300 s → slow PEA (wide escape 32) → 180 s → asystole.
  - **acls-bradycardia-unstable** (seed 11): CHB with a wide escape at 32/min → atropine ≥ 0.5 mg: partial response p 0.2 (HR 42, fades after 300 s); pacing with ≥ 70 mA (brief §6.5 default threshold) → paced (pacedVVI 70, stand-in until Stage 5); epinephrine infusion → HR 48; 420 s → asystole.
  - **svt-adenosine** (seed 3): AVNRT 180 → adenosine ≥ 6 mg → 15 s circulating → transient AV block (CHB narrow, atrial 110, escape 20/min, 6 s; brief §4.9: "AV block for 3–10 s, 10–30 s after the push") → sinus 92 → 80 (p 0.6) else SVT resumes (repeat dose allowed); manual "Vagal manoeuvre works".
  - **or-induction-hypotension** (seed 5): pre-induction (NIBP auto 3 min) → propofol or "Induce" → 60 s → hypotension: sinus tachycardia 102 (next beat) + HR 122 over 90 s (sigmoid); phenylephrine → sinus 100 → 82 over 60 s; ephedrine → HR 108; HR ≥ 115 for 20 s (vital trigger on the measured HR) → "profound". Every BP step is the exact command in `$comment`.

- [ ] **Step 1: Write the failing test**

`packages/controller/test/scenario/builtins.test.ts`:
```ts
// Built-in scenarios: valid against the schema, marked [draft], and every rhythm is either on this engine or has
// a stand-in; the BP steps that need Stage 2 live in $comment, never in commands.
import { RHYTHM_IDS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { BUILTIN_CATALOGUE, BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { RHYTHM_STAND_INS } from '../../src/scenario/standins.ts';
import type { DocCommand, ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const all = (d: ScenarioDoc): DocCommand[] => d.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);

describe('built-in scenarios', () => {
  it('lists the five Stage 6b scenarios', () => {
    expect(BUILTIN_CATALOGUE.map((c) => c.id)).toEqual(['acls-vf-witnessed', 'acls-pea-hypovolaemia', 'acls-bradycardia-unstable', 'svt-adenosine', 'or-induction-hypotension']);
  });

  it.each(Object.keys(BUILTIN_SCENARIOS))('%s is valid, [draft], and runnable on this engine', (id) => {
    const r = validateScenario(BUILTIN_SCENARIOS[id], { rhythms: RHYTHM_IDS });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const d = BUILTIN_SCENARIOS[id] as ScenarioDoc;
    expect(d.title.startsWith('[draft]')).toBe(true);
    for (const c of all(d)) {
      if (c.type === 'setRhythm') expect((RHYTHM_IDS as readonly string[]).includes(c.rhythm) || c.rhythm in RHYTHM_STAND_INS, c.rhythm).toBe(true);
      if (c.type === 'setTarget') expect(c.variable, 'only hr takes targets before Stage 2').toBe('hr');
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/builtins.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/builtins.ts"`.

- [ ] **Step 3: Write the five scenarios**

`packages/controller/scenarios/acls-vf-witnessed.json`:
```json
{
  "$comment": "[draft] Clinical content awaits Ali's review (Stage 6b gate). Brief §7.4 example, expanded. Probabilities are [ENG] placeholders: shock ROSC 0.3 in coarse VF (brief §6.5 'organised with pulse' raised for teaching), 0.15 in fine VF; decay to fine VF at 4 min and asystole 5 min later follow the three-phase model (research 03 §1.8). vfCoarse/vfFine are Stage 5 ids; until Stage 5 merges the host shows stand-ins (standins.ts).",
  "schema": "pme-scenario/1",
  "id": "acls-vf-witnessed",
  "title": "[draft] Witnessed VF in PACU",
  "notes": "58-year-old man in PACU after laparoscopic cholecystectomy. Nurse calls: 'he's not responding'. Shockable arrest; ROSC is probabilistic per shock and after epinephrine with good CPR (EtCO2 ≥ 20 mmHg for 30 s; needs Stage 2 for EtCO2).",
  "seed": 42,
  "mode": "manual",
  "patient": {
    "ageY": 58, "sex": "M", "weightKg": 80, "ageBand": "adult",
    "baseline": { "hr": 88 },
    "rhythm": { "id": "sinus" },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on", "co2": "off" }
  },
  "device": { "skin": "zoll-like", "layout": "acls" },
  "initialState": "stable",
  "states": [
    {
      "id": "stable", "label": "Stable in PACU", "notes": "Handover given. VF starts after 60 s (or press the button).",
      "$comment": "Stage 2+: add { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 132 } and dbp 78, spo2 97, etco2 36 to the patient baseline.",
      "onEnter": [ { "type": "device", "action": { "device": "nibp", "action": "auto", "intervalMin": 5 } } ],
      "transitions": [
        { "id": "arrest", "label": "Start VF now", "to": "vf", "when": { "any": [ { "afterS": 60 }, { "manual": { "label": "Start VF now" } } ] } }
      ]
    },
    {
      "id": "vf", "label": "Coarse VF",
      "notes": "Shock 150–200 J biphasic; CPR 2-min cycles; epinephrine 1 mg after the 2nd shock; amiodarone 300 mg after the 3rd.",
      "onEnter": [ { "type": "setRhythm", "rhythm": "vfCoarse", "when": "now" } ],
      "transitions": [
        { "id": "shockVf", "label": "Shock (p 0.3)", "to": "rosc", "when": { "event": { "kind": "defib", "action": "shock", "minJ": 150 } }, "probability": 0.3, "else": "vf" },
        { "id": "epiCpr", "label": "Epinephrine + good CPR", "to": "rosc",
          "when": { "all": [ { "event": { "kind": "drug", "drugId": "epinephrine" } }, { "vital": { "var": "etco2", "op": ">=", "value": 20, "forS": 30 } } ] } },
        { "id": "decay", "label": "Decay to fine VF", "to": "vfFine", "when": { "afterS": 240 } },
        { "id": "roscVf", "label": "ROSC now", "to": "rosc", "when": { "manual": { "label": "ROSC now" } } }
      ]
    },
    {
      "id": "vfFine", "label": "Fine VF",
      "onEnter": [ { "type": "setRhythm", "rhythm": "vfFine", "when": "now" } ],
      "transitions": [
        { "id": "shockFine", "label": "Shock (p 0.15)", "to": "rosc", "when": { "event": { "kind": "defib", "action": "shock", "minJ": 150 } }, "probability": 0.15 },
        { "id": "toAsystole", "label": "Deteriorate to asystole", "to": "asystole", "when": { "afterS": 300 } },
        { "id": "roscFine", "label": "ROSC now", "to": "rosc", "when": { "manual": { "label": "ROSC now" } } }
      ]
    },
    {
      "id": "asystole", "label": "Asystole",
      "onEnter": [ { "type": "setRhythm", "rhythm": "asystole", "when": "now" } ],
      "transitions": [
        { "id": "roscAsys", "label": "ROSC after epinephrine", "to": "rosc",
          "when": { "all": [ { "event": { "kind": "drug", "drugId": "epinephrine" } }, { "manual": { "label": "ROSC after epinephrine" } } ] } }
      ]
    },
    {
      "id": "rosc", "label": "ROSC",
      "notes": "Post-shock organised rhythm accelerating over 10–60 s (brief §6.5).",
      "$comment": "Stage 2+: add { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 95, \"ramp\": { \"durationS\": 30, \"curve\": \"sigmoid\" } } and { \"type\": \"setTarget\", \"variable\": \"etco2\", \"value\": 45, \"ramp\": { \"durationS\": 20 } } (the EtCO2 ROSC jump, brief §4.4).",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinusTachy", "opts": { "rateBpm": 105 }, "when": "now" },
        { "type": "setTarget", "variable": "hr", "value": 118, "ramp": { "durationS": 45, "curve": "sigmoid" } }
      ],
      "transitions": [
        { "id": "reArrest", "label": "Re-arrest (VF)", "to": "vf", "when": { "manual": { "label": "Re-arrest (VF)" } } }
      ]
    }
  ],
  "bookmarks": [ { "id": "preArrest", "label": "Before the arrest", "state": "stable" }, { "id": "atVf", "label": "VF onset", "state": "vf" } ]
}
```

`packages/controller/scenarios/acls-pea-hypovolaemia.json`:
```json
{
  "$comment": "[draft] Clinical content awaits Ali's review. PEA = `pulseless: true` on an organised rhythm (brief §5; Stage 5 honours the flag, earlier engines ignore it and show the rhythm). Probabilities are [ENG] placeholders.",
  "schema": "pme-scenario/1",
  "id": "acls-pea-hypovolaemia",
  "title": "[draft] PEA from haemorrhage",
  "notes": "34-year-old woman, 2 h after a road-traffic collision, splenic injury; on the ward with worsening tachycardia. She loses her pulse: PEA from hypovolaemia. Treat the cause: CPR, epinephrine, 1 L warmed crystalloid/blood.",
  "seed": 7,
  "patient": {
    "ageY": 34, "sex": "F", "weightKg": 62, "ageBand": "adult",
    "baseline": { "hr": 118 },
    "rhythm": { "id": "sinusTachy", "opts": { "rateBpm": 118 } },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on" }
  },
  "initialState": "bleeding",
  "states": [
    {
      "id": "bleeding", "label": "Compensating haemorrhage",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 82, \"ramp\": { \"durationS\": 120, \"curve\": \"linear\" } }; Stage 7: { \"type\": \"applyEvent\", \"event\": { \"kind\": \"bleed\", \"rateMlPerMin\": 150 } }.",
      "onEnter": [ { "type": "setTarget", "variable": "hr", "value": 142, "ramp": { "durationS": 120, "curve": "linear" } } ],
      "transitions": [
        { "id": "fluidEarly", "label": "Early volume", "to": "stabilised", "when": { "event": { "kind": "fluid", "minVolumeMl": 1000 } } },
        { "id": "losePulse", "label": "Lose pulse now", "to": "pea", "when": { "any": [ { "afterS": 150 }, { "manual": { "label": "Lose pulse now" } } ] } }
      ]
    },
    {
      "id": "pea", "label": "PEA (sinus tachycardia, no pulse)",
      "onEnter": [ { "type": "setRhythm", "rhythm": "sinusTachy", "opts": { "rateBpm": 128, "pulseless": true }, "when": "now" } ],
      "transitions": [
        { "id": "volumeEpi", "label": "Volume + epinephrine", "to": "rosc", "when": { "all": [ { "event": { "kind": "fluid", "minVolumeMl": 500 } }, { "event": { "kind": "drug", "drugId": "epinephrine" } } ] }, "probability": 0.6 },
        { "id": "brady", "label": "Slowing (agonal)", "to": "peaBrady", "when": { "afterS": 300 } },
        { "id": "roscPea", "label": "ROSC now", "to": "rosc", "when": { "manual": { "label": "ROSC now" } } }
      ]
    },
    {
      "id": "peaBrady", "label": "Slow PEA",
      "onEnter": [ { "type": "setRhythm", "rhythm": "avb3Wide", "opts": { "rateBpm": 32, "pulseless": true }, "when": "now" } ],
      "transitions": [
        { "id": "toAsys", "label": "Asystole", "to": "asystole", "when": { "afterS": 180 } },
        { "id": "roscLate", "label": "ROSC now", "to": "rosc", "when": { "manual": { "label": "ROSC now" } } }
      ]
    },
    { "id": "asystole", "label": "Asystole", "onEnter": [ { "type": "setRhythm", "rhythm": "asystole", "when": "now" } ] },
    {
      "id": "rosc", "label": "ROSC (still hypovolaemic)",
      "onEnter": [ { "type": "setRhythm", "rhythm": "sinusTachy", "opts": { "rateBpm": 130 }, "when": "now" },
                   { "type": "setTarget", "variable": "hr", "value": 115, "ramp": { "durationS": 180, "curve": "exp" } } ]
    },
    {
      "id": "stabilised", "label": "Stabilised after volume",
      "onEnter": [ { "type": "setTarget", "variable": "hr", "value": 104, "ramp": { "durationS": 120, "curve": "exp" } } ]
    }
  ]
}
```

`packages/controller/scenarios/acls-bradycardia-unstable.json`:
```json
{
  "$comment": "[draft] Clinical content awaits Ali's review. Atropine rarely helps a wide-complex complete heart block; pacing with capture at ≥ 70 mA (brief §6.5 default threshold) is the way out. pacedVVI is a Stage 5 id (stand-in until then). Probabilities are [ENG] placeholders.",
  "schema": "pme-scenario/1",
  "id": "acls-bradycardia-unstable",
  "title": "[draft] Unstable bradycardia — complete heart block",
  "notes": "72-year-old woman, dizzy and grey in the emergency department. Complete heart block with a wide escape at 32/min.",
  "seed": 11,
  "patient": {
    "ageY": 72, "sex": "F", "weightKg": 70, "ageBand": "adult",
    "baseline": { "hr": 32 },
    "rhythm": { "id": "avb3Wide", "opts": { "rateBpm": 32 } },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on" }
  },
  "initialState": "chb",
  "states": [
    {
      "id": "chb", "label": "CHB, wide escape 32/min",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 74 }.",
      "transitions": [
        { "id": "atropine", "label": "Atropine (p 0.2)", "to": "atropineResponse", "when": { "event": { "kind": "drug", "drugId": "atropine", "minDose": 0.5 } }, "probability": 0.2 },
        { "id": "capture", "label": "Pacing with capture", "to": "paced", "when": { "event": { "kind": "pacer", "minMa": 70 } } },
        { "id": "chronotrope", "label": "Epinephrine infusion", "to": "infusion", "when": { "event": { "kind": "drug", "drugId": "epinephrine", "infusion": true } } },
        { "id": "arrestBrady", "label": "Deteriorates (asystole)", "to": "asystole", "when": { "any": [ { "afterS": 420 }, { "manual": { "label": "Deteriorates (asystole)" } } ] } }
      ]
    },
    {
      "id": "atropineResponse", "label": "Partial response to atropine",
      "onEnter": [ { "type": "setTarget", "variable": "hr", "value": 42, "ramp": { "durationS": 60, "curve": "exp" } } ],
      "transitions": [
        { "id": "captureLate", "label": "Pacing with capture", "to": "paced", "when": { "event": { "kind": "pacer", "minMa": 70 } } },
        { "id": "fadeAtropine", "label": "Effect fades", "to": "chb", "when": { "afterS": 300 } }
      ]
    },
    {
      "id": "paced", "label": "Paced, capturing",
      "onEnter": [ { "type": "setRhythm", "rhythm": "pacedVVI", "opts": { "rateBpm": 70 }, "when": "now" } ],
      "transitions": [
        { "id": "pacerOff", "label": "Pacer switched off", "to": "chb", "when": { "event": { "kind": "pacer", "mode": "off" } } },
        { "id": "lossOfCapture", "label": "Loss of capture", "to": "chb", "when": { "manual": { "label": "Loss of capture" } } }
      ]
    },
    {
      "id": "infusion", "label": "On epinephrine infusion",
      "onEnter": [ { "type": "setTarget", "variable": "hr", "value": 48, "ramp": { "durationS": 120, "curve": "sigmoid" } } ],
      "transitions": [ { "id": "captureInf", "label": "Pacing with capture", "to": "paced", "when": { "event": { "kind": "pacer", "minMa": 70 } } } ]
    },
    { "id": "asystole", "label": "Asystole", "onEnter": [ { "type": "setRhythm", "rhythm": "asystole", "when": "now" } ],
      "transitions": [ { "id": "captureAsys", "label": "Pacing with capture", "to": "paced", "when": { "event": { "kind": "pacer", "minMa": 70 } }, "probability": 0.5 } ] }
  ]
}
```

`packages/controller/scenarios/svt-adenosine.json`:
```json
{
  "$comment": "[draft] Clinical content awaits Ali's review. Adenosine: AV block for 3–10 s, 10–30 s after the push (brief §4.9 drug table). The transient block is shown with rhythms the engine has today: complete heart block with a 20/min escape (P waves march on, almost no QRS). Conversion probability 0.6 per dose ≥ 6 mg is an [ENG] placeholder.",
  "schema": "pme-scenario/1",
  "id": "svt-adenosine",
  "title": "[draft] SVT and adenosine",
  "notes": "26-year-old woman with palpitations, stable, narrow-complex tachycardia 180/min. Vagal manoeuvres, then adenosine 6 mg rapid push with a flush; 12 mg if it fails.",
  "seed": 3,
  "patient": {
    "ageY": 26, "sex": "F", "weightKg": 58, "ageBand": "adult",
    "baseline": { "hr": 180 },
    "rhythm": { "id": "svtAvnrt", "opts": { "rateBpm": 180 } },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on" }
  },
  "initialState": "svt",
  "states": [
    {
      "id": "svt", "label": "AVNRT 180/min",
      "transitions": [
        { "id": "adenosine", "label": "Adenosine ≥ 6 mg", "to": "circulating", "when": { "event": { "kind": "drug", "drugId": "adenosine", "minDose": 6 } } },
        { "id": "vagal", "label": "Vagal manoeuvre works", "to": "sinus", "when": { "manual": { "label": "Vagal manoeuvre works" } } }
      ]
    },
    { "id": "circulating", "label": "Adenosine circulating", "notes": "10–30 s from push to effect.",
      "transitions": [ { "id": "reachesNode", "to": "block", "when": { "afterS": 15 } } ] },
    {
      "id": "block", "label": "Transient AV block",
      "onEnter": [ { "type": "setRhythm", "rhythm": "avb3Narrow", "opts": { "atrialRateBpm": 110, "rateBpm": 20 }, "when": "now" } ],
      "transitions": [ { "id": "wearsOff", "label": "Block wears off (p 0.6 converts)", "to": "sinus", "when": { "afterS": 6 }, "probability": 0.6, "else": "svtAgain" } ]
    },
    { "id": "svtAgain", "label": "SVT resumes", "onEnter": [ { "type": "setRhythm", "rhythm": "svtAvnrt", "opts": { "rateBpm": 180 }, "when": "now" } ],
      "transitions": [ { "id": "adenosine2", "label": "Adenosine ≥ 6 mg", "to": "circulating", "when": { "event": { "kind": "drug", "drugId": "adenosine", "minDose": 6 } } } ] },
    { "id": "sinus", "label": "Sinus rhythm", "onEnter": [ { "type": "setRhythm", "rhythm": "sinus", "opts": { "rateBpm": 92 }, "when": "now" },
        { "type": "setTarget", "variable": "hr", "value": 80, "ramp": { "durationS": 60, "curve": "exp" } } ] }
  ]
}
```

`packages/controller/scenarios/or-induction-hypotension.json`:
```json
{
  "$comment": "[draft] Clinical content awaits Ali's review. Blood pressure arrives with Stage 2: every BP step is written in `$comment` as the exact command to move into onEnter then. Until then the story is carried by HR (reflex tachycardia) and the notes. Stage 7 (MODELED) will make the propofol response emerge instead of being scripted.",
  "schema": "pme-scenario/1",
  "id": "or-induction-hypotension",
  "title": "[draft] Post-induction hypotension",
  "notes": "67-year-old man, hypertensive on an ACE inhibitor, for a hernia repair. Induction with propofol; hypotension with a reflex tachycardia follows. Treat with phenylephrine or ephedrine.",
  "seed": 5,
  "patient": {
    "ageY": 67, "sex": "M", "weightKg": 84, "ageBand": "adult",
    "baseline": { "hr": 78 },
    "rhythm": { "id": "sinus" },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on", "co2": "on" }
  },
  "initialState": "preInduction",
  "states": [
    {
      "id": "preInduction", "label": "Awake, pre-induction",
      "$comment": "Stage 2+: patient.baseline gains sbp 158, dbp 88.",
      "onEnter": [ { "type": "device", "action": { "device": "nibp", "action": "auto", "intervalMin": 3 } } ],
      "transitions": [
        { "id": "induce", "label": "Induce", "to": "induction", "when": { "any": [ { "event": { "kind": "drug", "drugId": "propofol" } }, { "manual": { "label": "Induce" } } ] } }
      ]
    },
    {
      "id": "induction", "label": "Induced",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 112, \"ramp\": { \"durationS\": 60, \"curve\": \"exp\" } }.",
      "transitions": [ { "id": "fall", "to": "hypotension", "when": { "afterS": 60 } } ]
    },
    {
      "id": "hypotension", "label": "Hypotension, reflex tachycardia",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 76, \"ramp\": { \"durationS\": 90, \"curve\": \"sigmoid\" } } and dbp 42.",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinusTachy", "opts": { "rateBpm": 102 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "hr", "value": 122, "ramp": { "durationS": 90, "curve": "sigmoid" } }
      ],
      "transitions": [
        { "id": "phenylephrine", "label": "Phenylephrine", "to": "treated", "when": { "event": { "kind": "drug", "drugId": "phenylephrine" } } },
        { "id": "ephedrine", "label": "Ephedrine", "to": "treatedEphedrine", "when": { "event": { "kind": "drug", "drugId": "ephedrine" } } },
        { "id": "worse", "label": "Profound (HR ≥ 115 for 20 s)", "to": "profound", "when": { "vital": { "var": "hr", "op": ">=", "value": 115, "forS": 20 } } }
      ]
    },
    {
      "id": "profound", "label": "Profound hypotension",
      "notes": "Instructor: 'the NIBP reads 62/35'.",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 64, \"ramp\": { \"durationS\": 45 } }.",
      "transitions": [
        { "id": "phenylephrine2", "label": "Phenylephrine", "to": "treated", "when": { "event": { "kind": "drug", "drugId": "phenylephrine" } } },
        { "id": "ephedrine2", "label": "Ephedrine", "to": "treatedEphedrine", "when": { "event": { "kind": "drug", "drugId": "ephedrine" } } }
      ]
    },
    {
      "id": "treated", "label": "Treated (phenylephrine: HR falls)",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 118, \"ramp\": { \"durationS\": 60, \"curve\": \"sigmoid\" } }.",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinus", "opts": { "rateBpm": 100 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "hr", "value": 82, "ramp": { "durationS": 60, "curve": "exp" } }
      ]
    },
    {
      "id": "treatedEphedrine", "label": "Treated (ephedrine: HR stays up)",
      "$comment": "Stage 2+: { \"type\": \"setTarget\", \"variable\": \"sbp\", \"value\": 110, \"ramp\": { \"durationS\": 120, \"curve\": \"sigmoid\" } }.",
      "onEnter": [ { "type": "setTarget", "variable": "hr", "value": 108, "ramp": { "durationS": 60, "curve": "exp" } } ]
    }
  ]
}
```

- [ ] **Step 4: Stand-ins and the catalogue**

`packages/controller/src/scenario/standins.ts`:
```ts
// Rhythm stand-ins: scenarios name the brief §5 rhythm ids (vfCoarse, vfFine, pacedVVI, pWaveAsystole …) that
// Stage 5 adds. Until the host engine has an id, the driver sends the closest rhythm this engine HAS, decided at
// run time from the engine's own RHYTHM_IDS — so the real rhythm appears by itself once Stage 5 is merged, and no
// scenario file changes. Every substitution is recorded in the run log and shown in the panel.
import type { RhythmId, RhythmOpts } from '@pme/engine-core';

export interface StandIn {
  rhythm: RhythmId;
  opts?: RhythmOpts;
  note: string;
}

export const RHYTHM_STAND_INS: Record<string, StandIn> = {
  vfCoarse: { rhythm: 'vtMono', opts: { rateBpm: 240 }, note: 'coarse VF shown as VT 240 until Stage 5' },
  vfFine: { rhythm: 'asystole', note: 'fine VF shown as a flat line until Stage 5 (the scenario still treats it as shockable)' },
  pacedVVI: { rhythm: 'avb3Wide', opts: { rateBpm: 70 }, note: 'paced rhythm shown as a wide escape at 70/min until Stage 5' },
  pWaveAsystole: { rhythm: 'avb3Narrow', opts: { rateBpm: 20 }, note: 'P-wave asystole shown as CHB with a 20/min escape until Stage 5' },
  junctionalEscape: { rhythm: 'avb3Narrow', opts: { rateBpm: 45 }, note: 'junctional escape shown as a narrow escape until Stage 5' },
};

/** The rhythm to send for `id` on an engine that knows `known`: itself, a stand-in, or null (send as is; the engine rejects it). */
export function resolveRhythm(id: string, opts: Record<string, unknown> | undefined, known: ReadonlySet<string>): { rhythm: string; opts?: Record<string, unknown>; note?: string } {
  if (known.has(id)) return { rhythm: id, ...(opts ? { opts } : {}) };
  const s = RHYTHM_STAND_INS[id];
  if (!s || !known.has(s.rhythm)) return { rhythm: id, ...(opts ? { opts } : {}) };
  const merged = { ...(opts ?? {}), ...(s.opts ?? {}) };
  return { rhythm: s.rhythm, ...(Object.keys(merged).length ? { opts: merged } : {}), note: `${id}: ${s.note}` };
}
```

`packages/controller/src/scenario/builtins.ts`:
```ts
// Built-in scenarios (JSON under packages/controller/scenarios/). All are [draft] until Ali's clinical review.
import aclsVf from '../../scenarios/acls-vf-witnessed.json';
import aclsPea from '../../scenarios/acls-pea-hypovolaemia.json';
import aclsBrady from '../../scenarios/acls-bradycardia-unstable.json';
import svtAdenosine from '../../scenarios/svt-adenosine.json';
import orInduction from '../../scenarios/or-induction-hypotension.json';

const LIST: Array<{ id: string; title: string }> = [aclsVf, aclsPea, aclsBrady, svtAdenosine, orInduction];

/** id → raw document (validated by the driver on load). */
export const BUILTIN_SCENARIOS: Record<string, unknown> = Object.fromEntries(LIST.map((d) => [d.id, d]));
/** For the panel's built-in list. */
export const BUILTIN_CATALOGUE: Array<{ id: string; title: string }> = LIST.map((d) => ({ id: d.id, title: d.title }));
```

- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/builtins.test.ts
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
```
Expected: `Tests  6 passed (6)`; typecheck exit 0 (JSON default imports work under `moduleResolution: Bundler` + `resolveJsonModule`, both already in `tsconfig.base.json`).

- [ ] **Step 6: Commit**

```bash
git add packages/controller/scenarios packages/controller/src/scenario/standins.ts packages/controller/src/scenario/builtins.ts packages/controller/test/scenario/builtins.test.ts
git commit -m "feat(scenario): five built-in [draft] scenarios and run-time rhythm stand-ins until Stage 5"
```

---

### Task 11: The driver — wrapped target, hook, poll, bookmarks; ACLS end to end headless

**Files:**
- Create: `packages/controller/src/scenario/driver.ts`, `packages/controller/test/scenario/driver.test.ts`

**Interfaces:**
- Consumes: `HostTarget`, `ScenarioHookResult` (Task 9), `ScenarioRunner` (Task 5), `validateScenario` (Task 4), `resolveRhythm`, `BUILTIN_SCENARIOS` (Task 10), `RHYTHM_IDS` from `@pme/engine-core`.
- Produces: `class ScenarioDriver({ target, submit?, publish?, builtins?, rhythms? })` with `host: HostTarget` (the wrapped target — give THIS to `HostSession`), `runner: ScenarioRunner | null`, `notes: string[]`, `poll()`, `load(docOrBuiltinId)`, `hook` (the `HostSession` `scenario` option), `welcomeEvents()`, `bookmarks()`, `close()`.

- [ ] **Step 1: Write the failing tests**

`packages/controller/test/scenario/driver.test.ts`:
```ts
// ScenarioDriver against a real engine (headless, per-tick): the wrapped target, stand-ins, the ACLS scenario
// end to end, bookmarks (engine snapshot + runner state) and replay identity (brief §3.3).
import { describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import { resolveRhythm } from '../../src/scenario/standins.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import type { ScenarioEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { manualHost } from '../fakes/manual-host.ts';

// Each test steps the engine tick by tick for 1–10 sim-minutes (≈ 0.2–2.5 s each on a laptop).
const SLOW = 30_000;

type Learner = Map<number, Command[]>; // tick → commands the learner sends on that tick
let nL = 0;
const learner = (event: object): Command => ({ id: `L${++nL}`, issuedBy: 'learner', type: 'applyEvent', event } as unknown as Command);
const SHOCK = { kind: 'defib', action: 'shock', energyJ: 200 };

/** A driver over a fresh engine; run(ticks) steps one tick at a time, sends the learner's commands, polls. */
function rig(seed = 42) {
  const host = manualHost({ seed });
  const events: ScenarioEvent[] = [];
  const driver = new ScenarioDriver({ target: host, publish: (e) => events.push(e) });
  const run = (toTick: number, script: Learner = new Map()) => {
    for (let tick = host.engine.now().tick + 1; tick <= toTick; tick++) {
      host.engine.advanceTo(tick * 0.02);
      for (const c of script.get(tick) ?? []) driver.host.dispatch(c);
      driver.poll();
    }
  };
  const samples = (fromS: number, toS: number) => {
    const out = new Float32Array(Math.round((toS - fromS) * 500));
    host.engine.readSamples('ecgII', Math.round(fromS * 500), out);
    return Array.from(out);
  };
  return { host, driver, events, run, samples };
}
const everyTwoMin = (fromS: number, untilS: number): Learner => {
  const m: Learner = new Map();
  for (let t = fromS; t <= untilS; t += 120) m.set(Math.round(t * 50), [learner(SHOCK)]);
  return m;
};

describe('ScenarioDriver', () => {
  it('stand-ins: an id the engine lacks becomes the closest one it has; known ids pass through', () => {
    const known = new Set(['vtMono', 'asystole', 'sinus']);
    expect(resolveRhythm('sinus', undefined, known)).toEqual({ rhythm: 'sinus' });
    expect(resolveRhythm('vfCoarse', { pulseless: true }, known)).toEqual({
      rhythm: 'vtMono', opts: { pulseless: true, rateBpm: 240 }, note: 'vfCoarse: coarse VF shown as VT 240 until Stage 5',
    });
    expect(resolveRhythm('vfCoarse', undefined, new Set(['vfCoarse']))).toEqual({ rhythm: 'vfCoarse' });
  }, SLOW);

  it('the wrapped target accepts applyEvent as scenario-only and feeds it to the runner', () => {
    const { driver, run } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    run(3001); // VF at 60 s
    expect(driver.runner?.stateId).toBe('vf');
    const r = driver.host.dispatch(learner(SHOCK)) as { accepted: boolean; reason?: string };
    expect(r).toMatchObject({ accepted: true, reason: 'scenario only: the engine does not model applyEvent yet' });
    driver.poll();
    expect(driver.runner?.stateId).toBe('rosc'); // seed 42: the first shock's draw is 0.062 < 0.3
  });

  it('a real validation error from the engine stays a rejection', () => {
    const { driver } = rig();
    const r = driver.host.dispatch({ id: 'x', issuedBy: 't', type: 'setTarget', variable: 'hr', value: 999 }) as { accepted: boolean };
    expect(r.accepted).toBe(false);
  });

  it('load refuses an invalid document with the path-level reason', () => {
    const { driver } = rig();
    const bad = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    bad.states[1]!.transitions![0]!.probability = 3;
    expect(driver.load(bad)).toEqual({ ok: false, reason: 'invalid scenario: /states/1/transitions/0/probability: must be <= 1' });
  });

  it('ACLS VF end to end: stable → VF at 60 s → shock → ROSC, every rhythm command accepted', () => {
    const { driver, events, run, host } = rig();
    driver.load('acls-vf-witnessed');
    run(50 * 600, everyTwoMin(70, 600));
    expect(events.map((e) => `${e.t}:${e.stateId}${e.transitionId ? `/${e.transitionId}` : ''}`)).toEqual(['0:stable', '60:vf/arrest', '70:rosc/shockVf']);
    const log = driver.runner!.log;
    const rhythm = log.filter((e) => e.op === 'dispatch' && e.type === 'setRhythm');
    expect(rhythm.every((e) => e.op === 'dispatch' && e.accepted)).toBe(true);
    expect(driver.notes).toContain('vfCoarse: coarse VF shown as VT 240 until Stage 5');
    expect(host.engine.now().simT).toBe(600);
  }, SLOW);

  it('ACLS VF without shocks decays: VF → fine VF at 4 min → asystole 5 min later', () => {
    const { driver, events, run } = rig();
    driver.load('acls-vf-witnessed');
    run(50 * 700);
    expect(events.map((e) => `${e.t}:${e.stateId}`)).toEqual(['0:stable', '60:vf', '300:vfFine', '600:asystole']);
  }, SLOW);

  it('a different runner seed takes a different path through the same shocks', () => {
    const doc = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    const paths = [1, 2, 3, 4].map((seed) => {
      const { driver, events, run } = rig();
      driver.load({ ...doc, seed });
      run(50 * 320, everyTwoMin(70, 320));
      return events.map((e) => `${e.t}:${e.stateId}`).join(' ');
    });
    expect(new Set(paths).size).toBeGreaterThan(1);
  }, 30_000);

  it('bookmark = engine snapshot + runner state: restoring and replaying the same inputs is identical', async () => {
    const { driver, events, run, samples, host } = rig();
    driver.load('acls-vf-witnessed');
    run(50 * 65);
    expect((await driver.hook({ type: 'scenario', action: 'bookmark', target: 'vf', id: 'b1', issuedBy: 't' })).accepted).toBe(true);
    events.length = 0;
    const script: Learner = new Map([[50 * 70, [learner(SHOCK)]]]);
    run(50 * 200, script);
    const first = { events: events.splice(0).map((e) => `${e.t}:${e.stateId}`), ecg: samples(66, 199) };
    const r = await driver.hook({ type: 'scenario', action: 'restoreBookmark', target: 'vf', id: 'b2', issuedBy: 't' });
    expect(r).toMatchObject({ accepted: true, tick: 50 * 65 });
    expect(host.engine.now().tick).toBe(50 * 65);
    expect(driver.runner?.stateId).toBe('vf');
    expect(events.splice(0).map((e) => `${e.t}:${e.stateId}`)).toEqual(['60:vf']); // the restore republishes the state
    run(50 * 200, new Map([[50 * 70, [learner(SHOCK)]]]));
    expect(events.map((e) => `${e.t}:${e.stateId}`)).toEqual(first.events);
    expect(samples(66, 199)).toEqual(first.ecg);
  }, SLOW);

  it('replay identity: same seed + same learner commands → identical samples, dispatches and decisions', () => {
    const go = () => {
      nL = 0;
      const g = rig();
      g.driver.load('acls-vf-witnessed');
      g.run(50 * 400, everyTwoMin(70, 400));
      return { g, ecg: g.samples(0.5, 399), dispatched: g.driver.runner!.log.filter((e) => e.op === 'dispatch') };
    };
    const a = go();
    const b = go();
    expect(b.ecg).toEqual(a.ecg);
    expect(b.dispatched).toEqual(a.dispatched);
    const replay = replayRunLog(a.g.driver.runner!.doc, runLog(a.g.driver.runner!));
    expect(replay.ok).toBe(true);
    expect(replay.decisions.length).toBeGreaterThan(2);
  });

  it('a replay with another seed diverges and says where', () => {
    const { driver, run } = rig();
    const doc = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    driver.load(doc);
    run(50 * 400, everyTwoMin(70, 400));
    const log = runLog(driver.runner!);
    let diverged = false;
    for (const seed of [1, 2, 3, 4, 5]) if (!replayRunLog(doc, { ...log, seed }).ok) diverged = true;
    expect(diverged).toBe(true);
  }, SLOW);
});
```

- [ ] **Step 2: Run them**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/driver.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/scenario/driver.ts"`.

- [ ] **Step 3: Implement**

`packages/controller/src/scenario/driver.ts`:
```ts
// The host-side glue between a ScenarioRunner and the monitor the host owns (brief §3.7: the host owns the
// simulation, so the scenario runs there). It
// - wraps the HostTarget (`driver.host`): every accepted command is also a runner input (applyEvent → latched
//   event, attachSensor → sensor level, setTarget → target value), and applyEvent/attachSensor that the engine
//   rejects as "not implemented" are accepted as scenario-only until Stages 3/4/7 model them;
// - feeds engine `measurement` (and, from Stage 2, `state`) events to the vital triggers;
// - handles every `scenario` command through `driver.hook` (load/goto/trigger/pause/resume, and bookmarks that
//   hold the engine snapshot AND the runner state);
// - on poll() advances the runner at the engine's sim time and dispatches each command batch as one stage group.
import { RHYTHM_IDS, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot } from '@pme/engine-core';
import type { ScenarioCommand, ScenarioEvent, WireCommand, WireEvent } from '../protocol.ts';
import type { HostTarget, ScenarioHookResult } from '../session/host-session.ts';
import { ScenarioRunner, type RunnerEffect, type RunnerInput, type RunnerState } from './runner.ts';
import { BUILTIN_SCENARIOS } from './builtins.ts';
import { resolveRhythm } from './standins.ts';
import type { DocCommand, ScenarioDoc } from './types.ts';
import { validateScenario } from './validate.ts';

export interface ScenarioDriverOptions {
  target: HostTarget;
  /** Where runner commands go. Host page: HostSession.submit (so viewers mirror them). Default: `driver.host`. */
  submit?: (cmd: Command) => DispatchResult | Promise<DispatchResult>;
  /** Where `scenario` events go (HostSession.publish on a host page). */
  publish?: (e: ScenarioEvent) => void;
  /** Built-in documents by id (`scenario load` with `target` = id). Default: BUILTIN_SCENARIOS. */
  builtins?: Record<string, unknown>;
  /** Rhythm ids of the host engine (default: this build's RHYTHM_IDS). */
  rhythms?: readonly string[];
}

interface Mark {
  snapshot: PatientSnapshot;
  doc: ScenarioDoc | null;
  seed: number;
  runner: RunnerState | null;
}

const NOT_IMPLEMENTED = /not implemented/;

export class ScenarioDriver {
  readonly host: HostTarget;
  runner: ScenarioRunner | null = null;
  /** Load-time warnings and stand-in notes for the current document. */
  notes: string[] = [];
  private readonly o: ScenarioDriverOptions;
  private readonly known: ReadonlySet<string>;
  private readonly marks = new Map<string, Mark>();
  private pending: RunnerInput[] = [];
  private n = 0; // batch counter; never restored, so ids and stage groups stay unique across bookmark restores
  private k = 0;
  private readonly off: () => void;

  constructor(o: ScenarioDriverOptions) {
    this.o = o;
    this.known = new Set(o.rhythms ?? RHYTHM_IDS);
    this.host = this.wrap(o.target);
    this.off = o.target.on((e) => this.onEngine(e));
  }

  /** Advance the runner to the engine's current sim time (call once per frame, or per tick in tests). */
  poll(): RunnerEffect[] {
    const inputs = this.pending;
    this.pending = [];
    if (!this.runner) return [];
    const fx = this.runner.advance(this.o.target.now().simT, inputs);
    this.exec(fx);
    return fx;
  }

  /** Validate and start a document (or a built-in id). */
  load(input: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    const raw = typeof input === 'string' ? (this.o.builtins ?? BUILTIN_SCENARIOS)[input] : input;
    if (raw === undefined) return { ok: false, reason: `no built-in scenario ${String(input)}` };
    const v = validateScenario(raw, { rhythms: [...this.known] });
    if (!v.ok) return { ok: false, reason: `invalid scenario: ${v.errors.join('; ')}` };
    this.notes = [...v.warnings];
    this.pending = [];
    this.runner = new ScenarioRunner(v.doc);
    this.exec(this.runner.start(this.o.target.now().simT));
    return { ok: true, doc: v.doc };
  }

  /** HostSession `scenario` option: every scenario command lands here. */
  readonly hook = async (cmd: ScenarioCommand): Promise<ScenarioHookResult> => {
    const { tick, simT } = this.o.target.now();
    const no = (reason: string): ScenarioHookResult => ({ accepted: false, tick, reason });
    const yes = (applied?: ScenarioCommand, at = tick): ScenarioHookResult => ({ accepted: true, tick: at, ...(applied ? { applied } : {}) });
    switch (cmd.action) {
      case 'load': {
        const r = this.load(cmd.doc ?? cmd.target);
        return r.ok ? yes({ ...cmd, target: r.doc.id, doc: r.doc }) : no(r.reason);
      }
      case 'bookmark': {
        const label = cmd.target ?? `Bookmark ${++this.k}`;
        const snapshot = await this.o.target.snapshot();
        const r = this.runner;
        this.marks.set(label, { snapshot, doc: r?.doc ?? null, seed: r?.seed ?? 0, runner: r?.getState() ?? null });
        return yes({ ...cmd, target: label });
      }
      case 'restoreBookmark': {
        const m = cmd.target !== undefined ? this.marks.get(cmd.target) : undefined;
        if (!m) return no(`no bookmark ${String(cmd.target)}`);
        await this.o.target.restore(m.snapshot);
        this.pending = [];
        if (m.doc && m.runner) {
          if (this.runner?.doc !== m.doc) this.runner = new ScenarioRunner(m.doc, { seed: m.seed });
          this.runner.setState(m.runner);
          this.o.publish?.({ type: 'scenario', t: this.runner.enteredT, stateId: this.runner.stateId });
        } else this.runner = null;
        return yes(undefined, m.snapshot.tick);
      }
    }
    const r = this.runner;
    if (!r) return no('no scenario loaded');
    switch (cmd.action) {
      case 'goto':
        if (!cmd.target || !r.doc.states.some((s) => s.id === cmd.target)) return no(`no state ${String(cmd.target)}`);
        this.poll();
        this.exec(r.goto(simT, cmd.target));
        return yes();
      case 'trigger': {
        const t = r.trigger(simT, cmd.target ?? '');
        if (!t.ok) return no(t.reason ?? 'trigger refused');
        this.poll(); // evaluate now, so a button press acts on this tick
        return yes();
      }
      case 'pause':
        r.pause(simT);
        return yes();
      case 'resume':
        r.resume(simT);
        return yes();
    }
    return no(`unknown scenario action ${String(cmd.action)}`);
  };

  /** HostSession `welcomeEvents` option: a late joiner learns the current state (the doc comes as a sticky load). */
  welcomeEvents(): WireEvent[] {
    const r = this.runner;
    return r ? [{ type: 'scenario', t: r.enteredT, stateId: r.stateId }] : [];
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
  }

  close(): void {
    this.off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private exec(fx: RunnerEffect[]): void {
    for (const f of fx) {
      if (f.kind === 'event') {
        this.o.publish?.(f.event);
        continue;
      }
      const group = `scenario-${++this.n}`;
      f.commands.forEach((dc, i) => this.send({ ...this.standIn(dc), id: `${group}-${i}`, issuedBy: 'scenario', stageGroup: group } as Command));
    }
  }

  private send(cmd: Command): void {
    const r = this.runner;
    const t = this.o.target.now().simT;
    const rec = (res: DispatchResult) =>
      r?.log.push({ op: 'dispatch', t, commandId: cmd.id, type: cmd.type, accepted: res.accepted, tick: res.tick, ...(res.reason ? { reason: res.reason } : {}) });
    const res = (this.o.submit ?? ((c: Command) => this.host.dispatch(c)))(cmd);
    if (res instanceof Promise) void res.then(rec, (err: unknown) => rec({ accepted: false, tick: -1, reason: String(err) }));
    else rec(res);
  }

  private standIn(dc: DocCommand): DocCommand {
    if (dc.type !== 'setRhythm') return dc;
    const s = resolveRhythm(dc.rhythm, dc.opts, this.known);
    if (s.note && !this.notes.includes(s.note)) this.notes.push(s.note);
    const { opts: _o, ...rest } = dc;
    return { ...rest, rhythm: s.rhythm, ...(s.opts ? { opts: s.opts } : {}) };
  }

  private wrap(inner: HostTarget): HostTarget {
    const observe = (c: Command, r: DispatchResult): DispatchResult => {
      const w = c as WireCommand;
      let res = r;
      if ((w.type === 'applyEvent' || w.type === 'attachSensor') && !r.accepted && NOT_IMPLEMENTED.test(r.reason ?? '')) {
        res = { accepted: true, tick: Math.max(c.atTick ?? 0, r.tick + 1), reason: `scenario only: the engine does not model ${w.type} yet` };
      }
      if (!res.accepted) return res;
      if (w.type === 'applyEvent') this.pending.push({ kind: 'clinical', event: structuredClone(w.event) });
      else if (w.type === 'attachSensor') this.pending.push({ kind: 'sensor', sensor: w.sensor, state: w.state });
      else if (w.type === 'setTarget') this.pending.push({ kind: 'values', rank: 1, values: { [w.variable]: w.value } });
      return res;
    };
    return {
      dispatch: (c) => {
        const r = inner.dispatch(c);
        return r instanceof Promise ? r.then((x) => observe(c, x)) : observe(c, r);
      },
      snapshot: () => inner.snapshot(),
      restore: (s) => inner.restore(s),
      on: (fn) => inner.on(fn),
      now: () => inner.now(),
      time: (a, v) => inner.time(a, v),
    };
  }

  private onEngine(e: EngineEvent): void {
    const w = e as WireEvent;
    if (w.type === 'measurement') {
      const values: Record<string, number> = {};
      for (const [k, m] of Object.entries(w.values)) if (m && m.value !== null) values[k] = m.value;
      if (Object.keys(values).length) this.pending.push({ kind: 'values', rank: 2, values });
    } else if (w.type === 'state') {
      const values: Record<string, number> = {};
      for (const [k, v] of Object.entries(w.values)) if (typeof v === 'number') values[k] = v;
      this.pending.push({ kind: 'values', rank: 3, values });
    }
  }
}
```

- [ ] **Step 4: Run them**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/driver.test.ts`
Expected: `Tests  10 passed (10)` in ≈ 10 s. The ACLS path is `['0:stable', '60:vf/arrest', '70:rosc/shockVf']` and the no-shock path `['0:stable', '60:vf', '300:vfFine', '600:asystole']`. If the bookmark test fails on samples, check that `restoreBookmark` awaits `target.restore()` BEFORE `runner.setState()` and clears `pending`.

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/scenario/driver.ts packages/controller/test/scenario/driver.test.ts
git commit -m "feat(scenario): host-side driver — wrapped target, scenario hook, bookmarks with runner state; ACLS headless"
```

---

### Task 12: The scenario over a `HostSession` (integration)

**Files:**
- Create: `packages/controller/test/scenario/host-scenario.test.ts`

**Interfaces:**
- Consumes: Tasks 8, 9, 11. The wiring every host page uses (the demo in Task 16 copies it):
```ts
let hs: HostSession | null = null;
const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
hs = new HostSession({ session, target: driver.host, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
// every frame (or tick): driver.poll();
```

- [ ] **Step 1: Write the test**

```ts
// The driver inside a HostSession: controllers load/trigger/pause over the wire, runner commands reach viewers
// as commandApplied, late joiners get the doc and the current state, bookmarks carry the runner state.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import type { AppliedResolution, ScenarioEvent, WireEvent } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'SCN234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

function setup() {
  const host = manualHost({ seed: 42 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
  hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
  /** Advance sim time tick by tick, polling the driver like a frame loop would. */
  const run = (toS: number) => {
    for (let tick = host.engine.now().tick + 1; tick <= Math.round(toS * 50); tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
  };
  return { host, hs: hs as HostSession, driver, hub, ctl, run };
}

describe('scenario over a HostSession', () => {
  it('a controller loads a built-in by id; its view gets the doc and follows the state', async () => {
    const { ctl, run } = setup();
    await waitFor(() => ctl.hostOnline);
    const ack = await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    expect(ack.accepted).toBe(true);
    await waitFor(() => ctl.scenario.doc?.id === 'acls-vf-witnessed');
    expect(ctl.scenario.stateLabel()).toBe('Stable in PACU');
    run(60.02);
    await waitFor(() => ctl.scenario.stateId === 'vf');
    expect(ctl.log.some((l) => l.kind === 'scenario' && l.text === '→ vf (arrest)')).toBe(true);
    expect(ctl.scenario.next().map((n) => n.manual)).toEqual([null, null, null, 'ROSC now']);
  });

  it('runner commands go through the host: stats, one stage group on one tick, commandApplied for viewers', async () => {
    const { ctl, hub, hs, run, host } = setup();
    const watcher = hub.connect();
    const got = collect(watcher);
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    run(60.02);
    await waitFor(() => got.some((m) => m.kind === 'event' && m.body.some((e) => e.type === 'commandApplied' && (e.resolved as AppliedResolution).command.issuedBy === 'scenario' && (e.resolved as AppliedResolution).command.type === 'setRhythm' && ((e.resolved as AppliedResolution).command as { rhythm: string }).rhythm === 'vtMono')));
    const applied = got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e): e is Extract<WireEvent, { type: 'commandApplied' }> => e.type === 'commandApplied');
    const setup0 = applied.filter((e) => (e.resolved as AppliedResolution).command.stageGroup === 'scenario-1');
    expect(new Set(setup0.map((e) => e.tick)).size).toBe(1); // one stage group → one tick
    expect(hs.stats.applied).toBeGreaterThanOrEqual(3);
    expect(host.engine.now().tick).toBe(3001);
  });

  it('manual trigger from a controller fires at once; an unknown transition is refused', async () => {
    const { ctl, run } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    run(1);
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'nope' })).reason).toBe('no transition nope in state stable');
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'arrest' })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.stateId === 'vf');
  });

  it('an invalid document is refused with the path-level reason', async () => {
    const { ctl } = setup();
    await waitFor(() => ctl.hostOnline);
    const r = await ctl.send({ type: 'scenario', action: 'load', doc: { schema: 'pme-scenario/1', id: 'x', title: 'x', initialState: 'a', states: [{ id: 'a', transitions: [{ id: 't', to: 'a', when: {} }] }] } });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('invalid scenario: /states/0/transitions/0/when: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any');
  });

  it('a late joiner gets the doc (sticky load) and the current state (welcome event)', async () => {
    const { ctl, hub, run } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    run(61);
    await ctl.send({ type: 'scenario', action: 'pause' });
    const late = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => late.close());
    await waitFor(() => late.scenario.stateId === 'vf');
    expect(late.scenario.doc?.id).toBe('acls-vf-witnessed');
    expect(late.scenario.enteredT).toBe(60);
    expect(late.scenario.paused).toBe(true);
  });

  it('bookmarks through the host restore the runner state too', async () => {
    const { ctl, run, driver, host } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    run(30);
    await ctl.send({ type: 'scenario', action: 'bookmark', target: 'calm' });
    await waitFor(() => ctl.bookmarks.includes('calm'));
    run(65);
    expect(driver.runner?.stateId).toBe('vf');
    expect((await ctl.send({ type: 'scenario', action: 'restoreBookmark', target: 'calm' })).accepted).toBe(true);
    expect(host.engine.now().tick).toBe(1500);
    expect(driver.runner?.stateId).toBe('stable');
    await waitFor(() => ctl.scenario.stateId === 'stable');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/host-scenario.test.ts`
Expected: `Tests  6 passed (6)`. This checks: a built-in loads by id over the wire; the controller's view follows; runner commands arrive as `commandApplied` with `issuedBy: 'scenario'` and the stand-in rhythm (`vtMono`, never `vfCoarse`); the setup batch lands on one tick (a regression here means the driver's scenario-only acceptance ignored `atTick`); a trigger acts at once; an invalid doc is refused with its path; a late joiner gets the doc, the paused flag and the state entered at 60 s; bookmarks through the host restore the runner.

- [ ] **Step 3: Commit**

```bash
git add packages/controller/test/scenario/host-scenario.test.ts
git commit -m "test(scenario): driver inside HostSession — load, trigger, viewers' commandApplied, late join, bookmarks"
```

---

### Task 13: Entry points — `@pme/controller/scenario`, root exports, two-entry build

**Files:**
- Create: `packages/controller/src/scenario/index.ts`
- Modify: `packages/controller/package.json`, `packages/controller/vite.config.ts`, `packages/controller/src/index.ts`

**Interfaces:**
- Produces: `@pme/controller/scenario` (runner, driver, validation, replay, stand-ins, built-ins, document types); root `@pme/controller` additionally exports `ScenarioView`, `NextTransition`, `describeWhen`, `describeTransition`, `manualLabel`, the document types, `ScenarioHookResult` (and, from Task 2, `ClinicalEvent`, `SensorId`, `ClinicalCommand`, `ScenarioEvent` through `export * from './protocol.ts'`).

- [ ] **Step 1: The scenario entry**

`packages/controller/src/scenario/index.ts`:
```ts
// `@pme/controller/scenario`: the scenario runner and everything that needs ajv. A separate entry so the root
// entry (and the renderer's IIFE, which imports it) never bundles ajv or the built-in JSON.
export * from './types.ts';
export { validateScenario, formatAjvError, SCENARIO_SCHEMA, type ValidationResult, type ValidateOptions } from './validate.ts';
export { ScenarioRunner, compare, matches, hasManual, type RunnerInput, type RunnerEffect, type RunnerState, type RunLogEntry } from './runner.ts';
export { replayRunLog, runLog, type ScenarioRunLog } from './replay.ts';
export { ScenarioDriver, type ScenarioDriverOptions } from './driver.ts';
export { RHYTHM_STAND_INS, resolveRhythm, type StandIn } from './standins.ts';
export { BUILTIN_SCENARIOS, BUILTIN_CATALOGUE } from './builtins.ts';
```

- [ ] **Step 2: package.json exports**

In `packages/controller/package.json`, replace:
```json
  "exports": {
    ".": "./src/index.ts"
  },
```
with:
```json
  "exports": {
    ".": "./src/index.ts",
    "./scenario": "./src/scenario/index.ts"
  },
```

- [ ] **Step 3: Two library entries**

Replace the whole of `packages/controller/vite.config.ts` with:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Two entries: the root (no ajv) and the scenario runner (ajv + built-in JSON), so embedders pay for ajv only
    // when they import '@pme/controller/scenario'.
    lib: { entry: { index: 'src/index.ts', scenario: 'src/scenario/index.ts' }, formats: ['es'] },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

- [ ] **Step 4: Root exports**

In `packages/controller/src/index.ts`, replace:
```ts
export { HostSession, STAGE_LEAD_TICKS, type HostSessionOptions, type HostTarget, type ScenarioHook } from './session/host-session.ts';
```
with:
```ts
export { HostSession, STAGE_LEAD_TICKS, type HostSessionOptions, type HostTarget, type ScenarioHook, type ScenarioHookResult } from './session/host-session.ts';
```
and replace:
```ts
export { mountRemote, type RemoteHandle, type RemoteOptions, type Via } from './remote/remote-app.ts';
```
with:
```ts
export { mountRemote, type RemoteHandle, type RemoteOptions, type Via } from './remote/remote-app.ts';
// Scenario view + text only (no ajv): the runner, driver and validation are in '@pme/controller/scenario'.
export { ScenarioView, type NextTransition } from './scenario/view.ts';
export { describeWhen, describeTransition, manualLabel } from './scenario/describe.ts';
export type { ScenarioDoc, ScenarioState, Transition, When, DocCommand } from './scenario/types.ts';
```

- [ ] **Step 5: Build and check that ajv stays out of the root entry and the IIFE**

```bash
npx -y pnpm@9.15.9 typecheck
npx -y pnpm@9.15.9 build 2>&1 | grep -E "controller build: dist|patient-monitor.iife"
grep -c ajv packages/renderer/dist/patient-monitor.iife.js packages/controller/dist/index.js packages/controller/dist/scenario.js
```
Expected: typecheck exit 0; `dist/index.js ≈ 72.5 kB`, `dist/scenario.js ≈ 224 kB`, `patient-monitor.iife.js 94.05 kB` (unchanged from Stage 6a); grep counts `…iife.js:0`, `…index.js:0`, `…scenario.js:` > 0. A non-zero count for the IIFE or `index.js` means something in the root entry imports `validate.ts`/`driver.ts`/`builtins.ts`: find and remove that import.

- [ ] **Step 6: Commit**

```bash
git add packages/controller/src/scenario/index.ts packages/controller/package.json packages/controller/vite.config.ts packages/controller/src/index.ts
git commit -m "feat(controller): @pme/controller/scenario entry (ajv stays out of the root entry and the IIFE)"
```

---

### Task 14: The panel's Scenario tab

**Files:**
- Create: `packages/controller/src/panel/scenario-tab.ts`, `packages/controller/test/panel/scenario-tab.dom.test.ts`
- Modify: `packages/controller/src/panel/panel.ts`, `packages/controller/src/panel/styles.ts`

**Interfaces:**
- Produces: `mountScenarioTab(el, { session, catalogue? }) → { update() }`; `PanelOptions.scenarios?: Array<{ id; title }>`; a fourth tab `data-tab="scenario"`. DOM hooks used by tests and the e2e: `select[name=scenario-builtin]`, `[data-action=scenario-load-builtin]`, `input[name=scenario-file]`, `input[name=scenario-url]`, `[data-action=scenario-load-url]`, `.pme-scn-error`, `.pme-scn-live`, `.pme-scn-title`, `.pme-scn-state`, `.pme-scn-clock`, `[data-action=scenario-pause|scenario-resume]`, `.pme-scn-next li[data-transition]` with `[data-action=scenario-trigger][data-target=<id>]` (text = the manual label, or "Force"), `select[name=scenario-goto]` + `[data-action=scenario-goto]`, `.pme-scn-states li[data-state]` (`aria-current="step"` on the current one) with `[data-action=scenario-jump][data-target=<state>]` for doc bookmarks.
- Rebuild policy (so a select never closes under the user's finger): the goto list is rebuilt only when `view.docVersion` changes, the "Next" list only when the state changes, the timeline only when the history grows; the clock text every render.

- [ ] **Step 1: Write the failing DOM test**

`packages/controller/test/panel/scenario-tab.dom.test.ts`:
```ts
// @vitest-environment happy-dom
// The panel's Scenario tab against a real host + driver over the in-process hub.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel, type PanelHandle } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { BUILTIN_CATALOGUE, BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

async function setup() {
  const host = manualHost({ seed: 42 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'TAB234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const s = new ControllerSession({ session: 'TAB234', transport: hub.connect() });
  await waitFor(() => s.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: s, vocabulary: stage1Vocabulary(), scenarios: BUILTIN_CATALOGUE, startOpen: true });
  const run = (toS: number) => {
    for (let tick = host.engine.now().tick + 1; tick <= Math.round(toS * 50); tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
  };
  cleanup.push(() => panel.destroy(), () => s.close(), () => (hs as HostSession).close(), () => driver.close());
  return { host, driver, s, panel, run };
}
const q = <T extends Element>(p: PanelHandle, sel: string) => p.el.querySelector(sel) as T;
const click = (el: Element | null) => (el as HTMLElement).click();
const texts = (p: PanelHandle, sel: string) => [...p.el.querySelectorAll(sel)].map((e) => e.textContent?.trim());

describe('panel Scenario tab (DOM)', () => {
  it('has a Scenario tab listing the built-ins; loading one shows its state, transitions and timeline', async () => {
    const { panel, s } = await setup();
    click(q(panel, '[data-tab=scenario]'));
    expect(q<HTMLElement>(panel, '[data-pane=scenario]').hidden).toBe(false);
    expect([...q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').options].map((o) => o.value)).toEqual(BUILTIN_CATALOGUE.map((c) => c.id));
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    expect(q<HTMLElement>(panel, '.pme-scn-live').hidden).toBe(false);
    expect(q<HTMLElement>(panel, '.pme-scn-title').textContent).toBe('[draft] Witnessed VF in PACU');
    expect(q<HTMLElement>(panel, '.pme-scn-state').textContent).toBe('Stable in PACU');
    expect(texts(panel, '.pme-scn-next li')).toEqual(['Start VF now Start VF now: any of (after 60 s in state; button "Start VF now") → vf']);
    expect(texts(panel, '.pme-scn-states li').length).toBe(5);
    expect(q(panel, '.pme-scn-states li[aria-current=step]')?.getAttribute('data-state')).toBe('stable');
  });

  it('Press fires a manual transition; the list follows the new state; Force works for non-manual ones', async () => {
    const { panel, s, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    click(q(panel, '[data-action=scenario-trigger][data-target=arrest]'));
    await waitFor(() => q<HTMLElement>(panel, '.pme-scn-state').textContent === 'Coarse VF');
    expect(texts(panel, '.pme-scn-next [data-action=scenario-trigger]')).toEqual(['Force', 'Force', 'Force', 'ROSC now']);
    click(q(panel, '[data-action=scenario-trigger][data-target=decay]'));
    await waitFor(() => driver.runner?.stateId === 'vfFine');
  });

  it('goto, pause/resume and the time-in-state clock', async () => {
    const { panel, s, run, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'svt-adenosine';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc?.id === 'svt-adenosine');
    run(12);
    await waitFor(() => s.simT === 12); // the 1 Hz measurement at 12 s
    expect(q<HTMLElement>(panel, '.pme-scn-clock').textContent).toBe(' · 00:12 in state');
    q<HTMLSelectElement>(panel, 'select[name=scenario-goto]').value = 'sinus';
    click(q(panel, '[data-action=scenario-goto]'));
    await waitFor(() => driver.runner?.stateId === 'sinus');
    click(q(panel, '[data-action=scenario-pause]'));
    await waitFor(() => s.scenario.paused);
    expect(driver.runner?.paused).toBe(true);
    await waitFor(() => /scenario paused/.test(q<HTMLElement>(panel, '.pme-scn-clock').textContent ?? ''));
    click(q(panel, '[data-action=scenario-resume]'));
    await waitFor(() => driver.runner?.paused === false);
  });

  it('a jump point in the timeline is a goto', async () => {
    const { panel, s, driver } = await setup();
    q<HTMLSelectElement>(panel, 'select[name=scenario-builtin]').value = 'acls-vf-witnessed';
    click(q(panel, '[data-action=scenario-load-builtin]'));
    await waitFor(() => s.scenario.doc !== null);
    click(q(panel, '[data-action=scenario-jump][data-target=vf]'));
    await waitFor(() => driver.runner?.stateId === 'vf');
  });

  it('a bad file shows the host’s path-level error', async () => {
    const { panel } = await setup();
    const bad = structuredClone(BUILTIN_SCENARIOS['svt-adenosine']) as { states: Array<{ transitions?: Array<{ to: string }> }> };
    bad.states[0]!.transitions![0]!.to = 'nowhere';
    const input = q<HTMLInputElement>(panel, 'input[name=scenario-file]');
    const file = new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await waitFor(() => (q<HTMLElement>(panel, '.pme-scn-error').textContent ?? '') !== '');
    expect(q<HTMLElement>(panel, '.pme-scn-error').textContent).toBe('invalid scenario: /states/0/transitions/0/to: no state "nowhere"');
  });

  it('Load URL fetches the document and loads it', async () => {
    const doc = BUILTIN_SCENARIOS['or-induction-hypotension'];
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => doc }));
    const { panel, s } = await setup();
    q<HTMLInputElement>(panel, 'input[name=scenario-url]').value = 'https://example.org/or.json';
    click(q(panel, '[data-action=scenario-load-url]'));
    await waitFor(() => s.scenario.doc?.id === 'or-induction-hypotension');
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/scenario-tab.dom.test.ts`
Expected: FAIL — `q(...)` is null for `[data-tab=scenario]` (`Cannot read properties of null (reading 'click')`).

- [ ] **Step 3: Implement the tab**

`packages/controller/src/panel/scenario-tab.ts`:
```ts
// The instructor panel's Scenario tab (Stage 6b): load (built-in list, file, URL), the current state and time in
// it, the current state's transitions with their conditions and a Press/Force button each, goto, pause/resume,
// and a timeline of states with authored jump points. Reads ControllerSession.scenario (a ScenarioView); every
// action is a `scenario` command to the host, which validates and runs it.
import type { ControllerSession } from '../session/controller-session.ts';
import type { CommandInput } from '../protocol.ts';

export interface ScenarioTabOptions {
  session: ControllerSession;
  /** Built-in scenarios the host offers (ids it can load by `target`). */
  catalogue?: Array<{ id: string; title: string }>;
}

export interface ScenarioTab {
  /** Refresh from the session (the panel calls this on every session change). */
  update(): void;
}

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function mountScenarioTab(el: HTMLElement, o: ScenarioTabOptions): ScenarioTab {
  const doc = el.ownerDocument;
  const s = o.session;
  const view = s.scenario;
  el.innerHTML = `
    <section class="pme-section">
      <h3>Load scenario</h3>
      <div class="pme-row"><select name="scenario-builtin"></select><button type="button" data-action="scenario-load-builtin">Load</button></div>
      <div class="pme-row"><input type="file" name="scenario-file" accept=".json,application/json" /></div>
      <div class="pme-row"><input name="scenario-url" placeholder="https://…/scenario.json" /><button type="button" data-action="scenario-load-url">Load URL</button></div>
      <div class="pme-scn-error" role="alert"></div>
    </section>
    <section class="pme-section pme-scn-live" hidden>
      <h3 class="pme-scn-title"></h3>
      <div class="pme-row"><strong class="pme-scn-state"></strong><span class="pme-scn-clock"></span></div>
      <div class="pme-row">
        <button type="button" data-action="scenario-pause">Pause scenario</button>
        <button type="button" data-action="scenario-resume">Resume scenario</button>
      </div>
      <p class="pme-scn-notes"></p>
      <h3>Next</h3>
      <ul class="pme-scn-next"></ul>
      <h3>Go to state</h3>
      <div class="pme-row"><select name="scenario-goto"></select><button type="button" data-action="scenario-goto">Go</button></div>
      <h3>Timeline</h3>
      <ol class="pme-scn-states"></ol>
    </section>`;
  const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;
  const option = (label: string, value: string) => {
    const opt = doc.createElement('option');
    opt.value = value;
    opt.textContent = label;
    return opt;
  };
  const builtin = q<HTMLSelectElement>('select[name=scenario-builtin]');
  for (const c of o.catalogue ?? []) builtin.append(option(c.title, c.id));
  builtin.disabled = !o.catalogue?.length;
  const err = q<HTMLElement>('.pme-scn-error');
  const send = (c: CommandInput) => {
    err.textContent = '';
    void s.send(c).then(
      (r) => {
        if (!r.accepted) err.textContent = r.reason ?? 'refused';
      },
      () => undefined,
    );
  };
  const loadDoc = (value: unknown) => send({ type: 'scenario', action: 'load', doc: value });

  q<HTMLInputElement>('input[name=scenario-file]').addEventListener('change', (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    void f.text().then((text) => {
      try {
        loadDoc(JSON.parse(text));
      } catch (e) {
        err.textContent = `${f.name}: not JSON (${(e as Error).message})`;
      }
    });
  });

  el.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest('button');
    if (!b) return;
    switch (b.dataset.action) {
      case 'scenario-load-builtin':
        if (builtin.value) send({ type: 'scenario', action: 'load', target: builtin.value });
        return;
      case 'scenario-load-url': {
        const url = q<HTMLInputElement>('input[name=scenario-url]').value.trim();
        if (!url) return;
        void globalThis
          .fetch(url)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then(loadDoc, (e: Error) => (err.textContent = `${url}: ${e.message}`));
        return;
      }
      case 'scenario-pause':
      case 'scenario-resume':
        send({ type: 'scenario', action: b.dataset.action === 'scenario-pause' ? 'pause' : 'resume' });
        return;
      case 'scenario-goto':
        send({ type: 'scenario', action: 'goto', target: q<HTMLSelectElement>('select[name=scenario-goto]').value });
        return;
      case 'scenario-trigger':
      case 'scenario-jump':
        send({ type: 'scenario', action: b.dataset.action === 'scenario-trigger' ? 'trigger' : 'goto', target: b.dataset.target as string });
        return;
    }
  });

  let shownDoc = -1;
  let shownState: string | null = null;
  let shownHistory = -1;
  const rebuildDoc = () => {
    const d = view.doc;
    if (!d) return;
    q<HTMLElement>('.pme-scn-title').textContent = d.title;
    const gotoSel = q<HTMLSelectElement>('select[name=scenario-goto]');
    gotoSel.replaceChildren(...d.states.map((st) => option(st.label ?? st.id, st.id)));
  };
  const rebuildState = () => {
    const cur = view.current();
    q<HTMLElement>('.pme-scn-state').textContent = view.stateLabel();
    q<HTMLElement>('.pme-scn-notes').textContent = cur?.notes ?? '';
    q<HTMLUListElement>('.pme-scn-next').replaceChildren(
      ...view.next().map((n) => {
        const li = doc.createElement('li');
        li.dataset.transition = n.id;
        const b = doc.createElement('button');
        b.type = 'button';
        b.dataset.action = 'scenario-trigger';
        b.dataset.target = n.id;
        b.textContent = n.manual ? n.manual : 'Force';
        const text = doc.createElement('span');
        text.textContent = ` ${n.label}: ${n.text}`;
        li.append(b, text);
        return li;
      }),
    );
  };
  const rebuildTimeline = () => {
    const d = view.doc;
    if (!d) return;
    const visits = new Map<string, number>();
    for (const h of view.history) if (!h.transitionId?.endsWith(':else')) visits.set(h.stateId, h.t);
    q<HTMLOListElement>('.pme-scn-states').replaceChildren(
      ...d.states.map((st) => {
        const li = doc.createElement('li');
        li.dataset.state = st.id;
        if (st.id === view.stateId) li.setAttribute('aria-current', 'step');
        const at = visits.get(st.id);
        li.textContent = `${st.label ?? st.id}${at !== undefined ? ` · ${fmt(at)}` : ''}`;
        for (const bm of (d.bookmarks ?? []).filter((x) => x.state === st.id)) {
          const b = doc.createElement('button');
          b.type = 'button';
          b.dataset.action = 'scenario-jump';
          b.dataset.target = bm.state;
          b.textContent = `↦ ${bm.label ?? bm.id}`;
          li.append(' ', b);
        }
        return li;
      }),
    );
  };

  const update = () => {
    const live = q<HTMLElement>('.pme-scn-live');
    live.hidden = !view.doc;
    if (!view.doc) return;
    if (shownDoc !== view.docVersion) {
      shownDoc = view.docVersion;
      shownState = null;
      rebuildDoc();
    }
    if (shownState !== view.stateId) {
      shownState = view.stateId;
      rebuildState();
    }
    if (shownHistory !== view.history.length || shownState === null) {
      shownHistory = view.history.length;
      rebuildTimeline();
    }
    const tin = s.simT === null ? 0 : view.timeInState(s.simT);
    q<HTMLElement>('.pme-scn-clock').textContent = ` · ${fmt(tin)} in state${view.paused ? ' · scenario paused' : ''}`;
  };
  update();
  return { update };
}
```

Note: happy-dom has no `Option` constructor; the `option()` helper uses `createElement('option')`.

- [ ] **Step 4: Mount it in the panel**

In `packages/controller/src/panel/panel.ts`:
1. Replace `import { renderControls } from './render-controls.ts';` with:
```ts
import { renderControls } from './render-controls.ts';
import { mountScenarioTab } from './scenario-tab.ts';
```
2. Replace:
```ts
  /** Window to listen on for the reveal gestures (default: the element's window). */
  win?: Window;
}
```
with:
```ts
  /** Window to listen on for the reveal gestures (default: the element's window). */
  win?: Window;
  /** Built-in scenarios the host can load by id (Stage 6b Scenario tab). */
  scenarios?: Array<{ id: string; title: string }>;
}
```
3. Replace:
```html
      <button type="button" role="tab" data-tab="bookmarks" aria-selected="false">Bookmarks</button>
    </div>
```
with:
```html
      <button type="button" role="tab" data-tab="bookmarks" aria-selected="false">Bookmarks</button>
      <button type="button" role="tab" data-tab="scenario" aria-selected="false">Scenario</button>
    </div>
```
4. Replace `    <div class="pme-stagebar" data-count="0">` with:
```html
    <div class="pme-body" data-pane="scenario" hidden></div>
    <div class="pme-stagebar" data-count="0">
```
5. Replace:
```ts
  const controls = renderControls(q('[data-pane=controls]'), o.vocabulary, { submit }, { mode: s.state?.mode ?? 'manual' });
```
with:
```ts
  const controls = renderControls(q('[data-pane=controls]'), o.vocabulary, { submit }, { mode: s.state?.mode ?? 'manual' });
  const scenarioTab = mountScenarioTab(q('[data-pane=scenario]'), { session: s, ...(o.scenarios ? { catalogue: o.scenarios } : {}) });
```
6. In `render`, replace:
```ts
    controls.update(s.state, s.measurements);
    status.textContent
```
with:
```ts
    controls.update(s.state, s.measurements);
    scenarioTab.update();
    status.textContent
```

- [ ] **Step 5: Styles**

In `packages/controller/src/panel/styles.ts`, replace:
```ts
.pme-remote .pme-vitals{display:flex;gap:18px;font-size:28px;font-variant-numeric:tabular-nums;margin:8px 0}
`;
```
with:
```ts
.pme-remote .pme-vitals{display:flex;gap:18px;font-size:28px;font-variant-numeric:tabular-nums;margin:8px 0}
.pme-scn-error{color:#f66;font-size:12px;white-space:pre-wrap}
.pme-scn-next,.pme-scn-states{margin:0;padding-left:18px}
.pme-scn-next li,.pme-scn-states li{margin:4px 0}
.pme-scn-states li[aria-current="step"]{color:#fff;font-weight:700}
.pme-scn-notes{color:#aaa;font-size:12px;margin:4px 0}
.pme-scn-remote{border:1px solid #333;border-radius:8px;padding:6px 8px;margin:8px 0}
`;
```

- [ ] **Step 6: Run**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
```
Expected: `Tests  19 passed (19)` (6a's 13 panel tests + 6); typecheck exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/controller/src/panel packages/controller/test/panel/scenario-tab.dom.test.ts
git commit -m "feat(panel): Scenario tab — load (built-in/file/URL), state and time, next transitions, triggers, goto, timeline"
```

---

### Task 15: Manual-trigger buttons on the remote

**Files:**
- Modify: `packages/controller/src/remote/remote-app.ts`
- Create: `packages/controller/test/remote/remote-scenario.dom.test.ts`

**Interfaces:**
- Produces: a `.pme-scn-remote` strip (hidden until a scenario is loaded) under the vitals: `.pme-scn-state` = "<state label> · <n> s[ · paused]" and one `button[data-action=scenario-trigger][data-target=<id>]` per transition of the current state that has a manual trigger (label = the manual label). Pressing one sends `scenario trigger`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment happy-dom
// The remote shows the scenario state and its manual-trigger buttons (Stage 6b).
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountRemote } from '../../src/remote/remote-app.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

describe('remote scenario strip (DOM)', () => {
  it('shows the current state and only the manual buttons, and pressing one triggers it', async () => {
    const host = manualHost({ seed: 42 });
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REM234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panelSession = new ControllerSession({ session: 'REM234', transport: hub.connect() });
    await waitFor(() => panelSession.hostOnline);
    await panelSession.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    const remote = mountRemote(document.body, { vocabulary: stage1Vocabulary(), vias: ['broadcastChannel'], connect: () => hub.connect() });
    remote.join('REM234', 'broadcastChannel');
    cleanup.push(() => remote.destroy(), () => panelSession.close(), () => (hs as HostSession).close(), () => driver.close());
    const strip = () => document.querySelector('.pme-scn-remote') as HTMLElement;
    await waitFor(() => !strip().hidden);
    expect(strip().querySelector('.pme-scn-state')?.textContent).toMatch(/^Stable in PACU · \d+ s$/);
    const labels = () => [...strip().querySelectorAll('button')].map((b) => b.textContent);
    expect(labels()).toEqual(['Start VF now']);
    (strip().querySelector('button') as HTMLButtonElement).click();
    await waitFor(() => driver.runner?.stateId === 'vf');
    await waitFor(() => labels().join() === 'ROSC now'); // VF: only the manual one; shocks come from the learner
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/remote/remote-scenario.dom.test.ts`
Expected: FAIL — `strip()` is null (`Cannot read properties of null (reading 'hidden')`).

- [ ] **Step 3: Implement**

In `packages/controller/src/remote/remote-app.ts`, replace:
```html
      <div class="pme-vitals"><span data-v="hr">HR ---</span><span data-v="simT">t --:--</span></div>
```
with:
```html
      <div class="pme-vitals"><span data-v="hr">HR ---</span><span data-v="simT">t --:--</span></div>
      <div class="pme-scn-remote" hidden><div class="pme-scn-state"></div><div class="pme-row pme-scn-buttons"></div></div>
```
and replace:
```ts
    const render = () => {
      controls.update(s.state, s.measurements);
```
with:
```ts
    let shownState: string | null = null;
    const scn = q<HTMLElement>('.pme-scn-remote');
    scn.onclick = (ev) => {
      const target = (ev.target as HTMLElement).closest('button')?.dataset.target;
      if (target) fire({ type: 'scenario', action: 'trigger', target });
    };
    /** Stage 6b: the scenario's current state and its manual-trigger buttons. */
    const renderScenario = () => {
      const v = s.scenario;
      scn.hidden = !v.doc;
      if (!v.doc) return;
      const tin = s.simT === null ? 0 : v.timeInState(s.simT);
      q<HTMLElement>('.pme-scn-remote .pme-scn-state').textContent = `${v.stateLabel()} · ${Math.floor(tin)} s${v.paused ? ' · paused' : ''}`;
      if (shownState === `${v.docVersion}:${v.stateId}`) return;
      shownState = `${v.docVersion}:${v.stateId}`;
      q<HTMLElement>('.pme-scn-buttons').replaceChildren(
        ...v.next().filter((n) => n.manual !== null).map((n) => {
          const b = doc.createElement('button');
          b.type = 'button';
          b.dataset.action = 'scenario-trigger';
          b.dataset.target = n.id;
          b.textContent = n.manual as string;
          return b;
        }),
      );
    };
    const render = () => {
      controls.update(s.state, s.measurements);
      renderScenario();
```

- [ ] **Step 4: Run the whole controller suite**

```bash
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
npx -y pnpm@9.15.9 --filter @pme/controller test
```
Expected: typecheck exit 0; `Test Files  32 passed (32)`, `Tests  185 passed (185)` (≈ 15 s).

- [ ] **Step 5: Commit**

```bash
git add packages/controller/src/remote/remote-app.ts packages/controller/test/remote/remote-scenario.dom.test.ts
git commit -m "feat(remote): scenario state and manual-trigger buttons"
```

---

### Task 16: Demo `stage6b-acls.html` — host, panel with the Scenario tab, learner action bar

**Files:**
- Create: `apps/demo/stage6b-acls.html`, `apps/demo/src/stage6b/actions.ts`, `apps/demo/src/stage6b/acls.ts`
- Modify: `apps/demo/vite.config.ts` (one input line), `apps/demo/index.html` (one link)

**Interfaces:**
- Consumes: `mountSimMonitor` from `apps/demo/src/stage6a/sim-monitor.ts` (read-only reuse), `@pme/controller`, `@pme/controller/scenario`.
- Produces: the page (URL `?session=CODE&scenario=<built-in id>&seed=<engine seed, default 42>`), and `window.__pme6b = { session, hs, driver, mon, panel, panelSession, learner, scenarioLog }` for the e2e. The remote is 6a's `stage6a-remote.html` (it gains the scenario strip from Task 15), opened by the "Open remote" button over BroadcastChannel.

- [ ] **Step 1: The page**

`apps/demo/stage6b-acls.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 6b: scenario runner — ACLS</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 0; }
      #monitor { height: min(62vh, 440px); }
      .bar { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; padding: 8px 12px; border-top: 1px solid #222; }
      .code { font: 700 22px ui-monospace, monospace; letter-spacing: .12em; color: #fff; }
      button { font: inherit; min-height: 40px; background: #1a1a1a; color: #eee; border: 1px solid #444; border-radius: 6px; padding: 4px 12px; }
      #actions button { border-color: #c33; }
      #actions button[data-kind="cpr"][aria-pressed="true"] { background: #633; }
      #scenario { font: 600 16px system-ui, sans-serif; color: #fc6; }
      #notes, #diag { font: 12px ui-monospace, monospace; color: #8f8; white-space: pre-wrap; padding: 0 12px; }
      #notes { color: #c96; }
      .hint { color: #777; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="bar"><span id="scenario">No scenario loaded</span></div>
    <div class="bar" id="actions" aria-label="Learner actions"><strong>Learner:</strong></div>
    <div class="bar">
      <span>Session <span class="code" id="code">------</span></span>
      <button id="openRemote">Open remote</button>
      <button id="sound">Enable sound</button>
      <span class="hint">Press <kbd>i</kbd> for the instructor panel → Scenario tab.</span>
    </div>
    <div id="notes"></div>
    <div id="diag"></div>
    <script type="module" src="./src/stage6b/acls.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage6b/actions.ts`:
```ts
// The learner action bar: what the team at the bedside does. Each button is an `applyEvent` (brief §7.2
// ClinicalEvent). The engine does not model these events yet (Stages 4 and 7); the scenario runner still sees
// them, so transitions fire — shocks, drugs, CPR, pacing — while the rhythm changes come from the scenario.
import type { ClinicalEvent } from '@pme/controller';

export interface LearnerAction {
  id: string;
  label: string;
  event: ClinicalEvent;
  /** CPR is a toggle: the button alternates between `event` and `off`. */
  off?: ClinicalEvent;
}

export const LEARNER_ACTIONS: LearnerAction[] = [
  { id: 'shock200', label: 'Shock 200 J', event: { kind: 'defib', action: 'shock', energyJ: 200 } },
  { id: 'cpr', label: 'Start CPR', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 }, off: { kind: 'cpr', active: false } },
  { id: 'epi1', label: 'Epinephrine 1 mg', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } },
  { id: 'amio300', label: 'Amiodarone 300 mg', event: { kind: 'drug', drugId: 'amiodarone', dose: 300, unit: 'mg', route: 'iv' } },
  { id: 'adeno6', label: 'Adenosine 6 mg', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } },
  { id: 'adeno12', label: 'Adenosine 12 mg', event: { kind: 'drug', drugId: 'adenosine', dose: 12, unit: 'mg', route: 'iv' } },
  { id: 'atropine', label: 'Atropine 1 mg', event: { kind: 'drug', drugId: 'atropine', dose: 1, unit: 'mg', route: 'iv' } },
  { id: 'pace', label: 'Pace 70 mA', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 70 } },
  { id: 'fluid', label: 'Fluid 1000 mL', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 1000, overS: 300 } },
  { id: 'propofol', label: 'Propofol 150 mg', event: { kind: 'drug', drugId: 'propofol', dose: 150, unit: 'mg', route: 'iv' } },
  { id: 'phenyl', label: 'Phenylephrine 100 µg', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } },
];
```

`apps/demo/src/stage6b/acls.ts`:
```ts
// Stage 6b demo: the host monitor runs a scenario. Hidden instructor panel (Scenario tab: load, state, next
// transitions, triggers, goto, timeline), a learner action bar (applyEvent), and the Stage 6a remote page, which
// now shows the scenario's manual-trigger buttons. URL: ?session=CODE&scenario=<built-in id>&seed=<engine seed>.
import {
  ControllerSession,
  createBroadcastChannelTransport,
  createInProcessHub,
  HostSession,
  mountInstructorPanel,
  newSessionCode,
  normalizeSessionCode,
  vocabularyOf,
  type ScenarioEvent,
} from '@pme/controller';
import { BUILTIN_CATALOGUE, ScenarioDriver } from '@pme/controller/scenario';
import { mountSimMonitor } from '../stage6a/sim-monitor.ts';
import { LEARNER_ACTIONS } from './actions.ts';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const params = new URLSearchParams(location.search);
const session = normalizeSessionCode(params.get('session') ?? '') ?? newSessionCode();
if (params.get('session') !== session) history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), session })}`);
$('code').textContent = session;

const mon = mountSimMonitor($('monitor'), { engine: { seed: Number(params.get('seed') ?? 42) }, lanes: ['ecgII', 'V5'] });
let hs: HostSession | null = null;
const scenarioLog: string[] = [];
const driver = new ScenarioDriver({
  target: mon.host,
  submit: (c) => (hs as HostSession).submit(c),
  publish: (e: ScenarioEvent) => {
    scenarioLog.push(`${e.t.toFixed(2)} s → ${e.stateId}${e.transitionId ? ` (${e.transitionId})` : ''}`);
    hs?.publish(e);
  },
});
hs = new HostSession({ session, target: driver.host, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
const hub = createInProcessHub();
hs.addTransport(hub.connect());
hs.addTransport(createBroadcastChannelTransport(session));
mon.onFrame(() => driver.poll()); // the runner advances once per frame, at the engine's sim time

const panelSession = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'panel' });
const panel = mountInstructorPanel(document.body, {
  session: panelSession,
  vocabulary: vocabularyOf(mon.core.engine),
  scenarios: BUILTIN_CATALOGUE,
  sound: { enable: () => mon.enableSound() },
});

// Learner actions go through their own controller session, so they are logged and acked like any other command.
const learner = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'learner' });
for (const a of LEARNER_ACTIONS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.kind = a.id;
  b.textContent = a.label;
  let on = false;
  b.addEventListener('click', () => {
    const event = a.off && on ? a.off : a.event;
    if (a.off) {
      on = !on;
      b.textContent = on ? 'Stop CPR' : a.label;
      b.setAttribute('aria-pressed', String(on));
    }
    void learner.send({ type: 'applyEvent', event }).catch(() => undefined);
  });
  $('actions').append(b);
}

$('openRemote').addEventListener('click', () => window.open(`./stage6a-remote.html?session=${session}&via=bc`, 'pme-remote', 'width=480,height=900'));
$('sound').addEventListener('click', () => void mon.enableSound().then(() => ($('sound').textContent = 'Sound on')));

const initial = params.get('scenario');
if (initial) void panelSession.send({ type: 'scenario', action: 'load', target: initial });

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
setInterval(() => {
  const r = driver.runner;
  $('scenario').textContent = r
    ? `${r.doc.title} — ${r.state().label ?? r.stateId} · ${fmt(r.stateT)} in state · scenario ${fmt(r.scenarioT)}${r.paused ? ' · PAUSED' : ''}`
    : 'No scenario loaded (press i → Scenario)';
  $('notes').textContent = driver.notes.join('\n');
  const s = hs?.stats;
  $('diag').textContent = `t ${mon.core.clock.renderT.toFixed(1)} s · applied ${s?.applied} · rejected ${s?.rejected} · panel ${panel.isOpen ? 'open' : 'hidden'}\n${scenarioLog.slice(-6).join('\n')}`;
}, 250);

Object.assign(window, { __pme6b: { session, hs, driver, mon, panel, panelSession, learner, scenarioLog } });
```

- [ ] **Step 2: Register the page**

In `apps/demo/vite.config.ts`, replace:
```ts
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
```
with:
```ts
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
        'stage6b-acls': page('stage6b-acls'),
```
In `apps/demo/index.html`, replace:
```html
        <a href="./stage6a-remote.html">remote controller</a> · <a href="./stage6a-viewer.html">viewer</a></li>
```
with:
```html
        <a href="./stage6a-remote.html">remote controller</a> · <a href="./stage6a-viewer.html">viewer</a></li>
      <li><a href="./stage6b-acls.html?scenario=acls-vf-witnessed">Stage 6b: scenario runner — ACLS (VF)</a></li>
```

- [ ] **Step 3: Typecheck and build**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck
npx -y pnpm@9.15.9 --filter @pme/demo build 2>&1 | grep stage6b
```
Expected: exit 0; `dist/stage6b-acls.html` and a `stage6b-acls-*.js` asset listed.

- [ ] **Step 4: Look at it**

Serve from your own shell (the browser-pane launcher sandbox and `file://` do not work for this app; Stage 6a gate, deviation 4): `npx -y pnpm@9.15.9 --filter @pme/demo exec vite --port 5207 --strictPort --host 127.0.0.1` in the background, then open `http://127.0.0.1:5207/stage6b-acls.html?scenario=acls-vf-witnessed` (a visible browser window, or headless Chrome — a hidden pane throttles rAF). Check:
- the orange line reads `[draft] Witnessed VF in PACU — Stable in PACU · 00:0x in state …` and the notes list `/states/1/onEnter/0/rhythm: "vfCoarse" is not in this engine` (until Stage 5 merges);
- after 60 s (or `i` → Scenario → "Start VF now") the trace becomes the VT 240 stand-in and the notes add `vfCoarse: coarse VF shown as VT 240 until Stage 5`;
- "Shock 200 J" → ROSC (seed 42: the first draw succeeds), sinus tachycardia whose HR tile climbs toward 118;
- "Open remote" → the phone-size remote shows the scenario strip with the manual buttons of the current state.
Stop the server afterwards.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/stage6b-acls.html apps/demo/src/stage6b apps/demo/vite.config.ts apps/demo/index.html
git commit -m "feat(demo): stage6b-acls — scenario host, Scenario tab, learner action bar"
```

---

### Task 17: Playwright — the ACLS run in a browser, screenshots, run log

**Files:**
- Create: `apps/demo/e2e/stage6b.e2e.ts`; generated: `docs/gates/stage-6b/{host-vf,host-rosc,remote-vf}.png`, `docs/gates/stage-6b/run-log.json`

**Interfaces:**
- Consumes: Task 16's page and `__pme6b`; 6a's remote page.

- [ ] **Step 1: Write the test**

`apps/demo/e2e/stage6b.e2e.ts`:
```ts
// Stage 6b in a browser: load the ACLS scenario from the panel's Scenario tab, start VF from the REMOTE's manual
// button, shock from the learner bar, reach ROSC; screenshots and the scenario run log go to docs/gates/stage-6b/.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/stage6b.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6b');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6b: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6b' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}
const stateId = (p: Page) => g(p, (w) => (w.__pme6b.driver.runner?.stateId ?? null) as string | null);

test('ACLS VF: panel load → remote starts VF → learner shocks → ROSC', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/stage6b-acls.html?session=GATE6B&seed=42`);
  await page.keyboard.press('i');
  await page.locator('[data-tab=scenario]').click();
  await page.locator('select[name=scenario-builtin]').selectOption('acls-vf-witnessed');
  await page.locator('[data-action=scenario-load-builtin]').click();
  await expect(page.locator('.pme-scn-state')).toHaveText('Stable in PACU');
  await expect(page.locator('.pme-scn-next li')).toHaveCount(1);

  const remote = await page.context().newPage();
  await remote.setViewportSize({ width: 390, height: 844 });
  await remote.goto(`${base}/stage6a-remote.html?session=GATE6B&via=bc`);
  const strip = remote.locator('.pme-scn-remote');
  await expect(strip.locator('button')).toHaveText(['Start VF now']);
  await strip.locator('button').click();
  await expect.poll(() => stateId(page), { timeout: 5_000 }).toBe('vf');
  await expect(page.locator('.pme-scn-state')).toHaveText('Coarse VF');
  await expect(strip.locator('button')).toHaveText(['ROSC now']);
  await page.waitForTimeout(7_000); // a sweep of the VF stand-in
  await page.screenshot({ path: resolve(out, 'host-vf.png') });
  await remote.screenshot({ path: resolve(out, 'remote-vf.png'), fullPage: true });

  await page.locator('#actions button', { hasText: 'Start CPR' }).click();
  await page.locator('#actions button', { hasText: 'Shock 200 J' }).click();
  await expect.poll(() => stateId(page), { timeout: 5_000 }).toBe('rosc'); // seed 42: the first draw is 0.062 < 0.3
  await expect(page.locator('.pme-scn-state')).toHaveText('ROSC');
  await page.waitForTimeout(9_000);
  await page.screenshot({ path: resolve(out, 'host-rosc.png') });

  const log = await g(page, (w) => ({ entries: w.__pme6b.driver.runner.log, notes: w.__pme6b.driver.notes, lines: w.__pme6b.scenarioLog }));
  writeFileSync(resolve(out, 'run-log.json'), `${JSON.stringify(log, null, 2)}\n`);
  expect(log.lines.map((l: string) => l.replace(/^[\d.]+ s /, ''))).toEqual(['→ stable', '→ vf (arrest)', '→ rosc (shockVf)']);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage6b.e2e.ts`
Expected: `1 passed` (≈ 18 s). Open the three PNGs: `host-vf.png` shows the drawer on the Scenario tab (Coarse VF, four "Next" rows with Force/ROSC now) over the VT-240 stand-in; `host-rosc.png` shows ROSC; `remote-vf.png` shows the strip "Coarse VF · n s" with one button "ROSC now". `run-log.json` holds the runner log (start, enter, dispatch …, roll with `u ≈ 0.0617`, enter rosc), `notes` and three `lines`.

- [ ] **Step 3: Existing browser tests still pass**

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage6a.e2e.ts apps/demo/e2e/stage6a-worker.e2e.ts apps/demo/e2e/iife-smoke.e2e.ts --workers=1`
Expected: `8 passed` (viewers synced over bc/relay/rtc with drift 0).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/e2e/stage6b.e2e.ts docs/gates/stage-6b
git commit -m "test(e2e): ACLS scenario in the browser — panel load, remote trigger, learner shock, ROSC; gate evidence"
```

---

### Task 18: Full verification and clean-clone rehearsal

**Files:** none (evidence for the gate note).

- [ ] **Step 1: Whole repository**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
```
Expected: exit 0. Tests: controller **185** (32 files), engine-core 112, renderer 26, audio 19, validation 6, skins 1 — **349** in total (Stage 6a: 261). `check-notices: OK (1 governed files)`. IIFE `94.05 kB`.

- [ ] **Step 2: Clean clone (what CI does)**

```bash
SCR=$(mktemp -d)
git clone --branch stage-6b-scenario-runner "$PWD" "$SCR/pme" && cd "$SCR/pme"
npx -y pnpm@9.15.9 install --frozen-lockfile && npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
cd - && rm -rf "$SCR"
```
Expected: exit 0 with the same numbers. (CI also runs `pnpm test:e2e` on Chromium AND WebKit: `stage6b.e2e.ts` uses only BroadcastChannel, which WebKit supports.)

- [ ] **Step 3: Viewer spot check (manual, 2 min)**

With Task 16's server running, open `stage6b-acls.html?session=GATE6B&scenario=acls-vf-witnessed` and `stage6a-viewer.html?session=GATE6B&via=bc`; press "Start VF now" in the panel and "Shock 200 J". The viewer's line must stay `synced · … · beat drift 0.0 ms` through both scenario transitions (it mirrors the runner's commands, stand-ins included). Record the line for the gate note.

---

### Task 19: Gate note `docs/gates/stage-6b.md`

**Files:**
- Create: `docs/gates/stage-6b.md`

- [ ] **Step 1: Write the note** in the house style of `docs/gates/stage-6a.md`: title with date; the gate question from BUILD-PLAN Stage 6 ("Can Ali run a 10-minute ACLS scenario from the laptop without touching the iPad monitor, and recover cleanly from a Wi-Fi drop?" — the drop half was Gate 6a); then a **check table** with measured numbers:

| Check | Where the number comes from |
|---|---|
| Clean-clone typecheck/test/build/check-notices, test totals per package | Task 18 |
| Schema: invalid documents rejected with path-level messages (acceptance 6) | `schema.test.ts` (21), quote two messages |
| Triggers: afterS, atScenarioS, vital…forS, event minJ/minDose, sensor, manual, all/any, priority, stay, pause, goto, poll-rate independence (acceptance 5) | `runner.test.ts` (18) |
| Probability 0.3 over 10,000 seeded trials (acceptance 5: 0.30 ± 0.01) | `probability.test.ts` printed value (0.298) |
| Bookmark restore resets exactly (acceptance 5) | `driver.test.ts` bookmark test: bit-identical ecgII 66–199 s |
| Replay (acceptance 4) | `driver.test.ts` replay identity + `replay.test.ts` |
| ACLS end to end headless | the two paths from Task 11 |
| Scenario over HostSession: late join, viewers' commandApplied, one tick per stage group | `host-scenario.test.ts` (6) |
| Panel and remote | the DOM tests (7) + `stage6b.e2e.ts` |
| ajv containment | Task 13 sizes and grep counts |
| Viewer follows the scenario | Task 18 Step 3 line |
| iPad host / phone remote on the LAN | **pending Ali** |

Then: **Screenshots** (`stage-6b/host-vf.png`, `host-rosc.png`, `remote-vf.png`, one line each on what they show); **Scenario run log** — paste the three `lines` from `stage-6b/run-log.json` and the `roll` entry, and link the file; **Clinical review for Ali** — the five scenario summaries from Task 10 with every [ENG] probability/timing listed as a question (e.g. "ROSC per shock in coarse VF 0.3?", "fine VF after 4 min?", "adenosine conversion 0.6 per dose?", "atropine partial response 0.2 in wide CHB?", "PEA: fluid ≥ 500 mL AND epinephrine, p 0.6?"); **Stand-ins in force** (the table from Decision 9, and that they vanish when Stage 5 merges); **Not done / deferred** (`time step|jump`; BP/EtCO2 steps waiting for Stage 2 in `$comment`; the physiology of shocks/drugs/CPR — Stages 4/7; LAN/iPad runs); **Deviations from the plan** (anything you changed and why; NOTICE ID renumbering if any; merge conflicts with Stage 5 in `apps/demo/vite.config.ts`/`index.html` if `main` moved); **Notes for other stages** (the three bullets of "Requests for the orchestrator" above).

- [ ] **Step 2: Commit**

```bash
git add docs/gates/stage-6b.md docs/plans/stage-6b-scenario-runner.md
git commit -m "docs(gates): stage 6b gate evidence — scenario runner, ACLS demo, clinical questions for review"
```

---

### Task 20: Push and open the pull request (do not merge)

- [ ] **Step 1: Sync with `main` if it moved**

```bash
git fetch origin
git merge --no-edit origin/main   # only if origin/main moved since Task 1
```
Expected conflicts only in `NOTICES.md` (renumber this stage's rows to the next free IDs, and the note/README references to them), `apps/demo/vite.config.ts` and `apps/demo/index.html` (keep both stages' lines). If Stage 5 merged: re-run `driver.test.ts` — the ACLS path must be unchanged; `driver.notes` then has no stand-in lines (update the two expectations that assume the stand-in: in `driver.test.ts` the `notes` check becomes "has no stand-in line", and in `host-scenario.test.ts` the awaited rhythm `vtMono` becomes `vfCoarse`; record both under Deviations). If Stage 2 merged and the engine emits `state`: nothing to change; `vital` triggers read it at rank 3. Re-run Task 18 Step 1 after any merge.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin stage-6b-scenario-runner
gh pr create --base main --head stage-6b-scenario-runner --title "Stage 6b: scenario timeline runner + ACLS demo" --body-file - <<'BODY'
## What this PR does

Stage 6b (BUILD-PLAN Stage 6, second half), Tasks 1–20 of `docs/plans/stage-6b-scenario-runner.md`:
`pme-scenario/1` JSON Schema + ajv validation with path-level errors; a pure tick-driven runner (afterS,
atScenarioS, vital…forS, event filters, sensor, manual, all/any, probability/else on the seeded `scenario`
stream); host-side driver (scenario hook, bookmarks = engine snapshot + runner state, replay log, rhythm
stand-ins until Stage 5, scenario-only acceptance of applyEvent/attachSensor); panel Scenario tab; remote
manual-trigger buttons; five built-in [draft] scenarios; `stage6b-acls.html` with a learner action bar.
Gate evidence: `docs/gates/stage-6b.md`. The clinical content awaits Ali's review.

## Sources consulted

- docs/DESIGN-BRIEF.md §3.3, §4.9, §6.5, §7.2–§7.4; docs/BUILD-PLAN.md Stage 6
- research/01-commercial-simulators.md §2.3, §5; research/05-rendering-ux-integration.md §4.2
- ajv documentation (strict mode, discriminator, error objects)

## NOTICES rows added

- N-010 ajv 8.20.0 (MIT), N-011 fast-uri 3.1.8 (BSD-3-Clause, text in LICENSES/), N-012 fast-deep-equal, json-schema-traverse, require-from-string (MIT)

## Checks

- [x] `pnpm typecheck && pnpm test && pnpm build && pnpm check-notices` pass locally (349 tests)
- [x] Demo page for this stage runs (`stage6b-acls.html`; Playwright `stage6b.e2e.ts`)
BODY
```
(End the body with the PR attribution line your session's instructions give.) Expected: the PR URL. Do **not** merge; report the URL and the CI status to the orchestrator (R21: it merges after inspecting the gate).
