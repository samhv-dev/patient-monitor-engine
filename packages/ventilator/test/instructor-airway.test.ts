// The instructor's airway controls reach a patient ventilated over the link: one circuit (opened by the instructor or at
// the ventilator, the ventilator's own sensors read it) and the patient's own effort (apnoea), in a controlled and in a
// spontaneous mode, with and without the device's apnoea backup.
import type { EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { createLinkedSim, ventAlarms, type LinkedSim, type VentConfig } from '../src/index.ts';

const airway = (sim: LinkedSim, state: string) => sim.send({ type: 'applyEvent', event: { kind: 'airway', state } });
const alarmIds = (sim: LinkedSim) => ventAlarms(sim.vs).map((a) => a.id);
/** Advance tick by tick until `done` holds, at most `maxS` of sim time; the time it held. */
function until(sim: LinkedSim, done: () => boolean, maxS: number): number {
  const end = sim.now() + maxS;
  while (!done()) {
    if (sim.now() >= end) throw new Error(`not reached within ${maxS} s`);
    sim.advanceTo(sim.now() + 0.02);
  }
  return sim.now();
}
const breathsAfter = (sim: LinkedSim, t: number) =>
  sim.events.filter((e): e is Extract<EngineEvent, { type: 'breath' }> => e.type === 'breath' && e.t > t);
/** The airway commands the ventilator sends the engine from now on. */
function ventAirway(sim: LinkedSim): string[] {
  const sent: string[] = [];
  const dispatch = sim.engine.dispatch.bind(sim.engine);
  sim.engine.dispatch = (c) => {
    if (c.type === 'applyEvent' && c.issuedBy === 'ventilator' && c.event.kind === 'airway') sent.push((c.event as { state: string }).state);
    return dispatch(c);
  };
  return sent;
}

const VC: Partial<VentConfig> = { mode: 'VC', rate: 14, vt: 500, peep: 5, vcFlow: 30, pause: 0 };

describe('the instructor disconnects the circuit of a patient ventilated over the link', { timeout: 120_000 }, () => {
  it('controlled mode: the ventilator reads the open circuit, alarms, delivers no volume; the patient has no gas exchange; reconnection restores', () => {
    const sim = createLinkedSim({ vent: VC });
    sim.advanceTo(40);
    expect(sim.vs.p.measured.VTE).toBeGreaterThan(450);
    const t0 = sim.now();
    const sent = ventAirway(sim);
    airway(sim, 'disconnected');
    const seen = until(sim, () => sim.vs.circuit === 'disconnected', 1.5); // the next lungState (gas step)
    const raised = until(sim, () => alarmIds(sim).includes('disconnection'), 60 / 14 + 2);
    expect(raised - t0).toBeLessThanOrEqual(60 / 14 + vcTi(VC)); // the first breath that raises no pressure
    sim.advanceTo(raised + 10);
    expect(sim.vs.p.measured.VTE).toBe(0);
    expect(sim.vs.p.measured.PIP).toBeLessThan(2);
    expect(sent).toEqual([]); // the ventilator follows the engine's circuit, it does not send it back
    expect(breathsAfter(sim, seen + 0.1)).toEqual([]); // no breath reaches the lung: nothing exchanges, the capnogram stays flat
    const t1 = sim.now();
    airway(sim, 'patent');
    until(sim, () => sim.vs.circuit === 'connected', 1.5);
    until(sim, () => sim.vs.p.measured.VTE > 450, 3 * 60 / 14);
    sim.advanceTo(sim.now() + 2 * 60 / 14);
    expect(alarmIds(sim)).not.toContain('disconnection');
    expect(breathsAfter(sim, t1).length).toBeGreaterThan(0);
    expect(sent).toEqual([]);
  });

  it("the ventilator's own disconnection is the same circuit: sent once, not undone by the lungState that crossed it", () => {
    const sim = createLinkedSim({ vent: VC });
    sim.advanceTo(20);
    const sent = ventAirway(sim);
    sim.vs.circuit = 'disconnected';
    until(sim, () => sim.core.lung.last?.airway === 'disconnected', 1.5);
    sim.advanceTo(sim.now() + 5);
    expect(sim.vs.circuit).toBe('disconnected');
    sim.vs.circuit = 'connected';
    until(sim, () => sim.core.lung.last !== null && sim.core.lung.last.airway === undefined, 1.5);
    sim.advanceTo(sim.now() + 5);
    expect(sim.vs.circuit).toBe('connected');
    expect(sent).toEqual(['disconnected', 'patent']);
  });
});

describe('the instructor stops the breathing of a patient ventilated over the link', { timeout: 120_000 }, () => {
  it('controlled mode: the patient makes no effort; delivery is unchanged and the mode and settings stay', () => {
    const sim = createLinkedSim({ vent: VC });
    sim.advanceTo(40);
    const before = { ...sim.vs.p.measured };
    airway(sim, 'apnoea');
    until(sim, () => sim.core.lung.last?.airway === 'apnoea', 1.5);
    expect(sim.core.lung.last?.effort).toBe(0);
    expect(sim.vs.cfg.spont).toBe(false);
    sim.advanceTo(sim.now() + 30);
    expect(sim.vs.cfg).toMatchObject(VC);
    expect(Math.abs(sim.vs.p.measured.VTE - before.VTE)).toBeLessThan(25);
    expect(sim.vs.p.measured.RR).toBeCloseTo(14, 0);
    expect(alarmIds(sim)).not.toContain('apnea'); // mandatory breaths are breaths
  });

  for (const backup of ['VC', undefined] as const) {
    const name = backup ? 'the device backup (VC after the apnoea time)' : 'no device backup (the safety breath)';
    it(`spontaneous mode with ${name}: the apnoea time runs out, the apnoea alarm is raised, the mode stays; breathing returns`, () => {
      const apneaTime = backup ? 15 : 20;
      const sim = createLinkedSim({ vent: { mode: 'PSV', ps: 8, peep: 5, rate: 12, apneaTime, ...(backup ? { backupMode: backup } : {}) } });
      sim.vs.cfg.spont = true;
      sim.core.lung.base.spont = true; // a patient who breathes, whatever the engine's drive under anaesthesia
      sim.advanceTo(60);
      expect(sim.vs.p.markers.some((m) => m.type === 'pt')).toBe(true);
      airway(sim, 'apnoea');
      const off = until(sim, () => sim.vs.cfg.spont === false, 1.5);
      const lastPatient = sim.vs.lastBreathT;
      expect(lastPatient).toBeLessThanOrEqual(off);
      const raised = until(sim, () => alarmIds(sim).includes('apnea'), apneaTime + 2);
      expect(raised - lastPatient).toBeGreaterThanOrEqual(apneaTime);
      expect(raised - lastPatient).toBeLessThan(apneaTime + 0.1);
      sim.advanceTo(raised + 20);
      expect(sim.vs.cfg.mode).toBe('PSV');
      expect(sim.vs.p.measured.VTE).toBeGreaterThan(100); // ventilated: the backup's or the safety breaths
      if (backup) expect(sim.vs.backupBreath).toBe(backup);
      airway(sim, 'patent');
      until(sim, () => sim.vs.cfg.spont === true, 1.5);
      until(sim, () => !alarmIds(sim).includes('apnea'), 10);
      expect(sim.vs.backupBreath).toBeUndefined();
      expect(sim.vs.cfg.mode).toBe('PSV');
    });
  }
});

function vcTi(c: Partial<VentConfig>): number {
  return ((c.vt as number) / 1000) / ((c.vcFlow as number) / 60) + (c.pause as number);
}
