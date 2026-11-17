// @vitest-environment happy-dom
// Plan pump-rack-tci.md A1 (§5; PQ1 = C "1–8, default 4"; PQ2 = B, two channel kinds): Room setup's "Pumps in this room",
// the number of channels on the pump tablet and each channel's kind. A choice is handed to the session (main.ts keeps it
// in the site profile and sends it to the tablet on the `style` event).
import type { ManagedTransport, PumpKind, TransportStatus } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { roomView } from './room.ts';

const quiet = (): ManagedTransport => ({ kind: 'broadcastChannel', status: 'open', send: () => undefined, close: () => undefined, onMessage: () => () => undefined, onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => undefined) }) as unknown as ManagedTransport;

/** `refuse`: the host's words for a rack it refuses (null: it takes it). */
function mount(start: PumpKind[], refuse: (k: PumpKind[]) => string | null = () => null) {
  let kinds = start;
  const chosen: PumpKind[][] = [];
  const v = roomView({
    code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank',
    followers: () => 0, onFollowers: () => () => undefined,
    pumps: { kinds: () => kinds, choose: (k) => refuse(k) ?? (chosen.push(k), (kinds = k), null) },
  });
  document.body.replaceChildren(v.el);
  const card = v.el.querySelector('.room-pumps') as HTMLElement;
  const count = () => card.querySelector('select[data-pumps="count"]') as HTMLSelectElement;
  const kindSel = () => [...card.querySelectorAll<HTMLSelectElement>('select[data-pumps="kind"]')];
  const change = (s: HTMLSelectElement, value: string) => ((s.value = value), s.dispatchEvent(new Event('change')));
  return { card, count, kindSel, change, chosen };
}

describe("A1: Room setup's pump rack", () => {
  it('offers 1 to 8 channels and shows the room\'s setting: the count and each channel\'s kind', () => {
    const { card, count, kindSel } = mount(['syringe', 'syringe', 'drip', 'syringe']);
    expect(card.querySelector('h2')?.textContent).toBe('Pumps in this room');
    expect([...count().options].map((o) => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(count().value).toBe('4');
    expect(kindSel().map((s) => s.value)).toEqual(['syringe', 'syringe', 'drip', 'syringe']);
    expect([...(kindSel()[0] as HTMLSelectElement).options].map((o) => [o.value, o.textContent])).toEqual([['syringe', 'Syringe'], ['drip', 'Drip']]);
    expect(kindSel().map((s) => card.querySelector(`label[for="${s.id}"]`)?.textContent)).toEqual(['Channel 1', 'Channel 2', 'Channel 3', 'Channel 4']);
    expect(card.querySelector(`label[for="${count().id}"]`)?.textContent).toBe('Channels on the pump tablet');
  });

  it('a larger count adds syringe channels, a smaller one keeps the first channels; a kind changes one channel', () => {
    const { count, kindSel, change, chosen } = mount(['syringe', 'drip', 'syringe', 'syringe']);
    change(count(), '6');
    expect(chosen.at(-1)).toEqual(['syringe', 'drip', 'syringe', 'syringe', 'syringe', 'syringe']);
    expect(kindSel()).toHaveLength(6);
    change(kindSel()[4] as HTMLSelectElement, 'drip');
    expect(chosen.at(-1)).toEqual(['syringe', 'drip', 'syringe', 'syringe', 'drip', 'syringe']);
    change(count(), '2');
    expect(chosen.at(-1)).toEqual(['syringe', 'drip']);
    expect(kindSel()).toHaveLength(2);
  });

  it("a rack the host refuses keeps the card as it was and says the host's words in an alert; the next change taken clears them", () => {
    const running = 'Channel 3 is running: stop it first.';
    const { card, count, kindSel, change, chosen } = mount(['syringe', 'syringe', 'syringe', 'syringe'], (k) => (k.length < 3 || k[2] !== 'syringe' ? running : null));
    const alert = card.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toBe('');
    change(count(), '2');
    expect(alert.textContent).toBe(running);
    expect(count().value).toBe('4');
    expect(kindSel()).toHaveLength(4);
    change(kindSel()[2] as HTMLSelectElement, 'drip');
    expect(alert.textContent).toBe(running);
    expect((kindSel()[2] as HTMLSelectElement).value).toBe('syringe');
    expect(chosen).toEqual([]);
    change(count(), '3');
    expect(chosen).toEqual([['syringe', 'syringe', 'syringe']]);
    expect(alert.textContent).toBe('');
    expect(kindSel()).toHaveLength(3);
  });

  it('says when the setting reaches the tablet, in English', () => {
    const { card } = mount(['syringe']);
    expect(card.textContent).toContain('A change reaches a signed-in pump tablet at once.');
    expect(card.textContent).not.toMatch(/[؀-ۿ]/);
  });

  it("without the session's setting there is no card", () => {
    const v = roomView({ code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank', followers: () => 0, onFollowers: () => () => undefined });
    expect(v.el.querySelector('.room-pumps')).toBeNull();
  });
});
