# Stage EEG: a simulated EEG and the depth-of-anaesthesia device family — Implementation Plan

**STATUS: DRAFT FOR REVIEW (2026-11-06).** Written by a planning executor from brief 40 of the post-demo set. Nothing
in it is ruled until the owner answers §10 and the orchestrator reviews the pieces. No product code, test, card or kit
file was changed while writing it.

### State on 12 November 2026

*Added 12 Nov 2026 (brief 190, a record of the night of 11–12 November; no design, cell, band or number below it was
changed). Sources: the hand-over notes of briefs 165, 167, 171 and 183 and the orchestrator's rulings N109, N110,
N120, N128, N135, N138–N140 and "Narcotrend = C". Each piece's own dated note says more.*

| Piece | PR | State | What it waits for |
|---|---|---|---|
| E0 baseline | PR 316 | merged 8 Nov | — |
| E1 + E2 cortical state, spectra | PR 318 (and PR 355, the registry seams) | merged 8 Nov | — |
| E3 + E4 generator, artefacts | PR 320 | merged 8 Nov | — |
| E5 + E6 generic reader, device layer | PR 322 | merged 8 Nov | — |
| E12 depth window | PR 424 | open (draft), in the merge chain | its turn; Q9's controls are not in it (E12b) |
| E12b the instructor's artefact controls (Q9) | PR 447, branch `eeg-e12b-artefact-controls` | open (draft) | its gate; PR 424 first (its base) |
| E7 BIS-type reader | PR 427 | open (draft), in the merge queue | PR 424 first (its base); the run-in question (Q13); C27's miss waits on PR 437; N138 is read against it when the root-cause piece reports |
| E8 Entropy reader | PR 433 | open (draft), **not accepted** | the root-cause piece for the WebKit follower stall (N138); its validation run; PRs 424 and 427 first (its base); the rate question (Q12) |
| E9 Narcotrend reader | none | **NOT BUILT** (owner, 12 Nov: dropped from the build list) | the maker's answer with a method that may be published (P-18) |
| E10 four-channel montage | none | not started | after E8 in the order of readers; the PSI montage (P-19) |
| E11 PSI reader | none | not started | P-19: the two supplied papers read for a computable method |
| E13 acceptance, docs | none | not started | the readers that merge |
| Generator: high-frequency spectrum under propofol (N128 = A) | PR 437 | open (draft) | its gate; it moves E7's and E8's course numbers (whichever merges second re-records them) |
| Engine: `restore()` keeps the snapshot's seed (N109) | PR 445 | open (draft) | its CI and validation runs |

**Order of readers as it now stands (12 Nov 2026):** BIS-type (E7), Entropy (E8), then the montage (E10) and the
Patient State Index (E11) when its source allows. Narcotrend (E9) is off the list (§7 E9).

**Open findings that belong to this plan (12 Nov 2026)**, each with where it was found and what it waits for:

| Id | Finding | Found in | Waits for |
|---|---|---|---|
| N138 | On WebKit the depth window (the follower) stood still in `apps/demo/e2e/depth-window.e2e.ts`: "the window's `data-t` stayed at **27.528 s** for 90 s, although the host was set to ×4" (E8 case, line 299); the E7 case (line 243) timed out waiting on the host's reading at the window's time. Both passed only on retry. | PR 433's CI run 43111160670, webkit shard 3/3 (hand-over 171) | the root-cause piece now running (brief 187); PR 433 is not accepted until it reports |
| N139 | The engine's cortex blunts all stimulus arousal under remifentanil 0.1 µg/kg/min: "arousal 0.015 in the engine", so C31 shows no shift | PR 433's course test (Entropy C31) | a generator piece |
| N140 | The awake trace's eye blinks dominate the low-frequency power: awake SE 69, with "54 % of R_low's power … below 4 Hz" | PR 433's course test (Entropy C26) | a generator piece; the module's blink rejection is unpublished (Viertiö-Oja 2004 p. 160) |
| C28 (Entropy) | The age effect reads the wrong way: "50.5 at 80 y vs 63.9 at 40 y" at the cortex's own loss of responsiveness | PR 433's course test | "Not verified which part of the trace carries the extra slow power" (PR 433) |
| N120 | Today's signal has no designed coupling between frequencies: bicoherence ≈ 0.165 at every depth | PR 427's course test | the clinical generator; the bispectral term enters no index (§7 E7) |
| N109 | A follower's EEG differed from the host's when the EEG was switched on after the follower joined: `engine.restore()` ignored the snapshot's seed | hand-over 165 (E12) | PR 445 |

**Why this stage exists.** The owner ruled on 5 November (Room plan Q7, `docs/plans/room-and-instruments.md` §10 Q7
and §9a): depth-of-anaesthesia monitors are several (BIS, Entropy, Narcotrend, SedLine/PSI and others), each with its
own method; each must be a selectable instrument in the room and each must work from its true mechanism. All of them
read the EEG. The engine has no EEG: its depth index is a function of effect-site concentrations
(`packages/engine-core/src/l2/neuro/depth.ts:1–7`, "NOT a BIS algorithm"), so it cannot stand in for any of them
(`research/41-post-demo-priorities.md` row 52). This stage gives the engine a simulated frontal EEG whose features
follow the drugs and the brain's state, and gives each device an algorithm that reads only that signal.

**Base and preconditions.**
- Base: `origin/main` **42da0eef** (Merge PR #284, `plan-room-generic-defib`), read in the worktree
  `scratch/wt-plan-eeg` (branch `plan/eeg-depth-of-anaesthesia`). Every `file:line` below is on 42da0eef and is a
  starting point only: an executor finds the code by the function name given, because lines move.
- **Sources, read for this plan with PyMuPDF (`python3 -I`).** Miller's Anesthesia, 10th ed. (2025):
  - the library file `library/sources/miller-10th-2025/Ch35 - Neurophysiologic onitoring.pdf`, which holds **two
    chapters**: Chapter 35, "Neurophysiologic Monitoring" (Seubert, Ok), printed pp. 1099–1132, and **Chapter 36,
    "Monitoring the Brain's Response to Anesthesia and Surgery"** (Sleigh, Gaskell, Hight), printed pp. 1133–1152 (PDF
    pages 40–63). The brief's "depth section inside the Ch35 file" is Chapter 36. Page numbers below are the book's
    printed pages, written "Ch36 p. 1140" or "Ch35 p. 1107".
  - `library/sources/miller-10th-2025/Ch08 - Consciousness, Memory, and Anesthesia.pdf`, printed pp. 134–151.
  - The full book `library/sources/full-pdfs/miller-10th.pdf`, searched only for what the two files do not hold (the
    devices other than BIS): Chapter 23 "Intravenous Drug Delivery Systems" pp. 630, 633, 635, 637 and the ambulatory
    chapter p. 2169. These are marked "(full book)" where used.
  - The engine's own drug layer for what the EEG couples to (§3.2).
- **What Miller does not give, and this plan does not invent.** Chapter 36 states that the indices combine several EEG
  components whose details "usually remain a proprietary secret" (Ch36 p. 1147). Miller gives the EEG's physiology in
  detail, BIS's published sub-parts by name (suppression ratio, QUAZI; Ch36 p. 1140), and outcome numbers for BIS and
  PSI, but **no band limits, weights or scales for any device's algorithm**, and nothing on Narcotrend's stages or
  Entropy's bands. Every such number is a **placeholder for the owner**, written `[OWNER P-n]` and listed in §10.1, with
  the candidate source named where Miller's reference list names one. An engineering choice is written `[ENG]` with its
  reason. A number with a page is from that page.
- House form: `docs/plans/room-and-instruments.md` (sections) and `docs/plans/debrief-2-option-c.md` (effort in
  executor-hours and CI runs, measured as `research/42-ci-and-process-review.md` §2.1 does).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each PR in §8 is ONE pull request with its own
> gate.

---

## 1. Intent

A learner looking at a depth monitor in the simulator should see what a real one would show, for the reason a real one
would show it. Today the number on the BFA tile is computed from drug concentrations through an interaction model and
then corrected by hand for the cases the model gets wrong: ketamine is given +15 points (`depth.ts:29`), EMG +15
(`depth.ts:31`), nitrous oxide a weight of 0.1 (`depth.ts:15`). Those corrections are the symptoms the real devices
show, and every one of them has a mechanism in the EEG (§3.2): ketamine removes the alpha oscillation and adds gamma
(Ch36 p. 1144), muscle adds broadband power (Ch36 p. 1142), nitrous oxide barely changes the EEG (Ch36 p. 1144).

This stage builds those mechanisms once, in the signal, and lets each device be fooled by them the way it is in the
operating room: BIS rising under ketamine, falling in an awake patient given a relaxant (Ch36 p. 1148), reading high in
an older patient (Ch36 p. 1145), reading "awake" in noisy burst suppression (Ch36 p. 1148, Table 36.3).

## 2. Goals, non-goals, anti-goals

Goals
- **A simulated frontal EEG** (one channel first, the montage almost every device uses: Ch36 p. 1150; Ch35 p. 1105
  "four or fewer channels"), in microvolts, with: a broadband 1/f background whose slope steepens with dose; the
  classic oscillations (slow wave, delta, theta, alpha, beta, gamma; Ch36 Table 36.1, p. 1140); the awake, sedated,
  surgical and deep patterns and the transitions between them, induction and emergence differing (Ch36 pp. 1138–1142);
  burst suppression with its forme fruste (Ch36 pp. 1139–1141); the per-agent signatures (Ch36 pp. 1142–1145; Ch35
  Table 35.1, p. 1107); age (Ch36 p. 1145); ischaemia, hypoxia and hypothermia (Ch35 pp. 1105, 1122, 1126–1127); and the
  artefacts a real monitor sees: EMG, electrocautery, eye blinks, ECG spikes, poor electrode contact (Ch36 pp. 1142,
  1145–1146).
- **The drug coupling by mechanism**, not by a fitted index: each agent class moves the EEG through the mechanism
  Miller names for it (thalamocortical hyperpolarisation for the GABA-ergic drugs and dexmedetomidine; other mechanisms
  for ketamine and nitrous oxide, Ch36 p. 1142; subcortical action for opioids, Ch36 p. 1145).
- **Per-device readers**, each computing its numbers from the sampled EEG only, on its published method: a generic
  processed-EEG monitor (raw EEG, spectrogram, spectral edge, suppression ratio: all published in Miller), BIS-type,
  Entropy (SE/RE), Narcotrend stages, PSI; each with what it displays, its update interval and its artefact flags.
- **The device window in the room:** the slot "Depth of anaesthesia" (room plan R4, R7) becomes selectable, one
  instrument per screen, the model chosen in Room setup.
- **Acceptance cells from the sources** (§7.2), run as engine tests.

Non-goals
- The skins' look: each device gets a neutral, generic face now; its look (colours, fonts, layout of the maker's
  screen) is the owner's later choice, as the defibrillator's was (room plan Q6).
