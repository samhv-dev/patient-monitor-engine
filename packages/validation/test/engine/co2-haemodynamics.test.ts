// Acceptance: the circulation's answer to acute hypercapnia, against Cullen & Eger's awake volunteers.
//
// Source (the band is the paper's, not the engine's): in 41 awake, unanaesthetised volunteers a rise of PaCO2 from 39
// to 50 mmHg raised the cardiac index, the heart rate, the stroke index, the contractility indices and forearm blood
// flow, and LOWERED total peripheral resistance (Cullen DJ, Eger EI 2nd, "Cardiovascular effects of carbon dioxide in
// man", Anesthesiology 1974;41:345–349, PMID 4412334). The paper's own table was not available to the author of this
// test, so what is asserted is its three unambiguous SIGNS — cardiac output up, heart rate up, systemic resistance
// down — each by more than the paired normocapnic arm's own drift over the same windows (measured below), and the
// magnitudes are printed and recorded rather than banded.
//
// The mechanisms under test (docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md §2.5, 2026-10-28): CO2's direct
// vasodilation (l2/circ/model.ts `co2VascularF`, 0.4 %/mmHg, Walley 1990 after propranolol), its direct myocardial
// depression (l2/blood/circ-adapter.ts `chemistryContractility`, 0.4 %/mmHg) and the hypercapnic sympathetic limb of
// the endocrine stress bus (l2/endo/params.ts SYMP_HYPERCAPNIA_*, Somers 1989). Before 2026-10-28 the engine answered
// hypercapnia with an independent pressor multiplier on HR and SVR and failed two of the three signs: this rig run
// against dea151c4's physiology gave PaCO2 38.1 → 50.8 with SVR ×1.0054 (it ROSE), HR +0.3 bpm, CO ×1.0042 and the
// contractility factor 1.0078 → 1.0356 (it rose where Walley measured a fall).
// Measured here on this head: PaCO2 38.1 → 50.7, CO ×1.0109, SVR ×0.9864, HR +5.3 bpm, MAP −0.5 mmHg, LV
// contractility factor 1.0075 → 1.0053; the normocapnic arm drifts CO ×1.0020, SVR ×1.0001, HR −0.2.
//
// Residuals, stated: (1) the engine's cardiac-output rise is far smaller than the paper's (+1.1 % against a clearly
// raised cardiac index), because the only CO2-driven adrenergic support in the engine is the small hypercapnic arm of
// the stress bus, and Walley's propranolol arm shows the β-adrenergic limb is what carries the output rise in life;
// (2) the paper's contractility indices ROSE, where the engine's Emax factor ends flat — those indices are rate- and
// load-dependent, and what the engine carries is Walley's Emax depression with the sympathetic support against it.
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';

let seq = 0;
const applyEvent = (event: Record<string, unknown>): Command => ({ id: `co2-${++seq}`, issuedBy: 'test', type: 'applyEvent', event } as unknown as Command);

interface Tap { co: number; svr: number; map: number; hr: number; paco2: number; kLv: number }
interface Mean { co: number; svr: number; map: number; hr: number }

const num = (x: unknown): number => (typeof x === 'number' ? x : Number.NaN);
const at = (tree: Record<string, unknown> | null, path: string): unknown => {
  let o: unknown = tree;
  for (const k of path.split('.')) o = o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined;
  return o;
};

function tap(e: MonitorEngine): Tap {
  const t: Tap = { co: Number.NaN, svr: Number.NaN, map: Number.NaN, hr: Number.NaN, paco2: Number.NaN, kLv: Number.NaN };
  e.on((x: EngineEvent) => {
    if (x.type === 'circ') { t.co = x.co; t.svr = x.svr; }
    else if (x.type === 'measurement') {
      const m = x.values.abpMean; if (m && m.value !== null) t.map = m.value;
      const h = x.values.hr; if (h && h.value !== null) t.hr = h.value;
    } else if (x.type === 'truth') {
      const tree = x.tree as unknown as Record<string, unknown>;
      t.paco2 = num(at(tree, 'resp.co2.pf'));
      t.kLv = num(at(tree, 'hemo.circ.kLv'));
    }
  });
  return t;
}

