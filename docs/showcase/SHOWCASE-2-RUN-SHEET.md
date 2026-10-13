# Showcase 2: run sheet (FINAL, for the owner's rehearsal)

*Thursday 2026-10-22 (slack to the 25th), university deans and clinical staff. Presenter: the owner. Kit round B,
2026-10-13: the draft of 2026-10-11 (PR #53) with every "[to be measured…]" replaced by the value kit round A measured
through a built kit (main 56f3761f, re-checked on 62e521c3) on Chromium and WebKit, and with the cues the measurements
contradicted corrected (listed under "What changed from the draft"). Where something is still not measured, the sheet
says so and names why ("Still not measured", at the end).*

Companions: [`SHOWCASE-2-PRESENTER-GUIDE.md`](SHOWCASE-2-PRESENTER-GUIDE.md) (one page: what to remember, keys, the
alarm rule, the validation answer) and [`SHOWCASE-2-CUE-CARDS.md`](SHOWCASE-2-CUE-CARDS.md) (one printed page per case).

## Owner defaults built into this sheet

Each is marked **"owner default — change if he says otherwise"** where it is used. Until the owner answers, the sheet
runs on these.

| # | Question | Default built in | Where |
|---|---|---|---|
| D1 | **E17**: which objectives the Debrief marks | **Meet every timed objective.** The one ✗ the tamponade report shows is the structural line "Better: pericardiocentesis before the pulse loss". The presenter names it as the better course of action, not a timing [R00 2026-10-13 "MEASURED VERDICTS": "E17 re-recommendation"] | Case 6, §4 |
| D2 | **E19 (a)**: MH | Call the crisis at **Early signs**; press **EtCO₂ normal: ventilation back to 12 × 500** the moment **Recovering: EtCO₂ below 45** shows, before the first fast-forward; **repeat dantrolene** when EtCO₂ climbs back above 55 | Case 7 |
| D3 | **E19 (b)**: anaphylaxis | Epinephrine at **1:30 into the reaction** (02:30 on the clock) | Case 3 |
| D4 | **E19 (c)**: slot length | Not known: this sheet gives the **60-minute** programme and a boxed **45-minute** cut (drop bronchospasm, then plain induction) | Programme |
| D5 | **E20**: monitor skin | **Saadat-style** (the default): Silence only; **Pause alarms** shows disabled with its reason | §1, presenter guide |
| D6 | Monitor style | **No monitor style change during a case**: after a change to Philips-style the phones' AGENTS tile read "---" against the instructor's "0.0" for the 30 s watched (finding FX-9) [MEAS §8] | §1, §3 |

## What changed from the draft (the contradictions the measurements found)

1. **Limit alarms: "All alarms on" after EVERY Load**, not once in pre-flight. Loading a case turns the limit alarms
   off, in every case, on both engines [MEAS §7]. A page reload also loses it, and loses **Sound on**; the session code
   survives [MEAS §7].
2. **Tamponade CPR is cued from the PEA state on the card (the arterial trace flat), NOT from `SPO2 NO PULSE`.** The
   alarm sounds 10 s after the pulse loss (07:48 → 07:58), so a press at the alarm can never meet "CPR within 10 s"; the
   draft's path measured 12 s ✗ [MEAS §0, §5].
3. **Tamponade: no deliberate miss any more** (D1). The draft's 2-minute fast-forward straight after CPR gave THREE ✗
   (CPR 12 s, drainage 2 min 04 s, "Better"), not one [MEAS §0]. The fast-forward is gone from this case.
4. **Tamponade: stop CPR only on the model's return of circulation**, never on the compression pressure. CPR alone reads
   about **69/32** on the arterial line; stopping on it re-arrested the patient [MEAS §5 probe].
5. **The CVP is on the IBP2 tile** (no tile is labelled "CVP"; the alarm text says it) [MEAS §5].
6. **Haemorrhage: the SVR RISES** in Explore at 8:00 (1951, +659), so the draft's "known miss: resistance falls
   instead of rising" is wrong on this build and is removed [MEAS §4].
7. **Haemorrhage: early CPR no longer causes VF** on this build; it makes both CPR objectives "not assessable" instead
   [MEAS §4 probe]. The cue stays at `SPO2 NO PULSE`.
8. **MH: the 40-mmHg check before spans 2 and 3 is gone.** EtCO₂ falls below 40 at 07:27, 26 s after the call, so the
   300-s window closes at 12:27, inside span 1; the draft's check missed the ventilation objective [MEAS §0]. The
   ventilation goes back at "Recovering" (08:35) instead (D2).
9. **MH: potassium is "not assessable"** on the early path (K⁺ max 4.7–4.8), not met [MEAS §0, §1].
10. **Premed: the apnoea timing depends on the browser** (38.8 s Chromium, 56.8 s WebKit after Induce; the healthy
    induction 52.3 / 53.9 s): do not promise that the premedicated patient "stops breathing sooner" [MEAS §3].
11. **Speed after a fast-forward is unchanged**: set the next speed yourself [MEAS §7].
12. **The alarm-pause rule**: a higher-priority alarm ENDS a pause (owner's 7 October ruling, built); the draft guide's
    "pause holds" was a withdrawn ruling [R00 2026-10-12 "WITHDRAWN"; `docs/gates/stage-10.md` §7 item 3]. On
    Saadat-style, Silence ends at the next alarm, measured 4–5 s in anaphylaxis [MEAS §7].
13. **No on-screen version label**: the only version text is the Debrief's build footer [MEAS §7]. The opening line
    no longer points at a label.

## How to read this sheet

- **Sim** is the session-bar clock (scenario clock, Load = 0:00). **W** is the wall-clock time from pressing **Load**,
  in m:ss, as **measured** in kit round A (Chromium unless marked; WebKit agreed to a few seconds), with a scripted
  reaction of 2 s of wall after each cue [MEAS header: `KITROUND_REACT_S`]. A W marked **≈ (computed)** is sim ÷ speed
  on a path that was not run as such.
- A fast-forward takes **10.0–10.6 s** of wall time, 2 min and 5 min alike, and **leaves the speed as it was**
  [MEAS §7].
- **Boxed words** are the exact on-screen labels, from the card files and the kit-round rows. "C / W" = Chromium /
  WebKit.
- Monitor numbers are what the kit round read on the instructor's monitor. Real presses land a few seconds
  differently, so expect ± a few units [R45 tolerances HR ± 5, pressures ± 5, SpO₂ ± 2, EtCO₂ ± 3, via the draft].
- Each bracket names its source. Source keys:

| Key | File |
|---|---|
| MEAS | `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` (kit round A, 2026-10-13; § numbers) |
| KR | `docs/showcase/kit-round-a/<case>-kit-round-<chromium/webkit>.md` (the raw rows). "KR62" = the files ending `-kit-62e521c3` (the re-check on the fixed kit) |
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

## The programme at a glance

The slot length for the day is not in the sources. *Owner default — change if he says otherwise (D4):* the full
programme below is **60 minutes**; the boxed **45-minute cut** follows it. Talk allowances are planning figures, not
measurements [showcase 1 used 3–4 min for induction, 3–4 for anaphylaxis, 5 for bronchospasm and 8 for haemorrhage,
SC1 "Order for a clinical audience"]. The run times are measured.

| # | Segment | Speeds used | Run (W) | Slot with talk | Clock (T+) | Drop order |
|---|---|---|---|---|---|---|
| 0 | Opening + the QR moment | — | — | 5:00 | 0:00–5:00 | keep |
| 1 | Induction after fentanyl and midazolam (the premed contrast) | ×4 | **2:00** to 8:00 [KR premed C] | 4:00 | 5:00–9:00 | keep |
| 2 | Healthy induction, airway not secured (plain induction) | ×8, ×4, one 5-min FF | **1:36** to the tube [KR induction C] | 4:30 | 9:00–13:30 | **drop 2nd** |
| 3 | Anaphylaxis under anaesthesia | ×4 | **1:16** to 5:00 [KR62 anaphylaxis C] | 3:30 | 13:30–17:00 | keep |
| 4 | Severe bronchospasm on the ventilator (Ventilator view) | ×4, ×8, two 2-min FF | **1:27** to 8:44 [KR bronchospasm C] + the reload | 4:30 | 17:00–21:30 | **drop 1st** |
| 5 | Class IV haemorrhage, PEA and resuscitation (+ Explore) | ×8, ×4, ×1, one 2-min FF | **3:04** to 1 min after ROSC, with 5–10 s pauses [KR haemorrhage C]; + the Explore talk | 7:30 | 21:30–29:00 | keep |
| 6 | Stab wound: tamponade, PEA and pericardiocentesis | ×8, ×1, ×4 | **≈ 3:45 (computed)**: this sheet's path was not run as such (see Case 6) | 6:00 | 29:00–35:00 | keep |
| 7 | The Debrief moment (tamponade report, print to PDF) | — | — | 4:00 | 35:00–39:00 | keep |
| 8 | Malignant hyperthermia | ×8, ×4, three 5-min FF | **2:05** to 24:34 [KR62 MH early-normo C] | 7:00 | 39:00–46:00 | keep |
| 9 | Close: roadmap and the ask | — | — | 3:00 | 46:00–49:00 | keep |
| 10 | Questions | — | — | 10:00 | 49:00–59:00 | shorten |
| | Slack (Loads, "All alarms on", the reload) | | | 1:00 | 59:00–60:00 | |
| | **Total** | | | **60:00** (49:00 before questions) | | |

> **The 45-minute cut** (*owner default — change if he says otherwise*, D4)
>
> Drop **bronchospasm** (−4:30) and then the **plain induction** (−4:30); shorten questions to 5:00. The premed card
> still shows induction apnoea and the pressure fall. Without bronchospasm there is no Ventilator view, so the reload
> before haemorrhage is not needed.
>
> | # | Segment | Slot | Clock (T+) |
> |---|---|---|---|
> | 0 | Opening + the QR moment | 5:00 | 0:00–5:00 |
> | 1 | Induction after fentanyl and midazolam | 4:00 | 5:00–9:00 |
> | 3 | Anaphylaxis under anaesthesia | 3:30 | 9:00–12:30 |
> | 5 | Class IV haemorrhage (+ Explore) | 7:30 | 12:30–20:00 |
> | 6 | Tamponade | 6:00 | 20:00–26:00 |
> | 7 | The Debrief moment | 4:00 | 26:00–30:00 |
> | 8 | Malignant hyperthermia | 7:00 | 30:00–37:00 |
> | 9 | Close | 3:00 | 37:00–40:00 |
> | 10 | Questions | 5:00 | 40:00–45:00 |
> | | **Total** | **45:00** (40:00 before questions) | |
>
> Still over: skip the Explore moment in haemorrhage (−1:30). Stage 11's 30-minute programme for six cards is the
> floor [P11 "The 30-minute programme"].

---

## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)

Owner questions this checklist depends on: **E13** which Mac presents and its Node.js, **E14** the network for the
phones [R31 §3]. Tick every line.

**The kit** (matches `PRE-FLIGHT.md` [PF])
- [ ] The kit is built from **main at 62e521c3 or later**: the kit's `VERSION.txt` line `Commit:` reads `62e521c3…` or a
      later main commit [KIT: "Commit: 62e521c37df5…", built 2026-10-13]. Older kits (51a37063 to 56f3761f) have the
      relay that dies at the first phone (KR-A1) [MEAS §9 item 1].
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
- [ ] Close other heavy apps. The kit round ran at a load average of 1.3–4.9; earlier gates lost presses under heavy load
      [MEAS header; G13 §6: one lost epinephrine press at load ≈ 200].

**The owner's hand checks** (all ticked before the day; [R31 §2; G12P])
- [ ] **H17** your own phone through the six Showcase cards over the hotspot, on the 62e521c3 (or later) kit; fill
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
      sample; EtCO₂ 34–35 → 33–34; the cockpit sent 6 020 / 6 017 contiguous frames) [MEAS §6], but Playwright's WebKit
      is not Safari: the real-Safari check is still yours.
- [ ] **Print** the Debrief preview in Chrome and Safari [R31 "Print"; PRINT]. Not printed in the kit round
      [MEAS §10].

**Monitor style** (*owner default — change if he says otherwise*, D5 / D6)
- [ ] Settings → Monitor: **Saadat-style** (the default). On it, **Pause alarms** is greyed out with "This monitor has
      no alarm pause. Silence mutes for 120 s." [MEAS §7].
- [ ] Do not change the monitor style during the talk: after a change to Philips-style the phones' AGENTS tile read
      "---" against the instructor's "0.0" for the whole 30 s watched (FX-9) [MEAS §8].

**Limit alarms** (the factory state, and the state after every Load, is "Limit alarms off")
- [ ] Instructor → **Devices & alarms** → **All alarms on**: the top-right alarm button then reads **No alarms** [KR
      setup rows: "Limit alarms off" → "No alarms"].
- [ ] **After EVERY Load, press All alarms on again.** Loading a case turns the limit alarms off, in every case, on
      both engines [MEAS §7]. The cases below put it in their first row.
- [ ] Why: with limit alarms off only `CO2 APNEA`, `SPO2 LOW PERFUSION`, `IBP1 STATIC PRESSURE`, `SPO2 NO PULSE` sound,
      and the premed card's RR alarm never comes [G11 §4 finding 1]. With limits on it comes at 01:40 [MEAS §3].
- [ ] **After a page reload**: All alarms on is lost and Sound on is lost; the session code is kept, the case is gone
      (no scenario loaded), and the phones are still synced 15 s later, following the reloaded page [MEAS §7].

**Sound**
- [ ] Projector/room speakers connected; click **Sound off** (it turns to **Sound on**) and hear the beat tone at ×1.
      Sound by ear was not checked in the kit round (headless) [MEAS §10]: do it now.
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
- [ ] On the Instructor panel's **Scenario** tab, the **Showcase** chip shows six cards: Healthy induction · Induction
      after fentanyl and midazolam · Anaphylaxis under anaesthesia · Malignant hyperthermia · Stab wound: tamponade, PEA
      and pericardiocentesis · Class IV haemorrhage, PEA and resuscitation [P11 "Order and durations"]. Bronchospasm is
      in the **Airway and breathing** chip [CARD: category].

---

## 2. Opening (T+0:00 → 5:00)

| T+ | Do | Say (draft) |
|---|---|---|
| 0:00 | Monitor view on the projector, no case running | *"This is an open-source anaesthesia teaching simulator: a patient monitor, an instructor's panel and a ventilator, driven by a physiological model. It is for education only. It is not a medical device and never for patient care. What you see is the pre-release of version 1.0."* [footer text from PRINT; release label "v1.0.0-rc.1, pre-release", R31 §4]. There is **no version label on screen**: the only version text is the Debrief's build footer ("Build 56f3761f 2026-10-13." on the measured kit; the 62e521c3 kit carries "62e521c3 2026-10-13"); the rc label comes with Stage 8b [MEAS §7]. Do not point at a label |
| 0:45 | — | *"What is different: you can explore the physiology. A real monitor shows a handful of numbers; here we can open the whole body behind them, while the case runs."* (Explore physiology, shown in case 5) |
| 1:30 | **The QR moment.** Pointer to the top edge → **Phones**. The QR fills the screen, with the address, the 6-letter code and "0 phones following" [CR12 "The QR moment"] | *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your phone: it follows what I do here. It is silent: tap Sound off if you want to hear it."* [CR12] |
| 2:00–3:30 | Watch the count rise ("12 phones following"). A phone that does not open: is it on that Wi-Fi? (mobile data cannot reach the laptop) | One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen" [CR12 "What the room sees"] |
| 3:30 | **Close**. Phones are now following before any case is loaded | *"Your phone follows speed, pause and fast-forward. When I open the ventilator, your phone will wait: the ventilator lives on the main screen."* [CR12] |
| 4:00 | Instructor → **Scenario** → **Showcase** | *"Six cases. Every number you will see is produced by the model; the buttons only give what their label says."* [CARD notes: "MODELED: the physiology produces every change; the buttons only give what their label says."] |

Measured capacity, if asked: 30 phones cost the relay under 2 % of one core; each phone receives about 1.3 KB/s at ×1 and
10.5–11.7 KB/s at ×8; at 120 simulated phones relay CPU ≤ 2 %, lag p95 ≤ 2.8 ms [G12 §5]. In the kit round three
emulated phones followed every case with no stale reading, status "synced" in every sample but one, and 1–7 resyncs per
phone per case, one per Load, fast-forward or Ventilator view, by design [MEAS §8].

---

## 3. The cases

**Every case starts the same way: Load → All alarms on → set the speed → Bookmark.** Loading turns the limit alarms
off [MEAS §7]; the Bookmark is the "Return here" fallback (§6).

While the amber fast-forward panel shows, the page refuses commands: do not press card buttons during it
[G10, Stage 10 plan D-6]. **The speed after a fast-forward is the speed before it** (×1 stays ×1, ×4 stays ×4): set the
next speed yourself [MEAS §7].

**What the audience sees during a fast-forward** (the same on the projector, the second screen and the phones): the page
dimmed and blurred, an amber panel "FAST FORWARD · 5 MIN" (or "· 2 MIN") with a running clock over a progress bar and
"sound muted", for **10.0–10.6 s** [MEAS §7]; the beat tone is off above ×4 [G10 §6b]; at the end one two-tone cue, a
seam with its time on every waveform lane, a banner "Fast-forwarded N min, mm:ss → mm:ss. During it: …" listing the
alarms raised (e.g. "Fast-forwarded 5 min, 08:46 → 13:46. During it: ETCO2 TOO HIGH 10:07." [KR62 MH C]), and those
alarms latched silently on the monitor until the next acknowledge [G10 §6]. The phones show the panel too and resync at
its end [MEAS §8].

**Monitor style:** no change during a case (*owner default — change if he says otherwise*, D6) [MEAS §8].

### Case 1: Induction after fentanyl and midazolam (the premed contrast). Slot 4:00, ×4 throughout

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

### Case 2: Healthy induction, airway not secured (plain induction). Slot 4:30. DROP SECOND

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

### Case 3: Anaphylaxis under anaesthesia. Slot 3:30, ×4

Card: *Anaphylaxis under anaesthesia* (Showcase). States: Ventilated, stable → Anaphylaxis (starts by itself after 1 min)
→ Epinephrine given [CARD].

*Owner default — change if he says otherwise (D3):* epinephrine at **1:30 into the reaction**.

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

### Case 4: Severe bronchospasm on the ventilator (Ventilator view). Slot 4:30. DROP FIRST

Card: *Severe bronchospasm on the ventilator*, chip **Airway and breathing** (not Showcase) [CARD]. States: Severe
bronchospasm → Salbutamol given: ventilation recovering [CARD].

Rules: **load the case first, then open the Ventilator view** (it takes over ventilation) [RUN4 header]; the phones hold
and say "The ventilator is on the main screen" until the next case [CR12; MEAS §6]. The session bar (speed, 2 min,
Bookmark) is on the **Instructor** view only: go to Instructor to press it, then back to **Ventilator**. The kit round
sent its two spans and ×8 from the Ventilator view through the link (the command the bar's button sends) [MEAS §6;
`scripts/showcase/kit-round-a.kitround.ts`]; the cockpit kept ventilating while hidden for 30 s (H21) [MEAS §6].

| W | Sim | Speed | Press / do | Point at (measured, C and W identical) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **All alarms on**, **Bookmark**, then top bar **Ventilator** (opened at 00:27) | `%SPO2 LOW` at 00:28; lowest SpO₂ 87 % at 00:30 [MEAS §6] |
| 0:22 | 1:27 | ×4 | — | **before salbutamol: VTE 300 mL, Ppeak 35, expiratory minute volume 4.2 L/min, banner "⚠ High pressure (Pmax)"**; monitor EtCO₂ 32 [MEAS §6] |
| 0:33 | 2:08 | ×4 | **Instructor** → **Give salbutamol 250 µg** → back to **Ventilator** | salbutamol at 02:08 [MEAS §6] |
| ≈ 1:01 | 4:03 | — | **2 min** fast-forward (the cockpit keeps ventilating through it), then **×8** | 10.4 s of wall; "During it: no alarms" [KR bronchospasm C] |
| 1:14 | 6:16 | ×8 | point; then **2 min** fast-forward again, ×8 | 4 min 08 s after salbutamol: **VTE 501, Ppeak 34, MV 7.0**, no Pmax banner (the banner now reads "⚠ Intrinsic PEEP"); EtCO₂ 33–34 [MEAS §6; KR bronchospasm C] |
| 1:27 | 8:44 | ×8 | end; **reload the page (Cmd-R)** before the next case | 6 min 36 s after: **VTE 501, Ppeak 32, MV 7.0**; EtCO₂ 34 [MEAS §6] |

**Say:** narrate the delivered tidal volume and minute volume recovering (300 → 501 mL, 4.2 → 7.0 L/min) and the
high-pressure banner going out [MEAS §6]. The H5 numbers of FU-11 B (311 → 498 → 501) still hold within 11 mL [MEAS §6].

**Reload before haemorrhage.** A Ventilator view opened earlier in the page once kept ventilating a later haemorrhage
patient, which then did not arrest [R00 2026-10-04 "CRITICAL DEMO RULE"; SC1 rule 5]. FU-11 H6 now unloads the cockpit
on a new patient [F11B H6], but the reload is the measured-safe path. After the reload: **Sound on** again (a reload
loses it), then Load the next case and **All alarms on** as always; the session code is kept and the phones are still
synced 15 s later [MEAS §7].

**Debrief objectives and the expected verdict** [CARD; MEAS §6]: – recognise bronchospasm (the instructor judges it) ·
✓ treat with a bronchodilator (salbutamol at 02:08) · – watch VTE and minute volume recover (the instructor judges it).
16 timeline rows [MEAS §6].

### Case 5: Class IV haemorrhage, PEA and resuscitation (+ the Explore moment). Slot 7:30

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

### Case 6: Stab wound: tamponade, PEA and pericardiocentesis. Slot 6:00

Card: *Stab wound: tamponade, PEA and pericardiocentesis* (Showcase). States: Arrival → Deteriorating: systolic below
80 → PEA → CPR, ventilated with FiO₂ 1.0 → CPR: pericardium drained, catheter left in → Return of circulation →
Post-ROSC: 500 mL crystalloid running [CARD]. **Start CPR, intubate, FiO₂ 1.0** is offered only once the card is in
**PEA**; **Pericardiocentesis during CPR** only during CPR [CARD transitions].

*Owner default — change if he says otherwise (D1):* meet every timed objective. **This path differs from the one kit
round A ran** (that run fast-forwarded straight after CPR, the draft's deliberate miss). Up to the PEA the numbers are
measured; after the CPR press the times on this path are **computed** from the measured delays, marked ≈, and the cue
is always what you see, not the clock.

| W | Sim | Speed | Press / do | Point at |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | `CVP MEAN TOO HIGH` at 00:22 [MEAS §5] |
| 0:08 | 1:00 | ×8 | Name it aloud: tachycardia, narrow pulse pressure, raised CVP. Tick objective 1 on the Scenario tab (before 3:00) | HR 97, ART 105/85 (91), SpO₂ 98, EtCO₂ 32; **the CVP is the IBP2 tile: 17** (limits −5–15) [MEAS §5] |
| 0:23 | 3:00 | ×8 | — | HR 111, ART 99/83 (88), EtCO₂ 29 [MEAS §5] |
| 0:45 | 6:00 | ×8 | — | HR 134, ART 79/68 (72), EtCO₂ 24; `SPO2 LOW PERFUSION` 05:59, `ART SYS TOO LOW` 06:06; state Deteriorating 06:14 [MEAS §5; KR tamponade C] |
| 0:53 | 7:00 | **×1** | slow down for the arrest | HR 147, ART 62/54 (57), EtCO₂ 21 [MEAS §5] |
| 1:18 | 7:31 | ×1 | `IBP1 STATIC PRESSURE`: **the arterial trace is going flat.** Hand on the Scenario tab | [MEAS §5]; then `HR TOO LOW` 07:45 [MEAS §5] |
| 1:37 | **7:49** | ×1 | state **PEA** (07:48 is the pulse loss) → **Start CPR, intubate, FiO₂ 1.0 AT ONCE**. Do NOT wait for `SPO2 NO PULSE` | at the state: HR 45, arterial mean only ≈ 21 [KR tamponade C 07:49]. The rule is 10 s from **07:48**: press by **07:57**. `SPO2 NO PULSE` comes at **07:58**, already too late [MEAS §5] |
| ≈ 1:39 | ≈ 7:51 | **×4** | set ×4 | CPR alone, before drainage, reads about **41/20 (28), EtCO₂ 9** (after 2 min of it) [KR tamponade C 10:04] |
| ≈ 1:56 | 9:00 | **×1** | set ×1 | — |
| ≈ 2:16 | ≈ 9:20 | ×1 | **Pericardiocentesis during CPR** (about 1 min 30 s into CPR; the rule is 120 s: press by CPR time + 2:00, e.g. 09:51 for a CPR at 07:51). If "Not available now": press again | — |
| ≈ 2:17 | ≈ 9:21 | **×4** | set ×4 | — |
| ≈ 2:32 | ≈ 10:21 | **×1** | set ×1; watch the arterial line and the capnogram | about 75 s after drainage CPR alone reads **69/32 (45), EtCO₂ 18**. **This is the compressions, not a pulse: do NOT stop** [MEAS §5 probe; KR tamponade C 11:20] |
| ≈ 3:07 | ≈ 10:56 | ×1 | **the return of circulation**: the pressure climbs ABOVE the compression level (82/39, then about 104/58 within 2 s) and EtCO₂ rises → **Pulse back: stop CPR** (the rule allows 30 s) | measured **96 s (C) / 95 s (W) after drainage** on the kit-round path, whose drainage came 2 min 04 s into CPR [MEAS §5]; the engine gives 95.9 s for a drainage 2 min into CPR [G11 §3 S2]. On this path's earlier drainage: **not measured**, so cue from the screen |
| ≈ 3:39 | ≈ 11:28 | ×1 | **Crystalloid 500 mL** | 30 s after stopping CPR: ART 117–118/79 (92), HR 64, EtCO₂ 28–30 [MEAS §5; KR tamponade C] |
| ≈ 3:45 | — | — | end: go straight to §4 (the Debrief) | after ROSC, `ART DIA / MEAN / SYS TOO HIGH` (the overshoot) [KR tamponade C 11:46–11:47]; on the kit-round path at 15:00 ART 118/75 (89), HR 60, EtCO₂ 40 [MEAS §5] |

**The trap, measured:** a probe stopped CPR on the 69/32 reading. The patient re-arrested (`SPO2 NO PULSE` 11:34,
`ECG ASYSTOLE` 13:44) and the Debrief said "The return of circulation did not happen" [MEAS §5 probe]. Never stop CPR on
the first systolic above 60.

**Say:** PEA about 8 minutes after arrival without drainage [CARD story; MEAS §5: pulse loss 07:48]; CPR alone cannot
bring him back; drainage during good CPR brings the pulse back about a minute and a half later [CARD story; MEAS §5:
95–96 s]. The better course was to drain BEFORE the pulse was lost, while the systolic was still above 60: in the
engine, a drainage 60 s into the deterioration gives no PEA at all [G11 §3 S2 early drain]. Known miss: no pulsus
paradoxus in this model [SYN (b); R24 P3: SBP swing 3.4 mmHg against > 10 expected].

**Debrief objectives and the expected verdict** [CARD; rule times; MEAS §5]:
- – Name the tamponade within 180 s (no rule: "This objective has no rule: the instructor judges it.", followed by "The
  instructor ticked it at mm:ss." when you ticked it [`apps/demo/src/app/debrief.ts`]).
- ✓ CPR within 10 s of the pulse loss: ≈ 3 s on this path (07:48 → ≈ 07:51) **(computed; the kit round pressed at the
  alarm and measured 12 s ✗)**.
- ✓ Pericardiocentesis within 120 s of starting CPR: ≈ 1 min 29 s **(computed; measured 2 min 04 s ✗ on the
  kit-round path)**.
- ✓ Stop CPR within 30 s of the pulse returning (measured 2 s on the kit-round path) [MEAS §5].
- **✗ "Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA
  follows"**, with "The pulse loss at 07:48" [MEAS §5]. This is the one ✗ of the day (D1): it is the alternative course,
  not a timing. Say so.

### Case 7: Malignant hyperthermia. Slot 7:00 (×8, ×4 and three 5-minute fast-forwards)

Card: *Malignant hyperthermia* (Showcase). States: Induced (succinylcholine, sevoflurane 2 %) → Surgery under way →
Early signs: EtCO₂ rising at the same ventilation, tachycardia → Trigger off: sevoflurane stopped, O₂ 100 % at 10 L/min,
ventilation 20 × 600 → MH treatment under way → Recovering: EtCO₂ below 45 → Ventilation back to 12 × 500, O₂ 100 %
[CARD]. The **MH crisis** button is offered in Induced, Surgery, Early signs and Established [CARD].

*Owner default — change if he says otherwise (D2):* call at **Early signs**; ventilation back to 12 × 500 the moment
**Recovering** shows, before the first fast-forward; repeat dantrolene when EtCO₂ is back above 55. This path was run on
the fixed kit 62e521c3, both engines [MEAS §0, §1].

| W | Sim | Speed | Press / do | Point at (measured, C; W within a second) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **All alarms on**, **Bookmark** | — |
| 0:31 | 4:00 | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | state Surgery 04:05; HR 79, ART 99/66 (75), EtCO₂ 40 [KR62 MH C] |
| 0:50 | 6:30 | **×4** | watch the CO₂ tile climb at the same ventilation | EtCO₂ 45 at 06:37 [KR62 MH C] |
| 0:54 | **6:52** | ×4 | state **Early signs** → **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** at once (the rule allows 120 s) | EtCO₂ 46, HR 86, ART 105/70 (80) [KR62 MH C 06:53]. No limit alarm before the call: EtCO₂ peaks at 46, under the 49.4 limit [MEAS §1] |
| 0:57 | 7:01 | ×4 | (the call lands: state Trigger off) | 9 s after Early signs [MEAS §0]. If "Not available now": press again [G10 §8 item 1] |
| 1:02 | 7:22 | ×4 | **Dantrolene 2.5 mg/kg** (≈ 20 s after the call) | 21 s after the call [MEAS §1] |
| 1:04 | 7:33 | ×4 | **Cool: 2 L saline at room temperature** | — |
| — | 7:27 | ×4 | — | **EtCO₂ falls below 40**, 26 s after the call [MEAS §0] |
| 1:21 | **8:35** | ×4 | state **Recovering: EtCO₂ below 45** → **EtCO₂ normal: ventilation back to 12 × 500** at once | Recovering 08:35 / 08:34 (C / W); pressed 08:43 = 1 min 16 s after EtCO₂ < 40 (the rule allows 300 s) [MEAS §0, §1] |
| ≈ 1:22 | 8:46 | — | **5 min** fast-forward (1 of 3) | 10.4 s of wall; banner "During it: ETCO2 TOO HIGH 10:07." [KR62 MH C] |
| 1:35 | 14:00 | ×4 | **Pause**, point: **EtCO₂ 57** (above 55) → **Dantrolene 2.5 mg/kg** again (tick objective 3), **Resume** | ART 141/97 (111), HR 94, EtCO₂ 57 → repeat at 14:02 [MEAS §1; KR62 MH C] |
| ≈ 1:38 | ≈ 14:05 | — | **5 min** fast-forward (2 of 3) | during it `ART MEAN / DIA TOO HIGH` 15:38–15:39, `ART SYS TOO HIGH` 16:42, `RR TOO HIGH` 18:08; highest EtCO₂ **61** at 16:36 [MEAS §1; KR62 MH C] |
| 1:51 | 19:19 | ×4 | Pause, point | EtCO₂ **45**, ART 148/95 (112), HR 85 [MEAS §1; KR62 MH C] |
| ≈ 1:52 | 19:19 | — | **5 min** fast-forward (3 of 3) | "Recovering" again at 20:27 / 20:29 [MEAS §0] |
| 2:05 | 24:34 | ×4 | end (optional: **Debrief** to show a clean report) | EtCO₂ **41**, ART 146/92 (110), HR 80; `**ABPd 92>90` at 24:53 [MEAS §1; KR62 MH C] |

Each 5-min fast-forward took 10.4–10.6 s of wall, and ×4 stayed ×4 after it [MEAS §1].

**Say (the contrast, measured):** had we waited for the established crisis (Stages 10, 11 and 13 did), the call comes
at 18:57, 12 min 05 s after the early signs: EtCO₂ 81, HR 146, core temperature 39.3 °C, lactate 6.8, pH 7.09, K⁺ 5.8,
and EtCO₂ never back below 40 by 35:00 [MEAS §1, late call]. Untreated, K 6.4 and VF with core temperature 42.3 °C at
44.7 min [G11 §3 S1 untreated]. Honesty: the literature review found 44 min to death too fast for a volatile trigger,
and no human EtCO₂ time course behind the "40 → 60 by 10 min" band [R00 2026-10-11 "LITERATURE 29"; SYN (a) item 11].
After the treated crisis the model stays hypertensive (ART 141–148 systolic, MAP 110–112 here; known miss C-1)
[MEAS §1; G11 §5 Q8]. Do not give the potassium treatment on this path: K⁺ stays 4.2–4.8 [KR62 MH C Debrief facts].

**Why the EtCO₂ climbs back:** going from 20 × 600 back to 12 × 500 halves the minute ventilation while the muscle is
still producing CO₂; EtCO₂ rises to 57–61 and alarms (`ETCO2 TOO HIGH` 10:07, during span 1) [MEAS §0, §1]. That is the
natural moment for the repeat dantrolene (D2).

**Debrief objectives and the expected verdict** [CARD; MEAS §0, §1, both engines]: ✓ call within 120 s of the early
signs (9 s) · ✓ dantrolene within 300 s of the call (21 s) · – repeat dantrolene (no rule: the instructor judges it) ·
– potassium (**not assessable**: K⁺ never above 5.5) · ✓ ventilation back within 300 s of EtCO₂ < 40 (1 min 16 s).
Timeline 44 rows, 25 minute rows; facts: highest EtCO₂ 61 at 16:36, T1 max 37.5 °C, lactate max 2.4, pH min 7.21
[KR62 MH C].

**Owner's alternative:** the late call (two spans before the crisis, call at the established crisis): the Debrief marks
"call within 120 s" ✗ (12 min 05 s) [MEAS §0].

---

## 4. The Debrief moment (after the tamponade, before MH). Slot 4:00

*Owner default — change if he says otherwise (D1):* the sheet meets every timed objective. The tamponade report shows
one ✗, the structural "Better: pericardiocentesis before the pulse loss" line: the card's way of saying that the
better course was to drain before the arrest [CARD: objective 5, whose rule is that the pulse loss never happens]. The presenter names it as the better course
of action [R00 2026-10-13 "MEASURED VERDICTS"].

| T+ (within the slot) | Do | The audience sees |
|---|---|---|
| 0:00 | Session bar → **Debrief** | the report of the run just finished: header, objectives, measured facts [G13 §5] |
| 0:20 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** | — |
| 0:40 | Read the objectives aloud | expected: – Name the tamponade ("The instructor ticked it at mm:ss") · ✓ CPR within 10 s · ✓ Pericardiocentesis within 120 s · ✓ Stop CPR within 30 s · **✗ "Better: pericardiocentesis before the pulse loss…" — "The pulse loss at 07:48"** [CARD; MEAS §5]. The two ✓ for CPR and drainage are computed for this path (Case 6) |
| 1:15 | Say: *"Everything was done in time, and the report still marks one line: the better course was to drain before he lost his pulse. That is the teaching point."* | — |
| 1:30 | Point at **Measured facts** | on the kit-round path: lowest SpO₂ 95 % at 00:28, lowest ART M 19 at 07:58, pulseless 3 min 52 s, first lost at 07:48, lactate max 2.4, pH min 7.26 [MEAS §5]. On this sheet's path the pulseless time is shorter, ≈ 3 min 08 s (07:48 → ≈ 10:56, computed) |
| 2:00 | Scroll to **Timeline** | undone rows struck through [G13 §5]; 44 timeline rows and 16 minute rows on the kit-round path [MEAS §5]; this path has no fast-forward row and its count is not measured |
| 2:30 | **Print or save as PDF** → save | 5 A4 pages for tamponade on the Stage 13 path (25 rows) [G13 §9]; footer and build on every page in Chrome; in Safari the footer only ends each section [PRINT]. The page count on this path is not measured |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

Debrief after MH instead (owner's option): on this sheet's MH path the report is ✓ ✓ – – ✓, 44 timeline rows, 25
minute rows [KR62 MH C]; it has no ✗ at all. Do the Debrief BEFORE loading the next case: it reports the current run.

---

## 5. Close (T+46:00 → 49:00; 37:00 → 40:00 in the 45-minute cut) and questions

**Roadmap, one slide's worth** [RM]:
- **v1.0** (now: the release candidate). Feature work is merged; hardening, calibration and the release remain. The
  calibration pass follows the rc. Known limits in the release notes: education only, adults only, known misses listed
  with their measured value and target, shock decompensation and reflex bradycardia not modelled [RM v1.0-remaining].
- **v1.x**: maintenance only, no new physiology [RM README].
- **v2.0**: a physiological simulation engine: one declared state with units and conservation by construction; an
  autonomic hub and reflexes (the first workstream); failure that emerges from supply and demand; a patient parameter
  layer; predictive validation; the missing systems (coagulation, sepsis, laboratory values, paediatric and obstetric
  physiology); an intended-use statement [RM v2.0 README "Workstreams"].

**The ask** (wording and figures are the owner's; none are in the sources):
- Funding: ‹amount, for what: e.g. the calibration pass, the blind realism review, v2.0's first workstream›.
- A research line: ‹e.g. the Saadat bedside comparison and the blind review, both built and not yet run [SC1 handout
  "Not yet done"]›.
- Adoption: ‹residency use: instructor-led, one laptop and a projector, phones as learner monitors›.

**Questions** (T+49:00 → 59:00; 40:00 → 45:00 in the cut): see the presenter guide for the validation answer.

---

## 6. Fallbacks

| What happens | What to do | Source |
|---|---|---|
| The QR relay fails, "Start Classroom" needs Node, or phones say "cannot reach the instructor's laptop" | Carry on with **Start Simulator** and **Open on a second screen** (the same browser) for the projector; phones are not needed for any case | [CR12 "(c)" and "If something goes wrong"] |
| The sheet says "The relay does not answer", or the black window stops | Close the Classroom window, double-click **Start Classroom** again, reload the page, **Sound on**. A kit before 62e521c3 stops at the first phone (KR-A1): use the 62e521c3 kit | [CR12; MEAS §9 item 1] |
| Sound fails | Say so (*"the sound has failed; the alarms still show on screen"*) and continue; alarms stay visual | [G10 §7] |
| A card press shows **"Not available now: the case has moved to …"** | Press again: the button now belongs to the current state | [G10 §8 item 1] |
| A scenario goes wrong (wrong press, missed window) | Session bar **Bookmark** list → **Return here** on the bookmark taken at Load; the patient and the screen are restored together. Then check the top-right alarm button: if it reads "Limit alarms off", press **All alarms on** (whether Return here keeps the alarm setting was not measured) | [FU-11 E4; MEAS §7] |
| The page froze or a Ventilator view is still driving | Reload (Cmd-R): **Sound on**, re-load the card, **All alarms on**, Bookmark; the session code is kept and the phones follow again | [MEAS §7; R00 2026-10-04] |
| Tamponade: you missed the PEA moment and `SPO2 NO PULSE` has sounded | Press **Start CPR** at once anyway; the CPR line will be ✗ (12 s at the alarm). Or **Return here** and run the case again | [MEAS §5] |
| A phone says "This session is full" | 60 phones are following: ask a neighbour to share | [CR12] |
| A phone says "The ventilator is on the main screen" | Expected during case 4 | [CR12; MEAS §6] |
| The phones show "---" where the screen shows a number after a style change | You changed the monitor style mid-session (FX-9). Change it back, or re-load the case | [MEAS §8] |
| "The monitor stopped" toast (hidden-tab watchdog) | Reload the page and re-load the card; if this showed in H19, do not switch tabs during the talk | [ADD2 H19; F11A §5] |

---

## Still not measured

1. **The slot length** and running order of the day (time, room, projector, who else presents): this sheet gives 60
   and 45 minutes (D4).
2. **E13 / E14**: which Mac presents, its Node.js version, and the network on the day [R31 §3].
3. **Real devices**: H17 (own phone, hotspot capacity), H18 (the fast-forward look in Safari), H19 (hidden tab), H20
   (second screen in Safari), H21 in real Safari (it passed in Playwright's WebKit [MEAS §6]), sound by ear, and the
   print [MEAS §10].
4. **The tamponade path of this sheet** (CPR at the PEA state, ×4 / ×1, drainage about 1 min 30 s into CPR): not run
   as such. Its two ✓ (CPR ≈ 3 s, drainage ≈ 1 min 29 s) are computed from the card's rules and the measured pulse
   loss (07:48) and PEA state (07:49) [MEAS §5]; the return of circulation after an earlier drainage, the Debrief
   facts, row count and page count on this path are not measured. A kit-round re-run of this path would settle it.
5. **A human's reaction time**: the kit round used a fixed 2 s of wall [MEAS §10]. The tamponade CPR window is about 8 s
   of wall from the PEA state at ×1.
6. **Fast-forward and ×8 from the session bar during bronchospasm**: the kit round sent them from the Ventilator view
   through the link; the presenter presses them on the Instructor view with the cockpit hidden, which H21 covers for
   30 s but which was not run as such [MEAS §6].
7. **Whether "Return here" keeps "All alarms on"**: not measured; the fallback says to check.
8. **E21** (rulings): whether the limit alarms should survive a Load (a small fix) or stay a presenter step; until it
   is decided, the sheet presses **All alarms on** after every Load [R00 2026-10-13 "MECHANICS"].
9. **The bronchospasm "≈ 3 min after salbutamol" reading**: the 2-min span from 04:03 already ends 3 min 55 s after
   salbutamol, so the first reading is at 4 min 08 s [MEAS §10].
10. **The figures for the ask** (funding amount, research line, adoption terms).
11. **ID collisions**: the review pack's addendum 2 uses H20 and E17–E19 for other items; this sheet uses the rulings'
    meaning [R31 note 1].
