import { describe, expect, it } from 'vitest';
import { assertWireSafe, findSampleLeak, parseWireMessage, WIRE_LIMITS, WireSafetyError } from '../src/guard.ts';
import { createStamper, INSTRUMENTS, LEARNER_COMMANDS, LEARNER_DEFIB_COMMANDS, LEARNER_LAB_PANELS, learnerDefibMay, learnerMay, NOTE_EVENTS, PUMP_COMMANDS, pumpMay, type CommandInput, type WireMessage } from '../src/protocol.ts';
import { createEngine } from '@pme/engine-core';

const stamp = createStamper('ABC234', 'host-1');

describe('sample guard (runtime half of "raw samples never cross the wire")', () => {
  it('passes real traffic: events, commands and a real engine snapshot', () => {
    const e = createEngine({ seed: 3 });
    e.advanceTo(20);
    const events: WireMessage = stamp({ kind: 'event', body: [{ type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } }] });
    const snap: WireMessage = stamp({ kind: 'snapshot', body: e.snapshot() });
    expect(findSampleLeak(events)).toBeNull();
    expect(findSampleLeak(snap)).toBeNull();
    expect(JSON.stringify(snap).length).toBeLessThan(WIRE_LIMITS.maxBytes);
  });

  it('refuses typed arrays, ArrayBuffers, long numeric runs and sample-named keys anywhere', () => {
    const ev = (extra: object) => ({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'measurement', t: 0, values: {}, ...extra }] }) as unknown as WireMessage;
    expect(findSampleLeak(ev({ x: new Float32Array(4) }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: { y: new ArrayBuffer(8) } }))).toMatch(/binary/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 65 }, (_, i) => i) }))).toMatch(/numeric array of 65/);
    expect(findSampleLeak(ev({ x: Array.from({ length: 64 }, (_, i) => i) }))).toBeNull();
    expect(findSampleLeak(ev({ samples: [1, 2] }))).toMatch(/forbidden key/);
    expect(() => assertWireSafe(ev({ waveform: [] }))).toThrow(WireSafetyError);
  });

  it('allows up to 1024-long numeric arrays only inside a snapshot', () => {
    const big = Array.from({ length: 1000 }, () => 0);
    const s = stamp({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: '0', seed: 1, tick: 0, state: { big } } });
    expect(findSampleLeak(s)).toBeNull();
    const s2 = { ...s, body: { ...(s as Extract<WireMessage, { kind: 'snapshot' }>).body, state: { big: [...big, ...big] } } } as WireMessage;
    expect(findSampleLeak(s2)).toMatch(/2000/);
  });
});

describe('parseWireMessage (untrusted input)', () => {
  const good = stamp({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } });
  it('accepts a JSON string or an object', () => {
    expect(parseWireMessage(JSON.stringify(good))).toEqual(good);
    expect(parseWireMessage(good)).toEqual(good);
  });
  it('rejects malformed, wrong-version, unknown-kind, oversized and sample-carrying input', () => {
    expect(parseWireMessage('{nope')).toBeNull();
    expect(parseWireMessage({ ...good, v: 2 })).toBeNull();
    expect(parseWireMessage({ ...good, kind: 'samples' })).toBeNull();
    expect(parseWireMessage({ ...good, seq: 0 })).toBeNull();
    expect(parseWireMessage({ ...good, body: { type: 'setTarget' } })).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'hello', role: 'host' }), role: 'admin' })).toBeNull();
    expect(parseWireMessage('x'.repeat(WIRE_LIMITS.maxBytes + 1))).toBeNull();
    expect(parseWireMessage({ ...stamp({ kind: 'event', body: [] }), body: [{ type: 'x', data: new Float32Array(2) }] })).toBeNull();
  });
});

