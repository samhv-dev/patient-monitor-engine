import { LAB_PANELS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { assertWireSafe, findSampleLeak, parseWireMessage, WIRE_LIMITS, WireSafetyError } from '../src/guard.ts';
import { createStamper, INSTRUMENTS, LEARNER_COMMANDS, LEARNER_DEFIB_COMMANDS, LEARNER_LAB_PANELS, learnerDefibMay, learnerMay, NOTE_EVENTS, type CommandInput, type WireMessage } from '../src/protocol.ts';
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
    ['applyEvent lab chem', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'chem' } })],
    ['applyEvent lab coag', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'coag' } })],
  ];
  it('LEARNER_COMMANDS is exactly §4 D2; learnerMay passes each shape, and the guard parses each', () => {
    expect([...LEARNER_COMMANDS].sort()).toEqual(['applyEvent lab', 'infusion set', 'prep deliver', 'prep discard', 'prep infuse', 'prep stage']);
    expect([...LEARNER_LAB_PANELS].sort()).toEqual(['abg', 'chem', 'coag', 'vbg']);
    expect([...LEARNER_LAB_PANELS].sort()).toEqual([...LAB_PANELS].sort()); // the engine's panels (analysers.ts)
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
    ['applyEvent lab of a panel the engine has not', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'csf' } })],
    ['applyEvent lab with an analyser', cmd({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg', analyser: 'abl825' } })],
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
