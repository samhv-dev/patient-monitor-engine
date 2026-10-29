# Instructor panel v2: the orchestrator's answers to the plan's 21 questions (2026-10-29, night)

The plan is the planner's hand-back (saved beside this file as `instructor-panel-v2-plan.md`). These answers bind the
executors. Items marked OWNER are my calls that the owner may overturn in the morning; until then they stand.

1. Route `teach2`; rail label "Instructor v2"; title "Instructor v2". Final names at IP9.
2. A hop is a state whose only exit is `afterS` ≤ 2 s; it folds into the state that exit leads to (the four treatment
   hops fold into `treating`). `triggerOff` and `treating` are two stages (both have manual exits). Stages = the
   card's states that are not hops, in document order.
3. OWNER. A future-stage click = `goto` behind the same confirm as today's jump; the strip's hint reads "jumps to it
   (asks once)", not "rewinds". A past-stage click does nothing but show its entry time; "return to a mark" lives in
   the Log sheet (Q13). The design's wording is corrected by this answer.
4. A mixed `any`/`all` with a manual inside shows as a step with the subtitle "or by itself when <rule>". The cue
   box says "by your button" when IP8's `by` is `press`, "by its rule" when `rule`, "by a jump" when `goto`; without
   IP8's field (follower), it says "entered" with the time only.
5. `event` transitions show as auto rows with "A" and the subtitle "when <event> is given (from the Defib sheet)".
6. A step is "condition not met" only when an objective is linked to it and that objective's `after` is a `value:`
   rule not yet true. Link rule: the objective's `event` equals `state:<to>` of the step, or equals `drug:<id>` for a
   drug in `<to>`'s `onEnter`. No linked objective: the step is "ready".
7. Taken = its transition fired by a press. Overdue = the linked objective's `eventWithin` window has passed and the
   step is not taken. Failed = the step's source state is no longer current and `<to>` is not reachable from the
   current state in the card graph. Not done = never taken by the end. Out of order = taken after a step with a
   higher array index in the same stage was taken. "The order it was due" = the transitions' array order.
8. Add a read-only hold accessor to the host-side driver (a third controller addition, host only, IP1's executor);
   the bar shows value against threshold times hold fraction. Followers show value against threshold only.
9. The clock pill sends exactly what today's session-bar Pause and Resume send (copy them). No queued skip: Fast
   forward is disabled while paused. Speed chosen while paused behaves as today's scale command does.
10. OWNER. When the sheet's dose equals the card's, Give sends the trigger only (the card gives the dose). When it
    differs, Give sends the bolus and NOT the trigger, and the sheet says "this dose is off the card".
11. OWNER. Card steps stay out of the cache: "Add to the cache" is disabled for a pinned card step, with the note
    "card steps are given from ACTION".
12. One record row per item, one Debrief line per batch. Yes.
13. "Return to a mark" is offered in the Log sheet's marks list (today's bookmark restore). The note field: Enter
    writes a note entry; a mark pressed takes the field's text as its note and clears the field.
14. Today's tab bodies inside the sheet frame are acceptable for this release. Gas is not built. HELD tag on the
    learners' monitor is out of scope; the panel shows HELD in STATE only.
15. OWNER. The CPR takeover is not built; ACTION stays; the Defib sheet opens like any other.
16. D opens and closes the Drug sheet. Inside a sheet: Enter = give now; S = add to the cache (only while a sheet is
    open); Deliver has no letter (button or click). Shift+S/P/N stay as today.
17. Additive fields in `pme-debrief/2`; the keys test updated; `debrief-fa.mjs` untouched.
18. OWNER. Swap navigates to `#/monitor`; the rail returns. No new layout.
19. The alarm count and the reveal gesture go to the view used last (`teach` or `teach2`), a small `main.ts` change
    in IP4.
20. Off the card lists the off-card actions taken so far in this stage, from the log; no launchers.
21. The stage's own line is the state label as the card writes it.

R13: the strip folds hops, so "18" vs 19 states is the fold; transition order is the card's array order and that is
what "the card's order" means everywhere in the design.

Branches: `feat-ip2-<piece>` from `origin/main` (a88f95a7 or later); PRs target `main`; nothing merges before the rc.4
tag; executors never merge. Common gate as the plan states; the today-view diff check is part of every gate.
