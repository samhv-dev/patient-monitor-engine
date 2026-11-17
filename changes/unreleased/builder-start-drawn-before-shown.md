### Fixed

- **The Scenario builder's start page no longer moves under a press while it loads.** The page was on screen before its
  drafts were read, with the drafts list and the storage line still empty; when they were drawn, every library card's
  "Open a copy" and every Convert moved down by about 67 px at 1440 × 900, so a press begun before the draw and ended
  after it was lost (or released on another control). The builder now shows nothing until the start page, the editor
  or the missing-draft page is drawn.
