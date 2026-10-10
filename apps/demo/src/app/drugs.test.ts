// FU-7.1 A1 (research/24 P1): the dose picker gives every neuromuscular blocker its intubating dose in mg/kg, and that
// dose — sent exactly as the panel builds it — paralyses: apnoea and a flat capnogram by 180 s after cisatracurium.
import { createEngine, type Command, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { DRUG_LIST, doseUnits } from './drugs.ts';

const NMB = ['rocuronium', 'vecuronium', 'cisatracurium', 'atracurium', 'mivacurium', 'succinylcholine'];
const item = (id: string) => DRUG_LIST.find((d) => d.id === id)!;

describe('FU-7.1 A1: neuromuscular blockers in the dose picker', () => {
  it('every blocker opens on a mg/kg preset (the label intubating doses) and offers mg/kg; other µg drugs do not', () => {
    const want: Record<string, number> = { rocuronium: 0.6, vecuronium: 0.1, cisatracurium: 0.15, atracurium: 0.5, mivacurium: 0.2, succinylcholine: 1 };
    for (const id of NMB) {
      const d = item(id);
      expect(d.preset.bolus?.[0], id).toEqual([want[id], 'mg/kg']);
      expect(doseUnits(d), id).toContain('mg/kg');
    }
    expect(doseUnits(item('fentanyl'))).not.toContain('mg/kg');
    expect(doseUnits(item('phenylephrine'))).not.toContain('mg/kg');
  });

  it('cisatracurium\'s first preset, sent as the panel sends it, stops breathing and flattens the capnogram by 180 s (engine: 150–180 s)', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { spo2: 'on', co2: 'on' } } });
    let etco2 = NaN;
    let apnoea = false;
    const breaths: number[] = [];
    e.on((x: EngineEvent) => {
      const ev = x as unknown as { type: string; t: number; values?: Record<string, { value: number | null }>; drive?: { apnoea: boolean } };
      if (ev.type === 'measurement' && ev.values?.etco2) etco2 = ev.values.etco2.value ?? NaN;
      else if (ev.type === 'anaesthesia') apnoea = ev.drive?.apnoea === true;
      else if (ev.type === 'breath') breaths.push(ev.t);
    });
    e.advanceTo(120);
    const [dose, unit] = item('cisatracurium').preset.bolus![0]!;
    const r = e.dispatch({ id: 'a1', issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', drugId: 'cisatracurium', dose, unit, route: 'iv' } } as unknown as Command);
    expect(r.accepted).toBe(true);
    e.advanceTo(300);
    // eslint-disable-next-line no-console -- the gate note's number
    console.log(`FU-7.1 A1: cisatracurium ${dose} ${unit}: last breath +${(Math.max(...breaths) - 120).toFixed(0)} s, EtCO2 ${etco2}, apnoea flag ${apnoea}`);
    expect(Math.max(...breaths) - 120).toBeLessThanOrEqual(180);
    expect(etco2).toBe(0);
    expect(apnoea).toBe(true);
  });
});
