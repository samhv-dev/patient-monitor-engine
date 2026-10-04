import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import * as A from './actions.ts';

describe('rail command builders', () => {
  it('build the brief §7.2 / 7a / 7g shapes', () => {
    expect(A.bolus('phenylephrine', 100, 'mcg')).toEqual({ type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } });
    expect(A.infusion('norepinephrine', 0.1, 'mcg/kg/min')).toEqual({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' } });
    expect(A.vaporiser('sevoflurane', 2, 2)).toEqual({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 } });
    expect(A.vaporiser('sevoflurane', 1, 2, 0.5)).toMatchObject({ event: { n2oFrac: 0.5 } });
    expect(A.tci('propofol', 3, 'effect', 'eleveld')).toEqual({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 } });
    expect(A.tci('remifentanil', 4, 'effect')).toEqual({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 4 } });
    expect(A.lungCondition('ptxSimple', 0.6, 'L')).toEqual({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxSimple', severity: 0.6, side: 'L' } });
    expect(A.lungCondition('ards', 0.5)).toEqual({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ards', severity: 0.5 } });
    expect(A.mainstem('right')).toEqual({ type: 'applyEvent', event: { kind: 'mainstem', ventilated: 'right' } });
    expect(A.recruit(40, 30)).toEqual({ type: 'applyEvent', event: { kind: 'recruit', pressureCmH2O: 40, durationS: 30 } });
    expect(A.fluid('rl', 500, 600)).toEqual({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'rl', volumeMl: 500, overS: 600 } });
    expect(A.lab('abg')).toEqual({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } });
    expect(A.ventilation('spontaneous', 12, 500, 5, 0.5)).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous' } });
    expect(A.rhythm('afib')).toEqual({ type: 'setRhythm', rhythm: 'afib' });
    expect(A.setMode('manual')).toEqual({ type: 'setMode', mode: 'manual' });
  });
  it('describe() gives one log line', () => {
    expect(A.describe(A.bolus('phenylephrine', 100, 'mcg'))).toBe('phenylephrine 100 mcg iv');
    expect(A.describe(A.ventilation('ventilator', 12, 500, 5, 0.5))).toBe('ventilator RR 12 VT 500 PEEP 5 FiO₂ 0.5');
    expect(A.describe(A.setMode('modeled'))).toBe('mode MODELED');
    expect(A.describe(A.vaporiser('sevoflurane', 1, 2, 0.5))).toBe('sevoflurane 1 % @ 2 L/min + N₂O 0.5');
    expect(A.describe(A.lungCondition('ptxSimple', 0.6, 'L'))).toBe('lung ptxSimple severity 0.6 L');
    expect(A.describe(A.tci('propofol', 3, 'effect', 'eleveld'))).toBe('propofol TCI effect target 3 (eleveld)');
    expect(A.describe(A.lab('abg'))).toBe('send ABG');
    expect(A.describe({ type: 'pin', variable: 'hr' })).toBe('{"type":"pin","variable":"hr"}');
  });
  it('the engine accepts what 7a implements and names the reason for what it does not know', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: A.PRESETS[0]?.profile });
    let n = 0;
    const send = (b: A.Body) => e.dispatch({ ...b, id: `t${++n}`, issuedBy: 'test' } as unknown as Command);
    for (const b of [
      A.bolus('phenylephrine', 100, 'mcg'), A.fluid('crystalloid', 500, 300), A.bleed(500, 60), A.condition('tamponade', 0.5),
      A.ventilation('ventilator', 12, 500, 5, 0.5), A.ventilation('spontaneous', 0, 0, 0, 0), A.rhythm('afib'), A.setMode('manual'),
    ]) expect(send(b), A.describe(b)).toMatchObject({ accepted: true });
    // an id no stage knows is rejected with a reason (7g's infusion/tci/vaporiser, 7b's lungCondition/mainstem/recruit
    // and 7c's lab and fluid ids are accepted or rejected depending on whether that stage has merged: not asserted)
    const r = send(A.bolus('notADrug', 1, 'mg'));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBeTruthy();
  });
  it('7x.1 (FU-3 item 12): every preset starts with the CO2 sidestream line attached, so EtCO2 reads at rest', () => {
    for (const p of A.PRESETS) {
      expect(p.profile.sensors, p.id).toMatchObject({ co2: 'on' });
      const e = createEngine({ seed: 1, mode: 'modeled', patient: p.profile });
      let et: number | null | undefined;
      e.on((x) => {
        if (x.type === 'measurement' && x.values.etco2) et = x.values.etco2.value;
      });
      e.advanceTo(20);
      expect(et, p.id).toBeGreaterThan(20);
    }
  }, 30_000); // one engine per preset, 20 s each: over the 5 s default on the 2-vCPU CI runner (failed on main bd5880b)
  it('every preset starts an engine with the invasive lines connected', () => {
    for (const p of A.PRESETS) {
      expect(() => createEngine({ seed: 1, mode: 'modeled', patient: p.profile }), p.id).not.toThrow();
      expect(p.profile.sensors).toMatchObject({ abp: 'connected' });
    }
  });
});
