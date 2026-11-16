### Fixed

- **After the instructor's computer reloads, every signed-in device comes back by itself.** The learner remote, the pump
  tablet, the instructor's phone and the ventilator's own page each read the relay's "the instructor's computer
  reconnected; signing in again" notice as a refusal: they closed their link and showed the PIN form, so every person
  had to type the PIN again mid-case. Now the notice keeps the page as it is ("Signing in again: waiting for the
  instructor's computer…"), and the device signs in again on the computer's hello. At each grant the computer hands the
  device a one-time ticket (`grant.ticket`); the device keeps it in its page's memory and lets go of the PIN, and every
  later hello proves the ticket (`hello.ticket`) and receives the next one. The computer keeps only each ticket's
  SHA-256, in the tab's sessionStorage with the running case (and in the hand-over to another tab), so its reload keeps
  its devices; the Room page shows each as the same row. A device is asked for the PIN again, with the reason, when its
  role's PIN was changed meanwhile, another phone took the instructor's place, the computer started a new session or
  lost its book, or the ticket is not known or was already used; a ticket said again by another device signs both out.
  A refused ticket counts with the wrong PINs at the relay. A computer whose page is not a secure context (no SHA-256)
  hands on no tickets: its devices sign in on the PIN as before.
