### Changed

- **Instructor v2 is the only Instructor view** (`#/teach2`): the rail's "Instructor", the `i` key and the reveal
  gestures, a Load, the Patient page, the alarm count and a deep link with no view all open it; the old address
  `#/teach` opens it too, so a bookmark or a QR code made before keeps working. The document title says "Instructor".
- A stored or imported site profile with the old `instructor` or `panel` keys still loads; the two keys are ignored.

### Removed

- **The first Instructor view's laptop route** (`#/teach`: the panel beside the monitor, its drawer and iPad layouts,
  the session bar on that route, its "End briefing" line) and Settings' "Instructor view" and "Instructor panel on wide
  screens". A tablet instructor uses the Remote (`#/remote`), which keeps that panel until the phone layout replaces it.

### Fixed

- The fast-forward banner on the Instructor view sits under its header and stage strip; it covered the header (the
  route hides the top bar the banner was placed under).
- The sheets' hint line ("D opens and closes · Esc closes", …) is 6.5:1 against the sheet, from 3.6:1 (WCAG AA needs
  4.5:1).
