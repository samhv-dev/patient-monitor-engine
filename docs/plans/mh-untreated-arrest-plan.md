# Plan: an untreated MH crisis that arrests from its own couplings, on a literature timeline

Investigation of 2026-10-30. The owner's report: **"the MH case did not arrest despite no treatment."** Brief:
`scratch/briefs/investigate-mh-untreated-no-arrest.md`. No product code was changed; this file is the only commit
(branch `investigate-mh-arrest`, from `origin/main` 6d19b8b3).

Trees measured (worktrees under `scratch/`):

| Tree | Head | Worktree |
|---|---|---|
| main | `origin/main` 6d19b8b3 | `wt-mh-arrest` (branch `investigate-mh-arrest`) |
| #209 `fix-mh-cutaneous-vasoconstriction` | 9b5e313c (on 6d19b8b3) | `wt-mh-arrest-209` (detached) |
| #154 `fix-e134-anaerobic-k` | cf1c7b9c (on its old base 2f0b0c77) | `wt-mh-arrest-154` (detached) |
| #209 + #154 | 9b5e313c + `git merge --no-commit` of cf1c7b9c | `wt-mh-arrest-combo` (uncommitted, measurement only) |

**The two branches do not merge cleanly**: 12 files conflict, none of them engine source (the card's `story`/`notes`,
the MH and debrief slow/fast tests, two engine tests, six generated or hand-written docs). #154 does not merge cleanly
onto main either (the card text, the MH slow test, the debrief test, two generated docs). For the combination I took
#209's side of every conflict and re-added #154's one non-text card change (`"phenotype": "typical"` on the condition
event). Every engine source file is the automatic merge. The combination is a measurement tree and nothing more.

Probe: `scratch/mh-arrest/zz-mh-arrest-probe.test.ts` (copied into each worktree's `apps/demo/src/app/showcase/` to
run, never committed). It loads `showcase-mh.json` the way the slow test's harness does, with engine seed 7 or 8,
`truthHz` 1 and the driver polled every 0.1 s of sim time. It presses the run sheet's induction (Premedicate 0:30,
Preoxygenate 1:00, Induce, i.e. propofol + succinylcholine with MH starting there, at 4:00, Intubate 5:00, Start
surgery 6:00), then nothing, up to 8100 s (sux + 131 min). Logs, one row per minute plus 1 Hz before and after the
arrest: `scratch/mh-arrest/run-wt-mh-arrest{,-209,-154,-combo}-s{7,8}.log`. Extra runs:
`run-wt-mh-arrest-{154,combo}-fulminant-s7.log` (#154's `fulminant` phenotype) and `run-209-rv-s7.log` (the RV
ischaemia index printed).

---

## 1. The measured course

### 1.1 Firsts (minutes after the succinylcholine; seed 7 / seed 8)

| First | main | #209 | #154 | #209 + #154 |
|---|---|---|---|---|
| Early signs (card state) | 4.1 / 4.1 | 4.1 / 4.0 | 3.8 / 3.8 | 3.75 / 3.7 |
| EtCO₂ > 60 | 8.6 / 8.5 | 8.4 / 8.5 | 7.4 / 7.4 | 7.3 / 7.2 |
| pH < 7.2 | 9.2 / 9.2 | 9.1 / 9.1 | 8.0 / 7.9 | 7.8 / 7.8 |
| First arrhythmia (first PVC; the rhythm itself stays sinus) | 10.9 / 9.6 | 10.8 / 9.5 | 9.2 / 8.3 | 9.0 / 8.2 |
| K⁺ > 5.5 | 15.6 / 15.6 | 15.6 / 15.6 | 114.3 / 114.6 | 100.6 / 100.8 |
| pH < 7.0 | 17.6 / 17.6 | 58.5 / 58.6 | 16.3 / 16.2 | 16.0 / 15.9 |
| K⁺ > 6.5 | 25.4 / 25.4 | 25.5 / 25.5 | 115.1 / 115.4 | 101.1 / 101.3 |
| Tcore > 38.5 | 102.6 / 102.6 | 45.4 / 45.4 | 82.5 / 82.5 | 39.9 / 39.9 |
| Tcore > 40 | never | 89.6 / 89.6 | never | 73.7 / 73.7 |
| K⁺ > 7 | never | never | 115.5 / 115.8 | 101.4 / 101.5 |
| **Arrest** | **none in 131 min** | **123.8 / 126.7** | **118.1 / 117.7** | **103.3 / 102.7** |
| Arrest rule (`hemo.circ.arrest.cause`) | — | `lowFlow` (RV ischaemia) | `hyperkalaemia` | `hyperkalaemia` |
| Onset rhythm | — | VF / PEA (sinus, pulseless) | VF / VF | VF / VF |

