// FU-11 Task D1 (external review F14, browser audit BA03): the snapshot codec carries every value JSON cannot.
import { describe, expect, it } from 'vitest';
import { decodeState, encodeState } from '../../src/snapshot-codec.ts';

describe('FU-11 D1: snapshot codec', () => {
  it('NaN, ±Infinity, −0 and undefined survive JSON exactly, in objects and arrays', () => {
    const state = { a: Number.NaN, b: Infinity, c: -Infinity, d: -0, e: undefined, f: [1, Number.NaN, undefined, -0], g: { h: 'NaN', i: 2.5, j: null } };
    const back = decodeState(JSON.parse(JSON.stringify(encodeState(state)))) as typeof state;
    expect(Object.is(back.a, Number.NaN)).toBe(true);
    expect(back.b).toBe(Infinity);
    expect(back.c).toBe(-Infinity);
    expect(Object.is(back.d, -0)).toBe(true);
    expect('e' in back).toBe(true);
    expect(back.e).toBeUndefined();
    expect(back.f.length).toBe(4);
    expect(Object.is(back.f[1], Number.NaN)).toBe(true);
    expect(back.f[2]).toBeUndefined();
    expect(Object.is(back.f[3], -0)).toBe(true);
    expect(back.g).toEqual({ h: 'NaN', i: 2.5, j: null }); // a string 'NaN' stays a string
  });
  it('decoding leaves a raw structured-clone state as it is; Map, Set and typed arrays are refused when encoding', () => {
    const raw = { x: Number.NaN, y: [Infinity] };
    const d = decodeState(raw) as typeof raw;
    expect(Number.isNaN(d.x)).toBe(true);
    expect(d.y[0]).toBe(Infinity);
    expect(() => encodeState({ m: new Map() })).toThrow(/Map/);
    expect(() => encodeState({ t: new Float32Array(2) })).toThrow(/Float32Array/);
  });
});
