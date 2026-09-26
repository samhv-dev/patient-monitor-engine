// Capnogram angles, the ONE measurement convention for recorded and generated capnograms (R39 item 6, brief §4.4).
// Moved verbatim from packages/engine-core/test/helpers/resp.ts (Stage 3): phase II slope between the 25 % and 75 %
// crossings of the plateau-end value P, phase III slope by regression from the 90 % crossing + 0.2 s to the plateau
// end, α = 180° − atan(s_II/25) + atan(s_III/25) on the 25 mmHg/s axis scale. Input in mmHg.
export interface CapnoBreath { alpha: number; riseIII: number; plateau: number; slopeIII: number }

export function capnoAngles(x: ArrayLike<number>, rate = 62.5): CapnoBreath[] {
  const out: CapnoBreath[] = [];
  let i = 0;
  let hi = -Infinity;
  for (let k = 0; k < x.length; k++) if ((x[k] as number) > hi) hi = x[k] as number;
  const at = (k: number) => x[k] as number;
  const cross = (from: number, lvl: number) => {
    for (let k = from; k < x.length - 1; k++) if (at(k) < lvl && at(k + 1) >= lvl) return k + (lvl - at(k)) / (at(k + 1) - at(k));
    return -1;
  };
  while (i < x.length - 1) {
    const up = cross(i, 0.5 * hi);
    if (up < 0) break;
    let dn = Math.ceil(up);
    while (dn < x.length - 1 && at(dn) >= 0.5 * hi) dn++;
    if (dn >= x.length - 2) break;
    let end = dn;
    for (let k = Math.max(Math.ceil(up), dn - Math.round(0.5 * rate)); k < dn; k++) if (at(k) >= at(end)) end = k;
    let s = Math.floor(up);
    while (s > 0 && at(s - 1) <= at(s)) s--; // `<=`: also walks over sample-and-hold steps (see header)
    const P = at(end);
    const t25 = cross(s, 0.25 * P);
    const t75 = cross(s, 0.75 * P);
    const t90 = cross(s, 0.9 * P);
    const a = Math.ceil(t90 + 0.2 * rate);
    if (t25 > 0 && t75 > t25 && end - a > 10) {
      const sII = (0.5 * P) / ((t75 - t25) / rate);
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      const n = end - a + 1;
      for (let k = a; k <= end; k++) {
        const tt = k / rate;
        sx += tt; sy += at(k); sxx += tt * tt; sxy += tt * at(k);
      }
      const sIII = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      const deg = (r: number) => (r * 180) / Math.PI;
      out.push({ alpha: 180 - deg(Math.atan(sII / 25)) + deg(Math.atan(sIII / 25)), riseIII: sIII * ((end - a) / rate), plateau: P, slopeIII: sIII });
    }
    i = dn + 1;
  }
  return out;
}
