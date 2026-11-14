// Brief 174 (finding N105 of piece 162; docs/plans/scenario-builder.md §5.2): a card can script a lung condition, a TCI,
// a mainstem intubation, a recruitment and a lab sample. The schema's event kinds gain the five; the validator asks the
// engine's own validation hook for each (no type, unit or range is written in the controller, nor in this test: every
// refusal below is compared with the engine's own words for the same event); the driver sends them as it sends every
// scripted event, and the engine applies each. An existing card is unchanged: valid, with none of the five in it.
import { readdirSync, readFileSync } from 'node:fs';
import { createPkState, validateBloodCommand, validatePkCommand, validateRespCommand, type Command, type DispatchResult } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import schema1 from '../../scenarios/pme-scenario-1.schema.json';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { ENGINE_CHECKED_KINDS, eventRefusal, validateScenario } from '../../src/scenario/validate.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { minimalV2 } from './fixtures-v2.ts';

type Rec = Record<string, unknown>;
const cmd = (event: Rec) => ({ type: 'applyEvent', event });
/** The engine's hook for each kind, as engine.ts's validate() chain reaches it (resp, blood, pk). */
const engineSays = (event: Rec): string | undefined => {
  const c = { type: 'applyEvent', id: 't', issuedBy: 'test', event } as unknown as Command;
  return (event.kind === 'lab' ? validateBloodCommand(c) : event.kind === 'tci' ? validatePkCommand(c, createPkState()) : validateRespCommand(c)) ?? undefined;
};
/** One of each kind, as the console sends them (a test's numbers, never a card's). */
const GOOD: Rec[] = [
  { kind: 'lungCondition', id: 'bronchospasm', severity: 0.67 },
  { kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' },
  { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 },
  { kind: 'mainstem', ventilated: 'right' },
  { kind: 'recruit', pressureCmH2O: 40, durationS: 30 },
  { kind: 'lab', panel: 'abg' },
  { kind: 'lab', panel: 'chem' },
];
const BAD: Rec[] = [
  { kind: 'lungCondition', id: 'bronchospasm', severity: 1.5 },
  { kind: 'lungCondition', id: 'flu', severity: 0.5 },
  { kind: 'lungCondition', id: 'effusion', severity: 0.5, side: 'both' },
  { kind: 'lungCondition', id: 'bronchospasm' },
  { kind: 'lungCondition', id: 'bronchospasm', severity: '1' },
  { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 500 },
  { kind: 'tci', drugId: 'propofol', mode: 'bolus', target: 3 },
  { kind: 'tci', drugId: 'nothing', mode: 'plasma', target: 3 },
  { kind: 'tci', drugId: 'propofol', mode: 'plasma', target: 3, model: 'nobody' },
  { kind: 'mainstem', ventilated: 'middle' },
  { kind: 'recruit', pressureCmH2O: 100, durationS: 30 },
  { kind: 'recruit', pressureCmH2O: 40 },
  { kind: 'lab', panel: 'cbc' },
  { kind: 'lab', panel: 'abg', turnaroundS: 1 },
];
const v2With = (commands: Rec[]) => ({ ...minimalV2(), script: [{ id: 'beat', on: 'phase:early', commands }] });
const v1With = (commands: Rec[]) => ({ schema: 'pme-scenario/1', id: 'v1', title: 'V1', initialState: 's', states: [{ id: 's', label: 'S', onEnter: commands }] });

describe('the five kinds in the format (brief 174)', () => {
  it('the schema’s event kinds include the five, after every kind it had (none removed)', () => {
    const kinds = (schema1 as { definitions: { eventKind: { enum: string[] } } }).definitions.eventKind.enum;
    expect(kinds.slice(-5)).toEqual(['lungCondition', 'tci', 'mainstem', 'recruit', 'lab']);
    expect(kinds).toEqual(expect.arrayContaining(['drug', 'fluid', 'bleed', 'airway', 'ventilation', 'preoxygenate', 'cpr', 'defib', 'pacer', 'line', 'surgical', 'condition', 'stimulus', 'airwayDevice', 'neuroProfile', 'vaporiser', 'infusion']));
    expect([...ENGINE_CHECKED_KINDS].sort()).toEqual(['lab', 'lungCondition', 'mainstem', 'recruit', 'tci']);
  });

  it('an event the engine takes is a valid script command, a give and a /1 onEnter', () => {
    for (const e of GOOD) {
      expect(engineSays(e)).toBeUndefined();
      expect(eventRefusal(e)).toBeUndefined();
      expect(validateScenario(v2With([cmd(e)]))).toMatchObject({ ok: true });
      const give = minimalV2();
      give.actions[0].give.push(cmd(e));
      expect(validateScenario(give)).toMatchObject({ ok: true });
      expect(validateScenario(v1With([cmd(e)]))).toMatchObject({ ok: true });
    }
  });

  it('an event the engine refuses is refused at its path, in the engine’s own words', () => {
    for (const e of BAD) {
      const why = engineSays(e);
      expect(why, JSON.stringify(e)).toBeTruthy();
      expect(eventRefusal(e)).toBe(why);
      const r2 = validateScenario(v2With([cmd({ kind: 'mainstem', ventilated: 'both' }), cmd(e)]));
      expect(r2).toEqual({ ok: false, errors: [`/script/0/commands/1/event: ${why}`], warnings: [] });
      const r1 = validateScenario(v1With([cmd(e)]));
      expect(r1).toEqual({ ok: false, errors: [`/states/0/onEnter/0/event: ${why}`], warnings: [] });
    }
  });

  it('every other kind is left to the engine at run time, as before: no field check is added', () => {
    expect(eventRefusal({ kind: 'drug', drugId: 'propofol', dose: -1, unit: 'mg', route: 'iv' })).toBeUndefined();
    expect(eventRefusal({ kind: 'condition', id: 'mh', severity: 7 })).toBeUndefined();
    expect(eventRefusal({ kind: 'toString' })).toBeUndefined();
  });
});

describe('the library: every existing card is valid as before and scripts none of the five', () => {
  const dir = new URL('../../scenarios/', import.meta.url);
  const cards = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('schema'));
  const kindsIn = (x: unknown, out: string[] = []): string[] => {
    if (Array.isArray(x)) x.forEach((y) => kindsIn(y, out));
    else if (x && typeof x === 'object') {
      const r = x as Rec;
      if (r.type === 'applyEvent' && r.event && typeof r.event === 'object') out.push(String((r.event as Rec).kind));
      Object.values(r).forEach((y) => kindsIn(y, out));
    }
    return out;
  };
  it.each(cards)('%s', (f) => {
    const doc = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as unknown;
    expect(validateScenario(doc)).toMatchObject({ ok: true });
    expect(kindsIn(doc).filter((k) => ENGINE_CHECKED_KINDS.includes(k))).toEqual([]);
  });
});

