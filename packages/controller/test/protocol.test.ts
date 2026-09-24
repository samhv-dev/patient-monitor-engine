import { describe, expect, it } from 'vitest';
import {
  createStamper,
  newSessionCode,
  normalizeSessionCode,
  SeqFilter,
  SESSION_ALPHABET,
  SESSION_CODE_RE,
  type WireMessage,
} from '../src/protocol.ts';

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
