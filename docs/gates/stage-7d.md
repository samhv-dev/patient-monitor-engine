# Gate 7d — brain, kidney, liver

Branch `stage-7d-organs` (worktree `scratch/wt-stage-7d`), from `origin/main` = 7a + 7b + 7g + 7x + FU-2, main merged at
every task boundary. Plan `docs/plans/stage-7d-organs.md` (24 tasks, all ticked in the branch copy). 7c had **not**
merged when this gate was run: every 7c field is read duck-typed with its neutral fallback (see §7).

## 1. Summary

- Brain (Monro–Kellie PVI, Marmarou CSF with a finite reserve, relaxing-conductance autoregulation, CO2/O2 reactivity,
  Grubb CBV, drug CMRO2/vasodilation from 7g's bus, PbtO2/SjvO2, Cushing with both triggers, osmotherapy observed on
  `bus.doses`, head-up, herniation), a 125 Hz `icp` channel, a kidney ported from Pulse's renal circuit (N-P19), a
  liver/lactate model, the organ pipeline wired before the haemodynamics, ICP/CPP alarms, skin tiles/lane, renderer
  formatters, the `stage7d.html` demo and the Pulse oracle O11.
- Every model- and engine-level acceptance number reproduces the plan's prototype (tables below).
- **FU-2 item 6 diagnosed and fixed inside 7d's partition** (§4): the MANUAL "tracker ringing" was the Cushing surge
  flickering off, not 7a's tracker. Check 19 MANUAL ΔMAP **+41.7** (band +30–50; was +24.3) — its `it.fails` is now `it`.
- Two mechanisms added beyond the plan (§5, D-1 and D-2); one renderer fallback (D-3).
- `it.fails` held with numbers: 4 (pure-model hypocapnic CBF; check 20 MODELED premise; check 20 MANUAL UOP;
  mid-curve UOP) — §3.

## 2. Acceptance numbers

### Model level (pure, Tasks 3–10) — all as prototyped

| Check | Band (tables) | Measured |
|---|---|---|
| Rest | ICP 10, CBF 1, PbtO2 25 | 10.00 / 1.000 / 25.0, no drift over 10 min |
| PVI | +1 mL → +9.6 % | 10.965 at ICP 10/PVI 25 |
| Check 19 haematoma 1 mL/min | ICP 20 at 10–15 min, 40 at 20–25 | **10.8 / 23.7 min**; Cushing at 28.0 min; ΔMAP at 60 s **+39.2** |
| Hyperventilation 40 → 30 | −25–30 % | **−25.8 %** |
| Mannitol 1 g/kg vs control | −25 % over 15–30 min | **−25.6 / −31.9 %** at 15 / 30 min |
| HTS 3 % 250 mL | −20–40 % | −26.2 % at 10 min |
| Head-up 30° | ICP −3 to −8, CPP ≈ | ICP **−6.12**, CPP −3.13 |
| Check 18 (HTN, GA) | 0.70× ±15 %; PbtO2 10–15; > 0.8× | 0.753× / PbtO2 13.0 / 0.834× — hypocapnic 0.417× (`it.fails`, §3) |
| Kidney rest (70 kg) | RBF 17 % CO, GFR 125, UOP 1.0 / 0.6 GA | RBF 952, P_gc 57.6, GFR 125.1, UOP 1.000 / 0.600 |
| UOP vs MAP (CVP 5, 30 min) | 0 at RPP ≤ 50, 3× at 150 | 0 / 0.242 / 0.443 / 0.756 / 1.000 / 1.162 / 1.805 / 3.481 at MAP 50 / 65 / 70 / 80 / 93 / 100 / 120 / 150 |
| Check 20 (model) | 0.1–0.15 → 0.2–0.3 in 30–60 min | **0.114 → 0.233 (30) → 0.284 (60)** |
| Class III → fluids | < 0.3; > 0.5 at 60 min | 0.046 → 0.533 |
| Furosemide 40 mg (depot) | peak 6–9 mL/min, 0.9–1.4 L/4 h | 7.75 at 15 min, 1184 mL |
| Lactate t½ | 20–60 min | normal **29.7** (kLac 1.40), class III 48.0, 33 °C 39.1, hepatic failure 51.2 (kLac 0.81) |

