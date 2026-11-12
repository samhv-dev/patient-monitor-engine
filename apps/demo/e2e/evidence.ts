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
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
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

/**
 * Brief 194 (b): what a test opened is closed when it ends. A context created during the test (browser.newContext,
 * directly or in a helper) and still open after its afterEach hooks is closed, and so is a page the test opened in a
 * context that existed before it (one from a beforeAll); a context or page that existed when the test started (opened
 * by beforeAll, kept on purpose for the file) is left alone. Before this, a test that ended without closing its own
 * contexts (any test that failed before its `ctx.close()`, and several that never close them) left them running in the
 * worker's browser for every later test: follower pages reconnecting to relays that had closed, engines still ticking.
 * Not tracked: contexts of another browser the test launched itself (chromium.launch, launchPersistentContext), and
 * what a beforeAll opens (its file's afterAll owns it).
 * PME_E2E_LEAKS=keep leaves them open (to measure the old behaviour); PME_E2E_LEAK_LOG=<dir> writes one JSON line per
 * test that left something open (leaks-<worker>.jsonl), with each page's state when PME_E2E_LEAKS=keep.
 */
const leakLog = (testInfo: TestInfo, row: Record<string, unknown>) => {
  const dir = process.env.PME_E2E_LEAK_LOG;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `leaks-${testInfo.parallelIndex}-${process.pid}.jsonl`), JSON.stringify(row) + '\n');
};

/** Contexts a finished test left open in this worker (closing failed, or PME_E2E_LEAKS=keep); the next test fails on one. */
const leftByEarlierTests = new Set<BrowserContext>();

async function tidy(browser: Browser, earlier: Set<BrowserContext>, earlierPages: Set<Page>, testInfo: TestInfo): Promise<void> {
  const contexts = browser.contexts().filter((c) => !earlier.has(c));
  const pages = [...contexts.flatMap((c) => c.pages()), ...[...earlier].flatMap((c) => c.pages()).filter((p) => !earlierPages.has(p))];
  if (contexts.length === 0 && pages.length === 0) return;
  const keep = process.env.PME_E2E_LEAKS === 'keep';
  const state = keep && process.env.PME_E2E_LEAK_LOG
    ? await Promise.all(pages.map((p) => timed(p.evaluate(readCounters), 1500, 'read').then((r) => ({
        role: r.role, pill: (r.statusPills as string[])[0] ?? null, frames: (r.frames as { count: number } | null)?.count ?? null,
        link: ((r.follower as { link?: unknown } | null)?.link ?? (r.host as { relay?: unknown } | null)?.relay ?? null),
        simNow: (r.host as { simNow?: number } | null)?.simNow ?? null,
      }), (e) => ({ error: String(e).slice(0, 120) }))))
    : [];
  leakLog(testInfo, {
    file: testInfo.titlePath[0], title: testInfo.titlePath.slice(1).join(' › '), retry: testInfo.retry, status: testInfo.status,
    contexts: contexts.length, pages: pages.length, openInWorker: browser.contexts().length, closed: !keep,
    urls: pages.map((p, i) => ({ url: p.url().replace(/^https?:\/\/[^/]+/, ''), ...(state[i] ?? {}) })),
  });
  if (keep) return void contexts.forEach((c) => leftByEarlierTests.add(c));
  await Promise.all([
    ...contexts.map((c) => c.close({ reason: 'the test that opened it has ended (apps/demo/e2e/evidence.ts)' }).catch(() => undefined)),
    ...pages.filter((p) => !contexts.includes(p.context())).map((p) => p.close().catch(() => undefined)),
  ]);
  for (const c of contexts) if (browser.contexts().includes(c)) leftByEarlierTests.add(c);
}

export const test = base.extend<{ _evidence: void }>({
  _evidence: [
    async ({ browser }, use, testInfo) => {
      const earlier = new Set(browser.contexts());
      const earlierPages = new Set([...earlier].flatMap((c) => c.pages()));
      // A page of a finished test still open here means the tidy-up below did not run or failed (brief 194 (b))
      const stale = [...leftByEarlierTests].filter((c) => browser.contexts().includes(c));
      if (stale.length && process.env.PME_E2E_LEAKS !== 'keep') throw new Error(`${stale.length} browser context(s) of a finished test still open at the start of this one`);
      const on = evidenceOn();
      let done: Promise<void> | null = null;
      const capture = () => (done ??= collect(browser, earlier, testInfo).catch((e) => void testInfo.annotations.push({ type: 'evidence', description: `not written: ${String(e)}` })));
      // At the end of the test function, before afterEach hooks (Playwright's own failure screenshot runs at the same
      // point); Playwright 1.63 exposes no public hook there, so the fixture teardown below is the fallback
      const hooks = (testInfo as unknown as { _onDidFinishTestFunctionCallbacks?: Set<() => Promise<void>> })._onDidFinishTestFunctionCallbacks;
      const atEnd = async () => void (on && failed(testInfo) && (await capture()));
      hooks?.add(atEnd);
      await use();
      hooks?.delete(atEnd);
      await atEnd();
      // after the evidence and after afterEach hooks: what this test opened is closed
      await tidy(browser, earlier, earlierPages, testInfo);
    },
    { auto: true, box: true, timeout: 30_000 },
  ],
});
