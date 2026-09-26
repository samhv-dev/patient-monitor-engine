// Link core: a profile per catalogue row; the first tick sends the profile's shunt/stand-ins and a frame;
// lungState updates the lung; the in-process lockstep link breathes the engine at the ventilator's rate.
import { describe, expect, it } from 'vitest';
import { createLinkCore, createLinkedSim, createVent, linkEvent, linkTick, LUNG_PATHOLOGIES, patchVent, PROFILES } from '../src/index.ts';

describe('link core', () => {
  it('one profile per row; the first tick sends shunt (or recruitment shunt), stand-ins, then a frame each tick', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(LUNG_PATHOLOGIES.map((r) => r.id).sort());
    const pe = createLinkCore(createVent(), PROFILES['pe-massive']!);
    const first = linkTick(pe, 0.02).map((c) => c.type + ('variable' in c ? `:${c.variable}` : ''));
    expect(first).toEqual(['setTarget:shunt', 'setTarget:sbp', 'setTarget:dbp', 'setTarget:cvp', 'setTarget:hr', 'externalDrive']);
    expect(linkTick(pe, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    const ards = createLinkCore(createVent(), PROFILES['ards-moderate']!);
    expect(ards.vs.cfg.compliance).toBe(32);
    expect(linkTick(ards, 0.02).map((c) => c.type)).toEqual(['externalDrive', 'setTarget']);
  });
  it('lungState moves the lung; a patch to the lung moves the base with it', () => {
    const core = createLinkCore(createVent(), PROFILES.normal!);
    const ev = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 } as const;
    linkEvent(core, ev);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40 });
    expect(core.vs.cfg.resistance).toBe(40);
    patchVent(core, { compliance: 20, resistance: 10 });
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40, shunt: 0.1 }); // still bronchospastic: ×4 of the NEW base
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([20, 40]);
  });
  it('in-process: the engine counts the ventilator’s 14 breaths/min', () => {
    const s = createLinkedSim({ profile: 'normal' });
    s.advanceTo(60);
    const br = s.events.filter((e) => e.type === 'breath' && e.t > 15);
    expect(br.length).toBeGreaterThanOrEqual(10);
    expect(br.length).toBeLessThanOrEqual(11);
  });
});
