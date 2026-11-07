# The mechanism tree: the coupling tree of any trigger, forward and backward, static and live — Implementation Plan

**STATUS: DRAFT FOR REVIEW (2026-11-07). NOT READY TO BUILD.** Nothing here is ruled until the owner answers §10 (each
question carries the option the plan proposes and uses as its default) and the orchestrator reviews the pieces. Written
by a planning executor from brief 80 of the post-demo set, against `origin/main` **563e32d5** (Merge PR #331,
`retire-v1-pr4-kit-suites`), read in the worktree `scratch/wt-plan-mechanism-tree` (branch `plan-mechanism-tree`).
Every `file:line` below was read at that commit and is a starting point only: an executor finds the code by the name
given, because lines move. No product code, test, card or kit file was changed while writing it.

**Source of the work.** The owner's ruling of 7 November 22:37 (`research/00-orchestrator-rulings.md:4110`): the
mechanism tree goes forward AND backward, is static AND live, and is its own page beneath "Explore the physiology"; it
is for the instructor and the debrief, not for a learner's phone during a case (brief 80). The physiology audit it must
make visible is `docs/review-inputs/research/44-physiology-compromise-audit.md` (research/44, 7 November).

**How numbers are marked.** A number with a `file:line` was read or counted there at 563e32d5. A number from the
audit carries `research/44` and its row id. A number the plan chooses is `[ENG]` with its reason, or a placeholder
`[P-n]` listed in §10.1 for the owner. An effort figure is an **estimate**, never a measurement: plan hours converted to
executor-hours at ÷8 to ÷6 as `research/42-ci-and-process-review.md` §2.1 measured, exactly as the EEG plan
(`docs/plans/stage-eeg-depth-of-anaesthesia.md` §7) does.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each PR in §8 is ONE pull request with its own
> gate.

---

## 1. Intent

An instructor who gives propofol to a bleeding patient, or a facilitator who asks in the debrief "why did the MAP fall
at 04:10?", should be able to see the chain: the drug's effect-site concentration, its sympatholysis and venodilation,
the baroreflex trying to answer and being blunted, the SVR and the unstressed volume that resulted, the stroke volume,
the MAP on the monitor. And they should see where the chain is honest and where it is not: an edge whose size is a
fitted constant is drawn as such, and a mechanism the engine does not have (research/44 item 1: "Autonomic hub
missing") is drawn as an absent edge with the audit row that names it.

One drawing, two directions, two modes:

- **Forward:** from a trigger (a drug, an event, an instructor change, a ventilator setting) outward through every
  coupling to the monitor's numbers.
- **Backward:** from an observed change ("MAP fell") back through everything that feeds it, ranked by what actually
  contributed in the running case, to the trigger.
- **Static:** what the engine's model can couple, the same for every patient. It is also the engineering map: a
  branch the tree does not show is a mechanism the engine does not have.
- **Live:** the same tree fed by the running case: sign, magnitude and delay on each edge over a chosen window;
  saturated or blocked edges dimmed. A β-blocked heart's missing tachycardia is a dim edge, and that is the teaching
  moment.

## 2. Goals, non-goals, anti-goals

**Goals**
- A machine-readable coupling registry in the engine, from which both the tree and the model docs' coupling section are
  generated, and a CI check that keeps the code and the registry from drifting apart (Decision 1, Q1).
- Every edge carries its class from the code's own tag: sourced, `[ENG]`, `[FIT]` (once research/44's L2-61 split
  lands), or ABSENT (a missing mechanism named by an audit row). The tree never draws a fitted edge as if it were a
  sourced one.
- Live weights that are **exact where the engine can state them exactly** (each coupling's factor or term at its
  effector, reported by the engine) and **counterfactual where it cannot** (a knock-out run from a snapshot), never a
  fitted or cosmetic weight and never a finite-difference estimate presented as a contribution (Q3).
- A backward read that ranks causes by contribution, draws reflex loops as loops, and shows the path to the trigger.
- A link from the Debrief's key moments and marks to the backward tree at that moment, and the tree on the printed
  debrief when the facilitator asks for it.
- A map from a red validation cell to the edges on its path, so the audit's 48 class-B findings (research/44 summary
  table) become visible branches.

**Non-goals**
- Building any missing mechanism. The tree shows the autonomic hub as absent; the hub is its own stage (research/44
  correction order item 4).
- Changing any physiology number, tag, band or test outcome. The registry describes the code; it does not move it.
- A learner-facing view, a phone layout, or anything on the follower views (`#/monitor` followers, `#/join`).
- MANUAL mode's coupling rules (the M-rules of the design brief, `l1/state.ts:16`, `gas/coupling.ts`) in the first
  cut (Q7).
- Waveform-feature observables (the morphology bands' R→foot delay, notch depth) before the numerics are done (Q9).

**Anti-goals**
- A hand-drawn graph in docs that drifts from the code (option (c) of Decision 1).
- A weight that is a fit, a tuning or a smoothing presented as a contribution. If an edge's contribution cannot be
  stated exactly, the edge shows its sign and class and no number, and says why.
- Hiding the non-additivity of reflexes: knock-out shares that do not sum to the observed change are shown with the
  remainder, not normalised to 100 %.
- A coupling's numbers copied into the registry. A row names the exported constants by identifier; the value, unit
  and tag are read from the code, as `scripts/model-docs.ts` already reads them (Decision 2).
- A graph library. The project's own SVG string code draws it (orchestrator's call, Decision 7).

## 3. What exists (563e32d5)

### 3.1 There is no machine-readable coupling graph today

Verified, not assumed:

1. **The model docs are produced by parsing the code, not from a graph.** `scripts/model-docs.ts:1–14` (header) and
   its `extract()` (`:103–144`) collect, per module of `scripts/model-modules.ts:21–43`: every exported `…State` type
   field by field; every exported numeric constant with the unit guessed from its name or comment (`UNIT_SUFFIX`,
   `:70–75`) and its source or tag read by regular expression from the comment (`TAG_RE`, `SOURCE_RE`, `:77–79`); and
   "relations", which are **comment lines that match an equation-shaped regular expression** (`EQUATION_RE`, `:101`;
   used at `:138–142`). A relation is a line of text: it names no input field, no output field, no sign and no delay.
