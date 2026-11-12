// Brief 194: the evidence of a failed attempt, from EVERY page the test had open. Every e2e spec imports `test` (and
// whatever else it needs from Playwright) from here instead of '@playwright/test'; the export is Playwright's own with
// one auto fixture added (packages/validation/test/e2e-evidence.test.ts keeps every spec on it).
//
// When an attempt fails (an error, a time-out), at the end of the test function (before afterEach hooks, which may close
// a relay the pages depend on), this writes into the attempt's output folder, for each page of each browser context
// still open:
//   evidence/<n>-<role>.json         the application's own diagnostic counters, read twice 1 s apart (what still moves),
//                                    with the page's URL, visibility, focus and status lines
//   evidence/<n>-<role>.console.txt  the page's console (Playwright keeps the last 200 messages) and its page errors
//   evidence/index.json              the pages, and any page that could not be read and why
// The Playwright trace of the same attempt (every context, merged by Playwright into trace.zip) comes from the config's
// `trace` option (playwright.config.ts). A passing attempt does nothing here: no read, no file.
//
// On by default in CI; PME_E2E_EVIDENCE=1 turns it on locally, PME_E2E_EVIDENCE=0 off (also in CI).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';

export * from '@playwright/test';

export const evidenceOn = (): boolean => (process.env.PME_E2E_EVIDENCE ? process.env.PME_E2E_EVIDENCE === '1' : !!process.env.CI);

const READ_MS = 3000; // one read of one page; a page whose main thread is stuck answers nothing [ENG: test]
const APART_MS = 1000; // the second read, to show what still advances [ENG: test]

/** In the page: the application's own diagnostic surfaces (window.__pmeApp, __pmeFollower, __pmeLearnerRemote), as JSON. */
async function readCounters(): Promise<Record<string, unknown>> {
  type Link = { status?: string; sentCount?: number; receivedCount?: number; rejected?: number; lastSentAt?: number | null; lastReceivedAt?: number | null; reconnects?: number; relayFrames?: number; lastHeardAt?: number | null; lastClose?: { code: number; reason: string; at: number } | null };
  type Mon = { renderPath?: Promise<string>; behindS?(): number; viewerClock?(): Promise<{ renderT(): number }> };
  type W = {
    __pmeApp?: { frames?: number[]; session?: { code?: string; simNow?(): number; host?: { stats?: object }; followers?: number; devices?: unknown[] | null; relay?: Link | null; bc?: Link; diag?: object; monitor?: Mon | null; last?: Record<string, { t?: number }> } };
    __pmeFollower?: { peerId?: string; transport?: Link; monitor?: Mon; sync?: { status?: string; resyncs?: number; lagS?: number; beatDriftMs?: number; fastForward?: unknown } | null };
    __pmeLearnerRemote?: unknown;
  };
  const w = window as unknown as W;
  const now = performance.now();
  const ago = (x: number | null | undefined) => (typeof x === 'number' ? Math.round(now - x) : null);
  const within = <T,>(p: Promise<T> | undefined): Promise<T | 'no answer in 500 ms' | null> => (p ? Promise.race([p, new Promise<'no answer in 500 ms'>((r) => setTimeout(() => r('no answer in 500 ms'), 500))]) : Promise.resolve(null));
  const safe = async <T,>(f: () => T | Promise<T>): Promise<T | { error: string }> => {
    try {
      return await f();
    } catch (e) {
      return { error: String(e) };
    }
  };
  const link = (t: Link | null | undefined) => t && {
    status: t.status, sent: t.sentCount, received: t.receivedCount, rejected: t.rejected, sentAgoMs: ago(t.lastSentAt), receivedAgoMs: ago(t.lastReceivedAt),
    ...(t.reconnects !== undefined ? { reconnects: t.reconnects, relayFrames: t.relayFrames, heardAgoMs: ago(t.lastHeardAt), lastClose: t.lastClose ? { code: t.lastClose.code, reason: t.lastClose.reason, agoMs: ago(t.lastClose.at) } : null } : {}),
  };
  const monitor = async (m: Mon | null | undefined) => m && {
    renderPath: await within(m.renderPath),
    behindS: m.behindS?.(),
    // a follower's own clock (the host's monitor has none: its clock is the session's simNow)
    renderT: await within(Promise.resolve().then(() => m.viewerClock?.()).then((c) => c?.renderT() ?? null)).catch(() => null),
  };
  const app = w.__pmeApp;
  const s = app?.session;
  const f = w.__pmeFollower;
  return {
    url: location.href,
    title: document.title,
    wallTime: new Date().toISOString(),
    perfNowMs: Math.round(now),
    visibility: document.visibilityState,
    focus: document.hasFocus(),
    role: s ? 'host' : f ? 'follower' : w.__pmeLearnerRemote ? 'learner-remote' : app ? 'app' : 'page',
    statusPills: [...document.querySelectorAll('.status-pill')].map((e) => e.textContent),
    toasts: [...document.querySelectorAll('.toast')].map((e) => e.textContent),
    frames: app?.frames ? { count: app.frames.length, lastIntervalsMs: app.frames.slice(-10).map((x) => Math.round(x)) } : null,
    host: s ? await safe(async () => ({
      code: s.code, simNow: s.simNow?.(), stats: { ...s.host?.stats }, followers: s.followers, devices: s.devices?.length ?? null,
      relay: link(s.relay), channel: link(s.bc), channelReceived: s.diag,
      lastEventT: Object.fromEntries(Object.entries(s.last ?? {}).map(([k, e]) => [k, e?.t])),
      monitor: await monitor(s.monitor),
    })) : null,
    follower: f ? await safe(async () => ({
      peerId: f.peerId,
      sync: f.sync ? { status: f.sync.status, resyncs: f.sync.resyncs, lagS: f.sync.lagS, beatDriftMs: f.sync.beatDriftMs, fastForward: f.sync.fastForward } : null,
      link: link(f.transport),
      monitor: await monitor(f.monitor),
    })) : null,
  };
}

