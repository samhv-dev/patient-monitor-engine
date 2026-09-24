// QRS / pulse beep (brief §3.6): 60 ms, sine plus 2nd harmonic, 5 ms attack and release [ENG].
// Stage 1 plays a fixed 880 Hz; Stage 3 adds pitch(SpO2) = 880·2^(−(100 − SpO2)·s/12).

export const BEEP_MS = 60;
export const BEEP_RAMP_MS = 5;
export const BEEP_HARMONIC2 = 0.3; // relative amplitude of the 2nd harmonic [ENG]

/** Envelope breakpoints [time offset s, gain] for a beep of peak gain g. */
export function beepEnvelope(g: number): Array<[number, number]> {
  const d = BEEP_MS / 1000;
  const r = BEEP_RAMP_MS / 1000;
  return [
    [0, 0],
    [r, g],
    [d - r, g],
    [d, 0],
  ];
}

export function playBeep(ctx: BaseAudioContext, dest: AudioNode, when: number, freqHz: number, gain = 0.25): void {
  const osc = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(new Float32Array([0, 0, 0]), new Float32Array([0, 1, BEEP_HARMONIC2]));
  osc.setPeriodicWave(wave);
  osc.frequency.value = freqHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  for (const [dt, g] of beepEnvelope(gain)) env.gain.linearRampToValueAtTime(g, when + dt);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + BEEP_MS / 1000 + 0.01);
}
