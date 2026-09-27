# Stage 7g gate: drug PK/PD (compartment PK + effect sites, TCI, volatiles, PD combination, 58-drug library)

**Gate question.** Does the drug layer give the published PK (Ce curves, TCI, CSHT, FA/FI, MAC(age), NMB and sugammadex
time courses) through the engine without adding PK error? Do the vasoactives, context and reversal meet the tables'
bands? Does it honour the R51 drug-layer contract, stay inside the CPU budget and keep the Stage 2/3/7a suites green?

**Answer.** Mostly. All PK acceptance passes: engine Ce equals the standalone model to < 5·10⁻⁷, and every model number
reproduces its prototype. The vasopressor dose–response for phenylephrine and norepinephrine, acidosis, tachyphylaxis,
MAC(age), naloxone and all four sugammadex bands pass. CPU is 4.7 µs per tick and the 24 h run is exact.

Five items miss and are kept under R45 (band unchanged, `it.fails` with the measured number, or a failed gate shot):

- NR-7g-1: propofol 2 mg/kg MAP band (7a sanity).
- NR-7g-2: dobutamine CO band.
- NR-7g-3: Stage 3 alveolar ventilation band in `pk-bus`.
- NR-7g-4: the LAST → VF gate screenshot at the demo's 80 kg.
- NR-7g-5: MODELED mode drives every rate-driven rhythm from the circulation (a 7a observation).

Branch `stage-7g-pkpd`; plan `docs/plans/stage-7g-pkpd.md` (ticked).

## 1. PK numbers (unit level; prototype numbers in the plan reproduced exactly)

| Check | Measured | Band / published |
|---|---|---|
| Eleveld reference (35 y, 70 kg, 170 cm, M) | V1 6.28 L, CL 1.790, Q2 1.830 (D4), ke0 0.146 | Eleveld 2018 |
| TTPE | Schnider (53/77/177) 1.550 min; Eleveld 2.910; Marsh 3.920; Minto 40 y 1.433, 80 y 2.263; fentanyl 3.603 (ke0 0.117, D2); sufentanil 5.593 (ke0 0.176) | Schnider 1.44–1.76; Eleveld 2.6–3.2; Marsh 3.5–4.3; fentanyl 3.6 ± 3 %; sufentanil 5.6 ± 3 % |
| ke0ForTtpe(Shafer, 3.6 min) | 0.1172 /min | 0.117 |
| Eleveld 2 mg/kg | Cp(1 min) 10.641 µg/mL; Ce peak 2.997 | 10.64; 2.7–3.3 |
| TCI Eleveld Ce 3 | 140.4 mg in minute 1; 95 % at 2.35 min; max Ce 3.0005; ends 3.000 | 126–154; 2.1–2.6; < 3.003 |
| TCI Schnider Ce 3 | 53.1 mg; 95 % at 1.21 min; max Cp 10.40 | 1.0–1.4; Cp > 6 |
| TCI Marsh Cp 4 | 79.7 mg in minute 1; max Cp 4.00 | 70–86; ≤ 4.001 |
| TCI Minto Ce 4 ng/mL | 68.4 µg; 95 % at 1.09 min; max Ce 4.0013 | 0.9–1.3; < 4.004 |
| CSHT 1 / 3 / 8 h (min) | Eleveld 2.7/4.5/12.1; Schnider 2.2/3.5/9.3; Marsh 6.7/8.6/12.1; Minto 2.1/2.1/2.1; fentanyl 17.8/70.0/256; sufentanil 10.8/25.6/35.1 | decision 3 (own value ± 10 %, < 40 min at 8 h; remi 2–4, flat; fentanyl 3 h > 3× 1 h; sufentanil 3 h 20–30) |
| FA/FI at 1/5/10/30 min, FI held | N2O .61/.83/.88/.92; des .62/.83/.88/.91; sevo .55/.73/.81/.85; iso .39/.55/.64/.72 | Yasuda 1991 (des .90, sevo .85, iso .73 ± .04; N2O > .9) |
| Time to FA/FI 0.5 | N2O 0.59, des 0.57, sevo 0.73, iso 3.38 min | des < sevo < iso; sevo 0.5–1.0 |
| FA/FD at FGF 1 L/min, 30 min | N2O 0.65, des 0.63, sevo 0.50, iso 0.32 | sevo 0.45–0.55 |
| MAC(age) sevoflurane | 2.04 / 1.80 / 1.59 / 1.40 % at 20/40/60/80 y | Mapleson 1996 |
| NMB onset / duration (T1 ≤ 1 % / T1 25 %, min) | roc 0.6 1.77/30.0; roc 1.2 0.77/62.9; vec 0.1 3.60/26.8; cis 0.15 2.82/42.4; sux 1 0.43/7.2; sux het 12.0 (×1.67); sux hom 310.6 (5.2 h) | labels (Task 5 bands) |
| Remifentanil 1 µg/kg at 30 s | vent site 3.98 vs brain 2.79 ng/mL (×1.42) | vent > 1.2 × brain (R51 §2) |
| Sugammadex 2 mg/kg 20 min after roc 0.6 | thumb Ce 1858 → 510 ng/mL at +3 min (×0.275); plasma-bound fraction 0.136 | < 0.4× (plasma-only binding 0.62×) |
| NE 0.1 µg/kg/min, 15 min | rate-equivalent 0.0984 | 0.1 (steady state) |
| Sevo 2 % FGF 6 + N2O 0.5, 10 min (pipeline) | sevo 0.694 MAC, N2O 0.373 MAC | > 0.6; > 0.3 |

