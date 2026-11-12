# Plan: a shock succeeds or fails for the reason a real one does

*Briefs 192 and 205, 12 November 2026. A plan only; no code. Finding N141 and the research note's F1 to F3
(`docs/research/defib-zoll-m2-pads-impedance.md` §6.5) are its starting point.*

The engine decides every defibrillation and cardioversion shock with an independent random draw at that energy's
success rate. Real patients differ. A patient who fails one shock is likely to fail the next, and after ventricular
fibrillation (VF) is terminated it usually comes back within a minute. The sources support two mechanisms, and the
plan builds both:

- **A. The patient's shock resistance.** Each patient has a threshold that the shock's dose must exceed. It is drawn
  once per patient. Around it sits a probability curve, not a hard step, because repeated shocks at the same energy
  still rescue some patients who failed.
- **B. Refibrillation.** After a VF shock succeeds, VF comes back with a measured probability and a measured timing.
  This mechanism is separate from a high threshold. It explains most of the VF seen at a 2-minute rhythm check.

Every number below names its source. A number no source gives is a **GAP** (named, not filled) or a **PLACEHOLDER**
put to the owner in §6. Nothing is fitted to the per-shock figures used as checks.

Reading: done by one executor in this conversation, one source at a time. Notes, with what each source says and
where: `scratch/205-reading-notes.md` (project scratch; to be copied into `docs/research/` if the owner wants them
kept). All DOIs below were resolved on Crossref on 12 November 2026.

---

## 1. The facts: what the engine does, against what was measured

### 1.1 What the engine does today (`packages/engine-core/src/l3/defib-pacer/outcome.ts`, whole file read)

- **VF and pulseless VT** (`shockClass` → `'vf'`; this class includes `vtPoly` and `torsades`). Every shock:
  - `unchanged` (VF persists) 0.10, asystole/PEA 0.80, ROSC 0.10 (`VF_TABLE`);
  - the ROSC share is scaled by VF duration (× 0.5 at 4–10 min, × 0.2 beyond, `VF_DURATION_FACTORS`) and by the state
    factors (`shockStateFactor`: antiarrhythmic occupancy, K⁺, pH, CoPP in the circulatory phase, arrest time; sizes
    `[FIT]`, directions sourced);
  - **termination itself** changes only with energy below 50 % of default (× 0.5, `[FIT]`) and temperature below
    30 °C (`[FIT]` size).
- **After a terminating shock** (`l3/device-layer.ts` `deliverShock`, lines 223–269): asystole first, then for
  `pea`/`rosc` a pending sinus rhythm after the isoelectric pause. **Nothing in `engine-core/src` brings VF back
  after a successful shock.** A search for refibrillation or recurrence found nothing. So VF at a rhythm check can only
  be a persisting 10 %.
- **Synchronised cardioversion**: `p = pMax / (1 + (E50/E)²)` per shock.
  - AF and pre-excited AF: pMax 0.94, E50 43.3 J (Mittal 2000: 68 % at 70 J, 94 % cumulative).
  - Flutter, AVNRT, AVRT: pMax 0.97, E50 12 J.
  - VT with a pulse: pMax 0.97, E50 20 J.
  - Hill exponent 2, `[FIT]`.
- **The draw**: one uniform per shock from the `outcome` stream (`drawOutcome`).

### 1.2 The table

"Per-shock" means success among patients still in the rhythm when that shock is given. "Independent" is what the
engine's draw produces.

| Rhythm, protocol | Source (how read) | Measured: first / per-shock / cumulative | Engine today (independent draw) |
|---|---|---|---|
| AF, RLB 70→120→150→170 J, elective | Mittal 2000, Circulation 101:1282, DOI 10.1161/01.cir.101.11.1282 (full, research note §6) | 68 % / 68, 54, 38, 38 % / 94 % | 68 % / 68, 83, 87, 88 % / 99.9 % |
| AF, BTE 360-360-360 J | Schmidt 2020, Eur Heart J 41:626, DOI 10.1093/eurheartj/ehz585 (abstract) | 75 % / 75 % then 17/32 = 53 % over shocks 2–3 / 88 % | (BTE not modelled) independent at 75 % would give 98.4 % |
| AF, BTE 125-150-200 J | Schmidt 2020 (abstract) | 34 % / — / 66 % | — |
| AF, BTE 100/150/200/200 J | Page 2002, JACC, DOI 10.1016/s0735-1097(02)01898-3 (abstract, hand-over 192) | — / repeat 200 J converts about 1 in 10 of those left / 60, 77, 90, 91 % | — |
| Flutter, biphasic, by energy | AHA 2025 Part 9 (Wigginton et al., DOI 10.1161/cir.0000000000001376), atrial flutter section | 50–75 % at 50 J, 85–90 % at 100 J, ≈ 100 % at 200 J | 92 % at 50 J, 96 % at 100 J (curve E50 12 J): **too high at 50 J** |
| VF, BTE 200→200→360 J, **stacked** (ERC 2000), OHCA | Koster 2008, Resuscitation 78:252, DOI 10.1016/j.resuscitation.2008.03.231 (abstract) | 92 % / 92, 61, 83 % (second shock: about 23/37) / 465 of 467 within three | 90 % / 90, 90, 90 % / 99.9 % |
| VF, BTE 200 J then 200 or 300 J, OHCA AEDs | Walker 2009, Resuscitation 80:773, DOI 10.1016/j.resuscitation.2009.04.002 (abstract) | first ≈ 93 % (61 of 863 failed) / later shocks 69 % (162/234) if the first failed, 93 % (955/1027) if it succeeded / 5 % of patients gave 71 % of failed shocks | 90 % at every shock whatever came before |
| VF, standard shocks with 2-min CPR, ≥ 4 shocks (OHCA, selected) | Verkaik 2025, Eur Heart J 46:582, DOI 10.1093/eurheartj/ehae767 (full text) | 77 % of the first three shocks terminated; per patient 0/1/2/3 terminations in 3 shocks = 5 / 14 / 26 / 55 % | at 0.77 independent: 1.2 / 12 / 41 / 46 % |
| VF, first shock by delay from call (OHCA, witnessed) | Stieglis 2025, Circulation, DOI 10.1161/circulationaha.124.069834 (full results) | 95 % (< 1 min) → 75 % (> 16 min); RR of failure 1.06 per min; 87 % overall | 90 % at every duration (duration acts on ROSC only) |
| VF, RLB, initial vs recurrent | Hess 2011, Resuscitation 82:685, DOI 10.1016/j.resuscitation.2011.02.008 (abstract) | 87.8 % initial; 84.3 % for recurrences (NS) | — (no recurrence) |
| VF, BTE 150 J fixed, initial vs recurrent | Hess 2008, Resuscitation 79:28, DOI 10.1016/j.resuscitation.2008.04.028 (abstract) | 92.1 % initial; 89.7 % recurrences (NS) | — |
| VF, monitored, after cardiac surgery (pooled 15 studies, mixed waveforms) | AHA 2025 Part 10 p S591 (Cao et al., DOI 10.1161/cir.0000000000001380), citing Richardson 2007, DOI 10.1510/icvts.2007.163899 | 78 / 35 / 14 % at shocks 1–3 | 90, 90, 90 % |
| VF at the 2-min check | AHA 2025 Part 9 (persisting VF); Cheskes 2024, DOI 10.1016/j.resuscitation.2024.110186 | ≈ 80 % of VF seen at checks is recurrence after termination; of patients in VF after 3 shocks, 17 % never terminated, 83 % recurred | 100 % is persistence (no recurrence exists) |
| Refractory after 3 shocks | ERC 2025 ALS p22 (Soar et al., DOI 10.1016/j.resuscitation.2025.110769); Verkaik 2025; Alhenaki 2026, DOI 10.1016/j.resplu.2026.101302 | ≈ 20 % (older), ≈ 5 % recent; true-refractory 28.9 / 5.0 / 1.0 % after shocks 1 / 3 / 5 | 0.1 % after 3 shocks (0.1³) |

