# Upstream issue draft: Playwright Linux WebKit (WPE) web-process segfault in the ThreadedCompositor (F-FX1-1)

> **Status: DRAFT, NOT FILED.** Written 2026-10-18 for the project owner to file himself on `microsoft/playwright`.
> Nothing here has been posted anywhere. The "paste-ready issue" section below is the text to paste; everything
> else is the evidence pack behind it. References to "rulings" and to the diagnosis point to the project's working
> notes, which are kept outside this repository. All run ids are runs of this repository's `ci` workflow and their
> logs are public (GitHub keeps them 90 days, so the oldest ones cited here expire around 10 January 2027).

## 1. Summary for the owner

On the GitHub-hosted Ubuntu 24.04 runner, Playwright's bundled Linux WebKit (WPE build, `webkit-2359`, shipped with
`@playwright/test` 1.63.0) occasionally kills its own web-content process: the kernel logs a NULL-pointer segfault in
the `ThreadedCompositor` thread at `libWPEWebKit-2.0.so.1.12.0+0x60a0f8a` (9 of 10 captured crashes; the tenth is a
SIGILL release-assertion trap at `+0x613a168`), and the test then fails with "Target page, context or browser has been
closed" (once "Page crashed") and passes on retry. In the last 40 completed WebKit e2e jobs it hit **8 runs of 40
(20 % of runs)**, 10 attempts out of 2,903 test executions (≈ 0.34 %), always rescued by the retry. Our diagnosis
found no product cause. Moving the monitor's drawing from an OffscreenCanvas worker to the main thread did not change
the rate (6/30 vs 4/30 crashed attempts, same signature in both arms), no OOM was logged, and macOS WebKit never
crashes. It looks like a WPE compositor bug that our continuously animating 2-D canvases trigger. The standalone
repro below is our best guess at a minimal trigger, but it has **only been run on macOS** (a different WebKit port), where it passed 20 of 20 as expected. It has not been run on Linux. Filing gives
the Playwright team the signature and the offsets for their build. If they ask for a Linux reproduction, the next
step is to run that file on an `ubuntu-24.04` runner. That would be a new decision, not part of this draft.

## 2. How to file it (three things)

1. **Where.** `https://github.com/microsoft/playwright/issues/new/choose` → the **bug report** template. First search the open
   and closed issues for `ThreadedCompositor`, `WPEWebProcess segfault` and `webkit 2359`. If one matches, add the
   evidence as a comment there instead of opening a new issue. Title suggestion:
   `[Bug]: Linux WebKit (WPE, webkit-2359) web process segfaults in ThreadedCompositor at +0x60a0f8a during long 2-D canvas animation`.
2. **Labels.** Outside reporters cannot set labels on `microsoft/playwright`. The bug template applies its own triage
   label, and maintainers add the browser and platform labels. Do not ask for any in the text. The title's
   "Linux WebKit (WPE)" and the System info block give them what they need to route it to WebKit on Linux.
3. **What to attach.** (a) The standalone test from §3 "Test file", pasted inline (the template asks for code, not a
   zip). (b) The links to the two public trial runs with the kernel and `coredumpctl` output:
   `https://github.com/samhv-dev/patient-monitor-engine/actions/runs/39089724204` (5 crashes, worker arm) and
   `https://github.com/samhv-dev/patient-monitor-engine/actions/runs/39090802944` (4 crashes, main-thread arm), job
   "e2e (webkit) trial", step "kernel view of crashes". (c) Nothing else. Our core dumps were not kept: the trial
   printed `coredumpctl info` but did not upload `/var/lib/systemd/coredump`. If the maintainers ask for a core file, that
   needs a new CI trial with an upload step, which is a decision for you.

---

## 3. Paste-ready issue (copy everything inside the block)

~~~markdown
### Version

1.63.0

### Steps to reproduce

We have not reproduced this outside our own suite yet. The test below is our best minimal guess at the trigger,
but it has **not been run on Linux**. On macOS WebKit (different port) it passes 20/20, which tells us nothing.
On our real suite the crash is reproducible on GitHub's `ubuntu-24.04` runner at roughly one crash per four
attempts of our heaviest test (see "Frequency").