Peaks with a pulse (seed 7; seed 8 within 0.1 of it except K): main K⁺ 6.80 at +38 min, then falls to 6.38;
Tcore 38.65; pH 6.86; EtCO₂ 105; lactate 22.7. #209 K⁺ 6.81; Tcore 40.70; pH 6.71; HR 190. #154 K⁺ 9.30 (seed 8
8.64) at the moment of the VF; Tcore 38.80; lactate 16.3. #209 + #154 K⁺ 9.82 (8.75); Tcore 40.92.

#154 with `phenotype: "fulminant"` (VO₂ × 5, Nelson 2001), seed 7: EtCO₂ > 60 at +3.1 min, pH < 7.0 at +8.0,
K⁺ > 5.5 at +20.2, > 7 at +24.7, **VF at +25.9 min** (hyperkalaemia) at Tcore 38.1. The same on #209 + #154: VF at
+25.8 at 39.1 °C.

### 1.2 The course every 10 minutes (seed 7)

main (no arrest):

| min | MH act | VO₂ | EtCO₂ | PaCO₂ | pH | lact | K⁺ | Tc | HR | MAP |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 263 | 45 | 50 | 7.32 | 1.0 | 4.21 | 36.67 | 63 | 89 |
| 10 | 0.67 | 489 | 68 | 74 | 7.18 | 1.9 | 4.78 | 36.44 | 105 | 82 |
| 20 | 1 | 627 | 91 | 100 | 7.04 | 5.2 | 6.09 | 36.58 | 124 | 82 |
| 30 | 1 | 631 | 81 | 89 | 7.05 | 8.2 | 6.68 | 36.80 | 134 | 86 |
| 40 | 1 | 635 | 74 | 82 | 7.04 | 10.8 | 6.80 | 37.04 | 134 | 88 |
| 60 | 1 | 643 | 67 | 75 | 7.00 | 14.8 | 6.68 | 37.54 | 141 | 92 |
| 80 | 1 | 652 | 63 | 71 | 6.96 | 17.9 | 6.52 | 38.05 | 128 | 89 |
| 100 | 1 | 659 | 61 | 69 | 6.92 | 20.1 | 6.43 | 38.46 | 158 | 90 |
| 120 | 1 | 662 | 60 | 68 | 6.88 | 21.9 | 6.39 | 38.64 | 146 | 85 |
| 130 | 1 | 662 | 60 | 68 | 6.86 | 22.7 | 6.38 | 38.65 | 149 | 88 |

#209: the same to +20 min, then the core climbs (37.28 at 20, 38.70 at 50, 40.01 at 90, 40.65 at 120); HR 150–190
from +70 min; MAP 80–90 to +110 min, then 60 at +120 and 49 at +123; K⁺ 6.5 throughout.

#154: K⁺ 4.79 at 20 min, 5.04 at 40, falling to 4.57 at 113; then 5.15 (114), 6.42 (115), 7.49 (116), 8.43 (117),
9.30 (118), VF. Tc 38.79 at the arrest. After the arrest K⁺ reads 12.7 (120), 39.9 (130); in the fulminant run 139.

### 1.3 Why main does not arrest: each arrest rule against its threshold

The arrest rules are in `packages/engine-core/src/l2/circ/arrest.ts` (`arrestStep`) and `hypoxic-arrest.ts`. On main,
minute by minute from +100 to +130 min, none comes near its threshold:

| Rule | Threshold | main, +100 → +130 min |
|---|---|---|
| Hyperkalaemic hazard on the membrane-effective K (`kEcg`) | > `K_HAZARD` 8.5 mmol/L | 6.43 → 6.38 (peak 6.80 at +38) |
| Hyperthermic VF hazard | Tcore > `T_HOT` 42 °C | 38.46 → 38.65 (a plateau) |
| Low-flow: `min(kIsch, kIschRv)` | ≤ `K_ISCH_ARREST` 0.1 | kIsch 0.997–1.000 |
| No flow: MAP | < 25 for 60 s | 85–90 |
| Hypoxic: `cor.hyp` | ≥ 0.9 | 0.000 (SaO₂ 0.99) |
| Cold hazard | < 28 °C | — |