### 1.3 What the table shows

- **Cardioversion.** Patients who fail are harder to convert. Mittal's conditional rates fall although the energy
  rises. Schmidt's falls at a fixed 360 J. The engine overstates Mittal's own escalation by 5.6 points and the
  later-shock rates by 30–50 points (F2).
- **VF, same defect.** At the SAME 200 J and in the same episode, Koster's second shock succeeded in 61 % against 92 %
  for the first. Walker's later shocks succeeded in 69 % against 93 %, with impedance unchanged between shocks
  (−1 % [0, 4]). Verkaik's per-patient counts are over-dispersed at both ends. The engine's independent 90 % cannot
  produce any of this.
- **VF, a defect the engine does not have the parts for.** VF comes back after most successful shocks:
  - 48 % within 2 min and 74 % at some time (Koster 2008);
  - 79 % of patients at least once, median 2 recurrences, IQR 1–4 (van Alem 2003, DOI 10.1016/s0300-9572(03)00208-9);
  - after 74–81 % of terminating shocks (Spies 2020, DOI 10.1016/j.resuscitation.2020.09.029; Conover 2014,
    DOI 10.1161/circep.114.001506).

  Most "shock-refractory" VF is refibrillation (AHA Part 9; ERC p22). The engine shows none of it.
- **Time in VF lowers termination itself**, not only ROSC (Stieglis 2025). The engine moves only the ROSC share.

---

## 2. The mechanism: what the sources support, and what they do not

### 2.1 Supported

1. **A between-patient property sets shock success** (VF: Walker 2009, Koster 2008, Verkaik 2025; AF: Mittal 2000,
   Schmidt 2020, Page 2002). Walker 2009 says it directly: "Distribution of failed shocks is far from random. First
   shock defibrillation failure is often predictive of low efficacy for subsequent shocks."
2. **Some randomness remains per shock near a patient's threshold.** Repeats at the same energy rescue part of the
   failures: Koster's 61 % at the second 200 J; Schmidt's 53 % over two further 360 J shocks; Walker's 69 %. Villani
   2004 (Europace, DOI 10.1016/j.eupc.2004.03.006, abstract via hand-over 192) measured the within-patient
   coefficient of variation of the INTERNAL atrial threshold: 9.6 % in paroxysmal AF, 44.3 % in persistent AF.
   So the model is a probability curve around each patient's threshold, not a step.
3. **The quantity that defibrillates is current**, not selected energy. ERC 2025 ALS p22 says "it is the
   transmyocardial current that achieves defibrillation" (Kerber 1988, Circulation, DOI 10.1161/01.cir.77.5.1038).
   Walker 2009: impedance barely changes between shocks, so a later shock carries more current only if the energy is
   raised (+27 % current from 200 to 300 J). Raising the energy helps the patients who failed: Koster's 360 J third
   shock gave 83 %; BIPHASIC (Stiell 2007, DOI 10.1161/circulationaha.106.648204) found a higher conversion with
   escalation among patients who needed several shocks, and the same first-shock success.
4. **A failed shock does not make the patient harder; it reveals him.** In Walker's first-success patients, later
   shocks stay at 93 %, the first-shock rate. Termination of recurrent VF equals initial termination (Hess 2008:
   89.7 vs 92.1 %; Hess 2011, RLB: 84.3 vs 87.8 %, both NS). Impedance does not fall between shocks (Walker 2009).
   The one hint the other way: Koster's patients with ≥ 5 episodes went from 90 % to 80 % between episodes 1 and 5.
   That subgroup was selected for ≥ 5 episodes, so the plan does NOT build an across-episode decline. It is checked
   as a prediction (§3.5).
