// @vitest-environment happy-dom
// The instructor's "Circuit disconnected" and "Apnoea" on a patient ventilated from each face, as the host delivers them
// (an airway event to the engine): the face's own alarms by its own data, its mode and settings untouched; Patent
// restores. The cockpit is linked to a real engine over a port, as the app runs it.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit, type Cockpit } from './core/cockpit.ts';
import type { FaceSpec } from './core/types.ts';
import { DATA, num, S } from './faces/edp-ts/data.ts';
import { EDP_SPEC } from './faces/edp-ts/modes.ts';
import { HAMILTON_SPEC } from './faces/hamilton/face.ts';

function linked(spec: FaceSpec) {
  const [ventPort, monPort] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
  const mon = { dispatch: (c: Command): DispatchResult => e.dispatch(c), on: (fn: (x: EngineEvent) => void) => e.on(fn) };
  attachMonitorToLink(mon, monPort);
  const d = createVentDriver(ventPort, 'normal');
  const c = createCockpit(d, spec, { linked: true });
  let ms = 1000;
  let i = 0;
  d.frame(ms);
  const step = () => {
    d.frame((ms += 20));
    e.advanceTo(++i * 0.02);
  };
  const t = () => c.p.t;
  /** Step until `done` holds, at most `maxS` of sim time; the ventilator's time it held. */
  const until = async (done: () => boolean, maxS: number) => {
    const end = t() + maxS;
    while (!done()) {
      if (t() >= end) throw new Error(`not reached within ${maxS} s`);
      step();
      await Promise.resolve();
    }
    return t();
  };
  const run = async (s: number) => {
    const end = t() + s;
    while (t() < end) {
      step();
      await Promise.resolve();
    }
  };
  /** The first time the model's condition `id` holds from now on (the face's alarm delay runs from it). */
  const conditionFrom = (id: string) => {
    let at: number | null = null;
    c.onStep(() => void (at === null && c.alarms().active.some((a) => a.id === id) && (at = t())));
    return () => at;
  };
  const airway = (state: string) => e.dispatch({ id: `instructor-${state}-${i}`, issuedBy: 'panel', type: 'applyEvent', event: { kind: 'airway', state } } as Command);
  return { c, d, e, run, until, airway, t, conditionFrom };
}
const raised = (c: Cockpit, id: string, from: number) => {
  let at: number | null = null;
  c.onAlarm((x) => void (at === null && x.id === id && x.kind === 'raised' && x.t >= from && (at = x.t)));
  return () => at;
};
const banner = (c: Cockpit) => c.alarms().banner.text;
const EDP_DISCONNECT_DELAY = num(DATA.alarms.disconnection.delay);
const EDP_APNOEA_TIME = num(S.apnea.init);

describe('EDP-TS face', { timeout: 120_000 }, () => {
  it('VCV: Disconnection is signalled its delay after the first breath that raised no pressure; Patent ends it', async () => {
    const h = linked(EDP_SPEC);
    await h.run(30);
    const cfg = { ...h.c.cfg };
    const at = raised(h.c, 'disconnection', h.t());
    const cond = h.conditionFrom('disconnection');
    h.airway('disconnected');
    const open = await h.until(() => h.c.vs.circuit === 'disconnected', 2); // the engine's next lungState, over the link
    await h.until(() => at() !== null, 60 / cfg.rate + cfg.itime + EDP_DISCONNECT_DELAY + 1);
    expect((cond() as number) - open).toBeLessThanOrEqual(60 / cfg.rate + cfg.itime);
    expect((at() as number) - (cond() as number)).toBeCloseTo(EDP_DISCONNECT_DELAY, 1);
    expect(h.c.alarms().signals?.message?.id).toBe('disconnection');
    expect(h.c.measured().VTE).toBe(0);
    h.airway('patent');
    await h.until(() => h.c.measured().VTE > 0.9 * cfg.vt, 3 * 60 / cfg.rate);
    expect(h.c.alarms().signals?.message?.id).not.toBe('disconnection');
    expect(h.c.cfg).toMatchObject({ mode: cfg.mode, modeLabel: cfg.modeLabel, rate: cfg.rate, vt: cfg.vt });
  });

  it('PSV/CPAP: Apnoea stops the patient; after the apnoea time the backup ventilates and Apnea condition is signalled; Patent ends both', async () => {
    const h = linked(EDP_SPEC);
    h.c.chooseMode('PSV/CPAP');
    h.d.core.lung.base.spont = true; // a patient who breathes, whatever the engine's drive does under anaesthesia
    await h.run(40);
    const t0 = h.t();
    const at = raised(h.c, 'apnea', t0);
    h.airway('apnoea');
    await h.until(() => h.c.cfg.spont === false, 1.5);
    const last = h.c.vs.lastBreathT;
    await h.until(() => at() !== null, EDP_APNOEA_TIME + 2);
    expect((at() as number) - last).toBeCloseTo(EDP_APNOEA_TIME, 1);
    await h.run(20);
    expect(h.c.vs.backupBreath).toBe('VC');
    expect(h.c.cfg).toMatchObject({ mode: 'PSV', modeLabel: 'PSV/CPAP' });
    h.airway('patent');
    await h.until(() => h.c.vs.backupBreath === undefined && !h.c.alarms().active.some((a) => a.id === 'apnea'), 15);
    expect(h.c.cfg).toMatchObject({ mode: 'PSV', modeLabel: 'PSV/CPAP' });
  });
});

describe('Hamilton-style face', { timeout: 120_000 }, () => {
  it('(S)CMV+: the banner shows the disconnection from the first breath that raised no pressure; Patent ends it', async () => {
    const h = linked(HAMILTON_SPEC);
    await h.run(30);
    const cfg = { ...h.c.cfg };
    h.airway('disconnected');
    await h.until(() => banner(h.c) === '⚠ Disconnection on patient side', 60 / cfg.rate + 3);
    expect(h.c.measured().VTE).toBe(0);
    h.airway('patent');
    await h.until(() => h.c.measured().VTE > 0.9 * cfg.vt, 3 * 60 / cfg.rate);
    await h.until(() => banner(h.c) !== '⚠ Disconnection on patient side', 60 / cfg.rate + 1);
    expect(h.c.cfg).toMatchObject({ mode: cfg.mode, modeLabel: cfg.modeLabel, rate: cfg.rate, vt: cfg.vt });
  });

  it('SPONT: Apnoea raises Apnea after the set apnoea time; the mode and settings stay; Patent ends it', async () => {
    const h = linked(HAMILTON_SPEC);
    h.c.chooseMode('SPONT');
    h.d.core.lung.base.spont = true;
    await h.run(40);
    const before = { ...h.c.cfg };
    h.airway('apnoea');
    await h.until(() => h.c.cfg.spont === false, 1.5);
    const last = h.c.vs.lastBreathT;
    await h.until(() => banner(h.c) === '⚠ Apnea', before.apneaTime + 2);
    expect(h.t() - last).toBeGreaterThanOrEqual(before.apneaTime);
    expect(h.t() - last).toBeLessThan(before.apneaTime + 0.1);
    expect(h.c.cfg).toMatchObject({ mode: before.mode, modeLabel: 'SPONT', ps: before.ps, peep: before.peep, rate: before.rate });
    h.airway('patent');
    await h.until(() => banner(h.c) !== '⚠ Apnea', 15);
    expect(h.c.cfg.modeLabel).toBe('SPONT');
  });
});
