### Added

- **The kit keeps the clinicians' scenario cards as files in its own `user-data` folder** (plan
  `docs/plans/scenario-builder.md` §8 layer 2, piece B8; the owner's ruling of 10 November 2026: visible, inside the kit
  folder, never a hidden place). When the kit runs on Node.js (Start Classroom, or Start Simulator on the kit's node), the
  builder keeps the open draft as a new version file, `user-data/scenarios/<card id>/v0001-<UTC time>.json` (the card
  file as Export writes it), on Ctrl+S, at Export and every 2 min of an open draft that changed; the same bytes as the
  newest version write nothing, and no version is ever overwritten. The drafts page lists the cards the folder holds
  that this browser lacks and opens one at its newest version, so a cleared browser, or another browser of the laptop,
  finds the work. The store line says in words where the work is kept ("in this browser and in this kit's user-data
  folder") or why the folder is not written, and to export a file: the kit was started without Node.js (ruby, perl or
  python), the folder cannot be written (a read-only disk), the page is on another device, or the app is not running
  from a kit. The relay's (and serve.mjs's) `/pme-store/` paths accept writes from this computer only (the loopback
  peer, Host and Origin); card reads are open to the room, as the plan rules; a card id is a folder name only if it is
  safe on every system (no path leaves the folder); a card file is at most 512 KiB (BQ13). The kit build ships no
  `user-data` folder. Consequences the kit's READ ME FIRST states: a new kit starts empty unless `user-data` is copied
  into it, and a kit folder handed to a colleague carries its drafts unless `user-data` is left out.

### Changed

- **The classroom's room code moves from the computer's application-data folder into the kit's `user-data` folder**, in
  the hidden file `.room.json` (a dot-file; on Windows also the hidden attribute, untested on Windows at this release).
  A code an older kit kept in `~/Library/Application Support/PME Classroom/room.json` (or `%LOCALAPPDATA%\PME
  Classroom\room.json`) is read once, so the room keeps its code; that file is left as it is, and nothing is written
  outside the kit folder any more. The relay takes `--old-state-dir` for it; `PME_STATE_DIR` still overrides the folder.
