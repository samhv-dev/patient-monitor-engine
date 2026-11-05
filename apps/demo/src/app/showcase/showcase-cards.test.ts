// The Showcase cards as content — every document is valid, every button's commands are accepted by an engine built from
// the card's own patient, every state can be reached from the start, the card fields read like a case, the objectives
// are checkable (a number or a time in each), and the library lists the Showcase cards in the demonstration order. The
// physiology of each card is in the *.slow.test.ts files beside this one (PME_TEST_SET=showcase).
import { createEngine, type Command } from '@pme/engine-core';
import { engineOptionsOf, isV2, validateScenario, type DocCommand, type ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY, objectiveText, SHOWCASE_ORDER } from '../scenarios.ts';
import { anyShowcaseDoc, SHOWCASE_IDS, showcaseDoc } from './harness.ts';

/** The /1 cards (the /2 MH card, plan F8, has phases, not states: its own test below). */
const V1_IDS = SHOWCASE_IDS.filter((id) => !isV2(anyShowcaseDoc(id)));

const SHOWCASE = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-mh-v2', 'showcase-tamponade', 'showcase-haemorrhage'];
const NEW = ['showcase-induction', 'showcase-induction-premed', 'showcase-mh', 'showcase-tamponade', 'showcase-haemorrhage'];