describe('the instructor role on the wire (plan instructor-peer-role.md §1, §2, §6; P2)', () => {
  const hello = (role: string, pin?: unknown) => ({ ...stamp({ kind: 'hello', role: 'controller' }), role, ...(pin === undefined ? {} : { pin }) });
  const command = (body: Record<string, unknown>) => ({ ...stamp({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } }), body: { id: 'c2', issuedBy: 'remote', ...body } });

  it('accepts an instructor hello with a PIN of 4 to 8 digits', () => {
    expect(parseWireMessage(hello('instructor', '4729'))).toMatchObject({ kind: 'hello', role: 'instructor', pin: '4729' });
    expect(parseWireMessage(JSON.stringify(hello('instructor', '47291234')))).not.toBeNull();
  });

  it('refuses a PIN on any other role, a non-digit PIN, and a PIN of 3 or of 9 characters', () => {
    for (const role of ['host', 'controller', 'viewer']) expect(parseWireMessage(hello(role, '4729')), role).toBeNull();
    for (const pin of ['47a9', '47 9', '４７２９', '-472', '4729\n', 4729, null, ''])
      expect(parseWireMessage(hello('instructor', pin)), JSON.stringify(pin)).toBeNull();
    expect(parseWireMessage(hello('instructor', '472'))).toBeNull();
    expect(parseWireMessage(hello('instructor', '472912345'))).toBeNull();
  });

  it('accepts grant {to, granted, reason?} and refuses a grant without to or granted', () => {
    const grant = (o: Record<string, unknown>) => ({ ...stamp({ kind: 'ack', commandId: 'x', accepted: true, tick: 0 }), kind: 'grant', commandId: undefined, accepted: undefined, tick: undefined, ...o });
    expect(parseWireMessage(JSON.stringify(grant({ to: 'ctl-abc.1', granted: true })))).toMatchObject({ kind: 'grant', to: 'ctl-abc.1', granted: true });
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: false, reason: 'the PIN was changed' }))).not.toBeNull();
    expect(parseWireMessage(grant({ granted: true }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1' }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: 'yes' }))).toBeNull();
    expect(parseWireMessage(grant({ to: 7, granted: true }))).toBeNull();
    expect(parseWireMessage(grant({ to: 'ctl-abc.1', granted: false, reason: 3 }))).toBeNull();
  });

  it('accepts the note command (kind note or marker, text of at most 500 characters) and refuses a longer text', () => {
    expect(parseWireMessage(command({ type: 'note', kind: 'note', text: 'Dantrolene drawn up' }))).not.toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'marker', text: 'x'.repeat(500) }))).not.toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'note', text: 'x'.repeat(501) }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'stage', text: 'x' }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', text: 'x' }))).toBeNull();
    expect(parseWireMessage(command({ type: 'note', kind: 'note' }))).toBeNull();
  });

  it("the note command's optional event tag (brief 52): a known tag accepted from the phone and a controller alike, an unknown or non-string tag refused, a note without one unchanged", () => {
    for (const issuedBy of ['instructor', 'remote', 'ctl-abc.1']) {
      for (const kind of ['note', 'marker'] as const) {
        const m = parseWireMessage(command({ issuedBy, type: 'note', kind, text: 'Recognised (instructor)', ev: 'recognised' }));
        expect(m, `${issuedBy} ${kind}`).toMatchObject({ kind: 'command', body: { type: 'note', kind, text: 'Recognised (instructor)', ev: 'recognised' } });
      }
    }
    expect([...NOTE_EVENTS]).toEqual(['recognised']);
    for (const ev of ['Recognised', 'recognized', 'cprStop', 'state:x', '', 1, true, null, ['recognised'], { recognised: true }])
      expect(parseWireMessage(command({ type: 'note', kind: 'marker', text: 'x', ev })), JSON.stringify(ev)).toBeNull();
    const plain = parseWireMessage(command({ type: 'note', kind: 'note', text: 'Dantrolene drawn up' }));
    expect(plain).not.toBeNull();
    expect(plain?.kind === 'command' && 'ev' in plain.body).toBe(false);
    // the tag does not lift the text limit
    expect(parseWireMessage(command({ type: 'note', kind: 'marker', text: 'x'.repeat(501), ev: 'recognised' }))).toBeNull();
  });
});

describe("the hello's `show` and `device` (plan room-and-instruments.md §4 D1, R3)", () => {
  const hello = (role: string, extra: Record<string, unknown> = {}) => ({ ...stamp({ kind: 'hello', role: 'viewer' }), role, ...extra });

  it('accepts a viewer hello with show and device, each alone, and every instrument the list names', () => {
    expect(parseWireMessage(hello('viewer', { show: 'defib', device: 'k3x9q2m7' }))).toMatchObject({ kind: 'hello', role: 'viewer', show: 'defib', device: 'k3x9q2m7' });
    expect(parseWireMessage(JSON.stringify(hello('viewer', { show: 'learner' })))).not.toBeNull();
    expect(parseWireMessage(hello('viewer', { device: '0123456789abcdef' }))).not.toBeNull();
    expect([...INSTRUMENTS]).toEqual(['learner', 'monitor', 'defib', 'depth']);
    for (const show of INSTRUMENTS) expect(parseWireMessage(hello('viewer', { show, device: 'abcd1234' })), show).not.toBeNull();
  });

  it('refuses show or device on any other role', () => {
    for (const role of ['host', 'controller', 'instructor']) {
      expect(parseWireMessage(hello(role, { show: 'learner' })), `${role} show`).toBeNull();
      expect(parseWireMessage(hello(role, { device: 'k3x9q2m7' })), `${role} device`).toBeNull();
    }
    expect(parseWireMessage(hello('instructor', { pin: '4729', show: 'learner' }))).toBeNull();
  });

  it('refuses an unknown show', () => {
    for (const show of ['vent', 'iabp', 'remote', 'pick', 'Learner', 'learner ', '', 1, null, ['learner'], { learner: true }])
      expect(parseWireMessage(hello('viewer', { show })), JSON.stringify(show)).toBeNull();
  });

  it('refuses a device outside [a-z0-9]{8,16}', () => {
    for (const device of ['k3x9q2m', '0123456789abcdef0', 'K3X9Q2M7', 'k3x9-q2m7', 'k3x9q2m7\n', 'k3x9q2m\u00e9', '', 12345678, null])
      expect(parseWireMessage(hello('viewer', { device })), JSON.stringify(device)).toBeNull();
  });

  it('leaves a hello without them unchanged', () => {
    for (const role of ['host', 'controller', 'viewer']) {
      const m = hello(role);
      expect(parseWireMessage(m), role).toEqual(m);
    }
    expect(parseWireMessage(hello('instructor', { pin: '4729' }))).toMatchObject({ role: 'instructor', pin: '4729' });
  });
});