### Engine level (Tasks 12–21)

| Check | Band | Prototype | This branch |
|---|---|---|---|
| Check 19 MANUAL (RR 18/VT 500, PaCO2) | 38–42 | 39.5 | **39.49** |
| — ICP 20 / 40 | 10–15 / 20–25 min | 11.1 / 24.5 | **11.0 / 24.3** |
| — ICP when CPP < 60 | < 30 | 25.3 | **26.2** (MAP0 86.2) |
| — Cushing HR | 45–55 | 48.2 | **48.1** (80.0 → 48.1) |
| — Cushing ΔMAP at 60 s | +30–50 | +24 (`it.fails`) | **+41.7** (`it`, §4) |
| Check 19 MODELED — PaCO2 | 38–42 | 39.9 | **39.86** |
| — ICP 20 / 40 | 10–15 / 20–25 min | 10.0 / 22.6 | **10.0 / 22.5** |
| — ICP at CPP < 60 | < MAP − 58 | 34.6 | **35.6** (MAP0 95.6) |
| — ΔMAP / HR ratio | +30–50 / 0.6–0.8 | +36.9 / 0.76 | **+36.4 / 0.766** (73.2 → 56.0) |
| Hyperventilation RR 30 → PaCO2 30 | −25–30 % | −28.2 % at ≈ 5 min | **−28.0 %** at 6.0 min (ICP 20.19 → 14.53) |
| Mannitol 1 g/kg (7g drug event) | ≤ 0.2875 at 15, ≥ 0.2125 at 30, all 0.2–0.4 | 0.252 / 0.282 / 0.322 | **0.251 / 0.283 / 0.315**; UOP 4.90 vs 0.84 mL/kg/h |
| HTS 3 % 250 mL (7g, `concentrationPct`) | −20–40 % at 10 min | −25.6 % | **−25.5 %** |
| HTS 23.4 % 30 mL → brain | 240 mOsm | 240 | **240** |
| Head-up 30° | −3 to −8 | −6.2 | **−6.25** |
| Check 18 MAP 65 | 0.595–0.805× | 0.62 (MAP 64.7) | **0.669×** (MAP 64.5) |
| — PaCO2 25 | 0.35–0.40×, PbtO2 10–15 | 0.376, 13.8 | **0.378×, 13.8** |
| — MAP 81 + PaCO2 35 | > 0.8× | 0.81 | **0.839×** (MAP 81.0) |
| Haemorrhage (volumeStatus 0.2) | rest > 0.8; < 0.3 + flag; > 0.5 at 90 min | 1.02 / 0.003 / 0.69 | **1.016 / 0.003 + OLIGURIA / 0.687**; lactate 1.27 at the bleed's end |
| Autoregulation A(CPP) | ±0.05 | ±0.01 | CPP 39.8 / 56.4 / 67.1 / 86.2 / 110.9 / 142.0 → 0.606 / 0.945 / 1.010 / 1.009 / 1.009 / 1.016 |
| CO2 reactivity | 0.0255–0.0345 /mmHg | 0.029 | **0.0289** |
| PVI in the engine | +8.2–11.1 % | +8.9 % | **+8.88 %** |
| UOP rest / RPP 97 / RPP 144 | 0.85–1.15; ratio 2.55–3.45 | 1.07 / 1.21 / 3.44 | **1.072 / 1.209 / 3.443** (ratio 2.85); RBF 938 / 936 / 946 |
| Abdominal compartment (IAP 25) | UOP < 0.05 at RPP ≤ 40 | 0.010 at RPP 38 | **0** at RPP 14.4 (the MANUAL 40/22 target) |
| Lactate 5 → 30 min (fallback pool) | 2.4–3.8 | 2.79 | **2.794** |
| ICP alarm (saadat-like, limit 10) | ICP_HIGH | raised | raised |
| Determinism | same seed identical | ✓ | ✓ |
| 24 h no-drift (local, 153 s wall) | ICP ±0.1, UOP ±2 %, lactate ±0.02 | 9.97 → 9.89, 1.074 → 1.079, 0.906 → 0.901 | **9.970 → 9.891, 1.0745 → 1.0791, 0.9056 → 0.9006**; icp index = 125·t + 12 |
| 6 h no-drift (`CI=1`) | same | — | pass (38.7 s) |
| CPU, organ pipeline alone | ≤ 0.05 ms / 20 ms tick | 0.00097 | **0.00101 ms** |

