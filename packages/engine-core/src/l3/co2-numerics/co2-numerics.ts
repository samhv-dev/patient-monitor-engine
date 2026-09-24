// CO2 numerics (brief §4.4 "Numerics (L3)"; research 03 §4.5) measured from the DISPLAYED capnogram: breath
// detection on a rising edge above 50 % of the recent peak with hysteresis, EtCO2 = maximum breath peak of the
// last 10 s, FiCO2 (imCO2) = inspiratory minimum, awRR = mean of the last 6 intervals, gas-apnoea timer.
import type { Measured } from '../../types.ts';

export const DETECT_FRACTION = 0.5; // 50 % of the recent peak (brief §4.4)
export const RELEASE_FRACTION = 0.3; // hysteresis [ENG]
export const DETECT_FLOOR_MMHG = 4; // [ENG]
export const ETCO2_WINDOW_S = 10; // brief §4.4 [ENG]
export const AWRR_INTERVALS = 6; // brief §4.4 [ENG 4–8]
export const GAS_APNOEA_S = 20; // Philips default; saadat gas apnoea 20 s (brief §4.4)

export interface Co2Num {
  high: boolean;
  peak: number; // running peak of the current high segment
  low: number; // running minimum of the current low segment
  recentPeak: number; // decaying reference for the threshold
  edges: number[]; // rising-edge times, last 7
  breaths: Array<{ t: number; et: number; fi: number }>;
  apnoea: boolean;
}

export function createCo2Num(): Co2Num {
  return { high: false, peak: 0, low: 1e9, recentPeak: 30, edges: [], breaths: [], apnoea: false };
}

/** Feed one displayed sample. Returns 'breath' on a detected breath, 'apnoea'/'resumed' on apnoea changes. */
export function co2NumStep(st: Co2Num, t: number, x: number, dt: number): 'breath' | 'apnoea' | 'resumed' | null {
  st.recentPeak = Math.max(x, st.recentPeak * Math.exp(-dt / 20)); // forgets over ~20 s
  const up = Math.max(DETECT_FLOOR_MMHG, DETECT_FRACTION * st.recentPeak);
  const down = Math.max(DETECT_FLOOR_MMHG * 0.6, RELEASE_FRACTION * st.recentPeak);
  let ev: 'breath' | 'apnoea' | 'resumed' | null = null;
  if (!st.high) {
    st.low = Math.min(st.low, x);
    if (x > up) {
      st.high = true;
      st.peak = x;
      st.edges.push(t);
      if (st.edges.length > AWRR_INTERVALS + 1) st.edges.shift();
      if (st.apnoea) {
        st.apnoea = false;
        ev = 'resumed';
      }
    }
  } else {
    st.peak = Math.max(st.peak, x);
    if (x < down) {
      st.high = false;
      st.breaths.push({ t, et: st.peak, fi: st.low < 1e9 ? st.low : 0 });
      while (st.breaths.length > 0 && (st.breaths[0] as { t: number }).t < t - 30) st.breaths.shift();
      st.low = x;
      ev = 'breath';
    }
  }
  const last = st.edges[st.edges.length - 1] ?? 0; // the timer starts at power-on
  if (!st.apnoea && t - last > GAS_APNOEA_S && !st.high) {
    st.apnoea = true;
    return 'apnoea';
  }
  return ev;
}

export function co2Numerics(st: Co2Num, t: number, shownNow: number): { etco2: Measured; imco2: Measured; awrr: Measured } {
  const recent = st.breaths.filter((b) => b.t >= t - ETCO2_WINDOW_S);
  const et = recent.length > 0 ? Math.max(...recent.map((b) => b.et)) : Math.max(0, shownNow);
  const fi = recent.length > 0 ? Math.min(...recent.map((b) => b.fi)) : Math.max(0, shownNow);
  const e = st.edges;
  let rr: number | null = null;
  if (st.apnoea) rr = 0;
  else if (e.length >= 3) rr = (60 * (e.length - 1)) / ((e[e.length - 1] as number) - (e[0] as number));
  return {
    etco2: { value: Math.round(et), flag: 'valid', at: t },
    imco2: { value: Math.round(fi), flag: 'valid', at: t },
    awrr: rr === null ? { value: null, flag: 'invalid', at: t } : { value: Math.round(rr), flag: 'valid', at: t },
  };
}