const timed = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what}: no answer in ${ms} ms`)), ms))]);

const failed = (t: TestInfo) => t.errors.length > 0 || (t.status !== undefined && t.status !== 'skipped' && t.status !== t.expectedStatus);

/** Write the evidence of every open page into `evidence/` of this attempt, and list each file as an attachment. */
async function collect(browser: Browser, earlier: Set<BrowserContext>, testInfo: TestInfo): Promise<void> {
  const dir = testInfo.outputPath('evidence');
  mkdirSync(dir, { recursive: true });
  const pages: Array<{ page: Page; context: number; earlier: boolean }> = [];
  browser.contexts().forEach((c, i) => c.pages().forEach((page) => pages.push({ page, context: i, earlier: earlier.has(c) })));
  const index: Array<Record<string, unknown>> = [];
  const attach = (name: string, file: string, contentType: string) => testInfo.attachments.push({ name, path: file, contentType });
  // All pages at once, so every page's first read is the same moment
  const firsts = await Promise.allSettled(pages.map(({ page }) => timed(page.evaluate(readCounters), READ_MS, 'first read')));
  await new Promise((r) => setTimeout(r, APART_MS));
  const seconds = await Promise.allSettled(pages.map(({ page }) => timed(page.evaluate(readCounters), READ_MS, 'second read')));
  for (const [n, { page, context, earlier: old }] of pages.entries()) {
    const a = firsts[n] as PromiseSettledResult<Record<string, unknown>>;
    const b = seconds[n] as PromiseSettledResult<Record<string, unknown>>;
    const role = a.status === 'fulfilled' ? String(a.value.role) : 'unread';
    const stem = `${n + 1}-${role}`;
    const out = (r: PromiseSettledResult<Record<string, unknown>>) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) });
    const counters = { page: n + 1, context, openedBeforeThisTest: old, url: page.url(), closed: page.isClosed(), atFailure: out(a), oneSecondLater: out(b) };
    writeFileSync(join(dir, `${stem}.json`), JSON.stringify(counters, null, 1));
    attach(`evidence ${stem} counters`, join(dir, `${stem}.json`), 'application/json');
    let lines: string[];
    try {
      const [msgs, errors] = await timed(Promise.all([page.consoleMessages(), page.pageErrors()]), READ_MS, 'console');
      lines = [
        ...msgs.map((m) => `${m.type()}\t${m.text()}${m.location().url ? `\t(${m.location().url}:${m.location().lineNumber})` : ''}`),
        ...errors.map((e) => `pageerror\t${e.stack ?? e.message}`),
      ];
    } catch (e) {
      lines = [`(console not read: ${String(e)})`];
    }
    writeFileSync(join(dir, `${stem}.console.txt`), `${page.url()}\n${lines.join('\n')}\n`);
    attach(`evidence ${stem} console`, join(dir, `${stem}.console.txt`), 'text/plain');
    index.push({ file: stem, context, url: page.url(), role, read: a.status === 'fulfilled', consoleLines: lines.length });
  }
  writeFileSync(join(dir, 'index.json'), JSON.stringify({ test: testInfo.titlePath.join(' › '), attempt: testInfo.retry, status: testInfo.status, contexts: browser.contexts().length, pages: index }, null, 1));
}

export const test = base.extend<{ _evidence: void }>({
  _evidence: [
    async ({ browser }, use, testInfo) => {
      if (!evidenceOn()) return use();
      const earlier = new Set(browser.contexts());
      let done: Promise<void> | null = null;
      const capture = () => (done ??= collect(browser, earlier, testInfo).catch((e) => void testInfo.annotations.push({ type: 'evidence', description: `not written: ${String(e)}` })));
      // At the end of the test function, before afterEach hooks (Playwright's own failure screenshot runs at the same
      // point); Playwright 1.63 exposes no public hook there, so the fixture teardown below is the fallback
      const hooks = (testInfo as unknown as { _onDidFinishTestFunctionCallbacks?: Set<() => Promise<void>> })._onDidFinishTestFunctionCallbacks;
      const atEnd = async () => void (failed(testInfo) && (await capture()));
      hooks?.add(atEnd);
      await use();
      hooks?.delete(atEnd);
      await atEnd();
    },
    { auto: true, box: true, timeout: 30_000 },
  ],
});
