// The instructor's page and a learner monitor window of one browser play one session: only the page last switched on
// sounds, the other's Sound switch says where the sound is, and a reload of the sounding page gives the sound up. What
// each page's audio is told to play is read from its Web Audio graph: the master gain on the destination, and the
// tones started while it is up.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Probe = { __audio: { masters: GainNode[]; audible: number } };
/** In every page: the gains connected to a destination (the masters), and a count of tones started while one is up. */
const probe = () => {
  const w = window as unknown as Probe;
  w.__audio = { masters: [], audible: 0 };
  const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => unknown;
  AudioNode.prototype.connect = function (this: AudioNode, ...a: unknown[]) {
    if (a[0] instanceof AudioDestinationNode && this instanceof GainNode) w.__audio.masters.push(this);
    return connect.apply(this, a);
  } as typeof AudioNode.prototype.connect;
  const start = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (this: OscillatorNode, when?: number) {
    if (w.__audio.masters.some((g) => g.context === this.context && g.context.state !== 'closed' && g.gain.value > 0)) w.__audio.audible++;
    start.call(this, when);
  };
};
const audio = (p: Page) => p.evaluate(() => {
  const a = (window as unknown as Probe).__audio;
  return { playing: a.masters.some((g) => g.context.state === 'running' && g.gain.value > 0), audible: a.audible };
});
const synced = (p: Page) => p.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });

test("the instructor's page and a learner monitor window of one browser: one sounds, the other says where", async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'on the CI runner headless WebKit drops BroadcastChannel messages between pages in one direction (learner-monitor-follows.e2e.ts) and its AudioContext clock does not run (fx16-follower-beep-gate.e2e.ts); macOS WebKit and CI Chromium run it');
  test.setTimeout(90_000);
  await page.context().addInitScript(probe);
  await openApp(page, base, TEACH2, { warmMs: 500 });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const learner = await page.context().newPage();
  await learner.goto(`${base}/?follow=${code}#/monitor`);
  await synced(learner);
  const hostSound = page.locator('.ip2-head .ip2-sound');
  const learnerSound = learner.locator('button.sound');

  await hostSound.click();
  await expect(hostSound).toHaveText('Sound on');
  await expect(learnerSound).toHaveText("Sound off: playing in the instructor's page");
  await expect.poll(() => audio(page)).toMatchObject({ playing: true });

  await learnerSound.click();
  await expect(learnerSound).toHaveText('Sound on');
  await expect(hostSound).toHaveText('Sound off: playing in the learner monitor');
  await expect(hostSound).toHaveAttribute('aria-pressed', 'false');
  const host = await audio(page);
  expect(host.playing).toBe(false);
  const from = (await audio(learner)).audible;
  await expect.poll(async () => (await audio(learner)).audible).toBeGreaterThanOrEqual(from + 2); // the learner's beeps go on
  expect(await audio(page)).toEqual(host); // and the instructor's page started no audible tone meanwhile

  await learner.reload();
  await synced(learner);
  await expect(hostSound).toHaveText('Sound off');
  await expect(learner.locator('button.sound')).toHaveText('Sound off');
  expect([(await audio(page)).playing, (await audio(learner)).playing]).toEqual([false, false]); // nothing took the sound over
});