2. **No registry exists anywhere.** A search of `packages/`, `apps/` and `scripts/` for an exported
   `…REGISTRY`, `…GRAPH`, `…EDGES` or `…COUPLINGS` constant finds none; the words "coupling graph", "coupling
   registry" and "causal" appear in no source file. The only files named for couplings are `l2/gas/coupling.ts`
   (MANUAL mode's mean-airway-pressure rule, `:1`, `:37–38`) and L1's `coupled` truths (`l1/state.ts:54`).
3. **The couplings live in two places in the code, and neither is declared as data:**
   - *Between modules:* the engine's pass, `engine.ts:655–735`, runs pk → neuro → resp → blood → endo → organs → hemo
     and hands each module a context object built inline (`advanceResp(ps.resp, { l1, hemo, rhythm, hr, blood, neuro,
     hco3, cbfRel, bronchoDil, hpvInhibit, anaphEndo, histamine }, …)`, `:695–699`), plus direct writes into the
     circulation's externals (`circ7g.ext.drug = ps.pk.fx`, `.betaBlockAdd`, `.betaAgonistU`, `.avNodeBlock`,
     `.histamine`, `.tempC`, `:657–663`) and the endocrine writers (`writeCirc`, `writeBlood`, `writeCond`,
     `writeLung`, `:709–712`). The circulation's `ext` record alone has 30 optional fields (`l2/circ/model.ts:179` on;
     counted). One of these seams is a step late by construction: the organs' CBF reaches the lungs "one step late —
     organs advance after resp" (`engine.ts:699`, comment).
   - *Inside a module:* products and sums at the effector. The systemic resistance is
     `p.rSys = (man.rSys ?? base.rSys) · b.svrF · de.svr · ch.svrF · (x.rSysF ?? 1) · endoSvr · (x.viscF ?? 1)`
     (`l2/circ/model.ts:330`): seven factors from the baroreflex, the drugs, the chemoreflex, the Cushing response, the
     endocrine model and viscosity. The baroreflex itself is gains on a delayed, low-passed, saturating error
     (`l2/circ/baroreflex.ts:1–7`, `SYMP_SAT` `:24`), blunted by β-occupancy passed in at the call
     (`model.ts:315`, `betaBlock: min(0.95, …)`).
4. **The truth event is a pruned state tree, not a graph.** The engine emits an opt-in `truth` event at 0–2 Hz
   (`engine.ts:288–290`, `:517`), pruned to at most 2 100 leaves (`truth.ts:6–12`, `[ENG]`). It carries state, not the
   factors computed inside a step (`b.svrF`, `de.svr` and `ch.svrF` are locals of the control step and do not appear in
   it). A finite-difference reading of it could see that SVR rose; it cannot say which factor raised it.

So the generated docs are as good as the comments, the tree has nothing to read, and the audit's "[ENG] vs [FIT]"
discipline (research/44 L2-61) is a property of comment text only.

### 3.2 The organ pipeline and the state tree

