// Brief 194: the evidence of a failed attempt, from EVERY page the test had open. Every e2e spec imports `test` (and
// whatever else it needs from Playwright) from here instead of '@playwright/test'; the export is Playwright's own with
// one auto fixture added (packages/validation/test/e2e-evidence.test.ts keeps every spec on it).
//
// When an attempt fails (an error, a time-out), at the end of the test function (before afterEach hooks, which may close
// a relay the pages depend on), this writes into the attempt's output folder, for each page of each browser context
// still open:
//   evidence/<n>-<role>.json         the application's own diagnostic counters, read twice 1 s apart (what still moves),
//                                    with the page's URL, visibility, focus and status lines; on a ventilator face page
//                                    (or a page that frames one) what its knob holds (window.__pmeVentFace, brief 236);
//                                    and the input events the page received (below)
//   evidence/<n>-<role>.console.txt  the page's console (Playwright keeps the last 200 messages) and its page errors
//   evidence/index.json              the pages, and any page that could not be read and why
// The Playwright trace of the same attempt (every context, merged by Playwright into trace.zip) comes from the config's
// `trace` option (playwright.config.ts). A passing attempt does nothing here: no read, no file.
//
// While on, every context gets an init script that records, in each frame, the last 300 pointer, click, wheel and key
// events that reached the frame's window (capture phase, passive: it changes nothing), so a failure shows whether the
// test's clicks and wheel turns arrived (brief 236).
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
    __vent?: unknown;
    __pmeVentFace?: () => unknown;
    __pmeInputs?: Array<{ type: string; on: string; atMs: number; trusted: boolean }>;
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
  const inputs = (x: W) => x.__pmeInputs ? { count: x.__pmeInputs.length, last: x.__pmeInputs.slice(-80).map((e) => ({ type: e.type, on: e.on, agoMs: Math.round(now - e.atMs), trusted: e.trusted })) } : null;
  const framed = [...document.querySelectorAll('iframe')].map((fr) => {
    try {
      const x = fr.contentWindow as unknown as W | null;
      return x && (x.__pmeVentFace || x.__pmeInputs) ? { frame: fr.id || fr.src, ventFace: x.__pmeVentFace ? x.__pmeVentFace() : null, inputs: inputs(x) } : null;
    } catch (e) {
      return { frame: fr.id || fr.src, error: String(e) };
    }
  }).filter((x) => x !== null);
  return {
    url: location.href,
    title: document.title,
    wallTime: new Date().toISOString(),
    perfNowMs: Math.round(now),
    visibility: document.visibilityState,
    focus: document.hasFocus(),
    role: s ? 'host' : f ? 'follower' : w.__pmeLearnerRemote ? 'learner-remote' : app ? 'app' : w.__vent ? 'vent' : 'page',
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
    ventFace: w.__pmeVentFace ? await safe(() => w.__pmeVentFace!()) : null,
    inputs: inputs(w),
    framedPages: framed.length ? framed : null,
  };
}

/** In every frame of every context while evidence is on: the input events that reached the frame's window. */
function recordInputs(): void {
  const log: Array<{ type: string; on: string; atMs: number; trusted: boolean }> = [];
  Object.defineProperty(window, '__pmeInputs', { value: log, configurable: true });
  const on = (e: Event) => {
    const t = e.target instanceof Element ? e.target : null;
    const ctl = t?.closest('[data-ctl]')?.getAttribute('data-ctl');
    return ctl ?? (t ? `${t.tagName.toLowerCase()}${typeof t.className === 'string' && t.className ? `.${t.className.trim().split(/\s+/)[0]}` : ''}` : String(e.target));
  };
  for (const type of ['pointerdown', 'pointerup', 'click', 'wheel', 'keydown']) {
    addEventListener(type, (e) => {
      log.push({ type, on: on(e), atMs: e.timeStamp, trusted: e.isTrusted });
      if (log.length > 300) log.splice(0, log.length - 300);
    }, { capture: true, passive: true });
  }
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
 * Brief 236: a test that would otherwise PASS and leaves one open FAILS after the tidy-up, naming the test and the lines
 * that opened each context or page (the fixture wraps browser.newContext / newPage, and newPage of the contexts that
 * existed before the test, for the length of the test). A test that failed or was skipped is only tidied: its own error
 * is the finding, and it usually failed before its close. A test that leaves one open ON PURPOSE (evidence-tidy.e2e.ts,
 * which proves the tidy-up) says so with the annotation { type: 'leaves-open' }: it is tidied and logged, never failed.
 * apps/demo/e2e/proof/leak-and-vent-evidence.proof.ts shows the failure.
 * PME_E2E_LEAKS=keep leaves them open (to measure the old behaviour) and fails nothing; PME_E2E_LEAK_LOG=<dir> writes one
 * JSON line per test that left something open (leaks-<worker>.jsonl), with each page's state when PME_E2E_LEAKS=keep.
 */
const leakLog = (testInfo: TestInfo, row: Record<string, unknown>) => {
  const dir = process.env.PME_E2E_LEAK_LOG;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `leaks-${testInfo.parallelIndex}-${process.pid}.jsonl`), JSON.stringify(row) + '\n');
};

