# Infusion-pump rack (syringe and drip channels) with target-controlled infusion, as a learner instrument — Implementation Plan

**STATUS: READY TO BUILD — the owner's ten rulings folded in (2026-11-09).** Written by a planning executor from
brief 109 of the post-demo set; the owner answered all ten questions on 9 November (PQ1–PQ10, now §11 "Decisions"), and
brief 114 folded them into every section they touch. Nothing in it is built: this pull request adds this page and one
roadmap row, and changes no product code, test, card, kit or data file. What still waits is named where it waits: the
three skins' look on its screenshots or manual pages (SK2), the device numbers the two JMS catalogues do not give on
the operator manuals (named gaps, `research/50-pump-reference-devices.md`), the department's stock list (PQ7 A), and any
TCI drug beyond the three the owner ruled in (E3d, PQ6 C).

**Base and preconditions.**
- Base: `origin/main` **8344539d** (Merge PR #359, `plan-learner-action-remote`), read in the worktree
  `scratch/wt-plan-pumps` (branch `plan-pump-rack`). Every `file:line` below is on 8344539d and is a starting point
  only: an executor finds the code by the function name given, because lines move.
- The owner's rulings this plan applies (8 and 9 November; `research/00-orchestrator-rulings.md`, 8 November 22:28,
  and brief 109): a **rack** of several syringe pumps on one tablet, as an anaesthesia tower; a **generic** pump face
  first, skins later, **Mindray** the first skin; **all TCI models for every drug that has published parameter sets**,
  each set sourced; built **after the learner remote's command path** (L3 and L4 of
  `docs/plans/learner-action-remote.md`), because the pump reuses it; **any remote may change any infusion**, every
  change recorded with the device and the rate it replaced (LQ4). The ten rulings of 9 November (§11) add: the
  channel count chosen on Room setup (1–8, default 4); **two channel kinds**, syringe and drip; the department's
  devices named (**JMS SP-500** syringe pump, **JMS OT-701** peristaltic drip pump, **Mindray BeneFusion SP5 TCI
  series** for TCI); occlusion and air-in-line in scope; the pump blind to the patient; compartment plants for
  midazolam, ketamine and dexmedetomidine before their TCI.
- The rule over every number: mechanisms first, sources set the numbers (owner, 7 November;
  `scratch/briefs/post-demo/00-common-rules.md`). A quantity no source gives is a named gap, never invented. A
  pump-device number comes from the reference device's own document: the JMS SP-500 and OT-701 catalogues (product
  brochures, `assets/pumps/`, git-ignored; their specification tables transcribed in
  `research/50-pump-reference-devices.md`, cited as "JMS SP-500 catalogue, p. 2") give the flow-rate ranges, the rapid
  rates per syringe size, accuracy, the alarm lists, the OT-701's drip sets, purge rate, KVO rate and occlusion
  pressure. What the catalogues do not give (the near-end time, the bolus function as such, the purge volume limit,
  the time to an occlusion alarm, every Mindray SP5 number, the TCI patient-data limits) stays a gap, marked as such
  on the face, until an operator's manual is in the library.
