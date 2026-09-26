// Defibrillator sync detector (brief §6.5 "Sync": a marker on every detected R; the shock on the next R within
// ≤ 60 ms). A low-latency R detector of its own, separate from the HR detector (which reports 60–120 ms late):
// lead II from the unfiltered VCG, a slow baseline, a peak envelope, and the R reported at the local maximum of
// |lead II − baseline| once the signal has fallen from it. Written from the description above [ENG]; plain data.
import { projectLead } from '../../l2/ecg/vcg.ts';

export const SYNC_RATE = 500;
const BASE_TAU_S = 0.5; // baseline EMA [ENG]
const ENV_TAU_S = 2; // peak-envelope decay [ENG]
const ARM_FRACTION = 0.5; // arm when |v| exceeds half the envelope [ENG]
const FALL_FRACTION = 0.7; // report when |v| has fallen below 70 % of the running maximum [ENG]
const MAX_WAIT_N = 20; // or 40 ms after the maximum at the latest
const REFRACTORY_N = 125; // 250 ms
const ENV_FLOOR_MV = 0.3; // no R below this envelope: the unfiltered VCG carries ±0.17 mV of noise and wander in asystole [ENG]
const kBase = 1 - Math.exp(-1 / (SYNC_RATE * BASE_TAU_S));
const kEnv = Math.exp(-1 / (SYNC_RATE * ENV_TAU_S));

export interface SyncState {
  /** Next absolute ECG sample index to read. */
  n: number;
  base: number;
  env: number;
  lastR: number;
  arm: { max: number; at: number } | null;
}

export function createSyncState(n0 = 0): SyncState {
  return { n: n0, base: 0, env: 0, lastR: -1e9, arm: null };
}

/**
 * Feed samples [st.n, end] read from the VCG X/Y/Z channels; returns the R sample indices detected, each paired
 * with the sample at which it was reported.
 */
export function syncStep(st: SyncState, end: number, vcg: (n: number) => [number, number, number] | null): Array<{ r: number; at: number }> {
  const out: Array<{ r: number; at: number }> = [];
  for (; st.n <= end; st.n++) {
    const s = vcg(st.n);
    if (!s) continue;
    const x = projectLead('ecgII', s[0], s[1], s[2]);
    st.base += (x - st.base) * kBase;
    const a = Math.abs(x - st.base);
    st.env = Math.max(a, st.env * kEnv);
    if (st.arm) {
      if (a > st.arm.max) st.arm = { max: a, at: st.n };
      else if (a < FALL_FRACTION * st.arm.max || st.n - st.arm.at > MAX_WAIT_N) {
        out.push({ r: st.arm.at, at: st.n });
        st.lastR = st.arm.at;
        st.arm = null;
      }
    } else if (st.n - st.lastR > REFRACTORY_N && st.env > ENV_FLOOR_MV && a > ARM_FRACTION * st.env) {
      st.arm = { max: a, at: st.n };
    }
  }
  return out;
}