1. On an Ubuntu 24.04 x64 machine (we use GitHub-hosted `ubuntu-24.04`), `npm i -D @playwright/test@1.63.0` and
   `npx playwright install --with-deps webkit`.
2. Save the test file below as `webkit-compositor-crash.e2e.ts` and the config below as `playwright.config.ts`.
3. `npx playwright test webkit-compositor-crash.e2e.ts --project=webkit --repeat-each=20 --retries=0`
4. Afterwards, `sudo dmesg | grep -iE 'segfault|traps'` and `coredumpctl list`.

**Config** (the relevant part of ours: one worker for WebKit, Desktop Safari device):

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testMatch: '*.e2e.ts',
  retries: process.env.CI ? 2 : 0,
  projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'] }, workers: 1 }],
});
```

**Test file.** One page with (a) a 2-D canvas transferred to a worker that redraws a sweeping trace every frame,
(b) a main-thread 2-D canvas (`{ alpha: false, desynchronized: true }`) doing the same, and (c) DOM text updated at
4 Hz, while the test polls with `page.evaluate` every 50 ms for 45 s. This copies what our pages do: a patient
monitor drawn as an incremental sweep with an erase bar, polled by the tests through `page.evaluate` and
`page.waitForFunction`.

```ts
import { expect, test } from '@playwright/test';

const ORIGIN = 'http://repro.test';

const WORKER_JS = `
let ctx, w, h, x = 0, frames = 0;
const tick = () => {
  // incremental sweep: erase a bar ahead of the pen, draw the new segment
  ctx.fillStyle = '#000'; ctx.fillRect((x + 4) % w, 0, 12, h);
  ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2; ctx.beginPath();
  for (let lane = 0; lane < 6; lane++) {
    const y0 = (lane + 0.5) * h / 6, y = (t) => y0 + Math.sin((t + lane * 7) / 9) * h / 16;
    ctx.moveTo(x, y(x)); ctx.lineTo(x + 3, y(x + 3));
  }
  ctx.stroke();
  x = (x + 3) % w; frames++;
  if (frames % 30 === 0) postMessage(frames);
  (self.requestAnimationFrame ? self.requestAnimationFrame(tick) : setTimeout(tick, 16));
};
onmessage = (e) => { const c = e.data.canvas; w = c.width; h = c.height; ctx = c.getContext('2d', { alpha: false }); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); tick(); };
`;

const PAGE_HTML = `<!doctype html><meta charset="utf-8"><title>repro</title>
<style>body{margin:0;background:#000;color:#0f0;font:14px monospace} canvas{display:block}</style>
<canvas id="w" width="1140" height="420"></canvas>
<canvas id="m" width="1140" height="140"></canvas>
<div id="num"></div>
<script>
  const st = { workerFrames: 0, mainFrames: 0, t0: performance.now() };
  window.__repro = st;
  const wc = document.getElementById('w').transferControlToOffscreen();
  const worker = new Worker('/worker.js');
  worker.onmessage = (e) => { st.workerFrames = e.data; };
  worker.postMessage({ canvas: wc }, [wc]);
  const mc = document.getElementById('m'), ctx = mc.getContext('2d', { alpha: false, desynchronized: true });
  let x = 0;
  const loop = () => {
    ctx.fillStyle = '#000'; ctx.fillRect((x + 4) % mc.width, 0, 12, mc.height);
    ctx.strokeStyle = '#ff0'; ctx.beginPath(); ctx.moveTo(x, 70 + Math.sin(x / 11) * 40); ctx.lineTo(x + 3, 70 + Math.sin((x + 3) / 11) * 40); ctx.stroke();
    x = (x + 3) % mc.width; st.mainFrames++;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const num = document.getElementById('num');
  setInterval(() => { num.textContent = 'HR ' + (60 + (Math.random() * 40 | 0)) + '  SpO2 ' + (90 + (Math.random() * 10 | 0)) + '  t ' + ((performance.now() - st.t0) / 1000).toFixed(1); }, 250);
</script>`;

