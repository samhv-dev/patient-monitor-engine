// The Case briefing on the wire: the host sends the card's briefing with its start time (a phone that joins or reloads
// while it runs shows the remainder, so not a bare "show"), as an event of the same family as the Ventilator view's
// `cockpit` notice; the relay passes it to the phones (a viewer gets only VIEWER_EVENTS), and the instructor's
// "End briefing" sends the same briefing `ended`.
import { describe, expect, it } from 'vitest';
import { assertWireSafe, parseWireMessage } from '../src/guard.ts';
import { createStamper, VIEWER_EVENTS, type WireEvent, type WireMessage } from '../src/protocol.ts';

const briefing: WireEvent = {
  type: 'briefing', startedAt: 1_761_800_000_000, durationS: 60, lang: 'fa', estimatedMinutes: 25,
  text: 'شما رزیدنت بیهوشی در اتاق عمل هستید.\n\nبه مانیتور نگاه کنید.',
};

describe('the briefing event', () => {
  it('round-trips through the wire: stamped, serialised, parsed back unchanged, and wire-safe', () => {
    const stamp = createStamper('KKQB2N', 'host-aaaaaa', () => 1_761_800_012_000);
    for (const e of [briefing, { ...briefing, replay: true as const }, { ...briefing, ended: true as const }]) {
      const m = stamp({ kind: 'event', body: [e] });
      expect(() => assertWireSafe(m)).not.toThrow();
      const back = parseWireMessage(JSON.stringify(m)) as WireMessage;
      expect(back).toEqual(m);
      expect(back.kind === 'event' && back.body[0]).toEqual(e);
    }
  });

  it('is one of the events the relay passes to a phone', () => {
    expect(VIEWER_EVENTS.has('briefing')).toBe(true);
  });
});
