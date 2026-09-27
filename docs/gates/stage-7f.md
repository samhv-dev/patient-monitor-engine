# Gate 7f — neuromuscular block, anaesthetic depth, drive depression, anaesthetic state

Plan: `docs/plans/stage-7f-neuro-depth.md` (20 tasks, all ticked in the branch copy). Branch `stage-7f-neuro-depth`.
Every number below was measured on this branch (Node 26, macOS, shared machine); the prototype's are in the plan's
"Prototype" table and agree to the second decimal unless noted.

## Base and chain
- Base: worktree created from origin/main f828794 (7a, 7b, 7g, 7x, FU-2 merged; **7c not yet merged; 7e not merged**).
  The orchestrator authorised starting before 7c (its `blood.core.ab.hco3` read duck-typed with fallback 24).
  Merges of origin/main into the branch: `834c48a` (docs), `514ab2d` (docs), `c1bdfbf` (Stage 7c, PR #20 — the one
  conflicted merge, resolved below), `155bab7` (Stage 8a, PR #18: clean — `packages/validation/**`, demo validation
  pages, CI budget fixes; no engine source file changed) and a final docs-only merge (`666b103`, RESUME.md) before the PR. Final base:
  7a, 7b, 7c, 7g, 7x, FU-2 and 8a merged; **7d and 7e not merged**.
- validate/apply/advance anchors used (R51 addendum 14 chain) — every Task 12 anchor matched the base literally:
  - validate: after 7g's `if (pkV !== null) return pkV;` → `validateNeuroCommand`;
  - apply: after 7g's `if (applyPkCommand(ps.pk, cmd, simT)) return;` → `applyNeuroCommand`;
  - advance: after 7g's `advancePk(…)`, its `if (circ7g) { … }` and rhythm-hook `if (req7g) { … }` blocks, immediately
    before `advanceResp(` → `stepNeuroTo`; `neuro: ps.neuro.resp` (+ `hco3`, Task 13) in the `advanceResp` context;
  - constructor `pk: createPkState({ ...pkPatientOf(opts.patient), pche: pcheOf(opts.patient) })` (7g's `pkPatientOf`
    does not map the cholinesterase phenotype), `neuro: createNeuroState(…)` after `pkHooks`; flush after `pk.out`;
    `restore()` after `pkHooks ??=`; `syncNeuro(simT)` after `this.advance(this.st, …)` in `tickOnce`.
  - Re-anchorings: the plan's Step 5 `advanceResp` literal carries 7c's `blood: ps.blood.view`; on this base (before 7c)
    the context had no `blood` field, so only `neuro` (Task 12) and `hco3` (Task 13) were added. Task 13's `RespState`
    anchor (`evlwiExtra?: number; // Stage 7c`) did not exist before 7c: `spont?` went after 7g's `vaLpm?`, and the
    two 7c reads were duck-typed until 7c landed: after 7c merged (0e7d730) the merge `c1bdfbf` resolved
    engine.ts (constructor `blood` then `pk` with `pche`; `restore()` 7c's then 7f's line; advance `stepNeuroTo` → one
    `advanceResp` context `{ …, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3 }` → 7c's
    `advanceBlood`/`pushBloodEcg`; validate/apply 7f's hook before 7c's per the chain), resp/pipeline.ts (`RespCtx`:
    `blood?` then `neuro?`/`hco3?`; `RespState`: `evlwiExtra?` then `spont?`), types.ts (`| BloodEvent` then
    `| NeuroEvent`) and the console map (7c's block then 7f's), and replaced both duck-typed reads with the plan's
    literal forms (`ps.blood.core.ab.hco3`, `rs.evlwiExtra`). The resolved engine.ts / resp pipeline / types.ts are the
    prototype's files line for line (one `restore()` line order aside).
- 7g bus fields found in `types-pk.ts` (Task 1 guard `BUS-OK`): `agents[].{unit, plasma, brain, vent, nmj, dia,
  cumulativeMgPerKg}`, `volatiles{fet, brain, macAge, macFrac}` incl. `n2o`, `doses{agent, mgPerKg|null, amount,
  amountUnit, t}`, `antagonist.opioid`; `bindSugammadexSites` exported. Task 3 contract test: 6/6 pass.
- `stimulus`: 7f is the **temporary owner** (7e not merged — decision 17): the `TEMPORARY OWNER` block in
  `validateNeuroCommand` and its marked test in `test/l2/neuro/pipeline.test.ts` are for the 7e executor to delete.

## Acceptance numbers on 7g's PK (measured → band)
- Rocuronium 0.6 mg/kg: TOF 0 **1.32** min, T1 25 % **30.02**, spontaneous TOFR 0.9 **80.67** → 1–2.2 / 26–38 / 55–95 ✓.
  1.2 mg/kg: TOF 0 **0.58**, T1 25 % **62.87** → ≤ 1.2 / 40–90 ✓ (TOFR 0.9 147.1 min).
