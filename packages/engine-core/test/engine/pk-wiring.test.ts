import { describe, expect, it } from 'vitest';
import { runPk } from '../helpers/pk.ts';

describe('Stage 7g engine wiring', () => {
  it('every library drug id — 7c-owned and shared ids included — is accepted by 7g (R51 §3); unknown ids are rejected', async () => {
    const r = await runPk({}, [
      [1, { kind: 'drug', drugId: 'unobtainium', dose: 1, unit: 'mg', route: 'iv' }],
      [2, { kind: 'drug', drugId: 'remifentanil', dose: 1, unit: 'mcg/kg', route: 'iv' }],
      [3, { kind: 'drug', drugId: 'succinylcholine', dose: 1, unit: 'mg/kg', route: 'iv' }],
      [4, { kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }],
      [5, { kind: 'drug', drugId: 'epinephrine', dose: 10, unit: 'mcg', route: 'iv' }],
    ], 60);
    expect(r.rejected).toEqual(['unknown drug unobtainium']);
    const pk = (r.e.snapshot().state as { st: { pk: { bus: { agents: Record<string, unknown> } } } }).st.pk;
    expect(Object.keys(pk.bus.agents).sort()).toEqual(['calciumChloride', 'epinephrine', 'remifentanil', 'succinylcholine']);
  }, 120_000);
  it('a pk rhythm request also resets the rhythm clock like the engine paths: adenosine converts AVNRT at 95/min', async () => {
    const { createEngine } = await import('../../src/engine.ts');
    const { cmd } = await import('../helpers/hemo.ts');
    const e = createEngine({ seed: 5 }); // MANUAL: nothing else writes ps.hr
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } }));
    e.advanceTo(90);
    const st = (e.snapshot().state as { st: { rhythm: { id: string }; hr: { to: number } } }).st;
    expect(st.rhythm.id).toBe('sinus');
    expect(st.hr.to).toBe(95); // constantRamp(startRate('sinus', { rateBpm: 95 }))
  }, 120_000);
  it('phenylephrine 100 µg through the NEW path: MAP +15–25 (decision 4 prototype +21.6)', async () => {
    const r = await runPk({}, [[120, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 240);
    const d = Math.max(r.map(150, 160), r.map(170, 180), r.map(190, 200)) - r.map(100, 120);
    expect(d).toBeGreaterThanOrEqual(15);
    expect(d).toBeLessThanOrEqual(25);
  }, 300_000);
  it('snapshot/restore mid-infusion continues identically', async () => {
    const { createEngine } = await import('../../src/engine.ts');
    const { cmd } = await import('../helpers/hemo.ts');
    const a = createEngine({ seed: 5, mode: 'modeled' });
    a.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } }));
    a.advanceTo(120);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 5, mode: 'modeled' });
    b.restore(snap);
    a.advanceTo(300);
    b.advanceTo(300);
    const pa = (a.snapshot().state as { st: { pk: { drugs: Record<string, { x: number[] }> } } }).st.pk.drugs.propofol!.x;
    const pb = (b.snapshot().state as { st: { pk: { drugs: Record<string, { x: number[] }> } } }).st.pk.drugs.propofol!.x;
    expect(pb).toEqual(pa);
  }, 300_000);
  it('a β-blocker drug blunts 7e’s catecholamine-surge multiplier (R51 addendum 11)', async () => {
    const { createCircModel, RESTING_ENV } = await import('../../src/l2/circ/model.ts');
    const { driver, runTo } = await import('../helpers/circ.ts');
    const hrAfter = (endoHrF: number, betaBlockAdd: number) => {
      const m = createCircModel();
      const dr = driver(m);
      runTo(dr, 10, { ...RESTING_ENV });
      m.ext.endoHrF = endoHrF; // a 7e surge
      m.ext.betaBlockAdd = betaBlockAdd;
      runTo(dr, 70, { ...RESTING_ENV });
      return m.hrModel;
    };
    const rest = hrAfter(1, 0);
    const surge = hrAfter(1.3, 0);
    const blocked = hrAfter(1.3, 0.8);
    expect(surge - rest).toBeGreaterThan(5);
    expect(blocked - rest).toBeLessThan(0.5 * (surge - rest)); // betaBlunt: 1 + 0.3·0.2 = 1.06 plus the reflex arm's blunting
  }, 120_000);
});
