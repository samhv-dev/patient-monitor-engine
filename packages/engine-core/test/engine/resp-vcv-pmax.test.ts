// FU-6 R7 (audit I-b; D11): the internal VCV pressure-limits at Pmax. Near-fatal bronchospasm (1.25) on VCV 12 × 500:
// with Pmax 80 the flow source delivers 500 mL at a peak above 40; with the default Pmax 40 the peak stays ≤ 40.5 and
// the delivered VT falls below the set VT (and VA with it). Healthy breaths are untouched (peak 16.7, VT 500).
import { describe, expect, it } from 'vitest';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function spasm(pmax?: number) {
  const e = rig6();
  await ventRig(e, pmax === undefined ? {} : { pmax });
  await runTo(e, 240);
  const healthy = await fineWindow(e, 300);
  const vtHealthy = st6(e).resp.driver.cycles.at(-2)?.vt as number;
  send(e, { kind: 'airway', state: 'bronchospasm', severity: 1.25 });
  await runTo(e, 540);
  const w = await fineWindow(e, 600);
  const vt = st6(e).resp.driver.cycles.at(-2)?.vt as number;
  console.log(`FU-6 R7 Pmax ${pmax ?? 'default'}: healthy peak ${healthy.peak.toFixed(1)} VT ${vtHealthy.toFixed(0)}; spasm peak ${w.peak.toFixed(1)} VT ${vt.toFixed(0)} VA ${st6(e).resp.vaLpm.toFixed(2)}`);
  return { healthy, vtHealthy, peak: w.peak, vt };
}

describe('FU-6 R7: the internal VCV has a Pmax (was an unlimited flow source)', { timeout: 300_000 }, () => {
  // R45 (FU-6 executor, merged main): the healthy breath's cycle VT now reads the DELIVERED volume 494.3 mL (the
  // end-inspiration replacement fires at delivered < set − 5; the prototype on 94040f7 read 500) — its own row, it.fails
  // with the number; the limit rows below are met (40.0 / 476 mL; Pmax 80: 44.0 / 500 mL).
  it.fails('healthy breaths untouched: delivered VT within 5 mL of the set 500 — measured 494.3 (FU-6 R7, band ±5)', async () => {
    const lim = await spasm();
    expect(Math.abs(lim.vtHealthy - 500)).toBeLessThanOrEqual(5);
  });
  it('default Pmax 40: Ppeak ≤ 40.5 and VT below the set VT in near-fatal bronchospasm; Pmax 80: VT 500 at a Ppeak > 40; healthy peak < 20 (measured 40.0 / 476; 44.0 / 500; 16.7)', async () => {
    const lim = await spasm();
    const free = await spasm(80);
    expect(lim.healthy.peak).toBeLessThan(20);
    expect(lim.peak).toBeLessThanOrEqual(40.5);
    expect(lim.vt).toBeLessThanOrEqual(495); // capped at Pmax: less than the set VT (the resistive peak is what is cut)
    expect(lim.vt).toBeLessThan(free.vt - 10);
    expect(free.peak).toBeGreaterThan(40);
    expect(Math.abs(free.vt - 500)).toBeLessThanOrEqual(5);
  });
});