// Plan room-and-instruments.md R5c (Q5 ruled 5 November): the learner defibrillator window joins as `defib`, like a
// learner (no PIN), and may send exactly two command shapes: Charge and Shock, the room's model choosing the energy.
describe('the learner defibrillator role (plan room-and-instruments.md R5c)', () => {
  const hello = (role: string, extra: Record<string, unknown> = {}) => ({ ...stamp({ kind: 'hello', role: 'viewer' }), role, ...extra });
  it('a `defib` hello is legal alone and with show and device; never with a PIN', () => {
    expect(parseWireMessage(hello('defib'))).toMatchObject({ kind: 'hello', role: 'defib' });
    expect(parseWireMessage(hello('defib', { show: 'defib', device: 'k3x9q2m7' }))).toMatchObject({ role: 'defib', show: 'defib', device: 'k3x9q2m7' });
    expect(parseWireMessage(hello('defib', { device: 'k3x9q2m7' }))).not.toBeNull();
    expect(parseWireMessage(hello('defib', { pin: '4729' }))).toBeNull();
    expect(parseWireMessage(hello('defib', { show: 'vent' }))).toBeNull();
    expect(parseWireMessage(hello('defib', { device: 'K3X9' }))).toBeNull();
  });

  const cmd = (c: object) => ({ id: 'k1', issuedBy: 'defib-a', ...c }) as unknown as CommandInput;
  const defib = (event: object, extra: object = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', ...event }, ...extra });
  it('LEARNER_DEFIB_COMMANDS is exactly Charge and Shock; learnerDefibMay passes both, bare', () => {
    expect([...LEARNER_DEFIB_COMMANDS].sort()).toEqual(['applyEvent defib charge', 'applyEvent defib shock']);
    expect(learnerDefibMay(defib({ action: 'charge' }))).toBeNull();
    expect(learnerDefibMay(defib({ action: 'shock' }))).toBeNull();
  });

  it('refuses an energy, an outcome or a tick, every other defibrillator action and every other command', () => {
    const refused: Array<[string, CommandInput]> = [
      ['charge with energyJ 360', defib({ action: 'charge', energyJ: 360 })],
      ['shock with energyJ', defib({ action: 'shock', energyJ: 200 })],
      ['shock with an outcome', defib({ action: 'shock', outcome: 'sinus' })],
      ['shock with atTick', defib({ action: 'shock' }, { atTick: 5000 })],
      ['charge with atTick 0', defib({ action: 'charge' }, { atTick: 0 })],
      ['shock with a stray field', defib({ action: 'shock', sync: true })],
      ['charge with a stray command field', defib({ action: 'charge' }, { stageGroup: 'g' })],
      ['selectEnergy', defib({ action: 'selectEnergy', energyJ: 360 })],
      ['preselect', defib({ action: 'preselect', outcome: 'sinus' })],
      ['disarm', defib({ action: 'disarm' })],
      ['syncOn', defib({ action: 'syncOn' })],
      ['syncOff', defib({ action: 'syncOff' })],
      ['pacer', cmd({ type: 'applyEvent', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 80 } })],
      ['drug', cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } })],
      ['cpr', cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true } })],
      ['time pause', cmd({ type: 'time', action: 'pause' })],
      ['time resume', cmd({ type: 'time', action: 'resume' })],
      ['time scale', cmd({ type: 'time', action: 'scale', value: 8 })],
      ['time jump', cmd({ type: 'time', action: 'jump', value: 60 })],
      ['time step', cmd({ type: 'time', action: 'step' })],
      ['scenario trigger', cmd({ type: 'scenario', action: 'trigger', target: 't1' })],
      ['scenario load', cmd({ type: 'scenario', action: 'load' })],
      ['device', cmd({ type: 'device', action: { device: 'alarm', action: 'ack' } })],
      ['setTarget', cmd({ type: 'setTarget', variable: 'hr', value: 80 })],
      ['pin', cmd({ type: 'pin', variable: 'hr', value: 30 })],
      ['note', cmd({ type: 'note', kind: 'note', text: 'shocked' })],
      ['setRhythm', cmd({ type: 'setRhythm', rhythm: 'sinus' })],
      ['applyEvent without an event', cmd({ type: 'applyEvent' })],
    ];
    for (const [what, c] of refused) expect(learnerDefibMay(c), what).toEqual(expect.any(String));
  });
});