test('a worker-drawn and a main-thread-drawn 2-D canvas animate for 45 s under page.evaluate polling', async ({ page }) => {
  test.setTimeout(120_000);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/worker.js') return route.fulfill({ contentType: 'text/javascript', body: WORKER_JS });
    return route.fulfill({ contentType: 'text/html', body: PAGE_HTML });
  });
  await page.setViewportSize({ width: 1140, height: 620 });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => (window as unknown as { __repro: { workerFrames: number } }).__repro.workerFrames > 0);
  const end = Date.now() + 45_000;
  while (Date.now() < end) {
    await page.evaluate(() => (window as unknown as { __repro: { mainFrames: number } }).__repro.mainFrames);
    await page.waitForTimeout(50);
  }
  const s = await page.evaluate(() => (window as unknown as { __repro: { workerFrames: number; mainFrames: number } }).__repro);
  expect(crashed).toBe(false);
  expect(s.workerFrames).toBeGreaterThan(0);
  expect(s.mainFrames).toBeGreaterThan(0);
});
```

### Expected behavior

The web-content process stays alive for the whole test, as it does on macOS WebKit (same Playwright 1.63.0)
and on Chromium on the same Linux runner.

### Actual behavior

Intermittently, after the page has been animating for tens of seconds, the `WPEWebProcess` dies. Playwright then
reports the next call on the page as failed:

```
    Error: page.waitForFunction: Target page, context or browser has been closed
```

(`page.evaluate:` / `page.click:` with the same text, depending on the call in flight. Once,
`Error: page.waitForTimeout: Page crashed`.) `page.on('crash')` fired on all 11 failures where our diagnosis listened for it. The MiniBrowser process itself exits
normally at the end of the test (`<process did exit: exitCode=0, signal=null>` with `DEBUG=pw:browser`). Only
the web process dies.

Kernel log on the runner (`sudo dmesg | grep -iE 'segfault|traps|oom|killed process'`, run 39089724204,
verbatim):

```
[  236.762896] traps: WPEWebProcess[5307] trap invalid opcode ip:7fb71b13a168 sp:7fff759d3ac0 error:0 in libWPEWebKit-2.0.so.1.12.0[613a168,7fb715808000+5edd000]
[  284.954766] eadedCompositor[5455]: segfault at 0 ip 00007f7419ca0f8a sp 00007f7389ff5ad0 error 4 in libWPEWebKit-2.0.so.1.12.0[60a0f8a,7f7414408000+5edd000] likely on CPU 0 (core 0, socket 0)
[  339.814110] eadedCompositor[5582]: segfault at 0 ip 00007fda1d4a0f8a sp 00007fd98aff6ad0 error 4 in libWPEWebKit-2.0.so.1.12.0[60a0f8a,7fda17c08000+5edd000] likely on CPU 1 (core 0, socket 0)
[  405.064097] eadedCompositor[5739]: segfault at 0 ip 00007f39508a0f8a sp 00007f38beff6ad0 error 4 in libWPEWebKit-2.0.so.1.12.0[60a0f8a,7f394b008000+5edd000] likely on CPU 0 (core 0, socket 0)
[ 1001.431146] eadedCompositor[7017]: segfault at 0 ip 00007fb566aa0f8a sp 00007fb3d3ff7ad0 error 4 in libWPEWebKit-2.0.so.1.12.0[60a0f8a,7fb561208000+5edd000] likely on CPU 1 (core 0, socket 0)
```

`coredumpctl` on the same runner (verbatim, abridged to the crash lines):

```
TIME                         PID  UID  GID SIG     COREFILE EXE                                                                              SIZE
Sun 2026-10-18 02:22:57 UTC 5307 1001 1001 SIGILL  present  /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 56.8M
Sun 2026-10-18 02:23:45 UTC 5433 1001 1001 SIGSEGV present  /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 56.9M
Sun 2026-10-18 02:24:40 UTC 5561 1001 1001 SIGSEGV present  /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 58.2M
Sun 2026-10-18 02:25:46 UTC 5718 1001 1001 SIGSEGV present  /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 59.0M
Sun 2026-10-18 02:35:42 UTC 6996 1001 1001 SIGSEGV present  /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 59.3M
           PID: 6996 (WPEWebProcess)
        Signal: 11 (SEGV)
  Command Line: /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess 4 16
                Stack trace of thread 7017:
                #0  0x00007fb566aa0f8a n/a (/home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/lib/libWPEWebKit-2.0.so.1.12.0 + 0x60a0f8a)
                ELF object binary architecture: AMD x86-64