### Pulse oracle O11 (Task 22, run alone, 5 min 11 s)

| Row | Ours | Pulse 4.3.2 | Verdict |
|---|---|---|---|
| UOP abs @ 60 s (mL/min) | 1.163 | 0.381 | expect-differ-ok (D12) |
| MAP Δ @ 1 h | −3.73 | −1.04 | agree (±3) |
| UOP Δ @ 1 h | −0.627 | +0.329 | expect-differ-ok (D-R1: Pulse's urine rises after a bleed) |
| UOP Δ @ 2 h | −0.630 | +0.118 | expect-differ-ok (D-R1) |

Open (as planned): annex §D's MAP-60 premise (`CardiovascularMechanicsModification`, SVR × 0.55) and Pulse's measured
`rppZero` — 7a has no equivalent event and the action is unverified in the Node shim.

## 3. `it.fails` (R45: no band widened)

| Test | Number | Owner / next step |
|---|---|---|
| `test/l2/brain/model.test.ts` check 18 hypocapnic CBF (pure model, CVP 6) | 0.417× vs 0.35–0.40 | Deviation: the tables assume CPP 55; through the engine (PEEP venous floor, CPP 53) it is **0.378×, in band** (Task 18). Calibration. |
| `test/engine/organs-renal.test.ts` check 20, MODELED `hfref` | rests at MAP 86.6, CO 5.61, UOP 0.670; dobutamine → CO 6.23 (+11 %), UOP 0.81 / 0.90 at 30 / 60 min | 7a: no low-output HFrEF profile in MODELED (R-7D-5c). |
| `test/engine/organs-renal.test.ts` check 20, MANUAL contractility 0.3 (new, FU-2 item 7 made the premise reachable) | premise MAP 67.9, CO 3.35 ✓; UOP **0.067** (band 0.1–0.15); dobutamine CO +30 % ✓, UOP 0.244 at 30 min ✓, **0.342** at 60 min (band ≤ 0.3) | Calibration item Q-7D-c20: the kidney's effective-volume reference CO is max(0.08 L/min/kg, the start CO); the MANUAL adult starts above the model's 5.6 L/min, so CO 3.35 reads as a deeper low-output state (V at its floor) than the model's 3.5/5.6. Not re-tuned (R45). |
| `test/engine/organs-curves.test.ts` UOP mid-curve | RPP 75.0 → UOP 0.793 vs the tables' linear 0.583 | Decision 8 (Pulse's reabsorption quadratic): calibration / Stage 8. |

The plan's fourth `it.fails` (check 19 MANUAL Cushing ΔMAP) now passes — §4.

## 4. FU-2 item 6 — the MANUAL "tracker ringing" at low HR (diagnosis)

Red test: check 19 MANUAL (`test/engine/organs-tbi.test.ts`). Before: ΔMAP +24.3 at 60 s, site MAP swinging ≈ 99 ↔ 131
over ≈ 18 s. A per-second trace of the tracker showed the L1 `coupled` sbp/dbp **alternating between 162/106 and
unset** (the tracker key flipping 1618/1059 ↔ 1100/720) and 7a's R estimate dropping 1.45 → 1.0–1.2 at each flip.
Cause: Stage 3's gas step (`l2/resp/pipeline.ts`) deletes `coupled.sbp/dbp` every 100 ms (the retired MANUAL Paw
coupling) and, on its 62.5 Hz grid, can run the gas step for time t one engine pass before the organs' 10 Hz brain step
for the same t — so the haemodynamics saw the surge vanish for part of every 100 ms and the per-beat tracker chased
110/72 ↔ 162/106. Control: the same targets (162/106, HR 48) set directly with `setTarget` hold MAP 129–136 with no
ringing, i.e. 7a's tracker is stable at HR 48.
Fix (inside 7d's partition, `l2/organs/pipeline.ts`): the organ pipeline re-asserts its (idempotent) effects once per
engine pass, after Stage 3 and before the haemodynamics. After: MAP 129–136 beat to beat, ΔMAP **+41.7**, HR 48.1;
MODELED unchanged (+36.4). No `l2/hemo/**` or Stage 2 band change; α_R stays 0.5. FU-2's measured options (α_R 0.15
everywhere, scheduled or resistance-scaled gains) are therefore not needed.

