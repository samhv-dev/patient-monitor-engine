import { describe, expect, it } from 'vitest';
import { GROUPS, groupOf, isInternal, isPhase } from './organs.ts';

describe('organ grouping', () => {
  it.each([
    ['hemo.circ.p.rSys', 'circulation'], ['ev.circ.svr', 'circulation'], ['ev.circ.lvad.flowLpm', 'devices'], ['hemo.iabp.ratio', 'devices'],
    ['mon.hr', 'monitor'], ['hemo.num.abp.sys', 'monitor'], ['resp.o2.pao2', 'lungs'], ['resp.driver.vent.peep', 'devices'],
    ['resp.temp.tc', 'blood'], ['mods.k', 'ecg'], ['ev.beat.qtMs', 'ecg'], ['l1.vars.sbp.to', 'controls'], ['dev.pacer.mode', 'devices'],
    // stages not merged yet (paths from the 7b–7g plans)
    ['resp.lung.mech.cL', 'lungs'], ['blood.core.ab.ph', 'blood'], ['organs.brain.icp', 'brain'], ['organs.renal.gfr', 'kidney'],
    ['organs.liver.lactate', 'liver'], ['endo.core.glucose.g', 'endocrine'], ['neuro.antinoc', 'neuro'], ['pk.bus.cns.propCe', 'drugs'],
    ['ev.drugs.macTotal', 'drugs'], ['ev.labs.values.ph', 'blood'],
    // 7d's published keys (kidney, R51 addendum 13), its ICP sensor and interim anaesthesia input; 7e's seams
    ['organs.kidney.gfrRel', 'kidney'], ['ev.organs.kidney.uopMlMin', 'kidney'], ['organs.sensors.icp', 'brain'], ['organs.anaesEvent.propofolE', 'brain'],
    ['hemo.circ.ext.endoHrF', 'endocrine'], ['hemo.circ.ext.endoSvrF', 'endocrine'], ['blood.endo.glucoseMgDl', 'endocrine'], ['hemo.circ.ext.pPtx', 'circulation'],
    // unknown → other
    ['ecmo.flowLpm', 'other'], ['ev.somethingNew.x', 'other'],
    // 7x.1 (FU-3 item 12): 7d's intra-abdominal pressure is a kidney input; its condition list by the organ it drives
    // (tbi → brain, aki → kidney, hepaticFailure → liver; the profile's other conditions are inputs: controls)
    ['organs.iap', 'kidney'], ['organs.conds.tbi.severity', 'brain'], ['organs.conds.aki.severity', 'kidney'],
    ['organs.conds.hepaticFailure.severity', 'liver'], ['organs.conds.htn.id', 'controls'],
  ])('%s → %s', (path, group) => expect(groupOf(path)).toBe(group));
  it('matches whole segments only', () => {
    expect(groupOf('hemodynamics.x')).toBe('other');
    expect(groupOf('monitor.x')).toBe('other');
  });
  it('has 15 groups ending with other (Stage 7k: "Respiratory mechanics and volumes")', () => {
    expect(GROUPS).toHaveLength(15);
    expect(GROUPS.at(-1)?.id).toBe('other');
  });
  it('flags bookkeeping leaves as internal', () => {
    for (const p of ['l1.vars.sbp.t0', 'l1.vars.sbp.from', 'hemo.circ.acc.sbp', 'hemo.circ.mapSum', 'hemo.circ.ctlNext', 'resp.driver.seq', 'blood.k', 'hemo.circ.lastEjT', 'hemo.num.abp.n', 'hemo.circ.cor.ref.sv', 'dev.alarms.cfg.volume', 'rhythm.records.0.qtMs'])
      expect(isInternal(p), p).toBe(true);
    for (const p of ['l1.vars.sbp.to', 'mods.k', 'rhythm.id', 'hemo.numbers.x', 'dev.pacer.mode', 'blood.core.out.k', 'hemo.circ.p.rSys', 'ev.circ.svr', 'mon.hr', 'resp.o2.pao2', 'hemo.circ.kLv'])
      expect(isInternal(p), p).toBe(false);
  });
  it('flags 7g\'s PK machinery as internal and keeps the bus concentrations visible (`*` = one segment)', () => {
    for (const p of ['pk.drugs.propofol.x.0', 'pk.drugs.rocuronium.bolusTimes.1', 'pk.drugs.adenosine.doses.0.scale', 'pk.bus.doses.0.amount', 'pk.lastC.propofol', 'pk.due.0.amt', 'pk.pending.0.t', 'pk.macPrev.3'])
      expect(isInternal(p), p).toBe(true);
    for (const p of ['pk.bus.agents.propofol.brain', 'pk.drugs.propofol.rate', 'pk.drugs.propofol.total', 'pk.drugs.x', 'pk.bus.cns.propCe', 'pk.vap.dialPct'])
      expect(isInternal(p), p).toBe(false);
  });
  it('Stage 7c: the blood\'s chemistry block is visible in the Blood group; amounts, reference copies, solver scratch and queues are internal', () => {
    for (const p of ['blood.out.k', 'blood.out.lactate', 'blood.out.hbfRel', 'blood.core.ab.ph', 'blood.core.o2.do2', 'blood.core.fl.vp', 'blood.core.bledMl', 'blood.lung.evlwi', 'blood.core.co0']) {
      expect(isInternal(p), p).toBe(false);
      expect(groupOf(p), p).toBe('blood');
    }
    for (const p of ['blood.core.so.na', 'blood.core.so.set.k', 'blood.core.pat.bvMl', 'blood.core.fl.ref.bv', 'blood.core.fl.flows.0.rate', 'blood.core.ab.iter', 'blood.core.ab.residual', 'blood.core.k1Hz', 'blood.core.ecf0', 'blood.core.phNonOrg', 'blood.core.doses.0.t0', 'blood.view.odc.hb', 'blood.ecg.k', 'blood.rest.coLp', 'blood.circNetMl', 'blood.labs.0.due', 'blood.cold.0.until', 'blood.keto.rate', 'blood.events.0.t', 'blood.lung.pCap', 'blood.pinHbfRel'])
      expect(isInternal(p), p).toBe(true);
  });
  it('marks within-beat and within-breath values as phase (sampled at 1 Hz they alias)', () => {
    for (const p of ['hemo.circOut.pLv', 'hemo.circOut.qAv', 'resp.lung.tidal.2', 'resp.lung.inInsp', 'resp.lung.pInsp']) expect(isPhase(p), p).toBe(true);
    for (const p of ['hemo.circ.p.rSys', 'resp.lung.peepTot', 'resp.lung.tidalSum', 'ev.circ.svr']) expect(isPhase(p), p).toBe(false);
  });
});
