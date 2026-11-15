### Changed

- **End-to-end tests isolated from one another (brief 236).** Every e2e Vite server (dev or preview) now starts
  through `startVite` / `startVitePreview` in `apps/demo/e2e/app-support.ts` on a port of its own, strictly held: one
  the operating system hands out, or `PME_E2E_PORT` + the worker's index when that variable is set. Vite 6 reads a port
  of 0 as "5173, or the next free one", so every file's server had taken 5173 in turn and a page left open by one test
  reloaded onto the next file's server. `packages/validation/test/e2e-servers.test.ts` keeps every file on the helper.
- **A test that leaves a browser context or page open now fails** (the shared fixture `apps/demo/e2e/evidence.ts`),
  naming the test and the lines that opened each one; the fixture still closes them. The tests that had left them open
  close them themselves.
- **The evidence of a failed attempt says which pointer, click, wheel and key events each frame received** (a passive
  recorder the e2e fixture installs) and, on a ventilator page, its settings and breath state from the existing e2e
  hook. Nothing in the app changes.
