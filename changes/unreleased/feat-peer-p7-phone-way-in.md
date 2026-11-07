### Added

- **The instructor's phone signs in with a PIN (plan instructor-peer-role.md P7).** The Remote opened over the relay
  (`?relay#/remote?code=CODE`) is a PIN form with a numeric keypad that joins as the `instructor` role, and says each
  state in words: signing in, signed in, wrong PIN, too many tries, taken over by another phone (at the case clock),
  the PIN changed, the instructor's computer restarted, and, after 10 s with no answer, a kit that does not take an
  instructor phone. Signed in, it shows today's instructor panel. The PIN is held in the page's memory only: the field
  has no name, the form never submits, the address and the history carry the code alone, and the field is emptied at
  sign-in and whenever the page is left. The Room page gains an "Instructor's phone" card: the phone's state and since
  when (signed in, another phone took over, lost, signed out by a PIN change), the wrong PINs of the last minute, the
  PIN behind press-and-hold (not in the page while not held), Change the PIN (the host revokes the phone at once), and
  a second QR code with the phone's address, which carries no PIN. The laptop draws four random digits at first use and
  keeps them in its own store (`pme.instructorPin`); the host reads them at every instructor hello. Without a relay the
  Remote stays the same-browser code form. `CLASSROOM.md` has a section "The instructor's phone".
