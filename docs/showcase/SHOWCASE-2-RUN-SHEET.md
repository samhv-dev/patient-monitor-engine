# Showcase 2: run sheet (DRAFT for the owner's rehearsal)

*Thursday 2026-10-22 (slack to the 25th), university deans and clinical staff. Presenter: the owner. DRAFT of 2026-10-11,
written from the gate evidence of Stages 10–13 and FU-11 and from the showcase-1 documents; nothing here was measured
for this sheet. The kit round after the 19 October freeze re-measures it. Where a number has not been measured, the sheet
says **[to be measured at the kit round]** instead of guessing.*

Companion: [`SHOWCASE-2-PRESENTER-GUIDE.md`](SHOWCASE-2-PRESENTER-GUIDE.md) (one page: ten things to remember, keys,
alarm rule, the validation answer).

## How to read this sheet

- **Sim** is the session-bar clock (scenario clock, load = 0:00). **W** is the wall-clock time from pressing **Load**,
  in m:ss. W is computed (sim ÷ speed, plus about 10 s for each fast-forward), not measured. The fast-forward's wall time
  is measured [G10 §5: 300 s span 10.00–10.01 s; G10 §6b: MH spans 10.3–10.7 s, tamponade 2-min spans 10.1–10.5 s].
- **Boxed words** are the exact on-screen labels (from the card files and gate run sheets). "C / W" = Chromium / WebKit.
- Monitor numbers are what the kit's scripted rehearsal read on the monitor at ×4 on the Stage 11 / Stage 13 builds.
  Real presses land a few seconds differently, so expect ± a few units [RS11 header: presses land 1–5 s of scenario
  clock late; R45 tolerances HR ± 5, pressures ± 5, SpO2 ± 2, EtCO2 ± 3].
- Each bracket names its source and the value it holds. Source keys:

| Key | File |
|---|---|
| G10 | `git show origin/stage-10:docs/gates/stage-10.md` (Stage 10 dry run, time control) |
| G11 | `docs/gates/stage-11.md` on main (Stage 11 gate; §3 holds the engine-level numbers S1–S5) |
| RS11 | `docs/gates/stage-11/run-sheet-numbers.md` on main (browser rehearsal tables, both engines) |
| P11 | `docs/plans/stage-11-scenarios.md` on main, "Order and durations" |
| G12 | `git show origin/stage-12:docs/gates/stage-12.md` (Stage 12 dry run, phones) |
| CR12 | `git show origin/stage-12:docs/showcase/CLASSROOM.md` (identical to `_sandbox/pme-classroom-dryrun/CLASSROOM.md`) |
| PF / OPT | `_sandbox/pme-classroom-dryrun/PRE-FLIGHT.md` / `OWN-PHONE-TEST.md` |
| G13 | `git show origin/stage-13:docs/gates/stage-13.md` (Stage 13 dry run, Debrief) |
| DB-T / DB-MH | `origin/stage-13:docs/gates/stage-13/rehearsal/debrief-tamponade-*.json` / `debrief-mh-*.json` (Debrief verdicts, kit 58b2c13c) |
| RS13 | `origin/stage-13:docs/gates/stage-13/rehearsal/run-sheet-*.md` |
| PRINT | `_sandbox/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt` |
| CARD | `origin/stage-13:apps/demo/src/app/showcase/showcase-*.json` (objective text and Debrief rule; states and button labels) |
| F11A / F11B | `docs/gates/fu-11-a.md` / `docs/gates/fu-11-b.md` on main |
| RUN4 | `docs/showcase/RUN-STEPS.md` on main (showcase 1, round 4 build 41678d0b) |
| SC1 | `_sandbox/pme-showcase-docs/run-sheet.pdf` (showcase 1's printed run sheet, 6 Oct) |
| R00 / R24 / R25 | `research/00-orchestrator-rulings.md` / `research/24-showcase2-probes.md` / `research/25-owner-questions-2026-10-07.md` |
| ADD2 | `research/15-review-pack/addendum-2/index.html` (owner boxes H17–H19, E13–E15) |
| SYN | `research/30-parts/99-synthesis.md` (the target audit's synthesis) |
| RM | `docs/roadmap/README.md`, `docs/roadmap/v1.0-remaining.md`, `docs/roadmap/v2.0/README.md` on main |
| SKIN | `packages/skins/src/data/skins/saadat-like.json`, `philips-like.json` on main |

## The programme at a glance

Slot length for the day is not in the sources (see "Facts I could not find"). The budget below is the full programme;
talk allowances are planning figures, not measurements [showcase 1 used 3–4 min for induction, 3–4 for anaphylaxis, 5 for
bronchospasm and 8 for haemorrhage, SC1 "Order for a clinical audience"].

| # | Segment | Speeds used | Run (W, computed) | Slot with talk | Clock (T+) | Drop order |
|---|---|---|---|---|---|---|
| 0 | Opening + the QR moment | — | — | 5:00 | 0:00–5:00 | keep |
| 1 | Induction after fentanyl and midazolam (the premed contrast) | ×4 | 2:00 | 4:00 | 5:00–9:00 | keep |
| 2 | Healthy induction, airway not secured (plain induction) | ×8, ×4, 5-min FF | 1:40 | 4:30 | 9:00–13:30 | **drop 2nd** |
| 3 | Anaphylaxis under anaesthesia | ×4 | 1:15 | 3:30 | 13:30–17:00 | keep |
| 4 | Severe bronchospasm on the ventilator (Ventilator view) | ×4, ×8, 2-min FF | 1:30 | 4:30 | 17:00–21:30 | **drop 1st** |
| 5 | Class IV haemorrhage, PEA and resuscitation (+ Explore) | ×8, ×4, ×1, 2-min FF | 3:00 + 1:30 pauses | 7:30 | 21:30–29:00 | keep |
| 6 | Stab wound: tamponade, PEA and pericardiocentesis | ×8, ×1, ×4, 2-min FF | 3:30 | 6:00 | 29:00–35:00 | keep |
| 7 | The Debrief moment (tamponade report, print to PDF) | — | — | 4:00 | 35:00–39:00 | keep |
| 8 | Malignant hyperthermia | ×8, ×4, three 5-min FF | 2:30 | 7:00 | 39:00–46:00 | keep |
| 9 | Close: roadmap and the ask | — | — | 3:00 | 46:00–49:00 | keep |
| 10 | Questions | — | — | 10:00 | 49:00–59:00 | shorten |
| | **Total** | | | **59:00** (49:00 before questions) | | |

If time runs short: drop **bronchospasm** first (−4:30 → 54:30), then the **plain induction** (−4:30 → 50:00); the
premed card still shows induction apnoea and hypotension [orchestrator default in the brief]. Then shorten questions,
then skip the Explore moment in haemorrhage (−1:30). Stage 11's 30-minute programme for the six cards (≈ 17 min running,
≈ 13 talking, with Stage 10 merged) is the floor [P11 "The 30-minute programme"].

---

## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)

Owner questions still open that this checklist depends on: **E13** which Mac presents and its Node.js, **E14** the
network for the phones [ADD2; G12 §6 Q5]. Tick every line.

**The Mac and the kit**
- [ ] Presenting Mac has **Node.js 22 or later**: Terminal `node -v` prints `v22…` or later; otherwise install the LTS
      from nodejs.org [CR12; PF §1; G12 §4: the kit's `runtime/` is empty, so the Mac's own Node is used].
- [ ] Double-click **Start Classroom**; its window says **THE CLASSROOM IS RUNNING** and lists the phones' address; click
      **Allow** if macOS asks about "node"; the browser opens the simulator [PF §2: `http://127.0.0.1:8650/?relay#/`].
      Keep the black window open all session.
- [ ] Fallback launcher ready: **Start Simulator** (no phones) [CR12 "(c)"; RUN4 step 1: `127.0.0.1:8642/#/`]. The
      fallback kit and this sheet on a USB stick [R00 2026-10-03 "three layers"].
- [ ] One browser window, zoom 100 %, at least about 1280 px wide (narrower, the panels overlap) [SC1 "Avoid"].
- [ ] Close other heavy apps: the gate timings were measured on an unloaded Mac; under heavy load presses were lost
      [G10 §5: load 12–30; G13 §6: one lost epinephrine press at load ≈ 200].

**Limit alarms ON** (the factory state is "Limit alarms off")
- [ ] Instructor → **Devices & alarms** → **All alarms on**. The top right then reads **No alarms** and the tiles show
      their limits [SC1 "If asked why does it say Alarms off": e.g. HR 50–150].
- [ ] Why: with limit alarms off only `CO2 APNEA`, `SPO2 LOW PERFUSION`, `IBP1 STATIC PRESSURE`, `SPO2 NO PULSE` sound,
      and the premed card's first objective (acknowledge the RR alarm within 30 s) cannot be met [G11 §4 finding 1; RS11
      "Alarm words in the browser"].
