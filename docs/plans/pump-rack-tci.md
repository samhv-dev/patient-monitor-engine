# Syringe-pump rack with target-controlled infusion, as a learner instrument — Implementation Plan

**STATUS: DRAFT FOR THE OWNER'S RULINGS (2026-11-09).** Written by a planning executor from brief 109 of the
post-demo set. Nothing in it is built: this pull request adds this page and one roadmap row, and changes no product
code, test, card, kit or data file. The owner's questions are in §11 (PQ1–PQ10); every one has the default the plan
uses if no answer comes, and each piece names the questions it waits on.

**Base and preconditions.**
- Base: `origin/main` **8344539d** (Merge PR #359, `plan-learner-action-remote`), read in the worktree
  `scratch/wt-plan-pumps` (branch `plan-pump-rack`). Every `file:line` below is on 8344539d and is a starting point
  only: an executor finds the code by the function name given, because lines move.
- The owner's rulings this plan applies (8 and 9 November; `research/00-orchestrator-rulings.md`, 8 November 22:28,
  and brief 109): a **rack** of several syringe pumps on one tablet, as an anaesthesia tower; a **generic** pump face
  first, skins later, **Mindray** the first skin; **all TCI models for every drug that has published parameter sets**,
  each set sourced; built **after the learner remote's command path** (L3 and L4 of
  `docs/plans/learner-action-remote.md`), because the pump reuses it; **any remote may change any infusion**, every
  change recorded with the device and the rate it replaced (LQ4).
- The rule over every number: mechanisms first, sources set the numbers (owner, 7 November;
  `scratch/briefs/post-demo/00-common-rules.md`). A quantity no source gives is a named gap with its question (§11),
  never invented. A pump-device number (a near-end time, a purge limit, a maximum rate) comes from the reference
  pump's operator's manual once the owner names the pump (PQ2); until then it is a gap, marked as such on the face.
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
| A declared engine question, open since 4 October: the 6 h TCI run holds propofol's effect site at 2.5 ± 0.005; "an open-loop TCI pump does not know the patient's liver flow — real pumps do not either; whether the pump's model should see it is the owner's question" | `packages/engine-core/test/engine/pk-longrun.test.ts:40–52`; ruling G-FU9 (`research/00-orchestrator-rulings.md:913`) | This plan answers it with a mechanism (§4 D3) and puts the choice to the owner (PQ5) |
| The panel row the app reads: `cp`, `ce`, `rate`, `tci {mode, target, model}`, `totalAmount`, `decrement50Min` | `types-pk.ts:99–107` (`DrugPanelRow`) | The instructor's mirror shows the patient's `cp`/`ce` beside the pump's prediction (§9) |

### 1.2 The learner command path the pump reuses

| Today | Where | What it means |
|---|---|---|
| The `defib` role (R5c, R5d): joins on the room code, may send exactly two shapes, the host re-checks and writes `issuedBy: 'learner'` and `by` = the device key | `packages/controller/src/protocol.ts:404–420` (`LEARNER_DEFIB_COMMANDS`, `LEARNER_ISSUED_BY`), `guard.ts:115–117` | The pattern this plan copies a third time, after L3's `learner` role |
| The `learner` role, the learner PIN, `LEARNER_COMMANDS`, `infusion set` on any running infusion with the replaced rate (LQ4), the preparations table on the host, the bench (L7) | `docs/plans/learner-action-remote.md` §4 D1–D9, pieces L3, L4, L7, L8 — **planned, not on main** | The pump is admitted exactly as the remote is (room code + learner PIN); its prepared syringes are the bench's preparations |
| The picker: Learner monitor, Patient monitor, Ventilator, Depth (not available), IABP (later) | `apps/demo/src/app/views/join.ts:22–35` (`PICKER_WORDS`) | A "Syringe pumps" card (A1) |
| The follower's instruments named on the hello | `protocol.ts:270` (`INSTRUMENTS`) | `pump` joins them (C1) |
| `/2` files a `tci` press as kind `tci` with `settings {mode, target}`; a bolus action with `rate: {bolus: true}` adds a deviation line "over N s, bolus asked" for any `overS > 0` | `packages/controller/src/scenario/driver.ts:573–592` (`administrationOf`); `grade.ts:134`, `:180–181` | A pump's bolus runs over seconds at the bolus rate: PQ3 decides whether it counts as the card's bolus |
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

