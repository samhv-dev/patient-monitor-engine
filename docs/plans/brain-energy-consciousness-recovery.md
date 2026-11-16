# The brain without blood flow, and its recovery: one brain energy state, read by the EEG, consciousness and breathing — Plan

**STATUS: REVISED DRAFT FOR REVIEW.** The four design questions of the first draft are ruled (§9.1). One question is
open: the sign of temperature's effect on recovery after the circulation returns (§9.2); it holds only B6b's
temperature term. The parameters were checked against the published measurements in
`research/81-evidence-brain-under-arrest-and-cpr.md` (§5.1 gives the outcome number by number). No product code,
test, constant, card or other plan was changed while writing it.

**Base.** `origin/main` **f42a8ee9**. The repair that makes MANUAL breathing pass through the brainstem-perfusion gate is
on main; the gate's split into `stepBrainstem`, `brainstemGate` and `gatedRate` (`l2/neuro/spont.ts`) is the form this
plan reads. Every `file:line` is a starting point only; an executor finds the code by the function name.

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
body (§3), MANUAL and MODELED (§4), the sources and what they did to each number (§5), the pieces (§6), what is outside
(§7), the self-review (§8) and the record of decisions with the one open question (§9).

---

## 1. The structure

### 1.1 The choice: one brain energy state in the organ model, two compartments

**`BrainEnergy`, new file `packages/engine-core/src/l2/brain/energy.ts`, a field of `BrainState`
(`l2/brain/model.ts`), stepped inside `stepBrain` on the brain's 10 Hz grid.** It holds one entry per compartment,
`cortex` and `brainstem`, each `{ store, fn, debt }` once built. It publishes, on the organ view, per compartment:
`delivery`, `fn`, `debt` and, for the cortex, `metabolic` (= the EEG's present definition, §1.3). The cortex entry
arrives in B1; the brainstem entry arrives in B5 as a relocation of the breathing gate's present state, takes its
re-sourced time course in B7a, and becomes `{ store, fn, debt }` only in B7b, which is blocked on a source (§6).

Why here:
- **Flow and O2 delivery already live here.** `stepBrain` already computes the delivery/demand ratio for PbtO2 and
  SjvO2 (`brainOxygen`), and the organ model has every input: CBF after autoregulation, CO2 and O2 reactivity, Hb,
  SaO2, PaO2, temperature (`tempCmro2`) and the drugs' CMRO2 (`BrainDrugs.cmro2Mult`). Hypoxaemia, anaemia,
  hypotension, hypothermia and drug-lowered metabolism therefore reach the state through code that exists. The one
  input that exists but is not used where it should be is Hb in `targetCbf` (the flow rise with anaemia, B2a).
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
   restored more than the supratentorial flow (Shaffner 1999 [ABS]), which one global CBF cannot show].
2. **Steady-state function** `fnSS_c(D)` = 1 above the compartment's abnormal level, 0 below its failure level, linear
   between. For the cortex these are today's `DO2_EEG_ABNORMAL` 20/50 and `DO2_EEG_LOST` 12/50 (Miller Ch35 p. 1122;
   Ch10 p. 211: EEG ischaemia from about 20, isoelectric at about 15, membranes kept between about 6 and 12), and
   `metabolic` = 1 − fn reproduces today's value exactly. The constants move with the function to `l2/brain/params.ts`.
   **Thresholds stay on delivery, not on delivery ÷ demand** (decision, §1.5.1). The critical flow under anaesthesia
   is now sourced per agent (halothane ≈ 20, enflurane ≈ 15, isoflurane ≈ 10 mL/100 g/min, Michenfelder 1987 [ABS];
   sevoflurane 11.5 ± 1.4, Grady 1998 [ABS]); it becomes a sourced agent factor on the cortex's abnormal level in
   piece B9, not a ratio.
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
   (the ruling, §9.1 item 2). The sourced points and the placeholder rows are §2.3.
7. **Lasting injury** (the patient who does not wake) is the EEG plan's injury state, which reads this state's debt
   (the ruling, §9.1 item 3; §7). This plan publishes the debt and does not model the injury.

Non-ischaemic patients: store clamped full and debt exactly 0 whenever delivery has never been below the abnormal
level, so `fn` = 1 and `metabolic` = 0 bit for bit; nothing new moves (the regression rows are the test, §6).

### 1.4 The readers, and what happens to the present values