- The plans this one stands on: `docs/plans/learner-action-remote.md` (L0–L15; READY TO BUILD, nothing of it merged
  yet) and `docs/plans/room-and-instruments.md` (R5c and R5d, the device-role pattern, on main; R8a–R8d, the
  ventilator's own-screen pattern). House style: those two; questions in their format (LQ…, Q…).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR. Tests first in every code piece: the failing test is committed before the code.

---

## 1. Inventory: what exists on 8344539d

### 1.1 Drugs by rate and TCI in the engine

| Today | Where | What it means for this plan |
|---|---|---|
| Three infusion forms on the engine's wire: `drug` with `infusion: true`, `infusion` (rate, optional syringe `concentration`), `tci` (`model?`, `mode`, `target`, `maxRateMlH?`) | `packages/engine-core/src/types-pk.ts:15–17` | The pump's commands become engine events of a new kind `pump` (§4 D4); the three existing forms stay as they are for the instructor's Drug sheet and the cards |
| ONE drug instance per drug id: `pk.drugs[id]` with one `rate`, one `tci` | `l2/pk/pipeline.ts` `inst` (`:231`), `DrugInst` (`:44`, `:50`) | Two pump channels with the same drug would overwrite each other's rate. A rack needs channels whose rates ADD (§4 D5) |
| The TCI controller: one rate per 10 s; plasma targeting (Jacobs 1990), effect-site targeting (Shafer & Gregg 1992); clamped to the pump's limit | `l2/pk/tci.ts:1–49`; `TCI_DT_S = 10`, horizon 90 steps (15 min) | Kept as the algorithm. What changes is the model it predicts WITH (§1.3) |
| The controller computes the rate from the PATIENT's own state `d.x` and the patient's own current parameters (clearance scaled by liver, kidney and temperature; distribution by cardiac output) | `pipeline.ts:476–480` (`params(pk, row, d)`, then `tciRate(p, d.x, …)`); `params` `:218–224`; `clFactor` `:190–197` | **A real TCI pump is open-loop**: it predicts from its own model with the covariates typed into it, and knows nothing of the patient's liver flow or cardiac output. Today's controller is an oracle (§1.3) |
| The `tci` event's `model` REPLACES the patient's own PK model for that drug | `pipeline.ts:373` (`d.model = ev.model`); `baseParams` `:170` (`modelParams(pk, inst.model ?? row.pk.model)`) | Choosing "Marsh" on a pump today turns the PATIENT into a Marsh patient. Under §1.3 the pump's set and the patient's PK are two different things |
| The TCI maximum rate uses the row's default syringe, not the loaded one: `(maxRateMlH ?? 1200) × (row.syringePerMl ?? 10) / 60` | `pipeline.ts:372`; `row.ts:111–112` (`syringePerMl`) | The pump's channel carries its own concentration (§4 D4) |
| The models the engine has: propofol Eleveld 2018 (default), Schnider 1998, Marsh 1991 (and its "modified" ke0); remifentanil Minto 1997; fentanyl Shafer 1990; sufentanil Gepts 1995; a TCI event may name only these six | `l2/pk/models.ts:12–111`; `pipeline.ts:153–164` (`modelParams`), `:263` (the list) | The starting registry (§6). Shafer's and Gepts's microconstants are marked `[VERIFY]` in the code (`models.ts`); the T2 piece resolves them |
| Covariates: `PkPatient` (age, weight, height, sex, postmenstrual age, cholinesterase phenotype); James 1976 lean body mass; Al-Sallami 2015 fat-free mass | `l2/pk/covariates.ts:4–30` | The pump's patient entry carries the same fields (§4 D6) |
| Drugs with a compartment model: propofol, fentanyl, remifentanil, sufentanil (and the neuromuscular agents). **Midazolam, ketamine, dexmedetomidine are gamma-curve rows** (no plasma compartment); **alfentanil is not in the library** | `docs/model/pharmacology.md` "Drug rows" table; `l2/pk/data/rows-anaesthetic.ts:80`, `:123`, `:134` (`gammaPk`) | A pump can run any published set as its PREDICTION model, but the patient's response for those three drugs is a curve, not a concentration (§6.3, PQ6) |
| A declared engine question, open since 4 October: the 6 h TCI run holds propofol's effect site at 2.5 ± 0.005; "an open-loop TCI pump does not know the patient's liver flow — real pumps do not either; whether the pump's model should see it is the owner's question" | `packages/engine-core/test/engine/pk-longrun.test.ts:40–52`; ruling G-FU9 (`research/00-orchestrator-rulings.md:913`) | This plan answers it with a mechanism (§4 D3); the owner ruled it so on 9 November (PQ5 = A: the pump is blind to the patient) |
| The panel row the app reads: `cp`, `ce`, `rate`, `tci {mode, target, model}`, `totalAmount`, `decrement50Min` | `types-pk.ts:99–107` (`DrugPanelRow`) | The instructor's mirror shows the patient's `cp`/`ce` beside the pump's prediction (§9) |

### 1.2 The learner command path the pump reuses

| Today | Where | What it means |
|---|---|---|
| The `defib` role (R5c, R5d): joins on the room code, may send exactly two shapes, the host re-checks and writes `issuedBy: 'learner'` and `by` = the device key | `packages/controller/src/protocol.ts:404–420` (`LEARNER_DEFIB_COMMANDS`, `LEARNER_ISSUED_BY`), `guard.ts:115–117` | The pattern this plan copies a third time, after L3's `learner` role |
| The `learner` role, the learner PIN, `LEARNER_COMMANDS`, `infusion set` on any running infusion with the replaced rate (LQ4), the preparations table on the host, the bench (L7) | `docs/plans/learner-action-remote.md` §4 D1–D9, pieces L3, L4, L7, L8 — **planned, not on main** | The pump is admitted exactly as the remote is (room code + learner PIN); its prepared syringes are the bench's preparations |
| The picker: Learner monitor, Patient monitor, Ventilator, Depth (not available), IABP (later) | `apps/demo/src/app/views/join.ts:22–35` (`PICKER_WORDS`) | An "Infusion pumps" card (A1; its words ruled, PQ10) |
| The follower's instruments named on the hello | `protocol.ts:270` (`INSTRUMENTS`) | `pump` joins them (C1) |
| `/2` files a `tci` press as kind `tci` with `settings {mode, target}`; a bolus action with `rate: {bolus: true}` adds a deviation line "over N s, bolus asked" for any `overS > 0` | `packages/controller/src/scenario/driver.ts:573–592` (`administrationOf`); `grade.ts:134`, `:180–181` | A pump's bolus runs over seconds at the bolus rate; it counts as the card's bolus, with no "over N s" line, and its seconds show in the Debrief (PQ3 = A) |
| The Persian table: one JSON table, one matcher, entries carry `reviewed`; a draft line while any printed entry is unread by the owner | `apps/demo/src/app/i18n/fa-dom.ts:8–14`; `docs/showcase/i18n/fa-debrief.json` (`schema, about, register, groups, strings`); `i18n/lang.ts` (`hostLang`) | The pump face's words go into the same table (A4) |
| Skins carry provenance per value: every leaf of a skin is covered by a provenance entry | `packages/skins/src/provenance.ts:1–25` | The pump skin copies the rule (SK1); it does NOT live in `packages/skins` (the monitor's skins; and an engine-classified CI path, `.github/workflows/ci.yml:30–31`) |

### 1.3 The finding that shapes the plan: today's TCI is an oracle

A clinical TCI pump computes its rates from a population model and the age, weight, height and sex typed into it. It
never measures the patient. Its displayed Cp and Ce are **predictions**; the patient's true concentrations differ by
the model's bias and the patient's own physiology, which is why the TCI literature reports prediction performance
(median performance error and median absolute performance error) for each set. The engine today computes the rate from
the simulated patient's true state and true, organ-scaled parameters every 10 s, and switching the set changes the
patient. So it cannot show the one thing a TCI teaching instrument must show: that two sets give two different doses for
the same target, that a wrong weight typed into the pump changes the dose, that a low cardiac output or a failing liver
raises the true concentration under an unchanged target. Section 4 D3 separates the two: the **pump's prediction**
(its own state, its own set, the typed covariates) and the **patient** (the engine's PK, unchanged by the pump's
choice). This is a true mechanism, not a display trick, and it changes one self-referential regression row (E2).

## 2. Intent

A tablet scans the room QR, chooses "Infusion pumps" and, after the learner PIN, shows a rack of channels side by side,
as on an anaesthesia tower: as many as the instructor chose on Room setup (1–8, default 4), each a **syringe** channel
(the face of the department's JMS SP-500) or a **drip** channel (the face of its JMS OT-701, the "serum pump"). Each
channel is one generic pump face: the drug and concentration it was programmed with, the rate (mL/h, or drops/min on a
drip channel with its set's drops/mL) or the target, the volume infused and remaining, the time to empty, its alarms,
and its own history. A learner loads a syringe or a bag onto a channel (a preparation made on the learner remote's
bench, or a stock syringe or bag), programmes the drug and concentration from the pump's drug list, and runs it at a
rate, or, on a syringe channel, in TCI with a chosen model, plasma or effect-site, after typing the patient's age,
weight, height and sex (the TCI face's reference is the Mindray BeneFusion SP5 TCI series). The pump's predicted Cp
and Ce are on the face; the patient responds through the engine's own PK. The instructor's laptop mirrors the rack
read-only, shows the patient's true concentrations beside each prediction, and the Debrief says "Propofol rate changed
from 20 to 30 mL/h at 06:30 by Pump tablet (bed 2), channel 2".

## 3. Goals, non-goals, anti-goals

Goals
- **The `pump` device role**, admitted by the room code and the learner PIN as the learner remote (L3's admission), with
  its own allow-list of command shapes (§4 D2), applied by the host through the same drug paths as the instructor's,
  every applied action recorded with `by`, the channel and the value it replaced.
- **The rack**: n channels on one tablet, n chosen on Room setup (1–8, default 4, PQ1 = C), each channel of one of two
  kinds, syringe or drip (PQ2), each the generic face (§5).
- **TCI sets as data with sources**: every published set the owner ruled in, each a row with its paper, its
  covariates, its ke0 (or "none: plasma targeting only"), proved sourced by a CI check like the formulary's (§6).
- **The pump's prediction separated from the patient** (§1.3, §4 D3), per channel.
- **Loading a bench preparation or a stock syringe**, with a syringe-versus-programme mismatch as a real consequence
  (§8).
- **The generic face and a skin mechanism**, then three skins (SK2): JMS SP-500 (syringe), JMS OT-701 (drip),
  Mindray BeneFusion SP5 TCI (TCI on a syringe channel), each from the owner's screenshots or the device's own pages
  only.
- **Occlusion as a scenario event** (O1) and **air-in-line as an instructor-raised alarm on a drip channel** (AL1),
  PQ4 = C (§10).
- **The instructor's mirror (read-only, PQ9) and the Debrief lines**; **Persian** through the existing table.

Non-goals
- Gravity drips without a pump, PCA and epidural pumps; a drug-library "hard and soft limits" editor; barcode or RFID
  syringe recognition; network pump management (the docking station's supervision software). (A volumetric drip pump
  was a non-goal in the draft; the owner's PQ2 ruling brought the OT-701 into the rack as the drip channel kind.)
- Device faults with no clinical consequence the engine can show: low battery, door open, internal malfunction,
  syringe disengaged, reminder and abnormal-drips alarms (in the catalogues' alarm lists, `research/50`) are not raised
  in v1.
- The devices' delivery accuracy (SP-500 ±1 % drive, ±3 % with JMS syringes; OT-701 ±10 % flow, ±2 % drip): a
  tolerance with no known sign, so the engine delivers the set rate exactly and the face does not pretend otherwise.
- A line model (lumens, dead space, the delay from the pump to the vein, Y-site compatibility): already out of scope in
  the learner plan (LQ12); the pump inherits it.
- Closed-loop anaesthesia (a pump driven by the depth index).

Anti-goals (a piece that does one of these is rejected)
- **A pump number without its source.** A maximum rate, purge limit, near-end time or occlusion pressure enters code
  only from the reference device's catalogue page (`research/50`), its operator's manual, or another cited source;
  until then a named gap.
- **A TCI set without its paper**, or a ke0 borrowed from another PK model without saying so (the rule already in
  `covariates.ts:1–2`: "a ke0 … belongs to the model it was fitted with").
- **The pump knowing the patient.** The pump's prediction never reads the patient's state, organ factors or cardiac
  output (§4 D3), and the pump face never shows the patient's true Cp/Ce (that is the instructor's, §9).
- **A device's look invented.** No colour, layout, word or icon is attributed to JMS or Mindray without the owner's
  screenshot or a page of the device's own document cited beside it.
- **Truth on the pump.** The pump tablet is a follower: its own engine holds the syringe's true contents (§8); its face
  renders the PROGRAMMED drug only, never the contents.
- **A learner gains a shape.** The pump's allow-list is its own; no time, scenario, rhythm, device, airway, bolus
  outside a loaded channel, raw `applyEvent`, `atTick` or another role's shape.

## 4. Decisions this plan makes where the brief and the rulings were silent

- **D1. The pump is a follower instrument page with commands, as the learner remote is.** Hash `#/pump` on a
  `?join=CODE` page; hello `{role: 'pump', show: 'pump', device, pin}` (the device key, `join.ts:60`; the learner PIN
  typed in L6's PIN form, held in memory only). It mounts `mountFollower` with no monitor strip (a tower's pumps have
  none) and the rack. It runs its own engine like every follower, so the channels' state (volume, rate, the pump's
  prediction) comes from that engine with no new event stream (as the learner plan's D6 does for lab results).
  Why a separate role and not `learner`: the allow-lists differ (the pump has no bench, no labs, no bolus without a
  channel) and the relay rate differs (D2); one role per allow-list is R5c's rule.
- **D2. The allow-list, `PUMP_COMMANDS`, exactly these shapes** (`protocol.ts`, beside `LEARNER_COMMANDS`), each
  naming a channel `ch` (an integer 1…n, n the rack's size); the host also checks the shape against the channel's
  kind (§5: `syringe` or `drip`) and the kind's device profile (D12):
  1. `pump load` — `{type:'pump', action:'load', ch, syringe: {prep: {device, id}} | {stock: stockId}}` on a syringe
     channel, `{…, bag: {prep: {device, id}} | {stock: stockId}}` on a drip channel: put a syringe or a bag on the
     channel. A preparation is named by the device that made it and its id (the host's preparations table, learner
     plan D3; a syringe channel takes a `syringe-pp` container, a drip channel a `bag-*` container); a stock item by its
     id in the stock list (S1). The SP-500 takes 10, 20, 30 and 50 mL syringes (catalogue); another size is refused
     with those words.
  2. `pump program` — `{type:'pump', action:'program', ch, drugId, concentration: {amount, unit, perMl}, set?:
     15|20|60}`: the learner's choice from the pump's drug list, independent of what the syringe or bag holds (§8);
     on a drip channel `set` is the IV set's drops/mL, the OT-701's three set types (catalogue). The set is taken to be
     the one loaded: a set different from its programme is not modelled.
  3. `pump rate` — `{type:'pump', action:'rate', ch, rate, unit, limitMl?}` (`mL/h`, or a dose rate the face converts
     with the PROGRAMMED concentration, as a real pump does; on a drip channel also `drops/min`, converted as
     mL/h = drops/min × 60 / set, and `limitMl`, the OT-701's volume limit, 1–9 999 mL or none). The range is the
     device profile's: SP-500 0.1–200 mL/h with a 10 mL syringe and 0.1–300 mL/h with 20, 30 or 50 mL, in 0.1 mL/h
     steps; OT-701 1–450 mL/h with 15 or 20 drops/mL sets and 1–100 mL/h with 60, 1–100 drops/min, in 1 mL/h steps
     (its "standard" range, the factory setting; `research/50`).
  4. `pump tci` — `{type:'pump', action:'tci', ch, setId, mode: 'plasma'|'effect', target, patient: {ageY, weightKg,
     heightCm, sex, …what the set asks}}`: start or change TCI, syringe channels only; `target 0` stops it. `setId`
     from the registry (§6); `effect` refused for a set with no ke0.
  5. `pump bolus` — `{type:'pump', action:'bolus', ch, volumeMl | dose}`, syringe channels only (the OT-701 catalogue
     names no bolus function): at the SP-500's rapid flow rate for the loaded syringe size, approx. 200, 350, 450 and
     800 mL/h for 10, 20, 30 and 50 mL (catalogue; printed "Approx.", carried as printed). A TCI channel's own rate
     ceiling stays the engine's 1 200 mL/h (`tci.ts:6`, "the published pumps") until the SP5 manual re-sources it (SK2).
  6. `pump stop` / `pump start` — pause and resume the channel (the programme kept).
  7. `pump purge` — `{type:'pump', action:'purge', ch, volumeMl}` (§4 D7).
  8. `pump unload` — take the syringe or bag off (the channel's history kept).
  Any other shape, and any extra field, is refused at the relay and again at the host (`pumpMay`, as `learnerDefibMay`,
  `protocol.ts:415–420`). Rate: at most 6 commands a second per socket [ENG: network; L3's figure: four channels
  changed in one press sequence plus a margin for double taps], over that `too-many-tries`.
- **D3. The pump predicts with its own model; the patient responds with the engine's.** Each TCI channel holds its own
  compartment state `xPump`, integrated every PK step from the rate the channel delivered, with the parameters of
  the chosen set computed ONCE from the patient data typed into the pump (age, weight, height, sex, and what a set
  asks, such as Eleveld's opioid co-administration; re-computed only when the learner retypes them). `tciRate` (`tci.ts`) is called with the set's parameters and `xPump`, never with `params(pk, row, d)` or
  `d.x`. The patient's PK keeps its own default model (Eleveld for propofol, as today), with its organ and flow
  factors, and receives the channel's delivered amount. The face shows `xPump`'s Cp and Ce, as a real pump does. The
  instructor sees both (§9). Today's `tci` event (the instructor's Drug sheet, the cards, the physiology console)
  keeps its shape and becomes a channel-less pump with the same separation: `model` names the pump's set and no
  longer replaces the patient's model (`pipeline.ts:373` removed); its patient data are the case patient's. **The
  owner ruled it (PQ5 = A, 9 November):** as a real TCI pump, the pump uses the typed demographics in its model and
  never reads the patient's physiological parameters; the patient responds through the engine.
- **D4. A new engine event kind `pump`, the channel's state in `PkState`.** The host translates the device's
  commands into `applyEvent {kind: 'pump', ch, …}` with the syringe's or bag's TRUE contents (drug, concentration,
  volume) and the PROGRAMMED drug and concentration both carried, because the engine must deliver the contents and
  predict with the programme (§8); the device numbers the engine needs (the bolus and purge rates) are resolved by the
  host from the device profile (D12) and carried on the event, so the engine holds no device constant of its own. The
  channel state (`kind`, `contents`, `programmed`, `set` on a drip channel, `syringeMl` on a syringe channel,
  `volumeMl`, `infusedMl`, `limitMl`, `mode`, `rate`, TCI set, typed patient, `xPump`, `paused`, `occluded`, `alarms`)
  lives in `PkState`, so snapshot and restore keep it and every follower's engine has it. The host does not keep a
  second copy of the volumes.
- **D5. Channels add.** The drug instance's delivered rate = the channel-less rate (today's `infusion`/`tci`) + the sum
  of every running channel whose contents are that drug. Two channels of norepinephrine during a syringe change both
  deliver; two TCI channels of the same drug each predict as if alone, and the patient receives both: the real hazard,
  not refused. The record and the instructor's mirror name it.
- **D6. The pump's patient entry is the learner's act.** The face asks for age, weight, height and sex before TCI
  starts, as a real TCI pump does, with a one-tap "Copy from the case sheet" (the briefing's values; the record notes
  whether it was copied or typed). A typed value outside the set's studied population (from the paper, §6) shows the
  paper's range and is allowed; a refusal range is a device behaviour and comes from the Mindray BeneFusion SP5 TCI
  manual (gap until it is in the library; neither JMS catalogue covers TCI).
- **D7. Purge.** Before a channel has delivered anything, a purge moves `volumeMl` from the syringe or bag to waste
  (the line is being primed: volume falls, nothing reaches the patient). After it has delivered, the line is connected
  and a purge is a bolus into the patient at the purge rate, recorded as a purge, because that is what happens. Purge
  rate: the OT-701's "more than 450 mL/h" (catalogue; carried as 450 mL/h, the stated floor) on a drip channel; the
  SP-500's rapid flow rate for the syringe size (D2 item 5) on a syringe channel. The purge volume limit is in neither
  catalogue [gap until the manuals; the face accepts at most 2 mL, ENG: ui, stated as "limit not set from the
  manual"].
- **D8. Alarms the engine can represent** (the names are the catalogues' alarm lists, `research/50`). Syringe
  channel: **End** (`infusedMl` reaches the loaded volume, the delivery stops, the true consequence: no more drug) and
  **Almost Empty** (raised when the time to empty at the current rate falls under the SP-500's near-end setting, which
  the catalogue does not give: until the manual sets it, the alarm is not raised and the face says "near-end time not
  set"). Drip channel: **Empty Container** (the bag's volume reaches 0, the delivery stops) and **Infusion Complete**
  (`infusedMl` reaches `limitMl`; the channel stops; the OT-701's KVO rate of 1 mL/h is in the catalogue, but whether
  and when the pump enters KVO after completion is not, so KVO waits for the manual and the face says "KVO not set
  from the manual"). Both kinds: **Occlusion** (O1) and, on a drip channel, **Air in Line** (AL1), §10.
- **D9. Any remote, the laptop and the pump change any channel (LQ4 extended).** A learner remote's `infusion set` for
  a drug that runs on exactly one channel changes that channel; on two or more channels it is refused ("running on
  pumps 2 and 3: change it on the pump"), so no change lands on a channel the sender did not see. The same rule for
  the instructor's Drug sheet. Every change keeps the replaced value and who had set it (learner plan §6's
  `replaced`), plus the channel.
- **D10. The instructor's mirror is read-only (PQ9 = A, the owner's ruling).** It shows the rack as the tablet does,
  plus the patient's truth; the instructor changes infusions through the Drug sheet (D9), shows the mismatch notice
  from its card (§8), and raises occlusion and air-in-line from the scenario-event controls (§10), never from the
  mirror's channels. One actor per pump: a channel's face takes presses only on the tablet that shows it; the remote's
  and the Drug sheet's changes reach it through D9's routing.
- **D11. Where the TCI sets live: the engine.** `packages/engine-core/src/l2/pk/tci-sets/` (one module per set: its
  parameter function and its metadata row), because the engine runs the controller. Consequence: every T piece is an
  engine-classified CI run (`ci.yml:30–31`), with the slow groups.
- **D12. Device profiles as sourced data, in the controller.** One file per reference device,
  `packages/controller/pump-devices/{sp-500,ot-701,sp5-tci}.json`: each number (rate ranges and steps, rapid rates per
  syringe size, syringe sizes, set types, purge rate, KVO rate, volume limit, occlusion levels or pressure) with its
  `src` ("JMS SP-500 catalogue BRO/500-E/001, p. 2") or `{gap: "<what the manual must give>"}`, checked by a source
  test like the formulary's (S1). The host validates every command against the channel's profile and resolves the
  rates the engine needs (D4). A syringe channel uses `sp-500`, a drip channel `ot-701`, a TCI channel `sp5-tci` for
  its TCI numbers (all gaps until the SP5 manual) and `sp-500` for the rest. The generic face uses these profiles from
  A1 on; the skins (SK2) change the look, not the numbers.

## 5. The rack: how many channels, the two channel kinds, and the generic face

**How many channels: chosen on Room setup, 1–8, default 4 (PQ1 = C, the owner's ruling).** The instructor sets the
count in Room setup before the pump tablet joins; the tablet builds that many channels from the room's setting. The
default's reference is a real docking rack: B. Braun's SpaceStation takes up to four Space pumps per station, and
stations combine into one system (B. Braun, "SpaceStation" product page, bbraunusa.com, read 9 November 2026). Four is
also what a 10-inch tablet in landscape holds at a readable size [ENG: ui; four 44 px-target columns of about 300 px
each at 1280 px]; 5–8 channels use two rows. The upper bound of 8 is the owner's.

**Two channel kinds (PQ2 = B, the owner's ruling, with the devices named).** The department's syringe pump is the
**JMS SP-500**; its drip (volumetric) pump, the "serum pump", is the **JMS OT-701**, a peristaltic finger pump with a
drip detector; TCI is not routine there, and its reference is the **Mindray BeneFusion SP5 TCI series**. So a channel
is one of:
- **syringe** (SP-500 profile, D12): a 10, 20, 30 or 50 mL syringe; rate in mL/h or a dose rate; bolus; and, from E2
  on, TCI (the SP5 TCI face's fields, below);
- **drip** (OT-701 profile): a bag on an IV set of 15, 20 or 60 drops/mL; rate in mL/h or drops/min; a volume limit;
  no bolus and no TCI (the catalogue names neither); the air-in-line alarm (AL1).
Room setup sets each channel's kind beside the count [a plan decision, ENG: ui: default all syringe, because a TIVA
tower is syringes; the instructor turns any channel into a drip channel]. The device numbers are the catalogues'
(`research/50-pump-reference-devices.md`, through D12); those the catalogues do not give are named gaps on the face.

**The generic face (one component, `apps/demo/src/app/pump/face.ts`, both kinds), per channel:**
- **Header:** channel number and kind; the PROGRAMMED drug name and concentration ("Propofol 10 mg/mL"); the state
  (Not loaded, Loaded, Running, Paused, TCI, Alarm).
- **Main:** in rate mode the rate in mL/h and the dose rate in the programme's unit; on a drip channel the set
  (drops/mL), the rate in the unit chosen (mL/h or drops/min) with the other beside it, and the volume limit; in TCI
  (syringe channels) the set's name, the mode (Cp or Ce), the target, the pump's predicted Cp and Ce, the current rate.
- **Volumes:** infused (mL and amount), remaining, time to empty at the current rate ("—" in TCI when the rate is 0).
- **Alarms (D8):** End and Almost Empty (syringe; Almost Empty once the manual's time is set), Empty Container and
  Infusion Complete (drip), Occlusion (both), Air in Line (drip); the alarm's sound from the app's own audio, as the
  learner plan's notice sound (no file).
- **History:** the channel's own list ("06:30 rate 20 → 30 mL/h · Pump tablet"; "06:41 target 3.0 → 4.0 µg/mL Ce ·
  Remote (bed 3)"), from the record rows the host sends the pump for its channels (the learner plan's `prep`-style
  host-only event, routed to the pump socket).
- **Buttons:** Load, Program, Rate, TCI, Bolus, Stop/Start, Purge, Unload (a drip channel has no TCI or Bolus);
  44 px targets [ENG: ui].

Words such as "Cp", "Ce", "mL/h" and drug units are displayed tokens and stay as they are in every language (A4).

## 6. TCI models as data with sources

### 6.1 The shape and the CI check

One module per set under `l2/pk/tci-sets/`: a pure function `(patient: PkPatient, opts) → PkParams` and a metadata
row:

`{ id, drugId, name, paper: {authors, year, journal, vol, pages, doi|pmid}, table: "<table/equation and page>",
population: {ageY: [min,max], weightKg: [min,max], …, src}, covariates: ['ageY','weightKg','heightCm','sex',
'lbm:james'|'ffm:alsallami'|…], ke0: {value|expr, src} | {none: true}, site: 'arterial'|'venous'|'unstated',
units, readBy: {first, second, date} }`

The check, `packages/engine-core/test/l2/pk/tci-sets.test.ts` (unit job, every PR):
1. Every registered set has its metadata; every metadata row resolves a `paper` with a DOI or PMID and a `table`.
2. **Covariates are what the function reads:** for each covariate NOT listed, perturbing it leaves the parameters
   unchanged; for each listed one, perturbing it changes them (the test proves the row tells the truth).
3. A set with `ke0.none` is refused in effect-site mode (the engine and the face both say "this model has no ke0:
   plasma targeting only").
4. **The paper's own numbers:** each set reproduces the parameter values its paper reports for its stated reference or
   typical patient, to the paper's printed precision (a row the paper gives no worked values for says so, and the
   second reader checks the coefficients line by line).
5. No `[VERIFY]` mark remains in a registered set (Shafer's and Gepts's today, `models.ts`).
6. A ke0 whose source is not the PK paper names its own source and the PK it was fitted with (the rule in
   `covariates.ts:1–2`); the engine's time-to-peak-effect ke0s (fentanyl 0.117, sufentanil 0.176, `models.ts`) are
   labelled as such. A third kind, `device` (the owner's ruling TQ2, 10 Nov 2026): a value a named device ran whose
   derivation a peer-reviewed paper reports as unpublished (Marsh's 0.26, Absalom 2009 p. 30), with that paper, the
   device, the PK, a label, and no fit.
7. The TCI event's accepted `model` ids are the registry's ids (today's hard-coded list, `pipeline.ts:263`, removed).

What CI cannot prove is that a coefficient is the paper's. **Second reading**, as in the formulary: every set is read
against its paper by a second executor before its batch merges, and the PR lists each set with "agrees" or the
difference. The papers are the executor's to obtain through open access or the workspace library; a set whose paper
cannot be read is not registered, and the PR says so.

### 6.2 The sets the plan starts from (each row confirmed or dropped by its T piece; nothing below is a value to copy)

| Drug | Set | Paper | Covariates | ke0 | Engine plant today | Piece |
|---|---|---|---|---|---|---|
| Propofol | Marsh | Marsh, Br J Anaesth 1991;67:41 | weight | 0.26 /min as used in the Diprifusor (no source in the code: `[TXT]`, `models.ts`); "modified Marsh" 1.21 /min, Struys, Anesthesiology 2000;92:399 (the executor confirms) | compartment (Eleveld) | T2 |
| Propofol | Schnider | Schnider, Anesthesiology 1998;88:1170 (PK); 1999;90:1502 (ke0) | age, weight, height, sex (James LBM) | 0.456 /min (1999 paper; in `models.ts`) | compartment | T2 |
| Propofol | Eleveld | Eleveld, Br J Anaesth 2018;120:942 | age, weight, height, sex, postmenstrual age, opioids co-administered | arterial 0.146·(W/70)^−0.25 (in `models.ts`); the paper's venous ke0 is a second option the executor reads | compartment (the plant's own default) | T2 |
| Propofol (children) | Kataria | Kataria, Anesthesiology 1994;80:104 | weight (age range of the study) | the executor reads whether one is published with it; else `none` | compartment | T3 |
| Propofol (children) | Paedfusor | Absalom & Kenny, Br J Anaesth 2003;91:507 | weight, age | as above | compartment | T3 |
| Remifentanil | Minto | Minto, Anesthesiology 1997;86:10 | age, weight, height, sex (James LBM) | 0.595 − 0.007·(age − 40) /min (in `models.ts`) | compartment (Minto) | T2 |
| Remifentanil | Eleveld | Eleveld, Anesthesiology 2017;126:1005 | age, weight, height, sex (Al-Sallami FFM) | the paper's (the executor reads it) | compartment | T3 |
| Fentanyl | Shafer | Shafer, Anesthesiology 1990;73:1091 | none (fixed) | engine's 0.117 /min by time to peak effect with this PK (decision 2, `models.ts`); the Scott & Stanski 1987 value is a second option, labelled as fitted with another PK | compartment (Shafer) | T2 |
| Sufentanil | Gepts | Gepts, Anesthesiology 1995;83:1194 | none (fixed) | engine's 0.176 /min by time to peak effect, Shafer & Varvel 1991 (`models.ts`) | compartment (Gepts) | T2 |
| Alfentanil | Maitre | Maitre, Anesthesiology 1987;66:3 | age, weight, sex | the executor reads the ke0 paired with it and its source | **not in the library** | E3d (waits until the owner names alfentanil, PQ6 = C) |
| Dexmedetomidine | Hannivoort | Hannivoort, Anesthesiology 2015;123:357 | weight | the PK paper has none; an effect-site ke0 needs its own source (the engine already cites a BIS ke0 0.120 /min from Miller ch. 23 Table 23.6 p. 660, Colin 2017, `combine.ts`, which is NOT fitted on Hannivoort's PK and is labelled so or not used) | **gamma curve** | E3a |
| Dexmedetomidine | Dyck | Dyck, Anesthesiology 1993;78:821 | height | none in the paper | gamma curve | E3a |
| Midazolam | candidates for the executor to confirm (no set is asserted here): the published adult midazolam TCI sets | — | — | — | gamma curve | E3b |
| Ketamine | candidates for the executor to confirm (no set is asserted here): the published ketamine TCI sets, racemic and S(+) apart | — | — | — | gamma curve | E3c |

The citations above are the planner's starting list from the brief and the engine's own code comments; each T or E3
piece reads the paper and either confirms the row or removes it, and adds any published set it finds that the owner's
ruling covers ("all TCI models for every drug that has published parameter sets"). The owner ruled the scope on
9 November (PQ6): midazolam, ketamine and dexmedetomidine get their compartment plants and then their sets (E3a–E3c);
alfentanil, remimazolam and any other drug not in the engine's library are built only when he names them (E3d and any
like it). E3's census lists such drugs for him; it builds none of them.

### 6.3 What the engine changes to run a per-pump set rather than its single default

1. **The registry** (T1): the six model functions move from `models.ts` and `modelParams` into `tci-sets/` unchanged
   in value (T2 proves byte-identical PK for every existing test); the plant reads its default from the drug row
   (`row.pk.model`) through the same registry.
2. **The pump's own state per channel** (E2, D3): `xPump` and the set's parameters from the typed patient, stepped
   with the channel's delivered rate; `tciRate(setParams, xPump, …)`. The plant no longer takes the TCI event's
   `model` (`pipeline.ts:373`, `:170`).
3. **Per-channel delivery** (E1, D4, D5): the drug instance's rate is the channel-less rate plus the channels'.
4. **For drugs whose plant is a gamma curve** (midazolam, ketamine, dexmedetomidine) the pump's prediction works
   unchanged (it needs only the set), but the patient's response is the row's infusion curve, not a concentration.
   **The owner ruled (PQ6 = B for these three):** each plant is built as a compartment model from a published set
   first (E3a–E3c, engine work under the validation workflow, each of which may become its own plan because the drug's
   PD is calibrated on the curve today), and TCI for the drug is offered when its plant piece merges. TCI on a curve
   plant is not offered.
5. **Alfentanil** needs a drug row (PK, PD potency relative to remifentanil from a source, haemodynamics) AND a
   formulary entry, because the learner plan's coverage check requires a file for every injectable id (learner plan
   §5 rule 5): E3d, which waits until the owner names alfentanil (PQ6 = C); the same for remimazolam and the rest.

## 7. The pump as a device role: admission, allow-list, host, record

- **Admission:** exactly L3's: the room code and the learner PIN, PENDING at the relay until the host's grant, the
  same per-address wrong-PIN limits, revoked by a new learner PIN (learner plan D9). The learner PIN grants `learner`
  and `pump`; never `instructor`.
- **Relay:** the classroom rule admits `pump` from another device, counted under `--max-peers`; a granted pump's
  commands pass `pumpMay` or get `forbidden`; the host's channel-history and preparation-label events are routed to
  the pump socket only; learners' and viewers' frames byte-identical.
- **Host (C2):** `pumpMay` again; the channel table's ownership is the engine's (D4); the host resolves the syringe
  (a preparation from its table, after its ready time and with the remaining fraction the learner plan's §7 computes
  at load; or a stock syringe or bag from S1) and checks the shape against the channel's kind and profile (D12), then
  issues `applyEvent pump` through `command()` with `issuedBy: 'pump'`
  [the learner plan uses `'learner'`; a distinct value keeps the Debrief's "by Pump tablet" honest without parsing the
  device name], `by` = the device key, and the channel. The same-drug bolus lock (10 s, `drug-lock.ts`) applies to a
  pump bolus as to any bolus.
- **Record:** a row per applied pump action: device, channel, action, the new value and the value it replaced (rate,
  target, set, programme, typed patient), and for a load the syringe's or bag's origin (preparation id and its maker, or stock
  id). `Administration` (`/2`) gains `source: 'pump'` and `channel?: number`; the learner plan's `by` and `replaced`
  (L5) are reused, not duplicated.

## 8. A prepared syringe on a channel, and a mismatch

- **Which preparations a pump may load:** a ready preparation staged by any learner remote in the room, in a syringe
  container (`syringe-pp`, the bench's `container`, learner plan D2) for a syringe channel or a bag (`bag-pvc`,
  `bag-polyolefin`) for a drip channel. The host sends each pump the LABEL only (drug, concentration, volume, the
  maker's device name, the preparation time), never its findings (the learner plan's D7 keeps findings to the
  instructor and the maker). A loaded preparation leaves the maker's tray (it is in the pump now).
- **Stock syringes and bags (S1), PQ7 = B now, A later (the owner's ruling):** only products used at their labelled
  strength (for example propofol 10 mg/mL, the product's own strength), each with its formulary source; every diluted
  concentration (remifentanil, norepinephrine and the rest) is made on the bench. When the owner finds the
  department's stock list, it replaces this list (PQ7 A) in a data-only follow-up to S1.
- **The mismatch is physical, not a warning.** The pump delivers volume. What reaches the patient is the syringe's TRUE
  contents at their true concentration (and remaining fraction); the pump's dose rate, its TCI prediction and its face
  use the PROGRAMMED drug and concentration. So a remifentanil syringe programmed as propofol gives remifentanil at
  the volume the propofol programme asks for, and a 20 mg/mL syringe programmed as 10 mg/mL gives twice the displayed
  dose while the face shows the target reached. That is the mechanism of the real error, and the engine computes it
  with no fitted term (D4). The same holds for a bag on a drip channel.
- **Who learns of it (PQ8 = A, the owner's ruling, as LQ3):** the host compares contents and programme at
  `pump program` and `pump load`; a mismatch is a finding shown at once as a card on the instructor's laptop and
  phone, with one control, "Show the mismatch notice to the learner" (the pump then sounds and shows "syringe and
  programme differ"; on a drip channel "bag and programme differ"). The pump never warns by itself. The record keeps
  the finding, whether and when the notice was shown, and every delivery made under it.
- **Grading:** a mismatched channel that delivers is a `/2` violation of a new source `pump` (`Violation.source`,
  which the learner plan's L5 gives `'card' | 'formulary'`, gains `'pump'`), `harm: 'modelled'` (the engine delivered
  the true contents). A mismatch corrected before any delivery is a deviation.

## 9. What the instructor sees

- **The mirror** (A3): Instructor v2 gains a "Pumps" sheet showing every channel as the tablet does, and under each
  TCI channel the patient's true Cp and Ce from `DrugPanelRow` beside the pump's prediction ("predicted Ce 3.0 ·
  patient 3.6 µg/mL"), and for a mismatch the true contents in the alarm colour. Read-only (D10, PQ9 = A): no control
  on the mirror changes a channel; infusions change through the Drug sheet.
- **The cards:** a mismatch card (§8); two TCI channels of one drug and two channels summing (D5) as an information
  line on the sheet.
- **The Debrief** (with the learner plan's L13): "Propofol rate changed from 20 to 30 mL/h at 06:30, by Pump tablet
  (bed 2), channel 2"; "Remifentanil Ce target 3 → 4 ng/mL (Minto) at 06:41, by Remote (bed 3), channel 3, replacing
  the instructor's target"; "Channel 1 loaded with remifentanil 50 µg/mL, programmed as propofol 10 mg/mL, 05:12 –
  05:20: 8 mL delivered; notice shown at 05:14". A pump bolus is filed as a bolus (PQ3 = A) and its line still shows
  its seconds: "Propofol bolus 2 mL (20 mg) over 9 s by Pump tablet (bed 2), channel 1". Occlusion and air-in-line
  lines name the channel, the time raised, by whom, and the time cleared. Names from R7's remembered layout.

## 10. Occlusion and air-in-line (PQ4 = C, the owner's ruling)

- **Occlusion (O1), both channel kinds:** a scenario event `pumpOcclusion {ch}` stops the channel's delivery to the
  patient (the true consequence: no drug) while the pump believes it is delivering (its volume counter and its TCI
  prediction keep rising, which is also true of a real pump until it alarms). The alarm is raised after the
  device's alarm time where a source gives it, else by the instructor's press ("raise the occlusion alarm now") from
  the scenario-event controls (not the read-only mirror, PQ9). The catalogues give the pressures (SP-500: three
  selectable levels, L 20–60 kPa, M 50–90 kPa, H 80–140 kPa; OT-701: 100 kPa, its tolerance misprinted in the
  catalogue as "±400 kPa" beside "±0.4 kgf/cm²", so the manual settles it; `research/50`), but not the time to the
  alarm, which also needs the syringe's compliance at the rate (the manual and the syringe-pump literature): a named
  gap until read. **No release bolus without a source:** when the occlusion clears, no stored volume reaches the
  patient until a source for that volume is read.
- **Air-in-line (AL1), drip channels only:** the OT-701 carries an ultrasonic air detector and lists "Air in Line"
  among its alarms (catalogue); the SP-500's alarm list has none, so a syringe channel never raises it. The alarm is
  the instructor's: a scenario event `pumpAirInLine {ch}` from the scenario-event controls raises it on the face
  (state Alarm, the alarm's sound, "Air in Line") and in the record. It has no physiological effect: the engine has no
  line model (LQ12) and venous air embolism is not modelled. Whether the OT-701 stops delivering while the alarm
  stands is the operator's manual's (or the infusion-pump safety standard's, IEC 60601-2-24, which AL1's executor
  reads and cites); AL1 builds what that source states, and if neither can be read it stops and reports rather than
  guess.

## 11. Decisions (the owner, 9 November)

The owner answered the ten questions of the draft on 9 November 2026; the source is `research/00-orchestrator-rulings.md`,
the entries from 15:44 to 18:24 of that day. Each ruling is applied in the sections named beside it; no question of
this plan is open. The options each letter chose are those of the draft's §11 (git history of this file, commit
85f7ecb8).

| ID | Question | Ruling | Ledger | Applied in |
|---|---|---|---|---|
| **PQ1** | How many channels on one tablet? | **C**: chosen on Room setup, 1–8, default 4 | 9 Nov 16:00 | §3, §5, A1 |
| **PQ2** | Which pump does the department use? | **B**, with the devices named: syringe pump **JMS SP-500**; drip (volumetric) pump, the "serum pump", **JMS OT-701**; TCI is not routine there, its reference and first skin the **Mindray BeneFusion SP5 TCI series**. The two JMS catalogues (brochures, not manuals) are in `assets/pumps/`, their specification tables in `research/50-pump-reference-devices.md`; numbers they do not give stay named gaps. Consequence: two channel kinds, syringe (SP-500 face) and drip (OT-701 face: drops/mL set types, mL/h or drops/min), plus TCI on a syringe channel (SP5 face); three skins | 9 Nov 16:17 | header, §2, §3, D2, D4, D6–D8, D12, §5, §10, S1, A1, A2, SK2 |
| **PQ3** | Does a pump bolus count as the drug's bolus in `/2` grading? | **A**: a pump bolus is a bolus, no "over N s" line; its seconds still show in the Debrief | 9 Nov 16:19 | §1.2, §9, C2 |
| **PQ4** | Occlusion and air-in-line in scope? | **C**: occlusion as a scenario event (O1: the drug stops truthfully; alarm after the manual's time or the instructor's press; no release bolus without a source) plus air-in-line as an instructor-raised alarm on the drip channel, which has the detector (AL1, its own piece) | 9 Nov 16:31 | §3, D8, §10, O1, AL1, §14 |
| **PQ5** | Should the pump predict like a real pump, blind to the patient? | **A**: the pump predicts from its own model set and the typed demographics (age, weight, height, sex, and what a model asks); it never reads the patient's physiology; the patient responds through the engine | 9 Nov 15:44 | §1.1, D3, E2 |
| **PQ6** | TCI for the curve-modelled drugs and for drugs not in the library | **B** for midazolam, ketamine, dexmedetomidine (compartment plants from published sets first, E3a–E3c, then TCI); **C** for the rest: alfentanil, remimazolam and others only when he names them (E3d waits) | 9 Nov 16:33 | §6.2, §6.3, E3a–E3d, §14 |
| **PQ7** | The department's standard syringe concentrations | **B now, A when the list is found**: stock items only for products used at their labelled strength; the department's list replaces them when it arrives | 9 Nov 17:11 | §8, S1 |
| **PQ8** | A syringe that differs from the programme: what does the instructor see? | **A**, as LQ3: a card on the instructor's laptop and phone with one control that raises "syringe and programme differ" on the pump; the record keeps whether it was shown | 9 Nov 18:15 | §8, C2, A3 |
| **PQ9** | Controls on the instructor's mirror? | **A**: read-only; infusions change through the Drug sheet; one actor per pump | 9 Nov 18:22 | D10, §9, A3 |
| **PQ10** | The picker card's words | **B**: "Infusion pumps — A rack of syringe and drip pumps for infusions and TCI. Everything you set is recorded under this tablet's name." Marked for the owner's words, as every learner-facing line | 9 Nov 18:24 | §1.2, §2, A1 |

**Where a ruling changed a decision of the draft** (each resolved in favour of the ruling):
1. PQ2 against the draft's non-goal "volumetric (large-volume) pumps": the OT-701 drip channel is now in the rack; the
   non-goal is narrowed to gravity drips without a pump, PCA and epidural pumps (§3).
2. PQ4 = C against the draft's §10, which put air-in-line out of scope "unless the reference pump's manual shows the
   detector" and the draft's default B: the OT-701 has the detector (its catalogue), so air-in-line is in, on drip
   channels only, as its own piece AL1.
3. PQ10's words against the draft's card ("Syringe pumps — A rack of syringe pumps …"): the card is "Infusion pumps"
   and names drip pumps.
4. PQ2's named devices against the draft's single Mindray skin and its gap-only device numbers: three skins, and the
   catalogue numbers enter from the start through the device profiles (D12) instead of waiting for SK2.
PQ1, PQ3, PQ5, PQ6, PQ7, PQ8 and PQ9 chose the draft's defaults, now decisions.

## 12. Global constraints, review focus

**Every piece:** `00-common-rules.md` applies (own worktree under `scratch/`, one PR per piece, draft until its checks
pass, `npx -y pnpm@9.15.9`, the executor's port range, no owner identifier, no closing keyword before a `#number`,
identity through `GIT_AUTHOR_*` / `GIT_COMMITTER_*`, never re-run a job with a failed test). Tests first.
**Must not touch (unless the piece names it):** `packages/engine-core` (T1–T3, E1, E2, E3a–E3d, O1, AL1 only, each
with the validation workflow where it says so), `packages/skins`, the showcase cards, `viewer-sync.ts`, the `defib` and
`learner` paths and their allow-lists, what any Instructor press sends, the drug lock's rule and its 10 s.
**Common gate:** as `room-and-instruments.md` §5 and the learner plan §8 (install, typecheck, the touched package's
tests, model docs and known misses regenerated, `it.fails` count unchanged unless declared), plus
`node scripts/ci/markers.mjs`, plus the TCI-set check once T1 is in.

Review focus:
1. **A number without a source** (§3): every pump-device number traces to a catalogue page (`research/50`), a manual
   page or a named gap in the device profile (D12); every set coefficient to its paper and table.
2. **The pump sees the patient** (D3): a test with the patient's clearance halved shows the pump's rate unchanged and
   the patient's Ce higher.
3. **The device trusted:** the host resolves every syringe and bag, and checks every shape against the channel's kind
   and profile; a forged concentration, contents or `by` changes nothing.
4. **Truth on the pump:** the face renders `programmed`, never `contents`, and never the patient's Cp/Ce.
5. **A learner gains a shape:** `PUMP_COMMANDS`' complement refused at relay and host.

## 13. Pieces

Sizes are plan hours (est.), human-equivalent focused hours as in the Room and learner plans. Each piece is one PR.

### S0: Baseline (2 h)
**Depends on:** nothing. **Files:** new `packages/engine-core/test/l2/pk/pump-baseline.test.ts` (tests only). **Tests
first (they pin today, to be changed knowingly):** a `tci` with `model: 'schnider'` changes the patient's propofol
parameters (pins `pipeline.ts:373`); two `infusion` events of one drug leave one rate (the second wins); the TCI
maximum rate uses `row.syringePerMl`; the TCI controller's rate changes when the patient's clearance factor changes
(pins the oracle). **Acceptance:** pass on main. **Gate:** common, `@pme/engine-core`. **CI:** 1 run.

### T1: The TCI-set registry and its source check (6 h)
**Depends on:** S0. **Files:** `l2/pk/tci-sets/{types,index}.ts`, the check (§6.1 rules 1–7) with fixtures that break
each rule, `docs/guides/tci-sets.md` (how to add a set; which source answers what). **Acceptance:** the check passes on
an empty registry; no behaviour change. **Gate:** common, `@pme/engine-core`, `@pme/validation` (docs-honesty: the
guide). **CI:** 1 run.

### T2: The engine's six sets into the registry, sourced, the `[VERIFY]` marks resolved (8 h + 2 h second reading = 10 h; validation workflow)
**Depends on:** T1. **Files:** `tci-sets/{marsh,schnider,eleveld-propofol,minto,shafer,gepts}.ts`; `models.ts` and
`modelParams` reduced to the registry; the paper checks (§6.1 rule 4). **The rule:** values unchanged unless the paper
says otherwise; if Shafer's or Gepts's microconstants differ from the paper, the PR states the difference and re-runs
the validation workflow, attributing every moved row to it. **Acceptance:** with no difference found, every PK test and
the validation suites byte-identical. **Gate:** common, `@pme/engine-core`, validation workflow (`run-validation`
label). **CI:** 1 run + validation.

### T3: New sets for the compartment-model drugs (8 h + 2 h = 10 h)
**Depends on:** T1, T2. Kataria, Paedfusor, Eleveld 2017 remifentanil, and any further published set for propofol,
remifentanil, fentanyl or sufentanil that the executor's census finds (listed for the orchestrator before it is
added). Registered sets are not used by the plant, so no validation workflow. **Gate:** common, `@pme/engine-core`.
**CI:** 1 run.

### E1: Pump channels in the PK layer, both kinds (12 h; validation workflow)
**Depends on:** S0. **Files:** `types-pk.ts` (`kind: 'pump'` with its actions; the channel state with its `kind`;
`DrugPanelRow` unchanged, a new `pumps` list in the `drugs` event), `pipeline.ts` (validation, apply, per-step volume
accounting, D5's sum, D7's purge, D8's stops and alarm events: End on a syringe channel, Empty Container and Infusion
Complete on a drip channel), snapshot and restore, model docs. Rate mode only; TCI on a channel in E2. The rates the
host resolves from the device profiles (bolus, purge) arrive on the event; E1 holds no device number. **Tests first:**
load, program, rate, stop, start, unload, purge before and after delivery, on both kinds; volume falls at the rate; a
drip channel's drops/min converts with its set (60 drops/min on a 20 drops/mL set is 180 mL/h); at empty the delivery
stops and one alarm event is raised; at a drip channel's volume limit the channel stops with Infusion Complete; two
channels of one drug add; the contents are delivered, not the programme (a remifentanil syringe programmed as propofol
raises remifentanil, §8); snapshot mid-run restores the channels; every existing PK test unchanged (no `pump` event, no
change). (2 h above the draft's 10 h for the drip kind.)
**Gate:** common, `@pme/engine-core`, `@pme/validation`, validation workflow. **CI:** 1 run + validation.

### E2: The pump's own prediction, per channel, and the channel-less TCI with it (10 h; validation workflow)
**Depends on:** E1, T2 (PQ5 = A, ruled). **Files:** `pipeline.ts` (`xPump` per TCI channel and for the channel-less `tci`;
`tciRate` on the set and `xPump`; `pipeline.ts:373` and the `inst.model` path of `:170` removed; maximum rate from the
channel's concentration), `tci.ts` unchanged in algorithm, `pk-longrun.test.ts` (the TCI row now asserts the PUMP's
predicted Ce at 2.5 ± 0.005, and the patient's Ce becomes a declared self-referential regression row, re-recorded with
its cause stated: "the pump no longer sees liver flow", under the 7 November rule). **Tests first:** §12 review focus
2; a wrong weight typed into the pump changes the dose and not the patient; two sets for the same target give the
dose difference the sets' own equations give; a set without ke0 refuses effect mode; plasma and effect targeting on
`xPump` match today's `tci.ts` tests on a patient identical to the set. **Acceptance:** validation suites unchanged
except the rows the PR attributes, row by row, to D3. **Gate:** common, `@pme/engine-core`, `@pme/validation`,
validation workflow. **CI:** 1 run + validation.
**Shared with the scenario builder (its BQ11 = B, 9 Nov 22:04):** the patient's true Cp and Ce that §9's mirror reads become phase-rule truth variables through piece DC1 of `docs/plans/scenario-builder.md`, which merges before the builder's PR 1; E2 keeps `DrugPanelRow` the patient's truth, never `xPump`'s prediction, and DC1's test is that guard.

### S1: Stock syringes and bags, and the device profiles (6 h)
**Depends on:** learner plan L1 and FS (the formulary). **Files:** `packages/controller/formulary/stock-syringes.json`
(syringes and bags; only products used at their labelled strength, each with its product monograph source, PQ7 = B;
the department's list replaces it in a data-only follow-up when the owner finds it, PQ7 A), the three device profiles
of D12 (`packages/controller/pump-devices/{sp-500,ot-701,sp5-tci}.json`, every number cited to its catalogue page in
`research/50` or a `gap`), both rules added to the formulary's source test (a number without `src` or `gap` fails).
**Gate:** common, `@pme/controller`. **CI:** 1 run. (2 h above the draft's 4 h for the profiles.)

### C1: The `pump` role: hello, guard, relay allow-list (6 h)
**Depends on:** learner plan L3 (its learner-PIN admission). **Files:** `protocol.ts` (`Role` gains `'pump'`;
`INSTRUMENTS` gains `'pump'`; `PUMP_COMMANDS`, `pumpMay`, the `pump` command type), `guard.ts`, `relay/server.ts`
(D2, §7), `relay/README.md`; tests as L3's, with the complement of D2 refused (raw `applyEvent pump`, `applyEvent
drug`, `prep stage`, `time`, `scenario`, `atTick`, a `pump load` with a `concentration` field), `check-relay.mjs` one
step. **Must not touch:** `host-session.ts`, the app. **Gate:** common, `@pme/controller`. **CI:** 1 run.

### C2: The host applies a pump's commands; the record; D9; the mismatch finding (10 h)
**Depends on:** C1, E1, E2, learner plan L4 (the preparations table, `infusion set`, `replaced`) and L5; S1 for stock
items and the device profiles. **Files:** `host-session.ts` (the `pump` branch; syringe and bag resolution; every shape
checked against the channel's kind and its profile's ranges, with the profile's words on a refusal; the bolus and purge
rates resolved from the profile onto the event; D9's routing of `infusion set` and the Drug sheet's change; the
mismatch finding and its card with one notice control, PQ8 = A), `drug-lock.ts` (`GivenBy` gains `pump`),
`apps/demo/src/app/record.ts` (the pump row), `scenario/{types-v2,driver,grade}.ts` (`source: 'pump'`, `channel`,
PQ3 = A: a pump bolus is a bolus with no "over N s" line and its seconds kept for the Debrief, `Violation.source`
`'pump'`), schema and authoring guide; tests. **Tests first:** each D2 shape lands
as one `applyEvent pump` with `issuedBy: 'pump'`, `by` and the replaced value; a forged syringe is refused; a TCI or bolus on a drip channel and an
SP-500-out-of-range rate are refused; D9's three cases; the mismatch finding reaches the instructor and not the pump until the notice; the bolus lock across pump and
laptop. **Gate:** common, `@pme/controller`, `@pme/demo`. **CI:** 1 run.

### A1: The pump page, the picker card, the rack (12 h)
**Depends on:** C1, learner plan L6 (the learner-PIN form, reused). **Files:** `classroom.ts` (`#/pump`), `main.ts`,
`views/join.ts` (the card in the owner's words, PQ10 = B: "Infusion pumps — A rack of syringe and drip pumps for
infusions and TCI. Everything you set is recorded under this tablet's name."), Room setup's channel count (1–8,
default 4, PQ1 = C) and each channel's kind (§5), new `apps/demo/src/app/pump/{page,rack,face}.ts`, `app.css`; dom
tests. The face renders from the follower engine's `pumps` list (E1), PROGRAMMED fields only, for both kinds.
**Tests first:** the card's words; the PIN form first; n channels and their kinds from Room setup's setting; the face's
fields per §5 for a syringe and a drip channel from scripted engine states; a profile gap shown as its words ("near-end
time not set"); the contents never in the DOM. (2 h above the draft's 10 h for Room setup's kinds and the drip
face.) **Gate:** common, `@pme/demo`, `mobile-learner.e2e.ts` on both projects. **CI:** 1 run.

### A2: The channel flows on the face (10 h)
**Depends on:** A1, C2, T2 (and T3's sets when merged). **Files:** `pump/{load,program,rate,tci,bolus,purge}.ts`, the
e2e `apps/demo/e2e/pump-rack.e2e.ts`. Load lists the preparations' labels and stock items for the channel's kind; Program from the
pump's drug list, with the set type on a drip channel; Rate in mL/h, a dose rate, or drops/min on a drip channel; TCI asks for the set, the mode and the patient (D6, "Copy from the case sheet"); every refusal shows the
host's words. **e2e:** a remote prepares propofol, the pump loads it on channel 2 and runs Eleveld Ce 3 µg/mL; the
laptop's record row names the tablet and channel; a mismatched load shows the instructor's card. **Gate:** common,
`@pme/demo`, the new e2e 3 of 3 on chromium and webkit. **CI:** 1 run.

### A3: The instructor's Pumps sheet and the Debrief lines (8 h)
**Depends on:** A2, learner plan L13. **Files:** `teach2/pumps-sheet.ts` (§9), `views/debrief*.ts` (the pump lines),
`debrief.e2e.ts` additions. **Tests first:** prediction and patient side by side; §9's three Debrief lines from a
scripted record; nothing printed for a run without a pump. **Gate:** common, `@pme/demo`, `debrief.e2e.ts` on both
projects. **CI:** 1 run.

### A4: Persian (3 h, plus the owner's reading)
**Depends on:** A1–A3. **Files:** `docs/showcase/i18n/fa-debrief.json` (a `pump` group: the face's words and the
Debrief lines, every entry `reviewed: false` until the owner reads it, written through the project's Persian writing
rules; displayed tokens — Cp, Ce, mL/h, units, drug and model names — stay untranslated), the pump page put through
the same matcher when `hostLang()` is `fa`, its dom test listed in `scripts/ci/docs-tests.mjs` (it reads `docs/`).
**Gate:** common, `@pme/demo`, `@pme/validation` (`debrief-fa.test.ts`). **CI:** 1 run.

### SK1: The skin mechanism and the generic skin (4 h)
**Depends on:** A1. **Files:** `apps/demo/src/app/pump/skins/{generic.css,generic.json,index.ts}`: a skin is a
stylesheet plus a labels file; every label and colour in a non-generic skin is covered by a provenance entry (the rule
of `packages/skins/src/provenance.ts`, copied, not imported), checked by a test. **Gate:** common, `@pme/demo`.
**CI:** 1 run.

### SK2: The three skins — JMS SP-500, JMS OT-701, Mindray BeneFusion SP5 TCI (10 h)
**Depends on:** SK1, A2; for each skin, its look source: the owner's screenshots of the device or pages of its own
document (a catalogue photograph counts for what it shows, cited by page). The devices are named (PQ2 = B): the
**SP-500 skin** on syringe channels, the **OT-701 skin** on drip channels, the **SP5 TCI skin** on a syringe channel in
TCI. Each skin's look and words from its sources, each cited (SK1's provenance rule); a skin whose source has not
arrived is not built, and the PR says which. The device numbers are already the catalogues' (D12, from S1); when an
operator's manual arrives, the profile's gaps (near-end time, purge volume limit, KVO entry, occlusion alarm time, the
SP5's TCI rate ceiling and patient-data limits, and the 1 200 mL/h in `tci.ts:6` for the SP5) are filled from its pages
in a data-only PR to the profile, not in this piece. **Gate:** common, `@pme/demo`. **CI:** 1 run, or one per skin if
their sources arrive apart. (10 h for three skins, against the draft's 6 h for one skin plus its numbers: about 3 h a
skin and 1 h for the switch between them, est.)

### O1: Occlusion as a scenario event, both channel kinds (6 h; ruled, PQ4 = C; validation workflow)
**Depends on:** E2, C2. §10's first part: the `/2` scenario event `pumpOcclusion {ch}` and its press in the
instructor's scenario-event controls (not the read-only mirror); the delivery stops while the pump's counters run on;
the alarm after a sourced time or at the instructor's press; no release bolus; the Debrief line. **Tests first:** the
patient's concentration falls under an occlusion while the pump's prediction rises; the alarm only at the press while
the time is a gap; no volume released on clearing. **Gate:** common, `@pme/engine-core`, `@pme/controller`, validation
workflow. **CI:** 1 run + validation.

### AL1: Air-in-line as an instructor-raised alarm on a drip channel (4 h; ruled, PQ4 = C)
**Depends on:** E1 (the drip channel), C2, O1 (it shares O1's scenario-event press and Debrief line, so it follows
it). **First:** the executor reads what the OT-701 does while "Air in Line" stands (its operator's manual, or IEC
60601-2-24's requirement for air-in-line detection) and cites it; if neither can be read, the piece stops and reports
(§10). **Files:** the scenario event `pumpAirInLine {ch}` (refused on a syringe channel: the SP-500 has no detector),
its press beside O1's, the face's alarm state and sound, the record and Debrief line. **Tests first:** the alarm on a
drip channel and its refusal on a syringe channel; no physiological change beyond what the cited source says the
pump does with its delivery. **Gate:** common, `@pme/engine-core` (the alarm lives in the channel state, D4),
`@pme/controller`, `@pme/demo`; the validation workflow if the cited behaviour stops the delivery. **CI:** 1 run (+
validation if so).

### E3a–E3d: Plants for TCI drugs the engine models only as a curve, and alfentanil (E3a–E3c ruled, PQ6 = B; E3d waits, PQ6 = C; validation workflow each)
- **E3a dexmedetomidine** (12 h): the plant from a sourced PK (the executor proposes Hannivoort 2015 or another, with
  reasons), its PD re-sourced from the curve's calibration; Hannivoort and Dyck registered as sets.
- **E3b midazolam** (10 h) and **E3c ketamine** (10 h): the census of published sets first (§6.2), then the plant and
  the sets.
- **E3d alfentanil** (12 h), only when the owner names it: a new drug row (Maitre PK, potency and haemodynamics from
  sources) and its formulary file. Remimazolam and any other drug he names later get a piece of the same shape.
Each may become its own plan if its PD cannot be re-sourced in the piece; the executor stops and reports. **CI:** 1 run
+ validation each.

### S9: Kit, docs and the end-to-end measurement (5 h, last)
**Depends on:** everything built. `docs/showcase/CLASSROOM.md` (the pump tablet in the run sheet), CHANGELOG fragment,
the roadmap row, `apps/demo/e2e/pump-room.e2e.ts` (a pump tablet, a learner remote, the laptop on the in-process relay
through a TIVA run). **Measure:** press-to-applied time from the tablet over the kit relay on Wi-Fi, median and p95, on
the owner's smoke; loopback in CI. **CI:** 1 run.

## 14. Partition, critical path, merge order, CI load

```
S0 ─┬─► E1 ─┬─► E2 ─────────────┐
    │       │   ▲               │
    └─► T1 ─┴─► T2 ─┬─► T3      │
                    │           ▼
[L3] ─► C1 ─────────┼──────►  C2 ─► A2 ─► A3 ─► A4 ─► S9
[L4, L5] ───────────┼──────►  ▲     ▲
[L1, FS] ─► S1 ─────┼─────────┘     │
[L6] + C1 ─► A1 ─┬──┴───────────────┘
                 └─► SK1 ─► SK2 [each skin's look source]
E2 + C2 ─► O1 ─► AL1         T1 ─► E3a–E3c        E3d [when named]
```

- **Before the learner path lands:** S0, T1, E1, T2, E2, T3 need nothing from the learner plan: 2 + 6 + 12 + 10 + 10 +
  10 = 50 h of engine work, serial on the engine (one engine PR at a time, the validation workflow serialised, and
  interleaved with the learner plan's L10a–L10d and L12, which touch the same generated model docs).
- **Critical path after L4 merges** (the ruling: built after L3/L4): C2 (10) → A2 (10) → A3 (8, also after L13) →
  A4 (3) → S9 (5) = **36 h**, provided E2, C1 and A1 are in by then (they can be: the engine chain S0, T1, E1, T2, E2
  in merge order is 2 + 6 + 12 + 10 + 10 = 40 h from S0; C1 and A1 right after L3 and L6). O1 and AL1 follow C2 on the
  engine queue (10 h) and do not lengthen it unless the engine queue is busy with E3a–E3c.
- **Merge order:** S0, T1, E1, T2, E2, T3, (L3) C1, (L6) A1, SK1, (L1, FS) S1, (L4, L5) C2, A2, (L13) A3, A4, O1, AL1,
  E3a, E3b, E3c, SK2 skin by skin as each look source arrives, S9; E3d (and any drug like it) only when the owner names
  it. S9 does not wait for a skin whose source has not arrived nor for E3d; it says which are missing. Engine pieces one
  at a time (O1, AL1 and E3a–E3c share the engine queue and the validation workflow); C2 rebases on L4's
  `host-session.ts`; A2 and A3 share `pump/` and the Debrief with L7–L13.
- **CI load:** 21 PRs ruled in (S0, T1, T2, T3, E1, E2, S1, C1, C2, A1, A2, A3, A4, SK1, SK2, O1, AL1, E3a, E3b, E3c,
  S9; SK2 may be up to three if the skins' sources arrive apart), 22 with E3d; one full run each (median about 409
  runner-minutes and 61 min wall per PR run, `research/42-ci-and-process-review.md` §1.2, as the learner plan counts),
  plus re-merge runs. Engine-classified (slow groups): S0, T1, T2, T3, E1, E2, O1, AL1, E3a–E3d. **Validation
  workflow:** T2, E1, E2, O1, E3a–E3d, and AL1 if its cited behaviour stops the delivery. New e2e files:
  `pump-rack.e2e.ts`, `pump-room.e2e.ts`; cases added to `mobile-learner.e2e.ts` and `debrief.e2e.ts`; no new CI job.

**Effort** (changed from the draft where a ruling added work: E1 +2 h and A1 +2 h for the drip kind, S1 +2 h for the
device profiles, SK2 +4 h for three skins, AL1 new; O1 and E3a–E3c moved from conditional to ruled)

| Piece | h (est.) |
|---|---|
| S0 baseline | 2 |
| T1 TCI-set registry and source check | 6 |
| T2 the six existing sets, sourced (incl. second reading) | 10 |
| T3 new sets for compartment-model drugs (incl. second reading) | 10 |
| E1 pump channels in the PK layer, syringe and drip | 12 |
| E2 the pump's own prediction; channel-less TCI with it | 10 |
| S1 stock syringes and bags, device profiles | 6 |
| C1 `pump` role, guard, relay | 6 |
| C2 host applies, record, D9, mismatch, `/2` | 10 |
| A1 pump page, picker card, rack, Room setup's count and kinds | 12 |
| A2 channel flows | 10 |
| A3 instructor's Pumps sheet, Debrief lines | 8 |
| A4 Persian | 3 |
| SK1 skin mechanism, generic skin | 4 |
| SK2 the three skins (SP-500, OT-701, SP5 TCI) | 10 |
| O1 occlusion (PQ4 = C) | 6 |
| AL1 air-in-line on a drip channel (PQ4 = C) | 4 |
| E3a dexmedetomidine, E3b midazolam, E3c ketamine (PQ6 = B) | 12 + 10 + 10 = 32 |
| S9 kit, docs, end-to-end | 5 |
| **Total ruled in** | **166 h** in 21 PRs, plus review |
| E3d alfentanil, only when named (PQ6 = C) | 12 |
| **Total with E3d** | **178 h** in 22 PRs |

## 15. Self-review against the codebase (8344539d)

| Claim | File and line |
|---|---|
| PK event shapes incl. `tci` with `model`, `maxRateMlH` | `packages/engine-core/src/types-pk.ts:15–17` |
| One instance per drug; `DrugInst.model`, `.tci` | `l2/pk/pipeline.ts:44`, `:50`, `:231` |
| `modelParams`, `baseParams` take the instance's model | `pipeline.ts:153–164`, `:166–183` (`:170`) |
| The accepted TCI model list | `pipeline.ts:263` |
| TCI event sets the patient's model; max rate from `row.syringePerMl` | `pipeline.ts:371–374` |
| Controller on the patient's own params and state | `pipeline.ts:476–480`; `params` `:218–224` |
| Jacobs / Shafer & Gregg; 10 s; 15 min horizon; 1 200 mL/h | `l2/pk/tci.ts:1–10` |
| Models and their ke0s; `[VERIFY]` on Shafer and Gepts | `l2/pk/models.ts:12–111` |
| Covariates; the ke0 rule | `l2/pk/covariates.ts:1–30` |
| Gamma rows for ketamine, midazolam, dexmedetomidine | `l2/pk/data/rows-anaesthetic.ts:80`, `:123`, `:134` |
| Syringe concentration on the row | `l2/pk/row.ts:111–112` |
| The open-loop question on the 6 h TCI run | `packages/engine-core/test/engine/pk-longrun.test.ts:40–52` |
| `defib` allow-list, `LEARNER_ISSUED_BY`, `INSTRUMENTS` | `packages/controller/src/protocol.ts:270`, `:404–420` |
| Guard roles and `SHOWS_WITH` | `packages/controller/src/guard.ts:115–117` |
| Picker words; device key | `apps/demo/src/app/views/join.ts:22–35`, `:60` |
| `/2` `administrationOf`, `tci` filed with settings | `packages/controller/src/scenario/driver.ts:573–592` |
| Bolus criterion: "over N s, bolus asked" | `packages/controller/src/scenario/grade.ts:134`, `:180–181` |
| Persian table and matcher; host language | `apps/demo/src/app/i18n/fa-dom.ts:8–14`; `i18n/lang.ts` |
| Skin provenance rule | `packages/skins/src/provenance.ts:1–25` |
| CI change classes | `.github/workflows/ci.yml:30–31` |

Disagreements found while reading:
1. The brief says the engine "already has … target-controlled infusion in plasma and effect-site modes". It does, but
   its controller reads the simulated patient's true state and organ-scaled parameters, and the chosen model replaces
   the patient's own (§1.3). A pump built on it as it is would always hit its target and could not teach model
   choice: D3 and E2 change that, as the owner ruled (PQ5 = A).
2. The brief lists dexmedetomidine, midazolam and ketamine sets "where … the engine's PK can take it": the engine's
   PK for those three is an effect curve, so it cannot take a concentration model without a plant change (§6.3,
   E3a–E3c, ruled PQ6 = B). Alfentanil is not in the drug library at all (E3d, waiting for the owner to name it).
3. The brief's "the rack: … from a real tower, with the source": the Mindray dock's count was not found in Mindray's
   public pages; the default cites B. Braun's SpaceStation, and the owner ruled the count onto Room setup (PQ1 = C).
4. The ruling "any remote may change any infusion" (LQ4) meets a rack where one drug can run on two channels: D9
   refuses the ambiguous change instead of guessing a channel.
5. Brief 114 (the ruling fold), reading the OT-701 catalogue: its occlusion pressure is printed "100±400 kPa
   (1±0.4kgf/cm2)"; the two tolerances disagree (0.4 kgf/cm² is about 40 kPa). The plan carries 100 kPa and leaves the
   tolerance to the operator's manual (§10); no code uses the tolerance.
