// @vitest-environment happy-dom
// FX-1: the Ventilator view links to its own cockpit iframe over window.postMessage, never over BroadcastChannel (on CI's
// Linux WebKit BroadcastChannel delivered the app's messages to the iframe seconds late or never: PR #58's run
// 38203086536 lost a speed change in 4 of 18 tries and froze the cockpit after "Return here").
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
  it('opens no BroadcastChannel; the cockpit is told to use its parent; a speed change is posted to the iframe', () => {
    (window as unknown as { happyDOM: { settings: { disableIframePageLoading: boolean } } }).happyDOM.settings.disableIframePageLoading = true; // no cockpit page here
    const opened: string[] = [];
    vi.stubGlobal('BroadcastChannel', class { constructor(n: string) { opened.push(n); } postMessage() {} close() {} });
    const s = fakeSession();
    const v = ventView(s as unknown as AppSession);
    document.body.append(v.el);
    const frame = v.el.querySelector('iframe') as HTMLIFrameElement;
    const posted: unknown[] = [];
    const cw = { postMessage: (d: unknown) => posted.push(d) };
    Object.defineProperty(frame, 'contentWindow', { get: () => cw });
    v.enter?.('');
    expect(opened).toEqual([]);
    expect(frame.getAttribute('src')).toContain('via=parent');
    s.setTimeScale(4);
    expect(posted).toContainEqual({ ch: 'pme-vent/vabc123', m: { v: 1, kind: 'time', action: 'scale', value: 4 } });
  });
});