A tablet scans the room QR, chooses "Syringe pumps" and, after the learner PIN, shows a rack of channels side by side,
as on an anaesthesia tower. Each channel is one generic pump face: the drug and concentration it was programmed with,
the rate or the target, the volume infused and remaining, the time to empty, its alarms, and its own history. A
learner loads a syringe onto a channel (a preparation made on the learner remote's bench, or a stock syringe),
programmes the drug and concentration from the pump's drug list, and runs it at a rate, or in TCI with a chosen
model, plasma or effect-site, after typing the patient's age, weight, height and sex. The pump's predicted Cp and Ce
are on the face; the patient responds through the engine's own PK. The instructor's laptop mirrors the rack, shows
the patient's true concentrations beside each prediction, and the Debrief says "Propofol rate changed from 20 to
30 mL/h at 06:30 by Pump tablet (bed 2), channel 2".

## 3. Goals, non-goals, anti-goals

Goals
- **The `pump` device role**, admitted by the room code and the learner PIN as the learner remote (L3's admission), with
  its own allow-list of command shapes (§4 D2), applied by the host through the same drug paths as the instructor's,
  every applied action recorded with `by`, the channel and the value it replaced.
- **The rack**: n channels on one tablet (default 4, PQ1), each the generic face.
- **TCI sets as data with sources**: every published set the owner ruled in, each a row with its paper, its
  covariates, its ke0 (or "none: plasma targeting only"), proved sourced by a CI check like the formulary's (§6).
- **The pump's prediction separated from the patient** (§1.3, §4 D3), per channel.
- **Loading a bench preparation or a stock syringe**, with a syringe-versus-programme mismatch as a real consequence
  (§8).
- **The generic face and a skin mechanism**, the Mindray skin first, from the owner's screenshots or manual only.
- **The instructor's mirror and the Debrief lines**; **Persian** through the existing table.

Non-goals
- Volumetric (large-volume) pumps, gravity drips, PCA and epidural pumps; a drug-library "hard and soft limits"
  editor; barcode or RFID syringe recognition; network pump management (the docking station's supervision software).
- A line model (lumens, dead space, the delay from the pump to the vein, Y-site compatibility): already out of scope in
  the learner plan (LQ12); the pump inherits it.
- Closed-loop anaesthesia (a pump driven by the depth index).

Anti-goals (a piece that does one of these is rejected)
- **A pump number without its source.** A maximum rate, purge limit, near-end time or occlusion pressure enters code
  only from the reference pump's manual (PQ2) or a cited source; until then a named gap.
- **A TCI set without its paper**, or a ke0 borrowed from another PK model without saying so (the rule already in
  `covariates.ts:1–2`: "a ke0 … belongs to the model it was fitted with").
- **The pump knowing the patient.** The pump's prediction never reads the patient's state, organ factors or cardiac
  output (§4 D3), and the pump face never shows the patient's true Cp/Ce (that is the instructor's, §9).
- **A Mindray look invented.** No colour, layout, word or icon is attributed to Mindray without the owner's
  screenshot or a page of the manual cited beside it.
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
  naming a channel `ch` (an integer 1…n, n the rack's size):
  1. `pump load` — `{type:'pump', action:'load', ch, syringe: {prep: {device, id}} | {stock: stockId}}`: put a syringe
     on the channel. A preparation is named by the device that made it and its id (the host's preparations table,
     learner plan D3); a stock syringe by its id in the stock list (S1).
  2. `pump program` — `{type:'pump', action:'program', ch, drugId, concentration: {amount, unit, perMl}}`: the
     learner's choice from the pump's drug list, independent of what the syringe holds (§8).
  3. `pump rate` — `{type:'pump', action:'rate', ch, rate, unit}` (`mL/h`, or a dose rate the face converts with
     the PROGRAMMED concentration, as a real pump does).
  4. `pump tci` — `{type:'pump', action:'tci', ch, setId, mode: 'plasma'|'effect', target, patient: {ageY, weightKg,
     heightCm, sex}}`: start or change TCI; `target 0` stops it. `setId` from the registry (§6); `effect` refused for a
     set with no ke0.
  5. `pump bolus` — `{type:'pump', action:'bolus', ch, volumeMl | dose}`: at the pump's bolus rate (PQ2's manual;
     until then the engine's existing 1 200 mL/h, `tci.ts:6`, which names "the published pumps" and is re-sourced to
     the manual in SK2).
  6. `pump stop` / `pump start` — pause and resume the channel (the programme kept).
  7. `pump purge` — `{type:'pump', action:'purge', ch, volumeMl}` (§4 D7).
  8. `pump unload` — take the syringe off (the channel's history kept).
  Any other shape, and any extra field, is refused at the relay and again at the host (`pumpMay`, as `learnerDefibMay`,
  `protocol.ts:415–420`). Rate: at most 6 commands a second per socket [ENG: network; L3's figure: four channels
  changed in one press sequence plus a margin for double taps], over that `too-many-tries`.
- **D3. The pump predicts with its own model; the patient responds with the engine's.** Each TCI channel holds its own
  compartment state `xPump`, integrated every PK step from the rate the channel delivered, with the parameters of
  the chosen set computed ONCE from the patient data typed into the pump (re-computed only when the learner retypes
  them). `tciRate` (`tci.ts`) is called with the set's parameters and `xPump`, never with `params(pk, row, d)` or
  `d.x`. The patient's PK keeps its own default model (Eleveld for propofol, as today), with its organ and flow
  factors, and receives the channel's delivered amount. The face shows `xPump`'s Cp and Ce, as a real pump does. The
  instructor sees both (§9). Today's `tci` event (the instructor's Drug sheet, the cards, the physiology console)
  keeps its shape and becomes a channel-less pump with the same separation: `model` names the pump's set and no
  longer replaces the patient's model (`pipeline.ts:373` removed); its patient data are the case patient's. PQ5 asks
  the owner to confirm; if he rules that the pump should see the patient (option B there), D3 is not built and E2
  shrinks to the per-channel controller.
- **D4. A new engine event kind `pump`, the channel's state in `PkState`.** The host translates the device's
  commands into `applyEvent {kind: 'pump', ch, …}` with the syringe's TRUE contents (drug, concentration, volume) and
  the PROGRAMMED drug and concentration both carried, because the engine must deliver the contents and predict with
  the programme (§8). The channel state (`contents`, `programmed`, `volumeMl`, `infusedMl`, `mode`, `rate`, TCI set,
  typed patient, `xPump`, `paused`, `alarms`) lives in `PkState`, so snapshot and restore keep it and every follower's
  engine has it. The host does not keep a second copy of the volumes.
- **D5. Channels add.** The drug instance's delivered rate = the channel-less rate (today's `infusion`/`tci`) + the sum
  of every running channel whose contents are that drug. Two channels of norepinephrine during a syringe change both
  deliver; two TCI channels of the same drug each predict as if alone, and the patient receives both: the real hazard,
  not refused. The record and the instructor's mirror name it.
- **D6. The pump's patient entry is the learner's act.** The face asks for age, weight, height and sex before TCI
  starts, as a real TCI pump does, with a one-tap "Copy from the case sheet" (the briefing's values; the record notes
  whether it was copied or typed). A typed value outside the set's studied population (from the paper, §6) shows the
  paper's range and is allowed; a refusal range is a device behaviour and comes from the reference manual (PQ2).
- **D7. Purge.** Before a channel has delivered anything, a purge moves `volumeMl` from the syringe to waste (the line
  is being primed: volume falls, nothing reaches the patient). After it has delivered, the line is connected and a
  purge is a bolus into the patient at the purge rate, recorded as a purge, because that is what happens. The purge
  volume limit is the reference manual's (PQ2) [gap until then; the face accepts at most 2 mL, ENG: ui, stated as
  "limit not set from the manual"].