- Infant and neonatal EEG (Ch36 p. 1145: markedly different; anterior alpha only from about 4 months). Children over
  12 months are in, as higher-amplitude adults (same page).
- Multichannel connectivity measures (phase–amplitude coupling, Lempel–Ziv, transfer entropy; Ch36 pp. 1150–1151), and
  seizure detection. Evoked potentials (Ch35) are not part of this stage.
- Nociception indices that are not EEG-based (ANI, SPI; Ch36 p. 1137) and qNOX: a later stage if the owner wants them.

Anti-goals (a piece that does one of these is rejected)
- **No index computed from Ce directly.** A device's number is a function of the EEG samples (and the electrode
  impedance the device measures), never of an effect-site concentration, a MAC fraction or any engine state. Enforced
  by an import-boundary test (§5).
- **No hand correction per drug in a device.** Ketamine, nitrous oxide, opioids, age and EMG reach a device only
  through the signal. A device constant that names a drug is rejected.
- **No invented algorithm presented as the maker's.** Where the method is proprietary (BIS, PSI), the reader is built
  from the published relations and is labelled on screen as such (Q8); where no published relation is sourced, the
  piece stops at its placeholder and is not built.
- **No number on a device screen the reader did not compute.** No SQI or EMG bar unless the reader computes it from the
  signal.
- **No change to today's physiology numbers** unless the owner rules Q4: the circulation, organ and drive couplings
  that read today's index keep their values (§4 D7), proven by the E0 baseline.

## 3. What exists (42da0eef)

### 3.1 The present index

| What | Where | What this stage does with it |
|---|---|---|
| The index: `U` = propofol-equivalent Ce / Ce50(age) + MAC terms + opioid term + glycopenia; `DI = 93·(1 − U^γ/(U^γ+1))`; ketamine `KET_DI_RISE` 15, EMG `EMG_RISE` 15, N2O weight 0.1; SR = (30 − base)/25 | `l2/neuro/depth.ts:1–7`, `:13–38`, `:84–110` | Kept unchanged (D7). Renamed nowhere; devices never read it |
| Displayed index smoothed τ 20 s; `di` null and `questionable` while stimulated and unparalysed; `sr` 1 Hz while `device depth on` | `depth.ts:126–129`; `pipeline.ts:280–287` (`emitSecond`) | Kept for `device depth` (Q3); the EEG devices publish their own ids (§4 D6) |
| The index feeds physiology: CMRO2 ×0.45 below DI 30, else 1 − 0.4·anaes; MAP set-shift (published only); ventilatory-drive sedation `(60 − di)/20`; the awareness flag `di > 60 && TOF ≤ 2` | `l2/neuro/outputs.ts:24–33`; `l2/neuro/drive.ts:183`; `pipeline.ts:323` | **Hidden coupling**: physiology reads a display-like number. Kept as is (D7); moving it to the EEG's cortical state is Q4 |
| Ketamine's share counts ×0.1 on the index, in full for consciousness | `depth.ts:19–22` | Replaced, for the devices, by ketamine's EEG mechanism (E1, E2) |
| Dexmedetomidine has no hypnotic C50, so it is absent from the hypnotic equivalent and does not move the index | `l2/pk/data/rows-anaesthetic.ts:134–143`; `l2/pk/combine.ts:126–145` | Known miss NN-19c (`research/15-coverage-neuro-nmb-depth.md:324`: dDiMin 0). The EEG gets dexmedetomidine's own signature (E1, E2); its potency is `[OWNER P-12]` |
| Tests that pin the index | `test/engine/neuro-acceptance.test.ts:51` ("sevoflurane ≈ 1 MAC → displayed DI 38–48"), `neuro-engine`, `neuro-longrun`, `drug-layer*`, `scripts/audit-drugs/cells-{a,e,f}.ts` | Unchanged; E0 adds a baseline that pins the physiology outputs too |
| Scenarios that turn the index on | `packages/controller/scenarios/depth-awareness.json:46`, `depth-light-anaesthesia.json:38` (`device: depth`) | Unchanged (Q3) |

### 3.2 The drug layer the EEG couples to

| Output | Where | Use here |
|---|---|---|
| Per-agent brain Ce: propofol, remifentanil, fentanyl, midazolam, ketamine, NMB agents | `l2/neuro/bus.ts:26` (`NeuroAgentId`) | Read |
| Volatile brain MAC fractions, age-adjusted (sevoflurane, isoflurane, desflurane, N2O) | `bus.ts:23`; `depth.ts:2` | Read per agent: sevoflurane and the other ethers differ (Ch36 p. 1143) |
| `hypPropEq` (every hypnotic as one propofol-equivalent), `dissoc` (its ketamine share), `benzoShare`, `propCe`, `ketamineCe`, `dexmedCe` | `l2/pk/combine.ts:126–168` | `hypPropEq` **merges classes whose EEG differs** (propofol vs barbiturate vs etomidate vs benzodiazepine; Ch36 pp. 1143–1144). E1 adds a per-class split as an additive bus output, summing to `hypPropEq` exactly |
| Fentanyl-equivalent opioid Ce | `combine.ts:169–` ; `depth.ts:80–82` | Read |
| Stimulus 0–2 and antinociception 0–1 | `types-neuro.ts:22–28`; `depth.ts:113–121` | Read: noxious arousal of the EEG |
| TOF T1 (muscle available for EMG) | `depth.ts:54` | Read: EMG needs unparalysed scalp muscle |
| Brain summary: CBF (relative to 50 mL/100 g/min), PbtO2, CMRO2 | `types-organs.ts:35–41` | Read: ischaemia and hypoxia slow then flatten the EEG |
| Core temperature; neuroglycopenia | endocrine/thermal; `depth.ts:56` | Read: hypothermic suppression; glycopenic slowing |
| ECG artefact state: `emg`, `mains`, `motion`, `electrosurgery` bursts | `l2/ecg/api-types.ts:125–141`; `l2/ecg/artefacts/front-end.ts:11` | Read: ONE diathermy event reaches the ECG and the EEG (D5) |
| Sample rates the engine offers | `types.ts:188`, `engine.ts:423` (`500 | 125 | 62.5`) | The EEG channel uses 125 Hz (D2) |

### 3.3 The room's slot, the device layer, the skins

| What | Where | This stage |
|---|---|---|
| The picker card "Depth of anaesthesia", chip "Not available yet", no action; the device table lists it so | room plan R4 (`room-and-instruments.md:431`), R7 (`:592`), R10 (`:722`); **not built on 42da0eef** (no match for "Not available yet" under `apps/demo/src`) | E12 turns it on once R3, R4 and R7 have merged |
| Device actions: `device tof …`, `device depth on/off` | `types-neuro.ts:42–45` | E6 adds `device eeg on/off/model/impedance` |
| Module tiles: BFA = `di`, `sr`, stale after 5 s | `packages/renderer/src/numerics-neuro.ts:16–20`; alarm view `alarm-view.ts:108` | E6 maps BFA to the chosen device's numerics when an EEG device is on |
| Philips-like: a BFA tile with SR | `packages/skins/src/data/skins/philips-like.json:19` | Unchanged look |
| Saadat-like (the department's monitor): BFA always shown, parts BFI%, BS%, SQI%, EMG%; SQI% and EMG% drawn blank because the engine publishes neither | `saadat-like.json:48`, `:56`; `packages/renderer/src/device-ui.ts:888–892` | Stay blank until a reader computes them from the signal (anti-goal); which device the Saadat module is, is `[OWNER P-20]` |
| The developer page that turns depth on | `apps/demo/src/dev/depth-neuromuscular.ts:83`, `:86` | E5 adds the raw EEG and spectrogram there first |

## 4. Decisions this plan makes where the brief and the rulings were silent

- **D1. Two layers in the engine, one boundary to the devices.** (a) A **cortical state** (E1): a handful of
  mechanism-named variables computed from the drug bus and physiology, e.g. thalamocortical hyperpolarisation, its
  depth past the alpha-to-delta shift, cortical suppression (burst-suppression drive), ketamine's thalamocortical
  depolarisation, the nitrous-oxide transient, opioid stabilisation, noxious arousal, metabolic failure. Ch36 itself
  classes the drugs this way (p. 1142: hyperpolarising drugs vs "other mechanisms"; thalamus as the switch, Ch08 p. 137).
  (b) A **spectral description** per state (E2) and a **signal generator** (E3) that turns it into microvolt samples.
  The devices (E5, E7–E11) receive **only** the samples, the sample rate and the electrode impedance.
  - Why not a biophysical thalamocortical model (neural mass or field)? It is the deeper mechanism, but every one of
    its parameters would come from outside the sources the brief allows, and Miller gives none; it would be a larger
    fitted model, not a truer one. The cortical-state variables carry Miller's mechanisms by name, and the spectral map
    carries Miller's described features; the owner may later replace E2 by a biophysical model behind the same
    interface (§9).
- **D2. One frontal channel at 125 Hz.** 125 Hz is an existing engine rate (`types.ts:188`) and covers the 0–50 Hz that
  Miller's spectrograms show (Ch36 p. 1139, Fig. 36.3 legend: "50-Hz waves furthest"). If the owner's BIS source needs
  an EMG band above 62.5 Hz, the channel moves to 500 Hz (`[OWNER P-6]`); the generator is rate-agnostic. A
  four-channel frontal–posterior montage is E10, needed by PSI only.
  - *Note, 12 Nov 2026 (P-6, from PRs 427 and 433):* the premise that a reader would need a band above the 125-Hz
    channel's 62.5-Hz limit does not hold for either reader built. SE and RE both end at 47 Hz (Viertiö-Oja 2004
    p. 158: RE "from 0.8 Hz to 47 Hz"); the BIS-type reader's bands end at 47 Hz too (Connor 2022 Table 1; Rampil 1998
    Table 2), "so every band either paper uses is in the signal" (PR 427). What 125 Hz cannot carry is three parts of
    the Entropy module: its burst-suppression artefact band ("a 75-Hz high-pass at 200 Hz", p. 159), its cautery check
    ("66–86 Hz", p. 160) and its ECG and pacer subtraction ("rests on 400-Hz sampling", p. 160). None of the three is
    published whole either (the burst-suppression threshold and filter orders, the subtraction method: not given), so
    none is built. The makers' own rates differ from 125 Hz: openibis "must be 128 Hz" (Connor 2022 Table 1 l. 2), the
    Narcotrend front end 128 Hz, the Entropy module 400 Hz (p. 155). Put to the owner as Q12 (§10); D2 stands until he
    rules.
