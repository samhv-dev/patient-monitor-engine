// Pulse onset detection on rendered audio (gate evidence): a pulse is a run where |x| stays above 10 % of the peak,
// allowing dips shorter than 2 ms (the waveform's own zero crossings). Returns onsets, durations and the 10–90 %
// rise time of the first pulse.
export interface OnsetReport {
  onsetsS: number[];
  durationsS: number[];
  riseMs: number;
}

export function measureOnsets(x: Float32Array, sr: number): OnsetReport {
  // Envelope: max |x| over 1 ms windows.
  const win = Math.max(1, Math.round(sr / 1000));
  const env: number[] = [];
  for (let i = 0; i < x.length; i += win) {
    let m = 0;
    for (let k = i; k < Math.min(x.length, i + win); k++) m = Math.max(m, Math.abs(x[k] as number));
    env.push(m);
  }
  const peak = Math.max(...env);
  const thr = 0.1 * peak;
  const onsetsS: number[] = [];
  const durationsS: number[] = [];
  let start = -1;
  let below = 0;
  env.forEach((v, i) => {
    if (v >= thr) {
      if (start < 0) start = i;
      below = 0;
    } else if (start >= 0 && ++below > 2) {
      onsetsS.push(start / 1000);
      durationsS.push((i - below + 1 - start) / 1000);
      start = -1;
      below = 0;
    }
  });
  if (start >= 0) {
    onsetsS.push(start / 1000);
    durationsS.push((env.length - start) / 1000);
  }
  let riseMs = 0;
  const first = onsetsS[0];
  if (first !== undefined) {
    const i0 = Math.round(first * 1000);
    const localPeak = Math.max(...env.slice(i0, i0 + 60));
    const a = env.findIndex((v, i) => i >= i0 && v >= 0.1 * localPeak);
    const b = env.findIndex((v, i) => i >= i0 && v >= 0.9 * localPeak);
    riseMs = b - a;
  }
  return { onsetsS, durationsS, riseMs };
}
