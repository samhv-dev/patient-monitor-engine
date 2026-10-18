# Debrief redesign for the demo: "B via A", the learner handout, `pme-debrief/2` — Implementation Plan

**STATUS: REVIEWED-FIXED 2026-10-18 21:30 (+0330); amended 2026-10-18 23:30: E52–E55 (owner's answers; E53 and E61 as defaulted; v2 kept as `scratch/plans-backup/debrief-redesign.v2-before-e52-amend.md`); amended 2026-10-18 23:45: E56–E60 (v3 kept as `scratch/plans-backup/debrief-redesign.v3-before-e56-amend.md`); amended 2026-10-19 00:50: E60 verdict ("dash when pulseless", `scratch/plans-backup/spo2-pulseless-check.md`; v4 kept as `scratch/plans-backup/debrief-redesign.v4-before-e60-verdict.md`); amended 2026-10-19: model-docs guard (v5 kept as `scratch/plans-backup/debrief-redesign.v5-before-model-docs.md`).** The independent review
(`scratch/plans-backup/debrief-redesign-plan-review.md`, verdict FIX FIRST, 21 fixes) has been applied, together with
the orchestrator's rulings (1)–(13) on it; v1 is kept as `scratch/plans-backup/debrief-redesign.v1-before-review.md`.

**Base and preconditions.**
- Written 2026-10-18 (planner). Base: `origin/main` 57695b42 (#76), read in the detached worktree
  `scratch/wt-debrief-plan` (removed after planning).
- Open PRs that touch the same files and merge BEFORE this plan starts:
  - #77 (FX-13 span rounding: `debrief.ts`, `debrief.test.ts`, `debrief-fa.mjs`);
  - #80 (FX-18: the typing guard; adds `apps/demo/e2e/fx18-shortcuts-typing.e2e.ts`, which types in `.db-notes`);
  - #75 (Persian footer: `debrief-fa.mjs --version`, `fa-debrief.json`, `kit-round-a.kitround.ts`).
- #74 (Stage 14) merges either before A0 or after the rc.2 tag, never between A and B (Merge calendar).
- Every `file:line` below is on 57695b42 and is a starting point only: find the code by the function name given.
  Stage 14 rewrites the comments in these files.
- Untracked plan file; the executors copy it to their branch as the first commit.
- Planning only: no product file was changed while writing this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal.** Before the build freeze (Tuesday 20 October 18:00, tag `v1.0.0-rc.2`; moved to Wednesday 21 October 12:00 only
by the E57 "close" test at Tuesday 17:30), the Debrief:
- reads like a facilitator's report: the key times first, the course with numbered key moments, the objectives with
  their intervals drawn;
- shows what the monitor read at each key moment;
- uses the owner's verdict words;
- can print a learner handout without verdicts;
- exports `pme-debrief/2`.

Two safe points come before B:
- **A-GREEN** (Monday evening): option A — the look, the words, the schema bump, the Persian words.
- **FALLBACK_SHA** (Tuesday ≈ 07:45): the rc.2 version-bump merge, the last green main commit containing A. It is the
  tag point if B does not land.

**B** (computed content and the handout) lands on top on Tuesday, or not at all. The owner's rulings E41–E51 are
binding.

**Architecture.** Everything new is computed from what the run record keeps today (`record.ts`):
- the 1 Hz samples of HR, MAP, SpO₂, EtCO₂, RR, temperature and five labs;
- rows for states, alarm raises, actions, drugs and fluids, pulse loss and return, notes (including the instructor's
  "Objective met: …" tick), and bookmarks;
- the scenario document itself (`RunData.doc`).

Systolic, diastolic, CVP and alarm end times are NOT recorded and are NOT shown (that is option C, after the demo).

Where the work lives:
- **Arithmetic:** one new pure module, `apps/demo/src/app/debrief-moments.ts` (no DOM), unit-tested on the recorded
  tamponade run of kit round A3.1.
- **The course strip:** one new SVG builder, `apps/demo/src/app/views/debrief-course.ts` (a string from data; no
  DOM state).
- **The view:** `views/debrief.ts` + `debrief.css` draw it. The view is split into re-rendered containers and static
  nodes, so Notes and Run by are never rebuilt (Decision 11).
- **The export:** the JSON carries it as `pme-debrief/2`, and the Persian handout script reads `/1` and `/2` behind a
  version switch.
- **The scenario format** gains two optional fields, additive within `pme-scenario/1`:
  - `objectives[].debrief` (`"recognition"` | `"discuss"`);
  - a document-level `takeHome` (fixed sentences the owner confirmed).

**Tech Stack.** TypeScript strict, Vitest, Playwright (chromium + webkit projects), pnpm 9.15.9 (`npx -y pnpm@9.15.9`),
Node ≥ 22.12, and GitHub Actions `ci.yml`. A CI run takes ≈ 45 min (measured 18 October: 39128898486 45 min,
39121033080 44 min, 39112120136 45 min); a run is 13–15 jobs against the public repository's 20 concurrent jobs, so
two runs at once queue. Persian: the `persian-writing` skill and the Vazirmatn fonts the script already uses.

**Spec.**
- The brief: `scratch/briefs/plan-debrief-redesign.md` (with E41–E51).
- The review: `scratch/plans-backup/debrief-redesign-plan-review.md` and the orchestrator's rulings on it
  (`research/00-orchestrator-rulings.md`, 2026-10-18 evening).
- Design: `research/33-debrief-redesign-research.md` (D, E, F); mock-ups in `_sandbox/debrief-redesign-mockups/`
  (`option-a-*`, `option-b-*`, `option-c-*`, `README.txt`).
- Code context: `docs/plans/stage-13-debrief.md` (Q1–Q7, R50 I-1..I-4, R56).
- Run context: `docs/showcase/SHOWCASE-2-RUN-SHEET.md` §4, `SHOWCASE-2-CUE-CARDS.md` card 3,
  `SHOWCASE-2-PRESENTER-GUIDE.md`.

---

## Global Constraints

- **Paths** are relative to the repository root (`/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`)
  unless stated. Worktrees: `../scratch/wt-debrief-a`, `../scratch/wt-debrief-b`. Never edit the main checkout (it is
  276 commits behind `origin/main`).
- **Freeze week.** Every PR gets an independent read-only review before merge (R-A, R-B). Merges to `main` are serial,
  with `main`'s own CI green between merges. Only the orchestrator merges or tags. No merge after Tuesday 18:00, except B in the Wednesday branch (E57,
  G5): then nothing but B merges until the Wednesday 12:00 tag.
- **Merge calendar** (orchestrator ruling 12).
  - From A's merge to B's merge, main takes only three PRs: A (Monday ≈ 18:00), the version bump (Tuesday ≈ 07:00) and
    B (Tuesday ≈ 16:15). No other PR merges in that window, and other PRs do not run CI during CI-1 … CI-6.
  - #74 (Stage 14) merges before A0 if its CI allows it tonight or early Monday. Otherwise it merges after the rc.2
    tag. The orchestrator decides at 08:00 Monday and says which in the A0 note.
    - **Branch 1, #74 before A:** A starts on top of it, and the Debrief e2e is `apps/demo/e2e/debrief.e2e.ts`.
    - **Branch 2, #74 after the tag:** A and B start without it, and the Debrief e2e is
      `apps/demo/e2e/stage13-debrief.e2e.ts`. #74 is rebased onto main after the tag, by its own executor, and its
      conflicts with this plan are its own.
  - In both branches, find files with `git ls-files apps/demo/e2e | grep -i debrief`. Never trust a file name written
    here.
- **No version literals.** No test in this plan writes the version literally. A9 changes the Debrief e2e to build the
  footer string from the renderer's exported `version`, so the rc.2 bump (Task V) does not touch the Debrief e2e and
  conflicts with neither A nor B.
- **New tests and the retry rule** (orchestrator ruling 13; Stage 14's CI step "e2e tests that passed only on retry"):
  - every new e2e test passes 3 of 3 local runs on both projects before the push;
  - a new test is never tagged `@known-flaky`;
  - new tests go after the existing Debrief test, whose title and line stay unchanged (`known-deviations.md` rows key
    on it).
- **Print.**
  - A4 portrait.
  - Chrome: the footer on every page by `@page` margin boxes (`views/debrief.ts` `PAGE_CSS`).
  - Safari: the footer line at each block end (`.db-runfoot`, R50 I-4; a platform limit, kept).
  - The footer text stays exactly `For education only. Not a medical device and not clinically validated: never use
    it for patient care. Version <v>[ (pre-release)], build <build>.` (`views/debrief.ts` `FOOT`), on every page of
    the facilitator report AND of the learner handout.
- **Words.**
  - No claim of clinical validation anywhere.
  - Public text says "a later release" for future work.
  - No generated clinical sentences (E46): every sentence on paper is computed fact (times, values, event words
    already in the glossary), or fixed text listed in "For the owner".
  - Clinical fixed text (the take-home lines) prints only in the owner's confirmed words. Without his answer, there
    are blank lines (orchestrator ruling 10).
- **Colour (E45).**
  - Two print accents only: Okabe–Ito blue `#0072B2` = team and vermillion `#D55E00` = patient.
  - Each always has a shape (■ team, ● patient) and a visible legend in words.
  - Verdict chips are black/grey with glyphs and words.
  - `-webkit-print-color-adjust: exact; print-color-adjust: exact` goes only on elements that carry an accent or a
    fill.
- **Stable selectors** that the kit-round reader and the e2e use stay, with the same meaning:
  - `#db-objectives li[data-status]` (`met` / `not met` / `not assessable`);
  - `#db-facts dt/dd`, `#db-timeline tbody tr`, `#db-minutes tbody tr`, `.db-foot`, `.db-notes`, `#db-who`;
  - the buttons "Print or save as PDF" and "Download the record (JSON)";
  - `h1` named "Debrief".

  New ones are added, never renamed: `#db-keytimes`, `#db-course`, `#db-moments`, `#db-pearls`, `#db-handout`,
  `li[data-mark]` (`observed`, `not-observed`, `not-assessable`, `discuss`).
- **Shared machine.** One local e2e or kit-round run at a time. Never an unfiltered `pkill`. Never a command that waits
  on stdin (`--reporter=list`; `CI=1` where a tool would prompt).
- **Model-docs guard (Stage 14, merged).** `packages/validation/test/model-docs.test.ts` fails CI's build job when
  any `docs/model/*.md` page (rendered from the code and its comments) or `docs/validation/known-misses.md` is stale
  against the source. PR #77 hit it with a one-line comment change. So, before every push that follows a change to
  source files (code or comments, tests included), the executor runs:

```bash
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md     # regenerated pages, if any
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after <task>"   # only if the status listed files
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
```

  Expected: the test passes, with 0 stale pages and 0 orphans. A regenerated page is committed as
  `docs(model): regenerate after <task>` (for example `after A9`, `after V`, `after B6`). Never edit a `docs/model`
  page by hand outside its hand blocks. This step is in A9 Step 4, Task V and B6 Step 4.
- **Local PDF text.** Every local e2e command that reads PDF text is prefixed with `PME_PDF_TEXT=1`, because the
  Debrief e2e reads PDF text only on macOS or with that variable (`stage13-debrief.e2e.ts:122`).
- **Persian.**
  - Every new Persian string is produced with the `persian-writing` skill.
  - Register: formal academic. Clinical values use Western digits; counts and dates use Persian digits; abbreviations
    stay Latin; drug names are in Persian script.
  - Times inside a Persian sentence use the typed `{t}` placeholder of `debrief-fa.mjs`, so they stay LTR Western
    digits.
  - Entries carry `"reviewed": false` and a `source`, and are listed for the owner.
- **Pace assumption** (orchestrator ruling 3). Executor hours below run at ≈ 2× on agents (≈ 13 executor-h of A in
  09:00–15:30), and the timeline depends on it. The Monday 13:00 checkpoint (Task A, "Scope-cut rule") is where it is
  tested.

---

## Review Focus

1. **A fact that is not in the record.**
   - Expected: every number in the tiles, the course strip and the key-moments table traces to a row or a sample of
     `RunData` (Task B1's definitions table).
   - An absent value prints `–`. A tile whose ends are absent is not printed, except the recognition tile, which prints
     `–` "not ticked" when its objective exists but was not ticked (E44, "never a guess").
   - Pinned by `debrief-moments.test.ts` on the A3.1 fixture (exact values in B1) and by the e2e.
2. **A generated sentence (E46).**
   - Expected: the only new prose is the fixed strings in "For the owner". The take-home lines come verbatim from the
     scenario file's `takeHome`, and only the owner's confirmed words reach that file.
   - The reviewer greps the diff for template literals that build sentences in `views/debrief.ts`: only labels,
     times and values may be interpolated.
3. **A verdict on the learner handout (E51).**
   - Expected: in handout print mode the visible text contains none of `Observed`, `Not observed`, `Not assessable`,
     `Discuss`, `✓`, `✗`, `◆`, nor any objective text.
   - Pinned by a DOM-level page-content e2e on BOTH projects, which runs on Linux CI (B6 (e)), and by the Chromium PDF
     text locally.
4. **`/1` readers broken.**
   - Expected: `debrief-fa.mjs` renders the committed `/1` fixtures as before (same page count; `0 strings without
     translation` where it was 0), and renders `/2` exports with `0 strings without translation`.
   - Pinned by A7 Step 4 and G2.
5. **Stale verdict words in the showcase docs** (bare glyphs included).
   - Expected: the grep of A9 Step 3 prints no line. `– Not assessable` is still a valid word (E42) and is not
     searched for.
6. **Print regressions.**
   - Expected: Chrome footer on every page; a Safari footer line at each block end; no chart split; the undone course
     struck through.
   - Page counts as the breaks allow (Decision 12): free run ≤ 4 pages (today 5); tamponade A ≤ 6, B as measured in
     B6 (expected 6–7); learner handout 1 page; page 1 of B within 267 mm on A3.1 and on MH.
   - Pinned by the updated Debrief e2e (both projects; DOM height checks in B6 (f)).
7. **Notes / Run by rebuilt while typing.**
   - Expected: `.db-notes` and `#db-who` are created once and never re-appended by `render()`.
   - Pinned by #80's `fx18-shortcuts-typing.e2e.ts` and B6 (g), both projects.

---

## Decisions this plan makes where the brief or the rulings were silent

1. **"◆ Discuss" comes from a scenario field.** A new optional objective field, `"debrief": "discuss"` (schema
   `definitions.objective.properties.debrief: { enum: ["recognition", "discuss"] }`; `types.ts`
   `Objective.debrief?`), set on the tamponade's "Better: …" objective only (`showcase-tamponade.json:13`).
   - A `discuss` objective that is NOT met prints **◆ Discuss**; met, it prints **✓ Observed**.
   - The JSON status stays `met` / `not met` (E42), and `/2` carries `discuss: true`.
   - Rejected: inferring "structural" from the rule kind `never` (implicit; it would catch future safety rules).
2. **The recognition tile (E44) comes from the same field:** `"debrief": "recognition"`, on the rule-less objectives
   that ARE recognition:
   - tamponade "Name the tamponade…" (`:9`);
   - anaphylaxis "Recognise anaphylaxis…" (`:9`);
   - bronchospasm "Recognise bronchospasm…" (`:9`);
   - malignant hyperthermia: a NEW hand-tick objective (no rule), "Name malignant hyperthermia", added by A1 as the
     first objective of `showcase-mh.json` (before today's `:9`) (E52, owner 2026-10-18).

   The first three are plain strings today. Haemorrhage gets no flag (E52). The tile:
   - reads the first kept note row whose text is `Objective met: <that objective's words>` (written by the Scenario tab
     tick, `panel/scenario.ts:112`, with `drugWords(o)`; matched as `debrief.ts:180` matches it);
   - is an interval from time 0;
   - with no tick, shows `–` "not ticked";
   - in a scenario with no recognition objective, is absent.
3. **A ticked RULE-LESS objective (E44)** prints **✓ Observed** with the fixed reason "Observed by the instructor at
   mm:ss.". Only when the objective has no `rule` (a rule's own "not assessable", e.g. "the run ended before …", keeps
   its reason and its `– Not assessable`).
   - JSON status stays `not assessable` (E42), with a new `tickedT` (seconds).
   - `data-status` stays `not assessable`; `data-mark` is `observed`.
4. **`pme-debrief/2`** (A writes the whole shape; B fills `keyTimes` and `keyMoments`, which are `[]` in A). An
   exported TS type `DebriefExport` in `debrief.ts`:

```ts
type DebriefExport = {
  schema: 'pme-debrief/2'; version: string; build: string;
  record: RunData;                                   // unchanged from /1
  objectives: Array<{ text: string; discuss?: true; verdict: Verdict & { tickedT?: number; measure?: { fromT: number; toT: number; askedS: number } } }>;
  facts: Fact[];                                     // unchanged from /1
  keyTimes: Array<{ id: 'recognition' | 'firstTeam' | `objective:${number}` | 'pulseLostToCpr' | 'pulseless';
                    label: string; fromT: number | null; toT: number | null; askedS?: number; totalS?: number;
                    state: 'measured' | 'notTicked' | 'noneAfter' }>;   // pulseless: totalS, fromT = first loss, toT = null
  keyMoments: Array<{ n: number; t: number; who: 'team' | 'patient' | 'scenario'; text: string;
                      values: { hr: number | null; map: number | null; spo2: number | null; etco2: number | null }; // as recorded, unrounded, EXCEPT spo2: null while pulseless (E60)
                      pulseless: boolean;            // pulseLoss.t ≤ t ≤ rosc.t (E60); says why spo2 is null
                      alarms: string[] }>;           // all moments; the 12-row cap is the view's
  minutes: ReturnType<typeof perMinute>;            // unchanged from /1
};
```

   - `version` is the renderer's `version` (#75's `j.version ?? --version` then needs no flag for `/2`).
   - `measure` is set on an `eventWithin` verdict that found both events.
   - Version switch: `debrief-fa.mjs` accepts `/1` (the recorded fixtures) and `/2`. The app writes only `/2` and reads
     no file.
   - The kit-round reader reads the DOM (`kit-round-a.kitround.ts:274–279`); it saves the JSON but does not parse it.
   - The demo's Persian handouts must come from `/2` exports (G2), not from the committed `/1` files, because `/1`
     renders the old words.
5. **The learner handout is a separate print mode (E51, E55).**
   - A third button, "Print the learner handout", sets `data-print="handout"` on the view, calls `window.print()`, and
     clears it on `afterprint`.
   - `#db-handout` is a direct child of `.page`. In handout mode only it and `.db-foot` print; in the normal print it
     does not print.
   - On screen it is shown at the end of the view under its own heading.
6. **Take-home text (E51, E53).** A document-level optional `takeHome: string[]` (≤ 3) in the scenario file.
   - It is written ONLY with the owner's confirmed words.
   - With no answer by Tuesday 12:00 there is no field, and the handout prints "Your take-home points" with blank lines.
7. **Course strip trends (E56, RULED by the owner: the same four for every case):** HR, MAP, SpO₂, EtCO₂, in that
   order. A trend never measured in the run is left out.
   The six-trend page stays as page 3+ with the same numbered markers.
8. **Numbered markers** (B) are the key moments in time order, 1…n: the same numbers in the strip, on each trend chart
   and in the key-moments table. A4 (if not cut) gives the charts unnumbered markers first.
9. **FX-20 (A8)** is attempted only on a side branch (no reset). Its e2e is valid against the diagnosis; if it is not
   green within 1 h, the side branch is left unmerged and FX-20 goes to a separate PR after the demo.
10. **Fallback** (orchestrator ruling 1). The rc.2 tag goes on the last green main commit that contains A. That is
    FALLBACK_SHA, the version-bump merge (Task V), unless B lands green. If B has merged and main's CI is not green by
    17:30, the tag still goes on FALLBACK_SHA, and B is reverted by a PR after the tag, at no deadline. No CI run is
    needed on the fallback path.
11. **The view's structure** (review fix 7). `render()` (every 5 s) rebuilds only two containers:
    - `#db-live-1`: the header band's title and sub-line TEXT, key times, the course, objectives, key moments, facts;
    - `#db-live-2`: trends, drugs and fluids, timeline, bookmarks, the appendix, and the handout's dynamic parts.

    Between them sit static nodes created once in `debriefView()`: the Run by input (`#db-who`), `#db-pearls` and
    `#db-notes`. `render()` never re-creates or re-appends them. The header sub-line shows the Run by text through a
    `span.db-runby`, updated on the input's `input` event and on each render.
12. **Page breaks** (review fix 5; orchestrator ruling 5).
    - The forced breaks before trends and the appendix stay.
    - `#db-moments` has a forced break only when there is at least one key moment. Otherwise facts, PEARLS and Notes
      follow page 1.
    - The Expected page counts are what these breaks allow (Review Focus 6). The ≤ 3-page free run of v1 was not
      reachable.

---

## Partition and ordering

```
Sun night → Mon 08:00  orchestrator: #77, #80, #75 rebased/merged in order (≈ 8 CI runs, review answer 6); #74 per
                       the Merge calendar (decided at 08:00 Mon)
Mon 19 Oct  08:00 plan copy; 09:00 Task A0 (Executor 1)
            09:00–15:30 Executor 1: A1 → A2 → A3 → A5 → A7 → A9 (A4, A6, A8 per the scope-cut rule); one commit per task
            ≈ 11:00 A1 pushed → Executor 2: B1, the course SVG builder (B3a), B5a schema/types, B7a Persian entries
                   file (new files and schema only; never views/debrief.ts or debrief.css on Monday)
            13:00 CHECKPOINT (scope-cut rule)
            15:30 PR "debrief-a" → CI-1 ‖ review R-A (≤ 1.5 h); 16:30 latest PR open, else B is cancelled this week
            17:00–17:45 B1 + B3a pre-review (reviewer, read-only, 45 min)
            17:15 R-A fixes pushed → CI-2 ; 18:00 orchestrator merges A → main CI-3 → green ≈ 18:45 = A-GREEN
            19:00 orchestrator: Task V PR rebased on A-GREEN → CI-V1 ; the owner's list sent (A PR body + B7a file +
                  "For the owner")
Tue 20 Oct  07:00 orchestrator merges Task V → main CI-V2 green ≈ 07:45 = FALLBACK_SHA
            08:00 Executor 2: rebase debrief-b onto main (A + V); B2, B3b, B4, B5b, B6 (Executor 1 helps on B6/B8 docs)
            12:00 the owner's answers → B8 ; 12:30 PR "debrief-b" → CI-4 ‖ review R-B
            14:15 R-B fixes pushed → CI-5 = the FINAL head H (nothing pushed after, except a gate-failure fix)
            14:30–15:30 Task G on a kit built from H (G1–G3 outputs to scratch and _sandbox, not to the branch)
            16:15 (latest 16:30) CUT-LINE CHECK (G4) → merge B → main CI-6 completed and green by 17:30
            17:30 tag rc.2 at main (B) if CI-6 green; if B is NOT merged, the E57 CLOSE TEST (G5):
                  all hold → the freeze moves to Wed 12:00 (Wednesday branch below); any fails → FALLBACK_SHA tagged 18:00
            18:00 FREEZE (unless the Wednesday branch)
Wed 21 Oct  (Wednesday branch only) B merges as soon as its final CI is green (latest 10:00) → main CI ≈ 45 min →
            tag rc.2 at main if green, else at FALLBACK_SHA, by 12:00 ; kits rebuilt and the automated rehearsal
            (G1) on the tag in the afternoon ; the owner's smoke check Wednesday evening
After the tag  docs PR: gate note, kit-round rc2 evidence, late owner answers, Persian PDFs list; the B revert PR if needed
```

- Executor 2 touches only new files and the schema/types on Monday (after A1). The two executors never edit the same
  file on the same day.

---

## File map

| File | A | V | B | What changes |
|---|---|---|---|---|
| `packages/controller/scenarios/pme-scenario-1.schema.json` | ✓ | | ✓ | A: `objective.debrief` enum. B: document `takeHome` (≤ 3 strings) |
| `packages/controller/src/scenario/types.ts` | ✓ | | ✓ | `Objective.debrief?`, `ScenarioDoc.takeHome?` |
| `showcase-tamponade.json`, `showcase-anaphylaxis.json`, `showcase-bronchospasm.json` | ✓ | | ✓ | A: `debrief` flags (three plain-string objectives turned into objects). B: `takeHome` only with confirmed words |
| `showcase-mh.json` | ✓ | | ✓ | A: a new first objective "Name malignant hyperthermia …" with `"debrief": "recognition"` (E52). B: `takeHome` only with confirmed words |
| `apps/demo/src/app/debrief.ts` | ✓ | | ✓ | A: `measure`, `discuss`, `tickedT`, `/2` + `DebriefExport`. B: fills `keyTimes`, `keyMoments` |
| `apps/demo/src/app/debrief-moments.ts` (new), `debrief-moments.test.ts` (new) | | | ✓ | pure: `whoOf`, `keyMoments`, `keyTimes` |
| `apps/demo/src/app/views/debrief-course.ts` (new) | | | ✓ | the course strip SVG builder (pure) |
| `apps/demo/src/app/views/debrief.ts`, `views/debrief.css` | ✓ | | ✓ | A: containers + static nodes, header band, chips, markers, page flow, PEARLS, accents. B: pages 1–2, handout mode |
| `apps/demo/src/app/debrief.test.ts`, `debrief-showcase.test.ts`, controller schema tests | ✓ | | ✓ | the `/2` keys, new fields, negative schema tests |
| the Debrief e2e (`git ls-files apps/demo/e2e \| grep -i debrief`) | ✓ | | ✓ | marks, layout, footer from `version`, handout, page counts, DOM checks |
| `scripts/showcase/debrief-fa.mjs`, `docs/showcase/i18n/fa-debrief.json`, `docs/showcase/i18n/README.md` | ✓ | | ✓ | version switch; words |
| `scripts/showcase/kit-round-a.kitround.ts` | ✓ | | ✓ | A: `data-mark`. B: tiles, moments, the tick step, the handout PDF |
| `docs/showcase/SHOWCASE-2-RUN-SHEET.md`, `-CUE-CARDS.md`, `-PRESENTER-GUIDE.md` | ✓ | | ✓ | words (E42/E43), print-dialog line (E50), the tick step, page counts |
| `docs/guides/scenario-authoring.md`, `CHANGELOG.md` | ✓ | ✓ | ✓ | the new fields; one `### Changed` list under Unreleased; V: the rc.2 header |
| `packages/*/src/index.ts`, `engine-core/src/version.ts`, version tests, `validation/package.json`, `apps/demo/e2e/iife-smoke.e2e.ts`, `vent-embed.e2e.ts`, `CITATION.cff` | | ✓ | | `1.0.0-rc.1` → `1.0.0-rc.2` (as f8b4e077 did for rc.1) |

`packages/engine-core` (except its version string), `apps/demo/src/app/record.ts` (read only) and the renderer do not
change.

---

## Effort, CI load, and who does what

| Task | Executor h | CI / machine | Needs the owner | Who |
|---|---|---|---|---|
| A0 launch gate + SpO₂ check | 1.0 | one browser probe ≈ 5 min | the SpO₂ note (list) | Executor 1 |
| A1 scenario flags, verdict fields, `/2` | 2.0 | unit ≈ 2 min | — | Executor 1 |
| A2 verdict words and marks | 1.0 | — | words already ruled | Executor 1 |
| A3 containers + static nodes, header band, accents | 2.0 | fx18 e2e both ≈ 2 min | — | Executor 1 |
| A4 event markers (cut first) | 1.5 | — | — | Executor 1 |
| A5 page flow, grey set-up rows | 1.0 | — | — | Executor 1 |
| A6 PEARLS box (cut second) | 0.5 | — | the four prompts | Executor 1 |
| A7 Persian switch + verdict words (+ PEARLS words, cut third) | 2.0 | fa PDFs ≈ 2 min | Persian words | Executor 1 |
| A8 FX-20 on a side branch (optional) | ≤ 1.0 | 1 e2e ×3 both ≈ 6 min | — | Executor 1 |
| A9 tests, kit-round reader, docs, PR | 2.0 | e2e both ≈ 6 min; **CI-1, CI-2, CI-3** | — | Executor 1 |
| R-A review | (1.5) | — | — | reviewer |
| **A** | **≈ 14 h (≈ 7 h wall)** | **3 runs** | | |
| V version bump (orchestrator) | 0.5 | **CI-V1 (PR), CI-V2 (main)** | — | orchestrator |
| B1 `debrief-moments.ts` + tests (Mon) | 4.0 | unit ≈ 1 min | — | Executor 2 |
| B3a course SVG builder (Mon) | 1.5 | unit ≈ 1 min | — | Executor 2 |
| B5a schema/types `takeHome` (Mon) | 0.5 | controller tests ≈ 2 min | — | Executor 2 |
| B7a Persian entries file (Mon) | 1.0 | — | Persian words (19:00 list) | Executor 2 |
| B1/B3a pre-review | (0.75) | — | — | reviewer |
| B2 `/2` fills keyTimes/keyMoments | 0.5 | — | — | Executor 2 |
| B3b page 1 wiring: tiles, strip, objective bars, legend | 2.5 | — | tile captions | Executor 2 |
| B4 page 2: key moments | 1.5 | — | — | Executor 2 |
| B5b learner handout mode | 2.0 | — | handout wording, take-home | Executor 2 |
| B6 tests (e2e ×3 both, kit-round) | 2.5 | e2e both ≈ 10 min ×3 | — | Executors 2 + 1 |
| B7b merge the entries into the table | 0.5 | fa PDFs ≈ 2 min | — | Executor 2 |
| B8 owner answers, docs, PR | 1.0 | **CI-4, CI-5 (PR), CI-6 (main)** | answers by Tue 12:00 | Executor 2 |
| R-B review | (1.5) | no local e2e 14:30–15:45 | — | reviewer |
| G gate (G1–G4) | 3.0 | kit ≈ 4 min; A3 ×2 ≈ 15 min; Q1 chromium ≈ 35 min; fa ≈ 3 min | look at the PDFs (optional) | Executor 1 |
| **B + G** | **≈ 23 h (Mon 7 h + Tue 16 h; ≈ 3.5 + 8 h wall)** | **3 runs** | | |
| **Plan total** | **≈ 37.5 executor-h + ≈ 4 reviewer-h** | **8 CI runs (A 3, V 2, B 3), ≈ 45 min each, none on the fallback path**; before Monday 09:00 the orchestrator's ≈ 8 predecessor runs | owner ≈ 45 min | |

**Scope-cut rule (Monday, orchestrator ruling 3).**
- **13:00 checkpoint:** if A1, A2, A3 and A7's verdict words are not all committed, cut in this order, one at a time,
  until the A PR can open by 15:30:
  1. **A4** (the markers; B3 draws numbered ones anyway);
  2. **A6** (the PEARLS box moves into B4);
  3. **A7 beyond the verdict words** (the PEARLS entries and the Persian PEARLS rendering move to B7a/B7b; still this
     week, E59).
- **A8:** runs only if A1–A7 are committed by 14:00.
- **A5 Step 2** (grey rows) goes with A4 if A4 is cut.
- **16:30:** if the A PR is not open, B is cancelled for this week. A-GREEN then lands Tuesday morning, and the
  orchestrator tells the owner at once.

---

## Tasks

### Task A0: Launch gate, worktree, branch, the SpO₂ check

**Files:** none changed.

- [ ] **Step 1: The predecessors are on main.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin --tags
for b in fix-fx13-span fix-fx18-shortcuts-editable fix-fa-footer stage-14; do
  printf '%s ' "$b"; gh pr list --state merged --search "head:$b" --json number --jq 'length' ; done
git ls-files --with-tree=origin/main apps/demo/e2e | grep -i debrief
gh pr list --state open --json number,headRefName --jq '.[] | "\(.number) \(.headRefName)"'
```

Expected:
- `fix-fx13-span 1`, `fix-fx18-shortcuts-editable 1` and `fix-fa-footer 1`. A `0` among these three STOPS the plan;
  report to the orchestrator.
- `stage-14` is `1` (Branch 1) or `0` (Branch 2), matching the orchestrator's 08:00 decision.
- Exactly one Debrief e2e path. Record it as `$E2E` for this plan.
- The open PRs listed. None merges before B (Merge calendar).

- [ ] **Step 2: Worktree and branch; the plan as the first commit.**

```bash
git worktree add -b debrief-a ../scratch/wt-debrief-a origin/main
cd ../scratch/wt-debrief-a
cp ../../repo/docs/plans/debrief-redesign.md docs/plans/debrief-redesign.md
git add docs/plans/debrief-redesign.md && git commit -m "docs(plans): the Debrief redesign plan (B via A, E41–E51)"
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/debrief.test.ts src/app/debrief-showcase.test.ts
```

Expected: install clean; both files pass. Note the test counts (the baseline for the PR body).

- [ ] **Step 3: The E60 verdict is present.** The owner's "check the model before Tuesday" (E60) was answered by a
  separate read-only physiology check. Its verdict: `scratch/plans-backup/spo2-pulseless-check.md`, first line
  `VERDICT: dash when pulseless`.

  What the check found:
  - the screen never showed a clean 99: the SpO₂ tile read "99?" (questionable) with LOW PERF, before the pulse loss
    and through CPR, in screenshots at 08:06, 08:10 and 09:03;
  - the recorder keeps the value and drops the flag (`record.ts:166`).

```bash
head -1 ../scratch/plans-backup/spo2-pulseless-check.md
```

  Expected: `VERDICT: dash when pulseless`. Copy that line into the A PR body. No screenshot step is needed. If the
  file is missing, STOP and ask the orchestrator: B4's rule depends on it.

### Task A1: Scenario flags, verdict fields, `pme-debrief/2`

**Files:** `pme-scenario-1.schema.json`, `scenario/types.ts`, `showcase-tamponade.json`, `showcase-anaphylaxis.json`,
`showcase-bronchospasm.json`, `apps/demo/src/app/debrief.ts`, `debrief.test.ts`, `debrief-showcase.test.ts`, the
controller schema test.

- [ ] **Step 1: Red first.** In `debrief.test.ts`, add tests that check:
  - (a) `JSON.parse(debriefJson(d, 'b'))` has `schema === 'pme-debrief/2'` and `version === version` (`import { version }
    from '@pme/renderer'`);
  - (b) an objective with `debrief: 'discuss'` carries `discuss: true` and keeps status `not met`;
  - (c) a RULE-LESS objective with a matching `Objective met: …` note at t = 130 has `verdict.tickedT === 130` and
    status `not assessable`, while a rule's `not assessable` verdict with a matching note gets no `tickedT` (Decision 3);
  - (d) an `eventWithin` verdict carries `measure` equal to the times its reason line prints;
  - (e) `keyTimes` and `keyMoments` are `[]`.

  Update the existing expectations:
  - `debrief.test.ts:185`: the key list becomes `['schema','version','build','record','objectives','facts','keyTimes','keyMoments','minutes']`;
  - `:186`: `/2`;
  - `:144`: the ticked rule-less objective gains `tickedT: 140`.

  In the controller's scenario-validation tests, add two negative tests: an unknown `debrief` value is refused; four
  `takeHome` lines are refused (the second after B5a; write it now as `it.todo`, and B5a turns it on).

  Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/debrief.test.ts`. Expected: the new tests and
  the three updated expectations are red; the rest pass.
- [ ] **Step 2: Schema, types, flags.**
  - Schema: `definitions.objective.properties.debrief = { "enum": ["recognition", "discuss"], "description": "Optional:
    how the Debrief uses this objective — recognition (its instructor tick is the time to recognition) or discuss (a
    structural lesson: ◆ Discuss when not met)." }`.
  - Types: `Objective.debrief?: 'recognition' | 'discuss'` with the same one-line doc.
  - The three recognition objectives are plain strings today (tamponade `:9`, anaphylaxis `:9`, bronchospasm `:9`).
    Turn each into `{ "text": "<the same words>", "debrief": "recognition" }`.
  - Tamponade objective 5 (`:13`) gains `"debrief": "discuss"`.
  - **MH (E52):** in `apps/demo/src/app/showcase/showcase-mh.json`, insert a new first objective at `:9` (before "Call
    the MH crisis …"; the existing `:9`–`:13` move down one line):
    `{ "text": "Name malignant hyperthermia from the monitor: EtCO₂ above 45 mmHg at the same ventilation, tachycardia (instructor-assessed)", "debrief": "recognition" }`.
    The words follow the card's own state label (`earlySigns`, "Early signs: EtCO₂ rising at the same ventilation,
    tachycardia") and the tamponade objective's "(instructor-assessed)" form. They are listed for the owner (item 9).
    **Amended at A1 (orchestrator ruling, 2026-10-18 23:50):** `showcase-cards.test.ts` requires a digit in every
    objective of the new showcase cards, so "EtCO₂ rising" became "EtCO₂ above 45 mmHg", the card's own `earlySigns`
    threshold (objective 2 and the transition). The test is unchanged.
    Every MH objective index after it shifts by one. Update the tests and docs that count or index MH objectives:
    `git grep -n "showcase-mh\|Call the MH crisis" -- apps scripts docs/showcase/SHOWCASE-2-*.md`, among them the run
    sheet's MH Debrief line (`SHOWCASE-2-RUN-SHEET.md:454`, which now starts with the new objective) and
    `debrief-showcase.test.ts` (MH verdicts).
  - Run `npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run` and
    `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/showcase src/app/copy.test.ts src/app/showcase.test.ts`.
  - Expected: green (the object form goes through `objectiveText`). A test that deep-compares objective arrays moves
    to the object form; it is never weakened.
- [ ] **Step 3: `debrief.ts`.**
  - `Verdict` gains `measure?`. Set it in the `eventWithin` branch where `b` exists (`debrief.ts:126`:
    `{ fromT: a.t, toT: b.t, askedS: rule.withinS }`).
  - `objectives()` (`:176`) returns `{ text, discuss?: true, verdict }`, with `verdict.tickedT` only for a rule-less
    objective (`typeof o === 'string' || !o.rule`). The existing `why` sentence stays (the Persian template covers it).
  - Export `type DebriefExport` (Decision 4). `debriefJson()` writes it with `keyTimes: [], keyMoments: []`. Its
    comment says what `/2` holds.
  - Expected: Step 1 green.

  Commit `feat(debrief): pme-debrief/2 — the version, discuss and recognition flags, the tick time and the measured interval`. **Push now** (Executor 2 branches from this commit).

### Task A2: Verdict words and marks (E42, E43, E44)

**Files:** `views/debrief.ts`, `views/debrief.css`.

- [ ] **Step 1.** Replace `MARK` (`views/debrief.ts:25`) with `markOf(o)`:

| Condition | `data-mark` | Prints |
|---|---|---|
| `met` | `observed` | `✓ Observed` |
| `not met` and `discuss` | `discuss` | `◆ Discuss` |
| `not met` | `not-observed` | `✗ Not observed` |
| `not assessable`, rule-less, `tickedT` set | `observed` | `✓ Observed` and the reason `Observed by the instructor at mm:ss.` (replaces the printed `why` in this case only) |
| `not assessable` | `not-assessable` | `– Not assessable` |

  Keep `data-status`. Chips (`.db-chip`):
  - observed: solid border;
  - not observed: solid, bold;
  - not assessable: dashed, grey;
  - discuss: grey fill `#ececec` with `print-color-adjust: exact`.

  Drop the underline rule (`debrief.css:18`).
- [ ] **Step 2.** Expected on A3.1: `– Not assessable` (no tick), then `✓ Observed`, `✓ Observed`, `✓ Observed`,
  `◆ Discuss`. Commit.

### Task A3: Containers and static nodes, header band, accents

**Files:** `views/debrief.ts`, `views/debrief.css`.

- [ ] **Step 1: Structure (Decision 11).** `body` becomes `#db-live-1` and `tail` becomes `#db-live-2`.
  - `#db-who`, the new `#db-pearls` slot (filled by A6, or by B4 if A6 is cut) and `#db-notes` are created once in
    `debriefView()` and placed between the two containers.
  - `render()` only calls `replaceChildren` on the two containers.
  - Regression: `npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fx18-shortcuts-typing.e2e.ts --project=chromium --project=webkit --reporter=list`.
    Expected: green.
- [ ] **Step 2: Header band** (in `#db-live-1`).
  - The existing `<h1 id="db-h">Debrief</h1>` keeps its accessible name "Debrief", styled as a small capital kicker
    `DEBRIEF · SIMULATED CASE` (the second half is an `aria-hidden` span).
  - Under it, the scenario title as `div.db-title`.
  - One sub-line: `<patient> · <mm:ss> simulated (<span> on the clock) · <date> · Run by: <span class="db-runby">`.
    The span is filled from `#db-who` on render and on its `input` event.
  - In print, the `#db-who` field is hidden (its text prints in the sub-line). On screen it stays where it is.
  - Thick rule under the band.
- [ ] **Step 3: Accents.** CSS tokens `--db-team: #0072B2; --db-patient: #D55E00;`.
  - In `@media print`, narrow the blanket rule (`debrief.css:47`) so that it no longer overrides the discuss chip,
    `.db-team`, `.db-patient` and the SVG markers.
  - Give those `-webkit-print-color-adjust: exact; print-color-adjust: exact;`.
  - Expected: in Chrome's print preview the accents appear only on markers, who-labels and the legend.
  - In the A-only fallback the A3.1 path shows no blue: A4's rule has no team markers there, as the A4 Expected below
    shows. Say so in the PR body for the owner (review answer 1).

  Commit.

### Task A4: Event markers on the trend charts (cut first at 13:00)

**Files:** `views/debrief.ts` (`chart()`, `:31`), `views/debrief.css`.

- [ ] **Step 1.** `chart()` takes `marks: Array<{ t: number; who: 'team' | 'patient' | 'scenario' }>` and draws a thin
  dashed vertical line per mark with a small shape on top: ■ team (blue), ● patient (vermillion), │ scenario (grey).
  - A visible legend line above the first chart: `■ team action · ● patient event · │ scenario state`.
  - The `↺` return line stays.
- [ ] **Step 2.** One rule, from the kept rows:
  - `pulseLoss` and `rosc` are patient;
  - `drug:`, `fluid`, `shock` and `cpr` rows of kind `action` or `remote` are team;
  - every other `state:` row except the run's first state is scenario.

  B replaces these marks with the numbered key moments.

  Expected on A3.1: grey at 06:13, 07:49, 07:51, 09:21, 10:57 and 11:27; vermillion at 07:48 and 10:55; no team marker
  (the path has no `action` drug row). Commit.

### Task A5: Page flow and grey set-up rows

**Files:** `views/debrief.ts`, `views/debrief.css`.

- [ ] **Step 1.** Remove `#db-timeline` from the forced break (`debrief.css:53`): drugs, timeline and bookmarks share
  a page. Trends and the appendix keep their breaks. The `runFoot()` before the timeline (`views/debrief.ts:134`)
  moves to after the bookmarks.
  - Expected (Chromium, measured in A9): the free run ≤ 4 pages (today 5: meta/facts; trends; drugs + timeline +
    bookmarks + PEARLS + notes; appendix).
  - The tamponade A3.1 path ≤ 6 (today 6).
- [ ] **Step 2** (goes with A4 if A4 is cut). A timeline row is set-up when its `kind` is `action`, `remote` or
  `scenario`, it has no `ev`, and its text is not `Scenario loaded: …`. It gets class `setup`, printed grey `#666`
  with the words unchanged.
  - Expected on A3.1: "Speed ×8", "All alarms on", "Breathing spontaneously", "Tracheal tube in place" and
    "Ventilator: …" are grey.

  Commit.

### Task A6: PEARLS prompt box (E46: fixed text; cut second at 13:00)

- [ ] `#db-pearls` "Talking points", in the static slot of A3 (before Notes): four bordered boxes titled Reactions ·
  Description · Analysis · Summary.
  - The fixed prompts of "For the owner" item 2, as constants in one `PEARLS` array, with no interpolation.
  - `break-inside: avoid`.
  - Commit.

### Task A7: Persian — version switch, new verdict words (E47, E48)

**Files:** `scripts/showcase/debrief-fa.mjs`, `docs/showcase/i18n/fa-debrief.json`, `docs/showcase/i18n/README.md`.

- [ ] **Step 1.** `debrief-fa.mjs` accepts `pme-debrief/1` and `pme-debrief/2` (the schema check, `:429` on #75's
  branch; its error message names both). Add `markOf(o, schema)`:
  - `/1` keeps today's `MARK`/`ICON`;
  - `/2` follows A2's table, with two icons: ◆ (filled diamond), and ✓ for an instructor tick.

  The header comment says: `/1` and `/2`. `/2` adds `version`.
  - **E59 (RULED by the owner: yes, this week):** the Persian handout prints the PEARLS box. It goes in the English
    report's order (after the bookmarks, before Notes): the title `Talking points` and four boxes, each with a phase
    name and its prompt, all from the table. The prompts are fixed text, so no template is needed.
  - `keyTimes`, `keyMoments` and the learner handout are not rendered in Persian this week (E48).
- [ ] **Step 2.** Table entries (`persian-writing` skill; `"reviewed": false`; `"source": "apps/demo/src/app/views/debrief.ts (Debrief redesign A)"`):
  - `Observed`, `Not observed`, `Discuss`;
  - the template `Observed by the instructor at {t}.` (typed `{t}`);
  - the new MH objective's text (E52), in the `objectives` group as the other objective texts are (without it the
    Persian MH handout prints one English line, and G2 fails).

  These are the verdict words: never cut. Also add `Talking points`, `Reactions`, `Description`, `Analysis`,
  `Summary` and the four prompts (E59: printed in the Persian handout this week), with the `persian-writing` skill.
  They go on the owner's list as item 10 by Monday 19:00. If A7's Persian beyond the verdict words is cut (third in
  the cut order), Executor 2 produces these entries and the Persian PEARLS rendering in B7a/B7b on Monday, so
  item 10 still goes out at 19:00.
- [ ] **Step 3.** `docs/showcase/i18n/README.md:4` names the export as `pme-debrief/1`. It becomes: "schema
  `pme-debrief/2` (`/1` exports are still read)". Add one line: "new sections in Persian: a later release".
- [ ] **Step 4.** Regression on `/1`:

```bash
F=docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json
node scripts/showcase/debrief-fa.mjs "$F" --version 1.0.0-rc.1 --out-dir ../scratch/fa-a 2>&1 | tail -3
```

  Expected: the same page count as the committed `.fa.pdf` beside it (6) and `0 strings without translation`. Then run
  the script on the `/2` export saved by A9 Step 1. Expected: `0 strings without translation`; in the `.fa.txt` (with
  `--text`), the instructor line keeps its time in Western digits.

  Commit.

### Task A8: FX-20 on a side branch (optional; only if A1–A7 are committed by 14:00; time-box 1 h)

Diagnosis (R00 2026-10-18 ~20:20; review answer 11): `record.ts:91` (the constructor's `emptyRun`), then `:96` (the
first `timeline` event), then `reset()` at `:200` gives a new `startedAt`. `views/debrief.ts:101–104` then clears the
notes at the next 5-s render.

- [ ] **Step 1.** `git switch -c debrief-a-fx20` (from `debrief-a`'s head). The e2e, after the existing Debrief test:
  - (i) open the app directly at `#/debrief`, type `kept` in `.db-notes` within 2 s, wait 7 s, and expect `kept`;
  - (ii) then load a scenario from the Scenario tab, wait 6 s, return to `#/debrief`, and expect `.db-notes` empty.

  Expected: (i) red (FX-20), (ii) green.
- [ ] **Step 2.** In `render()`, keep `lastSeen = d.rows.length + d.samples.length` of the run it last drew, updated
  on EVERY render. On a new `startedAt`, clear the notes only if `lastSeen > 0`.
  - Expected: (i) and (ii) green, 3 of 3 runs, both projects.
- [ ] **Step 3.** If green within the hour, `git switch debrief-a && git merge --ff-only debrief-a-fx20`. Otherwise
  leave `debrief-a-fx20` unmerged and say "FX-20: separate PR after the demo" in the A PR body. No reset, no
  force-push.

### Task A9: Tests, kit-round reader, docs, CHANGELOG, PR

- [ ] **Step 1: The Debrief e2e (`$E2E`).** Update each assertion, keeping its intent:
  - the marks become `['not assessable','– Not assessable'], ['met','✓ Observed'], ['not met','✗ Not observed']` on
    anaphylaxis;
  - `j.schema` becomes `/2`;
  - the footer literal (`:94`, `:132`) is built from `version` (`import { version } from '@pme/renderer'` in the spec,
    or read from `.db-foot`), so Task V does not touch this file;
  - the layout expectation: `timeline: 'auto'`, and the `runFeet` count re-measured;
  - the page assertion (`:121`, `≥ 5`) becomes `≥ 4` (Decision 12; never removed);
  - "Measured facts on page 1" (`:130`) stays true in A;
  - the PDF text list: `✓ Observed`, `✗ Not observed`, `– Not assessable` and (unless A6 is cut) `Talking points`.

  Add a new test after the existing one: the free run (open the app, ×8, 25 s wall ≈ 3 sim-min, open the Debrief,
  `page.pdf()` in Chromium), with page count ≤ 4. Save a `/2` export to `test-results/debrief-a.json` for A7 Step 4.

```bash
PME_PDF_TEXT=1 npx -y pnpm@9.15.9 exec playwright test "$E2E" --project=chromium --project=webkit --reporter=list   # 3 times
```

  Expected: all pass, 3 of 3, both projects.
- [ ] **Step 2: Kit-round reader.** In `kit-round-a.kitround.ts` `debrief()`, add `mark: x.getAttribute('data-mark')`
  per objective.
- [ ] **Step 3: Docs.** The lines that quote the old words:
  - `SHOWCASE-2-CUE-CARDS.md:106–107`, `:132–133` ("the one ✗");
  - `SHOWCASE-2-PRESENTER-GUIDE.md:38–41`, `:54` ("– ✓ ✓ ✓ ✗", "6 A4 pages");
  - `SHOWCASE-2-RUN-SHEET.md:19`, `:34`, `:39`, `:367–378`, `:386–390`.

  Rewrite them with the new marks and E43's "one line to discuss" (◆). Add E50 at the print step: **"In the print
  dialog, untick Headers and footers (Chrome: More settings; Safari: Show Details → Print headers and footers)."**
  Also update `docs/guides/scenario-authoring.md` (the `debrief` field) and `CHANGELOG.md` (one `### Changed` entry
  under Unreleased).

```bash
git grep -n -E "✓ Met|✗ Not met|one ✗|only ✗|✓ ✓ ✓ ✗|✗ \*?\*?\"?Better" -- 'docs/showcase/SHOWCASE-2-*.md' 'apps/**'
```

  Expected: no line.
- [ ] **Step 4: Full local check, PR.**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run && npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md     # regenerated pages, if any
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after A9"   # only if the status listed files
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
git diff --stat origin/main...HEAD | tail -1          # expected ≈ 0.8–1.2 k lines
gh pr create --draft --base main --head debrief-a --title "Debrief A: verdict words, header band, pme-debrief/2, Persian words" --body-file <scratchpad>/pr-a.md
```

  Expected: green; model-docs: 0 stale pages, 0 orphans (Global Constraints); the draft PR open; **CI-1** starts.
  The same model-docs run precedes the R-A fix push (CI-2). The PR body carries:
  - the base (Branch 1/2) and the diff stat;
  - the unit-test counts against A0's baseline;
  - the e2e `--reporter=list` output of both projects;
  - the A3.1 marks;
  - the free-run and A3.1 page counts;
  - the Chromium PDF and a WebKit print-media screenshot (attached or in `../scratch/debrief-a-evidence/`);
  - FX-20's result;
  - the cut items, if any;
  - the Persian words added;
  - the A0 SpO₂ finding;
  - the "no blue on A3.1 in A" note.

**Review point R-A** (read-only; brief `scratch/briefs/review-debrief-a.md`, written by the orchestrator before
15:30): Review Focus 2, 4, 5, 6, 7 on the diff.
- Fixes are pushed (**CI-2**).
- The orchestrator merges, and main CI (**CI-3**) green means **A-GREEN**.
- Executor 1 records the sha in `../scratch/debrief-gate-rc2/gate-note.md` §A. The note lands in the post-tag docs
  PR as `docs/gates/debrief-redesign.md`.

### Task V: The rc.2 version bump (orchestrator ruling 2)

- [ ] Monday ≈ 16:00, the orchestrator (or an executor it names) branches `release-rc2` from `origin/main`.
  - Replace `1.0.0-rc.1` with `1.0.0-rc.2` in the files f8b4e077 touched for rc.1 (`git show --stat f8b4e077`), plus
    `CITATION.cff`, `apps/demo/e2e/vent-embed.e2e.ts:43` and any `release-versions.test.ts` expectation.
  - Add a `CHANGELOG.md` header `## [1.0.0-rc.2] — 2026-10-20` over the Unreleased lists.
  - Do NOT touch the Debrief e2e (A9 de-literalised it).
  - `git grep -n "1\.0\.0-rc\.1" -- packages apps CITATION.cff ':!**/kit-round-a/**'` → only historical lines.
  - Run `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts` → green.
  - Commit `chore(release): version 1.0.0-rc.2 in every library package`.
  - The model-docs guard (the version strings sit in `packages/*/src`, so the pages may render them):

```bash
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md     # regenerated pages, if any
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after V"   # only if the status listed files
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
```

    Expected: 0 stale pages, 0 orphans.
- [ ] Monday 19:00: rebase onto A-GREEN, run the model-docs guard again (A's source changes are now under it), then
  open the PR (**CI-V1**).
- [ ] Tuesday 07:00: merge; main **CI-V2** green ≈ 07:45 = **FALLBACK_SHA**, recorded in the gate note §A with its run
  id.

### Task B1: `debrief-moments.ts` — key moments and key times, pure (Executor 2, Monday)

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo     # after A1 is pushed
git fetch origin && git worktree add -b debrief-b ../scratch/wt-debrief-b origin/debrief-a
```

**Files:** `apps/demo/src/app/debrief-moments.ts` (new), `debrief-moments.test.ts` (new). Define `kept` locally (it
is not exported from `debrief.ts:24`, and A owns that file on Monday). Import only what `debrief.ts` already exports
(`mmss`, `span`, `isEvent`, `endOf`, `objectives`, `facts`).

**Definitions** (all from `RunData`):

| Fact | Computed from | Absent → |
|---|---|---|
| `whoOf` for a `state:<id>` row | `doc.states.find((s) => s.id === prev)?.transitions` with `to === id`: all `when.manual` → `team`; any other kind → `patient`; none (an instructor jump) → `scenario` | the run's first state is not a moment |
| Key moments | kept `state:` rows (not the first), `pulseLoss` and `rosc` rows (patient), and `drug:` / `fluid` / `shock` / `cpr` rows of kind `action` or `remote` (team). Rows of kind `scenario` without `state:` (a state's own `onEnter`) are not moments | — |
| Moment text | the row text without the `Scenario state: ` prefix (`record.ts:105`). Two patient moments within 3 s merge: texts joined with ` · `, the second shortened to its words before `:` | — |
| Moment values | HR, MAP, SpO₂, EtCO₂: the sample at `⌊t⌋` if non-null, else the first non-null within `⌊t⌋+1 … ⌊t⌋+3`; unrounded in the JSON, rounded by the view. **SpO₂ is `null` when the moment is pulseless** (E60): `pulseLoss.t ≤ t ≤ rosc.t`, both ends included, by `pulselessAt` (B4); `pulseless: true` on the moment | `null` (the view prints `–`) |
| Moment alarms | texts of kept `alarm` rows with `prev.t < row.t ≤ moment.t + 0.5` (prev = the previous moment; the first moment from −∞) | `[]` |
| `recognition` | the objective with `debrief: 'recognition'` → its `tickedT` | objective but no tick: `state: 'notTicked'`; no such objective: no entry |
| `firstTeam` | the first `team` moment, from 0 | no entry |
| `objective:<i>` | `verdict.measure` of objective i; `label` = the objective text | no entry |
| `pulseLostToCpr` | the first `pulseLoss`, then the first `cpr` row at or after it | `state: 'noneAfter'`, `toT: null` |
| `pulseless` | the `facts()` sum (`debrief.ts:234–243`) as `totalS`, `fromT` = the first loss | no pulse loss: no entry |

Order: recognition, firstTeam, objective tiles (document order), pulseLostToCpr, pulseless; at most six. A generic tile
whose `fromT`/`toT` equal an objective tile's is dropped, and the objective tile kept.

- [ ] **Step 1: Red.** Fixture: `docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json`
  (a `/1` export: `record` is a `RunData`).
  - Its `record.doc` is the scenario as recorded on 13 October: objective 1 is a plain string, and no objective has
    `debrief`.
  - So the test first asserts that the texts of `record.doc.objectives` equal those of
    `apps/demo/src/app/showcase/showcase-tamponade.json`. Then it replaces `record.doc.objectives` with that file's
    objectives (as A1 left them), rebuilds `objectives(record)`, and calls the new functions.

  **Expected key moments** (re-derived by the review from the fixture):

| n | t | who | text | HR | MAP | SpO₂ | EtCO₂ |
|---|---|---|---|---|---|---|---|
| 1 | 06:13 | patient | Deteriorating: systolic below 80 | 136 | 70.56 | 99 | 24 |
| 2 | 07:48 | patient | Pulse lost (the model) · PEA | 46 | 20.83 | – (`null`) | 14 |
| 3 | 07:51 | team | CPR, ventilated with FiO₂ 1.0 | 44 | 20.12 | – (`null`) | 13 |
| 4 | 09:21 | team | CPR: pericardium drained, catheter left in | 107 | 27.84 | – (`null`) | 9 |
| 5 | 10:55 | patient | Circulation returned (the model) | 135 | 45.25 | – (`null`) | 19 |
| 6 | 10:57 | team | Return of circulation: ventilated, catheter in the pericardium | 119 | 62.59 | 99 | 19 |
| 7 | 11:27 | team | Post-ROSC: 500 mL crystalloid running | 64 | 90.49 | 99 | 28 |

  The test asserts `spo2: null` and `pulseless: true` for moments 2–5 (E60), and `spo2: 99`, `pulseless: false` for
  moments 1, 6 and 7. HR, MAP and EtCO₂ stay as recorded on every row.

  MAP is shown to 2 decimals of the recorded value, and the test uses `toBeCloseTo(v, 2)`. Every value above is the
  sample AT ⌊t⌋: the planner checked after the review that all seven seconds have non-null HR, MAP, SpO₂ and EtCO₂, so
  the +3 s fallback is not used on this path.

  **Expected alarms:**
  - moment 1: CVP high, SpO₂: low perfusion, ART S low;
  - moment 2: ART M low, HR high, ART D low, EtCO₂ low, ART: no pulsatile pressure, HR low;
  - moment 4: ART S low, ART D low;
  - moment 7: ART D high, ART M high;
  - the rest: none.

  **Expected key times:**
  - `recognition` notTicked;
  - `firstTeam` 0 → 471.15 (`7 min 51 s`);
  - `objective:1` 468 → 471.2, asked 10 (`3 s`);
  - `objective:2` 471.2 → 561.37, asked 120 (`1 min 30 s`);
  - `objective:3` 655 → 657.26, asked 30 (`2 s`);
  - `pulseless` totalS 187 (`3 min 07 s`).

  `pulseLostToCpr` is dropped because it equals `objective:1`.

  **Second fixture:** the same, plus a note row `{ t: T, kind: 'note', text: 'Objective met: ' + <objective 1's
  words as drugWords gives them> }` with an arbitrary `T` (130 in the test). Expected: `recognition` `fromT` 0,
  `toT === T`, `state: 'measured'`. The tile shows the tick time as recorded, never a fixed value (E54: on the day the
  presenter ticks when the cues appear).

  **MH fixture** (E52): the MH card's document (as A1 left it) on a synthetic `RunData` with a note row
  `Objective met: Name malignant hyperthermia …` at `T`. Expected: a `recognition` tile with `toT === T`, not a dash.
  The same document without the note gives `state: 'notTicked'`.

  **Third fixture:** a synthetic `RunData` (`emptyRun()` + 200 samples + one `pulseLoss` at 60 and `rosc` at 120, no
  doc). Expected: moments at 60 (patient) and 120 (patient); key times `pulseless` only (60 s).

  Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/debrief-moments.test.ts`. Expected: red.
- [ ] **Step 2: Implement to green.** Commit `feat(debrief): key moments and key times from the run record`.

### Task B3a: The course strip builder (Executor 2, Monday)

**Files:** `apps/demo/src/app/views/debrief-course.ts` (new), a unit test beside it.

- [ ] `courseSvg(d, moments, { trends: ['hr','map','spo2','etco2'], learner?: boolean }): string`:
  - small multiples on one time axis, with the axis floors of `axisRange` (`debrief.ts:86`);
  - a numbered badge per moment: ■ blue for team, ● vermillion for patient, grey for scenario; badges closer than
    15 px are offset to the right;
  - a light grey band over each pulseless span, labelled `pulseless <span>`;
  - a trend never measured is left out;
  - the SpO₂ line is broken inside each pulseless band (samples with `pulselessAt` true are drawn as gaps, like
    unmeasured seconds). Time-box 30 min. If it is not done in 30 min, the SpO₂ line is drawn as recorded across the
    band, and the break goes to "Later". HR, MAP and EtCO₂ are drawn as recorded;
  - an `aria-label` listing the moments;
  - height ≤ 80 mm at 182 mm width.

  The legend line is HTML in the view (B3b), not in the SVG. Unit test on A3.1: four trends, seven badges, one band.
  Commit.

### Task B5a: Schema and types for `takeHome` (Executor 2, Monday)

- [ ] Schema root: `"takeHome": { "type": "array", "maxItems": 3, "items": { "type": "string", "minLength": 1 },
  "description": "Optional: up to three take-home lines the learner handout prints, as written (the author's reviewed
  words)." }`; `types.ts` `ScenarioDoc.takeHome?: string[]`. Turn on A1's `it.todo` negative test. Commit. No JSON
  gets `takeHome` before the owner's answer (B8).

### Task B7a: Persian entries for B, into a file of their own (Executor 2, Monday)

- [ ] With the `persian-writing` skill, write `../scratch/debrief-b-fa-entries.json` (the table's entry format,
  `reviewed: false`, `source: "views/debrief.ts (Debrief redesign B)"`). It is not written into `fa-debrief.json`,
  which is A's file that day. Entries:
  - `Key times`, `The course`, `Key moments and what the monitor showed`, `Alarms since the last row`;
  - the tile captions `Recognition (instructor's tick)`, `Start → first team action`, `Pulse lost → CPR`,
    `Pulseless in all`, `not ticked`, `asked ≤ {span}`, `{span} of {span}`;
  - `Team`, `Patient`, `Scenario`;
  - the handout strings ("For the owner" item 3).

  Monday 19:00, the orchestrator sends the owner's list from: the A PR body, this file and "For the owner".

### Task B2: `/2` carries the moments (Tuesday, after rebasing onto main = A + V)

- [ ] `git fetch origin && git rebase origin/main`. `debriefJson()` fills `keyTimes` and `keyMoments` (Decision 4).
  Unit test: the A3.1 overlay (B1) round-trips them. Commit.

### Task B3b: Page 1 — key times, the course, objective bars

**Files:** `views/debrief.ts`, `views/debrief.css`.

- [ ] **Step 1.** After the header band, `#db-keytimes` "Key times": up to six tiles, each with:
  - a caption clamped to two lines (`-webkit-line-clamp: 2`; the full text stays in Objectives);
  - a big value;
  - a sub-line `mm:ss → mm:ss · asked ≤ <span>` (pulseless: `first lost mm:ss`; firstTeam: the action's moment text
    in brackets).

  A met `askedS` tile gets a 2 pt left border. The notTicked tile uses a dashed border and prints `–` with
  "not ticked".
- [ ] **Step 2.** `#db-course` "The course": `courseSvg()` from B3a, under a visible legend line:
  `■ team action · ● patient event · │ scenario state · numbers match Key moments`.
- [ ] **Step 3.** Objectives below, under the sub-heading "What the record shows: it reads the run, it does not grade
  the person" (the run sheet's own sentence, §4 T+3:00).
  - An objective with `measure` gets a bar (taken of asked; overflow past the outline, hatched) and
    `<span> of <span>`.
- [ ] **Step 4.** The trend charts (page 3+) take the numbered moments as markers (replacing A4's, if A4 landed),
  with the same legend.
- [ ] **Expected:** on A3.1 in Chromium, page 1 holds the header, six tiles, the course and the five objectives. B6 (f)
  checks the height on A3.1 and on MH.

### Task B4: Page 2 — key moments and what the monitor showed

- [ ] `#db-moments` (in `#db-live-1`), a table with:
  - columns `n · Time · Who · What happened · HR · MAP · SpO₂ · EtCO₂`, with the sub-heading "values at that second";
  - "Alarms since the last row: …" under a row that has any;
  - `–` for a null value;
  - at most 12 rows, then "n more in the timeline".

  `break-before: page` only when there is at least one moment (Decision 12). The facts (`#db-facts`) follow. Then the
  static `#db-pearls` (A6, or built here if A6 was cut) and Notes.
  - Expected on A3.1: B1's seven rows, MAP rounded.
- [ ] **SpO₂ while pulseless (E60, RULED "dash when pulseless": the DEFAULT, not conditional).**
  - **Where "pulseless" lives in the record.** No sample carries a pulse flag. The pulse state is in the kept rows of
    kind `patient`: `ev: 'pulseLoss'` (text "Pulse lost (the model)") and `ev: 'rosc'` (text "Circulation returned
    (the model)").
    - `RunRecord.engine()` writes both from the engine's truth `hemo.circ.arrest` (`record.ts:153–155` on current
      main; `:159–160` on 57695b42).
    - `facts()` sums the pulseless time from the same rows (`debrief.ts:234–243`), and so does B1's `pulseless` key
      time.
  - **The helper.** `pulselessAt(d: RunData, t: number): boolean` in `debrief-moments.ts` is true when `t` lies in a
    span that runs from a kept `pulseLoss` row to the next kept `rosc` row, both ends included
    (`pulseLoss.t ≤ t ≤ rosc.t`). A span with no `rosc` runs to the end of the record.
  - **`keyMoments()`** sets `values.spo2 = null` and `pulseless: true` on such a moment (Decision 4, B1). The view's
    SpO₂ cell then prints `–`.
  - **The fixed sentence** under the table, shown only when at least one row is pulseless: "SpO₂ –: no reliable
    oximeter reading without a pulse (during CPR the pleth is compression artefact)." (the check's wording; owner list
    item 11).
  - **Unchanged:** HR, MAP and EtCO₂ print as recorded. The trend charts are unchanged; the course strip follows B3a.
  - **Unit test:** `pulselessAt` on the A3.1 fixture is true at 468, 471.15, 561.37 and 655 (the `rosc` row itself),
    and false at 373.62, 657.26 and 687.43.
  - **View test:** rows 2, 3, 4 and 5 print `–` in the SpO₂ column; rows 1, 6 and 7 print `99`; the sentence is
    present once.

### Task B5b: The learner handout (E51)

**Files:** `views/debrief.ts`, `views/debrief.css`.

- [ ] **Step 1.** `#db-handout`, a direct child of `.page`, after Notes; its dynamic parts are rebuilt in
  `#db-live-2`'s render. On screen it is headed "Learner handout (printed separately)". Contents:
  - (a) the header band with the kicker `LEARNER HANDOUT · YOUR CASE · NO MARKS`, the title, and the patient/duration
    sub-line (no Run by);
  - (b) the fixed intro;
  - (c) "Your run at a glance": `courseSvg(…, { learner: true })`, with no tiles and no objectives;
  - (d) "Key moments": time · who · what (no values, no alarms);
  - (e) "Questions to think about": the three fixed prompts, each with three ruled writing lines;
  - (f) "Take-home points": the card's `takeHome` lines when present, else "Your take-home points" with three blank
    ruled lines;
  - (g) the fixed next-step line.

  The closing `.db-foot` gives Safari its footer line; there is no extra `.db-runfoot` in the handout.
- [ ] **Step 2.** The button "Print the learner handout" (`ghost`) in `.db-tools`. On click it sets
  `el.dataset.print = 'handout'`, sets `document.title = 'Learner handout <title> <date>'`, calls `window.print()`,
  and registers `addEventListener('afterprint', clear, { once: true })`. CSS `@media print`:
  - `.debrief[data-print=handout] .page > :not(#db-handout):not(.db-foot) { display: none }`;
  - `.debrief:not([data-print=handout]) #db-handout { display: none }`.
  - Expected: Chrome prints the handout of A3.1 on 1 A4 page with the footer and "Page 1 of 1".

### Task B6: Tests and the rehearsal reader

- [ ] **Step 1: e2e (`$E2E`, new tests after the existing one, 3 of 3 on both projects, never `@known-flaky`).**
  - (a) Chromium PDF text (local, `PME_PDF_TEXT=1`): page 1 contains `Key times`, `The course` and each objective's
    text. `Measured facts` moves to page 2: the `:130` assertion is changed accordingly, not removed.
  - (b) `#db-keytimes` has ≥ 1 tile and `#db-moments tbody tr` ≥ 1 on the anaphylaxis run.
  - (c) Chromium: the handout `page.pdf()` text (local) contains `Questions to think about` and the footer, and no
    verdict word.
  - (d) The free run (A9's test): ≤ 4 pages, with no `#db-moments` break.
  - (e) **Both projects, print media, `data-print=handout`, a DOM check that runs on Linux CI:** the visible text of
    `.debrief` (elements whose computed `display` is not `none`) contains "Questions to think about" and the footer
    text, and matches none of `/Observed|Not observed|Not assessable|Discuss|✓|✗|◆/` nor any objective text.
  - (f) **Both projects, print media at a 182 mm content width:**
    - the `#db-handout` block height ≤ 267 mm;
    - the page-1 block (header band to the end of `#db-objectives`) ≤ 267 mm on the anaphylaxis run;
    - the same page-1 check on a run of the MH card (now six objectives, E52), loaded and left 30 s at ×8.
  - (g) Both projects: type in `#db-who` and `.db-notes` across a 5-s render; the caret and the text stay (with #80's
    spec).
- [ ] **Step 2: Kit-round.**
  - `debrief()` also returns `keyTimes` (caption → value) and `moments`.
  - The `A3 tamponade: the cue card path …` test ticks "Name the tamponade…" in the Scenario tab when the cues
    appear (E54), at the run sheet's row "1:00 … CVP on the IBP2 tile" (sim ≈ 01:00). The tamponade part of
    `Q1 30-minute talk …` does the same.
  - The MH part of `Q1 30-minute talk …` ticks "Name malignant hyperthermia…" with the early call (E52), at state
    **Early signs** (sim ≈ 06:52), just before pressing **MH crisis**.
  - Each recorded tile is "tick time as recorded". The reader stores it; no test asserts a fixed value.
  - The A3 test also sets `data-print=handout`. Chromium: it saves `a3-tamponade-handout-chromium.pdf` via
    `page.pdf()`. WebKit: a print-media screenshot.
- [ ] **Step 3.** Executor 2 measures the A3.1-path page count locally (Chromium) for the run sheet (B8).
- [ ] **Step 4: Model-docs guard** before B's PR push (CI-4) and before the R-B fix push (CI-5): B1–B6 changed source
  and comments (`debrief-moments.ts`, `views/debrief-course.ts`, `debrief.ts`, `views/debrief.ts`, the schema,
  `types.ts`).

```bash
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md     # regenerated pages, if any
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after B6"   # only if the status listed files
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
```

  Expected: 0 stale pages, 0 orphans. Because nothing may be pushed after CI-5, this run MUST precede the CI-5 push.

### Task B7b: Persian table

- [ ] Merge `../scratch/debrief-b-fa-entries.json` into `fa-debrief.json`. Where the owner confirmed an entry by
  12:00, set `reviewed: true`.
  - Expected: `debrief-fa.mjs` on a B `/2` export prints `0 strings without translation`. The key times, key
    moments and handout are not rendered in Persian, so their words are not counted. The PEARLS box IS rendered
    (E59), so its words are counted.

### Task B8: The owner's answers, docs, PR

- [ ] At 12:00, apply the owner's answers:
  - `takeHome` only in his confirmed words (Decision 6; no answer → no field);
  - the PEARLS and handout prompts per E61 (ruled: the drafts if no answer);
  - the Persian entries he confirmed.

  Answers that arrive after 14:00 are applied after the tag (post-tag docs PR, or the next release).
- [ ] Run sheet §4:
  - Case 2's row at W 0:08 / sim 1:00 (`SHOWCASE-2-RUN-SHEET.md:336`, "Name it aloud … Tick objective 1 on the
    Scenario tab (before 3:00)") and cue card 2's row "1:00 | CVP on the IBP2 tile: 17" (`SHOWCASE-2-CUE-CARDS.md:94`) become: **"When the cues appear (CVP rising on the IBP2 tile, narrow pulse pressure, tachycardia): name it
    aloud and tick *Name the tamponade* on the Scenario tab"** (E54). Muffled heart sounds can only be narrated: the
    engine has no auscultation (`git grep -i "heart sound\|auscultat"` in `packages`, `apps`: no hit, planner
    2026-10-18).
  - Case 3's row at 6:52 (`SHOWCASE-2-RUN-SHEET.md:417`) and cue card 4's ◆ 6:52 row (`SHOWCASE-2-CUE-CARDS.md:153`)
    add, before **MH crisis**: **"tick *Name malignant hyperthermia* on the Scenario tab as you call it"** (E52). The
    MH Debrief line (`:454`) starts with "✓ Observed (instructor, ≈ 06:52)".
  - 0:30: read the tiles (`3 s`, `1 min 30 s`, `2 s`, pulseless `3 min 07 s`) and the one ◆;
  - 1:20: point at "Key moments" instead of "Measured facts";
  - 2:15: E50, plus "then Print the learner handout" (optional on the day);
  - the page count from B6 Step 3.

  Also update cue card 3, the presenter guide, `scenario-authoring.md` (`takeHome`) and CHANGELOG.
- [ ] Open the PR (**CI-4**). The PR body carries what A's did, plus the `debrief-moments.test.ts` output. Review
  **R-B** reads only the view, the handout and the docs (B1/B3a were pre-reviewed Monday). R-B runs no local e2e
  between 14:30 and 15:45.
- [ ] Push the review fixes (**CI-5**). **From this push on, nothing is pushed to `debrief-b`** (orchestrator ruling 4),
  except a fix for a gate failure; that costs the cut line unless CI is green again by 16:15.

### Task G: Gate, cut line

All gate outputs go to `../scratch/debrief-gate-rc2/` and `_sandbox/`, never to `debrief-b`. They land in a docs PR
after the tag, with the gate note.

- [ ] **G1: Kit from H** (the CI-5 head); rehearsal on both engines.

```bash
H=$(gh pr view <B> --json headRefOid --jq .headRefOid)
git -C ../scratch/wt-debrief-b rev-parse HEAD            # = $H
node scripts/showcase/make-bundle.mjs ../scratch/debrief-gate-rc2/kit > ../scratch/debrief-gate-rc2/kit.log && grep Commit ../scratch/debrief-gate-rc2/kit/VERSION.txt   # = ${H:0:8}
SHOWCASE_KIT=../scratch/debrief-gate-rc2/kit KITROUND_OUTDIR=../scratch/debrief-gate-rc2/kit-round npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A3 tamponade: the cue card path" --reporter=list
SHOWCASE_KIT=../scratch/debrief-gate-rc2/kit KITROUND_OUTDIR=../scratch/debrief-gate-rc2/kit-round npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list
```

  Expected (A3, both projects):
  - marks `✓ Observed` (the tick), then `✓ ✓ ✓ ◆`;
  - tiles: recognition = the tick time as recorded (≈ `1 min` on this path; no fixed value), `7 min 51 s` (first team
    action), `3 s`, `1 min 30 s`, `2 s`, pulseless `3 min 07 s`;
  - Q1 MH (Chromium): a recognition tile with the tick time as recorded (≈ 06:52), not a dash;
  - 7 key moments;
  - the page count equal to B6 Step 3's;
  - the handout PDF 1 page.

  Any difference from A3.1 is reported, not "fixed".
- [ ] **G2: Persian.** `node scripts/showcase/debrief-fa.mjs ../scratch/debrief-gate-rc2/kit-round/debrief-*.json --version 1.0.0-rc.2 --text`
  → `0 strings without translation` for each. In the `.fa.txt`, the instructor line's time is in Western digits, and
  the four Persian PEARLS prompts appear once each, under the Persian `Talking points` (E59).
  Copy the owner's demo handouts (tamponade, bronchospasm, MH; from `/2`) to `_sandbox/pme-debrief-fa/`.
- [ ] **G3: Print PDFs for the owner.** The A3 facilitator PDF and handout PDF (Chromium) and the WebKit print-media
  screenshots go to `_sandbox/pme-debrief-rc2/`, with an updated `HOW-TO-CHECK-THE-PRINT.txt` (untick headers and
  footers; the handout button).
- [ ] **G4: The cut-line check** (orchestrator, 16:15; latest 16:30).

```bash
gh run list --workflow ci --branch debrief-b --json headSha,status,conclusion --limit 5   # newest for $H: completed, success
gh pr view <B> --json mergeable --jq .mergeable                                            # MERGEABLE
git merge-base --is-ancestor <FALLBACK_SHA> "$H" && echo has-A-and-V
gh run list --workflow ci --branch main --json headSha,status,conclusion --limit 1         # completed, success, = origin/main
```

  Merge B only if all of these hold:
  1. CI on `H` is green;
  2. R-B's review file names `H` and its first line says no blocker;
  3. the gate note §G names `H` (kit `VERSION.txt` Commit = `H[0:8]`), with G1 passing in both projects and G2 at 0
     strings without translation for each export;
  4. the owner's clinical wording is applied, or withheld (blank lines);
  5. main is idle and green.

  Otherwise do not merge, and rc.2 is tagged at FALLBACK_SHA.
  - After a merge, main CI (**CI-6**) must be completed and green by 17:30. If it is red or still running at 17:30,
    the orchestrator tags `v1.0.0-rc.2` at FALLBACK_SHA and opens the revert PR after the tag.
  - The tag check: `gh run list --workflow ci --branch main --json headSha,status,conclusion --limit 20` shows
    `completed`, `success` for the tagged sha.
- [ ] **G5: The E57 "close" test** (orchestrator, Tuesday 17:30; owner ruling: "move the freeze to Wednesday 12:00 if
  B is close"). It applies only when B is NOT merged at 17:30. A merged B whose main CI-6 is red takes FALLBACK_SHA at
  18:00, as in G4.

```bash
gh pr view <B> --json state,headRefOid --jq '.state + " " + .headRefOid'                    # OPEN <H>
head -1 ../scratch/plans-backup/debrief-b-review.md                                         # NO CHANGE, or CHANGE …
gh pr view <B> --json commits --jq '.commits[-1].oid'                                       # = H (the review's changes are in H)
gh run list --workflow ci --branch debrief-b --json headSha,status,conclusion,databaseId --limit 3
gh run view <run id for H> --json jobs --jq '[.jobs[] | select(.conclusion=="failure")] | length'   # 0
grep -c "^- \[ \] OPEN" ../scratch/debrief-gate-rc2/gate-note.md                          # 0
```

  B is CLOSE only if all of these hold:
  1. B's PR is open.
  2. Its independent review (R-B) reads NO CHANGE, or CHANGE with every change pushed. The review file names a head
     that is an ancestor of `H`, and the review's fix list is all marked done in the PR.
  3. B's final CI run (on `H`) is green, or still running with no failed job.
  4. The gate rehearsal (G1, G2) on `H` has no open finding (the gate note §G lists none marked OPEN).

  - **All hold → the Wednesday branch.**
    - The freeze moves to Wednesday 21 October 12:00.
    - Nothing else merges, and nothing is pushed to B.
    - B merges as soon as its CI on `H` is green, by 10:00 at the latest.
    - Main's CI on the merge must be completed and green; then rc.2 is tagged at it by 12:00. If that run is red, or
      not done by 11:45, rc.2 is tagged at FALLBACK_SHA by 12:00, and B is reverted after the tag.
    - Wednesday afternoon: the kits are rebuilt from the tag and the automated rehearsal (G1, both projects, and the
      Q1 talk) runs on them. Wednesday evening: the owner's smoke check.
    - B's CI on `H` failing a job on Wednesday morning means rc.2 goes on FALLBACK_SHA at once.
  - **Any fails →** FALLBACK_SHA is tagged Tuesday 18:00, as before.

---

## For the owner (one list, sent Monday 19:00 by the orchestrator; answers by **Tuesday 20 October 12:00**)

1. **A, Monday evening** (optional, 10 min): the A3.1 print PDFs from the A PR. The verdict words as ruled: ✓ Observed
   · ✗ Not observed · – Not assessable · ◆ Discuss. A ticked "Name the tamponade" prints ✓ Observed with "Observed by
   the instructor at mm:ss." In A alone (if B does not land), the trend markers show no blue on the tamponade path:
   team actions are drawn exactly only by B.
2. **PEARLS prompts (fixed, non-clinical; facilitator page):**
   - *Reactions:* "How did that feel? What stands out for you?"
   - *Description:* "In a sentence or two: what was the problem, and when did you know?"
   - *Analysis:* "Take one key moment: what did you see, what did you think, what did you do?"
   - *Summary:* "One thing to keep doing, one thing to do differently next time."
3. **Learner handout, fixed non-clinical text:**
   - Intro: "This sheet is yours to keep. It shows what happened and when; it does not mark you. The conversation, not
     this page, is the debrief."
   - Prompts:
     1. "What did you notice first on the monitor, and when?"
     2. "Take one key moment: what were you thinking then, and what did you do?"
     3. "One thing you will keep doing, and one thing you will do differently."
   - Next step: "Next time, run the case again from its start and compare your key moments."
4. **Take-home lines per card (clinical: printed ONLY in your confirmed words; no answer = blank lines).** Drafted from
   each card's own story and objectives:
   - *Tamponade:*
     1. "Tachycardia, a narrow pulse pressure and a raised CVP after a chest wound: think of tamponade."
     2. "Drainage is the treatment: plan it before the pressure falls."
     3. "In PEA from tamponade, CPR alone cannot bring the pulse back; drainage during CPR can."
   - *Malignant hyperthermia:*
     1. "A rising EtCO₂ at the same ventilation with a rising heart rate: think of MH early."
     2. "Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg."
     3. "Keep hyperventilating until the EtCO₂ has stayed down, and treat the potassium."
   - *Bronchospasm:*
     1. "High peak pressure, a shark-fin capnogram and auto-PEEP: think of bronchospasm."
     2. "Treat with a bronchodilator."
     3. "Watch the delivered tidal volume and minute volume recover as air trapping eases."
5. **Tile captions (English):** "Recognition (instructor's tick)", "Start → first team action", "Pulse lost → CPR",
   "Pulseless in all", "not ticked". Objective tiles use the objective's own words (two lines at most).
6. **Persian words:** A's in the A PR body; B's in `scratch/debrief-b-fa-entries.json`; ≈ 35 in all, each
   `reviewed: false` until you tick it. The Persian handout this week shows today's sections with the new verdict
   words AND the PEARLS box (E59). The key times, the key moments and the learner handout come in Persian in a later
   release (E48).
7. **The showcase steps:** tick "Name the tamponade" in the Scenario tab when its cues appear: CVP rising on the IBP2
   tile, narrow pulse pressure (sim ≈ 1:00; E54). Tick "Name malignant hyperthermia" with the early call (≈ 06:52;
   E52). Both tiles show the time you ticked.
8. **SpO₂ on the key-moments table (E60, ruled by the check you asked for).** The monitor showed "99?" (questionable,
   LOW PERF), never a clean 99, during the pulse loss and CPR. The record dropped the "?". The table now prints "–"
   for SpO₂ from the pulse loss to the return of circulation, inclusive: on the tamponade path, rows 07:48, 07:51,
   09:21 and 10:55. HR, MAP and EtCO₂ print as recorded. The engine and the record are not changed this week; the
   oximeter itself is a calibration item.

---

9. **The new MH objective's words (E52):** "Name malignant hyperthermia from the monitor: EtCO₂ above 45 mmHg at the
   same ventilation, tachycardia (instructor-assessed)". Please confirm or correct them by Tuesday 12:00. Until then
   they ship as written: they restate the card's own "Early signs" label with its 45 mmHg threshold (a test asks every
   showcase objective to carry a number, so a correction keeps one).

---

10. **The PEARLS prompts in Persian (E59; by Monday 19:00, from A7 Step 2 or B7a):** the title `Talking points`, the
    four phase names and the four prompts of item 2, as produced with the `persian-writing` skill. Please confirm or
    correct them by Tuesday 12:00. Without an answer, they print marked unreviewed, as the table does today.
11. **The sentence under the key-moments table (E60):** "SpO₂ –: no reliable oximeter reading without a pulse (during
    CPR the pleth is compression artefact)."

---

## Questions (E52 onward; each with the default the plan uses if no answer comes)

| ID | Question | Default |
|---|---|---|
| **E52** | Which objectives carry the recognition flag? | **RULED (owner 2026-10-18):** tamponade, anaphylaxis, bronchospasm AND malignant hyperthermia, the last through a new hand-tick objective "Name malignant hyperthermia …" (A1). Haemorrhage is not flagged (a reserve card). |
| **E53** | Take-home lines: per card for the three talk cards, in your confirmed words, or none? | **RULED (owner): YES as defaulted.** Per card, ONLY in your confirmed words; without an answer, blank lines |
| **E54** | When do you tick "Name the tamponade" during the demo? | **RULED (owner):** when the cues appear (rising CVP, narrow pulse pressure; muffled heart sounds narrated). On the run-sheet path that is sim ≈ 1:00. The tile shows the tick time as recorded. |
| **E55** | Should the learner handout have its own print button? | **RULED (owner): YES**, its own print button |
| **E56** | Should page 1's strip show HR, MAP, SpO₂ and EtCO₂ for every case? | **RULED (owner): YES**, the same four for every case |
| **E57** | If B misses the cut line, what happens? | **RULED (owner):** "Move the freeze to Wednesday 12:00 if B is close". The mechanical close test is at Tuesday 17:30 (G5); otherwise FALLBACK_SHA is tagged Tuesday 18:00 |
| **E59** | Should the Persian handout print the PEARLS box this week? | **RULED (owner): YES.** The Persian prompts come from A7/B7a, go on the review list (item 10) by Monday 19:00, and G2 checks them |
| **E60** | SpO₂ 99 during PEA and CPR on the key-moments table? | **RULED (owner: "check the model before Tuesday"; check verdict 2026-10-19 00:50: `dash when pulseless`).** SpO₂ prints `–` from `pulseLoss` to the next `rosc` inclusive (B4, the default). HR, MAP and EtCO₂ print as recorded. The engine and the record change only in the calibration pass (Later) |
| **E61** | The non-clinical fixed prompts (items 2 and 3): if you have not answered by 12:00, print the drafts? | **RULED (owner): YES as defaulted** |

(E58 of v1, on Stage 14's order, is now ruled by the orchestrator: the Merge calendar.)

---

## Deferred (option C and later)

- Systolic, diastolic and CVP in the record.
- Alarm end times.
- Manual transitions as explicit team rows.
- A "Recognised" key for any case.
- The swimlane.
- Per-scenario debrief hints.
- Persian rendering of the key times, the key moments and the handout (the PEARLS box is in this week, E59).
- In-app Persian.
- FX-20, if A8 is not merged.
- `pme-debrief/3` if the record shape changes.
- The SpO₂ line break inside the pulseless band on the course strip, if B3a's 30-min time-box ran out.
- **Calibration items from the E60 check** (`scratch/plans-backup/spo2-pulseless-check.md` §5; for the calibration
  queue, not this week):
  1. **The recorder drops the oximeter's questionable flag** (`record.ts:166` keeps the value whenever
     `flag !== 'invalid'`). Store the flag per sample (SpO₂ and the other flagged numerics), so the debrief can print
     "99?" as the monitor did, rather than inferring it from the pulse rows.
  2. **The oximeter during CPR** should ignore compression-only pulses (no ejection), or read biased low. Today a
     compression pleth pulse (`hemo/pipeline.ts:254`) passes the SpO₂ validity gate, so the device reports the
     arterial truth (99) during CPR.
  3. **A minimum perfusion index for a valid pulse.** At MAP 20–40 the model's small ejections (PI 0.10–0.15) stay
     above the detector floor of 0.03 PI; consider ≈ 0.1–0.2 [ENG], or a perfusion-dependent dropout.
  4. Citation, for whoever quotes it: Weil et al., NEJM 1986;315:153–156, **PMID 3088448**. This plan does not quote
     it; the check corrected an earlier 3084993.

Mock-up: `_sandbox/debrief-redesign-mockups/option-c-debrief2.*`.

## Self-review

- **The review's 21 fixes are applied:**
  - 1: Decision 10, G4.
  - 2: Task V, the Merge calendar, "No version literals".
  - 3: the pace assumption, the scope-cut rule (in the orchestrator's order).
  - 4: Task G, B8.
  - 5: Decision 12, A5, A9, B6 (d).
  - 6: B6 (e)/(f), `PME_PDF_TEXT=1`.
  - 7: Decision 11, A3 Step 1, B6 (g).
  - 8: B1 Step 1.
  - 9: A1.
  - 10: A8, rewritten on a side branch without a reset.
  - 11: A7, B7a, E59 (then overruled by the owner at 23:45: the PEARLS box is in Persian this week).
  - 12: Decision 6, B8, G4.
  - 13: A9 Step 3.
  - 14: the Merge calendar.
  - 15: Global Constraints, A8, B6.
  - 16: G4.
  - 17: A4, B3b.
  - 18: Decision 4.
  - 19: Decision 3, A1, A2.
  - 20: B1.
  - 21: B3b.
- **The review's answers are applied:**
  - the R-A/R-B evidence lists and the B1 pre-review;
  - the Persian `{t}` check (G2);
  - the handout PDF from the kit-round (B6 Step 2);
  - the objectives sub-heading (B3b);
  - the MH file-map line;
  - the haemorrhage note (E52; amended 23:30 to add MH);
  - the double Safari footer avoided (B5b);
  - `#db-handout` as a direct child (Decision 5).
- **The CI count:** 8 runs (A 3, V 2, B 3), none on the fallback path, plus the orchestrator's ≈ 8 predecessor runs
  overnight. Tuesday's real slack is ≈ 45 min: one re-run of CI-5. A G1 finding, or a second review round, misses the
  cut line, and then G5's close test decides: Wednesday 12:00, or FALLBACK_SHA on Tuesday (E57).
- **What is not proved:**
  - Safari's PDF of the new pages: B6 (e)/(f) check the print-media DOM and heights on WebKit, not a PDF. The owner's
    hand print on Wednesday is the check.
  - The ≈ 2× pace: the 13:00 checkpoint tests it.
