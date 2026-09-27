// Arterial (and pleth) beat fiducials, identical for recorded and generated pulses (brief §9 V1–V3):
// - foot: intersecting tangent — the tangent at the maximum first derivative meets the horizontal through the
//   pre-upstroke minimum (research 03 §2.1; the standard PWV foot);
// - upstroke slope: that maximum dP/dt (mmHg/s, after a 15 Hz zero-phase low-pass) [ENG];
// - dicrotic notch: the first local minimum of the pressure after the systolic peak; when the notch is only an
//   inflection (common at the radial site) the maximum of d²P/dt² in the same window is used — flagged `inflection`.
//   Window: peak + 60 ms … peak + min(0.5·RR, 450 ms) [ENG];
// - notch depth: (P_peak − P_notch)/(P_peak − P_dia), 0 = no notch, 1 = back to diastolic [ENG].

export interface PulseBeat {
  r: number; // R index (s)
  foot: number; // s
  peak: number; // s
  sys: number;
  dia: number;
  slope: number; // units/s
  notch?: number; // s
  notchDepth?: number;
  notchKind?: 'minimum' | 'inflection';
}

function lowpass(x: Float64Array, fs: number, fc: number): Float64Array {
  // zero-phase first-order low-pass (forward + backward)
  const a = Math.exp((-2 * Math.PI * fc) / fs);
  const run = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let y = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      y = a * y + (1 - a) * (v[i] as number);
      o[i] = y;
    }
    return o;
  };
  return run(run(x).reverse()).reverse();
}

/** One beat per R peak (sample times in s of the ECG `rS`); `x` at `fs` covers the same time base (t = i/fs). */
export function pulseBeats(x: Float64Array, fs: number, rS: number[], opts: { searchMs?: [number, number] } = {}): PulseBeat[] {
  const [s0, s1] = opts.searchMs ?? [40, 500];
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : Number.NaN));
  if (clean.some((v) => Number.isNaN(v))) {
    let last = 0;
    for (let i = 0; i < clean.length; i++) if (Number.isNaN(clean[i] as number)) clean[i] = last; else last = clean[i] as number;
  }
  const y = lowpass(clean, fs, 15);
  const d = new Float64Array(y.length);
  for (let i = 1; i < y.length - 1; i++) d[i] = (((y[i + 1] as number) - (y[i - 1] as number)) * fs) / 2;
  const out: PulseBeat[] = [];
  for (let j = 0; j < rS.length; j++) {
    const r = rS[j] as number;
    const rr = j + 1 < rS.length ? (rS[j + 1] as number) - r : j > 0 ? r - (rS[j - 1] as number) : 0.8;
    const a = Math.round((r + s0 / 1000) * fs);
    const b = Math.min(y.length - 2, Math.round((r + Math.min(s1 / 1000, 0.9 * rr)) * fs));
    if (a < 2 || b <= a + 2) continue;
    let im = a;
    for (let i = a; i <= b; i++) if ((d[i] as number) > (d[im] as number)) im = i;
    if ((d[im] as number) <= 0) continue;
    let i0 = im; // pre-upstroke minimum: walk back while falling
    while (i0 > a - Math.round(0.1 * fs) && i0 > 1 && (y[i0 - 1] as number) <= (y[i0] as number)) i0--;
    const dia = y[i0] as number;
    const foot = im / fs - ((y[im] as number) - dia) / (d[im] as number);
    let ip = im;
    const pk = Math.min(y.length - 1, im + Math.round(0.3 * fs));
    for (let i = im; i <= pk; i++) if ((y[i] as number) > (y[ip] as number)) ip = i;
    const beat: PulseBeat = { r, foot, peak: ip / fs, sys: y[ip] as number, dia, slope: d[im] as number };
    const n0 = ip + Math.round(0.06 * fs);
    const n1 = Math.min(y.length - 2, ip + Math.round(Math.min(0.5 * rr, 0.45) * fs));
    let notch = -1;
    for (let i = n0; i < n1; i++) if ((d[i] as number) <= 0 && (d[i + 1] as number) > 0) { notch = i; break; }
    let kind: 'minimum' | 'inflection' = 'minimum';
    if (notch < 0 && n1 > n0 + 2) {
      kind = 'inflection';
      let best = -Infinity;
      for (let i = n0 + 1; i < n1; i++) {
        const dd = (d[i + 1] as number) - (d[i - 1] as number);
        if (dd > best) { best = dd; notch = i; }
      }
    }
    if (notch > 0) {
      beat.notch = notch / fs;
      beat.notchKind = kind;
      beat.notchDepth = (beat.sys - (y[notch] as number)) / Math.max(1e-9, beat.sys - dia);
    }
    out.push(beat);
  }
  return out;
}
