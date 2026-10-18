# Showcase 2: run sheet (30 minutes, the owner's slot)

*Thursday 2026-10-22 (slack to the 25th), university deans and clinical staff. Presenter: the owner. Kit round C,
2026-10-17: the kit-round-B sheet (PR #65) cut to the owner's confirmed slot of **30 minutes or less**, with his final
answers of 2026-10-17 applied and the kit-round-A3 measurements of 2026-10-17 folded in. The four cases dropped from
the slot are kept, unchanged, in the appendix "Cases held in reserve". Where something is still not measured, the
sheet says so and names why ("Still not measured", before the appendix). One number is a visible placeholder on
purpose: the MH "ventilation back" press time, **13:03 (as fast-forward 1 ends; any press from 12:41 is met)**.*

Companions: [`SHOWCASE-2-PRESENTER-GUIDE.md`](SHOWCASE-2-PRESENTER-GUIDE.md) (one page: what to remember, keys, the
alarm rule, the validation answer) and [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) (one printed page per case).

## The owner's answers built into this sheet (final, 2026-10-17)

These replace the round-B defaults D1–D6 [R00 2026-10-17 "OWNER ANSWERS"].

| # | Question | The owner's answer | Where |
|---|---|---|---|
| E17 | Which objectives the Debrief marks | **Meet every timed objective.** The one ✗ of the day is the tamponade's structural line "Better: pericardiocentesis before the pulse loss", **named as the lesson**, not a timing. Measured: exactly that one ✗ on this path [A3.1] | Case 2, §4 |
| E19a | MH: when to call | **At Early signs** (06:52) [MEAS §0, §1] | Case 3 |
| E19c | Slot length | **30 minutes or less.** The cases, in order: opening with the QR moment (3) · bronchospasm with the Ventilator view · tamponade → CPR → drainage with the Debrief moment · malignant hyperthermia with ×8 and the fast-forwards (early call) · close and the ask to the deans (3) · questions (4) | Programme |
| — | Dropped to the reserve | premed induction, plain induction, anaphylaxis, haemorrhage with Explore | Appendix |
| E20 | Monitor skin | **Saadat-style**, no style change during the talk (after a change to Philips-style the phones' AGENTS tile read "---" against the instructor's "0.0" for the 30 s watched, finding FX-9) [MEAS §8] | §1 |
| E21 | Limit alarms after a Load | **"All alarms on" after every Load stays a presenter step** (no code change). The **Bookmark is taken AFTER pressing it**: Return here then keeps the alarms on [A3.2] | every case |
| E22 | MH "ventilation back" objective | **Changed** (PR #69, fix-e22-mh-rule; owner ruling E23 keeps the 2-min hold, ordering A) to "hyperventilation kept until EtCO₂ < 40 for 2 min, then normalised"; normalising early is "not met" [R00 2026-10-17]. The presenter **keeps hyperventilating through the fast-forwards** and presses **EtCO₂ normal: ventilation back to 12 × 500** only at **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** | Case 3 |

## What changed in round C

1. **The programme is 30 minutes** (§ "The programme at a glance"). Three cases run; four are in the reserve appendix.
2. **Tamponade: the sheet's path is now measured**, both engines, on kit ca0d2dbb [A3.1]: CPR 3 s after the pulse loss
   (07:48 → 07:51), drainage 1 min 30 s into CPR (09:21), the return of circulation 93.7 s after the drainage (10:55),
   CPR stopped 2 s later, and the Debrief's only ✗ is "Better". Every ≈ in Case 2 is gone.
3. **Tamponade: the cue for stopping CPR is "systolic jumps to about 100 (compressions alone read about 70/33)"**, not
   "pressure climbs above 69/32". The compressions alone read 70–71/33 one minute after the drainage and still
   69–70/32–33 at the model's return; only 3 s later the line read 97–114 / 49–51 [A3.1; A3 "against the cue cards"].
4. **No `SPO2 NO PULSE` on the tamponade path**: CPR starts before it would sound [A3.1].
5. **The tamponade Debrief prints 6 A4 pages** on this path, 41 timeline rows, 12 minute rows (the Stage 13 path gave 5
   pages) [A3.1].
6. **Return here keeps "All alarms on" when the bookmark was taken after pressing it**; a bookmark taken before it brings
   back "Limit alarms off" [A3.2]. The order Load → All alarms on → speed → Bookmark is right.
7. **Bronchospasm: ×8 and the 2-min fast-forward are pressed from the Instructor view with the cockpit hidden**, measured
   safe: the cockpit kept driving the patient (11 690 / 11 681 contiguous frames, C / W), the phones kept their hold and
   stayed synced [A3.3].
8. **The speed stays ×8 after a fast-forward pressed at ×8** [A3.3; MEAS §7]: the cards say "back to ×1" where it is
   needed.
9. **MH: the hyperventilation is kept through the fast-forwards** (E22). The round-B instruction "ventilation back the
   moment Recovering shows" would now be "not met" [R00 2026-10-17], and it is what made the EtCO₂ rebound to 57–61
   with `ETCO2 TOO HIGH` [KR62 MH C]. Kept on through span 1, the EtCO₂ read 38 at 12:55; after the press at 13:03 it rose to a peak of 55
   inside span 2 (`ETCO2 TOO HIGH` 14:13), read 45 after span 2 and 42 at the end [MEAS E22].

The round-B corrections that still hold on the 30-minute path: "All alarms on" after every Load [MEAS §7]; tamponade
CPR from the PEA state, never from `SPO2 NO PULSE` [MEAS §0, §5]; stop CPR only on the return of circulation, never on
the compression pressure (a probe that stopped on it re-arrested the patient) [MEAS §5 probe]; the CVP is on the IBP2
tile [MEAS §5]; MH potassium is "not assessable" on the early path [MEAS §0, §1]; the speed after a fast-forward is
unchanged [MEAS §7]; a higher-priority alarm ends an alarm pause [R00 2026-10-12]; there is no on-screen version label
[MEAS §7]. The corrections about the reserve cases sit with them in the appendix.

## How to read this sheet

- **Sim** is the session-bar clock (scenario clock, Load = 0:00). **W** is the wall-clock time from pressing **Load**,
  in m:ss, as **measured** in the kit rounds (Chromium unless marked; WebKit agreed to a few seconds), with a scripted
  reaction of 2 s of wall after each cue [MEAS header: `KITROUND_REACT_S`]. **T+** is the time into the 30-minute slot.
- A fast-forward takes **10.0–10.6 s** of wall time, 2 min and 5 min alike, and **leaves the speed as it was**
  [MEAS §7; A3.3].
- **Boxed words** are the exact on-screen labels, from the card files and the kit-round rows. "C / W" = Chromium /
  WebKit.
- Monitor numbers are what the kit round read on the instructor's monitor. Real presses land a few seconds
  differently, so expect ± a few units [R45 tolerances HR ± 5, pressures ± 5, SpO₂ ± 2, EtCO₂ ± 3, via the draft].
- **The A3 runs were made under heavy load** (load average 4.8–18.1: the release executor shared the Mac). No press was
  lost and every state was taken on the first press [A3 "Load"].
- Each bracket names its source. Source keys:

| Key | File |
|---|---|
| MEAS | `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` (kit round A, 2026-10-13; § numbers) |
| A3 | the same file, section **A3** (kit round A3, 2026-10-17, kit `pme-showcase-kit-ca0d2dbb`; PR #67, branch `kit-round-a3`); raw rows in `docs/showcase/kit-round-a/a3-*` |
| KR | `docs/showcase/kit-round-a/<case>-kit-round-<chromium/webkit>.md` (the raw rows). "KR62" = the files ending `-kit-62e521c3` (the re-check on the fixed kit). "KR MH early-call" = `malignant-hyperthermia-early-call-kit-round-*.md` |
| G10 | `docs/gates/stage-10.md` (Stage 10 dry run, time control) |
| G11 | `docs/gates/stage-11.md` (Stage 11 gate; §3 the engine-level numbers S1–S5) |
| RS11 | `docs/gates/stage-11/run-sheet-numbers.md` (Stage 11 browser rehearsal, limit alarms OFF) |
| P11 | `docs/plans/stage-11-scenarios.md`, "Order and durations" |
| G12 / G12P | `docs/gates/stage-12.md` / `docs/gates/stage-12-real-phone.md` (phones; the owner's step) |
| CR12 | `docs/showcase/CLASSROOM.md` (also `_sandbox/pme-classroom-dryrun/CLASSROOM.md`) |
| PF / OPT | `_sandbox/pme-classroom-dryrun/PRE-FLIGHT.md` / `OWN-PHONE-TEST.md` |
| KIT | `_sandbox/pme-classroom-dryrun/kit/VERSION.txt`; `_sandbox/pme-kit-main-62e521c3/README.txt` |
| G13 / DB-T / DB-MH | `docs/gates/stage-13.md` / `docs/gates/stage-13/rehearsal/debrief-tamponade-*.json` / `debrief-mh-*.json` (kit 58b2c13c) |
| PRINT | `_sandbox/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt` |
| CARD | `apps/demo/src/app/showcase/showcase-*.json` (objective text, Debrief rule, states, button labels) |
| F11A / F11B / F11D | `docs/gates/fu-11-a.md` / `fu-11-b.md` / `fu-11-d.md` |
| RUN4 / SC1 | `docs/showcase/RUN-STEPS.md` (showcase 1) / `_sandbox/pme-showcase-docs/run-sheet.pdf` (showcase 1's printed sheet) |
| R00 / R24 / R25 / R31 | `research/00-orchestrator-rulings.md` / `24-showcase2-probes.md` / `25-owner-questions-2026-10-07.md` / `31-owner-decisions-2026-10-12.md` |
| ADD2 | `research/15-review-pack/addendum-2/index.html` (owner boxes H17–H19, E13–E15) |
| SYN | `research/30-parts/99-synthesis.md` (the target audit's synthesis) |
| RM | `docs/roadmap/README.md`, `docs/roadmap/v1.0-remaining.md`, `docs/roadmap/v2.0/README.md` |
| SKIN | `packages/skins/src/data/skins/saadat-like.json`, `philips-like.json` |

## The programme at a glance (30:00)

The run times are measured; the talk allowances are planning figures, not measurements [showcase 1 used 5 min for
bronchospasm, SC1 "Order for a clinical audience"]. The 30-minute run has not been rehearsed end to end ("Still not
measured").

| # | Segment | Speeds used | Run (W, measured) | Slot | Clock (T+) |
|---|---|---|---|---|---|
| 0 | Opening + the QR moment | — | — | **3:00** | 0:00–3:00 |
| 1 | Severe bronchospasm with the Ventilator view (+ the Explore line) | ×4, ×8, two 2-min FF | **1:27** to 8:44 [KR bronchospasm C] + the reload | **5:00** | 3:00–8:00 |
| 2 | Stab wound: tamponade → CPR → drainage | ×8, ×1, ×4 | **3:35** to the crystalloid at 11:28 (W 3:36) [A3.1 raw C / W] | **5:30** | 8:00–13:30 |
| 3 | The Debrief moment (tamponade report, print) | — | — | **3:30** | 13:30–17:00 |
| 4 | Malignant hyperthermia, early call | ×8, ×4, three 5-min FF | **1:49** to 23:34 on the E22 path, ordering A (press at 13:03) [MEAS E22]. It includes the three spans (10.4–10.6 s each, ≈ 31–32 s) [MEAS §1] | **5:30** | 17:00–22:30 |
| 5 | Close: roadmap and the ask to the deans | — | — | **3:00** | 22:30–25:30 |
| 6 | Questions | — | — | **4:00** | 25:30–29:30 |
| | Buffer (a re-press, a "Not available now", a slow Load) | | | **0:30** | 29:30–30:00 |
| | **Total** | | | **30:00** (25:30 before questions) | |

**Minute by minute inside the case slots** (planning figures around the measured runs):

| T+ | What | Length |
|---|---|---|
| 3:00 | Scenario → **Airway and breathing** → Severe bronchospasm: **Load · All alarms on · ×4 · Bookmark**, then top bar **Ventilator** | 0:20 |
| 3:20 | the bronchospasm run, narrated (salbutamol at W 0:33; the span, ×8 and the second span from the Instructor view) | 1:27 |
| 4:47 | **×1**; the salbutamol talk: what recovered on the ventilator, why the phones hold | 1:33 |
| 6:20 | the Explore line (optional, first case item to cut) | 0:30 |
| 6:50 | **Reload** (Cmd-R), **Sound on**, Scenario → **Showcase** | 0:40 |
| 7:30 | buffer inside the slot | 0:30 |
| 8:00 | Tamponade: **Load · All alarms on · ×8 · Bookmark** | 0:15 |
| 8:15 | the tamponade run, narrated, to the crystalloid | 3:35 |
| 11:50 | the talk: CPR alone cannot bring him back; the better course; the known miss | 1:40 |
| 13:30 | **Debrief** (§4): open, Run by, the objectives, the lesson, facts, timeline, print | 3:30 |
| 17:00 | Scenario → **Showcase** → Malignant hyperthermia: **Load · All alarms on · ×8 · Bookmark** | 0:15 |
| 17:15 | the MH run, narrated, with three 5-min spans and the E22 press | 1:49–2:05 |
| ≈ 19:15 | the talk: the early call against the late call; why the hyperventilation stays on; the honesty items | ≈ 3:15 |
| 22:30 | Close and the ask | 3:00 |
| 25:30 | Questions | 4:00 |
| 29:30 | buffer | 0:30 |

> **If running over, cut in this order**
>
> 1. **Questions** (4:00 → 2:00, then out).
> 2. **The MH third fast-forward**: end the case at the point after span 2 (18:20, EtCO₂ 45 [MEAS E22]),
>    provided **the E22 press has already been made**; saves its 10.4–10.6 s of wall [MEAS §1] and about 0:30 of talk.
> 3. **The bronchospasm Explore line** (0:30).

---

## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)

Owner questions this checklist depends on: **E13** which Mac presents and its Node.js, **E14** the network for the
phones [R31 §3]. Tick every line.

**The kit** (matches `PRE-FLIGHT.md` [PF])
- [ ] The kit is built from **main at 62e521c3 or later**: the kit's `VERSION.txt` line `Commit:` reads `62e521c3…` or a
      later main commit [KIT: "Commit: 62e521c37df5…", built 2026-10-13]. Older kits (51a37063 to 56f3761f) have the
      relay that dies at the first phone (KR-A1) [MEAS §9 item 1]. A3 ran on a ca0d2dbb kit, relay test 2 of 2 [A3].
      **For the MH card: a kit that carries the E22 rule (PR fix-e22-mh-rule) once it is merged**; on an older kit the
      Debrief's MH ventilation line still uses the old rule.
- [ ] **The relay test passed**: the kit's README says `check-relay.mjs` **PASS** (the 62e521c3 kits: 2 of 2 runs)
      [KIT README; MEAS §11]; and on this Mac, 10 s after the simulator opens, the black window still says **THE
      CLASSROOM IS RUNNING** [PF §2].
- [ ] Presenting Mac has **Node.js 22 or later**: Terminal `node -v` prints `v22…` or later; otherwise install the LTS
      from nodejs.org [PF §1; KIT: `runtime/` left empty, the Mac's own Node is used].
- [ ] Double-click **Start Classroom**; its window says **THE CLASSROOM IS RUNNING** and lists "learners' phones reach it
      at: http://…"; click **Allow** if macOS asks about "node"; the browser opens `http://127.0.0.1:8650/?relay#/`.
      Keep the black window open all session [PF §2].
- [ ] Fallback launcher ready: **Start Simulator** (no phones) [CR12 "(c)"]. The fallback kit and this sheet on a USB
      stick [R00 2026-10-03 "three layers"].
- [ ] One browser window, zoom 100 %, at least about 1280 px wide (narrower, the panels overlap) [SC1 "Avoid"]. The kit
      round measured at 1440 × 900 [MEAS header].
- [ ] Close other heavy apps. The kit round ran at a load average of 1.3–4.9 and A3 at 4.8–18.1 with no lost press;
      earlier gates lost presses under heavy load [MEAS header; A3 "Load"; G13 §6: one lost epinephrine press at load
      ≈ 200].

**The owner's hand checks** (all ticked before the day; [R31 §2; G12P])
- [ ] **H17** your own phone through the Showcase cards over the hotspot, on the 62e521c3 (or later) kit; fill
      `OWN-PHONE-TEST.md` [OPT; G12P: PENDING-OWNER]. (Kits before 62e521c3 could not pass it: KR-A1 [R00 2026-10-13].)
- [ ] **H18** the fast-forward look in real Safari: dimmed AND blurred page, amber "FAST FORWARD · 5 MIN" panel, clock,
      banner, waveform seam [R31 H18; G10 §6: WebKit screenshots cannot capture the blur]. Not re-checked in the kit
      round [MEAS §10].
- [ ] **H19** hidden tab: the Instructor page behind another tab for at least 6.5–7 min in real Chrome and Safari, then
      Bookmark or a command: the monitor is live, no "The monitor stopped" message [R31 H19; F11A §5: never measured on
      any machine].
- [ ] **H20** the second screen in real Safari follows within 5 s [R31 H20].
- [ ] **H21** bronchospasm with the Ventilator view, the main screen on the Monitor view for 30 s: the phone keeps its
      hold and EtCO₂ stays steady [G12P H21]. **Passed in the kit round on both engines** (phones held on every 2-s
      sample; EtCO₂ 34–35 → 33–34; 6 020 / 6 017 contiguous cockpit frames) [MEAS §6], **and in A3 for the Instructor
      view with ×8 and a 2-min span** (11 690 / 11 681 contiguous frames, phones held) [A3.3]. Playwright's WebKit is
      not Safari: the real-Safari check is still yours.
- [ ] **Print** the tamponade Debrief in Chrome and Safari [R31 "Print"; PRINT]. A3 printed it to PDF from Chromium
      (6 A4 pages) and took only a print-media screenshot in WebKit [A3.1]: a real print dialog in either browser is
      still yours.

**Monitor style** (the owner's answer E20)
- [ ] Settings → Monitor: **Saadat-style** (the default). On it, **Pause alarms** is greyed out with "This monitor has
      no alarm pause. Silence mutes for 120 s." [MEAS §7].
- [ ] Do not change the monitor style during the talk (FX-9) [MEAS §8].

**Limit alarms** (the factory state, and the state after every Load, is "Limit alarms off"; the owner's answer E21)
- [ ] Instructor → **Devices & alarms** → **All alarms on**: the top-right alarm button then reads **No alarms** [KR
      setup rows: "Limit alarms off" → "No alarms"].
- [ ] **After EVERY Load, press All alarms on again, and only then Bookmark.** Loading a case turns the limit alarms
      off, in every case, on both engines [MEAS §7]; a bookmark taken after the press brings the alarms back on with it
      [A3.2]. The cases below put it in their first row.
- [ ] Why: with limit alarms off only `CO2 APNEA`, `SPO2 LOW PERFUSION`, `IBP1 STATIC PRESSURE`, `SPO2 NO PULSE` sound
      [G11 §4 finding 1].
- [ ] **After a page reload**: All alarms on is lost and Sound on is lost; the session code is kept, the case is gone
      (no scenario loaded), and the phones are still synced 15 s later, following the reloaded page [MEAS §7].

**Sound**
- [ ] Projector/room speakers connected; click **Sound off** (it turns to **Sound on**) and hear the beat tone at ×1.
      Sound by ear was not checked in the kit rounds (headless) [MEAS §10]: do it now.
- [ ] At ×8 there is no beat tone (by design) [G10 §6b]; a fast-forward ends with one two-tone cue [G10 §6].

**Network and the QR relay test (one phone)**
- [ ] Choose the network (E14): ☐ venue Wi-Fi ☐ travel router (recommended for 30 phones) ☐ the Mac's hotspot ☐ none
      (Start Simulator + second screen) [PF "Decide"; CR12 "(b)"]. Hotspot capacity was NOT measured [MEAS §10].
- [ ] Monitor view → pointer to the top edge → **Phones**; the code shows `http://<this Mac's address>:8650/?join=…`,
      never the hosted https site [PF §3, §5].
- [ ] Scan with your own phone: within a few seconds it shows the monitor upright and the sheet says **1 phone
      following** [PF §3]. Tap **Sound off** on the phone: alarms heard; tap again: silent.
- [ ] Lock the phone 60 s, unlock, note how long until "Following" again: ___ s (over 15 s becomes a follow-up) [OPT].
- [ ] Venue Wi-Fi: if the phone says "this phone cannot reach the instructor's laptop", the Wi-Fi isolates devices: use
      the router or hotspot [PF §4].

**Last minute (T−10 min)**
- [ ] Reload the page fresh; **Sound on**; **All alarms on**; Monitor view on the projector; the QR sheet ready.
- [ ] On the Instructor panel's **Scenario** tab: **Severe bronchospasm on the ventilator** is in the **Airway and
      breathing** chip [CARD: category]; **Stab wound: tamponade, PEA and pericardiocentesis** and **Malignant
      hyperthermia** are in the **Showcase** chip, with the four reserve cards [P11 "Order and durations"].

---

## 2. Opening (T+0:00 → 3:00)

| T+ | Do | Say (draft) |
|---|---|---|
| 0:00 | Monitor view on the projector, no case running | *"This is an open-source anaesthesia teaching simulator: a patient monitor, an instructor's panel and a ventilator, driven by a physiological model. It is for education only. It is not a medical device and never for patient care. What you see is the pre-release of version 1.0."* [footer text from PRINT; release label "v1.0.0-rc.1, pre-release", R31 §4]. There is **no version label on screen**: the only version text is the Debrief's build footer [MEAS §7]. Do not point at a label |
| 0:30 | **The QR moment.** Pointer to the top edge → **Phones**. The QR fills the screen, with the address, the 6-letter code and "0 phones following" [CR12 "The QR moment"] | *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your phone: it follows what I do here. It is silent: tap Sound off if you want to hear it."* [CR12] |
| 0:45–2:15 | Watch the count rise ("12 phones following"). A phone that does not open: is it on that Wi-Fi? (mobile data cannot reach the laptop) | One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen" [CR12 "What the room sees"] |
| 2:15 | **Close**. Phones are now following before any case is loaded | *"Your phone follows speed, pause and fast-forward. When I open the ventilator, your phone will wait: the ventilator lives on the main screen."* [CR12] |
| 2:30 | Instructor → **Scenario** → **Airway and breathing** | *"Three cases. Every number you will see is produced by the model; the buttons only give what their label says."* [CARD notes: "MODELED: the physiology produces every change; the buttons only give what their label says."] |

Measured capacity, if asked: 30 phones cost the relay under 2 % of one core; each phone receives about 1.3 KB/s at ×1 and
10.5–11.7 KB/s at ×8; at 120 simulated phones relay CPU ≤ 2 %, lag p95 ≤ 2.8 ms [G12 §5]. In the kit rounds three
emulated phones followed every case with no stale reading [MEAS §8; A3.1 "Phones"].

---

## 3. The cases

**Every case starts the same way: Load → All alarms on → set the speed → Bookmark.** Loading turns the limit alarms
off [MEAS §7]; the Bookmark, taken after All alarms on, is the "Return here" fallback and brings the alarms back on
with it [A3.2] (§7).

While the amber fast-forward panel shows, the page refuses commands: do not press card buttons during it
[G10, Stage 10 plan D-6]. **The speed after a fast-forward is the speed before it** (×4 stays ×4, ×8 stays ×8): set the
next speed yourself, and press **×1** when you want to talk in real time [MEAS §7; A3.3].

**What the audience sees during a fast-forward** (the same on the projector, the second screen and the phones): the page
dimmed and blurred, an amber panel "FAST FORWARD · 5 MIN" (or "· 2 MIN") with a running clock over a progress bar and
"sound muted", for **10.0–10.6 s** [MEAS §7]; the beat tone is off above ×4 [G10 §6b]; at the end one two-tone cue, a
seam with its time on every waveform lane, a banner "Fast-forwarded N min, mm:ss → mm:ss. During it: …" listing the
alarms raised, and those alarms latched silently on the monitor until the next acknowledge [G10 §6]. The phones show
the panel too and resync at its end [MEAS §8].

**Monitor style:** Saadat-style, no change during a case (E20) [MEAS §8].

### Case 1: Severe bronchospasm on the ventilator (Ventilator view). Slot 5:00 (T+3:00 → 8:00)

Card: *Severe bronchospasm on the ventilator*, chip **Airway and breathing** (not Showcase) [CARD]. States: Severe
bronchospasm → Salbutamol given: ventilation recovering [CARD].

Rules: **load the case first, then open the Ventilator view** (it takes over ventilation) [RUN4 header]; the phones hold
and say "The ventilator is on the main screen" until the next case [CR12; MEAS §6]. The session bar (speed, 2 min,
Bookmark) is on the **Instructor** view only: go to **Instructor** to press it, then back to **Ventilator**. **Pressing
×8 and the 2-min fast-forward from the Instructor view, with the cockpit hidden, is measured safe**: the cockpit kept
driving the patient through ×8 and the span (11 690 / 11 681 contiguous frames, C / W), the phones kept their hold and
stayed synced, and the speed was still ×8 after the span [A3.3]. The VTE and minute-volume numbers below come from the
13 October run, which sent the same commands through the ventilator link from the Ventilator view [MEAS §6].

| W | Sim | Speed | Press / do | Point at (measured, C and W identical) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on**, **Bookmark**, then top bar **Ventilator** (opened at 00:27) | `%SPO2 LOW` at 00:28; lowest SpO₂ 87 % at 00:30 [MEAS §6] |
| 0:22 | 1:27 | ×4 | — | **before salbutamol: VTE 300 mL, Ppeak 35, expiratory minute volume 4.2 L/min, banner "⚠ High pressure (Pmax)"**; monitor EtCO₂ 32 [MEAS §6] |
| 0:33 | 2:08 | ×4 | **Instructor** → **Give salbutamol 250 µg** → back to **Ventilator** | salbutamol at 02:08 [MEAS §6] |
| ≈ 1:01 | 4:03 | — | **Instructor** → **2 min** fast-forward (the cockpit keeps ventilating, hidden), then **×8**; back to **Ventilator** | 10.4 s of wall; "During it: no alarms" [KR bronchospasm C]; cockpit and phones as A3.3 |
| 1:14 | 6:16 | ×8 | point; then **Instructor** → **2 min** fast-forward again (×8 stays ×8 after it); back to **Ventilator** | 4 min 08 s after salbutamol: **VTE 501, Ppeak 34, MV 7.0**, no Pmax banner (the banner now reads "⚠ Intrinsic PEEP"); EtCO₂ 33–34 [MEAS §6; KR bronchospasm C] |
| 1:27 | 8:44 | ×8 → **×1** | end: **Instructor → ×1** (the speed is still ×8 after the span [A3.3]); talk; then **reload the page (Cmd-R)** before the next case | 6 min 36 s after: **VTE 501, Ppeak 32, MV 7.0**; EtCO₂ 34; the ventilator reads "No active alarms" [MEAS §6; KR bronchospasm C] |

**Say:** narrate the delivered tidal volume and minute volume recovering (300 → 501 mL, 4.2 → 7.0 L/min) and the
high-pressure banner going out [MEAS §6]. The phones wait on "The ventilator is on the main screen": the ventilator is
a real cockpit driving the patient, and it lives on the main screen [CR12; MEAS §6]. The H5 numbers of FU-11 B
(311 → 498 → 501) still hold within 11 mL [MEAS §6].

**The Explore line** (optional, 0:30; the third thing to cut if running over). Spoken only, no press: *"What you see on
the monitor and the ventilator is the surface. A real monitor shows a handful of numbers; here the model carries the
whole body behind them, and an instructor can open it while a case runs: that is the Explore physiology view."* The
Explore view itself is not opened on the 30-minute path: its only measured use is the haemorrhage case, now in reserve
(R4) [MEAS §4]. Opening it during bronchospasm was not measured.

**Reload before tamponade.** A Ventilator view opened earlier in the page once kept ventilating a later patient, which
then did not arrest [R00 2026-10-04 "CRITICAL DEMO RULE"; SC1 rule 5]. FU-11 H6 now unloads the cockpit on a new
patient [F11B H6], but the reload is the measured-safe path. After the reload: **Sound on** again (a reload loses it),
then Load the next case and **All alarms on** as always; the session code is kept and the phones are still synced 15 s
later [MEAS §7].

**Debrief objectives and the expected verdict** [CARD; MEAS §6] (not opened on the day): – recognise bronchospasm (the
instructor judges it) · ✓ treat with a bronchodilator (salbutamol at 02:08) · – watch VTE and minute volume recover
(the instructor judges it). 16 timeline rows [MEAS §6].

### Case 2: Stab wound: tamponade, PEA and pericardiocentesis. Slot 5:30 (T+8:00 → 13:30)

Card: *Stab wound: tamponade, PEA and pericardiocentesis* (Showcase). States: Arrival → Deteriorating: systolic below
80 → PEA → CPR, ventilated with FiO₂ 1.0 → CPR: pericardium drained, catheter left in → Return of circulation →
Post-ROSC: 500 mL crystalloid running [CARD]. **Start CPR, intubate, FiO₂ 1.0** is offered only once the card is in
**PEA**; **Pericardiocentesis during CPR** only during CPR [CARD transitions]. Start on the freshly reloaded page.

The owner's answer E17: meet every timed objective. **This path was run as written, both engines, on 17 October**
[A3.1]: every row below is measured.

| W | Sim | Speed | Press / do | Point at (measured; C, W within 1 unit unless given) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | `CVP MEAN TOO HIGH` at 00:22 [A3.1] |
| 0:08 | 1:00 | ×8 | Name it aloud: tachycardia, narrow pulse pressure, raised CVP. Tick objective 1 on the Scenario tab (before 3:00) | HR 97, ART 105/85 (91), SpO₂ 98, EtCO₂ 32 [A3.1 raw 01:04]; **the CVP is the IBP2 tile: 17** (limits −5–15) [MEAS §5; A3 "matched as written"] |
| 0:45 | 6:00 | ×8 | — | `SPO2 LOW PERFUSION` 05:59, `ART SYS TOO LOW` 06:06; state Deteriorating 06:14 / 06:13 (C / W) [A3.1] |
| 0:53 | 7:00 | **×1** | slow down for the arrest | HR 147, ART 62/54 (57), EtCO₂ 21 [A3.1 raw 07:06]; then `ART MEAN TOO LOW` 07:03, `HR TOO HIGH` 07:10, `ART DIA TOO LOW` 07:17, `ETCO2 TOO LOW` 07:21 [A3.1] |
| 1:18 | 7:31 | ×1 | `IBP1 STATIC PRESSURE`: **the arterial trace is going flat.** Hand on the Scenario tab | [A3.1]; then `HR TOO LOW` 07:45 [A3.1] |
| 1:36 | **7:49** | ×1 | state **PEA** (07:48 is the pulse loss) → **Start CPR, intubate, FiO₂ 1.0 AT ONCE**. Do NOT wait for `SPO2 NO PULSE` | at the state: HR 45, arterial mean only ≈ 21, EtCO₂ 14 [A3.1 raw 07:49]. CPR at **07:51**, 2 s after "PEA" [A3.1]. The rule is 10 s from **07:48**: press by **07:57**. On this path `SPO2 NO PULSE` never sounds [A3.1]; on a late path it comes at 07:58, already too late [MEAS §5] |
| 1:39 | 7:53 | **×4** | set ×4 | — |
| 1:58 | 9:00 | **×1** | set ×1 | CPR alone, before drainage: **40/19 (27), EtCO₂ 9**, HR 114 [A3.1 raw 09:05] |
| 2:15 | **9:21** | ×1 | **Pericardiocentesis during CPR** (1 min 30 s into CPR; the rule is 120 s: press by **09:51**). If "Not available now": press again | drained at 09:21, 1 min 30 s into CPR [A3.1]; the line still 41/20 (28) [A3.1 raw 09:22] |
| 2:15 | 9:22 | **×4** | set ×4 | — |
| 2:30 | 10:22 | **×1** | set ×1; watch the arterial line | one minute after drainage, compressions only: **71/33 (46) C / 70/33 (46) W**, EtCO₂ 17. **This is the compressions, not a pulse: do NOT stop** [A3.1] |
| 3:02 | **10:55** | ×1 | **the return of circulation**: the **systolic jumps to about 100 (compressions alone read about 70/33)** → **Pulse back: stop CPR** (the rule allows 30 s) | the model's return at **10:55, 93.7 s (C) / 93.8 s (W) after the drainage**; at that moment the line still read 69/32 (45) C / 70/33 (46) W, and 3 s later **114/51 (76) C / 97/49 (68) W**. Stop pressed at 10:57, 2 s after the return [A3.1; A3 "against the cue cards"] |
| 3:34 | 11:27 | ×1 | — | 30 s after stopping CPR: **ART 115/77 (90), HR 64, EtCO₂ 28** [A3.1] |
| 3:35 | 11:28 | ×1 | **Crystalloid 500 mL** → go straight to §4 (the Debrief) | then `ART MEAN TOO HIGH` 11:03 and `ART DIA TOO HIGH` 11:04 had already come with the overshoot [A3.1] |

WebKit's W matched within half a second (CPR 1:39, crystalloid 3:36) [A3.1 raw W]. During CPR at ×4 the phones' HR
differed from the instructor's for up to 3 s while HR swung between about 50 and 110: a fast-moving value, not a stale
one [A3.1 "Phones"].

**The trap, measured:** a probe stopped CPR on the compression reading (69/32). The patient re-arrested (`SPO2 NO PULSE`
11:34, `ECG ASYSTOLE` 13:44) and the Debrief said "The return of circulation did not happen" [MEAS §5 probe]. Wait for
the systolic to jump to about 100 [A3.1].

**Say:** PEA about 8 minutes after arrival without drainage [CARD story; A3.1: pulse loss 07:48]; CPR alone cannot
bring him back (40/19 before drainage); drainage during good CPR brings the pulse back about a minute and a half later
[CARD story; A3.1: 93.7 s]. The better course was to drain BEFORE the pulse was lost, while the systolic was still above
60: in the engine, a drainage 60 s into the deterioration gives no PEA at all [G11 §3 S2 early drain]. Known miss: no
pulsus paradoxus in this model [SYN (b); R24 P3: SBP swing 3.4 mmHg against > 10 expected].

**Debrief objectives and the verdict, measured** [CARD; A3.1, identical in both engines]:
- – Name the tamponade within 180 s (no rule: "This objective has no rule: the instructor judges it.", followed by "The
  instructor ticked it at mm:ss." when you ticked it [`apps/demo/src/app/debrief.ts`]).
- ✓ CPR within 10 s of the pulse loss: "CPR 3 s after the pulse loss (07:48 → 07:51)".
- ✓ Pericardiocentesis within 120 s of starting CPR: "1 min 30 s after CPR (07:51 → 09:21)".
- ✓ Stop CPR within 30 s of the pulse returning: "2 s after the return of circulation (10:55 → 10:57)".
- **✗ "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA
  follows"**, with "The pulse loss at 07:48". This is the one ✗ of the day (E17): the better course of action, named
  as the lesson, not a timing.

---

## 4. The Debrief moment (after the tamponade, before MH). Slot 3:30 (T+13:30 → 17:00)

The owner's answer E17: every timed objective is met, and the tamponade report shows exactly one ✗, the structural
"Better: pericardiocentesis before the pulse loss" line: the card's way of saying that the better course was to drain
before the arrest [CARD: objective 5, whose rule is that the pulse loss never happens; A3.1]. Name it as the lesson.

| T+ (within the slot) | Do | The audience sees |
|---|---|---|
| 0:00 | Session bar → **Debrief** | the report of the run just finished: header, objectives, measured facts [G13 §5] |
| 0:15 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** | — |
| 0:30 | Read the objectives aloud | – Name the tamponade ("The instructor ticked it at mm:ss") · ✓ CPR 3 s · ✓ Pericardiocentesis 1 min 30 s · ✓ Stop CPR 2 s · **✗ "Better: pericardiocentesis before the pulse loss…" — "The pulse loss at 07:48"** [A3.1] |
| 1:00 | Say: *"Everything was done in time, and the report still marks one line: the better course was to drain before he lost his pulse. That is the lesson."* | — |
| 1:20 | Point at **Measured facts** | lowest SpO₂ 95 % at 00:28 · lowest ART M / NIBP M **20 mmHg at 07:51** · highest EtCO₂ 36 at 00:09 · **pulseless 3 min 07 s in all, first lost at 07:48** · return of circulation 3 min 07 s after the pulse loss (10:55) · labs: K⁺ 4.2 · lactate 2.2 · pH 7.28 [A3.1] |
| 1:50 | Scroll to **Timeline** | undone rows struck through [G13 §5]; **41 timeline rows, 12 minute rows** [A3.1] |
| 2:15 | **Print or save as PDF** → save | **6 A4 pages** on this path (Chromium), title "Debrief Stab wound: tamponade, PEA and pericardiocentesis ‹date›" [A3.1]; footer and build on every page in Chrome; in Safari the footer only ends each section [PRINT] |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

Do the Debrief BEFORE loading the next case: it reports the current run.

---

## 5. Case 3: Malignant hyperthermia, early call. Slot 5:30 (T+17:00 → 22:30)

Card: *Malignant hyperthermia* (Showcase). States: Induced (succinylcholine, sevoflurane 2 %) → Surgery under way →
Early signs: EtCO₂ rising at the same ventilation, tachycardia → Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min,
ventilation 20 × 600 → MH treatment under way → Recovering: EtCO₂ below 45 → Ventilation back to 12 × 500, O₂ 100 %
[CARD]. The **MH crisis** button is offered in Induced, Surgery, Early signs and Established [CARD]. **EtCO₂ normal:
ventilation back to 12 × 500** is offered **only in the Recovering state** [CARD transitions].

The owner's answers: call at **Early signs** (E19a); **keep the hyperventilation (20 × 600) through the fast-forwards**
and press **ventilation back** only at **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** (E22). The rule being written
tonight: "hyperventilation kept until EtCO₂ < 40 for 2 min, then normalised"; normalising early is "not met" [R00
2026-10-17]. The rows below to 12:55 are the measured run that kept the hyperventilation (13 October, kit 56f3761f, both
engines) [KR MH early-call C; MEAS §1 "Early call"]; from the press on they are the E22 run, ordering A (kit b08a972b,
both engines) [MEAS E22].

| W | Sim | Speed | Press / do | Point at (measured, C; W within a second) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | — |
| 0:31 | 4:00 | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | state Surgery 04:05; HR 79, ART 99/66 (75), EtCO₂ 40 [KR MH early-call C 04:11] |
| 0:50 | 6:30 | **×4** | watch the CO₂ tile climb at the same ventilation | EtCO₂ 45 at 06:37 [KR MH early-call C] |
| 0:54 | **6:52** | ×4 | state **Early signs** → **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** at once (the rule allows 120 s) | EtCO₂ 46, HR 86, ART 105/70 (80) [KR MH early-call C 06:53]. No limit alarm before the call: EtCO₂ peaks at 46, under the 49.4 limit [MEAS §1] |
| 0:57 | 7:01 | ×4 | (the call lands: state Trigger off, ventilation 20 × 600) | 9 s after Early signs [MEAS §0]. If "Not available now": press again [G10 §8 item 1] |
| 1:02 | 7:22 | ×4 | **Dantrolene 2.5 mg/kg** (≈ 20 s after the call) | 21 s after the call [MEAS §1] |
| 1:04 | 7:32 | ×4 | **Cool: 2 L saline at room temperature** | — |
| — | 7:27 | ×4 | — | **EtCO₂ falls below 40**, 26 s after the call [MEAS §0]; 38 at 07:35 [KR MH early-call C] |
| ≈ 1:05 | 7:42 | — | **5 min** fast-forward (1 of 3). **Hyperventilation stays on** | 10.4 s of wall; banner "Fast-forwarded 5 min, 07:42 → 12:42. During it: no alarms." [KR MH early-call C]. "Recovering" shows during it (08:36 / 08:35, C / W) [MEAS §1]: **do NOT press ventilation back at Recovering** (E22: early is "not met") |
| 1:19 | 12:55 | ×4 | **Pause**, point; **Resume** | state Recovering; **EtCO₂ 38**, ART 136/90 (104), HR 83 [KR MH early-call C] |
| 1:22 | **13:03 (as fast-forward 1 ends; any press from 12:41 is met)** | ×4 | **EtCO₂ normal: ventilation back to 12 × 500**, at this time and not before. The hyperventilation stayed on through span 1 | Debrief ✓ (pressed 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)"); EtCO₂ 38 at the press [MEAS E22 (A)] |
| ≈ 1:23 | ≈ 13:07 | — | **5 min** fast-forward (2 of 3) | banner "During it: ETCO2 TOO HIGH 14:13, ART MEAN TOO HIGH 17:00, RR TOO HIGH 18:06."; EtCO₂ peaks at **55** inside it (17:22) [MEAS E22 (A)] |
| 1:36 | 18:20 | ×4 | **Pause**, say: "EtCO₂ rose to the alarm limit while CO₂ production settled; the alarm caught it; we keep watching"; **Resume** | **EtCO₂ 45**, ART 147/95 (112), HR 85 [MEAS E22 (A)] |
| ≈ 1:37 | ≈ 18:21 | — | **5 min** fast-forward (3 of 3; the second thing to cut if running over) | `ART SYS TOO HIGH` 22:39 during it [MEAS E22 (A)] |
| 1:49 | 23:34 | ×4 | end: **Pause** | **EtCO₂ 42**, ART 150/95 (113), HR 82 [MEAS E22 (A)] |

Each 5-min fast-forward took 10.4–10.6 s of wall, and ×4 stayed ×4 after it [MEAS §1].

**Repeat dantrolene: – (not needed; do NOT give it on the alarm).** While the hyperventilation was kept, EtCO₂ read
38 at 12:55. After the press at 13:03 it went 38 → 49 at +1 min → a peak of 55 inside span 2 (not visible on the
monitor), with `ETCO2 TOO HIGH` at 14:13 shown latched after span 2; it read 45 after span 2 and 42 at the end
[MEAS E22]. That is the CO₂ production settling, not a relapse: say the presenter line at the 18:20 pause, not a dose.
The card's repeat objective has no rule (the instructor judges it) [CARD]. **Do not give a dose just
before the E22 time**: a dose moves the card out of Recovering ("Dantrolene given" → the crisis checklist), and the
ventilation-back button comes back only after EtCO₂ has been below 45 for a minute [CARD transitions].

**Say (the contrast, measured):** had we waited for the established crisis (Stages 10, 11 and 13 did), the call comes
at 18:57, 12 min 05 s after the early signs: EtCO₂ 81, HR 146, core temperature 39.3 °C, lactate 6.8, pH 7.09, K⁺ 5.8,
and EtCO₂ never back below 40 by 35:00 [MEAS §1, late call]. Untreated, K 6.4 and VF with core temperature 42.3 °C at
44.7 min [G11 §3 S1 untreated]. Honesty: the literature review found 44 min to death too fast for a volatile trigger,
and no human EtCO₂ time course behind the "40 → 60 by 10 min" band [R00 2026-10-11 "LITERATURE 29"; SYN (a) item 11].
After the treated crisis the model stays hypertensive (systolic 136–151 here; known miss C-1) [KR MH early-call C;
G11 §5 Q8]. Do not give the potassium treatment on this path: K⁺ stays 4.2–4.7 [MEAS §1].

**Why the hyperventilation stays on (E22), measured:** when the ventilation went back at "Recovering" (08:43), the
muscle was still producing CO₂: EtCO₂ rebounded to 57 after span 1 and 61 at its highest, with `ETCO2 TOO HIGH` at
10:07 [KR62 MH C; MEAS §0, §1]. Kept on through span 1, it stayed 36–38 with no alarm, and after the press at 13:03 it peaked at 55 inside span 2
and was 42 at the end [MEAS E22].

**Debrief objectives and the expected verdict** [CARD; MEAS §0, §1] (the Debrief is not opened for MH on the day):
✓ call within 120 s of the early signs (9 s) · ✓ dantrolene within 300 s of the call (21 s) · – repeat dantrolene (no
rule: the instructor judges it) · – potassium (**not assessable**: K⁺ never above 5.5) · ventilation back:
**✓ (pressed 13:03, "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:26 → 09:26)")** [MEAS E22].

---

## 6. Close (T+22:30 → 25:30) and questions (T+25:30 → 29:30)

**Roadmap, one slide's worth** [RM]:
- **v1.0** (now: the release candidate). Feature work is merged; hardening, calibration and the release remain. The
  calibration pass follows the rc. Known limits in the release notes: education only, adults only, known misses listed
  with their measured value and target, shock decompensation and reflex bradycardia not modelled [RM v1.0-remaining].
- **v1.x**: maintenance only, no new physiology [RM README].
- **v2.0**: a physiological simulation engine: one declared state with units and conservation by construction; an
  autonomic hub and reflexes (the first workstream); failure that emerges from supply and demand; a patient parameter
  layer; predictive validation; the missing systems (coagulation, sepsis, laboratory values, paediatric and obstetric
  physiology); an intended-use statement [RM v2.0 README "Workstreams"].

**The ask to the deans** (wording and figures are the owner's; none are in the sources):
- Funding: ‹amount, for what: e.g. the calibration pass, the blind realism review, v2.0's first workstream›.
- A research line: ‹e.g. the Saadat bedside comparison and the blind review, both built and not yet run [SC1 handout
  "Not yet done"]›.
- Adoption: ‹residency use: instructor-led, one laptop and a projector, phones as learner monitors›.

**Questions** (4:00; the first thing to cut if running over): see the presenter guide for the validation answer.

---

## 7. Fallbacks

| What happens | What to do | Source |
|---|---|---|
| The QR relay fails, "Start Classroom" needs Node, or phones say "cannot reach the instructor's laptop" | Carry on with **Start Simulator** and **Open on a second screen** (the same browser) for the projector; phones are not needed for any case | [CR12 "(c)" and "If something goes wrong"] |
| The sheet says "The relay does not answer", or the black window stops | Close the Classroom window, double-click **Start Classroom** again, reload the page, **Sound on**. A kit before 62e521c3 stops at the first phone (KR-A1): use the 62e521c3 kit or later | [CR12; MEAS §9 item 1] |
| Sound fails | Say so (*"the sound has failed; the alarms still show on screen"*) and continue; alarms stay visual | [G10 §7] |
| A card press shows **"Not available now: the case has moved to …"** | Press again: the button now belongs to the current state | [G10 §8 item 1] |
| A scenario goes wrong (wrong press, missed window) | Session bar **Bookmark** list → **Return here** on the bookmark taken at Load; the patient and the screen are restored together. **The alarms come back as they were when the bookmark was taken**: on, if you took it after All alarms on (the cards' order); "Limit alarms off" if before | [FU-11 E4; A3.2] |
| The page froze or a Ventilator view is still driving | Reload (Cmd-R): **Sound on**, re-load the card, **All alarms on**, Bookmark; the session code is kept and the phones follow again | [MEAS §7; R00 2026-10-04] |
| Tamponade: you missed the PEA moment and `SPO2 NO PULSE` has sounded | Press **Start CPR** at once anyway; the CPR line will be ✗ (12 s at the alarm). Or **Return here** and run the case again | [MEAS §5] |
| Tamponade: you stopped CPR on the compression pressure and he re-arrests | **Return here** and run the case again (≈ 3:35 of wall), or say it: it is the trap the sheet warns about | [MEAS §5 probe; A3.1] |
| MH: "ventilation back" is not on the card at the E22 time | The card has left Recovering (a dantrolene dose): wait until EtCO₂ has been below 45 for a minute, and press it when it shows | [CARD transitions] |
| A phone says "This session is full" | 60 phones are following: ask a neighbour to share | [CR12] |
| A phone says "The ventilator is on the main screen" | Expected during the bronchospasm case | [CR12; MEAS §6; A3.3] |
| The phones show "---" where the screen shows a number after a style change | You changed the monitor style mid-session (FX-9). Change it back, or re-load the case | [MEAS §8] |
| "The monitor stopped" toast (hidden-tab watchdog) | Reload the page and re-load the card; if this showed in H19, do not switch tabs during the talk | [ADD2 H19; F11A §5] |
| Running long | Cut questions, then the MH third span, then the bronchospasm Explore line (§ "The programme at a glance") | — |

---

## Still not measured (on the 30-minute path)

1. **E22**: measured since [MEAS E22]. "EtCO₂ below 40 for 2 min" is reached at 09:26–09:27, inside span 1; the press
   comes as span 1 ends, measured at 13:03 / 13:04 (C / W). Not measured: a human presenter's delay after span 1.
2. **Bronchospasm as one run with the presses from the Instructor view and salbutamol**: A3 ran ×8 and the span from
   the Instructor view without salbutamol [A3.3]; the run with salbutamol sent the same commands through the ventilator
   link [MEAS §6]. The 8:44 → ×1 step at the end is the H21 run's ×4 step in kind [KR bronchospasm C 11:08], not
   measured as such.
3. **The sequence in one page**: bronchospasm → reload → tamponade → Debrief → MH was not run end to end. The reload
   itself is measured [MEAS §7]; the A3 tamponade ran on a fresh page [A3.1].
4. **The 30-minute programme as a whole**: the talk allowances are planning figures; only the case runs are measured.
5. **Real devices**: H17 (own phone, hotspot capacity), H18 (the fast-forward look in Safari), H19 (hidden tab), H20
   (second screen in Safari), H21 in real Safari (it passed in Playwright's WebKit [MEAS §6; A3.3]), sound by ear, and
   a print from a real print dialog (A3 printed to PDF from Chromium only) [MEAS §10; A3.1].
6. **E13 / E14**: which Mac presents, its Node.js version, and the network on the day [R31 §3].
7. **A human's reaction time**: the kit rounds used a fixed 2 s of wall [MEAS §10]. The tamponade CPR window is about
   8 s of wall from the PEA state at ×1 (07:49 → 07:57).
8. **The Explore line has no press**: the Explore physiology view is not opened on the 30-minute path.
9. **The figures for the ask** (funding amount, research line, adoption terms).
10. **ID collisions**: the review pack's addendum 2 uses H20 and E17–E19 for other items; this sheet uses the rulings'
    meaning [R31 note 1].

---

# Appendix: Cases held in reserve

*Dropped from the 30-minute slot by the owner's answer E19c (2026-10-17) and kept here unchanged from kit round B
(PR #65), so they can come back if the slot grows or a question asks for them. Their slots are the round-B 60-minute
planning figures. All four are measured [MEAS §2, §3, §4]. If one is used: Load → All alarms on → speed → Bookmark as
always; haemorrhage starts on a freshly reloaded page if the Ventilator view was opened before.*

The round-B corrections that concern these cases: the premedicated patient's apnoea timing depends on the browser
(38.8 s C / 56.8 s W after Induce, against 52.3 / 53.9 s in the healthy induction), so do not promise that he "stops
breathing sooner" [MEAS §3]; the haemorrhage SVR **rises** in Explore at 8:00 (1951, +659) [MEAS §4]; early CPR in
haemorrhage no longer causes VF, it makes both CPR objectives "not assessable" [MEAS §4 probe]; anaphylaxis epinephrine
at 1:30 into the reaction, not 2:00 (the owner's answer E19b, 2026-10-17) [MEAS §2; R00 2026-10-17].

### Reserve R1: Induction after fentanyl and midazolam (the premed contrast). Round-B slot 4:00, ×4 throughout

Card: *Induction after fentanyl and midazolam* (Showcase). States: Awake, preoxygenating → Fentanyl 2 µg/kg and
midazolam 0.03 mg/kg given → Induced → Intubated and ventilated → (Phenylephrine / Ephedrine given) → Ventilated:
vasopressor given [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on** at once (the RR alarm comes 25 s of wall later), **Bookmark** | HR 70, ART 122/80 (94) [KR premed C 00:07] |
| 0:02 | 0:10 | ×4 | (premedication gives itself) | HR 71, ART 123/81 (96), SpO₂ 96, EtCO₂ 36 [KR premed C 00:10] |
| 0:25 | 1:40 | ×4 | **`RR TOO LOW`** → top-right alarm button → **Devices & alarms** → **Acknowledge**, then tick objective 1 on the Scenario tab | `RR TOO LOW` at **01:40**, 89 s after the premedication, C / W [MEAS §3]. It is raised again (01:53, 02:05) while RR stays low: acknowledge once and move on [MEAS §3] |
| 0:30 | 2:00 | ×4 | — | HR 62, ART 117/73 (87), EtCO₂ 45, RR 6 [KR premed C 02:02] |
| 0:46 | 3:00 | ×4 | **Induce now** | state "Induced" at 03:04 / 03:03 (C / W); HR 60, ART 115/71 (85), EtCO₂ 49 [MEAS §3; KR premed C] |
| 0:56 | 3:42 (C) / 4:00 (W) | ×4 | **`CO2 APNEA`** → **Intubate and ventilate** at once (the rule allows 60 s of sim = 15 s of wall) | apnoea **38.8 s (C) / 56.8 s (W)** after Induce; intubated **9 s** after the alarm, both [MEAS §3] |
| 1:00 | 4:00 (C) / 4:16 (W) | ×4 | **MAP below 60** → **Ephedrine 10 mg** at once (the rule allows 60 s of sim) | ART 84/49 (59) at 04:00 (C) [KR premed C]; ephedrine **8 s** after MAP < 60, both [MEAS §3] |
| 1:03 | 4:11 | ×4 | — | the nadir: ART 78/44 (53), HR 57; MAP nadir **52** [KR premed C; MEAS §3] |
| 1:30 | 6:00 | ×4 | — | MAP back to 65 **112 s (C) / 108 s (W)** after ephedrine: ART 94/53 (65) [MEAS §3; KR premed C] |
| 2:00 | 8:00 | ×4 | end | ART 102/60 (72), HR 61, EtCO₂ 38 (C) / 39 (W) [MEAS §3] |

Limit alarms you will hear (with limits ON): `AWRR TOO LOW` 03:10, `ETCO2 TOO HIGH` 03:29 / 03:34, `RR TOO LOW` +
`AWRR TOO LOW` 03:57, `ART DIA / MEAN TOO LOW` 04:01, `ART SYS TOO LOW` 04:06 (C); WebKit the same pattern 15–20 s later
[MEAS §3].

**Say:** after the premedication the breathing slows until the RR alarm sounds, and after induction the pressure falls
lower and needs a vasopressor: MAP nadir **52** here [MEAS §3] against **64.6–64.7** in the healthy induction
[RS11, Stage 11 build]. **Do not promise that this patient stops breathing sooner**: on this build the apnoea came at
38.8 s on Chromium and 56.8 s on WebKit, against 52.3 / 53.9 s in the healthy induction [MEAS §3] (Stage 11 gave 36 /
47 s [RS11]); the verdicts did not change. Do **not** call it synergy: the probe found the extra fall is about the sum
of the parts [R24 P4; R25 A2]. Phenylephrine 100 µg is the faster alternative (MAP 73.4 at +60 s, HR 53) [G11 §3 S4].

**Debrief objectives and the expected verdict** [CARD; MEAS §3]: – acknowledge the RR alarm within 30 s (no rule: the
instructor judges it) · ✓ intubate within 60 s of the apnoea alarm (9 s) · ✓ vasopressor within 60 s of MAP < 60 (8–9 s)
· ✓ MAP above 65 within 120 s of it (**1 min 52 s C / 1 min 47 s W**: met, but with only 8–13 s to spare; the model sets
it, not the presenter).

### Reserve R2: Healthy induction, airway not secured (plain induction). Round-B slot 4:30

Card: *Healthy induction* (Showcase). States: Awake, preoxygenating → Induced (airway not yet secured) → Airway not
secured: SpO₂ below 90 % → (SpO₂ below 60 %: hypoxic bradycardia, not reached here); rescue buttons **Bag-mask
ventilate, FiO₂ 1.0** and **Intubate and ventilate, FiO₂ 1.0** [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** (preoxygenation, FiO₂ 1.0 held) | — |
| 0:24 | 3:00 | **×4** | **Induce now** (≥ 180 s of preoxygenation: tick objective 1) | state "Induced" 03:07; HR 71, ART 123/81 (95), SpO₂ 99, EtCO₂ 39 [KR induction C 03:10] |
| 0:37 | 4:00 | ×4 | `CO2 APNEA`. Say: *"Today nobody secures the airway."* | **52.3 s (C) / 53.9 s (W)** after Induce [MEAS §3]; `RR TOO LOW` 03:52 and `ETCO2 TOO LOW` 03:54 come first [MEAS §3] |
| ≈ 0:45 | 4:34 | ×4 | **5 min** fast-forward | **10.4 / 10.6 s** of wall; banner "During it: no alarms"; ×4 after it [MEAS §3; KR induction C] |
| 0:58 | 9:47 | ×4 | — | SpO₂ during the gap: **99** at 9:47, 99 at 10:04, 98 at 10:34, 97 / 96 at 11:04 [MEAS §3] |
| 1:23 | 11:26 (C) / 11:24 (W) | ×4 | state **Airway not secured: SpO₂ below 90 %** → **Bag-mask ventilate, FiO₂ 1.0** at once (the rule allows 60 s of sim = 15 s of wall) | at the state change the monitor still reads **SpO₂ 94** (the device lags), 8.3 min after induction [MEAS §3]. Pressed 8 s after the state [MEAS §3] |
| 1:26–1:36 | 11:34–12:15 | ×4 | watch SpO₂ fall a little more, then recover | from the bag-mask press: 91 at 5 s · 89 at 15 s · **nadir 87 at 19 s** · 90 at 25 s · **95 at 30 s** · 99 at 40 s; EtCO₂ 64–65 [MEAS §3] |
| 1:36 | ≈ 12:15 | ×4 | **Intubate and ventilate, FiO₂ 1.0** (≈ 40 s after the bag-mask) | EtCO₂ above 25 **3.2 s (C) / 3.3 s (W)** after the tube; EtCO₂ 55 [MEAS §3] |
| ≈ 1:50 | ≈ 13:15 | — | end | EtCO₂ 53 one minute after the tube; 49 at 15:00 (C) [MEAS §3] |

Limit alarms after the bag-mask: `RR TOO LOW` + `AWRR TOO LOW` 11:40, `ETCO2 TOO HIGH` 11:41, `%SPO2 LOW` 11:48 (C;
WebKit `%SPO2 LOW` 11:45) [MEAS §3].

**Say:** desaturation comes about 8 minutes after induction with nothing done [MEAS §3: 8.3 min]; the oximeter lags, so
SpO₂ keeps falling for about 20 s after ventilation starts (nadir 87 %) and is back to 95 % at 30 s [MEAS §3]. If
nothing were done, hypoxic bradycardia follows [RS11 rescued branch, Stage 11 build].

**Debrief objectives and the expected verdict** [CARD; MEAS §3]: – ≥ 180 s preoxygenation (the instructor judges it) ·
**✗ intubate within 90 s of the apnoea alarm (7 min 32 s): not met by design of this branch — do not open the Debrief
for this case** · ✓ EtCO₂ > 25 within 30 s of intubation · ✓ ventilate within 60 s of SpO₂ < 90 % (9 s) · – ventilate
within 300 s of SpO₂ < 60 % (not reached).

### Reserve R3: Anaphylaxis under anaesthesia. Round-B slot 3:30, ×4

Card: *Anaphylaxis under anaesthesia* (Showcase). States: Ventilated, stable → Anaphylaxis (starts by itself after 1 min)
→ Epinephrine given [CARD].

*The owner's answer E19b (2026-10-17):* epinephrine at **about 1:30 into the reaction** [R00 2026-10-17].

| W | Sim | Speed | Press / do | Point at (measured, Chromium on kit 62e521c3; WebKit within 1 unit) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on**, **Bookmark** | — |
| 0:15 | 1:00 | ×4 | (the reaction starts by itself at 01:00) | HR 74, ART 119/83 (96), SpO₂ 99, EtCO₂ 33 [MEAS §2] |
| 0:23 | 1:30 | ×4 | — | HR 83, ART 114/80 (91) [MEAS §2] |
| 0:31 | 2:00 | ×4 | — | HR 99, ART 109/79 (89) [MEAS §2] |
| 0:38 | **2:30** | ×4 | **Give epinephrine 100 µg** (1 min 30 s into the reaction) | HR 116, ART 105/77 (86): the lowest systolic before epinephrine is 104 [MEAS §2] |
| 0:40 | ≈ 2:35 | ×4 | — | systolic above 110 **5.3 s** after epinephrine [MEAS §2] |
| 0:42 | ≈ 2:47 | ×4 | **Drugs & fluids** → **Crystalloid 500 mL over 10 min** → **Give** (15–17 s after the epinephrine; objective 3, "Give fluid") | toast "Crystalloid 500 mL over 10 min" [MEAS §2] |
| 0:45 | 3:00 | ×4 | — | HR 105, ART 124/91 (101); HR peak after epinephrine **144–145** [MEAS §2] |
| 1:01 | 4:00 | ×4 | — | HR 99, ART 133/96 (108) [MEAS §2] |
| 1:16 | 5:00 | — | end | HR 98, ART 133/95 (108); SpO₂ 99 and EtCO₂ 32–34 throughout [MEAS §2] |

The only limit alarm on this path is `**ABPd 94>90` at 05:21, after the end [MEAS §2]. No HR alarm.

**Why 1:30, not 2:00:** the Debrief's rule is epinephrine within 120 s of the Anaphylaxis state [CARD rule]. At **2:03**
(showcase 1's timing) the kit round measured: **✗** "2 min 03 s, within 2 min 00 s asked", HR peak **171**, and
**`HR TOO HIGH` at 03:10**; the systolic fell to 95 first [MEAS §2]. Untreated, at 03:38: HR 152, ART 79/56 (63) [KR
session-mechanics C].

**Debrief objectives and the expected verdict** [CARD; MEAS §2]: – recognise anaphylaxis (the instructor judges it) ·
✓ epinephrine within 2 min of the reaction (1 min 30–31 s) · ✓ give fluid. Timeline 13 rows, 6 minute rows [MEAS §2].

### Reserve R4: Class IV haemorrhage, PEA and resuscitation (+ the Explore moment). Round-B slot 7:30

Card: *Class IV haemorrhage, PEA and resuscitation* (Showcase). States: Bleeding 2.5 L over 10 min → CPR, 2 L warmed
fluid, epinephrine 1 mg → Return of circulation [CARD]. Start on a freshly reloaded page if bronchospasm ran before.

| W | Sim | Speed | Press / do | Point at (measured; W within 1 unit) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | bleeding 250 mL a minute (card: 2.5 L over 10 min) [CARD]; HR 71, ART 118/81 (93) [KR haemorrhage C 00:13] |
| 0:12 | 1:00 | **Pause** | **Explore physiology** → **Set the baseline now** → back → **Resume** | baseline taken at 01:04 [MEAS §4] |
| 0:19 | 2:00 | ×8 | — | HR 81, ART 114/83 (93), EtCO₂ 34 [MEAS §4] |
| 0:34 | 4:00 | ×8 | point (optional Pause) | HR 95, ART 108/82 (90), EtCO₂ 33 [MEAS §4] |
| ≈ 0:38 | 4:30 | ×8 | — | **HR crosses 100** [MEAS §4] |
| 0:50 | 6:00 | ×8 | — | HR 121 at 6:00 (**crosses 120 at 6:05**), ART 98/80 (86), EtCO₂ 30 [MEAS §4] |
| ≈ 0:57 | 6:56 | ×8 | — | **systolic below 90** [MEAS §4] |
| ≈ 1:02 | 7:46 | ×8 | — | `ART SYS TOO LOW`, the first limit alarm [MEAS §4] |
| 1:05 | 8:00 | **Pause** | **Explore physiology** → **Changed only**: what the monitor hides. Back, **Resume** at **×4** | **HR 139 (crosses 140 at 8:00), ART 74/60 (65), EtCO₂ 25** [MEAS §4]. Explore, changed only: **CO 2.51 L/min (−2.66), SV 18 mL (−53), SVR 1951 (+659, it RISES)**, DO₂ 528 (−554), SvO₂ 54 % (−25), O₂ debt 153 mL, sympathetic tone +32.6 [MEAS §4] |
| — | 8:21–9:51 | ×4 | — | `SPO2 LOW PERFUSION` 08:21 · `ART MEAN TOO LOW` 08:35 · `HR TOO HIGH` 08:49 · `ART DIA TOO LOW` 09:01 · `ETCO2 TOO LOW` 09:51 [MEAS §4] |
| 1:42 | 10:00 | **×1** | slow down for the arrest | — |
| 1:42 | 10:05 | ×1 | `IBP1 STATIC PRESSURE`: the arterial number becomes mean only (≈ 13). **Do not press CPR yet** | [MEAS §4; KR haemorrhage C 10:05] |
| — | 10:29 | ×1 | (the pulse loss, as the Debrief will time it) | **10:29**, C / W [MEAS §4] |
| 2:17 | 10:40 | ×1 | **`SPO2 NO PULSE`** → **Start CPR, 2 L and epinephrine** at once (the rule is 30 s from 10:29: press by 10:58) | alarm 10:40; CPR 10:42–10:43 = **13 s** after the loss [MEAS §4] |
| 2:20 | 10:43 | — | **2 min** fast-forward (CPR running) | 10.0 / 10.1 s of wall; **×1 after it** [MEAS §4] |
| 2:33 | 12:43 | **×4** | set ×4 yourself; watch the arterial trace and the capnogram | CPR at 12:46: ART 65/30 (43), HR 136, EtCO₂ 15 [KR haemorrhage C] |
| 2:46 | 13:38–13:40 | ×4 | the return of circulation (13:38), then **systolic above 90** (13:40) → **Pulse back: stop CPR** | ROSC **13:38** (C) / 13:39 (W), 3 min 09 s after the loss, 55 s after the span ended; systolic > 90 at 13:40, 178 s into CPR [MEAS §4] |
| 2:49 | 13:51 | ×4 | — | at the press: **ART 203/106 (144)**, HR 100: the overshoot (C); on W the arterial line blanked for a moment [MEAS §4] |
| 3:04 | 14:48 | ×4 | end | 1 min after: ART 135/90 (105), HR 74–75, EtCO₂ 34–35 [MEAS §4] |

The W column includes the kit round's short scripted pauses at 1:00 and 8:00 (5–10 s); your Explore talk adds to it.

**Say:** the pressure holds and only the heart rate tells you; then the pulse pressure narrows [SC1 haemorrhage "Say"].
On the monitor: HR above 100 at 4:30, above 120 at 6:05, above 140 at 8:00, systolic below 90 at 6:56 [MEAS §4]. ATLS
classes are a teaching construct, and the model's heart rates fit registry data better than the ATLS table [SYN (a)
item 1]. In Explore at 8:00: the output has fallen by half and the **resistance has risen** (SVR +659), as it should
when a patient bleeds; the oxygen delivery has halved [MEAS §4]. Known miss to say out loud: shock decompensation and
reflex bradycardia are not modelled [RM v1.0-remaining "Not in v1.0"].

**Early-CPR trap:** CPR pressed at `IBP1 STATIC PRESSURE` (10:07), before `SPO2 NO PULSE`, no longer causes VF on this
build (it did on showcase 1's): the systolic is back above 90 within 48 s, the pulse loss never happens, and the Debrief
marks both CPR objectives "not assessable" [MEAS §4 probe]. Press at the alarm.

**Debrief objectives and the expected verdict** [CARD; MEAS §4]: – recognise PEA from hypovolaemia (the instructor
judges it) · ✓ CPR within 30 s of the pulse loss (13 s) · ✓ the pulse back within 6 min of its loss (3 min 09 s).
42 / 43 timeline rows, 15 minute rows; lowest ART M 3 at 10:42; lactate max 2.8 [MEAS §4].
