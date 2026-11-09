### Fixed

- **The Debrief archive no longer fills Safari's storage (defect N39, brief 110).** "Finish the case" refused to save
  ("this browser's storage is full or blocked") once the archive held about 260 simulated minutes of debriefs: each
  debrief's JSON (the whole run record, one sample a second: 9.6–10.4 k characters per simulated minute) was kept in
  localStorage, which WebKit caps at 5 MiB per site and counts at 2 bytes a character for any text with a character
  past U+00FF (the ₂ of SpO₂). The debriefs now live in IndexedDB (one store keyed by the entry's id; the small index
  stays in localStorage), whose quota is a share of the disk. A save is asynchronous end to end: the Finish pane waits
  for it before it restarts, opens or closes anything, and no button answers meanwhile. The debriefs an earlier build
  kept in localStorage move to IndexedDB once, on first use (written, then removed). A refusal now says whether the
  storage is full or the browser keeps no data for the site. The archive's line says how much it holds
  ("5 saved · 1.7 MB"). Where IndexedDB cannot be opened, the archive keeps today's localStorage path and says so.
  Nothing in a debrief is shortened and there is no cap on entries.
