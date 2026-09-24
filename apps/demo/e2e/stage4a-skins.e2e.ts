// Gate 4a evidence: one screenshot per skin / preset / theme combination, and an OfflineAudioContext timing log
// of every alarm sound profile level (pulse onsets measured from rendered audio, not from the schedule).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4a-skins.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4a');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

const SHOTS: Array<[string, string]> = [
  ['saadat-like', ''], ['iran-icu-as-found', ''], ['philips-like', ''], ['zoll-like', ''], ['mindray-like', ''], ['ge-like', ''], ['lifepak-like', ''],
  ['saadat-like', 'projector-light'], ['philips-like', 'projector-light'], ['philips-like', 'ecg-grid'], ['saadat-like', 'ecg-grid'],
];

async function ready(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __pme4a?: { ready: boolean } }).__pme4a?.ready === true);
}

test('one screenshot per skin, preset and theme', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1300, height: 760 });
  for (const [skin, theme] of SHOTS) {
    await page.goto(`${base}/stage4a-skins.html?skin=${skin}&theme=${theme}&static=1`);
    await ready(page);
    await page.locator('#screen').screenshot({ path: resolve(out, `${skin}${theme ? `--${theme}` : ''}.png`) });
  }
  expect(errors).toEqual([]);
});

type Report = { onsetsS: number[]; durationsS: number[]; riseMs: number };
const CASES: Array<{ profile: string; level: 1 | 2 | 3; seconds: number; skin?: string; pulses: number; repeatS: number | null }> = [
  { profile: 'iec-style', level: 1, seconds: 24, pulses: 10, repeatS: 10 },
  { profile: 'iec-style', level: 2, seconds: 42, pulses: 3, repeatS: 20 },
  { profile: 'iec-style', level: 3, seconds: 20, pulses: 1, repeatS: null },
  { profile: 'iec-style', level: 3, seconds: 20, skin: 'philips-like', pulses: 2, repeatS: null },
  { profile: 'iec-style', level: 1, seconds: 34, skin: 'zoll-like', pulses: 10, repeatS: 15 },
  { profile: 'saadat', level: 1, seconds: 22, pulses: 5, repeatS: 10 },
  { profile: 'saadat', level: 2, seconds: 42, pulses: 3, repeatS: 20 },
  { profile: 'saadat', level: 3, seconds: 62, pulses: 1, repeatS: 30 },
  { profile: 'traditional', level: 1, seconds: 3.5, pulses: 1, repeatS: 1 },
  { profile: 'traditional', level: 2, seconds: 5, pulses: 1, repeatS: 2 },
];

test('alarm profiles: rendered pulse timing matches the data (OfflineAudioContext)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${base}/stage4a-skins.html?static=1`);
  await ready(page);
  const log: Array<Record<string, unknown>> = [];
  for (const c of CASES) {
    const r = (await page.evaluate(
      ([p, l, s, k]) => (window as unknown as { __pme4a: { renderTiming: (...a: unknown[]) => Promise<Report> } }).__pme4a.renderTiming(p, l, s, k),
      [c.profile, c.level, c.seconds, c.skin] as const,
    )) as Report;
    // Group into bursts (gap > 1.5 s) and compare with the data.
    const bursts: number[][] = [];
    for (const t of r.onsetsS) {
      const cur = bursts[bursts.length - 1];
      if (cur && t - (cur[cur.length - 1] as number) < (c.repeatS !== null && c.repeatS < 1.5 ? 0.5 : 1.5)) cur.push(t);
      else bursts.push([t]);
    }
    const starts = bursts.map((b) => b[0] as number);
    const intervals = starts.slice(1).map((t, i) => t - (starts[i] as number));
    log.push({ ...c, bursts: bursts.length, pulsesPerBurst: bursts.map((b) => b.length), intervalsS: intervals.map((x) => +x.toFixed(4)), firstBurstOnsetsS: bursts[0]?.map((x) => +x.toFixed(4)), pulseDurS: r.durationsS.slice(0, 3).map((x) => +x.toFixed(4)), riseMs: r.riseMs });
    expect(bursts.every((b) => b.length === c.pulses), JSON.stringify(log.at(-1))).toBe(true);
    if (c.repeatS === null) expect(bursts).toHaveLength(1);
    else for (const iv of intervals) expect(Math.abs(iv - c.repeatS)).toBeLessThan(0.005);
    expect(r.riseMs).toBeGreaterThanOrEqual(10);
  }
  writeFileSync(resolve(out, 'audio-timing.json'), `${JSON.stringify(log, null, 1)}\n`);
});
