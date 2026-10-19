# Gate: the Debrief redesign (parts A, V, B) for the rc.2 tag

*Plan: [`docs/plans/debrief-redesign.md`](../plans/debrief-redesign.md). Carried into the repo from the workspace gate note
(`scratch/debrief-gate-rc2/gate-note.md`) by the rc.2 release-day docs PR, since part B's PR did not land it. The
rehearsal of the tag that replaced the plan's Wednesday rehearsal (G5) is in
[`rc2-release.md`](rc2-release.md) and `SHOWCASE-2-MEASUREMENTS.md` section Q2.*

## §A: A-GREEN and FALLBACK_SHA

- **A-GREEN: f4f479d913586de7d6cdc5ceaf7c2ea052a7c9da.** PR #84 (debrief-a) was squash-merged, and main's CI run
  39167980055 on that commit passed all 14 jobs (recorded 2026-10-19). PR #84's own CI was run 39165497561, green on
  head 49d2a857. Review R-A: no change.
- **FALLBACK_SHA: 1b87b7ee5629f7c6426989845121e57cb20d4bd5** (#89, the free-run Debrief e2e at ×4; on A + V, the rc.2
  version bump), main CI run 39178568874 green. It is an ancestor of the tag.

## §B and the tag

- Part B merged as #88 (8cd1fae5; main CI run 39184264865 green): the facilitator first page (key times, course strip,
  objective bars), the key-moments table, the learner handout, `pme-debrief/2` moments, the Persian entries.
- Kit round Q2-pretag (#90, 13ebbb7d) rehearsed 8cd1fae5 on its kit, both engines, with the A3 test (F10): no
  F-failure (`SHOWCASE-2-MEASUREMENTS.md` section Q2-pretag).
- #91 (b39b3d87): the pulseless SpO₂ footnote (owner's ruling; Persian entry owner-approved).
- `v1.0.0-rc.2` was tagged on b39b3d87 = main, with B in it (case T-B in spirit; no B revert). The rehearsal on the tag
  kit, both engines and the A3 test: no F-failure; F10 does not fire (handout 1 page, 0 verdict words, key times
  present, 7 key moments) — `rc2-release.md`.
