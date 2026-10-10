# Gate note: FU-7.1 branch b (circulation, gas, the breath event and the cuff)

Branch `fu-7.1-b`. Base `origin/main` 48864439. At the gate, `origin/main` 7a3d5672 was merged in (FU-11 a #43, FU-11 c
#44 and FU-7.1 a #46) as f35ef125. Plan: `docs/plans/fu-7.1-drug-physiology-leftovers.md`, Part B. Executor: Claude
Opus 5.5, 2026-10-10/11. Seed 7 throughout. Node v26.8.2 locally. CI on main (Node 22) gave the same numbers wherever
both were compared.

> **STATUS: gate complete; PR opened, not merged.** The gate first stopped at Step 3. The five-case rehearsal had
> changed one headline number: in the class IV haemorrhage case the circulation returns **3.0 min** into CPR (4.3 on
> main), bisected to B4's venous-reservoir hunk. The orchestrator ruled on 2026-10-11 (Section 6), and Steps 4–7 were
> then completed. Step 5 found that B8's display half was missing in the real app; it was fixed in the renderer
> (Section 2, item 7).

## 1. Tasks, before and after

| Task | Measured on main 48864439 | Measured on this branch | Plan's prototype |
|---|---|---|---|
| B1 unit: SVR excess vs pH 7.3 / 7.2 / 7.16 / 7.0 | 1.473 at 7.3 (no blunting) | 1.355 / 1.237 / 1.189 / 1.189 (= `acidosisFactor`); hrF unchanged | same |
| B1 MH untreated (first 40 min) | pH 7.22/7.11, MAP 109 at +20, peak 119 at +33, 108 at +40; SVR 1500→1587; CO 4.81 | **MAP 99 at +20, peak 103 at +27, 94 at +40; SVR 1317→1314; HR peak 180; CO 4.71** (merged tree) | same |
| B5 `breath.vtMl` (bronchospasm 1, VCV 12×500, Pmax 40) | 500 (mechanics 292) | **299 = mechanics 299** (merged tree; 292 = 292 before the merge) | 299 |
| B7 GOLD 4 / GOLD 3 at 10 s → settled | 7.49/37 → 7.39/49 · 7.45/36 → 7.39/44 | **7.37/52 → 7.39/49 · 7.39/43 → 7.39/43** | same |
| B4 drained, q 0.8/110, no fluid, no drug | mean CoPP 14.4, never | **18.1, ROSC +200 s, pulse held ≥ 120 s** | 18.1 / +200 s |
| B3 `arrest-etco2` no CPR, +20/+30/+60/+120 s | 24.9 / – / 14.5 / 6.6 | **14.2 / 9.3 / 2.6 / 0.2** (re-targeted case PASSES) | same |
| B3 `arrest-etco2` CPR: +2 min / mean min 1–10 | 18.0 / 18.3 | 15.9 (record) / 17.8 | same |
| B8 cuff with a pulse / in PEA | 129/76 (99) / failed, tile kept the value | 129/76 (99) / **failed, numerics `---` (`invalid`)** | same |

**Before-numbers that did not reproduce.** Several of the plan's "main" numbers do not reproduce on 48864439. These
are: S8 (plan +9.75 min; measured **+5.67**, also on CI), `arrest-etco2` no CPR (plan 14.2 / 5.0; measured
**14.5 / 6.6**), sepsis MANUAL HR (plan 112; measured **120**) and CPR alone (plan CoPP 0.1–4.1; measured
**2.8–3.5**). The after-numbers on the MERGED tree match the prototype exactly (S8 +3.58, B1 MH, B5 299). The prototype
was probably measured on a tree that already carried more than 48864439.

## 2. Deviations from the plan

1. **B1 Step 6 (RS14) was not applied at B1.** With B1 alone, RS14 still read +6.1, so an `it.fails` would itself have
   failed. The record was applied at the gate instead, attributed to **B3**. Bisected: +6.1 at the B4 commit and
   +5.99994 at the B3 commit. Q5's ruling ("record it with the number") is applied to the same assertion in two files:
   `resp-suite` RS14 and its twin in `resp-inspired-co2` RS14. The twin is a file the plan did not list.
2. **Gate-found B3 casualties (commit d16bdbd3).** Each was bisected: green at the B4 commit, red at the B3 commit.
   - `fu8-tonic`, HTN induction fall: a known miss turned green and was **flipped** to `it` (4.96 → **5.14** points;
     −35.42 vs −30.28 %).
   - `organs-htn`, check 18 hypocapnia: CBF **0.4019** against the 35–40 % band (0.394 before). The ceiling is **split
     out as a record**; the floor and PbtO2 still assert. **RATIFIED by the orchestrator on 2026-10-11 as a known miss
     with the number (R45, not widened).**
3. **The S8 move is B3's, not B1's.** S8 tension PTX is +5.67 → **+3.58 min** (band 3–10, margin 0.58). With B1 alone
   it stayed at +5.67. It is B3 that moves it: +3.58 on b alone at the B3 commit.
4. **B4 changed an unbanded measurement the plan expected unchanged.** The `exsanguination volume threshold` row
   (CPR + adrenaline + volume after a complete 3 L bleed-out) read "no pulse in 10 min" at 2 / 2.5 / 3 / 3.5 L on main.
   It now reads **2 L none; 2.5 L pulse at +275 s; 3 L +245 s; 3.5 L +220 s**.
   - The venous-reservoir hunk alone causes it: with only the RV hunk it is unchanged.
   - G-FU4-1's own row, `CPR alone` (no pulse, CoPP 2.8–3.5), is unchanged.
   - The 2 L `it.fails` record still fails as recorded.
   - The same mechanism makes the rehearsal's haemorrhage ROSC earlier (Section 4).
5. **B3 Step 3/8 probe harness.** `probe-s2/zz-probe-p7.test.ts` is not on disk any more. The course is shown by
   `arrest-etco2` instead.
6. **The record titles name B3.** The plan attributed RS14 and S8 to B1; the bisection shows B3.
7. **B8's display half (Gate B Step 5, commit d3b6d36c).** The plan's engine fix blanks the numerics: `invalid`, null.
   In the real app the NIBP tile ignored a null value. It showed the failure glyph only until the device's next
   `idle` event, about 0.6 s later, and then went back to the pre-arrest 121/76. This was the owner's defect, still
   visible.
   - **Fix:** in `packages/renderer/src/device-ui.ts` and `mount.ts`, a measurement whose `nibpSys` is `invalid` now
     clears the last result and the cuff PR, so the tile reads `---/---`.
   - **Test:** `packages/renderer/test/fu71-nibp-blank.test.ts`, three skins. It failed first.
   - **Other runs:** renderer 28 files / 93 passed; `fu5`, `stage4b` and `stage9-app` e2e 27 passed.
   - **Scope:** this file is outside the plan's file list, but it is not on the "Never touch" list. FU-11 b (#45) adds
     `reset()` a few lines below the edited line, so a merge needs no hand edits.

## 3. Verification on the merged tree (f35ef125 + d16bdbd3)

| Run | Result | Wall (local, shared machine) |
|---|---|---|
| `pnpm -r typecheck` | clean | 11 s |
| `PME_TEST_SET=fast pnpm -r test` | engine 321 files / 1407 passed + 1 skipped; controller 244; ventilator 100; renderer 90; validation 119 (+11 skipped); demo 202; audio 65; skins 191 — all green | 799 s |
| engine `test/l2` + `test/l3` | 245 files / 1162 passed + 1 skipped | 32 s |
| blast radius: `engine-pipeline`, `hemo-nibp`, `hemo-acceptance`, `circ-arrest-state`, `fu8-pea-resus`, `fu8-manual-rosc`, `fidelity-arrest`, `fidelity-lowflow`, `fidelity-alarms`, `stage3-alarms-engine`, `resp-vcv-pmax`, `resp-engine`, `truth-event` | 13 files / 81 passed | 89 s |
| slow-a / b / c / d / e / f / g | after d16bdbd3: green (the four files re-run: 29/29). Before d16bdbd3: a, b, c, d each had exactly one red, the four B3 casualties of Section 2 | 1474 / 1635 / 1282 / 1485 / 1374 / 1642 / 1427 s (four groups in parallel, then three) |
| `pnpm build` | clean | 8 s |
| validation `--suites sanity,gates --quick` | identical summary to main 7a3d5672 (🟢 51 · 🟡 20 · 🔴 9, 1 not measurable, 29 queued, **9 gating — the same 9 rows**, exit 1 on both). One red row is now measured: `s9-witnessed-vf/etco2-gone` reads **83 s** (was "—", band 0–30) | 471 s |
| `npx playwright test --retries=0` (both projects) | 131 passed, 32 skipped, 1 failed: `showcase-clock` webkit (a 1.5 min timeout under load). **Re-run alone: 2/2 passed.** FU-11 a's gate note records the same load sensitivity | 1023 s |
| showcase rehearsal + multiwindow (kit from d16bdbd3) | **14 passed** — but one changed number, Section 4 | 680 s |

New slow-b files (local wall times): `fu71-tamponade-rosc` ≈ 119 s, `fu71-mh-haemodynamics` ≈ 95 s under load,
`fu71-copd-startup` ≈ 30 s, `fu71-breath-vt` ≈ 7 s and `fu71-nibp-arrest` ≈ 2 s. slow-b now also carries branch a's
`fu71-kcl`, `fu71-roc-two-events` and `fu71-induction-synergy`. **Check slow-b against its 40 min CI limit on the PR's
CI run.** On main it was ≈ 33 min.

## 4. The rehearsal (Gate B Step 3)

Kit built from d16bdbd3. Results are in `docs/gates/fu-7.1-b/showcase/`, with
`checks-vs-main-41678d0b.txt` giving the check-by-check comparison with the committed `docs/showcase/results`.

| Case | Committed (41678d0b kit) | origin/main 7a3d5672 (chromium, re-run here) | This branch (both browsers) |
|---|---|---|---|
| Healthy induction: apnoea alarm | 62.5 / 62 s | **55.1 s** | 55 / 54.6 s (main's change, not b's) |
| Healthy induction: MAP | 94.8 → 65.7 | 94.8 → 65.7 | 94.8 → 65.7 / 65.6 |
| Anaphylaxis: systolic > 110 after epinephrine | 11.3 s | — | 11.3 s |
| Bronchospasm: VTE after salbutamol | 161 → 305 | — | 161/162 → 305 |
| Tamponade: MAP < 40 after propofol | 72.6 s | 73.8 s | 73.8 s (main's change) |
| Haemorrhage: pulse lost | 10 min | 10 min | 10 min |
| **Haemorrhage: circulation returns during CPR** | **4.3 min** | **4.3 min** | **3.0 min ← CHANGED (B4)** |

Bisected in a detached measurement tree (chromium): **4.3 min** at the B7 commit (B1 + B5 + B7) and **3.0 min** at the
B4 commit. The cause is B4's venous-reservoir hunk. Recruited venous volume is no longer withdrawn in the arrest, so
CPR plus the case's fluid reach the CoPP threshold sooner. This is the same mechanism as the exsanguination-threshold
row in Section 2.

## 5. Records this branch creates (all with numbers in their titles; no bound widened)

`resp-suite` RS14 + `resp-inspired-co2` RS14 (EtCO2 +5.99994; Q5) · `arrest-etco2` +30 s (9.3) and CPR +2 min (15.9;
Q9) · `stimulus-surge` case 1 awake ΔMAP (40.3) · `fidelity-arrest` fidelity-3 EtCO2 floor × 3 skins (7; Q9) ·
`fidelity-lowflow` Ali case (SpO2 valid 6 s at MAP 19–20; Q10) · **`organs-htn` hypocapnia CBF ceiling (0.4019; not
owner-ruled)**. Flipped: `fu8-tonic` HTN row (5.14 points). `arrest-etco2`'s re-targeted no-CPR case PASSES.

B4 matrix (re-run here; prototype in brackets): drained q 1.0/110 ROSC +146 s (+146) · q 0.8 +200 s (+200) · q 0.6
never, CoPP 15.3 (same) · q 0.4 never, 10.3 (same) · undrained q 1.0/120 never, 10.2 (9.9) · undrained + epinephrine
1 mg never, 13.5 (13.2) · drained q 0.8 + epinephrine 1 mg ROSC +88 s (+88).

Arrest times (merged tree): S4a PEA +105 s (unchanged) · S8 +3.58 min (main +5.67; band 3–10) · S16 44.4 min
(unchanged) · `circ-hypoxic-arrest` PEA +11.23 min after SaO2 < 60 % (unchanged; band 5–14) · `circ-lowflow-arrest`
decay arrest 554 s (553); its ROSC rig gives a pulse at **+188 s of CPR (main +264 s)**, CoPP 5.8–31.7 (main
1.1–22.3) · `fu8-manual-rosc` A27 ROSC beat 102.5 s (unchanged) · S13 CPR CoPP 26.3–27.9 (26.4–28.1).

## 6. Orchestrator rulings (2026-10-11) and declared rehearsal changes

1. **Declared rehearsal change: haemorrhage ROSC, 4.3 → 3.0 min into CPR (both browsers). ACCEPTED** as the intended
   consequence of the owner-ruled B4 defect fix: the venous reservoir is no longer withdrawn at the arrest. Stage 11
   has already changed the card's story to "about three minutes into CPR". The other rehearsal differences from the
   committed 41678d0b results are main's, not this branch's: apnoea 62 → 55 s and tamponade 72.6 → 73.8 s, both
   re-measured on main 7a3d5672.
2. **The exsanguination volume threshold is ACCEPTED as an unbanded observation.** It reads 2 L none; 2.5 L pulse at
   +275 s; 3 L +245 s; 3.5 L +220 s. CPR alone and G-FU4-1's no-fluid row are unchanged. **This is an item for the
   owner to review.**
3. **The `organs-htn` hypocapnia CBF record (0.4019 against the 0.40 ceiling) is RATIFIED** as a known miss with the
   number (R45, no widening).
4. The RS14 twin in `resp-inspired-co2` and the `fu8-tonic` HTN flip are recorded as described in Section 2.

## 6a. Review Focus 2 and 7: every arrest and ROSC time this branch can move (Gate B Step 4)

| Row | Band | main 7a3d5672 (CI) | This branch | Margin |
|---|---|---|---|---|
| `clinical-suite` S8 tension PTX → PEA | 3–10 min | +5.67 min | **+3.58 min** (B3) | 0.58 min to the floor |
| `clinical-suite` S4a tamponade + propofol → PEA | ≤ 10 min | +105 s | +105 s | 8.25 min |
| `clinical-suite` S16 untreated MH → VF | < 60 min, core ≤ 44 °C | 44.4 min, 42.3 °C | 44.4 min, 42.3 °C | 15.6 min |
| `circ-hypoxic-arrest` PEA after SaO2 < 60 % | 5–14 min | +11.23 min | +11.23 min | 2.77 min |
| `circ-lowflow-arrest` class IV MODELED, arrest | ≤ 15 min of MAP < 30 | 553 s | 554 s | in band |
| `circ-lowflow-arrest` ROSC (CPR + 2 L + adrenaline) | pulse ≤ 5 min | +264 s of CPR | **+188 s** (B4) | 112 s |
| `fu8-pea-resus` G-FU8A-1 (class IV, CPR + 2 L + adrenaline) | pulse ≤ 10 min, no asystole | +258 s of CPR | **+184 s** (B4) | in band |
| `fu8-pea-resus` A21 instructor PEA + CPR / shock-PEA | pulse returns | 142 / 201 s | 142 / 201 s | — |
| `fu8-manual-rosc` A27 first ejecting beat | ramp 0.4–0.8 at +10 s | 102.5 s, 0.55 | 102.5 s, 0.55 | in band |
| `clinical-suite` CPR alone after 3 L (G-FU4-1) | no pulse in 10 min | none, CoPP 2.8–3.5 | none, CoPP 2.8–3.5 | unchanged |
| `clinical-suite` exsanguination threshold (unbanded) | — | none at 2–3.5 L | 2 L none; 2.5 / 3 / 3.5 L at +275 / +245 / +220 s | ruling 2 |
| B4 drained tamponade, q 0.8/110, no fluid or drug | ROSC 30 s – 4 min, held ≥ 120 s | never (CoPP 14.4) | **+200 s**, held 120 s | 40 s |
| B4 matrix, q 1.0 / 0.6 / 0.4 | — | never | +146 s / never / never | — |
| B4 undrained, without / with epinephrine 1 mg | never | never | never (CoPP 10.2 / 13.5) | — |
| B4 drained + epinephrine 1 mg, q 0.8 | — | +148 s then re-arrest at +2 s (prototype) | **+88 s, no re-arrest** | — |
| Rehearsal: haemorrhage pulse lost / ROSC | 8–13 min / ≤ 7 min | 10 min / 4.3 min | 10 min / **3.0 min** | ruling 1 |

## 6b. Evidence (Gate B Step 5, Chromium, indexed PNG ≤ 60 KB)

The screenshots come from a scratch Playwright script against this branch's Vite dev server, at ×4, seed 7. The
script was not committed.

| File | What it shows (numbers read from the same session's events) |
|---|---|
| `fu-7.1-b/b1-mh-30min-monitor-chromium.png` (49 KB) | Probe P2's MH rig at +30 min of MH: art 124/94 (103), HR 156, temp 40.2, EtCO2 55. Course: MAP 93 / 100 / 103 at +10 / +20 / +30 min, SVR 1255 / 1311 / **1295** (past its peak), pH 7.30 / 7.22 / 7.17 |
| `fu-7.1-b/b7-copd-gold4-first-abg-chromium.png` (40 KB) | GOLD 4 at sim 00:18 (Explore → Labs): **pH 7.38, PaCO2 50**, HCO3 29.2 (main: 7.49 / 37) |
| `fu-7.1-b/b5-bronchospasm-vent-chromium.png` (49 KB) | The showcase bronchospasm case on the Ventilator view: **VTE 159 mL**, and `breath.vtMl` from the same session is **159** (set 500, Pmax) |
| `fu-7.1-b/b8-nibp-failed-in-pea-chromium.png` (22 KB) | 58 y man: a cycle with a pulse reads 121/76 (95). In PEA the next cycle fails at 173 s and the tile reads **`---/---`, PR ---**, with the NIBP MEASUREMENT FAILED INOP |
| `fu-7.1-b/b4-tamponade-rosc-after-drainage-chromium.png` (44 KB) | Showcase-tamponade patient: PEA at +121 s after propofol; drainage + CPR q 0.8/110, **no fluid, no drug**; ROSC +218 s; the monitor 40 s later reads art 88/62 (71), CVP 10, SpO2 99, EtCO2 30 |

## 7. Contract for `breath` readers (D-9, Review Focus 4)

`breath.t` is still the cycle's START time, and `seq` still increases by one per cycle. `vtMl` is now the volume the
lung received, and the event arrives after the breath, within one tick. The validation series is unchanged (same
summary and same gating rows). The controller wire type is unchanged. FU-11 H5's cockpit side gets the same contract;
`packages/ventilator` is not edited.
