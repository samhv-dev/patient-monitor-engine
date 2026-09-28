// FU-4 G4 (Tasks 3–4): during VF and CPR the physiology reads the ARREST state, never the last beat — the continuous MAP
// (`circ.mapNow`) that 7d and 7e read falls with no flow, the brain's CBF collapses in VF and returns with compressions,
// and (Task 4) the `circ` event's CPP is the continuous relaxation-phase CPP (was the last beat's 79 throughout VF).
// Commanded VF at 60 s, CPR (quality 1) from 120 s, MODELED, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `as${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
type St = { hemo: { circ: { mapNow: number } }; organs: { brain: { cbfRel: number } } };
type Circ = Extract<EngineEvent, { type: 'circ' }>;

async function vfCpr() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
  const circ: Circ[] = [];
  e.on((x) => circ.push(x as Circ), ['circ']);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', atTick: 60 * 50 }));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 }, atTick: 120 * 50 }));
  const st = () => (e as unknown as { st: St }).st;
  const cbf: Record<number, number> = {};
  const map: Record<number, number> = {};
  for (let t = 10; t <= 240; t += 10) {
    e.advanceTo(t);
    cbf[t] = st().organs.brain.cbfRel;
    map[t] = st().hemo.circ.mapNow;
  }
  const cpp = (a: number, b: number) => circ.filter((c) => c.t > a && c.t <= b).map((c) => c.cpp);
  return { cbf, map, cpp };
}

describe('FU-4 G4: the arrest reads its own pressures', () => {
  it('VF: the continuous MAP and the brain CBF collapse; CPR brings CBF back above 20 %', async () => {
    const r = await vfCpr();
    console.log(`MAP rest ${r.map[50]?.toFixed(0)} VF ${r.map[110]?.toFixed(0)} CPR ${r.map[240]?.toFixed(0)}; CBF VF ${r.cbf[110]?.toFixed(2)} CPR ${r.cbf[240]?.toFixed(2)}`);
    expect(r.map[110]).toBeLessThan(30);
    expect(r.cbf[110]).toBeLessThan(0.2);
    expect(r.cbf[240]).toBeGreaterThan(0.2);
  }, 120_000);
  it('Task 4: the circ event CPP is the continuous one — < 10 mmHg in VF (was 79), ≥ 15 during compressions (Paradis 1990)', async () => {
    const r = await vfCpr();
    const vf = r.cpp(90, 120);
    const cpr = r.cpp(150, 240);
    console.log(`CPP rest ${r.cpp(30, 60).at(-1)?.toFixed(0)}, VF max ${Math.max(...vf).toFixed(1)}, CPR ${Math.min(...cpr).toFixed(1)}–${Math.max(...cpr).toFixed(1)}`);
    expect(Math.max(...vf)).toBeLessThan(10);
    expect(Math.min(...cpr)).toBeGreaterThanOrEqual(15);
  }, 120_000);
});
