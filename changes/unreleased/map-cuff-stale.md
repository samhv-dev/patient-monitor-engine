### Fixed

- The run record's MAP no longer holds a cuff reading between cycles (research/41 row 53). Since D1 the record kept
  systolic and diastolic only in the second of a cuff cycle, but `map` still copied the last cuff MAP into every second,
  so the Debrief's MAP line showed a value the monitor was no longer measuring beside a blank systolic. A cuff MAP now
  sits in its cycle's second and is null between cycles; an arterial MAP is kept every second as before. The Debrief's
  trend lines (the course strip, the per-trend charts and the Persian handout's charts) draw a reading with no neighbour
  to join as a dot, so a cuff MAP shows one dot per cycle with a gap between, never a line to zero. Between cycles the
  minute table shows "–" for a minute with no cycle, and a key moment's MAP is the cycle's value only when a cycle fell
  within its three-second look-ahead. Exports made before this carry the old held values and read as they did.