// Plan learner-action-remote.md L3 (§4 D1, D2, D9; LQ1 ruled 9 November): the learner action remote joins as `learner` with
// the LEARNER PIN, and once granted may send exactly the shapes of §4 D2; the guard types their values, learnerMay their fields.
describe('the learner action remote role (plan learner-action-remote.md L3)', () => {
  const hello = (role: string, extra: Record<string, unknown> = {}) => ({ ...stamp({ kind: 'hello', role: 'viewer' }), role, ...extra });
  it('a `learner` hello must carry a PIN of 4 to 8 digits; it may name show and device, as D1 writes it', () => {
    expect(parseWireMessage(hello('learner', { pin: '4729' }))).toMatchObject({ kind: 'hello', role: 'learner', pin: '4729' });
    expect(parseWireMessage(hello('learner', { pin: '472913', show: 'learner', device: 'k3x9q2m7' }))).toMatchObject({ role: 'learner', show: 'learner', device: 'k3x9q2m7' });
    expect(parseWireMessage(hello('learner'))).toBeNull(); // no PIN: refused
    expect(parseWireMessage(hello('learner', { show: 'learner', device: 'k3x9q2m7' }))).toBeNull();
    for (const pin of ['472', '472912345', '47a9', 4729, null, '']) expect(parseWireMessage(hello('learner', { pin })), JSON.stringify(pin)).toBeNull();
    expect(parseWireMessage(hello('learner', { pin: '4729', device: 'K3X9' }))).toBeNull();
    expect(parseWireMessage(hello('learner', { pin: '4729', show: 'vent' }))).toBeNull();
  });
  it('a PIN is still refused on a viewer, a defibrillator window, a controller and a host', () => {
    for (const role of ['viewer', 'defib', 'controller', 'host']) expect(parseWireMessage(hello(role, { pin: '4729' })), role).toBeNull();
  });

  const cmd = (c: object) => ({ id: 'k1', issuedBy: 'learner-a', ...c }) as unknown as CommandInput;
  const stage = (prep: object = {}, extra: object = {}) =>
    cmd({ type: 'prep', action: 'stage', prep: { id: 'p0000001', components: [{ productId: 'propofol1pct20ml', amount: 20, unit: 'mL' }], ...prep }, ...extra });
  const SHAPES: Array<[string, CommandInput]> = [
    ['prep stage', stage()],
    ['prep stage with a diluent and a container', stage({ diluent: { id: 'sodiumChloride09', volumeMl: 30 }, container: 'syringe50ml' })],
    ['prep discard', cmd({ type: 'prep', action: 'discard', prepId: 'p0000001' })],
    ['prep deliver', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv' })],
    ['prep deliver all over 30 s in a tray', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 'all', route: 'iv', overS: 30, stageGroup: 'g1', batch: { id: 'g1', n: 3 } })],
    ['prep infuse', cmd({ type: 'prep', action: 'infuse', prepId: 'p0000001', rateMlH: 12 })],
    ['infusion set', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4 })],
    ['infusion set 0 (stop)', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 0 })],
    ['applyEvent lab abg', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } })],
    ['applyEvent lab vbg', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'vbg' } })],
  ];
  it('LEARNER_COMMANDS is exactly §4 D2; learnerMay passes each shape, and the guard parses each', () => {
    expect([...LEARNER_COMMANDS].sort()).toEqual(['applyEvent lab', 'infusion set', 'prep deliver', 'prep discard', 'prep infuse', 'prep stage']);
    expect([...LEARNER_LAB_PANELS].sort()).toEqual(['abg', 'vbg']);
    for (const [what, c] of SHAPES) {
      expect(learnerMay(c), what).toBeNull();
      expect(parseWireMessage({ ...stamp({ kind: 'command', body: c as never }) }), what).not.toBeNull();
    }
  });

  // the plan's list (L3, Tests first), plus forged values and every other shape a learner might try
  const REFUSED: Array<[string, CommandInput]> = [
    ['applyEvent drug (raw)', cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } })],
    ['applyEvent infusion (raw)', cmd({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 10, unit: 'mL/h' } })],
    ['applyEvent defib charge', cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })],
    ['applyEvent defib shock', cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } })],
    ['applyEvent tci', cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', target: 3 } })],
    ['applyEvent fluid', cmd({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 600 } })],
    ['time pause', cmd({ type: 'time', action: 'pause' })],
    ['time jump', cmd({ type: 'time', action: 'jump', value: 60 })],
    ['scenario goto', cmd({ type: 'scenario', action: 'goto', target: 's2' })],
    ['setRhythm', cmd({ type: 'setRhythm', rhythm: 'vf' })],
    ['device', cmd({ type: 'device', action: { device: 'alarm', action: 'ack' } })],
    ['note', cmd({ type: 'note', kind: 'note', text: 'gave it' })],
    ['pin', cmd({ type: 'pin', variable: 'hr', value: 30 })],
    ['setTarget', cmd({ type: 'setTarget', variable: 'hr', value: 80 })],
    ['prep deliver with atTick', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', atTick: 5000 })],
    ['prep stage with a concentration', stage({}, { concentration: { amount: 10, unit: 'mg', perMl: 1 } })],
    ['prep stage with a concentration inside the preparation', stage({ concentration: 10 })],
    ['prep stage with a concentration on a component', stage({ components: [{ productId: 'propofol1pct20ml', amount: 20, unit: 'mL', perMl: 10 }] })],
    ['prep stage with a finding', stage({ findings: [] })],
    ['prep stage with a fraction on the diluent', stage({ diluent: { id: 'sodiumChloride09', volumeMl: 30, remaining: 1 } })],
    ['prep stage with a forged by', stage({}, { by: 'someoneelse1' })],
    ['prep deliver with a forged by', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', by: 'someoneelse1' })],
    ['prep deliver with an actionId', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', actionId: 'a1' })],
    ['prep deliver with a dose', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', dose: 200 })],
    ['prep deliver without a route', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5 })],
    ['prep deliver with a stray batch field', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', batch: { id: 'g', n: 2, x: 1 } })],
    ['prep infuse with a concentration', cmd({ type: 'prep', action: 'infuse', prepId: 'p0000001', rateMlH: 12, concentration: 10 })],
    ['prep infuse with atTick', cmd({ type: 'prep', action: 'infuse', prepId: 'p0000001', rateMlH: 12, atTick: 0 })],
    ['prep discard with a stageGroup', cmd({ type: 'prep', action: 'discard', prepId: 'p0000001', stageGroup: 'g' })],
    ['prep notice (the instructor\'s, L9)', cmd({ type: 'prep', action: 'notice', prepId: 'p0000001' })],
    ['infusion set with a concentration', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4, concentration: { amount: 4, unit: 'mg', perMl: 50 } })],
    ['infusion set with a unit', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4, unit: 'mcg/kg/min' })],
    ['infusion start', cmd({ type: 'infusion', action: 'start', drugId: 'norepinephrine', rateMlH: 4 })],
    ['applyEvent lab with a turnaroundS', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg', turnaroundS: 30 } })],
    ['applyEvent lab of a panel the engine has not', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'chem' } })],
    ['applyEvent lab with atTick', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' }, atTick: 100 })],
    ['applyEvent without an event', cmd({ type: 'applyEvent' })],
  ];
  it('learnerMay refuses every other shape and any extra field on these', () => {
    for (const [what, c] of REFUSED) expect(learnerMay(c), what).toEqual(expect.any(String));
  });
  it('the defibrillator window\'s allow-list is unchanged: it refuses every learner shape', () => {
    for (const [what, c] of SHAPES) expect(learnerDefibMay(c), what).toEqual(expect.any(String));
  });

  it('the guard drops a prep or infusion command whose values are not their types, from anyone', () => {
    const body = (c: CommandInput) => ({ ...stamp({ kind: 'command', body: c as never }) });
    const BAD: Array<[string, CommandInput]> = [
      ['a preparation id not [a-z0-9]{8}', stage({ id: 'P1' })],
      ['no components', stage({ components: [] })],
      ['nine components', stage({ components: Array.from({ length: 9 }, () => ({ productId: 'x1', amount: 1, unit: 'mL' })) })],
      ['a negative amount', stage({ components: [{ productId: 'x1', amount: -1, unit: 'mL' }] })],
      ['an amount as a string', stage({ components: [{ productId: 'x1', amount: '20', unit: 'mL' }] })],
      ['an infinite amount', stage({ components: [{ productId: 'x1', amount: Number.POSITIVE_INFINITY, unit: 'mL' }] })],
      ['a unit that is not a unit', stage({ components: [{ productId: 'x1', amount: 1, unit: 'mL; drop' }] })],
      ['a product id with spaces', stage({ components: [{ productId: 'x 1', amount: 1, unit: 'mL' }] })],
      // L4: 0 mL is legal (a powder reconstituted with its label's volume and not diluted further, prepare.ts); below 0 is not
      ['a diluent of -1 mL', stage({ diluent: { id: 'sodiumChloride09', volumeMl: -1 } })],
      ['a container that is a number', stage({ container: 50 })],
      ['a delivery of -5 mL', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: -5, route: 'iv' })],
      ['a delivery by inhalation', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'inh' })],
      ['a delivery over -1 s', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', overS: -1 })],
      ['an infusion at 0 mL/h from a preparation', cmd({ type: 'prep', action: 'infuse', prepId: 'p0000001', rateMlH: 0 })],
      ['an infusion set at -1 mL/h', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: -1 })],
      ['an unknown prep action', cmd({ type: 'prep', action: 'mix', prepId: 'p0000001' })],
      ['a discard without its preparation', cmd({ type: 'prep', action: 'discard' })],
    ];
    for (const [what, c] of BAD) expect(parseWireMessage(body(c)), what).toBeNull();
  });
});

