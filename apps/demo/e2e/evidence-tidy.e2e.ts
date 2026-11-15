// Brief 194 (b): a context and a page a test opens and leaves open are closed when that test ends (the fixture in
// evidence.ts), so the next test starts without them. The first test leaves both open on purpose; the second fails if
// either is still open. No app, no server: two blank pages. A test that leaves one open fails (the
// fixture names the line that opened it; apps/demo/e2e/proof/leak-and-vent-evidence.proof.ts shows it), so the first
// test says it leaves them open on purpose.
import { expect, test, type BrowserContext, type Page } from './evidence.ts';

test.describe.configure({ mode: 'serial' });
let left: { ctx: BrowserContext; page: Page; other: Page } | null = null;

test('a test that leaves its own context and an extra page open', async ({ browser, page }) => {
  test.info().annotations.push({ type: 'leaves-open', description: 'on purpose: the next test checks they were closed' });
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
