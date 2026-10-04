// Showcase hotfix (rehearsal 2026-10-04): Instructor → Patient → Acute events. Each row's empty state chip drew a box
// over the description (it read as a checkbox) because the description sat in the narrow value column. Now the name
// and chip, the description and the controls are three rows that never overlap, idle or running, at 1280×800 and
// 1024×768. With PME_SHOTS=1 (Chromium) it writes the gate screenshots to docs/gates/showcase-hotfix/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './stage9-png8.ts';
import { openApp, startVite, tab } from './stage9-support.ts';

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

for (const [w, h] of [[1280, 800], [1024, 768]] as const) {
  test(`acute events: name, state, description and controls do not overlap at ${w}×${h}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '#/teach', { warmMs: process.env.PME_SHOTS ? 6000 : 1000 }); // shots: the monitor's numbers drawn
    await tab(page, 'patient');
    expect(await page.locator('.param.event').count()).toBeGreaterThanOrEqual(4);
    expect(await overlaps(page)).toEqual([]);
    // running: the chip carries text ("Running: severe") and still stays clear of the description
    await page.locator('[data-event=tamponade] button', { hasText: 'Start' }).click();
    await page.locator('.stagebar button.primary').click(); // Commit
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