- **D8. Alarms the engine can represent.** End of syringe: `infusedMl` reaches the loaded volume, the channel's
  delivery stops (the true consequence: no more drug) and the alarm is raised. Near end: raised when the time to empty
  at the current rate falls under the reference pump's near-end setting (PQ2; until set, the alarm is not raised and
  the face says "near-end time not set"). Occlusion and air-in-line: §10, PQ4.
- **D9. Any remote, the laptop and the pump change any channel (LQ4 extended).** A learner remote's `infusion set` for
  a drug that runs on exactly one channel changes that channel; on two or more channels it is refused ("running on
  pumps 2 and 3: change it on the pump"), so no change lands on a channel the sender did not see. The same rule for
  the instructor's Drug sheet. Every change keeps the replaced value and who had set it (learner plan §6's
  `replaced`), plus the channel.
- **D10. The instructor's mirror is read-only in v1.** It shows the rack as the tablet does, plus the patient's truth;
  the instructor acts through the Drug sheet (D9) or the rulings' notice (§8). PQ9 offers controls on the mirror.
- **D11. Where the TCI sets live: the engine.** `packages/engine-core/src/l2/pk/tci-sets/` (one module per set: its
  parameter function and its metadata row), because the engine runs the controller. Consequence: every T piece is an
  engine-classified CI run (`ci.yml:30–31`), with the slow groups.

## 5. The rack: how many channels, and the generic face

**How many channels: default 4, up to 8 [ENG: ui], PQ1.** The reference for the default is a real docking rack:
B. Braun's SpaceStation takes up to four Space pumps per station, and stations combine into one system
(B. Braun, "SpaceStation" product page, bbraunusa.com, read 9 November 2026). Mindray's BeneFusion DS5 docking system
is the owner's skin's family; its per-dock count was not found in Mindray's public pages (a third-party listing says
"up to 24 pumps" on one power cord, not used), so the count follows PQ1 and PQ2. Four is also what a 10-inch tablet in
landscape holds at a readable size [ENG: ui; four 44 px-target columns of about 300 px each at 1280 px]; 5–8 channels
use two rows.

**The generic face (one component, `apps/demo/src/app/pump/face.ts`), per channel:**
- **Header:** channel number; the PROGRAMMED drug name and concentration ("Propofol 10 mg/mL"); the state
  (Not loaded, Loaded, Running, Paused, TCI, Alarm).
- **Main:** in rate mode the rate in mL/h and the dose rate in the programme's unit; in TCI the set's name, the mode
  (Cp or Ce), the target, the pump's predicted Cp and Ce, the current rate.
