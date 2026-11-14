### Fixed

- A simulation that stops is said, never silent. If the engine throws while it steps (a frame, a catch-up, a
  fast-forward step), it now stops explicitly instead of freezing: on the worker-pump path the worker used to leave its
  frame unanswered for ever, so the patient froze with only a console line, and on the page's main thread the frame
  loop ended with nothing said. The engine is not run on after the throw (its state may be half a tick on). The
  instructor's page shows a notice that stays until a new engine runs: that the simulation has stopped, why, and the two
  ways on ("Restart the patient", "Reload this page"), each with what it keeps and what it loses. The host tells every
  phone and second screen, once a second while it lasts (a new `engineStopped` event, about 200 bytes a second; nothing
  is added while the engine runs), so a phone now says "The instructor's simulation has stopped with an error: waiting
  for the instructor to restart it" instead of "The instructor's monitor is not answering", which it still says when
  the host has truly gone. After a restart the phones follow again.
