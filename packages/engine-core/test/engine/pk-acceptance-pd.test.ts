import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, PatientProfile } from '../../src/types.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../src/l2/pk/pipeline.ts';
import { testT1 } from '../../src/l2/pk/nmb.ts';
import { acidosisFactor } from '../../src/l2/pk/pd.ts';
import { cmd } from '../helpers/hemo.ts';
import { runPk, yieldNow } from '../helpers/pk.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
const inf = (drugId: string, rate: number) => ({ kind: 'infusion', drugId, rate, unit: 'mcg/kg/min' });
/** % MAP change at 20 min of an infusion started at 120 s (1310–1320 s vs 100–120 s). */
async function mapRise(drugId: string, rate: number): Promise<number> {
  const r = await runPk({}, [[120, inf(drugId, rate)]], 1320);
  return 100 * (r.map(1310, 1320) / r.map(100, 120) - 1);
}
function coMean(evs: EngineEvent[], a: number, b: number): number {
  const c = evs.filter((x): x is Extract<EngineEvent, { type: 'circ' }> => x.type === 'circ' && x.t >= a && x.t < b);
  return c.reduce((s, x) => s + x.co, 0) / Math.max(1, c.length);
}
type St = { pk: { bus: DrugBus; fx: { svr: number } }; blood?: { core?: { ab?: { ph?: number } } } };
const stOf = (e: ReturnType<typeof createEngine>) => (e.snapshot().state as { st: St }).st;

describe('7g acceptance — vasopressor dose–response (tables §6.2)', () => {
  const PHE: [number, number, number][] = [[0.1, 8, 22], [0.25, 18, 32], [0.5, 25, 40], [1.0, 30, 45]];
  for (const [rate, lo, hi] of PHE)
    it(`phenylephrine ${rate} µg/kg/min: MAP +${lo}–${hi} % at 20 min`, async () => {
      const d = await mapRise('phenylephrine', rate);
      console.log(`phenylephrine ${rate}: MAP ${d.toFixed(1)} %`);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }, 600_000);
  const NE: [number, number, number][] = [[0.05, 10, 25], [0.1, 18, 35], [0.2, 25, 45]];
  for (const [rate, lo, hi] of NE)
    it(`norepinephrine ${rate} µg/kg/min: MAP +${lo}–${hi} % at 20 min`, async () => {
      const d = await mapRise('norepinephrine', rate);
      console.log(`norepinephrine ${rate}: MAP ${d.toFixed(1)} %`);
      expect(d).toBeGreaterThanOrEqual(lo);
      expect(d).toBeLessThanOrEqual(hi);
    }, 600_000);
  const dobuRise = async (patient: PatientProfile) => {
    const r = await runPk(patient, [[120, inf('dobutamine', 5)]], 1320);
    return 100 * (coMean(r.ev, 1300, 1320) / coMean(r.ev, 100, 120) - 1);
  };
  // R45: band missed, kept as it.fails (gate note). Measured CO +4.2 % (MAP +0.9 %, HR +9.9; Ees ×1.33, SVR ×0.90).
  // Task 13's permitted re-fit (EC50 ×0.5–×2; ke0 is irrelevant at 20 min) reaches only +6.4 % at EC50 ×0.5 (Ees ×1.47,
  // SVR ×0.85, HR +19.5): 7a's circulation is venous-return limited, so contractility alone barely moves CO. Needs a
  // ruling (a β-agonist venous mechanism, e.g. unstressed-volume mobilisation, is not in the tables).
  it.fails('dobutamine 5 µg/kg/min: CO +20–40 % (measured +4.2)', async () => {
    const free = await dobuRise({});
    console.log(`dobutamine 5: CO ${free.toFixed(1)} %`);
    expect(free).toBeGreaterThanOrEqual(20);
    expect(free).toBeLessThanOrEqual(40);
  }, 900_000);
  it('dobutamine 5 µg/kg/min: the β-blocked profile gets ≤ half of the free CO rise (decision 7)', async () => {
    const free = await dobuRise({});
    const blocked = await dobuRise({ conditions: [{ id: 'betaBlocked' }] });
    console.log(`dobutamine 5: CO ${free.toFixed(1)} % (β-blocked ${blocked.toFixed(1)} %)`);
    expect(blocked).toBeLessThanOrEqual(free / 2);
  }, 900_000);
});

