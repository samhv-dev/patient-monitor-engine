# Learner action remote (E136): drugs and infusions, lab samples and the lab view, with the preparation bench inside the drugs menu — Implementation Plan

**STATUS: READY TO BUILD (2026-11-09).** Every owner question (LQ1–LQ14) is ruled (9 November; section 0 below, and
§10). Written by a planning executor from brief 99 of the post-demo set on 8 November as a draft, and amended on 9
November with the rulings: each ruling is applied to its pieces, and the totals, the critical path and the merge order
are re-made (§9). No product code, test, card, kit or data file was changed while writing it: this pull request adds
this page and updates one roadmap row.

**Base and preconditions.**
- Base: `origin/main` **d3dcb34d** (Merge PR #320, `feat/eeg-signal`), read in the worktree
  `scratch/wt-plan-learner-remote` (branch `plan-learner-action-remote`). Every `file:line` below is on d3dcb34d and
  is a starting point only: an executor finds the code by the function name given, because lines move.
- The rulings (binding, the owner's words): `scratch/briefs/post-demo/e136-rulings-excerpt.md`: the 29 October 18:00
  ruling (the bench shows a compatibility problem at staging and the instructor decides; components make a preparation
  with its concentration, diluent, compatibility and preparation time from a sourced formulary layer; a wrong diluent
  is a deviation, a violation if delivered; the loss of effect is modelled; particulate harm is a debrief consequence),
  and the 8 November evening replies 3 and 11 (scope: the WHOLE drug library; the bench lives in the drugs menu of a
  learner remote the learner opens from the room QR, from which the learner gives drugs and infusions, sends lab
  samples and reads the results in a lab view; every entry carries its source, none is a placeholder), and the
  rulings of 9 November on this plan's questions (section 0), which set the formulary's sources (Stabilis primary,
  Trissel 2013 the cross-check, the product monograph).
- The rule over every number: mechanisms first, sources set the numbers (owner, 7 November;
  `scratch/briefs/post-demo/00-common-rules.md`). A quantity a source does not give is named as a gap and put to the
  owner (§10), never invented.
- The plans this one stands on: `docs/plans/room-and-instruments.md` (R0–R10; its R5c is on main as PR #306, its R5d
  is in progress as brief 96 on branch `room-r5d-learner-defib`, not yet a pull request at the time of writing) and
  `docs/plans/instructor-peer-role.md` (P0–P8; P3 and P7 on main). House style: those two and
  `docs/plans/debrief-2-option-c.md`, whose question format (DQ1…) §10 follows.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR. Tests first in every code piece: the failing test is committed before the code.

---

## 0. Rulings, 9 November (the owner's answers to LQ1–LQ14)

| ID | Ruling | Applied in |
|---|---|---|
| **LQ1** | **A separate learner PIN** (option B), handed out by the instructor. The remote joins with the room code AND that PIN. The learner PIN is not the instructor's PIN and grants the learner role only | §3, §4 D1, D9; L3, L4, L6 |
| **LQ2** | **Option C**: the point-of-care gas panel, AND a laboratory chemistry panel (creatinine, coagulation, fibrinogen, CK, electrolytes), AND INR. The first analyser is the **Radiometer ABL800**: its analyte list and its specification-sheet times are one data row; another device later is another row. The laboratory turnaround comes from **Hawkins 2007** until the owner's laboratory gives its own figure. Critical values: the hospital's list, or the Kost list | §1.3, §9 L10a–L10d, L11, L15 |
| **LQ3** | The instructor's card has **ONE control: "Show the incompatibility notice to the learner"** (no let-stand, no remove). On the learner's remote the notice is a **sound**, as an aide raising a concern in the real room, plus the finding shown inside the remote. The card also shows on the **instructor's phone**. If the learner presses Give before the instructor acts, the preparation IS given, and the record states whether the notice had been shown, and when | §4 D7; L5, L7, L9, L13 |
| **LQ4** | **Option B**: any remote may change any infusion. Every change is recorded with the device that made it and the rate it replaced | §4 D2, D8; L4, L5, L8, L13 |
| **LQ5** | Formulary sources: **the Stabilis database is the source of record** (primary). **Trissel's Handbook on Injectable Drugs, 17th edition (2013)**, is the cross-check, available to executors as a PDF in the workspace library (`library/sources/full-pdfs/Handbook of Injectable Drugs (Trissel) 2013.pdf`, from the workspace root): it is read in place, never copied into the repository, and cited by edition and page. The stocked product's monograph gives concentrations and diluents. **Every entry says which of the three it has** | §5; L1, FS, F1–F3 |
| **LQ6** | **Option B for now**: a public label (DailyMed or EMC), named per entry; each entry is re-pointed to the department's product when the owner finds the stock list | §5; FS, F1–F3 |
| **LQ7** | Default stands (A): no source for the preparation time → ready at once, "no source for the preparation time" in the Debrief | L2, L7, L13 |
| **LQ8** | Default stands (A): incompatible with no quantity → the full amount delivered, "loss not modelled", the harm named in the Debrief | §7.2; L2 |
| **LQ9** | Default stands (A): "≥ 90 % for T h" → 100 % within T; beyond T the last measured value, flagged | §7.2; L2 |
| **LQ10** | Default stands (A): the bench is on the remote only; the laptop's Drug sheet gives as today | §3 |
| **LQ11** | Default stands (A): wrong diluent = not listed in the stocked product's monograph (graded); the effect follows the stability sources (modelled) | §4 D5; L2, L5 |
| **LQ12** | Default stands (A): no Y-site compatibility; preparations only | §3, §9.3 |
| **LQ13** | **Option B**: a remote sees the results of its own samples; the laptop sees every result, in a small Labs view: piece **L15** (≈ 4 h) | §4 D6; L11, L15 |
| **LQ14** | Default stands (A): no card change; the formulary grades every preparation | §6 |

Also carried, from the owner's message of 9 November: the learner remote is a **second commanding instrument by the
owner's ruling** (§4 D9; §11 point 5 is now a decision, not a disagreement); the engine's 120 s lab turnaround gets its
source in the lab piece (L10a). The 8 November "formulary of record" wording (Trissel primary, Stabilis the
cross-check) is superseded by LQ5: Stabilis is primary, Trissel 2013 the cross-check.

---

## 1. Inventory: what exists on d3dcb34d

### 1.1 The learner's devices today: followers, and one command path

| Today | Where | What it means for this plan |
|---|---|---|
| A learner's phone is a FOLLOWER: it runs its own engine from the host's snapshot and every applied command, sample-identical, and computes nothing the host did not command | `apps/demo/src/app/views/follower.ts:1–37` (the wire contract), `mountFollower` `:136` | The remote is a follower too: its monitor, its defibrillator readout and (new) its lab results come from its own engine, replaying the host's commands. No new event stream is needed for results (§4 D6) |
| The phone layout: upright, the instructor's style, held while the cockpit drives | `follower.ts:138–145` (`upright`, `portrait`), `:174–181` | The remote's monitor strip reuses it; R24's drawn phone layout (three vitals, one strip, a labs line, `research/40-post-demo-inventory.md:52`) stays the instructor phone's, not built here |
| The follower's instrument hashes: `#/pick`, `#/monitor`, `#/monitor/wide`, `#/defib`; anything else is the learner monitor | `apps/demo/src/app/classroom.ts:51–61` (`instrumentOf`, `hashOf`); `apps/demo/src/app/main.ts:59–93` | A new hash `#/remote/learner` (§4 D1) |
| The picker's cards: Learner monitor, Patient monitor, Ventilator (not on a device), Depth (not available), IABP (later); the defibrillator is Room setup's opener only | `apps/demo/src/app/views/join.ts:20–35` (`PICKER_WORDS`), `:18` | The picker gains a "Learner remote" card (L6) |
| The device key, 12 of `[a-z0-9]`, kept on the device | `join.ts:57` (`deviceKey`) | The remote's `by` (who gave what) |
| The instructor's phone remote: a PIN form, then role `instructor`, granted by the laptop | `apps/demo/src/app/views/remote.ts:1–11`, `:150–183`; `docs/plans/instructor-peer-role.md` §1 | The learner remote reuses its PIN FORM (keypad, memory-only PIN, the state words) with the LEARNER PIN (LQ1 ruled), and the instructor's command path on the HOST |
| `Role` includes `defib` (R5c): joins as a learner (no PIN), follows as a viewer, may send `LEARNER_DEFIB_COMMANDS` only | `packages/controller/src/protocol.ts:27–31`, `:398–418` (`LEARNER_DEFIB_COMMANDS`, `learnerDefibMay`) | The pattern copied exactly for a `learner` role (L3) |
| The guard's roles and the roles that may carry `show`/`device` | `packages/controller/src/guard.ts:115`, `:117` | `learner` joins both sets |
| The relay: a `defib` socket's command passes only `learnerDefibMay`, at most 4 a second, else `forbidden` | `packages/controller/relay/server.ts:162` (`DEFIB_PER_S`), `:303–313`, `:540` (the classroom rule admits `defib` from another device) | The same three places admit `learner` and its allow-list (L3) |
| The host: an instructor's command is re-checked (`instructorRefusal`) and filed with `issuedBy: 'remote'`; a viewer is refused | `packages/controller/src/session/host-session.ts:562–578` | R5d adds the `defib` branch here (`issuedBy: 'learner'`, `by` = the device key); L4 adds the `learner` branch beside it |
| R5d (brief 96, in progress): the host applies a learner's Charge and Shock, records the row as kind `learner` with the device's key and name | `scratch/briefs/post-demo/96-room-r5d-learner-defib-applied.md`; `apps/demo/src/app/record.ts:25` (`RowKind` has no `learner` yet) | L4 depends on R5d merged and extends the same `by` |

### 1.2 Drugs: the library, the wire, the host's lock and staged delivery

| Today | Where | What it means |
|---|---|---|
| THE drug library: 65 rows in three files, by family; 4 are volatiles (sevoflurane, isoflurane, desflurane, N₂O), **61 are injectable** | `packages/engine-core/src/l2/pk/data/drugs.ts:1–12`; `rows-anaesthetic.ts`, `rows-cardiovascular.ts`, `rows-other.ts` | The bench's scope: 61 formulary entries (§9.1). Three rows are `cls: 'placeholder'` (tranexamic acid, ondansetron, dexamethasone): they still need a preparation entry |
| 14 rows carry a syringe concentration for the pump (`syringePerMl`): propofol, fentanyl, remifentanil, sufentanil, phenylephrine, norepinephrine, epinephrine, vasopressin, dobutamine, milrinone, dopamine, nitroglycerin, nitroprusside, esmolol | `packages/engine-core/src/l2/pk/row.ts:112`; the rows | Today's fixed syringe; the bench replaces it with the learner's own preparation's concentration |
| The engine's drug events: `drug` (bolus, or `infusion: true` with a rate), `infusion` (rate, optional `concentration {amount, unit, perMl}`), `tci`, `vaporiser` | `packages/engine-core/src/types-pk.ts:13–17` | An infusion already takes the syringe's concentration (`pk/pipeline.ts:274–275`): the bench's concentration rides an existing field |
| The wire's `ClinicalEvent` carries `drug`, `infusion`, `tci`, `vaporiser`; it has **no `lab`** | `packages/controller/src/protocol.ts:52–57` | L10a adds `lab` to the wire type (the engine accepts it already) |
| The app's dose picker: names and classes from the library, presets are drafts | `apps/demo/src/app/drugs.ts:1–3`, `:18` | The remote's drug list reads the same `DRUGS` and the formulary (L7) |
| Instructor v2's Drug sheet: groups, presets, "Add to the cache for staged delivery", Deliver / Give | `apps/demo/src/app/teach2/drug-sheet.ts:1–12`, `:245` | The remote's tray and Deliver copy its shape; the laptop's sheet is unchanged unless LQ10 says otherwise |
| The same-drug lock: a bolus of a drug given within 10 s of sim time, from any device, is refused `recent` (owner, 5 November) | `packages/controller/src/session/drug-lock.ts:1–11`, `:28–32` (`bolusDrugOf`), `:35–38` (`givenByOf`: laptop, phone, card) | Reused unchanged; `GivenBy` gains `learner` so the refusal says "from a learner's remote" (L4) |
| Staged delivery (R15) and the lock inside it (#337): a held delivery is applied in one dispatch, item by item against the lock | `host-session.ts:606–617`, `:646–676` (`release`); `protocol.ts:39`, `:45` (`stageGroup`, batch `n`) | The remote's Deliver of several staged preparations is one `stageGroup` and meets the lock exactly as the laptop's does (L4) |

### 1.3 Lab samples and results today

| Today | Where | What it means |
|---|---|---|
| The engine emits `labs` (1 Hz truth) and, on `applyEvent {kind:'lab', panel:'abg'|'vbg', turnaroundS?}`, freezes the panel at the draw and returns it as `labResult` after the turnaround | `packages/engine-core/src/types-blood.ts:29–30`, `:48`; `l2/blood/pipeline.ts:260–262`, `:324–326` (turnaround 30–3600 s), `:411` | A sample is an engine event; a follower's engine produces the same `labResult` at the same tick (sample-identical), so the remote needs no new event to read its results (§4 D6) |
| The turnaround: one number for the whole panel, `LAB_TURNAROUND_S = 120`, "point-of-care analyser ≈ 60–90 s + the walk", marked `[ENG: device]` | `packages/engine-core/src/l2/blood/labs.ts:9` | Not sourced; L10a replaces it with the ABL800 row's and the laboratory row's sourced turnarounds (LQ2 ruled) |
| The panel: pH, PCO₂, PO₂, HCO₃⁻, BE, sO₂, COHb, MetHb, lactate, Na⁺, K⁺, Cl⁻, iCa²⁺, Mg²⁺, Hb, glucose, AG, osmolality | `types-blood.ts:39–44` (`LabPanel`); `labs.ts:20–49` (`labPanel`) | Every value a POC analyser reports is here; Mg²⁺, AG and osmolality are not what most blood-gas analysers measure, so the ABL800 row (LQ2 ruled) decides what the gas panel returns. INR is computed by the liver model (`types-organs.ts:48`) but is in no panel; GFR is computed (`types-organs.ts:44`) but no creatinine; **no creatinine, no PT/aPTT or platelet count, no fibrinogen and no CK are computed** (`grep` of `packages/engine-core/src` on d3dcb34d): the laboratory panel the owner ruled needs those mechanisms built (L10b–L10d) |
| The only lab view in the product: the renderer's `mountLabPanel`, a table flagged against reference ranges, used by the developer page `blood-acid-base` only | `packages/renderer/src/lab-panel.ts:6–23`, `:30–41`; `apps/demo/src/dev/blood-acid-base.ts:27–28` | **There is no instructor lab view in the app** (§11 disagreement 1). The remote's lab view is built on `mountLabPanel` (L11) |
| No app control sends `applyEvent lab`; the instructor allow-list has no `applyEvent lab` | `protocol.ts:370–378` (`INSTRUCTOR_COMMANDS`); `grep -rn "kind: 'lab'" apps/demo/src/app` finds nothing outside tests | The remote is the first app control that draws a sample |
| A `/2` card's `sample` action is recorded by its taking only (no engine command), as `procedure` and `communication` are | `packages/controller/src/scenario/driver.ts:557` (`RECORDED_KINDS`); `apps/demo/src/app/teach2/press.ts:25–27` | The format needs a way for a learner's real draw to satisfy a card's sample action (§6) |
| Critical values for the phone's labs line: Kost's critical-limits list recommended (O15) | `research/lab-critical-values-2026-10-29.md` §1; `research/40-post-demo-inventory.md:202` | The lab views' flags: the hospital's list, else Kost (LQ2 ruled) |

### 1.4 The scenario format `/2`: what grading can say today

| Today | Where | What it means |
|---|---|---|
| Action kinds: drug, device, procedure, fluid, physical, sample, communication, decision | `packages/controller/src/scenario/types-v2.ts:82` | Unchanged |
| A drug action's criteria: identity, dose, cumulative, route, rate | `types-v2.ts:60–70` (`DrugCriteria`) | No diluent, no concentration: §6 adds `diluent` |
| The administration record: source `action | sheet | cache | remote | panel | script`; kind incl. `drug`, `infusion`, `tci`, `sample` | `types-v2.ts:169–190` (`Administration`); `driver.ts:573–576` (`administrationOf`: `issuedBy` `remote` or `controller:` → `remote`, else `panel`) | A learner's give would be filed as `panel` today: §6 adds `learner` |
| Grades: met / deviation / overdue / failed / due / not applicable; a deviation line per criterion off | `packages/controller/src/scenario/grade.ts:40`, `:164–196` (`deviations`) | A wrong diluent becomes one more deviation line |
| Violations come from a card action's `contraindications` (`AdminFilter`: kind, drugId, cls, route, dose), `harm: 'modelled' | 'not modelled'` | `types-v2.ts:73–80`; `grade.ts:63`, `:416–437` | A formulary violation is not card-authored: §6 adds formulary findings beside the card's |

### 1.5 The Room plan's fixed points this plan keeps

- Anti-goal: "The phones stop following the host … No instrument sends a command, with ONE exception … the
  defibrillator window" (`docs/plans/room-and-instruments.md:117–121`). The owner's rulings of 8 and 9 November make the learner
  remote the SECOND commanding instrument (§4 D9); it follows R5c's pattern, admitted by the room code and the learner
  PIN (LQ1).
- No accounts (`room-and-instruments.md:114`): the remote is a device, named by its key and Room setup's remembered
  name (R7), never a person's login.
- One QR (`room-and-instruments.md` §4 D4): the remote is a card in the picker, not a second QR.
- The roadmap row: E136 at `docs/roadmap/v1.0-remaining.md:47` ("The Drug sheet becomes a preparation bench"); the
  8 November ruling moves the bench into the learner remote's drugs menu. This PR rewrites the row to point here.

## 2. Intent

A learner scans the room QR, chooses "Learner remote" and gets, on the phone, three menus beside a small follower
monitor: **Drugs** (the preparation bench, then staging, then delivery), **Infusions** (start, change, stop) and
**Labs** (draw a sample, see it pending, read the result). The remote joins with the room code and the learner PIN the instructor hands out (LQ1). Every
press travels the R5c way: an allow-list on the device's role, the relay forwarding only those shapes, the host re-checking and applying through the same command
path as the instructor's own actions, and every applied action recorded with `by` = the device, so the Debrief says
who gave what. Inside the drugs menu, the learner builds a preparation from components; the formulary layer, a data
file per drug with a source on every statement, says its concentration, diluents, compatibility, stability and
preparation time; a compatibility problem shows on the instructor's laptop and phone at staging, and the instructor
decides whether to sound the incompatibility notice on the learner's remote (LQ3); a wrong diluent is a deviation, a violation if delivered; the loss of effect follows the source's own stability
figures; particulate harm is named in the Debrief, never computed.

## 3. Goals, non-goals, anti-goals

Goals
- **The `learner` role**, admitted by the room code and the learner PIN (LQ1 ruled: option B), R5c's pattern for
  everything it may send.
- **The allow-list** (§4 D2): stage a preparation, discard it, deliver it (bolus), start an infusion from one of the
  device's preparations, change or stop ANY running infusion (LQ4 ruled), draw a sample. Nothing else.
- **The formulary layer** for all 61 injectable drugs of the library, plus the diluents, each statement sourced
  (Stabilis primary; Trissel 2013 the cross-check; the stocked product's public label, LQ5 and LQ6 ruled), proved
  sourced by a CI test (§5).
- **The bench** in the remote's drugs menu: components → preparation (concentration, diluent, volume, preparation
  time) → staging (the tray) → delivery, reusing staged delivery and the same-drug lock.
- **The physiology of a wrong preparation** as a true mechanism: the active amount delivered is the prepared amount
  times the fraction the source says remains (§7); nothing where the source gives no quantity (LQ8, LQ9).
- **The lab views**: the point-of-care gas panel (the ABL800 row), a laboratory chemistry panel and INR (LQ2 ruled),
  each with its sourced turnaround; the remote shows its own samples' results, the laptop shows every result (LQ13
  ruled), both on `mountLabPanel`.
- **Grading** by `/2`: a wrong diluent staged = deviation; delivered = violation (§6).
- **The Debrief** names who gave what and the consequences (particulate harm as text).

Non-goals
- The instructor's own Drug sheet becoming a bench (the roadmap row's old wording): ruled out (LQ10).
- A line model (which cannula, which lumen) and Y-site compatibility with running infusions: ruled out (LQ12).
- Pharmacy workflow (orders, labels, barcode scanning), stock counts, expiry dates.
- Analytes outside the ruled panels (troponin, myoglobin, lipase and the rest): §9.3. The ruled ones the engine does not
  compute yet (creatinine, coagulation, fibrinogen, CK) are built as mechanisms in L10b–L10d.
- A second QR, accounts, profiles.

Anti-goals (a piece that does one of these is rejected)
- **A number without its source.** No concentration, stability figure, preparation time or turnaround enters data or
  code without a source entry; where none exists the field says `gap` and points to its LQ. Not a placeholder, not an
  `[ENG]` marker in place of a clinical number.
- **A fitted penalty for a wrong preparation.** "Effect lost" is only the delivered amount the source's figures give;
  never a multiplier chosen to look right, never a "bad prep" PD term.
- **Particulate harm as physiology.** No embolic, inflammatory or infusion-reaction term in the engine; it is a line in
  the Debrief, sourced.
- **The remote computes the truth.** The device proposes components; the HOST recomputes the preparation from the
  formulary and its own clock and never trusts a concentration, fraction or finding the device sends (§4 D3).
- **A learner gains a shape outside the allow-list**: no time, scenario, rhythm, device, airway, ventilation, CPR,
  vaporiser, condition, bleed, note or pin; no `atTick`, no raw `applyEvent drug` (§4 D2).
- **Truth reaches the lab view.** The remote's lab view shows `labResult` (a drawn sample, after its turnaround) only,
  never the 1 Hz `labs` truth its own engine also emits.
- **Reproducing a copyrighted monograph.** Formulary entries carry our own short statements and the reference
  (edition, monograph, page or section), never copied text or tables from Trissel or a product monograph.

## 4. Decisions this plan makes where the brief and the rulings were silent

- **D1. The remote is an instrument page on a follower.** Hash `#/remote/learner` on a `?join=CODE` page; it mounts
  the follower (`mountFollower`, `show: 'learner'` layout, smaller) and three tabs. Its hello is `{role: 'learner',
  show: 'learner', device, pin}` (the device key, `join.ts:57`; the learner PIN typed in the remote's PIN form, held in
  the page's memory only, as P7's instructor PIN, `views/remote.ts:1–11`). A follower engine is what lets results and the patient's
  response appear on the device with no new event (D6).
- **D2. The allow-list, `LEARNER_COMMANDS`, exactly these shapes** (`protocol.ts`, beside `LEARNER_DEFIB_COMMANDS`):
  1. `prep stage` — `{type:'prep', action:'stage', prep:{id, components:[{productId, amount, unit}], diluent?:
     {id, volumeMl}, container?}}`: the device asks the host to make a preparation. `id` is the device's own
     (`[a-z0-9]{8}`), unique per device.
  2. `prep discard` — `{type:'prep', action:'discard', id}`.
  3. `prep deliver` — `{type:'prep', action:'deliver', id, volumeMl | 'all', route, overS?}`: a bolus from the
     preparation. Several in one `stageGroup` (a tray delivered at once), batch `n` as today.
  4. `prep infuse` — `{type:'prep', action:'infuse', id, rateMlH}`: start an infusion from one of this device's
     preparations (or change its rate).
  4b. `infusion set` — `{type:'infusion', action:'set', drugId, rateMlH}`: change (or, at 0, stop) ANY running
     infusion of that drug, whoever started it (LQ4 ruled); the host keeps the running infusion's concentration.
  5. `applyEvent lab` — `{type:'applyEvent', event:{kind:'lab', panel}}`, panel from the ruled list (LQ2); no
     `turnaroundS` (the panel's sourced turnaround is the engine's, L10a).
  Every other shape, and any extra field on these, is refused, at the relay and again at the host (`learnerMay`, as
  `learnerDefibMay`, `protocol.ts:410–418`). The `prep` type is new; the host never forwards it to the engine (D3).
  Rate: at most 6 commands a second per socket [ENG: network; a tray of up to 4 items delivered in one press plus a
  margin for double taps; R5c's 4 a second covers two presses], over that `too-many-tries`.
- **D3. The host makes the preparation and turns a delivery into today's engine events.** On `prep stage` the host
  calls the formulary's pure `prepare(components, diluent, formulary, simT)` (L2) and keeps the result in a
  preparations table keyed by device and id: concentration, volume, the preparation's ready time (`simT` + the
  sourced preparation time, else `simT` with the gap noted), its findings (compatibility, wrong diluent), and its
  stability curve. It broadcasts the preparation to the instructor's screens (laptop and phone) and to that device (a new
  host-only event `prep`, never in `VIEWER_EVENTS`, sent to its own device only, §4 D7). On `prep deliver` the host computes the
  active amount = volume × concentration × the source's remaining fraction at the preparation's age (§7) and issues
  `applyEvent drug {drugId, dose, unit, route, overS}` through `command()` exactly as the instructor's press, with
  `issuedBy: 'learner'`, `by` = the device key, and the preparation's id on the command (`prepId`, additive). On
  `prep infuse` it issues `applyEvent infusion {drugId, rate, unit: 'mL/h', concentration}` with the preparation's
  active concentration; on `infusion set` it issues the same event with the running infusion's own concentration and
  records the rate it replaced and who had set it (LQ4). So the lock, staged delivery, the engine's validation and the record are today's.
