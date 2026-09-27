import { describe, expect, it } from 'vitest';
import { respOf as resp } from '../helpers/lung.ts';
import { ev3, rig3 } from '../helpers/resp.ts';


describe('Stage 7b commands', () => {
  it('validates ids, severities, sides, recruitability and manoeuvres', () => {
    const { e } = rig3();
    expect(e.dispatch(ev3({ kind: 'lungCondition', id: 'copd', severity: 0.75 })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'lungCondition', id: 'nope', severity: 0.5 })).reason).toMatch(/lungCondition id/);
    expect(e.dispatch(ev3({ kind: 'lungCondition', id: 'ards', severity: 2 })).reason).toMatch(/severity/);
    expect(e.dispatch(ev3({ kind: 'lungCondition', id: 'pneumonia', severity: 0.4, side: 'X' })).reason).toMatch(/side/);
    expect(e.dispatch(ev3({ kind: 'lungCondition', id: 'ards', severity: 0.6, recruitFrac: 0.5 })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'mainstem', ventilated: 'left' })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'mainstem', ventilated: 'up' })).reason).toMatch(/ventilated/);
    expect(e.dispatch(ev3({ kind: 'recruit', pressureCmH2O: 40, durationS: 30 })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'recruit', pressureCmH2O: 90, durationS: 30 })).reason).toMatch(/pressureCmH2O/);
  });
  it('conditions stack, replace by id+side, and severity 0 removes', () => {
    const { e } = rig3();
    e.dispatch(ev3({ kind: 'lungCondition', id: 'pneumonia', severity: 0.4, side: 'R' }));
    e.dispatch(ev3({ kind: 'lungCondition', id: 'pneumonia', severity: 0.6, side: 'R' }));
    e.dispatch(ev3({ kind: 'lungCondition', id: 'copd', severity: 0.5 }));
    e.advanceTo(1);
    expect(resp(e).lungSpecs).toEqual([{ id: 'pneumonia', severity: 0.6, side: 'R' }, { id: 'copd', severity: 0.5 }]);
    e.dispatch(ev3({ kind: 'lungCondition', id: 'pneumonia', severity: 0, side: 'R' }));
    e.advanceTo(2);
    expect(resp(e).lungSpecs.map((s) => s.id)).toEqual(['copd']);
  });
  it('Stage 3 airway events: endobronchial blocks the left lung; bronchospasm 1 → R ≈ 60', () => {
    const { e } = rig3();
    e.dispatch(ev3({ kind: 'airway', state: 'endobronchial' }));
    e.advanceTo(1);
    expect(resp(e).lung.mainstem).toBe('right');
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    e.advanceTo(2);
    expect(resp(e).lung.mainstem).toBe('both');
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    e.advanceTo(3);
    const lp = resp(e).lung.lp;
    const r = 4 + 1 / (1 / lp.side[0]!.rLung + 1 / lp.side[1]!.rLung);
    expect(r).toBeGreaterThan(55);
    expect(r).toBeLessThan(65);
  });
});