- **Volumes:** infused (mL and amount), remaining, time to empty at the current rate ("—" in TCI when the rate is 0).
- **Alarms (D8):** end of syringe; near end (once PQ2's time is set); the alarm's sound from the app's own audio, as the
  learner plan's notice sound (no file).
- **History:** the channel's own list ("06:30 rate 20 → 30 mL/h · Pump tablet"; "06:41 target 3.0 → 4.0 µg/mL Ce ·
  Remote (bed 3)"), from the record rows the host sends the pump for its channels (the learner plan's `prep`-style
  host-only event, routed to the pump socket).
- **Buttons:** Load, Program, Rate, TCI, Bolus, Stop/Start, Purge, Unload; 44 px targets [ENG: ui].

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
   labelled as such.
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
| Alfentanil | Maitre | Maitre, Anesthesiology 1987;66:3 | age, weight, sex | the executor reads the ke0 paired with it and its source | **not in the library** | E3d |
| Dexmedetomidine | Hannivoort | Hannivoort, Anesthesiology 2015;123:357 | weight | the PK paper has none; an effect-site ke0 needs its own source (the engine already cites a BIS ke0 0.120 /min from Miller ch. 23 Table 23.6 p. 660, Colin 2017, `combine.ts`, which is NOT fitted on Hannivoort's PK and is labelled so or not used) | **gamma curve** | E3a |
| Dexmedetomidine | Dyck | Dyck, Anesthesiology 1993;78:821 | height | none in the paper | gamma curve | E3a |
| Midazolam | candidates for the executor to confirm (no set is asserted here): the published adult midazolam TCI sets | — | — | — | gamma curve | E3b |
| Ketamine | candidates for the executor to confirm (no set is asserted here): the published ketamine TCI sets, racemic and S(+) apart | — | — | — | gamma curve | E3c |

The citations above are the planner's starting list from the brief and the engine's own code comments; each T or E3
piece reads the paper and either confirms the row or removes it, and adds any published set it finds that the owner's
ruling covers ("all TCI models for every drug that has published parameter sets"). Remimazolam and other drugs with
published sets that are not in the engine's library are listed by E3's census for the owner (PQ6), not built.

### 6.3 What the engine changes to run a per-pump set rather than its single default

1. **The registry** (T1): the six model functions move from `models.ts` and `modelParams` into `tci-sets/` unchanged
   in value (T2 proves byte-identical PK for every existing test); the plant reads its default from the drug row
   (`row.pk.model`) through the same registry.
2. **The pump's own state per channel** (E2, D3): `xPump` and the set's parameters from the typed patient, stepped
   with the channel's delivered rate; `tciRate(setParams, xPump, …)`. The plant no longer takes the TCI event's
   `model` (`pipeline.ts:373`, `:170`).
3. **Per-channel delivery** (E1, D4, D5): the drug instance's rate is the channel-less rate plus the channels'.
4. **For drugs whose plant is a gamma curve** (midazolam, ketamine, dexmedetomidine) the pump's prediction works
   unchanged (it needs only the set), but the patient's response is the row's infusion curve, not a concentration. Two
   honest options (PQ6): offer TCI on them now with the face's prediction and the instructor's mirror saying "patient
   response: effect curve, no concentration model", or build each plant as a compartment model first (E3a–E3c, engine
   work under the validation workflow, each of which may become its own plan because the drug's PD is calibrated on
   the curve today). Default: the second; TCI for those drugs is offered when its plant piece merges.
5. **Alfentanil** needs a drug row (PK, PD potency relative to remifentanil from a source, haemodynamics) AND a
   formulary entry, because the learner plan's coverage check requires a file for every injectable id (learner plan
   §5 rule 5): E3d, conditional on PQ6.

## 7. The pump as a device role: admission, allow-list, host, record

- **Admission:** exactly L3's: the room code and the learner PIN, PENDING at the relay until the host's grant, the
  same per-address wrong-PIN limits, revoked by a new learner PIN (learner plan D9). The learner PIN grants `learner`
  and `pump`; never `instructor`.
- **Relay:** the classroom rule admits `pump` from another device, counted under `--max-peers`; a granted pump's
  commands pass `pumpMay` or get `forbidden`; the host's channel-history and preparation-label events are routed to
  the pump socket only; learners' and viewers' frames byte-identical.
- **Host (C2):** `pumpMay` again; the channel table's ownership is the engine's (D4); the host resolves the syringe
  (a preparation from its table, after its ready time and with the remaining fraction the learner plan's §7 computes
  at load; or a stock syringe from S1), then issues `applyEvent pump` through `command()` with `issuedBy: 'pump'`
  [the learner plan uses `'learner'`; a distinct value keeps the Debrief's "by Pump tablet" honest without parsing the
  device name], `by` = the device key, and the channel. The same-drug bolus lock (10 s, `drug-lock.ts`) applies to a
  pump bolus as to any bolus.
- **Record:** a row per applied pump action: device, channel, action, the new value and the value it replaced (rate,
  target, set, programme, typed patient), and for a load the syringe's origin (preparation id and its maker, or stock
  id). `Administration` (`/2`) gains `source: 'pump'` and `channel?: number`; the learner plan's `by` and `replaced`
  (L5) are reused, not duplicated.