What the acidaemia does reach on main is ectopy (`circ/ectopy.ts`, the pH term from 7.20 and full at 7.00): 2662 PVCs
in the run, up to 43 a minute with non-sustained runs. That module says so itself: ectopy is "never a second route to
VF". The pH also halves contractility (`blood/circ-adapter.ts` `chemistryContractility`, 1 − 1.5·(7.2 − pH) = 0.49 at
6.86), and the MH catecholamine surge (`endoEesF` 1.7) carries it: MAP holds 85–90.

So on main the K⁺ is the only road to an arrest, and it is closed by construction. K⁺ is a set point,
`kSet = 4.2 + MH_K_EFFLUX 2.35 × activity − 4.0 × (pH_nonorganic − 7.40) + β2/insulin` (`l2/endo/core.ts`,
`l2/blood/core.ts`). It is fitted to "K 5.5–6.5 by 20 min", it peaks at 6.8, and it falls as the catecholamine β2
uptake grows. The heat runs into a dilated periphery, so the core plateaus at 38.65 °C, far below the T_HOT 42 that
the E131 heat can never reach.

### 1.4 How #209, #154 and the two together arrest

- **#209: low-flow arrest of the right ventricle, at K⁺ 6.5.** The skin constriction keeps the heat in. The core
  passes 40 °C at +90 min, and with the fever term (`thermal/metabolic.ts` `tempHrF`, +12 %/°C) and the surge HR runs
  150–190. Diastole shortens, MAP falls 80 → 49 over minutes 110–123, and pH reaches 6.71. The RV's flow share
  `kIschRv` falls 0.42 (+120) → 0.13 (+123.7) → ≤ 0.1, and the low-flow rule fires. The LV `kIsch` is still 0.52 then
  (`run-209-rv-s7.log`). The onset draw gave VF on seed 7 and a pulseless sinus (PEA) on seed 8. This is an emergent
  death from heat and tachycardia, but at +124 min, with no hyperkalaemia, and with the hyperthermic hazard never
  involved (40.7 < 42).
- **#154: hyperkalaemic VF, 4–5 min after the muscle starts to die.** The activity leak (`K_ACT_PER_VO2X` 0.36 × the
  VO₂ multiple) holds K⁺ near 4.6–5.0. The injury dose (unpaid ATP: the O₂ deficit the braked glycolysis cannot pay,
  plus CEM43) crosses its tolerance of 120 dose-minutes at about +113 min. Necrosis then hands 100 mmol per kg of
  injured muscle straight into the ECF: K⁺ rises 4.6 → 9.3 in 5 min (≈ 1 mmol/L/min, ≈ 6/min in the fulminant run),
  passes `K_HAZARD` 8.5, and the hazard draws VF. After the arrest the transfer goes on with no circulation (K⁺ 40–140).
- **#209 + #154: the same hyperkalaemic VF 15 min earlier** (+103). At 40–41 °C the CEM43 thermal dose adds to the
  same tolerance (`muscle.ts`), so the injury starts at +100 min instead of +113.

In every tree the K⁺ stays where main's fitted term or #154's sourced leak puts it (≤ 6.8 or ≤ 5.0) for 100+ minutes.
The death, when it comes, is one step at the end, not a rising course.

---

## 2. The literature course

Read for this investigation: the full texts of Rosenberg 2015 (Orphanet J Rare Dis 10:93, PMC4524368), Gupta & Hopkins
2017 (BJA Educ 17:249), the EMHG guideline v2024 (Glahn et al., BJA 2025;134:221, web version), Schuster 2014 (BMC
Anesthesiol 14:14, PMC3973851, swine), and the case reports Chi 2022 (Clin Case Rep 10:e6426, PMC9552991; I re-read
its case 1 table and text myself), Lan 2023 (Open Med 18:20230808), Huh 2017 (Korean J Anesthesiol 70:345), Minami
2023 (J Med Case Rep 17:140) and Jarraya 2021 (PAMJ Clin Med 7:12). Abstracts only: Larach 2010 (Anesth Analg
110:498), Larach 2008 (Anesthesiology 108:603), Larach 2014 (Anesth Analg 119:1359), Visoiu 2014, Riazi 2014, Nelson
& Litman 2014, Gronert & Theye 1976 (Anesthesiology 44:36), Iaizzo 1996, Nelson 2001 (**Biosci Rep** 21:169, not
Biochem Soc Trans).

