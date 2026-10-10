// FU-7.1 B1 (research/24 P2): in untreated malignant hyperthermia the pressure stops rising and falls back as the
// acidaemia deepens, instead of climbing to 117 mmHg with an SVR of 1557. Rig: probe P2's — ETT + VCV 12 × 500 PEEP 5
// FiO2 0.5, the GA thermal flag, sevoflurane 2 % at 2 L/min and suxamethonium 1.5 mg/kg at 1 s, `condition mh 1` at
// 300 s. The window is the first 40 min: untreated, BOTH trees arrest from hyperthermia at +44.8 min (core 42.3 °C,
// VF — unchanged by this task), so the haemodynamics are read while the patient still has a circulation.
// SLOW (≈ 20 s wall); one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

interface Row { t: number; map: number; svr: number; hr: number; ph: number; co: number }

async function mhRun(): Promise<Row[]> {
  const e = rig6();
  const rows: Row[] = [];
  let circ: { co?: number; svr?: number } = {};
  let labs: { ph?: number } = {};
  e.on((x) => {
    if (x.type === 'circ') circ = x as unknown as { co: number; svr: number };
    else if (x.type === 'labs') labs = (x as unknown as { values: { ph: number } }).values;
  });
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
  send(e, { kind: 'thermal', anaesthesia: 'general' });
  send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 });
  send(e, { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' });
  await runTo(e, 300);
  send(e, { kind: 'condition', id: 'mh', severity: 1 });
  await runTo(e, 300 + 2400, (u) => {
    if ((u - 300) % 60 !== 0) return;
    rows.push({ t: (u - 300) / 60, map: st6(e).hemo.circ.mapNow as number, svr: (circ.svr ?? 0) * 1333, hr: st6(e).hemo.circ.hrModel as number, ph: labs.ph ?? 7.4, co: circ.co ?? 0 });
  }, 5);
  return rows;
}

describe('FU-7.1 B1: the MH haemodynamics', { timeout: 600_000 }, () => {
  it('the pressure and the systemic resistance peak lower and fall back as the pH does (main: MAP 109 at +20 min, peak 117, 108 at +40)', async () => {
    const rows = await mhRun();
    const at = (m: number) => rows.find((r) => r.t >= m)!;
    const peak = rows.reduce((a, r) => (r.map > a.map ? r : a), rows[0]!);
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 B1 MH: pH ${at(20).ph.toFixed(2)}/${at(40).ph.toFixed(2)}, MAP ${at(20).map.toFixed(0)} at +20, peak ${peak.map.toFixed(0)} at +${peak.t} min, ${at(40).map.toFixed(0)} at +40; SVR ${at(20).svr.toFixed(0)} → ${at(40).svr.toFixed(0)}; HR peak ${Math.max(...rows.map((r) => r.hr)).toFixed(0)}; CO ${at(40).co.toFixed(2)}`);
    expect(at(40).ph).toBeLessThanOrEqual(7.15);                 // the run does reach a severe acidaemia
    expect(at(20).map).toBeLessThanOrEqual(104);                 // main 109
    expect(peak.map).toBeLessThan(110);                          // main peaked at 117
    expect(at(40).map).toBeLessThan(peak.map - 5);               // and the pressure falls back
    expect(rows.every((r) => r.co > 3.5)).toBe(true);            // no circulatory collapse before the hyperthermic arrest
  });
});
