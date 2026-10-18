// QRS / pulse beep (brief §3.6): 100 ms, fundamental plus 2nd and 3rd harmonics, 5 ms attack and release [ENG]. The
// pitch comes with the tone (the engine's spo2PitchHz: 1245 Hz at SpO2 100 %). Duration and the 3rd harmonic follow the
// measured Saadat beep (research/34 row 6: ≈ 1245 Hz, square-like with a strong 3rd harmonic, 100–150 ms).

export const BEEP_MS = 100;
export const BEEP_RAMP_MS = 5;
export const BEEP_HARMONIC2 = 0.3; // relative amplitude of the 2nd harmonic [ENG]
export const BEEP_HARMONIC3 = 1 / 3; // relative amplitude of the 3rd harmonic, a square wave's [ENG]
/** At most this share of the wall-clock beat interval is beep, so fast beats (tachycardia at ×4) never run together
 *  into one tone (owner's ruling on the 100 ms beep) [ENG]. */
export const BEEP_MAX_BEAT_FRACTION = 0.6;

/** The beep's length, ms, at this heart rate and simulation speed: BEEP_MS, shortened to BEEP_MAX_BEAT_FRACTION of the
 *  wall-clock beat interval ((60 / HR) / speed) when beats come fast; never shorter than its two ramps. */
export function beepMsAt(hrBpm: number, speed: number): number {
  if (!(hrBpm > 0) || !(speed > 0)) return BEEP_MS;
  return Math.max(2 * BEEP_RAMP_MS, Math.min(BEEP_MS, ((BEEP_MAX_BEAT_FRACTION * 60) / hrBpm / speed) * 1000));
}

/** Envelope breakpoints [time offset s, gain] for a beep of peak gain g lasting `ms`. */
export function beepEnvelope(g: number, ms = BEEP_MS): Array<[number, number]> {
  const d = ms / 1000;
  const r = BEEP_RAMP_MS / 1000;
  return [
    [0, 0],
    [r, g],
    [d - r, g],
    [d, 0],
  ];
}

/** Schedule one beep of `ms` at audio time `when`; the handle silences it (a cancelled tone already handed to Web Audio). */
export function playBeep(ctx: BaseAudioContext, dest: AudioNode, when: number, freqHz: number, gain = 0.25, ms = BEEP_MS): { stop(): void; readonly endsAt: number } {
  const osc = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, BEEP_HARMONIC2, BEEP_HARMONIC3]));
  osc.setPeriodicWave(wave);
  osc.frequency.value = freqHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  for (const [dt, g] of beepEnvelope(gain, ms)) env.gain.linearRampToValueAtTime(g, when + dt);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + ms / 1000 + 0.01);
  return {
    endsAt: when + ms / 1000 + 0.01,
    stop() {
      env.disconnect();
      try {
        osc.stop(0);
      } catch {
        // already stopped
      }
    },
  };
}
