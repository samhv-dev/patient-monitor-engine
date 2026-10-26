// Home's "Engine · ms per tick" tile (E125). The monitor's own engine worker has no timing hook (the renderer is not
// changed for a tile), so this worker runs the SAME engine build beside it, as `packages/validation/src/perf/tick-bench.ts`
// does in Node: a ventilated adult with eight channels read every tick (ECG II/V5/aVR, ABP, pleth, CVP, CO2, resp), one
// `advanceTo` per 20-ms tick. A worker's clock can be coarse (1 ms in Safari), so each sample times 10 ticks and posts
// the mean; the page keeps the median of the recent samples. Started on Home only, terminated when Home is left.
import { createEngine } from '@pme/engine-core';

const e = createEngine({ seed: 3, patient: { sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on' } } });
e.dispatch({ id: 'vent', issuedBy: 'bench', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } } as never);
const out = new Float32Array(64);
const CHANNELS = ['ecgII', 'V5', 'aVR', 'abp', 'pleth', 'cvp', 'co2', 'resp'] as const;
let t = 0;
e.advanceTo((t = 5)); // warm-up: the JIT and the first breaths

const BATCH = 10;

self.onmessage = (ev: MessageEvent<{ samples: number }>) => {
  const ms: number[] = [];
  for (let i = 0; i < ev.data.samples; i++) {
    const a = performance.now();
    for (let k = 0; k < BATCH; k++) {
      e.advanceTo((t += 0.02));
      for (const ch of CHANNELS) e.readSamples(ch, Math.max(0, e.latestSampleIndex(ch) - 63), out);
    }
    ms.push((performance.now() - a) / BATCH);
  }
  (self as unknown as Worker).postMessage({ ms });
};
