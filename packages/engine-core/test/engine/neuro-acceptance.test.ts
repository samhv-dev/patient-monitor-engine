// Stage 7f acceptance through the engine (scope 7f-5): residual block at extubation, depth bands, emergence,
// the neuro step's own CPU cost, Stage 3 untouched without drugs (the 24 h no-drift run is neuro-longrun.test.ts;
// yields once per sim-minute: CI rule). Drugs and the vaporiser go through 7g (R51 §3–4). Every band here is a TARGET (R45).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';
import { applyNeuroCommand, createNeuroState, stepNeuroTo } from '../../src/l2/neuro/pipeline.ts';
import { busFixture, nmbAgent, opioid, vol } from '../helpers/neuro-bus.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `a${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: string, infusion = false) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) });
const yieldNow = () => new Promise((r) => setImmediate(r));
async function run(e: ReturnType<typeof createEngine>, toS: number): Promise<void> {
  for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t < toS; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  e.advanceTo(toS);
}
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
const VENT = { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 };
/** ≈ 1 MAC maintenance at 40 y on 7g's circle model [ENG input, not a model constant; 2.5 % measured on the merged
 * base]: if the measured end-tidal MAC is outside 0.9–1.1 in the depth test, change THIS dial (record it), never the DI band. */
const SEVO_1MAC = { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

describe('Stage 7f acceptance (engine)', { timeout: 600_000 }, () => {
  it('residual block at extubation (TOFR < 0.9, natural airway): smaller breaths than the unblocked control', async () => {
    const vt = async (roc: boolean) => {
      const e = createEngine({ seed: 21, patient: ADULT });
      const b: number[] = [];
      e.on((x) => { if (x.type === 'breath' && x.t > 1920) b.push(x.vtMl); }, ['breath']);
      e.dispatch(ev({ kind: 'airwayDevice', device: 'none' }));
      if (roc) e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
      await run(e, 2100);
      return b;
    };
    const blocked = await vt(true);
    const control = await vt(false);
    console.log(`residual block: VT ${mean(blocked).toFixed(0)} vs control ${mean(control).toFixed(0)} mL (ratio ${(mean(blocked) / mean(control)).toFixed(2)})`);
    expect(mean(control)).toBeGreaterThan(400);
    expect(mean(blocked)).toBeLessThan(0.75 * mean(control)); // 32–35 min on 7g's PK: TOF 3–4 with fade → weak + obstructed
  });
  it('depth bands through the engine: sevoflurane ≈ 1 MAC → displayed DI 38–48; off → conscious within 5–12 min [ENG band]', async () => {
    const e = createEngine({ seed: 22, patient: ADULT });
    const di: number[] = [];
    const mac: number[] = [];
    const marks: { t: number; k: string }[] = [];
    e.on((x: EngineEvent) => {
      if (x.type === 'measurement' && x.values.di?.value != null) di.push(x.values.di.value);
      if (x.type === 'measurement' && x.values.mac?.value != null) mac.push(x.values.mac.value);
      if (x.type === 'neuroMark') marks.push({ t: x.t, k: x.kind });
    });
    e.dispatch(cmd({ type: 'device', action: { device: 'depth', action: 'on' } } as Body));
    e.dispatch(ev(VENT));
    e.dispatch(ev(SEVO_1MAC));
    await run(e, 1800);
    const macNow = mean(mac.slice(-60));
    expect(macNow).toBeGreaterThan(0.9); // input check (the dial), not a model band
    expect(macNow).toBeLessThan(1.1);
    const last = mean(di.slice(-60));
    console.log(`depth: end-tidal MAC ${macNow.toFixed(2)} → displayed DI ${last.toFixed(1)}`);
    expect(last).toBeGreaterThan(38);
    expect(last).toBeLessThan(48);
    e.dispatch(ev({ ...SEVO_1MAC, dialPct: 0 }));
    await run(e, 1800 + 900);
    const wake = marks.find((m) => m.k === 'emergence' && m.t > 1800);
    console.log(`emergence ${wake ? ((wake.t - 1800) / 60).toFixed(1) : 'none'} min after the vaporiser is closed`);
    expect(wake && (wake.t - 1800) / 60).toBeGreaterThan(5);
    expect(wake && (wake.t - 1800) / 60).toBeLessThan(12);
  });
  it('no drugs: the neuro hook is neutral — spontaneous breaths keep Stage 3\'s size', async () => {
    const e = createEngine({ seed: 23, patient: ADULT });
    const b: EngineEvent[] = [];
    e.on((x) => b.push(x), ['breath']);
    await run(e, 120);
    const vts = b.map((x) => (x as { vtMl: number }).vtMl);
    expect(vts.length).toBeGreaterThan(20);
    expect(Math.min(...vts)).toBeGreaterThan(300);
  });
  it('CPU: the neuro step itself (PD + events; the PK is 7g\'s) costs ≤ 0.05 ms per 20 ms tick with every agent on the bus', () => {
    const ns = createNeuroState(ADULT, 24);
    applyNeuroCommand(ns, cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body), 0);
    applyNeuroCommand(ns, cmd({ type: 'device', action: { device: 'depth', action: 'on' } } as Body), 0);
    const bus = busFixture({
      cns: { propCe: 2, opioidCeRemiEq: 3, macBrain: 0.8, benzoCeMidazEq: 0.5, ketamineCe: 0.3 },
      nmb: { achGain: 1.5 },
      agents: {
        remifentanil: opioid(1, 1.2), fentanyl: opioid(1, 1),
        rocuronium: nmbAgent(700, 600, 0.6), succinylcholine: nmbAgent(20, 30, 1),
      },
      volatiles: { sevoflurane: vol(0.65, 1.8), n2o: vol(0.48, 104) },
    });
    const t0 = performance.now();
    for (let s = 1; s <= 3600; s++) {
      stepNeuroTo(ns, s, { tempC: 37, mechanical: true }, bus);
      ns.out.length = 0; // the engine flushes every tick
    }
    const perTick = (performance.now() - t0) / (3600 * 50);
    console.log(`neuro step CPU ${perTick.toFixed(4)} ms per 20 ms tick`);
    expect(perTick).toBeLessThan(0.05);
  });
});
