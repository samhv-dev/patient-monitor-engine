// FU-11 Task A1 (external review F01, browser audit BA10/BA11): one bounded, iterative pass decides what the wire takes —
// the same budget for a JSON string and a structured-clone object; deep or huge input is refused, never a stack overflow.
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { findSampleLeak, parseWireMessage, WIRE_LIMITS, wireBudgetError } from '../src/guard.ts';
import { createStamper, type WireMessage } from '../src/protocol.ts';

const stamp = createStamper('ABC234', 'peer-1');
const hello = stamp({ kind: 'hello', role: 'controller' });
const nested = (depth: number) => {
  const root: Record<string, unknown> = {};
  let o = root;
  for (let i = 0; i < depth; i++) o = (o.x = {}) as Record<string, unknown>;
  return root;
};

describe('FU-11 A1: wire budgets', () => {
  it('12 000 nested objects in a 72 KB hello: refused as a string and as an object, without throwing', () => {
    const text = `{"v":1,"session":"ABC234","from":"p","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":${'{"x":'.repeat(12000)}0${'}'.repeat(12000)}}`;
    expect(text.length).toBeLessThan(WIRE_LIMITS.maxBytes);
    expect(() => parseWireMessage(text)).not.toThrow();
    expect(parseWireMessage(text)).toBeNull();
    expect(parseWireMessage({ ...hello, extra: nested(12000) })).toBeNull();
    expect(() => findSampleLeak({ ...hello, extra: nested(12000) } as unknown as WireMessage)).not.toThrow();
  });
  it('an object over the byte budget is refused like the same string (multibyte characters counted as bytes)', () => {
    const cmd = (extra: string) => stamp({ kind: 'command', body: { id: 'c', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80, extra } as never });
    expect(parseWireMessage(cmd('x'.repeat(WIRE_LIMITS.maxBytes + 1)))).toBeNull();
    expect(parseWireMessage(cmd('é'.repeat(Math.ceil(WIRE_LIMITS.maxBytes / 2) + 1)))).toBeNull(); // 2 bytes each in UTF-8
    expect(wireBudgetError(cmd('x'.repeat(1000)))).toBeNull();
  });
  it('real traffic passes: a real engine snapshot with its tagged values, events and commands', () => {
    const e = createEngine({ seed: 3, mode: 'modeled' });
    e.advanceTo(30);
    expect(parseWireMessage(stamp({ kind: 'snapshot', body: e.snapshot() }))).not.toBeNull();
    expect(parseWireMessage(JSON.stringify(stamp({ kind: 'snapshot', body: e.snapshot() })))).not.toBeNull();
    expect(parseWireMessage(stamp({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} } as never] }))).not.toBeNull();
  });
});
