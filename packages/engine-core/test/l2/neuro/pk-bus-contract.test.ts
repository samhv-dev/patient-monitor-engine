// The R51 bus fields 7f reads, produced by 7g's REAL pipeline. A failure here is a 7g gap: STOP and report it to the
// orchestrator (R51) — never patch src/l2/pk/** or src/types-pk.ts from this branch.
import { describe, expect, it } from 'vitest';
import { give, rig, runTo, vaporiser } from '../../helpers/neuro.ts';

describe('7g → 7f bus contract (R51 §2–3, addenda 9–10)', { timeout: 120_000 }, () => {
  it('opioids publish a separate ventilatory site: remifentanil vent leads brain early (ke0 0.92 vs Minto)', () => {
    const r = rig();
    give(r, 'remifentanil', 0.5, 'mcg/kg');
    runTo(r, 0.5);
    const a = r.pk.bus.agents.remifentanil;
    expect(a?.vent ?? 0).toBeGreaterThan(0);
    expect(a?.vent ?? 0).toBeGreaterThan(a?.brain ?? 0);
  });
  it('NMB agents publish thumb and diaphragm Ce (ng/mL); the diaphragm leads early (ke0 0.26 vs 0.16)', () => {
    const r = rig();
    give(r, 'rocuronium', 0.6);
    runTo(r, 1);
    const a = r.pk.bus.agents.rocuronium;
    expect(a?.nmj ?? 0).toBeGreaterThan(100);
    expect(a?.dia ?? 0).toBeGreaterThan(a?.nmj ?? 0);
    expect(a?.unit).toBe('ng/mL');
    expect(a?.plasma ?? 0).toBeGreaterThan(0);
  });
  it('an accepted dose is on bus.doses after the next advance; cumulativeMgPerKg sums repeat doses', () => {
    const r = rig();
    give(r, 'succinylcholine', 1);
    runTo(r, 1 / 60);
    expect(r.pk.bus.doses.some((d) => d.agent === 'succinylcholine' && Math.abs((d.mgPerKg ?? 0) - 1) < 1e-9 && d.amountUnit === 'mcg' && d.t === 0)).toBe(true);
    give(r, 'succinylcholine', 1);
    runTo(r, 2 / 60);
    expect(r.pk.bus.agents.succinylcholine?.cumulativeMgPerKg ?? 0).toBeCloseTo(2, 9);
  });
  it('volatiles: the dialled agent AND n2o each publish fet, brain, macAge and the brain macFrac (addendum 9)', () => {
    const r = rig();
    vaporiser(r, 'sevoflurane', 2, 6, 0.5);
    runTo(r, 10);
    const v = r.pk.bus.volatiles;
    expect(v.sevoflurane?.fet ?? 0).toBeGreaterThan(0.5);
    expect(v.sevoflurane?.macAge ?? 0).toBeCloseTo(1.8, 1);
    expect(v.sevoflurane?.macFrac ?? 0).toBeGreaterThan(0.3);
    expect(v.sevoflurane?.macFrac ?? 0).toBeCloseTo((v.sevoflurane?.brain ?? 0) / (v.sevoflurane?.macAge ?? 1), 9); // macFrac = BRAIN fraction
    expect(v.n2o?.fet ?? 0).toBeGreaterThan(20);
    expect(r.pk.bus.cns.macBrain).toBeGreaterThan(0);
  });
  it('naloxone publishes bus.antagonist.opioid > 1 and applies it to cns.opioidCeRemiEq but not to the per-agent totals (F2: 7f divides them)', () => {
    const r = rig();
    give(r, 'remifentanil', 0.3, 'mcg/kg/min', true);
    runTo(r, 10);
    give(r, 'naloxone', 0.4, 'mg');
    runTo(r, 12);
    const b = r.pk.bus;
    expect(b.antagonist.opioid).toBeGreaterThan(3);
    const remi = b.agents.remifentanil?.brain ?? 0;
    expect(b.cns.opioidCeRemiEq).toBeCloseTo(remi / b.antagonist.opioid, 6);
  });
  it('neostigmine raises bus.nmb.achGain; homozygous cholinesterase slows succinylcholine (addendum 10)', () => {
    const r = rig();
    give(r, 'neostigmine', 0.05);
    runTo(r, 10);
    expect(r.pk.bus.nmb.achGain).toBeGreaterThan(1.5);
    const norm = rig();
    const hom = rig({ pche: 'hom' });
    give(norm, 'succinylcholine', 1);
    give(hom, 'succinylcholine', 1);
    runTo(norm, 30);
    runTo(hom, 30);
    expect(hom.pk.bus.agents.succinylcholine?.nmj ?? 0).toBeGreaterThan(10 * (norm.pk.bus.agents.succinylcholine?.nmj ?? 0) + 1);
  });
});
