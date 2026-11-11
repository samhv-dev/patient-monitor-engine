### Added

- **The classroom kit and the site are built and published by a workflow (brief 169).** Every merge to `main` now
  rebuilds the published site (GitHub Pages) from that commit and refreshes one rolling pre-release, `kit-latest`,
  with the current classroom kit: `pme-classroom-kit.zip` (macOS and Linux) and `pme-classroom-kit-windows.zip` (the
  same kit with the official Node.js for Windows x64 inside, its version and SHA-256 pinned). Both zips are checked
  after unzipping (the classroom relay on both, every server of the launcher on macOS) before anything is published.
  A version tag attaches the same two zips, named with the version, to its release. Before this, both were built by
  a script outside the repository and pushed by hand, so the site fell behind `main`.