## 2. Through the engine

- **Engine vs standalone:** Eleveld 2 mg/kg in the engine equals the standalone model to < 5·10⁻⁷ at +180 s. This test
  exposed two wiring bugs, both fixed in `pipeline.ts`:
  - The hypothermia clearance term was referenced to 37 °C, but the engine's normothermic core is L1 `tempCore`
    36.8, so every patient ran at clearance ×0.99. It is now referenced to `STATE_SCHEMA.tempCore.def`.
  - The committed pk state trails a command by < 1 step. A compartment bolus now waits for its own 0.1 s grid instant.
- **TCI induction:** propofol Ce 4 + remifentanil Ce 3 (45 y, 80 kg) is on target before 190 s and held at 900 s.
- **Panel decrement:** remifentanil 0.2 µg/kg/min for 60 min shows a 50 % decrement of 1.8–4 min.
- **Bus (`pk-bus`):** sevoflurane 2.5 % at FGF 4 + N2O 0.5, 15 min, 40 y: sevo 0.852 MAC, N2O 0.362, total 1.214.
  TCI propofol 2 + remifentanil 2: both brain Ce and the remifentanil vent site are at 2.0, `uSurface` exceeds the sum,
  and there is no `resp` block (R51 §2).
- **Wiring:**
  - Every library id, including 7c's (calciumChloride) and the shared ones (succinylcholine), is accepted and on
    `bus.agents`; an unknown id is rejected ("unknown drug …").
  - Snapshot/restore mid-TCI continues identically.
  - Adenosine converts AVNRT and resets the rhythm clock to 95/min (MANUAL).
  - A β-blocker drug blunts 7e's `endoHrF` surge (R51 addendum 11).

## 3. PD acceptance (engine, MODELED, ventilated, 70 kg; MAP change at 20 min vs the 2 min before)

| Check | Measured | Band |
|---|---|---|
| Phenylephrine 0.1 / 0.25 / 0.5 / 1.0 µg/kg/min | MAP +16.7 / +25.1 / +31.3 / +37.0 % | +8–22 / +18–32 / +25–40 / +30–45 ✓ |
| Norepinephrine 0.05 / 0.1 / 0.2 | +22.4 / +32.5 / +43.3 % | +10–25 / +18–35 / +25–45 ✓ |
| Phenylephrine 100 µg (new path) | ΔMAP within +15–25 (7a sanity and `pk-wiring` both green) | +15–25 ✓ |
| **Dobutamine 5 µg/kg/min** | **CO +4.2 %** (MAP +0.9 %, HR +9.9; Ees ×1.33, SVR ×0.90); β-blocked −1.2 % | **+20–40 ✗ (NR-7g-2)**; β-blocked ≤ half ✓ |
| Acidosis, PD level | pH 7.2 SVR rise / pH 7.4 = acidosisFactor 0.5 | ≤ 0.6 ✓ (engine-level test skipped: 7c not on main) |
| Ephedrine 10 mg ×3 at 10 min | SVR increments 0.120 / 0.029 / 0.012 | third ≤ 0.6 × first ✓ |
| MAC(age), sevo 2 % FGF 6, 20 min | MAC fraction 40 y 0.773, 80 y 0.943 (MAC 1.40) | 80 y ≥ 1.2 × 40 y ✓ |
| Naloxone 0.1 mg at remifentanil Ce 3 | raw Ce held at 3; remi-eq ≤ 0.7×; `antagonist.opioid` ≥ 1.4 | ✓ |
| Sugammadex 2 mg/kg at T2 (roc 0.6) | TOFR 0.9 in **2.11 min** | 1.5–4 (label 2.2) ✓ |
| Sugammadex 4 mg/kg at 1–2 PTC | **2.22 min** | 2.1–4.3 (label 2.7) ✓ |
| Sugammadex 16 mg/kg 3 min after roc 1.2 | T1 10 % **1.80 min**, TOFR 0.9 2.20 min | 0.6–2.0 (label 1.2, Q51), < 5 ✓ |
| Sugammadex 0.5 mg/kg 5 min after roc 1.2 | TOFR 0.9 > 10 min (prototype 129.5) | recurarisation ✓ |