- *Note, 12 Nov 2026 (D3):* the follower identity did not hold when the EEG was switched on after a follower had
  joined: `engine.restore()` kept the restoring engine's seed and ignored the snapshot's (N109, found in E12). PR 445
  (open) makes restore adopt the snapshot's seed.
- **D3. Determinism.** The generator draws from the engine's seeded streams (`seedStream(seed, 'eeg')`, as
  `pipeline.ts:101` seeds the TOF device), so a follower's EEG is sample-identical to the host's and no EEG sample ever
  crosses the wire (the room plan's follower rule).
- **D4. The EEG runs only while an EEG device is on**, like the TOF and depth devices (`pipeline.ts:155–156`): an engine
  without it computes exactly what it computes today.
- **D5. One artefact source.** Electrocautery, mains and motion are the ECG model's artefact state
  (`l2/ecg/api-types.ts:125–141`); the EEG reads the same state (with its own coupling gain, `[OWNER P-15]`), so one
  diathermy press appears on both traces. EMG on the EEG is computed from scalp muscle (TOF T1), arousal and the tube
  (Ch36 p. 1142), not from the ECG's `emg` knob.
- **D6. Each device publishes its own numeric ids** (`bis`, `bisSr`, `se`, `re`, `ntIndex`, `ntStage`, `psi`, `sef`,
  `mf`, `sr`, `eegImp`), added to `NumericId` as a new `EegNumericId` union beside `NeuroNumericId`. `di` and `sr` stay
  the present index's (Q3).
- **D7. Physiology keeps reading today's index** (`outputs.ts:24–33`, `drive.ts:183`, `pipeline.ts:323`) until the owner
  rules Q4. The EEG stage adds; it does not move a physiology number. E0 pins them.
- **D8. Every device reader is a pure function module** under `packages/engine-core/src/l3/eeg-devices/`
  (`reader(samples, fsHz, impedanceKOhm, state) → { numerics, flags, display }`), with its own state (buffers,
  smoothing) and its own spec row in a registry like the room plan's `DEFIB_MODELS` (R5a). A spec row carries every
  device constant with its tag (`[TXT p.]`, `[OWNER P-n]`, `[ENG]`), so `docs/model/` shows them.

## 5. Global constraints (every piece)

- `00-common-rules.md` applies: own worktree under `scratch/` on a branch from `origin/main`; never merge, tag,
  force-push, rebase or push gh-pages; one PR per row of §8, draft until its checks pass; `npx -y pnpm@9.15.9`; the
  executor's port range only; no owner identifier anywhere; no closing keyword before a `#number`; identity through
  `GIT_AUTHOR_*` / `GIT_COMMITTER_*` on every commit.
- **Tests first** in every piece: the failing test is committed before the code, and the PR body pastes both runs.
- **A placeholder is a named constant, never a silent default.** `[OWNER P-n]` constants carry the plan's default value
  and the tag `OWNER`; the model-docs page lists them; an acceptance cell that depends only on a placeholder's value
  is a direction check, not a value check, until the owner supplies the source.
- **The device boundary test (E5 adds it, every reader piece keeps it green):** no file under `l3/eeg-devices/` imports
  from `l2/` or reads `PipelineState`; it is enforced by a unit test that parses the imports, as the engine's other
  layer tests do.
- **Must not touch (every piece):** `l2/neuro/depth.ts`, `outputs.ts`, `drive.ts` (D7); the drug rows' PK/PD values
  (`l2/pk/data/*`; E1 adds bus OUTPUTS only); the scenario format; the showcase cards; `viewer-sync.ts`,
  `host-session.ts`; the skins' JSON except E6's one tile mapping. `packages/renderer` only in E5, E6 and E12.
- **Common gate (before every push):**

```bash
npx -y pnpm@9.15.9 install --frozen-lockfile < /dev/null
npx -y pnpm@9.15.9 -r typecheck < /dev/null
npx -y pnpm@9.15.9 --filter @pme/engine-core test -- <touched files> < /dev/null   # touched unit files, one pass
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs < /dev/null   # 0 stale, 0 orphans
git diff origin/main --stat -- packages/engine-core/src/l2/neuro/depth.ts packages/engine-core/src/l2/neuro/outputs.ts \
  packages/engine-core/src/l2/neuro/drive.ts packages/engine-core/src/l2/pk/data apps/demo/src/app/showcase   # empty
```

- **Local testing:** only the touched unit files and the touched e2e file, one pass; CI runs the rest
  (`research/42` §2.4 item 5). Engine PRs also run the validation workflow.
- **Shared machine:** one local e2e or kit run at a time; never an unfiltered `pkill`; the executor's ports only.

## 6. Review focus (for each piece's reviewer)

1. **A device that knows the drug.** Any reader input other than samples, rate and impedance; any constant named after
   a drug or an age in a reader.
2. **A number without its tag.** Every constant carries `[TXT Ch.. p..]`, `[OWNER P-n]` or `[ENG]` with a reason; a
   value presented in a PR as measured must be measured.
3. **A physiology number moved.** E0's baseline equal before and after, byte for byte.
4. **A maker's name on an approximation.** The screen label says what the reader is (Q8).
5. **The follower.** A depth window's samples equal the host's (D3); no new message kind.

---

## 7. Pieces

Effort is in **executor-hours** as measured this week: plan hours (the human-equivalent unit the plans used) ÷ 8 to
÷ 6 (`research/42` §2.1: plan hours ran 5–9× executor wall time on the six measured pieces). Each piece names its plan
hours so the conversion can be checked. CI runs are counted per PR in §8.

### E0: Baseline — pin what the stage must not move (plan 3 h · 0.4–0.5 executor-h)

**Depends on:** nothing. **Files:** new `packages/engine-core/test/engine/eeg-baseline.test.ts` (test only).
- [ ] **Red→green (it pins today, so it is green at once; the PR body says so):** six engine runs (awake; propofol TCI
  induction and maintenance; sevoflurane 1 MAC; sevoflurane + ketamine 50 mg over 10 min; propofol + rocuronium +
  incision; emergence) record, every second, `diRaw`, `sr`, `outputs.cmro2Mult`, `outputs.mapSetShiftMmHg`,
  `awarenessRisk`, the drive's `sedation` input, MAP, HR, SpO2 and PaCO2; the test stores them as a JSON fixture and
  asserts equality.
- [ ] **Measure:** the engine step time over a 30 min run (median of 3), for E3's cost budget.
**Acceptance:** green on 42da0eef; the fixture committed. **Must not touch:** any source file. **Gate:** common.

### E1: The cortical state — drugs and physiology to mechanisms (plan 10 h · 1.3–1.7 executor-h)

**Depends on:** E0. **Files:** new `l2/eeg/state.ts`, `state.test.ts`; `l2/pk/combine.ts` (additive outputs only);
`types-eeg.ts` (new, beside `types-neuro.ts`).
- [ ] **Red (bus):** `bus.cns.hypByClass` = `{ gabaIv, barbiturate, etomidate, benzo, dissociative }` in
  propofol-equivalents, whose sum equals `hypPropEq` to 1e-12 for every drug arm of `drug-arm-runner.ts`; dexmedetomidine
  publishes `alpha2Eq` from `dexmedCe` ÷ `[OWNER P-12]` (its EEG potency; the plan's default 2.0 ng/mL is Ch36 p. 1144's
  one example, a plasma 2.09 ng/mL that "obtunds response to verbal stimuli" with an alpha–delta pattern, Fig. 36.9 —
  one patient, so a placeholder, not a C50).
- [ ] **Red (state):** pure `cortexStep(prev, inputs, dt)` giving:
  - `hyper` 0–… thalamocortical hyperpolarisation = Σ class equivalents ÷ the propofol hypnotic C50 at age, plus
    volatile MAC fractions ÷ 1 MAC-equivalent (the drug layer's own potencies; no new fitted potency) [Ch36 p. 1142:
    GABA-ergic drugs and dexmedetomidine "primarily cause significant thalamocortical hyperpolarization"; Ch08 p. 137:
    hyperpolarised thalamus shifts from tonic to burst firing];
  - `deep` = how far `hyper` is past the alpha-to-delta shift (sevoflurane above ~1.7 %, Ch36 p. 1143; propofol's alpha
    "does not generally slow below 10 Hz", same page);
  - `suppress` 0–1, the burst-suppression drive: onset at propofol "about 5 mcg/mL" median target (Ch36 p. 1141); for
    the ethers "about 30% more" than the concentration that prevents movement (Ch36 p. 1141), i.e. ≈ 1.3 MAC — but Ch35
    Table 35.1 (p. 1107) gives "Yes, >1.5 MAC": **conflict, `[OWNER P-1]`**, default 1.3 MAC onset with full
    suppression by 1.5 MAC; never from opioids, benzodiazepines, ketamine, N2O or dexmedetomidine (Table 35.1; Ch35
    p. 1106); plus the metabolic causes: hypothermia, hypoxia, ischaemia (Ch36 p. 1141) with complete suppression at
    15–18 °C (Ch35 p. 1127) and EEG failure from CBF 20 mL/100 g/min, survival threatened at 12 (Ch35 p. 1122; the
    organs' `cbf` is relative to 50, so 0.4 and 0.24);
  - `ketDepol` from the dissociative equivalent (Ch36 p. 1144: alpha loss, theta and gamma up; at hypnotic doses huge
    slow waves with gamma bursts; thalamocortical depolarisation; Ch08 p. 137: ketamine the exception to thalamic
    depression);
  - `n2oTransient` from the rate of change of the N2O MAC fraction (Ch36 p. 1144: abrupt increases or decreases cause
    large short-lived delta waves and alpha loss), threshold and time constant `[OWNER P-2]`;
  - `opioid` from the fentanyl-equivalent: alone above 8 ng/mL raises delta and lowers median frequency (Ch36
    p. 1144); with a hypnotic little change (Ch36 p. 1145); above 4 ng/mL prevents or treats noxious beta arousal and
    alpha dropout (Ch36 p. 1145);
  - `arousal` = stimulus × (1 − antinociception) (the engine's existing terms, `depth.ts:113–121`);
  - `ageSlope`, `ageAmp` from the patient's age (Ch36 p. 1145: slope flatter "by about 20%", lower amplitude at all
    frequencies; children over 12 months higher amplitude, magnitude `[OWNER P-3]`).
- [ ] **Neural inertia:** emergence at lower concentrations than induction beyond the PK lag (Ch36 p. 1142); its size
  is not given → `[OWNER P-4]`, default **zero** (no hysteresis beyond the drug layer's ke0) so nothing is invented.
**Acceptance:** each variable's direction for each class as listed; `hypByClass` sums exactly; E0 green (the bus
change is additive). **Must not touch:** the drug rows; `depth.ts`. **Gate:** common.

### E2: The spectral description per state (plan 10 h · 1.3–1.7 executor-h)

**Depends on:** E1 (same module chain, same PR). **Files:** new `l2/eeg/spectra.ts`, `spectra.test.ts`.
- [ ] **Red→green:** pure `spectrumOf(cortex, agentMix) → { aperiodic: { offsetDb, slope }, peaks: [{ fHz, widthHz,
  powerDb, burstiness }], suppression: { p, burstUv, suppressedUv }, formeFruste }`, with these sourced features:
  - **awake:** low amplitude ≈ 5–10 µV, high-frequency activity, beta base (>13 Hz) (Ch36 p. 1138; Ch35 p. 1104);
  - **sedation:** "beta buzz" spread over ≈ 15–25 Hz (Ch36 p. 1138); benzodiazepines mainly increased beta, then
    spindles at higher doses (Ch36 p. 1144);
  - **loss of responsiveness:** frontal alpha 8–12 Hz appears ("anteriorization", Ch36 p. 1138; Ch35 p. 1106);
  - **surgical depth (GABA-ergic):** slow wave 0.1–2 Hz / delta 0.5–4 Hz with an alpha oscillation — the alpha–delta
    pattern — and a marked fall of beta and gamma (Ch36 p. 1139); aperiodic slope steeper with dose (p. 1139);
    alpha–delta peak amplitudes ≈ 40 µV (Ch36 p. 1145);
  - **sevoflurane:** loss of >20 Hz power; narrow peaks near 3, 8 and 11 Hz; above ≈ 1.7 % the alpha peak slows from
    ≈ 10 Hz to ≈ 7–8 Hz and fades into delta (Ch36 pp. 1142–1143); sevoflurane and enflurane more epileptiform spikes
    than desflurane and isoflurane (Ch36 p. 1143; spikes are out of scope, §9);
  - **propofol:** more pronounced narrowband alpha and delta, theta peak less common, alpha not below 10 Hz (Ch36
    p. 1143); barbiturates, etomidate similar (same page);
  - **dexmedetomidine:** alpha–delta with the alpha fragmented into short spindle bursts near 12 Hz (Ch36 p. 1144,
    Fig. 36.9) — `burstiness` high; propofol and sevoflurane alpha "often almost continuous" (same page);
  - **ketamine:** sub-hypnotic — alpha loss, theta and gamma up; hypnotic — huge slow waves alternating with gamma
    bursts; as an adjunct bolus (25–50 mg) the most consistent effect is decreased alpha (Ch36 p. 1144); never burst
    suppression (Ch35 Table 35.1, p. 1107);
  - **nitrous oxide alone:** minimal, inconsistent changes (Ch36 p. 1144); frontal fast activity >30 Hz (Ch35 Table
    35.1); the transient as E1;
  - **opioids:** as E1 (Ch36 pp. 1144–1145; Ch35 Table 35.1: low dose loss of beta, alpha slows; high dose delta);
  - **burst suppression:** suppressed stretches <5 µV alternating with high-amplitude bursts, suppressions lengthening
    with dose to isoelectric (Ch36 pp. 1139–1140); before it, the forme fruste — brief drops of all power above ≈ 2 Hz
    with sustained 0.5–2 Hz (Ch36 pp. 1140–1141); elderly bursts smaller (Ch36 p. 1145);
  - **noxious arousal:** shift to faster desynchronised activity, beta up, alpha dropout (Ch36 pp. 1141, 1151); the
    paradoxical responses (delta increase, abrupt burst suppression, index dips; Ch36 p. 1141) as `[OWNER P-5]`, default
    off;
  - **emergence:** slow/delta and alpha power fall, the alpha peak frequency rises before alpha fades, beta rises,
    slope flattens (Ch36 pp. 1139 Fig. 36.3 legend, 1142);
  - **ischaemia / hypoxia:** first slowing with preserved voltage, then loss of voltage (Ch35 p. 1105); hypoxia slows
    only once flow compensation is exhausted (Ch35 p. 1126);
  - **age:** as E1.
- [ ] **Magnitudes between the anchors** (dB of each peak at each level, the slope's value per unit `hyper`) are not
  in Miller: `[OWNER P-7]`, defaults [ENG] chosen only so each feature is visible on a spectrogram at the
  amplitudes above; acceptance on them is direction only.
- [ ] **Bands:** the engine names bands by Ch36 Table 36.1 (slow 0.1–2, delta 0.5–4, theta 4–8, alpha 8–12, beta
  12–30 Hz). Ch35 Table 35.1 uses alpha 8–13, beta ≥13, delta ≤4, theta 4–7 Hz: **conflict, Q6**; each device uses its
  own published bands.
**Acceptance:** cells C1–C17 (§7.2) at the spectrum level (from `spectrumOf`, no signal yet). **Must not touch:** as
E1. **Gate:** common.

### E3: The signal generator and the `eeg` channel (plan 8 h · 1.0–1.3 executor-h)

**Depends on:** E2. **Files:** new `l2/eeg/synth.ts`, `synth.test.ts`, `l2/eeg/pipeline.ts`; `types.ts` (`ChannelId`
gains `'eeg'`; `sampleRate('eeg')` = 125); `engine.ts` (the EEG step after the neuro and organ steps, by the function
name `stepNeuroTo` and `advanceOrgans`; it reads the organ brain summary as last published).
- [ ] **Red→green:** the generator renders a 2 s block (the epoch many devices use, Ch35 p. 1106) per step group:
  coloured noise with the aperiodic spectrum + narrowband oscillators (frequency jitter, burstiness envelopes) +
  the burst-suppression process (a two-state alternation whose suppressed fraction is `suppression.p`, `[OWNER P-8]`
  for the mean burst length); deterministic (D3); continuous across block edges (no step in the samples).
- [ ] **Self-check:** a Welch spectrum of 60 s of output reproduces `spectrumOf`'s peaks within ±1 Hz and its slope
  within 10 % [ENG tolerance]; awake RMS 5–10 µV, alpha–delta peak ≈ 40 µV, suppression <5 µV (Ch36 pp. 1138, 1145, 1139).
- [ ] **Cost:** step time with the EEG on ≤ E0's + 10 % [ENG budget]; off, unchanged (D4).
**Acceptance:** C1–C4, C12 at the signal level; follower identity (two engines, same seed, same commands → identical
samples). **Must not touch:** the ECG generator. **Gate:** common.

### E4: The artefacts a real monitor sees (plan 6 h · 0.8–1.0 executor-h)

**Depends on:** E3 (same PR). **Files:** `l2/eeg/artefacts.ts`, `artefacts.test.ts`.
- [ ] **EMG:** broadband additive power, "fuzzy" small high-frequency waves, from scalp muscle × (arousal, emergence,
  tube irritation) (Ch36 p. 1142); zero under neuromuscular block (T1 → 0) — the cause of the awake-paralysis false
  negative (Ch36 p. 1148). Amplitude `[OWNER P-9]`.
- [ ] **Electrocautery:** the ECG artefact state's `electrosurgery` bursts (D5) add high-amplitude, high-frequency
  activity with power raised at all frequencies (Ch36 p. 1146, Fig. 36.10). Gain `[OWNER P-15]`.
- [ ] **Eye blinks and eye movements:** while conscious only, large frontal low-frequency deflections that can be
  mistaken for delta (Ch36 p. 1146); rate `[OWNER P-10]`.
- [ ] **ECG spikes:** sharp spikes aligned to the engine's own R waves, most visible in burst suppression, giving
  horizontal spectrogram stripes at harmonics of the heart rate (Ch36 p. 1146). Amplitude `[OWNER P-11]`
  ("thick, short necks", same page: a patient-profile flag, default off).
- [ ] **Electrode impedance:** a per-electrode value in kΩ, default good; an instructor/scenario may raise it; above
  5–8 kΩ, or unequal across electrodes, the signal is unreliable (Ch36 p. 1145) — added noise and a device flag. The
  device picks 5 or 8: `[OWNER P-13]`.
- [ ] **Mains:** the ECG artefact state's `mains` at the device mains frequency (Ch36 p. 1145: "powerline signals").
**Acceptance:** C18–C22. **Must not touch:** the ECG artefact module (read only). **Gate:** common.

### E5: The generic processed-EEG reader — everything Miller publishes (plan 8 h · 1.0–1.3 executor-h)

**Depends on:** E4. **Files:** new `l3/eeg-devices/generic.ts`, `spectral.ts` (shared FFT/Welch), tests; the boundary
test (§5); `apps/demo/src/dev/depth-neuromuscular.ts` (draws the raw trace and spectrogram); `packages/renderer` (a
spectrogram strip, generic look).
- [ ] **Displays** what Ch36 says a monitor shows: the raw EEG over a 5–10 s window (p. 1137); the spectrogram (density
  spectral array) of about the last hour, 0–50 Hz, red high and blue low (pp. 1138–1139; Ch35 p. 1106); 2 s epochs
  (Ch35 p. 1106).
- [ ] **Numerics:** spectral edge frequency — "tracks anesthesia quite well", sensitive to eye-movement artefact when
  awake (Ch36 p. 1146); its percentile is not in Ch36 → `[OWNER P-14]`, default 95 % (the SEF95 named in the title of
  Chapter 23's reference 147, Bruhn 2003, full book); median frequency (Ch36 p. 1144); band powers (Table 36.1);
  suppression ratio — time in suppression over a 30–60 s window (Ch36 p. 1140), default 60 s [ENG: Miller's upper
  bound, the steadier]; suppression detection threshold 5 µV (Ch36 p. 1139) with a minimum duration `[OWNER P-8]`;
  impedance (Ch36 p. 1145: displayed by all monitors).
- [ ] **Flags:** `questionable` when impedance is over P-13 or unequal; `invalid` during a cautery burst (the reader
  detects it from the signal's power, not from the engine's event).
- [ ] **Label:** "Processed EEG (generic)".
**Acceptance:** C23–C25; the boundary test green. **Must not touch:** the BFA formatter. **Gate:** common.

### E6: The device layer, numerics and the monitor tile (plan 6 h · 0.8–1.0 executor-h)

**Depends on:** E5 (same PR). **Files:** `types-eeg.ts` (`EegDeviceAction`, `EegNumericId`), `types.ts` (union lines),
`l3/eeg-devices/registry.ts` (spec rows, D8), the neuro/EEG pipeline's 1 Hz emitter; `numerics-neuro.ts` (BFA reads
the chosen device's ids when an EEG device is on); `apps/demo/src/dev/depth-neuromuscular.ts`.
- [ ] **Red:** `device eeg on|off`, `device eeg model <id>` (only ids in the registry; others refused with a reason),
  `device eeg impedance <kΩ>`; validation as `validateNeuroCommand` does; numerics published at each device's own
  update interval (spec row; the generic reader 1 s [ENG]); `device depth` unchanged.
- [ ] **The BFA tile** shows the chosen device's index and SR (generic: SEF and SR) when an EEG device is on, today's
  `di`/`sr` otherwise. Saadat's SQI%/EMG% parts stay blank unless the chosen reader computes them.
**Acceptance:** E0 green; the BFA tile e2e unchanged with `device depth`; new unit cases for the commands. **Must not
touch:** skins' JSON (the mapping is in the formatter). **Gate:** common + the renderer's tests.

### E7: BIS-type reader — the published relations (plan 10 h · 1.3–1.7 executor-h)

**Depends on:** E6; **the owner's source ruling (Q2)**. **Files:** `l3/eeg-devices/bis-type.ts`, tests, a registry row.
- What Miller publishes: a weighted combination of several EEG components — band powers, burst suppression,
  coherence/bispectral and autoregressive terms — details proprietary (Ch36 p. 1147); a suppression ratio and the
  QUAZI sub-algorithm detecting the forme fruste, which contributes to the index (Ch36 p. 1140, citing Rampil 1998,
  Ch36 reference 45); artefact detection and rejection and reliable burst-suppression detection (Ch36 p. 1146); scale
  100 awake to 0 no detectable activity (full book p. 2169); trials titrated to 40–60 (Ch36 Table 36.4, p. 1149).
- What is a placeholder: the sub-parameters' bands, the regime weights and thresholds, the smoothing and update
  interval, and any EMG band → `[OWNER P-16]`, candidate source Rampil 1998 (Miller Ch36 ref. 45), which the owner may
  approve or replace with the maker's documentation.
- [ ] **Red:** with P-16 approved, the reader's sub-parameters each move in the published direction on E3's signal;
  without it, the PR stops after the tests that need no P-16 value and the registry row is not added.
- [ ] **Displays:** index, SR, (EMG and SQI only if P-16 defines them from the signal); label per Q8.
**Acceptance:** C26–C30 for BIS. **Must not touch:** other readers. **Gate:** common.

*Note, 12 Nov 2026 (E7 state):* built in **PR 427** (open, draft, in the merge queue; based on PR 424's branch) from
the owner's two papers, Connor 2022 (openibis, Table 1, followed line by line) and Rampil 1998 (the sub-parameters and
the bispectrum, which "enters no index"). Course on today's generator (40 y; hand-over 167, PR 427): awake 97.2,
sedation 87.2, loss of responsiveness 83.5, surgical depth **85.6**, burst suppression 0. Why surgical depth reads high:
"in Connor's mixer 40–60 needs the 40–47 Hz power concentration at about −31 to −26 dB and the engine's signal only
reaches −20.1 dB" — the generator's high-frequency power stays too high under deep propofol (Miller: "a marked fall of
beta and gamma", Ch36 p. 1139). The cause is the generator, not the reader (N128). **The owner ruled on 12 November
(N128 = A):** the generator's high-frequency spectrum under deep anaesthesia is corrected from published measured
spectra, a sourced number, never a fit to the index: **PR 437** (open). Bicoherence ≈ 0.165 at every depth: no phase
coupling in today's signal, as N120 expected. Not built, because neither paper defines them: EMG and SQI. Rampil's
SynchFastSlow cannot be computed as defined: its denominator area (40–47 Hz on both axes) lies at f1 + f2 ≥ 80 Hz,
above half of the 128 Hz the paper names, where the bispectrum is not defined (Rampil 1998 p. 994; PR 427). The
run-in: "the first ~30 s after switch-on, the index rests on few epochs and scatters (90, 67, 93 seen)"; "Connor
excluded the first 120 s as buffer run-in (p. 4)" (hand-over 167): put to the owner as Q13 (§10).

### E8: Entropy reader — State and Response Entropy (plan 6 h · 0.8–1.0 executor-h)

**Depends on:** E6; Q2. **Files:** `l3/eeg-devices/entropy.ts`, tests, a registry row.
- What Miller gives: the device and its two numbers, SE and RE (full book Ch23 p. 637); BIS, SE and RE interact
  additively for sevoflurane–remifentanil, with C50 for sevoflurane shifted up by 0.3 vol % with stimulation (Ch23
  p. 637, Heyse); entropy measures read higher in the elderly at loss of response (Ch36 p. 1145); a ketamine study of
  BIS and spectral entropy (Ch36 ref. 106, Hans 2005).
- The method: spectral entropy is the Shannon entropy of the normalised power spectrum over a band — a definition, not
  an invention; its bands (SE's and RE's, RE's reaching into the EMG range), normalisation, scales and window lengths
  are `[OWNER P-17]` (the maker's published description; not in Miller). RE − SE as the frontal-EMG indicator
  follows from the two bands once P-17 is set.
**Acceptance:** C26–C28, C31 for Entropy. **Gate:** common.

*Note, 12 Nov 2026 (E8 state; P-6, P-17):* built in **PR 433** (open, draft, **not accepted**) from Viertiö-Oja 2004
(Acta Anaesthesiol Scand 48:154–161) only, every constant with its page; the scale curve F read off the paper's Fig. 7.
The plan's premise above, "RE's reaching into the EMG range" as a reason for a faster channel (P-6), does not hold for
the published method: **SE and RE both end at 47 Hz** (p. 158), below the 125-Hz channel's 62.5-Hz limit, so both are
computable whole on this channel. What the channel cannot supply: the module's burst-suppression detection (its
artefact band is a 75-Hz high-pass at 200 Hz, p. 159), its cautery check (66–86 Hz, p. 160) and its ECG and pacer
subtraction (400-Hz sampling, p. 160). And the paper does not publish: the burst-suppression rule ("a fixed threshold",
no value; the filters' orders), the blink and movement rejection (p. 160: the stationarity test's characteristics and
rule sets not given), the Cn_limit value (p. 160), the windows between the two named ends (p. 155), the update interval,
and the on-screen component counts (the module's SE tops at 91, p. 159; the reader's grid gives a higher top, an
expected failure, not tuned). So no BSR is shown by this reader. Course (PR 433), SE/RE: awake 69/85, sedation 64/67,
loss of responsiveness 35/37, surgical 29/29, burst suppression 19/21. Not accepted until the root-cause piece for the
WebKit follower stall (N138) reports; the rate question is Q12 (§10).

### E9: Narcotrend reader — the stage classification (plan 8 h · 1.0–1.3 executor-h)

**Depends on:** E6; Q2. **Files:** `l3/eeg-devices/narcotrend.ts`, tests, a registry row.
- What Miller gives: the device's name and maker (full book Ch23 p. 637); that it could not reliably detect
  consciousness against the isolated forearm technique (Ch36 ref. 117, Russell 2006, in the IFT section p. 1148).
- Everything about the method — the stages and substages, their features and thresholds, the 0–100 index — is
  `[OWNER P-18]` (the maker's or its validation papers; not in Miller). Without it, E9 is not built.
**Acceptance:** C26–C28 for Narcotrend (direction). **Gate:** common.

*Note, 12 Nov 2026: **E9, Narcotrend: NOT BUILT.*** The owner ruled on 12 November: dropped from the build list now; he
writes to the maker; it returns to the list if they answer with a method that may be published (the project is open
source, so only a publishable method can be used). Brief 183 read six sources in three rounds and stopped each time,
nothing built (hand-over 183; N135):

| Source | What it gives |
|---|---|
| Kreuer S, Wilhelm W. The Narcotrend monitor. Best Pract Res Clin Anaesthesiol 2006;20:111–119 (the review) | the stage-to-index table (Table 1, p. 113); 128 samples/s, 12-bit, 0.5–45 Hz (p. 116); the 20 s segment classified every 5 s (p. 116); clinical index values (Table 2, p. 117). Features, discriminant functions, suppression criteria, smoothing: "in words" only |
| Schultz B et al. Der Narcotrend-Monitor. Anaesthesist 2003;52:1143–1148 (German) | the POOL of features tried in development (relative band powers, median, SEF95, spectral entropy, autoregressive parameters; p. 1144), not the selected subset; the classifier's type (multivariate, class probabilities for A–E; p. 1145); stage F by a verbal rule only ("Anteil und Intensität der … Suppressionslinien", pp. 1146–1147); the smoothing's form, not its weights (p. 1147); age-specific power limits named, not given (p. 1147); F1 = 4–0 (Tabelle 1, p. 1147) |
| Schultz B, Grouven U, Schultz A. Biomed Tech 2002;47:9–13 | the visual stage definitions and their band edges (pp. 9–10), not stated as the classifier's; "dynamical weights are used for smoothing" (p. 12), none given; automatic vs visual agreement 92 % within one substage, PK 0.90 (p. 11) |
| Kreuer S et al. Anesthesiology 2003;99:34–41, Appendix "Narcotrend Algorithm" (pp. 40–41) | the same description as the 2003 German paper, in English; no coefficients |
| Kreuer S et al. Br J Anaesth 2004;93:235–240 | cross-device sigmoid fits of the Narcotrend index against the BIS monitor's index and suppression ratio (p. 237), e.g. "a burst suppression ratio of 40% is related to a median BIS value of 25 but to a median Narcotrend index value of 12" (p. 239); F1 as "1–4" (Table 2, p. 237), called observed in its own study |
| Schultz A, Grouven U, Beger FA, Schultz B. Biomed Tech 2004;49:38–42 | a one-page method at the same level (p. 39, Fig. 1: boxes only); 128 samples/s, a 0.5 Hz high-pass, a 45 Hz low-pass "and a 50 or 60 Hz notch filter" (p. 39), filter orders not given; the cerebrogram's smoothed value "every 20 seconds" (p. 39); F1 = 4–0 (Table 1, p. 39) |

**Unpublished across all six:** the classifier's features and how each is computed; the discriminant functions (form
and coefficients, or class means, covariances, priors); the index's place inside a stage's range, and how E2 is
assigned; the suppression-segment definition and the stage-F function; the "sufficient similarity" threshold; the
smoothing (number of epochs, weights); the background parameters and the learned amplitude range; the artefact and age
rules; the filter orders, and whether the method depends on exactly 128 Hz.

**Sourced and kept** (for a later reader, or as acceptance numbers):
- the stage-to-index table, with **F1 = 4–0** by the developers' own papers (Schultz 2003 Tabelle 1 p. 1147; Schultz
  2004 Table 1 p. 39); the review and Kreuer 2004 print "1–4";
- the front end: 128 samples/s, 12-bit, 0.5–45 Hz, notch 50 or 60 Hz;
- the 20 s epoch, classified every 5 s;
- **Kreuer 2004's figures as acceptance numbers, never as a method** (a fit between two devices is not the device's
  method); also the review's Table 2 index values (baseline 94.4 ± 5.6; loss of verbal response 80.1 ± 6.8; loss of
  eyelash reflex 71.8 ± 8.9).

P-18 stays open (§10.1). Without the maker's answer, no reader carries the Narcotrend name (Q8: "by their name only if
their published method is used whole"), and none is relabelled from another reader's numbers.

### E10: Four-channel montage (plan 6 h · 0.8–1.0 executor-h)

**Depends on:** E4; Q10 ruled B (built). **Files:** `l2/eeg/montage.ts`, tests; `ChannelId` gains the montage's channels.
- [ ] The generator renders frontal and posterior channels from one cortical state: posterior alpha with eyes closed
  awake, lost at loss of responsiveness while frontal alpha appears (anteriorisation, Ch36 p. 1138; Ch35 p. 1106);
  occipital alpha returns at responsiveness with eyes closed (Ch36 p. 1142); delta spatially not synchronous, alpha
  widely synchronous (Ch36 p. 1143). Electrode sites `[OWNER P-19]` (the PSI device's montage).
**Acceptance:** C32. **Gate:** common.

### E11: PSI reader (plan 8 h · 1.0–1.3 executor-h)

**Depends on:** E10; Q2. **Files:** `l3/eeg-devices/psi.ts`, tests, a registry row.
- What Miller gives: the device name (Ch23 p. 637); its population pharmacodynamics — PSI values at 50 % probability of
  each clinical end point (Ch23 p. 633, Kuizenga 2019; Fig. 23.10, p. 635), used as acceptance cells C33; PSI and BIS
  compared for propofol (Ch23 p. 630, Soehle 2010).
- The method is proprietary and not in Miller → `[OWNER P-19]` for its features and scale. Without it, E11 is not
  built.
**Acceptance:** C26–C28, C33. **Gate:** common.

*Note, 12 Nov 2026 (P-19):* two papers are supplied for PSI and are in the library:
`library/sources/papers/eeg/drover-ortega-2006-patient-state-index-bprca.pdf` and
`library/sources/papers/eeg/prichep-2004-patient-state-index-bja.pdf` (confirmed present; not yet read for this
plan). For E10 and E11 to be buildable under the PSI name (Q8), they would have to contain, between them: the montage
(the electrode sites, E10); which quantitative EEG features enter the index, from which channels and bands, and how each
is computed (epoch, spectral estimator); the combining function with its coefficients (or an equivalent stated
classifier); the transform to the 0–100 scale; the suppression and artefact rules; and the smoothing and update
interval. Where a part is missing, the piece stops at it, as E9 did. The reading is the next piece after E8 in the
order of readers.

### E12: The depth window in the room (plan 7 h · 0.9–1.2 executor-h)

**Depends on:** E6 and one reader merged; room plan **R3, R4, R7** merged (the `show:'depth'` hello field, the picker,
Room setup). **Files:** `apps/demo/src/app/views/depth.ts` (new follower route `#/depth`), the picker card, Room
setup's model choice (as R5b does for the defibrillator), e2e `depth-window.e2e.ts`.
- [ ] The picker's "Depth of anaesthesia" card loses "Not available yet" and opens `#/depth`; Room setup picks the
  device model from the registry (only built readers); the host sends `device eeg model <id>` and `device eeg on`; the
  window is a follower (computes nothing the host did not command; its own engine renders the same samples, D3) and
  wears the generic look; one instrument per screen.
- [ ] While the ventilator drives, the window holds like every network follower (room plan Q4, E128).
**Acceptance:** e2e 3/3 local runs on chromium and webkit: a phone picks Depth, sees the host's device, the index
moves after a propofol bolus on the host; the room table shows `show:'depth'`. **Must not touch:** the relay, the
guard beyond R3's fields. **Gate:** common + the touched e2e.

*Note, 12 Nov 2026 (E12 state):* built in **PR 424** (open, draft, in the merge chain): the picker card opens `#/depth`;
Room setup chooses Off or one of the registry's readers; the host sends `device eeg on`, then `model <id>` (`on` must
come first: the engine refuses `model` while the EEG is off). The instructor's artefact controls (Q9, ruled into E12
on 6 November) were **left out of PR 424** (its brief did not carry them, N110) and are being built separately:
**E12b, PR 447**, branch `eeg-e12b-artefact-controls` (open). Found while building it: the follower's EEG differed from
the host's when the EEG was switched on after the follower joined, because `engine.restore()` ignored the snapshot's
seed (N109): **PR 445** (open). On WebKit the follower stood still in this piece's e2e file during PR 433's run (N138,
in the state table at the top).

### E13: Acceptance suite, known misses, docs (plan 6 h · 0.8–1.0 executor-h, last)

**Depends on:** the readers that merged. **Files:** `test/engine/eeg-acceptance.test.ts`; `docs/model/eeg.md` (hand
sections: equations in words, the placeholder table), `docs/validation/known-misses.md` (regenerated), glossary rows,
CHANGELOG, roadmap row.
- [ ] Every cell of §7.2 that has its inputs is a test titled with its source; a cell the mechanism misses is an
  expected failure with the measured number in its title (the house rule, `docs/model/integration.md`).
**Gate:** common; validation workflow.

### 7.2 Acceptance cells (each with its source)

"Direction" = the sign and the ordering are tested; "value" = the number is tested. A cell resting on a placeholder is
direction-only until the owner rules.

| Cell | Context → what is measured | Expected | Source |
|---|---|---|---|
| C1 | Awake, eyes closed, no drug → raw EEG | RMS ≈ 5–10 µV; beta base; artefact from blinks present | Ch36 p. 1138 ("∼5 to 10 µV"); Ch35 p. 1104 |
| C2 | Propofol to sedation | beta power ↑ in ≈ 15–25 Hz before loss of response | Ch36 p. 1138 |
| C3 | Propofol through loss of responsiveness | frontal alpha 8–12 Hz appears | Ch36 p. 1138; Ch35 p. 1106 |
| C4 | Propofol, surgical depth | alpha–delta: power in 0.1–4 Hz and alpha; beta and gamma ↓; peaks ≈ 40 µV | Ch36 pp. 1139, 1145 |
| C5 | Rising dose (any GABA-ergic) | aperiodic slope steeper (direction) | Ch36 p. 1139 |
| C6 | Sevoflurane rising past ≈ 1.7 % | >20 Hz power lost; alpha peak ≈ 10 → ≈ 7–8 Hz and fades; reverses on the way down | Ch36 pp. 1142–1143, Fig. 36.7 |
| C7 | Propofol at any depth short of suppression | alpha peak ≥ 10 Hz | Ch36 p. 1143 |
| C8 | Propofol target rising | burst suppression onset near 5 mcg/mL (median) | Ch36 p. 1141 ("about 5 mcg/mL") |
| C9 | Volatile rising | burst suppression from ≈ 1.3 MAC (Ch36) / >1.5 MAC (Ch35): `[OWNER P-1]` | Ch36 p. 1141; Ch35 Table 35.1 p. 1107 |
| C10 | Deepening suppression | suppressed stretches <5 µV; suppression lengthens with dose to isoelectric; forme fruste (>2 Hz drop-outs) precedes | Ch36 pp. 1139–1141 |
| C11 | Opioid alone, fentanyl-eq > 8 ng/mL | delta ↑, median frequency ↓; never burst suppression | Ch36 p. 1144; Ch35 pp. 1106–1107, Table 35.1 |
| C12 | Hypnotic + fentanyl bolus | little EEG change (index change small, direction ↓ or none) | Ch36 p. 1145 |
| C13 | Incision under light hypnotic, fentanyl-eq 0 vs > 4 ng/mL | beta arousal / alpha dropout without opioid; prevented above 4 ng/mL | Ch36 pp. 1141, 1145 |
| C14 | Ketamine 50 mg over 10 min on 0.7 MAC sevoflurane | alpha power ↓; every index ↑ or unchanged, never ↓ ("spurious elevation") | Ch36 p. 1144, Fig. 36.8 |
| C15 | Ketamine alone, hypnotic dose | large slow waves with gamma bursts; no burst suppression | Ch36 p. 1144; Ch35 Table 35.1 |
| C16 | N2O alone at steady state; N2O stepped on or off | minimal change; a large short-lived delta transient with alpha loss at the step; no suppression | Ch36 p. 1144; Ch35 Table 35.1 |
| C17 | Dexmedetomidine to unresponsiveness to voice | alpha–delta with ≈ 12 Hz spindle bursts, not continuous alpha; no suppression (closes known miss NN-19c's EEG half) | Ch36 p. 1144, Fig. 36.9; Ch35 Table 35.1; `research/15:324` |
| C18 | Awake patient given rocuronium (syringe swap) | EMG power → 0; BIS-type index falls toward the GA range though the EEG stays awake (no alpha–delta) | Ch36 p. 1148 (Schuller), Table 36.3 |
| C19 | Emergence with the tube in | broadband EMG rises; every index ↑ | Ch36 pp. 1133 (key points), 1142 |
| C20 | Diathermy burst | power ↑ at all frequencies; device flags the epoch | Ch36 p. 1146; D5 |
| C21 | Burst suppression with ECG pickup | spikes at the R waves; harmonic stripes moving with HR | Ch36 p. 1146 |
| C22 | Impedance above P-13 | device flag; noisier trace | Ch36 p. 1145 |
| C23 | Awake with blinks | SEF disturbed by eye movement (direction) | Ch36 p. 1146 |
| C24 | Displays | raw 5–10 s window; spectrogram ≈ 1 h, 0–50 Hz; 2 s epochs | Ch36 pp. 1137–1139; Ch35 p. 1106 |
| C25 | Suppression ratio | computed over 30–60 s; reads 50–80 % when suppression is targeted for protection | Ch36 p. 1140; Ch35 p. 1106 |
| C26 | Any index, awake → no activity | 100 awake toward 0 with no detectable activity; inversely related to hypnotic concentration | full book p. 2169 |
| C27 | Any index at the engine's surgical depth (propofol + opioid, no stimulus) | within 40–60 for BIS-type; other devices their own range `[OWNER P-16..19]` | Ch36 Table 36.4, p. 1149 |
| C28 | 80 y vs 40 y at the same age-adjusted hypnotic dose | lower amplitude, slope ≈ 20 % flatter; index higher at loss of response ("paradox of age") | Ch36 p. 1145, Table 36.3 |
| C29 | Noisy burst suppression | BIS-type may read high ("awake") — the false positive, reproduced not corrected | Ch36 Table 36.3, p. 1148 |
| C30 | Index vs consciousness | no single threshold: awareness possible from 40 to 90 across patients (the engine's consciousness stays its own level) | Ch36 p. 1147 |
| C31 | Sevoflurane + remifentanil, before vs after a standard stimulus | the sevoflurane C50 for BIS, SE and RE shifts up ≈ 0.3 vol % | full book Ch23 p. 637 (Heyse) |
| C32 | Four-channel: awake eyes closed → loss of response | posterior alpha lost, frontal alpha appears | Ch36 p. 1138 |
| C33 | PSI at 50 % probability of: no response to name / tolerance of shake and shout / of tetanic stimulation | propofol 46.7 / 41.5 / 29.5; sevoflurane 68 / 59.2 / 61.1 | full book Ch23 p. 633 (Kuizenga 2019) |
| C34 | Brain CBF falling (organs) | slowing with preserved voltage from 20 mL/100 g/min, loss of voltage toward 12 | Ch35 pp. 1105, 1122 |
| C35 | Core temperature falling on bypass | progressive slowing; complete suppression at 15–18 °C | Ch35 p. 1127 |

Cells C27, C29 and C31 depend on the reader's algorithm and run only for readers whose placeholders the owner has
approved.

*Misses recorded beside the cells, 12 Nov 2026* (measured on today's generator in the readers' course tests, written
as expected failures in PRs 427 and 433; **no cell above was changed**, nothing tuned):

| Cell | Reader | Measured | Cause as reported |
|---|---|---|---|
| C26 | BIS-type | the order of loss of responsiveness and surgical depth reversed by 2 points (83.5 vs 85.6) | the generator's 40–47 Hz power at depth (N128) |
| C26 | Entropy | awake SE 69, not above 80 | the awake trace's blinks (N140); the module's blink rejection unpublished |
| C27 | BIS-type | 85.6 at surgical depth, not 40–60 | the 40–47 Hz power concentration reaches −20.1 dB; 40–60 needs about −31 to −26 dB; PR 437 (N128 = A) |
| C27 | Entropy | original 0.482 (SE 29) at surgical depth; Viertiö-Oja 2004 gives no 40–60-type target ("adequate hypnosis and emergence" between 0.5 and 1.0 on the original scale, p. 159) | 78 % of R_low's power below 4 Hz |
| C28 | BIS-type | 89.31 vs 88.78: not reproduced (under one displayed point) | not established |
| C28 | Entropy | 50.5 at 80 y vs 63.9 at 40 y: the wrong way | not verified |
| C31 | Entropy | no shift | stimulus arousal 0.015 under remifentanil 0.1 µg/kg/min (N139) |

## 8. Partition, merge order, CI load

```
E0 ─► [E1+E2] ─► [E3+E4] ─► [E5+E6] ─┬─► E7 (Q2) ──┐
                         │            ├─► E8 (Q2) ──┤
                         │            ├─► E9 (Q2) ──┼─► E13
                         └─► E10 (built)┴─► E11 (Q2) ─┤
              [room R3, R4, R7 merged] ─► E12 ──────┘
```

Ten PRs (the lean cut of `research/42` §2.3: one PR per file chain; tests first in each):

| PR | Pieces | Plan h | Executor-h (÷8 – ÷6) | CI runs (PR + main) | Depends on | The owner's own time |
|---|---|---|---|---|---|---|
| 1 | E0 baseline | 3 | 0.4–0.5 | 1 + 1 | — | — |
| 2 | E1 cortical state + E2 spectra | 20 | 2.5–3.3 | 1 + 1 (+ validation) | PR 1 | P-1, P-2, P-4, P-5, P-7, P-12, Q4–Q6 |
| 3 | E3 generator + E4 artefacts | 14 | 1.8–2.3 | 1 + 1 (+ validation) | PR 2 | P-8 to P-11, P-13, P-15 |
| 4 | E5 generic reader + E6 device layer and tile | 14 | 1.8–2.3 | 1 + 1 | PR 3 | P-14; Q1, Q3 |
| 5 | E7 BIS-type | 10 | 1.3–1.7 | 1 + 1 | PR 4; P-16 | approve or supply the BIS source |
| 6 | E8 Entropy | 6 | 0.8–1.0 | 1 + 1 | PR 4; P-17 | the Entropy source |
| 7 | E9 Narcotrend | 8 | 1.0–1.3 | 1 + 1 | PR 4; P-18 | the Narcotrend source |
| 8 | E10 montage + E11 PSI | 14 | 1.8–2.3 | 1 + 1 | PR 3, PR 4; Q10, P-19 | the PSI source and montage |
| 9 | E12 depth window | 7 | 0.9–1.2 | 1 + 1 | PR 4, one of PRs 5–8, room R3/R4/R7 | — |
| 10 | E13 acceptance, docs | 6 | 0.8–1.0 | 1 + 1 (+ validation) | the merged readers | reads the model page |
| **All** | 14 pieces | **102** | **≈ 12.8–17.0** | **≈ 26–28 runs**: 10 PR + 10 main, ≈ 5 re-merge (≈ 1 in 2 on the PR 2–4 chain), ≈ 3 review-fix (≈ 1 in 3) | | not estimated in hours (calendar, `research/42` §2.2) |

- **Critical path:** PR 1 → 2 → 3 → 4 → 5 → 9 → 10 (seven merges). PRs 5–8 run in parallel after PR 4 (separate files,
  one registry row each; the later rebases the registry line). PR 9 also waits on the room plan's R3, R4 and R7.
- **The owner's sources are the long pole, not the code:** PRs 5–8 cannot pass their acceptance without his ruling on
  P-16 to P-19. Sending him §10.1 when PR 2 opens keeps them off the critical path as far as possible.
- **CI:** engine PRs (1–3, 10) run the engine's slow groups and the validation workflow; app PRs (4, 9) the browser
  suites. The run length after PR #279 (ci-faster: shards, documents-only path) was not measured for this plan;
  `research/42` §1.2's median before it was 61 min and ≈ 409 runner-minutes a run.
- *Note, 12 Nov 2026 (order):* PRs 1–4 merged on 8 November (PRs 316, 318, 320, 322). The readers' order now is
  BIS-type (PR 427), Entropy (PR 433), then the montage and PSI (row 8) when P-19's papers allow; row 7 (Narcotrend)
  is off the build list by the owner's ruling of 12 November (§7 E9). E12 (row 9) was built before the first reader
  merged and is the base of PRs 427 and 433 (PR 424).
- **Merge order:** 1, 2, 3, 4, then 5/6/7/8 as their sources arrive, 9, 10. Files shared: `types.ts` (PRs 3, 4, 8),
  `registry.ts` (PRs 4–8), `numerics-neuro.ts` (PR 4 only).

## 9. Dependencies and out of scope

- **Room plan:** R3 (`show:'depth'` on the hello), R4 (the picker card), R7 (Room setup and the device table) must
  merge before E12; R5b is E12's pattern for the model choice. Q4 of the room plan (followers hold while the
  ventilator drives) applies to the depth window.
- **Drug layer:** E1 adds `hypByClass` and `alpha2Eq` as additive bus outputs; the rows' PK/PD values are untouched.
  Dexmedetomidine's EEG potency is P-12.
- **Organs and thermal:** read only (CBF, PbtO2, core temperature, glycopenia).
- **Out of scope:** epileptiform spikes (sevoflurane, etomidate, hypocapnia; Ch36 p. 1143, Ch35 p. 1127); seizures;
  infants; xenon (Ch36 p. 1144: not modelled by the drug layer); multichannel connectivity and complexity indices;
  nociception indices (ANI, SPI, qNOX); auditory evoked potentials; replacing E2 by a biophysical thalamocortical model
  (a later stage behind the same interface, if the owner wants it); moving physiology onto the cortical state (Q4).

## 10. Questions for the owner (each with the default the plan uses if no answer comes)

**Rulings, 6 November 2026 (the owner):** Q1 A (generic processed EEG first, then BIS-type, Entropy, Narcotrend, PSI as
their sources are approved). Q2 A (published papers as the candidate sources, each still to be approved before its
piece is built). Q3 A. Q4 A, and the move of the physiology onto the cortical state is a later piece, recorded in
`research/41` as its own row. Q5 A, with a review of what more Miller says on the burst-suppression MAC before PR 2
(reported to the owner). Q6 A. Q7 A, with a review of Miller and an online search for published magnitudes before
PR 2 (reported to the owner; what is found replaces [ENG] values with tagged ones). **Q8 B: the devices carry their
own names (BIS, Entropy, Narcotrend, PSI) with a note on the tile and on the model page that the maker's algorithm is
proprietary and unavailable, so the reading is the published components only.** Q9: the artefact controls for the
instructor go into E12, the depth window, not into a separate later piece (the Devices sheet is being reshaped by two
other plans). **Q10 B: the four-channel montage (E10) is built, PSI is not deferred.** Q11 B: the owner checks the
Saadat BFA module's manual with the department; P-20 stays open until then.

1. **Which devices first?** Default: the generic processed-EEG monitor (raw EEG, spectrogram, SEF, SR: all published in
   Miller) as the first selectable instrument (PR 4), then BIS-type, Entropy, Narcotrend, PSI in that order as their
   sources are approved. qCON, NeuroSENSE, SNAP II and BARM (named, Ch23 p. 637) later.
2. **The sources per device beyond Miller.** Miller gives none of the algorithms. Default candidates, each needing your
   approval before its piece is built: BIS — Rampil 1998 (Miller Ch36 reference 45) or Medtronic's documentation;
   Entropy — GE's published description; Narcotrend — the maker's or its validation papers; PSI — Masimo's published
   description; for acceptance PSI also has Kuizenga 2019 (in Miller, C33). Which do you want, and do you have the
   makers' manuals?
3. **Does the present index stay as "generic" until the real ones exist?** Default: yes. `device depth` and its `di`/`sr`
   stay as today on the BFA tiles and in the two depth scenarios; the room slot stays "Not available yet" until PR 9;
   when an EEG device is on, the BFA tile shows that device instead.
4. **The physiology that reads today's index** (CMRO2 at burst suppression, ventilatory-drive sedation, the MAP
   set-shift, the awareness flag; `outputs.ts:24–33`, `drive.ts:183`, `pipeline.ts:323`). Default: unchanged (D7). The
   true coupling would read the EEG's cortical state (Ch36 p. 1141: burst suppression is induced to reduce the
   cerebral metabolic rate; Ch35 p. 1106) — that changes those numbers and the cells that pin them: a later piece if
   you rule it.
