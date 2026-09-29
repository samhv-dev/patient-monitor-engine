// Link core: a profile per catalogue row carrying the row's engine lung conditions (Stage V.1); the first tick sends
// the circulation condition/stand-ins and a frame; lungState IS the lung; the in-process lockstep link breathes the
// engine at the ventilator's rate.
import { describe, expect, it } from 'vitest';
import { createLinkCore, createLinkedSim, createVent, linkEvent, linkTick, LUNG_PATHOLOGIES, patchVent, PROFILES } from '../src/index.ts';

describe('link core', () => {
  it('one profile per row, carrying its engine lung conditions; the first tick sends the remaining stand-ins, then a frame each tick — never a shunt target or a 7a PE/tension condition (V.1)', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(LUNG_PATHOLOGIES.map((r) => r.id).sort());
    expect(PROFILES['ards-moderate']!.patient.lungConditions).toEqual([{ id: 'ards', severity: 0.67 }]);
    expect(PROFILES['ards-severe-recruitable']!.patient.lungConditions).toEqual([{ id: 'ards', severity: 1, recruitFrac: 0.5 }]);
    expect(PROFILES['one-lung-ventilation']!.patient.lungConditions).toEqual([{ id: 'olv', severity: 1, side: 'L' }]);
    expect(PROFILES.normal!.patient.lungConditions).toBeUndefined();
    expect(PROFILES['pe-massive']!.patient.lungConditions).toEqual([{ id: 'pe', severity: 1 }]);
    const ana = createLinkCore(createVent(), PROFILES['anaphylaxis-bronchospasm']!);
    // the vasoplegia stand-in (R41 INTERIM) stays; massive PE and tension send nothing but frames (their lung condition acts)
    expect(linkTick(ana, 0.02).map((c) => c.type + ('variable' in c ? `:${c.variable}` : ''))).toEqual(['setTarget:sbp', 'setTarget:dbp', 'setTarget:cvp', 'setTarget:hr', 'externalDrive']);
    expect(linkTick(ana, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    for (const id of ['pe-massive', 'pneumothorax-tension']) expect(linkTick(createLinkCore(createVent(), PROFILES[id]!), 0.02).map((c) => c.type), id).toEqual(['externalDrive']);
    const ards = createLinkCore(createVent(), PROFILES['ards-moderate']!);
    // Stage 7b (Task 27): the row's compliance is generated from the engine lung data (ARDS moderate Crs 35, Pulse 35)
    expect(ards.vs.cfg.compliance).toBe(LUNG_PATHOLOGIES.find((r) => r.id === 'ards-moderate')!.complianceMl.value);
    expect(linkTick(ards, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    for (const p of Object.values(PROFILES)) {
      const core = createLinkCore(createVent(), p);
      const cmds = [...linkTick(core, 0.02), ...linkTick(core, 0.02)];
      expect(cmds.some((c) => ('variable' in c && c.variable === 'shunt') || (c.type === 'applyEvent' && (c as { event: { kind: string } }).event.kind === 'condition')), p.id).toBe(false);
    }
  });
  it('lungState is the lung (absolute); a page patch to the lung holds only until the next lungState', () => {
    const core = createLinkCore(createVent(), PROFILES.normal!);
    const ev = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 } as const;
    linkEvent(core, ev);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40 });
    expect(core.vs.cfg.resistance).toBe(40);
    patchVent(core, { compliance: 20, resistance: 10 });
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([20, 10]);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40, shunt: 0.1 });
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([50, 40]);
  });
  // One sim-minute of engine + ventilator: ≈ 2 s alone, 8.6 s when `pnpm -r test` runs the packages in parallel —
  // the CI budget (G2) instead of Vitest's 5 s default.
  it('in-process: the engine counts the ventilator’s 14 breaths/min', { timeout: 300_000 }, () => {
    const s = createLinkedSim({ profile: 'normal' });
    s.advanceTo(60);
    const br = s.events.filter((e) => e.type === 'breath' && e.t > 15);
    expect(br.length).toBeGreaterThanOrEqual(10);
    expect(br.length).toBeLessThanOrEqual(11);
  });
});