| Reader | Reads | Present value, and what it becomes |
|---|---|---|
| EEG cortex (`l2/eeg/state.ts` `cortexStep`) | cortex `metabolic` | `metabolic` is no longer computed inside `cortexStep` from `do2Rel`; the cortex takes it from the organ view through `CortexInputs`. **The holdable input stays in `CortexInputs`** (a field `metabolic`, with `do2Rel` kept only as the pattern table's way to state it), so the MANUAL-depth plan's `ischaemic-slowing` and `ischaemic-loss` patterns still hold a value in the vector and `cortexStep`'s derivation of `metSupp` and `suppress` is unchanged. |
| Consciousness (`l2/neuro/depth.ts`) | cortex `delivery`, through `NeuroEnv` (as `neuroglycopenia` arrives) | A new ischaemic term `isch` in the consciousness level `hypnotic`, **ruled**: consciousness is lost inside the EEG's slowing phase, at about a third of normal delivery (§9.1 item 4). Form: `isch` = clamp01((DO2_EEG_ABNORMAL − D) ÷ (DO2_EEG_ABNORMAL − DO2_LOC)) in hypnotic units, with a new named constant **`DO2_LOC` = 1/3** (the ruling; sources: syncope at MCA velocity 68 % below the pre-tilt value, Njemanze 1991 [ABS]; electrical failure at ≈ 15 mL/100 g/min, "approximately 35 % of control", Astrup 1977 [ABS]; loss of consciousness in the first slow phase, van Dijk 2014 [ABS]). It rises from 0 at the slowing onset to 1 (unconscious) at D = 1/3 and adds to the drugs' level as `GLYCO_U` adds neuroglycopenia. It no longer rests on the EEG's fitted `METABOLIC_SLOW_SHARE`, which stays the EEG's own. **Condition of the ruling:** it is true to physiology only with the flow rise with anaemia (B2a), so B2 does not merge before B2a (§2.2). |
| The present index (`di`, `sr`, BFA sensor only) | the same term, and the cortex's metabolic suppression | Adding the term to the index's `u` cannot show a flat brain: at fn = 0 the formula gives an index ≈ 25 and SR ≈ 20. So the displayed SR is `max(drug SR, 100 × metSupp)` (the cortex's ischaemic suppressed-time fraction, the quantity SR is defined to measure), and the displayed index is the lower of the drug index and the index the formula's own SR relation gives at that SR (`base = 30 − 25 × SR/100`, so SR 100 → 5) [ENG: the present formula's own SR–index relation inverted; no new number]. A separate output beside `diRaw`. **`diRaw` itself, which feeds `neuroOutputs` (`cmro2Mult`, the MAP set-shift) and the drive's sedation term, stays drug-only and unchanged**: the depth plan's ruling keeps the index → physiology coupling exactly as it is until its own piece moves it, and ischaemic demand reduction is the energy state's own functional share (§1.3.4), never counted again through `cmro2Mult`. |
| EEG artefacts (`l2/eeg/artefacts.ts` `emgLevel`, blinks) | the neuro model's consciousness ramp (`loc`) beside the cortex's `lor` | Frontalis tone and blinks follow consciousness: `w = 1 − clamp01(lor + isch)`, the same additive rule the neuro model uses for `hypnotic`, with `isch` the same ischaemic term (one function in `energy.ts`, two readers). The arousal term (`EMG_AROUSAL`) and the tube term are gated by the same `w`. Blinks need consciousness and the brainstem (Magliacano 2021 [ABS]; van Dijk 2014 [ABS]). The compression artefact (B3b) is added on the same path. The readers then compute index and SR from the signal; nothing is set. |
| Breathing gate (`l2/neuro/spont.ts` `stepBrainstem`) | brainstem entry | First re-expressed with identical output (B5): the anoxia timer `anoxS` becomes the brainstem entry's state, and the gate's existing constants become its parameters. Then **re-sourced in B7a (ruled, §9.1 item 1)**: breathing continues through about the first minute, gasps follow over the next minutes, then apnoea; the gasp pattern under compressions; the earlier rule (small gasps from 30 s, apnoea by 2 min) and the pulseless withdrawal over `NO_FLOW_S` are retired in that piece. The brainstem's own `{ store, fn, debt }` is B7b, blocked on a tolerance source. |

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
   [ABS]; §2.2), and it is carried as the sources state it: a critical flow per agent, applied as a factor on the
   cortex's abnormal level (B9), not as a demand ratio. Mine: the order of the sourced values (isoflurane lowest,
   halothane highest) runs with the agents' CMRO2 reduction, but no source read derives the thresholds from demand, so
   a ratio would be an inference the plan does not make.
2. **The functional share does not reach flow–metabolism coupling.** `targetCbf` keeps `cmro2Rel` (drug × temperature)
   exactly. A silent brain lowering its own target flow, which lowers delivery, which keeps it silent, is a latch; its
   real counterpart, post-ischaemic hypoperfusion and the falling reflow under CPR after a long no-flow time, is a
   named attachment (§7). The flow rise with anaemia (B2a) is a different input (the blood's O2 capacity, not the
   brain's function) and makes no latch. Test, with the points chosen by delivery (hypoxaemia at PaO2 35 keeps delivery
   above 1 through `o2Factor`, so it would test nothing): MAP lowered until cortex delivery is 0.30 for 60 s and
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
   at the reference saturation (Hb ÷ the reference Hb in `caO2(14, 0.97, 95)`), so no hypoxaemia row moves. Whether
   the two should be one content term (Brown 1985 [ABS] names O2 content the major determinant) is stated as a later
   question in B2a's PR, not built (mine).

---

## 2. What the brain shows as flow falls and returns

Each row: mechanism, source, time course, the cell it becomes. Every reader computes from the signal; nothing is set.

### 2.1 Abrupt no flow (VF, asystole), normothermic

| # | What | Mechanism in this plan | Source | Time course / cell |
|---|---|---|---|---|
| A1 | EEG slowing, then isoelectric | cortex store drains, `fn` falls through the slow share then to 0 | Clute 1990 [ABS]: change in 82 of 93 ICD-test arrests, "an average of 10.2 s after the last normal heart beat", mostly slowing and attenuation; de Vries 1998 [ABS]: isoelectric at 11 ± 2 s; de Vries 1997 [ABS]: EEG changed at 12 ± 4 s; Pana 2016 [ABS], review of 39 studies: EEG lost < 30 s | cell: raw EEG < 5 µV (cortex part) by VF + 9…13 s end to end; must-hold < 30 s. Red on main through the circulation's decay (§1.3.3) |
| A2 | Loss of consciousness | `isch` reaches 1 at D = 1/3, inside the slowing | Wieling 2009 [ABS] (review): "as little as approximately 7 s" in sudden complete circulatory arrest; Sauvageau 2010 [ABS] (8 filmed hangings): "at 8-18 sec"; van Dijk 2014 [ABS]: in the first slow phase; Aminoff 1988 [ABS] (22 ICD-test VT/VF of 15–126 s, awake): definite LOC in 15, probable in 2, and in 5 episodes no EEG change before LOC; Pana 2016 [ABS]: within 30 s | cell: `flags.conscious` false within 7–18 s of VF onset (target, Wieling and Sauvageau; Sauvageau's hangings are an asphyxial and venous-obstruction condition, not an abrupt arrest), must-hold ≤ 30 s. **Stated limit (mine):** a threshold inside the slow phase cannot reproduce Aminoff's 5 episodes with LOC before any scalp EEG change; the scalp EEG is not the whole cortex's function, and the plan has one cortex entry |
| A3 | Frontalis tone, blinks, movement, response to command gone | artefacts and movement follow consciousness | Miller Ch36 p. 1142 (frontalis EMG falls with loss of consciousness, the engine's own source for `EMG_AWAKE`); Magliacano 2021 [ABS]; van Dijk 2014 [ABS] | EMG and blinks 0 once unconscious; movement follows the existing `movement` rule only while conscious |
| A4 | Processed index and SR | computed by each reader from the now near-flat signal | Kurita 2012 [ABS] (15 swine, isoflurane): BIS fell suddenly at MAP 22 ± 3 and was isoelectric before resuscitation; Aprea 2014 [ABS] (one calf): BIS 0, SR 100 in asystole | cell: BIS-type SR > 80 and index < 20 by VF + 90 s. The reader's burst-suppression rate runs over the previous 63 s (`bis-type.ts` `bsrWindowS`), so with the cortex isoelectric from about +14 s the window is full of silence only after about +77 s. Direction from Kurita/Aprea; the exact numbers [P]. Only without compressions: under CPR the compression artefact corrupts the BSR and the index (B3b, A10) |
| A5 | Myoclonus / tonic activity at onset | **attachment, not built here** (§7) | Lempert 1994 [ABS]: myoclonus in 38 of 42 complete syncopes (90 %), LOC lasting 12.1 ± 4.4 s; Aminoff 1988 [ABS]: tonic activity or twitching in 10 of 22 ICD-test episodes; van Dijk 2014 [ABS]: type A signs, including general stiffening, develop in the first slow phase | named; the slow-phase window is the state's (fn between slow and flat) |
| A6 | Breathing: continued, then gasps, then apnoea | brainstem entry, re-sourced time course (B7a) | **Continued breathing:** Zuercher 2010 BMC [FT] (61 swine, isoflurane 1.5–3 %), Table 2: minute 1, 61/61 at 10.3 (4.4)/min; Menegazzi 1995 [ABS] (12 swine, α-chloralose): agonal respirations in all through the first 2 min. **Gasps:** Zuercher Table 2: minute 2, 33/61 (54 %) at 1.4/min; 3, 50/61 (82 %) at 2.6; 4, 30/46 (65 %) at 1.8; 5, 7/31 (23 %) at 0.7 (the falling N is the animals assigned to longer VF); Tongying 2015 [ABS] (10 swine, anaesthetic not in the abstract): first gasp at 2.02 ± 0.84 min, last at 5.21 ± 1.12 min, 3.7 ± 1.6/min at minute 4; Srinivasan 2006 [ABS] (13 pigs, propofol): gasping in 13/13, crescendo-decrescendo, maximal gasp at 202 ± 34 s; Ristagno 2007 [ABS]: gasps increased in frequency over the first 4 min. **Rate and size by anaesthetic:** isoflurane (Zuercher): the per-minute means above, all under 3/min; IV anaesthesia (Lin 2023 [ABS], agent not in the abstract): 2–5/min, VT 0.62 ± 0.19 L, minute volume 2.51 L/min; α-chloralose (Menegazzi): 6–11/min, VT 502–852 mL; intubated humans during CPR (Wolfskeil 2017 [ABS], 292 OHCA): gasping in 26 %, median 274 mL (196–434) at 3.7/min (1.5–7.3). **Apnoea:** Zuercher: 0 of 16 at minute 6; Menegazzi: 2 of 12 (17 %) at minute 7; Tongying: none at minute 7, one animal at minute 8. **Incidence in people:** Clark 1992 [ABS]: 40 % of 445 OHCA, 46 % in cardiac vs 32 % in other causes; Eisenberg 2006 [ABS]: 55 % of witnessed arrests; Bobrow 2008 [ABS]: 33 % when the arrest followed EMS arrival | cells (B7a): breathing at near its pre-arrest rate through minute 1; gasps from the second minute; gasp VT larger than the resting VT under volatile and IV anaesthesia (Lin, Menegazzi), the rate inside the sourced range of the active agent; apnoea by minute 6–7, none after minute 8. The rule on main (gasps from 30 s, VT ≤ 0.3 × rest, apnoea by 2 min, withdrawal to 0 over 60 s) is retired. The awake patient's course is not measured (no study in awake animals): [P], §6 B7a |
| A7 | Pupils and brainstem reflexes | **not shown**: `neuroOutputs.pupilMm` is published only, read by nothing on the monitor | Jørgensen 1997 [ABS] (order of recovery); Bircher 1980 [ABS]: pupillary constriction returned with the EEG when open-chest massage doubled the carotid flow | attachment (§7) |
| A8 | EEG under CPR at partial flow | the cortex entry at CPR delivery ≈ 0.30–0.47 (measured CBF 0.30–0.40), held down by the debt the no-flow time left (B6b) | **Humans:** Reagan 2018 [ABS] (16 patients, SedLine + rSO2): "Voltage suppression was commonest and seen during 78% of overall cardiopulmonary resuscitation time and in 15 of 16 subjects"; suppression only at rSO2 ≤ 19 %, delta only above 40 %; AWARE-II 2023 [ABS]: normal-looking EEG activity "emerged as long as 35-60 minutes into CPR" in some (how many not in the abstract; a published letter disputes the reading); Olaussen 2017 [ABS]: consciousness during CPR in 112 of 16 558 resuscitations (0.7 %); Zhou 2024 [FT] (review): 0.23–0.9 %. **Animals, the no-flow dependence:** Kim 2020 [FT] (8 pigs, isoflurane stopped before VF): after 1 min of untreated VF, carotid flow "almost 40%" of pre-VF brought back background activity; the animal whose flow fell from > 30 % entered suppression; Bircher 1980 [ABS] (dogs, 2 min arrest): carotid flow 8–20 % of control under external CPR, EEG returned only with open-chest massage; Shaffner 1999 [ABS] (24 dogs): CPR at once, CPP 25: CBF 57 ± 10 % and ATP 64 ± 14 % of pre-arrest; after 6 min no flow, CPP 25: CBF 23 ± 5 %, ATP 16 ± 5 %; at CPP 35, no flow 6 → 12 min "reduced reflow from 71 +/- 11% to 37 +/- 7% of pre-arrest and reduced ATP recovery from 60 +/- 11% to 2 +/- 1%"; Eleff 1992 [ABS] (6 dogs, 6 min VF, pre-arrest flows by vest CPR): ATP 86 ± 7 % by 6 min of CPR, no further recovery; Lee 1989 [ABS] (rabbits): CBF above 20 % of normal under CPR only after 1 min of no flow, near zero after 7 and 9 min | **The engine's course is a confirmed miss**: after 1 min of no flow it wakes under CPR with a normal EEG after ≈ 4 min of compressions (B4 records it). Two mechanisms are in the sources (mine, from Shaffner and Lee): (1) **the brain's own debt**: at the same restored flow, ATP and the EEG recover less the longer the no-flow time; **B6b produces this dependence** (the debt accrued during the no-flow time caps `fn` under compressions, and at CPR delivery near or below the abnormal level the debt is barely repaid or still accrues); (2) **flow under compressions itself falls with the no-flow time** at the same perfusion pressure, a reflow deficit that belongs to the circulation and the cerebral vessels, a **named attachment** (§7). B6b reproduces: suppression under standard CPR after minutes of no flow (Reagan's 78 %), the rarity of waking under CPR, and EEG return under CPR after a short no-flow time at ≈ 40 % flow (Kim 2020, as a direction). It does not reproduce: the CBF fall with no-flow time (Shaffner's 71 → 37 %, Lee's near zero), the brainstem's better flow, or AWARE-II's late emergence 35–60 min into CPR (n not known). The delivery at which the EEG returns under CPR stays [P]: no source gives it as delivery (Reagan's rSO2 is not delivery). The BIS-rise reports (Kurita, Aprea, Azim, Jung, Pawlik) are confounded by the compression artefact (Fatovich 2006, Nitzschke 2012, Kim 2021) and are not used as evidence of repayment |
| A9 | Breathing under CPR | brainstem entry at CPR flow (B7a) | Zuercher 2010 CCRP [FT] (64 swine), Table 1, gasps/min during basic CPR: after 3–4 min of untreated VF, continuous compressions 21.1 (10.9), 30:2 15.4 (9.8); after 5–6 min, continuous 8.4 (6.7), 30:2 1.1 (2.1); first 3 min of CPR median 11 vs 0. Noc 1994 [ABS] (rats, 4 min VF, compressions without ventilation): rising to an average of 19/min in resuscitated animals, < 6/min in non-resuscitated, none with mechanical ventilation; Yang 1994 [ABS]: gasp frequency linearly correlated with coronary perfusion pressure (r² = .90); Debaty 2017 [ABS]: gasping during CPR in 177 of 1 827 people (≈ 10 %) | cells (B7a): gasps resume under compressions; more after 3–4 min than after 5–6 min of untreated VF (Zuercher CCRP, as the table states it); none under mechanical ventilation (Noc, rats). Zuercher's rates mix good- and poor-outcome animals; rates in poor-outcome animals are lower (the note's reading) |
| A10 | The compression artefact in the EEG | the EEG artefact path reading the compressions the engine already draws on the ECG (B3b) | Kim 2021 [FT] (8 pigs): "periodic motion artifact exceeding ±50 μV … Frequency components associated with the rate of CPR dominated the power spectrum"; Sethi 2008 [SEC, through Roberti 2023 [FT]]: periodic sharply contoured waveforms, isoelectric between attempts; Nitzschke 2012 [ABS]: the artefact "leads to a miscalculation of the Burst Suppression Ratio and Cerebral State Index"; Fatovich 2006 [ABS] (21 people and a cadaver): "a major component of the BIS tracing during external chest compressions appears to be due to movement artefact"; Chollet-Xémard 2009 [ABS] (92): BIS vs EtCO2 r² = 0.02, BIS did not predict ROSC or survival | cells (B3b): the artefact present only while compressions run, at their rate, above ±50 µV; the brain signal unchanged by it; the readers compute from the summed signal, so a rise of the index and a fall of SR under compressions are artefact, as the sources report; the instructor's view keeps the underlying brain state |

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
- **Anaemia: the flow rise is built, as piece B2a, before the consciousness piece.**
  - *The evidence.* Healthy conscious volunteers taken isovolaemically to Hb 5.0 g/dL showed no change of VO2 or
    lactate (Weiskopf 1998 [ABS], 32); at Hb 7 no neuropsychological change, at 6 and 5 slower reaction time, at 5
    poorer memory, all reversed (Weiskopf 2000 [ABS], 9); at Hb 5.7 ± 0.3 the deficits were reversed by raising PaO2 to
    ≥ 350 mmHg (Weiskopf 2002 [ABS], 31); at Hb 4.8 no evidence of inadequate systemic oxygenation (Lieberman 2000
    [ABS], 8). Cerebral flow rises as arterial O2 content falls: "CBF altering to maintain the rate of transport of
    oxygen to the brain within certain limits" over Hb 5.7–19.1 g/dL (Brown 1985 [ABS], 54); "a 2% increase in CBFV for
    each 1% decrease in Hc and CaO2" over Hb 14.5 → 10.3 (Mühling 1999 [ABS], 11); rCBF +35.0 ± 2.5 % at 3 h of
    haemodilution (Tu 1996 [ABS], 13); forebrain CBF 78 → 171 mL/100 g/min from Hct 43 % to 20 % (Todd 1992 [ABS],
    rats, halothane).
  - *What the engine does without it (mine, arithmetic on the engine's constants).* `targetCbf` has no Hb term, so
    delivery falls with Hb at normal flow: CaO2_ref = 1.34 × 14 × 0.97 + 0.003 × 95 = 18.48 mL/dL. At Hb 5 delivery is
    0.37 and at Hb 4.8 it is 0.35, inside the EEG's slowing band (0.24–0.40), so with the ruled threshold the volunteers
    of Weiskopf and Lieberman would show a slowed EEG and stand at 0.5–0.7 hypnotic units (the drive's
    loss-of-consciousness ramp begins at 0.6), to which any sedative adds; loss of consciousness from anaemia alone would come at Hb ≈ 4.5 g/dL (D = 1/3). The
    sources show awake people with a normal oxygen balance at these values, and a rise of flow that keeps brain O2
    transport within limits. **"True to physiology" (the ruling's condition) therefore needs the flow rise.**
  - *Why a piece and not an attachment (from the code).* `BrainInputs` already carries `hb` into `stepBrain`, and
    `targetCbf` (`l2/brain/model.ts`) is the one function that sets the target flow from its factors
    (`autoreg × co2Factor × o2Factor × drug × temperature`); the rise is one more factor of the same kind, relaxing
    through the existing `TAU_VASC_S`. Nothing outside the organ model this plan already works in is needed, so there
    is no reason to leave it outside.
  - *Form and slope (B2a).* A factor `anaemiaFactor(Hb)` = (cap(Hb) ÷ cap_ref)^(−k), with cap = 1.34 × Hb × 0.97 (the
    O2 capacity at the reference saturation, §1.5.5). The form is Brown's qualitative statement (flow altered to keep
    O2 transport within limits; k = 1 would be full compensation) [INF: the power form is the plan's]. The slope: the
    abstract of Mühling does not say whether "1%" is a relative change or a point of haematocrit. Read per point of
    haematocrit near Hct 42 (one point ≈ 2.4 % relative), the slope is k ≈ 0.83; read as relative, k ≈ 2, which would
    raise delivery above normal in moderate anaemia, against Brown's "within certain limits". Todd's rats give
    k ≈ 1.0 (ln 2.19 ÷ ln (43/20)) (mine, all three). **B2a uses k from the per-point reading, marked [INF], with
    Todd as the deep-anaemia check and Tu's +35 % reported beside it; Mühling's full text is WANTED to settle the
    unit**, and B2a's PR states the value either reading gives. Range: the factor is evaluated over the sourced Hb
    range and held at its value at the lowest sourced Hb (4.8 g/dL, Lieberman) below it [P: no measurement below
    4.8 g/dL; the vasodilator ceiling is WANTED]. Above the reference Hb the factor falls below 1 (Brown's range
    reaches 19.1 g/dL).
  - *Consequence for every patient (mine).* The engine's reference Hb is 14 for every patient, so a patient whose own
    Hb is not 14 gets a different resting CBF, CBV, ICP, PbtO2 and SjvO2 at t = 0 (Brown's cross-sectional relation
    says this is real). B2a lists every regression and validation row with Hb ≠ 14 or a falling Hb (haemorrhage,
    haemodilution, transfusion, the C34 brain rows) and attributes each moved row to the factor.
  - *Cells after B2a and B2.* Weiskopf 2000 / Lieberman 2000: a normotensive, normoxic patient at Hb 5 and 4.8 g/dL is
    conscious with an EEG above the abnormal level (with k ≈ 0.83 delivery is ≈ 0.86 at Hb 5; with any k in 0.8–1.0 it
    stays above 0.40, mine). Mühling: CBF at Hb 10.3 ÷ CBF at 14.5 within the band B2a states for its k. Todd: the
    direction and size at Hct 20 as a check, rats.
- **Hypoglycaemia:** today a separate hypnotic term (`GLYCO_U` 1.2 [FIT], glucose 60 → 30 mg/dL). Under this structure
  glucose is the second substrate of the same state: `fnSS` takes min(O2 supply, glucose supply), with EEG slowing at
  about 40 mg/dL and suppression below 20 mg/dL (Miller Ch10 p. 219, the EEG plan's U7). Piece B8 moves it and retires
  `GLYCO_U`'s consciousness term, so neuroglycopenia is not held twice. Until B8, both exist and the plan says so.
- **Hypothermia:** demand falls 7 %/°C (`Q10_BRAIN`), so store drain and debt accrual during low flow run slower; the
  cold EEG's own slowing and suppression (`cold`, Stecker 2001) stays in `cortexStep` because it is a rate effect on
  the cortex, not an energy failure. Loss of consciousness is common below 28 °C (Miller Ch71 p. 2254): a
  WANTED-sourced attachment for the consciousness term, not built here. The effect of temperature on **repayment after
  the circulation returns** is the open question (§9.2).
- **Drugs that lower CMRO2** act through `b.cmro2Rel` on demand: slower drain and debt. Hossmann 1988 [ABS] found no
  improvement of recovery after barbiturate anaesthesia in complete ischaemia, which this structure reproduces: in
  complete ischaemia a silent brain's demand is already basal, and a drug cannot lower what the electrical silence has
  already removed.
- **Anaesthetics and the critical flow:** the flow below which most patients develop EEG ischaemia within 3 min of
  carotid clamping is isoflurane ≈ 10, halothane ≈ 20, enflurane ≈ 15 mL/100 g/min (Michenfelder 1987 [ABS], 2 010
  patients); under isoflurane–N2O < 10, 5.9 ± 1.2 in the 6 with changes, halothane previously "18-20" (Messick 1987
  [ABS]); sevoflurane 0.3–0.6 MAC + 50 % N2O, rCBF50 11.5 ± 1.4 (Grady 1998 [ABS]). The engine's 20/50 matches the
  halothane value; which anaesthetic underlies Miller's figure is not stated (mine). In awake monkeys reversible
  paralysis came below about 23 cc/100 g/min (Jones 1981 [ABS]). Piece B9.

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
| P6 | 5 min untreated (pacing-induced) | rats, chloral hydrate (none for 30 min before), normothermic, 20 | isoelectric → burst suppression → continuous; first burst 21.5 ± 6.0 min; continuous background 239.5 ± 38.4 min; with 2 h hypothermia 15.1 ± 1.9 and 171.2 ± 15.2 min | Chen 2013 [FT] | shape: the milestone sequence and their ratio; rat time scale not transferred |
| P7 | 5 min untreated (asphyxial, arrest ≈ 3 min after it began) | rats, normothermic, 40 | first burst 25.70 [22.48–30.05] min; continuous ("normal trace") 208.39 [186.29–248.80] min | Chen 2019 [FT] | shape, as P6; asphyxial cause |
| P8 | 7 min asphyxia | rats, 24, at 33, 37, 39 °C for 6 h | bursting from isoelectricity; burst frequency in the first 90 min 16.9/min at 37 °C; "earlier restitution of continuous EEG activity with hypothermia" | Jia 2008 [ABS] | shape; temperature direction (§9.2) |
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
monotonically between the human ends and taking from the animal points only their shape: silence, then bursts, then a
continuous background, the times rising with the insult, and the first burst at about a tenth of the time to a
continuous background (P6, P7) [P, mine]. No rat or dog time is copied into a human row.

| # | What | Source | Course in this plan |
|---|---|---|---|
| R1 | Brief arrest (ICD testing, seconds): EEG back | P1–P3, P5 | cell (B6b): after a single-shock-test arrest (its VF duration is not in the abstract: [P] on the arrest length the cell uses, stated in the piece), cortex back to fn > 0.9 at 17 ± 9 s after the circulation returns; recovery time rises with the arrest's length (monotonic cell); repeated short arrests do not cumulate (P3) |
| R2 | Order of recovery | Jørgensen 1997 [ABS] (111 resuscitations): "spontaneous respiratory movements were either present or were the first function to return; thereafter followed pupillary light reflexes, coughing-swallowing, and ciliospinal reflexes"; Jørgensen 1981 [ABS]: cranial-nerve reflexes and decerebrate posturing before any cortical activity; Cerchiari 1990 [ABS] (P9) | cell: breathing returns before consciousness after any arrest that silenced both (B7a, once B6b exists) |
| R3 | The EEG's course after a long arrest | Jørgensen & Holm 1998 [ABS] (231): intermittent activity, then continuous delta → theta → alpha, over hours to days; Geocadin 2002 [ABS] (rats, 5 or 7 min asphyxia): more bursting in the first 30–40 min in good-outcome animals; P6–P8, P12 | `fnCap(Q)` rises from 0 through a burst-suppression range (the EEG cortex's existing suppression drives the bursting) to continuous; the times from the recovery table |
| R4 | Outcome by the EEG at 12 and 24 h | Ruijter 2019 [FT] (850 patients): generalized suppression (< 10 µV) or synchronous patterns with ≥ 50 % suppression from 6 h onward invariably meant poor outcome; continuous patterns at 12 h predicted good outcome (sensitivity 0.50, specificity 0.91); Westhall 2016 [FT] (103 of the TTM trial): a highly malignant EEG after rewarming meant poor outcome in all; a benign EEG in 1 % of poor outcomes | validation bands for the EEG plan's injury state (§7), not built in this plan's pieces |
| R5 | Awakening | P13, P14; Paul 2016 [ABS] (326, midazolam + fentanyl): delayed awakening (> 48 h after sedation stop) in 56 of 194 woken, at median 93 h | the far end of the recovery table; sedation is a confound the engine's drug layer carries separately |
| R6 | Temperature after return | Chen 2013 [FT] (P6): cooling shortened first burst and continuous background; Jia 2008 [ABS] (P8); Jia 2006 [ABS] (rats, 7 and 9 min asphyxia, 33 °C for 12 h): better qEEG recovery and 72-h deficit scores; Lybeck 2018 [ABS] (939, TTM): "Time to awakening was longer in TTM33 than in TTM36", not attributable to sedative doses in the first 48 h; Annborn 2023 [ABS] (71): 53 vs 46 h at 33 vs 37 °C (p = 0.09); Westhall 2016 [FT]: prognostic value of the patterns not changed by 33 vs 36 °C | **open: §9.2.** Temperature during the low-flow phase acts through demand (store and debt, §2.2), which is sourced and stays |
| R7 | Breathing after return | the gate on main reopens over 2 min (the ruled "1–3 min"); no timed source found; its order is sourced (R2); Reid 1998 (as the evidence check states it; not in its tables, not read here) (rats, 7 min): in 3 of 36 the brainstem response never returned, and none of those breathed | B5 re-expresses it unchanged; B7a keeps the 2-min reopening as [P] after the no-flow phases; a function of brainstem debt only in B7b |
| R8 | The patient who does not wake | Ruijter 2019 [FT], Westhall 2016 [FT], Elmer 2023 [FT]; mechanism (synaptic failure becoming lasting) Hofmeijer 2012 [ABS] | the EEG plan's injury state on this plan's debt (the ruling, §9.1 item 3; §7) |

---

## 3. Where the state meets the rest of the body

| Link | In or out | Reason |
|---|---|---|
| Cerebral autoregulation, CO2 and O2 reactivity | **reused** | `autoreg`, `co2Factor`, `o2Factor`, `TAU_VASC_S` already set CBF; the state reads CBF, so hyperventilation and hypercapnia act through flow, as Miller Ch35 p. 1127 says they do |
| Anaemia's flow rise | **in**, piece B2a | `targetCbf` gains an Hb factor (§2.2); the input exists in `BrainInputs` |
| Hypothermia | **in** (demand), consciousness below 28 °C **attachment**, repayment after return **open** (§9.2) | demand is existing code; the LOC temperature needs its source read |
| Drugs lowering CMRO2 | **in**, through `b.cmro2Rel` | existing code; the index → `cmro2Mult` coupling is kept as ruled |
| Anaesthetics and the critical flow | **in**, piece B9 | the sourced agent values (§2.2) |
| Glucose | **in**, piece B8 | the endocrine glucose state exists; retires `GLYCO_U`'s consciousness term |
| Chest compressions | **read** (B3b, B7a) | the compression state the ECG artefact already reads (`CprSpec`); one source of the compressions for every artefact |
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
  - Breathing: the instructor's rate passes through the brainstem gate; B5 and B7a change what the gate reads and
    produces (continued breathing, gasps, apnoea), not how MANUAL applies it. In the gasp phase the instructor's rate
    is replaced by the gasp pattern, with the override flag, as the gate's apnoea overrides it today.
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
downloaded.** The evidence check is `research/81-evidence-brain-under-arrest-and-cpr.md`.

### 5.1 What the evidence did to each number

| Plan number | Before | After | Source |
|---|---|---|---|
| A1 isoelectric 11 ± 2 s; red on main | stands | stands; de Vries 1997's 12 ± 4 s added | de Vries 1998, 1997 [ABS] |
| A2 LOC band ≤ 30 s | must-hold | stands as must-hold; target 7–18 s added | Wieling 2009, Sauvageau 2010 [ABS] |
| Q4 LOC threshold | proposal ≈ 0.32 on the fitted midpoint | ruled: 1/3 of normal delivery, own constant `DO2_LOC`; the 60 % option is contradicted (no change at Hb 7, where delivery at unchanged flow is ≈ 0.5) | Njemanze 1991, Astrup 1977, van Dijk 2014, Weiskopf 2000 [ABS] |
| Anaemia: no CBF rise; LOC at Hb ≈ 4.3 | named attachment | **changes: built, B2a, before B2**; LOC from anaemia alone moves far below the sourced range | Brown 1985, Mühling 1999, Tu 1996, Todd 1992, Weiskopf 1998/2000/2002, Lieberman 2000 [ABS] |
| §1.5.1 anaesthetic-specific critical CBF | WANTED | sourced; piece B9 | Michenfelder 1987, Messick 1987, Grady 1998 [ABS] |
| A6 continued breathing in minute 1 | proposal | stands | Zuercher 2010 BMC [FT]; Menegazzi 1995 [ABS] |
| A6 gasps in minutes 2–5, < 3/min | proposal | changes: start ≈ 1–2 min, peak minutes 3–5; rate a range by anaesthetic, < 3/min (isoflurane), 2–5/min (IV), 6–11/min (α-chloralose), 3.7/min in intubated humans under CPR | Zuercher BMC [FT]; Tongying 2015, Lin 2023, Menegazzi 1995, Wolfskeil 2017, Srinivasan 2006 [ABS] |
| A6 gasp VT ≤ 0.3 × rest [FIT] | engine rule | retired: larger than rest in pigs (0.62 ± 0.19 L; 502–852 mL); 274 mL median in intubated humans under CPR | Lin 2023, Menegazzi 1995, Wolfskeil 2017 [ABS] |
| A6 apnoea by 2 min (engine) / 6 min (proposal) | ruled on main / proposal | changes: by 6–7 min, a few animals to 8 min | Zuercher BMC [FT]; Menegazzi 1995, Tongying 2015 [ABS] |
| A8 waking under CPR | known miss | confirmed as a miss; the dependence on no-flow time is B6b's; flow falling with no-flow time is an attachment; the BIS-rise reports no longer cited as evidence of repayment | Reagan 2018, Olaussen 2017, Shaffner 1999, Lee 1989, Bircher 1980 [ABS]; Kim 2020 [FT] |
| A8 Hossmann's 40 mL/100 g/min vs BIS reports | stated conflict | re-stated against Shaffner 1999 (ATP 2–60 % by delay at the same perfusion pressure); no conflict left to rule (mine): both say recovery under recirculation is limited after a long insult | Hossmann 1988, Shaffner 1999 [ABS] |
| A9 gasps under CPR | qualitative | numbers: 21.1 / 8.4 per min (continuous) and 15.4 / 1.1 (30:2) after 3–4 / 5–6 min of VF | Zuercher 2010 CCRP [FT] |
| §7 compression artefact | attachment, no source | sourced; piece B3b | Kim 2021 [FT]; Nitzschke 2012, Fatovich 2006 [ABS]; Sethi 2008 [SEC] |
| R1 17 ± 9 s | cell | stands; relation to arrest length and no cumulation added; Plaschke's 5 min added | de Vries 1997, Vriens 1996, Plaschke 2006 [ABS] |
| Q2 middle of the curve | no source | animal points placed (§2.3); the human curve between 1 and 20 min stays [P] | Chen 2013, 2019 [FT]; Jia 2008, Cerchiari 1990, Lin 1977, Schmidt-Kastner 1986, Jørgensen 1981 [ABS] |
| R5 awakening | Elmer only | three cohorts: 46–65 h, 3.2 days, day 2; none relates to no-flow time | Elmer 2023 [FT]; Grossestreuer 2013, Fugate 2011 [ABS] |
| R6 cooling after return | [P] in Q2 | conflict: rats faster when cooled, humans slower to wake; §9.2 | Chen 2013 [FT]; Jia 2008, Lybeck 2018, Annborn 2023 [ABS] |
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
| Brown et al. 1985, Brain (PMID 3978400) | [ABS] | CBF keeps O2 transport within limits; O2 content the major determinant |
| Mühling et al. 1999, Can J Anaesth (PMID 10391602) | [ABS] | 2 % CBFV per 1 % fall in Hct and CaO2 |
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
| Geocadin et al. 2002 (PMID 12413758); Jia et al. 2006 (PMID 16919609); Jia et al. 2008 (PMID 18597914) | [ABS] | bursting recovery; hypothermia's effect (rats) |
| Ruijter et al. 2019, Ann Neurol 86:203 (PMC6771891); Westhall et al. 2016, Neurology (PMC4836886) | [FT] | prognostic EEG categories; TTM 33 vs 36 °C no effect on prediction |
| Elmer et al. 2023, Crit Care Med 51:503 (PMC10023349) | [FT] | awakening 46 / 65 h; arrest 19 / 15 min |
| Grossestreuer 2013 (PMID 23916554); Fugate 2011 (PMID 21900633); Lybeck 2018 (PMID 29371115); Annborn 2023 (PMID 37178902); Paul 2016 (PMID 27098348) | [ABS] | awakening times; 33 °C later than 36 °C |
| Magliacano et al. 2021, Sci Rep 11:22393 (PMID 34789832) | [ABS] | blink rate graded by level of consciousness |
| Guo et al. 2023, Ann Clin Transl Neurol (PMC10723251) | [FT-part]: methods and discussion | 7-min rat model; bursting evolving to continuous activity |

### 5.3 WANTED (each with what it settles)

- Losasso 1992, Anesth Analg 75:1021 (PMID 1443682): the first human EEG through asystole and CPR (A8).
- Biesbroek 2018 (PMID 30105170) full text: EEG return seconds after compressions, and the no-flow time before (A8).
- AWARE-II full text (PMID 37423492): how many showed delta/theta/alpha under CPR, at what rSO2 and after what no-flow
  time (A8).
- Shaffner 1999 full text (PMID 10446829): whether EEG or evoked potentials were recorded with the ATP (A8, B6b).
- Vriens 1996 (PMID 8641146) and de Vries 1997 (PMID 9338844) full texts: the regression of EEG recovery time on arrest
  duration in seconds (P2, P3, R1).
- Mühling 1999 full text: whether "1%" is relative or a haematocrit point (B2a's slope); Brown 1985 full text: the form
  and its limits; a source for the vasodilator ceiling in anaemia below Hb 4.8 g/dL (B2a's range).
- Rossen, Kabat & Anderson 1943, Arch Neurol Psychiatry 50:510 (not indexed): time to LOC on acute arrest of cerebral
  flow (A2).
- Sharbrough 1973 (PMID 4723697); Sundt 1981 (PMID 7266064); Trojaborg & Boysen 1973 (PMID 4118436): no abstracts
  indexed; the human CBF levels for EEG slowing vs flattening (A1, A2, B9's failure level).
- Astrup, Siesjö & Symon 1981 (PMID 6272455), no abstract: the flow-time thresholds.
- Njemanze 1991 full text: n and the velocity at presyncope (A2, §2.2).
- Chen 2018, Neurocrit Care (PMID 28484928): asphyxial vs VF rats, the cause-of-arrest comparison (§2.3).
- Jia 2006 / Jia 2008 full texts: times to continuous EEG after 7 and 9 min asphyxia, with and without cooling (§2.3,
  §9.2).
- A human source for recovery as a function of no-flow time between 1 and 20 min (the placeholder rows of §2.3).
- A source for the brainstem's no-flow tolerance in seconds or minutes, or for the time to the first breath after
  return as a function of no-flow time (B7b, R7).
- The weight of the pigs in Lin 2023 and Menegazzi 1995: gasp VT per kg (B7a).
- A study of gasping in unanaesthetised animals, or one comparing anaesthetics (B7a's awake row).
- A human source for loss of consciousness as a function of SaO2 or CaO2 in acute hypoxaemia (§2.2).
- Hofmeijer & van Putten 2012 full text: the synaptic share (§1.3.4); the CMRO2 at an isoelectric EEG (F).
- Ching et al. 2012 SI: the ATP time constants, if the EEG plan's piece uses them.
- Miller Ch71 p. 2254's primary source for loss of consciousness below 28 °C.

---

## 6. The pieces

Every piece: tests first; a source beside each validation cell; the `run-validation` label (each moves or could move a
value under `packages/engine-core/src/**`); the regression rows (`eeg-baseline.json`, the depth, neuro, breathing,
organ and sanity rows) byte-identical unless the piece says which row moves and why, attributed to that piece. Plan
hours are estimates.

**Order.** B1 structure → B2a anaemia's flow rise → B2 consciousness → B3 artefacts and readers → B3b compression
artefact → B4 arrest cells → B5 brainstem relocated → B6a cortex store → B6b cortex debt → B7a breathing re-sourced →
B7b brainstem `{ store, fn, debt }` (BLOCKED on a source) → B8 glucose → B9 anaesthetic critical flow.
B2a must merge before B2 (the condition of the consciousness ruling). B3b needs B3. B6b needs the answer to §9.2 for
its temperature term only. B7a needs B5; its R2 cell needs B6b. B8 and B9 need only B1 and may run any time after B4.

| Piece | What | Advisor | Ruling first? |
|---|---|---|---|
| B1 | Structure, moved, no change | design | no (being built as on main) |
| B2a | Anaemia's flow rise in `targetCbf` | design | no |
| B2 | Consciousness | none | ruled (§9.1 item 4); needs B2a merged |
| B3 | Artefacts and readers | none | no |
| B3b | Compression artefact in the EEG | none | no |
| B4 | Arrest validation cells | none | no |
| B5 | Brainstem gate state relocated | none | no |
| B6a | Cortex O2 store | design | no |
| B6b | Cortex debt and the recovery table | design | ruled (§9.1 item 2); the temperature-after-return term waits for §9.2 |
| B7a | Breathing re-sourced on the brainstem entry | design | ruled (§9.1 item 1) |
| B7b | Brainstem `{ store, fn, debt }` | design | BLOCKED on a brainstem-tolerance source |
| B8 | Glucose substrate | none | no |
| B9 | Anaesthetic critical flow | none | no |

### B1. The structure: the cortex's energy entry, moved, with no change (plan 8 h · 1.0–1.3 executor-h). Advisor: design.
- **What:** `l2/brain/energy.ts` with `BrainEnergy` and its cortex entry; `brainDo2Rel`, `DO2_EEG_ABNORMAL`,
  `DO2_EEG_LOST`, `METABOLIC_SLOW_SHARE` and the `metabolic` formula move from `l2/eeg/state.ts`; the organ view
  publishes the cortex's `delivery`, `fn`, `metabolic`; `CortexInputs` takes `metabolic` (the holdable field) and
  `cortexStep` uses it; `eegCtx` passes it. No store, no debt, no brainstem entry: `fn = fnSS(D)` exactly.
- **Tests:** `metabolic` bit-identical to main for a delivery sweep 0…1.2 (unit); the measurement's four courses
  reproduce main's EEG cortex columns exactly (one headless test, MANUAL and MODELED); snapshot round trip; the
  couplings census regenerated (`neuro.eeg.cortex.metabolic` now reads the organ state).
- **Must not change:** any value, in any patient, ischaemic included. `eeg-baseline.json` byte-identical.
- **Owner ruling:** none.

### B2a. The flow rise with anaemia (plan 7 h · 0.9–1.2 executor-h). Advisor: design.
- **What:** `anaemiaFactor(Hb)` in `l2/brain/flow.ts`, multiplied into `targetCbf` (`l2/brain/model.ts`), relaxing
  through the existing `TAU_VASC_S`; constants in `l2/brain/params.ts` with their sources as data fields: the form
  (Brown 1985), k from Mühling 1999 read per haematocrit point [INF], the reference capacity from the existing
  `caO2(14, 0.97, 95)` (no new reference literal), and the lower Hb limit 4.8 g/dL (Lieberman 2000) [P]. The factor
  reads Hb, not CaO2 (§1.5.5). The couplings census gains `organs.brain.cbf ← blood.out.hb`.
- **Tests:** unit: factor 1 at Hb 14 exactly; monotonic; held below 4.8 g/dL. Cells: Mühling (CBF at Hb 10.3 ÷ CBF at
  14.5, the band B2a states from its k and the source's ± if the full text is read; otherwise both readings reported);
  Todd (direction and size at Hct 20, as a check, rats); hypoxaemia rows unchanged (`o2Factor` untouched); the
  no-latch set of §1.5.2 with the Hb point recomputed. Regression: the piece lists every row with Hb ≠ 14 or a moving
  Hb and its moved values (CBF, CBV, ICP, PbtO2, SjvO2) and attributes them; the C34 brain rows checked against their
  own sources.
- **Must not change:** `o2Factor`, `co2Factor`, autoregulation, `cmro2Rel`, the EEG (B1's `metabolic` moves only
  through delivery, which is the intent; `eeg-baseline.json` at Hb 14 byte-identical).
- **Owner ruling:** none (the consciousness ruling's condition). **Before B2.**

### B2. Consciousness from the cortex's delivery (plan 9 h · 1.1–1.5 executor-h). Advisor: none.
- **What:** `NeuroEnv` carries the cortex's `delivery`, `fn` and `metabolic`; `depth()` adds `isch` (§1.4, with
  `DO2_LOC` = 1/3 as a named constant with its sources) to `hypnotic` and produces the displayed index and SR of §1.4;
  `diRaw` and `neuroOutputs` unchanged; `movement` and the index's EMG rise gated (§1.4 consumer list).
- **Tests:** unit: `isch` 0 at D ≥ 0.40, 1 at D ≤ 1/3; drug-only `diRaw` unchanged for every existing depth test; the
  displayed index at fn = 0 is 5 with SR 100. Cells: A2 (unconscious within 7–18 s of VF onset as target, ≤ 30 s
  must-hold; Wieling, Sauvageau, van Dijk, Pana); the hypotension cell of §2.2; the anaemia cells of §2.2 (conscious at
  Hb 5 and 4.8, Weiskopf, Lieberman); the no-latch set of §1.5.2. Regression: the piece first lists every existing row
  with cortex delivery below 0.40 after B2a (haemorrhage, haemodilution, hypoxaemia, shock) and states which move; the
  MODELED arrest's breathing may move through `loc` (wakefulness drive), by how much is reported, and the s9b/s9c rows
  must stay green.
- **Must not change:** `cmro2Mult`, the MAP set-shift, the drive's sedation term, `awarenessRisk`, the EEG's
  `METABOLIC_SLOW_SHARE`.
- **Owner ruling:** given (§9.1 item 4). Needs B2a merged.

### B3. The EEG artefacts and the readers follow consciousness (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** `emgLevel` and the blink gate take `lor + isch` (the additive rule of B2), with the arousal and tube terms
  gated by the same weight.
- **Tests:** unit: EMG 0 and no blinks with `isch` = 1 at `lor` 0; `eeg-baseline.json` byte-identical. Cells: A3; A4
  (BIS-type SR > 80 and index < 20 by VF + 90 s without compressions, given its 63-s window; Entropy SE falls
  likewise).
- **Must not change:** the readers' algorithms (`l3/eeg-devices/`).
- **Owner ruling:** none. Depends on B2.

### B3b. The compression artefact in the EEG (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** an artefact term in `l2/eeg/artefacts.ts` while compressions run, reading the same compression state
  (`CprSpec`: rate, depth) the ECG artefact reads, so the compressions have one source. The waveform: periodic at the
  compression rate, sharply contoured, amplitude above ±50 µV at full depth (Kim 2021 [FT]; Sethi [SEC]); its shape
  beyond those statements and its scaling with depth are [P], stated in the piece. The brain signal is untouched; the
  readers compute from the summed signal.
- **Tests:** unit: no artefact without compressions (`eeg-baseline.json` byte-identical); spectrum dominated by the
  compression rate; peak above ±50 µV at full depth; isoelectric brain between compressions stays isoelectric in a
  pause. Cells (A10): under compressions over a flat brain, the BIS-type SR falls and the index rises, as the sources
  report the readers being misled (Nitzschke, Fatovich), with the instructor's view showing the underlying state.
- **Must not change:** the ECG artefact, the readers' algorithms.
- **Owner ruling:** none. Depends on B3.

### B4. The arrest validation cells (plan 5 h · 0.6–0.8 executor-h). Advisor: none.
- **What:** sanity rows in `packages/validation/suites/sanity/` for the witnessed-VF course in both modes: A1 end to end
  (isoelectric by VF + 9…13 s; must-hold < 30 s) **recorded as a known miss** (red on main through the circulation's
  decay, §1.3.3), A2, A4; known misses for course (d)'s instant recovery and for course (c)'s waking under CPR (A8,
  sources Reagan 2018 and Olaussen 2017) until B6b.
- **Tests:** the rows; `docs/validation/known-misses.md` regenerated.
- **Owner ruling:** none.

### B5. The breathing gate's state relocated into the brainstem entry (plan 6 h · 0.8–1.0 executor-h). Advisor: none.
- **What:** a relocation only. `anoxS` and `gate` move from `SpontDrive` into `BrainEnergy.brainstem`, keeping their
  meaning, their 1 Hz cadence and their read point (still stepped by `stepBrainstem` in the resp pipeline, reading
  `organs.brain.cbfRel` and the no-flow flag); the constants on main keep their values. The pulseless withdrawal
  (`plS`, `NO_FLOW_S`) is untouched.
- **Tests:** the s9b and s9c rows and `manual-brainstem-gate.test.ts` unchanged; MODELED and MANUAL arrest breathing
  bit-identical to main; snapshot round trip (the state's new home, with a reader for old snapshots).
- **Must not change:** any breathing value.
- **Owner ruling:** none. It is kept separate so that B7a's PR changes values only.

### B6a. The cortex's O2 store (plan 7 h · 0.9–1.2 executor-h). Advisor: design.
- **What:** the derived store (§1.3.3) and the demand of §1.3.4 with the one shared F (moving `neuroOutputs`' 0.45 into
  the shared constant without changing its value).
- **Tests:** unit: non-ischaemic patients bit-identical (store full); the store's size computed from the named constants
  (no new literal); the zero-flow step cell (isoelectric at 11 ± 2 s; de Vries), reported as met or missed by the
  derivation, never tuned. Cells: A1 end to end again (expected later than main's +14 s; stays a known miss with its
  upstream cause); A2 again (the store delays the fall of delivery's effect; reported against 7–18 s).
- **Must not change:** `targetCbf`, `cmro2Rel`, `cmro2Mult`'s value, PbtO2, SjvO2.
- **Owner ruling:** none.

### B6b. The cortex's debt and the recovery table (plan 12 h · 1.5–2.0 executor-h). Advisor: design.
- **What:** debt and `fnCap` (§1.3.5–6) with the recovery table of §2.3 as data: sourced rows P1–P14 with their
  species and conditions, and the placeholder rows for 1, 2, 5, 10 and 20 min of no flow, each `placeholder: true`
  with its reason (the ruling). Debt accrues under partial flow (CPR), so the EEG under compressions depends on the
  no-flow time before them (A8). The temperature-after-return term is added only as §9.2 rules; until then the piece
  builds no such term and says so.
- **Tests:** unit: debt exactly 0 in every non-ischaemic patient; every table row either cites a source or carries
  `placeholder: true`. Cells: R1 (17 ± 9 s; de Vries, arrest length [P]); longer arrest → longer recovery, monotonic
  (de Vries 1997, Vriens 1996); repeated short arrests do not cumulate (Vriens 1996); EEG power normal by 5 min after
  an 18–58 s asystole (Plaschke 2006); colder during the arrest → less debt for the same arrest (demand, §2.2); under
  CPR after 1 min of no flow at delivery ≥ 0.40, EEG activity returns (Kim 2020, direction); under the same CPR after
  6 min or more of no flow, the EEG stays suppressed and the patient unconscious (Reagan 2018, Shaffner 1999,
  direction); waking under CPR becomes rare instead of the rule (Olaussen 2017); the no-latch set again. Course (c)'s
  and course (d)'s known misses move to green or to stated [P] bands. The PR states what a session shows after a
  5-minute arrest (with the placeholder rows, minutes of burst suppression and no waking within a teaching session).
- **Must not change:** `targetCbf`, `cmro2Rel`, PbtO2, SjvO2, the CPR flow (the reflow deficit is an attachment).
- **Owner ruling:** given (§9.1 item 2); §9.2 for the temperature term.

### B7a. Breathing after arrest, re-sourced (plan 12 h · 1.5–2.0 executor-h). Advisor: design.
- **What:** by the ruling (§9.1 item 1), on B5's brainstem entry and its no-flow timer (the sources state the course in
  minutes after the loss of flow, which is what the timer measures, so the times are taken as stated, not fitted):
  breathing continues through about the first minute; a gasp phase from the second minute to the sixth–seventh, with
  the gasp rate and size from the sourced row of the active anaesthetic class (volatile: Zuercher BMC; IV: Lin 2023;
  the α-chloralose row is not mapped to any engine agent, mine), the gasp VT larger than the resting VT; apnoea after;
  gasps under compressions by the no-flow time before them and the CPR mode (Zuercher CCRP Table 1), none under
  mechanical ventilation (Noc 1994); the pulseless withdrawal over `NO_FLOW_S` and the rule on main (gasps from 30 s,
  `GASP_VT_FRAC` 0.3, apnoea by 2 min) retired; the reopening after return kept at the 2-min rule as [P] (R7). The
  awake, unanaesthetised patient has no measured row: it uses the human row measured under CPR (Wolfskeil 2017) as
  [P], stated in the piece. The interpolation between Zuercher CCRP's two VF durations is [P].
- **Not built without the tolerance source:** the brainstem's delivery thresholds and store, partial flow other than
  CPR (a profound low-flow state without arrest keeps today's CBF < 0.2 gate), the reopening as a function of
  brainstem debt, the brainstem's own debt order against the cortex beyond the timer (R2 holds because the cortex's
  debt is long, not because the brainstem's is modelled), and `stress` gated by brainstem function.
- **Tests:** A6 cells (≈ 10/min in minute 1; gasps from minute 2 at the sourced rate of the agent; none after minute 8;
  VT larger than rest under volatile and IV); A9 cells (gasps under compressions; more after 3–4 than after 5–6 min of
  untreated VF; none under mechanical ventilation); R2 (breathing returns before consciousness, with B6b); the s9b/s9c
  rows re-banded only to their own sources; MANUAL through the gate with the override flag.
- **Must not change:** the cortex, consciousness, the circulation.
- **Owner ruling:** given (§9.1 item 1). Needs B5; R2 cell needs B6b.

### B7b. The brainstem's `{ store, fn, debt }` (plan 8 h · 1.0–1.3 executor-h). Advisor: design. **BLOCKED.**
- **What:** the brainstem entry on the shared equations, replacing B7a's timer; reopening from brainstem debt;
  `stress` gated by brainstem `fn`.
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
- **Owner ruling:** none.

### B9. The anaesthetic's critical flow (plan 5 h · 0.6–0.8 executor-h). Advisor: none.
- **What:** the cortex's abnormal level scaled by the active volatile's sourced critical flow ÷ 20 (isoflurane ≈ 10,
  halothane ≈ 20, enflurane ≈ 15, Michenfelder 1987; sevoflurane 11.5, Grady 1998), as data with sources, by the
  agents' MAC shares when mixed. No agent, IV agents and desflurane keep 20/50 [P: not measured in the sources read].
  The failure level 12/50 is scaled by the same factor only if a source for the agent's flattening level is read
  (Sharbrough 1973, Sundt 1981, WANTED); otherwise it stays, and a factor that would put the abnormal level below the
  failure level is clamped to it and reported [P]. `DO2_LOC` is not scaled (consciousness under a volatile is already
  the drugs').
- **Tests:** unit: no agent → bit-identical; the four sourced agents at their values. Cells: carotid clamping under
  isoflurane: EEG unchanged at CBF 12 mL/100 g/min equivalent, ischaemic below 10 (Michenfelder, Messick); under
  halothane ischaemic below 20.
- **Must not change:** consciousness, `targetCbf`, the readers.
- **Owner ruling:** none.

Total ≈ 99 plan hours (12.5–16.4 executor-hours), estimates; B7b's 8 h are not schedulable until its source is found.

---

## 7. Named attachments (outside this plan)

- **Lasting injury and the patient who does not wake:** the EEG clinical plan's injury state, reading this state's
  debt (the ruling); its bands are R4/R5 (Ruijter, Westhall, Elmer).
- **Reflow under compressions falling with the no-flow time** (Shaffner 1999: 71 → 37 % of pre-arrest flow for 6 → 12
  min of no flow at CPP 35; Lee 1989: CBF under CPR above 20 % only after 1 min of no flow) **and post-ischaemic
  hypoperfusion after return:** the circulation's and the cerebral vessels' side; the engine's CBF under CPR (0.30–0.40
  whatever the no-flow time) is too high after a long no-flow time (mine, from those two sources). B6b's debt is the
  brain's side of the same observations.
- **The circulation's flow decay after arrest** (A1's upstream miss, §1.3.3): the circulation's own plan.
- **Myoclonus and tonic activity at onset:** the slow-phase window of `fn`; needs the muscle burst's source.
- **Pupils and brainstem reflexes:** the brainstem entry's `fn` and debt; needs a display and the order of Jørgensen
  1997 as its test.
- **The CNS ischaemic response:** `organs.absent.brainstemToHub` reading the brainstem's `fn` (after B7b).
- **Regional flow (V0)**, including the brainstem's better flow under CPR (Shaffner 1999).
- **Hypothermic loss of consciousness; the EEG plan's metabolic burst suppression** (Ching 2012) reading `fn`.

---

## 8. Self-review against the code (f42a8ee9)

- `cortexStep` computes `metabolic` from `x.do2Rel` (`l2/eeg/state.ts`); `brainDo2Rel` is defined there and called from
  `l2/eeg/pipeline.ts`. B1 moves both.
- `stepBrain` already computes the delivery/demand ratio `r` for `brainOxygen` from `caO2(inp.hb, …)` ÷
  `caO2(14, 0.97, 95)`; B1 does not change `r`.
- `targetCbf` (`l2/brain/model.ts`) is `autoreg × co2Factor × o2Factor × cmro2Mult × tempCmro2 × cbfVaso`, with no Hb
  term; `BrainInputs.hb` is already an input of `stepBrain`. B2a adds one factor there.
- `artefacts.ts` gates EMG on `1 − clamp01(lor)` and blinks on `lor < 1`; B3 changes only the argument.
- The ECG layer already carries the compressions as `CprSpec` (`l2/ecg/api-types.ts`: rate, depth); B3b reads the
  same state for the EEG.
- `depth()` feeds `diRaw` to `neuroOutputs` (`cmro2Mult`, `mapSetShiftMmHg`) and to `neuroResp` (`di`); B2 adds a
  separate displayed output and leaves `diRaw`. `conscious` is `hypnotic < 1`.
- `neuroResp` derives `loc` from `hypnotic` (`LOC_LO` 0.6 – `LOC_HI` 1.0); `loc` reaches the drive's `wake` and the
  ventilator buck condition.
- `spont.ts` holds the rule B7a retires: `BRAINSTEM_CBF_MIN` 0.2, `GASP_ONSET_S` 30, `GASP_END_S` 120, `GASP_RR` 6,
  `GASP_VT_FRAC` 0.3 [FIT], `GATE_REOPEN_S` 120; the withdrawal's `NO_FLOW_S` 60 is in `l2/circ/arrest.ts`.
- Pass order neuro → resp → organs → haemodynamics → EEG (`engine.ts`): consciousness and breathing one pass late.
- `pupilMm` is read by nothing on the monitor.
- The MANUAL-depth plan holds `CortexInputs`; B1 keeps a holdable `metabolic` in it.

---

## 9. Decisions, and the one open question

### 9.1 Ruled

1. **Breathing after arrest is re-sourced.** Breathing continues through about the first minute, gasps follow over the
   next minutes, then apnoea; the earlier rule (small gasps from 30 s, apnoea by two minutes, the pulseless
   withdrawal) is retired by the piece that builds this. **Sits in:** §1.4 (breathing gate), §1.5.4, §2.1 A6 and A9,
   piece B7a. The evidence check moved its numbers (apnoea by 6–7 min; the rate and size as the agent's sourced range;
   gasps under compressions with Zuercher CCRP's rates; §5.1). The brainstem's own `{ store, fn, debt }` (B7b) stays
   blocked on a tolerance source; the ruling does not need it.
2. **Recovery between a few seconds and twenty minutes of no flow: a placeholder curve between the sourced points,
   marked as a placeholder in the data.** **Sits in:** §1.3.6, §2.3 (the recovery table and the curve), piece B6b. The
   sourced points now include animal points in the middle range (P6–P11), used for shape only.
3. **The patient who does not wake is left to the EEG plan's injury state, which reads this plan's debt.** **Sits in:**
   §1.3.7, §2.3 R8, §7.
4. **Consciousness is lost inside the EEG's slowing phase, at about a third of normal oxygen delivery, on the condition
   that the evidence supports it and that the result is true to physiology.** **Sits in:** §1.4 (consciousness row,
   `DO2_LOC` = 1/3), §2.1 A2, §2.2 (anaemia), pieces B2a and B2. The evidence supports it (Njemanze, Astrup, van Dijk;
   the 60 % option is contradicted by Weiskopf 2000). True to physiology needs the flow rise with anaemia, which is
   built first (B2a); B2 does not merge before it.

### 9.2 Open: temperature and recovery after the circulation returns

**Should cooling after the circulation returns make the simulated brain recover faster or slower?**

Cooling during an arrest clearly protects: the brain uses less oxygen, so it builds up less debt, and the plan keeps
that. After the circulation is back the sources point both ways. In rats, cooling after a 5- or 7-minute arrest made
the EEG burst sooner and become continuous sooner (171 instead of 240 minutes). In people, patients kept at 33 °C woke
later than those kept at 36 °C, and the authors judged that the sedative doses did not explain it. The two measure
different things (the rat's EEG, the person's waking), in different species, and no study measured both.

- (A) Cooling speeds recovery (the rat EEG direction). A cooled patient's EEG returns sooner; any later waking would
  have to come from the drugs.
- (B) Cooling slows recovery (the human waking direction). The repayment of the debt slows with temperature, as
  metabolism does; this gets the rat EEG direction wrong.
- (C) No temperature term after return: temperature acts only through the brain's oxygen use during the low-flow
  phase, and the recovery after return is the same at 33 and 36 °C, marked as a placeholder until a source measures
  the EEG and waking together.

**Proposal C**: it takes no side the sources do not settle, keeps the sourced protection during the arrest, and leaves
the waking time to the drug layer, where sedation already slows it in the engine (mine).
