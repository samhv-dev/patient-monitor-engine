// Temperature numerics (brief §4.6 "Sensor", §6.1): T1 = oesophageal probe, T2 = the chosen site, each a
// first-order probe lag (< 10 s) behind the site temperature, reported at 1 Hz with 0.1 °C resolution.
import type { TempSite } from '../../types-resp.ts';
import type { Measured } from '../../types.ts';
import { SENSOR_TAU_S } from '../../l2/temp/temp.ts';

export interface TempNum {
  t1: number;
  t2: number;
}

export function createTempNum(t0: number): TempNum {
  return { t1: t0, t2: t0 };
}

export function tempNumStep(st: TempNum, sites: Record<TempSite, number>, site: TempSite, dtS: number): void {
  const a = 1 - Math.exp(-dtS / SENSOR_TAU_S);
  st.t1 += (sites.oesophageal - st.t1) * a;
  st.t2 += (sites[site] - st.t2) * a;
}

export function tempMeasured(v: number, on: boolean, t: number): Measured {
  return on ? { value: Math.round(v * 10) / 10, flag: 'valid', at: t } : { value: null, flag: 'invalid', at: t };
}
