### Added

- **The ventilator on its own screen (Room plan R8d).** Room setup's Ventilator card opens the cockpit in a window of its
  own on the laptop ("New window": `vent-hamilton.html?link=<code>`, over the browser's BroadcastChannel, no PIN), beside
  "Open here". On a tablet, the picker's Ventilator card now has "Show here": it opens the ventilator's own page
  (`vent-hamilton.html?join=<code>#/vent`), which signs in over the relay as the `ventilator` with the instructor's PIN
  typed into the instructor phone's PIN form (the same form, now in `views/pin-form.ts`), then fills the screen with the
  cockpit. One cockpit drives at a time (the view, the window or the tablet); while one drives the phones hold; closing
  or hiding it, or 1 s of silence, hands the patient to the engine's own ventilator with its last settings. The tablet
  drops its socket when the browser goes offline and signs in again when it is back, taking over from the engine's
  settings. The Room table lists "Ventilator window" and the tablet as "driving" or "handed over". The PIN is in no
  address, QR code, `room.json` or learner frame (`vent-window.e2e.ts`).
