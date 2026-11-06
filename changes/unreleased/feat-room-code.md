### Added

- **The room code stays (Room plan R1, R1b).** The instructor's page at the app's address (no `?session=`) starts under
  the room code this browser kept (`pme.roomCode`), so a reload, a restart of the laptop or the next day runs the same
  room, and a phone left open on the old page follows again. A second tab while the first runs the room is asked as a
  duplicated tab is; "Start a new session" there runs a code for that tab alone and the room keeps its code. The relay
  takes `--state-dir DIR`: it keeps the code of the last room a host opened in `DIR/room.json` (the code only: no PIN,
  peer id, address or name) and answers it as `lastRoom` in `/pme-relay.json`; without the option it writes nothing.
  The classroom kit's launchers point it at this computer's application-data folder (`~/Library/Application
  Support/PME Classroom` on macOS, `%LOCALAPPDATA%\PME Classroom` on Windows), so when 8650 is busy and the kit opens
  on the next port (a new address, whose store is empty) the page still starts under the same code. A phone's page
  talks to the relay of its own address: one left on the old port loses its connection and must scan again. No control
  to draw a new room code yet (planned: Room setup's "New room code").