5. **Burst suppression with volatiles:** ≈ 1.3 MAC (Ch36 p. 1141) or > 1.5 MAC (Ch35 Table 35.1, p. 1107)? Default:
   onset 1.3, full by 1.5 (P-1).
6. **Band edges:** Ch36 Table 36.1 (alpha 8–12, beta 12–30) or Ch35 Table 35.1 (alpha 8–13, beta ≥ 13, theta 4–7)?
   Default: Ch36 for the engine's names; each device its own.
7. **Magnitudes Miller does not give** (§10.1). Default: the plan's [ENG] values, direction-only acceptance, until you
   supply sources.
8. **Screen labels for proprietary devices.** Default: "BIS-type (published components, not the maker's algorithm)"
   and likewise for PSI; Entropy and Narcotrend by their name only if their published method is used whole.
9. **Instructor controls for artefacts** (diathermy, poor electrode contact, blinks). Default: the engine events and the
   developer page in this stage; the instructor panel's buttons in a later panel piece.
10. **PSI needs four channels.** Build the montage (E10) or defer PSI? Default: defer until the single-channel devices
    are in.
11. **Which device is the Saadat monitor's BFA module** (BFI%, BS%, SQI%, EMG%)? Default: unknown (P-20); its SQI% and
    EMG% stay blank.

