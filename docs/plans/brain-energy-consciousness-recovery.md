# The brain without blood flow, and its recovery: one brain energy state, read by the EEG, consciousness and breathing — Plan

**STATUS: BEING BUILT; THIRD REVISION FOR REVIEW.** The flow rise with anaemia is re-planned to land whole: what it is
made of by mechanism and source (§2.2), the shared vasodilator reserve it spends (B2v), who reads flow and who reads
delivery (§1.4, B5c), the start of a run (B2d), the set of pieces that lands together and its order (§6), and what
each cell is expected to do (§6.3). Every earlier design question is decided (§9.1); three questions are open (§9.2).
The parameters were checked against the published measurements in `research/81-evidence-brain-under-arrest-and-cpr.md`,
`research/85-evidence-temperature-and-recovery-after-return-of-circulation.md` and
`research/89-full-text-check-of-abstract-only-brain-numbers.md` and, for the anaemic flow rise and the reserve,
`research/90-full-text-check-of-the-anaemia-flow-and-reserve-numbers.md`, with the full-text readings of its four human
studies (`research/90a-full-text-reading-of-the-human-brain-flow-studies.md`) and its four laboratory studies
(`research/90b-full-text-reading-of-the-laboratory-brain-flow-studies.md`), which win where they differ from note 90
(§5.1 gives the outcome number by number). No product code, test, constant, card or other plan was changed while
writing it.

**Base.** `origin/main` **7320de53**. On main: B1 (the cortex's energy entry, pull request 491) and B5 (the breathing
gate's state in the brainstem entry, pull request 504). In review: B2a (the flow rise with anaemia, pull request 512,
head b72d7b1b), whose rework and merge §6 sets out. Open and in conflict with main: pull request 188, a shared cerebral
vasodilator reserve, whose mechanism B2v rebuilds. Every `file:line` is a starting point only; an executor finds the
code by the function name.