5. **Refibrillation is a distinct event.**
   - Its timing is measured: median 27 s (IQR 14–60), 75 % by 60 s, 87 % by 90 s (Verkaik 2025, 773 timed recurrences).
     Spies 2020: median 27 s (IQR 13.5–80.5), binned as 51.4 % in 5–30 s, 13.5 % in 31–60 s, 21.6 % in 61–120 s,
     13.5 % in 121–240 s. van Alem 2003: median 45 s (IQR 23–115).
   - It does not depend on when compressions resume (Conover 2014: HR 1.05, 1.75, 0.67, all NS), nor on the cardiac
     disorder, time to defibrillation, waveform, or patient and process characteristics (van Alem 2003).
6. **Time in VF raises the threshold.** Stieglis 2025 measured first-shock termination of 95 % at < 1 min and 75 %
   at > 16 min, with a relative risk of failure of 1.06 per minute. The organised share after the shock fell from 49 %
   to 23 %, while the asystole share stayed level. The guidelines name the mechanism: myocardial energy depletion
   (AHA Part 7 p S470, Kern 1990). A period of CPR restores defibrillation success in prolonged VF (AHA Part 7; Part 9
   synopsis). Thirty seconds of CPR before the first analysis did as well as three minutes (AHA Part 7, refs 21–23).
7. **Drugs.**
   - AF: antiarrhythmic pre-treatment lowers the cardioversion threshold or suppresses immediate recurrence
     (Brandes 2020, Europace, DOI 10.1093/europace/euaa057, Table 2: amiodarone, ibutilide, sotalol, flecainide,
     propafenone, quinidine; procainamide uncertain). Oral 1999 (hand-over 192): ibutilide converted 14/14 earlier
     failures.
   - VF: the guidelines' opinion is that recurrent VF "may be better remedied by post-shock rhythm stabilization
     therapy" (AHA Part 9); van Alem 2003 and Verkaik 2025 say the same.
8. **Hypothermia.** VF is often shock-refractory below 30 °C (ERC 2025 special circumstances; AHA Part 10 p S613).
   This is a threshold shift, as the engine's `temperatureTermination` already treats it.

### 2.2 Not supported (no source read gives it)

- **The shape of the between-patient distribution.** No source gives a measured histogram of transthoracic thresholds.
  Niebauer 2005 (DOI 10.1007/s10840-005-0277-2) has one for RLB AF (mean 70.6 J, median 50 J), but its full text was
  not read. A step-up "threshold" is also the first successful step of an escalation, so its median can simply be the
  protocol's floor. The plan therefore declares **lognormal between patients, probit (normal on log dose) within a
  patient** as an ASSUMPTION. A failed prediction is a finding to report, not a reason to add a parameter.
- **Any link between a patient's atrial and ventricular thresholds.** Each rhythm family gets its own latent value,
  drawn independently.
- **Heterogeneity for flutter, AVNRT/AVRT and VT with a pulse.** No source read gives repeated-shock data for these
  (GAP, Q4).
- **The size of a drug's effect on VF recurrence or termination.** The Europace 2025 meta-analysis (Schnaubelt et al.,
  DOI 10.1093/europace/euaf289) and ALPS (Kudenchuk 2016, DOI 10.1056/nejmoa1514204) report ROSC and survival only.
  The size is a GAP (Q5).
- **The size of CPR's restoring effect on the threshold in humans.** The guidelines give the direction only. Eftestøl
  2004 (DOI 10.1161/01.cir.0000133323.15565.75) measured it through VF-waveform predictors, not a termination rate.
  GAP (Q8).
- **Potassium and pH effects on shock success.** No library source gives one (hand-over 192). These stay where they
  are, on the ROSC share, sized `[FIT]`.
- **How often immediate recurrence of AF (IRAF) happens.** Brandes 2020 describes it (within the first minute) but
  gives no number in the passage read. Mittal's end point (sinus ≥ 30 s) already counts an IRAF inside 30 s as a
  failure (GAP, Q7).
- **Recurrence in monitored, in-hospital or anaesthetised patients.** Every refibrillation figure is from OHCA (GAP;
  §3.6).
- **Pre-excited AF cardioversion.** No source (F3; Q6).

---

## 3. The design

### 3.1 Patient-level state: `shockResistance`

- **What it is.** One latent standard-normal value `z_f` per rhythm family `f ∈ {vf, af, flutterSvt, vtPulse}`.
  `torsades` and `vtPoly` are in the VF class and use `z_vf` (Q9).
- **How it is drawn.** Once per patient, from a NEW named stream `shockResistance`, added to
  `STREAM_NAMES` in `rng/sfc32.ts`. Each stream is seeded from hash(seed, name), so a new name moves no other stream.
  Each family's value is drawn from its own seed-derived copy (hash(patientSeed, family)), as
  `l2/ecg/morphology/individuality.ts` does for the ECG fingerprint. A later family then never shifts an earlier one.
- **Where it lives.** It is carried in the pipeline state, so the snapshot holds it and a follower and a replay agree.
  On restore of an older snapshot without it, the value is drawn from the seed as at creation. That is deterministic,
  so old snapshots stay reproducible.
- **Where it is not used.** Never on the `outcome` stream. That stream is shared with the repeat-suxamethonium draw
  (`engine.ts:819`), the VF waveform seed (`l2/ecg/arrest/vf.ts:105`, four draws whenever a VF episode is built),
  `l2/hemo/pipeline.ts:461`, the drug-hook hazards (`l2/pk/hooks.ts:80, 114, 130`) and the post-shock timings in
  `deliverShock`.

### 3.2 A shock's success

For patient *i*, family *f*, dose *D*:

