# Scenario format `pme-scenario/2`: phases from the physiology, actions with acceptance criteria

*Status: design, from the clinical owner's rulings of 29 October 2026 (17:00 and 17:20, the orchestrator's rulings
log). Target: after the 3 November demo. Docs only: no code, card or engine change comes with this document. Base:
`main` 9faec4cf (`1.0.0-rc.4`). Instructor v2 (`instructor-panel-redesign.md`) is unchanged in concept; §10 lists
what it reads differently.*

## 1. Intent and the owner's reasoning

In `pme-scenario/1` a card is a state machine and the instructor's buttons are its transitions: a button moves the
card and gives its treatment at the card's dose and route. Of the MH card's 19 states, 13 exist only because an
action was taken (the induction steps, triggerOff, five 2-second treatment hops, normoventilated, cpr). Objectives
are a second list with rules over run events, and the panel and the debrief must infer which step an objective
"asks for" (#171).

The owner's two examples show why this cannot grade a learner:

- **Dantrolene IM.** A button cannot be wrong: it gives 2.5 mg/kg IV. A resident with a free drug sheet may give
  dantrolene intramuscularly. By that route it has no effect on the MH, and the reconstituted solution (pH about
  9.5) injures the tissue. The grade must name what was wrong (the route), and the patient must not improve. An
  engine that treated IM as IV would teach that IM works.
- **Epinephrine.** The same drug is right by one route and dose and dangerous by another: 1 mg IV or IO in cardiac
  arrest, 0.5 mg IM in anaphylaxis, while 1 mg IV to a patient with a pulse is a serious error. Route and dose
  belong in the prescription and the grade, and the physiology has to honour the route.

So the owner split the card into what the disease does (PHASES, read from the engine) and what the team does
(ACTIONS, each carrying its acceptance criteria). The physiology moves the case; the grade reads what was given.

## 2. Goals, non-goals, anti-goals

Goals
- Phases are regions of the disease's course, entered and left by rules on the engine's true state only.
- Every action carries its prescription and the rule that grades what was actually given, in one object.
- One grading function serves the panel live and the debrief afterwards, so they never disagree.
- Any dose, route or timing chosen is given to the physiology and graded; an unmodelled route says so.

Non-goals
- No migration of the other five showcase cards; the runner keeps loading `/1`.
- No score total or pass mark; no new physiology beyond §9.

Anti-goals
- A phase entered because a button was pressed.
- A grade the physiology contradicts ("met" while the drug did nothing by that route).
- A panel that refuses a dose because it is off the prescription.

## 3. The document

`/2` keeps the `/1` header (`id`, `title`, `story`, `takeHome`, `seed`, `mode`, `patient`, `notes`) and replaces
`states`, `initialState`, `objectives` and `bookmarks` with five blocks:

| Block | Content |
|---|---|
| `phases` | the disease's course: label, Say line, entry rule on engine truth |
| `actions` | what the team should do: prescription and grading |
| `outcomes` | what the physiology should reach: reached / not reached |
| `judged` | recognition and communication the instructor judges |
| `script` | events the card imposes (a bleed, a rhythm), each labelled "card-set" |

A `script` entry fires on a phase entry, the nth taking of an action, or a scenario time, and applies `/1`
commands: it changes the truth, the phase follows, and it is never graded.

## 4. The phase model

A phase has `id`, `label`, `notes` (the Say line), an `enter` rule and `next` (the phases that may follow). Exactly
one phase holds at a time. Each tick the runner tests the entry rules of the current phase's `next`, in document
order; the first that holds wins. A phase rule has no `manual`, `event` or `afterS` leaf. Its leaves, composed
with `all`, `any` and `not`, read engine truth (rank 3), never the displayed numerics:

| Leaf | Example |
|---|---|
| `value`, with `forS` | `tempCore > 38.5` for 10 s |
| `slope` over a window | EtCO₂ rising: > 0.2 mmHg/min over 120 s |
| `unchanged` over a window | set minute ventilation within ±5 % over 120 s |
| `visited` | a treated phase has occurred |
| `signal` | `pulseLoss`, `rosc`, the rhythm group |

### 4.1 Worked example: malignant hyperthermia

The owner's phases. Limits marked † are qualitative in the rulings; the values are proposals to measure and rule
(§12, Q1).

| Phase | Entered when (engine truth) | Next |
|---|---|---|
| baseline | start | latent |
| latent | MH activity > 0.01† and EtCO₂ ≤ 45 | early signs, treated |
| early signs | EtCO₂ > 45 for 20 s, rising over 120 s at unchanged set ventilation; HR rising | established, treated, arrest |
| established | core > 38.5 °C for 10 s, or activity > 0.5† with pH < 7.25 | treated, arrest |
| treated | dantrolene effect > 0.1† and activity falling over 60 s | recovering, recrudescence, arrest |
| recovering | EtCO₂ < 45 and falling, activity < 0.1† | recrudescence, arrest |
| recrudescence | treated visited, activity rising over 120 s | treated, established, arrest |
| arrest | `pulseLoss` | ROSC |
| ROSC | `rosc` | treated, recrudescence, arrest |

The call of the crisis (today's triggerOff), every treatment and the return to normal ventilation become actions.
The induction sequence is a set of actions in baseline. The MH starts from the physiology: the patient is
`neuro.mhSusceptible`, and the engine starts the condition at the succinylcholine (latency 0) or the volatile, as its
trigger tests show, instead of the card's `condition: mh` command at Induce.

### 4.2 Sketch: class IV haemorrhage

| Phase | Entered when | Card-set |
|---|---|---|
| bleeding | start | the 2.5 L bleed over 10 min at 0 s |
| decompensating | SBP < 60 for 10 s | junctional rhythm 50/min on entry |
| arrest, PEA | `pulseLoss`, organised rhythm | |
| arrest, VF | `pulseLoss`, rhythm group VF | VF at the first two rhythm checks |
| arrest, asystole | `pulseLoss`, asystole | |
| ROSC | `rosc` | |
| post-resuscitation | ROSC held 120 s | |

The positive-pressure lesson needs no phase: the physiology takes the empty patient into arrest.

## 5. The action model

An action has `id`, `label`, `kind`, `phases` (it opens when one of them is entered), a `prescription` and its
grading; the kind decides which fields apply. The dantrolene action, for example: dantrolene 2.5 mg/kg (2–3
accepted), to 10 mg/kg cumulative, route `iv` or `central` with `iv` preferred, within 300 s of early signs, again
every 5–10 min while EtCO₂ rises at unchanged ventilation, IM contraindicated.

### 5.1 The acceptance-criteria catalogue

**Drugs**
- Identity: a drug id; a class (the library's `cls`, such as `alpha1`); or alternatives, each with its own dose
  (calcium chloride or calcium gluconate).
- Dose: exact with a tolerance; a range; per kg (the card's weight); cumulative over a window; a ceiling.
- Route: the allowed set and the preferred route (`{ set: ['iv', 'io'], preferred: 'iv' }`).
- Rate and duration: bolus, an `overS` range, or an infusion rate range (propofol 100–150 µg/kg/min).
- Timing window from an anchor: a phase entry, an event (`pulseLoss`), another action (the first dose), or a value
  crossing (`k > 5.5`); `withinS`, optional `notBeforeS`.
- Order: after or before named actions (preoxygenate before induce).
- Repeat: an interval range and a maximum count (epinephrine every 180–300 s).
- Conditional repeat: again while a rule holds (dantrolene while EtCO₂ rises at unchanged ventilation).
- Precondition: a rule that must hold for the action to be due (TXA within 3 h of the injury).
- Contraindication: an administration filter and a rule; matched, it is a violation (§7).

**Non-drug actions**

| Kind | Criteria | Examples |
|---|---|---|
| device | each setting with a range | ventilator RR 18–24, VT 6–8 mL/kg, FiO₂ 1.0, PEEP 5; shock 150–200 J; compressions 100–120/min |
| procedure | done, by when, order | intubate, cannulate, drain, rhythm check every 2 min |
| fluid | type, volume, rate | blood 1200 mL at ≥ 300 mL/min |
| physical | measure and settings | cooling, positioning |
| sample | sent, by when | an arterial gas within 10 min of the call |
| communication | instructor's press, by when | call for help, declare the diagnosis |
| decision | its engine-visible effect | stop the trigger: vaporiser 0 %, FGF ≥ 10 L/min |

A decision is graded on its effect where the engine can see it, never on a button, however the team got there.

## 6. Grading

The grading function takes the card, the phase timeline and the administration record (§8.2) and returns, per
action:

| Grade | When |
|---|---|
| met | a matching administration meets every criterion, in its window |
| deviation | a matching administration in its window, with dose, route (allowed, not preferred), rate or order off the prescription |
| overdue | the first matching administration came after the window closed |
| failed | its phase occurred and ended (or the run ended) with no matching administration, or a required repeat was missed |
| not applicable | none of its phases occurred |

Precedence: **failed > overdue > deviation > met**; a late, wrongly sized dose is "overdue" with the deviation under
it. Each unmet criterion prints as a line ("dose 1 mg/kg, 2.5 asked"). Repeats are graded each; the action takes
the worst.

An administration matches by identity (drug, class, alternative, or the device, fluid or procedure kind). One by a
route outside the allowed set does not satisfy the action, which stays open and runs on to overdue or failed. IM
dantrolene therefore leaves the dantrolene action open, the patient does not improve, and the IM dose prints as a
violation.

Live, a row reads "due m:ss", then "overdue m:ss"; met and deviation are final when given, failed when the phase
ends.

## 7. Outcomes, judged objectives, violations

**Outcomes** are the physiology's answer, not the team's act: "EtCO₂ below 40 within 10 min of the first dantrolene
dose", "MAP above 65 within 5 min of ROSC" (a value rule, an anchor, `withinS`). Graded **reached / not reached**
only; an outcome never changes an action's grade.

**Judged objectives** are what only the instructor can see: recognition ("names MH from the monitor") and
communication without a prescription. They stay rows of their own, met when the instructor presses them, with the
time. Their clock starts on what the learners could see, the displayed numerics (rank 2: the capnograph's EtCO₂
past 45), never on engine truth, so no one is judged late for a change the monitor had not yet shown. One exception,
by name: a display rule may be a phase's entry (`{ "phaseEntered": "earlySigns" }`, 1 November), so a recognition
clock starts when the strip shows the phase the sign stands for (the MH card's Early signs: EtCO₂ above 45 and rising
at unchanged set ventilation, held through its 20-s hold, as the /1 card's "early signs" state is EtCO₂ above 45 for
20 s), not at a bare threshold the patient may cross for another reason (the premedicated, then induced patient's
EtCO₂ 46 before intubation). The clock's start is also when the row is offered: Instructor v2 lists a judged row from
the first second its display rule holds and keeps it until met, never before (1 November); a row with no display
rule is offered, and its clock counts, from the start.

**Violations** are administrations a contraindication matches: dantrolene IM; a calcium-channel blocker with
dantrolene (hyperkalaemia, myocardial depression); epinephrine 1 mg IV in ROSC. A violation is its own timed line,
never a grade, never blocked; where the physiology does not carry the harm, it says "not modelled".

## 8. What the runner must evaluate

### 8.1 Phases
The phase machine of §4 on rank-3 values, with the new leaves: slopes (a ring buffer per named variable),
`unchanged` on the set ventilation, `visited`, the engine signals. The phase timeline (entry, exit, the rule that
fired) is in the runner state and the run log, so a bookmark restores it and a replay reproduces it.

### 8.2 The administration record
Every clinical event, from a row, a sheet, the staged cache or the remote, normalised to one record: time, kind,
drug and class, dose as given and per kg, route, bolus or `overS` or rate, device settings, fluid type, volume and
rate, and the engine's answer. A refused dose stays in the record and is graded; "route not modelled" is a refusal
reason.

### 8.3 One grading function
A pure `grade(card, phases, record, t)` in `packages/controller/src/scenario/` returns grades, outcomes, violations
and live clocks; the panel calls it every second, the debrief once (the shared helper the IP8 gate asked for).

### 8.4 Validation
`validateScenario` learns `/2`: unique phase ids, existing `next` targets, phases, drug ids and classes; no action
leaf in a phase rule; a judged route the engine does not model is a warning the panel prints.

## 9. What the engine needs

### 9.1 Drugs and routes today
From `packages/engine-core/src/l2/pk` on 9faec4cf: 65 drug rows. Every row honours `iv`, `io` and `central`
(`IV_ROUTES`: IO and a central line run the intravenous kinetics). Salbutamol alone adds `neb`, on the IV curve (a
documented simplification). The route type also names `im`, `inh`, `sc` and `perineural`; no row honours them, and a
dose by one is refused with "route X is not modelled". The volatiles enter through the vaporiser event, not a route.
Four rows carry a cumulative per-kg ceiling that raises a `drugWarning` and never clamps: dantrolene 10, lidocaine
4.5, bupivacaine 2.5, ropivacaine 3 mg/kg.

| Family | Ids (iv, io, central) |
|---|---|
| Hypnotics, opioids | propofol, ketamine, etomidate, thiopental, midazolam, dexmedetomidine, fentanyl, remifentanil, sufentanil, morphine |
| Volatiles (vaporiser) | sevoflurane, isoflurane, desflurane, n2o |
| Neuromuscular, reversal | rocuronium, vecuronium, cisatracurium, atracurium, mivacurium, succinylcholine, sugammadex, neostigmine, glycopyrrolate |
| Cardiovascular | atropine, phenylephrine, ephedrine, norepinephrine, epinephrine, vasopressin, dobutamine, milrinone, dopamine, nitroglycerin, nitroprusside, hydralazine, esmolol, labetalol, metoprolol, glucagon, amiodarone, procainamide, verapamil, adenosine |
| Other | calciumChloride, calciumGluconate, potassiumChloride, sodiumBicarbonate, insulinDextrose, magnesium, salbutamol (+ neb), insulin, dextrose, dantrolene, furosemide, mannitol, hypertonicSaline, naloxone, flumazenil, lidocaine, bupivacaine, ropivacaine, lipidEmulsion, tranexamicAcid, ondansetron, dexamethasone |

Side finding: the controller's `ClinicalEvent` route union (`iv | io | im | inh`) is narrower than the engine's
`PkRoute`; `/2` should take the engine's.

### 9.2 Route models
One mechanism, not a rule per drug: an absorption depot per route (bioavailability, first-order absorption rate,
lag, each from a source) feeding the existing central compartment, plus an optional local effect per drug and route
(an output event). For the two demo cards:
- **Dantrolene IM**: no systemic effect, and a local tissue-injury event. The monitor shows nothing; that is the
  lesson.
- **Epinephrine IM** (for the cards that need it): the depot with its measured absorption (thigh IM peaks at about
  8 min, Simons 2001). Epinephrine by the tracheal tube stays "route not modelled".

### 9.3 Signals the runner reads
The `state` event carries the StateVars only. The phase rules also need, as truth: MH activity and the dantrolene
effect (already computed: `mhActivity`, `bus.metabolic.dantroleneE`), pH and lactate, the set minute ventilation, the
rhythm group, and the pulse-loss and ROSC signals the debrief already reads. Exposure, not new physiology.

## 10. What Instructor v2 reads differently

The concept stays: STATE and ACTION, one list, A rows, judged rows, sheets, marks, paused.
- **Strip**: phases. Every future phase is "auto"; entry times come from the phase timeline. A past-phase click
  restores its mark. A future-phase click cannot jump, since the panel never moves the case (Q5).
- **Cue box**: always "entered by its own rule: …"; the Say line is the phase's `notes`.
- **ACTION**: the open actions (the current phase's, and earlier ones still due). Each row carries both halves: the
  prescription as title and subtitle ("Dantrolene 2.5 mg/kg IV · within 5 min of early signs · again every 5–10 min
  to 10 mg/kg") and the grade at the right ("due 3:12", "overdue 0:40", "met 08:16", "deviation: route", "failed").
- **A press** gives the prescription as written (preferred route, the dose for the weight) as a clinical event; it
  triggers no transition. Anything else is given from a sheet and graded. The interim two-button rule of #175
  (`pinnedGiveRule`) goes.
- **A rows**: the rules leading out of the current phase, with today's bar. **Outcome rows** (new) look the same,
  not pressable, "reached hh:mm" or "not reached".
- **Row states**: deviation (the met look with an amber label naming the criterion) and not applicable (grey, in
  Finished) are added.
- **Violations**: a red line in the Log sheet and in Finished; no toast, no block.
- **Debrief**: the steps table becomes the action table (grade, criteria lines, times), plus outcomes and
  violations (Q10).

## 11. Migration of the two demo cards

Both are rewritten after the demo and re-measured, with their run-sheet rows and showcase tests. The courses will
move a little: the MH starts from susceptibility, and nothing happens at an instant because a button was pressed.

**MH** (`showcase-mh.json`: 19 states → 9 phases)

| Today | In `/2` |
|---|---|
| awake | phase baseline |
| premedicated, preoxygenated, induced, intubated, surgery | actions in baseline (preoxygenate before induce) |
| earlySigns, established, recovering | phases |
| triggerOff | decision "stop the trigger"; device "hyperventilate 20 × 600, FiO₂ 1.0"; drug "propofol 100–150 µg/kg/min" |
| treating and its five hops | actions dantrolene, cooling, potassium, bicarbonate |
| dantroleneAgain | dantrolene's conditional repeat |
| normoventilated | device "back to 12 × 500", after the outcome "EtCO₂ below 40 for 2 min" |
| arrest, cpr | phase arrest; actions CPR, defibrillation |
| (none) | phases latent, treated, recrudescence, ROSC |

Objectives 1–6 become: judged recognition; stop the trigger (120 s from early signs); dantrolene (300 s from the
trigger action); its conditional repeat; calcium and insulin with dextrose (300 s from `k > 5.5`); the ventilation
action with its outcome.

**Haemorrhage** (`showcase-haemorrhage.json`: 19 states → 7 phases)

| Today | In `/2` |
|---|---|
| bleeding, bleedingO2, ventilated | phase bleeding; actions oxygen, intubate and ventilate |
| junctional | phase decompensating; the rhythm is `script` |
| pea, asystole | phases arrest PEA, arrest asystole |
| cpr, cprRunning, the epinephrine hops | actions CPR (100–120/min, within 30 s of `pulseLoss`), bag 10/min, epinephrine 1 mg IV/IO every 3–5 min |
| cprVolume | actions source control, massive transfusion, TXA 1 g IV |
| vf, vf2, postShock1/2 and their running states | phase arrest VF; the VFs are `script`; actions rhythm check every 2 min, shock 150–200 J |
| rosc | phase ROSC; action "stop CPR" |

Objectives 1–3 become: judged recognition of PEA (on the displayed ART); the CPR action; judged recognition of ROSC
with "stop CPR". Violation: epinephrine 1 mg IV in ROSC.

## 12. Open questions

1. The qualitative limits: "high activity", "activity low", "dantrolene effect present", the windows for "rising"
   and "falling", the tolerance for "unchanged ventilation" (proposals in §4.1).
2. A route outside the allowed set: here the action stays open and the dose is a violation if contraindicated.
   The alternative is "deviation".
3. "Declare the diagnosis": a communication action or a judged row? The rulings name it in both. Proposed: timed
   acts are actions, qualitative judgements judged rows.
4. May a `/2` card still impose a rhythm (`script`), as the haemorrhage card does three times? Proposed yes,
   labelled card-set, never graded.
5. The strip's future-phase click: removed, or "fast forward until <phase>" at top speed?
6. Phase overlap: one at a time by priority?
7. IM dantrolene's local harm: a log and debrief line only, or an injury the physiology carries (CK, potassium)?
8. The rulings log does not record the owner's epinephrine example; §1 uses IV in arrest against IM in
   anaphylaxis. Is that his?
9. The haemorrhage demo withholds CPR on purpose; under `/2` the CPR action grades "failed". Accept, or add a
   "demonstration run" flag that prints grades as such?
10. The debrief export: `pme-debrief/3`, or `/2` with keys appended as IP8 did?
11. "Failed" when a phase never ends (established for 100 min untreated): at the window's end plus a grace, or only
    at the phase's end?
12. Setup actions (premedicate, induce): graded or not?

## 13. Effort

One executor, gates included; estimates, not measured.

| Part | Hours |
|---|---|
| Schema, types, `validateScenario` for `/2` (`/1` still loads) | 8 |
| Phase machine: new leaves, timeline in the runner state, bookmarks, replay | 10 |
| Administration record and the grading function, with tests | 14 |
| Engine signal exposure (§9.3) | 3 |
| Route models: the depot, dantrolene IM, epinephrine IM, evidence rows | 14 |
| Instructor v2 changes (§10) | 10 |
| Debrief: action table, outcomes, violations, export | 8 |
| MH card: migration, re-measure, run sheet, tests | 7 |
| Haemorrhage card: the same | 6 |
| Authoring guide for `/2` with a validated example | 4 |
| **Total** | **84** |

Order: schema, phase machine and grading first; route models in parallel; then Instructor v2 and the debrief; the
cards last, after the answers to §12.
