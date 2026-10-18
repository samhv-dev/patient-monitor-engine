// FU-11 Gate A (found by the full e2e run): C1 made destroy() settle every waiting worker request — but a COMMAND that
// rejects there is an unhandled rejection in every caller that fires and forgets a dispatch (the developer pages that
// remount, the ventilator link port, mount's own ECG-filter command): fu4, fu6, stage7d and vent-link failed with
// "the monitor was destroyed" page errors. A command waiting at (or sent after) destroy is REFUSED, a DispatchResult like
// any refusal; snapshots, restores and captures still reject (audit-worker's destroy case).
import { test, expect } from './audit-fixture';

test('a command waiting at destroy, or sent after it, is refused; a snapshot is rejected; no page error', async ({ page, audit }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(audit.url);
  const path = await page.evaluate(async (root) => {
    const { mountMonitor } = await import('/@fs' + root + '/packages/renderer/src/mount.ts');
    (window as any).m = mountMonitor(document.getElementById('monitor'), { worker: 'auto' });
    return await (window as any).m.renderPath;
  }, audit.root);
  test.skip(!path.startsWith('worker'), 'actual worker capability required');
  const out = await page.evaluate(async () => {
    const m = (window as any).m;
    const settle = (p: Promise<unknown>) => p.then((v) => ({ resolved: v }), (e: Error) => ({ rejected: e.message }));
    const waiting = m.dispatch({ id: 'w', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 100 });
    void m.dispatch({ id: 'f', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 101 }); // fire and forget
    const snap = settle(m.snapshot());
    m.destroy();
    await new Promise((r) => setTimeout(r, 100));
    const after = m.dispatch({ id: 'a', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 102 });
    return { waiting: await settle(waiting), after: await settle(after), snap: await snap };
  });
  expect(out.waiting).toEqual({ resolved: { accepted: false, tick: 0, reason: 'the monitor was destroyed' } });
  expect(out.after).toEqual({ resolved: { accepted: false, tick: 0, reason: 'the monitor was destroyed' } });
  expect(out.snap).toEqual({ rejected: 'the monitor was destroyed' });
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
