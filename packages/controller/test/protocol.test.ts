import { describe, expect, it } from 'vitest';
import {
  commandShape,
  createStamper,
  INSTRUCTOR_COMMANDS,
  instructorMay,
  newSessionCode,
  normalizeSessionCode,
  SeqFilter,
  SESSION_ALPHABET,
  SESSION_CODE_RE,
  VIEWER_EVENTS,
  type CommandInput,
  type WireCommand,
  type WireMessage,
} from '../src/protocol.ts';
import { FATAL_CLOSE_CODES, RELAY_CLOSE, RELAY_RETRY_CLOSE } from '../src/transport/relay-frames.ts';

describe('session codes', () => {
  it('uses 31 unambiguous symbols (no 0/O/1/I/L)', () => {
    expect(SESSION_ALPHABET).toHaveLength(31);
    expect(SESSION_ALPHABET).not.toMatch(/[01ILO]/);
    expect(new Set(SESSION_ALPHABET).size).toBe(31);
    for (const ch of SESSION_ALPHABET) expect(SESSION_CODE_RE.test(ch.repeat(6))).toBe(true);
  });

  it('generates valid 6-character codes', () => {
    for (let i = 0; i < 200; i++) expect(newSessionCode()).toMatch(SESSION_CODE_RE);
    expect(newSessionCode((a) => a.fill(0))).toBe('AAAAAA');
    expect(newSessionCode((a) => a.fill(30))).toBe('999999');
  });

  it('normalises typed input and rejects ambiguous characters', () => {
    expect(normalizeSessionCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeSessionCode('ABC23')).toBeNull();
    expect(normalizeSessionCode('ABC10O')).toBeNull();
    expect(normalizeSessionCode('ILLEGA')).toBeNull();
  });
});

describe('stamper and sequence filter', () => {
  it('stamps v, session, from, an increasing seq and sentAt', () => {
    let t = 1000;
    const stamp = createStamper('ABC234', 'host-x', () => t++);
    const a = stamp({ kind: 'hello', role: 'host' });
    const b = stamp({ kind: 'ack', commandId: 'c1', accepted: true, tick: 3 });
    expect(a).toEqual({ v: 1, session: 'ABC234', from: 'host-x', seq: 1, sentAt: 1000, kind: 'hello', role: 'host' });
    expect(b.seq).toBe(2);
    expect(b.sentAt).toBe(1001);
  });

  it('drops duplicates and older messages per sender, counts gaps', () => {
    const f = new SeqFilter();
    const m = (from: string, seq: number) => ({ from, seq }) as Pick<WireMessage, 'from' | 'seq'>;
    expect(f.check(m('a', 1))).toBe('accept');
    expect(f.check(m('a', 2))).toBe('accept');
    expect(f.check(m('a', 2))).toBe('duplicate');
    expect(f.check(m('a', 1))).toBe('duplicate'); // out of order ⇒ older ⇒ dropped
    expect(f.check(m('b', 1))).toBe('accept'); // independent per sender
    expect(f.check(m('a', 5))).toBe('gap');
    expect(f.check(m('a', 4))).toBe('duplicate');
    expect([f.duplicates, f.gaps]).toEqual([3, 1]);
    f.forget('a');
    expect(f.check(m('a', 1))).toBe('accept');
  });
});