```

The build ships without symbols, so the stack stops at frame #0. The faulting thread is the compositor thread
(the kernel truncates the name `ThreadedCompositor` to `eadedCompositor`), the address is a read of NULL
(`segfault at 0 … error 4`), and the offset is the same in every SEGV we captured (9 of 9, across 3 runner
instances). The one SIGILL is at `+0x613a168` on the process's main thread. No OOM or `killed process` lines
were logged.

### Additional context

**Frequency.**
- **Normal CI** (full suite of ≈ 72 WebKit tests per job, `retries: 2`, one worker): in the last 40 completed
  WebKit e2e jobs (2026-10-12 → 2026-10-18), **8 of 40 runs (20 %)** had at least one attempt that died this way.
  That was 10 attempts out of 2,903 test executions (≈ 0.34 % per test). Every one passed on retry. Count method:
  we parsed each job's list-reporter failure blocks. An attempt counts when its error is "Target page, context
  or browser has been closed" or "Page crashed" with no "Test timeout of" line in the same block, and a run
  counts once if any attempt did. Normal CI does not capture `dmesg`. These attempts are attributed to the
  segfault because, in the diagnostic runs below, every closed-page failure (10 of 10) matched a core dump one
  to one.
- **Diagnostic runs** (`--retries=0 --repeat-each`, `DEBUG=pw:browser` plus a `dmesg`/`coredumpctl` step): our
  heaviest test (≈ 50 s of animation including a time-scaled phase) crashed in **9 of 36** attempts in the two
  ×18 runs (25 %), and in 1 of 12 in the two ×6 runs. A lighter test in the ×6 runs (60 s of animation) crashed
  0 of 12 there; on normal CI it accounts for 3 of the 10 crashed attempts.
- It happens on two runner image versions (`ubuntu-24.04` 20261004.327.1 and 20261012.334.1).

**What we ruled out.**
- *OffscreenCanvas in a worker* (our first suspicion, cf. WebKit bug 276425): an A/B on the same runner with our
  app's drawing switched between an OffscreenCanvas worker and the main thread gave **6/30 crashed attempts
  (worker) vs 4/30 (main thread)**, with the same `+0x60a0f8a` signature in both arms.
  Runs: worker arm 39088086684 (1/12) and 39089724204 (5/18); main-thread arm 39088922367 (0/12) and
  39090802944 (4/18).
- *Memory exhaustion*: no OOM-killer or `killed process` lines in `dmesg` in any diagnostic run. The core
  files are 45–59 MB.
- *Our page code*: it crashes in tests that share nothing but the animating canvases. One is a single page with
  no iframe and no navigation after load. Others use an iframe, a second page or a bookmark
  restore.
- *macOS*: the same Playwright 1.63.0 WebKit (`webkit-2359`, mac port) never crashed in 20 loaded runs of the
  heaviest test (our diagnosis), nor in 20 runs of the standalone test above (Apple M3, macOS 27.0.1).

**What correlates (and what we have not tested).**
- *Parallel workers*: **no**. The WebKit project runs with `workers: 1`, so it crashes with one test at a time.
  More workers: not tested.
- *Long-running canvas animation*: every crashing test keeps 2-D canvases animating for tens of seconds. The
  rate rises with drawing work: our diagnosis measured about 0.04 crashes per test-minute across the normal
  suite and 0.3–0.5 per test-minute in tests that run the simulation at ×4 speed. Every page in our suite
  animates a canvas, so we cannot say whether animation is *necessary*. Not tested in isolation.
- *Number of pages open*: **not required**. It crashes in a one-page test. Whether more pages raise the rate:
  not tested.
- *Viewport / device*: in one test that runs the same page in two contexts, only the 820×1180
  `isMobile: true, hasTouch: true` context crashed (4 times). The 1280×800 desktop context never did. The
  numbers are small.
- *Before the fault*, our diagnosis saw the page stall for 15–25 s (no frames, `page.evaluate` slow) before the
  process died. We have not re-measured this here.

### Environment

```
OS: Ubuntu 24.04.5 LTS (GitHub-hosted runner image ubuntu-24.04, versions 20261004.327.1 and 20261012.334.1), x64
CPU: GitHub standard Linux runner for a public repository; dmesg shows CPUs 0–3 (2 cores x 2 threads)
Node: 22.23.3
@playwright/test: 1.63.0 (playwright-core 1.63.0)
WebKit: 26.6 (playwright webkit v2359), minibrowser-wpe, libWPEWebKit-2.0.so.1.12.0, headless
Installed with: npx playwright install --with-deps webkit
```
~~~

---

## 4. Evidence pack (not for pasting)

### 4.1 Versions and where each came from

| Item | Value | Source |
|---|---|---|
| `@playwright/test` | 1.63.0 | `package.json` and `pnpm-lock.yaml` (`playwright-core@1.63.0`); `npx playwright --version` → `Version 1.63.0` |
| WebKit build | 26.6, revision 2359 (mac14 overrides to 2251, not our case) | `node_modules/.pnpm/playwright-core@1.63.0/.../browsers.json`; `npx playwright install --dry-run webkit` → `WebKit 26.6 (playwright webkit v2359)`; CI install log `WebKit 26.6 (playwright webkit v2359) downloaded to /home/runner/.cache/ms-playwright/webkit-2359` |
| Library | `libWPEWebKit-2.0.so.1.12.0` (minibrowser-wpe) | `dmesg` and `coredumpctl` in the trial runs |
| Runner OS | Ubuntu 24.04.5 LTS, image `ubuntu-24.04` 20261012.334.1 (31 of the 40 jobs) and 20261004.327.1 (9 of 40) | "Set up job" log of each job |
| Node | 22.23.3 | `actions/setup-node` log ("Found in cache @ /opt/hostedtoolcache/node/22.23.3/x64") |
| Runner CPUs | 4 logical (CPU 3 = core 1) | `dmesg` in run 39090802944 ("likely on CPU 3 (core 1, socket 0)"); repository is public, so `ubuntu-latest` is GitHub's standard runner. Older project notes say "2-vCPU"; these logs show 4 |

### 4.2 CI configuration

- `.github/workflows/ci.yml`, job `e2e` (matrix `chromium`, `webkit`; `runs-on: ubuntu-latest`; 60 min timeout):
  `pnpm exec playwright install --with-deps webkit`, then `pnpm test:e2e --project=webkit --reporter=list,json`.
  An echo-only step, "e2e tests that passed only on retry", lists every test whose JSON status is `flaky`. It
  never fails the job.
- `playwright.config.ts`: `retries: ci ? 2 : 0`; WebKit project `devices['Desktop Safari']`, `workers: 1`.
- The diagnostic branch `trial-ffx1-1-webkit` (deleted after the trial; its runs remain) added `DEBUG=pw:browser`,
  `--retries=0 --repeat-each=N`, a test-only `PME_TEST_MONITOR_WORKER=off` switch for the main-thread arm, and a
  "kernel view of crashes" step (`dmesg`, `/var/crash`, `coredumpctl list`, `coredumpctl info`).

### 4.3 The 40-run count

Every completed `ci` run before 2026-10-18 11:00Z whose `e2e (webkit)` job finished `success` or `failure`, newest
first, excluding the four `trial-ffx1-1-webkit` runs and cancelled e2e jobs: 39116455633 … 38240122427
(2026-10-12 11:02Z → 2026-10-18 09:43Z; main and PR branches). Logs: `gh run view <run> --log --job <job id>`.

| Run | Branch | Crashed attempt(s) (file:line, attempt) | Image |
|---|---|---|---|
| 39116455633 | stage-14 | `pacer-overlay-device-tab.e2e.ts:34` #0 (`page.evaluate`) | 20261012.334.1 |
| 39114675644 | stage-14 | `debrief.e2e.ts:24` #1 (`page.evaluate`) | 20261012.334.1 |
| 39087208007 | design-hosted-relay | `fu11-explore-baseline.e2e.ts:22` #0 (`page.evaluate`) | 20261012.334.1 |
| 39082091200 | main | `stage7d.e2e.ts:36` #0 (`page.waitForFunction`) | 20261012.334.1 |
| 39067635795 | fix-e22-mh-rule | `stage9-a11y.e2e.ts:15` (iPad) #0 (`page.evaluate`), #1 (`page.waitForTimeout: Page crashed`) | 20261012.334.1 |
| 38386662185 | main | `stage9-app.e2e.ts:15` #0 (`page.evaluate`) | 20261004.327.1 |
| 38381261724 | kit-round-a2 | `fu11-explore-baseline.e2e.ts:31` #0 (`page.evaluate`) | 20261004.327.1 |
| 38240178799 | main | `stage7d.e2e.ts:36` #0 and #1 (`page.waitForFunction`) | 20261004.327.1 |

32 runs had none. All 10 crashed attempts passed on a later retry (a `✓ … (retry #1)` or `(retry #2)` line for the same test in
the same job). None was accompanied by "Test timeout of". Test executions: the sum of the
`passed` + `flaky` + `failed` summary lines over the 40 jobs is 2,903. The stage-14 runs carry renamed test files
(`pacer-overlay-device-tab`, `debrief`) from that branch.

