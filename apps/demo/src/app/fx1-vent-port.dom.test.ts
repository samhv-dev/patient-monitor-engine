// @vitest-environment happy-dom
// FX-1: the Ventilator view links to its own cockpit iframe over a direct frame port, never over BroadcastChannel (on CI's
// Linux WebKit messages to the hidden iframe came seconds late or never: PR #58's runs 38203086536 and 38207874736 lost
// a speed change in 4 of 18 and 6 of 24 tries).
import { FRAME_PORT_KEY } from '@pme/ventilator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppSession } from './session.ts';
import { ventView } from './views/vent.ts';

function fakeSession() {
  const scaleFns = new Set<(k: number) => void>();
  const s = {
    code: 'ABC123',
    timeScale: 1,
    ventLink: null,
    onMount: () => () => {},
    onTimeScale: (fn: (k: number) => void) => (scaleFns.add(fn), () => void scaleFns.delete(fn)),
    linked: (m: unknown) => m,
    setTimeScale(k: number) {
      s.timeScale = k;
      for (const fn of scaleFns) fn(k);
    },
  };
  return s;
}

afterEach(() => vi.unstubAllGlobals());

describe('FX-1 Ventilator view link', () => {
  it('opens no BroadcastChannel; the cockpit is told to use its parent; a speed change reaches the iframe', async () => {
    const opened: string[] = [];
    vi.stubGlobal('BroadcastChannel', class { constructor(n: string) { opened.push(n); } postMessage() {} close() {} });
    const s = fakeSession();
    const v = ventView(s as unknown as AppSession);
    const frame = v.el.querySelector('iframe') as HTMLIFrameElement;
    const posted: unknown[] = [];
    const cw = { [FRAME_PORT_KEY]: { 'pme-vent/vabc123': (m: unknown) => void posted.push(m) } }; // the cockpit's receiver
    Object.defineProperty(frame, 'contentWindow', { get: () => cw });
    v.enter?.('');
    expect(opened).toEqual([]);
    expect(frame.getAttribute('src')).toContain('via=parent');
    s.setTimeScale(4);
    await Promise.resolve();
    expect(posted).toContainEqual({ v: 1, kind: 'time', action: 'scale', value: 4 });
  });
});
