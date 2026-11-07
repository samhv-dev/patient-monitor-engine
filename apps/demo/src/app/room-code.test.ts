// Room plan R1 (docs/plans/room-and-instruments.md §7; Q3 ruled 5 November = A): the room code lives until the
// instructor asks for a new one. Which code an instructor's page starts under, and when that code becomes the room's.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepRoomCode, keepsRoomCode, ROOM_CODE_KEY, startCode, storedRoomCode } from './room-code.ts';

/** This browser's localStorage, as a Map (Node has none here). */
const memory = () => {
  const m = new Map<string, string>();
  return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
};
afterEach(() => vi.unstubAllGlobals());

describe('startCode: ?session= → the stored room code → (none: a new one)', () => {
  it('the page\'s own ?session= wins over the stored code (a reload, a tab that started a new session of its own)', () => {
    expect(startCode({ param: 'QFBAWA', stored: 'KKQB2N' })).toBe('QFBAWA');
  });
  it('without ?session=, the stored room code (the bare address, after a restart or the next day)', () => {
    expect(startCode({ param: null, stored: 'KKQB2N' })).toBe('KKQB2N');
  });
  it('nothing stored: null (the session draws a new code, and the page stores it)', () => {
    expect(startCode({ param: null, stored: null })).toBeNull();
  });
  it('an invalid stored value is ignored (not a code: a new one, never a crash)', () => {
    for (const bad of ['', 'kkq', 'IIIIII', 'KKQB2N7', '{"x":1}']) expect(startCode({ param: null, stored: bad })).toBeNull();
    expect(startCode({ param: null, stored: ' kkqb2n ' })).toBe('KKQB2N'); // the code's own normal form (normalizeSessionCode)
  });
});

// Room plan R1b: on a new origin (the kit moved to the next port: an empty store) the relay's last room comes next
describe('startCode with the relay\'s lastRoom (R1b): ?session= → stored → lastRoom → (none)', () => {
  it('an empty store takes the relay\'s lastRoom; the page then stores it (it started without ?session=)', () => {
    expect(startCode({ param: null, stored: null, lastRoom: 'QFBAWA' })).toBe('QFBAWA');
    expect(keepsRoomCode({ param: null, answer: null })).toBe(true);
  });
  it('a ?session= or a stored code still wins over lastRoom', () => {
    expect(startCode({ param: 'KXRMTP', stored: 'KKQB2N', lastRoom: 'QFBAWA' })).toBe('KXRMTP');
    expect(startCode({ param: null, stored: 'KKQB2N', lastRoom: 'QFBAWA' })).toBe('KKQB2N');
  });
  it('a lastRoom that is not a code is ignored (an older relay sends none: undefined)', () => {
    expect(startCode({ param: null, stored: null, lastRoom: 'IIIIII' })).toBeNull();
    expect(startCode({ param: null, stored: null, lastRoom: undefined })).toBeNull();
  });
});

describe('keepsRoomCode: only a page started without ?session= stores its code, and never "Start a new session" (§4 D3)', () => {
  it('the first tab, no ?session=: stores it (asked nothing, or chose to open the running session here)', () => {
    expect(keepsRoomCode({ param: null, answer: null })).toBe(true);
    expect(keepsRoomCode({ param: null, answer: 'join' })).toBe(true);
  });
  it('"Start a new session" in a second tab runs a code for that tab alone', () => {
    expect(keepsRoomCode({ param: null, answer: 'new' })).toBe(false);
  });
  it('a page with its own ?session= (a reload) keeps the stored code as it is', () => {
    expect(keepsRoomCode({ param: 'QFBAWA', answer: null })).toBe(false);
    expect(keepsRoomCode({ param: 'QFBAWA', answer: 'join' })).toBe(false);
  });
});

describe('the stored room code (store.ts: pme.roomCode)', () => {
  it('kept under pme.roomCode and read back; an invalid value reads as none', () => {
    const { m, s } = memory();
    vi.stubGlobal('localStorage', s);
    expect(storedRoomCode()).toBeNull();
    keepRoomCode('KKQB2N');
    expect(m.get(`pme.${ROOM_CODE_KEY}`)).toBe('KKQB2N');
    expect(ROOM_CODE_KEY).toBe('roomCode');
    expect(storedRoomCode()).toBe('KKQB2N');
    m.set('pme.roomCode', 'not a code');
    expect(storedRoomCode()).toBeNull();
  });
  it('a store that throws (a private window, blocked site data): no stored code, a new one each time as today, and no error', () => {
    const boom = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    expect(() => keepRoomCode('KKQB2N')).not.toThrow();
    expect(storedRoomCode()).toBeNull();
    expect(startCode({ param: null, stored: storedRoomCode() })).toBeNull();
  });
});
