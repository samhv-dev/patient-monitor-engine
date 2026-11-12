// Plan defibrillator-zoll-m2.md §5.1, piece R1 (DQ5 = A, DQ6 = A, ruled 12 November 2026): what an ADMITTED learner
// defibrillator screen (the learner PIN proved, the host's grant) may send — exactly the ZOLL M2's own controls of §5.1,
// as E0 froze them (engine-core m2-vocabulary.ts M2_COMMANDS), and nothing an instructor does. The list is held complete
// in both directions: every §5.1 control has its shape in the table, the table holds nothing §5.1 does not give, and every
// `device defib` action of the vocabulary is classified, so a key added later fails here until someone classifies it.
// The values are the engine's to validate at dispatch (E0); the table checks the shapes and their fields.
import { M2_COMMANDS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import {
  LEARNER_DEFIB_COMMANDS, LEARNER_DEFIB_M2, M2_DEVICE_ACTION_CLASS, defibShape, learnerDefibM2May, learnerDefibMay, type CommandInput,
} from '../src/protocol.ts';

const cmd = (c: object) => ({ id: 'k1', issuedBy: 'defib-a', ...c }) as unknown as CommandInput;
const ev = (event: object, extra: object = {}) => cmd({ type: 'applyEvent', event, ...extra });
const defib = (event: object, extra: object = {}) => ev({ kind: 'defib', ...event }, extra);
const dev = (action: string, value?: unknown, extra: object = {}) =>
  cmd({ type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) }, ...extra });

/**
 * Plan §5.1 "Allowed", item by item, with the wire shape each rides (E0's vocabulary: energy, charge, disarm and sync stay
 * `applyEvent defib`, the pacer's mode, rate and output `applyEvent pacer`, the rest `device defib <action>`).
 */
const SECTION_5_1: ReadonlyArray<[string, readonly string[]]> = [
  ['mode selector', ['device defib selector']],
  ['energy select', ['applyEvent defib selectEnergy']],
  ['charge', ['applyEvent defib charge']],
  ['shock down/up', ['device defib shockButton', 'applyEvent defib shock']],
  ['disarm', ['applyEvent defib disarm']],
  ['sync on/off', ['applyEvent defib syncOn', 'applyEvent defib syncOff']],
  ['Analyze', ['device defib analyze']],
  ['Manual/AED switch', ['device defib defibMode']],
  ['patient type', ['device defib patientType']],
  ['pacer mode/rate/output/start', ['applyEvent pacer']],
  ['4:1 down/up', ['device defib fourToOne']],
  ['Alarm Control', ['device defib alarmControl']],
  ["the M2's alarm limits and settings", ['device defib alarmLimit', 'device defib setting']],
  ['NIBP start/stop', ['device defib nibp']],
  ['CO2 on/zero', ['device defib co2']],
  ['code marker', ['device defib codeMarker']],
  ['print', ['device defib print']],
  ["the connections drawer's pads and paddles", ['device defib connect']],
];

/** One legal command of every shape in the table (values as E0's validators take them). */
const EXAMPLES: Readonly<Record<string, CommandInput>> = {
  'applyEvent defib selectEnergy': defib({ action: 'selectEnergy', energyJ: 150 }),
  'applyEvent defib charge': defib({ action: 'charge' }),
  'applyEvent defib shock': defib({ action: 'shock' }),
  'applyEvent defib disarm': defib({ action: 'disarm' }),
  'applyEvent defib syncOn': defib({ action: 'syncOn' }),
  'applyEvent defib syncOff': defib({ action: 'syncOff' }),
  'applyEvent pacer': ev({ kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 70, mA: 60 }),
  'device defib selector': dev('selector', 'pacer'),
  'device defib patientType': dev('patientType', 'pediatric'),
  'device defib defibMode': dev('defibMode', { mode: 'aed' }),
  'device defib shockButton': dev('shockButton', { phase: 'down', button: 'panel' }),
  'device defib analyze': dev('analyze'),
  'device defib fourToOne': dev('fourToOne', { phase: 'down' }),
  'device defib alarmControl': dev('alarmControl', { phase: 'up', heldMs: 1200 }),
  'device defib alarmLimit': dev('alarmLimit', { param: 'HR', low: 50, high: 120 }),
  'device defib nibp': dev('nibp', 'press'),
  'device defib co2': dev('co2', 'zero'),
  'device defib codeMarker': dev('codeMarker', { label: 'Adrenaline' }),
  'device defib print': dev('print', 'press'),
  'device defib connect': dev('connect', { pads: { type: 'adult', placement: 'anteriorPosterior', contact: 'good' } }),
  'device defib setting': dev('setting', { nibpMode: 'auto', nibpIntervalMin: 5 }),
};