/** Contexts a finished test left open in this worker (closing failed, or PME_E2E_LEAKS=keep); the next test fails on one. */
const leftByEarlierTests = new Set<BrowserContext>();

/** Where the test opened a context or page: the call's frames in apps/demo/e2e (this file left out), innermost first. */
function openedAt(): string {
  const at = (new Error().stack ?? '').split('\n').slice(1)
    .map((l) => /([^\s(]*\/apps\/demo\/e2e\/[^\s():]+):(\d+):\d+/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null && !m[1]!.endsWith('/evidence.ts'))
    .map((m) => `${m[1]!.split('/apps/demo/e2e/')[1]}:${m[2]}`);
  return at.length ? [...new Set(at)].slice(0, 3).join(' ← ') : 'a line outside apps/demo/e2e';
}

/** Contexts and pages opened during the current test, with the lines that opened them. */
const openedBy = new Map<BrowserContext | Page, string>();
/** Contexts that already carry the input recorder. */
const recording = new WeakSet<BrowserContext>();
const record = async (c: BrowserContext) => {
  if (!evidenceOn() || recording.has(c)) return;
  recording.add(c);
  await c.addInitScript(recordInputs);
};

/** For the length of the test: what the test opens is recorded with its line, and new contexts carry the recorder. */
function watchOpening(browser: Browser, earlier: Set<BrowserContext>): () => void {
  type Fn = (...a: never[]) => Promise<unknown>;
  const undo: Array<() => void> = [];
  const wrap = <T extends object>(o: T, name: 'newContext' | 'newPage', after: (made: BrowserContext | Page) => Promise<void>) => {
    const own = Object.prototype.hasOwnProperty.call(o, name);
    const real = (o as Record<string, Fn>)[name]!;
    (o as Record<string, Fn>)[name] = async function (this: unknown, ...a: never[]) {
      const at = openedAt();
      const made = (await real.apply(this, a)) as BrowserContext | Page;
      if (!openedBy.has(made)) openedBy.set(made, at);
      await after(made);
      return made;
    };
    undo.push(() => (own ? ((o as Record<string, Fn>)[name] = real) : delete (o as Record<string, Fn>)[name]));
  };
  wrap(browser, 'newContext', (c) => record(c as BrowserContext));
  wrap(browser, 'newPage', async () => undefined);
  for (const c of earlier) wrap(c, 'newPage', async () => undefined);
  return () => {
    for (const u of undo.reverse()) u();
    openedBy.clear();
  };
}

const passed = (t: TestInfo) => !failed(t) && t.status !== 'skipped';
const onPurpose = (t: TestInfo) => t.annotations.some((a) => a.type === 'leaves-open');

async function tidy(browser: Browser, earlier: Set<BrowserContext>, earlierPages: Set<Page>, testInfo: TestInfo): Promise<string[]> {
  const contexts = browser.contexts().filter((c) => !earlier.has(c));
  const pages = [...contexts.flatMap((c) => c.pages()), ...[...earlier].flatMap((c) => c.pages()).filter((p) => !earlierPages.has(p))];
  if (contexts.length === 0 && pages.length === 0) return [];
  // each leftover as the test made it: a context with its pages, or a page alone in a context opened before the test
  const left = [
    ...contexts.map((c) => `a browser context opened at ${openedBy.get(c.pages()[0] ?? c) ?? openedBy.get(c) ?? 'an unrecorded line'}${c.pages().length ? ` (${c.pages().map((p) => p.url().replace(/^https?:\/\/[^/]+/, '')).join(', ')})` : ''}`),
    ...pages.filter((p) => !contexts.includes(p.context())).map((p) => `a page opened at ${openedBy.get(p) ?? 'an unrecorded line'} (${p.url().replace(/^https?:\/\/[^/]+/, '')})`),
  ];
  const keep = process.env.PME_E2E_LEAKS === 'keep';
  const state = keep && process.env.PME_E2E_LEAK_LOG
    ? await Promise.all(pages.map((p) => timed(p.evaluate(readCounters), 1500, 'read').then((r) => ({
        role: r.role, pill: (r.statusPills as string[])[0] ?? null, frames: (r.frames as { count: number } | null)?.count ?? null,
        link: ((r.follower as { link?: unknown } | null)?.link ?? (r.host as { relay?: unknown } | null)?.relay ?? null),
        simNow: (r.host as { simNow?: number } | null)?.simNow ?? null,
      }), (e) => ({ error: String(e).slice(0, 120) }))))
    : [];
  leakLog(testInfo, {
    file: testInfo.titlePath[0], title: testInfo.titlePath.slice(1).join(' › '), retry: testInfo.retry, status: testInfo.status, ...(onPurpose(testInfo) ? { onPurpose: true } : passed(testInfo) && !keep ? { failsTheTest: true } : {}),
    contexts: contexts.length, pages: pages.length, openInWorker: browser.contexts().length, closed: !keep,
    urls: pages.map((p, i) => ({ url: p.url().replace(/^https?:\/\/[^/]+/, ''), ...(state[i] ?? {}) })),
    openedAt: left,
  });
  if (keep) {
    contexts.forEach((c) => leftByEarlierTests.add(c));
    return [];
  }
  await Promise.all([
    ...contexts.map((c) => c.close({ reason: 'the test that opened it has ended (apps/demo/e2e/evidence.ts)' }).catch(() => undefined)),
    ...pages.filter((p) => !contexts.includes(p.context())).map((p) => p.close().catch(() => undefined)),
  ]);
  for (const c of contexts) if (browser.contexts().includes(c)) leftByEarlierTests.add(c);
  return left;
}

export const test = base.extend<{ _evidence: void }>({
  // the page fixture's own context records its inputs too (when it was not already made through the wrapper below)
  context: async ({ context }, use) => {
    await record(context);
    await use(context);
  },
  _evidence: [
    async ({ browser }, use, testInfo) => {
      const earlier = new Set(browser.contexts());
      const earlierPages = new Set([...earlier].flatMap((c) => c.pages()));
      // A page of a finished test still open here means the tidy-up below did not run or failed (brief 194 (b))
      const stale = [...leftByEarlierTests].filter((c) => browser.contexts().includes(c));
      if (stale.length && process.env.PME_E2E_LEAKS !== 'keep') throw new Error(`${stale.length} browser context(s) of a finished test still open at the start of this one`);
      const on = evidenceOn();
      const unwatch = watchOpening(browser, earlier);
      let done: Promise<void> | null = null;
      const capture = () => (done ??= collect(browser, earlier, testInfo).catch((e) => void testInfo.annotations.push({ type: 'evidence', description: `not written: ${String(e)}` })));
      // At the end of the test function, before afterEach hooks (Playwright's own failure screenshot runs at the same
      // point); Playwright 1.63 exposes no public hook there, so the fixture teardown below is the fallback
      const hooks = (testInfo as unknown as { _onDidFinishTestFunctionCallbacks?: Set<() => Promise<void>> })._onDidFinishTestFunctionCallbacks;
      const atEnd = async () => void (on && failed(testInfo) && (await capture()));
      hooks?.add(atEnd);
      let left: string[];
      try {
        await use();
        hooks?.delete(atEnd);
        await atEnd();
        // after the evidence and after afterEach hooks: what this test opened is closed
        left = await tidy(browser, earlier, earlierPages, testInfo);
      } finally {
        unwatch();
      }
      // brief 236: a passing test that left something open fails, with the lines that opened it
      if (left.length && passed(testInfo) && !onPurpose(testInfo)) {
        throw new Error(`"${testInfo.titlePath.slice(1).join(' › ')}" ended with ${left.length} thing(s) it opened still open (closed now by apps/demo/e2e/evidence.ts); close each before the test ends:\n${left.map((l) => `  - ${l}`).join('\n')}`);
      }
    },
    { auto: true, box: true, timeout: 30_000 },
  ],
});
