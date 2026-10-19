// FX-14 / FX-15: the instructor's page pauses the session while its tab is hidden and resumes it on return, with a toast;
// a session the instructor paused stays paused; a follower page and the 'continue' policy do nothing.
import { describe, expect, it } from 'vitest';
import { HIDDEN_TAB_POLICY, hiddenFor, hiddenTabAction, watchHiddenTab, type HiddenTabPolicy } from './hidden-tab.ts';

/** A page whose visibility the test sets, and a session that takes the pause/resume commands it is sent. */
function page(o: { role?: 'host' | 'follower'; policy?: HiddenTabPolicy; paused?: boolean; fastForwarding?: boolean } = {}) {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState, defaultView: new EventTarget() });
  const s = { paused: o.paused ?? false, ff: o.fastForwarding ?? false, sent: [] as string[], toasts: [] as string[], t: 0 };
  watchHiddenTab(doc as unknown as Document, {
    role: o.role ?? 'host',
    ...(o.policy ? { policy: o.policy } : {}),
    paused: () => s.paused || s.ff, // as main.ts: a fast-forward refuses every command, the pause included
    send: (a) => (s.sent.push(a), (s.paused = a === 'pause')),
    notify: (text) => s.toasts.push(text),
    now: () => s.t,
  });
  const show = (v: DocumentVisibilityState, atMs: number) => ((s.t = atMs), (doc.visibilityState = v), doc.dispatchEvent(new Event('visibilitychange')));
  return { s, show, win: doc.defaultView };
}

describe('pause while the instructor tab is hidden (FX-14/15, E82)', () => {
  it('defaults to pause (E82 unanswered)', () => expect(HIDDEN_TAB_POLICY).toBe('pause'));

  it('a running session pauses on hide and resumes on return, with the hidden time in the toast', () => {
    const { s, show } = page();
    show('hidden', 1000);
    expect(s.sent).toEqual(['pause']);
    expect(s.paused).toBe(true);
    show('visible', 1000 + 7 * 60_000 + 5_000);
    expect(s.sent).toEqual(['pause', 'resume']);
    expect(s.paused).toBe(false);
    expect(s.toasts).toEqual(['Paused while this tab was hidden (7:05)']);
  });

  it('a session the instructor paused is not paused again, nor resumed on return', () => {
    const { s, show } = page({ paused: true });
    show('hidden', 0);
    show('visible', 60_000);
    expect(s.sent).toEqual([]);
    expect(s.paused).toBe(true);
    expect(s.toasts).toEqual([]);
  });

  it('no double pause: a second hide while it is paused by us sends nothing more, and one return resumes once', () => {
    const { s, show } = page();
    show('hidden', 0);
    show('hidden', 500);
    show('visible', 2000);
    show('visible', 2500);
    expect(s.sent).toEqual(['pause', 'resume']);
    expect(s.toasts).toHaveLength(1);
  });

  it('each hide is its own: hide, return, then the instructor pauses, hide, return: still paused', () => {
    const { s, show } = page();
    show('hidden', 0);
    show('visible', 1000);
    s.paused = true; // the instructor's Pause
    show('hidden', 2000);
    show('visible', 3000);
    expect(s.sent).toEqual(['pause', 'resume']);
    expect(s.paused).toBe(true);
  });

  it('a reload or a closed tab (pagehide, then the unload\'s own hide) does not pause; back from the bfcache it does again', () => {
    const { s, show, win } = page();
    win.dispatchEvent(new Event('pagehide'));
    show('hidden', 0);
    expect(s.sent).toEqual([]);
    win.dispatchEvent(new Event('pageshow'));
    show('visible', 100);
    show('hidden', 200);
    expect(s.sent).toEqual(['pause']);
  });

  it('hidden during a fast-forward: no pause sent (the host would refuse it), no resume and no toast on return', () => {
    const { s, show } = page({ fastForwarding: true });
    show('hidden', 0);
    s.ff = false; // the fast-forward ends while the tab is hidden
    show('visible', 60_000);
    expect(s.sent).toEqual([]);
    expect(s.toasts).toEqual([]);
  });

  it('a follower page and the "continue" policy do nothing', () => {
    for (const o of [{ role: 'follower' as const }, { policy: 'continue' as const }]) {
      const { s, show } = page(o);
      show('hidden', 0);
      show('visible', 60_000);
      expect(s.sent).toEqual([]);
      expect(s.toasts).toEqual([]);
    }
    expect(hiddenTabAction({ policy: 'pause', role: 'follower', hidden: true, paused: false, ours: false })).toBeNull();
  });

  it('formats the hidden span as m:ss', () => {
    expect(hiddenFor(0)).toBe('0:00');
    expect(hiddenFor(3_400)).toBe('0:03');
    expect(hiddenFor(65_000)).toBe('1:05');
  });
});
