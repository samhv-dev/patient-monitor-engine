### Changed

- **CI runs only the jobs a change can affect, in at most 20 jobs.** A pull request's run now follows the workspace's
  package graph (`scripts/ci/affected.mjs`, checked against the code by `packages/validation/test/ci-affected.test.ts`):
  a change that cannot reach engine-core skips its slow groups, and one that cannot reach engine-core, renderer, skins
  or audio skips `unit (core)`. Main, the merge runner's batch branches, the `run-validation` label and any change to
  the engine, the controller's scenario code, a workflow, a script or a root config still run every job. The engine's
  slow set is packed into twelve groups run two at a time on one runner, and the showcase halves share one; the
  ventilator's unit tests run in the build job; the renderer build is part of the `changes` job; the e2e count is part
  of a new `verdict` job, the check a merge reads, which fails when a job the plan expected did not succeed. A full run
  is 20 jobs, down from 30. No test was removed or moved. No product code changed.
