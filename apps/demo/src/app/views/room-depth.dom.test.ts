// @vitest-environment happy-dom
// EEG plan E12: Room setup's "Depth of anaesthesia in this room". The choices are the engine's EEG registry (built
// readers only: today the generic processed-EEG reader), with "Off" first; a choice is handed to the session, which
// switches the patient's EEG on with that reader (eeg-model-session.dom.test.ts).
import type { ManagedTransport, TransportStatus } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { roomView } from './room.ts';

const quiet = (): ManagedTransport => ({ kind: 'broadcastChannel', status: 'open', send: () => undefined, close: () => undefined, onMessage: () => () => undefined, onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => undefined) }) as unknown as ManagedTransport;
const base = { code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank', followers: () => 0, onFollowers: () => () => undefined };

describe("E12: Room setup's depth-of-anaesthesia device", () => {
  it('offers Off and the built readers; a choice and Off are handed to the session', () => {
    let model: string | null = null;
    const chosen: Array<string | null> = [];
    const v = roomView({ ...base, depth: { model: () => model, choose: (m) => void (chosen.push(m), (model = m)) } });
    document.body.replaceChildren(v.el);
    const card = v.el.querySelector('.room-depth') as HTMLElement;
    expect(card.querySelector('h2')?.textContent).toBe('Depth of anaesthesia in this room');
    const sel = card.querySelector('select') as HTMLSelectElement;
    expect([...sel.options].map((o) => [o.value, o.textContent])).toEqual([['', 'Off: no EEG device'], ['generic', 'Processed EEG (generic)']]);
    expect(sel.value).toBe('');
    sel.value = 'generic';
    sel.dispatchEvent(new Event('change'));
    sel.value = '';
    sel.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['generic', null]);
    expect(card.textContent).toContain("switches the patient's EEG on");
  });
  it('the kept choice is shown; without the session\'s choice there is no card', () => {
    const v = roomView({ ...base, depth: { model: () => 'generic', choose: () => undefined } });
    expect((v.el.querySelector('.room-depth select') as HTMLSelectElement).value).toBe('generic');
    expect(roomView(base).el.querySelector('.room-depth')).toBeNull();
  });
});
