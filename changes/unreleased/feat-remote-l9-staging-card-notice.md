### Added

- **Learner action remote, L9: the instructor sees what a learner remote staged and can show the incompatibility notice,
  on the laptop and on the instructor's phone (plan learner-action-remote.md §L9, D7; LQ3 ruled 9 November).** When a
  learner remote stages a preparation with a finding, a card appears at once over Instructor v2's dock and above the
  instructor phone's panel ("Bed 2 remote staged … · Incompatible: <the entry's statement> (<its source>; Trissel 2013 …
  agrees)"), and the header counts the preparations still to look at. Its one control, "Show the incompatibility notice
  to the learner", sends the new instructor-only command `prep notice {by, prepId}` (in `INSTRUCTOR_COMMANDS`, never a
  learner's shape): the host shows the notice once, whichever screen pressed first (a second press is refused with the
  time it was shown), the learner's phone sounds its tone and shows the finding, and the card reads "Notice shown at
  mm:ss". Nothing is removed or blocked: a Give before the press is given, and the card says "given at mm:ss, notice not
  shown". The /2 record's copy of the preparation now carries the notice's time. Clean preparations are listed
  collapsed ("3 preparations, no finding"). The instructor's copy of a preparation names the device as Room setup did.
