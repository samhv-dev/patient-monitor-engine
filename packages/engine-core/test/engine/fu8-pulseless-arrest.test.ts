// FU-8 Task A21 (research/20 DV-01b, gap V1): every pulseless state carries the arrest state (MODELED). Ventilated
// adult 40 y. Before FU-8 (origin/main 3feee6f): only the engine's own declaration created `circ.arrest`, so a PEA made
// by a shock or set by the instructor never decayed and never regained a pulse — 0 of 11 shock-made PEAs under 8 min of
// CPR at CoPP 27–28 with a myocardial state of 1.00.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { rhythm: { id: string; opts: { pulseless?: boolean; rateBpm?: number } }; hemo: { circ: { arrest: { t: number; cause: string } | null } } };
function rig(seed = 7) {
  const e = createEngine({ seed, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}
const pulseless = (s: St) => s.rhythm.opts.pulseless === true || ['agonal', 'asystole', 'vfCoarse', 'vfFine'].includes(s.rhythm.id);
async function course(r: ReturnType<typeof rig>, t0: number, t1: number) {
  const seen: string[] = [];
  let arrestT: number | null = null;
  let pulseAt: number | null = null;
  let wasPea = false;
  for (let t = t0; t <= t1; t += 1) {
    r.e.advanceTo(t);
    const s = r.st();
    const k = `${s.rhythm.id}${s.rhythm.opts.pulseless ? '(pulseless)' : ''}`;
    if (seen.at(-1) !== k) seen.push(k);
    if (arrestT === null && s.hemo.circ.arrest) arrestT = s.hemo.circ.arrest.t;
    if (s.rhythm.opts.pulseless === true) wasPea = true;
    if (wasPea && pulseAt === null && !pulseless(s)) pulseAt = t;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return { seen, arrestT, pulseAt };
}

describe('FU-8 A21: every pulseless state carries the arrest state', () => {
  it('a PEA made by a SHOCK (seed 2: VF 60 s → 200 J → pulseless sinus) regains a pulse under CPR q 0.8 (research/20 DV-01b; before FU-8: none of 11 in 8 min)', async () => {
    const r = rig(2);
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    r.e.advanceTo(111);
    r.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } });
    r.e.advanceTo(120);
    r.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
    r.e.advanceTo(140);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const c = await course(r, 141, 620);
    console.log(`fu8 A21 shock-PEA: ${c.seen.join(' → ')}; arrest state from ${c.arrestT}; pulse at ${c.pulseAt}`);
    expect(c.seen).toContain('sinus(pulseless)');
    expect(c.arrestT).not.toBeNull();
    expect(c.pulseAt).not.toBeNull();
  }, 120_000);
  it('an instructor PEA (sinus, pulseless, at 60 s) with CPR q 0.8 from 80 s regains a pulse within 5 min, and carries the arrest state from its onset', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } });
    r.e.advanceTo(80);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const c = await course(r, 81, 380);
    console.log(`fu8 A21 instructor PEA + CPR: ${c.seen.join(' → ')}; arrest state from ${c.arrestT}; pulse at ${c.pulseAt}`);
    expect(c.arrestT).not.toBeNull();
    expect(c.arrestT as number).toBeLessThanOrEqual(62);
    expect(c.pulseAt).not.toBeNull();
  }, 120_000);
  it('an untreated instructor PEA decays: slower, then idioventricular (agonal), within 15 min (FU-4 F5; before FU-8 it held its rate for ever)', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } });
    const c = await course(r, 61, 960);
    console.log(`fu8 A21 untreated instructor PEA: ${c.seen.join(' → ')}`);
    expect(c.seen.some((k) => k.startsWith('agonal') || k === 'asystole')).toBe(true);
  }, 120_000);
});