```
ln T_i  = μ_f + Σ shifts(state) + s_b,f · z_i,f                       (the patient's threshold)
P_i(D)  = Φ( (ln D − ln T_i) / s_w,f )                                 (the curve around it)
```

- One uniform from `outcome` per shock decides it (`u < P_i`). The count of `outcome` draws per shock stays one, as
  today.
- **The population first-shock marginal is closed-form:** `Φ((ln D − μ_f − Σ shifts) / √(s_b² + s_w²))`. So μ is solved
  analytically from each sourced first-shock number, and that number is reproduced EXACTLY, in expectation over
  patients, at its reference dose and reference state.
- **When no patient latent is passed** in `ShockContext` (device-only unit tests, old callers), the outcome is that
  population marginal. Device-level tests then keep their meaning.

### 3.3 The dose

- **Now: the SELECTED energy.** This is like-for-like with Mittal 2000 and Koster 2008, which report selected energy
  (research note §6.1; F1: the comment's "delivered" is wrong and is corrected in S1).
- **After E2b (impedance and delivered energy) and DQ7: the delivered peak current.** It is computed from the patient's
  impedance and Table A-2 [G A-16]. That is S4, and it re-solves μ at the cohort's impedance distribution, so the
  first-shock numbers stay exact.
- Until S4, impedance moves no rhythm's success. That matches DQ7's proposal A for VF.

### 3.4 What shifts the threshold, and what stays on the ROSC share

Each existing state factor gets one row: which stage it acts on.

| Factor | Today | In this plan | Source for direction / size |
|---|---|---|---|
| VF duration | ROSC share × 0.5 / × 0.2 | **Threshold**, by Stieglis's RR 1.06 per minute of failure (§3.5, Q3); the ROSC-share factor stays until Q1 is decided | Stieglis 2025 / measured |
| Temperature < 30 °C | termination × (1 − 0.3/°C) | threshold shift; the same size, still `[FIT]` | ERC, AHA / no size (GAP stays) |
| Antiarrhythmic occupancy | ROSC × (1 + 0.3 u) | AF: threshold (direction, Brandes Table 2). VF: unchanged unless the owner chooses recurrence (Q5) | Brandes 2020; AHA opinion / no size |
| CoPP (circulatory phase) | ROSC share | unchanged; a CPR-before-shock threshold term only if the owner wants a placeholder (Q8) | AHA Part 7 direction / no size |
| K⁺, pH | ROSC share | unchanged | no shock-success source |
| Arrest time (non-VF) | ROSC share | unchanged | — |
| Energy < 50 % of default | termination × 0.5 `[FIT]` | REMOVED: the dose term replaces it, sourced by the dose–response | Schmidt, Koster, Mittal |
| Impedance | none | S4 only, by DQ7 | research note §9 |

**No double counting.** Cohort heterogeneity already contains the cohort's spread of VF duration (and of impedance).
Two rules follow:

- `s_b` is the residual after any explicit covariate. When Stieglis's time shift is added, its share of the variance
  is carved out of the cohort spread, not added on top.
- μ is anchored at the cohort's reference state (for VF, the delay at which the determining cohort was shocked: about
  6–9 min from the call). That state is written beside the constant.

### 3.5 What determines each parameter, and what is then predicted

Three numbers per family: μ, total spread σ = √(s_b² + s_w²), and the between-patient share ρ = s_b²/σ².
Calibration runs the **cohort's own protocol and inclusion rule** in a test harness of N simulated patients
(energies, stacking or 2-min CPR, entry criteria). It never uses a pooled per-shock rate as if it were per patient.

**AF (Mittal's RLB is the device's own trial).**

| Parameter | Determined by | n |
|---|---|---|
| μ_af | Mittal 2000: 68 % at the first 70 J (shock-naive) | 88 |
| σ_af | Schmidt 2020: two shock-naive first-shock points, 125 J 34 % and 360 J 75 % (BTE) | 147 / 129 |
| ρ_af | Schmidt 2020 fixed arm: 75 % → 88 % over three 360 J shocks | 129 |
| **Predictions** (acceptance tests) | Mittal per-shock 54 / 38 / 38 % and cumulative 94 %; Schmidt escalating cumulative 66 %; Page 2002 repeat-200 J ≈ 1 in 10 | |

A feasibility pre-computation (an estimate, not a result, and not a fit) used the lognormal–probit model. Schmidt's
two points give σ = 0.97 (ln J) and a BTE median threshold of 187 J. The fixed arm gives ρ = 0.74. With these
values the model predicts:

- Schmidt's escalating arm: 62 % (measured 66 %).
- Mittal's per-shock rates: 68 / 61 / 50 / 41 % (measured 68 / 54 / 38 / 38 %), and a cumulative 96.3 % (measured
  94 %).
- The independent draw, for comparison: 68 / 85 / 90 / 92 % and 99.96 %.

The spread is borrowed from a BTE trial for the RLB device. That transfer is an assumption put to the owner (Q2).
If the predictions miss, that is reported, not tuned.

**VF.**

| Parameter | Determined by | n |
|---|---|---|
| μ_vf | the first-shock termination at the reference state: the engine's 0.90 (biphasic, 85–98 %, outcome.ts) or Hess 2011 RLB 87.8 %; Q3 decides the anchor | 90 (Hess 2011) |
| ρ_vf | Koster 2008: the second, stacked 200 J shock (same episode, same energy, seconds later) 61 % after a first 200 J of 92 % | ≈ 37 (about 23/37; Wilson 95 % CI ≈ 46–76 %) |
| σ_vf | Koster 2008: the third stacked shock at 360 J, 83 % | ≈ 14 (Wilson CI ≈ 60–96 %) |
| **Predictions** (acceptance tests, S3, because they need refibrillation) | Walker 2009: 69 vs 93 % after first failure vs success, and 5 % of patients giving 71 % of failures; Verkaik's 5 / 14 / 26 / 55 % count distribution and 5 % refractory; Hess 2008/2011: recurrence termination ≈ initial; van Alem 2003: median 2 recurrences (IQR 1–4); Koster's 90 → 80 % across ≥ 5 episodes (a check on the "reveals, not changes" claim) | |

