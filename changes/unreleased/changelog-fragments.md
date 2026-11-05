### Changed

- **CHANGELOG entries are fragments (research/42 §1.4 c).** A pull request with a user-facing change adds one small
  file under `changes/unreleased/` (lines under the usual `### Added` / `### Changed` / `### Fixed` / … headings,
  each exactly as it will read here) instead of a line in this file's Unreleased section, so two pull requests no
  longer conflict in CHANGELOG.md. At release, `scripts/changelog-assemble.ts <version> <date>` groups the fragments
  by heading into the dated section, moves the compare links and deletes the fragments (RELEASE.md, CONTRIBUTING.md).
  The validation test `changelog-fragments.test.ts` keeps the Unreleased section empty and checks every fragment.