The known-flaky survey of 2026-10-11 → 10-18 (99 runs, Stage 14 evidence) classes the same failure mode as
"crash" for eight tests: audit-worker, fu6, showcase-capnogram, stage4b-device 12-lead, stage7d, stage9-a11y iPad,
stage9-app :71, stage9-glossary. `fu11-vent-restore` (the heaviest test) is skipped on CI WebKit because of it.

### 4.4 The diagnostic A/B (trial branch, 2026-10-18)

| Run | Arm | Tests × repeats | Failed | Closed-page | Kernel signal |
|---|---|---|---|---|---|
| 39088086684 | worker (OffscreenCanvas) | vent-restore + stage7d, ×6 | 1/12 | 1 | 1 SEGV `+0x60a0f8a` |
| 39088922367 | main thread (`PME_TEST_MONITOR_WORKER=off`) | vent-restore + stage7d, ×6 | 0/12 | 0 | none |
| 39089724204 | worker (OffscreenCanvas) | vent-restore ×18 | 8/18 | 5 | 4 SEGV `+0x60a0f8a`, 1 SIGILL `+0x613a168` |
| 39090802944 | main thread (`PME_TEST_MONITOR_WORKER=off`) | vent-restore ×18 | 4/18 | 4 | 4 SEGV `+0x60a0f8a` |

