### Fixed

- **A connected Remote has a visible heading again.** Both Remote paths (the same-browser code form and the
  instructor phone's PIN form) hid their join form on connecting, and with it the page's only h1, so every tab of a
  connected Remote showed no h1 to the accessibility audit, which exempted that finding. The connected Remote's first
  row is now its heading, "Instructor remote", beside the status pill; the audit's iPad run on the Remote has no
  exemption left (research/41 row 62; the sheet-hint contrast half of that row shipped with the Instructor view's
  flip).