describe('the driver sends each kind as it sends every scripted event, and the engine applies it', () => {
  it('a /2 card scripting the five at its start: every command accepted, the TCI on the record as card-set', async () => {
    const host = manualHost({ seed: 42 });
    const sent: Array<{ cmd: Command; accepted: boolean; reason?: string }> = [];
    const target = { ...host, dispatch: (c: Command) => { const r = host.dispatch(c) as DispatchResult; sent.push({ cmd: c, accepted: r.accepted, ...(r.reason ? { reason: r.reason } : {}) }); return r; } };
    const driver = new ScenarioDriver({ target });
    const doc = { ...minimalV2(), script: [{ id: 'five', on: { atScenarioS: 1 }, commands: GOOD.map(cmd) }] };
    expect(driver.load(doc)).toMatchObject({ ok: true });
    for (let tick = 1; tick <= 150; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
    const five = sent.filter((s) => s.cmd.type === 'applyEvent' && ENGINE_CHECKED_KINDS.includes((s.cmd as { event: { kind: string } }).event.kind));
    expect(five.map((s) => (s.cmd as { event: Rec }).event)).toEqual(GOOD);
    expect(five.map((s) => [s.accepted, s.reason])).toEqual(GOOD.map(() => [true, undefined]));
    expect(five.every((s) => s.cmd.issuedBy === 'scenario')).toBe(true);
    const tci = driver.phaseRunner!.admin.filter((a) => a.kind === 'tci');
    expect(tci).toMatchObject([{ source: 'script', drugId: 'propofol', settings: { mode: 'effect', target: 3 }, result: { accepted: true }, cardSet: true }]);
  });
});