- Vecuronium 0.1 (158/γ 4): max block **3.03**, T1 25 % **25.20** → 3–5 / 25–30 ✓. Cisatracurium 0.15 (230/γ 6.9):
  **2.48** / **42.40** → 2–3 / ≈ 45 (40–50) ✓.
- Succinylcholine 1 mg/kg (200/γ 4) — **`it.fails` [FU-3 item 1]**: T1 ≤ 5 % **0.17** min, T1 10 % **5.37**, T1 90 %
  **12.68** → label ~1 (0.6–1.4) / 7.1 (6–8.5) / 10.9 (9.5–12.5): 7g's ke0 0.15. Phase I no fade ✓. Cholinesterase
  heterozygous T1 90 % **17.5** min (14–25 ✓), homozygous **6.09 h** (4–8 ✓).
- Sugammadex 2 mg/kg at TOF 2 → TOFR 0.9 in **2.12** min (1.5–3 ✓); 4 mg/kg at PTC → **2.23** (2.1–4.3 ✓); 16 mg/kg 3 min
  after rocuronium 1.2 → T1 10 % in **1.80** (0.8–2 ✓). 0.5 mg/kg underdose at PTC after rocuronium 1.2 — **`it.fails`
  [R-7f-7]**: TOFR peaks **0.83** at +90 min and never falls (needs > 0.95 then a fall ≥ 0.04).
- Neostigmine 0.05 mg/kg at TOF 2 → TOFR 0.9 in **18.33** min (8–20 ✓; NEO_G50 0.3), spontaneous from the same point
  **55.05** (≥ 5 min faster ✓); 0.07 mg/kg at PTC → TOFR **0.35** at 10 min (< 0.9, ceiling ✓).
- Interactions on the rocuronium course (T1 25 % ratio): 1 MAC **×1.42** (1.2–1.45 ✓), 34 °C **×1.86** (> 1.3 ✓),
  myasthenia **×3.71** (> 1.8 ✓); burn ×2.5 EC50: no complete block ✓.
- Depth PD: propofol Ce 3 / 4 µg/mL (35 y) DI **47.7 / 37.7** (44–50 / 35–40 ✓); 1.0 MAC **42.0** (40–45 ✓); remifentanil
  4 ng/mL **92.4** (> 90 ✓); ketamine 1500 ng/mL-eq **98.0**, unconscious ✓. Engine: sevoflurane dial 2.5 % FGF 6 for 30 min
  → end-tidal MAC **1.00**, displayed DI **44.0** (38–48 ✓); vaporiser off → conscious after **7.0** min (5–12 [ENG] ✓).
- Drive (PD): remifentanil 1 ng/mL VE at fixed CO2 **−53 %**, resting **−28 %**; propofol 1 µg/mL **−44 % / −13 %**
  (Nieuwenhuijs −58/−28, −44/−13). Engine (MANUAL): remifentanil 1 µg/kg + 0.4 µg/kg/min → apnoea mark, no breaths; off →
  breathing ✓. Naloxone (F2): remifentanil 0.3 µg/kg/min → apnoea mark at **1.86** min; naloxone 0.4 mg at 10 min →
  breathing mark at **+0.1 s** (first breath at +1.0 s), **24** breaths in the last 2 min (< 3 min ✓; without F2: never).
