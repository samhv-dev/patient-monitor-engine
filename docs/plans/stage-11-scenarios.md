# Stage 11: the showcase-2 scenario set — five teaching scenarios as cards, with their scenario tests and run sheets — Implementation Plan

STATUS: READY — R50 REVIEWED AND FIXED (2026-10-11; review `scratch/plans-backup/stage-11-review.md`: 1 critical,
6 important, 7 minor, all applied; the orchestrator's rulings on Q1–Q12 applied). Base `origin/main` 7a3d5672 (FU-11 a + c
and FU-7.1 a merged) with the REAL pending branches `origin/fu-7.1-b` f35ef125 and `origin/fu-11-b` 6988b983 merged on
top in the prototype; every number below is from that prototype; 8 tasks + a gate; executes AFTER `fu-7.1-b` and
`fu-11-b` have merged (and `fu-11-d` if it has merged by then: it touches none of this plan's files). Q1–Q12 are closed
by the orchestrator's rulings ("Owner questions"); Q13–Q15 are new and gate nothing.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prototype.** Every task was run in a throwaway worktree detached at `origin/main` 7a3d5672 with, on top, the
> physiology this stage executes after: `scratch/plans-backup/fu-7.1-prototype.patch` branch-b files only (B1 acidaemia
> coupling, B3 EtCO2 washout, B4 tamponade drainage, B5 breath VT, B7 COPD start, B8 NIBP pulseless — 20 files, all
> applied cleanly; branch a's 16 files are byte-identical on main) and `scratch/plans-backup/fu-11-prototype.patch`
> branches b/d (46 files applied, 74 already on main; 9 hunks in `apps/demo/src/app/main.ts`, the controller sessions and
> `packages/renderer/src/{mount,worker-host}.ts` did not apply because FU-11 a/c merged a different form — none is
> engine physiology, none is a file this plan touches), committed locally as the base `ca48e7c4`
> (`scratch/wt-stage-11-proto2`). The same tests had first been measured on the previous base (7513a481 + FU-7.1 a+b +
> FU-11 b–d, `scratch/wt-stage-11-proto`) and, as a cross-check, on `origin/main` merged with the REAL pending
> branches `origin/fu-7.1-b` f35ef125 and `origin/fu-11-b` 6988b983 (`scratch/wt-stage-11-real`): **every one of the 189
> measured numbers was identical on all three trees.** The
> blocks below were CUT MECHANICALLY from that tree (`scratch/plans-backup/stage-11-plan-tools/blocks.py build`), and
> `blocks.py check` applies every block of this file, in order, to `origin/main` and reproduces the prototype's 16
> files byte for byte (0 problems). Patch (base → prototype): `scratch/plans-backup/stage-11-prototype.patch`. Nothing
> was committed to any branch, nothing was pushed; both worktrees were removed.
>
> **R50 re-cut (2026-10-11).** The reviewer rebuilt the prototype as `origin/main` 7a3d5672 + `git merge --no-commit
> origin/fu-7.1-b origin/fu-11-b` + the planner's patch (`scratch/wt-stage-11-review`), reproduced all 19 cases (5 files,
> 19 passed, every printed number equal to the planner's), then applied the review's fixes and the rulings: S3 and S4
> re-measured with the preoxygenation held until "Induce now" (Q5), S3's whole airway-not-secured course moved (below),
> S4's numbers did not move. Blocks re-cut from that tree with the same `blocks.py build`; `blocks.py check` on
> `origin/main`: see "Mechanical self-check". Patch refreshed: `scratch/plans-backup/stage-11-prototype.patch`.

**Goal:** the five showcase-2 scenarios the owner asked for the 2026-10-22 demonstration to university clinicians
("scenarios should be more detailed with more steps"; MH and CPR must be there) as `pme-scenario/1` cards in the app's
Showcase group — S1 malignant hyperthermia, S2 a stab wound with pericardial tamponade → PEA → CPR → pericardiocentesis →
ROSC, S3 the healthy induction with its "airway not secured" branch, S4 the induction after fentanyl and midazolam, and
S5 the haemorrhage and anaphylaxis cards kept as they are (the haemorrhage story's two numbers updated, Q3) — each with
its instructor buttons, measurable objectives, a Vitest scenario test that runs its happy and its untreated path on the
engine with R45 bands, and a run sheet; and the kit's rehearsal script re-written for the six cards (Q12).

**Architecture:** content, not code. Each card is a JSON state machine in `apps/demo/src/app/showcase/` (the app's
`import.meta.glob('./showcase/*.json')` lists it with no code change). The physiology does every change; the buttons
only give what their label says; milestone states (desaturation, early MH signs, PEA, …) are entered by the card's own
vital triggers so the label always says where the case is. A test-only harness (`showcase/harness.ts`) builds the
engine exactly as the app's `loadScenario` does and presses the card's own buttons by their labels; one `*.slow.test.ts`
per card asserts the measured course with bands. The slow tests run in a new `showcase` group of CI's `test-slow` job
(they take ≈ 4 min serially); the main job's fast set leaves them out, as engine-core does with its SLOW set. Two
registry lines order the Showcase group for the demonstration.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2.7, pnpm 9.15.9 via `npx -y pnpm@9.15.9` (pnpm is not on PATH),
Node ≥ 22.12. No new dependency, no engine change.

**Spec and inputs:** the brief `../scratch/briefs/plan-stage-11-scenarios.md` (workspace, outside this repo);
`../research/24-showcase2-probes.md` §P2 (MH: how it is triggered, the untreated course), §P3 (tamponade, pulsus), §P4
(premedication), §P5 (unsecured airway); `docs/plans/fu-7.1-drug-physiology-leftovers.md` (A2 synergy, A4 the two
events of diaphragm recovery, B1 acidaemic vascular blunting, B4 the drained tamponade); `docs/plans/stage-10-time-control.md`
(×8 and the 2/5-min fast-forward — durations are given for them, nothing depends on them);
`../research/18-showcase-docs/presenter/VERIFIED.md` (the old run-sheet numbers S5 is compared with); R45 (bands from
the measured prototype ± a stated tolerance, never widened later), R50 (a reviewer reads this plan before an executor).

---

## Global Constraints

- **No physiology change.** No file under `packages/` changes. A number that surprises (several below) is reported to
  the owner or the calibration queue, never tuned.
- **Partition (declared).** FU-11 owns `apps/demo/src/app/**` except the showcase content. This plan edits:
  `apps/demo/src/app/showcase/**` (its own folder: six JSON files — four new or rewritten, bronchospasm's `category`, the
  haemorrhage story's two numbers — and seven new test/harness files) and, outside it,
  exactly: **`apps/demo/src/app/scenarios.ts`** (the registry: one `SHOWCASE_ORDER` constant and the sort line that reads
  it), **`apps/demo/src/app/showcase.test.ts`** (its one line listing the Showcase ids), **`apps/demo/vite.config.ts`**
  (a `test` block: the fast/showcase split), **`.github/workflows/ci.yml`** (the `showcase` matrix entry and its own
  step) and, R50 (Q12 + review C1), the kit's three scripts that load Showcase cards by title:
  **`scripts/showcase/rehearsal.showcase.ts`** (rewritten for the six cards), **`scripts/showcase/sound.showcase.ts`**
  (one title, one button label) and **`scripts/showcase/make-videos.mjs`** (the six cards' video names). Checked against
  the pending branches on 2026-10-10/11: `origin/fu-11-b` (81 files) and `origin/fu-7.1-b` touch none of these files;
  `docs/plans/stage-10-time-control.md`'s patch touches none either. FU-7.1 b's and Stage 10's gates RUN the old kit
  scripts (FU-7.1 b Step 3, Stage 10 G4); both are ordered before this stage, so no gate runs a script in the middle of
  this change. If Stage 10 executes after this stage merges, its G4 runs the six-card rehearsal (it loads its own cases
  by id, `?scenario=`, so nothing else of Stage 10 depends on the Showcase group).
- **R45.** Every band in the tests is the measured prototype value ± the tolerance in "Bands" below. An executor who
  measures a number outside its band STOPS and reports both numbers; the band is not widened, the card not re-tuned.
- **The kept cards are kept.** `showcase-anaphylaxis.json` is not edited (brief S5); `showcase-haemorrhage.json` changes
  only the two numbers of its story and notes (Q3 ruling: prose, not physiology); `showcase-bronchospasm.json` changes one
  field (`category`) so that it leaves the Showcase group but stays in the library (Q2).
- **Ids and titles the e2e tests load stay.** `showcase-induction`, `showcase-tamponade` (loaded by
  `e2e/showcase-clock.e2e.ts`, `fu11-restore.e2e.ts`, `fu11-follower.e2e.ts`), `showcase-bronchospasm`
  (`fu11-vent-restore.e2e.ts`, `fu11-follower.e2e.ts`) and the title "Anaphylaxis under anaesthesia" are unchanged.
- **CI rule.** Every long test yields once per sim-minute; slow tests run one file at a time (`fileParallelism: false`).
  CI amendments 5–6 (the seven engine-core slow groups, packed by measured time) are untouched: the `showcase` entry is
  an EIGHTH job of the `test-slow` matrix with its own step; no engine-core file moves between groups and the build
  job's "slow groups are disjoint and cover SLOW" step (engine-core only) is unchanged.
- **Commands.** Never a command that reads stdin; never an unfiltered `pkill`; stop only processes you started. Four
  executors may share the machine: run targeted test files, not the whole suite, until the gate.
- **Commits.** End every commit message with the attribution line the session gives; one branch `stage-11-scenarios`;
  PR only at the gate.

## Review Focus

1. **The presenter runs at ×4 or ×8, not ×1.** The app polls the scenario driver every 100 ms of WALL time, so at ×8
   vital triggers are checked every 0.8 s of sim, not 0.1 s. A state could fire later, or a different state first.
   Pinned: Task 2's "at ×8" case runs S2 with the driver polled every 0.8 s and asserts the same state sequence and the
   same ROSC band.
2. **The presenter presses a button late or early.** The run sheets give the times the tests used. Induction is the
   presenter's "Induce now" (Q5: no automatic induction); the face mask holds FiO2 1.0 from 0:00 until the breathing has
   stopped after the induction (D-4), so inducing late costs nothing: pinned by S3's "induced a minute late" case (the
   desaturation keeps its time from the induction, inside the same bands as at 3:00). Inducing EARLY (before 3:00) is
   a shorter preoxygenation: the run sheets and the awake state's note say "at 3:00 or later".
3. **A drug given from the Drugs panel instead of the card's button.** The card's state does not follow (cards
   advance on their buttons and on vital triggers only); the physiology does. The run sheets say "use the card's
   button". Not tested (no card relies on a panel drug); recorded here so the reviewer can reject that choice.
4. **A button pressed in the wrong state.** Each state offers only the buttons that make sense there; the structural
   test (Task 6) checks every state is reachable, every command is accepted by an engine of the card's own patient and
   no state shows the same button label twice.
5. **An unsecured airway left to the end.** S3's arrest is asystole on the app's seed and asystole never regains a
   pulse in this engine (FU-4 Q3). Pinned: S3's CPR case asserts no pulse in 10 min of CPR with FiO2 1.0 and two doses
   of epinephrine — if a later stage lets asystole recover, this test turns red and the card's run sheet must change.

---

## Item inventory (every brief item, and where it is)

| Brief item | Where | Result |
|---|---|---|
| S1 MH: adult, sevoflurane + succinylcholine; induction → early signs → established → treatment → recovery / untreated arrest; manual buttons; the MH event | Task 5 | Built. MH event verified: `types-resp.ts:32` `{ kind: 'condition'; id: 'mh'; severity }` (handled `l2/resp/pipeline.ts` `case 'condition'`), `protocol.ts:53`; research/24 §P2: the app's Events list sends it; the trigger path (`neuro.mhSusceptible` + triggers) is NOT used — its 10–30 min latency (FU-10 E1) does not fit a demonstration. Untreated arrest is **VF from hyperthermia**, not hyperkalaemic (Q7). Cooling is room-temperature saline only (Q6) |
| S1 Explore "changed only" set | Task 5 (asserted) + run sheet S1 | 22 rows pinned at 19:40 (below) out of ≈ 150 that change |
| S2 trauma tamponade → PEA → CPR (2-min cycles) → drainage → ROSC → post-ROSC; pulsus | Task 2 | Built. ROSC 96 s after drainage with CPR alone, 94 s with epinephrine (FU-7.1 B4 measured 200 s / 88 s on its older, post-propofol patient); undrained never. Pulsus NOT visible (0.85 mmHg mean, 1.6 max per breath) — what the monitor shows instead is in the run sheet |
| S3 healthy induction + "airway not secured": desaturation, bradycardia, first ineffective effort, pulse loss ≈ 10 min after SaO2 < 60 %, rescue at any point; original path kept | Task 1 | Built. SpO2 < 90 % **+8:14** after induction (7.8 min of apnoea after 3 min of FiO2 1.0); first efforts at **+15:23** (36 mL, ≈ 44/min, no capnogram, no awRR) and the pulse lost 4.6 min later (+20:00, asystole); pulse loss **10:34 after SaO2 < 60 %**. Rescue by bag-mask or tube works up to +18 min (SpO2 0 for 6 min) |
| S4 premedication fentanyl 2 µg/kg + midazolam 0.03 mg/kg at −3 min, then propofol + rocuronium; S3's numbers in the story | Task 4 | Built. MAP 95 → 65 (S3) vs 90 → 52 (S4); apnoea alarm +56 s vs +43 s |
| S5 haemorrhage and anaphylaxis kept; re-measured; out-of-band numbers named | Task 3 | Kept, pinned. Five old run-sheet numbers moved out of their bands (table below); the haemorrhage story's two numbers updated (Q3) |
| JSON, Vitest happy + untreated paths with bands, run-sheet tables | Tasks 1–5; "Run sheets" | 20 cases, 5 files |
| (Q12) the kit's rehearsal on the six cards; the run-sheet numbers table for the kit job | Task 7; Gate Step 4 | Built (script); the gate writes `docs/gates/stage-11/run-sheet-numbers.md` |
| Showcase ordering, per-card duration at ×1 / ×4 / ×8 | Task 6; "Order and durations" | Built |
| Objectives written as measurable statements | each card's JSON; "Objectives and Stage 13" | Every objective is "<action> within N s of <event>" (or before/after an event), with a number or a time (structural test); verbal ones are marked "instructor-assessed" |

---

## Decisions (made while prototyping; the executors do not revisit them)

- **D-1 — cards advance on their own buttons and on vital triggers, never on panel drugs.** The existing cards used a
  twin state per drug (button vs panel). With 6–15 buttons per new card that doubles every state; the debrief feature
  reads the event log, not the state, so nothing is lost. The kept cards keep their twins.
- **D-2 — milestone states are vital-triggered, with `forS` hysteresis** (SpO2 < 90, SpO2 < 60, EtCO2 > 45 for 20 s,
  core > 38.5 °C for 10 s, systolic < 80 for 5 s, systolic < 25 for 10 s / HR < 1 for 3 s for the pulse loss). The
  runner's vital values are the engine's TRUTH (`state` event, rank 3) where it has one — so `etco2`, `spo2`, `hr`, `sbp`
  read the patient, not the monitor tile; the label can lead the monitor by a few seconds.
- **D-3 — S3's first-effort state is a timer (`afterS` 357 from the bradycardia; R50 re-fit from 569).** No vital
  variable sees a 36-mL effort (the capnogram does not, by design: FU-7.1 A4). The timer is fitted to the first
  spontaneous breath event of the prototype (+923.1 s after induction; the bradycardia state enters at +566 s, the
  first-effort state at +923 s) and the test pins the two together (`effortLabelLagS`, ± 15 s). It holds for an
  induction at 3:00 or later (the bradycardia keeps its time from the induction); an earlier induction moves the
  bradycardia earlier and the label then leads the efforts (the awake state's note says so).
- **D-4 (R50, Q5 ruling) — induction is the presenter's "Induce now"; the preoxygenation is HELD.** The awake state's
  `preoxygenate` holds FiO2 1.0 for up to 3600 s (the event's maximum), so waiting before "Induce now" costs no
  desaturation time (the planner's automatic induction at 3:00 is withdrawn: 20 s of room air after a 3-min
  preoxygenation had cost ≈ 2 min). The induced state re-sends `preoxygenate` FiO2 1.0 for 45 s: the mask stays on
  until the breathing has stopped (last breath +47.6 s in S3, +14.4 s in S4), then room air. Measured alternatives
  (S3, induction at 3:00): mask off AT induction → the patient breathes room air for ≈ 48 s while the drugs take him,
  SpO2 < 90 % (monitor) only 4.6 min after the last breath — below research/28's 5.5–10 min for a healthy, fully
  preoxygenated adult (Edmark 2003 411 s); mask held 45 s → 7.8 min (inside it); mask held 60 s → 8.0 min; mask left on
  through the apnoea (the planner's measurement) → +14:12, apnoeic oxygenation through an open airway — the opposite of
  the teaching point. Induced at 4:00 instead of 3:00: the desaturation state +8:21 vs +8:14 from the induction.
- **D-5 — S2's bleeding stops at the pulse loss** (the PEA state re-sets the pericardium to 370 mL at 0 mL/min, the
  volume it holds then): with no cardiac output the wound stops bleeding, and without this the undrained-CPR path
  accumulated to the model's 500-mL cap and showed CVP 184 and an arterial line of 152/114 in asystole (measured). The
  propofol branch (a different, earlier volume) keeps the accumulation; its run sheet says "drain within 2 min".
- **D-6 — S2 is a rewrite of `showcase-tamponade.json` (same id), not a new card.** The e2e tests load that id; the old
  "tamponade, then propofol" story survives as S2's optional "Induce for intubation: propofol 2 mg/kg" button (PEA
  89 s later).
- **D-7 — MH cooling is room-temperature saline.** `pme-scenario/1`'s event kinds (schema `eventKind`) do not include
  `thermal` or `infusion`; the engine has no active-cooling event; cold IV fluid is the only cooling a card can give
  (crystalloid enters at room temperature, `l2/thermal/environment.ts ivInflow`). Q6 asks for the schema extension.
- **D-8 — MH treatment is a hub with spokes.** "Dantrolene 2.5 mg/kg" must be repeatable, and a self-transition does
  not re-run `onEnter`; each intervention is a 2-s spoke state that returns to "MH treatment under way". The state
  history is then the debrief's checklist.
- **D-9 — the slow tests live beside the content, in a new CI group.** They take ≈ 4 min serially (20 cases, up
  to 60 sim-min each) — too long for the main job, which runs every package's fast set in one go. A `showcase` entry in
  the existing `test-slow` matrix runs them in their own step (`vitest run` without the package script's
  `--passWithNoTests`: an empty set fails — review I6); apps/demo's `vite.config.ts` gets the same `PME_TEST_SET` semantics as
  engine-core (fast = without, showcase = only, unset = all).
- **D-10 — bronchospasm leaves the Showcase group, not the library** (`category` → "Airway and breathing"): six
  Showcase cards are already more than 30 minutes at ×4.
- **D-11 — the Showcase order is the run sheet's** (`SHOWCASE_ORDER` in `scenarios.ts`): healthy induction, induction
  after premedication, anaphylaxis, MH, tamponade, haemorrhage. Every other group still sorts by title.

---

## Prototype results — the measured course of each scenario

All times are the scenario clock at ×1 (seed 7, MODELED, the app's engine options), from the prototype's tests. The
monitor columns are what the tiles show; "truth" values (SaO2, core) are what the presenter can only say.

### S1 Malignant hyperthermia (`showcase-mh`): 35 y, 80 kg; propofol 2 mg/kg + succinylcholine 1.5 mg/kg, ETT, VCV 12 × 500 PEEP 5 FiO2 0.5, sevoflurane 2 % at 2 L/min, `condition mh 1` at 0:00; rocuronium 0.6 mg/kg at 4:00

| Path | Measured |
|---|---|
| Untreated | early signs (EtCO2 > 45 for 20 s) **6:51**; established (core > 38.5 °C) **18:46**: EtCO2 81, HR 142, pH 7.09, K 5.7, lactate 4.6, MAP 98; HR max 190; K max 6.4; **pulse lost 44:21 in VF** at core 42.3 °C, K 6.4 (`arrest` state 44:42) |
| Treated early (crisis 2:00 into the early signs = 8:51) | dantrolene 9:51; recovering (EtCO2 < 45 for 60 s) **16:58**; never "established"; core max 38.0 °C; HR max 93; K max 4.8; EtCO2 47 at +5 min; HR 85 at +15 min |
| Treated late — **the run-sheet path** (crisis 1:00 into the established crisis = 19:46) | at the call EtCO2 60, core 38.7, K 5.8, pH 7.19; dantrolene 20:46; EtCO2 54 at +2 min; core peaks **39.5 °C at 31:10**; K max 5.9; lactate max 7.4; recovering **30:48**; ventilation back to 12 × 500 at 38:56; at 60:00 HR 91, MAP 112, core 38.7, EtCO2 38, pH 7.38, K 3.8; systolic max after the call 158 |

Explore, "Changed only" on, at 19:40 (baseline 1:00), the rows the run sheet points at — all asserted:
**At the bedside** HR ↑, ART M ↑, EtCO2 ↑, T1 ↑, awRR ↑ · **Heart and circulation** CO ↑, SV ↓, SVR ↑, LVEF ↓,
Myocardial O2 supply/demand ↓ · **Blood, acid–base and temperature** pH ↓, PCO2 ↑, BE ↓, Lactate ↑, K⁺ ↑, Tcore ↑, VO2 ↑,
SvO2 ↓ · **Endocrine** MH activity ↑, Epinephrine ↑, Norepinephrine ↑ · **Brain** CMRO2 ↑. (≈ 150 rows change in all;
"Changed only" is therefore a section-by-section tool, not a summary — the run sheet says which section to open.)

### S2 Stab wound: tamponade, PEA and pericardiocentesis (`showcase-tamponade`): 30 y, 80 kg, spontaneous FiO2 0.5, ABP + CVP; `tamponade` 250 mL + 15 mL/min from 0:00

| Path | Measured |
|---|---|
| Arrival | at 1:00 HR 99, ART 106/87, CVP 17, EtCO2 32, SpO2 98; **pulsus paradoxus: SBP swing 0.85 mmHg per breath (max 1.6)** |
| Deterioration | systolic < 80 at **6:13** (HR 135, CVP 20); PEA at **7:51** (organised rhythm, `pea` state 7:52) |
| Happy path: CPR 10 s after the PEA, drainage 2:00 into CPR (10:02) | **ROSC 96 s after the drainage** (11:38); 60 s later 118/?, HR 63, CVP 10, EtCO2 35; systolic overshoot ≤ 155 in the first 30 s; the pulse holds |
| Drainage + epinephrine 1 mg 5 s later | ROSC 94 s after the drainage |
| Undrained: CPR 10 min, epinephrine × 2 | **no pulse**; CVP ≤ 32; EtCO2 9 at +3 min |
| Drained 60 s into the deterioration (systolic 60) | **no PEA**; 60 s later systolic 122, HR 69, CVP 7 (systolic overshoot ≤ 155 for seconds) |
| Same happy path, driver polled every 0.8 s (×8) | same six states in the same order; PEA 7:51; ROSC 95 s after the drainage |

### S3 Healthy induction (`showcase-induction`): 40 y, 75 kg; preoxygenation FiO2 1.0 from 0:00, held until "Induce now" and for 45 s after it (D-4); propofol 2 mg/kg + rocuronium 0.6 mg/kg on "Induce now" at 3:00

| Path | Measured (R50 re-measure; times from the induction) |
|---|---|
| Prompt: intubate at +1:30 | before induction MAP 95, HR 71; last breath +48 s, apnoea alarm **+56 s**; MAP nadir **65 at +1:45**; HR 70–79; capnogram ≥ 25 within **6 s** of intubation; EtCO2 37 at +2 min; SpO2 never below 99; MAP 72 at +4 min |
| Airway not secured, nothing done | SpO2 < 90 **+8:14** (the state; the monitor's tile +8:36, alarm `**SpO2 86<90` +8:46 — 7.8 min after the last breath); SpO2 < 60 **+9:26** with HR 44 (chemoreflex); SpO2 0 from **+12:04** with MAP 77; **first diaphragmatic efforts +15:23 (36 mL, then ≈ 44/min of 34–41 mL; EtCO2 0, awRR 0 on the monitor)**; **pulse lost +20:00 (asystole)** = 10:34 after SaO2 < 60 % (research/26 T5: 9 min, band 5–12) |
| Same, induced a minute late (4:00) | SpO2 < 90 state +8:21, SpO2 < 60 +9:34 from the induction — inside the 3:00 bands (the hold works) |
| Bag-mask 10 s into the bradycardia, tube 60 s later | no arrest; SpO2 ≥ 90 in 32 s; HR ≥ 60 in 4 s; at +5 min MAP 83, EtCO2 48 |
| Tube at +18:00 (SpO2 0 since +12) | no arrest; MAP 45 at the tube, 99 max in 5 min; SpO2 ≥ 90 in 46 s; patient-triggered breaths (awRR ≥ 16) from **+19:00** |
| CPR 10 s after the asystole, epinephrine at +2 and +6 min | **no pulse in 10 min** (asystole stays, FU-4 Q3); SpO2 99, EtCO2 34, MAP 50 during CPR |
| (as written, before R50: mask off at the automatic 3:00 induction) | SpO2 < 90 +5:08; first efforts +15:47 only 21 s before the asystole (+16:08) — superseded |

### S4 Induction after fentanyl and midazolam (`showcase-induction-premed`): the S3 patient and the same held preoxygenation; premedication at 0:10 (automatic), "Induce now" at 3:00, tube at +1:30 (R50: every number below re-measured with the hold — none moved)

| Path | Measured |
|---|---|
| No vasopressor | at 0:10 MAP 96, HR 71; before induction MAP **90**, HR 62, awRR 5, EtCO2 48 (RR alarm < 8 at 1:24); apnoea alarm **+43 s**; MAP nadir **52 at +1:56** with HR 56; HR 55–62; SpO2 never below 99; MAP 58 at +4 min |
| Ephedrine 10 mg 20 s after MAP < 60 (+1:55) | MAP 52 → 59 (+60 s) → 67 (+120 s); ≥ 65 at +96 s; HR 56 → 59 |
| Phenylephrine 100 µg at the same moment | MAP 73 at +60 s; HR 53 (min 52) |
| **S3 vs S4** | MAP 95 → 65 vs 90 → 52 (fall 30 vs 38 from each own start; 43 from S3's start); apnoea alarm +56 vs +43 s; HR 70–79 vs 55–62 |

### S5 the kept cards, against their old run sheet (`research/18-showcase-docs/presenter/VERIFIED.md`, build 41678d0b)

| Number | Old run sheet | Now | |
|---|---|---|---|
| Haemorrhage HR / systolic at 2, 4, 6, 8 min | 81/114, 96/108, 118/99, 140/77 (66) | 81/114, 96/108, **121**/99, **142**/75 (66) | HR +3 and +2 at 6 and 8 min (no band was stated) |
| Haemorrhage pulse lost | 10:03–10:08 | **10:29** | **outside** (+21–26 s) |
| Haemorrhage ROSC, from pressing CPR | systolic > 90 after 254.5–257.5 s; story "about four and a half minutes" | **176 s (178 s to systolic > 90)** | **outside** (−77 s: FU-7.1 B4's arrest bookkeeping) — the card's story sentence was wrong: updated (Q3 ruling, Task 3) |
| Haemorrhage 1 min after "Pulse back" | 131.6–143.3 / 87.5–91.9, HR 76–77, EtCO2 34–36 | 135/91, **HR 75**, EtCO2 35 | HR 1 below |
| Anaphylaxis 2 min into the reaction | HR 135–137, 97/70–71 (78) | **HR 139**, 96/?, MAP 78 | HR **outside** by 2 |
| Anaphylaxis systolic > 110 after epinephrine | 9.5–11.4 s | 11 s | in |
| Anaphylaxis HR peak | 170–175 | **178** | **outside** by 3 |
| Anaphylaxis 2 min after epinephrine | 120–122 / 88–89 (98–99), HR 110–114 | **118**/?, MAP **97**, HR 110 | systolic 2 below, MAP 1 below |
| Anaphylaxis untreated pulse lost | ≈ 5:20 (hotfix build only) | 5:15 | in |

### What could not be made to work on this physiology (and why)

1. **MH's untreated arrest is not hyperkalaemic.** K plateaus at 6.4 (the engine's hyperkalaemic hazard starts at
   `K_HAZARD` 8.5, `l2/circ/arrest.ts`); the arrest is VF from hyperthermia above `T_HOT` 42 °C (FU-4 G8). The card
   says "VF at 42 °C". Q7.
2. **MH cooling** can only be room-temperature saline (D-7); 2 L over 15 min removes ≈ 0.6 °C. Q6.
3. **S2's pulsus paradoxus is invisible** (0.85 mmHg mean per breath; the engine has no septal interdependence —
   research/24 §P3, `circ-pulsus.test.ts` `it.fails`, dropped by FU-7.1). What the monitor shows instead: a rising HR
   (99 → 135), a narrowing pulse pressure (19 → 11 mmHg), a CVP rising 17 → 20, an EtCO2 falling 32 → 23 with a normal
   SpO2, then a PEA with a sinus rhythm on the ECG and a flat arterial line.
4. ~~S3's first ineffective effort lasts 21 s before the asystole~~ — **resolved by R50's D-4** (the mask held until the
   breathing stops): first efforts +15:23, asystole +20:00 — 4.6 min of visible-but-useless efforts (no capnogram, no
   awRR) between them. The brief's "≈ 14 min" is FU-7.1 A4's ≈ 15–16 min (research/27: Moerer 2005 15.9 min).
5. **S3's CPR branch cannot succeed**: the onset draw on the app's seed gives asystole, and asystole never regains a
   pulse (FU-4 Q3, `arrest.ts` "Asystole stays"). Q4 ruling: KEPT; the story says "asystole after prolonged hypoxia is
   rarely recoverable; ventilate before this point", and the rescue branch up to +18 min is the teaching point.
6. **S4's ephedrine is weak** (10 mg: MAP +7 in 60 s; phenylephrine 100 µg: +21) — so the objective does not ask the
   learner to prefer ephedrine at HR < 60. Q10.
7. **After MH is treated the patient is hypertensive** (145–156/96–105, MAP 112–120, for > 30 min at HR 85–97): most
   likely B1 working as built — the acidaemic blunting of the surge's vasoconstriction ends when pH normalises, while MH
   activity decays with τ 600 s. Q8 ruling: calibration-queue entry + a known-miss note in the gate; not fixed here.

---

## Bands (R45)

Each band = the prototype value ± the tolerance below (written into each test's `BANDS` table; never widened):
times in seconds ± max(10 %, 15 s), floored at 0; times in minutes ± max(10 %, 0.25 min); MAP / systolic / diastolic ±
5 mmHg; HR ± 5/min; SpO2 ± 2 %; EtCO2 ± 3 mmHg; awRR ± 2/min; CVP ± 2 mmHg; core temperature ± 0.2 °C; pH ± 0.03; K
± 0.3 mmol/L; lactate ± 0.5 mmol/L; spontaneous breath volume ± 5 mL; count of efforts ± 5 (floor 1); pulsus
[0, measured + 1]; a label's lag behind the event it names ± 15 s; flags, refusals and state facts exact. (R50: S3's
bands are re-cut from the re-measured prototype by these rules — a new card behaviour (Q5), not a widening; S3's
"induced late" case reuses the 3:00 case's bands on purpose.)

---

## Run sheets (the kit documents' tables: `research/18-showcase-docs` is rebuilt from these by the kit job)

Clock = the scenario clock at ×1; the real time at ×4 is clock ÷ 4, at ×8 clock ÷ 8. Alarm texts are the ENGINE's
(`**SpO2 86<90`); the default (Saadat) skin prints its own words for the same alarm — the gate records them in the browser.

### 1 · Healthy induction (S3) — 8:00 prompt path; 15:00 with the unsecured branch and a rescue (R50 re-measure)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR 70, ART 123/81 (95), SpO2 99, EtCO2 38, RR 14 | "Fit 40-year-old, preoxygenating: the oxygen stays on until I induce — three minutes fill his lungs with oxygen." |
| 3:00 | press **Induce now** (state "Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg — airway not yet secured") | "Watch the pressure, then the capnogram." (Never before 3:00: a shorter preoxygenation is a shorter safe apnoea.) |
| 3:20 → 3:48 | ART 110/72 → 101/66; HR 71 → 77; last breath 3:48, `**etCO2 0<30` 3:52, **APNEA** 3:56; the mask comes off at 3:45 | "Propofol: vasodilation, no bradycardia." |
| 4:30 | MAP 74 | **Prompt path:** press **Intubate and ventilate** → capnogram back within 6 s, EtCO2 46 → 37 by 6:30; MAP nadir 65 at 4:45 (positive pressure); MAP 72 at 7:00. End at 8:00. |
| — | **Unsecured branch:** do not press anything | "What happens if nobody secures the airway?" |
| 11:14 | state "Airway not secured: SpO₂ below 90 %" (the engine's SpO2; the tile reads 94 and falls: `**SpO2 86<90` 11:46); HR 84, ART 109/75 | "Almost eight minutes of apnoea after three minutes of oxygen — then the curve falls off a cliff." |
| 12:26 | state "SpO₂ below 60 %: hypoxic bradycardia"; HR 109 → **44** by 12:36 (`**HR 44<50`); ART 96/56 | "Chemoreflex bradycardia, and the pressure holds — the heart is not yet hypoxic." |
| 12:36 | press **Bag-mask ventilate, FiO₂ 1.0** | EtCO2 67 at once (the CO2 he has made), HR 93 by 12:50, SpO2 ≥ 90 at 13:08 |
| 13:36 | press **Intubate and ventilate, FiO₂ 1.0** | 15:00: HR 84, ART 104/73, SpO2 99, EtCO2 52. End. |
| (left alone) 15:04 → 21:00 | SpO2 0 from 15:04; HR 44–58; ART 103/63 → 51/41 | "The myocardium fails minutes after the saturation does." **Intubate and ventilate, FiO₂ 1.0** still rescues him at 21:00 (measured: MAP 45 → 99, SpO2 ≥ 90 in 46 s). |
| 18:23 | state "First diaphragmatic efforts: about 35 mL, too small for the capnogram"; the capnogram stays flat, awRR 0 | **Pause here.** "Rocuronium is wearing off: the diaphragm tries, 36 mL a breath, soon 40 a minute — below the dead space." |
| 22:51 → 23:04 | `SpO2 LOW PERF` 22:51, `ABP NON-PULSATILE` 22:52; asystole 23:00 (`***ASYSTOLE` 23:04); ART 28/27 | "Asphyxial arrest, ten and a half minutes after the saturation fell below 60. Asystole after prolonged hypoxia is rarely recoverable — ventilate before this point." CPR (**Start CPR, intubate, FiO₂ 1.0**) does not bring him back. |

### 2 · Induction after fentanyl and midazolam (S4) — 8:00

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR 70, ART 123/80 | "The same man as before." |
| 0:10 | (premedication given by itself: fentanyl 2 µg/kg, midazolam 0.03 mg/kg) | "Watch the respiratory rate." |
| 1:00 → 2:55 | HR 63 → 61; ART 120/75 → 117/72; awRR 9 → 5; EtCO2 41 → 48; alarm `**RR 7<8` 1:24 | "Opioid plus benzodiazepine: synergy on the drive." |
| 3:00 | press **Induce now** | "Same doses as before. Compare: there the mean went from 95 to 65." |
| 3:20 → 3:35 | ART 102/61 → 93/54; HR 60 → 59; **APNEA** 3:43 (13 s earlier than S3) | |
| 4:30 | MAP 61 | press **Intubate and ventilate** |
| 4:45 → 4:56 | ART 78/43 (MAP 52–53), HR 56–58 | press **Ephedrine 10 mg** (or **Phenylephrine 100 µg**) |
| 5:30 → 8:00 | ephedrine: MAP 55 → 60 (6:00) → 72 (8:00), HR 57 → 62 · phenylephrine: MAP 73 at 5:56, HR 53 | "Premedication took 38 off the mean, against 30 without it." End. |

### 3 · Anaphylaxis under anaesthesia (kept) — 6:00

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | ventilated, stable: HR 74, ART 119/83 | |
| 1:00 | the reaction starts by itself | |
| 3:00 (2 min in) | HR 139, ART 96/? (78) | press **Give epinephrine 100 µg** |
| 3:11 | systolic > 110 | HR peaks 178 |
| 5:00 | ART 118/? (97), HR 110 | End at 6:00. (Untreated: MAP 53 at 4:00, pulse lost 5:15.) |

### 4 · Malignant hyperthermia (S1) — 40:00 at the full course (×8 + two 5-min fast-forwards ≈ 4 min); 20:00 if treated at the early signs

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | (state "Induced: propofol, succinylcholine 1.5 mg/kg (masseter rigidity), intubated; sevoflurane 2 %"); HR 80, ART 87/59, EtCO2 35 | "Say it: the jaw was hard to open after the succinylcholine." |
| 4:00 | press **Start surgery: rocuronium 0.6 mg/kg** | |
| 6:51 | (state "Early signs: EtCO₂ rising at the same ventilation, tachycardia"); EtCO2 46, HR 85 | "Same minute ventilation, rising CO2: more CO2 is being made." **Short version:** press the crisis at 8:51 (below, "early"). |
| 9:00 → 17:00 | EtCO2 51 → 76; HR 93 → 139; core 36.9 → 38.1; pH 7.28 → 7.12; K 4.7 → 5.5; **EXTREME TACHY** 17:09 | (fast-forward 5 min twice here, Stage 10) |
| 18:46 | (state "Established MH: hyperthermia, acidosis, rising potassium"); core 38.5, EtCO2 79–81, HR 142–148, awRR 22 (he triggers the ventilator: rocuronium is wearing off) | Explore → "Changed only" (the rows listed under S1 above): Blood/acid–base, then Endocrine "MH activity". |
| 19:46 | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** | ventilation 20 × 600, FiO2 1.0 |
| 20:46 | press **Dantrolene 2.5 mg/kg** | |
| 21:16 / 21:46 / 22:16 | press **Cool: 2 L saline at room temperature**, **Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose**, **Sodium bicarbonate 1 mmol/kg** | K 5.9 at the call |
| 21:00 → 29:00 | EtCO2 54 → 45; HR 142 → 112; core 38.8 → 39.5 (still rising); K 5.8 → 5.3 | "Temperature lags: it peaks 11 minutes after dantrolene." |
| 29:46 | press **Dantrolene 2.5 mg/kg** again (EtCO2 still ≈ 45) | |
| 30:48 | (state "Recovering: EtCO₂ below 45"); core peaks 39.5 at 31:10 | |
| 38:56 | EtCO2 < 38: press **EtCO₂ normal: ventilation back to 12 × 500** (a treatment pressed after this puts the label back to "MH treatment under way" until EtCO2 < 45 for a minute again — harmless; review M2) | End at 40:00: HR 96, ART 151/100, core 39.4, EtCO2 42, K 4.5. ("He is hypertensive now" — Q8.) |
| (untreated) 44:21 | **VF** at core 42.3 °C, K 6.4 | "Untreated MH kills by hyperthermia here." |
| (early) 8:51 | crisis at 8:51, dantrolene 9:51, then cooling, K, bicarbonate | recovering 16:58; core never above 38.0; HR ≤ 93. End at 20:00. |

### 5 · Stab wound: tamponade, PEA and pericardiocentesis (S2) — 15:00

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 → 1:00 | HR 91 → 99, ART 101/81 → 106/87 (pulse pressure 19), CVP 17 (`**CVP 14>10`), SpO2 98, EtCO2 32 | "Narrow pulse pressure, high CVP. No pulsus on this monitor — look for the triad." |
| 3:00 → 6:00 | HR 113 → 136, ART 100/84 → 81/69, CVP 17 → 19, EtCO2 29 → 24; SpO2 LOW PERF 6:06 | **Optional:** "Induce for intubation: propofol 2 mg/kg" → PEA 89 s later (the old card's lesson). **Optional:** **Pericardiocentesis** now → 60 s later 122/?, HR 69, CVP 7, no arrest. |
| 6:13 | (state "Deteriorating: systolic below 80"); HR 135–148, CVP 20 | |
| 7:51 | PEA: sinus on the ECG, ART flat ≈ 20, HR 42 | (state "PEA: organised rhythm, no pulse; …370 mL") |
| 8:02 | press **Start CPR, intubate, FiO₂ 1.0** | CPR: ART 41/20, CVP 25, EtCO2 8–9 |
| 10:02 | (2-min pulse check: still PEA) press **Pericardiocentesis during CPR** | ART 69/32 at once, EtCO2 14 → 19 |
| 11:38 | pulse back (ART 82/43 under CPR, sinus) | press **Pulse back: stop CPR** (≈ 11:48) |
| 12:00 → 12:48 | ART 113/79 → 119/79, HR 68 → 64, CVP 10, EtCO2 25 → 38 | press **Crystalloid 500 mL**; **Aspirate the catheter again** is there if the CVP climbs (4 mL/min re-accumulates). End at 15:00: 119/76, HR 62, CVP 10, EtCO2 39. |
| (no drainage) | 10 min of CPR with epinephrine × 2: no pulse, EtCO2 ≈ 9 | "You cannot pump a heart that cannot fill." |

### 6 · Class IV haemorrhage, PEA and resuscitation (kept) — 15:00

| Clock | Monitor | Presenter |
|---|---|---|
| 2:00 / 4:00 / 6:00 / 8:00 | HR 81 / 96 / 121 / 142; systolic 114 / 108 / 99 / 75 (MAP 66 at 8:00); SpO2 LOW PERF ≈ 8:25 | |
| 10:29 | pulse lost (PEA) | press **Start CPR, 2 L and epinephrine** 15 s later (10:44) |
| 13:40 | pulse back (176 s into CPR) | press **Pulse back: stop CPR** (≈ 13:50) |
| 14:50 | 135/91, HR 75, EtCO2 35 | End at 15:00. (The card's story now says "at about 10½ minutes" and "about three minutes into CPR" — Q3.) |

## Order and durations

Showcase order (Task 6, `SHOWCASE_ORDER`): **1 Healthy induction · 2 Induction after fentanyl and midazolam ·
3 Anaphylaxis under anaesthesia · 4 Malignant hyperthermia · 5 Stab wound: tamponade, PEA and pericardiocentesis ·
6 Class IV haemorrhage, PEA and resuscitation.** (Anaphylaxis sits between the inductions and MH as the short crisis;
the two CPR cases close, the tamponade ROSC first.)

| Card | Scenario clock (×1) | ×4 | ×8 | Notes |
|---|---|---|---|---|
| 1 Healthy induction | 8:00 (15:00 with the unsecured branch + rescue; 23:00 to the arrest) | 2:00 (3:45; 5:45) | 1:00 (1:53; 2:53) | R50: the held preoxygenation moved the branch ≈ 3 min later |
| 2 Induction after premedication | 8:00 | 2:00 | 1:00 | |
| 3 Anaphylaxis | 6:00 | 1:30 | 0:45 | |
| 4 MH | 40:00 full; 20:00 early | 10:00; 5:00 | 5:00; 2:30 | full course with two 5-min fast-forwards at ×8 ≈ 4:05 (Stage 10) |
| 5 Tamponade | 15:00 | 3:45 | 1:53 | |
| 6 Haemorrhage | 15:00 | 3:45 | 1:53 | |
| **All six** (S3 with branch, MH full) | 99:00 | 24:45 | 12:23 | the 30-min slot needs ×8 / fast-forward for MH, or MH early |

**The 30-minute programme (Q11 ruling).**

| | With Stage 10 merged (×8, 5-min fast-forward) | Without Stage 10 (×4 is the top speed, no fast-forward) |
|---|---|---|
| 1 Healthy induction | ×4, with the unsecured branch and the bag-mask rescue: 3:45 | the same: 3:45 |
| 2 Induction after premedication | ×4: 2:00 | ×4: 2:00 |
| 3 Anaphylaxis | ×4: 1:30 | ×4: 1:30 |
| 4 Malignant hyperthermia | full course (crisis 1 min into the established MH) at ×8 with two 5-min fast-forwards: ≈ 4:05 | the EARLY path (crisis 2 min into the early signs; end 20:00) at ×4: 5:00 |
| 5 Tamponade | ×4: 3:45 | ×4: 3:45 |
| 6 Haemorrhage | ×8: 1:53 | **CUT** (stays in the library; the tamponade card already shows CPR, a reversible cause and ROSC) |
| Running / talking | ≈ 17 min / ≈ 13 min | ≈ 16 min / ≈ 14 min (if still short: card 1's prompt path only, 2:00) |

---

## Parts, files and merge order

One executor, one branch `stage-11-scenarios` from `origin/main` once `fu-7.1-b` and `fu-11-b` have merged.

| Task | Creates | Modifies |
|---|---|---|
| T1 harness, test-set split, S3 | `showcase/harness.ts`, `showcase/s3-induction.slow.test.ts` | `showcase/showcase-induction.json` (rewritten), `apps/demo/vite.config.ts`, `.github/workflows/ci.yml` |
| T2 S2 | `showcase/s2-tamponade.slow.test.ts` | `showcase/showcase-tamponade.json` (rewritten) |
| T3 S5 | `showcase/s5-kept.slow.test.ts` | `showcase/showcase-haemorrhage.json` (story and notes: two numbers, Q3) |
| T4 S4 (+ bronchospasm leaves) | `showcase/s4-premed.slow.test.ts`, `showcase/showcase-induction-premed.json` | `showcase/showcase-bronchospasm.json` (`category`), `apps/demo/src/app/showcase.test.ts` (the id line) |
| T5 S1 | `showcase/s1-mh.slow.test.ts`, `showcase/showcase-mh.json` | `apps/demo/src/app/showcase.test.ts` (the id line again) |
| T6 order | `showcase/showcase-cards.test.ts` | `apps/demo/src/app/scenarios.ts` |
| T7 kit scripts (Q12, R50 C1) | — | `scripts/showcase/rehearsal.showcase.ts` (rewritten: six cards + the run-sheet tables), `scripts/showcase/sound.showcase.ts` (the tamponade card's new title and button), `scripts/showcase/make-videos.mjs` (six videos) |

(`showcase/` = `apps/demo/src/app/showcase/`.) Merge after FU-7.1 b and FU-11 b (their physiology and their timeline are
what the bands were measured on; FU-7.1 b's gate runs the OLD kit scripts before this stage exists on main). If
`fu-11-d` or Stage 10 merges first: no shared file; re-run the gate's slow set. If Stage 10 executes AFTER this stage:
its G4 ("the five-case rehearsal") runs this stage's six-card script — its numbers are this plan's
`docs/gates/stage-11/run-sheet-numbers.md`.

## Owner questions — closed by the orchestrator's rulings (2026-10-11), and three new ones

| Q | Question (as the planner asked it) | Ruling | Where it is applied |
|---|---|---|---|
| Q1 | Six Showcase cards (S1–S4 + both kept), not five | ACCEPTED | Task 6 `SHOWCASE_ORDER` |
| Q2 | Bronchospasm leaves the Showcase group for "Airway and breathing" (stays in the library) | ACCEPTED | Task 4 |
| Q3 | The haemorrhage story says the pulse returns "about four and a half minutes into CPR"; it now returns at ≈ 3 min | UPDATE the prose (the "do not change" rule was about physiology) | Task 3 Step 1: story and notes; the gate note records old → new for the kit's run sheet: pulse lost ≈ 10:03–10:08 → **10:29**; ROSC ≈ 4.5 min (254.5–257.5 s to systolic > 90) → **≈ 3 min (176 s; 178 s to systolic > 90)** |
| Q4 | S3's arrest is asystole, which never regains a pulse (FU-4 Q3) | KEEP; the story says so plainly | S3 story: "asystole after prolonged hypoxia is rarely recoverable; ventilate before this point"; the rescue branch to +18 min is the teaching point |
| Q5 | S3/S4 induce by themselves at 3:00 | REJECTED: keep the manual "Induce now"; hold FiO2 1.0 until the instructor induces | D-4; S3/S4 re-measured (S3's branch ≈ 3 min later, S4 unchanged) |
| Q6 | MH active cooling and a dantrolene infusion need `thermal` and `infusion` in `pme-scenario/1` | NOT this stage | Follow-up F-1 below; the showcase treatment set is room-temperature saline + stop the volatile + hyperventilate + dantrolene |
| Q7 | Untreated MH ends in VF from hyperthermia (K plateaus at 6.4; hazard 8.5) | ACCEPTED for the showcase | Owner question for the calibration pass, C-2 below |
| Q8 | After MH is treated: MAP 112–120 for > 30 min | Calibration queue + a known-miss note in the gate; not fixed | C-1 below; Gate Step 5 |
| Q9 | No rocuronium top-up in MH | ACCEPTED | — |
| Q10 | Both vasopressor buttons in S4 | ACCEPTED | — |
| Q11 | The 30-minute programme and the order | ACCEPTED (order); the programme with and without Stage 10 | "Order and durations" |
| Q12 | The kit's rehearsal loads two cards this stage removes | THIS STAGE updates `scripts/showcase/rehearsal.showcase.ts` (declared); R50 adds `sound.showcase.ts` and `make-videos.mjs` (C1) | Task 7; Gate Step 4 writes `docs/gates/stage-11/run-sheet-numbers.md` |

New (R50; none gates a task):

- **Q13** S2 offers no fluid at arrival. Not added: research/26 §4.3 (Sagristà-Sauleda 2008, n = 49) — volume helps only
  the hypovolaemic tamponade and raises pericardial pressure in everyone; and the arrival state carries the
  pericardium's `onEnter` (a fluid spoke back to it would re-set the volume). Add a "Crystalloid 500 mL" spoke (a new
  hub state, re-measured) if the owner wants the debate on screen.
- **Q14** D-4's 45-s mask: the orchestrator's ruling said "hold FiO2 1.0 until the instructor induces"; the reviewer
  holds it 45 s longer (until the breathing has stopped) because mask-off-at-induction left only 4.6 min of apnoea to
  SpO2 < 90 % (research/28: 5.5–10 min) and the first efforts 21 s before the asystole. One field to undo
  (`induced` state, first `onEnter`: `fio2 0.21, durationS 1`), with S3 re-measured.
- **Q15** In S3 the first efforts run at ≈ 44/min of 34–41 mL for 4.6 min before the arrest (FU-7.1 A4's first-effort
  size is the owner's hypothesis [ENG], research/27); confirm the presenter line "the diaphragm tries, below the dead
  space".

## Follow-ups and the calibration queue (from the rulings)

- **F-1 (Q6) — `pme-scenario/1` gains `thermal` and `infusion` event kinds** (controller schema `eventKind`, the runner's
  dispatch, the app's authoring list): MH active cooling (cold IV fluid at 4 °C, surface cooling) and a dantrolene
  infusion become card buttons. A later stage; this stage's MH set is room-temperature saline, stop the volatile,
  hyperventilate, dantrolene, the potassium and bicarbonate.
- **C-1 (Q8) — post-MH hypertension**: after the treated MH (run-sheet path) MAP 112–120 at HR 85–97 for > 30 min
  (145–156/96–105). Most likely FU-7.1 B1's acidaemic blunting ending when pH normalises while MH activity decays with
  τ 600 s. Known miss, written in the gate note; for the owner's calibration pass.
- **C-2 (Q7) — does potassium keep rising in untreated MH?** The engine's K plateaus at 6.4 mmol/L (the hyperkalaemic
  hazard starts at `K_HAZARD` 8.5, `l2/circ/arrest.ts`), so the untreated arrest is VF from hyperthermia (42.3 °C at
  44:21). The repo's MH sources: research/14 ET-10e — "tables §7 check 21: K 5.5–6.5 by 20 min" (the engine: 5.75 at
  20 min, PL) and Larach 1994's clinical grading scale (K⁺ > 6 mmol/L scores as MH hyperkalaemia); neither states the
  ceiling of K in a fulminant untreated crisis, and no MHAUS case series with K beyond 20 min is in the repo. The owner
  decides whether K should rise further in life (and the arrest become hyperkalaemic) at the calibration pass.
- **C-3 (R50 I5, informational)** — the as-written plan's safe apnoea (4.6 min to SpO2 < 90 % after full
  preoxygenation) was a card artefact (mask off before the apnoea), fixed by D-4; no engine item.

## Objectives and Stage 13 (the rule evaluator)

Stage 13's plan (`docs/plans/stage-13-debrief.md`, PROTOTYPED 2026-10-11, written in parallel with this review) defines
the schema: an objective is a string or `{ "text", "rule" }`; kinds `eventWithin` (`after`, `event`, `withinS`),
`occurred`, `never`, `stayed`; events `start`, `state:<id>`, `alarm:<id>` (`alarm:apnoea`), `drug:<id>`, `fluid`, `cpr`,
`shock`, `condition:<id>`, `airway:<state>`, `ventilation`, `pulseLoss`, `rosc`, `value:<trend><op><n>`. Stage 13 executes
AFTER this stage, so this stage keeps its objectives as strings (a `{ text, rule }` objective fails
`pme-scenario/1` validation until Stage 13's schema change lands) — every new objective is written as "<action> within
<N> s of <event>" so that each maps to one rule. **For Stage 13:** its Appendix B was cut against this plan's
PRE-R50 objective texts; four of its finds (`showcase-induction`, `-induction-premed`, `-mh`, `-tamponade` objectives)
no longer occur — its Task 0 Step 3 `--variant b` names them; use the rules below (same meaning, the new texts). The
haemorrhage card's objectives are untouched here (this stage edits only its story and notes, Q3), so Stage 13's
haemorrhage blocks still apply.

| Card | Objective (text as in the card) | Rule (Stage 13 syntax) |
|---|---|---|
| S3 | Induce after at least 180 s of preoxygenation | none fits ("not before" is not a kind) — rule-less, or a `minS` field later |
| S3 | Intubate and ventilate within 90 s of the CO₂ apnoea alarm … | `eventWithin` after `alarm:apnoea` → `ventilation`, 90 (contract 2) |
| S3 | Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubation | `eventWithin` after `["state:ventilated", "state:rescuedEtt"]` → `value:etco2>25`, 30 |
| S3 | Airway not secured: ventilate … within 60 s of SpO₂ falling below 90 % … | `eventWithin` after `state:desaturating` → `ventilation`, 60 |
| S3 | Ventilate within 300 s of SpO₂ falling below 60 % … | `eventWithin` after `state:bradycardic` → `ventilation`, 300 |
| S4 | Acknowledge the respiratory-rate alarm … within 30 s | rule-less (no acknowledge event in the schema) |
| S4 | Intubate and ventilate within 60 s of the CO₂ apnoea alarm … | `eventWithin` after `alarm:apnoea` → `ventilation`, 60 |
| S4 | Give a vasopressor … within 60 s of the mean arterial pressure falling below 60 mmHg | `eventWithin` after `value:map<60` → `["drug:phenylephrine", "drug:ephedrine"]`, 60 |
| S4 | Mean arterial pressure back above 65 mmHg within 120 s of the vasopressor | `eventWithin` after `["drug:phenylephrine", "drug:ephedrine"]` → `value:map>65`, 120 |
| S1 | Call the MH crisis … within 120 s of the early signs … | `eventWithin` after `state:earlySigns` → `state:triggerOff`, 120 |
| S1 | Give dantrolene 2.5 mg/kg within 300 s of calling the crisis | `eventWithin` after `state:triggerOff` → `drug:dantrolene`, 300 |
| S1 | Repeat dantrolene … within 600 s of the first dose while EtCO₂ is still above 45 mmHg | rule-less (a second occurrence under a condition is not a kind) |
| S1 | Treat the potassium … within 300 s of K⁺ rising above 5.5 mmol/L | rule-less (K is not a trend; Stage 13's Q7) |
| S1 | ~~Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHg~~ → **E22 (owner ruling 2026-10-17):** Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500) | ~~`eventWithin` after `value:etco2<40` → `state:normoventilated`, 300~~ → `heldThen` from `state:triggerOff`, `etco2` below 40 for 120 s → `state:normoventilated` (an earlier press is not met; Stage 13 plan, rule table) |
| S2 | Name the tamponade within 180 s of arrival … (instructor-assessed) | rule-less |
| S2 | Start CPR within 10 s of the pulse loss | `eventWithin` after `pulseLoss` → `cpr`, 10 |
| S2 | Pericardiocentesis within 120 s of starting CPR | `eventWithin` after `cpr` → `state:cprDrained`, 120 |
| S2 | Stop CPR ("Pulse back") within 30 s of the pulse returning … | `eventWithin` after `rosc` → `state:rosc`, 30 |
| S2 | Better: pericardiocentesis before the pulse loss … — then no PEA follows | `never` `pulseLoss` |

---

## Tasks

Run every test command from `apps/demo` with `npx -y pnpm@9.15.9 exec vitest run <file>`; a showcase slow file alone
needs no `PME_TEST_SET`. `PME_SHOWCASE_PRINT=1` prints every measured number (for the gate note).

### Task 0: branch, install, the base check and the block check

- [ ] **Step 1.** `git -C repo fetch origin && git -C repo worktree add ../scratch/wt-stage-11 -b stage-11-scenarios origin/main`
  then `cd ../scratch/wt-stage-11 && npx -y pnpm@9.15.9 install --frozen-lockfile`.
- [ ] **Step 2 — the physiology this plan was measured on is on main.** All of these must exist:
  `ls packages/engine-core/test/engine/fu71-tamponade-rosc.test.ts packages/engine-core/test/engine/fu71-mh-haemodynamics.test.ts packages/engine-core/src/snapshot-codec.ts packages/engine-core/test/engine/fu71-roc-two-events.test.ts`.
  Any missing → STOP (FU-7.1 b or FU-11 b has not merged; the bands would not hold).
- [ ] **Step 3 — the blocks.** `python3 ../plans-backup/stage-11-plan-tools/blocks.py check docs/plans/stage-11-scenarios.md HEAD ../plans-backup/stage-11-proto-files .`
  Expected `… problems: 0` (the prototype's 20 files are kept in `scratch/plans-backup/stage-11-proto-files/`).
  A find that no longer occurs once means a file moved on main: re-cut that block from the prototype file and say so in
  the gate note.

### Task 1: the harness, the test-set split, and S3 the healthy induction with its unsecured branch

**Files** Create `apps/demo/src/app/showcase/harness.ts`, `apps/demo/src/app/showcase/s3-induction.slow.test.ts`;
replace `apps/demo/src/app/showcase/showcase-induction.json`; modify `apps/demo/vite.config.ts`, `.github/workflows/ci.yml`.

**Interfaces (produced):** `runCard(id, acts, untilS, listen?, pollS = 0.1): Promise<Run>`; `Act = { press: string; t?;
when?: (s: Sample) => boolean; delayS? }` (presses the button with that LABEL in the current state);
`Run = { rows: Sample[]; alarms; states: [t, id][]; pressed: number[]; refused: string[]; spont: [t, vtMl][] }`;
`first`, `near`, `range`, `entered`, `alarmAt`, `bands(card, got, want)`; `showcaseDoc(id)`, `SHOWCASE_IDS`.
`PME_TEST_SET=showcase` runs exactly `src/app/showcase/*.slow.test.ts`; `=fast` excludes them.

- [ ] **Step 1 — the failing test.** Create the harness and the S3 test:

Create `apps/demo/src/app/showcase/harness.ts`:

```ts
// Stage 11: runs a showcase card on a bare engine the way the app does (engine seed 7, the document's mode, truth at
// 1 Hz, the patient's sensors; apps/demo/src/app/session.ts loadScenario) and presses the card's OWN buttons on a script,
// so a test reads what the presenter will see. The driver is polled every `pollS` of sim time: the app polls every 100 ms
// of WALL time, i.e. every 0.1 s of sim at ×1, 0.4 s at ×4 and 0.8 s at ×8. Every loop yields once per sim-minute (CI
// amendment 4). Test-only: nothing in the app imports this file.
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import { expect } from 'vitest';

/** One sample per second of sim time: the monitor's numerics (null = not shown or invalid), the 1 Hz arterial panel
 *  and the truth the presenter cannot see (pulse, SaO2, core temperature). */
export interface Sample {
  t: number;
  state: string;
  hr: number | null; spo2: number | null; etco2: number | null; awrr: number | null;
  sys: number | null; dia: number | null; map: number | null; cvp: number | null; temp: number | null;
  rhythm: string; pulse: boolean; cpr: boolean;
  sao2: number; tc: number; ph: number; paco2: number; k: number; lactate: number; be: number;
}

/** Press the button labelled `press` in the current state at sim time `t`, or `delayS` after `when` first holds (and not
 *  before `t`, if given). An act fires once; one that never finds its button stays NaN in `Run.pressed`. */
export interface Act { press: string; t?: number; when?: (s: Sample) => boolean; delayS?: number }

export interface Run {
  rows: Sample[];
  /** Engine alarms raised, with their text (the skins print their own words for the same alarm). */
  alarms: { t: number; text: string }[];
  /** [t, state id] on every entry, in order (the initial state at 0). */
  states: [number, string][];
  /** Sim time each act fired, in the order of `acts` (NaN: never). */
  pressed: number[];
  /** Commands the engine refused (must stay empty: every button acts). */
  refused: string[];
  /** Spontaneous breaths (`breath` events of kind `spont`): [t, vtMl]. */
  spont: [number, number][];
}

const DOCS = import.meta.glob<{ default: ScenarioDoc }>('./*.json', { eager: true });
export const showcaseDoc = (id: string): ScenarioDoc => {
  const m = DOCS[`./${id}.json`];
  if (!m) throw new Error(`no showcase document ${id}`);
  return m.default;
};
export const SHOWCASE_IDS: readonly string[] = Object.keys(DOCS).map((p) => p.slice(2, -5));

type Tree = Record<string, unknown>;
const at = (tree: Tree | null, path: string): unknown => {
  let o: unknown = tree;
  for (const k of path.split('.')) o = o && typeof o === 'object' ? (o as Tree)[k] : undefined;
  return o;
};
const num = (x: unknown): number => (typeof x === 'number' ? x : Number.NaN);

/** Run card `id` to `untilS` of sim time, pressing `acts`; `listen` sees every engine event; the driver is polled every
 *  `pollS` of sim time (0.1 = the app at ×1; 0.8 = the app at ×8). */
export async function runCard(id: string, acts: readonly Act[], untilS: number, listen?: (e: EngineEvent) => void, pollS = 0.1): Promise<Run> {
  const v = validateScenario(showcaseDoc(id));
  if (!v.ok) throw new Error(`${id}: ${v.errors.join('; ')}`);
  const doc = v.doc;
  const eo = engineOptionsOf(doc, 7);
  const engine = createEngine({ ...eo, mode: doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
  const mon: Record<string, number | null> = {};
  let labs: Record<string, number> = {};
  let tree: Tree | null = null;
  let rhythm = doc.patient?.rhythm?.id ?? 'sinus';
  const run: Run = { rows: [], alarms: [], states: [], pressed: acts.map(() => Number.NaN), refused: [], spont: [] };
  engine.on((e) => {
    if (e.type === 'measurement') for (const [k, m] of Object.entries(e.values)) mon[k] = m && m.flag !== 'invalid' ? m.value : null;
    else if (e.type === 'labs') labs = e.values as unknown as Record<string, number>;
    else if (e.type === 'truth') tree = e.tree as Tree;
    else if (e.type === 'state' && e.rhythm) rhythm = e.rhythm.id;
    else if (e.type === 'alarm' && e.state === 'raised') run.alarms.push({ t: e.t, text: e.text });
    else if (e.type === 'breath' && e.kind === 'spont') run.spont.push([e.t, e.vtMl]);
    listen?.(e);
  });
  const driver = new ScenarioDriver({
    target: {
      dispatch: (c) => {
        const r = engine.dispatch(c);
        if (!r.accepted) run.refused.push(`${engine.now().simT.toFixed(1)} ${JSON.stringify(c).slice(0, 160)}: ${r.reason ?? ''}`);
        return r;
      },
      snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (fn) => engine.on(fn), now: () => engine.now(), time: () => {},
    },
    publish: (e) => run.states.push([e.t, e.stateId]),
  });
  const ok = driver.load(doc);
  if (!ok.ok) throw new Error(ok.reason);
  const armed = new Map<number, number>();
  const sample = (t: number): Sample => ({
    t, state: driver.runner?.stateId ?? '',
    hr: mon.hr ?? null, spo2: mon.spo2 ?? null, etco2: mon.etco2 ?? null, awrr: mon.awrr ?? null,
    sys: mon.abpSys ?? null, dia: mon.abpDia ?? null, map: mon.abpMean ?? null, cvp: mon.cvpMean ?? null, temp: mon.tempCore ?? null,
    rhythm, pulse: tree === null || at(tree, 'hemo.circ.arrest') === null, cpr: at(tree, 'hemo.cpr.active') === true, // no truth yet: alive
    sao2: num(at(tree, 'organs.view.sao2')), tc: num(at(tree, 'resp.temp.tc')),
    ph: labs.ph ?? Number.NaN, paco2: labs.pco2 ?? Number.NaN, k: labs.k ?? Number.NaN, lactate: labs.lactate ?? Number.NaN, be: labs.be ?? Number.NaN,
  });
  let lastYield = 0;
  let nextRow = 1;
  for (let n = 1; n <= Math.round(untilS / pollS); n++) {
    const t = Math.round(n * pollS * 1000) / 1000;
    engine.advanceTo(t);
    driver.poll();
    const s = sample(t);
    for (const [i, a] of acts.entries()) {
      if (!Number.isNaN(run.pressed[i] as number) || (a.t !== undefined && t < a.t - 1e-9)) continue;
      if (a.when && !armed.has(i)) {
        if (!a.when(s)) continue;
        armed.set(i, t);
      }
      if (t + 1e-9 < (a.when ? (armed.get(i) as number) : (a.t as number)) + (a.delayS ?? 0)) continue;
      const tr = driver.runner?.state().transitions?.find((x) => 'manual' in x.when && x.when.manual.label === a.press);
      if (!tr || !driver.runner?.trigger(t, tr.id).ok) continue;
      driver.poll(); // as the host does on a button press: it acts on this tick
      run.pressed[i] = t;
    }
    if (t >= nextRow - 1e-9) {
      run.rows.push(s);
      nextRow += 1;
    }
    if (t - lastYield >= 60) {
      lastYield = t;
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  return run;
}

/** First sample at or after `from` where `pred` holds (undefined: never). */
export const first = (rows: readonly Sample[], pred: (s: Sample) => boolean, from = 0): Sample | undefined => rows.find((s) => s.t >= from && pred(s));
/** The sample nearest `t`. */
export const near = (rows: readonly Sample[], t: number): Sample => rows.reduce((b, s) => (Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b));
/** Extremes of a field over [t0, t1] (finite values only). */
export function range(rows: readonly Sample[], key: keyof Sample, t0: number, t1: number): { min: number; max: number } {
  const xs = rows.filter((s) => s.t >= t0 && s.t <= t1).map((s) => s[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return { min: Math.min(...xs), max: Math.max(...xs) };
}
/** Sim time the run entered state `id` (NaN: never). */
export const entered = (run: Run, id: string): number => run.states.find(([, s]) => s === id)?.[0] ?? Number.NaN;
/** First engine alarm whose text matches `re` at or after `from` (NaN: none). */
export const alarmAt = (run: Run, re: RegExp, from = 0): number => run.alarms.find((a) => a.t >= from && re.test(a.text))?.t ?? Number.NaN;

/**
 * R45 bands: every number a card promises sits in [lo, hi], taken from the measured prototype ± the tolerance named in
 * docs/plans/stage-11-scenarios.md ("Bands"). They are never widened to make a later change pass: a number that leaves
 * its band goes to the owner with both values. PME_SHOWCASE_PRINT=1 prints every measured number (for the gate note).
 */
export function bands(card: string, got: Record<string, number>, want: Record<string, readonly [number, number]>): void {
  if (process.env.PME_SHOWCASE_PRINT) console.log(`${card} ${JSON.stringify(Object.fromEntries(Object.entries(got).map(([k, x]) => [k, Math.round(x * 100) / 100])))}`);
  for (const [k, [lo, hi]] of Object.entries(want)) {
    const x = got[k];
    expect(x, `${card}: ${k} was never measured`).toBeTypeOf('number');
    expect(x, `${card}: ${k} = ${x} outside [${lo}, ${hi}]`).toBeGreaterThanOrEqual(lo);
    expect(x, `${card}: ${k} = ${x} outside [${lo}, ${hi}]`).toBeLessThanOrEqual(hi);
  }
}
```

Create `apps/demo/src/app/showcase/s3-induction.slow.test.ts`:

```ts
// Stage 11 S3 (showcase-induction): the healthy induction, run through its buttons on the engine — the prompt path
// (induce at 3:00, intubate 90 s later), the airway-not-secured path left alone to the arrest, the same path induced a
// minute late (the oxygen is held until "Induce now": waiting costs nothing), an early bag-mask rescue, a late tube
// rescue, and CPR after the hypoxic arrest. Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, it } from 'vitest';
import { alarmAt, bands, entered, first, near, range, runCard } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S3 prompt': { refused: [0, 0], mapBefore: [90, 100], hrBefore: [66, 76], apnoeaAlarmS: [41, 71], mapNadir: [60, 70], mapNadirS: [90, 120], hrMax5: [74, 84], hrMin5: [65, 75], capnoS: [0, 21], etco2At2min: [34, 40], spo2Min: [97, 100], mapAt4min: [67, 77] },
  'S3 untreated': { refused: [0, 0], apnoeaAlarmS: [41, 71], lastBreathS: [33, 63], desatStateS: [445, 543], bradyStateS: [509, 623], hrAtBrady: [39, 49], spo2ZeroS: [652, 796], mapAtSpo2Zero: [72, 82], pulseLossS: [1080, 1320], sao260ToLossS: [571, 697], pulselessStateS: [1084, 1324], asystole: [1, 1], firstSpontS: [831, 1015], firstSpontMl: [31, 41], spontMaxMl: [36, 46], effortStateS: [831, 1015], effortLabelLagS: [-15, 15], etco2DuringEfforts: [0, 3], awrrDuringEfforts: [0, 2] },
  'S3 induced late': { refused: [0, 0], inducedS: [225, 255], desatStateS: [445, 543], bradyStateS: [509, 623] },
  'S3 rescue bag-mask': { refused: [0, 0], pulseLost: [0, 0], spo2Over90S: [17, 47], hrOver60S: [0, 19], mapAt5min: [78, 88], etco2At5min: [45, 51] },
  'S3 rescue at 18 min': { refused: [0, 0], pulseLost: [0, 0], mapAtTube: [40, 50], spo2Over90S: [31, 61], mapMax5: [94, 104], triggeredS: [1026, 1254] },
  'S3 CPR': { refused: [0, 0], cprS: [1093, 1335], pulseBack: [0, 0], spo2DuringCpr: [97, 100], etco2DuringCpr: [31, 37], mapDuringCpr: [45, 55] },
} as const;

const ID = 'showcase-induction';
const I = 180; // the run sheet's "Induce now" at 3:00, after 3 minutes of preoxygenation (the card holds FiO2 1.0 until then)
const INDUCE = { press: 'Induce now', t: I };

describe('S3 healthy induction (showcase-induction)', { timeout: 900_000 }, () => {
  it('prompt path: apnoea alarm, the induction fall, the capnogram after intubation', async () => {
    const r = await runCard(ID, [INDUCE, { press: 'Intubate and ventilate', t: I + 90 }], I + 420);
    const nadir = r.rows.filter((s) => s.t >= I && s.t <= I + 300).reduce((b, s) => ((s.map ?? 999) < (b.map ?? 999) ? s : b));
    bands('S3 prompt', {
      refused: r.refused.length,
      mapBefore: near(r.rows, I - 1).map ?? Number.NaN, hrBefore: near(r.rows, I - 1).hr ?? Number.NaN,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I,
      mapNadir: nadir.map ?? Number.NaN, mapNadirS: nadir.t - I,
      hrMax5: range(r.rows, 'hr', I, I + 300).max, hrMin5: range(r.rows, 'hr', I, I + 300).min,
      capnoS: (first(r.rows, (s) => (s.etco2 ?? 0) >= 25, I + 90)?.t ?? Number.NaN) - (I + 90),
      etco2At2min: near(r.rows, I + 90 + 120).etco2 ?? Number.NaN,
      spo2Min: range(r.rows, 'spo2', I, I + 420).min,
      mapAt4min: near(r.rows, I + 240).map ?? Number.NaN,
    }, BANDS['S3 prompt']);
  });

  /** The airway-not-secured path induced at `at` (s), nothing else pressed; times are from the induction. */
  async function unsecured(at: number, untilS: number) {
    const r = await runCard(ID, [{ press: 'Induce now', t: at }], untilS);
    const loss = first(r.rows, (s) => !s.pulse);
    const sao260 = first(r.rows, (s) => s.sao2 < 0.6, at);
    const zero = first(r.rows, (s) => (s.spo2 ?? 100) <= 1, at);
    return { r, loss, sao260, zero };
  }

  it('airway not secured, nothing done: desaturation, hypoxic bradycardia, the first ineffective efforts, asystole at ≈ 20 min', async () => {
    const { r, loss, sao260, zero } = await unsecured(I, I + 1300);
    bands('S3 untreated', {
      refused: r.refused.length,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I, lastBreathS: (r.spont.filter(([t]) => t > I && t < I + 120).at(-1)?.[0] ?? Number.NaN) - I,
      desatStateS: entered(r, 'desaturating') - I, bradyStateS: entered(r, 'bradycardic') - I,
      hrAtBrady: near(r.rows, entered(r, 'bradycardic') + 10).hr ?? Number.NaN,
      spo2ZeroS: (zero?.t ?? Number.NaN) - I, mapAtSpo2Zero: zero?.map ?? Number.NaN,
      pulseLossS: (loss?.t ?? Number.NaN) - I, sao260ToLossS: (loss?.t ?? Number.NaN) - (sao260?.t ?? Number.NaN),
      pulselessStateS: entered(r, 'pulseless') - I,
      asystole: loss && near(r.rows, loss.t + 5).rhythm === 'asystole' ? 1 : 0,
      firstSpontS: (r.spont.find(([t]) => t > I + 120)?.[0] ?? Number.NaN) - I,
      firstSpontMl: r.spont.find(([t]) => t > I + 120)?.[1] ?? Number.NaN,
      spontMaxMl: Math.max(...r.spont.filter(([t]) => t > I + 120 && t < (loss?.t ?? 0)).map(([, v]) => v)),
      effortStateS: entered(r, 'firstEffort') - I,
      effortLabelLagS: entered(r, 'firstEffort') - (r.spont.find(([t]) => t > I + 120)?.[0] ?? Number.NaN), // D-3: the label and the first effort together
      etco2DuringEfforts: range(r.rows, 'etco2', entered(r, 'firstEffort'), (loss?.t ?? 0) - 1).max,
      awrrDuringEfforts: range(r.rows, 'awrr', entered(r, 'firstEffort'), (loss?.t ?? 0) - 1).max,
    }, BANDS['S3 untreated']);
  });

  it('induced a minute late (4:00): the oxygen was held, so the desaturation keeps its time from the induction', async () => {
    const L = I + 60;
    const { r } = await unsecured(L, L + 620);
    bands('S3 induced late', {
      refused: r.refused.length, inducedS: entered(r, 'induced'),
      desatStateS: entered(r, 'desaturating') - L, bradyStateS: entered(r, 'bradycardic') - L,
    }, BANDS['S3 induced late']);
  });

  it('early rescue: bag-mask 10 s into the bradycardia, tube 60 s later — no arrest, SpO2 back', async () => {
    const r = await runCard(ID, [INDUCE,
      { press: 'Bag-mask ventilate, FiO₂ 1.0', when: (s) => s.state === 'bradycardic', delayS: 10 },
      { press: 'Intubate and ventilate, FiO₂ 1.0', when: (s) => s.state === 'rescuedBvm', delayS: 60 }], I + 1000);
    const bvm = r.pressed[1] as number;
    bands('S3 rescue bag-mask', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      spo2Over90S: (first(r.rows, (s) => (s.spo2 ?? 0) >= 90, bvm)?.t ?? Number.NaN) - bvm,
      hrOver60S: (first(r.rows, (s) => (s.hr ?? 0) >= 60, bvm)?.t ?? Number.NaN) - bvm,
      mapAt5min: near(r.rows, bvm + 300).map ?? Number.NaN, etco2At5min: near(r.rows, bvm + 300).etco2 ?? Number.NaN,
    }, BANDS['S3 rescue bag-mask']);
  });

  it('late rescue: tube at +18 min (SpO2 0 for 6 min) — the pulse holds; the diaphragm comes back as triggered breaths', async () => {
    const t = I + 1080;
    const r = await runCard(ID, [INDUCE, { press: 'Intubate and ventilate, FiO₂ 1.0', t }], t + 420);
    bands('S3 rescue at 18 min', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      mapAtTube: near(r.rows, t).map ?? Number.NaN,
      spo2Over90S: (first(r.rows, (s) => (s.spo2 ?? 0) >= 90, t)?.t ?? Number.NaN) - t,
      mapMax5: range(r.rows, 'map', t, t + 300).max,
      triggeredS: (first(r.rows, (s) => (s.awrr ?? 0) >= 16, t + 60)?.t ?? Number.NaN) - I,
    }, BANDS['S3 rescue at 18 min']);
  });

  it('CPR after the hypoxic arrest: asystole does not come back (FU-4 Q3) — 10 min of CPR, FiO2 1.0, epinephrine × 2', async () => {
    const r = await runCard(ID, [INDUCE,
      { press: 'Start CPR, intubate, FiO₂ 1.0', when: (s) => s.state === 'pulseless', delayS: 10 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cpr', delayS: 120 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprEpi', delayS: 240 }], I + 1900);
    const cpr = r.pressed[1] as number;
    bands('S3 CPR', {
      refused: r.refused.length, cprS: cpr - I,
      pulseBack: r.rows.some((s) => s.t > cpr && s.pulse) ? 1 : 0,
      spo2DuringCpr: near(r.rows, cpr + 180).spo2 ?? Number.NaN, etco2DuringCpr: near(r.rows, cpr + 180).etco2 ?? Number.NaN,
      mapDuringCpr: near(r.rows, cpr + 180).map ?? Number.NaN,
    }, BANDS['S3 CPR']);
  });
});
```

- [ ] **Step 2 — run it red.** `npx -y pnpm@9.15.9 exec vitest run src/app/showcase/s3-induction.slow.test.ts`.
  Expected: FAIL, 5 of 6 (measured on main's card) — the states `desaturating`, `bradycardic`, `firstEffort`,
  `pulseless` do not exist. The prompt case PASSES on the old card: main's card already had a manual "Induce now" and
  the same drugs, so that case pins behaviour the rewrite must keep.
- [ ] **Step 3 — the card and the split.**

Replace the whole of `apps/demo/src/app/showcase/showcase-induction.json` with:

```json
{
  "schema": "pme-scenario/1",
  "id": "showcase-induction",
  "title": "Healthy induction",
  "category": "Showcase",
  "durationMin": 15,
  "story": "A fit 40-year-old man for elective surgery, preoxygenated with FiO₂ 1.0 by face mask: the oxygen stays on until you press “Induce now” (at 3:00 or later) and the mask comes off once the breathing has stopped. Watch the pressure fall after propofol and rocuronium and the breathing stop, then secure the airway. If nobody does, the case runs on: SpO₂ below 90 % about 8 minutes after induction, hypoxic bradycardia a minute later, the first tiny diaphragmatic efforts at about 15 minutes, too small to ventilate, and asystole at about 20 minutes. Ventilate at any point before the arrest to rescue him: asystole after prolonged hypoxia is rarely recoverable; ventilate before this point.",
  "objectives": [
    "Induce after at least 180 s of preoxygenation",
    "Intubate and ventilate within 90 s of the CO₂ apnoea alarm (it sounds about 55 s after induction)",
    "Confirm the tube: EtCO₂ above 25 mmHg within 30 s of intubation",
    "Airway not secured: ventilate (bag-mask or tube) within 60 s of SpO₂ falling below 90 % (about 8 minutes after induction)",
    "Ventilate within 300 s of SpO₂ falling below 60 % (the pulse is lost about 10½ minutes after it)"
  ],
  "notes": "Showcase case (Stage 11). MODELED: the physiology produces every change; the buttons only give what their label says. Measured course and bands: docs/plans/stage-11-scenarios.md.",
  "seed": 7,
  "mode": "modeled",
  "patient": {
    "ageY": 40,
    "sex": "M",
    "weightKg": 75,
    "heightCm": 178,
    "ageBand": "adult",
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "abp": "connected",
      "co2": "on",
      "temp": "on"
    }
  },
  "initialState": "awake",
  "states": [
    {
      "id": "awake",
      "label": "Awake, preoxygenating: FiO₂ 1.0 by face mask until induction",
      "notes": "The oxygen stays on until “Induce now”: induce at 3:00 or later (3 minutes of preoxygenation; waiting longer costs no desaturation time). An earlier induction shortens the safe apnoea, and the “first diaphragmatic efforts” label (a timer from the bradycardia) then comes before the efforts.",
      "onEnter": [
        {
          "$comment": "Held until “Induce now” (R50, Q5 ruling): 3600 s is the event’s maximum; the induced state ends it.",
          "type": "applyEvent",
          "event": {
            "kind": "preoxygenate",
            "fio2": 1,
            "durationS": 3600
          }
        }
      ],
      "transitions": [
        {
          "id": "induce",
          "label": "Induce now",
          "to": "induced",
          "when": {
            "manual": {
              "label": "Induce now"
            }
          }
        }
      ]
    },
    {
      "id": "induced",
      "label": "Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg — airway not yet secured",
      "onEnter": [
        {
          "$comment": "Ends the hold: the face mask stays on 45 s, until the breathing has stopped, then comes off (room air; no apnoeic oxygenation through an unsupported airway).",
          "type": "applyEvent",
          "event": {
            "kind": "preoxygenate",
            "fio2": 1,
            "durationS": 45
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "rocuronium",
            "dose": 0.6,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "intubate",
          "label": "Intubate and ventilate",
          "to": "ventilated",
          "when": {
            "manual": {
              "label": "Intubate and ventilate"
            }
          }
        },
        {
          "id": "rescueBvm",
          "label": "Bag-mask ventilate, FiO₂ 1.0",
          "to": "rescuedBvm",
          "when": {
            "manual": {
              "label": "Bag-mask ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "desat",
          "label": "SpO₂ below 90 %",
          "to": "desaturating",
          "when": {
            "vital": {
              "var": "spo2",
              "op": "<",
              "value": 90
            }
          }
        }
      ]
    },
    {
      "id": "desaturating",
      "label": "Airway not secured: SpO₂ below 90 %",
      "transitions": [
        {
          "id": "rescueEtt",
          "label": "Intubate and ventilate, FiO₂ 1.0",
          "to": "rescuedEtt",
          "when": {
            "manual": {
              "label": "Intubate and ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "rescueBvm-desaturating",
          "label": "Bag-mask ventilate, FiO₂ 1.0",
          "to": "rescuedBvm",
          "when": {
            "manual": {
              "label": "Bag-mask ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "brady",
          "label": "SpO₂ below 60 %",
          "to": "bradycardic",
          "when": {
            "vital": {
              "var": "spo2",
              "op": "<",
              "value": 60
            }
          }
        }
      ]
    },
    {
      "id": "bradycardic",
      "label": "SpO₂ below 60 %: hypoxic bradycardia",
      "transitions": [
        {
          "id": "rescueEtt-bradycardic",
          "label": "Intubate and ventilate, FiO₂ 1.0",
          "to": "rescuedEtt",
          "when": {
            "manual": {
              "label": "Intubate and ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "rescueBvm-bradycardic",
          "label": "Bag-mask ventilate, FiO₂ 1.0",
          "to": "rescuedBvm",
          "when": {
            "manual": {
              "label": "Bag-mask ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "loss",
          "label": "No pulse",
          "to": "pulseless",
          "when": {
            "any": [
              {
                "vital": {
                  "var": "hr",
                  "op": "<",
                  "value": 1,
                  "forS": 3
                }
              },
              {
                "vital": {
                  "var": "sbp",
                  "op": "<",
                  "value": 25,
                  "forS": 10
                }
              }
            ]
          }
        },
        {
          "id": "effort",
          "label": "First diaphragmatic efforts",
          "to": "firstEffort",
          "when": {
            "afterS": 357
          }
        }
      ]
    },
    {
      "id": "firstEffort",
      "label": "First diaphragmatic efforts: about 35 mL, too small for the capnogram",
      "notes": "Rocuronium is wearing off (FU-7.1 A4): the diaphragm makes its first efforts, each about 35 mL, soon about 40 a minute — below the dead space, so no capnogram, no respiratory rate on the monitor and no rise in SpO₂.",
      "transitions": [
        {
          "id": "rescueEtt-firstEffort",
          "label": "Intubate and ventilate, FiO₂ 1.0",
          "to": "rescuedEtt",
          "when": {
            "manual": {
              "label": "Intubate and ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "rescueBvm-firstEffort",
          "label": "Bag-mask ventilate, FiO₂ 1.0",
          "to": "rescuedBvm",
          "when": {
            "manual": {
              "label": "Bag-mask ventilate, FiO₂ 1.0"
            }
          }
        },
        {
          "id": "loss-firstEffort",
          "label": "No pulse",
          "to": "pulseless",
          "when": {
            "any": [
              {
                "vital": {
                  "var": "hr",
                  "op": "<",
                  "value": 1,
                  "forS": 3
                }
              },
              {
                "vital": {
                  "var": "sbp",
                  "op": "<",
                  "value": 25,
                  "forS": 10
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "pulseless",
      "label": "Hypoxic cardiac arrest",
      "transitions": [
        {
          "id": "cpr",
          "label": "Start CPR, intubate, FiO₂ 1.0",
          "to": "cpr",
          "when": {
            "manual": {
              "label": "Start CPR, intubate, FiO₂ 1.0"
            }
          }
        }
      ],
      "notes": "Asystole after prolonged hypoxia is rarely recoverable; ventilate before this point. In this engine asystole never regains a pulse (FU-4 Q3): CPR here shows that, it does not rescue him."
    },
    {
      "id": "cpr",
      "label": "CPR, ventilated with FiO₂ 1.0",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "cpr",
            "active": true,
            "rate": 110,
            "quality": 0.8
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "epi",
          "label": "Epinephrine 1 mg",
          "to": "cprEpi",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        },
        {
          "id": "rosc",
          "label": "Pulse back: stop CPR",
          "to": "rosc",
          "when": {
            "manual": {
              "label": "Pulse back: stop CPR"
            }
          }
        }
      ]
    },
    {
      "id": "cprEpi",
      "label": "CPR: epinephrine 1 mg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "epinephrine",
            "dose": 1,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "epi-cprEpi",
          "label": "Epinephrine 1 mg",
          "to": "cprEpiRepeat",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        },
        {
          "id": "rosc-cprEpi",
          "label": "Pulse back: stop CPR",
          "to": "rosc",
          "when": {
            "manual": {
              "label": "Pulse back: stop CPR"
            }
          }
        }
      ]
    },
    {
      "id": "cprEpiRepeat",
      "label": "CPR: epinephrine 1 mg repeated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "epinephrine",
            "dose": 1,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "epi-cprEpiRepeat",
          "label": "Epinephrine 1 mg",
          "to": "cprEpi",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        },
        {
          "id": "rosc-cprEpiRepeat",
          "label": "Pulse back: stop CPR",
          "to": "rosc",
          "when": {
            "manual": {
              "label": "Pulse back: stop CPR"
            }
          }
        }
      ]
    },
    {
      "id": "rosc",
      "label": "Return of circulation",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "cpr",
            "active": false
          }
        }
      ]
    },
    {
      "id": "rescuedBvm",
      "label": "Bag-mask ventilation, FiO₂ 1.0",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "bvm",
            "rr": 12,
            "vtMl": 500,
            "fio2": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "rescueEtt-rescuedBvm",
          "label": "Intubate and ventilate, FiO₂ 1.0",
          "to": "rescuedEtt",
          "when": {
            "manual": {
              "label": "Intubate and ventilate, FiO₂ 1.0"
            }
          }
        }
      ]
    },
    {
      "id": "rescuedEtt",
      "label": "Rescued: intubated, FiO₂ 1.0",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 1
          }
        }
      ]
    },
    {
      "id": "ventilated",
      "label": "Intubated and ventilated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 0.5
          }
        }
      ]
    }
  ]
}
```

In `apps/demo/vite.config.ts`, find:

```ts
import { resolve } from 'node:path';
```

Replace with:

```ts
/// <reference types="vitest/config" />
import { resolve } from 'node:path';
```

In `apps/demo/vite.config.ts`, find:

```ts
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
```

Replace with:

```ts
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);
// Stage 11: the showcase cards run on the engine for 10–60 sim-min each (≈ 3.5 min in all, alone). CI runs them in the test-slow
// job's `showcase` group (PME_TEST_SET=showcase, one file at a time); the main job's fast set (PME_TEST_SET=fast) leaves
// them out, as engine-core does with its SLOW set. Unset = everything (a local `pnpm test`).
const SHOWCASE_SLOW = 'src/app/showcase/*.slow.test.ts';
const set = process.env.PME_TEST_SET;
```

In `apps/demo/vite.config.ts`, find:

```ts
export default defineConfig({
  build: {
```

Replace with:

```ts
export default defineConfig({
  test: {
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', SHOWCASE_SLOW] } : {}),
    ...(set === 'showcase' ? { include: [SHOWCASE_SLOW], fileParallelism: false } : {}),
  },
  build: {
```

In `.github/workflows/ci.yml`, find:

```yaml
      matrix:
        group: [slow-a, slow-b, slow-c, slow-d, slow-e, slow-f, slow-g]
    name: test-slow (${{ matrix.group }})
```

Replace with:

```yaml
      matrix:
        group: [slow-a, slow-b, slow-c, slow-d, slow-e, slow-f, slow-g, showcase]
    name: test-slow (${{ matrix.group }})
```

In `.github/workflows/ci.yml`, find:

```yaml
      - run: pnpm --filter @pme/engine-core test
        env:
```

Replace with:

```yaml
      - run: pnpm --filter @pme/engine-core test
        if: matrix.group != 'showcase'
        env:
```

In `.github/workflows/ci.yml`, find:

```yaml
          PME_TEST_SET: ${{ matrix.group }}
```

Replace with:

```yaml
          PME_TEST_SET: ${{ matrix.group }}
      # Stage 11: the showcase cards' scenario tests (apps/demo vite.config.ts); `vitest run` without the package
      # script's --passWithNoTests, so a set that matches no file fails instead of passing empty
      - run: pnpm --filter @pme/demo exec vitest run
        if: matrix.group == 'showcase'
        env:
          PME_TEST_SET: showcase
```

- [ ] **Step 4 — run it green.** The same command: 6 passed (≈ 90 s alone; the machine's load can triple it). Then
  `PME_TEST_SET=fast npx -y pnpm@9.15.9 exec vitest list --filesOnly | grep -c slow.test` → `0`, and
  `PME_TEST_SET=showcase npx -y pnpm@9.15.9 exec vitest list --filesOnly` → only `src/app/showcase/s3-induction.slow.test.ts`.
  Also `npx -y pnpm@9.15.9 exec vitest run src/app/showcase.test.ts` (the old Showcase list still holds) and
  `npx -y pnpm@9.15.9 exec tsc -p tsconfig.json --noEmit` (clean).
- [ ] **Step 5 — commit.** `git add apps/demo/src/app/showcase apps/demo/vite.config.ts .github/workflows/ci.yml && git commit -m "feat(showcase): S3 healthy induction with the airway-not-secured branch; the showcase test harness and CI group (Stage 11)"`

### Task 2: S2 stab wound — tamponade, PEA, CPR, pericardiocentesis, ROSC

**Files** Create `apps/demo/src/app/showcase/s2-tamponade.slow.test.ts`; replace `apps/demo/src/app/showcase/showcase-tamponade.json`.
**Consumes** Task 1's harness.

- [ ] **Step 1 — the failing test.**

Create `apps/demo/src/app/showcase/s2-tamponade.slow.test.ts`:

```ts
// Stage 11 S2 (showcase-tamponade): a stab wound filling the pericardium (250 mL + 15 mL/min) → PEA → CPR → pericardio-
// centesis → ROSC, run through the card's buttons on the engine (FU-7.1 B4: drainage during good CPR restores the
// circulation by itself; undrained, never). Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { bands, entered, first, near, range, runCard, type Act } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S2 happy': { refused: [0, 0], hrAt60: [94, 104], sysAt60: [101, 111], diaAt60: [82, 92], cvpAt60: [15, 19], etco2At60: [29, 35], pulsusMean: [0, 1.9], pulsusMax: [0, 2.6], deterioratingS: [336, 410], hrAtDeteriorating: [130, 140], cvpAtDeteriorating: [18, 22], pulseLossS: [424, 518], peaStateS: [425, 519], pea: [1, 1], drainS: [542, 662], roscAfterDrainS: [81, 111], sysPlus60: [113, 123], hrPlus60: [58, 68], cvpPlus60: [8, 12], etco2Plus60: [32, 38], sysMaxAtRosc: [150, 160], pulseHeld: [1, 1] },
  'S2 epinephrine': { refused: [0, 0], roscAfterDrainS: [79, 109] },
  'S2 undrained': { refused: [0, 0], pulseBack: [0, 0], cvpMax: [30, 34], etco2Plus3: [6, 12] },
  'S2 at ×8 poll': { refused: [0, 0], pulseLossS: [424, 518], peaStateS: [426, 520], roscAfterDrainS: [80, 110] },
  'S2 early drain': { refused: [0, 0], pulseLost: [0, 0], sysAtDrain: [55, 65], sysPlus60: [117, 127], hrPlus60: [64, 74], cvpPlus60: [5, 9], sysMax: [150, 160] },
} as const;

const ID = 'showcase-tamponade';
const CPR: Act = { press: 'Start CPR, intubate, FiO₂ 1.0', when: (s) => s.state === 'pea', delayS: 10 };
const DRAIN: Act = { press: 'Pericardiocentesis during CPR', when: (s) => s.state === 'cpr' || s.state === 'cprEpi', delayS: 120 };
const STOP: Act = { press: 'Pulse back: stop CPR', when: (s) => s.pulse && s.cpr, delayS: 10 };

/** SBP swing within each spontaneous breath (the pulsus-paradoxus measure, research/24 §P3), 60–180 s. */
function pulsus(): { listen: (e: EngineEvent) => void; mean: () => number; max: () => number } {
  const sw: number[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  let started = false;
  return {
    listen: (e) => {
      if (!('t' in e) || e.t < 60 || e.t > 180) return;
      if (e.type === 'breath') {
        if (started && hi > lo) sw.push(hi - lo);
        started = true;
        lo = Infinity;
        hi = -Infinity;
      } else if (e.type === 'measurement') {
        const v = e.values.abpSys?.value;
        if (typeof v === 'number') (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
      }
    },
    mean: () => sw.reduce((a, b) => a + b, 0) / sw.length,
    max: () => Math.max(...sw),
  };
}

describe('S2 stab wound: tamponade, PEA and pericardiocentesis (showcase-tamponade)', { timeout: 900_000 }, () => {
  it('happy path: CPR 10 s after the PEA, drainage 2 min into CPR, ROSC, post-ROSC', async () => {
    const p = pulsus();
    const r = await runCard(ID, [CPR, DRAIN, STOP], 1080, p.listen);
    const loss = first(r.rows, (s) => !s.pulse);
    const drain = r.pressed[1] as number;
    const rosc = first(r.rows, (s) => s.pulse, drain);
    bands('S2 happy', {
      refused: r.refused.length,
      hrAt60: near(r.rows, 60).hr ?? Number.NaN, sysAt60: near(r.rows, 60).sys ?? Number.NaN, diaAt60: near(r.rows, 60).dia ?? Number.NaN,
      cvpAt60: near(r.rows, 60).cvp ?? Number.NaN, etco2At60: near(r.rows, 60).etco2 ?? Number.NaN,
      pulsusMean: p.mean(), pulsusMax: p.max(),
      deterioratingS: entered(r, 'deteriorating'), hrAtDeteriorating: near(r.rows, entered(r, 'deteriorating')).hr ?? Number.NaN,
      cvpAtDeteriorating: near(r.rows, entered(r, 'deteriorating')).cvp ?? Number.NaN,
      pulseLossS: loss?.t ?? Number.NaN, peaStateS: entered(r, 'pea'), pea: loss && !/^vf|asystole/.test(near(r.rows, loss.t + 3).rhythm) ? 1 : 0,
      drainS: drain, roscAfterDrainS: (rosc?.t ?? Number.NaN) - drain,
      sysPlus60: near(r.rows, (rosc?.t ?? 0) + 60).sys ?? Number.NaN, hrPlus60: near(r.rows, (rosc?.t ?? 0) + 60).hr ?? Number.NaN,
      cvpPlus60: near(r.rows, (rosc?.t ?? 0) + 60).cvp ?? Number.NaN, etco2Plus60: near(r.rows, (rosc?.t ?? 0) + 60).etco2 ?? Number.NaN,
      sysMaxAtRosc: range(r.rows, 'sys', rosc?.t ?? 0, (rosc?.t ?? 0) + 30).max,
      pulseHeld: r.rows.some((s) => s.t > (rosc?.t ?? 1e9) && !s.pulse) ? 0 : 1,
    }, BANDS['S2 happy']);
  });

  it('with epinephrine 1 mg 5 s after the drainage', async () => {
    const r = await runCard(ID, [CPR, DRAIN, { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprDrained', delayS: 5 }, STOP], 900);
    const drain = r.pressed[1] as number;
    bands('S2 epinephrine', { refused: r.refused.length, roscAfterDrainS: (first(r.rows, (s) => s.pulse, drain)?.t ?? Number.NaN) - drain }, BANDS['S2 epinephrine']);
  });

  it('undrained: 10 min of CPR with epinephrine × 2 never brings the pulse back', async () => {
    const r = await runCard(ID, [CPR, { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cpr', delayS: 120 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprEpi', delayS: 240 }], 1100);
    const cpr = r.pressed[0] as number;
    bands('S2 undrained', {
      refused: r.refused.length, pulseBack: r.rows.some((s) => s.t > cpr && s.pulse) ? 1 : 0,
      cvpMax: range(r.rows, 'cvp', cpr, 1100).max, etco2Plus3: near(r.rows, cpr + 180).etco2 ?? Number.NaN,
    }, BANDS['S2 undrained']);
  });

  it('at ×8 (the driver polled every 0.8 s of sim, as the app at ×8): the same states in the same order, ROSC in the same band', async () => {
    const r = await runCard(ID, [CPR, DRAIN, STOP], 1080, undefined, 0.8);
    const drain = r.pressed[1] as number;
    bands('S2 at ×8 poll', {
      refused: r.refused.length, pulseLossS: first(r.rows, (s) => !s.pulse)?.t ?? Number.NaN, peaStateS: entered(r, 'pea'),
      roscAfterDrainS: (first(r.rows, (s) => s.pulse, drain)?.t ?? Number.NaN) - drain,
    }, BANDS['S2 at ×8 poll']);
    expect(r.states.map(([, s]) => s)).toEqual(['arrival', 'deteriorating', 'pea', 'cpr', 'cprDrained', 'rosc']);
  });

  it('drained before the arrest (60 s into the deterioration): no PEA', async () => {
    const r = await runCard(ID, [{ press: 'Pericardiocentesis', when: (s) => s.state === 'deteriorating', delayS: 60 }], 900);
    const d = r.pressed[0] as number;
    bands('S2 early drain', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0, sysAtDrain: near(r.rows, d).sys ?? Number.NaN,
      sysPlus60: near(r.rows, d + 60).sys ?? Number.NaN, hrPlus60: near(r.rows, d + 60).hr ?? Number.NaN, cvpPlus60: near(r.rows, d + 60).cvp ?? Number.NaN,
      sysMax: range(r.rows, 'sys', d, d + 30).max,
    }, BANDS['S2 early drain']);
  });
});
```

- [ ] **Step 2 — run it red.** Expected: FAIL (the old card has no `pea` state and no "Start CPR, intubate, FiO₂ 1.0").
- [ ] **Step 3 — the card.**

Replace the whole of `apps/demo/src/app/showcase/showcase-tamponade.json` with:

```json
{
  "schema": "pme-scenario/1",
  "id": "showcase-tamponade",
  "title": "Stab wound: tamponade, PEA and pericardiocentesis",
  "category": "Showcase",
  "durationMin": 15,
  "story": "A 30-year-old man with a stab wound to the left chest. He arrives tachycardic, with a narrow pulse pressure and a raised CVP; blood is collecting in the pericardium. Without drainage he loses his pulse (PEA) about 8 minutes after arrival. CPR alone cannot bring him back; pericardiocentesis during good CPR brings the pulse back about a minute and a half later.",
  "objectives": [
    "Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)",
    "Start CPR within 10 s of the pulse loss",
    "Pericardiocentesis within 120 s of starting CPR",
    "Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogram",
    "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA follows"
  ],
  "notes": "Showcase case (Stage 11). MODELED: the physiology produces every change; the buttons only give what their label says. Measured course and bands: docs/plans/stage-11-scenarios.md.",
  "seed": 7,
  "mode": "modeled",
  "patient": {
    "ageY": 30,
    "sex": "M",
    "weightKg": 80,
    "heightCm": 180,
    "ageBand": "adult",
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "abp": "connected",
      "co2": "on",
      "temp": "on",
      "cvp": "connected"
    }
  },
  "initialState": "arrival",
  "states": [
    {
      "id": "arrival",
      "label": "Arrival: tachycardic, narrow pulse pressure, raised CVP",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "spontaneous",
            "fio2": 0.5
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 250,
            "rateMlPerMin": 15
          }
        }
      ],
      "transitions": [
        {
          "id": "drain",
          "label": "Pericardiocentesis",
          "to": "drainedEarly",
          "when": {
            "manual": {
              "label": "Pericardiocentesis"
            }
          }
        },
        {
          "id": "propofol",
          "label": "Induce for intubation: propofol 2 mg/kg",
          "to": "propofol",
          "when": {
            "manual": {
              "label": "Induce for intubation: propofol 2 mg/kg"
            }
          }
        },
        {
          "id": "worse",
          "label": "Systolic below 80",
          "to": "deteriorating",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 80,
              "forS": 5
            }
          }
        }
      ]
    },
    {
      "id": "deteriorating",
      "label": "Deteriorating: systolic below 80",
      "transitions": [
        {
          "id": "drain-deteriorating",
          "label": "Pericardiocentesis",
          "to": "drainedEarly",
          "when": {
            "manual": {
              "label": "Pericardiocentesis"
            }
          }
        },
        {
          "id": "propofol-deteriorating",
          "label": "Induce for intubation: propofol 2 mg/kg",
          "to": "propofol",
          "when": {
            "manual": {
              "label": "Induce for intubation: propofol 2 mg/kg"
            }
          }
        },
        {
          "id": "loss",
          "label": "No pulse (PEA)",
          "to": "pea",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "propofol",
      "label": "Propofol 2 mg/kg given: compensation lost",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "drain-propofol",
          "label": "Pericardiocentesis",
          "to": "drainedEarly",
          "when": {
            "manual": {
              "label": "Pericardiocentesis"
            }
          }
        },
        {
          "id": "loss-propofol",
          "label": "No pulse (PEA)",
          "to": "peaAfterPropofol",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "pea",
      "label": "PEA: organised rhythm, no pulse; the pericardium holds about 370 mL",
      "notes": "With no cardiac output the wound stops bleeding: the accumulation stops at the pulse loss (370 mL).",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 370,
            "rateMlPerMin": 0
          }
        }
      ],
      "transitions": [
        {
          "id": "cpr",
          "label": "Start CPR, intubate, FiO₂ 1.0",
          "to": "cpr",
          "when": {
            "manual": {
              "label": "Start CPR, intubate, FiO₂ 1.0"
            }
          }
        }
      ]
    },
    {
      "id": "peaAfterPropofol",
      "label": "PEA after propofol: organised rhythm, no pulse",
      "transitions": [
        {
          "id": "cpr-peaAfterPropofol",
          "label": "Start CPR, intubate, FiO₂ 1.0",
          "to": "cpr",
          "when": {
            "manual": {
              "label": "Start CPR, intubate, FiO₂ 1.0"
            }
          }
        }
      ]
    },
    {
      "id": "cpr",
      "label": "CPR, ventilated with FiO₂ 1.0",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "cpr",
            "active": true,
            "rate": 110,
            "quality": 0.8
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "drain-cpr",
          "label": "Pericardiocentesis during CPR",
          "to": "cprDrained",
          "when": {
            "manual": {
              "label": "Pericardiocentesis during CPR"
            }
          }
        },
        {
          "id": "epi",
          "label": "Epinephrine 1 mg",
          "to": "cprEpi",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        }
      ]
    },
    {
      "id": "cprEpi",
      "label": "CPR: epinephrine 1 mg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "epinephrine",
            "dose": 1,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "drain-cprEpi",
          "label": "Pericardiocentesis during CPR",
          "to": "cprDrained",
          "when": {
            "manual": {
              "label": "Pericardiocentesis during CPR"
            }
          }
        },
        {
          "id": "epi-cprEpi",
          "label": "Epinephrine 1 mg",
          "to": "cprEpiRepeat",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        }
      ]
    },
    {
      "id": "cprEpiRepeat",
      "label": "CPR: epinephrine 1 mg repeated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "epinephrine",
            "dose": 1,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "drain-cprEpiRepeat",
          "label": "Pericardiocentesis during CPR",
          "to": "cprDrained",
          "when": {
            "manual": {
              "label": "Pericardiocentesis during CPR"
            }
          }
        },
        {
          "id": "epi-cprEpiRepeat",
          "label": "Epinephrine 1 mg",
          "to": "cprEpi",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        }
      ]
    },
    {
      "id": "cprDrained",
      "label": "CPR: pericardium drained, catheter left in",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 30,
            "rateMlPerMin": 4
          }
        }
      ],
      "transitions": [
        {
          "id": "epi-cprDrained",
          "label": "Epinephrine 1 mg",
          "to": "cprDrainedEpi",
          "when": {
            "manual": {
              "label": "Epinephrine 1 mg"
            }
          }
        },
        {
          "id": "rosc",
          "label": "Pulse back: stop CPR",
          "to": "rosc",
          "when": {
            "manual": {
              "label": "Pulse back: stop CPR"
            }
          }
        }
      ]
    },
    {
      "id": "cprDrainedEpi",
      "label": "CPR, drained: epinephrine 1 mg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "epinephrine",
            "dose": 1,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "rosc-cprDrainedEpi",
          "label": "Pulse back: stop CPR",
          "to": "rosc",
          "when": {
            "manual": {
              "label": "Pulse back: stop CPR"
            }
          }
        }
      ]
    },
    {
      "id": "rosc",
      "label": "Return of circulation: ventilated, catheter in the pericardium",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "cpr",
            "active": false
          }
        }
      ],
      "transitions": [
        {
          "id": "fluid",
          "label": "Crystalloid 500 mL",
          "to": "roscFluid",
          "when": {
            "manual": {
              "label": "Crystalloid 500 mL"
            }
          }
        },
        {
          "id": "reasp",
          "label": "Aspirate the catheter again",
          "to": "roscReaspirated",
          "when": {
            "manual": {
              "label": "Aspirate the catheter again"
            }
          }
        }
      ]
    },
    {
      "id": "roscFluid",
      "label": "Post-ROSC: 500 mL crystalloid running",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "fluid",
            "fluid": "balanced",
            "volumeMl": 500,
            "overS": 300
          }
        }
      ],
      "transitions": [
        {
          "id": "reasp-roscFluid",
          "label": "Aspirate the catheter again",
          "to": "roscReaspirated",
          "when": {
            "manual": {
              "label": "Aspirate the catheter again"
            }
          }
        }
      ]
    },
    {
      "id": "roscReaspirated",
      "label": "Post-ROSC: catheter aspirated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 30,
            "rateMlPerMin": 4
          }
        }
      ],
      "transitions": [
        {
          "id": "fluid-roscReaspirated",
          "label": "Crystalloid 500 mL",
          "to": "roscFluid",
          "when": {
            "manual": {
              "label": "Crystalloid 500 mL"
            }
          }
        }
      ]
    },
    {
      "id": "drainedEarly",
      "label": "Pericardium drained before the arrest, catheter left in",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 30,
            "rateMlPerMin": 4
          }
        }
      ],
      "transitions": [
        {
          "id": "reasp-drainedEarly",
          "label": "Aspirate the catheter again",
          "to": "drainedEarlyReaspirated",
          "when": {
            "manual": {
              "label": "Aspirate the catheter again"
            }
          }
        }
      ]
    },
    {
      "id": "drainedEarlyReaspirated",
      "label": "Catheter aspirated again",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "tamponade",
            "severity": 1,
            "volumeMl": 30,
            "rateMlPerMin": 4
          }
        }
      ],
      "transitions": [
        {
          "id": "reasp-drainedEarlyReaspirated",
          "label": "Aspirate the catheter again",
          "to": "drainedEarly",
          "when": {
            "manual": {
              "label": "Aspirate the catheter again"
            }
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 4 — run it green.** 5 passed (≈ 37 s alone). `vitest run src/app/showcase.test.ts` still passes.
- [ ] **Step 5 — commit.** `feat(showcase): S2 stab wound — tamponade, PEA, CPR and pericardiocentesis (Stage 11)`

### Task 3: S5 the two kept cards, pinned on the new physiology

**Files** Create `apps/demo/src/app/showcase/s5-kept.slow.test.ts`; modify `apps/demo/src/app/showcase/showcase-haemorrhage.json`
(the story's and the notes' numbers only — Q3 ruling: prose, not physiology; no state, event or button changes).

- [ ] **Step 1 — the test, and the haemorrhage card's two numbers** (pulse lost ≈ 10:29, back ≈ 3 min into CPR; it said
  "about four and a half minutes"). The text change cannot move a number of the test.

Create `apps/demo/src/app/showcase/s5-kept.slow.test.ts`:

```ts
// Stage 11 S5: the two kept cards, unchanged, re-measured on the FU-7.1 physiology — haemorrhage → PEA → CPR and
// anaphylaxis (treated 2 min into the reaction, and untreated). Their old run-sheet numbers are in
// docs/plans/stage-11-scenarios.md beside these; a number that left its old band is reported there, not tuned (R45).
import { describe, it } from 'vitest';
import { bands, first, near, range, runCard } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S5 haemorrhage': { refused: [0, 0], hrAt2: [76, 86], sysAt2: [109, 119], hrAt4: [91, 101], sysAt4: [103, 113], hrAt6: [116, 126], sysAt6: [94, 104], hrAt8: [137, 147], sysAt8: [70, 80], mapAt8: [61, 71], pulseLossS: [566, 692], roscIntoCprS: [158, 194], sysOver90IntoCprS: [160, 196], sysStop60: [130, 140], diaStop60: [86, 96], hrStop60: [70, 80], etco2Stop60: [32, 38] },
  'S5 anaphylaxis': { refused: [0, 0], hrAt2: [134, 144], sysAt2: [91, 101], mapAt2: [73, 83], sysOver110S: [0, 26], hrPeak: [173, 183], sysPlus2: [113, 123], mapPlus2: [92, 102], hrPlus2: [105, 115] },
  'S5 anaphylaxis untreated': { refused: [0, 0], mapAt3: [48, 58], pulseLossS: [284, 346] },
} as const;

describe('S5 kept cards on the new physiology', { timeout: 900_000 }, () => {
  it('haemorrhage: pulse loss, CPR 15 s later, ROSC, 1 min after stopping CPR', async () => {
    const r = await runCard('showcase-haemorrhage', [
      { press: 'Start CPR, 2 L and epinephrine', when: (s) => !s.pulse, delayS: 15 },
      { press: 'Pulse back: stop CPR', when: (s) => s.state === 'resuscitation' && s.pulse && s.cpr, delayS: 10 },
    ], 1100);
    const loss = first(r.rows, (s) => !s.pulse);
    const cpr = r.pressed[0] as number;
    const stop = r.pressed[1] as number;
    bands('S5 haemorrhage', {
      refused: r.refused.length,
      hrAt2: near(r.rows, 120).hr ?? Number.NaN, sysAt2: near(r.rows, 120).sys ?? Number.NaN,
      hrAt4: near(r.rows, 240).hr ?? Number.NaN, sysAt4: near(r.rows, 240).sys ?? Number.NaN,
      hrAt6: near(r.rows, 360).hr ?? Number.NaN, sysAt6: near(r.rows, 360).sys ?? Number.NaN,
      hrAt8: near(r.rows, 480).hr ?? Number.NaN, sysAt8: near(r.rows, 480).sys ?? Number.NaN, mapAt8: near(r.rows, 480).map ?? Number.NaN,
      pulseLossS: loss?.t ?? Number.NaN,
      roscIntoCprS: (first(r.rows, (s) => s.pulse, cpr)?.t ?? Number.NaN) - cpr,
      sysOver90IntoCprS: (first(r.rows, (s) => (s.sys ?? 0) > 90, cpr)?.t ?? Number.NaN) - cpr,
      sysStop60: near(r.rows, stop + 60).sys ?? Number.NaN, diaStop60: near(r.rows, stop + 60).dia ?? Number.NaN,
      hrStop60: near(r.rows, stop + 60).hr ?? Number.NaN, etco2Stop60: near(r.rows, stop + 60).etco2 ?? Number.NaN,
    }, BANDS['S5 haemorrhage']);
  });

  it('anaphylaxis: epinephrine 100 µg 2 min into the reaction', async () => {
    const r = await runCard('showcase-anaphylaxis', [{ press: 'Give epinephrine 100 µg', t: 180 }], 480);
    bands('S5 anaphylaxis', {
      refused: r.refused.length,
      hrAt2: near(r.rows, 180).hr ?? Number.NaN, sysAt2: near(r.rows, 180).sys ?? Number.NaN, mapAt2: near(r.rows, 180).map ?? Number.NaN,
      sysOver110S: (first(r.rows, (s) => (s.sys ?? 0) > 110, 180)?.t ?? Number.NaN) - 180,
      hrPeak: range(r.rows, 'hr', 180, 300).max,
      sysPlus2: near(r.rows, 300).sys ?? Number.NaN, mapPlus2: near(r.rows, 300).map ?? Number.NaN, hrPlus2: near(r.rows, 300).hr ?? Number.NaN,
    }, BANDS['S5 anaphylaxis']);
  });

  it('anaphylaxis untreated: the pulse is lost', async () => {
    const r = await runCard('showcase-anaphylaxis', [], 600);
    bands('S5 anaphylaxis untreated', {
      refused: r.refused.length, mapAt3: near(r.rows, 240).map ?? Number.NaN, pulseLossS: first(r.rows, (s) => !s.pulse)?.t ?? Number.NaN,
    }, BANDS['S5 anaphylaxis untreated']);
  });
});
```

In `apps/demo/src/app/showcase/showcase-haemorrhage.json`, find:

```json
  "durationMin": 20,
  "story": "A ventilated 35-year-old man bleeding 2.5 L over 10 minutes. He loses his pulse (PEA). Start CPR, give 2 L of warmed fluid and epinephrine 1 mg: the pulse returns about four and a half minutes into CPR.",
  "objectives": [
```

Replace with:

```json
  "durationMin": 20,
  "story": "A ventilated 35-year-old man bleeding 2.5 L over 10 minutes. He loses his pulse (PEA) at about 10½ minutes. Start CPR, give 2 L of warmed fluid and epinephrine 1 mg: the pulse returns about three minutes into CPR.",
  "objectives": [
```

In `apps/demo/src/app/showcase/showcase-haemorrhage.json`, find:

```json
  ],
  "notes": "Showcase case (Stage 9 Task 26): the fu4 page's class IV run (bleed 2.5 L over 600 s; CPR + 2 L over 180 s + epinephrine 1 mg; pulse back ≈ 4.5 min into CPR).",
  "seed": 7,
```

Replace with:

```json
  ],
  "notes": "Showcase case (Stage 9 Task 26): the fu4 page's class IV run (bleed 2.5 L over 600 s; CPR + 2 L over 180 s + epinephrine 1 mg; pulse lost ≈ 10:29, back ≈ 3 min into CPR — Stage 11, measured on the FU-7.1 physiology; it was ≈ 10:05 and ≈ 4.5 min).",
  "seed": 7,
```

- [ ] **Step 2 — run it.** This task pins content that already exists, so it passes at once: 3 passed (≈ 19 s). A
  FAIL here means main's physiology is not the prototype's — STOP and report the numbers (R45).
- [ ] **Step 3 — commit.** `test(showcase): pin the kept haemorrhage and anaphylaxis cards on the FU-7.1 physiology; the haemorrhage story's numbers (Stage 11)`

### Task 4: S4 induction after fentanyl and midazolam; bronchospasm leaves the Showcase group

**Files** Create `apps/demo/src/app/showcase/s4-premed.slow.test.ts`, `apps/demo/src/app/showcase/showcase-induction-premed.json`;
modify `apps/demo/src/app/showcase/showcase-bronchospasm.json` (one field), `apps/demo/src/app/showcase.test.ts` (its id line).

- [ ] **Step 1 — the failing test.**

Create `apps/demo/src/app/showcase/s4-premed.slow.test.ts`:

```ts
// Stage 11 S4 (showcase-induction-premed): fentanyl 2 µg/kg + midazolam 0.03 mg/kg at 0:10 (the card's own timer), the
// same propofol and rocuronium at 3:00 ("Induce now", as the run sheet presses it), intubated at +90 s — with no vasopressor (the nadir the story compares with S3) and with ephedrine
// 20 s after the mean pressure falls below 60. Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, it } from 'vitest';
import { alarmAt, bands, entered, first, near, range, runCard } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S4 no pressor': { refused: [0, 0], premedS: [0, 25], inducedS: [162, 198], mapAt10: [91, 101], hrAt10: [66, 76], mapBefore: [85, 95], hrBefore: [57, 67], awrrBefore: [3, 7], etco2Before: [45, 51], apnoeaAlarmS: [28, 58], mapNadir: [47, 57], mapNadirS: [101, 131], hrAtNadir: [51, 61], hrMin5: [50, 60], spo2Min: [97, 100], mapAt4min: [53, 63] },
  'S4 ephedrine': { refused: [0, 0], ephedrineS: [100, 130], mapAtDose: [47, 57], hrAtDose: [51, 61], mapPlus60: [54, 64], mapPlus120: [62, 72], hrPlus120: [54, 64], mapOver65S: [81, 111], state: [1, 1] },
  'S4 phenylephrine': { refused: [0, 0], mapPlus60: [68, 78], hrPlus60: [48, 58], hrMin: [47, 57] },
} as const;

const ID = 'showcase-induction-premed';
const I = 180;
const BASE = [{ press: 'Induce now', t: I }, { press: 'Intubate and ventilate', t: I + 90 }]; // premedication at 0:10 is the card's own timer

describe('S4 induction after premedication (showcase-induction-premed)', { timeout: 900_000 }, () => {
  it('no vasopressor: the premedication, the earlier apnoea, the deeper fall', async () => {
    const r = await runCard(ID, BASE, I + 420);
    const nadir = r.rows.filter((s) => s.t >= I && s.t <= I + 300).reduce((b, s) => ((s.map ?? 999) < (b.map ?? 999) ? s : b));
    bands('S4 no pressor', {
      refused: r.refused.length,
      premedS: entered(r, 'premedicated'), inducedS: entered(r, 'induced'), mapAt10: near(r.rows, 10).map ?? Number.NaN, hrAt10: near(r.rows, 10).hr ?? Number.NaN,
      mapBefore: near(r.rows, I - 1).map ?? Number.NaN, hrBefore: near(r.rows, I - 1).hr ?? Number.NaN,
      awrrBefore: near(r.rows, I - 1).awrr ?? Number.NaN, etco2Before: near(r.rows, I - 1).etco2 ?? Number.NaN,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I,
      mapNadir: nadir.map ?? Number.NaN, mapNadirS: nadir.t - I, hrAtNadir: nadir.hr ?? Number.NaN,
      hrMin5: range(r.rows, 'hr', I, I + 300).min, spo2Min: range(r.rows, 'spo2', I, I + 420).min,
      mapAt4min: near(r.rows, I + 240).map ?? Number.NaN,
    }, BANDS['S4 no pressor']);
  });

  it('ephedrine 10 mg 20 s after the mean falls below 60', async () => {
    const r = await runCard(ID, [...BASE, { press: 'Ephedrine 10 mg', when: (s) => s.t > I && (s.map ?? 99) < 60, delayS: 20 }], I + 600);
    const e = r.pressed[2] as number;
    bands('S4 ephedrine', {
      refused: r.refused.length, ephedrineS: e - I,
      mapAtDose: near(r.rows, e).map ?? Number.NaN, hrAtDose: near(r.rows, e).hr ?? Number.NaN,
      mapPlus60: near(r.rows, e + 60).map ?? Number.NaN, mapPlus120: near(r.rows, e + 120).map ?? Number.NaN,
      hrPlus120: near(r.rows, e + 120).hr ?? Number.NaN,
      mapOver65S: (first(r.rows, (s) => (s.map ?? 0) >= 65, e)?.t ?? Number.NaN) - e,
      state: r.states.at(-1)?.[1] === 'maintained' ? 1 : 0,
    }, BANDS['S4 ephedrine']);
  });

  it('phenylephrine 100 µg at the same moment (the alternative button)', async () => {
    const r = await runCard(ID, [...BASE, { press: 'Phenylephrine 100 µg', when: (s) => s.t > I && (s.map ?? 99) < 60, delayS: 20 }], I + 600);
    const e = r.pressed[2] as number;
    bands('S4 phenylephrine', {
      refused: r.refused.length, mapPlus60: near(r.rows, e + 60).map ?? Number.NaN, hrPlus60: near(r.rows, e + 60).hr ?? Number.NaN,
      hrMin: range(r.rows, 'hr', e, e + 180).min,
    }, BANDS['S4 phenylephrine']);
  });
});
```

- [ ] **Step 2 — run it red.** Expected: FAIL `no showcase document showcase-induction-premed`.
- [ ] **Step 3 — the card, the bronchospasm category and the Showcase list.**

Create `apps/demo/src/app/showcase/showcase-induction-premed.json`:

```json
{
  "schema": "pme-scenario/1",
  "id": "showcase-induction-premed",
  "title": "Induction after fentanyl and midazolam",
  "category": "Showcase",
  "durationMin": 10,
  "story": "The same fit 40-year-old man as the healthy induction, preoxygenated in the same way (the oxygen stays on until you press “Induce now” at 3:00), given fentanyl 2 µg/kg and midazolam 0.03 mg/kg at 0:10, about three minutes before the same propofol and rocuronium. Breathing slows before induction, the apnoea comes earlier and the pressure falls further: in the healthy induction the mean pressure fell from 95 to 65 mmHg with the heart rate 70–79; here it falls from 90 to 52 with the heart rate 55–62.",
  "objectives": [
    "Acknowledge the respiratory-rate alarm (RR below 8/min, about 75 s after the premedication) within 30 s",
    "Intubate and ventilate within 60 s of the CO₂ apnoea alarm (it sounds about 43 s after induction, 13 s earlier than in the healthy induction)",
    "Give a vasopressor (phenylephrine or ephedrine) within 60 s of the mean arterial pressure falling below 60 mmHg",
    "Mean arterial pressure back above 65 mmHg within 120 s of the vasopressor"
  ],
  "notes": "Showcase case (Stage 11). MODELED: the physiology produces every change; the buttons only give what their label says. Measured course and bands: docs/plans/stage-11-scenarios.md.",
  "seed": 7,
  "mode": "modeled",
  "patient": {
    "ageY": 40,
    "sex": "M",
    "weightKg": 75,
    "heightCm": 178,
    "ageBand": "adult",
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "abp": "connected",
      "co2": "on",
      "temp": "on"
    }
  },
  "initialState": "awake",
  "states": [
    {
      "id": "awake",
      "label": "Awake, preoxygenating: FiO₂ 1.0 by face mask until induction",
      "onEnter": [
        {
          "$comment": "Held until “Induce now” (R50, Q5 ruling): 3600 s is the event’s maximum; the induced state ends it.",
          "type": "applyEvent",
          "event": {
            "kind": "preoxygenate",
            "fio2": 1,
            "durationS": 3600
          }
        }
      ],
      "transitions": [
        {
          "id": "premed",
          "label": "Premedicate: fentanyl 2 µg/kg, midazolam 0.03 mg/kg",
          "to": "premedicated",
          "when": {
            "any": [
              {
                "manual": {
                  "label": "Premedicate: fentanyl 2 µg/kg, midazolam 0.03 mg/kg"
                }
              },
              {
                "afterS": 10
              }
            ]
          }
        }
      ],
      "notes": "The oxygen stays on until “Induce now”; the premedication is given by itself at 0:10."
    },
    {
      "id": "premedicated",
      "label": "Fentanyl 2 µg/kg and midazolam 0.03 mg/kg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "fentanyl",
            "dose": 2,
            "unit": "mcg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "midazolam",
            "dose": 0.03,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "induce",
          "label": "Induce now",
          "to": "induced",
          "when": {
            "manual": {
              "label": "Induce now"
            }
          }
        }
      ],
      "notes": "Induce at 3:00 (“Induce now”), as in the healthy induction; the oxygen stays on until then."
    },
    {
      "id": "induced",
      "label": "Induced: propofol 2 mg/kg, rocuronium 0.6 mg/kg — airway not yet secured",
      "onEnter": [
        {
          "$comment": "Ends the hold: the face mask stays on 45 s, until the breathing has stopped, then comes off (room air; no apnoeic oxygenation through an unsupported airway).",
          "type": "applyEvent",
          "event": {
            "kind": "preoxygenate",
            "fio2": 1,
            "durationS": 45
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "rocuronium",
            "dose": 0.6,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "intubate",
          "label": "Intubate and ventilate",
          "to": "ventilated",
          "when": {
            "manual": {
              "label": "Intubate and ventilate"
            }
          }
        }
      ]
    },
    {
      "id": "ventilated",
      "label": "Intubated and ventilated",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 0.5
          }
        }
      ],
      "transitions": [
        {
          "id": "phenyl",
          "label": "Phenylephrine 100 µg",
          "to": "phenylephrine",
          "when": {
            "manual": {
              "label": "Phenylephrine 100 µg"
            }
          }
        },
        {
          "id": "ephedrine",
          "label": "Ephedrine 10 mg",
          "to": "ephedrine",
          "when": {
            "manual": {
              "label": "Ephedrine 10 mg"
            }
          }
        }
      ]
    },
    {
      "id": "phenylephrine",
      "label": "Phenylephrine 100 µg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "phenylephrine",
            "dose": 100,
            "unit": "mcg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "back",
          "label": "Back to the case",
          "to": "maintained",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "ephedrine",
      "label": "Ephedrine 10 mg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "ephedrine",
            "dose": 10,
            "unit": "mg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "back-ephedrine",
          "label": "Back to the case",
          "to": "maintained",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "maintained",
      "label": "Ventilated: vasopressor given",
      "transitions": [
        {
          "id": "phenyl-maintained",
          "label": "Phenylephrine 100 µg",
          "to": "phenylephrine",
          "when": {
            "manual": {
              "label": "Phenylephrine 100 µg"
            }
          }
        },
        {
          "id": "ephedrine-maintained",
          "label": "Ephedrine 10 mg",
          "to": "ephedrine",
          "when": {
            "manual": {
              "label": "Ephedrine 10 mg"
            }
          }
        }
      ]
    }
  ]
}
```

In `apps/demo/src/app/showcase/showcase-bronchospasm.json`, find:

```json
  "title": "Severe bronchospasm on the ventilator",
  "category": "Showcase",
  "durationMin": 10,
```

Replace with:

```json
  "title": "Severe bronchospasm on the ventilator",
  "category": "Airway and breathing",
  "durationMin": 10,
```

In `apps/demo/src/app/showcase.test.ts`, find:

```ts
['showcase-anaphylaxis', 'showcase-bronchospasm', 'showcase-haemorrhage', 'showcase-induction', 'showcase-tamponade']);
```

Replace with:

```ts
['showcase-anaphylaxis', 'showcase-haemorrhage', 'showcase-induction', 'showcase-induction-premed', 'showcase-tamponade']); // Stage 11
```

- [ ] **Step 4 — run it green.** `vitest run src/app/showcase/s4-premed.slow.test.ts src/app/showcase.test.ts`: 3 + 2
  passed (the bronchospasm case of `showcase.test.ts` finds the card by id and still passes).
- [ ] **Step 5 — commit.** `feat(showcase): S4 induction after premedication; bronchospasm moves to Airway and breathing (Stage 11)`

### Task 5: S1 malignant hyperthermia

**Files** Create `apps/demo/src/app/showcase/s1-mh.slow.test.ts`, `apps/demo/src/app/showcase/showcase-mh.json`; modify
`apps/demo/src/app/showcase.test.ts` (its id line).

- [ ] **Step 1 — the failing test.**

Create `apps/demo/src/app/showcase/s1-mh.slow.test.ts`:

```ts
// Stage 11 S1 (showcase-mh): malignant hyperthermia from the instructor's condition at induction (types-resp.ts
// `{ kind: 'condition', id: 'mh', severity }`, research/24 §P2), run through the card's buttons on the engine —
// treated early (2 min into the early signs), treated late (1 min into the established crisis: the run-sheet path) and
// untreated (VF from hyperthermia). Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, expect, it } from 'vitest';
import { ConsoleModel } from '../../physiology-console/model.ts';
import { labelOf } from '../glossary.ts';
import { bands, entered, first, near, range, runCard, type Act, type Sample } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S1 untreated': { refused: [0, 0], earlyMin: [6.16, 7.54], establishedMin: [16.89, 20.65], etco2AtEstablished: [78, 84], hrAtEstablished: [137, 147], phAtEstablished: [7.06, 7.12], kAtEstablished: [5.4, 6], lactateAtEstablished: [4.1, 5.1], mapAtEstablished: [93, 103], hrMax: [185, 195], kMax: [6.1, 6.7], lossMin: [39.91, 48.79], tcAtLoss: [42.14, 42.54], kAtLoss: [6.1, 6.7], vf: [1, 1], arrestStateMin: [40.23, 49.17] },
  'S1 early': { refused: [0, 0], crisisMin: [7.96, 9.73], pulseLost: [0, 0], recoveringMin: [15.27, 18.67], established: [0, 0], tcMax: [37.81, 38.21], hrMax: [88, 98], kMax: [4.5, 5.1], etco2Plus5: [44, 50], hrPlus15: [80, 90] },
  'S1 late': { refused: [0, 0], crisisMin: [17.79, 21.75], dantroleneMin: [18.69, 22.85], pulseLost: [0, 0], etco2AtCall: [57, 63], tcAtCall: [38.51, 38.91], kAtCall: [5.5, 6.1], phAtCall: [7.16, 7.22], etco2Plus2: [51, 57], tcMax: [39.3, 39.7], tcPeakMin: [28.05, 34.29], kMax: [5.6, 6.2], lactateMax: [6.9, 7.9], recoveringMin: [27.72, 33.88], normoMin: [35.04, 42.82], hrAt60: [86, 96], mapAt60: [107, 117], tcAt60: [38.5, 38.9], etco2At60: [35, 41], phAt60: [7.35, 7.41], kAt60: [3.5, 4.1], sysMaxAfterCall: [153, 163] },
} as const;

const ID = 'showcase-mh';
const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
/** Explore's "Changed only" is read where the presenter opens it: just before the crisis call (19:40). */
const CALL_S = 1180;
/** The rows the run sheet points at in Explore with "Changed only" on (group:label:direction, baseline at 1:00). */
const EXPLORE_AT_CALL = [
  'monitor:HR:up', 'monitor:ART M:up', 'monitor:EtCO₂:up', 'monitor:T1:up', 'monitor:awRR:up',
  'circulation:CO:up', 'circulation:SV:down', 'circulation:SVR:up', 'circulation:LVEF:down', 'circulation:Myocardial O2 supply/demand:down',
  'blood:pH:down', 'blood:PCO₂:up', 'blood:BE:down', 'blood:Lactate:up', 'blood:K⁺:up', 'blood:Tcore:up', 'blood:VO₂:up', 'blood:SvO₂:down',
  'endocrine:MH activity:up', 'endocrine:Epinephrine:up', 'endocrine:Norepinephrine:up', 'brain:CMRO₂:up',
];
const SURGERY = { press: 'Start surgery: rocuronium 0.6 mg/kg', t: 240 };
const inCrisis = (s: Sample) => ['triggerOff', 'treating', 'recovering'].includes(s.state);
const checklist = (from: (s: Sample) => boolean, delayS: number): Act[] => [
  { press: CRISIS, when: from, delayS },
  { press: 'Dantrolene 2.5 mg/kg', when: (s) => s.state === 'triggerOff', delayS: 60 },
  { press: 'Cool: 2 L saline at room temperature', when: inCrisis, delayS: 90 },
  { press: 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', when: inCrisis, delayS: 120 },
  { press: 'Sodium bicarbonate 1 mmol/kg', when: inCrisis, delayS: 150 },
  { press: 'Dantrolene 2.5 mg/kg', when: inCrisis, delayS: 600 },
  { press: 'EtCO₂ normal: ventilation back to 12 × 500', when: (s) => s.state === 'recovering' && (s.etco2 ?? 99) < 38 },
];
/** Explore's "Changed only" rows (baseline at 1 min, as the app sets it) at `atS`, by organ group. */
function explore(atS: number): { listen: (e: Parameters<ConsoleModel['ingest']>[0]) => void; rows: () => string[] } {
  const m = new ConsoleModel();
  let snap: string[] = [];
  return {
    listen: (e) => {
      m.ingest(e);
      if (m.baseT === null && m.t >= 60) m.setBaseline();
      if (snap.length === 0 && m.t >= atS) snap = m.rows().filter((r) => r.dir && !r.internal && labelOf(r.path) !== null && typeof r.value !== 'object').map((r) => `${r.group}:${labelOf(r.path) ?? ''}:${r.dir}`);
    },
    rows: () => snap,
  };
}

describe('S1 malignant hyperthermia (showcase-mh)', { timeout: 1_800_000 }, () => {
  it('untreated: early signs, established crisis, VF from hyperthermia', async () => {
    const r = await runCard(ID, [SURGERY], 3000);
    const loss = first(r.rows, (s) => !s.pulse);
    const est = entered(r, 'established');
    bands('S1 untreated', {
      refused: r.refused.length,
      earlyMin: entered(r, 'earlySigns') / 60, establishedMin: est / 60,
      etco2AtEstablished: near(r.rows, est).etco2 ?? Number.NaN, hrAtEstablished: near(r.rows, est).hr ?? Number.NaN,
      phAtEstablished: near(r.rows, est).ph, kAtEstablished: near(r.rows, est).k, lactateAtEstablished: near(r.rows, est).lactate,
      mapAtEstablished: near(r.rows, est).map ?? Number.NaN,
      hrMax: range(r.rows, 'hr', 0, (loss?.t ?? 3000) - 5).max, kMax: range(r.rows, 'k', 0, (loss?.t ?? 3000) - 5).max,
      lossMin: (loss?.t ?? Number.NaN) / 60, tcAtLoss: loss?.tc ?? Number.NaN, kAtLoss: loss?.k ?? Number.NaN,
      vf: loss && /^vf/.test(near(r.rows, loss.t + 5).rhythm) ? 1 : 0,
      arrestStateMin: entered(r, 'arrest') / 60,
    }, BANDS['S1 untreated']);
  });

  it('treated early: crisis 2 min into the early signs', async () => {
    const r = await runCard(ID, [SURGERY, ...checklist((s) => s.state === 'earlySigns', 120)], 2400);
    const c = r.pressed[1] as number;
    bands('S1 early', {
      refused: r.refused.length, crisisMin: c / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      recoveringMin: entered(r, 'recovering') / 60, established: Number.isNaN(entered(r, 'established')) ? 0 : 1,
      tcMax: range(r.rows, 'tc', 0, 2400).max, hrMax: range(r.rows, 'hr', 0, 2400).max, kMax: range(r.rows, 'k', 0, 2400).max,
      etco2Plus5: near(r.rows, c + 300).etco2 ?? Number.NaN, hrPlus15: near(r.rows, c + 900).hr ?? Number.NaN,
    }, BANDS['S1 early']);
  });

  it('treated late (the run-sheet path): crisis 1 min into the established crisis; Explore "Changed only" at the call', async () => {
    const x = explore(CALL_S);
    const r = await runCard(ID, [SURGERY, ...checklist((s) => s.state === 'established', 60)], 3600, x.listen);
    const c = r.pressed[1] as number;
    const d1 = r.pressed[2] as number;
    bands('S1 late', {
      refused: r.refused.length, crisisMin: c / 60, dantroleneMin: d1 / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      etco2AtCall: near(r.rows, c).etco2 ?? Number.NaN, tcAtCall: near(r.rows, c).tc, kAtCall: near(r.rows, c).k, phAtCall: near(r.rows, c).ph,
      etco2Plus2: near(r.rows, c + 120).etco2 ?? Number.NaN,
      tcMax: range(r.rows, 'tc', c, 3600).max,
      tcPeakMin: (r.rows.filter((s) => s.t >= c).reduce((b, s) => (s.tc > b.tc ? s : b)).t) / 60,
      kMax: range(r.rows, 'k', c, 3600).max, lactateMax: range(r.rows, 'lactate', c, 3600).max,
      recoveringMin: entered(r, 'recovering') / 60, normoMin: entered(r, 'normoventilated') / 60,
      hrAt60: near(r.rows, 3599).hr ?? Number.NaN, mapAt60: near(r.rows, 3599).map ?? Number.NaN, tcAt60: near(r.rows, 3599).tc,
      etco2At60: near(r.rows, 3599).etco2 ?? Number.NaN, phAt60: near(r.rows, 3599).ph, kAt60: near(r.rows, 3599).k,
      sysMaxAfterCall: range(r.rows, 'sys', c, 3600).max,
    }, BANDS['S1 late']);
    if (process.env.PME_SHOWCASE_PRINT) console.log(`S1 explore at ${CALL_S} s: ${x.rows().join(' | ')}`);
    for (const row of EXPLORE_AT_CALL) expect(x.rows(), row).toContain(row);
  });
});
```

- [ ] **Step 2 — run it red.** Expected: FAIL `no showcase document showcase-mh`.
- [ ] **Step 3 — the card and the Showcase list.**

Create `apps/demo/src/app/showcase/showcase-mh.json`:

```json
{
  "schema": "pme-scenario/1",
  "id": "showcase-mh",
  "title": "Malignant hyperthermia",
  "category": "Showcase",
  "durationMin": 40,
  "story": "A fit 35-year-old man, induced with propofol and succinylcholine and maintained on sevoflurane 2 %. The jaw is stiff after the succinylcholine. Minutes into surgery the EtCO₂ climbs at the same ventilation and the heart rate rises; untreated, the core temperature passes 38.5 °C about 19 minutes after induction and he arrests in VF at 42 °C about 45 minutes after induction. Run the MH crisis: trigger off, oxygen, hyperventilation, dantrolene, cooling and the potassium.",
  "objectives": [
    "Call the MH crisis (stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate) within 120 s of the early signs (EtCO₂ above 45 mmHg at the same ventilation)",
    "Give dantrolene 2.5 mg/kg within 300 s of calling the crisis",
    "Repeat dantrolene 2.5 mg/kg within 600 s of the first dose while EtCO₂ is still above 45 mmHg",
    "Treat the potassium (calcium chloride, insulin with dextrose) within 300 s of K⁺ rising above 5.5 mmol/L",
    "Bring the ventilation back to 12 × 500 within 300 s of EtCO₂ falling below 40 mmHg"
  ],
  "notes": "Showcase case (Stage 11). MODELED: the physiology produces every change; the buttons only give what their label says. Measured course and bands: docs/plans/stage-11-scenarios.md.",
  "seed": 7,
  "mode": "modeled",
  "patient": {
    "ageY": 35,
    "sex": "M",
    "weightKg": 80,
    "heightCm": 180,
    "ageBand": "adult",
    "sensors": {
      "ecg": "on",
      "spo2": "on",
      "nibp": "on",
      "abp": "connected",
      "co2": "on",
      "temp": "on"
    }
  },
  "initialState": "induction",
  "states": [
    {
      "id": "induction",
      "label": "Induced: propofol, succinylcholine 1.5 mg/kg (masseter rigidity), intubated; sevoflurane 2 %",
      "notes": "Say it: the jaw is hard to open after the succinylcholine (masseter rigidity). The monitor cannot show it.",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "propofol",
            "dose": 2,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "succinylcholine",
            "dose": 1.5,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "airwayDevice",
            "device": "ett"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 0.5
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 2,
            "fgfLpm": 2
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "condition",
            "id": "mh",
            "severity": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "surgery",
          "label": "Start surgery: rocuronium 0.6 mg/kg",
          "to": "surgery",
          "when": {
            "manual": {
              "label": "Start surgery: rocuronium 0.6 mg/kg"
            }
          }
        },
        {
          "id": "crisis",
          "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate",
          "to": "triggerOff",
          "when": {
            "manual": {
              "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate"
            }
          }
        }
      ]
    },
    {
      "id": "surgery",
      "label": "Surgery under way: sevoflurane 2 %, rocuronium",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "rocuronium",
            "dose": 0.6,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "crisis-surgery",
          "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate",
          "to": "triggerOff",
          "when": {
            "manual": {
              "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate"
            }
          }
        },
        {
          "id": "early",
          "label": "EtCO₂ above 45 at the same ventilation",
          "to": "earlySigns",
          "when": {
            "vital": {
              "var": "etco2",
              "op": ">",
              "value": 45,
              "forS": 20
            }
          }
        }
      ]
    },
    {
      "id": "earlySigns",
      "label": "Early signs: EtCO₂ rising at the same ventilation, tachycardia",
      "transitions": [
        {
          "id": "crisis-earlySigns",
          "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate",
          "to": "triggerOff",
          "when": {
            "manual": {
              "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate"
            }
          }
        },
        {
          "id": "established",
          "label": "Core temperature above 38.5 °C",
          "to": "established",
          "when": {
            "vital": {
              "var": "tempCore",
              "op": ">",
              "value": 38.5,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "established",
      "label": "Established MH: hyperthermia, acidosis, rising potassium",
      "transitions": [
        {
          "id": "crisis-established",
          "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate",
          "to": "triggerOff",
          "when": {
            "manual": {
              "label": "MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate"
            }
          }
        },
        {
          "id": "arrest",
          "label": "No pulse",
          "to": "arrest",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "triggerOff",
      "label": "Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min, ventilation 20 × 600",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "vaporiser",
            "agent": "sevoflurane",
            "dialPct": 0,
            "fgfLpm": 10
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 20,
            "vtMl": 600,
            "peep": 5,
            "fio2": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "dant",
          "label": "Dantrolene 2.5 mg/kg",
          "to": "dantrolene",
          "when": {
            "manual": {
              "label": "Dantrolene 2.5 mg/kg"
            }
          }
        },
        {
          "id": "cool",
          "label": "Cool: 2 L saline at room temperature",
          "to": "cooling",
          "when": {
            "manual": {
              "label": "Cool: 2 L saline at room temperature"
            }
          }
        },
        {
          "id": "kTreat",
          "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose",
          "to": "potassium",
          "when": {
            "manual": {
              "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose"
            }
          }
        },
        {
          "id": "bicarb",
          "label": "Sodium bicarbonate 1 mmol/kg",
          "to": "bicarbonate",
          "when": {
            "manual": {
              "label": "Sodium bicarbonate 1 mmol/kg"
            }
          }
        },
        {
          "id": "arrest-triggerOff",
          "label": "No pulse",
          "to": "arrest",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "treating",
      "label": "MH treatment under way",
      "transitions": [
        {
          "id": "dant-treating",
          "label": "Dantrolene 2.5 mg/kg",
          "to": "dantrolene",
          "when": {
            "manual": {
              "label": "Dantrolene 2.5 mg/kg"
            }
          }
        },
        {
          "id": "cool-treating",
          "label": "Cool: 2 L saline at room temperature",
          "to": "cooling",
          "when": {
            "manual": {
              "label": "Cool: 2 L saline at room temperature"
            }
          }
        },
        {
          "id": "kTreat-treating",
          "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose",
          "to": "potassium",
          "when": {
            "manual": {
              "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose"
            }
          }
        },
        {
          "id": "bicarb-treating",
          "label": "Sodium bicarbonate 1 mmol/kg",
          "to": "bicarbonate",
          "when": {
            "manual": {
              "label": "Sodium bicarbonate 1 mmol/kg"
            }
          }
        },
        {
          "id": "recover",
          "label": "EtCO₂ below 45 for a minute",
          "to": "recovering",
          "when": {
            "vital": {
              "var": "etco2",
              "op": "<",
              "value": 45,
              "forS": 60
            }
          }
        },
        {
          "id": "arrest-treating",
          "label": "No pulse",
          "to": "arrest",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "dantrolene",
      "label": "Dantrolene 2.5 mg/kg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "dantrolene",
            "dose": 2.5,
            "unit": "mg/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "back",
          "label": "Back to the crisis checklist",
          "to": "treating",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "cooling",
      "label": "Cooling: 2 L saline at room temperature running",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "fluid",
            "fluid": "saline",
            "volumeMl": 2000,
            "overS": 900
          }
        }
      ],
      "transitions": [
        {
          "id": "back-cooling",
          "label": "Back to the crisis checklist",
          "to": "treating",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "potassium",
      "label": "Calcium chloride 10 mg/kg and insulin 10 U with dextrose given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "calciumChloride",
            "dose": 10,
            "unit": "mg/kg",
            "route": "iv"
          }
        },
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "insulinDextrose",
            "dose": 10,
            "unit": "units",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "back-potassium",
          "label": "Back to the crisis checklist",
          "to": "treating",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "bicarbonate",
      "label": "Sodium bicarbonate 1 mmol/kg given",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "drug",
            "drugId": "sodiumBicarbonate",
            "dose": 1,
            "unit": "mmol/kg",
            "route": "iv"
          }
        }
      ],
      "transitions": [
        {
          "id": "back-bicarbonate",
          "label": "Back to the crisis checklist",
          "to": "treating",
          "when": {
            "afterS": 2
          }
        }
      ]
    },
    {
      "id": "recovering",
      "label": "Recovering: EtCO₂ below 45",
      "transitions": [
        {
          "id": "dant-recovering",
          "label": "Dantrolene 2.5 mg/kg",
          "to": "dantrolene",
          "when": {
            "manual": {
              "label": "Dantrolene 2.5 mg/kg"
            }
          }
        },
        {
          "id": "cool-recovering",
          "label": "Cool: 2 L saline at room temperature",
          "to": "cooling",
          "when": {
            "manual": {
              "label": "Cool: 2 L saline at room temperature"
            }
          }
        },
        {
          "id": "kTreat-recovering",
          "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose",
          "to": "potassium",
          "when": {
            "manual": {
              "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose"
            }
          }
        },
        {
          "id": "bicarb-recovering",
          "label": "Sodium bicarbonate 1 mmol/kg",
          "to": "bicarbonate",
          "when": {
            "manual": {
              "label": "Sodium bicarbonate 1 mmol/kg"
            }
          }
        },
        {
          "id": "normo",
          "label": "EtCO₂ normal: ventilation back to 12 × 500",
          "to": "normoventilated",
          "when": {
            "manual": {
              "label": "EtCO₂ normal: ventilation back to 12 × 500"
            }
          }
        },
        {
          "id": "arrest-recovering",
          "label": "No pulse",
          "to": "arrest",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "normoventilated",
      "label": "Ventilation back to 12 × 500, O₂ 100 %",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "ventilation",
            "source": "ventilator",
            "rr": 12,
            "vtMl": 500,
            "peep": 5,
            "fio2": 1
          }
        }
      ],
      "transitions": [
        {
          "id": "dant-normoventilated",
          "label": "Dantrolene 2.5 mg/kg",
          "to": "dantrolene",
          "when": {
            "manual": {
              "label": "Dantrolene 2.5 mg/kg"
            }
          }
        },
        {
          "id": "cool-normoventilated",
          "label": "Cool: 2 L saline at room temperature",
          "to": "cooling",
          "when": {
            "manual": {
              "label": "Cool: 2 L saline at room temperature"
            }
          }
        },
        {
          "id": "kTreat-normoventilated",
          "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose",
          "to": "potassium",
          "when": {
            "manual": {
              "label": "Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose"
            }
          }
        },
        {
          "id": "bicarb-normoventilated",
          "label": "Sodium bicarbonate 1 mmol/kg",
          "to": "bicarbonate",
          "when": {
            "manual": {
              "label": "Sodium bicarbonate 1 mmol/kg"
            }
          }
        },
        {
          "id": "arrest-normoventilated",
          "label": "No pulse",
          "to": "arrest",
          "when": {
            "vital": {
              "var": "sbp",
              "op": "<",
              "value": 25,
              "forS": 10
            }
          }
        }
      ]
    },
    {
      "id": "arrest",
      "label": "Cardiac arrest",
      "transitions": [
        {
          "id": "cpr",
          "label": "Start CPR",
          "to": "cpr",
          "when": {
            "manual": {
              "label": "Start CPR"
            }
          }
        }
      ]
    },
    {
      "id": "cpr",
      "label": "CPR (defibrillate VF from the Devices tab)",
      "onEnter": [
        {
          "type": "applyEvent",
          "event": {
            "kind": "cpr",
            "active": true,
            "rate": 110,
            "quality": 0.8
          }
        }
      ]
    }
  ]
}
```

In `apps/demo/src/app/showcase.test.ts`, find:

```ts
['showcase-anaphylaxis', 'showcase-haemorrhage', 'showcase-induction', 'showcase-induction-premed', 'showcase-tamponade']); // Stage 11
```

Replace with:

```ts
['showcase-anaphylaxis', 'showcase-haemorrhage', 'showcase-induction', 'showcase-induction-premed', 'showcase-mh', 'showcase-tamponade']); // Stage 11
```

- [ ] **Step 4 — run it green.** `vitest run src/app/showcase/s1-mh.slow.test.ts src/app/showcase.test.ts`: 3 + 2
  passed (S1 alone ≈ 85 s; it runs 60 sim-min three times).
- [ ] **Step 5 — commit.** `feat(showcase): S1 malignant hyperthermia, with the Explore changed-only set pinned (Stage 11)`

### Task 6: the Showcase order and the card-content test

**Files** Create `apps/demo/src/app/showcase/showcase-cards.test.ts`; modify `apps/demo/src/app/scenarios.ts`.

- [ ] **Step 1 — the failing test.**

Create `apps/demo/src/app/showcase/showcase-cards.test.ts`:

```ts
// Stage 11: the Showcase cards as content — every document is valid, every button's commands are accepted by an engine
// built from the card's own patient, every state can be reached from the start, the card fields read like a case, the
// objectives are checkable (a number or a time in each), and the library lists the Showcase cards in the demonstration
// order. The physiology of each card is in the *.slow.test.ts files beside this one (PME_TEST_SET=showcase).
import { createEngine, type Command } from '@pme/engine-core';
import { engineOptionsOf, validateScenario, type DocCommand, type ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY, SHOWCASE_ORDER } from '../scenarios.ts';
import { SHOWCASE_IDS, showcaseDoc } from './harness.ts';

const SHOWCASE = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-tamponade', 'showcase-haemorrhage'];
const NEW = ['showcase-induction', 'showcase-induction-premed', 'showcase-mh', 'showcase-tamponade'];

describe('Stage 11 Showcase cards', () => {
  it('the Showcase group is the six cards, in the demonstration order, first in the library; bronchospasm stays in the library', () => {
    expect(SHOWCASE_ORDER).toEqual(SHOWCASE);
    expect(LIBRARY.filter((c) => c.category === 'Showcase').map((c) => c.id)).toEqual(SHOWCASE);
    expect(LIBRARY.slice(0, SHOWCASE.length).map((c) => c.id)).toEqual(SHOWCASE);
    expect(LIBRARY.find((c) => c.id === 'showcase-bronchospasm')?.category).toBe('Airway and breathing');
  });

  it.each(SHOWCASE_IDS)('%s: valid, every state reachable, every command accepted by an engine of its own patient', (id) => {
    const doc = showcaseDoc(id);
    const v = validateScenario(doc);
    expect(v.ok ? [] : v.errors).toEqual([]);
    const seen = new Set([doc.initialState]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const s of doc.states) if (seen.has(s.id)) for (const t of s.transitions ?? []) if (!seen.has(t.to)) (seen.add(t.to), (grew = true));
    }
    expect(doc.states.map((s) => s.id).filter((s) => !seen.has(s)), 'unreachable states').toEqual([]);
    const eo = engineOptionsOf(doc, 7);
    const e = createEngine({ ...eo, mode: doc.mode ?? 'modeled', patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
    const cmds: DocCommand[] = doc.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);
    for (const [i, c] of cmds.entries()) {
      const r = e.dispatch({ id: `${id}-${i}`, issuedBy: 'test', ...(c as object) } as Command);
      expect(r.accepted, `${JSON.stringify(c)}: ${r.reason}`).toBe(true);
    }
  });

  it.each(NEW)('%s: a case card — story, measurable objectives, every state labelled, every button labelled once per state', (id) => {
    const doc: ScenarioDoc = showcaseDoc(id);
    expect(doc.category).toBe('Showcase');
    expect(doc.mode).toBe('modeled');
    expect(doc.title).not.toMatch(/^\[draft\]/i);
    expect(doc.story?.length ?? 0).toBeGreaterThan(120);
    expect(doc.objectives?.length ?? 0).toBeGreaterThanOrEqual(3);
    for (const o of doc.objectives ?? []) expect(o, `objective without a number: ${o}`).toMatch(/\d/);
    for (const s of doc.states) {
      expect(s.label?.length ?? 0, s.id).toBeGreaterThan(5);
      const manual = (s.transitions ?? []).flatMap((t) => ('manual' in t.when ? [t.when.manual.label] : 'any' in t.when ? t.when.any.flatMap((w) => ('manual' in w ? [w.manual.label] : [])) : []));
      expect(new Set(manual).size, `${s.id}: a button label twice`).toBe(manual.length);
    }
  });
});
```

- [ ] **Step 2 — run it red.** Expected: FAIL — `SHOWCASE_ORDER` is not exported from `scenarios.ts`.
- [ ] **Step 3 — the order.**

In `apps/demo/src/app/scenarios.ts`, find:

```ts

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
```

Replace with:

```ts

/** Stage 11: the Showcase cards in the order of the demonstration's run sheet; every other group sorts by title. */
export const SHOWCASE_ORDER: readonly string[] = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-tamponade', 'showcase-haemorrhage'];

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
```

In `apps/demo/src/app/scenarios.ts`, find:

```ts
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => rank(a.category) - rank(b.category) || a.title.localeCompare(b.title));
```

Replace with:

```ts
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => rank(a.category) - rank(b.category) || SHOWCASE_ORDER.indexOf(a.id) - SHOWCASE_ORDER.indexOf(b.id) || a.title.localeCompare(b.title));
```

- [ ] **Step 4 — run it green.** `vitest run src/app/showcase/showcase-cards.test.ts src/app/showcase.test.ts`: 12 + 2
  passed (1 order case + 7 documents + 4 new cards). Then the whole fast set: `PME_TEST_SET=fast npx -y pnpm@9.15.9 exec
  vitest run` (all green).
- [ ] **Step 5 — commit.** `feat(showcase): the Showcase group in the demonstration's order; card-content checks (Stage 11)`

### Task 7: the kit's scripts follow the six cards (Q12 ruling; review C1)

**Files** Replace `scripts/showcase/rehearsal.showcase.ts`; modify `scripts/showcase/sound.showcase.ts`,
`scripts/showcase/make-videos.mjs`. Declared outside FU-11's partition by the Q12 ruling (no pending branch touches
them; FU-7.1 b's gate runs the old scripts before this stage merges).

The rehearsal keeps its form (fresh page → Scenario tab → Showcase filter → Load → ×4 → the card's own buttons, smoke
checks with generous windows, JSON results and screenshots) and now runs the run sheets above: healthy induction (prompt
path; and the unsecured branch rescued by bag-mask), induction after premedication (ephedrine), anaphylaxis, MH (the
full course at ×4: 10 min of wall time), the stab wound (CPR → pericardiocentesis → stop CPR 2 min later, the pulse must
hold), haemorrhage, and the second-scenario clock check (now loading the stab-wound card). Every `step` also writes a
run-sheet row (scenario clock, monitor, presenter action) to `docs/showcase/results/run-sheet-<case>-<browser>.md`, which
the gate gathers. Bronchospasm is no longer rehearsed (it left the Showcase group; Stage 10 still loads it by id).

- [ ] **Step 1 — the scripts.**

Replace the whole of `scripts/showcase/rehearsal.showcase.ts` with:

```ts
// Proof (b): the six-card rehearsal (Stage 11) against the BUILT kit served by its PERL server, on WebKit and Chromium
// at 1440×900. Each case: a fresh page load at #/teach → Scenario tab → Showcase filter → Load → ×4 → the card's own
// buttons at the run sheet's clock times (docs/plans/stage-11-scenarios.md, "Run sheets"). Assertions are smoke checks
// with generous windows (directions and floors, never calibration bands: those are the Vitest scenario tests in
// apps/demo/src/app/showcase/*.slow.test.ts). Every observed number and every visible label is written to
// docs/showcase/results/ — the JSON as before, and one run-sheet table per case and browser (clock, monitor, presenter
// action) that the Stage 11 gate gathers into docs/gates/stage-11/run-sheet-numbers.md.
// The DEFAULT monitor (Saadat-style) is used throughout; it shows a CO2 tile, read from the DOM.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { alarms, barClock, co2Tile, hist, latest, loadShowcase, maxOf, meanOf, minOf, openTeach, OUT, r1, record, runText, save, shot, simNow, stateId, waitSim, waitUntilSim, watchConsole } from './showcase-support.ts';

type Row = { clock: string; monitor: string; presenter: string };
type Result = { case: string; browser: string; server: string; base: string; t0: number; steps: Array<Record<string, unknown>>; sheet: Row[]; labels: Record<string, string>; checks: Array<{ what: string; expected: string; observed: unknown; pass: boolean }>; errors: string[] };

function begin(name: string, browser: string): Result {
  return { case: name, browser, server: process.env.SHOWCASE_SERVER ?? '', base: process.env.SHOWCASE_BASE ?? '', t0: 0, steps: [], sheet: [], labels: {}, checks: [], errors: [] };
}
function check(r: Result, what: string, expected: string, observed: unknown, pass: boolean): void {
  r.checks.push({ what, expected, observed, pass });
  expect.soft(pass, `${what}: expected ${expected}, observed ${JSON.stringify(observed)}`).toBe(true);
}
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** One run-sheet row: the scenario clock, what the monitor shows, and what the presenter did or says there. */
async function step(r: Result, page: Page, what: string, extra: Record<string, unknown> = {}): Promise<void> {
  const v = await latest(page);
  const simT = await simNow(page);
  const state = await stateId(page);
  r.steps.push({ simT: r1(simT), what, state, hr: r1(v.hr), art: `${r1(v.abpSys)}/${r1(v.abpDia)} (${r1(v.abpMean)})`, spo2: r1(v.spo2), etco2: r1(v.etco2), rr: r1(v.rr), ...extra });
  const n = (x: number | null | undefined) => (typeof x === 'number' ? Math.round(x) : '–');
  r.sheet.push({ clock: mmss(simT - r.t0), monitor: `HR ${n(v.hr)}, ART ${n(v.abpSys)}/${n(v.abpDia)} (${n(v.abpMean)}), SpO2 ${n(v.spo2)}, EtCO2 ${n(v.etco2)}, RR ${n(v.rr)} · state ${state}`, presenter: what });
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Press a card button and record the row (the presenter column is the button's label). The name is matched EXACTLY:
 *  the panel's state list renders every other state as a "Jump to <label>" button, and a state label can contain a
 *  button's label ("Ephedrine 10 mg given", "Dantrolene 2.5 mg/kg given"), which a substring match would click. */
async function press(r: Result, page: Page, label: string): Promise<number> {
  await page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: label, exact: true }).click();
  const t = await simNow(page);
  await page.waitForTimeout(800);
  r.labels[`after ${label}`] = await runText(page);
  await step(r, page, `press **${label}**`);
  return t;
}
const until = (page: Page, maxSimS: number, id: string) => waitSim(page, maxSimS, async () => (await stateId(page)) === id);

async function start(page: Page, r: Result, title: string): Promise<number> {
  const errs = watchConsole(page);
  r.errors = errs;
  await openTeach(page);
  Object.assign(r.labels, await loadShowcase(page, title));
  await record(page);
  const t = await simNow(page);
  r.t0 = t;
  await step(r, page, `loaded "${title}" at ×4`);
  return t;
}
async function finish(page: Page, r: Result, browser: string): Promise<void> {
  r.labels.finalRun = await runText(page).catch(() => '');
  await shot(page, `${slug(r.case)}-${browser}`);
  r.steps.push({ alarmsRaised: (await alarms(page)).map((a) => `${r1(a.t - r.t0)} s ${a.text}`).slice(0, 40) });
  check(r, 'no console error or page error', 'none', r.errors.slice(0, 5), r.errors.length === 0);
  save(`rehearsal-${slug(r.case)}-${browser}.json`, r);
  const md = [`### ${r.case} (${browser})`, '', '| Clock | Monitor | Presenter |', '|---|---|---|', ...r.sheet.map((x) => `| ${x.clock} | ${x.monitor} | ${x.presenter} |`),
    '', `Alarms raised (scenario clock): ${(await alarms(page)).slice(0, 25).map((a) => `${mmss(a.t - r.t0)} ${a.text}`).join(' · ') || 'none'}`,
    '', `Checks: ${r.checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.what} (${JSON.stringify(c.observed)})`).join(' · ')}`, ''];
  writeFileSync(join(OUT, 'results', `run-sheet-${slug(r.case)}-${browser}.md`), md.join('\n'));
}

test('Healthy induction', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Healthy induction', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 30);
    r.labels.co2TileAwake = (await co2Tile(page)).text;
    const baseMap = meanOf(await hist(page, t0 + 15, t0 + 30), 'abpMean');
    await waitUntilSim(page, t0 + 180);
    await step(r, page, '3 min of preoxygenation (FiO2 1.0 held until induction)', { baselineMap: r1(baseMap) });
    const tInd = await press(r, page, 'Induce now');
    await waitSim(page, 120, async () => (await alarms(page)).some((x) => x.t > tInd && /apn/i.test(x.text)));
    const apnAlarm = (await alarms(page)).find((x) => x.t > tInd && /apn/i.test(x.text));
    await step(r, page, 'apnoea alarm', { apnoeaAlarm: apnAlarm?.text ?? null, co2Tile: (await co2Tile(page)).text });
    check(r, 'apnoea alarm after "Induce now"', 'within 75 s sim', apnAlarm ? `${r1(apnAlarm.t - tInd)} s "${apnAlarm.text}"` : 'none within 120 s', !!apnAlarm && apnAlarm.t - tInd <= 75);
    await waitUntilSim(page, tInd + 90);
    const tInt = await press(r, page, 'Intubate and ventilate');
    const tCo2 = await waitSim(page, 90, async () => ((await co2Tile(page)).value ?? 0) > 25);
    await step(r, page, 'EtCO2 back on the CO2 tile', { co2Tile: (await co2Tile(page)).text });
    check(r, 'EtCO2 on the CO2 tile after "Intubate and ventilate"', '> 25 mmHg within 90 s', tCo2 === null ? 'not within 90 s' : `${r1(tCo2 - tInt)} s`, tCo2 !== null);
    await waitUntilSim(page, tInd + 240);
    const nadir = minOf(await hist(page, tInd, tInd + 240), 'abpMean');
    await step(r, page, '4 min after induction', { mapNadir: r1(nadir) });
    check(r, 'arterial mean falls after induction', '≥ 10 mmHg below baseline', `${r1(baseMap)} → nadir ${r1(nadir)}`, baseMap !== null && nadir !== null && baseMap - nadir >= 10);
    await waitUntilSim(page, t0 + 480);
    await step(r, page, 'end (8:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Healthy induction, airway not secured, rescued', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Healthy induction, airway not secured, rescued', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 180);
    const tInd = await press(r, page, 'Induce now');
    const tDesat = await until(page, 720, 'desaturating');
    await step(r, page, 'state "SpO₂ below 90 %" (nothing pressed)');
    check(r, 'desaturation after induction with nothing done', 'state desaturating 6–11 min after induction', tDesat === null ? 'never' : `${r1((tDesat - tInd) / 60)} min`, tDesat !== null && tDesat - tInd >= 360 && tDesat - tInd <= 660);
    const tBrady = await until(page, 300, 'bradycardic');
    await step(r, page, 'state "SpO₂ below 60 %: hypoxic bradycardia"');
    check(r, 'hypoxic bradycardia follows', 'state bradycardic within 3 min of the desaturation', tBrady === null ? 'never' : `${r1((tBrady - (tDesat ?? 0)) / 60)} min`, tBrady !== null);
    await waitUntilSim(page, (tBrady ?? (await simNow(page))) + 10);
    const tBvm = await press(r, page, 'Bag-mask ventilate, FiO₂ 1.0');
    const t90 = await waitSim(page, 120, (_n, v) => typeof v.spo2 === 'number' && v.spo2 >= 90);
    await step(r, page, 'SpO2 back to 90 %');
    check(r, 'SpO2 recovers after bag-mask ventilation', '≥ 90 within 120 s', t90 === null ? 'not within 120 s' : `${r1(t90 - tBvm)} s`, t90 !== null);
    await waitUntilSim(page, tBvm + 60);
    await press(r, page, 'Intubate and ventilate, FiO₂ 1.0');
    await waitUntilSim(page, t0 + 900);
    const v = await latest(page);
    await step(r, page, 'end (15:00)');
    check(r, 'rescued: a pulse and a saturation at 15:00', 'HR ≥ 60 and SpO2 ≥ 90', `HR ${r1(v.hr)}, SpO2 ${r1(v.spo2)}`, (v.hr ?? 0) >= 60 && (v.spo2 ?? 0) >= 90);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Induction after fentanyl and midazolam', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Induction after fentanyl and midazolam', browserName);
  try {
    const t0 = await start(page, r, 'Induction after fentanyl and midazolam');
    const tPre = await until(page, 60, 'premedicated');
    await step(r, page, 'premedication given by itself (fentanyl 2 µg/kg, midazolam 0.03 mg/kg)');
    check(r, 'the premedication starts by itself', 'state premedicated within 30 s of load', tPre === null ? 'never' : `${r1(tPre - t0)} s`, tPre !== null && tPre - t0 <= 30);
    await waitUntilSim(page, t0 + 120);
    await step(r, page, '2:00 — breathing slows');
    await waitUntilSim(page, t0 + 180);
    const tInd = await press(r, page, 'Induce now');
    await waitUntilSim(page, tInd + 90);
    await press(r, page, 'Intubate and ventilate');
    const tLow = await waitSim(page, 180, (_n, x) => typeof x.abpMean === 'number' && x.abpMean < 60);
    await step(r, page, 'mean arterial pressure below 60');
    check(r, 'the mean falls below 60 after the premedicated induction', 'within 3 min of intubation', tLow === null ? 'not within 180 s' : `${r1(tLow - tInd)} s after induction`, tLow !== null);
    if (tLow === null) return;
    await waitUntilSim(page, tLow + 20);
    const tE = await press(r, page, 'Ephedrine 10 mg');
    const t65 = await waitSim(page, 240, (_n, x) => typeof x.abpMean === 'number' && x.abpMean >= 65);
    await step(r, page, 'mean arterial pressure back to 65');
    check(r, 'the mean recovers after ephedrine', '≥ 65 within 4 min', t65 === null ? 'not within 240 s' : `${r1(t65 - tE)} s`, t65 !== null);
    await waitUntilSim(page, t0 + 480);
    await step(r, page, 'end (8:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Anaphylaxis under anaesthesia', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Anaphylaxis under anaesthesia', browserName);
  try {
    await start(page, r, 'Anaphylaxis under anaesthesia');
    const tA = await until(page, 120, 'anaphylaxis');
    await step(r, page, 'reaction started (automatically, 60 s after load)');
    r.labels.afterReaction = await runText(page);
    check(r, 'the reaction starts by itself', 'state "Anaphylaxis" within 120 s', tA === null ? 'no' : 'yes', tA !== null);
    if (tA === null) return;
    await waitUntilSim(page, tA + 118);
    const hrWin = maxOf(await hist(page, tA + 100, tA + 118), 'hr');
    await step(r, page, '≈ 2 min into the reaction', { hrMax100to118: r1(hrWin) });
    check(r, 'HR about 2 min into the Anaphylaxis state', '> 120', r1(hrWin), hrWin !== null && hrWin > 120);
    const tE = await press(r, page, 'Give epinephrine 100 µg');
    const tUp = await waitSim(page, 90, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 110);
    await step(r, page, 'systolic above 110');
    check(r, 'systolic after epinephrine', '> 110 within 60 s sim', tUp === null ? `not within 90 s (latest ${r1((await latest(page)).abpSys)})` : `${r1(tUp - tE)} s`, tUp !== null && tUp - tE <= 60);
    await waitUntilSim(page, tE + 120);
    await step(r, page, '2 min after epinephrine');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Malignant hyperthermia', async ({ page }) => {
  test.setTimeout(40 * 60_000); // 40 sim-min at ×4 = 10 min of wall time, with a margin for a loaded machine
  const browserName = test.info().project.name;
  const r = begin('Malignant hyperthermia', browserName);
  const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
  try {
    const t0 = await start(page, r, 'Malignant hyperthermia');
    await waitUntilSim(page, t0 + 240);
    await press(r, page, 'Start surgery: rocuronium 0.6 mg/kg');
    const tEarly = await until(page, 720, 'earlySigns');
    await step(r, page, 'state "Early signs" (EtCO2 above 45 at the same ventilation)');
    check(r, 'early signs', 'state earlySigns 4–12 min after load', tEarly === null ? 'never' : `${r1((tEarly - t0) / 60)} min`, tEarly !== null && tEarly - t0 >= 240 && tEarly - t0 <= 720);
    for (const m of [9, 13, 17]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m}:00 (fast-forward here with Stage 10)`);
    }
    const tEst = await until(page, 900, 'established');
    await step(r, page, 'state "Established MH" — Explore → "Changed only"');
    check(r, 'established crisis', 'state established 14–26 min after load', tEst === null ? 'never' : `${r1((tEst - t0) / 60)} min`, tEst !== null && tEst - t0 >= 840 && tEst - t0 <= 1560);
    if (tEst === null) return;
    await waitUntilSim(page, tEst + 60);
    const tC = await press(r, page, CRISIS);
    await waitUntilSim(page, tC + 60);
    const tD = await press(r, page, 'Dantrolene 2.5 mg/kg');
    await waitUntilSim(page, tC + 90);
    await press(r, page, 'Cool: 2 L saline at room temperature');
    await waitUntilSim(page, tC + 120);
    await press(r, page, 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose');
    await waitUntilSim(page, tC + 150);
    await press(r, page, 'Sodium bicarbonate 1 mmol/kg');
    await waitUntilSim(page, tC + 600);
    await press(r, page, 'Dantrolene 2.5 mg/kg');
    const tRec = await until(page, 900, 'recovering');
    await step(r, page, 'state "Recovering: EtCO₂ below 45"');
    check(r, 'recovery after dantrolene', 'state recovering within 20 min of the first dose', tRec === null ? 'never' : `${r1((tRec - tD) / 60)} min`, tRec !== null && tRec - tD <= 1200);
    const tLow = await waitSim(page, 900, (_n, v) => typeof v.etco2 === 'number' && v.etco2 < 38);
    if (tLow !== null) await press(r, page, 'EtCO₂ normal: ventilation back to 12 × 500');
    await waitUntilSim(page, t0 + 2400);
    const low = minOf(await hist(page, tC, Infinity), 'abpSys');
    await step(r, page, 'end (40:00)', { minSystolicAfterCall: r1(low) });
    check(r, 'no arrest on the treated path', 'arterial systolic never below 60 after the call', r1(low), low !== null && low >= 60);
  } finally {
    await finish(page, r, browserName);
  }
});

test('Stab wound: tamponade, PEA and pericardiocentesis', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Stab wound: tamponade, PEA and pericardiocentesis', browserName);
  try {
    const t0 = await start(page, r, 'Stab wound: tamponade, PEA and pericardiocentesis');
    for (const m of [1, 3, 6]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m}:00`);
    }
    const tPea = await until(page, 480, 'pea');
    await step(r, page, 'state "PEA" (sinus on the ECG, no pulse)');
    check(r, 'PEA without drainage', 'state pea 5–11 min after load', tPea === null ? 'never' : `${r1((tPea - t0) / 60)} min`, tPea !== null && tPea - t0 >= 300 && tPea - t0 <= 660);
    if (tPea === null) return;
    await waitUntilSim(page, tPea + 10);
    const tCpr = await press(r, page, 'Start CPR, intubate, FiO₂ 1.0');
    await waitUntilSim(page, tCpr + 120);
    const tD = await press(r, page, 'Pericardiocentesis during CPR');
    // the pulse returns ≈ 96 s after the drainage (scenario test S2): stop CPR 2 min after it, then the pulse must hold
    await waitUntilSim(page, tD + 120);
    const tStop = await press(r, page, 'Pulse back: stop CPR');
    await waitUntilSim(page, tStop + 30);
    const sys = minOf(await hist(page, tStop + 10, tStop + 30), 'abpSys');
    await step(r, page, '30 s after stopping CPR', { minSys10to30: r1(sys) });
    check(r, 'the pulse holds after CPR stops (drained)', 'arterial systolic > 90 from 10 to 30 s after stopping', r1(sys), sys !== null && sys > 90);
    await press(r, page, 'Crystalloid 500 mL');
    await waitUntilSim(page, t0 + 900);
    await step(r, page, 'end (15:00)');
  } finally {
    await finish(page, r, browserName);
  }
});

test('Class IV haemorrhage, PEA and resuscitation', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Class IV haemorrhage, PEA and resuscitation', browserName);
  try {
    const t0 = await start(page, r, 'Class IV haemorrhage, PEA and resuscitation');
    for (const m of [2, 4, 6, 8]) {
      await waitUntilSim(page, t0 + m * 60);
      await step(r, page, `${m} min of bleeding`);
    }
    // Pulse lost = arterial systolic < 20, OR the monitor blanks systolic/diastolic and keeps only the mean (its
    // "IBP1 STATIC PRESSURE" state: no pulsatile trace).
    const lost = (v: { abpSys?: number | null; abpMean?: number | null }) => (typeof v.abpSys === 'number' && v.abpSys < 20) || (v.abpSys === null && typeof v.abpMean === 'number');
    const tPoll = await waitSim(page, 7 * 60, (_n, v) => lost(v));
    const first = (await hist(page, t0 + 60, Infinity)).find((s) => lost(s));
    const tLoss = tPoll === null ? null : (first?.t ?? tPoll);
    await step(r, page, 'pulse lost (systolic < 20 or static arterial pressure)', { firstLostSample: first ?? null });
    check(r, 'pulse lost', 'between 8 and 13 min sim', tLoss === null ? 'not by 15 min' : `${r1((tLoss - t0) / 60)} min`, tLoss !== null && tLoss - t0 >= 480 && tLoss - t0 <= 780);
    if (tLoss === null) return;
    // the run-sheet cue: press about 10 s after the "SPO2 NO PULSE" alarm
    const tNp = await waitSim(page, 180, async () => (await alarms(page)).some((a) => /NO PULSE/i.test(a.text)));
    await step(r, page, 'monitor alarm "SPO2 NO PULSE"');
    await waitUntilSim(page, (tNp ?? (await simNow(page))) + 10);
    const tC = await press(r, page, 'Start CPR, 2 L and epinephrine');
    const tR = await waitSim(page, 8 * 60, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 90);
    await step(r, page, 'arterial systolic > 90 (pulse back)');
    check(r, 'circulation returns during CPR', 'arterial systolic > 90 within 7 min sim', tR === null ? `not within 8 min (max ${r1(maxOf(await hist(page, tC, Infinity), 'abpSys'))})` : `${r1((tR - tC) / 60)} min`, tR !== null && tR - tC <= 420);
    const tStop = await press(r, page, 'Pulse back: stop CPR');
    check(r, '"Pulse back: stop CPR" moves the scenario on', 'state rosc', await stateId(page), (await stateId(page)) === 'rosc');
    await waitUntilSim(page, tStop + 60);
    await step(r, page, '1 min after stopping CPR', { minSys20to60: r1(minOf(await hist(page, tStop + 20, tStop + 60), 'abpSys')) });
  } finally {
    await finish(page, r, browserName);
  }
});

test('A second scenario in the same page restarts the clock', async ({ page }) => {
  const browserName = test.info().project.name;
  const r = begin('Second scenario load restarts the clock', browserName);
  try {
    const t0 = await start(page, r, 'Healthy induction');
    await waitUntilSim(page, t0 + 120);
    const c1 = await barClock(page);
    await step(r, page, 'first case running 2 min', { clock: c1.text });
    await page.locator('section[aria-label="Running scenario"] button', { hasText: 'Choose another scenario' }).click();
    await page.waitForTimeout(600);
    r.labels.libraryDuringRun = (await page.locator('section[aria-label="Scenario library"]').innerText()).split('\n').slice(0, 4).join(' | ');
    r.labels.backButton = (await page.getByRole('button', { name: 'Back to the running case' }).count()) ? 'Back to the running case' : 'not shown';
    Object.assign(r.labels, Object.fromEntries(Object.entries(await loadShowcase(page, 'Stab wound: tamponade, PEA and pericardiocentesis', { speed: false })).map(([k, v]) => [`second_${k}`, v])));
    await page.waitForTimeout(1500);
    const c2 = await barClock(page);
    const inState = (await page.locator('section[aria-label="Running scenario"]').innerText()).match(/Time in state\s+(\d+:\d+)/)?.[1] ?? '?';
    await step(r, page, 'second case loaded', { clock: c2.text, timeInState: inState });
    check(r, 'the clock restarts on the second load', 'session-bar clock < 00:20 just after loading', `${c1.text} → ${c2.text} (time in state ${inState})`, c2.s < 20);
    await page.waitForTimeout(8000);
    const c3 = await barClock(page);
    await step(r, page, '8 s (wall) later', { clock: c3.text });
    check(r, 'the clock runs after the second load', 'advances', `${c2.text} → ${c3.text}`, c3.s > c2.s);
  } finally {
    await finish(page, r, browserName);
  }
});
```

In `scripts/showcase/sound.showcase.ts`, find:

```ts
  const afterClick = await states();
  // drive an alarm so tones are scheduled: the tamponade case + propofol gives apnoea and low-pressure alarms
  await loadShowcase(page, 'Severe tamponade, then induction');
  await page.locator('section[aria-label="Running scenario"] button', { hasText: 'Give propofol 2 mg/kg' }).click();
  await page.waitForTimeout(30_000);
```

Replace with:

```ts
  const afterClick = await states();
  // drive an alarm so tones are scheduled: the tamponade case + propofol gives apnoea and low-pressure alarms (Stage 11's card)
  await loadShowcase(page, 'Stab wound: tamponade, PEA and pericardiocentesis');
  await page.locator('section[aria-label="Running scenario"] button', { hasText: 'Induce for intubation: propofol 2 mg/kg' }).click();
  await page.waitForTimeout(30_000);
```

In `scripts/showcase/make-videos.mjs`, find:

```js
#!/usr/bin/env node
// Last-resort videos: record the five Showcase cases (Chromium, 1280×800, ×4) with the rehearsal itself, then convert
// each recording to H.264 .mp4 (plays in QuickTime) into KIT/videos/. Needs ffmpeg on PATH (never installed here).
```

Replace with:

```js
#!/usr/bin/env node
// Last-resort videos: record the six Showcase cases (Chromium, 1280×800, ×4) with the rehearsal itself, then convert
// each recording to H.264 .mp4 (plays in QuickTime) into KIT/videos/. Needs ffmpeg on PATH (never installed here).
```

In `scripts/showcase/make-videos.mjs`, find:

```js
  rmSync(results, { recursive: true, force: true });
  const pw = spawnSync('npx', ['playwright', 'test', '-c', 'scripts/showcase/playwright.showcase.config.ts', 'rehearsal', '--project', 'video', '-g', 'Healthy induction|Anaphylaxis|bronchospasm|tamponade|haemorrhage'], {
    cwd: repo, stdio: 'inherit', env: { ...process.env, SHOWCASE_KIT: kit, SHOWCASE_VIDEO: '1', SHOWCASE_WORKERS: '1' },
```

Replace with:

```js
  rmSync(results, { recursive: true, force: true });
  const pw = spawnSync('npx', ['playwright', 'test', '-c', 'scripts/showcase/playwright.showcase.config.ts', 'rehearsal', '--project', 'video', '-g', 'Healthy induction$|fentanyl|Anaphylaxis|Malignant|Stab wound|haemorrhage'], {
    cwd: repo, stdio: 'inherit', env: { ...process.env, SHOWCASE_KIT: kit, SHOWCASE_VIDEO: '1', SHOWCASE_WORKERS: '1' },
```

In `scripts/showcase/make-videos.mjs`, find:

```js
// [a word that identifies the case in Playwright's (possibly truncated) result folder name, the file name]
const ORDER = [['healthy-induction', '1-healthy-induction'], ['anaphylaxis', '2-anaphylaxis'], ['bronchospasm', '3-bronchospasm'], ['resuscitation', '4-haemorrhage-cpr'], ['tamponade', '5-tamponade']];
const outDir = join(kit, 'videos');
```

Replace with:

```js
// [a word that identifies the case in Playwright's (possibly truncated) result folder name, the file name]
// Stage 11: the six cards in the demonstration's order
const ORDER = [['healthy-induction-video', '1-healthy-induction'], ['fentanyl', '2-induction-premedication'], ['anaphylaxis', '3-anaphylaxis'], ['malignant', '4-malignant-hyperthermia'], ['stab-wound', '5-tamponade'], ['resuscitation', '6-haemorrhage-cpr']];
const outDir = join(kit, 'videos');
```

In `scripts/showcase/make-videos.mjs`, find:

```js
const dirs = existsSync(results) ? readdirSync(results) : [];
// replace the previous set only when this run recorded all five: remove every .mp4 written before (old and new names)
const found = ORDER.filter(([key]) => dirs.some((x) => x.toLowerCase().includes(key)));
```

Replace with:

```js
const dirs = existsSync(results) ? readdirSync(results) : [];
// replace the previous set only when this run recorded all six: remove every .mp4 written before (old and new names)
const found = ORDER.filter(([key]) => dirs.some((x) => x.toLowerCase().includes(key)));
```

- [ ] **Step 2 — check.** `./node_modules/.bin/tsc --noEmit --strict --module nodenext --moduleResolution nodenext --target
  es2022 --allowImportingTsExtensions --skipLibCheck --types node scripts/showcase/rehearsal.showcase.ts
  scripts/showcase/sound.showcase.ts` (clean; the kit scripts are not in a package's typecheck) and
  `node --check scripts/showcase/make-videos.mjs`. The rehearsal itself runs at the gate (Step 4) on a built kit.
- [ ] **Step 3 — commit.** `chore(showcase-kit): the rehearsal, sound proof and video script follow the six Showcase cards (Stage 11)`

## Gate — merge main, full verification, the browser run sheets, gate note, PR

- [ ] **Step 1.** `git merge origin/main`; re-run Task 0 Step 2. `npx -y pnpm@9.15.9 -r typecheck` (clean).
- [ ] **Step 2.** From `apps/demo`: `PME_SHOWCASE_PRINT=1 PME_TEST_SET=showcase npx -y pnpm@9.15.9 exec vitest run`
  (5 files, 20 passed, ≈ 4 min alone) — keep the printed numbers for the gate note; then
  `PME_TEST_SET=fast npx -y pnpm@9.15.9 exec vitest run`. A timed-out file is re-run ALONE before it counts.
- [ ] **Step 3.** The e2e that load showcase cards: `npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/showcase-clock.e2e.ts apps/demo/e2e/fu11-restore.e2e.ts apps/demo/e2e/fu11-vent-restore.e2e.ts` (both engines), and `apps/demo/e2e/fu11-follower.e2e.ts` if FU-11 d has merged (the file arrives with it).
- [ ] **Step 4 — the run sheets in the browser.** `npx -y pnpm@9.15.9 --filter @pme/demo dev`, at ×4, each card's
  presenter column above in a fresh page: record, per card, the skin's alarm WORDS and the tile values at the run
  sheet's clock times (Chromium and WebKit). A tile value more than its band away from the run sheet: STOP, report.
  Then **the kit rehearsal with the six cards and the run-sheet numbers for the kit job (Q12 ruling)**, nothing else
  heavy running:
  ```bash
  node scripts/showcase/make-bundle.mjs <scratchpad>/stage-11/kit
  SHOWCASE_KIT=<scratchpad>/stage-11/kit SHOWCASE_WORKERS=2 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal.showcase.ts sound.showcase.ts multiwindow.showcase.ts
  ```
  Expected: 8 + 1 + 1 passed per engine (MH alone takes ≈ 10 min of wall time per engine). Write
  `docs/gates/stage-11/run-sheet-numbers.md`: a heading per card in the demonstration order, then
  `docs/showcase/results/run-sheet-<case>-chromium.md` and `…-webkit.md` (clock, monitor, presenter action; the alarms
  and the checks below each table), and above them one table "run sheet (this plan) vs rehearsal" for the clock times
  the plan's run sheets name — a monitor number beyond its R45 tolerance from the plan's run sheet is a STOP (report it,
  the run sheet is not edited to match). Move the new files (`docs/showcase/results/run-sheet-*.md`, the new cases'
  `rehearsal-*.json` and screenshots) into `docs/gates/stage-11/showcase/` with `git mv`/`mv`, then
  `git checkout -- docs/showcase` (the kit job rebuilds `docs/showcase` from the gate's folder; FU-7.1 b's rule).
- [ ] **Step 5.** Gate note `docs/gates/stage-11.md`: the measured numbers (Step 2), the browser table (Step 4), the
  run-sheet tables re-ticked, the owner questions with their rulings ("Owner questions"), and the CI time of the new
  `test-slow (showcase)` job. It must also carry: **Q3's old → new numbers for the kit's run sheet** (haemorrhage pulse
  lost 10:03–10:08 → 10:29; ROSC 254.5–257.5 s → 176 s into CPR, 178 s to systolic > 90; the story now says "about
  10½ minutes" and "about three minutes"); **the known miss Q8/C-1** (post-MH hypertension, MAP 112–120 for > 30 min,
  calibration queue); C-2 (the MH potassium ceiling, owner) and F-1 (the schema follow-up). Push, open the PR against
  `main` (one piece of work; frozen once handed over).

---

## Mechanical self-check

`blocks.py check` on this file against `origin/main` 7a3d5672 (R50 re-cut, 2026-10-11): **30 blocks, 20 files, 0
problems** — every block applied in plan order reproduces the prototype's files byte for byte; no create overwrites an
existing file; every find occurs exactly once when it is applied (the chained `showcase.test.ts` line: Task 4 finds the
original, Task 5 finds Task 4's). The prototype's 20 files: `scratch/plans-backup/stage-11-proto-files/`. None of the 20
is touched by `origin/fu-7.1-b`, `origin/fu-11-a/b/c`, FU-11 d's or Stage 10's prototype patch (`git diff --name-only`,
checked 2026-10-11), so the finds hold on the tree this stage executes on.

R50 verification on the prototype (origin/main + the real `fu-7.1-b` and `fu-11-b` + this plan): the showcase set
`PME_TEST_SET=showcase` 5 files, 20 passed; `showcase-cards.test.ts` 12 + `showcase.test.ts` 2 passed; the demo's
typecheck clean; red on an empty showcase: 20 of 20 fail ("no showcase document"); red on main's old cards: S2 5 of 5,
S3 5 of 6 (the prompt case passes by design, Task 1 Step 2); `PME_TEST_SET=fast` lists no slow file and
`PME_TEST_SET=showcase` lists exactly the five. The new kit rehearsal (Task 7) was run once on a kit built from the
prototype (`make-bundle.mjs`, Chromium, 2 workers, 27.7 min): **8 passed**, plus the sound proof 1 passed; its run-sheet
tables reproduce the scenario tests (S3 desaturation 11:13 vs 11:14, S4 MAP ≥ 65 96 s after ephedrine, MH early signs
6:49 / established 18:44 / recovering 30:49, PEA 7:51, haemorrhage ROSC ≈ 3 min). WebKit was not run in review (the
gate runs both).

## Self-review

- **Brief coverage:** S1–S5, the JSON, the buttons, measurable objectives, the happy and untreated paths with bands, the
  run-sheet tables, the order and the durations at ×1/×4/×8, the Explore set, the MH event check, pulsus, what could not
  be made to work, the file partition and the owner questions — each has a section or a task above. R50: the rulings on
  Q1–Q12 (the table in "Owner questions"), the kit's scripts (Task 7), the run-sheet numbers gate step (Gate Step 4),
  the objectives' mapping for Stage 13.
- **Placeholders:** none; every block is cut from the prototype and checked.
- **Names:** `runCard`, `Act.press`, `bands`, `BANDS`, `SHOWCASE_ORDER`, `SHOWCASE_IDS`, `showcaseDoc` are defined in
  Task 1 / Task 6 and used with the same names everywhere.
- **Review Focus:** 1 is tested (Task 2, ×8 poll), 2 by S3's "induced a minute late" case and the state bands, 4 by
  Task 6, 5 by Task 1's CPR case; 3 is a recorded design choice (D-1).
