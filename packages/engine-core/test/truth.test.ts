// Stage 7x (R52): pruneTruth keeps physiology leaves and drops machinery, buffers and anything not structured-clone safe.
import { describe, expect, it } from 'vitest';
import { pruneTruth, TRUTH_LIMITS } from '../src/truth.ts';

describe('pruneTruth', () => {
  it('keeps numbers, booleans, short strings and null; drops functions and typed arrays', () => {
    const st = { hemo: { co: 5.1, open: true, site: 'radial', man: { rSys: null }, fn: () => 1, buf: new Float32Array(4) } };
    const r = pruneTruth(st);
    expect(r.tree).toEqual({ hemo: { co: 5.1, open: true, site: 'radial', man: { rSys: null } } });
    expect(r.dropped).toBe(2);
    expect(r.leaves).toBe(4);
    expect(r.truncated).toBe(false);
  });
  it('turns NaN and ±Infinity into strings so the tree stays JSON-exact', () => {
    const r = pruneTruth({ a: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: [1, Number.NEGATIVE_INFINITY] } });
    expect(r.tree).toEqual({ a: { x: 'NaN', y: 'Infinity', z: [1, '-Infinity'] } });
  });
  it('skips ECG machinery at the top and out/rng at any depth', () => {
    const st = { n: 5, qrs: { th: 1 }, hrm: {}, laneFilter: [[0]], rng: { a: 1 }, resp: { out: [{ type: 'x' }], driver: { rng: [1, 2, 3, 4], source: 'spontaneous' } } };
    expect(pruneTruth(st).tree).toEqual({ resp: { driver: { source: 'spontaneous' } } });
  });
  it('keeps short numeric arrays, drops long ones, keys object arrays by id/drugId/agent/index', () => {
    const st = {
      resp: { aer: [0.9, 0.8], hist: Array.from({ length: TRUTH_LIMITS.maxNumArray + 1 }, (_, i) => i) },
      pk: { rows: [{ drugId: 'propofol', ce: 2.1 }, { agent: 'sevoflurane', fet: 1.8 }, { x: 1 }] },
      hemo: { beats: Array.from({ length: TRUTH_LIMITS.maxObjArray + 1 }, () => ({ t: 1 })) },
    };
    const r = pruneTruth(st);
    expect(r.tree).toEqual({ resp: { aer: [0.9, 0.8] }, pk: { rows: { propofol: { drugId: 'propofol', ce: 2.1 }, sevoflurane: { agent: 'sevoflurane', fet: 1.8 }, 2: { x: 1 } } }, hemo: {} });
    expect(r.dropped).toBe(2);
  });
  it('skips the alarm profile and 7a\'s reference copies by path, nothing else of the same name', () => {
    const st = { hemo: { circ: { p: { rSys: 1 }, prof: { eesLv: 2 }, base: { eesLv: 2 }, ref: { sv: 70 }, cor: { ref: { sv: 70 } } } }, resp: { prof: 1 } };
    const r = pruneTruth(st, { alarms: { profile: { limits: { hr: { low: 50 } } }, silenced: false } });
    expect(r.tree).toEqual({ dev: { alarms: { silenced: false } }, hemo: { circ: { p: { rSys: 1 }, cor: { ref: { sv: 70 } } } }, resp: { prof: 1 } });
    expect(r.dropped).toBe(0);
  });
  it('walks the device layer first, so the leaf cap never cuts the devices', () => {
    const big = Object.fromEntries(Array.from({ length: TRUTH_LIMITS.maxLeaves + 10 }, (_, i) => [`k${i}`, i]));
    const r = pruneTruth({ big }, { pacer: { mode: 'off' } });
    expect(r.leaves).toBe(TRUTH_LIMITS.maxLeaves);
    expect(r.truncated).toBe(true);
    expect(Object.keys(r.tree)[0]).toBe('dev');
    expect(r.tree.dev).toEqual({ pacer: { mode: 'off' } });
    expect(pruneTruth({}, { pacer: { mode: 'off' } }).tree).toEqual({ dev: { pacer: { mode: 'off' } } });
  });
  it('never writes to its input', () => {
    const st = { hemo: { circ: { p: { rSys: 1 }, s: [1, 2] } }, out: [1] };
    const before = structuredClone(st);
    pruneTruth(st);
    expect(st).toEqual(before);
  });
});