describe('what the instructor may send (plan instructor-peer-role.md §2; P2)', () => {
  // The command census of 2026-10-30 on 1b274d5d (P0, scratch/peer-role-gate/census.json "measured"): what today's
  // panel and Instructor v2 send. The app's census test checks the laptop's side against INSTRUCTOR_COMMANDS (P6).
  const CENSUS = [
    'applyEvent airway', 'applyEvent bleed', 'applyEvent condition', 'applyEvent cpr', 'applyEvent defib', 'applyEvent drug',
    'applyEvent fluid', 'applyEvent infusion', 'applyEvent lungCondition', 'applyEvent pacer', 'applyEvent vaporiser',
    'applyEvent ventilation', 'attachSensor', 'device', 'pin', 'release', 'scenario bookmark', 'scenario goto',
    'scenario pause', 'scenario restoreBookmark', 'scenario resume', 'scenario trigger', 'setMode', 'setRhythm', 'setTarget',
    'time jump', 'time pause', 'time resume', 'time scale',
  ];
  const cmd = (c: CommandInput): WireCommand => ({ id: 'ctl-x-1', issuedBy: 'remote', ...c }) as WireCommand;

  it('INSTRUCTOR_COMMANDS is the measured census, exactly', () => {
    expect([...INSTRUCTOR_COMMANDS].sort()).toEqual(CENSUS);
  });

  it('a shape is the type, plus the action when it is a word, plus the event kind for applyEvent (the census key)', () => {
    expect(commandShape(cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } }))).toBe('applyEvent condition');
    expect(commandShape(cmd({ type: 'scenario', action: 'bookmark', kind: 'good' }))).toBe('scenario bookmark');
    expect(commandShape(cmd({ type: 'time', action: 'scale', value: 2 }))).toBe('time scale');
    expect(commandShape(cmd({ type: 'setTarget', variable: 'hr', value: 80 }))).toBe('setTarget');
    expect(commandShape(cmd({ type: 'device', action: { device: 'alarm', action: 'ack' } } as CommandInput))).toBe('device');
  });

  it('instructorMay answers null for every census shape, a mark of kind good, bad, discuss or none, and a note', () => {
    expect(instructorMay(cmd({ type: 'scenario', action: 'trigger', target: 't1' }))).toBeNull();
    expect(instructorMay(cmd({ type: 'scenario', action: 'pause' }))).toBeNull(); // today's "Hold the timer" (census)
    expect(instructorMay(cmd({ type: 'scenario', action: 'resume' }))).toBeNull();
    for (const kind of ['good', 'bad', 'discuss', undefined] as const)
      expect(instructorMay(cmd({ type: 'scenario', action: 'bookmark', ...(kind ? { kind } : {}) })), String(kind)).toBeNull();
    expect(instructorMay(cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } }))).toBeNull();
    expect(instructorMay(cmd({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'blood', volumeMl: 500, overS: 600 } }))).toBeNull();
    expect(instructorMay(cmd({ type: 'time', action: 'jump', value: 300 }))).toBeNull();
    expect(instructorMay(cmd({ type: 'setTarget', variable: 'hr', value: 80 }))).toBeNull();
    expect(instructorMay(cmd({ type: 'note', kind: 'note', text: 'Dantrolene drawn up' }))).toBeNull();
    expect(instructorMay(cmd({ type: 'note', kind: 'marker', text: 'Objective met: called for help' }))).toBeNull();
  });

  it("instructorMay answers §2's refusal reasons", () => {
    expect(instructorMay(cmd({ type: 'scenario', action: 'load', doc: {} }))).toBe("Load the case on the instructor's computer.");
    expect(instructorMay(cmd({ type: 'scenario', action: 'bookmark', kind: 'stage', note: 'treating' }))).toBe("A stage mark is the scenario driver's own.");
    const none = 'No Instructor view sends this command.';
    expect(instructorMay(cmd({ type: 'setFactor', input: 'hrFactor', factor: 1.2 }))).toBe(none);
    expect(instructorMay(cmd({ type: 'setModifiers', modifiers: {} } as CommandInput))).toBe(none);
    expect(instructorMay(cmd({ type: 'externalDrive', source: 'ventilator', frame: {} } as unknown as CommandInput))).toBe(none);
    expect(instructorMay(cmd({ type: 'time', action: 'step', value: 1 }))).toBe(none);
    // A shape outside the census is refused the same way (no view sends it).
    expect(instructorMay(cmd({ type: 'applyEvent', event: { kind: 'preoxygenate', fio2: 1, durationS: 180 } }))).toBe(none);
    expect(instructorMay(cmd({ type: 'applyEvent', event: { kind: 'surgical', action: 'diathermy', on: true } }))).toBe(none);
  });

  it('instructorView is not in VIEWER_EVENTS: learners never get the instructor feed', () => {
    expect(VIEWER_EVENTS.has('instructorView')).toBe(false);
  });
});

describe('relay close codes for the instructor (plan §1; P2)', () => {
  it('denied 4013 and tooManyTries 4028 are new, distinct and fatal (no reconnect with the same wrong PIN)', () => {
    expect(RELAY_CLOSE.denied).toBe(4013);
    expect(RELAY_CLOSE.tooManyTries).toBe(4028);
    expect(FATAL_CLOSE_CODES.has(4013)).toBe(true);
    expect(FATAL_CLOSE_CODES.has(4028)).toBe(true);
    const all = [...Object.values(RELAY_CLOSE), ...Object.values(RELAY_RETRY_CLOSE)];
    expect(new Set(all).size).toBe(all.length);
    expect(FATAL_CLOSE_CODES.has(RELAY_RETRY_CLOSE.idTaken)).toBe(false);
  });
});