## 5. Deviations and additions (beyond the plan text)

- **D-1 Cushing needs intracranial hypertension** (`l2/brain/model.ts`): both triggers count only while ICP > 22
  (`ICP_THRESHOLD`). Found by the full suite at Task 12: Stage 2 NIBP acceptance 9 (MANUAL SBP 45/30) failed because
  a normal-ICP patient's CPP < 40 fired a Cushing surge that raised the instructor's SBP to ≈ 97, so the NIBP succeeded.
  Systemic hypotension with a normal ICP is the circulation's business, not brainstem compression. Check 19 is
  unaffected (the surge starts at ICP > 50).
- **D-2 Per-pass effect re-assertion** (§4).
- **D-3 ICP lane scale fallback** (`renderer/src/skin-plan.ts`): a skin without an `ICP` IBP-scale row (philips-like)
  drew the ICP lane on the generic 0–150 IBP scale, flattening P1/P2/P3; it now falls back to 0–40 (`WAVE_STYLE.icp`).
  saadat-like keeps its own `ICP` row (−10/15/40).
- **D-4 MANUAL check-20 test added** as `it.fails` (§3) — FU-2 made its premise reachable; the MODELED one stays.
- **D-5 Screenshots are JPEG q70** (the 1140×620 PNGs were ≈ 98–105 KB, over the 60 KB budget; FU-2 used the same).
- **D-7 Evidence-run waits** (`apps/demo/e2e/stage7d.e2e.ts`): `waitSim` 1 500 s and the evidence test 60 min (§8);
  the smoke is unchanged (1.0 min).
- **D-6 7x console follow-up**: 7d's machinery keys are in `INTERNAL_PREFIXES` (beat times, numeric accumulators, the
  organ view copy, effects bookkeeping, event queue, 4 s means, reference CO, osmotic dose list, urine bins, calibration
  constants, TGF state). `organs.brain.*`, `organs.renal.*`/`organs.kidney.*`, `organs.liver.*` and the sensors land in
  brain / kidney / liver. `organs.iap` and `organs.conds` stay in "other": 7x's own tests pin `organs.iap → other` as
  their unknown-path example — mapping them is a 7x.1 item (one line each + the two test rows).
- **SLOW list** (CI rule amendment 2): `organs-soak`, `organs-tbi`, `organs-tbi-treatment`, `organs-htn`,
  `organs-renal`, `organs-curves` join `packages/engine-core/vite.config.ts` SLOW.
- The plan's deviations list stands unchanged (TBI CSF reserve 10 mL, Rout 8, `CBV_EFF` 0.4, PbtO2 exponent, check 18
  pure-model, mid-curve UOP, filtration stops at RPP ≈ 50, GFR 125, hepatic-failure split, the added renal terms, O2
  reactivity onset 60).
- `cbfVaso` (FU-2 D10): 7g now publishes Matta's DIRECT factor; 7d's net CBF = CMRO2 coupling × `cbfVaso` as planned.
  Note for calibration: the plan's fallback vocabulary `vasoDirect()` (only used without 7g, and never with volatiles in
  the engine) still divides the net Matta value by the metabolic share — the pre-FU-2 reading; Q-FU2-CBF.
- Commit trailer: the executor's own model line (`Claude Opus 5.5 (1M context)`), per the plan's global constraint.

## 6. Exceptions, requests

- **E-7d-1** applied (Task 17): `concentrationPct?` on 7g's `drug` event and `DoseLogEntry`, validated (HTS only: 3,
  7.5, 23.4; default 3) and copied into the dose log; the HTS row text names 23.4 %. 7g's tests unchanged (84 unit,
  34 engine pass).
- **E-7d-2** applied (Task 1): the controller's scenario driver skips `icp/pbto2/urometer` sensors.
- G-FU2 sibling: `organsCtx.setHr` calls `holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false)` after its
  `ps.hr` write.
