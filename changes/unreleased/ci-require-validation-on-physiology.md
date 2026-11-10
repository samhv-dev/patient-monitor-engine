### Changed

- **A pull request that changes the physiology engine must carry the `run-validation` label (row N47).** A new check,
  `validation label` (`.github/workflows/validation-label.yml`), fails on a pull request whose diff touches
  `packages/engine-core/src/` (test files and documents aside) without the label, and says to add it; it re-runs on each
  push and when a label is added or removed, and it never runs on main. There is no opt-out label. PR #349 changed drug
  clearance and the validation workflow was skipped on all its heads for two days because the label was missing.
  CONTRIBUTING.md (rule 9) and docs/validation/README.md describe it. No product code changed.
