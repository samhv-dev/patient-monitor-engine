### Added

- **The run record keeps three more facts for the Debrief (Debrief 2, D1–D3)**: each second's systolic, diastolic
  and CVP in whole mmHg (the arterial line first, else the cuff, which sits only in the second of its cycle, so the gap between
  cycles stays blank); on each alarm raise row the time its condition cleared (`endT`) and the first time it was
  reported acknowledged (`ackT`), both undone by a return to a bookmark; and the CPR stop as a run event (`cprStop`),
  read by a new "Hands-off time" key-time tile: the seconds without compressions inside the pulseless spans and the
  compression fraction, on a small bar with reference lines at 60 % and 80 % (no grade). A record lists what its
  build kept in `keeps`; an export made before this prints as it did, with these facts "not recorded in this file".
  No schema change (`pme-debrief/2` and `/3` stay). A record grows from about 9.6 to 11.3 KB per simulated minute (pressures in whole mmHg).