The VF calibration has three numbers for three parameters, so it predicts nothing by itself. The predictions come
from the other cohorts, run through their protocols.

The feasibility pre-computation (σ 0.68, ρ 0.64, BTE median threshold 77 J) gives P(next 200 J) of 61 % after a
failure and 95 % after a success. A naive equal-shocks estimate gives "worst 5 % hold 40 % of failures", against
Walker's 71 %. Walker's hard patients received more shocks, which raises his figure, so only the protocol simulation
can test that row. It is flagged as the likeliest prediction to fail.

The precision is low: Koster's second shock has about 37 patients. The plan reports the CI on every prediction band
and never narrows it.

**Flutter/SVT and VT with a pulse.** No repeated-shock source (GAP). There are two candidate first-shock sources:

- Flutter: AHA Part 9 gives 50–75 % at 50 J, 85–90 % at 100 J and ≈ 100 % at 200 J (Mortensen 2008, 2010 and
  others). That is a location and a slope, and it CORRECTS the engine's E50 of 12 J, which gives 92 % at 50 J.
- VT with a pulse: Kerber 1992 (hand-over 192): 69 % at 18 A and 82 % at 25 A, a current dose–response that is
  usable at S4.

The between/within split for both is Q4.

### 3.6 Refibrillation (mechanism B)

After a shock terminates VF (any non-VF outcome of the class `'vf'`):

1. **Will it recur, and when?** One draw from a new stream `refibrillation` decides it. The recurrence time comes
   from the measured distribution: Verkaik's cumulative curve (median 27 s, 75 % by 60 s, 87 % by 90 s). Spies's four
   bins and van Alem's median of 45 s are cross-checks. The three cohorts watched different windows (Verkaik and Spies
   one 2-min CPR cycle; van Alem the whole attempt), so their medians differ partly through right truncation. The plan
   uses Verkaik within a cycle and checks against the other two. Only measured points are used; nothing is fitted.
2. **The probability per terminated episode** is set so that the share of patients who refibrillate within 2 min of
   the first termination is Koster's 48 %. Predictions: Spies 81 % and Conover 74 % of terminating shocks, van Alem
   79 % ≥ 1 recurrence, and AHA's ≈ 80 % of VF at checks.

   The probability is the same at every episode. No source read supports a decline across episodes: Koster's
   11 → 42 % organised share came from a subgroup selected for ≥ 5 episodes. This is checked as a prediction against
   van Alem's episode count. Whether recurrence also differs between patients (a second latent) is decided by that
   check: one latent is added only if van Alem's IQR 1–4 is missed, and then only with the owner's approval (§6).
3. **It is not triggered by compressions** (Conover 2014). The recurrence clock starts at the shock.
4. **The rhythm it recurs into is VF**, through the existing `host.setRhythm('vfCoarse')`. That builds a new VF
   episode, so `vf.ts` takes its four `outcome` draws again. The re-recording rule in §5.3 accounts for this.
5. **How it meets the post-shock rhythm and ROSC** is Q1, because the ROSC share's source does not define it (§4.4).
   - Option A: keep ROSC 0.1 as sustained and apply recurrence to the other terminations. The rate is scaled so the
     all-terminations rate still matches Koster's 48 %.
   - Option B (proposed): split the draw into stages:
     1. termination;
     2. rhythm at 5 s: asystole 60 %, organised 28 %, from Stieglis's 3448 patients (69 % / 31 % of terminations);
     3. recurrence.

     ROSC then emerges and is checked. The organised fraction is later split into perfusing and PEA by the existing
     haemodynamics (CoPP and the myocardium, as the showcase already does).

### 3.7 Scenario rules, instructor pre-selection, the population

