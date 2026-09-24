import { describe, expect, it } from 'vitest';
import { RingBuffer } from '../../src/buffers/ring.ts';

describe('buffers/RingBuffer', () => {
  it('holds rate × seconds samples', () => {
    expect(new RingBuffer(500, 120).capacity).toBe(60_000);
    expect(new RingBuffer(62.5, 120).capacity).toBe(7_500);
  });

  it('reads back by absolute index, across the wrap-around', () => {
    const rb = new RingBuffer(10, 1); // capacity 10
    for (let i = 0; i < 25; i++) rb.write(i, i);
    expect(rb.latest).toBe(24);
    expect(rb.oldest).toBe(15);
    const out = new Float32Array(10);
    expect(rb.read(15, out)).toBe(10);
    expect([...out]).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(rb.at(14)).toBeNaN();
    expect(rb.at(20)).toBe(20);
  });

  it('clamps reads to the retained window and to latest', () => {
    const rb = new RingBuffer(10, 1);
    for (let i = 0; i < 12; i++) rb.write(i, i);
    const out = new Float32Array(5);
    expect(rb.read(0, out)).toBe(5); // clamped to oldest = 2
    expect(out[0]).toBe(2);
    expect(rb.read(10, out)).toBe(2); // only 10 and 11 exist
    expect(rb.read(50, out)).toBe(0);
  });

  it('overwrites look-ahead samples without moving latest backwards', () => {
    const rb = new RingBuffer(10, 1);
    for (let i = 0; i <= 8; i++) rb.write(i, 1);
    rb.write(6, 99);
    expect(rb.latest).toBe(8);
    expect(rb.at(6)).toBe(99);
  });

  it('keeps exact absolute indexing over 24 h at 500 Hz (43,200,000 samples)', () => {
    const rb = new RingBuffer(500, 120);
    const last = 86_400 * 500 - 1;
    for (let i = last - 70_000; i <= last; i++) rb.write(i, i % 1000);
    expect(rb.latest).toBe(43_199_999);
    expect(rb.oldest).toBe(43_199_999 - 60_000 + 1);
    expect(rb.at(43_199_999)).toBe(999);
    expect(rb.at(43_150_123)).toBe(123);
  });

  it('after clear() the retained window starts at the first index written, not capacity back from latest (review M4)', () => {
    const rb = new RingBuffer(10, 1);
    for (let i = 0; i < 25; i++) rb.write(i, i);
    rb.clear();
    rb.write(12, 1);
    rb.write(13, 2);
    expect(rb.latest).toBe(13);
    expect(rb.oldest).toBe(12);
    const out = new Float32Array(10);
    expect(rb.read(0, out)).toBe(2);
    expect([out[0], out[1]]).toEqual([1, 2]);
    expect(rb.at(11)).toBeNaN();
  });
});
