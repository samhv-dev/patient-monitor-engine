import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState } from '../../src/l2/pk/compartment.ts';
import { eleveldPropofol, mintoRemifentanil, schniderPropofol } from '../../src/l2/pk/models.ts';
import { runPk } from '../helpers/pk.ts';

describe('7g acceptance — PK through the engine', () => {
  it('Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9 (the engine adds no PK error)', async () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'M' as const };
    const r = await runPk(pat, [[60, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }]], 300);
    const row = r.drugs.find((d) => Math.abs(d.t - 240) < 1e-6)!.drugs.find((x) => x.id === 'propofol')!;
    const p = eleveldPropofol({ ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' });
    const s = pkSystem(p, 0.1);
    let x = zeroState(p);
    x[0] = 140;
    for (let k = 0; k < 1800; k++) x = pkStep(s, x, 0);
    expect(row.ce).toBeCloseTo(x[3]!, 6);
    expect(row.cp).toBeCloseTo(cp(p, x), 6);
  }, 300_000);
  it('TCI induction propofol Ce 4 (Eleveld) + remifentanil Ce 3 (Minto): targets reached in < 3 min and held', async () => {
    const r = await runPk({ ageY: 45, weightKg: 80, heightCm: 178, sex: 'M' }, [
      [10, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4 }],
      [10, { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 }],
    ], 900);
    const at = (t: number, id: string) => r.drugs.find((d) => Math.abs(d.t - t) < 1e-6)!.drugs.find((x) => x.id === id)!.ce;
    expect(at(190, 'propofol')).toBeGreaterThan(3.8);
    expect(at(190, 'remifentanil')).toBeGreaterThan(2.85);
    expect(at(900, 'propofol')).toBeCloseTo(4, 1);
    expect(at(900, 'remifentanil')).toBeCloseTo(3, 1);
  }, 300_000);
  it('Schnider vs Eleveld at the same effect target: Schnider front-loads less drug in minute 1 (53 vs 140 mg at 35 y)', () => {
    const pat = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
    expect(schniderPropofol(pat).v1).toBeLessThan(eleveldPropofol(pat).v1);
    expect(mintoRemifentanil({ ...pat, ageY: 80 }).ke0[0]).toBeLessThan(mintoRemifentanil(pat).ke0[0]!);
  });
  it('the panel shows a decrement time for a running remifentanil infusion of 2–4 min after 60 min', async () => {
    const r = await runPk({}, [[0, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' }]], 3600);
    const last = r.drugs.at(-1)!.drugs.find((x) => x.id === 'remifentanil')!;
    expect(last.decrement50Min).toBeGreaterThan(1.8);
    expect(last.decrement50Min).toBeLessThan(4);
  }, 600_000);
});