- **An instructor pre-selection or a scenario `probability` rule wins** (as now: `d.defib.preselect`; the controller's
  `probability` transitions in, for example, `acls-vf-witnessed.json`, which uses its own 0.3 / 0.15, `[FIT]`
  placeholders). The patient's latent is not consulted, and no refibrillation is drawn. A card that sets the rhythm
  (the showcase's "VF at the first and second check") overrides any pending recurrence. The pending recurrence is
  cancelled whenever an instructor or card rhythm event lands.
- **Population.** Every VF figure is out-of-hospital, at about 6–9 min from the call, while the simulated patient is
  usually monitored and anaesthetised. The engine reproduces each cohort with the patient put in that cohort's state
  (its delay). At under a minute of VF it then PREDICTS 95–96 % first-shock termination (Stieglis's < 1 min and
  pre-call AED groups). The after-cardiac-surgery pooled 78 / 35 / 14 % (AHA Part 10) is used only as a qualitative
  check: the per-shock rate must fall. It cannot be a numeric test because it pools waveforms and energies.
  Recurrence in monitored arrests was not read (GAP).

---

## 4. The three findings, and the ROSC share

### 4.1 F1, the comment

`outcome.ts` says the engine's energy is "read as Mittal's delivered rectilinear-biphasic joules". Mittal's 70 J is
SELECTED energy (research note §6.1). S1 corrects the comment to "selected", with no change of value.

### 4.2 F2, the escalation

The Hill curve claims success at 120, 150 and 170 J in unselected patients, which the trial never measured. S1
replaces it with §3.2. 68 % at 70 J is reproduced exactly. 54 / 38 / 38 % and 94 % become predictions with bands
(Wilson 95 % CIs on 15/28, 5/13 and 3/8). A shock-naive first shock at 120 J will no longer read 83 %. The model
gives its own value, and the plan says so in the PR.

### 4.3 F3, pre-excited AF

The trial excluded it, and no source gives its cardioversion success. **Proposal:** keep the AF family's latent
(the atrial substrate is the same tissue) and mark it `[GAP: pre-excited AF cardioversion; extrapolated from AF]`.
That is Q6.

### 4.4 The ROSC share

The comment on `VF_TABLE.rosc = 0.1` cites "van Alem 2003: higher termination, no more ROSC". That randomised trial
(Resuscitation 58:17, DOI 10.1016/s0300-9572(03)00106-0) measured an organised rhythm within 1 min after the first
200 J BTE shock in 69 % (35/51); what did not differ was survival to discharge. So 0.1 is brief §6.5's table value
with no measured definition to preserve. That is why Q1 is the owner's decision.

---

## 5. The pieces

Each piece is one PR on main. Physiology PRs carry `run-validation` from the first push. Hours are estimates.

| Piece | Purpose | Depends on | Files | Tests first (numbers and sources) | Must not touch | Gate | Hours | Label |
|---|---|---|---|---|---|---|---|---|
| **S0** | The cohort harness and the patient latent, with no behaviour change. Adds `shockResistance` and `refibrillation` to `STREAM_NAMES`, the per-family `z` in pipeline state and the snapshot, and a test harness that runs N seeded patients through a protocol (energies, stacked vs 2-min CPR, entry rule) and returns per-shock, per-patient and cumulative figures | — | `rng/sfc32.ts`, `l3/defib-pacer/resistance.ts` (new), `engine.ts` (state only), `test/l3/defib-pacer/cohort-harness.ts` (new) | Same seed gives the same `z` after a snapshot round-trip and in a follower. Adding the streams leaves every existing stream's sequence byte-identical. Every existing test and recorded course is unchanged (the latent is not yet read) | `outcome.ts` probabilities, `deliverShock` | common + engine-core | 6 | run-validation |
| **S1** | Cardioversion by threshold (AF, flutter/SVT, VT with a pulse); F1, F2, F3 | S0; Q2, Q4, Q6 answered | `outcome.ts` (curves → `resistance.ts`), `device-layer.ts` (pass the latent) | Harness, Mittal protocol: first shock 68 % (exact, ± sampling SE at N = 20 000). PREDICTION bands: 54 % (CI 36–70), 38 % (18–64), 38 % (14–69), cumulative 94 % (87–98). Schmidt fixed and escalating arms. Flutter: first-shock 50–75 % at 50 J, 85–90 % at 100 J (AHA Part 9). No-latent fallback equals the marginal | VF path; `shockStateFactor` K/pH | common + engine-core + validation | 12 | run-validation |
| **S2** | VF termination by threshold; the dose term replaces `LOW_ENERGY_*`; temperature and VF duration become threshold shifts | S1; Q3 | `outcome.ts`, `resistance.ts` | Harness, Koster protocol (stacked 200/200/360): 92 / 61 / 83 % determining. Stieglis protocol by delay: 95 % (< 1 min) to 75 % (> 16 min) as determining (RR 1.06/min). Hypothermia factor unchanged in size. `outcome.test.ts` 10 000-shock rows re-derived as the population marginal | refibrillation; ROSC share (until Q1) | common + engine-core + validation | 12 | run-validation |
| **S3** | Refibrillation; the post-shock split per Q1; antiarrhythmic placement per Q5 | S2; Q1, Q5 | `outcome.ts`, `device-layer.ts` (pending recurrence, cancelled by instructor/card events), `l3/defib-pacer/refib.ts` (new) | Timing: cumulative 50 % at 27 s, 75 % at 60 s, 87 % at 90 s (Verkaik). Koster: 48 % within 2 min (determining). PREDICTIONS: Verkaik 5 / 14 / 26 / 55 % and 5 % refractory; Walker 69 vs 93 % and 71 % of failures in 5 %; Spies 81 %; van Alem median 2 (IQR 1–4); Hess recurrence ≈ initial termination; Koster 90 → 80 % across episodes; AHA ≈ 80 % of checks are recurrence. Every miss is reported in the PR, not tuned | the latent's parameters (fixed in S1/S2) | common + engine-core + validation + e2e `learner-defib`, `scenario-runner-page`, `device-layer-page` | 14 | run-validation |
| **S4** | Dose in delivered current; re-solve μ at the cohort's impedance distribution | S3, M2 plan **E2b**, DQ7 | `resistance.ts`, `impedance.ts` (read only) | Every first-shock number of S1–S3 unchanged at the cohort impedance. At 200 vs 300 J the current rises 27 % (Walker 2009). VF success flat across impedance strata for RLB (Mittal 1999, Chen 2013, research note §9). AF per DQ7's answer | E2b's own outputs | common + engine-core + validation | 8 | run-validation |

### 5.1 Order relative to the M2 plan

S0–S3 need nothing from the M2 plan. Their dose is the selected energy, which `deliverShock` already has. They can
run before or beside E2a (PR 455, draft) and E2b; they touch `deliverShock` at one call site, which E2b also edits.
Whichever of S1 or E2b lands second merges the other's edit.

E2b's acceptance row "the outcome unchanged (§3.2)" stays true. E2b adds impedance and delivered energy and changes no
probability. S4 is the join and goes after both.

### 5.2 What moves

| What | Moves in | Rule |
|---|---|---|
| `test/l3/defib-pacer/outcome.test.ts` (10 000 seeded shocks ± 2 %) | S1, S2 | Rows become population marginals over N patients through the harness; each row keeps its source. A row that changes value names the source change (F2) |
| `test/l3/shock-state.test.ts` (Mittal 68 % at 70 J; AF 75–90 % at 200 J; flutter/SVT ≥ 90 % at 50 J; VT > 90 % at 100 J) | S1 | 68 % stays. "AF 75–90 % at 200 J" is not a measured shock-naive figure (Mittal measured none at 200 J), so it is re-sourced or removed with that reason in the PR. "Flutter ≥ 90 % at 50 J" contradicts AHA Part 9 (50–75 %) and becomes the AHA band |
| `test/engine/drug-layer.test.ts` (`it.fails` on amiodarone and ROSC) | S3 (by Q5) | Stays `it.fails` unless Q5 gives a sourced size |
| `test/engine/device-determinism.test.ts`, `test/engine/defib-engine.test.ts` | S0–S3 | Determinism must hold with the new streams. Seeded expectations that change are re-derived, stating the cause |
| Showcase course `apps/demo/src/app/showcase/showcase-haemorrhage.json`, rows E132 of `docs/showcase/SHOWCASE-2-RUN-SHEET.md` | S2, S3 | Its two VF shocks take "the defibrillator's outcome table on the engine seed", so the course is re-recorded in the same PR. Cause: the threshold (S2) or refibrillation (S3). Control: the same course with the shocks replaced by an instructor pre-selection, which must be unchanged to the shock time |
| `packages/controller/scenarios/acls-vf-witnessed.json` | none | Its own `probability` rules win (§3.7). It must be unchanged; that is a test in S3 |
| Courses with no shock | none | Byte-identical: the control that the new streams moved nothing |

### 5.3 Stream invariance, stated honestly

The new streams keep the outcome stream's count at one draw per shock. But a CHANGED outcome changes how many
`outcome` draws follow:

- `deliverShock` draws 0 timings for `unchanged`, 1 for `sinus`, 2 for `pea` and 4 for `rosc`;
- a recurrence builds a VF episode, and `vf.ts` takes 4 draws.

So every course with a shock is expected to differ from its first shock on, in `outcome`-stream consumers (VF
waveform, drug hazards, repeat suxamethonium). Courses with no shock are unchanged. The re-recording rule is:

- before the first shock, identical, and the PR proves it with a diff to the shock time;
- after it, re-recorded with the cause named.

Moving those consumers to their own streams would end this coupling. It is not in this plan's scope; it is listed for
the owner as an option (Q10).

---

## 6. Papers wanted, and questions for the owner

### 6.1 Papers wanted

| Paper | DOI | Why | Open? |
|---|---|---|---|
| Niebauer MJ et al. 2005, J Interv Card Electrophysiol 13:145 | 10.1007/s10840-005-0277-2 | RLB AF and flutter threshold distribution (histogram, SD, protocol floor), on the device's waveform | No |
| Koster RW, Walker RG, Chapman FW 2008, Resuscitation 78:252 | 10.1016/j.resuscitation.2008.03.231 | The exact n and counts of the stacked second and third shocks (determining ρ_vf and σ_vf); episode-by-episode table | No |
| Walker RG et al. 2009, Resuscitation 80:773 | 10.1016/j.resuscitation.2009.04.002 | Per-patient shock counts and energies, to run the protocol prediction properly | No |
| van Alem AP, Post J, Koster RW 2003, Resuscitation 59 | 10.1016/s0300-9572(03)00208-9 | Recurrence time distribution over the whole attempt; episode counts | No |
| Spies DM et al. 2020, Resuscitation 157:219 | 10.1016/j.resuscitation.2020.09.029 | Recurrence by post-shock rhythm | No |
| Hess EP et al. 2011, Resuscitation 82:685 | 10.1016/j.resuscitation.2011.02.008 | The RLB energy protocol (the M2's waveform); per-shock counts | No |
| Cheskes S et al. 2024, Resuscitation 198:110186 | 10.1016/j.resuscitation.2024.110186 | Termination by shock in the refractory and recurrent groups | No |
| Schmidt AS et al. 2020, Eur Heart J 41:626 | 10.1093/eurheartj/ehz585 | Per-shock counts in both arms (the abstract gives first and cumulative only) | No |
| Villani GQ et al. 2004, Europace | 10.1016/j.eupc.2004.03.006 | Within-patient variability (the s_w cross-check) | No |
| Richardson L et al. 2007, Interact Cardiovasc Thorac Surg 6:799 | 10.1510/icvts.2007.163899 | The monitored post-surgical pooled rates: which waveforms and energies | Check |
| A source for IRAF incidence after transthoracic cardioversion | — | Q7 | — |

### 6.2 Questions for the owner

Each question gives a short explanation, the options, and a proposal.

**Q1. What does the VF table's ROSC 0.1 stand for, now that VF can come back?**
- *Explanation:* The 0.1 has no measured definition. The trial its comment cites found an organised rhythm within a
  minute after 69 % of first shocks. With refibrillation, a patient can have an organised rhythm and then fibrillate
  again.
- *Options:*
  - A. Keep 0.1 as "sustained ROSC" and let VF come back only after the other terminations.
  - B. Split the shock into termination → rhythm at 5 s (Stieglis: 69 % asystole, 31 % organised of terminations) →
    recurrence, and let ROSC emerge from the haemodynamics.
- *Proposal:* B. Every step then has a source, and ROSC is checked, not set.

**Q2. May the AF spread be taken from a BTE trial for the RLB device?**
- *Explanation:* Mittal (RLB) gives one shock-naive point. Schmidt (BTE) gives two, plus same-energy repeats. Without
  Schmidt the spread has no source until Niebauer's full text is read.
- *Options:*
  - A. Borrow Schmidt's spread and split, marked as a waveform transfer.
  - B. Wait for Niebauer.
  - C. Both: A now, re-checked against Niebauer.
- *Proposal:* C.

**Q3. Where should the VF first-shock number be anchored?**
- *Explanation:* The engine's 0.9 has no delay attached. Stieglis gives termination by minute of delay (95 % under
  1 min, 75 % beyond 16 min).
- *Options:*
  - A. Keep 0.9 at the OHCA cohorts' about 8 min and let the time shift predict the rest.
  - B. Replace 0.9 by Stieglis's curve (his 87 % overall at his delay distribution).
- *Proposal:* B. It is measured, recent, and covers the simulator's monitored, early-shock case.

**Q4. Flutter, SVT and VT with a pulse: no repeated-shock source.**
- *Options:*
  - A. Threshold with ρ = 0 (independent draws, as now, but with AHA's corrected flutter location).
  - B. Borrow AF's ρ, marked placeholder.
  - C. Wait for sources.
- *Proposal:* A for now, with the flutter location corrected to AHA Part 9 and the gap named. B is a fitted borrowing
  between different tissues.

**Q5. Antiarrhythmics.**
- *Explanation:* For AF, drugs lower the cardioversion threshold (direction only, Brandes Table 2). For VF, the
  guidelines think drugs act on recurrence, but no paper read sizes the effect. Today the engine puts a `[FIT]` +30 %
  on ROSC.
- *Options:*
  - A. Leave the VF drug term on ROSC as `[FIT]`.
  - B. Move it to the recurrence probability as a PLACEHOLDER of the same size.
  - C. Remove it until sized.
- *Proposal:* For AF, a threshold shift of placeholder size, put to you for a number. For VF, B, named as a
  placeholder, because the mechanism then sits where the guidelines put it.

**Q6. Pre-excited AF (F3).**
- *Options:*
  - A. Use AF's latent, marked as an extrapolation.
  - B. A flat placeholder.
- *Proposal:* A.

**Q7. Immediate recurrence of AF (within the first minute).**
- *Explanation:* Mittal's 68 % already counts a recurrence inside 30 s as failure. No incidence was found for 30–60 s.
- *Options:*
  - A. Do not model it.
  - B. Model it once a source is found.
- *Proposal:* A, with the gap named. The later recurrences (days to weeks) are beyond a session and are left out by
  this question, not by choice.

**Q8. CPR before the shock.**
- *Explanation:* The guidelines say CPR improves defibrillation success in prolonged VF but give no human size.
- *Options:*
  - A. No threshold term; the CoPP factor stays on ROSC.
  - B. A placeholder threshold term in the circulatory phase.
- *Proposal:* A until sized.

**Q9. Torsades and polymorphic VT.**
- *Explanation:* The engine shocks them as VF.
- *Options:*
  - A. Share the VF latent.
  - B. A separate latent with no source.
- *Proposal:* A.

**Q10. The shared `outcome` stream.**
- *Explanation:* Every shock-outcome change moves the VF waveform, the drug hazards and the repeat-suxamethonium draw
  that follow it.
- *Options:*
  - A. Accept it, and re-record with the cause named (this plan).
  - B. A separate piece moving those consumers to their own streams first.
- *Proposal:* A here; B as its own brief if you want course stability across physiology changes.

**DQ7 (as it stands in the research note §9.3). Does chest impedance change a shock's chance of success, and for which
rhythm?**
- *Explanation:* With the M2's waveform, two VF sources found no difference across impedance strata. For AF, the M2's
  own trial found lower success at higher impedance, pooled over two waveforms and the whole escalation.
- *Options:*
  - A. A gate and a record only.
  - B. As A, plus Mittal's pooled 0.64 per 10 Ω for AF by a stated rule.
  - C. As A, plus Sadek's 1.36 per 10 Ω (BTE).
  - D. Both rhythms.
- *Proposal:* A for VF. For AF, A until a per-shock RLB source is found. In this plan, S4 then puts impedance into the
  dose as current, which keeps VF flat by construction only if the data say so. That is a test, not an assumption.

---

## 7. Self-review against the codebase

- **Read for this plan:**
  - `outcome.ts` (whole);
  - `l3/device-layer.ts` `deliverShock` (223–269) and the `DeviceHost.outcomeRng` field (82);
  - `engine.ts` 956–975 (`outcomeRng`, `shockState`, the state factors' sources) and 819 (repeat sux on `outcome`);
  - `rng/sfc32.ts` (`StreamName`, `STREAM_NAMES`);
  - the consumers of `ps.rng.outcome`: `l2/ecg/arrest/vf.ts:105`, `l2/hemo/pipeline.ts:461`,
    `l2/pk/hooks.ts:62–130`;
  - `l2/ecg/morphology/individuality.ts` (the per-patient precedent).
- **Tests named exist:**
  - `test/l3/defib-pacer/outcome.test.ts`, `test/l3/shock-state.test.ts`, `test/engine/drug-layer.test.ts`,
    `test/engine/device-determinism.test.ts`, `test/engine/defib-engine.test.ts`;
  - e2e `device-layer-page`, `learner-defib`, `scenario-runner-page`.
- **The recorded course** (`showcase-haemorrhage.json`; `docs/showcase/SHOWCASE-2-RUN-SHEET.md`) takes its shocks from
  the table. `acls-vf-witnessed.json` uses its own probabilities.
- **What this plan cannot see from the code:** whether a restored old snapshot fills a missing stream name. `ps.rng`
  is `Record<StreamName, Sfc32State>` (`engine.ts:115`), so S0's first test is a restore of a pre-S0 snapshot.
- **Assumptions stated:**
  - lognormal–probit;
  - independent latents per family;
  - the Schmidt → RLB transfer (Q2);
  - Verkaik's timing taken within a cycle.
- **Risks:**
  - The VF calibration rests on about 37 patients (Koster's second shock).
  - Walker's concentration figure is the likeliest prediction to miss.
  - S3's predictions mix threshold and recurrence, so a miss there may be either mechanism's. The PR then reports
    which prediction rows fail and leaves the model as it is.
