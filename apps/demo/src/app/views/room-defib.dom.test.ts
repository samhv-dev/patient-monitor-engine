// @vitest-environment happy-dom
// Room plan R5b: Room setup's "Defibrillator in this room" (owner's Q6 ruling, 5 November). One model, the generic one,
// and the line that keeps the hook for the department's own machine. It sits in a card of its own on today's Room page
// (R7, the Room page proper, is not built yet).
import type { ManagedTransport, TransportStatus } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { roomView } from './room.ts';

const quiet = (): ManagedTransport => ({ kind: 'broadcastChannel', status: 'open', send: () => undefined, close: () => undefined, onMessage: () => () => undefined, onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => undefined) }) as unknown as ManagedTransport;

describe("R5b: Room setup's defibrillator choice", () => {
  it('shows the generic model with its values and "not named yet" for the department\'s machine; a choice is handed to the session', () => {
    let model: string | null = null;
    const chosen: Array<string | null> = [];
    const v = roomView({
      code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank',
      followers: () => 0, onFollowers: () => () => undefined,
      defib: { model: () => model, choose: (m) => void (chosen.push(m), (model = m)) },
    });
    document.body.replaceChildren(v.el);
    const card = v.el.querySelector('.room-defib') as HTMLElement;
    expect(card.querySelector('h2')?.textContent).toBe('Defibrillator in this room');
    const sel = card.querySelector('select') as HTMLSelectElement;
    expect([...sel.options].map((o) => [o.value, o.textContent])).toEqual([
      ['', "Not chosen: the monitor style's own values"],
      ['generic', 'Generic defibrillator: 120 J adult, 50 J paediatric'],
    ]);
    expect(sel.value).toBe('');
    expect(card.textContent).toContain("Your department's machine: not named yet");
    sel.value = 'generic';
    sel.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['generic']);
    sel.value = '';
    sel.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['generic', null]);
    expect(card.textContent).toContain('from the next patient start');
  });
  it('without the session\'s choice (a page that does not pass one) there is no card', () => {
    const v = roomView({ code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank', followers: () => 0, onFollowers: () => () => undefined });
    expect(v.el.querySelector('.room-defib')).toBeNull();
  });
});