## 8. A prepared syringe on a channel, and a mismatch

- **Which preparations a pump may load:** a ready preparation in a syringe container (the bench's `container`, learner
  plan D2) staged by any learner remote in the room. The host sends each pump the LABEL only (drug, concentration,
  volume, the maker's device name, the preparation time), never its findings (the learner plan's D7 keeps findings to
  the instructor and the maker). A loaded preparation leaves the maker's tray (it is in the pump now).
- **Stock syringes (S1):** a short list of ready-to-use syringes (for example propofol 10 mg/mL, the product's own
  strength), each with its formulary source; standard diluted concentrations (remifentanil, norepinephrine) differ
  between hospitals and come from the department's list (PQ7), else they are made on the bench.
- **The mismatch is physical, not a warning.** The pump delivers volume. What reaches the patient is the syringe's TRUE
  contents at their true concentration (and remaining fraction); the pump's dose rate, its TCI prediction and its face
  use the PROGRAMMED drug and concentration. So a remifentanil syringe programmed as propofol gives remifentanil at
  the volume the propofol programme asks for, and a 20 mg/mL syringe programmed as 10 mg/mL gives twice the displayed
  dose while the face shows the target reached. That is the mechanism of the real error, and the engine computes it
  with no fitted term (D4).
- **Who learns of it:** the host compares contents and programme at `pump program` and `pump load`; a mismatch is a
  finding shown at once on the instructor's laptop and phone, with the LQ3 pattern's one control, "Show the mismatch
  notice to the learner" (the pump then sounds and shows "syringe and programme differ"), default per PQ8. The
  record keeps the finding, the notice's time and every delivery made under it.
- **Grading:** a mismatched channel that delivers is a `/2` violation of a new source `pump` (`Violation.source`,
  which the learner plan's L5 gives `'card' | 'formulary'`, gains `'pump'`), `harm: 'modelled'` (the engine delivered
  the true contents). A mismatch corrected before any delivery is a deviation.

## 9. What the instructor sees