- Requests R-7D-2 (7c seams/names) — names verified against the 7c branch source (`blood.out.{hb, albuminGL, bvRel,
  hbfRel, lactate}`, `blood.core.{liver, renal}`); `out.gluconate` is not exposed by 7c yet (7d reads 0). R-7D-3 (7g):
  E-7d-1 done; temperature double count resolved by FU-2 D11. R-7D-4 (7f/7e): unchanged. R-7D-5: (a) resolved in 7d
  (§4); (b) resolved by FU-2 item 7; (c) open; (d) open. R-7D-6: none.

## 7. 7c

7c was not on `main` when this gate ran (open branch `stage-7c-blood`). The adapter's duck-typed names match 7c's
source (above). **Not done:** re-running the adapter/engine tests against the real `blood.out.*` / `blood.core.renal`
/ `core.liver` fields — to do when 7c merges (the organ tests to watch: `organs-renal`, `organs-curves` lactate, the
pipeline 7c-seam test, and 7g's `hepFnTemp` path which switches on once both `blood.core.liver` and `organs.liver`
exist).

## 8. Gate runs (branch head after the last `origin/main` merge, 2026-09-27)

- `typecheck`: clean (whole repo). `build`: clean. `check-notices`: OK (N-P19 added, N-P10 "How used" extended;
  the three renal files carry the SPDX/Apache header ending `NOTICES N-P19`).
- `CI=1 pnpm -r test` (6 h long-run horizon): engine-core **936 passed / 2 skipped** (218 files, 206.9 s), controller
  197, skins 170, renderer 69, ventilator 88, audio 58, validation 17 (+6 skipped: Pulse runs), demo 114 — all green.
- 7d's own tests: model/pipeline **53** (brain 21, renal 14, liver 4, organs 14) + engine **29** (wiring 2, check 19
  5, alarm 2, treatments 5, check 18 3, renal 3, curves 6, soak 3) = 82, of which 4 `it.fails` (§3); plus renderer 3,
  skins 2, validation 2.
- 24 h soak locally: 153 s wall (`organs-soak`); the `CI=1` 6 h variant 38.7 s.
- `PW_SYSTEM_CHROME=1 pnpm test:e2e`: **28 passed, 1 skipped** (the PME_SHOTS evidence run) in 9.1 min; the stage7d
  smoke 1.0 min. Other stages' evidence images regenerated by the run were reverted, not committed.
- Pulse oracle O11 alone: 5 min 11 s, all four rows as expected (§2).
- Screenshots: `node apps/demo/scripts/stage7d-shots.mjs` 24.9 min (Chromium only; the evidence test skips WebKit).
  The first attempt timed out in the 3600 sim-s fluids phase (a 600 s `waitForFunction` at ×4 needs 900 s): the wait
  is now 1 500 s and the test budget 60 min (D-7).

## 9. Screenshots (`docs/gates/stage-7d/`, JPEG ≤ 60 KB, 1140 × 620: monitor + organ panel)

| File | What it shows |
|---|---|
| `rest.jpg` (54 KB) | TBI profile at rest (t 59 s): ICP 11, CPP 75, PbtO2 26, UO 64 mL/h; a small pulsatile ICP on the 0–40 lane. |
| `icp-25-p2-over-p1.jpg` (52 KB) | Mass 15 mL, 90 s later: ICP 31, CPP 54, ICP HIGH; the ICP pulse shows P2 > P1 (elastance 3.6 mmHg/mL). |
| `after-mannitol-15min.jpg` (55 KB) | 15 min after 7g's mannitol 1 g/kg: ICP 15, CPP 71, UO 309 mL/h (osmotic diuresis), trend line falling. |
| `cushing.jpg` (51 KB) | Mass 28 mL: Cushing — ART 162/106 (132), HR 49, ICP 78, CPP 54, drive 1.00, ABP alarm. |
| `oliguria.jpg` (58 KB) | Adult, MANUAL bleed (volumeStatus 0.2, 85/50, HR 125): MAP 58, GFR 15, UOP 0.01 mL/kg/h, UO tile OLIGURIA. |
| `uop-recovery.jpg` (53 KB) | 60 min after fluids (122/74, GFR 125): instantaneous UOP 0.64 mL/kg/h (recovering, neurohumoral washout τ 45 min); the rolling 1 h mean 0.32 still shows OLIGURIA. |
