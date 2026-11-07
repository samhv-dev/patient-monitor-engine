# The rc.4 kit's lines in the talk papers, as run (29 October 2026)

A record, not a live document. Kit round Q2 ran the MH-only talk on the rc.4 kit (`0c4b396f`, pre-release
`v1.0.0-rc.4`) on 29 October, on both engines (`kit-round-a/q2-rc4/`). The rc.4 docs PR (#225) then wrote what it
measured into the run sheet, the cue cards and the presenter guide. Main has rewritten those three papers since (the
1 November build), and the live copies are main's. This file keeps every line #225 added to them, verbatim, under
the section it sat in. Their whole text as run is `git show 6abb543d:docs/showcase/SHOWCASE-2-RUN-SHEET.md`
(likewise `-CUE-CARDS.md` and `-PRESENTER-GUIDE.md`).

Inside the quoted lines, "run sheet §3, 'On the rc.4 kit'", "run sheet §6" and "stop 1" mean the run sheet as run
(6abb543d). Its rc.4-kit lines are the run sheet's part of this file.

## Run sheet (`SHOWCASE-2-RUN-SHEET.md`)

In `# Showcase 2: run sheet (30 minutes, the owner's slot)`:

```markdown
other reserve cases are kept, unchanged, in the appendices. Frozen and tagged early by the owner's ruling of
29 October: **v1.0.0-rc.4 (pre-release) was tagged on 29 October** (0c4b396f); **its kit is
`_sandbox/pme-kit-release-0c4b396f/`**, rehearsed on both engines that day [Q2-rc4], and the **rc.3 kit
`_sandbox/pme-kit-release-fcf99b70/` is its fallback**. An rc.5 candidate from main is rehearsed separately; which kit
is in the room is decided at the room dry run [R00 2026-10-29]. The owner's smoke and live rehearsal Sunday evening;
the room dry run Monday 2 November [RC4]. Every stop says only what the speaker's reference [SPK] says the build
computes.*
```

In `## How to read this sheet`:

```markdown
- **On the rc.4 kit** the same talk ran on both engines [Q2-rc4]. The rows that moved more than 2 s (the early signs on
  Chromium, Recovering on WebKit, the first `RR TOO LOW`, the E22 window on Chromium, the Debrief's highest EtCO₂) and
  the measured values beside them are in §3 "On the rc.4 kit".
- A 5-min fast-forward takes **10.1–10.6 s** of wall and **leaves the speed as it was** [Q1-MH; Q1-2D; UIR: 10.5–10.9 s; Q2-rc4: 10.4–10.5 s].
```

```markdown
| Q2-rc4 | `docs/showcase/kit-round-a/q2-rc4/q1-{0,1}-*-{chromium,webkit}.{json,md}`, `q1-talk-{chromium,webkit}.json` and `debrief-q1-1-*.json`: the same talk test on the **rc.4 kit** `pme-showcase-kit-0c4b396f` (tag `v1.0.0-rc.4`, pre-release), 2026-10-29, **both engines**, 3 phones, reaction 2 s, 3 s per Explore screen; the stop screenshots in `q2-rc4/shots/stop{1,2,3}-*-{chromium,webkit}.png` (Explore sections and the model pages), `debrief-mh-on-screen-*.png`, `end-instructor-*.png`, the monitor at the early signs `q2-rc4/q2-mh-monitor-early-signs-{chromium,webkit}.png`; kit round A4 on the same kit in `q2-rc4-a4/`. Write-up: MEASUREMENTS §"Q2 on rc.4"; gate note `docs/gates/rc4-release.md` |
```

```markdown
| KIT | `_sandbox/pme-kit-release-0c4b396f/README.txt` (the rc.4 release kit, with its Windows zip; the same kit in `_sandbox/pme-classroom-dryrun/kit/` and `_sandbox/pme-debrief-dryrun/`); the fallback `_sandbox/pme-kit-release-fcf99b70/README.txt` (the rc.3 kit). Before rc.3: `pme-kit-release-3db25a3b` (rc.1, retired) |
```

In `## 1. Pre-flight (the morning; the network and phone lines also the day before, at the venue if possible)`:

```markdown
- [ ] **For 3 November: the rc.4 kit** `_sandbox/pme-kit-release-0c4b396f/pme-showcase-kit-0c4b396f` (pre-release
      1.0.0-rc.4, tagged 29 October; Home reads "Version 1.0.0-rc.4 · pre-release · build 0c4b396f"; relay 4 of 4 on
      29 October) [KIT; Q2-rc4]. **The fallback is the rc.3 kit** `_sandbox/pme-kit-release-fcf99b70/` (older MH and
      haemorrhage cards, no Home: see "On a kit without Home", §2) [RC4 Task 8]. Both kits and both Windows zips on the
      stick. The lines below are the floor any kit must pass.
```

```markdown
      Screenshots of the three as they render: `scratch/owner-review/mh-only-programme/stop{1,2,3}-model-*.png`; on the
      rc.4 kit, both engines: `docs/showcase/kit-round-a/q2-rc4/shots/stop{1,2,3}-model-*-{chromium,webkit}.png`
      [Q2-rc4: each page answered 200].
```

```markdown
- [ ] **Only the MH Persian handout is printed for the day**: `_sandbox/pme-debrief-fa/debrief-fa-malignant-hyperthermia-2026-10-29.pdf`,
      rendered on 29 October from kit round A4's MH Debrief on the rc.4 kit (8 A4 pages, 0 strings left in English,
      with PR #161's Persian drafts, which the owner has still to read) [Q2-rc4]. A re-render (after his read of #161,
      or from the MH Debrief JSON of his Sunday rehearsal) is
      `node scripts/showcase/debrief-fa.mjs <debrief-….json> --fonts <Vazirmatn folder>`
      (`docs/showcase/i18n/README.md`). The haemorrhage handout (`debrief-fa-haemorrhage-2026-10-29.pdf`) stays in the
      kit (Reserve R5), not printed. The English report is not printed on the day either (the Debrief is read on screen,
      §4). **The handout's footer does not word the disclaimer as the screen does**: §2, "Two disclaimer wordings".
```

```markdown
- **The MH report prints 8 A4 pages**, not 7 [UIR #31; Q2-rc4: 8 on the rc.4 kit], if it is ever printed: on the day it
  is read on screen (§4).
```

In `## 2. Opening on Home and the Room (T+0:00 → 3:00)`:

```markdown
> **Two disclaimer wordings (read before the talk).** The screen, on the rc.4 kit, says E125's line: "For educational
> use only; Not to be used in patient care." (Home's foot, every page but the monitor screens, the Debrief's footer)
> [Q2-rc4 `q1-0`].
> The printed Persian MH handout of 29 October carries the older sentence in Persian at its foot (for education only;
> not a medical device; not clinically validated; never for patient care) [Q2-rc4 `.fa.txt`]. PR #161 drafts the E125
> wording in Persian for the handout's footer; it reaches the print only when the owner has read #161 and the
> handouts are rendered again, and the Persian words will still not be the screen's English ones. Both say the same
> thing: if a dean reads the screen and the handout side by side, that is why they differ. Your opening line (above)
> says it in your own words.

```

In `### On the rc.4 kit: rows that moved more than 2 s [Q2-rc4]`:

```markdown
### On the rc.4 kit: rows that moved more than 2 s [Q2-rc4]

The tables of §3 and §4 are from the talk run on kit a88f95a7 [Q1-MH]. The same test on the **rc.4 kit** (29 October,
both engines) moved the rows below by more than 2 s. Each table keeps one clock: the run's record (its measures and
state list, floored to the second; the Q1-MH column from the same kind of record), or the Debrief's own clock (its key
times, objectives and facts). Bold: more than 2 s from Q1-MH on the same clock.

**On the record's clock**

| Row | Q1-MH (a88f95a7, C) | rc.4 Chromium | rc.4 WebKit |
|---|---|---|---|
| Early signs (segment 1's last row; Pause at once) | 8:09 (Pause 8:10) | **8:12** (Pause 8:12) | 8:11, 2 s (Pause 8:11) |
| Recovering (inside fast-forward 1) | 9:35 | 9:37 | **9:38** |
| The first `RR TOO LOW` (segment 1, after Preoxygenate) | 3:09 | **2:40** | **2:40** |

**On the Debrief's clock** (what §4 reads aloud)

| Row | Q1-MH (a88f95a7, C) | rc.4 Chromium | rc.4 WebKit |
|---|---|---|---|
| Ventilation back is "met" from (E22: below 40 for 2 min) | 10:34 (08:34 → 10:34) | **10:37** (08:37 → 10:37) | 10:36, 2 s (08:36 → 10:36) |
| Highest EtCO₂ (the facts) | 64 at 18:46 | **65 at 19:07** | **65 at 19:11** |

**Measured beside them** [Q2-rc4]. The Key times tiles: Recognition **0 s** on Chromium (08:12 early signs → 08:12
ticked; 1 s on WebKit, 08:10 → 08:11; 1 s on Q1-MH), the call 2 s / 3 s, dantrolene 21 s on both. On the record's
clock: the call 8:14 / 8:13, dantrolene 8:34 / 8:33, EtCO₂ below 40 from 8:38 / 8:37 (Q1-MH 8:36), the stops held at
**8:12 / 8:11, 13:52 / 13:51, 19:12 / 19:11**, ventilation back 13:53, EtCO₂ past 45 at 14:07 / 14:06, the second dose
19:13, Recovering again 23:39 / 23:37 (Q1-MH 23:37), the end 24:31 / 24:30 (EtCO₂ 41). EtCO₂ at stop 3 reads **65**
(64 on Q1-MH). Explore at the stops: MH activity **0.280** / 0.510–0.520 / 0.550, VO₂ (Blood) 333 at stop 1, PaCO₂
44.3 and 70.2. The machine wall: 5:03 (Chromium), 4:57 (WebKit). The Debrief: ✓ ✓ ✓ ✓ – ✓, 63 / 60 timeline rows.
The tightest window is unchanged in practice: ventilation back is pressed after stop 2 (13:53), long after 10:37.

```

In `### The stop method (every stop, the same five moves)`:

```markdown
- Under **Endocrine** (the first screen of stop 1), **Glucose reads "102 mmol/L"** (it is mg/dL; the Debrief's facts
  give 6.6 mmol/L) and **Stress response reads 88.0** on a "0–1" scale (it is 0–100). Do not point at either
  [Q2-rc4 `shots/stop1-endocrine-*.png`; fixed on main after the tag, #178].
```

In `### Stop 1: why the EtCO₂ rises when it should fall. Slot 3:00 (T+5:00 → 8:00); clock held at 8:10`:

```markdown
> **The NIBP alarm at this pause: point at the arterial line.** At the early signs the alarm bar can show a red
> **NIBP SYS TOO LOW**, and the alarm button can read that alarm rather than **No alarms**. The reading is stale, not
> spurious: the alarm was raised during the dip after induction (05:34 on Chromium, 05:36 on WebKit; the lowest mean,
> 62 mmHg, at 05:24–05:25), and at the pause the NIBP tile still shows that last cuff reading (87/48 (63) on one rc.4
> run, 85/60 (63) on the other, AUTO 5 min) while the arterial line reads **107/67 (77)** [Q2-rc4
> `q2-mh-monitor-early-signs-*.png`; the records' alarm lists]. It is the cuff's old number, not the patient now; the
> next cuff cycle replaces it. Whether it still shows at the pause depends on when the cycle fell in that run (Q1-MH
> raised no NIBP alarm). Do not acknowledge it on stage; point at the arterial line.

```

In `### Segment 4: the end of the case and the MH Debrief. Slot 4:00 (T+18:00 → 22:00)`:

```markdown
hold the clock, so the course in sim time is A4's within 5 s. **On the rc.4 kit** (A4, 29 October, C / W) [Q2-rc4]:
early signs 8:13 / 8:12, call 8:14 / 8:13, below 40 from 8:38 / 8:37, ventilation back 13:52 / 13:50, EtCO₂ past 45
at 14:06 / 14:04, the second dose 19:08 / 19:07 (EtCO₂ 65); marks ✓ ✓ ✓ ✓ – ✓; the report 8 A4 pages, the handout 1.
```

In `## 6. Fallbacks`:

```markdown
| The laptop's presses are refused while the case keeps running (a card button, Pause or a speed gets no answer, or is refused as "a viewer cannot command") | **Reload the instructor page** (Cmd-R): the case comes back ("Restored after reload: ‹title›, mm:ss"); then **Sound on** and **All alarms on**, as in the reload row below. **The phones reconnect on their own** (the session code is kept and the phones follow the reloaded page): do not ask the room to scan again. After the reload the phones' status pills can lag the real state by up to half a second (the pill is redrawn on a 500 ms poll), and with the cuff on they can read "The ventilator is on the main screen" for 2–3 s before "Following": cosmetic, the phones are following throughout (measured on the rc.5 candidate kit C, 30 October; both causes found the same night: a display poll on the phone and the cuff start announcing the ventilator to the phones; fixes drafted post-demo, #191 and a follow-up). Main has the relay fix (#183: a second socket can no longer take the laptop's place); the rc.4 kit does not. The defect was verified on main 5808d0b6, whose relay and host files are the tag's; it needs a hand-written frame, so it is not reachable by accident | [MEAS §7; UIR #1; R00 2026-10-29 and 2026-10-30; #183; `scratch/reviews/verify-relay-peer-identity.md`; `scratch/rc5-candidate-2/browser-reconnect-*.log`] |
```

In `## Still not measured (on the 3 November path)`:

```markdown
2. **WebKit (Safari) on the new programme.** Run on the rc.4 kit, 29 October [Q2-rc4]: the same stops, marks and
   Explore numbers within 0.01; every state and press time within 2 s of Chromium on the record's clock (the Debrief's
   highest EtCO₂ at 19:11 against 19:07). Headless WebKit, not the owner's Safari.
```

```markdown
5. **The rc.4 kit.** Rehearsed on 29 October on both engines [Q2-rc4]: the rows that moved are in §3 "On the rc.4
   kit". The owner's smoke and live rehearsal on it follow (Sunday evening or Monday morning) [RC4].
```

In `### Reserve R5: Class IV haemorrhage, PEA, asystole, VF, two shocks and ROSC (the E120 card after the clinical review, E132). In the build; out of the 3 November programme (owner, 29 October)`:

```markdown
**On the rc.4 kit** (kit round A4, 29 October, C / W) [Q2-rc4], the rows that moved more than 2 s from the E132 column:
**PEA 10:26 / 10:28** (10:24), with ART 19/12 (14) at the PEA state (the objective says "about 20/14"). Within 2 s:
junctional 9:15 / 9:17, pulse loss 10:59 / 11:00, the second epinephrine 18:56 / 18:57, idioventricular 12:55 / 12:56,
asystole 15:35, CPR 15:38, rhythm checks 17:37 / 17:38 and 19:44 / 19:45, shocks 17:45 / 17:46 (→ asystole) and 19:52 /
19:54 (→ organised, no pulse), the return of circulation **20:56 / 20:57**, CPR stopped 57 s / 58 s after it. Marks – ✗
✓. **The report prints 8 A4 pages on the rc.4 kit** (9 on kit 503caeab), 95 / 101 timeline rows, 21 key moments; the
handout 1 page with the three take-home lines.

```

## Cue cards (`SHOWCASE-2-CUE-CARDS.md`)

In `# Showcase 2: cue cards (Tuesday 3 November 2026, 12 Aban 1405, the 30-minute slot)`:

```markdown
build: their cards are under "Reserve" at the end, with the cards not in the programme. **The kit: rc.4 (pre-release),
tagged 29 October, `_sandbox/pme-kit-release-0c4b396f/`; the fallback: the rc.3 kit `_sandbox/pme-kit-release-fcf99b70/`
(no Home, older cards).***
```

```markdown
engineering size, not a sourced one. **On the rc.4 kit** the same talk ran on both engines (29 October,
`docs/showcase/kit-round-a/q2-rc4/`, stop screenshots in its `shots/`). Rows that moved by more than 2 s, Chromium /
WebKit: early signs 8:12 / 8:11 (8:09 below), Recovering 9:37 / 9:38 (9:35 on the same record clock), the first
`RR TOO LOW` 2:40 (3:09 below); on the Debrief's clock ventilation back met from 10:37 / 10:36 (10:34 below) and the
highest EtCO₂ 65 at 19:07 / 19:11 (64 at 18:46 below). Recognition read 0 s on Chromium. The marks are the same
(run sheet §3, "On the rc.4 kit").*
```

In `## Safety lines (UI review, 24 October; P29)`:

```markdown
  Sound on again** and check **All alarms on**. **The one exception:** if the laptop's presses stop being
  refused while the case keeps running, reload the instructor page; the phones reconnect on their own, their pills
  may read a stale line for a moment, up to 2–3 s with the cuff on (run sheet §6).
```

In `# MH-1 · MH to the early signs (×8 then ×4) (T+3:00 → 5:00)`:

```markdown
**Slot 2:00 · machine 1:14 · ends Paused at the early signs (8:09–8:10; on the rc.4 kit 8:11–8:12)**
```

In `# STOP 1 · Why the EtCO₂ rises when it should fall (T+5:00 → 8:00)`:

```markdown
**A red NIBP SYS TOO LOW at this pause** (or the alarm button reading it): a stale reading. The cuff's last number
(87/48, 85/60 on the rc.4 runs) is from the dip after induction (alarm 05:34 / 05:36); the patient now is the arterial
line, 107/67. The next cuff cycle replaces it. Do not acknowledge it on stage; point at the arterial line (run sheet,
stop 1).

```

In `# MH-3 · Ventilation back, the climb (T+13:00 → 15:00)`:

```markdown
| ≈ 0:15 (≈ 13:15) | **19:11** | **EtCO₂ 64** (65 on the rc.4 kit), HR 89, ART 99/66; banner `ETCO2 TOO HIGH` 14:27 | **Pause** as the banner shows | *"The EtCO₂ is climbing back at normal ventilation: the MH is not controlled."* Per minute after ventilation back: 40, 53, 56, 59, 61, 64. (≈ 1:45) → STOP 3 |
```

In `# MH-4 · The end of the case and the MH Debrief (T+18:00 → 22:00)`:

```markdown
| 0:00 (18:00) | 19:11 → **19:13** | EtCO₂ 64 (rc.4: 65) | **Resume** · at once **Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)** | |
```

```markdown
18:46 · **on the rc.4 kit** (Chromium / WebKit): recognition **0 s** (8:12 → 8:12) / 1 s, call 2 s / 3 s, dantrolene
21 s; ventilation back after 08:37 → 10:37 / 08:36 → 10:36; highest EtCO₂ **65 at 19:07 / 19:11** · K⁺ 5.0 (4.2–5.0) · lactate 3.6 · pH 7.33 (7.18–7.41) · Tcore 36.4 (36.4–36.8). *"The report is a debrief aid: it
```

In `# HAEM-D · The Debrief (haemorrhage) (reserve)`:

```markdown
*Kit round A4 on the E132 card (Debrief read and printed: report 8 pages, 9 with the E126 pause (kit 4d0fca9b: 98 timeline rows; kit 503caeab, the rc.4 rebase: 9 pages, 100 rows, the handout 1 page; the rc.4 kit, 29 October: 8 pages, 95 / 101 rows, the handout 1 page), the handout 1 page; the handout printed 2 pages on kit e0c73a47, 1 page after the compact-layout fix, Debrief e2e).*
```

## Presenter guide (`SHOWCASE-2-PRESENTER-GUIDE.md`)

In `# Showcase 2: presenter guide (one page, the 30-minute slot)`:

```markdown
the MH card with the owner's rulings, REV = the clinical review, E125 = the app's Home, Room and Scenarios pages,
Q2-rc4 = the same talk on the rc.4 kit (29 October, both engines, `docs/showcase/kit-round-a/q2-rc4/`). **The kit:
rc.4 (pre-release), tagged 29 October, `_sandbox/pme-kit-release-0c4b396f/`; the fallback: the rc.3 kit
`_sandbox/pme-kit-release-fcf99b70/`.***
```

In `## Ten things to remember`:

```markdown
4. **Pause at the early signs (8:09; 8:11–8:12 on the rc.4 kit [Q2-rc4]), not the call.** Stop 1 comes first; the call
   goes in after Resume (8:12, 3 s after Early signs on the clock), with *Name malignant hyperthermia* ticked during the
   stop [Q1-MH].
```

```markdown
   look at a model-page tab with the session **Paused**. **The one reload you do:** if the laptop's presses are
   refused while the case keeps running, reload the instructor page; the phones reconnect on their own (their pills
   may read a stale line for a moment, up to 2–3 s with the cuff on) (run sheet §6). **At stop 1** a red NIBP SYS TOO LOW (or the alarm button
   reading it) is the cuff's stale reading from the dip after induction; the patient now is the arterial line (107/67).
   Do not acknowledge it on stage.
```

```markdown
   no print [Q1-MH]. **On the rc.4 kit:** Key times 0 s · 2 s · 21 s (Chromium), 1 s · 3 s · 21 s (WebKit); highest
   EtCO₂ 65 (at 19:07 / 19:11); the same marks and K⁺ [Q2-rc4].
```

In `## Numbers to have in your head`:

```markdown
| On the rc.4 kit [Q2-rc4] | moved more than 2 s (Chromium / WebKit): early signs 8:12 / 8:11, Recovering 9:37 / 9:38 (record clock; 9:35 on Q1-MH's record), first `RR TOO LOW` 2:40; on the Debrief's clock ventilation back met from 10:37 / 10:36 and highest EtCO₂ 65 at 19:07 / 19:11. Also: stops held at 8:12 / 8:11, 13:52 / 13:51, 19:12 / 19:11; EtCO₂ 65 at stop 3; Recognition 0 s on Chromium; the same marks; 63 / 60 timeline rows (run sheet §3 "On the rc.4 kit") |
```
