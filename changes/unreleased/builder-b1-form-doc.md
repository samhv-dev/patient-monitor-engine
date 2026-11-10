### Added

- **The scenario builder's model (plan `docs/plans/scenario-builder.md`, piece B1)**, no screen yet: `formOf(card)` turns a
  scenario card into the form the builder will edit, section by section (header, patient, briefing, phases, script,
  actions, outcomes, debrief), and `docOf(form)` writes it back. The round trip is lossless on all 20 cards of the
  library: the same value and the same key order at every level, and the very bytes for the 8 files written as
  `JSON.stringify(card, null, 2)`; a field the form does not know (a `/1` card's states, a retired `judged` block) is
  carried whole. `fieldOf(path)` places each validator line on the field its path names (`/phases/2/next/0`: phase 3,
  its "may be followed by" list, row 1), a rule's node and leaf included, or at its block's heading; a check of the
  card runs 300 ms after the last change, on the document the form would write (`apps/demo/src/app/builder/`).