describe('Showcase cards', () => {
  it('the Showcase group is the seven cards (the /2 MH card after the /1 one), in the demonstration order, first in the library; bronchospasm stays in the library', () => {
    expect(SHOWCASE_ORDER).toEqual(SHOWCASE);
    expect(LIBRARY.filter((c) => c.category === 'Showcase').map((c) => c.id)).toEqual(SHOWCASE);
    expect(LIBRARY.slice(0, SHOWCASE.length).map((c) => c.id)).toEqual(SHOWCASE);
    expect(LIBRARY.find((c) => c.id === 'showcase-bronchospasm')?.category).toBe('Airway and breathing');
  });

  it('showcase-mh-v2 (pme-scenario/2): valid, and every action\'s give and script command accepted by an engine of its own patient', () => {
    const doc = anyShowcaseDoc('showcase-mh-v2');
    if (!isV2(doc)) throw new Error('not /2');
    const v = validateScenario(doc);
    expect(v.ok ? [] : v.errors).toEqual([]);
    const eo = engineOptionsOf(doc, 7);
    const e = createEngine({ ...eo, mode: doc.mode ?? 'modeled', patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
    const cmds: DocCommand[] = [...doc.actions.flatMap((a) => a.give ?? []), ...(doc.script ?? []).flatMap((s) => s.commands)];
    expect(cmds.length).toBeGreaterThan(20);
    for (const [i, c] of cmds.entries()) {
      const { $comment: _drop, ...cmd } = c as DocCommand & { $comment?: string };
      const r = e.dispatch({ id: `v2-${i}`, issuedBy: 'test', ...(cmd as object) } as Command);
      expect(r.accepted, `${JSON.stringify(c)}: ${r.reason}`).toBe(true);
    }
  });

  it.each(V1_IDS)('%s: valid, every state reachable, every command accepted by an engine of its own patient', (id) => {
    const doc = showcaseDoc(id);
    const v = validateScenario(doc);
    expect(v.ok ? [] : v.errors).toEqual([]);
    const seen = new Set([doc.initialState]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const s of doc.states) if (seen.has(s.id)) for (const t of s.transitions ?? []) if (!seen.has(t.to)) (seen.add(t.to), (grew = true));
    }
    expect(doc.states.map((s) => s.id).filter((s) => !seen.has(s)), 'unreachable states').toEqual([]);
    const eo = engineOptionsOf(doc, 7);
    const e = createEngine({ ...eo, mode: doc.mode ?? 'modeled', patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
    const cmds: DocCommand[] = doc.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);
    for (const [i, c] of cmds.entries()) {
      const r = e.dispatch({ id: `${id}-${i}`, issuedBy: 'test', ...(c as object) } as Command);
      expect(r.accepted, `${JSON.stringify(c)}: ${r.reason}`).toBe(true);
    }
  });

  it.each(NEW)('%s: a case card — story, measurable objectives, every state labelled, every button labelled once per state', (id) => {
    const doc: ScenarioDoc = showcaseDoc(id);
    expect(doc.category).toBe('Showcase');
    expect(doc.mode).toBe('modeled');
    expect(doc.title).not.toMatch(/^\[draft\]/i);
    expect(doc.story?.length ?? 0).toBeGreaterThan(120);
    expect(doc.objectives?.length ?? 0).toBeGreaterThanOrEqual(3);
    for (const o of (doc.objectives ?? []).map(objectiveText)) expect(o, `objective without a number: ${o}`).toMatch(/\d/); // { text, rule }
    for (const s of doc.states) {
      expect(s.label?.length ?? 0, s.id).toBeGreaterThan(5);
      const manual = (s.transitions ?? []).flatMap((t) => ('manual' in t.when ? [t.when.manual.label] : 'any' in t.when ? t.when.any.flatMap((w) => ('manual' in w ? [w.manual.label] : [])) : []));
      expect(new Set(manual).size, `${s.id}: a button label twice`).toBe(manual.length);
    }
  });

  it('the tamponade card narrates the FAST finding where the recognition cues appear (the monitor alone cannot diagnose it)', () => {
    const doc: ScenarioDoc = showcaseDoc('showcase-tamponade');
    const fast = '“Bedside FAST: pericardial fluid, right-ventricular collapse.”';
    for (const id of ['arrival', 'deteriorating']) expect(doc.states.find((s) => s.id === id)?.notes, id).toContain(fast);
    expect(doc.states.find((s) => s.id === 'arrival')?.notes).toMatch(/^Say it when the cues appear \(about 1:00\)/);
  });

  it('the MH ventilation objective judges 2 min of EtCO₂ below 40 before the ventilation goes back', () => {
    const doc: ScenarioDoc = showcaseDoc('showcase-mh');
    const vent = (doc.objectives ?? []).find((o) => typeof o !== 'string' && o.rule?.kind === 'heldThen');
    expect(vent).toEqual({
      text: 'Hyperventilation kept until EtCO₂ has stayed below 40 mmHg for 2 min, then ventilation normalised (back to 12 × 500)',
      rule: { kind: 'heldThen', from: 'state:triggerOff', value: 'etco2', below: 40, forS: 120, event: 'state:normoventilated' },
    });
    expect((doc.objectives ?? []).map(objectiveText)).not.toContainEqual(expect.stringMatching(/within 300 s of EtCO₂ falling below 40/));
    expect(doc.objectives).toHaveLength(6); // the other four unchanged, after E52's recognition objective
  });

  it('the MH Cool is offered only above 38.5 °C; its saline is refrigerated (4 °C) and the team stops it at 38 °C (MHAUS)', () => {
    const doc: ScenarioDoc = showcaseDoc('showcase-mh');
    const COOL = 'Cool: refrigerated saline 20 mL/kg (1.6 L)';
    const cools = doc.states.flatMap((s) => (s.transitions ?? []).filter((t) => t.to === 'cooling').map((t) => [s.id, t.when] as const));
    expect(cools.map(([s]) => s)).toEqual(['triggerOff', 'treating', 'recovering', 'normoventilated']);
    for (const [s, when] of cools) expect(when, s).toEqual({ all: [{ vital: { var: 'tempCore', op: '>', value: 38.5 } }, { manual: { label: COOL } }] });
    const fluid = doc.states.find((s) => s.id === 'cooling')?.onEnter?.find((c) => c.type === 'applyEvent');
    expect(fluid).toMatchObject({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'saline', volumeMl: 1600, overS: 900, tempC: 4, stopAtCoreC: 38 } });
    expect(doc.notes).not.toMatch(/no input for refrigerated fluid/);
  });
});
