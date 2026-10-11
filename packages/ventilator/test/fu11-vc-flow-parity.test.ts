// FU-11 Task H5 (first showcase, 6 Oct): the app's Ventilator view delivered far less than the monitor's own ventilator
// for the same lungs (severe bronchospasm, VCV 12 × 500: cockpit VTE 160–205 with Ppeak pinned at Pmax, internal VT
// 403–424). Diagnosis (measured, writer's probe on 48864439): the lungs are the SAME on both paths (lungState → C 55,
// R insp 60, R exp 108 cmH2O/L/s); the difference is the inspiratory FLOW — the cockpit's VC runs its preset 60 L/min
// square with a 0.3 s pause, the monitor's ventilator x = VT / Ti with I:E 1:2 (18 L/min at 12/min): 60 L/min × R 60
// reaches Pmax early and the pressure limit cuts the breath. A cockpit linked to the monitor starts VC at the monitor's
// flow (`monitorMatchedFlow`); the instructor's own Flow or Pause setting wins from then on.
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { createLinkedSim, monitorMatchedFlow, PROFILES } from '../src/index.ts';
import { run } from './helpers.ts';

type St = { resp: { driver: { cycles: Array<{ vt: number; mech: boolean }> } } };
const para = { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' };

async function cockpitVt(pmax: number): Promise<{ vte: number; pip: number }> {
  const s = createLinkedSim({ profile: 'normal', vent: { rate: 12, vt: 500, peep: 5, fio2: 50, pmax, ...monitorMatchedFlow({ vt: 500, rate: 12 }) } });
  s.send({ type: 'setMode', mode: 'modeled' });
  s.send({ type: 'applyEvent', event: para });
  await run(s, 60);
  s.send({ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } });
  await run(s, 240);
  return { vte: s.vs.p.measured.VTE, pip: s.vs.p.measured.PIP };
}
async function engineVt(pmax: number): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: PROFILES.normal!.patient });
  let n = 0;
  const cmd = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 't', type: 'applyEvent', event } as never);
  cmd({ kind: 'airwayDevice', device: 'ett' });
  cmd({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, pmax });
  cmd(para);
  e.advanceTo(60);
  cmd({ kind: 'airway', state: 'bronchospasm', severity: 1 });
  for (let t = 60; t < 240; t += 30) {
    e.advanceTo(t + 30);
    await new Promise((r) => setImmediate(r));
  }
  return (e.snapshot().state as { st: St }).st.resp.driver.cycles.filter((c) => c.mech).at(-2)?.vt ?? Number.NaN;
}

describe('FU-11 H5: the cockpit delivers what the monitor\'s ventilator delivers for the same settings and lungs', () => {
  it('monitorMatchedFlow: VT over the monitor ventilator\'s Ti (I:E 1:2), no pause', () => {
    expect(monitorMatchedFlow({ vt: 500, rate: 12 })).toEqual({ vcFlow: 18, pause: 0 });
    expect(monitorMatchedFlow({ vt: 500, rate: 14 })).toEqual({ vcFlow: 21, pause: 0 });
  });
  it('severe bronchospasm, VCV 12 × 500, Pmax 35: VT within 10 % of the monitor\'s ventilator', { timeout: 120_000 }, async () => {
    const [c, e] = [await cockpitVt(35), await engineVt(35)];
    console.log(`FU-11 H5 parity: cockpit VTE ${c.vte.toFixed(0)} (PIP ${c.pip.toFixed(1)}), monitor VT ${e.toFixed(0)}`);
    expect(Math.abs(c.vte - e) / e).toBeLessThan(0.1);
  });
});
