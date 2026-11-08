### Fixed

- **Classroom defects, the monitor and Home (post-demo).** The worker watchdog warns first (`pme-monitor-slow`,
  `pme-monitor-recovered`) and judges the worker by its own progress: a long run reports progress (`progress` worker
  message) and a silent worker is stopped only when a probe worker answers (FX-11a). A scenario runner no longer
  counts the span to a clock that steps back twice (one ×8 worker stall added 11.3 s to the time in state; FX-11b).
  The saadat-like monitor says "IBP1 NO SENSOR" with no transducer on the channel: a technical prompt
  (`AlarmEntry.prompt`, skin `ibp.noSensorMessage`), no tone, no lamp, not in the app's alarm count (MUI-7). Home's CPU
  tile reads the last 2 s; a browser with no memory API has no Memory tile (MUI-17).