*Note, 12 Nov 2026 (Q9):* the ruling above puts the instructor's artefact controls into E12; the default text of
question 9 is superseded by it. PR 424 left them out; they are E12b, PR 447 (§7 E12).

*Questions added 12 Nov 2026, for the owner (not decided):*

12. **Does the EEG channel stay at 125 Hz?** (P-6)
    - *Plain explanation:* the plan kept a faster channel open in case a device needed frequencies above 62.5 Hz. The
      two readers built need nothing above 47 Hz: Entropy's SE and RE both end at 47 Hz (Viertiö-Oja 2004 p. 158), and
      the BIS-type reader's bands end at 47 Hz too. What 125 Hz cannot carry is three parts of the Entropy module: its
      burst-suppression detection (a 75-Hz high-pass at 200 Hz, p. 159), its cautery check (66–86 Hz, p. 160) and its
      ECG and pacer subtraction (400-Hz sampling, p. 160). But none of the three could be built at any rate, because
      the paper does not publish their rules (the burst-suppression threshold, the filters' orders, the subtraction
      method). The makers' own rates (BIS openibis and Narcotrend 128 Hz, Entropy 400 Hz) differ from 125 Hz; at
      125 Hz both readers keep the same frequency bins as the paper (0.5 Hz and 0.52 Hz).
    - *Options:* **A** keep 125 Hz; the three Entropy parts stay unbuilt and listed as unpublished; the question
      re-opens only if a source gives a rule that needs a band above 62.5 Hz. **B** move the channel to 500 Hz (an
      existing engine rate; the generator is rate-agnostic, D2) now, so that a future detector has the band; it gains
      no published method today, and its cost (the EEG baselines re-recorded, the readers' work per second) is not
      measured. **C** 128 Hz to match openibis and the Narcotrend front end: not an engine rate today, and it gives
      Entropy none of the three parts either.
    - *Proposal:* A.
13. **What does the BIS-type reader show in its first seconds after switch-on?** (E7)
    - *Plain explanation:* in the first ~30 s the index rests on few epochs and scatters (90, 67, 93 were seen,
      hand-over 167). Connor 2022 excluded the first 120 s of each recording as buffer run-in (p. 4); that is how the
      paper analysed its data, not a stated device behaviour. Neither supplied paper says what the real monitor shows
      while its buffers fill.
    - *Options:* **A** show the index from the first reading, as built (the scatter is visible). **B** show no index
      until the reader's own windows have filled (openibis's 30-s components and 63-s suppression ratio, Connor 2022
      Table 1). **C** show no index for the first 120 s, as Connor excluded them.
    - *Proposal:* B, until a manual of the real monitor says what it shows at switch-on.

