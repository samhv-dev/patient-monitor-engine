# The quality of chest compressions by its components — Plan

**STATUS: DRAFT FOR REVIEW.** A plan document: no product code, test, constant, card or other plan was changed while
writing it. Nothing in it is ruled until the owner answers §9 and the orchestrator reviews the pieces.

**Why this plan exists.** In a simulated arrest the instructor chooses the quality of chest compressions as one of
three words, Poor, Good or Excellent, which the engine turns into one dimensionless number, `quality` (0.4, 0.8, 1),
that scales the pressures compressions put on the circulation. The defibrillator being built (styled on the ZOLL M2)
measures compressions in centimetres and per minute and coaches the rescuer. Its plan asked which depth each word
stands for (`docs/plans/defibrillator-zoll-m2.md`, its question on what `quality` means in centimetres). The owner answered that the question is wrongly put: the
quality of CPR is every factor of high-quality CPR, "depth, rate, full recoil, avoiding hyperventilation, minimising
interruptions". This plan models those factors one by one, each by its mechanism and from its sources, so that a
resident sees what each factor does to the patient: the arterial and right-atrial pressures, the coronary and cerebral
perfusion pressures, EtCO2, the shock's chance, the brain.

The owner's statement is a clinician's remark and is checked against the guidelines and the measured studies like any
other (§4).

**Reading conventions.**

- `[FT]` full text read; `[ABS]` abstract read (Europe PMC record); `[LIB]` the library copy of a guideline, PDF text;
  `[NOTE]` taken from `docs/research/defib-zoll-m2-cpr.md`, which gives the source, species, n and where it was read;
  `[G p]` the ZOLL M2 Operator's Guide, as that note and the defibrillator plan record it.
- **Mine:** a sentence marked *(mine)* is the planning executor's own reasoning, not a source's statement.
- **Animal** means the number is from that species and preparation only; it is never carried to humans here.
- A number is written as its source states it. Arithmetic on a source's numbers is marked "(arithmetic)".
- Code is cited by function name and file; line numbers move.

**Base.** `origin/main` 7320de53, worktree `scratch/wt-plan-cpr-quality`, branch `plan-cpr-quality-components`.

---

## 1. Summary

- Today one number scales every compression effect at once (§2.1). Depth, recoil and the instructor's word are the same
  knob; rate changes only the number of compressions; the duty cycle is a constant; the `ventilation: '30:2'` field of
  the CPR command is accepted and read nowhere, so 30:2 makes no pauses; pauses exist only when someone stops CPR by
  hand. Ventilation does reach the circulation, through the pleural pressure every breath puts on the heart, but
weakly: measured, 30 breaths/min against 10 lowers the engine's CoPP by 1.6 mmHg, a quarter of the pigs' fall (§2.2).
A 10-s pause halves CoPP within about 4 s and the rebuild takes 8–14 s, of the kind measured in pigs.
- The plan replaces `quality` by **the compression act**: depth (cm), rate (/min), residual force between compressions
  (leaning), compression fraction of the cycle (duty), and a **compressor's schedule** that makes the pauses (for
  breaths, rhythm checks, charging, shock) as events in time. Ventilation rate, tidal volume and inspiratory time stay
  the breathing model's inputs, and their effect on flow stays the pleural-pressure coupling that exists, checked
  against its sources (§3.6). The surface under the patient separates what the M2's sensor reads from what the chest
  receives (§3.7).
- Poor, Good and Excellent become **named sets** of those values (§5). Old cards keep their meaning through an exact
  equivalence path (piece CQ1) until the pieces that change a mechanism re-record them by cause.
- The evidence agrees with the owner on all five factors as things that change haemodynamics; it **adds** the duty
  cycle, the surface, and the pre-shock pause as a separate, stronger interruption; it **differs** in three places: the
  harm of hyperventilation is measured in pigs, while the human outcome data are mixed and partly favour more breaths
  than ten a minute (§3.6); excessive depth (> 6 cm) is limited by injury, not by flow (§3.1); and for the compression
  fraction two human studies found the opposite association (§3.5).

---

## 2. What the engine does today

### 2.1 From the code

| Effect | Where | What `quality` (q) does | Notes |
|---|---|---|---|
| Compression waveform | `l2/hemo/pipeline.ts` `cprPressure` | a half-sine over the compression phase of each `60/rate` cycle, **amplitude × q** | phase = `CPR_DUTY` × cycle, `CPR_DUTY` 0.5 `[ENG: scenario]` (`l2/hemo/params.ts`) |
| Direct cardiac compression | `circEnv` → `cprCardiac` | 24 mmHg × waveform (`CPR_CARDIAC_MMHG`, `l2/circ/params.ts`) | added to the four chambers' pressures (`l2/circ/circuit.ts`) |
| Thoracic pump | `circEnv` → `cprThoracic` | 24 mmHg × waveform (`CPR_THORACIC_MMHG`) | added to everything intrathoracic and the aortic root |
| "Incomplete recoil" | `circEnv` → `cprRelease` | **24 × 0.65 × q mmHg, constant while CPR is on** (`CPR_RELEASE_RESIDUAL`) | on the venous side (RA, LA, pulmonary compartments) only. Marked `[FIT: … fit to Paradis's RA relaxation band]` |
| Volume available | `circuit.ts` (the `vStr / vCprRef` factor) | the three pressures × min(1, stressed intrathoracic volume / 8 % of blood volume) | a mechanism: an empty thorax generates no pressure |
| Coronary perfusion time | `stepCoronary` call in `emitSecond` | none | the perfused fraction of the cycle is `1 − CPR_DUTY` while CPR runs, 1 when it stops |
| Coronary driving pressure | `l2/circ/model.ts` (`cppAcc`) | none | aortic − RA pressure averaged over the samples with no compression pressure (the relaxation phase, and the whole of a pause) |
| Shock outcome | `l3/defib-pacer/outcome.ts` `outcomeProbabilities` | none directly | reads the continuous no-beat CoPP at the shock (`cppMmHg`), a state factor marked `[FIT: … directions sourced]`: a lower CoPP lowers the ROSC share |
| ECG artefact | `pipeline.ts` (the `cpr` event) | `depth: min(1, q)` → 0.2–2 mV | at the compression rate |
| Capnogram oscillation | `l2/co2/capno.ts` `CPR_OSC_MMHG` | 3 mmHg × q | `[FIT: capnogram shape parameter]` |
| Pleth | `pipeline.ts` (`cprEj`) | none directly | the forward volume per compression from the circuit |
| Command | `pipeline.ts` (validation and `cpr` event) | rate 60–150, q 0–1.5; default q 0.8 (`CPR_QUALITY_DEFAULT`), rate 110 | `ventilation: '30:2' \| 'continuous'` is in the type (`types-hemo.ts`, `controller/src/protocol.ts`) and **read nowhere** |
| Instructor | `apps/demo/src/app/panel/defib.ts` `CPR_QUALITY` | Poor 0.4, Good 0.8, Excellent 1 | the learner's "Start CPR" (`learner-actions.ts`) sends 0.8 at 110 |

What follows from the code *(mine, read from the functions above)*:

- **Depth** has no representation; `quality` is its only stand-in, and it also sets the "release residual", so a
  deeper compression today also leans harder.
- **Rate** changes how many compressions there are and how long each lasts (half the cycle); the amplitude does not
  depend on rate. That matches the thoracic-pump findings at constant force and duration (§3.2).
- **Recoil** is not an input: a residual pressure equal to 65 % of the thoracic amplitude stays on the venous side
  whenever CPR is on. Full recoil cannot be chosen.