**Unreached:**
- Full texts: Larach 2010 (the sign timings and the K⁺ distribution), Larach 2008 (the eight arrests and their
  rhythms), Gronert & Theye 1976.
- Larach 1994 (the Clinical Grading Scale; its items are second-hand, via Rosenberg 2015 and Yang 2020).
- Hopkins 2011 BJA and Hopkins 2000 BJA (I read Gupta & Hopkins 2017 instead).
- Hopkins et al., Anaesthesia 2021 (the hospital PDF refused the connection).
- Glahn 2010 (repository URLs failed); the Gronert chapters (Miller, Myology).
- Lucke, Hall & Lister 1976 (BJA 48:297, untreated swine to the terminal state) and Nelson 1990.

Earlier project research (`research/29-mh-potassium-and-early-efforts.md`, 2026-10-11, not re-read here) adds Hall et
al. 1976 (terminally, aerobic metabolism accounts for about half the heat) and Gronert et al. 1986 (in susceptible swine
VO₂ rose 6.5 → 11.6 mL/kg/min "when potassium exceeded 6").

| Milestone | Literature | Source |
|---|---|---|
| Trigger → first sign | 0–168 min after induction; since 1998 usually in the second or third hour; shorter with succinylcholine and with halothane | Larach 2010 via Yang 2020; Visoiu 2014 [abstract] |
| First sign (single) | hypercarbia 38 %, sinus tachycardia 31 %, masseter spasm 21 % | Larach 2010 via Yang 2020 |
| Order | metabolic (EtCO₂, VO₂, mixed acidosis) → cardiovascular (HR, ventricular ectopy/bigeminy) → muscle (rigidity); late: hyperkalaemia, rapid core rise, CK/myoglobin, severe arrhythmia and arrest | EMHG v2024 Box 1; Gupta & Hopkins 2017 |
| Temperature | always after the metabolic signs; among the first three signs in 63.5 %; median peak 39.1 °C (286 episodes); fulminant cases 41.6–44.2 °C; 38.5 °C 10–15 min after the first sign and 40 °C 10–40 min later in the two best-timed cases; measured 0.1 °C/min (Minami), ≈ 0.16 °C/min (Lan, derived), ≈ 0.055 °C/min (Chi, derived); "1–2 °C every 5 min" quoted without a primary source | Gupta & Hopkins 2017; Larach 2010 [abstract]; Lan 2023; Chi 2022; Minami 2023; Rosenberg 2015 |
| K⁺ | K⁺ 6 ≈ 10 min and 7 ≈ 40 min after the first sign, arrest at 7.7 ≈ 55 min after it (Chi case 1: sevoflurane, no succinylcholine, no dantrolene before the arrest; bicarbonate, insulin–glucose and cooling were given); peaks 7.37 (Huh), 6.5 (Chi 2), 6.30 at 44.2 °C (Lan, no dantrolene), 4.9 at 42 °C (Minami); "K > 6" is only a CGS cut-point; no registry K⁺ distribution reached | Chi 2022 Table 1 (re-read); Huh 2017; Lan 2023; Minami 2023; Rosenberg 2015 Table 1 |
| Acid–base (fulminant) | pH 6.69–7.26, PaCO₂ to ≈ 135, EtCO₂ to 143–144, BE to −17.5, lactate 9.5–11.7 | Chi 2022; Lan 2023; Huh 2017; Minami 2023 |
| Arrest | 8 of 291 events (2.7 %), 4 deaths (1.4 %), 1987–2006; 7 of 84 (8.3 %) arrests, none resuscitated, 8 deaths, 2007–2012. Arrest/death associated with a LONGER induction → peak EtCO₂ interval, 216 vs 87 min | Larach 2008, 2014 [abstracts] |
| Arrest rhythm | no registry breakdown found; signs VT 3.5 %, VF 2.4 %; cases: brady 20/min → arrest, shocked to sinus (Chi 1, at K⁺ 7.7, pH 6.92, EtCO₂ 144 earlier); asystole → VF (Huh, K⁺ 7.37, 41.7 °C, lactate 11.7); brady → asystole at normal EtCO₂ (Jarraya) | Larach 2010 via Yang 2020; cases |
| Mechanism named | hypercarbia + sympathetic stimulation + hyperkalaemia + acidosis "highly arrhythmogenic"; once Ca²⁺ re-sequestration capacity is exceeded, myofilament activation, heat and rigidity, then sarcolemmal breakdown releasing K⁺, CK, myoglobin | Gupta & Hopkins 2017 |
| Untreated animal | MHS swine, halothane + succinylcholine, no dantrolene: 11 of 12 died ≈ 15–30 min after the first trigger, median rectal 38.0 °C and pH 6.90, lactate 15.7 at 30 min (K⁺ not measured); untreated swine: lactate first, then mixed acidosis, "marked hyperkalaemia", catecholamines, temperature, progressive circulatory failure; whole-body VO₂ × 2, muscle × 3 | Schuster 2014 Tables 1–2; Gronert & Theye 1976 [abstract] |
| Severity | 41.5 % of 477 registry cases fulminant; metabolic acidosis in only 26 %; VO₂ "5-fold" in anaesthetised MH | Visoiu 2014; Larach 2010; Nelson 2001 [abstracts] |