### 10.1 Placeholders for the owner

| Id | What | Plan default | Where it would come from |
|---|---|---|---|
| P-1 | Volatile burst-suppression onset/full | 1.3 / 1.5 MAC | Ch36 p. 1141 vs Ch35 p. 1107 (conflict) |
| P-2 | N2O transient: rate threshold, duration | [ENG] visible only for a step ≥ 0.3 MAC within 1 min | not in Miller |
| P-3 | Children's amplitude factor | ×1 (adult) | Ch36 p. 1145 says "much higher", no number |
| P-4 | Neural-inertia size | 0 (none beyond ke0) | Ch36 p. 1142, no number |
| P-5 | Paradoxical arousal responses | off | Ch36 p. 1141, variable |
| P-6 | Sample rate for an EMG band above 62.5 Hz | 125 Hz | the BIS source (P-16) |
| P-7 | Peak powers and slope per level | [ENG] visible on the spectrogram | not in Miller |
| P-8 | Burst length; minimum suppression duration | [ENG] | not in Miller |
| P-9 | EMG amplitude | [ENG] | not in Miller |
| P-10 | Blink rate and size | [ENG] | not in Miller |
| P-11 | ECG pickup amplitude | 0 unless flagged | not in Miller |
| P-12 | Dexmedetomidine EEG potency | 2.0 ng/mL (one patient, Fig. 36.9) | a pharmacodynamic source |
| P-13 | Impedance limit | 5 kΩ | Ch36 p. 1145 gives "5 or 8 kΩ" |
| P-14 | SEF percentile | 95 % | Ch23 reference 147's title (Bruhn 2003); the device's own |
| P-15 | Diathermy gain on the EEG | [ENG] | not in Miller |
| P-16 | BIS-type sub-parameters, weights, smoothing, update | not built | Rampil 1998 (Ch36 ref. 45) or the maker |
| P-17 | Entropy bands, scales, windows | not built | the maker |
| P-18 | Narcotrend stages and features | not built | the maker or its validation papers |
| P-19 | PSI montage, features, scale | not built | the maker |
| P-20 | The Saadat BFA module's device | unknown | the department |