The 7a sanity files through the new engine:
- Phenylephrine 100 µg, class II haemorrhage and β-blocked haemorrhage stay in band.
- Propofol 2 mg/kg: **MAP ratio 0.913, HR +16.6 at 2 min** (band 0.60–0.80, < +15), NR-7g-1.
- AS + CAD 75 y, 1.5 mg/kg: MAP 109 → 101 at 2 min (0.924; plan target MAP 60–65 not met); phenylephrine rescue
  123 mmHg at +90 s (≥ 85 ✓). 7a's NR-2 `it.fails` stay `it.fails`.

## 4. Scenarios, determinism, CPU, 24 h

- **Adenosine (pipeline):**
  - 6 mg in 70 kg: E_peak 0.85, standstill from 8.9 s, then sinus at 23.5 s.
  - 3 mg: E 0.59, block 12.0–18.5 s, then AVNRT resumes.
  - 12 mg: E 0.96, 7.3 → 26.9 s.
  - Flutter always resumes.
- **Adenosine (engine, 26 y F 58 kg, MODELED):** a > 2 s pause 5–40 s after the push, then sinus < 110 ✓.
- **LAST (pipeline, 70 kg):**
  - Bupivacaine 150 mg: peak free 6.15 µg/mL, E_cv 0.78, seizure at 28 s, sinusBrady at 52 s.
  - Bupivacaine 225 mg: peak free 9.23, E_cv 0.92, seizure at 17 s, sinusBrady at 28 s, vfCoarse at 78 s.
  - 225 mg with lipid at 30 s (1.5 mL/kg + 0.25 mL/kg/min): free level at 240 s is 5.58 vs 8.19 (×0.681), E_cv 0.73
    vs 0.90 ✓ (≥ 30 % lower).
- **Determinism:** same seed and script give an identical ABP hash and `drugs` stream; another seed differs ✓.
- **CPU:** 10 concurrent drugs (2 TCIs, 3 infusions, boluses, sevoflurane) run `advancePk` at **4.7 µs per 20 ms
  tick** (budget 50 µs).
- **24 h (`pk-longrun`, on `test/helpers/longrun.ts`: 24 h locally, 6 h on CI):** TCI propofol 2.5 + remifentanil 2
  + sevoflurane 1 %.
  - `latestSampleIndex(abp)` = 10,800,012 and `ecgII` = 43,200,050, exact.
  - Ce 2.50 / 2.00 held; volatile MAC > 0.4; every value finite; 123 s wall.

## 5. Deviations from the plan (every change, and why)

1. **Task 1 test:** the `Command` literals lacked `id`/`issuedBy` (typecheck error). Added in the map; test only.
2. **Task 18:** the `vaLpm > 3` assertion was split into an `it.fails` (NR-7g-3). The MAC assertions of the same test
   pass.
3. **Task 20:** no propofol re-fit. No value inside the permitted T6.3 ranges meets the band (grid below), so the
   tables' values stay: SVR −0.45, EC50 3.5, gvHr −0.7. The band is `it.fails` in `circ-sanity-1`. The `circ-events`
   assertion "rejects the rest until 7g" now expects acceptance plus an unknown-id rejection, the same class as the
   plan's controller-test change.
