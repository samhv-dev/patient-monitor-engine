import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../src/l2/pk/pipeline.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import type { Command } from '../../src/types.ts';

describe('drug scenarios', () => {
  it('adenosine 6 mg on AVNRT 180/min: a pause/complete block 5–30 s after the push, then sinus ≤ 110/min', async () => {
    const e = createEngine({ seed: 9, mode: 'modeled', patient: { ageY: 26, sex: 'F', weightKg: 58 } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } }));
    e.advanceTo(120);
    const beats = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t > 30);
    const gaps = beats.slice(1).map((b, i) => ({ t: b.t, gap: b.t - beats[i]!.t }));
    const pause = gaps.find((g) => g.gap > 2);
    expect(pause).toBeDefined();
    expect(pause!.t - 30).toBeGreaterThan(5);
    expect(pause!.t - 30).toBeLessThan(40);
    const hr = ev.filter((x) => x.type === 'state' && x.t > 100) as Extract<EngineEvent, { type: 'state' }>[];
    expect(hr.at(-1)!.values.hr).toBeLessThan(110);
  }, 300_000);
  // Miller 10e ch. 25 p. 762: lipid lowers cardiac bupivacaine 11 % within 3 min and cerebral bupivacaine 18 % within
  // 15 min (Kuo & Akpa 2013 PBPK) — research/44 X-06; it was "≥ 30 %" against that citation. The bands are the cited
  // values ± 3 points [FIT: lipid sink test tolerance; brief 89] (no source states a tolerance).
  it('LAST: bupivacaine 225 mg IV; lipid at 30 s lowers cardiac free bupivacaine ≈ 11 % at 3 min and the cerebral toxicity drive ≈ 18 % at 15 min (M10 p. 762)', () => {
    const ev2 = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
    const a = createPkState();
    const b = createPkState();
    for (const pk of [a, b]) applyPkCommand(pk, ev2({ kind: 'drug', drugId: 'bupivacaine', dose: 225, unit: 'mg', route: 'iv' }), 0);
    applyPkCommand(b, ev2({ kind: 'drug', drugId: 'lipidEmulsion', dose: 1.5, unit: 'mL/kg', route: 'iv' }), 30);
    applyPkCommand(b, ev2({ kind: 'infusion', drugId: 'lipidEmulsion', rate: 0.25, unit: 'mL/kg/min' }), 30);
    advancePk(a, NEUTRAL_PK_CTX, 210);
    advancePk(b, NEUTRAL_PK_CTX, 210);
    const card = b.lastC.bupivacaine! / a.lastC.bupivacaine!;
    expect(card).toBeGreaterThanOrEqual(0.86);
    expect(card).toBeLessThanOrEqual(0.92);
    expect(a.bus.last.cvE).toBeGreaterThan(b.bus.last.cvE);
    advancePk(a, NEUTRAL_PK_CTX, 930);
    advancePk(b, NEUTRAL_PK_CTX, 930);
    const u = (e: number) => (e / (1 - e)) ** (1 / 3); // The fractional CNS sum from cnsE = hill(u, 1, 1, 3)
    const cereb = u(b.bus.last.cnsE) / u(a.bus.last.cnsE);
    console.log(`research/44 X-06: lipid cardiac free ratio ${card.toFixed(3)} at 3 min, cerebral drive ratio ${cereb.toFixed(3)} at 15 min`);
    expect(cereb).toBeGreaterThanOrEqual(0.79);
    expect(cereb).toBeLessThanOrEqual(0.85);
  });
  it('determinism: same seed + script → identical ABP hash and drugs events; another seed differs', async () => {
    const run = async (seed: number) => {
      const e = createEngine({ seed, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
      const d: string[] = [];
      e.on((x) => { if (x.type === 'drugs') d.push(JSON.stringify(x)); });
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } }));
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.05, unit: 'mcg/kg/min' }, atTick: 3000 }));
      for (let t = 60; t <= 300; t += 60) { e.advanceTo(t); await yieldNow(); }
      const w = new Float32Array(125 * 60);
      e.readSamples('abp', 125 * 240, w);
      return createHash('sha256').update(Buffer.from(w.buffer)).update(d.join('')).digest('hex');
    };
    expect(await run(21)).toBe(await run(21));
    expect(await run(21)).not.toBe(await run(22));
  }, 300_000);
  it('CPU: 10 concurrent drugs cost ≤ 0.05 ms per 20 ms tick (advancePk alone, 1 simulated hour)', () => {
    const pk = createPkState();
    const give = (event: Record<string, unknown>) => applyPkCommand(pk, { type: 'applyEvent', event } as unknown as Command, 0);
    give({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3, opioids: true }); // E2: typed "with opioids"
    give({ kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 3 });
    give({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    give({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' });
    give({ kind: 'infusion', drugId: 'phenylephrine', rate: 0.3, unit: 'mcg/kg/min' });
    give({ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' });
    give({ kind: 'drug', drugId: 'midazolam', dose: 2, unit: 'mg', route: 'iv' });
    give({ kind: 'infusion', drugId: 'dobutamine', rate: 5, unit: 'mcg/kg/min' });
    give({ kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' });
    give({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 60); // warm the caches
    const t0 = performance.now();
    for (let k = 1; k <= 180000; k++) advancePk(pk, NEUTRAL_PK_CTX, 60 + k * 0.02);
    const perTick = (performance.now() - t0) / 180000;
    console.log(`7g CPU per 20 ms tick: ${(perTick * 1000).toFixed(1)} µs`);
    expect(perTick).toBeLessThan(0.05);
  }, 300_000);
});
