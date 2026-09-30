// FU-8 Task A19 (F6, G-FU4 2026-09-29; plan D5; orchestrator ruling 3): after the exsanguination arrest the circulation
// drained to NEGATIVE chamber volumes and the monitor showed a negative CVP (origin/main 0fd5397: VRV −273, VLV −62 mL,
// displayed CVP −2.9 … −1.0, min −3.5). Option D — an outflow limiter (size-scaled) plus collapse floors — removes them.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

type Circ = { s: number[]; p: { v0Sv: number } };
async function classIv(): Promise<{ minVol: number; minCvp: number }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on' } } });
  const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as never;
  e.advanceTo(1);
  e.dispatch({ id: 'a', issuedBy: 'test', ...(ev({ kind: 'airwayDevice', device: 'ett' }) as object) } as never);
  e.dispatch({ id: 'b', issuedBy: 'test', ...(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }) as object) } as never);
  e.advanceTo(60);
  e.dispatch({ id: 'c', issuedBy: 'test', ...(ev({ kind: 'bleed', volumeMl: 2500, overS: 600 }) as object) } as never);
  let minVol = Infinity;
  let minCvp = Infinity;
  e.on((x) => {
    if (x.type === 'measurement' && x.values.cvpMean?.value != null) minCvp = Math.min(minCvp, x.values.cvpMean.value);
  }, ['measurement']);
  for (let t = 600; t <= 1200; t += 10) {
    e.advanceTo(t);
    const c = (e as unknown as { st: { hemo: { circ: Circ } } }).st.hemo.circ;
    for (const i of [5, 6, 9, 10]) minVol = Math.min(minVol, c.s[i] as number); // VRA, VRV, VLA, VLV (mL)
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  console.log(`fu8 A19: min chamber volume ${minVol.toFixed(0)} mL, min displayed CVP ${minCvp.toFixed(1)} mmHg`);
  return { minVol, minCvp };
}

describe('FU-8 A19 (F6): the empty circulation after an exsanguination arrest', () => {
  let run: ReturnType<typeof classIv> | undefined;
  it('no chamber volume below 0 mL in 600–1200 s of the class IV rig (origin/main: VRV −273, VLV −62 mL)', async () => {
    expect((await (run ??= classIv())).minVol).toBeGreaterThanOrEqual(0);
  }, 120_000);
  it('the displayed CVP stays ≥ −0.5 mmHg on PPV after the arrest (origin/main: −2.9 … −1.0, min −3.5; one display unit of noise)', async () => {
    expect((await (run ??= classIv())).minCvp).toBeGreaterThanOrEqual(-0.5);
  }, 120_000);
  it('the limiter scales with the heart: a 3.5 kg neonate keeps its resting output (0.31 L/min without the limiter; an absolute 5 mL gave 0.165)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 0.01, sex: 'M', weightKg: 3.5, sensors: { abp: 'connected' } } });
    for (let t = 60; t <= 600; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const co = (e as unknown as { st: { hemo: { circ: { qFwd: number } } } }).st.hemo.circ.qFwd * 0.06;
    console.log(`fu8 A19: neonate resting CO ${co.toFixed(3)} L/min`);
    expect(co).toBeGreaterThanOrEqual(0.29);
  }, 120_000);
});

type Cpr = { mapNow: number; qFwd: number };
async function cprMap(tamponade: boolean): Promise<{ map: number; fwd: number }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', cvp: 'connected' } } });
  let n = 0;
  const ev = (event: Record<string, unknown>) => e.dispatch({ id: `t${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  e.advanceTo(1);
  ev({ kind: 'airwayDevice', device: 'ett' });
  ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  e.advanceTo(60);
  if (tamponade) ev({ kind: 'condition', id: 'tamponade', severity: 1 });
  else e.dispatch({ id: 'vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse' } as never);
  let t0 = tamponade ? -1 : 120;
  if (tamponade) {
    e.advanceTo(300);
    ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    for (let t = 301; t <= 900 && t0 < 0; t++) {
      e.advanceTo(t);
      const r = (e as unknown as { st: { rhythm: { opts: { pulseless?: boolean } } } }).st.rhythm;
      if (r.opts.pulseless === true) t0 = t + 60; // CPR from PEA + 60 s (research/20 DV-04a)
    }
  }
  e.advanceTo(t0);
  ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
  let map = 0;
  let fwd = 0;
  let k = 0;
  for (let t = t0 + 60; t <= t0 + 480; t += 5) {
    e.advanceTo(t);
    const c = (e as unknown as { st: { hemo: { circ: Cpr } } }).st.hemo.circ;
    map += c.mapNow;
    fwd += c.qFwd * 0.06;
    k++;
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { map: map / k, fwd: fwd / k };
}

describe('FU-8 A19 (research/20 DV-04a): CPR on a tamponaded heart', () => {
  it('severe tamponade + propofol → PEA → CPR q 0.8: the arterial mean stays at or below VF-CPR\'s and the forward flow under 1 L/min (origin/main 3feee6f: MAP 154 (181/124) against 46, 11.9 L/min — the chambers pumped against a tense pericardium from negative volumes)', async () => {
    const tamp = await cprMap(true);
    const vf = await cprMap(false);
    console.log(`fu8 A19 DV-04a: tamponade CPR MAP ${tamp.map.toFixed(1)}, forward ${tamp.fwd.toFixed(2)} L/min; VF CPR MAP ${vf.map.toFixed(1)}, ${vf.fwd.toFixed(2)} L/min`);
    expect(tamp.map).toBeLessThanOrEqual(vf.map);
    expect(tamp.fwd).toBeLessThan(1);
  }, 180_000);
});
