### Changed

- **CI's e2e shards are balanced by measured duration.** Each browser's three e2e shards get their files from
  `scripts/ci/e2e-shard-plan.mjs`: the per-file test time recorded in the last green main run's Playwright reports,
  longest first onto the least-loaded shard (an unrecorded file counts as the median one), instead of Playwright's
  contiguous split by test count, which put the three teach2-fit files in one shard. With no readable report the job
  falls back to Playwright's `--shard`. No product code changed.