describe('the admitted learner defibrillator: the table is §5.1, both ways (plan defibrillator-zoll-m2.md R1)', () => {
  it('every §5.1 control has its shape in the table, and the table holds no shape §5.1 does not give', () => {
    const fromPlan = SECTION_5_1.flatMap(([, shapes]) => shapes).sort();
    expect(Object.keys(LEARNER_DEFIB_M2).sort()).toEqual(fromPlan);
    for (const [item, shapes] of SECTION_5_1) for (const s of shapes) expect(LEARNER_DEFIB_M2[s]?.section, s).toBe(item);
  });

  it('every `device defib` action of the vocabulary (E0 M2_COMMANDS, and model) is classified; the learner ones are in the table, no other', () => {
    const vocabulary = ['model', ...Object.keys(M2_COMMANDS)].sort();
    expect(Object.keys(M2_DEVICE_ACTION_CLASS).sort()).toEqual(vocabulary); // a key added to M2_COMMANDS fails here until classified
    for (const [action, cls] of Object.entries(M2_DEVICE_ACTION_CLASS))
      expect(Object.hasOwn(LEARNER_DEFIB_M2, `device defib ${action}`), action).toBe(cls === 'learner');
    expect(M2_DEVICE_ACTION_CLASS.model).toBe('refused');
    expect(M2_DEVICE_ACTION_CLASS.config).toBe('roomSetup'); // §5.4: the Supervisor configuration is set in Room setup (R4)
  });

  it('every allowed shape passes, with its own fields', () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual(Object.keys(LEARNER_DEFIB_M2).sort());
    for (const [shape, c] of Object.entries(EXAMPLES)) {
      expect(defibShape(c), shape).toBe(shape);
      expect(learnerDefibM2May(c), shape).toBeNull();
    }
    // the pacer's mode alone, and its rate or output alone with the mode (the Trim Knob's step)
    expect(learnerDefibM2May(ev({ kind: 'pacer', mode: 'off' }))).toBeNull();
    expect(learnerDefibM2May(ev({ kind: 'pacer', mode: 'demand', mA: 62 }))).toBeNull();
  });

  it('connect is the learner\'s (DQ5 = A): the instructor\'s override is the laptop\'s own path and never crosses the relay', () => {
    // nothing on the wire tells the two apart, and nothing needs to: the instructor's own commands go from the laptop
    // (a controller, or the granted instructor phone), never through a `defib` socket
    for (const value of [{ ecgCable: '5' }, { spo2: true, nibp: true }, { therapy: 'externalPaddles', paddles: { pediPlates: false, shockButtons: true, contact: 'good' } }, { ecgLeadsOff: true }])
      expect(learnerDefibM2May(dev('connect', value)), JSON.stringify(value)).toBeNull();
  });

  it('refuses the instructor\'s and the room\'s: preselect, a pacer fault or pause, the model, the configuration, time, scenario, drug, setTarget', () => {
    const refused: Array<[string, CommandInput]> = [
      ['preselect', defib({ action: 'preselect', outcome: 'sinus' })],
      // the engine's PacerEvent takes `fault` (l3/defib-pacer/pacer.ts); the controller's ClinicalEvent pacer type does not
      // declare it, so it is refused by field, not by type
      ['pacer fault', ev({ kind: 'pacer', mode: 'demand', fault: 'failureToCapture' })],
      ['pacer fault none', ev({ kind: 'pacer', mode: 'demand', fault: 'none' })],
      // §5.1 does not give it: the M2 pauses pacing by setting 0 mA [G 1-11]
      ['pacer pause', ev({ kind: 'pacer', mode: 'fixed', pause: true })],
      ['pacer with no mode', ev({ kind: 'pacer', mA: 60 })],
      ['device defib model', dev('model', 'generic')],
      ['device defib config', dev('config', { readyTimeoutS: 30 })],
      ['device defib unknown', dev('lead', 'II')],
      ['the bedside monitor\'s alarms', cmd({ type: 'device', action: { device: 'alarm', action: 'silence' } })],
      ['the bedside monitor\'s skin', cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'philips' } })],
      ['a device action that is not an object', cmd({ type: 'device', action: 'selector' })],
      ['setTarget', cmd({ type: 'setTarget', variable: 'hr', value: 80 })],
      ['time pause', cmd({ type: 'time', action: 'pause' })],
      ['time scale', cmd({ type: 'time', action: 'scale', value: 8 })],
      ['time jump', cmd({ type: 'time', action: 'jump', value: 60 })],
      ['scenario trigger', cmd({ type: 'scenario', action: 'trigger', target: 't1' })],
      ['scenario load', cmd({ type: 'scenario', action: 'load' })],
      ['drug', ev({ kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' })],
      ['cpr', ev({ kind: 'cpr', active: true })],
      ['setRhythm', cmd({ type: 'setRhythm', rhythm: 'sinus' })],
      ['pin', cmd({ type: 'pin', variable: 'hr', value: 30 })],
      ['note', cmd({ type: 'note', kind: 'note', text: 'shocked' })],
      // stray fields, on the command, the event or the device action
      ['charge with energyJ', defib({ action: 'charge', energyJ: 360 })],
      ['shock with an outcome', defib({ action: 'shock', outcome: 'sinus' })],
      ['selectEnergy without energyJ', defib({ action: 'selectEnergy' })],
      ['shock with atTick', defib({ action: 'shock' }, { atTick: 5000 })],
      ['shock with a device key of its own', defib({ action: 'shock' }, { by: 'other0001' })],
      ['selector with a lane', cmd({ type: 'device', action: { device: 'defib', action: 'selector', value: 'defib', lane: 'x' } })],
      ['selector with no value', dev('selector')],
      ['analyze with a value', dev('analyze', 'now')],
      ['shockButton with atTick', dev('shockButton', { phase: 'up', button: 'panel' }, { atTick: 9 })],
    ];
    for (const [what, c] of refused) expect(learnerDefibM2May(c), what).toEqual(expect.any(String));
  });

  it("today's window, with no PIN, keeps exactly its two bare presses (learnerDefibMay unchanged)", () => {
    expect([...LEARNER_DEFIB_COMMANDS].sort()).toEqual(['applyEvent defib charge', 'applyEvent defib shock']);
    for (const [shape, c] of Object.entries(EXAMPLES))
      expect(learnerDefibMay(c) === null, shape).toBe(shape === 'applyEvent defib charge' || shape === 'applyEvent defib shock');
  });
});
