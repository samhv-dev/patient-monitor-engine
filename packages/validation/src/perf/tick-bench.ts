// Worker tick-time percentiles, measured in Node on the same engine code the worker runs (decision 14: the worker
// has no timing hook and Stage 8a may not add one). One `advanceTo` per 20 ms tick with every channel produced
// (8-lane monitor: ECG II/V5/aVR, ABP, pleth, CVP, CO2, resp) — the worker's steady-state cost per tick. BUILD-PLAN
// Stage 8 budget: worker ≤ 6 ms per frame (≈ one tick at 60 fps), so p99 per tick must stay well under 6 ms.
import { createEngine } from '@pme/engine-core';
import { quantile } from '../stats.ts';

/** heapGrowthMb is NaN unless Node runs with --expose-gc (the perf:ticks script sets it): without a forced GC it measures garbage. */
export interface TickStats { ticks: number; p50: number; p95: number; p99: number; max: number; heapGrowthMb: number }

export async function tickBench(simSeconds = 60, seed = 3): Promise<TickStats> {
  const e = createEngine({ seed, patient: { sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on' } } });
  e.dispatch({ id: 'vent', issuedBy: 'perf', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } } as never);
  const out = new Float32Array(64);
  const ms: number[] = [];
  e.advanceTo(10); // warm-up (JIT, first NIBP/breath state)
  const gc = (globalThis as { gc?: () => void }).gc;
  gc?.();
  const heap0 = process.memoryUsage().heapUsed;
  const n = Math.round(simSeconds * 50);
  for (let i = 1; i <= n; i++) {
    const a = performance.now();
    e.advanceTo(10 + i * 0.02);
    for (const ch of ['ecgII', 'V5', 'aVR', 'abp', 'pleth', 'cvp', 'co2', 'resp'] as const) e.readSamples(ch, Math.max(0, e.latestSampleIndex(ch) - 63), out);
    ms.push(performance.now() - a);
    if (i % 3000 === 0) await new Promise<void>((r) => setImmediate(r));
  }
  gc?.();
  return { ticks: n, p50: quantile(ms, 0.5), p95: quantile(ms, 0.95), p99: quantile(ms, 0.99), max: Math.max(...ms), heapGrowthMb: gc ? (process.memoryUsage().heapUsed - heap0) / 1048576 : Number.NaN };
}