// Plan pump-rack-tci.md C1 (§4 D1, D2, §7): the infusion-pump rack joins as `pump` with the LEARNER PIN, as the learner
// action remote does, and once granted may send exactly D2's shapes on its own channels; the guard types their values,
// pumpMay their fields. Everything else (D2's complement) is refused, shape by shape.
describe('the pump role (plan pump-rack-tci.md C1)', () => {
  const hello = (role: string, extra: Record<string, unknown> = {}) => ({ ...stamp({ kind: 'hello', role: 'viewer' }), role, ...extra });
  it('a `pump` hello must carry a PIN of 4 to 8 digits; it may name its device key', () => {
    expect(parseWireMessage(hello('pump', { pin: '582913' }))).toMatchObject({ kind: 'hello', role: 'pump', pin: '582913' });
    expect(parseWireMessage(hello('pump', { pin: '582913', device: 'k3x9q2m7' }))).toMatchObject({ role: 'pump', device: 'k3x9q2m7' });
    expect(parseWireMessage(hello('pump'))).toBeNull(); // no PIN: refused
    expect(parseWireMessage(hello('pump', { device: 'k3x9q2m7' }))).toBeNull();
    for (const pin of ['472', '472912345', '47a9', 4729, null, '']) expect(parseWireMessage(hello('pump', { pin })), JSON.stringify(pin)).toBeNull();
    expect(parseWireMessage(hello('pump', { pin: '4729', device: 'K3X9' }))).toBeNull();
  });
  it('a pump hello names no instrument: `pump` is not in INSTRUMENTS until the app lists it (A1), and no other is the pump\'s', () => {
    expect([...INSTRUMENTS]).not.toContain('pump');
    for (const show of ['pump', 'learner', 'monitor', 'defib']) expect(parseWireMessage(hello('pump', { pin: '4729', show })), show).toBeNull();
  });

  const cmd = (c: object) => ({ id: 'k1', issuedBy: 'pump', ...c }) as unknown as CommandInput;
  const pump = (action: string, c: object = {}) => cmd({ type: 'pump', action, ch: 1, ...c });
  const conc = { amount: 10, unit: 'mg', perMl: 1 };
  const patient = { ageY: 45, weightKg: 70, heightCm: 170, sex: 'f' };
  /** D2's shapes, each in its forms (the engine's E1 actions, pump.ts, are what they carry). */
  const SHAPES: Array<[string, CommandInput]> = [
    ['pump load a preparation in a syringe', pump('load', { syringe: { prep: { device: 'remote0001', id: 'p0000001' } } })],
    ['pump load a stock syringe', pump('load', { syringe: { stock: 'propofol1pct50ml' } })],
    ['pump load a stock bag on a drip channel', pump('load', { ch: 2, bag: { stock: 'sodiumChloride09bag500' } })],
    ['pump load a prepared bag', pump('load', { ch: 8, bag: { prep: { device: 'remote0001', id: 'p0000002' } } })],
    ['pump program', pump('program', { drugId: 'propofol', concentration: conc })],
    ['pump program a drip channel with its set', pump('program', { ch: 2, drugId: 'oxytocin', concentration: { amount: 10, unit: 'units', perMl: 500 }, set: 20 })],
    ['pump rate in mL/h', pump('rate', { rate: 12.5, unit: 'mL/h' })],
    ['pump rate 0', pump('rate', { rate: 0, unit: 'mL/h' })],
    ['pump rate as a dose rate with the weight typed into the pump', pump('rate', { rate: 0.1, unit: 'mcg/kg/min', weightKg: 70 })],
    ['pump rate in drops/min with a volume limit', pump('rate', { ch: 2, rate: 40, unit: 'drops/min', limitMl: 500 })],
    ['pump rate with no volume limit', pump('rate', { ch: 2, rate: 100, unit: 'mL/h', limitMl: null })],
    ['pump tci', pump('tci', { setId: 'eleveld', mode: 'effect', target: 3, patient })],
    ['pump tci with what the set asks', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, pmaWeeks: 2400, opioids: true } })],
    ['pump tci target 0 (stop)', pump('tci', { setId: 'minto', mode: 'plasma', target: 0, patient })],
    ['pump bolus by volume', pump('bolus', { volumeMl: 2 })],
    ['pump bolus by dose', pump('bolus', { dose: { amount: 0.5, unit: 'mg/kg' }, weightKg: 70 })],
    ['pump start', pump('start')],
    ['pump stop', pump('stop')],
    ['pump purge', pump('purge', { volumeMl: 1 })],
    ['pump unload', pump('unload')],
  ];
  it('PUMP_COMMANDS is exactly D2; pumpMay passes each shape, and the guard parses each', () => {
    expect([...PUMP_COMMANDS].sort()).toEqual(['pump bolus', 'pump load', 'pump program', 'pump purge', 'pump rate', 'pump start', 'pump stop', 'pump tci', 'pump unload']);
    for (const [what, c] of SHAPES) {
      expect(pumpMay(c), what).toBeNull();
      expect(parseWireMessage({ ...stamp({ kind: 'command', body: c as never }) }), what).not.toBeNull();
    }
  });

  // D2's complement, as the plan's C1 lists it (one test each), then every other shape and forged field a tablet might try
  const COMPLEMENT: Array<[string, CommandInput]> = [
    ['a raw applyEvent pump', cmd({ type: 'applyEvent', event: { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'propofol', concentration: conc, volumeMl: 50 }, syringeMl: 50 } })],
    ['applyEvent drug', cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } })],
    ['prep stage', cmd({ type: 'prep', action: 'stage', prep: { id: 'p0000001', components: [{ productId: 'propofol1pct20ml', amount: 20, unit: 'mL' }] } })],
    ['time', cmd({ type: 'time', action: 'pause' })],
    ['scenario', cmd({ type: 'scenario', action: 'goto', target: 's2' })],
    ['atTick on a pump command', pump('start', { atTick: 5000 })],
    ['a pump load that carries a concentration field', pump('load', { syringe: { stock: 'propofol1pct50ml' }, concentration: conc })],
  ];
  for (const [what, c] of COMPLEMENT) it(`D2's complement: ${what} is refused`, () => expect(pumpMay(c)).toEqual(expect.any(String)));

  const REFUSED: Array<[string, CommandInput]> = [
    ['a concentration inside the syringe', pump('load', { syringe: { stock: 'propofol1pct50ml', concentration: conc } })],
    ['a concentration inside the preparation', pump('load', { syringe: { prep: { device: 'remote0001', id: 'p0000001', concentration: conc } } })],
    ['contents (the true syringe is the host\'s)', pump('load', { syringe: { stock: 'propofol1pct50ml' }, contents: { drugId: 'propofol', concentration: conc, volumeMl: 50 } })],
    ['a volume on the load', pump('load', { syringe: { stock: 'propofol1pct50ml' }, volumeMl: 50 })],
    ['a syringe size on the load (the profile\'s)', pump('load', { syringe: { stock: 'propofol1pct50ml' }, syringeMl: 50 })],
    ['a channel kind on the load (the room\'s)', pump('load', { syringe: { stock: 'propofol1pct50ml' }, channel: 'syringe' })],
    ['a load with both a syringe and a bag', pump('load', { syringe: { stock: 'a1' }, bag: { stock: 'b1' } })],
    ['a load with neither', pump('load')],
    ['a source with both a preparation and a stock item', pump('load', { syringe: { stock: 'a1', prep: { device: 'remote0001', id: 'p0000001' } } })],
    ['a bolus rate (the profile\'s)', pump('bolus', { volumeMl: 2, rateMlH: 1200 })],
    ['a purge rate (the profile\'s)', pump('purge', { volumeMl: 1, rateMlH: 450 })],
    ['a bolus by both volume and dose', pump('bolus', { volumeMl: 2, dose: { amount: 20, unit: 'mg' } })],
    ['a bolus by neither', pump('bolus')],
    ['a TCI with a forged rate ceiling', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient, maxRateMlH: 2000 })],
    ['a TCI with a model (the instructor\'s event)', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient, model: 'schnider' })],
    ['a TCI patient with a field no set reads', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, pche: 'hom' } })],
    ['a TCI without its patient', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3 })],
    ['a programme with a stray concentration field', pump('program', { drugId: 'propofol', concentration: { ...conc, volumeMl: 50 } })],
    ['a dose with a stray field', pump('bolus', { dose: { amount: 20, unit: 'mg', overS: 10 } })],
    ['a pump command without a channel', cmd({ type: 'pump', action: 'start' })],
    ['a pump command with a forged by', pump('start', { by: 'someoneelse1' })],
    ['a pump command with a forged replaced', pump('rate', { rate: 5, unit: 'mL/h', replaced: { rateMlH: 1 } })],
    ['a pump action D2 does not name', pump('occlude')],
    ['pump alarm (the instructor\'s, O1/AL1)', pump('alarm', { alarm: 'airInLine' })],
    ['applyEvent tci (channel-less, the instructor\'s)', cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'plasma', target: 3 } })],
    ['applyEvent infusion', cmd({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 10, unit: 'mL/h' } })],
    ['applyEvent lab', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } })],
    ['applyEvent defib charge', cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })],
    ['infusion set (the learner remote\'s)', cmd({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4 })],
    ['prep deliver', cmd({ type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv' })],
    ['time jump', cmd({ type: 'time', action: 'jump', value: 60 })],
    ['scenario load', cmd({ type: 'scenario', action: 'load', scenario: {} })],
    ['setRhythm', cmd({ type: 'setRhythm', rhythm: 'vf' })],
    ['device', cmd({ type: 'device', action: { device: 'alarm', action: 'ack' } })],
    ['note', cmd({ type: 'note', kind: 'note', text: 'set it' })],
    ['pin', cmd({ type: 'pin', variable: 'hr', value: 30 })],
  ];
  it('pumpMay refuses every other shape and any extra field on D2\'s', () => {
    for (const [what, c] of REFUSED) expect(pumpMay(c), what).toEqual(expect.any(String));
  });
  it("the learner remote's and the defibrillator window's allow-lists are unchanged: each refuses every pump shape", () => {
    for (const [what, c] of SHAPES) {
      expect(learnerMay(c), what).toEqual(expect.any(String));
      expect(learnerDefibMay(c), what).toEqual(expect.any(String));
    }
  });

  it('the guard drops a pump command whose values are not their types, from anyone', () => {
    const body = (c: CommandInput) => ({ ...stamp({ kind: 'command', body: c as never }) });
    const BAD: Array<[string, CommandInput]> = [
      ['channel 0', pump('start', { ch: 0 })],
      ['channel 9 (the rack holds 1 to 8, PQ1)', pump('start', { ch: 9 })],
      ['channel 1.5', pump('start', { ch: 1.5 })],
      ['a channel as a string', pump('start', { ch: '1' })],
      ['an unknown action', pump('occlude')],
      ['a preparation id not [a-z0-9]{8}', pump('load', { syringe: { prep: { device: 'remote0001', id: 'P1' } } })],
      ['a preparation device not a device key', pump('load', { syringe: { prep: { device: 'R1', id: 'p0000001' } } })],
      ['a stock id with spaces', pump('load', { bag: { stock: 'saline bag' } })],
      ['a source that is a string', pump('load', { syringe: 'propofol1pct50ml' })],
      ['a load with both a syringe and a bag', pump('load', { syringe: { stock: 'a1' }, bag: { stock: 'b1' } })],
      ['a load with neither', pump('load')],
      ['a drug id with spaces', pump('program', { drugId: 'pro pofol', concentration: conc })],
      ['a concentration of 0', pump('program', { drugId: 'propofol', concentration: { ...conc, amount: 0 } })],
      ['a concentration in mL', pump('program', { drugId: 'propofol', concentration: { ...conc, unit: 'mL' } })],
      ['a concentration per 0 mL', pump('program', { drugId: 'propofol', concentration: { ...conc, perMl: 0 } })],
      ['a set of 0 drops/mL', pump('program', { drugId: 'propofol', concentration: conc, set: 0 })],
      ['a set of 20.5 drops/mL', pump('program', { drugId: 'propofol', concentration: conc, set: 20.5 })],
      ['a rate of -1', pump('rate', { rate: -1, unit: 'mL/h' })],
      ['an infinite rate', pump('rate', { rate: Number.POSITIVE_INFINITY, unit: 'mL/h' })],
      ['a rate in a unit that is no rate', pump('rate', { rate: 5, unit: 'mg' })],
      ['a rate without a unit', pump('rate', { rate: 5 })],
      ['a volume limit of 0', pump('rate', { rate: 5, unit: 'mL/h', limitMl: 0 })],
      ['a weight of 0', pump('rate', { rate: 0.1, unit: 'mcg/kg/min', weightKg: 0 })],
      ['a TCI set id with spaces', pump('tci', { setId: 'eleveld 2018', mode: 'plasma', target: 3, patient })],
      ['a TCI mode not plasma or effect', pump('tci', { setId: 'eleveld', mode: 'site', target: 3, patient })],
      ['a TCI target of -1', pump('tci', { setId: 'eleveld', mode: 'plasma', target: -1, patient })],
      ['a TCI patient without a sex', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ageY: 45, weightKg: 70, heightCm: 170 } })],
      ['a TCI patient of sex x', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, sex: 'x' } })],
      ['a TCI patient of -1 years', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, ageY: -1 } })],
      ['a TCI patient of 0 kg', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, weightKg: 0 } })],
      ['opioids as a string', pump('tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient: { ...patient, opioids: 'yes' } })],
      ['a bolus of -2 mL', pump('bolus', { volumeMl: -2 })],
      ['a bolus by both', pump('bolus', { volumeMl: 2, dose: { amount: 20, unit: 'mg' } })],
      ['a bolus by neither', pump('bolus')],
      ['a bolus dose in a rate unit', pump('bolus', { dose: { amount: 20, unit: 'mg/h' } })],
      ['a purge of 0 mL', pump('purge', { volumeMl: 0 })],
      ['a purge without a volume', pump('purge')],
    ];
    for (const [what, c] of BAD) expect(parseWireMessage(body(c)), what).toBeNull();
  });
});
