### Added

- **Debriefs kept in the kit's `user-data` folder too** (brief 139 PR 2; the owner's ruling of 10 November 2026). When
  the app runs from a kit on Node.js, every debrief the archive saves is also written as `user-data/debriefs/<entry
  id>.json`, the entry as "Download" writes it; when this browser refuses the save (a full storage, a private window)
  the file is still written and the instructor is told it is kept there. On opening, the archive reads back every
  debrief the folder holds that this browser lacks, so another browser of the laptop, or this one after its data was
  cleared, finds them. The Debrief page's archive line says "kept in this browser and in this kit's user-data folder",
  or, in the builder's words, why the folder does not keep them. A debrief names a resident: the kit's server lists,
  reads, writes and deletes debriefs for this computer only, never for a phone on the room network. "Clear the
  archive" moves their files into `user-data/debriefs/removed/` (the owner's ruling, "B for now": nothing is destroyed,
  the app never reads them back, a person empties that folder by hand), and its dialog says so; the kit's READ ME FIRST
  says a kit folder handed to a colleague carries its debriefs unless `user-data` is left out.