- [ ] Repeat after every page reload (whether the setting survives a reload: **[to be measured at the kit round]**).

**Sound**
- [ ] Projector/room speakers connected; click **Sound off** (it turns to **Sound on**) and hear the beat tone at ×1.
- [ ] At ×8 there is no beat tone (by design) [G10 §6b: 0 beat tones at ×8]; a fast-forward ends with one two-tone cue
      [G10 §6: one 660 + 990 Hz cue ≥ 9 s after the click]. Listening to the cue by ear was not done in the gate
      [G10 §6 "Not done by hand"]: do it now.

**Network and the QR relay test (one phone)**
- [ ] Choose the network (E14): ☐ venue Wi-Fi ☐ travel router (recommended for 30 phones) ☐ the Mac's hotspot ☐ none
      (Start Simulator + second screen) [PF "Decide"; CR12 "(b)"]. Hotspot capacity was NOT measured [CR12 "(b)" 2].
- [ ] Monitor view → pointer to the top edge → **Phones**; the code shows `http://<this Mac's address>:…`, never the
      hosted https site [PF §5].
- [ ] Scan with your own phone: within a few seconds it shows the monitor upright and the sheet says **1 phone
      following** [PF §3]. Tap **Sound off** on the phone: alarms heard; tap again: silent.
- [ ] Lock the phone 60 s, unlock, note how long until "Following" again: ___ s (over 15 s becomes a follow-up)
      [OPT "Once"].
- [ ] Venue Wi-Fi: if the phone says "this phone cannot reach the instructor's laptop", the Wi-Fi isolates devices: use
      the router or hotspot [CR12 "The day before" 2].

**Print**
- [ ] Safari print-preview check of a Debrief [PRINT]: report alone, A4 portrait, Trends / Timeline / appendix each on a
      new page, struck-through undone rows. Safari prints the footer only at the end of each section (known limit);
      Chrome prints "For education only. Not a medical device…" and "Page n of N" on every page [PRINT]. If Chrome is on
      the Mac, print the live Debrief from Chrome.

**The owner's hand checks (from the review pack and rulings)**
- [ ] **H17** your own phone through the six Showcase cards over the hotspot; fill `OWN-PHONE-TEST.md`; Stage 12 merges
      only after it [ADD2 H17; OPT; G12 §4 PENDING-OWNER].
- [ ] **H18** the fast-forward look in real Safari: dimmed AND blurred page, amber "FAST FORWARD · 5 MIN" panel, clock,
      banner, waveform seam [ADD2 H18; G10 §6: WebKit screenshots show the dimming but not the blur (capture limit),
      top-band luminance 17.4 vs 35.1].
- [ ] **H19** hidden tab: instructor page hidden behind another tab for ≈ 7 min in real Chrome and Safari, then
      Bookmark or a command: the monitor comes back live, no "The monitor stopped" message [ADD2 H19; F11A §5: not
      measured on any machine; the guide said ≥ 6.5 min].
- [ ] **H20** the same-browser second screen in real Safari follows within 5 s [R00 2026-10-11 ~21:00: "new OWNER hand
      check H20 = second-screen follower in real Safari syncs within 5 s"]. *(Note: the review pack uses the ID H20
      for a different item, the citation check; see "Facts I could not find".)*