- **D4. The formulary lives in the controller, not in a new package.** Data: `packages/controller/formulary/<drugId>.json`
  and `diluents/<id>.json`, `sources.json`; code: `packages/controller/src/formulary/` (types, loader, `prepare`,
  `remaining`). Reason: the host (controller) and the remote (demo app) both read it, the controller is already a
  dependency of both, and a new workspace package changes `pnpm-lock.yaml`, which makes every PR in the stage an
  engine-classified CI run (`.github/workflows/ci.yml:31`) for no benefit. The engine never reads the formulary.
- **D5. "Wrong diluent" is the stocked product's monograph; "effect" is Trissel and Stabilis.** A diluent the stocked
  product's monograph does not list for that preparation is wrong (deviation; violation when delivered). Whether, and
  how much, the active drug is lost is a separate question answered by the stability and compatibility statements.
  A diluent can be wrong and lose nothing (graded, no effect), or listed and still lose drug past its stated time
  (no deviation, the effect follows the figures). Ruled 9 November (LQ11, A).
- **D6. Lab results come from each device's own engine; each device shows what LQ13 ruled.** A sample is `applyEvent lab`; the host applies it; every
  follower's engine, the remote's included, freezes the same panel at the same tick and emits the same `labResult`
  after the same turnaround (`pipeline.ts:261`, `:411`). The remote's lab view listens to `labResult` only, and shows a
  result only for a sample this device drew (the `labResult` is matched to the device's own `applyEvent lab` by its
  draw tick and panel; LQ13 ruled: a remote sees its own samples). The laptop's Labs view (L15) shows every
  `labResult` of its engine. No result crosses the wire; the relay and `VIEWER_EVENTS` are unchanged for results.
