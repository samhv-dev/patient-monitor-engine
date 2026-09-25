// Stage 3 numeric tiles (brief §6.1, §6.8): SpO2 with PI, EtCO2 with FiCO2 and awRR, RR (impedance) and
// temperature T1/T2. Pure formatters are exported for tests (Node has no DOM); the tiles reuse PressureTile.
import type { Measured } from '@pme/engine-core';

const ok = (m: Measured | undefined): m is Measured & { value: number } => !!m && m.value !== null && m.flag !== 'invalid';

/** SpO2: "97", "97?" when questionable (low perfusion, motion, CPR); "-?-" when invalid (saadat-like, brief §6.1). */
export function formatSpo2(spo2: Measured | undefined, pi: Measured | undefined): { main: string; sub: string; status: string } {
  const main = ok(spo2) ? `${Math.round(spo2.value)}${spo2.flag === 'questionable' ? '?' : ''}` : '-?-';
  const sub = ok(pi) ? `PI ${pi.value.toFixed(pi.value < 1 ? 2 : 1)}` : 'PI ---';
  const status = !spo2 || spo2.value === null ? 'NO PULSE' : ok(pi) && pi.value < 0.3 ? 'LOW PERF' : '';
  return { main, sub, status };
}

/** EtCO2 large, "FiCO2 n" and "awRR n" below; dashes while invalid (warm-up). */
export function formatEtco2(et: Measured | undefined, fi: Measured | undefined, awrr: Measured | undefined): { main: string; sub: string; status: string } {
  return {
    main: ok(et) ? String(Math.round(et.value)) : '---',
    sub: `FiCO2 ${ok(fi) ? Math.round(fi.value) : '--'}`,
    status: `awRR ${ok(awrr) ? Math.round(awrr.value) : '--'}${awrr && awrr.value === 0 ? '  APNEA' : ''}`,
  };
}

/** RR (impedance): "15", "0 APNEA". */
export function formatRr(rr: Measured | undefined): { main: string; status: string } {
  if (!ok(rr)) return { main: '---', status: '' };
  return { main: String(Math.round(rr.value)), status: rr.value === 0 ? 'APNEA' : '' };
}

/** T1 (oesophageal) large, T2 (site) below, 0.1 °C. */
export function formatTemp(t1: Measured | undefined, t2: Measured | undefined): { main: string; sub: string } {
  return { main: ok(t1) ? t1.value.toFixed(1) : '--.-', sub: `T2 ${ok(t2) ? t2.value.toFixed(1) : '--.-'}` };
}