4. **Task 21:** the two wiring fixes in §2 (normothermia reference, bolus on its own grid instant).
5. **Task 22:** the dobutamine band was split: the band is `it.fails` (NR-7g-2); the β-blocked relation passes as
   its own test. No vasoactive EC50/ke0 and no sugammadex ke0 was re-fitted (all other bands met at the plan's values).
6. **Task 23:** three changes.
   - `units.ts` `toAmount` checked the mL rule, which demands a syringe concentration, before `base === amountUnit`.
     Every mL-dosed row (lipid 20 %, hypertonic saline) therefore produced an error string, a NaN dose, and a
     rejection at the API. Fixed the order, with two regression assertions in `units-gamma.test.ts`.
   - The adenosine hook on AV-node-dependent SVT now requests `pWaveAsystole` {atrialRateBpm 110}: ventricular
     standstill with P waves, no escape and no rate drive. The plan's `avb3Narrow` {rateBpm 20} cannot carry the
     pause: the rhythm library clamps its junctional escape to 40–60/min (1.5 s gaps), and MODELED mode drives its
     rate from the circulation (69/min). AF/flutter/atrial tachycardia keep `avb3Narrow` and sinus keeps
     `sinusPause`; the `hooks.test.ts` first-id assertion follows.
   - `pk-longrun` uses the shared long-run helper (CI rule).
7. **Task 24:** the renderer test runs under `// @vitest-environment happy-dom`; the renderer had no DOM tests.
8. **Commit trailer:** `Co-Authored-By: Claude Opus 5.5 (1M context)`, which is the harness attribution and the plan's.
9. **Plan deviations D1–D5, D7 and the vent-ke0 item** are carried unchanged and all hold as prototyped:
   - D1: phenylephrine EC50 0.25.
   - D2: fentanyl ke0 0.117, sufentanil 0.176.
   - D3: CSHT per model.
   - D4: Eleveld Q2 1.83.
   - D5: remifentanil TTPE 1.43 min at 40 y, 2.26 min at 80 y.
   - D7: sugammadex site ke0 0.095/0.152.
   - Fentanyl/sufentanil vent ke0 = brain ke0 [ENG].

**[ENG] values from the fixer pass, as coded:**
- Sugammadex effect-site ke0 0.095 / 0.152.
- Cholinesterase multipliers `PCHE_CL_MULT`: het 0.5, hom 0.003.
- Opioid haemodynamic EC50s: remifentanil 3, fentanyl 2, sufentanil 0.25 ng/mL.
- β-occupancy: esmolol EC50 100 rate-eq, Emax 0.9; labetalol 0.6; metoprolol 0.7.
- Esmolol 2-compartment set: V1 2.71, V2 0.69 L/kg, Q 0.175 L/kg/min.

Calibrations made: none. Vec/cis/sux ke0 and the sugammadex ke0 met their bands at the plan's values; no vasoactive
EC50 changed; the propofol re-fit was not applied (NR-7g-1).

## 6. Screenshots (docs/gates/stage-7g/, 32–42 KB each; e2e on system Chrome, 7.2 min)

| Shot | Shows |
|---|---|
| `tci-induction-3min-{monitor,panel}` | propofol Ce 3.91 / remifentanil Ce 3.00 on target, both sparklines; ABP 102/71 (79) ✓ |
| `phenylephrine-peak-*` | +60 s: ABP 142/102 (116), HR 60, ABPm high alarm ✓ |
| `sevo-fgf2-10min-*` vs `sevo-fgf05-10min-*` | FGF 2: FI 1.29 FA 0.94 brain 0.79 %, 0.46 MAC; FGF 0.5: FI 0.55 FA 0.38 brain 0.31 %, 0.18 MAC; the low-flow lag ✓ |
| `adenosine-block-*` | +18 s: P waves without QRS, ASYSTOLE alarm, ABP 26/22 ✓ |
| `last-vf-*` | **failed gate item (NR-7g-4):** +180 s sinus 60, ABP 93/68 (77), "LAST: SEIZURE"; bupivacaine free Ce 7.85 µg/mL, no VF |

## 7. Requests to other stages

Unchanged from the plan's "Requests" section:
- 7a: accept the marked `model.ts` edits and the phenylephrine-offset finding.
- 7b: read the airway/HPV bus.
- 7c: take the chemistry doses from `bus.doses`.
- 7d: publish `kidney.gfrRel`.
- 7e: read the metabolic bus; the surge is β-blunted.
- 7f: the R51 bus reads; draw the seizure flag; `vasoResp`; the gamma-row units; the antagonist multipliers.
- 6b: drop the scripted adenosine block.

Added: **7a/rhythm, NR-7g-5.**

## Needs a ruling

### NR-7g-1: propofol 2 mg/kg MAP 60–80 % at 2 min with HR rise < 15 (7a sanity, tables §7 check 10)

Measured on the Eleveld Ce with T6.3's E = Ce/(Ce + 3.5):
- MAP ratio 0.913 and HR +16.6 at 2 min; the nadir is 0.910 at the 3 min Ce peak.
- Ce is 2.75 µg/mL at 7 min.

Permitted re-fit grid (in the plan's order):

| Setting | MAP ratio | HR rise |
|---|---|---|
| gvHr −0.8 (step a) | 0.913 | +15.3 |
| + SVR −0.55 (step b) | 0.896 | +18.5 |
| + EC50 2.5 (step c, the corner) | 0.867 | +19.6 |
| gvHr −0.5, SVR −0.55, EC50 2.5 | 0.869 | +25.4 |

For diagnosis only, the Schnider ke0 gives 0.838 / +18.6.

Why: 7a's Bateman fit used E ≈ 0.9 at the peak, while T6.3 gives E ≈ 0.44 at Ce 2.75. The reflex then recovers most
of the fall. A Hill > 1, a larger T6.3 Emax or a stronger reflex depression needs a table ruling (Q57). The elderly
AS + CAD scenario falls only to 0.924 (plan target MAP 60–65).

### NR-7g-2: dobutamine 5 µg/kg/min CO +20–40 %

Measured +4.2 %. With EC50 ×0.5 (the Task 13 limit) it reaches +6.4 % (Ees ×1.47, SVR ×0.85, HR +19.5). 7a's
circulation is venous-return limited, so inotropy alone barely moves CO. A β-agonist venous mechanism (unstressed-volume
mobilisation) is not in the tables.

### NR-7g-3: Stage 3 alveolar ventilation at VT 500 × 12 > 3 L/min

Measured 2.818 L/min, constant from 60 s. VD is 154 anatomical + apparatus + Stage 3's calibrated `vdExtraMl` 61, so
VD/VT is 0.53. 7g only stores the value. The volatile uptake uses it, which slows wash-in versus the prototype's 4.2
L/min.

### NR-7g-4: LAST → VF gate screenshot

Bupivacaine 225 mg in the demo's 80 kg patient (2.8 mg/kg) peaks at E_cv 0.88, below the 0.9 VF threshold. At 70 kg VF
comes at 78 s. Two ways to resolve it: (a) the thresholds Q-7g-2 (bupivacaine CV 4 µg/mL, Hill 3), or (b) the demo's
dose or patient. Neither was changed.

### NR-7g-5 (observation for 7a): MODELED mode sets every rate-driven rhythm's rate from the circulation

`svtAvnrt` set at 180/min runs at 69/min, and the LAST `sinusBrady` 40 shows 60. 7g's adenosine path avoids this with a
rate-free rhythm; drug-induced brady/tachy rhythms will need a 7a rule for which rhythms the reflex may drive.

### Questions for Ali (carried)

- **Q-7g-1:** propofol CSHT band. 20–25 min at 3 h is Hughes 1992's; Eleveld / Schnider / Marsh give 4.5 / 3.5 / 8.6.
- **Q-7g-2:** LAST thresholds.
- **Q51:** sugammadex 16 mg/kg T1 10 % 1.80 vs label 1.2 min (D7).
- **Q57:** Eleveld arterial ke0 TTPE 2.9 vs Miller's 90–100 s; also feeds NR-7g-1.
- **Q58:** fentanyl ke0.
- **Q60:** norepinephrine EC50.
- **Iranian availability:** the `ir: '?'` column on all 58 rows.

## 8. Final gate run and CI

Local run on the branch after merging `origin/main` (36097c1), 2026-09-26:

| Step | Result |
|---|---|
| `pnpm typecheck` | clean |
| `pnpm -r test` | 1,283 passed, 7 skipped; `it.fails` entries count as passed |
| `pnpm build` | clean |
| `pnpm check-notices` | OK |
| `PW_SYSTEM_CHROME=1 pnpm test:e2e` | 25 passed (8.0 min), including `stage7g.e2e.ts` |

Unit results by package:

| Package | Passed | Skipped |
|---|---|---|
| engine-core | 692 | 2 |
| controller | 196 | 0 |
| skins | 168 | 0 |
| ventilator | 87 | 0 |
| renderer | 66 | 0 |
| audio | 58 | 0 |
| validation | 16 | 5 |

Stage 7g test files:
- `test/types-pk.test.ts` and `test/l2/pk/*`: 14 files.
- `test/engine/pk-{wiring,bus,acceptance-pk,acceptance-pd,acceptance-scen,longrun}.test.ts`.
- `packages/renderer/test/drug-panel.test.ts`.

The e2e run rewrites every stage's gate PNGs; the committed images are the verified Task 24 set.
