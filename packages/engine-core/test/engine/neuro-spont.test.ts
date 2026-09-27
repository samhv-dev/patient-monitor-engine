// MODELED spontaneous breathing through the engine (G7b ruling 8, R51 addendum 17): 7b's chemoreflex drive with
// Winter's compensation from 7c's HCO3, and 7f's depression on top. Yields once per sim-minute (CI rule).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineOptions } from '../../src/index.ts';

let n = 0;
const ev = (event: Record<string, unknown>) => ({ id: `s${++n}`, issuedBy: 'test', type: 'applyEvent', event }) as Command;
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
type St = { resp: { co2: { pf: number } }; blood: { core: { ab: { hco3: number } } } };

async function breathe(opts: EngineOptions, untilS: number, cmds: Command[] = []) {
  const e = createEngine({ seed: 8, mode: 'modeled', ...opts }); // opts.mode may override (the MANUAL reference run)
  const breaths: { t: number; vt: number }[] = [];
  e.on((x) => { if (x.type === 'breath') breaths.push({ t: x.t, vt: x.vtMl }); }, ['breath']);
  for (const c of cmds) e.dispatch(c);
  for (let t = 60; t <= untilS; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const st = (e.snapshot().state as { st: St }).st;
  const win = (a: number, b: number) => breaths.filter((x) => x.t >= a && x.t < b);
  const ve = (a: number, b: number) => (win(a, b).reduce((s, x) => s + x.vt, 0) / 1000) / ((b - a) / 60);
  return { paco2: st.resp.co2.pf, hco3: st.blood.core.ab.hco3, rr: (a: number, b: number) => win(a, b).length / ((b - a) / 60), ve };
}

describe('MODELED spontaneous drive through the engine', { timeout: 300_000 }, () => {
  it('no drugs, normal chemistry: the drive holds the MANUAL resting pattern (RR within 10 %, PaCO2 within 2 mmHg over 10 min)', async () => {
    const man = await breathe({ patient: ADULT, mode: 'manual' }, 600);
    const r = await breathe({ patient: ADULT }, 600);
    console.log(`resting: MODELED RR ${r.rr(300, 600).toFixed(1)} PaCO2 ${r.paco2.toFixed(1)} vs MANUAL ${man.rr(300, 600).toFixed(1)} / ${man.paco2.toFixed(1)}`);
    expect(Math.abs(r.rr(300, 600) / man.rr(300, 600) - 1)).toBeLessThan(0.1);
    expect(Math.abs(r.paco2 - man.paco2)).toBeLessThan(2);
  });
  it('metabolic acidosis (7c profile HCO3 15): VE rises and PaCO2 settles at Winter\'s 1.5·HCO3 + 8 ± 2 (≈ 30.5 ± 2)', async () => {
    const ctl = await breathe({ patient: ADULT }, 1200);
    const r = await breathe({ patient: { ...ADULT, blood: { hco3: 15 } } }, 1200);
    console.log(`acidosis: HCO3 ${r.hco3.toFixed(1)} → PaCO2 ${r.paco2.toFixed(1)} (Winter's ${(1.5 * r.hco3 + 8).toFixed(1)}); VE ${r.ve(900, 1200).toFixed(1)} vs ${ctl.ve(900, 1200).toFixed(1)} L/min; RR ${r.rr(900, 1200).toFixed(1)} vs ${ctl.rr(900, 1200).toFixed(1)}`);
    expect(Math.abs(r.paco2 - (1.5 * r.hco3 + 8))).toBeLessThan(2);
    expect(r.paco2).toBeGreaterThan(28.5);
    expect(r.paco2).toBeLessThan(32.5);
    expect(r.ve(900, 1200)).toBeGreaterThan(1.2 * ctl.ve(900, 1200)); // VA must rise ≈ 39/29.5 = 1.34× at the same VCO2; VE a little less (dead space)
    expect(r.rr(900, 1200)).toBeGreaterThan(ctl.rr(900, 1200));
  });
  it('opioid on top: remifentanil 1 µg/kg + 0.3 µg/kg/min → spontaneous RR over minutes 3–5 < 0.6 × the drug-free control', async () => {
    const ctl = await breathe({ patient: ADULT }, 300);
    const remi = await breathe({ patient: ADULT }, 300, [
      ev({ kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }),
      ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.3, unit: 'mcg/kg/min', route: 'iv', infusion: true }),
    ]);
    console.log(`opioid (MODELED): RR ${remi.rr(180, 300).toFixed(1)} vs ${ctl.rr(180, 300).toFixed(1)}; PaCO2 ${remi.paco2.toFixed(1)}`);
    expect(ctl.rr(180, 300)).toBeGreaterThan(8);
    expect(remi.rr(180, 300)).toBeLessThan(0.6 * ctl.rr(180, 300)); // apnoea (0) also passes
  });
  it('acidosis and opioid together: the opioid still depresses the Winter\'s-driven breathing (PaCO2 rises above the acidosis-alone value)', async () => {
    const acid = { patient: { ...ADULT, blood: { hco3: 15 } } };
    const a = await breathe(acid, 900);
    const b = await breathe(acid, 900, [ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.1, unit: 'mcg/kg/min', route: 'iv', infusion: true })]);
    console.log(`acidosis + remifentanil 0.1: PaCO2 ${b.paco2.toFixed(1)} vs ${a.paco2.toFixed(1)}`);
    expect(b.paco2).toBeGreaterThan(a.paco2 + 3);
  });
});
