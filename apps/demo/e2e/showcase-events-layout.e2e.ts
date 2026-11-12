// Showcase hotfix (rehearsal 2026-10-04): Instructor → Patient → Acute events (Instructor v2's Patient sheet). Each row's empty state chip drew a box
// over the description (it read as a checkbox) because the description sat in the narrow value column. Now the name
// and chip, the description and the controls are three rows that never overlap, idle or running, at 1280×800 and
// 1024×768. With PME_SHOTS=1 (Chromium) it writes the gate screenshots to docs/gates/showcase-hotfix/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { shot8 } from './indexed-png.ts';
import { deliver, openApp, sheet, startVite, tab, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/showcase-hotfix');
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

/** Pairs of boxes inside one event row that intersect (label/chip vs description vs controls). */
function overlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hit = (a: DOMRect, b: DOMRect) => a.width > 0 && b.width > 0 && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const bad: string[] = [];
    for (const row of document.querySelectorAll<HTMLElement>('.param.event')) {
      const parts: Array<[string, Element | null]> = [['name', row.querySelector('.lbl b')], ['chip', row.querySelector('.lbl .chip')], ['description', row.querySelector(':scope > .hint')], ['controls', row.querySelector('.edit')]];
      const boxes = parts.filter(([, el]) => el).map(([n, el]) => [n, (el as Element).getBoundingClientRect()] as const);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const [na, a] = boxes[i]!;
        const [nb, b] = boxes[j]!;
        if (hit(a, b)) bad.push(`${row.dataset.event}: ${na} overlaps ${nb}`);
      }
    }
    return bad;
  });
}

// Instructor v2 is laid out for 1280 × 720 and up: 1280 × 800 runs on its Patient sheet; a tablet (1024 × 768) uses
// the Remote, which keeps today's panel until the phone layout (retire-instructor-v1 Q5), paired to the host by code.
for (const [w, h, on] of [[1280, 800, 'teach2'], [1024, 768, 'remote']] as const) {
  test(`acute events: name, state, description and controls do not overlap at ${w}×${h}`, async ({ page: host, browserName }) => {
    await host.setViewportSize({ width: w, height: h });
    await openApp(host, base, on === 'teach2' ? TEACH2 : '#/', { warmMs: process.env.PME_SHOTS ? 6000 : 1000 }); // shots: the monitor's numbers drawn
    let page: Page = host;
    let commit: () => Promise<void>;
    if (on === 'teach2') {
      await sheet(page, 'patient');
      commit = () => deliver(page);
    } else {
      const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
      page = await host.context().newPage();
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${base}/#/remote?code=${code}`);
      await expect(page.locator('.status-pill')).toHaveText(`Connected to ${code}`, { timeout: 10_000 });
      await tab(page, 'patient');
      commit = () => page.locator('.stagebar button.primary').click(); // Commit
    }
    expect(await page.locator('.param.event').count()).toBeGreaterThanOrEqual(4);
    expect(await overlaps(page)).toEqual([]);
    // running: the chip carries text ("Running: severe") and still stays clear of the description
    await page.locator('[data-event=tamponade] button', { hasText: 'Start' }).click();
    await commit();
    await expect(page.locator('[data-event=tamponade] .chip')).toContainText('Running', { timeout: 10_000 });
    expect(await overlaps(page)).toEqual([]);
    if (process.env.PME_SHOTS && browserName === 'chromium') {
      mkdirSync(out, { recursive: true });
      await page.locator('.events').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      let buf = await shot8(page, 1);
      if (buf.length > 60 * 1024) buf = await shot8(page, 0.8);
      writeFileSync(`${out}/acute-events-${w}x${h}.png`, buf);
      expect(buf.length).toBeLessThanOrEqual(60 * 1024);
    }
  });
}
