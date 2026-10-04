// Proof (d): after one click on "Sound off" the audio unlocks without console errors (Chromium and WebKit). Headless
// browsers cannot be heard: the check is every AudioContext the page created reaching "running", the button
// turning to "Sound on", and no error logged. Then a scenario alarm is raised to make the audio path schedule tones.
import { expect, test } from '@playwright/test';
import { loadShowcase, openTeach, save, watchConsole } from './showcase-support.ts';

test('sound unlocks after a click, no console errors', async ({ page, browserName }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __ctx: AudioContext[]; AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    w.__ctx = [];
    const Base = w.AudioContext ?? w.webkitAudioContext;
    if (!Base) return;
    class Spy extends Base {
      constructor(o?: AudioContextOptions) {
        super(o);
        w.__ctx.push(this);
      }
    }
    w.AudioContext = Spy;
    if (w.webkitAudioContext) w.webkitAudioContext = Spy;
  });
  const errors = watchConsole(page);
  await openTeach(page);
  const states = () => page.evaluate(() => (window as unknown as { __ctx: AudioContext[] }).__ctx.map((c) => c.state));
  const beforeClick = await states();
  const btn = page.locator('button.sound');
  const labelBefore = await btn.innerText();
  await btn.click();
  await expect(btn).toHaveText('Sound on', { timeout: 10_000 });
  await page.waitForTimeout(1500);
  const afterClick = await states();
  // drive an alarm so tones are scheduled: the tamponade case + propofol gives apnoea and low-pressure alarms
  await loadShowcase(page, 'Severe tamponade, then induction');
  await page.locator('section[aria-label="Running scenario"] button', { hasText: 'Give propofol 2 mg/kg' }).click();
  await page.waitForTimeout(30_000);
  const afterAlarms = await states();
  const result = { browser: browserName, labelBefore, labelAfter: await btn.innerText(), contextsBeforeClick: beforeClick, contextsAfterClick: afterClick, contextsAfterAlarms: afterAlarms, alarmShown: await page.locator('.alarm-count').innerText(), errors };
  save(`sound-${browserName}.json`, result);
  console.log(`[sound ${browserName}] ${JSON.stringify(result)}`);
  expect(afterClick.length).toBeGreaterThan(0);
  expect(afterClick.every((s) => s === 'running')).toBe(true);
  expect(errors).toEqual([]);
});
