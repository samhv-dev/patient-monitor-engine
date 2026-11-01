// Scenario format pme-scenario/2, piece F4 (docs/plans/scenario-format-v2-plan.md, Q21/Q22): the `state` event carries
// `signals`, the engine truths a /2 phase rule reads that are otherwise only in the opt-in truth tree or nowhere —
// the pulse (hemo.circ.arrest), the dantrolene effect (pk.bus.metabolic.dantroleneE), the ventilator's set minute
// ventilation (rr × VT) and the beat MAP (the site beat statistic, the same beat and the same flat rule as the state's
// sbp/dbp). Exposure only: every value is one the engine already computes. Each check reads the committed state inside
// the listener, so the signal is compared with the engine's own value on the same tick.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent, type StateSignals } from '../../src/index.ts';

/** A state event as the engine emits it: `signals` set (optional only in the type; the first test checks it is there). */
type StateEvent = Extract<EngineEvent, { type: 'state' }> & { signals: StateSignals };
type St = {
  hemo: { circ: { arrest: unknown; mapNow: number; lastEjT: number }; lastSite: { map: number }; lastRR: number };
  pk: { bus: { metabolic: { dantroleneE: number } } };
  resp: { driver: { source: string; vent: { rr: number; vt: number } } };
};
const ADULT = { ageY: 40, sex: 'M' as const, weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } };

function rig(o: { truthHz?: number } = {}) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: ADULT, ...(o.truthHz !== undefined ? { truthHz: o.truthHz } : {}) } as never);
  const st = () => (e as unknown as { st: St }).st;
  let n = 0;
  const send = (body: Record<string, unknown>) => {
    const r = e.dispatch({ id: `s${++n}`, issuedBy: 'test', ...body } as never);
    expect(r.accepted, JSON.stringify(body)).toBe(true);
  };
  const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event });
  /** Every state event, with what the engine itself holds on that tick (read in the listener: the same commit). */
  const rows: { e: StateEvent; arrest: boolean; dantE: number; source: string; vent: { rr: number; vt: number }; lastSiteMap: number; mapNow: number; abpMean: number | null }[] = [];
  let abpMean: number | null = null;
  e.on((x) => {
    if (x.type === 'measurement') {
      const m = (x.values as Record<string, { value: number | null } | undefined>).abpMean;
      if (m) abpMean = m.value;
    }
    if (x.type !== 'state') return;
    const s = st();
    rows.push({ e: x as StateEvent, arrest: s.hemo.circ.arrest !== null && s.hemo.circ.arrest !== undefined, dantE: s.pk.bus.metabolic.dantroleneE, source: s.resp.driver.source, vent: { ...s.resp.driver.vent }, lastSiteMap: s.hemo.lastSite.map, mapNow: s.hemo.circ.mapNow, abpMean });
  });
  const ventilate = () => {
    ev({ kind: 'airwayDevice', device: 'ett' });
    ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  };
  const runTo = async (t: number) => {
    for (let s = Math.floor(e.now().simT) + 1; s <= t; s++) {
      e.advanceTo(s);
      if (s % 60 === 0) await new Promise((r) => setImmediate(r));
    }
  };
  return { e, st, send, ev, rows, ventilate, runTo };
}

