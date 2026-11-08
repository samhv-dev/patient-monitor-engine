// EEG E6 (plan §7 E6): switching the generic processed-EEG device on puts its reading on the monitor's BFA tile — the
// spectral edge frequency and the suppression ratio (the mapping is the renderer's formatter, not the skin's JSON) —
// and the developer page draws its raw trace and spectrogram strip under the label "Processed EEG (generic)".
// philips-like: the tile appears with the device, SEF as its value, "SR n" under it. saadat-like (BFA always shown):
// the first part relabelled SEF, BS% the device's SR, SQI% and EMG% blank (the generic reader computes neither).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const simT = (page: Page) => page.evaluate(() => (window as unknown as { __simT?: number }).__simT ?? 0);
const bfa = (page: Page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>('.pme-stile[data-param="BFA"]')].find((e) => e.offsetParent !== null);
    if (!t) return null;
    const q = (s: string) => [...t.querySelectorAll<HTMLElement>(s)].map((e) => e.textContent ?? '');
    return { text: t.innerText, v: t.querySelector('[data-pme="v"]')?.textContent ?? '', s: t.querySelector('[data-pme="s"]')?.textContent ?? '', pl: q('[data-part] .pl'), pv: q('[data-part] .pv') };
  });

for (const skin of ['philips-like', 'saadat-like']) {
  test(`generic EEG on (${skin}): the BFA tile reads SEF and SR; the page draws the raw trace and the spectrogram`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/dev/depth-neuromuscular.html?skin=${skin}`);
    await expect.poll(() => simT(page), { timeout: 30_000 }).toBeGreaterThan(1);
    if (skin === 'philips-like') expect(await bfa(page)).toBeNull(); // no depth device yet: the module tile is absent
    await page.click('#eegOn');
    await expect(page.locator('#eegLabel')).toHaveText('Processed EEG (generic)', { timeout: 20_000 });
    // awake: SEF a two-digit frequency in Hz, no suppression
    await expect.poll(async () => (await bfa(page))?.[skin === 'philips-like' ? 'v' : 'pv']?.toString() ?? '', { timeout: 30_000 }).toMatch(/^\d{1,2}\.\d/);
    const b = await bfa(page);
    if (skin === 'philips-like') {
      expect(b?.text).toContain('SEF');
      expect(b?.s).toBe('SR 0');
      expect(Number(b?.v)).toBeGreaterThan(5);
      expect(Number(b?.v)).toBeLessThan(31);
    } else {
      expect(b?.pl).toEqual(['SEF', 'BS%', 'SQI%', 'EMG%']);
      expect(b?.pv[1]).toBe('0');
      expect(b?.pv.slice(2)).toEqual(['', '']);
    }
    // the strip: the raw trace and at least one spectrogram column are painted
    await expect.poll(() => page.evaluate(() => (window as unknown as { __eeg?: { raw: number; cols: number } }).__eeg?.cols ?? 0), { timeout: 20_000 }).toBeGreaterThan(1);
    expect(await page.evaluate(() => (window as unknown as { __eeg: { raw: number } }).__eeg.raw)).toBeGreaterThan(125);
    expect(errors).toEqual([]);
  });
}