*Notes to the placeholders, 12 Nov 2026:*
- **P-6:** the premise does not hold for the two readers built (both end at 47 Hz); the rate is Q12.
- **P-16:** the owner's two papers, Connor 2022 and Rampil 1998; E7 built in PR 427 (EMG and SQI not defined by
  either, so not built).
- **P-17:** the source used is Viertiö-Oja 2004; E8 built in PR 433; what the paper leaves unpublished is listed at §7 E8.
- **P-18: stays open.** Six sources read (§7 E9); E9 is not built and is off the build list until the maker answers. A
  source would have to supply exactly: (1) which EEG features the classifier uses and how each is computed (spectral
  estimator, AR model order); (2) the discriminant functions, form and coefficients (or class means, covariances,
  priors) for stages A–E1; (3) how the classifier's output places an index value inside a stage's range, and how E2
  is assigned; (4) the suppression-segment definition (amplitude limit, minimum duration), its "intensity", and the
  function from proportion and intensity to the index in E2, F0 and F1; (5) the "sufficient similarity" or
  uncertainty threshold for withholding a classification; (6) the smoothing: number of preceding epochs, weights, and
  their dependence on background parameters, history and artefacts, and the cerebrogram's 20 s smoothing; (7) the
  background parameters and the learned per-recording amplitude range (update rule, width); (8) the artefact rules,
  including the age-specific signal-power limits, and any other age adaptation; (9) the filter orders and types, and
  whether the method depends on exactly 128 Hz.
