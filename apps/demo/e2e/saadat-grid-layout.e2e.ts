// rc.3 PR-G (plan G3, review G-2; Review Focus 1): the saadat-like screen layout lives partly in mountMonitor's place()
// — the header in the wave column, the wave column at 64.1 % of the width, the bottom strip — which happy-dom cannot
// lay out. A Settings switch saadat-like → philips-like → saadat-like must give the columns layout back (full-width
// header, no strip, the canvas beside 180 px tile columns) and then the grid again, with nothing left over.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { go, openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.use({ viewport: { width: 1280, height: 800 } });

const box = (page: Page) =>
  page.evaluate(() => {
    const r = (s: string) => {
      const e = document.querySelector(s);
      if (!e || (e as HTMLElement).offsetParent === null) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return {
      host: r('.stage > .monitor-host'), hdr: r('.pme-hdr'), canvas: r('canvas[data-lanes]'), strip: r('.pme-strip'), tiles: r('.pme-grid'),
      fields: document.querySelectorAll('.pme-sfield').length, hr: document.querySelectorAll('.pme-stile[data-param="HR"]').length,
      spo2: document.querySelectorAll('.pme-stile[data-param="SpO2"]').length,
    };
  });

async function monitor(page: Page, skin: string): Promise<void> {
  await go(page, '#/settings');
  await page.getByRole('combobox', { name: 'Monitor', exact: true }).selectOption(skin);
  await go(page, '#/monitor', 1500);
}

function expectGrid(b: Awaited<ReturnType<typeof box>>): void {
  const host = b.host as NonNullable<typeof b.host>;
  const canvas = b.canvas as NonNullable<typeof b.canvas>;
  const strip = b.strip as NonNullable<typeof b.strip>;
  const hdr = b.hdr as NonNullable<typeof b.hdr>;
  expect(Math.abs(canvas.w / host.w - 0.641)).toBeLessThan(0.01); // the wave column (NOTES.md 64.1 %)
  expect(Math.abs(strip.h / host.h - 0.145)).toBeLessThan(0.01); // the strip (NOTES.md 14.5 %)
  expect(strip.w).toBeCloseTo(host.w, 0);
  expect(hdr.w).toBeCloseTo(canvas.w, 0); // the header spans the wave column only (D5) …
  expect(hdr.y).toBeCloseTo(host.y, 0);
  expect((b.tiles as NonNullable<typeof b.tiles>).y).toBeCloseTo(host.y, 0); // … and the PR tile reaches the top edge
  expect(b.fields).toBe(6);
  expect(b.hr).toBe(1);
  expect(b.spo2).toBe(1);
}

test('a Settings switch saadat-like → philips-like → saadat-like: grid, columns, grid, nothing left over', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  expectGrid(await box(page));
  await monitor(page, 'philips-like');
  const p = await box(page);
  const host = p.host as NonNullable<typeof p.host>;
  expect(p.strip).toBeNull();
  expect(p.tiles).toBeNull();
  expect(p.fields).toBe(0);
  expect((p.hdr as NonNullable<typeof p.hdr>).w).toBeCloseTo(host.w, 0); // the header over the whole width again
  // the canvas beside the philips-like tile columns (180 px each: the app sizes boxes border-box), as before PR-G
  const cols = await page.evaluate(() => document.querySelectorAll('.stage .pme-stile[data-param="HR"]')[0]?.parentElement?.parentElement?.children.length ?? 0);
  expect(cols).toBeGreaterThan(0);
  expect((p.canvas as NonNullable<typeof p.canvas>).w).toBeCloseTo(host.w - cols * 180, 0);
  await monitor(page, 'saadat-like');
  expectGrid(await box(page));
});