- **Pauses** are real in the circuit (when CPR stops, the pressures vanish and the circuit's own compliances discharge),
  but nothing creates them except an instructor stopping CPR: a 30:2 cycle, a rhythm check and a pre-shock pause have no
  representation.
- **Ventilation**: each positive-pressure breath raises the pleural pressure `pIt`, which is added to every chamber and
  the pulmonary vessels (`circuit.ts`), so venous return and the aortic − RA gradient can change with the breathing
  rate, tidal volume and inspiratory time. Whether the size is right is measured in §2.2 and checked in §3.6.

### 2.2 One headless measurement

One run, on 7320de53, through the slot helper's light lane, bounded by a fixed 420 simulated seconds per arm, not
committed. Rig: adult man 40 y, 70 kg, MODELED, seed 7; tracheal tube and ventilator (VT 500 mL, PEEP 0, FiO2 1) at
the arm's rate from 1 s; coarse VF at 60 s; CPR from 120 s. Means over 300–420 s (180–300 s of CPR); CoPP and CO
from the 1 Hz `circ` event (the CoPP the coronary step used), CBF as the brain's `cbfRel`, EtCO2 the displayed value.

| Arm | CoPP mmHg | CO L/min | CBF (of normal) | EtCO2 mmHg |
|---|---|---|---|---|
| q 0.4, 110 /min, 10 breaths/min | 13.1 | 0.66 | 0.098 | 13.4 |
| q 0.8, 110, 10 | 27.0 | 1.05 | 0.474 | 17.5 |
| q 1.0, 110, 10 | 31.6 | 1.11 | 0.585 | 18.1 |
| q 0.8, 60, 10 | 22.6 | 0.86 | 0.375 | 16.6 |
| q 0.8, 100, 10 | 26.3 | 1.05 | 0.454 | 17.5 |
| q 0.8, 120, 10 | 27.1 | 1.05 | 0.449 | 17.9 |
| q 0.8, 140, 10 | 28.1 | 1.07 | 0.499 | 17.7 |
| q 0.8, 110, **30 breaths/min** | 25.4 | 1.21 | 0.294 | 13.0 |
| q 0.4, 140, 30 (the worst of today's knobs together) | 14.0 | 0.70 | 0.088 | 10.3 |

**A 10-s pause** (q 0.8, 110, 10; CPR off at 300 s, on at 310 s), CoPP / CBF each second:

| s from the stop | −2 | 0 | +1 | +2 | +4 | +6 | +8 | +9 | +10 (resume) | +11 | +12 | +14 | +18 | +24 | +30 | +40 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CoPP | 25.5 | 28.2 | 20.7 | 17.5 | 13.2 | 11.2 | 8.0 | 7.0 | 11.9 | 19.0 | 23.5 | 23.8 | 25.5 | 26.5 | 27.2 | 27.4 |
| CBF | 0.44 | 0.46 | 0.46 | 0.44 | 0.38 | 0.32 | 0.26 | 0.22 | 0.17 | 0.16 | 0.16 | 0.20 | 0.25 | 0.32 | 0.37 | 0.41 |

What the measurement shows *(mine, from the numbers above)*:

- **Quality** moves everything steeply: halving it from 0.8 to 0.4 halves CoPP (27.0 → 13.1, below the ROSC threshold
  of 15) and cuts CBF to a fifth.
- **Rate**: 60 → 120 /min raises CoPP 22.6 → 27.1 and CO 0.86 → 1.05; above 100 /min CoPP rises by under 2 mmHg and
  CO is flat. The direction matches the canine data (Feneley 1988) and the small effect above 100 matches the human
  EtCO2 data (Sheak 2015).
- **Ventilation**: 10 → 30 breaths/min lowers CoPP only 1.6 mmHg (27.0 → 25.4, −6 %), while CO **rises** (1.05 →
  1.21) and CBF falls by 38 % (0.47 → 0.29) with EtCO2 17.5 → 13.0. Aufderheide's pigs lost 6.5 mmHg of CPP
  (23.4 → 16.9, −28 %) for 12 → 30. So today the circulation barely feels hyperventilation's intrathoracic pressure,
  and most of what a resident would see comes through CO2 (washout, and the cerebral vessels' CO2 response). This is
  CQ6's starting point.
- **A pause**: CoPP halves within about 4 s and is at a quarter (7.0) after 9 s. On resuming it is back to 19 at the
  second second and to its pre-pause level after about 8–14 s (15–25 compressions). CBF lags: it keeps falling for
  2 s after compressions resume (0.16) and takes about 40 s to return to 0.41–0.44. Berg 2001 (pigs, 15:2) measured
  14 against 21 mmHg for the first two against the last two compressions of a cycle; the engine's first second after
  the pause is 11.9–19.0, so the CoPP rebuild is of the measured kind; the slower CBF recovery is the engine's
  cerebral model and has no source in this plan.
- **Recoil and duty** cannot be varied today (constants), and 30:2 makes no pauses (the field is read nowhere).

### 2.3 What reads `quality` today: cards and validation rows

- **Scenario cards and recordings.** Every card that starts CPR sends `quality 0.8, rate 110`: the six showcase cards
  (`apps/demo/src/app/showcase/showcase-*.json`), the four debrief fixtures (`apps/demo/src/app/__fixtures__/debrief-2/`),
  the kit-round recordings under `docs/showcase/kit-round-a/`, the Stage 6b run log and the two documents that show the
  format (`docs/guides/scenario-authoring.md`, `docs/plans/stage-11-scenarios.md`). The validation gate
  `g3-cpr-etco2` (`packages/validation/suites/gates/gate-docs.ts`) sends no quality (the default 0.8) at 110 with BVM
  10 × 500. The scenario driver (`packages/controller/src/scenario/driver.ts`) carries active and rate only.
- **Engine tests that set a quality.** 0.8 (sixteen calls, the "standard" rigs), 1 (ten calls: the acceptance,
  cerebral-flow and helper rigs), 0.4 (one: the drained-tamponade arm), 0.5 and 1.2 (the EtCO2 map).
- **Rows whose numbers depend on `quality`** (from `docs/validation/known-misses.md` and the tests):

| Row | Test | Band and its source | Today |
|---|---|---|---|
| S13 VF + CPR q 0.8: CoPP | `clinical-suite.test.ts` | written 0–21.9 (Paradis 1990); the audit's correction 10–30 for a salvageable patient without a vasopressor | 26.3–28.1 (an expected failure against 0–21.9) |
| VF + CPR q 1: CBF | `cpr-cerebral-flow.test.ts` | ≤ 0.40 of normal; the audit: 0.20–0.40 (Kern 2007 chapter) | 0.45 |
| quality map of EtCO2 at 10 breaths/min | `cpr-etco2.test.ts` | written 12 / 20 / 25 / 29 at q 0.5 / 0.8 / 1 / 1.2 (unsupported); the audit's correction: monotone, q 0.5 → 10–20, 0.8 → 15–26, 1.0 → 20–30, 1.2 → 22–35 (Berve, research/09) | 20.5 / 25.2 / 26.6 / 26.6 |
| +10 breaths/min lowers EtCO2 | `cpr-etco2.test.ts` | −8.7 to −17.4 % (Sheak 2015; Murphy 2016); the audit: −10 to −25 % | −19 % |
| CPR EtCO2 window mean | `fidelity-arrest.test.ts`, `arrest-etco2.test.ts`, gate `g3-cpr-etco2` | 10–20 mmHg (Sanders 1989), ≥ 10 at +2 min | 15.3–15.9 |
| CPR coRatio, adult | `resp-child-rest.test.ts` | 0.25–0.33 at q 1 | 0.363 |
| Asystole + CPR | `circ-arrest.test.ts`, `hemo-acceptance.test.ts` | SBP 60–110, DBP 10–30, CO 1–2.5 L/min at q 0.8; 70–110 / ≥ 10 at q 1 | pass |
| 10 min of VF with CPR: kIsch < 0.9 | `clinical-suite.test.ts` | Weisfeldt & Becker 2002 | pass |
| Drained tamponade with q 0.4: CoPP < 15 | `circ-tamponade-drainage.test.ts` | — | pass |

What each shows under the plan is in §5.3.

---

## 3. The components

Each component: the mechanism (which pressure or flow it changes, through what); the measured relations; what the
guidelines recommend and on what evidence; how it couples to the others; what the engine must do; the gap.

### 3.1 Depth

**Mechanism.** The sternum's displacement compresses the heart between sternum and spine (cardiac pump) and raises the
intrathoracic pressure (thoracic pump); both rise with displacement, and below some displacement neither moves blood
(Miller 10th ch. 82; Dellinger 5th ch. 1 [NOTE]). The engine carries both terms (§2.1); no source gives their relative
share as a function of depth [NOTE §1.3].

**Measured.**

| Source | Species, n | Relation |
|---|---|---|
| Babbs 1983 (DOI 10.1016/s0196-0644(83)80290-x) [ABS] | dogs 6–12 kg, n 8, VF, mechanical | "CO = a(x − x0) for x greater than x0"; output threshold x0 mean 2.3 cm (1.5–3.0 per dog); a threshold for measurable pressure mean 1.8 cm. Animal |
| Bellamy 1984 (DOI 10.1161/01.cir.69.1.174) [ABS] | swine, n 9, transverse piston | stroke 1.5 / 2 / 2.5 in: MAP 23 / 33 / 40 mmHg; coronary flow 12 / 30 / 50 % of pre-arrest; all coronary flow in relaxation. Animal; piston stroke, not sternal depth |
| Ristagno 2007 (DOI 10.1378/chest.06-3065) [ABS] | pigs 40 kg, n 24 | ≈ 4.2 cm vs ≈ 6 cm: CPP and PetCO2 "significantly lower"; no ROSC when the shallow compressions came first. Animal |
| Liang 2021 (DOI 10.21037/jtd-21-812) [ABS] | pigs, n 16, adrenaline | 30 vs 50 mm: no significant difference in CPP, carotid flow or EtCO2 over 5 min. Animal; contradicts the others, not explained in the abstract |
| Maher 2009 (DOI 10.1016/j.resuscitation.2009.03.016) [ABS] | **human** infants after cardiac surgery, n 6 | attempted 1/2 vs 1/3 AP: SBP 83.4 vs 51.6 mmHg; DBP 30.5 vs 30.6 |
| Sheak 2015 (DOI 10.1016/j.resuscitation.2015.01.026) [ABS] | **human**, n 583, 29 028 epochs, mixed effects | EtCO2 +1.4 mmHg per 10 mm |
| Murphy 2016 (DOI 10.3109/10903127.2015.1115929) [ABS] | **human** OHCA, n 230 | log EtCO2 +4.0 % per 10 mm |
| Stiell 2014 (DOI 10.1161/circulationaha.114.008671) [ABS] | **human** OHCA, n 9 136 | survival peaked at 45.6 mm (best 15-mm interval 40.3–55.3) |
| Hellevuo 2013 (DOI 10.1016/j.resuscitation.2013.02.015) [ABS] | **human** IHCA, n 170 | injuries 28 / 27 / 49 % at < 5, 5–6, > 6 cm (p = 0.06) |
| Edelson 2006 (DOI 10.1016/j.resuscitation.2006.04.008) [ABS] | **human**, 60 first shocks | first-shock success aOR 1.99 per 5 mm of pre-shock depth |

No adult human relation of depth to CPP, aortic pressure or output was found [NOTE §1.4]. The human depth data are
EtCO2 slopes and outcomes.

**Guidelines.** AHA 2025 BLS: at least 5 cm, avoiding more than 6 cm (COR 1, LOE B-NR), from a 2020 ILCOR scoping
review of 12 studies [LIB, NOTE]. ERC 2025 BLS: at least 5 cm and not more than 6 cm [LIB]. The upper limit rests on
injury and on survival curves, not on flow.

**Couplings.** Depth falls as rate rises in human rescuers (Stiell 2012, DOI 10.1097/ccm.0b013e31823bc8bb, inverse
association [ABS]; Chandran 2025 parabolic [ABS]); depth and recoil velocity correlate (r 0.87, Chandran 2025 [ABS]).
That is the rescuer's behaviour, not the chest's, and belongs to the compressor (§3.8), not to the haemodynamics. The
displacement that reaches the chest is the sensor's reading minus the surface's give (§3.7).

**What the engine must do.** The compression's pressure amplitude becomes a function of the chest's displacement,
`a(d) = max(0, d − d0) / (dRef − d0)`, replacing `quality` in `cprPressure`: the threshold-linear form Babbs 1983 states,
the only form a source gives. `d0` and `dRef` are marked engineering choices until a human source sets them (§9 CQ-Q1).
No plateau and no fall above 6 cm is invented: no source shows flow falling with depth; the device cannot measure
beyond 7.6 cm [G A-10].

**Gap.** Babbs 1983 full text (the per-dog slopes `a` and the pressure data), Ryu 2016 and Ristagno 2007 values
(second points on the curve), Sheak 2015's within- versus between-patient slope: WANTED (§8.2). The engine's EtCO2 is
today about twice as depth-sensitive as Sheak's regression under the anchor that plan proposed, Good = 5 cm and Excellent = 5.5 cm (2.8 against 1.4 mmHg per 10 mm
[NOTE §3.2]).

### 3.2 Rate

**Mechanism.** At constant force and compression duration, the thoracic pump moves the same volume per compression,
so flow per minute is set by the compression time per minute, not by the count; the cardiac pump needs the ventricles
to refill between compressions, so flow rises with rate until the relaxation time is too short to refill (Halperin 1986,
Dean 1990 [NOTE]). A faster rate also shortens the relaxation phase in which the coronaries are perfused (Wolfe 1988).

**Measured.**

| Source | Species, n | Relation |
|---|---|---|
| Halperin 1986 (DOI 10.1161/01.cir.73.3.539) [ABS] | dogs, n 8 + 8, manual | external CPR: flow rose with compression duration (14 → 46 %), unchanged with rate 60 → 150 at constant duration. Animal |
| Feneley 1988 (DOI 10.1161/01.cir.77.1.240) [ABS] | dogs, n 26, duty ≈ 52 % | 120 vs 60 /min: higher mean aortic pressure and CPP (p < .002); defibrillated 12/13 vs 2/13. Animal |
| Wolfe 1988 (DOI 10.1016/s0022-5223(19)35774-5) [ABS] | dogs, n 8 | diastolic perfusion time fell linearly with rate; net coronary flow optimal at 120 /min. Animal |
| Dean 1990 (DOI 10.1152/jappl.1990.68.2.554) [ABS] | swine 2 and 8 weeks | cerebral PP rose with duty until relaxation was too short (150–200 ms at 2 wk, 250–300 ms at 8 wk). Animal |
| Ornato 1988 (DOI 10.1097/00003246-198803000-00007) [ABS] | **human** OHCA, n 18, constant force | 60 → 140 /min: PetCO2 unchanged; SBP 59 → 46 mmHg; DBP ≈ 23 at all rates |
| Kern 1992 (DOI 10.1001/archinte.1992.00400130153020) [ABS] | **human**, n 23 | EtCO2 15.0 at 120 vs 13.0 mmHg at 80 /min |
| Sheak 2015 [ABS] | **human**, n 583 | rate not a predictor of EtCO2 "over the dynamic range of actual CC delivery" |
| Idris 2015 (DOI 10.1097/ccm.0000000000000824) [ABS] | **human** OHCA, n 10 371 | 100–119 /min best survival, adjusted for depth and fraction |

**Guidelines.** AHA 2025 and ERC 2025: 100–120 /min (AHA 2a, B-NR, three observational studies, > 13 700 patients)
[LIB, NOTE]. The evidence is outcome; the haemodynamic optimum near 120 is canine.

**Couplings.** Rate against depth (the rescuer, §3.8); rate against duty (the relaxation time = (1 − duty) × 60/rate:
filling and coronary perfusion both live in it); rate against ventilation (in 30:2 the number of compressions before a
pause).

**What the engine must do.** Keep the amplitude independent of rate (Halperin, Ornato at constant force; the M2
measures depth, so depth is held, not force). Keep the relaxation time as the product of rate and duty; the circuit's
filling then limits flow at high rates by itself. A validation cell checks that a rate rise from 100 to 120 at a fixed
depth changes CoPP and EtCO2 by little (human: Sheak, Ornato) and that 60 /min gives a lower CoPP than 120 (Feneley,
animal).

**Gap.** No human CPP by rate at controlled depth. The rate at which filling fails in an adult has only the piglet
threshold (Dean 1990).

### 3.3 Recoil and leaning

**Mechanism.** If the rescuer's hands keep a residual force on the sternum between compressions, the chest does not
return to its resting position: the intrathoracic pressure stays raised through the relaxation phase, right-atrial
pressure rises, venous return and the next compression's filling fall, and the coronary gradient (aortic − RA in
relaxation) narrows (Aufderheide 2006, DOI 10.1016/j.resuscitation.2006.03.021, background [ABS]).

**Measured.**

| Source | Species, n | Relation |
|---|---|---|
| Zuercher 2010 (DOI 10.1097/ccm.0b013e3181ce1fe2) [ABS] | piglets 10.7 kg, n 10, VF | lean 0 / 10 / 20 % of compression force: RA diastolic 9 / 10 / 13 mmHg; cardiac index 1.9 / 1.6 / 1.4 L/min/m²; LV myocardial flow 39 / 30 / 26 mL/min/100 g; CPP "decreased". Animal |
| Yannopoulos 2005 (DOI 10.1016/j.resuscitation.2004.10.009) [ABS] | pigs, n 9, automated | decompression 100 → 75 → 100 %: CPP 23.3 → 15.1 → 16.6 mmHg; aortic diastolic 28.1 → 20.7 → 20.9; RA diastolic 4.8 → 5.6 → 4.3 (n.s.). Animal |
| Glatz 2013 (DOI 10.1016/j.resuscitation.2013.07.010) [ABS] | **human** children with a beating heart, n 20 | sternal force 0 / 10 / 20 % of body weight: RA 6.5 / 7.7 / 8.6 mmHg; CPP 42 / 39 / 38 mmHg |
| Niles 2011 (DOI 10.1016/s0300-9572(11)70147-2) [ABS] | **human**, 108 adult events | lean ≥ 2.5 kg in 91 % of events, 12 % of compressions |
| Tomlinson 2007 (DOI 10.1016/j.resuscitation.2006.07.017) [ABS] | **human** OHCA, n 91 | residual decompression force 1.7 ± 1.0 kg = 3 ± 2 mm; force–depth strongly non-linear |

**Guidelines.** AHA 2025: allow complete recoil (2a, C-LD); the leaning evidence is porcine (ref. Niles 2011) [LIB,
NOTE]. ERC 2025: full recoil; "No studies were identified that examined different measures of leaning" [LIB, NOTE].

**Couplings.** Leaning adds to the residual intrathoracic pressure that positive-pressure breaths and PEEP also raise
(§3.6); both act on the same venous return. Depth and recoil velocity covary in humans (Chandran 2025), a rescuer
property.

**What the engine must do.** Replace the fitted constant residual (`CPR_RELEASE_RESIDUAL` × q) by a residual
displacement from the rescuer's residual force: the release-phase intrathoracic pressure on the venous side becomes
the thoracic term evaluated at the residual displacement (Tomlinson: 1.7 kg ≈ 3 mm in humans), through the same
`a(d)` as a compression. Full recoil is then zero residual. *(mine)* The present constant was fitted to Paradis 1990's
human RA relaxation pressures of 15–25 mmHg; the animal relaxation pressures with full recoil are 4.8 (Yannopoulos)
and 9 mmHg (Zuercher). If the engine with full recoil falls below Paradis's band, the missing pressure has another
mechanism (venous congestion of a long arrest, the right heart's distension that Steen 2003 describes, the patients'
mixed leaning); the piece states it as a known miss with that hypothesis and does not refit. That is CQ-Q3.

**Gap.** No adult human dose–response of leaning to pressure; the human figures are children with a beating heart
(Glatz). Zuercher 2010 full text (the CPP values) WANTED (§8.2).

### 3.4 Duty cycle

**Mechanism.** The fraction of each cycle spent compressing sets the ejection time (thoracic pump flow rises with it,
Halperin 1986) against the relaxation time (filling and coronary perfusion fall with it).

**Measured.** Kim 2020 (DOI 10.1371/journal.pone.0228111) [ABS], pigs, n 6, crossover: 33 vs 50 %: EtCO2 +1.0 mmHg,
SAP +6.0, DAP +8.9, RAP +2.6, CPP +4.7 mmHg at 33 %. Dean 1991 (DOI 10.1161/01.cir.84.2.896) [ABS], 2-week swine:
myocardial flow < 5 mL/min/100 g by 35 min at 60 % duty, > 25 at 30 % for 50 min. Johnson 2015
(DOI 10.1016/j.resuscitation.2014.11.008) [ABS], **human** OHCA VF, n 164: duty cycle median 38.8 % (time); shorter
duty with deeper and slower compressions. All animal except Johnson, which is observational.

**Guidelines.** AHA 2025: approximately equal compression and relaxation times (2b, C-EO: expert opinion); "the optimal
duty cycle is not known" [LIB, NOTE]. ERC: not a separate target.

**What the engine must do.** `CPR_DUTY` becomes a field of the compression act (default 0.5, the AHA's equal times),
read by both `cprPressure` and the coronary perfused fraction, as today's constant is. A cell checks the direction of
Kim 2020 (33 % raises CoPP against 50 %), animal-marked. The M2 does not measure duty [G 15-1], [G A-10], so it is an
instructor's or a scripted rescuer's value and never shown on the device.

### 3.5 Interruptions: the compression fraction and each pause

**Mechanism.** Compressions are the only forward flow in VF or asystole. When they stop, the aortic pressure falls as
the arterial compliance empties into the veins and the right heart, the aortic − RA gradient collapses within seconds,
and when they resume the gradient is rebuilt over several compressions, because the arterial side has to be refilled
before relaxation pressures rise (Kern 2002 background; Berg 2001; Steen 2003). A pause before a shock lowers the
perfusion the fibrillating myocardium receives in the seconds before the shock, and with it the chance that the shock
gives a perfusing rhythm.

**Measured.**

| Source | Species, n | Relation |
|---|---|---|
| Berg 2001 (DOI 10.1161/hc4501.098926) [ABS] | swine 32 kg, n 14, 15:2 vs continuous | CPP of the first 2 compressions of each cycle 14 ± 1 vs the last 2 21 ± 2 mmHg (P < 0.001); compressions per minute 62 vs 92; integrated CPP lower with breaths every minute for 8 min; LV flow 60 vs 96 mL/100 g/min. Animal |
| Kern 2002 (DOI 10.1161/hc0502.102963) [ABS] | swine 35 kg, n 30 | 15:2 with 16-s pauses vs continuous: neurologically normal 24-h survival 2/15 vs 12/15; pauses "require a period of 'rebuilding' of coronary perfusion pressure". Animal |
| Steen 2003 (DOI 10.1016/s0300-9572(03)00265-x) [ABS] | pigs, n 18 | "It took 2 min of mCPR to establish an adequate coronary perfusion pressure, which was lost when the mCPR was interrupted"; ROSC 1/6 with 40-s hands-off before shocks vs 5/6 with shocks during compressions. Animal |
| Yu 2002 (DOI 10.1161/01.cir.0000021429.22005.2e) [ABS] | swine, n 20 | pre-shock interruptions 3 / 10 / 15 / 20 s: ROSC in 5/5 at 3 s, none beyond 15 s; interruption length inversely related to time above threshold CPP. Animal |
| Sato 1997 (DOI 10.1097/00003246-199705000-00005) [ABS] | rats, n 25 | shock delay 0 / 10 / 20 / 30 / 40 s: ROSC 5/5, 3/5, 3/5, 1/5, 0/5. Animal |
| Cheskes 2011 (DOI 10.1161/circulationaha.110.010736) [ABS] | **human** OHCA shockable, n 815 | survival lower with pre-shock pause ≥ 20 s (OR 0.47) and peri-shock ≥ 40 s (OR 0.54) vs < 10 / < 20 s; −18 % survival per 5 s of pre-shock pause; post-shock pause not associated |
| Edelson 2006 [ABS] | **human** | pre-shock pause length lowered first-shock success (with depth) [NOTE] |
| Christenson 2009 (DOI 10.1161/circulationaha.109.852202) [ABS] | **human** OHCA VF, n 506 | survival OR 1.11 per +10 % compression fraction |
| AHA 2025 BLS synopsis [LIB] | — | "pauses in chest compressions have been shown to result in an almost immediate drop in coronary perfusion pressure" (refs 35, 36: Berg 2001 and a second animal study); in two studies higher CCF was associated with **lower** odds of survival (refs 54, 55); a 2015 review found heterogeneity |

**Guidelines.** AHA 2025 BLS [LIB]: pre- and post-shock pauses as short as possible (1, C-LD); pulse check no more than
10 s (1, C-LD); resume compressions immediately after a shock (2a, B-R); switch compressors about every 2 min (2a,
B-R); two breaths each over 1 s without an advanced airway (2a, C-LD); CCF at least 60 % (2b, C-LD). ERC 2025 BLS
[LIB]: the interruption for two breaths should not exceed 10 s. ERC 2025 ALS [LIB]: pre-shock pause under 5 s by
compressing during charging [the defibrillator plan §7.1].

**Couplings.** Each pause has a cause in the room: breaths in 30:2 (§3.6), the AED's analysis and charge (the
defibrillator's AED cycle), the rhythm and pulse check, the compressor switch. The cost of a pause is the time to
rebuild (§2.2 measures the engine's), so frequent short pauses and one long one are not equivalent; the compression
fraction is a summary, not a mechanism.

**What the engine must do.** Nothing new in the circuit: the decay and rebuild are the circuit's own dynamics, and
§2.2 measures them against Berg's and Steen's numbers. What is missing is **the compressor's schedule** that makes the
pauses as events: 30:2 with the two breaths' pause, continuous with an advanced airway, a pause for an analysis, a
charge, a pulse check, a switch. The shock outcome already reads the CoPP at the shock, so the pre-shock pause acts on
the shock's chance through the mechanism; a cell checks Cheskes's direction (a 20-s pre-shock pause lowers the ROSC
share against a 5-s one). The compression fraction is computed from the schedule for the Debrief and the M2's record,
never used as an input to flow.

**Gap.** No human measurement of CPP over a pause and its rebuild was found; WANTED in §8.2 (a human arterial-line
series across pauses). The two human studies with a negative CCF association (AHA refs 54, 55) were not read.

### 3.6 Ventilation during CPR: rate, tidal volume and inspiratory time

**Mechanism.** A positive-pressure breath raises the intrathoracic pressure; while it lasts, venous return to the right
heart and the aortic − RA gradient in relaxation fall. More breaths per minute, a larger tidal volume or a longer
inspiration raise the mean intrathoracic pressure over the minute (Aufderheide 2004). Ventilation also clears CO2 and
oxygenates; too little ventilation lowers SaO2 and raises PaCO2.

**Measured.**

| Source | Species, n | Relation |
|---|---|---|
| Aufderheide 2004 (DOI 10.1161/01.cir.0000126594.79136.61) [ABS] | **human** observation n 13; pigs n 9 (haemodynamics), 3 × 7 (survival) | humans: 30 ± 3.2 breaths/min (15–49), 1.0 s per breath, no survivor. Pigs at 12 / 20 / 30 /min: mean intrathoracic pressure 7.1 / 11.6 / 17.5 mmHg/min, CPP 23.4 / 19.5 / 16.9 mmHg; survival 6/7 (12), 1/7 (30), 1/7 (30 with CO2). Haemodynamics animal |
| Pilot 2026 (DOI 10.1016/j.resuscitation.2026.111062) [ABS] | pigs, n 18, continuous mechanical | VT 6 / 10 / 14 mL/kg: "graphically" poorer cerebral and coronary perfusion pressures and MAP at 6 and 14 than at 10. Animal; no values in the abstract |
| Wang 2022, PART secondary analysis (DOI 10.1016/j.resuscitation.2022.05.008), as ERC 2025 ALS reports it [LIB] | **human** OHCA | median 8 breaths/min; time below 6 /min associated with lower ROSC and survival; mild hyperventilation (> 12 to 16 /min) associated with **improved** ROSC, survival and neurological outcome |
| Prause 2023 (Resuscitation 187:109765), as ERC 2025 ALS reports it [LIB] | **human** RCT, n 46, stopped early | 10 vs 20 /min at 6 mL/kg: higher minute ventilation at 20, no difference in hypercapnia, hypoxia or ROSC |
| Sheak 2015 [ABS]; Murphy 2016 [ABS] | **human** | EtCO2 −3.0 mmHg per +10 breaths/min; −17.4 % per +10 breaths/min (both mix CO2 washout with flow) |

**Guidelines.** AHA 2025 BLS [LIB]: tidal volume enough for visible chest rise, avoiding hypo- and hyperventilation;
"3: Harm, C-LD" for hyperventilation (too many breaths or too large a volume). AHA 2025 ALS [LIB]: with an advanced
airway, one breath every 6 s (10/min) with continuous compressions (2b, C-LD); a 2017 review of one human and ten
animal studies found no clear benefit for 10/min and no other rate superior. ERC 2025 ALS [LIB]: on a ventilator during
CPR, 6–8 mL/kg predicted body weight, FiO2 maximum, 10/min, inspiratory time 1–1.5 s, PEEP 0–5; "insufficient
evidence" to recommend a rate beyond that.

**Couplings.** Breaths in 30:2 are also pauses (§3.5); with an advanced airway they fall on compressions, and the
breath's pressure adds to the compression's and to any leaning (§3.3). EtCO2 reads both flow and ventilation, so a
resident who hyperventilates sees EtCO2 fall for two reasons; the plan keeps them apart in the validation cells (flow:
CoPP and CO; washout: PaCO2).

**What the engine must do.** The coupling exists (the pleural pressure on the heart, §2.1), but it is weak: 10 → 30
breaths/min lowers the engine's CoPP by 1.6 mmHg while CO rises, against 6.5 mmHg of CPP in Aufderheide's pigs for
12 → 30; the resident today sees hyperventilation mainly as a lower EtCO2 and, through the cerebral vessels' CO2
response, a lower CBF (§2.2). Whether cerebral CO2 reactivity is preserved under CPR is itself unsourced here (W13).
The piece checks the size against Aufderheide's pig numbers (12 → 30 /min: CPP 23.4 → 16.9, mean intrathoracic pressure 7.1 → 17.5) as an
animal-marked direction-and-size cell, and against the human EtCO2 relative cell already in the suite. If the size is
wrong, the cause is looked for in the breath's pressure on the collapsed CPR thorax (lung compliance under
compressions, the breath's timing against compressions), never in a factor on ventilation rate. Whether a breath given
during a compression adds to it as the breathing model sums pressures today is a design question for that piece.

**Gap.** The human haemodynamic harm of hyperventilation is not measured; the human outcome data are mixed (PART
favours more breaths than 10). Tidal-volume values: abstract only. This is where the evidence differs from the owner's
statement (§4).

### 3.7 The surface under the patient

**Mechanism.** On a mattress part of the hands' travel compresses the mattress, not the chest. An accelerometer sensor
on the sternum (the M2's [G 15-1]) measures the total travel.

**Measured.** "Compression feedback devices over estimate chest compression depth when performed on a bed",
Resuscitation 2009;80:79–82 (DOI 10.1016/j.resuscitation.2008.08.011) [ABS], manikin with a Q-CPR accelerometer: with
feedback the chest itself was under-compressed on a bed, foam 26.2 (2.2) mm, inflatable 32.2 (1.16) mm; a narrow
backboard added 1.9 mm (95 % CI 0.1–3.7), a wide one 2.6 mm. *(mine: the abstract does not state whether 26.2 and 32.2
are the chest's depth or the mattress's share; the full text is WANTED before a number is used.)* Manikin only.

**What the engine must do.** One input, the surface (floor, bed with backboard, bed), giving the mattress's share of the
travel. The sensor reads the total travel (± 0.6 cm [G A-10]); the haemodynamics reads the chest's share. A resident
who follows "Good Compressions" on a soft bed then delivers less than the screen says, as in the manikin study. This is
a component only because a source measures it.

### 3.8 The rescuer: fatigue, rate–depth trade-off, switching

This is not a physiological component; it is who produces the values. The research note's §2 gives the sources
(Sugerman 2009 Table 3, clinical with feedback: depth flat to 90 s, 48.3 → 43.7 mm by 151–180 s; rate unchanged; the
between-rescuer SD ≈ 9 mm is larger than fatigue; manikin studies without feedback fall from minute 2) [NOTE]. AHA 2025
recommends switching compressors about every 2 minutes (2a, B-R) [LIB]. A scripted rescuer reads Sugerman's Table 3
(feedback on, the M2's case) and the switch resets it; a no-feedback clinical course stays a named gap [NOTE §2.4].

---

## 4. The owner's statement against the evidence

| His factor | Agrees | Adds | Differs |
|---|---|---|---|
| Depth | every animal depth study (except Liang 2021) and both human EtCO2 regressions show flow and pressure rising with depth; guidelines 5–6 cm | the threshold below which compressions move nothing (Babbs, dogs); the M2 reads depth including the mattress (§3.7) | the upper limit (6 cm) is from injuries and survival curves, not from flow; no source shows flow falling with depth |
| Rate | 100–120 /min in both guidelines, from human outcome data | the relaxation time (rate × duty) is where filling and coronary flow live | in humans, rate is not a predictor of EtCO2 over the range rescuers use (Sheak), and at constant force a higher rate lowered SBP (Ornato); its haemodynamic optimum is canine |
| Full recoil | animal studies (Zuercher, Yannopoulos) and children with a beating heart (Glatz): leaning raises RA pressure and lowers CPP and output | leaning is common (12 % of compressions in adults, Niles) | ERC 2025 found no study of leaning measures in humans; the guideline rests on porcine data |
| Avoiding hyperventilation | pigs: 30 /min lowered CPP and survival against 12 (Aufderheide); guidelines classify hyperventilation as harm | tidal volume and inspiratory time matter as well as rate (the mean intrathoracic pressure) | human outcome data are mixed: in PART, hypoventilation was the harm and mild hyperventilation (12–16 /min) was associated with better outcomes; an RCT of 10 vs 20 /min found no difference (stopped early) |
| Minimising interruptions | animal CPP falls at once and rebuilds slowly; human survival falls with pre-shock pause | the **pre-shock** pause is the interruption with the strongest human signal (Cheskes; post-shock pause not associated); the **duty cycle** is a further factor of each compression | for the compression fraction as such, the human evidence is heterogeneous, with two studies of the opposite sign (AHA 2025 refs 54, 55) |

*(mine)* The statement is right as a list of factors that change the patient's flow. What it leaves out that the
sources measure is the duty cycle and the surface. What a resident should learn from the simulator, where the evidence
supports it, is the mechanism of each (a pause costs the rebuild time; leaning raises RA pressure; a breath raises the
intrathoracic pressure), and where the evidence is mixed (ventilation rate, CCF), the simulator shows the mechanism and
the Debrief says that the outcome evidence is mixed.

---

## 5. What "Poor, Good, Excellent" become

### 5.1 Named sets for the instructor

Each value is marked: **S** a source states it; **G** a guideline target; **E** an engineering choice of this plan.

| Component | Guideline | Typical | Poor | Old card (`quality` q) |
|---|---|---|---|---|
| Depth (chest) | 5.5 cm (G: 5–6, mid-range, E) | 4.2 cm (S: Idris 2015 mean 42 ± 12 mm, human) | 3.5 cm (E; below the guideline, above Babbs's canine threshold) | `d0 + q (dRef − d0)` (§5.2) |
| Rate | 110 /min (G: 100–120, E mid) | 110 /min (S: Idris 2015 111 ± 19) | 140 /min (E; above the range) | the card's rate |
| Residual force (lean) | 0 (G: full recoil) | 1.7 kg (S: Tomlinson 2007, mean residual force in human OHCA; Niles 2011: ≥ 2.5 kg in 12 % of adult compressions) | 20 % of compression force (S: Zuercher's highest arm, animal) | today's residual (§5.2) |
| Duty | 0.5 (G: equal times, C-EO) | 0.39 (S: Johnson 2015 median, human) | 0.5 (E) | 0.5 |
| Schedule | continuous with an advanced airway, or 30:2 with ≤ 10 s for the breaths (G); pre-shock pause < 5 s (G, ERC ALS) | 30:2, breaths pause 16 s (S: Kern 2002's "clinically realistic" lay-rescuer pause, an animal study; a clinical median for professionals is W11) | pauses 20 s before each shock (S: Cheskes's ≥ 20-s group), rhythm check 15 s (E) | none (continuous, as today) |
| Ventilation | 10 /min, 6–8 mL/kg, Ti 1 s (G: AHA ALS, ERC ALS) | 8 /min (S: PART median) | 30 /min, 1 s per breath (S: Aufderheide's observed humans) | the card's own ventilation |
| Surface | floor or backboard (G) | bed with backboard (E) | bed without backboard (E) | floor (today's behaviour) |
| Rescuer | switch every 2 min (G) | Sugerman's fatigue, no switch for 3 min (S) | — | none |

The instructor picks a set and can change any value in it; the set's name is kept in the record with the values.

### 5.2 Old cards keep their meaning

Every card in the repository sends `quality 0.8, rate 110` (§2.3). The plan keeps an **equivalence path**: a `cpr`
command with `quality` and no components becomes a compression act whose depth is `d0 + q (dRef − d0)` and whose
residual reproduces today's `0.65 × q` term, with duty 0.5, no schedule and the floor. Piece CQ1 proves that path gives
byte-identical CoPP, EtCO2 and pleth at q 0.4, 0.8 and 1. The pieces that change a mechanism (CQ3 recoil) then change
what the old cards show, by cause, re-recording the self-referential rows and leaving every sourced row's band alone.
Whether old cards should, after CQ3, mean "typical CPR" (the Typical set) or keep today's numbers forever is CQ-Q2.

### 5.3 What each set does to flow

**In the present engine** a set can only be approximated through `quality`, rate, the ventilator and a hand-made pause
(§2.2): Guideline ≈ q 1 at 110 with 10 breaths: CoPP 31.6, CBF 0.59, EtCO2 18.1; the old card ≈ q 0.8 at 110: 27.0,
0.47, 17.5; Poor ≈ q 0.4 at 140 with 30 breaths: 14.0, 0.09, 10.3 (§2.2's measured rows). Leaning, duty, the
schedule's pauses and the surface have no effect today because they cannot be set.

**In the planned engine** the sets differ by mechanism, and each difference is a validation cell of its piece (§7);
the sizes are not predicted here, because predicting them would be fitting. The direction each set must show, from
the sources:

| From Guideline to | Depth | Lean | Duty | Pauses | Ventilation | Surface |
|---|---|---|---|---|---|---|
| Typical | CoPP, CO, EtCO2 lower (5.5 → 4.2 cm; §3.1) | RA relaxation up, CoPP down (§3.3) | 0.5 → 0.39: CoPP up (Kim, animal) | 16-s breath pauses: CoPP's integral lower, rebuild each cycle (§3.5) | 8 /min: PaCO2 higher | the chest receives less than the sensor reads |
| Poor | far lower, near the threshold (3.5 cm) | 20 % lean: RA up, CO down about a quarter (Zuercher, animal) | — | 20-s pre-shock pauses: lower CoPP at the shock, lower ROSC share | 30 /min: CoPP down (Aufderheide, animal), EtCO2 down | as Typical, more |

The old card (`quality 0.8`) gives exactly today's numbers until CQ3, then what CQ-Q2 decides.

**The rows of §2.3 under the plan.** No band moves. Through CQ1 and CQ2 every row reads the same numbers (the
equivalence path). From CQ3:

- S13 (CoPP at q 0.8) and the asystole rows: re-measured with the leaning the old card then carries (CQ-Q2); if the
  card becomes Typical, its lower depth and its lean lower CoPP from today's 26–28, which moves it toward the audit's
  10–30 band, not away. Reported with the cause, never tuned to the band.
- The EtCO2 quality map: re-expressed by depth (the same four levels through the equivalence path), its audit bands
  kept; CQ2 adds the human slope cell beside it.
- The ventilation row (−10 to −25 % EtCO2 per +10 breaths/min, human): kept; CQ6 adds the animal CoPP cell beside it,
  so washout and flow are judged apart.
- The CBF row (≤ 0.40 at q 1): unchanged by these pieces; the engine reads 0.45 in its rig (0.59 in §2.2's rig with
  PEEP 0 and FiO2 1). It is the cerebral model's row and stays its known miss.
- The tamponade arm (q 0.4: CoPP < 15): kept through the equivalence path.

---

## 6. What the M2 measures and shows, and who sets each component

### 6.1 The device [G, as the defibrillator plan §2.5 records it]

| Component | The M2 | The simulator therefore |
|---|---|---|
| Depth | measured by the sternal sensor (CPR electrodes only), 1.9–7.6 cm ± 0.6 cm; bar graph 0–7.6 cm with markers at 5 and 6 cm adult; "Push Harder" / "Good Compressions" around 5 cm, adults only [G 15-1 to 15-4], [G A-10] | the sensor reads the total travel (chest + surface), with its ± 0.6 cm |
| Rate | 50–150 /min; "- - -" with no compression in the last few seconds [G 15-3], [G A-10] | read from the compression events |
| Recoil, leaning, duty | **not measured** (chapter 15, [G A-10]); no release metric on the face (the defibrillator plan's C7) | an instructor's or a script's value; visible to the resident only through the patient (RA, CoPP, EtCO2) |
| Metronome | 105 /min, configurable; AED: the whole CPR period by default; Manual: only while compressions are detected [G 12-9], [G 15-3] | the defibrillator plan's E5 and F4; a learner who follows it sets the rate |
| CPR period and pauses | AED: 2.0-min CPR period with countdown; "Stop CPR" before re-analysis; analysis needs hands off [G 12-9], [G 12-11] | the AED cycle makes the analysis pause; the schedule (CQ5) listens to it |
| Ventilation | not measured by the CPR sensor; EtCO2 and impedance respiration on the monitor side | from the breathing model |
| Record | CPR periods with mean depth and rate and the fraction at target (the defibrillator plan §5.3) | the compression fraction and the pauses from the schedule |

### 6.2 Who sets each component in a class

| Component | Instructor | Learner | Scenario |
|---|---|---|---|
| Depth, rate | a named set or a value; or "the learner's" | a learner's CPR action (the room's "Start CPR" and its rate, and on a sensor-capable input, the learner's own pressing) | a card's set |
| Lean, duty | a value, or the set's | — (no device shows them) | a card's set |
| Schedule (30:2 or continuous; pause lengths) | a set, or each pause by hand | by doing: the learner's breaths, analysis and shock create the pauses when the learner runs them | a card's schedule |
| Ventilation | the breathing inputs (as today) | the learner's bag or ventilator (as today) | as today |
| Surface | a choice in the room | — | a card's value |
| Rescuer fatigue and switching | on/off; switch by hand | "switch compressor" | a card's rescuer |

What a learner can set alone depends on the class's input device: CQ-Q4.

---

## 7. The pieces

Order: CQ1 → CQ2 → (CQ3, CQ4, CQ6 in any order) → CQ5 → CQ7 → CQ8 → CQ9. Each engine piece carries `run-validation`.

| Piece | Builds | Sources | Tests and validation cells | Must not change | Hours | Advisor |
|---|---|---|---|---|---|---|
| **CQ1** | **The compression act as state.** `hs.cpr` becomes `{active, depthCm, rateMin, leanKg, duty, surface}` with the equivalence path for `quality` (§5.2); `cprPressure`, `cprRelease`, the coronary perfused fraction, the ECG artefact and the capnogram oscillation read the act; the `cpr` command and the vocabulary gain the fields; `quality` stays accepted. No physiology changes | — | old commands give byte-identical CoPP, EtCO2, pleth and ECG at q 0.4 / 0.8 / 1 against main (a recorded comparison); the type tests of `types-hemo.ts` and `controller/src/protocol.ts` | every number; the scenario format version | 8 | design |
| **CQ2** | **Depth.** `a(d)` threshold-linear on the chest's displacement in `cprPressure` (§3.1); `d0`, `dRef` as marked choices (CQ-Q1) | Babbs 1983; Sheak 2015; Murphy 2016; Bellamy 1984; Ristagno 2007 | cells: CoPP, SBP, CO and EtCO2 rise with depth from 3.5 to 6 cm (direction, every source); no flow below `d0` (Babbs, animal); EtCO2 slope between 5 and 6 cm against Sheak's +1.4 mmHg/10 mm and Murphy's +4 %/10 mm (a size cell; its band waits for W4's confidence interval and stays a reported number until then) | rate behaviour; the old-card path's numbers | 8 | design |
| **CQ3** | **Recoil and leaning.** The residual displacement from the residual force replaces `CPR_RELEASE_RESIDUAL` (§3.3) | Zuercher 2010; Yannopoulos 2005; Glatz 2013; Tomlinson 2007; Paradis 1990 | cells: RA relaxation pressure rises and CoPP and CO fall with lean 0 → 10 → 20 % (Zuercher direction; size reported against Zuercher's CI drop of 16 and 26 %, animal); 75 % decompression lowers CoPP (Yannopoulos); RA relaxation with full recoil against Paradis 15–25 (a known miss with its hypothesis if missed, CQ-Q3). Re-records the self-referential CPR rows with the cause | the depth curve; the sourced bands | 8 | design |
| **CQ4** | **Rate and duty.** Duty becomes the act's field; the relaxation time from rate and duty; nothing else new | Halperin 1986; Feneley 1988; Wolfe 1988; Dean 1990; Kim 2020; Ornato 1988; Sheak 2015 | cells: 60 vs 120 /min at fixed depth: CoPP higher at 120 (Feneley, animal); 100 vs 120: EtCO2 within a small difference (Sheak: no predictor; reported); duty 33 vs 50 %: CoPP higher at 33 (Kim, animal) | the amplitude (no rate term) | 5 | none |
| **CQ5** | **The compressor's schedule.** 30:2 (the breaths' pause, the breaths given by the breathing model in the pause), continuous with an advanced airway, pauses for analysis, charge, pulse check, switch; each pause an event in time; the compression fraction computed for the record. Implements the `ventilation` field that is read nowhere today | Berg 2001; Kern 2002; Steen 2003; Yu 2002; Cheskes 2011; AHA 2025 BLS; ERC 2025 BLS | cells: in 15:2 or 30:2 the CoPP of the first compressions after the pause is lower than of the last (Berg 14 vs 21, animal: direction and the measured gap as a size cell); a 20-s pre-shock pause gives a lower CoPP at the shock and a lower ROSC share than a 5-s one (Cheskes direction; Yu, Sato animal); CoPP after resuming reaches its pre-pause level only after several compressions (§2.2's measured rebuild against Berg and Steen) | the circuit; the shock model's tables | 10 | design |
| **CQ6** | **Ventilation during CPR, checked.** The breath's pressure on the CPR thorax measured against Aufderheide; the breath's timing against compressions in continuous CPR; no rate factor | Aufderheide 2004; the 2026 pig pilot; PART (Wang 2022); Prause 2023; Sheak; Murphy | cells: 12 → 30 /min at the same VT: mean intrathoracic pressure rises and CoPP falls (Aufderheide, animal, size reported against 23.4 → 16.9); the existing human EtCO2 relative cell; PaCO2 and SaO2 at 6 vs 10 vs 30 /min separate washout from flow. If the size misses, the piece reports the mechanism it found missing and stops | the breathing model's non-CPR behaviour | 8 | design |
| **CQ7** | **Surface and the sensor.** The surface's share of the travel; the M2's sensor reads total travel ± 0.6 cm; "Push Harder" on the sensor's reading. Takes over the sensor part of the defibrillator plan's E3 | the 2009 mattress study (W6 first); [G 15-1 to 15-4], [G A-10] | cells: on a bed without a backboard the sensor reads more than the chest receives; the voice prompt follows the sensor, the haemodynamics the chest | the haemodynamic curve | 5 | none |
| **CQ8** | **The rescuer.** A scripted compressor whose depth follows Sugerman's Table 3 and whose switch resets it; rate–depth trade-off only if W7 gives numbers | Sugerman 2009; Stiell 2012; AHA 2025 (switch every 2 min) | cells: depth flat to 90 s then falling (Table 3 means); rate unchanged | the act's model | 5 | none |
| **CQ9** | **The instructor's sheet and the learner's input.** The named sets (§5.1), each value editable, the set's name and values in the record; the learner's CPR action carries depth and rate; the Debrief shows the compression fraction, each pause, mean depth and rate and the fraction at target. Takes over the compressions part of the defibrillator plan's R3 | §5.1's sources | e2e: picking a set sends its values; an old card's run is unchanged after CQ1; the record carries the set | the M2 face | 8 | none |

**What other plans may rely on.**

- **The brain plan** (`docs/plans/brain-energy-consciousness-recovery.md`) reads `hs.cpr` (B3b, B7a) and cerebral flow
  through CPP. After CQ1 it reads the compression act's `active` and phase, never `quality`; cerebral flow under
  compressions stays CBF from CPP, so depth, leaning, pauses and ventilation reach the brain through the circulation
  with no new coupling. The gasps the brain plan makes under compressions are breaths with negative pleural pressure, so
  they reach venous return through the same pleural path as a positive-pressure breath, in the other direction. The
  **reflow deficit after a long no-flow time** (Shaffner 1999, Lee 1989, as the brain plan cites them) stays a named
  attachment of the circulation and cerebral vessels: none of these pieces builds it (CQ-Q5).
- **The defibrillator's AED cycle** (E5) may rely on CQ5's pause events: the analysis and charge pauses are the cycle's
  own, and the schedule stops and resumes compressions on its "Stop CPR" and its CPR period. The shock outcome reads the
  CoPP at the shock, so the AED cycle's pause lengths act on the shock's chance with no new rule.
- **The defibrillator plan's pieces.** E3 is replaced: its state part by CQ1, its haemodynamics by CQ2, its sensor and
  prompt by CQ7, its pads-lead artefact following the compressions stays E3's remaining part (or moves into CQ1). F2
  stands on CQ1 and CQ7 instead of E3. R3's compressions part becomes CQ9. That plan's question on what `quality` means in centimetres is replaced by this plan's CQ-Q1 and
  CQ-Q2. These changes go to the hand-over; the defibrillator plan is not edited here.

---

## 8. Sources

### 8.1 Read for this plan

The research note `docs/research/defib-zoll-m2-cpr.md` (its rows R1–R27, F1–F14, read as it states) and:

| Source | Identifier | How read | Used for |
|---|---|---|---|
| Kleinman et al. Part 7: Adult BLS. AHA 2025. Circulation 2025;152(suppl 2):S448–S478 | DOI 10.1161/CIR.0000000000001369 | [LIB] text: compression fraction and pauses, ventilation, depth and rate recommendations and synopses | §3.1–3.6 |
| Wigginton et al. Part 9: Adult ALS. AHA 2025 | DOI 10.1161/CIR.0000000000001376 | [LIB] text: 10 breaths/min with an advanced airway, its evidence | §3.6 |
| ERC Guidelines 2025: Adult BLS. Resuscitation 2025;215:110771 | DOI 10.1016/j.resuscitation.2025.110771 | [LIB] text: breaths interruption ≤ 10 s | §3.5 |
| ERC Guidelines 2025: Adult ALS. Resuscitation 2025;215:110769 | DOI 10.1016/j.resuscitation.2025.110769 | [LIB] text: ventilator settings during CPR; PART and Prause 2023 as reported | §3.6 |
| Aufderheide TP et al. Hyperventilation-induced hypotension during CPR. Circulation 2004;109:1960–1965 | DOI 10.1161/01.cir.0000126594.79136.61 | [ABS] | §3.6 |
| Berg RA et al. Adverse hemodynamic effects of interrupting chest compressions for rescue breathing. Circulation 2001;104:2465–2470 | DOI 10.1161/hc4501.098926 | [ABS] | §3.5 |
| Kern KB et al. Importance of continuous chest compressions during CPR. Circulation 2002;105:645–649 | DOI 10.1161/hc0502.102963 | [ABS] | §3.5 |
| Christenson J et al. Chest compression fraction determines survival. Circulation 2009;120:1241–1247 | DOI 10.1161/circulationaha.109.852202, PMC2795631 | [ABS] | §3.5 |
| Cheskes S et al. Perishock pause. Circulation 2011;124:58–66 | DOI 10.1161/circulationaha.110.010736, PMC3138806 | [ABS] | §3.5 |
| Yu T et al. Adverse outcomes of interrupted precordial compression during automated defibrillation. Circulation 2002;106:368–372 | DOI 10.1161/01.cir.0000021429.22005.2e | [ABS] | §3.5 |
| Sato Y et al. Adverse effects of interrupting precordial compression during CPR. Crit Care Med 1997;25:733–736 | DOI 10.1097/00003246-199705000-00005 | [ABS] | §3.5 |
| Steen S et al. The critical importance of minimal delay between chest compressions and subsequent defibrillation. Resuscitation 2003;58:249–258 | DOI 10.1016/s0300-9572(03)00265-x | [ABS] | §3.5 |
| Aufderheide TP et al. Incomplete chest wall decompression: a clinical evaluation. Resuscitation 2006;71:341–351 | DOI 10.1016/j.resuscitation.2006.03.021 | [ABS] (background sentence only) | §3.3 |
| Compression feedback devices over estimate chest compression depth when performed on a bed. Resuscitation 2009;80:79–82 | DOI 10.1016/j.resuscitation.2008.08.011 | [ABS] | §3.7 |
| Impact of tidal volume during CPR: an experimental pilot porcine study. Resuscitation 2026;223:111062 | DOI 10.1016/j.resuscitation.2026.111062 | [ABS] | §3.6 |

Searches went to the Europe PMC REST service by title words only; no request carried a person's name or an e-mail
address. No file was downloaded for this plan.

### 8.2 WANTED

| # | What | Identifier | What it would settle |
|---|---|---|---|
| W1–W4 | Babbs 1983; Ryu 2016; Ristagno 2007; Sheak 2015 full texts | as the research note §4 | CQ2's `d0`, slope and the EtCO2 size cell's band |
| W5 | Zuercher 2010 full text (author manuscript PMC3321356; Europe PMC full text answered HTTP 500 for the note) | DOI 10.1097/ccm.0b013e3181ce1fe2 | CQ3's CPP values by lean |
| W6 | The 2009 mattress study, full text | DOI 10.1016/j.resuscitation.2008.08.011 | whether 26.2 / 32.2 mm are chest depth or mattress share (CQ7) |
| W7 | Idris 2015 full text | DOI 10.1097/ccm.0000000000000824 | depth by rate category for CQ8 |
| W8 | A human arterial-line series of CPP across compression pauses and their rebuild | not found | CQ5's rebuild cell in humans (today animal only) |
| W9 | The two studies with a negative CCF–survival association (AHA 2025 BLS refs 54, 55) | from the guideline's reference list | how CCF is presented in the Debrief |
| W10 | Wang 2022 (PART ventilation) and Prause 2023 full texts | DOI 10.1016/j.resuscitation.2022.05.008; Resuscitation 187:109765 | CQ6's human ventilation cell |
| W11 | A clinical median of the 30:2 breaths' pause in professional rescuers | not found | the Typical set's pause |
| W12 | Aufderheide 2004 full text (the breath's duration and VT in the pigs) | DOI 10.1161/01.cir.0000126594.79136.61 | CQ6's size cell's inputs |
| W13 | A measurement of cerebral blood flow's CO2 reactivity during CPR | not searched in depth | whether the engine's CBF fall with hyperventilation under CPR (§2.2) is real |

---

## 9. Questions for the owner

**CQ-Q1. Which threshold and reference depth the engine uses until a human source exists.**
- *Explanation:* The only stated shape is canine: no flow below a threshold (mean 2.3 cm in 6–12 kg dogs), then linear.
  The engine needs a threshold and a depth at which today's best compressions sit.
- *Options:* A, threshold 2.3 cm (Babbs's dogs) and reference 5.5 cm (the middle of 5–6), both marked as choices;
  B, threshold set so that the EtCO2 slope between 5 and 6 cm matches the human regression (Sheak), which changes the
  old cards' numbers.
- *Proposal:* A, with the human EtCO2 slope reported beside it as a known difference until W1–W4 are read.

**CQ-Q2. What old cards mean once leaning is modelled.**
- *Explanation:* Every card says "quality 0.8". Today that also carries a fixed leaning pressure. When leaning becomes
  its own component, old cards either keep today's numbers or become "typical CPR".
- *Options:* A, keep today's numbers forever through the equivalence path; B, old cards become the Typical set after
  CQ3, re-recorded with the cause.
- *Proposal:* B: a card written as "good CPR" should mean what real CPR does, and the re-recording is by cause.

**CQ-Q3. If full recoil gives a right-atrial pressure below the human band, what then.**
- *Explanation:* Today a fitted leaning pressure keeps the right-atrial pressure in Paradis's human band (15–25 mmHg).
  Animals with full recoil show 5–9 mmHg. If the engine with full recoil falls below the human band, something else
  raises it in patients.
- *Options:* A, report it as a known miss with the hypothesis (venous congestion, mixed leaning in the patients) and
  look for its source; B, keep a fixed residual pressure under its own name until that source is found.
- *Proposal:* A (mechanisms first; no fitted constant).

**CQ-Q4. Should a learner be able to set depth by pressing?**
- *Explanation:* A real learner presses a manikin or nothing; the simulator can take the depth from the instructor, a
  set, or a sensor in the room.
- *Options:* A, the instructor or a set gives depth; the learner gives rate and the pauses by doing; B, also a learner
  input of depth from a manikin or a pressure sensor, as a later room device.
- *Proposal:* A now; B as a room-device plan when a sensor is chosen.

**CQ-Q5. Should the reflow deficit after a long no-flow time be built with these pieces?**
- *Explanation:* After many minutes without flow, the brain's vessels let less blood through under the same pressure.
  The brain plan names it as belonging to the circulation.
- *Options:* A, a separate plan for the cerebral vessels; B, a piece here after CQ5.
- *Proposal:* A: it is a vessel mechanism, not a compression one.