/** Advance to `t1` sampling every second, and return the mean of the last `windowS` seconds. */
async function run(e: MonitorEngine, t: Tap, t1: number, windowS = 0): Promise<Mean> {
  const keep: Tap[] = [];
  for (let u = e.now().simT + 1; u <= t1 + 1e-9; u += 1) {
    e.advanceTo(u);
    if (windowS > 0 && u > t1 - windowS && Number.isFinite(t.co) && Number.isFinite(t.map)) keep.push({ ...t });
    if (Math.round(u) % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  const m = (f: (x: Tap) => number) => keep.reduce((a, x) => a + f(x), 0) / Math.max(1, keep.length);
  return { co: m((x) => x.co), svr: m((x) => x.svr), map: m((x) => x.map), hr: m((x) => x.hr) };
}

/** A resting, paralysed, unanaesthetised MODELED adult on volume control; `step` is applied at 300 s. */
async function arm(step: { rr: number; vtMl: number }): Promise<{ base: Mean; end: Mean; paco2: [number, number]; kLv: [number, number] }> {
  const e = createEngine({
    seed: 7, mode: 'modeled', truthHz: 1,
    patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on' } },
  } as never);
  const t = tap(e);
  await run(e, t, 1);
  for (const c of [
    applyEvent({ kind: 'airwayDevice', device: 'ett' }),
    applyEvent({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 460, peep: 5, fio2: 0.5 }),
    applyEvent({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }),
  ]) expect(e.dispatch(c).accepted).toBe(true);
  const base = await run(e, t, 300, 180);
  const paco2Base = t.paco2;
  const kLvBase = t.kLv;
  expect(e.dispatch(applyEvent({ kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.5, ...step })).accepted).toBe(true);
  const end = await run(e, t, 1200, 180); // 15 min of the step; the block is still deep at 20 min
  return { base, end, paco2: [paco2Base, t.paco2], kLv: [kLvBase, t.kLv] };
}

describe('acute hypercapnia in a resting patient (Cullen & Eger 1974, PMID 4412334)', { timeout: 300_000 }, () => {
  it('PaCO2 ≈ 39 → ≈ 50: cardiac output and heart rate RISE and systemic resistance FALLS, each beyond the normocapnic arm\'s drift', async () => {
    const hi = await arm({ rr: 12, vtMl: 330 });
    const ctl = await arm({ rr: 12, vtMl: 460 });
    const rel = (a: Mean, b: Mean) => ({ co: a.co / b.co, svr: a.svr / b.svr, map: a.map - b.map, hr: a.hr - b.hr });
    const h = rel(hi.end, hi.base);
    const c = rel(ctl.end, ctl.base);
    console.log(`Cullen & Eger rig: hypercapnic PaCO2 ${hi.paco2[0].toFixed(1)} → ${hi.paco2[1].toFixed(1)}, CO ×${h.co.toFixed(4)}, SVR ×${h.svr.toFixed(4)}, HR ${h.hr >= 0 ? '+' : ''}${h.hr.toFixed(1)}, MAP ${h.map >= 0 ? '+' : ''}${h.map.toFixed(1)} mmHg, kLv ${hi.kLv[0].toFixed(4)} → ${hi.kLv[1].toFixed(4)}`);
    console.log(`Cullen & Eger rig: control PaCO2 ${ctl.paco2[0].toFixed(1)} → ${ctl.paco2[1].toFixed(1)}, CO ×${c.co.toFixed(4)}, SVR ×${c.svr.toFixed(4)}, HR ${c.hr >= 0 ? '+' : ''}${c.hr.toFixed(1)}, MAP ${c.map >= 0 ? '+' : ''}${c.map.toFixed(1)} mmHg`);
    // The step lands inside the paper's range
    expect(hi.paco2[0]).toBeGreaterThan(36);
    expect(hi.paco2[0]).toBeLessThan(42);
    expect(hi.paco2[1]).toBeGreaterThan(46);
    expect(hi.paco2[1]).toBeLessThan(54);
    // The paper's three signs, each clear of the control arm's own drift over the same windows
    expect(h.co).toBeGreaterThan(c.co);
    expect(h.co).toBeGreaterThan(1);
    expect(h.svr).toBeLessThan(c.svr);
    expect(h.svr).toBeLessThan(1);
    expect(h.hr).toBeGreaterThan(c.hr + 1);
    expect(h.hr).toBeGreaterThan(1);
  });
});