- **Pass order** (`engine.ts:655–735`): drugs first ("every consumer reads this instant's effects", `:655`); the
  rhythm requests; the neuro step (`:687`); the breath driver and lungs (`:695`); blood (`:700`); endocrine (`:703`),
  then the endocrine writers into circulation, blood, drug conditions and lungs (`:709–712`); organs (`:714`, "after
  pk/resp/blood/endo, before the haemodynamics"); haemodynamics (`:715`). The organ pipeline's own rates: brain 10 Hz,
  ICP samples 125 Hz, kidney and liver 1 Hz (`l2/organs/pipeline.ts:1–7`).
- **The L1 state** (`l1/state.ts:22–44`): 21 state variables in `STATE_SCHEMA`, each a target or `derived` in MANUAL
  mode; `coupled` truths override the ramps (`:54`, `:70–74`). In MODELED mode the L2 models own the physiology and L1
  holds targets and pins.
- **The look-ahead clones the state every tick** (`l1/state.ts:4`; `engine.ts:336`, `:476`, `:518` `speculate()`).
  Anything the tree records must come from **committed** passes only, as the coronary ST patch already does
  ("committed state only", `engine.ts:503`). This is a constraint on Decision 3.

### 3.3 The closest existing pages

- **Physiology console** (`apps/demo/dev/physiology-console.html`, `apps/demo/src/physiology-console/*`; listed in
  the Developer page, `views/dev.ts:9`): every model value by organ with its engine key, a baseline diff, 60 s
  sparklines, raw commands, JSON/CSV export (`model.ts:1–2`). Its `ConsoleHost` (`view.ts:11–21`) already has
  `snapshot`, `restore`, `pause` and `timeScale`: the interface the knock-out runner needs (Decision 4). Its curated
  path → organ map (`organs.ts:1–4`, `GROUP_BY_PREFIX`) is the node grouping the tree reuses.
- **Explore physiology** (`#/explore`, `app/views/explore.ts`): the console's data for residents, a left nav of
  sections (`SECTIONS`, `:30–46`) routed as `#/explore/<section>` (`router.ts:1`, `:10`), glossary labels and adult
  normals. It is a rail entry (`rail.ts:47`, `shell.ts:24`) and a host route (`router.ts:15`).
- **Home** (`app/views/home.ts`) has **no** "Explore the physiology" section: one paragraph, one button ("Start
  here" → Room), links and three tiles (`:1–5`, `:44–54`). README line 15 lists "Explore physiology" among the pages
  of the one-page app. The brief's "the Home page's section" is therefore read as the Explore physiology page itself
  (disagreement 1, §11; Q12).

### 3.4 The debrief

- **Key moments and marks** are computed from the run record alone (`app/debrief-moments.ts:1–10`): scenario states,
  pulse lost and back, the team's drugs, fluids, shocks and CPR, with what the trend held at that second. Instructor v2
  marks are bookmark rows with a kind (`good`, `bad`, `discuss`, `stage`; `packages/controller/src/protocol.ts:126`).
- **The record** (`app/record.ts:1–20`) keeps rows and a 1 Hz trend of six numerics, three pressures and five lab
  values, plus `keeps` words that tell a reader what a file recorded (`:91–113`). It holds **no seed and no engine
  snapshot** (no `seed` in `record.ts`; counted). It lives beside the engine, not in its snapshot (`:15`).
- **Bookmarks are engine snapshots in the live session** (`packages/controller/src/session/host-session.ts:52–53`).
  So a counterfactual run is possible while the session lives and impossible from a debrief file (Q11).
- **SVG drawing** is a string builder with no DOM state (`views/debrief-swimlane.ts:1–12`, `:245`), printed through
  `@media print` rules in `views/debrief.css:151`, `:307`.
- **Persian** goes through one matcher over `docs/showcase/i18n/fa-debrief.json` (`app/i18n/fa-dom.ts:1–11`), with a
  `reviewed` flag per entry and the draft line "Persian draft: not yet read by the clinical owner" while any printed
  entry is unread (`:12–14`, `:23`). **The DOM pass never touches SVG text** (`fa-dom.ts:6–7`), so the tree's labels
  must be matched when the SVG string is built (Decision 7, Q13).

### 3.5 Time

- Fast-forward spans are 120 s and 300 s, paced to `FF_WALL_MS` = 10 000 ms of wall time (`app/fast-forward.ts:18–21`,
  owner's values). The engine runs every tick of a jump through the same `tick()` (`engine.ts:500–518`), so anything
  emitted per tick is emitted during a fast-forward too, at sim-time rate.
- Pause is the host's (`ConsoleHost.pause`, `view.ts:19`); sim time stands still and nothing is emitted.

### 3.6 The audit this must make visible

research/44 (summary table): 180 findings, of which **48 are class B** ("fitted constant, lookup or gain standing in
for a missing coupling"), 22 class A, 33 T/BAND, 15 DEV, 37 C, 19 D, 6 T-ok. 818 lines carry the exact `[ENG]` tag in
`packages/` and `apps/`, and 205 a variant tag (research/44 summary). Proposed correction order item 1 is to split the
tag into `[ENG]` and `[FIT: target]` with a CI rule (L2-61). At 563e32d5 `packages/engine-core/src/` has **771** lines
containing `[ENG` and **0** containing `[FIT` (counted with `grep -rn`): the split has not landed. Examples the tree must
show for what they are: the baroreflex HR gain `G_HS = 0.04` against its cited 0.01–0.02 (`baroreflex.ts:13`,
research/44 item 1); the humoral arm's fitted EC50 and gains (L2-01); the chemoreflex as direct HR/SVR multipliers
(L2-04, `circ/model.ts:264–272`); the arrest hazards with no electrophysiological substrate (L2-05).

## 4. Decisions this plan makes where the brief and the rulings were silent

- **D1. Where the couplings come from: a registry in the engine (option a), checked against the code by static
  analysis (option b used as the check, not as the source).** Each coupling is one row in
  `packages/engine-core/src/couplings/` (one file per model module, the same module ids as
  `scripts/model-modules.ts`). The model docs and the tree are generated from it. Reasons and costs are in Q1; in
  short, (b) alone cannot give sign, delay, saturation or source, and (c) drifts.
- **D2. A row names, it does not copy.** A row is
  `{ id, module, from: NodeRef[], to: NodeRef, sign: '+' | '−' | '±', form: 'factor' | 'term' | 'gain' | 'threshold' | 'state',
  delay?: ConstRef, tau?: ConstRef, saturation?: ConstRef, blockedBy?: NodeRef, params: ConstRef[], absent?: AuditRef,
  note }`. A `ConstRef` is the exported constant's identifier and file (`'circ/baroreflex.ts#G_HS'`); its value, unit
  and tag are read from the code by `model-docs.ts`'s existing `extract()`, so a number lives in one place. The edge's
  class is computed: ABSENT if `absent` is set; else FIT if any `params` constant is tagged `[FIT…]` (or a variant
  `[ENG, fit…]` until L2-61 lands); else ENG if any is `[ENG…]`; else SOURCED if every constant has a source the
  regular expression finds; else UNTAGGED (a finding the tree shows in its own colour, not a fifth kind of honesty).
- **D3. Nodes are of four kinds:** *trigger* (a command or clinical event kind, §7 piece T2), *state* (a path in
  the truth tree, e.g. `hemo.circ.baro.eS`), *effector* (a parameter assembled from factors, e.g. `circ.p.rSys`,
  `circ.p.v0Sv`, the HR set factor) and *observable* (a monitor numeric `mon.*`). Every node has a glossary label where
  the glossary has one (`app/glossary.ts`), else its engine key, as Explore does.
- **D4. Live contributions are reported by the engine at the effector, and counterfactual runs answer what the
  effector report cannot** (Q3). The engine gains an opt-in `couplingHz` option beside `truthHz` (0 = off, the default:
  an engine without it computes exactly what it computes today). When on, each registered factor or term is recorded
  where it is computed, on committed passes only (§3.2), and emitted as a `couplings` event at that rate: for a factor
  its value (so its share of a product is exactly `ln f`), for a term its value in the effector's unit, for a gain its
  effective gain after blockers, for a saturating edge whether the clamp is active. A **knock-out** run clones the
  engine from a snapshot in a worker, sets one edge to its neutral value (factor 1, term 0) through a test-and-tree-only
  command, runs the window, and reports the difference at the observable. The engine is deterministic and seeded, so
  the counterfactual is exact for the question it answers ("what would MAP have been without this edge"), saturation
  included.
- **D5. Loops are drawn as loops.** Strongly connected components of the registry (Tarjan) are computed once; a
  component with more than one node (the baroreflex: MAP → error → sympathetic outflow → SVR/HR/Emax/V0 → MAP) is
  drawn as one loop box with its feedback arrow and its live state (error, outflow, clamp), never unrolled into
  generations (Q6).
- **D6. Layout by generation.** Trigger at the root (left), observables at the leaves (right), each node at its
  longest-path distance from the root after the loops are collapsed. Backward reads reverse the axis (observable at
  the left). Deterministic: the same registry and trigger draw the same picture, so a DOM test can pin it.
- **D7. Drawing, the orchestrator's calls (stated as such, not the owner's):** a view in `apps/demo` at its own route
  (Q12: `#/explore/mechanisms`); drawn with the project's own SVG string code (the swimlane's pattern,
  `debrief-swimlane.ts:245`), no graph library; layout by generation (D6); edge weight as stroke width; dimmed where
  saturated or blocked, with opacity = 1 − blocked fraction `[ENG: display]`; an ABSENT edge drawn dashed with its
  audit id and no weight; a legend that says in words what each stroke means, including "absent: the engine does not
  have this mechanism" and "fitted: the size is fitted, not sourced"; no colour without a shape or a dash (the
  swimlane's rule E45, `debrief-swimlane.ts:10–11`); Persian labels matched at string-build time through
  `fa-match.mjs` with new entries `reviewed: false` (Q13); print through `@media print` as the debrief does.
- **D8. The tree reads, it never commands the patient.** The live page only listens to `couplings` and `truth`
  events; knock-outs run on a cloned engine in a worker and never touch the session's engine. No new message kind
  crosses to followers.

## 5. Global constraints (every piece)

- `00-common-rules.md` applies: own worktree under `scratch/` on a branch from `origin/main`; never merge, tag,
  force-push, rebase or push gh-pages; one PR per row of §8, draft until its checks pass; `npx -y pnpm@9.15.9`; the
  executor's port range only; no owner identifier anywhere; no closing keyword before a `#number`; identity through
  `GIT_AUTHOR_*` / `GIT_COMMITTER_*` on every commit; never re-run a CI job in which a test failed.
- **Mechanisms first (owner, 7 November).** The registry describes; it never changes a constant, a tag, a band or an
  outcome. If writing a row shows a coupling is wrong, the row records it (class, note, audit id) and the executor
  reports it; the fix is its own mechanism brief.
- **Determinism pinned.** With `couplingHz` 0 the engine's output is byte-identical to main's: the existing
  determinism baseline (`packages/validation/baselines/determinism.json`) must not change in any PR of this plan. With
  `couplingHz` > 0 every other event is byte-identical too (the recorder only reads).
- **Tests first** in every piece: the failing test is committed before the code, and the PR body pastes both runs.
- **A test file that reads under `docs/`** (research/44, the i18n table) is listed in `scripts/ci/docs-tests.mjs`
  (rule of 6 November; `packages/validation/test/docs-readers.test.ts` enforces it).
- **Must not touch (every piece):** any physiology constant or its tag; `packages/validation/suites/**` bands;
  `l2/pk/data/*` values; the scenario format; the showcase cards; `viewer-sync.ts`, `host-session.ts` (D8);
  the follower views.
- **Common gate (before every push):**

```bash
npx -y pnpm@9.15.9 install --frozen-lockfile < /dev/null
npx -y pnpm@9.15.9 -r typecheck < /dev/null
npx -y pnpm@9.15.9 --filter @pme/engine-core test -- <touched files> < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs docs-readers < /dev/null
git diff origin/main --stat -- packages/validation/baselines packages/engine-core/src/l2/pk/data   # empty
```

## 6. Review focus (for each piece's reviewer)

1. **A number in a registry row.** Any literal other than an identifier in `params`, `delay`, `tau`, `saturation`
   (D2).
2. **A weight that is not exact.** Any contribution computed by the page from recorded state (a difference quotient,
   a regression, a smoothing) and shown as a contribution (Q3).
3. **A fitted edge drawn as sourced.** The class must come from the code's tag; a reviewer picks three FIT edges from
   research/44 (L2-01, L2-03, L2-04) and checks how they draw.
4. **A recorder on the look-ahead.** Contributions taken inside `speculate()` would double-count and leak a future
   (§3.2).
5. **The engine's numbers moved.** The determinism baseline unchanged; with `couplingHz` on, every other event equal.

---

## 7. Pieces

Effort: plan hours (estimate) and executor-hours at ÷8 to ÷6 (research/42 §2.1). Each piece names its acceptance
line.

### R0: Census of the seams (plan 4 h · 0.5–0.7 executor-h)

**Depends on:** nothing. **Files:** new `scripts/coupling-seams.ts` (a TypeScript-AST reader in the manner of
`model-docs.ts`), its unit test. No source change.
- [ ] Red→green: the script lists every cross-module seam: each property of each context object built in
  `engine.ts`'s pass, each `circ.ext` field write, each endocrine writer's target field, each bus field a module reads
  (`ps.pk.bus.*`). The test pins the count on a fixture file and the real list's shape.
- [ ] **Measure** and record in the PR: the seam count, and per module the count of exported numeric constants that
  sit in an effector product or sum (a lower bound on the intra-module rows). These two numbers size R1–R2; this plan
  does not guess them.
**Acceptance:** the census committed as a generated table `docs/model/couplings-census.md`; its `--check` mode in the
model-docs test.

### R1: The registry schema, the check, and the rows for six triggers (plan 14 h · 1.8–2.3 executor-h)

**Depends on:** R0. **Files:** new `packages/engine-core/src/couplings/{types,index}.ts` and one file per module
touched; `scripts/model-docs.ts` (a generated "Couplings" section per module page); new tests.
- [ ] **Tests first:** (1) every `ConstRef` resolves to an exported constant (no stale names); (2) every node path
  exists in a truth tree of a reference run, or is an effector declared in the schema; (3) **the seam check:** every
  seam R0 lists is the `from` or `to` of a row, **or** is in the generated `unregistered` list, which may shrink and
  never grow (a new seam without a row fails CI; the list's length is printed on the census page, so the gap is
  counted, not hidden); (4) the class of an edge equals what D2 computes from the tags.
- [ ] Rows for the six first triggers (Q8) and every edge on their paths to the monitor: haemorrhage (`circ` bleed),
  propofol bolus, phenylephrine bolus, esmolol bolus, tension pneumothorax (lung condition `ptxTension` and circ
  `tensionPtx`), PEEP change on the ventilator. That covers the circulation's effector products (`model.ts:300–360`),
  the baroreflex, the chemoreflex, the humoral and sympathetic endocrine arms, the drug bus → circulation seams and the
  intrathoracic pressure seams.
- [ ] ABSENT rows for the autonomic hub (research/44 L2-01–L2-04) on these paths: the edge a real autonomic outflow
  would draw, with the audit id, and no params.
**Acceptance:** the model docs' circulation page lists its couplings with class; the census shows the remaining
unregistered seams; nothing else in `docs/model/` changes except the new section.

### T1: The static forward tree page (plan 12 h · 1.5–2.0 executor-h)

**Depends on:** R1. **Files:** new `apps/demo/src/app/mechanisms/{graph,layout,svg}.ts` (pure, no DOM),
`apps/demo/src/app/views/mechanisms.ts`; one entry in Explore's nav (Q12); `app.css`; tests.
- [ ] Unit (pure): `forward(registry, trigger)` returns the reachable subgraph; SCCs collapsed (D5); generations
  (D6); stable ordering.
- [ ] DOM (happy-dom): for propofol, the SVG holds the nodes "Propofol Ce", "SVR", "Venous unstressed volume",
  "Baroreflex" (a loop box), "MAP"; the G_HS edge is drawn FIT-or-ENG with its tag shown on hover/focus; the ABSENT
  autonomic edge is dashed with "research/44 L2-01"; the legend's words are present.
- [ ] e2e: `#/explore/mechanisms` loads, the trigger picker lists the six, choosing one draws, the page prints one
  A4 page without clipping (Playwright `page.pdf` page count 1 for the six).
**Acceptance:** the instructor can open the page and read the static tree for six triggers; this PR is useful alone.

### R2: The registry for every module (plan 24 h · 3.0–4.0 executor-h; four PRs in parallel)

**Depends on:** R1. One PR per group, each emptying its part of the `unregistered` list: **R2a** circulation,
endocrine, thermal; **R2b** lungs, gas, breathing, ventilator link; **R2c** blood, organs (brain, kidney, liver);
**R2d** drugs bus and neuro (depth, drive, NMB). Each adds the triggers whose paths it completes (T2).
**Acceptance:** each group's seams registered; `unregistered` for that group empty; its model-doc pages carry the
Couplings section. After R2d the census reads 0 unregistered seams.

### T2: The trigger list and the observable list (plan 5 h · 0.6–0.8 executor-h)

**Depends on:** R1 (grows with R2). **Files:** `couplings/triggers.ts`, `couplings/observables.ts`.
- Triggers, generated from the code's own lists, not typed by hand: the drug rows (`DRUG_IDS`, 65 rows at 563e32d5,
  counted) as bolus, infusion, TCI and vaporiser kinds (`PkClinicalEvent`, `types-pk.ts`); circulation events (bleed,
  fluid, the four circulation conditions `tamponade`, `pe`, `tensionPtx`, `rvInfarct`, `circ/conditions.ts`); the 32
  lung conditions (`LUNG_CONDITIONS`, `data/lung-pathology.ts`); endocrine events (sepsis, meal, thermal); organ
  commands; rhythm changes; device actions (shock, pacing); ventilator settings through the link
  (`types-vent-link.ts`); instructor `setTarget` (MODELED: a target the model then answers; Q7).
- Observables: the monitor numerics (`mon.*`, the console's monitor group, `physiology-console/organs.ts`) in this
  plan; waveform features later (Q9).
- [ ] Test: every trigger kind reachable from the command types has a node; a trigger with no outgoing row is listed
  as "no coupling registered" on the page (visible, not hidden).

### L1: Live contributions from the engine (plan 14 h · 1.8–2.3 executor-h)

**Depends on:** R1. **Files:** `engine.ts` (option `couplingHz`, the emit beside `truth`), a recorder in
`couplings/recorder.ts`, the effector sites of R1's rows (record calls only), `types.ts` (the `couplings` event).
- [ ] **Tests first:** (1) with `couplingHz` 0 the determinism suite is unchanged; (2) with it on, every other event is
  identical over a 10 min propofol + bleed run; (3) **exactness:** at every emitted instant, for the systemic
  resistance, `Σ ln(factor_i) = ln(p.rSys / base.rSys)` to 1e-12 (the identity of `model.ts:330`), and the same for
  each product effector; for sums, `Σ term_i = effector − base`; (4) β-block: after esmolol the baroreflex HR edge's
  effective gain falls by the occupancy the drug model reports, and the edge reports `blocked` = that occupancy;
  (5) saturation: in a 40 % bleed the sympathetic edge reports clamp active when `|e_s|` reaches `SYMP_SAT`
  (`baroreflex.ts:24`); (6) no record from `speculate()` passes.
- [ ] **Measure** the engine step time with `couplingHz` 1 vs 0 over 30 min (median of 3) and the event size; both
  in the PR, against the home tile's "ms per tick" meter.
**Acceptance:** exact effector shares available at `couplingHz` ≤ 2 `[P-4]`, with no change to the patient.

### L2: The live view and the window (plan 10 h · 1.3–1.7 executor-h)

**Depends on:** L1, T1. **Files:** `mechanisms/live.ts` (pure), `views/mechanisms.ts`.
- [ ] Unit: given a window of `couplings` events, each edge's sign (from the factor's side of 1 or the term's sign),
  its magnitude (the window mean of `ln f` or of the term, in the effector's unit), its delay (the registry's
  `delay` + `tau`, read from the code, shown as the declared delay, never estimated), its dimming (blocked fraction;
  saturated flag).
- [ ] The window scrubber (Q10): "now" is the engine's sim time; a window of 10 s to 10 min `[P-3]`; paused = frozen;
  during a fast-forward the window advances in sim time and the page redraws at most at 2 Hz wall `[ENG: the
  console's throttle, explore.ts uses 500 ms]`.
- [ ] Edges from an effector to an observable carry no live number in this piece (their share is not separable from
  the dynamics); they show "see backward read" (B1).
- [ ] DOM: esmolol then a bleed: the baroreflex → HR edge dim, the → SVR edge full; e2e on the route with
  `couplingHz` on.
**Acceptance:** live mode draws the six triggers' trees with exact effector shares and dimming.

### B1: The backward read (plan 14 h · 1.8–2.3 executor-h)

**Depends on:** L2. **Files:** `mechanisms/backward.ts` (pure ranking), `mechanisms/knockout.worker.ts`,
`views/mechanisms.ts`.
- [ ] Unit (ranking): from an observable over a window, walk the registry upstream; at each effector rank the
  incoming edges by the exact share from L1; depth limited to `[P-1]` generations past the observable; edges whose
  share is below `[P-2]` of the effector's change collapsed into "n smaller"; loops as boxes (D5); the path to every
  trigger applied in or before the window highlighted (triggers from the session's applied commands).
- [ ] **Knock-outs, on request:** for the top `[P-5]` upstream edges, a worker restores the snapshot at or before the
  window's start (a bookmark, or a snapshot the page took on opening; Q11), neutralises one edge, runs to the window's
  end and reports Δ at the observable. The page shows each Δ, their sum, and the observed change, with the remainder
  "interaction (the shares do not add)" when they differ (anti-goal 3). Unit test: on a fixture with a pure product
  and no feedback, the knock-out Δ equals the effector share's prediction; with the baroreflex on, the test asserts
  the remainder is reported, not hidden.
- [ ] Measure: wall time of one knock-out over a 120 s window (median of 3), in the PR.
**Acceptance:** "MAP fell" over a chosen window opens a ranked tree back to the trigger, with loops boxed and
knock-out Δs where asked.

### D1: From the debrief (plan 10 h · 1.3–1.7 executor-h)

**Depends on:** B1; Debrief 2 merged. **Files:** `record.ts` (a new `keeps` word `couplings`: the 1 Hz effector
shares, Q11), `views/debrief.ts` (a "Why?" link on each key moment and mark), `views/mechanisms.ts` (open at a time),
`debrief.css` print rules.
- [ ] Unit: the record keeps the shares at 1 Hz on the kept course, and a return to a bookmark undoes them as it undoes
  rows (`record.ts:402–405`); an older file without `couplings` in `keeps` says "not recorded in this file".
- [ ] DOM: a key moment's link opens the backward tree for the moment's observable (the moment's own: MAP for a
  pressure moment, SpO2 for a desaturation) over the 60 s `[P-6]` before it; a mark opens it at the mark's time with
  the observable chosen by the facilitator.
- [ ] Print: "Add to the debrief" on a tree puts it, static, into the printed report (Q15); e2e page count.
- [ ] Knock-outs offered only while the session that made the record lives (the snapshots are in it); from a file,
  the effector shares only, and the page says so.
**Acceptance:** from the Debrief, a marked moment opens its backward tree; the chosen trees print.

### V1: Validation cells to edges (plan 8 h · 1.0–1.3 executor-h)

**Depends on:** R2 (all), B1. **Files:** `couplings/audit.ts`, a generated `docs/validation/coupling-map.md`, the
Validate page's row link.
- [ ] Each audit class-B finding (research/44, 48 rows) is either the `absent` id of an ABSENT row or the audit id on
  a FIT row's note; a test reads research/44's table and fails on a class-B id the registry does not carry (the file is
  listed in `scripts/ci/docs-tests.mjs`).
- [ ] Each red or amber validation row with a trigger and an observable (the sanity suite's rows, the known misses)
  gets "Show the path": the backward tree for that row's observable in that row's scenario, with every FIT and ABSENT
  edge on it listed beside the row in `coupling-map.md`.
**Acceptance:** the 48 class-B findings appear as branches; a red cell links to the edges that would have to change
for it to turn green.

## 8. Partition, merge order, CI load

```
R0 ─► R1 ─┬─► T1 ─────────────┐
          ├─► R2a ┐           │
          ├─► R2b ├─► (R2 all)┼─► V1
          ├─► R2c │           │
          ├─► R2d ┘           │
          ├─► T2 (grows with R2)
          └─► L1 ─► L2 ─► B1 ─┴─► D1 (after Debrief 2)
```

| PR | Pieces | Plan h (est.) | Executor-h (÷8 – ÷6) | CI runs (PR + main) | Depends on | The owner's own time |
|---|---|---|---|---|---|---|
| 1 | R0 census + R1 registry for six triggers + T1 static page | 30 | 3.8–5.0 | 1 + 1 (+ validation) | — | Q1, Q2, Q8, Q12, Q13; reads the page |
| 2a–2d | R2 per group (+ T2 rows for its triggers) | 24 + 5 | 3.6–4.8 in all | 4 + 4 | PR 1 | — |
| 3 | L1 engine contributions | 14 | 1.8–2.3 | 1 + 1 (+ validation) | PR 1 | Q3 |
| 4 | L2 live view | 10 | 1.3–1.7 | 1 + 1 | PR 3 | Q10 |
| 5 | B1 backward read + knock-outs | 14 | 1.8–2.3 | 1 + 1 | PR 4 | Q4, Q5, Q6 |
| 6 | D1 debrief link and print | 10 | 1.3–1.7 | 1 + 1 | PR 5; Debrief 2 | Q11, Q15 |
| 7 | V1 validation map | 8 | 1.0–1.3 | 1 + 1 | PRs 2a–2d, 5 | Q14 |
| **All** | | **≈ 115** | **≈ 14–19** | **≈ 20 + re-merges** | | |

- **PR 1 is useful on its own:** the static tree of six triggers, the registry's first rows, and the census that
  counts what is not yet registered. It combines R0, R1 and T1 because R1's check needs R0 and T1 is what makes R1
  visible; if the orchestrator prefers the lean cut, R0 + R1 (engine, docs) and T1 (app) split into two PRs.
- **Critical path:** 1 → 3 → 4 → 5 → 6. PRs 2a–2d run in parallel with 3–5 (they touch `couplings/<module>.ts`
  files only; the shared `index.ts` is one line per module).
- **CI:** PRs 1, 2a–2d and 3 touch the engine and run the engine's groups and the validation workflow; PRs 4–7 run the
  browser suites. The run length after PR #279 (ci-faster) was not measured for this plan.
- **Files shared:** `engine.ts` (PR 3 only), `record.ts` (PR 6 only), `views/mechanisms.ts` (PRs 1, 4, 5, 6),
  `scripts/model-docs.ts` (PR 1 only).

## 9. Dependencies and out of scope

- **research/44 L2-61 (the `[ENG]` / `[FIT]` split).** Without it the registry can still class an edge FIT from the
  variant tags (`[ENG, fit …]`, `[ENG fit]`), but 771 `[ENG` lines in `engine-core/src` do not say which are fits.
  The tree will draw them "ENG (fit or not: unsplit)" until the split lands (Q2). The split is its own brief, ideally
  before PR 2a–2d.
- **Debrief 2** must be merged before PR 6 (its key moments and marks are what PR 6 links from).
- **The EEG stage** (`stage-eeg-depth-of-anaesthesia.md`) adds a cortical state; its rows join R2d when it merges.
- **The autonomic hub** (research/44 correction item 4) changes the circulation's edges; the registry rows change in
  the same PR as the hub, and the ABSENT rows it replaces go.
- **Out of scope:** MANUAL mode's coupling rules (Q7); waveform features as observables (Q9); a learner view; any
  edge's numbers; per-beat (sub-second) contributions; sensitivity analysis beyond single-edge knock-outs (pairs and
  Shapley-style shares are not proposed: their cost grows with the square or the factorial of the edge count).

## 10. Questions for the owner (each with the options and the planner's proposal, which is the default)

| # | Question | Options | Proposal (default) |
|---|---|---|---|
| Q1 | Where do the couplings come from? | (a) a registry inside the engine, each mechanism declaring inputs, output, sign, delay, saturation and source, the docs and the tree generated from it, CI checking the code against it; (b) derive the graph from the code by static analysis of which fields each module reads and writes; (c) a hand-written graph in docs | **(a), with (b) as its CI check** (D1). (b) alone costs least (≈ R0's 4 plan h) but gives no sign, delay, saturation or source and cannot see a coupling inside one function (`model.ts:330` is seven edges on one line). (c) drifts the day after it is written. (a) costs R1 + R2 (≈ 38 plan h, estimate) and makes the audit's ENG/FIT discipline a property of the graph: an edge is FIT because its constant is tagged FIT. |
| Q2 | Until the ENG/FIT split (research/44 L2-61) lands, how does the tree class an unsplit `[ENG]` edge? | (a) "ENG (unsplit)", its own legend entry; (b) treat every `[ENG]` as FIT; (c) wait for the split before PR 1 | **(a)**, and the split briefed before PRs 2a–2d. (b) would mislabel device and display constants (class C, 37 rows); (c) delays the first useful page. |
| Q3 | How are live weights computed? | (a) the engine reports each coupling's factor or term at its effector each committed pass (exact), plus knock-out runs from a snapshot for effector → observable (exact counterfactuals); (b) the page estimates contributions from recorded state by finite differences (no engine change, approximate, wrong under saturation) | **(a)** (D4). (b) is excluded by "mechanisms first": a difference quotient through a saturated baroreflex reads zero where the edge is in fact pinned at its clamp, and it cannot split a product's factors at all. |
| Q4 | Knock-out shares do not add when reflexes interact. How are they shown? | (a) each edge's Δ, their sum, the observed change and the remainder labelled "interaction"; (b) normalise to 100 % | **(a)**. (b) hides the very reflex the teaching is about. |
| Q5 | How deep does the backward read go, and what is cut? | depth `[P-1]` generations; collapse edges below `[P-2]` of the effector's change | **4 generations and 5 %** `[ENG: readable on one A4 page; both adjustable on the page]`. Your call on the defaults. |
| Q6 | How are loops (baroreflex, chemoreflex, the respiratory CO2 loop) drawn? | (a) one loop box with its feedback arrow and its live error, outflow and clamp; (b) unrolled into generations up to the depth limit | **(a)** (D5). (b) repeats the same nodes and implies a sequence the loop does not have. |
| Q7 | MANUAL mode? | (a) the page says "MANUAL: the instructor sets these values; fixed coupling rules keep them consistent" and draws only those rules later; (b) draw MANUAL's M-rules now | **(a)**: MODELED first. The M-rules are few (`l1/state.ts:16`, `gas/coupling.ts`) and are not physiology. |
| Q8 | The six triggers of PR 1 | haemorrhage, propofol bolus, phenylephrine bolus, esmolol bolus, tension pneumothorax, PEEP change; or yours | **These six**: they cross the circulation's products, both reflex loops, the drug bus, the intrathoracic seam and β-blockade, and the audit's top finding sits on all of them. |
| Q9 | Observables | (a) monitor numerics first, waveform features (R→foot delay, notch, pulse-pressure variation) after V1; (b) both now | **(a)**. Waveform features need nodes inside the arterial model that research/44 item 2 says are themselves a miss (EMD 0, resonator notch). |
| Q10 | Time on the live page | "now" = the engine's sim time; window 10 s–10 min `[P-3]`; paused = frozen; fast-forward advances in sim time, redraw ≤ 2 Hz wall | **As stated.** |
| Q11 | Replay from a debrief mark | (a) the record keeps the effector shares at 1 Hz (`keeps: couplings`), so a debrief from a file has them; knock-outs only while the session lives; (b) live session only; (c) also store seed and snapshots in the record so knock-outs work from a file | **(a)**. (c) changes what a record is (today it holds no seed or snapshot, §3.4) and is its own decision; size of (a) is measured in PR 3 against a budget `[P-7]`. |
| Q12 | Where the page lives | `#/explore/mechanisms`, the last entry of Explore physiology's left nav, its own view module; or a rail entry of its own | **`#/explore/mechanisms`.** The Home page has no Explore section (§3.3); "beneath Explore the physiology" is read as beneath that page. |
| Q13 | Persian | labels matched at SVG-string build through `fa-match.mjs`, new entries `reviewed: false`, the draft line shown while any is unread | **As stated** (the DOM pass skips SVG text, `fa-dom.ts:6–7`). |
| Q14 | Absent mechanisms | (a) ABSENT rows, each tied to an audit or brief id, a test that every class-B id is carried; (b) leave absent mechanisms out (the tree simply lacks the branch) | **(a)**. This is the one hand-written part of the graph; it is tied to research/44 by test so it cannot drift silently. (b) makes "the tree does not show it" indistinguishable from "nobody looked". |
| Q15 | The tree on the printed debrief | (a) only the trees the facilitator adds; (b) one per key moment automatically | **(a)**. A report with a tree per moment runs to pages nobody reads. |

### 10.1 Placeholders for the owner

| Id | What | Plan default | Where it would come from |
|---|---|---|---|
| P-1 | Backward depth (generations past the observable) | 4 `[ENG]` | the owner's teaching use |
| P-2 | Collapse threshold (share of the effector's change) | 5 % `[ENG]` | the owner |
| P-3 | Live window range | 10 s – 10 min `[ENG]` | the owner; the console's histories are 60 s (`model.ts:1–2`) |
| P-4 | `couplingHz` | 1 Hz (allowed 0–2, as `truthHz`, `engine.ts:289`) | PR 3's measured cost |
| P-5 | Knock-outs per request | top 5 edges `[ENG]` | PR 5's measured wall time |
| P-6 | Window before a key moment | 60 s `[ENG]` | the owner |
| P-7 | Record size budget for `couplings` | not set | PR 3's measured event size × case length |

## 11. Self-review against the codebase (563e32d5)

| Claim | File and line |
|---|---|
| Model docs parse state types, numeric constants, comment "relations" by regex | `scripts/model-docs.ts:1–14`, `:70–79`, `:101`, `:103–144` |
| Modules and their source prefixes | `scripts/model-modules.ts:21–43` |
| No exported registry/graph/edges/couplings constant; no "coupling graph" in source | search of `packages/`, `apps/`, `scripts/` (none) |
| Pass order pk → neuro → resp → blood → endo → organs → hemo | `packages/engine-core/src/engine.ts:655`, `:687`, `:695`, `:700`, `:703`, `:714`, `:715` |
| Circulation externals written by the engine; 30 `ext` fields | `engine.ts:657–663`; `l2/circ/model.ts:179` on |
| CBF reaches the lungs one step late | `engine.ts:699` |
| SVR as a seven-factor product | `l2/circ/model.ts:330` |
| β-block into the baroreflex; chemoreflex multipliers | `model.ts:315`; `model.ts:264–272` |
| Baroreflex form, `G_HS` 0.04 [ENG within 0.01–0.02], `SYMP_SAT` | `l2/circ/baroreflex.ts:1–7`, `:13`, `:24` |
| Organ pipeline rates | `l2/organs/pipeline.ts:1–7` |
| L1 schema, coupled truths | `l1/state.ts:22–44`, `:54`, `:70–74` |
| Truth event 0–2 Hz, 2 100-leaf cap | `engine.ts:288–290`, `:517`; `truth.ts:6–12` |
| Look-ahead; committed-only precedent | `engine.ts:336`, `:476`, `:518`; `:503` |
| Console host interface (snapshot, restore, pause, timeScale) | `apps/demo/src/physiology-console/view.ts:11–21` |
| Explore sections and routing; Explore is a rail page | `app/views/explore.ts:30–46`; `router.ts:1`, `:6`, `:15`; `rail.ts:47`; `shell.ts:24` |
| Home has no Explore section | `app/views/home.ts:1–5`, `:44–54` |
| Key moments from the record; mark kinds | `app/debrief-moments.ts:1–10`; `packages/controller/src/protocol.ts:126` |
| Record contents, `keeps`, no seed or snapshot | `app/record.ts:1–20`, `:91–113` |
| Bookmarks are engine snapshots in the live session | `packages/controller/src/session/host-session.ts:52–53` |
| SVG as a string; print rules | `views/debrief-swimlane.ts:1–12`, `:245`; `views/debrief.css:151`, `:307` |
| Persian matcher, `reviewed`, SVG text untouched | `app/i18n/fa-dom.ts:1–14`, `:23` |
| FF spans 120/300 s, `FF_WALL_MS` 10 000 | `app/fast-forward.ts:18–21` |
| 65 drug rows; 32 lung conditions; 4 circulation conditions | `DRUG_IDS`, `LUNG_CONDITIONS`, `CIRC_CONDITIONS` loaded and counted |
| 771 `[ENG` lines, 0 `[FIT` in `engine-core/src` | `grep -rn` counts |
| Audit counts: 180 findings, 48 class B; 818 exact `[ENG]` in packages/apps | research/44 summary |

Disagreements found while reading:
1. **The brief places the page under "the Home page's section" (README line 15).** Home has no such section; README
   line 15 lists "Explore physiology" as one of the app's pages, and that page (`#/explore`) has a section nav. The plan
   reads the ruling as "beneath the Explore physiology page" (Q12).
2. **The audit counts 818 exact `[ENG]` markers in `packages/` and `apps/`; this plan counted 771 lines containing
   `[ENG` in `engine-core/src` alone.** These are different scopes and patterns (research/44 counts the exact tag across
   packages and apps, and 205 variants separately); neither number is used for sizing. R0 measures the seams instead.
3. **The truth event cannot carry live weights.** The brief's option (b) for live weights (finite differences on the
   recorded state) would read the truth tree, which holds no per-step factor (§3.1 item 4). It is not only approximate;
   for a product effector it has nothing to split.
4. **A debrief from a file cannot replay.** The record has no seed and no snapshot (§3.4), so "replay from a debrief
   mark" is possible only while the session lives, unless the record grows (Q11).

Not verified: the engine step-time cost of `couplingHz` (PR 3 measures it); the wall time of a knock-out (PR 5); the
seam count (R0); whether every effector in the lungs and organs is a clean product or sum as the circulation's is
(R2 finds out, and a non-separable effector is recorded as such, with no share).