- MODELED drive (Task 13): no drugs → RR **15.2** / PaCO2 **38.6** vs MANUAL **15.2 / 38.5** (±10 % / ±2 ✓); profile
  HCO3 15 → HCO3 **13.6**, PaCO2 **29.4** (Winter's 28.5 ± 2 ✓; 28.5–32.5 ✓), VE **9.5** vs **7.6** L/min (> 1.2× ✓), RR **17.0**
  vs 15.2; remifentanil 1 µg/kg + 0.3 µg/kg/min → RR **4.0** vs **15.0** (< 0.6× ✓), PaCO2 50.6; acidosis + remifentanil
  0.1 µg/kg/min → PaCO2 **38.4** vs **29.5** (> +3 ✓). Before 7c (duck-typed fallback HCO3 24) the drug-free and opioid
  runs gave 15.0/38.7 vs 15.2/38.6 and RR 4.0 vs 15.0 (PaCO2 50.4); the two acidosis tests needed 7c's profile and
  state and passed only after the 7c merge, at the prototype's numbers.
- Residual block at extubation (natural airway, 32–35 min after rocuronium 0.6): VT **100** vs control **500** mL (×0.20,
  < 0.75 ✓). Reflex drop to phenylephrine 100 µg under ≈ 1 MAC sevoflurane **25.0** vs awake **11.9** bpm (needs anaesthetised < 0.8 × awake; before 7c 28.0 vs 14.9) — **`it.fails` [R-7f-9]** (7g's
  circulation PD only). Propofol 2 mg/kg: MAP **94.6 → 85.4** (×0.903; the 60–80 % band is 7g's NR-7g-1), DI nadir **46**.
- CPU: the neuro step alone **0.0003 ms** per 20 ms tick (≤ 0.05 ✓). Long run **24 h** locally (159 s): NaN 0, one TOF
  train per minute within ±1, final DI in 30–50 ✓ (6 h on CI).

## Fitted and [ENG] constants (R51 §5)
- `NMB_PD` as committed (the Task 4 Step 5 re-fit on this base printed exactly the prototype's numbers, so nothing moved):
  rocuronium 823/1424 ng/mL γ 4.8 [P]; vecuronium **158 / γ 4** [ENG, 3.03 / 25.2 min]; cisatracurium **230 / γ 6.9**
  [ENG, 2.48 / 42.4 min]; succinylcholine 200 / γ 4 (not fitted: FU-3). Diaphragm EC50 = thumb × 1.73. "Max block" = the
  first second with T1 < 10 % after which T1 falls < 1 point over the next 45 s (decision 3).
- `NEO_G50` **0.3** (`NEO_SMAX` 0.7 = the ceiling); `STIM_FULL` 1.5; `GLYCO_U` 1.2; engine sevoflurane dial **2.5 %** for
  1 MAC (measured end-tidal 1.00). No `[ENG, band missed]` row.

## Deviations, exceptions and questions for Ali
- **D-7f-2:** sugammadex binding (plasma + effect site, ke0 0.095/0.152) is 7g's; 7f's reversal bands on it: 2/4/16 mg/kg
  pass; **R-7f-7** (underdose recurarisation) open, `it.fails`.
- **D-7f-3:** fentanyl ventilatory potency 0.55× remifentanil (tables 1.6×), Q54.
- **D-7f-1** (interim rocuronium Vss 0.45) RETIRED with the interim PK (R51).
- **E-7f-1:** one line in `controller-session.ts` (the log formatter's `tof`/`depth` device case).
- **E-7f-2:** 7a's `circ-sanity-2` R23 runs get a supraglottic airway at t = 0. Before (7f wired, no SGA): the
  phenylephrine run fell to HR 39–40, PAWP 22–30, kIsch 0.75–0.86 at +3–5 min; the ephedrine run HR 45–46, PAWP 18,
  kIsch 0.96/0.98, so its `it.fails` started passing (reported as a failure). After: phenylephrine run HR 64 at t 240,
  kIsch 1.00; ephedrine run HR 74–75, kIsch 0.99–1.00 — both R23 tests back to their base behaviour, file 6/6.
- **Demo screenshot script (Task 19, two changes to the plan's file):** (1) at deviceScaleFactor 1 the PNGs were
  92–107 KB, so the page renders at deviceScaleFactor 0.6 (48–56 KB each); (2) the plan's script gave sugammadex 2 mg/kg
  at TOF 0/PTC (a deep block, where the label dose is 4 mg/kg): the TOF tile was still 0/4 at +3 sim-min. The script now
  waits for the tile's second twitch (at sim 38:44, ≈ 35 min after rocuronium under ≈ 1 MAC sevoflurane) and gives it
  then: TOF 4/4, 99 % at +3.5 sim-min. The preview ran on port 4837 (4817 was held by another executor's preview).
- **Demo maintenance depth:** the scripted induction dials sevoflurane 3 % on top of propofol (Ce 1.96 µg/mL at 13 min)
  and fentanyl (1.41 ng/mL): end-tidal 1.0 MAC, brain 0.83 → DI **30** (SR 1 %), deeper than the plan's "40–50 in
  maintenance". The engine acceptance test (sevoflurane alone, 1.00 MAC → DI 44.0) holds the band; the demo's dial is
  demo content — proposal: 2 % in `stage7f.ts` for the calibration pass (not changed here).
- **Demo residual block:** at 34:31 the TOF reads 1/4 and the natural airway is fully obstructed (obstruction 1 with
  0.77 MAC end-tidal sevoflurane + propofol 0.53 µg/mL still on board), so the shot shows obstructed efforts (flat CO2,
  chest movement) rather than shallow breaths; the engine test's residual block (drugs off) gives the shallow breaths.
- **Q-7f-1:** `mapSetShiftMmHg` published only (A11). **Q-7f-2:** §5e system conditions (7e implements them).
  **Q-7f-3 CLOSED** by R51 addenda 12/17 (7e's `stimulus`, 7f observes).
- MODELED drive limits (v1): metabolic alkalosis uncompensated; the J-receptor term sees only 7c's lung water
  (`evlwi = 7 + evlwiExtra`: 7b does not publish the conditions' EVLWI).
- Midazolam/ketamine ng/mL-equivalents from 7g's gamma rows: `MIDAZ_NG_PER_REF` 100, `KET_NG_PER_REF` 1500 [ENG].

## Requests (R-7f-1…9) — status
- R-7f-1 (7g bus fields): MET (Task 1 guard, Task 3 contract 6/6).
- R-7f-2 (7g neostigmine/sugammadex time courses): in place; 7f reads `bus.nmb.achGain` and 7g's binding.
- R-7f-3 (7d reads `ps.neuro.outputs.cmro2Mult`): published; 7d executing.
- R-7f-4 (7e reads `ps.neuro.{antinoc, nmb, thermoDepth}`; deletes 7f's TEMPORARY OWNER `stimulus` block + test): open.
- R-7f-5 (7c: succinylcholine potassium is 7c's): 7f writes no K (neuro-engine test).
- R-7f-6 (renderer draws NMT/BFA tiles): open; the demo draws them in DOM.
- R-7f-7 (7g sugammadex underdose recurarisation, FU-3 list): open, `it.fails` (numbers above).
- R-7f-8 (7e stores `cascade(th)` as `es.cascade`): open; fallback `macF` 1 holds.
- R-7f-9 (7g volatile baroreflex blunting): open, `it.fails` (numbers above).
- FU-3 item 1 (7g succinylcholine ke0/CL): open, `it.fails`.

## Test counts
Final run on the merged base (7c + 8a), `CI=1 pnpm -r test`, all green (`it.fails` count as passes):
- engine-core **1044 passed, 1 skipped** (238 files; Stage 7f: 18 files, 97 tests — `l2/neuro` 76 in 12 files, engine 20 in 5, plus
  `types-neuro` 1); controller **203** (neuro scenarios 6); skins **169**; demo **116** (8 files; console map 1);
  ventilator **88**; renderer **67**; audio **58**; validation **93 passed, 6 skipped** (Pulse/dataset tests skip without
  `PME_PULSE_DIR` / the dataset cache). Total **1,838 passed, 7 skipped**.
- The three pre-declared `it.fails` report as expected failures: `[FU-3 item 1]` succinylcholine course
  (`l2/neuro/nmb-course`), `[R-7f-7]` sugammadex underdose (`l2/neuro/reversal`), `[R-7f-9]` sevoflurane reflex
  blunting (`engine/neuro-circ`).
- typecheck clean (8 packages), build clean, `check-notices` OK (3 governed files), `PW_SYSTEM_CHROME=1 pnpm test:e2e`
  **29 passed** (9.3 min; the other stages' regenerated gate images reverted; 7f adds no e2e file — its screenshots
  come from `apps/demo/scripts/stage7f-shots.mjs`).
- Numbers after the 8a merge: 8a changed no engine or `l2/pk`/`l2/neuro` source, so the rig numbers cannot move; every
  engine number above was re-read from this run's stdout (resting 15.2/38.6, Winter's 29.4, opioid RR 4.0 / PaCO2 50.6,
  acidosis + remifentanil 38.4 vs 29.5, residual VT 100/500, DI 44.0, emergence 7.0, reflex 25.0 vs 11.9, propofol MAP
  85.4 / DI 46, CPU 0.0003 ms) and the naloxone run re-measured (apnoea 1.86 min, breathing mark +0.1 s, 24 breaths) —
  unchanged except the CPU figure (0.0001 → 0.0003 ms, shared machine) and the propofol nadir rounding (85.3 → 85.4).

## Screenshots (`docs/gates/stage-7f/`, each ≤ 60 KB)
- `7f-induction-propofol.png` — fentanyl → propofol at 2:52: displayed DI 77 falling (raw 65, 20 s smoothing), apnoea
  mark, TOF 4/4 ratio 0.98 with the four twitch bars.
- `7f-rocuronium-tof0.png` — TOF 0/4 after rocuronium, DI 40, laryngoscopy stress 0 (antinociception 0.97).
- `7f-sevo-maintenance.png` — on the ventilator, end-tidal 1.0 MAC vs brain 0.83 in the panel, DI 30 / SR 1 %, TOF 0/4.
- `7f-ptc.png` — a PTC during profound block (13:46, 10.5 min after rocuronium under 1 MAC): TOF 0/4, PTC 0.
- `7f-sugammadex.png` — sugammadex 2 mg/kg given at TOF 2: TOF 4/4, ratio 99 % 3.5 sim-min later.
- `7f-remifentanil-apnoea.png` — remifentanil 1 µg/kg + 0.3 µg/kg/min, spontaneous: apnoea, flat CO2 and RESP.
- `7f-residual-block.png` — extubation 31 min after rocuronium: TOF 1/4, obstruction 1 on the natural airway, end-tidal
  0.77 vs brain 0.94 MAC shown separately.
- Naloxone has no demo control (the plan's page has none); its evidence is the engine test above (F2).
