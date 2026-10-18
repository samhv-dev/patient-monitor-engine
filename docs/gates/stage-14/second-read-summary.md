# Stage 14 Task 1 Step 6b: second read (complete, 2026-10-18)

Read against origin/main 9b135fe4. In scope: 1,141 comment decisions of class m or c, or overriding an a/b proposal; all 441 title decisions; and 2 new decisions for m blocks on main that had none. That is 1,586 rows in `second-read.tsv`, after the addendum below.

Ranges:
- A (000000000000–555555555555): read by the lead reviewer.
- B (555555555555–aaaaaaaaaaaa): comments up to a8d72a82a25d by helper 1; the rest of the comments and all 154 titles re-read by the lead reviewer.
- C (aaaaaaaaaaaa–ffffffffffff): comments and titles below e9bf3a8b1368 by helper 2; titles e9bf3a8b1368–ffdf473fccf0 re-read by the lead reviewer.

Every fixed row is applied in `data/comment-decisions.json` / `data/title-decisions.json`, and its reason is appended to the entry's note as "second read: …".

## Totals

| | read | ok | fixed |
|---|---|---|---|
| comments, class b (overrides) | 676 | 644 | 32 |
| comments, class b (new blocks on main, replacing stale keys) | 2 | 0 | 2 (new decisions) |
| comments, class m | 438 | 411 | 27 (2 of them new decisions) |
| comments, class c | 29 | 25 | 4 |
| titles, class b (overrides) | 292 | 285 | 7 |
| titles, class m | 149 | 140 | 9 |
| **all** | **1,586** | **1,505** | **81** |

Re-run on main: rewrite.py gives "unreviewed m/c: 0"; titles.py gives "dup=0".

Three fixed blocks still exceed 120 columns: 49f48c76164f, a8d72a82a25d and 61e89398d6db. Each is a trailing comment on a code line that was already longer, and each is now shorter than the decision it replaced.

## Stale keys (the comment changed on main) and their replacements, for Task 1 Step 3

| stale key | file | replacement key (class on main) | state |
|---|---|---|---|
| e7564c0eda54 | packages/ventilator/src/link/port.ts:1 | 852046e50d88 (m) | decision written in this read |
| b194f7794f56 | packages/engine-core/src/l2/pk/data/rows-other.ts:25 | b2cdec2f1dbd (b) | decision written (addendum): the stale decision's first five lines, then the citation note without "fix-citations PR #52, owner-ruled 2026-10-11; numbers unchanged" |
| 6263f6b04e80 | packages/controller/src/session/controller-session.ts:1 | d5335acc79f6 (b) | decision written (addendum): the stale decision's three lines, then the re-send/refusal paragraph without "BUILD-PLAN acceptance 3", "FX-2" and "F-49-2" |

The other m block on main that had no decision, 5a5bb41f0680 (apps/demo/src/app/panel/scenario.ts:83), now has one.

## Addendum (orchestrator follow-up, same day)

- The two replacement blocks b2cdec2f1dbd and d5335acc79f6 now have decisions (see the table above).
- Three bare Q-numbers that the first pass had left as ok are now fixed. Each one is a plan open question, not a brief or parameter-table locator, so it is removed:
  - c62128cdd008: "brief Q12" is question 12 of the clinical-app plan, decided by orchestrator ruling 4.
  - c4d180596b73: "brief Q6" is question 6 of the clinical-app plan, on the dose presets. Its answer (drafts from the drug library's ranges, one table for Ali's review) stays.
  - ec37bcab018f: "Q10" is question 10 of the drug-layer plan, on the [ENG] probabilities. The decision's "calibrated" also misstated "R44 calibration": the value is queued for the calibration pass. It now reads "[ENG, for the calibration pass]".
