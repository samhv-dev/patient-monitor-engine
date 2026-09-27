import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import { organsRig } from '../helpers/organs.ts';

const hemoOf = (e: unknown) => (e as { st: { hemo: HemoState } }).st.hemo;

describe('kidney through the engine', { timeout: 300_000 }, () => {
  it('MANUAL haemorrhage (volumeStatus 0.2, MAP ≈ 60) → UOP < 0.3 and the OLIGURIA flag (tables 17a); fluids → > 0.5 by 90 min', async () => {
    const r = organsRig({ seed: 6, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'urometer', state: 'on' });
    await r.run(600);
    const rest = r.last().kidney.uopMlKgH;
    r.send({ type: 'setTarget', variable: 'volumeStatus', value: 0.2, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'sbp', value: 85, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'hr', value: 125, ramp: { durationS: 600 } });
    await r.run(1800);
    const oliguric = r.last().kidney.uopMlKgH;
    const flag = r.last().kidney.oliguria;
    const lacBleed = r.last().liver.lactate;
    r.send({ type: 'setTarget', variable: 'volumeStatus', value: 0.95, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'sbp', value: 118, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 72, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'hr', value: 85, ramp: { durationS: 900 } });
    await r.run(5400);
    const recovered = r.last().kidney.uopMlKgH;
    console.log({ rest, oliguric, flag, lacBleed, recovered, lactateEnd: r.last().liver.lactate }); // gate-note numbers
    expect(rest).toBeGreaterThan(0.8); // prototype 1.02 (the MANUAL default 120/80 site)
    expect(oliguric).toBeLessThan(0.3); // tables 17a
    expect(flag).toBe(true);
    expect(recovered).toBeGreaterThan(0.5); // [ENG band] neurohumoral washout τ 45 min (Task 9)
  });
  // Tables §7 check 20 premise: MAP 65, CVP 12, CO 3.5 (RPP 53). MODELED `hfref` severity 1 still does not reach it (MANUAL
  // reaches it since FU-2 item 7: next test). Plan text, pre-FU-2: MANUAL `contractility`/`svr` targets did not move 7a's CO, and MODELED `hfref` severity 1
  // rests compensated (MAP 87, CVP 8, CO 5.6 → UOP 0.66; dobutamine 5: CO +13 %, UOP 0.84 at 60 min; G7g NR-7g-2).
  // R45: not re-specified. The kidney's check-20 numbers are Task 9's (model level, 0.114 → 0.233/0.284). FU-2 request
  // to 7a's owner for a low-output HFrEF profile; flip to `it` when it lands.
  it.fails('check 20 (MODELED hfref): low-output premise, UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min', async () => {
    const r = organsRig({ seed: 7, mode: 'modeled', patient: { weightKg: 70, conditions: [{ id: 'hfref', severity: 1 }] } });
    await r.run(3600);
    const co0 = cardiacOutput(hemoOf(r.e), 0);
    const pre = { map: r.last().brain.mapHead, co: co0, uop: r.last().kidney.uopMlKgH };
    r.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min', route: 'iv', infusion: true } });
    await r.run(1800);
    const u30 = r.last().kidney.uopMlKgH;
    await r.run(1800);
    const post = { co: cardiacOutput(hemoOf(r.e), 0), u30, u60: r.last().kidney.uopMlKgH };
    console.log({ pre, post });
    expect(pre.map).toBeLessThanOrEqual(70); // premise (prototype 87)
    expect(pre.co).toBeLessThanOrEqual(4); // premise (prototype 5.6)
    expect(pre.uop).toBeGreaterThanOrEqual(0.1);
    expect(pre.uop).toBeLessThanOrEqual(0.15);
    expect(post.co / pre.co).toBeGreaterThanOrEqual(1.2);
    expect(post.u30).toBeGreaterThanOrEqual(0.2);
    expect(post.u60).toBeLessThanOrEqual(0.3);
  });
  // FU-2 item 7 made the check-20 premise reachable in MANUAL (contractility 0.3, CVP 12, 85/55). Measured on this branch
  // (seed 7): MAP 67.9, CO 3.35 L/min, UOP 0.067 (tables 0.1–0.15: MISS, low); 7g dobutamine 5 µg/kg/min → CO 4.35 (+30 %,
  // in band), UOP 0.244 at 30 min (in band) and 0.342 at 60 min (MISS, high). Diagnosis: the kidney's effective-volume
  // reference is max(0.08 L/min/kg, the start CO) and the MANUAL adult starts at a higher CO than the model-level
  // reference 5.6, so CO 3.35 reads as a deeper low-output state (V at its floor) than the model's CO 3.5/5.6. R45: not
  // re-tuned here — calibration item (Q-7D-c20: the effective-volume reference CO, decision 10) for Ali's pass.
  it.fails('check 20 (MANUAL contractility, FU-2): premise UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min', async () => {
    const r = organsRig({ seed: 7, patient: { weightKg: 70, baseline: { hr: 80 }, sensors: { abp: 'connected', cvp: 'connected' } } });
    await r.run(20);
    r.send({ type: 'setTarget', variable: 'sbp', value: 85 });
    r.send({ type: 'setTarget', variable: 'dbp', value: 55 });
    r.send({ type: 'setTarget', variable: 'cvp', value: 12 });
    r.send({ type: 'setTarget', variable: 'contractility', value: 0.3 });
    await r.run(3600);
    const pre = { map: r.last().brain.mapHead, co: cardiacOutput(hemoOf(r.e), 0), uop: r.last().kidney.uopMlKgH };
    r.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min', route: 'iv', infusion: true } });
    await r.run(1800);
    const u30 = r.last().kidney.uopMlKgH;
    const co30 = cardiacOutput(hemoOf(r.e), 0);
    await r.run(1800);
    const post = { co30, u30, u60: r.last().kidney.uopMlKgH };
    console.log('check 20 MANUAL', { pre, post });
    expect(pre.map).toBeGreaterThanOrEqual(60); // premise (68)
    expect(pre.map).toBeLessThanOrEqual(72);
    expect(pre.co).toBeLessThanOrEqual(4); // premise (3.35)
    expect(post.co30 / pre.co).toBeGreaterThanOrEqual(1.2); // 1.30
    expect(post.co30 / pre.co).toBeLessThanOrEqual(1.4);
    expect(pre.uop).toBeGreaterThanOrEqual(0.1); // 0.067 — the miss
    expect(pre.uop).toBeLessThanOrEqual(0.15);
    expect(post.u30).toBeGreaterThanOrEqual(0.2); // 0.244
    expect(post.u60).toBeLessThanOrEqual(0.3); // 0.342 — the miss
  });
});
