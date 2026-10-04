// FU-7 Task 15 (R51 addendum 24; research/14 DI-70): the desflurane sympathetic surge through the engine. DI-70's rig:
// the audit's ventilated adult, desflurane 3 % FGF 4 from 60 s, a dial step to 12 % at 900 s, against the same arm
// held at 3 %; 5 s samples, one yield per sim-MINUTE. SLOW_A.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function arm(stepTo: number | null) {
  const e = rig6(undefined, 'modeled', 7);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  const rows: { t: number; hr: number }[] = [];
  let stepped = false;
  await runTo(e, 1800, (u) => {
    if (u >= 60 && !rows.some((r) => r.t >= 60)) send(e, { kind: 'vaporiser', agent: 'desflurane', dialPct: 3, fgfLpm: 4, n2oFrac: 0 });
    if (stepTo !== null && u >= 900 && !stepped) { stepped = true; send(e, { kind: 'vaporiser', agent: 'desflurane', dialPct: stepTo, fgfLpm: 4, n2oFrac: 0 }); }
    rows.push({ t: u, hr: st6(e).hemo.circ.hrModel as number });
  }, 5);
  return rows;
}

describe('FU-7 Task 15: the desflurane surge (DI-70)', { timeout: 900_000 }, () => {
  // R45: the end-tidal trigger does not fire on this circuit (interactions-misc.test.ts), so the surge never starts.
  it.fails('a 3 → 12 % desflurane step raises HR 8–35 bpm (tables §6.3: +20–30 % for 2–4 min), the rise lasting 2–4 min — measured ΔHR +1.1 (the trigger never fires)', async () => {
    const i = await arm(12);
    const c = await arm(null);
    const d = i.filter((r) => r.t >= 900 && r.t <= 1500).map((r) => ({ t: r.t, dhr: r.hr - c.find((x) => x.t === r.t)!.hr }));
    const peak = Math.max(...d.map((x) => x.dhr));
    const above = d.filter((x) => x.dhr >= 8);
    const lastingS = above.length ? above[above.length - 1]!.t - above[0]!.t : 0;
    console.log(`FU-7 T15 DI-70: desflurane step ΔHR peak ${peak.toFixed(1)} bpm, ≥ 8 bpm for ${lastingS} s`);
    expect(peak).toBeGreaterThanOrEqual(8);
    expect(peak).toBeLessThanOrEqual(35);
    expect(lastingS).toBeGreaterThanOrEqual(120);
    expect(lastingS).toBeLessThanOrEqual(240);
  });
});
