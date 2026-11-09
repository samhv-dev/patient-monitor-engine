### Fixed

- **The printed Debrief's symbols**: the legend shapes, the verdict marks and ⁺ ₂ → ↺ ≈ ≤ ≥ (22 code points) print from a
  bundled subset font ("Print Symbols": Inter 4.1 for the text symbols, Noto Sans Mono 2.014 for │ and the legend
  shapes; SIL OFL 1.1, NOTICES N-094 and N-095) instead of the printing computer's own fonts, in English and Persian;
  the numbers' cells and the swimlane's labels print in the bundled Inter too, so no system font is left in the printed
  report or handout.
- **The Persian Debrief**: draft table entries (unread by the owner) for the step buttons of the anaphylaxis,
  bronchospasm, haemorrhage, induction, induction-after-premedication and tamponade cards.

### Known limitations

- **Printing from Safari**: Safari can cut a printed table row across a page edge (WebKit does not honour
  `break-inside: avoid` on table rows); Chromium keeps rows whole (recorded in
  `docs/guides/known-deviations.md`).
