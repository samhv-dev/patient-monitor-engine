// Brief 194 (b): a context and a page a test opens and leaves open are closed when that test ends (the fixture in
// evidence.ts), so the next test starts without them. The first test leaves both open on purpose; the second fails if
// either is still open. No app, no server: two blank pages. Since brief 236 a test that leaves one open FAILS (the
// fixture names the line that opened it), so the first test is marked as one that must fail.
import { expect, test, type BrowserContext, type Page } from './evidence.ts';

test.describe.configure({ mode: 'serial' });
let left: { ctx: BrowserContext; page: Page; other: Page } | null = null;

test('a test that leaves its own context and an extra page open', async ({ browser, page }) => {
  test.fail(); // the fixture fails it after closing what it left (brief 236)
  const ctx = await browser.newContext();
  const other = await page.context().newPage(); // a second page in the test's own context: closed with it
  left = { ctx, page: await ctx.newPage(), other };
  await left.page.setContent('<p>left open</p>');
  expect(browser.contexts()).toContain(ctx); // still open while the test runs
});

test('the next test starts with none of them open', async ({ browser }) => {
  expect(left, 'the first test ran').not.toBeNull();
  expect(browser.contexts()).not.toContain(left?.ctx);
  expect(left?.page.isClosed()).toBe(true);
  expect(left?.other.isClosed()).toBe(true);
});