- **The mirror** (A3): Instructor v2 gains a "Pumps" sheet showing every channel as the tablet does, and under each
  TCI channel the patient's true Cp and Ce from `DrugPanelRow` beside the pump's prediction ("predicted Ce 3.0 ·
  patient 3.6 µg/mL"), and for a mismatch the true contents in the alarm colour. Read-only (D10).
- **The cards:** a mismatch card (§8); two TCI channels of one drug and two channels summing (D5) as an information
  line on the sheet.
- **The Debrief** (with the learner plan's L13): "Propofol rate changed from 20 to 30 mL/h at 06:30, by Pump tablet
  (bed 2), channel 2"; "Remifentanil Ce target 3 → 4 ng/mL (Minto) at 06:41, by Remote (bed 3), channel 3, replacing
  the instructor's target"; "Channel 1 loaded with remifentanil 50 µg/mL, programmed as propofol 10 mg/mL, 05:12 –
  05:20: 8 mL delivered; notice shown at 05:14". Names from R7's remembered layout.

## 10. Occlusion and air-in-line (PQ4)

- **Occlusion** can be represented honestly in part: a scenario event `pumpOcclusion {ch}` stops the channel's
  delivery to the patient (the true consequence: no drug) while the pump believes it is delivering (its TCI
  prediction keeps rising, which is also true of a real pump until it alarms). **What needs sources:** the time to the
  occlusion alarm (the pressure limit, the syringe's compliance at that rate, from the reference manual and the
  syringe-pump literature) and the bolus released when the occlusion clears (the volume stored in the compliant
  syringe and line). Piece O1 builds the first part and leaves both quantities as named gaps unless their sources are
  read; with no source for the alarm time, the alarm is the instructor's press ("raise the occlusion alarm now").
- **Air-in-line:** syringe pumps generally carry no air-in-line detector (volumetric pumps do), and the engine has no
  line model (LQ12): out of scope unless the reference pump's manual shows the detector, and then only as an alarm
  the instructor raises, with no physiological effect (venous air embolism is not modelled).

## 11. Questions for the owner (PQ1–PQ10)

| ID | Question, in plain words | Options | Default the plan uses until ruled |
|---|---|---|---|
| **PQ1** | **How many channels on one tablet?** A docking rack such as B. Braun's SpaceStation holds four pumps per station, stackable; a tower for TIVA with vasopressors often uses three to six | **A** 4; **B** 6; **C** a number chosen on Room setup, 1–8 | **C**, defaulting to 4 |
| **PQ2** | **Which pump does your department use?** The first skin needs its look (your screenshots or its operator's manual), and the manual gives the device numbers the plan will not invent: maximum and bolus rates, purge limit, near-end time, occlusion pressure levels, the patient-data limits for TCI | the model name (for example Mindray BeneFusion SP5 or its TCI version), plus screenshots or the manual's PDF | none: SK2 and the device numbers wait; the generic face ships with the gaps named on it |
| **PQ3** | **Does a bolus from the pump count as the drug's bolus in the `/2` grading?** A pump bolus runs over seconds at the bolus rate; today a card's bolus step adds "over N s, bolus asked" for anything given over time | **A** yes, a pump bolus is a bolus (no "over N s" line when the source is a pump bolus); **B** it is graded as given over N s, like a slow push | **A** |
| **PQ4** | **Are occlusion and air-in-line alarms in scope?** §10: occlusion can stop the drug truthfully; its alarm time and the bolus on release need the manual's and the literature's numbers; air-in-line has no physiology to show | **A** neither; **B** occlusion as a scenario event (O1), alarm time from the manual or the instructor's press, no release bolus without a source; **C** B plus air-in-line as an instructor-raised alarm, if your pump has the detector | **B** |
| **PQ5** | **Should the pump predict like a real pump, blind to the patient?** (The open question from 4 October on the 6 h TCI run, and TQ57 of the review pack.) | **A** yes: the pump shows its own prediction, the patient responds with the engine's model; the instructor sees both (D3); **B** no: keep today's controller, which uses the patient's true state, so the target is always met | **A** |
| **PQ6** | **TCI for drugs the engine models only as an effect curve** (midazolam, ketamine, dexmedetomidine), and for drugs not in the library (alfentanil, remimazolam) | **A** offer TCI now with the prediction, the patient responding by the curve, labelled; **B** build each drug's plant as a compartment model first (E3a–E3c), then offer it; add alfentanil as a new drug (E3d); **C** B, but only for the drugs you name | **B** for the three; alfentanil and others only if named (C) |
| **PQ7** | **Your department's standard syringe concentrations** (for stock syringes: remifentanil, norepinephrine, and the rest) | **A** you send the list; **B** stock syringes only for products ready to use at their labelled strength, everything else made on the bench | **B** until A arrives |
| **PQ8** | **A syringe that differs from the pump's programme**: what does the instructor see? | **A** as LQ3: a card on laptop and phone with one control that sounds the notice on the pump; **B** the pump warns at once, by itself (real pumps with syringe recognition can); **C** no notice: the Debrief only | **A** |
| **PQ9** | **Controls on the instructor's mirror?** | **A** read-only; the instructor changes infusions through the Drug sheet (D9); **B** the mirror's channels take the same controls as the tablet | **A** |
| **PQ10** | **The picker card's words** | the plan's draft: "Syringe pumps — A rack of syringe pumps for infusions and TCI. Everything you set is recorded under this tablet's name." | the draft, marked for your words |

## 12. Global constraints, review focus

**Every piece:** `00-common-rules.md` applies (own worktree under `scratch/`, one PR per piece, draft until its checks
pass, `npx -y pnpm@9.15.9`, the executor's port range, no owner identifier, no closing keyword before a `#number`,
identity through `GIT_AUTHOR_*` / `GIT_COMMITTER_*`, never re-run a job with a failed test). Tests first.
**Must not touch (unless the piece names it):** `packages/engine-core` (T1–T3, E1, E2, E3a–E3d, O1 only, each with the
validation workflow where it says so), `packages/skins`, the showcase cards, `viewer-sync.ts`, the `defib` and
`learner` paths and their allow-lists, what any Instructor press sends, the drug lock's rule and its 10 s.
**Common gate:** as `room-and-instruments.md` §5 and the learner plan §8 (install, typecheck, the touched package's
tests, model docs and known misses regenerated, `it.fails` count unchanged unless declared), plus
`node scripts/ci/markers.mjs`, plus the TCI-set check once T1 is in.

Review focus:
1. **A number without a source** (§3): every pump-device number traces to the manual or a gap; every set coefficient to
   its paper and table.
2. **The pump sees the patient** (D3): a test with the patient's clearance halved shows the pump's rate unchanged and
   the patient's Ce higher.
3. **The device trusted:** the host resolves every syringe; a forged concentration, contents or `by` changes nothing.
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

### E1: Pump channels in the PK layer (10 h; validation workflow)
**Depends on:** S0. **Files:** `types-pk.ts` (`kind: 'pump'` with its actions; the channel state; `DrugPanelRow`
unchanged, a new `pumps` list in the `drugs` event), `pipeline.ts` (validation, apply, per-step volume accounting,
D5's sum, D7's purge, D8's end-of-syringe stop and alarm event), snapshot and restore, model docs. Rate mode only; TCI
on a channel in E2. **Tests first:** load, program, rate, stop, start, unload, purge before and after delivery; volume
falls at the rate; at empty the delivery stops and one alarm event is raised; two channels of one drug add; the
contents are delivered, not the programme (a remifentanil syringe programmed as propofol raises remifentanil, §8);
snapshot mid-run restores the channels; every existing PK test unchanged (no `pump` event, no change).
**Gate:** common, `@pme/engine-core`, `@pme/validation`, validation workflow. **CI:** 1 run + validation.

### E2: The pump's own prediction, per channel, and the channel-less TCI with it (10 h; validation workflow)
**Depends on:** E1, T2; PQ5 (A). **Files:** `pipeline.ts` (`xPump` per TCI channel and for the channel-less `tci`;
`tciRate` on the set and `xPump`; `pipeline.ts:373` and the `inst.model` path of `:170` removed; maximum rate from the
channel's concentration), `tci.ts` unchanged in algorithm, `pk-longrun.test.ts` (the TCI row now asserts the PUMP's
predicted Ce at 2.5 ± 0.005, and the patient's Ce becomes a declared self-referential regression row, re-recorded with
its cause stated: "the pump no longer sees liver flow", under the 7 November rule). **Tests first:** §12 review focus
2; a wrong weight typed into the pump changes the dose and not the patient; two sets for the same target give the
dose difference the sets' own equations give; a set without ke0 refuses effect mode; plasma and effect targeting on
`xPump` match today's `tci.ts` tests on a patient identical to the set. **Acceptance:** validation suites unchanged
except the rows the PR attributes, row by row, to D3. **Gate:** common, `@pme/engine-core`, `@pme/validation`,
validation workflow. **CI:** 1 run + validation.

### S1: Stock syringes (4 h)
**Depends on:** learner plan L1 and FS (the formulary). **Files:** `packages/controller/formulary/stock-syringes.json`
(each with its product monograph source; PQ7), its rule added to the formulary's source test. **Gate:** common,
`@pme/controller`. **CI:** 1 run.

### C1: The `pump` role: hello, guard, relay allow-list (6 h)
**Depends on:** learner plan L3 (its learner-PIN admission). **Files:** `protocol.ts` (`Role` gains `'pump'`;
`INSTRUMENTS` gains `'pump'`; `PUMP_COMMANDS`, `pumpMay`, the `pump` command type), `guard.ts`, `relay/server.ts`
(D2, §7), `relay/README.md`; tests as L3's, with the complement of D2 refused (raw `applyEvent pump`, `applyEvent
drug`, `prep stage`, `time`, `scenario`, `atTick`, a `pump load` with a `concentration` field), `check-relay.mjs` one
step. **Must not touch:** `host-session.ts`, the app. **Gate:** common, `@pme/controller`. **CI:** 1 run.

### C2: The host applies a pump's commands; the record; D9; the mismatch finding (10 h)
**Depends on:** C1, E1, E2, learner plan L4 (the preparations table, `infusion set`, `replaced`) and L5; S1 for stock
syringes. **Files:** `host-session.ts` (the `pump` branch; syringe resolution; D9's routing of `infusion set` and the
Drug sheet's change; the mismatch finding and its notice per PQ8), `drug-lock.ts` (`GivenBy` gains `pump`),
`apps/demo/src/app/record.ts` (the pump row), `scenario/{types-v2,driver,grade}.ts` (`source: 'pump'`, `channel`,
PQ3's bolus rule, `Violation.source` `'pump'`), schema and authoring guide; tests. **Tests first:** each D2 shape lands
as one `applyEvent pump` with `issuedBy: 'pump'`, `by` and the replaced value; a forged syringe is refused; D9's three
cases; the mismatch finding reaches the instructor and not the pump until the notice; the bolus lock across pump and
laptop. **Gate:** common, `@pme/controller`, `@pme/demo`. **CI:** 1 run.

### A1: The pump page, the picker card, the rack (10 h)
**Depends on:** C1, learner plan L6 (the learner-PIN form, reused). **Files:** `classroom.ts` (`#/pump`), `main.ts`,
`views/join.ts` (the card, PQ10), new `apps/demo/src/app/pump/{page,rack,face}.ts`, `app.css`; dom tests. The face
renders from the follower engine's `pumps` list (E1), PROGRAMMED fields only. **Tests first:** the card's words; the PIN
form first; n channels from Room setup's setting (PQ1); the face's fields per §5 from scripted engine states; the
contents never in the DOM. **Gate:** common, `@pme/demo`, `mobile-learner.e2e.ts` on both projects. **CI:** 1 run.

### A2: The channel flows on the face (10 h)
**Depends on:** A1, C2, T2 (and T3's sets when merged). **Files:** `pump/{load,program,rate,tci,bolus,purge}.ts`, the
e2e `apps/demo/e2e/pump-rack.e2e.ts`. Load lists the preparations' labels and stock syringes; Program from the pump's
drug list; TCI asks for the set, the mode and the patient (D6, "Copy from the case sheet"); every refusal shows the
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

### SK2: The Mindray skin, and the device numbers from its manual (6 h)
**Depends on:** SK1, A2; **PQ2 answered with screenshots or the manual.** The skin's look and words from them, each
cited; the device numbers of D2, D7, D8 and §10 from the manual's pages, replacing their gaps (and the 1 200 mL/h in
`tci.ts:6` re-sourced or changed per skin). **Gate:** common, `@pme/demo` (plus `@pme/engine-core` and the validation
workflow if an engine constant changes). **CI:** 1 run.

### O1: Occlusion as a scenario event (6 h; conditional on PQ4; validation workflow)
**Depends on:** E2, C2. §10's first part; the `/2` scenario event; the alarm by source or by the instructor's press.
**Gate:** common, `@pme/engine-core`, `@pme/controller`, validation workflow. **CI:** 1 run + validation.

### E3a–E3d: Plants for TCI drugs the engine models only as a curve, and alfentanil (conditional on PQ6; validation workflow each)
- **E3a dexmedetomidine** (12 h): the plant from a sourced PK (the executor proposes Hannivoort 2015 or another, with
  reasons), its PD re-sourced from the curve's calibration; Hannivoort and Dyck registered as sets.
- **E3b midazolam** (10 h) and **E3c ketamine** (10 h): the census of published sets first (§6.2), then the plant and
  the sets.
- **E3d alfentanil** (12 h): a new drug row (Maitre PK, potency and haemodynamics from sources) and its formulary file.
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
                 └─► SK1 ─► SK2 [PQ2]
E2 + C2 ─► O1 [PQ4]          T1 ─► E3a–E3d [PQ6]
```

- **Before the learner path lands:** S0, T1, E1, T2, E2, T3 need nothing from the learner plan: 2 + 6 + 10 + 10 + 10 +
  10 = 48 h of engine work, serial on the engine (one engine PR at a time, the validation workflow serialised, and
  interleaved with the learner plan's L10a–L10d and L12, which touch the same generated model docs).
- **Critical path after L4 merges** (the ruling: built after L3/L4): C2 (10) → A2 (10) → A3 (8, also after L13) →
  A4 (3) → S9 (5) = **36 h**, provided E2, C1 and A1 are in by then (they can be: E-chain 32 h from S0, C1 and A1 right
  after L3 and L6).
- **Merge order:** S0, T1, E1, T2, E2, T3, (L3) C1, (L6) A1, SK1, (L1, FS) S1, (L4, L5) C2, A2, (L13) A3, A4, O1 if
  ruled, E3a–E3d as ruled, SK2 when PQ2 is answered, S9. Engine pieces one at a time; C2 rebases on L4's
  `host-session.ts`; A2 and A3 share `pump/` and the Debrief with L7–L13.
- **CI load:** 16 PRs without the conditionals (S0, T1, T2, T3, E1, E2, S1, C1, C2, A1, A2, A3, A4, SK1, SK2, S9), up to
  21 with O1 and E3a–E3d; one full run each (median about 409 runner-minutes and 61 min wall per PR run,
  `research/42-ci-and-process-review.md` §1.2, as the learner plan counts), plus re-merge runs. Engine-classified
  (slow groups): S0, T1, T2, T3, E1, E2, O1, E3a–E3d. **Validation workflow:** T2, E1, E2, O1, E3a–E3d. New e2e files:
  `pump-rack.e2e.ts`, `pump-room.e2e.ts`; cases added to `mobile-learner.e2e.ts` and `debrief.e2e.ts`; no new CI job.

**Effort**

| Piece | h (est.) |
|---|---|
| S0 baseline | 2 |
| T1 TCI-set registry and source check | 6 |
| T2 the six existing sets, sourced (incl. second reading) | 10 |
| T3 new sets for compartment-model drugs (incl. second reading) | 10 |
| E1 pump channels in the PK layer | 10 |
| E2 the pump's own prediction; channel-less TCI with it | 10 |
| S1 stock syringes | 4 |
| C1 `pump` role, guard, relay | 6 |
| C2 host applies, record, D9, mismatch, `/2` | 10 |
| A1 pump page, picker card, rack | 10 |
| A2 channel flows | 10 |
| A3 instructor's Pumps sheet, Debrief lines | 8 |
| A4 Persian | 3 |
| SK1 skin mechanism, generic skin | 4 |
| SK2 Mindray skin and the manual's numbers (after PQ2) | 6 |
| S9 kit, docs, end-to-end | 5 |
| **Subtotal** | **114 h** in 16 PRs |
| O1 occlusion (PQ4 B or C) | 6 |
| E3a dexmedetomidine, E3b midazolam, E3c ketamine, E3d alfentanil (PQ6) | 12 + 10 + 10 + 12 = 44 |
| **Total with every conditional** | **164 h** in 21 PRs, plus review |

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
   choice: D3 and E2 change that, subject to PQ5.
2. The brief lists dexmedetomidine, midazolam and ketamine sets "where … the engine's PK can take it": the engine's
   PK for those three is an effect curve, so it cannot take a concentration model without a plant change (§6.3,
   E3a–E3c, PQ6). Alfentanil is not in the drug library at all (E3d).
3. The brief's "the rack: … from a real tower, with the source": the Mindray dock's count was not found in Mindray's
   public pages; the default cites B. Braun's SpaceStation and is put to the owner (PQ1, PQ2).
4. The ruling "any remote may change any infusion" (LQ4) meets a rack where one drug can run on two channels: D9
   refuses the ambiguous change instead of guessing a channel.