describe('the state event carries the /2 signals (F4)', { timeout: 300_000 }, () => {
  it('every state event has signals { pulse, dantroleneE, setMinuteVentilationLMin, map } — with the truth tree off (truthHz 0, the default)', async () => {
    const r = rig();
    const truth: EngineEvent[] = [];
    r.e.on((x) => truth.push(x), ['truth']);
    await r.runTo(20);
    expect(truth).toHaveLength(0);
    expect(r.rows.length).toBeGreaterThanOrEqual(19);
    for (const { e } of r.rows) {
      expect(Object.keys(e.signals).sort()).toEqual(['dantroleneE', 'map', 'mhActivity', 'mhExcess', 'pulse', 'setMinuteVentilationLMin']);
      expect(typeof e.signals.pulse).toBe('boolean');
      expect(Number.isFinite(e.signals.dantroleneE)).toBe(true);
      expect(Number.isFinite(e.signals.map)).toBe(true);
      expect(e.signals.mhActivity).toBe(0); // no MH condition
      expect(e.signals.mhExcess).toBeNull();
      expect(e.signals.setMinuteVentilationLMin === null || Number.isFinite(e.signals.setMinuteVentilationLMin)).toBe(true);
    }
  });

  it('pulse is the absence of hemo.circ.arrest: true while beating, false from a PEA\'s onset, on every state event', async () => {
    const r = rig();
    await r.runTo(1);
    r.ventilate();
    await r.runTo(60);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } }); // a PEA carries the arrest state from its onset
    await r.runTo(120);
    for (const row of r.rows) expect(row.e.signals.pulse, `t ${row.e.t}`).toBe(!row.arrest);
    expect(r.rows.filter((x) => x.e.t < 60).every((x) => x.e.signals.pulse)).toBe(true);
    expect(r.rows.filter((x) => x.e.t > 62).every((x) => !x.e.signals.pulse)).toBe(true); // it flips
  });

  it('an instructor-selected VF carries no arrest state in v1.0 (l2/hemo/pipeline.ts), so pulse stays true, as the debrief\'s pulse loss does', async () => {
    const r = rig();
    await r.runTo(1);
    r.ventilate();
    await r.runTo(30);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    await r.runTo(60);
    for (const row of r.rows) expect(row.e.signals.pulse, `t ${row.e.t}`).toBe(!row.arrest);
    expect(r.rows.every((x) => x.e.signals.pulse)).toBe(true);
  });

  it('pulse matches the truth tree\'s hemo.circ.arrest where both are emitted (truthHz 1)', async () => {
    const r = rig({ truthHz: 1 });
    const arrestAt = new Map<number, boolean>();
    r.e.on((x) => {
      if (x.type !== 'truth') return;
      const a = ((x.tree.hemo as Record<string, Record<string, unknown>> | undefined)?.circ)?.arrest;
      arrestAt.set(Math.round(x.t * 50), a !== null && a !== undefined);
    }, ['truth']);
    await r.runTo(1);
    r.ventilate();
    await r.runTo(40);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } });
    await r.runTo(90);
    let both = 0;
    for (const { e } of r.rows) {
      const a = arrestAt.get(e.tick);
      if (a === undefined) continue;
      both++;
      expect(e.signals.pulse, `t ${e.t}`).toBe(!a);
    }
    expect(both).toBeGreaterThan(30);
    expect(r.rows.some((x) => !x.e.signals.pulse)).toBe(true);
  });

  it('dantroleneE equals bus.metabolic.dantroleneE: 0 before the drug, rising after dantrolene 2.5 mg/kg', async () => {
    const r = rig();
    await r.runTo(10);
    r.ev({ kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' });
    await r.runTo(300);
    for (const row of r.rows) expect(row.e.signals.dantroleneE, `t ${row.e.t}`).toBe(row.dantE);
    expect(r.rows.filter((x) => x.e.t < 10).every((x) => x.e.signals.dantroleneE === 0)).toBe(true);
    expect(r.rows.at(-1)!.e.signals.dantroleneE).toBeGreaterThan(0.1);
  });

  it('setMinuteVentilationLMin is the ventilator\'s set rr × VT in L/min, null when the ventilator does not drive the breaths', async () => {
    const r = rig();
    await r.runTo(5);
    r.ventilate(); // 12 × 600
    await r.runTo(30);
    r.ev({ kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 600 });
    await r.runTo(60);
    r.ev({ kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 500 });
    await r.runTo(80);
    r.ev({ kind: 'ventilation', source: 'spontaneous' });
    await r.runTo(100);
    for (const row of r.rows) {
      const want = row.source === 'ventilator' ? (row.vent.rr * row.vent.vt) / 1000 : null;
      expect(row.e.signals.setMinuteVentilationLMin, `t ${row.e.t}`).toBe(want);
    }
    const at = (t: number) => r.rows.find((x) => Math.round(x.e.t) === t)!.e.signals.setMinuteVentilationLMin;
    expect(at(3)).toBeNull(); // spontaneous at the start
    expect(at(20)).toBeCloseTo(7.2, 9);
    expect(at(50)).toBeCloseTo(12, 9);
    expect(at(70)).toBeNull(); // bagged: no ventilator setting
    expect(at(90)).toBeNull();
  });

  it('map is the engine\'s beat MAP (the site beat statistic behind abpMean, not a formula on sbp/dbp); in a flat circulation the circuit\'s mapNow, as sbp/dbp are', async () => {
    const r = rig();
    await r.runTo(1);
    r.ventilate();
    await r.runTo(90);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    await r.runTo(150);
    const beating = r.rows.filter((x) => x.e.t >= 30 && x.e.t < 90);
    for (const row of beating) {
      expect(row.e.signals.map, `t ${row.e.t}`).toBe(row.lastSiteMap);
      // the arterial line's displayed mean averages the same beats' means on the transduced wave: within 3 mmHg
      if (row.abpMean !== null) expect(Math.abs(row.e.signals.map - row.abpMean), `t ${row.e.t}`).toBeLessThan(3);
    }
    expect(beating.filter((x) => x.abpMean !== null).length).toBeGreaterThan(50);
    // not the 1/3 or 0.4 formula on the state's own sbp/dbp
    const formula = beating.filter((x) => Math.abs(x.e.signals.map - (x.e.values.dbp! + (x.e.values.sbp! - x.e.values.dbp!) / 3)) < 1e-9);
    expect(formula).toHaveLength(0);
    // flat (no ejection for > 3 s): the state's sbp and dbp are the circuit's mapNow, and so is map
    const flat = r.rows.filter((x) => x.e.t > 100 && x.e.values.sbp === x.e.values.dbp);
    expect(flat.length).toBeGreaterThan(30);
    for (const row of flat) {
      expect(row.e.signals.map, `t ${row.e.t}`).toBe(row.mapNow);
      expect(row.e.signals.map).toBeCloseTo(row.e.values.sbp!, 1);
    }
  });

  it('mhActivity is the thermal model\'s MH activity, unrounded (the endo event rounds it to 0.01): 0 before the condition, rising after it', async () => {
    const r = rig();
    const endo = new Map<number, number>();
    r.e.on((x) => {
      if (x.type === 'endo') endo.set(Math.round(x.t), (x as unknown as { mhActivity: number }).mhActivity);
    });
    await r.runTo(10);
    r.ev({ kind: 'condition', id: 'mh', severity: 1 });
    await r.runTo(300);
    expect(r.rows.filter((x) => x.e.t < 10).every((x) => x.e.signals.mhActivity === 0)).toBe(true);
    const late = r.rows.filter((x) => x.e.t > 60);
    expect(late.at(-1)!.e.signals.mhActivity).toBeGreaterThan(late[0]!.e.signals.mhActivity);
    let compared = 0;
    for (const { e } of r.rows) {
      const ref = Number.isInteger(e.t) ? endo.get(e.t) : undefined; // the endo pass at the same whole second
      if (ref === undefined) continue;
      compared++;
      expect(Math.abs(e.signals.mhActivity - ref), `t ${e.t}`).toBeLessThanOrEqual(0.005 + 1e-9);
    }
    expect(compared).toBeGreaterThan(100);
    expect(late.some((x) => Math.round(x.e.signals.mhActivity * 100) / 100 !== x.e.signals.mhActivity)).toBe(true); // not quantised
  });

  // Review B1 (cause 2), decision D2: mhActivity = severity × onset ramp × s, and after an early dose the ramp outgrows
  // the fall of s, so "activity falling" cannot hold before the ramp ends. s (MhState.s, the dantrolene-sensitive
  // metabolic excess) is the signal dantrolene changes: exposed as mhExcess, read from the committed thermal state.
  it('mhExcess is the MH\'s dantrolene-sensitive fraction s: null without an MH, 1 untreated, falling after dantrolene while mhActivity still rises', async () => {
    const r = rig();
    const mhOf = () => (r.st() as unknown as { resp: { temp: { mh: { s?: number; severity: number } | null } } }).resp.temp.mh;
    const own: Array<{ t: number; s: number | null }> = [];
    r.e.on((x) => {
      if (x.type !== 'state') return;
      const mh = mhOf();
      own.push({ t: x.t, s: mh ? (mh.s ?? 1) : null });
    });
    await r.runTo(10);
    r.ev({ kind: 'condition', id: 'mh', severity: 1 });
    await r.runTo(120);
    r.ev({ kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' });
    await r.runTo(400);
    const at = new Map(own.map((o) => [o.t, o.s]));
    for (const { e } of r.rows) expect(e.signals.mhExcess, `t ${e.t}`).toBe(at.get(e.t));
    expect(r.rows.filter((x) => x.e.t < 10).every((x) => x.e.signals.mhExcess === null)).toBe(true);
    expect(r.rows.filter((x) => x.e.t > 11 && x.e.t < 120).every((x) => x.e.signals.mhExcess === 1)).toBe(true);
    const after = r.rows.filter((x) => x.e.t > 180);
    expect(after.at(-1)!.e.signals.mhExcess!).toBeLessThan(after[0]!.e.signals.mhExcess!); // dantrolene suppresses s
    expect(after.at(-1)!.e.signals.mhActivity).toBeGreaterThan(after[0]!.e.signals.mhActivity); // the ramp still wins
  });
});