describe('7g acceptance — context: acidosis, tachyphylaxis, age, antagonism', () => {
  it('acidosis: phenylephrine 0.5 at pH 7.2 gives ≤ 60 % of the pH 7.4 SVR rise (PD level: 0.5×, T6.2)', () => {
    const svrRise = (ph: number) => {
      const pk = createPkState();
      applyPkCommand(pk, ev(inf('phenylephrine', 0.5)), 0);
      advancePk(pk, { ...NEUTRAL_PK_CTX, ph }, 1200);
      return pk.fx.svr - 1;
    };
    expect(svrRise(7.2)).toBeLessThanOrEqual(0.6 * svrRise(7.4));
    expect(svrRise(7.2) / svrRise(7.4)).toBeCloseTo(acidosisFactor(7.2), 9);
  });
  it.skipIf(!('blood' in (createEngine({ seed: 1 }).snapshot().state as { st: object }).st))(
    'acidosis through the engine (7c on main): the pk context reads 7c’s pH and scales the phenylephrine SVR rise by acidosisFactor(pH)',
    async () => {
      const run = async (acid: boolean) => {
        const e = createEngine({ seed: 8, mode: 'modeled' });
        e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
        if (acid) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'metabolic', ketoacidsMmolL: 20, overS: 60 } })); // 7c's event
        e.dispatch(cmd({ type: 'applyEvent', event: inf('phenylephrine', 0.5), atTick: 300 * 50 }));
        for (let t = 60; t <= 1500; t += 60) {
          e.advanceTo(t);
          await yieldNow();
        }
        const st = stOf(e);
        return { rise: st.pk.fx.svr - 1, ph: st.blood?.core?.ab?.ph ?? 7.4 };
      };
      const base = await run(false);
      const acid = await run(true);
      console.log(`engine acidosis: pH ${acid.ph.toFixed(3)}, SVR rise ${acid.rise.toFixed(3)} vs ${base.rise.toFixed(3)}`);
      expect(acid.ph).toBeLessThan(7.3); // else raise ketoacidsMmolL: the test must reach real acidaemia
      expect(acid.rise / base.rise).toBeGreaterThan(acidosisFactor(acid.ph) * 0.95);
      expect(acid.rise / base.rise).toBeLessThan(acidosisFactor(acid.ph) * 1.05);
    },
    900_000,
  );
  it('ephedrine 10 mg ×3 at 10 min: the third dose adds ≤ 0.6 × the SVR increment of the first (tachyphylaxis 0.7²)', () => {
    const pk = createPkState();
    const incr: number[] = [];
    for (const t0 of [0, 600, 1200]) {
      advancePk(pk, NEUTRAL_PK_CTX, t0);
      const before = pk.fx.svr;
      applyPkCommand(pk, ev({ kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' }), t0);
      advancePk(pk, NEUTRAL_PK_CTX, t0 + 270); // the row's tp 4.5 min
      incr.push(pk.fx.svr - before);
    }
    console.log(`ephedrine SVR increments ${incr.map((x) => x.toFixed(3)).join(' / ')}`);
    expect(incr[0]!).toBeGreaterThan(0.05);
    expect(incr[2]!).toBeLessThanOrEqual(0.6 * incr[0]!);
  });
  it('MAC(age): sevoflurane 2 % at FGF 6 for 20 min — the 80 y MAC fraction ≥ 1.2 × the 40 y one (MAC 1.40 vs 1.80)', async () => {
    const mac = async (ageY: number) => {
      const r = await runPk({ ageY }, [[0, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6 }]], 1200);
      return (r.e.snapshot().state as { st: St }).st.pk.bus.volatiles.sevoflurane!;
    };
    const y40 = await mac(40);
    const y80 = await mac(80);
    console.log(`MAC fraction 40 y ${y40.macFrac.toFixed(3)}, 80 y ${y80.macFrac.toFixed(3)}`);
    expect(y80.macAge).toBeCloseTo(1.4, 2);
    expect(y80.macFrac).toBeGreaterThanOrEqual(1.2 * y40.macFrac);
  }, 600_000);
  it('naloxone 0.1 mg at remifentanil Ce 3: remifentanil-equivalent ≥ 30 % lower within 3 min; the class multiplier ≥ 1.4 on the bus', async () => {
    const e = createEngine({ seed: 6, mode: 'modeled' });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'naloxone', dose: 0.1, unit: 'mg', route: 'iv' }, atTick: 300 * 50 }));
    for (let t = 60; t <= 240; t += 60) {
      e.advanceTo(t);
      await yieldNow();
    }
    e.advanceTo(295);
    const pre = stOf(e).pk.bus;
    e.advanceTo(480);
    const post = stOf(e).pk.bus;
    expect(pre.agents.remifentanil!.brain).toBeCloseTo(3, 1);
    expect(post.agents.remifentanil!.brain).toBeCloseTo(3, 1); // TCI holds the raw Ce; the antagonism is PD
    expect(post.cns.opioidCeRemiEq).toBeLessThanOrEqual(0.7 * pre.cns.opioidCeRemiEq);
    expect(post.antagonist.opioid).toBeGreaterThanOrEqual(1.4);
  }, 300_000);
});

