### Added

- **Transport diagnostics (`@pme/controller`, brief 194).** Every transport now counts the wire messages it sent and
  delivered (`sentCount`, `receivedCount`, beside the existing `rejected`) and keeps when the last of each was (`lastSentAt`,
  `lastReceivedAt`, `performance.now()` ms); the WebSocket transport also counts the relay's control frames
  (`relayFrames`), keeps when it last heard anything on its socket (`lastHeardAt`) and how its last socket closed
  (`lastClose`: code, reason, time). Nothing reads them in the product; CI's e2e evidence of a failed attempt does, to
  tell a host that stopped sending from a link that stopped delivering. No behaviour changes.
