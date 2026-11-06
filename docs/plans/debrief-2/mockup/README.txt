COPIED 2026-11-05 for docs/plans/debrief-2-option-c.md from the disposable folder _sandbox/debrief-redesign-mockups/.
Only the Option C files are here (option-c-debrief2.html/.pdf, generate-option-c.py, mock.css); the A and B
mock-ups described below were not copied. The text below is the folder's README.txt of 18 October, unchanged.
Rebuild: python3 -I generate-option-c.py <a pme-debrief/1 export> <out dir> (it reads mock.css beside itself).

DEBRIEF REDESIGN MOCK-UPS (research/33-debrief-redesign-research.md), 18 October 2026
====================================================================================
Static pages for discussion: NOT the product, no app code. Each .html prints to A4 portrait
in Chrome. Each .pdf is that Chrome print (headless, no browser headers). They have not been
checked in Safari. Every page carries the footer "For education only. Not a medical device and
not clinically validated ..." with "Version 1.0.0-rc.1 (pre-release), build 3db25a3b
2026-10-18", and a red "MOCK-UP" tag at the top right.

DATA. All three are built from one recorded run, the tamponade cue-card path of kit round A3.1:
  docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json
  (schema pme-debrief/1; in the worktree at the rc.1 tag, scratch/wt-embed-rc1)
Times, HR, MAP, SpO2, EtCO2, alarm RAISE times, states, objective verdicts and intervals are the
run's own values. Rebuild them with:
  python3 -I generate-mockups.py <json> <this folder>    (options A and B)
  python3 -I generate-option-c.py <json> <this folder>   (option C)

1. option-a-polish-first-page.html / .pdf  (1 page)  -  Option A "Polish"
   MEASURED: everything. The objectives and their reason lines, the measured facts, the times.
   CHANGED ONLY IN PRESENTATION: the header band, the verdict words
   (Achieved / Discuss / Instructor's call), the layout and the ruled notes box.
   ILLUSTRATIVE: nothing.

2. option-b-facilitator-first-page.html / .pdf  (2 pages)  -  Option B "Facilitator first page"
   MEASURED (computed from today's record, nothing invented):
   - the key-time tiles;
   - the strip chart (MAP, HR, EtCO2) with numbered key moments;
   - "who" (team or patient), worked out from whether the scenario's transitions are manual;
   - the interval bars;
   - the key-moments table: values at that second, and the alarms raised since the last row.
   NOT RECORDED, AND SHOWN AS SUCH: the "Recognition" tile reads "not marked", because this run
   has no instructor tick.
   WORDING, NOT DATA: the four talking-point boxes. The "Analysis" opener in them is an example
   of question E46, not owner-approved text.

3. option-c-debrief2.html / .pdf  (3 pages)  -  Option C "Debrief 2" (a later release)
   Page 1: facilitator key times, a swimlane (patient / team / monitor alarms / drugs + MAP and
           EtCO2), and the objectives in behavioural words with interval bars.
   Page 2: key moments with SBP/DBP/CVP columns, the scenario's debrief hints, and the PEARLS
           mode for each gap.
   Page 3: a learner handout with no marks and no verdicts: the run at a glance, key moments,
           reflection prompts, take-home points and next steps.
   MEASURED: as in B, plus every alarm's RAISE time (the solid tick at the start of each alarm
   bar), HR, MAP, SpO2, EtCO2, and all state, pulse-loss, CPR, drainage, return-of-circulation
   and fluid times.
   ILLUSTRATIVE (grey italic with a dagger, footnoted "not recorded in rc.1"):
   - SBP, DBP and CVP. Invented, but kept consistent with the measured MAP (MAP ~ (SBP+2*DBP)/3).
   - ALARM END TIMES: the dashed grey length of each alarm bar. rc.1 records raises only. A
     re-raise of "ART S low" and "ART D low" at 07:57 shows they had ended before, but not when.
   - The "Recognised" mark at 02:10, and both intervals that depend on it.
   PLACEHOLDER WORDING (dashed orange tag): the scenario debrief hints, the analysis openers, the
   PEARLS mode table and the take-home points. These were written by the researcher to show the
   layout; they are not reviewed by the owner and are not clinical guidance.
