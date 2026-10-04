// FU-10 Task A7 (E7; research/14 ET-18a/b, ET-23c; ruling R-2): type 1 with the basal insulin omitted becomes
// hyperglycaemic, ketotic and hyperkalaemic; the fixed-rate insulin infusion then lowers the ketones ≥ 0.5 mmol/L/h
// (JBDS DKA 2023). Awake, spontaneous room air; 70 kg; seed 7.
import { describe, expect, it } from 'vitest';
import { ev, rows, st } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({
  glu: st(e).endo.core.out.glucoseMmol as number, keto: 25 * (st(e).blood.out.dkaSeverity as number), k: st(e).blood.out.k as number, ph: st(e).blood.core.ab.ph as number,
});
const T1 = (basalInsulin: boolean) => ({ endo: { diabetes: 'type1' as const, basalInsulin } });
const H = 3600;

describe('FU-10 E7: the missed basal insulin and its treatment', { timeout: 900_000 }, () => {
  it('omitted for 6 h: glucose > 20 mmol/L, ketones > 3 mmol/L, K⁺ above the patient on basal insulin; the latter unchanged', async () => {
    const off = await rows([], 6 * H, 600, read, T1(false));
    const on = await rows([], 6 * H, 600, read, T1(true));
    const a = off.at(-1)!;
    const b = on.at(-1)!;
    console.log(`FU-10 E7 omitted 6 h: glucose ${a.glu.toFixed(1)}, ketones ${a.keto.toFixed(2)} mmol/L, pH ${a.ph.toFixed(2)}, K⁺ ${a.k.toFixed(2)}; on basal: ${b.glu.toFixed(1)} / ${b.keto.toFixed(2)} / ${b.k.toFixed(2)}`);
    expect(a.glu).toBeGreaterThan(20);
    expect(a.keto).toBeGreaterThan(3);
    expect(a.k).toBeGreaterThan(b.k + 0.5);
    expect(b.keto).toBe(0);
  });
  it('insulin 0.1 units/kg/h from 6 h: ketones fall ≥ 0.5 mmol/L/h over the next 3 h (JBDS DKA 2023 target)', async () => {
    const r = await rows([[6 * H + 1, ev({ kind: 'infusion', drugId: 'insulin', rate: 0.1, unit: 'units/kg/h' })]], 9 * H, 600, read, T1(false));
    const k6 = r.find((x) => x.t === 6 * H)!.keto;
    const k9 = r.at(-1)!.keto;
    console.log(`FU-10 E7 treated: ketones ${k6.toFixed(2)} → ${k9.toFixed(2)} mmol/L in 3 h (${((k6 - k9) / 3).toFixed(2)} /h); glucose ${r.at(-1)!.glu.toFixed(1)}, K⁺ ${r.at(-1)!.k.toFixed(2)}`);
    expect((k6 - k9) / 3).toBeGreaterThanOrEqual(0.5);
  });
});
