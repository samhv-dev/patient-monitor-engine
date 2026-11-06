### Fixed

- **The instructor phone's Recognised press now counts as recognition** (research/41 row 56). The wire `note` command
  carries an optional `ev`, the run event the note is, one of `NOTE_EVENTS` (today only `recognised`); the guard
  refuses any other value or a non-string, and a note without it is unchanged. The host passes it to `onNote`, which
  files the phone's press as the laptop files its own: one record row `{kind:'note', text, ev:'recognised'}` at the
  host's sim time, which the Debrief's `recognitionAt` reads as the press. The relay forwards the frame as sent. The
  Recognised button therefore shows on a remote again on a free run and on a `/1` card without a recognition
  objective; PR #293 (feat-debrief2-moments) had hidden it there because the command dropped the tag.
