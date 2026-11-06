### Fixed

- A hello forged under a Remote's peer id while the Remote reconnects no longer blocks the Remote's commands
  until its page reloads (R29, the known gap of #183). The host kept each relay peer's last sequence number and role
  while its socket was down, so a hand-written hello with that id and a higher number, sent in that window, made the
  host drop the reconnected Remote's frames as duplicates. The relay now sends the host `{relay:'peer-left', id}` when a
  non-host socket leaves the room (before the newcomer's hello when it replaces a half-open socket), and the host
  forgets that peer on that transport only.
