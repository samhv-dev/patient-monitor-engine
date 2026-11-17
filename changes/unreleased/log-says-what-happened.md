### Fixed

- **The Log marks where each case begins.** The Log sheet runs on across cases; it now has one line, marked under
  every filter and in both exports, at the moment a card is loaded or restarted or a new patient starts: "Case begins:
  Malignant hyperthermia", "Case restarted from 0:00: …", "New patient: M 40 y 70 kg", "Patient restarted: …". The
  line travels with the host's new timeline (`timeline.begins`), so the instructor's phone writes it too, and it is the
  first line of the case it begins: the "Patient restarted" line was written before the new timeline reached the Log
  and so ended the old case's lines. A case brought back after the laptop's page reloaded, and a return to a bookmark,
  begin nothing.
- **A rate change on the instructor's own drug sheet reads as a change.** The host now writes the rate a command
  replaces on every applied infusion rate, whoever sent it (it wrote it only on a learner remote's), and the Log says
  each of its own commands as the host applied it: "Norepinephrine infusion rate changed from 3 to 6 mL/h", in the
  words a remote's change has (it read "Norepinephrine 6 mL/h infusion started").
- **A learner's phone and the pump-mismatch card name the other device.** The host writes the sender's role and
  readable name on every command a learner remote, a pump tablet or a defibrillator window sends (`sender`). A learner
  remote's Infusions tab says "set by Learner remote 2" or the name Room setup gave it (it said "another learner
  remote"); the pump-mismatch card names the device that caused the mismatch by its true role, and says "instructor's
  computer" for the Drug sheet's own change (it called every device a pump tablet).
- **The instructor's phone says "The instructor's computer restarted" when it joined a session already running.** The
  page learned the host's identity only from a host hello, which a phone that joins later never hears; it now reads
  the session's own (which also learns it from the grant, the events and the snapshot).
