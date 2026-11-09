### Added

- **Learner remote L0: the baseline its pieces are measured against** (plan `docs/plans/learner-action-remote.md` §L0;
  tests only). Pinned on today's main: a viewer's drug or sample is refused by the host ("a viewer cannot command") and
  by the relay (`forbidden`); a defibrillator window's drug or sample is refused by both; an ABG drawn on the host comes
  back on a follower as the same `labResult` at the same tick, 120 s after the draw (the engine's
  `LAB_TURNAROUND_S`, which L10a sources); a `/2` sample action counts only by its taking, never by an engine draw; the
  follower page has no learner-remote instrument and the picker no remote card; the drug library has 65 rows, 4
  volatiles and 61 injectable ids (the formulary's coverage target).