- **D7. Who sees a preparation, and the incompatibility notice (LQ3 ruled).** The host's `prep` event (made, findings,
  notice, delivered, discarded) goes to the host's own screens, to granted instructors (the instructor's phone shows
  the same card), and to the one `learner` socket that staged it, never to other learners or viewers (the relay
  routes it as it routes an ack to the socket that sent the command, `server.ts:324–330`). The finding is shown to
  the instructor at once. The learner learns of it only when the instructor presses the card's one control, "Show the
  incompatibility notice to the learner": the remote then sounds the notice (an aide raising a concern in the real
  room) and shows the finding inside the preparation. The instructor never removes or blocks a preparation; a Give
  pressed before the notice is given, and the record says whether the notice had been shown, and at what time.
- **D8. Any remote may change any infusion (LQ4 ruled, option B).** The infusions menu lists every running infusion
  (from its own engine's state) with Change and Stop on each, whoever started it. Every change is recorded with the
  device that made it and the rate it replaced (and who had set that rate).
- **D9. The learner remote is the second commanding instrument, by the owner's ruling.** The Room plan's anti-goal
  allowed one (the defibrillator window, `room-and-instruments.md:117–121`); the rulings of 8 and 9 November add the
  learner remote. It is admitted by the room code and the learner PIN: the laptop draws the learner PIN (4–6 digits
  [ENG: ui; P7's PIN rule]) and shows it on Room setup behind press-and-hold, as P7 shows the instructor's; it is kept
  in the laptop's store (`pme.learnerPin`) beside `pme.instructorPin`, never in an address, the QR, a log, the record
  or `room.json`. The relay keeps a learner socket PENDING until the host's `grant`, under the same per-address
  wrong-PIN limits as an instructor; the host checks the learner PIN with the same check as P3's (`verify`), and a
  learner PIN never grants `instructor` (nor the instructor's PIN `learner`). Changing the learner PIN revokes every
  granted remote.

## 5. The formulary layer: data with sources, and the CI check that proves it

**Shape (one file per drug; field names are the plan's, values below are placeholders showing WHERE a number comes
from, not data):**

```json
{
  "drugId": "dantrolene",
  "products": [{
    "id": "<stocked product id>", "form": "powder | solution | emulsion",
    "strength": { "amount": "<from S2>", "unit": "mg", "perVial": true, "src": "S2" },
    "reconstitute": { "diluents": ["<from S2>"], "volumeMl": "<from S2>", "src": "S2" },
    "prepTime": { "s": "<from a source, or gap>", "src": "S4", "gap": "LQ7" }
  }],
  "diluents": [
    { "id": "water", "listed": true, "src": "S2" },
    { "id": "saline", "listed": false, "src": "S2",
      "compat": { "verdict": "incompatible | compatible | conditional | not tested", "statement": "<our words>", "src": "S3",
                  "crossCheck": { "trissel": "agrees | differs | not listed", "src": "S1", "ruling": "<when differs>" } } }
  ],
  "admixtures": [ { "with": "<drugId>", "verdict": "…", "statement": "…", "src": "S1", "crossCheck": { … } } ],
  "stability": [ { "diluent": "water", "container": "vial | syringe-pp | bag-pvc | bag-polyolefin", "tempC": 25,
                   "points": [["<h from S3>", "<fraction from S3>"]], "statement": "…", "src": "S3", "crossCheck": { … } } ],
  "has": { "stabilis": true, "trissel": true, "monograph": true },
  "sources": "keys into sources.json"
}
```

**The three sources and their roles (LQ5, LQ6 ruled 9 November).** **Stabilis** (stabilis.org) is the source of
record: a compatibility or stability statement and its figures come from it when it has them. **Trissel's Handbook on
Injectable Drugs, 17th edition (2013)** is the cross-check of every such statement; executors read it in place in the
workspace library (`library/sources/full-pdfs/Handbook of Injectable Drugs (Trissel) 2013.pdf`, from the workspace
root), never copy it or an extract of it into the repository, and cite it by edition and page. Where Stabilis has no
statement and Trissel has one, Trissel's is used and the entry says so (`has.stabilis: false`). The **product
monograph** gives the products, strengths, concentrations and listed diluents: for now a public label, DailyMed or
EMC, named per entry (LQ6, B), re-pointed to the department's product when the owner finds the stock list. **Every
entry says which of the three it has** (`has`).

`sources.json` entries: `stabilis` (the monograph id, the retrieval date, the reference Stabilis cites for the
figure), `trissel` (edition `17 (2013)`, monograph title, page, the reader and date), `monograph` (product name,
marketing-authorisation holder, document version or date, the issuing body: DailyMed or EMC, later the department's
leaflet), `study` (a cited paper, DOI or PMID) for a preparation time or a measured loss.

**The CI check** (`packages/controller/test/formulary/sources.test.ts`, run in the controller's unit job on every PR):
1. Every number in a data file sits in an object that has a `src` (or the object is marked `gap` with an `LQ` id), and
   every `src` resolves in `sources.json`.
2. Each source entry has its kind's required fields (above); a `trissel` entry without edition and page, a
   `stabilis` entry without id and date, a `monograph` without product, holder and version fail.
3. Every `compat`, `admixtures` and `stability` statement has its `src` (Stabilis, else Trissel where Stabilis has no
   statement for it, judged per statement: brief 127) and a `crossCheck.trissel` (`agrees`, `differs` or `not listed`); `differs` requires a `ruling` (who, date,
   which source the entry follows). Every file has `has` with its three flags, and the flags match the sources the
   file actually cites.
4. No `gap` without an owner question id from §10, and the bench refuses a gap where the field is required to deliver
   (a concentration); it accepts a gap in preparation time (ready at once, the Debrief says "no source for the
   preparation time").
5. Coverage: `files ∪ pending.json = the 61 injectable DRUG_IDS` and `files ∩ pending = ∅`; the bench offers only
   drugs with a file; `pending.json` may only shrink (the last batch, F3, asserts it empty). A drug added to the
   library without a file and not in `pending` fails the build.
6. Statements are short (≤ 200 characters) [ENG: test; keeps an entry a paraphrase, never a copied monograph], and
   no file under `packages/` is a PDF or holds text extracted from the Trissel PDF (a size and type check on the
   formulary folder).

What CI cannot prove is that an entry says what its source says. That is the **second reading**: every entry is read
against its sources by a second executor before its batch merges, and the PR lists each entry with the reader's
"agrees" or the difference (hours in §9.1).

## 6. The scenario format: what `/2` needs added (piece L5)

All additive; `pme-scenario/2` documents stay valid; the runner state gains optional fields (restore of an older
state keeps working).
- `Administration.source` gains `'learner'`; `Administration` gains `by?: string` (the device key),
  `replaced?: { rate; rateUnit; by }` (an infusion change: the rate it replaced and who had set it, LQ4) and
  `prep?: { id; drugId; productId; diluent?; concentration: {amount, unit, perMl}; volumeMl; findings: Finding[];
  notice: { shownAt: number } | null; remaining: number; activeAmount; unit }` (`notice`: whether the instructor had
  shown the incompatibility notice before the Give, and when, LQ3) (`types-v2.ts:169–190`). `administrationOf` (`driver.ts:573–576`) maps
  `issuedBy: 'learner'` to `learner` and copies `prepId`'s record.
- `DrugCriteria.diluent?: { set: string[] }` (`types-v2.ts:60–70`): a deviation line "diluent saline, water asked"
  (`grade.ts` `deviations`) when a card asks for one. No shipped card gains it (LQ14 ruled, A); it is there for
  authors.
- Formulary findings independent of any card: `Grades.preparations: Array<{ prepId; t; by; drugId; findings;
  delivered: boolean; grade: 'ok' | 'deviation' | 'violation' }>` and `Violation.source?: 'card' | 'formulary'`
  (`grade.ts:63–66`). The rule: a staged preparation whose diluent the monograph does not list (D5) is a
  **deviation**; the same preparation **delivered** (any volume) is a **violation**, `harm: 'modelled'` when the
  source's figures reduced the active amount, else `'not modelled'` with the consequence text (§7.3). An admixture
  the source calls incompatible follows the same two steps.
- `Action.sample?: { panel: string[] }` for `kind: 'sample'`: a learner's (or instructor's) `applyEvent lab` with a
  listed panel satisfies the card's sample action in its window, as a drug satisfies a drug action; a sample action
  without `sample` stays recorded-by-taking as today (`driver.ts:557`).
- `pme-scenario-2.schema.json` (`packages/controller/scenarios/`) gains the two optional fields; the authoring guide
  gains one paragraph each.

## 7. The physiology of a wrong preparation, under the mechanisms-first rule

### 7.1 The mechanism: the active amount that reaches the patient

The engine already turns an amount of drug into concentrations and effects; what a preparation changes is the
**amount of active drug in what is pushed or pumped**. The mechanism is physical and lives entirely before the engine:

`active amount = volume delivered × nominal concentration × r(age)`

where `r(age)` is the fraction of the drug still in solution and intact at the preparation's age, read from the
source's own stability points for that drug, diluent, container and temperature, **interpolated linearly between the
source's measured points and never extrapolated** (no kinetic model is assumed where the source reports
measurements; first-order kinetics are used only where the source itself states a rate constant or t90). Precipitate,
degradation and adsorption to the container (insulin and nitroglycerin to PVC are the classic, quantified cases in
the stability literature) all enter through `r`.

- **Bolus** (`prep deliver`): the host computes `r` at the delivery tick and sends the active amount as the dose (D3).
  The record keeps both the prepared and the active amount, so the Debrief can show the difference.
- **Infusion** (`prep infuse`): the concentration in the syringe falls with age while the pump runs. If any entry
  gives a loss that matters inside a case's time frame, the engine needs the curve (piece **L12**, conditional): the
  `infusion` event gains an optional `potency: { preparedAtS, points: [[ageS, r]] }` and the drug model multiplies the
  delivered rate by `r(t − preparedAtS)` each tick. L12 is built only if the formulary census of FS–F3 finds at least
  one drug whose source gives a loss above its own measurement uncertainty within 4 h [ENG: scenario; the longest
  showcase card runs under 1 h; 4 h covers a long case] in a preparation a learner can make; otherwise the infusion's
  concentration is fixed at its value at start and the plan says so.

### 7.2 Where the source gives no quantity: the gaps, named

| Statement in the source | What the engine does | Gap |
|---|---|---|
| A measured loss at stated times ("x % at t h, 25 °C, in D5W, PVC bag") | `r` from those points | none |
| "Stable": ≥ 90 % retained for T h | within T: LQ9 (1.0, or the 0.9 bound); beyond T: no figure | LQ9 |
| Physical incompatibility (haze, precipitate, gas) with no quantity | LQ8 (nominal amount and "loss not modelled", or none delivered) | LQ8 |
| A diluent the monograph does not list, with no stability data in Trissel or Stabilis | the nominal amount; graded deviation/violation (D5); "loss not known" | LQ8 |
| Beyond the last measured point | no extrapolation: the last point's `r`, flagged "beyond the source's data" in the record | LQ9 |
| No preparation time in any source | ready at once; the Debrief says "no source for the preparation time" | LQ7 |

### 7.3 Particulate harm: a consequence named in the Debrief

When an incompatible preparation is delivered, the Debrief's preparations section prints the finding, the source and
its consequence in words: what the precipitate is and what infused particulate can do, from a cited source (the
consequence text is part of the formulary entry, `consequence: {text, src}`). It never changes a vital sign. If the
patient deteriorates in the case, that is the engine's response to the active amount and everything else, not to
particles. The instructor decides at staging (LQ3); the Debrief records the decision and its time.

## 8. Global constraints, review focus

**Every piece:** `00-common-rules.md` applies (own worktree under `scratch/`, one PR per piece, draft until its
checks pass, `npx -y pnpm@9.15.9`, the executor's port range, no owner identifier, no closing keyword before a
`#number`, identity through `GIT_AUTHOR_*` / `GIT_COMMITTER_*`, never re-run a job with a failed test). Tests first.
**Must not touch (every piece unless the piece names it):** `packages/engine-core` (L10a–L10d and L12 only, each with the
validation workflow), `packages/skins`, the showcase cards (`apps/demo/src/app/showcase`; LQ14), `viewer-sync.ts`,
the relay's `defib` path and `LEARNER_DEFIB_COMMANDS`, what any Instructor press sends, the drug lock's rule and its
10 s, `INSTRUCTOR_COMMANDS` (except L9's `prep notice`).
**Common gate (before every push):** as `room-and-instruments.md` §5 (install, typecheck, the touched package's tests,
model docs and known misses regenerated, `it.fails` count unchanged), plus `node scripts/ci/markers.mjs`, plus the
formulary source test once L1 is in.

Review focus, for each piece's reviewer:
1. **A number without a source**, in data or code. Every clinical number traces to `sources.json`; every `[ENG]`
   marker is a non-clinical kind (`network`, `ui`, `test`, `scenario`).
2. **The device trusted.** The host recomputes every preparation; a forged concentration, fraction, finding or `by`
   on the wire changes nothing (a hostile-transport test in L3 and L4).
3. **A learner gains a shape.** The relay and host refuse every shape of §4 D2's complement; learners' and viewers'
   frames are byte-identical before and after (as `relay-classroom.test.ts` checks).
4. **Truth leaks.** The lab view never renders `labs`; a preparation's findings never reach another learner.
5. **A fitted effect.** The delivered amount equals `volume × concentration × r` with `r` from the entry's points; a
   test pins it against the entry, not against a desired clinical response.

---

## 9. Pieces

Sizes are plan hours (est.), human-equivalent focused hours as in the Room plan. Each piece is one PR against `main`.

### L0: Baseline (2 h)
**Depends on:** nothing. **Files:** new `packages/controller/test/session/learner-baseline.test.ts`,
`apps/demo/src/app/views/learner-baseline.dom.test.ts` (tests only). **Tests first (they pin today):** a viewer's
`applyEvent drug` is refused by the host and the relay; a `defib` socket's `applyEvent drug` and `applyEvent lab` are
refused; `applyEvent lab abg` applied on a host gives a `labResult` on a follower at the same tick 120 s later (pins
D6 before L10a changes the number); a `/2` sample action is recorded only by its taking; the drug library has 61
injectable ids (the formulary's coverage target). **Acceptance:** pass on main. **Must not touch:** any source file.
**Gate:** common, `@pme/controller`, `@pme/demo`. **CI:** 1 run.

### L1: The formulary schema, loader and the source check (6 h)
**Depends on:** nothing. **Files:** new `packages/controller/formulary/` (`schema.json`, `sources.json` empty,
`pending.json` = the 61 ids, `diluents/`), `packages/controller/src/formulary/{types,load}.ts`, export from
`src/index.ts`; `packages/controller/test/formulary/sources.test.ts` (§5's six rules); `docs/guides/formulary.md`
(how to write an entry; which source answers what; copyright rule). **Tests first:** each rule fails on a fixture
built to break it (a bare number, an unresolved `src`, a Trissel entry without edition, a statement without
`crossCheck`, a `differs` without `ruling`, a gap without an LQ id, a drug neither filed nor pending). **Acceptance:**
the check passes on the empty layer; the guide is linked from `docs/guides/scenario-authoring.md`. **Must not touch:**
the engine, the app. **Gate:** common, `@pme/controller`; the guide is a release doc, so the docs-honesty test runs.
**CI:** 1 run (the docs-reader list in `scripts/ci/docs-tests.mjs` gains the source test if it reads `docs/`; it
should not: the data is under `packages/`).

### L2: The preparation core, pure (6 h)
**Depends on:** L1. **Files:** `packages/controller/src/formulary/{prepare,remaining,findings}.ts` and tests.
**Tests first:** `prepare` gives concentration from strength, reconstitution and dilution volumes; refuses a product
not in the drug's file; reports `wrongDiluent` per D5, `incompatible` for a listed incompatible diluent or admixture,
`notTested` where the source has no statement; the ready time = `simT` + the entry's preparation time, or `simT` with
`gap`; `remaining(entry, diluent, container, tempC, ageS)` interpolates the source's points, never extrapolates, gives
1 at age 0 and the last point's value with `beyondData: true` past it; LQ8 and LQ9's options are one switch each,
defaulting to the plan's defaults until ruled. Fixture entries are test-only files, marked so, never shipped.
**Acceptance:** 100 % branch coverage of the three files [ENG: test]. **Must not touch:** anything outside the folder.
**Gate:** common, `@pme/controller`. **CI:** 1 run.

### FS: Formulary batch S, the showcase drugs and the diluents (32.2 h with second readings)
**Depends on:** L1. LQ5 and LQ6 are ruled (Stabilis primary, Trissel 2013 in the workspace library, public labels). **Files:** 14 drug files and the
diluent files (0.9 % sodium chloride, 5 % dextrose, sterile water for injection, Ringer's lactate, and any the 14
monographs name), `sources.json`, `pending.json` shrunk by 14; the second reader's table in the PR. The 14 are the
drugs the showcase cards give (`grep drugId apps/demo/src/app/showcase/*.json`): epinephrine, propofol, dantrolene,
rocuronium, midazolam, fentanyl, tranexamic acid, succinylcholine, sodium bicarbonate, salbutamol, insulin with
dextrose, calcium chloride, phenylephrine, ephedrine. **Acceptance:** the source check passes; every entry has a
second reading; every Trissel `differs` has a ruling from the orchestrator or the owner; every entry's `has` flags are
in the PR's table. **Gate:** common,
`@pme/controller`. **CI:** 1 run.

### L3: The `learner` role: hello with the learner PIN, guard, relay allow-list (7 h; 5 h before LQ1's PIN)
**Depends on:** nothing (R5c's files, after R5d merges to avoid rebasing over it). **Files:** `protocol.ts` (`Role`
gains `'learner'`; the hello's `pin` legal with `learner` too; `LEARNER_COMMANDS`; `learnerMay(c)`; the `prep` and
`infusion set` command types; `lab` in `ClinicalEvent` is L10a's), `guard.ts` (`ROLES`, `SHOWS_WITH`, the bodies'
shapes), `relay/server.ts` (the classroom rule admits `learner` from another device, counted under `--max-peers`,
PENDING until the host's `grant` as an instructor is, under the same per-address wrong-PIN limits, D9; a pending
learner's command is `forbidden`; a granted one's commands pass `learnerMay` or get `forbidden`; 6 a second;
the host's `prep` events routed to the one learner socket they name, like an ack), `relay/README.md`; tests in
`test/guard.test.ts`, new `test/relay/relay-learner.test.ts`, `relay-hostile.test.ts`. **Tests first:** a learner hello without a PIN is
refused; a pending learner cannot command; after the host's grant the relay forwards exactly §4 D2's shapes and
refuses each of: `applyEvent drug` (raw), `applyEvent infusion` (raw),
`applyEvent defib charge` (that is the `defib` role's), `time pause`, `scenario goto`, `setRhythm`, `device`, `note`,
`pin`, a `prep deliver` with `atTick`, a `prep stage` with a `concentration` field, a hello as another role on the
same socket; a viewer and a `defib` socket are unchanged; learners' and viewers' frames byte-identical; a `prep`
event reaches only its learner. **Acceptance:** every relay and guard test passes unchanged besides the new ones.
**Must not touch:** `host-session.ts`, the app. **Gate:** common, `@pme/controller`, plus `check-relay.mjs` with one
step (a learner's `prep stage` reaches the host; its raw `applyEvent drug` does not). **CI:** 1 run.

### L5: The `/2` format additions (6 h)
**Depends on:** L2 (the `Finding` type). **Files:** `scenario/types-v2.ts`, `driver.ts` (`administrationOf`),
`grade.ts`, `validate.ts`, `pme-scenario-2.schema.json`, `docs/guides/scenario-authoring.md`; tests beside each.
**Tests first:** §6, each line a case: a learner's give is `source: 'learner'` with `by`; a card's `diluent` criterion
gives the deviation line; a staged wrong-diluent preparation not delivered is a `preparations` deviation; delivered it
is a `formulary` violation with `harm` per §6; a learner's `lab abg` satisfies a card's sample action with `sample:
{panel: ['abg']}` in its window; an old runner state restores. **Acceptance:** every showcase card grades exactly as
before (the MH and haemorrhage `/2` slow tests unchanged). **Must not touch:** the cards. **Gate:** common,
`@pme/controller`, `@pme/demo`. **CI:** 1 run.

### L4: The host grants on the learner PIN, applies a learner's commands; the record says who (9 h; 8 h before LQ1, LQ4)
**Depends on:** L3, L2, L5, R5d merged (same branch point in `host-session.ts`, same `by` and `RowKind 'learner'`).
**Files:** `host-session.ts` (`HostSessionOptions.learnerPin`; P3's `verify` extended to the `learner` role with the
learner PIN, D9; the `learner` branch beside R5d's `defib` branch: `learnerMay` again on the host, the preparations
table, D3's translation into `command()`, `infusion set` on any running infusion with the replaced rate, the `prep`
events of D7), `apps/demo/src/app/session.ts` and `store.ts` (`pme.learnerPin`, drawn once, a new one on request), `drug-lock.ts` (`GivenBy` gains
`learner`, "from a learner's remote"), `apps/demo/src/app/record.ts` (the `learner` row carries `prepId`), tests in
new `test/session/host-learner.test.ts`, `host-drug-lock.test.ts`. **Tests first:** a learner's `prep stage` then
`prep deliver` lands as an `applyEvent drug` with the active amount, `issuedBy: 'learner'`, `by` = the device; a forged
field on `prep stage` (a concentration, a finding) is refused; a second bolus of the same drug within 10 s from the
learner or from the laptop is refused `recent` with the right "from"; a tray of three preparations delivered in one
`stageGroup` applies in one dispatch and meets the lock item by item (#337's test, extended); **the learner PIN grants `learner` only, and
the instructor's PIN does not grant `learner` (nor the learner PIN `instructor`); a new learner PIN revokes every
granted remote;** `prep infuse` starts an infusion with the preparation's concentration; `infusion set` from ANY
remote changes or stops an infusion the instructor or another remote started, keeping its concentration, and the
record holds the device and the rate replaced (LQ4); a delivery before the ready time is refused "not ready yet (m:ss)"; a
preparation's `prep` event reaches the instructor and its own device only. **Acceptance:** P3's, R5d's and the
census tests pass unchanged. **Must not touch:** the engine, `INSTRUCTOR_COMMANDS`. **Gate:** common,
`@pme/controller`, `@pme/demo`. **CI:** 1 run.

### L6: The remote's page with its learner-PIN form, the picker card, the learner PIN on Room setup (8 h; 6 h before LQ1)
**Depends on:** L3. **Files:** `classroom.ts` (`#/remote/learner` in `instrumentOf`, `hashOf`), `main.ts` (the
follower branch mounts the remote), new `apps/demo/src/app/views/learner-remote.ts` (the learner-PIN form, reusing
P7's keypad and state words with "learner PIN" in them; then the follower monitor strip, the three tabs, the
connection line), `views/room.ts` (the learner PIN beside the instructor's, behind press-and-hold, with "New learner
PIN", D9), `join.ts` (a card "Learner remote": "Give drugs and infusions, send samples and read
their results from this phone. Everything you give is recorded under this phone's name." [the owner rules the
words]), `app.css`; tests `learner-remote.dom.test.ts`, `join.dom.test.ts`, `classroom.test.ts`. **Tests first:** the
card's words equal one literal; its action opens `#/remote/learner`; the PIN form comes first, the PIN is never in the
address or the store of the phone; a wrong learner PIN and too many tries say so in words; the page says hello as
`learner` with its device key and the PIN; the monitor follows; "Change" returns to `#/pick`; the three tabs are 44 px targets [ENG: ui]. **Must not
touch:** what `remote.ts` (the instructor's) sends; `views/room.ts` beyond the learner-PIN panel and the row label. **Gate:** common, `@pme/demo`, plus
`mobile-learner.e2e.ts` on both projects. **CI:** 1 run.

### L7: The drugs menu with the bench (9 h)
**Depends on:** L6, L4, FS merged. **Files:** new `apps/demo/src/app/remote/{bench,tray}.ts` and tests, the e2e
`apps/demo/e2e/learner-remote.e2e.ts`. **The flow:** search a drug (the library's names, `drugs.ts`) → its products
from the formulary (vial strength, form) → the diluent and the volume (the monograph's listed diluents first; any
other diluent offered too, because choosing it is the learner's act that the format grades) → the bench shows the
concentration, the preparation time (a countdown on the case clock, or "no source", LQ7 ruled) → "Put on the tray"
(`prep stage`) → the tray lists preparations with their state (preparing, ready; when the instructor shows the
incompatibility notice, the remote plays its sound once and the preparation shows the finding with its source, LQ3) →
"Give" one (`prep deliver`, volume or all, route, over s) or "Deliver the tray" (one `stageGroup`). The concentration
shown is the HOST's, from its `prep` event; the device's own computation is only a preview, labelled so until the
host answers. **Tests first:** dom: each step's words; the tray's states from scripted `prep` events; a refusal
shows the host's words ("given 4 s ago from the laptop", "not ready yet"). e2e (in-process relay, phone viewport):
the MH card, a learner prepares dantrolene in the listed diluent and gives it, the record row says the phone's name;
a second learner phone cannot see the first's tray; with an
incompatible admixture, the notice's sound plays only after the instructor's press, and a Give before it is given. **Must not touch:** the laptop's Drug sheet. **Gate:** common,
`@pme/demo`, the new e2e 3 of 3 on chromium and webkit. **CI:** 1 run.

### L8: The infusions menu (7 h; 6 h before LQ4)
**Depends on:** L7. **Files:** `apps/demo/src/app/remote/infusions.ts` and test; e2e cases. **The flow:** from a ready
preparation, start at a rate in mL/h (the dose rate shown beside it, from the host's concentration and the patient's
weight); every running infusion listed from the engine's state, whoever started it, each with Change and Stop (D8,
LQ4 ruled), and a line "set by <device or the instructor> at mm:ss".
**Tests first:** starting sends `prep infuse`; changing and stopping send `infusion set`, on the instructor's infusion
and another remote's alike; the record row says the device and the rate replaced; the dose-rate line equals the
host's arithmetic. **Gate:** common, `@pme/demo`, the e2e. **CI:**
1 run.

### L9: The instructor sees the staging and can show the incompatibility notice, on the laptop and the phone (9 h; 7 h before LQ3)
**Depends on:** L4, L7. **Files:** `apps/demo/src/app/teach2/learner-preps.ts` (a dock card), `teach2/header.ts` (a
count), the same card in the instructor phone's panel (`views/remote.ts` mounts it; P7's phone), the notice command
(an instructor-only `prep notice {by, id}`, added to `INSTRUCTOR_COMMANDS` because the laptop and the phone send it:
the census test gains it), `host-session.ts` (records the notice's time, sends `prep notice` to the device), the
remote's notice sound (a short tone from the app's own audio, no file), tests, e2e cases. **The UI (LQ3 ruled):**
when a learner stages a preparation with a finding, the laptop's dock and the instructor's phone show a card at once:
"**Bed 2 remote staged** sodium bicarbonate 8.4 % 50 mL + calcium chloride 10 % 10 mL, one syringe ·
**Incompatible**: <the entry's statement> (Stabilis <id>; Trissel 2013 p. <n> agrees)" and ONE control: **Show the
incompatibility notice to the learner**. Pressed, the remote sounds the notice, as an aide raising a concern in the
real room, and shows the finding inside the preparation; the card then reads "Notice shown at mm:ss". There is no
let-stand and no remove: the preparation stays the learner's. If the learner gives it before the press, it is given,
and the card and the record say "given at mm:ss, notice not shown" (or "notice shown at mm:ss"). The card also lists
clean preparations, collapsed ("3 preparations, no finding"). **Tests first:** the card appears within one host tick
of staging on the laptop and on the instructor's phone; the press reaches the remote once, from either; the record
keeps the notice's time and, on a Give, whether it had been shown; the Debrief reads it (L13). **Gate:** common,
`@pme/controller`, `@pme/demo`; census test updated. **CI:** 1 run.

### L10a: The analyser rows, the panels and their sourced turnarounds, in the engine (6 h; validation workflow)
**Depends on:** nothing (LQ2 ruled). **Engine change ruled by the owner (LQ2).** **Files:** new
`packages/engine-core/src/l2/blood/analysers.ts`: one data row per analyser, the first the **Radiometer ABL800**, with
its measured analyte list and its specification-sheet analysis time, each with its source (the manufacturer's
specification sheet, document number and date); another device later is another row, and the room's analyser is a
setting (default the ABL800); a **laboratory** row: the chemistry panel's analytes and its turnaround from Hawkins
(Clin Biochem Rev 2007;28:179–94; the figure and page the executor reads), replaced by the owner's laboratory figure
when it is given; `labs.ts` (`LAB_TURNAROUND_S`, today `[ENG: device]`, removed: the gas panel's turnaround is the
analyser row's, sourced; the chemistry panel's the laboratory row's; the INR's the laboratory row's coagulation
figure), `types-blood.ts` (`panel: 'abg' | 'vbg' | 'chem' | 'coag'`), `pipeline.ts:324–326` (validation),
`protocol.ts` (`lab` in `ClinicalEvent`), model docs regenerated. **The panels:** the gas panel returns exactly the
ABL800 row's analytes that the engine computes (gas, co-oximetry, electrolytes, lactate, glucose, Hb); `chem`
returns electrolytes now, and creatinine and CK when L10b and L10d land; `coag` returns INR now, and the coagulation
tests and fibrinogen when L10c lands. An analyte the engine does not compute yet is not in the panel (never a blank
or a made-up value). Any time the result needs beyond the analyser's (the walk to it) has no source and is not added;
the Labs views say "analyser time only". **Tests first:** each panel returns after its row's turnaround; a panel
returns only its analytes; `turnaroundS` from a card still overrides within 30–3600 s; snapshot and restore keep
pending samples; no `[ENG]` marker remains on a turnaround. **Acceptance:** validation suites and showcase goldens
unchanged (no card draws a sample today). **Gate:** common, `@pme/engine-core`, `@pme/validation`, plus the
validation workflow (`run-validation` label). **CI:** 1 run + the validation workflow.

### L10b: Creatinine from the kidney's own filtration (6 h; validation workflow)
**Depends on:** L10a. **The mechanism:** plasma creatinine follows its production (from muscle mass, the patient's
size and sex) and its clearance (the GFR the renal model computes, `types-organs.ts:44`) through a one-compartment
mass balance in total body water; the baseline is the steady state, and an acute fall in GFR raises creatinine with
the true kinetic lag (hours), so a short case shows little change, which is the physiology. Sources to read first: a
creatinine-kinetics paper (the executor starts from Waikar and Bonventre's creatinine-kinetics framework, JASN 2009,
and a production-rate source such as the Cockcroft–Gault derivation), the figures cited beside each number.
**Tests first:** steady state equals production ÷ GFR; a halved GFR rises toward double at the sourced time
constant; the `chem` panel gains `creatinine`. **Gate:** common, `@pme/engine-core`, the validation workflow. **CI:**
1 run + validation.

### L10c: Coagulation and fibrinogen (12 h; validation workflow; may need its own plan)
**Depends on:** L10a. **The mechanism:** clotting factor and fibrinogen levels as amounts in the plasma, diluted by
crystalloid and colloid, lost with bleeding, replaced by FFP, cryoprecipitate-equivalent and whole blood (the blood
model already moves volumes and products, `types-blood.ts:9–10`), consumed by a sourced rate where a condition
consumes them; PT/INR and aPTT from the factor levels by a sourced relation; the platelet count by the same
dilution and loss; the liver's own INR term (`types-organs.ts:48`) joined to it, not duplicated. Sources: the
dilutional-coagulopathy and massive-transfusion literature (the executor names them before code; a figure without
a source stops the piece). The `coag` panel gains PT/INR, aPTT, fibrinogen and platelets. **This is the largest
lab piece; if its sources do not support the whole relation, the executor stops and reports, and it becomes an
engine plan of its own.** **Gate:** common, `@pme/engine-core`, the validation workflow. **CI:** 1 run + validation.

### L10d: CK from muscle injury (4 h; validation workflow)
**Depends on:** L10a; the muscle-injury mechanism of E134 (PR #154, `fix-e134-anaerobic-k`, open at the time of
writing). **The mechanism:** CK released by the injured muscle mass E134 computes, distributed and cleared with
sourced kinetics (rise over hours). **Tests first:** no injury, the baseline; the MH course raises CK on the sourced
time scale. The `chem` panel gains `ck`. **Gate:** common, `@pme/engine-core`, the validation workflow. **CI:** 1 run +
validation.

### L11: The lab view on the remote (6 h)
**Depends on:** L6, L3, L10a. **Files:** `apps/demo/src/app/remote/labs.ts` and test; `packages/renderer/src/lab-panel.ts`
(rows for the chemistry and coagulation analytes as they land, each range with its source); e2e cases. **The flow:**
"Send" a gas, chemistry or coagulation sample (`applyEvent lab`) → a pending row "Blood gas drawn 12:04, result
expected 12:0x (ABL800, analyser time only)" (the panel's turnaround, from the engine's rows) → the result, from the
device's own engine's `labResult`, shown by `mountLabPanel`, flagged against its ranges, critical values marked from
the hospital's list when given, else the Kost list (O15, LQ2 ruled). Earlier results stay listed by draw time.
**Tests first:** the view never renders a `labs` event (a test feeds both and checks); the result appears at the tick
its `labResult` arrives; a result of another device's or the instructor's sample is not shown (LQ13 ruled, B). **Gate:** common,
`@pme/demo`, the e2e. **CI:** 1 run.

### L12: An infusion's potency over time, in the engine (6 h; conditional; validation workflow)
**Depends on:** FS, F1, F2, F3's census (§7.1's condition), L4. **Files:** `types-pk.ts` (`infusion.potency?`),
`pk/pipeline.ts` (the rate × `r(t − preparedAtS)` each tick, linear between the given points), tests, model docs.
**Tests first:** without `potency` every PK test is unchanged; with it the delivered amount over an hour equals the
integral of the given curve to 0.1 % [ENG: numerics]; snapshot and restore keep it. **Acceptance:** validation suites
unchanged. **Gate:** common, `@pme/engine-core`, the validation workflow. **CI:** 1 run + validation. **If the census
finds no qualifying drug, L12 is not built and §7.1 says so in the docs.**

### L13: The Debrief: who gave what, the preparations, the notice, the consequences (5 h)
**Depends on:** L5, L9, L8; the Debrief 2 record (merged). **Files:** `apps/demo/src/app/views/debrief*.ts` (the who
line for `learner` rows, from R7's remembered names; a "Preparations" section on page 2: each preparation, its
findings with sources, whether the incompatibility notice was shown and when, delivered or not (and whether before
or after the notice), the prepared and the active amount, the
consequence text of §7.3), `debrief.e2e.ts` additions. **Tests first:** "Dantrolene 2.5 mg/kg at 04:12, by Remote
(bed 2)"-style lines from the record; an infusion change reads "Norepinephrine 4 → 8 mL/h at 06:30, by Remote (bed 3),
replacing the instructor's rate"; the section's rows from a scripted run; nothing printed for a run with no
learner remote. **Gate:** common, `@pme/demo`, `debrief.e2e.ts` on both projects. **CI:** 1 run.

### F1, F2, F3: Formulary batches for the rest of the library (30 h, 32.5 h, 20.5 h, plus second readings)
**Depends on:** L1, FS (the conventions settled on the first 14). Each one PR, as FS. Contents in §9.1. F3 empties
`pending.json`. They run beside the code pieces and do not block L4–L11.

### L15: The laptop's Labs view (4 h)
**Depends on:** L10a, L11 (the shared rows). **LQ13 ruled, B: the laptop sees every result.** **Files:** new
`apps/demo/src/app/teach2/labs-sheet.ts` (a small sheet in Instructor v2 listing every `labResult` of the host's
engine by draw time, with who drew it, the remote's name or "Instructor", each shown by `mountLabPanel`), its dom
test. It has no draw button (the instructor's sample button is not ruled). **Tests first:** every result appears, the
learner's and the card's alike; the 1 Hz `labs` truth is never shown. **Gate:** common, `@pme/demo`. **CI:** 1 run.

### L14: Kit, docs and the end-to-end measurement (5 h, last)
**Depends on:** everything above that is built. **Files:** `docs/showcase/CLASSROOM.md` (the remote in the run
sheet), the kit launcher's text, `CHANGELOG` fragment, the roadmap row, `apps/demo/e2e/learner-remote-room.e2e.ts`
(two learner remotes, a learner monitor, the instructor phone and the laptop on the in-process relay through the MH
card). **Measure (in the PR):** the press-to-applied time from a phone over the kit relay on Wi-Fi, median and p95,
on the owner's smoke; in CI only loopback. **Gate:** common, plus the new e2e 3 of 3 on both engines. **CI:** 1 run.

### 9.1 The formulary, sized per drug

Classes: **A** a ready-to-use bolus, one product, few diluents (1.0 h); **B** a reconstituted or diluted bolus, or
two components (1.5 h); **C** an infusion drug, several concentrations, diluents and containers, stability figures
that matter (2.5 h). Plus a second reading of 0.3 h per entry. The class is the planner's estimate from the drug's
usual preparation; the executor re-classes a drug when its sources show otherwise and says so in the PR.

| Batch | Drugs (class) | Entries | Hours (+ second reading) |
|---|---|---|---|
| **FS** showcase | epinephrine C, propofol C, midazolam C, fentanyl C, salbutamol C, phenylephrine C; dantrolene B, rocuronium B, tranexamic acid B, insulin with dextrose B, ephedrine B; succinylcholine A, sodium bicarbonate A, calcium chloride A; + the diluents (0.5 h each, ≈ 5) | 14 + diluents | 25.5 + 2.5 (+ 4.2) = **32.2** |
| **F1** anaesthesia and neuromuscular | ketamine C, dexmedetomidine C, remifentanil C, sufentanil C, morphine C, cisatracurium C, atracurium C; thiopental B, vecuronium B, mivacurium B, glycopyrrolate B, naloxone B; etomidate A, sugammadex A, neostigmine A, atropine A, flumazenil A | 17 | 30 (+ 5.1) = **35.1** |
| **F2** cardiovascular | norepinephrine C, vasopressin C, dobutamine C, milrinone C, dopamine C, nitroglycerin C, nitroprusside C, esmolol C, amiodarone C, procainamide C; hydralazine B, labetalol B, glucagon B; metoprolol A, verapamil A, adenosine A | 16 | 32.5 (+ 4.8) = **37.3** |
| **F3** electrolytes, metabolic, local anaesthetics, others | potassium chloride C, insulin C, lidocaine C; calcium gluconate B, magnesium B, dextrose B, furosemide B; mannitol A, hypertonic saline A, bupivacaine A, ropivacaine A, lipid emulsion A, ondansetron A, dexamethasone A | 14 | 20.5 (+ 4.2) = **24.7** |
| **All** | 61 drugs (26 C, 17 B, 18 A) + diluents | 61 + ≈ 5 | 108.5 + 2.5 + 18.3 = **129.3** |

Order: showcase first (FS) is ORDER, not scope: the stage is not done until F3 empties `pending.json`. Within F1–F3
the order may follow the cards the owner writes next. The formulary hours are reading hours against paid and open
sources; this week's code-piece ratio (plan h ÷ 6 to ÷ 8, `debrief-2-option-c.md` §8) has not been measured for
source extraction and is not applied to them.

### 9.2 Partition, critical path, merge order, CI load

```
L0
L1 ─┬─► L2 ─► L5 ─┐
    │             ├─► L4 ─┬─► L7 ─► L8
    │   L3 ───────┘       │    └──► L9 ─► L13 ─┐
    ├─► FS ──────────────►┘(L7 waits on FS)    │
    │    └─► F1 ─► F2 ─► F3 ─► [census] ─► L12 ┤
    │                                          ├─► L14
    │   L3 ─► L6 ─► L7                         │
    │   L10a ─┬─► L11 ─► L15 ──────────────────┤
    │         ├─► L10b ────────────────────────┤
    │         ├─► L10c ────────────────────────┤
    │  [E134] └─► L10d ────────────────────────┘
[R5d merged] ─► L3, L4
```

- **Critical path to a usable remote (showcase drugs):** L1 (6) → FS (32.2) → L7 (9) → L9 (9) → L13 (5) → L14 (5) =
  **66.2 h**, bound by the formulary; LQ5 and LQ6 are ruled, so FS can start as soon as L1 merges. The code path L1 →
  L2 → L5 → L4 reaches L7's start after 27 h, inside FS's span (38.2 h from the start), so the code does not set the
  pace. The lab chain L10a → L10c (18 h) runs beside it.
- **To the stage's end (the whole library):** the formulary chain L1 → FS → F1 → F2 → F3 is **135.3 h** with one
  source-holding executor; with two readers holding access, FS then {F1 ∥ F2} then F3 is ≈ 100 h. Then L12 (if built)
  and L14.
- **Parallelism:** {L0, L1, L3, L10a} first; then {L2, FS, L6, L10b}; then {L5, F1, L10c}; then {L4, L10d once E134
  is in}; then {L7, L11, F2}; then {L8, L9, L15, F3}; then {L12?, L13}; L14 last. At most three code executors (of which
  at most one on the engine, which serialises the validation workflow) and one or two formulary readers.
- **Merge order:** L0, L1, L3, L10a, L2, L6, FS, L5, L10b, L4, F1, L7, L11, L15, L8, L9, L10c, L10d, F2, F3, L12 (if),
  L13, L14. The engine pieces (L10a–L10d, L12) each regenerate the model docs and so conflict with any other engine
  PR in flight: merge them one at a time, nothing else on the engine in between. L3 and L4 touch
  the relay and `host-session.ts` after R5d; L4 and L9 both touch `host-session.ts` (L9 rebases on L4); L5 and L13
  touch the record and the Debrief, which the Debrief 2 PRs also change (the later rebases); L7, L8, L11 share
  `remote/` (each rebases on the one before).
- **CI load:** 23 PRs (19 code, 4 formulary), one full CI run each (median ≈ 409 runner-minutes and 61 min wall per
  PR run, `research/42-ci-and-process-review.md` §1.2), plus re-merge runs (≈ 1 in 2 that week). Formulary PRs touch
  only `packages/controller/formulary/` and its test: code = true, engine = false, so the engine's slow groups skip
  (`ci.yml:30–31`). **L10a, L10b, L10c, L10d and L12 run the validation workflow** (the `run-validation` label,
  `validation.yml:13–18`); no other piece touches the engine. New e2e files: `learner-remote.e2e.ts`, `learner-remote-room.e2e.ts`; new cases
  in `mobile-learner.e2e.ts` and `debrief.e2e.ts`; no new CI job.

**Effort**

| Piece | h (est.) |
|---|---|
| L0 baseline | 2 |
| L1 formulary schema, loader, source check, guide | 6 |
| L2 preparation core (pure) | 6 |
| L3 `learner` role with the learner PIN, guard, relay allow-list | 7 |
| L4 host grants on the learner PIN, applies; record `by`; lock and staged delivery reused; any infusion | 9 |
| L5 `/2` format additions | 6 |
| L6 remote page with its PIN form, picker card, learner PIN on Room setup | 8 |
| L7 drugs menu with the bench | 9 |
| L8 infusions menu (any infusion) | 7 |
| L9 instructor's staging card and the notice, laptop and phone | 9 |
| L10a analyser rows (ABL800, laboratory), panels, sourced turnarounds (engine) | 6 |
| L10b creatinine from filtration (engine) | 6 |
| L10c coagulation and fibrinogen (engine; may become its own plan) | 12 |
| L10d CK from muscle injury (engine; after E134) | 4 |
| L11 lab view on the remote | 6 |
| L12 infusion potency over time (engine, conditional) | 6 |
| L13 Debrief: who, preparations, consequences | 5 |
| L15 the laptop's Labs view | 4 |
| L14 kit, docs, end-to-end | 5 |
| **Code subtotal** | **123** (117 without L12) |
| FS, F1, F2, F3 formulary (incl. second readings) | 129.3 |
| **Total** | **≈ 252 h** in 23 PRs (22 without L12), plus review (≈ 217 h in 19 PRs before the rulings of 9 November: LQ1 +5 h in L3, L4 and L6; LQ2 +23 h in L10a–L10d; LQ3 +2 h in L9; LQ4 +1 h in L8; LQ13 +4 h, L15) |

### 9.3 Dependencies out of this plan

- **R5d** (brief 96) merged: L3 and L4 build on its `defib` branch and `RowKind 'learner'`.
- **E134** (PR #154, muscle injury) for L10d's CK.
- **The owner's laboratory turnaround** replaces Hawkins 2007 in the laboratory row when given; **the department's
  stock list** re-points the formulary's product monographs (LQ6); **another analyser** is another row in L10a's table.
- **Analytes outside the ruled panels** (troponin, myoglobin, lipase and the rest): engine work of their own.
- **A line model** (cannula, lumens, dead space, flush): needed for Y-site compatibility and for the delay between a
  push and its arrival; not modelled today (LQ12).
- **An instructor's own sample button** on the laptop (LQ13 gave the laptop a Labs view, not a draw control): not
  ruled, not planned.

## 10. Questions for the owner (LQ1–LQ14): all ruled 9 November

The questions as they were put on 8 November, kept for the record; the last column was the plan's default, and the
rulings are in section 0 (LQ1 B; LQ2 C with the ABL800 and Hawkins 2007; LQ3 one control, a sound, on laptop and
phone, a Give before it is given and recorded; LQ4 B; LQ5 Stabilis primary, Trissel 2013 the cross-check; LQ6 B;
LQ7–LQ12 and LQ14 the defaults; LQ13 B with a laptop Labs view).

| ID | Question, in plain words | Options | Default proposed on 8 November (the ruling: section 0) |
|---|---|---|---|
| **LQ1** | **Does a learner remote need the PIN, or the room code alone?** The defibrillator window joins on the room code alone because it can only press Charge and Shock. A remote can give any drug in the library, so anyone who can see the room code on the projector can give drugs | **A** the room code alone (R5c's pattern exactly; the instructor sees every remote in Room setup and can remove one); **B** a learner PIN, a second short PIN shown on the Room page, different from the instructor's; **C** the instructor admits each remote with one tap in Room setup's device table (no secret to share; nothing works until admitted) | **A**, the brief's fixed point, with a "Remove" control on the remote's row in Room setup (L6) |
| **LQ2** | **Which samples, which analytes, and how long until results?** Today one number (120 s, an engineering guess, not a source) covers every result. A point-of-care blood-gas analyser and the hospital laboratory take very different times, and analysers differ in what they measure (most do not report magnesium or osmolality) | **A** one point-of-care panel (arterial or venous gas with electrolytes, lactate, glucose, haemoglobin, co-oximetry) with the department's analyser's own analyte list and analysis time from its specification sheet, plus the walk measured in your theatre; **B** A plus a laboratory chemistry panel (Na, K, Cl, Ca, Mg, glucose) with a laboratory turnaround from a published source (the executor would start from Hawkins, Clin Biochem Rev 2007;28:179–94) or your laboratory's own figure; **C** B plus INR (the liver model computes it). Critical values: the Kost list recommended on 29 October (O15), or your hospital's | **A**, with the analyser to be named by you; until named, no turnaround number ships (the remote's Labs tab says "the analyser's time is not set") |
| **LQ3** | **What does the instructor see, and what happens, when a learner stages a preparation with a compatibility problem?** Your 29 October ruling: it shows at staging and the instructor decides. The plan proposes the laptop's card of L9 (the preparation, the finding with its source, and Let it stand / Tell the learner / Remove it) | First half: **A** the card as proposed; **B** the card plus a sound; **C** the same card also on the instructor's phone. Second half, if the learner presses Give before you decide: **A** it is given and recorded "given before the instructor decided"; **B** Give waits for your decision, and the remote says only "Checking…" (this tells the learner something is wrong) | **A** and **A** |
| **LQ4** | **May a learner change or stop an infusion the instructor started** (or another learner's)? | **A** no: only infusions this phone started; **B** yes, any infusion; **C** yes, and the laptop shows the change at once with an Undo | **A** |
| **LQ5** | **Who holds access to Trissel's Handbook on Injectable Drugs?** It is a paid ASHP publication (print, or online through a hospital's drug-information subscription). Every entry must cite it; an executor cannot read it without access | **A** your department's or university's subscription, used by you or a delegate who reads the monographs and fills the entries with an executor; **B** a purchased copy for the project; **C** Stabilis and the monographs only, each entry marked "Trissel not read" (this does not meet your ruling) | none: FS cannot start without A or B |
| **LQ6** | **Which products does your department stock?** "The monograph of the stocked preparation" needs the product: brand, vial strength, form (for example which dantrolene product, which epinephrine ampoule) | **A** you send the department's stock list (or photographs of the ampoules and vials); **B** the plan uses the US labels (DailyMed) or the EU product information (EMC), named per entry, until the list arrives | **B**, each entry naming its product, replaced when A arrives |
| **LQ7** | **Preparation time where no source gives one.** Few handbooks give how long a preparation takes; for dantrolene the product monographs and MH literature do, for most drugs nothing does | **A** ready at once, with "no source for the preparation time" in the Debrief; **B** you time the department's own preparations (a measured local figure, cited as such); **C** a literature search per drug class before each batch | **A** |
| **LQ8** | **A delivered preparation that the source calls incompatible but gives no amount lost** (a precipitate, a haze). The ruling says the loss of effect is modelled, but there is no number to model it with | **A** the full amount reaches the patient, the record says "loss not modelled", and the Debrief names the harm; **B** none of the precipitating drug reaches the patient (all lost; this is not a source's number either); **C** such a preparation cannot be given from the remote | **A** |
| **LQ9** | **"Stable" statements.** Most stability data say "at least 90 % remained for T hours". The true amount is between 90 % and 100 % | **A** 100 % within T (no loss modelled); **B** 90 % within T (the source's lower bound); beyond T, both options keep the last measured value and flag it | **A** |
| **LQ10** | **Does the instructor's own Drug sheet become a bench too?** The roadmap row first said so; your 8 November reply puts the bench in the learner remote | **A** remote only; the laptop gives as today; **B** both (≈ 9 h more, the laptop then grades its own preparations too) | **A** |
| **LQ11** | **What makes a diluent "wrong"?** The plan's split: wrong = not listed in the stocked product's monograph (graded); the effect = what Trissel and Stabilis measure (modelled) | **A** that split; **B** wrong = Trissel says incompatible (a diluent the monograph does not list but Trissel finds compatible is then not graded) | **A** |
| **LQ12** | **Line (Y-site) compatibility with what is already running.** Many real incompatibilities are between two drugs meeting in one line; the engine has no lines | **A** out of scope: preparations only (diluent and admixture in one syringe or bag); **B** a line choice on the remote (which cannula or lumen) and compatibility checked against what runs in it: a line model of its own, ≈ 12 h, after this plan | **A** |
| **LQ13** | **Whose results does each device see?** A sample drawn by one learner, the instructor, or another learner | **A** every result on every learner remote and on the laptop (a laptop Labs view is then needed, §9.3); **B** a remote sees its own samples, the laptop sees all; **C** a remote sees its own only, the laptop none | **B** (the laptop view then costs ≈ 4 h more) |
| **LQ14** | **Do the cards ask for a diluent?** For example the MH card's dantrolene step naming its diluent, so that a wrong one is a deviation on that step and not only in the preparations list | **A** no card change; the formulary grades every preparation; **B** the MH and haemorrhage `/2` cards gain `diluent` criteria, drafted by an executor and reviewed by you | **A** |

## 11. Self-review against the codebase (d3dcb34d)

| Claim | File and line |
|---|---|
| Follower contract; phones run their own engine; no ventilator frames over the relay | `apps/demo/src/app/views/follower.ts:1–37` |
| `mountFollower`, upright on a phone, defibrillator window | `follower.ts:136–145` |
| Follower hashes and `instrumentOf` / `hashOf` | `apps/demo/src/app/classroom.ts:51–61` |
| Picker cards; defibrillator and instructor remote not offered there | `apps/demo/src/app/views/join.ts:18–35` |
| Device key | `join.ts:57` |
| Follower branch of the app | `apps/demo/src/app/main.ts:59–93` |
| Instructor phone remote, PIN form | `apps/demo/src/app/views/remote.ts:1–11`, `:150–183` |
| `Role` with `defib`; `LEARNER_DEFIB_COMMANDS`; `learnerDefibMay` | `packages/controller/src/protocol.ts:27–31`, `:398–418` |
| `INSTRUCTOR_COMMANDS` (no `applyEvent lab`) | `protocol.ts:370–378` |
| Wire `ClinicalEvent` (no `lab`) | `protocol.ts:52–57` |
| `VIEWER_EVENTS` | `protocol.ts:249` |
| Guard roles, `SHOWS_WITH` | `packages/controller/src/guard.ts:115`, `:117` |
| Relay `DEFIB_PER_S`, the `defib` command branch, the classroom role rule | `packages/controller/relay/server.ts:162`, `:303–313`, `:540` |
| Host: viewer refused, instructor re-checked and filed `remote` | `packages/controller/src/session/host-session.ts:562–578` |
| Host: the lock on arrival; staged delivery released item by item | `host-session.ts:606–617`, `:646–676` |
| Same-drug lock, 10 s, `bolusDrugOf`, `givenByOf` | `packages/controller/src/session/drug-lock.ts:11`, `:14`, `:28–38` |
| Record `RowKind` (no `learner` on main) | `apps/demo/src/app/record.ts:25` |
| Drug library index, 65 rows, 4 volatiles | `packages/engine-core/src/l2/pk/data/drugs.ts:1–12` |
| `syringePerMl` | `packages/engine-core/src/l2/pk/row.ts:112` |
| PK events incl. infusion concentration | `packages/engine-core/src/types-pk.ts:13–17`; `l2/pk/pipeline.ts:274–275` |
| App dose picker from `DRUGS` | `apps/demo/src/app/drugs.ts:1–3` |
| Instructor v2 Drug sheet, staged delivery button | `apps/demo/src/app/teach2/drug-sheet.ts:1–12`, `:245` |
| Lab event, `labResult`, panel | `packages/engine-core/src/types-blood.ts:29–30`, `:39–48` |
| Lab turnaround 120 s `[ENG: device]` | `packages/engine-core/src/l2/blood/labs.ts:9` |
| `labs` 1 Hz and `labResult` emission; validation 30–3600 s; freeze at draw | `l2/blood/pipeline.ts:260–262`, `:324–326`, `:411` |
| INR in the liver/organs output | `packages/engine-core/src/types-organs.ts:48` |
| `mountLabPanel` and its only use | `packages/renderer/src/lab-panel.ts:6–41`; `apps/demo/src/dev/blood-acid-base.ts:27–28` |
| `/2` action kinds; drug criteria; administration | `packages/controller/src/scenario/types-v2.ts:55–70`, `:73–80`, `:82`, `:169–190` |
| Recorded-only kinds; `administrationOf` source mapping | `packages/controller/src/scenario/driver.ts:557`, `:573–576` |
| Grades, deviations, violations | `packages/controller/src/scenario/grade.ts:40`, `:63–66`, `:164–196`, `:416–437` |
| A sample press recorded only | `apps/demo/src/app/teach2/press.ts:25–27` |
| CI change classes; docs-only job | `.github/workflows/ci.yml:30–31`, `:42–60` |
| Validation workflow by label | `.github/workflows/validation.yml:3–18` |
| Roadmap row E136 | `docs/roadmap/v1.0-remaining.md:47` |
| Room plan anti-goal (one commanding instrument) | `docs/plans/room-and-instruments.md:117–121` |

Disagreements found while reading:
1. The brief asks for results "shown as the instructor's lab view shows them". **The app has no instructor lab view**:
   no app control draws a sample (`INSTRUCTOR_COMMANDS` has no `applyEvent lab`; no app file sends `kind: 'lab'`), and
   the one lab view, the renderer's `mountLabPanel`, is mounted only by a developer page. The plan builds both views
   on `mountLabPanel`: the remote's (L11) and, by LQ13's ruling, the laptop's (L15).
2. The turnaround the engine uses (120 s) is marked `[ENG: device]` with "≈ 60–90 s + the walk" and no source; under
   the 7 November rule it is replaced in L10a by the ABL800 row's specification-sheet time (and the laboratory row's
   Hawkins 2007 figure for chemistry and coagulation).
3. The wire's `ClinicalEvent` lacks `lab` while the engine accepts it; nothing sent it until now.
4. The roadmap row E136 says the Drug sheet becomes the bench; the 8 November ruling puts the bench in the learner
   remote. This PR rewrites the row; LQ10 ruled the laptop's Drug sheet unchanged.
5. ~~The Room plan's anti-goal allows one commanding instrument.~~ **Now a decision (§4 D9):** the owner ruled the
   learner remote a second commanding instrument (8 and 9 November), admitted by the room code and the learner PIN.
6. ~~Trissel is a paid publication, so access was a precondition.~~ **Resolved by LQ5:** Stabilis (open) is the source
   of record; Trissel 2013 is the cross-check, read in place from the workspace library.
7. The laboratory panel the owner ruled (LQ2) names creatinine, coagulation, fibrinogen and CK, which the engine does
   not compute on d3dcb34d. Under the mechanisms-first rule they are built (L10b–L10d), never shown as numbers the
   engine did not compute; until each lands, its analyte is absent from the panel.
