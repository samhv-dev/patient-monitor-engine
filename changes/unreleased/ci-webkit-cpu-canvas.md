### Fixed

- **CI's WebKit no longer loses the instructor's page to a browser crash in its GPU canvas backend (brief 203).** On
  CI's Linux WebKit (Playwright's WPE build) the host page's web process intermittently died on an assertion in Skia's
  GPU backend (`GrDrawingManager::flush`, `PathStencilCoverOp`, on Mesa's llvmpipe) while the monitor's OffscreenCanvas
  worker drew. The runner then piped its core to systemd-coredump with no size limit, which held the dying process for
  minutes, so the page looked hung and its followers froze. Diagnostic PR #460 recorded 10 such stops in 180 runs of
  depth-window E12, 0 in 36 with the monitor on the main thread, and 0 in 72 with `WEBKIT_SKIA_ENABLE_CPU_RENDERING=1`.
  `playwright.config.ts` now sets that variable for WebKit on Linux, and the e2e containers run with `--ulimit core=0`,
  so a browser crash is reported as one. No product code changed: Safari draws canvas with Core Graphics.
