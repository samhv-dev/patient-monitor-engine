// One `drug` command, two consumers (R51 §2): 7g's circulation PD moves the MAP (through 7a), 7f's PD moves the depth
// index. The anaesthetic reflex blunting comes from 7g alone (addendum 8): 7f adds no second baroreflex factor.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `c${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
const VENT = { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

async function reflexDrop(sevo: boolean): Promise<number> {
  const e = createEngine({ seed: 31, mode: 'modeled', patient: ADULT });
  const hr: { t: number; v: number }[] = [];
  e.on((x: EngineEvent) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr.push({ t: x.t, v: x.values.hr.value }); }, ['measurement']);
  e.dispatch(ev(VENT));
  if (sevo) e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 })); // ≈ 1 MAC at 20 min (Task 17's dial)
  for (let t = 60; t <= 1200; t += 60) { e.advanceTo(t); await yieldNow(); }
  const before = mean(hr.filter((h) => h.t > 1140).map((h) => h.v));
  e.dispatch(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }));
  for (let t = 1260; t <= 1380; t += 60) { e.advanceTo(t); await yieldNow(); }
  return before - Math.min(...hr.filter((h) => h.t > 1200).map((h) => h.v));
}

describe('7f and the circulation (R51 §2, addendum 8)', { timeout: 300_000 }, () => {
  // R-7f-9 (→ 7g, circulation PD; R51 addendum 8). Before FU-3, at 0.96 MAC (dial 2.5 %) the HR fell 93.5 → 68 (−25.5
  // bpm; MAP 86.4 → 99.3) against 73.0 → 61 awake (−12.0; MAP 95.5 → 114.3). 7g's volatile gv (×0.71) DID reach 7a's
  // stepBaro, but the sevoflurane hypotension (MAP 81.6 vs set 89) held e_s at +7.3 on the steep ACTIVATION side of the
  // reflex (HR arm ×1.21; tables T6.3 and Ebert 1995: HR unchanged), so phenylephrine merely undid that tachycardia.
  // FU-3: the volatile rows depress the sympathetic HR arm (`gvHr`) as propofol's does (Muzi & Ebert 1995 cardiac
  // baroslopes; fit: Ebert, Muzi & Lopatka 1995 HR unchanged) — see the rows. 7f adds no baroreflex factor (addendum 8).
  it('[R-7f-9] ≈ 1 MAC sevoflurane blunts the reflex bradycardia to phenylephrine 100 µg by ≥ 20 % — through 7g alone', async () => {
    const awake = await reflexDrop(false);
    const anaes = await reflexDrop(true);
    console.log(`reflex HR drop: awake ${awake.toFixed(1)}, sevoflurane ${anaes.toFixed(1)} bpm`);
    expect(awake).toBeGreaterThan(3);
    expect(anaes).toBeLessThan(0.8 * awake);
  });
  it('propofol 2 mg/kg: one command moves both the circulation (7g → 7a: MAP falls; 7g measures 0.91, NR-7g-1) and the depth index (7f, DI < 60 within 2 min)', async () => {
    const e = createEngine({ seed: 32, mode: 'modeled', patient: { ...ADULT, sensors: { abp: 'connected' } } });
    const map: { t: number; v: number }[] = [];
    const di: { t: number; v: number }[] = [];
    e.on((x: EngineEvent) => {
      if (x.type === 'state') {
        const s = x.values.sbp ?? 0;
        const d = x.values.dbp ?? 0;
        map.push({ t: x.t, v: d + (s - d) / 3 });
      }
      if (x.type === 'anaesthesia') di.push({ t: x.t, v: x.di });
    });
    e.dispatch(ev(VENT));
    for (let t = 60; t <= 120; t += 60) { e.advanceTo(t); await yieldNow(); }
    const before = mean(map.filter((m) => m.t > 60 && m.t <= 120).map((m) => m.v));
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' })).accepted).toBe(true);
    for (let t = 180; t <= 360; t += 60) { e.advanceTo(t); await yieldNow(); }
    expect(Math.min(...di.filter((d) => d.t > 120 && d.t <= 240).map((d) => d.v))).toBeLessThan(60);
    const nadir = Math.min(...map.filter((m) => m.t > 150).map((m) => m.v));
    console.log(`propofol: MAP ${before.toFixed(1)} → nadir ${nadir.toFixed(1)} (${(nadir / before).toFixed(3)}); DI nadir ${Math.min(...di.map((d) => d.v))}`);
    // 7f checks that BOTH paths ran from one command; the 60–80 % band is 7g's (its Task 20) and is open there as NR-7g-1
    expect(nadir).toBeLessThan(0.95 * before);
  });
});
