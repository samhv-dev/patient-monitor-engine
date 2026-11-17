### Changed

- **Every acting device has one readable name, the same on every page.** A learner remote, a pump tablet and a
  defibrillator window are named by the name typed over them in Room setup, else by their role and number among this
  session's devices of that role, in the order the host first heard of each ("Learner remote 2", "Pump tablet 1",
  "Defibrillator window 1"). The Room page, the Log, the Labs sheet, the instructor's preparation and pump-mismatch
  cards, the pump tablet's bag list and the Debrief all read it from the host's record (`device-names.ts`), which keeps
  the numbers for the whole session, across a new case and a reload of the page. Two devices of one role never share a
  name, and no device key is shown: the pump tablet's bag list said "made on 87tf0qkvgsnt", a learner remote's
  infusions said "another learner remote (87tf)", the Log said "(learner remote)" for every remote. A named device now
  reads by its name alone ("by bed 2", was "by Learner remote (bed 2)"). A saved record carries the numbers
  (`RunData.devices`); one saved before them is numbered in the order its rows name the devices, as before.

### Fixed

- **A change of an infusion's rate is recorded as a change.** A learner remote's change reads "Phenylephrine infusion
  rate changed from 10 to 20 mL/h" in the Log and the Debrief (it read "Phenylephrine 20 mL/h infusion started"), and
  the Debrief adds whose rate it replaced when another device had set it. A pump channel's change reads "Channel 1
  (Propofol): rate changed from 20 to 10 mL/h"; its start and stop name the drug too. The instructor's preparation
  card says "infusion started at mm:ss" for a syringe started as an infusion (it said "given at"). A record saved
  before this keeps its own words (`keeps` without `rateChange`), with the replaced rate in the who line as before. The
  Debrief's drug totals still count boluses only; a rate change adds none.