**Last minute (T−10 min)**
- [ ] Reload the page fresh; **All alarms on**; **Sound on**; Monitor view on the projector; the QR sheet ready.
- [ ] On the Instructor panel's **Scenario** tab, the **Showcase** chip shows six cards in this order: Healthy
      induction · Induction after fentanyl and midazolam · Anaphylaxis under anaesthesia · Malignant hyperthermia ·
      Stab wound: tamponade, PEA and pericardiocentesis · Class IV haemorrhage, PEA and resuscitation [P11 "Order and
      durations"]. Bronchospasm is in the **Airway and breathing** chip [G11 §5 Q2].

---

## 2. Opening (T+0:00 → 5:00)

| T+ | Do | Say (draft) |
|---|---|---|
| 0:00 | Monitor view on the projector, no case running | *"This is an open-source anaesthesia teaching simulator: a patient monitor, an instructor's panel and a ventilator, driven by a physiological model. It is for education only. It is not a medical device and never for patient care. What you see is version 1.0.0-rc.1, a pre-release."* [footer text from PRINT; version label on screen: **[to be confirmed at the kit round]**, the rc is cut by Stage 8b after the 19 Oct freeze, R00 2026-10-06 plan] |
| 0:45 | — | *"What is different: you can explore the physiology. A real monitor shows a handful of numbers; here we can open the whole body behind them, while the case runs."* (Explore physiology, shown in case 5) |
| 1:30 | **The QR moment.** Pointer to the top edge → **Phones**. The QR fills the screen, with the address, the 6-letter code and "0 phones following" [CR12 "The QR moment" 1] | *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your phone: it follows what I do here. It is silent: tap Sound off if you want to hear it."* [CR12 "The QR moment" 2] |
| 2:00–3:30 | Watch the count rise ("12 phones following"). A phone that does not open: is it on that Wi-Fi? (mobile data cannot reach the laptop) | One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen" [CR12 "What the room sees"; relay default `maxPeersPerRoom` 60] |
| 3:30 | **Close**. Phones are now following before any case is loaded | *"Your phone follows speed, pause and fast-forward. When I open the ventilator, your phone will wait: the ventilator lives on the main screen."* [CR12] |
| 4:00 | Instructor → **Scenario** → **Showcase** | *"Six cases. Every number you will see is produced by the model; the buttons only give what their label says."* [CARD notes: "MODELED: the physiology produces every change; the buttons only give what their label says."] |

Measured capacity, if asked: 30 phones cost the relay under 2 % of one core; each phone receives about 1.3 KB/s at ×1 and
10.5–11.7 KB/s at ×8; at 120 simulated phones relay CPU ≤ 2 %, lag p95 ≤ 2.8 ms [G12 §5]. Every phone stayed `synced`
through ×1, ×8 and the 2-minute fast-forward on all six cards; one resync per fast-forward is by design [G12 §3b].

---

## 3. The cases

Before each case: **Bookmark** in the session bar right after **Load** (the "Return here" fallback, §6).
While the amber fast-forward panel shows, the page refuses commands: do not press card buttons during it
[G10 Stage 10 plan D-6, via `origin/stage-10:docs/plans/stage-10-time-control.md`].

**What the audience sees during a fast-forward** (the same on the projector, the second screen and the phones): the page
dimmed and blurred, an amber panel "FAST FORWARD · 5 MIN" (or "· 2 MIN") with a running clock over a progress bar and
"sound muted", for about 10 s [G10 §5–§6; R25 C1: ≈ 10 s]; the beat tone is off above ×4 [G10 §6b]; at the end one
two-tone cue, a seam with its time on every waveform lane, a banner for about 8 s "Fast-forwarded N min, mm:ss → mm:ss.
During it: …" listing the alarms raised, and those alarms latched silently on the monitor until the next acknowledge
[G10 §6; Stage 10 plan D-12, D-13]. The phones show the panel too and catch up at its end [CR12; G12 §3b].

### Case 1: Induction after fentanyl and midazolam (the premed contrast). Slot 4:00, ×4 throughout

Card: *Induction after fentanyl and midazolam* (Showcase). States: Awake, preoxygenating → Fentanyl 2 µg/kg and
midazolam 0.03 mg/kg given → Induced → Intubated and ventilated → (Phenylephrine / Ephedrine given) → Ventilated:
vasopressor given [CARD]. Limit alarms must be ON (§1).

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **Bookmark** | — |
| 0:02 | 0:08 | ×4 | (premedication gives itself) | HR 71, ART 123/82 (96), SpO2 96, EtCO2 36 [RS11 0:08 C/W] |
| ≈ 0:21 | ≈ 1:24 | ×4 | RR limit alarm → top-right alarm button → **Acknowledge**, then tick objective 1 on the Scenario tab | Engine alarm text "RR 7<8" at 1:24 [G11 §4 finding 1, from the plan]; the browser alarm with limits ON: **[to be measured at the kit round]** |
| 0:30 | 2:00 | ×4 | — | HR 62–63, ART 119/74 (88–89), EtCO2 45; airway RR 9 (1:01) → 5 (2:12) [RS11 2:01; RS11 table, Chromium probe] |
| 0:45 | 3:00 | ×4 | **Induce now** | HR 60–61, ART 115–116/71–72 [RS11 3:03 / 3:05] |
| 0:55–0:58 | 3:39–3:52 | ×4 | `CO2 APNEA` → **Intubate and ventilate** at once (the rule allows 60 s of sim = 15 s of wall) | Apnoea 36 s (C) / 47 s (W) after induction; healthy induction: 54.5–55.9 s [RS11] |
| ≈ 1:10 | ≈ 4:38–4:41 | ×4 | MAP below 60 → **Ephedrine 10 mg** within 60 s of sim (15 s of wall) | ART 85/49 (59) → 78–79/43 (52), HR 55–56 [RS11 4:38–5:04]. Healthy induction nadir 64.6–64.7 [RS11] |
| ≈ 1:39 | ≈ 6:37 | ×4 | — | MAP back to 65, 96.2–98.5 s after ephedrine [RS11 checks] |
| 2:00 | 8:00 | ×4 | end | ART 101–102/59 (72), HR 61, EtCO2 40 [RS11 8:00] |

**Say:** the premedicated patient stops breathing about 10–20 s sooner and drops lower [RS11: +36/+47 s vs +54.5/+55.9 s;
nadir 52 vs 64.6]. Do **not** call it synergy: the probe found the extra fall is about the sum of the parts, and the
interaction was shipped small for the 22nd [R24 P4: "the extra fall ≈ the sum of the parts"; R25 A2: "16 % deeper fall
(Billard 1994 reports 89 %)"]. Phenylephrine 100 µg is the faster alternative (MAP 73.4 at +60 s, HR 53) [G11 §3 S4
phenylephr.].

**Debrief objectives (what the report would judge)** [CARD]: acknowledge the RR alarm within 30 s (no rule: instructor
ticks) · intubate within 60 s of the apnoea alarm (met if pressed at the alarm; rehearsal +43 / +55 s) · vasopressor
within 60 s of MAP < 60 (rehearsal ≈ 24 s) · MAP above 65 within 120 s of it (rehearsal 96.2–98.5 s). All met on this
path; a press of the vasopressor before MAP < 60 would not count. Exact timings on this sheet's earlier intubation:
**[to be measured at the kit round]**.

### Case 2: Healthy induction, airway not secured (plain induction). Slot 4:30. DROP SECOND

Card: *Healthy induction* (Showcase). States: Awake, preoxygenating → Induced (airway not yet secured) → Airway not
secured: SpO₂ below 90 % → SpO₂ below 60 %: hypoxic bradycardia → … ; rescue buttons **Bag-mask ventilate, FiO₂ 1.0**
and **Intubate and ventilate, FiO₂ 1.0** [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **Bookmark** (preoxygenation, FiO2 1.0 held) | — |
| 0:22 | 3:00 | **×4** | **Induce now** (≥ 180 s of preoxygenation: tick objective 1) | HR 70, ART 123/80–81 (94–95), SpO2 99, EtCO2 39 [RS11 3:00/3:01] |
| 0:36 | 3:56 | ×4 | `CO2 APNEA`. Say: *"Today nobody secures the airway."* | 54.5–55.9 s after induction [RS11 checks]; ×8 gave 54.9 / 55.0 s [G10 §6b] |
| 0:45 | 4:30 | ×4 | **5 min** fast-forward | panel ≈ 10 s [G10 §5]; SpO2 still 99 at the induction rows [RS11] |
| 0:55 | 9:30 | ×4 | — | SpO2 during the gap: **[to be measured at the kit round]** |
| ≈ 1:22 | 11:18–11:20 | ×4 | state **Airway not secured: SpO₂ below 90 %** → **Bag-mask ventilate, FiO₂ 1.0** at once (the rule allows 60 s of sim = 15 s of wall) | at the state change the monitor still reads HR 85, ART 109/76, SpO2 94 (the device lags) [RS11 11:18 / 11:20] |
| ≈ 1:33 | ≈ 12:00 | ×4 | **Intubate and ventilate, FiO₂ 1.0** | EtCO2 and SpO2 after a rescue at this point: **[to be measured at the kit round]** |
| ≈ 1:40 | ≈ 12:30 | — | end | on the rehearsal's later rescue: HR 84–85, ART 104/72, SpO2 99, EtCO2 52 at 15:00 [RS11] |

**Say:** desaturation comes about 8.3 min after induction with nothing done [RS11 checks "8.3 min"]; if nothing were
done, hypoxic bradycardia follows 1.2 min later (HR 109 → 46–51 at the bag-mask, SpO2 61) and bag-mask ventilation
brings SpO2 back to 90 % in 31.5–32.1 s [RS11 rescued branch]. That later rescue is the owner's alternative: more
dramatic, measured, but it misses objective 4.

**Debrief objectives** [CARD]: ≥ 180 s preoxygenation (instructor) · intubate within 90 s of the apnoea alarm: **not met
by design of this branch** (do not open the Debrief for this case) · EtCO2 > 25 within 30 s of intubation · ventilate
within 60 s of SpO2 < 90 % (met on this sheet's path) · ventilate within 300 s of SpO2 < 60 % (not assessable: never
reached).

### Case 3: Anaphylaxis under anaesthesia. Slot 3:30, ×4

Card: *Anaphylaxis under anaesthesia* (Showcase). States: Ventilated, stable → Anaphylaxis (starts by itself after 1 min)
→ Epinephrine given [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **Bookmark** | — |
| 0:15 | 0:58–1:00 | ×4 | (the reaction starts by itself) | HR 73, ART 120/83 (96), SpO2 99, EtCO2 33 [RS11 0:58] |
| 0:37 | ≈ 2:30 | ×4 | **Give epinephrine 100 µg** at about 1 min 30 s into the reaction (NOT at 2 min: see below) | numbers at 2:30: **[to be measured at the kit round]**; at 2:57 HR 136, ART 97/71 (78), no alarm with limits off [RS11] |
| 0:40 | ≈ 2:41 | ×4 | — | systolic above 110 about 11 s after epinephrine; HR peaks ≈ 173–174 [RS11 checks 11.3 s; 3:09 rows] |
| 0:45 | ≈ 2:50 | ×4 | **Drugs & fluids** → **Crystalloid 500 mL** → **Give** (objective 3, "Give fluid") | label from showcase 1 [SC1 "Crystalloid 500 mL over 10 min → Give works too"] |
| 1:07 | ≈ 4:30 | ×4 | — | about 2 min after epinephrine: ART 122/88–89 (99), HR 112–113 [RS11 4:58 / 4:59] |
| 1:15 | 5:00 | — | end | with limits ON, an HR-high alarm is likely at the epinephrine peak (HR 173 vs the 150 limit [SC1]): **[to be measured at the kit round]** |

**Why 1:30, not 2:00:** the Debrief's rule is epinephrine within 120 s of the Anaphylaxis state; the rehearsal pressed
at 3:01 after the state at 0:58, i.e. 2 min 03 s, which the report would mark **not met** [CARD rule withinS 120;
RS11 0:58 / 3:01 rows].

**Debrief objectives** [CARD]: recognise anaphylaxis (instructor) · epinephrine within 2 min of the reaction ("draft,
owner to confirm" in the card) · give fluid (any fluid).

### Case 4: Severe bronchospasm on the ventilator (Ventilator view). Slot 4:30. DROP FIRST

Card: *Severe bronchospasm on the ventilator*, chip **Airway and breathing** (not Showcase) [G11 §5 Q2]. States: Severe
bronchospasm → Salbutamol given: ventilation recovering [CARD].

Rules: **load the case first, then open the Ventilator view** (it takes over ventilation) [RUN4 header]; the phones hold
still and say "The ventilator is on the main screen" until the next case [CR12; G12 §3b: `holding` in every phase].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×4** | **Load**, **Bookmark**, then top bar **Ventilator** | — |
| 0:21 | ≈ 1:24 | ×4 | — | before salbutamol: VTE 311–312 ml [F11B, H5 post-merge row]; Ppeak 35 at the limit, banner "⚠ High pressure (Pmax)" [RUN4, pre-H5 build: confirm]; monitor SpO2 97 [RUN4] |
| ≈ 0:30 | ≈ 2:00 | ×4 | **Instructor** → **Give salbutamol 250 µg** → back to **Ventilator** | — |
| 0:40 | 4:00 | — | **2 min** fast-forward (the cockpit keeps ventilating through it) | a cockpit frame on every tick through the span: 5 998 / 5 999 [G10 §6b] |
| 0:48 | 5:00 | **×8** | 1 min at ×8 | ≈ 3 min after salbutamol: VTE 498 ml; monitor EtCO2 32 [F11B H5 row] |
| 1:05 | 8:00 | ×8 | **2 min** fast-forward + 1 min ×8 | ≈ 6 min after: VTE 501 ml; monitor EtCO2 33 [F11B H5 row] |
| 1:30 | — | — | end; **reload the page (Cmd-R)** before the next case | (see below) |

**Say:** narrate the delivered tidal volume and minute volume recovering; peak pressure stays at the limit [RUN4 case 3
story]. ×8 with the cockpit runs at ×8.00–8.01 [G10 §5].

**Reload before haemorrhage.** A Ventilator view opened earlier in the page kept ventilating a later haemorrhage patient,
which then did not arrest by 15 min [R00 2026-10-04 "CRITICAL DEMO RULE"; SC1 rule 5]. FU-11 H6 now unloads the cockpit
on a new patient [F11B H6], but the reload is the measured-safe path. After the reload: **Sound on** again, **All alarms
on** again (§1), and the phones find the page again by themselves [CR12 "If something goes wrong": "the phones find it
again"].

**Debrief objectives** [CARD]: recognise bronchospasm (instructor) · treat with a bronchodilator (met by the button) ·
watch VTE and minute volume recover (instructor).

### Case 5: Class IV haemorrhage, PEA and resuscitation (+ the Explore moment). Slot 7:30

Card: *Class IV haemorrhage, PEA and resuscitation* (Showcase). States: Bleeding 2.5 L over 10 min → CPR, 2 L warmed
fluid, epinephrine 1 mg → Return of circulation [CARD]. Start on a freshly reloaded page (Case 4).

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **Bookmark** | bleeding 250 mL a minute (card: 2.5 L over 10 min) [CARD] |
| 0:08 | 1:00 | **Pause** | **Explore physiology** → **Set the baseline now** → back → **Resume** | label [`apps/demo/src/app/views/explore.ts` on main] |
| 0:15 | 2:00 | ×8 | — | HR 81, ART 114/83 (93), EtCO2 34 [RS11 2:01] |
| 0:30 | 4:00 | **Pause** | point, **Resume** | HR 96, ART 107/82 (90), EtCO2 33 [RS11 4:00] |
| 0:45 | 6:00 | ×8 | — | HR 120, ART 99/81 (86), EtCO2 30 [RS11 6:00] |
| 1:00 | 8:00 | **Pause** | **Explore physiology** → **Changed only**: what the monitor hides. Back, **Resume** at **×4** | ART 75/62 (66), HR 140, EtCO2 25 [RS11 8:00]; the Explore rows on this build: **[to be measured at the kit round]** |
| 1:04 | 8:17 | ×4 | — | `SPO2 LOW PERFUSION`, the first alarm [RS11 alarms 8:17] |
| 1:30 | 10:00 | **×1** | — | — |
| 1:31 | 10:01 | ×1 | — | `IBP1 STATIC PRESSURE`: the arterial number becomes mean only (≈ 13): the pulse loss on the arterial line [RS11 10:01; G11 §4 finding 2] |
| 2:06 | 10:36 | ×1 | `SPO2 NO PULSE` → **Start CPR, 2 L and epinephrine** now (not before the alarm; not later than ≈ 10:55) | alarm 10:36 [RS11]; engine pulse loss 10:29 [G11 §3 S5 pulseLossS 629]; rehearsal pressed 10:51 [RS11] |
| 2:15 | ≈ 10:45 | — | **2 min** fast-forward (CPR running) | panel ≈ 10 s [G10 §6b] |
| 2:25 | ≈ 12:45 | **×4** | watch the arterial trace and the capnogram | — |
| ≈ 2:40 | CPR + 176–177 s | ×4 | systolic above 90 → **Pulse back: stop CPR** | 176–177 s into CPR (13:47–13:48 after the rehearsal's 10:51 press); ART 121–129/60–61 [RS11 13:47 / 13:48]. A transient overshoot follows the press: 159/85 (C), 183/82 (W) [G11 §4 finding 3] |
| 2:56 | ≈ 14:50 | ×4 | end | 1 min after: ART 135/90 (105), HR 75–76, EtCO2 34 [RS11 14:49 / 14:50] |

**Say:** the pressure holds and only the heart rate tells you; then the pulse pressure narrows [SC1 haemorrhage "Say"].
ATLS classes are a teaching construct and the model's heart rates fit registry data better than the ATLS table [SYN (a)
item 1: "All five measured values fit the evidence"]. Known miss to say out loud: in this model systemic resistance falls
instead of rising as the patient bleeds, and decompensation reflexes are not modelled [R00 2026-10-06: "Not fixed before
the 22nd (state out loud…)"; RM v1.0-remaining "Not in v1.0"].

**Early-CPR caution:** on the showcase-1 build, CPR pressed before `SPO2 NO PULSE` (≤ 10:33) led to VF and no return of
circulation in 8 min [RUN4 case 5, 9 runs]; on the current physiology this has not been re-measured
**[to be measured at the kit round]**. Press at the alarm.

**Debrief objectives** [CARD]: recognise PEA from hypovolaemia (instructor) · CPR within 30 s of the pulse loss (draft,
owner to confirm): pressing at 10:36–10:55 against the engine's 10:29 meets it [G11 S5 629 s; arithmetic], the
Debrief's own pulse-loss time for this card **[to be measured at the kit round]** · the pulse back within 6 min of its
loss (draft): 10:29 → 13:47 is 3 min 18 s [arithmetic from G11 S5 and RS11]. A fast-forward during CPR in this card:
the time of the return of circulation after it **[to be measured at the kit round]** (the span is exact: 120.000 s of
sim [G10 §6b]).

### Case 6: Stab wound: tamponade, PEA and pericardiocentesis. Slot 6:00

Card: *Stab wound: tamponade, PEA and pericardiocentesis* (Showcase). States: Arrival → Deteriorating: systolic below
80 → PEA → CPR, ventilated with FiO₂ 1.0 → CPR: pericardium drained, catheter left in → Return of circulation →
Post-ROSC: 500 mL crystalloid running [CARD].

| W | Sim | Speed | Press / do | Point at (measured) |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **Bookmark** | — |
| 0:08 | 1:00 | ×8 | Name it aloud: tachycardia, narrow pulse pressure, raised CVP. Tick objective 1 on the Scenario tab (before 3:00) | HR 97, ART 105/85 (91), SpO2 98, EtCO2 32 [RS11 1:00]; CVP 17.15 at 60 s in the engine run [G11 §3 S2 happy] (on which lane/tile the CVP shows on the default monitor: **[to be measured at the kit round]**) |
| 0:22 | 3:00 | ×8 | — | HR 111, ART 98/83 (88), EtCO2 29 [RS11 3:01] |
| 0:44 | 5:55 | ×8 | — | `SPO2 LOW PERFUSION` [RS11] |
| 0:45 | 6:00 | ×8 | — | HR 134, ART 79–80/68–69 (72), EtCO2 24 [RS11 6:01] |
| 0:52 | 7:00 | **×1** | slow down for the arrest | — |
| 1:19 | 7:27 | ×1 | — | `IBP1 STATIC PRESSURE` [RS11] |
| 1:38–1:43 | 7:46–7:51 | ×1 | state **PEA** (sinus on the ECG, no pulse) | HR 44–45, arterial mean ≈ 20 [RS11 / RS13 7:46–7:48]; the Debrief's pulse loss is 07:48 [DB-T facts] |
| 1:46 | 7:54 | ×1 | `SPO2 NO PULSE` → **Start CPR, intubate, FiO₂ 1.0** at once (by 7:58: the rule is 10 s) | alarm 7:54 [RS11]; pulse loss 07:48 [DB-T] |
| 1:48 | ≈ 7:56 | — | **2 min** fast-forward, at once (**the deliberate miss, §4**) | panel 10.1–10.5 s [G10 §6b] |
| 2:00 | ≈ 9:56 | — | when the panel clears: **Pericardiocentesis during CPR** (if "Not available now", press again) | the Debrief will say "2 min 0x s after CPR; within 2 min 00 s asked" [DB-T: 2 min 00 s / 2 min 01 s → not met] |
| 2:01 | ≈ 9:57 | **×4** | watch the arterial trace and capnogram | — |
| 2:20 | ≈ 11:12 | **×1** | — | — |
| 2:42 | ≈ 11:34 | ×1 | pulse back on the arterial line and the capnogram → **Pulse back: stop CPR** within 30 s | return ≈ 96–97 s after drainage [G11 §3 S2 roscAfterDrainS 95.9; DB-T return 11:37 after drainage 10:00]; rehearsal stopped 24–25 s after it: met [DB-T] |
| 3:12 | ≈ 12:04 | ×1 | **Crystalloid 500 mL** | 30 s after stopping CPR: ART 118–119/78–79, HR 63–64, EtCO2 33–34 [RS13 12:29; RS11 12:29 / 12:31]; at ×8 the systolic 10–30 s after stopping CPR was 112.6 / 114.9 [G10 §6b] |
| ≈ 3:30 | → 15:00 | **×8** | run to the end, then go to §4 | 15:00 ART 119/76, HR 61–62, EtCO2 39 [RS11 15:00] |

**Say:** PEA about 8 minutes after arrival without drainage [CARD story; RS11 7:46–7:48]; CPR alone cannot bring him
back; drainage during good CPR brings the pulse back about a minute and a half later [CARD story; G11 S2 95.9 s].
Known miss: no pulsus paradoxus in this model [SYN (b) real misses: "Pulsus in tamponade (40)"; R24 P3: SBP swing
3.4 mmHg vs > 10 expected]. The owner's B4 question (does drainage alone with good CPR give ROSC) is still open
[R25 B4].

**Option (owner):** Stage 10's card ran a SECOND 2-minute fast-forward right after the drainage, with the pulse returning
inside it [G10 §6b]. The return comes ≈ 97 s into that span, so ≈ 23 s of the 30-s "stop CPR" window are already gone
when it ends [arithmetic from G11 S2 95.9 s]: it risks a second miss. This sheet uses ×4 then ×1 instead.

**Debrief objectives** [CARD; DB-T on the rehearsal path]: name the tamponade within 180 s (instructor; shows "The
instructor ticked it at mm:ss") · CPR within 10 s of the pulse loss (rehearsal 12 s: not met; this sheet's press at
`SPO2 NO PULSE` is 6 s after the 07:48 pulse loss plus your reaction: **[to be measured at the kit round]**) ·
pericardiocentesis within 120 s of CPR: **NOT MET, deliberately** · stop CPR within 30 s of the pulse returning (met at
24–25 s) · "Better: pericardiocentesis before the pulse loss": **not met on any CPR path** (it is the alternative course,
not a timing; say so).

### Case 7: Malignant hyperthermia. Slot 7:00 (×8 and three 5-minute fast-forwards)

Card: *Malignant hyperthermia* (Showcase). States: Induced (succinylcholine, sevoflurane 2 %) → Surgery under way →
Early signs: EtCO₂ rising at the same ventilation, tachycardia → (Established MH) → Trigger off: sevoflurane stopped,
O₂ 100 % at 10 L/min, ventilation 20 × 600 → MH treatment under way → Recovering: EtCO₂ below 45 → Ventilation back to
12 × 500, O₂ 100 % [CARD]. The **MH crisis** button is offered in Surgery, Early signs and Established [CARD].

**E17 consequence:** to meet "call the crisis within 120 s of the early signs", this sheet calls the crisis at the
**Early signs**, not at the established crisis as Stages 10, 11 and 13 rehearsed. Those rehearsals called at 19:47–19:48
and the Debrief marked the call **not met** [DB-MH; G13 §6]. The early path's browser numbers were never rehearsed; the
engine-level run is G11 S1 "early" (call at 8.85 min). Rehearse this path at the kit round.

| W | Sim | Speed | Press / do | Point at |
|---|---|---|---|---|
| 0:00 | 0:00 | **×8** | **Load**, **Bookmark** | — |
| 0:30 | 4:00 | ×8 | **Start surgery: rocuronium 0.6 mg/kg** | HR 78, ART 98/65 (74), EtCO2 40 [RS11 4:03] |
| 0:49 | 6:30 | **×4** | watch the CO2 tile climb at the same ventilation | — |
| 0:54 | 6:49 | ×4 | state **Early signs** | EtCO2 46, HR 85–86, ART 105/70 (80) [RS11 6:49]; early signs 6.8 / 6.9 min at ×8 [G10 §6b] |
| ≤ 1:09 | ≤ 7:49 | ×4 | **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** within 60 s of the state (the rule allows 120 s) | if "Not available now": press again [G10 §8 item 1: stale presses at a state change] |
| ≈ 1:15 | ≈ 8:15 | ×4 | **Dantrolene 2.5 mg/kg**, then **Cool: 2 L saline at room temperature** | rehearsal: dantrolene 1 min 01–02 s after the call, met [DB-MH] |
| ≈ 1:25 | → ≈ 13:30 | — | **5 min** fast-forward (1 of 3) | panel 10.3–10.7 s [G10 §6b] |
| ≈ 1:40 | ≈ 13:30 | Pause | point; if the CO2 tile is above 45: **Dantrolene 2.5 mg/kg** again (tick objective 3) | engine early path: EtCO2 47 five minutes after the call [G11 §3 S1 early etco2Plus5 47]; browser value **[to be measured at the kit round]** |
| ≈ 1:50 | → ≈ 18:30 | — | **5 min** fast-forward (2 of 3) | — |
| ≈ 2:05 | ≈ 18:30 | Pause | if **Recovering: EtCO₂ below 45** shows and the CO2 tile reads below 40: **EtCO₂ normal: ventilation back to 12 × 500** now. If the tile reads 40–44, use a **2 min** span next instead of 5 | engine: recovering 8.1 min after the call (8.85 → 16.97 min), never established, Tcore max 38.01 °C, HR max 93, K max 4.8 [G11 §3 S1 early]; when EtCO2 falls below 40 on this path: **[to be measured at the kit round]** |
| ≈ 2:15 | → ≈ 23:30 | — | **5 min** fast-forward (3 of 3) | engine: HR 85 fifteen minutes after the call [G11 S1 early hrPlus15 85] |
| ≈ 2:30 | — | — | end (optional: **Debrief** to show a clean report) | — |

**Why the 40-mmHg check before spans 2 and 3:** the ventilation objective allows 300 s from EtCO2 < 40, and a 5-minute
span is exactly 300 s; if EtCO2 crosses 40 early in a span the window can close inside it [CARD rule withinS 300; G10
§6b: spans are exactly 300.000 s].

**Say (the contrast, measured):** had we waited, the crisis establishes at 18:42–18:43 with EtCO2 81 and HR 142 [RS11];
untreated, K 6.4 and VF with core temperature 42.3 °C at 44.7 min [G11 §3 S1 untreated]. Honesty: the literature review
found 44 min to death too fast for a volatile trigger and no human EtCO2 time course behind the "40 → 60 by 10 min" band
[R00 2026-10-11 "LITERATURE 29"; SYN (a) item 11]; after the treated crisis the model stays hypertensive (MAP 112–120 for
> 30 min, known miss C-1) [G11 §5 Q8]. Do not give the potassium treatment on this path: potassium stays normal [G11 S1
early kMax 4.8].

**Debrief objectives** [CARD]: call within 120 s of early signs (met on this path) · dantrolene within 300 s of the call
(met) · repeat dantrolene within 600 s while EtCO2 > 45 (no rule: instructor ticks) · potassium within 300 s of K > 5.5
(not assessable: K never exceeds 5.5 on the early path) · ventilation back within 300 s of EtCO2 < 40 (met if the
40-mmHg check is followed).

**Owner's alternative:** the measured late path of Stage 10 (two 5-min spans before the crisis, call at the established
crisis, one span after): established 18.8 min, recovering 9.2–9.3 min after dantrolene, lowest systolic after the call
114, spans 10.3–10.7 s [G10 §6b]. The Debrief then marks "call within 120 s" not met: a second miss in the day.

---

## 4. The Debrief moment (after the tamponade, before MH). Slot 4:00

**E17 default — owner may change.** The sheet meets every timed objective except ONE, missed on purpose: the tamponade's
**pericardiocentesis within 120 s of starting CPR**. Reason (orchestrator's, not a literature figure): it is the one a
real team most often misses, the room sees the report catch it, and the miss is by seconds, so it reads as a real-world
slip rather than a staged failure [R00 2026-10-11 rulings item (3) and "Filler jobs" line; DB-T: 2 min 00 s / 2 min 01 s].
No source on how often real teams miss it was found (see "Facts I could not find").

| T+ (within the slot) | Do | The audience sees |
|---|---|---|
| 0:00 | Session bar → **Debrief** | the report of the run just finished: header, objectives, measured facts [G13 §5] |
| 0:20 | **Run by**: "Showcase 2, 22 October"; one line in **Notes** | — |
| 0:40 | Read the objectives aloud | expected: ✓ CPR within 10 s (**[to be measured at the kit round]**) · ✗ **Pericardiocentesis within 120 s of starting CPR** ("2 min 0x s after CPR; within 2 min 00 s asked") · ✓ Stop CPR within 30 s · – Name the tamponade (not assessable; "The instructor ticked it at mm:ss") · ✗ "Better: pericardiocentesis before the pulse loss" (the alternative course, not a timing) [CARD; DB-T; `debrief.ts` on stage-13] |
| 1:30 | Point at **Measured facts** | e.g. lowest ART M 19 mmHg at 07:58, pulseless 3 min 49 s, highest EtCO2 39 mmHg on the rehearsal path [DB-T facts]; this path's values: **[to be measured at the kit round]** |
| 2:00 | Scroll to **Timeline** | 25 rows on the rehearsal path (undone rows struck through); the fast-forward appears as a row [DB-T timelineRows 25; G13 §5]; this path's count **[to be measured at the kit round]** |
| 2:30 | **Print or save as PDF** → save | 5 A4 pages for tamponade, footer and build on every page in Chrome [G13 §6, §9: tamponade PDF 5 A4 pages]; in Safari the footer only ends each section [PRINT] |
| 3:00 | *"The report is a debrief aid: it reads the run, it does not grade the person."* | — |

Debrief after MH instead (owner's option): MH's report is 7 A4 pages and 36 timeline rows on the rehearsal path [G13 §9;
DB-MH]. Do the Debrief BEFORE loading the next case: it reports the current run.

---

## 5. Close (T+46:00 → 49:00) and questions

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

**Questions** (T+49:00 → 59:00): see the presenter guide for the validation answer.

---

## 6. Fallbacks

| What happens | What to do | Source |
|---|---|---|
| The QR relay fails, "Start Classroom" needs Node, or phones say "cannot reach the instructor's laptop" | Carry on with **Start Simulator** and **Open on a second screen** (the same browser) for the projector; phones are not needed for any case | [CR12 "(c)" and "If something goes wrong"] |
| The sheet says "The relay does not answer" | Close the Classroom window, double-click **Start Classroom** again, reload the page | [CR12] |
| Sound fails | Say so (*"the sound has failed; the alarms still show on screen"*) and continue; alarms stay visual | [brief; Stage 10 ruling 3, G10 §7] |
| A card press shows **"Not available now: the case has moved to …"** | Press again: the button now belongs to the current state. In builds without that toast, a press at a state change can be ignored silently: watch the state strip and press again | [G10 §8 item 1: 3 lost presses in 4 WebKit MH runs, the second press always took; PR #51 `fix-stale-card-button`, open] |
| A scenario goes wrong (wrong press, missed window) | Session bar **Bookmark** list → **Return here** on the bookmark taken at Load; the patient and the screen are restored together | [FU-11 E4, commit dfb1f3d1 on main] |
| The page froze or a Ventilator view is still driving | Reload (Cmd-R), **All alarms on**, **Sound on**, reload the card; phones find the page again | [CR12; R00 2026-10-04] |
| A phone says "This session is full" | 60 phones are following: ask a neighbour to share | [CR12] |
| A phone says "The ventilator is on the main screen" | Expected during case 4 | [CR12] |
| "The monitor stopped" toast (hidden-tab watchdog) | Reload the page and re-load the card; if this showed in H19, do not switch tabs during the talk | [ADD2 H19; F11A §5] |

---

## Facts I could not find

1. **The slot length** and running order of the day (time, room, projector, who else presents). The budget above is
   59 min including 10 min of questions; it may need the drops.
2. **E13 / E14**: which Mac presents, its Node.js version, and the network on the day [ADD2; G12 §6 Q5].
3. **H17** own-phone result (`OWN-PHONE-TEST.md` is empty) and the hotspot's real capacity [OPT; CR12 "(b)" 2].
4. **Limit alarms ON**: which limit alarms sound in each case, their texts and times, in the browser. Every browser
   rehearsal ran with limit alarms off [RS11 "Alarm words"]. Includes the premed RR alarm and an HR-high alarm in
   anaphylaxis.
5. Whether **All alarms on**, **Sound on** and the session code survive a page reload.
6. **The MH early path in the browser**: every monitor number after the call, when EtCO2 falls below 40, when
   "Recovering" appears, and whether three 5-min spans then show the recovery well. Only engine-level numbers exist
   [G11 §3 S1 early].
7. **Plain induction rescued at "SpO₂ below 90 %"**: SpO2 recovery time and EtCO2 after the tube (the rehearsal rescued
   at bradycardia instead) [RS11].
8. **Anaphylaxis with epinephrine at 1 min 30 s into the reaction**: the monitor numbers at the press and after.
9. **Haemorrhage**: the Debrief's own pulse-loss time for this card, the return of circulation after a 2-min span during
   CPR, whether early CPR (before `SPO2 NO PULSE`) still causes VF on the current physiology, the Explore rows at 8:00,
   and the ATLS class transition times as such (no gate measured class boundaries; the 2/4/6/8-min rows are what exist).
10. **Tamponade**: whether pressing **Start CPR** at `SPO2 NO PULSE` (7:54) meets "within 10 s of the pulse loss
    (07:48)" with a human's reaction at ×1; on which lane or tile the CVP shows; the Debrief's facts and row count on
    this sheet's path.
11. **The speed after a fast-forward ends** (the plan does not change the speed; not observed in a gate).
12. **The on-screen version label** "v1.0.0-rc.1": the app's package version on main is still 0.0.0; the rc is cut by
    Stage 8b after the freeze.
13. **A source for "drainage within 120 s is the one a real team most often misses"**: none found in the files read; it
    is the orchestrator's rationale.
14. **The figures for the ask** (funding amount, research line, adoption terms).
15. **The ID H20**: the rulings log defines H20 as the second-screen follower in real Safari (2026-10-11 ~21:00); the
    review pack (addendum 2) uses H20 for "verify the figures behind the thermal, endocrine and stimulus bands". The
    checklist above uses the rulings' meaning. The same collision exists for **E17** (rulings: this run-sheet question;
    addendum 2: "features not in version 1.0").
