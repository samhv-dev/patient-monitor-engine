// CPR over a heart that still beats (the class IV haemorrhage card's pseudo-PEA: junctional 50/min, ART about 20/14):
// the coronary supply is the compressions' relaxation-phase perfusion pressure, so the course does not depend on the
// sub-second phase at which the compressions start against the escape beats. Found on #208 (escape onset): moving the
// junctional escape's first beat by 0.34 s turned the showcase run from "no arrest" into an engine-declared arrest at
// 661 s and a return of circulation at 781 s. The beat-by-beat CoPP read the LV pressure at each beat's onset, an instant
// of the compression cycle (5 escape beats = 11 compressions, so the pattern locked): with the CPR press moved 0.1–0.9 s
// on main, 6 of 9 presses arrested at 661–663 s, 2 at 670 s, 1 not at all. MODELED, seed 7, the card's patient.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type Tree = { hemo: { lastSite?: { sbp?: number }; circ: { cor: { kIsch: number }; arrest: unknown } } };

describe('CPR over a beating heart: the coronary supply does not alias the compressions against the beats', () => {
  it('the myocardium 24 s into CPR and the arrest declaration are the same whichever 0.15 s step of a compression cycle CPR starts on', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', truthHz: 1, patient: { ageY: 35, sex: 'M', weightKg: 75, heightCm: 178, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' } } } as never);
    let tree: Tree | null = null;
    e.on((x) => {
      if (x.type === 'truth') tree = (x as unknown as { tree: Tree }).tree;
    }, ['truth']);
    let n = 0;
    const cmd = (c: Record<string, unknown>) => e.dispatch({ id: `c${++n}`, issuedBy: 'test', ...c } as never);
    const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
    const sbp = () => (tree as Tree | null)?.hemo.lastSite?.sbp ?? 120;
    ev({ kind: 'bleed', volumeMl: 2500, overS: 600 });
    e.advanceTo(60);
    ev({ kind: 'airwayDevice', device: 'ett' });
    ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 1 });
    // the card's two rules: junctional 50 once the systolic stays below 60 for 10 s; "PEA" once it stays below 25 for 10 s
    let below60 = 0;
    let below25 = 0;
    let junctional = false;
    let tPea = -1;
    for (let t = 61; t <= 900 && tPea < 0; t++) {
      e.advanceTo(t);
      below60 = sbp() < 60 ? below60 + 1 : 0;
      below25 = sbp() < 25 ? below25 + 1 : 0;
      if (!junctional && below60 >= 10) {
        junctional = true;
        cmd({ type: 'setRhythm', rhythm: 'junctionalEscape', opts: { rateBpm: 50 }, when: 'nextBeat' });
      }
      if (junctional && below25 >= 10) tPea = t;
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
    expect(tPea).toBeGreaterThan(0);
    const t0 = tPea + 10; // CPR 10 s into the "PEA", as the showcase presses it
    e.advanceTo(t0);
    const snap = e.snapshot();
    const runs: Array<{ off: number; kIsch: number; arrested: boolean }> = [];
    for (const off of [0, 0.15, 0.3, 0.45]) {
      e.restore(snap);
      e.advanceTo(t0 + off);
      ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
      ev({ kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 500, peep: 5, fio2: 1 });
      let arrested = false;
      for (let t = Math.ceil(t0 + off); t <= t0 + 24; t++) {
        e.advanceTo(t);
        arrested ||= (tree as Tree | null)?.hemo.circ.arrest != null;
      }
      runs.push({ off, kIsch: (tree as Tree | null)?.hemo.circ.cor.kIsch ?? NaN, arrested });
      await new Promise((r) => setImmediate(r));
    }
    const ks = runs.map((r) => r.kIsch);
    // eslint-disable-next-line no-console
    console.log('CPR over a beating heart (offset s → kIsch at +24 s, arrested):', runs.map((r) => `${r.off}: ${r.kIsch.toFixed(3)} ${r.arrested}`).join(' · '));
    expect(Math.max(...ks) - Math.min(...ks)).toBeLessThan(0.03);
    expect(new Set(runs.map((r) => r.arrested)).size).toBe(1);
  }, 600_000);
});
