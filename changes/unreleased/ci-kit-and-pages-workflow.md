### Added

- **The classroom kit and the site are built and published by a workflow (brief 169).** Once the tests have passed
  on a merge to `main`, that merge's site is published (GitHub Pages) and one rolling pre-release, `kit-latest`, is
  refreshed with its classroom kit: `pme-classroom-kit.zip` (macOS and Linux) and `pme-classroom-kit-windows.zip` (the
  same kit with the official Node.js for Windows x64 inside, its version and SHA-256 pinned). Both zips are checked
  after unzipping (the classroom relay on both, every server of the launcher on macOS) before anything is published,
  and an older merge is never published over a newer one. A version tag attaches the same two zips, named with the
  version, to its release. Before this, both were built by a script outside the repository and pushed by hand, so the
  site fell behind `main`.
