// FX-14 / FX-15: Safari suspends a hidden tab (≈ 4 min, the whole page and its engine worker), so the instructor's page
// sends nothing — the phones say "The instructor's monitor is not answering" — and on return the worker's first frame
// swallows the gap through the 250 ms frame clamp, so the hidden minutes are lost (scratch/plans-backup/
// fx14-fx15-diagnosis.md). Under the 'pause' policy the instructor's page pauses the session itself when its tab is
// hidden — the Pause button's own command, so the phones show "(paused)" — and resumes it on return with a toast. A
// session the instructor had paused stays paused. Only the instructor's page does this (main.ts mounts it there alone).

/** Owner question E82: pause or continue while the instructor's tab is hidden. Unanswered: pause (the diagnosis's
 *  recommendation). 'continue' is the behaviour before rc.3 (nothing happens on hide). */
export type HiddenTabPolicy = 'pause' | 'continue';
export const HIDDEN_TAB_POLICY: HiddenTabPolicy = 'pause';

/** What to do on a visibility change. `ours`: this page paused the session when its tab was hidden. `leaving`: the page
 *  is being unloaded (a reload, a closed tab: `pagehide` fires before the unload's own `visibilitychange`), which is not
 *  a hidden tab — a pause sent then would outlive the page on the phones. */
export function hiddenTabAction(s: { policy: HiddenTabPolicy; role: 'host' | 'follower'; hidden: boolean; paused: boolean; ours: boolean; leaving?: boolean }): 'pause' | 'resume' | null {
  if (s.policy !== 'pause' || s.role !== 'host' || s.leaving) return null;
  if (s.hidden) return s.paused ? null : 'pause'; // Paused already (by the instructor, or by us): leave it
  return s.ours ? 'resume' : null;
}

/** m:ss of a wall span. */
export const hiddenFor = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function watchHiddenTab(doc: Document, d: { role: 'host' | 'follower'; paused: () => boolean; send: (action: 'pause' | 'resume') => void; notify: (text: string) => void; policy?: HiddenTabPolicy; now?: () => number }): () => void {
  const now = d.now ?? (() => performance.now());
  let since: number | null = null; // When this page paused the session (null: it did not)
  let leaving = false;
  const hide = () => (leaving = true);
  const show = () => (leaving = false); // Back from the back-forward cache
  const on = () => {
    const hidden = doc.visibilityState === 'hidden';
    const a = hiddenTabAction({ policy: d.policy ?? HIDDEN_TAB_POLICY, role: d.role, hidden, paused: d.paused(), ours: since !== null, leaving });
    if (a === 'pause') {
      since = now();
      d.send('pause');
    } else if (a === 'resume' && since !== null) {
      const ms = now() - since;
      since = null;
      d.send('resume');
      d.notify(`Paused while this tab was hidden (${hiddenFor(ms)})`);
    }
  };
  doc.addEventListener('visibilitychange', on);
  doc.defaultView?.addEventListener('pagehide', hide);
  doc.defaultView?.addEventListener('pageshow', show);
  return () => {
    doc.removeEventListener('visibilitychange', on);
    doc.defaultView?.removeEventListener('pagehide', hide);
    doc.defaultView?.removeEventListener('pageshow', show);
  };
}