In 39089724204, three of the eight failures were the test's own timing assertion
(`expect(received).toBeLessThanOrEqual(expected)`), not crashes. Closed-page failures match kernel signals 10 to
10. Worker arm 6/30 crashed attempts, main-thread arm 4/30, so the OffscreenCanvas suspicion is withdrawn
(ruling of 2026-10-18).

### 4.5 The standalone repro attempt on this Mac

- File: the test in §3, run from the project's Playwright config as a temporary, uncommitted
  `apps/demo/e2e/zz-ffx1-repro.e2e.ts` (WebKit project, one worker, no retries locally).
- Command: `npx playwright test apps/demo/e2e/zz-ffx1-repro.e2e.ts --repeat-each 20 --project=webkit`.
- Machine: Apple M3, 8 cores, macOS 27.0.1; Playwright 1.63.0, `webkit-2359` (the mac port). The machine was
  shared with other work during the run.
- Result: **20 passed, 0 failed, 0 crashes** (`20 passed (15.9m)`, 2026-10-18 11:11–11:27Z; every repeat 45.9–47.0 s, both canvases drawing frames to the end).
- Why this was expected: Playwright's macOS WebKit is a different port, with a different compositor and graphics
  stack, from the Linux WPE build that crashes. A local pass says nothing about whether this file triggers the
  Linux crash. It was not run on CI (outside this draft's scope).

### 4.6 What is open

- Whether the standalone test reproduces on `ubuntu-24.04` (one CI trial would answer it).
- Symbols: the Playwright WebKit build ships stripped. Only the maintainers can map `+0x60a0f8a` / `+0x613a168` to
  functions.
- Re-measure on the next Playwright WebKit build. If the rate drops to zero, close F-FX1-1 and lift the CI-only
  WebKit skip of `fu11-vent-restore`. Until then, retries cover it, and the known-flaky list names the class.
