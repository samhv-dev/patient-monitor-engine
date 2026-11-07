### Fixed

- **CI's e2e shards of one set always split the same way.** Each shard used to download the last green main run's
  reports and plan its own files; when one download failed (run 42284321017 on main: WebKit shard 1/3 got 2 of the 3
  reports after a 503 from the artifact service), that shard's split differed from its siblings', so files ran twice
  or not at all (174 WebKit tests against 165 listed) and `e2e-count` failed, as it should. The plan is now made once
  per run, in the renderer job, and every shard reads that one plan; with none for a set, every shard of the set falls
  back to Playwright's `--shard` together. The record had put this failure down to a documents-only push taking the
  documents path; it did not (on a push to main every job runs). No product code changed.