**The timeline to aim at.** This is for a fulminant crisis, succinylcholine-triggered as on the card, untreated, and
assembled from the rows above.
- The EtCO₂ and HR rise within minutes.
- pH below 7.0 within about 10–20 min.
- K⁺ rises continuously: 6 at about 10–20 min after the first sign, 7 at about 40.
- The core rises after the metabolic signs, reaching 38.5 within 10–15 min of the first sign in the fast cases.
- The arrest comes at K⁺ 7–8 with pH below 6.9–7.0. In swine it comes within 15–30 min of the trigger; in the one timed
  human case, about 55 min after the first sign.
- The rhythm is bradycardic or VF/asystole.

For the majority, the reaction is caught while it is still respiratory and is treated, so no arrest timeline applies.
The literature does not support death at 38.8 °C with a K⁺ that was normal for 110 minutes, as #154 typical does. Nor
does it support a step of 5 mmol/L in 5 minutes. Nor does it require death by heat: in the pig the acid–base and
circulatory collapse come first (Schuster 2014).

---

## 3. The couplings that are missing

| # | Coupling (physiology) | Source | main | #209 | #154 | #154 rulings it depends on |
|---|---|---|---|---|---|---|
| C1 | **K⁺ from working muscle** as a leak of active fibres, not a fitted set point | Medbø & Sejersted 1990 (as #154 cites; the slope's ÷12 divisor is #154's assumption); Gronert & Theye 1976 | partial: fitted `MH_K_EFFLUX` 2.35 [ENG] | as main | present (`K_ACT_PER_VO2X`, derived upper bound) | 2 (the 20-min K row) |
| C2 | **Injury driven by the calcium leak itself**: once re-sequestration capacity is exceeded, the fibre's ATP debt and Ca²⁺ overload break the sarcolemma while the O₂ supply is still adequate, so K⁺, CK and myoglobin rise during the crisis, not after a 113-min dose | Gupta & Hopkins 2017; Rosenberg 2015 (falling ATP → membrane failure → K⁺, CK); Gronert & Theye 1976 (lactate first, non-hypoxic) | absent | absent | **partial**: the dose counts only the O₂-deficit ATP the braked glycolysis cannot pay, plus CEM43 (inert below 41 °C); the review's "calcium-driven glycogenolysis/proteolysis lever" | 1, 2, 8 (the pHi brake decides the unpaid ATP) |
| C3 | **K⁺ reaches the plasma at the rate muscle blood flow and the ECF allow**, with renal and cellular uptake, not as an instantaneous mass transfer; no transfer from unperfused muscle after an arrest | — (unreached: rhabdomyolysis K⁺ kinetics; Chi 2022's 3.8 → 6.4 → 7.2 → 7.7 over 55 min is the only timed human series) | n/a | n/a | **absent** (+5 mmol/L in 5 min, K⁺ 40–140 after the arrest) | 2 |
| C4 | **Heat–rigidity chain**: myofilament activation adds heat and rigidity once Ca²⁺ sequestration is exceeded; the terminal heat is about half non-oxidative | Gupta & Hopkins 2017; Hall 1976 (research/29) | partial: E131 oxidative heat only | partial: + skin vasoconstriction (Sessler 2008; Gagge 1986 VERIFY) | partial: + anaerobic heat 14–16 % (vs Hall's half) | 1 |
| C5 | **Acidosis, catecholamines and heat lower the threshold for VF/asystole from K⁺**: one membrane substrate, not separate hazards with fixed thresholds | Gupta & Hopkins 2017 (the combination is arrhythmogenic); arrests at K⁺ 7.37 and 7.7 with pH 6.7–7.0 (Huh, Chi). A quantitative VF-threshold-vs-pH or K⁺-vs-pH source was **not reached**: it must be read before anything is sized | **absent**: `K_HAZARD` 8.5 [ENG] ignores pH, temperature and catecholamines; pH → ectopy only ("never a second route to VF"); `T_HOT` 42 [ENG] | as main | as main | 1 |
| C6 | **The rhythm engine's K⁺ → rhythm chain**: peaked T, P loss, QRS widening, sine wave, bradycardia, then VF/asystole | the morphology thresholds are research 03 §1.6 (5.5 / 6.5 / 7 / 7.8–8.5) | present (morphology; sinus depression above 7, `G_SA_K` [ENG]; contractility above 8; hazard above 8.5, VF:asystole 1:1) | as main | as main; reached only in the last 5 min | — |
| C7 | **Hyperthermia's own effect on rate, conduction and myocardial O₂ demand** | the tables' "HR +8–10/°C" [TXT]; conduction/QT in heat stroke (Akhtar 1993, as cited in `ectopy.ts`, not re-read); a temperature term on MVO₂: unreached | partial: rate only (`tempHrF`); no temperature term in the coronary demand; no conduction effect | partial: the rate effect is what drives its RV low-flow arrest at 40.7 °C | as main | 7 (E117 HR) |
| C8 | **Potassium feeding hypermetabolism**: K⁺ > 6 raised VO₂ in susceptible swine | Gronert et al. 1986 (research/29, abstract) | absent | absent | absent | 1 |
| C9 | **Severity as a card input** (phenotype; trigger-dependent onset) | Nelson 2001 (× 5); Visoiu 2014 (succinylcholine and agent shorten the onset) | absent (severity 0–1 scales activity; `MH_ONSET_S` 900 [ENG] ramp whatever the trigger) | absent | present (`typical` × 2.5 / `fulminant` × 5); onset ramp unchanged | 1 |
| C10 | **Acidaemic circulatory failure**: progressive failure as pH falls past 7.0 | Gronert & Theye 1976; #162's CO₂ vasodilation/depression (Walley 1990, Cullen & Eger 1974) | partial: contractility × (1 − 1.5·(7.2 − pH)), floor 0.3; the surge holds MAP at pH 6.86 | partial: the same, and it does fail at +120 | partial | 3, 4 (the same CO₂-load question, via #162) |

The decisive gap is **C2 together with C3**. Without an injury driven by the crisis itself, the only K⁺ that can kill
is a fitted term (main) or a late dose step (#154). **C5 decides where along the rising K⁺ the arrest falls**: with
`K_HAZARD` 8.5 independent of pH, an arrest at the literature's 7.4–7.7 cannot emerge.

---

## 4. The plan

The order matters: each step is measured on the tree of the step before it. Every step carries its own unit test plus
the four guards below. **No constant is fitted to a time of death.** The literature timeline in §2 is the CHECK, not
the target. If the coupled model misses it, the miss is recorded with both numbers and goes to the owner.

**Guards for every step** (run on that step's tree against the previous step's):
- **G1** `malignant-hyperthermia.slow.test.ts` row 'S1 demo path (owner rc.4)': every time within ±2 s of the previous
  tree (the run sheet's 2-s rule: the presenter-visible clocks of §3 of the run sheet); every value inside its band.
- **G2** `haemorrhage-anaphylaxis.slow.test.ts`, `healthy-induction.slow.test.ts`, `stab-wound-tamponade.slow.test.ts`:
  every printed number identical (`PME_SHOWCASE_PRINT=1`).
- **G3** The untreated probe (this file's) on seeds 7 and 8: the firsts table re-measured.
- **G4** `known-misses` count: each change named.

| Step | What | Already in | Test | Sources | What else it moves |
|---|---|---|---|---|---|
| 0 | **Owner rulings** (below). Nothing is built before rulings R1–R3 | — | — | — | — |
| 1 | **Land #209** (the MH sympathetic surge constricts the skin) | #209 | its `mh-vasoconstriction.test.ts`; the re-centred S1 bands | Sessler 2008; Gagge 1986 (VERIFY the original) | Tcore +1.4 °C at +51 min; untreated now arrests at +124 (RV low flow, §1.4). **G1: its kit round moved the second "recovering" by +18 s (23:31 → 23:49)**: over the 2-s rule, so the owner must accept or reject it as part of R1 |
| 2 | **Rebase #154 onto main + #209** and do the review's four "before merge" items: re-derive `K_ANAER` with the pH brake in place; settle the haemorrhage card on its real mechanism (the cerebral CO₂ × pressure-limb product); re-measure every conflicting band; bookkeeping (Trivedi & Danforth page range, the CEM43 comment, the Medbø ÷12 assumption declared) | #154 | its 10 `muscle.test.ts` tests; every band it re-centred, re-measured on the merged tree | as in #154 and `scratch/reviews/review-154.md` | the 16 recorded misses of review §1; the haemorrhage demo card (review §4); the 12 conflicts listed above |
| 3 | **C2: calcium-driven muscle ATP debt.** The MH fibre's ATP demand (Ca²⁺ cycling: the MH activity's VO₂ excess at its ATP/O₂ yield) against what oxidation plus the braked glycolysis can supply in that fibre. The shortfall accrues to the SAME injury dose `muscle.ts` already has (one tolerance, no second clock). A well-perfused normal muscle accrues nothing, so every other scenario is untouched | partial in #154 (`doseMin`, tolerance, release) | new `muscle.test.ts` arms: (a) MH activity 1 at full O₂ delivery accrues dose; activity 0 at full delivery accrues none (bit-identical); (b) dantrolene's suppression stops the accrual; (c) the dose rate is monotone in the VO₂ multiple; (d) the S1 demo path accrues < 1 % of the tolerance before dantrolene (G1) | Gupta & Hopkins 2017; Rosenberg 2015; Gronert & Theye 1976 (muscle VO₂ × 3, lactate first, non-hypoxic). **To read before sizing:** a measured muscle ATP/PCr fall in triggered MHS muscle (³¹P-MRS swine or human biopsies), and the Lucke/Hall 1976 swine full texts. If none is reached, the step stops at the shape and asks | untreated K⁺: from flat → rising during the crisis; the typical phenotype's arrest earlier than +103; CK and myoglobin state rise with it; shivering (review §3: the activity leak includes it) must be checked |
| 4 | **C3: perfusion-limited K⁺ release.** The necrotic fibre's K⁺ goes to a muscle interstitial pool, which reaches the plasma at the muscle blood flow (the circulation's skeletal-muscle share). The renal excretion and cellular uptake that already exist act on the plasma side. No transfer without flow | absent | (a) a step injury of 10 % at normal flow raises plasma K⁺ over minutes, not one step; (b) at zero flow (arrest) plasma K⁺ does not rise from muscle; (c) mass conservation: total body K⁺ unchanged | Medbø & Sejersted 1990 for the femoral venous–arterial gradient (as #154 cites); the muscle flow share from the circulation model's own beds; rhabdomyolysis K⁺ kinetics **to be read** | removes the K⁺ 40–140 after the arrest (review §5, "post-arrest K absurd"); the crush/ischaemia paths of `muscle.ts` move too: check `blood-massive-transfusion` and the VF-30-min rows |
| 5 | **C5: one membrane substrate for the K⁺ arrest.** The hazard reads the membrane-effective K⁺ with pH, temperature and catecholamines acting on the SAME threshold (as calcium already does through `kEcg`), instead of a fixed `K_HAZARD` 8.5. Ectopy's own pH/T/catecholamine terms (`ectopy.ts`) share the substrate, so its prodrome and the arrest stay one model | absent | (a) at pH 7.40, 37 °C, no surge: unchanged (the S11 `blood-k-rhythm` rows bit-identical); (b) at pH 6.9 the hazard starts at a lower K⁺ by the sourced amount; (c) calcium still delays it | **Required before building**: a quantitative source for the K⁺ arrest threshold under acidaemia/hyperthermia (not reached in this pass). Without one, this step is NOT built: record the miss (arrest at 7.4–7.7 in the cases vs ≥ 8.5 in the engine) for the owner | every arrest that passes through high K⁺: S11, the sux-hyperkalaemia rows, massive transfusion, VF/ROSC outcome (`defib-pacer/outcome.ts` reads `kEcg`), and G2 must be re-checked |
| 6 | **C7: temperature in the myocardial O₂ demand** (and, if sourced, conduction) | rate only on main | coronary unit test: demand rises with Tc at a fixed HR and pressure; G2 identical (normothermic cards) | a sourced MVO₂–temperature relation **to be read**; tables §5c for the rate | #209's RV low-flow arrest moves earlier; fever cards |
| 7 | **C9: the card's phenotype** per R1, plus the trigger-dependent onset if R4 asks for it | #154 (phenotype) | the card validates; the untreated probe on the named phenotype; G1 | Nelson 2001; Visoiu 2014 | the card's story text (#167's string) and run sheet; the Debrief |
| 8 | **C8: K⁺ feeds hypermetabolism** | absent | MHS activity rises with K⁺ above 6 at a fixed trigger | Gronert 1986, **full text to read** (only research/29's abstract) | optional; only if step 3 leaves the course too slow |
| 9 | **Re-measure and record**: the untreated arm's `it.fails` (`malignant-hyperthermia.slow.test.ts` "untreated: … VF", the 'S1 untreated' band set), `clinical-suite.test.ts` S16 ("arrest before 60 min, core ≤ 44 °C"), `drug-layer-guards`/`endo-acceptance`/`endo-seams` K⁺ rows, `known-misses.md`, the model docs (Stage 14 guard), the card's story text | — | the untreated firsts against §2's timeline, recorded hit or miss with both numbers | §2 | the Explore rows at 24:00 (#209 already moves `blood:Tcore`) |

**What must not change, by construction:**
- With MH activity 0, steps 3, 4 and 8 are inert (bit-identical).
- Step 5 is inert at pH 7.40, 37 °C and no surge.
- Step 6 is inert at 37 °C.
- The treated demo path suppresses the MH within about 4 min of the early signs, so steps 3–4 can only move it through
  the dose accrued in those minutes, and G1 measures exactly that.
- The haemorrhage and anaphylaxis cards never have MH activity. They reach step 5 only through their pH: G2 measures
  that.

**What I expect but have not measured:**
- Step 3 alone should give a K⁺ that rises from the established crisis onward, instead of a step at +100–113.
- Step 5 should put the arrest where K⁺ crosses about 7–8 at a pH below 7.0.

Neither number is predicted here, because neither has a sourced size yet.

---

## 5. What the owner has to rule first

**R1. The untreated arm: which course to show, and how fast.** #154 ruling 1: typical × 2.5 with death after
100 minutes, or fulminant × 5 within a teaching half-hour? The literature's untreated deaths are the fulminant ones:
swine 15–30 min, the one timed human case about 55 min after the first sign. The majority of crises are caught while
still respiratory and never arrest. Two further questions belong here:
- whether the card's untreated arm is meant to arrest at all;
- whether #209's +18 s on the second "recovering" of the treated path is acceptable.

**R2. The 20-minute K⁺ row** (#154 ruling 2: "K 5.5–6.5 by 20 min", tables §7 check 21). The cases give K⁺ 6 at about
10–20 min after the first sign in a fulminant crisis, but 4.9–6.3 in others. Choose:
- keep it for the fulminant phenotype only;
- re-specify it as "rising continuously after the established crisis";
- or drop it to a diagnostic cut-point (the CGS's "> 6").

**R3. Fund the calcium-driven injury (step 3), knowing it needs a source not yet in hand.** It is the lever that makes
K⁺ rise during the crisis, and it is also the review's lever for the heat gap. If no measured MH muscle ATP/PCr series
can be found, R3 decides whether step 3 waits or goes in as a declared shape with its uncertainty.

**R4. The arrest's K⁺ threshold under acidosis (step 5).** The engine's 8.5 is [ENG]; the human MH arrests in hand
came at 7.37 and 7.7 with pH 6.7–7.0. Choose:
- fund the source search and build it;
- or keep 8.5 and record the miss.

Also decide whether the onset rhythm should stay VF:asystole 1:1, or follow the cases' bradycardia → arrest (Chi,
Jarraya).

**R5 (consequential, from #154).**
- Ruling 8 (bicarbonate releases the pHi brake one for one) bears on step 3's unpaid ATP.
- Ruling 7 (E117 HR) bears on step 6.
- Rulings 3–6 (massive PE PaCO₂, the CPR EtCO₂ and CBF numbers, the tension pneumothorax time, the massive-transfusion
  death) block step 2, not the MH couplings themselves.

---

## 6. Reproduction

```
# in any of the four worktrees
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/mh-arrest/zz-mh-arrest-probe.test.ts apps/demo/src/app/showcase/
cd apps/demo && PROBE_SEEDS=7 PROBE_UNTIL=8100 npx -y pnpm@9.15.9 exec vitest run src/app/showcase/zz-mh-arrest-probe.test.ts < /dev/null
# PROBE_PHENOTYPE=fulminant with zz-mh-arrest-probe-pheno.test.ts (#154 trees only)
```
About 10 min per seed per tree (8 in parallel took about 25 min).
