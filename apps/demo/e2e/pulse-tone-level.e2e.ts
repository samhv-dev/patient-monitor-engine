// The pulse tone plays at the level its style's data give, read from the gain the page asks Web Audio for. A beep is the
// oscillator whose PeriodicWave is the beep's (packages/audio/src/tones.ts playBeep: 4 coefficients, the 3rd harmonic at
// 1/3); its level is the peak its envelope gain ramps to. Expected, by the style's alarm volume law
// (packages/audio/src/profiles): Saadat-style BEAT VOLUME 1 of 1–7 at 22/6 dB a step below 0.5 = 0.5·10^(−1.1); an
// IEC-style beep 3 of 0–10 at 3 dB a step = 0.5·10^(−21/20).
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startVite } from './app-support.ts';

test.skip(
  ({ browserName }) => browserName === 'webkit' && !!process.env.CI,
  "headless WebKit's AudioContext clock does not run on the CI runner, so its QRS beeps are dropped as stale before any envelope is set (fx16-follower-beep-gate.e2e.ts); macOS WebKit and CI Chromium run it",
);

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

/** Init script: the peak gain of every beep this page starts (`window.__beepGains`). */
function recordBeepGains(): void {
  const w = window as unknown as { __beepGains: number[] };
  w.__beepGains = [];
  const peak = new WeakMap<AudioParam, number>();
  const ramp = AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime = function (this: AudioParam, v: number, t: number) {
    peak.set(this, Math.max(peak.get(this) ?? 0, v));
    return ramp.call(this, v, t);
  };
  const beepWaves = new WeakSet<PeriodicWave>();
  const cpw = BaseAudioContext.prototype.createPeriodicWave;
  BaseAudioContext.prototype.createPeriodicWave = function (this: BaseAudioContext, real: Float32Array, imag: Float32Array, o?: PeriodicWaveConstraints) {
    const wave = cpw.call(this, real, imag, o);
    if (imag.length === 4 && Math.abs(imag[3]! - 1 / 3) < 1e-3) beepWaves.add(wave);
    return wave;
  } as typeof cpw;
  const beeps = new WeakSet<OscillatorNode>();
  const spw = OscillatorNode.prototype.setPeriodicWave;
  OscillatorNode.prototype.setPeriodicWave = function (this: OscillatorNode, wave: PeriodicWave) {
    if (beepWaves.has(wave)) beeps.add(this);
    return spw.call(this, wave);
  };
  const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => unknown;
  AudioNode.prototype.connect = function (this: AudioNode, ...a: unknown[]) {
    const to = a[0];
    if (beeps.has(this as OscillatorNode) && to instanceof GainNode) w.__beepGains.push(peak.get(to.gain) ?? 0);
    return connect.apply(this, a);
  } as typeof AudioNode.prototype.connect;
}

async function beepGainsOn(page: Page, skin: string): Promise<number[]> {
  await page.goto(`${base}/dev/device-layer.html?skin=${skin}`);
  await page.waitForFunction(() => (window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready === true);
  await page.click('#sound');
  const gains = () => page.evaluate(() => (window as unknown as { __beepGains: number[] }).__beepGains);
  await expect.poll(async () => (await gains()).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
  return gains();
}

test('the pulse tone plays at its style level: Saadat-style and Philips-style', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(recordBeepGains);
  const saadat = await beepGainsOn(page, 'saadat-like');
  for (const g of saadat) expect(g, JSON.stringify(saadat)).toBeCloseTo(0.5 * 10 ** -1.1, 6);
  const philips = await beepGainsOn(page, 'philips-like');
  for (const g of philips) expect(g, JSON.stringify(philips)).toBeCloseTo(0.5 * 10 ** (-21 / 20), 6);
});