- **P-19:** two papers supplied (§7 E11); what they would have to contain is listed there.

## 11. Self-review against the codebase (42da0eef) and the sources

| Claim | File and line, or page |
|---|---|
| The index is not BIS; its formula and hand corrections | `packages/engine-core/src/l2/neuro/depth.ts:1–7`, `:13–38`, `:84–110` |
| Displayed index smoothing τ 20 s | `depth.ts:126–129` |
| `di` null/questionable under EMG; `sr` 1 Hz while depth on | `l2/neuro/pipeline.ts:280–287` |
| Depth device on/off | `pipeline.ts:155–156`; `types-neuro.ts:42–45` |
| Physiology reads the index (CMRO2, MAP shift) | `l2/neuro/outputs.ts:24–33` |
| Drive sedation reads the index | `l2/neuro/drive.ts:183` |
| Awareness flag `diRaw > 60 && TOF ≤ 2` | `pipeline.ts:323` |
| Hypnotic equivalent, dissociative share, per-agent CNS outputs | `l2/pk/combine.ts:126–168` |
| Dexmedetomidine row without a hypnotic C50 | `l2/pk/data/rows-anaesthetic.ts:134–143` |
| Neuro agent and volatile ids | `l2/neuro/bus.ts:23`, `:26` |
| Brain summary fields | `types-organs.ts:35–41` |
| Channel ids; sample rates 500/125/62.5 | `types.ts:17–21`, `:188`; `engine.ts:423` |
| `Measured` flags | `types.ts:114` |
| ECG artefact state incl. electrosurgery | `l2/ecg/api-types.ts:125–141`; `l2/ecg/artefacts/front-end.ts:11` |
| BFA module tile and staleness | `packages/renderer/src/numerics-neuro.ts:16–20`; `alarm-view.ts:108` |
| Blank SQI%/EMG% parts | `packages/renderer/src/device-ui.ts:888–892` |
| BFA on Philips-like; always shown on Saadat-like with four parts | `packages/skins/src/data/skins/philips-like.json:19`; `saadat-like.json:48`, `:56` |
| Depth scenarios | `packages/controller/scenarios/depth-awareness.json:46`; `depth-light-anaesthesia.json:38` |
| Index acceptance test at 1 MAC | `packages/engine-core/test/engine/neuro-acceptance.test.ts:51` |
| Known miss NN-19c (dexmedetomidine does not move the index) | `research/15-coverage-neuro-nmb-depth.md:324` |
| The room's depth slot planned, not built | `docs/plans/room-and-instruments.md:431`, `:592`, `:722`; no match under `apps/demo/src` |
| Effort conversion | `research/42-ci-and-process-review.md` §2.1–§2.3 |
| Chapter 36 inside the Ch35 file, printed pp. 1133–1152 | the PDF's pages 40–63 |

Disagreements found while reading:
1. **The brief names "Ch35" for the depth section;** the depth section is Chapter 36, which the library's Ch35 file
   also holds (the room plan's §9a says the same). Pages are cited by printed page with the chapter number.
2. **The room plan's §9a cites "p. 2148 (Ch. 68)" for the 100-to-0 scale;** the sentence is on printed **p. 2169**
   (full book PDF page 2592, the ambulatory chapter); p. 2148 is the previous chapter's reference list. A one-line fix
   to the room plan, not made here (docs only, one PR).
3. **Burst suppression with volatiles** differs between the two chapters (≈ 1.3 vs > 1.5 MAC): Q5.
4. **Band edges** differ between Table 36.1 and Table 35.1: Q6.
5. **Today's index is also a physiology input** (CMRO2, drive, awareness flag), not only a display; the EEG stage keeps
   it so (D7) and asks Q4.
6. **Today's hypnotic equivalent merges agents whose EEG differs** and omits dexmedetomidine; E1's per-class split is
   additive and sums to it exactly.
7. **Miller does not describe Entropy's, Narcotrend's or PSI's algorithms;** the brief's "entropy measures as published
   for Entropy, the Narcotrend stage classification" therefore become placeholders P-17 and P-18 with the candidate
   sources named, not plan text.
