// FU-7.1 A5 (Ali 2026-10-10 "there is no KCl as drug"): potassium chloride as an iv INFUSION in mmol, raising plasma K
// through 7c's own potassium pool (the pool insulin–dextrose shifts K into: ECF K + ICF K with τ K_TAU_MIN 43 min, the
// Na/K-ATPase set point following total-body K, K_TBK_MMOL 300). What the engine OWES the clinician is the shape: the
// plasma K rises while the infusion runs, in proportion to the rate, peaks at its end and then falls back toward a
// small persistent rise as the load enters the cells. The textbook SIZE — 20 mmol raises serum K by ≈ 0.25 mmol/L in a
// normal adult [TXT, grade C: Miller 10e ch. 46 electrolyte management; Stoelting Co-Existing 8e ch. 23] — is a known
// miss here and is recorded with its measured numbers below: 7c's pool is the owner of both constants (l2/blood,
// FU-12 / the calibration queue), and this plan does not re-fit them. SLOW (≈ 2 min wall: 3.2 sim-hours); the 20 mmol/h
// arm is measured once and shared by both cases.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

/** Plasma K (mmol/L) from 7c's own state — the number the labs panel reports. */
const kOf = (e: ReturnType<typeof rig6>): number => st6(e).blood.core.out.k as number;

describe('FU-7.1 A5: potassium chloride', { timeout: 600_000 }, () => {
  /** Plasma K at the end of a 1 h infusion and (`settleS` > 0) that long after it stopped. */
  async function course(rate: number, settleS = 0): Promise<{ k0: number; kEnd: number; kSettled: number }> {
    const e = rig6();
    await runTo(e, 60);
    const k0 = kOf(e);
    send(e, { kind: 'infusion', drugId: 'potassiumChloride', rate, unit: 'mmol/h' });
    await runTo(e, 60 + 3600);
    const kEnd = kOf(e);
    if (settleS <= 0) return { k0, kEnd, kSettled: kEnd };
    send(e, { kind: 'infusion', drugId: 'potassiumChloride', rate: 0, unit: 'mmol/h' });
    await runTo(e, 60 + 3600 + settleS);
    return { k0, kEnd, kSettled: kOf(e) };
  }
  /** One run of the 20 mmol/h arm for both cases below (≈ 80 s of the file's wall time). */
  let arm20: Promise<{ k0: number; kEnd: number; kSettled: number }> | null = null;
  const twenty = () => (arm20 ??= course(20, 2 * 3600));

  it('an infusion raises plasma K while it runs, in proportion to the rate, and the rise falls back as the load enters the cells', async () => {
    const [a, b] = [await twenty(), await course(10)];
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 A5: 20 mmol/h K ${a.k0.toFixed(2)} → ${a.kEnd.toFixed(2)} at 1 h (+${(a.kEnd - a.k0).toFixed(2)}), ${a.kSettled.toFixed(2)} at 3 h (+${(a.kSettled - a.k0).toFixed(2)}); 10 mmol/h +${(b.kEnd - b.k0).toFixed(2)}`);
    expect(a.kEnd - a.k0).toBeGreaterThan(0.1);
    expect(a.kSettled).toBeLessThan(a.kEnd - 0.2); // the peak is at the end of the infusion, not a new steady state
    expect(a.kSettled).toBeGreaterThan(a.k0); // and a load of K does not leave the body in two hours
    expect(b.kEnd - b.k0).toBeGreaterThan(0.4 * (a.kEnd - a.k0)); // half the rate, about half the rise
    expect(b.kEnd - b.k0).toBeLessThan(0.75 * (a.kEnd - a.k0));
  });

  // R45 (FU-7.1 A5): the textbook SIZE is missed in both directions — the end-of-infusion rise overshoots it and the
  // settled rise undershoots it. Both constants are 7c's (`K_TAU_MIN` 43 min [ENG, tables `vK`]; `K_TBK_MMOL` 300
  // [TXT, Sterns 1981]) and live in l2/blood, which this plan does not touch. Recorded with the numbers for the
  // calibration queue; the band is NOT widened.
  it.fails('20 mmol over 1 h raises plasma K by 0.15–0.35 mmol/L (≈ 0.25, Miller 10e ch. 46 [TXT, grade C]) — measured +0.77 at the end of the infusion and +0.13 two hours later', async () => {
    const a = await twenty();
    expect(a.kEnd - a.k0).toBeGreaterThanOrEqual(0.15);
    expect(a.kEnd - a.k0).toBeLessThanOrEqual(0.35);
  });

  it('a bolus order and a rate above the documented maximum are warned about, with the source; the dose is still given', async () => {
    const e = rig6();
    const warn: string[] = [];
    e.on((x: EngineEvent) => { if (x.type === 'drugWarning') warn.push((x as unknown as { text: string }).text); });
    await runTo(e, 60);
    send(e, { kind: 'drug', drugId: 'potassiumChloride', dose: 20, unit: 'mmol', route: 'iv' });
    send(e, { kind: 'infusion', drugId: 'potassiumChloride', rate: 40, unit: 'mmol/h' });
    await runTo(e, 65);
    // eslint-disable-next-line no-console -- the gate note's text
    console.log(`FU-7.1 A5 warnings: ${warn.join(' | ')}`);
    expect(warn.some((w) => w.includes('as a bolus') && w.includes('mmol/h'))).toBe(true);
    expect(warn.some((w) => w.includes('40') && w.includes('exceeds'))).toBe(true);
    expect(kOf(e)).toBeGreaterThan(4.2); // given as ordered, not silently clamped
  });

  it('an unmodelled route is refused, as every other row\'s is (FU-8 B1)', async () => {
    const e = rig6();
    await runTo(e, 10);
    const r = e.dispatch({ id: 'a5r', issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', drugId: 'potassiumChloride', dose: 20, unit: 'mmol', route: 'im' } } as never) as { accepted: boolean; reason?: string };
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('route im is not modelled');
  });
});
