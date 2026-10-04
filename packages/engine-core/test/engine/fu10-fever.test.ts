// FU-10 (E11; research/14 ET-12, ET-13a; ruling R-3): Task A8 is WITHDRAWN pending Ali — the anaesthetised septic and
// thyrotoxic patients stay afebrile. Held here as `it.fails` with the measured numbers (GA flag, 21 °C, seed 7).
import { describe, expect, it } from 'vitest';
import { ev, FLAG, rows, st, VENTED } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ tc: st(e).resp.temp.tc as number });

describe('FU-10 E11: fever under general anaesthesia (withdrawn, ruling R-3)', { timeout: 900_000 }, () => {
  it.fails('sepsis (phase sepsis) under GA: core 38.5–41 °C at 90 min (tables §5e) — measured 36.60 (36.86 before Task A3)', async () => {
    const r = await rows([...VENTED, FLAG, [60, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'sepsis' })]], 60 + 90 * 60, 60, read);
    console.log(`FU-10 E11 sepsis under GA: core ${r.at(-1)!.tc.toFixed(2)} °C at 90 min`);
    expect(r.at(-1)!.tc).toBeGreaterThanOrEqual(38.5);
  });
  it.fails('thyroid storm under GA: core 38.5–41 °C at 1 h (thyroid.ts header; tables §5c) — measured 36.34 (36.58 before Task A3)', async () => {
    const r = await rows([...VENTED, FLAG, [60, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 })]], 60 + 3600, 60, read);
    console.log(`FU-10 E11 storm under GA: core ${r.at(-1)!.tc.toFixed(2)} °C at 1 h`);
    expect(r.at(-1)!.tc).toBeGreaterThanOrEqual(38.5);
  });
});