**Plain words.**
- **Delivery:** cerebral O2 delivery relative to normal, CBF/CBF0 × CaO2 ÷ the reference CaO2 (today's `brainDo2Rel`).
- **Function** (`fn`, 0–1): how much of a compartment's synaptic, electrical work its energy supply carries now. 1 is
  normal; 0 is electrical silence with the membranes still kept.
- **Store:** the O2 the brain holds in its own blood and tissue, which carries function for some seconds after the
  flow stops.
- **Debt:** the ischaemic dose a compartment has taken; it holds function down after the flow returns until it is
  repaid.
- **Compartment:** cortex or brainstem, each with its own entry in the one state, the same equations and its own
  sourced numbers.
- **Reader:** a model that reads the state (the EEG cortex, consciousness, the breathing gate) or a monitor reader that
  computes from the EEG trace (`l3/eeg-devices/`).
- **No-flow time:** the time from the loss of the circulation to the start of compressions or its return.
- **Marks:** [FT] read in full text; [ABS] read as an abstract only; [FT-part] full text read in part (named); [SEC]
  known only through another paper's summary of it; [P] placeholder with its reason; [INF] the plan's inference from a
  source, stated as such; WANTED: not read, with what it would settle. **"Mine"** marks the plan's own reasoning, never
  a source's statement.

---

## 0. The defect, and what this plan settles

A measurement of the witnessed-VF card (headless, both modes, one row a second; `research/76-arrest-and-the-brain-measurement.md`)
established:
1. **The cortex's EEG fails on time but the monitor stays awake.** CO 0 at +4 s, CBF 0.25 at +12 s, delivery below
   12/50 at +14 s: `eeg.cortex.metabolic` = `suppress` = 1 from +14 s and the brain signal is 1.5 µV. But the frontalis
   EMG (6.7 µV RMS) and blinks (17/min) are gated on the cortex's `lor`, which is drug-made unresponsiveness only, so
   every reader computes an awake signal: BIS-type 97.7, SR 0, SEF 25 Hz, SE 45–65 for ten minutes.
2. **Nothing makes the patient unconscious.** `l2/neuro/depth.ts` `hypnotic` and `flags.conscious` have no term for
   cerebral perfusion; `conscious` stays true through ten minutes of no flow.
3. **Recovery has no memory.** After two minutes of VF and a shock, the cortex is normal 9–10 s after the circulation
   returns (`cortexStep` is a pure function of delivery now). The breathing gate reopens over a fixed 120 s whatever the
   arrest's length (`GATE_REOPEN_S`).
4. **Under CPR** (CBF 0.30–0.40) the EEG cortex becomes fully normal once delivery passes 0.40, after ≈ 4 min. The
   measurements contradict this (§2.1 A8): in people the EEG under ordinary CPR is mostly suppressed.

The plan settles: the structure (§1), what the brain shows as flow falls and returns (§2), where the state meets the
body (§3), MANUAL and MODELED (§4), the sources and what they did to each number (§5), the pieces and what the built
ones found (§6), what is outside (§7), the self-review (§8) and the record of decisions (§9).

---

## 1. The structure

### 1.1 The choice: one brain energy state in the organ model, two compartments

**`BrainEnergy`, new file `packages/engine-core/src/l2/brain/energy.ts`, a field of `BrainState`
(`l2/brain/model.ts`), stepped inside `stepBrain` on the brain's 10 Hz grid.** It holds one entry per compartment,
`cortex` and `brainstem`, each `{ store, fn, debt }` once built. It publishes, on the organ view, per compartment:
`delivery`, `fn`, `debt` and, for the cortex, `metabolic` (= the EEG's present definition, §1.3). The cortex entry
arrived in B1 (on main). The brainstem entry arrives in B5 (in review) as a relocation of the breathing gate's present
state (`BrainstemEntry { anoxS?, gate? }`, a type of its own, not yet an `EnergyEntry`); B5b steps it on the organ
model's own clock in both modes; B5c makes it read delivery, as the cortex does, and makes the vasomotor centre's
perfusion gate read the same entry; it takes its re-sourced time course in B7a, and becomes `{ store, fn, debt }` on
the shared equations only in B7b, which is blocked on a source (§6).

Why here:
- **Flow and O2 delivery already live here.** `stepBrain` already computes the delivery/demand ratio for PbtO2 and
  SjvO2 (`brainOxygen`), and the organ model has every input: CBF after autoregulation, CO2 and O2 reactivity, Hb,
  SaO2, PaO2, temperature (`tempCmro2`) and the drugs' CMRO2 (`BrainDrugs.cmro2Mult`). Hypoxaemia, anaemia,
  hypotension, hypothermia and drug-lowered metabolism therefore reach the state through code that exists. The one
  input that exists but was not used where it should be is Hb in `targetCbf` (the flow rise with anaemia, B2a, in
  review).
- **It runs in both modes and with no device on.** The organ model is stepped in MANUAL and MODELED (the measurement
  read `organs.brain.cbfRel` in MANUAL) and is not device-gated. That meets the ruling that the brain's core model runs
  always, without a second container.
- **Physiology already reads it.** The breathing gate reads `organs.brain.cbfRel`; the circulation reads it as the
  vasomotor centre's supply. Placing function next to flow keeps one picture of the brain.

Why two compartments and not one state with a threshold per reader: the evidence discriminates.
- After abrupt arrest the EEG is isoelectric at 11 ± 2 s (de Vries 1998 [ABS]), yet swine keep a normal breathing
  pattern through the first minute of VF (61 of 61 at 10.3/min, Zuercher 2010 BMC [FT]; all 12 through minute 2,
  Menegazzi 1995 [ABS]) and gasp for minutes after. On return of circulation, spontaneous breathing comes back first,
  then the brainstem reflexes, then consciousness (Jørgensen 1997 [ABS]); in dogs after 7 min of asphyxial arrest the
  brainstem auditory potentials were normal at 1 h while the EEG spectrum had not recovered at 6 h (Cerchiari 1990
  [ABS]).
- A single state is already at zero when the cortex goes silent; no reader threshold on a state at zero can produce
  minutes of gasping after it, or a brainstem that recovers before the cortex. Two tissues with different
  vulnerability need two entries.
- The entries share every equation (no duplicated logic); only their sourced numbers differ. Territories (the
  regional-perfusion plan's V0) become further entries later, so the shape does not change when regions arrive.

### 1.2 The alternatives, weighed

- **(B) Separate local states in the EEG and in the neuro model.** Rejected: two pictures of the same brain. The EEG
  runs only while a device is on, so its state would not exist for consciousness or breathing with the device off;
  and the code standards forbid one quantity held twice.
- **(C) Consciousness alone, no recovery dynamics.** Rejected as the end state (it keeps finding 3), kept as the order
  of build: consciousness and the artefacts come before the debt (§6), so the arrest screens are right before the
  recovery curve is built.
- **A new brain-state container outside the organ model** (the EEG clinical plan's G2). Rejected for these variables:
  energy supply is organ physiology, and the organ model already owns its inputs. The EEG plan's later pieces (its
  metabolic burst-suppression piece, its injury state, its brainstem-function plan) read this state instead of holding
  their own.

### 1.3 The state and its equations

Per compartment c, at each 10 Hz step:

1. **Delivery** `D_c` = CBF_c/CBF0 × CaO2 ÷ CaO2_ref (today's `brainDo2Rel`, moved from `eeg/state.ts` to
   `l2/brain/energy.ts`; one function). Both compartments read the whole-brain CBF until regional flow exists [P:
   one global CBF in the engine; brainstem flow separately is a V0 attachment. Under CPR the brainstem's flow is
   restored more than the supratentorial flow (Shaffner 1999 [ABS]), which one global CBF cannot show]. The reference
   content on main is `caO2(14, 0.97, 95)` for every patient, so the adult man (Hb 15) rests at a delivery of about
   1.07 and a healthy woman (13.5) below 1 (mine, arithmetic). **Decided (§9.1 item 10): CaO2_ref is the content at the
   patient's own normal haemoglobin** (SaO2 0.97, PaO2 95), read from the blood model's `pat.hbRef`, so every healthy
   default patient rests at a delivery of exactly 1. Piece B2d builds it, with the t = 0 read of §2.2.
2. **Steady-state function** `fnSS_c(D)` = 1 above the compartment's abnormal level, 0 below its failure level, linear
   between. For the cortex these are today's `DO2_EEG_ABNORMAL` 20/50 and `DO2_EEG_LOST` 12/50 (Miller Ch35 p. 1122;
   Ch10 p. 211: EEG ischaemia from about 20, isoelectric at about 15, membranes kept between about 6 and 12), and
   `metabolic` = 1 − fn reproduces today's value exactly. The constants move with the function to `l2/brain/params.ts`.
   **Thresholds stay on delivery, not on delivery ÷ demand** (decision, §1.5.1). The critical flow under anaesthesia
   is now sourced per agent (halothane ≈ 20, enflurane ≈ 15, isoflurane ≈ 10 mL/100 g/min, Michenfelder 1987 [ABS];
   sevoflurane 11.5 ± 1.4, Grady 1998 [ABS]); it would be a sourced agent factor, not a ratio, in
   piece B9, which is blocked: two agents' values fall below the failure level, whose agent dependence is not sourced.
3. **Store** `S_c` (seconds of the compartment's demand, 0…S_max): while `fnSS_c` < 1 the store drains, and function
   is carried at `max(fnSS, store share)`; while delivery is above the abnormal level the store refills. `S_max` is
   **derived, not fitted**: the extractable O2 in the brain's own blood volume, CBV0_ML × CaO2_ref × (OER_MAX − OER0),
   ÷ the resting whole-brain O2 use CMRO2_0 × BRAIN_G / 100, all existing constants in `l2/brain/params.ts`
   (60 mL × 0.185 mL/mL × 0.42 ≈ 4.7 mL O2 ÷ 46 mL/min ≈ 6 s) [INF: the derivation; the tissue's dissolved O2 and the
   phosphocreatine buffer are not in it, WANTED]. Its validation is end to end (§2.1, cell A1): VF onset → isoelectric
   at 11 ± 2 s. **This cell is red on main today**: with no store the engine reaches isoelectric at +14 s, and a store
   on top can only make it later. The miss is upstream, in the circulation's decay of flow after arrest: de Vries
   records MAP below 30 and middle-cerebral flow velocity 0 at once, where the engine has MAP 54 at +4 s and CBF 0.25 at
   +12 s. That is outside this plan (§7). **The store is never sized to meet the cell.** The store is therefore also
   tested on its own (unit cell, B6a): a step of cortex delivery from 1 to 0 → isoelectric at 11 ± 2 s (de Vries's
   condition, flow velocity 0 at once). If the derived 6 s misses it, the miss is reported with the derivation, not
   tuned.
4. **Demand** `M_c` = `b.cmro2Rel` (drug × temperature, unchanged) × (1 − F_eff × (1 − fn)), with
   F_eff = max(0, F − (1 − cmro2Mult)): the share of demand that electrical silence removes, less what the drugs have
   already removed, so a drug-silenced brain is not reduced twice. **F is one value, shared with the one the engine
   already uses**: `neuroOutputs` puts a burst-suppressed brain's CMRO2 at 0.45 (the engine's tables: −50–60 % at burst
   suppression), so F = 0.55 is moved into one named constant read by both. Hofmeijer 2012 [ABS] (≈ 30 % of the energy
   to synaptic transmission) is consistent in direction but is a different quantity (synaptic only), so it does not set
   F. **[P]: F's value rests on the tables' row, whose primary source is not read here (WANTED: the CMRO2 at an
   isoelectric EEG).** A silent brain therefore drains its store and accrues debt more slowly; a cold brain more slowly
   still.
5. **Debt** `Q_c` (dimensionless, ischaemic dose in "seconds of full demand unmet"): accrues at `M_c` × (1 − fn) while
   the store is empty; is 0 exactly in any patient whose delivery never fell below the abnormal level. It accrues
   during partial flow too (CPR at delivery between the failure and abnormal levels), more slowly than at no flow.
6. **Recovery:** after delivery returns above the abnormal level, function is capped at `fnCap(Q_c)`, and Q_c is repaid
   at a rate that rises with delivery. `fnCap` and the repayment rate are **data, not formula constants**: a table of
   recovery milestones against debt (the time to EEG return after seconds; the time to the first burst and to a
   continuous background after minutes), each row carrying its source or the field `placeholder: true` with its reason
   (the decision, §9.1 item 2). The sourced points and the placeholder rows are §2.3. **There is no temperature term on
   the speed of recovery** (decision, §9.1 item 5): neither `fnCap` nor the repayment rate reads temperature.
   Temperature acts on the brain through three separate mechanisms, each sourced and each in the engine or planned:
   less O2 use during low flow (demand, item 4, through `tempCmro2`), the direct slowing of the EEG with cooling
   (`cortexStep`'s `cold` term), and slower drug clearance (the drug layer), through which a cooled, sedated patient
   wakes later. The recovery table therefore has no temperature dimension.
7. **Lasting injury** (the patient who does not wake) is the EEG plan's injury state, which reads this state's debt
   (the decision, §9.1 item 3; §7). This plan publishes the debt and does not model the injury. **The injury state
   carries two marked placeholders** (decision, §9.1 item 5), each `placeholder: true` with its reason: protection by
   cooling begun at once after the return of circulation (real in animals when immediate and lost with a 15-min delay,
   Kuboyama 1993 [ABS], Leonov 1990 [ABS], Abella 2004 [ABS]; not sized per degree and not seen at 33 against 36 °C in
   people, TTM 2013 [ABS], TTM2 2021 [ABS]), and harm from fever after return (odds of an unfavourable recovery 2.26
   per °C above 37 °C, Zeiner 2001 [ABS], observational; histological injury worse with fever induced at 24 h in rats,
   Hickey 2003 [ABS]). Neither is built in this plan's pieces; the EEG plan's injury piece builds both.

Non-ischaemic patients: store clamped full and debt exactly 0 whenever delivery has never been below the abnormal
level, so `fn` = 1 and `metabolic` = 0 bit for bit; nothing new moves (the regression rows are the test, §6).

### 1.4 The readers, and what happens to the present values

| Reader | Reads | Present value, and what it becomes |
|---|---|---|
| EEG cortex (`l2/eeg/state.ts` `cortexStep`) | cortex `metabolic` | `metabolic` is no longer computed inside `cortexStep` from `do2Rel`; the cortex takes it from the organ view through `CortexInputs`. **The holdable input stays in `CortexInputs`** (a field `metabolic`, with `do2Rel` kept only as the pattern table's way to state it), so the MANUAL-depth plan's `ischaemic-slowing` and `ischaemic-loss` patterns still hold a value in the vector and `cortexStep`'s derivation of `metSupp` and `suppress` is unchanged. |
| Consciousness (`l2/neuro/depth.ts`) | cortex `fn`, through `NeuroEnv` (as `neuroglycopenia` arrives) | A new ischaemic term `isch` in the consciousness level `hypnotic`, **ruled**: consciousness is lost inside the EEG's slowing phase, at about a third of normal delivery (§9.1 item 4). The level is stated on delivery, as the ruling and the sources state it: a new named constant **`DO2_LOC` = 1/3** (the ruling; sources: syncope at MCA velocity 68 % below the pre-tilt value, Njemanze 1991 [ABS]; electrical failure at ≈ 15 mL/100 g/min, "approximately 35 % of control", Astrup 1977 [ABS]; loss of consciousness in the first slow phase, van Dijk 2014 [ABS]). The term reads the cortex's **function**, not delivery: `isch` = clamp01((1 − fn) ÷ (1 − fnSS(DO2_LOC))) in hypnotic units (fnSS(1/3) ≈ 0.58, so `isch` = 1 at fn ≈ 0.58). With fn = fnSS(D) (B2) it is 0 at the slowing onset and 1 at D = 1/3; once the store (B6a) and the debt (B6b) exist, it follows them, so a patient whose circulation has returned but whose cortex is held down by its debt stays unconscious, and the store delays the loss after an abrupt arrest. A term on delivery would wake the patient the moment the circulation returned (defect 1 again). It adds to the drugs' level as `GLYCO_U` adds neuroglycopenia. It no longer rests on the EEG's fitted `METABOLIC_SLOW_SHARE`, which stays the EEG's own. **Condition of the ruling:** it is true to physiology only with the flow rise with anaemia (B2a), so B2 does not merge before B2a (§2.2). |
| The present index (`di`, `sr`, BFA sensor only) | the same term, and the cortex's metabolic suppression | Adding the term to the index's `u` cannot show a flat brain: at fn = 0 the formula gives an index ≈ 25 and SR ≈ 20. So the displayed SR is `max(drug SR, 100 × metSupp)` (the cortex's ischaemic suppressed-time fraction, the quantity SR is defined to measure), and the displayed index is the lower of the drug index and the index the formula's own SR relation gives at that SR (`base = 30 − 25 × SR/100`, so SR 100 → 5) [ENG: the present formula's own SR–index relation inverted; no new number]. A separate output beside `diRaw`. **`diRaw` itself, which feeds `neuroOutputs` (`cmro2Mult`, the MAP set-shift) and the drive's sedation term, stays drug-only and unchanged**: the depth plan's ruling keeps the index → physiology coupling exactly as it is until its own piece moves it, and ischaemic demand reduction is the energy state's own functional share (§1.3.4), never counted again through `cmro2Mult`. |
| EEG artefacts (`l2/eeg/artefacts.ts` `emgLevel`, blinks) | the neuro model's consciousness ramp (`loc`) beside the cortex's `lor` | Frontalis tone and blinks follow consciousness: `w = 1 − clamp01(lor + isch)`, the same additive rule the neuro model uses for `hypnotic`, with `isch` the same ischaemic term (one function in `energy.ts`, two readers). The arousal term (`EMG_AROUSAL`) and the tube term are gated by the same `w`. Blinks need consciousness and the brainstem (Magliacano 2021 [ABS]; van Dijk 2014 [ABS]). The compression artefact (B3b) is added on the same path. The readers then compute index and SR from the signal; nothing is set. |
| Breathing gate (`l2/neuro/spont.ts` `stepBrainstem`) | brainstem entry | First re-expressed with identical output (B5, in review): the no-flow timer `anoxS` and the reopening ramp `gate` move into `organs.brain.energy.brainstem`; **the gate's constants stay in `spont.ts` with their values** (`BRAINSTEM_CBF_MIN`, `GASP_*`, `GATE_REOPEN_S`). Then stepped on the organ model's clock in both modes (B5b) and read on delivery (B5c, the threshold's value unchanged). Then **re-sourced in B7a (decided, §9.1 item 1)**: breathing continues through about the first minute, gasps follow over the next minutes in a patient who gasps (by chance, or as the instructor sets), then apnoea; the gasp pattern under compressions; the earlier rule (small gasps from 30 s, apnoea by 2 min, `GASP_*`) and the pulseless withdrawal over `NO_FLOW_S` are retired in that piece. The perfusion threshold and the reopening become the brainstem compartment's parameters (data in `l2/brain/params.ts`, beside the cortex's) only in B7b, when the entry becomes an `EnergyEntry` on the shared equations; B7b is blocked on a tolerance source. |
| Vasomotor centre's perfusion gate (`l2/circ/baroreflex.ts` `brainstemOutF`) | today flow (`cbfRel`); from B5c the brainstem entry's delivery | On main it reads `organs.brain.cbfRel` (0 at `CBF_REFLEX_ZERO` 0.2, 1 at `CBF_REFLEX_FULL` 0.6), and three readers multiply by it: the baroreflex's sympathetic output (`circ/model.ts`, `brainF`), the endocrine sympathetic drive (`endo/adapters.ts`, × the drugs' `symp`) and the thermoregulatory efferents (`resp/pipeline.ts` → `stepTemp`'s `brainF`, sweating and shivering). Read on flow, a rise of flow that only compensates a fall of O2 content (anaemia, B2a) is read as plenty. B5c makes it read the brainstem entry's delivery, with the two thresholds' values unchanged. |

Consumers of consciousness, and which get the ischaemic term:
- `flags.conscious`, the `lossOfConsciousness`/`emergence` marks, `aware` (conscious and paralysed): yes.
- `neuroResp`'s `loc` (`l2/neuro/drive.ts`, from `hypnotic`): yes. It removes the wakefulness drive and lowers
  upper-airway tone, which are real consequences of unconsciousness. In an arrest the brainstem gate dominates; in a
  partial-flow state (shock, CPR) this is what makes an unconscious hypoperfused patient breathe like one.
- the ventilator "buck" condition (`l2/resp/pipeline.ts`, `n.loc < 0.5`): yes, through `loc`.
- `diRaw` → `cmro2Mult`, `mapSetShiftMmHg`, the drive's sedation term `(60 − di)/20`, `awarenessRisk`: **no** (above).
- The anaesthesia event's `conscious` and the displayed `di`/`sr`: yes.
- `movement` (a stimulus with `hypEq` < 1 and T1 > 0.25): it reads the drug-only `hypEq`, so a laryngoscopy during CPR
  would make a flat-brained patient move. **Yes**: movement also needs cortex `fn` above the failure level, and later
  the brainstem's (spinal reflex movement in brain death is outside this plan). Body movement is the commonest sign of
  the rare consciousness under CPR (87.5 % of 112 cases, Olaussen 2017 [ABS]), which this gate allows when the cortex
  function returns.
- The arousal EMG (`EMG_AROUSAL`) and the present index's EMG rise (`EMG_RISE` × stimulus × T1): **yes**, gated as the
  awake tone is.
- `stress` (the sympathetic response to a stimulus, read by the endocrine model): **not yet**; it belongs to the
  brainstem's function and is gated in B7b. Until then a stimulus during an arrest still raises it (stated gap).

Order inside a pass: the neuro model steps before the organs (`engine.ts`: neuro, resp, organs, haemodynamics, EEG).
Consciousness and the breathing gate therefore read the brain state one pass late (one 10 Hz brain step or less), as
the breathing gate reads CBF today. The EEG steps after the organs and reads the same pass's state.

### 1.5 Decisions taken (engineering), with their reasons

1. **Thresholds on delivery, not on delivery ÷ demand.** The sourced thresholds are CBF values measured in
   anaesthetised patients (Miller Ch35 p. 1122, carotid surgery); a ratio would move them for every anaesthetised or
   cold patient without a source. The agent dependence is now sourced (Michenfelder 1987, Messick 1987, Grady 1998, all
   [ABS]; §2.2), and it is carried as the sources state it: a critical flow per agent (B9, blocked on the failure
   level's source), not a demand ratio. Mine: the order of the sourced values (isoflurane lowest,
   halothane highest) runs with the agents' CMRO2 reduction, but no source read derives the thresholds from demand, so
   a ratio would be an inference the plan does not make.
2. **The functional share does not reach flow–metabolism coupling.** `targetCbf` keeps `cmro2Rel` (drug × temperature)
   exactly. A silent brain lowering its own target flow, which lowers delivery, which keeps it silent, is a latch; its
   real counterpart, post-ischaemic hypoperfusion and the falling reflow under CPR after a long no-flow time, is a
   named attachment (§7). The flow rise with anaemia (B2a) is a different input (the blood's O2 capacity, not the
   brain's function) and makes no latch. Test, with the points chosen by delivery (hypoxaemia at PaO2 35 at normal
   pressure keeps delivery near or above 1 through `o2Factor` while the request fits B2v's reserve, so it would test
   nothing; with the passive-line ceiling (§9.2 item 1), the hypoxic rise is capped from PaO2 ≈ 48 at CPP 80
   and delivery at PaO2 35 then falls below 1): MAP lowered until cortex delivery is 0.30 for 60 s and
   restored; Hb lowered until delivery is 0.35 and restored (after B2a this needs a lower Hb, which the test computes
   from the B2a factor, not a literal); PaO2 lowered until delivery is 0.35 and restored. Each time function returns
   to 1 and debt to 0 (no latch).
3. **One function, two readers for the ischaemic unresponsiveness** (neuro's `hypnotic` and the EEG artefacts' gate).
   The drug side is already held twice today (neuro's `hypnotic` and the cortex's `lor`, both from LOC C50s); this plan
   does not widen that.
4. **The pulseless withdrawal stays until B7a**, which retires it by the ruling (§9.1 item 1). No piece before B7a
   changes MODELED arrest breathing except through `loc` (B2), which is reported.
5. **The flow rise with anaemia reads Hb, not CaO2.** Hypoxaemia already raises flow through `o2Factor` (PaO2); a CaO2
   term would count the hypoxaemic fall of content a second time. B2a's factor is computed from the blood's O2 capacity
   at the reference saturation, through the fall 1 − Hb ÷ Hb_normal (the working size and form of §2.2), so no
   hypoxaemia row moves. **The factor's reference is the
   patient's own normal haemoglobin** (decision, §9.1 items 6 and 11): the blood model's band and sex normal, 15 for the
   adult man and each other default band its own, so every default patient's factor is exactly 1 at rest. Every
   candidate size and form (§9.2 item 3) is written relative to the patient's own normal, so this decision holds
   whichever is chosen. With B2d the delivery reference is the same patient's normal, so factor and
   delivery are measured from one normal. The factor is one regulated dilation spent from the shared dilator reserve;
   no content/viscosity split is built (§2.2, B2v, B2a). Whether factor and hypoxic term should be one content
   term (Brown 1985 [FT] names O2 content the major determinant, Table 2 p. 87; Todd 1994 [FT] finds a larger rise for
   the same content fall in hypoxaemia than in haemodilution, Table 1 p. H2027, so they are not one term) stays a later
   question, not built (mine).
6. **The brainstem reads delivery, as the cortex does** (B5c). The brainstem tissue's supply is O2 delivery; a flow that
   rises only to keep O2 transport within limits (Brown 1985 [FT], pp. 85–86) is not extra supply. The same reasoning as item 1
   keeps the thresholds on delivery, not on delivery ÷ demand. **A stated limit (mine):** delivery falls with the
   coupled flow fall under general anaesthesia (the coupling lowers flow with demand), so on delivery as on flow the
   vasomotor gate reads an anaesthetised patient at CBF below 0.6 as partly ischaemic (B2a's finding: the anaesthetic
   runs of `eeg-baseline.json` move through this chain). With the delivery reference at the patient's own normal (B2d)
   the default patient reads delivery equal to flow at his normal content, so B5c moves him only where his content or
   saturation departs from the reference. Its 0.6 lies above the cortex's own abnormal level 0.40, so on
   main the vasomotor centre starts to fail at a higher delivery than the cortex's EEG, against the sourced order
   (the brainstem outlasts the cortex, §2.1 A6, R2). The thresholds are [P] (Astrup 1981, cited beside the constant)
   and are not moved here; the brainstem's own thresholds wait for B7b's tolerance source.

---

## 2. What the brain shows as flow falls and returns

Each row: mechanism, source, time course, the cell it becomes. Every reader computes from the signal; nothing is set.

### 2.1 Abrupt no flow (VF, asystole), normothermic

| # | What | Mechanism in this plan | Source | Time course / cell |
|---|---|---|---|---|
| A1 | EEG slowing, then isoelectric | cortex store drains, `fn` falls through the slow share then to 0 | Clute 1990 [ABS]: change in 82 of 93 ICD-test arrests, "an average of 10.2 s after the last normal heart beat", mostly slowing and attenuation; de Vries 1998 [ABS]: isoelectric at 11 ± 2 s; de Vries 1997 [ABS]: EEG changed at 12 ± 4 s; Pana 2016 [ABS], review of 39 studies: EEG lost < 30 s | cell: raw EEG < 5 µV (cortex part) by VF + 9…13 s end to end; must-hold < 30 s. Red on main through the circulation's decay (§1.3.3) |
| A2 | Loss of consciousness | `isch` reaches 1 at fn = fnSS(1/3), inside the slowing | Wieling 2009 [ABS] (review): "as little as approximately 7 s" in sudden complete circulatory arrest; Sauvageau 2010 [ABS] (8 filmed hangings): "at 8-18 sec"; van Dijk 2014 [ABS]: in the first slow phase; Aminoff 1988 [ABS] (22 ICD-test VT/VF of 15–126 s, awake): definite LOC in 15, probable in 2, and in 5 episodes no EEG change before LOC; Pana 2016 [ABS]: within 30 s | cell: `flags.conscious` false within 7–18 s of VF onset (target, Wieling and Sauvageau; Sauvageau's hangings are an asphyxial and venous-obstruction condition, not an abrupt arrest), must-hold ≤ 30 s. **Stated limit (mine):** a threshold inside the slow phase cannot reproduce Aminoff's 5 episodes with LOC before any scalp EEG change; the scalp EEG is not the whole cortex's function, and the plan has one cortex entry |
| A3 | Frontalis tone, blinks, movement, response to command gone | artefacts and movement follow consciousness | Miller Ch36 p. 1142 (frontalis EMG falls with loss of consciousness, the engine's own source for `EMG_AWAKE`); Magliacano 2021 [ABS]; van Dijk 2014 [ABS] | EMG and blinks 0 once unconscious; movement follows the existing `movement` rule only while conscious |
| A4 | Processed index and SR | computed by each reader from the now near-flat signal | Kurita 2012 [ABS] (15 swine, isoflurane): BIS fell suddenly at MAP 22 ± 3 and was isoelectric before resuscitation; Aprea 2014 [ABS] (one calf): BIS 0, SR 100 in asystole | cell: BIS-type SR > 80 and index < 20 by VF + 90 s. The reader's burst-suppression rate runs over the previous 63 s (`bis-type.ts` `bsrWindowS`), so with the cortex isoelectric from about +14 s the window is full of silence only after about +77 s. Direction from Kurita/Aprea; the exact numbers [P]. Only without compressions: under CPR the compression artefact corrupts the BSR and the index (B3b, A10) |
| A5 | Myoclonus / tonic activity at onset | **attachment, not built here** (§7) | Lempert 1994 [ABS]: myoclonus in 38 of 42 complete syncopes (90 %), LOC lasting 12.1 ± 4.4 s; Aminoff 1988 [ABS]: tonic activity or twitching in 10 of 22 ICD-test episodes; van Dijk 2014 [ABS]: type A signs, including general stiffening, develop in the first slow phase | named; the slow-phase window is the state's (fn between slow and flat) |
| A6 | Breathing: continued, then gasps, then apnoea | brainstem entry, re-sourced time course (B7a) | **Continued breathing:** Zuercher 2010 BMC [FT] (61 swine, isoflurane 1.5–3 %), Table 2: minute 1, 61/61 at 10.3 (4.4)/min; Menegazzi 1995 [ABS] (12 swine, α-chloralose): agonal respirations in all through the first 2 min. **Gasps:** Zuercher Table 2: minute 2, 33/61 (54 %) at 1.4/min; 3, 50/61 (82 %) at 2.6; 4, 30/46 (65 %) at 1.8; 5, 7/31 (23 %) at 0.7 (the falling N is the animals assigned to longer VF); Tongying 2015 [ABS] (10 swine, anaesthetic not in the abstract): first gasp at 2.02 ± 0.84 min, last at 5.21 ± 1.12 min, 3.7 ± 1.6/min at minute 4; Srinivasan 2006 [ABS] (13 pigs, propofol): gasping in 13/13, crescendo-decrescendo, maximal gasp at 202 ± 34 s; Ristagno 2007 [ABS]: gasps increased in frequency over the first 4 min. **Rate and size by anaesthetic:** isoflurane (Zuercher): the per-minute means above, all under 3/min; IV anaesthesia (Lin 2023 [ABS], agent not in the abstract): 2–5/min, VT 0.62 ± 0.19 L, minute volume 2.51 L/min; α-chloralose (Menegazzi): 6–11/min, VT 502–852 mL; intubated humans during CPR (Wolfskeil 2017 [ABS], 292 OHCA): gasping in 26 %, median 274 mL (196–434) at 3.7/min (1.5–7.3). **Apnoea:** Zuercher: 0 of 16 at minute 6; Menegazzi: 2 of 12 (17 %) at minute 7; Tongying: none at minute 7, one animal at minute 8. **Incidence in people:** Clark 1992 [ABS]: 40 % of 445 OHCA, 46 % in cardiac vs 32 % in other causes; Eisenberg 2006 [ABS]: 55 % of witnessed arrests; Bobrow 2008 [ABS]: 33 % when the arrest followed EMS arrival | cells (B7a), in a patient set to gasp: breathing at near its pre-arrest rate through minute 1; gasps from the second minute, with the human rate and size (Wolfskeil) [P], the swine ranges by anaesthetic as context; apnoea by minute 6–7, none after minute 8. In a patient set not to gasp: breathing through minute 1, then apnoea. **Whether a patient gasps is drawn by chance, as in people** (decision, §9.1 item 9): 46 % after an arrest of cardiac cause, 32 % after other causes (Clark 1992 [ABS], the one source that separates the cause), unless the instructor or the scenario sets it (B7a). Every swine gasped, so the swine set the course, not the incidence. The rule on main (gasps from 30 s, VT ≤ 0.3 × rest, apnoea by 2 min, withdrawal to 0 over 60 s) is retired. The awake patient's course is not measured (no study in awake animals): [P], §6 B7a |
| A7 | Pupils and brainstem reflexes | **not shown**: `neuroOutputs.pupilMm` is published only, read by nothing on the monitor | Jørgensen 1997 [ABS] (order of recovery); Bircher 1980 [ABS]: pupillary constriction returned with the EEG when open-chest massage doubled the carotid flow | attachment (§7) |
| A8 | EEG under CPR at partial flow | the cortex entry at CPR delivery ≈ 0.30–0.47 (measured CBF 0.30–0.40), held down by the debt the no-flow time left (B6b) | **Humans:** Reagan 2018 [ABS] (16 patients, SedLine + rSO2): "Voltage suppression was commonest and seen during 78% of overall cardiopulmonary resuscitation time and in 15 of 16 subjects"; suppression only at rSO2 ≤ 19 %, delta only above 40 %; AWARE-II 2023 [ABS]: normal-looking EEG activity "emerged as long as 35-60 minutes into CPR" in some (how many not in the abstract; a published letter disputes the reading); Olaussen 2017 [ABS]: consciousness during CPR in 112 of 16 558 resuscitations (0.7 %); Zhou 2024 [FT] (review): 0.23–0.9 %. **Animals, the no-flow dependence:** Kim 2020 [FT] (8 pigs, isoflurane stopped before VF): after 1 min of untreated VF, carotid flow "almost 40%" of pre-VF brought back background activity; the animal whose flow fell from > 30 % entered suppression; Bircher 1980 [ABS] (dogs, 2 min arrest): carotid flow 8–20 % of control under external CPR, EEG returned only with open-chest massage; Shaffner 1999 [ABS] (24 dogs): CPR at once, CPP 25: CBF 57 ± 10 % and ATP 64 ± 14 % of pre-arrest; after 6 min no flow, CPP 25: CBF 23 ± 5 %, ATP 16 ± 5 %; at CPP 35, no flow 6 → 12 min "reduced reflow from 71 +/- 11% to 37 +/- 7% of pre-arrest and reduced ATP recovery from 60 +/- 11% to 2 +/- 1%"; Eleff 1992 [ABS] (6 dogs, 6 min VF, pre-arrest flows by vest CPR): ATP 86 ± 7 % by 6 min of CPR, no further recovery; Lee 1989 [ABS] (rabbits): CBF above 20 % of normal under CPR only after 1 min of no flow, near zero after 7 and 9 min | **The engine's course is a confirmed miss**: after 1 min of no flow it wakes under CPR with a normal EEG after ≈ 4 min of compressions (B4 records it). Two mechanisms, as the plan reads Shaffner and Lee (mine: Shaffner states the same perfusion pressure, not the same flow, and the flows differed, 57 vs 23 % and 71 vs 37 %, so the split between them is an inference): (1) **the brain's own debt**: ATP and the EEG recover less the longer the no-flow time; **B6b produces this dependence** (the debt accrued during the no-flow time caps `fn` under compressions, and at CPR delivery near or below the abnormal level the debt is barely repaid or still accrues); (2) **flow under compressions itself falls with the no-flow time** at the same perfusion pressure, a reflow deficit that belongs to the circulation and the cerebral vessels, a **named attachment** (§7). B6b reproduces, as directions at equal delivery: a longer no-flow time before compressions gives a lower cortex function under the same CPR delivery and a later return, and EEG return under CPR after a short no-flow time at ≈ 40 % flow (Kim 2020). It does not reproduce: the CBF fall with no-flow time (Shaffner's 71 → 37 %, Lee's near zero), the brainstem's better flow, AWARE-II's late emergence 35–60 min into CPR (n not known), or **Reagan's suppression for 78 % of CPR time**: the engine's CPR flow (0.30–0.40 whatever the no-flow time) stays too high without the reflow attachment, and the placeholder debt is not sized to make up for it (that would be fitting). Waking under CPR therefore stays a known miss, smaller after B6b, until the reflow attachment exists (mine: at Shaffner's 23 % flow the engine's `fnSS` is already flat with no debt at all, so most of the observed suppression is the flow's). The delivery at which the EEG returns under CPR stays [P]: no source gives it as delivery (Reagan's rSO2 is not delivery). The BIS-rise reports (Kurita, Aprea, Azim, Jung, Pawlik) are confounded by the compression artefact (Fatovich 2006, Nitzschke 2012, Kim 2021) and are not used as evidence of repayment |
| A9 | Breathing under CPR | brainstem entry at CPR flow (B7a) | Zuercher 2010 CCRP [FT] (64 swine), Table 1, gasps/min during basic CPR: after 3–4 min of untreated VF, continuous compressions 21.1 (10.9), 30:2 15.4 (9.8); after 5–6 min, continuous 8.4 (6.7), 30:2 1.1 (2.1); first 3 min of CPR median 11 vs 0. Noc 1994 [ABS] (rats, 4 min VF, compressions without ventilation): rising to an average of 19/min in resuscitated animals, < 6/min in non-resuscitated, none with mechanical ventilation; Yang 1994 [ABS]: gasp frequency linearly correlated with coronary perfusion pressure (r² = .90); Debaty 2017 [ABS]: gasping during CPR in 177 of 1 827 people (≈ 10 %) | cells (B7a): gasps resume under compressions; more after 3–4 min than after 5–6 min of untreated VF (Zuercher CCRP, as the table states it); none under mechanical ventilation (Noc, rats). Zuercher's rates mix good- and poor-outcome animals; rates in poor-outcome animals are lower (the note's reading) |
| A10 | The compression artefact in the EEG | the EEG artefact path reading the haemodynamic model's compression state (B3b) | Kim 2021 [FT] (8 pigs): "periodic motion artifact exceeding ±50 μV … Frequency components associated with the rate of CPR dominated the power spectrum"; Sethi 2008 [SEC, through Roberti 2023 [FT]]: periodic sharply contoured waveforms, isoelectric between attempts; Nitzschke 2012 [ABS]: the artefact "leads to a miscalculation of the Burst Suppression Ratio and Cerebral State Index"; Fatovich 2006 [ABS] (21 people and a cadaver): "a major component of the BIS tracing during external chest compressions appears to be due to movement artefact"; Chollet-Xémard 2009 [ABS] (92): BIS vs EtCO2 r² = 0.02, BIS did not predict ROSC or survival | cells (B3b): the artefact present only while compressions run, at their rate, above ±50 µV; the brain signal unchanged by it; the readers compute from the summed signal, so the SR and index under compressions are corrupted by the artefact, as the sources report (the index is reported, not asserted); the instructor's view keeps the underlying brain state |

### 2.2 Gradual falls: hypotension, hypoxaemia, anaemia, hypoglycaemia, hypothermia

- **Hypotension:** flow is autoregulated down to the lower limit (`CBF_LL` 60 CPP), then pressure-passive; delivery
  falls with it. EEG changes are "bilateral and modest" in hypotension and clear in sudden arrhythmias (Miller Ch35
  p. 1127). The store is irrelevant at these rates; `fnSS` decides. Tilt syncope: MCA velocity 68 % below the pre-tilt
  value at the time of syncope while MBP fell 25 % (Njemanze 1991 [ABS]); diastolic velocities close to zero at BP
  48/34 (Diehl 1996 [ABS]). Cell: MAP held so that CBF = 0.3 for 5 min → slowing with voltage kept, unconscious
  (D = 0.30 < 1/3), no debt beyond the failure level.
- **Hypoxaemia:** CBF rises below PaO2 60 (`o2Factor`, ×2 at 30); delivery falls only once that compensation is spent,
  then the EEG slows and is abolished (Miller Ch35 p. 1126) — exactly through `D = CBF × CaO2`. Unchanged physics;
  consciousness is new. No human source read gives loss of consciousness as a function of SaO2 or CaO2 in acute
  hypoxaemia (WANTED); climbers at 8 400 m were conscious at PaO2 24.6 mmHg and CaO2 145.8 mL/L after acclimatisation
  (Grocott 2009 [ABS]), a chronic, adapted condition the engine does not model.
- **Anaemia: the flow rise lands whole, as the last of four pieces (B2v, B2d, B5c, B2a), before the consciousness piece.**
  - *The evidence that the brain's flow rises.* Healthy conscious volunteers taken isovolaemically to Hb 5.0 g/dL showed
    no change of VO2 or lactate (Weiskopf 1998 [ABS], 32); at Hb 7 no neuropsychological change, at 6 and 5 slower
    reaction time, at 5 poorer memory, all reversed (Weiskopf 2000 [ABS], 9); at Hb 5.7 ± 0.3 the deficits were reversed
    by raising PaO2 to ≥ 350 mmHg (Weiskopf 2002 [ABS], 31); at Hb 4.8 no evidence of inadequate systemic oxygenation
    (Lieberman 2000 [ABS], 8: a systemic measurement, not a cerebral one). Cerebral flow rises as arterial O2 content
    falls: "CBF altering to maintain the rate of transport of oxygen to the brain within certain limits" over Hb
    5.7–19.1 g/dL (Brown 1985 [FT], 54; the text: transport "remained constant within certain limits", pp. 85–86,
    while its Fig. 3 shows a lower transport at the anaemic end, note 90a §1); "a 2% increase in CBFV for each 1% decrease in Hc and CaO2" over Hb 14.5 →
    10.3 (Mühling 1999 [ABS], 11); rCBF +35.0 ± 2.5 % at 3 h of haemodilution (Tu 1996 [ABS], 13); forebrain CBF 78 →
    171 mL/100 g/min from Hct 43 % to 20 % (Todd 1992 [ABS], rats, halothane).
  - *What the engine does without it (mine, arithmetic on the engine's constants).* With no Hb term in `targetCbf`,
    delivery falls with content at normal flow: at Hb 5 it is about 0.34 of the adult man's own normal and inside the
    EEG's slowing band (0.24–0.40), so the volunteers of Weiskopf and Lieberman would show a slowed EEG and stand near
    the loss of consciousness. The sources show awake people with a normal oxygen balance at these values. **"True to
    physiology" (the condition of the consciousness decision) therefore needs the flow rise.**
  - *What the flow rise is made of: the evidence, and why its parts cannot be added.* Lowering the haematocrit lowers
    the blood's O2 content and its viscosity together. The full-text check of these numbers
    (`research/90-full-text-check-of-the-anaemia-flow-and-reserve-numbers.md`, with notes 90a and 90b for the eight
    articles since read in full) opened what could be opened; the papers not named [FT] stay [ABS]:
    - **The human sources that try find no independent viscosity effect on resting flow.** Brown 1985 [FT] (54
      people, Hb 5.7–19.1, awake, chronic anaemia or polycythaemia): once content had entered the stepwise regression,
      whole-blood viscosity added nothing (F 0.01; nor did PaCO2, age or MAP; Table 2, p. 87), and flow against
      viscosity flattened above about 5 mPa·s (Fig. 4, pp. 86–87); its PaCO2 and MAP were not held constant and no
      group values for them are printed (p. 83). Borzage 2016 [FT] (45 people, measured viscosity, phase-contrast MRI): content "the strongest
      predictor of CBF (r² = 0.33)"; viscosity "had no detected effect on CBF after correction for differences in
      oxygen carrying capacity". Plasma exchange in 8 people lowered plasma and whole-blood viscosity with "no
      significant change in cerebral blood flow" (BMJ 1982 [ABS], PMID 6805689); a review pooling the human work
      (Hoiland 2016 [FT]) reads "studies in humans provide evidence against an appreciable role of viscosity". The
      limit (the check's reading, which the plan shares): in anaemia haematocrit, viscosity and content move together,
      so a regression has little power to separate them, and the two plasma-exchange reports disagree (+24.4 mL/100
      g/min in 4 patients with paraproteinaemia, 1985 [ABS], where plasma, not red-cell, viscosity was lowered; no
      change in 8 in 1982).
    - **The animal sources find a share of about half, measured in ways that do not add.** Tomiyama 1999 [FT] (rats,
      pentobarbital, PaCO2 38–40, hetastarch, Hct 44 → 17 %; Table 1, p. H1192): CBF 79 (controls), 123 (diluted, CaO2
      8.1), 104 when content was restored to a **calculated** 18.5 with 100 % O2 at 5 atmospheres (PaO2 3,300 mmHg,
      calculated, not measured), 125 in diluted rats at 5 atmospheres kept normoxic, which controls for the pressure
      only. The "40–60 %" is the content share of the rise over control: 44 % as measured, 61 % once every group is
      adjusted to the same MAP with the 0.2 % per mmHg that a separate pressure test in diluted rats gave (HDil MAP
      104, HBar 145; pp. H1193–H1194); the viscosity share is the remainder by subtraction, and a direct action of the
      very high PaO2 on the vessels was not tested (pp. H1194–H1195). Whole-blood viscosity was measured ex vivo in
      3 + 3 separate rats: 4.53 → 2.54 cP, with plasma viscosity rising 1.32 → 1.67 cP from the starch (p. H1193)
      (note 90b §2). Hudak 1986 and 1987 [ABS] (newborn
      lambs, unanaesthetised; newborn sheep, anaesthetised): red-cell concentration accounted for 56 % and about 60 % of
      the fall in flow as haematocrit **rose** (20 → 40 %, 30 → 55 %), with viscosity "probable", not measured. The cats
      of 1992 (Muizelaar, [ABS]) show that viscosity moves flow but give no share. The shares come from different
      animals, directions and reference states; their sum lies near one only by the chance of the ranges (the check's
      reasoning, §4.1).
    - **The two act together, not side by side.** At equal content, dilution raised flow **less** than hypoxaemia: rabbits
      (pentobarbital, 39 °C, PaCO2 37–39), whole-brain CBF 44, 46, 60, 82 mL/100 g/min at CaO2 17.5, 13.4, 9.4, 6.5 in
      dilution against 39, 47, 80, 121 at CaO2 18.0, 13.2, 9.0, 6.1 in hypoxaemia (Todd 1994 [FT], Table 1 p. H2027;
      viscosity not measured, p. H2030), and the authors read it as arguing "against viscosity being the principal
      determinant" (p. H2028); the pooled human slopes are 0.66 % flow per
      1 % fall of content in haemodilution against 1.85 % in hypoxaemia (Hoiland 2016 [FT]). If a lower viscosity added
      flow on top of an unchanged content response the reverse would be expected, so the content response itself
      differs in haemodilution (the check's reasoning, §4.1, which the plan takes).
    - **Anaemia spends the same dilator reserve, in people.** Adults with sickle-cell anaemia raised grey-matter flow
      by 34.1 % to acetazolamide against 69.5 % in 11 controls; "patients with SCD utilize half of the cerebral
      vasodilatory reserve … to compensate for anemia" (Vaclavu 2019 [FT], 36 + 11, ASL). Their flow after acetazolamide
      (108.3) stayed above the controls' (85.5) [the check's observation: a part of the rise that survives maximal
      dilation would fit it, such as viscosity; confounded by sickle vasculopathy and by whether 16 mg/kg is maximal].
    - **The one study that measured the flow response to CO2 after dilution leaves the shared reserve standing.** Cats (pentobarbital and fentanyl), albumin exchange to Hct 19 %, CaO2 15.6 → 8.9: resting flow rose
      about 39 → 62 → 69 mL/100 g/min at 1 and 2 h with O2 transport kept (Fig. 2, p. H1603, read from bars); at PaCO2
      about 70 the flow rose about +360 % against about +400 % in time controls, not significantly different, while
      the rise was attenuated when plasma viscosity was raised or cell-free Hb was in the plasma (Rebel 2003 [FT],
      microspheres, Fig. 4B and text p. H1604; note 90b §4). The rise is printed only as a percent; neither the
      results nor the legend of Fig. 4 states its reference, and no absolute hypercapnic flow is printed. **Mine:**
      three readings remain. (i) If the percent is of the pre-dilution baseline, the diluted cats reached about 4.6 ×
      that baseline (≈ 180 mL/100 g/min from the bars) against the controls' 5 × (≈ 230): what a shared reserve with an
      unchanged ceiling predicts, the anaemic rise having spent part of it. (ii) If it is of the diluted baseline, they
      reached about 1.75 × 4.6 ≈ 8 × the pre-dilution flow, above the controls: an unchanged ceiling cannot give that
      if the controls' × 5 is the ceiling, and a ceiling raised by thinner blood (§9.2 item 2) could. (iii) PaCO2 70 for
      10 min may have reached the ceiling in neither group, so that both requests fitted inside the reserve and the
      study says nothing about the ceiling. So the study does not contradict a shared, finite reserve, does not show
      that the diluted brain's maximal flow differs from normal, and cannot tell whether the ceiling rose. A cat's
      hypercapnic rise (≈ × 5 at PaCO2 70, pH 7.14) is far above a person's and is not carried over.
  - *What the plan therefore builds (decided by the evidence; whether viscosity acts at maximal dilation is open, §9.2
    item 2).* **The split between a content share and a viscosity share is not established for the human brain**, and the
    shares cannot be added, so the plan builds no split. The whole anaemic rise at rest is one regulated dilation of the
    resistance vessels that keeps O2 transport "within certain limits" (Brown 1985), and it is spent from the shared
    reserve with CO2, hypoxia and the drugs (B2v), as the human reserve study shows (Vaclavu 2019 [FT]). At normal
    pressure the rise is therefore the measured human rise, and below the lower limit, in haemorrhagic shock and under
    compressions, where the reserve is spent, the regulated rise adds nothing. **Viscosity** is a physical property of
    the blood, not of the vessels: a lower viscosity raises the conductance of vessels at any tone. While the vessels
    can still regulate, they compensate it (the cats' pial constriction after haemodilution, read by its authors as "a
    normal autoregulatory adjustment of vasomotor tone to altered blood rheology", 1992 [ABS]; Rebel 2003 [FT]:
    pial constriction with the cell-free Hb polymer at near-normal O2 capacity, p. H1604), which fits the human finding
    of no independent effect at rest. The rats agree in size (mine, arithmetic on Tomiyama 1999 [FT]): their measured
    whole-blood viscosity fell to 0.56 of normal, which in a passive tube at constant diameter would raise flow × 1.78,
    while the whole measured rise, content included, was × 1.56, so the viscosity fall was not passed through in full
    at normal tone. When the vessels are maximally dilated it can no longer be compensated, so it raises the
    **ceiling**, the maximally dilated flow (mine, from the mechanisms; Vaclavu's anaemic flow after acetazolamide fits
    it, and the cats' CO2 response after dilution does not exclude it). No study read tests it: whether the plan builds
    this ceiling term or leaves viscosity out of the brain is open (§9.2 item 2). Until it is answered, B2a builds the
    regulated rise alone and marks viscosity's omission in the code: at maximal dilation the engine then understates an
    anaemic patient's flow, toward ischaemia (mine).
  - *The viscosity relation, if it is built.* Blood viscosity against haematocrit is not a power law. In resistance-size
    vessels at high shear (Pries 1992, as given by Secomb & Pries 2013 [FT]) its equivalent exponent between Hct 45 and
    30 % is about 0.57 at 30 µm, 0.67 at 50 µm and 0.79 at 100 µm (the check's arithmetic on the published equations,
    §4.4), and viscosity "increases at lower shear rates" (Secomb & Pries [FT]). The engine's systemic `VISC_EXP` 0.6 is
    a fit to Weiskopf 1998's whole fall of systemic resistance, vasodilation included, so it is not a viscosity
    relation; its fade with flow (full at the resting output, none at 0.3) rests on Chien 1970 and Merrill 1969, cited
    and not read. A ceiling term would read the Pries relation at a stated resistance calibre [P] and the fade [INF].
  - *What is measured about cerebral flow in anaemia combined with hypotension.* Humans (30 ASA I–II hip-arthroplasty
    patients, aged 48–69), 60 % N2O with 1.2–1.8 % end-tidal sevoflurane, PaO2 > 200 mmHg, PaCO2 38–40, Hct 37 → 33 %
    or 37 → 25 % with hydroxyethyl starch (CaO2 18 → 16 or 18 → 11 vol%), then prostaglandin E1 to MAP ≈ 55 for 80 min:
    MCA velocity rose **to** 122 % and 156 % **of baseline** after haemodilution, rises of +22 % and +56 % (about 44 →
    54 and 44 → 66 cm/s), and stood at 135 % of baseline at 80 min of hypotension and 140 % after it in the Hct 24 %
    group, with the pulsatility index unchanged (J Clin Anesth 2005 [FT], results and Fig. 1 p. 179, Table 2 p. 179;
    the abstract's "+122 %" and "+156 %" misstate the article, note 90a §3). Velocity only: no flow and no MCA diameter
    were measured, both anaesthetics dilate cerebral vessels, and MAP 55 under a vasodilating prostaglandin is not a
    test below the lower limit.
    Humans, esmolol hypotension with haemodilution: lower rSO2 than haemodilution alone, 55.9 against 60.4 % at 30 min
    (Acta Anaesthesiol Scand 2006 [ABS], PMID 16879470, 56). Monkeys, halothane: Hct < 20 % combined with MABP < 40
    gave ischaemic injury in 7 of 16 survivors, either alone none (Anesthesiology 1986 [ABS], PMID 3789433, 41). Rats:
    Hct ≤ 20 % with MAP 50–60 for 1 h gave CA1 ultrastructural damage and a raised S100B (Acta Anaesthesiol Scand 2007
    [ABS], PMID 17944636, 40). **No source read measures cerebral flow below the lower limit, or under compressions,
    with and without haemodilution**: that the regulated rise adds nothing there is the plan's inference from the shared
    reserve (WANTED, §5.3). The injury studies agree in direction:
    anaemia with deep hypotension harms the brain, which a flow rise at maximal dilation would hide.
  - *The shared reserve (B2v).* See §3 and piece B2v: one finite dilator reserve, the distance between the vessels'
    present autoregulated state and maximal dilation; every dilating request (CO2, hypoxia, the drugs' direct and
    coupled effects, and the anaemia rise) spends it; pressure spends it first as it falls through the
    plateau; at and below the lower limit nothing is left.
  - *The reference: the patient's own normal.* The factor is a function of Hb ÷ Hb_normal (its working form below), with
    Hb_normal the patient's own normal haemoglobin, the blood model's band and sex normal (`bloodPatient`'s `BAND`: adult man 15, adult woman and older man
    13.5, child 12.5, infant 11.5, neonate 17 g/dL), read through `pat.hbRef` (decision, §9.1 item 11). Every default
    patient rests at a factor of exactly 1 and a delivery of exactly 1 (with B2d's delivery reference, decision §9.1
    item 10).
  - *The start of a run, a patient set anaemic by hand, and an older snapshot.* The organ view must read the patient's
    Hb and normal Hb at t = 0: today the engine rebaselines the organs before the blood's first step, the view then
    falls back to 14/14, and a patient whose Hb was set by hand jumps at the first blood step (× 1.42 at Hb 9, × 2.12
    at Hb 5, relaxing over `TAU_VASC_S`). B2d makes the t = 0 view read the blood core's `pat.hb` and `pat.hbRef`,
    which exist before the first step, so the brain's conductance is created at the anaemic target. **A patient whose
    Hb is set in his profile is a chronic anaemia** (the plan's rule: a profile describes the patient as he arrives): at t = 0 his flow is already raised, CBV,
    ICP, PbtO2 and SjvO2 at their raised values, in equilibrium. An acute anaemia is a fall of Hb during the run
    (bleeding, dilution), whose flow follows with `TAU_VASC_S`. An older snapshot of an anaemic patient (taken before
    B2a) restores the factor-free conductance, and its flow settles to the anaemic target over about 30 s after the
    restore; nothing in the snapshot is added, and the piece states this (mine: a bookmark is restored only inside one
    build).
  - *Form, slope and holds.* The rise is a function of the fall of O2 capacity at the reference saturation, Hb ÷
    Hb_normal (§1.5.5). **Its size and form over the whole range are not settled** (§9.2 item 3). **The working size is
    the pooled human haemodilution slope** [P: working value, pending §9.2 item 3], 0.66 % flow per 1 % fall of
    content, linear as the source states it: factor = 1 + 0.66 × (1 − Hb ÷ Hb_normal) (Hoiland 2016 [FT], a review;
    the mean line is weighted by sample size over four studies: Daif 2012, 20 anaesthetised tumour-resection patients;
    Ekelund 2002, 8 patients with vasospasm after subarachnoid haemorrhage; Hino 1992, 8 healthy volunteers; Mühling
    1999, 11 healthy volunteers; a fifth, 5 patients with carotid occlusion, is shown and left out of the mean). **The
    review's text does not state each study's own slope or the range of content fall it reached:** they are plotted in
    its figure (with the SD of the per-study slopes as error bars) and not given as numbers, so they are WANTED (§5.3).
    Why it is not settled: the pool mixes anaesthetised and diseased patients with two small healthy groups over
    unknown ranges; the one healthy-volunteer study read gives a steeper relation (Mühling's means, k = 0.683 in a power
    form [ABS; INF: the power form, MCA diameter constant]); and the two part widely where the simulator uses them most:
    at half the normal Hb the pooled line gives × 1.33 and the power form × 1.61 (mine, arithmetic). The one human
    series spanning Hb 5.7–19.1 g/dL (Brown 1985 [FT], 54 people) **prints no equation**: only correlations, flow
    against CaO2 r = −0.855 (a straight line "throughout the range", Fig. 1) and against 1/CaO2 r = 0.831 (Fig. 2),
    which fit about equally well, with no coefficient, intercept or residual printed (pp. 84–87); its two lines can
    only be read off the figures (note 90a §1). Its people are awake haematology out-patients with **chronic** anaemia
    or polycythaemia, compared with one another rather than diluted, with PaCO2 and MAP not controlled, fast-compartment
    (grey-matter-weighted) Xe-133 flow, and some contents calculated from venous Hb (p. 83).
  - *The four forms beside the measured points (mine, arithmetic; note 90a §5, note 90b §6).* The forms, each relative
    to the patient's own normal: **(A) the pooled acute line**, 1 + 0.66 × (1 − h), h = Hb ÷ Hb_normal (Hoiland 2016
    [FT]); **(B) the power form**, h^−0.683 (Mühling 1999's means [ABS]); **(C) constant O2 transport**, 1 ÷ h, the
    hypothesis Brown 1985 tested (r = 0.831; its Fig. 3 shows transport constant "within certain limits" and lower at
    the anaemic end, transport against Hb r = 0.044); **(D) a rise that starts only below a threshold**, as the rabbits
    show (flow flat to CaO2 ≈ 13 of 17.5, Hct 31 %, then rising more steeply; Todd 1994 [FT], Table 1 and Fig. 1
    p. H2027): no human source gives its threshold or its slope, so it has no human numbers. Measured beside them: Brown
    1985's two figure lines (chronic, awake), the 2005 velocities (acute, anaesthetised) and the three laboratory
    dilutions (acute, anaesthetised animals, placed by their fraction of normal content). Reference Hb 14.5 g/dL as in
    the notes; for the adult man (15) each Hb shifts by about 3 %. Columns A–C are computed on the Hb ratio, as the
    engine computes the factor; Brown's columns use note 90a's conversion of Hb to CaO2 (1.34 × Hb × 0.97 + 0.003 ×
    95), since his lines are drawn against CaO2. The 2005 group diluted to Hct 25 % is placed by its printed content
    (18 → 11 vol%, h ≈ 0.61, row 9); by its haematocrit (37 → 25 %, h ≈ 0.68, row 10) the forms give A 1.21, B 1.31,
    C 1.48. The measured × 1.56 lies above A and B either way, below C by content (1.64) and above it by haematocrit.

    | Hb g/dL (h) | (A) pooled line | (B) power | (C) constant transport | Brown 1985, straight / reciprocal line | Measured, acute |
    |---|---|---|---|---|---|
    | 14.5 (1.00) | 1.00 | 1.00 | 1.00 | 1.00 / 1.00 | — |
    | 13 (0.90) | 1.07 | 1.08 | 1.12 | 1.15 / 1.09 | 2005, CaO2 −11 %: velocity × 1.22 |
    | 12 (0.83) | 1.11 | 1.14 | 1.21 | 1.25 / 1.16 | — |
    | 11 (0.76) | 1.16 | 1.21 | 1.32 | 1.35 / 1.25 | rabbits, content 0.77: × 1.05 |
    | 10 (0.69) | 1.20 | 1.29 | 1.45 | 1.45 / 1.35 | Mühling's means, Hb 14.5 → 10.3: velocity × 1.26 |
    | 9 (0.62) | 1.25 | 1.39 | 1.61 | 1.55 / 1.48 | 2005, CaO2 −39 % (Hct −32 %): velocity × 1.56 |
    | 8 (0.55) | 1.30 | 1.50 | 1.81 | 1.65 / 1.63 | rabbits, 0.54: × 1.36; cats, 0.57: ≈ × 1.6–1.8 (bars) |
    | 7 (0.48) | 1.34 | 1.64 | 2.07 | 1.75 / 1.83 | — |
    | 5.7 (0.39) | 1.40 | 1.89 | 2.54 | 1.88 / 2.19 | rats, 0.41: × 1.56; rabbits, 0.37: × 1.86 |

    What the table shows (mine): the pooled acute line is the lowest of the human sources read below Hb ≈ 12, and
    below every animal point at content falls of 40 % or more (only the rabbits' mild step lies under it); the 2005
    anaesthetised velocities and Brown's chronic lines sit above both (A) and (B), and near (C) at moderate anaemia; the
    animals lie mostly between (A) and (B), the rabbits flat at mild dilution and steep below it. Brown's two lines agree
    within about 0.1 between Hb 8 and 13, where most of his subjects lie, and part at the ends, where there are few
    (about 6 below Hb 8). The sources describe different patients: Brown, awake people with long-standing anaemia;
    the pool, acute isovolaemic dilution in volunteers and in anaesthetised or diseased patients; 2005, anaesthetised
    patients under vasodilating agents at a PaO2 above 200, by velocity; the animals, anaesthetised rats, rabbits and
    cats. **The teaching cases where haemoglobin falls are acute** (bleeding and dilution during an anaesthetic, as in
    the haemorrhage cards); no scenario card sets a low Hb in its patient's profile, and the one hand-set Hb 5 is a
    development page. A chronic anaemia enters only when Hb is set in a patient's profile (the rule above). A chronic
    relation is not put into an acute bleeding case without saying so.
  - *Holds.* The factor is held at Brown's range, **5.7–19.1 g/dL** [FT] (p. 83; Table 1 p. 82): 5.7 is the lowest Hb
    at which a cerebral-flow source measured, with about six subjects below 8 g/dL (Fig. 3, read from the figure), not
    Lieberman's 4.8, which is a systemic measurement [P: below 5.7 no CBF measurement in people]. The
    consciousness cells are read at the pressure the engine gives that patient: at Hb 5 the adult man's delivery is
    ≈ 0.48 of his own normal at CPP 80 (working factor ≈ 1.41 capped at 1.40) and ≈ 0.41 at CPP 70 (reserve 1.20),
    against the abnormal level 0.40 (mine, arithmetic at SaO2 0.97, PaO2 95); if the cell fails at the engine's
    pressure, the ceiling question decides, and no threshold moves.
  - *The rows the set may move, and no other.* (1) Rows of patients who are in fact off their own normal Hb at the
    moment the row reads them (haemorrhage, haemodilution, a card with a hand-set Hb), each listed with its Hb, the
    factor and the moved values (CBF, CBV, ICP, PbtO2, SjvO2). (2) Each piece's own stated cause: B2v's
    reserve (CO2 and hypoxic dilation no longer adding flow below the lower limit and under CPR), B2d's delivery
    reference (the default man from 1.07 to 1), B5c's delivery read (content and saturation away from the reference).
    A record of the engine's own output is re-recorded only with its cause written beside it, in the record's test
    header, as `eeg-baseline.test.ts` does for every earlier regeneration. (3) A default patient whose Hb drifts in a
    run (fluids under anaesthesia: about 0.002 g/dL, a factor about 1e-4 off 1) moves by that drift only, listed. (4)
    Nothing else: a cell that passed before and fails after the set is a failure of the set, repaired by its mechanism,
    never marked as an expected failure. A band a source sets is never moved.
  - *The glycine row is not the flow rise's.* The glycine-absorption cell (3 L of 1.5 % glycine: ICP at least 1 mmHg
    above the control) is not counted as passed by the flow rise whichever way the ICP assertion falls (decision,
    §9.1 item 8): it is re-specified on brain water, its true mechanism, as the blood-fluids plan's named cell "F11 brain
    water" (`docs/plans/fu-9-blood-fluids.md`, F11 / task A8): brain water gained per mOsm/kg of the fall of effective
    osmolality against the no-absorption control, within the band its source states; until that source is read, the
    direction is the passing cell and the size an expected failure with the plan's own comparison (an ideal-osmometer
    brain of ≈ 1.1 L would gain ≈ 55 mL for −15 mOsm/kg, against the engine's +1.99 mL) [INF]. Sources for the
    direction: Adrogué & Madias 2000 (NEJM 342:1581), Hahn 2006 (BJA 96:8), Sandfeldt 2001 (PMID 11162034); a measured
    brain-water gain per mOsm/kg is WANTED.
  - *Cells after the set and B2.* Weiskopf 2000 / Lieberman 2000: a normotensive, normoxic patient at Hb 5 and 4.8 g/dL is
    conscious with an EEG above the abnormal level (delivery above 0.40 at CPP 70–80 under every option of §9.2 whose
    factor at the hold, Hb 5.7, is at least 1.2, which forms A, B and C all are; mine). The chosen
    slope's source: at normal pressure the factor reproduces it (arithmetic on the source, not an independent cell).
    Todd 1992: direction at Hct 20 as a check, rats. Vaclavu 2019 [FT]: in chronic anaemia at normal pressure the
    reserve left for a further dilation is smaller than in a normal patient (direction). The maximal-dilation cells are
    B2v's.
- **Hypoglycaemia:** today a separate hypnotic term (`GLYCO_U` 1.2 [FIT], glucose 60 → 30 mg/dL). Under this structure
  glucose is the second substrate of the same state: `fnSS` takes min(O2 supply, glucose supply), with EEG slowing at
  about 40 mg/dL and suppression below 20 mg/dL (Miller Ch10 p. 219, the EEG plan's U7). Piece B8 moves it and retires
  `GLYCO_U`'s consciousness term, so neuroglycopenia is not held twice. Until B8, both exist and the plan says so.
- **Hypothermia:** demand falls 7 %/°C (`Q10_BRAIN`), so store drain and debt accrual during low flow run slower. The
  line is now sourced between 33 and 37 °C: human cerebral Q10 2.3 (McCullough 1999 [ABS]) and 2.23 in dogs between 37
  and 27 °C (Michenfelder & Milde 1991 [ABS]) both give 0.72 of normal at 33 °C, as the line does (mine, arithmetic).
  Below about 28 °C the line departs from the measurements (Q10 4.53 from 27 to 14 °C; 17 % of normal at 15 °C
  against the line's floor of 30 %): a finding for the organ model's tables, outside the arrest cells, not changed
  here. The cold EEG's own slowing and suppression (`cold`, Stecker 2001) stays in `cortexStep` because it is a rate
  effect on the cortex, not an energy failure. Loss of consciousness is common below 28 °C (Miller Ch71 p. 2254): a
  WANTED-sourced attachment for the consciousness term, not built here. **After the circulation returns there is no
  temperature term on recovery** (decision, §9.1 item 5; §1.3.6): the rat EEG recovers sooner when cooled at once and
  unsedated (Chen 2013 [FT], Jia 2008 [FT]), sedated people cooled to 33 °C wake later than at 36 °C (Lybeck 2018
  [ABS]) and cooled newborns normalise their EEG later (Thoresen 2010 [ABS]); the sign changes with the species and
  the end point and no source gives a size per degree (research note 85). A cooled, sedated patient wakes later in the
  engine through the drug layer's slower clearance (fentanyl clearance 726 against 1331 mL/min at 33–34 °C, Bjelland
  2013 [ABS]; midazolam −11.1 %/°C, Hostler 2010 [ABS]).
- **Drugs that lower CMRO2** act through `b.cmro2Rel` on demand: slower drain and debt. Hossmann 1988 [ABS] found no
  improvement of recovery after barbiturate anaesthesia in complete ischaemia, which this structure reproduces: in
  complete ischaemia a silent brain's demand is already basal, and a drug cannot lower what the electrical silence has
  already removed.
- **Anaesthetics and the critical flow:** the flow below which most patients develop EEG ischaemia within 3 min of
  carotid clamping is isoflurane ≈ 10, halothane ≈ 20, enflurane ≈ 15 mL/100 g/min (Michenfelder 1987 [ABS], 2 010
  patients); under isoflurane–N2O < 10, 5.9 ± 1.2 in the 6 with changes, halothane previously "18-20" (Messick 1987
  [ABS]); sevoflurane 0.3–0.6 MAC + 50 % N2O, rCBF50 11.5 ± 1.4 (Grady 1998 [ABS]). The engine's 20/50 matches the
  halothane value; which anaesthetic underlies Miller's figure is not stated (mine). In awake monkeys reversible
  paralysis came below about 23 cc/100 g/min (Jones 1981 [ABS]). Piece B9, blocked (isoflurane's and sevoflurane's
  values fall below the failure level 12/50, whose agent dependence is not sourced).

### 2.3 After the circulation returns

**The recovery table (B6b's data; the ruling: a placeholder curve between the sourced points, marked in the data).**
Each row is one point; "use" says whether it sets a number or only the shape. Times are from the return of the
circulation unless stated.

| # | No-flow (or arrest) time | Species, condition | Milestone, as the source states it | Source | Use |
|---|---|---|---|---|---|
| P1 | seconds (ICD testing; duration not in the abstract) | humans, general anaesthesia, normothermic | EEG back 17 ± 9 s (single shock), 22 ± 12 s (multiple shocks); cerebral O2 uptake lags the EEG | de Vries 1998 [ABS] | sets the seconds end (R1) |
| P2 | seconds, 59 arrests in 13 patients | humans, ICD testing | "Recovery times increased in proportion to arrest duration" | de Vries 1997 [ABS] | shape: monotonic in the arrest's length; its regression WANTED |
| P3 | seconds, 286 arrests in 36 patients | humans, standardised anaesthesia | "highly significant correlation between circulatory arrest and recovery time"; no cumulation over repeated tests | Vriens 1996 [ABS] | shape: no cumulation means the debt from one test is repaid before the next (a cell: repeated short arrests give the same recovery time); its regression WANTED |
| P4 | 15–126 s VT/VF | humans, awake | post-syncopal confusion "generally lasts for less than 30 seconds", "depending on duration of induced cardiac dysrhythmia and unconsciousness" | Aminoff 1988 [ABS] | consciousness back within ≈ 30 s of short arrests |
| P5 | 18–58 s adenosine asystole | humans, isoflurane, 15 | EEG power "reduced to -57%, but reached normal values within 5 min" | Plaschke 2006 [ABS] | a second short-arrest number: EEG power normal by 5 min |
| P6 | 5 min untreated (pacing-induced) | rats, chloral hydrate (none for 30 min before), normothermic, 20 | isoelectric → burst suppression → continuous; first burst 21.5 ± 6.0 min; continuous background 239.5 ± 38.4 min; with 2 h hypothermia 15.1 ± 1.9 and 171.2 ± 15.2 min (the first burst came during cooling, before the target was reached at 15.7 ± 5.0 min; the continuous background came during rewarming, 2–4 h: not a measurement at a steady 33 °C) | Chen 2013 [FT] | shape: the milestone sequence and their ratio; rat time scale not transferred |
| P7 | 5 min untreated (asphyxial, arrest ≈ 3 min after it began) | rats, normothermic, 40 | first burst 25.70 [22.48–30.05] min; continuous ("normal trace") 208.39 [186.29–248.80] min | Chen 2019 [FT] | shape, as P6; asphyxial cause |
| P8 | 7 min asphyxia | rats, 24 (8 per group), halothane stopped 5 min before the arrest, no sedation after; 33, 37 or 39 °C within 15 min, for 6 h | burst frequency in the first 90 min 25.6 ± 12.2 (33 °C), 16.9 ± 8.5 (37 °C), 22.6 ± 8.3/min (39 °C); most animals continuous at 90 min, earlier when cooled (p = 0.025) while still cold, later with hyperthermia; mortality 0/8, 1/8, 4/8; the times to continuous are in a figure only | Jia 2008 [FT] | shape; the rat direction of temperature, recorded, not built (§9.1 item 5) |
| P9 | 7 min asphyxial arrest | dogs, 23 | brainstem auditory potentials normal at 1 h; EEG frequency distribution "never recovered … during the 6 h" | Cerchiari 1990 [ABS] | brainstem before cortex (R2); cortex still abnormal at 6 h |
| P10 | 8–14 min | dogs, 14, 5 h follow-up | EEG deteriorated in all with arrest > 8 min; > 12 min "either no return (isoelectric) or marked slowing" | Lin 1977 [ABS] | shape: beyond ≈ 12 min, no continuous EEG within hours |
| P11 | 1 h complete ischaemia | cats, normothermic, 12 | at 5–6 h of recirculation: no EEG recovery in 5, intermittent in 3, continuous in 4; EEG intensity correlated with ATP | Schmidt-Kastner 1986 [ABS] | the far end of the animal range |
| P12 | not stated (125 with no cortical activity at resuscitation) | humans | for recovery of consciousness, intermittent cortical activity within 200 min and continuous within 630 min; activity "regained in an exponential relationship to time"; consciousness returned 11–720 h later in the 37 who woke | Jørgensen 1981 Parts I and III [ABS] | human EEG milestones for those who wake; the shape (exponential) |
| P13 | total arrest time (collapse to return, CPR included) 19 [11–29] and 15 [10–30] min; no-flow time not reported | humans, 1 002 + 166, sedated, temperature-controlled | awakening (following commands) median 46 h [33–88] and 65 h [46–123] from collapse | Elmer 2023 [FT] | the far human end (R5); confounded by sedation |
| P14 | not related to no-flow time | humans, 194 cooled, 85 woke; 227 TH vs none | median awakening 3.2 days (2.2–4.5); day 2 in both groups | Grossestreuer 2013 [ABS]; Fugate 2011 [ABS] | R5 range, sedated |

**The curve.** Human numbers exist at the seconds end (P1, P4, P5) and at the far end for patients who wake (P12–P14,
with an arrest time but no no-flow time). Between about one and twenty minutes of no flow, every point is animal
(P6–P11) and the species time scale is not established. The milestone table therefore carries rows for no-flow times
of 1, 2, 5, 10 and 20 min (expressed as normothermic debt), each marked `placeholder: true`, with values interpolated
linearly in log(time) against log(no-flow time) between two anchors [P, mine]: the seconds anchor P1 (its arrest
length [P], not in the abstract) and the far anchor P12/P13, whose x is itself [P] (P12 gives no arrest time; P13
gives a total arrest time of 15–19 min with CPR included, not a no-flow time) and taking from the animal points only their shape: silence, then bursts, then a
continuous background, the times rising with the insult, and the first burst at about a tenth of the time to a
continuous background (P6, P7) [P, mine]. No rat or dog time is copied into a human row.

| # | What | Source | Course in this plan |
|---|---|---|---|
| R1 | Brief arrest (ICD testing, seconds): EEG back | P1–P3, P5 | cell (B6b): after a single-shock-test arrest (its VF duration is not in the abstract: [P] on the arrest length the cell uses, stated in the piece), cortex back to fn > 0.9 at 17 ± 9 s after the circulation returns; recovery time rises with the arrest's length (monotonic cell); repeated short arrests do not cumulate (P3) |
| R2 | Order of recovery | Jørgensen 1997 [ABS] (111 resuscitations): "spontaneous respiratory movements were either present or were the first function to return; thereafter followed pupillary light reflexes, coughing-swallowing, and ciliospinal reflexes"; Jørgensen 1981 [ABS]: cranial-nerve reflexes and decerebrate posturing before any cortical activity; Cerchiari 1990 [ABS] (P9) | cell: breathing returns before consciousness after any arrest that silenced both (B7a, once B6b exists) |
| R3 | The EEG's course after a long arrest | Jørgensen & Holm 1998 [ABS] (231): intermittent activity, then continuous delta → theta → alpha, over hours to days; Geocadin 2002 [ABS] (rats, 5 or 7 min asphyxia): more bursting in the first 30–40 min in good-outcome animals; P6–P8, P12 | `fnCap(Q)` rises from 0 through a burst-suppression range (the EEG cortex's existing suppression drives the bursting) to continuous; the times from the recovery table |
| R4 | Outcome by the EEG at 12 and 24 h | Ruijter 2019 [FT] (850 patients): generalized suppression (< 10 µV) or synchronous patterns with ≥ 50 % suppression from 6 h onward invariably meant poor outcome; continuous patterns at 12 h predicted good outcome (sensitivity 0.50, specificity 0.91); Westhall 2016 [FT] (103 of the TTM trial): a highly malignant EEG after rewarming meant poor outcome in all; a benign EEG in 1 % of poor outcomes | validation bands for the EEG plan's injury state (§7), not built in this plan's pieces |
| R5 | Awakening | P13, P14; Paul 2016 [ABS] (326, midazolam + fentanyl): delayed awakening (> 48 h after sedation stop) in 56 of 194 woken, at median 93 h; Resuscitation 2016 (PMID 27036662) [ABS] (163 woken after 24 h at 32–34 °C): mean 3.8 days, later with a lower target; Resuscitation 2021 (PMID 34102268) [ABS] (209): high-dose benzodiazepine 5 against 3 days | the far end of the recovery table; sedation is a confound the engine's drug layer carries separately |
| R6 | Temperature after return | **Rats, unsedated, cooled at once:** Chen 2013 [FT] (P6) and Jia 2008 [FT] (P8) earlier bursts and continuous background; Jia 2006 [ABS] and IEEE TBME 2006 (PMID 16761828) [ABS]: better qEEG recovery. **Newborns:** Thoresen 2010 [ABS] (74): good outcomes normalised by 24 h when normothermic, by 48 h when cooled. **Adults, sedated:** Lybeck 2018 [ABS] (939, TTM): awakening later at 33 than 36 °C (p = 0.002), cumulative sedative doses not different; Annborn 2023 [ABS] (71, concentrations measured): 53 against 46 h (p = 0.09); Fugate 2011 [ABS]: day 2 with and without cooling; Hofmeijer 2015 [FT] and J Intensive Care 2016 (PMC4818927) [FT]: continuous patterns within about 11–12 h in good outcomes under 33 °C, no comparator; Westhall 2016 [FT]: prognostic value not changed by 33 against 36 °C. **Drugs under cooling:** Bjelland 2013, Hostler 2010, Leslie 1995 [ABS]: lower clearance, more drug for a dose | **decided (§9.1 item 5): no temperature term on recovery.** Temperature acts through demand during low flow, the EEG's direct cold slowing and drug clearance; the protection by immediate cooling and the harm from fever are the injury state's placeholders (§1.3.7) |
| R7 | Breathing after return | the gate on main reopens over 2 min (the ruled "1–3 min"); no timed source found; its order is sourced (R2); Reid 1998 (as the evidence check states it; not in its tables, not read here) (rats, 7 min): in 3 of 36 the brainstem response never returned, and none of those breathed | B5 re-expresses it unchanged; B7a keeps the 2-min reopening as [P] after the no-flow phases; a function of brainstem debt only in B7b |
| R8 | The patient who does not wake | Ruijter 2019 [FT], Westhall 2016 [FT], Elmer 2023 [FT]; mechanism (synaptic failure becoming lasting) Hofmeijer 2012 [ABS] | the EEG plan's injury state on this plan's debt (the ruling, §9.1 item 3; §7) |

---

## 3. Where the state meets the rest of the body

| Link | In or out | Reason |
|---|---|---|
| Cerebral autoregulation, CO2 and O2 reactivity | **reused** | `autoreg`, `co2Factor`, `o2Factor`, `TAU_VASC_S` already set CBF; the state reads CBF, so hyperventilation and hypercapnia act through flow, as Miller Ch35 p. 1127 says they do |
| Anaemia's flow rise | **in**, piece B2a (in review), merged after B2v, B2d and B5c | `targetCbf` gains an Hb factor relative to the patient's own normal Hb, one regulated dilation spent from the shared reserve (§2.2); the inputs exist in `BrainInputs` |
| The shared vasodilator reserve | **in**, piece B2v | one reserve, the dilation left between the autoregulated state and maximal dilation, spent by the CO2, hypoxic, drug and anaemia-content requests; nothing left at and below the lower limit (§2.2, B2v) |
| Blood viscosity in the brain | **not built**, open (§9.2 item 2) | the human sources find no independent viscosity effect on resting flow; at maximal dilation a lower viscosity would raise the ceiling (mine; no study read tests it). The systemic `setCircViscosity` exponent 0.6 is a fit to the whole fall of systemic resistance, not a viscosity relation (§2.2; a finding for the blood plan, §7) |
| Hypothermia | **in** (demand during low flow); the EEG's cold slowing **existing** (`cortexStep`); drug clearance **existing** (drug layer); no term on recovery after return (decided, §9.1 item 5); consciousness below 28 °C **attachment**; protection by immediate cooling and harm from fever: the injury state's **placeholders** (§1.3.7) | demand is existing code; the LOC temperature needs its source read; no source sizes a recovery term per degree |
| The vasomotor centre's perfusion gate (sympathetic outflow, endocrine sympathetic drive, sweating and shivering) | **in**, piece B5c | `brainstemOutF` reads the brainstem entry's delivery instead of flow; its three readers are unchanged (§1.4) |
| Drugs lowering CMRO2 | **in**, through `b.cmro2Rel` | existing code; the index → `cmro2Mult` coupling is kept as ruled |
| Anaesthetics and the critical flow | **planned**, piece B9, blocked | the slowing values are sourced (§2.2); the flattening level and the dose relation are not |
| Glucose | **in**, piece B8 | the endocrine glucose state exists; retires `GLYCO_U`'s consciousness term |
| Chest compressions | **read** (B3b, B7a) | the haemodynamic model's `hs.cpr`; no new copy of the compression state |
| Cushing response to raised ICP | **unchanged** | `stepCushing` responds to intracranial hypertension only, by design (a low CPP from systemic hypotension is the circulation's business) |
| CNS ischaemic response (sympathetic drive from medullary ischaemia) | **named attachment** | the coupling is already declared absent (`organs.absent.brainstemToHub`); the brainstem entry's `fn` (B7b) is its natural input. Out of scope because the one sympathetic state it would drive is the autonomic plan's |
| Raised ICP | **attachment point only** | CPP already includes ICP, so delivery falls with it; herniation stays the organ model's rule. B2a raises CBV with CBF in anaemia and so moves ICP a little; reported in B2a |
| Reflow under compressions falling with the no-flow time; post-ischaemic hypoperfusion | **named attachment** | real (Shaffner 1999, Lee 1989 under CPR; delayed hypoperfusion after reperfusion), but it would couple function or debt to flow (§1.5.2); it belongs to the circulation and the cerebral vessels |
| Regional flow, territories | **attachment** (V0) | one global CBF; the brainstem's better flow under CPR (Shaffner) waits for it |
| Pupils, brainstem reflexes | **attachment** | no display reads them; `pupilMm` is published only |
| Seizures and myoclonus | **attachment** (the EEG plan's seizure pieces and the convulsion's muscle) | the sources place the signs in the slow phase (van Dijk); building them needs the muscle/EMG burst source, not this state |
| Evoked potentials | the EEG plan | drug silence and death must differ there (Miller Ch35 p. 1113), which the debt and injury state make possible |

---

## 4. MANUAL and MODELED

- **The state runs in both modes.** The organ model is stepped in MANUAL; so is `stepBrain`, so the energy state is
  always current.
- **MODELED:** every reader acts.
- **MANUAL:** targets are the patient; physiology overrides a target when it forces one, with the override flag (as
  "pulseless → no SBP" and the MANUAL breathing gate do).
  - Consciousness: an ischaemic patient becomes unconscious in MANUAL. Nothing in MANUAL sets consciousness, so there is
    no target to override; the override flag is not needed.
  - Breathing: the instructor's rate passes through the brainstem gate; B5, B5b, B5c and B7a change what the gate
    reads, when it is stepped and what it produces (continued breathing, gasps, apnoea), not how MANUAL applies it. In
    the gasp phase the instructor's rate is replaced by the gasp pattern, with the override flag, as the gate's apnoea
    overrides it today. Whether the patient gasps is the same draw or setting in both modes (B7a).
  - The brainstem's no-flow timer runs on the organ model's clock in both modes from B5b. Until then it advances on
    the gas grid (0.1 s) in MANUAL and at 1 Hz in MODELED only while the spontaneous drive is evaluated (source
    spontaneous, ventilator or external): during bag ventilation in MODELED it stands still (58 s against 79 s in
    MANUAL in the recorded courses of B5's `arrest-breathing` fixture).
  - EEG: the cortex reads `metabolic` from the state. **A held EEG pattern (MANUAL-depth plan) holds its own
    `CortexInputs`, including `metabolic`**, so a chosen pattern stays exactly what was chosen; the body (consciousness,
    breathing) still reads the real state. The hold forks only the EEG's read, as that plan requires.
  - A hand-set depth index (MANUAL-depth plan) is shown as set; the instructor's row shows what the trace reads. An
    arrest under a held "BIS 45" therefore shows 45 on the bedside and "trace reads N" to the instructor, as that plan
    rules for any disagreement.
  - Artefacts: EMG, blinks and the compression artefact follow the real state in both modes (the artefact path stays
    live under a held pattern, per that plan).

---

## 5. Sources

**How they were read.** Abstracts through the Europe PMC REST search service (JSON, read in memory). Open-access full
texts through Europe PMC's `fullTextXML` service, read in memory and searched by phrase; the PMC article pages refused
automated reading with a bot check and were not used. Queries carried title words and identifiers only. **No file was
downloaded.** The evidence checks are `research/81-evidence-brain-under-arrest-and-cpr.md` and, for temperature after
the return of circulation, `research/85-evidence-temperature-and-recovery-after-return-of-circulation.md` (which also
used NCBI's E-utilities `efetch` for PMC full texts where Europe PMC answered HTTP 500). Eight articles on the anaemic
flow rise and the reserve (Brown 1985, Willie 2012, J Clin Anesth 2005, Cerebrovasc Dis 2000, Tomiyama 1999, Todd
1994, Rebel 2003, Harper & Glass 1965) were read in full from published copies kept outside the repository, their
tables from the page images where the scan's text layer was poor; values read off a figure are marked so, with the
reading error the notes state (research notes 90a and 90b).

### 5.1 What the evidence did to each number

| Plan number | Before | After | Source |
|---|---|---|---|
| A1 isoelectric 11 ± 2 s; red on main | stands | stands; de Vries 1997's 12 ± 4 s added | de Vries 1998, 1997 [ABS] |
| A2 LOC band ≤ 30 s | must-hold | stands as must-hold; target 7–18 s added | Wieling 2009, Sauvageau 2010 [ABS] |
| Q4 LOC threshold | proposal ≈ 0.32 on the fitted midpoint | ruled: 1/3 of normal delivery, own constant `DO2_LOC`; the 60 % option is contradicted (no change at Hb 7, where delivery at unchanged flow is ≈ 0.5) | Njemanze 1991, Astrup 1977, van Dijk 2014, Weiskopf 2000 [ABS] |
| Anaemia: no CBF rise; LOC at Hb ≈ 4.3 | named attachment | **changes: built, B2a, before B2**; LOC from anaemia alone moves far below the sourced range | Brown 1985 [FT]; Mühling 1999, Tu 1996, Todd 1992, Weiskopf 1998/2000/2002, Lieberman 2000 [ABS] |
| §1.5.1 anaesthetic-specific critical CBF | WANTED | sourced for the slowing level; piece B9, blocked on the flattening level | Michenfelder 1987, Messick 1987, Grady 1998 [ABS] |
| A6 continued breathing in minute 1 | proposal | stands | Zuercher 2010 BMC [FT]; Menegazzi 1995 [ABS] |
| A6 gasps in minutes 2–5, < 3/min | proposal | changes: start ≈ 1–2 min, peak minutes 3–5; rate a range by anaesthetic, < 3/min (isoflurane), 2–5/min (IV), 6–11/min (α-chloralose), 3.7/min in intubated humans under CPR | Zuercher BMC [FT]; Tongying 2015, Lin 2023, Menegazzi 1995, Wolfskeil 2017, Srinivasan 2006 [ABS] |
| A6 gasp VT ≤ 0.3 × rest [FIT] | engine rule | retired: larger than rest in pigs (0.62 ± 0.19 L; 502–852 mL); 274 mL median in intubated humans under CPR | Lin 2023, Menegazzi 1995, Wolfskeil 2017 [ABS] |
| A6 apnoea by 2 min (engine) / 6 min (proposal) | ruled on main / proposal | changes: by 6–7 min, a few animals to 8 min | Zuercher BMC [FT]; Menegazzi 1995, Tongying 2015 [ABS] |
| A8 waking under CPR | known miss | confirmed as a miss; the dependence on no-flow time is B6b's (as a direction at equal delivery); flow falling with no-flow time is an attachment, and until it exists waking under CPR stays a known miss, reduced; the BIS-rise reports no longer cited as evidence of repayment | Reagan 2018, Olaussen 2017, Shaffner 1999, Lee 1989, Bircher 1980 [ABS]; Kim 2020 [FT] |
| A8 Hossmann's 40 mL/100 g/min vs BIS reports | stated conflict | re-stated against Shaffner 1999 (ATP 2–60 % by delay at the same perfusion pressure); no conflict left to rule (mine): both say recovery under recirculation is limited after a long insult | Hossmann 1988, Shaffner 1999 [ABS] |
| A9 gasps under CPR | qualitative | numbers: 21.1 / 8.4 per min (continuous) and 15.4 / 1.1 (30:2) after 3–4 / 5–6 min of VF | Zuercher 2010 CCRP [FT] |
| §7 compression artefact | attachment, no source | sourced; piece B3b | Kim 2021 [FT]; Nitzschke 2012, Fatovich 2006 [ABS]; Sethi 2008 [SEC] |
| R1 17 ± 9 s | cell | stands; relation to arrest length and no cumulation added; Plaschke's 5 min added | de Vries 1997, Vriens 1996, Plaschke 2006 [ABS] |
| Q2 middle of the curve | no source | animal points placed (§2.3); the human curve between 1 and 20 min stays [P] | Chen 2013, 2019, Jia 2008 [FT]; Cerchiari 1990, Lin 1977, Schmidt-Kastner 1986, Jørgensen 1981 [ABS] |
| R5 awakening | Elmer only | three cohorts: 46–65 h, 3.2 days, day 2; none relates to no-flow time | Elmer 2023 [FT]; Grossestreuer 2013, Fugate 2011 [ABS] |
| R6 cooling after return | conflict, open question | **decided: no temperature term on recovery**; the sign changes with species and end point and no source sizes a term per degree; protection by immediate cooling and harm from fever become the injury state's placeholders | research note 85: Chen 2013, Jia 2008 [FT]; Lybeck 2018, Annborn 2023, Thoresen 2010, Kuboyama 1993, Zeiner 2001, Hickey 2003 [ABS] |
| `Q10_BRAIN` 7 %/°C, floor 0.3 | [P], "tables" | sourced for 33–37 °C; below about 28 °C the line departs from the measurements (finding for the organ tables, not changed) | McCullough 1999, Michenfelder & Milde 1991 [ABS] |
| P6 Chen 2013 cooled times | stated as at 33 °C | first burst during cooling, continuous background during rewarming; not a steady-33 °C measurement | Chen 2013 [FT] |
| P8 Jia 2008 | [ABS] | [FT]: unsedated, continuous earlier when cooled while still cold; figures not read | Jia 2008 [FT] |
| A6 incidence of gasping | "B7a gasps always [P]" | **decided: by chance**, 46 % cardiac / 32 % other causes, or set by the instructor or the scenario | Clark 1992 [ABS] |
| Mühling's slope (per haematocrit point) | stop and ask if Mühling's full text is unread | the per-point reading fits the abstract's means (k = 0.683 in a power form); now one candidate of §9.2 item 3, not the working size; full text still WANTED | Mühling 1999 [ABS] |
| B2a's reference Hb | 14 (assumed default) | **decided: the patient's own normal** (15 for the adult man, each band its own); every default patient unchanged | the blood model's `BAND` (decision) |
| The delivery reference | Hb 14 for every patient | **decided: the patient's own normal**; a healthy default patient rests at delivery 1 (B2d) | decision |
| The anaemia factor below the lower limit and under CPR | the whole factor multiplied in | **changes:** one regulated dilation spent from the shared reserve, adding nothing at maximal dilation; no content/viscosity split (not established in people, and the animal shares do not add) | Brown 1985, Tomiyama 1999, Todd 1994 [FT]; BMJ 1982, Hudak 1986, 1987 [ABS]; Borzage 2016, Hoiland 2016, Vaclavu 2019 [FT] (research notes 90, 90b) |
| The animal content share "40–60 %" | the abstract's range | stands as a range, now explained: 44 % of the rise as measured, 61 % adjusted to equal MAP; the viscosity share is the remainder by subtraction; PaO2 3,300 calculated; no test of a direct hyperoxic action | Tomiyama 1999 [FT], pp. H1192–H1195 (note 90b §2) |
| The size of the rise | k = 0.683 (Mühling's means) | **working size, not settled:** the pooled human slope, 0.66 % per 1 % content fall, linear (four studies including Mühling's), pending §9.2 item 3; every other source read lies above it below Hb ≈ 12 (§2.2 table) | Hoiland 2016 [FT]; Mühling 1999 [ABS]; Brown 1985, J Clin Anesth 2005, Todd 1994, Tomiyama 1999, Rebel 2003 [FT] |
| Brown 1985's relation | expected to give the slope | **no equation printed**; straight (r −0.855) and reciprocal (r 0.831) fit about equally; chronic, awake, PaCO2 and MAP uncontrolled; lines read off the figures only | Brown 1985 [FT], pp. 83–87 (note 90a §1) |
| The 2005 velocity rise after haemodilution | +122 % / +156 %; +135 % at MAP ≈ 55 | **corrected: to 122 % / 156 % of baseline, rises of +22 % / +56 %; 135 % of baseline (+35 %) at MAP ≈ 55** | J Clin Anesth 2005 [FT], p. 179 and Fig. 1 (note 90a §3) |
| The reserve's ceiling at normal pressure | 1.40 against the dogs' 1.52 | **every figure of the two human reserve studies read in full lies above 1.40**, and only the PET value lies at it: acetazolamide × 1.39 (PET, 15 mg/kg) to × 1.79 (Xe-133, 18 mg/kg, n 6, each dose step still significant); CO2 × 1.5 (ICA flow at PaCO2 ≈ 49, MAP not significantly changed), ICA conductance × 1.85 at PaCO2 ≈ 58; no study shows a plateau; the dogs' 1.52 (MAP 100) and 2.11 (≈ 150, the dogs' normal) lie inside the measured scatter, relative to each dog's own flow at PaCO2 40 at that pressure; open (§9.2 item 1) | Zhao 2021, Vaclavu 2019, Willie 2012, Cerebrovasc Dis 2000, Harper & Glass 1965 [FT]; Gersten 1999 [FT] (notes 90a §2, §4; 90b §5) |
| The anaemia factor's lower hold | 4.8 g/dL (Lieberman 2000) | **5.7 g/dL** (Brown 1985's cerebral range; about six subjects below 8 g/dL); Lieberman's is a systemic measurement | Brown 1985 [FT]; Lieberman 2000 [ABS] |
| The CO2 response of flow after dilution | not known whether measured | **measured** (microspheres) in cats at Hct 19 %: about +360 % against +400 % in controls, not different; printed only as a percent of an unstated reference; no absolute flow | Rebel 2003 [FT], Fig. 4 p. H1604 (note 90b §4) |
| A shared vasodilator reserve | attachment | **piece B2v** (pull request 188's form, rebuilt) | Harper & Glass 1965 [FT]; Okuda 1976, Gregory 1981, Paulson 1990 [ABS] |
| R7 reopening 2 min | ruled rule on main | stays [P]; order sourced | Jørgensen 1997, Cerchiari 1990 [ABS] |
| B7 brainstem tolerance | BLOCKED | stays BLOCKED for the `{ store, fn, debt }` form (B7b); the time course is buildable without it (B7a) | none found |
| F = 0.55; store ≈ 6 s | [P]; [INF] | unchanged (not in the note) | — |

### 5.2 The sources

| Source | Read | What it gives the plan |
|---|---|---|
| Miller's Anesthesia 10th ed., Ch35 pp. 1105, 1113, 1122, 1126, 1127; Ch10 pp. 211, 219; Ch36 p. 1142; Ch71 p. 2254 | as cited by the engine's own constants and the EEG plans (the book is the engine's reference) | thresholds 20/50 and 12/50; order slowing → voltage loss; hypoxaemia via flow; glucose thresholds; LOC below 28 °C |
| Clute & Levy 1990, Anesthesiology 73:821 (PMID 2240671) | [ABS] | EEG change at mean 10.2 s in 82 of 93 |
| de Vries et al. 1998, Anesth Analg 87:16 (PMID 9661538) | [ABS] | isoelectric 11 ± 2 s; recovery 17 ± 9 / 22 ± 12 s; O2 uptake lags EEG |
| de Vries et al. 1997, J Clin Monit (PMID 9338844) | [ABS] | EEG change 12 ± 4 s; recovery in proportion to arrest duration |
| Vriens et al. 1996, EEG Clin Neurophysiol (PMID 8641146) | [ABS] | arrest–recovery correlation; no cumulation |
| Plaschke et al. 2006, Br J Anaesth (PMID 16415312) | [ABS] | EEG power normal within 5 min after 18–58 s asystole |
| Pana et al. 2016, J Crit Care 34:77 (PMID 27288615) | [ABS] | EEG lost < 30 s; LOC < 30 s |
| van Dijk et al. 2014, Brain 137:576 (PMID 24343112) | [ABS] | LOC in the first slow phase |
| Wieling et al. 2009, Brain (PMID 19587129) | [ABS] | LOC in as little as ≈ 7 s |
| Sauvageau et al. 2010, J Forensic Sci (PMID 20487156) | [ABS] | LOC at 8–18 s; respiratory movements to 1–2 min (asphyxial) |
| Lempert et al. 1994, Ann Neurol (PMID 8053660) | [ABS] | myoclonus in 90 % of complete syncopes; LOC lasting 12.1 ± 4.4 s |
| Aminoff et al. 1988, Ann Intern Med 108:791 (PMID 3369769) | [ABS] | LOC and motor activity in ICD-test VT/VF; LOC before EEG change in 5; confusion < 30 s |
| Njemanze 1991, Aviat Space Environ Med (PMID 1859345) | [ABS] | MCA velocity 68 % below baseline at syncope |
| Diehl et al. 1996, Clin Auton Res (PMID 8726090) | [ABS] | diastolic velocities near zero at syncope |
| Astrup et al. 1977, Stroke (PMID 13521) | [ABS] | electrical failure ≈ 15 mL/100 g/min, ≈ 35 % of control (baboons) |
| Heiss et al. 1983, Ann Neurol (PMID 6314871) | [ABS] | neuronal activity ceased at ≈ 0.18 mL/g/min (cats) |
| Jones et al. 1981, J Neurosurg (PMID 7241187) | [ABS] | reversible paralysis below ≈ 23 cc/100 g/min (awake monkeys) |
| Michenfelder et al. 1987, Anesthesiology (PMID 3631608) | [ABS] | critical CBF: isoflurane ≈ 10, halothane ≈ 20, enflurane ≈ 15 |
| Messick et al. 1987, Anesthesiology (PMID 3826693) | [ABS] | isoflurane–N2O < 10 (5.9 ± 1.2) |
| Grady et al. 1998, Anesthesiology (PMID 9579496) | [ABS] | sevoflurane rCBF50 11.5 ± 1.4 |
| Leech et al. 1974, JNNP (PMID 4850939) | [ABS] | clamping safe above 40, unsafe below 20; EEG slowing with low CBF, with exceptions |
| Hans 2007, J Vasc Surg (PMID 17275248); Calligaro 2005 (PMID 16242555); Mulaudzi 2009 (PMC3721289) | [ABS] | awake CEA: EEG found ischaemia in 59.4 % of those needing a shunt; deficits incl. LOC by stump pressure |
| Weiskopf et al. 1998, JAMA (PMID 9438742); 2000, Anesthesiology (PMID 10839915); 2002, Anesthesiology (PMID 11964594) | [ABS] | conscious at Hb 5; deficits at 6 and 5; reversed by O2 |
| Lieberman et al. 2000, Anesthesiology (PMID 10691227) | [ABS] | Hb 4.8 without inadequate systemic oxygenation |
| Brown et al. 1985, Brain 108:81 (PMID 3978400, DOI 10.1093/brain/108.1.81) | [FT] (scan, 13 pp.) | 54 awake people, Hb 5.7–19.1, chronic anaemia or polycythaemia (p. 83, Table 1 p. 82); CBF against CaO2 r −0.855 (Fig. 1) and against 1/CaO2 r 0.831 (Fig. 2), no equation printed; O2 transport against Hb r 0.044 (Fig. 3, pp. 85–86); after content, viscosity, PaCO2, age and MAP add nothing (Table 2, p. 87); PaCO2 and MAP not controlled (p. 83) |
| *What the anaemic flow rise is made of* | | |
| Todd et al. 1994, Am J Physiol 267:H2025 (PMID 7977834) | [FT] (scan; tables from the page images) | rabbits, pentobarbital, 39 °C: CaO2 lowered to matched steps by hypoxaemia or hetastarch dilution; whole-brain CBF flat to CaO2 ≈ 13 in dilution, then rising (Table 1, p. H2027); less flow in dilution than in hypoxaemia at equal CaO2; cerebral DO2 falls in dilution, offset by extraction (Table 2, p. H2028); viscosity not measured (p. H2030) |
| Tomiyama et al. 1999, Am J Physiol 276:H1190 (PMID 10199842) | [FT] | rats, pentobarbital: CBF 79 / 123 / 104 / 125 (control, diluted, diluted with content restored by 5 atm O2, diluted hyperbaric normoxia; Table 1 p. H1192, text p. H1192); content share 44 % of the rise, 61 % adjusted to equal MAP, viscosity the remainder (pp. H1193–H1194); whole-blood viscosity 4.53 → 2.54 cP, plasma 1.32 → 1.67 cP (p. H1193); PaO2 calculated |
| Rebel et al. 2003, Am J Physiol Heart Circ Physiol 285:H1600 (PMID 12816746) | [FT] | cats, pentobarbital + fentanyl, exchange to Hct ≈ 19 %: resting flow up about 75 % with albumin, O2 transport kept (Fig. 2, p. H1603); flow (microspheres) to hypercapnia about +360 % against +400 % in controls, not different, attenuated with raised plasma viscosity or cell-free Hb (Fig. 4, p. H1604), as a percent of an unstated reference, no absolute flow printed; pial dilation to hypercapnia kept; hypocapnic constriction blunted in every transfused group (p. H1604); plasma viscosity only (Table 2, p. H1603) |
| Hudak et al. 1986, Am J Physiol (PMID 3728699); Hudak et al. 1987, J Appl Physiol (PMID 3571067) | [ABS] | newborn lambs (unanaesthetised) and sheep (anaesthetised), as haematocrit **rose**: red cell concentration at unchanged CaO2 accounts for 56 % and ≈ 60 % of the CBF fall; viscosity "probable", not measured |
| Am J Physiol 1992 (PMID 1566914) | [ABS] | cats: CBF 140–90 % over Hct 60–120 % of baseline; in-vivo viscosity, not large-artery dilation; pial constriction after haemodilution |
| Ric Clin Lab 1985 (PMID 4035219) | [ABS] | 4 patients with paraproteinaemia: plasmapheresis lowered **plasma** viscosity at constant Hct, CBF +24.4 mL/100 g/min (disputed: BMJ 1982, no change in 8) |
| J Clin Anesth 2005;17:177 (PMID 15896583, DOI 10.1016/j.jclinane.2004.06.017) | [FT] | 30 hip-arthroplasty patients, N2O + sevoflurane, PaO2 > 200, PaCO2 38–40: MCA velocity to 122 % / 156 % of baseline after dilution to Hct 33 / 25 % (+22 % / +56 %), 135 % of baseline at MAP ≈ 55 under PGE1 (p. 179, Table 2 and Fig. 1); the abstract's "+122 %" / "+156 %" misstate it; velocity only, baseline ≈ 44 cm/s read from the figure |
| Acta Anaesthesiol Scand 2006 (PMID 16879470) | [ABS] | humans: lower rSO2 with esmolol hypotension and haemodilution |
| Anesthesiology 1986 (PMID 3789433); Acta Anaesthesiol Scand 2007 (PMID 17944636) | [ABS] | monkeys: injury with Hct < 20 % and MABP < 40; rats: CA1 damage with Hct ≤ 20 % and MAP 50–60 |
| Harper & Glass 1965, J Neurol Neurosurg Psychiatry 28:449 (PMC495935) | [FT] (scan) | 41 dogs, 302 measurements, thiopentone then N2O, cortical 85Kr clearance: each point as a percent of that dog's own flow at PaCO2 40 at its own pressure, absolute flows not printed (p. 450); PaCO2 40 → 80 raised flow about 100 % at the "normotensive" ≈ 150 mmHg, "only 50 %" at MAP held at 100, nothing at 50 (pp. 450–451, Figs 1–3); highest single points about × 2.2 and × 1.75 (read from the figures) |
| Gersten 1999, arXiv physics/9911029, fitting Harper & Glass 1965 | [FT] (the fit) | dogs: fitted asymptotes B(∞) 2.112 / 1.518 / 0.997 at MAP 150 / 100 / 50, relative to the normocapnic flow at the same pressure; ± set by the fitter; the 50 mmHg fit constrained; 2.11 and 1.52 lie inside the 1965 scatter, at or just above the authors' plateaus (note 90b §5), not far extrapolations |
| Okuda 1976; Gregory 1981; Paulson 1990 | [ABS] as read by pull request 188 | CO2 response abolished at low pressure; the limits move with CO2 |
| Borzage et al. 2016, J Appl Physiol (PMC4835904) | [FT] | 45 people, measured viscosity: content the strongest predictor of CBF; no viscosity effect after correction for content |
| Hoiland et al. 2016, Am J Physiol Regul Integr Comp Physiol (PMC4796739) | [FT], review | pooled human haemodilution 0.66 % CBF per 1 % fall of CaO2 (mean line over four studies weighted by n; per-study slopes and ranges plotted, not stated), against 1.85 % in hypoxaemia; humans argue against an appreciable viscosity role |
| BMJ 1982;284:1733 (PMID 6805689) | [ABS] | plasma exchange in 8: viscosity down, no change of CBF |
| Vaclavu et al. 2019, Haematologica (PMC6442969) | [FT] | acetazolamide (16 mg/kg, ASL): controls +69.5 %, sickle-cell anaemia +34.1 %, "utilize half of the cerebral vasodilatory reserve" |
| Zhao et al. 2021, NeuroImage (PMC8272558) | [FT] | acetazolamide (15 mg/kg), 15O-water PET, 19 healthy adults: whole-brain +39 % (SD 19) |
| Battisti-Charbonney et al. 2011, J Physiol 589:3039 (DOI 10.1113/jphysiol.2011.206052; PMC3139085) | [FT] | MCA flow velocity (not flow) in 16 volunteers: sigmoid maxima 80 / 78.9 % hyperoxic and 101 / 101.7 % hypoxic (right / left), counted from the mean minimum during 5 min of hyperventilation, not from rest; the resting end-tidal PCO2 is not reported; the abstract's +108 % excludes four of the 16 subjects (Table 1) |
| Grossmann & Koeberle 2000, Cerebrovasc Dis 10:65 (PMID 10629349) | [FT] | 59 healthy or CNS-excluded people, Xe-133 fast flow F1, standardised to PaCO2 36.5: rest 70.8; 98.5 / 109.7 / 118.6 / 127 at 10 / 13 / 15 / 18 mg/kg acetazolamide (× 1.39 / 1.55 / 1.68 / 1.79), each step significant including 15 → 18, so no plateau shown (p. 66, Fig. 1 p. 67); n 6 at 18 mg/kg, all with severe side effects (Table 1, p. 67); BP slightly lower (p. 68) |
| Kety & Schmidt 1948, J Clin Invest 27:484 (PMC439519) | [FT] (page scans) | 8 studies in healthy young men, N2O method, 5 % CO2 (6) or 7 % (2): whole-brain flow 53 → 93 mL/100 g/min, mean (Table II p. 486), arterial PCO2 43 → 52 mmHg (Table I p. 485), direct MAP 82 → 93 mmHg (Table III p. 487; "rose significantly", p. 491); no plateau shown (Fig. 3 p. 490) |
| Willie et al. 2012, J Physiol (DOI 10.1113/jphysiol.2012.228551; PMC3459041) | [FT] (early online pagination) | 16 healthy young adults, end-tidal forcing, duplex ICA and VA flow: ICA flow 222 → 341 mL/min at PaCO2 49 (× 1.54, MAP 82 → 87, not significant), → 482 at 58 (MAP 94), → 489 at 62 (MAP 100, n 3); ICA conductance up to × 1.85 at 58 (Table 1, p. 6); the authors cannot separate PaCO2 from the MAP rise (p. 13) |
| Secomb & Pries 2013, C R Physique (PMC4117233), giving Pries 1992; Trejo-Soto 2022, Micromachines (PMC8954080) | [FT] | blood viscosity against haematocrit and vessel diameter, not a power law; rises at low shear |
| Mühling et al. 1999, Can J Anaesth (PMID 10391602) | [ABS] (the full abstract's means) | 2 % CBFV per 1 % fall in Hct and CaO2; means Hb 14.5 → 10.3, Vm-MCA 61.2 → 77.3 cm/s (the candidate power form of §9.2 item 3 takes k = 0.683 from them) |
| Tu et al. 1996, Stroke (PMID 8610310) | [ABS] | rCBF +35 % at 3 h of haemodilution |
| Todd et al. 1992, Am J Physiol (PMID 1379006) | [ABS] | rat CBF 78 → 171 from Hct 43 to 20 % |
| Grocott et al. 2009, NEJM (PMID 19129527) | [ABS] | conscious at PaO2 24.6 mmHg, acclimatised |
| Kurita et al. 2012, J Trauma Acute Care Surg 72:1614 (PMID 22695430) | [ABS] | BIS falls suddenly at MAP 22 ± 3; isoelectric before CPR |
| Aprea et al. 2014 (PMID 24400814); Azim 2004 (PMID 15144304) | [ABS] | BIS 0/SR 100 in asystole; BIS during CPR (artefact-confounded) |
| Jung 2013, Korean J Anesthesiol (PMC3558654); Pawlik 2008, Int J Emerg Med (PMC2657270) | [FT] | BIS 40–60 through ≈ 50 min of CPR; BIS 87/78 with SR 0 under CPR with drugs given (artefact-confounded) |
| Reagan et al. 2018, Crit Care Med (PMID 29419558) | [ABS] | suppression 78 % of CPR time; rSO2 bands |
| AWARE-II 2023, Resuscitation (PMID 37423492) | [ABS] | normal-looking EEG 35–60 min into CPR in some; disputed (PMID 38220416) |
| Kim et al. 2020, Sensors (PMC7313692); Kim et al. 2021, Sensors (PMC8197348) | [FT] | EEG return at ≈ 40 % carotid flow after 1 min VF; compression artefact > ±50 µV |
| Bircher et al. 1980, Crit Care Med (PMID 7363630) | [ABS] | external CPR 8–20 % carotid flow; EEG back with open-chest massage |
| Shaffner et al. 1999, Crit Care Med (PMID 10446829) | [ABS] | CBF and ATP under CPR by no-flow time; brainstem flow restored more |
| Eleff et al. 1992, Anesthesiology (PMID 1729940) | [ABS] | ATP 86 % by 6 min of CPR at pre-arrest flow |
| Lee et al. 1989, Resuscitation (PMID 2546227) | [ABS] | CPR CBF > 20 % only after 1 min no flow |
| Olaussen et al. 2017, Resuscitation (PMID 28161214); Zhou 2024, Emerg Med Int (PMC11455598) | [ABS]; [FT] | CPR-induced consciousness 0.7 %; 0.23–0.9 % |
| Tobin 2009, Anesth Analg (PMID 19843796) | [ABS] | consciousness at MAP 50 during arrest, one case |
| Fatovich 2006 (PMID 16378674); Chollet-Xémard 2009 (PMID 19058894); Nitzschke 2012 (PMID 20828974) | [ABS] | BIS under CPR is artefact; does not track EtCO2 |
| Sethi 2008 (PMID 18602746); Biesbroek 2018 (PMID 30105170) | [SEC] through Roberti 2023 | periodic CPR artefact, isoelectric between; EEG back seconds after compressions began |
| Roberti et al. 2023, Intensive Care Med Exp (PMC9852381) | [FT] | review of EEG during CPR |
| Hossmann 1988, Crit Care Med (PMID 3139367) | [ABS] | recovery needs recirculation CBF > 40 mL/100 g/min (cats); barbiturates did not help |
| Hofmeijer & van Putten 2012, Stroke (PMID 22207505) | [ABS] | ≈ 30 % of energy to synaptic transmission; synaptic failure first, may persist |
| Ching et al. 2012, PNAS (PMC3286963) | [FT-part]: main text; the SI not read | ATP-gated burst suppression; the EEG plan's metabolic burst-suppression piece reads `fn` |
| Zuercher et al. 2010, BMC Cardiovasc Disord 10:36 (PMC2928171) | [FT] | Table 2: breathing and gasps by minute of untreated VF |
| Zuercher et al. 2010, Crit Care Res Pract (PMC2951081) | [FT] | Table 1: gasps under CPR by VF duration and CPR mode |
| Menegazzi et al. 1995, Acad Emerg Med (PMID 8597915) | [ABS] | agonal breathing by minute, 6–11/min, VT 502–852 mL (α-chloralose) |
| Tongying et al. 2015, Zhonghua Wei Zhong Bing Ji Jiu Yi Xue (PMID 27318343) | [ABS] | first/last gasp 2.0 / 5.2 min; 3.7/min at minute 4 |
| Srinivasan et al. 2006, Resuscitation (PMID 16494991) | [ABS] | gasping in 13/13 under propofol; maximal at 202 s; gasps raise CPP |
| Ristagno et al. 2007, Resuscitation (PMID 17574323) | [ABS] | gasp frequency rising over 4 min; carotid flow per gasp ≈ 59 % |
| Lin et al. 2023, Shock 59:948 (PMID 37018832) | [ABS] | gasps 2–5/min, VT 0.62 L |
| Noc et al. 1994, Am J Respir Crit Care Med (PMID 8087362); Yang et al. 1994, Crit Care Med (PMID 8181300) | [ABS] | gasps under compressions to 19/min, none with ventilation; gasp rate with coronary perfusion pressure |
| Clark 1992 (PMID 1443844); Eisenberg 2006 (PMID 16672777); Bobrow 2008 (PMID 19029463); Wolfskeil 2017 (PMID 28583859); Debaty 2017 (PMID 28911510) | [ABS] | incidence of agonal breathing; human gasp volume and rate under CPR |
| Jørgensen 1997 (PMID 9259054); Jørgensen & Holm 1998 (PMID 9571727); Jørgensen 1981 Parts I and III (PMID 6454948, 7255954) | [ABS] | order of recovery; EEG course; human EEG time limits for waking |
| Cerchiari et al. 1990, Resuscitation (PMID 2154022) | [ABS] | brainstem potentials normal at 1 h, EEG not at 6 h (dogs) |
| Lin et al. 1977, Invest Radiol (PMID 885691); Schmidt-Kastner et al. 1986, Stroke (PMID 3810716) | [ABS] | EEG after 8–14 min (dogs) and 1 h (cats) |
| Chen et al. 2013, Biomed Res Int (PMC3867829); Chen et al. 2019, Biomed Res Int (PMC6815975) | [FT] | rat EEG milestones after 5 min, with and without cooling |
| Geocadin et al. 2002 (PMID 12413758) | [ABS] | bursting recovery (rats) |
| Ruijter et al. 2019, Ann Neurol 86:203 (PMC6771891); Westhall et al. 2016, Neurology (PMC4836886) | [FT] | prognostic EEG categories; TTM 33 vs 36 °C no effect on prediction |
| Elmer et al. 2023, Crit Care Med 51:503 (PMC10023349) | [FT] | awakening 46 / 65 h; arrest 19 / 15 min |
| Grossestreuer 2013 (PMID 23916554); Fugate 2011 (PMID 21900633); Lybeck 2018 (PMID 29371115); Annborn 2023 (PMID 37178902); Paul 2016 (PMID 27098348) | [ABS] | awakening times; 33 °C later than 36 °C |
| Magliacano et al. 2021, Sci Rep 11:22393 (PMID 34789832) | [ABS] | blink rate graded by level of consciousness |
| Guo et al. 2023, Ann Clin Transl Neurol (PMC10723251) | [FT-part]: methods and discussion | 7-min rat model; bursting evolving to continuous activity |
| *Temperature and recovery (research note 85)* | | |
| McCullough et al. 1999, Ann Thorac Surg (PMID 10391334) | [ABS] | human cerebral Q10 2.3; CMRO2 17 % of baseline at 15 °C |
| Michenfelder & Milde 1991, Anesthesiology (PMID 2064037) | [ABS] (truncated) | dogs: Q10 2.23 (37–27 °C), 4.53 (27–14 °C); burst suppression at or below 22 °C |
| Stecker et al. 2001 I and II, Ann Thorac Surg (PMID 11216734, 11216751) | [ABS] | EEG events by temperature in cooling; rewarming does not mirror cooling |
| Ann Thorac Surg 2018, neonatal swine and humans (PMC6330195) | [FT] | isoelectric at 22.4 °C, emergence at 27.3 °C (hysteresis) |
| Chen et al. 2013 (PMC3867829); Jia et al. 2008, Resuscitation (PMID 18597914, PMC2570264) | [FT] | rat EEG recovery earlier with immediate cooling, no sedation after the arrest; Jia: 33 / 37 / 39 °C |
| Jia et al. 2006 (PMID 16919609); IEEE TBME 2006 (PMID 16761828); IEEE TBME 2009 (PMID 19174339); Jia et al. 2008, Resuscitation (PMID 17936492) | [ABS] | qEEG recovery greater with cooling; immediate better than delayed; no qEEG change in sham rats at 33 °C |
| Leonov et al. 1990, J Cereb Blood Flow Metab (PMID 2298837); Kuboyama et al. 1993, Crit Care Med (PMID 8370299); Abella et al. 2004, Circulation (PMID 15159295) | [ABS] | protection by cooling after return when immediate; lost with a 15-min delay (dogs); intra-arrest cooling in mice |
| Mathew et al. 2001, J Clin Anesth (PMID 11435056); Levy 1984, Anesthesiology (PMID 6703384) | [ABS] | BIS −1.12 per °C; peak frequency 0.39 Hz/°C |
| Hostler et al. 2010, Drug Metab Dispos (PMC2872942); Bjelland et al. 2013, Drug Metab Dispos (PMID 23115086); Leslie et al. 1995, Anesth Analg (PMID 7726398) | [ABS] | midazolam clearance −11.1 %/°C; fentanyl, propofol, morphine clearance lower at 33–34 °C; propofol +28 % at 34 °C |
| Perfusion 2009 (PMID 19567545); Anesthesiology 2001 (PMID 11374601) | [ABS] | less propofol for the same BIS when cold; isoflurane MAC lower at 34 and 31 °C (children) |
| HACA 2002 (PMID 11856793); TTM 2013 (PMID 24237006); HYPERION 2019 (PMID 31577396); TTM2 2021 (PMID 34133859); CAPITAL CHILL 2021 (PMC8527358) | [ABS] | outcome by target temperature |
| Resuscitation 2016 (PMID 27036662); Resuscitation 2021 (PMID 34102268) | [ABS] | waking later with a lower target (with Lybeck 2018 and Annborn 2023, listed above: later at 33 than 36 °C, concentrations equal); benzodiazepines delay waking |
| Hofmeijer et al. 2015, Neurology (PMC4515041); J Intensive Care 2016 (PMC4818927) | [FT] | continuous EEG within about 11–12 h in good outcomes under 33 °C |
| Nutma et al. 2022, Resuscitation (PMID 35122892) | [ABS] | outcome by EEG class at 33 against 36 °C; pattern distribution by arm not in the abstract |
| Thoresen et al. 2010, Pediatrics (PMID 20566612); Hallberg et al. 2010, Acta Paediatr (PMID 20050830) | [ABS] | newborns: background normal by 48 h cooled against 24 h normothermic |
| Pediatr Neonatol 2014 (PMID 24440513) | [ABS] | newborn piglets after hypoxia–ischaemia: 4 of 9 head-cooled continuous normal voltage at 6 days, none normothermic |
| Zeiner et al. 2001, Arch Intern Med (PMID 11525703); Bro-Jeppesen et al. 2013, Resuscitation (PMID 23917079); Hickey et al. 2003, Crit Care Med (PMID 12576962) | [ABS] | fever after return: OR 2.26 per °C above 37 °C; HR 2.0 per °C above 36.5 °C; rat injury worse with fever at 24 h |
| Ergin et al. 1994 (PMID 8127108); Walpoth et al. 1997, N Engl J Med (PMID 9366581) | [ABS] | tolerance of circulatory arrest at deep temperatures (context) |

### 5.3 WANTED (each with what it settles)

- Losasso 1992, Anesth Analg 75:1021 (PMID 1443682): the first human EEG through asystole and CPR (A8).
- Biesbroek 2018 (PMID 30105170) full text: EEG return seconds after compressions, and the no-flow time before (A8).
- AWARE-II full text (PMID 37423492): how many showed delta/theta/alpha under CPR, at what rSO2 and after what no-flow
  time (A8).
- Shaffner 1999 full text (PMID 10446829): whether EEG or evoked potentials were recorded with the ATP (A8, B6b).
- Vriens 1996 (PMID 8641146) and de Vries 1997 (PMID 9338844) full texts: the regression of EEG recovery time on arrest
  duration in seconds (P2, P3, R1).
- Mühling 1999 full text: to confirm the per-haematocrit-point reading the abstract's means support (form B); a source
  for cerebral flow in people below Hb 5.7 g/dL (B2a's lower hold).
- Brown 1984, MD thesis, Cambridge (cited by Brown 1985): the regression coefficients the article does not print, the
  per-subject data, and the PaCO2 and MAP ranges (§2.2; §9.2 item 3).
- Rossen, Kabat & Anderson 1943, Arch Neurol Psychiatry 50:510 (not indexed): time to LOC on acute arrest of cerebral
  flow (A2).
- Sharbrough 1973 (PMID 4723697); Sundt 1981 (PMID 7266064); Trojaborg & Boysen 1973 (PMID 4118436): no abstracts
  indexed; the human CBF levels for EEG slowing vs flattening (A1, A2, B9's failure level).
- Astrup, Siesjö & Symon 1981 (PMID 6272455), no abstract: the flow-time thresholds.
- Njemanze 1991 full text: n and the velocity at presyncope (A2, §2.2).
- Chen 2018, Neurocrit Care (PMID 28484928): asphyxial vs VF rats, the cause-of-arrest comparison (§2.3).
- Jia 2008 (PMC2570264) figure data: the times to continuous EEG at 33, 37 and 39 °C; Jia 2006 (PMC3074257) and IEEE
  TBME 2006 (PMC3050568) full texts: the time courses after 5, 7 and 9 min (§2.3 R6; recorded, not built).
- Nutma 2022 (PMID 35122892) full text: the EEG patterns at 12 and 24 h in each arm, 33 against 36 °C, the closest
  human test of whether cooling delays a continuous EEG (§9.1 item 5).
- Lybeck 2018 (PMID 29371115) full text: median awakening per arm, time from arrest to sedation stop per arm, sedation
  by drug (§9.1 item 5: whether the drug layer can account for the later waking).
- Annborn 2023 (PMID 37178902) full text: concentration time course, sedation stop, distribution of awakening.
- Thoresen 2010 (PMID 20566612) full text: time to normal trace by arm and the sedation used.
- A study measuring the EEG time course and waking together under randomised post-return temperature, with sedation
  fixed or absent (none found in any species).
- A measurement of time to EEG silence after an abrupt arrest at 33–35 °C (the store at mild hypothermia, §1.3.3).
- Bjelland 2013 (PMID 23115086) full text: each group's temperatures and the concentration–time curves (the drug
  layer's slopes).
- Levy 1984 (PMID 6703384) full text: n and the anaesthetic for the per-degree EEG figures (the EEG plan's cold term).
- Michenfelder & Milde 1991 (PMID 2064037): the rest of the abstract and the text (EEG at 14 °C, recovery after
  rewarming).
- The TTM trial protocol's rewarming rate and sedation rules (whether the 33 °C arm stays sedated longer).
- A sized protection of the injury by immediate cooling after return, and a sized harm per degree of fever (the injury
  state's two placeholders, §1.3.7).
- For the glycine cell of the blood-fluids plan (§2.2): a measured brain-water gain per mOsm/kg in acute
  hypo-osmolality.
- For B7a: a human gasping incidence measured from the onset of arrest (the dispatch-tape incidences are what was
  observed by the time of the call or of the crew's arrival; Bobrow 2008 found it falling with the arrival time).
- A human source for recovery as a function of no-flow time between 1 and 20 min (the placeholder rows of §2.3).
- A source for the brainstem's no-flow tolerance in seconds or minutes, or for the time to the first breath after
  return as a function of no-flow time (B7b, R7).
- The weight of the pigs in Lin 2023 and Menegazzi 1995: gasp VT per kg (B7a).
- A study of gasping in unanaesthetised animals, or one comparing anaesthetics (B7a's awake row).
- A human source for loss of consciousness as a function of SaO2 or CaO2 in acute hypoxaemia (§2.2).
- **Decisive for the three open questions** (research notes 90a §7 and 90b §7 give what each settles):
  - the four studies pooled by Hoiland 2016 (Daif 2012, J Neurosurg Anesthesiol 24:19; Ekelund 2002, Acta Neurochir;
    Hino 1992, Stroke 23:423; Mühling 1999): each study's own slope, the range of content fall it reached and its
    measure (the review plots them and does not state them) (§9.2 item 3);
  - an acute isovolaemic haemodilution study in people measuring **volumetric** flow (phase-contrast MRI, or duplex
    ICA + VA) from Hb 14 to 7 at controlled PaCO2, awake and anaesthetised: the measurement that settles form and size
    for the acute cases (§9.2 item 3);
  - the human maximal reserve at a **clamped** MAP: hypercapnia with the pressure rise prevented, or acetazolamide at
    20 mg/kg or more with volumetric flow (the 22 and 25 mg/kg studies the 2000 article cites, Cotev 1968 and Sullivan
    1987) (§9.2 item 1);
  - the flow response to CO2 or acetazolamide after acute haemodilution in people, as absolute flow (§9.2 item 2);
  - Rebel 2003's absolute CBF at hypocapnia, recovery and hypercapnia in each group, and the reference of the percent
    in its Fig. 4: not printed; the authors' tables would decide §9.2 item 2 in a cat;
  - MCA diameter under haemodilution: whether velocity tracks flow there (the 2005 velocities, §2.2).
- Also wanted: Harper & Glass 1965's data tables, offered by the authors on request (absolute flows, PaCO2 and pressure
  per point and dog, the number of measurements per group, whether group I stayed near 150 mmHg); the input of
  Gersten's fit (the plotted points or the drawn curves); Todd 1994's fitted slopes above and below CaO2 12 (drawn
  only, Fig. 1); whole-blood viscosity with the dilution fluids, and Hudak 1986 (DOI 10.1152/ajpheart.1986.251.1.h63),
  Hudak 1987 (DOI 10.1152/jappl.1987.62.3.1090), Muizelaar 1992 (DOI 10.1152/ajpheart.1992.262.4.h949); BMJ 1982
  (PMC1498687); Battisti-Charbonney 2011: the resting end-tidal PCO2 and the sigmoid's equation as printed (to place
  rest on the fitted curve), and each subject's fitted parameters (Table 1 gives means only).
- Cerebral flow below the lower limit of autoregulation, or under chest compressions, with and without haemodilution
  (§2.2: that the regulated rise adds nothing there is the plan's inference from the shared reserve).
- A blood-viscosity relation with haematocrit and shear rate from a rheology source (Chien 1970, Merrill 1969 are cited
  by the engine and not read; Pries 1992 read through Secomb & Pries 2013 [FT] covers high shear): the systemic
  `VISC_EXP` and any brain viscosity term from one relation (§7).
- The reserve's ceiling as a function of pressure in people (§9.2 item 1): the dogs give its form (Harper & Glass 1965
  [FT]), at a normal pressure of about 150 mmHg; no human source read gives it.
- Hofmeijer & van Putten 2012 full text: the synaptic share (§1.3.4); the CMRO2 at an isoelectric EEG (F).
- Ching et al. 2012 SI: the ATP time constants, if the EEG plan's piece uses them.
- Miller Ch71 p. 2254's primary source for loss of consciousness below 28 °C.

---

## 6. The pieces

Every piece: tests first; a source beside each validation cell; the `run-validation` label (each moves or could move a
value under `packages/engine-core/src/**`); the regression rows (`eeg-baseline.json`, the depth, neuro, breathing,
organ and sanity rows) byte-identical unless the piece says which row moves and why, attributed to that piece. Plan
hours are estimates.

**Order.** B1 structure (on main), B5 brainstem relocated (on main) → **the anaemia set: B2v shared vasodilator reserve →
B2d the brain's delivery reference → B5c the brainstem reads delivery → B2a the flow rise with anaemia** → B2
consciousness → B3 artefacts and readers → B3b compression artefact → B4 arrest cells → B6a cortex store → B6b cortex
debt → B7a breathing re-sourced → B7b brainstem `{ store, fn, debt }` (BLOCKED on a source) → B8 glucose → B9
anaesthetic critical flow (BLOCKED on a source). B5b (the brainstem's timer and the arrest record) runs beside the
set and needs only B5.

**Why the anaemia set, and why in this order.** The flow rise is whole only when three things already stand: a shared
reserve, so that its regulated rise cannot dilate maximally dilated vessels (B2v); a delivery measured against the
patient's own normal, read at t = 0 (B2d); and a brainstem that reads delivery, not flow (B5c). B2v and B2d are each a whole
mechanism by themselves, with their own stated moves, and create no artefact without B2a, so each merges on its own,
in this order. **B5c and B2a land in one merge**: a brainstem that reads delivery with no flow rise yet would read every
normotensive anaemic patient as ischaemic (at Hb 7 and normal flow his delivery is ≈ 0.47 of his own normal and the
vasomotor gate reads (0.47 − 0.2) ÷ 0.4 ≈ 0.68; at Hb 5 ≈ 0.36; the gate starts to close below Hb ≈ 9, mine,
arithmetic), the mirror of pull request 512's artefact; and the flow rise without a brainstem reading delivery is
pull request 512's artefact itself. B5c is built on a branch from main after B2d, B2a on a branch stacked on B5c, and
the two land together, after B2v and B2d are on main; until then B5c's suite alone shows its own unit cells green and
the anaemic patients' rows moved toward ischaemia (listed, not merged), and B2a's suite on the stacked branch is read
against the whole set. After the four, no cell that
passed before fails, no artefact of the kinds found in pull request 512 is recorded into a regression window, and the
default patients' records move only for the causes each piece states. B2a must merge before B2 (the condition of the
consciousness decision). B3b needs B3. B7a needs B5b; it does not need B5c; its R2 cell needs B6b. B8 needs only B1
and may run any time after B4. B7b and B9 are blocked on sources.

| Piece | What | State (main 7320de53) | Advisor | Needs before it starts |
|---|---|---|---|---|
| B1 | Structure, moved, no change | **on main** (pull request 491) | design | — |
| B5 | Brainstem gate state relocated | **on main** (pull request 504) | none | — |
| B2v | Shared vasodilator reserve (pull request 188's mechanism, rebuilt, its normal-pressure ceiling one marked parameter) | not started | design | — (§9.2 item 1 sets the parameter's value, a data change) |
| B2d | The delivery reference is the patient's own normal; the t = 0 read | not started | none | — |
| B5c | The brainstem entry reads delivery; the vasomotor gate reads the entry | not started | design | B2d merged; lands in one merge with B2a |
| B2a | Anaemia's flow rise, one regulated dilation spent from the reserve | **in review**, pull request 512 (head b72d7b1b), to be reworked as §6 B2a says | design | B2v and B2d merged (its rework of everything but the form needs no ruling); §9.2 item 3 fixes its form, one function with its source data; items 1 and 3 answered before its cells are read; stacked on B5c and lands with it |
| B5b | The brainstem's no-flow timer on the organ model's clock, both modes; the arrest record | not started | design | B5 (on main) |
| B2 | Consciousness | not started | none | B2a merged (decided, §9.1 item 4) |
| B3 | Artefacts and readers | not started | none | B2 merged |
| B3b | Compression artefact in the EEG | not started | none | B3 merged |
| B4 | Arrest validation cells | not started | none | B3 merged (its A4 cell reads B3) |
| B6a | Cortex O2 store | not started | design | B4 merged (its A1/A2 cells re-read B4's rows) |
| B6b | Cortex debt and the recovery table | not started | design | B6a merged (decided, §9.1 items 2 and 5: no temperature term) |
| B7a | Breathing re-sourced on the brainstem entry, gasping by chance or by setting | not started | design | B5b merged (decided, §9.1 items 1 and 9); its R2 cell B6b |
| B7b | Brainstem `{ store, fn, debt }` | BLOCKED | design | a brainstem-tolerance source |
| B8 | Glucose substrate | not started | none | B1 (on main); after B4 |
| B9 | Anaesthetic critical flow | BLOCKED | none | a flattening-level and dose source |

### 6.1 What the built pieces found, and where each is answered

| Finding | From | Answered in |
|---|---|---|
| §2.2 and B2a assumed the default patient at Hb 14; the normal adult is at Hb 15, so the factor at a reference of 14 moved every default patient's brain rows | B2a (pull request 512) | the reference is the patient's own normal (§9.1 items 6 and 11; §1.5.5, §2.2, B2a) |
| The arrest-breathing record moved in three courses (d MANUAL 5 rows, c MODELED 4, d MODELED 12) on pull request 512's merged head | pull request 512's run | §6.3: the factor reads the default man's Hb drift through the arrest; both brainstem gates read flow; B2a lists the move |
| The haemorrhage case's own-output `cppAt60` row moved (23.31 against [15.03, 23.03]) | B2a | re-recorded with its cause after the reference decision; that one row only (§9.1 item 7; B2a) |
| The glycine ICP cell turned green through the flow rise, its brain water unchanged | B2a | not counted as passed; re-specified on brain water in the blood-fluids plan (§9.1 item 8; §2.2) |
| A surge target outside [0, 1] in `stepCushing` gave −Infinity and a NaN in the circulation after the return of circulation at Hb 5.3 | B2a | repaired inside pull request 512 (`l2/brain/cushing.ts` clamps the target); recorded in §6.2 |
| `brainstemOutF` reads flow, so a flow rise that only compensates a fall of content is read as plenty | B2a | B5c (§1.4, §1.5.6) |
| No upper hold of the anaemia factor above Brown's 19.1 g/dL | B2a | §2.2 (held there [P]; the rework or the next piece touching `flow.ts`) |
| No shared vasodilator ceiling (CBF × 4.05 at Hb 5 and PaO2 30) | B2a | piece B2v (no longer an attachment) |
| The gate's constants were said to "become its parameters" in B5; as built they stay in `spont.ts` | B5 (pull request 504) | §1.4: they stay until B7a retires the gasp rule and B7b moves the threshold and the reopening into the brainstem compartment's data |
| The no-flow timer stands still under bag ventilation in MODELED (58 s against 79 s) | B5 | B5b; B7a depends on it |
| The no-flow timer is deleted under compressions (CPR flow above 0.2, VF's no-flow flag false), so it is not "time since the loss of flow" | this revision, from the code | B5b's arrest record |
| The low-flow oximetry cell (PI < 0.3 once MAP < 30 in a 3 L bleed) newly failed through the flow-read chain and was marked as an expected failure, which then guards nothing | review of pull request 512 | B5c (delivery read) with B2v (no regulated rise below LL); the mark is taken back (B2a) |
| Dilution under CPR appears to raise the coronary perfusion pressure, and the value was re-recorded into `cppAt60`'s window | review of pull request 512 | B2v (no anaemia factor under compressions) and B5c; the re-record is taken back (B2a; §6.3) |
| The factor multiplies flow below the lower limit and under CPR | review of pull request 512 | B2v; the regulated rise is spent from the reserve (§2.2) |
| A patient set anaemic by hand starts at a factor of 1 and jumps at the first blood step | review of pull request 512 | B2d reads `pat.hb` and `pat.hbRef` at t = 0; a profile Hb is chronic, the plan's rule (§2.2); B2a settles the start's CSF displacement |
| The default man's EEG and arrest records moved with no cause written beside them | review of pull request 512 | every record's cause in its test header (§2.2, B2a) |
| The lower hold 4.8 is a systemic measurement, below the cerebral source's 5.7 | review of pull request 512 | hold at 5.7 (B2a) |
| `HB_REF` (delivery) and `hbRef` (patient's normal) share a name | review of pull request 512 | `HB_REF` retired by B2d |

### 6.2 What the pieces changed outside their own files

- **B1 (on main):** `brainDo2Rel` and the EEG's `metabolic` moved out of `l2/eeg/state.ts`; the couplings census and the
  mechanism tree's pins and labels gained the cortex's energy node.
- **B5 (on main):** `l2/resp/pipeline.ts` threads `RespCtx.brainstem`; `engine.ts` passes the entry to both
  `advanceResp` contexts and `engine.restore` upgrades old snapshots (`upgradeOrgans`); the controller's arrest course
  driver (`arrest-courses.ts`) is shared by `arrest-cortex` and the new `arrest-breathing` record; the census gains
  a ctx seam and the mechanism registry a node (draft label "Brainstem perfusion state").
- **B2a (in review):** `l2/brain/cushing.ts` clamps the Cushing surge target to [0, 1] (the NaN the flow rise exposed
  in severe anaemia after the return of circulation); `CAO2_REF` replaces the two `caO2(14, 0.97, 95)` literals in
  `energy.ts` and `model.ts`, values bit-identical; the census gains `organs.brain.anaemia`; the known-deviations and
  target-audit documents regenerate.

### 6.3 The cells the anaemia set moves, with what is expected before the engine is asked

- **The three cells most at risk from B2v** (each left its band when pull request 512's factor at a reference of 14
  lowered low-flow cerebral flow by only 4.6 %, and B2v lowers CPR flow by more, 0.496 → 0.405 on pull request 188's
  base): the tamponade-drainage ROSC (≤ 240 s; 198 → 250 then), the CPR-offset spread of the myocardial state (< 0.03;
  0.016 → 0.033 then) and the warm septic MAP (55–60; 56 → 54.9 then). **Expected (mine):** each moves the same way
  with B2v, through the vasomotor gate (lower cerebral flow in the 0.2–0.6 ramp, less sympathetic output), and may
  leave its band. **B2v's first step is to measure these three on the current main with and without the reserve, and
  if any leaves its band the piece stops and asks.** The mechanism at fault would then be the vasomotor ramp itself
  (0.2–0.6 on flow, [P], above the cortex's own abnormal level against the sourced order, §1.5.6), now parked behind
  the blocked B7b; the question is whether its re-sourcing joins the set. It is never "re-recorded with the reserve as
  cause", because the tamponade and septic bands are not the engine's own output.

Each expectation is the plan's (mine), from the mechanisms of §2.2 and the pieces; a source sets a band only where
named. If the engine disagrees with an expectation, the piece reports the mechanism; no band a source sets is moved.

- **The low-flow oximetry cell** (`fidelity-lowflow.test.ts`: once MAP < 30 holds for 20 s in a 3 L bleed over 15 min,
  PI < 0.3). The 0.3 is the device's LOW PERF threshold (`LOW_PERF_PI`, `l3/spo2/spo2.ts`; research/05 §6
  [S2], the monitor's instructions), an engineering and device value, not a physiological measurement. The audit
  judged the sibling cell on the tamponade case "TOO NARROW" (`target-audit.tsv` row 183: assert the device rule,
  LOW PERF whenever PI < 0.3, and allow a valid reading at MAP 20–30 while PI ≥ 0.3); that re-specification is the
  validation audit's, not a way to make this piece green. **Expected after the set:** below MAP 30 the CPP is far below
  the lower limit, so the regulated rise adds nothing (B2v); the
  brainstem reads delivery, which dilution lowers (B5c). Its sympathetic output is therefore at or below the undiluted
  patient's and below pull request 512's, and PI returns to below 0.3 as on main (direction; the size is not sourced).
  The cell passes as it did before B2a; it is not an expected failure.
- **The haemorrhage case's `cppAt60` row** (demo S5 haemorrhage; the coronary perfusion pressure 60 s into
  compressions). History, from its file: recorded as the prototype ± a stated tolerance, [15, 23] = 19 ± 4, "never
  widened"; when the card gained its rapid-sequence blocker it measured 23.03 and the window was shifted by the
  overshoot to [15.03, 23.03] rather than re-centred, which is why it sat at its top edge (23.02 on main before B2a).
  No source is cited for the row (§9.1 item 7). **Expected after the set:** under compressions the anaemia factor's request is spent
  from a reserve of 1 (B2v), so dilution no longer raises cerebral flow; B2v lowers the CPR cerebral flow itself (CO2 and
  hypoxic dilation no longer add flow below the lower limit), so the vasomotor gate reads less, the sympathetic tone and
  with it the relaxation-phase aortic pressure fall, and B5c reads the diluted patient's lower delivery under CPR, lowering the gate further, so `cppAt60` falls below
  main's 23.02, inside [15.03, 23.03]
  (direction; size not sourced). If B2v alone takes it outside the window, B2v re-records this own-output row once with
  its own cause; B2a does not re-record it.
- **The coronary perfusion pressure under compressions against its source band** (Paradis 1990, 15–25 mmHg; 24.7 at
  70 s on the measurement cited in `baroreflex.ts`). **Expected:** down with B2v (less cerebral flow under CPR, a lower
  vasomotor gate, less sympathetic tone), unchanged by B2d and B5c at the default man's normal content, unchanged by
  B2a (nil under compressions). Down from near the upper edge is toward the band's middle; if any piece takes it
  below 15, that piece stops and asks.
- **The default man's EEG record** (`eeg-baseline.json`). **Expected:** B2v byte-identical (the anaesthetised runs keep
  CPP inside the plateau and their dilating requests inside the reserve; a run where they do not is listed); B2d moves
  nothing in the EEG chain (the coupled flow's delivery stays above 0.40 at 1 or 1.07; PbtO2 and SjvO2 move and are
  listed); B5c moves the anaesthetised runs' sympathetic output slightly, because oxygenated content lies above the
  reference's (stated cause); B2a moves them only by the Hb drift under anaesthesia (≈ 1e-4 of flow), listed. `awake`
  stays bit-identical throughout.
- **The arrest records** (`arrest-cortex.json`, `arrest-breathing.json`, the witnessed-VF card's four courses in both
  modes, rounded to 1e-9, compared within the 9th significant digit). **What pull request 512 showed, read from its
  failed job's log (run 44138719076, `unit (controller)`):** the breathing gate's per-tick hash still matched in every
  course, so the brainstem's no-flow timer and reopening did not move; what departed were the drive and gas values, the
  first departing second of each field at 121–260 s, by about 1e-7 of their value (for example `resp.o2.pao2` at 121 s
  in course c MODELED, 122.173566901 against 122.173568074; `spont.vt` at 190 s in course d MODELED, 686.324574947
  against 686.324592849): course d MANUAL (5 fields), course c MODELED (4) and course d MODELED (12). Courses a and b
  (no flow throughout, where the factor multiplies zero) did not move. **The readers, from the code:** in MODELED the
  organ step copies `cbfRel` into the circulation (`organs/effects.ts`), so the vasomotor gate `brainstemOutF` moves the
  baroreflex's sympathetic output, the endocrine drive and, through `stepTemp`, sweating and shivering; in MANUAL that
  copy is not made, and the one reader is `stepTemp`'s `brainF: brainstemOutF(ctx.cbfRel)` in the resp pipeline, which
  runs in both modes (heat production → temperature → the metabolic VCO2 and VO2 → the gases → the drive). The courses
  that moved are those where flow sits inside the vasomotor ramp (c, under compressions) or climbs through it after the
  shock (d). **Why the factor departs from 1 (inferred from the code, not shown by a run):** the default man's Hb is the
  blood model's `hbOf(fluids)`, which moves with the plasma volume the Starling exchange (`l2/blood/fluids.ts`) moves as
  capillary pressures change through the arrest; no other change of pull request 512 reaches these readers in these
  courses (the Cushing clamp acts only during a surge; `CAO2_REF` is bit-identical; the t = 0 path gives a factor of 1
  for him on both sides of the first step). The sign and size of the drift need the run.
  **Expected after the set (mine, before any run):** B2v lowers cerebral flow under CPR (no CO2 or hypoxic dilation
  below the lower limit), which moves the cortex record (more suppression under compressions, later recovery) and the
  breathing record through the same readers as above, and may move the gate hash where flow now crosses 0.2 at a
  different tick (stated cause); B2d lowers the default man's delivery by 1/1.07 at every flow, which moves the cortex
  record (loss earlier, return later) and not the breathing record, whose readers still read flow (stated cause); B5c
  moves the breathing record, and its gate hash, wherever delivery and flow part: in course d MANUAL the saturation at
  256 s is 0.33, so delivery is far below flow and the breathing gate and the vasomotor gate both read a much poorer
  brainstem (stated cause); B2a then moves both records only by the Hb drift's factor where the reserve is not spent
  (before compressions with no flow it multiplies zero; under compressions the reserve is 1; after the return of
  circulation it acts), listed in each record's header with the Hb trace as cause. A move in course a or b, or one
  larger than the drift can explain, is a failure of the piece.

### B1. The structure: the cortex's energy entry, moved, with no change (plan 8 h · 1.0–1.3 executor-h). Advisor: design. **On main.**
- **What:** `l2/brain/energy.ts` with `BrainEnergy` and its cortex entry; `brainDo2Rel`, `DO2_EEG_ABNORMAL`,
  `DO2_EEG_LOST`, `METABOLIC_SLOW_SHARE` and the `metabolic` formula move from `l2/eeg/state.ts`; the organ view
  publishes the cortex's `delivery`, `fn`, `metabolic`; `CortexInputs` takes `metabolic` (the holdable field) and
  `cortexStep` uses it; `eegCtx` passes it. No store, no debt, no brainstem entry: `fn = fnSS(D)` exactly.
- **Tests:** `metabolic` bit-identical to main for a delivery sweep 0…1.2 (unit); the measurement's four courses
  reproduce main's EEG cortex columns exactly (one headless test, MANUAL and MODELED); snapshot round trip; the
  couplings census regenerated (`neuro.eeg.cortex.metabolic` now reads the organ state).
- **Must not change:** any value, in any patient, ischaemic included. `eeg-baseline.json` byte-identical.
- **Decision:** none.

### B2v. The shared vasodilator reserve (plan 8 h · 1.0–1.3 executor-h). Advisor: design.
- **Why:** `targetCbf` multiplies the pressure autoregulation by the CO2, hypoxic and drug factors with no shared
  ceiling, so below the lower limit of autoregulation and under chest compressions, where the resistance vessels are
  already maximally dilated, hypercapnia and hypoxaemia still raise flow (on an earlier main: CO2 40 → 52 raised flow
  × 1.296 at CPP 35.5, PaO2 100 → 40 × 1.528; CBF under CPR 0.496 against 0.30–0.40, pull request 188's measurements,
  to be measured again on the current main). The anaemia rise would be a fourth such limb.
- **The mechanism.** The reserve is physically the dilation the resistance arterioles have left between the tone
  autoregulation holds them in at this pressure and maximal dilation. Its ceiling is maximal dilation. Below the
  lower limit that is the pressure-passive line the engine's autoregulation curve already follows,
  (CPP − CPP_ZERO_FLOW) ÷ (LL − CPP_ZERO_FLOW). Above it, pull request 188 continued the same line, which fixes the
  ceiling at normal pressure at 1.40 (CPP 80, LL 60) as a by-product of `CPP_ZERO_FLOW` (10, an [ENG] shape). **B2v
  builds the ceiling at normal pressure as one named parameter instead**, R_N (the ratio of maximally dilated to
  autoregulated flow in the normal state, CPP_N 80 with LL_N 60, held as data with its source and its mark). The
  formula is one way to do it (mine, [ENG]); the design call of B2v may choose another that keeps the same three
  properties (R_N in the normal state, 1 at and below LL, pull request 188's line at 1.40). Above LL,
  F_max = 1 + m × (CPP − LL) ÷ (LL − CPP_ZERO_FLOW), with m = (R_N − 1) × (LL_N − CPP_ZERO_FLOW) ÷ (CPP_N − LL_N), so
  that the normal state's ceiling is R_N; at and below LL, the passive line as now; reserve = max(1, F_max ÷ A(CPP)).
  At the built value R_N = 1.40 (marked [P], not sourced), m = 1 and F_max is pull request 188's line exactly at every CPP and every LL (1.40
  at CPP 80, 1.20 at 70, 1 at and below LL, 70/65 for an LL of 75; mine, arithmetic), so nothing moves for choosing
  this form. A later answer to §9.2 item 1 changes one data value and the unit values computed from it, with no
  rework of the mechanism, of autoregulation's curve below LL, or of the cells below LL and under compressions, which
  read 1 whatever its value. An LL moved toward the CPP (by CO2, Paulson 1990) still shrinks the reserve, as in pull
  request 188. The kink of F_max at LL when R_N ≠ 1.40 is [ENG] (real maximal-dilation curves are smooth). The
  dilating limbs act on one vessel tone, so
  their combined request (the product of the CO2 factor, the hypoxic factor, the drugs' factor and, from B2a, the
  anaemia factor) is delivered up to the reserve and no further (`spendReserve` = min(request, reserve)). A
  constricting request (< 1: hypocapnia, the metabolic coupling of propofol, hypothermia) is not dilation and always
  passes. Pressure spends the reserve first: as CPP falls through the plateau, autoregulation itself dilates. No
  viscosity term is built (§2.2; §9.2 item 2 would place one on the ceiling). The engine state is
  unchanged: the reserve is a function of CPP and the brain's `ll`, `ul`, `ar`, computed in `targetCbf`; the one new
  value is R_N, data with its source and mark.
- **Sources:** the human reserve at normal pressure: acetazolamide raised whole-brain flow 39 % (SD 19) by 15O-water
  PET in 19 healthy adults at 15 mg/kg (Zhao 2021 [FT]) and grey-matter flow 69.5 % by ASL in 11 controls at 16 mg/kg
  (Vaclavu 2019 [FT]), both lower bounds of maximal dilation; Xe-133 fast flow × 1.39, 1.55, 1.68 and 1.79 at 10, 13,
  15 and 18 mg/kg, every step significant, so no plateau shown, with blood pressure slightly lower (Grossmann &
  Koeberle 2000 [FT], p. 66, Fig. 1 p. 67, p. 68); with CO2, ICA flow × 1.54 at PaCO2 ≈ 49 while MAP had not changed
  significantly, rising to × 2.2 at PaCO2 ≈ 62 with MAP +21 % in 3 subjects, ICA conductance up to × 1.85 at ≈ 58
  (Willie 2012 [FT], Table 1 p. 6; the authors cannot separate PaCO2 from the pressure rise, p. 13); MCA flow
  **velocity**, not flow, in 16 awake volunteers by rebreathing at a held end-tidal PO2: the fitted sigmoid's maximum
  was 80 % (right MCA, n 16) and 78.9 % (left, n 10) hyperoxic and 101 % and 101.7 % hypoxic, each counted from the mean
  minimum velocity during 5 min of hyperventilation to an end-tidal PCO2 of 25 mmHg (SD 4.0), **not from rest**; the
  sigmoid's midpoint lay at 36.8 / 35.6 mmHg hyperoxic, and the resting value is not reported, so the article gives no
  rise above rest; MAP began to rise at an end-tidal PCO2 of 49.1
  mmHg hyperoxic and 44.4 hypoxic (MCA velocity threshold 51.7 / 45.4); the abstract's +108 % is the hypoxic mean after
  excluding four of the 16 subjects, whose hypoxic rise was not larger (107.5 / 108.9 % right / left; hyperoxic 78.5 /
  73.7 %); the authors note that the MCA diameter may change at very high CO2, which would make velocity understate flow
  (Battisti-Charbonney 2011 [FT], Methods, Data analysis; Table 1; Discussion). Dogs (Harper & Glass
  1965 [FT]; 41 dogs, thiopentone then N2O, cortical 85Kr flow, each point a percent of that dog's own flow at PaCO2 40
  at its own pressure, p. 450): raising PaCO2 40 → 80 raised flow about 100 % at the dogs' "normotensive" ≈ 150 mmHg
  and "only 50 %" at MAP held at 100, and had no significant effect at 50 (pp. 450–451); the sigmoid fitted to these
  data (Gersten 1999, an arXiv preprint [FT]) gives asymptotes B(∞) of 2.112 at 150, 1.518 at 100 and 0.997 at 50
  (that fit constrained), with ± values set by the fitter, and 2.11 and 1.52 lie inside the measured scatter, at or
  just above the authors' plateaus, not far beyond the data (note 90b §5). A dog's normal pressure is not a person's,
  so the dogs give the form (the ceiling falls with pressure and vanishes near 50) and no human number. Okuda 1976
  [ABS] (baboons): CO2 responsiveness abolished at systolic 60; Gregory 1981 [ABS] (cats, MAP 36–37): no CO2 response
  with trimetaphan; Paulson 1990 [ABS]: the limits of autoregulation move with anything that raises or lowers CBF,
  notably CO2. Rebel 2003 [FT] (cats, Hct ≈ 19 %): the flow response to hypercapnia after albumin exchange was not
  different from controls' as a percent, the pial arteriolar dilation kept, and the constriction to hypocapnia blunted
  (Fig. 4 and p. H1604; §2.2 for what it does to the shared reserve).
- **What stays an engineering form, and why (stated in the code):** the hard `min` (real ceilings are sigmoid; a smooth
  form would change the sourced 3 %/mmHg at normal pressure); F_max below LL taken from the model's own
  pressure-passive line (`CPP_ZERO_FLOW` is an [ENG] shape); its straight rise above LL; one reserve for the whole
  brain. **The built value R_N = 1.40 lies below every human measurement read but one (mine, arithmetic):** × 1.39
  (PET, whole brain, 15 mg/kg) is at it; × 1.5 (ICA flow, CO2, pressure unchanged), × 1.55–1.79 (Xe-133, 13–18 mg/kg),
  × 1.70 (ASL, grey matter) and × 1.85 (ICA conductance) lie above it, and none shows a plateau. With 1.40 the anaemic
  rise at rest is capped below about Hb 9 with Mühling's power form and below about Hb 6 with the pooled human line
  (for the adult man), and a cap leaves nothing for CO2 or a volatile in the same request. This is the open question of
  §9.2 item 1; below the lower limit every option gives 1, which is where the review's artefacts lie.
- **Pull request 188** (`fix-cerebral-dilator-reserve`) proposes exactly this form with these sources and tests. It is
  open, not a draft, cut from a main of early November and in conflict with the current main. **The plan builds on its
  mechanism and its tests and does not merge the branch:** B2v rebuilds the two functions on the current `flow.ts`
  (where B2a's factor will be a fourth limb), carries its tests over, measures again every number its description
  gives, and records the demo cards' courses on the current main. B2v's pull request names the old one as superseded.
- **First step, before any product code:** measure on the current main, with and without the reserve, the three cells
  most at risk (§6.3: tamponade-drainage ROSC, CPR-offset spread, warm septic MAP) and the CPR coronary perfusion
  pressure; if any leaves its band, stop and ask (§6.3 names the mechanism that would then be at fault).
- **Tests:** unit: `dilatorReserve` computed from R_N: at the built value 1.40 / 1.20 / 1 at CPP 80 / 70 / ≤ 60
  and 70/65 for an LL of 75; R_N exactly at the normal state for any R_N; 1 at and below LL for any R_N; 1 with no
  flow; `spendReserve` passes a constricting request unchanged. Cells: (a) at normal CPP, PaCO2 50 → CBF 1.30 and
  30 → 0.70 (the tables, unchanged, inside the reserve for any R_N ≥ 1.30); (b) at CPP 35.5, PaCO2 40 → 52 adds no
  flow, ratio 0.99–1.01 [ENG: the plan's tolerance] (direction: Harper & Glass 1965 [FT], no significant effect at MAP
  50 in dogs; Okuda 1976 and Gregory 1981 [ABS]); (b′) the same CPP, PaO2 100 → 40 adds no flow; (c) CBF under CPR
  against 0.30–0.40 (research 81): pull request 188 measured 0.405 on its base, so it may stay a recorded miss with
  A(CPP) alone left as its cause, never tuned. Rebel 2003's CO2 flow response at Hct 19 % is context, not a cell: a
  cat, a percent of an unstated reference, no absolute flow. Regression: the demo haemorrhage and tamponade cards and the arrest
  records re-recorded with the reserve as their stated cause; the CPR coronary perfusion pressure against Paradis's
  15–25 read and reported (a source band: if it leaves it, the piece stops and asks).
- **Must not change:** the CO2 and hypoxic gains inside the reserve, autoregulation's curve, `cmro2Rel`, any threshold.
- **Needs before it starts:** nothing (main). It is built and merged with R_N at the built value 1.40, marked [P] and not sourced,
  with the measurements of §9.2 item 1 beside it; the answer to item 1 then changes that one value (and a viscosity
  term from item 2, if chosen, is a second factor on F_max), with the rows it moves re-read and listed.

### B2d. The brain's delivery reference is the patient's own normal (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** every reader of the delivery reference (the energy state's delivery, the PbtO2 and
  SjvO2 ratio) measures against the content at the patient's own normal Hb (decision, §9.1 item 10), read from the
  blood core's `pat.hbRef` through the organ view (`OrganView.hbRef` → `BrainInputs.hbRef`): this piece brings that
  path in, and B2a reuses it. **It also makes the t = 0 view read `pat.hb` and `pat.hbRef`** before the blood's first
  step (today the fallback 14/14), so neither the delivery reference nor, later, the factor jumps at the first step.
  The name `HB_REF` (the delivery reference's old Hb 14) is retired; without the blood model the fallback stays 14
  with hb = hbRef.
- **Tests:** every default band rests at delivery exactly 1; an anaemic patient's delivery equals flow × content ÷ his
  own normal content; the thresholds' values unchanged (each constant named); the t = 0 view equals the first step's
  for a hand-set Hb; an old snapshot restores and continues with only the stated step.
- **Rows that move, with the cause written beside each record:** the default man's resting delivery 1.07 → 1 and
  whatever reads delivery near a threshold (the arrest courses' cortex, PbtO2 and SjvO2 at rest).
- **Must not change:** any threshold, `targetCbf`, the brainstem's reading.
- **Needs before it starts:** nothing (main).

### B2a. The flow rise with anaemia, whole (plan 12 h · 1.5–2.0 executor-h). Advisor: design. **In review (pull request 512); it lands in one merge with B5c, after B2v and B2d.**
- **What:** `anaemiaFactor(hb, hbRef)` in `l2/brain/flow.ts` as **one regulated dilation** (§2.2: no content/viscosity
  split is built, because none is established for the human brain and the shares cannot be added). Its request joins
  the dilating product spent from B2v's reserve, so at and below the lower limit and under compressions it adds no
  flow. Its size and form are §9.2 item 3's answer; the working size is the pooled human slope,
  1 + 0.66 × (1 − Hb ÷ Hb_normal) (Hoiland 2016 [FT], §2.2) [P: working value], as data with its source; the content
  fall is the fall of O2 capacity at the reference saturation, (Hb ÷ Hb_normal), as §1.5.5 rules. Held at Brown's
  5.7–19.1 g/dL [FT]; the reference `hbRef`, the patient's own normal, through B2d's path; `TAU_VASC_S` relaxation as
  before; the Cushing clamp (the surge target kept in [0, 1]); the census row `organs.brain.anaemia`. Viscosity is not
  built in the brain until §9.2 item 2 is answered; the code states the omission beside the factor.
- **Kept from pull request 512's head (b72d7b1b):** the factor's place in `targetCbf` and its data structure
  (`ANAEMIA_FLOW_SOURCE`, the source's numbers held as data, with the size computed from them), the upper hold 19.1, the per-patient `hbRef` (the band's sex normal,
  one table), the Cushing clamp and its unit test, the census row, the `anaemia.test.ts` structure with its source
  cells, and the engine-output pins as pins.
- **Changed:** the factor's request is spent from the reserve; the power form with Mühling's k gives way to the size and form §9.2 item 3 settles (working size: the pooled human linear slope, which contains Mühling's study); the lower hold 4.8
  (Lieberman, a systemic measurement) becomes 5.7 (Brown); the `hbRef` path and the t = 0 read come from B2d; `HB_REF`
  is gone (B2d); the Mühling test is titled as arithmetic on the source's means; every record's cause is written in its
  test header with Hb, factor and sizes; the hand-set anaemic patients (`blood-anaemia-co.test.ts`,
  `blood-oxygen.test.ts`, the demo's Hb 5 page) are listed with their moved values; the known-deviations row loses its
  branch name; the generated pages give g/dL as the holds' unit.
- **Taken back:** (1) the expected-failure mark on the low-flow oximetry cell (`fidelity-lowflow.test.ts`, "PI < 0.3
  — measured 0.40") and the removal of that clause from the passing test: the clause is restored, and it must pass on
  the set. (2) The re-recorded haemorrhage window `cppAt60` [19.52, 27.52]: back to [15.03, 23.03]; it is re-recorded
  once, after the set, only if the set's value lies outside it, with Hb, factor and each piece's cause beside it
  (§9.1 item 7). (3) The re-recorded `eeg-baseline.json`, `arrest-cortex.json` and the arrest-breathing record: recorded
  again at the end, with their causes in the headers, after B2v, B2d and B5c have each recorded theirs.
- **Tests:** unit: factor exactly 1 at hb = hbRef in every band; the request adds nothing at and below LL and under
  CPR (B2v's reserve); a chronic anaemia's start is at equilibrium in conductance and in CSF displacement (`createBrain`
  starts `csfDisp` at 0, so a hyperaemic start would begin with a raised ICP that drifts down: B2a settles the start's
  displacement, and the test holds ICP at t = 0 equal to ICP at 10 min for a hand-set Hb 5 at rest); holds at 5.7 and
  19.1; t = 0 equals the first step for a hand-set Hb 9 and 5 (no jump). Cells: §2.2's (Weiskopf, Lieberman, the chosen
  slope's source, Todd 1992 as a check); in chronic anaemia at normal pressure the acetazolamide-like reserve left is
  smaller than a normal patient's (Vaclavu 2019 [FT], direction only, the remaining reserve read from B2v); the
  low-flow oximetry cell passing; the cells of §6.3. Regression: every row listed by §2.2's permission, including the
  arrest records' Hb-drift rows (§6.3), nothing else moved.
- **What its own tests show while the set is incomplete:** on its branch stacked on B5c (itself after B2v and B2d) the
  suite is green; on main alone the piece is not merged. No cell is made green by an expected-failure mark.
- **Must not change:** `o2Factor`, `co2Factor`, autoregulation, `cmro2Rel`, the reserve's form, any threshold.
- **Needs before it starts:** B2v and B2d merged. Brown 1985's full text is read and prints no equation, so it does
  not settle the form (§2.2). The rework that does not depend on the form (the reserve spending, the holds, the `hbRef`
  path, the t = 0 start, the taken-back marks and records) may start before §9.2 item 3 is answered; the form is one
  function with its source data, fixed by that answer.
- **Decisions:** given (§9.1 items 6–8, 10, 11); §9.2 item 3 before the form is coded; §9.2 item 1 (the ceiling)
  before its cells are read, since a ceiling of 1.40 at CPP 80 caps the anaemic rise at rest below about Hb 6, and
  1.20 at CPP 70 below about Hb 10.5, with the pooled line (§9.2).

### B2. Consciousness from the cortex's function (plan 9 h · 1.1–1.5 executor-h). Advisor: none.
- **What:** `NeuroEnv` carries the cortex's `fn` and `metabolic`; `depth()` adds `isch` (§1.4, on `fn`, with
  `DO2_LOC` = 1/3 as a named constant with its sources) to `hypnotic` and produces the displayed index and SR of §1.4;
  `diRaw` and `neuroOutputs` unchanged; `movement` and the index's EMG rise gated (§1.4 consumer list).
- **Tests:** unit: `isch` 0 at fn = 1, 1 at fn ≤ fnSS(1/3) (with fn = fnSS(D): 0 at D ≥ 0.40, 1 at D ≤ 1/3); drug-only `diRaw` unchanged for every existing depth test; the
  displayed index at fn = 0 is 5 with SR 100. Cells: A2 (unconscious within 7–18 s of VF onset as target, ≤ 30 s
  must-hold; Wieling, Sauvageau, van Dijk, Pana); the hypotension cell of §2.2; the anaemia cells of §2.2 (conscious at
  Hb 5 and 4.8, Weiskopf, Lieberman); the no-latch set of §1.5.2. Regression: the piece first lists every existing row
  with cortex delivery below 0.40 after B2a (haemorrhage, haemodilution, hypoxaemia, shock) and states which move; the
  MODELED arrest's breathing may move through `loc` (wakefulness drive), by how much is reported, and the s9b/s9c rows
  must stay green.
- **Must not change:** `cmro2Mult`, the MAP set-shift, the drive's sedation term, `awarenessRisk`, the EEG's
  `METABOLIC_SLOW_SHARE`.
- **Decision:** given (§9.1 item 4). Needs B2a merged.

### B3. The EEG artefacts and the readers follow consciousness (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** `emgLevel` and the blink gate take `lor + isch` (the additive rule of B2), with the arousal and tube terms
  gated by the same weight.
- **Tests:** unit: EMG 0 and no blinks with `isch` = 1 at `lor` 0; `eeg-baseline.json` byte-identical. Cells: A3; A4
  (BIS-type SR > 80 and index < 20 by VF + 90 s without compressions, given its 63-s window; Entropy SE falls
  likewise).
- **Must not change:** the readers' algorithms (`l3/eeg-devices/`).
- **Decision:** none. Depends on B2.

### B3b. The compression artefact in the EEG (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** an artefact term in `l2/eeg/artefacts.ts` while compressions run, reading the haemodynamic model's
  compression state (`hs.cpr` in `l2/hemo/pipeline.ts`: `active`, `rate`, `quality`), which the gas coupling and the
  pressures already read. The ECG's `artefact.cpr` (`CprSpec`) is a separate modifier; the piece checks who sets it
  and does not add a third copy. The waveform: periodic at the
  compression rate, sharply contoured, amplitude above ±50 µV at full depth (Kim 2021 [FT]; Sethi [SEC]); its shape
  beyond those statements and its scaling with depth are [P], stated in the piece. The brain signal is untouched; the
  readers compute from the summed signal.
- **Tests:** unit: no artefact without compressions (`eeg-baseline.json` byte-identical); spectrum dominated by the
  compression rate; peak above ±50 µV at full depth; isoelectric brain between compressions stays isoelectric in a
  pause. Cells (A10): under compressions over a flat brain, the trace carries the artefact and the BIS-type SR is
  miscalculated (Nitzschke); the index is reported, not asserted (the case reports range from BIS 13 to 87); the
  instructor's view shows the underlying state.
- **Must not change:** the ECG artefact, the readers' algorithms.
- **Decision:** none. Depends on B3.

### B4. The arrest validation cells (plan 5 h · 0.6–0.8 executor-h). Advisor: none.
- **What:** sanity rows in `packages/validation/suites/sanity/` for the witnessed-VF course in both modes: A1 end to end
  (isoelectric by VF + 9…13 s; must-hold < 30 s) **recorded as a known miss** (red on main through the circulation's
  decay, §1.3.3), A2, A4; known misses for course (d)'s instant recovery and for course (c)'s waking under CPR (A8,
  sources Reagan 2018 and Olaussen 2017) until B6b.
- **Tests:** the rows; `docs/validation/known-misses.md` regenerated.
- **Decision:** none.

### B5. The breathing gate's state relocated into the brainstem entry (plan 6 h · 0.8–1.0 executor-h). Advisor: none. **On main (pull request 504).**
- **What:** a relocation only. `anoxS` and `gate` move from `SpontDrive` into `BrainEnergy.brainstem`
  (`BrainstemEntry { anoxS?, gate? }` in `l2/brain/energy.ts`, a type of its own), keeping their meaning, their cadence
  (0.1 s on the gas grid in MANUAL; 1 Hz in MODELED, inside the drive) and their read point (still stepped by
  `stepBrainstem` in the resp pipeline, reading `organs.brain.cbfRel` one pass late and the no-flow flag). **Every
  constant stays in `spont.ts` with its value.** The pulseless withdrawal (`plS`, `NO_FLOW_S`) stays on `SpontDrive`.
- **Tests:** the s9b and s9c rows and `manual-brainstem-gate.test.ts` unchanged; the new `arrest-breathing` record (the
  four arrest courses × both modes, every second, recorded on main) unchanged; snapshot round trip (the state's new
  home, with a reader for old snapshots).
- **Must not change:** any breathing value.
- **Decision:** none. It is kept separate so that the later pieces change values only.

### B5b. The brainstem's no-flow timer on the organ model's clock, in both modes, and the arrest record (plan 6 h · 0.8–1.0 executor-h). Advisor: design.
- **Why:** in MODELED the timer advances only while the spontaneous drive is evaluated (source spontaneous, ventilator
  or external); under bag ventilation it stands still (course c: 58 s in MODELED against 79 s in MANUAL in B5's
  record). B7a takes its times as minutes since the loss of flow, which is what the timer must measure. And
  `anoxS` is not that time under compressions: it is deleted as soon as the brainstem is perfused (`cbfRel` ≥ 0.2,
  and CPR flow is 0.30–0.40) and the no-flow flag is false in VF under compressions (VF has no `pulseless` option;
  `coRatio` > 0 once compressions run), so it vanishes during CPR and restarts at every pause.
- **What:** `anoxS` and `gate` are stepped where the cortex entry is, in the organ model's step (`stepBrainEnergy`,
  `l2/organs/pipeline.ts`, the brain's 10 Hz grid), in both modes and whatever ventilates the patient, reading the
  same `cbfRel` and the same no-flow flag (rhythm pulseless or CO ≤ 0, today computed in the resp pipeline; it reaches
  the organ step through the organ inputs, one definition). `stepBrainstem` keeps only the pulseless timer `plS`
  until B7a retires it. The constants stay in `spont.ts` with their values. Consciousness and breathing still read
  the entry one pass late (§1.4).
  **The arrest record:** `brainstem.arrest?: { onsetS, noFlowBeforeCprS? }`, created when the pulse is lost (the
  pulseless flag: a pulseless rhythm or a no-beat rhythm, `NO_BEAT_RHYTHMS`), deleted at the return of a pulse, and
  stepped on the same organ clock; `noFlowBeforeCprS` is set when compressions first start (`hs.cpr.active`) in that
  arrest. It is what B7a reads for "minutes since the loss of flow" and for "the no-flow time before compressions";
  `anoxS` keeps its meaning (time unperfused, the gate). A low-flow state without arrest creates no record. Snapshot:
  the record is part of the entry.
- **Tests:** unit: the timer advances at the organ step's dt in MANUAL and MODELED alike, with the drive evaluated or
  not; the arrest record lives from pulse loss to the return of a pulse, survives compressions and their pauses, and
  holds the no-flow time before the first compression; course c in MODELED now counts through the bag ventilation (its `anoxS` reaches MANUAL's, within one organ
  step). Regression: `arrest-breathing.json` re-recorded with the cause stated (MODELED cadence 1 Hz → 10 Hz in every
  course; course c's timer through bag ventilation), the MANUAL rows are expected byte-identical, and any
  MANUAL move is reported with its cause (the no-flow flag is now read in the organ step, whose place in the pass
  order differs from the resp pipeline's; the piece checks it before claiming identity); s9b/s9c rows green; snapshot
  round trip.
- **Must not change:** the thresholds, the gasp rule, the reopening time, `plS`.
- **Decision:** none. B7a depends on it.

### B5c. The brainstem reads delivery; the vasomotor centre's perfusion gate reads the brainstem (plan 7 h · 0.9–1.2 executor-h). Advisor: design.
- **Why:** the brainstem's perfusion is read as flow (`cbfRel`) by the breathing gate (`stepBrainstem`,
  `BRAINSTEM_CBF_MIN` 0.2, fed from `engine.ts` through the resp context) and by the vasomotor centre's gate
  `brainstemOutF` (`CBF_REFLEX_ZERO` 0.2 → `CBF_REFLEX_FULL` 0.6, fed from `organs/effects.ts`, which copies
  `cbfRel` into the circulation's `ext.cbfRel`), whose three readers are the baroreflex's sympathetic output (SVR, HR,
  contractility, venous tone and the skin tone that sets the finger's PI), the endocrine sympathetic drive and the
  thermoregulatory efferents (§1.4; the list is confirmed in the code, §8). With the flow rise of B2a a diluted,
  bleeding patient's brainstem reads plenty where its O2 supply has fallen: in a 3 L bleed his sympathetic output rises
  and the oximeter keeps a PI above LOW PERF at MAP < 30, and under CPR dilution appears to raise the coronary
  perfusion pressure (pull request 512's measurements). The breathing gate likewise lets a diluted patient breathe to a
  lower pressure. Delivery is what the brainstem lives on: in human haemodilution cerebral O2 delivery falls by 0.47 % per 1 %
  fall of content while flow rises 0.66 % (Hoiland 2016 [FT], pooled), so the real brainstem is more ischaemic, not
  less.
- **What:** the brainstem entry publishes `delivery` (the same `brainDo2Rel` as the cortex, against the patient's own
  normal content after B2d, on the one global CBF: §1.3.1 [P]); the breathing gate compares delivery with
  `BRAINSTEM_CBF_MIN`, and `brainstemOutF` takes the entry's delivery, each threshold's value unchanged. One function,
  one input, four readers. The no-flow flag still closes the gate whatever the delivery. The organ numeric `cbf`, CBV
  and the Cushing path stay on flow, which is what they are.
- **Sources:** the cortex's reasoning (§1.5.1, §1.5.6): the thresholds are flows measured at normal content, so they are
  read as delivery (Miller Ch35 p. 1126: hypoxaemia acts once the flow compensation is spent); Brown 1985 [FT] (the
  flow rise keeps O2 transport within limits, pp. 85–86, so it is not extra supply); Todd 1994 [FT] (cerebral O2
  delivery falls in haemodilution while flow rises, Table 1 p. H2027); the thresholds' own [P] marks (Astrup 1981 for 0.2–0.6; the ruling's 0.2) stay
  beside the constants.
- **Tests:** unit: at the patient's own normal content every reader is bit-identical to main for a flow sweep 0…1.2;
  hypoxaemia lowers the gate's reading in proportion to content (it no longer reads the hypoxic flow rise as plenty).
  Cells: in a bleed with dilution, the vasomotor outflow is withdrawn at a higher pressure than with the same bleed
  without dilution (direction; no source gives the size). Regression, each row listed with this cause: patients off
  their normal content (dilution, hypoxaemia, the asphyxial-arrest courses, where content falls before the arrest) and
  oxygenated patients whose SaO2 and PaO2 lie above the reference's 0.97 and 95 (the default man on oxygen under
  anaesthesia reads slightly more than his flow, mine).
- **A source-set band is never moved:** the CPR coronary perfusion pressure against Paradis 1990's 15–25 (24.7 mmHg at
  70 s, cited in `baroreflex.ts`); if the delivery read takes it or any other source-set band outside its band, the
  piece stops and asks.
- **Relative to B7a:** B7a does not wait for B5c. If B5c lands first, B7a's gate reads delivery from the start; if
  B7a lands first, B5c switches the comparison and re-records the arrest-breathing record with that cause.
- **Must not change:** the thresholds' values, the gasp rule, `targetCbf`, the cortex.
- **Needs before it starts:** B2d merged (the delivery reference it reads); B5 is on main. **It lands in one merge with B2a** (§6, order). It does not need B5b (the
  timer's clock) or B2a.

### B6a. The cortex's O2 store (plan 7 h · 0.9–1.2 executor-h). Advisor: design.
- **What:** the derived store (§1.3.3) and the demand of §1.3.4 with the one shared F (moving `neuroOutputs`' 0.45 into
  the shared constant without changing its value).
- **Tests:** unit: non-ischaemic patients bit-identical (store full); the store's size computed from the named constants
  (no new literal); the zero-flow step cell (isoelectric at 11 ± 2 s; de Vries), reported as met or missed by the
  derivation, never tuned. Cells: A1 end to end again (expected later than main's +14 s; stays a known miss with its
  upstream cause); A2 again (`isch` reads `fn`, so the store delays the loss of consciousness; reported against 7–18 s).
- **Must not change:** `targetCbf`, `cmro2Rel`, `cmro2Mult`'s value, PbtO2, SjvO2.
- **Decision:** none.

### B6b. The cortex's debt and the recovery table (plan 12 h · 1.5–2.0 executor-h). Advisor: design.
- **What:** debt and `fnCap` (§1.3.5–6) with the recovery table of §2.3 as data: sourced rows P1–P14 with their
  species and conditions, and the placeholder rows for 1, 2, 5, 10 and 20 min of no flow, each `placeholder: true`
  with its reason (the ruling). Debt accrues under partial flow (CPR), so the EEG under compressions depends on the
  no-flow time before them (A8). **No temperature term on recovery** (decision, §9.1 item 5): `fnCap` and the
  repayment rate do not read temperature, and the table has no temperature column; temperature reaches the debt only
  through demand during low flow (§1.3.4).
- **Tests:** unit: debt exactly 0 in every non-ischaemic patient; every table row either cites a source or carries
  `placeholder: true`. Cells: R1 (17 ± 9 s; de Vries, arrest length [P]); longer arrest → longer recovery, monotonic
  (de Vries 1997, Vriens 1996); repeated short arrests do not cumulate (Vriens 1996); EEG power normal by 5 min after
  an 18–58 s asystole (Plaschke 2006); colder during the arrest → less debt for the same arrest (demand, §2.2); under
  CPR after 1 min of no flow at delivery ≥ 0.40, EEG activity returns (Kim 2020, direction); at the same CPR delivery,
  a longer no-flow time before compressions gives lower cortex function and a later return (Shaffner 1999, direction
  only, at equal delivery); the no-latch set again. Course (d)'s known miss moves to green or to a stated [P] band;
  course (c)'s waking under CPR stays a known miss (Reagan 2018, Olaussen 2017), reduced, until the reflow attachment
  (§7) exists, and the PR reports by how much. The PR states what a session shows after a
  5-minute arrest (with the placeholder rows, minutes of burst suppression and no waking within a teaching session).
  Temperature: the same arrest at 33 and at 37 °C after the return gives the same recovery once the debt is equal
  (no term), and colder during the arrest gives less debt (demand).
- **Must not change:** `targetCbf`, `cmro2Rel`, PbtO2, SjvO2, the CPR flow (the reflow deficit is an attachment), the
  EEG's cold term, the drug layer's clearance.
- **Decision:** given (§9.1 items 2 and 5).

### B7a. Breathing after arrest, re-sourced (plan 12 h · 1.5–2.0 executor-h). Advisor: design.
- **What:** by the decision (§9.1 item 1), on the brainstem entry and B5b's arrest record (the sources state the
  course in minutes after the loss of flow, which is what the record measures from B5b in both modes and through
  compressions, so the times are taken as stated, not fitted):
  - **Whether this patient gasps** (decision, §9.1 item 9), decided once per arrest:
    - *The incidence* is data with its source, in a new `l2/neuro/gasping.ts`: after the arrest, 46 % when the cause
      is cardiac and 32 % for other causes (Clark 1992 [ABS], 445 out-of-hospital arrests, the one source read that
      separates the cause); under compressions, 26 % (Wolfskeil 2017 [ABS], 76 of 292 intubated patients, measured by
      tracheal-tube pressure), with Debaty 2017's ≈ 10 % (observed in trial data) as context. The overall 40 % (Clark),
      55 % of witnessed arrests (Eisenberg 2006, a review) and 33–39 % (Bobrow 2008) are context: they are what
      bystanders or crews saw by the time of the call, which falls with the time to arrival (Bobrow), so a true
      incidence from onset is likely higher (WANTED, §5.3). The cause is the arrest's own `cause` in the circulation
      (`ArrestRequest.cause`, `l2/circ/arrest.ts`): the low-flow arrest and an instructor-placed VF, VT, asystole or
      PEA read as cardiac; the hypoxic (asphyxial) path, hyperkalaemia and the temperature hazards read as other
      [INF, mine: Clark's "cardiac etiology" is presumed cardiac disease; the mapping is the plan's].
    - *The draw:* one uniform value `u` from a new named random stream `'gasping'` (added to `StreamName` and
      `STREAM_NAMES` in `rng/sfc32.ts`; each stream is seeded from hash(seed, name), so no other stream's draws move),
      taken once when B5b's arrest record is created (the pulse is lost), always, whatever the setting, and kept in
      the record (`arrest.gaspU`) for its lifetime; pauses in compressions do not redraw, a low-flow state without
      arrest does not draw, and a new arrest after a return of a pulse draws again. A card with a fixed `seed` gasps
      the same way on every run. The patient gasps after the arrest if `u` < the after-arrest incidence for
      the cause, and under compressions if `u` < the under-compressions incidence; one draw with two thresholds, so a
      patient who gasps under compressions also gasped before them [INF, mine: no source follows the same patients
      through both phases]. Its stated artefact: because the under-compressions threshold (26 %) is one figure for
      every cause while the after-arrest ones differ, a patient of other cause who gasped after the arrest is likelier
      to gasp under compressions (26/32) than a cardiac one (26/46), although Wolfskeil reports more gasping in VF. Older snapshots seed the stream as `ectopyHazard` is seeded today (`engine.restore`).
    - *The setting:* `gasping?: 'chance' | 'yes' | 'no'` in `NeuroProfile` (`types-neuro.ts`; absent = `'chance'`).
      The scenario format carries it as `patient.neuro.gasping` (the patient's neuro block passes `NeuroProfile`
      1:1; `packages/controller/scenarios/pme-scenario-1.schema.json` and `-2.schema.json` gain the enum). The
      instructor sets it live through the engine's existing `neuroProfile` clinical event (the controller's
      `ClinicalEvent` union in `controller/src/protocol.ts` and its command list do not carry it yet; B7a adds it), from a three-way control "Gasps
      after arrest: by chance / yes / no" on the instructor's Patient tab (`apps/demo/src/app/panel/patient.ts`), shown
      with the drawn outcome when the setting is "by chance" and an arrest is running. `'yes'` and `'no'` override the
      draw; the draw is still taken, so the stream's position never depends on the setting.
    - *What tests hold fixed:* every engine-level cell and every regression record sets `gasping` explicitly (`'yes'`
      for the A6/A9 course cells and for B5's `arrest-breathing` courses, which gasp on main; `'no'` for the apnoea
      cell), so no test depends on the draw. The draw itself is tested as a pure function of `u` and the cause, at
      values just below and above each threshold, and the stream test checks that the other streams' states are
      unchanged across an arrest and that the drawn value survives a snapshot round trip.
  - breathing continues through about the first minute; a gasp phase from the second minute to the sixth–seventh;
    apnoea after; the pulseless withdrawal over `NO_FLOW_S` and the rule on main (gasps from 30 s, `GASP_VT_FRAC` 0.3,
    apnoea by 2 min) retired.
  - **Species.** Every timing number is swine; no human timing exists. The gasp's rate and size are the human ones
    where they exist: median 274 mL (196–434) at 3.7/min (1.5–7.3), measured in intubated people under CPR
    (Wolfskeil 2017 [ABS]) [P: a human measurement under compressions used for the untreated phase too]. The swine
    "VT larger than rest" (Lin, Menegazzi) is not a cell: it contradicts the only human measurement. The swine ranges
    by anaesthetic (isoflurane < 3/min, IV 2–5/min, α-chloralose 6–11/min) are reported as context and carried as
    ranges [P]; there is no switch by agent, because the comparison is between studies and no source gives a dose at
    which an agent changes the pattern.
  - **Under compressions.** While compressions run (the haemodynamic model's `cpr.active`) and the circulation has not
    returned, the brainstem's output stays in its gasp form (in a patient who gasps under compressions; apnoea
    otherwise) and does not reopen to normal breathing, even though CPR
    flow (0.30–0.40) is above `BRAINSTEM_CBF_MIN` 0.2; it reopens only after the return of a perfusing rhythm. The gasp
    rate under compressions is taken from Zuercher CCRP Table 1 by the no-flow time before compressions and the CPR
    mode, the interpolation between its two VF durations [P]; none under mechanical ventilation (Noc 1994, rats). This
    rule is the plan's (mine): the sources say gasps, not breathing, under compressions; the 0.2 threshold itself is the
    ruling on main, unsourced.
  - **Cause of arrest.** No source gives gasping after an asphyxial arrest in comparable terms (the hangings' deep
    respiratory movements end by 1–2 min while the circulation is still present, Sauvageau 2010). A non-VF arrest gets
    the same timer from the loss of flow [P], stated in the piece.
  - The reopening after return stays the 2-min rule as [P] (R7).
- **Not built without the tolerance source:** the brainstem's delivery thresholds and store, partial flow other than
  CPR (a profound low-flow state without arrest keeps today's CBF < 0.2 gate), the reopening as a function of
  brainstem debt, the brainstem's own debt order against the cortex beyond the timer (R2 holds because the cortex's
  debt is long, not because the brainstem's is modelled), and `stress` gated by brainstem function.
- **Tests:** A6 cells with `gasping: 'yes'` (≈ 10/min in minute 1, Zuercher BMC; gasps from minute 2; none after
  minute 8; gasp rate and VT inside Wolfskeil's ranges) and with `'no'` (breathing through minute 1, then apnoea); A9
  cells with `'yes'` (gasps under compressions; more after 3–4 than after 5–6 min of untreated VF, Zuercher CCRP; none
  under mechanical ventilation, Noc), including course c under bag ventilation in MODELED (B5b's timer); the draw's
  unit tests and the stream test above; R2 (breathing returns before consciousness, with B6b); the s9b/s9c rows
  re-banded only to their own sources; MANUAL through the gate with the override flag; the scenario schemas accept and
  reject the field's values.
- **Must not change:** the cortex, consciousness, the circulation (gasps raising carotid flow and CPP are an
  attachment, §7), every other random stream.
- **Decision:** given (§9.1 items 1 and 9). Needs B5b; R2 cell needs B6b; B5c before or after (B5c's text).

### B7b. The brainstem's `{ store, fn, debt }` (plan 8 h · 1.0–1.3 executor-h). Advisor: design. **BLOCKED.**
- **What:** the brainstem entry becomes an `EnergyEntry` on the shared equations, replacing B7a's timer; the perfusion
  threshold (`BRAINSTEM_CBF_MIN`) and the reopening (`GATE_REOPEN_S`) leave `spont.ts` and become the brainstem
  compartment's parameters, data in `l2/brain/params.ts` beside the cortex's (`CORTEX` in `energy.ts`), each with its
  source; reopening from brainstem debt; `stress` gated by brainstem `fn`; the vasomotor gate's 0.2–0.6 reconsidered
  against the same source (§1.5.6).
- **BLOCKED on a source:** no source read gives the brainstem's delivery thresholds or its tolerance in seconds or
  minutes relative to the cortex (§5.3 WANTED; the evidence check found the order only). Built without one, its numbers
  would be fitted to Zuercher's time course, which the rules forbid.
- **Tests (when unblocked):** B7a's cells unchanged by the change of mechanism; R7 against its source.

### B8. Glucose as the second substrate (plan 8 h · 1.0–1.3 executor-h). Advisor: none.
- **What:** `fnSS` = min(O2 term, glucose term) with the Ch10 p. 219 thresholds; `GLYCO_U`'s **consciousness** term
  in `hypnotic` retired in favour of the state. `GLYCO_U` is also in the index's `u`, which feeds `diRaw` →
  `cmro2Mult`: removing it there would move a frozen physiology coupling, so the index part stays until the depth
  plan's own piece moves the index → physiology coupling. B8 says so in its PR.
- **Tests:** the hypoglycaemia rows: glucose 40 → slowing, < 20 → suppressed, unconscious below the slowing; the
  existing hypoglycaemia consciousness tests (moved by attribution to this piece if their numbers change); `cmro2Mult`
  in hypoglycaemia unchanged.
- **Decision:** none.

### B9. The anaesthetic's critical flow (plan 5 h · 0.6–0.8 executor-h). Advisor: none. **BLOCKED.**
- **What:** the cortex's abnormal level scaled by the active volatile's sourced critical flow (isoflurane ≈ 10,
  halothane ≈ 20, enflurane ≈ 15, Michenfelder 1987; sevoflurane 11.5, Grady 1998), as data with sources.
- **BLOCKED on a source:** isoflurane's 10/50 and sevoflurane's 11.5/50 fall below the failure level 12/50, so the
  abnormal level cannot be scaled alone without collapsing the slowing band (and `isch`'s denominator with it), and no
  source read gives the agents' flattening level (Sharbrough 1973, Sundt 1981, WANTED) or the dose relation (the
  sources give one depth each, 0.3–1 MAC with N2O). No agent, IV agents and desflurane are not measured in the
  sources read.
- **Tests (when unblocked):** carotid clamping under isoflurane and halothane at the sources' values (Michenfelder,
  Messick, Grady).

Total ≈ 131 plan hours (16.6–21.8 executor-hours), estimates, of which B1 and B5 are built, B2a is in review, and
B7b's 8 h and B9's 5 h are not schedulable until their sources are found. B7a grows with the gasping draw and its
setting; its estimate stays 12 h, with the risk stated here (mine).

---

## 7. Named attachments (outside this plan)

- **Lasting injury and the patient who does not wake:** the EEG clinical plan's injury state, reading this state's
  debt (the decision); its bands are R4/R5 (Ruijter, Westhall, Elmer); it carries the two marked placeholders of
  §1.3.7 (protection by immediate cooling after return, harm from fever).
- **Temperature findings for other owners (research note 85):** the organ tables' `Q10_BRAIN` line below about 28 °C;
  the EEG's cold slowing (`COLD_SLOW_FROM_C`, [FIT]) against the per-degree sources (Mathew 2001, Levy 1984) and the
  rewarming hysteresis (Stecker 2001 II); the drug layer's non-CYP clearance per degree against Bjelland 2013 and
  Leslie 1995.
- **Reflow under compressions falling with the no-flow time** (Shaffner 1999: 71 → 37 % of pre-arrest flow for 6 → 12
  min of no flow at CPP 35; Lee 1989: CBF under CPR above 20 % only after 1 min of no flow) **and post-ischaemic
  hypoperfusion after return:** the circulation's and the cerebral vessels' side; the engine's CBF under CPR (0.30–0.40
  whatever the no-flow time) is too high after a long no-flow time (mine, from those two sources). B6b's debt is the
  brain's side of the same observations.
- **The circulation's flow decay after arrest** (A1's upstream miss, §1.3.3): the circulation's own plan.
- **Gasps raising flow:** gasps lowered ICP 27.4 → 20 mmHg and raised cerebral perfusion pressure (Srinivasan 2006
  [ABS]); carotid flow per gasp ≈ 59 % of pre-arrest (Ristagno 2007 [ABS]): the respiratory pump's effect on the
  circulation.
- **Myoclonus and tonic activity at onset:** the slow-phase window of `fn`; needs the muscle burst's source.
- **Pupils and brainstem reflexes:** the brainstem entry's `fn` and debt; needs a display and the order of Jørgensen
  1997 as its test.
- **The CNS ischaemic response:** `organs.absent.brainstemToHub` reading the brainstem's `fn` (after B7b).
- **Regional flow (V0)**, including the brainstem's better flow under CPR (Shaffner 1999).
- **The systemic viscosity term's exponent** (`VISC_EXP` 0.6, a fit of SVR × (Hb/Hb_ref)^0.6 to Weiskopf 1998's
  whole systemic resistance fall, which includes vasodilation): a single blood-viscosity relation from a rheology
  source, read by the systemic resistance and any brain viscosity term alike, belongs to the blood plan (WANTED,
  §5.3). The brain builds no viscosity term meanwhile (§2.2; §9.2 item 2).
- **The attenuated hypocapnic constriction at low haematocrit** (Rebel 2003 [FT], cats: blunted after any exchange,
  p. H1604) and the larger hypoxic than haemodilutional flow rise at equal content (Todd 1994 [FT], Table 1 p. H2027):
  not built.
- **Hypothermic loss of consciousness; the EEG plan's metabolic burst suppression** (Ching 2012) reading `fn`.

---

## 8. Self-review against the code (7320de53, and pull request 512 at b72d7b1b)

- **B1 is on main:** `l2/brain/energy.ts` holds `BrainEnergy { cortex }`, `brainDo2Rel` (÷ `caO2(14, 0.97, 95)`) and
  `functionLoss`; `stepBrainEnergy` is called from the organ step (`l2/organs/pipeline.ts`); `cortexStep` reads
  `x.metabolic` from `CortexInputs` (`l2/eeg/state.ts`).
- `stepBrain` computes the delivery/demand ratio `r` for `brainOxygen` from `caO2(inp.hb, …)` ÷ `caO2(14, 0.97, 95)`
  (named `CAO2_REF` in pull request 512, same value).
- The simulator's normal adult is Hb 15 (`ODC_DEFAULT`, `l2/blood/odc.ts`); `HB_DEFAULT` 14 (`l2/brain/params.ts`)
  applies only without the blood model.
- **Who reads the brainstem's perfusion today:** `stepBrainstem` (`l2/neuro/spont.ts`) compares `cbfRel` with
  `BRAINSTEM_CBF_MIN` and reads the no-flow flag (rhythm pulseless or `coRatio` ≤ 0, built in `l2/resp/pipeline.ts`); it
  is called inside `stepSpontDrive` in MODELED only when the breathing source is spontaneous, ventilator or external,
  and directly on the gas grid in MANUAL. `brainstemOutF(cbfRel)` (`l2/circ/baroreflex.ts`) is read by the baroreflex
  (`circ/model.ts`, `brainF: brainstemOutF(m.ext.cbfRel)`), the endocrine adapter (`endo/adapters.ts`, × the drugs'
  `symp`) and the thermoregulation (`resp/pipeline.ts`, `stepTemp`'s `brainF`). All four read `organs.brain.cbfRel`.
- **Who reads cerebral flow today (checked on main 7320de53 and pull request 512's head):** the cortex's delivery
  (`energy.ts` `brainDo2Rel`, flow × content), PbtO2 and SjvO2 (`model.ts`, flow × content ÷ demand), CBV → ICP → CPP
  → Cushing (`flow.ts` `cbvRel`, `model.ts` `solve`), the organ numeric `cbf` (`organs/pipeline.ts`): flow or delivery
  as each should. The vasomotor gate `brainstemOutF(cbfRel)` (`circ/baroreflex.ts`, fed by `organs/effects.ts`, which
  copies `cbfRel` into `hemo.circ.ext.cbfRel`) → the baroreflex (`circ/model.ts`), the endocrine adapter
  (`endo/adapters.ts`), the thermoregulation (`resp/pipeline.ts`); and the breathing gate (`stepBrainstem`, fed by
  `engine.ts` through the resp context): flow where delivery is meant (B5c).
- `targetCbf` multiplies `autoreg × co2Factor × o2Factor × drugs` (and, in pull request 512, `anaemiaFactor`) with no
  shared ceiling; the t = 0 organ view falls back to Hb 14/14 before the blood's first step (`organs/inputs.ts`
  `bloodOut`), while `pat.hb` and `pat.hbRef` already exist (`blood/params.ts` `bloodPatient`).
- The blood model's systemic viscosity term: `setCircViscosity` (`blood/circ-adapter.ts`), SVR × (Hb/Hb_ref)^0.6
  [FIT], faded from the resting output (1.0) to none at CPR-level output (0.3).
- The random streams are named in `rng/sfc32.ts` (`StreamName`, `STREAM_NAMES`), each seeded from hash(seed, name);
  `engine.restore` seeds a stream missing from an older snapshot (`ectopyHazard`). The arrest's cause is
  `ArrestRequest.cause` (`l2/circ/arrest.ts`).
- The scenario patient's `neuro` block is the engine's `NeuroProfile` 1:1 (`controller/src/scenario/types.ts`
  `ScenarioPatient.neuro`); the `neuroProfile` clinical event applies it live (`l2/neuro/pipeline.ts`); no instructor
  control sends it yet.
- `targetCbf` (`l2/brain/model.ts`) is `autoreg × co2Factor × o2Factor × cmro2Mult × tempCmro2 × cbfVaso`, with no Hb
  term; `BrainInputs.hb` is already an input of `stepBrain`. B2a adds one factor there.
- `artefacts.ts` gates EMG on `1 − clamp01(lor)` and blinks on `lor < 1`; B3 changes only the argument.
- The compressions are the haemodynamic model's `hs.cpr` (`l2/hemo/pipeline.ts`: `active`, `rate`, `quality`), read by
  the gas coupling; the ECG's `artefact.cpr` (`CprSpec`, `l2/ecg/api-types.ts`) is a separate modifier. B3b reads
  `hs.cpr`.
- `depth()` feeds `diRaw` to `neuroOutputs` (`cmro2Mult`, `mapSetShiftMmHg`) and to `neuroResp` (`di`); B2 adds a
  separate displayed output and leaves `diRaw`. `conscious` is `hypnotic < 1`.
- `neuroResp` derives `loc` from `hypnotic` (`LOC_LO` 0.6 – `LOC_HI` 1.0); `loc` reaches the drive's `wake` and the
  ventilator buck condition.
- `spont.ts` holds the rule B7a retires: `GASP_ONSET_S` 30, `GASP_END_S` 120, `GASP_RR` 6, `GASP_VT_FRAC` 0.3 [FIT];
  and the two constants B7b moves into the brainstem compartment: `BRAINSTEM_CBF_MIN` 0.2, `GATE_REOPEN_S` 120; the
  withdrawal's `NO_FLOW_S` 60 is in `l2/circ/arrest.ts`. Pull request 504 leaves all of them in place.
- Pass order neuro → resp → organs → haemodynamics → EEG (`engine.ts`): consciousness and breathing one pass late.
- `pupilMm` is read by nothing on the monitor.
- The MANUAL-depth plan holds `CortexInputs`; B1 keeps a holdable `metabolic` in it.

---

## 9. Decisions

### 9.1 Decided

1. **Breathing after arrest is re-sourced.** Breathing continues through about the first minute, gasps follow over the
   next minutes, then apnoea; the earlier rule (small gasps from 30 s, apnoea by two minutes, the pulseless
   withdrawal) is retired by the piece that builds this. **Sits in:** §1.4 (breathing gate), §1.5.4, §2.1 A6 and A9,
   piece B7a. The evidence check moved its numbers (apnoea by 6–7 min; the human gasp rate and size where measured,
   the swine ranges by anaesthetic as context; gasps under compressions with Zuercher CCRP's rates; §5.1). The
   brainstem's own `{ store, fn, debt }` (B7b) stays blocked on a tolerance source; the decision does not need it.
2. **Recovery between a few seconds and twenty minutes of no flow: a placeholder curve between the sourced points,
   marked as a placeholder in the data.** **Sits in:** §1.3.6, §2.3 (the recovery table and the curve), piece B6b. The
   sourced points include animal points in the middle range (P6–P11), used for shape only.
3. **The patient who does not wake is left to the EEG plan's injury state, which reads this plan's debt.** **Sits in:**
   §1.3.7, §2.3 R8, §7.
4. **Consciousness is lost inside the EEG's slowing phase, at about a third of normal oxygen delivery, on the condition
   that the evidence supports it and that the result is true to physiology.** **Sits in:** §1.4 (consciousness row,
   `DO2_LOC` = 1/3), §2.1 A2, §2.2 (anaemia), pieces B2a and B2. The evidence supports it (Njemanze, Astrup, van Dijk;
   the 60 % option is contradicted by Weiskopf 2000). True to physiology needs the flow rise with anaemia, which is
   built first (B2a); B2 does not merge before it.
5. **No temperature term on the speed of recovery after the circulation returns.** Temperature acts through three
   separate mechanisms the engine has or will have: less O2 use during low flow (demand, §1.3.4), the direct slowing
   of the EEG with cooling (`cortexStep`'s cold term), and slower drug clearance (the drug layer), through which a
   cooled, sedated patient wakes later. The injury state carries two marked placeholders: protection by cooling begun
   at once, and harm from fever. **Sits in:** §1.3.6, §1.3.7, §2.2 (hypothermia), §2.3 R6, §3, piece B6b, §7.
   **The question it answers** (should cooling after the return make the brain recover faster or slower?) had three
   options: (A) faster, the rat EEG direction; (B) slower, the human waking direction; (C) no term. The
   evidence note (research note 85) found, and the decision rests on:
   - the sign changes with the species and the end point: unsedated rats cooled at once restore a continuous EEG
     sooner, even while still at 33 °C (Jia 2008 [FT]; Chen 2013 [FT], where the cooled times fall during cooling and
     rewarming); sedated adults wake later at 33 than at 36 °C (Lybeck 2018 [ABS]; Annborn 2023 [ABS], not
     significant with equal concentrations); cooled newborns normalise their EEG later (Thoresen 2010 [ABS]);
   - no source gives a size per degree for the speed of recovery, so either sign would be a fitted constant;
   - option B's premise (repayment slows with temperature as metabolism does) is contradicted by the unsedated rats;
   - cooling's own effect on an uninjured EEG at 33–36 °C is small (BIS −1.12 per °C, Mathew 2001 [ABS]; no burst
     suppression above about 24 °C, Stecker 2001 [ABS]) and the drugs' clearance falls in the cold (Bjelland 2013,
     Hostler 2010, Leslie 1995 [ABS]), so the drug layer is the mechanism of the later waking that fits most easily
     (the note's reasoning, not a measurement: no trial separates injury, temperature and drugs);
   - early cooling protects against lasting injury in animals when immediate (Kuboyama 1993, Leonov 1990, Abella 2004
     [ABS]) and fever after return goes with a worse outcome (Zeiner 2001 [ABS]; Hickey 2003 [ABS] in rats), neither
     sized per degree: hence the two placeholders in the injury state, not a term here.
6. **The reference haemoglobin of the flow rise with anaemia is the patient's own normal:** 15 g/dL for the adult man,
   and for each other default patient their own normal haemoglobin (item 11). The default patient is unchanged by the
   piece and nothing newly misses its band because of it. **Sits in:** §1.5.5, §2.2 (anaemia: the corrected premise),
   piece B2a, §5.1.
7. **The haemorrhage case's own-output band** (the coronary perfusion pressure at 60 s of compressions, `cppAt60`; a
   record of what that case's patient does, not a band set by a source) **is re-recorded with its cause stated, after
   the reference decision is applied.** The permission is for that one recorded row; a band a source sets is never
   moved. **Sits in:** §2.2 (the rows the piece may move), piece B2a.
8. **The glycine row is not counted as passed by the flow rise;** it is re-specified on brain water, its true
   mechanism, as a named cell of the blood-fluids plan (`docs/plans/fu-9-blood-fluids.md`, F11 / task A8), whose
   brain-water mechanism it tests. **Sits in:** §2.2, piece B2a; the blood-fluids plan's change is handed over, not
   made here.
9. **Gasps after an arrest occur by chance, as in people,** with the incidence the sources give (by the arrest's cause
   where the sources separate it), and the instructor or the scenario's author can set that this patient gasps or does
   not. **Sits in:** §2.1 A6, §4, piece B7a (the incidence and its source, the `'gasping'` stream drawn once per
   arrest, the `NeuroProfile.gasping` setting with its scenario field `patient.neuro.gasping` and its instructor
   control, and what the tests hold fixed).
10. **The brain's delivery reference is the patient's own normal haemoglobin** (the content at it, SaO2 0.97, PaO2 95):
    a healthy default patient rests at a delivery of exactly 1. **Sits in:** §1.3 item 1, §1.5.6, piece B2d, and B5c,
    which reads it.
11. **The factor's reference for every default band is that band's own normal** (adult woman and older man 13.5, child
    12.5, infant 11.5, neonate 17 g/dL, as the blood model's table gives them), as for the adult man. **Sits in:**
    §1.5.5, §2.2, piece B2a.

### 9.2 Open (each holds what it names)

Each question below is put in one sentence, explained, given its options with what each rests on and what residents
would see differently, the pieces each option changes, and a proposal with its reason. The proposals are the plan's
(mine); none is a number chosen to make a cell pass. **What can start before any answer:** B2v (built with the
ceiling as one marked parameter, R_N, which an answer changes as data, without rework: B2v, mechanism), B2d (reads no
answer), B5c (after B2d; it reads delivery whatever the answers) and B2a's rework of everything but its form (B2a,
needs). What waits: B2a's form (item 3), the reading of B2a's cells at rest (items 1 and 3), and through the joint
merge B5c's landing and B2.

1. **How far can a normal brain's flow still rise, at normal blood pressure, when its vessels widen fully?**
   - *In plain words.* The simulator gives the brain's resistance vessels one store of widening, spent together by
     carbon dioxide, low oxygen, the drugs and anaemia. At normal pressure its size, R_N, is the most that flow can
     rise above resting. It is today a by-product of the engine's pressure–flow line (1.40, no measurement), and no
     human study shows where the true maximum lies: each volumetric or whole-brain study gives a rise that was still
     growing; the one velocity study describes a plateau, but counts it from below rest and gives no rise above rest.
   - *The measurements (§2.2, B2v; notes 90, 90a §2 and §4, 90b §5).* Whole-brain or volumetric flow: × 1.39 with
     acetazolamide 15 mg/kg (PET, 19 adults); × 1.54 internal-carotid flow and × 1.50 carotid plus vertebral at
     PaCO2 ≈ 49 with MAP not significantly changed, rising to × 2.2 at PaCO2 ≈ 62 when MAP had risen 21 % (3 of 16
     subjects); carotid conductance (flow per mmHg) up to × 1.85 (Willie 2012). Whole-brain flow by the nitrous oxide
     method in healthy young men breathing 5 % CO2 (6 studies) or 7 % (2), the mean pooling both: 53 → 93 mL/100 g/min
     (Table II, p. 486; the authors give the rise as averaging 75 %, Summary p. 491), at an arterial PCO2 of 43 → 52 mmHg
     (Table I, p. 485; at 5 % 42 → 50, 41 → 47, 41 → 48, 48 → 54, 41 → 46, 42 → 53; at 7 % 45 → 60, 45 → 58) and a direct
     mean arterial pressure of 82 → 93 mmHg (Table III, p. 487; the authors state that it rose significantly during the
     CO2 inhalations, Summary p. 491), so the figure is not at a constant pressure; no plateau is shown (Fig. 3, p. 490)
     (Kety & Schmidt 1948, J Clin Invest 27:484). Grey-matter-weighted flow: × 1.55,
     1.68 and 1.79 at 13, 15 and 18 mg/kg (Xe-133; every step significant; blood pressure slightly lower; at 18 mg/kg
     n 6, all with severe side effects; Grossmann & Koeberle 2000); × 1.70 at 16 mg/kg (ASL, 11 controls). Dogs give
     the form, not a human number: the rise to CO2 halves when pressure is held at 100 and vanishes at 50 (Harper &
     Glass 1965), and the fitted limits lie inside the measured points.
   - *Where the CO2 measurements differ (set side by side, not resolved).* Battisti-Charbonney 2011: MCA velocity from
     the hypocapnic floor (end-tidal PCO2 ≈ 25–28 mmHg), not from rest, sigmoid maxima of 78.9–80 % hyperoxic and
     101–101.7 % hypoxic (all subjects), the MAP threshold at an end-tidal PCO2 of 49.1 / 44.4 mmHg. Willie 2012: ICA
     volumetric flow from rest, × 1.54 at PaCO2 ≈ 49 (MAP not significantly changed), × 1.88 at 54, × 2.17 at 58 (MAP
     +14 % at 58), conductance × 1.85 at ≈ 58. Kety & Schmidt 1948: whole-brain flow from rest (arterial PCO2 43), × 1.75
     at PaCO2 52 on the means (arithmetic on Table II; per subject × 1.34 to × 2.55) with MAP +13 % on the means. The
     velocity study describes a plateau, while the two volumetric studies show flow still rising at PaCO2 52–60;
     reasons not tested here: the authors' caveat that velocity understates flow if the MCA widens, the different
     references of the percentages, end-tidal against arterial gases, and the pressure rise.
   - *Options.* R_N is built at **1.40, the built value**: marked [P], not sourced, the engine's own pressure–flow
     line continued. In a normal patient the engine's CO2 response (3 % per mmHg) stops at the ceiling, so each option
     also sets the PaCO2 above which hypercapnia adds no flow (mine, arithmetic on `co2Factor`); measured flow was still
     rising at PaCO2 54 and 58 (internal-carotid flow × 1.88 and × 2.17, conductance × 1.69 and × 1.85; Willie 2012).
     - **(a) Keep 1.40.** Rests on no measurement; the one whole-brain value at a fixed dose (× 1.39, PET, 15 mg/kg,
       where the Xe-133 study gave × 1.68 at the same dose) is at it, every other volumetric or whole-brain figure above
       it (the 1948 whole-brain CO2 study too: × 1.75 on the means, with MAP + 13 %). The velocity study's plateau gives
       no rise above rest, so it neither supports nor contradicts 1.40. Residents see: a
       normal patient's flow and ICP stop rising with CO2 from PaCO2 ≈ 53; an anaemic patient at rest reaches the
       ceiling below about Hb 6 (pooled line) or 9 (power form), and from there hypercapnia, hypoventilation or a
       volatile add no flow and no ICP rise; the hypoxic rise stops from PaO2 ≈ 48.
     - **(b) About × 1.5**, the internal-carotid and vertebral flow at PaCO2 ≈ 49 with the pressure unchanged. A point
       on a rising curve, not a maximum; the 1948 whole-brain figure at PaCO2 52 lies above it, with the pressure up
       13 % on the means. Residents see: a normal patient's CO2 response stops from PaCO2 ≈ 57; an
       anaemic patient keeps a small CO2 and ICP response down to about Hb 8 (power form), and with the pooled line the
       cap is not reached within the holds.
     - **(c) About × 1.8**, where two independent measurements meet: internal-carotid conductance (volumetric, flow
       per mmHg, so corrected for the 14 % pressure rise) × 1.85 at PaCO2 ≈ 58, and acetazolamide 18 mg/kg × 1.79
       with blood pressure slightly lower (Xe-133, grey-matter-weighted, n 6). Neither shows a plateau, so it is still
       a lower bound; correcting by conductance assumes flow follows pressure at that degree of dilation (mine). The
       1948 whole-brain figure (× 1.75 at PaCO2 52 on the means, MAP + 13 %, not corrected) lies near it before any
       pressure correction (mine); the velocity study neither supports nor contradicts it.
       Residents see: a normal patient's flow rises with CO2 to PaCO2 ≈ 67; an anaemic patient still raises flow and
       ICP clearly with CO2 down to about Hb 6 (power form) or 8 (constant transport).
     - **(d) Build a marked value and state the measurement that would settle it:** the maximal rise of whole-brain
       flow at a clamped blood pressure (hypercapnia with the pressure rise prevented, or acetazolamide at 20 mg/kg or
       more with volumetric flow; §5.3).
   - *Pieces each option changes.* Every option: B2v's one value R_N and the unit values computed from it (no change of
     form, of the curve below the lower limit or of the cells below it and under compressions, which read 1 under every
     option); the engine's own-output records in which a dilating request exceeds 1.40 above the lower limit (deep
     hypercapnia, hypoxaemia, anaemia at rest) are recorded a second time, with the value as cause, when R_N changes;
     B2a's cells at rest (the haemoglobin at which the rise is capped, and the CO2 response left in an anaemic
     patient). B2d: none. B5c: no code; its rows of anaemic patients at rest move with their flow, listed. B2v can start
     before the answer.
   - *Coupled to item 2.* Adults with sickle-cell anaemia rested at × 1.61 of the controls' flow and reached × 2.11
     after acetazolamide (Vaclavu 2019): no ceiling from (a) to (c) reaches the second without a viscosity term
     (confounded by sickle vasculopathy, chronic adaptation and ASL at low haematocrit; mine).
   - *Proposal (mine): (d), with (c), × 1.8, as the proposed value.* It is the highest rise measured at normal
     pressure by two methods that answer the two objections to the others: the conductance removes the pressure rise
     that inflates the largest CO2 flows, and the acetazolamide figure was reached with the pressure falling. × 1.5 is
     a point on a still-rising curve, and × 1.39 a submaximal dose read by a method that gave less than Xe-133 at the
     same dose. (c) rests on few subjects (7 at the CO2 step, 6 at the dose) and on one grey-matter-weighted method,
     so it stays marked [P] as a lower bound until the clamped-pressure measurement exists. The proposal stands after
     the 2011 velocity study and the 1948 whole-brain study were read in full: the first counts its rise from below
     rest and so gives no figure against rest, and the second, near × 1.8 only before a pressure correction, rests on
     means that pool two CO2 concentrations and rise with the pressure, so neither narrows nor replaces (c)'s two methods.
2. **When the brain's vessels are already fully widened, does thinner, diluted blood still let more blood through?**
   - *In plain words.* Thinner blood flows more easily through any tube. While the brain's vessels can still adjust,
     they narrow to make up for it, which is why people show no separate effect of viscosity on resting flow. Once
     they are fully widened (deep hypotension, chest compressions, maximal CO2) they cannot make up for it, and
     physics says the diluted patient's maximal flow should be higher. No study read tests this.
   - *The evidence (§2.2; notes 90a §6, 90b §4 and §6).* At rest, the human sources find no independent viscosity
     effect (Brown 1985, Borzage 2016, the 1982 plasma exchange); the rats' measured viscosity fall would have raised
     flow more than the whole measured rise if passed through (mine, Tomiyama 1999), so it is compensated at normal
     tone. The one study of the CO2 flow response after dilution (cats, Rebel 2003) prints only percents of an
     unstated reference, so it cannot show whether the diluted brain's maximal flow differs from normal, and its hypercapnia may
     not have reached the ceiling at all (mine). Adults with sickle-cell anaemia reached a higher flow after acetazolamide than controls
     (Vaclavu 2019), which a raised ceiling would fit. In people at MAP ≈ 55 under prostaglandin E1 and sevoflurane at
     Hct 24 %, MCA velocity stood at 1.35 × its pre-dilution value (J Clin Anesth 2005 [FT]; velocity, vasodilating
     agents), where the engine, below its lower limit, gives no rise: the cell most at risk from this question.
   - *Options.*
     - **(a) No viscosity term in the brain** (the build today). Rests on the human finding at rest and on the absence
       of any test at maximal dilation. Residents see: a diluted patient in deep hypotension or under compressions has
       the same cerebral flow as an undiluted one at the same pressure, so his O2 delivery falls with his content and
       his EEG and consciousness fail at a higher pressure, in the direction the injury studies show (anaemia with deep
       hypotension harms the brain).
     - **(b) A viscosity term that raises the maximally dilated flow** (a factor on B2v's F_max from the blood's
       viscosity, read from one rheology relation at a stated resistance calibre [P], the relation the blood plan holds,
       §7). Rests on physics, the rats' measured viscosity fall and the sickle-cell values; no measurement of its size
       in the brain. Residents see: a diluted patient below the lower limit or under compressions has more cerebral flow
       than an undiluted one at the same pressure, part of his content fall is made up, and his EEG fails at a lower
       pressure; the coronary perfusion pressure and low-flow oximetry rows of §6.3 may move with his brainstem's reading.
     - **(c) Build (a), marked as an omission in the code, and state the measurement that would settle it:** absolute
       maximal flow (with CO2, acetazolamide, or below the lower limit) in diluted against undiluted brains (Rebel
       2003's absolute flows; the flow response to CO2 or acetazolamide after acute haemodilution in people; §5.3).
   - *Pieces each option changes.* (a) and (c): none beyond the comment beside B2a's factor. (b): B2v (a second factor
     on F_max, no change of the reserve's form), B2a (the omission note goes), the cells under compressions and below
     the lower limit (§6.3) re-read; it needs the blood plan's viscosity relation first. B2d: none. B5c: no code; its
     readings in diluted patients below the lower limit move. Every piece can start before the answer: (a) is what they
     build, and (b) adds a factor without rework.
   - *Proposal (mine): (c).* No study measures the effect at maximal dilation; the human evidence at rest fits a
     compensated viscosity, which (a) already gives where the vessels can still adjust; and the error of (a) is toward
     ischaemia in the diluted, hypotensive patient, which the injury studies show to be the real danger. A term whose
     size no brain measurement sets would be the plan's inference built as physiology.
3. **How much should a healthy patient's brain flow rise as his haemoglobin falls during a case, and in what shape?**
   - *In plain words.* As haemoglobin falls, the brain widens its vessels so that its oxygen supply falls less. The
     sources agree it rises; they disagree on how much and on the shape, and they describe different patients. The
     simulator needs one rule for a patient who bleeds or is diluted during an anaesthetic, which is what the teaching
     cases mostly are; a chronic anaemia enters only when the instructor sets Hb in a patient's profile.
   - *The evidence (§2.2, with its table; notes 90a §1, §3, §5, 90b §§2–4, §6).* The pooled acute human dilution line
     (0.66 % flow per 1 % fall of content; mixed volunteers and anaesthetised or diseased patients; ranges not stated)
     is the lowest of the human sources below Hb ≈ 12. The one wide-range human series (Brown 1985: 54 awake people
     with chronic anaemia or polycythaemia, PaCO2 and MAP uncontrolled) prints no equation; its figure lines give about
     × 1.45 at Hb 10 and × 1.75–1.83 at Hb 7, against × 1.20 and × 1.34 on the pooled line, and fit a straight line and
     a reciprocal about equally. Anaesthetised patients diluted acutely (2005) raised MCA velocity × 1.56 for a 39 %
     fall of content (by content: pooled line × 1.26, power form × 1.40, constant transport × 1.64; by haematocrit, 37 → 25 %: × 1.21, 1.31, 1.48). The animals lie mostly between the pooled line and the
     power form; the rabbits show no rise until content fell by about a quarter, then a steep one.
   - *Options* (each relative to the patient's own normal; all are spent from the reserve and held at 5.7–19.1 g/dL).
     - **(A) The pooled acute line**, 1 + 0.66 × (1 − h) (the working size). Rests on the only acute isovolaemic human
       dilution data, pooled. Residents see the smallest rise: at Hb 9 flow × 1.25 and O2 delivery ≈ 0.78 of normal; the
       reserve is left for CO2; the brain looks the most ischaemic in severe anaemia.
     - **(B) The power form**, h^−0.683 (one healthy-volunteer study's abstract means). Residents see: at Hb 9 × 1.39
       and delivery ≈ 0.86; the ceiling of item 1 reached at moderate anaemia, after which CO2 adds little.
     - **(C) Constant O2 transport**, 1 ÷ h (the hypothesis Brown tested; the cats' albumin dilution kept transport).
       Rests on a chronic human series and one animal study; Brown's own figure shows transport lower at the anaemic
       end. Residents see: delivery held at normal until the ceiling is reached (about Hb 10.5 at 1.40), then falling; no
       CO2 response left in moderate anaemia.
     - **(D) A rise that starts only below a threshold** (the rabbits). No human source gives the threshold or the
       slope, and the plan does not carry animal numbers to people; it cannot be built from the sources read.
     - **(E) Two relations**: (A) for a fall during the run, Brown's chronic relation for a profile-set Hb. Rests on the
       difference of patients between the sources; Brown's relation has no printed equation (its lines read off the
       figures), and a patient who arrives anaemic and then bleeds needs a rule for both. Residents see: the
       instructor's chronically anaemic patient starts with a higher flow and less reserve than a patient bled to the
       same Hb.
     - **(F) Build a marked working form and state the measurement that would settle it:** an acute isovolaemic
       haemodilution study in people with volumetric flow from Hb 14 to 7 at controlled PaCO2, awake and anaesthetised,
       and the pooled studies' own slopes and ranges (§5.3).
   - *Pieces each option changes.* (A), (B), (C), (F): B2a only (its one form function and its source data, and its
     source cells); B2v, B2d and B5c none (the haemoglobin at which item 1's ceiling caps the rise follows from the
     form). (E): B2a gains a second relation and a stored chronic baseline read at t = 0 through B2d's path, a larger
     rework of B2a. Every piece but B2a's form can start before the answer.
   - *Proposal (mine): (F), with (A) as the working form.* The teaching cases are acute, and (A) is the only acute
     isovolaemic human dilution relation; Brown's relation is chronic and has no printed equation, and the 2005
     velocities are anaesthetised, under vasodilating agents and by velocity. (A) is the lowest of the human sources,
     so its error is toward ischaemia, and the code states beside it that every other human source read lies above it.
     (E) is the next question once a chronic relation with printed coefficients exists (Brown 1984, §5.3).
