### Fixed

- Instructor v2's stage strip no longer shows a stage that was entered as skipped after quick jumps. The host's
  clock estimate (the last engine event's time run forward on the page's clock) stepped back whenever an engine event
  came in a few ms behind the estimate, so of two gotos either side of such an event the later got the earlier time;
  the strip reads an entry earlier than the one before it as a rewind and dropped the stage between (no time, no
  "Return to its start"). The estimate now holds at the latest time it gave until the engine passes it; a restore or
  a new patient still sets it back (`AppSession.simNow`; CI run 42113324793, `teach2-fit.e2e.ts:505`).
