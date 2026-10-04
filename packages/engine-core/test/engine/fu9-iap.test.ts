// FU-9 Task A9 (H4; research/13 RH-06, research/21 SP-08): pressure natriuresis reads the renal perfusion pressure
// MAP − max(CVP, IAP). The laparoscopy acceptance arms SP-08a/e: "GA vent" (helpers/fu9.ts), pneumoperitoneum IAP 14 mmHg
// (7d's `renal iapMmHg`, the only IAP input) at 20 min against the same timeline without it.
import { describe, expect, it } from 'vitest';
import { circCoLpm } from '../helpers/blood.ts';
import { arm, ev, GA_VENT, once, urineMl } from '../helpers/fu9.ts';

const TQ = 1200;
const read = once(async () => {
  const at = [TQ, TQ + 900, TQ + 1500];
  const f = (e: Parameters<typeof urineMl>[0]) => ({ urine: urineMl(e), co: circCoLpm(e) });
  const p = await arm([...GA_VENT, [TQ, ev({ kind: 'renal', iapMmHg: 14 })]], at, f);
  const c = await arm(GA_VENT, at, f);
  const uo = (r: typeof p) => (r[2] as { urine: number }).urine - (r[1] as { urine: number }).urine; // +15–25 min
  return { dUopPct: 100 * (uo(p) / uo(c) - 1), dCoPct: 100 * ((p[1] as { co: number }).co / (c[1] as { co: number }).co - 1) };
});

describe('FU-9 H4: intra-abdominal pressure lowers the urine (WSACS 2013; research/21 SP-08e)', { timeout: 600_000 }, () => {
  it('IAP 14 under GA: urine over +15–25 min falls ≥ 5 % against the control (main: 0 %)', async () => {
    const r = await read();
    console.log(`FU-9 H4 IAP 14: urine ${r.dUopPct.toFixed(1)} %, CO ${r.dCoPct.toFixed(1)} %`);
    expect(r.dUopPct).toBeLessThanOrEqual(-5);
  });
  // R45 (SP-08e; Chiu 1995 [VERIFY]: UO −60 % at 15 mmHg): the kidney's half is H4; the other half — IAP → venous return
  // and afterload (CO −10–30 %, SVR +20–70 %, Joris 1993) — is 7a's (research/13 H5, handed: R-FU9-8).
  it.fails('IAP 14 under GA: urine −30 % or more (SP-08e) — measured −12.5 %', async () => {
    expect((await read()).dUopPct).toBeLessThanOrEqual(-30);
  });
  it.fails('IAP 14 under GA: CO −10–30 % at +15 min (SP-08a, Joris 1993; 7a, handed) — measured 0.0 %', async () => {
    expect((await read()).dCoPct).toBeLessThanOrEqual(-10);
  });
});