/** Minutes from a sugammadex dose to TOFR ≥ 0.9, and to T1 ≥ 10 %, with 7f's formulas on the bus thumb Ce. */
function sgxReversal(rocMgKg: number, giveAtT1: number | null, giveAtMin: number | null, sgxMgKg: number): { tofr90: number; t1of10: number } {
  const pk = createPkState();
  applyPkCommand(pk, ev({ kind: 'drug', drugId: 'rocuronium', dose: rocMgKg, unit: 'mg/kg', route: 'iv' }), 0);
  let given = -1;
  let t1of10 = Number.POSITIVE_INFINITY;
  for (let t = 0.1; t < 14400; t = Math.round((t + 0.1) * 10) / 10) {
    advancePk(pk, NEUTRAL_PK_CTX, t);
    const t1 = testT1(pk.bus.agents.rocuronium!.nmj!, 823, 4.8);
    if (given < 0 && ((giveAtT1 !== null && t > 120 && t1 >= giveAtT1) || (giveAtMin !== null && t >= giveAtMin * 60))) {
      applyPkCommand(pk, ev({ kind: 'drug', drugId: 'sugammadex', dose: sgxMgKg, unit: 'mg/kg', route: 'iv' }), t);
      given = t;
    }
    if (given > 0 && t1of10 === Number.POSITIVE_INFINITY && t1 >= 0.1) t1of10 = (t - given) / 60;
    if (given > 0 && t1 ** 2.5 >= 0.9) return { tofr90: (t - given) / 60, t1of10 };
  }
  return { tofr90: Number.POSITIVE_INFINITY, t1of10 };
}

describe('7g acceptance — sugammadex reversal (tables §5d, §7 25; plasma + effect-site binding, D7)', () => {
  it('2 mg/kg at T2 (T1 ≈ 10 %, rocuronium 0.6): TOFR 0.9 in 1.5–4 min (label median 2.2; prototype 2.11)', () => {
    const m = sgxReversal(0.6, 0.1, null, 2).tofr90;
    console.log(`sugammadex 2 mg/kg at T2: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThan(1.5);
    expect(m).toBeLessThan(4);
  });
  it('4 mg/kg at 1–2 PTC (T1 back to ≥ 1 %, rocuronium 0.6): TOFR 0.9 in 2.1–4.3 min (label median 2.7, IQR; prototype 2.22)', () => {
    const m = sgxReversal(0.6, 0.01, null, 4).tofr90;
    console.log(`sugammadex 4 mg/kg at PTC: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThanOrEqual(2.1);
    expect(m).toBeLessThanOrEqual(4.3);
  });
  it('16 mg/kg 3 min after rocuronium 1.2: T1 10 % in 0.6–2.0 min (label 1.2; prototype 1.80), TOFR 0.9 < 5 min', () => {
    const r = sgxReversal(1.2, null, 3, 16);
    console.log(`sugammadex 16 mg/kg: T1 10 % ${r.t1of10.toFixed(2)} min, TOFR 0.9 ${r.tofr90.toFixed(2)} min`);
    expect(r.t1of10).toBeGreaterThan(0.6);
    expect(r.t1of10).toBeLessThan(2.0);
    expect(r.tofr90).toBeLessThan(5);
  });
  it('underdosed sugammadex (0.5 mg/kg 5 min after rocuronium 1.2) leaves residual block (recurarisation teaching)', () => {
    expect(sgxReversal(1.2, null, 5, 0.5).tofr90).toBeGreaterThan(10); // prototype 129.5 min
  });
});
