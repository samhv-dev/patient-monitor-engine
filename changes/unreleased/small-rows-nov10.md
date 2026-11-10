### Fixed

- **The Persian learner handout of the malignant hyperthermia card prints on one A4 page (row N13).** It printed on
  two (292.6 mm of content in Chromium, 296.4 mm in WebKit, against 267). Two causes: the rule that mirrors a Persian
  table cell's padding set all four sides, so every printed Persian table row took the screen's 3 px above and below
  instead of the print's 0.3 mm (12.9 mm on the card's twelve key moments; the report's Persian tables are tighter too);
  and Vazirmatn's leading, 1.55 (the font's own ascent plus descent), makes each Persian text line about 15 % taller
  than the English, 12.7 mm past the page at the full sizes. In Persian the handout now prints in its compact layout
  (the print's own smaller sizes, used for long handouts since E132), with the take-home lines at the Persian leading
  and the table rows at 1.39, the least that holds every Persian letter's ink, and the inline runs of a Persian cell no
  longer paint white over the row rules. Measured: 258.5 mm in Chromium (one page), 262.3 mm in WebKit; A3.1 tamponade
  228.4 and 232.2 mm. Nothing is removed and no size goes below the compact layout's.
- **The picker's and Room setup's "Depth of anaesthesia" card says what is true (row N11).** It said "Not available
  yet · Needs a simulated EEG"; the engine has simulated the EEG since PR #322. It now reads "Coming later": the engine
  simulates the EEG and reads it as a processed-EEG monitor, and its screen in the room is still to come.
- **CI keeps the soak's numbers (row N15).** The validation workflow uploaded the soak-and-perf artifact before the
  soak ran; the upload now follows the soak and still runs when it fails.
- **Known deviations: one expected-failure count, and the session clock's frame budget as the code has it (rows N36,
  N37).** 180 expected-failure calls and 6 skipped tests on main 128917d6, as `scripts/deviations.ts` prints them; the
  owed ticks run within the time since the last frame, clamped to 50–250 ms (`frameBudgetMs`), not "a 50-ms budget".
